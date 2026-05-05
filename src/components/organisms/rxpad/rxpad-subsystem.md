# RxPad subsystem — prescription pad consultation

> **Scope:** the entire RxPad feature tree in `src/components/organisms/rxpad/` — shell, form, sections, secondary sidebar, custom modules, templates, digitization, dr-agent, end-of-visit.
> **Audience:** frontend devs (the canonical map of the largest organism), designers (where each surface lives + how they compose), backend devs (the data bus + payload shapes that feed the form — pair with `../../../../integration.md`), product managers (the product surfaces a doctor sees during consult), AI assistants (must read before changing anything inside `rxpad/`).
> **Read when:** adding a section, customising the shell, wiring a backend payload into the form, debugging "why is data not landing in the Rx", or onboarding to RxPad.
> **Sibling docs:** [`../organisms-map.md`](../organisms-map.md) · [`./dr-agent/docs/dr-agent-docs-index.md`](./dr-agent/docs/dr-agent-docs-index.md) · [`../voicerx/voicerx-subsystem.md`](../voicerx/voicerx-subsystem.md).

The biggest organism subtree (~190 files). Owns the **prescription
pad experience**: the form, the customisation panel, templates,
custom doctor-defined modules, the secondary sidebar with patient
context, the AI brand panel (Dr.Agent), the live Rx preview, and
the end-of-visit summary.

This subsystem is shared by every consultation route: `/rxpad/voice`
(via `organisms/voicerx/VoiceRxFlow`), `/rxpad/type` (via
`organisms/typerx/`), and `/rxpad/end-visit`.

---

## Top-level surface

```
rxpad/
  TPRxPadShell.jsx              Composable shell — wraps CustomiseProvider +
                                 TemplateProvider + RxPadSyncProvider + layout.
                                 Every consultation flow renders inside this.
  EndVisitPage.jsx               /rxpad/end-visit page (signed Rx preview).
  RxCustomiseSidebar.jsx         Customise drawer — toggle sections + reorder.
  RxPreviewDocument.jsx          Print-style Rx document (used in print preview).
  RxPadSearchInput.jsx           Section search + add input chrome.

  rxpad-sync-context.jsx         🔥 THE DATA BUS between voice / Dr.Agent and
                                  the Rx form. `useRxPadSync()` exposes:
                                    – activeVoiceModule (single-mic invariant)
                                    – publishSignal / lastSignal
                                    – requestCopyToRxPad / lastCopyRequest
  customise-context.jsx          Customise panel state.
  customise-store.js             Section enable/disable + ordering store.
  template-store.js              Template selection state.
  rx-preview-store.js            In-memory snapshot of current Rx body
                                  (per patient, with localStorage rehydrate).
  rx-preview-composer.js         Hooks reading from rx-preview-store
                                  (`useComposedRxPreviewSnapshot`).
  historical-updates-from-payload.js
                                 Helpers that materialise prior-visit data.

  form/                          The Rx form itself.
    RxPad.jsx, RxPadFunctional.jsx
    RxPadSection.jsx             Per-section card (header + voice mic + content).
    EditableTableModule.jsx      Table-shaped section (Symptoms, Meds, Vitals…).
                                  Owns the per-cell mic + Web Speech recorder.
    CustomModuleTable.jsx        Doctor-defined free-form modules.
    RxPadAiOverlay.jsx           AI processing overlay over the form.
    VoiceRxSectionProcessing.jsx Inline "transcribing your dictation" state.
    per-patient-rxpad-data.js    Per-patient row state seed.
    rxpad-table-types.js, rxpad-table-utils.js

  sections/                      Sidebar section panels.
    PastVisitPanel, VitalsPanel, HistoryPanel, OphthalPanel,
    GynecPanel, ObstetricPanel, VaccinePanel, GrowthPanel,
    LabResultsPanel, MedicalRecordsPanel, FollowUpPanel
    CopyButton.jsx, ExpandedPanel.jsx, index.js

  dr-agent/                      AI brand panel (cards, chat, shell, engines).
                                  Has its own deep-dive specs at dr-agent/docs/.
                                  See dr-agent/docs/dr-agent-docs-index.md.

  secondary-sidebar/             Blue sidebar — pills + section-specific panels.
    NavPanel.jsx                 80px vertical nav rail (left).
    ContentPanel.jsx             250px content panel (right of NavPanel).
    SecondarySidebar.jsx         Top-level orchestrator.
    content/<Section>Content.jsx Per-section content panels.
    detail-shared.jsx            Bullet helper, GroupCard, sticky sub-headers.
    types.js                     Section ID enumeration.

  custom-modules/                Doctor-creatable Rx modules.
    CustomModulesDrawer.jsx      Picker drawer.
    CustomModuleEditor.jsx       Rename / icon / fields.
    ModuleIcon.jsx               Iconsax-driven icon resolver
                                  (consumes /api/iconsax-icon).

  templates/                     Saved-template system.
    TemplatesListSidebar.jsx, SaveTemplateSidebar.jsx
    template-context.jsx         `useTemplate()` provider.

  digitization/                  Schema adapters for incoming structured data.
    schema.js, adapters.js, mock-payload.js

  imports/                       Imported design assets (RxpadHeader, etc.).
```

---

## How the pieces compose

```
<TPRxPadShell>
  <CustomiseProvider>
    <TemplateProvider>
      <RxPadSyncProvider>      ← cross-feature data bus
        ├── <SecondarySidebar>     (left blue rail + content panels)
        ├── <RxPadFunctional>      (the form)
        │     └── <EditableTableModule>  (each section)
        │           └── <VoiceRxModuleRecorder>   (mounted on demand)
        ├── <DrAgentPanel>         (right AI panel — see dr-agent/docs/)
        ├── <RxCustomiseSidebar>   (mounted when user opens "Customise")
        └── <CustomModulesDrawer>  (mounted when user opens "Custom modules")
```

The voice flow swaps in `<VoiceRxFlow>` (see [`../voicerx/voicerx-subsystem.md`](../voicerx/voicerx-subsystem.md)) which renders `<TPRxPadShell>` and inserts the active-agent canvas above the form.

---

## Context providers and stores (don't lose these)

| Provider / store | File | What it owns |
|---|---|---|
| `<RxPadSyncProvider>` | `rxpad-sync-context.jsx` | Voice-lock (`activeVoiceModule`), AI signals (`publishSignal` / `lastSignal`), Copy-to-Rx (`requestCopyToRxPad` / `lastCopyRequest`). |
| `<CustomiseProvider>` | `customise-context.jsx` | Which sections are visible, their order, customise drawer open state. |
| `<TemplateProvider>` | `templates/template-context.jsx` | Currently selected template, save / load actions. |
| `customise-store.js` | (plain JS module) | Enabled/ordered sections, persisted to localStorage. |
| `template-store.js` | (plain JS module) | Saved templates list, persisted to localStorage. |
| `rx-preview-store.js` | (plain JS module) | Current Rx body snapshot per patient. Subscribers via `useRxPreviewSnapshot(patientId)` and the composer. |

Plain-JS stores expose `subscribe / getSnapshot / setX` so any
component (sidebar, preview, AI panel) can read or mutate without
prop-drilling.

---

## The single-mic invariant (voice-lock)

There is only ever **one** active voice surface in the app at a time.
This is enforced by `useRxPadSync().activeVoiceModule`:

- Module-level mic (RxPadSection header) — sets it on mount.
- Per-cell mic (NOTE column, custom modules) — sets it on mount.
- Global FAB / `<VoiceRxActiveAgent>` — sets it on mount.

Every other mic reads `activeVoiceModule` and disables itself when
something else is recording. The sidebar paints the recording red-dot
on the right tab, never multiple.

If you add a new mic anywhere, **always** call
`setActiveVoiceModule(label)` on mount and `setActiveVoiceModule(null)`
on unmount — or render `<VoiceRxModuleRecorder>` which does it for you.

---

## Copy-to-RxPad data flow

Both the AI panel (Dr.Agent) and the voice subsystem fan transcript
data into the Rx form via the same path:

```js
const { requestCopyToRxPad, lastCopyRequest } = useRxPadSync();

// Producer (voice / AI):
requestCopyToRxPad({
  symptoms: [{ name: "Fever", duration: "3 days", severity: "High" }],
  vitals:   { bp: "120/80", pulse: 78 },
});

// Consumer (RxPadFunctional):
useEffect(() => {
  if (!lastCopyRequest) return;
  mergePayloadIntoRows(lastCopyRequest);
}, [lastCopyRequest]);
```

The merge logic lives in `RxPadFunctional` and uses
`historical-updates-from-payload.js` for prior-visit data and
`digitization/adapters.js` for structured-payload shapes.

---

## Live Rx preview

`rx-preview-store.js` holds an in-memory snapshot of the body of the
current Rx, keyed by patient. Every section publishes its current
state to it. Consumers:

- `RxPreviewSidebar` (in `voicerx/`) — right-side drawer during voice consult.
- `RxPreviewDocument.jsx` — used in `/print-preview`.
- AI panel cards — to show what's already on the Rx.

Use the composer hook (`useComposedRxPreviewSnapshot`) instead of the
raw store; it handles the patient-id filter and merge order.

---

## Custom modules

Doctors can define their own Rx modules (free-form tables with custom
column headers + a doctor-chosen Iconsax icon). The flow:

1. **`CustomModulesDrawer`** lists existing custom modules + lets the doctor add a new one.
2. **`CustomModuleEditor`** captures name / icon / column headers.
3. **`ModuleIcon`** resolves the icon by name via **`/api/iconsax-icon`** — a server proxy that fetches one Iconsax glyph using a bearer key (`ICONSAX_API_KEY`) hidden in `.env.local`. The client never sees the key.
4. The new module renders inside `RxPadFunctional` as a `<CustomModuleTable>` — every cell is voice-enabled.

---

## Templates

Saved-template flow lives in `templates/`. The doctor opens the
template sidebar, picks a saved Rx layout, and the form pre-fills. The
provider (`TemplateProvider`) coordinates with `customise-store` to
restore section visibility and order at the same time.

---

## End-visit summary (`/rxpad/end-visit`)

`EndVisitPage.jsx` renders the signed Rx preview, the patient bill,
and the print / share CTAs. It reads from `rx-preview-store` for the
final Rx body and from a payment store for billing.

---

## Audit — what genuinely belongs here vs. what could move

Same honest pass we ran on `voicerx/`. Most of `rxpad/` is correctly
placed (it carries patient state, sync context, and prescription
domain knowledge), but a few files are molecule-shaped and only
named "Rx*" because of where they were born.

### Stays here — domain-coupled

`TPRxPadShell`, `RxPadFunctional`, `RxPadSection`,
`EditableTableModule`, `CustomModuleTable`, `RxCustomiseSidebar`,
`RxPreviewDocument`, `EndVisitPage`, every file under `sections/`,
`secondary-sidebar/`, `custom-modules/`, `templates/`, `digitization/`,
plus the contexts and stores. All of these read or mutate Rx
state, customise state, or sync context — true organisms.

### Candidates for promotion to `molecules/` (queued, not yet moved)

| File | Generic name when promoted | Why it could move |
|---|---|---|
| `RxPadSearchInput.jsx` | `molecules/SearchInput` | 33 lines, only imports `cn` + a `Search` icon. No domain coupling — purely a styled `<input>` with a leading icon. The `RxPad` prefix is misleading. |
| `form/RxPadAiOverlay.jsx` (partial) | — | Currently imports voice-flavored loader hints. The overlay shell is generic but the captions tie it to the voice flow. Stays for now; revisit if a non-voice AI overlay appears. |

### How to decide for a *new* file

- Touches `useRxPadSync`, `customise-store`, `template-store`, or `rx-preview-store` → organism. Stays under `rxpad/`.
- Reads patient data, prescription rows, or section state → organism.
- Pure visual / presentational with no Rx coupling → put it in `molecules/` (or `atoms/`). Don't park it here just because the consumer lives here.

### CSS modules in this folder

Most form / overlay components ship a colocated `.module.scss`
(`EditableTableModule.module.scss`, `RxPadAiOverlay.module.scss`,
etc.) — that's the project convention for scoped styles and is not a
smell. New components should follow the same pattern.

---

## Adding to the RxPad subtree

- **New section panel** → drop a `<NewSectionContent>` in `secondary-sidebar/content/` and a `<NewSectionPanel>` in `sections/`. Wire it into `secondary-sidebar/types.js` and `customise-store.js`.
- **New form module** → if it's a generic table, build off `EditableTableModule`. If it's free-form, register it as a custom module rather than baking it in.
- **New AI card / chat surface** → that lives in `dr-agent/`. Read [`dr-agent/docs/dr-agent-docs-index.md`](./dr-agent/docs/dr-agent-docs-index.md) before designing one — there's a 15-doc spec set.
- **New voice surface** → see [`../voicerx/voicerx-subsystem.md`](../voicerx/voicerx-subsystem.md).

---

## Cross-references

- [`../organisms-map.md`](../organisms-map.md) — overall organism layout.
- [`../voicerx/voicerx-subsystem.md`](../voicerx/voicerx-subsystem.md) — voice subsystem.
- [`./dr-agent/docs/dr-agent-docs-index.md`](./dr-agent/docs/dr-agent-docs-index.md) — Dr.Agent panel spec set.
- `../../../../engineering.md` — overall app wiring + state diagram.
- `../../../../integration.md` — backend hand-off shapes.
- `../../../../design.md` — visual contract.
