/**
 * The correlation agent's ambient context, published across React trees.
 *
 * Whether the agent is enabled for this consultation, and the patient's reports
 * available to correlate, are both computed in the SideNavbar. The Diagnosis
 * section that has to show the pre-run entry card lives in the legacy
 * prescription pad, a different React tree, so — exactly like the run in
 * runStore — the context rides on `window` and notifies through an event.
 *
 * Sampling the global during render would not re-render the pad when it lands,
 * so consumers subscribe with `subscribeAgentContext`.
 */

const EVENT = "correlation-context-changed";
const EMPTY = { enabled: false, reports: [] };

export function getAgentContext() {
  if (typeof window === "undefined") return EMPTY;
  return window.__correlationContext || EMPTY;
}

/** Publish the context and tell every subscriber. */
export function setAgentContext(ctx) {
  if (typeof window === "undefined") return;
  window.__correlationContext = ctx || EMPTY;
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeAgentContext(fn) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
