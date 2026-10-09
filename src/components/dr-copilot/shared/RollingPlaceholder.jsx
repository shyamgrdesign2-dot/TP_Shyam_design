import React, { useEffect, useState } from "react"

import styles from "./RollingPlaceholder.module.css"
import { possessiveOf } from "./patientName"

/**
 * The placeholder that teaches.
 *
 * A fixed lead with the tail rolling underneath it. The lead is sticky so the
 * scope never leaves the field and there is never a doubt about what is being
 * searched; the tail cycles through what can be asked, which is cheaper than a
 * row of instructions.
 *
 * The two scopes need different sentences, not different nouns. A chart can
 * be asked about ("Ask about this patient's last prescription"); the hospital
 * scope cannot answer about any one chart, it can only find people ("Find
 * patients with type 2 diabetes"). A doctor copies the shape of the example
 * they are shown, so showing a chart question in the hospital scope is how a
 * chart question ends up there. Each lead is therefore the verb of its scope,
 * and every tail is something the service can actually do in it.
 *
 * Drawn over an empty input rather than set as its `placeholder`, because a
 * placeholder attribute cannot animate. Never takes the pointer, so a click
 * anywhere along it still lands in the field underneath. It is aria-hidden,
 * so the field itself should carry `scopePlaceholder()` as its label.
 *
 * Shared between the top-bar search and the panel's own composer: they are the
 * same invitation in two places, and should not drift apart.
 */

export const SCOPE_PATIENT = "patient"
export const SCOPE_HOSPITAL = "hospital"

/* Every phrase reads as a possessive after the lead, so "Ask about Akhil's
   ..." stays one whole sentence whichever tail is showing. Plain clinic words
   ("medicines", not "medication list") and nothing the record cannot hold. */
export const ROLLING_HINTS = [
  "medicines",
  "last prescription",
  "latest lab results",
  "allergies",
  "blood pressure readings",
  "diagnoses",
  "last visit notes",
]

/* Every phrase completes "Find patients ...". Kept to what the hospital search
   supports: a recorded condition, a lab or vital above a number, a recorded
   family history. Never a cohort it would have to infer ("at risk of ..."),
   because the placeholder is a promise. */
export const HOSPITAL_ROLLING_HINTS = [
  "with type 2 diabetes",
  "whose latest HbA1c is above 7%",
  "with blood pressure above 140/90",
  "with a family history of heart disease",
  "with hypothyroidism",
]

export const ROLLING_MS = 2400

/* Short enough to read as a change of word rather than a movement to watch.
   The stylesheet's own timing was longer than the panel's motion range. */
const ROLL_ANIMATION_MS = 240

export function rollingHintsFor(scope = SCOPE_PATIENT) {
  return scope === SCOPE_HOSPITAL ? HOSPITAL_ROLLING_HINTS : ROLLING_HINTS
}

/**
 * `named` is false inside the panel, where the patient chip sits under the
 * field: the name is already on screen, and saying it twice in one box made
 * the invitation longer without making it clearer. "This patient's" still says
 * the question is about one chart, which is the part that must not be lost.
 * The bar out on the page keeps the name, because there it is the only thing
 * naming the scope, and keeps "Velora" because there it is the only thing
 * saying what the field is.
 */
/* The lead with the patient's name set apart, so the name can carry a
   heavier weight than the faded words around it: "Ask Velora about" is the
   invitation, "Ramesh's" is who it is about. */
export function RollingLeadText({ patientLabel, named = true, scope = SCOPE_PATIENT, nameClassName }) {
  if (scope === SCOPE_HOSPITAL || !named) return rollingLead(patientLabel, named, scope)
  return (
    <>
      Ask Velora about <strong className={nameClassName}>{possessiveOf(patientLabel)}</strong>
    </>
  )
}

export function rollingLead(patientLabel, named = true, scope = SCOPE_PATIENT) {
  if (scope === SCOPE_HOSPITAL) return "Find patients"
  if (!named) return "Ask about this patient's"
  return `Ask Velora about ${possessiveOf(patientLabel)}`
}

/**
 * The same invitation as one still line: for a field that is not rolling, and
 * as the accessible name of a field that is (the drawn ghost is hidden from
 * assistive technology, so without this the field announces nothing).
 */
export function scopePlaceholder(scope = SCOPE_PATIENT, patientLabel) {
  if (scope === SCOPE_HOSPITAL) {
    return "Find patients by condition, lab value or blood pressure"
  }
  return `Ask about ${possessiveOf(patientLabel)} medicines, labs or past visits`
}

/**
 * Advances an index on a timer and remembers the one it left, so the outgoing
 * line can animate out while the incoming line animates in. Respects
 * prefers-reduced-motion by simply not rotating: the first hint of each list
 * is chosen to stand alone for that reason.
 *
 * `resetKey` starts the roll again from the first hint when it changes. Without
 * it a scope switch carried the old position across, and the new list opened
 * mid-way with the previous scope's phrase still sliding out.
 */
export function useRollingIndex(length, enabled, resetKey) {
  const [index, setIndex] = useState(0)
  const [previous, setPrevious] = useState(null)

  useEffect(() => {
    setIndex(0)
    setPrevious(null)
  }, [resetKey])

  useEffect(() => {
    if (!enabled || length < 2) return undefined
    const mq =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null
    if (mq && mq.matches) return undefined
    const id = setInterval(() => {
      setIndex((i) => {
        setPrevious(i)
        return (i + 1) % length
      })
    }, ROLLING_MS)
    return () => clearInterval(id)
  }, [enabled, length, resetKey])

  return [index, previous]
}

export function RollingPlaceholder({
  patientLabel,
  active = true,
  size = "md",
  named = true,
  /* "patient" (one chart) or "hospital" (find patients). Defaults to the
     chart, which is what every caller meant before the scopes existed. */
  scope = SCOPE_PATIENT,
  /* Laid out in a row rather than drawn over a field. */
  inline = false,
  className,
}) {
  const hints = rollingHintsFor(scope)
  const [index, previous] = useRollingIndex(hints.length, active, scope)
  /* Modulo, so a render that lands between a scope change and the reset
     above still names a real hint rather than undefined. */
  const current = hints[index % hints.length]
  const leaving = previous != null ? hints[previous % hints.length] : null
  const motion = { animationDuration: `${ROLL_ANIMATION_MS}ms` }

  return (
    <span
      className={[styles.ghost, inline && styles.inline, size === "lg" && styles.lg, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <span className={styles.lead}>
        <RollingLeadText patientLabel={patientLabel} named={named} scope={scope} nameClassName={styles.leadName} />
      </span>
      <span className={styles.roll}>
        {leaving != null && (
          <span key={`out-${scope}-${previous}`} className={styles.rollOut} style={motion}>
            {leaving}
          </span>
        )}
        <span key={`in-${scope}-${index}`} className={styles.rollIn} style={motion}>
          {current}
        </span>
      </span>
    </span>
  )
}
