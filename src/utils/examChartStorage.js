import {
  dedupeOralExamChart,
  pickOralExamForVisit,
  mapOralApiToChart,
} from "./cardiologyDentalOralExam";
import { normalizeOralSurfaceIds } from "../components/dental/examination/types";

const EXAM_CHART_PREFIX = "dental.exam.chart.";

export function loadExamChart(patientId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${EXAM_CHART_PREFIX}${patientId || "apt-1"}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getPatientIdForExamChart(caseManagerData) {
  return (
    caseManagerData?.patient_data?.patient_unique_id ||
    caseManagerData?.patient_unique_id ||
    caseManagerData?.patient_data?.patient_id ||
    null
  );
}

function resolveOralChartFromCaseManager(caseManagerData) {
  if (!caseManagerData) return null;
  const tcmId = caseManagerData?.tcm_id;
  const consultationDate =
    caseManagerData?.patient_data?.patient_consultaion_date ||
    caseManagerData?.patient_consultaion_date;
  const sources = [
    caseManagerData?.oralExamination,
    caseManagerData?.oral_examination,
    caseManagerData?.oralExamHistory,
    caseManagerData?.oral_examination_history,
    caseManagerData?.oralExaminationHistory,
  ].filter(Boolean);
  for (const src of sources) {
    const chart = pickOralExamForVisit(src, tcmId, consultationDate);
    if (hasOralExamChartData(chart)) return chart;
  }
  return null;
}

/** Prefer explicit payload chart, then API fields on case manager, then localStorage. */
export function resolveExamChartForPrint(caseManagerData, examChartOverride) {
  if (examChartOverride && hasOralExamChartData(examChartOverride)) {
    return examChartOverride;
  }
  const fromCaseManager = resolveOralChartFromCaseManager(caseManagerData);
  if (fromCaseManager) return fromCaseManager;
  const patientId = getPatientIdForExamChart(caseManagerData);
  const fromStorage = loadExamChart(patientId);
  if (hasOralExamChartData(fromStorage)) return fromStorage;
  if (examChartOverride && typeof examChartOverride === "object") {
    return examChartOverride;
  }
  return fromStorage;
}

/**
 * Same resolution as Quixote's resolveExamChartForPrint(caseManagerData), with
 * navigation/Redux fallbacks for print-URL payloads that omit patient id and oral data.
 */
export function resolveExamChartForPrintWithContext({
  caseManagerData,
  examChartOverride,
  oralExamination,
  patientUniqueId,
  tcmId,
} = {}) {
  const enrichedCaseManager = caseManagerData
    ? {
        ...caseManagerData,
        ...(tcmId != null && tcmId !== "" ? { tcm_id: tcmId } : {}),
        patient_data: {
          ...(caseManagerData.patient_data || {}),
          ...(patientUniqueId != null && patientUniqueId !== ""
            ? { patient_unique_id: patientUniqueId }
            : {}),
        },
      }
    : patientUniqueId || tcmId
      ? {
          ...(tcmId != null && tcmId !== "" ? { tcm_id: tcmId } : {}),
          patient_data: {
            ...(patientUniqueId != null && patientUniqueId !== ""
              ? { patient_unique_id: patientUniqueId }
              : {}),
          },
        }
      : null;

  let chart = resolveExamChartForPrint(enrichedCaseManager, examChartOverride);
  if (hasOralExamChartData(chart)) return chart;

  chart = buildExamChartFromOralExaminationState(oralExamination);
  if (hasOralExamChartData(chart)) return chart;

  const pid =
    patientUniqueId != null && patientUniqueId !== ""
      ? String(patientUniqueId)
      : getPatientIdForExamChart(enrichedCaseManager);
  if (pid) {
    const fromStorage = loadExamChart(pid);
    if (hasOralExamChartData(fromStorage)) return fromStorage;
  }

  return chart || null;
}

/** Build print chart from Redux oral examination state (canvas + API fields). */
export function buildExamChartFromOralExaminationState(oralExamination) {
  if (!oralExamination || typeof oralExamination !== "object") return null;

  if (
    Array.isArray(oralExamination.canvasOralEntries) &&
    oralExamination.canvasOralEntries.length > 0
  ) {
    const chart = dedupeOralExamChart({
      oralEntries: oralExamination.canvasOralEntries.map((entry) => ({
        ...entry,
        surfaces: normalizeOralSurfaceIds(entry.surfaces || []),
      })),
      oralNotes: oralExamination.canvasOralNotes || "",
    });
    return hasOralExamChartData(chart) ? chart : null;
  }

  const chart = dedupeOralExamChart(
    mapOralApiToChart({
      findings: oralExamination.findings,
      procedures: oralExamination.procedures,
      treatment_history:
        oralExamination.treatment_history || oralExamination.treatmentHistory,
      overall_notes:
        oralExamination.overall_notes || oralExamination.overallNotes,
    }),
  );
  return hasOralExamChartData(chart) ? chart : null;
}

export function hasOralExamChartData(chart) {
  if (!chart) return false;
  if (Array.isArray(chart.oralEntries) && chart.oralEntries.length > 0) return true;
  if (typeof chart.oralNotes === "string" && chart.oralNotes.trim().length > 0) return true;
  return false;
}
