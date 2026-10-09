/**
 * Reading vitals out of the archive.
 *
 * The archive stores each reading as its own Observation with a machine code -
 * `bp_systolic`, `bp_diastolic`, `spo2` - which is how it is indexed, not how
 * it is read. Two things follow from that, and both matter clinically:
 *
 *   A doctor does not read "bp_diastolic". Codes are translated to the words
 *   on the chart before they reach the screen, exactly as `Composition` is
 *   said as "Consultation note".
 *
 *   A blood pressure is a pair. Systolic and diastolic arrive as two rows, but
 *   106 and 77 sitting on separate lines is not a blood pressure - 106/77 is.
 *   Splitting the number the doctor actually reads across two rows makes them
 *   reassemble it every time, and pairs are where transcription errors live.
 *
 * Nothing here interprets. No range, no high or low, no trend: the archive
 * stores none of those, and a value the portal has quietly judged is worse
 * than one it has merely reported.
 */

export const VITAL_LABELS = {
  bp_systolic: "Systolic blood pressure",
  bp_diastolic: "Diastolic blood pressure",
  pulse: "Pulse",
  heart_rate: "Pulse",
  spo2: "SpO2",
  temp: "Temperature",
  temperature: "Temperature",
  weight: "Weight",
  height: "Height",
  resp_rate: "Respiratory rate",
  respiratory_rate: "Respiratory rate",
  bmi: "BMI",
}

/* Short forms, for the chart-style row where space is the constraint. */
export const VITAL_SHORT = {
  bp_systolic: "BP systolic",
  bp_diastolic: "BP diastolic",
  pulse: "Pulse",
  heart_rate: "Pulse",
  spo2: "SpO2",
  temp: "Temp",
  temperature: "Temp",
  weight: "Weight",
  height: "Height",
  resp_rate: "Resp rate",
  respiratory_rate: "Resp rate",
  bmi: "BMI",
}

export const VITAL_PATTERN =
  /systolic|diastolic|pulse|heart.?rate|spo2|temp|weight|height|resp|bmi|blood.?pressure/i

export function isVital(code) {
  return VITAL_PATTERN.test(String(code || ""))
}

export function vitalLabel(code) {
  const key = String(code || "").toLowerCase()
  return (
    VITAL_LABELS[key] ||
    String(code || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  )
}

export function vitalShortLabel(code) {
  const key = String(code || "").toLowerCase()
  return VITAL_SHORT[key] || vitalLabel(code)
}

export function readingOf(evidence) {
  if (!evidence) return ""
  if (evidence.value_num != null) {
    /* Trailing ".0" on an integer reading is noise the archive's float type
       introduced, not precision the clinician recorded. */
    const num = Number(evidence.value_num)
    const text = Number.isInteger(num) ? String(num) : String(evidence.value_num)
    return evidence.unit ? `${text} ${evidence.unit}` : text
  }
  return evidence.value_text || ""
}

/**
 * Pairs systolic and diastolic into the reading a doctor actually says.
 *
 * Returns `{ pair, rest }` - the blood pressure if both halves are present,
 * and everything else untouched. One half on its own stays in `rest`: "106/–"
 * would be a fabrication of the missing number.
 */
export function pairBloodPressure(rows) {
  const codeOf = (row) => String((row.evidence && row.evidence.code) || "").toLowerCase()
  const systolic = rows.find((row) => codeOf(row) === "bp_systolic")
  const diastolic = rows.find((row) => codeOf(row) === "bp_diastolic")

  if (!systolic || !diastolic) return { pair: null, rest: rows }

  const unit = (systolic.evidence && systolic.evidence.unit) || "mmHg"
  const value = `${readingOf(systolic.evidence).replace(/\s*\D*$/, "")}/${readingOf(
    diastolic.evidence
  ).replace(/\s*\D*$/, "")} ${unit}`.trim()

  return {
    pair: {
      label: "Blood pressure",
      value,
      /* Ascending, so the tags read [1] [2] rather than in whatever order
         the pair happened to be assembled. */
      citations: [systolic.number, diastolic.number]
        .filter((n) => n != null)
        .sort((a, b) => a - b),
      recorded:
        (systolic.citation && systolic.citation.event_date) ||
        (diastolic.citation && diastolic.citation.event_date) ||
        "",
      status: (systolic.evidence && systolic.evidence.status) || "",
    },
    rest: rows.filter((row) => row !== systolic && row !== diastolic),
  }
}

/**
 * Every vital recorded at one visit, whether or not it was cited.
 *
 * This is what makes a vitals citation worth opening. A single reading in
 * isolation answers "what was it" and nothing else; the set it was taken with
 * answers "what was going on", which is the question a doctor is really
 * asking when they check a blood pressure.
 */
export function vitalsAtVisit(allEvidence, visitId) {
  if (!visitId) return []
  return (allEvidence || [])
    .filter(
      (e) => e && e.resource_kind === "Observation" && e.visit_id === visitId && isVital(e.code)
    )
    .map((e) => ({
      code: e.code,
      label: vitalShortLabel(e.code),
      value: readingOf(e),
      status: e.status || "",
      sourcePath: e.source_path || "",
    }))
}
