// ══════════════════════════════════════════════════════════════
// Entity-centric tooth entries (findings + planned procedures)
// One entry covers N surfaces — no repetition per surface.
// ══════════════════════════════════════════════════════════════

export const PROCEDURE_CATALOG = [
  "RCT",
  "Restoration",
  "Extraction",
  "Scaling",
  "Polishing",
  "Crown Prep",
  "Bridge Prep",
  "Implant Placement",
  "Pulp Cap",
  "Root Planing",
  "Veneer",
  "Composite Filling",
];

export const TREATMENT_SURFACE_RULES = {
  Implant: "whole-tooth",
  Missing: "whole-tooth",
  RCT: "whole-tooth",
  "Root Canal Treatment": "whole-tooth",
  Crown: "whole-tooth",
  "Crown Prep": "whole-tooth",
  Bridge: "whole-tooth",
  "Bridge Prep": "whole-tooth",
  Extraction: "whole-tooth",
  Veneer: "whole-tooth",
  "Pulp Cap": "whole-tooth",
  "Implant Placement": "whole-tooth",
  Denture: "whole-tooth",
  Scaling: "ask",
  Polishing: "ask",
  "Composite Filling": "ask",
  Restoration: "ask",
  "Root Planing": "ask",
  "Fluoride Treatment": "ask",
};

export function getDefaultTreatmentSurfaces(name) {
  const rule = TREATMENT_SURFACE_RULES[name] ?? "ask";
  if (rule === "whole-tooth") return ["whole"];
  if (rule === "root") return ["root"];
  return [];
}

// ponytail: all CSV FDIs resolve to the same 5 zones; extend here if per-FDI surfaces diverge
export function getSurfacesForFdi(_fdi) {
  return ["mesial", "distal", "buccal", "lingual", "occlusal"];
}

export const DIAGNOSES = [
  "Cavity/Caries",
  "Crack",
  "Fracture",
  "Erosion",
  "Abrasion",
  "Attrition",
  "Staining",
  "Plaque",
  "Calculus",
  "Restoration Defect",
  "NCCL",
  "Sensitivity",
  "Resorption",
  "Recession",
  "Normal",
];

// Tooth-level diagnoses (not tied to a specific zone/surface)
export const TOOTH_DIAGNOSES = [
  "Implant",
  "Missing",
  "RCT",
  "Crown",
  "Bridge",
  "Denture",
  "Extraction",
  "Composite Filling",
  "Scaling",
  "Polishing",
  "Veneer",
  "Pulp Cap",
  "Root Planing",
  "Fluoride Treatment",
];

// ══════════════════════════════════════════════════════════════
// DIAGNOSIS COLORS — for full dentition view tinting
// ══════════════════════════════════════════════════════════════

export const DIAGNOSIS_COLORS = {
  Crown: "#6B7280", // neutral gray
  Missing: "#EF4444", // red (the only alert/red tag)
  RCT: "#6B7280", // neutral gray
  Bridge: "#6B7280", // neutral gray
  Implant: "#6B7280", // neutral gray
  Denture: "#6B7280", // neutral gray
};
