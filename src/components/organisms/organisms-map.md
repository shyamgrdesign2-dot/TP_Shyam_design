# Organisms — feature map

> **Scope:** every feature tree under `src/components/organisms/` — RxPad, VoiceRx, TypeRx, shared chrome, providers.
> **Audience:** frontend devs (find the feature you're touching), product managers (what each surface represents in the product), backend devs (which organism consumes which API/payload — see `../../../integration.md`), AI assistants (locate domain ownership before changing UI).
> **Read when:** wiring a new feature, debugging cross-feature behaviour, or trying to find "where is X implemented?".
> **Deep-dives:** [`rxpad/rxpad-subsystem.md`](./rxpad/rxpad-subsystem.md) · [`voicerx/voicerx-subsystem.md`](./voicerx/voicerx-subsystem.md) · [`rxpad/dr-agent/docs/dr-agent-docs-index.md`](./rxpad/dr-agent/docs/dr-agent-docs-index.md).

Feature trees that compose atoms + molecules and carry **domain
knowledge** (prescriptions, voice recording, AI suggestions, patient
records). Organisms are the largest UI layer and the place where the
app's business logic surfaces.

> **Import rule:** organisms may import atoms, molecules, and other organisms (siblings or subtrees). They may consume context providers, stores, and feature data.

## Top-level layout

```
organisms/
  rxpad/         RxPad consultation experience (form, sidebar, AI panel,
                 templates, custom modules, end-visit page).
  voicerx/       Voice-to-EMR transcription subsystem.
  typerx/        Type-driven Rx flow — sibling of voicerx, shares rxpad.
  shared/        Cross-page chrome (top nav, patient header, banners).
  providers/     Context providers used at the root layout.
```

The five route-specific feature folders that used to live here
(`all-patients`, `follow-ups`, `patient-details`, `print-preview`,
`tp-appointment-screen`) have been **colocated under their routes** in
`src/app/<route>/` because they're consumed by exactly one URL each.
They live next to their `page.jsx` now.

---

## `organisms/rxpad/` — the prescription pad

The biggest subtree (~190 files). Three big surfaces compose it:

```
rxpad/
  TPRxPadShell.jsx           Composable shell — wraps CustomiseProvider +
                              TemplateProvider + layout + sidebars.
  EndVisitPage.jsx            End-of-visit summary (the /rxpad/end-visit page).
  RxCustomiseSidebar.jsx      Doctor-driven layout customization.
  RxPreviewDocument.jsx       Print-style Rx document.
  RxPreviewSidebar.jsx — actually in voicerx/ — the live in-flow preview.
  RxPadSearchInput.jsx        Search-and-add input chrome.

  rxpad-sync-context.jsx      🔥 THE DATA BUS between Dr.Agent / VoiceRx
                              and the Rx form. `useRxPadSync()`.
  customise-context.jsx       RxPad customization panel state.
  customise-store.js          Module enable/disable + ordering.
  template-store.js           Template selection state.
  rx-preview-store.js         Live snapshot of the current patient's Rx body
                              (in-memory + localStorage), with subscribers.
  rx-preview-composer.js      Hook + helpers reading from rx-preview-store.

  form/                       The Rx form.
    RxPad.jsx, RxPadFunctional.jsx
    RxPadSection.jsx          Per-section card with header + voice mic.
    EditableTableModule.jsx   Table-shaped section (Symptoms, Meds, etc.) —
                              owns the per-cell mic + Web Speech recorder.
    CustomModuleTable.jsx     Doctor-defined free-form modules.
    RxPadAiOverlay.jsx        AI processing overlay.
    VoiceRxSectionProcessing.jsx  Inline "we're transcribing your dictation"
                              state used while voice fills the section.

  sections/                   Sidebar section panels (PastVisitPanel,
                              VitalsPanel, HistoryPanel, OphthalPanel, etc.).
    sections-types.js         Shared types.
    sections-sample-data.js   Demo data for unwired backends.

  dr-agent/                   AI brand panel (cards, chat, shell, engines).
                              Has its own deep-dive docs at dr-agent/docs/.

  secondary-sidebar/          Blue sidebar pills + content panels.
    NavPanel.jsx              80px vertical nav rail.
    ContentPanel.jsx          250px section-specific content.
    SecondarySidebar.jsx      Top-level orchestrator.
    content/<Section>Content.jsx
    detail-shared.jsx         Bullet helper, GroupCard, sticky sub-headers.
    types.js                  Section ID enumeration.

  custom-modules/             Doctor-creatable Rx modules.
    CustomModulesDrawer.jsx   Picker drawer.
    CustomModuleEditor.jsx    Rename / icon / fields.
    ModuleIcon.jsx            Iconsax-driven icon resolver
                              (consumes /api/iconsax-icon).
  templates/                  Saved-template system.
    TemplatesListSidebar.jsx, SaveTemplateSidebar.jsx
    template-context.jsx      `useTemplate()` provider.

  digitization/               Schema adapters for incoming structured data.
    schema.js, adapters.js, mock-payload.js

  imports/                    Imported design assets (e.g. `RxpadHeader.jsx`).
```

**Key context providers and stores** (so you don't lose them):

- `<RxPadSyncProvider>` (in `rxpad-sync-context.jsx`) — the data bus between Dr.Agent / VoiceRx and the Rx form. Exports `useRxPadSync()`.
- `<CustomiseProvider>` (in `customise-context.jsx`) — section enable/disable + ordering.
- `<TemplateProvider>` (in `templates/template-context.jsx`) — template selection.
- `rx-preview-store.js` — in-memory snapshot keyed by patient. Subscribers via `useRxPreviewSnapshot(patientId)`.

> Deep-dive on the RxPad subsystem → [`rxpad/rxpad-subsystem.md`](./rxpad/rxpad-subsystem.md).
> Deep-dive on the AI brand panel → [`rxpad/dr-agent/docs/dr-agent-docs-index.md`](./rxpad/dr-agent/docs/dr-agent-docs-index.md) (15 specs covering cards, anatomy, intents, demo flow, sizing, response management).

---

## `organisms/voicerx/` — voice-to-EMR

> Full deep-dive → [`voicerx/voicerx-subsystem.md`](./voicerx/voicerx-subsystem.md)

Mounts the full voice consultation experience. Entry point:
`VoiceRxFlow.jsx` (rendered by `/rxpad/voice`).

```
voicerx/
  VoiceRxFlow.jsx              Entry — composes sidebar + RxPad + AI panel.
  VoiceRxActiveAgent.jsx       The big in-visit voice surface (waveform,
                                transcript, mic, end-visit CTA).
  VoiceRxModuleRecorder.jsx    Compact in-cell / in-section recorder.
  VoiceTranscriptProcessingCard.jsx  "Structuring your notes…" state.
  VoiceRxResultTabs.jsx        Final review tabs.
  VoiceRxCanvas.jsx            Animated stage hosting all the above.
  VoiceRxBottomSheet.jsx       Small mobile-style bottom sheet shim.
  VoiceRxMiniFab.jsx           Persistent mini FAB while recorder is open.
  VoiceRxSiriWaveform.jsx      Audio waveform visualizer.
  VoiceRxLoaderCard.jsx        Branded loading state used during AI work.
  VoiceTranscriptCard.jsx      Static transcript display.
  ClinicalNotesEditor.jsx      TipTap rich-text editor for free-form notes.
  RxPreviewSidebar.jsx         Right-side live Rx preview drawer.
  VoiceRxBrandIcon.jsx, voice-consult-icons.jsx  Voice consult glyphs.

  audio.js                     Audio synth helpers (start/stop/error chimes).
  utils.js                     Loader hints, demo transcripts, consult labels.
  use-live-transcript.js       Web Speech API hook → live transcript.
  use-net-connection.js        Network speed + online state hook.
```

---

## `organisms/typerx/` — type-driven Rx

Sibling of `voicerx/` for the `/rxpad/type` route. Reuses
`organisms/rxpad/` for the form and sidebar; differs in entry flow
and the absence of voice. Smaller surface (~1 file).

---

## `organisms/shared/` — cross-page chrome

```
shared/
  AppTopHeader.jsx             Slim top header used by some routes.
  SecondaryNavPanel.jsx        80px vertical nav rail (RxPad + dashboard).
  PatientActionsMenu.jsx       Kebab menu of per-patient actions.
  dashboard-nav-items.js       Dashboard left-rail menu items.
  doctor-agent/                Cross-page AI brand assets
                                (ai-brand.jsx, mock-agent.js).
```

---

## `organisms/providers/`

```
providers/
  tp-theme-provider.jsx        MUI `<ThemeProvider>` wrapper.
                                (Mounted in src/app/layout.jsx.)
```

---

## Adding an organism

1. Decide if your feature is single-route or cross-route.
   - **Single-route** → put it in `src/app/<route>/` next to `page.jsx`.
   - **Cross-route** → put it in `src/components/organisms/<feature>/`.
2. Build the component tree using atoms + molecules (don't reinvent
   primitives — search the catalogs first).
3. If your feature has its own state, create a context provider next
   to the entry component and a store file (plain JS module with
   subscribers, like `rx-preview-store.js`) for shared in-memory state.
4. Read the relevant deep-dive docs:
   - RxPad consultation feature → `rxpad/rxpad-subsystem.md`
   - Voice features → `voicerx/voicerx-subsystem.md`
   - Anything in the AI panel → `rxpad/dr-agent/docs/dr-agent-docs-index.md`

## Key cross-cutting concerns

| Concern | Where it lives |
|---|---|
| Voice-lock (single-mic invariant) | `rxpad/rxpad-sync-context.jsx` → `activeVoiceModule` |
| Live Rx preview | `rxpad/rx-preview-store.js` + `rx-preview-composer.js` |
| Custom modules + their icons | `rxpad/custom-modules/` |
| Templates | `rxpad/templates/` |
| AI signals (section focus, copy-to-Rx) | `rxpad/rxpad-sync-context.jsx` (`publishSignal`, `lastSignal`) |
