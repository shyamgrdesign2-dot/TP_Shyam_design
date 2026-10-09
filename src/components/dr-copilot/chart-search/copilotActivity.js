import { useEffect, useState } from "react"

/**
 * What the service says it is doing, while it does it.
 *
 * Asked for a stream, the service sends its progress before the answer:
 *
 *   activity  `{ id, label, status, duration_ms }`, re-sent under the same id
 *             as a step moves from running to complete (or failed)
 *   answer    the answer text as it is written, `{ answer, append }`
 *   charts    any charts the answer carries
 *   final     the finished result (the API returns this one)
 *
 * The same steps its own chat lists above an answer. One question is in
 * flight at a time, so one shared snapshot is enough: the ask resets it,
 * each event updates it, the loader reads it. When nothing has arrived (a
 * server or proxy that does not stream, or the first moment of one that
 * does) the loader falls back to its own lines.
 */

let snapshot = { steps: [], draft: "" }
const listeners = new Set()

function set(next) {
  snapshot = next
  for (const fn of listeners) fn(snapshot)
}

export function resetActivity() {
  set({ steps: [], draft: "" })
}

export function pushActivity(step) {
  if (!step || !step.id) return
  const { steps } = snapshot
  set({
    ...snapshot,
    steps: steps.some((s) => s.id === step.id)
      ? steps.map((s) => (s.id === step.id ? { ...s, ...step } : s))
      : [...steps, step],
  })
}

/** The stream handler both ask paths pass to the API. */
export function activityHandler(event, data) {
  if (!data) return
  if (event === "activity") pushActivity(data)
  if (event === "answer" && typeof data.answer === "string") {
    set({ ...snapshot, draft: data.append ? snapshot.draft + data.answer : data.answer })
  }
}

export function useCopilotActivity() {
  const [value, setValue] = useState(snapshot)
  useEffect(() => {
    listeners.add(setValue)
    setValue(snapshot)
    return () => listeners.delete(setValue)
  }, [])
  return value
}
