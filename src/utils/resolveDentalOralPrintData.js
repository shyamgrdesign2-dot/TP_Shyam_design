import { getExamination, getExaminationTodayOnly } from "../api/services/ApiDental";
import { getOralExamination, getOralExaminationTodayOnly } from "../api/services/ApiOral";
import { transformToothStateToApi } from "../components/dental/lib/examination-helpers";
import {
  DENTAL_EXAM_CASE_OPTION_ID,
  ORAL_EXAM_CASE_OPTION_ID,
} from "./dentalDefaultPrintSettings";
import {
  dedupeOralExamChart,
  extractDentalApiPayload,
  hasDentalExamPayload,
  mapOralApiToChart,
  normalizeOralHistoryList,
  oralEntryFingerprint,
  pickOralExamForVisit,
} from "./cardiologyDentalOralExam";
import {
  buildExamChartFromOralExaminationState,
  hasOralExamChartData,
  resolveExamChartForPrintWithContext,
} from "./examChartStorage";

function isCaseOptionEnabled(option) {
  return option?.enable === "Y" && option?.custom_status === "Y";
}

function getDentalPrintOption(printSettings) {
  return printSettings?.prescription?.case_option?.find(
    (o) => o?.id === DENTAL_EXAM_CASE_OPTION_ID,
  );
}

function getOralPrintOption(printSettings) {
  return printSettings?.prescription?.case_option?.find(
    (o) => o?.id === ORAL_EXAM_CASE_OPTION_ID,
  );
}

function normalizeInMemoryDental(rawDental) {
  if (!rawDental) return null;
  if (Array.isArray(rawDental)) {
    return { tooth_states: rawDental };
  }
  if (Array.isArray(rawDental.tooth_states)) {
    return {
      tooth_states: rawDental.tooth_states,
      ...(rawDental.dentition_type ? { dentition_type: rawDental.dentition_type } : {}),
    };
  }
  if (rawDental.toothState && typeof rawDental.toothState === "object") {
    try {
      return {
        tooth_states: transformToothStateToApi(rawDental.toothState),
        ...(rawDental.dentition_type ? { dentition_type: rawDental.dentition_type } : {}),
      };
    } catch {
      return null;
    }
  }
  return null;
}

function mergeDentalToothStates(primary, secondary) {
  const primaryStates = Array.isArray(primary?.tooth_states) ? primary.tooth_states : [];
  const secondaryStates = Array.isArray(secondary?.tooth_states) ? secondary.tooth_states : [];
  if (primaryStates.length === 0 && secondaryStates.length === 0) return null;

  const byToothCode = new Map();
  secondaryStates.forEach((toothState) => {
    const code = toothState?.tooth_code;
    if (code != null && String(code).trim() !== "") {
      byToothCode.set(String(code), toothState);
    }
  });
  primaryStates.forEach((toothState) => {
    const code = toothState?.tooth_code;
    if (code != null && String(code).trim() !== "") {
      byToothCode.set(String(code), toothState);
    }
  });

  const merged = {
    tooth_states: Array.from(byToothCode.values()),
  };
  return hasDentalExamPayload(merged) ? merged : null;
}

function mergeOralExamCharts(primary, secondary) {
  const hasPrimary = hasOralExamChartData(primary);
  const hasSecondary = hasOralExamChartData(secondary);
  if (!hasPrimary) return dedupeOralExamChart(secondary);
  if (!hasSecondary) return dedupeOralExamChart(primary);

  const primaryEntries = Array.isArray(primary.oralEntries) ? primary.oralEntries : [];
  const secondaryEntries = Array.isArray(secondary.oralEntries) ? secondary.oralEntries : [];
  const seen = new Set();
  const mergedEntries = [];

  const addEntry = (entry) => {
    if (!entry) return;
    const fingerprint = oralEntryFingerprint(entry);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    mergedEntries.push(entry);
  };

  primaryEntries.forEach(addEntry);
  secondaryEntries.forEach(addEntry);

  const primaryNote = String(primary.oralNotes || "").trim();
  const secondaryNote = String(secondary.oralNotes || "").trim();
  let oralNotes = primaryNote;
  if (secondaryNote && secondaryNote !== primaryNote) {
    oralNotes = primaryNote ? `${primaryNote}\n${secondaryNote}` : secondaryNote;
  }

  return dedupeOralExamChart({
    oralEntries: mergedEntries,
    oralNotes,
  });
}

function oralChartFingerprintSet(chart) {
  const entries = Array.isArray(chart?.oralEntries) ? chart.oralEntries : [];
  return new Set(entries.map((entry) => oralEntryFingerprint(entry)));
}

/** Overlay only session rows that are not already represented in history. */
function overlaySessionOralOnHistory(historyOral, sessionOral) {
  if (!hasOralExamChartData(historyOral)) {
    return dedupeOralExamChart(sessionOral);
  }
  if (!hasOralExamChartData(sessionOral)) {
    return dedupeOralExamChart(historyOral);
  }

  const historyFingerprints = oralChartFingerprintSet(historyOral);
  const sessionOnlyEntries = (sessionOral.oralEntries || []).filter(
    (entry) => !historyFingerprints.has(oralEntryFingerprint(entry)),
  );

  if (sessionOnlyEntries.length === 0) {
    return dedupeOralExamChart(historyOral);
  }

  return mergeOralExamCharts(historyOral, {
    oralEntries: sessionOnlyEntries,
    oralNotes: sessionOral.oralNotes || "",
  });
}

function mergeOralHistoryToChart(historyPayload) {
  const list = normalizeOralHistoryList(historyPayload);
  if (list.length === 0) {
    const single = mapOralApiToChart(historyPayload);
    return hasOralExamChartData(single) ? single : null;
  }

  let merged = null;
  list.forEach((visit) => {
    const mapped = mapOralApiToChart(visit);
    if (!hasOralExamChartData(mapped)) return;
    merged = mergeOralExamCharts(merged, mapped) || mapped;
  });

  return hasOralExamChartData(merged) ? merged : null;
}

async function fetchDentalTodayOnly(patientId) {
  if (!patientId) return null;
  const todayRes = await getExaminationTodayOnly(patientId).catch(() => null);
  const today = extractDentalApiPayload(todayRes);
  return hasDentalExamPayload(today) ? today : null;
}

async function fetchDentalFull(patientId) {
  if (!patientId) return null;
  const fullRes = await getExamination(patientId).catch(() => null);
  const full = extractDentalApiPayload(fullRes);
  return hasDentalExamPayload(full) ? full : null;
}

function mapOralTodayPayload(todayPayload, tcmId, consultationDate) {
  let chart = pickOralExamForVisit(todayPayload, tcmId, consultationDate);
  if (!hasOralExamChartData(chart)) {
    chart = mapOralApiToChart(todayPayload);
  }
  return hasOralExamChartData(chart) ? chart : null;
}

async function fetchOralTodayOnly(patientId, tcmId, consultationDate) {
  if (!patientId) return null;
  const todayRes = await getOralExaminationTodayOnly(patientId).catch(() => null);
  const todayPayload = extractDentalApiPayload(todayRes);
  return mapOralTodayPayload(todayPayload, tcmId, consultationDate);
}

async function fetchOralFull(patientId, tcmId, consultationDate) {
  if (!patientId) return null;
  const fullRes = await getOralExamination(patientId).catch(() => null);
  const fullPayload = extractDentalApiPayload(fullRes);
  const visitChart = pickOralExamForVisit(fullPayload, tcmId, consultationDate);
  if (hasOralExamChartData(visitChart)) return visitChart;
  const mergedHistory = mergeOralHistoryToChart(fullPayload);
  if (hasOralExamChartData(mergedHistory)) return mergedHistory;
  const mapped = mapOralApiToChart(fullPayload);
  return hasOralExamChartData(mapped) ? mapped : null;
}

/** All visits (current + past) for includeHistorical oral print. */
async function fetchOralExamWithPastHistory(patientId) {
  if (!patientId) return null;
  const fullRes = await getOralExamination(patientId).catch(() => null);
  const fullPayload = extractDentalApiPayload(fullRes);
  const mergedHistory = mergeOralHistoryToChart(fullPayload);
  if (hasOralExamChartData(mergedHistory)) return mergedHistory;
  const mapped = mapOralApiToChart(fullPayload);
  return hasOralExamChartData(mapped) ? mapped : null;
}

function pickInMemoryOralChart(inMemoryOralChart, contextOralChart) {
  if (hasOralExamChartData(inMemoryOralChart)) return inMemoryOralChart;
  if (hasOralExamChartData(contextOralChart)) return contextOralChart;
  return null;
}

/**
 * includeHistorical === false:
 *   1) todayOnly API
 *   2) else full in-memory / payload dentalExaminationData
 *   3) else full examination API when allowFullApiFallback (Cardiology, appointments)
 *
 * includeHistorical === true:
 *   Use full dentalExaminationData (in-memory first, then full examination API, merged).
 */
async function resolveDentalExaminationForPrint({
  includeHistorical,
  normalizedInMemoryDental,
  patientId,
  allowFullApiFallback,
}) {
  if (!includeHistorical) {
    const todayDental = await fetchDentalTodayOnly(patientId);
    if (hasDentalExamPayload(todayDental)) {
      return todayDental;
    }
    if (hasDentalExamPayload(normalizedInMemoryDental)) {
      return normalizedInMemoryDental;
    }
    if (allowFullApiFallback) {
      return await fetchDentalFull(patientId);
    }
    return null;
  }

  const fullDental = await fetchDentalFull(patientId);
  if (
    hasDentalExamPayload(normalizedInMemoryDental) ||
    hasDentalExamPayload(fullDental)
  ) {
    return (
      mergeDentalToothStates(normalizedInMemoryDental, fullDental) ||
      normalizedInMemoryDental ||
      fullDental
    );
  }
  return normalizedInMemoryDental;
}

/**
 * includeHistorical === false:
 *   1) todayOnly API
 *   2) else full in-memory / payload oralExamination data
 *   3) else full oral examination API when allowFullApiFallback
 *
 * includeHistorical === true:
 *   Use full oralExaminationData (in-memory first, then full oral API, merged).
 */
async function resolveOralExamChartForPrint({
  includeHistorical,
  inMemoryOralChart,
  contextOralChart,
  patientId,
  tcmId,
  consultationDate,
  allowFullApiFallback,
}) {
  if (!includeHistorical) {
    const todayOral = await fetchOralTodayOnly(patientId, tcmId, consultationDate);
    if (hasOralExamChartData(todayOral)) {
      return dedupeOralExamChart(todayOral);
    }
    const inMemoryOral = pickInMemoryOralChart(inMemoryOralChart, contextOralChart);
    if (inMemoryOral) {
      return dedupeOralExamChart(inMemoryOral);
    }
    if (allowFullApiFallback) {
      return dedupeOralExamChart(
        await fetchOralFull(patientId, tcmId, consultationDate),
      );
    }
    return null;
  }

  // Past history mode: API history is the base. Overlay only unsaved session rows.
  // Do NOT merge contextOralChart — it is the same visit as the API snapshot.
  const sessionOral = hasOralExamChartData(inMemoryOralChart)
    ? inMemoryOralChart
    : null;
  const historyOral = patientId
    ? await fetchOralExamWithPastHistory(patientId)
    : null;

  if (hasOralExamChartData(historyOral) || hasOralExamChartData(sessionOral)) {
    return overlaySessionOralOnHistory(historyOral, sessionOral);
  }

  return dedupeOralExamChart(
    pickInMemoryOralChart(inMemoryOralChart, contextOralChart),
  );
}

/**
 * Resolves dental + oral examination data for PDF print based on case_option toggles.
 * All print entry points (Cardiology, AppointmentData, ViewPDF/Quixote, consultation preview)
 * should use this helper so includeHistorical behaves consistently.
 */
export async function resolveDentalOralForPrint({
  patientId,
  tcmId,
  consultationDate,
  printSettings,
  inMemoryDental = null,
  inMemoryOral = null,
  caseManagerData = null,
  examChartOverride = null,
  allowFullApiFallback = false,
}) {
  const dentalOption = getDentalPrintOption(printSettings);
  const oralOption = getOralPrintOption(printSettings);
  const dentalEnabled = isCaseOptionEnabled(dentalOption);
  const oralEnabled = isCaseOptionEnabled(oralOption);

  const normalizedInMemoryDental = normalizeInMemoryDental(inMemoryDental);
  const inMemoryOralChart =
    inMemoryOral && typeof inMemoryOral === "object"
      ? hasOralExamChartData(inMemoryOral)
        ? inMemoryOral
        : buildExamChartFromOralExaminationState(inMemoryOral)
      : null;

  const contextOralChart = resolveExamChartForPrintWithContext({
    caseManagerData,
    examChartOverride,
    oralExamination: inMemoryOral,
    patientUniqueId: patientId,
    tcmId,
  });

  let dentalExaminationData = null;
  let examChart = null;

  if (dentalEnabled) {
    dentalExaminationData = await resolveDentalExaminationForPrint({
      includeHistorical: dentalOption?.includeHistorical === true,
      normalizedInMemoryDental,
      patientId,
      allowFullApiFallback,
    });
  }

  if (oralEnabled) {
    examChart = await resolveOralExamChartForPrint({
      includeHistorical: oralOption?.includeHistorical === true,
      inMemoryOralChart,
      contextOralChart,
      patientId,
      tcmId,
      consultationDate,
      allowFullApiFallback,
    });
  }

  return {
    dentalExaminationData: hasDentalExamPayload(dentalExaminationData)
      ? dentalExaminationData
      : { tooth_states: [] },
    examChart: hasOralExamChartData(examChart) ? examChart : null,
  };
}
