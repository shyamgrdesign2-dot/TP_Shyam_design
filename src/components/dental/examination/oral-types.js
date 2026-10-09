// ══════════════════════════════════════════════════════════════
// ORAL EXAMINATION — region-level (NOT tied to a single tooth)
// ══════════════════════════════════════════════════════════════
// Recorded against a region (a quadrant, an arch, or the whole mouth)
// rather than an individual tooth. Two kinds: soft-tissue/regional
// "findings" (observations) and regional "procedures".

export const ORAL_REGIONS = [
  { id: 'UR', label: 'UR', title: 'Upper right quadrant' },
  { id: 'UL', label: 'UL', title: 'Upper left quadrant' },
  { id: 'LR', label: 'LR', title: 'Lower right quadrant' },
  { id: 'LL', label: 'LL', title: 'Lower left quadrant' },
  { id: 'RIGHT_ARCH', label: 'R arch', title: "Patient's right arch (UR + LR)" },
  { id: 'LEFT_ARCH', label: 'L arch', title: "Patient's left arch (UL + LL)" },
  { id: 'UPPER_ARCH', label: 'Maxillary', title: 'Maxillary arch (UR + UL)' },
  { id: 'LOWER_ARCH', label: 'Mandibular', title: 'Mandibular arch (LR + LL)' },
  { id: 'FULL', label: 'Full', title: 'Full mouth — all teeth' },
];

export const ORAL_REGION_LABELS = {
  UR: 'Upper Right', UL: 'Upper Left', LR: 'Lower Right', LL: 'Lower Left',
  RIGHT_ARCH: 'Right arch', LEFT_ARCH: 'Left arch',
  UPPER_ARCH: 'Maxillary', LOWER_ARCH: 'Mandibular', FULL: 'Full mouth',
};

// Oral findings, grouped the way a clinician thinks about the whole oral cavity:
// periodontal (maps to teeth), soft-tissue/mucosa (oral sites), and functional.
export const ORAL_FINDING_GROUPS = [
  { group: 'Periodontal', items: ['Gingivitis', 'Periodontitis', 'Pocket Depth', 'Gingival Recession', 'Bleeding on Probing', 'Calculus', 'Plaque'] },
  { group: 'Soft tissue / Mucosa', items: ['Ulcer', 'Swelling', 'Pigmentation', 'White Patch', 'Red Patch', 'Coating', 'Mucosal Lesion'] },
  { group: 'Functional', items: ['Restricted Mouth Opening', 'TMJ Click / Pain', 'Poor Oral Hygiene', 'Xerostomia (Dry Mouth)', 'Speech / Swallowing Difficulty', 'Halitosis'] },
];

export const ORAL_PROCEDURE_GROUPS = [
  { group: 'Periodontal / Surgical', items: ['Scaling & Polishing', 'Root Planing', 'LANAP', 'Flap Surgery', 'Gingivectomy', 'Operculectomy', 'Crown Lengthening', 'Depigmentation', 'Photodynamic Therapy', 'Full-Mouth Pocket Disinfection', 'Bone Graft'] },
  { group: 'Soft tissue', items: ['Frenectomy', 'Vestibuloplasty', 'Tori Removal', 'Biopsy', 'Cyst Enucleation'] },
  { group: 'Prosthetic / Appliance', items: ['Complete Denture', 'Partial Denture', 'Night Guard', 'Teeth Splinting'] },
];

// Flat lists (dedup / iteration helpers).
export const ORAL_FINDINGS = ORAL_FINDING_GROUPS.flatMap((g) => [...g.items]);
export const ORAL_PROCEDURES = ORAL_PROCEDURE_GROUPS.flatMap((g) => [...g.items]);

// Site/Location options for an oral finding/procedure row. A row can carry any
// mix of: a distribution marker, an oral anatomical site (soft tissue), a tooth region
// (which highlights those teeth), and a tooth surface.
export const ORAL_POSITION_GROUPS = [
  { group: 'Distribution', items: [
    { id: 'WHOLE', label: 'Whole mouth' }, { id: 'GENERALIZED', label: 'Generalized' }, { id: 'LOCALIZED', label: 'Localized' },
  ] },
  { group: 'Oral sites', items: [
    { id: 'gingiva', label: 'Gingiva' }, { id: 'buccal_mucosa', label: 'Buccal mucosa' },
    { id: 'tongue', label: 'Tongue' }, { id: 'floor_mouth', label: 'Floor of mouth' },
    { id: 'hard_palate', label: 'Hard palate' }, { id: 'soft_palate', label: 'Soft palate' },
    { id: 'upper_lip', label: 'Upper lip' }, { id: 'lower_lip', label: 'Lower lip' },
    { id: 'vestibule', label: 'Vestibule' }, { id: 'labial_mucosa', label: 'Labial mucosa' },
    { id: 'tmj', label: 'TMJ' },
  ] },
  { group: 'Tooth regions', items: [
    { id: 'FULL', label: 'Full mouth' },
    { id: 'UPPER_ARCH', label: 'Maxillary' }, { id: 'LOWER_ARCH', label: 'Mandibular' },
    { id: 'UR', label: 'Upper Right' }, { id: 'UL', label: 'Upper Left' },
    { id: 'LR', label: 'Lower Right' }, { id: 'LL', label: 'Lower Left' },
    { id: 'RIGHT_ARCH', label: 'Right arch' }, { id: 'LEFT_ARCH', label: 'Left arch' },
  ] },
  { group: 'Tooth surfaces', items: [
    { id: 'mesial', label: 'Mesial' }, { id: 'distal', label: 'Distal' },
    { id: 'buccal', label: 'Buccal / Labial' }, { id: 'lingual', label: 'Lingual / Palatal' },
    { id: 'occlusal', label: 'Occlusal / Incisal' }, { id: 'cervical', label: 'Cervical' },
    { id: 'root', label: 'Root' },
  ] },
];

export const ORAL_POSITION_LABEL = Object.fromEntries(
  ORAL_POSITION_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label]))
);

// Maps masters/oral-areas API codes → this module's stable internal IDs,
// keeping reconciliation + 3D-highlighting logic unchanged.
export const ORAL_AREA_API_CODE_TO_ID = {
  whole_mouth: 'WHOLE', generalized: 'GENERALIZED', localized: 'LOCALIZED',
  full_mouth: 'FULL', maxillary: 'UPPER_ARCH', mandibular: 'LOWER_ARCH',
  upper_right: 'UR', upper_left: 'UL', lower_right: 'LR', lower_left: 'LL',
  right_arch: 'RIGHT_ARCH', left_arch: 'LEFT_ARCH',
  gingiva: 'gingiva', buccal_mucosa: 'buccal_mucosa', tongue: 'tongue',
  floor_of_mouth: 'floor_mouth', hard_palate: 'hard_palate', soft_palate: 'soft_palate',
  upper_lip: 'upper_lip', lower_lip: 'lower_lip', vestibule: 'vestibule',
  labial_mucosa: 'labial_mucosa', tmj: 'tmj',
  mesial: 'mesial', distal: 'distal', buccal_labial: 'buccal', lingual_palatal: 'lingual',
  occlusal_incisal: 'occlusal', cervical: 'cervical', root: 'root',
};

const ORAL_LABEL_TO_ID = Object.fromEntries(
  Object.entries(ORAL_POSITION_LABEL).map(([id, label]) => [label.trim().toLowerCase(), id]),
);

/** Normalize one oral area/surface token to a stable internal id (API code, id, or label). */
export function normalizeOralSurfaceToken(surface) {
  const raw = String(surface ?? "").trim();
  if (!raw) return "";

  const underscored = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (ORAL_AREA_API_CODE_TO_ID[underscored]) {
    return ORAL_AREA_API_CODE_TO_ID[underscored];
  }

  if (ORAL_POSITION_LABEL[raw]) return raw;

  const upper = raw.toUpperCase();
  if (ORAL_POSITION_LABEL[upper]) return upper;

  const byLabel = ORAL_LABEL_TO_ID[raw.toLowerCase()];
  if (byLabel) return byLabel;

  const lower = raw.toLowerCase();
  if (ORAL_POSITION_LABEL[lower]) return lower;

  const idMatch = Object.keys(ORAL_POSITION_LABEL).find((id) => id.toLowerCase() === lower);
  if (idMatch) return idMatch;

  return raw;
}

/** Normalize and dedupe oral area/surface ids from API payloads or canvas state. */
export function normalizeOralSurfaceIds(surfaces) {
  if (!Array.isArray(surfaces)) return [];
  const out = [];
  const seen = new Set();
  surfaces.forEach((surface) => {
    const id = normalizeOralSurfaceToken(surface);
    if (!id) return;
    const key = id.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(id);
  });
  return out;
}

export function buildOralPositionGroupsFromApi(apiItems) {
  if (!Array.isArray(apiItems) || apiItems.length === 0) return ORAL_POSITION_GROUPS;
  return apiItems.map((g) => ({
    group: g.group,
    items: (g.picks || []).map((p) => ({
      id: ORAL_AREA_API_CODE_TO_ID[p.code] ?? p.code,
      label: p.label,
    })),
  }));
}

// Compact labels for the LOCATION pills inside the table cell
export const ORAL_POSITION_SHORT = {
  WHOLE: 'Whole mouth', GENERALIZED: 'Gen.', LOCALIZED: 'Local.',
  gingiva: 'Gingiva', buccal_mucosa: 'Buccal muc.', tongue: 'Tongue',
  floor_mouth: 'Floor', hard_palate: 'Hard pal.', soft_palate: 'Soft pal.',
  upper_lip: 'Upper lip', lower_lip: 'Lower lip', vestibule: 'Vestibule',
  labial_mucosa: 'Labial muc.', tmj: 'TMJ',
  UPPER_ARCH: 'Max.', LOWER_ARCH: 'Mand.', UR: 'UR', UL: 'UL', LR: 'LR', LL: 'LL',
  RIGHT_ARCH: 'R-arch', LEFT_ARCH: 'L-arch', FULL: 'Full mouth',
  mesial: 'M', distal: 'D', buccal: 'B/La', lingual: 'L/P',
  occlusal: 'O/I', cervical: 'Cerv.', root: 'Root',
};

export function oralPositionShort(id, labelMap = ORAL_POSITION_LABEL) {
  return ORAL_POSITION_SHORT[id] || labelMap[id] || id;
}

// Distribution markers. Mutually exclusive.
const ORAL_DISTRIBUTION_IDS = ['WHOLE', 'GENERALIZED', 'LOCALIZED'];
// Tooth-arch / quadrant regions (everything except the "FULL" all-teeth marker).
const ORAL_TOOTH_REGION_IDS = ['UR', 'UL', 'LR', 'LL', 'RIGHT_ARCH', 'LEFT_ARCH', 'UPPER_ARCH', 'LOWER_ARCH'];

/**
 * Real-world clinical reconcile for the LOCATION multi-select.
 */
export function reconcileOralPositions(current, id) {
  const set = new Set(current);
  if (set.has(id)) {
    set.delete(id);
    return [...set];
  }

  if (id === 'WHOLE') return ['WHOLE']; // whole mouth = nothing else needed

  if (id === 'GENERALIZED' || id === 'LOCALIZED') {
    ORAL_DISTRIBUTION_IDS.forEach((d) => set.delete(d));
    set.add(id);
    return [...set];
  }

  // Any concrete site / region / surface can't coexist with "Whole mouth".
  set.delete('WHOLE');

  if (id === 'FULL') {
    ORAL_TOOTH_REGION_IDS.forEach((r) => set.delete(r));
    set.add('FULL');
    return [...set];
  }
  if (ORAL_TOOTH_REGION_IDS.includes(id)) set.delete('FULL');

  set.add(id);
  return [...set];
}

// Positions that map to a set of teeth (so they highlight the 3D model).
const ORAL_REGION_POSITION_IDS = new Set([
  'WHOLE', 'GENERALIZED', 'FULL', 'UPPER_ARCH', 'LOWER_ARCH', 'UR', 'UL', 'LR', 'LL', 'RIGHT_ARCH', 'LEFT_ARCH',
]);

export function isOralRegionPosition(id) {
  return ORAL_REGION_POSITION_IDS.has(id);
}
