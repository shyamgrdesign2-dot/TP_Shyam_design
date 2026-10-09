import {
  createVoiceLog,
  updateVoiceLog,
  uploadVoiceAudio,
} from "../../../api/services/ApiGenRx";
import { getClinic, trackEvent } from "../../../utils/utils";

export const VOICE_RX_2_VERSION = "2.0";
export const VOICE_RX_MODEL = "zyvelor";
/* The processing endpoints, named rather than spelled out at each call site.
   Added with the VoiceRx chat flow Dr. Copilot shares with the Rx pad. */
export const VOICE_RX_PROCESSING_API = {
  TRANSCRIBE_ANY_AUDIO: "agents/transcribe-any-audio",
  AGENTS_MODULE: "agents/module",
  TRANSCRIBE_AUDIO: "agents/transcribe-audio",
};

export function getBrowserNameForVoiceRx2() {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";
  return "Unknown";
}

function createAudioFile(audioBlob, prefix = "voice-rx-2") {
  const extension = (audioBlob?.type || "").includes("mp4") ? "mp4" : "webm";
  const fileName = `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
  return new File([audioBlob], fileName, { type: audioBlob?.type || "audio/webm" });
}

function normalizeUploadSource(uploadResponse) {
  const data = uploadResponse?.data || uploadResponse || {};
  return (
    data.prescriptionUrl ||
    data.prescription_url ||
    data.source ||
    data.filename ||
    data.fileName ||
    data.url ||
    data.path ||
    ""
  );
}

function getErrorMessage(error) {
  if (!error) return "";
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || String(error);
}

function formatVoiceRx2TranscriptForLogging(transcript) {
  if (typeof transcript === "string") return transcript;
  if (Array.isArray(transcript)) return JSON.stringify(transcript);
  return transcript ?? "";
}

export function buildVoiceRx2EventPayload({
  patientData,
  profile,
  sessionId,
  submitId = "",
  requestId = "",
  durationMs = 0,
  mode = "dictation",
  fromVoiceRecording = false,
  voicecall = 0,
  moduleName = "",
  sourceSurface = "",
  voiceInputLocation = "",
  isDoctorAgent = false,
  micBeingUsed = "",
  extra = {},
} = {}) {
  const clinic = getClinic(profile?.hospital_data);
  return {
    doctorId: profile?.doctor_unique_id || extra.doctorId || "",
    doctorName: profile?.um_name || "",
    patientId: patientData?.patient_unique_id || extra.patientId || "",
    patientName: patientData?.pm_fullname || patientData?.pm_first_name || "",
    hospitalId: clinic?.hm_id || "",
    hospitalName: clinic?.hm_name || "",
    prescriptionUrl: "",
    prescriptionUrls: [],
    network: extra.network || "stable",
    micBeingUsed,
    browser: getBrowserNameForVoiceRx2(),
    durationOfAudioInSeconds: Math.round((durationMs || 0) / 1000),
    voiceApiCalled: false,
    sessionId,
    submitId,
    requestId,
    audioSizeBytes: 0,
    audioMimeType: "",
    mode,
    fromVoiceRecording,
    upload_latency_ms: null,
    upload_failed: false,
    upload_error_message: "",
    voicecall,
    status: extra.status || "",
    voice_failed: false,
    failedPhase: "",
    error_message: "",
    retry_attempts: 0,
    moduleName,
    sourceSurface,
    voiceInputLocation,
    isDoctorAgent,
    voiceRxVersion: VOICE_RX_2_VERSION,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function trackVoiceRx2RecorderEvent(eventName, payload = {}) {
  try {
    trackEvent(eventName, buildVoiceRx2EventPayload(payload));
  } catch (error) {
    console.error("[voice-rx-2/event] Failed", error?.message || error);
  }
}

const VOICE_RX_2_SUBMIT_ONLY_EVENT_KEYS = [
  "audioMimeType",
  "audioSizeBytes",
  "durationOfAudioInSeconds",
  "error_message",
  "failedPhase",
  "prescriptionUrl",
  "prescriptionUrls",
  "requestId",
  "retry_attempts",
  "submitId",
  "upload_error_message",
  "upload_failed",
  "upload_latency_ms",
  "voiceApiCalled",
  "voice_failed",
];

function sanitizeVoiceRx2LifecycleExtra(extra = {}) {
  const lifecycleExtra = { ...(extra || {}) };
  VOICE_RX_2_SUBMIT_ONLY_EVENT_KEYS.forEach((key) => {
    delete lifecycleExtra[key];
  });
  return lifecycleExtra;
}

export function trackVoiceRx2StartEvent({
  triggerType = "manual_click",
  triggeredByDoubleShift = false,
  patientData,
  profile,
  sessionId = "",
  mode = "dictation",
  fromVoiceRecording = false,
  voicecall = 0,
  moduleName = "",
  sourceSurface = "",
  voiceInputLocation = "",
  isDoctorAgent = false,
  micBeingUsed = "",
  extra = {},
} = {}) {
  try {
    const clinic = getClinic(profile?.hospital_data);
    const startExtra = sanitizeVoiceRx2LifecycleExtra(extra);
    trackEvent("TP_VoiceRx_V2_Start", {
      doctorId: profile?.doctor_unique_id || extra.doctorId || "",
      doctorName: profile?.um_name || "",
      patientId: patientData?.patient_unique_id || extra.patientId || "",
      patientName: patientData?.pm_fullname || patientData?.pm_first_name || "",
      hospitalId: clinic?.hm_id || "",
      hospitalName: clinic?.hm_name || "",
      network: extra.network || "stable",
      micBeingUsed,
      browser: getBrowserNameForVoiceRx2(),
      url: typeof window !== "undefined" ? window.location.href : "",
      sessionId,
      mode,
      fromVoiceRecording,
      voicecall,
      status: extra.status || "started",
      moduleName,
      sourceSurface,
      voiceInputLocation,
      isDoctorAgent,
      voiceRxVersion: VOICE_RX_2_VERSION,
      timestamp: new Date().toISOString(),
      trigger_type: triggerType,
      triggered_by_double_shift: Boolean(triggeredByDoubleShift),
      startedAt: new Date().toISOString(),
      ...startExtra,
    });
  } catch (error) {
    console.error("[voice-rx-2/start-event] Failed", error?.message || error);
  }
}

export function trackVoiceRx2DiscardEvent({
  patientData,
  profile,
  sessionId = "",
  durationMs = 0,
  mode = "dictation",
  fromVoiceRecording = false,
  voicecall = 0,
  moduleName = "",
  sourceSurface = "",
  voiceInputLocation = "",
  isDoctorAgent = false,
  micBeingUsed = "",
  discardSource = "discard_modal",
  discardAction = "discard_confirm",
  extra = {},
} = {}) {
  try {
    const clinic = getClinic(profile?.hospital_data);
    const discardExtra = sanitizeVoiceRx2LifecycleExtra(extra);
    trackEvent("TP_VoiceRx_V2_Discard", {
      doctorId: profile?.doctor_unique_id || extra.doctorId || "",
      doctorName: profile?.um_name || "",
      patientId: patientData?.patient_unique_id || extra.patientId || "",
      patientName: patientData?.pm_fullname || patientData?.pm_first_name || "",
      hospitalId: clinic?.hm_id || "",
      hospitalName: clinic?.hm_name || "",
      network: extra.network || "stable",
      micBeingUsed,
      browser: getBrowserNameForVoiceRx2(),
      url: typeof window !== "undefined" ? window.location.href : "",
      sessionId,
      durationOfAudioInSeconds: Math.round((durationMs || 0) / 1000),
      mode,
      fromVoiceRecording,
      voicecall,
      status: extra.status || "discarded",
      moduleName,
      sourceSurface,
      voiceInputLocation,
      isDoctorAgent,
      voiceRxVersion: VOICE_RX_2_VERSION,
      timestamp: new Date().toISOString(),
      discard_source: discardSource,
      discard_action: discardAction,
      discardedAt: new Date().toISOString(),
      ...discardExtra,
    });
  } catch (error) {
    console.error("[voice-rx-2/discard-event] Failed", error?.message || error);
  }
}

export async function uploadAndTrackVoiceRx2LowSpeechBlock({
  audioBlob,
  patientData,
  profile,
  sessionId,
  submitId,
  requestId,
  submitClickedAt,
  submitClickedAtMs,
  durationMs = 0,
  mode = "dictation",
  fromVoiceRecording = false,
  voicecall = 0,
  moduleName = "",
  sourceSurface = "",
  voiceInputLocation = "",
  isDoctorAgent = false,
  micBeingUsed = "",
  extra = {},
  speechAnalysis = {},
}) {
  const startedAtMs = submitClickedAtMs || Date.now();
  let uploadResponse = null;
  let uploadError = null;
  let source = "";
  const uploadStartedAtMs = Date.now();

  try {
    if (!audioBlob?.size) {
      throw new Error("No audio recording found for upload.");
    }
    uploadResponse = await uploadVoiceAudio(createAudioFile(audioBlob, "voice-rx-2-low-speech"));
    source = normalizeUploadSource(uploadResponse);
  } catch (error) {
    uploadError = error;
  }

  const uploadCompletedAtMs = Date.now();
  const uploadFailed = Boolean(uploadError);
  const eventPayload = buildVoiceRx2EventPayload({
    patientData,
    profile,
    sessionId,
    submitId,
    requestId,
    durationMs,
    mode,
    fromVoiceRecording,
    voicecall,
    moduleName,
    sourceSurface,
    voiceInputLocation,
    isDoctorAgent,
    micBeingUsed,
    extra: {
      ...extra,
      prescriptionUrl: source,
      prescriptionUrls: source ? [source] : [],
      network: uploadFailed ? "unstable" : "stable",
      voiceApiCalled: false,
      audioSizeBytes: audioBlob?.size || 0,
      audioMimeType: audioBlob?.type || "audio/webm",
      upload_latency_ms: uploadCompletedAtMs - uploadStartedAtMs,
      upload_failed: uploadFailed,
      upload_error_message: getErrorMessage(uploadError),
      status: "blocked",
      voice_failed: true,
      failedPhase: "vad-precheck",
      error_message: "Speech coverage below threshold. User must re-record.",
      retry_attempts: 0,
      submitClickedAt,
      uploadCompletedAt: new Date(uploadCompletedAtMs).toISOString(),
      timeFromSubmitToUploadMs: uploadCompletedAtMs - startedAtMs,
      timeFromSubmitToLogMs: Date.now() - startedAtMs,
      ...speechAnalysis,
    },
  });

  try {
    trackEvent("TP_Voice_V2_Low_Speech_Ratio_Blocked", eventPayload);
  } catch (error) {
    console.error("[voice-rx-2/low-speech-event] Failed", error?.message || error);
  }

  return {
    source,
    uploadResponse,
    uploadError,
    eventPayload,
  };
}

export function buildVoiceHistoryEntry({
  type,
  source = "",
  durationMs = 0,
  timeRequiredInMs = 0,
  conversation,
  digitize,
  isDoctorAgent = false,
  moduleName = "",
}) {
  return {
    type,
    source,
    sourceDurationInSeconds: Math.round((durationMs || 0) / 1000),
    timeRequiredInMs,
    transcription: "",
    digitize: digitize ?? (isDoctorAgent ? [] : {}),
    conversation: conversation ?? [],
    voiceModel: VOICE_RX_MODEL,
    voiceRxVersion: VOICE_RX_2_VERSION,
    isDoctorAgent,
    moduleName,
  };
}

export async function uploadAndLogVoiceRx2({
  audioBlob,
  patientData,
  profile,
  sessionId,
  submitId,
  requestId,
  submitClickedAt,
  submitClickedAtMs,
  durationMs = 0,
  clinicalStatus = "completed",
  failedPhase = "",
  errorMessage = "",
  retryAttempts = 0,
  mode = "dictation",
  fromVoiceRecording = false,
  voicecall = 0,
  moduleName = "",
  sourceSurface = "",
  voiceInputLocation = "",
  isDoctorAgent = false,
  micBeingUsed = "",
  voiceLogCreated = false,
  markVoiceLogCreated,
  clinicalCompletedAtMs,
  transcriptCompletedAtMs,
  digitizeCompletedAtMs,
  transcript,
  digitizeData,
  previousContext = null,
  speechAnalysis = {},
}) {
  const startedAtMs = submitClickedAtMs || Date.now();
  let uploadResponse = null;
  let uploadError = null;
  let source = "";
  const uploadStartedAtMs = Date.now();

  try {
    if (!audioBlob?.size) {
      throw new Error("No audio recording found for upload.");
    }
    uploadResponse = await uploadVoiceAudio(createAudioFile(audioBlob));
    source = normalizeUploadSource(uploadResponse);
  } catch (error) {
    uploadError = error;
  }

  const uploadCompletedAtMs = Date.now();
  const uploadCompletedAt = new Date(uploadCompletedAtMs).toISOString();
  const clinicalCompletedAt = clinicalCompletedAtMs ? new Date(clinicalCompletedAtMs).toISOString() : "";
  const transcriptCompletedAt = transcriptCompletedAtMs ? new Date(transcriptCompletedAtMs).toISOString() : "";
  const digitizeCompletedAt = digitizeCompletedAtMs ? new Date(digitizeCompletedAtMs).toISOString() : "";
  const logStatus = clinicalStatus === "completed" ? "completed" : "failed";
  const uploadFailed = Boolean(uploadError);
  const finalErrorMessage = errorMessage || getErrorMessage(uploadError);

  const eventPayload = buildVoiceRx2EventPayload({
    patientData,
    profile,
    sessionId,
    submitId,
    requestId,
    durationMs,
    mode,
    fromVoiceRecording,
    voicecall,
    moduleName,
    sourceSurface,
    voiceInputLocation,
    isDoctorAgent,
    micBeingUsed,
    extra: {
      prescriptionUrl: source,
      prescriptionUrls: source ? [source] : [],
      network: uploadFailed ? "unstable" : "stable",
      voiceApiCalled: true,
      audioSizeBytes: audioBlob?.size || 0,
      audioMimeType: audioBlob?.type || "audio/webm",
      upload_latency_ms: uploadCompletedAtMs - uploadStartedAtMs,
      upload_failed: uploadFailed,
      upload_error_message: getErrorMessage(uploadError),
      status: logStatus,
      voice_failed: logStatus === "failed",
      failedPhase,
      error_message: finalErrorMessage,
      retry_attempts: retryAttempts,
      submitClickedAt,
      uploadCompletedAt,
      clinicalCompletedAt,
      transcriptCompletedAt,
      digitizeCompletedAt,
      timeFromSubmitToUploadMs: uploadCompletedAtMs - startedAtMs,
      timeFromSubmitToClinicalCompleteMs: clinicalCompletedAtMs ? clinicalCompletedAtMs - startedAtMs : null,
      timeFromSubmitToLogMs: Date.now() - startedAtMs,
      transcript: formatVoiceRx2TranscriptForLogging(transcript),
      digitizeData: digitizeData != null ? JSON.stringify(digitizeData) : null,
      previousContext: previousContext != null ? JSON.stringify(previousContext) : null,
      ...speechAnalysis,
    },
  });
  trackEvent("TP_Voice_V2_Submit_Click", eventPayload);

  const correlationId = sessionId || submitId || requestId || "";
  const logPayload = {
    correlationId,
    needConversation: mode === "ambient" || mode === "ambient_consultation",
    ...eventPayload,
  };

  try {
    if (!voiceLogCreated) {
      await createVoiceLog(logPayload, eventPayload.patientId, { correlationId });
      markVoiceLogCreated?.();
    } else {
      await updateVoiceLog(logPayload, eventPayload.patientId, { correlationId });
    }
  } catch (error) {
    console.error("[voice-rx-2/logs] Failed", error?.message || error);
  }

  return {
    source,
    uploadResponse,
    uploadError,
    eventPayload,
  };
}
