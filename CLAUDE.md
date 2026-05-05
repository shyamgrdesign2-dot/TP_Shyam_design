# VoiceRx-L (tp-voicerx)

Medical consultation workspace — RxPad, Dr.Agent AI assistant, VoiceRx
voice-to-EMR transcription, appointment management. Built for clinicians
on iPad and desktop.

## Stack

- **Next.js 16.1.6**, App Router, Turbopack, React 19.2.4
- **JSX** (TypeScript migration complete — all `.tsx`/`.ts` → `.jsx`/`.js` except `app/api/**`)
- **Tailwind CSS v4** (present but being phased out — new components use SCSS Modules)
- **UI primitives**: Radix UI (19 packages), MUI 7 (no direct MUI in product code)
- **Animation**: motion (framer-motion) 12.x, CSS keyframes in `app/globals.css`
- **Icons**: iconsax-reactjs (primary), lucide-react (utility)
- **Audio**: Web Speech API + MediaStream analyser (no third-party recorder)
- **State**: React local state + Context providers (no Redux/Zustand)
- **Rich text**: TipTap 3.x (prosemirror)
- **Charts**: recharts 2.x
- **Forms**: react-hook-form + zod

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build (26 static pages, 0 errors)
npm run start        # Serve production build
npm run lint         # ESLint (0 errors, ~115 pre-existing warnings)
```

## Directory layout

`src/` is the **single source of truth** for everything — including the
Next.js App Router. Project root has zero application code; only config
files live there. Inside `src/`, four top-level folders: `app/`,
`components/`, `design-system/`, `hooks/`.

```
src/                              # ALL application code lives here
  app/                            # Next.js App Router (URLs only — files are 3-25 line wrappers)
    layout.jsx                    # Root layout (fonts, TPThemeProvider, Toaster)
    globals.css                   # CSS custom properties + Tailwind v4 + keyframes
    page.jsx                      # Re-exports tp-appointment-screen as homepage
    rxpad/                        # RxPad consultation hub
      voice/page.jsx              # VoiceRx consultation (canonical in-visit route)
      end-visit/page.jsx          # End visit summary
      page.jsx                    # → redirect("/rxpad/voice")
    patient-details/              # Patient profile + history
    print-preview/                # Print Rx
    tp-appointment-screen/        # Appointments dashboard
    (docs)/                       # Internal design-system showcase pages
      _components/                # Showcase + demo components for /(docs) routes
                                  #   (route-private — Next.js _underscore convention)
    api/                          # API routes (TypeScript — kept as .ts)

  components/
    atoms/                        # 25 primitive UI components
      Button (with button-system/ tokens)
      MedicalIcon, Badge, Avatar, Divider, Skeleton, Spinner
      Input, Checkbox, Switch, Select, Radio, Slider, OTPInput
      Tooltip, Popover
      Progress, Chip, StatusBadge, Tag
      ShinyText, ShineBorder    # Animation effects (ex-magicui)
      NoiseOverlay, TutorialPlayIcon
      index.js                  # Barrel: import { Button, Badge } from "@/src/components/atoms"

    molecules/                  # 34 composed UI components
      Accordion, Alert, Banner, Snackbar, Toaster, FlashSnackbar
      Dialog, ConfirmDialog, Drawer, DropdownMenu, ContextMenu, Command
      Card, Tabs, Breadcrumbs, Pagination, Table
      ClinicalTabs, ClinicalTable
      SegmentedControl, EmptyState
      DateRangePicker, TimePicker, NumberInput, ColorPicker
      FileUpload, SearchFilterBar, Rating, Stepper, Timeline
      TransferList, TreeView, AppointmentBanner

    organisms/                  # Feature implementations — organized by page/route
      shared/                   # Cross-page reusable organisms
        SecondaryNavPanel.jsx   # 80px vertical nav rail (rx + primary variants)
        AppTopHeader.jsx        # Slim top header used by some routes
        PatientActionsMenu.jsx  # Per-patient kebab menu
        dashboard-nav-items.js  # Dashboard left-rail menu items
        doctor-agent/           # AI brand assets (ai-brand.jsx, mock-agent.js)
      rxpad/                    # ENTIRE RxPad consultation feature (~190 files)
        TPRxPadShell.jsx        # Composable shell (CustomiseProvider + TemplateProvider + layout)
        rxpad-sync-context.jsx  # ← THE COPY-TO-RX DATA BUS (useRxPadSync)
        customise-context.jsx   # Customise panel state
        customise-store.js      # Customise store
        template-store.js       # Template selection store
        EndVisitPage.jsx        # End-visit summary page
        RxCustomiseSidebar.jsx, RxPreviewDocument.jsx
        RxPadSearchInput.jsx    # Search input chrome
        rx-preview-composer.js, rx-preview-store.js
        historical-updates-from-payload.js
        form/                   # The prescription writing pad form (was rx/rxpad/)
          RxPad.jsx, RxPadFunctional.jsx, RxPadSection.jsx
          EditableTableModule.jsx, RxPadAiOverlay.jsx
          VoiceRxSectionProcessing.jsx, CustomModuleTable.jsx
          per-patient-rxpad-data.js, rxpad-table-types.js, rxpad-table-utils.js
        sections/               # Section panels (was rx/sections/)
          PastVisitPanel, VitalsPanel, HistoryPanel, OphthalPanel,
          GynecPanel, ObstetricPanel, VaccinePanel, GrowthPanel,
          LabResultsPanel, MedicalRecordsPanel, FollowUpPanel
          CopyButton.jsx, ExpandedPanel.jsx, index.js
        sections-types.js, sections-sample-data.js
        dr-agent/               # AI panel — cards, chat, shell, engines, hooks (~128 files)
        secondary-sidebar/      # Blue sidebar pills + content panels (~30 files)
        custom-modules/         # Extensible Rx modules
        templates/              # Rx templates system
        digitization/           # Schema adapters + mock payloads
        imports/                # Imported design assets (RxpadHeader, etc.)

      voicerx/                  # Voice consultation (~30 files)
        VoiceRxFlow.jsx         # ← Canonical in-visit page for /rxpad/voice
                                #   (FullscreenAiOverlay, VoiceRxLiveBorder inlined here)
        VoiceRxActiveAgent.jsx, VoiceRxModuleRecorder.jsx
        VoiceTranscriptProcessingCard.jsx, VoiceRxResultTabs.jsx
        VoiceRxCanvas.jsx, VoiceRxBottomSheet.jsx, VoiceRxMiniFab.jsx
        VoiceRxListeningFab.jsx, VoiceRxLoaderCard.jsx
        VoiceRxSiriWaveform.jsx, VoiceRxBlobVisualizer.jsx
        VoiceRxBrandIcon.jsx, voice-consult-icons.jsx
        VoiceTranscriptCard.jsx, NetSpeedChip.jsx
        ClinicalNotesEditor.jsx, RxPreviewSidebar.jsx
        audio.js                # Audio synth helpers (submit / start / error sounds)
        utils.js                # Loader hints, demo transcripts, consult labels
        use-live-transcript.js, use-net-connection.js

      tp-appointment-screen/    # Entry: DrAgentPage, AppointmentSnackbars
      patient-details/          # Entry: PatientDetailsPage, PatientDetailAgentPanel
      print-preview/            # Entry: PrintPreviewPage

    providers/
      tp-theme-provider.jsx     # MUI ThemeProvider wrapper

  design-system/                # Design tokens, SCSS foundation, theme
    tokens/                     # SCSS token definitions (8 files)
    mixins/                     # Reusable SCSS mixins (6 files)
    base/                       # Global reset + typography (3 files)
    theme/                      # MUI theme configuration
    design-tokens.js            # JS color/spacing constants
    component-tokens.js         # Component-level token groups

  hooks/                        # Shared React hooks + utilities
    use-mobile.js, use-toast.js, use-touch-device.js
    utils.js                    # cn() classname helper

docs/                           # Reference documentation
  CTA-ICON-GUIDELINES.md
  migration/                    # Phased migration plans
```

## Import convention

```
src/app/ pages      → @/src/components/organisms/  (entry-point files only)
organisms/          → @/src/components/atoms|molecules  (direct)
organisms/voicerx   → @/src/components/organisms/rxpad/  (cross-feature OK)
organisms/rxpad     → @/src/components/organisms/shared/  (cross-page primitives)
molecules/          → @/src/components/atoms/ only
atoms/              → @radix-ui/*  |  @/src/hooks/  |  @/src/design-system/ only
hooks/utils         → imported by all layers: @/src/hooks/utils
design tokens       → @/src/design-system/  (SCSS via @use, JS via import)
```

**Never** import `@/components/...`, `@/lib/...`, `@/hooks/...` — those root dirs are deleted.
**Never** import `@mui/material` directly in product code.

## Key entry points

| Route | Entry | Implementation |
|---|---|---|
| `/` | `src/app/page.jsx` (re-exports tp-appointment-screen) | Appointments dashboard |
| `/tp-appointment-screen` | `organisms/tp-appointment-screen/DrAgentPage` | Appointments dashboard |
| `/rxpad/voice` | `organisms/voicerx/VoiceRxFlow` | VoiceRx in-visit consultation (canonical) |
| `/rxpad` | → redirect `/rxpad/voice` | — |
| `/rxpad/end-visit` | `organisms/rxpad/EndVisitPage` | End visit summary |
| `/invisit` | → permanent redirect `/rxpad/voice` | Legacy route (next.config.mjs) |
| `/patient-details` | `organisms/patient-details/PatientDetailsPage` | Patient profile |
| `/print-preview` | `organisms/print-preview/PrintPreviewPage` | Print Rx |
| `/(docs)/*` | Design system showcases | `src/app/(docs)/_components/` |

**Future consultation types** will be added as sibling routes under `/rxpad/`:
`/rxpad/point-and-click`, `/rxpad/template`, etc. — all sharing `TPRxPadShell` + `SecondaryNavPanel`.

## Context providers

- **`RxPadSyncProvider`** (`organisms/rxpad/rxpad-sync-context.jsx`) — data bus between Dr.Agent/VoiceRx and the RxPad form. Exports `useRxPadSync()`.
- **`CustomiseContext`** (`organisms/rxpad/customise-context.jsx`) — RxPad customization panel state.
- **`TemplateContext`** (`organisms/rxpad/templates/template-context.jsx`) — Template selection.
- **`TPThemeProvider`** (`components/providers/tp-theme-provider.jsx`) — MUI ThemeProvider wrapper.

## Design conventions (STRICT)

Read `design.md` for the full visual contract. Key rules:

1. **Even-pixel sizing only.** Every font-size, spacing, padding, border-radius must be even. Banned: 9px, 11px, 13px, 15px, 17px. Exception: 1px hairline borders.
2. **Font sizes:** 14px (body default), 12px (meta/subtitles), 10px (uppercase trackers only).
3. **Colors via tokens only.** Use `var(--tp-blue-500)` etc. Never hardcode hex in components.
4. **Icons:** iconsax-reactjs is primary. Linear variant inside CTAs (never Bulk/Bold). Icon-only buttons must be perfect squares.
5. **tp-slate-700** is the default body/icon color. Brand blue (`tp-blue-500`) is reserved for primary CTAs only.
6. **Violet palette** is for AI/informational — never CTA fill.
7. **Touch targets:** 36px minimum desktop, 44px minimum iPad (iOS HIG).

## Component hierarchy

```
/rxpad/voice route (VoiceRx consultation)
└── VoiceRxFlow (organisms/voicerx/VoiceRxFlow.jsx)
    └── TPRxPadShell             ← composable shell
        └── VoiceRxFlowInner
            └── RxPadSyncProvider  ← context data bus
                ├── DrAgentPanel
                ├── RxPadFunctional   (in form/)
                └── SecondarySidebar  (in secondary-sidebar/)
```

## npm package readiness

`src/components/atoms/` and `src/components/molecules/` are structured to become
the `@tatvapractice/ui` npm package (Track 2, separate repo `tatvapractice-ui`).

All components in `src/components/atoms/` + `src/components/molecules/`:
- **No MUI dependency** — Radix UI primitives or pure HTML only
- **No Tailwind** in newer ones — SCSS Modules with `var(--tp-*)` CSS custom properties
- **No relative cross-feature imports** — each component is self-contained
- **Tree-shakeable** — named exports, no side effects

## ESLint boundaries

`eslint.config.mjs` enforces atomic design import hierarchy:
- `atoms/` cannot import from `molecules/`, `organisms/`, or `pages/`
- `molecules/` cannot import from `organisms/` or `pages/`
- `organisms/` imports atoms/molecules directly (no adapter layer)
- All boundary rules at `"error"` level — current state: **0 errors, 115 warnings** (all pre-existing)

## Migration status

| Phase | Status |
|---|---|
| 1–12 | ✅ Tokens, icons, atoms, molecules, decomposition, SCSS, TSX→JSX |
| Component consolidation | ✅ All code in `src/`; root `components/`, `lib/`, `hooks/` deleted |
| 13 | ⏳ Full Tailwind removal from organisms |
| 14 | ✅ ESLint boundaries at `"error"`; zero MUI in product code |
| 15 | ✅ tp-ui fully absorbed + deleted |
| src/ restructure | ✅ Single source of truth: app/, components/, design-system/, hooks/ |
| Route restructure | ✅ `/invisit` → `/rxpad/voice`; scalable `/rxpad/<type>` pattern |
| Component refinement | ✅ Dead code removed; deprecated TP* wrappers deleted; voicerx consolidated; `tp-rxpad/` + `rx/` collapsed into single `rxpad/` |
| Track 2 | ⏳ `@tatvapractice/ui` npm package (`tatvapractice-ui` repo) |

See `docs/migration/` for the full 15-phase plan.
