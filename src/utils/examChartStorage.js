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

/** Prefer explicit payload chart; fall back to browser localStorage. */
export function resolveExamChartForPrint(caseManagerData, examChartOverride) {
  if (examChartOverride && typeof examChartOverride === "object") {
    return examChartOverride;
  }
  const patientId = getPatientIdForExamChart(caseManagerData);
  return loadExamChart(patientId);
}

export function hasOralExamChartData(chart) {
  if (!chart) return false;
  if (Array.isArray(chart.oralEntries) && chart.oralEntries.length > 0) return true;
  if (typeof chart.oralNotes === "string" && chart.oralNotes.trim().length > 0) return true;
  return false;
}
