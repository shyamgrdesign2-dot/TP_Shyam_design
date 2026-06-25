import { appendVoiceApiMetadata, buildClinicalApiHeaders, joinAgentModuleApiUrl } from "./clinical-api";
import { decorateVoiceV2ApiError, trackVoiceV2ApiResponse } from "./stacks-api-tracking";

const TRANSCRIBE_ANY_AUDIO_ENDPOINT = "/agents/transcribe-any-audio";
const TRANSCRIBE_ANY_AUDIO_TIMEOUT_MS = 10 * 60 * 1000;

export const PRIVATE_NOTES_TRANSCRIPTION_PROMPT =
  "Transcribe the audio exactly as spoken, preserving the original language. Do not summarize. Remove any silent filler words (e.g., 'um', 'uh'); do not include them in the transcription."

function getTimerApi() {
  return typeof window !== "undefined" ? window : null;
}

function getResponseRequestId(response) {
  return response?.headers?.get?.("x-request-id") || "";
}

function transcriptToText(transcript) {
  if (Array.isArray(transcript)) {
    return transcript
      .map((turn) => {
        if (typeof turn === "string") return turn.trim();
        const speaker = turn?.speaker ? `${turn.speaker}: ` : "";
        return `${speaker}${turn?.text ?? turn?.message ?? turn?.content ?? ""}`.trim();
      })
      .filter(Boolean)
      .join("\n");
  }

  if (transcript && typeof transcript === "object") {
    return transcriptToText(transcript.transcript || transcript.text || transcript.message || transcript.content || "");
  }

  return typeof transcript === "string" ? transcript : "";
}

export function extractAnyAudioTranscriptRaw(responseJson) {
  return responseJson?.data?.transcript ??
    responseJson?.data?.transcription ??
    responseJson?.data?.text ??
    responseJson?.data?.result ??
    responseJson?.payload?.transcript ??
    responseJson?.payload?.transcription ??
    responseJson?.payload?.text ??
    responseJson?.transcript ??
    responseJson?.transcription ??
    responseJson?.text ??
    responseJson?.result ??
    responseJson;
}

export function extractAnyAudioTranscript(responseJson) {
  return transcriptToText(extractAnyAudioTranscriptRaw(responseJson));
}

export async function transcribeAnyAudio({
  audioBlob,
  context,
  prompt = PRIVATE_NOTES_TRANSCRIPTION_PROMPT,
  timeoutMs = TRANSCRIBE_ANY_AUDIO_TIMEOUT_MS,
  signal,
} = {}) {
  if (!audioBlob?.size) {
    throw new Error("No audio recording found for transcription.");
  }

  const formData = new FormData();
  formData.append("patient_id", String(context.patientId));
  formData.append("doctor_id", String(context.doctorId));
  formData.append("session_id", String(context.sessionId));
  formData.append("prompt", prompt);
  appendVoiceApiMetadata(formData, context);
  formData.append("audio", audioBlob, "audio.webm");

  const abortController = new AbortController();
  const timerApi = getTimerApi();
  const timeoutId = timerApi?.setTimeout(() => abortController.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => abortController.abort(), { once: true });
  }

  let response;
  const startedAtMs = Date.now();
  try {
    response = await fetch(joinAgentModuleApiUrl(TRANSCRIBE_ANY_AUDIO_ENDPOINT), {
      method: "POST",
      headers: buildClinicalApiHeaders({ includeContentType: false }),
      body: formData,
      signal: abortController.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Audio transcription timed out after 120 seconds.");
      decorateVoiceV2ApiError(timeoutError, { statusCode: 408 });
      trackVoiceV2ApiResponse({
        apiName: "transcribeAnyAudio",
        endpoint: TRANSCRIBE_ANY_AUDIO_ENDPOINT,
        statusCode: 408,
        response: null,
        error: timeoutError,
        startedAtMs,
      });
      throw timeoutError;
    }
    trackVoiceV2ApiResponse({
      apiName: "transcribeAnyAudio",
      endpoint: TRANSCRIBE_ANY_AUDIO_ENDPOINT,
      response: null,
      error,
      startedAtMs,
    });
    throw error;
  } finally {
    timerApi?.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const requestId = getResponseRequestId(response);
    const error = new Error(`Audio transcription failed with ${response.status}. ${detail}`.trim());
    decorateVoiceV2ApiError(error, { statusCode: response.status, responseBody: detail });
    error.requestId = requestId;
    trackVoiceV2ApiResponse({
      apiName: "transcribeAnyAudio",
      endpoint: TRANSCRIBE_ANY_AUDIO_ENDPOINT,
      statusCode: response.status,
      response: detail,
      error,
      startedAtMs,
    });
    throw error;
  }

  const responseJson = await response.json();
  const requestId = getResponseRequestId(response);
  trackVoiceV2ApiResponse({
    apiName: "transcribeAnyAudio",
    endpoint: TRANSCRIBE_ANY_AUDIO_ENDPOINT,
    statusCode: response.status,
    response: responseJson,
    startedAtMs,
  });
  const rawTranscript = extractAnyAudioTranscriptRaw(responseJson);
  const transcript = transcriptToText(rawTranscript);
  if (!transcript.trim()) {
    const error = new Error("Audio transcription API returned an empty transcript.");
    error.requestId = requestId;
    throw error;
  }

  return { transcript, rawTranscript, rawResponse: responseJson, requestId };
}
