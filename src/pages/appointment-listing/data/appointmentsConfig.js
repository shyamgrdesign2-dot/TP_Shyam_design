// Tab / filter / empty-state configuration for the appointment listing page.
// apStatue values mirror src/utils/constants.js (TAB_QUEUE 0, TAB_FINISHED 3,
// TAB_CANCELLED 4, TAB_DRAFT_RX 6). Pending digitisation lists finished (3)
// appointments restricted to the undigitised id set, same as the legacy page.

export const TAB_IDS = {
  ALL: "all",
  QUEUE: "queue",
  FINISHED: "finished",
  CANCELLED: "cancelled",
  DRAFT: "draft",
  PENDING: "pending-digitisation",
  // Cross-consult incoming referrals (apStatue 8). Shown only when
  // useCrossConsult() is on, same as AppointmentData.js TAB_REFERRAL.
  REFERRAL: "referral",
  // Chikitsalay: booked appointments (apStatue 0). Queue then becomes
  // checked-in patients (apStatue 7), matching AppointmentData.js.
  CLINIC_APPOINTMENT: "clinic-appointment",
  // Zydus-specific tabs (fetched from the Zydus ICT system, not TP backend)
  ZYDUS_ENCOUNTER: "zydus-encounter",
  ZYDUS_APPOINTMENT: "zydus-appointment",
};

export const TAB_TO_AP_STATUS = {
  [TAB_IDS.QUEUE]: 0,
  [TAB_IDS.CLINIC_APPOINTMENT]: 0,
  [TAB_IDS.FINISHED]: 3,
  [TAB_IDS.CANCELLED]: 4,
  [TAB_IDS.DRAFT]: 6,
  [TAB_IDS.PENDING]: 3,
  [TAB_IDS.REFERRAL]: 8,
};

// AppointmentData.js: TAB_CLINIC_QUEUE = 7, TAB_CLINIC_APPOINTMENT = 0.
export const CLINIC_QUEUE_AP_STATUS = 7;

export function apStatueForTab(tabId, isChikitsalay = false) {
  if (tabId === TAB_IDS.QUEUE && isChikitsalay) return CLINIC_QUEUE_AP_STATUS;
  return TAB_TO_AP_STATUS[tabId];
}

/* How many appointments the month cell shows before "+N more". Matches the
   listAppointmentCalendar `size` param and the chip cap in the month grid. */
export const MONTH_CALENDAR_SIZE = 3;

/* pam_status codes the calendar API filters on: 0=Queue, 1=Arrived,
   2=Engaged, 3=Finished, 4=Cancelled, 6=Draft, 7=Chikitsalay checked-in.
   All uses 0–3 as the webservice default, plus cancelled/draft so the month
   grid keeps the same buckets as day/week All. */
export function calendarStatusCsvForTab(
  tabId,
  { includeDraft = true, isChikitsalay = false } = {}
) {
  if (tabId === TAB_IDS.ALL) {
    const parts = ["0", "1", "2", "3", "4"];
    if (includeDraft) parts.push("6");
    if (isChikitsalay) parts.push(String(CLINIC_QUEUE_AP_STATUS));
    return parts.join(",");
  }
  if (tabId === TAB_IDS.QUEUE && !isChikitsalay) return "0,1,2";
  const status = apStatueForTab(tabId, isChikitsalay);
  return status == null ? "0,1,2,3" : String(status);
}

export function tabIdFromPamStatus(status, isChikitsalay = false) {
  const n = Number(status);
  if (n === 3) return TAB_IDS.FINISHED;
  if (n === 4) return TAB_IDS.CANCELLED;
  if (n === 6) return TAB_IDS.DRAFT;
  if (n === 8) return TAB_IDS.REFERRAL;
  if (isChikitsalay && n === 0) return TAB_IDS.CLINIC_APPOINTMENT;
  return TAB_IDS.QUEUE;
}

// Statuses merged into the calendar's "All" view — the doctor's/receptionist's
// complete schedule on one grid (Pending Digitisation is an all-time worklist,
// not a schedule concept, so it stays out of the calendar).
export const ALL_MERGED_TABS = [TAB_IDS.QUEUE, TAB_IDS.DRAFT, TAB_IDS.FINISHED, TAB_IDS.CANCELLED];

const TAB_META = {
  [TAB_IDS.ALL]: { id: TAB_IDS.ALL, label: "All", icon: "document-favorite", iconFamily: "content-edit" },
  [TAB_IDS.CLINIC_APPOINTMENT]: { id: TAB_IDS.CLINIC_APPOINTMENT, label: "Appointment", icon: "calendar", iconFamily: "time" },
  [TAB_IDS.QUEUE]: { id: TAB_IDS.QUEUE, label: "Queue", icon: "timer", iconFamily: "time" },
  [TAB_IDS.FINISHED]: { id: TAB_IDS.FINISHED, label: "Finished", icon: "clipboard-tick" },
  [TAB_IDS.CANCELLED]: { id: TAB_IDS.CANCELLED, label: "Cancelled", icon: "clipboard-close" },
  [TAB_IDS.DRAFT]: { id: TAB_IDS.DRAFT, label: "Draft", icon: "edit-2", iconFamily: "content-edit" },
  [TAB_IDS.PENDING]: { id: TAB_IDS.PENDING, label: "Pending Digitisation", icon: "ai-document", iconFamily: "ai" },
  [TAB_IDS.REFERRAL]: { id: TAB_IDS.REFERRAL, label: "Referral", icon: "document-text", iconFamily: "content-edit" },
  // Zydus tabs come from the ICT system (not the TP backend)
  [TAB_IDS.ZYDUS_ENCOUNTER]: { id: TAB_IDS.ZYDUS_ENCOUNTER, label: "Encounter", icon: "timer", iconFamily: "time" },
  [TAB_IDS.ZYDUS_APPOINTMENT]: { id: TAB_IDS.ZYDUS_APPOINTMENT, label: "Appointment", icon: "calendar", iconFamily: "time" },
};

// Table keeps its exact status buckets; the calendar leads with "All" (the
// complete schedule). Pending Digitisation stays in both bars: it has no
// calendar rendering of its own, so selecting it borrows the table view and
// leaving it restores the calendar (see AppointmentListingPage).
export const LIST_TABS = [
  TAB_IDS.QUEUE,
  TAB_IDS.DRAFT,
  TAB_IDS.FINISHED,
  TAB_IDS.CANCELLED,
  TAB_IDS.PENDING,
  TAB_IDS.REFERRAL,
].map((id) => TAB_META[id]);
export const CALENDAR_TABS = [TAB_IDS.ALL, ...ALL_MERGED_TABS, TAB_IDS.PENDING, TAB_IDS.REFERRAL].map(
  (id) => TAB_META[id]
);

// Chikitsalay list: Appointment (booked) then Queue (checked-in), same order
// as AppointmentData.js (TAB_CLINIC_APPOINTMENT then TAB_CLINIC_QUEUE).
export const CHIKITSALAY_LIST_TABS = [
  TAB_IDS.CLINIC_APPOINTMENT,
  TAB_IDS.QUEUE,
  TAB_IDS.FINISHED,
  TAB_IDS.CANCELLED,
  TAB_IDS.DRAFT,
  TAB_IDS.PENDING,
  TAB_IDS.REFERRAL,
].map((id) => TAB_META[id]);
export const CHIKITSALAY_CALENDAR_TABS = [
  TAB_IDS.ALL,
  TAB_IDS.CLINIC_APPOINTMENT,
  TAB_IDS.QUEUE,
  TAB_IDS.FINISHED,
  TAB_IDS.CANCELLED,
  TAB_IDS.DRAFT,
  TAB_IDS.PENDING,
  TAB_IDS.REFERRAL,
].map((id) => TAB_META[id]);
// Queue first in the All merge so a checked-in patient keeps Consult rather
// than collapsing into the action-less Appointment row.
export const CHIKITSALAY_MERGED_TABS = [
  TAB_IDS.QUEUE,
  TAB_IDS.CLINIC_APPOINTMENT,
  TAB_IDS.FINISHED,
  TAB_IDS.CANCELLED,
  TAB_IDS.DRAFT,
];

// Back-compat alias (list default).
export const APPOINTMENT_TABS = LIST_TABS;

// Pending Digitisation and Referral are all-time worklists (2000-01-01 → today),
// not a day on the schedule. They always render as a table, even in calendar view.
export const isAllTimeWorklistTab = (tabId) =>
  tabId === TAB_IDS.PENDING || tabId === TAB_IDS.REFERRAL;

// The slot group is client-side (in-clinic vs teleconsultation); the visit
// type group is built at runtime from the clinic's configured case types
// (getCaseTypes → toct_id values, same as the legacy filterVisitType csv).
export const SLOT_FILTER_GROUP = {
  id: "slot",
  label: "Slot",
  options: [
    { value: "in-clinic", label: "In-Clinic" },
    { value: "video", label: "Teleconsultation" },
  ],
};

// Empty states: short scannable heading + explanatory subtext, with the
// shared empty-docs illustration. Only the Queue tab carries a CTA
// (Add Appointment); the others are informational.
// Tabs shown for Zydus accounts (replaces standard LIST_TABS)
export const ZYDUS_LIST_TABS = [
  TAB_IDS.ZYDUS_ENCOUNTER,
  TAB_IDS.ZYDUS_APPOINTMENT,
  TAB_IDS.QUEUE,
  TAB_IDS.FINISHED,
  TAB_IDS.CANCELLED,
  TAB_IDS.DRAFT,
  TAB_IDS.PENDING,
  TAB_IDS.REFERRAL,
].map((id) => TAB_META[id]);

/** Zydus tabs that use the single-day prev/next navigator (legacy UAT). */
export const ZYDUS_SINGLE_DAY_TABS = [
  TAB_IDS.ZYDUS_ENCOUNTER,
  TAB_IDS.ZYDUS_APPOINTMENT,
  TAB_IDS.CANCELLED,
];

export const EMPTY_STATE_BY_TAB = {
  [TAB_IDS.ZYDUS_ENCOUNTER]: {
    title: "No encounters today",
    description: "Encounters fetched from the Zydus system will appear here.",
  },
  [TAB_IDS.ZYDUS_APPOINTMENT]: {
    title: "No appointments today",
    description: "Appointments fetched from the Zydus system will appear here.",
  },
  [TAB_IDS.CLINIC_APPOINTMENT]: {
    title: "No appointments",
    description: "Book an appointment to see it on this list.",
    cta: "add-appointment",
  },
  [TAB_IDS.QUEUE]: {
    title: "No patients in queue",
    description: "Book an appointment to start seeing patients here.",
    cta: "add-appointment",
  },
  [TAB_IDS.FINISHED]: {
    title: "No finished visits",
    description: "Consultations you complete or end will appear here for the selected period.",
  },
  [TAB_IDS.CANCELLED]: {
    title: "No cancellations",
    description: "Appointments cancelled during the selected period will appear here.",
  },
  [TAB_IDS.DRAFT]: {
    title: "No draft prescriptions",
    description: "Prescriptions you save midway are kept here so you can resume them anytime.",
  },
  [TAB_IDS.PENDING]: {
    title: "Nothing to digitise",
    description: "Uploaded paper prescriptions will wait here until they are digitised.",
  },
  [TAB_IDS.REFERRAL]: {
    title: "No referral patients found",
    description: "Patients referred to you for a cross-consult will appear here.",
  },
};
