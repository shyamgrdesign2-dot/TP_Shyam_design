import { copilotDoctorKey } from "./copilotSessionStore"
import { isCopilotMock } from "./copilotMock"

/**
 * What the Recent conversations list shows, and what the doctor cleared.
 *
 * Every conversation the doctor has had with Velora, for every patient and
 * every hospital-wide search, newest first, for as long as the service
 * holds it.
 *
 * Clearing is the doctor's, kept in this browser per doctor: one cleared
 * conversation is hidden by its id, and "clear today's history" hides
 * everything up to the moment it was pressed.
 */

const NS = () => (isCopilotMock() ? "mock:" : "")
const HIDDEN_KEY = () => `velora:hidden:${NS()}${copilotDoctorKey()}`
const CLEARED_KEY = () => `velora:cleared-at:${NS()}${copilotDoctorKey()}`

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    /* storage blocked: the clear lasts until the list reloads */
  }
}

export function hideSession(sessionId) {
  if (!sessionId) return
  const hidden = readJson(HIDDEN_KEY(), {})
  hidden[sessionId] = Date.now()
  writeJson(HIDDEN_KEY(), hidden)
}

export function clearHistoryNow() {
  writeJson(CLEARED_KEY(), Date.now())
}

/** Whether a row from the service's list belongs in the history. */
export function isVisibleSession(row) {
  if (!row) return false
  const at = (row.updated_at || 0) * 1000
  const hidden = readJson(HIDDEN_KEY(), {})
  if (hidden[row.session_id]) return false
  const clearedAt = readJson(CLEARED_KEY(), 0)
  if (clearedAt && at <= clearedAt) return false
  return true
}
