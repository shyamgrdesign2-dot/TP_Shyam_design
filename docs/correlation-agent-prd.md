# Correlation Agent — PRD

**Status:** Beta · prototype on branch `CorrelationAgent`
**Owner:** Design (Shyam)
**Last updated:** 27 Aug 2026

---

## 1. The problem

A doctor reads lab reports one at a time. Each report answers its own question and
is filed away. Nothing in the product ever asks the question that sits *between*
them: does the raised ALT on Monday have anything to do with the reactive Widal on
Tuesday, and does the normal ultrasound rule either of them out?

That reading-across is real clinical work, it is slow, and it is skipped under
time pressure. Differential Diagnosis (DDx) already exists in the pad, but it works
forwards from typed symptoms. Nothing works backwards from the patient's own
measured results.

## 2. What it does

The Correlation Agent reads a patient's reports **against each other**, proposes
links between findings, **argues against every link it proposes**, and shows only
what survived the challenge.

The output is a three column diagram:

```
lab results  →  relationship  →  possible pattern
```

- **Lab results** — what the reports said. Out of range in red with a direction arrow.
- **Relationship** — what those values mean together. Each carries a mechanism, a
  counter-argument, and an evidence grade (Strong / Moderate / Low / Speculative).
- **Possible pattern** — the service's hypotheses. Disease-name-free by a backend
  guardrail, so these are patterns and possibilities, never a named diagnosis.

A claim is never stronger than the link beneath it. A relationship weakened by its
own challenge drags down every pattern resting on it.

## 3. Beta

**This ships with a `Beta` tag in the Rx pad rail, beside the Correlation item.**

The tag is not decoration. The agent is a prototype: it calls a UAT service, the
labels are decision-support phrasing rather than diagnoses, and several flows are
unverified (see §9). A doctor needs to know that before leaning on what it says.

The feature is additionally gated behind a localStorage flag, so it does not exist
for any patient unless deliberately switched on:

```js
localStorage.setItem("correlationAgentDemo", "on")
```

## 4. Entry points

The agent is reachable from **five** places. All resolve through
`data/entryPoints.js`, which decides what each surface may honestly claim.

| # | Entry point | Where | What it seeds the picker with |
|---|---|---|---|
| 1 | **Lab Results** section | Rx pad rail | That section's reports |
| 2 | **Medical Records** section | Rx pad rail | That section's documents |
| 3 | **Correlation** rail item | Rx pad rail, directly after Lab Results | Everything on file |
| 4 | **Patient bar** | Rx pad header | Everything on file |
| 5 | **Diagnosis box** | Rx pad, replacing DDx once a run exists | The published run |

The **seed** and the **gate** are deliberately different questions. The seed comes
from the section the doctor invoked from, because that is what they were looking at.
The gate is about the patient: correlation reads across the whole record, so the
offer stays available even from a section holding a single report.

**Gate:** two or more eligible reports. Not two modalities — LFT, KFT and Widal are
three separate reports and reading across them is exactly the job.

**Availability in the prototype.** The agent is currently reachable only through
the **VoiceRx new-UI pad** (SmartRx dropdown -> Voice Rx). The other entry points
listed above are wired but not yet switched on from the normal SmartRx click flow.
That is a deliberate prototype scope, not a limitation of the feature: the same
rail and drawer should be enabled from the standard click pad next, so a doctor
who never opens VoiceRx can still reach it. **Developer task:** enable the
Correlation rail item in the standard prescription pad, not only the VoiceRx one.

## 5. The flow

**1 · Choose reports.** A picker grouped into Lab results and Medical records.
Each tile names the panel, its date, its modality, and how many parameters it holds.
Out-of-range counts show in red; nothing shows a "normal" verdict, because no
reading has happened yet. Prescriptions are listed but ineligible.

Defaults to the most recent **episode**, not the most recent day: a workup runs over
two or three days, and selecting only the latest date silently drops half of it.
Search and date filters steer both sections at once. Two rows show, then "Show N more".

**2 · Reading.** The agent's mark turns above an indeterminate gradient bar and a
single line naming the current stage. Indeterminate because the service reports
stages, not a percentage; a filling bar would invent progress.

**3 · Correlation.** The diagram, plus what the run could not settle:
open questions, whether it converged, and a clinician-review disclaimer.

**4 · Into the prescription.** The third column holds the service's **hypotheses**,
which a backend guardrail guarantees carry no disease name. They are therefore
patterns and possibilities, not diagnoses, and must not be written verbatim into a
diagnosis field as if they were. **Developer task:** the Add-to-Rx action should
route these to clinical notes rather than the diagnosis field.

## 6. How it works

```
picker selection
  → buildRequest(): labs as text, records as file URLs   (data/coraClient.js)
  → POST /cora/v2/patient-analysis                        (one SSE connection, via setupProxy.js)
  → service fetches + OCRs files, extracts findings, reasons
  → final_result adapted into chart shapes               (adaptRun)
  → applyLiveRun() populates the runtime store           (data/demoRun.js)
  → chart + Rx card re-render                            (data/runStore.js)
```

**Live, on the real patient.** There is no fixture. The labs go up as structured
text and the medical records go up as their hosted file URLs, which the service
fetches and OCRs. `src/setupProxy.js` proxies the call in development and attaches
the API key server-side. Without the key the proxy does not mount and `isLive()`
disables the run.

**Publishing to the pad.** The run is published through `runStore.js`, which the
Diagnosis and Investigation boxes subscribe to, so the card appears the moment a run
lands rather than on the next unrelated re-render.

> **Live CORA returns no investigations**, so the "confirm with" tests do not appear
> on a live run.

## 7. Colour and semantics

| Meaning | Treatment |
|---|---|
| Out of range | Red, with a direction arrow |
| In range | Neutral. Never a green "normal" badge |
| Strong / Moderate / Low / Speculative | Green / amber / red, one scale across columns 2 and 3 |
| The agent's own voice | Violet, and `var(--tesseract-gradient-ai-hero)` on CTAs that open it |
| The doctor's action | Product blue (Done, Add to Rx) |

Full contract: `src/pages/correlation-agent/RULES.md`.

## 8. Non-goals

- **Not a diagnosis.** Decision support for clinician review.
- **OCR runs on the service, not here.** The v2 endpoint fetches and reads the
  report files itself, so medical records now produce real findings. The picker
  still cannot show an abnormal count for a record before the run, because nothing
  is extracted until the service reads it, so a record reads "Read when correlated".
- **No AI-written content on ward or patient cards.** Raw backend data only.
- Not multi-patient, not a cohort tool, no history across visits.

## 9. Status

| Area | State |
|---|---|
| Chart, picker, loader | Verified in the running app |
| Rx card swap | Mechanism verified; not watched in the real pad |
| Clean clone, no proxy | Verified — isLive() refuses the SPA 200, run is disabled cleanly |
| Live CORA | Wired, dormant. Adapter verified against a real response |
| Upload Submit | **Untested** end to end |
| Entry points | **Untested** — five exist, only the harness exercised |

**Usability sweep done:** zero / one / all selected, search with no matches,
run → change reports persistence, records-only, show more and less.
**Not swept:** the click-pad entry points, a patient with a single report, a records-heavy run.

## 10. Open questions

1. **Inputs.** Dr Vipun's substantive question: should the agent read only lab
   reports and uploaded records, or also family history, medical history, current
   diagnosis, symptoms and age? He expects the result would be sharper. This is the
   largest open product decision.
2. **Extraction.** Medical records contribute nothing until OCR exists. Who owns it,
   and does it run at upload or at correlation start?
3. **Confidence display.** Does Strong / Medium / Low read as calibrated to a
   clinician, or does it imply more precision than the model has?
4. **Repeat usage.** A single trial tells us little. Does the pilot need an incentive
   to see whether doctors come back to it?

## 11. Validation so far

Two of the heaviest DDx users were approached (200+ and 189 DDx in three months).
One walkthrough, one who could not join. The honest read: we have interest in the
concept, no validation of output quality, and no signal on repeat use. Both asked
for the same thing without prompting — enable it and let them use it on their own
patients.

---

## Appendix — running it

```bash
git fetch origin && git checkout CorrelationAgent
npm install --legacy-peer-deps
npm run start:dev                      # needs a local .env.dev
```

```js
localStorage.setItem("correlationAgentDemo", "on")   // then reload
```

Production build (craco, not react-scripts, and needs a raised heap):

```bash
CI=false NODE_OPTIONS=--max-old-space-size=8192 npx craco build
```

Demo patient: **Shyam Correlation, PAT0889** (`patient_unique_id 1096320180244`),
loaded in UAT with 30 real lab tests across two report dates.

**Deployment.** The API key is attached by the CRA dev server (`setupProxy.js`),
which exists only under `npm run start:dev`. A deployed UAT/prod build has no dev
server, so the live call will not work there until a real backend route holds the
key and proxies `POST /api/v2/patient-analysis`. Do not move the key into a
`REACT_APP_*` variable: anything with that prefix is compiled into the JS every
visitor downloads.

See `CORRELATION-AGENT.md` in the repo root for the full developer setup, the traps,
and the two upload fixes that reach beyond this feature.
