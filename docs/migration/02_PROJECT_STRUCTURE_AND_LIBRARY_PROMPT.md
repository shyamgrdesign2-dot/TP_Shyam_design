# VoiceRx — Project Structure + Component-Library Composition (v2)

> Companion to `CLAUDE_CODE_MIGRATION_PROMPT.md`. That file says **how to
> migrate**; this file says **what to build, where, on top of which
> primitives, and how to make it scale across iPad + desktop.**
>
> Read sections 1–4 before writing any code. Section 5 is the
> per-component build matrix Claude Code follows literally. Section 6 is
> the adaptation recipe (animate-ui primitive → TP atom). Section 7 is
> the responsive strategy. Section 8 is the reusability contract.

---

## 0. The three primitive families we will use

You named them as `animate.ui`, `headless.ui`, `baseless.ui`, and
`redux.ui`. Concretely, those are:

| Name in your message | Real name | What it is |
|---|---|---|
| **animate.ui** | [animate-ui](https://animate-ui.com/docs/components) | A **registry** (like shadcn) of motion-wrapped primitives. Ships three flavors of each component: `radix`, `headless`, `base`. Plus `animate/`, `buttons/`, `effects/`, `texts/`. |
| **headless.ui** | [Headless UI](https://headlessui.com) (Tailwind Labs) | Unstyled, fully-accessible primitives. Polymorphic via `as` prop. Pairs naturally with Tailwind/SCSS. |
| **baseless.ui** | [Base UI](https://base-ui.com) (MUI's headless line) | Unstyled, fully-accessible primitives by the MUI team. The headless engine that powers Material UI. |
| **redux.ui** | [Radix UI](https://www.radix-ui.com) | Unstyled, fully-accessible primitives by the WorkOS/Radix team. The most-used headless library; what shadcn is built on. |

**They are not competitors of each other for our purposes** — animate-ui
is a wrapper that *consumes* one of `radix / headless / base` per
component. For each TP atom we choose **one** flavor. Mixing within a
single atom is forbidden (one a11y model per concern, no hydration
duplication).

The local zip you uploaded
(`/sessions/.../animate-ui/animate-ui-main`) gives Claude Code direct
access to every primitive's source — copy the parts we need into our
repo rather than depending on the registry CDN. Keep the source in our
tree under `src/vendor/animate-ui/` so it is auditable.

---

## 1. Final project structure (canonical)

This is the **definitive layout** the migration converges to. Every
sentence below is enforceable by ESLint (Phase 7 of the v1 prompt).

```
voicerx/
├── app/                              ← Next.js App Router only. Pages ≤ 80 LOC.
│   ├── layout.jsx
│   ├── globals.scss                  ← @use'd from src/design-system
│   ├── page.jsx
│   ├── invisit/page.jsx
│   ├── rxpad/page.jsx
│   ├── rxpad/end-visit/page.jsx
│   ├── patient-details/page.jsx
│   ├── print-preview/page.jsx
│   ├── tp-appointment-screen/page.jsx
│   ├── (docs)/...                    ← live storybook routes
│   └── api/...                       ← .ts allowed for handler types
│
├── src/
│   ├── design-system/                ← THE SOURCE OF TRUTH for visual style
│   │   ├── tokens/
│   │   │   ├── _colors.scss
│   │   │   ├── _typography.scss
│   │   │   ├── _spacing.scss          ← even-pixel scale (design.md §1)
│   │   │   ├── _radii.scss
│   │   │   ├── _shadows.scss
│   │   │   ├── _motion.scss           ← every keyframe + spring/transition presets
│   │   │   ├── _z-index.scss
│   │   │   ├── _breakpoints.scss      ← see §7
│   │   │   └── _index.scss            ← @forward + :root export
│   │   ├── mixins/
│   │   │   ├── _focus-ring.scss
│   │   │   ├── _truncate.scss
│   │   │   ├── _scrollbar-hide.scss
│   │   │   ├── _ai-shimmer.scss
│   │   │   ├── _voice-blob.scss
│   │   │   ├── _responsive.scss       ← `@include media(ipad) {…}`
│   │   │   └── _index.scss
│   │   ├── base/
│   │   │   ├── _reset.scss
│   │   │   ├── _typography.scss
│   │   │   └── _globals.scss
│   │   └── theme/
│   │       ├── tp-mui-theme.js        ← MUI theme reads var(--…) at runtime
│   │       └── ThemeProvider.jsx
│   │
│   ├── vendor/
│   │   └── animate-ui/                ← copied primitives (not npm-installed)
│   │       ├── primitives/
│   │       │   ├── radix/
│   │       │   ├── headless/
│   │       │   ├── base/
│   │       │   ├── animate/           ← Slot, Tabs, Tooltip (animate flavor)
│   │       │   ├── buttons/           ← Button, Liquid, Ripple, Flip
│   │       │   └── effects/           ← Highlight, AutoHeight, Shine, Tilt, Magnetic, Particles
│   │       ├── hooks/                 ← useControlledState, useDataState, useStrictContext
│   │       ├── lib/                   ← getStrictContext etc.
│   │       └── README.md              ← provenance + commit SHA
│   │
│   ├── components/
│   │   ├── atoms/                     ← rules in §1.1
│   │   ├── molecules/                 ← rules in §1.1
│   │   ├── organisms/                 ← rules in §1.1
│   │   ├── templates/                 ← layouts (header/sidebar/main slots)
│   │   └── docs/                      ← storybook bodies, consumed by app/(docs)
│   │
│   ├── hooks/
│   ├── contexts/
│   ├── lib/
│   │   ├── cn.js                      ← truthy-string joiner. Replaces clsx + cva + tw-merge.
│   │   ├── designTokens.js            ← generated from _colors.scss
│   │   └── ...
│   └── data/
│       ├── samples/
│       └── constants/
│
├── public/
├── docs/
│   └── migration/
│       ├── CLAUDE_CODE_MIGRATION_PROMPT.md   (v1 — phased migration)
│       ├── CURRENT_STATE_AUDIT.md            (audit)
│       └── 02_PROJECT_STRUCTURE_AND_LIBRARY_PROMPT.md   (this file)
└── jsconfig.json
```

### 1.1 The boundary rules (ESLint-enforced)

```
app/        →  templates, organisms                             (only)
templates/  →  organisms, molecules, atoms
organisms/  →  molecules, atoms, hooks, contexts, lib, data
molecules/  →  atoms, hooks, lib
atoms/      →  vendor/animate-ui/primitives/*, lib/cn, lib/icons
vendor/     →  (closed, no upward imports)
```

- **Nothing outside `atoms/`** may import from `radix-ui`, `@headlessui/react`,
  `@base-ui-components/react`, `@mui/material`, `lucide-react`,
  `iconsax-reactjs`, `cmdk`, `vaul`. They are wrapped exactly once.
- **Nothing outside `molecules/`** may import another molecule. (Molecules
  cannot consume other molecules; if you'd want to, you've got an
  organism.)
- **`atoms/Icon`** is the **only** file that touches the icon library.
- **`atoms/Button`** is the **only** button. Variants like ripple, flip,
  liquid, gradient, etc. are `<Button variant="ripple">` not separate
  components.

### 1.2 One file per concern. Always.

Folder layout for every component (atom, molecule, organism, template):

```
ComponentName/
├── ComponentName.jsx
├── ComponentName.module.scss
├── ComponentName.stories.jsx        ← rendered by app/(docs)
├── ComponentName.test.jsx           ← optional, but encouraged for atoms
└── index.js                         ← re-export
```

### 1.3 What lives where (cheat sheet)

| Concern | Layer | Why |
|---|---|---|
| "Show a button" | atom | Smallest reusable visual + interaction |
| "Show a label + input + helper text" | molecule (Field) | Composition of two atoms |
| "Show the RxPad form with 12 sections" | organism | Domain-aware composition |
| "Lay out the workspace: top nav + sidebar + main" | template | Pure shape, no domain |
| "/rxpad route entry" | app page | Just composes a template + organism |
| "Token / SCSS variable" | design-system | Visual contract |
| "MUI Select wired with Radix Popover" | **forbidden** | Pick one |

---

## 2. The component library composition principle

Every TP atom = **one animate-ui primitive (or animate-ui effect)** +
**one TP SCSS module** + **TP token vars only**. The animate-ui source
gives us:

- a11y (Radix/Headless/Base solve roving tabindex, focus trap, escape
  handling, portal rendering, RTL, screen-reader semantics);
- animation (Motion/`motion/react` is the animation engine);
- composability (`asChild` / `as` / `Slot` is preserved).

We add:

- visual identity (TP colors, spacing, shadows, radii from SCSS tokens);
- interaction polish suited for **clinicians on iPads** (44px+ touch
  targets, hover that does not break on touch, swipe gestures where
  natural);
- adapters for our domain (e.g. `<MedicationField/>` is a `<Field/>`
  molecule wired with our medication search API).

We **do not** add: type system noise, custom focus management, custom
portals, custom escape handling, custom dismiss-on-outside-click. The
primitive does that; if we feel tempted, we are using the wrong
primitive — switch flavor.

---

## 3. How to choose a flavor for each atom (decision rule)

Pick the lowest-cost flavor that satisfies the atom's needs. Order of
preference:

1. **Radix** — default. Smallest bundle, best a11y, best controlled-vs-
   uncontrolled story, ships every concern we need (Dialog, Popover,
   DropdownMenu, Select, Switch, Toggle, Tabs, Tooltip, Accordion,
   AlertDialog, RadioGroup, Checkbox, Slider, Progress, Separator,
   ScrollArea, NavigationMenu, ContextMenu, Menubar, HoverCard).
2. **Headless UI** — only when Radix lacks the concern: `Disclosure`,
   `Listbox` w/ multi-select-search-grouped semantics where Radix
   `Select` is too rigid, `Combobox` (autocomplete that feels like
   `cmdk` but with `as` polymorphism). Headless is also nice when we
   want render-prop access to internal state (`{(bag) => …}`).
3. **Base UI (MUI)** — when our existing TP code already binds to MUI
   semantics we don't want to rewrite (rich `Menu` with virtualization,
   `Files`, `PreviewCard`). Base UI also has the cleanest `Field` story
   if we end up wanting it.
4. **animate-ui `animate/*`** — for the animation-first variants:
   `Tabs` with the moving highlight pill (we use this for Clinical
   Tabs), `Tooltip` with shared layout, `AvatarGroup` with stagger.
   These wrap Motion directly without any primitive underneath.
5. **animate-ui `buttons/*`** — `Button`, `LiquidButton`, `RippleButton`,
   `FlipButton` are folded into our single `<Button variant="…">`.
6. **animate-ui `effects/*`** — utilities (`Highlight`, `AutoHeight`,
   `Shine`, `Tilt`, `Magnetic`, `Particles`, `Blur`, `Fade`, `Slide`,
   `Zoom`, `ImageZoom`, `Click`). Used inside atoms/molecules; never a
   public atom of their own.

A flavor decision is **per atom**, not per molecule. A molecule may
combine atoms that came from different flavors — but the molecule does
not know that.

---

## 4. Conventions for each layer (quick reference)

### 4.1 Atom shape

```jsx
// src/components/atoms/DropdownMenu/DropdownMenu.jsx
"use client";
import {
  DropdownMenu as DM,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuHighlight,
  DropdownMenuHighlightItem,
} from "@/src/vendor/animate-ui/primitives/radix/dropdown-menu";
import s from "./DropdownMenu.module.scss";

export function DropdownMenu(props) { return <DM {...props} />; }

export function Trigger({ className, ...rest }) {
  return <DropdownMenuTrigger className={cn(s.trigger, className)} {...rest} />;
}

export function Content({ sideOffset = 6, className, children, ...rest }) {
  return (
    <DropdownMenuContent
      sideOffset={sideOffset}
      className={cn(s.content, className)}
      {...rest}
    >
      <DropdownMenuHighlight className={s.highlight}>{children}</DropdownMenuHighlight>
    </DropdownMenuContent>
  );
}

export function Item({ icon, shortcut, children, className, ...rest }) {
  return (
    <DropdownMenuHighlightItem value={String(rest.value ?? children)} className={s.itemHighlight}>
      <DropdownMenuItem className={cn(s.item, className)} {...rest}>
        {icon ? <span className={s.itemIcon}>{icon}</span> : null}
        <span className={s.itemLabel}>{children}</span>
        {shortcut ? <span className={s.itemShortcut}>{shortcut}</span> : null}
      </DropdownMenuItem>
    </DropdownMenuHighlightItem>
  );
}

export const Label = (p) => <DropdownMenuLabel className={cn(s.label, p.className)} {...p} />;
export const Separator = (p) => <DropdownMenuSeparator className={cn(s.separator, p.className)} {...p} />;
```

The corresponding `DropdownMenu.module.scss` styles `.content`, `.item`,
`.itemHighlight` (the moving pill), etc., using only `var(--tp-…)`
tokens. No `bg-tp-blue-500` Tailwind classes anywhere.

### 4.2 Molecule shape

A molecule **never** imports the vendor layer. It composes atoms.

```jsx
// src/components/molecules/MedicationDropdown/MedicationDropdown.jsx
"use client";
import { DropdownMenu, Trigger, Content, Item, Separator } from "@/src/components/atoms/DropdownMenu";
import { Button } from "@/src/components/atoms/Button";
import { Icon } from "@/src/components/atoms/Icon";
import s from "./MedicationDropdown.module.scss";

export function MedicationDropdown({ items, value, onChange }) {
  return (
    <DropdownMenu>
      <Trigger asChild>
        <Button variant="outline" size="md" className={s.trigger}>
          <Icon name="MedicalCross" /> {value ?? "Choose medication"}
          <Icon name="ArrowDown2" size={14} />
        </Button>
      </Trigger>
      <Content className={s.content}>
        {items.map((it) =>
          it.divider ? (
            <Separator key={it.id} />
          ) : (
            <Item key={it.id} value={it.id} onSelect={() => onChange?.(it.id)}>
              {it.label}
            </Item>
          ),
        )}
      </Content>
    </DropdownMenu>
  );
}
```

### 4.3 Organism shape

An organism may know about your domain (RxPad, Dr.Agent, voice flow),
hold context providers, fetch data, but its visual building blocks are
all atoms/molecules.

---

## 5. The build matrix — every TP component, the primitive it uses, and why

> Conventions: **R**=Radix, **H**=Headless UI, **B**=Base UI,
> **A**=animate-ui animate/*, **M**=Motion-only (no primitive),
> **C**=composition (no underlying primitive).
>
> Each row is what Claude Code builds. Replace listed legacy files.

### 5.1 Atoms

| Atom | Primitive | Why this flavor | Replaces |
|---|---|---|---|
| `Button` | M (animate-ui `buttons/button`) | Motion-driven hover/tap scale, `asChild` slot, no a11y burden — buttons don't need primitives. Keeps `whileHover` / `whileTap` for the iPad-friendly press feedback. | `components/ui/button.tsx`, `components/tp-ui/tp-button.tsx`, `components/tp-ui/button-system/*` |
| `IconButton` | M | Variant of Button (`shape="icon"`). Same source. | `tp-ui/button-system/TPIconButton.tsx`, `TPButtonIcon.tsx` |
| `SplitButton` | C (Button + DropdownMenu atoms) | Composition only. | `tp-ui/button-system/TPSplitButton.tsx` |
| `Spinner` | M | Pure CSS keyframe; no a11y primitive needed. | `ui/spinner.tsx`, `tp-ui/tp-spinner.tsx` |
| `Icon` | C (wraps `iconsax-reactjs`) | Single chokepoint for icons. | every direct iconsax/lucide import |
| `MedicalIcon` | C | Custom SVG registry. | `tp-ui/medical-icons/*` |
| `Typography` | M | Pure styling + variants. | `tp-ui/tp-breadcrumbs.tsx::TPTypography` |
| `Label` | R (`@radix-ui/react-label` via animate-ui's mirror; tiny) | Free a11y for `htmlFor` patterns. | `ui/label.tsx` |
| `Link` | C | Just `<Link>` from Next + style. | `tp-ui/tp-breadcrumbs.tsx::TPLink` |
| `Divider` | R (Separator) | a11y-correct horizontal/vertical separator. | `ui/separator.tsx`, `tp-ui/tp-divider.tsx` |
| `Avatar` | R | Image fallback ergonomics. | `ui/avatar.tsx`, `tp-ui/tp-avatar.tsx` |
| `Badge` | M | Pure visual. | `ui/badge.tsx`, `tp-ui/tp-badge.tsx` |
| `StatusBadge` | M | Pure visual + `data-status`. | `tp-ui/tp-status-badge.tsx` |
| `Tag` | M | Pure visual. | `tp-ui/tp-tag.tsx` |
| `Chip` | M | Pure visual + delete affordance. | `tp-ui/tp-chip.tsx` |
| `Kbd` | M | Pure visual. | `ui/kbd.tsx` |
| `Tooltip` | A (animate-ui `animate/tooltip`) | Floating-UI based; shared `LayoutGroup` lets the same tooltip morph between triggers — perfect for our Rx hover affordances. iPad-aware (long-press fallback). | `ui/tooltip.tsx`, `tp-ui/tp-tooltip.tsx` |
| `Popover` | R | Smallest, focus-trap correct, used heavily across product. | `ui/popover.tsx`, `tp-ui/tp-popover.tsx` |
| `Input` | C | Just `<input>`; primitive overhead unjustified. | `ui/input.tsx`, `tp-ui/tp-textfield.tsx` |
| `Textarea` | C | Same. Auto-grow via `textarea-autosize` if needed (small dep). | `ui/textarea.tsx` |
| `NumberInput` | C (with `+` / `−` buttons, holds repeat) | Long-press auto-repeat tuned for iPad. | `tp-ui/tp-number-input.tsx` |
| `OtpInput` | R (use animate-ui radix `input-otp` style; or our existing `input-otp` package) | Cursor + caret semantics. | `ui/input-otp.tsx`, `tp-ui/tp-otp-input.tsx` |
| `Checkbox` | R | a11y + indeterminate state baked in. animate-ui's radix variant ships a tick stroke animation we want. | `ui/checkbox.tsx`, `tp-ui/tp-checkbox.tsx` |
| `Radio` | R | Roving focus done right. | `ui/radio-group.tsx`, `tp-ui/tp-radio.tsx` |
| `Switch` | R | Same; thumb spring courtesy of animate-ui. | `ui/switch.tsx`, `tp-ui/tp-switch.tsx` |
| `Toggle` | R | One-button toggle. | `ui/toggle.tsx`, `ui/toggle-group.tsx` |
| `Slider` | R | Multi-thumb, RTL, keyboard. | `ui/slider.tsx`, `tp-ui/tp-slider.tsx` |
| `Progress` | R | a11y + indeterminate. | `ui/progress.tsx`, `tp-ui/tp-progress.tsx` |
| `Skeleton` | M | Pure visual. | `ui/skeleton.tsx`, `tp-ui/tp-skeleton.tsx` |
| `Select` | R for ≤30 items, **H (Headless `Listbox` + `Combobox`)** when we need search/groups/multi-select | Radix Select is fast but rigid; Headless gives `as` + `displayValue` + grouping. The TP product uses both patterns. Pick at the call site by passing `searchable` / `multiple` props. Internally the atom switches implementation. | `ui/select.tsx`, `tp-ui/tp-select.tsx` |
| `DatePicker` | **B (Base UI date primitives)** with `react-day-picker` for the calendar grid | Our existing `TPDatePicker` already uses MUI internals; Base UI keeps that semantic. | `ui/calendar.tsx`, `ui/date-range-picker.tsx`, `tp-ui/tp-date-picker.tsx` |
| `TimePicker` | C (numeric inputs + Popover) | Custom component, no primitive worth pulling. | `tp-ui/tp-time-picker.tsx` |

### 5.2 Molecules

| Molecule | Composition | Why |
|---|---|---|
| `Field` | Label + Input/Textarea/etc + helper + error | One ergonomic pattern for every form row. |
| `SearchInput` | Input + Icon + clear button + optional `cmdk`-style suggestions | Used in RxPad search, sidebar filters. |
| `SegmentedControl` | atom Toggle + animate-ui `effects/highlight` for the moving pill | The pill follows the selection — feels native on iPad. |
| `DropdownMenu` | atom Popover variant (R) + animate-ui Highlight | Already discussed in §4.1. |
| `ContextMenu` | R | Same surface as DropdownMenu but right-click triggered. |
| `Menubar` | R | Top-level app menu (rarely used in product, but in (docs)). |
| `NavigationMenu` | R | Top nav with submenu rollover. |
| `HoverCard` | R | Patient mini-card on hover in lists. |
| `ConfirmDialog` | atom Dialog (R) wrapper with prebuilt primary+destructive | Used for "Discard draft?", "End visit?". |
| `Dialog` | R | Modal + overlay + focus-trap. |
| `AlertDialog` | R | Same with non-dismissable variant. |
| `Drawer` | **B** (Base UI Sheet) for desktop side panels, **vaul** for mobile bottom-sheet feel | `vaul` already in deps, gives the rubbery drag affordance. |
| `Sheet` | R | Side sheet on desktop. |
| `Snackbar` / `Toast` | `sonner` (already in deps) wrapped once | Top-of-screen, queued, swipe to dismiss on iPad. |
| `Banner` | M | In-page persistent notice (appointment ready, recording active). |
| `Alert` | M | Static notice. |
| `Card` | M | Pure visual surface; many variants via `data-variant`. |
| `Accordion` | A (animate-ui `animate/auto-height`) on top of R | Smooth open/close because medical history accordions look bad without it. |
| `Breadcrumbs` | C | Just composition. |
| `Pagination` | C | Composition of Button + Select. |
| `Stepper` | M + Highlight | Workflow progress (booking flow). |
| `Tabs` | A (animate-ui `animate/tabs`) for our standard tabs; **R** when we need true ARIA tablist with controlled URL state | Animate-ui tabs come with the moving underline pill that matches our brand. |
| `ClinicalTabs` | extends Tabs molecule with badge counts + stickier touch targets for iPad | Domain-flavored Tabs. |
| `Table` | C (HTML semantics) + `@tanstack/react-table` only if we need sort/filter/virtualization | Avoid pulling react-table if our tables are static. |
| `ClinicalTable` | extends Table molecule with column-toggle and dense mode | Domain-flavored Table. |
| `Timeline` | M | Vertical event list (Voice session history). |
| `TreeView` | C (recursion) | File tree / departments. |
| `TransferList` | C (two ListBox columns + Buttons) | Configuration screens. |
| `EmptyState` | M | Hero illustration + title + CTA. |
| `Rating` | C | Five-star rating. |
| `ColorPicker` | C | Used by clinic theming. |
| `FileUpload` | C (drag/drop + click) | Medical records upload. |
| `SearchFilterBar` | SearchInput + Chip + Select | Top of every list page. |
| `AppointmentBanner` | C | Top-of-page banner when an appointment is in progress. |
| `PatientInfoHeader` | C | Patient identity strip atop RxPad / patient details. |
| `SecondaryNavPanel` | C | Sidebar pill column. |
| `Command` | `cmdk` (already in deps), wrapped once | Cmd-K palette. Used inside the Dr.Agent shortcuts. |
| `Resizable` | `react-resizable-panels` (already in deps), wrapped once | Three-pane workspace layout. |
| `ScrollArea` | R | Custom scrollbars in panels. |
| `AspectRatio` | R | Image media. |
| `Carousel` | `embla-carousel-react` (already in deps), wrapped once | Onboarding only. |
| `Chart` | `recharts` (already in deps), wrapped with our token palette | Vitals graphs. |
| `Calendar` | included in DatePicker atom |  |

### 5.3 Organisms (high-level inventory; full mapping in v1 prompt §7.3)

`RxPadShell`, `RxPadTopNav`, `RxPadSecondarySidebar`, `RxPad`,
`RxPadPage`, `RxCustomiseSidebar`, `RxPreviewSidebar`, `RxPreviewDocument`,
`DrAgentPanel`, `DrAgentFab`, `DrAgentPage`, `VoiceRxFlow`,
`VoiceRxActiveAgent`, `VoiceRxRecorderPanel`, `VoiceRxResultTabs`,
`VoiceRxBottomSheet`, `VoiceRxCanvas`, `VoiceRxLiveBorder`,
`VoiceRxSiriWaveform`, `VoiceTranscriptCard`, `VoiceRxFab`,
`ClinicalNotesEditor`, `AppointmentsBoard`, `AppointmentSnackbars`,
`PatientDetailsPanel`, `PrintPreview`, `EndVisitPage`.

Each organism is rebuilt by deleting Tailwind soup and replacing every
shadcn/MUI import with the new atom/molecule. No new behavior — see v1
prompt §0 invariants.

### 5.4 Templates

| Template | Slots | Used by |
|---|---|---|
| `WorkspaceTemplate` | `topNav`, `secondarySidebar`, `main`, optional `rightDock` (Dr.Agent) | RxPadPage, PatientDetailsPage, EndVisitPage, AppointmentsBoard |
| `PrintTemplate` | `header`, `body`, `footer` | PrintPreview |
| `DocsTemplate` | `nav`, `body` | (docs) routes |

### 5.5 Effects (utilities, not atoms)

Copied from animate-ui `effects/`. Imported only by atoms/molecules:

| Effect | Used inside |
|---|---|
| `Highlight` / `HighlightItem` | DropdownMenu Item active state, Tabs underline, SegmentedControl pill |
| `AutoHeight` | Accordion content, expandable cards |
| `Fade` / `Slide` / `Zoom` | Dialog content, Snackbar enter/exit |
| `Shine` / `ShineBorder` | RxPad AI overlay border (we already have a `ShineBorder` keyframe — replace) |
| `Tilt` / `Magnetic` | optional, only on (docs) showcases. **Not in product UI.** |
| `Particles` / `Blur` | only on hero/marketing surfaces. **Not in product UI.** |

> **Rule:** if an animate-ui effect makes the UI "fancier" without
> serving the clinician (e.g. magnetic cursor on a medication search), it
> stays out of the product. Effects in product code must serve
> legibility, focus, or feedback — never decoration. Clinical UI
> reviewers will flag anything that doesn't (see
> `clinical-ui-reviewer` skill in our repo).

---

## 6. Adaptation recipe — animate-ui primitive → TP atom

Follow this checklist verbatim for every atom listed in §5.1.

1. **Copy the primitive** from
   `src/vendor/animate-ui/primitives/<flavor>/<name>/index.tsx` into our
   tree. Do not modify it. Convert to `.jsx` (strip TS) only if Phase 3
   of v1 has run; otherwise leave as `.tsx` until then.
2. **Create the TP atom file** under
   `src/components/atoms/<Name>/<Name>.jsx`.
3. **Re-export the primitive's pieces** as small TP-flavored wrappers.
   Each wrapper:
   - applies the TP class via `className={cn(s.something, className)}`;
   - never duplicates a feature the primitive already gives (e.g., do
     not add a focus ring in JS — let the primitive emit `data-state` and
     style on `[data-state="open"]` in SCSS);
   - forwards all other props.
4. **Author the SCSS module** (`<Name>.module.scss`):
   - `@use "@/src/design-system/tokens" as t;` (top of file).
   - Use **only** `var(--tp-…)` for colors, shadows, radii, spacing.
   - Style on the primitive's `data-*` attributes:
     `data-state="open|closed|on|off|active|inactive"`,
     `data-side="top|right|bottom|left"`,
     `data-orientation="horizontal|vertical"`,
     `data-disabled`, `data-highlighted`. animate-ui (and Radix) emit
     these consistently.
   - Animations: prefer `motion.div`'s
     `initial / animate / exit / transition` (already in primitive). For
     SCSS-only animations, use `transition` properties driven by token
     `--motion-…` vars.
5. **Iterate the API down to the union of usages** by grepping the
   product code for the legacy component name and listing every prop in
   use. If a prop is unused, do not expose it.
6. **Document the atom** in JSDoc + a `<Name>.stories.jsx` showcase.
7. **Wire the storybook page** under `app/(docs)/components/<group>/page.jsx`.
8. **Visual diff** the storybook page against the pre-migration
   screenshot. Iterate until pixel diff is zero (sub-pixel font
   differences are acceptable; document any).

---

## 7. iPad + desktop scalability strategy

### 7.1 Breakpoint scale (`_breakpoints.scss`)

```scss
$bp-sm:        480px;   // small phone (not a target)
$bp-tablet:    768px;   // iPad portrait
$bp-tablet-lg: 1024px;  // iPad landscape
$bp-desktop:   1280px;  // smallest desktop
$bp-wide:      1536px;  // wide desktop
```

```scss
// _responsive.scss
@mixin media($key) {
  @if      $key == tablet     { @media (min-width: 768px)  { @content; } }
  @else if $key == tablet-lg  { @media (min-width: 1024px) { @content; } }
  @else if $key == desktop    { @media (min-width: 1280px) { @content; } }
  @else if $key == wide       { @media (min-width: 1536px) { @content; } }
  @else if $key == touch      { @media (hover: none) and (pointer: coarse) { @content; } }
  @else if $key == hover      { @media (hover: hover) and (pointer: fine)   { @content; } }
}
```

### 7.2 Touch-target rule

Every interactive atom enforces:

```scss
.button,
.iconButton,
.checkbox,
.radio,
.switch,
.tab,
.menuItem,
.chip {
  min-height: 36px;     // desktop
  min-width:  36px;
  @include media(touch) {
    min-height: 44px;   // iPad / iOS HIG
    min-width:  44px;
  }
}
```

For atoms where the visible thumb is smaller than 44px (e.g., a 24px
checkbox tick), the **hit area** is enlarged via padding while the
visual stays small — the atom uses `position: relative` with a `::before`
pseudo-element absorbing taps.

### 7.3 Hover that doesn't break on touch

Replace bare `:hover` styles with:

```scss
@include media(hover) {
  &:hover { background: var(--tp-blue-50); }
}
&[data-state="open"],
&[data-active] {
  background: var(--tp-blue-100);   // iPad active state via tap
}
```

### 7.4 Two-up vs three-up workspace

The RxPad workspace has three columns on desktop: secondary sidebar (Rx
sections), main RxPad form, Dr.Agent panel. On iPad portrait, two
columns max (sidebar collapses to a tab strip; Dr.Agent moves to a
bottom sheet). The `WorkspaceTemplate` template owns this logic — no
organism re-implements it.

### 7.5 Pointer adaptation per molecule

| Molecule | Desktop | iPad |
|---|---|---|
| `DropdownMenu` | hover-and-click for sub-menus | tap-only sub-menus, larger row height |
| `Tooltip` | hover after 400ms | long-press 600ms (animate-ui handles this) |
| `Drawer` | side slide | swipe-up bottom sheet (vaul) |
| `Tabs` | click | swipe between panels (use animate-ui `auto-height` + Embla under the hood **only** for the in-visit Rx pad; do not replace ARIA tablist semantics) |
| `Sidebar` | always-visible rail | collapsed rail with reveal-on-tap |
| `RxPad` form rows | inline edit | tap-to-open keyboard sheet |

### 7.6 Type scale adapts (per `design.md`)

`--font-size-body: 14px;` on desktop. On iPad we **do not** scale up
type — the design uses density. Touch is solved by hit-area, not by
larger text. (This is intentional and matches the existing product.)

---

## 8. Reusability contract (the "no duplicate component" rule)

Every PR that adds a component must answer:

1. Does an existing atom or molecule already do this? If yes — extend
   it. If you can't extend it cleanly, the existing atom needs splitting,
   not a new sibling.
2. If new: can it live as a **variant** (`<Button variant="ghost">`)
   instead of a new file? If yes — variant.
3. If new and not a variant: is it generic (no domain knowledge)? If
   yes — atom or molecule. If no — organism.
4. The new file's SCSS module imports tokens and **nothing else**. No
   shared helper SCSS partial that "happens to be used by 3 components"
   — push to `mixins/` if truly shared, otherwise inline.
5. The new file is wired into a `(docs)` storybook page in the same PR.
   No undocumented atoms.

ESLint enforces (1) and (3) via `boundaries` plugin. Stylelint enforces
(4)'s "no hex literals" / "tokens only" rule. The rest is PR review.

---

## 9. Phase 2.5 — what changes in the v1 plan

The v1 prompt's Phase 2 ("Build the atomic component library") splits
into two sub-phases now:

**Phase 2a — Vendor**
Branch: `migration/02a-vendor`
- Copy `animate-ui-main/packages/ui/src` and the relevant
  `apps/www/registry/{primitives,components}/{radix,headless,base,animate,buttons,effects}`
  trees into `src/vendor/animate-ui/`.
- Copy animate-ui's `lib/get-strict-context.ts`, `hooks/use-controlled-state.ts`,
  `hooks/use-data-state.ts`. Convert to `.js` if Phase 3 has run.
- Add a `src/vendor/animate-ui/README.md` listing the source commit SHA
  of `animate-ui-main` and the date copied. This is our provenance log.
- Add npm deps the primitives need (already satisfied by current
  package.json for radix-ui; `@headlessui/react` and
  `@base-ui-components/react` need adding only when we first consume a
  headless or base atom).
- **Remove** `class-variance-authority`, `tailwind-merge`, the duplicate
  `iconsax-react`, `@phosphor-icons/react`, `@mui/icons-material` from
  package.json (already in v1 §6, kept here for clarity).

**Phase 2b — Atoms then molecules**
Branch: `migration/02b-atoms-molecules`
- Build atoms in the order in §5.1, each in its own commit:
  Button → IconButton → Spinner → Icon → MedicalIcon → Typography →
  Label → Link → Divider → Avatar → Badge → StatusBadge → Tag → Chip →
  Kbd → Tooltip → Popover → Input → Textarea → NumberInput → OtpInput →
  Checkbox → Radio → Switch → Toggle → Slider → Progress → Skeleton →
  Select → DatePicker → TimePicker.
- Build molecules in the order in §5.2.
- Each commit is a small PR with the corresponding `(docs)` page wired
  up. Visual diff must pass before merging.

The rest of v1 (Phase 3 codemod, Phase 4 SCSS migration, Phase 5 page
rewiring, Phase 6 cleanup, Phase 7 polish) is unchanged.

---

## 10. Per-component build matrix — the executable list for Claude Code

When Claude Code starts a session for atom X, the prompt body is:

> Build the `<X>` atom per
> `docs/migration/02_PROJECT_STRUCTURE_AND_LIBRARY_PROMPT.md` row in §5.1.
>
> 1. Copy the source primitive listed in the row from
>    `src/vendor/animate-ui/primitives/<flavor>/<name>/index.tsx`.
> 2. Create `src/components/atoms/<X>/<X>.jsx`,
>    `<X>.module.scss`, `<X>.stories.jsx`, `index.js`.
> 3. The atom's public API is the **union of every prop currently used
>    by product code** for this concern. Grep all `*.tsx` under
>    `components/` for the legacy component (e.g. `TPButton`, `Button`
>    from `@/components/ui/button`, `MuiButton`) and enumerate the props
>    in JSDoc.
> 4. SCSS module uses only `var(--tp-…)` tokens from
>    `@/src/design-system/tokens`. No hex literals. Even-pixel scale.
> 5. Touch targets per §7.2. Hover-vs-touch per §7.3.
> 6. Visual diff must zero against
>    `docs/migration/baseline-screenshots/(docs)/components/<group>/<viewport>.png`.
> 7. Update `app/(docs)/components/<group>/page.jsx` to import the new
>    atom's `<X>.stories.jsx`.
>
> Do not touch product code in `app/{rxpad,invisit,patient-details,…}` or
> `components/{tp-rxpad,voicerx,…}`. That happens in Phase 4.

For molecules, swap "primitive" for "atoms it composes" and forbid
direct vendor imports.

---

## 11. Common pitfalls (read once, avoid forever)

1. **Don't mix `motion/react` and CSS keyframes in the same component
   for the same property.** They will fight. Pick one.
2. **Don't reach into a primitive's internal class names.** Style on
   `data-*` attributes only.
3. **Don't use the `cn()` helper as a Tailwind-merge substitute.** It is
   a string joiner. If you find yourself merging utility classes, you
   are still doing the old thing — move into SCSS.
4. **Don't fork an animate-ui primitive.** If you need to change its
   behavior, wrap it. If wrapping isn't enough, raise a ticket and pin
   the discussion before touching `vendor/`.
5. **Don't put domain knowledge in atoms or molecules.** A `Field` does
   not know about prescriptions. A `MedicationField` (organism-level
   composition) does.
6. **Don't ship the `effects/{Particles, Tilt, Magnetic}` to product
   surfaces.** They are demo-only.
7. **Don't introduce Tailwind utility classes in new code.** Remove the
   `@import 'tailwindcss'` line at end of Phase 4 (v1 prompt).
8. **Don't add a new icon library.** We have one (`iconsax-reactjs`)
   and one wrapper (`atoms/Icon`). Anything else is a bug.
9. **Don't write `style={{}}` for static values.** Static → SCSS.
   Dynamic → CSS custom property write.
10. **Don't break the boundary rules in §1.1.** Adding a `// eslint-disable`
    in a PR is grounds for revert.

---

## 12. How to call this from Claude Code

For each atom (or molecule, or organism, or template) start a new
Claude Code session pointed at the repo with:

```
You are building a single component for tp-voicerx per
docs/migration/02_PROJECT_STRUCTURE_AND_LIBRARY_PROMPT.md.

Component:    <Name>            (e.g. DropdownMenu)
Layer:        atom | molecule | organism | template
Primitive:    <flavor>          (e.g. radix)
Replaces:     <legacy files>    (paste from the matrix row)

Constraints (hard, no exceptions):
  • SCSS module only, tokens only, no Tailwind utilities, no hex literals.
  • API = union of every prop currently used by product code (grep first,
    enumerate in JSDoc, then implement).
  • Touch targets and hover-vs-touch per §7.
  • No new dependency unless §5 explicitly lists one.
  • Visual diff against the corresponding baseline must be zero.
  • Do not touch any file outside src/components/<layer>/<Name>/ and
    app/(docs)/components/<group>/page.jsx.

Deliverables:
  1. The four files in src/components/<layer>/<Name>/.
  2. Updated (docs) page wiring.
  3. Visual-diff report.
  4. List of every legacy file deleted (or marked for deletion in Phase 6).
```
