# Engineering Reference

> How TatvaPractice (Dr.Agent / VoiceRx / RxPad) is wired. Read this
> alongside `design.md` (visual contract) and `integration.md` (backend hand-off).

---

## 1. Stack

- **Framework**: Next.js 16.1.6, App Router, Turbopack, React 19.2.4
- **Language**: JSX (TypeScript migration complete — all `.tsx`/`.ts` → `.jsx`/`.js` except `app/api/**`)
- **Styling**: SCSS Modules for new components; Tailwind CSS v4 still present in legacy components (being phased out)
- **State**: React local state + Context providers; no Redux/Zustand. Mock data lives in `engines/`
- **Audio**: Web Speech API (live transcript) + `MediaStream` analyser (waveform). No third-party recorder.
- **Animation**: `motion` (framer-motion) for staged transitions, CSS keyframes (`app/globals.css`) for everything else.
- **Icons**: `iconsax-reactjs` (primary), `lucide-react` (utility)
- **Rich text**: TipTap 3.x
- **Charts**: recharts 2.x

---

## 2. Directory map — where things live

```
src/                              ← canonical source (import from here)
  components/
    atoms/                        15 primitive UI components (Button, Input, Avatar…)
    molecules/                    17 composed UI components (Dialog, Tabs, Card…)
    organisms/                    Feature entry points (app/ pages import from here)
      rxpad.js                    → RxPadPage, EndVisitPage
      invisit/InvisitPage.jsx
      patient-details/PatientDetailsPage.jsx
      tp-appointment-screen/DrAgentPage.jsx
      doctor-agent/ai-brand.jsx
  tp-theme-provider.jsx           MUI ThemeProvider
  hooks/                          use-mobile, use-toast, use-touch-device
  vendor/magicui/                 ShinyText, ShineBorder

components/                       implementation layer
  tp-rxpad/                       RxPad + Dr.Agent feature (181 files)
    dr-agent/                     AI panel (cards, chat, shell, engines, hooks)
    secondary-sidebar/            Sidebar pills + content panels
    custom-modules/               Extensible Rx modules
    rxpad-sync-context.jsx        ← THE COPY-TO-RX DATA BUS
    RxPadFloatingAgent.jsx        workspace shell
  voicerx/                        Voice consultation (29 files)
  rx/rxpad/                       Prescription form sections (32 files)
  tp-ui/                          MUI-wrapped TP primitives (TPButton, TPDialog…)
  ui/                             shadcn shims → src/components/atoms|molecules
  design-system/                  Showcase components for /(docs) pages

app/                              Next.js pages (≤ 80 LOC each)
lib/                              Utilities + stores (cn, tokens, mui-theme, stores)
hooks/                            Shims → src/hooks/ (backward compat)
```

---

## 3. Surface map

| Route | Entry (in `src/organisms/`) | Implementation |
|---|---|---|
| `/` | → `/tp-appointment-screen` | — |
| `/tp-appointment-screen` | `DrAgentPage` + `AppointmentSnackbars` | `components/tp-appointment-screen/` |
| `/invisit` | `InvisitPage` → `VoiceRxFlow` | `components/voicerx/VoiceRxFlow.jsx` |
| `/rxpad` | `RxPadPage` | `components/tp-rxpad/RxPadPage.jsx` |
| `/rxpad/end-visit` | `EndVisitPage` | `components/tp-rxpad/EndVisitPage.jsx` |
| `/patient-details` | `PatientDetailsPage` | `components/patient-details/PatientDetailsPage.jsx` |
| `/print-preview` | `PrintPreviewPage` | `components/print-preview/PrintPreviewPage.jsx` |
| `/(docs)/*` | Design-system showcases | `components/design-system/` |

---

## 4. Component hierarchy (the bits that matter)

```
/invisit
└── VoiceRxFlow (components/voicerx/VoiceRxFlow.jsx)
    └── RxPadFloatingAgent
        └── TPRxPadShell
            └── VoiceRxFlowInner
                └── RxPadSyncProvider  ← context data bus
                    ├── DrAgentPanel   ← chat + voice panel (~2,400 LOC)
                    │   ├── 3D flip card
                    │   │   ├── FRONT: ChatThread + ChatInput
                    │   │   └── BACK:
                    │   │       ├── VoiceRxActiveAgent     (recording)
                    │   │       ├── VoiceTranscriptProcessingCard  (shiner)
                    │   │       └── VoiceRxCanvas          (review surface)
                    │   └── Shell: AgentHeader, PatientSelector, SessionHistoryDrawer
                    ├── RxPadFunctional  (prescription form)
                    └── SecondaryNavPanel (vitals / history / labs)
```

### Key entry points
- **`components/tp-rxpad/dr-agent/DrAgentPanel.jsx`** — owns chat thread, voice-rx state machine, panel chrome.
- **`components/tp-rxpad/rxpad-sync-context.jsx`** — the copy-to-RxPad data bus. The seam where voice/chat hands structured data to the form.
- **`components/voicerx/VoiceRxActiveAgent.jsx`** — recorder UI: mode pill, live transcript, mic controls, submit/cancel.
- **`components/voicerx/VoiceRxCanvas.jsx`** — post-submit review surface.
- **`components/tp-rxpad/dr-agent/cards/CardShell.jsx`** — canonical card chrome. Every Dr.Agent card uses this.

---

## 5. Data flow — voice consultation, end to end

```
[1] Doctor taps "Start with Voice"
        ↓
[2] DrAgentPanel.startVoiceRx()
        │  state: voiceRxRecording = true; flips 3D card to back face
        ↓
[3] VoiceRxActiveAgent mounts
        │  useMicStream → getUserMedia → MediaStream
        │  useLiveTranscript → Web Speech API → live text
        │  VoiceRxSiriWaveform → AudioContext analyser
        ↓
[4] Doctor speaks; transcript streams; waveform pulses
        ↓
[5] Doctor hits Submit
        │  state: voiceRxAwaitingResponse = true
        ↓
[6] submitVoiceRxRecording()  ← BACKEND SEAM (see integration.md §3)
        │  • Echoes chat bubble (user role) with transcript
        │  • setTimeout(simulated processing) — replace with HTTP call
        │  • buildPatientVoiceStructuredRx(patientId, transcript) → VoiceStructuredRxData
        │  • buildVoiceConsultSidebarBatch(...) → HistoricalUpdateBatch (DEFERRED)
        │  • Pushes assistant bubble: rxOutput.kind = "voice_structured_rx"
        │  • setVoiceRxResult({ structured, transcript, pendingSidebarBatch })
        ↓
[7] DrAgentPanel renders VoiceRxCanvas (back face stays flipped)
        ↓
[8a] "Copy all to EMR"
        │  • runCopyWithAura(copyAllPayload, { bulk: true }) → fans out to RxPad form
        │  • pushHistoricalUpdates(pendingSidebarBatch) → fans out to sidebar
        │  • Auras animate on filled fields
[8b] "Quick Edit" → clears canvas, restarts recording
[8c] "Back" → setVoiceRxResultMinimized(true); canvas preserved, card flips to chat
```

---

## 6. Core data shapes

Defined in `components/tp-rxpad/dr-agent/types.js` and `rxpad-sync-context.jsx`.

### `VoiceStructuredRxData`
```js
// What comes out of voice processing
{
  voiceText: string,                    // raw transcript
  sections: VoiceRxSection[],           // structured sections
  copyAllPayload: RxPadCopyPayload,     // ready to fan into the Rx form
}

// Each section:
{
  sectionId: "symptoms" | "examination" | "diagnosis" | "medication"
           | "advice" | "investigation" | "followUp" | "history" | "vitals" | "labs",
  title: string,
  tpIconName: string,                   // matches a TPMedicalIcon name
  items: [{ name, detail, abnormal }],
}
```

### `RxPadCopyPayload` — the Rx form fan-out shape
```js
{
  sourceDateLabel: string,    // "Voice consult" / "Lab report 12 Mar"
  targetSection?: NavItemId,  // which Rx section / sidebar tab
  symptoms?: string[],
  diagnoses?: string[],
  medications?: RxPadMedicationSeed[],
  advice?: string,
  followUp?: string,
  vitals?: RxPadVitalsSeed,
  // …see types.js for full list
}
```

### `HistoricalUpdateBatch` — sidebar fan-out shape
```js
// Partial<Record<NavItemId, [{ id, bullets, sourceCopyId, undoPayload }]>>
```

These three shapes are **the entire contract** between any data source (voice, OCR, agentic API) and the Rx form. Produce these shapes and the fan-out machinery works without touching component code.

---

## 7. State management

### Local state
Default for everything. `useState` / `useReducer`.

### Context providers
- **`RxPadSyncContext`** — the cross-cutting bus:
  - `requestCopyToRxPad(payload)` — fire-and-forget
  - `runCopyWithAura(payload, { bulk })` — with visual aura animation
  - `pushHistoricalUpdates(batch)` — fan-out to sidebar
  - `signals$`, `copyAllAuraActive`, `groundRow` — visual sync hooks
  - **Backend ingest point**: new data sources call `requestCopyToRxPad`

- **`CustomiseContext`** — RxPad customization panel state
- **`TemplateContext`** — Template selection

### What does NOT use context
Voice recording state, chat messages, card rendering — all props-only. Intentional; keeps surfaces testable.

---

## 8. ESLint boundary enforcement

`eslint.config.mjs` uses `eslint-plugin-boundaries` to enforce atomic design import direction:

| Layer | Can import from |
|---|---|
| `atoms/` | `vendor/`, `lib/` only |
| `molecules/` | `atoms/`, `lib/` only |
| `organisms/` | `atoms/`, `molecules/`, `ui-legacy/` (deprecation window) |
| `pages/` | All layers |
| `ui-legacy/` | `atoms/`, `molecules/`, `organisms/` |

All rules currently at `"warn"` during migration. Will become `"error"` at Phase 14.

---

## 9. Edge cases / silent error handling

| Condition | Behaviour |
|---|---|
| Mic permission denied | Inline empty-state with "Allow microphone" CTA. Submit disabled until resolved. |
| Mic silent / unplugged | Waveform idles. Transcript stays empty. Submit is no-op. |
| Web Speech API unsupported | Falls back to scripted demo transcript on submit. Real backend replaces this. |
| Offline | `NetSpeedChip` shows toast; recording continues; submit reconnects when online. |
| Patient switched mid-recording | `cancelVoiceRxRecording()` runs; transcript discarded; messages are per-patient. |
| Panel minimized mid-recording | Recording continues; pulse on floating chip indicates active session. |
| Back from canvas | State preserved (`voiceRxResultMinimized=true`); re-expand restores canvas + scroll. |

---

## 10. Migration status

| Phase | Status | What |
|---|---|---|
| 1–4 | ✅ Done | Docs, safety net, token unification, icon consolidation |
| 5–7 | ✅ Done | Atoms (15), molecules (17), vendor animate-ui |
| 8 | ✅ Done | God-file decomposition (RxPadFloatingAgent, DrAgentPanel, RxPadFunctional) |
| 9 | ✅ Done | Page rewiring to atomic components |
| 10–11 | ✅ Done | SCSS modules (atoms, molecules, voicerx, dr-agent components) |
| 12 | ✅ Done | TSX → JSX codemod (526 files, 0 failures) |
| 13 | ⏳ Pending | Tailwind removal (~5,800 className strings remaining) |
| 14 | ⏳ Pending | ESLint boundaries → errors; MUI removal audit |
| 15 | ⏳ Pending | Final dead code cleanup; delete deprecated layers |

Track 2 (design system npm package) is in a separate repo (`tatvapractice-ui`).
