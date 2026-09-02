import {
  isGoogleTagFrame,
  isGoogleTagManagerEvent,
  isMetaInAppBrowserBridgeError,
  isTalkativeFrame,
  isTalkativeWidgetEvent,
  isUnactionableThirdPartyEvent,
} from "./sentryNoiseFilters";

const eventWithFrames = (filenames, value = "boom") => ({
  exception: {
    values: [
      {
        type: "TypeError",
        value,
        stacktrace: { frames: filenames.map((filename) => ({ filename })) },
      },
    ],
  },
});

describe("isTalkativeFrame", () => {
  it("matches the vendor bundle, its path and its host", () => {
    expect(isTalkativeFrame("/ecsv2/0.54.2/talkative-engage.js")).toBe(true);
    expect(isTalkativeFrame("https://au.engage.app/api/ecs/v1/loader.js")).toBe(
      true
    );
  });

  it("does not match first-party bundles", () => {
    expect(isTalkativeFrame("/static/js/main.ea171da8.js")).toBe(false);
    expect(isTalkativeFrame("/static/js/1320.4ba70a88.chunk.js")).toBe(false);
  });

  it("tolerates a missing filename", () => {
    expect(isTalkativeFrame(undefined)).toBe(false);
    expect(isTalkativeFrame(null)).toBe(false);
  });
});

describe("isTalkativeWidgetEvent frame matching", () => {
  it("matches on abs_path even when filename is present but non-matching", () => {
    // Real Sentry frames commonly carry both fields, with filename a
    // synthetic label ("<anonymous>") and abs_path the real URL. A `filename
    // || abs_path` check would stop at the truthy non-matching filename and
    // never look at abs_path — this is the shape that regression covers.
    const event = {
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  filename: "<anonymous>",
                  abs_path: "https://au.engage.app/ecsv2/0.54.2/talkative-engage.js",
                },
              ],
            },
          },
        ],
      },
    };

    expect(isTalkativeWidgetEvent(event)).toBe(true);
  });
});

describe("isUnactionableThirdPartyEvent", () => {
  it("drops the Talkative config fetch failure", () => {
    // TATVAPRACTICE-1A / -1M. The innermost frame is Sentry's own fetch
    // instrumentation inside our bundle, with the vendor frames above it, which
    // is why the check cannot require every frame to be third-party.
    const event = eventWithFrames(
      [
        "/static/js/main.ea171da8.js",
        "/ecsv2/0.54.2/talkative-engage.js",
        "/ecsv2/0.54.2/talkative-engage.js",
      ],
      "Failed to fetch (au.engage.app)"
    );

    expect(isUnactionableThirdPartyEvent(event)).toBe(true);
  });

  it("drops the Talkative missing-config TypeError", () => {
    // TATVAPRACTICE-73: loadConfig resolved without setting
    // window.talkativeOnlineResponse, so the next line dereferenced undefined.
    const event = eventWithFrames(
      ["/ecsv2/0.54.2/talkative-engage.js"],
      "Cannot read properties of undefined (reading 'config')"
    );

    expect(isUnactionableThirdPartyEvent(event)).toBe(true);
  });

  it("keeps a first-party error with the same message", () => {
    // The guard must be structural, not message-based. This exact message is
    // one of the most common real bugs in this codebase and must still report.
    const event = eventWithFrames(
      ["/static/js/main.ea171da8.js", "/static/js/1320.4ba70a88.chunk.js"],
      "Cannot read properties of undefined (reading 'config')"
    );

    expect(isUnactionableThirdPartyEvent(event)).toBe(false);
  });

  it("keeps a failed fetch to our own API", () => {
    const event = eventWithFrames(
      ["/static/js/main.ea171da8.js"],
      "Failed to fetch (pm-prod-growth-chart.tatvacare.in)"
    );

    expect(isUnactionableThirdPartyEvent(event)).toBe(false);
  });

  it("keeps events that carry no stack", () => {
    // The MoEngage rejection arrives with no stacktrace at all, so it is left
    // to Sentry's ignoreErrors message matching rather than handled here.
    expect(isUnactionableThirdPartyEvent({})).toBe(false);
    expect(isUnactionableThirdPartyEvent({ exception: {} })).toBe(false);
    expect(
      isUnactionableThirdPartyEvent({ exception: { values: [{ value: "x" }] } })
    ).toBe(false);
  });

  it("reads frames from every exception value", () => {
    const event = {
      exception: {
        values: [
          { stacktrace: { frames: [{ filename: "/static/js/main.js" }] } },
          {
            stacktrace: {
              frames: [{ abs_path: "/ecsv2/0.54.2/talkative-engage.js" }],
            },
          },
        ],
      },
    };

    expect(isTalkativeWidgetEvent(event)).toBe(true);
  });
});

describe("the MoEngage ignoreErrors pattern", () => {
  // Mirrors the regex registered in index.js, asserted against the exact value
  // Sentry recorded for TATVAPRACTICE-33.
  const MOENGAGE_PATTERN = /Error in getting sdk settings from localstorage/i;

  it("matches the reported rejection value", () => {
    expect(
      MOENGAGE_PATTERN.test(
        "Non-Error promise rejection captured with value: Error in getting sdk settings from localstorage - no data found"
      )
    ).toBe(true);
  });

  it("does not match unrelated localStorage errors", () => {
    expect(
      MOENGAGE_PATTERN.test("Failed to read prescription draft from localStorage")
    ).toBe(false);
  });
});

describe("isMetaInAppBrowserBridgeError", () => {
  // Ported with the filter from PR #3799.
  const metaEvent = ({ browserName = "Instagram", value, functionName }) => ({
    contexts: { browser: { name: browserName } },
    exception: {
      values: [
        {
          type: "TypeError",
          value,
          mechanism: { type: "auto.browser.global_handlers.onerror" },
          stacktrace: {
            frames: [{ function: functionName, filename: "/login" }],
          },
        },
      ],
    },
  });

  it("drops Instagram WebKit bridge errors", () => {
    expect(
      isMetaInAppBrowserBridgeError(
        metaEvent({
          value:
            "undefined is not an object (evaluating 'window.webkit.messageHandlers')",
          functionName: "sendDataToNative",
        })
      )
    ).toBe(true);
  });

  it("drops Facebook Java bridge lifecycle errors", () => {
    expect(
      isMetaInAppBrowserBridgeError(
        metaEvent({
          browserName: "Facebook",
          value: "Error invoking postMessage: Java object is gone",
          functionName: "sendBeforeUnloadMessage",
        })
      )
    ).toBe(true);
  });

  it("keeps the same message outside a Meta browser", () => {
    expect(
      isMetaInAppBrowserBridgeError(
        metaEvent({
          browserName: "Safari",
          value:
            "undefined is not an object (evaluating 'window.webkit.messageHandlers')",
          functionName: "sendDataToNative",
        })
      )
    ).toBe(false);
  });

  it("keeps a Meta-browser error that is not a bridge failure", () => {
    // A real bug hit inside the Instagram browser must still report.
    expect(
      isMetaInAppBrowserBridgeError(
        metaEvent({
          value: "Cannot read properties of undefined (reading 'pm_dob')",
          functionName: "renderGrowthChart",
        })
      )
    ).toBe(false);
  });

  it("requires a bridge frame, not just a bridge message", () => {
    expect(
      isMetaInAppBrowserBridgeError(
        metaEvent({
          value: "Java object is gone",
          functionName: "handleSubmit",
        })
      )
    ).toBe(false);
  });

  it("does not accept a frame keyword that appears only in the message text", () => {
    // The message mentions "sendDataToNative", but the actual frame is
    // something unrelated. Bridge evidence must come from a real frame, not
    // from re-finding the same keyword in the message a second time — that
    // would let the "bridge frame" half of the AND be satisfied by the
    // message alone, collapsing the three-way check to two conditions.
    expect(
      isMetaInAppBrowserBridgeError(
        metaEvent({
          value: "Error invoking sendDataToNative: Java object is gone",
          functionName: "handleSubmit",
        })
      )
    ).toBe(false);
  });

  it("recognises any iabjs:// bridge frame, not just the enumerated call sites", () => {
    // TATVAPRACTICE-1HB: Facebook browser, "Java object is gone", frames under
    // iabjs://autofill_test_android and iabjs://iabjs_bridge_init — neither is
    // one of the literal call-site names this module enumerates, but both are
    // the iabjs:// bridge scheme. The enumerated names stay for frames whose
    // filename does not carry that scheme; the scheme match is what makes this
    // function's real-world coverage match what ignoreErrors already provided.
    const event = {
      contexts: { browser: { name: "Facebook" } },
      exception: {
        values: [
          {
            value: "Error: Java object is gone",
            stacktrace: {
              frames: [
                { filename: "iabjs://autofill_test_android" },
                {
                  filename: "iabjs://iabjs_bridge_init",
                  function: "window.__call_iabjs_unified_bridge",
                },
              ],
            },
          },
        ],
      },
    };

    expect(isMetaInAppBrowserBridgeError(event)).toBe(true);
  });

  it("reads the browser name from tags when contexts are absent", () => {
    const event = {
      tags: { "browser.name": "Instagram" },
      exception: {
        values: [
          {
            value: "Java object is gone",
            stacktrace: { frames: [{ function: "sendPageHideMessage" }] },
          },
        ],
      },
    };

    expect(isMetaInAppBrowserBridgeError(event)).toBe(true);
    expect(isUnactionableThirdPartyEvent(event)).toBe(true);
  });
});

describe("isGoogleTagFrame", () => {
  it("matches gtag.js and the GTM host", () => {
    expect(isGoogleTagFrame("/gtag/js:832:225")).toBe(true);
    expect(isGoogleTagFrame("https://www.googletagmanager.com/gtag/js")).toBe(
      true
    );
  });

  it("does not match first-party bundles", () => {
    expect(isGoogleTagFrame("/static/js/main.818fe0ff.js")).toBe(false);
    expect(isGoogleTagFrame("/static/js/1320.4ba70a88.chunk.js")).toBe(false);
  });

  it("does not match browser extensions", () => {
    // Deliberate: an extension frame rides along on these stacks, but matching
    // chrome-extension:// would hide every extension-injected error app-wide.
    expect(
      isGoogleTagFrame("chrome-extension://bkkbcggnhapdmkeljlodobbkopceiche/injectScriptAdjust.js")
    ).toBe(false);
  });

  it("tolerates a missing filename", () => {
    expect(isGoogleTagFrame(undefined)).toBe(false);
    expect(isGoogleTagFrame(null)).toBe(false);
  });
});

describe("isGoogleTagManagerEvent", () => {
  it("matches the real captured stack shape of TATVAPRACTICE-18R", () => {
    // Frames trimmed from the real event: gtag's own fetch call, an extension
    // frame, and Sentry's fetch instrumentation in the first-party bundle
    // underneath. The first-party frame is why this checks "any frame".
    const event = {
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Failed to fetch (www.google.com)",
            stacktrace: {
              frames: [
                { filename: "/static/js/main.818fe0ff.js" },
                { filename: "/gtag/js:406:34", function: "Ap.J" },
                { filename: "/gtag/js:404:3175", function: "Ap.sendRequest" },
                {
                  filename:
                    "chrome-extension://bkkbcggnhapdmkeljlodobbkopceiche/injectScriptAdjust.js",
                },
                { filename: "/static/js/main.818fe0ff.js" },
              ],
            },
          },
        ],
      },
    };

    expect(isGoogleTagManagerEvent(event)).toBe(true);
    expect(isUnactionableThirdPartyEvent(event)).toBe(true);
  });

  it("matches on abs_path when filename is synthetic", () => {
    const event = {
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  filename: "<anonymous>",
                  abs_path: "https://www.googletagmanager.com/gtag/js?id=GTM-N5GKPHK",
                },
              ],
            },
          },
        ],
      },
    };

    expect(isGoogleTagManagerEvent(event)).toBe(true);
  });

  it("leaves a first-party 'Failed to fetch' alone", () => {
    // The message is one of the most common real bugs in this codebase. Without
    // a GTM frame it must keep reporting — this is the regression that proves
    // the filter is matching frames, not message text.
    const event = eventWithFrames(
      ["/static/js/main.818fe0ff.js", "/static/js/1320.4ba70a88.chunk.js"],
      "Failed to fetch"
    );

    expect(isGoogleTagManagerEvent(event)).toBe(false);
    expect(isUnactionableThirdPartyEvent(event)).toBe(false);
  });

  it("does not match an extension frame on its own", () => {
    const event = eventWithFrames([
      "chrome-extension://bkkbcggnhapdmkeljlodobbkopceiche/injectScriptAdjust.js",
    ]);

    expect(isGoogleTagManagerEvent(event)).toBe(false);
  });
});
