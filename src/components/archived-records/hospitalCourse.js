/**
 * Hospital Course: what happened during each stay, one row per event.
 *
 * A discharge summary tells the course of a stay as a paragraph, and the
 * product keeps it that way (the Hospital Course box of the inpatient
 * discharge summary). So when the file has that paragraph ("Course in
 * hospital", "Hospital course"), it is the course: shown whole, as written,
 * with its citation, and never rewritten or broken into rows on screen.
 *
 * A stay with no discharge summary in the file takes the course as it is
 * written elsewhere in the file: the emergency record's course and
 * disposition note for the visit it came in through. Only when nothing is
 * written as a course is it shown as the dated events read from its pages. Those rows are also what is stored
 * for counting, for every stay:
 *
 *   a stay      encounterId, type, department, admittedOn, dischargedOn,
 *               days, entry (how they came in), outcome (how they left)
 *   an event    kind, on, until, time, day, title, note
 *
 *   kind    one of COURSE_KINDS. It says what sort of thing happened, so
 *           "how many stays had a move to HDU" is a count, not a search.
 *   on      the day, as a date that sorts: "2026-07-11". A span of days
 *           ("opinions over two days") also has `until`.
 *   time    24-hour, only when the page gives one: "13:15"
 *   day     the day of the stay it fell on; the day of admission is 1
 *   title   what happened, in a few plain words
 *   note    one short remark; never a second event, never a date or a time
 *
 * Rules for the rows:
 *   - One event, one row. "Operated, then shifted to HDU" is two rows.
 *   - A row says what happened, not what was found: results, diagnoses and
 *     medicines are in their own sections. A number is in the note only
 *     when it is the event ("SpO2 88% on room air").
 *   - The emergency visit a stay began with is the first row of that stay.
 *   - An event restates a fact of the file (`factId`). If a reviewer removes
 *     that fact, the event is not shown; a corrected procedure name is the
 *     name the event uses.
 *   - A visit that was not a stay has no course.
 */

import { encounterType } from "./encounterTypes";

export const COURSE_KINDS = [
  { kind: "arrival", label: "Arrival" },
  { kind: "admission", label: "Admission" },
  { kind: "opinion", label: "Opinion" },
  { kind: "investigation", label: "Investigation" },
  { kind: "procedure", label: "Procedure" },
  { kind: "transfer", label: "Transfer" },
  { kind: "event", label: "Clinical event" },
  { kind: "milestone", label: "Milestone" },
  { kind: "discharge", label: "Discharge" },
  { kind: "followUp", label: "Follow-up" },
];
const KIND_LABEL = Object.fromEntries(COURSE_KINDS.map((item) => [item.kind, item.label]));
export const courseKind = (event) => KIND_LABEL[event.kind] || "";

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "9 Jul 2026" or "2026-07-09" as a day count, so two days can be subtracted.
function dayNumber(text = "") {
  const iso = String(text).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) / DAY;
  const said = String(text).match(/^(\d{1,2}) (\w{3})\w* (\d{4})$/);
  const month = said ? MONTHS.indexOf(said[2]) : -1;
  return month < 0 ? null : Date.UTC(Number(said[3]), month, Number(said[1])) / DAY;
}
const isoOf = (label) => {
  const number = dayNumber(label);
  return number === null ? "" : new Date(number * DAY).toISOString().slice(0, 10);
};

// How long the stay was, in days (nights spent): 9 Jul to 16 Jul is 7.
export function stayDays(encounter) {
  const from = dayNumber(encounter.startLabel);
  const to = dayNumber(encounter.endLabel);
  return from === null || to === null || to < from ? null : to - from;
}

// The day of the stay an event fell on. The day of admission is day 1; the
// emergency visit before it is day 1 too.
function dayOfStay(event, encounter) {
  const from = dayNumber(encounter.startLabel);
  const on = dayNumber(event.on);
  return from === null || on === null ? null : Math.max(1, on - from + 1);
}

// Acronyms and readings (SpO2, NT-proBNP) keep their capitals after a colon.
const lowerFirst = (text = "") => text.replace(/^([A-Z])([a-z]+)(?=[\s,;:.-]|$)/, (match, first, rest) => first.toLowerCase() + rest);

// One event as it is read: "Admitted under Orthopaedics: closed left femur neck fracture".
export const courseLine = (event) => `${event.title}${event.detail ? `: ${lowerFirst(event.detail)}` : ""}`;

/**
 * The course of every stay in the file, newest stay first.
 *   options.matches     keep only events that pass (search)
 *   options.factOf      (factId) => the fact as it now stands, or null when
 *                       it was removed or held back in review
 *   options.summaryOf   (encounterId) => the stay's own course paragraph
 *                       from the discharge summary, as a fact, or null
 * Each stay: { id, encounter, title, days, summary, events }. `summary`, when
 * there is one, is what is shown; `events` are shown only without it. A day
 * is written once: `event.sameDay` is true for the later events of a day.
 */
export function hospitalCourse(bundle, { matches = null, factOf = null, summaryOf = null } = {}) {
  const stays = bundle.encounters.filter((item) => encounterType(item.type).stay);
  const inOrder = [...stays].sort((a, b) => String(a.sortKey || "").localeCompare(String(b.sortKey || "")));
  return [...inOrder]
    .reverse()
    .map((stay) => {
      const label = encounterType(stay.type).label;
      const same = inOrder.filter((item) => item.type === stay.type);
      const days = stayDays(stay);
      const span = [stay.shortDate, days ? `${days}d` : null].filter(Boolean).join(", ");
      const events = (bundle.timeline || [])
        .filter((event) => event.encounterId === stay.id || (stay.entryEncounterId && event.encounterId === stay.entryEncounterId))
        .map((event) => {
          if (!event.factId || !factOf) return event;
          const fact = factOf(event.factId);
          if (!fact) return null;
          return event.kind === "procedure" && fact.title ? { ...event, title: fact.title } : event;
        })
        .filter(Boolean)
        .map((event) => ({ ...event, day: dayOfStay(event, stay) }))
        .filter((event) => !matches || matches(event))
        .map((event, index, list) => ({ ...event, sameDay: index > 0 && list[index - 1].date === event.date }));
      return {
        id: stay.id,
        encounter: stay,
        days,
        title: `${label}${same.length > 1 ? ` ${same.indexOf(stay) + 1}` : ""}${stay.department ? ` · ${stay.department}` : ""}${span ? ` (${span})` : ""}`,
        // The stay's own paragraph; a stay with no discharge summary in the
        // file takes the course written on the visit it came in through.
        summary: summaryOf ? summaryOf(stay.id) || (stay.entryEncounterId ? summaryOf(stay.entryEncounterId) : null) : null,
        events,
      };
    })
    .filter((stay) => stay.summary || stay.events.length);
}

// The course as the discharge summary's paragraph, written from the rows:
// "09 Jul: Came to the emergency (fall from stairs; left hip pain). ..."
export const courseText = (stay) =>
  stay.events.map((event) => `${event.sameDay ? "" : `${event.date}: `}${event.title}${event.detail ? ` (${lowerFirst(event.detail)})` : ""}.`).join(" ");

// What is stored: one entry per stay with the course as the file wrote it
// (`text`, `textSource: "asWritten"`). Only a stay with no written course
// gets dated rows (`events`) and a text written out from them.
export function buildHospitalCourse(bundle, options) {
  return hospitalCourse(bundle, options)
    .reverse()
    .map((stay) => ({
      encounterId: stay.id,
      type: stay.encounter.type,
      department: stay.encounter.department || "",
      admittedOn: isoOf(stay.encounter.startLabel),
      dischargedOn: isoOf(stay.encounter.endLabel),
      days: stay.days,
      entry: stay.encounter.entry || "",
      outcome: stay.encounter.outcome || "",
      // The course is the paragraph as written. Dated rows are stored only
      // for a stay the file writes no course for.
      events: (stay.summary ? [] : stay.events).map((event) => ({
        kind: event.kind,
        date: event.on,
        ...(event.until ? { until: event.until } : null),
        time: event.time || "",
        day: event.day,
        title: event.title,
        note: event.detail || "",
        _source: { eventId: event.id, factId: event.factId || null, page: event.cite?.page, region: event.cite?.rid },
      })),
      // The paragraph as the discharge summary wrote it; without one, the
      // same course written out from the rows.
      text: stay.summary ? stay.summary.detail : courseText(stay),
      textSource: stay.summary ? "asWritten" : "fromEvents",
      ...(stay.summary ? { _source: { factId: stay.summary.id, page: stay.summary.cite?.page, region: stay.summary.cite?.rid } } : null),
    }));
}
