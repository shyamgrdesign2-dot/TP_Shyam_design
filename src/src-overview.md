# `src/` — application source overview

> **Scope:** the entire `src/` tree — `app/`, `components/`, `design-system/`, `hooks/`. The single source of truth for application code.
> **Audience:** anyone new to the codebase (devs, designers, PMs, AI assistants) — this is the one-screen orientation. Skim it before opening sub-docs.
> **Read when:** onboarding to the project, getting un-lost ("where does this kind of file live?"), or pasting context into an AI tool that needs the high-level layout.
> **Drill-down docs:** [`app/routes-and-pages.md`](./app/routes-and-pages.md) · [`components/component-library.md`](./components/component-library.md) · [`design-system/design-tokens-and-theme.md`](./design-system/design-tokens-and-theme.md) · [`hooks/hooks-reference.md`](./hooks/hooks-reference.md).

Everything the Next.js app loads at runtime lives in this folder. The
project root has zero application code — only config files
(`package.json`, `next.config.mjs`, `eslint.config.mjs`, `jsconfig.json`,
`postcss.config.mjs`, `tsconfig.json` for the `app/api/**` TypeScript
endpoint).

## Tree

```
src/
  app/                  Next.js App Router. Each <route>/page.jsx is a URL
                        handler — typically a 2-line wrapper around an
                        organism. Route-private feature code (e.g. patient
                        details, all-patients) is colocated alongside its
                        page.jsx. See src/app/routes-and-pages.md.

  components/           Atomic-design library — the only place UI is defined.
    atoms/              Smallest UI primitives. Domain-agnostic.
    molecules/          Composed UI patterns. Still domain-agnostic.
    organisms/          Feature trees that compose atoms + molecules and
                        carry domain knowledge (RxPad, VoiceRx, etc.).
    providers/          App-level React context providers (theme, etc.).
    See src/components/component-library.md.

  design-system/        Visual contract source.
    tokens/             SCSS token definitions (color, type, spacing).
    mixins/             Reusable SCSS mixins.
    base/               Global resets.
    theme/              MUI theme bridge (legacy, narrow surface).
    *.js                JS-side token constants for runtime consumers.
    See src/design-system/design-tokens-and-theme.md.

  hooks/                Shared React hooks + utilities.
    use-mobile.js, use-toast.js, use-touch-device.js, utils.js
    See src/hooks/hooks-reference.md.
```

## Two simple rules

1. **One canonical home per concept.** A button is in `atoms/Button/`, the
   appointment banner is in `molecules/AppointmentBanner/`, the RxPad
   shell is in `organisms/rxpad/`. There is never a parallel
   implementation elsewhere.

2. **Imports flow downward.** Pages import organisms; organisms import
   molecules + atoms; molecules import atoms; atoms only consume
   primitives (Radix UI, hooks, tokens). ESLint enforces this — see
   `eslint.config.mjs`.

## Where things actually live (cheat sheet)

| Looking for… | Path |
|---|---|
| Page that handles `/foo` | `src/app/foo/page.jsx` |
| Implementation of that page | `src/app/foo/<FooPage>.jsx` (single-route features) **or** `src/components/organisms/<feature>/` (cross-route) |
| A button, badge, input, tooltip | `src/components/atoms/<Name>/` |
| A dialog, drawer, table, accordion | `src/components/molecules/<Name>/` |
| RxPad form / sections / dr-agent / sidebar / voice | `src/components/organisms/{rxpad,voicerx,typerx,shared}/` |
| Color / spacing / typography tokens | `src/design-system/tokens/_*.scss` + `src/design-system/design-tokens.js` |
| `cn()` classname helper | `src/hooks/utils.js` |
| Global keyframes + Tailwind v4 + reset | `src/app/globals.css` |
| Root layout (fonts, providers) | `src/app/layout.jsx` |

## "Why is this folder here?"

| Folder | Reason it exists, in one line |
|---|---|
| `app/` | Next.js requires it — one `page.jsx` per URL. |
| `components/atoms/` | Single-purpose UI primitives that any feature can pick up. |
| `components/molecules/` | Composed UI patterns that aren't tied to a single feature. |
| `components/organisms/` | Feature implementations (RxPad, VoiceRx, AI panel) that compose the library. |
| `components/providers/` | Top-of-tree React context (theme, toaster). |
| `design-system/` | Visual tokens — the source for `var(--tp-*)` CSS variables and `$tp-*` SCSS variables. |
| `hooks/` | Reusable hooks used by any layer; `cn()` lives here. |

## What was deleted in the recent cleanup

For history: pre-migration the project had parallel trees at the root
(`/components`, `/lib`, `/hooks`, `/app`). Those have all been
collapsed into `src/`. If you find a reference to `@/components/...`
in any file, that's stale — fix it to `@/src/components/...`.
