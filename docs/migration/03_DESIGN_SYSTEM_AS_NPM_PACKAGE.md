# Tatva Practice Design System → npm-installable package

> Companion to v1 (`CLAUDE_CODE_MIGRATION_PROMPT.md`) and v2
> (`02_PROJECT_STRUCTURE_AND_LIBRARY_PROMPT.md`).
>
> Those two prompts assume the design system lives **inside** the
> VoiceRx repo. This prompt makes it a **separate, versioned, npm-
> installable package** that VoiceRx (and any future TP product) consumes
> as a dependency.

---

## 0. The philosophy (read this twice)

We are using Radix UI, Headless UI, Base UI, MUI, lucide-react,
iconsax-reactjs, cmdk, vaul, motion, react-day-picker, recharts,
embla-carousel, sonner, input-otp, react-resizable-panels under the
hood. **None of those are our design system.** They are instruments.

**`@tatvapractice/ui` is the design system.** Every atom and every
molecule we ship is a TP-branded, TP-opinionated component:

- TP visual identity (tokens from `@tatvapractice/tokens` only — no
  primitive's default look bleeds through).
- TP API shape — props named the way our team thinks, not the way each
  upstream primitive thinks. The TP `Button`'s API is `variant`, `size`,
  `loading`, `leftIcon`, `rightIcon`, `tone` regardless of whether the
  primitive underneath is Radix's `Slot`, animate-ui's motion button,
  or a plain `<button>`.
- TP a11y baseline — every interactive atom enforces a 44px touch hit
  area on `(hover: none)` even if the underlying primitive doesn't care.
- TP behavior contract — controlled-vs-uncontrolled patterns, error /
  loading / disabled states, RTL story, focus ring color all match
  across every atom because **our** wrapper enforces them, not the
  upstream primitive's defaults.

The wrapper is not a thin pass-through. It is **the product**. When a
consumer imports `Button` from `@tatvapractice/ui`, they should not
need to know whether Radix or Headless or Motion is underneath — and a
year from now, if we swap the primitive, the API stays the same.

That is the difference between "we use Radix" and "we have a design
system". This package is the second thing.

The mental model:

```
┌────────────────────────────────────────────────────────────┐
│  @tatvapractice/ui                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Atoms  (Button, Input, Checkbox, …)                 │  │
│  │  Molecules (Field, DropdownMenu, Drawer, …)          │  │
│  │  TP API · TP tokens · TP a11y · TP touch behavior    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                 │
│                          │  wraps exactly once             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Vendored / peer-dep primitives                      │  │
│  │  Radix · Headless · Base · MUI · Motion · iconsax    │  │
│  │  cmdk · vaul · lucide · day-picker · recharts · …    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

The bottom box is implementation. The top box is what people import.
Consumers (VoiceRx and the next three TP products) **only ever touch
the top box**.

---

## 0.1 Background — what's in the repo today

The repo zip you uploaded
(`Tatva Practice DesignSystem-main`) currently contains:

- a Next.js app shell (mirrors VoiceRx);
- **174 `.tsx`** files in mixed directories (`components/ui/`,
  `components/tp-ui/`, `components/rxpad/`, `components/tp-rxpad/`,
  `components/rx/`, `components/appointments/`, …);
- **10 `.jsx` + 10 `.module.scss` files** under `components/tp-hui/`
  (Button, Switch, Checkbox, RadioGroup, Input, Textarea, Select,
  Listbox + the probe page) — this is the cleanest signal of where
  you want to go;
- one shared token file (`styles/tokens.scss`);
- four `.claude/worktrees/` from previous experiments
  (`strange-carson`, `modest-satoshi`, `codex-main-view`,
  `strange-carson-copy`) — all should be wiped.

Today, the design system is **not a library** — it is a Next.js demo
app with one component family (`tp-hui/`) that points the right
direction. The VoiceRx repo cannot install it because there is nothing
to install.

This document tells Claude Code, in phases, how to take this repo and
ship it as `@tatvapractice/ui` v0.1.0 — a real package on a real
registry, with a real `dist/`, that VoiceRx can `npm install` and
consume.

---

## 1. Final target — what the package looks like in the wild

After all phases:

```bash
# In the VoiceRx repo
npm install @tatvapractice/ui @tatvapractice/tokens @tatvapractice/icons
```

```jsx
// app/layout.jsx
import "@tatvapractice/tokens/dist/tokens.css";  // CSS custom properties
import { TPThemeProvider } from "@tatvapractice/ui";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TPThemeProvider>{children}</TPThemeProvider>
      </body>
    </html>
  );
}
```

```jsx
// app/rxpad/page.jsx
import { Button, DropdownMenu, Field, Input } from "@tatvapractice/ui";
import { Stethoscope } from "@tatvapractice/icons";

// or per-component imports for tree-shaking on slow tools:
import { Button } from "@tatvapractice/ui/button";
```

```scss
// In any consumer .scss file
@use "@tatvapractice/tokens/scss" as t;

.localBox {
  background: var(--tp-blue-50);   // CSS var (runtime themable)
  border-radius: t.$radius-md;     // SCSS var (compile-time)
}
```

Tagged version `0.1.0` lives on **GitHub Packages** (private registry,
TP organization). Consumers authenticate via an `.npmrc` with an `auth
token` granted to the developer. CI in the design-system repo runs
`changesets` to compute version bumps from PR labels and publishes on
merge to `main`.

---

## 2. Final target — repository layout

The design-system repo becomes a **pnpm monorepo** with three published
packages and one private docs app. Single repo, one publish flow.

```
tatvapractice-ui/                     ← rename DesignSystem-main → this
├── .changeset/                       ← changesets config + pending bumps
├── .github/workflows/
│   ├── ci.yml                        ← lint + build + visual diff on every PR
│   ├── release.yml                   ← changesets → publish on merge to main
│   └── docs-deploy.yml               ← deploy storybook to Vercel
├── .npmrc                            ← registry mapping for @tatvapractice
├── packages/
│   ├── tokens/                       ← @tatvapractice/tokens
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── _colors.scss
│   │   │   ├── _typography.scss
│   │   │   ├── _spacing.scss
│   │   │   ├── _radii.scss
│   │   │   ├── _shadows.scss
│   │   │   ├── _motion.scss
│   │   │   ├── _z-index.scss
│   │   │   ├── _breakpoints.scss
│   │   │   └── index.scss            ← @forward + :root export
│   │   ├── scripts/build.mjs         ← emits dist/{tokens.css, tokens.scss, tokens.js, tokens.json}
│   │   ├── dist/                     ← published artifact (built, not committed)
│   │   └── README.md
│   │
│   ├── icons/                        ← @tatvapractice/icons
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── medical/              ← TP custom medical SVG components
│   │   │   ├── icon.jsx              ← single chokepoint wrapping iconsax-reactjs
│   │   │   └── index.js
│   │   ├── tsup.config.mjs
│   │   ├── dist/
│   │   └── README.md
│   │
│   └── ui/                           ← @tatvapractice/ui
│       ├── package.json
│       ├── src/
│       │   ├── theme/
│       │   │   ├── ThemeProvider.jsx
│       │   │   ├── tp-mui-theme.js
│       │   │   └── index.js
│       │   ├── lib/
│       │   │   ├── cn.js
│       │   │   ├── slot.jsx
│       │   │   ├── useControlledState.js
│       │   │   ├── useDataState.js
│       │   │   └── getStrictContext.js
│       │   ├── atoms/
│       │   │   ├── Button/
│       │   │   │   ├── Button.jsx
│       │   │   │   ├── Button.module.scss
│       │   │   │   └── index.js
│       │   │   ├── IconButton/
│       │   │   ├── Spinner/
│       │   │   ├── ...                ← every atom from v2 prompt §5.1
│       │   ├── molecules/             ← every molecule from v2 prompt §5.2
│       │   └── index.js               ← barrel re-export
│       ├── tsup.config.mjs
│       ├── dist/                      ← built ESM + CJS + .d.ts (optional)
│       └── README.md
│
├── apps/
│   └── docs/                         ← Storybook 8 — the live design-system site
│       ├── package.json
│       ├── .storybook/
│       │   ├── main.ts
│       │   ├── preview.jsx
│       │   └── theme.ts
│       ├── src/
│       │   └── stories/              ← one .stories.jsx per atom/molecule
│       └── public/
│
├── tools/
│   ├── eslint-config/                ← @tatvapractice/eslint-config (workspace dep)
│   ├── stylelint-config/             ← @tatvapractice/stylelint-config
│   └── jsconfig-base/                ← @tatvapractice/jsconfig-base
│
├── package.json                      ← workspace root, private: true
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json                        ← orchestrates build/lint/test across packages
├── .changeset/config.json
├── .gitignore
├── .nvmrc
└── README.md
```

### What's gone

The Next.js app shell (`app/`, `next.config.mjs`, `postcss.config.mjs`),
the duplicated component families (`components/ui/`, `components/tp-ui/`,
`components/rxpad/`, `components/rx/`, `components/appointments/`,
`components/tp-rxpad/`, `components/tp-appointment-screen/`,
`components/shared/`, `components/docs/`), the `.claude/worktrees/`
folder, the `vercel.json`, and the demo pages all **leave the
design-system repo** and live only in VoiceRx (or whichever product
consumes them).

The design-system repo's job is **library only**. No product code, no
demo pages outside the storybook.

---

## 3. Package responsibilities (one sentence each)

| Package | Job |
|---|---|
| `@tatvapractice/tokens` | The visual contract: every color, spacing, radius, shadow, font, motion, z-index, breakpoint. Ships `.scss`, `.css`, `.js`, `.json`. |
| `@tatvapractice/icons` | One wrapper around `iconsax-reactjs` + the custom medical SVG set. The only place icons are imported. |
| `@tatvapractice/ui` | Every atom + molecule from v2 prompt §5. Imports `@tatvapractice/tokens` and `@tatvapractice/icons`. Peer-deps React, Motion, Radix, Headless, Base, MUI as the v2 matrix dictates. |

This split is **required**, not optional:

- A consumer can install `@tatvapractice/tokens` alone (e.g. for a
  marketing site) without pulling React.
- The icons package is tiny and can be tree-shaken independently.
- The UI package's bundle stays auditable — every dep is a peer dep.

---

## 4. package.json templates

### 4.1 `packages/tokens/package.json`

```jsonc
{
  "name": "@tatvapractice/tokens",
  "version": "0.0.0",
  "description": "TatvaPractice design tokens — colors, spacing, radii, shadows, motion. Multi-format.",
  "type": "module",
  "sideEffects": ["dist/tokens.css"],
  "main": "./dist/tokens.cjs",
  "module": "./dist/tokens.js",
  "types": "./dist/tokens.d.ts",
  "exports": {
    ".":         { "import": "./dist/tokens.js", "require": "./dist/tokens.cjs", "types": "./dist/tokens.d.ts" },
    "./css":     "./dist/tokens.css",
    "./scss":    "./dist/tokens.scss",
    "./json":    "./dist/tokens.json",
    "./package.json": "./package.json"
  },
  "files": ["dist", "src/**/*.scss", "README.md"],
  "scripts": {
    "build": "node scripts/build.mjs",
    "dev": "node scripts/build.mjs --watch",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "sass": "^1.83.0",
    "chokidar": "^3.6.0"
  },
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.pkg.github.com"
  }
}
```

### 4.2 `packages/ui/package.json`

```jsonc
{
  "name": "@tatvapractice/ui",
  "version": "0.0.0",
  "description": "TatvaPractice clinical UI component library (atoms + molecules).",
  "type": "module",
  "sideEffects": ["**/*.scss", "**/*.css"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".":            { "import": "./dist/index.js", "require": "./dist/index.cjs", "types": "./dist/index.d.ts" },
    "./button":     { "import": "./dist/atoms/Button/index.js", "require": "./dist/atoms/Button/index.cjs", "types": "./dist/atoms/Button/index.d.ts" },
    "./dropdown-menu": { "import": "./dist/atoms/DropdownMenu/index.js", "require": "./dist/atoms/DropdownMenu/index.cjs", "types": "./dist/atoms/DropdownMenu/index.d.ts" },
    "./styles/*":   "./dist/styles/*",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build":  "tsup && pnpm run build:scss",
    "build:scss": "node scripts/copy-scss.mjs",
    "dev":    "tsup --watch & node scripts/copy-scss.mjs --watch",
    "clean":  "rm -rf dist",
    "test":   "vitest run",
    "lint":   "eslint src",
    "stylelint": "stylelint 'src/**/*.scss'"
  },
  "peerDependencies": {
    "react":     ">=18.2 <20",
    "react-dom": ">=18.2 <20",
    "motion":    ">=12",
    "@tatvapractice/tokens": "workspace:^",
    "@tatvapractice/icons":  "workspace:^",
    "radix-ui":          { "optional": true },
    "@headlessui/react": { "optional": true },
    "@base-ui-components/react": { "optional": true },
    "@mui/material":     { "optional": true }
  },
  "peerDependenciesMeta": {
    "radix-ui":          { "optional": true },
    "@headlessui/react": { "optional": true },
    "@base-ui-components/react": { "optional": true },
    "@mui/material":     { "optional": true }
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "sass": "^1.83.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0"
  },
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.pkg.github.com"
  }
}
```

### 4.3 `packages/icons/package.json`

Mirror the ui template; peer dep just `react`, `react-dom`, and
`iconsax-reactjs`.

### 4.4 Workspace root `package.json`

```jsonc
{
  "name": "tatvapractice-ui",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@10.4.1",
  "engines": { "node": ">=20" },
  "workspaces": ["packages/*", "apps/*", "tools/*"],
  "scripts": {
    "build":         "turbo run build",
    "dev":           "turbo run dev --parallel",
    "lint":          "turbo run lint",
    "test":          "turbo run test",
    "storybook":     "pnpm --filter docs storybook",
    "changeset":     "changeset",
    "version-packages": "changeset version",
    "release":       "turbo run build --filter='./packages/*' && changeset publish"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "@changesets/cli": "^2.27.0",
    "prettier": "^3.5.0"
  }
}
```

### 4.5 `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "tools/*"
```

### 4.6 `turbo.json`

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "inputs": ["src/**", "package.json", "tsup.config.mjs"]
    },
    "dev":    { "cache": false, "persistent": true },
    "lint":   {},
    "test":   { "dependsOn": ["^build"] },
    "storybook": { "cache": false, "persistent": true }
  }
}
```

---

## 5. The build pipeline (per package)

### 5.1 `@tatvapractice/tokens` build

`scripts/build.mjs` does the following in order:

1. Compile `src/index.scss` to `dist/tokens.css` (Sass, expanded mode,
   no source maps).
2. Concatenate the partials into `dist/tokens.scss` (a single-file
   public SCSS export so consumers can `@use` it without monkeying
   with paths).
3. Parse the `:root { --tp-…: #hex; }` block and emit:
   - `dist/tokens.json` — `{ "tp-blue-500": "#4B4AD5", … }`
   - `dist/tokens.js` — named ESM exports `export const tpBlue500 = "#4B4AD5";`
   - `dist/tokens.cjs` — same, CJS.
   - `dist/tokens.d.ts` — typed surface.
4. Run a contract test: every name in `tokens.json` exists in
   `tokens.css` and `tokens.js`. Fail build if not.

### 5.2 `@tatvapractice/ui` build

Two steps, orchestrated by the `build` script:

**5.2.1 JS build with `tsup`** (`tsup.config.mjs`)

```js
import { defineConfig } from "tsup";
import { glob } from "glob";

export default defineConfig({
  entry: [
    "src/index.js",
    ...glob.sync("src/atoms/*/index.js"),
    ...glob.sync("src/molecules/*/index.js"),
  ],
  format: ["esm", "cjs"],
  dts: false,                  // we ship JSDoc-derived .d.ts — see 5.2.3
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    "react", "react-dom", "motion", "motion/react",
    "radix-ui", "@headlessui/react", "@base-ui-components/react",
    "@mui/material", "@mui/material/styles",
    "@tatvapractice/tokens", "@tatvapractice/icons",
    "iconsax-reactjs", "lucide-react", "cmdk", "vaul",
    "react-day-picker", "react-resizable-panels", "embla-carousel-react",
    "recharts", "sonner", "input-otp", "@tiptap/react", "@tiptap/core"
  ],
  target: "es2022",
  loader: { ".scss": "empty" }, // SCSS handled separately, see 5.2.2
});
```

**5.2.2 SCSS build** (`scripts/copy-scss.mjs`)

The atom's SCSS module is consumed by the atom JS file via
`import s from "./Button.module.scss"`. Three options:

A. **Compile SCSS to CSS at build time and ship `.module.css`** — the
simplest route. Use `sass` to compile each `*.module.scss` into a
co-located `*.module.css` inside `dist/`, and rewrite the JS imports.
Consumers only need a CSS loader (Next.js, Vite, Rollup all support
CSS Modules out of the box).

B. **Ship `.module.scss` as-is** — requires consumer to have Sass set
up. Cleaner if every consumer is a Next.js app (which knows SCSS
natively when `sass` is installed).

C. **Inline-class with CSS-in-JS** — adds runtime cost. **Don't.**

**Recommended: Option A.** Implementation:

```js
// scripts/copy-scss.mjs (sketch)
import { glob } from "glob";
import * as sass from "sass";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import postcss from "postcss";
import postcssModules from "postcss-modules";

const files = await glob("src/**/*.module.scss");
for (const f of files) {
  const out = f.replace("src/", "dist/").replace(/\.scss$/, ".css");
  const compiled = sass.compile(f, { loadPaths: ["node_modules"] }).css;
  // PostCSS Modules generates the JSON map of class names if needed.
  // For shipping to consumers, we want plain .module.css — Next.js will hash.
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, compiled);
}
// Then rewrite the dist JS imports from ".scss" to ".css".
```

Add a postbuild step that walks `dist/**/*.{js,cjs}` and rewrites
`require("./Button.module.scss")` → `require("./Button.module.css")`
and same for ESM imports.

**5.2.3 Types**

Two paths:

- **Skip `.d.ts` for v0** — consumers get untyped imports but the JSDoc
  shows up in IDE tooltips. Lowest-friction.
- **Generate `.d.ts` from JSDoc** via `tsc -p tsconfig.dts.json` with
  `allowJs`, `checkJs: false`, `declaration`, `emitDeclarationOnly`.
  Add this once consumers complain about missing types. **Recommended
  by v0.5.0.**

### 5.3 Bundle-size discipline

Every PR runs `size-limit` against `packages/ui/dist/index.js`:

| Bundle | Cap |
|---|---|
| `@tatvapractice/ui` (full barrel, gzipped) | ≤ **80 KB** |
| Single atom (e.g. `/button`, gzipped) | ≤ **6 KB** |
| `@tatvapractice/tokens/css` (gzipped) | ≤ **8 KB** |
| `@tatvapractice/icons` (full, gzipped) | ≤ **20 KB** |

Build fails if any cap is breached. Caps are advisory targets — adjust
once we have v1 numbers, but make adjusting them require a PR review.

---

## 6. Publishing

### 6.1 Registry choice

Decide **once**, document the call, never revisit:

| Option | Cost | Right when… |
|---|---|---|
| **GitHub Packages (private)** | Free for org, paid above quota | TP code is proprietary. **Default. Recommended.** |
| **npm private** | Paid (org plan) | We want public-style ergonomics. |
| **Public npm** | Free | We're OK with the world cloning the design system. **Not recommended for clinical UI.** |
| **Verdaccio (self-hosted)** | Self-host time | We want full control + Open-source-style anonymity. Heaviest ops. |

Default to **GitHub Packages**. The rest of this prompt assumes that.

### 6.2 `.npmrc` setup

In `tatvapractice-ui` repo root:

```
@tatvapractice:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

In **VoiceRx** repo root:

```
@tatvapractice:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` is a personal access token with `read:packages` scope
(and `write:packages` for publishers). In CI it's the actions-provided
`secrets.GITHUB_TOKEN`. Locally, devs put it in `~/.npmrc` and reference
it via env.

### 6.3 Versioning with Changesets

In `tatvapractice-ui`:

```bash
pnpm dlx @changesets/cli init
```

`.changeset/config.json`:

```jsonc
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [["@tatvapractice/ui", "@tatvapractice/tokens", "@tatvapractice/icons"]],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["docs"]
}
```

The `linked` array keeps the three packages on the same version — when
ui bumps minor, tokens and icons bump minor too. This stops the matrix-
of-versions problem in consumers.

Workflow per PR:

```bash
pnpm changeset                 # interactively records "@tatvapractice/ui patch: fix Button focus ring"
git add .changeset && git commit -m "chore: changeset"
```

On merge to `main`, `release.yml` runs:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push: { branches: [main] }
permissions: { contents: write, packages: write, pull-requests: write }
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, registry-url: https://npm.pkg.github.com }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version-packages
          commit: "chore: release"
          title:  "chore: release"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN:    ${{ secrets.GITHUB_TOKEN }}
```

This creates a "Version Packages" PR with the bumped versions; merging
that PR triggers the publish.

### 6.4 First release (v0.1.0)

For the first ever publish, hand-bump:

```bash
pnpm -r exec npm version 0.1.0 --no-git-tag-version
git commit -am "chore: release v0.1.0"
pnpm build
pnpm publish -r --access restricted
```

After that, let Changesets handle every bump.

---

## 7. Consuming `@tatvapractice/ui` from VoiceRx

### 7.1 Install

In VoiceRx root, add `.npmrc` per §6.2, then:

```bash
npm install @tatvapractice/ui @tatvapractice/tokens @tatvapractice/icons \
  motion radix-ui @headlessui/react @base-ui-components/react \
  iconsax-reactjs sonner vaul cmdk \
  react-day-picker react-resizable-panels embla-carousel-react recharts \
  input-otp
```

(Subset depending on which atoms are in use — peer deps are explicit so
you only install what you actually consume.)

### 7.2 Wire the theme

```jsx
// app/layout.jsx
import "@tatvapractice/tokens/css";
import { TPThemeProvider } from "@tatvapractice/ui";
import "./globals.scss";   // VoiceRx-local globals only

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TPThemeProvider>{children}</TPThemeProvider>
      </body>
    </html>
  );
}
```

### 7.3 Consume in components

```jsx
import { Button, Field, Input, DropdownMenu } from "@tatvapractice/ui";
import { Stethoscope } from "@tatvapractice/icons";

export function MedicationRow({ value, onChange, onAdd }) {
  return (
    <Field label="Medication">
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
      <Button variant="primary" leftIcon={<Stethoscope />} onClick={onAdd}>
        Add
      </Button>
    </Field>
  );
}
```

### 7.4 Use design tokens in VoiceRx-local SCSS

```scss
// app/(some)/SomeOrganism.module.scss
@use "@tatvapractice/tokens/scss" as t;

.shell {
  background: var(--tp-slate-50);
  padding: t.$spacing-md;
  border-radius: t.$radius-md;
}
```

### 7.5 Deletes in VoiceRx after the first install

Once `@tatvapractice/ui` is in, VoiceRx deletes:

- `components/ui/`
- `components/tp-ui/`
- `components/tp-ui/button-system/`
- `components/design-system/`
- `lib/design-tokens.ts`, `lib/component-tokens.ts`, `lib/tp-mui-theme.ts`
- `app/globals.css`'s `:root { --tp-…: ... }` block (now from
  `@tatvapractice/tokens/css`)

VoiceRx becomes a **thin product app** that imports from the package
and writes only domain code (organisms, pages, contexts).

---

## 8. Storybook (the docs app)

`apps/docs/` is a Storybook 8 instance that runs `pnpm storybook`,
deploys to Vercel via `docs-deploy.yml`, and serves as:

- the **design-system website** (e.g. `ds.tatvapractice.com`);
- the **a11y / interaction QA** surface (Storybook's a11y addon);
- the **visual-diff source** (Chromatic optional;
  `playwright + pixelmatch` cheaper alternative);
- the **PR preview** (every PR gets a deploy URL).

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../../packages/ui/src/**/*.stories.@(js|jsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
    "@storybook/addon-themes"
  ],
  framework: { name: "@storybook/nextjs", options: {} }
};

export default config;
```

`.storybook/preview.jsx`:

```jsx
import "@tatvapractice/tokens/css";
import { TPThemeProvider } from "@tatvapractice/ui";

export const decorators = [(Story) => <TPThemeProvider><Story /></TPThemeProvider>];

export const parameters = {
  viewport: {
    viewports: {
      iPadPortrait:  { name: "iPad Portrait",  styles: { width: "768px",  height: "1024px" } },
      iPadLandscape: { name: "iPad Landscape", styles: { width: "1024px", height: "768px"  } },
      Desktop:       { name: "Desktop 1440",   styles: { width: "1440px", height: "900px"  } }
    }
  }
};
```

Every atom's `Component.stories.jsx` demos the variants we ship.

---

## 9. Phased plan for Claude Code

### Phase A — Repo cleanup (1 session)

Branch: `00-cleanup`

1. Rename the GitHub repo (or local folder) to `tatvapractice-ui`.
2. Delete: `.claude/worktrees/`, `app/`, `next-env.d.ts`, `next.config.mjs`,
   `postcss.config.mjs`, `tsconfig.json`, `tsconfig.tsbuildinfo`,
   `vercel.json`, `components/ui/`, `components/tp-ui/`,
   `components/tp-rxpad/`, `components/tp-appointment-screen/`,
   `components/rxpad/`, `components/rx/`, `components/appointments/`,
   `components/shared/`, `components/docs/`, `components/design-system/`,
   `hooks/use-mobile.ts`, every page-level `*.tsx`.
3. Keep ONLY: `components/tp-hui/`, `styles/tokens.scss`,
   `public/` (logos), `README.md`.
4. Commit. The repo is now an empty shell with the right seeds.

### Phase B — Monorepo skeleton (1 session)

Branch: `01-monorepo`

1. Add `pnpm-workspace.yaml`, root `package.json`, `turbo.json`,
   `.changeset/`, `.npmrc`, `.nvmrc`, `.gitignore`.
2. Create `packages/tokens/`, `packages/icons/`, `packages/ui/`,
   `apps/docs/`, `tools/{eslint-config,stylelint-config,jsconfig-base}/`.
3. Move `styles/tokens.scss` → `packages/tokens/src/index.scss` and
   split into the partials per §2.
4. Move `components/tp-hui/*` → `packages/ui/src/atoms/<Name>/` (one
   folder per atom, with `index.js`).
5. Author `packages/tokens/scripts/build.mjs` per §5.1.
6. Author `packages/ui/tsup.config.mjs` and
   `packages/ui/scripts/copy-scss.mjs` per §5.2.
7. `pnpm install`, `pnpm build`. Verify `dist/` outputs in each
   package. Commit.

### Phase C — Tokens v0 (1 session)

Branch: `02-tokens`

1. Split the monolithic `tokens.scss` into the seven partials per §2.
2. Run the build, eyeball `dist/tokens.css` and `dist/tokens.json`.
3. Add a `tokens.test.mjs` that asserts the round-trip
   (CSS ↔ JSON ↔ JS).
4. `changeset add` → `@tatvapractice/tokens` 0.1.0.

### Phase D — Atoms port + storybook (4–6 sessions)

Branch per atom: `03-<atom>` (e.g. `03-button`, `03-checkbox`).

Per atom (matches v2 prompt §5.1 row):

1. Move/rename existing `tp-hui` JSX into
   `packages/ui/src/atoms/<Name>/<Name>.jsx`.
2. Move SCSS into `<Name>.module.scss` and replace any hard-coded color
   with `var(--tp-…)`.
3. Add the Storybook story
   `packages/ui/src/atoms/<Name>/<Name>.stories.jsx`.
4. Run `pnpm storybook`, eyeball desktop + iPad portrait + iPad
   landscape viewports.
5. `changeset add` → patch.
6. Open PR. CI runs lint, build, storybook deploy, size-limit.

Atoms not present in `tp-hui` today (most of them) are built fresh
following v2 prompt §5.1 — Claude Code copies the relevant animate-ui
primitive into `packages/ui/src/_vendor/` (yes, vendor lives inside the
ui package — the consumer never sees it).

### Phase E — Molecules (3–5 sessions)

Same pattern as atoms, per v2 prompt §5.2.

### Phase F — Icons package (1 session)

Branch: `04-icons`

1. Move custom medical SVGs into `packages/icons/src/medical/`.
2. Author `packages/icons/src/icon.jsx` as the iconsax wrapper.
3. Build, story per icon (or a single grid story).
4. Changeset → `@tatvapractice/icons` 0.1.0.

### Phase G — First publish (1 session)

Branch: `05-publish-v0.1.0`

1. Hand-bump versions to 0.1.0 across the three packages.
2. `pnpm build` clean.
3. `pnpm publish -r --access restricted` (manually, first time).
4. Tag `v0.1.0` on git, push tag.
5. From this point on, all releases go through Changesets.

### Phase H — Wire VoiceRx as consumer (1 session in the VoiceRx repo)

Branch (in VoiceRx): `migration/08-consume-tatvapractice-ui`

Pre-req: v1 prompt Phases 0–3 must already be done (so VoiceRx is on
JSX + SCSS).

1. Add `.npmrc` in VoiceRx per §6.2.
2. `npm install @tatvapractice/ui @tatvapractice/tokens @tatvapractice/icons`
   plus the peer deps.
3. Replace `app/globals.css` token block with
   `import "@tatvapractice/tokens/css"` in `app/layout.jsx`.
4. Replace every legacy ui/tp-ui import with the package import. The
   v1 prompt §7 mapping table tells you what becomes what.
5. Delete `components/ui/`, `components/tp-ui/`,
   `components/design-system/`.
6. Visual diff against baseline. Zero pixel diff acceptance.

### Phase I — Storybook deploy + docs site (1 session)

Branch: `06-docs-deploy`

1. Vercel project for `apps/docs/`. Auto-deploy on PR + main.
2. Custom domain `ds.tatvapractice.com`.
3. README badges: build, version, bundle size.

---

## 10. Definition of done (for v0.1.0)

- [ ] `tatvapractice-ui` is a pnpm monorepo with three packages and one
      docs app.
- [ ] Each package has `dist/` outputs that pass `pnpm pack` round-trip.
- [ ] `@tatvapractice/tokens` exports CSS, SCSS, JS, JSON of every TP
      color/spacing/radius/shadow/motion/z-index/breakpoint.
- [ ] `@tatvapractice/ui` exports every atom from v2 prompt §5.1
      (molecules can be v0.2.0).
- [ ] Storybook deploys on PR. Visual diff CI catches regressions.
- [ ] Bundle-size limits per §5.3 are enforced.
- [ ] `npm install @tatvapractice/ui` works from a fresh VoiceRx clone
      with the right `.npmrc`.
- [ ] VoiceRx successfully renders `/`, `/rxpad`, `/invisit`,
      `/patient-details` using only package imports — zero local
      `components/ui` or `components/tp-ui` files remain.
- [ ] `pnpm release` ships a new version end-to-end.

---

## 11. How to call this from Claude Code

For each Phase A–I, start a new Claude Code session in the relevant
repo with:

```
You are executing Phase <X> of docs/migration/03_DESIGN_SYSTEM_AS_NPM_PACKAGE.md
in the <tatvapractice-ui | VoiceRx> repo.

Hard constraints:
- Stay strictly inside Phase <X>. Do not touch other phases' work.
- Visual output of any consumer must not change. (Phases A–G operate on
  the design-system repo where there is no consumer yet — you only
  need to verify Storybook renders identically.)
- Use the provided package.json, tsup, turbo, and changeset templates
  literally; deviations need a justification in the PR description.

When done, post:
1. Files added / moved / deleted.
2. dist/ contents (tree + sizes).
3. CI run link / local build log.
4. Any open question flagged for me to decide.
```
