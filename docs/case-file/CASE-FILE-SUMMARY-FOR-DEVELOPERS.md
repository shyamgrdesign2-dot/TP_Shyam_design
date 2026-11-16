# Case File summary: how each line is derived

16 Nov 2026 · One page for the developers who will build the production summary. The long version, with every edge case, is `CASE-FILE-SUMMARY-ARCHITECTURE.md` and `CASE-FILE-SUMMARY-SAFETY-RULES.md`. The working draft is `src/components/archived-records/caseFileStory.js` (`buildStory(bundle, review, { brief: true })`).

## The idea in four lines

- The summary is **not written by a model**. Code picks facts, puts them in a fixed order and fills fixed sentences. It cannot say more than the pages say.
- It has **six pointers, always in the same order, each with a fixed label**. A pointer with nothing to say is left out.
- It tells the **story in a fixed order**: who and how they came, what was found and done, the background that colours everything after it, how the stay went, how they left. The details below it are the record. The two never repeat each other: where the details hold a list, the summary gives a **count that jumps to that list**.
- A fact that is held back, removed in review or marked sensitive adds **no words and no numbers**.

## Input

One bundle per patient folder:

| Part | What the summary uses |
|---|---|
| `patient` | `sex`, `age` (as stated on a page) |
| `encounters[]` | `type` (IPD, OPD, ER, DAYCARE...), `startLabel`, `endLabel`, `sortKey`, `department`, `entry` (emergency, referral, planned...), `outcome`, `ref` + `refCite` (the visit number and the page it is on), `admissionId` on an emergency visit that ended in admission |
| `findings[]` | `domain` (DX, ALG, MED, PROC, LAB, VIT, RPT), `role`, `title`, `detail`, `flags`, `confidence`, `hold`, `cite`, and for labs `value`, `unit`, `abnormal`, `series` |
| review state | per fact: draft, verified, removed; corrections |
| `notFound`, `source.pagesUnread` | what the folder does not contain |

A fact may speak only if it is **eligible**: not removed, not held (unless verified), not sensitive.

## The six pointers

| # | Label shown | Built from (domain / role) | Sentence pattern | Left out when |
|---|---|---|---|---|
| 1 | **Arrival** | `patient`; earlier encounters; the latest encounter's `entry`, `department`, `ref`; RPT / `complaint` | `{age}-year-old {woman\|man}. {earlier visits, one clause each}. {Came to the emergency \| Referred in \| Planned admission...} on {date} ({visit no.}) and was admitted under {department} with {complaint}.` | Never (falls back to "Admitted on {date}") |
| 2 | **Diagnosis and treatment** | DX / `final`, `working`, others; PROC / `procedure` | `Final diagnosis: {name}. Working diagnosis: {name (suspected)}. Also {N secondary diagnoses}. {procedure} on {date}.` | No diagnosis and no procedure |
| 3 | **Background** | DX / `chronic`; PROC / `pastSurgery`; ALG; MED / `home` as a count; RPT / `alert` | `Known {conditions}. Past {surgery}. {allergy line}. {N medicines taken before admission}. Keep in mind: {alerts}.` | Never (the allergy line is always present) |
| 4 | **Hospital course** | LAB with `abnormal` (two named, first and latest value when it moved); MED / `inHospital` as a count | `Abnormal results: {test} {first} to {latest} {unit} (high\|low) and {N more}. {N medicines recorded as given in hospital}.` | No abnormal result and nothing given |
| 5 | **Discharge and follow-up** | `outcome`, `endLabel`; RPT / `conditionAtDischarge`; MED / `discharge` or `prescribed` as a count; RPT / `followUp` | `Discharged on {date}: {condition}. {N medicines on the discharge list}. Follow-up planned: {text}.` | An OPD visit with no medicines and no follow-up |
| 6 | **Not in this file** | `notFound`, `pagesUnread`, held, removed, sensitive counts | `Not in this file: {two items} and {N more}. {N pages could not be read}. {N unclear readings held back}.` | Nothing is missing |

Example, from the built-in sample:

> **ARRIVAL** 82-year-old woman. Came to the emergency on 16 Jan'26 and was admitted under General Medicine, discharged 22 Jan'26. Came to the emergency on 09 Jul'26 and was admitted under Orthopaedics with pain over left hip after a fall at home.
> **DIAGNOSIS AND TREATMENT** Final diagnosis: closed left neck of femur fracture. Working diagnosis: volume overload or basal atelectasis (suspected). Also 4 secondary diagnoses. Left hip bipolar hemiarthroplasty (cemented) on 11 Jul'26.
> **BACKGROUND** Known type 2 diabetes, hypertension. No known drug allergy, stated on 8 pages. 5 medicines taken before admission. Keep in mind: low oxygen saturation on room air.
> **HOSPITAL COURSE** Abnormal results: D-dimer 2.3 µg/mL (high), TLC 12.8 K (high) and 8 more. 9 medicines recorded as given in hospital.
> **DISCHARGE AND FOLLOW-UP** Discharged on 16 Jul'26: stable, afebrile. 15 medicines on the discharge list. Follow-up planned: suture removal on 25/7/2026.
> **NOT IN THIS FILE** Printed laboratory reports, ECG tracing and 14 more. 1 unclear reading held back.

## The steps, in order

1. **Filter** to eligible facts.
2. **Order encounters** oldest first. An undated encounter sorts first, so it is never told as the latest.
3. **Choose the encounter told in full:** the latest one that has facts. An emergency visit that ended in admission is folded into that admission (it becomes the admission's way in), not told as a separate visit.
4. **Earlier encounters:** up to three, one clause each ("Came to the emergency on ... and was admitted under ..., discharged ..."). More than that are counted by kind.
5. **Write the beats** for the encounter told in full (arrival, diagnosis, treatment, course, leaving, medicines, follow-up), then the file-wide background and gaps.
6. **Group the beats into the six pointers** and attach each pointer's label and citations.

## Rules a developer must not break

- **Counts name their list:** "15 medicines on the discharge list", never "on 15 medicines". The count is a link to that list.
- **Certainty is kept:** `(suspected)` stays inside the key words; `(partly readable)`, `(pages differ)` and `(hard to read)` follow the name.
- **The allergy line has exactly five forms:** a stated allergy; a stated "none known" with where it is stated; "not recorded in this file"; "an unclear reading is held back"; "entry removed in review". Never an inferred "no allergies".
- **"Discharged" is said only when the file says so.** An end date alone gives "Stay ended".
- **No clock:** "Follow-up planned", never "due" or "overdue". The same input gives the same text on any day.
- **Nothing is computed:** no length of stay, no age from a birth date, no duration from a quantity.
- **A value is quoted only with its unit.**
- **Remarks about reading problems are never text.** The part that could not be read is left out; the explanation is kept for the reviewer in `readerNote`.

## Output

```
{ level: "full" | "partial" | "thin" | "withheld" | "none",
  beats: [ { key, label, kind, text, cites: [factId, ...] } ] }
```

- `text` marks key words with `**double stars**` (shown in darker ink at medium weight, never bold) and references with `[[label|page|rid]]` (opens that page) or `[[label|@MED|]]` (jumps to that section of the details).
- `cites` are fact ids. The screen shows at most two citation numbers per pointer.
- `level` says how much could be told. "withheld" means facts exist but none is eligible; "none" means nothing was read. Both still return one pointer saying so.

## Where it is shown

The same six pointers are shown in the Rx pad panel and at the top of the Structured record tab. Only the width differs.
