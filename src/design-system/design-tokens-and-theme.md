# Design tokens and theme

> **Scope:** every design token (colors, type, spacing, radii, shadows, motion) and the SCSS mixins / MUI theme bridge that consume them — the implementation living in `src/design-system/`.
> **Audience:** designers (the source of every brand value), frontend devs (which token to use for a given visual decision), AI assistants (use these instead of hard-coding hex / px), PMs (vocabulary for visual review).
> **Read when:** picking a color / spacing / type style, adding a new token, or auditing a component for token compliance.
> **Companion doc:** [`../../design.md`](../../design.md) — the *rules* (even-pixel sizing, typography ramp, color usage). Read it first; this folder is the implementation of those rules.

Single source of truth for **how things look**: color tokens,
typography, spacing, radii, shadows, the SCSS mixins that consume
them, and the legacy MUI theme bridge.

## Tree

```
design-system/
  tokens/                    SCSS token definitions.
    _colors.scss             Brand + slate + semantic palettes ($tp-*).
    _typography.scss         Font families + sizes + weights.
    _spacing.scss            Spacing scale (2/4/6/8/10/12/14/16/…).
    _radii.scss              Border-radius scale.
    _shadows.scss            Elevation shadows.
    _z-index.scss            Stacking context constants.
    _motion.scss             Transition durations + easings.
    _index.scss              `@forward` barrel — `@use "tokens"` to import everything.

  mixins/                    Reusable SCSS mixins.
    _typography.scss         Heading / body / mono ramps.
    _layout.scss             Flex / grid utility mixins.
    _surface.scss            Card / panel surface mixins.
    _focus.scss              Focus-visible styling.
    _media.scss              Breakpoint media queries.
    _index.scss              `@forward` barrel.

  base/                      Global resets / base styles loaded once.
    _reset.scss              CSS reset.
    _typography.scss         Body / heading defaults.
    _index.scss              Barrel.

  theme/                     MUI theme bridge.
    tp-mui-theme-export.js   `tpTheme` consumed by the legacy
                              <ThemeProvider> in components/providers/.

  design-tokens.js           JS-side color + spacing constants.
                              Use when CSS variables aren't available
                              (e.g. inline styles inside .jsx).
  component-tokens.js        Per-component token bundles consumed
                              by docs / export tooling.
```

## How tokens reach your components

Two channels:

### 1. CSS custom properties (preferred — runtime)
The token files compile into CSS custom properties on `:root`. Use
them directly in any component:

```jsx
<span style={{ color: "var(--tp-blue-500)" }} />
```
```scss
.foo { color: var(--tp-blue-500); padding: 12px; }
```

### 2. SCSS variables (compile-time, in `.module.scss` files)
```scss
@use "@/src/design-system/tokens" as t;

.foo {
  color: t.$tp-blue-500;
  font-size: t.$tp-font-size-body;
  border-radius: t.$tp-radius-md;
}
```

### 3. JS constants (rare — when you literally need a string)
```js
import { TP_BLUE_500 } from "@/src/design-system/design-tokens";
```

Prefer (1) over (3). JS constants are a last resort for inline-style
gradients / dynamic computed colors that can't be expressed in CSS.

---

## Color naming

Brand palette:
- `--tp-blue-50` … `--tp-blue-900` — primary blue (CTAs, links).
- `--tp-violet-50` … `--tp-violet-900` — AI / informational.
- `--tp-slate-50` … `--tp-slate-900` — text + neutral surfaces.
- `--tp-success-*`, `--tp-warning-*`, `--tp-error-*` — semantic.

Rules of thumb:
- `--tp-blue-500` is reserved for primary CTAs only.
- `--tp-slate-700` is the default body / icon color.
- `--tp-violet-*` is for AI / informational only — never CTA fill.
- Hairline borders: `--tp-slate-100` (very light) or `--tp-slate-200`.

> Full color rules + correct/incorrect examples in `../../design.md`.

---

## Typography

| Use | Family | Size |
|---|---|---|
| Body | Inter | 14 px |
| Meta / subtitle | Inter | 12 px |
| Heading | Mulish | 16 / 18 / 20 / 24 / 28 / 32 px |
| Trackers (uppercase labels) | Inter | 10 px |

Loaded once in `src/app/layout.jsx` via `next/font/google`. Available
on `<body>` as the `--font-sans` and `--font-heading` CSS variables.

**Forbidden sizes:** 9, 11, 13, 15, 17, 19, 21, 23 px. Use the next
even step.

---

## Spacing scale

Allowed values (all even): `2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 ·
20 · 24 · 32 · 40 · 48 · 64 · 80`. Anything else is wrong.

Most layouts use `6 / 8 / 12 / 14 / 16` for tight detail and
`24 / 32` for section breaks.

---

## Radii

`2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 9999` (fully rounded).
Cards: 12 or 14. Inputs: 8 or 10. Buttons: 8, 10, or 12.

---

## How to add a token

1. Add it to the appropriate file in `tokens/`.
2. If it's user-facing (color, spacing, radius, shadow), it should
   compile to a CSS custom property automatically (the `tokens/_*.scss`
   files emit `:root { --tp-*: $tp-* }` blocks — match the existing
   pattern).
3. If JS code consumes it, add a matching constant to
   `design-tokens.js`.
4. Run `npm run build` to confirm the SCSS compiles cleanly.

---

## Adding to the MUI theme bridge

The bridge in `theme/tp-mui-theme-export.js` exists because
`@mui/material/styles/<ThemeProvider>` is still imported in
`components/providers/tp-theme-provider.jsx` for legacy compatibility
with libraries that hook into MUI's theme. Keep this surface narrow —
**no product code uses MUI directly.** Don't add tokens here that
aren't already in the SCSS / CSS-variable layer.

---

## Cross-references

- `../../design.md` — verbal contract. Every visual rule in plain English.
- `../components/component-library.md` — how components consume these tokens.
- `../app/globals.css` — global reset + Tailwind v4 base + keyframes.
