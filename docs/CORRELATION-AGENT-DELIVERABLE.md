# Correlation Agent (Beta) — Developer Deliverable

One document for the developer picking this up: what it is, how it works, how to
run it, what's live vs. pending, and how to integrate it. Everything else
(`docs/correlation-agent-prd.md`, `CORRELATION-AGENT.md`, `src/pages/correlation-agent/RULES.md`)
is background; this is the handover.

---

## At a glance

| | |
|---|---|
| **Branch** | `correlation-agent-beta` |
| **Remote** | `origin/correlation-agent-beta` (GitHub) |
| **Based on** | `prod` (`ab59c02e9`) |
| **Shape** | single squashed commit on top of prod |
| **Status** | Beta prototype, live against the CORA UAT service |
| **Not pushed to** | prod, UAT — the developer integrates and promotes |

Pull it, run it, see the flow, then integrate into your own branch.

---

## 1. What it is

An agent that reads a patient's reports **against each other**, argues against
every link it proposes, and shows only what survives. The output is a three
column Sankey: **lab results → relationship → possible pattern**.

- **Lab results** — the patient's own values. Out of range in red with a direction arrow.
- **Relationship** — what the values mean together, each with a mechanism, a
  counter-argument, and an evidence grade (Strong / Moderate / Low / Speculative).
- **Possible pattern** — the service's hypotheses. **Disease-name-free by a backend
  guardrail**, so they are patterns, never a named diagnosis.

Clicking a relationship or pattern card opens a detail panel: *Why these go
together*, *Tested against* (the challenge), *Built from* (the findings, with
values), and *What it supports*. A pattern can be recorded onto the prescription.

---

## 2. The happy flow (what to smoke-test)

1. Open the **Correlation** item in the Rx pad rail (marked **Beta**).
2. The intro card summarises what's on file ("N records ready to correlate,
   N lab results, N imaging reports").
3. **Start a correlation** → the picker opens, listing the patient's lab dates
   and medical records, pre-selected to the most recent day.
4. **Generate correlation** → the reading step streams live stages (reading each
   file, findings assembled, reasoning) behind a single-line ticker.
5. The **Sankey** renders from the live result. Click any relationship/pattern
   card → detail panel opens.

Verified working end to end against the live CORA UAT service on the dev server.

---

## 3. How it works

```
picker selection
  → buildRequest(): labs as structured text, records as their hosted file URLs   (data/coraClient.js)
  → POST /cora/v2/patient-analysis                                                (one SSE connection, via setupProxy.js)
  → CORA fetches + OCRs the files, extracts findings, runs the reasoning core
  → final_result adapted into the chart's shapes                                 (adaptRun)
  → applyLiveRun() populates the runtime store                                   (data/demoRun.js)
  → Sankey + Rx card render                                                       (data/runStore.js)
```

**One endpoint does everything.** `POST /api/v2/patient-analysis` takes the patient
plus reports (file URLs and/or raw text) and streams back run progress and the
final result over Server-Sent Events. There is no separate extract-then-analyze
step and no client-side OCR.

**Two kinds of report, because we hold two kinds.** Lab results arrive from the
lab-params API already structured, so they go up as text (one block per date).
Medical records are hosted PDFs, so they go up as their pre-signed URLs, which
CORA fetches and reads itself. This is why records now yield findings.

**Auth is an API key**, attached server-side in `src/setupProxy.js` so it never
enters the browser bundle. Dev-only — see Deployment below.

---

## 4. Running it

```bash
git fetch origin
git checkout correlation-agent-beta
npm install --legacy-peer-deps
# .env.dev needs: CORA_API_KEY=<key>   (ask the team; never commit it)
npm run start:dev
```

Then in the browser console, once:
```js
localStorage.setItem("correlationAgentDemo", "on")   // reload
```

Reach it via the SmartRx dropdown → **Voice Rx** → the **Correlation** rail item.
Production build (craco, raised heap): `CI=false NODE_OPTIONS=--max-old-space-size=8192 npx craco build`.

Demo patient with data on file: **Sandy Testing** (or **Shyam Correlation, PAT0889**).

---

## 5. Where the code lives

```
src/pages/correlation-agent/
  components/   drawer (picker, reading, result), Sankey, entry cards, Rx card, Know More
  data/         coraClient.js (v2 client), demoRun.js (runtime store), runStore.js
                (pad publish/subscribe), entryPoints.js, mockBackend.js (the Beta gate)
src/setupProxy.js   dev proxy to CORA, attaches the API key
```

Host wiring touched: `SideNavbar.jsx` (rail item, drawer mount, patient prop),
`DiagnosisBox.js` / `InvestigationBox.js` (the Rx card), `PrescriptionNew.jsx`,
`ConsultationLayout.js`, `UploadDocument.js` (upload fixes).

---

## 6. Integration notes — read before merging

1. **Rebuilt RxPad boxes.** Prod has since rebuilt the Diagnosis/Investigation
   boxes on Tesseract (`{BODY_CONTENT}`). This branch carries the *tested older*
   structure for those two files. The correlation **card that appears inside the
   prescription pad** needs re-fitting into prod's new box. Everything else — the
   rail entry, drawer, picker, live v2 call, Sankey, detail panel — is
   self-contained and drops in as-is.
2. **Deployment.** The API key is attached by the dev server (`setupProxy.js`),
   which only exists under `npm run start:dev`. A deployed UAT/prod build has no
   dev server, so **production needs a small backend route** that holds the key
   and proxies `POST /api/v2/patient-analysis`. Do **not** move the key into a
   `REACT_APP_*` variable — that compiles into the JS every visitor downloads.

---

## 7. Known gaps / backend asks

- **No per-hypothesis confirming tests.** The v2 `Hypothesis` object has no
  "tests to confirm" field, so the "add a lab test" action on a pattern is empty
  on a live run. The frontend already supports it — it just needs the backend to
  return a `suggested_tests` (or similar) array per hypothesis. Until then the
  panel shows *What would change this* (the API's `alternatives_not_ruled_out`)
  and the run's *Open questions*. We deliberately do **not** fabricate tests
  client-side.
- **Records show no abnormal count before a run**, because nothing is extracted
  until CORA reads the PDF. Correct, not a bug.

---

## 8. Conventions

- **AI gradient is a token:** `var(--tesseract-gradient-ai-hero)`. Never hand-roll it.
  It marks the CTAs that *open* the agent; the doctor's actions (Add to Rx, Done,
  hover/focus states) take the product **blue**.
- **Beta is a warning-gradient tag** (Tesseract Badge `variant="gradient"
  color="warning"`), shown on the rail icon, the panel heading, and the drawer
  header (whose info popover says it's a limited trial and the output is decision
  support, not a diagnosis).
- **No normal tagging.** Cards say what is on file, never a verdict reached before
  anything was read.
- **State colour is stated, never inherited** — the app ships a global
  `body span { color: … !important }` that repaints spans relying on `currentcolor`.

---

## 9. Status

| Area | State |
|---|---|
| Rail entry, drawer, picker | Verified live |
| Live v2 call → Sankey | Verified live end to end |
| Detail panel (click a card) | Verified live |
| Rx card in the pad | Works on this branch; needs re-fit to prod's rebuilt box |
| Per-hypothesis confirming tests | Empty — backend field needed |
| Deployed (non-dev) live call | Needs a backend proxy route |

---

## 10. Commit

This branch is a single squashed commit on top of `prod`, so it can be
cherry-picked or reviewed as one unit. Commit subject:

> **feat: Correlation Agent (Beta) — full feature on top of prod**

Pushed to `origin/correlation-agent-beta`. Nothing was pushed to prod or UAT.
