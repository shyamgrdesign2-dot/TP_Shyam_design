// Filters for errors thrown inside third-party SDKs that this codebase injects
// but neither ships nor controls.
//
// The Talkative chat widget (components/TalkativeWidget.js) loads a vendor
// bundle, talkative-engage.js, from engage.app. That bundle boots itself with an
// un-caught async IIFE:
//
//   await u.A.loadConfig();
//   const t = window.talkativeOnlineResponse.config;
//
// loadConfig() fetches https://au.engage.app/api/ecs/v1/config/<uuid>. When that
// request fails — offline, DNS, a corporate proxy, an ad blocker — the rejection
// is never caught by the vendor, so the browser reports an unhandled rejection
// and Sentry's global handler files it against this project. When the fetch
// resolves but returns no config, window.talkativeOnlineResponse is left unset
// and the next line throws "Cannot read properties of undefined (reading
// 'config')" instead. Same cause, different surface.
//
// Nothing in this repository can prevent either: we hand the browser a script
// tag, and the vendor owns every promise after that. Filtering here stops ~800
// events a week from burying issues we can actually fix.
//
// This does NOT make the widget work. If these events matter to someone, the
// question is why au.engage.app is unreachable for a chunk of users, and that
// belongs with whoever owns the Talkative account.

// Matched against stack frame filenames. Kept specific to the vendor bundle and
// its host so a first-party file can never match by accident.
const TALKATIVE_FRAME_PATTERNS = [
  /talkative-engage\.js/i,
  /\/ecsv2\//i,
  /\bengage\.app\b/i,
];

const getEventFrames = (event) => {
  const values = event?.exception?.values;
  if (!Array.isArray(values)) return [];

  return values.reduce((frames, value) => {
    const valueFrames = value?.stacktrace?.frames;
    return Array.isArray(valueFrames) ? frames.concat(valueFrames) : frames;
  }, []);
};

export const isTalkativeFrame = (filename) =>
  typeof filename === "string" &&
  TALKATIVE_FRAME_PATTERNS.some((pattern) => pattern.test(filename));

/**
 * True when any frame in the event comes from the Talkative bundle.
 *
 * "Any frame" rather than "every frame" is deliberate. The fetch failures carry
 * one first-party frame — Sentry's own fetch instrumentation inside main.js —
 * sitting underneath the vendor frames, so requiring every frame to be vendor
 * code would miss the highest-volume case. It stays safe because this codebase
 * never calls into Talkative and passes it no callbacks, so application logic
 * cannot legitimately appear in one of its stacks.
 */
export const isTalkativeWidgetEvent = (event) =>
  getEventFrames(event).some((frame) =>
    isTalkativeFrame(frame?.filename || frame?.abs_path)
  );

// Meta's in-app browsers (Instagram, Facebook) inject their own bridge scripts
// and then tear the native bridge down underneath them, so the page is left
// calling into an object that no longer exists. index.js already drops the two
// most common messages outright via ignoreErrors, but those blunt patterns miss
// the rest of the family ("Java exception was raised during method invocation",
// failures inside sendDataToNative / sendBeforeUnloadMessage, frames served from
// iabjs://) and would equally match a genuine bug of ours that happened to
// mention the same words.
//
// This check is deliberately narrow: the browser must be a Meta one AND the
// message must look like a bridge failure AND a bridge frame must be present.
// Originally written for PR #3799 (branch sentry-login-logs) as
// utils/sentryEventFilters.js; brought here so there is one filter module
// rather than two, because that branch cannot be merged as-is — its index.js
// predates release stamping and would revert it.
const META_BROWSER_NAMES = new Set(["Instagram", "Facebook"]);

const META_BRIDGE_FRAME_PATTERNS = [
  "sendDataToNative",
  "sendPageHideMessage",
  "sendBeforeUnloadMessage",
  "iabjs://navigation_performance_logger_android",
];

const META_BRIDGE_ERROR_PATTERNS = [
  "window.webkit.messageHandlers",
  "Java object is gone",
  "Java exception was raised during method invocation",
];

const getBrowserName = (event) =>
  event?.contexts?.browser?.name ||
  event?.tags?.["browser.name"] ||
  event?.tags?.browser?.split?.(" ")?.[0] ||
  "";

const getExceptionValues = (event) => event?.exception?.values || [];

const getExceptionText = (event) =>
  [
    event?.message,
    ...getExceptionValues(event).flatMap((exception) => [
      exception?.type,
      exception?.value,
      exception?.mechanism?.type,
    ]),
  ]
    .filter(Boolean)
    .join(" ");

const getFrameText = (event) =>
  getExceptionValues(event)
    .flatMap((exception) => exception?.stacktrace?.frames || [])
    .flatMap((frame) => [
      frame?.function,
      frame?.filename,
      frame?.abs_path,
      frame?.module,
    ])
    .filter(Boolean)
    .join(" ");

export const isMetaInAppBrowserBridgeError = (event) => {
  if (!META_BROWSER_NAMES.has(getBrowserName(event))) return false;

  const exceptionText = getExceptionText(event);
  const frameText = getFrameText(event);

  const hasBridgeError = META_BRIDGE_ERROR_PATTERNS.some((pattern) =>
    exceptionText.includes(pattern)
  );
  const hasBridgeFrame = META_BRIDGE_FRAME_PATTERNS.some(
    (pattern) => frameText.includes(pattern) || exceptionText.includes(pattern)
  );

  return hasBridgeError && hasBridgeFrame;
};

export const isUnactionableThirdPartyEvent = (event) =>
  isTalkativeWidgetEvent(event) || isMetaInAppBrowserBridgeError(event);

export default isUnactionableThirdPartyEvent;
