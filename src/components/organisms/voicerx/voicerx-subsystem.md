# VoiceRx subsystem — voice-to-EMR

> **Scope:** the entire voice consultation feature in `src/components/organisms/voicerx/` — recorders, transcript flow, audio model, the single-mic invariant.
> **Audience:** frontend devs (touching anything voice), designers (brand language + voice-state visuals), backend devs (transcript ingestion + structuring contract — pair with `../../../../integration.md`), product managers (what voice does in the product, mode flow), AI assistants (must read before adding any mic / transcript surface anywhere in the app).
> **Read when:** building a voice surface, wiring transcripts into the Rx form, debugging a "second mic accidentally activates" bug, or estimating effort on a voice feature.
> **Sibling docs:** [`../organisms-map.md`](../organisms-map.md) · [`../rxpad/rxpad-subsystem.md`](../rxpad/rxpad-subsystem.md) · [`../rxpad/dr-agent/docs/dr-agent-docs-index.md`](../rxpad/dr-agent/docs/dr-agent-docs-index.md).

The voice consultation experience. Mounted at `/rxpad/voice`.
Doctors dictate; the system transcribes; the structured Rx body
fills in.

---

## What this folder owns (in three sentences)

1. **The full-screen "Active Agent" panel** that runs during a voice
   consultation — waveform, live transcript, mic toggle, end-visit CTA.
2. **The reusable `VoiceRxModuleRecorder`** — the same UI, used inline
   by RxPad sections (per-section dictation) and per-cell mics
   (transcript fills only one cell).
3. **The plumbing** that makes voice safe: a single-mic invariant via
   `useRxPadSync().activeVoiceModule`, a live Rx-preview link, audio
   helpers, and Web Speech API hooks.

---

## File map

| File | Lines | Role |
|---|---|---|
| `VoiceRxFlow.jsx` | ~580 | Entry point for `/rxpad/voice`. Composes the secondary sidebar, RxPad, and AI brand panel inside `<TPRxPadShell>`. |
| `VoiceRxActiveAgent.jsx` | ~1,080 | The big in-visit voice surface — full canvas with siri waveform, transcript card, end-visit confirmation, kebab menu, mode chip. |
| `VoiceRxModuleRecorder.jsx` | ~840 | Compact recorder used inline by sections and per-cell mics. Same vocabulary (waveform + transcript + submit/cancel) at a smaller scale. |
| `VoiceTranscriptProcessingCard.jsx` | ~440 | "Structuring your clinical notes…" state shown after submit while the structuring engine runs. |
| `VoiceRxResultTabs.jsx` | ~550 | Tabbed final review. |
| `VoiceRxCanvas.jsx` | ~350 | Animated stage that hosts the active agent + result tabs. |
| `VoiceRxBottomSheet.jsx` | ~250 | Small mobile-style bottom sheet shim. |
| `VoiceRxMiniFab.jsx` | ~430 | Persistent mini-FAB shown while a recorder is open elsewhere. |
| `VoiceRxSiriWaveform.jsx` | ~280 | Live audio waveform analyser visualization. |
| `VoiceRxLoaderCard.jsx` | ~125 | Branded loader card used during AI processing. |
| `VoiceTranscriptCard.jsx` | ~105 | Static transcript card (used during processing). |
| `ClinicalNotesEditor.jsx` | ~160 | TipTap rich-text editor for free-form clinical notes. |
| `RxPreviewSidebar.jsx` | ~125 | Right-side drawer that shows the live Rx preview during the consultation. Subscribes to `useComposedRxPreviewSnapshot()`. |
| `VoiceRxBrandIcon.jsx` | ~45 | The VoiceRx brand glyph. |
| `voice-consult-icons.jsx` | ~90 | Consult-mode icon set (ambient / dictation). |
| `audio.js` | ~165 | Audio synth helpers — start chime, submit chime, error chime. |
| `utils.js` | ~60 | Loader caption rotations, demo transcripts, consult labels, brand icon helpers. |
| `use-live-transcript.js` | ~205 | Web Speech API hook → live transcript stream + final-results aggregation. |
| `use-net-connection.js` | ~80 | Network connection + online/offline state hook. |

---

## Key flows

### A. Full voice consultation (`/rxpad/voice`)
```
User clicks "Start consultation"
  └── VoiceRxFlow renders <VoiceRxActiveAgent>
        └── useLiveTranscript starts SpeechRecognition
              └── Waveform animates from getUserMedia analyser
              └── Transcript appends as user speaks
        └── On submit:
              └── activeAgent unmounts
              └── VoiceTranscriptProcessingCard appears
              └── Engine structures the transcript
              └── VoiceRxResultTabs shows final structured Rx
              └── User can copy → RxPad form (rxpad-sync-context)
```

### B. Section-level mic (one button per Rx section)
```
User clicks the wave-icon in the Symptoms section header
  └── RxPadSection bubbles onVoiceClick → RxPadFunctional
        └── voiceModuleId set → EditableTableModule shows
            <VoiceRxModuleRecorder sectionLabel="Symptoms">
        └── Recorder mounts → setActiveVoiceModule("Symptoms")  ← VOICE-LOCK
              └── Other section mics auto-disable.
        └── On submit, recorder hands transcript back.
              The form structures it and adds rows.
```

### C. Per-cell mic (NOTE column on built-in modules; every cell on custom modules)
```
User clicks a free-form cell → cell becomes active → mic glyph appears
User taps the mic
  └── EditableTableModule.startCellRecording({rowId, colKey})
        └── Hides the mic + the blue focus ring on that cell.
        └── Wraps the cell in <ShineBorder> (animated gradient).
        └── Mounts <VoiceRxModuleRecorder sectionLabel="Surgery · Note">
              → setActiveVoiceModule("Surgery · Note")  ← VOICE-LOCK
              → all other cell mics + module mics disable.
        └── On submit, transcript appends to that cell's value.
        └── On cancel, cell unchanged.
```

---

## The voice-lock rule

**Only one mic can be active at any time.** This is enforced by the
`activeVoiceModule` field on `useRxPadSync()`:

- Every recorder UI sets it on mount and clears on unmount.
- Any UI that exposes a mic checks `activeVoiceModule` and disables
  itself when another module's session is live.
- The shared `<SecondarySidebar>` watches it to paint the recording
  red-dot on the right tab (and only on the right tab — see the
  `SIDEBAR_VOICE_LABELS` map there).

If you add a new mic anywhere, **always** call `setActiveVoiceModule`
on mount/unmount or render `<VoiceRxModuleRecorder>` (which does it
for you).

---

## How transcripts reach the Rx form

The data bus is `rxpad-sync-context.jsx`:

```js
const { publishSignal, lastSignal, requestCopyToRxPad } = useRxPadSync();

// Voice surface signals "section focused":
publishSignal({ type: "section_focus", sectionId: "vitals" });

// Voice surface fans copy to the Rx form:
requestCopyToRxPad({ symptoms: ["Fever (3 days, High)"], ... });
```

`RxPadFunctional` listens for `lastCopyRequest` and merges payloads
into the appropriate row state. This is also how Dr.Agent's
"Copy to RxPad" buttons land their data.

---

## Design language

- **Brand gradient:** `linear-gradient(135deg, #D565EA 0%, #673AAC 55%, #1A1994 100%)`. Used on mic icon, ShineBorder, AI captions.
- **Voice-active surface:** white card with violet/indigo shimmer border (`<ShineBorder>`).
- **Transcript text:** Inter / 14 px / 22 line-height / `var(--tp-slate-700)`.
- **Caption carousel:** rotates animated AI-gradient text every 2 s during processing.

---

## Audio model

- `useLiveTranscript` opens `window.SpeechRecognition`/`webkitSpeechRecognition` with `continuous: true`, `interimResults: true`, locale `en-IN`.
- Final-results chunks are aggregated and pushed to the consumer via callback.
- Waveform amplitude is fed via `MediaStream` → `AudioContext` → analyser, sampled per `requestAnimationFrame`.
- Sounds (`audio.js`) use a small synth (no audio file assets).

---

## Testing voice locally

1. Use Chromium-based browser (Web Speech API).
2. Allow microphone permission when prompted.
3. Open `/rxpad/voice` and click the FAB or the section mic.
4. If your environment has no mic / no internet recognition, the
   recorder still mounts but no transcript appears — gracefully
   degrades.

---

## "Why aren't these files in `molecules/`?"

This is a fair question — the folder has **a real mix**. Some files
genuinely couple to voice / recording state and belong here. Others
are *molecule-shaped* and only carry the `VoiceRx` prefix because of
where they were born. The honest audit is below; we keep the
candidates here for now to avoid churning a working app, but the
queue is explicit.

Apply the molecule test from [`../../component-library.md`](../../component-library.md):

> *Would I ship this in a generic `@tatvapractice/ui` npm package? If no, it's an organism.*

### Stays here — genuine voice / brand coupling

| File | Why it stays |
|---|---|
| `VoiceRxBrandIcon.jsx` | The VoiceRx brand mark. Promotion would just rename it. |
| `voice-consult-icons.jsx` | Ambient / dictation mode glyphs — meaningful only inside the consult flow. |
| `VoiceRxBottomSheet.jsx` | Imports `voice-consult-icons`. Voice-specific by content. |
| `VoiceRxMiniFab.jsx` | Persistent FAB only meaningful while a voice session is live — reads `activeVoiceModule`. |
| `VoiceRxLoaderCard.jsx` | Caption hints (`VOICE_RX_LOADER_HINTS`) are voice-flavored. Card shell is generic but coupled to those strings. |
| `RxPreviewSidebar.jsx` | Subscribes to `rx-preview-store` — domain-coupled to RxPad. |
| `VoiceRxFlow.jsx`, `VoiceRxActiveAgent.jsx`, `VoiceRxModuleRecorder.jsx`, `VoiceRxResultTabs.jsx`, `VoiceTranscriptProcessingCard.jsx`, `VoiceRxCanvas.jsx` | The flow itself + heavy stateful surfaces — clearly organisms. |

### Candidates for promotion to `molecules/` (queued, not yet moved)

These are honest false-positives — molecule-shaped, currently named with a misleading `VoiceRx` prefix. We move them when a **second consumer** appears (the rule that prevents premature abstraction).

| File | Generic name when promoted | What's needed |
|---|---|---|
| `VoiceTranscriptCard.jsx` | `molecules/TranscriptCard` | Drop the `Mic` icon coupling (pass icon as prop). Strip "VoiceRx" copy. |
| `VoiceRxSiriWaveform.jsx` | `molecules/AudioWaveform` | Already takes a `MediaStream` as a prop — purely presentational. Just rename + relocate. |
| `ClinicalNotesEditor.jsx` | `molecules/RichTextEditor` | Pull clinical placeholder copy out into props. |

### How to decide for a *new* file

Use the prefix-as-shorthand rule:

- **Name starts with `VoiceRx*`** → it carries the brand. Stays here.
- **Name starts with `Voice*` (no `Rx`)** → check coupling. If it touches `MediaStream`, `SpeechRecognition`, or `useRxPadSync`, it stays. If not, it's a candidate for promotion.
- **No voice term in name** → it almost certainly belongs in `molecules/` or `atoms/`. Don't add it here just because the file you're working in lives here.

### CSS modules in this folder

Six `.module.scss` files live next to their `.jsx` (e.g.
`VoiceRxActiveAgent.module.scss`). That's the project-wide convention
and not a smell — colocated SCSS Modules are how every component
ships its styles (see [`../../component-library.md`](../../component-library.md) §Naming).
The only thing to watch: keep them **scoped** (CSS Modules already do
this) — never use plain `.scss` files that leak into global scope.

## Cross-references

- `../rxpad/rxpad-sync-context.jsx` — the data bus.
- `../rxpad/rx-preview-store.js` + `rx-preview-composer.js` — live preview.
- `../rxpad/form/EditableTableModule.jsx` — owns the per-cell mic.
- `../rxpad/rxpad-subsystem.md` — RxPad consultation feature overview.
- `../rxpad/dr-agent/docs/dr-agent-docs-index.md` — AI panel index; it consumes voice signals.
- `../../../../engineering.md` §5 — top-down data-flow diagram.
- `../../../../integration.md` — backend hand-off shapes.
