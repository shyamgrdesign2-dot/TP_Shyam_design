/**
 * Every fact in the Rx pad's own structure.
 *
 * A fact read from a paper file is only useful downstream (copy into today's
 * prescription, analytics, exchange with another system) if it is stored the
 * way the product already stores that kind of thing. So each fact is mapped
 * onto the row shape the Rx pad and VoiceRx use, with the same keys:
 *
 *   Diagnosis        name, type, duration, status, notes, icd_code (type: see diagnosisTypes.js)
 *   Medication       name, generic, type (form), dosage (unit per dose), frequency, when,
 *                    duration, notes, stage (At home, In hospital, On discharge)
 *   Surgery          name, type, date, time, anaesthesia, notes (see procedureTypes.js)
 *   Medical history  type, name, enable, status, duration, medication, relation,
 *                    dateType, date, notes (by section: see medicalHistory.js)
 *   Lab result       reportName, testName, value, units, refRange, arrowDirection, date
 *   Vitals           temperature, pulse, respiratory_rate, blood_pressure, spo2, height, weight, date
 *   Symptom          name, duration, severity, notes
 *   Examination, Investigation, Advice    name, notes
 *   Follow-up        name, notes (the date is the row's own)
 *   Others           name, notes, kind (the tag: Keep in mind, Opinions, Course, ...)
 *
 * Rules:
 *   - A field is filled only from what the page says. Nothing is computed
 *     (no duration from a quantity) and nothing is guessed (no "After Food").
 *   - Frequency is converted to the Rx pad's short forms only where the
 *     conversion is exact: "1x1" is OD, "2x1" BD, "3x1" TDS, "4x1" QID,
 *     "once daily" OD, "when needed" SOS. Slots (1-0-1) and short forms
 *     already on the page (BD, TDS, HS) are kept as written.
 *   - "When" (After Food), duration (5 Day(s)) and unit per dose (1 Tablet)
 *     are filled only when the page states them in a standard way.
 *   - Whatever has no field of its own goes to notes (route, quantity,
 *     "stopped before surgery"), so no detail is dropped.
 *   - A reading in doubt is not converted at all: a dose that can be read two
 *     ways keeps its frequency exactly as written, and a diagnosis gets a
 *     status only when the page gives one ("suspected") or it is a final
 *     diagnosis read clearly.
 *   - The words as written stay on the fact (`verbatim`) beside the row.
 *
 * A reviewer corrects a fact in this same shape, field by field. The corrected
 * row is kept on the fact as `rx` and `rxRow` returns it in place of the
 * reading; `factFromRx` is the way back, so the fact's own fields (and with
 * them every reading view) say what the correction says.
 *
 * `buildDigitization` returns the same `digitization` object the Rx pad's
 * copy pipeline accepts (ConsultationRxPadCopyListener), which is also the
 * JSON to store in the backend.
 */

import { MEDICATION_OPTIONS, RELATIONSHIP_LIST, SINCE_UNITS, STATUS_OPTIONS } from "../medical-history/constants";
import { DX_TYPE_OPTIONS, dxType, isDiagnosis, roleOfDxType } from "./diagnosisTypes";
import { historyQuals, historyRow, historyType } from "./medicalHistory";
import { PROC_TYPE_OPTIONS, isProcedure, procType, roleOfProcType } from "./procedureTypes";

const TIMES_A_DAY = { 1: "OD", 2: "BD", 3: "TDS", 4: "QID" };
const FORM = { tab: "Tablet", tabs: "Tablet", tablet: "Tablet", tablets: "Tablet", cap: "Capsule", caps: "Capsule", capsule: "Capsule", capsules: "Capsule", ml: "ml" };
const parts = (text = "") => text.split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean);
const upperFirst = (text = "") => (text ? text[0].toUpperCase() + text.slice(1) : text);
const lowerFirst = (text = "") => (text ? text[0].toLowerCase() + text.slice(1) : text);

// Parts of a prescription line, recognised only when they are written in a
// standard way. Anything else falls through to notes, as written.
const SHORT_FREQUENCY = /^(od|bd|bid|tds|tid|qid|qds|hs|sos|stat|prn|q\d{1,2}h|alt(ernate)? days?|weekly|once a week)$/i;
const WORD_FREQUENCY = { "once daily": "OD", "once a day": "OD", "twice daily": "BD", "twice a day": "BD", "thrice daily": "TDS", "three times a day": "TDS", "four times a day": "QID", "at bedtime": "HS", "at night": "HS" };
const WHEN = /^((before|after|with) (food|meals?|breakfast|lunch|dinner)|empty stomach|bed ?time|a\/?f|b\/?f)$/i;
const DURATION_UNIT = { day: "Day(s)", d: "Day(s)", week: "Week(s)", wk: "Week(s)", month: "Month(s)", mth: "Month(s)", year: "Year(s)" };
const UNIT_PER_DOSE = /^(\d+(\.\d+)?|\d\/\d|half|one|two)\s*(tabs?|tablets?|caps?|capsules?|ml|units?|iu|puffs?|drops?|sachets?|tsp|spoons?|amp(oule)?s?|vials?)$/i;

// A reading that is in doubt (two ways to read it, pages that differ, hard to
// read) is never tidied into a short form: it would look settled when it is not.
const DOUBTFUL = ["ambiguous", "conflict", "conflictingValue", "lowConfidence", "partlyRead"];
const inDoubt = (finding) => Boolean(finding.hold) || finding.confidence < 0.7 || (finding.flags || []).some((flag) => DOUBTFUL.includes(flag));

// Where in the patient's care a medicine was written. Stored on the row, and
// the tag the medicine sits under on screen.
export const MED_STAGE = { home: "At home", inHospital: "In hospital", discharge: "On discharge" };
// What a medicine comes as: the Rx pad's medicine type. An old file names
// these; anything else is kept as written.
export const MED_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Eye drops", "Nebulisation", "Inhaler", "Ointment", "Dressing"];

function medication(finding) {
  // `med` is what the page says about the medicine itself: its generic (the
  // short name of what is in it), the full composition as printed, and its
  // form. The name is then the brand and strength alone, which is what makes
  // medicines countable.
  const said = finding.med || {};
  const row = { name: finding.title, generic: said.generic || "", type: said.form || "", dosage: "", frequency: "", when: "", duration: "", notes: "", stage: MED_STAGE[finding.role] || "" };
  const notes = [];
  const doubt = inDoubt(finding);
  parts(finding.detail).forEach((part) => {
    let m;
    // The form is a field of its own now; it is not also a note.
    if (finding.med && FORM_WORD.test(part)) return;
    if (!row.frequency && doubt && /^\d\s*x\s*\d+/i.test(part)) {
      row.frequency = part; // kept exactly as written
    } else if (!row.frequency && (m = part.match(/^(\d)\s*x\s*(\d+)\s*([a-z]+)?$/i))) {
      row.frequency = TIMES_A_DAY[m[1]] || `${m[1]} times a day`;
      row.dosage = `${m[2]}${FORM[(m[3] || "").toLowerCase()] ? ` ${FORM[m[3].toLowerCase()]}` : ""}`;
    } else if (!row.frequency && /^(when needed|sos|k\/p)\b/i.test(part)) {
      row.frequency = "SOS";
      const rest = part.replace(/^(when needed|sos|k\/p),?\s*/i, "");
      if (rest) notes.push(upperFirst(rest));
    } else if (!row.frequency && /^every /i.test(part)) {
      row.frequency = upperFirst(part);
    } else if (!row.frequency && (m = part.match(/^(\d(?:-\d)?) (capsules?|tablets?) a day$/i))) {
      row.dosage = `${m[1]} ${FORM[m[2].toLowerCase()]}`;
      row.frequency = "Daily";
    } else if (!row.frequency && /^\d(\s*-\s*\d){2,3}$/.test(part)) {
      row.frequency = part.replace(/\s+/g, ""); // slots as written: 1-0-1
    } else if (!row.frequency && SHORT_FREQUENCY.test(part)) {
      // Already the Rx pad's short form (BD, STAT, Q12H). A frequency in words
      // ("Once a week") keeps its words.
      row.frequency = /\s/.test(part) || /^weekly$/i.test(part) ? upperFirst(part.toLowerCase()) : part.toUpperCase();
    } else if (!row.frequency && WORD_FREQUENCY[part.toLowerCase()]) {
      row.frequency = WORD_FREQUENCY[part.toLowerCase()];
    } else if (!row.when && WHEN.test(part)) {
      row.when = part.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
    } else if (!row.duration && (m = part.match(/^(?:x\s*|for\s+)?(\d+)\s*(days?|weeks?|months?|years?|d|wks?|mths?)$/i))) {
      row.duration = `${m[1]} ${DURATION_UNIT[m[2].toLowerCase().replace(/s$/, "")] || upperFirst(m[2])}`;
    } else if (!row.dosage && UNIT_PER_DOSE.test(part)) {
      row.dosage = part.replace(/\b(tabs?|tablets?|caps?|capsules?)\b/i, (unit) => FORM[unit.toLowerCase()] || unit);
    } else if ((m = part.match(/^qty (\d+)$/i))) {
      notes.push(`Qty ${m[1]}`);
    } else {
      notes.push(/^[a-z]{2}$/i.test(part) ? part.toUpperCase() : upperFirst(part));
    }
  });
  row.notes = notes.join(", ");
  return row;
}

const VITAL_KEYS = { BP: "blood_pressure", Pulse: "pulse", HR: "pulse", SpO2: "spo2", Temp: "temperature", RR: "respiratory_rate", Wt: "weight", Ht: "height" };

function vitals(finding) {
  const row = { date: finding.dateLabel || "", notes: "" };
  const notes = [finding.title];
  (finding.facts || []).forEach((fact) => {
    const key = VITAL_KEYS[fact.k];
    if (key) row[key] = fact.v;
    else notes.push(`${fact.k} ${fact.v}`.trim());
  });
  row.notes = notes.join(", ");
  return row;
}

// Where a note belongs in the Rx pad, by the part it plays in the file.
// Where a note goes in the Rx pad's structure, by the tag it sits under.
// What the Rx pad has no section for (an alert, a specialist's opinion, the
// course of the stay) is kept under `others` with its tag as `kind`.
const NOTE_SECTION = { Symptoms: "symptoms", Examination: "examinations", Investigations: "lab_investigation" };
const noteSection = (finding) =>
  finding.role === "symptom" || finding.role === "complaint" ? "symptoms"
  : finding.role === "advice" ? "advice"
  : finding.role === "followUp" ? "follow_up"
  : NOTE_SECTION[finding.group] || (finding.role === "investigation" ? "lab_investigation" : "others");
export const RX_SEVERITY = ["Mild", "Moderate", "Severe"];

// The row as it was read from the page.
function readRow(finding) {
  // "Suspected" is carried over. "Confirmed" is said only for a final
  // diagnosis read clearly; anything else gets no status at all, because the
  // page did not give one and a reviewer has not chosen one.
  const status = finding.flags?.includes("suspected") ? "Suspected" : finding.role === "final" && !inDoubt(finding) ? "Confirmed" : "";
  // Whatever the Rx pad keeps under Medical History (a long-standing
  // condition, an allergy, a past operation, habits, family history) is a
  // medical_history row, with that section's own fields.
  if (historyType(finding)) return { section: "medical_history", row: historyRow(finding) };
  switch (finding.domain) {
    case "DX": {
      // `dx` is what the page says in the Rx pad's fields: since, a status
      // where the page gives one, and a note. The type comes from where the
      // diagnosis is written (final, secondary, provisional).
      const said = finding.dx || {};
      return {
        section: "diagnosis",
        row: {
          name: finding.title,
          type: dxType(finding).type,
          duration: said.since || "",
          status: said.status || status,
          notes: finding.dx ? said.note || "" : finding.detail || "",
          icd_code: (finding.coding || "").replace(/^ICD-10\s*/i, "").split(" ")[0] || "",
        },
      };
    }
    case "PROC": {
      // `proc` is what the page says in fields of its own: the time, the
      // anaesthetic type and a clinical note. The date is the row's own.
      const said = finding.proc || {};
      return {
        section: "surgery",
        row: {
          name: finding.title,
          type: procType(finding).type,
          date: finding.dateLabel || "",
          time: said.time || "",
          anaesthesia: said.anaesthesia || "",
          notes: finding.proc ? said.note || "" : finding.detail || "",
        },
      };
    }
    case "MED":
      return { section: "medications", row: medication(finding) };
    case "LAB":
      return {
        section: "lab_results",
        // The report is the panel the test belongs to (Complete blood count,
        // Electrolytes), so results can be grouped and counted like the Rx pad's.
        row: { reportName: finding.lab?.report || "", testName: finding.title, value: finding.value || "", units: finding.unit || "", refRange: finding.range || "", arrowDirection: finding.abnormal === "H" ? "up" : finding.abnormal === "L" ? "down" : "", date: finding.dateLabel || "" },
      };
    case "VIT":
      return { section: "vitals_and_body_composition", row: vitals(finding) };
    default: {
      const section = noteSection(finding);
      // A symptom is one row in the Rx pad's symptom fields.
      if (finding.sym) return { section, row: { name: finding.title, duration: finding.sym.since || "", severity: finding.sym.severity || "", notes: finding.sym.note || "" } };
      if (section === "symptoms") return { section, row: { name: finding.detail || finding.title, duration: "", severity: "", notes: "" } };
      if (section === "others") return { section, row: { name: finding.title, notes: finding.detail || "", kind: finding.group || "" } };
      return { section, row: { name: finding.title, notes: finding.detail || "" } };
    }
  }
}

// { section, row } for one fact: the digitization key it belongs under and
// its row in that section's shape. A reviewer's correction (`finding.rx`)
// stands in for the reading; the section never changes with it.
export function rxRow(finding) {
  if (!finding.rx) return readRow(finding);
  return { section: readRow(finding.original || finding).section, row: finding.rx };
}

// What the Rx pad offers for a field. Frequency and When still take free
// text; a status is one of its list.
export const RX_SUGGESTIONS = {
  frequency: ["OD", "BD", "TDS", "QID", "SOS", "HS", "Stat"],
  when: ["Before Food", "After Food", "Empty Stomach", "Bed Time"],
};
// A diagnosis's statuses in the order the Rx pad lists them. Medical History
// (allergies, conditions) takes its own list from the product's constants.
export const RX_STATUS = {
  diagnosis: ["Ruled Out", "Suspected", "Confirmed"],
  medical_history: STATUS_OPTIONS.map((option) => option.value),
};
// A lab's flag, in the words a reviewer picks from. The row keeps the Rx
// pad's own values (up, down, or nothing for normal).
// The reports (panels) a hospital file's results usually come under.
export const LAB_REPORTS = ["Complete blood count", "Blood glucose", "Electrolytes", "Renal function test", "Liver function test", "Coagulation profile", "Arterial blood gas", "Thyroid function test", "Lipid profile", "Inflammatory markers", "Cardiac markers", "Serology", "Urine routine"];
export const RX_FLAG = [{ value: "", label: "Normal" }, { value: "up", label: "High" }, { value: "down", label: "Low" }];

// Since and Duration are a number and a unit. A typed number offers its
// units, as the Rx pad does: "2" gives 2 Day(s), 2 Week(s), 2 Month(s), 2 Year(s).
export const RX_DURATION_UNITS = ["Day(s)", "Week(s)", "Month(s)", "Year(s)"];
const countOf = (value) => String(value ?? "").match(/^\s*(\d+(?:\.\d+)?)/)?.[1];
const durationOptions = ({ value } = {}) => {
  const count = countOf(value);
  return count ? RX_DURATION_UNITS.map((unit) => `${count} ${unit}`) : [];
};
// Medical History writes Since with its own units (hours too) and says
// "1 Day" but "2 Day(s)", as its Since field does.
const sinceOptions = ({ value } = {}) => {
  const count = countOf(value);
  return count ? SINCE_UNITS.map((unit) => `${count} ${parseFloat(count) <= 1 ? unit.singular : unit.plural}`) : [];
};

// The Rx pad's own column order and labels for each kind of fact, with the
// row key each column reads. A row is corrected in these columns, so a column
// also says how its cell is edited:
//   kind         "text", "multiline" (grows with its text), "select" (one of
//                a closed list), "suggest" (free text with a short list),
//                "segment" (one of two or three, all in view) or "measure"
//                (a reading with its unit beside it)
//   placeholder  the Rx pad's placeholder for that field
//   options      for a select, a segment or a suggestion list: a list, or a
//                function of { value, section, row } that returns one
//   unit         for a measure: the unit the Rx pad writes after the field
//   inputClass   the product's class for that input, where it has one
//   dictate      true on the one field of a row that takes dictation
//   wide         the column shares the spare width; the others are fixed
//   width        a fixed column's width in px, where the usual one for its
//                key does not suit
// A new kind of row is a new list of columns here, not new form code.
const NOTES = { key: "notes", label: "Notes", placeholder: "Notes", kind: "multiline", wide: true, dictate: true };
const SINCE = { key: "duration", label: "Since", placeholder: "Since", kind: "suggest", options: durationOptions };
const STATUS = { key: "status", label: "Status", placeholder: "Status", kind: "select", options: ({ section } = {}) => RX_STATUS[section] || [] };
// Medical History's own fields, in its order: Status, Since, Note.
const HISTORY_STATUS = { key: "status", label: "Status", kind: "segment", options: STATUS_OPTIONS, width: 168 };
const HISTORY_SINCE = { key: "duration", label: "Since", placeholder: "Select duration", kind: "suggest", options: sinceOptions, width: 136 };
const HISTORY_NOTES = { ...NOTES, label: "Note", placeholder: "Enter any specific notes here" };
const HISTORY_MEDICATION = { key: "medication", label: "Medication", kind: "segment", options: MEDICATION_OPTIONS, width: 132 };
const HISTORY_RELATION = { key: "relation", label: "Relationship", placeholder: "Select relationship", kind: "select", options: RELATIONSHIP_LIST, width: 184 };
const HISTORY_DATE = { key: "date", label: "Date of surgery", placeholder: "Year or date", kind: "text", width: 148 };
const historyName = (label, placeholder) => ({ key: "name", label, placeholder, kind: "text", wide: true });

// Medical History, section by section, with the fields that section has in
// the Rx pad (see medicalHistory.js). Keyed by VoiceRx's row type.
export const HISTORY_COLUMNS = {
  medical_condition: [historyName("Medical condition", "Medical condition"), HISTORY_STATUS, HISTORY_SINCE, HISTORY_MEDICATION, HISTORY_NOTES],
  allergy: [historyName("Allergy", "Allergy"), HISTORY_STATUS, HISTORY_SINCE, HISTORY_NOTES],
  surgery: [historyName("Surgery", "Surgical history"), HISTORY_DATE, { ...HISTORY_NOTES, label: "Remarks" }],
  family_history: [historyName("Family history", "Condition in the family"), HISTORY_RELATION, HISTORY_NOTES],
  lifestyle: [historyName("Lifestyle", "Lifestyle"), HISTORY_STATUS, HISTORY_SINCE, HISTORY_NOTES],
  others: [{ key: "name", label: "Additional history", placeholder: "Additional history", kind: "multiline", wide: true, dictate: true }],
};
// A reading as the Rx pad's vitals take it: "Enter", with the unit after it.
const vital = (key, label, unit) => ({ key, label, placeholder: "Enter", kind: "measure", unit, inputClass: "inputheight41-group" });

export const RX_COLUMNS = {
  // The Rx pad's diagnosis row (name, since, status, notes), with the two
  // fields the database keeps beside it: the type and the ICD-10 code.
  DX: [
    { key: "name", label: "Diagnosis", placeholder: "Diagnosis Name", kind: "text", wide: true },
    { key: "type", label: "Type", placeholder: "Type", kind: "select", options: DX_TYPE_OPTIONS, width: 132 },
    SINCE,
    STATUS,
    { key: "icd_code", label: "ICD-10", placeholder: "Code", kind: "text", width: 96 },
    NOTES,
  ],
  // The Rx pad's surgery row (name, notes), with the fields the inpatient
  // record keeps beside it: type, date, time and anaesthetic type.
  PROC: [
    { key: "name", label: "Surgery / procedure", placeholder: "Surgeries/Procedures Name", kind: "text", wide: true },
    { key: "type", label: "Type", placeholder: "Type", kind: "select", options: PROC_TYPE_OPTIONS, width: 132 },
    { key: "date", label: "Date", placeholder: "Date", kind: "text" },
    { key: "time", label: "Time", placeholder: "Time", kind: "text", width: 96 },
    { key: "anaesthesia", label: "Anaesthesia", placeholder: "Type", kind: "text", width: 148 },
    NOTES,
  ],
  MED: [
    { key: "name", label: "Medicine", placeholder: "Medicine Name", kind: "text", wide: true },
    // Beside the Rx pad's own columns: what is in it and what it comes as
    // (the medicine master's generic and type).
    { key: "generic", label: "Generic", placeholder: "Generic name", kind: "text", wide: true },
    { key: "type", label: "Form", placeholder: "Form", kind: "suggest", options: MED_FORMS, width: 128 },
    { key: "dosage", label: "Unit per dose", placeholder: "e.g 1 Tablet", kind: "text" },
    { key: "frequency", label: "Frequency", placeholder: "e.g 1-0-1", kind: "suggest", options: RX_SUGGESTIONS.frequency },
    { key: "when", label: "When", placeholder: "e.g Before Food", kind: "suggest", options: RX_SUGGESTIONS.when },
    { key: "duration", label: "Duration", placeholder: "e.g 1 Day", kind: "suggest", options: durationOptions },
    { ...NOTES, label: "Note" },
  ],
  LAB: [
    { key: "reportName", label: "Report", placeholder: "Report", kind: "suggest", options: LAB_REPORTS, width: 168 },
    { key: "testName", label: "Test", placeholder: "Test name", kind: "text", wide: true },
    { key: "value", label: "Value", placeholder: "Value", kind: "measure", inputClass: "lab-params-input" },
    { key: "units", label: "Unit", placeholder: "Unit", kind: "text" },
    { key: "refRange", label: "Ref. range", placeholder: "Ref. range", kind: "text" },
    { key: "date", label: "Date", placeholder: "Date", kind: "text" },
  ],
  // The Rx pad's vitals, in its order and with its units. It takes blood
  // pressure as two numbers; the row keeps them as one (120/80).
  VIT: [
    { key: "date", label: "Date", placeholder: "Date", kind: "text" },
    vital("temperature", "Temperature", "Frh"),
    vital("pulse", "Pulse", "/min"),
    vital("respiratory_rate", "Resp. Rate", "/min"),
    vital("blood_pressure", "BP", "mmHg"),
    vital("spo2", "SPO2", "%"),
    vital("height", "Height", "cms"),
    vital("weight", "Weight", "kgs"),
    NOTES,
  ],
  // The Rx pad's symptoms table.
  SYM: [
    { key: "name", label: "Symptom", placeholder: "Symptom Name", kind: "text", wide: true },
    SINCE,
    { key: "severity", label: "Severity", placeholder: "Severity", kind: "select", options: RX_SEVERITY, width: 132 },
    NOTES,
  ],
  RPT: [
    { key: "name", label: "Note", placeholder: "Note", kind: "text", wide: true },
    { key: "notes", label: "Details", placeholder: "Details", kind: "multiline", wide: true, dictate: true },
  ],
};

// Fields a reviewer may correct that the row shape has beside its columns.
// In the editor each gets a column of its own, after the one named by `under`.
export const RX_EXTRA_FIELDS = {
  LAB: [{ key: "arrowDirection", label: "Flag", placeholder: "Flag", kind: "select", options: RX_FLAG, under: "value" }],
};

// The vitals the Rx pad has a field for, in its order, with the short label
// each is written with on a row (BP: 102/74 | Pulse: 72).
const VITAL_LABELS = [["blood_pressure", "BP"], ["pulse", "Pulse"], ["spo2", "SpO2"], ["temperature", "Temp"], ["respiratory_rate", "RR"], ["weight", "Wt"], ["height", "Ht"]];
export const RX_VITAL_KEYS = VITAL_LABELS.map(([key]) => key);

// The columns one fact is corrected in: its kind's, except that whatever the
// Rx pad keeps under Medical History takes the fields of its section there.
export function rxColumns(finding) {
  const type = historyType(finding);
  if (type) return HISTORY_COLUMNS[type] || HISTORY_COLUMNS.others;
  if (finding.sym) return RX_COLUMNS.SYM;
  return RX_COLUMNS[finding.domain] || RX_COLUMNS.RPT;
}

// The columns of the table a fact is corrected in: its columns, with a lab's
// high / low flag after its value.
export function rxEditColumns(finding) {
  const extras = RX_EXTRA_FIELDS[finding.domain] || [];
  return rxColumns(finding).flatMap((column) => [column, ...extras.filter((extra) => extra.under === column.key)]);
}

// The fields a reviewer may correct, as column definitions in tab order.
// Something recorded as "none" (enable N) has no status, duration or
// medication: only its name and a note. A complaint runs long, so its name
// grows with the text.
const NOT_FOR_NONE = ["status", "duration", "medication"];
export function rxEditFields(finding) {
  const { section, row } = rxRow(finding);
  return rxEditColumns(finding)
    .filter((column) => !(row.enable === "N" && NOT_FOR_NONE.includes(column.key)))
    .map((column) => (section === "symptoms" && !finding.sym && column.key === "name" ? { ...column, kind: "multiline" } : column));
}

// The same fields by key.
export function rxEditKeys(finding) {
  return rxEditFields(finding).map((column) => column.key);
}

// What a row cannot be saved without: its first column, and for a lab the
// value too. Vitals have no single must-have field (a set may be weight and
// height only); the form asks for at least one reading instead.
export function rxRequired(finding) {
  if (finding.domain === "VIT") return [];
  if (finding.domain === "LAB") return ["testName", "value"];
  return [rxColumns(finding)[0].key];
}

// A status that is worth a word in the bracket after the name. "Suspected"
// and "Ruled out" are the amber ones.
const STATUS_QUAL = { Suspected: { v: "Suspected", tone: "warning" }, "Ruled Out": { v: "Ruled out", tone: "warning" }, Inactive: "Inactive" };
const qualText = (item) => String(item?.v || item || "").toLowerCase();

// The inverse of rxRow: what a corrected row means for the fact's own fields
// (title, detail, value, quals, facts, flags), so the rows, the summary and
// search all say what the correction says. `finding` is the fact as read.
// Only what was changed is rewritten: an untouched field keeps the reading's
// own wording and qualifiers.
export function factFromRx(finding, row) {
  const { section, row: read } = readRow(finding);
  const text = (key) => String(row[key] ?? "").trim();
  const changed = (...keys) => keys.some((key) => text(key) !== String(read[key] ?? "").trim());
  const fact = {};
  const rename = (key = "name") => {
    if (!changed(key)) return;
    fact.title = text(key);
    if (finding.label) fact.label = fact.title;
  };
  // Notes are the details; correcting them also retires the short form the
  // summary used in their place.
  const renote = () => {
    if (!changed("notes")) return;
    fact.detail = text("notes");
    fact.short = undefined;
  };
  // The bracket after the name: the status word first, then the notes and
  // the duration as typed. Rebuilt only when one of them was corrected.
  const requalify = () => {
    if (!changed("status", "duration", "notes")) return;
    const lead = STATUS_QUAL[text("status")] ? [STATUS_QUAL[text("status")]] : [];
    const rest = changed("duration", "notes")
      ? [...parts(text("notes")), text("duration")].filter(Boolean)
      : (finding.quals || []).filter((item) => !item.tone);
    fact.quals = [...lead, ...rest.filter((item) => !lead.some((first) => qualText(first) === qualText(item)))];
  };

  switch (section) {
    case "lab_results":
      rename("testName");
      fact.value = text("value");
      fact.unit = text("units");
      fact.range = text("refRange");
      fact.abnormal = row.arrowDirection === "up" ? "H" : row.arrowDirection === "down" ? "L" : "";
      if (changed("date")) fact.dateLabel = text("date");
      // The headline value is the newest point of the trend.
      if (finding.series && changed("value", "arrowDirection")) {
        fact.series = finding.series.map((point, index) =>
          index === finding.series.length - 1 ? { ...point, v: fact.value, f: fact.abnormal || undefined } : point,
        );
      }
      break;
    case "vitals_and_body_composition":
      if (changed("date")) fact.dateLabel = text("date");
      if (changed(...RX_VITAL_KEYS, "notes")) {
        // Notes open with the moment ("At discharge"); what follows are the
        // readings the Rx pad has no field for ("GCS 15").
        const [moment, ...others] = text("notes").split(/\s*,\s*/).filter(Boolean);
        if (moment) fact.title = moment;
        fact.facts = [
          ...VITAL_LABELS.filter(([key]) => text(key)).map(([key, k]) => ({ k, v: text(key) })),
          ...others.map((part) => {
            const at = part.indexOf(" ");
            return at < 0 ? { k: "", v: part } : { k: part.slice(0, at), v: part.slice(at + 1) };
          }),
        ];
        fact.detail = fact.facts.map((item) => `${item.k} ${item.v}`.trim()).join(" · ");
      }
      break;
    case "medications":
      rename();
      if (changed("dosage", "frequency", "when", "duration", "notes")) {
        fact.detail = ["dosage", "frequency", "when", "duration", "notes"].map(text).filter(Boolean).join(" · ");
      }
      break;
    case "diagnosis":
      rename();
      renote();
      // The type decides the tag the diagnosis sits under.
      if (changed("type")) fact.role = roleOfDxType(text("type"));
      if (changed("icd_code")) fact.coding = text("icd_code") ? `ICD-10 ${text("icd_code")}` : "";
      // Suspected is never dropped or added by itself: only a reviewer
      // choosing another status changes it.
      if (changed("status")) {
        const flags = (finding.flags || []).filter((flag) => flag !== "suspected");
        fact.flags = text("status") === "Suspected" ? [...flags, "suspected"] : flags;
        fact.certainty = text("status").toLowerCase() || finding.certainty;
      }
      requalify();
      break;
    case "surgery":
      rename();
      renote();
      // The type decides the tag the procedure sits under.
      if (changed("type")) fact.role = roleOfProcType(text("type"));
      if (changed("date")) fact.dateLabel = text("date");
      break;
    case "medical_history":
      // "None" is written with the word in front: No known drug allergy.
      if (row.enable === "N" && changed("name")) {
        fact.title = `No ${lowerFirst(text("name"))}`;
        if (finding.label) fact.label = `No known ${lowerFirst(text("name"))}`;
      } else rename();
      renote();
      requalify();
      break;
    case "symptoms":
      if (finding.sym) {
        rename();
        break;
      }
      // The complaint is the symptom's name; its heading stays.
      if (changed("name")) {
        fact.detail = text("name");
        fact.short = undefined;
      }
      break;
    default:
      rename();
      renote();
      if (finding.quals) requalify();
  }
  return fact;
}

// The short bracket after a medicine name, in Rx pad order:
// Nexium 40 mg (1, OD, PO, Qty 7)
// A remark about how well something was read ("frequency drawn as tally
// marks", "could not be read") is not a clinical fact. It never shows in a
// row: the part is simply left out, and the row keeps its doubt mark.
const READER_REMARK = /tally|not read|unreadable|illegible|not legible|could not be read|cannot be read|can't be read|unclear|read two ways|read as |hard to read|no strength written|not written|as drawn/i;
const ROLE_WORD = /^(final|working|secondary|primary|provisional|principal)( dx| diagnosis)?(, as written)?$|^past (history|surgery)$|^as written$/i;
export const isReaderRemark = (text) => READER_REMARK.test(typeof text === "string" ? text : text?.v || "");

// What a row's bracket leaves out when a doctor is reading, not reviewing.
// Nothing is lost: the full row is in Clinical data and on the page.
//   form     "Tablet", "Capsule", "by mouth": the medicine's name already says it
//   count    "1 Tablet" beside 1-0-1 says nothing new; "2 Tablets" stays as "2 per dose"
//   proof    "Stated on 8 pages": the citations beside the row say where
//   routine  "under aseptic technique"
//   echo     a bracket that only repeats the row's own name, as its short form
const FORM_WORD = /^(tab(let)?s?|cap(sule)?s?|syr(up)?|susp(ension)?|inj(ection)?|drops?|oint(ment)?|cream|gel|lotion|solution|dressing|sachets?|po|p\/o|oral(ly)?|per oral|by mouth)\.?$|^form (printed|written) as /i;
const ROUTE = /^(iv|im|sc|s\/c|sl|pr|pv|id|topical|local application|nebuli[sz](ed|ation)|inhal(ed|ation)|intranasal|both eyes|(left|right) eye|[lrb]e|via .{1,14}|iv infusion|iv bolus)$/i;
const ORAL_SOLID = /^(tablet|capsule)s?$/i;
// A note that only repeats the form ("nebulised" on a nebulisation).
const FORM_ECHO = { nebulisation: /^(nebuli[sz](ed|ation)|inhal(ed|ation))$/i, injection: /^inj(ection)?\.?$/i, "eye drops": /^(eye )?drops?$/i, dressing: /^dressing$/i };
const PROOF = /^stated on \d+ pages?$/i;
const ROUTINE = /^under aseptic (technique|precautions?)$/i;
const NOTES_FIT = 40;
const text = (item) => (typeof item === "string" ? item : item?.v || "");

const perDose = (dosage) => {
  if (!dosage) return null;
  const count = dosage.replace(/\s*(tablets?|tabs?|capsules?|caps?)\.?$/i, "").trim();
  if (count !== dosage.trim()) return count === "1" || !count ? null : `${count} per dose`;
  return /[a-z]/i.test(dosage) ? dosage : `${dosage} per dose`;
};

// "s/p WLE (2016)" after "… after wide local excision (2016)": every number
// and word of the bracket is already in the name, spelled out or as initials.
function echoesTitle(qual, title = "") {
  const name = title.toLowerCase();
  const words = name.match(/[a-z]+/g) || [];
  const tokens = text(qual).toLowerCase().match(/[a-z0-9]+/g) || [];
  const said = tokens.filter((token) => !["s", "p", "sp", "post", "after", "status"].includes(token));
  if (!said.length) return false;
  return said.every((token) => {
    if (/^\d+$/.test(token)) return name.includes(token);
    if (words.includes(token)) return true;
    // initials of words that follow one another in the name
    return token.length >= 2 && token.length <= 5 && words.some((_, at) => words.slice(at, at + token.length).map((word) => word[0]).join("") === token);
  });
}

// "9 Jul 2026" as the product writes a date on a row: 09 Jul'26.
const shortDate = (label = "") => String(label).replace(/^(\d) /, "0$1 ").replace(/ 20(\d\d)$/, "'$1");

export function rxQuals(finding) {
  // What kind of diagnosis or history item this is, is said by the tag above
  // the row ("Final diagnosis", "Medical conditions"), never inside its bracket.
  // A history item's bracket is read off its Rx pad fields, so it always says
  // what is stored (and what a reviewer corrected).
  if (historyType(finding) && (finding.history || finding.rx)) return historyQuals(rxRow(finding).row);
  // A diagnosis likewise: status where it is not plain ("Suspected", "Ruled
  // out", in amber), since, then the note. "Confirmed" is not said; the ICD
  // code and the type are stored, not read out (the tag above says the type).
  if (isDiagnosis(finding) && (finding.dx || finding.rx)) {
    const { status, duration, notes } = rxRow(finding).row;
    const note = String(notes || "").trim();
    return [STATUS_QUAL[status], duration, note ? (note.length <= NOTES_FIT ? lowerFirst(note) : { v: "note", tip: note }) : null].filter(Boolean);
  }
  // A symptom: how long, how bad, then the note.
  if (finding.sym) {
    const { duration, severity, notes } = rxRow(finding).row;
    const note = String(notes || "").trim();
    return [duration, severity ? severity.toLowerCase() : null, note ? (note.length <= NOTES_FIT ? lowerFirst(note) : { v: "note", tip: note }) : null].filter(Boolean);
  }
  // A procedure: when it was done, the anaesthetic, then the note. The time
  // of day and the type are stored, not read out.
  if (isProcedure(finding) && (finding.proc || finding.rx)) {
    const { date, anaesthesia, notes } = rxRow(finding).row;
    const note = String(notes || "").trim();
    return [shortDate(date), anaesthesia, note ? (note.length <= NOTES_FIT ? note : { v: "note", tip: note }) : null].filter(Boolean);
  }
  if (finding.domain !== "MED") {
    return finding.quals?.filter((item) => !isReaderRemark(item) && !ROLE_WORD.test(text(item)) && !PROOF.test(text(item)) && !ROUTINE.test(text(item)) && !echoesTitle(item, finding.label || finding.title));
  }
  const { type = "", dosage, frequency, when, duration, notes } = rxRow(finding).row;
  // A tablet or a capsule is the usual thing and is not said. Any other form
  // changes how the medicine is given, so it leads the bracket: (injection, ...).
  const form = type && !ORAL_SOLID.test(type) ? type.toLowerCase() : null;
  const saysForm = form && FORM_ECHO[form];
  const extra = notes.split(", ").map((item) => item.trim()).filter((item) => item && !isReaderRemark(item) && !FORM_WORD.test(item) && !(saysForm && saysForm.test(item)));
  const routes = extra.filter((item) => ROUTE.test(item));
  const said = extra.filter((item) => !ROUTE.test(item));
  // A short note stays on the line. A long one waits behind "note": hover or
  // focus shows it whole.
  const fits = said.join(", ").length <= NOTES_FIT;
  return [form, perDose(dosage), frequency, when, duration, ...routes, ...(fits ? said : [{ v: "note", tip: said.join(", ") }])].filter((item) => item && !isReaderRemark(item));
}

// The whole file as the Rx pad's `digitization` object: what "Copy to RxPad"
// sends and what the backend stores. `_source` keeps each row traceable to
// the fact, its source page and its review state.
//   status       "draft" until a reviewer verifies the row
//   corrected    true when a reviewer changed the reading; `readAs` is then
//                the row as it was read from the page, in the same shape
//   reviewedBy / reviewedAt   who verified or corrected it, when known
export function buildDigitization(findings, { statusOf = () => "draft", reviewOf = () => null } = {}) {
  const digitization = {};
  findings.forEach((finding) => {
    const { section, row } = rxRow(finding);
    const read = finding.original;
    const review = reviewOf(finding);
    const entry = {
      ...row,
      _source: {
        factId: finding.id,
        encounterId: finding.encounterId,
        page: finding.cite?.page,
        region: finding.cite?.rid,
        asWritten: (read || finding).verbatim,
        confidence: finding.confidence,
        status: statusOf(finding),
        ...(read ? { corrected: true, readAs: readRow(read).row } : null),
        ...(review ? { reviewedBy: review.by, reviewedAt: review.at } : null),
      },
    };
    // A test read several times is one row per reading, each with its own
    // date, so a trend can be drawn from the stored rows alone.
    if (section === "lab_results" && finding.series?.length > 1) {
      const year = (finding.dateLabel || "").match(/\d{4}$/)?.[0] || "";
      finding.series.forEach((point, index) => {
        const latest = index === finding.series.length - 1;
        (digitization[section] = digitization[section] || []).push(
          latest ? entry : { ...entry, value: point.v, arrowDirection: point.f === "H" ? "up" : point.f === "L" ? "down" : "", date: [point.d, year].filter(Boolean).join(" ") },
        );
      });
      return;
    }
    (digitization[section] = digitization[section] || []).push(entry);
  });
  return digitization;
}
