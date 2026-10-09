# Correlation Agent — prototype

An agent that reads a patient's reports **against each other**, argues against every
link it proposes, and shows only what survived. The output is a three column
diagram: **lab results → relationship → diagnosis**. Candidate diagnoses can be
recorded straight onto the prescription, and recording one reveals the tests that
would confirm it.

This is a working prototype, not a shipped feature. It is gated behind a
localStorage flag, so it does not exist for any patient unless switched on.

| | |
|---|---|
| **Branch** | `CorrelationAgent` |
| **Remote** | `origin/CorrelationAgent` |
| **Base** | `prod` |
| **Commits ahead of prod** | 15 |
| **Diff vs prod** | 80 files, +22,982 |
| **Head** | `2e8e041aa` |

---

## Get it running

```bash
git fetch origin
git checkout CorrelationAgent
npm install --legacy-peer-deps
npm run start:dev
```

`npm install` needs `--legacy-peer-deps` on this repo. `npm run start:dev` expects a
local `.env.dev`; copy one from another branch you already run.

Then in the browser console, once:

```js
localStorage.setItem("correlationAgentDemo", "on")
```

and reload. **Without this flag no Correlation surface renders anywhere.**

### There is no backend to stand up

The chart runs entirely on a fixture bundled in the repo. No mock server, no proxy,
no CORA session. What *does* come from your normal environment is the patient's Lab
Results and Medical Records, read through the existing APIs.

---

## Two ways in

**1. `/correlation-x`** — a standalone harness. No patient, no visit, no flag
dance. Fastest way to see the whole flow end to end.

**2. The Rx pad rail** — the real product surface. A `Correlation` item appears in
the left rail directly after Lab Results. This requires the VoiceRx new-UI flow
(`PrescriptionNew`, behind the GrowthBook flag plus `location.state.isVoiceRxNewUiFlow`),
so it is not reachable from every route into the pad.

### Demo patient

**Shyam Correlation, PAT0889** · `patient_unique_id 1096320180244`

30 real lab tests are loaded on this patient in UAT across the two genuine report
dates, so the picker shows seven named panels: LFT (10), KFT (5), Widal (4) on
10 Jul; CBC (7), CRP (1), Dengue Panel (2), malarial parasite smear (1) on 09 Jul.

---

## Building

The project builds through **craco**, not react-scripts, and needs a raised heap:

```bash
CI=false NODE_OPTIONS=--max-old-space-size=8192 npx craco build
```

Without the heap flag this dies with `Ineffective mark-compacts near heap limit` on a
16 GB machine. Note `npm run build` also chains `sentry:sourcemaps`, which uploads
externally — skip it for a local compile check.

---

## Live CORA (optional, off by default)

The agent can call the real CORA correlation service instead of the fixture.

```bash
# .env.dev
CORA_SESSION=core_r_agent_session=<value>
```

CORA has no CORS allowlist and authenticates by a cookie scoped to its own domain,
so the browser cannot call it directly. `src/setupProxy.js` forwards `/cora` to their
`/api` in development, attaches the session server-side, and strips `set-cookie` from
responses so the credential never reaches client JS.

Without the variable the proxy does not mount and the agent stays on the fixture.

> **Live CORA returns no investigations.** The confirmatory tests shown under each
> diagnosis are fixture data. On a live run that section is correctly empty. Know
> which path you are demoing.

---

## Where the code lives

```
src/pages/correlation-agent/
  components/     drawer, chart, entry cards, Rx card, Know More
  data/           demoRun.js (fixture), coraClient.js, runStore.js,
                  entryPoints.js, mockBackend.js (the gate), uploadAutoPick.js
  RULES.md        the colour + semantics contract — read before restyling
src/setupProxy.js dev proxy to CORA
```

Touched outside the feature: `SideNavbar.jsx`, `DiagnosisBox.js`,
`InvestigationBox.js`, `PrescriptionNew.jsx`, `ConsultationLayout.js`,
`medicalRecords/UploadDocument.js`.

---

## Fixes here that reach beyond the agent

**Please review these two — they affect uploads generally, not just this feature.**

1. **Record Type rendered "No data" in the new pad, and it is a mandatory field**, so
   Submit could never enable and *no upload from that pad could complete*. The reducer
   destructures `{ categories, isChikitsalayAccessable }`, but `PrescriptionNew` and
   `ConsultationLayout` dispatched the bare array. `Prescription.js`,
   `SmartPrescription.js` and `AppointmentData.js` all pass the correct shape, which
   is why this worked in the old pad and not the new one.

2. **Neither host passed `patientData` to `UploadDocument`**, which resolves as
   `state?.patient_data || patientData` and otherwise falls back to **id 0**: it then
   skips fetching the patient's documents and posts the upload against nobody.

Also: lab values were parsed with a first-number match, so the Widal titre `1:320`
read as `1`; and a day of lab results arrives as one dated entry holding every test,
so the picker showed anonymous "Lab results, 10 Jul'26" tiles where the doctor had
ordered an LFT, a KFT and a Widal.

---

## Conventions worth keeping

- **The AI gradient is a token**: `var(--tesseract-gradient-ai-hero)`. Never hand-roll
  it — it was rebuilt by eye twice during this work and both attempts were wrong. It
  marks the CTAs that *open* the agent; Done and Add to Rx keep the product blue.
- **Icons come from the CDN by verified path.** `essential/edit.svg` 404s; the edit
  glyph lives in `content-edit`. A wrong path renders an invisible blank, no error.
- **State colour is stated, never inherited.** The app ships a global
  `body span { color: … !important }` that repaints every span, so anything relying on
  `currentcolor` silently loses its colour.
- **No normal tagging.** Cards say what is on file, not a verdict reached before
  anything was read. An abnormal count on a medical record is unknowable anyway until
  something extracts the PDF.

Full contract in `src/pages/correlation-agent/RULES.md`.

---

## Traps

> **`POST /api/v1/lab-parameters/results` is not a per-date upsert.** The `results`
> array you send becomes the patient's **entire** lab history. Posting one corrected
> date silently deleted the other. Always send the full set, and read back after every
> write.

> **Two "Change reports" buttons exist in the drawer** (entry card and header). Scope
> any selector to `[class*="headActions"]` or you will drive the wrong one.

---

## Status — what is and is not verified

| Area | State | Notes |
|---|---|---|
| Chart, picker, loader | Verified | Measured in the running app |
| Rx card swap | Mechanism verified | Event channel + hook scope confirmed; not watched in the real pad |
| Clean clone, no proxy | Verified | Chart renders from fixture, console clean |
| Live CORA | Wired, dormant | Adapter verified against a real response; needs a session cookie |
| Upload Submit | **Untested** | Record Type was the blocker and is fixed; end to end never run |
| Entry points | **Untested** | Five sources exist; only the harness was exercised |

**Usability sweep.** Verified: zero / one / all selected, search with no matches,
run → change reports persistence, records-only, show more and less. Not swept: the
five entry points, live versus fixture, and a patient with only one report on file.

---

## Commit history (this session's 9, newest last)

| SHA | Commit |
|---|---|
| `449c41f82` | feat(correlation): live CORA client behind a dev proxy |
| `640987f36` | data(correlation): rebuild the fixture from the patient's three real reports |
| `4444791c2` | design(correlation): make the chart read as a clinical argument |
| `6b8731a07` | fix(correlation): drawer header, loader, row cap and picker honesty |
| `0e2c5209f` | design(correlation): entry cards say what is on file, and use the real AI gradient |
| `7278b0b01` | fix(correlation): the Rx card now appears the moment a run lands |
| `c423fe2bb` | fix(records): upload from the agent, and repair Record Type in the new pad |
| `824cfd4f3` | docs(correlation): record the colour contract and the fixture invariants |
| `2e8e041aa` | fix(correlation): the branch must run on a clean clone with no proxy |

Each commit is self-contained and explains its reasoning in the message body;
`git log` is worth reading before the diff.
