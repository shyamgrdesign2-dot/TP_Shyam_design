/**
 * Builds treatment-plan quick picks from (1) seeded INITIAL_TOOTH_STATE,
 * (2) live examination chart rows persisted from DentalCanvas.
 */
import { TREATMENT_NAMES, getRate } from "./treatments";
import { findProcedureCatalogItem, resolveVisitProcedure } from "../examination/types";
import { transformToothStateToApi } from "../lib/examination-helpers";
import { toDentalService } from "../../../utils/dentalApiMappers";
import { isGrowthBookFeatureOn } from "../../../utils/growthbook";
import { GB_CHIKITSALAY } from "../../../utils/constants";

export const SESSION_PENDING_PLAN_ID = "__session_pending__";

export const EXAM_CHART_STORAGE_PREFIX = "dental.exam.chart.";

/** visitProcedure pricing is Chikitsalay-only; keep non-Chikitsalay plan rates unchanged. */
function resolvePlanVisitProcedure(item) {
  if (!isGrowthBookFeatureOn(GB_CHIKITSALAY)) return undefined;
  return resolveVisitProcedure(item);
}

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
  if (fdi === "maxillary") return "Maxillary";
  if (fdi === "mandibular") return "Mandibular";
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

function diagnosesForPatient(patientId) {
  const snap = loadChartSnapshot(patientId);
  if (snap?.toothDiagnoses && Object.keys(snap.toothDiagnoses).length > 0)
    return snap.toothDiagnoses;
  return {};
}

function findingsForPatient(patientId) {
  const snap = loadChartSnapshot(patientId);
  if (snap?.findingsByTooth && Object.keys(snap.findingsByTooth).length > 0)
    return snap.findingsByTooth;
  return {};
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

  const diagMap = diagnosesForPatient(patientId);
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
  const findMap = findingsForPatient(patientId);
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

/**
 * Build treatment-plan services from examination tooth_states procedures.
 * When baselineToothStates is provided, only procedures added since baseline are included.
 */
export function getExaminationProcedureKey(toothCode, proc = {}) {
  const id = String(proc.id ?? "").trim();
  if (id) return `id:${toothCode}::${id}`;

  const name = String(proc.name ?? "").trim().toLowerCase();
  const surfaces = [...(proc.surface_codes || proc.surfaces || [])]
    .map(String)
    .sort()
    .join(",");
  return `svc:${toothCode}::${name}::${surfaces}`;
}

export function collectExaminationProcedureKeys(toothStates = []) {
  const keys = new Set();
  for (const tooth of toothStates) {
    const toothCode = String(tooth?.tooth_code ?? "").trim();
    if (!toothCode) continue;
    for (const proc of tooth.procedures || []) {
      keys.add(getExaminationProcedureKey(toothCode, proc));
    }
  }
  return keys;
}

export function filterNewExaminationProcedures(
  currentToothStates = [],
  baselineToothStates = [],
) {
  const baselineKeys = collectExaminationProcedureKeys(baselineToothStates);
  const fresh = [];

  for (const tooth of currentToothStates) {
    const toothCode = String(tooth?.tooth_code ?? "").trim();
    if (!toothCode) continue;
    for (const proc of tooth.procedures || []) {
      if (!baselineKeys.has(getExaminationProcedureKey(toothCode, proc))) {
        fresh.push({ toothCode, proc });
      }
    }
  }
  return fresh;
}

export function toPlanServiceFromProcedure(toothCode, proc, options = {}) {
  const { appointmentId, procedureItems } = options;
  const rawName = String(proc.name ?? "").trim();
  if (!rawName) return null;

  const treatment = mapChartProcedureName(rawName) ?? rawName;
  let visitProcedure = resolvePlanVisitProcedure(proc);
  if (!visitProcedure && procedureItems?.length) {
    const match =
      findProcedureCatalogItem(procedureItems, rawName) ||
      findProcedureCatalogItem(procedureItems, treatment);
    visitProcedure = resolvePlanVisitProcedure(match);
  }
  const rate = visitProcedure?.price ?? getRate(treatment);
  const discount =
    visitProcedure?.discount != null ? visitProcedure.discount : 0;
  const discountType =
    visitProcedure?.discountType === "percentage" ? "percentage" : "flat";

  return {
    treatment: visitProcedure?.procedureName || treatment,
    teeth: [toothCode],
    surfaces: proc.surface_codes?.length ? proc.surface_codes : ["whole"],
    rate,
    discount,
    discountType,
    notes: proc.notes || undefined,
    procedureDate: proc.procedure_date || undefined,
    tatvaProcedureId: proc.id || undefined,
    appointmentId: appointmentId || undefined,
    visitProcedure: visitProcedure || undefined,
    status: "planned",
  };
}

export function buildPlanServicesFromToothStates(toothStates = [], options = {}) {
  const { appointmentId, baselineToothStates, procedureItems } = options;
  const procedureEntries =
    baselineToothStates != null
      ? filterNewExaminationProcedures(toothStates, baselineToothStates)
      : toothStates.flatMap((tooth) => {
          const toothCode = String(tooth?.tooth_code ?? "").trim();
          if (!toothCode) return [];
          return (tooth.procedures || []).map((proc) => ({ toothCode, proc }));
        });

  const services = [];
  for (const { toothCode, proc } of procedureEntries) {
    const service = toPlanServiceFromProcedure(toothCode, proc, {
      appointmentId,
      procedureItems,
    });
    if (service) services.push(service);
  }
  return services;
}

export function getPlanServiceDedupKey(service = {}) {
  if (service.tatvaProcedureId) return `id:${service.tatvaProcedureId}`;
  const teeth = (service.teeth || (service.toothFdi ? [service.toothFdi] : []))
    .map(String)
    .sort()
    .join(",");
  const surfaces = [...(service.surfaces || [])].map(String).sort().join(",");
  return `svc:${teeth}::${String(service.treatment || "").toLowerCase()}::${surfaces}`;
}

function toDisplayPendingService(service) {
  const normalized = toDentalService(service);
  return {
    ...normalized,
    id:
      service.tatvaProcedureId ||
      normalized.id ||
      `pending-${getPlanServiceDedupKey(service)}`,
    isSessionPending: true,
  };
}

function planServiceToRequest(service) {
  const teeth = service.teeth?.length
    ? service.teeth
    : service.toothFdi
      ? [String(service.toothFdi)]
      : ["full-mouth"];
  return {
    treatment: service.treatment,
    teeth,
    surfaces: service.surfaces?.length ? service.surfaces : ["whole"],
    rate: service.rate,
    discount: service.discount,
    discountType: service.discountType || "flat",
    notes: service.notes,
    procedureDate: service.procedureDate || service.procedure_date,
    tatvaProcedureId: service.tatvaProcedureId,
    appointmentId: service.appointmentId,
    visitProcedure: isGrowthBookFeatureOn(GB_CHIKITSALAY)
      ? service.visitProcedure
      : undefined,
  };
}

export function buildSessionPendingPlanServices(
  toothStateMap = {},
  baselineToothStateMap = {},
  options = {},
) {
  const toothStates = transformToothStateToApi(toothStateMap);
  const baselineToothStates = transformToothStateToApi(baselineToothStateMap || {});
  return buildPlanServicesFromToothStates(toothStates, {
    ...options,
    baselineToothStates,
  });
}

/** Oral exam procedure key — mirrors dental getExaminationProcedureKey. */
export function getOralExaminationProcedureKey(entry = {}) {
  const id = String(entry.id ?? "").trim();
  if (id) return `id:oral::${id}`;

  const name = String(entry.name ?? "").trim().toLowerCase();
  const surfaces = [...(entry.surfaces || entry.area || [])]
    .map(String)
    .sort()
    .join(",");
  return `svc:oral::${name}::${surfaces}`;
}

export function collectOralExaminationProcedureKeys(entries = []) {
  const keys = new Set();
  for (const entry of entries) {
    if (entry?.kind && entry.kind !== "procedure") continue;
    keys.add(getOralExaminationProcedureKey(entry));
  }
  return keys;
}

export function filterNewOralExaminationProcedures(
  currentEntries = [],
  baselineEntries = [],
) {
  const baselineKeys = collectOralExaminationProcedureKeys(baselineEntries);
  const fresh = [];

  for (const entry of currentEntries) {
    if (entry?.kind !== "procedure") continue;
    if (!baselineKeys.has(getOralExaminationProcedureKey(entry))) {
      fresh.push(entry);
    }
  }
  return fresh;
}

function normalizeOralSurfacesForPlan(surfaces = []) {
  const ids = (surfaces || []).map((s) => String(s).toUpperCase());
  if (
    !ids.length ||
    ids.some((s) => s === "WHOLE" || s === "GENERALIZED" || s === "FULL")
  ) {
    return ["whole"];
  }
  return (surfaces || []).map(String);
}

/** Map oral region surfaces to plan teeth scope (full-mouth / maxillary / mandibular). */
function teethFromOralSurfaces(surfaces = []) {
  const ids = (surfaces || []).map((s) => String(s).toUpperCase());
  const hasMaxillary = ids.some(
    (s) => s === "UPPER_ARCH" || s === "MAXILLARY",
  );
  const hasMandibular = ids.some(
    (s) => s === "LOWER_ARCH" || s === "MANDIBULAR",
  );
  if (hasMaxillary && !hasMandibular) return ["maxillary"];
  if (hasMandibular && !hasMaxillary) return ["mandibular"];
  return ["full-mouth"];
}

/**
 * Build a treatment-plan service from an oral examination procedure entry.
 * Teeth scope comes from oral region (full-mouth / maxillary / mandibular).
 */
export function toPlanServiceFromOralProcedure(entry, options = {}) {
  const { appointmentId, procedureItems } = options;
  const rawName = String(entry?.name ?? "").trim();
  if (!rawName) return null;

  const treatment = mapChartProcedureName(rawName) ?? rawName;
  let visitProcedure =
    resolvePlanVisitProcedure(entry) || resolvePlanVisitProcedure(entry?.visitProcedure);
  if (!visitProcedure && procedureItems?.length) {
    const match =
      findProcedureCatalogItem(procedureItems, rawName) ||
      findProcedureCatalogItem(procedureItems, treatment);
    visitProcedure = resolvePlanVisitProcedure(match);
  }
  const rate = visitProcedure?.price ?? getRate(treatment);
  const discount =
    visitProcedure?.discount != null ? visitProcedure.discount : 0;
  const discountType =
    visitProcedure?.discountType === "percentage" ? "percentage" : "flat";
  const oralSurfaces = entry.surfaces || entry.area || [];

  return {
    treatment: visitProcedure?.procedureName || treatment,
    teeth: teethFromOralSurfaces(oralSurfaces),
    surfaces: normalizeOralSurfacesForPlan(oralSurfaces),
    rate,
    discount,
    discountType,
    notes: entry.note || entry.notes || undefined,
    procedureDate: entry.since || entry.procedure_date || undefined,
    tatvaProcedureId: entry.id || undefined,
    appointmentId: appointmentId || undefined,
    visitProcedure: visitProcedure || undefined,
    status: "planned",
  };
}

/**
 * Build pending plan services from oral canvas/API procedure entries.
 * When baselineOralEntries is provided, only procedures added since baseline are included.
 */
export function buildSessionPendingPlanServicesFromOral(
  oralEntries = [],
  baselineOralEntries = [],
  options = {},
) {
  const { appointmentId, procedureItems } = options;
  const procedureEntries =
    baselineOralEntries != null
      ? filterNewOralExaminationProcedures(oralEntries, baselineOralEntries)
      : (oralEntries || []).filter((e) => e?.kind === "procedure");

  const services = [];
  for (const entry of procedureEntries) {
    const service = toPlanServiceFromOralProcedure(entry, {
      appointmentId,
      procedureItems,
    });
    if (service) services.push(service);
  }
  return services;
}

export function buildPlanNameForService(service, planDateLabel) {
  const dateLabel = planDateLabel || new Date().toISOString().slice(0, 10);
  return `${service.treatment} ${dateLabel}`;
}

function getExistingPlanServiceKeys(plans = []) {
  const keys = new Set();
  for (const plan of plans) {
    for (const service of plan.services || []) {
      keys.add(getPlanServiceDedupKey(service));
    }
  }
  return keys;
}

export function mergePendingIntoDraftPlans(
  plans = [],
  pendingServices = [],
  { planDateLabel } = {},
) {
  if (!pendingServices.length) return plans;

  const dateLabel = planDateLabel || new Date().toISOString().slice(0, 10);
  const existingKeys = getExistingPlanServiceKeys(plans);

  const virtualPlans = pendingServices
    .filter((service) => !existingKeys.has(getPlanServiceDedupKey(service)))
    .map((service, index) => ({
      id: `${SESSION_PENDING_PLAN_ID}${service.tatvaProcedureId || index}`,
      name: buildPlanNameForService(service, dateLabel),
      status: "draft",
      services: [toDisplayPendingService(service)],
      isSessionPending: true,
    }));

  if (!virtualPlans.length) return plans;
  return [...virtualPlans, ...plans];
}

export function buildSessionPlanCreatePayloads({
  plans = [],
  pendingServices = [],
  planDateLabel,
} = {}) {
  if (!pendingServices.length) return [];

  const dateLabel = planDateLabel || new Date().toISOString().slice(0, 10);
  const existingKeys = getExistingPlanServiceKeys(plans);

  return pendingServices
    .filter((service) => !existingKeys.has(getPlanServiceDedupKey(service)))
    .map((service) => ({
      name: buildPlanNameForService(service, dateLabel),
      services: [planServiceToRequest(service)],
    }));
}
