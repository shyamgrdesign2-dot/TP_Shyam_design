import { useEffect } from "react";
import * as Sentry from "@sentry/react";

/**
 * Records how long this document took to reach a mounted App shell, as
 * measurements.app_ready on the pageload span. Unlike FCP/LCP, this works for
 * loads the browser never paints — the hidden Kea dashboard iframes and tabs
 * restored in the background — because JS runs there regardless. See the
 * BOOT_VISIBILITY comment in src/index.js for that segmentation.
 *
 * Guards mirror src/hooks/useRouteReady.js, this metric's soft-navigation
 * sibling:
 * - records only onto a pageload root span. If something opened a navigation
 *   span before App mounted, recording a timeOrigin-relative value there would
 *   file boot time on a route change (the SDK's setMeasurement attaches to
 *   whatever root span is active, silently);
 * - subtracts activationStart so prerendered documents measure from activation
 *   rather than from when Chrome started speculating;
 * - try/catch because telemetry must never break the shell.
 *
 * Known truncation: on very slow boots the pageload span can idle-close before
 * App mounts (lazy chunk fetches restart no Sentry activity), and those loads
 * ship no app_ready at all — percentiles therefore skew optimistic. Like every
 * span measurement it exists only on sampled pageloads (tracesSampleRate).
 */
export default function useAppReady() {
  useEffect(() => {
    try {
      const active = Sentry.getActiveSpan();
      const root = active && Sentry.getRootSpan(active);
      if (!root) return;
      if (Sentry.spanToJSON(root).op !== "pageload") return;
      const navEntry = performance.getEntriesByType?.("navigation")?.[0];
      const activationStart = (navEntry && navEntry.activationStart) || 0;
      const elapsedMs = performance.now() - activationStart;
      if (elapsedMs < 0) return;
      Sentry.setMeasurement("app_ready", elapsedMs, "millisecond");
    } catch (e) {
      // Telemetry only — never let measurement failures reach the page.
    }
  }, []);
}
