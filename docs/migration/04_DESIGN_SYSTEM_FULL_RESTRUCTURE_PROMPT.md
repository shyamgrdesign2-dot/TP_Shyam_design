# `@tatvapractice/ui` — full restructure prompt for the Tatva Practice Design System repo

> **This is the only file you hand to Claude Code when working in the
> design-system repo.** It is self-contained — every philosophy, audit
> result, folder layout, build template, build matrix, publishing flow,
> and verification gate that matters is inside this single document.
>
> Source repo: the zip you uploaded as
> `Tatva Practice DesignSystem-main`. After Phase A it is renamed
> `tatvapractice-ui`.
>
> Consumer repo: `tp-voicerx` (and any future TatvaPractice product).

---

## 0. The philosophy (read this twice)

We use Radix UI, Headless UI, Base UI, MUI, Motion, lucide-react,
iconsax-reactjs, cmdk, vaul, react-day-picker, recharts, embla-carousel,
sonner, input-otp, react-resizable-panels under the hood. **None of
those is our design system.** They are instruments.

**`@tatvapractice/ui` is the design system.** Every atom and every
molecule we ship is a TP-branded, TP-opinionated component:

- **TP visual identity.** Tokens from `@tatvapractice/tokens` only — no
  primitive's default look bleeds through. No hex literal in any
  `*.module.scss`. Ever.
- **TP API shape.** Props are named the way our team thinks
  (`variant`, `size`, `tone`, `loading`, `leftIcon`), not the way each
  upstream primitive thinks. The TP `Button` API stays the same whether
  the primitive underneath is Radix's `Slot`, Motion, or a plain
  `<button>`.
- **TP a11y baseline.** Every interactive atom enforces a 44px touch
  hit-area on `(hover: none)` regardless of what the primitive does.
- **TP behavior contract.** Controlled-vs-uncontrolled patterns,
  error/loading/disabled states, RTL story, focus ring color all match
  across every atom because **our** wrapper enforces them.

The wrapper is not a thin pass-through. It is **the product**. A
consumer importing `Button` from `@tatvapractice/ui` should not need to
know whether Radix or Motion is underneath — and a year from now, if we
swap the primitive, the API stays the same.

```
┌────────────────────────────────────────────────────────────┐
│  @tatvapractice/ui                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Atoms      Button · Input · Checkbox · Tooltip · …  │  │
│  │  Molecules  Field · DropdownMenu · Drawer · Tabs · … │  │
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

Bottom box = implementation detail. Top box = what people import.
Consumers (VoiceRx, future TP products) **only ever touch the top box**.

---

## 1. Mission

Take the Tatva Practice Design System repo (a confused Next.js demo
app today) and turn it into:

1. A clean **pnpm monorepo** named `tatvapractice-ui`.
2. Three published npm packages:
   - `@tatvapractice/tokens` — every visual token in CSS / SCSS / JS / JSON.
   - `@tatvapractice/icons` — wrapped iconsax + custom medical SVGs.
   - `@tatvapractice/ui` — every atom + molecule, TP-branded.
3. A **Storybook docs app** that deploys on every PR.
4. A **publishing flow** (Changesets + GitHub Packages) that releases
   versions on merge to `main`.
5. A consumable end-state where VoiceRx runs `npm install
   @tatvapractice/ui @tatvapractice/tokens @tatvapractice/icons` and
   ships its UI from the package — zero local copies.

### 1.1 Hard constraints

1. **No primitive's default style leaks.** Every atom's visual identity
   comes from TP tokens and TP SCSS. If you can see a Radix or MUI
   default focus ring, the atom is broken.
2. **TP API shape is sovereign.** Don't expose Radix's `data-state` as a
   public prop. Don't pass through MUI's `sx`. Wrap every prop you
   expose with TP semantics (`variant`, `size`, `tone`, `loading`,
   `leftIcon`, `rightIcon`).
3. **Atoms are the only layer that imports primitives.** Molecules
   compose atoms; they cannot import Radix/Headless/Base/MUI/cmdk/vaul.
   ESLint enforces this in Phase I.
4. **No Tailwind utility classes in any atom or molecule.** SCSS
   modules + token CSS variables only.
5. **No hex literals in any `*.module.scss`.** Every color, shadow,
   radius, spacing comes from `var(--tp-…)`.
6. **Every interactive atom has a ≥44px touch hit-area on
   `(hover: none)`.** Visual size can stay smaller via padding.
7. **One canonical component per concern.** No `Button` and `TPButton`
   and `IconButton` as siblings. `IconButton` is `<Button shape="icon">`,
   period.
8. **Every published version goes through Changesets.** No
   `npm version patch && npm publish` from a developer laptop after
   v0.1.0.

If any of these conflict with what you want to ship, **stop and ask
before continuing**. Don't silently bend a constraint.

---

## 2. Current-state audit (what's in the repo right now)

You uploaded `Tatva Practice DesignSystem-main`. Here is the truth:

| Metric | Count |
|---|---|
| `.tsx` files | 164 |
| `.jsx` files | 10 |
| `.module.scss` files | 9 (one per `tp-hui` component) |
| `.scss` partials | 1 (`styles/tokens.scss`) |
| `.css` files | 2 |
| MUI / Radix / shadcn duplicate component families | 3 (`components/ui/`, `components/tp-ui/`, `components/tp-hui/`) |
| Product code copied from VoiceRx | `components/{appointments,rxpad,rx,tp-rxpad,tp-appointment-screen,shared,docs,design-system}` |
| `.claude/worktrees/` experiment branches | 4 (`strange-carson`, `modest-satoshi`, `codex-main-view`, `strange-carson-copy`) |

What's worth keeping (the seed of the actual library):

- `components/tp-hui/` — 10 files
  (`button`, `switch`, `checkbox`, `radio-group`, `input`, `textarea`,
  `select`, `listbox`) plus their `.module.scss` siblings + `index.js`.
  These are the only files that show the **right shape**: Headless UI
  + SCSS module + TP tokens, no Tailwind soup.
- `components/tp-ui/tp-button.{jsx,module.scss}` — second proof of the
  shape (MUI + SCSS module).
- `styles/tokens.scss` — every TP color / spacing / radius as SCSS
  variable + CSS custom property under `:root`.
- `public/` logos and assets.
- `README.md`.

What gets deleted:

- All Next.js app shell: `app/`, `next.config.mjs`, `postcss.config.mjs`,
  `next-env.d.ts`, `tsconfig.json`, `tsconfig.tsbuildinfo`,
  `vercel.json`, `components.json`.
- Every duplicate UI family: `components/ui/`, `components/tp-ui/`
  except the two seed files.
- Every product-code copy: `components/{appointments, rxpad, rx,
  tp-rxpad, tp-appointment-screen, shared, docs, design-system}`.
- All `.claude/worktrees/`.
- Every `.tsx` file (we are JSX-only going forward).

After Phase A the repo is a near-empty shell holding only the seed.
That is intentional.

---

## 3. Final target — the monorepo layout

```
tatvapractice-ui/                     ← rename from DesignSystem-main
├── .changeset/                       ← Changesets state + pending bumps
├── .github/workflows/
│   ├── ci.yml                        ← lint + build + visual diff per PR
│   ├── release.yml                   ← Changesets → publish on merge to main
│   └── docs-deploy.yml               ← Storybook → Vercel
├── .npmrc                            ← @tatvapractice → GitHub Packages
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
│   │   ├── scripts/build.mjs         ← emits dist/{tokens.css,scss,js,json,d.ts}
│   │   ├── dist/                     ← built artifacts (gitignored)
│   │   └── README.md
│   │
│   ├── icons/                        ← @tatvapractice/icons
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── icon.jsx              ← single chokepoint wrapping iconsax-reactjs
│   │   │   ├── medical/              ← TP custom medical SVG components
│   │   │   └── index.js
│   │   ├── tsup.config.mjs
│   │   ├── dist/
│   │   └── README.md
│   │
│   └── ui/                           ← @tatvapractice/ui
│       ├── package.json
│       ├── src/
│       │   ├── _vendor/              ← copied animate-ui primitives, never re-exported
│       │   │   ├── primitives/{radix,headless,base,animate,buttons,effects}/
│       │   │   ├── hooks/
│       │   │   └── lib/
│       │   ├── theme/
│       │   │   ├── ThemeProvider.jsx
│       │   │   ├── tp-mui-theme.js
│       │   │   └── index.js
│       │   ├── lib/
│       │   │   ├── cn.js
│       │   │   ├── slot.jsx
│       │   │   ├── useControlledState.js
│       │   │   └── getStrictContext.js
│       │   ├── atoms/                ← rules in §6.1
│       │   │   ├── Button/
│       │   │   │   ├── Button.jsx
│       │   │   │   ├── Button.module.scss
│       │   │   │   ├── Button.stories.jsx
│       │   │   │   └── index.js
│       │   │   ├── ...               ← every atom from §7.1
│       │   ├── molecules/            ← every molecule from §7.2
│       │   └── index.js              ← barrel re-export
│       ├── tsup.config.mjs
│       ├── scripts/copy-scss.mjs
│       ├── dist/
│       └── README.md
│
├── apps/
│   └── docs/                         ← Storybook 8
│       ├── package.json
│       ├── .storybook/
│       │   ├── main.ts
│       │   ├── preview.jsx
│       │   └── viewports.js
│       ├── src/
│       └── public/
│
├── tools/
│   ├── eslint-config/                ← @tatvapractice/eslint-config
│   ├── stylelint-config/             ← @tatvapractice/stylelint-config
│   └── jsconfig-base/                ← @tatvapractice/jsconfig-base
│
├── package.json                      ← workspace root, private: true
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── .changeset/config.json
├── .gitignore
├── .nvmrc
└── README.md
```

### 3.1 What's gone (relative to today's repo)

The Next.js app shell, the four duplicated component trees, the
`.claude/worktrees/` experiments, the demo pages, every `.tsx` file —
all leave the design-system repo and live only in product apps that
consume the package.

The design system's job is **library only**.

### 3.2 The boundary rules (ESLint-enforced in Phase I)

```
apps/docs       →  packages/ui, packages/tokens, packages/icons   (only)
packages/ui     →
  atoms/        →  _vendor/primitives, lib, @tatvapractice/{tokens,icons}
  molecules/    →  atoms, lib                                     (NO _vendor)
  theme/        →  _vendor/primitives, @mui/material              (only)
packages/icons  →  iconsax-reactjs, react                         (only)
packages/tokens →  (no JS runtime imports)
_vendor/        →  closed; no upward imports
```

Anything importing `radix-ui`, `@headlessui/react`,
`@base-ui-components/react`, `@mui/material`, `lucide-react`,
`iconsax-reactjs`, `cmdk`, `vaul`, `motion`, `recharts`, `sonner`,
`react-day-picker`, `react-resizable-panels`, `embla-carousel-react`,
`input-otp` from outside `packages/ui/src/atoms/` or
`packages/ui/src/_vendor/` fails CI.

---

## 4. The `tatvapractice-ui` workspace files

### 4.1 `package.json` (workspace root)

```jsonc
{
  "name": "tatvapractice-ui",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@10.4.1",
  "engines": { "node": ">=20" },
  "workspaces": ["packages/*", "apps/*", "tools/*"],
  "scripts": {
    "build":            "turbo run build",
    "dev":              "turbo run dev --parallel",
    "lint":             "turbo run lint",
    "stylelint":        "turbo run stylelint",
    "test":             "turbo run test",
    "storybook":        "pnpm --filter docs storybook",
    "build:storybook":  "pnpm --filter docs build-storybook",
    "changeset":        "changeset",
    "version-packages": "changeset version",
    "release":          "turbo run build --filter='./packages/*' && changeset publish"
  },
  "devDependencies": {
    "turbo":          "^2.4.0",
    "@changesets/cli": "^2.27.0",
    "prettier":       "^3.5.0"
  }
}
```

### 4.2 `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "tools/*"
```

### 4.3 `turbo.json`

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs":  ["dist/**"],
      "inputs":   ["src/**", "package.json", "tsup.config.mjs", "scripts/**"]
    },
    "dev":       { "cache": false, "persistent": true },
    "lint":      {},
    "stylelint": {},
    "test":      { "dependsOn": ["^build"] },
    "storybook":       { "cache": false, "persistent": true },
    "build-storybook": { "outputs": ["storybook-static/**"] }
  }
}
```

### 4.4 `.npmrc` (repo root)

```
@tatvapractice:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
auto-install-peers=true
strict-peer-dependencies=false
```

### 4.5 `.nvmrc`

```
20
```

### 4.6 `.gitignore` (additions over the default Next.js one)

```
dist/
storybook-static/
.turbo/
*.tsbuildinfo
.DS_Store
.idea/
.vscode/
```

### 4.7 `.changeset/config.json`

```jsonc
{
  "$schema": "https://unpkg.com/@changesets/config@3/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit":   false,
  "fixed":    [],
  "linked":   [["@tatvapractice/ui", "@tatvapractice/tokens", "@tatvapractice/icons"]],
  "access":   "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore":   ["docs", "@tatvapractice/eslint-config", "@tatvapractice/stylelint-config", "@tatvapractice/jsconfig-base"]
}
```

The `linked` array keeps the three published packages on the same
version. When `ui` bumps minor, `tokens` and `icons` bump minor too —
this stops the matrix-of-versions problem in consumers.

### 4.8 `tools/jsconfig-base/jsconfig.json`

```jsonc
{
  "compilerOptions": {
    "baseUrl":   ".",
    "paths":     { "@/*": ["./src/*"] },
    "checkJs":   false,
    "jsx":       "preserve",
    "module":    "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "target":    "ES2022"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Each package extends this:

```jsonc
// packages/ui/jsconfig.json
{ "extends": "@tatvapractice/jsconfig-base/jsconfig.json" }
```

---

## 5. The three published packages

### 5.1 `@tatvapractice/tokens`

**Job.** The visual contract: every color, spacing, radius, shadow,
font, motion, z-index, breakpoint. Ships in **four formats**:
`tokens.css` (CSS custom properties), `tokens.scss` (SCSS variables +
the `:root` block), `tokens.js` / `tokens.cjs` (named exports), and
`tokens.json` (raw object). Consumers pick the format that fits their
build.

**`packages/tokens/package.json`:**

```jsonc
{
  "name":        "@tatvapractice/tokens",
  "version":     "0.0.0",
  "description": "TatvaPractice design tokens — colors, spacing, radii, shadows, motion. Multi-format.",
  "type":        "module",
  "sideEffects": ["dist/tokens.css"],
  "main":    "./dist/tokens.cjs",
  "module":  "./dist/tokens.js",
  "types":   "./dist/tokens.d.ts",
  "exports": {
    ".":             { "import": "./dist/tokens.js", "require": "./dist/tokens.cjs", "types": "./dist/tokens.d.ts" },
    "./css":         "./dist/tokens.css",
    "./scss":        "./dist/tokens.scss",
    "./json":        "./dist/tokens.json",
    "./package.json": "./package.json"
  },
  "files":   ["dist", "src/**/*.scss", "README.md"],
  "scripts": {
    "build": "node scripts/build.mjs",
    "dev":   "node scripts/build.mjs --watch",
    "clean": "rm -rf dist",
    "test":  "node --test scripts/build.test.mjs"
  },
  "devDependencies": {
    "sass":     "^1.83.0",
    "chokidar": "^3.6.0"
  },
  "publishConfig": {
    "access":   "restricted",
    "registry": "https://npm.pkg.github.com"
  }
}
```

**`scripts/build.mjs`** (sketch):

1. Compile `src/index.scss` to `dist/tokens.css` (Sass, expanded).
2. Concatenate `src/_*.scss` partials into `dist/tokens.scss` so
   consumers can `@use "@tatvapractice/tokens/scss" as t` without
   per-file paths.
3. Parse the `:root { --tp-…: #hex; }` block and emit:
   - `dist/tokens.json` — flat object `{ "tp-blue-500": "#4B4AD5", … }`.
   - `dist/tokens.js` — named ESM exports
     `export const tpBlue500 = "#4B4AD5";`.
   - `dist/tokens.cjs` — same, CJS.
   - `dist/tokens.d.ts` — typed surface (declaration only).
4. Round-trip test: every name in `tokens.json` exists in `tokens.css`
   and `tokens.js`. Build fails if not.

### 5.2 `@tatvapractice/icons`

**Job.** Single chokepoint for icons. Wraps `iconsax-reactjs` once,
plus exports the custom medical SVG components. Tree-shakes.

**`packages/icons/package.json`:**

```jsonc
{
  "name":        "@tatvapractice/icons",
  "version":     "0.0.0",
  "description": "TatvaPractice icon set — iconsax wrapper + custom medical glyphs.",
  "type":        "module",
  "sideEffects": false,
  "main":    "./dist/index.cjs",
  "module":  "./dist/index.js",
  "types":   "./dist/index.d.ts",
  "exports": {
    ".":             { "import": "./dist/index.js", "require": "./dist/index.cjs", "types": "./dist/index.d.ts" },
    "./medical/*":   "./dist/medical/*.js",
    "./package.json": "./package.json"
  },
  "files":   ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev":   "tsup --watch",
    "clean": "rm -rf dist",
    "lint":  "eslint src"
  },
  "peerDependencies": {
    "react":           ">=18.2 <20",
    "react-dom":       ">=18.2 <20",
    "iconsax-reactjs": "^0.0.8"
  },
  "devDependencies": {
    "tsup": "^8.0.0"
  },
  "publishConfig": {
    "access":   "restricted",
    "registry": "https://npm.pkg.github.com"
  }
}
```

### 5.3 `@tatvapractice/ui`

**Job.** Every atom and molecule we ship. Imports
`@tatvapractice/tokens` (SCSS only) and `@tatvapractice/icons`. Peer
deps the primitives.

**`packages/ui/package.json`:**

```jsonc
{
  "name":        "@tatvapractice/ui",
  "version":     "0.0.0",
  "description": "TatvaPractice clinical UI component library — atoms + molecules.",
  "type":        "module",
  "sideEffects": ["**/*.scss", "**/*.css"],
  "main":    "./dist/index.cjs",
  "module":  "./dist/index.js",
  "types":   "./dist/index.d.ts",
  "exports": {
    ".":               { "import": "./dist/index.js",                "require": "./dist/index.cjs",                "types": "./dist/index.d.ts" },
    "./button":        { "import": "./dist/atoms/Button/index.js",   "require": "./dist/atoms/Button/index.cjs",   "types": "./dist/atoms/Button/index.d.ts" },
    "./icon-button":   { "import": "./dist/atoms/IconButton/index.js","require":"./dist/atoms/IconButton/index.cjs","types":"./dist/atoms/IconButton/index.d.ts" },
    "./input":         { "import": "./dist/atoms/Input/index.js",    "require": "./dist/atoms/Input/index.cjs",    "types": "./dist/atoms/Input/index.d.ts" },
    "./checkbox":      { "import": "./dist/atoms/Checkbox/index.js", "require": "./dist/atoms/Checkbox/index.cjs", "types": "./dist/atoms/Checkbox/index.d.ts" },
    "./switch":        { "import": "./dist/atoms/Switch/index.js",   "require": "./dist/atoms/Switch/index.cjs",   "types": "./dist/atoms/Switch/index.d.ts" },
    "./tooltip":       { "import": "./dist/atoms/Tooltip/index.js",  "require": "./dist/atoms/Tooltip/index.cjs",  "types": "./dist/atoms/Tooltip/index.d.ts" },
    "./dropdown-menu": { "import": "./dist/molecules/DropdownMenu/index.js", "require": "./dist/molecules/DropdownMenu/index.cjs", "types": "./dist/molecules/DropdownMenu/index.d.ts" },
    "./field":         { "import": "./dist/molecules/Field/index.js",        "require": "./dist/molecules/Field/index.cjs",        "types": "./dist/molecules/Field/index.d.ts" },
    "./theme":         { "import": "./dist/theme/index.js",          "require": "./dist/theme/index.cjs",          "types": "./dist/theme/index.d.ts" },
    "./styles/*":      "./dist/styles/*",
    "./package.json":  "./package.json"
  },
  "files":   ["dist", "README.md"],
  "scripts": {
    "build":      "tsup && pnpm run build:scss",
    "build:scss": "node scripts/copy-scss.mjs",
    "dev":        "tsup --watch & node scripts/copy-scss.mjs --watch",
    "clean":      "rm -rf dist",
    "test":       "vitest run",
    "lint":       "eslint src",
    "stylelint":  "stylelint 'src/**/*.scss'"
  },
  "peerDependencies": {
    "react":     ">=18.2 <20",
    "react-dom": ">=18.2 <20",
    "motion":    ">=12",
    "@tatvapractice/tokens": "workspace:^",
    "@tatvapractice/icons":  "workspace:^",
    "radix-ui":                  { "optional": true },
    "@headlessui/react":         { "optional": true },
    "@base-ui-components/react": { "optional": true },
    "@mui/material":             { "optional": true },
    "@mui/icons-material":       { "optional": true },
    "cmdk":                      { "optional": true },
    "vaul":                      { "optional": true },
    "lucide-react":              { "optional": true },
    "iconsax-reactjs":           { "optional": true },
    "react-day-picker":          { "optional": true },
    "react-resizable-panels":    { "optional": true },
    "embla-carousel-react":      { "optional": true },
    "recharts":                  { "optional": true },
    "sonner":                    { "optional": true },
    "input-otp":                 { "optional": true },
    "@tiptap/react":             { "optional": true },
    "@tiptap/core":              { "optional": true }
  },
  "peerDependenciesMeta": {
    "radix-ui":                  { "optional": true },
    "@headlessui/react":         { "optional": true },
    "@base-ui-components/react": { "optional": true },
    "@mui/material":             { "optional": true },
    "@mui/icons-material":       { "optional": true },
    "cmdk":                      { "optional": true },
    "vaul":                      { "optional": true },
    "lucide-react":              { "optional": true },
    "iconsax-reactjs":           { "optional": true },
    "react-day-picker":          { "optional": true },
    "react-resizable-panels":    { "optional": true },
    "embla-carousel-react":      { "optional": true },
    "recharts":                  { "optional": true },
    "sonner":                    { "optional": true },
    "input-otp":                 { "optional": true },
    "@tiptap/react":             { "optional": true },
    "@tiptap/core":              { "optional": true }
  },
  "devDependencies": {
    "tsup":                   "^8.0.0",
    "sass":                   "^1.83.0",
    "vitest":                 "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "stylelint":              "^16.0.0"
  },
  "publishConfig": {
    "access":   "restricted",
    "registry": "https://npm.pkg.github.com"
  }
}
```

---

## 6. Build pipeline (per package)

### 6.1 `@tatvapractice/ui` build, in detail

Two steps run by `pnpm build`:

**Step 1 — JS via `tsup`** (`packages/ui/tsup.config.mjs`):

```js
import { defineConfig } from "tsup";
import { glob } from "glob";

export default defineConfig({
  entry: [
    "src/index.js",
    "src/theme/index.js",
    ...glob.sync("src/atoms/*/index.js"),
    ...glob.sync("src/molecules/*/index.js"),
  ],
  format:    ["esm", "cjs"],
  dts:       false,             // see Step 3
  sourcemap: true,
  clean:     true,
  splitting: false,
  treeshake: true,
  external: [
    "react", "react-dom",
    "motion", "motion/react",
    "radix-ui", "@headlessui/react", "@base-ui-components/react",
    "@mui/material", "@mui/material/styles",
    "@tatvapractice/tokens", "@tatvapractice/icons",
    "iconsax-reactjs", "lucide-react", "cmdk", "vaul",
    "react-day-picker", "react-resizable-panels",
    "embla-carousel-react", "recharts", "sonner", "input-otp",
    "@tiptap/react", "@tiptap/core"
  ],
  target: "es2022",
  loader: { ".scss": "empty" }, // SCSS handled in Step 2
});
```

**Step 2 — SCSS via `scripts/copy-scss.mjs`:**

The atom imports its style as `import s from "./Button.module.scss"`.
We compile every `*.module.scss` to `*.module.css` inside `dist/`,
then rewrite the JS imports to `.css`. Consumers only need a CSS-
modules-aware bundler (Next.js, Vite, Rollup all qualify).

```js
// packages/ui/scripts/copy-scss.mjs
import { glob } from "glob";
import * as sass from "sass";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const files = await glob("src/**/*.module.scss");
for (const f of files) {
  const out = f.replace(/^src\//, "dist/").replace(/\.scss$/, ".css");
  const compiled = sass.compile(f, {
    loadPaths: ["node_modules", resolve("../tokens/src")],
  }).css;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, compiled);
}

// Rewrite "Foo.module.scss" → "Foo.module.css" in every dist JS.
const jsFiles = await glob("dist/**/*.{js,cjs}");
for (const f of jsFiles) {
  const src = readFileSync(f, "utf8");
  writeFileSync(f, src.replaceAll(".module.scss", ".module.css"));
}
```

**Step 3 — Types (deferrable to v0.5.0).**

For v0.1.0, ship without `.d.ts`. Consumers get JSDoc tooltips. When
consumers need real types, add a third step:

```bash
tsc -p tsconfig.dts.json
# tsconfig.dts.json: allowJs, checkJs:false, declaration:true, emitDeclarationOnly:true
```

### 6.2 `@tatvapractice/tokens` build

```js
// packages/tokens/scripts/build.mjs
import * as sass from "sass";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

mkdirSync("dist", { recursive: true });

// 1. Compile to CSS.
const css = sass.compile("src/index.scss").css;
writeFileSync("dist/tokens.css", css);

// 2. Concatenate SCSS partials into single public file.
const partials = ["_colors","_typography","_spacing","_radii","_shadows","_motion","_z-index","_breakpoints"];
const combined = partials.map((p) => readFileSync(`src/${p}.scss`, "utf8")).join("\n\n");
writeFileSync("dist/tokens.scss", combined);

// 3. Parse :root { --tp-…: #hex; } block.
const tokens = {};
for (const m of css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
  tokens[m[1]] = m[2].trim();
}
writeFileSync("dist/tokens.json", JSON.stringify(tokens, null, 2));

// 4. JS exports (camelCase keys).
const camel = (k) => k.replace(/-([a-z])/g, (_,c) => c.toUpperCase());
const esm = Object.entries(tokens).map(([k,v]) => `export const ${camel(k)} = ${JSON.stringify(v)};`).join("\n");
writeFileSync("dist/tokens.js", esm + "\nexport const tokens = " + JSON.stringify(tokens) + ";\n");

const cjs = Object.entries(tokens).map(([k,v]) => `exports.${camel(k)} = ${JSON.stringify(v)};`).join("\n");
writeFileSync("dist/tokens.cjs", cjs + "\nexports.tokens = " + JSON.stringify(tokens) + ";\n");

// 5. Declarations.
const dts = Object.keys(tokens).map((k) => `export declare const ${camel(k)}: string;`).join("\n");
writeFileSync("dist/tokens.d.ts", dts + "\nexport declare const tokens: Record<string, string>;\n");
```

### 6.3 Bundle-size discipline

`size-limit` runs in CI:

| Bundle | Cap (gzipped) |
|---|---|
| `@tatvapractice/ui` (full barrel) | **80 KB** |
| Single atom subpath (e.g. `/button`) | **6 KB** |
| `@tatvapractice/tokens/css` | **8 KB** |
| `@tatvapractice/icons` (full) | **20 KB** |

Build fails if any cap is breached.

---

## 7. The build matrix — every atom and molecule, the primitive it sits on, and why

> Conventions: **R** = Radix UI, **H** = Headless UI, **B** = Base UI,
> **A** = animate-ui `animate/*`, **M** = Motion-only (no primitive),
> **C** = composition (no underlying primitive).

### 7.1 Atoms (in build order)

| Atom | Primitive | Why this flavor |
|---|---|---|
| `Button` | M (animate-ui `buttons/button`) | Motion-driven hover/tap scale, `asChild` slot. Buttons don't need a11y primitives. iPad-friendly press feedback via `whileTap`. |
| `IconButton` | M | `<Button shape="icon">`. Same source. |
| `SplitButton` | C (Button + DropdownMenu) | Composition only. |
| `Spinner` | M | Pure CSS keyframe. |
| `Icon` | C (wraps `iconsax-reactjs`) | Single chokepoint for icons. |
| `MedicalIcon` | C | Custom SVG registry from `@tatvapractice/icons`. |
| `Typography` | M | Pure styling + variants. |
| `Label` | R (`@radix-ui/react-label`) | Free `htmlFor` a11y. |
| `Link` | C | Wraps `next/link` + style. |
| `Divider` | R (Separator) | a11y horizontal/vertical separator. |
| `Avatar` | R | Image fallback ergonomics. |
| `Badge` | M | Pure visual. |
| `StatusBadge` | M | Visual + `data-status`. |
| `Tag` | M | Pure visual. |
| `Chip` | M | Visual + delete affordance. |
| `Kbd` | M | Pure visual. |
| `Tooltip` | A (animate-ui `animate/tooltip`) | Floating-UI based; shared `LayoutGroup` morphs between triggers. iPad long-press fallback. |
| `Popover` | R | Smallest, focus-trap correct. |
| `Input` | C | Just `<input>`; primitive overhead unjustified. |
| `Textarea` | C | Same; auto-grow optional. |
| `NumberInput` | C | Long-press auto-repeat tuned for iPad. |
| `OtpInput` | C (use `input-otp` package) | Cursor + caret semantics. |
| `Checkbox` | R | a11y + indeterminate state. |
| `Radio` | R | Roving focus done right. |
| `Switch` | R | Thumb spring. |
| `Toggle` | R | One-button toggle. |
| `Slider` | R | Multi-thumb, RTL, keyboard. |
| `Progress` | R | a11y + indeterminate. |
| `Skeleton` | M | Pure visual. |
| `Select` | R for ≤30 items, **H** (`Listbox`/`Combobox`) when searchable/grouped | The atom switches implementation based on `searchable` / `multiple` props. |
| `DatePicker` | **B** + `react-day-picker` | TP existing code already binds to MUI semantics; Base UI keeps that smooth. |
| `TimePicker` | C (numeric inputs + Popover) | Custom; no primitive worth pulling. |
| `ScrollArea` | R | Custom scrollbars in panels. |
| `AspectRatio` | R | Image media. |

### 7.2 Molecules (in build order)

| Molecule | Composition / primitive | Why |
|---|---|---|
| `Field` | Label + Input/Textarea/Select + helper + error | One ergonomic pattern for every form row. |
| `SearchInput` | Input + Icon + clear button + optional `cmdk` suggestions | Used in RxPad search, sidebar filters. |
| `SegmentedControl` | atom Toggle + animate-ui `effects/highlight` | Moving pill follows selection. iPad-native feel. |
| `DropdownMenu` | R (animate-ui radix flavor with Highlight) | Sub-menus, checkboxes, radios, separators, shortcuts. |
| `ContextMenu` | R | Right-click variant. |
| `Menubar` | R | Top-level app menu. |
| `NavigationMenu` | R | Top-nav with submenu. |
| `HoverCard` | R | Patient mini-card on hover. |
| `Dialog` | R | Modal + overlay + focus-trap. |
| `AlertDialog` | R | Non-dismissable variant. |
| `ConfirmDialog` | atom Dialog wrapper with prebuilt destructive | "Discard draft?" / "End visit?". |
| `Drawer` | **vaul** for mobile bottom-sheet, R `Sheet` for desktop side panels | iPad-first. |
| `Sheet` | R | Side sheet. |
| `Snackbar` / `Toast` | `sonner` wrapped once | Top-of-screen, swipe to dismiss. |
| `Banner` | M | In-page persistent notice. |
| `Alert` | M | Static notice. |
| `Card` | M | Surface; many variants via `data-variant`. |
| `Accordion` | A (`auto-height`) on top of R | Smooth open/close. |
| `Breadcrumbs` | C | Composition. |
| `Pagination` | C | Button + Select. |
| `Stepper` | M + Highlight | Workflow progress. |
| `Tabs` | A (animate-ui `animate/tabs`) | Moving underline pill. |
| `ClinicalTabs` | extends Tabs molecule with badge counts + iPad-stickier targets | Domain-flavored Tabs. |
| `Table` | C (HTML semantics) + `@tanstack/react-table` only when sort/filter/virtualization needed | Stay lean. |
| `ClinicalTable` | extends Table with column-toggle + dense mode | Domain-flavored Table. |
| `Timeline` | M | Vertical event list. |
| `TreeView` | C (recursion) | File tree / departments. |
| `TransferList` | C (two ListBox columns + Buttons) | Configuration screens. |
| `EmptyState` | M | Hero + title + CTA. |
| `Rating` | C | Five-star. |
| `ColorPicker` | C | Clinic theming. |
| `FileUpload` | C (drag/drop + click) | Medical records. |
| `SearchFilterBar` | SearchInput + Chip + Select | Top of every list page. |
| `AppointmentBanner` | C | Top-of-page banner. |
| `PatientInfoHeader` | C | Patient identity strip. |
| `SecondaryNavPanel` | C | Sidebar pill column. |
| `Command` | `cmdk` wrapped once | Cmd-K palette. |
| `Resizable` | `react-resizable-panels` wrapped once | Three-pane workspace. |
| `Carousel` | `embla-carousel-react` wrapped once | Onboarding only. |
| `Chart` | `recharts` wrapped with token palette | Vitals graphs. |

### 7.3 Effects (utilities, lifted from animate-ui `effects/`)

Used inside atoms/molecules; never public.

| Effect | Used inside |
|---|---|
| `Highlight` / `HighlightItem` | DropdownMenu Item, Tabs underline, SegmentedControl pill |
| `AutoHeight` | Accordion, expandable Card |
| `Fade` / `Slide` / `Zoom` | Dialog, Snackbar enter/exit |
| `Shine` / `ShineBorder` | RxPad AI overlay border (replaces existing keyframe) |
| `Tilt` / `Magnetic` / `Particles` / `Blur` | (docs) showcase only — never product |

---

## 8. Conventions for every component file

### 8.1 Atom shape

```jsx
// packages/ui/src/atoms/Button/Button.jsx
"use client";

import { forwardRef } from "react";
import { motion } from "motion/react";
import s from "./Button.module.scss";
import { cn } from "../../lib/cn";
import { Slot } from "../../lib/slot";

/**
 * @typedef {"primary" | "secondary" | "ghost" | "destructive" | "outline" | "link"} ButtonVariant
 * @typedef {"sm" | "md" | "lg"} ButtonSize
 * @typedef {"default" | "icon"} ButtonShape
 */

export const Button = forwardRef(function Button(
  {
    variant   = "primary",
    size      = "md",
    shape     = "default",
    tone,
    loading   = false,
    leftIcon,
    rightIcon,
    asChild   = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const Component = asChild ? Slot : motion.button;
  return (
    <Component
      ref={ref}
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      data-tone={tone || undefined}
      data-loading={loading || undefined}
      whileHover={asChild ? undefined : { scale: 1.02 }}
      whileTap  ={asChild ? undefined : { scale: 0.97 }}
      className={cn(s.button, className)}
      {...rest}
    >
      {loading ? <span className={s.spinner} aria-hidden /> : null}
      {leftIcon  ? <span className={s.icon} aria-hidden>{leftIcon}</span>  : null}
      {shape !== "icon" ? <span className={s.label}>{children}</span> : children}
      {rightIcon ? <span className={s.icon} aria-hidden>{rightIcon}</span> : null}
    </Component>
  );
});

export default Button;
```

### 8.2 SCSS module shape

```scss
/* packages/ui/src/atoms/Button/Button.module.scss */
@use "@tatvapractice/tokens/scss" as t;

.button {
  display:        inline-flex;
  align-items:    center;
  justify-content: center;
  gap:            8px;
  border:         1px solid transparent;
  border-radius:  8px;
  font-family:    var(--font-sans);
  font-weight:    600;
  white-space:    nowrap;
  cursor:         pointer;
  user-select:    none;
  transition:
    background-color 160ms ease,
    color            160ms ease,
    border-color     160ms ease,
    box-shadow       160ms ease;

  &:disabled,
  &[data-loading] { opacity: 0.6; cursor: not-allowed; }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--tp-blue-500) 35%, transparent);
  }

  /* sizes */
  &[data-size="sm"] { height: 32px; padding: 0 12px; font-size: 13px; }
  &[data-size="md"] { height: 36px; padding: 0 14px; font-size: 14px; }
  &[data-size="lg"] { height: 40px; padding: 0 18px; font-size: 14px; }

  /* shape: icon */
  &[data-shape="icon"] {
    width:   36px;
    padding: 0;
    .label { display: none; }
    &[data-size="sm"] { width: 32px; height: 32px; }
    &[data-size="lg"] { width: 40px; height: 40px; }
  }

  /* variants */
  &[data-variant="primary"] {
    background: var(--tp-blue-500);
    color:      var(--tp-slate-0);
    @media (hover: hover) { &:hover { background: var(--tp-blue-600); } }
    &[data-active], &:active { background: var(--tp-blue-700); }
  }
  &[data-variant="secondary"] {
    background: var(--tp-blue-50);
    color:      var(--tp-blue-700);
    @media (hover: hover) { &:hover { background: var(--tp-blue-100); } }
  }
  &[data-variant="ghost"] {
    background: transparent;
    color:      var(--tp-slate-700);
    @media (hover: hover) { &:hover { background: var(--tp-slate-100); } }
  }
  &[data-variant="destructive"] {
    background: var(--tp-error-500);
    color:      var(--tp-slate-0);
    @media (hover: hover) { &:hover { background: var(--tp-error-600); } }
  }
  &[data-variant="outline"] {
    background:   var(--tp-slate-0);
    color:        var(--tp-slate-700);
    border-color: var(--tp-slate-200);
    @media (hover: hover) { &:hover { background: var(--tp-slate-50); } }
  }
  &[data-variant="link"] {
    background: transparent;
    color:      var(--tp-blue-600);
    padding:    0;
    height:     auto;
    @media (hover: hover) { &:hover { text-decoration: underline; } }
  }

  /* iPad / touch: enforce 44px hit area without changing visual size */
  @media (hover: none) and (pointer: coarse) {
    min-height: 44px;
    &[data-shape="icon"] { min-width: 44px; }
  }
}

.label   { display: inline-flex; align-items: center; gap: 6px; }
.icon    { display: inline-flex; align-items: center; }
.spinner {
  width:  14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius:    9999px;
  animation: tpButtonSpin 700ms linear infinite;
}
@keyframes tpButtonSpin { to { transform: rotate(360deg); } }
```

Rules:

- **Style on `data-*` attributes**, not class concatenation.
  Primitives emit `data-state="open|closed|on|off|active|inactive"`,
  `data-side`, `data-orientation`, `data-disabled`, `data-highlighted`.
  Use them.
- **Read tokens via `var(--tp-…)`** at runtime. Use SCSS variables
  (`t.$tp-blue-500`) only inside `@if` / `@mixin` blocks where
  computation matters.
- **No global selectors** in module files. Globals belong in
  `packages/tokens/src/_typography.scss` or
  `packages/ui/src/lib/_globals.scss` if absolutely needed.

### 8.3 Storybook story shape

```jsx
// packages/ui/src/atoms/Button/Button.stories.jsx
import { Button } from "./Button";

export default {
  title: "Atoms/Button",
  component: Button,
  parameters: { layout: "centered" },
};

export const Primary   = () => <Button>Save prescription</Button>;
export const Secondary = () => <Button variant="secondary">View history</Button>;
export const Ghost     = () => <Button variant="ghost">Cancel</Button>;
export const Outline   = () => <Button variant="outline">Export</Button>;
export const Destructive = () => <Button variant="destructive">End visit</Button>;
export const Loading   = () => <Button loading>Saving…</Button>;
export const WithIcon  = () => <Button leftIcon={<span>+</span>}>Add medication</Button>;
export const IconOnly  = () => <Button shape="icon" aria-label="Add"><span>+</span></Button>;
export const Sizes     = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);
```

### 8.4 Molecule shape — no vendor imports

```jsx
// packages/ui/src/molecules/Field/Field.jsx
"use client";

import { Children, cloneElement, isValidElement, useId } from "react";
import { Label } from "../../atoms/Label";
import s from "./Field.module.scss";
import { cn } from "../../lib/cn";

export function Field({
  label,
  helper,
  error,
  required = false,
  className,
  children,
}) {
  const id = useId();
  const child = Children.only(children);
  const cloned = isValidElement(child)
    ? cloneElement(child, {
        id,
        "aria-describedby": helper ? `${id}-helper` : undefined,
        "aria-invalid":     !!error || undefined,
      })
    : child;

  return (
    <div className={cn(s.field, error && s.hasError, className)}>
      {label ? (
        <Label htmlFor={id} className={s.label}>
          {label}
          {required ? <span className={s.required} aria-hidden> *</span> : null}
        </Label>
      ) : null}
      {cloned}
      {helper && !error ? <span id={`${id}-helper`} className={s.helper}>{helper}</span> : null}
      {error ? <span className={s.error} role="alert">{error}</span> : null}
    </div>
  );
}
```

A molecule **never** imports `radix-ui`, `@headlessui/react`,
`@base-ui-components/react`, `@mui/material`, `cmdk`, `vaul`, etc.
ESLint enforces this.

---

## 9. iPad + desktop scalability

### 9.1 Breakpoints (`packages/tokens/src/_breakpoints.scss`)

```scss
$bp-sm:        480px;
$bp-tablet:    768px;
$bp-tablet-lg: 1024px;
$bp-desktop:   1280px;
$bp-wide:      1536px;
```

### 9.2 Mixin for media queries (`packages/ui/src/lib/_responsive.scss`)

```scss
@mixin media($key) {
  @if      $key == tablet     { @media (min-width: 768px)  { @content; } }
  @else if $key == tablet-lg  { @media (min-width: 1024px) { @content; } }
  @else if $key == desktop    { @media (min-width: 1280px) { @content; } }
  @else if $key == wide       { @media (min-width: 1536px) { @content; } }
  @else if $key == touch      { @media (hover: none) and (pointer: coarse) { @content; } }
  @else if $key == hover      { @media (hover: hover) and (pointer: fine)   { @content; } }
}
```

### 9.3 Touch-target rule

Every interactive atom enforces:

```scss
@include media(touch) {
  min-height: 44px;
  min-width:  44px;
}
```

For atoms whose visible thumb is smaller than 44px (e.g. 24px
checkbox tick), the **hit area** is enlarged via padding while the
visual stays small (`position: relative` with a `::before`
pseudo-element absorbing taps).

### 9.4 Hover that doesn't break on touch

```scss
@include media(hover) {
  &:hover { background: var(--tp-blue-50); }
}
&[data-state="open"],
&[data-active] {
  background: var(--tp-blue-100);   // iPad active state via tap
}
```

### 9.5 Pointer adaptation per molecule

| Molecule | Desktop | iPad |
|---|---|---|
| `DropdownMenu` | hover-and-click for sub-menus | tap-only sub-menus, larger row height |
| `Tooltip` | hover after 400ms | long-press 600ms (animate-ui handles) |
| `Drawer` | side slide | swipe-up bottom sheet (vaul) |
| `Tabs` | click | swipe between panels (Embla under the hood for the in-visit Rx pad only) |
| `Sidebar` | always-visible rail | collapsed rail with reveal-on-tap |
| `RxPad` form rows | inline edit | tap-to-open keyboard sheet |

### 9.6 Type scale does NOT scale up on iPad

Density solves touch, not larger type. Body stays `14px` on both. This
is intentional and matches the existing TP product.

---

## 10. Storybook (the docs app)

### 10.1 `apps/docs/package.json`

```jsonc
{
  "name":    "docs",
  "private": true,
  "type":    "module",
  "scripts": {
    "storybook":       "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "@tatvapractice/ui":     "workspace:*",
    "@tatvapractice/tokens": "workspace:*",
    "@tatvapractice/icons":  "workspace:*",
    "react":                 "^19",
    "react-dom":             "^19",
    "next":                  "^15"
  },
  "devDependencies": {
    "storybook":               "^8.4.0",
    "@storybook/nextjs":       "^8.4.0",
    "@storybook/addon-essentials": "^8.4.0",
    "@storybook/addon-a11y":   "^8.4.0",
    "@storybook/addon-themes": "^8.4.0",
    "@storybook/addon-interactions": "^8.4.0"
  }
}
```

### 10.2 `.storybook/main.ts`

```ts
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../../packages/ui/src/**/*.stories.@(js|jsx)"],
  addons:  [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
    "@storybook/addon-themes",
  ],
  framework: { name: "@storybook/nextjs", options: {} },
};

export default config;
```

### 10.3 `.storybook/preview.jsx`

```jsx
import "@tatvapractice/tokens/css";
import { TPThemeProvider } from "@tatvapractice/ui";

export const decorators = [(Story) => <TPThemeProvider><Story /></TPThemeProvider>];

export const parameters = {
  viewport: {
    viewports: {
      iPadPortrait:  { name: "iPad Portrait",  styles: { width: "768px",  height: "1024px" } },
      iPadLandscape: { name: "iPad Landscape", styles: { width: "1024px", height: "768px"  } },
      Desktop:       { name: "Desktop 1440",   styles: { width: "1440px", height: "900px"  } },
      Wide:          { name: "Wide 1920",      styles: { width: "1920px", height: "1080px" } },
    },
    defaultViewport: "Desktop",
  },
};
```

Every atom + molecule has at least one viewport-pinned story per
breakpoint we ship for.

### 10.4 Visual diff harness

Two options. Pick one before Phase E.

**A. Chromatic** (paid; trivial setup) — every PR gets a visual diff
report inline. Recommended.

**B. Self-hosted Playwright + `pixelmatch` + `pngjs`** — runs Storybook
locally, screenshots every story at every viewport, diffs against
checked-in baselines. Cheaper but needs maintenance.

The harness lives in `apps/docs/scripts/diff-stories.mjs`.

---

## 11. Publishing

### 11.1 Registry choice

**GitHub Packages (private), TP organization.** This document assumes
that. If you need to switch, change the registry URL in
`packages/*/package.json` `publishConfig.registry` and the `.npmrc`
files.

Other options (cost / complexity comparison):

| Option | Cost | Right when… |
|---|---|---|
| GitHub Packages (private) | free for org, paid above quota | TP code is proprietary. **Default.** |
| npm private | paid (org plan) | We want public-style ergonomics. |
| Public npm | free | We're OK with the world cloning the design system. |
| Verdaccio (self-hosted) | self-host time | We want full control + open-source-style anonymity. |

### 11.2 First release (v0.1.0) — manual

```bash
# In tatvapractice-ui repo
pnpm install --frozen-lockfile
pnpm build
pnpm -r exec npm version 0.1.0 --no-git-tag-version
git commit -am "chore: release v0.1.0"
git tag v0.1.0
pnpm publish -r --access restricted
git push --follow-tags
```

### 11.3 Every release after v0.1.0 — Changesets

Per PR:

```bash
pnpm changeset
# interactive: pick which packages, what bump (patch/minor/major), write summary
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
        with:
          node-version: 20
          cache:        pnpm
          registry-url: https://npm.pkg.github.com
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version-packages
          commit:  "chore: release"
          title:   "chore: release"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN:    ${{ secrets.GITHUB_TOKEN }}
```

This opens a "Version Packages" PR with bumped versions. Merging that
PR triggers the publish.

### 11.4 CI that runs on every PR

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, registry-url: https://npm.pkg.github.com }
      - run: pnpm install --frozen-lockfile
        env: { NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - run: pnpm lint
      - run: pnpm stylelint
      - run: pnpm build
      - run: pnpm test
      - run: pnpm build:storybook
      - run: pnpm --filter docs run diff:stories     # if Playwright variant
```

---

## 12. How VoiceRx (or any consumer) installs and uses this

### 12.1 Auth

In the consumer repo root:

```
# .npmrc
@tatvapractice:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Each developer puts a personal access token with `read:packages` scope
in their shell env (or `~/.npmrc`).

### 12.2 Install

```bash
npm install \
  @tatvapractice/ui @tatvapractice/tokens @tatvapractice/icons \
  motion radix-ui @headlessui/react @base-ui-components/react \
  iconsax-reactjs sonner vaul cmdk \
  react-day-picker react-resizable-panels embla-carousel-react recharts \
  input-otp @mui/material @emotion/react @emotion/styled
```

(Trim by which atoms you actually consume — peer deps are explicit so
you only install what you use.)

### 12.3 Wire the theme

```jsx
// app/layout.jsx
import "@tatvapractice/tokens/css";
import { TPThemeProvider } from "@tatvapractice/ui";
import "./globals.scss";

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

### 12.4 Consume

```jsx
// app/rxpad/page.jsx
import { Button, Field, Input, DropdownMenu } from "@tatvapractice/ui";
import { Stethoscope } from "@tatvapractice/icons";

export default function Page() {
  return (
    <Field label="Medication" required>
      <Input placeholder="e.g. Paracetamol 500mg" />
      <Button variant="primary" leftIcon={<Stethoscope />}>Add</Button>
    </Field>
  );
}
```

Or per-atom for tree-shaking:

```jsx
import { Button } from "@tatvapractice/ui/button";
```

### 12.5 Use tokens in consumer SCSS

```scss
@use "@tatvapractice/tokens/scss" as t;

.shell {
  background:    var(--tp-slate-50);
  padding:       16px;
  border-radius: 12px;
  border:        1px solid var(--tp-slate-200);
}
```

### 12.6 Deletes in VoiceRx after first install

Once `@tatvapractice/ui` is in:

- Delete `components/ui/`, `components/tp-ui/`,
  `components/design-system/`.
- Delete `lib/design-tokens.ts`, `lib/component-tokens.ts`,
  `lib/tp-mui-theme.ts`.
- Delete the `:root { --tp-…: ... }` block in `app/globals.css` (it
  now comes from `@tatvapractice/tokens/css`).

VoiceRx becomes a thin product app that imports from the package and
writes only domain code (organisms, pages, contexts).

---

## 13. The phased plan

> Each phase is a separate Claude Code session, on its own branch, ending
> in a PR. Do not start phase N+1 until phase N is verified.

### Phase A — Cleanup the design-system repo (1 session)

Branch: `00-cleanup`

1. Rename folder / GitHub repo: `DesignSystem-main` → `tatvapractice-ui`.
2. Delete:
   - `.claude/worktrees/`
   - `app/`, `next-env.d.ts`, `next.config.mjs`, `postcss.config.mjs`,
     `tsconfig.json`, `tsconfig.tsbuildinfo`, `vercel.json`,
     `components.json`
   - `components/ui/`, `components/tp-ui/`, `components/tp-rxpad/`,
     `components/tp-appointment-screen/`, `components/rxpad/`,
     `components/rx/`, `components/appointments/`, `components/shared/`,
     `components/docs/`, `components/design-system/`,
     `components/tp-theme-provider.tsx`, `components/theme-provider.tsx`
   - `hooks/use-mobile.ts`, every page-level `*.tsx`
   - `package-lock.json` (we go pnpm-only)
3. Keep:
   - `components/tp-hui/`
   - `components/tp-ui/tp-button.{jsx,module.scss}` (move to ui package)
   - `styles/tokens.scss`
   - `public/` (logos, favicons)
   - `README.md` (will be rewritten in Phase H)
4. Commit. The repo is now an empty shell holding only the seeds.

### Phase B — Monorepo skeleton (1 session)

Branch: `01-monorepo`

1. Add: `pnpm-workspace.yaml`, root `package.json`, `turbo.json`,
   `.changeset/`, `.npmrc`, `.nvmrc`, `.gitignore`.
2. Create:
   - `packages/tokens/`, `packages/icons/`, `packages/ui/`
   - `apps/docs/`
   - `tools/eslint-config/`, `tools/stylelint-config/`,
     `tools/jsconfig-base/`
3. Move `styles/tokens.scss` → `packages/tokens/src/index.scss` and
   split into the seven partials per §3.
4. Move `components/tp-hui/*` → `packages/ui/src/atoms/<Name>/`
   (one folder per atom, rename `button.jsx` → `Button.jsx`,
   `button.module.scss` → `Button.module.scss`, add `index.js`).
5. Move `components/tp-ui/tp-button.{jsx,module.scss}` → archive only;
   the canonical Button is the one moved from `tp-hui` (or rebuilt per
   §7.1's M flavor).
6. Author `packages/tokens/scripts/build.mjs` per §6.2.
7. Author `packages/ui/tsup.config.mjs` and
   `packages/ui/scripts/copy-scss.mjs` per §6.1.
8. `pnpm install`, `pnpm build`. Verify `dist/` outputs in each
   package. Commit.

### Phase C — Tokens v0 (1 session)

Branch: `02-tokens`

1. Split the monolithic `tokens.scss` into seven partials per §3.
2. Run the build, eyeball `dist/tokens.css` and `dist/tokens.json`.
3. Add `scripts/build.test.mjs` asserting the round-trip
   (CSS ↔ JSON ↔ JS).
4. `pnpm changeset` → `@tatvapractice/tokens` minor 0.1.0.

### Phase D — Vendor copy (1 session)

Branch: `03-vendor`

1. Copy from
   `https://github.com/imskyleen/animate-ui` (or the local zip
   under `/sessions/.../animate-ui/animate-ui-main`):
   - `apps/www/registry/primitives/{radix,headless,base,animate,buttons,effects}/`
   - `apps/www/registry/lib/get-strict-context.ts`
   - `apps/www/registry/hooks/use-controlled-state.ts`,
     `use-data-state.ts`
   into `packages/ui/src/_vendor/`.
2. Convert each `.ts(x)` → `.js(x)` (strip type annotations; preserve
   JSDoc).
3. Add `packages/ui/src/_vendor/README.md` with the source commit SHA
   and date copied. Provenance log.
4. **Do not re-export from the `_vendor/` folder.** Atoms import
   directly; everything else is forbidden by ESLint.

### Phase E — Atoms v0 (4–6 sessions, one per group)

Branch per group: `04-atoms-<group>` (e.g. `04-atoms-buttons`,
`04-atoms-form`, `04-atoms-overlay`).

Atom build groups (in order):

1. **Buttons** — `Button`, `IconButton`, `Spinner`.
2. **Icons & text** — `Icon`, `MedicalIcon`, `Typography`, `Label`,
   `Link`, `Divider`.
3. **Visual** — `Avatar`, `Badge`, `StatusBadge`, `Tag`, `Chip`, `Kbd`.
4. **Overlay** — `Tooltip`, `Popover`, `ScrollArea`, `AspectRatio`.
5. **Form input** — `Input`, `Textarea`, `NumberInput`, `OtpInput`,
   `Checkbox`, `Radio`, `Switch`, `Toggle`, `Slider`, `Progress`,
   `Skeleton`, `Select`, `DatePicker`, `TimePicker`.

Per atom:

1. Create the four files per §3 (`<Name>.jsx`, `<Name>.module.scss`,
   `<Name>.stories.jsx`, `index.js`).
2. Wire the JSX per §8.1, the SCSS per §8.2, the story per §8.3.
3. Run `pnpm storybook`, eyeball Desktop / iPadPortrait / iPadLandscape
   viewports.
4. Visual-diff baseline updates checked in alongside.
5. `pnpm changeset` → patch.
6. PR. CI runs lint, stylelint, build, size-limit, Storybook deploy.

### Phase F — Molecules (3–5 sessions)

Branch per group: `05-molecules-<group>`.

Molecule build groups:

1. **Form** — `Field`, `SearchInput`, `SegmentedControl`.
2. **Menus** — `DropdownMenu`, `ContextMenu`, `Menubar`,
   `NavigationMenu`, `HoverCard`, `Command`.
3. **Overlays** — `Dialog`, `AlertDialog`, `ConfirmDialog`, `Drawer`,
   `Sheet`, `Snackbar`, `Banner`, `Alert`.
4. **Surfaces** — `Card`, `Accordion`, `Breadcrumbs`, `Pagination`,
   `Stepper`, `Tabs`, `ClinicalTabs`.
5. **Data** — `Table`, `ClinicalTable`, `Timeline`, `TreeView`,
   `TransferList`, `EmptyState`, `Rating`, `ColorPicker`, `FileUpload`,
   `Carousel`, `Chart`, `Resizable`.
6. **Domain-tinged** — `SearchFilterBar`, `AppointmentBanner`,
   `PatientInfoHeader`, `SecondaryNavPanel`.

Same per-molecule rhythm as atoms.

### Phase G — Icons package (1 session)

Branch: `06-icons`

1. Move custom medical SVGs into `packages/icons/src/medical/`.
2. Author `packages/icons/src/icon.jsx` as the iconsax wrapper.
3. Build, single grid story.
4. `pnpm changeset` → `@tatvapractice/icons` 0.1.0.

### Phase H — First publish v0.1.0 (1 session)

Branch: `07-publish-v0.1.0`

1. Hand-bump versions to 0.1.0 across the three packages.
2. `pnpm install --frozen-lockfile`, `pnpm build` clean.
3. `pnpm publish -r --access restricted` (manually, first time).
4. Tag `v0.1.0` on git, push tag.
5. Rewrite the repo `README.md` with: install instructions, package
   matrix, link to Storybook, contribution guide.
6. From this point on, all releases go through Changesets.

### Phase I — Lint + boundary enforcement (1 session)

Branch: `08-lint`

1. `tools/eslint-config/` — author shared config including
   `eslint-plugin-boundaries` rules per §3.2.
2. `tools/stylelint-config/` — author shared config including
   "no hex literal", "no magic px outside even-pixel scale".
3. Wire both into every package's lint script.
4. Fix every existing violation.
5. CI runs `pnpm lint && pnpm stylelint` on every PR.

### Phase J — Storybook deploy + docs site (1 session)

Branch: `09-docs-deploy`

1. Vercel project for `apps/docs/`. Auto-deploy on PR + main.
2. Custom domain `ds.tatvapractice.com` (or whichever).
3. README badges: build, version, bundle size.
4. `docs-deploy.yml` workflow per §11.4.

### Phase K — Wire VoiceRx as consumer (1 session, in the VoiceRx repo)

Branch (in VoiceRx): `migration/k-consume-tatvapractice-ui`

Pre-req: VoiceRx must already be on JSX + SCSS (see VoiceRx migration
prompt v1 Phases 0–4) or you can short-circuit by porting only the
atoms VoiceRx is ready for.

1. Add `.npmrc` per §12.1.
2. `npm install @tatvapractice/ui @tatvapractice/tokens @tatvapractice/icons`
   plus the peer deps from §12.2.
3. Replace `app/globals.css` token block with
   `import "@tatvapractice/tokens/css"` in `app/layout.jsx`.
4. Replace every legacy ui / tp-ui import with the package import,
   organism by organism. The build matrix in §7 tells you what becomes
   what.
5. Delete the now-unused `components/ui/`, `components/tp-ui/`,
   `components/design-system/` from VoiceRx.
6. Visual diff against baseline. Zero pixel diff acceptance.

---

## 14. Definition of done (v0.1.0)

- [ ] `tatvapractice-ui` is a pnpm monorepo with three packages and
      one docs app.
- [ ] Each package has `dist/` outputs that pass `pnpm pack` round-trip.
- [ ] `@tatvapractice/tokens` exports CSS, SCSS, JS, JSON of every TP
      color / spacing / radius / shadow / motion / z-index / breakpoint.
- [ ] `@tatvapractice/ui` exports every atom from §7.1 (molecules can
      slip to v0.2.0 if needed; document the punt).
- [ ] No file outside `atoms/` and `_vendor/` imports a primitive
      (ESLint enforces).
- [ ] No hex literal in any `.module.scss` (Stylelint enforces).
- [ ] No Tailwind utility class anywhere in `packages/ui/src/`.
- [ ] Every interactive atom enforces `min-height: 44px` on
      `(hover: none)`.
- [ ] Storybook deploys on PR. Visual-diff CI catches regressions.
- [ ] Bundle-size limits per §6.3 pass.
- [ ] `npm install @tatvapractice/ui` works from a fresh VoiceRx clone
      with the right `.npmrc`.
- [ ] VoiceRx renders `/`, `/rxpad`, `/invisit`, `/patient-details`
      using only package imports — zero local `components/ui` or
      `components/tp-ui` files remain.
- [ ] `pnpm release` ships a new version end-to-end via Changesets.

---

## 15. Common pitfalls (read once, avoid forever)

1. **Don't fork an animate-ui primitive.** Wrap it. If wrapping isn't
   enough, raise a ticket and pin the discussion before touching
   `_vendor/`.
2. **Don't expose primitive-specific props.** `<Button data-state>` is
   internal. Wrap into TP semantics.
3. **Don't mix `motion/react` and CSS keyframes for the same property.**
   They will fight. Pick one.
4. **Don't reach into a primitive's internal class names.** Style on
   `data-*` attributes only.
5. **Don't use `cn()` as a Tailwind-merge substitute.** It is a
   string joiner. If you find yourself merging utility classes, you're
   still doing the old thing.
6. **Don't ship demo effects (`Particles`, `Tilt`, `Magnetic`, `Blur`)
   to product surfaces.** Storybook only.
7. **Don't add a new icon library.** We have one (`iconsax-reactjs`)
   and one wrapper (`atoms/Icon`).
8. **Don't put domain knowledge in atoms or molecules.** A `Field` does
   not know about prescriptions. `MedicationField` (organism, in
   VoiceRx) does.
9. **Don't add a peer-dep without optionalizing it.** Consumers should
   only install what they actually use.
10. **Don't `npm publish` from a developer laptop after v0.1.0.** Every
    release goes through Changesets + CI.
11. **Don't break the boundary rules in §3.2.** A `// eslint-disable`
    in a PR is grounds for revert.
12. **Don't commit `dist/`.** Builds happen in CI.

---

## 16. How to invoke this from Claude Code

For each phase, start a new Claude Code session inside the
`tatvapractice-ui` repo with:

```
You are executing Phase <X> of docs/04_DESIGN_SYSTEM_FULL_RESTRUCTURE_PROMPT.md
in the tatvapractice-ui repo.

Hard constraints:
- Stay strictly inside Phase <X>. Do not touch other phases' work.
- Visual output of any consumer must not change. (Phases A–J operate on
  the design-system repo where there is no consumer yet — verify by
  rendering Storybook identically.)
- Use the provided package.json, tsup, turbo, and changeset templates
  literally; deviations need a justification in the PR description.
- Every commit message follows Conventional Commits.

When done, post:
1. Files added / moved / deleted (counts only).
2. dist/ contents (tree + sizes).
3. CI run link / local build log.
4. Any open question flagged for me to decide.
```

For a single-atom session:

```
You are building one atom for @tatvapractice/ui per
docs/04_DESIGN_SYSTEM_FULL_RESTRUCTURE_PROMPT.md.

Atom:        <Name>            (e.g. DropdownMenu)
Layer:       atom | molecule
Primitive:   <flavor>          (e.g. radix)
Replaces:    <legacy files>    (paste from §7 row)

Hard constraints:
  • SCSS module only, tokens only, no Tailwind utilities, no hex literals.
  • TP API shape (props named in TP terms, not primitive-internal terms).
  • Touch targets and hover-vs-touch per §9.
  • No new dependency unless §7 explicitly lists one.
  • Storybook story includes Desktop + iPadPortrait + iPadLandscape variants.
  • Visual diff against the baseline must be zero (or: this is a brand-new
    atom and the baseline is captured this PR).
  • Do not touch any file outside packages/ui/src/<layer>/<Name>/ and
    apps/docs/.

Deliverables:
  1. The four files in packages/ui/src/<layer>/<Name>/.
  2. Updated Storybook story.
  3. Visual-diff report or new baseline.
  4. List of every legacy file deleted (or marked for deletion in next phase).
```

---

**End of prompt.** This document is intentionally exhaustive. Treat it
as the only spec — everything else is commentary.
