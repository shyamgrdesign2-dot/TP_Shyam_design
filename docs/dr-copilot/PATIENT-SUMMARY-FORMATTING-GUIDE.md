# Doctor Copilot: patient summary formatting guide

12 Nov 2026 · For the Doctor Copilot backend and its answer-writing agent

This guide defines how Doctor Copilot **formats a patient summary**. That is the answer to "Summarise this patient", "patient overview", "before the consultation" and similar questions. In the Copilot UI it renders as the **Patient overview** card. "Patient summary" and "patient overview" mean the same thing in this document.

The summary follows an **adapted SBAR** structure: Situation, Background, Assessment, and, in place of SBAR's Recommendation, **Last Visit** (the last recorded Rx). Copilot never recommends; it shows what was last done.

| SBAR | Our section | What it holds | Written as |
|---|---|---|---|
| **S** | **Situation** | The essence of the patient: who they are, what they live with, what is going on now, what to keep in mind | A short narrative, as long as the patient needs (Part B) |
| **B** | **Background** | Medical history (chronic, family, lifestyle, surgical) and current medicines | Labelled rows in shorthand (§4, §5) |
| **A** | **Assessment** | Latest vitals and key labs, as recorded (no AI interpretation) | One dated line each (§6) |
| **R** | **Last Visit** (Last Rx) | The latest completed consultation | One `SX \| DX \| RX` line (Part A, §9) |

The same line formats are reused in the related views: Medical history, Visit summary, Visit history, and the medication, lab and vital tables.

This guide consolidates and improves the formatting parts of our earlier Doctor Copilot docs. **Where an example there differs** (e.g. `Type 2 diabetes (7 years; active)`, `BP: 134/82 mmHg`, a fixed Situation length), **this guide wins.**

What goes into each section (selection and evidence rules) is defined elsewhere:

- [PATIENT-SUMMARY-PROMPT.md](./PATIENT-SUMMARY-PROMPT.md): the generation prompt and JSON contract.
- [SUMMARY-SECTION-CATALOG.md](./SUMMARY-SECTION-CATALOG.md): what each section contains.

This file covers only the **written form**:

- the short line formats;
- abbreviations;
- separators;
- dates;
- what to drop;
- how to keep the summary short when the record is large.

The shorthand follows two references doctors already read every day:

1. **The Tatva Practice Rx print** (`src/utils/server/viewpdf.js`). The summary should read like a compact version of how Tatva Practice prints history, medicines, vitals and labs.
2. **Common Indian prescription usage.** Slot notation (`1-0-1`), OD/BD/TDS/HS/SOS, AF and BF, Tab./Cap./Syp., durations like `30d`, and lab short names like FBS, PPBS and HbA1c.

> **One-line rule:** write every fact in the summary the way a doctor would write it on an Indian prescription pad, not the way a database or a report would describe it.

---

## Part A. Architecture of the patient summary

### A.1 Anatomy

```
┌─ Patient overview ─────────────────────────────── 6 sources  ⌃ ┐
│                                                                │
│ [S] Situation                                                  │
│     Narrative: the essence of the patient (Part B)        [1][4]│
│     Important tags: Ca cervix (FIGO IIB) · Severe allergy …    │
│                                                                │
│ [B] Background                                                 │
│     Chronic: T2DM (10y, On Rx), HTN (7y, On Rx)            [6] │
│     Family: T2DM (Father) | Lifestyle: Smoker (Ex)  …          │
│     Current medications: Metformin 1 g (1-0-1, AF), …      [5] │
│                                                                │
│ [A] Assessment                                                 │
│     Latest vitals (9 Oct ’26) [4]: BP 134/82 | P 76 | Wt 81kg  │
│     Key labs (8 Oct ’26) [7]: HbA1c ↑7.8% | LDL ↑116 | …       │
│                                                                │
│ [R] Last Visit · 9 Oct ’26                                     │
│     SX: Fatigue (1w, Mild) | DX: T2DM, HTN | RX: … +2 more [4] │
│                                                                │
│ Evidence: 42 records · View sources ↗                          │
└────────────────────────────────────────────────────────────────┘
```

### A.2 Levels of hierarchy

There are five levels, always in this order. Do not add a sixth.

| Level | Element | Example | Style |
|---|---|---|---|
| 1 | Card title and source count | `Patient overview · 6 sources` | Card header |
| 2 | Section tag (S, B, A, R) with icon; Last Visit carries its date | `Last Visit · 9 Oct ’26` | Neutral grey tag and divider |
| 3 | Inline field label | `Chronic:`, `Latest vitals (9 Oct ’26):`, `SX:` | Small, light, icon-free |
| 4 | Clinical value | `T2DM`, `Metformin 1 g`, `BP 134/82` | Dark, medium weight |
| 5 | Bracket detail and citation | `(10y, On Rx)` `[6]` | Lighter, regular |

### A.3 Section rules

- **Fixed order: S → B → A → R.** Never rename, reorder, merge or add sections ("Clinical summary", "Prescription context", "Notes"). Free-form headings are not allowed.
- **Omit, don't fill.** A section with no facts is left out entirely. No "No data available" or "Not recorded" placeholders. If the patient has no clinical facts at all, show the single no-records state instead of the card.
- **One home per fact.** Each fact has one primary section:
  - who and what is going on → Situation;
  - history and medicines → Background;
  - measurements → Assessment;
  - what was done at the last consultation → Last Visit.

  A fact is repeated only when it is critical (e.g. a severe allergy, or a cancer under treatment stated in Situation and listed in Background).
- **Rows, not paragraphs, in B, A and R.** Only Situation is prose.
- **Citations at the row level.** One deduplicated citation set at the end of a row or group, not after every value.
- **No disclaimers in sections.** Scope and coverage notes ("indexed records through 5 Nov ’26") go in one footer line, never inside S, B, A or R.

### A.4 Data shape returned by the backend

The agent returns facts. A deterministic formatter builds the display text (§10).

```json
{
  "situation": {
    "text": "58-year-old man with **T2DM** (10y) and **HTN** (7y) …",
    "sources": ["…"],
    "important_tags": [{ "text": "Ca cervix (FIGO IIB)", "level": "important", "sources": ["…"] }]
  },
  "background": [
    { "label": "Chronic", "items": [{ "name": "T2DM", "detail": "10y, On Rx", "sources": ["…"] }] },
    { "label": "Current medications", "items": [{ "name": "Metformin 1 g", "detail": "1-0-1, AF", "sources": ["…"] }], "more": 2 }
  ],
  "assessment": [
    { "label": "Latest vitals", "date": "2026-10-09", "items": [{ "name": "BP", "value": "134/82" }], "sources": ["…"] },
    { "label": "Key labs", "date": "2026-10-08", "items": [{ "name": "HbA1c", "value": "7.8", "unit": "%", "flag": "high" }], "more": 18, "more_all_normal": true }
  ],
  "last_visit": {
    "date": "2026-10-09",
    "sx": [{ "name": "Fatigue", "detail": "1w, Mild" }],
    "dx": [{ "name": "T2DM" }],
    "rx": [{ "name": "Metformin 1 g", "detail": "1-0-1, AF, 30d" }],
    "sources": ["…"]
  },
  "footer": { "evidence_count": 42, "coverage_note": "Indexed records through 5 Nov 2026" }
}
```

---

## Part B. Situation: how to articulate it

The Situation is the **essence** of the patient. A doctor who reads only this should know:

1. **who** the patient is;
2. **what they live with** (key conditions);
3. **what is going on now** (current or last-visit complaint, a recent change);
4. **what to keep in mind** (allergy, current treatment, serious history, conflict).

### B.1 Length follows the patient, not a rule

- There is **no fixed sentence count**. A new patient with one complaint may need one sentence. A patient on cancer treatment with several conditions may need four or five.
- **Every sentence must earn its place.** If removing a sentence loses nothing the doctor needs before the consultation, remove it.
- **No padding:**
  - no restating the obvious ("This is a summary of the record");
  - no missing-data commentary ("No allergy information is available");
  - no logistics ("Follow-up was booked for …").
- **No truncation either.** Never cut a critical fact to make it shorter. Move detail to B, A or R instead.

### B.2 Clause order

This refines the Situation slot contract in [PATIENT-SUMMARY-PROMPT.md](./PATIENT-SUMMARY-PROMPT.md#parameter-based-sentence-assembly-21-oct-2026) (same semantic slots, now with shorthand and wording rules). Always in this order, so doctors can scan any patient the same way. Every slot is optional: drop empty ones and join neighbours into natural sentences.

| # | Slot | Content | Pattern |
|---|---|---|---|
| 1 | Who | Age and recorded gender | `58-year-old man` · `45-year-old woman` · `6-year-old boy` |
| 2 | Lives with | Key chronic or significant conditions, with duration or status in shorthand brackets | `with **T2DM** (10y), **HTN** (7y) and **DLP**` |
| 3 | Now | Current complaint (symptom collector first), else the last visit's complaint, with its date | `Seen on 9 Oct ’26 for **fatigue** (1w).` · `Reports **fever** (3d) today.` |
| 4 | Change | A new or changed diagnosis, treatment or event at the last visit, only if documented | `**Telmisartan** was started at that visit.` |
| 5 | Treatment | Ongoing or current medicines, names and strength only (schedules live in Background), worded by evidence (B.3) | `Reports taking **Metformin** 1 g and **Atorvastatin** 20 mg.` |
| 6 | Keep in mind | Severe allergy, serious history, pregnancy, immunosuppression, material conflict | `**Penicillin allergy** (anaphylaxis).` |

**Important tags** go at the end of the Situation. These are short, sourced chips for cancer, HIV, source-critical findings or conflicts (at most 3). They are not a separate section.

### B.3 How to write it

**Voice**
- Third person, plain clinical English, the way one doctor briefs another.
- Use the past tense for recorded events (`was seen`, `was started`).
- Use the present tense for ongoing states (`has`, `is on`).

**Shorthand inside sentences**
- Conditions use the §7.1 abbreviations, with bracket details: `**T2DM** (10y)`.
- Durations use `d/w/m/y`; dates use `9 Oct ’26`.

**Bold the anchors only.** Bold condition names, medicine names, the current complaint and a severe allergy. Connecting words stay regular. Never bold a whole sentence.

**Say how we know a medicine is taken.** The wording reflects the evidence:

| Evidence | Write |
|---|---|
| Patient reports taking it | `Reports taking **Metformin** 1 g.` |
| Clinician recorded it as ongoing | `Ongoing **Metformin** 1 g is documented.` |
| Prescription period covers today | `Medication record lists **Metformin** 1 g.` |
| Only an older prescription | Not in Situation. It stays in Last Visit or the medication table. |

Never write "currently prescribed", "taking" (unless patient-reported), "compliant" or "adherent". A prescription is not proof of use.

**Attribute and qualify, briefly**
- Keep `suspected`, `history of`, `in remission`, `resolved` exactly as recorded.
- A past symptom keeps its date: `seen on 9 Oct ’26 for fatigue`, not `has fatigue`.

**Never in the Situation:**
- lists of lab values or vitals (Assessment holds those);
- medicine schedules (Background and Last Visit hold those);
- family or lifestyle detail, unless it directly explains the current problem;
- recommendations, interpretations ("well controlled", "worsening"), risk scores or urgency words;
- hedges and disclaimers ("These are chart entries, not confirmation of …").

### B.4 Examples by patient type

**Chronic follow-up (typical)**
> 58-year-old man with **T2DM** (10y), **HTN** (7y) and **DLP** (5y). Seen on 9 Oct ’26 for **fatigue** (1w, mild), with no fever or chest pain. Reports taking **Metformin** 1 g, **Telmisartan** 40 mg and **Atorvastatin** 20 mg. **Sulfa allergy** (rash).

**Complex: oncology with other conditions**
> 55-year-old woman with **Ca cervix** (SCC, FIGO IIB, dx Mar ’26), on follow-up after chemoradiation (completed Jul ’26), with partial response recorded. Also **HTN** (Off Rx) and **DLP**. Seen on 25 Oct ’26 (gastroenterology) for **perianal discomfort** after a **hemorrhoidectomy** on 18 Oct ’26; **radiation proctitis** recorded in Aug ’26.
>
> Important tags: `Ca cervix (FIGO IIB, post-CRT)` · `Radiation proctitis`

(The live answer for a patient like this used three paragraphs and disclaimers. The Situation above carries the same essence. The detail moves to Background, Assessment and Last Visit.)

**New patient, first visit, symptom collector only**
> 29-year-old woman, new to the clinic. Reports **fever** (3d, Mod) with **body ache** today.

**Labs only, no consultation recorded**
> 34-year-old man. No consultation recorded yet; lab results from 7 Nov ’26 are available.

(The labs themselves go in Assessment as one Key labs line, not in the Situation.)

**Child**
> 6-year-old boy with **BA** (2y, On Rx). Seen on 2 Nov ’26 for **cough** (5d) and **wheeze**. Medication record lists **Salbutamol** inhaler (SOS).

**Explicit critical context**
> 67-year-old man with **CKD 3b**, **T2DM** (15y) and **CAD** (post-PTCA 2022). Seen on 1 Nov ’26 for **pedal oedema** (1w). Medication record lists **Apixaban** 5 mg (anticoagulant). **Penicillin allergy** (anaphylaxis).

### B.5 Before and after

```
Before (live output pattern, paraphrased):
Cervical cancer: Biopsy in <month> showed <histology>. The <month> oncology diagnosis records FIGO
stage <stage>, <extent of involvement> … These are chart entries, not confirmation of current
medication use. …
(three paragraphs, about 250 words, before any vitals or labs)

After:
55-year-old woman with Ca cervix (SCC, FIGO IIB, dx Mar ’26), on follow-up after chemoradiation
(completed Jul ’26). Also HTN (Off Rx) and DLP. Seen on 25 Oct ’26 for perianal discomfort after a
hemorrhoidectomy (18 Oct ’26).
```

---

## 1. What is going wrong today (live preprod output)

These patterns were seen in the live `/chat` answers to "Summarise this patient's record." Examples are de-identified.

| # | What the live answer does | Why it is a problem | Rule |
|---|---|---|---|
| 1 | Lists **every** lab result, one per line (52 lines for one patient) | The doctor cannot find what matters. The overview becomes a lab report. | §6.3: key labs only, abnormal first, at most 6, the rest counted |
| 2 | `HAEMOGLOBIN (CBC): 9.8; unit not recorded; reference 12.0-15.0; recorded flag low.` | Four filler phrases per value. The test name is repeated inside its own panel name. | §6.3: `Hb ↓9.8` |
| 3 | `HbA1c (HbA1c (Glycosylated Hemoglobin)): 4.5` | The panel name duplicates the test name | §6.3: use the short test name only |
| 4 | Repeats `recorded flag normal` on normal values | Normal needs no label | §6.3: no flag means normal |
| 5 | Writes vitals one per line, each with its own date | Six lines for one reading set | §6.2: one line, one date |
| 6 | Writes conditions, history and medicines as paragraphs | Slow to scan. Status and duration are buried in sentences. | §4 and §5: labelled rows in Rx shorthand |
| 7 | Names medicines with no dose, frequency or duration (`prescriptions were recorded for Cremaffin Plus and LOX jelly`) | Unusable for a doctor | §5: `Lox 2% jelly (local, 0-0-1, 14d)` |
| 8 | Keeps pack sizes and capitals from the master (`CREMAFFIN PLUS 200ML SYRUP`) | Pack size is not a dose, and capitals are shouting | §5.2: `Syp. Cremaffin Plus` |
| 9 | Structures the overview as free topics ("Clinical summary", "Prescription context…") | Different every time. It breaks the Situation, Background, Assessment, Last Visit layout. | Keep the four fixed sections, in order |
| 10 | Adds disclaimers inside the body ("These are chart entries, not confirmation of current medication use") | Pushes clinical content down | One scope line in the footer, not in sections |

Our overview prototype (`/copilot-v0` → Patient summary) already has the four sections. Its examples still use long brackets, though, like `Type 2 diabetes (7 years; active)`. **This guide replaces those examples with the Rx shorthand below.**

---

## 2. Principles

1. **Rx shorthand, not prose.**
   - Lists of facts are written as `Name (qualifiers)`, never as sentences.
   - Only the Situation is a sentence.
2. **Name first, details in brackets.**
   - The thing the doctor scans for (condition, drug, test) comes first.
   - Its qualifiers sit in one bracket, in a fixed order, separated by commas. This is the Tatva Practice print pattern.
3. **Drop what carries no information.**
   - Never write `unit not recorded`, `recorded flag normal`, `reference …` (in the overview), `None`, `N/A`, `-`, `Unknown` or `not documented`.
   - An absent token is simply left out.
4. **One date per group.**
   - When everything in a group shares a date, write the date once, in the group label.
5. **Fixed order, every time.**
   - The same section order, the same token order inside brackets, and the same separators.
   - Then answers look identical whether a patient has 3 facts or 300.
6. **Format in code, not in the model.**
   - The agent selects facts and writes the Situation sentence.
   - The display strings (`Metformin 500 mg (1-0-1, AF, 30d)`) should be built by a **deterministic formatter** from structured fields, using the rules below.
   - This is the main fix for overviews that "get messed up" when the record is large.
7. **Never invent.**
   - Abbreviate only from the closed lists in §7.
   - Never convert units, infer a frequency or infer a timing.
   - Never shorten a drug or diagnosis that is not on the list.

---

## 3. Separators and punctuation

| Symbol | Use | Example |
|---|---|---|
| `Label:` | Starts a labelled row (a history domain, a vitals or labs group, SX/DX/RX) | `Chronic: T2DM (8y, On Rx)` |
| `, ` | Between items in one row, and between tokens inside a bracket | `HTN (5y), DLP (3y)` |
| `( )` | Holds the qualifiers of one item. One bracket per item, never nested. | `Penicillin (Rash)` |
| ` \| ` | Between groups on one line: SX \| DX \| RX, and between vital or lab readings | `BP 134/82 \| P 76` |
| `→` | Taper or step-change within one medicine | `(1-0-0, 5d → ½-0-0, 5d)` |
| `+N more` | Count of items left out because of the size budget (§8) | `+3 more` |
| `↑` / `↓` | Source-supplied high/low flag, attached **before** the value | `Hb ↓9.8` |

- No full stops at the end of rows.
- No semicolons inside brackets.
- No nested brackets.

The Tatva Practice print nests a fixed frequency (`(1 Tablet, (BD), After Food)`). Copilot flattens this to `(1 tab, BD, AF)`.

### 3.1 Universal short tokens

These apply **everywhere**: medicines, medical history, symptoms, diagnosis, vitals, labs, and the SX | DX | RX recap. The overview and full views use the same tokens. Only the number of fields shown differs.

| Meaning | Write | Not |
|---|---|---|
| Days / weeks / months / years | `5d`, `2w`, `3m`, `10y` | `x 5 days`, `5 Day(S)`, `Since: 10 Year(s)`, `10 yrs` |
| After food / before food | `AF` / `BF` | `After Food`, `A/F`, `after meals` |
| At bedtime | `HS` | `at night (bedtime)` |
| When required / immediately | `SOS` / `STAT` | `as needed`, `if required` |
| Continue / till required | `Cont.` / `Till reqd` | `To Be Continued`, `Till required` |
| Once / twice / thrice / four times daily | `OD` / `BD` / `TDS` / `QID` | `once daily`, `twice a day` |
| Slots (morning-afternoon-night) | `1-0-1`, `½-0-½`, `1-0-1-1` | `1 - 0 - 1`, `Morning(1) - Night(1)` |
| Quantity | `Qty 60` | `60 qty`, `Quantity: 60` |
| Dose units | `tab`, `cap`, `ml`, `U` (insulin), `puff`, `drop`, `g` | `Tablet`, `units`, `Millilitre` |
| On / off medication (history) | `On Rx` / `Off Rx` | `Medication: Yes`, `on medication` |
| Severity | `Mild` / `Mod` / `Sev` | `severity: Moderate` |
| Status | omit `Active`; write `Inactive`, `Resolved`, `Suspected`, `Ruled out` | `Status: Active` |
| Relative | `Father`, `Mother`, `Sibling`, `Spouse` | `Relative: Father` |
| Right / left / both | `Rt` / `Lt` / `B/L` | `right side` |
| Pack-years (smoking) | `10 PY` | `10 pack-years` |

**No labels inside brackets.** Tatva Practice print writes `Since:`, `Status:`, `since:`, `severity:` and `Relative:`. Copilot drops them: the fixed token order says what each value is.

---

## 4. Background: medical history

The source is `medical_history`, with tag fields `title`, `since`, `status`, `medication`, `relationship`, `date`, `note` and `enable`. The section IDs and print order follow the Tatva Practice print:

**Chronic (2) → Allergies (4) → Family (3) → Lifestyle (1) → Surgical (5)**

The Patient overview places allergies in the Situation sentence. The standalone Medical history view keeps the Allergies row.

### 4.1 Row formats

| Row | Item format | Token order inside the bracket | Example |
|---|---|---|---|
| **Chronic** | `Condition (duration, status, Rx)` | duration → status (only if not Active) → medication | `Chronic: T2DM (8y, On Rx), HTN (5y, Off Rx), Hypothyroidism (2y)` |
| **Allergies** | `Allergen (reaction)` | reaction or note as written | `Allergies: Penicillin (Anaphylaxis), Sulfa drugs (Rash)` |
| **Family** | `Condition (relative)` | relative | `Family: T2DM (Father), HTN (Mother)` |
| **Lifestyle** | `Habit (status, duration or quantity)` | Current/Ex → duration → quantity | `Lifestyle: Smoker (Ex, quit 2018, 10 PY), Alcohol (Occasional)` |
| **Surgical** | `Procedure (date, remark)` | year or `Mon YYYY` → short remark | `Surgical: Appendectomy (2008), Rt cataract surgery (2023)` |
| **Additional** | Short free text, kept as written | none | `Additional: Rotating shifts, irregular meals` |

### 4.2 Token rules

- **Duration (from `since`).** Tatva Practice stores it as typed (`5 Year(s)`, `1 Year`, `8 Month(s)`). Normalise it:

  | Stored | Write |
  |---|---|
  | `1 Year` | `1y` |
  | `5 Year(s)` | `5y` |
  | `8 Month(s)` | `8m` |
  | `2 Week(s)` | `2w` |
  | `3 Day(s)` | `3d` |

  A bare number is days in the Tatva Practice data (`5` means `5d`). Never add "since". The same `d/w/m/y` tokens are used for symptom duration, medicine duration and history duration.
- **Status.** Default `Active` is **not written**, since it is implied in a chronic list. Write `Inactive` or `Resolved` when the source says so. Disabled tags (`enable === 'N'`) are left out entirely.
- **Medication flag.**
  - `medication: Yes` → `On Rx`
  - `medication: No` → `Off Rx`
  - absent → nothing
  - This is the "active or not active on medication" token.
- **Diagnosis names.** Use the abbreviation table (§7.1) for listed conditions. Otherwise keep the recorded name, in sentence case.
- **Negatives.**
  - An explicit "no known history" for a domain prints `NKDA` for allergies, or `No known history` for the others.
  - A missing domain prints nothing.
  - Never write `NKDA` unless it is recorded.
- **Surgery date.** The source is `DD-MM-YYYY` or `YYYY`. Write `2015` or `Mar 2015`. The exact date stays in evidence.

### 4.3 Before and after

```
Before:  Chronic: Type 2 diabetes (10 years; recorded active; on medication), hypertension (7 years; active)
After:   Chronic: T2DM (10y, On Rx), HTN (7y, On Rx)
```

---

## 5. Medicines

### 5.1 Two tiers

| Tier | Where | Format |
|---|---|---|
| **Compact** | Patient overview (Background current or ongoing medicines; Last Visit RX); answers that list medicines in passing | `Name strength (dose*, frequency, timing, duration)` |
| **Full** | Visit summary, Visit history, Medication tables, "show the prescription" | The complete Tatva Practice print token set, in print order: `Name strength (generic, dose, frequency, timing, duration, qty, remarks)` |

\* Dose is shown only when it is not exactly 1 tab or 1 cap (see §5.3).

**Compact examples:**
```
Metformin 500 mg (1-0-1, AF, 30d)
Telmisartan 40 mg (1-0-0, 30d)
Atorvastatin 20 mg (0-0-1, HS, 30d)
Inj. Insulin Glargine (12U, 0-0-1, Cont.)
Pantoprazole 40 mg (OD, BF, 14d)
Paracetamol 650 mg (SOS, max 3/day)
Prednisolone 10 mg (1-0-0, 5d → ½-0-0, 5d)
```

**Full example (Visit summary):**
```
Tab. Metformin 500 mg (Metformin, 1 tab, 1-0-1, AF, 30d, Qty 60, take with meals)
```

### 5.2 Name

- **Strength is part of the name**, as in Tatva Practice (`tmm_medicine_name` carries it): `Dolo 650`, `Metformin 500 mg`.
- **Case.**
  - Convert ALL-CAPS master names to Title case: `CREMAFFIN PLUS` → `Cremaffin Plus`.
  - Keep acronyms (`SR`, `XR`, `MR`, `DS`, `CR`, `ER`, `OD`) and strengths as they are.
- **Pack size is not a dose.**
  - Drop pack quantities from the name: `200ML`, `30GM`, `10'S`, `15 TAB`.
  - `LOX 2% 30GM JELLY` → `Lox 2% jelly`
  - `CREMAFFIN PLUS 200ML SYRUP` → `Syp. Cremaffin Plus`
- **Form prefix**, only when the form is known from the master or the name:

  | Form | Prefix |
  |---|---|
  | Tablet | `Tab.` |
  | Capsule | `Cap.` |
  | Syrup | `Syp.` |
  | Injection | `Inj.` |
  | Ointment | `Oint.` |
  | Drops | `Drops` |
  | Inhaler | `Inh.` |
  | Sachet | `Sachet` |

  - In the compact tier the prefix is **optional**, and dropped for tablets.
  - In the full tier, always include it when it is known.
- **Generic name:**
  - full tier only, as the first bracket token, as in Tatva Practice print (`medicine_with_generic`);
  - not repeated when it equals the brand.

### 5.3 Bracket tokens (fixed order)

| Order | Token | Source | Write | Omit when |
|---|---|---|---|---|
| 1 | Dose | `tmm_dosage` + unit | `½ tab`, `2 tab`, `12U`, `5 ml`, `2 puff`, `1 drop` | exactly 1 tab or 1 cap (compact tier); always kept in full tier |
| 2 | Frequency | slots m-a-e-n, or a fixed frequency master | `1-0-1`, `1-1-1`, `0-0-1`, `1-0-1-1` (4 slots when an evening dose exists); or `OD`, `BD`, `TDS`, `QID`, `HS`, `SOS`, `STAT`, `Weekly`, `Alt. day` | never omit if recorded |
| 3 | Timing | `tmt_title` (not "None") | `AF`, `BF`, `HS`, `Empty stomach`, `With food`, `Before bkfst`, `After dinner` | "None" or absent |
| 4 | Duration | `tmm_days` + type, or a special value | `5d`, `2w`, `3m`, `Cont.`, `Till reqd`, `STAT` | absent; never print `-` |
| 5 | Qty | `display_qty` | `Qty 60` | always in compact; absent in full |
| 6 | Remarks | `tmm_remarks` | short, as written | always in compact; absent in full |

**Slot rules:**
- **Compact digits, no spaces.** The Tatva Practice print has `1 - 0 - 1`; Copilot writes `1-0-1`.
- **Fractions as glyphs:** `½`, `¼`, `¾`, so `½-0-½`.
- **Three slots** are morning-afternoon-night. Use four only when an evening dose is recorded.
- **Keep slots as recorded.** Do not convert `1-0-1` to `BD`: the slots carry time of day.
- **Fixed frequencies.** When the source uses a fixed-frequency master (`tmf_block ≠ 0`), print its short code (`BD`) flat, not in a nested bracket.
- **Taper.**
  - Steps with the same `tmm_id` are joined with ` → ` inside one bracket.
  - Only the changing tokens repeat (Tatva Practice prints `then`).

### 5.4 Medicine lists in the overview

- `Current medications:` and `Ongoing medications:` rows follow the selection rules in CONCISE-SUMMARY-BACKEND.md. This guide only sets the format.
- Items are separated by `, `. Order: chronic-disease drugs first (the order they appear in the source), then short courses.
- **At most 6 medicines in the overview**, then `+N more`. All of them stay in the Medication table.
- **Last Visit RX:** compact tier, at most 5, then `+N more`.

---

## 6. Assessment: vitals and labs

### 6.1 Dates

| Context | Format | Example |
|---|---|---|
| Group labels and overview chips | `D Mon ’YY` | `9 Oct ’26` |
| Full visit header and evidence | `D Mon YYYY` | `9 Oct 2026` |
| Relative (Situation sentence only) | when helpful | `last visit 3 weeks ago (9 Oct ’26)` |

- **Do not use `DD/MM/YYYY` in digital answers.**
  - The Tatva Practice print uses it, but numeric dates are ambiguous on screen.
  - The month name is not.
- **Never use ordinals** (`12th Nov`). The lab print uses them; Copilot does not.

### 6.2 Vitals: one line, one date

```
Latest vitals (9 Oct ’26): BP 134/82 | P 76 | SpO₂ 98% | T 98.6°F | RR 18 | Wt 81kg | Ht 172cm | BMI 27.4
```

- **Order** (as the Tatva Practice print, clinical first): `BP`, `P`, `SpO₂`, `T`, `RR`, `RBS`, `Wt`, `Ht`, `BMI`, `Waist`.
  - For paediatric doctors, `Wt`, `Ht` and `OFC` come first, as in print.
- **Labels and units:**

  | Label | Means | Default unit | Unit shown? |
  |---|---|---|---|
  | `BP` | Blood pressure | mmHg | No (implied) |
  | `P` | Pulse | /min | No (implied) |
  | `SpO₂` | Oxygen saturation | % | Yes: `98%` |
  | `T` | Temperature | °F or °C as recorded | Yes: `98.6°F` |
  | `RR` | Respiratory rate | /min | No (implied) |
  | `RBS` | Random blood sugar | mg/dL | No (implied) |
  | `Wt` | Weight | kg | Yes: `81kg` |
  | `Ht` | Height | cm | Yes: `172cm` |
  | `BMI` | Body mass index | kg/m² | No |
  | `Waist` | Waist circumference | cm | Yes: `92cm` |

  - No space between value and unit, as in the Tatva Practice print.
  - Write the unit whenever the recorded unit differs from the default above (e.g. `Wt 180lb`, `RBS 7.8 mmol/L`).
- **Never convert units.**
  - Indian clinics usually record temperature in °F. Print the recorded unit.
- **One date.** If the selected values come from different dates, use two dated groups. Never one row with per-value dates.
- **Drop implausible or flagged-invalid readings.** They stay in evidence only.
- **Citations:** one deduplicated set after the group label, not after every value.

### 6.3 Labs: key labs only

```
Key labs (28 Oct ’26): Hb ↓9.8 | Hct ↓29.2% | PT ↑13.0 | Urine pus cells ↑13 | +18 normal
```

**Selection (overview), in this order:**
1. **Source-flagged abnormal** results (`H`/`L`/critical), latest per analyte.
2. **Condition-relevant tests** for the patient's recorded chronic conditions (§7.3), even if normal. Example: a diabetic patient always shows HbA1c, FBS or PPBS, and S. Creat when available.
3. **Stop at 6 shown values.** Summarise the rest as `+N normal` (when all remaining are normal) or `+N more`.

**Always exclude from the overview:**
- method or technique rows (`TEST METHOD - …`, `Rapid Immunochromatography`);
- derived duplicates (`eAG` beside HbA1c, `Absolute … count` beside the percentage, `Bilirubin delta`);
- `% NRBC`, `IMG%`, `MPV`, `RDW`;
- blood group;
- serology `Non reactive`, unless asked.

All of these stay in the Lab table and in evidence.

**Value format:** `ShortName flag+value[unit]`, e.g. `HbA1c ↑7.8%`, `LDL ↑116`, `Hb ↓9.8`.

| Rule | Detail |
|---|---|
| Short name | From §7.2. Never `TEST (PANEL)`; drop the panel name. |
| Flag | `↑` / `↓` only when the **source** flags it. No flag means normal. Never write "normal". |
| Unit | **Omit the unit when it is the test's default unit** (§7.2), since Indian doctors read `Hb 9.8` and `S. Creat 1.0` without units. Always keep `%`. Write the unit only when the recorded unit differs from the default (`FBS 6.1 mmol/L`). When the unit is missing, write the value alone. **Never write "unit not recorded".** |
| Reference range | Not in the overview. It goes in the Lab table and evidence, as `(ref 12–15)`. |
| Qualitative results | `HBsAg Reactive`, `Urine sugar ++`. Show only if abnormal or asked. |
| Panels in Data tables | Group by panel: `CBC: Hb 14.2, TLC 6650, Plt 3.45L`. |

**Dates:**
- **One date per group.** If key labs come from two dates, use two groups, newest first:
  `Key labs (28 Oct ’26): …` then `Earlier (7 Sep ’26): …`.
- At most 2 groups in the overview.
- Never revive an older abnormal value over a newer normal one.

**Before and after:**

```
Before (52 lines):
7 Nov 2026: Urea-Serum (Urea-Serum): 13; unit not recorded; reference 19.0-43.0; recorded flag low. [1]
7 Nov 2026: Bicarbonate(HCO3)-Serum (Bicarbonate(HCO3)-Serum): 20; unit not recorded; reference 21.0-28.0; recorded flag low. [2]
7 Nov 2026: HbA1c (HbA1c (Glycosylated Hemoglobin)): 4.5; unit not recorded; reference 4.2-6.2; recorded flag normal. [29]
… 49 more lines

After (1 line):
Key labs (7 Nov ’26): Urea ↓13 | HCO₃ ↓20 | HbA1c 4.5% | S. Creat 0.7 | eGFR 136 | Hb 14.2 | +44 normal [1–52]
```

---

## 7. Closed abbreviation lists

Abbreviate **only** from these lists. Anything not listed is written in full, as recorded, in sentence case. The full names stay in evidence and tooltips.

### 7.1 Conditions

| Write | For |
|---|---|
| `T2DM` / `T1DM` | Type 2 / Type 1 diabetes mellitus |
| `HTN` | Hypertension |
| `DLP` | Dyslipidaemia |
| `CAD` | Coronary artery disease |
| `IHD` | Ischaemic heart disease |
| `CKD` (with stage if recorded: `CKD 3a`) | Chronic kidney disease |
| `COPD` | Chronic obstructive pulmonary disease |
| `BA` | Bronchial asthma |
| `OA` / `RA` | Osteoarthritis / Rheumatoid arthritis |
| `GERD` | Gastro-oesophageal reflux disease |
| `PCOS` | Polycystic ovary syndrome |
| `CVA` | Cerebrovascular accident (stroke) |
| `TB` | Tuberculosis |
| `BPH` | Benign prostatic hyperplasia |
| `NAFLD` / `MASLD` | Fatty liver disease, as recorded |

**Do not abbreviate:**
- cancers;
- atrial fibrillation (`AF` is reserved for "after food");
- hypothyroidism and hyperthyroidism (already short);
- anything rare or ambiguous.

Keep certainty words exactly as recorded: `Suspected`, `?Dengue`, `Ruled out`.

### 7.2 Lab short names

| Write | For | Default unit (omitted when matched) |
|---|---|---|
| `Hb` | Haemoglobin | g/dL |
| `Hct` | Haematocrit / PCV | % (always shown) |
| `TLC` | Total leucocyte (WBC) count | /cumm |
| `Plt` | Platelet count | lakh/cumm (write `3.45L`) |
| `ESR` | Erythrocyte sedimentation rate | mm/hr |
| `HbA1c` | Glycated haemoglobin | % (always shown) |
| `FBS` / `PPBS` / `RBS` | Fasting / post-prandial / random blood sugar | mg/dL |
| `S. Creat` | Serum creatinine | mg/dL |
| `eGFR` | Estimated GFR | mL/min/1.73m² |
| `Urea` / `BUN` | Blood urea / BUN, as recorded | mg/dL |
| `Na` / `K` / `Cl` / `HCO₃` | Electrolytes | mEq/L |
| `Uric acid` | Serum uric acid | mg/dL |
| `TC` / `LDL` / `HDL` / `TG` | Lipid profile | mg/dL |
| `SGOT` / `SGPT` | AST / ALT (Indian usage; `AST`/`ALT` also accepted) | U/L |
| `ALP` | Alkaline phosphatase | U/L |
| `T. Bili` / `D. Bili` | Total / direct bilirubin | mg/dL |
| `Albumin` | Serum albumin | g/dL |
| `TSH` / `T3` / `T4` / `FT4` | Thyroid profile | µIU/mL (TSH); others as recorded |
| `PT` / `INR` / `APTT` | Coagulation | seconds (PT, APTT); INR has none |
| `Vit D` / `Vit B12` | Vitamin D / B12 | ng/mL / pg/mL |
| `uACR` | Urine albumin/creatinine ratio | mg/g |
| `Urine pus cells` / `Urine RBC` | Urine microscopy | /hpf |

### 7.3 Condition-relevant key labs

| Condition | Always show when available |
|---|---|
| T2DM / T1DM | HbA1c, FBS, PPBS, S. Creat, uACR |
| HTN | S. Creat, K, Na |
| DLP / CAD | LDL, TG, HDL |
| CKD | S. Creat, eGFR, K, Hb |
| Hypothyroidism | TSH |
| Anaemia | Hb |
| On anticoagulant | INR |

### 7.4 Frequency and timing codes

| Write | Meaning |
|---|---|
| `OD` / `BD` / `TDS` / `QID` | Once / twice / thrice / four times daily |
| `HS` | At bedtime |
| `SOS` | When required |
| `STAT` | Immediately, once |
| `Alt. day` / `Weekly` | Alternate day / weekly |
| `AF` / `BF` | After food / before food |
| `1-0-1` | Morning-afternoon-night slots (`1-0-1-1` when evening is recorded) |
| `5d` / `2w` / `3m` / `10y` | Days / weeks / months / years (all durations, everywhere) |
| `Cont.` / `Till reqd` | Continue / till required |
| `Qty 60` | Quantity |

---

## 8. Size budget: when the record is large

The overview must look the same for a thin chart and a thick one. Long content is **counted and linked**, never dumped.

| Section | Budget | Overflow |
|---|---|---|
| Situation | As long as the essence needs (Part B). No fixed sentence count; every sentence must earn its place. | Detail moves to Background, Assessment or Last Visit; never truncated |
| Background, each history row | 5 items | `+N more` (opens Medical history) |
| Background, medicines | 6 items | `+N more` (opens Current medications) |
| Assessment, vitals | 1 dated group (2 if dates differ) | Older readings in Vital records |
| Assessment, key labs | 6 values, at most 2 dated groups | `+N normal` / `+N more` (opens Lab records) |
| Last Visit | SX at most 3, DX at most 4, RX at most 5 | `+N more` (opens Visit summary) |
| Important tags (end of Situation) | 3 | Remaining tags go to Background |

Rules:
- Budgets apply to **display**. The JSON still carries every selected fact with its source.
- `+N more` is a link to the focused view, never plain text.
- **Missing data shrinks the answer.**
  - A patient with labs only gets an overview with an Assessment section (and a one-line Situation from demographics).
  - Never a lab dump, and never empty sections.
- **Never cut a line mid-token.** Drop whole items.

---

## 9. Section templates (overview)

```
SITUATION
{age}-year-old {man|woman} with {T2DM (10y)}, {HTN (7y)}. Last visit {9 Oct ’26} for {fatigue (1w)}. Allergic to {sulfa drugs (rash)}.
[Important tags: Ca cervix (FIGO IIB, on follow-up) · …]

BACKGROUND
Chronic: T2DM (10y, On Rx), HTN (7y, On Rx), DLP (5y)
Family: T2DM (Father), HTN (Mother)
Lifestyle: Smoker (Ex, quit 2018), Alcohol (Occasional)
Surgical: Appendectomy (2008), Rt cataract surgery (2023)
Current medications: Metformin 1 g (1-0-1, AF), Telmisartan 40 mg (1-0-0), Atorvastatin 20 mg (0-0-1, HS)

ASSESSMENT
Latest vitals (9 Oct ’26): BP 134/82 | P 76 | SpO₂ 98% | Wt 81kg
Key labs (8 Oct ’26): HbA1c ↑7.8% | LDL ↑116 | uACR ↑48 | S. Creat 1.0

LAST VISIT · 9 Oct ’26
SX: Fatigue (1w, Mild) | DX: T2DM, HTN, DLP | RX: Metformin 1 g (1-0-1, AF, 30d), Telmisartan 40 mg (1-0-0, 30d), Atorvastatin 20 mg (0-0-1, HS, 30d)
```

**Full tier: Visit summary / "show the prescription".** These are the same tokens, with every recorded field kept, in Tatva Practice print section order:

```
VISIT · 9 Oct 2026
SX: Fatigue (1w, Mild, no fever or chest pain)
DX: T2DM (E11.9), HTN (I10), DLP
RX: Tab. Metformin 1 g (1 tab, 1-0-1, AF, 30d, Qty 60), Tab. Telmisartan 40 mg (1 tab, 1-0-0, 30d, Qty 30),
    Tab. Atorvastatin 20 mg (1 tab, 0-0-1, HS, 30d, Qty 30)
Vitals: BP 134/82 | P 76 | SpO₂ 98% | T 98.6°F | Wt 81kg | Ht 172cm | BMI 27.4
Exam: Pedal oedema absent, B/L foot pulses felt
Ix advised: HbA1c, Lipid profile, uACR
Advice: Walk 30 min daily, avoid sweets
Follow-up: 9 Nov ’26
```

**Symptoms (SX)**
- `Symptom (duration, severity, note)`, e.g. `Fever (3d, Mod, high grade)`.
- This is the Tatva Practice print order (since → severity → note), without the `since:` and `severity:` labels.

**Diagnosis (DX)**
- `Name (status)`.
- Write the status only when it is not Confirmed (`Suspected`, `Ruled out`).
- ICD code in the full tier only: `T2DM (E11.9)`.

**Situation sentence**
- Plain English.
- Bold condition and drug names.
- Conditions use the §7.1 abbreviations, with duration in brackets.
- No medicine schedules: those live in Background.

---

## 10. Formatter contract (for the backend)

Build every display string in code from structured fields. The agent returns facts and the Situation text. Recommended functions:

```text
fmtCondition({name, since, status, medication})  -> "T2DM (10y, On Rx)"
fmtAllergy({name, note})                         -> "Penicillin (Rash)"
fmtFamily({name, relationship})                  -> "T2DM (Father)"
fmtSurgery({name, date, note})                   -> "Appendectomy (2008)"
fmtMedicine(item, tier="compact"|"full")         -> "Metformin 500 mg (1-0-1, AF, 30d)"
fmtSlots(m, a, e, n)                             -> "1-0-1" | "1-0-1-1" | "½-0-½"
fmtDuration(days, type)                          -> "5d" | "2w" | "Cont."
fmtVitals(set)                                   -> "Latest vitals (9 Oct ’26): BP 134/82 | P 76 | …"
fmtLab({test, value, unit, flag})                -> "Hb ↓9.8" (default unit omitted)
selectKeyLabs(results, conditions, max=6)        -> [...] + {moreCount, allRemainingNormal}
fmtDate(d, style="chip"|"full")                  -> "9 Oct ’26" | "9 Oct 2026"
```

Each function returns `null` for an empty input, and the row is dropped. Keep the source IDs on every item, so citations survive formatting.

---

## 11. Checklist before an answer is returned

- [ ] Four overview sections, in order; empty sections omitted.
- [ ] No `unit not recorded`, `recorded flag normal`, `reference …`, `None`, `N/A`, `-` in the overview.
- [ ] No test name repeated inside its panel name.
- [ ] Every medicine has its frequency; dose/timing/duration present when recorded; no pack sizes; no ALL CAPS.
- [ ] Conditions written as `Name (duration, status, Rx)`, using only the §7 abbreviations.
- [ ] One date per vitals or labs group, in `D Mon ’YY`.
- [ ] Key labs at most 6, abnormal first, the rest counted.
- [ ] Budgets in §8 respected, and overflow linked with `+N more`.
- [ ] Every shown fact still resolves to a source citation.
- [ ] Nothing abbreviated, converted or inferred outside these rules.

---

## Sources in the Tatva Practice codebase

- Rx print (inline style): `src/utils/server/viewpdf.js`
  - medicines ≈6855–7028
  - symptoms ≈4576
  - diagnosis ≈6085–6107
  - vitals ≈9671–9834
  - medical history ≈10393–10458
  - lab results ≈14636–14770
- Frequency words: `formatFrequency` ≈1664. Fractions: `getMedicineFreqDosageFormat` ≈379.
- History section IDs: `src/utils/medicalHistoryUtils.js:1–3`. "Since" values as typed: `MedicalHistoryBox.js:1110, 1129`.
- On-screen patient summary (chronic as `Diabetes (5y, Active)`, flagged labs only): `src/components/PatientSummary.js` ≈704, 803–827.
