/**
 * Every fact in the Rx pad's own structure.
 *
 * A fact read from a paper file is only useful downstream (copy into today's
 * prescription, analytics, exchange with another system) if it is stored the
 * way the product already stores that kind of thing. So each fact is mapped
 * onto the row shape the Rx pad and VoiceRx use, with the same keys:
 *
 *   Diagnosis        name, duration, status, notes, icd_code
 *   Medication       name, dosage (unit per dose), frequency, when, duration, notes
 *   Surgery          name, notes
 *   Medical history  type, name, enable, status, duration, date, notes
 *   Lab result       reportName, testName, value, units, refRange, arrowDirection, date
 *   Vitals           temperature, pulse, respiratory_rate, blood_pressure, spo2, height, weight, date
 *   Symptom          name, duration, severity, notes
 *   Investigation    name, notes
 *   Follow-up, Others  text
 *
 * Rules:
 *   - A field is filled only from what the page says. Nothing is computed
 *     (no duration from a quantity) and nothing is guessed (no "After Food").
 *   - Frequency is converted to the Rx pad's short forms only where the
 *     conversion is exact: "1x1" is OD, "2x1" BD, "3x1" TDS, "4x1" QID,
 *     "when needed" SOS. Anything else is kept as written.
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

const TIMES_A_DAY = { 1: "OD", 2: "BD", 3: "TDS", 4: "QID" };
const FORM = { tab: "Tablet", tabs: "Tablet", tablet: "Tablet", tablets: "Tablet", cap: "Capsule", caps: "Capsule", capsule: "Capsule", capsules: "Capsule", ml: "ml" };
const parts = (text = "") => text.split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean);
const upperFirst = (text = "") => (text ? text[0].toUpperCase() + text.slice(1) : text);
const lowerFirst = (text = "") => (text ? text[0].toLowerCase() + text.slice(1) : text);

// A reading that is in doubt (two ways to read it, pages that differ, hard to
// read) is never tidied into a short form: it would look settled when it is not.
const DOUBTFUL = ["ambiguous", "conflict", "conflictingValue", "lowConfidence", "partlyRead"];
const inDoubt = (finding) => Boolean(finding.hold) || finding.confidence < 0.7 || (finding.flags || []).some((flag) => DOUBTFUL.includes(flag));

function medication(finding) {
  const row = { name: finding.title, dosage: "", frequency: "", when: "", duration: "", notes: "" };
  const notes = [];
  const doubt = inDoubt(finding);
  parts(finding.detail).forEach((part) => {
    let m;
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
const NOTE_SECTION = { complaint: "symptoms", followUp: "follow_up", investigation: "lab_investigation" };

// The row as it was read from the page.
function readRow(finding) {
  // "Suspected" is carried over. "Confirmed" is said only for a final
  // diagnosis read clearly; anything else gets no status at all, because the
  // page did not give one and a reviewer has not chosen one.
  const status = finding.flags?.includes("suspected") ? "Suspected" : finding.role === "final" && !inDoubt(finding) ? "Confirmed" : "";
  switch (finding.domain) {
    case "DX":
      if (finding.role === "chronic") {
        return { section: "medical_history", row: { type: "medical_condition", name: finding.title, enable: "Y", status: "", duration: "", notes: finding.detail || "" } };
      }
      return { section: "diagnosis", row: { name: finding.title, duration: "", status, notes: finding.detail || "", icd_code: (finding.coding || "").replace(/^ICD-10\s*/i, "").split(" ")[0] || "" } };
    case "ALG":
      return { section: "medical_history", row: { type: "allergy", name: finding.negative ? "Drug allergy" : finding.title, enable: finding.negative ? "N" : "Y", status: finding.negative ? "" : "Active", duration: "", notes: finding.detail || "" } };
    case "PROC":
      if (finding.role === "pastSurgery") {
        return { section: "medical_history", row: { type: "surgery", name: finding.title, enable: "Y", date: "", notes: finding.detail || "" } };
      }
      return { section: "surgery", row: { name: finding.title, notes: finding.detail || "" } };
    case "MED":
      return { section: "medications", row: medication(finding) };
    case "LAB":
      return {
        section: "lab_results",
        row: { reportName: "", testName: finding.title, value: finding.value || "", units: finding.unit || "", refRange: finding.range || "", arrowDirection: finding.abnormal === "H" ? "up" : finding.abnormal === "L" ? "down" : "", date: finding.dateLabel || "" },
      };
    case "VIT":
      return { section: "vitals_and_body_composition", row: vitals(finding) };
    default: {
      const section = NOTE_SECTION[finding.role] || "others";
      if (section === "symptoms") return { section, row: { name: finding.detail || finding.title, duration: "", severity: "", notes: "" } };
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

// The Rx pad's own column order and labels for each kind of fact, with the
// row key each column reads. Used to lay facts out as a table and to edit
// them field by field.
export const RX_COLUMNS = {
  DX: [{ key: "name", label: "Diagnosis", wide: true }, { key: "status", label: "Status" }, { key: "duration", label: "Since" }, { key: "notes", label: "Notes", wide: true }],
  ALG: [{ key: "name", label: "Allergy", wide: true }, { key: "status", label: "Status" }, { key: "duration", label: "Since" }, { key: "notes", label: "Notes", wide: true }],
  PROC: [{ key: "name", label: "Surgery / procedure", wide: true }, { key: "notes", label: "Notes", wide: true }],
  MED: [{ key: "name", label: "Medicine", wide: true }, { key: "dosage", label: "Unit per dose" }, { key: "frequency", label: "Frequency" }, { key: "when", label: "When" }, { key: "duration", label: "Duration" }, { key: "notes", label: "Notes", wide: true }],
  LAB: [{ key: "testName", label: "Test", wide: true }, { key: "value", label: "Value" }, { key: "units", label: "Unit" }, { key: "refRange", label: "Ref. range" }, { key: "date", label: "Date" }],
  VIT: [{ key: "date", label: "Date" }, { key: "blood_pressure", label: "BP" }, { key: "pulse", label: "Pulse" }, { key: "spo2", label: "SpO2" }, { key: "temperature", label: "Temp" }, { key: "respiratory_rate", label: "RR" }, { key: "weight", label: "Weight" }, { key: "height", label: "Height" }, { key: "notes", label: "Notes", wide: true }],
  RPT: [{ key: "name", label: "Note", wide: true }, { key: "notes", label: "Details", wide: true }],
};

// The vitals the Rx pad has a field for, in its order, with the short label
// each is written with on a row (BP: 102/74 | Pulse: 72).
const VITAL_LABELS = [["blood_pressure", "BP"], ["pulse", "Pulse"], ["spo2", "SpO2"], ["temperature", "Temp"], ["respiratory_rate", "RR"], ["weight", "Wt"], ["height", "Ht"]];
export const RX_VITAL_KEYS = VITAL_LABELS.map(([key]) => key);

// What the Rx pad offers for a field. Frequency and When still take free
// text; a status is one of its list.
export const RX_SUGGESTIONS = {
  frequency: ["OD", "BD", "TDS", "QID", "SOS", "HS", "Stat"],
  when: ["Before Food", "After Food", "Empty Stomach", "Bed Time"],
};
export const RX_STATUS = {
  diagnosis: ["Confirmed", "Suspected", "Ruled Out"],
  medical_history: ["Active", "Inactive"],
};

// The fields a reviewer may correct, in column order. A lab also has its
// high / low flag. Something recorded as "none" (enable N) has no status.
export function rxEditKeys(finding) {
  const { row } = rxRow(finding);
  const keys = (RX_COLUMNS[finding.domain] || RX_COLUMNS.RPT).map((column) => column.key).filter((key) => !(key === "status" && row.enable === "N"));
  return finding.domain === "LAB" ? [...keys, "arrowDirection"] : keys;
}

// What a row cannot be saved without: its first column, and for a lab the
// value too. Vitals have no single must-have field (a set may be weight and
// height only); the form asks for at least one reading instead.
export function rxRequired(finding) {
  if (finding.domain === "VIT") return [];
  if (finding.domain === "LAB") return ["testName", "value"];
  return [(RX_COLUMNS[finding.domain] || RX_COLUMNS.RPT)[0].key];
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
      // Suspected is never dropped or added by itself: only a reviewer
      // choosing another status changes it.
      if (changed("status")) {
        const flags = (finding.flags || []).filter((flag) => flag !== "suspected");
        fact.flags = text("status") === "Suspected" ? [...flags, "suspected"] : flags;
        fact.certainty = text("status").toLowerCase() || finding.certainty;
      }
      requalify();
      break;
    case "medical_history":
      // "None" is written with the word in front: No known drug allergy.
      if (row.enable === "N" && changed("name")) {
        fact.title = `No ${lowerFirst(text("name"))}`;
        fact.label = `No known ${lowerFirst(text("name"))}`;
      } else rename();
      renote();
      requalify();
      break;
    case "symptoms":
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
export function rxQuals(finding) {
  if (finding.domain !== "MED") return finding.quals;
  const { dosage, frequency, when, duration, notes } = rxRow(finding).row;
  return [dosage ? (/[a-z]/i.test(dosage) ? dosage : `${dosage} per dose`) : null, frequency, when, duration, notes].filter(Boolean);
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
    (digitization[section] = digitization[section] || []).push(entry);
  });
  return digitization;
}
