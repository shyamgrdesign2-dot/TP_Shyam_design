/**
 * Reading diagnoses out of the archive.
 *
 * A Condition row is one *recording* of a diagnosis, not one diagnosis. The
 * same condition carried across two visits comes back as two rows, and listing
 * them as written turns one problem into two - which is the difference between
 * a problem list and a log, and the doctor is asking for a problem list.
 *
 * So rows are grouped by condition, and the group carries when it was first
 * and last written down. Both dates matter: the first is when it entered the
 * record, the last is when someone confirmed it was still true.
 *
 * The flat evidence object drops fields the source row has. `fhir_source` on a
 * Condition carries the ICD code, free-text remarks and a since-when - exactly
 * what a doctor checks on a diagnosis - so they are read back out. Nothing is
 * inferred: a blank stays blank.
 */

function detail(evidence, key) {
  const source = (evidence && evidence.fhir_source) || {}
  const value = source[key]
  if (value == null) return ""
  const text = String(value).trim()
  return text && text.toLowerCase() !== "null" ? text : ""
}

export function conditionName(evidence) {
  return (
    String((evidence && evidence.code) || "").trim() ||
    detail(evidence, "diagnosis") ||
    "Condition"
  )
}

export function conditionDetails(evidence) {
  return {
    icd: detail(evidence, "icd_code"),
    since: detail(evidence, "since_when"),
    remarks: detail(evidence, "tcd_remarks"),
    type: detail(evidence, "type"),
  }
}

/**
 * One entry per condition, with every recording of it folded in.
 *
 * Returns `[{ name, status, icd, since, remarks, first, last, recordings,
 * citations }]` ordered by when the condition was last written down, most
 * recent first - which is the order a problem list is read in.
 */
export function groupConditions(rows) {
  const byName = new Map()

  for (const row of rows || []) {
    const evidence = row.evidence || {}
    const name = conditionName(evidence)
    const key = name.toLowerCase()
    const date = (row.citation && row.citation.event_date) || ""
    const extras = conditionDetails(evidence)

    if (!byName.has(key)) {
      byName.set(key, {
        name,
        status: evidence.status || "",
        icd: extras.icd,
        since: extras.since,
        remarks: extras.remarks,
        first: date,
        last: date,
        recordings: 0,
        citations: [],
      })
    }

    const entry = byName.get(key)
    entry.recordings += 1
    if (row.number != null) entry.citations.push(row.number)
    if (date) {
      if (!entry.first || date < entry.first) entry.first = date
      if (!entry.last || date > entry.last) entry.last = date
    }
    /* A later recording is the more current statement of the same condition,
       so its status and remarks win. Blanks never overwrite a value. */
    if (date && date === entry.last) {
      if (evidence.status) entry.status = evidence.status
      if (extras.remarks) entry.remarks = extras.remarks
      if (extras.icd) entry.icd = extras.icd
      if (extras.since) entry.since = extras.since
    }
  }

  return [...byName.values()]
    .map((entry) => ({ ...entry, citations: entry.citations.sort((a, b) => a - b) }))
    .sort((a, b) => String(b.last).localeCompare(String(a.last)))
}

/**
 * Every condition recorded at one visit, whether or not it was cited.
 *
 * The problem list as it stood at that moment - which is the context a doctor
 * wants when they open a diagnosis, in the same way the visit's other vitals
 * are the context for a blood pressure.
 */
export function conditionsAtVisit(allEvidence, visitId) {
  if (!visitId) return []
  return (allEvidence || [])
    .filter((e) => e && e.resource_kind === "Condition" && e.visit_id === visitId)
    .map((e) => ({
      name: conditionName(e),
      status: e.status || "",
      sourcePath: e.source_path || "",
      ...conditionDetails(e),
    }))
}
