# Migration prompts — master index

Every markdown file produced for the VoiceRx ↔ TatvaPractice design-system
restructure lives under `docs/migration/`. This file is the table of
contents. Read in this order.

| # | File | What it covers | Audience |
|---|---|---|---|
| 0 | [`INDEX.md`](./INDEX.md) | This file. Order of reading + one-line summaries. | You |
| 1 | [`CURRENT_STATE_AUDIT.md`](./CURRENT_STATE_AUDIT.md) | Hard numbers on the existing VoiceRx codebase: file counts, three parallel UI systems, god-files, icon sprawl, where the rot is. Context for why each later prompt is shaped the way it is. | You + reviewer |
| 2 | [`CLAUDE_CODE_MIGRATION_PROMPT.md`](./CLAUDE_CODE_MIGRATION_PROMPT.md) | **v1 — the full phased migration plan for the VoiceRx repo.** TSX→JSX codemod, Tailwind→SCSS modules, atomic restructure, page rewiring, cleanup, polish. Phase 0 through Phase 7 with verification gates and screenshot-diff harness. | Claude Code, one phase per session |
| 3 | [`02_PROJECT_STRUCTURE_AND_LIBRARY_PROMPT.md`](./02_PROJECT_STRUCTURE_AND_LIBRARY_PROMPT.md) | **v2 — project structure + per-component primitive choice.** Final folder layout. The build matrix: every TP atom, which primitive flavor (Radix / Headless UI / Base UI / animate-ui / Motion-only) it sits on, and why. iPad + desktop scalability rules. Reusability contract. | Claude Code, one component per session |
| 4 | [`03_DESIGN_SYSTEM_AS_NPM_PACKAGE.md`](./03_DESIGN_SYSTEM_AS_NPM_PACKAGE.md) | **v3 — turn the Tatva design system into an installable npm package.** Restructure the design-system repo into a pnpm monorepo (`@tatvapractice/tokens` · `@tatvapractice/icons` · `@tatvapractice/ui`). Build pipeline (tsup + sass), publishing (GitHub Packages + Changesets), consumption from VoiceRx, Storybook docs site. | Claude Code, one phase per session |
| 5 | [`04_DESIGN_SYSTEM_FULL_RESTRUCTURE_PROMPT.md`](./04_DESIGN_SYSTEM_FULL_RESTRUCTURE_PROMPT.md) | **v4 — the single self-contained prompt for the design-system repo.** Forwards every relevant decision from v1/v2/v3 into one file. Phases A→K with copy-paste templates for every `package.json`, `tsup.config.mjs`, `turbo.json`, `.changeset/config.json`, GitHub workflow. Build matrix for every atom + molecule. **Hand this one file to Claude Code when working in the `tatvapractice-ui` repo — no other prompt needed.** | Claude Code working in the design-system repo |

## Quick decision: which prompt do I run when?

```
Task                                          Prompt to use   Repo
─────────────────────────────────────────────────────────────────────────
Audit / "what state is the code in?"          audit            VoiceRx (read)
Migrate VoiceRx (TSX→JSX, Tailwind→SCSS)      v1               VoiceRx
Decide which primitive backs each atom        v2               either
Build a single atom or molecule (in VoiceRx)  v2 §10 / §12     VoiceRx
Restructure the design system (single file)   v4               design-system
Wire VoiceRx to consume the package           v4 Phase K       VoiceRx
```

**v4 supersedes v3** for design-system work — it forwards every v3
decision plus the full atom/molecule build matrix from v2 into one
self-contained file. v3 stays as reference. Use v4 when you start.

## The relationship between v1, v2, v3

- **v1 is the "what to do" if the design system stays inside VoiceRx**
  (a single-repo refactor). Use this if you decide not to ship a separate
  package.
- **v2 is the "how each component is composed"** — which library, which
  flavor, what API. v2 is layered on top of v1 if single-repo, or layered
  on top of v3 if multi-repo. The component matrix is the same either way.
- **v3 is the "split it out and publish it"** path — the more ambitious
  end-state. Use this if you want the design system to be reusable across
  TP products (RxPad, Voice, future ones).

If you do v3, you can skip v1 Phases 4–7 (the heavy SCSS / cleanup work
moves into the design-system repo) and replace them with v3 Phase H
(VoiceRx becomes a consumer).

If you do v1 only, the design system lives forever inside VoiceRx — fine
for one product, suboptimal for two.

## Files NOT covered here

- `design.md`, `engineering.md`, `integration.md` at the repo root —
  these are the existing product-team docs (visual contract, wiring
  reference, backend hand-off). The migration prompts reference them but
  do not replace them.
- `docs/CTA-ICON-GUIDELINES.md` — pre-existing icon usage rules; still
  valid post-migration.
- `components/tp-rxpad/dr-agent/docs/*` — internal Dr.Agent
  documentation; unchanged by the migration.
