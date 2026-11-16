# Case File against the MAHE RFP: are we on the right path

16 Nov 2026 · Read with CASE-FILE-FORMATTING-GUIDE.md

This is a check of the Case File UI draft against the RFP application workbook (`RFP_Application_Mahe Hospitals_Digitization_v1 1.xlsx`). All 9 sheets were read. Sheet names, requirement IDs and field names are quoted as written in the workbook. The draft was read from `src/components/archived-records/` (mock, store, story builder, review, documents, search, source viewer, and the new `rxFormat.js`) and from the three documents in this folder. Nothing on the backend exists yet; that is the agreed order (UI first).

**Short answer:** the draft is right on safety and honesty, which is the hardest part of the RFP. It is thin on three things the RFP scores: who the patient is, who signs off, and how the data leaves for the HIS and the Data Lake. The data is now in the prescription pad's shape, which helps, but a few RFP fields still have no place of their own.

---

## 1. Workbook map

| Sheet | What it asks for |
|---|---|
| "01 RFP Overview" | Scope and ground rules. About 20 to 30 million scanned pages across 6 hospitals, a 7-year term, and two targets: the "Integrated HIS" and the MAHE "Data Lake". Key line: "Never treat unverified AI-extracted clinical values as authoritative". |
| "02 Compliance Matrix" | 104 mandatory requirements: D01 to D10 discovery, O01 to O15 OCR and classification, C01 to C18 clinical structuring, Q01 to Q12 quality and review, I01 to I12 integration, S01 to S15 security, P01 to P12 operations, G01 to G10 governance. The vendor answers Y/P/N with evidence. |
| "03 Source Inventory" | One row, SR01 medical records department; PDF, PDF/A, TIFF, JPEG. "Match Keys" are "Patient ID, hospital, encounter ID, document date". |
| "04 Data Output Schema" | 12 output domains, each with "Minimum Structured Fields", "Illustrative FHIR Mapping", "Business Rule", "Validation & Provenance" and "Risk". |
| "05 Pilot and Acceptance" | PL01 to PL12: what the pilot must prove (critical-field extraction, reviewer workflow, HIS and Data Lake publish, security, throughput). |
| "06 Delivery & Milestones" | M01 to M10 phases. Schedules are "TBD". |
| "07 SLA and KPIs" | SL01 to SL12. Almost all are "Vendor to propose"; "Critical-field verification" and "Monthly reporting" are "Mandatory". |
| "09 Volume & Unit Rates" | V01 to V15 volume and cost assumptions, including "% records needing manual verification" and "% documents with uncertain patient identity". |
| "11 Vendor Response Guide" | 18 submission components, including "Clinical schema and coding" and a "Demonstration" on real samples. |

---

## 2. Schema coverage

Sheet "04 Data Output Schema", rows 2 to 13. "Draft" means the mock bundle plus the prescription pad rows built by `rxFormat.js`.

| Domain | Fields the RFP lists | Where the draft holds it | Status | What is missing |
|---|---|---|---|---|
| PAT "Patient identity" | "Patient MRN; legacy MRN; enterprise MPI key; facility code; demographic candidates" | Nothing. The mock strips identity; the architecture document's data contract says "Who: Nothing" | Missing | All five fields, a match status (matched, uncertain, quarantined) and an identity review screen. Rule: "Identity review needed when ambiguous" |
| ENC "Encounter" | "Visit/admission ID; clinical dates; encounter type; care location" | `encounters[]`: `id`, `ref` with `refCite` (encounter number and the page it is read from), `type`, `startLabel`, `endLabel`, `sortKey`, `facility`, `department`, `clinician`, `entry`, `outcome` | Partly | Dates are display text, no ISO start and end. No ward or bed field (C02 asks for ward). No crosswalk status or confidence on the link between a fact and its encounter. `entry` and `outcome` carry no citation. "Do not assign uncertain encounters" has no state on screen |
| DOC "Document metadata" | "Source file ID/hash; PDF page; type; specialty; author; event date; scan date; received date" | `documents[]`: `id`, `category`, `title`, `encounterId`, `from`, `to`, `script`; `source.fileId`, `fileName`, `processedOn` | Partly | File hash; specialty, author, event date, scan date and received date per document (D06 wants these dates kept apart). `category` is 6 display folders, not a document-type taxonomy (O05, D04). No duplicate marker (O08) |
| DX "Diagnoses" | "Verbatim diagnosis text; certainty; temporality; coding candidate" | Fact: `verbatim`, `certainty`, `role` (final, working, secondary, chronic), `since`, `coding`. Pad row: `name`, `status`, `duration`, `notes`, `icd_code` | Partly | `temporality` as a field (current, history of, family history: C15). A coding candidate as a structured item (system, code, display, candidate or accepted). `icd_code` today is only a code written on the page. See the note on `status` below the table |
| MED "Medication" | "Drug name; strength; dose; route; frequency; duration; date" | Pad row from `rxRow`: `name`, `dosage` (unit per dose), `frequency`, `when`, `duration`, `notes`; `_source` with the words as written. Fact: `title`, `detail`, `group`, `role`, `verbatim` | Partly | Covered now: drug name, dose (unit per dose), frequency, a place for duration, verbatim beside the row. Still not fields of their own: **strength** (inside `name`, as in "Nexium 40 mg"), **route** (inside `notes`), **date** (only in the fact's `group` text). No generic name or drug code |
| ALG "Allergy" | "Substance; reaction; severity; documented status; provenance" | Fact: `negative`, `title`, `detail`, `verbatim`, `cite`, `also`. Pad row: medical history `type: "allergy"`, `name`, `enable`, `status`, `notes` | Partly | Reaction and severity as fields (they would land in `notes`). The sample has only a "none" entry, so a positive allergy has never been drawn |
| LAB "Lab results" | "Analyte; value; unit; reference limits; abnormal flag; timestamp" | Fact: `title`, `value`, `unit`, `range`, `abnormal`, `dateLabel`, `series`. Pad row: `testName`, `value`, `units`, `refRange`, `arrowDirection`, `date`, `reportName` (empty) | Partly | Value and range are text: no numeric value, no low and high limits. No time of day, no ISO date. No specimen (C06). No LOINC. Some rows hold several analytes at once (electrolytes; PT with INR). `labsNotShown` (9 normal results) are counted but not stored as rows, against O11 "Preserve lab rows" |
| VIT "Vitals" | "Height; weight; pulse; BP; temperature; oxygen saturation; date" | Pad row: `blood_pressure`, `pulse`, `spo2`, `temperature`, `respiratory_rate`, `weight`, `height`, `date`, `notes` | Partly | Each of the RFP's fields now has a key. Missing: a unit per value and a timestamp (rule: "Unit, timestamp and source mandatory"); one set in the sample is "undated"; values are text |
| PROC "Procedures" | "Procedure; surgery; event date; related provider" | Fact: `title`, `dateLabel`, `detail`, `role`. Pad row: `name`, `notes` (a past surgery adds `date`, left empty) | Partly | Event date for a current procedure sits in `notes`, not a field. Provider, anatomical location (C08) and a code ("Code mapping where licensed") are absent |
| RPT "Clinical report narrative" | "Findings; impression; hospital course; follow-up; notes" | Facts with `role`, `group`, `detail`, `verbatim`; page text in `pages[].blocks`; pad sections `symptoms`, `follow_up`, `lab_investigation`, `others` | Covered | Radiology study name and a PACS reference (C10) |
| QC "Extraction quality" | "Field confidence; review status; reviewer; correction; model version" | `confidence` (one per fact), `flags`, `hold`; store `review[id] = {status, by, at, edited}`, `edits`, `original`; `source.engine`; `_source.confidence` and `_source.status` on every pad row | Partly | Confidence per field, not per row. Extraction version per fact. The reviewer is "You" with a locale time string: no user id, role or ISO time. No second reviewer. No reason for a correction (Q09 asks for root causes) |
| ERR "Exception status" | "Unmatched patient; unreadable text; conflicting fields; failed publish" | `exceptions[]` of kind `conflictingValue`, `conflict`, `lowConfidence`, `unreadable`; `notFound`; `source.pagesUnread` | Partly | The kinds "Unmatched patient" and "failed publish". Status, owner, age and resolution of an exception. A worklist across files ("Resolution worklist") |

**Lineage.** `cite {page, rid}` with `also[]` gives document and page, and `_source` now carries fact id, encounter, page, region, the words as written, confidence and review status into every stored row. That is most of O12. Still open: `rid` is a named line on a drawn stand-in page, not a bounding region on a real scan; `_source` keeps only the first citation; and there is no extraction version or record of human changes in it. O12 asks for "document, page, bounding region, extraction version and human changes".

**Two things this check found in `rxRow`, both fixed the same day.** A reading in doubt is no longer converted: a diagnosis gets "Confirmed" only when it is a final diagnosis read clearly, a chronic condition gets no status, and an ambiguous dose keeps its frequency exactly as written. They are kept here because they show how easily a tidy structure can overstate a reading.
1. Diagnosis `status` is "Confirmed" for every diagnosis that is not flagged suspected. A fact whose `certainty` is "as written" or "unclear" therefore reads as Confirmed in the stored row. The DX rule is "Never convert suspected diagnosis into confirmed diagnosis"; an unclear reading should carry its own status, or none. A chronic condition is stored as "Active", which the page does not say either.
2. A dose the mock flags as readable two ways ("1 x 2 tab") is parsed into frequency OD and a dose of 2 tablets. The stored row then looks certain when the fact is not. C14 says "Do not silently reconcile inconsistent ... dosages". A fact flagged ambiguous or in conflict should keep its frequency and dose as written.

---

## 3. Other requirements that touch what a doctor or reviewer sees

| RFP asks | In the draft? | Should it be |
|---|---|---|
| Accuracy targets. The RFP gives no numbers ("Define through pilot"; PL04 "MAHE to set threshold post-pilot") | The bands 0.70 and 0.85 are marked as proposals | Yes, as now. Add: thresholds settable per field and document risk (O10, Q03) |
| Human in the loop. Q04 "role-based review UI showing PDF source and extracted fields side by side"; PL07 "evidence highlighting" | Yes: side by side, highlighted line, verify, edit, remove | Roles are the missing part |
| Maker-checker. Q05; SL05 "Mandatory"; MED row "Human validation / maker-checker" | No | Yes. Note that "Verify N clear" bulk-verifies medicines and labs at 0.85 or above, which sits badly with Q03 "100% review of high-risk items such as medication dose, allergies and lab values" |
| Clinical sign-off and acceptance. Q08, Q12 | No file or batch state | Yes: at least "accepted" and "published" for a file |
| Exception handling. Q06, O09, SL11 queue age | Per file, well done | Add a queue across files, a rescan request and age, for the MRD reviewer |
| Conflicts and no fabrication. C14, C18 | Yes: hold, `conflictWith`, fixed absence sentences, "Not found in this file" | Keep. See the two `rxRow` points above |
| Negation and suspected. C15 | Suspected and "no allergy" are handled | Family history and "history of" are not modelled |
| Audit trail. S06 tamper-evident access, edit and export logs; O13 versions | Specified in the safety rules (4.3), not built | Fine for UI first. The reviewer stamp must become a real user and an ISO time |
| Access, privacy, consent. S05 RBAC and MFA, D10, S02 | Sensitive masking is designed; no reveal control or role check built | Yes. Consent class of a record is not in the data shape |
| Languages and handwriting. D09, O02 | `source.language`, `script`, `handwritten` are shown | The RFP names no languages ("English and relevant Indian languages"). The sample file is Indonesian, not a MAHE-like file |
| Search. O14; I09 "Index specialty, document type, patient identifier, date, location, confidence and status" | Search inside one file is built | Search across files by these fields is not. Show it for the records role |
| Links to the source. I11 | The `[n]` citation and source drawer do this inside the product | A secure, shareable link that the HIS can open is not designed |
| Dashboards and reporting. P04; SL12 "Mandatory"; Q11 reconciliation | No | Needed for the bid, not for the doctor |
| Publish to HIS and Data Lake. I01, I02, I07, I08 | No publish state, acknowledgement or failed-load view | Yes |
| Retention, legal hold, duplicates. D08, O08 | No | A badge on a document would be enough |
| Turnaround and retrieval time | The workbook sets none. Only throughput ("Net accepted pages/day") and queue age, both "Vendor to propose" | Nothing to design yet |

---

## 4. Structure, coding, interoperability, analytics

**Structure.** C16 asks for "documented relational/JSON/FHIR-compatible records, mappings, identifiers, confidence and provenance". `rxFormat.js` now answers the JSON part: `rxRow` maps every fact onto the prescription pad's row, `RX_COLUMNS` gives the pad's column order for each kind of fact, and `buildDigitization` returns the whole file as the pad's `digitization` object with `_source` on every row. Medicines read in pad order: unit per dose, frequency, when, duration, notes. Today only the medicine bracket uses it on screen (`rxQuals` in `findingFormat.jsx`); `RX_COLUMNS` and `buildDigitization` are not yet wired to a table, an edit form or a copy button.

**Raw and normalised together.** C11: "Retain full verbatim source wording alongside structured fields and coded interpretations". C13: "Normalize units and formats only with validated clinical mapping; preserve original values and notation". The new code does this for frequency: 1x1 becomes OD, 2x1 BD, 3x1 TDS, 4x1 QID and "when needed" SOS, and the words as written stay on the fact and in `_source.asWritten`. Two follow-ups. The mapping table needs a clinician's sign-off before it counts as a "validated clinical mapping". The formatting guide (section 8.4 and rule 3 of section 13) has since been updated to say the same: a frequency is converted only to the exact short forms, with the words as written kept beside it.

**What the pad shape does not give the RFP.**
- **Strength, route and date as their own fields** for a medicine. The pad row has no key for them, so strength rides in `name`, route in `notes`, and date is not in the row at all. Add the three keys beside the pad keys; the pad can ignore them.
- **Confidence per field.** `_source.confidence` is one number for the whole row. O10 asks to "Expose field/document/model confidence", and the QC row says "Field confidence". A medicine name read clearly with a dose read poorly needs two numbers.
- **Coding candidates.** C12: "Support configurable mappings to ICD-10, SNOMED CT, LOINC, RxNorm or applicable approved local code systems where licensed". C03 calls them "coding candidates while preserving raw text and uncertainty", so each is a suggestion to review, not a fact. The draft has `icd_code` only when a code is written on the page, and nothing for labs, medicines or procedures.
- **Typed values.** Lab values, ranges, vitals and dates are text. Analytics and FHIR need numbers, low and high limits, units and ISO dates beside the text.
- **When and duration** stay empty unless the page states them, which is correct ("nothing is guessed"). Old files rarely state them, so these columns will be mostly blank; that is honest, not a defect.

**Interoperability.** I04: "FHIR R4-oriented resource mappings where feasible (e.g. Patient, Encounter, Observation, Condition, DocumentReference)". Sheet 04 maps MED to "MedicationRequest/Statement" and RPT to "DiagnosticReport / Composition"; the mock's `DOMAINS.fhir` names only MedicationStatement and DiagnosticReport. A one-page table from pad row to FHIR resource would close this. ABDM, ABHA and NDHM are not mentioned anywhere in the workbook: treat ABDM as our own addition, not something this RFP asks for.

**Analytics.** The RFP asks for no analytics screens. It asks for delivery to the Data Lake (I02 "structured data plus metadata, quality flags and provenance"), exports in "JSON, CSV, Parquet" (I03) and no lock-in for "future HIS, AI, analytics and clinical repositories" (I10). The `digitization` JSON with `_source` is a good start for I02; typed values and codes are what make it usable.

---

## 5. Are we on the right path

Mostly yes on safety, partly off on audience.

The draft's instincts match the RFP's hardest rules almost word for word: the words as written are kept, a suspected diagnosis is never upgraded on screen, "no allergy" is never inferred, conflicts are never quietly settled, an AI draft is visibly apart from a verified fact, every fact is one click from its page, and nothing is left out without being counted. That is the heart of C11, C14, C15, C18 and of the QC and ERR rows. Putting every fact in the prescription pad's structure is also the right move for C16, I02 and I10.

Where the draft goes beyond the RFP: the story summary, the timeline, the Ask row, "Not found in this file" and the panel on the Rx pad. The first four are harmless extras, though the summary rules (three long documents) are far more detailed than anything the RFP scores.

Where it drifts: the RFP's consumers are the "Integrated HIS" and the "Data Lake", and the only screens it requires are the role-based reviewer UI, the exception queues, search and operations dashboards. The draft is built around a consulting doctor reading on TatvaPractice's Rx pad, who sees unverified readings (clear ones are shown, marked "AI draft"). That is on-brief only if TatvaPractice is also the HIS in this program. The workbook calls itself an attachment to "MAHE's Integrated HIS procurement program" and does not say who supplies the HIS, so this needs a decision, not a guess.

Where it is silent on something the RFP scores: patient identity matching, maker-checker and sign-off, publish status, worklists across files, dashboards, and a demonstration on real samples.

---

## 6. Top 10 gaps to close

1. Patient identity and a quarantine for uncertain matches. Sheet 04 row 2 (PAT); "02 Compliance Matrix" D05, I05, I06; "05 Pilot and Acceptance" PL06.
2. Maker-checker, reviewer roles and clinical sign-off; limit bulk verify on critical fields. Q03, Q05, Q12; "07 SLA and KPIs" SL05; PL07.
3. Medicines: the pad row is in place (name, unit per dose, frequency, when, duration, notes, with the words as written). Still to add: strength, route and date as their own fields, a drug code, and no normalising of a dose that is flagged ambiguous. Sheet 04 row 6 (MED); C04, C11, C13, C14.
4. Coding candidates (ICD-10, SNOMED CT, LOINC, RxNorm) as structured, reviewable items. C12, C03; sheet 04 rows 5 and 10.
5. Document metadata and source integrity: file ID and hash, a type taxonomy, specialty, author, and separate event, scan and received dates. Sheet 04 row 4 (DOC); D06, D07, O05.
6. Field-level lineage and quality: bounding region on a real scan, confidence per field, extraction version, a real reviewer id with ISO time, a reason for each correction. O10, O12, O13, Q09; sheet 04 row 12 (QC).
7. Labs and vitals as complete typed rows: one analyte per row, numeric value, low and high limits, specimen, timestamp, unit always present; store the normal results too. Sheet 04 rows 8 and 9; C06, O11.
8. Publish and acceptance states, with HIS and Data Lake acknowledgement and "failed publish", plus a pad-row to FHIR R4 table. I01, I02, I04, I07, Q08; sheet 04 row 13 (ERR); PL08, PL09.
9. A reviewer worklist across files with exception status and age, including "Unmatched patient" and a rescan request. Q06, O09; SL11; sheet 04 row 13.
10. A demonstration on real MAHE-like samples (handwritten, poor quality, Indian languages, lab tables) with real scans, plus search by metadata and a reporting view. "11 Vendor Response Guide" section 18; G01, I09, P04; SL12.

---

## 7. Unclear in the workbook

These are stated as open, not guessed.

- Sheet numbers skip 08 and 10; this copy has 9 sheets. The 7-year commercial sheets that "01 RFP Overview" refers to are not in this file.
- No languages are named, and no accuracy, turnaround or retrieval-time targets are set.
- DOC lists "PDF page" (singular). A page range is implied only by O04, which asks for document boundaries.
- ALG "documented status" and MED "date" are not defined (active or resolved, against stated or negated; prescribed, against started).
- Who provides the "Integrated HIS", and so whether a doctor-facing view is in scope, is not stated.

---

## 8. What to decide next

1. Is TatvaPractice the HIS in this bid? If yes, the doctor's Case File view is in scope; if no, the reviewer tool, the queues and the export are the product and the Rx pad panel is a demo extra.
2. Maker-checker: which fields need two people, and is bulk verify allowed at all on medicines, allergies and labs?
3. May a doctor see unverified readings marked "AI draft", or are medicines, allergies and labs hidden until verified?
4. Identity: do we design the patient-matching and quarantine screen now, and which MAHE identifiers does it show?
5. Stored JSON: agree the pad row plus the extra RFP fields (strength, route, date, typed lab values, confidence per field, coding candidates), and who signs off the frequency mapping table.
6. Publish states: what a file passes through (draft, verified, accepted, published, failed) and who moves it to each.
