# Pm-Doctor-Portal

Web portal for doctors (and a "receptionist" mode) running on the
Tatvapractice platform. Built with **Create React App + React 18 +
Redux Toolkit**, shipped as a static bundle served by nginx and deployed
to Azure Container Apps.

> Looking for **AI agent rules**? See [`AGENTS.md`](./AGENTS.md) (cross-tool)
> and [`AGENTS.md`](./AGENTS.md) (full ruleset).
> Looking for **how the code is shaped**? See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Key features

- **Appointments** — list, add, walk-in consultation, OPD billing dashboard + advanced settings
- **Prescriptions** — classic, smart Rx, tab Rx, gen Rx, voice Rx (`VoiceRxConsult`), Snap Rx (image → digitised)
- **Ophthalmology** — dedicated SnapRx, slit-lamp & fundus templates, exam slices
- **Patients** — all-patients view, patient details, add/edit, mobile variants under `pages/mobile/`
- **Health records** — medical certificates, health-checkup reports, ABHA/ABDM linking, ABHA standalone, HIU consent flows
- **Teleconsult** — Cloudflare RealtimeKit-based call UI, floating window, waiting banners, push-driven status
- **Billing** — OPD bill generation, billing packages, advance bill settings
- **Doctor profile / website** — profile editor, public website settings
- **Print** — configurable print settings, PDF exports for Rx and certificates
- **Messaging** — bulk-message campaigns, WhatsApp via short-link API
- **Monetization** — get-unlimited-access, upgrade modals, plan/demo expiration banners

---

## Tech stack

| Area              | Choice                                                            |
| ----------------- | ----------------------------------------------------------------- |
| Build             | Create React App (`react-scripts` 5)                              |
| Language          | Plain JavaScript (no TypeScript)                                  |
| UI                | React 18 · antd 5 · react-bootstrap · sass                        |
| Routing           | react-router-dom 6 (Sentry-wrapped routes, lazy + retry)          |
| State             | Redux Toolkit + react-redux 8 + redux-persist                     |
| HTTP              | axios 1.x via a single shared instance (`src/api/services/axiosService.js`) |
| Real-time         | Cloudflare RealtimeKit (`@cloudflare/realtimekit-react`)          |
| Editors           | jodit-react · slate (rich-text)                                   |
| PDF               | `@react-pdf/renderer` for generation, `@react-pdf-viewer/*` for viewing |
| Charts / DnD      | chart.js + react-chartjs-2 · `@dnd-kit/*`                         |
| Auth-adjacent     | jwt-decode (token decode in hooks only)                           |
| Observability     | Sentry (`@sentry/react`)                                          |
| Feature flags     | GrowthBook                                                        |
| Analytics         | MoEngage (queued stub bootstrapped in `src/index.js`)             |
| Other             | Firebase, dayjs, lodash, browser-image-compression, qrcode        |

---

## Quick start

```bash
npm install
npm run start:dev      # runs CRA with .env.dev (REACT_APP_ENV=uat)
```

The app opens on `http://localhost:3000`.

### Scripts

| Command               | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `npm start`           | CRA dev server (no env file)                                       |
| `npm run start:dev`   | CRA dev server with `env-cmd -f .env.dev` (`REACT_APP_ENV=uat`)    |
| `npm run build`       | Production build, then upload Sentry sourcemaps                    |
| `npm run lint`        | ESLint over `src/**/*.{js,jsx}` with `--max-warnings=0`            |
| `npm run lint:fix`    | ESLint with `--fix`                                                |
| `npm run lint:errors` | ESLint quiet, unix format (used by the husky `pre-push` hook)      |
| `npm run lint:assets` | Custom check: no raster image imports (see `scripts/`)             |
| `npm test`            | CRA test runner                                                    |

The husky `pre-push` hook runs `npm run lint:errors` — pushes are blocked on lint errors.

---

## Environments

`REACT_APP_ENV` selects which hardcoded block in
[`src/EnvironmentConfig.js`](./src/EnvironmentConfig.js) becomes the active config:

| `REACT_APP_ENV` | Block returned     |
| --------------- | ------------------ |
| `dev`           | `uat` (yes, dev maps to uat today) |
| `qa_tp`         | `qa_tp`            |
| `qa`            | `qa`               |
| `uat`           | `uat`              |
| `prod`          | `prod`             |

> **Note:** Today, every URL/key/secret other than `REACT_APP_ENV` is
> hardcoded in `EnvironmentConfig.js`. The target state (per
> [`AGENTS.md`](./AGENTS.md)) is for every value in `src/config.js` to come
> from a `process.env.REACT_APP_*` variable. New keys MUST follow the
> target. Hardcoded secrets MUST NOT be added.

---

## High-level architecture

```
UI (components/pages)  ─►  Hooks (side effects)  ─►  Services (HTTP)
                                                       │
                                                       ▼
                                              axiosService (one axios
                                              instance, auth + retry +
                                              error notifications)
```

Redux Toolkit (38 slices in `src/redux/`) holds shared state; only the
`doctors` slice is persisted. Routes are defined in `src/App.js` with
`React.lazy` + `lazyRetry` for chunk-load resilience. Sentry,
GrowthBook, MoEngage, Firebase, and the service worker are bootstrapped
in `src/index.js`.

Full diagram and folder tree: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Important design decisions

- **Single HTTP client.** All requests go through `src/api/services/axiosService.js`.
  Components and services do not `import axios`. The interceptor injects the JWT
  bearer token, retries transient 5xx/timeouts, and surfaces antd notifications.
- **Per-call base URL.** Service functions pass `{ customBaseUrl: config.<key>_url }`
  so a single axios instance can talk to ~30 different backend microservice URLs.
- **Heavy code-splitting.** Every page is lazy-loaded; a custom `lazyRetry`
  retries dynamic imports once and a `chunkReloadGuard` does a bounded
  full-page reload when stale chunks are detected after a deploy.
- **Mobile vs desktop split.** `react-device-detect` + a `useDeviceType` hook
  branch certain routes to dedicated `pages/mobile/*` variants. PWA support
  is enabled with a service worker registered in `index.js`.
- **Selective persistence.** redux-persist's `whitelist: ["doctors"]` keeps
  only doctor profile data across reloads — the rest stays in-memory.
- **CRA, not Vite/Next.** This is a deliberate constraint. Do not eject,
  do not switch bundlers, do not introduce TypeScript.

---

## Deploys

GitHub Actions workflows in [`.github/workflows/`](./.github/workflows) auto-deploy
to Azure Container Apps:

| Workflow                                       | Target                          |
| ---------------------------------------------- | ------------------------------- |
| `pm-doctor-portal-qa-AutoDeployTrigger-*.yml`  | QA                              |
| `pm-uat-doctor-portal-AutoDeployTrigger-*.yml` | UAT                             |
| `pm-prod-doctor-portal-AutoDeployTrigger-*.yml`| Production                      |
| `deactivate-old-revision.yml`                  | Deactivates older Azure revisions |
| `notify-teams-on-prod-merge.yml`               | Posts to Teams on prod merges   |

The build script also uploads sourcemaps to Sentry
(`org: digicare-health-solutions-priv`, `project: tatvapractice`).

---

## AI agent guidance — file map

This repo carries its own ruleset for AI coding agents (Cursor, Claude Code,
Codex, Aider, etc.). New code MUST follow these rules.

| File                              | Audience                                     | Purpose                            |
| --------------------------------- | -------------------------------------------- | ---------------------------------- |
| [`AGENTS.md`](./AGENTS.md)        | Any AI agent (cross-tool standard)           | Compact entry point + hard rules   |
| [`AGENTS.md`](./AGENTS.md)          | All agents                                   | Full normative ruleset             |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Humans + agents onboarding                | How the code is actually shaped    |
| [`.cursor/rules/*.mdc`](./.cursor/rules) | Cursor                                | Auto-attached scoped rules         |
| [`examples/*-pattern.{jsx,js}`](./examples) | All agents                          | Reference shapes for new code      |

If you are an AI agent reading this: start with `AGENTS.md`, escalate to
`AGENTS.md` for the full ruleset, and consult `/examples/*` for shape
references before writing new components, hooks, services, or slices.