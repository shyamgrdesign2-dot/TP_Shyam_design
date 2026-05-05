# Component library — atomic-design rules

> **Scope:** the philosophy, layering rules, and import boundaries for every component in `src/components/`.
> **Audience:** frontend devs (where does my new component go?), designers (which layer am I designing for?), PMs (mental model of how the UI is organised), AI assistants (apply the right boundary when proposing a component).
> **Read when:** adding a new component, refactoring, reviewing a PR that adds UI, or onboarding to the project.
> **Sibling docs:** [`atoms/atoms-catalog.md`](./atoms/atoms-catalog.md) · [`molecules/molecules-catalog.md`](./molecules/molecules-catalog.md) · [`organisms/organisms-map.md`](./organisms/organisms-map.md) · [`../../design.md`](../../design.md) (visual contract).

This folder is the **only** place UI is defined in the project. Every
button, dialog, table, and feature panel lives here and is consumed by
the routes in `src/app/`.

We follow Brad Frost's atomic design model with strict layering:

```
atoms ──▶ molecules ──▶ organisms ──▶ pages (in src/app/)
```

Components on a given layer may **only** import from the same layer
or a layer below. ESLint enforces this — see `eslint.config.mjs`.

---

## The three layers

### `atoms/` — primitives
Smallest UI building blocks. **No domain knowledge.** A `Button` knows
about variants, sizes, themes, but not about prescriptions. Atoms
consume only:
- **Hand-rolled internals — zero third-party UI deps.** Every atom in
  the catalog ships without any `@radix-ui/*` (or other UI lib) import.
- Shared overlay primitives from [`@/src/hooks/ui/`](../hooks/ui/) — `Slot`, `Portal`, `DialogPrimitive`, `use-overlay` (positioning, focus trap, scroll lock, escape, click-outside).
- Design tokens (`var(--tp-*)`)
- Internal hooks (`@/src/hooks/utils`)

Think: Button, Input, Badge, Tooltip, Avatar, Spinner, Chip, Tag,
Switch, Checkbox, Radio.

> Catalog → [`atoms/atoms-catalog.md`](./atoms/atoms-catalog.md)

### `molecules/` — composed UI patterns
Combinations of atoms with their own structure. **Still domain-agnostic.**
A `Card` is a molecule; a `ConfirmDialog` is a molecule (composes a
button + dialog primitive); `DateRangePicker` is a molecule.

Molecules import atoms and Radix primitives — never organisms.

Think: Card, Dialog, ConfirmDialog, Drawer, DropdownMenu, Tabs,
Accordion, Pagination, Snackbar, Toaster, Banner, EmptyState, Table,
ClinicalTable, Timeline, Breadcrumbs, AppointmentBanner.

> Catalog → [`molecules/molecules-catalog.md`](./molecules/molecules-catalog.md)

### `organisms/` — features
Feature implementations that compose atoms + molecules and carry
domain knowledge: RxPad, Dr.Agent, VoiceRx, the secondary sidebar.
Organisms can import other organisms (subfeatures) and depend on
context providers (`useRxPadSync`, `useCustomModules`, `useTemplate`).

Organisms are organized by feature:

```
organisms/
  rxpad/             RxPad consultation experience (~190 files)
    form/            The Rx form itself
    dr-agent/        AI brand panel (own docs at dr-agent/docs/)
    secondary-sidebar/  Blue side rail with patient context panels
    sections/        Per-section panels used by the sidebar
    custom-modules/  Doctor-defined Rx modules
    templates/       Saved-template system
    digitization/    Schema adapters for incoming structured data
  voicerx/           Voice-to-EMR transcription subsystem
                     See voicerx/voicerx-subsystem.md.
  typerx/            Type-driven Rx flow (sibling of voicerx)
  shared/            Cross-page chrome — top nav, patient header, banner.
  providers/         App-level theme provider.
```

> Map → [`organisms/organisms-map.md`](./organisms/organisms-map.md)

---

## Import rules (enforced by ESLint)

```
atoms      → atoms, Radix, hooks/utils, design-system tokens   ✅
atoms      → molecules                                          ❌
atoms      → organisms                                          ❌

molecules  → atoms, molecules                                   ✅
molecules  → organisms                                          ❌

organisms  → atoms, molecules, organisms (siblings or subtrees) ✅

src/app/   → organisms (entry-point components only)            ✅
src/app/   → molecules / atoms                                  ✅ (rare)

ALL        → @/src/hooks/utils  for `cn()`                      ✅
ANY        → @/components/...   from the deleted root           ❌
ANY        → @/lib/...                                          ❌
ANY        → @mui/material directly in product code             ❌
```

---

## Naming

- **Folder = component name in PascalCase.** `Button/`, `ConfirmDialog/`, not `button/`.
- **Entry file = `<Name>.jsx`**. `Button/Button.jsx`.
- **Module styles = `<Name>.module.scss`** colocated.
- **Barrel = `<Folder>/index.js`** that re-exports the entry. Never put logic in barrels.
- **`atoms/index.js`** and **`molecules/index.js`** re-export everything in their layer.

---

## How we removed Radix entirely

We previously kept Radix for the harder primitives (positioning,
focus trap, asChild). FE feedback was that the per-package import
surface was too noisy in `package.json`. So we hand-rolled every
overlay primitive into a single internal layer at [`@/src/hooks/ui/`](../hooks/ui/):

| Internal primitive | Replaces | What it does |
|---|---|---|
| [`Slot`](../hooks/ui/Slot.jsx) | `@radix-ui/react-slot` | The `asChild` mechanism — clones a single React child and merges props (event handlers chain, refs merge, className/style concatenate). |
| [`Portal`](../hooks/ui/Portal.jsx) | `@radix-ui/react-*.Portal` | Synchronous `createPortal` to `document.body` (SSR-safe, no mount gate). |
| [`useEscape`, `useClickOutside`, `useScrollLock`, `useFocusTrap`, `usePosition`](../hooks/ui/use-overlay.js) | scattered Radix internals | Shared overlay hooks. `usePosition` is the keystone — collision-aware flip + clamp. |
| [`DialogPrimitive`](../hooks/ui/DialogPrimitive.jsx) | `@radix-ui/react-dialog` + `react-alert-dialog` | Headless `Root/Trigger/Portal/Overlay/Content/Title/Description/Close` with focus trap + scroll lock + ESC. Backs `Dialog`, `Drawer`, `ConfirmDialog`. |

Components built on top:

| Component | Layer | Notes |
|---|---|---|
| `atoms/Tooltip` | atom | Hover/focus + delay; supports both wrapper (`<Tooltip content="…">`) and compound (`Provider/Trigger asChild/Content`) APIs. |
| `atoms/Popover` | atom | Toggle trigger, click-outside, ESC, position flip. |
| `molecules/Dialog` | molecule | Composes `DialogPrimitive` for the standard centered modal. |
| `molecules/Drawer` | molecule | Composes `DialogPrimitive` for the side-sheet variant. |
| `molecules/ConfirmDialog` | molecule | `role="alertdialog"` + Action/Cancel slots. |
| `molecules/DropdownMenu` | molecule | Trigger asChild, ESC + click-outside close, arrow-key nav, close-on-select. |
| `molecules/Tabs` | molecule | Roving tabindex + arrow-key nav; `data-state="active|inactive"` preserved for SCSS. |
| `molecules/Accordion` | molecule | Single/multiple, collapsible; `data-state="open|closed"` preserved. |

**Rule for new atoms / molecules:** hand-roll, no third-party UI lib.
Reuse the helpers in `@/src/hooks/ui/` instead of pulling a new
package. If you think you need a new external dep, post in #frontend
first — there's almost always a way to compose the existing helpers.

---

## How to add a new component

1. **Decide the layer.** Single-purpose with no domain coupling? Atom.
   Composed but still generic? Molecule. Feature-specific? Organism.
2. **Create the folder** under the right layer. Add:
   - `<Name>.jsx`
   - `<Name>.module.scss` (if styled)
   - `index.js` re-exporting from the entry.
3. **Add it to the barrel** at `<layer>/index.js` (atoms/molecules only — organisms are imported by full path).
4. **Read [`design.md`](../../design.md)** for the visual contract: even-pixel sizes, typography scale, color tokens, icon rules.
5. **Use existing tokens.** `var(--tp-blue-500)`, `var(--tp-slate-700)`, etc. Never hard-code hex.
6. **Test the boundary.** `npm run lint` should pass — if it complains about an import, you're crossing a layer.

---

## How to find what already exists

```bash
# All atoms
ls src/components/atoms/

# All molecules
ls src/components/molecules/

# Organism subtrees
ls src/components/organisms/

# Search for an existing component
grep -rln "ConfirmDialog" src/components/
```

The two index files (`atoms/index.js` and `molecules/index.js`) are the
authoritative list of what's exposed.

---

## What if my component is slightly domain-specific?

It probably belongs in `organisms/`, not `molecules/`. Ask: would I
ship this in a generic `@tatvapractice/ui` npm package? If no, it's an
organism.

Examples:
- `Button` — yes (atom).
- `AppointmentBanner` — surfaces appointment context but uses no app
  state, so it's a molecule.
- `VoiceRxMiniFab` — couples to recording state and the VoiceRx brand
  → organism (lives in `organisms/voicerx/`).
- `RxPadFunctional` — clearly an organism.

---

## Related docs

- `../../design.md` — visual contract (sizing, typography, color, icons).
- `../../engineering.md` — overall app wiring.
- `atoms/atoms-catalog.md` — atom catalog.
- `molecules/molecules-catalog.md` — molecule catalog.
- `organisms/organisms-map.md` — feature map.
- `organisms/rxpad/rxpad-subsystem.md` — RxPad consultation feature deep-dive.
- `organisms/voicerx/voicerx-subsystem.md` — voice subsystem.
- `organisms/rxpad/dr-agent/docs/dr-agent-docs-index.md` — Dr.Agent panel deep-dive index.
