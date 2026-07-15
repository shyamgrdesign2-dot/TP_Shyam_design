import moment from 'moment';
import { env } from '../EnvironmentConfig';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from './constants';

// ----- Lab result GET response normalization (multi-doctor buckets) -----

/**
 * True when current URL is a receptionist session.
 */
export function isLabResultsReceptionistSession() {
  try {
    return new URLSearchParams(window.location.search).has('receptionist');
  } catch {
    return false;
  }
}

/**
 * Attending doctor um_id from receptionist URL (`um_id=524` or `um_id=524,525`).
 * Returns the first id when multiple are present.
 */
export function getAttendingDoctorUmIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('receptionist')) return undefined;
    const raw = params.get('um_id');
    if (!raw) return undefined;
    const first = String(raw).split(',').map((s) => s.trim()).filter(Boolean)[0];
    if (first == null || first === '') return undefined;
    const asNum = Number(first);
    return Number.isNaN(asNum) ? first : asNum;
  } catch {
    return undefined;
  }
}

/**
 * Normalizes an attending doctor um_id (number when numeric).
 */
export function normalizeAttendingDoctorUmId(umId) {
  if (umId == null || umId === '') return undefined;
  const asNum = Number(umId);
  return Number.isNaN(asNum) ? umId : asNum;
}

/**
 * Last-visit doctor's um_id from a LIMS patient list row (`lastVisitDoctor.um_id`).
 * Receptionists enter lab results on behalf of this doctor.
 */
export function getPatientLastVisitDoctorUmId(patient) {
  return normalizeAttendingDoctorUmId(patient?.lastVisitDoctor?.um_id);
}

/**
 * LIMS View drawer: only result rows on the patient's lastVisitDate.
 * Does not fall back to other / latest dates. Empty when none match.
 */
export function filterLabResultsForLimsLastVisit(patient, results) {
  const flat = normalizeLabResultsResponse({ data: results || [] });
  if (flat.length === 0) return [];

  const visitDate = patient?.lastVisitDate
    ? String(patient.lastVisitDate).slice(0, 10)
    : '';
  if (!visitDate) return [];

  return flat.filter(
    (entry) => entry?.date && String(entry.date).slice(0, 10) === visitDate,
  );
}

/**
 * Owner doctor id used when editing/saving:
 * - Receptionist → explicit attendingDoctorUmId (e.g. lastVisitDoctor) when present,
 *   else URL um_id
 * - Doctor → JWT user_id
 */
export function getLabResultsOwnerDoctorId(tokenUserId, attendingDoctorUmId) {
  if (isLabResultsReceptionistSession()) {
    const fromProp = normalizeAttendingDoctorUmId(attendingDoctorUmId);
    if (fromProp != null) return fromProp;
    return getAttendingDoctorUmIdFromUrl();
  }
  return tokenUserId;
}

/**
 * Normalizes GET /api/v1/lab-parameters/results/:patientId responses.
 *
 * New BE: `data` is always an array of doctor buckets:
 *   [{ doctorId, receptionistId, results: [{ date, inputs, documentsUrls, ... }] }, ...]
 * Empty: `data: []`
 * Legacy bridge: `data` may still be a single document object with `results`.
 *
 * Accepts an axios response, API body, or the `data` field directly.
 * Returns a flat [{ date, inputs, doctorId, receptionistId, documentsUrls, ... }, ...]
 */
export function normalizeLabResultsResponse(apiResponseOrBody) {
  const flattenBuckets = (buckets) =>
    (Array.isArray(buckets) ? buckets : []).flatMap((bucket) => {
      if (!bucket || typeof bucket !== 'object') return [];
      const entries = Array.isArray(bucket.results) ? bucket.results : [];
      return entries.map((entry) => ({
        ...entry,
        doctorId: entry?.doctorId ?? bucket.doctorId ?? null,
        receptionistId: entry?.receptionistId ?? bucket.receptionistId ?? null,
      }));
    });

  const isDoctorBucket = (item) =>
    item &&
    typeof item === 'object' &&
    Array.isArray(item.results) &&
    !Array.isArray(item.inputs);

  const isFlatResultRow = (item) =>
    item &&
    typeof item === 'object' &&
    (item.date != null || Array.isArray(item.inputs)) &&
    !Array.isArray(item.results);

  /** Extract the `data` payload from axios / API envelopes. */
  const unwrapData = (value) => {
    if (value == null) return value;
    // Axios response → body
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, 'data') &&
      (value.status != null || value.headers != null || value.config != null)
    ) {
      return unwrapData(value.data);
    }
    // API envelope `{ status, data }` or `{ data }`
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, 'data') &&
      (Object.prototype.hasOwnProperty.call(value, 'status') ||
        Array.isArray(value.data) ||
        (value.data && typeof value.data === 'object'))
    ) {
      return value.data;
    }
    return value;
  };

  const payload = unwrapData(apiResponseOrBody);

  // New / empty: data is always an array of buckets
  if (Array.isArray(payload)) {
    if (payload.length === 0) return [];
    if (payload.some(isDoctorBucket)) return flattenBuckets(payload);
    // Already flattened rows (rare / intermediate)
    if (payload.every(isFlatResultRow)) return payload.map((entry) => ({ ...entry }));
    return [];
  }

  // Legacy bridge: single document object → treat as one bucket so doctorId is preserved
  if (payload && typeof payload === 'object' && isDoctorBucket(payload)) {
    return flattenBuckets([payload]);
  }

  return [];
}

/**
 * Keeps only result entries owned by `ownerDoctorId`.
 * Untagged entries (no doctorId) are kept so legacy/new rows remain editable.
 * When ownerDoctorId is null/undefined, only untagged entries are kept.
 */
export function filterLabResultsByDoctor(results, ownerDoctorId) {
  if (!Array.isArray(results)) return [];
  if (ownerDoctorId == null || ownerDoctorId === '') {
    return results.filter((entry) => entry?.doctorId == null || entry?.doctorId === '');
  }
  return results.filter(
    (entry) =>
      entry?.doctorId == null ||
      entry?.doctorId === '' ||
      String(entry.doctorId) === String(ownerDoctorId),
  );
}

/**
 * Re-attaches per-row PDF / external metadata from previously loaded GET rows
 * so an edit/save does not drop documentsUrls / isExternalPatient / etc.
 */
export function mergeLabResultRowMeta(assembledResults, sourceResults) {
  if (!Array.isArray(assembledResults)) return [];
  const byDate = new Map();
  (sourceResults || []).forEach((row) => {
    if (!row?.date) return;
    byDate.set(String(row.date).slice(0, 10), row);
  });
  return assembledResults.map((entry) => {
    const prev = byDate.get(String(entry?.date || '').slice(0, 10));
    if (!prev) return entry;
    return {
      ...entry,
      documentsUrls: entry.documentsUrls ?? prev.documentsUrls,
      isExternalPatient:
        entry.isExternalPatient != null ? entry.isExternalPatient : prev.isExternalPatient,
      attendingDoctorId:
        entry.attendingDoctorId !== undefined ? entry.attendingDoctorId : prev.attendingDoctorId,
      createdAt: entry.createdAt ?? prev.createdAt,
    };
  });
}

/**
 * Strips ownership / UI-only fields before POST, while preserving
 * documentsUrls / isExternalPatient / attendingDoctorId / createdAt on each result row.
 */
export function sanitizeLabResultsForSave(results) {
  if (!Array.isArray(results)) return [];
  return results
    .map((entry) => {
      if (!entry?.date) return null;
      const inputs = (entry.inputs || [])
        .map((input) => {
          if (!input || typeof input !== 'object') return null;
          const {
            recentlyUpdated,
            doctorId,
            receptionistId,
            ...rest
          } = input;
          return rest;
        })
        .filter(Boolean);
      if (inputs.length === 0) return null;

      const sanitized = { date: entry.date, inputs };
      if (entry.createdAt != null) sanitized.createdAt = entry.createdAt;
      if (Array.isArray(entry.documentsUrls)) sanitized.documentsUrls = entry.documentsUrls;
      if (entry.isExternalPatient != null) sanitized.isExternalPatient = entry.isExternalPatient;
      if (entry.attendingDoctorId !== undefined) {
        sanitized.attendingDoctorId = entry.attendingDoctorId;
      }
      return sanitized;
    })
    .filter(Boolean);
}

/**
 * Builds POST /api/v1/lab-parameters/results payload.
 * Doctor: { patientId, doctorId, results }
 * Receptionist: {
 *   patientId,
 *   doctorId (last-visit um_id),
 *   receptionist_id (kea token user_id),
 *   results
 * }
 */
export function buildLabResultsSavePayload({
  patientId,
  results,
  tokenUserId,
  attendingDoctorUmId,
  isReceptionist,
} = {}) {
  const sanitized = sanitizeLabResultsForSave(results);
  const payload = {
    patientId,
    results: sanitized,
  };

  const receptionist =
    isReceptionist != null ? Boolean(isReceptionist) : isLabResultsReceptionistSession();
  const attending =
    attendingDoctorUmId != null ? attendingDoctorUmId : getAttendingDoctorUmIdFromUrl();

  if (receptionist) {
    if (attending != null && attending !== '') {
      // Attending / last-visit doctor bucket — do not also send um_id.
      payload.doctorId = attending;
    } else if (typeof console !== 'undefined') {
      console.warn(
        '[lab-results] Receptionist POST without doctorId; backend will use clinic owner_doctor.',
      );
    }
    if (tokenUserId != null && tokenUserId !== '') {
      payload.receptionist_id = tokenUserId;
    }
  } else if (tokenUserId != null && tokenUserId !== '') {
    payload.doctorId = tokenUserId;
  }

  return payload;
}

export function formatLabResultDoctorLabel(doctorId) {
  if (doctorId == null || doctorId === '') return '';
  return `Dr ID ${doctorId}`;
}

/**
 * Receptionist URL → map of um_id → um_name (`um_id=524,552&um_name=Dr%20A,Dr%20B`).
 */
export function getReceptionistDoctorNameMapFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('receptionist')) return {};
    const ids = String(params.get('um_id') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const names = String(params.get('um_name') || '')
      .split(',')
      .map((s) => s.trim());
    const map = {};
    ids.forEach((id, i) => {
      const name = names[i];
      if (name) map[String(id)] = name;
    });
    return map;
  } catch {
    return {};
  }
}

/**
 * Resolves a display name for a lab-result doctorId.
 * Prefers explicit name map, then entry metadata, then receptionist URL names.
 */
export function resolveLabResultDoctorName(doctorId, doctorNameById = {}) {
  if (doctorId == null || doctorId === '') return '';
  const key = String(doctorId);
  const fromMap = doctorNameById?.[key] || doctorNameById?.[doctorId];
  if (fromMap) return String(fromMap).trim();
  const fromUrl = getReceptionistDoctorNameMapFromUrl()[key];
  if (fromUrl) return String(fromUrl).trim();
  return '';
}

/**
 * Tooltip for a lab-result column owned by another doctor.
 */
export function formatOtherDoctorLabResultTooltip(doctorId, doctorNameById = {}) {
  const name = resolveLabResultDoctorName(doctorId, doctorNameById);
  if (name) return `Data added by ${name}`;
  return 'Data added by another doctor';
}

export function formatLabResultReceptionistLabel(receptionistId) {
  if (receptionistId == null || receptionistId === '') return '';
  return `Entered by ${receptionistId}`;
}

// ----- Lab result API (GET today's results) -----

function formatResultsFromApiResponse(results) {
  if (!Array.isArray(results) || results.length === 0) return [];
  const formattedResults = [];
  const seenTests = new Set();
  results.forEach((result) => {
    (result.inputs || []).forEach((input) => {
      if (!input?.testName || input.testName === 'Remarks') return;
      const testKey = `${input.testName}|${result.doctorId ?? ''}`.toLowerCase().trim();
      if (seenTests.has(testKey)) return;
      const value = input.value != null ? String(input.value).trim() : '';
      if (!value) return;
      const units = input.units?.trim();
      let displayValue = value;
      if (units && !value.toLowerCase().includes(units.toLowerCase())) {
        displayValue = `${value} ${units}`.trim();
      }
      formattedResults.push({
        testname: input.testName,
        testName: input.testName,
        value: displayValue,
        reportName: input.reportName || result.reportName || '',
        units: units || '',
        refRange: input.refRange || null,
        doctorId: result.doctorId,
        receptionistId: result.receptionistId,
      });
      seenTests.add(testKey);
    });
  });
  return formattedResults;
}

/**
 * Fetches today's lab results from lab parameters API.
 * GET /api/v1/lab-parameters/results/{patient_unique_id} (optional ?today=true)
 * @param {Object} patient_data - Patient data with patient_unique_id
 * @param {boolean} todayOnly - If true, appends ?today=true to request
 * @returns {Promise<Array|null>} Formatted lab results or null
 */
export const getTodayLabResults = async (patient_data, todayOnly = false) => {
  if (!patient_data?.patient_unique_id) {
    return null;
  }
  try {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    const cleanedToken = token
      ? token.trim().replace(/^["']+|["']+$/g, '')
      : '';
    const baseUrl = env.lab_params_api_url;
    if (!cleanedToken || !baseUrl) {
      return null;
    }

    const url = todayOnly
      ? `${baseUrl}/api/v1/lab-parameters/results/${patient_data.patient_unique_id}?today=true`
      : `${baseUrl}/api/v1/lab-parameters/results/${patient_data.patient_unique_id}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${cleanedToken}` } });
    if (!response.ok) {
      return null;
    }
    const labData = await response.json();
    const allResults = normalizeLabResultsResponse(labData);
    if (allResults.length === 0) {
      return null;
    }

    const today = moment().format('YYYY-MM-DD');
    const todayResults = todayOnly ? allResults : allResults.filter((result) => {
      const resultDate = result.createdAt || result.created_at || result.createdDate || result.date;
      return resultDate && moment(resultDate).format('YYYY-MM-DD') === today;
    });
    if (todayResults.length === 0) {
      return null;
    }

    const formatted = formatResultsFromApiResponse(todayResults);
    return formatted.length > 0 ? formatted : null;
  } catch (error) {
    console.error('Error fetching today lab results:', error);
    return null;
  }
};

/**
 * GET /api/v1/lab-parameters/results/{patientId}?today=true - for end visit and display when only backend has today's data.
 */
export const fetchLabResultsTodayOnly = async (patient_data) => {
  return getTodayLabResults(patient_data, true);
};

// ----- Lab search API (match testName + reportName) -----

/**
 * For each lab result, calls GET /api/v1/lab-parameters?search={testName}
 * and maps to first result's testName + reportName.
 * @param {Array} labResults - Array of { testname, value } (or testName, name)
 * @returns {Promise<Array>} Array with testName and reportName filled from search API
 */
export const matchLabResultsWithApi = async (labResults = []) => {
  if (!Array.isArray(labResults) || labResults.length === 0) return [];
  try {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    // const cleanedToken = token ? token.replace(/['"]+ /g, '') : '';
    const cleanedToken = token
    ? token.trim().replace(/^"+|"+$/g, '')
    : '';
    const baseUrl = env.lab_params_api_url;
    if (!cleanedToken || !baseUrl) return [];

    const matchedResults = [];
    for (const result of labResults) {
      const originalTestName = (result.testname || result.testName || result.name || '').trim();
      if (!originalTestName) continue;
      try {
        const searchQuery = encodeURIComponent(originalTestName);
        const response = await fetch(
          `${baseUrl}/api/v1/lab-parameters?search=${searchQuery}`,
          { headers: { Authorization: `Bearer ${cleanedToken}` } }
        );
        let matchedTest = null;
        if (response.ok) {
          const searchData = await response.json();
          const apiResults = Array.isArray(searchData) ? searchData : searchData?.data || [];
          if (Array.isArray(apiResults) && apiResults.length > 0) {
            matchedTest = apiResults[0];
          }
        }
        if (matchedTest?.testName && matchedTest?.reportName) {
          const apiTestName = matchedTest.testName.trim();
          const apiReportName = matchedTest.reportName.trim();
          matchedResults.push({
            ...result,
            testname: apiTestName,
            testName: apiTestName,
            name: apiTestName,
            reportName: apiReportName,
            value: result.value ?? result.testValue ?? '',
            units: matchedTest.units || result.units || '',
            refRange: matchedTest.refRange ?? result.refRange ?? null,
          });
        }
      } catch (error) {
        // skip this result
      }
    }
    return matchedResults;
  } catch (error) {
    return [];
  }
};

// ----- Value parsing (shared by LabParams prefill and API payload) -----

/**
 * Extracts units from a value string (e.g. "13.5 g/dL" -> "g/dL", "12 %" -> "%").
 * @param {string} valueStr - Display value, may include units
 * @returns {string} Units part, or ""
 */
export function extractUnitsFromValue(valueStr = '') {
  if (!valueStr) return '';
  const str = String(valueStr).trim();
  const match = str.match(/^\d+(?:\.\d+)?\s+(.+)$/);
  if (match) return match[1].trim();
  const percentMatch = str.match(/^\d+(?:\.\d+)?(%|percent)$/i);
  if (percentMatch) return percentMatch[1];
  return '';
}

/**
 * Returns value without units for API: numeric part only (e.g. "61 mg/dL" -> "61", "12.5" -> "12.5").
 * @param {string} valueStr - Display value, may include units
 * @returns {string} Value to send to backend (numeric only)
 */
export function valueWithoutUnitsForApi(valueStr) {
  if (valueStr == null || valueStr === '') return '';
  const str = String(valueStr).trim();
  const match = str.match(/^(\d+(?:\.\d+)?)/);
  return match ? match[1] : str;
}

// ----- Prescription to POST payload (for Save/End Visit) -----

/**
 * Converts Rx pad lab results to POST /api/v1/lab-parameters/results body format.
 * Returns results array: [ { date, inputs: [ { reportName, testName, value, units, ... } ] } ]
 * Value sent to backend is numeric only (no units in value field).
 * @param {Array} labResults - Array of { testname, value, reportName, units, ... }
 * @param {string} dateStr - Optional date (YYYY-MM-DD). Defaults to today.
 * @returns {Array} results array for API
 */
export function prescriptionLabResultsToResultsArray(labResults, dateStr = null) {
  if (!Array.isArray(labResults) || labResults.length === 0) return [];
  const date = dateStr || moment().format('YYYY-MM-DD');
  const inputs = [];
  const seen = new Set();
  labResults.forEach((result) => {
    const testName = (result.testName || result.testname || result.name || '').trim();
    const reportName = (result.reportName || '').trim();
    if (!testName || !reportName) return;
    const key = `${reportName}|${testName}`;
    if (seen.has(key)) return;
    seen.add(key);
    const rawValue = result.value != null ? String(result.value).trim() : '';
    if (!rawValue) return;
    const value = valueWithoutUnitsForApi(rawValue);
    const units = (result.units || '').trim();
    inputs.push({
      reportName,
      testName,
      value,
      units: units || undefined,
      arrowDirection: result.arrowDirection || '',
      refRange: result.refRange ?? null,
      recentlyUpdated: true,
    });
  });
  if (inputs.length === 0) return [];
  return [{ date, inputs }];
}
