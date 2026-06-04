/**
 * canvas-interaction-helpers — pure, closure-free helpers shared by the
 * useDentalCanvasInteraction hook family (state / events / persistence).
 * No React, no side effects.
 */
import {
  TEETH,
  PEDIATRIC_TEETH,
  getDefaultTreatmentSurfaces,
  ALL_ZONES
} from "../types";

/** Convert a YYYY-MM-DD date string back to the closest UI label ("1 hour" … "1 year"). */
export const dateToSinceLabel = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const diffDays = Math.round((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000);
  if (diffDays < 1) return "1 hour";
  if (diffDays <= 3) return "1 day";
  if (diffDays <= 14) return "1 week";
  if (diffDays <= 180) return "1 month";
  return "1 year";
};

export const ARCH_SCOPE_IDS = new Set([
  "RIGHT_ARCH",
  "LEFT_ARCH",
  "UPPER_ARCH",
  "LOWER_ARCH"
]);

export const SCOPE_SELECTION_LABELS = {
  UR: "Upper Right Quadrant",
  UL: "Upper Left Quadrant",
  LR: "Lower Right Quadrant",
  LL: "Lower Left Quadrant",
  RIGHT_ARCH: "Right arch",
  LEFT_ARCH: "Left arch",
  UPPER_ARCH: "Maxillary arch",
  LOWER_ARCH: "Mandibular arch"
};

/**
 * Agent / voice rows share the same clinical name — give each applied row its own key.
 * @param {object} acc
 * @param {string} preferredName
 * @returns {string}
 */
export function allocateTreatmentHistoryDetailKey(acc, preferredName) {
  const base = (preferredName && String(preferredName).trim()) || "Treatment";
  if (!acc[base]) return base;
  let i = 2;
  while (acc[`${base} (${i})`]) i += 1;
  return `${base} (${i})`;
}

/**
 * Map radiology / voice surface text to chart zones for treatment-history rows.
 * @param {string} surfaceRaw
 * @param {string} treatmentName
 * @returns {string[]}
 */
export function zonesFromAgentHistorySurface(surfaceRaw, treatmentName) {
  const fallback = () => {
    const d = [...getDefaultTreatmentSurfaces(treatmentName)];
    return d.length ? d : ["whole"];
  };
  const raw = (surfaceRaw || "").trim();
  if (!raw || /whole/i.test(raw)) return fallback();
  const s = raw.toLowerCase();
  const pairs = [
    ["occlusal", "occlusal"],
    ["buccal", "buccal"],
    ["labial", "buccal"],
    ["lingual", "lingual"],
    ["palatal", "lingual"],
    ["mesial", "mesial"],
    ["distal", "distal"],
    ["cervical", "cervical"],
    ["incisal", "occlusal"],
    ["root", "root"]
  ];
  for (const [needle, z] of pairs) {
    if (s.includes(needle)) {
      if (z === "whole" || ALL_ZONES.includes(z)) return [z];
      break;
    }
  }
  return fallback();
}

/**
 * Return the teeth array for a given patient type.
 * @param {"adult"|"pediatric"|"mixed"} type
 * @returns {object[]}
 */
export function getTeethForPatientType(type) {
  if (type === "adult") return TEETH;
  if (type === "pediatric") return PEDIATRIC_TEETH;
  return [...TEETH, ...PEDIATRIC_TEETH];
}

/**
 * Return the default selected FDI for a given patient type.
 * @param {"adult"|"pediatric"|"mixed"} type
 * @returns {string}
 */
export function getDefaultFdiForPatientType(type) {
  if (type === "adult") return "26";
  if (type === "pediatric") return "64";
  return "26";
}
