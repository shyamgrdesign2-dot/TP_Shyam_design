import { useSyncExternalStore } from "react"
import { isCopilotMock } from "../chart-search/copilotMock"

/**
 * The patient Copilot would return to, readable from anywhere in the panel.
 *
 * A card rendered deep in the thread has to know whether there is a chart to
 * offer before it offers one, and the dock that knows is many levels above
 * it. Threading a prop through the renderer for this one fact would touch
 * every card; a tiny store does not, and it is the same pattern the Rx pad
 * bridge already uses.
 */

let state = { id: null, name: null }
const listeners = new Set()

function emit() {
  listeners.forEach((l) => l())
}

export function setLastCopilotPatient(next) {
  const id = (next && next.id) || null
  const name = (next && next.name) || null
  if (state.id === id && state.name === name) return
  state = { id, name }
  emit()
}

export function getLastCopilotPatient() {
  return state
}

export function useLastCopilotPatient() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getLastCopilotPatient,
    getLastCopilotPatient
  )
}

/** The one scope-switch request in the product, so both directions match. */
export const COPILOT_SCOPE_SWITCH_EVENT = "copilot:switch-scope"

/* `patient` names a particular chart to move to ({ id, label }); without it
   a patient target means the last chart Velora was on. */
export function requestCopilotScope(target, question, patient) {
  window.dispatchEvent(
    new CustomEvent(COPILOT_SCOPE_SWITCH_EVENT, { detail: { target, question, patient: patient || null } })
  )
}

/** Opening the scope picker from somewhere else in the panel. */
export const COPILOT_SCOPE_MENU_EVENT = "copilot:open-scope-menu"

export function requestCopilotScopeMenu() {
  window.dispatchEvent(new CustomEvent(COPILOT_SCOPE_MENU_EVENT))
}

/* ── Which patients a hospital-wide question covers ───────────────────────
   "mine": the patients this doctor has treated; "all": everyone in the
   hospital. The live service cannot limit a search to one doctor's patients
   yet (checked against preprod on 8 Oct 2026), so outside demo data the
   scope is always "all". In demo data the doctor's own patients are the
   default, because that is the list a doctor means first. */

const GROUP_KEY = "velora:hospital-group"
const GROUP_LABEL = { mine: "All my patients", all: "All hospital patients" }
const groupListeners = new Set()
let group = null

function readGroup() {
  if (!isCopilotMock()) return "all"
  try {
    return window.localStorage.getItem(GROUP_KEY) === "all" ? "all" : "mine"
  } catch (e) {
    return "mine"
  }
}

export function getHospitalGroup() {
  if (!isCopilotMock()) return "all"
  if (group == null) group = readGroup()
  return group
}

export function setHospitalGroup(next) {
  const value = next === "mine" && isCopilotMock() ? "mine" : "all"
  if (getHospitalGroup() === value) return
  group = value
  try {
    window.localStorage.setItem(GROUP_KEY, value)
  } catch (e) {
    /* storage blocked: the choice lasts for this page only */
  }
  groupListeners.forEach((l) => l())
}

export function useHospitalGroup() {
  return useSyncExternalStore(
    (l) => {
      groupListeners.add(l)
      return () => groupListeners.delete(l)
    },
    getHospitalGroup,
    getHospitalGroup
  )
}

/** "All my patients" or "All hospital patients". */
export function hospitalGroupLabel(g = getHospitalGroup()) {
  return GROUP_LABEL[g] || GROUP_LABEL.all
}

/** Whether "All my patients" can be chosen at all (demo data only, today). */
export function canScopeToMine() {
  return isCopilotMock()
}
