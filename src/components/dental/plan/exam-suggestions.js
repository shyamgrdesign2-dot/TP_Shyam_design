/**
 * Builds treatment-plan quick picks from (1) seeded INITIAL_TOOTH_STATE,
 * (2) live examination chart rows persisted from DentalCanvas.
 */
import { INITIAL_TOOTH_STATE } from "../mock-data";
import { TREATMENT_NAMES } from "./treatments";

export const EXAM_CHART_STORAGE_PREFIX = "dental.exam.chart.";

const QUADRANT_MAP = {
  1: "Upper Right",
  2: "Upper Left",
  3: "Lower Left",
  4: "Lower Right",
};

const TOOTH_NAMES = {
  1: "Central Incisor",
  2: "Lateral Incisor",
  3: "Canine",
  4: "First Premolar",
  5: "Second Premolar",
  6: "First Molar",
  7: "Second Molar",
  8: "Third Molar",
};

export function fdiToLabel(fdi) {
  if (fdi === "full-mouth") return "Full Mouth";
  const q = fdi[0];
  const pos = parseInt(fdi[1], 10);
  const quadrant = QUADRANT_MAP[q] ?? "";
  const name = TOOTH_NAMES[pos] ?? "";
  return `${quadrant} ${name}`.trim();
}

function mapDiagnosisToTreatment(diagnosis) {
  const map = {
    RCT: "Root Canal Treatment",
    Crown: "Crown (PFM)",
    Bridge: "Bridge (per unit)",
    Implant: "Implant (Single)",
    Missing: "Implant (Single)",
    Extraction: "Extraction",
    "Composite Filling": "Restoration (Composite Filling)",
    Scaling: "Scaling & Polishing",
    Polishing: "Scaling & Polishing",
    Veneer: "Veneers",
    "Pulp Cap": "Pulp Capping",
    "Root Planing": "Deep Cleaning (per quadrant)",
    Denture: "Partial Denture",
  };
  return map[diagnosis] ?? null;
}

function mapFindingToTreatment(findingType) {
  const map = {
    "Cavity/Caries": "Restoration (Composite Filling)",
    Crack: "Crown (PFM)",
    Fracture: "Crown (PFM)",
    Sensitivity: "Root Canal Treatment",
    Erosion: "Restoration (Composite Filling)",
    NCCL: "Restoration (Composite Filling)",
    Calculus: "Scaling & Polishing",
    Plaque: "Scaling & Polishing",
    Staining: "Teeth Whitening",
    Recession: "Gingival Grafting",
    Resorption: "Root Canal Treatment",
  };
  return map[findingType] ?? null;
}

/** Map short examination procedure names to billing catalog lines. */
function mapChartProcedureName(name) {
  if (TREATMENT_NAMES.includes(name)) return name;
  const shortcuts = {
    RCT: "Root Canal Treatment",
    Restoration: "Restoration (Composite Filling)",
    "Composite Filling": "Restoration (Composite Filling)",
    Extraction: "Extraction",
    Scaling: "Scaling & Polishing",
    Polishing: "Scaling & Polishing",
    "Crown Prep": "Crown (PFM)",
    "Bridge Prep": "Bridge (per unit)",
    "Implant Placement": "Implant (Single)",
    "Pulp Cap": "Pulp Capping",
    "Root Planing": "Deep Cleaning (per quadrant)",
    Veneer: "Veneers",
  };
  if (shortcuts[name]) return shortcuts[name];
  const lower = name.toLowerCase();
  const fuzzy = TREATMENT_NAMES.find(
    (n) =>
      n.toLowerCase() === lower ||
      n.toLowerCase().includes(lower) ||
      lower.includes(n.toLowerCase()),
  );
  return fuzzy ?? null;
}

function loadChartSnapshot(patientId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      `${EXAM_CHART_STORAGE_PREFIX}${patientId}`,
    );
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function diagnosesForPatient(patientId, toothState) {
  const snap = loadChartSnapshot(patientId);
  if (snap?.toothDiagnoses && Object.keys(snap.toothDiagnoses).length > 0)
    return snap.toothDiagnoses;
  return toothState?.toothDiagnoses ?? {};
}

function findingsForPatient(patientId, toothState) {
  const snap = loadChartSnapshot(patientId);
  if (snap?.findingsByTooth && Object.keys(snap.findingsByTooth).length > 0)
    return snap.findingsByTooth;
  return toothState?.findingsByTooth ?? {};
}

function suggestionKey(s) {
  return `${s.treatment}::${s.toothFdi}`;
}

/**
 * Merged suggestions for treatment plan drawer (static seed + live chart).
 */
export function buildExamSuggestions(patientId) {
  const byKey = new Map();

  const push = (s) => {
    const k = suggestionKey(s);
    if (!byKey.has(k)) byKey.set(k, s);
  };

  const toothState = INITIAL_TOOTH_STATE[patientId];
  const diagMap = diagnosesForPatient(patientId, toothState);
  for (const [fdi, diagnoses] of Object.entries(diagMap)) {
    for (const diag of diagnoses) {
      const treatmentName = mapDiagnosisToTreatment(diag);
      if (treatmentName) {
        push({
          treatment: treatmentName,
          toothFdi: fdi,
          toothLabel: fdiToLabel(fdi),
          surfaces: [],
          source: "examination",
          hint: `Diagnosis on T${fdi}: ${diag}`,
        });
      }
    }
  }
  const findMap = findingsForPatient(patientId, toothState);
  for (const [fdi, findings] of Object.entries(findMap)) {
    for (const finding of findings) {
      const treatmentName = mapFindingToTreatment(finding.type);
      if (treatmentName) {
        push({
          treatment: treatmentName,
          toothFdi: fdi,
          toothLabel: fdiToLabel(fdi),
          surfaces: [finding.zoneId],
          source: "examination",
          hint: `Finding on T${fdi}: ${finding.type}`,
        });
      }
    }
  }

  const live = loadChartSnapshot(patientId);
  const entries = live?.entries ?? [];
  for (const e of entries) {
    if (e.kind !== "procedure" && e.kind !== "planned") continue;
    const rawName = (e.name ?? "").trim();
    if (!rawName) continue;
    const mapped = mapChartProcedureName(e.name);
    const treatmentName = mapped ?? rawName;
    push({
      treatment: treatmentName,
      toothFdi: e.toothFdi,
      toothLabel: fdiToLabel(e.toothFdi),
      surfaces: [...(e.surfaces ?? [])],
      source: "chart",
      hint: mapped
        ? `Examination: “${e.name}” → ${treatmentName}`
        : `Examination: ${rawName} (T${e.toothFdi})`,
    });
  }

  return Array.from(byKey.values());
}
