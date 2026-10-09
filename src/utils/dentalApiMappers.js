import { toVisualTypeSet } from "./dentalVisualTypes";
import { isGrowthBookFeatureOn } from "./growthbook";
import { GB_CHIKITSALAY } from "./constants";

/** UI scope tokens ↔ Chikitsalay API tooth codes. */
const FULL_MOUTH = "full-mouth";
const MAXILLARY = "maxillary";
const MANDIBULAR = "mandibular";
const TO_CHIKITSALAY = { [FULL_MOUTH]: "88", [MAXILLARY]: "86", [MANDIBULAR]: "87" };
const FROM_CHIKITSALAY = { "88": FULL_MOUTH, "86": MAXILLARY, "87": MANDIBULAR };

const PLAN_STATUS_FROM_API = {
  DRAFT: "draft",
  ACTIVE: "active",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
};

const SERVICE_STATUS_FROM_API = {
  PLANNED: "planned",
  YET_TO_START: "planned",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  NO_SHOW: "no-show",
  PATIENT_NO_SHOW: "no-show",
  NOT_INTERESTED: "not-interested",
  CANCELLED: "cancelled",
  REFUND: "refund",
};

const STATUS_TO_API = {
  draft: "DRAFT",
  active: "ACTIVE",
  planned: "YET_TO_START",
  "in-progress": "IN_PROGRESS",
  completed: "COMPLETED",
  "no-show": "PATIENT_NO_SHOW",
  "not-interested": "NOT_INTERESTED",
  cancelled: "CANCELLED",
  refund: "REFUND",
};

const cleanUndefined = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined));

export const getDentalApiPayload = (response) => {
  if (response && typeof response.status === "boolean" && "data" in response) {
    return response.data;
  }
  return response;
};

export const getDentalApiError = (response, fallback) =>
  response?.error || response?.message || fallback;

// Marker stored in notes field to identify serialized primary-diagnosis chips.
export const DX_MARKER = "__dx__";

export const toDentalToothState = (payload = {}) => {
  const toothState = {};
  if (!Array.isArray(payload.tooth_states)) return toothState;

  payload.tooth_states.forEach((tooth) => {
    const toothCode = String(tooth.tooth_code || "");
    if (!toothCode) return;

    // Every non-__dx__ history row is an active chip. Keep __dx__ as a read-only
    // backward-compat path for records saved before this change. Set deduplicates
    // old records that have both a __dx__ row and a real row for the same name.
    const diagnosisNamesSet = new Set();
    const historyRows = [];
    for (const h of tooth.treatment_history || []) {
      if (h.notes === DX_MARKER) {
        // backward compat only — never written by new code
        diagnosisNamesSet.add(h.name);
      } else {
        historyRows.push({
          id: h.id,
          name: h.name,
          surface_codes: h.surface_codes || ["whole"],
          since_date: h.since_date,
          notes: h.notes || "",
          version: h.version,
          ...(h.visitProcedure ? { visitProcedure: h.visitProcedure } : {}),
        });
        diagnosisNamesSet.add(h.name);
      }
    }

    toothState[toothCode] = {
      findings: (tooth.findings || []).map((finding) => ({
        id: finding.id,
        type: finding.name,
        zoneId: finding.surface_codes?.[0] || "whole",
        notes: finding.notes || "",
        since_date: finding.since_date,
        version: finding.version,
      })),
      procedures: (tooth.procedures || []).map((procedure) => ({
        id: procedure.id,
        name: procedure.name,
        surface_codes: procedure.surface_codes || ["whole"],
        procedure_date: procedure.procedure_date,
        status: procedure.status || "PLANNED",
        notes: procedure.notes || "",
        version: procedure.version,
        ...(procedure.visitProcedure ? { visitProcedure: procedure.visitProcedure } : {}),
      })),
      treatmentHistory: historyRows,
      diagnoses: [...diagnosisNamesSet],
      visualTypes: [...toVisualTypeSet(diagnosisNamesSet)],
      notes: tooth.overall_notes || "",
    };
  });

  return toothState;
};

const toApiStatus = (status) => STATUS_TO_API[status] || status;

const fromApiServiceStatus = (status) => SERVICE_STATUS_FROM_API[status] || status;

const fromApiPlanStatus = (status) => PLAN_STATUS_FROM_API[status] || status;

function isChikitsalayEnabled() {
  return isGrowthBookFeatureOn(GB_CHIKITSALAY);
}

/** Map API/UI tooth token to canonical UI scope, or null if FDI. */
function toUiScope(token) {
  if (token == null || token === "") return null;
  const t = String(token);
  if (FROM_CHIKITSALAY[t]) return FROM_CHIKITSALAY[t];
  if (t === FULL_MOUTH || t === "FULL") return FULL_MOUTH;
  if (t === MAXILLARY || t === "UPPER_ARCH") return MAXILLARY;
  if (t === MANDIBULAR || t === "LOWER_ARCH") return MANDIBULAR;
  return null;
}

function resolveScope(teeth, toothFdi) {
  for (const t of Array.isArray(teeth) ? teeth : []) {
    const scope = toUiScope(t);
    if (scope) return scope;
  }
  return toUiScope(toothFdi);
}

function fromApiTeeth(teeth) {
  const arr =
    Array.isArray(teeth) && teeth.length > 0 ? teeth.map(String) : [FULL_MOUTH];
  const scope = resolveScope(arr);
  return scope ? [scope] : arr;
}

/** When Chikitsalay is on: full-mouth→88, maxillary→86, mandibular→87. */
function toApiTeeth(teeth, toothFdi) {
  const teethArr = Array.isArray(teeth) ? teeth.map(String) : [];
  const scope = resolveScope(teethArr, toothFdi);
  if (scope) {
    return isChikitsalayEnabled() ? [TO_CHIKITSALAY[scope]] : [scope];
  }
  const normalTeeth = teethArr.filter((t) => !toUiScope(t) && !FROM_CHIKITSALAY[t]);
  if (normalTeeth.length > 0) return normalTeeth;
  const fdi = toothFdi != null && toothFdi !== "" ? String(toothFdi) : "";
  if (fdi && !toUiScope(fdi)) return [fdi];
  return isChikitsalayEnabled() ? ["88"] : [FULL_MOUTH];
}

const getServiceTooth = (service = {}) => {
  const teeth = Array.isArray(service.teeth) ? service.teeth : [];
  return service.tooth_fdi || service.toothFdi || teeth[0] || "full-mouth";
};

function toothScopeLabel(toothFdi) {
  if (toothFdi === FULL_MOUTH) return "Full Mouth";
  if (toothFdi === MAXILLARY) return "Maxillary";
  if (toothFdi === MANDIBULAR) return "Mandibular";
  return `Tooth ${toothFdi}`;
}

export const toDentalService = (service = {}) => {
  // tooth_fdi may be an array (new) or a string (legacy)
  const rawTooth = service.tooth_fdi ?? service.toothFdi;
  const rawTeeth = Array.isArray(rawTooth)
    ? rawTooth
    : rawTooth
    ? [String(rawTooth)]
    : Array.isArray(service.teeth) && service.teeth.length > 0
    ? service.teeth
    : [FULL_MOUTH];
  const teeth = fromApiTeeth(rawTeeth);
  const toothFdi = teeth[0] || FULL_MOUTH;
  const rate = Number(service.rate) || 0;
  const discount = Number(service.discount) || 0;
  const discountType = service.discountType || "flat";
  const rawVisits =
    service.sittings ||
    service.quickVisitRecords ||
    service.quick_visit_records ||
    [];
  const normalizedQvrs = rawVisits.map(toDentalQvr);

  const isArchScope = Boolean(toUiScope(toothFdi));
  const teethCount = isArchScope ? 1 : Math.max(1, teeth.length);
  const totalRate = rate * teethCount;
  
  let computedDiscount = 0;
  if (discountType === "percentage") {
    computedDiscount = Math.round((totalRate * Math.min(discount, 100)) / 100);
  } else {
    computedDiscount = Math.min(totalRate, discount);
  }

  return {
    ...service,
    id: service.id,
    planId: service.planId,
    treatment: service.treatment || service.name || "",
    teeth,
    toothFdi,
    toothLabel: toothScopeLabel(toothFdi),
    surfaces: service.surfaces || service.surface_codes || ["whole"],
    rate,
    discount,
    discountType,
    computedDiscount,
    amount: Math.max(0, totalRate - computedDiscount),
    status: fromApiServiceStatus(service.status) || "planned",
    procedureDate: service.procedureDate || service.procedure_date || "",
    tatvaProcedureId:
      service.tatvaProcedureId || service.tatva_procedure_id || undefined,
    appointmentId:
      service.appointmentId ||
      service.visitAppointmentId ||
      service.visit_appointment_id ||
      undefined,
    quickVisitRecords: normalizedQvrs,
    sittings: normalizedQvrs.map((qvr) => qvrToSitting(qvr)),
    appointmentIds: service.appointmentIds || service.appointment_ids || [],
  };
};

export const toDentalPlan = (plan = {}) => ({
  ...plan,
  id: plan.id,
  patientId: plan.patientId,
  name: plan.name || "",
  status: fromApiPlanStatus(plan.status) || "draft",
  notes: plan.notes || "",
  additionalDiscount: plan.additionalDiscount || 0,
  subTotal: plan.subTotal || 0,
  discountTotal: plan.discountTotal || 0,
  grandTotal: plan.grandTotal || 0,
  services: (plan.services || []).map(toDentalService),
});

export const toDentalPlans = (payload) => {
  const plans = Array.isArray(payload) ? payload : payload?.items || payload?.plans || [];
  return plans.map(toDentalPlan);
};

export const toDentalPlanRequest = (plan = {}) =>
  cleanUndefined({
    name: plan.name,
    notes: plan.notes,
    services: (plan.services || []).map(toDentalServiceRequest),
    additionalDiscount: plan.additionalDiscount,
  });

export const toDentalPlanPatchRequest = (patch = {}) =>
  cleanUndefined({
    name: patch.name,
    notes: patch.notes,
    additionalDiscount: patch.additionalDiscount,
    status: toApiStatus(patch.status),
    version: patch.version,
  });

export const toDentalTransitionRequest = (data = {}) =>
  cleanUndefined({
    reason: data.reason,
    version: data.version,
  });

const QVR_STATUS_FROM_API = {
  SCHEDULED: "scheduled",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
};

const QVR_STATUS_TO_API = {
  scheduled: "SCHEDULED",
  cancelled: "CANCELLED",
  completed: "COMPLETED",
  SCHEDULED: "SCHEDULED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
};

const VISIT_TYPE_TO_API = {
  "follow-up": "FOLLOW_UP",
  "follow up": "FOLLOW_UP",
  follow_up: "FOLLOW_UP",
  procedure: "PROCEDURE",
  emergency: "EMERGENCY",
  review: "REVIEW",
  FOLLOW_UP: "FOLLOW_UP",
  PROCEDURE: "PROCEDURE",
  EMERGENCY: "EMERGENCY",
  REVIEW: "REVIEW",
};

const VISIT_TYPE_UI_LABEL = {
  FOLLOW_UP: "Follow-up",
  PROCEDURE: "Procedure",
  EMERGENCY: "Emergency",
  REVIEW: "Review",
};

const toApiVisitTime = (time) => {
  if (!time) return undefined;
  const parts = String(time).trim().split(":");
  const hh = (parts[0] ?? "00").padStart(2, "0");
  const mm = (parts[1] ?? "00").padStart(2, "0");
  const ss = (parts[2] ?? "00").padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

export const toApiVisitType = (visitType) => {
  const key = String(visitType ?? "").trim();
  if (!key) return "FOLLOW_UP";
  return (
    VISIT_TYPE_TO_API[key] ||
    VISIT_TYPE_TO_API[key.toLowerCase()] ||
    VISIT_TYPE_TO_API[key.replace(/-/g, " ").toLowerCase()] ||
    "FOLLOW_UP"
  );
};

export const formatQvrVisitTypeLabel = (visitType) => {
  const api = toApiVisitType(visitType);
  return VISIT_TYPE_UI_LABEL[api] || api;
};

const toApiQvrStatus = (status) => {
  const key = String(status ?? "").trim();
  if (!key) return undefined;
  return QVR_STATUS_TO_API[key] || QVR_STATUS_TO_API[key.toLowerCase()];
};

const formatQvrTimeLabel = (time24) => {
  if (!time24) return "";
  const parts = String(time24).split(":");
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return String(time24);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const composeQvrDateTimeLabel = (visitDate, visitTime) => {
  if (!visitDate) return "";
  if (!visitTime) return String(visitDate);
  const [y, m, d] = String(visitDate).split("-").map((n) => Number(n));
  const timeParts = String(visitTime).split(":");
  const hh = Number(timeParts[0]);
  const mm = Number(timeParts[1]);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  if (!Number.isFinite(dt.getTime())) return String(visitDate);
  const datePart = dt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = dt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
};

const composeQvrIsoDateTime = (visitDate, visitTime) => {
  if (!visitDate || !visitTime) return undefined;
  const [y, m, d] = String(visitDate).split("-").map((n) => Number(n));
  const timeParts = String(visitTime).split(":");
  const hh = Number(timeParts[0]);
  const mm = Number(timeParts[1]);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  return Number.isFinite(dt.getTime()) ? dt.toISOString() : undefined;
};

export const toDentalQvr = (qvr = {}) => ({
  id: qvr.id,
  serviceId: qvr.serviceId || qvr.service_id,
  visitDate: qvr.visitDate || qvr.visit_date,
  visitTime: qvr.visitTime || qvr.visit_time,
  visitType: qvr.visitType || qvr.visit_type,
  doctorId: qvr.doctorId || qvr.doctor_id,
  doctorName: qvr.doctorName || qvr.doctor_name || "",
  status: qvr.status,
  notes: qvr.notes || "",
  version: qvr.version,
  createdAt: qvr.createdAt || qvr.created_at,
});

export const qvrToSitting = (qvr = {}, { doctorName } = {}) => {
  const visitDate = qvr.visitDate;
  const visitTime = qvr.visitTime;
  const rawStatus = String(qvr.status ?? "").trim();
  const status =
    QVR_STATUS_FROM_API[rawStatus.toUpperCase()] ||
    rawStatus.toLowerCase() ||
    "completed";

  return {
    id: qvr.id,
    date: composeQvrDateTimeLabel(visitDate, visitTime) || visitDate || "",
    time: visitTime ? formatQvrTimeLabel(visitTime) : undefined,
    doctor: doctorName || qvr.doctorName || "",
    visitType: toApiVisitType(qvr.visitType),
    notes: qvr.notes || "",
    status,
    createdAt: composeQvrIsoDateTime(visitDate, visitTime) || qvr.createdAt,
    version: qvr.version,
    doctorId: qvr.doctorId,
    visitDate,
    visitTime,
  };
};

export const toDentalQvrRequest = (data = {}) =>
  cleanUndefined({
    visitDate: data.visitDate,
    visitTime: data.visitTime ? toApiVisitTime(data.visitTime) : undefined,
    doctorId: data.doctorId,
    visitType: data.visitType ? toApiVisitType(data.visitType) : undefined,
    status: data.status ? toApiQvrStatus(data.status) : undefined,
    notes: data.notes,
    version: data.version,
  });

export const toDentalTemplate = (raw = {}) => ({
  id: raw.id,
  name: raw.name || "",
  type: raw.type || "",
  createdAt: raw.createdAt || raw.created_at,
  updatedAt: raw.updatedAt || raw.updated_at,
  payload: raw.payload ?? raw,
});

export const toDentalTemplates = (response) => {
  const items = Array.isArray(response) ? response : response?.items || [];
  return items.map(toDentalTemplate);
};

// Patch mapper for status/field updates — never defaults surfaces or teeth,
// and never suppresses "planned" (valid for revert-to-not-started).
export const toDentalServicePatchRequest = (data = {}) => {
  const patch = {};
  if (data.status !== undefined) patch.status = toApiStatus(data.status);
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.version !== undefined) patch.version = data.version;
  if (data.completedAt != null) patch.completed_at = data.completedAt;
  if (data.rate !== undefined) patch.rate = data.rate;
  if (data.discount !== undefined) patch.discount = data.discount;
  if (data.discountType !== undefined) {
    patch.discountType = data.discountType;
  }
  if (data.procedureDate || data.procedure_date) {
    patch.procedure_date = data.procedureDate || data.procedure_date;
  }
  if (data.treatment) patch.treatment = data.treatment;
  if (data.surfaces?.length) patch.surfaces = data.surfaces;
  if (Array.isArray(data.teeth) && data.teeth.length) {
    patch.teeth = toApiTeeth(data.teeth, data.tooth_fdi || data.toothFdi);
  }
  return patch;
};

export const toDentalServiceRequest = (service = {}) => {
  const toothFdi = service.tooth_fdi || service.toothFdi;
  const request = cleanUndefined({
    treatment: service.treatment,
    surfaces: service.surfaces || ["whole"],
    rate: service.rate,
    discount: service.discount,
    discountType: service.discountType || undefined,
    notes: service.notes,
    procedure_date: service.procedureDate || service.procedure_date || undefined,
    status: service.status === "planned" ? undefined : toApiStatus(service.status),
    version: service.version,
    appointmentId: service.appointmentId,
    tatvaProcedureId: service.tatvaProcedureId,
    visitProcedure: service.visitProcedure,
  });
  request.teeth = toApiTeeth(service.teeth, toothFdi);
  return request;
};
