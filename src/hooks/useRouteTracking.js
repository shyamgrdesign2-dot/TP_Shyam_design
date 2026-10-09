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
    prevPathRef.current = pathname;

    const normalizedPath = getSentryRouteName(pathname);

    Sentry.getCurrentScope()?.setTransactionName?.(normalizedPath);
    Sentry.setTag("route", normalizedPath);
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

    window?.Moengage?.track_event?.("route_mount", {
      pathname: normalizedPath,
    });
  }, [location.pathname]);
}
