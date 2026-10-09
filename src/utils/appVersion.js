// Single source for the app version shown in the UI.
//
// Read from window.__APP_RELEASE__, which CI substitutes into build/index.html AFTER
// the webpack build. It is the SAME string registered as the Sentry release, so a
// version a doctor reads off the screen maps 1:1 to a release in Sentry. Formats:
//   prod / zy-preprod : pm-doctor-portal@4.8.0+61c4b3f   -> "v4.8.0"
//   uat / qa          : pm-doctor-portal@61c4b3f         -> "61c4b3f"
//   local dev         : undefined                        -> ""  (render nothing)
//
// It used to be REACT_APP_SENTRY_RELEASE, inlined by CRA. That put a per-commit value
// into env.raw, which is webpack's cache.version, so the filesystem cache invalidated on
// every single deploy. Reading it at runtime instead keeps the string out of every
// module, which also means a warm cache can never serve a stale release.
//
// Docs: docs/release-versioning.md, docs/build-time-optimisation-plan.md §9.1

// Two sources, in priority order, because environments migrate one at a time:
//
//   window.__APP_RELEASE__          uat — stamped into build/index.html after the build
//   REACT_APP_SENTRY_RELEASE        qa, zy-preprod, prod — still inlined by CRA from the
//                                   Dockerfile build-arg
//
// The fallback is what keeps the environments still building inside Docker working
// unchanged. Remove it only once every workflow stamps the release; until then, dropping
// it would silently blank the release on those environments — Sentry keeps accepting
// events, it just stops attributing them.
//
// Note the fallback does NOT reintroduce the cache problem on uat: an unset REACT_APP_*
// var is absent from process.env, so react-scripts never puts it in env.raw.
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
