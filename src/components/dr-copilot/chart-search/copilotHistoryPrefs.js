import { copilotDoctorKey } from "./copilotSessionStore"
import { isCopilotMock } from "./copilotMock"

/**
 * What the Recent conversations list shows, and what the doctor cleared.
 *
 * Velora keeps a working day, not an archive. The list is there so a doctor
 * who opened a patient from a hospital-wide search can get back to that
 * search, or come back to a patient they spoke about this morning; it is not
 * a place to dig out last week's chat. So it shows the last 24 hours and
 * nothing older, whatever the service still holds.
 *
 * Clearing is the doctor's, kept in this browser per doctor: one cleared
 * conversation is hidden by its id, and "clear today's history" hides
 * everything up to the moment it was pressed. Both expire with the window.
 */

export const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000

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
  const now = Date.now()
  hidden[sessionId] = now
  for (const id of Object.keys(hidden)) {
    if (now - hidden[id] > HISTORY_WINDOW_MS) delete hidden[id]
  }
  writeJson(HIDDEN_KEY(), hidden)
}

export function clearHistoryNow() {
  writeJson(CLEARED_KEY(), Date.now())
}

/** Whether a row from the service's list belongs in today's history. */
export function isVisibleSession(row, now = Date.now()) {
  if (!row) return false
  const at = (row.updated_at || 0) * 1000
  if (now - at > HISTORY_WINDOW_MS) return false
  const hidden = readJson(HIDDEN_KEY(), {})
  if (hidden[row.session_id]) return false
  const clearedAt = readJson(CLEARED_KEY(), 0)
  if (clearedAt && at <= clearedAt) return false
  return true
}
