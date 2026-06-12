"use client";

/**
 * VoiceRx audio helpers.
 *
 * Two responsibilities, kept colocated since both synthesize tones via
 * Web Audio API and are only used by the voicerx/ flow:
 *
 *   1. Submit confirmation tone (`playSubmitSound`)
 *      Two-note ascending blip (~180ms total) on a successful Submit
 *      press from the active agent. Reuses a single shared
 *      AudioContext so we don't leak resources on rapid presses.
 *
 *   2. Start / error session sounds (`playVoiceRxStartSound`,
 *      `playVoiceRxErrorSound`)
 *      Short two-tone cues at the beginning of a voice session and on
 *      transcription errors. Each call creates a new context that
 *      schedules its own close — these are infrequent enough that the
 *      shared-context optimisation isn't needed.
 *
 * Both halves respect `prefers-reduced-motion` as a hint to skip
 * non-essential audio cues. No external assets — kept tiny so the
 * bundle stays light.
 */

// ─── Shared context (used by playSubmitSound) ───────────────────────────────

let ctx = null;
function getContext() {
  if (typeof window === "undefined") return null;
  if (ctx && ctx.state !== "closed") return ctx;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

function shouldPlay() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  return !mq?.matches;
}

function tone(freq, startOffset, duration, gain = 0.06) {
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime + startOffset;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/**
 * Submit confirmation tone — two-note ascending blip (~180ms total).
 * Played on a successful Submit press from the active agent.
 */
export function playSubmitSound() {
  if (!shouldPlay()) return;
  // Resume the context if the browser auto-suspended it (autoplay
  // policy) — submit is a user gesture, so resume() succeeds here.
  const audio = getContext();
  if (audio?.state === "suspended") void audio.resume();
  tone(680, 0, 0.12, 0.05);
  tone(960, 0.07, 0.14, 0.05);
}

// ─── Session start / error sounds (own short-lived contexts) ────────────────

function getAudioContextCtor() {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? window.webkitAudioContext;
}

function scheduleClose(audioCtx, delayMs) {
  return window.setTimeout(() => {
    audioCtx.close().catch(() => {});
  }, delayMs);
}

export function playVoiceRxStartSound() {
  try {
    const AC = getAudioContextCtor();
    if (!AC) return;

    const audioCtx = new AC();
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.18, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(audioCtx.destination);

    const tones = [
      [880, 0],
      [1318.5, 0.06],
    ];

    for (const [freq, delay] of tones) {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(1, now + delay + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.5);
      osc.connect(gain).connect(master);
      osc.start(now + delay);
      osc.stop(now + delay + 0.55);
    }

    scheduleClose(audioCtx, 900);
  } catch {
    /* audio synthesis unavailable */
  }
}

/**
 * Time-limit heads-up cue — fires once when the recording-limit countdown bar
 * first appears (T-15s by default). Soft two-note descending warble in the
 * amber/warm range. Quieter than the error sound — it's a "heads up", not
 * a "something broke".
 */
export function playVoiceRxWarningSound() {
  try {
    if (!shouldPlay()) return;
    const AC = getAudioContextCtor();
    if (!AC) return;

    const audioCtx = new AC();
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.10, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.50);
    master.connect(audioCtx.destination);

    // Two-tone descending bell (E5 → B4) — warm, "attention please".
    const tones = [
      [659.25, 0],
      [493.88, 0.16],
    ];

    for (const [freq, delay] of tones) {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.9, now + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.34);
      osc.connect(gain).connect(master);
      osc.start(now + delay);
      osc.stop(now + delay + 0.36);
    }

    scheduleClose(audioCtx, 800);
  } catch {
    /* audio synthesis unavailable */
  }
}

/**
 * Critical-zone cue — fires once when the countdown enters the last
 * LIMIT_CRITICAL_MS window (T-5s by default). Single brief tick — subtle,
 * not alarming, so the doctor's eye snaps to the now-red bar without breaking
 * focus on whatever they're saying.
 */
export function playVoiceRxCriticalSound() {
  try {
    if (!shouldPlay()) return;
    const AC = getAudioContextCtor();
    if (!AC) return;

    const audioCtx = new AC();
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.08, now + 0.005);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    master.connect(audioCtx.destination);

    // Single short tick, sine — calmer than triangle/sawtooth.
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);            // A5
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.9, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.22);

    scheduleClose(audioCtx, 400);
  } catch {
    /* audio synthesis unavailable */
  }
}

export function playVoiceRxErrorSound() {
  try {
    const AC = getAudioContextCtor();
    if (!AC) return;

    const audioCtx = new AC();
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.12, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    master.connect(audioCtx.destination);

    const tones = [
      [587.33, 0],
      [466.16, 0.08],
    ];

    for (const [freq, delay] of tones) {
      const osc = audioCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + delay);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.9, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.28);
      osc.connect(gain).connect(master);
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    }

    scheduleClose(audioCtx, 700);
  } catch {
    /* audio synthesis unavailable */
  }
}
