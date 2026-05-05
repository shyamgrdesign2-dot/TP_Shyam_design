# Dr.Agent Sizing Rules — STRICT

> **Read this before writing any new component, card, button, label, badge,
> tooltip, coachmark, or arbitrary `text-[Npx]` / padding / radius value
> inside the Dr.Agent surface.**
>
> These rules are not suggestions. Code review will bounce odd-number sizes.

---

## The rule

**Every numeric size token inside Dr.Agent must be an EVEN number.**

This applies to:

- Font sizes (`text-[Npx]`, inline `style.fontSize`)
- Line heights expressed in `px` (prefer unitless multipliers, but if you
  must use px, keep them even)
- Padding (`p-`, `px-`, `py-`, `pt-`, `pb-`, `pl-`, `pr-`, arbitrary
  `[Npx]`)
- Margin / gap (`m-`, `gap-`, etc.)
- Border radius (`rounded-[Npx]`)
- Width / height for icon chips, button squares, fixed-size dots/pills
- Border widths (1px is fine — even via convention; 2px, 4px otherwise)

## Why

- Subpixel rendering on non-Retina screens turns odd values into blurry
  half-pixels.
- Even values compose cleanly under `scale()` transforms (drag previews,
  flip animations).
- The TP design system is built on a 2px / 4px grid; odd numbers break
  the grid the moment they meet a parent that snaps to it.
- Our designers ship tokens in even values. Drifting from that creates
  silent visual debt every time you eyeball a margin.

## Font sizes — allowed values

| Use | Size |
|---|---|
| Body / default copy, list items, table cells, CTA labels | **14px** |
| Secondary / subtitle / meta / badge / tooltip body | **12px** |
| Uppercase trackers, microcaps, "SOURCES" / "CURRENT SESSION" labels | **10px** |

**Floor: 10px.** Nothing smaller. Ever. If you feel the urge to go to 9px,
the right move is to rephrase the label or shorten it, not shrink it.

**No 11px. No 13px. No 11.5px. No 13.5px.** These have no place in the
Dr.Agent. If a designer's mock shows 13px, treat it as 14px and move on.

## Spacing & radius — allowed values

Even integers, drawn from this scale:

```
2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 · 32 · 40 · 48
```

**No 5px. No 7px. No 9px. No 11px. No 13px. No 15px.**

`gap-1.5` (6px) is fine. `gap-[5px]` is not.

## Border radii — allowed values

```
2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 9999 (full)
```

Cards typically use 14 or 16. Buttons typically use 8, 10, or 12. Icon
chips typically use 6 or 8. Pills use 9999.

## Quick lookup — what to use instead

| You wrote | Use this instead |
|---|---|
| `text-[11px]` | `text-[12px]` |
| `text-[11.5px]` | `text-[12px]` |
| `text-[13px]` | `text-[14px]` |
| `text-[13.5px]` | `text-[14px]` |
| `text-[15px]` | `text-[14px]` or `text-[16px]` |
| `gap-[7px]` | `gap-[6px]` or `gap-[8px]` |
| `px-[5px]` | `px-[4px]` or `px-[6px]` |
| `py-[3px]` | `py-[2px]` or `py-[4px]` |
| `rounded-[5px]` | `rounded-[4px]` or `rounded-[6px]` |
| `rounded-[9px]` | `rounded-[8px]` or `rounded-[10px]` |
| `h-[34px]` | `h-[32px]` or `h-[36px]` |

## When to break the rule

**Don't.**

The two narrow exceptions (and they really are narrow):

1. **1px hairlines** — borders, dividers. Always allowed.
2. **`leading-[1.5]` / `leading-[1.6]` etc.** — unitless line-height
   multipliers are not pixel sizes; they're fine.

If you genuinely believe a third exception applies, ping the design
review channel before merging. Don't ship the odd value first and ask
permission later.

## Enforcement checklist for any new code

Before you commit, grep your diff:

```bash
git diff --name-only --diff-filter=AM | xargs grep -nE '\[(11|13|15|17|19|21|23|25|27|29|31|33|35)(\.[0-9]+)?px\]' || true
```

Any hit = fix it.
