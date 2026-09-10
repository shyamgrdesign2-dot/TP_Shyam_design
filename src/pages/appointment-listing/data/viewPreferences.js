/**
 * Remembers how the doctor left the screen: table or calendar, and which
 * calendar granularity. Navigating into a consultation and back, or logging
 * out and in again, should return them to the view they were working in
 * rather than resetting to the table every time.
 *
 * Stored per browser, not per session, and deliberately tolerant: private
 * mode and storage-disabled browsers throw on access, and a remembered view
 * is never worth breaking the page over.
 */
const KEYS = {
  view: "tp.appointments.view",
  calendarMode: "tp.appointments.calendarMode",
  calendarFreeSlots: "tp.appointments.calendarFreeSlots",
  calendarHourPx: "tp.appointments.calendarHourPx",
  receptionistView: "tp.receptionist.appointments.view",
  receptionistCalendarMode: "tp.receptionist.appointments.calendarMode",
  patientSectionAdditional: "tp.addPatient.section.additional",
  patientSectionAddress: "tp.addPatient.section.address",
};

/* Preferences whose value is a number rather than one of a fixed set. They are
   validated as finite numbers here; the calendar clamps to its own zoom bounds
   on read, so a stale or out-of-range value can never break the grid. */
const NUMERIC = new Set(["calendarHourPx"]);

const ALLOWED = {
  view: ["list", "calendar"],
  calendarMode: ["day", "week", "month"],
  receptionistView: ["list", "calendar"],
  receptionistCalendarMode: ["day", "week"],
  /* Whether the availability layer is drawn under the appointments. */
  calendarFreeSlots: ["on", "off"],
  /* Optional sections of the add-patient form. Personal Details is not
     here on purpose: a new patient always starts with the required fields
     open, whatever the doctor collapsed last time. */
  patientSectionAdditional: ["open", "collapsed"],
  patientSectionAddress: ["open", "collapsed"],
};

export function readPreference(name, fallback) {
  try {
    const v = window.localStorage.getItem(KEYS[name]);
    // Validate rather than trust: a stale or hand-edited value must not put
    // the page into a state it has no rendering path for.
    if (NUMERIC.has(name)) return Number.isFinite(Number(v)) ? v : fallback;
    return ALLOWED[name]?.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function writePreference(name, value) {
  try {
    if (NUMERIC.has(name)) {
      if (Number.isFinite(Number(value))) window.localStorage.setItem(KEYS[name], String(value));
      return;
    }
    if (ALLOWED[name]?.includes(value)) window.localStorage.setItem(KEYS[name], value);
  } catch {
    // Storage unavailable; the preference just won't survive this session.
  }
}
