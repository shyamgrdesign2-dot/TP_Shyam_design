import { getExamination, getExaminationTodayOnly } from "../api/services/ApiDental";
import { getOralExamination, getOralExaminationTodayOnly } from "../api/services/ApiOral";
import { transformToothStateToApi } from "../components/dental/lib/examination-helpers";
import {
  DENTAL_EXAM_CASE_OPTION_ID,
  ORAL_EXAM_CASE_OPTION_ID,
} from "./dentalDefaultPrintSettings";
import {
  extractDentalApiPayload,
  hasDentalExamPayload,
  mapOralApiToChart,
  normalizeOralHistoryList,
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
    (o) => o?.id === DENTAL_EXAM_CASE_OPTION_ID
  );
}

function getOralPrintOption(printSettings) {
  return printSettings?.prescription?.case_option?.find(
    (o) => o?.id === ORAL_EXAM_CASE_OPTION_ID
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
  if (!hasPrimary) return hasSecondary ? secondary : null;
  if (!hasSecondary) return primary;

  const primaryEntries = Array.isArray(primary.oralEntries) ? primary.oralEntries : [];
  const secondaryEntries = Array.isArray(secondary.oralEntries) ? secondary.oralEntries : [];
  const seenIds = new Set(
    primaryEntries.map((entry) => entry?.id).filter((id) => id != null).map(String),
  );
  const mergedEntries = [
    ...primaryEntries,
    ...secondaryEntries.filter((entry) => {
      const id = entry?.id;
      if (id == null) return true;
      const key = String(id);
      if (seenIds.has(key)) return false;
      seenIds.add(key);
      return true;
    }),
  ];

  const noteParts = [primary.oralNotes, secondary.oralNotes]
    .map((note) => String(note || "").trim())
    .filter(Boolean);

  const chart = {
    oralEntries: mergedEntries,
    oralNotes: noteParts.join("\n"),
  };
  return hasOralExamChartData(chart) ? chart : null;
}

function mergeOralHistoryToChart(historyPayload) {
  const list = normalizeOralHistoryList(historyPayload);
  if (list.length === 0) {
    const single = mapOralApiToChart(historyPayload);
    return hasOralExamChartData(single) ? single : null;
  }

  const oralEntries = [];
  const noteParts = [];

  list.forEach((visit) => {
    const mapped = mapOralApiToChart(visit);
    if (Array.isArray(mapped?.oralEntries)) {
      oralEntries.push(...mapped.oralEntries);
    }
    const notes = String(mapped?.oralNotes || "").trim();
    if (notes) noteParts.push(notes);
  });

  const chart = {
    oralEntries,
    oralNotes: noteParts.join("\n"),
  };
  return hasOralExamChartData(chart) ? chart : null;
}

async function fetchDentalTodayOnly(patientId, allowFullApiFallback) {
  if (!patientId) return null;

  const todayRes = await getExaminationTodayOnly(patientId).catch(() => null);
  const today = extractDentalApiPayload(todayRes);
  if (hasDentalExamPayload(today)) return today;

  if (allowFullApiFallback) {
    const fullRes = await getExamination(patientId).catch(() => null);
    const full = extractDentalApiPayload(fullRes);
    return hasDentalExamPayload(full) ? full : null;
  }

  return null;
}

async function fetchOralTodayOnly(
  patientId,
  allowFullApiFallback,
  tcmId,
  consultationDate
) {
  if (!patientId) return null;

  const todayRes = await getOralExaminationTodayOnly(patientId).catch(() => null);
  const todayPayload = extractDentalApiPayload(todayRes);
  let chart = pickOralExamForVisit(todayPayload, tcmId, consultationDate);
  if (!hasOralExamChartData(chart)) {
    chart = mapOralApiToChart(todayPayload);
  }
  if (hasOralExamChartData(chart)) return chart;

  if (allowFullApiFallback) {
    const fullRes = await getOralExamination(patientId).catch(() => null);
    const fullPayload = extractDentalApiPayload(fullRes);
    const visitChart = pickOralExamForVisit(fullPayload, tcmId, consultationDate);
    if (hasOralExamChartData(visitChart)) return visitChart;
    return mapOralApiToChart(fullPayload);
  }

  return null;
}

/**
 * Resolves dental + oral examination data for PDF print based on case_option toggles.
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
  const dentalHistorical = dentalOption?.includeHistorical === true;
  const oralHistorical = oralOption?.includeHistorical === true;

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
    if (dentalHistorical) {
      // Historical mode: merge saved today-only API data with unsaved in-memory session edits.
      // In-memory wins per tooth_code so current-session chart changes appear in print.
      let apiDental = null;
      if (patientId) {
        apiDental = await fetchDentalTodayOnly(patientId, allowFullApiFallback);
      }
      dentalExaminationData = mergeDentalToothStates(
        normalizedInMemoryDental,
        apiDental,
      );
    } else if (hasDentalExamPayload(normalizedInMemoryDental)) {
      // Toggle OFF: full in-memory dental examination chart.
      dentalExaminationData = normalizedInMemoryDental;
    }
  }

  if (oralEnabled) {
    if (oralHistorical) {
      let apiOral = null;
      if (patientId) {
        apiOral = await fetchOralTodayOnly(
          patientId,
          allowFullApiFallback,
          tcmId,
          consultationDate,
        );
      }
      const inMemoryChart = hasOralExamChartData(inMemoryOralChart)
        ? inMemoryOralChart
        : hasOralExamChartData(contextOralChart)
          ? contextOralChart
          : null;
      examChart = mergeOralExamCharts(inMemoryChart, apiOral);
    } else if (hasOralExamChartData(inMemoryOralChart)) {
      examChart = inMemoryOralChart;
    } else if (hasOralExamChartData(contextOralChart)) {
      examChart = contextOralChart;
    }
  }

  return {
    dentalExaminationData: hasDentalExamPayload(dentalExaminationData)
      ? dentalExaminationData
      : { tooth_states: [] },
    examChart: hasOralExamChartData(examChart) ? examChart : null,
  };
}
