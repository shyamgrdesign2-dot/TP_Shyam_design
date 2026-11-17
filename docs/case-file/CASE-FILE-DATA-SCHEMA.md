# Case File: the structured data (JSON schema)

17 Nov 2026. For the developers who build the extraction service and the backend.

This is the shape a digitized paper file is stored in, section by section. Every example below comes from the export code run on one real patient folder (six PDFs, 275 pages). Nothing is made up. The full output is in [`case-file-example.json`](case-file-example.json).

The code that builds it:

| What | Function | File |
|---|---|---|
| Every row except the hospital course | `buildDigitization(findings)` | `src/components/archived-records/rxFormat.js` |
| Medical history in the product's own table shape | `buildMedicalHistory(findings)` | `src/components/archived-records/medicalHistory.js` |
| Hospital course, one entry per stay | `buildHospitalCourse(bundle, options)` | `src/components/archived-records/hospitalCourse.js` |

## 1. Rules that apply to every section

1. A field is filled only from what the page says. Nothing is computed (no duration from a tablet count) and nothing is guessed (no "After food").
2. What has no field of its own goes to `notes`, so no detail is dropped.
3. Every row carries `_source`. It is how a row is traced back to the paper and how the page viewer marks the words (see `CASE-FILE-DIGITIZATION-AND-MARKING.md`).
4. Rows use the keys the Rx pad and VoiceRx already use, so a row can be copied into a prescription and counted in analytics without another conversion.
5. The same fact on several pages is one row. Its other pages are kept as `also` citations on the fact.

### `_source` (on every row)

```json
"_source": {
  "factId": "dx1",
  "encounterId": "E1",
  "page": 164,
  "region": "p164-final-dx",
  "asWritten": "Diagnosis - Closed left neck of femur fracture",
  "confidence": 0.96,
  "status": "draft"
}
```

| Field | Meaning |
|---|---|
| `factId` | Id of the fact in the bundle |
| `encounterId` | The visit or stay it belongs to (`encounters[].id`) |
| `page` | Page number in the patient's folder, counted across all PDFs (1 to 275 here) |
| `region` | Id of the cited line on that page. Always starts with `p<page>-`. Its box on the image is in `regions.json` |
| `asWritten` | The words exactly as on the page, spelling mistakes included |
| `confidence` | 0 to 1. Typed and clear 0.95; clear handwriting 0.8 to 0.9; hard handwriting 0.7 or lower |
| `status` | `draft` until a reviewer verifies it, then `verified` |
| `corrected`, `readAs` | Only when a reviewer changed the row: `readAs` is the row as first read |
| `reviewedBy`, `reviewedAt` | Who verified or corrected it, and when |

## 2. Patient and encounters

```json
"patient": { "name": "Flavy Picardo", "sex": "Female", "age": 84, "cite": { "page": 164, "rid": "p164-age-sex" } }
```

```json
{
  "id": "E1", "type": "IPD", "department": "Orthopaedics",
  "startLabel": "5 Nov 2026", "endLabel": "12 Nov 2026", "sortKey": "2026-11-05",
  "entry": "emergency", "outcome": "discharged",
  "entryEncounterId": "E2", "ref": "1127801"
}
```

| Field | Values |
|---|---|
| `type` | `IPD`, `OPD`, `ER`, `DAYCARE`, `TELE`, `OTHER` |
| `entry` | `emergency`, `referral`, `fromOpd`, `transfer`, `planned`, `direct`, or absent when the file does not say |
| `outcome` | `discharged`, `lama`, `transferred`, `died`; an emergency visit that led to a stay is `admitted` and names it in `admissionId` |
| `entryEncounterId` | On a stay: the emergency visit it began with |
| `ref` | The admission or visit number as written |

This folder has four encounters: two stays (IPD 1, General Medicine, 15 to 21 May 2026; IPD 2, Orthopaedics, 5 to 12 Nov 2026), each entered through an emergency visit.

## 3. Medical History

Stored two ways, holding the same facts.

### 3a. As rows: `medical_history`

```json
{
  "type": "medical_condition",
  "name": "Type 2 diabetes mellitus",
  "enable": "Y",
  "status": "Active",
  "duration": "18 Year(s)",
  "medication": "Yes",
  "notes": "On OHAs",
  "_source": { "factId": "dx10", "page": 164, "region": "p164-final-comorbid", "asWritten": "T2DM,HTN,Acute Bronchitis, SCC right gluteal skin s/p WLE(2017)", "...": "..." }
}
```

| `type` | Rx pad section | Fields after `type`, `name`, `enable` |
|---|---|---|
| `medical_condition` | Medical Condition | `status`, `duration`, `medication`, `notes` |
| `allergy` | Allergies | `status`, `duration`, `notes` |
| `surgery` | Surgical History | `dateType` (`year` or `full`), `date`, `notes` |
| `family_history` | Family History | `relation`, `notes` |
| `lifestyle` | Lifestyle | `status`, `duration`, `notes` |
| `others` | Additional History | `name`, `notes` only (free text) |

- `enable`: `Y` the patient has it; `N` the page says they do not. A denial is data too: "Known Drug Allergies: No [x]" is stored as `{ "type": "allergy", "name": "Drug allergy", "enable": "N" }`, and "no h/o RAD / IHD" gives two `medical_condition` rows with `enable: "N"`.
- `status`: `Active` or `Inactive`, only when the page supports it. The skin cancer excised in 2017 with "no recurrence" is `Inactive`.
- `duration`: count and unit in the Rx pad's words, `"18 Year(s)"`.
- A past operation is a `surgery` row with its year: `{ "name": "Wide local excision with primary closure, squamous cell carcinoma of right gluteal skin", "dateType": "year", "date": "2017" }`.

### 3b. As the product's table: `tbl_micro_patient_medical_history.medical_history`

```json
{
  "tmmhs_id": 2,
  "title": "Medical Condition",
  "no_know_history": false,
  "tags": [
    { "tmmhst_id": 0, "title": "Type 2 diabetes mellitus", "enable": "Y", "status": "Active", "since": "18 Year(s)", "medication": "Yes", "note": "On OHAs", "_source": { "factId": "dx10", "page": 164, "region": "p164-final-comorbid", "asWritten": "..." } },
    { "tmmhst_id": 0, "title": "Reactive airway disease", "enable": "N", "status": "", "since": "", "medication": "", "note": "", "_source": { "factId": "hx3", "page": 21, "region": "p21-kco", "asWritten": "..." } }
  ],
  "medical_history_remarks": "No travel history, no similar illness before\nImmunisation status not known"
}
```

`tmmhs_id`: 1 Lifestyle, 2 Medical Condition, 3 Family History, 4 Allergies, 5 Surgical History, 6 Additional History. Additional History is the first entry's `medical_history_remarks`. A section the page marks empty as a whole ("no known allergies", nothing named) is `no_know_history: true`.

## 4. Diagnosis: `diagnosis`

```json
{
  "name": "Closed left neck of femur fracture",
  "type": "Final",
  "duration": "",
  "status": "Confirmed",
  "notes": "After a slip and fall at home",
  "icd_code": "S72.0",
  "_source": { "factId": "dx1", "page": 164, "region": "p164-final-dx", "asWritten": "Diagnosis - Closed left neck of femur fracture", "confidence": 0.96, "status": "draft" }
}
```

```json
{
  "name": "Volume overload",
  "type": "Provisional",
  "status": "Suspected",
  "notes": "For desaturation",
  "_source": { "factId": "dx2", "page": 42, "region": "p42-imp", "asWritten": "? Volume overload / Basal atelectasis", "confidence": 0.7 }
}
```

| Field | Values |
|---|---|
| `type` | `Final`, `Secondary`, `Provisional` |
| `status` | `Confirmed`, `Suspected`, `Ruled Out`. "?" or "suspected" on the page is `Suspected`; a status is written only when the page gives one or it is a final diagnosis read clearly |
| `icd_code` | Only when a code is printed or written on the page |

Long-standing conditions (diabetes, hypertension) are Medical History, not Diagnosis.

## 5. Procedures: `surgery`

```json
{
  "name": "Left hip bipolar hemiarthroplasty, cemented",
  "type": "Surgery",
  "date": "7 Nov 2026",
  "time": "",
  "anaesthesia": "Block + Spinal",
  "notes": "Southern Moore approach",
  "_source": { "factId": "proc1", "page": 268, "region": "p268-indication", "asWritten": "Left Hip Bipolar Hemiarthroplasty (cemented)", "confidence": 0.96 }
}
```

`type` is `Surgery` (in theatre) or `Procedure` (at the bedside: skin traction, catheterisation). A past operation from history is a Medical History `surgery` row, not this.

## 6. Medicines: `medications`

```json
{
  "name": "Augmentin 1000 mg Duo",
  "generic": "Amoxycillin + clavulanate",
  "type": "Tablet",
  "dosage": "",
  "frequency": "1-0-1",
  "when": "",
  "duration": "1 Week(s)",
  "notes": "",
  "stage": "On discharge",
  "_source": { "factId": "med1", "page": 166, "region": "p166-rx-augmentin", "asWritten": "AUGMENTIN 1000MG -DUO · Generic: AMOXYCILLIN 875 MG | CLAVULANATE POTASSIUM 125 MG · TABLET · 1 - 0 - 1 · 1 week" }
}
```

| Field | Rule |
|---|---|
| `name` | Brand and strength as written |
| `generic` | Only when the page names it |
| `type` | Tablet, Capsule, Syrup, Injection, Eye drops, Nebulisation, Inhaler, Ointment... |
| `dosage` | Units per dose ("1 Tablet"), only when written |
| `frequency` | Slots kept as written (`1-0-1`); `1x1` becomes `OD`, `2x1` `BD`, `3x1` `TDS`, only where the conversion is exact |
| `duration` | `"1 Week(s)"`, only when written |
| `stage` | `At home` (before admission), `In hospital`, `On discharge` |
| `notes` | Route, dilution, "last dose", anything else |

An in-hospital example: `{ "name": "Tramadol 50 mg", "type": "Injection", "frequency": "Q12H", "notes": "50 mg in 100 ml NS, IV, ...", "stage": "In hospital" }`. Medicines given in hospital are kept only when a later doctor needs them (antibiotics, steroids, anticoagulants, insulin, opioids, blood products).

## 7. Lab results: `lab_results`

One row per reading, so a trend can be drawn from the rows alone.

```json
[
  { "reportName": "Electrolytes", "testName": "Potassium", "value": "3.5", "units": "mmol/L", "refRange": "", "arrowDirection": "",     "date": "5 Nov 2026", "_source": { "factId": "lab8", "page": 259, "region": "p259-abg", "...": "..." } },
  { "reportName": "Electrolytes", "testName": "Potassium", "value": "3.3", "units": "mmol/L", "refRange": "", "arrowDirection": "down", "date": "7 Nov 2026", "_source": { "factId": "lab8", "page": 259, "region": "p259-abg", "...": "..." } }
]
```

| Field | Rule |
|---|---|
| `reportName` | The panel (Complete blood count, Electrolytes, Coagulation profile...) |
| `value`, `units`, `refRange` | As printed |
| `arrowDirection` | `up` / `down` only when the report flags it or it is outside the printed range |

Known gap: in a series, every reading's `_source` points at the latest reading's page. Each reading must carry its own page and region (see the checks in `CASE-FILE-DIGITIZATION-AND-MARKING.md`).

## 8. Vitals: `vitals_and_body_composition`

Only one set is stored: the last set in the file with at least three main vitals.

```json
{
  "date": "11 Nov 2026",
  "notes": "Evening handover, day before discharge, GCS 15",
  "blood_pressure": "130/80",
  "pulse": "88",
  "spo2": "98%",
  "temperature": "98.6 F",
  "respiratory_rate": "20",
  "_source": { "factId": "vit2", "page": 121, "region": "p121-vitals", "asWritten": "Temp 98.6F  Pulse: 88bpm  Resp 20bpm  BP: 130/80mmHg  SpO2 98%  GCS 15" }
}
```

Other keys when written: `height`, `weight`. Readings from two moments are never merged into one set.

## 9. Clinical notes

Five groups, each stored under the Rx pad's own key. Notes that cannot be structured (opinions, "keep in mind" remarks, free commentary) are not stored as rows.

| Group on screen | Stored under | Fields |
|---|---|---|
| Symptoms | `symptoms` | `name`, `duration`, `severity` (Mild, Moderate, Severe), `notes` |
| Examination | `examinations` | `name`, `notes` |
| Investigations (imaging, ECG, echo, biopsy: the impression) | `lab_investigation` | `name`, `notes` |
| Operation notes | `others` with `kind: "Operation notes"` | `name`, `notes`, `kind` |
| Advice and follow-up | `advice`, `follow_up` | `name`, `notes` |

```json
{ "name": "Pain over left hip", "duration": "", "severity": "Severe", "notes": "Sudden onset, non radiating, after a slip and fall at home. No loss of consciousness, ENT bleed or seizures.", "_source": { "factId": "sym1", "page": 164, "region": "p164-complaint", "asWritten": "Pain over left hip" } }
```

```json
{ "name": "CT brain, plain", "notes": "Chronic small vessel ischaemic changes with age related cerebral atrophy. No evidence of trauma related neuro-parenchymal injury.", "_source": { "factId": "rpt8", "page": 165, "region": "p165-ct-brain" } }
```

```json
{ "name": "Suture removal at local hospital", "notes": "Suture removal on 21/11/2026 (Saturday) at the local hospital.", "_source": { "factId": "rpt59", "page": 167, "region": "p167-follow-up" } }
```

## 10. Hospital course: `hospital_course`

The hospital course is the paragraph the file writes, stored as written. It is not broken into dated rows and not rewritten. One entry per stay:

```json
{
  "encounterId": "E1",
  "type": "IPD",
  "department": "Orthopaedics",
  "admittedOn": "2026-11-05",
  "dischargedOn": "2026-11-12",
  "days": 7,
  "entry": "emergency",
  "outcome": "discharged",
  "text": "The patient came with the above mentioned complaints and was clinicoradiologically diagnosed as mentioned above. After appropriate pre-anaesthetic clearances and informed consents, the patient underwent on 07/11/2026. Intra-op and Post-op period was uneventful. Wound inspection was done as per unit protocol on POD2, POD4, and was found to be healthy. The patient underwent supervised physiotherapy in the form of PWB mobilization with crutches, knee ROM, sQSE, ankle pumps. The patient is symptomatically better, hence being discharged with the following advice",
  "textSource": "asWritten",
  "events": [],
  "_source": { "factId": "rpt31", "page": 166, "region": "p166-course" }
}
```

Where the text comes from, in this order:

1. The stay's discharge summary: the box headed "Course of Treatment in the Hospital", "Course in hospital" or "Hospital course".
2. If the file has no discharge summary for the stay: the course written on the visit the stay began with, i.e. the emergency record's course and disposition note.
3. Only if nothing in the file is written as a course: dated rows in `events` (`kind`, `date`, `time`, `day`, `title`, `note`) and `textSource: "fromEvents"`. Neither stay in this file needs this.

The two stays in this file:

**IPD 2 · Orthopaedics, 5 to 12 Nov 2026** (discharge summary, page 166, "Course of Treatment in the Hospital"):

> The patient came with the above mentioned complaints and was clinicoradiologically diagnosed as mentioned above. After appropriate pre-anaesthetic clearances and informed consents, the patient underwent on 07/11/2026. Intra-op and Post-op period was uneventful. Wound inspection was done as per unit protocol on POD2, POD4, and was found to be healthy. The patient underwent supervised physiotherapy in the form of PWB mobilization with crutches, knee ROM, sQSE, ankle pumps. The patient is symptomatically better, hence being discharged with the following advice

The page itself leaves out the operation's name after "underwent". It is kept that way: the text is stored as written, and the operation is in `surgery`.

**IPD 1 · General Medicine, 15 to 21 May 2026** (no discharge summary in the file; the emergency record's course note, page 22):

> Patient is conscious and oriented. Patient seen by EMD PG and medicine PG. Advised for admission. Patient and party willing for admission. medicine reconciliation done. 20G Venflow secured on (R) hand.

## 11. What the file does not give

- `notFound`: what a reader would expect and is not in the folder (for example a histopathology report).
- `pagesUnread`: pages that could not be read at all.
- `vitalsNotShown.count`: vitals sets kept on paper but not stored.
- Normal labs that are not listed are counted, not stored.
