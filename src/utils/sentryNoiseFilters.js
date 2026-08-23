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

export const isUnactionableThirdPartyEvent = (event) =>
  isTalkativeWidgetEvent(event);

export default isUnactionableThirdPartyEvent;
