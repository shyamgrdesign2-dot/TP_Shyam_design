# VoiceRx — Current-State Audit (companion to CLAUDE_CODE_MIGRATION_PROMPT.md)

This is a short report on what's actually in the `tp-voicerx` repo today
and what's in the uploaded `Tatva Practice DesignSystem-main` reference.
It exists so you (and Claude Code) can sanity-check the migration prompt
before running it.

## 1. The shape of the existing code

| Metric | Count |
|---|---|
| `.tsx` files | 375 |
| `.ts` files | 77 |
| `.css` files | 3 (only one is loaded: `app/globals.css`) |
| `.scss` files | 0 |
| Files with `style={{...}}` inline | 131 |
| Files using `className=` Tailwind soup | 307 |
| Lines in `app/globals.css` | 837 |

### Three parallel UI systems live side-by-side

1. **`components/ui/*`** — shadcn (Radix + Tailwind v4 + `cva`). 50+ files.
2. **`components/tp-ui/*`** — TatvaPractice wrappers, mostly around MUI
   plus some Radix and standalone implementations. 60+ files, all
   prefixed `tp-`.
3. **`components/tp-ui/button-system/*`** — a third button family
   (`TPButton`, `TPIconButton`, `TPSplitButton`, `TPButtonIcon`).

`components/tp-ui/index.ts` re-exports everything from family #2 +
`button-system`, but product code still imports directly from
`@/components/ui/*` in many places (40+ import statements found across
the app), so all three families are alive in production.

### Tokens defined three times

- `app/globals.css` — CSS custom properties (`--tp-blue-500`, etc.) plus
  Tailwind v4 `@theme inline` block.
- `lib/design-tokens.ts` — TS constants for the same values.
- `lib/tp-mui-theme.ts` — yet another MUI palette literal.

If you change `--tp-blue-500` in one place it doesn't propagate to the
other two.

### Icon-library sprawl

| Library | Files importing it |
|---|---|
| `lucide-react` | 109 |
| `iconsax-reactjs` | 71 |
| `@mui/icons-material` | 1 |
| `@phosphor-icons/react` | a few |

Plus a custom `tp-ui/medical-icons/*` tree.

### God-files (top by LOC)

| File | LOC |
|---|---|
| `components/tp-rxpad/RxPadFloatingAgent.tsx` | 8779 |
| `components/rx/rxpad/RxPadFunctional.tsx` | 3626 |
| `components/tp-rxpad/dr-agent/DrAgentPanel.tsx` | 2670 |
| `components/tp-appointment-screen/DrAgentPage.tsx` | 2522 |
| `components/design-system/form-showcase.tsx` | 2320 |
| `components/voicerx/VoiceRxActiveAgent.tsx` | 1574 |
| `components/rx/rxpad/reference/RxPadZipReference.tsx` | 1450 |
| `components/design-system/extras-showcase.tsx` | 1221 |
| `components/tp-rxpad/dr-agent/DrAgentPanelV0.tsx` | 1183 |

The whole `components/` tree adds up to **85,749 LOC**. A meaningful
fraction of that is duplicated UI (ui + tp-ui + button-system). Phase 6
of the migration prompt is where that goes away.

### Routing surface

| Route | Entry |
|---|---|
| `/` | re-exports `/tp-appointment-screen` |
| `/tp-appointment-screen` | appointments dashboard |
| `/invisit` | one-line re-export of `VoiceRxFlow` |
| `/rxpad` | `RxPadPage` |
| `/rxpad/end-visit` | `EndVisitPage` |
| `/patient-details` | `PatientDetailsPage` |
| `/print-preview` | `PrintPreviewPage` |
| `/(docs)/*` | internal design-system showcases |

These are the routes the migration must keep visually identical.

## 2. The reference: Tatva Practice DesignSystem

The zip you uploaded already contains the **target pattern** in two places:

- `components/tp-ui/tp-button.jsx` + `components/tp-ui/tp-button.module.scss`
  — a `.jsx` component with co-located SCSS module, no Tailwind soup.
- `styles/tokens.scss` — every TP color exposed both as a SCSS variable
  (`$tp-blue-500`) and a CSS custom property (`--tp-blue-500`) under
  `:root`. This is the dual-format that lets the SCSS modules use either
  level cleanly while the MUI theme can keep reading
  `var(--tp-blue-500)` at runtime.
- `package.json` includes `sass` as a devDep and the rest of the stack is
  identical to `tp-voicerx` (Next.js 16, React 19, Radix + MUI).

The migration prompt is essentially: **"do what Tatva did for one button,
but for the entire app, in the right order, without breaking anything."**

## 3. What's painful that the prompt does not auto-fix

These items the prompt flags as "ask the user", because they need a
human call:

1. Whether `RxPadFloatingAgent.tsx` (the 8.7k-LOC v0 file) is still
   wired into a production route, or whether it is fully superseded by
   `RxPad` + `DrAgentPanel`. If superseded, retire it in Phase 6.
2. Whether to keep `@material/web` (in `package.json`, almost no usage).
3. Whether `app/api/**` route handlers should stay `.ts` (default: yes).
4. Whether to keep both `iconsax-reactjs` and `iconsax-react` (they are
   near-duplicates; default: keep `iconsax-reactjs`, remove the other).
5. Whether the in-`app` `/(docs)` storybook should remain shipped to the
   public bundle or be moved behind a feature flag / route group not
   built in production.

Decide these before you start Phase 2, otherwise Claude Code will
guess.
