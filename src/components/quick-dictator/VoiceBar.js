// Quick Dictator — floating black "dynamic island" bar.
// Activated by double-Shift via VoiceBarProvider. Closes on single-Shift,
// Esc, ✕ (cancel-undo flow with 10s grace), or ✓ (route + processing
// state). Mic switcher exposes audio inputs and doubles as mute.

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { message } from "antd";
import { useVoiceBar } from "./voice-bar-context";
import "./quick-dictator.css";

const WAVE_BAR_COUNT = 22;
const CANCEL_UNDO_WINDOW_MS = 10000;
const PROCESSING_HOLD_MS = 700;

const CheckGlyph = (p) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    strokeWidth="2.4"
    {...p}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const XGlyph = (p) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    strokeWidth="2.4"
    {...p}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
const ChevronDown = (p) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="12"
    height="12"
    strokeWidth="2.4"
    {...p}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const MicGlyph = (p) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    strokeWidth="1.6"
    {...p}
  >
    <rect x="9" y="2" width="6" height="13" rx="3" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <path d="M12 19v3" />
  </svg>
);
const MicSlash = (p) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    strokeWidth="1.6"
    {...p}
  >
    <path d="M2 2l20 20" />
    <path d="M16 6.3V6c0-2.21-1.79-4-4-4S8 3.79 8 6v5" />
    <path d="M9 14.2c.73.81 1.79 1.31 2.96 1.31 2.21 0 4-1.79 4-4V11" />
    <path d="M4.35 9.65v1.7c0 4.22 3.43 7.65 7.65 7.65 1.45 0 2.81-.4 3.97-1.1" />
    <path d="M19.65 9.65v1.7c0 .94-.17 1.85-.49 2.69" />
    <path d="M12 19v3" />
  </svg>
);
const UndoGlyph = (p) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="14"
    height="14"
    strokeWidth="2.4"
    {...p}
  >
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
  </svg>
);

export function VoiceBar() {
  const { isOpen, close, route } = useVoiceBar();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState(null);
  const [micDenied, setMicDenied] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [cancelPending, setCancelPending] = useState(null); // { deadlineTs }
  const [undoProgressPct, setUndoProgressPct] = useState(100);

  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState("default");
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const recogRef = useRef(null);
  const restartRecogRef = useRef(null);
  const stopRecogRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const levelsRef = useRef(new Array(WAVE_BAR_COUNT).fill(0));
  const [, forceRender] = useState(0);
  const switcherRef = useRef(null);

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

  // Lifecycle — spin recognition + audio stream up on open / device change
  useEffect(() => {
    if (!isOpen) return;
    setFinalText("");
    setInterimText("");
    setSpeechError(null);
    setMicDenied(false);
    setCancelPending(null);
    setProcessing(false);

    const w = typeof window !== "undefined" ? window : null;
    const SR = w && (w.SpeechRecognition || w.webkitSpeechRecognition);
    const flags = { autoRestart: true };

    if (!SR) {
      setSpeechSupported(false);
    } else {
      const recog = new SR();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";
      recog.onresult = (e) => {
        let finalChunk = "";
        let interimChunk = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalChunk += t + " ";
          else interimChunk += t;
        }
        if (finalChunk)
          setFinalText((prev) =>
            prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()
          );
        setInterimText(interimChunk.trim());
      };
      recog.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setMicDenied(true);
          flags.autoRestart = false;
        } else if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
          setSpeechError(e.error);
        }
      };
      recog.onend = () => {
        if (!flags.autoRestart) return;
        try {
          recog.start();
        } catch (_) {}
      };
      try {
        recog.start();
      } catch (_) {}
      recogRef.current = recog;
      stopRecogRef.current = () => {
        flags.autoRestart = false;
        try {
          recog.stop();
        } catch (_) {}
      };
      restartRecogRef.current = () => {
        flags.autoRestart = true;
        try {
          recog.start();
        } catch (_) {}
      };
    }

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
        const stepBins = Math.floor(bins.length / WAVE_BAR_COUNT) || 1;
        const tick = () => {
          analyser.getByteFrequencyData(bins);
          const next = new Array(WAVE_BAR_COUNT);
          for (let i = 0; i < WAVE_BAR_COUNT; i++) {
            let sum = 0;
            for (let j = 0; j < stepBins; j++)
              sum += bins[i * stepBins + j] ?? 0;
            next[i] = sum / stepBins / 255;
          }
          levelsRef.current = next;
          forceRender((n) => (n + 1) % 1000);
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
          setSpeechError(err?.message || "Microphone unavailable");
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (recogRef.current) {
        recogRef.current.onend = null;
        try {
          recogRef.current.stop();
        } catch (_) {}
        recogRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [isOpen, activeDeviceId]);

  // Accept / cancel
  const handleAccept = useCallback(() => {
    if (processing) return;
    const text = (finalText + (interimText ? ` ${interimText}` : "")).trim();
    stopRecogRef.current?.();
    setProcessing(true);
    window.setTimeout(() => {
      const kind = route(text);
      close({ restoreFocus: true });
      if (kind === "clipboard") {
        message.success("Copied dictation to clipboard");
      } else if (kind === "empty") {
        message.info("Nothing captured — try again");
      }
    }, PROCESSING_HOLD_MS);
  }, [processing, finalText, interimText, route, close]);

  const handleCancel = useCallback(() => {
    if (processing) return;
    stopRecogRef.current?.();
    setInterimText("");
    setCancelPending({ deadlineTs: Date.now() + CANCEL_UNDO_WINDOW_MS });
  }, [processing]);

  const handleUndoCancel = useCallback(() => {
    setCancelPending(null);
    setUndoProgressPct(100);
    restartRecogRef.current?.();
  }, []);

  const handleForceDiscard = useCallback(() => {
    setCancelPending(null);
    setUndoProgressPct(100);
    close({ restoreFocus: true });
  }, [close]);

  // 10s undo progress
  useEffect(() => {
    if (!cancelPending) return;
    let raf = 0;
    let done = false;
    const tick = () => {
      if (done) return;
      const remaining = Math.max(0, cancelPending.deadlineTs - Date.now());
      const pct = Math.max(
        0,
        Math.min(100, (remaining / CANCEL_UNDO_WINDOW_MS) * 100)
      );
      setUndoProgressPct(pct);
      if (remaining <= 0) {
        done = true;
        close({ restoreFocus: true });
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      done = true;
      window.cancelAnimationFrame(raf);
    };
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
  const displayTranscript = (
    finalText + (interimText ? ` ${interimText}` : "")
  ).trim();
  const acceptDisabled =
    (!displayTranscript && !speechError) || processing || denied;

  return createPortal(
    <div
      className="qd-host"
      role="region"
      aria-label="Voice dictation bar"
      data-quickdict-no-shimmer="true"
      data-quickdict-no-block="true"
    >
      <div className="qd-scrim" aria-hidden />
      <div
        className={
          "qd-bar qd-bar-in " + (cancelPending ? "qd-bar-cancelled" : "")
        }
        role="dialog"
        aria-modal="false"
      >
        {cancelPending ? (
          <>
            <button
              type="button"
              onClick={handleForceDiscard}
              aria-label="Discard now"
              className="qd-cancel-cell"
              style={{ color: "#fff" }}
            >
              <span className="qd-cancel-mark">
                <XGlyph width="20" height="20" stroke="#fff" />
              </span>
            </button>
            <div className="qd-cancel-text">
              <span className="qd-cancel-title">Transcript cancelled</span>
              <span className="qd-cancel-sub">
                Undo to keep going, auto-discards in 10s.
              </span>
            </div>
            <button
              type="button"
              onClick={handleUndoCancel}
              aria-label="Undo cancel"
              className="qd-undo-btn"
              style={{ color: "#fff" }}
            >
              <UndoGlyph stroke="#fff" />
              <span style={{ color: "#fff" }}>Undo</span>
            </button>
            <div className="qd-undo-track" aria-hidden>
              <div
                className="qd-undo-fill"
                style={{ width: `${undoProgressPct}%` }}
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
              <button
                type="button"
                onClick={() => setSwitcherOpen((v) => !v)}
                aria-label={
                  denied
                    ? "Microphone blocked — switch device"
                    : "Switch microphone"
                }
                aria-expanded={switcherOpen}
                className={
                  "qd-action qd-switcher " +
                  (denied ? "qd-switcher-muted" : "")
                }
              >
                {denied ? <MicSlash /> : <MicGlyph />}
                <ChevronDown
                  className={
                    "qd-chev " + (switcherOpen ? "qd-chev-open" : "")
                  }
                />
              </button>
              {switcherOpen && (
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
                          setActiveDeviceId(d.deviceId || "default");
                          setSwitcherOpen(false);
                          message.success({
                            content: `Switched to ${label}`,
                            duration: 2,
                          });
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
                <div className="qd-processing" aria-live="polite">
                  <span className="qd-spinner" aria-hidden />
                  <span>Processing…</span>
                </div>
              ) : (
                <>
                  <div className="qd-wave" aria-hidden>
                    {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => {
                      const lvl = levelsRef.current[i] ?? 0;
                      const mid =
                        Math.abs(i - WAVE_BAR_COUNT / 2) /
                        (WAVE_BAR_COUNT / 2);
                      const emphasis = 1 - mid * 0.35;
                      const h = Math.max(
                        0.1,
                        Math.min(1, lvl * 1.3 * emphasis)
                      );
                      return (
                        <span
                          key={i}
                          className={
                            "qd-wave-bar " +
                            (denied ? "qd-wave-bar-muted" : "")
                          }
                          style={{ height: `${(h * 100).toFixed(0)}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="qd-status" aria-live="polite">
                    {denied ? (
                      <span className="qd-status-error">No mic access</span>
                    ) : !online ? (
                      <span className="qd-status-error">No internet</span>
                    ) : speechError ? (
                      <span className="qd-status-error">
                        Mic not available
                      </span>
                    ) : !speechSupported ? (
                      <span className="qd-status-error">
                        Voice not supported here
                      </span>
                    ) : (
                      <span className="qd-status-listening">
                        Listening
                        <span className="qd-dots" aria-hidden>
                          <span />
                          <span />
                          <span />
                        </span>
                      </span>
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
