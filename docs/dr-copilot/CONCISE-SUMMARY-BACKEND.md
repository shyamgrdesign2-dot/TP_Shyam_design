# Patient overview: content and backend contract

19 October 2026 · Current product specification

This document captures the latest four-section overview and supersedes earlier three-section and separate Clinical-summary proposals. The exact generation instructions and JSON skeleton are in [Patient summary prompt](./PATIENT-SUMMARY-PROMPT.md).

The single Patient overview contains **Situation → Background → Assessment → Last Visit**. There is no Recommendations, Recorded plan, repeated history disclosure, or separate Clinical-summary card. Last Visit is a compact dated SX | DX | RX recap. Complete original prescriptions belong in Visit summary and expanded Visit history. The overview is concise; the evidence drawer preserves access to the underlying records.

## Section ownership

| Section | Include | Presentation |
|---|---|---|
| Situation | Verified age and gender; documented conditions; latest recorded symptoms when available; relevant ongoing medication or active prescription window; material allergy context | Fixed conditional clause order based on available information, without a fixed line or word count. Regular body text with selective emphasis. No booking/follow-up logistics or missing-data filler. |
| Background | Chronic conditions, allergies, surgical, family, lifestyle, additional and relevant specialty history; documented ongoing medications and eligible current prescriptions | Inline labeled text separated by neutral | dividers, with short parenthetical detail. Historical conditions do not become active diagnoses unless supported. No complete prescription history. |
| Assessment | Latest vitals and latest key labs only | Small inline tags; vitals and values share a line. `Latest vitals (22 Sep ’26)` includes its short date inside the tag. `Latest key labs` has no visible date, while each result retains its timestamp in evidence. |
| Last Visit | Latest completed consultation: SX, DX, RX only | Short dated recap with inline dividers, darker primary values and lighter bracketed instructions. Complete prescription remains in the full visit view. |

A missing domain contributes no sentence, row or empty section. No recorded allergy is different from an explicit “no known allergies”; never infer the latter. If no clinical facts exist, show the existing single no-records state. Retrieval failures remain errors rather than being presented as absence of disease.

The patient context remains in the existing header. Situation may start “45-year-old man with recorded type 2 diabetes and hypertension.” Add symptoms and medications only when their evidence supports them. Do not manufacture a current complaint, drug use, adherence, stability or clinical interpretation.

## Current medication selection

Apply this per medication, rather than allowing one known medicine to suppress all other prescription evidence:

1. Retrieve medical history, additional history, medication statements/history and prescriptions for the same patient and tenant. Preserve source, author, date, assertion, dose, schedule and any stop/replacement details.
2. Reconcile explicit corrections, discontinued courses, replacements and contradictions before selecting. Match a validated medication identity; do not fuzzy-merge different strengths, routes or combination products. An unresolved conflict is a source-linked conflict, not an invented choice.
3. Prefer an explicit, dated ongoing-use statement from history or medication records. Attribute patient-reported use where appropriate. A bare medication name in an old note is not an ongoing-use statement.
4. For medicines without that statement, use a prescription only when its documented start and end/duration cover the review date. Calendar days are inclusive: `end = start + durationDays - 1`. A 30-day course starting 22 Sep 2026 is eligible through 21 Oct 2026.
5. Use the clinic's configured time zone (Asia/Kolkata in the prototype). Do not substitute ingestion time for the start date. Date-only values must remain calendar dates.
6. Exclude expired, future, stopped, superseded and indeterminate courses from the current list. Do not infer an indefinite course from missing duration, calculate duration from tablet count without validated instructions, or combine conflicting schedules.
7. Display **Ongoing medications** for documented ongoing statements and **Current medications** for a prescription-window match. In Situation, use natural prose such as “His medication record lists Metformin 500 mg and Amlodipine 5 mg,” with condition and medication names in bold and connecting words regular. Neither a prescription nor this date calculation proves adherence. Situation mentions medicine names/strengths briefly; Background adds available dose/schedule in brackets. Full instructions remain in visit and medication-table views.
8. Keep the source date and classification basis in the structured output/evidence even when the compact row hides them. Recompute eligibility for the request's review date. Explicit ongoing statements without an end remain *documented ongoing*, not a promise that the patient is taking them today.

`summaryMedications` in the prototype accepts reconciled, normalized records; it is not a medication reconciliation engine. Live reconciliation and extraction are backend work. The default mock demonstrates the prescription fallback using September's courses. The explicit ongoing-statement path is tested separately. No live answer-generation changes are made by this gallery.

## Background retrieval and formatting

Tatva Practice's history domains are Medical Condition, Allergies, Family History, Lifestyle and Surgical History, plus additional notes and relevant specialty history. Read structured fields and source-written narrative. Keep meaningful condition duration/status, allergy reaction/severity, procedure/laterality, relationship, smoking/alcohol details and specialty context when available. Preserve negation and attribution.

Examples of compact rows:

- Chronic: Type 2 diabetes (7 years), hypertension (recorded active).
- Allergies: Penicillin (anaphylaxis).
- Surgical: Appendectomy (2019).
- Ongoing medication: [documented name and strength] ([documented schedule]).
- Current medications: Metformin 500 mg (twice daily · after meals), Amlodipine 5 mg (once daily).

These are formatting examples, not additional facts for the default synthetic patient. Omit absent rows rather than filling them with “unavailable” or “unconfirmed.” Preserve important uncertainty in the actual fact (for example a suspected diagnosis), not as repetitive missing-field commentary.

## Observation selection

For vitals, use the most recent valid recorded encounter set and retain units, laterality/posture where relevant and its date. If selecting different latest values from multiple encounters, retain the date per observation and use separate dated groups when a single tag date would misrepresent them. Never label old measurements “today.”

For key labs, select the latest valid result per test. Preserve source abnormal/critical flags, reference intervals and units; do not apply invented thresholds. A historical abnormal result superseded by a later normal result is not the latest abnormal finding. Do not silently discard source-critical results. Relevant normal results can be included when supported by the question/context. Values without dates or compatible units must not be used for unsupported temporal comparisons.

Bulk up/down icons have text alternatives. They reflect the source's high/low flag; an upward arrow does not imply a worsening trend. Lab dates remain in source metadata and evidence even though the compact Latest key labs label omits them.

## Prominent information and evidence

Place important conditions, source-marked critical findings and material conflicts as compact source-linked tags at the end of Situation. Allergy/reaction facts belong in the Situation sentence, with severe reactions emphasized. Do not render a separate Important clinical context section. Important documented conditions such as cancer or HIV can appear as bold clinical context, with meaningful state such as remission where recorded. These names alone do not imply emergency, severity or a new diagnosis. Avoid both hiding material context and turning every diagnosis into an alert.

Every clinical statement and observation must resolve to a source from the same patient, with event time and exact source location. Retrieve broadly; cite the selected supporting facts. Missing retrieval coverage is tracked separately and must never become “no disease.” Access restrictions and service errors are not missing clinical facts.

Use Tesseract SectionCard, compact neutral section bars, unboxed medical icons, and the existing Velora ChartAnswerCard/Citation/EvidencePanel. Avoid another evidence layout. Source details provide depth without duplicating the overview's history rows.

## Focused views

- **Medical history:** conditions, allergies, family/lifestyle/surgery/additional/specialty history that exists. Documented ongoing treatment may remain part of its source-written history; do not add a prescription-history dump or a separately inferred historical course.
- **Visit summary:** selected visit only. Preserve every available source-written section in order: Symptoms, Diagnosis, Medication, Vitals, Examination, Lab investigations, Additional notes. Keep complete names, doses, routes, schedules, timing, durations and notes exactly as recorded. Omit absent sections. Original recorded plans remain attributed to that visit; no new recommendations.
- **Visit history:** dated expandable timeline with the same full visit body.
- **Data analytics:** vital and lab trends with line/bar charts and a table alternative.
- **Data tables:** current medications, medication history, lab records and vital records. No separate Clinical category, Medication summary, Allergies summary, or lab-comparison card.

## Validation and rollout boundary

Validate dates, identity, stop/supersession status, citation resolution and source wording before rendering. Test course start/end boundaries, expired/future courses, explicit ongoing statements, partial history, empty records, conflicting sources, differing observation dates, and correct separation of patient versus visit summaries. Show no mock fallback in live patient answers.

The catalog is an isolated presentation prototype. Backend JSON generation, clinical prioritization, reconciliation, specialty adapters and clinical review are still required before deployment. A concise overview does not claim that no clinical information exists outside retrieved records.

## Actual Tatva Practice retrieval mapping

Verified against the local Copilot source in `search/retrieval.py`, `search/overview.py` and `ingestion/transform/`. These are current source-code capabilities, not proof that every field is populated in preprod.

| UI content | Source family and normalized fields | Verified raw origin / caveat |
|---|---|---|
| Visit anchor | `case`: `caseId`, `appointmentId`, `eventDate`, `eventAt`, doctor/department | `tbl_case_manager`; join clinical items by `caseId`, not merely matching dates |
| Presenting concern | `symptoms`: name, since, severity, note | `tbl_case_manager.tcm_history_box`, parsed with its type |
| Examination | `examination`: finding name, note | `tbl_case_manager.tcm_examination_box` |
| Diagnoses | `diagnosis`: name, code, type, since, remarks | `tbl_casemanager_diagnosis`, linked through the case row's `tcd_id` list |
| History | `medical_history`: section, title, assertion, status, since, relationship, medication, note | `tbl_micro_patient_medical_history.medical_history`; section IDs: 1 lifestyle, 2 medical, 3 family, 4 allergy, 5 surgical |
| Prescriptions | `medicine`: brand/generic/ingredients, dose, unit, slots, quantities, timing/frequency, duration, remarks | `tbl_case_manager` medicine fields (`tcm_tmm_*`) via medicine parser; not a verified active-use list |
| Vitals | `vitals`: measure name, source column, text/numeric values, unit, systolic/diastolic, implausible, measurement source | `tbl_casemanager_vitals`; timestamp from its recorded creation fields |
| Body composition | `body_composition`: measure, values, unit, implausible | `tbl_casemanager_b_composition` |
| Results | `lab_result`: test/panel, values, unit, interval, abnormal flag, result time/precision, sample/service identity | `lab-parameters.results` and `lab-parameters.lab_reports`; result date must not be relabeled collection date |
| Narrative assessment | Diagnosis remarks, examination notes, `dynamic_module.itemTitle/itemNotes`, validated narrative excerpts | No dedicated general `assessment` field is guaranteed. Require explicit content and source location. |
| Plans excluded from default | `investigation`, `advice`, `followup` | Orders, `tcm_advice`, `tcm_followup_date/advice`; follow-up assertion is planned, not attended |

All records carry patient/tenant identity and provenance such as `id`, `sourcePath`, `tableName`, `rowId`, `caseId`, event date and author where available. Demographics, reconciled medication use, administration, completed procedure status and specialty data may need an additional verified adapter. Do not fabricate field names or infer these from a generic text blob.


## Clinical basis and design conclusion

An overview should help a doctor answer five questions: who is being reviewed, what has been happening, what background affects interpretation, what the latest observations actually show, and what care is documented so far. It should support opening the relevant source without rereading the whole chart.

The **International Patient Summary** identifies problems, allergies/intolerances and medications as mandatory sections; it also distinguishes other sections such as results, procedures, vital signs, social history and functional status. This is a useful content checklist, not a claim that this interface implements an IPS document. See the [HL7 IPS 2.0.1 logical model](https://www.hl7.org/fhir/uv/ips/2.0.1/en/StructureDefinition-IPSSectionsLM-definitions.html).

The IPS section guidance distinguishes an explicitly recorded absence of allergies or medication from unavailable information. Medication data may originate from statements, prescriptions or dispensations; the origin matters. This supports explicit provenance and unknown-state handling in our overview. See [HL7 IPS section descriptions](https://www.hl7.org/fhir/uv/ips/ipsStructure.html).

AAFP describes configurable patient and problem-oriented summaries as a way to reduce chart review, including demographics, relevant problems, medications and problem-specific measurements. Its pre-visit planning guidance also emphasizes clarifying the patient's agenda and reviewing medication information. This supports a context-sensitive briefing rather than one identical exhaustive list for every question. See [AAFP chart review guidance](https://www.aafp.org/practice-operations/administrative-simplification/chart-review/techniques-chart-review-burden) and [pre-visit planning](https://www.aafp.org/fpm/2015/1100/p34).

SBAR is a communication framework: Situation, Background, Assessment, Recommendation or Request. Its assessment normally includes a clinician's interpretation. Our adapted **Patient overview** uses Assessment for objective observations only; clinician-written assessment is preserved in the separate visit summary. It is not an AI assessment or a complete SBAR handoff. [AHRQ TeamSTEPPS](https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/sbar.html).

Medication reconciliation requires determining what the patient actually uses and comparing records; a prescription list alone does not perform that reconciliation. [AHRQ MATCH](https://www.ahrq.gov/patient-safety/settings/hospital/match/intro.html). Record integrity also depends on authorship, amendments and corrections, not merely summarizing text. [AHRQ diagnostic documentation guidance](https://www.ahrq.gov/diagnostic-safety/resources/issue-briefs/dxsafety-ehr-impact4.html).

**Product interpretation:** prefer a short overview with progressive detail. Keep material allergies, conflicts and source-supplied critical findings visible. Retrieve broadly enough to establish coverage, but do not turn every retrieved row into a sentence. The proposed display limits and ordering below are product choices to validate with doctors; these sources do not establish a universally best word count or prove this AI summary clinically complete.


See [section catalog](./SUMMARY-SECTION-CATALOG.md) for intent triggers, source fields, formatting/display and missing-data rules for every section, including Last Visit/Visit Summary and trend variants.

Vitals citation rule: place deduplicated source references beside the Latest vitals tag, not after every value. Keep source IDs on individual observations internally. A shared calendar date alone is not proof of a shared record; retain all contributing source references when necessary. Wrapped values continue from the section’s left edge beneath the tag.

Patient overview allergy placement: show allergy/reaction context in the Situation sentence, without a duplicate Background allergy row. The standalone Medical history view retains its Allergy section.

Current symptom collector: use verified current-encounter `summary_json_doctor.symptoms` before historical visit symptoms, preserving name/duration/severity/notes and patient-report attribution. Source mapping and the parameter-based Situation composition contract are specified in SUMMARY-SECTION-CATALOG.md.
