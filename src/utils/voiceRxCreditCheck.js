export function hasServiceCreditPayload(payload) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "service_name")
  );
}

export function getCreditCheckActionMessage(action = {}) {
  const payload = action?.payload;
  const payloadError = payload?.data?.error;

  if (payloadError && typeof payloadError === "object" && payloadError.description) {
    return payloadError.description;
  }

  if (typeof payloadError === "string") {
    return payloadError;
  }

  const candidates = [
    payload?.data?.message,
    payload?.message,
    action?.error?.message,
    action?.error,
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
    if (candidate && typeof candidate === "object" && typeof candidate.message === "string") {
      return candidate.message;
    }
  }

  return "";
}

export function isPlanDetailsAlreadyExistsError(error) {
  const message =
    typeof error === "string" ? error : getCreditCheckActionMessage(error);

  return /already\s+exists\s+in\s+plan\s+details/i.test(message || "");
}

export function shouldBlockVoiceRxForPlan(
  planDetails,
  { isFreeVoiceRxUser = false, freeTier, failedVerificationTier } = {}
) {
  if (isFreeVoiceRxUser) return false;

  if (planDetails?.plan_tier === failedVerificationTier) {
    return true;
  }

  return (
    planDetails?.plan_tier === freeTier &&
    Number(planDetails?.credit_balance) <= 0
  );
}
