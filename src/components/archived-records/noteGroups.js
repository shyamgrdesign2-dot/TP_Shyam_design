/**
 * Clinical Notes: which prose of a file is kept as facts.
 *
 * A paper file is mostly prose. Only prose that has a place in the Rx pad's
 * own structure is kept, listed, reviewed and saved:
 *
 *   Symptoms               -> symptoms (name, since, severity, notes)
 *   Examination            -> examinations (name, notes)
 *   Investigations         -> lab_investigation (name, notes)
 *   Operation notes        -> others (kind: Operation notes)
 *   Advice and follow-up   -> advice, follow_up (name, notes)
 *   Hospital course        -> the stay's course, as the discharge summary
 *                             wrote it (shown in the Hospital Course section)
 *
 * Everything else a reader may pull out of the pages (running course notes,
 * what each speciality said, alerts, nursing and administrative detail) has
 * no structure to go into. It is not listed, not reviewed and not saved. It
 * stays with the bundle as `unlisted`, only so that a dated event can still
 * point at the page it came from.
 */

import { isHistory } from "./medicalHistory";

export const COURSE_GROUP = "Hospital course";
// In reading order: why the patient came, what was found, what was done,
// what was advised.
export const NOTE_GROUPS = ["Symptoms", "Examination", "Investigations", "Operation notes", "Advice and follow-up"];
export const LISTED_NOTE_GROUPS = [...NOTE_GROUPS, COURSE_GROUP];

// A fact that is kept. Anything that is not a note is; a note is kept when
// its tag is one of the above. History read from a note is Medical History.
export const isListed = (finding) => finding.domain !== "RPT" || isHistory(finding) || LISTED_NOTE_GROUPS.includes(finding.group);

// The discharge summary's own course paragraph for a stay.
export const isCourseSummary = (finding) => finding.domain === "RPT" && finding.group === COURSE_GROUP;
