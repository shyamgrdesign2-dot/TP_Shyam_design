import { isCopilotMock } from "./copilotMock"
/**
 * One place that remembers a Copilot conversation.
 *
 * A conversation has two halves that must never drift apart: the thread the
 * doctor sees, and the service's session that follow-ups chain to. They used
 * to live in different places - the thread inside the panel, which unmounts
 * whenever Copilot closes or switches between rail and popup, and the session
 * in a single ref that only remembered the last patient. So a doctor could
 * reopen Copilot to an empty screen whose next question was silently chained
 * to a conversation they could no longer see, or return to a patient whose
 * thread was still there but whose session had been thrown away.
 *
 * Here both halves share one entry, keyed by doctor and patient, and expire
 * together.
 *
 *   Scope      sessionStorage: this browser tab only, gone when it closes.
 *              Clinical conversation should not outlive the tab it was had in.
 *   Key        doctor + patient. Another doctor signing in on the same tab
 *              never inherits a thread, and each patient keeps their own.
 *   Lifetime   until the tab closes or the doctor clears it; the Recent
 *              conversations list keeps every conversation.
 *   Size       the last 60 messages of a thread.
 */

const PREFIX = "drCopilot:v1:"
/* No idle limit: a thread stays until the tab closes or it is cleared. */
export const COPILOT_IDLE_TTL_MS = Infinity
const MAX_MESSAGES = 60
const PORTAL_TOKEN_KEY = "persistant.storage.key.auth-token"

function storage() {
  try {
    return window.sessionStorage
  } catch (err) {
    return null
  }
}

/** The signed-in doctor, from the portal token's own payload. */
export function copilotDoctorKey() {
  try {
    const raw = window.localStorage.getItem(PORTAL_TOKEN_KEY) || ""
    const token = (raw.startsWith('"') ? JSON.parse(raw) : raw).replace(/^Bearer\s+/i, "")
    const payload = token.split(".")[1]
    if (!payload) return "anon"
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    const result = json.result || json
    return String(result.doctor_unique_id || result.user_id || "anon")
  } catch (err) {
    return "anon"
  }
}

/* Demo data keeps its own conversations, so a live thread never shows up
   in a demo and an invented one never reaches a live chart. */
function namespace() {
  return isCopilotMock() ? "mock:" : ""
}

function keyFor(patientUid) {
  return `${PREFIX}${namespace()}${copilotDoctorKey()}:${patientUid}`
}

function read(patientUid) {
  const store = storage()
  if (!store || !patientUid) return null
  try {
    const raw = store.getItem(keyFor(patientUid))
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry || Date.now() - (entry.updatedAt || 0) > COPILOT_IDLE_TTL_MS) {
      store.removeItem(keyFor(patientUid))
      return null
    }
    return entry
  } catch (err) {
    return null
  }
}

function write(patientUid, patch) {
  const store = storage()
  if (!store || !patientUid) return
  const next = { ...(read(patientUid) || {}), ...patch, updatedAt: Date.now() }
  try {
    store.setItem(keyFor(patientUid), JSON.stringify(next))
  } catch (err) {
    /* Quota: keep the session, drop the oldest half of the thread. */
    try {
      const messages = (next.messages || []).slice(-Math.floor(MAX_MESSAGES / 2))
      store.setItem(keyFor(patientUid), JSON.stringify({ ...next, messages }))
    } catch (again) {
      /* nothing more to do; the conversation simply is not remembered */
    }
  }
}

/** Whether this patient's conversation is still inside its idle window. */
export function hasLiveConversation(patientUid) {
  return !!read(patientUid)
}

/** The thread to restore, or undefined for a fresh start. */
export function loadThread(patientUid) {
  const entry = read(patientUid)
  return entry && Array.isArray(entry.messages) && entry.messages.length ? entry.messages : undefined
}

export function saveThread(patientUid, messages) {
  if (!Array.isArray(messages)) return
  /* An empty welcome screen is not a conversation: it neither creates an
     entry nor keeps an old one alive. */
  if (!messages.length && !read(patientUid)) return
  write(patientUid, { messages: messages.slice(-MAX_MESSAGES) })
}

/** `{ sessionId, lastRequestId }`, only while the thread it belongs to lives. */
export function getSession(patientUid) {
  const entry = read(patientUid)
  if (!entry || !entry.sessionId) return null
  return { sessionId: entry.sessionId, lastRequestId: entry.lastRequestId || null }
}

export function setSession(patientUid, patch) {
  write(patientUid, patch)
}

export function clearSession(patientUid) {
  if (read(patientUid)) write(patientUid, { sessionId: null, lastRequestId: null })
}

/** Forget one conversation entirely: its thread and its session. */
export function forgetThread(patientUid) {
  const store = storage()
  if (!store || !patientUid) return
  try {
    store.removeItem(keyFor(patientUid))
  } catch (err) {
    /* storage blocked: nothing was kept to forget */
  }
}

/** Forget every conversation this doctor has in this tab. */
export function forgetAllThreads() {
  const store = storage()
  if (!store) return
  const mine = `${PREFIX}${namespace()}${copilotDoctorKey()}:`
  try {
    const keys = []
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i)
      if (k && k.startsWith(mine)) keys.push(k)
    }
    keys.forEach((k) => store.removeItem(k))
  } catch (err) {
    /* storage blocked */
  }
}
