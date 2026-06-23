// Canonical rendering-intent tokens — stable identifiers the 3D model checks
// against. Prefixed so raw backend strings can never accidentally match.
export const VISUAL_TYPE = Object.freeze({
  IMPLANT: "VISUAL_IMPLANT",
  RCT:     "VISUAL_RCT",
  CROWN:   "VISUAL_CROWN",
  BRIDGE:  "VISUAL_BRIDGE",
  DENTURE: "VISUAL_DENTURE",
  MISSING: "VISUAL_MISSING", // covers both Missing and Extraction
});

// Lowercase name → VISUAL_TYPE. Add rows here when backend sends new variants.
const SYNONYMS = {
  // Implant
  "implant":                   VISUAL_TYPE.IMPLANT,
  "implant placement":         VISUAL_TYPE.IMPLANT,
  "dental implant":            VISUAL_TYPE.IMPLANT,
  "implant fixture":           VISUAL_TYPE.IMPLANT,

  // Root canal treatment
  "rct":                       VISUAL_TYPE.RCT,
  "root canal":                VISUAL_TYPE.RCT,
  "root canal treatment":      VISUAL_TYPE.RCT,
  "root canal therapy":        VISUAL_TYPE.RCT,
  "endodontic treatment":      VISUAL_TYPE.RCT,
  "pulpectomy":                VISUAL_TYPE.RCT,

  // Crown
  "crown":                     VISUAL_TYPE.CROWN,
  "dental crown":              VISUAL_TYPE.CROWN,
  "zirconia crown":            VISUAL_TYPE.CROWN,
  "crown (zirconia)":          VISUAL_TYPE.CROWN,
  "pfm crown":                 VISUAL_TYPE.CROWN,
  "metal crown":               VISUAL_TYPE.CROWN,
  "e-max crown":               VISUAL_TYPE.CROWN,
  "ceramic crown":             VISUAL_TYPE.CROWN,
  "crown prep":                VISUAL_TYPE.CROWN,
  "cap":                       VISUAL_TYPE.CROWN,

  // Bridge
  "bridge":                    VISUAL_TYPE.BRIDGE,
  "dental bridge":             VISUAL_TYPE.BRIDGE,
  "fixed partial denture":     VISUAL_TYPE.BRIDGE,
  "fpd":                       VISUAL_TYPE.BRIDGE,
  "bridge prep":               VISUAL_TYPE.BRIDGE,
  "zirconia bridge":           VISUAL_TYPE.BRIDGE,

  // Denture
  "denture":                   VISUAL_TYPE.DENTURE,
  "full denture":              VISUAL_TYPE.DENTURE,
  "partial denture":           VISUAL_TYPE.DENTURE,
  "complete denture":          VISUAL_TYPE.DENTURE,
  "removable partial denture": VISUAL_TYPE.DENTURE,

  // Missing / Extraction — same visual treatment
  "missing":                   VISUAL_TYPE.MISSING,
  "extraction":                VISUAL_TYPE.MISSING,
  "tooth extraction":          VISUAL_TYPE.MISSING,
  "exodontia":                 VISUAL_TYPE.MISSING,
};

/**
 * Maps any backend procedure/diagnosis name to a canonical VISUAL_TYPE.
 * Returns null if the name has no 3D visual effect.
 * Accepts an optional dynamicMap built from backend masters data (Phase 2).
 */
export function getVisualType(name, dynamicMap) {
  if (!name || typeof name !== "string") return null;
  const key = name.toLowerCase().trim();
  const map = dynamicMap ?? SYNONYMS;
  return map[key] ?? null;
}

/**
 * Converts a Set of raw diagnosis name strings into a Set of VISUAL_TYPEs.
 * Names with no visual mapping are silently dropped.
 */
export function toVisualTypeSet(diagNamesSet, dynamicMap) {
  const out = new Set();
  for (const name of diagNamesSet) {
    const vt = getVisualType(name, dynamicMap);
    if (vt != null) out.add(vt);
  }
  return out;
}

/**
 * Phase 2: build a merged synonym map from backend masters items that carry
 * a visual_type field. Falls back to SYNONYMS for names not in masterItems.
 */
export function buildVisualTypeMap(masterItems) {
  const map = { ...SYNONYMS };
  for (const item of (masterItems ?? [])) {
    if (typeof item === "string") {
      const key = item.toLowerCase().trim();
      if (!key) continue;
      const vt = VISUAL_TYPE[item.toUpperCase()] ?? null;
      if (vt) map[key] = vt;
    } else if (item && typeof item === "object") {
      const vtKey = item.visual_type?.toUpperCase();
      const vt = vtKey ? VISUAL_TYPE[vtKey] : null;
      if (!vt) continue;
      // Map label (procedures), code, and name — all three may be stored in toothDiagnoses
      for (const field of [item.label, item.code, item.name]) {
        const key = field?.toLowerCase().trim();
        if (key) map[key] = vt;
      }
    }
  }
  return map;
}
