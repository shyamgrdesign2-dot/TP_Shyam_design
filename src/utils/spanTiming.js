import * as Sentry from "@sentry/react";

/**
 * Anything longer than this is not a real readiness time — it means the span was
 * stale, the tab was backgrounded mid-measurement, or the wall clock moved. The
 * vitals widgets already needed the same cap for tab-switch artefacts.
 */
const MAX_PLAUSIBLE_MS = 60000;

/**
 * "Now", in the same clock Sentry stamps span timestamps with.
 *
 * The SDK derives start_timestamp from performance.timeOrigin + performance.now()
 * (@sentry/core utils/time.js, createUnixTimestampInSecondsFunc) — a monotonic
 * clock anchored once at page load. Date.now() is the wall clock. The two agree
 * at load and then drift apart whenever the OS adjusts time (NTP correction,
 * sleep/resume). Doctors here keep a tab open for days, so subtracting a span
 * timestamp from Date.now() can be off by the size of any clock correction —
 * seconds of error on a sub-second metric. Everything that measures against a
 * span start must use this function instead.
 */
export function nowInSpanClockSeconds() {
  if (
    typeof performance !== "undefined" &&
    performance.timeOrigin &&
    typeof performance.now === "function"
  ) {
    return (performance.timeOrigin + performance.now()) / 1000;
  }
  // Safari historically lacked timeOrigin; the SDK falls back to the wall clock
  // there too, so the two sides stay in the same domain.
  return Date.now() / 1000;
}

/**
 * Writes `metric` onto the active root span, but only when that root span has the
 * expected op — recording boot time onto a route change (or vice versa) would
 * silently pollute the other metric's percentiles.
 *
 * Written twice on purpose: setMeasurement renders in the trace UI with a unit,
 * but Sentry's EAP/spans dataset stores custom measurements as *string*
 * attributes, so avg()/p75() over measurements.<name> fail with "it's a string".
 * The numeric span attribute is the only form that aggregates — query it as
 * p75(tags[<metric>_ms,number]).
 *
 * Supply exactly one of:
 *   elapsedMs  — caller already knows the duration (app_ready measures from
 *                activation, which is not the span start on prerendered loads);
 *   endSeconds — a moment in the span clock, from which the duration is measured
 *                back to the span's own start.
 *
 * @returns {boolean} whether a value was recorded
 */
export function recordRootSpanMetric(expectedOp, metric, { elapsedMs, endSeconds } = {}) {
  try {
    const active = Sentry.getActiveSpan();
    const root = active && Sentry.getRootSpan(active);
    if (!root) return false;

    const json = Sentry.spanToJSON(root);
    if (json.op !== expectedOp) return false;

    let ms = elapsedMs;
    if (typeof ms !== "number") {
      if (!json.start_timestamp) return false;
      const end = typeof endSeconds === "number" ? endSeconds : nowInSpanClockSeconds();
      ms = (end - json.start_timestamp) * 1000;
    }
    if (!(ms >= 0) || ms > MAX_PLAUSIBLE_MS) return false;

    Sentry.setMeasurement(metric, ms, "millisecond");
    root.setAttribute(`${metric}_ms`, Math.round(ms));
    return true;
  } catch (e) {
    // Telemetry only — never let measurement failures reach the page.
    return false;
  }
}
