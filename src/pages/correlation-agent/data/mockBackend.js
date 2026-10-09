/**
 * The local-development override for the feature gate.
 *
 * THE REAL GATE IS GROWTHBOOK — `correlation-agent-beta`, read in SideNavbar
 * the same way Care Plan and Ophthal read theirs. That is what decides the
 * feature on UAT and prod, so it can be targeted at particular doctors and,
 * more importantly, switched OFF without a release.
 *
 * What survives here is a convenience for working on a dev server without
 * reaching GrowthBook:
 *
 *   localStorage.setItem("correlationAgentDemo", "on")
 *
 * It is deliberately inert in a production BUILD — which is what UAT and prod
 * both are — so nobody can hand themselves a Beta clinical surface from
 * devtools on a deployed environment.
 */

/** Flip to false to remove the feature entirely. */
export const CORRELATION_DEMO_ENABLED = true;

const FLAG_KEY = "correlationAgentDemo";

export function isCorrelationDemoEnabledGlobally() {
  if (!CORRELATION_DEMO_ENABLED) return false;
  /* Dev server only. A deployed build ignores the flag entirely and defers to
     GrowthBook. */
  if (process.env.NODE_ENV === "production") return false;
  try {
    return window.localStorage.getItem(FLAG_KEY) === "on";
  } catch (e) {
    return false;
  }
}

export function setCorrelationDemo(on) {
  try {
    if (on) window.localStorage.setItem(FLAG_KEY, "on");
    else window.localStorage.removeItem(FLAG_KEY);
  } catch (e) {
    /* storage unavailable, feature stays off */
  }
}

/**
 * The dev override only. Not a property of any particular patient, so the
 * `patient` argument is kept for call-site compatibility. Callers OR this with
 * the GrowthBook flag; they never rely on it alone.
 */
export function isCorrelationDemoPatient() {
  if (!CORRELATION_DEMO_ENABLED) return false;
  return isCorrelationDemoEnabledGlobally();
}
