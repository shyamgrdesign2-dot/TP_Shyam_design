# VoiceRx → JSX + SCSS + Atomic Component Library — Claude Code Migration Prompt

> Hand this whole file to Claude Code. It is written so each phase can run as
> its own Claude Code session, on its own branch, with its own verification
> gate. Do not skip phases. Do not let Claude "improve" the UI — the UI is
> already shipped and refined; we are only restructuring the code underneath
> it.

---

## 0. Mission

We are **reverse-engineering the existing `tp-voicerx` Next.js app into a
clean, world-class component library + thin pages**. Three things change:

1. **TypeScript (`.tsx` / `.ts`) → JavaScript (`.jsx` / `.js`)** for product
   code. Strip all type annotations. Keep JSDoc where it documents intent.
2. **Tailwind utility soup → SCSS Modules (`*.module.scss`)** per component,
   driven by CSS custom-property tokens that are also exposed as SCSS
   variables (the pattern shown in `Tatva Practice DesignSystem-main` →
   `components/tp-ui/tp-button.{jsx,module.scss}` and `styles/tokens.scss`).
3. **Flat duplicated component zoo → Atomic Design**:
   `atoms / molecules / organisms / templates / pages`, with a single
   canonical component per concern.

Three things **must NOT change**:

1. **Visual output, pixel for pixel.** Every spacing, radius, color, shadow,
   font, animation, hover state, focus ring, transition timing must match
   what is in production today. Take screenshots before and after every
   phase and diff them.
2. **Behavior.** Every click, keyboard, voice, swipe, drag, focus-trap,
   form-submit, and route transition must keep working identically. No
   regression in the in-visit RxPad flow, the Dr.Agent panel, the VoiceRx
   recorder, the Rx preview, the print-preview, the appointments screen, or
   the secondary sidebar.
3. **Public route surface.** `/`, `/invisit`, `/rxpad`, `/rxpad/end-visit`,
   `/patient-details`, `/print-preview`, `/tp-appointment-screen`, `/(docs)/*`
   all keep their URLs and their `metadata` titles.

If any change cannot satisfy invariants 1–3, **stop and ask** before
continuing. Do not silently "modernize" anything.

---

## 1. Current-state audit (read this first, do not refactor it yet)

### 1.1 Stack

- Next.js **16.1.6**, App Router, Turbopack, React **19.2.4**.
- TypeScript strict, `jsx: "react-jsx"`, `paths: { "@/*": ["./*"] }`.
- Tailwind **v4** (`@import 'tailwindcss'` in `app/globals.css`,
  `@tailwindcss/postcss`), `tw-animate-css`.
- Tokens currently defined **three times**:
  - As CSS custom properties in `app/globals.css` (837 lines).
  - As exported TS constants in `lib/design-tokens.ts`.
  - As an MUI `createTheme` palette in `lib/tp-mui-theme.ts`.
- UI component zoo with **three parallel systems**:
  - `components/ui/*` — shadcn (Radix + Tailwind + `cva`). 50+ files.
  - `components/tp-ui/*` — TatvaPractice wrappers around MUI **and** Radix
    **and** standalone implementations (60+ files, prefix `tp-`).
  - `components/tp-ui/button-system/*` — a third button family
    (`TPButton`, `TPIconButton`, `TPSplitButton`, `TPButtonIcon`).
- Icons from **four** libraries: `iconsax-reactjs` (71 files),
  `lucide-react` (109 files), `@mui/icons-material` (1 file),
  `@phosphor-icons/react` (occasional).
- Two TipTap rich editors (`components/voicerx/ClinicalNotesEditor.tsx`,
  `components/rx/rxpad/RxPadRichField.tsx`).

### 1.2 Pages (the only surfaces we ship)

| Route | Entry | Notes |
|---|---|---|
| `/` | `app/page.tsx` re-exports `app/tp-appointment-screen/page.tsx` | Appointments dashboard |
| `/tp-appointment-screen` | `components/tp-appointment-screen/*` | Top-level appointments + Dr.Agent |
| `/invisit` | `components/invisit/InvisitPage.tsx` → `components/voicerx/VoiceRxFlow.tsx` | Doctor in-visit workspace |
| `/rxpad` | `components/tp-rxpad/RxPadPage.tsx` | Standalone RxPad |
| `/rxpad/end-visit` | `components/tp-rxpad/EndVisitPage.tsx` | End-visit summary |
| `/patient-details` | `components/patient-details/PatientDetailsPage.tsx` | Patient profile + history |
| `/print-preview` | `components/print-preview/*` | Print Rx |
| `/(docs)/*` | `app/(docs)/...` | Internal design-system showcases — **out of product surface; keep working but isolate** |

### 1.3 The "design-system" / `(docs)` showcase

Lives in `app/(docs)/*` and `components/design-system/*`. These are tools
for *us*, not customers. After migration they must still render so we can
QA every atom/molecule/organism. They become the live storybook.

### 1.4 Symptoms of the rot (the things this migration fixes)

- **God-files** (LOC):
  - `components/tp-rxpad/RxPadFloatingAgent.tsx` — **8779**
  - `components/rx/rxpad/RxPadFunctional.tsx` — **3626**
  - `components/tp-rxpad/dr-agent/DrAgentPanel.tsx` — **2670**
  - `components/tp-appointment-screen/DrAgentPage.tsx` — **2522**
  - `components/voicerx/VoiceRxActiveAgent.tsx` — **1574**
  - `components/design-system/form-showcase.tsx` — **2320**
  - `components/rx/rxpad/reference/RxPadZipReference.tsx` — **1450**
- **131** files with `style={{...}}` inline overrides.
- **307** files using `className=`-driven Tailwind utility soup.
- A second copy `styles/globals.css` (125 lines) that is unused.
- Duplicate dr-agent panels (`DrAgentPanel.tsx` vs `DrAgentPanelV0.tsx`).
- Duplicate Rx surfaces (`RxPadPage` vs `RxPadFloatingAgent` vs
  `RxPadFunctional` vs `RxPad` vs `InvisitPage`-which-is-just-`VoiceRxFlow`).

You will **not** delete behavior in any of these files. You will move
behavior into the right atomic layer and turn the giant files into thin
organism shells that compose smaller pieces.

---

## 2. Target architecture

```
app/                          ← Next.js App Router only. Pages must be ≤80 LOC.
  layout.jsx
  page.jsx
  invisit/page.jsx
  rxpad/page.jsx
  rxpad/end-visit/page.jsx
  patient-details/page.jsx
  print-preview/page.jsx
  tp-appointment-screen/page.jsx
  (docs)/...                  ← internal storybook, untouched routes
  api/...                     ← may stay .ts if needed, see §6

src/                          ← NEW. Everything not in app/ goes here.
  design-system/
    tokens/
      _colors.scss
      _typography.scss
      _spacing.scss
      _radii.scss
      _shadows.scss
      _motion.scss
      _z-index.scss
      _index.scss             ← @forward all of the above + :root export
    mixins/
      _focus-ring.scss
      _truncate.scss
      _scrollbar-hide.scss
      _ai-shimmer.scss
      _voice-blob.scss
      _index.scss
    base/
      _reset.scss
      _typography.scss
      _globals.scss           ← what app/globals.css "should" be
    theme/
      tp-mui-theme.js         ← MUI theme that reads CSS vars (var(--tp-blue-500))
      ThemeProvider.jsx       ← wraps MUI ThemeProvider + sonner Toaster
  components/
    atoms/                    ← the smallest reusable units. No business logic.
      Button/
        Button.jsx
        Button.module.scss
        Button.stories.jsx    ← used by /(docs)
        index.js
      IconButton/
      Input/
      Textarea/
      NumberInput/
      OtpInput/
      Checkbox/
      Radio/
      Switch/
      Toggle/
      Select/
      DatePicker/
      TimePicker/
      Slider/
      Tooltip/
      Popover/
      Tag/
      Chip/
      Badge/
      StatusBadge/
      Avatar/
      Divider/
      Spinner/
      Progress/
      Skeleton/
      Kbd/
      Label/
      Link/
      Typography/
      MedicalIcon/            ← merged from tp-ui/medical-icons
    molecules/                ← composed of atoms. Still no domain knowledge.
      Field/                  ← Label + Input + helper + error
      SearchInput/
      SegmentedControl/
      DropdownMenu/
      ConfirmDialog/
      Dialog/
      Drawer/
      Sheet/
      Snackbar/
      Banner/
      Alert/
      Card/
      Accordion/
      Breadcrumbs/
      Pagination/
      Stepper/
      Tabs/
      ClinicalTabs/
      Table/
      ClinicalTable/
      Timeline/
      TreeView/
      TransferList/
      EmptyState/
      Rating/
      ColorPicker/
      FileUpload/
      SearchFilterBar/
      AppointmentBanner/
      PatientInfoHeader/
      SecondaryNavPanel/
      Command/                ← cmdk
    organisms/                ← page-shape pieces. Domain-aware.
      RxPadShell/
      RxPadTopNav/
      RxPadSecondarySidebar/
      RxPad/                  ← the in-visit Rx form (was RxPadFunctional)
      RxCustomiseSidebar/
      RxPreviewSidebar/
      RxPreviewDocument/
      DrAgentPanel/           ← the chat + voice surface
      DrAgentFab/
      VoiceRxFlow/            ← what /invisit renders
      VoiceRxActiveAgent/
      VoiceRxRecorderPanel/
      VoiceRxResultTabs/
      VoiceStructuredRxCard/
      ClinicalNotesEditor/
      AppointmentsBoard/
      AppointmentSnackbars/
      PatientDetailsPanel/
      PrintPreview/
      EndVisitPage/
    templates/                ← pure layouts: header/sidebar/main slots
      WorkspaceTemplate/
      PrintTemplate/
      DocsTemplate/
    docs/                     ← the showcases (lifted from components/design-system)
      ButtonShowcase.jsx
      InputShowcase.jsx
      ...
  hooks/
    useMobile.js
    useTouchDevice.js
    useToast.js
    useLiveTranscript.js
    useNetConnection.js
    useEdgeSwipeNavigation.js
    ...
  lib/
    cn.js                     ← classnames helper (replaces tailwind-merge / cva use)
    designTokens.js           ← single source for any JS-side token reads
    voiceAudioUtils.js
    voiceSessionUtils.js
    rxPreviewComposer.js
    rxPreviewStore.js
    customiseStore.js
    templateStore.js
    digitization/
    export/
  contexts/
    RxPadSyncContext.jsx
    CustomiseContext.jsx
    TemplateContext.jsx
  data/
    samples/                  ← all `sample-data.ts` etc. become .js here
    constants/
public/                       ← unchanged
```

### 2.1 Naming conventions

- **Components**: `PascalCase` directory + `PascalCase.jsx`. One component
  per directory, plus its `.module.scss` and `index.js` re-export. No
  `tp-` prefix anymore — the namespace is the import path
  (`@/components/atoms/Button`).
- **Hooks**: `useCamelCase.js`.
- **Utilities**: `camelCase.js`.
- **SCSS files**: `Component.module.scss` for module-scoped styles;
  underscore-prefixed `_partial.scss` for `@use`/`@forward` pieces under
  `design-system/`.
- **Class names inside SCSS modules**: `camelCase` so they consume cleanly:
  `<div className={s.cardHeader}>`.
- **Path alias**: keep `@/*` mapping to repo root via `jsconfig.json`.

### 2.2 Folder boundaries (enforced rules)

- `atoms/` may import from `lib/`, `design-system/tokens/` (via SCSS), and
  no other components.
- `molecules/` may import from `atoms/` and the same as above.
- `organisms/` may import from `atoms/`, `molecules/`, `hooks/`,
  `contexts/`, `lib/`, `data/`.
- `templates/` may import from `atoms/`, `molecules/`, `organisms/`.
- `app/*` may import from `templates/` and `organisms/` only. **Pages are
  thin.** A page is composition + data plumbing — never markup.
- Nothing imports from `@mui/material`, `@radix-ui/*`, `cmdk`, `vaul`,
  `lucide-react`, or `iconsax-reactjs` **outside** `atoms/` and
  `molecules/`. Those primitives are wrapped exactly once.

### 2.3 The single rule for class composition

Replace `cn()` + Tailwind utility soup with **SCSS Modules + a tiny `cn`
helper** that just joins truthy strings. Keep `clsx`/`tailwind-merge`
**only** during the transition; remove from `package.json` at the end of
Phase 4.

---

## 3. Conventions for every file you write

### 3.1 JSX component shape

```jsx
// src/components/atoms/Button/Button.jsx
"use client";

import { forwardRef } from "react";
import s from "./Button.module.scss";
import { cn } from "@/lib/cn";

/**
 * @typedef {"primary" | "secondary" | "ghost" | "destructive" | "outline" | "link"} ButtonVariant
 * @typedef {"sm" | "md" | "lg" | "icon"} ButtonSize
 */

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      className={cn(s.button, className)}
      {...rest}
    >
      {loading ? <span className={s.spinner} aria-hidden /> : null}
      <span className={s.label}>{children}</span>
    </button>
  );
});

export default Button;
```

Rules:

- **Use `data-*` attributes for variants**, not class concatenation. SCSS
  selects on them: `.button[data-variant="primary"][data-size="lg"]`.
  This avoids `cva`, gives one canonical class per element, and renders
  cleanly in DevTools.
- **One `forwardRef` per atom** so refs flow through (Radix/MUI need it).
- No type annotations — use JSDoc `@typedef` and `@param` for the public
  API. Keep them short.

### 3.2 SCSS Module shape

```scss
/* src/components/atoms/Button/Button.module.scss */
@use "@/src/design-system/tokens" as t;
@use "@/src/design-system/mixins/focus-ring" as fr;

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: var(--font-sans);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease,
              border-color 160ms ease, box-shadow 160ms ease;

  &:disabled,
  &[data-loading] {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible { @include fr.ring(var(--tp-blue-500)); }

  /* sizes */
  &[data-size="sm"] { height: 32px; padding: 0 12px; font-size: 13px; }
  &[data-size="md"] { height: 36px; padding: 0 14px; font-size: 14px; }
  &[data-size="lg"] { height: 40px; padding: 0 18px; font-size: 14px; }
  &[data-size="icon"] { width: 36px; height: 36px; padding: 0; }

  /* variants */
  &[data-variant="primary"] {
    background: var(--tp-blue-500);
    color: var(--tp-slate-0);
    &:hover { background: var(--tp-blue-600); }
  }
  &[data-variant="secondary"] {
    background: var(--tp-blue-50);
    color: var(--tp-blue-700);
    &:hover { background: var(--tp-blue-100); }
  }
  &[data-variant="ghost"] {
    background: transparent;
    color: var(--tp-slate-700);
    &:hover { background: var(--tp-slate-100); }
  }
  &[data-variant="destructive"] {
    background: var(--tp-error-500);
    color: var(--tp-slate-0);
    &:hover { background: var(--tp-error-600); }
  }
  &[data-variant="outline"] {
    background: var(--tp-slate-0);
    color: var(--tp-slate-700);
    border-color: var(--tp-slate-200);
    &:hover { background: var(--tp-slate-50); }
  }
  &[data-variant="link"] {
    background: transparent;
    color: var(--tp-blue-600);
    padding: 0;
    height: auto;
    &:hover { text-decoration: underline; }
  }
}

.label { display: inline-flex; align-items: center; gap: 6px; }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 9999px;
  animation: spin 700ms linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

Rules:

- **Always read tokens via `var(--token-name)`**. Never hard-code colors,
  shadows, radii, or spacing. The only literals allowed are layout values
  the design system explicitly enumerates (per `design.md` §1: even-pixel
  scale).
- **One `@use` of `tokens`** at the top; SCSS variables are available as
  `t.$tp-blue-500` if you need them in `@if`/`@mixin` contexts, but prefer
  CSS custom properties.
- **No global selectors** in module files. Globals live in
  `src/design-system/base/_globals.scss`.

### 3.3 Token strategy

`src/design-system/tokens/_colors.scss` is the **single source of truth**.
It both declares SCSS variables and writes them to `:root` as CSS custom
properties (the pattern in `Tatva DesignSystem-main/styles/tokens.scss`).
The TS file `lib/design-tokens.ts` becomes `lib/designTokens.js` and is
**generated** from the SCSS via a small `scripts/build-tokens.mjs` so the
two never drift. (If you skip the codegen script, document why in the PR.)

The MUI theme (`src/design-system/theme/tp-mui-theme.js`) reads CSS vars
at runtime, e.g. `primary.main: 'var(--tp-blue-500)'`. This means MUI
components automatically follow whatever the SCSS layer ships.

### 3.4 Icon strategy

Pick **one** primary icon family — the existing product leans on
`iconsax-reactjs`. Wrap it once in `atoms/Icon/Icon.jsx`:

```jsx
import * as Iconsax from "iconsax-reactjs";
export function Icon({ name, size = 18, variant = "Linear", color, ...rest }) {
  const Cmp = Iconsax[name];
  if (!Cmp) return null;
  return <Cmp size={size} variant={variant} color={color ?? "currentColor"} {...rest} />;
}
```

`lucide-react` stays only inside molecules where the iconsax equivalent
doesn't exist. Document each lucide use in
`docs/migration/icon-exceptions.md`. Drop `@mui/icons-material` and
`@phosphor-icons/react` from `package.json`. Custom medical glyphs stay in
`atoms/MedicalIcon/`.

### 3.5 What never gets typed

Everything in `src/**` is `.jsx` / `.js`. Types live as JSDoc only. The
`tsconfig.json` is replaced by `jsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "checkJs": false,
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "target": "ES2022"
  },
  "include": ["app", "src", "next-env.d.ts"],
  "exclude": ["node_modules", ".next"]
}
```

`next-env.d.ts` stays (Next.js requires it even for JS projects).
`api/` route handlers may remain `.ts` if they have meaningful types
worth keeping (see §6).

---

## 4. Phased migration plan

> Each phase is a separate Claude Code session, on its own branch, ending
> in a PR. Do not start phase N+1 until phase N is verified.

### Phase 0 — Safety net (1 session)

**Branch:** `migration/00-safety-net`

1. Tag the current `main` as `pre-migration-baseline`.
2. Create `docs/migration/CLAUDE_CODE_MIGRATION_PROMPT.md` (this file).
3. Capture **visual baselines**: run the app locally, take 1920×1080 and
   390×844 (mobile) screenshots of every route in §1.2 plus every showcase
   page in `app/(docs)/components/*`. Save to
   `docs/migration/baseline-screenshots/{route}/{viewport}.png`. These are
   the ground truth for QA.
4. Add `scripts/diff-screenshots.mjs` (using `pixelmatch` + `pngjs`) that
   compares any new screenshots against baselines and writes a report.
5. Add `npm run baseline` and `npm run diff:visual` scripts.
6. Open PR, merge. **No code changes elsewhere.**

**Verification gate:** baseline screenshots committed, diff script runs
green against itself.

---

### Phase 1 — Foundation: SCSS tokens, Sass build, jsconfig (1 session)

**Branch:** `migration/01-foundation`

1. Add devDeps: `sass`, `pixelmatch`, `pngjs`. Keep `tailwindcss` for now.
2. Create `src/design-system/` per §2 layout. Port `app/globals.css`'s
   `:root { ... }` block plus the `lib/design-tokens.ts` constants into:
   - `_colors.scss` — every TP color, plus the AI gradient stops.
   - `_radii.scss` — `--radius` scale.
   - `_spacing.scss` — even-pixel scale from `design.md`.
   - `_typography.scss` — font families, sizes, weights, line-heights.
   - `_shadows.scss` — the shadow scale used by `tp-mui-theme.ts`.
   - `_motion.scss` — every `@keyframes` currently in `app/globals.css`
     (`aiShimmer`, `tpHistoricalTextIntro`, `shine`, `tpVoiceBlobDrift`,
     `rxSectionSlideUp`, `rxSectionSlideDown`, `tpPageSlideIn`, …).
   - `_z-index.scss` — name and number every layer
     (`fab`, `panel`, `drawer`, `dialog`, `toast`, `tooltip`).
3. `_index.scss` `@forward`s all of the above and writes a `:root { ... }`
   block exposing every token as a CSS custom property (see Tatva sample
   `styles/tokens.scss`).
4. Replace `app/globals.css` with a thin `app/globals.scss` that
   `@use`s `src/design-system/tokens` and `src/design-system/base/globals`,
   keeps the `@import 'tailwindcss'` line **for now**, and the
   `@layer base` block.
5. Add `jsconfig.json` per §3.5. **Do not** delete `tsconfig.json` yet —
   it's still needed because product code is still `.tsx`.
6. Move `lib/tp-mui-theme.ts` to `src/design-system/theme/tp-mui-theme.js`,
   replacing every hard-coded hex with `var(--tp-blue-500)` etc. Add a
   `ThemeProvider.jsx` wrapper (current code uses `tp-theme-provider.tsx`).
7. Generate `lib/designTokens.js` from `_colors.scss` via
   `scripts/build-tokens.mjs`. Add `npm run build:tokens` and call it from
   a `prebuild` hook.

**Verification gate:**
- `npm run dev` boots, every route renders.
- `npm run diff:visual` shows zero pixel diff against baseline.
- DevTools confirms `:root` exposes every TP token.

---

### Phase 2 — Build the atomic component library (3–5 sessions)

**Branch:** `migration/02-atoms-molecules`

Build new components in `src/components/atoms/` and `src/components/molecules/`
**alongside** the old ones. Do not touch product code yet. Each new
component has:

- `Component.jsx` (no TS).
- `Component.module.scss` (tokens only).
- `index.js` (re-export).
- A demo entry in `src/components/docs/<Component>Showcase.jsx` that the
  `app/(docs)` routes consume.

#### 2.1 Atoms to build (in this order)

`Button` → `IconButton` → `Spinner` → `Icon` → `MedicalIcon` →
`Typography` → `Label` → `Link` → `Divider` → `Avatar` → `Badge` →
`StatusBadge` → `Tag` → `Chip` → `Kbd` → `Tooltip` → `Popover` →
`Input` → `Textarea` → `NumberInput` → `OtpInput` → `Checkbox` →
`Radio` → `Switch` → `Toggle` → `Slider` → `Progress` → `Skeleton` →
`Select` → `DatePicker` → `TimePicker`.

For each atom:
- Read both the shadcn implementation (`components/ui/<name>.tsx`) **and**
  the TP wrapper (`components/tp-ui/tp-<name>.tsx`). Pick the better
  primitive. As a rule:
  - If the TP wrapper exists and brings genuine MUI behavior we depend on
    (e.g., `TPDatePicker`, `TPSelect`), keep MUI underneath.
  - Otherwise prefer Radix (lighter bundle, headless, accessible). Most
    atoms (Button, Input, Checkbox, Radio, Switch, Tooltip, Popover,
    Dialog, DropdownMenu) should be Radix-based.
- The atom's **public API is the union of every prop currently used by
  product code**. Grep for usages and enumerate them in JSDoc. Anything
  that's never used becomes a non-feature.

#### 2.2 Molecules to build

After atoms: `Field`, `SearchInput`, `SegmentedControl`, `DropdownMenu`,
`ConfirmDialog`, `Dialog`, `Drawer`, `Sheet`, `Snackbar`, `Banner`,
`Alert`, `Card`, `Accordion`, `Breadcrumbs`, `Pagination`, `Stepper`,
`Tabs`, `ClinicalTabs`, `Table`, `ClinicalTable`, `Timeline`, `TreeView`,
`TransferList`, `EmptyState`, `Rating`, `ColorPicker`, `FileUpload`,
`SearchFilterBar`, `AppointmentBanner`, `PatientInfoHeader`,
`SecondaryNavPanel`, `Command`.

#### 2.3 Storybook-via-(docs) wiring

`app/(docs)/components/buttons/page.tsx` (and siblings) should be edited
to render `src/components/docs/ButtonShowcase.jsx`. The showcase imports
the **new** atoms. This is how you visually QA each atom without touching
product code.

**Verification gate per component:**
- Showcase page renders identically to its pre-migration screenshot.
- React DevTools shows the atom is the only component rendered (no MUI
  inner tree showing through if we said it'd be Radix).
- Keyboard interaction matches old behavior (Tab order, Enter/Space,
  Escape, arrow keys).

---

### Phase 3 — TSX → JSX codemod for product code (1 session)

**Branch:** `migration/03-jsx-codemod`

Run a deterministic codemod, **not** a hand-rewrite. Recommended:
[`ts-to-jsx`] via `npx ts-to-jsx` or, more reliably, a small
`jscodeshift` script using `@babel/preset-typescript` to strip types.

Steps:

1. Move all product `.ts(x)` files (everything **outside** `app/api/` and
   `next-env.d.ts`) into `src/` per the target layout in §2.
2. Run the codemod to strip type annotations and rename `.tsx` → `.jsx`,
   `.ts` → `.js`. Verify zero behavioral diffs by reading the diff for
   every file with imports/exports.
3. Replace any `import type` lines with regular imports or remove (JSDoc
   `@typedef` if the type was used at the API surface).
4. Fix the inevitable codemod misses by hand: union types in default props,
   `as const` casts, generic functions. JSDoc them.
5. Rename `tsconfig.json` → `tsconfig.json.bak` (keep for reference one
   release), make `jsconfig.json` authoritative.
6. Update every relative import path that broke when files moved into
   `src/`.

**Verification gate:**
- `npm run dev` boots cleanly.
- `npm run build` succeeds (Next.js handles `.jsx` natively).
- `npm run diff:visual` zero pixel diff.
- Manual smoke test of every route in §1.2.

---

### Phase 4 — Replace Tailwind utilities with SCSS modules (3–4 sessions)

**Branch:** `migration/04-scss-modules`

This is the longest phase. Do it **organism by organism**, not file by
file. Order:

1. `RxPadShell` + `RxPadTopNav` + `RxPadSecondarySidebar` (the chrome).
2. `RxPad` (the form, was `RxPadFunctional`).
3. `DrAgentPanel` (chat + voice flow).
4. `RxPreviewSidebar` + `RxPreviewDocument`.
5. `RxCustomiseSidebar`.
6. `VoiceRxFlow` (the `/invisit` shell) and its recorder/active-agent
   pieces.
7. `AppointmentsBoard` and `AppointmentSnackbars`.
8. `PatientDetailsPage`.
9. `EndVisitPage`.
10. `PrintPreview`.
11. The `(docs)` showcases.

For each organism:

- For every `<element className="long tailwind soup">`:
  - Move every utility into a `.module.scss` rule, mapping each Tailwind
    class to its CSS equivalent. Use the design-token CSS vars (no hex,
    no `text-[13px]` — use `font-size: 14px` per the even-pixel rule).
  - Remove `cn(...)` calls that no longer concatenate; keep them for
    truly dynamic class joining.
  - Move every `style={{...}}` block into the SCSS module unless the
    value is **dynamically computed** at render (e.g.,
    `style={{ ['--vrx-blob-level']: level }}`). Dynamic CSS-var writes
    are correct and should stay inline — the SCSS reads the var.
- Replace any direct Radix/MUI/cmdk/vaul import with the corresponding
  atom or molecule built in Phase 2. If a needed prop wasn't covered by
  the new atom, **extend the atom**, do not bypass it.
- Lift any sub-component bigger than ~150 LOC out into its own
  organism/molecule. The 8779-line `RxPadFloatingAgent.tsx` should end
  up as a ~120-line organism that composes ~15 sub-organisms.

**Verification gate per organism:** screenshot diff for every route the
organism appears on. No tolerance on diff except sub-pixel font rendering
differences (document any).

---

### Phase 5 — Page rewiring & template extraction (1 session)

**Branch:** `migration/05-pages-templates`

1. Each `app/<route>/page.jsx` becomes a thin file:

   ```jsx
   // app/rxpad/page.jsx
   import { RxPadPage } from "@/src/organisms/RxPadPage";
   export const metadata = {
     title: "RxPad — TatvaPractice",
     description: "TatvaPractice RxPad workspace…",
   };
   export default function Page() { return <RxPadPage />; }
   ```

2. Extract shared layout into `src/components/templates/WorkspaceTemplate/`
   (top nav + secondary sidebar + content slot) and have `RxPadPage`,
   `PatientDetailsPage`, `EndVisitPage` consume it.
3. Replace `app/layout.tsx` with `app/layout.jsx`. The body of the layout
   stays — fonts, `TPThemeProvider` (now `ThemeProvider`),
   `<Toaster />`, `<Analytics />`.

**Verification gate:** every page is ≤80 LOC. Screenshot diff zero.

---

### Phase 6 — Remove the duplicates (1 session)

**Branch:** `migration/06-cleanup`

Now and only now you delete:

- `components/ui/` — superseded by `src/components/atoms` + `molecules`.
- `components/tp-ui/` — same.
- `components/tp-ui/button-system/` — same.
- `components/design-system/*` — replaced by `src/components/docs/*`.
- `components/magicui/` — fold what's still used into atoms/molecules,
  delete what isn't.
- `styles/globals.css` — second copy, never imported.
- `lib/tp-mui-theme.ts`, `lib/design-tokens.ts`,
  `lib/component-tokens.ts` — replaced by SCSS tokens + generated
  `lib/designTokens.js`.
- `components/tp-rxpad/dr-agent/DrAgentPanelV0.tsx` if no longer wired.
- `components/rx/rxpad/reference/*` — historical reference, move to
  `docs/legacy-reference/` instead of deleting.
- Unused devDeps: `tw-animate-css`, `class-variance-authority`,
  `tailwind-merge`, `@phosphor-icons/react`, `@mui/icons-material`,
  `iconsax-react` (the older mirror; keep `iconsax-reactjs`).

For each deletion: `grep -r` for any remaining import; if found, fix the
caller first.

**Decide on Tailwind**: by end of Phase 4 every organism should be SCSS-
module-driven. Drop `tailwindcss`, `@tailwindcss/postcss`,
`tw-animate-css` from `package.json` and remove the
`@import 'tailwindcss'` line from `app/globals.scss`. If any utility
class snuck through, fix it before deleting.

**Verification gate:**
- `npm run build` clean.
- Bundle size report attached to PR.
- Zero pixel diff vs. baseline.

---

### Phase 7 — Verification & polish (1 session)

**Branch:** `migration/07-polish`

1. Add ESLint rules to enforce architecture (use
   `eslint-plugin-boundaries` or hand-written `no-restricted-imports`):
   - `atoms/**` cannot import from `molecules/**`, `organisms/**`,
     `templates/**`, `app/**`, or any forbidden third-party (see §2.2).
   - `molecules/**` cannot import from `organisms/**`, `templates/**`,
     `app/**`.
   - Same chain for `organisms`, `templates`, `app`.
   - `app/**` files >80 LOC fail lint.
2. Add Stylelint with rules:
   - No hex literals in `*.module.scss` (must use `var(--…)`).
   - No magic pixel values outside the even-pixel scale.
3. Run `npm audit`. Pin Node version in `.nvmrc`.
4. Update `README.md` with the new architecture diagram.
5. Re-take screenshots; the pixel diff against baseline must be
   negligible. Anything non-zero is documented as an intentional fix.

**Verification gate:** fresh checkout → `npm install && npm run build &&
npm run diff:visual` runs green.

---

## 5. Codemod & QA recipes

### 5.1 TSX → JSX (Phase 3)

```bash
# one-shot, deterministic, syntax-only stripping
npx --yes ts-to-jsx \
  --out-dir-mode in-place \
  --keep-types-as-jsdoc false \
  --rename-extensions \
  --include "src/**/*.{ts,tsx}" \
  --exclude "src/**/*.d.ts" "next-env.d.ts" "app/api/**"
```

After the codemod:

```bash
# Find leftover TS-only syntax
grep -rEn ":\s*(string|number|boolean|React\.|FC<|ReactNode)" src/ \
  | grep -v "/\*\*" | head
# `import type` survivors
grep -rn "import type" src/
# `as const` casts
grep -rn "as const" src/
```

### 5.2 Tailwind class → SCSS (Phase 4) — pattern

For each utility soup like
`className="flex h-9 items-center gap-2 rounded-md bg-tp-blue-500 px-4 text-sm font-medium text-white hover:bg-tp-blue-600"`:

1. Move into the file's `.module.scss`:
   ```scss
   .primaryCta {
     display: flex;
     align-items: center;
     gap: 8px;
     height: 36px;          /* h-9 → 36px */
     padding: 0 16px;
     border-radius: 8px;
     background: var(--tp-blue-500);
     color: var(--tp-slate-0);
     font-size: 14px;
     font-weight: 500;
     &:hover { background: var(--tp-blue-600); }
   }
   ```
2. Replace JSX with `<button className={s.primaryCta}>`.
3. If multiple files share the pattern, the button should already be
   `<Button variant="primary">` — bin the local class entirely.

### 5.3 Inline `style={{}}` (Phase 4)

- **Static**: move to module SCSS.
- **Dynamic numeric**: keep inline as a CSS custom property write:
  ```jsx
  <div style={{ "--vrx-blob-level": level }} className={s.blob} />
  ```
  ```scss
  .blob {
    --vrx-blob-level: 0;
    transform: scale(calc(1 + var(--vrx-blob-level) * 0.22));
  }
  ```

### 5.4 Visual diff harness (Phase 0)

`scripts/diff-screenshots.mjs` (sketch):

```js
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const baseDir = "docs/migration/baseline-screenshots";
const newDir  = "docs/migration/current-screenshots";
const outDir  = "docs/migration/diff";
mkdirSync(outDir, { recursive: true });

let totalDiff = 0;
for (const file of walk(baseDir)) {
  const a = PNG.sync.read(readFileSync(join(baseDir, file)));
  const b = PNG.sync.read(readFileSync(join(newDir, file)));
  if (a.width !== b.width || a.height !== b.height) {
    console.error("size mismatch:", file); process.exitCode = 1; continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height,
    { threshold: 0.05, diffMask: false });
  totalDiff += px;
  writeFileSync(join(outDir, file), PNG.sync.write(diff));
  console.log(file, px, "px diff");
}
process.exitCode = totalDiff > 0 ? 1 : 0;
```

Take screenshots with Playwright (one route per test) so this stays
hermetic.

---

## 6. Edge cases & open decisions

These need a **human call** before Phase 2 starts. Ask the user.

1. **API routes** (`app/api/iconsax-icon`, `app/api/source`,
   `app/api/download/*`): keep as `.ts` for the route handler types, or
   migrate? Default: **keep `.ts`**, document the exception.
2. **TipTap rich editors**: keep TipTap, but extract the editor as an
   organism (`ClinicalNotesEditor`, `RxPadRichField`) so the prosemirror
   wiring is centralized.
3. **`@material/web`** is in `package.json` but not heavily used —
   confirm whether to drop or keep.
4. **The two parallel Rx surfaces** (`RxPadFloatingAgent` ≈ 8.7k LOC vs
   `RxPad` + `DrAgentPanel`): the user has stated `RxPadFloatingAgent` is
   the legacy v0. Confirm during Phase 4 that production routes use the
   newer split — if so, retire the v0 file in Phase 6.
5. **Routing change `/invisit` → keep**: do not rename even though
   `InvisitPage` is a one-line re-export of `VoiceRxFlow`.
6. **Internationalization**: not present today; do not introduce.
7. **State management**: do not introduce Zustand/Redux; the current
   React-context + local-state pattern is fine.

---

## 7. Atomic-design taxonomy — full mapping

This is the contract Claude Code uses to know where each existing file
goes. It is **complete**: every product file in `components/` has a
target.

### 7.1 atoms/

| New atom | Replaces |
|---|---|
| Button | `components/ui/button.tsx`, `components/tp-ui/tp-button.tsx`, `components/tp-ui/button-system/TPButton.tsx` |
| IconButton | `components/tp-ui/button-system/TPIconButton.tsx`, `TPButtonIcon.tsx` |
| SplitButton | `components/tp-ui/button-system/TPSplitButton.tsx` |
| Icon | new wrapper for `iconsax-reactjs` |
| MedicalIcon | `components/tp-ui/medical-icons/*` |
| Spinner | `components/ui/spinner.tsx`, `components/tp-ui/tp-spinner.tsx` |
| Typography | `components/tp-ui/tp-breadcrumbs.tsx` (TPTypography part) |
| Label | `components/ui/label.tsx` |
| Link | `components/tp-ui/tp-breadcrumbs.tsx` (TPLink part) |
| Divider | `components/ui/separator.tsx`, `components/tp-ui/tp-divider.tsx` |
| Avatar | `components/ui/avatar.tsx`, `components/tp-ui/tp-avatar.tsx` |
| Badge | `components/ui/badge.tsx`, `components/tp-ui/tp-badge.tsx` |
| StatusBadge | `components/tp-ui/tp-status-badge.tsx` |
| Tag | `components/tp-ui/tp-tag.tsx` |
| Chip | `components/tp-ui/tp-chip.tsx` |
| Kbd | `components/ui/kbd.tsx` |
| Tooltip | `components/ui/tooltip.tsx`, `components/tp-ui/tp-tooltip.tsx` |
| Popover | `components/ui/popover.tsx`, `components/tp-ui/tp-popover.tsx` |
| Input | `components/ui/input.tsx`, `components/tp-ui/tp-textfield.tsx` |
| Textarea | `components/ui/textarea.tsx` |
| NumberInput | `components/tp-ui/tp-number-input.tsx` |
| OtpInput | `components/ui/input-otp.tsx`, `components/tp-ui/tp-otp-input.tsx` |
| Checkbox | `components/ui/checkbox.tsx`, `components/tp-ui/tp-checkbox.tsx` |
| Radio | `components/ui/radio-group.tsx`, `components/tp-ui/tp-radio.tsx` |
| Switch | `components/ui/switch.tsx`, `components/tp-ui/tp-switch.tsx` |
| Toggle | `components/ui/toggle.tsx`, `components/ui/toggle-group.tsx` |
| Slider | `components/ui/slider.tsx`, `components/tp-ui/tp-slider.tsx` |
| Progress | `components/ui/progress.tsx`, `components/tp-ui/tp-progress.tsx` |
| Skeleton | `components/ui/skeleton.tsx`, `components/tp-ui/tp-skeleton.tsx` |
| Select | `components/ui/select.tsx`, `components/tp-ui/tp-select.tsx` |
| DatePicker | `components/ui/calendar.tsx`, `components/ui/date-range-picker.tsx`, `components/tp-ui/tp-date-picker.tsx` |
| TimePicker | `components/tp-ui/tp-time-picker.tsx` |

### 7.2 molecules/

| New molecule | Replaces |
|---|---|
| Field | `components/ui/field.tsx`, `components/ui/form.tsx` |
| SearchInput | `components/tp-ui/tp-rxpad-search-input.tsx` |
| SegmentedControl | `components/tp-ui/tp-segmented-control.tsx` |
| DropdownMenu | `components/ui/dropdown-menu.tsx`, `components/tp-ui/tp-dropdown-menu.tsx` |
| ContextMenu | `components/ui/context-menu.tsx` |
| Menubar | `components/ui/menubar.tsx` |
| NavigationMenu | `components/ui/navigation-menu.tsx` |
| HoverCard | `components/ui/hover-card.tsx` |
| ConfirmDialog | `components/tp-ui/tp-confirm-dialog.tsx` |
| Dialog | `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`, `components/tp-ui/tp-dialog.tsx` |
| Drawer | `components/ui/drawer.tsx`, `components/tp-ui/tp-drawer.tsx` |
| Sheet | `components/ui/sheet.tsx` |
| Snackbar | `components/tp-ui/tp-snackbar.tsx`, `components/tp-ui/flash-snackbar.tsx`, `components/ui/sonner.tsx`, `components/ui/toast.tsx`, `components/ui/toaster.tsx` |
| Banner | `components/tp-ui/tp-banner.tsx`, `components/tp-ui/appointment-banner.tsx`, `components/tp-ui/tp-appointment-banner.tsx` |
| Alert | `components/ui/alert.tsx`, `components/tp-ui/tp-alert.tsx` |
| Card | `components/ui/card.tsx`, `components/tp-ui/tp-card.tsx`, `components/ui/item.tsx`, `components/ui/empty.tsx` |
| Accordion | `components/ui/accordion.tsx`, `components/ui/collapsible.tsx`, `components/tp-ui/tp-accordion.tsx` |
| Breadcrumbs | `components/ui/breadcrumb.tsx`, `components/tp-ui/tp-breadcrumbs.tsx` |
| Pagination | `components/ui/pagination.tsx`, `components/tp-ui/tp-pagination.tsx` |
| Stepper | `components/tp-ui/tp-stepper.tsx` |
| Tabs | `components/ui/tabs.tsx`, `components/tp-ui/tp-tabs.tsx` |
| ClinicalTabs | `components/tp-ui/tp-clinical-tabs.tsx` |
| Table | `components/ui/table.tsx`, `components/tp-ui/tp-table.tsx` |
| ClinicalTable | `components/tp-ui/tp-clinical-table.tsx` |
| Timeline | `components/tp-ui/tp-timeline.tsx` |
| TreeView | `components/tp-ui/tp-tree-view.tsx` |
| TransferList | `components/tp-ui/tp-transfer-list.tsx` |
| EmptyState | `components/tp-ui/tp-empty-state.tsx` |
| Rating | `components/tp-ui/tp-rating.tsx` |
| ColorPicker | `components/tp-ui/tp-color-picker.tsx` |
| FileUpload | `components/tp-ui/tp-file-upload.tsx` |
| SearchFilterBar | `components/tp-ui/tp-search-filter-bar.tsx` |
| AppointmentBanner | `components/tp-ui/tp-appointment-banner.tsx` |
| PatientInfoHeader | `components/tp-ui/tp-patient-info-header.tsx` |
| SecondaryNavPanel | `components/ui/secondary-nav-panel.tsx`, `components/tp-ui/tp-secondary-nav-panel.tsx` |
| Command | `components/ui/command.tsx`, `components/tp-ui/tp-command.tsx` |
| Resizable | `components/ui/resizable.tsx` |
| ScrollArea | `components/ui/scroll-area.tsx` |
| AspectRatio | `components/ui/aspect-ratio.tsx` |
| Carousel | `components/ui/carousel.tsx` |
| Calendar | (atom: `DatePicker` covers it) |
| Chart | `components/ui/chart.tsx` |
| Sidebar | `components/ui/sidebar.tsx` (bigger — may end up an organism) |

### 7.3 organisms/

| New organism | Replaces |
|---|---|
| RxPadShell | `components/tp-ui/tp-rxpad-shell.tsx` |
| RxPadTopNav | `components/tp-ui/tp-rxpad-top-nav.tsx` |
| RxPadSecondarySidebar | `components/tp-ui/tp-rxpad-secondary-sidebar.tsx`, all of `components/tp-rxpad/secondary-sidebar/*` |
| RxPad | `components/rx/rxpad/RxPad.tsx`, `RxPadFunctional.tsx`, `RxPadSection.tsx`, `RxPadRichField.tsx`, `RxPadAiOverlay.tsx`, `components/rx/sections/*` |
| RxPadPage | `components/tp-rxpad/RxPadPage.tsx` |
| RxCustomiseSidebar | `components/tp-rxpad/RxCustomiseSidebar.tsx`, `customise-context.tsx` |
| RxPreviewSidebar | `components/voicerx/RxPreviewSidebar.tsx` |
| RxPreviewDocument | `components/tp-rxpad/RxPreviewDocument.tsx` |
| RxFloatingAgentLegacy | `components/tp-rxpad/RxPadFloatingAgent.tsx` (kept only if still routed; otherwise retired in Phase 6) |
| DrAgentPanel | `components/tp-rxpad/dr-agent/DrAgentPanel.tsx` + everything under `dr-agent/cards`, `chat`, `shell`, `engines`, `hooks`, `shared` |
| DrAgentFab | `components/tp-rxpad/dr-agent/shell/DrAgentFab.tsx` |
| DrAgentPage | `components/tp-appointment-screen/DrAgentPage.tsx` |
| VoiceRxFlow | `components/voicerx/VoiceRxFlow.tsx` |
| VoiceRxActiveAgent | `components/voicerx/VoiceRxActiveAgent.tsx` |
| VoiceRxRecorderPanel | `components/voicerx/VoiceRxRecorderPanel.tsx`, `VoiceRxModuleRecorder.tsx` |
| VoiceRxResultTabs | `components/voicerx/VoiceRxResultTabs.tsx` |
| VoiceRxBottomSheet | `components/voicerx/VoiceRxBottomSheet.tsx` |
| VoiceRxCanvas | `components/voicerx/VoiceRxCanvas.tsx` |
| VoiceRxLiveBorder | `components/voicerx/VoiceRxLiveBorder.tsx` |
| VoiceRxSiriWaveform | `components/voicerx/VoiceRxSiriWaveform.tsx` |
| VoiceTranscriptCard | `components/voicerx/VoiceTranscriptCard.tsx`, `VoiceTranscriptProcessingCard.tsx` |
| VoiceRxFab | `components/voicerx/VoiceRxListeningFab.tsx`, `VoiceRxMiniFab.tsx` |
| ClinicalNotesEditor | `components/voicerx/ClinicalNotesEditor.tsx` |
| AppointmentsBoard | `components/tp-appointment-screen/*` (most of it) |
| AppointmentSnackbars | `components/tp-appointment-screen/AppointmentSnackbars.tsx` |
| PatientDetailsPage | `components/patient-details/PatientDetailsPage.tsx`, `PatientDetailAgentPanel.tsx` |
| PrintPreview | `components/print-preview/*` |
| EndVisitPage | `components/tp-rxpad/EndVisitPage.tsx` |

### 7.4 templates/

| New template | Used by |
|---|---|
| WorkspaceTemplate | RxPadPage, PatientDetailsPage, EndVisitPage, AppointmentsBoard |
| PrintTemplate | PrintPreview |
| DocsTemplate | (docs) routes |

### 7.5 contexts/, hooks/, lib/

Everything currently under `components/tp-rxpad/rxpad-sync-context.tsx`,
`customise-context.tsx`, `lib/customise-store.ts`, `lib/template-store.ts`,
`lib/voice-rx-sounds.ts`, `lib/voicerx-session-store.ts`,
`components/voicerx/use-*.ts` moves into `src/contexts/`, `src/hooks/`,
`src/lib/`. Names go camelCase. Re-export paths must be updated.

---

## 8. Definition of done

- [ ] Every file in `app/` and `src/` is `.jsx` or `.js`. Only `next-env.d.ts`
      and `app/api/**` may remain `.ts`.
- [ ] Every component renders identically to the pre-migration baseline
      (visual diff report attached to final PR shows zero meaningful pixel
      diff).
- [ ] No file in `app/` exceeds 80 LOC.
- [ ] No organism file exceeds 400 LOC. If it would, split.
- [ ] No file outside `atoms/` and `molecules/` imports `@mui/material`,
      `@radix-ui/*`, `cmdk`, `vaul`, `lucide-react`, or `iconsax-reactjs`.
- [ ] No hex literal in any `*.module.scss`. All colors via `var(--…)`.
- [ ] No `9px / 11px / 13px / 15px / 17px` values anywhere
      (`design.md` §1).
- [ ] `tailwindcss`, `tw-animate-css`, `class-variance-authority`,
      `tailwind-merge`, `@phosphor-icons/react`, `@mui/icons-material`,
      `iconsax-react` removed from `package.json`.
- [ ] `npm run build` clean. Bundle size report ≤ pre-migration.
- [ ] ESLint architectural rules pass.
- [ ] Stylelint `no-color-literals` passes.
- [ ] Updated `README.md` describes the new architecture.

---

## 9. How to invoke this in Claude Code

For each phase, start a new Claude Code session pointed at the repo:

```
You are migrating the tp-voicerx repo per
docs/migration/CLAUDE_CODE_MIGRATION_PROMPT.md.

Run **Phase N only**. Do not touch anything outside Phase N's scope.

Hard constraints:
- The UI cannot change visually or behaviorally.
- Pause and ask before doing anything not described in this file.
- Use the verification gate at the end of the phase as the exit criterion.

When you're done, post:
1. The list of files added / moved / deleted (counts only is fine).
2. The visual-diff report (`npm run diff:visual`).
3. Any open question you flagged for me.
```

Replace `Phase N` with the phase you want. Run them in order. Don't let
the model decide to skip ahead — it will skip ahead.
