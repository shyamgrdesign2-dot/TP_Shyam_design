import { useEffect } from "react";
import * as Sentry from "@sentry/react";

/**
 * Records how long a soft navigation took to put this page's main content on
 * screen, as `route_ready` on the active navigation transaction — the SPA
 * equivalent of FCP. Browsers only produce FCP/LCP for hard document loads,
 * so the doctor's real workflow (one hard load in the morning, then hundreds
 * of in-app route changes) is invisible to paint vitals; this measurement is
 * how those route changes get a "content visible" number. The navigation
 * transaction's own duration is NOT that number: it ends only when every
 * background request has gone quiet (p75 ~12s on /prescription, ~27 API calls
 * per open), long after the doctor is already working.
 *
 * Call once at the top of a routed page component. Mount of the page component
 * is the moment its first real content is committed — the closest React-side
 * analogue of first contentful paint for a route change.
 *
 * No-ops when the active root span is not a navigation: on hard loads the
 * pageload span carries `app_ready` from App.js instead (see src/App.js), and
 * measuring there would double-count.
 */
export default function useRouteReady() {
  useEffect(() => {
    try {
      const active = Sentry.getActiveSpan();
      const root = active && Sentry.getRootSpan(active);
      if (!root) return;
      const rootJson = Sentry.spanToJSON(root);
      if (rootJson.op !== "navigation" || !rootJson.start_timestamp) return;
      const elapsedMs = Date.now() - rootJson.start_timestamp * 1000;
      if (elapsedMs < 0) return;
      // setMeasurement shows in the trace UI, but Sentry's EAP dataset stores
      // custom measurements as string attributes, so aggregation (p75 per route)
      // fails on measurements.route_ready. Also write a numeric span attribute so
      // p75(tags[route_ready_ms,number]) works — the per-route number this exists
      // to produce.
      Sentry.setMeasurement("route_ready", elapsedMs, "millisecond");
      root.setAttribute("route_ready_ms", Math.round(elapsedMs));
    } catch (e) {
      // Telemetry only — never let measurement failures reach the page.
    }
  }, []);
}
