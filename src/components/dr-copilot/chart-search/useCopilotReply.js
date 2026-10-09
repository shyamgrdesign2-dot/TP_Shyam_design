/**
 * Copilot's answers, from the live service.
 *
 * Shaped for DrAgentPanel's `replyOverride` but returning a promise: the panel
 * holds its typing indicator until the service answers, so the existing chat
 * shell carries live results without a second UI.
 *
 * Always answers, even when it cannot search. Returning nothing used to let
 * the panel fall through to its bundled demo engines, which produced
 * confident, invented clinical content under a real patient's name. A plain
 * sentence saying why there is no answer is the only acceptable miss.
 *
 * One conversation per doctor and patient, kept in copilotSessionStore beside
 * the thread it belongs to. The session is opened on the first question and
 * reused, so follow-ups land in the thread the service is reasoning over;
 * `parent_request_id` chains each answer to the last successful one, which is
 * what makes "and what dose?" resolve against the previous reply. Leaving a
 * patient and coming back resumes the same conversation; a different patient
 * has their own; 30 idle minutes resets both halves together.
 *
 * A failed turn is not saved by the service, so it never becomes the parent
 * of the next question. A session the service no longer knows (404 on /ask)
 * is replaced once and the question retried; if opening a fresh session also
 * 404s, the patient genuinely is not indexed.
 *
 * No request is cancelled when another starts. The composer is disabled while
 * a turn is in flight, and an answer that arrives after the doctor moved to
 * another patient still belongs in the first patient's thread.
 */

import { useCallback } from "react"
import {
  askCopilot,
  buildCopilotEvidence,
  createCopilotSession,
  getCopilotToken,
} from "./copilotApi"
import { clearSession, getSession, setSession } from "./copilotSessionStore"
import { chartReplyFromResult } from "./copilotReplyShapes"
import { activityHandler, resetActivity } from "./copilotActivity"

/**
 * The lead-in above a card.
 *
 * The service sends `interpretation` - a sentence about what it just did -
 * which is exactly the line the reference puts above every card. Better than
 * the portal's own guess at one, so it is used when present.
 */
const FALLBACK_LEAD = "Here's what the record shows."

/* Not "sign in again": the portal's own session is not what the search
   service checks, so signing in changes nothing. */
const UNAUTHORIZED =
  "Velora could not authenticate with the record search service, so there is nothing to show yet."

/**
 * What to offer under an answer: the chart's starter questions, minus the one
 * just asked. The service sends no follow-ups of its own, and these are the
 * questions it has already said this chart can take.
 */
function followUps(starters, question) {
  const asked = String(question || "").trim().toLowerCase()
  return (starters || [])
    .filter((s) => String(s.label || "").trim().toLowerCase() !== asked)
    .slice(0, 3)
    .map((s) => ({ label: s.short || s.label, message: s.label }))
}

export function useCopilotReply({ patientUid, enabled = true, starters = [] }) {
  return useCallback(
    (message) => {
      if (!enabled || !patientUid) {
        return Promise.resolve({
          text: "Open a patient to ask about their record. Copilot answers from one chart at a time.",
        })
      }
      if (!getCopilotToken()) {
        return Promise.resolve({ text: UNAUTHORIZED })
      }
      const question = String(message || "").trim()
      if (!question) return Promise.resolve(null)

      const uid = String(patientUid)
      const withFollowUps = (reply) =>
        reply ? { ...reply, suggestions: followUps(starters, question) } : reply

      resetActivity()
      const openSession = () =>
        createCopilotSession(uid).then((created) => {
          const sessionId = created && created.session_id
          setSession(uid, { sessionId, lastRequestId: null })
          return { sessionId, lastRequestId: null }
        })

      const ask = (session) =>
        askCopilot(
          uid,
          { sessionId: session.sessionId, question, parentRequestId: session.lastRequestId },
          { onEvent: activityHandler }
        )

      const stored = getSession(uid)
      const turn = stored
        ? ask(stored).catch((err) => {
            if (err && err.status === 404) {
              clearSession(uid)
              return openSession().then(ask)
            }
            throw err
          })
        : openSession().then(ask)

      return turn
        .then((answer) => {
          if (!answer) return null
          setSession(uid, {
            sessionId: answer.session_id || (getSession(uid) || {}).sessionId || null,
            lastRequestId: answer.request_id || null,
          })
          return chartReplyFromResult(answer, question)
        })
        .catch((err) => {
          if (err && err.name === "AbortError") {
            return { text: "Velora could not finish that answer just now, and nothing was saved. Please ask again." }
          }
          /* A chart the service has never seen is a thing to say, not an error
             to raise: said plainly, once, in the thread. */
          if (err.code === "not_indexed") {
            return {
              text:
                "This patient's record has not been indexed for Copilot yet, so there is nothing to search. Ask me about a patient whose chart has been ingested.",
            }
          }
          if (err.code === "unauthorized") {
            return { text: UNAUTHORIZED }
          }
          /* A failed turn is not saved by the service, so the next question
             must not chain to it - and the doctor can simply ask again. */
          if (err.code === "unavailable" || err instanceof TypeError) {
            return {
              text: "Velora could not finish that answer just now, and nothing was saved. Please ask again.",
            }
          }
          throw err
        })
        .then(withFollowUps)
    },
    [patientUid, enabled, starters]
  )
}
