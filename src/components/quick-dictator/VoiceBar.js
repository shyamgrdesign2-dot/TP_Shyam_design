// Quick Dictator — floating black "dynamic island" bar.
// Activated by double-Shift via VoiceBarProvider. Closes on single-Shift,
// Esc, ✕ (cancel-undo flow with 8s grace), or ✓ (route + processing
// state). Mic switcher exposes audio inputs and doubles as mute.

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useVoiceBar, qdToast } from "./voice-bar-context";
import { transcribeAnyAudio } from "../dr-agent/voicerx/api/agent-audio-service";
import {
  playVoiceRxStartSound,
  playSubmitSound,
  playVoiceRxErrorSound,
} from "../dr-agent/voicerx/audio";
import { getSupportedMimeType } from "../../utils/utils";
import "./quick-dictator.css";

// Rounded equalizer bars, matching the VoiceRx FAB waveform. The pulse is
// CSS-driven; staggered delays give a travelling-wave look.
const WAVE_BAR_COUNT = 9;
const CANCEL_UNDO_WINDOW_MS = 5000;

// TP CDN icons rendered as recolourable masks (see `.qd-ico*` in the CSS).
// `currentColor` lets each icon pick up its context colour.
const Ico = ({ name, size = 16, className = "", style }) => (
  <span
    aria-hidden
    className={`qd-ico qd-ico-${name} ${className}`.trim()}
    style={{ width: size, height: size, ...style }}
  />
);
const CheckGlyph = () => <Ico name="check" size={18} />;
const XGlyph = () => <Ico name="close" size={16} />;
const ChevronDown = ({ className }) => (
  <Ico name="chevron" size={14} className={className} />
);
const MicGlyph = () => <Ico name="mic" size={18} />;
const MicSlash = () => <Ico name="mic-slash" size={18} />;
const UndoGlyph = () => <Ico name="undo" size={14} />;

export function VoiceBar() {
  const { isOpen, close, route, externalControllerActive, externalState } = useVoiceBar();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [recordingSupported, setRecordingSupported] = useState(true);
  const [recordError, setRecordError] = useState(null);
  const [recording, setRecording] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [muted, setMuted] = useState(false);

  const [cancelPending, setCancelPending] = useState(false);

  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState("default");
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const waveRef = useRef(null);
  const switcherRef = useRef(null);
  const controlledStatus = externalState?.status || "idle";
  const isControlled = externalControllerActive && controlledStatus !== "idle";
  const controlledStream = isControlled ? externalState?.stream : null;

  const setWaveFromFrequencyBins = useCallback((bins, { muted: forceMuted = false } = {}) => {
    const bars = waveRef.current?.querySelectorAll?.(".qd-wave-bar");
    if (!bars?.length) return;
    if (forceMuted || !bins?.length) {
      bars.forEach((bar) => {
        bar.style.setProperty("--qd-scale", "0.35");
        bar.style.setProperty("--qd-level", "0");
      });
      return;
    }
    const usableBins = Math.max(1, Math.min(bins.length - 1, Math.floor(bins.length * 0.42)));
    const bandLevels = Array.from({ length: 5 }, (_, bandIndex) => {
      const startRatio = bandIndex / 5;
      const endRatio = (bandIndex + 1) / 5;
      const start = Math.max(1, Math.floor(startRatio * startRatio * usableBins));
      const end = Math.max(start + 1, Math.floor(endRatio * endRatio * usableBins));
      let weightedSum = 0;
      let weightTotal = 0;
      for (let i = start; i < Math.min(end, bins.length); i += 1) {
        const binValue = bins[i] / 255;
        const weight = 1 + bandIndex * 0.18;
        weightedSum += binValue * weight;
        weightTotal += weight;
      }
      return weightTotal > 0 ? weightedSum / weightTotal : 0;
    });
    const averageLevel = bandLevels.reduce((sum, value) => sum + value, 0) / bandLevels.length;
    const mirroredPattern = [1, 2, 3, 4, 3, 4, 3, 2, 1];
    bars.forEach((bar, index) => {
      const bandLevel = bandLevels[mirroredPattern[index] || 0] || 0;
      const shaped = Math.max(0, Math.min(1, bandLevel * 2.55 + averageLevel * 1.35));
      const distanceFromCenter = Math.abs(index - (bars.length - 1) / 2) / ((bars.length - 1) / 2);
      const visualLift = 0.78 + (1 - distanceFromCenter) * 0.18;
      const scale = 0.24 + shaped * 1.34 * visualLift;
      bar.style.setProperty("--qd-scale", scale.toFixed(3));
      bar.style.setProperty("--qd-level", shaped.toFixed(3));
    });
  }, []);

  // ── Sound cues (mirror VoiceRx): Active = open, Submit = accept, Cancelled = cancel
  // Played once per state transition; fires on `isOpen` flip only (device-id
  // changes don't replay it).
  useEffect(() => {
    if (isOpen) playVoiceRxStartSound();
  }, [isOpen]);

  useEffect(() => {
    if (!isControlled) return;
    setRecordError(null);
    setMicDenied(false);
    setCancelPending(false);
    setRecording(controlledStatus === "recording");
    setProcessing(controlledStatus === "transcribing");
    setMuted(Boolean(externalState?.muted));
  }, [controlledStatus, externalState?.muted, isControlled]);

  // Online/offline indicator
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Click-outside to close switcher
  useEffect(() => {
    if (!switcherOpen) return;
    const onDoc = (e) => {
      if (switcherRef.current?.contains(e.target)) return;
      setSwitcherOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setSwitcherOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [switcherOpen]);

  // Lifecycle — record audio (for AI transcription) + drive the waveform,
  // spun up on open / device change.
  useEffect(() => {
    if (!isOpen || isControlled) return;
    setRecordError(null);
    setMicDenied(false);
    setCancelPending(false);
    setProcessing(false);
    setMuted(false);
    setRecording(false);

    const w = typeof window !== "undefined" ? window : null;
    if (!w || typeof MediaRecorder === "undefined") {
      setRecordingSupported(false);
      return;
    }
    setRecordingSupported(true);

    let cancelled = false;
    (async () => {
      try {
        const constraints =
          activeDeviceId && activeDeviceId !== "default"
            ? { audio: { deviceId: { exact: activeDeviceId } } }
            : { audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled)
            setDevices(all.filter((d) => d.kind === "audioinput"));
        } catch (_) {}
        streamRef.current = stream;

        // Record the audio — sent to the AI transcription backend on accept.
        const mimeType = getSupportedMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        if (!cancelled) setRecording(true);

        // Waveform analyser (drives --qd-level on the bars).
        const AC = w.AudioContext || w.webkitAudioContext;
        const ctx = new AC();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.65;
        src.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const bins = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(bins);
          let sum = 0;
          for (let i = 0; i < bins.length; i++) sum += bins[i];
          const avg = sum / bins.length / 255;
          const level = Math.max(0, Math.min(1, avg * 1.8));
          waveRef.current?.style.setProperty("--qd-level", level.toFixed(3));
          setWaveFromFrequencyBins(bins, { muted });
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        const name = err?.name || "";
        if (
          name === "NotAllowedError" ||
          name === "SecurityError" ||
          name === "PermissionDeniedError"
        ) {
          setMicDenied(true);
        } else {
          setRecordError(err?.message || "Microphone unavailable");
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      const rec = mediaRecorderRef.current;
      if (rec) {
        rec.ondataavailable = null;
        rec.onstop = null;
        try {
          if (rec.state !== "inactive") rec.stop();
        } catch (_) {}
        mediaRecorderRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      audioChunksRef.current = [];
    };
  }, [activeDeviceId, isControlled, isOpen, muted, setWaveFromFrequencyBins]);

  useEffect(() => {
    if (!isControlled || !controlledStream || controlledStatus !== "recording" || muted) {
      setWaveFromFrequencyBins(null, { muted: true });
      return undefined;
    }
    const w = typeof window !== "undefined" ? window : null;
    const AC = w?.AudioContext || w?.webkitAudioContext;
    if (!AC) return undefined;

    let rafId = 0;
    let ctx = null;
    let source = null;
    let analyser = null;
    let bins = null;
    try {
      ctx = new AC();
      source = ctx.createMediaStreamSource(controlledStream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);
      bins = new Uint8Array(analyser.frequencyBinCount);
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    } catch (_) {
      void ctx?.close?.().catch(() => {});
      return undefined;
    }

    const tick = () => {
      analyser.getByteFrequencyData(bins);
      setWaveFromFrequencyBins(bins);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      source?.disconnect();
      void ctx?.close?.().catch(() => {});
      setWaveFromFrequencyBins(null, { muted: true });
    };
  }, [controlledStatus, controlledStream, isControlled, muted, setWaveFromFrequencyBins]);

  // Accept — stop recording, send the audio to the AI transcription backend,
  // and route the refined transcript into the focused field.
  const handleAccept = useCallback(async () => {
    if (isControlled) {
      if (controlledStatus !== "recording" || processing) return;
      playSubmitSound();
      window.dispatchEvent(new CustomEvent("tp-quickdict-submit"));
      return;
    }
    if (processing || micDenied) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      qdToast("Nothing captured. Try again", { type: "error" });
      return;
    }
    playSubmitSound();
    setProcessing(true);
    await new Promise((resolve) => {
      recorder.onstop = resolve;
      try {
        recorder.stop();
      } catch (_) {
        resolve();
      }
    });
    setRecording(false);
    streamRef.current?.getAudioTracks().forEach((t) => t.stop());
    const mimeType = recorder.mimeType || "audio/webm";
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    try {
      const { transcript } = await transcribeAnyAudio({ audioBlob });
      const kind = route(transcript);
      close({ restoreFocus: true });
      if (kind === "clipboard") {
        qdToast("Copied dictation to clipboard");
      } else if (kind === "empty") {
        qdToast("Nothing captured. Try again", { type: "error" });
      }
    } catch (err) {
      close({ restoreFocus: true });
      qdToast("Couldn't transcribe audio. Please try again.", {
        type: "error",
      });
    }
  }, [controlledStatus, isControlled, micDenied, processing, route, close]);

  // Cancel pauses the recording (keeping the audio) so Undo can resume it.
  // Also notifies the coach mark so it can tick its cancel counter toward
  // auto-dismissal.
  const handleCancel = useCallback(() => {
    if (processing) return;
    if (isControlled) {
      playVoiceRxErrorSound();
      window.dispatchEvent(new CustomEvent("tp-quickdict-cancel"));
      return;
    }
    try {
      if (mediaRecorderRef.current?.state === "recording")
        mediaRecorderRef.current.pause();
    } catch (_) {}
    playVoiceRxErrorSound();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tp-voicerx-dictation-cancelled"));
    }
    setCancelPending(true);
  }, [isControlled, processing]);

  const handleUndoCancel = useCallback(() => {
    setCancelPending(false);
    try {
      if (mediaRecorderRef.current?.state === "paused")
        mediaRecorderRef.current.resume();
    } catch (_) {}
  }, []);

  // Mute / unmute the live mic — silences the input track and pauses the
  // recorder while muted, resumes both on unmute. No-op without access.
  const toggleMute = useCallback(() => {
    if (micDenied) return;
    if (isControlled) {
      window.dispatchEvent(new CustomEvent("tp-quickdict-toggle-mute"));
      return;
    }
    setMuted((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      try {
        const rec = mediaRecorderRef.current;
        if (next && rec?.state === "recording") rec.pause();
        else if (!next && rec?.state === "paused") rec.resume();
      } catch (_) {}
      return next;
    });
  }, [isControlled, micDenied]);

  // Auto-discard once the undo window elapses. The countdown bar itself is a
  // pure CSS animation (qd-undo-countdown), so it always runs the full window
  // and can't desync from React re-renders.
  useEffect(() => {
    if (!cancelPending) return;
    const t = window.setTimeout(
      () => close({ restoreFocus: true }),
      CANCEL_UNDO_WINDOW_MS
    );
    return () => window.clearTimeout(t);
  }, [cancelPending, close]);

  // Enter routes through accept (Esc handled at provider level)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        if (cancelPending) handleUndoCancel();
        else handleAccept();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleAccept, cancelPending, handleUndoCancel]);

  // Single-Shift accept (dispatched from provider)
  useEffect(() => {
    if (!isOpen) return;
    const onAccept = () => {
      if (cancelPending) handleUndoCancel();
      else handleAccept();
    };
    window.addEventListener("tp-quickdict-accept", onAccept);
    return () => window.removeEventListener("tp-quickdict-accept", onAccept);
  }, [isOpen, handleAccept, cancelPending, handleUndoCancel]);

  if (!mounted || !isOpen) return null;

  const denied = micDenied;
  const acceptDisabled = isControlled
    ? controlledStatus !== "recording"
    : denied || processing || !recording;

  return createPortal(
    <div
      className="qd-host"
      role="region"
      aria-label="Voice dictation bar"
      data-quickdict-no-shimmer="true"
      data-quickdict-no-block="true"
      data-header-dictation-trigger="quick-dictator"
    >
      {/* Page is fully interactive while Quick Dictator is up: scroll, click,
          focus other inputs, etc. — matching VoiceRx's behaviour. The host
          uses pointer-events: none so only the bar itself captures clicks. */}
      <div
        className={
          "qd-bar qd-bar-in " + (cancelPending ? "qd-bar-cancelled" : "")
        }
        role="dialog"
        aria-modal="false"
      >
        {cancelPending ? (
          <>
            <div className="qd-cancel-text">
              <span className="qd-cancel-title">Transcript cancelled</span>
            </div>
            <button
              type="button"
              onClick={handleUndoCancel}
              aria-label="Undo cancel"
              className="qd-undo-btn"
              style={{ color: "#fff" }}
            >
              <UndoGlyph />
              <span style={{ color: "#fff" }}>Undo</span>
            </button>
            <div className="qd-undo-track" aria-hidden>
              <div
                className="qd-undo-fill"
                style={{ animationDuration: `${CANCEL_UNDO_WINDOW_MS}ms` }}
              />
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Cancel dictation"
              disabled={processing}
              className="qd-action qd-action-cancel"
            >
              <XGlyph />
            </button>

            <div className="qd-switcher-wrap" ref={switcherRef}>
              <div
                className={
                  "qd-mic-group " + (muted ? "qd-mic-group-muted" : "")
                }
              >
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={denied || processing}
                  aria-label={
                    denied
                      ? "Microphone blocked"
                      : muted
                      ? "Unmute microphone"
                      : "Mute microphone"
                  }
                  aria-pressed={muted}
                  className="qd-mic-toggle"
                >
                  {denied || muted ? <MicSlash /> : <MicGlyph />}
                </button>
                <span className="qd-mic-divider" aria-hidden />
                <button
                  type="button"
                  onClick={() => setSwitcherOpen((v) => !v)}
                  disabled={processing || isControlled}
                  aria-label="Switch microphone"
                  aria-expanded={switcherOpen}
                  className="qd-mic-caret"
                >
                  <ChevronDown
                    className={
                      "qd-chev " + (switcherOpen ? "qd-chev-open" : "")
                    }
                  />
                </button>
              </div>
              {switcherOpen && !isControlled && (
                <div className="qd-switcher-menu" role="menu">
                  <div className="qd-switcher-eyebrow">Microphone</div>
                  {devices.length === 0 && (
                    <div className="qd-switcher-empty">No devices found</div>
                  )}
                  {devices.map((d, i) => {
                    const isActive =
                      d.deviceId === activeDeviceId ||
                      (activeDeviceId === "default" && i === 0);
                    return (
                      <button
                        key={d.deviceId || i}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => {
                          const label = d.label || `Microphone ${i + 1}`;
                          if (!isControlled) setActiveDeviceId(d.deviceId || "default");
                          setSwitcherOpen(false);
                          qdToast(`Switched to ${label}`, { duration: 2 });
                        }}
                        className={
                          "qd-switcher-item " +
                          (isActive ? "qd-switcher-item-active" : "")
                        }
                      >
                        <span className="qd-switcher-radio">
                          <span className="qd-switcher-radio-inner" />
                        </span>
                        <span className="qd-switcher-label">
                          {d.label || `Microphone ${i + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="qd-signal">
              {processing ? (
                <div
                  className="qd-processing"
                  aria-live="polite"
                  role="status"
                >
                  <span className="qd-spinner" aria-hidden />
                  <span>Processing…</span>
                </div>
              ) : (
                <>
                  <div className="qd-wave" aria-hidden ref={waveRef}>
                    {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          "qd-wave-bar " +
                          (denied || muted ? "qd-wave-bar-muted" : "")
                        }
                        style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }}
                      />
                    ))}
                  </div>
                  <div className="qd-status" aria-live="polite">
                    {denied ? (
                      <span className="qd-status-error">No mic access</span>
                    ) : muted ? (
                      <span className="qd-status-muted">Muted</span>
                    ) : !online ? (
                      <span className="qd-status-error">No internet</span>
                    ) : isControlled && controlledStatus === "transcribing" ? (
                      <span className="qd-status-listening">Processing</span>
                    ) : recordError ? (
                      <span className="qd-status-error">Mic not available</span>
                    ) : !recordingSupported ? (
                      <span className="qd-status-error">
                        Voice not supported here
                      </span>
                    ) : (
                      <span className="qd-status-listening">Listening</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleAccept}
              aria-label="Insert dictation"
              disabled={acceptDisabled}
              className="qd-action qd-action-accept"
            >
              <CheckGlyph />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
