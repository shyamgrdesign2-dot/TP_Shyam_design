import { parseRxNarrative } from "./rxNarrative"
import { isVital, readingOf, vitalLabel, vitalsAtVisit } from "./vitals"
import { conditionDetails, conditionName, conditionsAtVisit } from "./conditions"

/**
 * Turning a cited record into the document a doctor recognises.
 *
 * The archive already carries the consultation, written out, in
 * `evidence.text` on a Composition. So the prescription behind a citation does
 * not have to be reconstructed - it is the real one, laid out in the clinic's
 * print order with the cited phrase lit up in it. That distinction matters:
 * a doctor checking a citation is checking whether the answer matches what
 * *they wrote*, and a plausible sheet answers a different question.
 *
 * Three shapes come out of here:
 *
 *   rx      a consultation with a narrative - rendered as the printed sheet
 *   vitals  a structured Observation - rendered as the reading and its context
 *   record  anything else - rendered as plain fields and provenance
 *
 * `kind: "document"` (an uploaded PDF) is in the contract and not yet built.
 */

function titleCase(text) {
  return String(text || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Which phrase to light up inside the document.
 *
 * Prefers a `==marked==` phrase from the answer that genuinely appears in this
 * record, because that is the phrase the doctor just read. Falls back to the
 * record's own code so a citation always highlights something - an opened
 * document with nothing marked reads as a dead end.
 */
function pickHighlight(row, phrases) {
  const evidence = row.evidence || {}
  const haystacks = [evidence.code, evidence.value_text, evidence.text]
    .filter(Boolean)
    .map((h) => String(h).toLowerCase())

  const hit = (phrases || []).find((phrase) => {
    const needle = String(phrase).toLowerCase()
    return haystacks.some((h) => h.includes(needle))
  })

  return hit || evidence.code || ""
}

/**
 * The consultation this record was written during.
 *
 * A vital is recorded at a visit, and the visit is usually also in the
 * evidence list as a Composition. Joining them on `visit_id` is what lets a
 * blood pressure open the consultation it was taken at, rather than a bare
 * number with no context. Nothing is fabricated by the join: if no sibling
 * Composition came back, none is shown.
 */
function findVisitNarrative(row, allEvidence) {
  const visitId = (row.citation && row.citation.visit_id) || (row.evidence && row.evidence.visit_id)
  if (!visitId) return null
  const sibling = (allEvidence || []).find(
    (e) => e && e.resource_kind === "Composition" && e.visit_id === visitId && e.text
  )
  return sibling ? sibling.text : null
}

export function toEvidenceDocument(row, phrases, allEvidence) {
  if (!row) return null

  const citation = row.citation || {}
  const evidence = row.evidence || {}
  const kind = citation.resource_kind || citation.section || ""
  const highlight = pickHighlight(row, phrases)

  const visit = {
    id: citation.visit_id || evidence.visit_id || "",
    date: citation.event_date || "",
    recordedAt: evidence.event_at || "",
    lane: evidence.lane || "",
  }

  /* A consultation with its narrative: the printed sheet, for real. */
  const narrative = evidence.text || findVisitNarrative(row, allEvidence)
  if (narrative) {
    const parsed = parseRxNarrative(narrative)
    return {
      kind: "rx",
      number: row.number,
      visit,
      highlight,
      title: parsed.title || "Consultation",
      sections: parsed.sections,
      /* True only when the sheet is the visit's narrative rather than this
         record's own - the reading is real, the surrounding sheet is context. */
      viaVisit: !evidence.text,
      row,
    }
  }

  /* A structured reading with no narrative behind it.
     
     Shown with the rest of that visit's vitals around it, because a reading on
     its own answers "what was it" and nothing else. The set it was taken with
     is what a doctor is really checking when they open a blood pressure, and
     it costs nothing - those rows are already in the payload. */
  if (kind === "Observation" && isVital(evidence.code)) {
    return {
      kind: "vitals",
      number: row.number,
      visit,
      highlight,
      title: vitalLabel(evidence.code) || "Vital",
      value: readingOf(evidence),
      status: evidence.status || "",
      /* The cited row is identified by source_path, not by label: two visits
         can record the same vital, and the path is what the citation points
         at. */
      citedPath: citation.source_path || evidence.source_path || "",
      readings: vitalsAtVisit(allEvidence, visit.id),
      row,
    }
  }

  /* A diagnosis, shown with the problem list it was written into.
     
     One condition on its own says what was diagnosed; the list it sits in says
     what else was being carried at the same time, which is the context a
     doctor reads a diagnosis against. */
  if (kind === "Condition") {
    return {
      kind: "condition",
      number: row.number,
      visit,
      highlight,
      title: conditionName(evidence),
      status: evidence.status || "",
      details: conditionDetails(evidence),
      citedPath: citation.source_path || evidence.source_path || "",
      conditions: conditionsAtVisit(allEvidence, visit.id),
      row,
    }
  }

  return {
    kind: "record",
    number: row.number,
    visit,
    highlight,
    title: titleCase(evidence.code) || kind || "Record",
    row,
  }
}

/**
 * A one-line summary of the whole cited set, for the collapsed evidence bar.
 *
 * Counts what a doctor counts: how many visits, over what span, of what kind.
 * "3 records" alone says nothing about whether they are worth opening.
 */
export function summariseEvidence(cited) {
  const rows = cited || []
  const visits = new Set()
  const kinds = new Set()
  const dates = []

  for (const row of rows) {
    const citation = row.citation || {}
    if (citation.visit_id) visits.add(citation.visit_id)
    if (citation.resource_kind || citation.section) {
      kinds.add(citation.resource_kind || citation.section)
    }
    if (citation.event_date) dates.push(citation.event_date)
  }

  dates.sort()

  return {
    records: rows.length,
    visits: visits.size,
    kinds: [...kinds],
    from: dates[0] || "",
    to: dates[dates.length - 1] || "",
  }
}
