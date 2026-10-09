# Dr. Copilot: developer handoff

Internal document. Status as of 8 Oct 2026.

## Get the code

Two branches carry this work. **For UAT, use the first one.**

| | |
|---|---|
| Repository | https://github.com/DHSPL-Tatvacare/Pm-Doctor-Portal |
| Branch for UAT | [`dr-copilot-uat-next`](https://github.com/DHSPL-Tatvacare/Pm-Doctor-Portal/tree/dr-copilot-uat-next) |
| Commit to pull | **one commit** on top of `dr-copilot-uat` |
| Based on | [`dr-copilot-uat`](https://github.com/DHSPL-Tatvacare/Pm-Doctor-Portal/tree/dr-copilot-uat) (UAT line) |
| All changes | [dr-copilot-uat...dr-copilot-uat-next](https://github.com/DHSPL-Tatvacare/Pm-Doctor-Portal/compare/dr-copilot-uat...dr-copilot-uat-next) |

```bash
git fetch origin
git checkout dr-copilot-uat-next
```

The prod-based branch [`dr-copilot-context`](https://github.com/DHSPL-Tatvacare/Pm-Doctor-Portal/tree/dr-copilot-context)
holds the same work on top of `prod`. It is the one to merge when this lands
on prod, and it is the only one where Copilot's VoiceRx can print a SOAP note
(see below).

### What differs on the UAT branch

The UAT line and prod have drifted, so three things were kept as UAT has them
rather than overwritten:

| | |
|---|---|
| Rx pad VoiceRx | untouched. The Rx pad's own Dr. Agent panel keeps its VoiceRx code; only Copilot uses the shared hook. On prod the two are unified. |
| Pharmacy in the new sidebar | routed through this line's `resolvePharmacySidebarAction`, the `/pharmacy/status` gate and the setup form, not prod's older "interest submitted today" gate. |
| SOAP print from Copilot's VoiceRx | **not available here.** It needs the print-payload helpers that live on prod. Recording, transcription and copy to the pad all work. |

| | |
|---|---|
| Deployed anywhere? | **No.** Not merged to `uat` or `prod`. |
| Backend used | Copilot search service, preprod: `https://pm-copilot-preprod.tatvacare.in/api/search` |
| UAT portal | https://pm-uat-doctor-portal.tatvacare.in |
| Indexed patient data | **Zydus Hospital only.** Any other account answers "not indexed", which is correct behaviour, not a bug. |

## APIs and integration status

**Summary:** the frontend integration with the Copilot search service is
**done and live** (preprod service): auth, starters, sessions and ask are all
called from the UI. No mock data or mock APIs remain in the Copilot flow.
VoiceRx is not a Copilot integration; see B.

**Call order when a doctor opens a patient and asks:**

1. `GET /auth`: first, once per sign-in, shared by every patient
2. `GET /patients/{uid}/starters`: once per patient (cached 10 min)
3. `POST /patients/{uid}/sessions`: on that patient's first question
4. `POST /patients/{uid}/ask`: on every Send, chip, or follow-up

Opening another patient repeats 2–4 for that patient; step 1 is not
repeated.

### A. Copilot search service: integrated ✅

Base URL: `https://pm-copilot-preprod.tatvacare.in/api/search`
Called from the browser as `/copilot-search/api/search/...` (same-origin; the
dev server or nginx forwards it, because the service has no CORS).
Auth: `Authorization: Bearer <COPILOT token>` (see section 3).
Client: `src/components/dr-copilot/chart-search/copilotApi.js`.

| Endpoint | What it does | Integrated? | Where it is used |
|---|---|---|---|
| `GET /patients/{patientUid}/starters` | The chart's suggested questions (`short` label, `ask` text, `intent`) | ✅ Yes, live | Starter chips in the Patient Details top bar and on the Copilot welcome screen, plus follow-up chips under each answer (`useCopilotStarters.js`) |
| `POST /patients/{patientUid}/sessions` | Opens a conversation; returns `session_id` | ✅ Yes, live | On the first question for a patient, and again if the service no longer knows the stored session (`useCopilotReply.js`) |
| `POST /patients/{patientUid}/ask` | Body `{ session_id, question, parent_request_id }`. Returns Markdown `answer` with `[n](#evidence-n)` citations, `interpretation`, `evidence[]`, `coverage`, `request_id` | ✅ Yes, live | Every question: typed, chip, or follow-up. Rendered as the cited answer card; citations open the Evidence drawer (`useCopilotReply.js`, `ChartAnswerCard.jsx`, `EvidencePanel.jsx`) |
| `GET /auth` | Checks the token; returns `{ "authenticated": true }`. Takes no patient: the same answer whichever patient is open, so it is **per sign-in, not per patient** | ✅ Yes, live | Called first, as soon as a patient page with Copilot loads. Every patient call waits for it. The result is reused for all patients for 30 min; checked again when the token changes, after any `401`, or after 30 min (`ensureCopilotAuth` in `copilotApi.js`) |
| `GET /patients?q=` | Name search over indexed patients; returns `{ patients: [{ patientUid, patientName }], hasMore }` | ⚪ Deliberately not used | It is the patient picker of the service's own UI. It matches names loosely (`q=Hiyaan` also returns "Dhiyaana …") and cannot find a patient by id (`q=<patientUid>` returns nothing). The portal already knows the open patient and scopes every call by `patientUid`; resolving by name could pick the wrong chart. **The question itself goes to `/ask` for the open patient on every Send.** |

`patientUid` is the portal's own `patient_unique_id` for the patient on
screen, with no mapping table.

How each response is handled:

| Response | What the doctor sees |
|---|---|
| `200` with citations | Answer card with numbered citations and an Evidence drawer |
| `200` without citations | The answer as plain text |
| `404` on `/starters` | No message; the four standard starter chips show |
| `404` on `/sessions` | "This patient's record has not been indexed for Copilot yet" |
| `404` on `/ask` with a stored session | Session treated as expired: a new session is opened once and the question retried |
| `401` / `403`, or `/auth` returns `authenticated: false` | "Copilot could not authenticate with the record search service"; the auth result is cleared and checked again on the next action |
| `5xx`, network error, or no response in 90s | "Copilot could not finish that answer just now, and nothing was saved. Please ask again." |

### B. VoiceRx: the Rx pad's existing flow, shared with Copilot ✅

VoiceRx is the product's existing feature with its own APIs on UAT; no
VoiceRx backend was built or changed. On `prod` the Rx pad showed it inside
its Dr. Agent panel. On this branch that panel is replaced by Copilot, so
Copilot now runs **the same VoiceRx flow, from the same code**:

- The flow was moved verbatim out of `useDrAgentPanel.js` into a shared hook,
  `src/components/dr-agent/rxpad/dr-agent/hooks/useVoiceRxChat.js` (helpers in
  `voiceRxChatHelpers.js`). The Rx pad's Dr. Agent panel (still used by the
  dental pad) now calls it too, unchanged in behaviour.
- In Copilot on the Rx pad: the composer's **VoiceRx** button → the existing
  consult-mode sheet → the Copilot card **flips** to the Rx pad's own
  `BackFace` (recorder, processing, then the result canvas with Transcript /
  Clinical Notes / SOAP, add details by voice, quick edit, SOAP retry,
  copy all to RxPad, print SOAP).
- **VoiceRx always runs in the sidebar, never in the popup.** In the popup,
  Start conversation / Start dictation (or "View clinical notes" on a thread
  card) switches Copilot to the right-hand sidebar, and the card flips there.
  The popup itself never flips. While a session is recording or processing,
  the sidebar ↔ popup toggle is hidden, because switching remounts the panel
  and would end the recording. Code: `voiceRxInPopup` /
  `onMoveVoiceRxToSidebar` / `pendingVoiceRx` in `DrAgentPanel.jsx` and
  `CopilotDock.jsx`.
- The VoiceRx back face, transcript bubble and structured card are wrapped
  in `data-dr-agent="true"`: the recorder's utility styles in
  `dr-agent-globals.css` (button heights, widths, corners) are scoped to that
  attribute and do not apply without it.
- In the Copilot thread: the Rx pad's **Conversation/Dictation transcript
  bubble** (with Edit/VoiceRx), the **structured clinical notes card** (only
  the latest kept; "View clinical notes" reopens the canvas), the voice
  entry animation.
- Also carried over: VoiceRx credit guard, "another dictation is active"
  lock, usage logging, voice history, restoring a saved session's notes,
  the page aura while copying, and the live-session button when Copilot is
  closed mid-recording (the recording keeps running).
- Shown only when the consultation was entered through the VoiceRx flow,
  exactly as on `prod` (`canUseVoiceRxModuleUi`).

How Copilot reaches the page: Copilot is mounted app-wide, outside the Rx
pad's `RxPadSyncProvider`. `PrescriptionNew.jsx` renders
`<CopilotRxPadBridge/>` inside its provider, which publishes the live sync
value, patient, voice hydration status and SOAP printing to
`surfaces/copilotRxPadBridge.js`; `CopilotDock` provides that value to its
panel. Copilot's old stub context now re-exports the real one.

APIs used (unchanged, existing): `POST /agents/transcribe-audio`,
`POST /agents/digitise-data`, `POST /agents/get-soap-notes`,
`POST /api/v1/digitization/voice/upload`, `POST /api/v1/digitization/voice/logs`
on the VoiceRx UAT services, with the portal login token.

**Verified** end to end on a local UAT-mode build (Chrome fed a recorded
consultation as the microphone): sheet → flip → recording → submit → all
five APIs `200/201` → result canvas with correct symptoms, examination,
diagnosis, medication, advice and follow-up → thread with transcript bubble
and notes card; no page errors.

### C. Portal data used (no new APIs)

| Data | Source |
|---|---|
| Patient in scope (`patient_unique_id`, name) | The page's existing patient state (Patient Details / Rx pad) |
| Doctor identity (session key, VoiceRx `doctor_id`) | Existing Redux `doctors.profile` and the portal login token |
| Patient names in the picker | Existing Redux appointments list |

### D. Not integrated / out of scope

| Item | Status |
|---|---|
| Attachments in Copilot | ❌ Hidden; no service reads attachments |
| Follow-up suggestions from the service | ❌ The API does not return any; the UI reuses `/starters` |
| Old Turbopuffer archive (`pm-turbopuffer-uat`) | ❌ Not used by Copilot. Only the internal `/chart-search-x` test page and a dev proxy still reference it |
| Clinic-wide questions (no patient open) | ❌ Copilot only answers for an open patient |

> **Index data is Zydus Hospital only.** Every patient in the Copilot search
> index comes from Zydus Hospital (the indexed org is hospital business
> `368451724046474`, clinic `21313`). On any account outside that org, every
> patient answers "not indexed". That is the correct behaviour, not a bug.
> To see real answers, citations and the evidence drawer, test with a Zydus
> account that has indexed patients.

---

## 1. What Dr. Copilot is

A chat assistant in the doctor portal that answers questions about the
patient on screen **from that patient's own record**. It retrieves, it does
not reason: every answer comes from the Copilot search service, with numbered
citations that open the source records.

Where it appears:

- **Patient Details:** a top bar with the "Ask Copilot about …" search field
  and four starter-question chips, a Copilot tab on the right edge, and a
  right-hand rail that narrows the page instead of covering it.
- **Rx pad (prescription):** the same search field in the header, opening
  Copilot as a popup. Only here does the composer offer **VoiceRx**.
- The popup and the rail are the same panel; the doctor can switch between
  them and keeps the conversation.

## 2. What is built (frontend, done)

### Answers from the live service

- Every question goes to the Copilot search service for the **patient on
  screen** (`patientUid` = the portal's `patient_unique_id`). No mock data,
  no stand-in patient, no demo engines are reachable.
- Endpoints used (full contract in [`api-contract.md`](./api-contract.md)):

  | Call | Used for |
  |---|---|
  | `GET /auth` | token check, once per sign-in, before any patient call |
  | `GET /patients/{uid}/starters` | the four starter chips |
  | `POST /patients/{uid}/sessions` | opens a conversation |
  | `POST /patients/{uid}/ask` with `session_id`, `question`, `parent_request_id` | each question |

- Answers are Markdown with `[n](#evidence-n)` citations
  ([`answer-markdown-contract.md`](./answer-markdown-contract.md)). They render
  as one card: `##`–`######` headings as sections, lists, bold, escapes
  removed. Clicking a citation opens the **Evidence drawer** with the full
  cited set, jumps to that record, and keeps its header pinned while
  scrolling.
- Plain-sentence outcomes instead of error codes:
  - `404` → "This patient's record has not been indexed for Copilot yet".
  - `401/403` → "Copilot could not authenticate with the record search service".
  - `5xx`, network error, or 90s timeout → "could not finish that answer, nothing was saved, ask again".

### Starter questions

- The service's own starters for the chart. When it has none (loading, not
  indexed, request failed), its four standard ones show:
  Patient summary, Medications on record, Conditions on record, Advice on record.
- Under each answer, the starters not yet asked are offered as follow-ups
  (the API sends no follow-up suggestions of its own).
- Cached for 10 minutes per doctor + patient, shared by the top bar and panel.

### Sessions (how conversations are kept)

| Rule | Behaviour |
|---|---|
| Key | doctor (`doctor_unique_id` from the portal token) + patient |
| Storage | `sessionStorage`: this browser tab only, cleared when the tab closes |
| What is stored together | the visible thread **and** the service `session_id` + last `request_id` |
| Idle lifetime | 30 minutes since the last question or answer, then both reset |
| Size | last 60 messages per patient |
| Follow-ups | reuse `session_id`; `parent_request_id` = last **successful** answer |
| Failed turn | never becomes a parent |
| Session unknown to the service (404 on `/ask`) | opens a new session once and retries the question |
| Close / reopen, rail ↔ popup, leave patient and return, page reload | conversation restored |
| Another patient | own thread and own session |
| Answer arriving after switching patient | lands in the patient it was asked about |

Code: `src/components/dr-copilot/chart-search/copilotSessionStore.js`,
`useCopilotReply.js`, `useCopilotStarters.js`, `surfaces/CopilotDock.jsx`.

### Two scopes, and switching between them

| | |
|---|---|
| Patient scope | a conversation bound to one chart. Entered from the patient page or consultation header, or by opening a patient from a search result. |
| Hospital-wide scope | `/discovery/*`: finds patients across the hospital by recorded criteria. Entered from the app top bar's Copilot search. Answers about no single chart. |
| Scope control | `surfaces/CopilotContextBar.jsx`, rendered in the panel header in both scopes. Names the scope, says how many questions are waiting in the other one, and switches. |
| Conversations | one per scope, never merged. Switching back resumes. The hospital-wide thread is stored under the reserved key `__clinic__`. |
| Wrong-scope questions | `response_kind: "other_patient"` in a chart, and a "which patient do you mean?" answer in the hospital scope, both render `cards/clinical/ScopeRedirectCard.jsx`: it names the scope that can answer and carries the question into it. |
| Not available yet | limiting a search to the asking doctor's own patients. The service takes no doctor scope; stated as a line in the switcher rather than a disabled control. See 4.4. |

The top bar's Copilot search clears the patient scope when it opens, rather
than inheriting the last chart the doctor was in, and its rotating hints are
hospital-wide there and patient-specific in a patient header.

### VoiceRx inside Copilot (Rx pad only)

- Copilot runs the Rx pad's own VoiceRx flow through the shared
  `useVoiceRxChat` hook and `BackFace` (see "APIs and integration status" → B).

### Other UI changes on this branch

- Patient Details: one-viewport layout (only inner content scrolls), shorter
  hero, collapse control at the bottom of the patient rail.
- Scoped Tailwind for the Copilot module only (`tailwind.copilot.config.js`,
  rule in `craco.config.js`), emitted under `#dr-copilot-root`.
- A production-only bug was fixed where the Copilot input box disappeared in
  built versions (a comment right after `return (` compiled to `return;`).
- Tesseract top bar + sidebar (`src/pages/main-shell-v1`, `main-header-v1`,
  `main-sidebar-v1`) on the pages that carry the Copilot search: appointments,
  billing dashboard, all patients, billing settings, data analytics, LIMS.
  Those pages no longer render `Header`/`SidebarDoctor` themselves. Mobile
  dashboards and receptionist views skip the shell and keep their own wrapper.
- Recent conversations list (`surfaces/CopilotRecentSessions.jsx`) reading the
  service's 30-day history, opened from the clock control in the panel header.

## 3. How it reaches the service

### CORS: solved with a same-origin proxy

The service sends **no CORS headers** (its preflight returns 405), so a
browser cannot call it directly from any portal origin. The app always calls
its own host at `/copilot-search/*`:

- **Local dev:** `src/setupProxy.js` forwards to the service.
- **Deployed build:** `nginx.conf` has `location /copilot-search/` forwarding
  to `https://pm-copilot-preprod.tatvacare.in/`. Verified locally with
  `nginx -t` and a real round trip through the proxy.

### Authentication: currently a separate token

The service **does not accept the portal's own session tokens**. A UAT login
token is rejected with "Invalid or expired bearer token", the same response
as a forged signature, so the service verifies with a different signing key.
Until that changes, the app sends a token issued for the Zydus index owner:

- Order used by `getCopilotToken()`:
  1. `localStorage["copilot_search_jwt"]` (manual override for testing)
  2. `REACT_APP_COPILOT_TOKEN` (build-time env)
  3. the portal's own token
- **The token is never committed.** Locally it lives in `.env.dev`
  (gitignored). In CI it comes from a GitHub secret (below).
- ⚠️ `REACT_APP_*` values are baked into the JavaScript bundle, so anyone
  with access to the UAT site can read this token. Acceptable for a preprod
  test token on UAT only; **not acceptable for prod.**

## 4. What the developer needs to do

### 4.1 Before UAT (required)

1. **Add the GitHub secret `COPILOT_SEARCH_TOKEN`** (repo Settings → Secrets
   and variables → Actions). Value: the preprod Copilot token (ask Shyam; it
   is not in the repo). Without it UAT shows "could not authenticate".
2. **Bring the single `dr-copilot` commit onto a `uat`-based branch.** The
   branch is based on `prod`, which differs from `uat`, so do not merge the
   branch into `uat` directly. Instead:
   - branch from `uat` (e.g. `dr-copilot-uat`)
   - `git cherry-pick dr-copilot-handoff` and resolve conflicts (expect
     them mainly in `src/App.js`, `package.json` / `package-lock.json`, and
     the pages in 4.3)
3. **Run `npm install --legacy-peer-deps`.** New dependencies: `recharts`,
   `react-speech-recognition`. `lottie-react` is already present.
4. **Build locally in UAT mode** to catch conflicts before CI:
   `REACT_APP_ENV=uat npm run build` (the build script already sets an 8 GB
   Node heap; the default 4 GB runs out of memory).
5. **Push to `uat`.** The UAT workflow builds and deploys automatically.

### 4.2 After it is on UAT: test checklist

Use a **Zydus Hospital account with indexed patients** for 1–5.

- [ ] Patient Details shows the top bar, four chips, and the Copilot tab
- [ ] A chip or typed question returns a cited answer card
- [ ] A citation opens the Evidence drawer above the popup, header pinned
- [ ] A follow-up question continues the same conversation
- [ ] Close and reopen Copilot, switch rail ↔ popup, leave and return to
      the patient: the conversation is still there
- [ ] A different patient starts empty with their own chips
- [ ] A non-Zydus patient answers "not indexed" (expected)
- [ ] Rx pad entered via VoiceRx: Copilot's VoiceRx button → sheet → flip →
      record → result canvas → Copy all to RxPad fills the Rx pad
- [ ] Start VoiceRx from the **popup**: Copilot moves to the sidebar and the
      recorder opens there; the popup never flips
- [ ] Recorder buttons match the Rx pad: close 42×42, mic and Submit 42px
      tall, 12px corners
- [ ] Close Copilot while recording: the live-session button appears and
      the recording continues; reopen and submit
- [ ] Dental pad (old Dr. Agent panel): VoiceRx still works as before
- [ ] Network tab on opening a patient: `GET /auth` is the first Copilot
      call; opening a second patient does not call `/auth` again
- [ ] Browser Network tab: every call is `/copilot-search/api/search/...`
      on the UAT host, none go directly to `pm-copilot-preprod`

### 4.3 Files that make Copilot work

| Area | Files |
|---|---|
| Copilot module | `src/components/dr-copilot/**` |
| Mount + pages | `src/App.js` (`CopilotBoundary` around the routes, plus `/copilot-cards` and `/chart-search-x` internal pages), `src/pages/PatientDetails.js`, `src/pages/PrescriptionNew.jsx`, `src/common/HeaderPrescription.js`, `src/common/SidebarPatient.js`, `src/common/Welcome1.js`, `src/styles/sidebar.scss` |
| Styling build | `tailwind.copilot.config.js`, `craco.config.js` |
| Service access | `src/setupProxy.js` (dev), `nginx.conf` (deployed) |
| CI / image | `Dockerfile` (`REACT_APP_COPILOT_TOKEN` build-arg), `.github/workflows/pm-uat-doctor-portal-AutoDeployTrigger-3dd659af-0107-4d2c-aac9-a802200095da.yml` (passes `secrets.COPILOT_SEARCH_TOKEN`) |
| Dependencies | `package.json`, `package-lock.json` |
| Assets | `public/icons/dr-agent/*`, `public/icons/medical/*`, `public/icons/dr-copilot/*` |
| Docs | `docs/dr-copilot/*` |

### 4.4 Open items for the backend

1. **Accept the portal's own JWT** (trust the portal issuer's signing key).
   This removes the separate token and the bundle-exposure risk. It is
   required before prod.
2. **Index non-Zydus data**, or confirm which orgs should have access.
3. **Enable CORS** for portal origins, or confirm the nginx proxy is the
   long-term path. Note that `nginx.conf` is shared by every environment's
   image, and its proxy currently points at the preprod host.
4. **Distinguish "session not found" from "patient not indexed"** on `/ask`.
   Both return 404 today; the frontend works around it by retrying once.
5. **502s:** "The model did not return a valid complete answer; the turn was
   not saved" occurs intermittently. Shown to the doctor as "ask again".
6. **Follow-up suggestions** in the `/ask` response (optional). Today the
   frontend reuses the starters.
7. **Session expiry:** tell the frontend the server-side session lifetime so
   the 30-minute client window can match it.

## 5. Running it locally

### 5.1 Environment file

Create `.env.dev` in the repo root. It is gitignored; never commit it.

```bash
PORT=3007
GENERATE_SOURCEMAP=false
REACT_APP_ENV=dev
# Copilot search service token (preprod, Zydus index owner). Ask Shyam.
REACT_APP_COPILOT_TOKEN=<preprod copilot token>
```

| Variable | Needed for | Notes |
|---|---|---|
| `REACT_APP_ENV` | every build | `dev` and `uat` both point at the UAT backends (`src/EnvironmentConfig.js`); a build without it renders a blank page |
| `REACT_APP_COPILOT_TOKEN` | Copilot answers | without it Copilot says "could not authenticate" |
| `REACT_APP_COPILOT_SEARCH_URL` | optional | overrides the API base (default `/copilot-search/api/search`, served by the proxy) |
| `REACT_APP_COPILOT_SEARCH_ORIGIN` | optional, dev server only | proxy target (default `https://pm-copilot-preprod.tatvacare.in`) |

Per-browser override for testing, no rebuild needed:
`localStorage.setItem("copilot_search_jwt", "<token>")`.

### 5.2 Dev server (hot reload)

```bash
git fetch origin && git checkout dr-copilot
npm install --legacy-peer-deps
npm run start:dev          # http://localhost:3007
```

`src/setupProxy.js` forwards `/copilot-search/*` to the service.

### 5.3 Production build, served like UAT

This is the check to run before pushing to `uat`: a real UAT-mode build,
served by the same `nginx.conf` the container uses, so the Copilot proxy is
exercised exactly as deployed.

```bash
# 1. Build in UAT mode with the token (8 GB heap; 4 GB runs out of memory)
export REACT_APP_COPILOT_TOKEN=<preprod copilot token>
REACT_APP_ENV=uat GENERATE_SOURCEMAP=false DISABLE_ESLINT_PLUGIN=true CI=false \
  NODE_OPTIONS=--max-old-space-size=8192 npx craco build

# 2a. Serve with Docker (same nginx as the image; not yet run on a machine with Docker)
docker build -f Dockerfile.nginx-local -t pm-portal-nginx .
docker run --rm -p 8089:80 -v "$PWD/build:/usr/share/nginx/html:ro" pm-portal-nginx

# 2b. Or with Homebrew nginx: copy nginx.conf, change `listen 80` to 8089,
#     point `root` at ./build, fix the log/pid/mime.types paths, then:
nginx -t -c /path/to/nginx.local.conf && nginx -c /path/to/nginx.local.conf
```

Open `http://localhost:8089`, log in, open a patient from All Patients, and
use "Ask Copilot about …". In the Network tab every Copilot call should be
`/copilot-search/api/search/...` on `localhost:8089`, never the preprod host.

Known gotchas:
- `npm run build` also uploads Sentry sourcemaps, which needs
  `SENTRY_AUTH_TOKEN`; locally use `npx craco build` as above.
- If `recharts` or `react-speech-recognition` "cannot be resolved", your
  `node_modules` came from another branch: rerun `npm install --legacy-peer-deps`.
- Switching branches under a running dev server leaves it compiling the old
  branch's files; restart it.

## 6. Reference docs in this folder

- [`api-contract.md`](./api-contract.md): endpoints, payloads, responses
- [`answer-markdown-contract.md`](./answer-markdown-contract.md): answer format the UI renders
- [`starter-question-logic.md`](./starter-question-logic.md): starter chips (retrieval-only rule)
- [`Output_markdown-prompting.md`](./Output_markdown-prompting.md): prompting guide for the answer format
- [`use-cases.md`](./use-cases.md), [`eval-questions.md`](./eval-questions.md): doctor use cases and evaluation questions
- Screenshots and redacted HAR files were shared separately (not committed:
  they contain patient data).
