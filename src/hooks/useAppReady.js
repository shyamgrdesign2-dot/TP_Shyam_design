import { useEffect } from "react";
import { recordRootSpanMetric } from "../utils/spanTiming";

/**
 * Records how long this document took to reach a mounted App shell, as
 * measurements.app_ready on the pageload span. Unlike FCP/LCP, this works for
 * loads the browser never paints — the hidden Kea dashboard iframes and tabs
 * restored in the background — because JS runs there regardless. See the
 * BOOT_VISIBILITY comment in src/index.js for that segmentation.
 *
 * Guards live in recordRootSpanMetric (src/utils/spanTiming.js): it records only
 * onto a pageload root span, so a navigation opened before App mounted cannot
 * receive boot time, and it drops implausible values. This hook adds the
 * prerender adjustment and the try/catch that keeps telemetry off the page's
 * critical path.
 *
 * Known truncation: on very slow boots the pageload span can idle-close before
 * App mounts (lazy chunk fetches restart no Sentry activity), and those loads
 * ship no app_ready at all — percentiles therefore skew optimistic. Like every
 * span measurement it exists only on sampled pageloads (tracesSampleRate).
 */
export default function useAppReady() {
  useEffect(() => {
    try {
      // Prerendered documents begin their clock when Chrome started speculating,
      // so measure from activation; activationStart is 0 on a normal load. This
      // is why app_ready passes an explicit duration rather than an end time —
      // the pageload span's own start is the prerender start, not activation.
      const navEntry = performance.getEntriesByType?.("navigation")?.[0];
      const activationStart = (navEntry && navEntry.activationStart) || 0;
      recordRootSpanMetric("pageload", "app_ready", {
        elapsedMs: performance.now() - activationStart,
      });
    } catch (e) {
      // Telemetry only — never let measurement failures reach the page.
    }
  }, []);
}
