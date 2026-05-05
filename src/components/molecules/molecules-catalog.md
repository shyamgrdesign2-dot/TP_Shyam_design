# Molecules — catalog

> **Scope:** every composed-but-still-generic component in `src/components/molecules/`.
> **Audience:** designers (which composed pattern fits this layout?), frontend devs (compose features without reinventing dialogs/tables/etc.), PMs (vocabulary), AI assistants (avoid recreating existing patterns).
> **Read when:** you need a dialog, table, drawer, banner, calendar, command palette, etc. — check here before building one.
> **Sibling docs:** [`../component-library.md`](../component-library.md) (rules) · [`../atoms/atoms-catalog.md`](../atoms/atoms-catalog.md) · [`../organisms/organisms-map.md`](../organisms/organisms-map.md) (where domain-specific compositions live).

Composed UI patterns built from atoms. **Still domain-agnostic** — a
molecule could ship in a generic UI library.

> **Import rule:** molecules may import atoms + sibling molecules, plus Radix UI primitives, `@/src/hooks/utils`, and design tokens. Never `organisms/`.

## Catalog

### Surfaces

| Molecule | Purpose |
|---|---|
| `Card` | Padded white surface with shadow + radius. The default container. |
| `Drawer` | Side-sliding sheet (left/right/top/bottom). |
| `Dialog` | Centered modal with overlay. Generic primitive. |
| `ConfirmDialog` | Specialized "Are you sure?" dialog with title + warning callout + primary/secondary CTAs. **Pattern:** primary CTA (right, blue) is the safe action; secondary CTA (left) is destructive — use `secondaryTone="destructive"` to render it red. |
| `EmptyState` | Centered illustration + title + body + optional action. |

### Navigation

| Molecule | Purpose |
|---|---|
| `Tabs` | Horizontal tab strip + content panels (Radix Tabs). |
| `Breadcrumbs` | Inline breadcrumb path. |
| `Pagination` | Page-number controls. |
| `DropdownMenu` | Action menu — kebab, "More", filter dropdowns. (Radix DropdownMenu.) |
| `Command` | Searchable command palette (cmdk). |

### Feedback

| Molecule | Purpose |
|---|---|
| `Snackbar` | Single bottom toast — success / error / info / warning. |
| `Toaster` | Sonner-based toast manager (mounted globally in `layout.jsx`). |
| `FlashSnackbar` | URL-flag triggered toast (e.g. `?flash=rx-saved`). |
| `Banner` | Inline page-top banner — informational / warning. |
| `Alert` | Inline contextual alert with icon + title + description. |
| `Accordion` | Collapsible disclosure (Radix Accordion). |

### Data

| Molecule | Purpose |
|---|---|
| `Table` | Generic table primitives (head/body/row/cell). |
| `ClinicalTable` | Domain-flavored table with status pills + interaction patterns specific to clinical lists. |
| `Timeline` | Vertical timeline with dot + title + description per row. |
| `DateRangePicker` | Calendar-driven date range picker with preset chips ("Today", "This Week", "Till Date"…). |

### Product-specific

| Molecule | Purpose |
|---|---|
| `AppointmentBanner` | Hero banner used at the top of the appointment screen. Decorative gradient + title. |

## Patterns to know

### Confirm dialogs (destructive flows)

The recording-confirm and back-confirm dialogs follow a fixed pattern:

- **Primary CTA (right, blue solid)** = the SAFE action. Examples: "Keep recording", "No, Stay Here", "Save as Draft".
- **Secondary CTA (left, link)** = the destructive action, painted RED via `secondaryTone="destructive"`. Examples: "Discard & Go Back", "Yes, Edit Rx".

```jsx
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Are you sure?"
  warning="Going back loses your current session."
  primaryLabel="Save as Draft"
  onPrimary={handleSave}
  secondaryLabel="Discard & Go Back"
  secondaryTone="destructive"
  onSecondary={handleDiscard}
/>
```

### Toaster

Mount `<Toaster>` once in the root layout (already done in
`src/app/layout.jsx`). Trigger toasts from anywhere via `import { toast } from "sonner"`.

```jsx
import { toast } from "sonner";
toast.success("Saved.");
```

### FlashSnackbar (URL-driven)

For toasts that should appear after a navigation, set a query param on
the destination URL and let `<FlashSnackbar>` surface it on arrival.

## When to use what

| If you need… | Reach for |
|---|---|
| Modal "are you sure?" with destructive flow | `ConfirmDialog` |
| Generic centered modal | `Dialog` |
| Side-sliding panel | `Drawer` |
| Bottom-of-screen toast (one-off) | `toast()` from sonner |
| Inline contextual alert | `Alert` (or `Banner` for page-top) |
| Right-click / kebab menu | `DropdownMenu` |
| Filter or search palette | `Command` |
| Static white surface | `Card` |
| Date range filter | `DateRangePicker` |

## Adding a molecule

Same shape as adding an atom (folder + `<Name>.jsx` + module SCSS +
index barrel). Re-export from [`./index.js`](./index.js).

If your "molecule" needs context, app state, or feature data — it's an
organism, not a molecule. Move it to `src/components/organisms/<feature>/`.
