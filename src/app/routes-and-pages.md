# Routes and pages

> **Scope:** every URL the app exposes — pages, layouts, API endpoints — under `src/app/`.
> **Audience:** frontend devs (where does my new route go?), backend devs (the API surface lives here too — see "API endpoints" below), product managers (the canonical list of product surfaces), AI assistants (must check before adding/changing a route).
> **Read when:** adding a route, changing navigation, debugging a 404, or auditing the product surface.
> **Sibling docs:** [`../components/organisms/organisms-map.md`](../components/organisms/organisms-map.md) (where the implementations live) · [`../../engineering.md`](../../engineering.md) · [`../../integration.md`](../../integration.md) (backend hand-off).

This folder is **the routing layer** of the application. Next.js's
App Router treats every `page.jsx` file under `src/app/` as a URL
endpoint. There is no other way to define routes.

> If you're confused by the relationship between `src/app/` and `src/components/organisms/`: **`src/app/` is just URL registration.** `src/components/` is where UI is implemented. The 2-line `page.jsx` files here import organism components and mount them at a URL.

## Tree

```
src/app/
  layout.jsx                     Root layout — fonts, providers, Toaster.
  globals.css                    Global reset + Tailwind v4 + keyframes +
                                  shared CSS classes (.tp-voice-wave-icon, etc.)
  page.jsx                        / route — re-exports tp-appointment-screen.

  all-patients/
    page.jsx                      /all-patients route handler.
    AllPatientsPage.jsx           Implementation (colocated — single-route).
  follow-ups/
    page.jsx                      /follow-ups route handler.
    FollowUpsPage.jsx             Implementation.
  patient-details/
    page.jsx                      /patient-details route handler.
    PatientDetailsPage.jsx        Implementation.
    PatientDetailAgentPanel.jsx   AI panel for the patient profile.
    PatientDetailAgentPanel.module.scss
  print-preview/
    page.jsx                      /print-preview route handler.
    PrintPreviewPage.jsx          Implementation.
  tp-appointment-screen/
    page.jsx                      /tp-appointment-screen route handler.
    DrAgentPage.jsx               Appointment dashboard implementation.
    AppointmentSnackbars.jsx      URL-flag triggered toast surface.

  rxpad/
    page.jsx                      /rxpad route — redirect to /rxpad/voice.
    voice/
      page.jsx                    /rxpad/voice route handler.
                                   Imports VoiceRxFlow from
                                   components/organisms/voicerx/.
    end-visit/page.jsx            /rxpad/end-visit — imports
                                   EndVisitPage from organisms/rxpad/.
    type/page.jsx                 /rxpad/type — imports TypeRxFlow from
                                   organisms/typerx/.

  api/                             Server-only API endpoints (TypeScript).
    iconsax-icon/route.ts          POST → fetches one Iconsax glyph for
                                    custom-module names; bearer key via
                                    ICONSAX_API_KEY (.env.local).
```

## Two patterns of `page.jsx`

### 1. Single-route feature (colocated)
The implementation lives next to `page.jsx`. The route file is a 2-line
wrapper:

```jsx
// src/app/all-patients/page.jsx
import { AllPatientsPage } from "./AllPatientsPage";

export const metadata = { title: "All Patients — TatvaPractice" };
export default function Page() { return <AllPatientsPage />; }
```

Used for routes consumed by exactly one URL: all-patients, follow-ups,
patient-details, print-preview, tp-appointment-screen.

### 2. Cross-route feature (organism in `src/components/`)
When a feature is shared by multiple routes (RxPad serves
`/rxpad/voice`, `/rxpad/type`, `/rxpad/end-visit`), the implementation
lives in `src/components/organisms/<feature>/` and is imported by
each route:

```jsx
// src/app/rxpad/voice/page.jsx
"use client";
import { VoiceRxFlow } from "@/src/components/organisms/voicerx/VoiceRxFlow";

export default function Page() { return <VoiceRxFlow />; }
```

## Why `_components/` is no longer used

Earlier the colocated implementations sat under `src/app/<route>/_components/<File>.jsx`. We flattened that — the `_components/` indirection added a hop without buying us anything for files that are obviously route-private. Each implementation now sits directly in `src/app/<route>/`.

Next.js will only treat a file as a URL segment if it's named
`page.jsx` / `layout.jsx` / `loading.jsx` / `error.jsx` / etc., so
arbitrarily-named JSX files in the same folder are safe and not
exposed as routes.

## Route metadata

Every route exports a `metadata` object that sets the document title
and description. Keep titles consistent: *`<Page name> — TatvaPractice`*.

## Navigation pattern

App-internal navigation uses `next/router`'s `useRouter().push(...)`
or Next.js `<Link>`. URL params are read in `page.jsx` via
`searchParams` (server) or `useSearchParams()` (client).

Cross-route nav targets are listed in
`components/organisms/shared/dashboard-nav-items.js` (the dashboard
left rail).

## API endpoints

`api/iconsax-icon/route.ts` is the only live endpoint. It proxies
Iconsax MCP queries so the client doesn't see the bearer key.

(Three other endpoints — `api/download/...` and `api/source` —
referenced paths from a previous folder layout and were deleted.)

## Layout & fonts

`layout.jsx` configures:
- `Mulish` (heading font) via `next/font/google` → `--font-heading`.
- `Inter` (body font) → `--font-sans`.
- `<TPThemeProvider>` (MUI theme bridge — see `components/providers/`).
- `<Toaster>` from sonner (mounted globally for `toast()` calls).
- `<Analytics>` from Vercel.

## Cross-references

- `../components/organisms/organisms-map.md` — how feature implementations are organized.
- `../src-overview.md` — top-level orientation to the `src/` tree.
- `../../README.md` — project root README.
- `../../engineering.md` — overall app wiring.
