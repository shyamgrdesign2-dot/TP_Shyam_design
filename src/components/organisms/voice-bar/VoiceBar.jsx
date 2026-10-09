"use client";

/**
 * VoiceBar — global floating dictation strip.
 *
 * Activated by double-tapping Shift (see VoiceBarProvider). Slides up from
 * the bottom-center of the viewport. While open: starts Web Speech recognition
 * immediately, draws a live wave animation, and shows interim transcript
 * scrolling inline. Accept (✓ / Enter) routes the final transcript to the
 * input the doctor was previously focused on; if none, copies to clipboard
 * AND pops the after-dictation popover for confirmation.
 *
 * Visual: black "dynamic island" with NO white inner panel — the white wave
 * and white status text sit directly on the black shell. Action layout, left
 * → right: [✕ cancel] · [mic-mute (only when permission denied)] · [wave +
 * status (transparent)] · [✓ accept].
 *
 * On ✓ click: enters a "processing" state — wave + status are swapped for a
 * spinner + "Processing…" — for a short beat before the bar closes. Gives
 * the doctor immediate feedback that the dictation was caught.
 *
 * Design rules followed (see CLAUDE.md):
 *   • Even-pixel sizing throughout (12 / 14 / 16 / 20 / 24 / 28 / 36 / 44).
 *   • Tokens via var(--tp-*) — no hardcoded hex outside SCSS.
 *   • 44px touch targets (iPad HIG).
 *   • iconsax-reactjs Linear icons inside chrome.
 *   • brand-violet reserved for the active state (recording).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MicrophoneSlash, Microphone2 } from "iconsax-reactjs";
import { Check, X, Undo2, ChevronDown } from "@/src/components/atoms/icons/lucide";
import { toast } from "@/src/components/molecules/Toaster";
import { cn } from "@/src/hooks/utils";
import { useVoiceBar } from "./voice-bar-context";
import styles from "./VoiceBar.module.scss";

const WAVE_BAR_COUNT = 22;
const CANCEL_UNDO_WINDOW_MS = 10000;
// Time the bar stays in the "Processing…" state after ✓ before actually
// closing. Long enough for the spinner to register as feedback, short enough
// to stay out of the doctor's way.
const PROCESSING_HOLD_MS = 700;

export function VoiceBar() {
  const { isOpen, close, route } = useVoiceBar();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Web Speech transcript ──────────────────────────────────────────────────
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState(null);
  const [micDenied, setMicDenied] = useState(false);
  const recogRef = useRef(null);

  // Post-accept processing state — swaps the wave/status area for a spinner
  // for ~700ms, then the bar closes.
  const [processing, setProcessing] = useState(false);

  // ── Mic switcher ───────────────────────────────────────────────────────────
  // The doctor can switch between any of their audio input devices mid-
  // dictation. The very act of switching tears down + recreates the stream,
  // which effectively acts as a mute/unmute too — so there is no separate
  // mute control. Devices are enumerated once on bar open; the chosen one
  // re-runs the stream effect via `activeDeviceId`.
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState("default");
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Track network availability so a "No internet" state can replace the
  // wave/status without us having to wait for the speech recognizer to time
  // out. navigator.onLine is unreliable on its own, but combined with the
  // network connection events it's good enough for a chip.
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Close the mic-switcher popover on click-outside / Escape.
  const switcherRef = useRef(null);
  useEffect(() => {
    if (!switcherOpen) return;
    const onDocClick = (e) => {
      if (switcherRef.current?.contains(e.target)) return;
      setSwitcherOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setSwitcherOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [switcherOpen]);

  // ── Cancel-undo flow ──────────────────────────────────────────────────────
  // When the user clicks ✕, we DON'T close — we pause recognition and show a
  // "Transcript cancelled · Undo" card with a 10-second reverse progress bar.
  // Undo within 10s resumes the recognizer with the existing transcript
  // intact; the timer expiring auto-closes and discards.
  const [cancelPending, setCancelPending] = useState(null); // null | { deadlineTs }
  const [undoProgressPct, setUndoProgressPct] = useState(100);
  // Stable handle to restart the recognizer from the Undo button — set by the
  // lifecycle effect below so we can call it from event handlers.
  const restartRecogRef = useRef(null);
  const stopRecogRef = useRef(null);

  // Audio amplitude for the wave bars. We tap getUserMedia for a tiny analyser
  // so the wave reacts to actual speaking volume, not just a fake sine.
  const levelsRef = useRef(new Array(WAVE_BAR_COUNT).fill(0));
  const [, forceRender] = useState(0);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);

  // ── Lifecycle: spin up on open, tear down on close ─────────────────────────
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

    // The autoRestart flag is flipped off when the user enters the cancel-
    // pending state so the recognizer's natural `onend` doesn't relaunch
    // recognition during the undo window.
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
        if (finalChunk) setFinalText((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
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
        try { recog.start(); } catch { /* ignore — bar closing */ }
      };
      try { recog.start(); } catch { /* ignore */ }
      recogRef.current = recog;

      stopRecogRef.current = () => {
        flags.autoRestart = false;
        try { recog.stop(); } catch { /* ignore */ }
      };
      restartRecogRef.current = () => {
        flags.autoRestart = true;
        try { recog.start(); } catch { /* recog may already be running */ }
      };
    }

    // Mic stream for the wave bars — re-runs whenever activeDeviceId
    // changes (via the dep array on this effect), giving us cheap mic
    // switching.
    let cancelled = false;
    (async () => {
      try {
        const constraints =
          activeDeviceId && activeDeviceId !== "default"
            ? { audio: { deviceId: { exact: activeDeviceId } } }
            : { audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        // Enumerate devices on first success — labels only come back AFTER
        // a permission grant, so this is the right moment to populate.
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) {
            setDevices(all.filter((d) => d.kind === "audioinput"));
          }
        } catch { /* enumerate is best-effort */ }
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
            for (let j = 0; j < stepBins; j++) sum += bins[i * stepBins + j] ?? 0;
            const avg = sum / stepBins / 255;
            next[i] = avg;
          }
          levelsRef.current = next;
          forceRender((n) => (n + 1) % 1000);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        // getUserMedia rejects with NotAllowedError / SecurityError when the
        // user (or policy) blocked mic access. Surface as the muted state.
        const name = err?.name || "";
        if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
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
        try { recogRef.current.stop(); } catch { /* ignore */ }
        recogRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => { /* ignore */ });
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [isOpen, activeDeviceId]);

  // ── Accept / cancel ───────────────────────────────────────────────────────
  // ✓ → enter processing state for a short beat (gives the doctor visible
  // feedback), then route the transcript + close.
  const handleAccept = useCallback(() => {
    if (processing) return;
    const text = (finalText + (interimText ? ` ${interimText}` : "")).trim();
    // Freeze recognition immediately so no new tokens land while the spinner
    // is showing — what you see in the chip IS what gets routed.
    stopRecogRef.current?.();
    setProcessing(true);
    window.setTimeout(() => {
      const kind = route(text);
      close({ restoreFocus: true });
      if (kind === "clipboard") {
        // The popover already gives copy/close confirmation; surface a quiet
        // toast so the doctor sees the action was logged even if their eye
        // is elsewhere.
        toast.success("Copied dictation to clipboard");
      } else if (kind === "empty") {
        toast.info?.("Nothing captured — try again");
      }
    }, PROCESSING_HOLD_MS);
  }, [processing, finalText, interimText, route, close]);

  // ✕ → enter the cancel-pending state (10s undo window). Pauses recognition
  // but KEEPS the transcripts buffered so Undo restores them as-is.
  const handleCancel = useCallback(() => {
    if (processing) return;
    stopRecogRef.current?.();
    setInterimText("");
    setCancelPending({ deadlineTs: Date.now() + CANCEL_UNDO_WINDOW_MS });
  }, [processing]);

  // Undo within the 10s window: resume the recognizer with the prior
  // transcript still in state. The user can keep speaking.
  const handleUndoCancel = useCallback(() => {
    setCancelPending(null);
    setUndoProgressPct(100);
    restartRecogRef.current?.();
  }, []);

  // ✕ inside the cancel-pending card → skip the 10s wait and discard right
  // now. The auto-timer is a safety net for the indecisive doctor; once
  // they actively click ✕ again, we honor that as "I really meant cancel."
  const handleForceDiscard = useCallback(() => {
    setCancelPending(null);
    setUndoProgressPct(100);
    close({ restoreFocus: true });
  }, [close]);

  // Drive the 10s reverse progress bar. Compute remaining time off the
  // deadline (rather than ticking elapsed time) so background-tab pauses
  // don't drift the bar.
  useEffect(() => {
    if (!cancelPending) return;
    let raf = 0;
    const tick = () => {
      const total = CANCEL_UNDO_WINDOW_MS;
      const remaining = Math.max(0, cancelPending.deadlineTs - Date.now());
      const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
      setUndoProgressPct(pct);
      if (remaining <= 0) {
        setCancelPending(null);
        setUndoProgressPct(100);
        close({ restoreFocus: true });
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [cancelPending, close]);

  // Enter key from anywhere routes through accept (only outside cancel-pending).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (cancelPending) handleUndoCancel();
        else handleAccept();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleAccept, cancelPending, handleUndoCancel]);

  const displayTranscript = useMemo(() => {
    const live = (finalText + (interimText ? ` ${interimText}` : "")).trim();
    return live;
  }, [finalText, interimText]);

  if (!mounted || !isOpen) return null;

  const denied = micDenied;

  return createPortal(
    <div className={styles.host} role="region" aria-label="Voice dictation bar">
      <div className={styles.scrim} aria-hidden />

      <div className={cn(styles.bar, styles.barIn, cancelPending && styles.barCancelled)} role="dialog" aria-modal="false">
        {cancelPending ? (
          <>
            <button
              type="button"
              onClick={handleForceDiscard}
              aria-label="Discard now"
              className={styles.cancelCell}
            >
              <span className={styles.cancelMark}>
                <X size={20} strokeWidth={2.6} />
              </span>
            </button>
            <div className={styles.cancelText}>
              <span className={styles.cancelTitle}>Transcript cancelled</span>
              <span className={styles.cancelSub}>Undo to keep going — auto-discards in 10s.</span>
            </div>
            <button
              type="button"
              onClick={handleUndoCancel}
              aria-label="Undo cancel and resume dictation"
              className={cn(styles.undoBtn)}>
              <Undo2 size={14} strokeWidth={2.4} />
              <span>Undo</span>
            </button>
            <div className={styles.undoProgressTrack} aria-hidden>
              <div
                className={styles.undoProgressFill}
                style={{ width: `${undoProgressPct}%` }}
              />
            </div>
          </>
        ) : (
          <>
            {/* ── ✕ cancel — left edge ─────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Cancel dictation"
              disabled={processing}
              className={cn(styles.actionBtn, styles.actionCancel)}>
              <X size={16} strokeWidth={2.4} />
            </button>

            {/* ── 🎤 mic switcher — always present, doubles as the muted
                 indicator when permission is denied. Clicking opens a
                 small device list; picking one re-runs the audio stream
                 (the very act of switching also acts as mute/unmute). */}
            <div className={styles.switcherWrap} ref={switcherRef}>
              <button
                type="button"
                onClick={() => setSwitcherOpen((v) => !v)}
                aria-label={denied ? "Microphone blocked — switch device" : "Switch microphone"}
                aria-expanded={switcherOpen}
                className={cn(styles.actionBtn, styles.actionSwitcher, denied && styles.actionSwitcherMuted)}
              >
                {denied ? (
                  <MicrophoneSlash size={16} variant="Linear" color="currentColor" />
                ) : (
                  <Microphone2 size={16} variant="Linear" color="currentColor" />
                )}
                <ChevronDown size={12} strokeWidth={2.4} className={cn(styles.switcherChevron, switcherOpen && styles.switcherChevronOpen)} />
              </button>
              {switcherOpen && (
                <div className={styles.switcherMenu} role="menu">
                  <div className={styles.switcherEyebrow}>Microphone</div>
                  {devices.length === 0 && (
                    <div className={styles.switcherEmpty}>No devices found</div>
                  )}
                  {devices.map((d, i) => {
                    const isActive = d.deviceId === activeDeviceId
                      || (activeDeviceId === "default" && i === 0);
                    return (
                      <button
                        key={d.deviceId || i}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => {
                          setActiveDeviceId(d.deviceId || "default");
                          setSwitcherOpen(false);
                        }}
                        className={cn(styles.switcherItem, isActive && styles.switcherItemActive)}
                      >
                        <span className={styles.switcherDot} />
                        <span className={styles.switcherLabel}>
                          {d.label || `Microphone ${i + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Wave + status — sit DIRECTLY on the black shell ─────────── */}
            <div className={styles.signal}>
              {processing ? (
                <div className={styles.processing} aria-live="polite">
                  <span className={styles.spinner} aria-hidden />
                  <span className={styles.processingLabel}>Processing…</span>
                </div>
              ) : (
                <>
                  <div className={styles.wave} aria-hidden>
                    {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => {
                      const lvl = levelsRef.current[i] ?? 0;
                      const mid = Math.abs(i - WAVE_BAR_COUNT / 2) / (WAVE_BAR_COUNT / 2);
                      const emphasis = 1 - mid * 0.35;
                      const h = Math.max(0.10, Math.min(1, lvl * 1.3 * emphasis));
                      return (
                        <span
                          key={i}
                          className={cn(styles.waveBar, denied && styles.waveBarMuted)}
                          style={{ height: `${(h * 100).toFixed(0)}%` }} />
                      );
                    })}
                  </div>
                  <div className={styles.status} aria-live="polite">
                    {denied ? (
                      <span className={styles.statusError}>No mic access</span>
                    ) : !online ? (
                      <span className={styles.statusError}>No internet</span>
                    ) : speechError ? (
                      <span className={styles.statusError}>Mic not available</span>
                    ) : !speechSupported ? (
                      <span className={styles.statusError}>Voice not supported here</span>
                    ) : (
                      <span className={styles.statusListening}>
                        Listening<span className={styles.dots} aria-hidden>
                          <span /><span /><span />
                        </span>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── ✓ accept — FAR right, solid white pill ──────────────────── */}
            <button
              type="button"
              onClick={handleAccept}
              aria-label="Insert dictation"
              disabled={(!displayTranscript && !speechError) || processing || denied}
              className={cn(styles.actionBtn, styles.actionAccept)}>
              <Check size={16} strokeWidth={2.4} />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
