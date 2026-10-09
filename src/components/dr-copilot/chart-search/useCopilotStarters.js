/**
 * The four questions this particular chart can answer.
 *
 * These used to be a hardcoded list with a gate the portal could not switch
 * on, because nothing told it which record kinds a patient actually had. The
 * service answers that now: `starters` are the questions worth offering for
 * this chart, chosen from what it holds.
 *
 * That moves the promise to the right side. "A starter question must never
 * dead-end" is only keepable by whoever knows what is indexed, and that was
 * never the portal.
 *
 * The chart's own questions when the service has them. When it has none -
 * still loading, not indexed, or the request failed - the service's standard
 * four stand in: the exact `ask`/`short` pairs its /starters returns for a
 * typical chart. They still go to the live service, so on a chart it has not
 * indexed they come back "not indexed", which is the honest answer.
 */

import { useEffect, useState } from "react"
import { fetchCopilotStarters, getCopilotToken } from "./copilotApi"
import { copilotDoctorKey } from "./copilotSessionStore"

/* Verbatim from the service's /starters response. */
export const STANDARD_STARTERS = [
  { label: "Summarise this patient's record.", short: "Patient summary", intent: "patient_summary", code: null },
  { label: "What medications were recorded?", short: "Medications on record", intent: "medications", code: "medicine" },
  { label: "What conditions are recorded?", short: "Conditions on record", intent: "diagnosis", code: "diagnosis" },
  { label: "What advice was given?", short: "Advice on record", intent: "advice", code: "advice" },
].map((s) => ({ ...s, wide: s.short, requires: [] }))

/**
 * One request per doctor and patient, shared by every caller.
 *
 * The page's top bar and the panel both ask for the same chart's starters,
 * and each used to fetch its own. A chart's starters only change when it is
 * re-ingested, so they are kept for ten minutes, an in-flight request is
 * shared rather than repeated, and a failed request is not cached so the next
 * visit tries again. "Not indexed" is cached too: it is an answer.
 */
const STARTERS_TTL_MS = 10 * 60 * 1000
const startersCache = new Map()

function toState(res) {
  return {
    /* `ask` is what gets sent, `short` is what the chip shows. */
    starters: (res.starters || []).map((s) => ({
      label: s.ask,
      short: s.short,
      wide: s.short,
      intent: s.intent,
      code: s.code || null,
      requires: [],
    })),
    availableKinds: res.availableKinds || null,
    visitCount: typeof res.visitCount === "number" ? res.visitCount : null,
    indexed: true,
  }
}

const NOT_INDEXED = { starters: [], availableKinds: [], visitCount: 0, indexed: false }

/* Also mirrored to sessionStorage, so a page reload inside the window does
   not refetch either. */
const STORAGE_PREFIX = "drCopilotStarters:v1:"

function readStored(key) {
  try {
    const entry = JSON.parse(window.sessionStorage.getItem(STORAGE_PREFIX + key) || "null")
    return entry && Date.now() - entry.at < STARTERS_TTL_MS ? entry : null
  } catch (err) {
    return null
  }
}

function writeStored(key, value) {
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ at: Date.now(), value }))
  } catch (err) {
    /* not remembered across reloads; the in-memory cache still holds */
  }
}

function loadStarters(patientUid) {
  const key = `${copilotDoctorKey()}:${patientUid}`
  const hit = startersCache.get(key)
  if (hit && Date.now() - hit.at < STARTERS_TTL_MS) return hit.promise

  const stored = readStored(key)
  if (stored) {
    const promise = Promise.resolve(stored.value)
    startersCache.set(key, { at: stored.at, promise })
    return promise
  }

  const promise = fetchCopilotStarters(patientUid)
    .then(toState)
    .catch((err) => {
      if (err && err.code === "not_indexed") return NOT_INDEXED
      startersCache.delete(key)
      throw err
    })
    .then((value) => {
      writeStored(key, value)
      return value
    })
  startersCache.set(key, { at: Date.now(), promise })
  return promise
}

export function useCopilotStarters(patientUid) {
  const [state, setState] = useState({ starters: null, availableKinds: null, visitCount: null, indexed: null })

  useEffect(() => {
    if (!patientUid || !getCopilotToken()) {
      setState({ starters: null, availableKinds: null, visitCount: null, indexed: null })
      return undefined
    }

    let live = true
    /* A different patient's chips must never linger while this one loads. */
    setState({ starters: null, availableKinds: null, visitCount: null, indexed: null })

    loadStarters(String(patientUid))
      .then((next) => {
        if (live) setState(next)
      })
      .catch(() => {
        /* Stays quiet: the standard questions show, and the composer works. */
      })

    return () => {
      live = false
    }
  }, [patientUid])

  return {
    ...state,
    /* What the welcome screen should actually render. */
    prompts: state.starters && state.starters.length ? state.starters.slice(0, 4) : STANDARD_STARTERS,
  }
}
