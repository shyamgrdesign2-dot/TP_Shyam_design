/** Map IPD /patients response (ipd-prod inPatients) to picker rows. */
import { getDecodedToken } from '../../../../utils/localStorage';

/** Leading honorifics that may already be embedded in API name fields. */
const PATIENT_TITLE_RE = /^(Mrs|Miss|Mr|Ms|Master|Dr|Prof)\.?\s+/i;

/** Strip all leading title prefixes from a name ("Mrs Mrs Rohan" → "Rohan"). */
export function stripLeadingPatientTitles(name) {
  let result = String(name || '').trim().replace(/\s+/g, ' ');
  while (PATIENT_TITLE_RE.test(result)) {
    result = result.replace(PATIENT_TITLE_RE, '').trim();
  }
  return result;
}

/**
 * Collapse duplicated leading titles in a stored display string.
 * "Mrs Mrs Rohan" → "Mrs Rohan"; "Miss Miss Relative User" → "Miss Relative User".
 */
export function sanitizePatientDisplayName(name) {
  const raw = String(name || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';

  const titles = [];
  let rest = raw;
  while (PATIENT_TITLE_RE.test(rest)) {
    const match = rest.match(PATIENT_TITLE_RE);
    titles.push(match[1]);
    rest = rest.slice(match[0].length).trim();
  }

  if (!titles.length) return raw;
  return `${titles[0]} ${rest}`.trim();
}

export function buildIpdDoctorIdsFilter() {
  const userId = getDecodedToken()?.result?.user_id;
  return userId != null ? String(userId) : '';
}

export function extractIpdPatientsFromResponse(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.patients)) return response.patients;
  if (Array.isArray(response.data?.patients)) return response.data.patients;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

export function normalizeIpdPickerPatients(response) {
  const raw = extractIpdPatientsFromResponse(response);

  return raw
    .map((patient) => {
      const details = patient?.details || {};
      const room = patient?.room?.title || '';
      const ward = patient?.ward?.title || '';
      const salutation = String(details.prefix || details.salutation || '')
        .trim()
        .replace(/\.$/, '');
      const fullName = stripLeadingPatientTitles(details.name || '');
      const patientUniqueId =
        patient?.patient_unique_id
        || details?.patient_unique_id
        || details?.id
        || details?.patientRefId
        || patient?.mrno
        || '';

      return {
        patient_unique_id: patientUniqueId,
        pm_fullname: fullName,
        pm_salutation: salutation,
        pm_contact_no: details.contact || '',
        pm_gender: details.gender || '',
        pm_age: details.age ?? '',
        pm_reference_id: patient?.mrno || patient?.mrNo || details?.pm_pid || '',
        mrno: patient?.mrno || patient?.mrNo || details?.patientRefId || '',
        bed: ward && room ? `${ward} · ${room}` : room || ward,
        ward,
        room,
        admissionId: patient?.admissionId || patient?.admission_id || '',
        isIpdPatient: true,
        record: patient,
      };
    })
    .filter((patient) => patient.patient_unique_id);
}

export function normalizePickerPatients(response) {
  const raw =
    response?.patients
    || response?.data?.patients
    || response?.data?.data?.patients
    || response?.data
    || response?.records
    || (Array.isArray(response) ? response : []);

  if (!Array.isArray(raw)) return [];

  return raw
    .map((patient) => ({
      patient_unique_id:
        patient?.patient_unique_id || patient?.pm_pid || patient?.patient_id || '',
      pm_fullname: stripLeadingPatientTitles(
        patient?.pm_fullname
        || [patient?.pm_first_name, patient?.pm_middle_name, patient?.pm_last_name]
          .filter(Boolean)
          .join(' ')
          .trim()
      ),
      pm_salutation: String(patient?.pm_salutation || patient?.salutation || '')
        .trim()
        .replace(/\.$/, ''),
      pm_contact_no: patient?.pm_contact_no || patient?.mobile || patient?.phone || '',
      pm_gender: patient?.pm_gender || patient?.gender || '',
      pm_age: patient?.pm_age || patient?.ageYears || patient?.age || '',
      pm_dob: patient?.pm_dob || patient?.dob || '',
      bed: patient?.bed || patient?.pm_room || patient?.ward || '',
      record: patient,
    }))
    .filter((patient) => patient.patient_unique_id);
}

function calculateAge(dob) {
  if (!dob) return '';
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function getPatientInitials(name) {
  if (!name) return 'P';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return 'P';
}

export function formatPatientPickerMeta(patient) {
  const parts = [];
  const age = patient.pm_age || calculateAge(patient.pm_dob);
  const gender = patient.pm_gender
    ? String(patient.pm_gender).charAt(0).toUpperCase()
    : '';

  if (age && gender) {
    parts.push(`${age}/${gender}`);
  } else if (age) {
    parts.push(String(age));
  } else if (gender) {
    parts.push(gender);
  }

  const mrn =
    patient.pm_reference_id
    || patient.record?.mrno
    || patient.record?.mrNo
    || patient.pm_pid
    || patient.record?.pm_reference_id
    || patient.record?.pm_pid;
  if (mrn) parts.push(String(mrn).toUpperCase().startsWith('MRN') ? String(mrn) : `MRN-${mrn}`);

  if (patient.bed) parts.push(patient.bed);

  return parts.join(' · ');
}

export function getPatientDisplayName(patient) {
  const salutation = String(patient?.pm_salutation || '')
    .trim()
    .replace(/\.$/, '');
  const rawName = String(patient?.pm_fullname || '').trim();

  if (!salutation) {
    return sanitizePatientDisplayName(rawName)
      || (patient?.patient_unique_id ? `Patient #${patient.patient_unique_id}` : '');
  }

  const bareName = stripLeadingPatientTitles(rawName);
  const fullName = `${salutation}${bareName ? ` ${bareName}` : ''}`.trim();
  return fullName || (patient?.patient_unique_id ? `Patient #${patient.patient_unique_id}` : '');
}

/** Build PUT /voice patient-link fields from an IPD/OPD picker row. */
export function buildNeoPatientLinkPayload(patient) {
  if (!patient?.patient_unique_id) return {};

  const record = patient.record || {};
  const details = record.details || {};
  const room = String(patient.room || record.room?.title || '').trim();
  const ward = String(patient.ward || record.ward?.title || '').trim();
  const patientName = getPatientDisplayName(patient);
  const mrno = String(
    patient.mrno
    || patient.pm_reference_id
    || record.mrno
    || record.mrNo
    || details.patientRefId
    || ''
  ).trim();
  const admissionId = String(
    patient.admissionId
    || record.admissionId
    || record.admission_id
    || ''
  ).trim();

  return {
    patientUniqueId: patient.patient_unique_id,
    patientLabel: patientName,
    patientName,
    ...(room ? { roomNumber: room } : {}),
    ...(ward ? { wardTitle: ward } : {}),
    ...(admissionId ? { admissionId } : {}),
    ...(mrno ? { mrno } : {}),
  };
}

export function normalizeDbMatchCandidates(candidates = []) {
  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((candidate) => {
      const details = candidate?.details || {};
      const ward = candidate?.ward?.title || candidate?.ward || '';
      const room = candidate?.room?.title || candidate?.room || '';
      const bed = candidate?.bed
        || (ward && room ? `${ward} · ${room}` : room || ward);

      return {
        patient_unique_id:
          candidate?.patient_unique_id
          || details?.patient_unique_id
          || details?.id
          || details?.patientRefId
          || candidate?.pm_pid
          || candidate?.patient_id
          || candidate?.mrno
          || '',
        pm_fullname: stripLeadingPatientTitles(
          candidate?.name
          || details?.name
          || candidate?.pm_fullname
          || [candidate?.pm_first_name, candidate?.pm_last_name].filter(Boolean).join(' ').trim()
        ),
        pm_salutation: String(
          candidate?.pm_salutation || details?.prefix || candidate?.salutation || ''
        )
          .trim()
          .replace(/\.$/, ''),
        pm_contact_no: candidate?.contact || details?.contact || candidate?.pm_contact_no || candidate?.mobile || '',
        pm_gender: candidate?.pm_gender || details?.gender || candidate?.gender || '',
        pm_age: candidate?.age || details?.age || candidate?.pm_age || '',
        pm_dob: candidate?.pm_dob || candidate?.dob || '',
        pm_reference_id: candidate?.mrno || candidate?.mrNo || details?.pm_pid || candidate?.pm_reference_id || '',
        mrno: candidate?.mrno || candidate?.mrNo || details?.patientRefId || '',
        bed,
        ward,
        room,
        admissionId: candidate?.admissionId || candidate?.admission_id || '',
        isDbMatch: true,
        isApiAiMatch: true,
        record: candidate,
      };
    })
    .filter((patient) => patient.patient_unique_id || patient.pm_fullname);
}

export function mergePickerPatients(searchPatients = [], dbMatchCandidates = []) {
  const suggested = normalizeDbMatchCandidates(dbMatchCandidates);
  const seen = new Set();
  const merged = [];

  suggested.forEach((patient) => {
    const id = String(patient.patient_unique_id);
    if (seen.has(id)) return;
    seen.add(id);
    merged.push(patient);
  });

  searchPatients.forEach((patient) => {
    const id = String(patient.patient_unique_id);
    if (seen.has(id)) return;
    seen.add(id);
    merged.push(patient);
  });

  return merged;
}

/** Pin one patient to the top of the picker list. */
export function sortPickerPatientsWithSelectedFirst(patients = [], selectedId) {
  if (!selectedId || !patients.length) return patients;

  const priorityId = String(selectedId);
  const priority = [];
  const rest = [];

  patients.forEach((patient) => {
    if (String(patient.patient_unique_id) === priorityId) {
      priority.push(patient);
    } else {
      rest.push(patient);
    }
  });

  return priority.length ? [...priority, ...rest] : patients;
}

function normalizeName(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findAiMatchPatient(patients, suggestedName) {
  if (!suggestedName || !patients?.length) return null;

  const needle = normalizeName(suggestedName);
  if (!needle) return null;

  const exact = patients.find((patient) => normalizeName(patient.pm_fullname) === needle);
  if (exact) return exact;

  const needleParts = needle.split(' ').filter(Boolean);
  const firstName = needleParts[0];

  return patients.find((patient) => {
    const name = normalizeName(patient.pm_fullname);
    if (!name) return false;
    if (name.includes(needle) || needle.includes(name)) return true;
    if (firstName && name.split(' ')[0] === firstName) return true;
    return false;
  }) || null;
}

/** API dbMatchCandidates take priority over name-based matching. */
export function resolveAiMatchPatient(mergedPatients = [], dbMatchCandidates = [], suggestedName = '') {
  const apiMatches = normalizeDbMatchCandidates(dbMatchCandidates);
  const apiMatch = apiMatches[0] || null;

  if (apiMatch) {
    const inList = mergedPatients.find(
      (patient) => apiMatch.patient_unique_id
        && String(patient.patient_unique_id) === String(apiMatch.patient_unique_id)
    );
    if (inList) return { ...inList, isDbMatch: true, isApiAiMatch: true };
    return apiMatch;
  }

  const nameMatch = findAiMatchPatient(mergedPatients, suggestedName);
  return nameMatch ? { ...nameMatch, isNameAiMatch: true } : null;
}
