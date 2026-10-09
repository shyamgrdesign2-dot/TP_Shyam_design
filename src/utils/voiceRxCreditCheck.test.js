import {
  getCreditCheckActionMessage,
  hasServiceCreditPayload,
  isPlanDetailsAlreadyExistsError,
  shouldBlockVoiceRxForPlan,
} from "./voiceRxCreditCheck";

describe("voiceRxCreditCheck", () => {
  it("detects monetization plan-details duplicate messages", () => {
    expect(
      isPlanDetailsAlreadyExistsError(
        "User with b2c_id: abc already exists in plan details"
      )
    ).toBe(true);

    expect(isPlanDetailsAlreadyExistsError("Credit balance is exhausted")).toBe(false);
  });

  it("extracts credit-check messages from common thunk shapes", () => {
    expect(
      getCreditCheckActionMessage({
        payload: { data: { error: { description: "Detailed error" } } },
      })
    ).toBe("Detailed error");

    expect(
      getCreditCheckActionMessage({
        payload: { data: { message: "API message" } },
      })
    ).toBe("API message");

    expect(
      getCreditCheckActionMessage({
        error: { message: "Thunk error" },
      })
    ).toBe("Thunk error");
  });

  it("checks service payloads safely", () => {
    expect(hasServiceCreditPayload({ service_name: "VOICE_RX" })).toBe(true);
    expect(hasServiceCreditPayload(null)).toBe(false);
    expect(hasServiceCreditPayload({ data: { service_name: "VOICE_RX" } })).toBe(false);
  });

  it("blocks paid users on exhausted or failed verification plans only", () => {
    const options = {
      freeTier: "FREE",
      failedVerificationTier: "FAILED_VERIFICATION",
    };

    expect(
      shouldBlockVoiceRxForPlan(
        { plan_tier: "FREE", credit_balance: 0 },
        { ...options, isFreeVoiceRxUser: false }
      )
    ).toBe(true);

    expect(
      shouldBlockVoiceRxForPlan(
        { plan_tier: "FAILED_VERIFICATION", credit_balance: 10 },
        { ...options, isFreeVoiceRxUser: false }
      )
    ).toBe(true);

    expect(
      shouldBlockVoiceRxForPlan(
        { plan_tier: "FREE", credit_balance: 0 },
        { ...options, isFreeVoiceRxUser: true }
      )
    ).toBe(false);
  });
});
