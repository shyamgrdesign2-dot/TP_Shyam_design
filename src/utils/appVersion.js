// Single source for the app version shown in the UI.
//
// REACT_APP_SENTRY_RELEASE is baked at build time from the SENTRY_RELEASE build-arg
// (see Dockerfile + .github/workflows/*). It is the SAME string registered as the
// Sentry release, so a version a doctor reads off the screen maps 1:1 to a release
// in Sentry. Formats:
//   prod / zy-preprod : pm-doctor-portal@4.8.0+61c4b3f   -> "v4.8.0"
//   uat / qa          : pm-doctor-portal@61c4b3f         -> "61c4b3f"
//   local dev         : undefined                        -> ""  (render nothing)
//
// Docs: docs/release-versioning.md

const RELEASE = process.env.REACT_APP_SENTRY_RELEASE || "";

// Everything after the package prefix; "" when RELEASE is unset (indexOf -> -1, slice(0)).
const afterPackage = RELEASE.slice(RELEASE.indexOf("@") + 1);
const core = afterPackage.split("+")[0];

/** Full release string, e.g. "pm-doctor-portal@4.8.0+61c4b3f". Empty in local dev. */
export const APP_RELEASE = RELEASE;

/** Short label for display, e.g. "v4.8.0" or "61c4b3f". Empty in local dev — callers must not render. */
export const APP_VERSION_LABEL = /^\d+\.\d+\.\d+$/.test(core) ? `v${core}` : core;
