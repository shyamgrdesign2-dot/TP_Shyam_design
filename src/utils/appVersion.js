// Single source for the app version shown in the UI.
//
// Read from window.__APP_RELEASE__, which CI substitutes into build/index.html AFTER
// the webpack build. It is the SAME string registered as the
// Sentry release, so a version a doctor reads off the screen maps 1:1 to a release
// in Sentry. Formats:
//   prod / zy-preprod : pm-doctor-portal@4.8.0+61c4b3f   -> "v4.8.0"
//   uat / qa          : pm-doctor-portal@61c4b3f         -> "61c4b3f"
//   local dev         : undefined                        -> ""  (render nothing)
//
// Docs: docs/release-versioning.md

// Two sources, in priority order, because environments migrate one at a time:
//
//   window.__APP_RELEASE__          stamped into build/index.html after the build
//   REACT_APP_SENTRY_RELEASE        environments still building inside the Dockerfile
//
// The fallback keeps qa and zy-preprod working unchanged — they still build via the
// multi-stage Dockerfile and have no stamping step. Remove it only once every workflow
// stamps; until then dropping it would silently blank their release, and Sentry keeps
// accepting events either way.
//
// The fallback does NOT reintroduce the cache problem: an unset REACT_APP_* var is
// absent from process.env, so react-scripts never puts it in env.raw.
//
// The literal placeholder survives in local dev, where CI never substitutes it. It is
// %%APP_RELEASE%% rather than __APP_RELEASE__ so a global substitution cannot also
// rewrite the window.__APP_RELEASE__ property name in index.html.
const STAMPED =
  (typeof window !== "undefined" && window.__APP_RELEASE__) || "";
const RELEASE =
  (STAMPED === "%%APP_RELEASE%%" ? "" : STAMPED) ||
  process.env.REACT_APP_SENTRY_RELEASE ||
  "";

// Everything after the package prefix; "" when RELEASE is unset (indexOf -> -1, slice(0)).
const afterPackage = RELEASE.slice(RELEASE.indexOf("@") + 1);
const core = afterPackage.split("+")[0];

/** Full release string, e.g. "pm-doctor-portal@4.8.0+61c4b3f". Empty in local dev. */
export const APP_RELEASE = RELEASE;

/** Short label for display, e.g. "v4.8.0" or "61c4b3f". Empty in local dev — callers must not render. */
export const APP_VERSION_LABEL = /^\d+\.\d+\.\d+$/.test(core) ? `v${core}` : core;
