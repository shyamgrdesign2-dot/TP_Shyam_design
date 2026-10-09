import { getToothImageCandidates } from "../../../assets";

/** Permanent dentition — left→right as seen facing the patient. */
export const ADULT_UPPER_ROW = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
];
export const ADULT_LOWER_ROW = [
  "48", "47", "46", "45", "44", "43", "42", "41",
  "31", "32", "33", "34", "35", "36", "37", "38",
];
export const ADULT_FDI = [...ADULT_UPPER_ROW, ...ADULT_LOWER_ROW];

/** Primary dentition — 5 teeth per quadrant. */
export const PEDIATRIC_UPPER_ROW = [
  "55", "54", "53", "52", "51",
  "61", "62", "63", "64", "65",
];
export const PEDIATRIC_LOWER_ROW = [
  "85", "84", "83", "82", "81",
  "71", "72", "73", "74", "75",
];
export const PEDIATRIC_FDI = [...PEDIATRIC_UPPER_ROW, ...PEDIATRIC_LOWER_ROW];

/** @deprecated Use ADULT_UPPER_ROW */
export const UPPER_ROW = ADULT_UPPER_ROW;
/** @deprecated Use ADULT_LOWER_ROW */
export const LOWER_ROW = ADULT_LOWER_ROW;
/** @deprecated Use ADULT_FDI */
export const ALL_FDI = ADULT_FDI;

export const CHART_TITLES = {
  adult: "Adult Dentition Chart",
  pediatric: "Pediatric Dentition Chart",
  mixed: "Mixed Dentition Chart",
};

/** Pediatric rows in a mixed chart span this fraction of the adult row width, centered. */
export const PEDIATRIC_MIXED_BAND_WIDTH_RATIO = 0.8;

const ADULT_TOOTH_ASPECT = {
  "11": 0.371, "12": 0.371, "13": 0.341, "14": 0.354, "15": 0.373, "16": 0.505, "17": 0.513, "18": 0.515,
  "21": 0.371, "22": 0.371, "23": 0.341, "24": 0.354, "25": 0.373, "26": 0.505, "27": 0.513, "28": 0.515,
  "31": 0.3, "32": 0.287, "33": 0.307, "34": 0.334, "35": 0.342, "36": 0.668, "37": 0.55, "38": 0.658,
  "41": 0.3, "42": 0.287, "43": 0.307, "44": 0.334, "45": 0.342, "46": 0.668, "47": 0.55, "48": 0.658,
};

const PEDIATRIC_POS_TO_ADULT_POS = { 1: 1, 2: 2, 3: 3, 4: 6, 5: 7 };
const PEDIATRIC_QUADRANT_TO_ADULT = { 5: 1, 6: 2, 7: 3, 8: 4 };

export function isPediatricFdi(fdi) {
  const q = String(fdi || "")[0];
  return q === "5" || q === "6" || q === "7" || q === "8";
}

/** Map primary FDI to the adult permanent tooth image used for rendering. */
export function pediatricToAdultImageFdi(pediatricFdi) {
  const fdi = String(pediatricFdi || "");
  if (!isPediatricFdi(fdi)) return fdi;
  const adultQuadrant = PEDIATRIC_QUADRANT_TO_ADULT[fdi[0]];
  const adultPos = PEDIATRIC_POS_TO_ADULT_POS[Number(fdi[1])];
  if (!adultQuadrant || !adultPos) return fdi;
  return `${adultQuadrant}${adultPos}`;
}

export function getImageSourceFdi(fdi) {
  return isPediatricFdi(fdi) ? pediatricToAdultImageFdi(fdi) : String(fdi);
}

export function getToothImageCandidatesForFdi(fdi) {
  return getToothImageCandidates(getImageSourceFdi(fdi));
}

export function toothAspect(fdi) {
  const source = getImageSourceFdi(fdi);
  return ADULT_TOOTH_ASPECT[source] || 0.45;
}

function sumAspects(fdiList) {
  return fdiList.reduce((sum, fdi) => sum + toothAspect(fdi), 0);
}

/** Max half-arch aspect sum — used to size uniform tooth height per row. */
export function getMaxHalfAspectSum(dentitionType = "adult") {
  if (dentitionType === "pediatric") {
    const upperHalf = PEDIATRIC_UPPER_ROW.slice(0, 5);
    const lowerHalf = PEDIATRIC_LOWER_ROW.slice(0, 5);
    return Math.max(sumAspects(upperHalf), sumAspects(lowerHalf));
  }
  if (dentitionType === "mixed") {
    const adultUpperHalf = ADULT_UPPER_ROW.slice(0, 8);
    const adultLowerHalf = ADULT_LOWER_ROW.slice(0, 8);
    const pedUpperHalf = PEDIATRIC_UPPER_ROW.slice(0, 5);
    const pedLowerHalf = PEDIATRIC_LOWER_ROW.slice(0, 5);
    return Math.max(
      sumAspects(adultUpperHalf),
      sumAspects(adultLowerHalf),
      sumAspects(pedUpperHalf),
      sumAspects(pedLowerHalf),
    );
  }
  const adultUpperHalf = ADULT_UPPER_ROW.slice(0, 8);
  const adultLowerHalf = ADULT_LOWER_ROW.slice(0, 8);
  return Math.max(sumAspects(adultUpperHalf), sumAspects(adultLowerHalf));
}

export function getFdiRowsForDentitionType(type = "adult") {
  if (type === "pediatric") {
    return {
      upperRow: PEDIATRIC_UPPER_ROW,
      lowerRow: PEDIATRIC_LOWER_ROW,
      teethPerQuadrant: 5,
      title: CHART_TITLES.pediatric,
    };
  }
  return {
    upperRow: ADULT_UPPER_ROW,
    lowerRow: ADULT_LOWER_ROW,
    teethPerQuadrant: 8,
    title: CHART_TITLES.adult,
  };
}

export function getFdiListForPrefetch(dentitionType = "adult") {
  if (dentitionType === "pediatric") return PEDIATRIC_FDI;
  if (dentitionType === "mixed") return [...ADULT_FDI, ...PEDIATRIC_FDI];
  return ADULT_FDI;
}

/** Whether a tooth_states entry has chart-visible clinical data. */
export function toothStateHasChartData(toothState) {
  if (!toothState) return false;
  const hasHistory = (toothState.treatment_history || []).length > 0;
  const hasFindings = (toothState.findings || []).length > 0;
  const hasProcedures = (toothState.procedures || []).length > 0;
  const hasNotes = String(toothState.overall_notes || "").trim().length > 0;
  return hasHistory || hasFindings || hasProcedures || hasNotes;
}

function fdisWithChartDataFromStates(toothStates) {
  const fdis = new Set();
  (toothStates || []).forEach((ts) => {
    const code = String(ts?.tooth_code || "").trim();
    if (!code || !toothStateHasChartData(ts)) return;
    fdis.add(code);
  });
  return fdis;
}

export function normalizeDentitionType(value) {
  const v = String(value || "").toLowerCase();
  if (v === "pediatric" || v === "mixed" || v === "adult") return v;
  return "adult";
}

function layoutFromTemplate(templateType) {
  const type = normalizeDentitionType(templateType);
  if (type === "pediatric") {
    return { showAdult: false, showPediatric: true, isMixed: false, dentitionType: "pediatric" };
  }
  if (type === "mixed") {
    return { showAdult: true, showPediatric: true, isMixed: true, dentitionType: "mixed" };
  }
  return { showAdult: true, showPediatric: false, isMixed: false, dentitionType: "adult" };
}

function chartsFromFdis(fdis) {
  const hasAdult = [...fdis].some((fdi) => !isPediatricFdi(fdi));
  const hasPediatric = [...fdis].some((fdi) => isPediatricFdi(fdi));

  return {
    showAdult: hasAdult,
    showPediatric: hasPediatric,
    isMixed: hasAdult && hasPediatric,
    dentitionType: hasAdult && hasPediatric ? "mixed" : hasPediatric ? "pediatric" : "adult",
  };
}

function templateTypeFromData(data) {
  return data?.dentition_type || data?.dentitionType || data?.chartTemplateType;
}

/**
 * Decide which odontogram charts to render.
 * - Adult + pediatric data → mixed chart
 * - Adult only → adult chart
 * - Pediatric only → pediatric chart
 * - No data → layout from dentition_type / patientType (plain chart print)
 */
export function resolveChartsToRender(data) {
  const fdis = fdisWithChartDataFromStates(data?.tooth_states);
  if (fdis.size === 0) {
    return layoutFromTemplate(templateTypeFromData(data));
  }
  return chartsFromFdis(fdis);
}

/** Same as resolveChartsToRender for FlatDentitionChart localStorage chart shape. */
export function resolveChartsToRenderFromChart(chart) {
  const fdis = new Set();
  (chart?.entries || []).forEach((e) => {
    if (e?.toothFdi) fdis.add(String(e.toothFdi));
  });
  Object.entries(chart?.toothDiagnoses || {}).forEach(([fdi, diags]) => {
    if ((diags || []).length > 0) fdis.add(String(fdi));
  });
  Object.entries(chart?.findingsByTooth || {}).forEach(([fdi, list]) => {
    const findings = (list || []).filter((f) => f && f.type && f.type !== "Normal");
    if (findings.length > 0) fdis.add(String(fdi));
  });
  if (fdis.size === 0) {
    return layoutFromTemplate(
      chart?.patientType || chart?.dentition_type || chart?.dentitionType,
    );
  }
  return chartsFromFdis(fdis);
}

/** Used for image prefetch sizing — derived from chart data, not dentition_type. */
export function resolveDentitionType(data) {
  return resolveChartsToRender(data).dentitionType;
}
