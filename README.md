# TatvaPractice — VoiceRx-L

Medical consultation workspace for clinicians: appointment queue, RxPad
prescription pad, Dr.Agent AI assistant, and VoiceRx voice-to-EMR
transcription. Built for iPad and desktop.

> **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · JSX (no TypeScript in product code) · Tailwind v4 + SCSS Modules · Radix UI primitives · iconsax-reactjs · TipTap · Web Speech API.

## Quick start

```bash
npm install
npm run dev          # Turbopack dev server
npm run build        # Production build (16 routes)
npm run lint         # ESLint (zero errors, atomic-design boundaries enforced)
```

## What's in this repo

```
src/                  Single source of truth. ALL application code lives here.
  app/                Next.js App Router — URLs + API routes.
                      (See src/app/routes-and-pages.md)
  components/         Atomic-design library: atoms / molecules / organisms.
                      (See src/components/component-library.md)
  design-system/      Tokens, SCSS mixins, MUI theme.
                      (See src/design-system/design-tokens-and-theme.md)
  hooks/              Shared React hooks. (See src/hooks/hooks-reference.md)

public/               Static assets (icons, animations, lottie, brand).
```

## Documentation map

Every doc below has a **Scope · Audience · Read-when** header at the
top so you (and any AI tool) know whether to open it. The matrix
covers four audiences: **FE** = frontend dev, **BE** = backend dev,
**D** = designer, **PM** = product manager. AI assistants should
treat any doc tagged for the audience they're acting as as required
context.

| Doc | FE | BE | D | PM | Purpose |
|---|:-:|:-:|:-:|:-:|---|
| **Project orientation** | | | | | |
| [`CLAUDE.md`](./CLAUDE.md) | ✓ | ✓ | ✓ | ✓ | Project orientation — stack, layout, import conventions, routes, design rules. **Start here.** |
| [`design.md`](./design.md) | ✓ | | ✓ | ✓ | Visual contract — sizing rules, typography, color, icons. **Read before writing UI.** |
| [`engineering.md`](./engineering.md) | ✓ | ✓ | | | How the app is wired — directory layout, state, data flow, animation, audio. |
| [`integration.md`](./integration.md) | ✓ | ✓ | | ✓ | Backend hand-off — JS shapes the frontend speaks; how to plug in a real API. |
| **`src/` tree** | | | | | |
| [`src/src-overview.md`](./src/src-overview.md) | ✓ | ✓ | ✓ | ✓ | One-screen orientation to the `src/` tree. |
| [`src/app/routes-and-pages.md`](./src/app/routes-and-pages.md) | ✓ | ✓ | | ✓ | Route map, page→component pattern, API endpoints. |
| [`src/hooks/hooks-reference.md`](./src/hooks/hooks-reference.md) | ✓ | | | | Shared hooks reference (`cn`, mobile, touch, toast). |
| **Design system** | | | | | |
| [`src/design-system/design-tokens-and-theme.md`](./src/design-system/design-tokens-and-theme.md) | ✓ | | ✓ | | SCSS tokens, CSS variables, mixins, MUI theme bridge. |
| **Component library (`src/components/`)** | | | | | |
| [`src/components/component-library.md`](./src/components/component-library.md) | ✓ | | ✓ | | Atomic-design philosophy, import rules, when to use what. |
| [`src/components/atoms/atoms-catalog.md`](./src/components/atoms/atoms-catalog.md) | ✓ | | ✓ | | Catalog of every atom with use-cases. |
| [`src/components/molecules/molecules-catalog.md`](./src/components/molecules/molecules-catalog.md) | ✓ | | ✓ | | Catalog of every molecule. |
| [`src/components/organisms/organisms-map.md`](./src/components/organisms/organisms-map.md) | ✓ | ✓ | ✓ | ✓ | Feature-level organism map (RxPad, VoiceRx, TypeRx, shared). |
| **Feature deep-dives** | | | | | |
| [`src/components/organisms/rxpad/rxpad-subsystem.md`](./src/components/organisms/rxpad/rxpad-subsystem.md) | ✓ | ✓ | ✓ | ✓ | RxPad consultation feature — shell, form, sections, sidebar, custom modules, templates, end-visit, sync data bus. |
| [`src/components/organisms/voicerx/voicerx-subsystem.md`](./src/components/organisms/voicerx/voicerx-subsystem.md) | ✓ | ✓ | ✓ | ✓ | Voice subsystem — recorders, voice-lock, transcript flow, audio model. |
| [`src/components/organisms/rxpad/dr-agent/docs/dr-agent-docs-index.md`](./src/components/organisms/rxpad/dr-agent/docs/dr-agent-docs-index.md) | ✓ | ✓ | ✓ | ✓ | Dr.Agent AI panel — index over 15 specs covering cards, intents, sizing, demo flow, response management. |

## Routes (production surface)

| URL | What it does |
|---|---|
| `/` | Homepage → re-exports `/tp-appointment-screen` (appointments dashboard). |
| `/tp-appointment-screen` | Appointment queue with tabs, filters, AI workflow. |
| `/all-patients` | Practice-wide patient directory. |
| `/follow-ups` | Patients with scheduled return visits. |
| `/patient-details` | Patient profile + medical context. |
| `/rxpad/voice` | VoiceRx in-visit consultation (canonical Rx workflow). |
| `/rxpad/type` | Type-driven Rx workflow. |
| `/rxpad/end-visit` | End-of-visit summary, signed Rx preview. |
| `/rxpad` | Redirect → `/rxpad/voice`. |
| `/print-preview` | A4 prescription print preview. |
| `/api/iconsax-icon` | Server proxy — fetches one Iconsax glyph for a custom-module name. |

## Conventions in two minutes

- **Atomic design boundaries are enforced by ESLint.** `atoms/` cannot import `molecules/` or `organisms/`; `molecules/` cannot import `organisms/`.
- **Imports use `@/src/...`** — never `@/components/...` or `@/lib/...` (those folders no longer exist).
- **Even-pixel sizes only.** No 9, 11, 13, 15, 17, 23 px. Hairline 1 px is the only odd-pixel exception. See `design.md`.
- **Colors via tokens.** `var(--tp-blue-500)`, `var(--tp-slate-700)`, etc. Never hard-code hex in components.
- **Icons:** iconsax-reactjs is primary; lucide-react for utility glyphs. Linear variant inside CTAs.
- **No direct MUI** in product code. Use Radix primitives or pure HTML.

## Voice-lock rule (single-mic invariant)

When any voice surface is active — module-level mic, per-cell mic, or
the global VoiceRx FAB — every other mic is automatically disabled.
This is coordinated through `useRxPadSync().activeVoiceModule`. See
[`src/components/organisms/voicerx/voicerx-subsystem.md`](./src/components/organisms/voicerx/voicerx-subsystem.md).

## Open the right doc for your task

| If you're… | Read |
|---|---|
| New to the project | `CLAUDE.md` → `src/src-overview.md` |
| Designing a new component | `design.md` + `src/components/component-library.md` |
| Adding an atom or molecule | `src/components/atoms/atoms-catalog.md` or `…/molecules/molecules-catalog.md` |
| Wiring a new feature | `engineering.md` + `src/components/organisms/organisms-map.md` |
| Working in RxPad | `src/components/organisms/rxpad/rxpad-subsystem.md` |
| Plugging in a real backend | `integration.md` |
| Editing the AI panel | `src/components/organisms/rxpad/dr-agent/docs/dr-agent-docs-index.md` |
| Touching voice | `src/components/organisms/voicerx/voicerx-subsystem.md` |
| Adding/changing a route | `src/app/routes-and-pages.md` |
| Picking colors / spacing / type | `src/design-system/design-tokens-and-theme.md` |
