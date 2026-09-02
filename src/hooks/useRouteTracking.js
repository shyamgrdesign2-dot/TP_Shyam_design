import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { getSentryRouteName } from "../utils/sentryRouteNames";

/**
 * A navigation span younger than this belongs to the route change we are handling
 * right now. The SDK's router integration and this hook both run inside the same
 * React commit, so its span is only a few milliseconds old by the time we look.
 */
const FRESH_NAVIGATION_SPAN_MS = 1000;

/**
 * True when Sentry's own React Router integration has already opened a navigation
 * span for this route change.
 *
 * Sentry.withSentryReactRouterV6Routing (App.js) opens one for PUSH and POP
 * navigations, and its effect runs before this hook's because it is a descendant
 * of App. Calling startBrowserTracingNavigationSpan on top of that makes the SDK
 * cancel the span it just created (maybeEndActiveSpan) and open a replacement, so
 * every such navigation shipped two transactions: one cancelled at ~0ms and one
 * real. Measured in prod: ~226k navigation spans against ~82k pageloads.
 *
 * Deliberately fails open — any uncertainty returns false and we create the span,
 * which is the pre-existing behaviour. That matters because the SDK integration
 * only handles PUSH and POP (instrumentation.js: navigationType === 'PUSH' ||
 * 'POP'), while this app has ~170 navigate(..., { replace: true }) call sites
 * whose navigations Sentry does not instrument at all. Those must keep getting a
 * span from here.
 */
function hasFreshNavigationSpan() {
  try {
    const active = Sentry.getActiveSpan?.();
    const root = active && Sentry.getRootSpan?.(active);
    if (!root) return false;

    const json = Sentry.spanToJSON(root);
    if (json.op !== "navigation" || !json.start_timestamp) return false;

    // Sentry stamps span timestamps from performance.timeOrigin + performance.now(),
    // not the wall clock; comparing against Date.now() would drift on any OS clock
    // adjustment, and tabs here stay open for days.
    const nowSeconds =
      typeof performance !== "undefined" &&
      performance.timeOrigin &&
      typeof performance.now === "function"
        ? (performance.timeOrigin + performance.now()) / 1000
        : Date.now() / 1000;

    return (nowSeconds - json.start_timestamp) * 1000 < FRESH_NAVIGATION_SPAN_MS;
  } catch (e) {
    return false;
  }
}

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
    // CHANGES open a navigation span, and only when the SDK has not already opened
    // one for this same change — see hasFreshNavigationSpan above.
    if (!isInitialMount && !hasFreshNavigationSpan()) {
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
