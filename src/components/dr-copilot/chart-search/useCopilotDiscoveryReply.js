/**
 * Copilot's clinic-wide answers: Find Patients.
 *
 * The same shape as useCopilotReply, for the other scope. No patient is
 * selected; questions run across the doctor's organisation and come back as
 * supported patient cards rather than a chart answer.
 *
 * One conversation for the clinic scope, kept beside the patient threads in
 * copilotSessionStore under the reserved id below, so leaving the appointments
 * page and coming back resumes the search the doctor was in the middle of.
 *
 * Show more is the service's own action: it reruns the saved search for the
 * next page, so the question is repeated verbatim with `intent:
 * discovery_more` and never rebuilt from the UI.
 *
 * Scope: every search covers the whole organisation. The service has no way
 * today to limit a search to the asking doctor's own patients - a question
 * worded that way is either ignored (numerical searches return the same
 * tenant-wide rows) or answered with nothing, because the records are
 * attributed to other clinicians. Both were checked against preprod on
 * 8 Oct 2026. Until the service takes an explicit scope, the UI must not
 * offer a filter it cannot keep.
 */

import { useCallback } from "react"
import { activityHandler, resetActivity } from "./copilotActivity"
import { getHospitalGroup } from "../surfaces/copilotScopeStore"
import { askCopilotDiscovery, createCopilotDiscoverySession, getCopilotToken } from "./copilotApi"
import { clearSession, getSession, setSession } from "./copilotSessionStore"
import { clinicReplyFromResult } from "./copilotReplyShapes"

/** The clinic conversation's slot in the per-doctor session store. */
export const COPILOT_CLINIC_SCOPE_ID = "__clinic__"

/* One conversation per hospital scope: "All my patients" and "All hospital
   patients" are different searches and keep separate sessions. */
export function clinicScopeId(group = getHospitalGroup()) {
  return group === "mine" ? "__clinic_mine__" : COPILOT_CLINIC_SCOPE_ID
}

const UNAUTHORIZED =
  "Velora could not authenticate with the record search service, so there is nothing to show yet."

const FALLBACK_LEAD = "Here's what I found across your patients."

export function useCopilotDiscoveryReply({ enabled = true } = {}) {
  return useCallback(
    (message, _patientId, options) => {
      if (!enabled) return undefined
      if (!getCopilotToken()) return Promise.resolve({ text: UNAUTHORIZED })

      const question = String(message || "").trim()
      if (!question) return Promise.resolve(null)
      /* Show more arrives as the service's own action text, because it
         travels through the same send path a typed question does. Matching it
         here is what turns it back into the saved search's next page instead
         of a fresh search that would start at the first twenty again. */
      const more = !!(options && options.more) || /^show more patients/i.test(question)

      resetActivity()
      const group = getHospitalGroup()
      const SCOPE_ID = clinicScopeId(group)
      const openSession = () =>
        createCopilotDiscoverySession().then((created) => {
          const sessionId = created && created.session_id
          setSession(SCOPE_ID, { sessionId, lastRequestId: null })
          return { sessionId, lastRequestId: null }
        })

      const ask = (session) =>
        askCopilotDiscovery({
          sessionId: session.sessionId,
          question,
          parentRequestId: session.lastRequestId,
          more,
          group,
        }, { onEvent: activityHandler })

      const stored = getSession(SCOPE_ID)
      const turn = stored
        ? ask(stored).catch((err) => {
            /* A session the service no longer holds reads as 404, the same as
               an unindexed patient does in the other mode. Open a new one and
               ask again rather than reporting it as nothing found. */
            if (err && err.status === 404) {
              clearSession(SCOPE_ID)
              return openSession().then(ask)
            }
            throw err
          })
        : openSession().then(ask)

      return turn
        .then((answer) => {
          if (!answer) return null
          setSession(SCOPE_ID, {
            sessionId: answer.session_id || (getSession(SCOPE_ID) || {}).sessionId || null,
            lastRequestId: answer.request_id || null,
          })

          const reply = clinicReplyFromResult(answer, question)
          /* Which patients this list was drawn from, for the card to say. */
          return reply && reply.rxOutput && reply.rxOutput.data
            ? { ...reply, rxOutput: { ...reply.rxOutput, data: { ...reply.rxOutput.data, group } } }
            : reply
        })
        .catch((err) => {
          if (err && err.name === "AbortError") {
            return { text: "Velora could not finish that search just now. Please ask again." }
          }
          if (err && err.code === "unauthorized") return { text: UNAUTHORIZED }
          if (err && (err.code === "unavailable" || err instanceof TypeError)) {
            return { text: "Velora could not finish that search just now, and nothing was saved. Please ask again." }
          }
          throw err
        })
    },
    [enabled]
  )
}
