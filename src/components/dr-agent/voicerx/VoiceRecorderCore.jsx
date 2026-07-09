/**
 * VoiceRecorderCore — shared mic-input component used by:
 *   layout="fullscreen"  → VoiceRxActiveAgent (full back-face panel)
 *   layout="overlay"     → VoiceRxCanvas quick-edit, SideNavbar voice input
 *
 * Shared logic: useMicStream, useBlobRecorder, useActiveMic, recording timer,
 *   live transcript (overlay only), canSubmit, submit handler, mute/device picker,
 *   critical-block detection, status label, sound effects.
 *
 * Each layout keeps its own SCSS module. Parent controls outer positioning;
 * this component fills its container.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { useMicVAD } from "@ricky0123/vad-react";
import { playSubmitSound, playVoiceRxStartSound, playVoiceRxErrorSound } from "./audio";
import { AlertCircle, Check, ChevronDown, Mic, MicOff, WifiOff } from "../atoms/icons/lucide";
import {
  CaptionCarousel,
  VoiceTranscriptProcessingCard,
  hasTranscriptContent,
  hasDiarizedTranscript,
  ConversationTranscript,
  DictationTranscript,
  transcriptToText,
} from "./VoiceTranscriptProcessingCard";
import { ShineBorder } from "./ShineBorder";
import { toast } from "./toast";
import { useRxPadSync } from "../rxpad/dr-agent/RxPadSyncContext";
import { VoiceRxSiriWaveform } from "./VoiceRxSiriWaveform";
import { useNetConnection } from "./use-net-connection";
import { useLiveTranscript } from "./use-live-transcript";
import { ConfirmDialog as TPConfirmDialog } from "../molecules/ConfirmDialog";
import { Popover, PopoverContent, PopoverTrigger } from "../atoms/Popover";
import {
  VOICE_CHUNK_UPLOAD_INTERVAL_MS,
  isAudioChunkContextReady,
  uploadAudioChunk,
} from "./api/audio-chunk-upload";
import { trackVoiceRx2DiscardEvent, trackVoiceRx2RecorderEvent, uploadAndTrackVoiceRx2LowSpeechBlock } from "./voiceRx2Logging";
import fsStyles from "./VoiceRxActiveAgent.module.scss";
import osStyles from "./VoiceRxModuleRecorder.module.scss";
import canvasStyles from "./VoiceRxCanvas.module.scss";

// ── Helpers ──────────────────────────────────────────────────────────────────

const VOICE_RX_MIC_STORAGE_KEY = "voiceRxPreferredMicrophoneDeviceId";
const DEFAULT_MIC_DEVICE_ID = "default";

let sessionPreferredMicDeviceId = undefined;
let sessionPreferredMicLoaded = false;

function getSessionPreferredMicDeviceId() {
  if (sessionPreferredMicLoaded) return sessionPreferredMicDeviceId;
  sessionPreferredMicLoaded = true;
  if (typeof window === "undefined") return undefined;
  try {
    sessionPreferredMicDeviceId = window.sessionStorage?.getItem(VOICE_RX_MIC_STORAGE_KEY) || undefined;
  } catch {
    sessionPreferredMicDeviceId = undefined;
  }
  return sessionPreferredMicDeviceId;
}

function getInitialMicDeviceId() {
  return getSessionPreferredMicDeviceId() || DEFAULT_MIC_DEVICE_ID;
}

function setSessionPreferredMicDeviceId(deviceId) {
  sessionPreferredMicLoaded = true;
  sessionPreferredMicDeviceId = deviceId || undefined;
  if (typeof window === "undefined") return;
  try {
    if (deviceId) {
      window.sessionStorage?.setItem(VOICE_RX_MIC_STORAGE_KEY, deviceId);
    } else {
      window.sessionStorage?.removeItem(VOICE_RX_MIC_STORAGE_KEY);
    }
  } catch {
    // Session memory still covers the current React runtime if storage is blocked.
  }
}

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const MIC_PERMISSION_STATE = {
  UNKNOWN: "unknown",
  PROMPT: "prompt",
  GRANTED: "granted",
  DENIED: "denied",
};
const MIC_PERMISSION_REVOKED_MESSAGE = "Microphone permission was revoked. Allow microphone access again to continue recording.";
const TP_CONFIG_DATA_FEATURE_KEY = "tp-config-data";
const DEFAULT_SILENCE_DETECTOR_THRESHOLD_MS = 60000;
const VAD_ASSET_BASE_PATH = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";
const VAD_ONNX_WASM_BASE_PATH = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/";
const VAD_MODEL = "v5";
const VAD_POSITIVE_SPEECH_THRESHOLD = 0.3;
const VAD_NEGATIVE_SPEECH_THRESHOLD = 0.2;
const VAD_MIN_SPEECH_MS = 400;
const VAD_WAVEFORM_SPEECH_THRESHOLD = 0.3;
const VAD_WAVEFORM_ON_MS = 160;
const VAD_WAVEFORM_OFF_MS = 450;
const VAD_MIN_SPEECH_COVERAGE_RATIO = 0.25;
const VAD_MIN_FINAL_ANALYSIS_MS = 1000;
const VAD_MAX_FRAME_DELTA_MS = 500;
const VAD_DEBUG_STORAGE_KEY = "voiceRxVadDebug";
const CAPTION_AUDIO_ACTIVITY_THRESHOLD = 0.012;
const CAPTION_AUDIO_ACTIVITY_ON_MS = 120;
const CAPTION_AUDIO_ACTIVITY_OFF_MS = 650;
const SILENCE_REMINDER_TONE_COUNT = 1;
const SILENCE_REMINDER_TONE_GAP_MS = 420;

function isMicPermissionDeniedError(error) {
  return error?.name === "NotAllowedError" || error?.name === "SecurityError";
}

function isMicNotFoundError(error) {
  return error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError";
}

function getMicErrorMessage(error) {
  if (isMicPermissionDeniedError(error)) {
    return "Microphone access is blocked. Enable it from your browser site settings.";
  }
  if (isMicNotFoundError(error)) {
    return "No microphone was found on this device.";
  }
  return error instanceof Error ? error.message : "Microphone access denied";
}

function getSilenceDetectorThresholdMs(config) {
  const value = Number(config?.silenceDetectorThresholdInMs);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SILENCE_DETECTOR_THRESHOLD_MS;
}

function getVadMinSpeechCoverageRatio(config) {
  const value = Number(config?.vadMinSpeechCoverageRatio);
  if (!Number.isFinite(value) || value <= 0) return VAD_MIN_SPEECH_COVERAGE_RATIO;
  if (value > 1 && value <= 100) return value / 100;
  if (value <= 1) return value;
  return VAD_MIN_SPEECH_COVERAGE_RATIO;
}

function isVadEnabled(config) {
  return config?.enableVAD === true;
}

function playSilenceReminderSound() {
  for (let index = 0; index < SILENCE_REMINDER_TONE_COUNT; index += 1) {
    window.setTimeout(() => {
      playVoiceRxErrorSound();
    }, index * SILENCE_REMINDER_TONE_GAP_MS);
  }
}

function createEmptyVadSpeechAnalysis() {
  return {
    analyzedDurationMs: 0,
    speechDurationMs: 0,
    totalFrames: 0,
    speechFrames: 0,
    probabilitySum: 0,
    maxSpeechProbability: 0,
    firstFrameAtMs: 0,
    lastFrameAtMs: 0,
    firstSpeechAtMs: 0,
    lastSpeechAtMs: 0,
  };
}

function buildVadSpeechAnalysisSnapshot(stats, durationMs, minSpeechCoverageRatio = VAD_MIN_SPEECH_COVERAGE_RATIO) {
  const analyzedDurationMs = Math.max(0, Math.round(stats?.analyzedDurationMs || 0));
  const speechDurationMs = Math.max(0, Math.round(stats?.speechDurationMs || 0));
  const totalFrames = Math.max(0, stats?.totalFrames || 0);
  const speechFrames = Math.max(0, stats?.speechFrames || 0);
  const speechCoverageRatio = analyzedDurationMs > 0 ? speechDurationMs / analyzedDurationMs : 0;
  const speechFrameRatio = totalFrames > 0 ? speechFrames / totalFrames : 0;
  const averageSpeechProbability = totalFrames > 0 ? (stats?.probabilitySum || 0) / totalFrames : 0;

  return {
    vadEnabled: true,
    detector: "ricky0123_vad",
    minSpeechCoverageRatio,
    minSpeechCoveragePercent: Math.round(minSpeechCoverageRatio * 100),
    speechCoverageRatio,
    speechCoveragePercent: Math.round(speechCoverageRatio * 100),
    speechFrameRatio,
    speechFramePercent: Math.round(speechFrameRatio * 100),
    analyzedDurationMs,
    speechDurationMs,
    nonSpeechDurationMs: Math.max(0, analyzedDurationMs - speechDurationMs),
    audioDurationMs: Math.round(durationMs || 0),
    totalVadFrames: totalFrames,
    speechVadFrames: speechFrames,
    averageSpeechProbability: Number(averageSpeechProbability.toFixed(4)),
    maxSpeechProbability: Number(Math.max(0, stats?.maxSpeechProbability || 0).toFixed(4)),
    canEvaluateSpeechCoverage: analyzedDurationMs >= VAD_MIN_FINAL_ANALYSIS_MS && totalFrames > 0,
  };
}

function buildDisabledVadSpeechAnalysisSnapshot(durationMs) {
  return {
    vadEnabled: false,
    detector: "disabled",
    audioDurationMs: Math.round(durationMs || 0),
    canEvaluateSpeechCoverage: false,
  };
}

// ── Shared hooks ─────────────────────────────────────────────────────────────

function useRecordingTimer(active) {
  const [ms, setMs] = useState(0);
  const msRef = useRef(0);
  useEffect(() => { msRef.current = ms; }, [ms]);
  useEffect(() => {
    if (!active) return;
    const start = performance.now() - msRef.current;
    const iv = window.setInterval(() => setMs(performance.now() - start), 250);
    return () => window.clearInterval(iv);
  }, [active]);
  return ms;
}

function useSelectedStreamAudioActivity(stream, active) {
  const [audioActive, setAudioActive] = useState(false);
  const audioActiveRef = useRef(false);
  const activeStartedAtRef = useRef(0);
  const inactiveStartedAtRef = useRef(0);

  useEffect(() => {
    if (!active || !stream) {
      audioActiveRef.current = false;
      activeStartedAtRef.current = 0;
      inactiveStartedAtRef.current = 0;
      setAudioActive(false);
      return undefined;
    }

    if (typeof window === "undefined") return undefined;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return undefined;

    let rafId = 0;
    let source = null;
    let audioContext = null;
    let analyser = null;
    let samples = null;

    const setAudioActiveState = (nextActive) => {
      if (audioActiveRef.current === nextActive) return;
      audioActiveRef.current = nextActive;
      setAudioActive(nextActive);
    };

    try {
      audioContext = new AudioContextCtor();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.55;
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      samples = new Uint8Array(analyser.fftSize);
      if (audioContext.state === "suspended") {
        void audioContext.resume().catch(() => {});
      }
    } catch {
      return undefined;
    }

    const tick = () => {
      if (!analyser || !samples) return;
      analyser.getByteTimeDomainData(samples);
      let sumSquares = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const centered = (samples[index] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / samples.length);
      const now = performance.now();

      if (rms >= CAPTION_AUDIO_ACTIVITY_THRESHOLD) {
        inactiveStartedAtRef.current = 0;
        if (!activeStartedAtRef.current) activeStartedAtRef.current = now;
        if (!audioActiveRef.current && now - activeStartedAtRef.current >= CAPTION_AUDIO_ACTIVITY_ON_MS) {
          setAudioActiveState(true);
        }
      } else {
        activeStartedAtRef.current = 0;
        if (!inactiveStartedAtRef.current) inactiveStartedAtRef.current = now;
        if (audioActiveRef.current && now - inactiveStartedAtRef.current >= CAPTION_AUDIO_ACTIVITY_OFF_MS) {
          setAudioActiveState(false);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      source?.disconnect();
      void audioContext?.close().catch(() => {});
      audioActiveRef.current = false;
      activeStartedAtRef.current = 0;
      inactiveStartedAtRef.current = 0;
      setAudioActive(false);
    };
  }, [active, stream]);

  return audioActive;
}

function useHumanVoiceSilenceDetector(stream, active, onNoHumanVoice, {
  timeoutMs = DEFAULT_SILENCE_DETECTOR_THRESHOLD_MS,
  onVadFrameProcessed,
} = {}) {
  const [humanVoiceActive, setHumanVoiceActive] = useState(false);
  const humanVoiceActiveRef = useRef(false);
  const streamRef = useRef(stream);
  const activeRef = useRef(active);
  const onNoHumanVoiceRef = useRef(onNoHumanVoice);
  const onVadFrameProcessedRef = useRef(onVadFrameProcessed);
  const lastHumanVoiceAtRef = useRef(0);
  const speechCandidateStartedAtRef = useRef(0);
  const lastSpeechFrameAtRef = useRef(0);
  const lastVadDebugAtRef = useRef(0);

  useEffect(() => { streamRef.current = stream; }, [stream]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { onNoHumanVoiceRef.current = onNoHumanVoice; }, [onNoHumanVoice]);
  useEffect(() => { onVadFrameProcessedRef.current = onVadFrameProcessed; }, [onVadFrameProcessed]);

  const markHumanVoice = useCallback(() => {
    lastHumanVoiceAtRef.current = performance.now();
  }, []);

  const setHumanVoiceActiveState = useCallback((nextActive) => {
    humanVoiceActiveRef.current = nextActive;
    setHumanVoiceActive(nextActive);
  }, []);

  const debugVad = useCallback((message, payload = {}) => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage?.getItem(VAD_DEBUG_STORAGE_KEY) !== "1") return;
    } catch {
      return;
    }
    console.debug(`[VoiceRx VAD] ${message}`, payload);
  }, []);

  const markHumanVoiceActive = useCallback((reason = "speech") => {
    markHumanVoice();
    setHumanVoiceActiveState(true);
    debugVad("human-voice-active", { reason });
  }, [debugVad, markHumanVoice, setHumanVoiceActiveState]);

  const handleVadFrameProcessed = useCallback((probs) => {
    if (typeof performance === "undefined") return;
    const now = performance.now();
    const speechProbability = Number(probs?.isSpeech || 0);
    const vadSpeechFrame = speechProbability >= VAD_WAVEFORM_SPEECH_THRESHOLD;
    onVadFrameProcessedRef.current?.({
      nowMs: now,
      speechProbability,
      vadSpeechFrame,
    });

    if (vadSpeechFrame) {
      if (!speechCandidateStartedAtRef.current) speechCandidateStartedAtRef.current = now;
      lastSpeechFrameAtRef.current = now;
      markHumanVoice();
      if (!humanVoiceActiveRef.current && now - speechCandidateStartedAtRef.current >= VAD_WAVEFORM_ON_MS) {
        markHumanVoiceActive("sustained-vad-frames");
      }
    } else {
      speechCandidateStartedAtRef.current = 0;
      if (humanVoiceActiveRef.current && now - lastSpeechFrameAtRef.current >= VAD_WAVEFORM_OFF_MS) {
        setHumanVoiceActiveState(false);
        debugVad("human-voice-inactive", { reason: "vad-probability-low" });
      }
    }

    if (now - lastVadDebugAtRef.current < 1000) return;
    lastVadDebugAtRef.current = now;
    debugVad("frame", {
      isSpeech: speechProbability.toFixed(3),
      vadSpeechFrame,
      humanVoiceActive: humanVoiceActiveRef.current,
    });
  }, [debugVad, markHumanVoice, markHumanVoiceActive, setHumanVoiceActiveState]);

  const getVadStream = useCallback(async () => {
    if (!streamRef.current) throw new Error("No active VoiceRx stream for VAD.");
    return streamRef.current;
  }, []);

  const keepRecorderStreamAlive = useCallback(async () => {}, []);

  const {
    listening,
    errored,
    loading,
    userSpeaking,
    pause,
    start,
  } = useMicVAD({
    model: VAD_MODEL,
    startOnLoad: true,
    getStream: getVadStream,
    pauseStream: keepRecorderStreamAlive,
    resumeStream: getVadStream,
    positiveSpeechThreshold: VAD_POSITIVE_SPEECH_THRESHOLD,
    negativeSpeechThreshold: VAD_NEGATIVE_SPEECH_THRESHOLD,
    minSpeechMs: VAD_MIN_SPEECH_MS,
    userSpeakingThreshold: VAD_POSITIVE_SPEECH_THRESHOLD,
    onFrameProcessed: handleVadFrameProcessed,
    onSpeechStart: () => {
      debugVad("speech-start-candidate");
    },
    onSpeechRealStart: () => {
      debugVad("speech-real-start");
      markHumanVoiceActive("speech-real-start");
    },
    onSpeechEnd: () => {
      debugVad("speech-end");
      markHumanVoice();
      speechCandidateStartedAtRef.current = 0;
      setHumanVoiceActiveState(false);
    },
    onVADMisfire: () => {
      debugVad("misfire");
      speechCandidateStartedAtRef.current = 0;
      setHumanVoiceActiveState(false);
    },
    baseAssetPath: VAD_ASSET_BASE_PATH,
    onnxWASMBasePath: VAD_ONNX_WASM_BASE_PATH,
  });

  useEffect(() => {
    debugVad("user-speaking-state", { userSpeaking });
  }, [debugVad, userSpeaking]);

  useEffect(() => {
    debugVad("runtime-state", { listening, loading, errored });
  }, [debugVad, errored, listening, loading]);

  useEffect(() => {
    if (!active || !stream || loading || errored) {
      speechCandidateStartedAtRef.current = 0;
      lastSpeechFrameAtRef.current = 0;
      setHumanVoiceActiveState(false);
      void pause().catch(() => {});
      return undefined;
    }
    markHumanVoice();
    void start().catch(() => {});
    return () => {
      speechCandidateStartedAtRef.current = 0;
      lastSpeechFrameAtRef.current = 0;
      setHumanVoiceActiveState(false);
      void pause().catch(() => {});
    };
  }, [active, errored, loading, markHumanVoice, pause, setHumanVoiceActiveState, start, stream]);

  useEffect(() => {
    if (!active || !stream || loading || errored || typeof window === "undefined") return undefined;
    const checkIntervalMs = Math.min(1000, Math.max(250, timeoutMs / 4));
    const intervalId = window.setInterval(() => {
      if (!activeRef.current) return;
      const lastHumanVoiceAt = lastHumanVoiceAtRef.current || performance.now();
      if (performance.now() - lastHumanVoiceAt < timeoutMs) return;
      lastHumanVoiceAtRef.current = performance.now();
      onNoHumanVoiceRef.current?.({
        vadListening: listening,
        vadUserSpeaking: userSpeaking,
        vadErrored: errored || "",
        vadLoading: loading,
      });
    }, checkIntervalMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [active, errored, listening, loading, stream, timeoutMs, userSpeaking]);

  return {
    humanVoiceActive: Boolean(active && humanVoiceActive),
    vadListening: listening,
    vadUserSpeaking: userSpeaking,
    vadErrored: errored,
    vadLoading: loading,
  };
}

function HumanVoiceSilenceDetector({
  stream,
  active,
  onNoHumanVoice,
  timeoutMs,
  onHumanVoiceActiveChange,
  onVadFrameProcessed,
}) {
  const { humanVoiceActive } = useHumanVoiceSilenceDetector(
    stream,
    active,
    onNoHumanVoice,
    { timeoutMs, onVadFrameProcessed }
  );

  useEffect(() => {
    onHumanVoiceActiveChange(humanVoiceActive);
    return () => onHumanVoiceActiveChange(false);
  }, [humanVoiceActive, onHumanVoiceActiveChange]);

  return null;
}

function RawAudioSilenceDetector({
  active,
  audioActive,
  onSilence,
  timeoutMs = DEFAULT_SILENCE_DETECTOR_THRESHOLD_MS,
}) {
  const activeRef = useRef(active);
  const audioActiveRef = useRef(audioActive);
  const onSilenceRef = useRef(onSilence);
  const lastAudioAtRef = useRef(0);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { audioActiveRef.current = audioActive; }, [audioActive]);
  useEffect(() => { onSilenceRef.current = onSilence; }, [onSilence]);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      lastAudioAtRef.current = 0;
      return undefined;
    }

    lastAudioAtRef.current = performance.now();
    const checkIntervalMs = Math.min(1000, Math.max(250, timeoutMs / 4));
    const intervalId = window.setInterval(() => {
      if (!activeRef.current) return;
      const now = performance.now();
      if (audioActiveRef.current) {
        lastAudioAtRef.current = now;
        return;
      }
      const lastAudioAt = lastAudioAtRef.current || now;
      if (now - lastAudioAt < timeoutMs) return;
      lastAudioAtRef.current = now;
      onSilenceRef.current?.({
        detector: "audio_rms",
        vadEnabled: false,
        audioActive: false,
      });
    }, checkIntervalMs);

    return () => {
      window.clearInterval(intervalId);
      lastAudioAtRef.current = 0;
    };
  }, [active, timeoutMs]);

  useEffect(() => {
    if (active && audioActive && typeof performance !== "undefined") {
      lastAudioAtRef.current = performance.now();
    }
  }, [active, audioActive]);

  return null;
}

function useMicStream(deviceId, enabled) {
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState(MIC_PERMISSION_STATE.UNKNOWN);
  const [retryKey, setRetryKey] = useState(0);
  const streamRef = useRef(null);
  const permissionWasGrantedRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const permissionRecoveryPendingRef = useRef(false);
  const retry = useCallback(() => { setError(null); setRetryKey((k) => k + 1); }, []);

  const stopActiveStream = useCallback(({ intentional = false } = {}) => {
    intentionalStopRef.current = intentional;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    window.setTimeout(() => {
      if (intentionalStopRef.current === intentional) intentionalStopRef.current = false;
    }, 0);
  }, []);

  const markPermissionRevoked = useCallback(() => {
    permissionWasGrantedRef.current = false;
    permissionRecoveryPendingRef.current = true;
    stopActiveStream();
    setError(MIC_PERMISSION_REVOKED_MESSAGE);
  }, [stopActiveStream]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return undefined;
    let cancelled = false;
    let permissionStatus = null;
    let hasInitialPermissionState = false;
    const handlePermissionChange = () => {
      if (!cancelled && permissionStatus?.state) {
        const isInitialPermissionState = !hasInitialPermissionState;
        hasInitialPermissionState = true;
        setPermissionState(permissionStatus.state);
        if (permissionStatus.state === MIC_PERMISSION_STATE.GRANTED) {
          permissionWasGrantedRef.current = true;
          if (!permissionRecoveryPendingRef.current) setError(null);
          if (!isInitialPermissionState && enabled) setRetryKey((k) => k + 1);
          return;
        }
        if (permissionWasGrantedRef.current) {
          markPermissionRevoked();
          return;
        }
        if (permissionStatus.state !== MIC_PERMISSION_STATE.DENIED) setError(null);
      }
    };
    navigator.permissions.query({ name: "microphone" })
      .then((status) => {
        if (cancelled) return;
        permissionStatus = status;
        handlePermissionChange();
        if (permissionStatus.addEventListener) {
          permissionStatus.addEventListener("change", handlePermissionChange);
        } else {
          permissionStatus.onchange = handlePermissionChange;
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      permissionStatus?.removeEventListener?.("change", handlePermissionChange);
      if (permissionStatus?.onchange === handlePermissionChange) permissionStatus.onchange = null;
    };
  }, [enabled, markPermissionRevoked]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not supported in this browser");
      return;
    }
    let cancelled = false;
    let acquired = null;
    (async () => {
      try {
        let s;
        // "default" is a Chromium-only pseudo device id; Firefox/Safari reject it as an
        // exact constraint, and pinning it stops Chrome from following the system default.
        const useSystemDefault = !deviceId || deviceId === DEFAULT_MIC_DEVICE_ID;
        try {
          s = await navigator.mediaDevices.getUserMedia({
            audio: useSystemDefault ? true : { deviceId: { exact: deviceId } },
          });
        } catch (error) {
          if (useSystemDefault) throw error;
          s = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        acquired = s;
        streamRef.current = s;
        permissionWasGrantedRef.current = true;
        permissionRecoveryPendingRef.current = false;
        setStream(s);
        setError(null);
        setPermissionState(MIC_PERMISSION_STATE.GRANTED);
        s.getAudioTracks().forEach((track) => {
          track.onended = () => {
            if (!intentionalStopRef.current) markPermissionRevoked();
          };
          track.onmute = () => {
            if (!intentionalStopRef.current && track.readyState === "ended") markPermissionRevoked();
          };
        });
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) setDevices(all.filter((d) => d.kind === "audioinput"));
        } catch { /* ignore */ }
      } catch (e) {
        if (!cancelled) {
          setError(getMicErrorMessage(e));
          if (isMicPermissionDeniedError(e)) {
            permissionRecoveryPendingRef.current = true;
            setPermissionState(MIC_PERMISSION_STATE.DENIED);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
      intentionalStopRef.current = true;
      acquired?.getTracks().forEach((t) => t.stop());
      if (streamRef.current === acquired) streamRef.current = null;
      setStream(null);
      window.setTimeout(() => {
        intentionalStopRef.current = false;
      }, 0);
    };
  }, [deviceId, enabled, retryKey, markPermissionRevoked]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    const onChange = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === "audioinput"));
      } catch { /* ignore */ }
      if ((!deviceId || deviceId === DEFAULT_MIC_DEVICE_ID) && enabled) setRetryKey((k) => k + 1);
    };
    navigator.mediaDevices.addEventListener?.("devicechange", onChange);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", onChange);
  }, [deviceId, enabled]);

  return { stream, devices, error, permissionState, retry };
}

function useBlobRecorder(stream, paused, enabled, resetKey = 0) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recorderOrderRef = useRef(0);
  const finalizedRef = useRef(false);
  const mimeRef = useRef("audio/webm");

  useEffect(() => {
    if (!stream || !enabled) return;
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") return;
    const supports = (t) => {
      try { return window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(t); }
      catch { return false; }
    };
    const mime = supports("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
      : supports("audio/webm") ? "audio/webm"
      : supports("audio/mp4") ? "audio/mp4" : "";
    let rec;
    try {
      rec = mime ? new window.MediaRecorder(stream, { mimeType: mime }) : new window.MediaRecorder(stream);
    } catch (e) {
      console.error("MediaRecorder init failed", e);
      return;
    }
    if (finalizedRef.current) {
      chunksRef.current = [];
      finalizedRef.current = false;
    }
    const recorderOrder = recorderOrderRef.current;
    recorderOrderRef.current += 1;
    let chunkOrder = 0;
    mimeRef.current = rec.mimeType || mime || "audio/webm";
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunksRef.current.push({
          data: ev.data,
          recorderOrder,
          chunkOrder,
        });
        chunkOrder += 1;
      }
    };
    try { rec.start(1000); } catch (e) { console.error("MediaRecorder start failed", e); return; }
    recorderRef.current = rec;
    return () => {
      try { if (rec.state === "recording") rec.requestData(); } catch { /* ignore */ }
      try { if (rec.state !== "inactive") rec.stop(); } catch { /* ignore */ }
      recorderRef.current = null;
    };
  }, [enabled, resetKey, stream]);

  useEffect(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    try {
      if (paused && rec.state === "recording") rec.pause();
      else if (!paused && rec.state === "paused") rec.resume();
    } catch { /* ignore */ }
  }, [paused]);

  const getBlob = useCallback(() => new Promise((resolve) => {
    const rec = recorderRef.current;
    const buildBlob = () => {
      if (!chunksRef.current.length) return null;
      const orderedChunks = [...chunksRef.current]
        .sort((a, b) => (a.recorderOrder - b.recorderOrder) || (a.chunkOrder - b.chunkOrder))
        .map((chunk) => chunk.data);
      return new Blob(orderedChunks, { type: mimeRef.current || "audio/webm" });
    };
    const finalize = () => {
      const blob = buildBlob();
      finalizedRef.current = true;
      resolve(blob);
    };
    if (!rec || rec.state === "inactive") { finalize(); return; }
    rec.addEventListener("stop", finalize, { once: true });
    try { if (rec.state === "recording") rec.requestData(); } catch { /* ignore */ }
    try { rec.stop(); } catch { finalize(); }
  }), []);

  return { getBlob };
}

function createAudioRecorder(stream) {
  if (!stream || typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return null;
  }
  const supports = (type) => {
    try { return window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(type); }
    catch { return false; }
  };
  const mime = supports("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
    : supports("audio/webm") ? "audio/webm"
    : supports("audio/mp4") ? "audio/mp4" : "";
  try {
    return mime ? new window.MediaRecorder(stream, { mimeType: mime }) : new window.MediaRecorder(stream);
  } catch (error) {
    console.error("Audio chunk recorder init failed", error);
    return null;
  }
}

function useAudioChunkRecorder(stream, paused, enabled, audioChunkContext, resetKey = 0) {
  const recorderRef = useRef(null);
  const segmentChunksRef = useRef([]);
  const segmentStartedAtRef = useRef(0);
  const chunkIndexRef = useRef(0);
  const uploadQueueRef = useRef(Promise.resolve());
  const intervalTimerRef = useRef(null);
  const pausedRef = useRef(paused);
  const enabledRef = useRef(enabled);
  const streamRef = useRef(stream);
  const contextRef = useRef(audioChunkContext);
  const stoppingSegmentRef = useRef(false);
  const pendingStartAfterStopRef = useRef(false);
  const localErrorNotifiedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { contextRef.current = audioChunkContext; }, [audioChunkContext]);

  const clearIntervalTimer = useCallback(() => {
    if (intervalTimerRef.current) {
      window.clearTimeout(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
  }, []);

  const queueUpload = useCallback((audioBlob, chunkIndex) => {
    const context = contextRef.current || {};
    uploadQueueRef.current = uploadQueueRef.current
      .then(() => uploadAudioChunk({
        audioBlob,
        chunkIndex,
        sessionId: context.sessionId,
        doctorId: context.doctorId,
        patientId: context.patientId,
        doctorName: context.doctorName,
        patientName: context.patientName,
      }))
      .catch((error) => {
        console.error("[voice-rx] audio chunk upload failed", { chunkIndex, error });
        if (!localErrorNotifiedRef.current) {
          localErrorNotifiedRef.current = true;
          toast.error(error?.message || "Audio chunk upload failed.");
        }
      });
    return uploadQueueRef.current;
  }, []);

  const stopSegment = useCallback(({ forceUpload = false, restart = false } = {}) => {
    clearIntervalTimer();
    const recorder = recorderRef.current;
    if (!recorder) {
      stoppingSegmentRef.current = false;
      return Promise.resolve();
    }

    stoppingSegmentRef.current = true;
    recorderRef.current = null;
    return new Promise((resolve) => {
      const finish = () => {
        const chunks = segmentChunksRef.current;
        segmentChunksRef.current = [];
        segmentStartedAtRef.current = 0;
        stoppingSegmentRef.current = false;

        if (forceUpload && chunks.length) {
          const audioBlob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || "audio/webm" });
          if (audioBlob.size > 0) {
            chunkIndexRef.current += 1;
            queueUpload(audioBlob, chunkIndexRef.current);
          }
        }

        const shouldRestart = restart || pendingStartAfterStopRef.current;
        pendingStartAfterStopRef.current = false;
        if (shouldRestart && enabledRef.current && !pausedRef.current && streamRef.current && isAudioChunkContextReady(contextRef.current)) {
          window.setTimeout(() => {
            const start = startSegmentRef.current;
            start?.();
          }, 0);
        }
        resolve();
      };

      recorder.addEventListener("stop", finish, { once: true });
      try {
        if (recorder.state !== "inactive") {
          if (recorder.state === "recording") recorder.requestData();
          recorder.stop();
        } else {
          finish();
        }
      } catch {
        finish();
      }
    });
  }, [clearIntervalTimer, queueUpload]);

  const startSegmentRef = useRef(null);
  const startSegment = useCallback(() => {
    if (!streamRef.current || recorderRef.current || pausedRef.current || !enabledRef.current) return;
    if (!isAudioChunkContextReady(contextRef.current)) return;
    if (stoppingSegmentRef.current) {
      pendingStartAfterStopRef.current = true;
      return;
    }

    const recorder = createAudioRecorder(streamRef.current);
    if (!recorder) return;

    segmentChunksRef.current = [];
    segmentStartedAtRef.current = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        segmentChunksRef.current.push(event.data);
      }
    };

    try {
      recorder.start(1000);
      recorderRef.current = recorder;
      intervalTimerRef.current = window.setTimeout(() => {
        stopSegment({ forceUpload: true, restart: true });
      }, VOICE_CHUNK_UPLOAD_INTERVAL_MS);
    } catch (error) {
      console.error("Audio chunk recorder start failed", error);
      recorderRef.current = null;
    }
  }, [stopSegment]);
  startSegmentRef.current = startSegment;

  useEffect(() => {
    if (streamRef.current === stream) return;
    streamRef.current = stream;
    stopSegment({ forceUpload: true, restart: Boolean(stream) });
  }, [stopSegment, stream]);

  useEffect(() => {
    if (paused) {
      stopSegment({ forceUpload: true });
      return;
    }
    if (enabled && stream && isAudioChunkContextReady(audioChunkContext)) {
      startSegment();
    }
  }, [audioChunkContext, enabled, paused, resetKey, startSegment, stopSegment, stream]);

  useEffect(() => {
    return () => {
      stopSegment({ forceUpload: false });
    };
  }, [stopSegment]);

  const flushFinalChunks = useCallback(async () => {
    await stopSegment({ forceUpload: true });
    await uploadQueueRef.current;
  }, [stopSegment]);

  return { flushFinalChunks };
}

function useActiveMic(stream, devices, selectedDeviceId) {
  const [activeDeviceId, setActiveDeviceId] = useState(undefined);
  const lastNotifiedRef = useRef(undefined);

  useEffect(() => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    const id = (track.getSettings && track.getSettings().deviceId) || selectedDeviceId;
    setActiveDeviceId(id || undefined);
  }, [stream, selectedDeviceId]);

  const activeDevice = useMemo(() => {
    if (selectedDeviceId === DEFAULT_MIC_DEVICE_ID) {
      const defaultDevice = devices.find((d) => d.deviceId === DEFAULT_MIC_DEVICE_ID);
      if (defaultDevice) return defaultDevice;
    }
    if (activeDeviceId) {
      const m = devices.find((d) => d.deviceId === activeDeviceId);
      if (m) return m;
    }
    return devices[0];
  }, [devices, activeDeviceId, selectedDeviceId]);

  useEffect(() => {
    const id = activeDevice?.deviceId;
    if (!id || !activeDevice?.label) return;
    if (lastNotifiedRef.current === undefined) {
      lastNotifiedRef.current = id;
      toast.success(`Connected microphone: ${activeDevice.label}`);
      return;
    }
    if (lastNotifiedRef.current !== id) {
      lastNotifiedRef.current = id;
      toast.success(`Microphone switched to ${activeDevice.label}`);
    }
  }, [activeDevice]);

  return { activeDevice };
}

// ── Transcript display helpers ────────────────────────────────────────────────

function AnimatedTranscript({ text, paused, className }) {
  const tokens = useMemo(() => text ? text.split(/(\s+)/) : [], [text]);
  const prevVisibleCountRef = useRef(0);
  let visibleIndex = -1;
  const prevVisible = prevVisibleCountRef.current;

  const rendered = tokens.map((tok, i) => {
    const isSpace = /^\s+$/.test(tok);
    if (isSpace) return <React.Fragment key={i}>{tok}</React.Fragment>;
    visibleIndex += 1;
    const isNew = visibleIndex >= prevVisible;
    const stagger = Math.min((visibleIndex - prevVisible) * 30, 280);
    return (
      <span key={i} className="vrx-word"
        style={isNew ? { animation: `vrxWordReveal 600ms cubic-bezier(0.22,1,0.36,1) ${stagger}ms both` } : undefined}>
        {tok}
      </span>
    );
  });

  useEffect(() => { prevVisibleCountRef.current = visibleIndex + 1; });

  return (
    <p className={className}>
      {rendered}
      {!paused && <span className="vrx-caret" aria-hidden />}
    </p>
  );
}

function AnimatedTranscriptPreview({ text, className }) {
  const tokens = useMemo(() => text ? text.split(/(\s+)/) : [], [text]);
  const prevVisibleCountRef = useRef(0);
  let visibleIndex = -1;
  const prevVisible = prevVisibleCountRef.current;

  const rendered = tokens.map((token, index) => {
    if (/^\s+$/.test(token)) return <span key={index}>{token}</span>;
    visibleIndex += 1;
    const isNew = visibleIndex >= prevVisible;
    const stagger = Math.min((visibleIndex - prevVisible) * 26, 220);
    return (
      <span key={index} className="vrx-word"
        style={isNew ? { "--vrx-stagger": `${stagger}ms` } : undefined}
        data-word-new={isNew ? "true" : undefined}>
        {token}
      </span>
    );
  });

  useEffect(() => { prevVisibleCountRef.current = visibleIndex + 1; });
  return <p className={className}>{rendered}</p>;
}

// ── Overlay processing view (used inside overlay layout) ──────────────────────

function OverlayProcessingView({ processingTranscript, processingLabel }) {
  const hasTranscript = hasTranscriptContent(processingTranscript);
  const isDiarized = hasDiarizedTranscript(processingTranscript);

  return (
    <div className={canvasStyles.overlayProcessing}>
      <div className={canvasStyles.overlayProcessingCard}>
        <div className={[canvasStyles.overlayTranscriptFrame, "relative"].join(" ")}>
          <ShineBorder
            variant="rotate"
            borderWidth={1.5}
            duration={2.2}
            shineColor={["#D565EA", "#673AAC", "#1A1994"]}
            baseColor="rgba(226,226,234,0.95)" />
          <div className={canvasStyles.overlayTranscriptScroll}>
            <div className={canvasStyles.overlayTranscriptSafeArea}>
              {hasTranscript ? (
                isDiarized ? (
                  <ConversationTranscript raw={processingTranscript} shimmer />
                ) : (
                  <DictationTranscript raw={processingTranscript} animate />
                )
              ) : (
                <p className={canvasStyles.overlayTranscriptPlaceholder}>
                  {processingLabel || "Refining your captured consultation..."}
                </p>
              )}
            </div>
          </div>
        </div>
        {hasTranscript ? <CaptionCarousel /> : null}
        <span className={canvasStyles.overlayProgressTrack} aria-hidden>
          <span className={canvasStyles.overlayProgressBar} />
        </span>
      </div>
    </div>
  );
}

// ── VoiceRecorderCore ─────────────────────────────────────────────────────────

export function VoiceRecorderCore({
  // Layout mode
  layout = "overlay",

  // Common
  onCancel,
  onCancelRequest,
  onSubmit,
  audioChunkContext,
  analyticsContext,
  sectionLabel,
  showSectionInStatus = true,

  // Overlay-only
  variant = "stack",
  fillHeight = false,
  radiusClassName = "rounded-b-[16px]",
  enableCollapsedVoiceSession = false,
  hideCaptions = false,
  hideMicControlsWhenSubmitProcessing = false,

  // Fullscreen-only
  mode,
  isAwaitingResponse = false,
  processingTranscript: processingTranscriptProp = "",
  submittedTranscript = "",
  isHandoffExiting = false,
  onCollapse,
  isPanelVisible = true,
  onPauseChange,
  patientName, // eslint-disable-line no-unused-vars

  // Transcript (fullscreen: live captions from parent; overlay: scripted fallback)
  transcript: externalTranscript = "",

  // Overlay processing state
  processingLabel,
  error: processingError,
  onClose: onErrorClose,
}) {
  const isFullscreen = layout === "fullscreen";
  const tpConfigData = useFeatureValue(TP_CONFIG_DATA_FEATURE_KEY, {});
  const enableVAD = isVadEnabled(tpConfigData);
  const silenceDetectorThresholdMs = getSilenceDetectorThresholdMs(tpConfigData);
  const vadMinSpeechCoverageRatio = getVadMinSpeechCoverageRatio(tpConfigData);
  const publishesCollapsedVoiceSession = isFullscreen || enableCollapsedVoiceSession;
  const rootRef = useRef(null);
  const transcriptScrollRef = useRef(null);
  const levelRef = useRef(0);
  const analyticsContextRef = useRef(analyticsContext);
  const audioChunkContextRef = useRef(audioChunkContext);
  analyticsContextRef.current = analyticsContext;
  audioChunkContextRef.current = audioChunkContext;

  const [manualMute, setManualMute] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => getInitialMicDeviceId());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [devicePopoverOpen, setDevicePopoverOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(!isFullscreen && variant === "stack");
  const [isUltraCompact, setIsUltraCompact] = useState(false);
  const [submitProcessing, setSubmitProcessing] = useState(false);
  const [humanVoiceActive, setHumanVoiceActive] = useState(false);
  const [acceptedExternalTranscript, setAcceptedExternalTranscript] = useState("");
  const submitProcessingRef = useRef(false);
  const vadSpeechAnalysisRef = useRef(createEmptyVadSpeechAnalysis());

  // Fullscreen: processing phase → bottom loader transition
  const [processingPhase, setProcessingPhase] = useState("idle");
  const [bottomLoaderActive, setBottomLoaderActive] = useState(false);
  const BOTTOM_EXIT_MS = 320;

  useEffect(() => {
    if (!isFullscreen) return;
    if (!isAwaitingResponse) { setProcessingPhase("idle"); return; }
    setProcessingPhase("submitting");
    const t = window.setTimeout(() => setProcessingPhase("processing"), 5000);
    return () => window.clearTimeout(t);
  }, [isAwaitingResponse, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    if (processingPhase !== "processing") { setBottomLoaderActive(false); return; }
    const t = window.setTimeout(() => setBottomLoaderActive(true), BOTTOM_EXIT_MS);
    return () => window.clearTimeout(t);
  }, [processingPhase, isFullscreen]);

  const dockExiting = isFullscreen && processingPhase === "processing" && !bottomLoaderActive;
  const navLocked = isFullscreen && (isAwaitingResponse || submitProcessing);

  // Network
  const { online } = useNetConnection();
  const networkPaused = !online;

  // Derived paused state
  const paused = manualMute || networkPaused || isAwaitingResponse || submitProcessing;

  // Mic stream — disabled after submit/awaiting
  const micEnabled = isFullscreen ? !isAwaitingResponse : !submitProcessing;
  const {
    stream,
    devices,
    error: micError,
    permissionState: micPermissionState,
    retry: retryMic,
  } = useMicStream(selectedDeviceId, micEnabled);
  const micReady = Boolean(stream && !micError);
  const recordingActive = micReady && !paused;
  const selectedStreamAudioActive = useSelectedStreamAudioActivity(stream, recordingActive);

  // Recording timer
  const elapsedMs = useRecordingTimer(recordingActive);

  // Blob recorder
  const { getBlob } = useBlobRecorder(stream, paused, micEnabled);
  const { flushFinalChunks } = useAudioChunkRecorder(stream, paused, micEnabled, audioChunkContext);

  // Active mic tracking
  const { activeDevice } = useActiveMic(stream, devices, selectedDeviceId);
  const fallbackNoticeShownRef = useRef(false);

  useEffect(() => {
    if (!selectedDeviceId || devices.length === 0) return;
    // "default" means "follow the system default"; Firefox/Safari never enumerate a
    // device with that id, so it must not be treated as an unplugged microphone.
    const selectedDeviceAvailable =
      selectedDeviceId === DEFAULT_MIC_DEVICE_ID ||
      devices.some((device) => device.deviceId === selectedDeviceId);
    if (selectedDeviceAvailable) {
      fallbackNoticeShownRef.current = false;
      return;
    }
    setSessionPreferredMicDeviceId(undefined);
    setSelectedDeviceId(undefined);
    if (!fallbackNoticeShownRef.current) {
      fallbackNoticeShownRef.current = true;
      toast.warning("Selected microphone is unavailable. Using default microphone.");
    }
  }, [devices, selectedDeviceId]);

  const liveTranscriptAllowed = enableVAD ? humanVoiceActive : selectedStreamAudioActive;
  const liveTranscriptEnabled = !isFullscreen && recordingActive && liveTranscriptAllowed;

  // Live transcript (overlay only; fullscreen receives transcript from parent via externalTranscript)
  const {
    transcript: liveFinal,
    error: liveError,
    reset: resetLiveTranscript,
  } = useLiveTranscript({
    enabled: liveTranscriptEnabled,
    paused: !liveTranscriptEnabled,
    lang: "en-US",
  });
  const liveTranscriptDeviceRef = useRef(null);

  useEffect(() => {
    const deviceId = activeDevice?.deviceId || selectedDeviceId || "";
    if (!deviceId) return;
    if (liveTranscriptDeviceRef.current === null) {
      liveTranscriptDeviceRef.current = deviceId;
      return;
    }
    if (liveTranscriptDeviceRef.current === deviceId) return;
    liveTranscriptDeviceRef.current = deviceId;
    setHumanVoiceActive(false);
    setAcceptedExternalTranscript("");
    resetLiveTranscript();
  }, [activeDevice?.deviceId, resetLiveTranscript, selectedDeviceId]);

  useEffect(() => {
    if (!isFullscreen) return;
    if (!recordingActive && !isAwaitingResponse) {
      setAcceptedExternalTranscript("");
      return;
    }
    if (liveTranscriptAllowed) {
      setAcceptedExternalTranscript(externalTranscript || "");
    }
  }, [externalTranscript, isAwaitingResponse, isFullscreen, liveTranscriptAllowed, recordingActive]);

  // Sync context (safe without provider — context has no-op defaults)
  const {
    activeVoiceLocks,
    activeVoiceLockIds,
    setMicUnavailable,
    claimActiveVoiceModule,
    releaseActiveVoiceModule,
    setCollapsedVoiceSession,
    voicePauseToggleRequest,
    voiceSubmitRequest
  } = useRxPadSync();
  const voiceLockIdRef = useRef(`voice-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const resumeBlockedByOtherVoice = manualMute && activeVoiceLockIds?.some((id) => (
    id !== voiceLockIdRef.current &&
    activeVoiceLocks?.[id]?.label !== sectionLabel
  ));

  useEffect(() => {
    setMicUnavailable(!!micError, micError || null);
    return () => setMicUnavailable(false);
  }, [micError, setMicUnavailable]);

  useEffect(() => {
    if (!sectionLabel) return;
    const lockId = voiceLockIdRef.current;
    if (recordingActive && micEnabled) {
      claimActiveVoiceModule(lockId, sectionLabel);
    } else {
      releaseActiveVoiceModule(lockId);
    }
    return () => releaseActiveVoiceModule(lockId);
  }, [claimActiveVoiceModule, micEnabled, recordingActive, releaseActiveVoiceModule, sectionLabel]);

  // Mute stream tracks
  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !paused; });
  }, [stream, paused]);

  const captionsPaused = paused || !liveTranscriptAllowed;
  useEffect(() => { onPauseChange?.(captionsPaused); }, [captionsPaused, onPauseChange]);

  const pauseRequestSeenRef = useRef(voicePauseToggleRequest);
  useEffect(() => {
    if (!publishesCollapsedVoiceSession) return;
    if (pauseRequestSeenRef.current === voicePauseToggleRequest) return;
    pauseRequestSeenRef.current = voicePauseToggleRequest;
    if (!voicePauseToggleRequest || isAwaitingResponse || submitProcessing || networkPaused || micError) return;
    setManualMute((value) => !value);
  }, [publishesCollapsedVoiceSession, voicePauseToggleRequest, isAwaitingResponse, submitProcessing, networkPaused, micError]);

  // Resize observer
  useEffect(() => {
    if (!isFullscreen) return;
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => { setIsCompactLayout(node.getBoundingClientRect().width < 340); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen || variant === "stack") return;
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const w = node.getBoundingClientRect().width;
      setIsCompactLayout(w < 620);
      setIsUltraCompact(w < 500);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [isFullscreen, variant]);

  // Ambient level animation (fullscreen)
  useEffect(() => {
    if (!isFullscreen) return;
    const root = typeof document !== "undefined" ? document.documentElement : null;
    if (!root) return;
    let raf = 0;
    let smoothed = 0;
    let lastPublished = -1;
    const tick = () => {
      const target = paused ? 0 : levelRef.current;
      const rate = target > smoothed ? 0.55 : 0.22;
      smoothed += (target - smoothed) * rate;
      if (target < 0.005 && smoothed < 0.01) smoothed = 0;
      const shaped = Math.tanh(smoothed * 2.2) * 0.40;
      const rounded = Math.round(Math.max(0, Math.min(0.40, shaped)) * 1000) / 1000;
      if (rounded !== lastPublished) {
        root.style.setProperty("--vrx-live-level", rounded.toFixed(3));
        lastPublished = rounded;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); root.style.setProperty("--vrx-live-level", "0"); };
  }, [paused, isFullscreen]);

  // Blob level animation (overlay)
  useEffect(() => {
    if (isFullscreen) return;
    const node = rootRef.current;
    if (!node) return;
    let raf = 0;
    const tick = () => {
      node.style.setProperty("--vrx-blob-level", Math.max(0, Math.min(1, levelRef.current || 0)).toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isFullscreen]);

  // Transcript scroll
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); });
  }, [liveFinal, externalTranscript]);

  // Sound effects
  useEffect(() => { playVoiceRxStartSound(); }, []);

  const lastErrorToneRef = useRef(null);
  const micErrorForcedMuteRef = useRef(false);

  // ── Derived: critical block ─────────────────────────────────────────────────

  const criticalBlock = useMemo(() => {
    if (!online) return {
      kind: "offline",
      icon: <WifiOff size={isFullscreen ? 40 : 32} strokeWidth={2.2} absoluteStrokeWidth />,
      title: "You're offline",
      description: "Recording is paused until you're back online. Your transcript is safe.",
      canRetry: false,
    };
    if (micError) return {
      kind: "mic",
      icon: <MicOff size={isFullscreen ? 40 : 32} strokeWidth={2.2} absoluteStrokeWidth />,
      title: micError === MIC_PERMISSION_REVOKED_MESSAGE
        ? "Microphone permission revoked"
        : micPermissionState === MIC_PERMISSION_STATE.DENIED ? "Microphone blocked" : "Microphone unavailable",
      description: micError === MIC_PERMISSION_REVOKED_MESSAGE
        ? MIC_PERMISSION_REVOKED_MESSAGE
        : micPermissionState === MIC_PERMISSION_STATE.DENIED
        ? "Enable microphone access from your browser site settings, then try again."
        : "Please allow microphone access in your browser.",
      actionLabel: micPermissionState === MIC_PERMISSION_STATE.DENIED ? "How to enable microphone" : "Allow microphone access",
      canRetry: true,
    };
    return null;
  }, [online, micError, micPermissionState, isFullscreen]);

  useEffect(() => {
    if (micError) {
      micErrorForcedMuteRef.current = true;
      setManualMute(true);
    }
  }, [micError]);

  useEffect(() => {
    if (!stream || micError || !micErrorForcedMuteRef.current) return;
    micErrorForcedMuteRef.current = false;
    setManualMute(false);
  }, [stream, micError]);

  useEffect(() => {
    const key = criticalBlock ? `${criticalBlock.kind}:${criticalBlock.title}` : null;
    if (!key) { lastErrorToneRef.current = null; return; }
    if (lastErrorToneRef.current === key) return;
    lastErrorToneRef.current = key;
    playVoiceRxErrorSound();
  }, [criticalBlock]);

  const handleAllowMicClick = useCallback(() => {
    if (micPermissionState === MIC_PERMISSION_STATE.DENIED) {
      toast.warning("Microphone is blocked. Enable it from browser site settings, then return to VoiceRx.");
      return;
    }
    retryMic();
  }, [micPermissionState, retryMic]);

  // ── Derived: display transcript ─────────────────────────────────────────────

  // For fullscreen: externalTranscript is the live caption fed from parent (useDrAgentPanel)
  // For overlay: prefer externalTranscript (scripted), fall back to live
  const liveDisplayText = isFullscreen ? "" : (externalTranscript?.trim() ? externalTranscript : (liveError ? "" : liveFinal));
  const syncedExternalTranscript = isFullscreen ? acceptedExternalTranscript : externalTranscript;

  // Fullscreen: resolve which transcript to display given processing phases
  const fsDisplayTranscript = useMemo(() => {
    if (!isFullscreen) return "";
    const liveHasText = hasTranscriptContent(syncedExternalTranscript);
    const submittedHasText = hasTranscriptContent(submittedTranscript);
    const processingHasText = hasTranscriptContent(processingTranscriptProp);
    return processingHasText ? processingTranscriptProp
      : (isAwaitingResponse && submittedHasText ? submittedTranscript
        : liveHasText ? syncedExternalTranscript : "");
  }, [isFullscreen, syncedExternalTranscript, submittedTranscript, processingTranscriptProp, isAwaitingResponse]);

  // Freeze transcript on criticalBlock (fullscreen only)
  const frozenFsTranscriptRef = useRef(null);
  if (isFullscreen && criticalBlock) {
    if (frozenFsTranscriptRef.current === null) frozenFsTranscriptRef.current = fsDisplayTranscript;
  } else if (frozenFsTranscriptRef.current !== null) {
    frozenFsTranscriptRef.current = null;
  }
  const effectiveFsTranscript = frozenFsTranscriptRef.current ?? fsDisplayTranscript;
  const effectiveFsTranscriptText = transcriptToText(effectiveFsTranscript);
  const fsCaptionHasText = hasTranscriptContent(effectiveFsTranscript);

  const overlayHasTranscript = !isFullscreen && liveDisplayText.trim().length > 0;

  // ── Derived: canSubmit ──────────────────────────────────────────────────────

  const canSubmit = isFullscreen
    ? (!isAwaitingResponse && !submitProcessing && !networkPaused && micReady && (syncedExternalTranscript?.trim()?.length > 0 || elapsedMs >= 2000))
    : (!submitProcessing && !criticalBlock && micReady && (overlayHasTranscript || elapsedMs >= 2000));

  // ── Derived: status label ───────────────────────────────────────────────────

  const statusLabel = useMemo(() => {
    if (isAwaitingResponse || submitProcessing) return "Processing";
    if (!online) return "Waiting for connection";
    if (micError) return "Mic unavailable";
    if (!stream) return "Give microphone permission";
    if (manualMute) return "Paused";
    return "Listening";
  }, [isAwaitingResponse, submitProcessing, online, micError, stream, manualMute]);

  const buildRecorderEventPayload = useCallback((extra = {}) => ({
    patientData: analyticsContextRef.current?.patientData,
    profile: analyticsContextRef.current?.profile,
    sessionId: analyticsContextRef.current?.sessionId || audioChunkContextRef.current?.sessionId || "",
    submitId: analyticsContextRef.current?.submitId || "",
    requestId: analyticsContextRef.current?.requestId || "",
    durationMs: elapsedMs,
    mode: analyticsContextRef.current?.mode || mode || (isFullscreen ? "dictation" : "module"),
    fromVoiceRecording: analyticsContextRef.current?.fromVoiceRecording ?? true,
    voicecall: analyticsContextRef.current?.voicecall || 0,
    moduleName: analyticsContextRef.current?.moduleName || sectionLabel || "",
    sourceSurface: analyticsContextRef.current?.sourceSurface || (isFullscreen ? "dr_agent" : "module_recorder"),
    voiceInputLocation: analyticsContextRef.current?.voiceInputLocation || sectionLabel || "",
    isDoctorAgent: analyticsContextRef.current?.isDoctorAgent ?? isFullscreen,
    micBeingUsed: activeDevice?.label || "",
    extra: {
      doctorId: analyticsContextRef.current?.doctorId || audioChunkContextRef.current?.doctorId || "",
      patientId: analyticsContextRef.current?.patientId || audioChunkContextRef.current?.patientId || "",
      selectedPatientId: analyticsContextRef.current?.selectedPatientId || "",
      permissionState: micPermissionState,
      layout,
      sectionLabel: sectionLabel || "",
      statusLabel,
      manualMute,
      micReady,
      recordingActive,
      audioLevel: Math.max(0, Math.min(1, levelRef.current || 0)),
      ...extra,
    },
  }), [
    activeDevice?.label,
    elapsedMs,
    isFullscreen,
    layout,
    manualMute,
    micPermissionState,
    micReady,
    mode,
    recordingActive,
    sectionLabel,
    statusLabel,
  ]);

  const handleNoHumanVoiceDetected = useCallback((vadState = {}) => {
    const detector = vadState.detector || (enableVAD ? "ricky0123_vad" : "audio_rms");
    trackVoiceRx2RecorderEvent("TP_Voice_V2_Silent_Detection", buildRecorderEventPayload({
      action: "alert_after_no_human_voice",
      silenceDurationMs: silenceDetectorThresholdMs,
      detector,
      vadEnabled: enableVAD,
      humanVoiceDetected: false,
      ...vadState,
    }));
    playSilenceReminderSound();
    toast.warning("Audio seems quiet. Please try speaking a little closer to the mic.");
  }, [buildRecorderEventPayload, enableVAD, silenceDetectorThresholdMs]);

  const trackedMicDeviceRef = useRef(null);
  useEffect(() => {
    const currentMic = {
      deviceId: activeDevice?.deviceId || "",
      label: activeDevice?.label || "",
      groupId: activeDevice?.groupId || "",
    };
    if (!currentMic.deviceId && !currentMic.label) return;

    const previousMic = trackedMicDeviceRef.current;
    if (!previousMic) {
      trackedMicDeviceRef.current = currentMic;
      return;
    }
    if (previousMic.deviceId === currentMic.deviceId && previousMic.label === currentMic.label) return;

    trackedMicDeviceRef.current = currentMic;
    trackVoiceRx2RecorderEvent("TP_Voice_V2_Mic_Changed", buildRecorderEventPayload({
      action: "microphone_changed",
      previousMicDeviceId: previousMic.deviceId,
      previousMicLabel: previousMic.label,
      previousMicGroupId: previousMic.groupId,
      currentMicDeviceId: currentMic.deviceId,
      currentMicLabel: currentMic.label,
      currentMicGroupId: currentMic.groupId,
      selectedMicDeviceId: selectedDeviceId || "",
    }));
  }, [
    activeDevice?.deviceId,
    activeDevice?.groupId,
    activeDevice?.label,
    buildRecorderEventPayload,
    selectedDeviceId,
  ]);

  const resetVadSpeechAnalysis = useCallback(() => {
    vadSpeechAnalysisRef.current = createEmptyVadSpeechAnalysis();
  }, []);

  const handleVadFrameForSpeechAnalysis = useCallback(({ nowMs, speechProbability, vadSpeechFrame }) => {
    const stats = vadSpeechAnalysisRef.current;
    const previousFrameAtMs = stats.lastFrameAtMs || 0;
    const rawDeltaMs = previousFrameAtMs ? nowMs - previousFrameAtMs : 0;
    const frameDeltaMs = rawDeltaMs > 0 ? Math.min(rawDeltaMs, VAD_MAX_FRAME_DELTA_MS) : 0;

    stats.totalFrames += 1;
    stats.probabilitySum += speechProbability;
    stats.maxSpeechProbability = Math.max(stats.maxSpeechProbability, speechProbability);
    stats.firstFrameAtMs = stats.firstFrameAtMs || nowMs;
    stats.lastFrameAtMs = nowMs;
    stats.analyzedDurationMs += frameDeltaMs;

    if (vadSpeechFrame) {
      stats.speechFrames += 1;
      stats.speechDurationMs += frameDeltaMs;
      stats.firstSpeechAtMs = stats.firstSpeechAtMs || nowMs;
      stats.lastSpeechAtMs = nowMs;
    }
  }, []);

  const vadActive = Boolean(enableVAD && stream && micEnabled && recordingActive && online);
  const rawAudioSilenceActive = Boolean(!enableVAD && stream && micEnabled && recordingActive && online);

  useEffect(() => {
    resetVadSpeechAnalysis();
  }, [activeDevice?.deviceId, resetVadSpeechAnalysis, stream?.id]);

  const waveformActive = recordingActive;
  const vadSilenceDetector = vadActive ? (
    <HumanVoiceSilenceDetector
      key={stream.id || "voice-rx-vad-stream"}
      stream={stream}
      active={vadActive}
      onNoHumanVoice={handleNoHumanVoiceDetected}
      timeoutMs={silenceDetectorThresholdMs}
      onHumanVoiceActiveChange={setHumanVoiceActive}
      onVadFrameProcessed={handleVadFrameForSpeechAnalysis} />
  ) : null;
  const rawAudioSilenceDetector = rawAudioSilenceActive ? (
    <RawAudioSilenceDetector
      active={rawAudioSilenceActive}
      audioActive={selectedStreamAudioActive}
      onSilence={handleNoHumanVoiceDetected}
      timeoutMs={silenceDetectorThresholdMs} />
  ) : null;

  const isListening = statusLabel === "Listening";
  const shouldShowSectionLabel = showSectionInStatus && sectionLabel && sectionLabel !== "Dr Agent";

  useEffect(() => {
    if (!publishesCollapsedVoiceSession) return;
    setCollapsedVoiceSession({
      active: recordingActive && !isAwaitingResponse && !submitProcessing,
      paused: !recordingActive || paused,
      statusLabel,
      elapsedLabel: formatElapsed(elapsedMs),
      audioLevel: recordingActive ? Math.max(0, Math.min(1, levelRef.current || 0)) : 0
    });
  }, [
    publishesCollapsedVoiceSession,
    setCollapsedVoiceSession,
    isAwaitingResponse,
    submitProcessing,
    recordingActive,
    paused,
    statusLabel,
    elapsedMs
  ]);

  useEffect(() => {
    if (!publishesCollapsedVoiceSession) return undefined;
    return () => {
      setCollapsedVoiceSession({
        active: false,
        paused: false,
        statusLabel: "",
        elapsedLabel: "",
        audioLevel: 0
      });
    };
  }, [publishesCollapsedVoiceSession, setCollapsedVoiceSession]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLowSpeechCoverageBlock = useCallback(({
    audioBlob,
    speechAnalysis,
    submitClickedAt,
    submitClickedAtMs,
  }) => {
    const submitId = `voice-rx-2-vad-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    playVoiceRxErrorSound();
    const toastEventPayload = {
      action: "dismiss_low_speech_block_toast",
      failedPhase: "vad-precheck",
      voiceApiCalled: false,
      submitClickedAt,
      submitId,
      requestId: submitId,
      ...speechAnalysis,
    };
    toast.warning("We couldn't detect enough speech in this recording. Please re-record and try again.", {
      key: submitId,
      closable: true,
      onDismiss: () => {
        trackVoiceRx2RecorderEvent("TP_Voice_V2_Low_Speech_Ratio_Toast_Dismissed", buildRecorderEventPayload(toastEventPayload));
      },
    });
    void uploadAndTrackVoiceRx2LowSpeechBlock({
      ...buildRecorderEventPayload(),
      audioBlob,
      submitId,
      requestId: submitId,
      submitClickedAt,
      submitClickedAtMs,
      durationMs: elapsedMs,
      speechAnalysis: {
        action: "blocked_before_transcribe_audio",
        ...speechAnalysis,
      },
    }).catch((error) => {
      console.error("[voice-rx] low speech upload/log failed", error);
    });
    setAcceptedExternalTranscript("");
    resetLiveTranscript();
    resetVadSpeechAnalysis();
    setHumanVoiceActive(false);
    onCancel?.();
  }, [buildRecorderEventPayload, elapsedMs, onCancel, resetLiveTranscript, resetVadSpeechAnalysis]);

  const handleSubmitClick = useCallback(async () => {
    if (submitProcessingRef.current || submitProcessing || (isFullscreen && isAwaitingResponse) || !canSubmit) return;
    submitProcessingRef.current = true;
    if (isFullscreen) playSubmitSound();
    setSubmitProcessing(true);
    const submitClickedAtMs = Date.now();
    const submitClickedAt = new Date(submitClickedAtMs).toISOString();
    let audioBlob = null;
    try { audioBlob = await getBlob(); } catch (e) { console.error("Failed to capture audio blob", e); }
    try { await flushFinalChunks(); } catch (e) { console.error("Failed to flush audio chunks", e); }
    const transcript = isFullscreen ? syncedExternalTranscript : liveDisplayText;
    const speechAnalysis = enableVAD
      ? buildVadSpeechAnalysisSnapshot(vadSpeechAnalysisRef.current, elapsedMs, vadMinSpeechCoverageRatio)
      : buildDisabledVadSpeechAnalysisSnapshot(elapsedMs);
    const shouldBlockForLowSpeechCoverage = Boolean(
      enableVAD &&
      audioBlob?.size &&
      speechAnalysis.canEvaluateSpeechCoverage &&
      speechAnalysis.speechCoverageRatio < vadMinSpeechCoverageRatio
    );
    if (shouldBlockForLowSpeechCoverage) {
      submitProcessingRef.current = false;
      setSubmitProcessing(false);
      handleLowSpeechCoverageBlock({
        audioBlob,
        speechAnalysis,
        submitClickedAt,
        submitClickedAtMs,
      });
      return;
    }
    resetVadSpeechAnalysis();
    try {
      await onSubmit?.({ audioBlob, transcript, durationMs: elapsedMs, submitClickedAt, submitClickedAtMs, micBeingUsed: activeDevice?.label || "", speechAnalysis });
    } catch (e) {
      console.error("Voice submit failed", e);
    } finally {
      submitProcessingRef.current = false;
      setSubmitProcessing(false);
    }
  }, [submitProcessing, isFullscreen, isAwaitingResponse, canSubmit, getBlob, flushFinalChunks, onSubmit, syncedExternalTranscript, liveDisplayText, elapsedMs, enableVAD, vadMinSpeechCoverageRatio, handleLowSpeechCoverageBlock, resetVadSpeechAnalysis, activeDevice?.label]);

  const submitRequestSeenRef = useRef(voiceSubmitRequest);
  useEffect(() => {
    if (!publishesCollapsedVoiceSession) return;
    if (submitRequestSeenRef.current === voiceSubmitRequest) return;
    submitRequestSeenRef.current = voiceSubmitRequest;
    if (!voiceSubmitRequest) return;
    handleSubmitClick();
  }, [publishesCollapsedVoiceSession, voiceSubmitRequest, handleSubmitClick]);

  const handleDeviceSelect = useCallback((id) => {
    setSessionPreferredMicDeviceId(id);
    setSelectedDeviceId(id);
    setDevicePopoverOpen(false);
  }, []);
  const handleCancelConfirm = useCallback(() => {
    trackVoiceRx2DiscardEvent({
      ...buildRecorderEventPayload(),
      discardSource: "discard_modal",
      discardAction: "discard_confirm",
    });
    setConfirmOpen(false);
    onCancel?.();
  }, [buildRecorderEventPayload, onCancel]);
  const handleRequestCancel = useCallback(() => {
    if (onCancelRequest) {
      onCancelRequest();
      return;
    }
    setConfirmOpen(true);
  }, [onCancelRequest]);

  // ── Shared CTA elements (used in both layouts) ───────────────────────────────

  const compactControls = !isFullscreen && (variant === "stack" || isCompactLayout);
  const s = isFullscreen ? fsStyles : osStyles;

  const cancelBtn = (
    <button
      type="button"
      onClick={handleRequestCancel}
      aria-label="End voice consultation"
      className={[
        "vrx-lg-btn vrx-close-btn group relative flex shrink-0 items-center justify-center rounded-[12px] transition-transform active:scale-[0.94]",
        isFullscreen
          ? "h-[42px] w-[42px]"
          : isUltraCompact ? s.ctaBtnUltra : compactControls ? s.ctaBtnCompact : s.ctaBtnNormal,
      ].filter(Boolean).join(" ")}>
      <span className="vrx-lg-surface" aria-hidden />
      <span className="vrx-lg-sheen" aria-hidden />
      <svg
        width={!isFullscreen && isUltraCompact ? 18 : !isFullscreen && compactControls ? 20 : 24}
        height={!isFullscreen && isUltraCompact ? 18 : !isFullscreen && compactControls ? 20 : 24}
        viewBox="0 0 24 24" fill="none" className="relative text-[#DC2626] transition-colors">
        <path d="M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 6L18 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  const micSegment = (
    <div className={[
      "vrx-lg-btn relative flex items-stretch overflow-hidden rounded-[12px] transition-opacity",
      isFullscreen
        ? ["h-[42px]", (criticalBlock || isAwaitingResponse) ? s.micSegmentDimmed : "", criticalBlock ? s.micSegmentNoPointer : "", manualMute ? "vrx-mic-muted" : ""].filter(Boolean).join(" ")
        : [isUltraCompact ? s.ctaBtnUltra : compactControls ? s.ctaBtnCompact : s.ctaBtnNormal, manualMute ? "vrx-mic-muted" : "", criticalBlock ? s.micSegmentCritical : ""].filter(Boolean).join(" "),
    ].join(" ")}>
      <span className="vrx-lg-surface" aria-hidden />
      <span className="vrx-lg-sheen" aria-hidden />
      <button
        type="button"
        onClick={() => {
          if (resumeBlockedByOtherVoice) return;
          setManualMute((value) => {
            const nextMuted = !value;
            if (nextMuted) {
              trackVoiceRx2RecorderEvent("TP_Voice_V2_Pause_Click", buildRecorderEventPayload({
                action: "manual_pause",
                previousMuted: value,
                nextMuted,
              }));
            }
            return nextMuted;
          });
        }}
        disabled={isFullscreen ? (networkPaused || isAwaitingResponse || resumeBlockedByOtherVoice) : (!!criticalBlock || resumeBlockedByOtherVoice)}
        aria-label={manualMute ? "Unmute microphone" : "Mute microphone"}
        aria-pressed={manualMute}
        className={[
          s.micBtn || s.micToggleBtn,
          isFullscreen ? (manualMute ? s.micBtnMuted : s.micBtnNormal)
            : [isUltraCompact ? s.micToggleBtnUltra : compactControls ? s.micToggleBtnCompact : s.micToggleBtnNormal, manualMute ? s.micToggleMuted : s.micToggleNormal].join(" "),
        ].filter(Boolean).join(" ")}>
        <span className={s.micIconWrap}>
          {isFullscreen ? (
            manualMute ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16.4201 6.41965V7.57965L9.14008 14.8596C8.18008 13.9896 7.58008 12.7096 7.58008 11.3396V6.41965C7.58008 4.35965 8.98008 2.64965 10.8801 2.15965C11.0701 2.10965 11.2501 2.26965 11.2501 2.45965V3.99965C11.2501 4.40965 11.5901 4.74965 12.0001 4.74965C12.4101 4.74965 12.7501 4.40965 12.7501 3.99965V2.45965C12.7501 2.26965 12.9301 2.10965 13.1201 2.15965C15.0201 2.64965 16.4201 4.35965 16.4201 6.41965Z" />
                <path d="M19.81 9.81012V11.4001C19.81 15.4701 16.68 18.8201 12.7 19.1701V21.3001C12.7 21.6901 12.39 22.0001 12 22.0001C11.61 22.0001 11.3 21.6901 11.3 21.3001V19.1701C10.21 19.0701 9.18001 18.7501 8.26001 18.2401L9.29001 17.2101C10.11 17.5901 11.03 17.8101 12 17.8101C15.54 17.8101 18.42 14.9301 18.42 11.4001V9.81012C18.42 9.43012 18.73 9.12012 19.12 9.12012C19.5 9.12012 19.81 9.43012 19.81 9.81012Z" />
                <path d="M16.42 10.0801V11.5301C16.42 14.1101 14.2 16.1801 11.56 15.9301C11.28 15.9001 11 15.8501 10.74 15.7601L16.42 10.0801Z" />
                <path d="M21.7701 2.22988C21.4701 1.92988 20.9801 1.92988 20.6801 2.22988L7.23012 15.6799C6.20012 14.5499 5.58012 13.0499 5.58012 11.3999V9.80988C5.58012 9.42988 5.27012 9.11988 4.88012 9.11988C4.50012 9.11988 4.19012 9.42988 4.19012 9.80988V11.3999C4.19012 13.4299 4.97012 15.2799 6.24012 16.6699L2.22012 20.6899C1.92012 20.9899 1.92012 21.4799 2.22012 21.7799C2.38012 21.9199 2.57012 21.9999 2.77012 21.9999C2.97012 21.9999 3.16012 21.9199 3.31012 21.7699L21.7701 3.30988C22.0801 3.00988 22.0801 2.52988 21.7701 2.22988Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M19.12 9.12c-.39 0-.7.31-.7.7v1.58c0 3.54-2.88 6.42-6.42 6.42s-6.42-2.88-6.42-6.42V9.81c0-.39-.31-.7-.7-.7-.39 0-.7.31-.7.7v1.58c0 4.07 3.13 7.42 7.12 7.78v2.13c0 .39.31.7.7.7.39 0 .7-.31.7-.7v-2.13c3.98-.35 7.12-3.71 7.12-7.78V9.81a.707.707 0 0 0-.7-.69Z" />
                <path d="M12 2c-2.44 0-4.42 1.98-4.42 4.42v5.12c0 2.44 1.98 4.42 4.42 4.42s4.42-1.98 4.42-4.42V6.42C16.42 3.98 14.44 2 12 2Zm1.31 6.95c-.07.26-.3.43-.56.43-.05 0-.1-.01-.15-.02-.39-.11-.8-.11-1.19 0-.32.09-.63-.1-.71-.41-.09-.31.1-.63.41-.71.59-.16 1.21-.16 1.8 0 .3.08.48.4.4.71Zm.53-1.94c-.09.24-.31.38-.55.38-.07 0-.14-.01-.2-.03-.69-.26-1.47-.26-2.17 0-.3.11-.63-.05-.74-.35-.11-.3.05-.63.35-.74.97-.35 2.03-.35 3 0 .3.11.46.44.31.74Z" />
              </svg>
            )
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path opacity="0.4" d="M19.12 9.12c-.39 0-.7.31-.7.7v1.58c0 3.54-2.88 6.42-6.42 6.42s-6.42-2.88-6.42-6.42V9.81c0-.39-.31-.7-.7-.7-.39 0-.7.31-.7.7v1.58c0 4.07 3.13 7.42 7.12 7.78v2.13c0 .39.31.7.7.7.39 0 .7-.31.7-.7v-2.13c3.98-.35 7.12-3.71 7.12-7.78V9.81a.707.707 0 0 0-.7-.69Z" />
                <path d="M12 2c-2.44 0-4.42 1.98-4.42 4.42v5.12c0 2.44 1.98 4.42 4.42 4.42s4.42-1.98 4.42-4.42V6.42C16.42 3.98 14.44 2 12 2Zm1.31 6.95c-.07.26-.3.43-.56.43-.05 0-.1-.01-.15-.02-.39-.11-.8-.11-1.19 0-.32.09-.63-.1-.71-.41-.09-.31.1-.63.41-.71.59-.16 1.21-.16 1.8 0 .3.08.48.4.4.71Zm.53-1.94c-.09.24-.31.38-.55.38-.07 0-.14-.01-.2-.03-.69-.26-1.47-.26-2.17 0-.3.11-.63-.05-.74-.35-.11-.3.05-.63.35-.74.97-.35 2.03-.35 3 0 .3.11.46.44.31.74Z" />
              </svg>
              {manualMute && (
                <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                  <line x1="3.5" y1="16.5" x2="16.5" y2="3.5" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
                  <line x1="3.5" y1="16.5" x2="16.5" y2="3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </>
          )}
        </span>
      </button>

      <div className="vrx-lg-divider" aria-hidden />

      <Popover open={devicePopoverOpen} onOpenChange={setDevicePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isFullscreen ? (!!criticalBlock || isAwaitingResponse) : !!criticalBlock}
            aria-label="Choose microphone"
            className={[
              s.devicePickerBtn,
              !isFullscreen && (compactControls ? s.devicePickerCompact : s.devicePickerNormal),
              isFullscreen
                ? (manualMute ? s.devicePickerMuted : s.devicePickerNormal)
                : (manualMute ? s.devicePickerMuted : s.devicePickerDefault),
            ].filter(Boolean).join(" ")}>
            <ChevronDown
              size={!isFullscreen && compactControls ? 14 : 16}
              strokeWidth={2.5}
              className={devicePopoverOpen ? s.chevronOpen : s.chevronClosed}
              aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" side="top" sideOffset={8} data-voice-allow className={s.devicePopoverContent}>
          <div className={s.devicePopoverHeader}>Microphone</div>
          {devices.length === 0 ? (
            <div className={s.devicePopoverEmpty}>{micError || "No input devices detected"}</div>
          ) : (
            devices.map((d, i) => {
              const selectedInList =
                selectedDeviceId && devices.some((dev) => dev.deviceId === selectedDeviceId);
              const isSelected = selectedInList
                ? selectedDeviceId === d.deviceId
                : activeDevice?.deviceId === d.deviceId || i === 0;
              return (
                <button key={d.deviceId || i} type="button" onClick={() => handleDeviceSelect(d.deviceId)}
                  className={[s.deviceItem, isSelected ? s.deviceItemSelected : s.deviceItemNormal].join(" ")}>
                  <span className={s.deviceItemLabel}>{d.label || `Microphone (${(d.deviceId || "default").slice(0, 6)})`}</span>
                  {isSelected && <Check size={14} className={s.deviceItemCheck} />}
                </button>
              );
            })
          )}
        </PopoverContent>
      </Popover>
    </div>
  );

  const submitBtn = isFullscreen && (isAwaitingResponse || submitProcessing) ? (
    <div role="status" aria-label="Processing consultation"
      className={[s.processingLoader, "relative flex h-[42px] items-center justify-center gap-[8px] rounded-[12px]"].join(" ")}>
      <span aria-hidden className={s.processingSpinner} />
      <span className={s.processingLabel}>Processing</span>
    </div>
  ) : (
    <button
      type="button"
      onClick={handleSubmitClick}
      disabled={!canSubmit}
      data-testid="voicerx-submit-recording"
      aria-label="Submit"
      style={isFullscreen ? { paddingLeft: 18, paddingRight: 22 } : undefined}
      className={[
        "vrx-submit-hero group relative flex items-center overflow-hidden rounded-[12px] text-white transition-transform",
        isFullscreen
          ? ["h-[42px] gap-[8px]", canSubmit ? s.submitEnabled : "vrx-submit-dim cursor-not-allowed", criticalBlock ? s.submitCritical : ""].filter(Boolean).join(" ")
          : [isUltraCompact ? s.submitBtnUltra : compactControls ? s.submitBtnCompact : s.submitBtnNormal,
            (submitProcessing || (!criticalBlock && micReady && (overlayHasTranscript || elapsedMs >= 2000))) ? s.submitEnabled : criticalBlock ? "vrx-submit-dim cursor-not-allowed opacity-40" : "vrx-submit-dim cursor-not-allowed"].join(" "),
      ].join(" ")}>
      <span className="vrx-submit-gradient absolute inset-0 rounded-[inherit]" aria-hidden />
      <span className={[s.submitTopSheen, "pointer-events-none absolute inset-x-0 top-0 h-[55%] rounded-[inherit]"].join(" ")} aria-hidden />
      {canSubmit && <span aria-hidden className="vrx-submit-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]" />}
      <span className={isFullscreen ? "relative z-[1] flex items-center gap-[8px]" : (isUltraCompact ? s.submitIconRowUltra : s.submitIconRow)}>
        {submitProcessing && !isFullscreen ? (
          <span className={s.submitSpinner} aria-hidden />
        ) : (
          <svg width={!isFullscreen && isUltraCompact ? 18 : !isFullscreen && compactControls ? 20 : 24}
            height={!isFullscreen && isUltraCompact ? 18 : !isFullscreen && compactControls ? 20 : 24}
            viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M20.46 6.17969L8.82003 17.8197L3.53003 12.5297" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className={[
          "font-semibold tracking-[0.2px]",
          !isFullscreen && (isUltraCompact ? s.submitLabelUltra : compactControls ? s.submitLabelCompact : s.submitLabelNormal),
          isFullscreen && "text-[14px]",
        ].filter(Boolean).join(" ")}>
          {submitProcessing && !isFullscreen ? "Processing" : "Submit"}
        </span>
      </span>
    </button>
  );

  const statusPill = (
    <div className={isFullscreen ? s.statusRow : s.statusPillRow}>
      <div
        className={[
          "vrx-status-card relative inline-flex items-center gap-[6px] rounded-t-[10px] rounded-b-none bg-white/60 backdrop-blur-[10px] transition-all duration-200",
          isFullscreen ? "gap-[8px] pl-[12px] pr-[14px] pt-[7px] pb-[10px] rounded-t-[12px]" : "pl-[10px] pr-[12px] pt-[4px] pb-[5px]",
          criticalBlock ? "vrx-status-card--error" : manualMute ? "vrx-status-card--paused" : "",
        ].filter(Boolean).join(" ")}
        role={!isFullscreen && micError ? "alert" : "status"}
        aria-live="polite">
        {criticalBlock ? (
          <span className={[s.statusIconError || "", "inline-flex h-[14px] w-[14px] items-center justify-center text-red-500"].join(" ")}>
            <AlertCircle size={14} strokeWidth={2.4} />
          </span>
        ) : isListening ? (
          <span className={["relative inline-flex items-center justify-center", isFullscreen ? "h-[10px] w-[10px]" : s.statusIconListening || "h-[10px] w-[10px]"].join(" ")}>
            <span className="absolute inset-0 rounded-full bg-rose-400" />
            <span className={["absolute inset-0 rounded-full bg-rose-400/55", s.recRingAnim || s.recRing].filter(Boolean).join(" ")} />
          </span>
        ) : manualMute ? (
          <span className={[isFullscreen ? "inline-flex h-[10px] w-[10px] items-center justify-center text-amber-500/80" : s.statusIconPaused || ""].join(" ")}>
            <svg width={7} height={9} viewBox="0 0 8 10" fill="none" aria-hidden>
              <rect x="0" y="0" width="3" height="10" rx="1" fill="currentColor" />
              <rect x="5" y="0" width="3" height="10" rx="1" fill="currentColor" />
            </svg>
          </span>
        ) : (
          <span className={s.statusDot} />
        )}
        <span className={[s.statusText || s.statusText, criticalBlock ? (s.statusTextError || "") : (s.statusTextNormal || "")].filter(Boolean).join(" ")}>
          {statusLabel}
          {!criticalBlock && shouldShowSectionLabel && (
            <span className={s.statusSection || s.statusElapsed || ""}>{" · "}{sectionLabel}</span>
          )}
          {!criticalBlock && (isListening || manualMute) && elapsedMs > 0 && (
            <span className={s.statusElapsed || s.elapsedInStatus || ""}>({formatElapsed(elapsedMs)})</span>
          )}
        </span>
      </div>
    </div>
  );

  const confirmDialog = (
    <TPConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Close this voice consultation?"
      warning="Are you sure you want to close this voice Rx? If you close it, no data will be stored."
      primaryLabel="Keep recording"
      onPrimary={() => setConfirmOpen(false)}
      secondaryLabel="Discard & Go Back"
      secondaryTone="destructive"
      onSecondary={handleCancelConfirm} />
  );

  // ── FULLSCREEN LAYOUT ────────────────────────────────────────────────────────

  if (isFullscreen) {
    return (
      <>
        {vadSilenceDetector}
        {rawAudioSilenceDetector}
        <div
          ref={rootRef}
          className={[fsStyles.root, !isPanelVisible && fsStyles.invisible].filter(Boolean).join(" ")}
          aria-hidden={!isPanelVisible}>

          <div className={fsStyles.bgTransparent} aria-hidden />

          <div
            className={["pointer-events-none", fsStyles.ambientFooterWash].join(" ")}
            aria-hidden
            style={{ opacity: "calc(0.78 + var(--vrx-live-level, 0) * 0.35)" }} />

          {/* Top bar */}
          <div className={[fsStyles.topBar, isCompactLayout ? fsStyles.topBarCompact : fsStyles.topBarNormal].join(" ")}>
            <span className={["vrx-mode-heading pointer-events-auto", fsStyles.modeHeadingChipIn].join(" ")}>
              <button
                type="button"
                onClick={navLocked ? undefined : handleRequestCancel}
                disabled={navLocked}
                aria-label="Go back"
                className={[fsStyles.backBtn, navLocked ? fsStyles.navBtnDisabled : ""].filter(Boolean).join(" ")}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className={[fsStyles.modeHeadingLabel, fsStyles.modeHeadingLabelText].join(" ")}>
                {mode === "ambient_consultation" ? "Conversation Mode" : "Dictation Mode"}
              </span>
            </span>

            <button
              type="button"
              onClick={navLocked ? undefined : onCollapse}
              disabled={navLocked}
              aria-label="Minimize agent"
              className={["vrx-agent-collapse-tag pointer-events-auto", fsStyles.collapseChipIn, navLocked ? fsStyles.navBtnDisabled : ""].filter(Boolean).join(" ")}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className={fsStyles.mainBody}>
            {bottomLoaderActive ? (
              <div className={[
                "vrx-transcript-zone-in",
                fsStyles.processingZone,
                isCompactLayout ? fsStyles.processingZoneCompact : fsStyles.processingZoneNormal,
                isHandoffExiting && "vrx-shiner-handoff-exit",
              ].filter(Boolean).join(" ")}>
                <VoiceTranscriptProcessingCard
                  mode={mode === "ambient_consultation" ? "ambient_consultation" : "dictation"}
                  transcript={processingTranscriptProp}
                  transcriptPending={!hasTranscriptContent(processingTranscriptProp)} />

                <div className={["vrx-shiner-loader", fsStyles.shinerLoader, isHandoffExiting && "vrx-bottom-loader--exit"].filter(Boolean).join(" ")}>
                  <CaptionCarousel />
                  <div className={fsStyles.progressTrack}>
                    <span aria-hidden className={["vrx-progress-fill", fsStyles.progressFill].join(" ")} />
                    <span aria-hidden className="vrx-progress-sheen absolute inset-y-0 left-0 block w-[40%] rounded-full" />
                  </div>
                </div>
              </div>
            ) : (
              <div className={[
                fsStyles.transcriptZone,
                isCompactLayout ? fsStyles.transcriptZoneCompact : fsStyles.transcriptZoneNormal,
                dockExiting && "vrx-transcript-zone--exit",
              ].filter(Boolean).join(" ")}>
                <div className={["pointer-events-none", fsStyles.transcriptFadeTop].join(" ")} aria-hidden />
                <div className={["pointer-events-none", fsStyles.transcriptFadeBottom].join(" ")} aria-hidden />

                {!criticalBlock || fsCaptionHasText ? (
                  <div
                    ref={transcriptScrollRef}
                    className={[
                      "vrx-scroll",
                      fsStyles.transcriptScrollBase,
                      criticalBlock && fsCaptionHasText ? fsStyles.transcriptBlurred : "",
                      isCompactLayout ? fsStyles.transcriptScrollCompact : fsStyles.transcriptScroll,
                    ].filter(Boolean).join(" ")}>
                    {fsCaptionHasText ? (
                      <AnimatedTranscript
                        text={effectiveFsTranscriptText}
                        paused={paused}
                        className={[fsStyles.transcriptText, isCompactLayout ? fsStyles.transcriptTextCompact : fsStyles.transcriptTextNormal].join(" ")} />
                    ) : (
                      <div className={["flex flex-col items-center justify-center text-center", fsStyles.placeholderIn].join(" ")}>
                        <p className={[fsStyles.placeholderText, isCompactLayout ? fsStyles.placeholderTextCompact : fsStyles.placeholderTextNormal].join(" ")}>
                          Start speaking, you&rsquo;ll see the caption here
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {criticalBlock && (
                  <div className={fsStyles.criticalOverlay} role="status" aria-live="polite">
                    <span className={fsStyles.emptyMark} aria-hidden>
                      <span className={fsStyles.emptyHalo1} />
                      <span className={fsStyles.emptyHalo2} />
                      <span className={fsStyles.emptyIconCircle}>{criticalBlock.icon}</span>
                    </span>
                    <h3 className={fsStyles.criticalTitle}>{criticalBlock.title}</h3>
                    <p className={[fsStyles.criticalDesc, isCompactLayout ? fsStyles.criticalDescCompact : fsStyles.criticalDescNormal].join(" ")}>
                      {criticalBlock.description}
                    </p>
                    {criticalBlock.kind === "mic" && (
                      <button type="button" onClick={handleAllowMicClick} className={fsStyles.retryMicBtn}>
                        <Mic size={14} strokeWidth={2.2} aria-hidden />
                        {criticalBlock.actionLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom zone */}
            {!bottomLoaderActive && (
              <div className={["vrx-bottom-block", fsStyles.bottomBlock, dockExiting && "vrx-bottom-block--exit"].filter(Boolean).join(" ")}>
                {!criticalBlock ? (
                  <div
                    className={fsStyles.waveformContainer}
                    style={{
                      "--vrx-waveform-margin-x": isCompactLayout ? "-16px" : "-22px",
                      "--vrx-waveform-margin-top": isCompactLayout ? "20px" : "28px",
                      "--vrx-waveform-margin-bottom": isCompactLayout ? "10px" : "14px",
                      "--vrx-waveform-width": isCompactLayout ? "calc(100% + 32px)" : "calc(100% + 44px)",
                    }}>
                    <VoiceRxSiriWaveform
                      stream={stream}
                      paused={paused || !waveformActive}
                      levelRef={levelRef}
                      className={["relative px-0", fsStyles.waveformOpacity, isCompactLayout ? fsStyles.waveformCompact : fsStyles.waveformNormal].join(" ")} />
                  </div>
                ) : (
                  <div className={fsStyles.errorSpacer} aria-hidden />
                )}

                <div className={[fsStyles.ctaRow, isCompactLayout ? fsStyles.ctaRowCompact : fsStyles.ctaRowNormal].join(" ")}>
                  {cancelBtn}
                  <span className="vrx-cta-divider" aria-hidden />
                  {micSegment}
                  <span className="vrx-cta-divider" aria-hidden />
                  {submitBtn}
                </div>

                {statusPill}
              </div>
            )}
          </div>

          {confirmDialog}
        </div>

      </>
    );
  }

  // ── OVERLAY LAYOUT ───────────────────────────────────────────────────────────

  // Show processing or error view when isAwaitingResponse or error
  const showProcessingView = isAwaitingResponse || !!processingError;

  const waveStrip = (
    <div className={[
      osStyles.waveStripWrap,
      variant === "stack" ? osStyles.waveStripStack
        : isUltraCompact ? osStyles.waveStripUltra
        : compactControls ? osStyles.waveStripCompact : osStyles.waveStripNormal,
    ].join(" ")}>
      <VoiceRxSiriWaveform className="absolute inset-0 h-full w-full" stream={stream} paused={paused || !waveformActive} levelRef={levelRef} />
      {paused && <div className={osStyles.waveStripPausedOverlay} />}
    </div>
  );

  const overlayTranscriptBlock = criticalBlock ? (
    variant === "stack" ? (
      <div className={osStyles.errorStackWrap} role="status" aria-live="polite">
        <div aria-hidden className={[osStyles.errorHaloOuter, osStyles.errorHaloOuterStack].join(" ")}>
          <span className={[osStyles.errorHaloInner, osStyles.errorHaloInnerStack].join(" ")} />
          <span className={osStyles.errorIcon}>{criticalBlock.icon}</span>
        </div>
        <h3 className={osStyles.errorTitleStack}>{criticalBlock.title}</h3>
        <p className={osStyles.errorDescStack}>{criticalBlock.description}</p>
        {criticalBlock.canRetry && (
          <button type="button" onClick={handleAllowMicClick} className={osStyles.retryBtn}>
            <Mic size={13} strokeWidth={2.2} aria-hidden />
            {criticalBlock.actionLabel}
          </button>
        )}
      </div>
    ) : (
      <div className={osStyles.errorRowWrap} role="status" aria-live="polite">
        <div aria-hidden className={[osStyles.errorHaloOuter, osStyles.errorHaloOuterRow].join(" ")}>
          <span className={[osStyles.errorHaloInner, osStyles.errorHaloInnerRow].join(" ")} />
          <span className={osStyles.errorIconRow}>{criticalBlock.icon}</span>
        </div>
        <h3 className={osStyles.errorTitleRow}>{criticalBlock.title}</h3>
        {criticalBlock.canRetry ? (
          <button type="button" onClick={handleAllowMicClick} className={osStyles.retryBtnRow}>
            <Mic size={11} strokeWidth={2.2} aria-hidden />
            {criticalBlock.actionLabel}
          </button>
        ) : (
          <p className={osStyles.errorDescRow}>{criticalBlock.description}</p>
        )}
      </div>
    )
  ) : (
    <div className={osStyles.transcriptWrap}>
      <div
        ref={transcriptScrollRef}
        className={[
          osStyles.transcriptScroll,
          variant === "stack" ? osStyles.transcriptScrollStack : osStyles.transcriptScrollRow,
        ].join(" ")}>
        {overlayHasTranscript ? (
          <AnimatedTranscriptPreview
            text={liveDisplayText}
            className={[
              osStyles.transcriptText,
              variant === "stack" ? osStyles.transcriptTextStack : osStyles.transcriptTextRow,
            ].join(" ")} />
        ) : (
          <p className={[
            osStyles.transcriptPlaceholder,
            variant === "stack" ? osStyles.transcriptPlaceholderStack : osStyles.transcriptPlaceholderRow,
          ].join(" ")}>
            Start speaking, you&apos;ll see the caption here
          </p>
        )}
      </div>
    </div>
  );

  const shouldHideOverlayMicControls = !isFullscreen && hideMicControlsWhenSubmitProcessing && submitProcessing;

  const overlayCTARow = (
    <div className={[
      osStyles.ctaRow,
      isUltraCompact ? osStyles.ctaRowUltra : compactControls ? osStyles.ctaRowCompact : osStyles.ctaRowNormal,
      shouldHideOverlayMicControls ? osStyles.ctaRowProcessing : "",
    ].join(" ")}>
      {cancelBtn}
      {!shouldHideOverlayMicControls ? (
        <>
          <span className={["vrx-cta-divider", compactControls ? osStyles.ctaDividerCompact : "", isUltraCompact ? osStyles.ctaDividerUltra : ""].filter(Boolean).join(" ")} aria-hidden />
          {micSegment}
          <span className={["vrx-cta-divider", compactControls ? osStyles.ctaDividerCompact : "", isUltraCompact ? osStyles.ctaDividerUltra : ""].filter(Boolean).join(" ")} aria-hidden />
        </>
      ) : null}
      {submitBtn}
    </div>
  );

  return (
    <div
      ref={rootRef}
      data-voice-allow
      className={[
        osStyles.recorderRoot,
        fillHeight ? osStyles.recorderFillHeight : "",
        radiusClassName,
        showProcessingView || variant !== "stack" ? osStyles.recorderBg : osStyles.recorderBgStack,
      ].filter(Boolean).join(" ")}>

      {vadSilenceDetector}
      {rawAudioSilenceDetector}

      {showProcessingView ? (
        <OverlayProcessingView
          processingTranscript={processingTranscriptProp}
          processingLabel={processingLabel} />
      ) : variant === "stack" ? (
        <>
          <div aria-hidden className={["pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden flex justify-center", osStyles.blobWrapperStack].join(" ")}>
            <div className={["tp-voice-blob tp-voice-blob--reactive h-[120px] w-[280px]", osStyles.blobMargin].join(" ")} />
          </div>
          <div className={[osStyles.stackContent, fillHeight ? osStyles.stackContentFill : ""].join(" ")}>
            {!hideCaptions ? (
              <div className={osStyles.stackTranscriptArea}>
                <div className={osStyles.stackTranscriptInner}>{overlayTranscriptBlock}</div>
              </div>
            ) : null}
            <div className={osStyles.stackWaveArea}>{waveStrip}</div>
            <div className={osStyles.stackCtaArea}>{overlayCTARow}</div>
          </div>
        </>
      ) : (
        <>
          <div aria-hidden className={[
            "pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden flex justify-center",
            isUltraCompact ? osStyles.blobWrapperRowUltra : osStyles.blobWrapperRow,
          ].join(" ")}>
            <div className={[
              "tp-voice-blob tp-voice-blob--reactive",
              isUltraCompact ? "h-[88px] w-[200px]" : "h-[104px] w-[240px]",
              osStyles.blobMargin,
            ].join(" ")} />
          </div>
          <div className={[osStyles.rowContent, isUltraCompact ? osStyles.rowContentUltra : osStyles.rowContentNormal].join(" ")}>
            {!hideCaptions ? (
              <>
                <div className={osStyles.rowTranscriptCol}>{overlayTranscriptBlock}</div>
                <div aria-hidden className={osStyles.rowDivider} />
              </>
            ) : null}
            <div className={osStyles.rowActionsCol}>
              {waveStrip}
              {overlayCTARow}
            </div>
          </div>
        </>
      )}

      {!showProcessingView && statusPill}
      {confirmDialog}
    </div>
  );
}
