import { isMobile, isTablet } from "react-device-detect";
import { TEETH, getZoneLabel } from "../components/dental/examination/types";
import { trackEvent, getClinic, isIPad } from "./utils";

export const DENTAL_MOENGAGE_EVENTS = {
  CTA_CLICKED: "TP_DM_DentalExamination_CTA_Clicked",
  MODULE_OPENED: "TP_DM_DentalModule_Opened",
  CHART_VIEWED: "TP_DM_DentalChart_Viewed",
  CHART_ROTATED: "TP_DM_DentalChart_Rotated",
  CHART_PRINT_CLICKED: "TP_DM_DentalChart_PrintClicked",
  CHART_PRINT_TYPE_SELECTED: "TP_DM_DentalChart_PrintType_Selected",
  CHART_PATIENT_INFO_TOGGLED: "TP_DM_DentalChart_PatientInfo_Toggled",
  CHART_PRINT_STARTED: "TP_DM_DentalChart_PrintStarted",
  TOOTH_HOVERED: "TP_DM_Tooth_Hovered",
  TOOTH_SELECTED: "TP_DM_Tooth_Selected",
  TOOTH_VIEW_OPENED: "TP_DM_ToothView_Opened",
  TOOTH_EXPANDED_OPENED: "TP_DM_ToothExpandedView_Opened",
  TOOTH_EXPANDED_MINIMIZED: "TP_DM_ToothExpandedView_Minimized",
  TOOTH_SECTION_EXPANDED: "TP_DM_ToothSection_Expanded",
  SURFACE_SELECTED: "TP_DM_Surface_Selected",
  TOOTH_PAST_PROCEDURE_ADDED: "TP_DM_ToothPastProcedure_Added",
  TOOTH_PAST_PROCEDURE_UPDATED: "TP_DM_ToothPastProcedure_Updated",
  TOOTH_PAST_PROCEDURE_DELETED: "TP_DM_ToothPastProcedure_Deleted",
  TOOTH_FINDING_ADDED: "TP_DM_ToothFinding_Added",
  TOOTH_FINDING_UPDATED: "TP_DM_ToothFinding_Updated",
  TOOTH_FINDING_DELETED: "TP_DM_ToothFinding_Deleted",
  TOOTH_PROCEDURE_ADDED: "TP_DM_ToothProcedure_Added",
  TOOTH_PROCEDURE_STATUS_CHANGED: "TP_DM_ToothProcedure_StatusChanged",
  TOOTH_PROCEDURE_UPDATED: "TP_DM_ToothProcedure_Updated",
  TOOTH_PROCEDURE_DELETED: "TP_DM_ToothProcedure_Deleted",
  TOOTH_NOTE_UPDATED: "TP_DM_ToothNote_Updated",
  TOOTH_RECORD_ADDED: "TP_DM_ToothRecord_Added",
  ORAL_EXAM_OPENED: "TP_DM_OralExam_Opened",
  ORAL_EXPANDED_OPENED: "TP_DM_OralExamExpandedView_Opened",
  ORAL_MINIMIZED: "TP_DM_OralExam_Minimized",
  ORAL_TEMPLATE_SAVE_CLICKED: "TP_DM_OralTemplate_SaveClicked",
  ORAL_TEMPLATE_SAVED: "TP_DM_OralTemplate_Saved",
  ORAL_TEMPLATE_SELECT_CLICKED: "TP_DM_OralTemplate_SelectClicked",
  ORAL_TEMPLATE_APPLIED: "TP_DM_OralTemplate_Applied",
  ORAL_CLEAR_ALL_CLICKED: "TP_DM_OralExam_ClearAllClicked",
  ORAL_CLEAR_ALL_CONFIRMED: "TP_DM_OralExam_ClearAllConfirmed",
  ORAL_LOCATION_SELECTED: "TP_DM_OralLocation_Selected",
  ORAL_PAST_PROCEDURE_ADDED: "TP_DM_OralPastProcedure_Added",
  ORAL_FINDING_ADDED: "TP_DM_OralFinding_Added",
  ORAL_PROCEDURE_ADDED: "TP_DM_OralProcedure_Added",
  ORAL_CUSTOM_ENTRY_ADDED: "TP_DM_OralCustomEntry_Added",
  ORAL_NOTE_UPDATED: "TP_DM_OralNote_Updated",
  ORAL_RECORD_ADDED: "TP_DM_OralExamRecord_Added",
  PRINT_PREVIEW_OPENED: "TP_DM_PrintPreview_Opened",
  PRINT_CONFIGURATION_OPENED: "TP_DM_PrintConfiguration_Opened",
  PRINT_LAYOUT_SELECTED: "TP_DM_PrintLayout_Selected",
  PRINT_DENTAL_CHART_TOGGLED: "TP_DM_PrintDentalChart_Toggled",
  PRINT_VIEW_TYPE_SELECTED: "TP_DM_PrintViewType_Selected",
  PRINT_PAST_DENTAL_HISTORY_TOGGLED: "TP_DM_PrintPastDentalHistory_Toggled",
  PRESCRIPTION_PREVIEW_BEFORE_PRINT: "TP_DM_PrescriptionPreview_BeforePrint_Clicked",
  PRINT_STARTED: "TP_DM_PrintStarted",
  END_VISIT_CLICKED: "TP_DM_EndVisit_Clicked",
  END_VISIT_CONFIRMED: "TP_DM_EndVisit_Confirmed",
  CONFIRM_DIALOG_SHOWN: "TP_DM_ConfirmDialog_Shown",
  CONFIRM_DIALOG_PRIMARY: "TP_DM_ConfirmDialog_PrimaryClicked",
  CONFIRM_DIALOG_SECONDARY: "TP_DM_ConfirmDialog_SecondaryClicked",
};

const visitMetrics = {
  patientKey: "",
  tooth_records_added_current_visit: 0,
  oral_exam_added_current_visit: 0,
  print_preview_opened_before_end: false,
  print_completed_before_end: false,
  panelOpenedAt: {},
  firedOnce: new Set(),
};

let analyticsContext = {};
let hoverTimer = null;
let lastHoveredFdi = null;

export function hashPatientId(patientId) {
  const raw = String(patientId || "");
  if (!raw) return "";
  let h = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    h = ((h << 5) + h) ^ raw.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function getPatientAgeGroup(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < 0) return "unknown";
  if (n < 12) return "pediatric";
  if (n < 18) return "adolescent";
  return "adult";
}

export function getNoteLengthBucket(text) {
  const len = String(text || "").trim().length;
  if (len === 0) return "none";
  if (len <= 50) return "short";
  if (len <= 200) return "medium";
  return "long";
}

export function getDeviceType() {
  if (isIPad() || isTablet) return "tablet";
  if (isMobile) return "mobile";
  return "desktop";
}

export function getToothAnalyticsMeta(fdi, toothOverride) {
  const tooth =
    toothOverride || TEETH.find((t) => String(t.fdi) === String(fdi));
  if (!tooth) return { tooth_fdi: String(fdi) };
  return {
    tooth_fdi: String(fdi),
    tooth_name: tooth.name,
    quadrant: tooth.quadrant,
    arch: tooth.arch,
    tooth_type: tooth.position <= 3 ? "anterior" : "posterior",
  };
}

export function countToothRecordsFromState(state = {}) {
  const entries = Array.isArray(state.allEntries) ? state.allEntries.length : 0;
  const notes = Object.values(state.toothNotes || {}).filter(
    (n) => String(n || "").trim().length > 0
  ).length;
  const history = Object.values(state.treatmentHistoryDetailsByTooth || {}).reduce(
    (acc, m) => acc + Object.keys(m || {}).length,
    0
  );
  const diagnoses = Object.values(state.toothDiagnoses || {}).reduce(
    (acc, s) => acc + (s?.size || 0),
    0
  );
  return entries + notes + history + diagnoses;
}

export function countOralRecordsFromState(state = {}) {
  const entries = Array.isArray(state.oralEntries) ? state.oralEntries.length : 0;
  const hasNotes = String(state.oralNotes || "").trim().length > 0 ? 1 : 0;
  return entries + hasNotes;
}

export function buildDentalAnalyticsContext({
  profile,
  patientData,
  pamId,
  tcmId,
  visitId,
  appointmentId,
  sourcePage,
  clinic,
  userId,
} = {}) {
  const resolvedPatient =
    patientData && typeof patientData === "object" ? patientData : undefined;
  const resolvedPam =
    pamId ??
    appointmentId ??
    resolvedPatient?.pam_id ??
    resolvedPatient?.pamId ??
    "";
  const resolvedTcm =
    tcmId ??
    visitId ??
    resolvedPatient?.tcm_id ??
    resolvedPatient?.tcmId ??
    "";
  return {
    profile,
    userId,
    patientData: resolvedPatient,
    clinic: clinic || getClinic(profile?.hospital_data),
    pamId: resolvedPam,
    tcmId: resolvedTcm,
    sourcePage:
      sourcePage ||
      (typeof window !== "undefined" ? window.location.pathname : ""),
  };
}

/**
 * Prime shared dental analytics context, then fire an event with the merged
 * base payload (doctor / clinic / patient hash / appointment / visit).
 * Use at entry points outside /dental where ids are known at click time.
 */
export function trackDentalEventWithContext(
  context = {},
  eventName,
  attributes = {},
) {
  const resolved = buildDentalAnalyticsContext(context);
  setDentalAnalyticsContext(resolved);
  trackDentalEvent(eventName, attributes);
}

export function setDentalAnalyticsContext(ctx = {}) {
  const mergedPatient =
    ctx.patientData && analyticsContext.patientData
      ? { ...analyticsContext.patientData, ...ctx.patientData }
      : ctx.patientData ?? analyticsContext.patientData;

  const resolved = buildDentalAnalyticsContext({
    profile: ctx.profile ?? analyticsContext.profile,
    userId: ctx.userId ?? analyticsContext.userId,
    patientData: mergedPatient,
    pamId:
      ctx.pamId ??
      ctx.appointmentId ??
      analyticsContext.pamId ??
      analyticsContext.appointment_id,
    tcmId:
      ctx.tcmId ??
      ctx.visitId ??
      analyticsContext.tcmId ??
      analyticsContext.visit_id,
    clinic: ctx.clinic ?? analyticsContext.clinic,
    sourcePage: ctx.sourcePage ?? analyticsContext.sourcePage,
  });

  const nextPatientKey = String(resolved.patientData?.patient_unique_id || "");
  if (
    nextPatientKey &&
    visitMetrics.patientKey &&
    visitMetrics.patientKey !== nextPatientKey
  ) {
    resetDentalVisitMetrics(nextPatientKey);
  } else if (nextPatientKey && !visitMetrics.patientKey) {
    visitMetrics.patientKey = nextPatientKey;
  }
  analyticsContext = { ...analyticsContext, ...resolved };
}

export function resetDentalVisitMetrics(patientKey = "") {
  visitMetrics.patientKey = patientKey;
  visitMetrics.tooth_records_added_current_visit = 0;
  visitMetrics.oral_exam_added_current_visit = 0;
  visitMetrics.print_preview_opened_before_end = false;
  visitMetrics.print_completed_before_end = false;
  visitMetrics.panelOpenedAt = {};
  visitMetrics.firedOnce = new Set();
}

export function getDentalVisitMetrics() {
  return {
    tooth_records_added_current_visit:
      visitMetrics.tooth_records_added_current_visit,
    oral_exam_added_current_visit: visitMetrics.oral_exam_added_current_visit,
    print_preview_opened_before_end: visitMetrics.print_preview_opened_before_end,
    print_completed_before_end: visitMetrics.print_completed_before_end,
  };
}

export function incrementDentalVisitMetric(key, by = 1) {
  if (key in visitMetrics) {
    visitMetrics[key] += by;
  }
}

export function setDentalVisitFlag(key, value) {
  if (key in visitMetrics) {
    visitMetrics[key] = value;
  }
}

export function markDentalPanelOpened(panelKey) {
  visitMetrics.panelOpenedAt[panelKey] = Date.now();
}

export function markDentalPanelClosed(panelKey) {
  const openedAt = visitMetrics.panelOpenedAt[panelKey];
  delete visitMetrics.panelOpenedAt[panelKey];
  if (!openedAt) return 0;
  return Math.max(0, Date.now() - openedAt);
}

export function fireDentalOnce(key, fn) {
  if (visitMetrics.firedOnce.has(key)) return;
  visitMetrics.firedOnce.add(key);
  fn();
}

export function getDentalMoengageBasePayload(overrides = {}) {
  const ctx = { ...analyticsContext, ...overrides };
  const { profile, patientData, clinic, sourcePage } = ctx;
  const resolvedClinic = clinic || getClinic(profile?.hospital_data);
  return {
    doctor_id: profile?.doctor_unique_id || "",
    clinic_id: resolvedClinic?.hm_id || "",
    hospital_id: resolvedClinic?.hm_id || "",
    patient_id_hash: hashPatientId(patientData?.patient_unique_id),
    appointment_id: ctx.pamId ?? ctx.appointment_id ?? "",
    visit_id: ctx.tcmId ?? ctx.visit_id ?? "",
    device_type: getDeviceType(),
    timestamp_client: new Date().toISOString(),
    source_page:
      sourcePage ||
      (typeof window !== "undefined" ? window.location.pathname : ""),
  };
}

export function trackDentalEvent(eventName, attributes = {}, overrides = {}) {
  trackEvent(eventName, {
    ...getDentalMoengageBasePayload(overrides),
    ...getDentalVisitMetrics(),
    ...attributes,
  });
}

export function trackToothHovered(fdi, toothOverride, extra = {}) {
  if (!fdi) return;
  const key = String(fdi);
  if (lastHoveredFdi === key) return;
  lastHoveredFdi = key;
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    const toothEntries = extra.tooth_entry_count;
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_HOVERED, {
      ...getToothAnalyticsMeta(fdi, toothOverride),
      has_existing_tooth_data: Boolean(toothEntries),
      tooth_entry_count: toothEntries ?? 0,
      ...extra,
    });
    lastHoveredFdi = null;
  }, 300);
}

export function trackSurfaceSelected({
  tooth,
  surfaceId,
  selectionMode = "single",
  surfaceCount = 1,
  entryContext = "",
}) {
  if (!tooth || !surfaceId) return;
  const surfaceLabel = getZoneLabel(
    surfaceId,
    tooth.arch,
    tooth.position
  );
  trackDentalEvent(DENTAL_MOENGAGE_EVENTS.SURFACE_SELECTED, {
    ...getToothAnalyticsMeta(tooth.fdi, tooth),
    surface_id: surfaceId,
    surface_label: surfaceLabel,
    selection_mode: selectionMode,
    surface_count: surfaceCount,
    entry_context: entryContext,
  });
}

export function trackToothRecordAdded({
  recordType,
  recordName,
  tooth,
  extra = {},
}) {
  incrementDentalVisitMetric("tooth_records_added_current_visit", 1);
  const metrics = getDentalVisitMetrics();
  trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_RECORD_ADDED, {
    ...getToothAnalyticsMeta(tooth?.fdi, tooth),
    record_type: recordType,
    record_name: recordName || "",
    tooth_records_total_present: extra.tooth_records_total_present,
    tooth_records_added_current_visit: metrics.tooth_records_added_current_visit,
    ...extra,
  });
}

export function trackOralRecordAdded({
  recordType,
  recordName,
  extra = {},
}) {
  incrementDentalVisitMetric("oral_exam_added_current_visit", 1);
  const metrics = getDentalVisitMetrics();
  trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_RECORD_ADDED, {
    oral_record_type: recordType,
    record_name: recordName || "",
    oral_exam_total_present: extra.oral_exam_total_present,
    oral_exam_added_current_visit: metrics.oral_exam_added_current_visit,
    ...extra,
  });
}

export function trackConfirmDialogShown(meta = {}) {
  trackDentalEvent(DENTAL_MOENGAGE_EVENTS.CONFIRM_DIALOG_SHOWN, meta);
}

export function trackConfirmDialogPrimary(meta = {}) {
  trackDentalEvent(DENTAL_MOENGAGE_EVENTS.CONFIRM_DIALOG_PRIMARY, {
    result_action: "confirmed",
    ...meta,
  });
}

export function trackConfirmDialogSecondary(meta = {}) {
  trackDentalEvent(DENTAL_MOENGAGE_EVENTS.CONFIRM_DIALOG_SECONDARY, {
    result_action: "cancelled",
    ...meta,
  });
}
