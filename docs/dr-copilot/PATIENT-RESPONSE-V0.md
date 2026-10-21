# Patient response V0

Decision proposal · 19 October 2026

## Current V0 taxonomy

Three top-level tabs with ten catalog examples:

| Category | Patient questions | Body format |
|---|---|---|
| Summaries and Histories | Patient summary; medical history; visit summary; visit history | Situation/Background/Assessment/Last Visit; focused history rows; complete source-written visit sections and expandable timeline |
| Trends | Vital trends; lab trends | Latest measurement, line/bar graph, table alternative |
| Data Table | Current medications; medication history; lab records; vital records | Dated records with units/instructions and citations |

There is no Clinical category, standalone Medication summary or Allergies summary, visit-comparison card or separate lab-comparison card. Comparison is part of trends. Other requests retain the existing cited Markdown body when no supported structured format applies.

The Patient overview has exactly **Situation → Background → Assessment → Last Visit**, omitting empty sections. Situation begins with documented demographics and available clinical facts. Background includes historical domains and current medication context: explicit ongoing statements first, otherwise prescriptions whose validated course covers the review date. Assessment contains latest vitals and latest key labs only. The fourth Last Visit section contains only the dated SX | DX | RX recap; there is no duplicated history disclosure.

Use the [exact generation prompt and JSON skeleton](./PATIENT-SUMMARY-PROMPT.md) and [backend content contract](./CONCISE-SUMMARY-BACKEND.md). These are the authoritative current specifications. Earlier catalog concepts and source-reference designs do not override them.

Visit summary and expanded Visit history preserve every available source-written prescription section, including complete medication instructions and original recorded notes/plans. They do not generate new recommendations. Medical history remains a focused history view, not a prescription-history table.

Tesseract SectionCard, DataTable, SegmentedControl and icons compose the body inside the actual Velora ChartAnswerCard. Its optional body renderer preserves the header, collapse behavior, Citation component, gray EvidenceSection and existing evidence drawer. Main summary bars are compact and gray, with unboxed icons. Vitals use a lighter inline tag with a short date inside parentheses; key labs keep dates in evidence.

The gallery at `/copilot-v0` uses isolated synthetic fixtures. Live patient generation is unchanged. Source-scenario controls are review tools, not clinical completeness labels. Specialty adapters still require validated source fields; their future history rows follow the same content contract.

## Trend rules

- Render the server’s structured chart data, never values extracted from arbitrary Markdown.
- Separate measurement identity, panel and unit. Display units, dates and the requested time scope.
- Use real temporal spacing and straight connections. Do not interpolate, fill missing readings with zero, or join across backend-disallowed segments.
- Require at least two valid comparable points. Show the available record for one point and an explicit empty state for zero points.
- Preserve questionable or unplottable records in the data view with their issue; exclude them from calculations unless the backend marks them usable.
- Respect `segments`, limitations, duplicate-date ordering and explicit missing data. Do not infer chronology for unordered same-day observations.
- Show factual change only. “Improved”, “worsened”, target ranges, baselines and clinical interpretations require separately supported clinical content.
- Every plotted point and table row must lead to its evidence. Provide an accessible data table for all observations.

The existing `LabTrendsCard` must not be reused unchanged: its index alignment and missing-value-to-zero behavior are unsuitable for these live chart records. The isolated review gallery uses dated, single-measurement series instead.

## Table rules

**Lab records:** show test and recorded value/unit only in the table. Put the shared result date in short form in the card heading. Keep reference ranges, flags and source provenance in the evidence record, not table columns or explanatory copy. Default to a bounded visible set, with a clear “show all N” control. Do not omit abnormal values silently or invent reference ranges.

**Comparison:** previous value/date, latest value/date, and factual delta only when identity and units match. Use percentage points for a difference between percentage measurements. An absent previous value has no calculated delta.

**Prescriptions:** medication, strength, recorded schedule, duration, prescription date and citation. The current-window example checks inclusive start/end dates against today in Asia/Kolkata; a 30-day course starting 22 September ends 21 October. Exclude expired, future, explicitly stopped and superseded courses. Unknown or conflicting instructions require reconciliation, not an active-use claim. Medication history retains previous courses and does not imply uninterrupted treatment. Keep original instructions accessible. “Latest recorded prescriptions” is safer than “current medications” unless active status is explicitly established. Prescription date, duration or absence from a later visit do not establish adherence, discontinuation or current use.

Only include validated selected records. The live API returns retrieved but uncited rows in `evidence[]`; displaying that entire array would add material the answer did not select.

## Questions that remain Markdown

| Intent family | Examples | V0 handling |
|---|---|---|
| Unsupported history details | Unstructured family/social history; prior procedures | Cited Markdown within Summary if structured section data cannot be validated |
| Diagnoses, symptoms and allergies | Conditions recorded; symptom timeline; conflicting allergy entries | Cited Markdown with uncertainty and dates |
| Visit details without validated structure | Consultation; follow-up instructions | Cited Markdown within the selected visit summary |
| Interpretation and clinical advice | Why a value changed; drug suitability; treatment choice | Existing backend behavior and citations; no generated chart or treatment card merely because a keyword matches |
| Unclear, mixed or unsupported asks | Ambiguous time scope; incomplete records; unavailable reports | Clarification or original answer in the existing shell |
| No relevant data or service failure | Empty result; backend timeout | Honest no-data/error state; never substitute synthetic patient data |

Backend tools currently cover history, prescriptions, labs, vitals, visits, record search/read, and patient summaries. These are data capabilities, not a complete stable intent enum. Do not create a separate UI component for every tool or phrasing.

## What the live research established

Eight patient-scoped questions were tested on 19 October 2026 against `pm-copilot-preprod.tatvacare.in`, using two authorized indexed patients. Patient A had three visits; Patient B had 45. No patient discovery questions or clinical record mutations were performed. This is a small structural audit, not a clinical correctness evaluation or usage-frequency study.

| Ask | Answer words / lines | Response time | Live structure |
|---|---:|---:|---|
| Concise patient summary | 461 / 28 | 21.2 s | Markdown only |
| Explicit SBAR summary | 312 / 16 | 17.5 s | Markdown with four SBAR sections |
| Weight trend | 556 / 65 | 7.7 s | Markdown plus chart with 29 points |
| Fasting glucose trend | 73 / 9 | 12.5 s | Markdown plus chart with 3 points |
| Latest labs, compact table requested | 908 / 62 | 19.7 s | Prose/list; no Markdown table |
| Latest versus previous glucose | 65 / 6 | 11.8 s | Markdown only |
| Current/latest recorded medications | 217 / 13 | 17.1 s | Markdown with current-use qualification |
| Brief medical versus family history | 138 / 12 | 13.2 s | Markdown, including a table |

All eight asks returned HTTP 200, `mode: patient`, `response_kind: answer`, and resolved cited references. None returned `ui`. Trend point references also resolved. The summary returned 122 evidence rows but cited only 23; the medication answer retrieved 30 rows but cited three medicine records. Selection must therefore be driven by citations and expected record kind.

Authentication and dependency health worked. Three name-lookup probes returned HTTP 500. Known indexed-patient starters and sessions worked; one older patient identifier returned 404. The lookup issue is a backend limitation to resolve separately, not a reason to fall back to mock data in a live conversation.

Raw responses, identifiers and credentials remain in owner-only local research storage outside Git. This document intentionally contains no patient names, IDs, source excerpts or tokens.

## Reference catalog and differences

The [Dr.Agent response-system catalog](https://dr-agent.vercel.app/tp-appointment-screen/scenarios) contains summary, last-visit, lab-panel, lab-trend, vital-trend, comparison and medication-history patterns. Its shared card anatomy is a useful reference: stable shell, concise body, evidence access and progressive detail.

The catalog is a design reference, not proof of deployed backend capabilities. Its older “Agent V0 Scope” excludes free text and trends; this proposal deliberately defines a new patient-chat V0 based on the current request. It also uses varying summary/type names and counts, so the implementation should use one explicit versioned contract instead of copying every catalog variant.

## Backend and frontend contract

Observed live envelope: `answer`, `interpretation`, `response_kind`, `mode`, `evidence`, `coverage`, `cited_source_refs`, `available_source_refs`, `unresolved_citations`, and optional `charts`, suggestions and timings.

Observed chart fields: `title`, `panel`, `unit`, `points`, `segments`, `point_count`, `change`, `limitations`, `scope`. A point includes `source_ref`, date/time, numeric coordinates, original value, unit, reference range, flag/issue and visit metadata. Validate these before rendering.

Local backend source at `search/ui_spec.py` defines `doctor-agent.ui.v1` with a `Response` root, `ClinicalCard`, and `Narrative`, `Measurements`, `Prescriptions`, `Trend` elements. Its rows resolve validated source references. This capability was **not present in any sampled live response**. A structured patient-summary element is not part of that current contract.

Current portal integration gaps:

1. `chart-search/copilotReplyShapes.js` preserves Markdown and evidence but drops `result.charts` and `result.ui`.
2. `chart-search/copilotActivity.js` handles activity/answer events, not a final structured body.
3. `cards/clinical/ChartAnswerCard.jsx` defaults to Markdown for live callers; the new opt-in custom body is currently used only by the gallery.
4. The summary starter has intent metadata, but `askCopilot` currently sends only the question/session/parent request. The backend accepts an explicit `patient_summary` hint under its starter contract; arbitrary intent strings should not be added to the API.
5. The backend summary prompt intentionally does not enforce a length budget. A concise prompt alone did not produce a compact response in the audit.

Proposed adapter behavior:

1. Preserve the original answer and all provenance, plus structured fields, through fresh, streamed-final and restored-session flows.
2. Classify patient intent using server metadata or an agreed contract. Treat client keyword matching as a hint only.
3. Validate schema version, record kind, selected source references, units, dates and cardinality.
4. For supported trends, adapt the existing live `charts[]` payload first.
5. For tables, deploy/verify the source-resolved `ui` contract or agree an equivalent validated record-selection payload. Do not scrape prose into clinical rows.
6. Add a versioned summary payload with source-linked section items and dates. Generate concise content on the backend; keep the full original answer available.
7. Render only supported validated bodies. For unknown versions, unsupported intents, incomplete selection or validation failure, retain the original cited Markdown within the same shell.

Mixed answers should stay Markdown initially rather than arbitrarily dropping portions to force one template. During streaming, show progress; switch to a clinical structured body only after the final payload passes validation. Synthetic examples must never enter a live patient response path.

## Delivery sequence and acceptance

| Stage | Deliverable | Acceptance |
|---|---|---|
| Research and review — implemented locally | Live-authenticated proxy; this scope; separate synthetic gallery at `/copilot-v0` | Live auth succeeds, observed response shapes documented, gallery interactions work |
| Live trends | Preserve and validate `charts[]`, add chart/table body | Point/citation alignment, true date axis, valid segments, no fabricated values; fresh and restored answers agree |
| Record tables | Verified structured measurement and prescription selection | Cited rows only, original instructions preserved, units/dates visible, no inference of current medication use |
| Compact summaries | Backend source-linked Situation/Background/Assessment/Last Visit payload, including reconciled current medication context | Clinician reviews coverage, conflicts and omissions; missing content never invented to fill a section |
| Rollout | Feature flag and aggregate measurement | Track intent family, chosen renderer, fallback reason, latency and expansion rate without logging patient text or credentials |

Required cases before enabling live structured bodies: unknown schema, missing/unresolved citations, retrieved-but-uncited rows, zero/one/many points, mixed units, duplicate dates, missing dates, questionable values, backend gaps, conflicting status, partial streams, session restoration, timeout and no relevant data. Check keyboard operation and narrow-screen overflow as well as visual appearance.

## Local implementation and preview

The current branch is `dr-copilot-uat-next`. `src/setupProxy.js` reads an optional `COPILOT_TOKEN_FILE` on the Node side and adds the bearer header only to the existing Copilot proxy. The JWT is not embedded in source or a `REACT_APP_*` value. The running preview binds to loopback port 3012, with live mode enabled. Browser overrides from an earlier demo can be cleared through the existing `?veloraMock=0` application flag.

Restart with the existing ignored `.env.dev` configuration and a private credential path:

```bash
PORT=3012 HOST=127.0.0.1 BROWSER=none DISABLE_ESLINT_PLUGIN=true \
GENERATE_SOURCEMAP=false REACT_APP_VELORA_DEMO=false REACT_APP_COPILOT_TOKEN='' \
COPILOT_TOKEN_FILE="$HOME/.codex/private-credentials/pm-copilot-research-token" \
npx env-cmd --no-override -f .env.dev craco start
```

Keep this authenticated development proxy local; it is not a production authentication design. Live cards remain on the existing Markdown pipeline in this research delivery. The new gallery has isolated synthetic fixtures and uses the shared `ChartAnswerCard`, `Citation`, evidence drawer, icons and a separate date-based chart body. It demonstrates four summary/history views, two trend views, and four record tables, with the existing citation/evidence components.

The patient response prototype is published through the personal `shyamgrdesign2-dot/TP_Shyam_design` preview repository. See [the consolidated response-system specification](./PATIENT-RESPONSE-SYSTEM-SPEC.md) for current intent, data-source and formatting rules across summaries, trends and tables.

Verification: targeted fixture/citation tests, prescription-window and statement-precedence tests, ESLint and diff checks pass. The catalog has ten examples under Summary, Data analytics and Data tables. Source-scenario controls remain outside the answer. The overview has Situation, Background, Assessment and a short Last Visit; current medicines are included by source statement or eligible date window. Clinical source adapters and live structured generation remain backend work.

### Patient chat in the catalog

`/copilot-v0` is a synthetic sandbox, including the global Velora chat, even
when an older bookmark includes `veloraMock=0`. The route override is not
stored: leaving the catalog restores the existing live/explicit-demo setting.
Conversation state is remounted at that boundary; starters and conversations
use separate demo and live storage namespaces.

Today's demo picker includes six appointments with distinct clinical fixtures.
Other synthetic patients are searchable. A selected appointment with a different
ID is assigned a stable demo scenario, retaining its selected name and any
provided demographics; absent demographics are omitted. This is synthetic
scenario data, not retrieval or indexing of that person's real chart. Only its
identity mapping is kept in tab session storage. The prototype omits demo labels from the chat UI; this documentation identifies the fixture source.

Patient-summary replies reuse RecordedSbarBody inside the existing ChartAnswerCard,
with Situation, Background, Assessment and Last visit. Latest measurements are
selected by date and lab name; unavailable sections are omitted. Prescriptions
without a current-course/ongoing-use source stay in the dated Last visit section.
All evidence is bound to the selected patient ID. Suggestions are based on the
demo chart's available record types and use the same patient session. Live API
errors never fall back to these synthetic responses.
