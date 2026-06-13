import { trackEvent } from "../../../../utils/utils";

export const STACKS_API_EVENT_NAMES = {
  transcribeAudio: "TranscribeAudio",
  digitiseData: "DigitiseData",
  getSoapNotes: "GetSoapNotes",
  transcribeAnyAudio: "TranscribeAnyAudio",
  agentsModule: "AgentsModule",
};

export const VOICE_V2_ABORT_REASONS = {
  USER_DISCARDED_VOICE_RX: "USER_DISCARDED_VOICE_RX",
};

const ABORT_REASON_TRACKING = {
  [VOICE_V2_ABORT_REASONS.USER_DISCARDED_VOICE_RX]: {
    statusFamily: "USER_CANCELLED",
    statusCategory: "USER_DISCARDED",
    abortReason: "USER_DISCARDED_VOICE_RX",
    abortInitiator: "user",
    cancelSource: "voice_rx_recorder",
    cancelAction: "cross_icon_discard_confirm",
    userCancelled: true,
  },
};

export function createVoiceV2AbortError(reason) {
  const error = new Error("VoiceRx request cancelled by user after clicking discard.");
  error.name = "AbortError";
  error.abortReason = reason;
  return error;
}

function getAbortReasonTracking(error) {
  const reason = error?.abortReason || error?.reason?.abortReason;
  return ABORT_REASON_TRACKING[reason] || null;
}

export function getHttpStatusFamily(statusCode) {
  const code = Number(statusCode);
  if (!Number.isFinite(code) || code <= 0) return "";
  return `${Math.floor(code / 100)}XX`;
}

export function decorateVoiceV2ApiError(error, { statusCode, responseBody } = {}) {
  if (!error || typeof error !== "object") return error;
  if (statusCode !== undefined && statusCode !== null && error.status === undefined) {
    error.status = statusCode;
  }
  if (statusCode !== undefined && statusCode !== null && error.statusCode === undefined) {
    error.statusCode = statusCode;
  }
  if (responseBody !== undefined && error.responseBody === undefined) {
    error.responseBody = responseBody;
  }
  const family = getHttpStatusFamily(statusCode || error.status || error.statusCode);
  if (family && error.statusFamily === undefined) {
    error.statusFamily = family;
  }
  return error;
}

export function trackVoiceV2ApiResponse({
  apiName,
  endpoint,
  method = "POST",
  statusCode,
  response,
  error,
  startedAtMs,
  extra = {},
}) {
  try {
    const eventApiName = STACKS_API_EVENT_NAMES[apiName] || apiName || "Unknown";
    const code = Number(statusCode || error?.statusCode || error?.status);
    const hasStatusCode = Number.isFinite(code) && code > 0;
    const abortTracking = getAbortReasonTracking(error);
    const statusFamily = hasStatusCode
      ? getHttpStatusFamily(code)
      : abortTracking?.statusFamily
        ? abortTracking.statusFamily
        : error?.name === "AbortError"
        ? "TIMEOUT"
        : "NO_STATUS";
    const statusCategory = abortTracking?.statusCategory || statusFamily;
    const failed = Boolean(error) || (hasStatusCode && code >= 400);
    const now = Date.now();

    trackEvent(`TP_Voice_V2_${eventApiName}_API_Response`, {
      apiName: eventApiName,
      endpoint,
      method,
      status: failed ? "failed" : "success",
      success: !failed,
      statusCode: hasStatusCode ? code : null,
      statusFamily,
      statusCategory,
      is4xx: hasStatusCode ? code >= 400 && code < 500 : false,
      is5xx: hasStatusCode ? code >= 500 && code < 600 : false,
      errorMessage: error?.message || "",
      response,
      latencyMs: startedAtMs ? now - startedAtMs : null,
      timestamp: new Date(now).toISOString(),
      ...(abortTracking || {}),
      ...extra,
    });
  } catch (trackingError) {
    console.error("[voice-rx/stacks-api-tracking] Failed", trackingError?.message || trackingError);
  }
}
