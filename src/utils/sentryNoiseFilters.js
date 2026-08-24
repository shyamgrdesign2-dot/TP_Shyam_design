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

// Matched against a frame's filename AND its abs_path — Sentry frames often
// carry both, with filename a short/synthetic label ("<anonymous>") and
// abs_path the real URL, so checking only whichever is truthy first can miss
// the one that actually identifies the vendor bundle.
const TALKATIVE_FRAME_PATTERNS = [/talkative-engage\.js/i, /\bengage\.app\b/i];

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
 * never hands Talkative a callback of ours to run: TalkativeWidget only calls
 * OUT to talkativeApi.ui.activate/hide/deactivate, so a throw inside one of
 * those calls can carry a first-party frame on top of the vendor ones, and a
 * throw thrown BACK into our code by the vendor cannot happen — Talkative has
 * no code path that runs application logic, so no first-party frame can appear
 * for a reason other than us calling into it.
 */
export const isTalkativeWidgetEvent = (event) =>
  getEventFrames(event).some(
    (frame) =>
      isTalkativeFrame(frame?.filename) || isTalkativeFrame(frame?.abs_path)
  );

// Meta's in-app browsers (Instagram, Facebook) inject their own bridge scripts
// and then tear the native bridge down underneath them, so the page is left
// calling into an object that no longer exists.
//
// index.js's ignoreErrors already drops two of the three message shapes below
// ("window.webkit.messageHandlers", "Java object is gone") regardless of
// browser or frame. That is deliberately NOT removed here, even though this
// function is stricter: real captured production events (e.g.
// TATVAPRACTICE-1HB — Facebook browser, frames under iabjs://autofill_test_
// android and iabjs://iabjs_bridge_init) carry bridge frames this function did
// not originally recognise, so relying on this function alone would have let
// that event through. The two are complementary — ignoreErrors is the broad
// safety net proven in production, this is the precise check — not one
// superseding the other. What this function alone catches is the third
// message ("Java exception was raised during method invocation"), which has
// no ignoreErrors entry and needs the browser+frame evidence to be filtered
// safely, since that phrase alone is generic enough to appear in an unrelated
// bug.
//
// Originally written for PR #3799 (branch sentry-login-logs) as
// utils/sentryEventFilters.js; brought here so there is one filter module
// rather than two, because that branch cannot be merged as-is — its index.js
// predates release stamping and would revert it.
const META_BROWSER_NAMES = new Set(["Instagram", "Facebook"]);

// Frame identifiers observed across confirmed Meta-bridge events. The iabjs://
// scheme prefix is Meta's in-app-browser bridge namespace — real events carry
// call sites under it that vary by feature (navigation_performance_logger_
// android, autofill_test_android, iabjs_bridge_init, ...), so matching the
// scheme itself catches variants no fixed list of call-site names can, while
// staying specific to a URI scheme no first-party code ever uses.
const META_BRIDGE_FRAME_PATTERNS = [
  "sendDataToNative",
  "sendPageHideMessage",
  "sendBeforeUnloadMessage",
  "iabjs://",
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
  getEventFrames(event)
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
  // Bridge evidence must come from an actual stack frame, not from the
  // message text — otherwise a Meta-browser error whose message happens to
  // mention a frame keyword (but carries no matching frame, or no frame at
  // all) would satisfy both conditions from one string, collapsing the
  // intended three-way AND (Meta browser AND bridge message AND bridge frame)
  // into effectively two.
  const frameText = getFrameText(event);

  const hasBridgeError = META_BRIDGE_ERROR_PATTERNS.some((pattern) =>
    exceptionText.includes(pattern)
  );
  const hasBridgeFrame = META_BRIDGE_FRAME_PATTERNS.some((pattern) =>
    frameText.includes(pattern)
  );

  return hasBridgeError && hasBridgeFrame;
};

export const isUnactionableThirdPartyEvent = (event) =>
  isTalkativeWidgetEvent(event) || isMetaInAppBrowserBridgeError(event);
