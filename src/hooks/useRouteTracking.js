import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { getSentryRouteName } from "../utils/sentryRouteNames";

export default function useRouteTracking() {
  const location = useLocation();
  const prevPathRef = useRef("");

  useEffect(() => {
    const pathname = location.pathname || "/";

    if (prevPathRef.current === pathname) return;
    const isInitialMount = prevPathRef.current === "";
    prevPathRef.current = pathname;

    const normalizedPath = getSentryRouteName(pathname);

    Sentry.getCurrentScope()?.setTransactionName?.(normalizedPath);
    Sentry.setTag("route", normalizedPath);

    // On the very first mount the document's pageload span is still running, and this
    // route IS that pageload's route — there is no navigation to record. Starting a
    // navigation span here makes the SDK cancel the pageload span (maybeEndActiveSpan
    // in browserTracingIntegration), which closes the web-vital measurement window
    // before FCP/LCP arrive and strands any measurement aimed at the pageload — the
    // same boot-navigation class of bug the navigateIfChanged guard in App.js exists
    // to prevent, reached through the SDK API instead of the router. Only real route
    // CHANGES open a navigation span.
    if (!isInitialMount) {
      Sentry.startBrowserTracingNavigationSpan?.(
        Sentry.getClient(),
        {
          name: normalizedPath,
          op: "navigation",
          attributes: {
            "sentry.source": "url",
          },
        },
        {
          url: window.location.href,
        }
      );
    }

    window?.Moengage?.track_event?.("route_mount", {
      pathname: normalizedPath,
    });
  }, [location.pathname]);
}
