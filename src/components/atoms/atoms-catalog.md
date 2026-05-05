# Atoms — catalog

> **Scope:** every primitive UI component shipped in `src/components/atoms/`.
> **Audience:** designers (pick the right primitive), frontend devs (compose), PMs (vocabulary check), AI assistants (canonical inventory before suggesting "build a button…").
> **Read when:** designing a new screen, building a new component, or wondering "do we already have an X?".
> **Sibling docs:** [`../component-library.md`](../component-library.md) (rules) · [`../molecules/molecules-catalog.md`](../molecules/molecules-catalog.md) · [`../../design-system/design-tokens-and-theme.md`](../../design-system/design-tokens-and-theme.md) (tokens these atoms consume).

Smallest UI primitives. Each atom is **domain-agnostic** — it can be
shipped in a generic UI library without any change.

> **Import rule:** atoms may only consume Radix UI, design tokens (`var(--tp-*)`), and `@/src/hooks/utils`. Never `molecules/`, never `organisms/`.

## Quick rules for designers + devs

- **Even-pixel sizes only.** 14, 16, 20, 24, 32, 36, 40… No 11/13/15/17.
- **Touch target ≥ 36 px** desktop, ≥ 44 px iPad.
- **Color via tokens.** `var(--tp-blue-500)`, `var(--tp-slate-700)`, never raw hex.
- **CTAs use Linear iconsax variant** (Button + similar). Decorative icons may use Bulk/Bold.

## Catalog

| Atom | Purpose | Variants / props summary |
|---|---|---|
| `Avatar` | Round profile chip with image / initials fallback. | size: sm/md/lg, optional badge dot. |
| `Badge` | Small pill that labels status / count. | tone: default / success / warning / error / info / brand. |
| `Button` | Primary CTA. Solid / outline / link / ghost; size sm/md/lg; theme primary/neutral/error. | See `Button/button-system/` for tokens. |
| `Checkbox` | Single boolean control with optional label. | states: default, hover, focus, disabled, error. |
| `Chip` | Removable tag-pill (filter chips, multi-select). | dismissible, onDismiss. |
| `Divider` | Hairline horizontal/vertical rule. | orientation, length, tone. |
| `Input` | Single-line text field. Supports leading/trailing icons. | size sm/md/lg; states default/error/disabled. |
| `MedicalIcon` (`TPMedicalIcon`) | Mask-painted medical glyph (ECG, virus, syringe, etc.). | name, variant: linear/bulk, size, color. |
| `NoiseOverlay` | Subtle film-grain texture for premium surfaces. | intensity. |
| `OTPInput` | One-time password / pin entry. | length, autoSubmit. |
| `Popover` | Floating card anchored to a trigger. Wraps Radix Popover. | side, align, offset. |
| `Progress` | Linear progress bar / spinner-line. | indeterminate, value. |
| `Radio` | Single-select control in a radio group. | states match Checkbox. |
| `Select` | Native-style dropdown. Wraps Radix Select. | options, placeholder, size. |
| `ShineBorder` | Animated gradient border (used on AI/processing surfaces). | shineColor[], borderWidth, duration, variant. |
| `ShinyText` | Animated gradient text for AI captions. | gradient, speed. |
| `Skeleton` | Pulsing placeholder block while loading. | width, height, radius. |
| `Slider` | Value slider with track + thumb. | min, max, step, orientation. |
| `Spinner` | Circular spinner (loading indicator). | size, tone. |
| `Switch` | Toggle (on/off). | checked, disabled, size. |
| `Tag` | Static label with bg + border. (Different from Chip — Tag is non-dismissible.) | tone, size. |
| `Tooltip` | Hover/focus tooltip. Wraps Radix Tooltip. | side, align, delay. |
| `TutorialPlayIcon` | Branded play-button glyph that points to a tutorial. | size. |

## When to use what

| If you need… | Reach for |
|---|---|
| The standard CTA | `Button` |
| Status text + color in a small pill | `Badge` |
| Removable filter or multi-select pill | `Chip` |
| A non-removable label pill | `Tag` |
| A single-line text field | `Input` |
| A pin/OTP entry | `OTPInput` |
| Dropdown picker | `Select` (or `molecules/DropdownMenu` for action menus) |
| Boolean toggle | `Switch` (immediate effect) or `Checkbox` (form field) |
| Loading: bar | `Progress` |
| Loading: shape | `Skeleton` |
| Loading: ring | `Spinner` |
| Hover description | `Tooltip` |
| Floating panel | `Popover` (atom) — for small content; for full dialogs use `molecules/Dialog`. |
| Medical glyph | `MedicalIcon` (TPMedicalIcon) |
| AI/processing flair | `ShineBorder`, `ShinyText` |

## Adding an atom

1. Create `src/components/atoms/<Name>/`.
2. Add `<Name>.jsx`, optional `<Name>.module.scss`, `index.js` barrel.
3. Read [`../../../design.md`](../../../design.md) — sizing, typography, color tokens, even-pixel rule.
4. Implement.
5. Re-export from [`./index.js`](./index.js).
6. Run `npm run build` and `npm run lint`. Boundary errors mean you're importing something an atom shouldn't.

## Examples

```jsx
// Simple consumption
import { Button } from "@/src/components/atoms/Button";
import { Badge } from "@/src/components/atoms";  // via barrel

<Button variant="solid" theme="primary" size="md" onClick={save}>
  Save
</Button>

<Badge tone="success">Verified</Badge>
```
