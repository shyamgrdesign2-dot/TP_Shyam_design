import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import App from './App';
import reportWebVitals from './reportWebVitals';
import { APP_RELEASE } from './utils/appVersion';

import './index.css';
import './styles/app.scss';
import './components/dental/styles/globals.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import 'bootstrap/dist/css/bootstrap.min.css';
// eslint-disable-next-line import/no-unresolved -- resolved via the package "exports" map, which eslint's resolver doesn't read
import '@dhspl-tatvacare/tesseract-ui/styles.css';
import './styles/tesseractContainment.scss';
import { TesseractThemeProvider } from '@dhspl-tatvacare/tesseract-ui';
import * as Sentry from "@sentry/react";
import {
  isChunkLoadError,
  shouldReloadForChunkFailure,
} from "./utils/chunkReloadGuard";
import { isProductionEnv } from "./utils/environment";
import { getSentryRouteNameFromUrl } from "./utils/sentryRouteNames";
import { reportBrowserOfflineToSentry } from "./utils/sentryNetwork";
import { fireSentryTestErrorIfRequested } from "./utils/sentryTestError"; // TEMPORARY — see file header

// Provide a MoEngage stub with a bounded queue so early calls don't crash or get lost.
if (typeof window !== "undefined") {
  window.Moengage = window.Moengage || {};
  window.__moeQueue = window.__moeQueue || [];
  window.__flushMoeQueue = window.__flushMoeQueue || ((moeInstance) => {
    if (!moeInstance || !window.__moeQueue) return;
    const queue = window.__moeQueue;
    window.__moeQueue = [];
    queue.forEach(({ fn, args }) => {
      try {
        if (typeof moeInstance?.[fn] === "function") {
          moeInstance[fn](...args);
        }
      } catch (_) {
        // no-op: avoid breaking app on analytics errors
      }
    });
  });
  [
    "track_event",
    "add_user_attribute",
    "add_unique_user_id",
    "add_first_name",
    "add_last_name",
    "add_user_name",
    "add_email",
    "add_mobile",
    "destroy_session",
  ].forEach((fn) => {
    if (!window.Moengage[fn]) {
      window.Moengage[fn] = (...args) => {
        const q = window.__moeQueue;
        if (!q) return;
        if (q.length >= 50) q.shift();
        q.push({ fn, args });
      };
    }
  });
}

const appEnv = process.env.REACT_APP_ENV || "prod";
const isProd = isProductionEnv(appEnv);
const tracesSampleRateValue =
  Number(
    process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE ??
      (isProd ? 0.1 : 0.5)
  ) || 0.5;

Sentry.init({
  dsn: "https://a4c36bf5194238bfa49de0a593619865@o4509755819294720.ingest.us.sentry.io/4510737179475968",
  // Read from window.__APP_RELEASE__, which CI substitutes into build/index.html after
  // the webpack build (see .github/workflows/*, "Stamp the release"). MUST be
  // byte-identical to the release used for `sentry-cli sourcemaps upload`, otherwise
  // Sentry cannot symbolicate — CI derives both from the same SENTRY_RELEASE value and
  // fails the build if the substitution does not happen.
  //
  // It is NOT a REACT_APP_* var any more: those land in env.raw, which is webpack's
  // cache.version, so a per-commit release string invalidated the whole filesystem cache
  // every deploy. See docs/build-time-optimisation-plan.md §9.1.
  //
  // `|| undefined` keeps local dev behaviour identical — Sentry omits the field rather
  // than registering a release of "".
  release: APP_RELEASE || undefined,
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  tracesSampleRate: tracesSampleRateValue,
  tracePropagationTargets: [],
  sendDefaultPii: true,
  environment: appEnv,
  beforeSend(event) {
    // Filter out development errors or specific error types
    if (event.environment === "dev") return null;
    return event;
  },
  beforeSendTransaction(event) {
    const routeName = getSentryRouteNameFromUrl(event?.request?.url);
    if (routeName) {
      event.transaction = routeName;
      event.transaction_info = {
        ...event.transaction_info,
        source: "url",
      };
    }
    return event;
  },
  enableLogs: true
});

// TEMPORARY — remove with src/utils/sentryTestError.js once UAT release attribution is confirmed.
// Must run after Sentry.init so the event carries the release.
fireSentryTestErrorIfRequested();

// Fix for stale lazy-loaded chunks after a new deployment.
// Bounded retries prevent infinite reload loops while allowing transient recovery.

if (typeof window !== "undefined") {
  const reloadIfAllowed = (signature) => {
    if (!shouldReloadForChunkFailure(signature)) return;
    window.location.reload();
  };

  window.addEventListener("error", (event) => {
    const message = event?.message || event?.error?.message || "";

    if (isChunkLoadError(message)) {
      reloadIfAllowed(`global-error:${message}`);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message = event?.reason?.message || "";

    if (isChunkLoadError(message)) {
      reloadIfAllowed(`unhandled-rejection:${message}`);
    }
  });

  window.addEventListener("offline", reportBrowserOfflineToSentry);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter basename={"/"}>
      <TesseractThemeProvider colorScheme="light">
        <App />
      </TesseractThemeProvider>
    </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register Service Worker for PWA
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Only register on HTTPS or localhost (PWA requirement)
  const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isSecureContext) {
    window.addEventListener('load', () => {
      // Check if service worker is already registered
      navigator.serviceWorker.getRegistration()
        .then((existingRegistration) => {
          if (existingRegistration) {
            // Service worker already registered, just log
            if (process.env.NODE_ENV !== 'production') {
              console.log('Service Worker already registered:', existingRegistration.scope);
            }
            return existingRegistration;
          }
          // Register new service worker
          return navigator.serviceWorker.register('/serviceworker.js', {
            scope: '/'
          });
        })
        .then((registration) => {
          if (registration) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('Service Worker registered successfully:', registration.scope);
            }
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    if (process.env.NODE_ENV !== 'production') {
                      console.log('Service Worker updated');
                    }
                    // Optionally show update notification to user
                  }
                });
              }
            });
          }
        })
        .catch((error) => {
          // Silently fail - service worker is optional for PWA functionality
          // Only log in development
          if (process.env.NODE_ENV !== 'production') {
            console.error('Service Worker registration failed:', error);
          }
        });
    });

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Service Worker controller changed');
      }
      // Optionally reload page when new service worker takes control
      // window.location.reload();
    });
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('Service Worker requires HTTPS (or localhost)');
  }
}
