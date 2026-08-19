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
  // Zydus-specific tabs (fetched from the Zydus ICT system, not TP backend)
  ZYDUS_ENCOUNTER: "zydus-encounter",
  ZYDUS_APPOINTMENT: "zydus-appointment",
};

export const TAB_TO_AP_STATUS = {
  [TAB_IDS.QUEUE]: 0,
  [TAB_IDS.FINISHED]: 3,
  [TAB_IDS.CANCELLED]: 4,
  [TAB_IDS.DRAFT]: 6,
  [TAB_IDS.PENDING]: 3,
};

// Statuses merged into the calendar's "All" view — the doctor's/receptionist's
// complete schedule on one grid (Pending Digitisation is an all-time worklist,
// not a schedule concept, so it stays out of the calendar).
export const ALL_MERGED_TABS = [TAB_IDS.QUEUE, TAB_IDS.FINISHED, TAB_IDS.CANCELLED, TAB_IDS.DRAFT];

const TAB_META = {
  [TAB_IDS.ALL]: { id: TAB_IDS.ALL, label: "All", icon: "document-favorite", iconFamily: "content-edit" },
  [TAB_IDS.QUEUE]: { id: TAB_IDS.QUEUE, label: "Queue", icon: "timer", iconFamily: "time" },
  [TAB_IDS.FINISHED]: { id: TAB_IDS.FINISHED, label: "Finished", icon: "clipboard-tick" },
  [TAB_IDS.CANCELLED]: { id: TAB_IDS.CANCELLED, label: "Cancelled", icon: "clipboard-close" },
  [TAB_IDS.DRAFT]: { id: TAB_IDS.DRAFT, label: "Draft", icon: "edit-2", iconFamily: "content-edit" },
  [TAB_IDS.PENDING]: { id: TAB_IDS.PENDING, label: "Pending Digitisation", icon: "ai-document", iconFamily: "ai" },
  // Zydus tabs come from the ICT system (not the TP backend)
  [TAB_IDS.ZYDUS_ENCOUNTER]: { id: TAB_IDS.ZYDUS_ENCOUNTER, label: "Encounter", icon: "timer", iconFamily: "time" },
  [TAB_IDS.ZYDUS_APPOINTMENT]: { id: TAB_IDS.ZYDUS_APPOINTMENT, label: "Appointment", icon: "calendar", iconFamily: "time" },
};

// Table keeps its exact status buckets; the calendar leads with "All" (the
// complete schedule). Pending Digitisation stays in both bars: it has no
// calendar rendering of its own, so selecting it borrows the table view and
// leaving it restores the calendar (see AppointmentListingPage).
export const LIST_TABS = [TAB_IDS.QUEUE, TAB_IDS.FINISHED, TAB_IDS.CANCELLED, TAB_IDS.DRAFT, TAB_IDS.PENDING].map(
  (id) => TAB_META[id]
);
export const CALENDAR_TABS = [TAB_IDS.ALL, ...ALL_MERGED_TABS, TAB_IDS.PENDING].map((id) => TAB_META[id]);

// Back-compat alias (list default).
export const APPOINTMENT_TABS = LIST_TABS;

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
export const ZYDUS_LIST_TABS = [TAB_IDS.ZYDUS_ENCOUNTER, TAB_IDS.ZYDUS_APPOINTMENT, TAB_IDS.QUEUE, TAB_IDS.FINISHED, TAB_IDS.CANCELLED].map(
  (id) => TAB_META[id]
);

export const EMPTY_STATE_BY_TAB = {
  [TAB_IDS.ZYDUS_ENCOUNTER]: {
    title: "No encounters today",
    description: "Encounters fetched from the Zydus system will appear here.",
  },
  [TAB_IDS.ZYDUS_APPOINTMENT]: {
    title: "No appointments today",
    description: "Appointments fetched from the Zydus system will appear here.",
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
};
