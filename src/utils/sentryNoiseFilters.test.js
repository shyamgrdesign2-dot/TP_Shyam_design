import {
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
