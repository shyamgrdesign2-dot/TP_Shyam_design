"use client";

/**
 * WhisperBar — global floating dictation strip.
 *
 * Activated by double-tapping Shift (see WhisperBarProvider). Slides up from
 * the bottom-center of the viewport. While open: starts Web Speech recognition
 * immediately, draws a live wave animation, and shows interim transcript
 * scrolling inline. Accept (✓ / Enter) routes the final transcript to the
 * input the doctor was previously focused on; if none, copies to clipboard.
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
import { Microphone2 } from "iconsax-reactjs";
import { Check, X } from "@/src/components/atoms/icons/lucide";
import { toast } from "@/src/components/molecules/Toaster";
import { cn } from "@/src/hooks/utils";
import { useWhisperBar } from "./whisper-bar-context";
import styles from "./WhisperBar.module.scss";

const WAVE_BAR_COUNT = 22;

export function WhisperBar() {
  const { isOpen, close, route } = useWhisperBar();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Web Speech transcript ──────────────────────────────────────────────────
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState(null);
  const recogRef = useRef(null);

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

    const w = typeof window !== "undefined" ? window : null;
    const SR = w && (w.SpeechRecognition || w.webkitSpeechRecognition);
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
        // "no-speech" / "aborted" are transient and benign — swallow them.
        if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
          setSpeechError(e.error);
        }
      };
      recog.onend = () => {
        // Auto-restart while the bar is still open (recognition can hiccup).
        try { recog.start(); } catch { /* ignore — bar closing */ }
      };
      try { recog.start(); } catch { /* ignore */ }
      recogRef.current = recog;
    }

    // Mic stream for the wave bars
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
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
          // Force a re-render at animation rate for the bars
          forceRender((n) => (n + 1) % 1000);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!cancelled) setSpeechError(err?.message || "Microphone access denied");
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
  }, [isOpen]);

  // ── Accept / cancel ───────────────────────────────────────────────────────
  const handleAccept = useCallback(() => {
    const text = (finalText + (interimText ? ` ${interimText}` : "")).trim();
    const kind = route(text);
    close({ restoreFocus: true });
    if (kind === "clipboard") {
      toast.success("Copied dictation to clipboard");
    } else if (kind === "empty") {
      toast.info?.("Nothing captured — try again");
    }
  }, [finalText, interimText, route, close]);

  const handleCancel = useCallback(() => {
    close({ restoreFocus: true });
  }, [close]);

  // Enter key from anywhere routes through accept.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleAccept();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleAccept]);

  const displayTranscript = useMemo(() => {
    const live = (finalText + (interimText ? ` ${interimText}` : "")).trim();
    return live;
  }, [finalText, interimText]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={styles.host} role="region" aria-label="Voice dictation bar">
      {/* Subtle scrim — does NOT block clicks (the bar should never trap the
           clinician on the page); it just dims the rest of the UI a touch so
           the bar reads as the primary surface. */}
      <div className={styles.scrim} aria-hidden />

      <div className={cn(styles.bar, styles.barIn)} role="dialog" aria-modal="false">
        {/* ── Mic glyph with brand-violet pulsing dot ─────────────────────── */}
        <div className={styles.micCell} aria-hidden>
          <span className={styles.micRing}>
            <Microphone2 size={20} variant="Linear" color="currentColor" />
          </span>
          <span className={styles.micPulse} />
        </div>

        {/* ── Live wave bars — react to mic amplitude ─────────────────────── */}
        <div className={styles.wave} aria-hidden>
          {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => {
            const lvl = levelsRef.current[i] ?? 0;
            // Floor at 8% so silent moments still show a subtle baseline,
            // ceiling at 100%. Mid-band bars get a slight emphasis.
            const mid = Math.abs(i - WAVE_BAR_COUNT / 2) / (WAVE_BAR_COUNT / 2);
            const emphasis = 1 - mid * 0.35;
            const h = Math.max(0.08, Math.min(1, lvl * 1.3 * emphasis));
            return (
              <span
                key={i}
                className={styles.waveBar}
                style={{ height: `${(h * 100).toFixed(0)}%` }} />
            );
          })}
        </div>

        {/* ── Transcript — final in slate, interim in lighter slate ──────── */}
        <div className={styles.transcript} aria-live="polite">
          {speechError ? (
            <span className={styles.transcriptError}>{speechError}</span>
          ) : !speechSupported ? (
            <span className={styles.transcriptError}>
              Speech recognition isn’t supported in this browser
            </span>
          ) : displayTranscript ? (
            <>
              <span className={styles.transcriptFinal}>{finalText}</span>
              {interimText && (
                <>
                  {finalText && " "}
                  <span className={styles.transcriptInterim}>{interimText}</span>
                </>
              )}
            </>
          ) : (
            <span className={styles.transcriptHint}>Listening — speak naturally</span>
          )}
        </div>

        {/* ── Cancel × ──────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel dictation"
          className={cn(styles.actionBtn, styles.actionCancel)}>
          <X size={16} strokeWidth={2.4} />
        </button>

        {/* ── Accept ✓ — sends the transcript to the focused input or clipboard */}
        <button
          type="button"
          onClick={handleAccept}
          aria-label="Insert dictation"
          disabled={!displayTranscript && !speechError}
          className={cn(styles.actionBtn, styles.actionAccept)}>
          <Check size={16} strokeWidth={2.4} />
        </button>

        {/* ── Shortcut hint chip — fades the keyboard contract ────────────── */}
        <span className={styles.kbdHint} aria-hidden>
          <kbd className={styles.kbd}>⇧ ⇧</kbd>
          <span className={styles.kbdLabel}>to toggle · </span>
          <kbd className={styles.kbd}>⏎</kbd>
          <span className={styles.kbdLabel}>insert · </span>
          <kbd className={styles.kbd}>esc</kbd>
        </span>
      </div>
    </div>,
    document.body
  );
}
