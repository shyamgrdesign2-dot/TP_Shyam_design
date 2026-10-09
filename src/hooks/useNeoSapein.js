import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import { processNeoRecording, transcribeNeoChunk, fetchNeoConsentIp, buildNeoConsent } from "../api/services/ApiNeoSapien";
import { registerPairedDevice } from "../api/services/ApiNeoDevices";
import {
  NEO_WS_PHASE,
  addTodayCapturedExtraSeconds,
  clearStoredPairedDevice,
  clearTodayCapturedExtraSeconds,
  createNeoRecordingSession,
  createNewVoiceCorrelationId,
  extractDigitizeResult,
  getNeoDeviceHttpBase,
  getNeoRecordingFetchUrl,
  getNeoRecordingsListUrl,
  getNeoWsUrl,
  getOrCreateVoiceSessionId,
  getSessionTranscriptPayload,
  getStoredPairedDevice,
  getTodayCapturedExtraSeconds,
  isNeoDeviceConnected,
  mergeChunkTranscriptResponse,
  sessionHasTranscript,
  NEO_CHUNK_INTERVAL_MS,
  neoDebug,
  neoDebugError,
  neoDebugWarn,
  neoStatusStateToPhase,
  parseNeoBatteryFromMessage,
  setLastRecordingStartedAt,
  setStoredPairedDevice,
  wavBase64ToBlob,
} from "../utils/neoConsultationUtils";
import {
  createNeoFrontendChunkRecorder,
  extractGrowingWavDelta,
  fetchPartialDeviceRecording,
  splitWavBlobByDuration,
} from "../utils/neoFrontendChunkRecorder";

const RECONNECT_MS = 5000;
const CHUNK_WAIT_MS = 200;
const FINAL_CHUNK_WAIT_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const useNeoSapein = ({
  enabled = true,
  patientId = "",
  umId = "",
  voiceSessionId = "",
  authToken = "",
  portalBaseUrl = "",
  onConsultationReady,
}) => {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const processingRef = useRef(false);
  const wsMessageCountRef = useRef(0);
  const lastVadLogAtRef = useRef(0);
  const knownRecordingFilesRef = useRef(new Set());
  const recordingsPollInitializedRef = useRef(false);
  const pollFailCountRef = useRef(0);
  const helloReceivedRef = useRef(false);
  const bridgeSupportsRef = useRef(new Set());
  const openTimeoutRef = useRef(null);
  // Mirrors `phase` state in a ref so logPhase can read the current phase
  // without capturing it in its dep array (which would cascade through
  // handleRecordingFinished → pollRecordingsFromServer → useEffect,
  // causing the hook to unmount/remount on every phase change).
  const phaseRef = useRef(NEO_WS_PHASE.IDLE);
  // WS message dispatcher — connectNeo installs this once, but always
  // calls the latest handler closure via this ref.
  const wsMessageHandlerRef = useRef(null);
  // True only between an explicit startRecording() and the next
  // recording_finished event. Stops stray VAD-driven recording_finished
  // events from triggering an upload behind the user's back.
  const isRecordingRef = useRef(false);
  const manualStopRequestedRef = useRef(false);
  const lastPartialBlobSizeRef = useRef(0);
  const chunkTimerRef = useRef(null);
  const chunkUploadQueueRef = useRef(Promise.resolve());
  const recordingSessionRef = useRef(null);
  const frontendChunkRecorderRef = useRef(null);
  const devicePartialMissesRef = useRef(0);
  const ensureFrontendChunkRecordingRef = useRef(null);
  // Browser-mic ("record on this device") capture — independent of the BLE bridge.
  const localRecordingRef = useRef(false);
  const localStartedAtRef = useRef(0);

  const [phase, setPhase] = useState(NEO_WS_PHASE.IDLE);
  const [deviceStatus, setDeviceStatus] = useState("");
  const [deviceAddress, setDeviceAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [rms, setRms] = useState(0);
  const [rmsThreshold, setRmsThreshold] = useState(1000);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [serverConfig, setServerConfig] = useState(null);
  const [consultationResult, setConsultationResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [pairedDevice, setPairedDevice] = useState(() => getStoredPairedDevice());
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [isPairing, setIsPairing] = useState(false);
  const [pairingError, setPairingError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLocalRecording, setIsLocalRecording] = useState(false);
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const [isTranscribingChunk, setIsTranscribingChunk] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [todayCapturedExtraSeconds, setTodayCapturedExtraSeconds] = useState(
    () => getTodayCapturedExtraSeconds()
  );
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [recordingConversation, setRecordingConversation] = useState([]);
  const chunkErrorNotifiedRef = useRef(false);
  const batteryStatusPullRef = useRef(false);
  const [deviceTelemetry, setDeviceTelemetry] = useState({
    batteryMv: null,
    batteryPercent: null,
    rssi: null,
    isCharging: false,
  });

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Keep phaseRef in sync so logPhase can log the "from" value without
  // depending on phase state (which would cause cascading useCallback
  // invalidations all the way up to the connection useEffect).
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const logPhase = useCallback((label, nextPhase, extra = {}) => {
    neoDebug(`[phase] ${label}`, { from: phaseRef.current, to: nextPhase, ...extra });
  }, []); // stable — reads phase via ref, never re-creates

  const sendWsCommand = useCallback((payload) => {
    const ws = wsRef.current;
    const readyState = ws?.readyState;
    neoDebug("[ws] send command", { payload, readyState });
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      neoDebugWarn("[ws] send skipped — socket not open", { readyState });
    }
  }, []);

  const stopChunkTimer = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }, []);

  const resetRecordingSession = useCallback(() => {
    const sessionId = createNewVoiceCorrelationId();
    recordingSessionRef.current = createNeoRecordingSession(sessionId);
    window.__TATVA_VOICE_SESSION_ID = sessionId;
    const startedAt = Date.now();
    setRecordingStartedAt(startedAt);
    setLastRecordingStartedAt(startedAt);
    setRecordingTranscript("");
    setRecordingConversation([]);
    chunkErrorNotifiedRef.current = false;
    chunkUploadQueueRef.current = Promise.resolve();
    lastPartialBlobSizeRef.current = 0;
    devicePartialMissesRef.current = 0;
  }, []);

  const clearTodayCapturedExtra = useCallback(() => {
    clearTodayCapturedExtraSeconds();
    setTodayCapturedExtraSeconds(0);
  }, []);

  const clearRecordingStartedAt = useCallback(() => {
    setRecordingStartedAt(null);
  }, []);

  const clearBatteryTelemetry = useCallback(() => {
    batteryStatusPullRef.current = false;
    setDeviceTelemetry((prev) => ({
      ...prev,
      batteryPercent: null,
      batteryMv: null,
      isCharging: false,
    }));
  }, []);

  const updateDeviceTelemetry = useCallback((msg = {}) => {
    const { batteryPct, isCharging, batteryMv } = parseNeoBatteryFromMessage(msg);

    setDeviceTelemetry((prev) => ({
      batteryMv: batteryMv ?? prev.batteryMv,
      batteryPercent: typeof batteryPct === "number" ? batteryPct : prev.batteryPercent,
      rssi: msg.rssi ?? prev.rssi,
      isCharging: isCharging != null ? isCharging : prev.isCharging,
    }));

    if (typeof batteryPct === "number") {
      neoDebug("[battery] updated from WS", {
        battery_pct: batteryPct,
        is_charging: isCharging,
        battery_mv: batteryMv,
      });
      setPairedDevice((current) => {
        if (!current) return current;
        const next = {
          ...current,
          batteryPercent: batteryPct,
          ...(batteryMv != null ? { batteryMv } : {}),
        };
        setStoredPairedDevice(next);
        return next;
      });
    } else if (msg.rssi != null) {
      setPairedDevice((current) => {
        if (!current) return current;
        const next = { ...current, rssi: msg.rssi };
        setStoredPairedDevice(next);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!pairedDevice) return;
    updateDeviceTelemetry({
      rssi: pairedDevice.rssi,
      battery_pct: pairedDevice.batteryPercent,
      battery_mv: pairedDevice.batteryMv,
    });
  }, [pairedDevice, updateDeviceTelemetry]);

  const transcribeChunkBlobInner = useCallback(
    async (blob, meta = {}) => {
      const session = recordingSessionRef.current;
      if (!blob || blob.size === 0) {
        return null;
      }
      if (!session) {
        neoDebugWarn("[chunk] no active session — skipping transcribe");
        return null;
      }

      session.chunkInFlight = true;
      setIsTranscribingChunk(true);

      try {
        neoDebug("[chunk] transcribing", {
          chunkIndex: session.chunkIndex,
          size: blob.size,
          isFinal: meta.isFinal,
          ...meta,
        });
        // eslint-disable-next-line no-console
        console.log(
          `%c[NEO chunk]%c POST transcribe-chunk #${session.chunkIndex} (${blob.size} bytes, session=${session.sessionId?.slice(0, 8)}…)`,
          "background:#0d9488;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
          "color:#0d9488"
        );

        const response = await transcribeNeoChunk(blob, {
          sessionId: session.sessionId,
          chunkIndex: session.chunkIndex,
          fileName: meta.fileName || `neo-chunk-${String(session.chunkIndex).padStart(6, "0")}.webm`,
        });

        const merged = mergeChunkTranscriptResponse(session, response);
        recordingSessionRef.current = {
          ...session,
          ...merged,
        };
        setRecordingTranscript(merged.transcription || "");
        setRecordingConversation(merged.conversation || []);

        neoDebug("[chunk] transcript merged", {
          chunkIndex: merged.chunkIndex,
          lines: merged.conversation?.length,
          transcriptionLen: merged.transcription?.length,
          preview: merged.transcription?.slice(0, 120),
        });

        return merged;
      } catch (err) {
        neoDebugError("[chunk] transcribe failed", err);
        const errText = err?.message || "Transcribe-chunk failed";
        if (!meta.silent && !chunkErrorNotifiedRef.current) {
          chunkErrorNotifiedRef.current = true;
          message.error(errText);
        }
        return null;
      } finally {
        setIsTranscribingChunk(false);
        if (recordingSessionRef.current) {
          recordingSessionRef.current.chunkInFlight = false;
        }
      }
    },
    []
  );

  const transcribeChunkBlob = useCallback(
    (blob, meta = {}) => {
      if (!blob || blob.size === 0) {
        return Promise.resolve(null);
      }

      const task = chunkUploadQueueRef.current
        .then(() => transcribeChunkBlobInner(blob, meta))
        .catch((err) => {
          neoDebugError("[chunk] queued transcribe failed", err);
          return null;
        });
      chunkUploadQueueRef.current = task;
      return task;
    },
    [transcribeChunkBlobInner]
  );

  const drainChunkUploadQueue = useCallback(async () => {
    try {
      await chunkUploadQueueRef.current;
    } catch {
      /* individual chunk errors are handled in transcribeChunkBlobInner */
    }
  }, []);

  const waitForChunkTranscription = useCallback(async () => {
    await drainChunkUploadQueue();
    let attempts = 0;
    while (recordingSessionRef.current?.chunkInFlight && attempts < 60) {
      await sleep(CHUNK_WAIT_MS);
      attempts += 1;
    }
    await drainChunkUploadQueue();
  }, [drainChunkUploadQueue]);

  const bridgeSupportsAction = useCallback(
    (action) => bridgeSupportsRef.current.has(action),
    []
  );

  const requestRecordingChunk = useCallback((options = {}) => {
    const session = recordingSessionRef.current;
    const allowAfterStop = options.allowAfterStop === true;
    if (!session) return false;
    if (!allowAfterStop && !isRecordingRef.current) return false;
    if (!bridgeSupportsAction("get_recording_chunk")) {
      neoDebug("[chunk] bridge does not support get_recording_chunk — skipping WS chunk");
      return false;
    }
    sendWsCommand({
      action: "get_recording_chunk",
      chunk_index: session.chunkIndex,
    });
    return true;
  }, [bridgeSupportsAction, sendWsCommand]);

  const stopFrontendChunkRecording = useCallback(async () => {
    const recorder = frontendChunkRecorderRef.current;
    frontendChunkRecorderRef.current = null;
    if (!recorder) return;
    try {
      await recorder.stop({ flushFinal: true });
    } catch (err) {
      neoDebugWarn("[frontend-chunk] stop failed", err);
    }
  }, []);

  const shouldFinalizeRecording = useCallback((msg = {}) => {
    if (manualStopRequestedRef.current) return true;
    const reason = msg.reason || "";
    return (
      reason === "manual"
      || reason === "device_tap"
      || reason === "max_length"
      || reason === "poll_fallback"
      || reason === "disconnect"
    );
  }, []);

  const pollDeviceRecordingDelta = useCallback(async () => {
    const partial = await fetchPartialDeviceRecording({ liveOnly: true });
    if (!partial?.blob) {
      return null;
    }

    const previousSize = lastPartialBlobSizeRef.current;
    const deltaBlob = await extractGrowingWavDelta(partial.blob, previousSize);
    if (!deltaBlob) {
      neoDebug("[chunk] device partial unchanged", {
        url: partial.url,
        size: partial.blob.size,
        previousSize,
      });
      return null;
    }

    lastPartialBlobSizeRef.current = partial.blob.size;
    return { deltaBlob, url: partial.url, totalSize: partial.blob.size };
  }, []);

  const startDeviceChunkFallback = useCallback(() => {
    stopChunkTimer();
    chunkTimerRef.current = setInterval(async () => {
      if (!isRecordingRef.current) return;

      const tickStartedAt = Date.now();
      const elapsedSinceStart = recordingSessionRef.current?.recordingStartedAt
        ? Math.round((tickStartedAt - recordingSessionRef.current.recordingStartedAt) / 1000)
        : null;
      const chunkIndex = recordingSessionRef.current?.chunkIndex;

      if (bridgeSupportsAction("get_recording_chunk")) {
        // eslint-disable-next-line no-console
        console.log(
          `%c[NEO chunk tick]%c 60s — WS get_recording_chunk`,
          "background:#2563eb;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
          "color:#2563eb",
          { elapsedSinceStart, chunkIndex }
        );
        requestRecordingChunk();
        return;
      }

      // eslint-disable-next-line no-console
      console.log(
        `%c[NEO chunk tick]%c 60s — poll recordings/current.wav delta`,
        "background:#2563eb;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
        "color:#2563eb",
        { elapsedSinceStart, chunkIndex }
      );

      try {
        const delta = await pollDeviceRecordingDelta();
        if (!delta?.deltaBlob) {
          devicePartialMissesRef.current += 1;
          // eslint-disable-next-line no-console
          console.warn("[NEO chunk tick] no new device audio yet", {
            elapsedSinceStart,
            misses: devicePartialMissesRef.current,
          });
          if (
            devicePartialMissesRef.current >= 2
            && !frontendChunkRecorderRef.current?.isActive?.()
          ) {
            neoDebugWarn(
              "[chunk] device partial unavailable — falling back to browser mic chunks"
            );
            ensureFrontendChunkRecordingRef.current?.();
          }
          return;
        }

        devicePartialMissesRef.current = 0;

        // eslint-disable-next-line no-console
        console.log(
          `%c[NEO chunk segment]%c ${delta.url} +${delta.deltaBlob.size} bytes (total ${delta.totalSize})`,
          "background:#0d9488;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
          "color:#0d9488"
        );

        await transcribeChunkBlob(delta.deltaBlob, {
          source: "device-partial",
          fileName: `neo-device-partial-${Date.now()}.wav`,
          silent: true,
        });
      } catch (partialErr) {
        neoDebugWarn("[chunk] device partial fetch failed", partialErr);
        // eslint-disable-next-line no-console
        console.warn("[NEO chunk tick] partial fetch/transcribe failed", partialErr);
      }
    }, NEO_CHUNK_INTERVAL_MS);
  }, [
    bridgeSupportsAction,
    pollDeviceRecordingDelta,
    requestRecordingChunk,
    stopChunkTimer,
    transcribeChunkBlob,
  ]);

  const isChunkPipelineActive = useCallback(
    () => Boolean(chunkTimerRef.current) || frontendChunkRecorderRef.current?.isActive?.(),
    []
  );

  const ensureFrontendChunkRecording = useCallback(async () => {
    if (frontendChunkRecorderRef.current?.isActive?.()) {
      return;
    }

    const recorder = createNeoFrontendChunkRecorder({
      intervalMs: NEO_CHUNK_INTERVAL_MS,
      onChunk: async (blob, chunkIndex) => {
        await transcribeChunkBlob(blob, {
          fileName: `neo-frontend-chunk-${chunkIndex}.webm`,
          source: "frontend",
        });
      },
      onError: (err) => {
        neoDebugWarn("[frontend-chunk] recorder error", err);
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          message.warning(
            "Microphone access denied — using device audio chunks for transcription instead"
          );
          startDeviceChunkFallback();
        }
      },
    });

    frontendChunkRecorderRef.current = recorder;
    try {
      await recorder.start();
      neoDebug("[frontend-chunk] browser recorder active — 60s chunks → transcribe-chunk");
    } catch (err) {
      frontendChunkRecorderRef.current = null;
      neoDebugWarn("[frontend-chunk] mic unavailable — falling back to device chunks", err);
      startDeviceChunkFallback();
    }
  }, [startDeviceChunkFallback, transcribeChunkBlob]);
  ensureFrontendChunkRecordingRef.current = ensureFrontendChunkRecording;

  const startChunkTimer = useCallback(() => {
    const wsOpen = wsRef.current?.readyState === WebSocket.OPEN;
    if (wsOpen) {
      neoDebug("[chunk] using device audio polling (Neo pendant / BLE bridge)");
      startDeviceChunkFallback();
      if (!bridgeSupportsAction("get_recording_chunk")) {
        neoDebug(
          "[chunk] bridge has no live device chunks — parallel browser mic for transcribe-chunk"
        );
        ensureFrontendChunkRecording();
      }
      return;
    }
    ensureFrontendChunkRecording();
  }, [
    bridgeSupportsAction,
    ensureFrontendChunkRecording,
    startDeviceChunkFallback,
  ]);

  /** Start session + 60s transcribe-chunk pipeline when recording becomes active. */
  const activateRecordingPipeline = useCallback(
    (source = "unknown") => {
      if (!recordingSessionRef.current) {
        resetRecordingSession();
      }
      if (isChunkPipelineActive()) {
        neoDebug("[chunk pipeline] already active", { source });
        return;
      }
      // eslint-disable-next-line no-console
      console.log(
        `%c[NEO chunk pipeline]%c START (${source}) — transcribe-chunk every ${NEO_CHUNK_INTERVAL_MS / 1000}s`,
        "background:#2563eb;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
        "color:#2563eb",
        { sessionId: recordingSessionRef.current?.sessionId }
      );
      startChunkTimer();
    },
    [isChunkPipelineActive, resetRecordingSession, startChunkTimer]
  );

  /** Ensure transcript exists before voice create — flush tail + drain all 60s chunks. */
  const finalizeRecordingTranscript = useCallback(
    async (audioBlob, durationSeconds) => {
      stopChunkTimer();
      await stopFrontendChunkRecording();

      if (requestRecordingChunk({ allowAfterStop: true })) {
        await sleep(FINAL_CHUNK_WAIT_MS);
        await waitForChunkTranscription();
      }

      let session = recordingSessionRef.current;
      if (!session) {
        const sessionId = voiceSessionId || getOrCreateVoiceSessionId();
        session = createNeoRecordingSession(sessionId);
        recordingSessionRef.current = session;
      }

      if (!sessionHasTranscript(session) && audioBlob?.size) {
        const segmentDurationSec = NEO_CHUNK_INTERVAL_MS / 1000;
        const segments = await splitWavBlobByDuration(audioBlob, segmentDurationSec);
        if (segments.length > 1) {
          neoDebug("[finalize] splitting full recording into timed chunks", {
            segments: segments.length,
            segmentDurationSec,
          });
          for (let i = 0; i < segments.length; i += 1) {
            await transcribeChunkBlob(segments[i], {
              isFinal: i === segments.length - 1,
              force: true,
              fileName: `neo-segment-${i}-${Date.now()}.wav`,
              silent: i < segments.length - 1,
            });
          }
        } else {
          neoDebug("[finalize] no chunk transcript yet — transcribing full recording");
          await transcribeChunkBlob(audioBlob, {
            isFinal: true,
            force: true,
            fileName: `neo-final-${Date.now()}.${audioBlob.type?.includes("wav") ? "wav" : "webm"}`,
          });
        }
        await waitForChunkTranscription();
      } else if (audioBlob?.size) {
        const tailDelta = await extractGrowingWavDelta(
          audioBlob,
          lastPartialBlobSizeRef.current
        );
        if (tailDelta) {
          neoDebug("[finalize] transcribing recording tail from final WAV", {
            tailBytes: tailDelta.size,
            durationSeconds,
          });
          await transcribeChunkBlob(tailDelta, {
            isFinal: true,
            force: true,
            fileName: `neo-tail-${Date.now()}.wav`,
            silent: true,
          });
          await waitForChunkTranscription();
        } else {
          const duration = Number(durationSeconds) || 0;
          const hasRemainder = duration > 0 && duration % (NEO_CHUNK_INTERVAL_MS / 1000) > 1;
          if (hasRemainder && requestRecordingChunk({ allowAfterStop: true })) {
            neoDebug("[finalize] requesting final WS chunk for recording tail", { duration });
            await sleep(FINAL_CHUNK_WAIT_MS);
            await waitForChunkTranscription();
          }
        }
      }

      session = recordingSessionRef.current || session;
      const payload = getSessionTranscriptPayload(session);
      neoDebug("[finalize] ready for voice create", {
        transcriptionLen: payload.transcription.length,
        conversationLines: payload.conversation.length,
        sessionId: session.sessionId,
      });

      return {
        sessionId: session.sessionId,
        ...payload,
      };
    },
    [
      requestRecordingChunk,
      stopChunkTimer,
      stopFrontendChunkRecording,
      transcribeChunkBlob,
      voiceSessionId,
      waitForChunkTranscription,
    ]
  );

  const blobFromWsAudio = useCallback((msg) => {
    if (msg.wav_base64) {
      return wavBase64ToBlob(msg.wav_base64, msg.mime_type || "audio/wav");
    }
    if (msg.audio_base64) {
      return wavBase64ToBlob(msg.audio_base64, msg.mime_type || "audio/webm");
    }
    return null;
  }, []);

  const handleRecordingChunk = useCallback(
    async (msg) => {
      let blob = blobFromWsAudio(msg);
      if (!blob && msg.file_url) {
        try {
          const url = getNeoRecordingFetchUrl(msg.file_url);
          const res = await fetch(url);
          if (res.ok) blob = await res.blob();
        } catch (fetchErr) {
          neoDebugError("[chunk] fetch failed", fetchErr);
        }
      }
      if (blob) {
        await transcribeChunkBlob(blob, msg);
      }
    },
    [blobFromWsAudio, transcribeChunkBlob]
  );

  const requestBleConnect = useCallback(() => {
    setErrorMessage("");
    sendWsCommand({ action: "connect", scan: true });
  }, [sendWsCommand]);

  const connectSavedDevice = useCallback(
    (address) => {
      const targetAddress = address || pairedDevice?.address;
      if (!targetAddress) {
        setPairingError("No paired device — scan first");
        return;
      }
      setPairingError("");
      setErrorMessage("");
      setPhase(NEO_WS_PHASE.CONNECTING);
      sendWsCommand({ action: "connect", address: targetAddress, scan: false });
    },
    [pairedDevice, sendWsCommand]
  );

  // Toggle the BLE link only. Does NOT touch recording — if a recording is
  // active when the user disconnects the device, it is abandoned (no upload).
  const disconnectBleOnly = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    stopChunkTimer();
    stopFrontendChunkRecording();
    clearBatteryTelemetry();
    sendWsCommand({ action: "disconnect" });
  }, [clearBatteryTelemetry, sendWsCommand, stopChunkTimer, stopFrontendChunkRecording]);

  // Explicit user-initiated recording controls (manual mode).
  const startRecording = useCallback(() => {
    if (isRecordingRef.current) return;
    manualStopRequestedRef.current = false;
    resetRecordingSession();
    isRecordingRef.current = true;
    setIsRecording(true);
    setErrorMessage("");
    sendWsCommand({ action: "start_recording" });
    activateRecordingPipeline("ui-start");
  }, [activateRecordingPipeline, resetRecordingSession, sendWsCommand]);

  // Sends stop_recording → bridge emits recording_finished → digitize + upload.
  // Chunk timer keeps running until finalizeRecordingTranscript (recording_finished).
  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    manualStopRequestedRef.current = true;
    // eslint-disable-next-line no-console
    console.log(
      `%c[NEO stop]%c user requested stop — will finalize on recording_finished`,
      "background:#dc2626;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
      "color:#dc2626"
    );
    sendWsCommand({ action: "stop_recording" });
  }, [sendWsCommand]);

  // "Record on this device" — capture from the browser microphone instead of
  // the BLE pendant. Kept independent of `phase`/`isRecording` (which track the
  // pendant link) but reuses the same transcribe-chunk → digitize pipeline, so
  // the resulting consultation is identical to a pendant capture.
  const startLocalRecording = useCallback(async () => {
    if (localRecordingRef.current || processingRef.current) return;
    if (!navigator?.mediaDevices?.getUserMedia) {
      const errText = "Microphone capture is not supported in this browser";
      setErrorMessage(errText);
      message.error(errText);
      return;
    }

    setErrorMessage("");
    resetRecordingSession();
    localRecordingRef.current = true;
    localStartedAtRef.current = Date.now();
    setIsLocalRecording(true);

    const recorder = createNeoFrontendChunkRecorder({
      intervalMs: NEO_CHUNK_INTERVAL_MS,
      onChunk: async (blob, chunkIndex) => {
        await transcribeChunkBlob(blob, {
          fileName: `neo-device-chunk-${chunkIndex}.webm`,
          source: "device-mic",
        });
      },
      onError: (err) => {
        neoDebugWarn("[device-mic] recorder error", err);
      },
    });
    frontendChunkRecorderRef.current = recorder;

    try {
      await recorder.start();
      neoDebug("[device-mic] browser recording active — 60s chunks → transcribe-chunk");
    } catch (err) {
      frontendChunkRecorderRef.current = null;
      localRecordingRef.current = false;
      localStartedAtRef.current = 0;
      setIsLocalRecording(false);
      clearRecordingStartedAt();
      const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      const errText = denied
        ? "Microphone access denied — allow it to record on this device"
        : "Microphone unavailable";
      setErrorMessage(errText);
      message.error(errText);
    }
  }, [clearRecordingStartedAt, resetRecordingSession, transcribeChunkBlob]);

  const stopLocalRecording = useCallback(async () => {
    if (!localRecordingRef.current || processingRef.current) return;

    localRecordingRef.current = false;
    processingRef.current = true;
    setIsLocalRecording(false);
    setIsLocalProcessing(true);

    const durationSeconds = localStartedAtRef.current
      ? Math.round((Date.now() - localStartedAtRef.current) / 1000)
      : 0;
    localStartedAtRef.current = 0;

    try {
      let consent = buildNeoConsent();
      try {
        const ip = await fetchNeoConsentIp();
        consent = buildNeoConsent(ip);
      } catch {
        /* optional */
      }

      const { conversation, transcription, sessionId } =
        await finalizeRecordingTranscript(null, durationSeconds);

      if (!transcription?.trim() && !conversation?.length) {
        throw new Error(
          "No transcript captured from the device microphone. Please try again."
        );
      }

      clearRecordingStartedAt();

      const { digitizeResponse, prescriptionUrl, sourceDuration, correlationId } =
        await processNeoRecording({
          sessionId,
          transcription,
          conversation,
          sourceDuration: durationSeconds,
          consent,
          fileName: `neo-device-${Date.now()}.webm`,
        });

      const capturedSeconds = Math.round(Number(sourceDuration) || durationSeconds || 0);
      if (capturedSeconds > 0) {
        addTodayCapturedExtraSeconds(capturedSeconds);
        setTodayCapturedExtraSeconds(getTodayCapturedExtraSeconds());
      }

      const parsed = extractDigitizeResult(digitizeResponse);
      const result = {
        ...parsed,
        prescriptionUrl,
        sourceDuration,
        correlationId,
        recordingSource: "device-mic",
        processedAt: Date.now(),
      };

      setConsultationResult(result);
      setIsModalOpen(true);
      onConsultationReady?.(result);
    } catch (err) {
      neoDebugError("[device-mic] processing failed", { message: err?.message });
      setErrorMessage(err?.message || "Failed to process device recording");
      message.error(err?.message || "Failed to process device recording");
    } finally {
      processingRef.current = false;
      setIsLocalProcessing(false);
      clearRecordingStartedAt();
    }
  }, [
    clearRecordingStartedAt,
    finalizeRecordingTranscript,
    onConsultationReady,
  ]);

  const scanForDevices = useCallback(
    (timeout = 6) => {
      setPairingError("");
      setScanResults([]);
      setIsScanning(true);
      sendWsCommand({ action: "scan", timeout });
    },
    [sendWsCommand]
  );

  const pairDevice = useCallback(
    (device) => {
      if (!device?.address) return;
      setPairingError("");
      setIsPairing(true);
      setPhase(NEO_WS_PHASE.PAIRING);
      sendWsCommand({
        action: "pair_device",
        address: device.address,
        name: device.name || "Neo",
      });
    },
    [sendWsCommand]
  );

  const unpairDevice = useCallback(() => {
    sendWsCommand({ action: "unpair_device" });
  }, [sendWsCommand]);

  const forgetDevice = useCallback(() => {
    sendWsCommand({ action: "forget_device" });
    setPairedDevice(null);
    clearStoredPairedDevice();
  }, [sendWsCommand]);

  // Toggle-ON handler in the modal: bring up the BLE link, nothing more.
  // Recording is a separate user action via startRecording() on the card.
  const connectDevice = useCallback(
    (device) => {
      const targetAddress = device?.address || pairedDevice?.address;
      if (targetAddress && pairedDevice?.address === targetAddress) {
        connectSavedDevice(targetAddress);
      } else if (device) {
        pairDevice(device);
      } else {
        connectSavedDevice();
      }
    },
    [pairedDevice, connectSavedDevice, pairDevice]
  );

  const registerWithBridge = useCallback(() => {
    if (!umId) return;
    sendWsCommand({
      action: "register",
      user_id: String(umId),
      auth_token: authToken || "",
      portal_base_url: portalBaseUrl || "",
    });
  }, [sendWsCommand, umId, authToken, portalBaseUrl]);

  const fetchRecordingBlob = useCallback(async (msg) => {
    neoDebug("[audio] fetchRecordingBlob start", {
      hasFileUrl: !!msg.file_url,
      file_url: msg.file_url,
      hasWavBase64: !!msg.wav_base64,
      filename: msg.filename,
      duration_s: msg.duration_s,
      size_bytes: msg.size_bytes,
    });

    if (msg.wav_base64) {
      neoDebug("[audio] using wav_base64 from WS message", {
        base64Length: msg.wav_base64.length,
      });
      const blob = wavBase64ToBlob(msg.wav_base64);
      neoDebug("[audio] blob from base64", { size: blob.size, type: blob.type });
      return blob;
    }

    if (msg.file_url) {
      const url = getNeoRecordingFetchUrl(msg.file_url);
      neoDebug("[audio] fetching WAV from HTTP", {
        file_url: msg.file_url,
        resolvedUrl: url,
        neoDeviceHttp: getNeoDeviceHttpBase(),
      });
      try {
        const resp = await fetch(url);
        neoDebug("[audio] fetch response", {
          ok: resp.ok,
          status: resp.status,
          statusText: resp.statusText,
          contentType: resp.headers.get("content-type"),
        });
        if (!resp.ok) {
          neoDebugError("[audio] fetch FAILED — audio saved on backend but HTTP fetch failed", {
            url,
            status: resp.status,
            hint: "Check setupProxy /recordings → localhost:3021 or :8081",
          });
          throw new Error(`Failed to fetch recording (${resp.status}) from ${url}`);
        }
        const blob = await resp.blob();
        neoDebug("[audio] blob from HTTP", { size: blob.size, type: blob.type });
        if (blob.size === 0) {
          neoDebugError("[audio] fetched blob is EMPTY", { url });
          throw new Error("Downloaded recording is empty");
        }
        return blob;
      } catch (fetchErr) {
        neoDebugError("[audio] fetch exception", fetchErr);
        throw fetchErr;
      }
    }

    neoDebugError("[audio] NO AUDIO in WS message — recording_finished without file_url or wav_base64", msg);
    throw new Error("No recording data received from Neo device (no file_url, no wav_base64)");
  }, []);

  const handleUnsolicitedSegmentFinished = useCallback(
    async (msg) => {
      // eslint-disable-next-line no-console
      console.log(
        `%c[NEO chunk segment]%c recording_finished without user stop — transcribe only, keep recording`,
        "background:#7c3aed;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
        "color:#7c3aed",
        {
          reason: msg.reason,
          duration_s: msg.duration_s,
          chunkPipelineActive: isChunkPipelineActive(),
        }
      );

      try {
        const audioBlob = await fetchRecordingBlob(msg);
        if (audioBlob?.size) {
          await transcribeChunkBlob(audioBlob, {
            source: "segment-finished",
            silent: true,
            fileName: msg.filename || `neo-segment-${Date.now()}.wav`,
          });
          await waitForChunkTranscription();
        }
      } catch (err) {
        neoDebugWarn("[chunk segment] transcribe failed", err);
      }

      isRecordingRef.current = true;
      setIsRecording(true);
      setPhase((prev) =>
        prev === NEO_WS_PHASE.PROCESSING || prev === NEO_WS_PHASE.READY
          ? prev
          : NEO_WS_PHASE.RECORDING
      );

      if (!isChunkPipelineActive()) {
        startChunkTimer();
      }

      sendWsCommand({ action: "start_recording" });
    },
    [
      fetchRecordingBlob,
      isChunkPipelineActive,
      sendWsCommand,
      startChunkTimer,
      transcribeChunkBlob,
      waitForChunkTranscription,
    ]
  );

  const handleRecordingFinished = useCallback(
    async (msg) => {
      neoDebug("[recording_finished] handler called", {
        filename: msg.filename,
        file_url: msg.file_url,
        duration_s: msg.duration_s,
        reason: msg.reason,
        wasManual: isRecordingRef.current,
        manualStopRequested: manualStopRequestedRef.current,
        shouldFinalize: shouldFinalizeRecording(msg),
      });

      if (isRecordingRef.current && !shouldFinalizeRecording(msg)) {
        await handleUnsolicitedSegmentFinished(msg);
        return;
      }

      // Accept the event for any explicit trigger:
      //  - manual:       UI Start/Stop button
      //  - device_tap:   user double-tapped the Neo
      //  - max_length:   bridge auto-flushed at the 5-min memory cap
      //  - poll_fallback: a stored recording recovered by the listing poll
      const explicitTrigger =
        msg.reason === "manual" ||
        msg.reason === "device_tap" ||
        msg.reason === "max_length" ||
        msg.reason === "poll_fallback";
      // 🚨 Loud console for debugging
      // eslint-disable-next-line no-console
      console.log(
        `%c[NEO recording_finished]%c reason=${msg.reason || "(none)"} ${msg.reason === "device_tap" ? "🟢 DEVICE DOUBLE-TAP STOP" : ""}`,
        "background:#dc2626;color:#fff;padding:3px 8px;border-radius:3px;font-weight:bold;font-size:13px",
        "color:#dc2626;font-weight:bold",
        {
          isRecordingRefCurrent: isRecordingRef.current,
          explicitTrigger,
          willProcess: isRecordingRef.current || explicitTrigger,
        }
      );
      if (!isRecordingRef.current && !explicitTrigger) {
        // eslint-disable-next-line no-console
        console.warn("[NEO] ❌ recording_finished IGNORED — no active recording + reason not whitelisted", msg);
        neoDebugWarn("[recording_finished] ignored — no manual recording active", {
          reason: msg.reason,
        });
        return;
      }
      manualStopRequestedRef.current = false;
      isRecordingRef.current = false;
      setIsRecording(false);

      if (msg.reason === "device_tap") {
        message.info("Recording stopped from Neo (double-tap)");
      } else if (msg.reason === "max_length") {
        message.warning("Recording auto-stopped after 5 minutes (memory cap)");
      }

      if (processingRef.current) {
        neoDebugWarn("[recording_finished] SKIPPED — already processing another recording");
        return;
      }

      processingRef.current = true;
      setPhase(NEO_WS_PHASE.PROCESSING);
      setIsSpeaking(false);
      logPhase("recording_finished → processing", NEO_WS_PHASE.PROCESSING);

      try {
        const audioBlob = await fetchRecordingBlob(msg);
        const durationFromServer =
          typeof msg.duration_s === "number" && msg.duration_s > 0
            ? msg.duration_s
            : undefined;

        neoDebug("[digitize] starting processNeoRecording", {
          blobSize: audioBlob.size,
          durationFromServer,
          patientId,
          umId,
        });

        let consent = buildNeoConsent();
        try {
          const ip = await fetchNeoConsentIp();
          consent = buildNeoConsent(ip);
        } catch {
          /* optional */
        }

        stopChunkTimer();

        const finalized = await finalizeRecordingTranscript(audioBlob, durationFromServer);
        const { conversation, transcription, sessionId } = finalized;

        if (!transcription?.trim() && !conversation?.length) {
          throw new Error(
            "No transcript captured. Transcribe-chunk must succeed before voice create."
          );
        }

        neoDebug("[digitize] calling voice create with accumulated transcript", {
          transcriptionLen: transcription.length,
          conversationLines: conversation.length,
          sessionId,
        });

        recordingSessionRef.current = null;
        clearRecordingStartedAt();

        const { digitizeResponse, prescriptionUrl, sourceDuration, correlationId } =
          await processNeoRecording({
            audioBlob,
            sessionId,
            transcription,
            conversation,
            sourceDuration: durationFromServer,
            consent,
            fileName: msg.filename || `neo_recording_${Date.now()}.wav`,
          });

        neoDebug("[digitize] success", {
          prescriptionUrl,
          sourceDuration,
          correlationId,
          digitizeResponse,
        });

        const capturedSeconds = Math.round(
          Number(sourceDuration) || Number(durationFromServer) || 0
        );
        if (capturedSeconds > 0) {
          addTodayCapturedExtraSeconds(capturedSeconds);
          setTodayCapturedExtraSeconds(getTodayCapturedExtraSeconds());
        }

        const parsed = extractDigitizeResult(digitizeResponse);
        neoDebug("[digitize] parsed encounters", {
          encounterCount: parsed.patientEncounters?.length,
          transcriptionLength: parsed.transcription?.length,
          recordId: parsed.recordId,
        });

        const result = {
          ...parsed,
          prescriptionUrl,
          sourceDuration,
          correlationId,
          neoFilename: msg.filename,
          neoFileUrl: msg.file_url
            ? getNeoRecordingFetchUrl(msg.file_url)
            : null,
          processedAt: Date.now(),
        };
        if (msg.filename) {
          knownRecordingFilesRef.current.add(msg.filename);
        }

        setConsultationResult(result);
        setPhase(NEO_WS_PHASE.READY);
        setIsModalOpen(true);
        neoDebug("[ui] CONSULTATION READY → inline panel should appear", {
          encounters: result.patientEncounters?.length || 0,
          transcriptionPreview: (result.transcription || "").slice(0, 60),
          recordId: result.recordId,
        });
        onConsultationReady?.(result);

        if (msg.reason === "disconnect") {
          message.info("Neo consultation saved before device disconnected");
        }
      } catch (err) {
        neoDebugError("[recording_finished] processing failed", {
          message: err?.message,
          response: err?.response?.data,
          stack: err?.stack,
        });
        const errText = err?.message || "Failed to process Neo consultation";
        setErrorMessage(errText);
        message.error(errText);
        setPhase((prev) =>
          isNeoDeviceConnected(prev) ? NEO_WS_PHASE.CONNECTED : prev
        );
      } finally {
        processingRef.current = false;
        neoDebug("[recording_finished] handler done, processingRef=false");
      }
    },
    [fetchRecordingBlob, finalizeRecordingTranscript, handleUnsolicitedSegmentFinished, logPhase, onConsultationReady, shouldFinalizeRecording, stopChunkTimer, clearRecordingStartedAt]
  );

  const handleStatusEvent = useCallback((msg) => {
    const state = msg.state || msg.status;
    if (!state) return;

    neoDebug("[status]", { state, address: msg.address, error: msg.error, battery_pct: msg.battery_pct });

    setDeviceStatus(state);
    if (msg.address) setDeviceAddress(msg.address);

    setPhase((prev) => neoStatusStateToPhase(state, prev));

    if (state === "scan_no_device") {
      setErrorMessage("Neo not found — is it powered on and nearby?");
    } else if (state === "connect_failed") {
      setErrorMessage(msg.error || "Could not connect to Neo device");
      clearBatteryTelemetry();
    } else if (state === "connected" || state === "already_connected") {
      setErrorMessage("");
      updateDeviceTelemetry(msg);
      if (!batteryStatusPullRef.current) {
        batteryStatusPullRef.current = true;
        neoDebug("[battery] requesting status pull after connect");
        sendWsCommand({ action: "status" });
      }
    } else if (state === "disconnected") {
      setIsSpeaking(false);
      isRecordingRef.current = false;
      setIsRecording(false);
      clearBatteryTelemetry();
    }
  }, [clearBatteryTelemetry, sendWsCommand, updateDeviceTelemetry]);

  const handleWsMessage = useCallback(
    async (ev) => {
      wsMessageCountRef.current += 1;
      const msgNum = wsMessageCountRef.current;

      // Skip noisy per-frame logs for high-frequency telemetry.
      const isTelemetryFrame =
        typeof ev.data === "string"
        && (ev.data.includes('"audio_level"') || ev.data.includes('"vad"'));

      if (!isTelemetryFrame) {
        // eslint-disable-next-line no-console
        console.debug(
          `%c[NEO raw #${msgNum}]%c`,
          "background:#64748b;color:#fff;padding:1px 4px;border-radius:2px",
          "color:#64748b",
          typeof ev.data === "string" ? ev.data.slice(0, 200) : ev.data
        );
      }

      let msg;
      let rawData = ev.data;
      try {
        if (typeof rawData !== "string") {
          neoDebugWarn(`[ws msg #${msgNum}] non-string frame`, { type: typeof rawData });
          return;
        }
        msg = JSON.parse(rawData);
      } catch (parseErr) {
        neoDebugError(`[ws msg #${msgNum}] JSON parse failed`, {
          rawPreview: String(rawData).slice(0, 200),
          parseErr,
        });
        return;
      }

      const event = msg.event;

      if (event === "vad" || event === "audio_level") {
        const now = Date.now();
        if (msg.recording || now - lastVadLogAtRef.current > 3000) {
          lastVadLogAtRef.current = now;
          neoDebug(`[ws msg #${msgNum}] ${event}`, {
            rms: msg.rms,
            threshold: msg.threshold,
            recording: msg.recording,
          });
        }
        // 🚨 Loud, always-on console for debugging double-tap. Fires whenever
        // the bridge's `recording` flag DIFFERS from our local state — this
        // is exactly the moment a device_tap should be flipping the toggle.
        if (!!msg.recording !== isRecordingRef.current) {
          const willIgnoreStop =
            !msg.recording && isRecordingRef.current && isChunkPipelineActive();
          // eslint-disable-next-line no-console
          console.log(
            `%c[NEO ${event}]%c server.recording=${msg.recording} local.isRecording=${isRecordingRef.current}${willIgnoreStop ? " → IGNORE stop (chunk pipeline)" : " → SYNCING"}`,
            "background:#4b4ad5;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
            "color:#4b4ad5;font-weight:bold"
          );
        }
      } else {
        neoDebug(`[ws msg #${msgNum}]`, event || "(no event field)", msg);
        // 🚨 Loud console for every non-audio_level event so we can see
        // recording_started / recording_finished / device_state arriving.
        // eslint-disable-next-line no-console
        console.log(
          `%c[NEO ws msg]%c event=${event}`,
          "background:#16a34a;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
          "color:#16a34a",
          msg
        );
      }

      if (!event) {
        neoDebugWarn(`[ws msg #${msgNum}] message has NO event field — may be legacy format`, msg);
        if (msg.status) {
          handleStatusEvent({ state: msg.status, address: msg.address, error: msg.error });
        }
        if (msg.event === "recording_finished" || (msg.file_url && !msg.event)) {
          neoDebugWarn("[ws] possible recording_finished without event wrapper", msg);
          await handleRecordingFinished(msg);
        }
        return;
      }

      if (event === "hello") {
        helloReceivedRef.current = true;
        bridgeSupportsRef.current = new Set(
          Array.isArray(msg.supports) ? msg.supports : []
        );
        setServerConfig(msg.config || {});
        if (msg.config?.rms_threshold != null) setRmsThreshold(msg.config.rms_threshold);
        neoDebug("[hello] server ready, auto_connect=", msg.auto_connect, {
          supports: [...bridgeSupportsRef.current],
        });
        registerWithBridge();
        return;
      }

      if (event === "registered") {
        neoDebug("[registered] bridge knows our user", msg);
        if (msg.paired_device) {
          setPairedDevice(msg.paired_device);
          setStoredPairedDevice(msg.paired_device);
        }
        return;
      }

      if (event === "scan_results") {
        setIsScanning(false);
        const devices = Array.isArray(msg.devices) ? msg.devices : [];
        setScanResults(devices);
        neoDebug("[scan_results]", { count: devices.length });
        return;
      }

      if (event === "pair_success") {
        setIsPairing(false);
        setPairingError("");
        const paired = msg.paired_device || null;
        if (paired) {
          setPairedDevice(paired);
          setStoredPairedDevice(paired);
          setDeviceAddress(paired.address);
          if (umId) {
            registerPairedDevice({
              userId: umId,
              deviceAddress: paired.address,
              deviceName: paired.name,
              firmware: paired.firmware,
            }).catch(() => {});
          }
        }
        message.success(`Paired with ${paired?.name || "Neo"}`);
        return;
      }

      if (event === "pair_failed") {
        setIsPairing(false);
        const err = msg.error || "Pairing failed";
        setPairingError(err);
        setPhase((prev) =>
          prev === NEO_WS_PHASE.PAIRING ? NEO_WS_PHASE.CONNECT_FAILED : prev
        );
        message.error(`Pairing failed: ${err}`);
        return;
      }

      if (event === "device_forgotten") {
        setPairedDevice(null);
        clearStoredPairedDevice();
        message.info("Neo unpaired from this computer");
        return;
      }

      if (event === "status") {
        handleStatusEvent(msg);
        return;
      }

      // device_state fires whenever the Neo's hardware state changes —
      // including the is_recording flag on a double-tap (~50 ms before the
      // dedicated recording_started event per the integration guide). We
      // only LOG it here for now so we can see whether the device is sending
      // anything at all when the user taps; the dedicated recording_started
      // / recording_finished events remain the source of truth.
      if (event === "device_state") {
        updateDeviceTelemetry(msg);
        // eslint-disable-next-line no-console
        console.log(
          `%c[NEO device_state]%c battery_pct=${msg.battery_pct} is_charging=${msg.is_charging} is_recording=${msg.is_recording}`,
          "background:#a461d8;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
          "color:#a461d8",
          { battery_mv: msg.battery_mv, system_states: msg.system_states, ui_led_states: msg.ui_led_states }
        );
        // Safety net: if device_state says we're recording but our local
        // state says we aren't, sync. This catches the case where
        // recording_started fails to arrive for some reason.
        if (typeof msg.is_recording === "boolean" && msg.is_recording !== isRecordingRef.current) {
          if (!msg.is_recording && isRecordingRef.current && isChunkPipelineActive()) {
            // eslint-disable-next-line no-console
            console.log(
              `[NEO device_state] is_recording=false during chunk pipeline — keeping local recording=true`
            );
            return;
          }
          // eslint-disable-next-line no-console
          console.warn(
            `%c[NEO] ⚠️ device_state.is_recording=${msg.is_recording} but local isRecording=${isRecordingRef.current} — SYNCING from device_state`,
            "color:#dc2626;font-weight:bold"
          );
          isRecordingRef.current = msg.is_recording;
          setIsRecording(msg.is_recording);
          if (msg.is_recording) {
            setPhase((prev) =>
              prev === NEO_WS_PHASE.PROCESSING || prev === NEO_WS_PHASE.READY ? prev : NEO_WS_PHASE.RECORDING
            );
            activateRecordingPipeline("device_state");
          }
        }
        return;
      }

      // v1.x legacy `vad` event and v2.0+ `audio_level` event are handled
      // identically — both carry { rms, recording }. The `recording` flag is
      // the bridge's source of truth, so we mirror it into isRecording so the
      // UI toggle stays in sync no matter which trigger fired (UI button or
      // a Neo double-tap).
      if (event === "vad" || event === "audio_level") {
        setRms(msg.rms ?? 0);
        if (msg.threshold != null) setRmsThreshold(msg.threshold);
        const serverRecording = !!msg.recording;
        setIsSpeaking(serverRecording);
        if (serverRecording !== isRecordingRef.current) {
          if (!serverRecording && isRecordingRef.current && isChunkPipelineActive()) {
            // eslint-disable-next-line no-console
            console.log(
              `[NEO ${event}] server.recording=false during chunk pipeline — keeping local recording=true`
            );
            return;
          }
          isRecordingRef.current = serverRecording;
          setIsRecording(serverRecording);
        }
        if (serverRecording) {
          if (!isChunkPipelineActive()) {
            activateRecordingPipeline(event);
          }
          setPhase((prev) =>
            prev === NEO_WS_PHASE.PROCESSING || prev === NEO_WS_PHASE.READY
              ? prev
              : NEO_WS_PHASE.RECORDING
          );
        }
        return;
      }

      if (event === "recording_started") {
        // 🚨 Loud console specifically for double-tap debugging
        const isDeviceTap = msg.reason === "device_tap";
        // eslint-disable-next-line no-console
        console.log(
          `%c[NEO recording_started]%c reason=${msg.reason || "(none)"} ${isDeviceTap ? "🟢 DEVICE DOUBLE-TAP DETECTED" : ""}`,
          "background:#dc2626;color:#fff;padding:3px 8px;border-radius:3px;font-weight:bold;font-size:13px",
          "color:#dc2626;font-weight:bold",
          { fullMsg: msg, wasRecordingBefore: isRecordingRef.current }
        );
        neoDebug("[recording_started]", { reason: msg.reason });
        isRecordingRef.current = true;
        setIsRecording(true);
        setPhase(NEO_WS_PHASE.RECORDING);
        setIsSpeaking(true);
        setErrorMessage("");
        activateRecordingPipeline(msg.reason || "recording_started");
        if (isDeviceTap) {
          // eslint-disable-next-line no-console
          console.log("%c[NEO] ✅ setIsRecording(true) called from device_tap", "color:#16a34a;font-weight:bold");
          message.info("Recording started from Neo (double-tap)");
        }
        return;
      }

      if (
        event === "recording_chunk"
        || event === "audio_chunk"
        || msg.type === "recording_chunk"
        || msg.type === "audio_chunk"
      ) {
        await handleRecordingChunk(msg);
        return;
      }

      if (event === "recording_finished") {
        neoDebug("[recording_finished] received via WebSocket", {
          file_url: msg.file_url,
          filename: msg.filename,
          duration_s: msg.duration_s,
          reason: msg.reason,
        });
        if (!msg.file_url && !msg.wav_base64) {
          neoDebugError(
            "[recording_finished] WS event received but NO audio payload — backend may only have saved to disk",
            msg
          );
        }
        setIsSpeaking(false);
        await handleRecordingFinished(msg);
        setPhase((prev) => {
          if (prev === NEO_WS_PHASE.PROCESSING || prev === NEO_WS_PHASE.READY) {
            return prev;
          }
          return isNeoDeviceConnected(prev) ? NEO_WS_PHASE.CONNECTED : prev;
        });
        return;
      }

      if (event === "config") {
        if (msg.rms_threshold != null) setRmsThreshold(msg.rms_threshold);
        return;
      }

      if (event === "error") {
        const errText = msg.message || msg.error || "Neo server error";
        neoDebugError("[ws error event]", errText);
        if (String(errText).includes("unknown_action: 'get_recording_chunk'")) {
          bridgeSupportsRef.current.delete("get_recording_chunk");
          neoDebugWarn("[chunk] bridge rejected get_recording_chunk — using HTTP delta polling");
          return;
        }
        setErrorMessage(errText);
        message.warning(errText);
        return;
      }

      neoDebugWarn(`[ws msg #${msgNum}] unhandled event type: "${event}"`, msg);
    },
    [handleRecordingFinished, handleRecordingChunk, handleStatusEvent, registerWithBridge, activateRecordingPipeline, isChunkPipelineActive, updateDeviceTelemetry, umId]
  );

  // Keep the ref pointing at the latest closure on every render. The WS
  // listener installed inside connectNeo dispatches through this ref, so
  // changes here do NOT tear down the socket.
  useEffect(() => {
    wsMessageHandlerRef.current = handleWsMessage;
  }, [handleWsMessage]);

  const connectNeo = useCallback(() => {
    if (!enabled) {
      neoDebug("[ws] connectNeo skipped — enabled=false");
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      neoDebug("[ws] connectNeo skipped — already open");
      return;
    }

    const wsUrl = getNeoWsUrl();
    neoDebug("[ws] connecting", {
      wsUrl,
      enabled,
      patientId,
      umId,
    });

    try {
      helloReceivedRef.current = false;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      wsMessageCountRef.current = 0;

      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = setTimeout(() => {
        const rs = ws.readyState;
        if (rs !== WebSocket.OPEN) {
          neoDebugError("[ws] CONNECTION TIMEOUT — never reached OPEN (WebSocket issue, not digitization)", {
            wsUrl,
            readyState: rs,
            states: { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 },
            fix: "Use ws://localhost:8081/ws — restart npm run start:dev after setupProxy fix",
          });
          setErrorMessage(
            "Neo WebSocket did not connect. Ensure ws_server.py is running on port 8081."
          );
          setPhase(NEO_WS_PHASE.ERROR);
        } else if (!helloReceivedRef.current) {
          neoDebugWarn("[ws] OPEN but no hello yet — check ws_server.py logs");
        }
      }, 8000);

      ws.addEventListener("open", () => {
        if (openTimeoutRef.current) {
          clearTimeout(openTimeoutRef.current);
          openTimeoutRef.current = null;
        }
        neoDebug("[ws] OPEN — waiting for hello + recording events from server", {
          wsUrl,
          readyState: ws.readyState,
        });
        setPhase(NEO_WS_PHASE.WS_OPEN);
        setDeviceStatus("ws_open");
        setErrorMessage("");
      });

      ws.addEventListener("message", (ev) => {
        const fn = wsMessageHandlerRef.current;
        if (fn) fn(ev);
      });

      ws.addEventListener("close", (ev) => {
        neoDebugWarn("[ws] CLOSED", { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
        wsRef.current = null;
        setPhase(NEO_WS_PHASE.DISCONNECTED);
        setIsSpeaking(false);
        if (enabled && !reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            neoDebug("[ws] reconnecting after close…");
            connectNeo();
          }, RECONNECT_MS);
        }
      });

      ws.addEventListener("error", (ev) => {
        neoDebugError("[ws] ERROR event — frontend will NOT get recording_finished", {
          wsUrl,
          event: ev,
          hint: "Run ws_server.py on :8081. WS must be ws://localhost:8081/ws (not :3021)",
        });
        setErrorMessage(
          "Cannot reach Neo WebSocket — run ./.ws_server_run.sh (port 8081) on this Mac"
        );
        setPhase(NEO_WS_PHASE.ERROR);
      });
    } catch (err) {
      neoDebugError("[ws] connectNeo exception", err);
      setErrorMessage(err?.message || "Could not open Neo WebSocket");
      setPhase(NEO_WS_PHASE.ERROR);
    }
  }, [enabled, patientId, umId]);

  const disconnectNeo = useCallback(() => {
    neoDebug("[ws] disconnectNeo");
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    sendWsCommand({ action: "disconnect" });
    if (wsRef.current) {
      wsRef.current.close();
    }
    wsRef.current = null;
    clearBatteryTelemetry();
    setPhase(NEO_WS_PHASE.DISCONNECTED);
    setIsSpeaking(false);
  }, [clearBatteryTelemetry, sendWsCommand]);

  const dismissReadyModal = useCallback(() => {
    setIsModalOpen(false);
    setPhase(NEO_WS_PHASE.CONNECTED);
  }, []);

  const resetConsultation = useCallback(() => {
    setConsultationResult(null);
    setIsModalOpen(false);
    setPhase(NEO_WS_PHASE.CONNECTED);
    setErrorMessage("");
  }, []);

  const setNeoConfig = useCallback(
    (cfg) => {
      sendWsCommand({ action: "set_config", ...cfg });
    },
    [sendWsCommand]
  );

  /** Fallback only when WebSocket is not delivering events */
  const pollRecordingsFromServer = useCallback(async () => {
    if (wsMessageCountRef.current > 2 && helloReceivedRef.current) {
      return;
    }
    if (pollFailCountRef.current >= 3) {
      return;
    }

    const listUrl = getNeoRecordingsListUrl();
    try {
      const resp = await fetch(listUrl);
      if (!resp.ok) {
        pollFailCountRef.current += 1;
        neoDebugWarn("[poll] /recordings failed", {
          listUrl,
          status: resp.status,
          failCount: pollFailCountRef.current,
          hint: "Is ws_server.py running? curl http://localhost:8081/health",
        });
        return;
      }
      pollFailCountRef.current = 0;
      const data = await resp.json();
      const items = data.recordings || [];

      if (!recordingsPollInitializedRef.current) {
        items.forEach((item) => {
          if (item.filename) knownRecordingFilesRef.current.add(item.filename);
        });
        recordingsPollInitializedRef.current = true;
        neoDebug("[poll] seeded existing recordings (will not re-process)", {
          count: knownRecordingFilesRef.current.size,
        });
        return;
      }

      for (const item of items) {
        const name = item.filename;
        if (!name || knownRecordingFilesRef.current.has(name)) continue;
        if (processingRef.current) continue;

        neoDebugWarn("[poll] NEW recording on server but missed via WebSocket — processing now", {
          filename: name,
          file_url: item.file_url,
          wsMessageCount: wsMessageCountRef.current,
        });

        knownRecordingFilesRef.current.add(name);
        await handleRecordingFinished({
          event: "recording_finished",
          file_url: item.file_url,
          filename: name,
          duration_s: 0,
          size_bytes: item.size_bytes,
          reason: "poll_fallback",
        });
      }
    } catch (pollErr) {
      pollFailCountRef.current += 1;
      neoDebugWarn("[poll] error", {
        listUrl,
        failCount: pollFailCountRef.current,
        pollErr,
      });
    }
  }, [handleRecordingFinished]);

  useEffect(() => {
    if (!enabled) {
      disconnectNeo();
      return undefined;
    }
    neoDebug("[hook] useNeoSapein mounted, enabled=true", {
      wsUrl: getNeoWsUrl(),
      recordingsListUrl: getNeoRecordingsListUrl(),
    });
    connectNeo();

    const pollInterval = setInterval(pollRecordingsFromServer, 15000);
    setTimeout(pollRecordingsFromServer, 12000);

    return () => {
      clearInterval(pollInterval);
      stopChunkTimer();
      stopFrontendChunkRecording();
      neoDebug("[hook] useNeoSapein unmounting");
      disconnectNeo();
    };
  }, [enabled, connectNeo, disconnectNeo, pollRecordingsFromServer, stopChunkTimer, stopFrontendChunkRecording]);

  useEffect(() => {
    neoDebug("[ui state]", {
      phase,
      deviceStatus,
      isSpeaking,
      isConnected: isNeoDeviceConnected(phase),
      isModalOpen,
      hasConsultationResult: !!consultationResult,
      wsReadyState: wsRef.current?.readyState,
      wsMessageCount: wsMessageCountRef.current,
    });
  }, [phase, deviceStatus, isSpeaking, isModalOpen, consultationResult]);

  const isConnected = isNeoDeviceConnected(phase);

  return {
    phase,
    deviceStatus,
    deviceAddress,
    errorMessage,
    rms,
    rmsThreshold,
    isSpeaking,
    isConnected,
    serverConfig,
    consultationResult,
    isModalOpen,
    dismissReadyModal,
    resetConsultation,
    connectNeo,
    disconnectNeo,
    requestBleConnect,
    setNeoConfig,
    setConsultationResult,
    setIsModalOpen,
    pairedDevice,
    isScanning,
    scanResults,
    isPairing,
    pairingError,
    scanForDevices,
    pairDevice,
    unpairDevice,
    forgetDevice,
    connectSavedDevice,
    connectDevice,
    disconnectBleOnly,
    isRecording,
    isLocalRecording,
    isLocalProcessing,
    isTranscribingChunk,
    recordingStartedAt,
    recordingTranscript,
    recordingConversation,
    todayCapturedExtraSeconds,
    clearTodayCapturedExtra,
    deviceTelemetry,
    batteryPct: deviceTelemetry.batteryPercent,
    isCharging: deviceTelemetry.isCharging,
    startRecording,
    stopRecording,
    startLocalRecording,
    stopLocalRecording,
  };
};

export default useNeoSapein;
