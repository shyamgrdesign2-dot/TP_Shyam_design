import {
  clearLatestSoapDraft,
  getLatestSoapDraft,
  setLatestSoapDraft,
} from "./soap-session-draft";

describe("soap-session-draft", () => {
  afterEach(() => {
    clearLatestSoapDraft();
  });

  it("does not return another session's SOAP draft for a new session", () => {
    setLatestSoapDraft({
      sessionId: "session-a",
      html: "<h1>Subjective</h1>",
      soap: { subjective: "Subjective" },
    });

    expect(getLatestSoapDraft("session-a")).toEqual(
      expect.objectContaining({ html: "<h1>Subjective</h1>" })
    );
    expect(getLatestSoapDraft("session-b")).toBeNull();
  });

  it("keeps the global fallback only for callers without a session id", () => {
    setLatestSoapDraft({
      sessionId: "session-a",
      html: "<h1>Plan</h1>",
      soap: { plan: "Plan" },
    });

    expect(getLatestSoapDraft()).toEqual(
      expect.objectContaining({ html: "<h1>Plan</h1>" })
    );
  });
});
