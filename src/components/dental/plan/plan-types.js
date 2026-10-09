/**
 * plan-types.ts — Type definitions for the Treatment Plan module.
 *
 * Hierarchy: TreatmentPlan → PlanService → SittingRecord / SubProcedure
 * Lifecycle:  Draft → Active (1 at a time) → In Progress → Completed
 */

// ─── Core Entities ──────────────────────────────────────────

/** Saved when a visit is ended from RxPad with plan + treatment context in the URL. */

export const SURFACE_OPTIONS = [
  { id: "whole", label: "Whole Tooth", abbr: "WT" },
  { id: "occlusal", label: "Occlusal", abbr: "O" },
  { id: "buccal", label: "Buccal", abbr: "B" },
  { id: "lingual", label: "Lingual", abbr: "L" },
  { id: "mesial", label: "Mesial", abbr: "M" },
  { id: "distal", label: "Distal", abbr: "D" },
  { id: "cervical", label: "Cervical", abbr: "C" },
  { id: "root", label: "Root", abbr: "R" },
];

export const SURFACE_COLORS = {
  whole: "#34d399",
  occlusal: "#14b8a6",
  buccal: "#f97316",
  lingual: "#8b5cf6",
  mesial: "#eab308",
  distal: "#2563eb",
  cervical: "#ec4899",
  root: "#65a30d",
};

export const SURFACE_ABBR = Object.fromEntries(
  SURFACE_OPTIONS.map((option) => [option.id, option.abbr]),
);

export function getPlanSurfaceLabel(surfaceId) {
  const opt = SURFACE_OPTIONS.find((o) => o.id === surfaceId);
  if (opt) return opt.label;
  if (typeof surfaceId === "string" && surfaceId.length > 0)
    return surfaceId.charAt(0).toUpperCase() + surfaceId.slice(1);
  return String(surfaceId);
}

const WHOLE_TOOTH_TREATMENTS = new Set([
  "Root Canal Treatment",
  "Pulp Capping",
  "Crown (PFM)",
  "Crown (Zirconia)",
  "Crown (All-Ceramic)",
  "Bridge (per unit)",
  "Complete Denture",
  "Partial Denture",
  "Veneers",
  "Extraction",
  "Surgical Extraction",
  "Wisdom Tooth Removal",
  "Implant (Single)",
  "Implant Crown",
  "Bone Grafting",
  "Apicoectomy",
  "Fluoride Application",
]);

export function getDefaultPlanSurfaces(treatmentName) {
  return WHOLE_TOOTH_TREATMENTS.has(treatmentName) ? ["whole"] : [];
}

// ─── Drawer State ───────────────────────────────────────────

// ─── Reducer Actions ────────────────────────────────────────

// ─── Tab IDs ────────────────────────────────────────────────

// ─── Plan State (for context) ───────────────────────────────

// ─── Helper: generate unique ID ─────────────────────────────

let _counter = 0;
export function genId(prefix = "id") {
  _counter += 1;
  return `${prefix}-${Date.now()}-${_counter}`;
}
