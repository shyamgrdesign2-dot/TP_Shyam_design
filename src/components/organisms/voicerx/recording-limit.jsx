"use client";

import { useEffect, useRef } from "react";
import NumberFlow from "@number-flow/react";
import { cn } from "@/src/hooks/utils";
import { playVoiceRxWarningSound, playVoiceRxCriticalSound } from "./audio";
import styles from "./recording-limit.module.scss";

// ── Recording duration cap ────────────────────────────────────────────────────
// The two knobs below are the ONLY settings devs need to touch to change the
// VoiceRx recording session limit and the heads-up window.
//
//   MAX_RECORDING_MS    → the per-session cap.            (currently 1 min)
//   LIMIT_WARN_BEFORE   → countdown bar lead-time before  (currently 15s)
//                         the auto-submit fires.
//
// Examples:
//   • 2-minute session, warn at T-10s   → 2*60*1000, 10*1000
//   • 5-minute session, warn at T-20s   → 5*60*1000, 20*1000
//   • 10-minute session, warn at T-30s  → 10*60*1000, 30*1000
//
// See docs/RECORDING_AUTO_CUTOFF.md for the rationale + backend coordination.
export const MAX_RECORDING_MS  = 60 * 1000;   // 1 min (dev/QA cap — raise for prod)
export const LIMIT_WARN_BEFORE = 15 * 1000;  // 15s heads-up window
// Last few seconds — bar escalates from amber → red so the doctor knows the
// auto-submit is imminent. Pure CSS swap, no copy change, no extra anxiety.
export const LIMIT_CRITICAL_MS = 5 * 1000;

/**
 * useRecordingLimit — tracks elapsed time against the recording cap and fires
 * the auto-submit callback exactly once when the cap is reached.
 *
 * @param {object} opts
 * @param {number}   opts.elapsedMs     — current elapsed recording time in ms
 * @param {boolean}  opts.isListening   — true only when actively recording (not paused/errored)
 * @param {boolean}  [opts.isSubmitting=false] — true while a submit response is in-flight;
 *                                        resets the fire-guard when it returns to false
 * @param {function} opts.onSubmit      — called to trigger the auto-submit
 * @param {function} [opts.onAutoSubmit] — optional extra callback to signal auto-submit to parent
 *
 * @returns {{ remainingMs: number, showWarning: boolean, autoFired: boolean }}
 */
export function useRecordingLimit({ elapsedMs, isListening, isSubmitting = false, onSubmit, onAutoSubmit }) {
  const autoFiredRef = useRef(false);
  // Sound-cue guards — fire exactly once per transition (T-15 → warn,
  // T-5 → critical) so we don't re-play on every elapsedMs tick.
  const warnSoundFiredRef = useRef(false);
  const criticalSoundFiredRef = useRef(false);

  useEffect(() => {
    if (!isSubmitting) autoFiredRef.current = false;
  }, [isSubmitting]);

  // Reset sound guards whenever a new active session begins so the cues fire
  // again on subsequent recordings.
  useEffect(() => {
    if (!isListening) {
      warnSoundFiredRef.current = false;
      criticalSoundFiredRef.current = false;
    }
  }, [isListening]);

  useEffect(() => {
    if (!isListening || isSubmitting) return;
    if (elapsedMs < MAX_RECORDING_MS) return;
    if (autoFiredRef.current) return;
    autoFiredRef.current = true;
    onAutoSubmit?.();
    onSubmit?.();
  }, [elapsedMs, isListening, isSubmitting, onSubmit, onAutoSubmit]);

  const remainingMs = Math.max(0, MAX_RECORDING_MS - elapsedMs);
  const showWarning = isListening && !isSubmitting && remainingMs > 0 && remainingMs <= LIMIT_WARN_BEFORE;
  const isCritical = remainingMs > 0 && remainingMs <= LIMIT_CRITICAL_MS;

  // Audio cues — warning at T-15s (when the bar first appears), critical at
  // T-5s (when the bar swaps to red). Both fire once per session.
  useEffect(() => {
    if (showWarning && !warnSoundFiredRef.current) {
      warnSoundFiredRef.current = true;
      playVoiceRxWarningSound();
    }
  }, [showWarning]);

  useEffect(() => {
    if (isCritical && isListening && !isSubmitting && !criticalSoundFiredRef.current) {
      criticalSoundFiredRef.current = true;
      playVoiceRxCriticalSound();
    }
  }, [isCritical, isListening, isSubmitting]);

  return { remainingMs, showWarning, isCritical, autoFired: autoFiredRef.current };
}

/**
 * RecordingLimitWarning — scarcity countdown bar shown before the recording cap.
 * Uses NumberFlow for a smooth digit-flip transition as the seconds tick down.
 *
 * Layout: big animated `0:XX` countdown on the left (the eye magnet), copy on
 * the right, thin amber progress line beneath that depletes left → right.
 *
 * Callers control outer spacing via `className`.
 */
export function RecordingLimitWarning({ remainingMs, className }) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const maxMinutes = Math.round(MAX_RECORDING_MS / 60000);
  const maxLabel = maxMinutes >= 1
    ? `${maxMinutes} min`
    : `${Math.round(MAX_RECORDING_MS / 1000)}s`;
  const progress = Math.max(0, Math.min(1, remainingMs / LIMIT_WARN_BEFORE));
  const isCritical = remainingMs > 0 && remainingMs <= LIMIT_CRITICAL_MS;

  return (
    <div
      className={cn(
        styles.recordingLimitBar,
        isCritical && styles.recordingLimitBarCritical,
        className
      )}
      role="alert"
      aria-live="assertive">
      <div className={styles.recordingLimitRow}>
        {/* ── Big animated countdown — the focal element ─────────────────── */}
        <div className={styles.recordingLimitDigit} aria-hidden>
          <NumberFlow
            value={seconds}
            prefix="0:"
            format={{ minimumIntegerDigits: 2 }}
            trend={-1}
            transformTiming={{ duration: 600, easing: "cubic-bezier(0.22,1,0.36,1)" }}
            opacityTiming={{ duration: 300, easing: "ease-out" }}
            spinTiming={{ duration: 600, easing: "cubic-bezier(0.22,1,0.36,1)" }}
          />
        </div>

        {/* ── Copy — calm, confident, scan-in-a-second ───────────────────── */}
        <div className={styles.recordingLimitText}>
          <span className={styles.recordingLimitTitle}>
            Reaching time limit
          </span>
          <span className={styles.recordingLimitSub}>
            Auto-submitting at the{" "}
            <strong className={styles.recordingLimitSubStrong}>{maxLabel}</strong>
            {" "}mark · transcript stays safe
          </span>
        </div>
      </div>

      {/* ── Depleting progress line ─────────────────────────────────────── */}
      <div className={styles.recordingLimitTrack} aria-hidden>
        <div
          className={styles.recordingLimitFill}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
