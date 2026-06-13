import { trackEvent } from "../../../../utils/utils";

export const STACKS_API_EVENT_NAMES = {
  transcribeAudio: "TranscribeAudio",
  digitiseData: "DigitiseData",
  getSoapNotes: "GetSoapNotes",
  transcribeAnyAudio: "TranscribeAnyAudio",
  agentsModule: "AgentsModule",
};

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
    const statusFamily = hasStatusCode
      ? getHttpStatusFamily(code)
      : error?.name === "AbortError"
        ? "TIMEOUT"
        : "NO_STATUS";
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
      statusCategory: statusFamily,
      is4xx: hasStatusCode ? code >= 400 && code < 500 : false,
      is5xx: hasStatusCode ? code >= 500 && code < 600 : false,
      errorMessage: error?.message || "",
      response,
      latencyMs: startedAtMs ? now - startedAtMs : null,
      timestamp: new Date(now).toISOString(),
      ...extra,
    });
  } catch (trackingError) {
    console.error("[voice-rx/stacks-api-tracking] Failed", trackingError?.message || trackingError);
  }
}
