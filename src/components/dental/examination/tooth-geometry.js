import { ASSETS } from "../../../assets";

// ══════════════════════════════════════════════════════════════
// ZONE SYSTEM — varies by tooth position
// ══════════════════════════════════════════════════════════════

export const ALL_ZONES = [
  "occlusal",
  "buccal",
  "lingual",
  "mesial",
  "distal",
  "cervical",
  "root",
];

// Zone display names change based on tooth type and arch:
// - Teeth 1-3 (incisors): "Occlusal" → "Incisal"
// - Teeth 4-8 (premolars/molars): "Labial" → "Buccal"
// - Teeth 1-3 (incisors): the outer surface is "Labial" (not "Buccal")
// - Upper teeth: inner surface = "Palatal" (not "Lingual")
// - Lower teeth: inner surface = "Lingual"

// Tooth-aware clinical abbreviation (e.g. "La" for labial surface of an incisor).
export function getZoneAbbr(zoneId, arch, toothNum) {
  const label = getZoneLabel(zoneId, arch, toothNum);
  switch (label) {
    case "Incisal":
      return "I";
    case "Occlusal":
      return "O";
    case "Labial":
      return "La";
    case "Buccal":
      return "B";
    case "Palatal":
      return "P";
    case "Lingual":
      return "L";
    case "Mesial":
      return "M";
    case "Distal":
      return "D";
    case "Cervical":
      return "C";
    case "Root":
      return "R";
    case "Whole Tooth":
      return "WT";
    default:
      return "?";
  }
}

export function getZoneLabel(
  zoneId,
  arch,
  toothNum, // 1-8 within quadrant
) {
  const isAnterior = toothNum <= 3; // incisors + canine

  switch (zoneId) {
    case "occlusal":
      return isAnterior ? "Incisal" : "Occlusal";
    case "buccal":
      return isAnterior ? "Labial" : "Buccal";
    case "lingual":
      return arch === "maxillary" ? "Palatal" : "Lingual";
    case "mesial":
      return "Mesial";
    case "distal":
      return "Distal";
    case "cervical":
      return "Cervical";
    case "root":
      return "Root";
    case "whole":
      return "Whole Tooth";
    default:
      return zoneId;
  }
}

// Zone colors: maximally distinct hues spread across the spectrum.
// Each pair of zones sits far apart on the color wheel so they never
// read as "the same shade" on the tooth surface.
export const ZONE_INFO = {
  occlusal: {
    label: "Occlusal",
    color: "#14b8a6",
    colorVec: [0.078, 0.722, 0.651],
    layer: "crown",
  }, // teal
  buccal: {
    label: "Buccal",
    color: "#f97316",
    colorVec: [0.976, 0.451, 0.086],
    layer: "crown",
  }, // orange
  lingual: {
    label: "Lingual",
    color: "#8b5cf6",
    colorVec: [0.545, 0.361, 0.965],
    layer: "crown",
  }, // violet
  mesial: {
    label: "Mesial",
    color: "#eab308",
    colorVec: [0.918, 0.702, 0.031],
    layer: "crown",
  }, // yellow
  distal: {
    label: "Distal",
    color: "#2563eb",
    colorVec: [0.149, 0.388, 0.922],
    layer: "crown",
  }, // blue
  cervical: {
    label: "Cervical",
    color: "#ec4899",
    colorVec: [0.925, 0.282, 0.6],
    layer: "cervical",
  }, // pink
  root: {
    label: "Root",
    color: "#65a30d",
    colorVec: [0.396, 0.639, 0.051],
    layer: "root",
  }, // muted olive-green
  whole: {
    label: "Whole Tooth",
    color: "#34d399",
    colorVec: [0.204, 0.827, 0.6],
    layer: "crown",
  },
};

// ══════════════════════════════════════════════════════════════
// 32-TOOTH CATALOG — FDI notation
// ══════════════════════════════════════════════════════════════
//
// FDI system:
//   Quadrant 1: Upper Right (11-18)
//   Quadrant 2: Upper Left  (21-28)
//   Quadrant 3: Lower Left  (31-38)
//   Quadrant 4: Lower Right (41-48)
//
// Within each quadrant, position 1-8:
//   1 = Central Incisor
//   2 = Lateral Incisor
//   3 = Canine
//   4 = First Premolar
//   5 = Second Premolar
//   6 = First Molar
//   7 = Second Molar
//   8 = Third Molar (Wisdom)
//
// We have OBJ models for left side (UL = quadrant 2, LL = quadrant 3).
// Right side (quadrants 1 and 4) are mirrors of the left side.

const TOOTH_NAMES = {
  1: { name: "Central Incisor", type: "incisor" },
  2: { name: "Lateral Incisor", type: "incisor" },
  3: { name: "Canine", type: "canine" },
  4: { name: "First Premolar", type: "premolar" },
  5: { name: "Second Premolar", type: "premolar" },
  6: { name: "First Molar", type: "molar" },
  7: { name: "Second Molar", type: "molar" },
  8: { name: "Third Molar", type: "molar" },
};

// Model mapping: which GLB to use for each position
// Upper teeth use UL (upper left) models, lower use LL (lower left) models
const M = ASSETS.dental.models;

const UPPER_MODELS = {
  1: M.tooth11,
  2: M.tooth11, // use central incisor for lateral (closest match)
  3: M.tooth13,
  4: M.tooth14,
  5: M.tooth15,
  6: M.tooth16,
  7: M.tooth17,
  8: M.tooth18,
};

const LOWER_MODELS = {
  1: M.tooth31,
  2: M.tooth32,
  3: M.tooth33,
  4: M.tooth34,
  5: M.tooth35,
  6: M.tooth36,
  7: M.tooth37,
  8: M.tooth38,
};

function buildTeeth() {
  const teeth = [];

  // Quadrant 1: Upper Right (FDI 11-18) — mirror of upper left
  for (let pos = 1; pos <= 8; pos++) {
    const info = TOOTH_NAMES[pos];
    teeth.push({
      fdi: `1${pos}`,
      name: info.name,
      position: pos,
      quadrant: "upper-right",
      arch: "maxillary",
      type: info.type,
      modelPath: UPPER_MODELS[pos],
      mirrorX: true,
    });
  }

  // Quadrant 2: Upper Left (FDI 21-28) — original models
  for (let pos = 1; pos <= 8; pos++) {
    const info = TOOTH_NAMES[pos];
    teeth.push({
      fdi: `2${pos}`,
      name: info.name,
      position: pos,
      quadrant: "upper-left",
      arch: "maxillary",
      type: info.type,
      modelPath: UPPER_MODELS[pos],
      mirrorX: false,
    });
  }

  // Quadrant 3: Lower Left (FDI 31-38) — original models
  for (let pos = 1; pos <= 8; pos++) {
    const info = TOOTH_NAMES[pos];
    teeth.push({
      fdi: `3${pos}`,
      name: info.name,
      position: pos,
      quadrant: "lower-left",
      arch: "mandibular",
      type: info.type,
      modelPath: LOWER_MODELS[pos],
      mirrorX: false,
    });
  }

  // Quadrant 4: Lower Right (FDI 41-48) — mirror of lower left
  for (let pos = 1; pos <= 8; pos++) {
    const info = TOOTH_NAMES[pos];
    teeth.push({
      fdi: `4${pos}`,
      name: info.name,
      position: pos,
      quadrant: "lower-right",
      arch: "mandibular",
      type: info.type,
      modelPath: LOWER_MODELS[pos],
      mirrorX: true,
    });
  }

  return teeth;
}

export const TEETH = buildTeeth();

export const QUADRANT_LABELS = {
  "upper-right": "Upper Right",
  "upper-left": "Upper Left",
  "lower-left": "Lower Left",
  "lower-right": "Lower Right",
};

/** Patient coords: +X = patient's left. Mesial always points toward midline (X → 0). */
export function isPatientRightQuadrant(q) {
  return q === "upper-right" || q === "lower-right";
}

// ══════════════════════════════════════════════════════════════
// ARCH POSITIONS — place each tooth in dental arch formation
// ══════════════════════════════════════════════════════════════
//
// Dental arch follows a parabolic curve (horseshoe/U shape).
// Upper arch (maxillary) at Y=0, lower arch (mandibular) offset downward.
// Each tooth has position [x, y, z] and rotation [rx, ry, rz] in radians.
// Left side (Q2, Q3) computed first, right side (Q1, Q4) mirrored.

function computeArchPositions() {
  const result = {};

  // Tooth widths (approximate mesiodistal widths in scene units)
  const widths = {
    // Note: position 2 reuses the same GLB as position 1 (central incisor),
    // so keep similar width to prevent center-anterior overlap.
    1: 0.55,
    2: 0.45,
    3: 0.52,
    4: 0.48,
    5: 0.48,
    6: 0.68,
    7: 0.65,
    8: 0.6,
  };

  // Arch curve: z = -k * x^2 (parabola opening toward -Z)
  const kUpper = 0.12;
  const kLower = 0.14; // slightly tighter curve for lower arch
  const yLower = -1.8; // vertical offset for lower jaw

  // Compute cumulative X positions for left side (Q2 upper, Q3 lower)
  // Teeth go from midline outward: pos 1 (central incisor) → pos 8 (wisdom)
  function computeLeftSidePositions(k, yOffset, archPrefix, quadrant) {
    let cumX = 0;
    for (let pos = 1; pos <= 8; pos++) {
      const w = widths[pos];
      cumX += w / 2; // half-width to center
      const x = cumX;
      const z = -k * x * x;

      // Rotation: tooth faces outward (perpendicular to arch tangent)
      // Tangent at x: dz/dx = -2kx, so tangent angle = atan(-2kx)
      // Tooth should face outward = perpendicular to tangent
      const tangentAngle = Math.atan(-2 * k * x);
      const ry = tangentAngle; // Y rotation for outward facing

      const fdi = `${quadrant}${pos}`;
      result[fdi] = {
        position: [x, yOffset, z],
        rotation: [0, ry, 0],
      };

      cumX += w / 2; // other half-width for spacing
      cumX += 0.04; // small gap between teeth
    }
  }

  // Upper Left (Q2): positive X
  computeLeftSidePositions(kUpper, 0, "UL", "2");

  // Lower Left (Q3): positive X, lower Y
  computeLeftSidePositions(kLower, yLower, "LL", "3");

  // Mirror for right side: negate X, negate ry
  // Upper Right (Q1)
  for (let pos = 1; pos <= 8; pos++) {
    const src = result[`2${pos}`];
    result[`1${pos}`] = {
      position: [-src.position[0], src.position[1], src.position[2]],
      rotation: [src.rotation[0], -src.rotation[1], src.rotation[2]],
    };
  }

  // Lower Right (Q4)
  for (let pos = 1; pos <= 8; pos++) {
    const src = result[`3${pos}`];
    result[`4${pos}`] = {
      position: [-src.position[0], src.position[1], src.position[2]],
      rotation: [src.rotation[0], -src.rotation[1], src.rotation[2]],
    };
  }

  return result;
}

export const ARCH_POSITIONS = computeArchPositions();

// ══════════════════════════════════════════════════════════════
// PEDIATRIC DENTITION (20 Teeth)
// ══════════════════════════════════════════════════════════════

function buildPediatricTeeth() {
  const teeth = [];

  // Mapping primary positions (1-5) to adult model positions for reuse
  // 1=Central, 2=Lateral, 3=Canine, 4=First Molar (uses adult 6), 5=Second Molar (uses adult 7)
  const posMap = { 1: 1, 2: 2, 3: 3, 4: 6, 5: 7 };
  const typeMap = {
    1: "incisor",
    2: "incisor",
    3: "canine",
    4: "molar",
    5: "molar",
  };
  const nameMap = {
    1: "Central Incisor",
    2: "Lateral Incisor",
    3: "Canine",
    4: "First Molar",
    5: "Second Molar",
  };

  // Q5: Upper Right
  for (let pos = 1; pos <= 5; pos++) {
    const adultPos = posMap[pos];
    teeth.push({
      fdi: `5${pos}`,
      name: nameMap[pos],
      position: pos,
      type: typeMap[pos],
      quadrant: "upper-right",
      arch: "maxillary",
      mirrorX: true,
      modelPath: UPPER_MODELS[adultPos],
    });
  }

  // Q6: Upper Left
  for (let pos = 1; pos <= 5; pos++) {
    const adultPos = posMap[pos];
    teeth.push({
      fdi: `6${pos}`,
      name: nameMap[pos],
      position: pos,
      type: typeMap[pos],
      quadrant: "upper-left",
      arch: "maxillary",
      mirrorX: false,
      modelPath: UPPER_MODELS[adultPos],
    });
  }

  // Q7: Lower Left
  for (let pos = 1; pos <= 5; pos++) {
    const adultPos = posMap[pos];
    teeth.push({
      fdi: `7${pos}`,
      name: nameMap[pos],
      position: pos,
      type: typeMap[pos],
      quadrant: "lower-left",
      arch: "mandibular",
      mirrorX: false,
      modelPath: LOWER_MODELS[adultPos],
    });
  }

  // Q8: Lower Right
  for (let pos = 1; pos <= 5; pos++) {
    const adultPos = posMap[pos];
    teeth.push({
      fdi: `8${pos}`,
      name: nameMap[pos],
      position: pos,
      type: typeMap[pos],
      quadrant: "lower-right",
      arch: "mandibular",
      mirrorX: true,
      modelPath: LOWER_MODELS[adultPos],
    });
  }

  return teeth;
}

export const PEDIATRIC_TEETH = buildPediatricTeeth();

/** Returns deduplicated GLB paths for the given patient type (for useGLTF.preload). */
export function getModelPathsForPatientType(patientType) {
  const paths = new Set();
  const sets = patientType === "adult"
    ? [TEETH]
    : patientType === "pediatric"
    ? [PEDIATRIC_TEETH]
    : [TEETH, PEDIATRIC_TEETH];
  sets.forEach((set) => set.forEach((t) => paths.add(t.modelPath)));
  paths.add(ASSETS.dental.models.implant);
  return [...paths];
}

function computePediatricArchPositions() {
  const result = {};

  // Widths based on adult positions reused
  const widths = {
    // Pediatric pos2 also reuses the same incisor model scale in this setup.
    1: 0.55,
    2: 0.45,
    3: 0.52,
    4: 0.68,
    5: 0.65,
  };

  // Scale down curve variables slightly for smaller jaws
  const kUpper = 0.16;
  const kLower = 0.18;
  const yLower = -1.5;

  function computeLeftSidePositions(k, yOffset, quadrant) {
    let cumX = 0;
    for (let pos = 1; pos <= 5; pos++) {
      const w = widths[pos];
      cumX += w / 2;
      const x = cumX;
      const z = -k * x * x;
      const ry = Math.atan(-2 * k * x);
      result[`${quadrant}${pos}`] = {
        position: [x, yOffset, z],
        rotation: [0, ry, 0],
      };
      cumX += w / 2 + 0.04;
    }
  }

  computeLeftSidePositions(kUpper, 0, "6");
  computeLeftSidePositions(kLower, yLower, "7");

  // Mirror right side
  for (let pos = 1; pos <= 5; pos++) {
    const src6 = result[`6${pos}`];
    result[`5${pos}`] = {
      position: [-src6.position[0], src6.position[1], src6.position[2]],
      rotation: [src6.rotation[0], -src6.rotation[1], src6.rotation[2]],
    };

    const src7 = result[`7${pos}`];
    result[`8${pos}`] = {
      position: [-src7.position[0], src7.position[1], src7.position[2]],
      rotation: [src7.rotation[0], -src7.rotation[1], src7.rotation[2]],
    };
  }

  return result;
}

export const PEDIATRIC_ARCH_POSITIONS = computePediatricArchPositions();
