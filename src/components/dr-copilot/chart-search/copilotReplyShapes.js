/**
 * One answer, one shape, wherever it comes from.
 *
 * A turn arrives either from the question just asked or from a conversation
 * restored off the server, and the doctor must not be able to tell which: a
 * restored thread has to carry the same cards, citations and patient matches
 * the live one did. So the mapping from the service's result to a panel reply
 * lives here, and both paths use it.
 */

import { buildCopilotEvidence, buildDiscoveryEvidence } from "./copilotApi"

/** The lead-in above a card, when the service sends none of its own. */
export const CHART_FALLBACK_LEAD = "Here's what the record shows."
export const CLINIC_FALLBACK_LEAD = "Here's what I found across your patients."

/** A selected-patient answer: cited Markdown, rendered as the chart card. */
export function chartReplyFromResult(result, question) {
  if (!result) return null

  /* "Which other patients have diabetes?" asked inside a chart.
     The service answers with a fixed refusal that ends "I cannot search
     across patients for clinical matches", which was true of this mode and is
     no longer true of the product: the hospital-wide search does exactly
     that. Repeating it would teach the doctor the wrong thing, so the portal
     answers for the whole product and offers the way through, carrying the
     question so it is not retyped. */
  if (result.response_kind === "other_patient") {
    const q = result.question || question
    /* Not a refusal any more: the dock moves the question to All hospital
       patients and asks it there. This chart keeps a line saying where it
       went, and the card stays as the way to send it again later. */
    return {
      text: "That question is about many patients, so Velora is answering it across the hospital.",
      autoSwitch: { target: "clinic", question: q },
      rxOutput: {
        kind: "scope_redirect",
        data: { target: "clinic", question: q },
      },
    }
  }


  const cited = buildCopilotEvidence(result)
  const markdown = String(result.answer || "").trim()

  if (!markdown) {
    return { text: "I could not find anything in this chart that answers that." }
  }
  /* Nothing cited means nothing to check, so the card would overstate it. */
  if (!cited.length) return { text: markdown }

  return {
    text: result.interpretation || CHART_FALLBACK_LEAD,
    rxOutput: {
      kind: "chart_answer",
      data: {
        markdown,
        intent: result.intent || null,
        cited,
        evidence: result.evidence || [],
        coverage: result.coverage || [],
        sessionId: result.session_id || null,
        requestId: result.request_id || null,
        question: result.question || question,
      },
    },
  }
}

/** A clinic-wide answer: the patients it found, as cards. */
export function clinicReplyFromResult(result, question) {
  if (!result) return null

  const patients = Array.isArray(result.patients) ? result.patients : []
  const text = String(result.interpretation || "").trim()
  const prose = String(result.answer || "").trim()

  if (!patients.length) {
    /* The mirror of the chart refusal: a question about one patient, asked
       where no patient is selected. The service answers "which patient do you
       mean?", which is a dead end next to the chart conversation that would
       answer it. Checked against preprod on 8 Oct 2026. */
    const asksForAPatient = /which patient|no patient is selected|select (?:the|a) patient/i.test(
      `${prose} ${text}`
    )
    if (asksForAPatient) {
      return {
        text: "That one is about a single patient, which this hospital-wide search cannot answer.",
        rxOutput: {
          kind: "scope_redirect",
          data: { target: "patient", question: result.question || question },
        },
      }
    }
    return { text: prose || text || "No patients matched that search." }
  }

  return {
    text: text || CLINIC_FALLBACK_LEAD,
    rxOutput: {
      kind: "patient_matches",
      data: {
        patients,
        summary: prose,
        resultScope: result.result_scope || null,
        /* The records each fact was read from, so every patient on the list
           can be checked against its source like a chart answer can. */
        cited: buildDiscoveryEvidence(result),
        evidence: result.evidence || [],
        actions: result.discovery_actions || null,
        question: result.question || question,
        requestId: result.request_id || null,
      },
    },
  }
}

export function replyFromResult(mode, result, question) {
  return mode === "find_patients"
    ? clinicReplyFromResult(result, question)
    : chartReplyFromResult(result, question)
}
