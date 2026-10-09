// TEMPORARY — remove once release attribution has been confirmed on UAT.
// Revert with:  git revert <this commit>   (or delete this file + its call in src/index.js)
//
// Fires a labelled error into Sentry when ?__sentry_test=<label> is present on any URL,
// e.g.  https://<uat-host>/?__sentry_test=uat-check-1
//
// Deliberately a *captured* exception rather than a throw: it proves release attribution
// just as well, but nothing visibly breaks for anyone else testing on the shared
// environment. Nobody reaches it without typing the query param.

import * as Sentry from "@sentry/react";
import { APP_RELEASE } from "./appVersion";

export function fireSentryTestErrorIfRequested() {
  if (typeof window === "undefined") return;

  const label = new URLSearchParams(window.location.search).get("__sentry_test");
  if (!label) return;

  const error = new Error(`Sentry release-tracking test [${label}]`);
  error.name = "SentryReleaseTest";

  const eventId = Sentry.captureException(error, {
    tags: { sentry_release_test: label },
  });

  // console.info is not in consoleLoggingIntegration's captured levels, so this stays local.
  console.info(
    `[sentry-test] sent eventId=${eventId} release=${APP_RELEASE || "(none — not a CI build)"}`
  );
}
