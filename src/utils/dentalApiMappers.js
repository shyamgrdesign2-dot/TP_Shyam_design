import { toVisualTypeSet } from "./dentalVisualTypes";

const PLAN_STATUS_FROM_API = {
  DRAFT: "draft",
  ACTIVE: "active",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
};

const SERVICE_STATUS_FROM_API = {
  PLANNED: "planned",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  NO_SHOW: "no-show",
  NOT_INTERESTED: "not-interested",
  CANCELLED: "cancelled",
};

const STATUS_TO_API = {
  draft: "DRAFT",
  active: "ACTIVE",
  planned: "PLANNED",
  "in-progress": "IN_PROGRESS",
  completed: "COMPLETED",
  "no-show": "NO_SHOW",
  "not-interested": "NOT_INTERESTED",
  cancelled: "CANCELLED",
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
        // ponytail: backward compat only — never written by new code
        diagnosisNamesSet.add(h.name);
      } else {
        historyRows.push({
          id: h.id,
          name: h.name,
          surface_codes: h.surface_codes || ["whole"],
          since_date: h.since_date,
          notes: h.notes || "",
          version: h.version,
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

const getServiceTooth = (service = {}) => {
  const teeth = Array.isArray(service.teeth) ? service.teeth : [];
  return service.tooth_fdi || service.toothFdi || teeth[0] || "full-mouth";
};

export const toDentalService = (service = {}) => {
  // tooth_fdi may be an array (new) or a string (legacy)
  const rawTooth = service.tooth_fdi ?? service.toothFdi;
  const teeth = Array.isArray(rawTooth)
    ? rawTooth
    : rawTooth
    ? [String(rawTooth)]
    : Array.isArray(service.teeth) && service.teeth.length > 0
    ? service.teeth
    : ["full-mouth"];
  const toothFdi = teeth[0] || "full-mouth";
  const rate = Number(service.rate) || 0;
  const discount = Number(service.discount) || 0;
  return {
    ...service,
    id: service.id,
    planId: service.planId,
    treatment: service.treatment || service.name || "",
    teeth,
    toothFdi,
    toothLabel: toothFdi === "full-mouth" ? "Full Mouth" : `Tooth ${toothFdi}`,
    surfaces: service.surfaces || service.surface_codes || ["whole"],
    rate,
    discount,
    amount: Number(service.amount) || Math.max(0, rate - discount),
    status: fromApiServiceStatus(service.status) || "planned",
    quickVisitRecords: service.quickVisitRecords || service.quick_visit_records || [],
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

export const toDentalQvr = (qvr = {}) => ({
  id: qvr.id,
  serviceId: qvr.serviceId,
  visitDate: qvr.visitDate,
  visitTime: qvr.visitTime,
  visitType: qvr.visitType,
  doctorId: qvr.doctorId,
  status: qvr.status,
  notes: qvr.notes || "",
  version: qvr.version,
});

export const toDentalQvrRequest = (data = {}) =>
  cleanUndefined({
    visitDate: data.visitDate,
    visitTime: data.visitTime,
    doctorId: data.doctorId,
    visitType: data.visitType,
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

export const toDentalServiceRequest = (service = {}) => {
  const toothFdi = service.tooth_fdi || service.toothFdi;
  const request = cleanUndefined({
    treatment: service.treatment,
    surfaces: service.surfaces || ["whole"],
    rate: service.rate,
    discount: service.discount,
    notes: service.notes,
    status: service.status === "planned" ? undefined : toApiStatus(service.status),
    version: service.version,
  });
  const teethArr = Array.isArray(service.teeth) ? service.teeth : [];
  const normalTeeth = teethArr.filter((t) => t !== "full-mouth");
  if (normalTeeth.length > 0) {
    request.teeth = normalTeeth;
  } else if (toothFdi && toothFdi !== "full-mouth") {
    request.teeth = [String(toothFdi)];
  } else {
    request.teeth = ["full-mouth"];
  }
  return request;
};
