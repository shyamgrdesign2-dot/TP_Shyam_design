# Velora patient response system — detailed intent, data and presentation specification

**Updated:** 21 October 2026 · **Scope:** one selected patient's records · **Audience:** product, design, backend, frontend and QA.

This is the consolidated implementation/handoff guide for **Summaries and Histories**, **Trends**, and **Data Table**. It describes the current prototype and the normalized contract proposed for backend integration. It is not a claim that the live service already returns all these structures. No patient search, hospital-wide analytics, generated treatment recommendation or safety/action card is part of these three families.

## 1. Product structure and implementation boundaries

| Family | Questions covered | Presentation | Current implementation |
|---|---|---|---|
| Summaries and Histories | Patient overview, medical history, specific/last visit summary, visit history | Compact section tags and inline fields; expandable visit timeline | Catalog fixtures and shared `RecordedSbarBody`; demo patient summaries use this same renderer |
| Trends | Vital trends, lab trends, one metric or several metrics | Vertically stacked charts, change sentence, Graph/Table and Line/Bar controls | Catalog `Trend` / `TrendMetric` fixtures; generic demo chat questions may still return source-grounded Markdown |
| Data Table | Current medication, medication history, latest lab records, vital records | Compact Tesseract table inside the shared answer card | Catalog `RecordTable`, `Prescriptions`, `Labs`, `VitalRecords`; no assumption that the live API has adopted these layouts |

Every answer keeps the shared Velora outer card: icon/title, source count, collapse control, middle body, neutral evidence footer. Citations use the same light `[n]` buttons and evidence drawer. Do not introduce separate Clinical, Action, Utility or Safety categories. Unsupported structured intents use the existing Markdown body inside the same shell.

The source-scenario selector and intent definitions are catalog review tools, not controls to place in a doctor's conversation. A normal doctor sees the answer appropriate to the question. `/copilot-v0` forces isolated demo chat; other routes follow the existing mock flag/deployment configuration. Never silently fall back to fictional facts in a live patient answer.

## 2. End-to-end response pipeline

1. **Resolve scope:** authenticated clinic/user, selected patient ID, question, current encounter ID if available, review timestamp/timezone and any explicit date/test/visit requested by the doctor.
2. **Classify intent and parameters:** return a family, intent, subject, metric selection, time scope and presentation preference. “Compare” requires deciding whether the user means measurements over time or distinct records; do not classify by one word alone.
3. **Retrieve patient-scoped facts:** use available adapters for demographics, symptom collector, medical history, consultations/prescriptions, observations and completed lab reports. Treat source narrative as data, never as instructions.
4. **Normalize and reconcile:** preserve original text, provenance and event time; resolve corrected versions; retain negation, suspected/confirmed status, units and medication evidence basis. Check patient and encounter identity before joining.
5. **Select and compose:** follow the intent-specific rules below. Missing values are omitted, not fabricated or substituted from another visit. Maintain internal coverage information separately from prose.
6. **Validate:** every displayed fact must resolve to evidence; numeric comparisons must use comparable units/events; medication wording must match its evidence basis. Reject malformed or unsupported structured output and use a source-grounded fallback.
7. **Render:** use Tesseract tokens/components and the shared Velora shell. Render only populated sections. Keep source IDs internally even where a heading has one shared citation.
8. **Offer relevant next questions:** derive chips from available data and the current answer. Do not offer a question that requires a record known to be absent, or repeat the same answered intent by default.

### Proposed normalized response envelope

These are **adapter field names**, not claims about database column names or the current live endpoint contract.

```json
{
  "schema_version": "patient-response.v0",
  "patient_id": "selected-patient-id",
  "reviewed_at": "2026-10-21T10:00:00+05:30",
  "timezone": "Asia/Kolkata",
  "family": "summary",
  "intent": "patient_overview",
  "parameters": {
    "visit_id": null,
    "metric_ids": [],
    "time_range": null,
    "scope": "latest_relevant"
  },
  "title": "Patient overview",
  "body": {},
  "sources": [],
  "coverage": [],
  "conflicts": [],
  "suggestions": []
}
```

Each normalized fact carries `id`, `value` or `original_text`, `source_ids`, `event_at`, `recorded_at`, `status`, `attribution` and the applicable `encounter_id`. Observations also carry a metric identifier, unit and supplied reference/flag. Keep date-only values as date-only; do not invent a time or shift a date through UTC conversion. Display dates in the chosen clinic timezone.

Source IDs are stable internal identifiers. The renderer maps the selected source set to compact local citation numbers; never treat an internal source ID as the visible number. Structured body fields must reference existing source IDs only.

## 3. Intent classification and parameter extraction

| Example question | Intent | Parameters / important distinction |
|---|---|---|
| “Summarize this patient before consultation” | `patient_overview` | Whole patient, relevant historical context and latest observations; no fixed line count |
| “Show medical history” | `medical_history` | History domains only; no complete prescription-history dump |
| “Summarize her allergies” | `allergies` | Focused existing text/list answer; no dedicated history timeline needed |
| “What happened at the last visit?” | `visit_summary` | Latest completed encounter; preserve complete written prescription sections |
| “Summarize the 21 July visit” | `visit_summary` | Resolve visit ID; clarify if multiple visits match and context cannot distinguish them |
| “Show visit history” | `visit_history` | Chronological encounters; expand one into its full visit summary |
| “Show vital trends” | `vital_trend` | Available comparable metrics, stacked; BP combines paired systolic/diastolic |
| “Show systolic BP” / “BP trend” | `vital_trend` | Systolic-only versus combined BP; never create a “systolic weight” metric |
| “How has HbA1c changed?” | `lab_trend` | HbA1c only; no top metric selector |
| “Compare lab results over time” | `lab_trend` | Requested or relevant available analytes; table alternative within the trend |
| “What medicines is she taking?” | `current_medications` | Reconciled ongoing statements or eligible prescriptions; evidence basis affects wording |
| “Show medication history” | `medication_history` | All requested dated prescriptions/statements; no assumption of continuous use |
| “Latest lab results” | `latest_lab_records` | Latest valid result per requested analyte; not the entire lab history |
| “Show vital records” | `vital_records` | Dated observations in a table, not a synthesized trend |

A medication summary is not a separate Summary sidebar item: route medication lists/history to Data Table. A lab-comparison table is not a separate catalog item: the trend card already provides a table view. Keep scope explicit when a question names a single medication, lab or vital.

## 4. Data retrieval and field mapping

| Domain | Existing source / fields to verify in the adapter | Normalized output and checks |
|---|---|---|
| Demographics | Selected patient context / profile | Age, recorded gender, name and patient ID; do not infer gender or borrow another patient's demographics |
| Current symptoms | `summary_json_doctor.symptoms`: name, duration, severity, notes | Match current patient/encounter and distinguish patient report from clinician findings |
| Medical history | `medical_history[]`: `tmmhs_id`, `tags[]`, `tmpmh_remarks`; tag title/since/status/relationship/date/note/medication/enable | Domain-specific history; honor disabled/negated/corrected entries and explicit absence states |
| Consultations | Selected completed visit/case ID and event date | Exact source encounter; scheduled appointments are not completed consultations |
| Prescription | `prescriptionData`: symptoms, diagnosis, medicine/medications, vitals, examination, investigations, additional notes/advice | Preserve full original values. Support legacy `tmm_*` and normalized medicine fields through a verified adapter |
| Medication use | Dated ongoing statements in history/medication records, or prescription start/duration/end | Preserve patient-reported vs clinician-documented vs prescription-only evidence |
| Vitals | Dated measurement/event records | Metric, value, unit, context, event and source; BP pairing by measurement event |
| Labs | Completed lab observations / reports | Analyte identity, result, unit, actual collection/result time, supplied range/flag and source |
| Specialty history | Available gynecology/obstetric/ophthalmic/etc. adapters | Preserve domain meaning and units; do not assume a universal database field |
| Uploaded records | Only records actually retrieved and supported by the adapter | Maintain document/page provenance; do not imply coverage of documents not indexed or returned |

History domain IDs used in existing code are `2` Medical Condition, `4` Allergies, `3` Family History, `1` Lifestyle, `5` Surgical History. Verify against `medicalHistoryUtils.js` and the current API rather than hardcoding a new interpretation. An investigation order is not a completed lab result. Record ingestion/sync time is not the clinical event date.

## 5. Patient overview: composition by section

Use **Situation → Background → Assessment → Last Visit**. This is a Patient Overview adaptation, not a complete SBAR handoff. Assessment here means recorded observations; no new diagnosis or treatment plan is generated.

### 5.1 Situation

**Intent:** orient the doctor to who the patient is, the relevant ongoing problems, what has changed and the context affecting interpretation.

**Parameter skeleton:**

```text
{demographic_phrase} with {chronic_conditions_and_relevant_history}.
At the last visit on {visit_date}, {documented_complaint_or_reason}.
{distinct_current_symptoms}. {ongoing_medication_context}. {allergy_context}.
```

| Slot | Selection logic | Example wording |
|---|---|---|
| Demographics | Available verified age + recorded gender; optional name | “Sunita Sharma, a 46-year-old woman…” |
| Conditions | Relevant active/chronic problems; keep historical/remission/suspected qualifiers | “…has hypothyroidism and dyslipidaemia.” |
| Last visit | Latest completed visit date and recorded complaint/reason; preserve duration and meaningful symptom qualifiers | “At her last visit on 21 Jul 2026, she reported mild fatigue for one week…” |
| Current symptoms | Add distinct current-encounter collector symptoms, attributed as reported; never present old symptoms as current | “At today’s intake, she reports…” |
| Medications | Ongoing use statement first; date-covered order only if no stronger current source | “She reports taking levothyroxine…” versus “The medication record lists…” |
| Relevant context | Relevant surgery, lifestyle, pregnancy, functional needs, critical findings or material conflict | Keep recorded attribution/status; do not infer urgency from a condition name |
| Allergies | Allergen + reaction/severity when recorded | “…a penicillin allergy (hives) is recorded.” |

These are optional slots, not a mandatory number of sentences. Remove empty clauses and repair punctuation; no “unavailable” filler. Keep source uncertainty when it is part of a recorded finding. Bold condition/medication names and selectively important facts; connecting words remain regular. Do not assert adherence from a prescription.

Start with demographics, chronic conditions and their relevant history, followed by the latest completed visit date and recorded complaint. Name documented ongoing medications and material allergy context briefly. Do not add routine lab readings, lab comparisons or vital measurements to this narrative: they belong in Assessment. Family, lifestyle, occupation and specialty details belong in Background unless directly needed to understand the presenting problem. Never pad the narrative to achieve four lines.

**Example:** Sunita Sharma, a 46-year-old woman, has **hypothyroidism** (since 2018) and **dyslipidaemia** (since 2024). At her last visit on 21 Jul 2026, she reported **mild fatigue** for one week, without fever or palpitations. She reports ongoing use of **levothyroxine** and **atorvastatin** and has a recorded **penicillin allergy** (hives).

Important condition tags may appear at the end of Situation with source-backed status. Allergies stay in the sentence, not a separate allergy-signal tag. A cancer or HIV diagnosis alone must not produce an emergency label. Severe reactions, source-critical findings and material contradictions must remain visible when relevant.

### 5.2 Background

**Intent:** compact longitudinal context, including the historical details underlying the Situation.

```text
Chronic: {condition (duration/status)} |
Family: {condition (relationship)} |
Lifestyle: {factor (detail)} |
Surgical: {procedure (date/laterality)} |
Other history: {relevant specialty/history detail} |
Ongoing medications: {name strength (source-provided regimen)}
```

Render populated categories in one flowing block with subtle vertical textual dividers. Wrap naturally. Preserve clinically meaningful duration, relationship, procedure dates, status and source attribution. Omit routine documentation dates from the visible history but keep them in evidence. Do not repeat the entire prescription history. Allergy context is already in Situation; a standalone Medical history card can still include allergies.

All category labels use the same icon-free `InlineFieldTag`: slate-50 background, slate-500 text, 12px medium weight, compact padding, natural wrapping. Clinical values are darker, bracketed qualifiers lighter. Do not use a darker Assessment-specific variant of the same field-label component.

**Medication inclusion:**

1. Prefer an explicit dated ongoing-use statement after reconciliation.
2. Otherwise require a validated prescription start/end window covering the review date. Inclusive end is `start + duration_days - 1` when duration is explicit.
3. Do not treat missing duration as indefinite treatment. Exclude future, expired, stopped, superseded and unresolved conflicting courses from the current list.
4. Use “Ongoing medications” for explicit use statements and “Current medications” for eligible prescription-derived entries. Retain basis in source data.
5. Historical/stopped medicines may appear with their correct status when clinically relevant, but never as active by inference.

### 5.3 Assessment

**Intent:** show latest objective recorded observations without generating clinical interpretation.

- **Latest vitals (short date):** values inline, separated by `|`; keep source references beside the heading when shared. Group accurately by measurement event/date, not by assuming every latest metric occurred together.
- **Latest key labs:** latest valid result per analyte, prioritizing source-flagged and context-relevant tests. Relevant normal results can be useful; do not replace a newer normal result with an older abnormal one.

Use bullet rows with the same subtle inline field labels. Wrapped content remains within the bullet. Preserve values and units exactly; source-supplied high/low flags use solid bold direction icons with accessible text. No flag means no invented arrow. An abnormal-direction icon is not evidence of a longitudinal worsening trend.

Keep lab dates/reference ranges available in evidence even when the compact body hides them. Show no empty observation group. If observations are absent, omit Assessment instead of filling it with unrelated prose or zeros.

### 5.4 Last Visit

**Intent:** compact continuity-of-care recap of the latest completed encounter.

```text
[Last Visit · 21 Jul ’26]
SX: {symptoms (short details)} | DX: {recorded diagnoses} |
RX: {medicine strength + short regimen} [shared citation]
```

Date is inside the main section tag, never isolated on the far right. Include only SX, DX and RX in this recap. One shared citation at the end is appropriate when all facts share a source; retain multiple citations when a visit is represented by multiple documents. Do not fill missing fields with another encounter's data. A planned follow-up does not qualify as the Last Visit.

The expanded Visit summary has a different completeness requirement: preserve the full original prescription and notes, not merely this short recap.

## 6. Focused summary variants

### Medical history

Use available chronic conditions, allergies/reactions, family, lifestyle, surgical, additional and specialty history. Omit empty domains without claiming a complete history. Do not insert prescription history. An explicit absence (“no known allergies”) is distinct from no allergy record.

### Complete visit summary

Resolve a completed visit ID and preserve all available original content in prescription-print order:

1. Symptoms: name, duration, severity and pertinent negatives/notes.
2. Diagnosis: full name and recorded qualifiers/status.
3. Medication: name/strength, dosage, frequency, route, timing, duration, quantity and remarks where written.
4. Vitals: values, units and relevant context.
5. Examination: all source-written findings, laterality and notes.
6. Lab investigations: ordered tests and original instructions, not results unless separately documented.
7. Additional notes: source-written advice, recorded assessment, original plan/follow-up.

Preserving a doctor's original plan in a historical visit is different from generating a new recommendation. No “Visit context” filler section; omit absent sections. Never invent missing medicine instructions or replace doctor-written text with a generic summary.

### Visit history

Show a dated clinical timeline, newest first. Each item identifies a completed visit and can expand into its full Visit summary. Selected/unselected cards use subtle violet/gray gradients; violet timeline dots have a ring. Preserve visit identity when two visits share a day. Expansion must not mix documents from different visits.

## 7. Trends: intent, normalization and structure

### Question scope

- All vital trends: stack Blood pressure, Weight and other available requested metrics vertically.
- BP: one chart with paired systolic and diastolic series.
- Systolic-only or diastolic-only: one requested series.
- One lab, such as HbA1c: one chart without a redundant top-level metric selector.
- Several labs: separate sections per analyte; never combine incompatible units on one axis.

Graph/Table is a presentation choice; Line/Bar is a chart-type choice. Keep these segmented controls, but do not add a second competing metric segmented control in the answer. Catalog scenario controls stay outside the response card.

### Proposed trend body

```json
{
  "metrics": [{
    "metric_id": "hba1c",
    "label": "HbA1c",
    "unit": "%",
    "points": [{"event_at": "2026-07-21", "value": 7.8, "source_ids": ["lab-1"]}],
    "comparison": {"basis": "first_to_last_plotted", "change": null}
  }]
}
```

BP points additionally contain paired `systolic`, `diastolic`, the same unit and a shared measurement/event identifier. If pairing cannot be verified, do not manufacture a combined reading. Reject invalid numeric values; preserve nonnumeric results as text records rather than coercing them to zero.

### Selection and calculation

1. Resolve requested analyte/metric and date range.
2. Use actual event dates, sort chronologically and deduplicate identical source observations.
3. Resolve corrected versions; retain distinct same-day measurements by time/event where available.
4. Compare only compatible units and measurement contexts. Any unit conversion must be validated and retain originals; otherwise separate the data.
5. Do not bridge missing points with invented readings or smooth a curve into unmeasured values. Preserve real date spacing.
6. At least two comparable points are required for a change statement/trend. One point remains one recorded value; zero points shows a concise scoped empty state.

### Change sentence

Use an endpoint comparison, not a repetition of dates/readings already on the chart:

- “Weight is **3 kg lower** from the first to the last reading.”
- “HbA1c is **1 percentage point lower** from the first to the last reading.”
- “Systolic is **8 mmHg lower**; diastolic is **4 mmHg lower** from the first to the last reading.”

Use percentage **points** for subtraction of percentage-valued readings. Preserve precision without false rounding to a clinically misleading value. Report BP components independently when directions differ. “Higher/lower” describes the selected endpoints, not sustained improvement, control, normality or deterioration. When equal, say unchanged. Do not show an endpoint comparison for fewer than two comparable observations.

### Chart and table display

Use visible axes/units, useful tick spacing, source-backed tooltips and accessible legend labels. BP uses distinct named series plus solid/dashed differentiation so color is not the only cue. Reference bands require supplied applicable ranges; do not invent therapeutic targets. The table alternative shows the same selected observations, dates and values, not a different dataset. Evidence includes all contributing sources and citations for the comparison endpoints where needed.

## 8. Data Table: intent, fields and presentation

All tables use Tesseract `DataTable` inside the shared Velora answer card. No redundant intro such as “Recorded vital signs by visit date,” prescription-course disclaimer or repeated “Latest lab records” caption. Title carries the short relevant date when a single date legitimately describes the data.

| Intent | Retrieval/selection | Visible columns | Heading/date |
|---|---|---|---|
| Current medications | Reconciled ongoing statements and eligible courses; exclude ended/stopped/conflicted entries | Medication with compact regimen; prescribed period where applicable | `Current medications · 21 Oct ’26` refers to review date |
| Medication history | Requested historical prescriptions/statements in date order; keep their statuses | Medication with compact regimen; course/date range | `Medication history`; do not label every past item current |
| Latest lab records | Latest valid result per requested analyte | Parameter; Result with unit | `Latest lab records · 21 Jul ’26` only if one date covers the rows |
| Vital records | Dated measurement events, grouped without creating false co-occurrence | Date; requested vital values with units | `Vital records`; individual dates in rows |

Reference range, flags, source and treatment-target columns are removed from these compact record tables. Preserve underlying ranges, flags and provenance in evidence. This display choice must not delete source data. Trend and summary displays can still use source-backed flags according to their own rules.

### Medication cell format

```text
Metformin (500 mg · Twice daily · After meals · 30 days)
Levothyroxine (75 mcg · Once daily · Before breakfast · 90 days)
```

Medication name is darker and medium/semibold; dosage, frequency, timing and duration are lighter regular text. Render only available parts and remove dangling separators. Preserve source-provided route, quantity and special instructions in the complete prescription/evidence; never infer timing from drug identity. Do not conflate dose with strength or translate a schedule into a different meaning.

If an ongoing statement has no prescribed duration, omit the duration instead of fabricating an indefinite course. Show significant stopped/on-hold status when returning historical records. Keep distinct medicines/doses until a verified reconciliation rule establishes identity; do not merge based on fuzzy brand similarity.

### Mixed dates and duplicates

Latest-per-analyte results may come from different days. Never put a single misleading date in the title: use a short date range or a compact per-row date in that variant. The current catalog's lab table demonstrates one-date data; mixed-date handling is a backend/UI integration requirement, not a claim already exercised by that fixture. Keep same-day separate events distinct. Missing cells are not zeros; do not backfill a visit with another visit's values.

## 9. Evidence, formatting and accessibility

- Use one common citation component: light background, square-bracket number `[n]`, accessible “Source n” action, existing evidence drawer.
- Latest vitals can share citations at their heading; a common date alone is not proof of one source.
- Last Visit can share one citation at the end when SX/DX/RX share the same source.
- Keep each fact's provenance internally even when visual citations are consolidated.
- Evidence footer is neutral gray, with source count, visit/date coverage and record types; opens the existing record viewer.
- Main section headings are compact gray icon tags followed by a fine divider. Inline field tags have no icons and lower emphasis.
- Source high/low markers use bold solid arrows with an accessible textual equivalent. Never rely only on color for a clinical flag.
- Preserve keyboard access, focus indication, meaningful button labels and expansion state on cards/timelines.
- Do not line-clamp clinical prose. At narrow widths let labels, values and brackets wrap naturally; keep units with values where practical.

## 10. Missing, stale, conflicting and sensitive data

| Condition | Required behavior |
|---|---|
| Some fields absent | Omit only the absent clause/row/group; no invented negative assertion |
| No clinical records | One scoped no-records state, no empty four-section shell |
| Source retrieval/service failure | Separate service/coverage state; do not present it as proof the patient has no history |
| No current symptoms | Use dated prior symptoms only when helpful; do not turn old symptoms into current ones |
| Unknown allergy status | Omit narrative clause, retain unknown state internally |
| Explicit no known allergies | May be stated with provenance, not inferred |
| Conflicting dose/diagnosis | Preserve linked conflict/status; do not silently choose a convenient value |
| Historical serious condition | Preserve “history of,” treatment/remission status; do not automatically mark emergency |
| Old observations | Keep real dates; never label them today's readings |
| Prescription without duration | No assumption of a current indefinite course |
| Different patients or encounters | Reject cross-patient joins; no borrowing data to fill empty sections |
| Demo mode | Clearly isolated in code/data flow; no synthetic fallback for live patient retrieval |

## 11. Demo records and review paths

- **Arun Mehta:** catalog's fuller default overview, three consultations (12 May, 14 Jul, 9 Oct 2026), separate profile/history/lab evidence. Approximate density at the reference desktop width: 4 Situation lines, 6 Background lines, 3 Assessment lines, 2 Last Visit lines.
- **Sunita Sharma:** demo chat patient `MOCK1002` / displayed `PAT1002`, age 46. Three consultations (9 Jan, 21 Apr, 21 Jul 2026); hypothyroidism/dyslipidaemia; symptom progression, medication history, labs, vitals, allergy, family/lifestyle/surgical/gynecology context. Ongoing use comes from the explicit 19 Oct statement, not from assuming a July prescription remains active.
- Other demo patients retain their own records. Sunita's fuller summary must never be attached to an arbitrary patient selected by name.
- Ask Sunita “Summarize this patient,” then open citations, ask latest labs and medicines, and compare dates/names with the source records. Existing cached chat answers may show the earlier fixture until a new question is sent.

## 12. Code map

| Responsibility | Path |
|---|---|
| Catalog, intent definitions, trend and table renderers | `src/pages/dr-copilot/PatientResponseV0.jsx` |
| Catalog layout styles | `src/pages/dr-copilot/PatientResponseV0.module.css` |
| Shared summary body and inline field tags | `src/components/dr-copilot/cards/summary/RecordedSbarBody.jsx` / `.module.css` |
| Shared answer card and citations | `src/components/dr-copilot/cards/clinical/ChartAnswerCard.jsx` |
| Existing evidence viewer | `src/components/dr-copilot/surfaces/EvidencePanel.jsx`, `EvidenceViewerContext.jsx` |
| Catalog fixtures / selection | `src/pages/dr-copilot/patientResponseV0Fixtures.js` |
| Arun fuller overview | `src/pages/dr-copilot/filledPatientOverviewFixture.js` |
| Compact summary / visit adapters | `src/pages/dr-copilot/compactSummaryFixtures.js` |
| Prescription window rules | `src/pages/dr-copilot/prescriptionWindow.js` |
| Sunita longitudinal fixture | `src/components/dr-copilot/chart-search/sunitaDemoRecord.js` |
| Mock routing and source-number mapping | `src/components/dr-copilot/chart-search/copilotMock.js` |
| Generation prompt / JSON skeleton | `docs/dr-copilot/PATIENT-SUMMARY-PROMPT.md` |
| Per-section catalog contract | `docs/dr-copilot/SUMMARY-SECTION-CATALOG.md` |

## 13. Acceptance criteria and integration work

**Summary:** correct identity and source scope; stable section order; supported demographic/problem/symptom/medication/allergy clauses; temporal status preserved; populated domains only; no new recommendations; short Last Visit date inside its tag; full visit view preserves original doctor text.

**Trends:** scope matches question; same-event BP pairing; units compatible; correct endpoint math and percentage-point wording; no repeated reading/date sentence; no fabricated interpolation; single-parameter question has no extra metric selector; graph and table show the same data.

**Tables:** correct current/history classification; no fabricated duration/timing; compact medication style; correct date semantics for mixed-source labs; no unnecessary reference/flag/source/target columns; original data accessible in evidence.

**All:** every citation resolves; no cross-patient content; no synthetic fallback in live mode; empty, partial, stale and conflict states behave correctly; no clipping at desktop/mobile widths. Tests are software contract checks, not clinical validation.

**Backend integration still needed:** implement validated adapters and normalized schemas, model/structured-output enforcement, source coverage/error states, relevance review and endpoint contracts. The prototype does not demonstrate end-to-end clinical validation or guarantee a clinically exhaustive narrative. Review the selection policy with clinicians before production use.

## 14. Research basis

- [HL7 International Patient Summary structure](https://hl7.org/fhir/uv/ips/2.0.1/en/Structure-of-the-International-Patient-Summary.html): core problems, medications and allergies plus relevant history/results provide a coverage checklist; this prototype is not an IPS-conformant document.
- [HL7 IPS data inclusion](https://hl7.org/fhir/uv/ips/2.0.1/en/Generation-and-Data-Inclusion.html): relevance-based selection informs the overview; no universal visual line count is specified.
- [HL7 MedicationStatement](https://hl7.org/fhir/R4/medicationstatement.html): reported medication use is distinct from an order; preserve basis in prose.
- [HL7 IPS missing data](https://hl7.org/fhir/uv/ips/2.0.1/en/Empty-Sections-and-Missing-Data.html): unknown and known absent are different states.
- [AHRQ SBAR](https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/sbar.html): communication framework with clinician assessment and recommendation/request. The Patient Overview adapts organization without generating recommendations.

Sentence order, UI density, field tags and card grouping are product decisions informed by these references, not a published clinical validation of this interface.
