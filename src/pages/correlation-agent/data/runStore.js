/**
 * The published correlation run, and a way to hear about it changing.
 *
 * The run has to cross from the agent's drawer into the legacy prescription
 * pad, which is a different React tree entirely, so it lives on `window`. That
 * part was always fine. What was missing is the NOTIFICATION: DiagnosisBox and
 * InvestigationBox read the global straight out of `window` during render, and
 * React has no reason to re-render when a global mutates. So the correlation
 * card did not appear when the run landed. It appeared the next time something
 * unrelated re-rendered the pad, which is why pressing "Add custom model" made
 * it show up. The run was there the whole time; nobody had asked the pad to
 * look again.
 *
 * `window.__correlationRun` is kept as-is so anything already reading it still
 * works. Everything in React should use `subscribeRun` instead.
 */

const EVENT = "correlation-run-changed";

export function getRun() {
  if (typeof window === "undefined") return null;
  return window.__correlationRun || null;
}

/** Publish a run (or null to clear it) and tell every subscriber. */
export function setRun(run) {
  if (typeof window === "undefined") return;
  window.__correlationRun = run;
  window.dispatchEvent(new Event(EVENT));
}

/** Merge into the live run without replacing it, then notify. */
export function patchRun(patch) {
  if (typeof window === "undefined") return;
  window.__correlationRun = { ...(window.__correlationRun || {}), ...patch };
  window.dispatchEvent(new Event(EVENT));
}

/** Re-notify after mutating the run object in place. */
export function notifyRun() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeRun(fn) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
