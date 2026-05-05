# Design System Reference

> The visual + interaction contract for TatvaPractice / Dr.Agent / VoiceRx surfaces.
> Read this before writing any new component, card, button, or callout.

This file is the single source of truth for **how things look**. The
companion files cover **how things are wired** (`engineering.md`) and
**how to plug in a real backend** (`integration.md`).

---

## 1. Sizing rules — STRICT

**Every numeric size must be an EVEN number.** No exceptions in product UI.

| Token type | Allowed values | Floor |
|---|---|---|
| Font size | `10px · 12px · 14px · 16px · 18px · 20px · 24px · 28px · 32px` | **10px** (uppercase trackers only) |
| Spacing / gap / padding | `2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 · 32 · 40 · 48` | 2px |
| Border radius | `2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 9999` | 2px |
| Border width | `1px` (hairlines) or `2px` | 1px |

**Banned values:** `9px · 11px · 13px · 15px · 17px · 11.5px`. If a Figma mock shows them, round up to the nearest even value (13 → 14, 11 → 12).

**Exceptions** (genuinely the only ones):
- `1px` hairline borders / dividers
- Unitless line-heights (`1.4`, `1.5` — multipliers, not pixels)

---

## 2. Type scale

| Use | Size | Weight | Notes |
|---|---|---|---|
| Body / list items / table cells / CTA labels | 14px | 400 | The default. If unsure, use 14. |
| Card titles | 14px | 600 | CardShell applies this automatically |
| Subtitles / meta / tooltip / badge | 12px | 400–500 | |
| Uppercase trackers ("SOURCES", "SESSION") | 10px | 600 | Only place 10px is allowed |

Line-heights: `1.4` for compact UI text, `1.5` for paragraph copy, `1` only for single-line label rows.

---

## 3. Color tokens

Always use CSS custom properties. Never hardcode hex values in components.

### Brand
- `var(--tp-blue-500)` — primary brand. Reserved for primary CTAs and brand accents.
- `var(--tp-blue-50)` / `var(--tp-blue-100)` — hover and surface variants.
- `var(--tp-violet-50)` / `var(--tp-violet-300)` / `var(--tp-violet-500)` — AI / Dr.Agent signature color.

### Neutrals (default chrome)
- `var(--tp-slate-50)` — page surface tints
- `var(--tp-slate-100)` — soft fills, hover backgrounds
- `var(--tp-slate-200)` — borders
- `var(--tp-slate-400)` — disabled / placeholder
- `var(--tp-slate-500)` — meta text
- `var(--tp-slate-600)` — secondary text, label
- `var(--tp-slate-700)` — **default body / icon color** (the workhorse)
- `var(--tp-slate-800)` / `var(--tp-slate-900)` — headings, hover states

### State
- `var(--tp-success-500)` / `var(--tp-success-600)` — success, "Filled" flash
- `var(--tp-error-500)` / `var(--tp-error-600)` — destructive
- `var(--tp-warning-500)` / `var(--tp-warning-600)` — warning callouts (canvas coachmark)

### Color rules
1. **Inline icons default to `tp-slate-700`**, hover to `tp-slate-900`. Not brand blue.
2. **Coachmark callouts use the amber/warning palette** — amber reads "pay attention", blue reads "marketing".
3. **"Filled" success flash uses `tp-success-500`** with the `vrx-filled-flash` keyframe.
4. **Section header tints** (e.g., `rgba(var(--tp-slate-100-rgb), 0.7)`) are intentionally low-contrast.

---

## 4. Styling approach

New components use **SCSS Modules**. Legacy components may still use Tailwind classes during the migration window.

### New component (SCSS Module pattern)
```jsx
// MyCard.module.scss
.card {
  border-radius: 12px;
  padding: 16px;
  background: var(--tp-slate-50);
  color: var(--tp-slate-700);
  font-size: 14px;
}
.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--tp-slate-800);
}
```
```jsx
// MyCard.jsx
import styles from "./MyCard.module.scss";

export function MyCard({ title, children }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      {children}
    </div>
  );
}
```

### Dynamic values (can't go in SCSS)
Use CSS custom property writes for geometry-computed or state-driven values:
```jsx
<div style={{ "--bar-width": `${pct}%` }} className={styles.bar} />
```
```scss
.bar { width: var(--bar-width); }
```

### Where each atom lives
New atoms are in `src/components/atoms/`. Each has its own `<Name>.module.scss`.
```
src/components/atoms/
  Button/Button.jsx + Button.module.scss
  Input/Input.jsx   + Input.module.scss
  Tooltip/Tooltip.jsx + Tooltip.module.scss
  … (15 atoms total)
```

Import atoms directly:
```jsx
import { Button } from "@/src/components/atoms/Button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/atoms/Tooltip";
```

---

## 5. Component patterns

### CardShell (`components/tp-rxpad/dr-agent/cards/CardShell.jsx`)

The chrome for every Dr.Agent card. Anatomy:

```
┌─────────────────────────────────────────┐
│ [icon] Title          [extras]   [▼]    │  ← header (gradient bg)
│        Subtitle                          │
├─────────────────────────────────────────┤
│ {children}                               │  ← body
├─────────────────────────────────────────┤
│ [actions row, optional]                  │
└─────────────────────────────────────────┘
```

**Required props**: `icon`, `title`, `children`. **Common props**: `tpIconName`, `date`, `badge`, `copyAll`, `collapsible`, `dataSources`.

**Don't reinvent it.** A new card type is `<CardShell><MyContent /></CardShell>`.

### Section list pattern

Used in PatientReportedCard, VoiceStructuredRxCard, Lab cards:
1. `SectionSummaryBar` — gray-100 bar with section icon + title + trailing copy action
2. `<ul>` of `<li>` rows — bullet + content + copy icon (hover-reveal on desktop, soft on touch)

### Footer CTAs

**Primary** (filled blue):
```jsx
<button className={styles.primaryCta}>Copy all to RxPad</button>
```
```scss
.primaryCta {
  display: flex;
  height: 42px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: var(--tp-blue-500);
  &:hover { background: var(--tp-blue-600); }
}
```

**Secondary** (outline):
```scss
.secondaryCta {
  display: flex;
  height: 36px;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  border: 1px solid var(--tp-blue-300);
  background: white;
  font-size: 14px;
  font-weight: 600;
  color: var(--tp-blue-500);
  &:hover { background: var(--tp-blue-50); }
}
```

**When to use which**:
- Card-internal "Copy to RxPad" → secondary outline
- Canvas-level primary action ("Copy all to EMR") → primary filled
- Page-level decisive actions ("End Visit", "Save & Print") → primary filled

### Coachmark / heads-up callout

Amber palette, soft gradient bg, dismissible. First-time-only via `localStorage[KEY_v1]`. Bump `_v1 → _v2` if copy changes.

```scss
.coachmark {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 10px;
  padding: 8px 28px 8px 10px;
  background: linear-gradient(180deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.04) 100%);
  border: 1px solid rgba(245,158,11,0.30);
  position: relative;
}
```

### Naked icon buttons

The default for icon-only affordances inside a pill or container:
```scss
.iconBtn {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--tp-slate-700);
  &:hover { color: var(--tp-slate-900); }
  &:active { transform: scale(0.92); }
}
```

---

## 6. Animation tokens

| Use | Duration | Easing |
|---|---|---|
| Button press / scale feedback | 120ms | linear |
| Hover color change | 160–180ms | ease |
| Card fades / mounts | 220ms | ease-out |
| Panel flips / large transitions | 320ms | `cubic-bezier(0.16,1,0.3,1)` |
| Word-stagger reveals | 340ms per word, 35ms stagger | `cubic-bezier(0.22,1,0.36,1)` |

**Honor `prefers-reduced-motion`:**
```scss
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Keyframe animations that live in `app/globals.css`:
- `vrx-filled-flash` — green success flash on copy confirmation
- `vrx-submit-sheen` — horizontal shine sweep on transcript processing card
- `vrx-sidebar-fill-flash` — sidebar update receipt flash
- `voice-blob-*` — mic blob morphing animations

---

## 7. Touch targets

| Context | Minimum size |
|---|---|
| Desktop | 36×36px |
| iPad (iOS HIG) | 44×44px |

Use `useTouchDevice()` from `@/src/hooks/use-touch-device` to conditionally apply larger targets.

---

## 8. Voice / VoiceRx-specific

### Recorder vs canvas chrome
- **Recorder** (active recording): mode pill says `"Conversation Mode"` / `"Dictation Mode"` — verb says you're IN it.
- **Canvas** (post-submit review): mode pill says `"Structured Clinical Notes"` — names the OUTPUT.

### Shiner card (transcript processing)
Used during post-submit processing. Slate-50 bg, 2.2s shine sweep, italic transcript with word-stagger reveal. Component: `VoiceTranscriptProcessingCard` (`components/voicerx/`).

### Sidebar batch deferral
Voice-rx submit does NOT immediately apply vitals/history updates. Updates ride on `voiceRxResult.pendingSidebarBatch` until the doctor hits "Copy all to EMR". This keeps the canvas a clean preview surface.

---

## 9. UX principles

1. **One heading per surface.** If chrome already names something, don't add a duplicate header inside the card.
2. **Default-visible affordances on focused-review surfaces.** Hover-reveal is for crowded list views only.
3. **First-run education uses one-time coachmarks**, never permanent banners. Persisted via localStorage with a version suffix.
4. **"What" vs "how"**: card titles name the data; footer CTAs say what to do with it.
5. **Two surfaces showing the same data differ in chrome, not content.** Chat preview and canvas show the same `VoiceStructuredRxData`; only affordances differ.
6. **Pre-clinical errors are silent**: slow network or mic not ready → panel adapts (loader, retry) — never a red banner. See `engineering.md` for the error matrix.
