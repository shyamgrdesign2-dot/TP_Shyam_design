# Summary catalog: intent, data sources, formatting and display

19 October 2026 · Current review specification

The Patient overview contains Situation, Background, Assessment and Last Visit. Last Visit is a short, dated SX | DX | RX recap. The separately requested Visit Summary and expanded Visit History preserve the complete prescription, including examination, investigations and notes.

The exact agent instructions and output schema are in [Patient summary prompt](./PATIENT-SUMMARY-PROMPT.md). The [content contract](./CONCISE-SUMMARY-BACKEND.md) supplies medication-window and evidence rules. The runnable comprehensive synthetic input is [completeConsultationFixture.json](../../src/pages/dr-copilot/completeConsultationFixture.json).

## 1. Situation

**Intent and trigger:** “Summarize this patient,” “patient overview,” “before the consultation,” or a clinically structured summary. This is the first section of Patient overview, not a separate card.

**Data sources:** current-encounter symptom collector first (`summary_json_doctor.symptoms`: `name`, `duration`, `severity`, `notes`), with patient-report attribution and checked patient/clinic/appointment identity; verified patient demographics; medical-history conditions and status; most recent selected encounter's `prescriptionData.symptoms` (`symptom_name`, `since`, `severity`, `note`); documented ongoing medication in history/additional notes; reconciled prescription courses covering the review date. Allergy/reaction facts appear in the narrative. Important conditions such as cancer/HIV and source-critical findings can supply the highlighted tags.

**Formatting:** brief natural narrative composed in a fixed conditional order, without a fixed line count. Pattern: `[age + gender] with [recorded conditions]. [Latest recorded symptoms with temporal context]. [Documented medication context].` No forced minimum length, follow-up logistics or missing-field filler. Bold condition and medicine names, optionally age or material symptom; connecting words remain regular. Keep names complete. Do not turn historical prescriptions into assertions of current use.

**Medication phrasing:** “He reports taking **Metformin** 500 mg” only when patient-reported ongoing use is recorded; “Ongoing treatment with **Metformin** is documented” for other explicit ongoing statements; “His medication record lists **Amlodipine** 5 mg” for eligible prescription evidence. Do not write “currently prescribed” in the narrative. The Background row may be titled Current medications while its evidence retains the classification basis and dates.

**Display:** compact neutral gray section tag with a divider line, unboxed medical icon, regular body text. At the end of the Situation narrative, show important context as compact Tesseract badges with citations: e.g. `Cancer history: colon cancer (resected; recorded remission)`, `HIV (documented diagnosis)`. A separate Important clinical context section is not rendered. Ordinary context is neutral; source-critical findings can use error emphasis and material conflicts warning emphasis; severe allergy reactions are bolded in the Situation sentence. Disease names alone do not establish critical severity.

**Missing/conflicting data:** omit absent clauses and tags. Keep the source's suspected/confirmed distinction. Preserve material conflicts as cited tags within Situation. Never substitute another patient's demographics or synthetic content.

## 2. Background

**Intent and trigger:** Patient overview automatically; “medical history” requests show the same historical domains as a focused card. Medication-history requests go to Data tables, not this section.

**Data sources:** case-manager `medical_history` section/tag arrays. The five domain IDs are `2` Medical Condition, `4` Allergies, `3` Family History, `1` Lifestyle, `5` Surgical History. Read `title`, `since`, `status`, `medication`, `note`, `relationship`, `date`, `enable`, `no_know_history`, and `tmpmh_remarks` as applicable. Additional notes and relevant specialty history require their actual verified adapters; do not assume a universal additional-history database column. See `src/utils/medicalHistoryUtils.js` and `src/components/PatientSummary.js`.

**Formatting:** inline labeled text with | dividers between Chronic, Family, Lifestyle, Surgical and medication groups; comma-separated values and lighter parentheses within each. Wrap naturally to the section’s left edge. Examples: `Chronic: Type 2 diabetes (7 years; active), hypertension (5 years; active)`; `Allergies: Sulfonamides (rash)`; `Family: Type 2 diabetes (father)`; `Surgical: Appendectomy (2014)`. Preserve units, laterality, status and attribution. Omit routine documentation dates; keep meaningful operation/onset dates and preserve all provenance in evidence.

**Medication context:** first use explicit dated ongoing statements from history or medication records. For each other medicine, check a reconciled prescription's inclusive start/end window against the request's review date. Show Ongoing medications for explicit statements and Current medications for window-qualified courses. Include names, strengths and available schedules in brackets. Omit expired, future, stopped, superseded or indeterminate courses. A prescription list is not evidence of adherence.

**Display:** one main gray Background bar in Patient overview. Use lightweight inline row labels rather than nested cards. A separate Medical history answer may use compact gray headings per available history domain. No prescription-history dump or repeated history disclosure.

**Missing/conflicting data:** unknown allergies contribute no row; an explicit negative is different. Honor negated/disabled tags and source corrections. Do not interpret `no_know_history: false` as a positive diagnosis. Preserve domain conflicts in source-linked context, rather than choosing one silently.

## 3. Assessment

**Intent and trigger:** Patient overview when observations exist. This view summarizes recorded measurements; it does not generate a clinical assessment, diagnosis or plan.

**Data sources:** selected encounter's vitals/body-composition records and latest valid lab result per analyte. Retain value, unit, actual event time, source interval/flag and source reference. Investigations ordered in a prescription are not completed lab results.

**Formatting:** two lightweight inline groups:

- `Latest vitals (22 Sep ’26)` followed by `BP: 136/84 mmHg | Pulse: 78 bpm | SpO₂: 98% | Temperature: 36.8 °C | Weight: 75 kg | Height: 170 cm`.
- `Latest key labs` followed by selected latest results, such as `HbA1c: ↑ 7.4% (ref 4.0–5.6%)`.

The short vitals date is inside the tag, not at the far edge. No visible date beside Latest key labs; retain each date in evidence. Bold arrows indicate source-supplied high/low flags, not automatically a worsening/improving trend. Show source-critical findings prominently inside Situation as well when necessary.

**Display:** one main gray Assessment bar. Tags and values participate in the same text flow; a wrapped second line starts at the section's left edge, underneath the tag. Values stay on one line where space permits. No fixed columns, nested boxes or duplicate measurement histories.

**Missing/conflicting data:** omit absent groups; if both are absent omit Assessment. Use separate dated vital groups when one date cannot describe the selected measurements. Do not silently replace a newer normal lab with an older abnormal result. Do not invent normal ranges or fill missing observations with zero.

## 4. Last Visit / Visit Summary

**Overview display:** the date is inside the main tag `Last Visit · 22 Sep ’26`. The fourth section is a short recap: `SX: Fatigue (mild, 3 days; no fever) | DX: Type 2 diabetes, hypertension | RX: Metformin 500 mg (...), Amlodipine 5 mg (...)`. Only SX, DX and RX appear here. Names/values use darker medium weight; brackets are lighter. No additional note or examination rows in this short recap.

**Full-view intent and trigger:** “Summarize the last visit,” “show the prescription from [date],” a specific visit selection, or expansion of a Visit History item. Latest means the latest completed recorded consultation, not a planned follow-up. Resolve the selected case/encounter ID; matching a calendar date alone is insufficient when multiple encounters exist.

**Data sources:** the selected encounter's `prescriptionData` (or verified equivalent): `symptoms`, `diagnosis`, `medicine`/`medications`, `vitals`, `examination`/`examinations`, investigations, additional notes, original advice and follow-up instructions. The frontend handles both legacy `tmm_*` medicine fields and normalized `name`, `dosage`, `frequency`, `schedule`, `duration`, `quantity`, `notes`. Resolve lookup IDs through the source vocabulary; do not print a lookup ID as a clinical instruction.

**Full-view formatting and order:** preserve every available doctor-written value and instruction, with original wording. Use the same prescription-print section order:

| Section | Fields that must survive formatting |
|---|---|
| Symptoms | Symptom name, duration, severity, notes and recorded pertinent negatives |
| Diagnosis | Full diagnosis name, recorded status/type, onset/duration, remarks/code where supplied |
| Medication | Complete name/strength, dose/unit, route if written, full frequency/slot pattern, timing, duration, quantity and remarks |
| Vitals | Recorded value, unit and pertinent measurement context |
| Examination | Finding name, laterality and complete source-written notes |
| Lab investigations | Ordered investigation and original instructions; do not present as a result |
| Additional notes | Complete doctor notes, original advice, recorded assessment and original follow-up/plan, clearly belonging to this visit |

**Display:** shared Velora card, selected visit date in its context, compact neutral section bars and readable labeled/inline rows. No “Visit context” filler section. Complete prescription content may be longer than the Patient overview; do not truncate it to meet the Situation's length target. The same body renders inside the violet-ring expandable timeline. Citations open the existing evidence drawer.

**Missing/conflicting data:** omit absent sections without “unavailable” placeholders. Do not copy another visit's medicines or observations. Preserve amended/corrected source text and version provenance; do not generate new clinical recommendations.

## 5. Trend-card question variants

**Intent and trigger:** distinguish the requested measurement scope before rendering.

| Question | Card variant | Parameter tabs |
|---|---|---|
| Show all vital trends | BP, systolic, diastolic, weight choices | Yes |
| Show BP trends | Systolic and diastolic on the same time axis/unit | No |
| Show systolic BP / diastolic BP / weight trend | One measurement | No |
| Show all lab trends | Available lab parameters, one measurement/unit at a time | Yes |
| Show HbA1c / creatinine trend | Requested analyte only | No |

**Data sources:** structured dated vital/lab observations; BP pairs must belong to the same measurement event, not merely adjacent array entries. The preview fixture's paired readings share an event/source. No “systolic weight” concept exists.

**Formatting/display:** requested parameter in the card title, latest value/date, factual change, line or bar chart and table alternative. BP uses separately labeled systolic/diastolic series and two table columns; different units never share an axis. Keep the line/bar and graph/table controls, but omit parameter selectors for a single requested scope. Catalog question-variant controls sit outside the answer card and are not part of the production chat response.

## Comprehensive synthetic example

`completeConsultationFixture.json` includes demographics, symptoms, diagnoses, five history domains, additional history, a patient-reported ongoing medicine, prescription courses, six vitals, three lab results, examination, investigations, quantities and notes. The overview uses the relevant facts in its four sections; normal lab details and full original visit instructions remain in their appropriate record/visit views and evidence. “Complete results” describes this example's available input, not a promise that every patient's chart is complete.

The JSON envelope and `ongoing_medications` are normalized prototype adapter fields. The history section/tag properties and prescription field names were checked against local Tatva Practice code. This is not a captured patient record or a claimed exact live API envelope. Do not manufacture gynecological, obstetric or ophthalmic data just to populate every domain for this example patient.

Vitals citation rule: place deduplicated source references beside the Latest vitals tag, not after every value. Keep source IDs on individual observations internally. A shared calendar date alone is not proof of a shared record; retain all contributing source references when necessary. Wrapped values continue from the section’s left edge beneath the tag.

Patient overview allergy placement: show allergy/reaction context in the Situation sentence, without a duplicate Background allergy row. The standalone Medical history view retains its Allergy section.

### Situation length and diagnosis selection

Use the parameter-based composition order below, without a line-count limit or CSS truncation. Briefly include a newly documented or changed diagnosis from the latest completed visit when supported; keep existing conditions with their recorded status. Do not mistake an incomplete past record for proof of a new diagnosis. If current collector symptoms exist, prefer those for the current concern; retain older symptoms only with their date when they add relevant context. Include relevant lifestyle/surgical history in the narrative only when it helps orient the doctor; Background retains the other available details. Clinical details must remain accessible through the other sections and evidence rather than being lost to a word budget.

Last Visit citation rule: SX, DX and RX in the overview refer to the same selected visit. Render one deduplicated citation at the end of the complete recap; it opens the existing evidence viewer. Keep provenance on each fact internally.

Catalog navigation: top-level tabs are **Summaries and Histories**, **Trends**, and **Data Table**. Trends contains vital and lab trends; Data Table contains medication history/current medications, lab records and vital records. Do not repeat the top-level category as a sidebar heading.

Multi-metric questions show vertically stacked trend sections by default, without metric tabs. Blood pressure is one section with paired systolic/diastolic series, followed by Weight. Each section has one compact factual change sentence comparing the first and last plotted readings, without repeating their values or dates, independent Graph/Table and Line/Bar controls, unit labels, source citations and a common evidence footer. A single-parameter question still shows only that requested metric. BP series use solid/dashed lines and named legend entries to distinguish them without relying on color alone. Preserve real date spacing and linear connections; never smooth or interpolate absent observations.

Trend change copy: “Weight is 3 kg lower from the first to the last reading.” For BP, report systolic and diastolic change independently so opposite directions or an unchanged component remain accurate. Use percentage points for percentage values. “Lower/higher” refers to these recorded endpoints, not a normal range, sustained trend or clinical improvement. Show no change sentence for fewer than two comparable readings.

Lab trends use the same change-only sentence: “HbA1c is **1 percentage point lower** from the first to the last reading.” “Creatinine is **0.1 mg/dL lower** from the first to the last reading.” Emphasize only the change amount/direction in semibold; do not repeat endpoint readings or dates from the graph. Higher and unchanged follow the same rule, with no clinical improvement claim.

Record tables: omit repeated table captions and introductory prescription-window/disclaimer text. Latest lab records shows the result date in its card heading (`22 Sep ’26`); Current medications shows the review date (`19 Oct ’26`). Lab table columns are Parameter and Result only, without flags or reference ranges. Medication and vital tables omit source columns. Retain original ranges/flags/provenance in the evidence footer and source record; do not discard the underlying data.

Medication tables use a compact inline row: **Metformin** (500 mg · Twice daily · After meals · 30 days). Names are dark semibold; dosage, frequency, timing and duration are lighter regular text. Display only source-provided timing, without inferring morning/meal instructions for historical courses. Keep the prescribed period in a separate compact date-range column. The same format applies to current medications and medication history.

## Parameter-based composition and shared field labels

The [sentence assembly contract](./PATIENT-SUMMARY-PROMPT.md#parameter-based-sentence-assembly-21-oct-2026) defines normalized input slots, conditional sentence templates, source precedence, evidence-based medication wording, relevance/coverage checks and the composition of all four sections. It supersedes earlier fixed-line targets. The catalog displays these definitions beside each section's existing field mapping.

All inline category labels now use the same light, icon-free `InlineFieldTag` component, including the Assessment bullet labels. Last Visit includes its short date inside the main section tag. Main section tags and clinical facts retain stronger emphasis than inline labels.
