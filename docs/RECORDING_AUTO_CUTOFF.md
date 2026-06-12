# VoiceRx Recording Auto-Cutoff

**Audience:** Frontend + Backend developers integrating the VoiceRx
recording-limit feature into other consultation surfaces or wiring it
into a real transcription backend.

**Status:** Shipped (dev/QA cap: **1 minute**, heads-up window: **15s**).
Configurable via two constants — see "Configuration" below.

---

## What this is

VoiceRx now enforces a maximum recording duration per session. When the
clinician approaches the cap:

1. **At T-15s** — a scarcity countdown bar slides in below the panel
   header showing a large NumberFlow-animated `0:XX` countdown, a calm
   amber palette, and a depleting progress line.
2. **At T-0s** — the session auto-submits exactly as if the doctor had
   tapped the Submit button (same payload shape: `{ durationMs }`).
3. **In the post-submit shiner loader** — a compact stacked note
   replaces the usual caption explaining the session hit the limit.
4. **In the results screen (`VoiceRxCanvas`)** — both the Clinical
   Notes coachmark and a new Transcript-tab sticky footer mention the
   auto-submit and prompt the user to start a new session.

Three places host the countdown bar:

| Surface | Component | Variant |
|---|---|---|
| Dr. Agent / VoiceRx main panel | `VoiceRxActiveAgent` | absolute, top-anchored under the mode-heading chip |
| Sidebar voice overlay (historical panels) | `VoiceRxModuleRecorder` (`stack`) | inline, above the transcript |
| Per-module quick voice (Rx form + sidebar Quick Edit) | `VoiceRxModuleRecorder` (`row`) | inline, in the transcript column |

All three render the **same** `RecordingLimitWarning` component, so a
single design / copy / palette change ships everywhere at once.

---

## Configuration

Three constants — and nothing else — control the feature. They live at
the top of `src/components/organisms/voicerx/recording-limit.jsx`:

```js
export const MAX_RECORDING_MS  = 60 * 1000;  // session cap
export const LIMIT_WARN_BEFORE = 15 * 1000;  // heads-up lead time
export const LIMIT_CRITICAL_MS =  5 * 1000;  // amber → red switch
```

### Common targets

| Production limit | `MAX_RECORDING_MS` | `LIMIT_WARN_BEFORE` | `LIMIT_CRITICAL_MS` |
|---|---|---|---|
| 2 minutes | `2 * 60 * 1000` | `15 * 1000` | `5 * 1000` |
| 5 minutes | `5 * 60 * 1000` | `20 * 1000` | `5 * 1000` |
| 10 minutes | `10 * 60 * 1000` | `30 * 1000` | `8 * 1000` |

The bar copy reads `Reaching time limit · Auto-submitting at the {maxLabel}
mark · transcript stays safe` and adapts automatically — no copy changes
needed when you change the cap. The Clinical Notes coachmark + Transcript
sticky note use the phrase "session limit" generically for the same reason.

### Why a 15s warning window + 5s critical zone

The 15s heads-up needs to be **long enough** for the doctor to:

- Notice the bar appearing (≈2s of visual orientation).
- Decide whether to wrap their current sentence or stop mid-thought.
- Wrap up cleanly without the digit ever feeling like an emergency.

10s is too short for sentence-wrapping on a 1 / 2 / 5-minute cap.
30s is too long and starts to read as nagging on a 1-minute cap.
**15s is the sweet spot** for the current 1-min QA limit; bump
proportionally if you raise the cap (rule of thumb: 1/4 of the cap,
capped at 30s).

The 5s critical zone (last LIMIT_CRITICAL_MS) escalates the bar from amber
to red and adds a soft pulse on the digit. This is a **pure CSS palette
swap** — no copy change, no extra anxiety, no layout reflow. The doctor
gets a stronger visual cue that the auto-submit is imminent.

### Visual states (bar)

| Time remaining | Background | Border | Digit | Sub-text strong | Pulse |
|---|---|---|---|---|---|
| 15s → 5s (amber) | `--tp-warning-50` | `--tp-warning-200` | `--tp-warning-600` | `--tp-warning-700` | no |
| 5s → 0s (critical) | red-50 (`#fef2f2`) | red-200 (`#fecaca`) | red-600 (`#dc2626`) | red-700 (`#b91c1c`) | yes — 1s ease-in-out infinite, ±4% scale |

---

## Frontend changes (what landed)

### New files

| File | Purpose |
|---|---|
| `src/components/organisms/voicerx/recording-limit.jsx` | Shared `useRecordingLimit` hook + `RecordingLimitWarning` component + the two config constants. |
| `src/components/organisms/voicerx/recording-limit.module.scss` | Amber-palette SCSS for the warning bar, NumberFlow digit styles, depleting progress line. |
| `docs/RECORDING_AUTO_CUTOFF.md` | This document. |

### New dependency

`@number-flow/react` (≈ 15 kB gzipped) — drives the smooth digit-flip
transition inside the countdown bar. No other runtime additions.

### Touched files

| File | What changed |
|---|---|
| `src/components/organisms/voicerx/VoiceRxActiveAgent.jsx` | Imports the shared hook + component. Auto-submit wires through the existing `onSubmit({ durationMs })` so the demo / processing flow runs end-to-end. Renders the bar inside the panel body using absolute positioning so it tucks under the mode-heading chip without pushing the transcript zone down. Renders the "Session limit reached" note at the **top of the shiner loader** (above the caption + progress bar) when `wasAutoSubmitted` is true. |
| `src/components/organisms/voicerx/VoiceRxActiveAgent.module.scss` | `.autoSubmitNote*` rules — vertical stack: `MAX TIME REACHED` pill on top, "Session limit reached" heading, body with `<strong>` highlights on "safely captured" and "new session". |
| `src/components/organisms/voicerx/VoiceRxModuleRecorder.jsx` | Imports the shared hook + component. Renders the bar as a **full-width absolute strip** pinned to the top of the recorder card (`z-30`) with a solid white scrim — internal layout never shifts, the card itself simply GROWS via conditional top padding (`pt-[80px]` row, `pt-[78px]` stack) when the warning is up. Exposes `onAutoSubmit` (for session-limit context) and `onWarningChange` (for parent overlays to grow taller). |
| `src/components/organisms/voicerx/audio.js` | Two new tones: `playVoiceRxWarningSound` (descending bell, fires once when the bar first appears at T-15s) and `playVoiceRxCriticalSound` (single descending tick, fires once when the bar enters the red zone at T-5s). Both wired inside `useRecordingLimit`. |
| `src/components/organisms/rxpad/form/RxPadFunctional.jsx` | `handleVoiceSubmit(moduleId, transcript, autoSubmitted)` — new third arg. Stored as `voiceModuleProcessing.wasAutoSubmitted`. Threaded into every child module call site. |
| `src/components/organisms/rxpad/form/EditableTableModule.jsx` + `CustomModuleTable.jsx` | Local `autoSubmittedRef` flagged on `onAutoSubmit`, read on `onSubmit`, forwarded via the new `onVoiceSubmit(transcript, autoSubmitted)` signature. New prop `voiceProcessingWasAutoSubmitted` threaded to `VoiceRxSectionProcessing`. |
| `src/components/organisms/rxpad/form/VoiceRxSectionProcessing.jsx` | New `wasAutoSubmitted` prop — renders the amber session-limit pill/title/body above the shiner card. |
| `src/components/organisms/rxpad/secondary-sidebar/detail-shared.jsx` | Tracks `recorderWarningVisible` via `onWarningChange` — **grows the bottom overlay from 40% → 58%** with a smooth `transition-[height]` so the strip lands at the top without compressing the recorder. Also threads `wasAutoSubmitted` into the post-submit `VoiceTranscriptProcessingCard`. |
| `src/components/organisms/voicerx/VoiceRxCanvas.jsx` | Coachmark copy on the Clinical Notes tab branches on `isAutoSubmitted`. New **dismissible** Transcript-tab sticky footer (gated on `isAutoSubmitted && !transcriptAutoNoteDismissed`) explaining the cutoff, with a session-only X dismiss. State resets when a new auto-submit session begins. Quick-Edit overlay tracks `quickEditWarningVisible` via `onWarningChange` and **grows from 40% → 58%** for the same reason as the sidebar overlay; passes `wasAutoSubmitted` to its `VoiceRxSectionProcessing`. |
| `src/components/organisms/voicerx/VoiceRxCanvas.module.scss` | `.autoSubmitTranscriptNote` palette (matches the existing coachmark). |
| `src/components/organisms/rxpad/dr-agent/shell/BackFace.jsx` | Stateful: tracks `wasAutoSubmitted`, threads it as `isAutoSubmitted` into `VoiceRxCanvas`. Resets when a new session begins (`voiceRxResult` clears). |
| `src/components/organisms/rxpad/dr-agent/hooks/useDrAgentPanel.js` | `submitVoiceRxRecording` now falls back to the curated demo transcript when the live transcript is empty (so auto-submit reaches the processing → results flow even with no mic input, e.g. in headless QA). |
| `package.json` | `@number-flow/react` added to `dependencies`. |

### State machine recap

```
elapsedMs (live tick, 250-500ms)
   │
   ▼
useRecordingLimit({ elapsedMs, isListening, isSubmitting, onSubmit, onAutoSubmit })
   │
   ├── remainingMs ─────────────────► RecordingLimitWarning (visible when showWarning)
   ├── showWarning ────────────────►  (remainingMs ≤ LIMIT_WARN_BEFORE && !isSubmitting)
   └── autoFired (ref-guarded) ────►  fires onSubmit + onAutoSubmit exactly once
```

The fire-guard (`autoFiredRef`) prevents double-firing because the
parent ticks `elapsedMs` every 250-500ms and React re-runs the effect
on every tick. It resets when `isSubmitting` returns to false (the
parent finished the previous submit cycle).

---

## Backend coordination

**Short answer:** No backend changes are strictly required for the
auto-cutoff itself — it's a pure frontend safety net. But there are
three integration points worth aligning on:

### 1. Session-duration ceiling on the API side (recommended)

The frontend cap is a UX guarantee — the user gets a smooth, predictable
cutoff. If your real-time transcription backend (Whisper / Deepgram /
in-house STT / etc.) also enforces a cap, **set the backend cap higher
than the frontend cap by at least 5-10 seconds**. That buffer absorbs
network latency between "frontend fires submit" and "backend receives
the final payload".

| Frontend `MAX_RECORDING_MS` | Recommended backend cap |
|---|---|
| 1 min (dev) | ≥ 70s |
| 2 min | ≥ 130s |
| 10 min | ≥ 615s |

If the backend cap is lower than the frontend cap, the user sees a
silent backend cutoff before the frontend countdown bar appears — bad
UX.

### 2. The submit payload shape did not change

`submitVoiceRxRecording` still receives `{ durationMs }` on both manual
submits and auto-submits. Backend handlers do not need to distinguish
between the two cases — the duration is the source of truth. If
analytics want to flag auto-submits separately, the frontend can pass
an explicit flag in the future; not currently in scope.

### 3. Telemetry hook (open question)

If you want to track how often clinicians hit the cap, add an analytics
call inside the `onAutoSubmit` callback in `BackFace.jsx`:

```jsx
onAutoSubmit={() => {
  setWasAutoSubmitted(true);
  // analytics.track("voicerx.session.auto_cutoff", { durationMs, mode })
}}
```

This is a one-line addition; intentionally left out of the initial ship
so we can pick the right analytics surface (mixpanel / amplitude / GA)
in a follow-up.

---

### Layout pattern — never compress, always grow

When the recording-limit strip appears, **existing content never shifts inside
its container**. The container ITSELF grows:

| Surface | Mechanism |
|---|---|
| `VoiceRxActiveAgent` (main panel) | Absolute strip at `top-[54px]`, content unchanged. The transcript zone is centred vertically and absorbs the strip naturally — nothing to grow. |
| `VoiceRxModuleRecorder` row variant (Rx form modules) | Absolute strip at `top-0`, inner content adds `pt-[80px]`. Card grows ~46px, submit/mic/transcript stay put. |
| `VoiceRxModuleRecorder` stack variant (sidebar + Quick Edit overlays) | Absolute strip at `top-0`, inner content adds `pt-[78px]`. PLUS the parent overlay container itself grows from `40%` → `58%` via `onWarningChange` so the recorder isn't clipped by its own overlay frame. |

Rule of thumb: any time you add a bar/banner inside a fixed-height overlay,
bubble its visibility up so the overlay can grow. Otherwise the bar overlaps
content that the user still needs to interact with.

## Audio cues

| Event | Sound | Helper |
|---|---|---|
| Bar first appears at T-15s | Two-tone descending bell (E5 → B4), ~340ms | `playVoiceRxWarningSound()` |
| Bar enters critical zone at T-5s | Single descending tick (A5 → E5), ~200ms | `playVoiceRxCriticalSound()` |
| Auto-submit fires at T-0s | Existing submit chime | `playSubmitSound()` |

All three respect `prefers-reduced-motion` and fail silently if the Web
Audio API is unavailable. The hook fires each cue **exactly once** per
session via a `useRef` guard; the guards reset when the recorder unmounts
or a new session begins.

## How to verify in dev

1. `npm run dev`, open `/rxpad/voice`.
2. Click "Start with Voice" → "Start conversation".
3. The session timer ticks up in the panel header. At **0:45**
   (elapsed = `MAX_RECORDING_MS - LIMIT_WARN_BEFORE`), the amber
   countdown bar slides in below the mode-heading chip.
4. At **0:60**, the panel auto-submits, the shiner loader appears
   with the "Session limit reached" stacked note, and after the
   loader completes you land on the results canvas.
5. On the Clinical Notes tab the coachmark mentions the time limit;
   on the Transcript tab a sticky footer note mentions it too.

Repeat with `MAX_RECORDING_MS = 30 * 1000` for a faster QA cycle.

---

## Open follow-ups (not blocking ship)

- **Analytics**: see backend section #3 above.
- **Per-mode caps**: today both `ambient_consultation` and
  `dictation_consultation` share the same constant. If product wants
  different caps per mode, change `MAX_RECORDING_MS` from a constant
  into a function and pass mode into `useRecordingLimit`.
- **Hard mic cutoff**: today we rely on the doctor's mic stream
  continuing to feed audio until the submit fires. If we want a true
  "mic goes silent at T-0", add a `stream.getAudioTracks().forEach(t =>
  t.stop())` in `onAutoSubmit`. Out of scope for v1 — current behavior
  matches manual-submit timing.
