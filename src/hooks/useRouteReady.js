import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { nowInSpanClockSeconds, recordRootSpanMetric } from "../utils/spanTiming";

/** The DOM must stop changing for this long before the screen counts as settled. */
const QUIET_MS = 500;
/** Stop waiting for quiet after this; polling or animation can mutate forever. */
const MAX_WAIT_MS = 10000;

/**
 * Records `route_ready` on each soft navigation: how long after the route change
 * the screen stopped changing.
 *
 * Why this rather than the obvious alternatives:
 *
 * - The navigation transaction's own duration is not it. That span ends only once
 *   every background request has gone quiet — p75 ~12s on /prescription, which
 *   fires ~27 API calls per open — long after the doctor is already typing.
 *
 * - Component mount is not it either. On a revisit the route chunk is already
 *   cached, so the page component mounts within single-digit milliseconds of the
 *   click while the screen is still a loading skeleton. Measured directly:
 *   117ms on a first visit, 8ms on the cached revisit of the same route. Since
 *   doctors revisit these screens hundreds of times a day, a mount-based metric
 *   would report ~8ms and mean nothing.
 *
 * So this waits for the DOM to go quiet and reports the moment of the *last*
 * mutation — the quiet window itself is excluded from the number. That is the
 * usual RUM approximation of "content settled" for SPA route changes, since
 * browsers emit FCP/LCP only for hard document loads and the Soft Navigations
 * API is still Chrome-only.
 *
 * Lives at the app level on purpose: one call covers every route, including the
 * busiest one ("/"), and a new page cannot be forgotten. Skips the initial mount
 * — a hard load is measured by app_ready on the pageload span instead, and the op
 * guard in recordRootSpanMetric keeps the two from writing to each other's spans.
 */
export default function useRouteReady() {
  const location = useLocation();
  const prevPathRef = useRef("");

  useEffect(() => {
    const pathname = location.pathname || "/";
    if (prevPathRef.current === pathname) return undefined;
    const isInitialMount = prevPathRef.current === "";
    prevPathRef.current = pathname;
    if (isInitialMount) return undefined;

    if (typeof MutationObserver === "undefined" || !document.body) return undefined;

    let finished = false;
    let quietTimer;
    let giveUpTimer;
    let lastChangeAt = nowInSpanClockSeconds();

    const observer = new MutationObserver(() => {
      lastChangeAt = nowInSpanClockSeconds();
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, QUIET_MS);
    });

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(quietTimer);
      clearTimeout(giveUpTimer);
      observer.disconnect();
      // Report the last time the screen changed, not the time the quiet window
      // elapsed, so QUIET_MS is not baked into every measurement.
      recordRootSpanMetric("navigation", "route_ready", { endSeconds: lastChangeAt });
    }

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    quietTimer = setTimeout(finish, QUIET_MS);
    giveUpTimer = setTimeout(finish, MAX_WAIT_MS);

    return () => {
      finished = true;
      clearTimeout(quietTimer);
      clearTimeout(giveUpTimer);
      observer.disconnect();
    };
  }, [location.pathname]);
}
