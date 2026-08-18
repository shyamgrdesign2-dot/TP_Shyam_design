// Where Sentry events from this build should be filed.
//
// REACT_APP_ENV cannot be used for this. It selects the API base URL
// (see EnvironmentConfig.js), and .env.dev deliberately sets it to "prod" so local
// development talks to prod APIs. Reusing it as the Sentry environment meant every
// error thrown on a developer's laptop was filed as a production error, mixed in with
// real ones from real doctors.
//
// Detected at runtime/build-time instead, so a gitignored .env file cannot break it:
//   - NODE_ENV is "development" only under `craco start`; Docker builds run
//     `npm run build`, which sets it to "production". This is the primary signal.
//   - The hostname check additionally catches a production build served locally
//     (e.g. `serve -s build`), where NODE_ENV is already "production".

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function hasLocalHostname() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    LOCAL_HOSTNAMES.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".localhost")
  );
}

/** True when this build is running on a developer machine rather than a deployed environment. */
export const isLocalRuntime =
  process.env.NODE_ENV !== "production" || hasLocalHostname();

/**
 * Environment name for Sentry. Local runs are filed under "local" so they can be
 * excluded from production dashboards, alerts and issue counts with `!environment:local`.
 */
export const SENTRY_ENVIRONMENT = isLocalRuntime
  ? "local"
  : process.env.REACT_APP_ENV || "prod";

/**
 * Whether to actually transmit. Local runs are silent by default: they produce HMR noise
 * and StrictMode double-invocations, carry no release and no uploaded sourcemaps (so the
 * traces are unusable), and every event consumes paid quota.
 *
 * To debug the Sentry integration itself, opt in for one session:
 *   REACT_APP_SENTRY_LOCAL=1 npm run start:dev
 * Those events still go to environment "local", never to prod.
 */
export const SENTRY_ENABLED =
  !isLocalRuntime || process.env.REACT_APP_SENTRY_LOCAL === "1";
