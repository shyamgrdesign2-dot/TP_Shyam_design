import { createContext, useContext, useEffect, useState } from "react"

/**
 * Whether the card being rendered is an answer arriving now.
 *
 * True only for the reply that just came back, so a card can write itself in
 * (text a few words at a time, rows one after another) the way the answer
 * streams. A thread restored from history, or re-rendered after switching
 * patient, is already read and is drawn at once.
 */
export const CardStreamContext = createContext(false)

export function useCardStream() {
  return useContext(CardStreamContext)
}

/**
 * Text written in a few words at a time, for a card that is streaming.
 *
 * Paced to the answer's length (about 1.6 seconds whatever its size, never
 * slower than a few characters a frame) so a long answer is not a long wait.
 * Cuts land on word boundaries, and never inside a citation link, so a
 * half-written `[2](#evid` never shows as raw text.
 */
export function useStreamedText(text, active) {
  const full = String(text || "")
  const [shown, setShown] = useState(active ? 0 : full.length)

  useEffect(() => {
    if (!active) {
      setShown(full.length)
      return undefined
    }
    if (shown >= full.length) return undefined
    const step = Math.max(4, Math.ceil(full.length / 80))
    const t = setTimeout(() => setShown((n) => Math.min(full.length, n + step)), 20)
    return () => clearTimeout(t)
  }, [active, shown, full.length])

  if (shown >= full.length) return { text: full, done: true }
  let cut = full.lastIndexOf(" ", shown)
  if (cut <= 0) cut = shown
  let out = full.slice(0, cut)
  const open = out.lastIndexOf("[")
  if (open !== -1 && out.indexOf(")", open) === -1) out = out.slice(0, open)
  return { text: out, done: false }
}
