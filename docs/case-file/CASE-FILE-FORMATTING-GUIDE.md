# Case File: structure and formatting guide

15 Nov 2026 · For design, the Velora extraction team and the Doctor Portal front end · UI draft on branch `feat/archived-records-digitization`

Case File is the place on the Rx pad where a consulting doctor reads what a patient's old paper file says. A 100-page scanned file has already been read by AI the night before the appointment. This guide defines **what each part of the panel contains, how each fact is written, and what happens to anything the reader was unsure about**.

> **One-line rule:** show the doctor the fact first, in the shape they already read on a prescription pad, with where it came from one click away, and never show a guess as a fact.

It builds on two things already in the product:

1. **The blue sidebar's own formatting** (Past Visits, Vitals, Investigation Results, Medical History, Obstetric). Case File sits in the same sidebar, so it reads the same way.
2. **The Doctor Copilot patient summary guide** (`PATIENT-SUMMARY-FORMATTING-GUIDE.md`, 12 Nov 2026). Where the two overlap, this guide follows it. Section 13 lists where Case File differs and why.

Code: `src/components/archived-records/`. Preview without login: `http://localhost:3007/dev/archived-records`.

---

## 1. The name

The doctor-facing name is **Case File**. It lives in one constant (`archivedRecordsName.js`), so changing it is a one-line edit.

| Name | For | Against |
|---|---|---|
| **Case File** (chosen) | What a records department calls the bundle of pages kept for a patient. Says "the whole file", not "something old". Does not clash with Past Visits (visits made in this EMR) or Records (documents uploaded here). Works in a hospital and in a clinic. | Slightly formal. |
| Old Records | Plain; doctors say "get the old records". | "Old" undersells it and reads as low value. |
| Archive | Short. | Describes storage, not what the doctor gets. |
| MRD File | Exact hospital term. | Means nothing outside a hospital with an MRD. |
| Prior Records | Neutral. | Close to "Past Visits" and "Records"; easy to confuse. |

The RFP's own words ("archived case sheets", "historical backlog", "legacy MRN") are back-office terms. They belong in the review tool, not on the doctor's sidebar.

---

## 2. Who reads this and what they need

| Reader | Where | Job | Time they have |
|---|---|---|---|
| Consulting doctor | Case File panel on the Rx pad | Take in the file, miss nothing that matters, carry on with the consultation | Under a minute |
| Same doctor, when something looks off | Source page drawer | Check one value against the page it came from | A few seconds |
| MRD verifier, or the doctor when needed | Review drawer ("Review and save") | Verify facts against the source, resolve conflicts, save to the record | Minutes |

The panel is built for the first row. Verifying is a separate job in a separate surface.

---

## 3. Anatomy of the panel

```
┌ Case File ───────────────────────────────────────────┐
│ ┌ ⚠ Not verified yet ──────────────────────────────┐ │  1. Notice
│ │ Read by AI from a 99-page hospital file. Check   │ │
│ │ the source before you rely on a value. …         │ │
│ │ [ Review and save ]                              │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌ ✦ Summary ──────────────────────────────────── ⓘ ┐ │  2. Summary
│ │ • **Intra-abdominal soft-tissue tumour** … [2]   │ │
│ │ • **Laparotomy with tumour excision** … [2][6]   │ │
│ │ IPD 26 Feb-4 Mar'26 · OPD 25 Feb'26              │ │
│ └──────────────────────────────────────────────────┘ │
│ [  Data  |  Timeline  |  Files  ]                    │  3. Lens switch (sticks)
│                                                      │
│ ▤ Diagnosis                                          │  4. One lens at a time
│   Lipoma or liposarcoma (Suspected, Working dx…) [2] │
│ ▤ Allergies … ▤ Procedures … ▤ Med (Rx) …            │
│ ▤ Lab Results … ▤ Vitals … ▤ Reports and Notes …     │
│                                                      │
│ ┌ 3 unclear readings are held back ────────────────┐ │  5. Gaps
│ └──────────────────────────────────────────────────┘ │
│ ┌ Not found in this file ──────────────────────────┐ │
│ └──────────────────────────────────────────────────┘ │
│ Powered by Velora · Original pages are kept unchanged│  6. Footer
└──────────────────────────────────────────────────────┘
```

Fixed order, every patient: **Notice → Summary → Lens switch → the chosen lens → Gaps → Footer.**

---

## 4. Reading hierarchy

Readability matters more than completeness of display. Every row uses the same four levels, darkest to lightest. Nothing else is allowed to compete.

| Level | What it is | Style | Example |
|---|---|---|---|
| **Value** | The clinical fact: a diagnosis, a medicine, a result | Darkest ink, regular weight | `Nexium 40 mg`, `10.6`, `102/74` |
| **Key** | A name that introduces a value, always ending in a colon | Mid grey, regular | `Haemoglobin:`, `BP:` |
| **Secondary** | Dates, units, qualifiers, reference ranges. Always in brackets or after the value. | Light grey, regular | `(1x1, PO, Qty 7)`, `(04 Mar'26)`, `g/dL`, `(Ref: 11.7 - 15.5)` |
| **Divider** | Between sibling facts and between rows | Hairline, lightest grey | the line between `BP: 102/74` and `Pulse: 72` |

Rules:

- **Emphasis in content is by colour, never by weight.** The fact is the darkest ink; what introduces or qualifies it is lighter. Semibold is kept for headings (card titles, section names, group titles). Bold is not used. In a summary sentence the key words are the darker ink at medium weight; in rows the fact is the darker ink at regular weight.
- **Colour is spent only on two things:** red for a value the source flagged high or low, amber for a warning the doctor should see (suspected, conflict, unclear). Citations are link blue. Everything else is grey scale.
- **Sizes:** 13px for a row, 12px for bracket details, 11px for trends and units, 10px for citations. Summary text is 12px.
- **One idea per row.** A row never mixes two facts to save space.

---

## 5. Separators, dates and citations

| Symbol | Use | Example |
|---|---|---|
| `Name (a, b, c)` | A named thing and its qualifiers: one bracket, commas, fixed order, **no labels inside** | `Dexyclav 500 mg (3x1, PO, Qty 19)` |
| `Key: value` | A measurement | `Haemoglobin: 10.3 g/dL` |
| hairline divider | Between measurements taken together | `BP: 102/74 │ Pulse: 72 │ SpO2: 98%` |
| `→` | Between dated readings of the same test, oldest to newest | `12.8 → 11.4 → 10.6` |
| `↑` `↓` | High or low **as flagged by the source**, after the value and unit | `66 mm/hr ↑` |
| `(date)` | A date that belongs to one fact | `At discharge (04 Mar'26)` |
| `[n]` | Citation | `[2]` |
| `+N …` | Things counted instead of listed | `+9 normal results` |

**Dates.** Sidebar house style, `DD Mon'YY`: `27 Feb'26`, `04 Mar'26`. Month only when the file gives no day: `Mar'26`. Inside a trend the year is dropped: `(28 Feb)`. Never `DD/MM/YYYY`. A fact with no date on the page says `(undated)`; a date is never inferred.

**One date per group.** When several rows share a date, the date is the group title and is not repeated on each row (labs).

**Citations.**

- `[n]` is a **document number**, not a page number. `[2]` is always the discharge summary, `[15]` the lab reports. Numbers follow the order of documents in the file.
- Hovering shows the document and page. Clicking opens that page with the exact line outlined.
- A fact supported by more than one document shows each number once: `[2] [6]`.
- The Files lens lists every document with its number, so it doubles as the legend.
- Citations sit at the end of the row, smaller than the text, so they do not interrupt reading.

---

## 6. Notice section

One card at the top. It is the **only** place the unverified state is announced, so the facts below stay clean.

| State | Title | Line | Button |
|---|---|---|---|
| Nothing verified | Not verified yet | Read by AI from a 99-page hospital file. Check the source before you rely on a value. Review and save to add it to the patient record. | Review and save |
| Partly verified | 12 of 64 verified | same line | Review and save |
| All reviewed | Reviewed and saved | Every item below was checked against its source page. | Open review |

Amber while anything is unverified, green when all is reviewed. No per-row "unverified" badges: a row gets a mark only when it has a specific problem (section 10).

---

## 7. Summary

**Job:** tell the story of the file, so a doctor who reads only this knows who the patient is, how they came in, what was found and done, how they left, and what the file does not contain.

It is **built by code from the facts**, not written by a model, so it cannot say more than the pages do. The same builder feeds the Rx pad panel and the Structured record tab. The full design, with every rule and worked examples for each kind of file, is in `CASE-FILE-SUMMARY-ARCHITECTURE.md`; the safety rules are in `CASE-FILE-SUMMARY-SAFETY-RULES.md`.

**The short story** (shown on the Rx pad panel and above the details; a pointer with nothing to say is left out):

| # | Pointer | Holds |
|---|---|---|
| 1 | Who, and how they came in | Age and sex as stated on the face sheet; earlier visits in a clause each; then how this one began (OPD first visit, emergency, referred, planned, transferred), when, under whom, with what complaint. Each visit carries its number in brackets, which opens its page |
| 2 | What was found and done | Final, working and other diagnoses with certainty kept; procedures with date |
| 3 | How it went | The two most important abnormal results (first and latest value when it moved), then a link to the rest; a count of medicines given in hospital |
| 4 | How they left and what was planned | Outcome and date, condition, a count of the medicines they left with, follow-up |
| 5 | Keep in mind | Chronic conditions, past surgery, the allergy line (always present), medicines before admission as a count, alerts |
| 6 | Not in this file | Missing documents, unreadable pages, held, removed and sensitive items |

**The summary does not repeat the details.** The details are directly below, so the summary says what a list cannot (who, how they came, the course, how it ended) and replaces lists with counts that jump to their section: "9 medicines on the discharge list" scrolls to Med (Rx). The full telling, beat by beat, still exists in the builder (`buildStory` without `brief`) and is described in the architecture document.

**How it is written:**

- Pointers, never numbered. One beat per pointer.
- Key words in darker ink at medium weight: condition names, procedure names, a count. Never a whole sentence.
- Certainty words stay: `(suspected)`, `(partly readable)`, `(pages differ)`, `(hard to read)`.
- A count names the list it counts: "9 medicines on the discharge list".
- No interpretation, no recommendation, no clock ("Follow-up planned", never "overdue").
- A fact that is held back, removed or sensitive adds no words and no numbers; it is counted in the last pointer.
- Every pointer ends with its citations.
- Subheading of the card: the encounters by hospital category, `1 IPD · 1 OPD · 99 pages`.
- The badge reads "AI draft", with an ⓘ that explains it: read by AI, not yet verified by a doctor or the records team, stays a draft until reviewed and saved.

**Example**

> • Pre-admission work-up in OPD on 25 Feb'26: Chest X-ray and ECG; 6 abnormal results. `[17] [16]`
> • Referred in and admitted on 26 Feb'26 under Digestive Surgery with interrupted, frequent urination and constipation. `[2]`
> • Final diagnosis: **Soft-tissue tumour, intra-abdominal** (partly readable). Working diagnosis: **Lipoma or liposarcoma (suspected)**. `[2] [6]`
> • Discharged on 04 Mar'26 (pages differ): stable, conscious. Last vitals: BP 102/74, Pulse 72. `[2] [1]`
> • **9 medicines** on the discharge list: Alganax 0.5 mg, Nexium 40 mg, Dexyclav 500 mg, Acetram, Cliad and 4 more. `[2]`

---

## 8. Data lens

**Job:** what is true about the patient, grouped by type across every visit in the file. This is the problem-oriented view. Dates are qualifiers, not the organising principle (the Timeline lens does that).

**Section order** (the order a doctor scans a discharge summary; empty sections are left out, never shown as "none"):

Diagnosis → Allergies → Procedures → Med (Rx) → Lab Results → Vitals → Reports and Notes

Section title bars and icons are the sidebar's own (`RxSection`), the same as Past Visits.

### 8.1 Diagnosis

| | |
|---|---|
| Format | `Condition (certainty, role, when)` |
| Token order | certainty (only if not confirmed) → role (`Final`, `Working dx`, `Secondary`) → when |
| Order of rows | Final, working, then secondary |
| Example | `Lipoma or liposarcoma (Suspected, Working dx, Feb'26) ⚠ [2] [6]` |
| Example | `Rheumatoid arthritis (Secondary, Past history) [2]` |

- A suspected diagnosis **stays suspected**, including after verification. `Suspected` is the one amber word inside a bracket.
- Coding candidates (ICD-10) are not shown here. They are in the review drawer, marked as candidates.
- If a diagnosis line is only partly readable, the readable part is shown with the mark "Only part of this line could be read". Nothing is filled in.

### 8.2 Allergies

| | |
|---|---|
| Format | `Allergen (reaction)` |
| Negative | `No known drug allergy (Stated on 3 pages)` |

- A negative is shown **only when the file says so**. It is never inferred from an empty field.
- When pages disagree (one says an allergy, another says none), the allergy is shown with a conflict mark and nothing is added to the allergy list until someone decides.

### 8.3 Procedures

| | |
|---|---|
| Format | `Procedure (date, key detail, duration)` |
| Example | `Laparotomy with tumour excision (27 Feb'26, GA + epidural, 2h 10m) [2] [6] [10]` |
| Example | `Hysterectomy (Past surgery) [2]` |

- Laterality (`Rt`, `Lt`) is part of the name when written.
- A past surgery with no date shows no date token.

### 8.4 Med (Rx)

Three groups, in this order, each with its own small title:

1. **On discharge (date)**: what the patient went home on. Most relevant, so first.
2. **At home before admission**: from the reconciliation form.
3. **Given in hospital**: only the ones a later doctor needs (steroids, antibiotics with a conflict, anticoagulants, strong analgesics). The full hand-written list is one row in Reports and Notes.

| | |
|---|---|
| Format | `Name strength (unit per dose, frequency, when, duration, notes)` |
| Example | `Nexium 40 mg (1 per dose, OD, PO, Qty 7) [2]` |
| Example | `Dexyclav 500 mg (1 per dose, TDS, PO, Qty 19) [2]` |
| Example | `Vometa FT (SOS, PO, Qty 10) [2]` |
| Example | `Hydrocortisone 100 mg IV (During surgery, 27 Feb 2026, 08:10) [10]` |

- **The bracket follows the Rx pad's own column order:** unit per dose, frequency, when, duration, notes. This is the same order a doctor sees in the Rx pad's medicine table and in Past Visits.
- **Frequency uses the Rx pad's short forms where the conversion is exact:** `1x1` is OD, `2x1` BD, `3x1` TDS, `4x1` QID, "when needed" SOS. Anything else stays as written (`Every 2 weeks`). It is never turned into `1-0-1` slots, because the page does not say morning or night.
- **Nothing is computed or guessed.** "When" and "Duration" stay empty unless the page states them; a duration is never worked out from a quantity.
- **Whatever has no column goes to notes:** route (`PO`), quantity (`Qty 7`), "Stopped before surgery". No detail is dropped.
- **The words as written are kept** with the fact (`1x1  PO  7`) and shown beside the row in review, so the conversion can always be checked.
- A missing strength is simply absent. Brand names stay as written; they are not mapped to generics.
- A dose that can be read two ways (`1 x 2 tab`) keeps its mark.

### 8.5 Lab Results

Only the latest value of each test is shown. A test taken ten times is one line.

| | |
|---|---|
| One reading | `ESR: 66 mm/hr ↑ (25 Feb'26) [16]` |
| Repeated, still out of range | `Haemoglobin: 10.3 g/dL ↓ (03 Mar'26, from 12.5, 3 readings) [15] [16]` |
| Repeated, back in range | `Leukocytes: 7.9 10^3/uL (03 Mar'26, from 12.3 ↑, 3 readings) [15] [16]` |

- **Two tags, worst first:** "Out of range", then "Back in range" (out of range earlier, in range now). Results that were always in range are counted, not listed: `+14 normal results`.
- **The bracket** is light: the date of the value shown, then where a repeated test started, then how many readings there are. No date subheadings.
- **No trend and no reference range on the line.** Hovering the value shows both on one line; the full row is under Clinical data.
- The value is medium weight; when out of range the value, its unit and its arrow are red together. A number is shown only with its unit.
- On a wide page results sit in an even grid, one to a cell.

### 8.6 Vitals

| | |
|---|---|
| Format | `Moment (date)` then `Key: value` pairs with hairline dividers |
| Pair order | BP → Pulse → SpO2 → Temp → RR → others (Wt, Ht, GCS, Pain) |
| Order of rows | Newest first |
| Example | `At discharge (04 Mar'26) [2]` / `BP: 102/74 │ Pulse: 72 │ SpO2: 98% │ Temp: 36.6 C │ RR: 18 │ GCS: 15` |

- One row per moment, never one row per vital.
- Units are never converted.
- A set of vitals with no date on the page is labelled `(undated)`.

### 8.7 Reports and Notes

Four groups, always in this order:

| Group | Holds |
|---|---|
| **Keep in mind** | Notes that change what the doctor does today: steroid use, blood products, anything unusual |
| **Investigations** | Imaging and ECG: the impression, not the full report |
| **Surgery and anaesthesia** | ASA class, technique, duration, specimen, consent notes |
| **Course and discharge** | Presenting complaint, progress notes, condition and devices at discharge, follow-up |

| | |
|---|---|
| Format | `Title: one or two sentences (date) [n]` |
| Example | `Chest X-ray: Normal heart size. No sign of pneumonia. (25 Feb'26) [17]` |

- Sentences are plain English summaries of what is written. The original wording, in its original language, is in the review drawer as "As written".
- Image thumbnails (X-ray, scope, ECG, operative photos) sit at the end of this section. A thumbnail opens the page it was lifted from, next to its report.

### 8.8 What Data never shows

- A guess. Low-confidence readings are held back (section 10).
- Billing, consents, checklists, nursing charts. They are listed under Files.
- An empty section or a "none" placeholder.

---

## 9. Timeline and Files lenses

### 9.1 Timeline

**Job:** what happened when. This is the hospital course, and the place to see several events inside one admission.

| | |
|---|---|
| Format | `Date` on the left, then **Title** `[n]`, then one or two short sentences |
| Order | Oldest first, so it reads as a story |
| Dot | Filled blue for the events that define the admission (surgery, discharge); hollow for the rest |
| Example | `27 Feb` **Surgery** `[10]` Urology 8:02 to 8:20: cystoscopy, right ureteric catheter. Digestive surgery 8:33 to 9:50: laparotomy, tumour excision. GA with epidural. Hydrocortisone 100 mg IV. |

- One row per day or per distinct event. Routine nursing entries are not events.
- A planned future event from the file (follow-up due) is the last row, worded as planned, not as done.
- Times are shown only when the file gives them.

### 9.2 Files

**Job:** what is in the file, what was not read, and how to get to any page.

1. **Coverage line.** `99 pages. 32 with clinical data, 66 forms and charts, 1 not readable.` The three numbers always add up to the total.
2. **Documents in six folders**, each row `[n] Title … p. from-to`:
   Summaries · Doctor notes · Lab reports · Imaging · Medication charts · Nursing and forms
3. A row opens that document in the source drawer. The whole document scrolls as one strip, so a 10-page consent form reads top to bottom.

The six folders are a working set. Replace them with the extraction team's categories when those are final; the layout does not change.

---

## 10. Holding, marks, conflicts and gaps

This is how the panel stays honest without becoming noisy.

### 10.1 Confidence bands

| Band | Score | In the doctor's panel | In the review drawer |
|---|---|---|---|
| Clear | 0.85 and above, no flag | Shown, no mark | Can be verified in bulk ("Verify N clear items") |
| Check | 0.70 to 0.84 | Shown, no mark unless flagged | Verified one at a time, labelled "Check this" |
| Hard to read | below 0.70 | Shown with a mark if the readable part is safe to show | Verified one at a time, labelled "Hard to read" |
| **Held** | marked `hold` (in the sample: below 0.5, or two readings of the same line) | **Not shown** | Listed with "Held back from the doctor's view" |

The numbers are proposals for the pilot. MAHE sets the real thresholds per field risk (RFP O10, Q03).

### 10.2 Holding

A held reading is one where showing it could mislead more than hiding it. Example from the sample file: the face sheet's handwritten diagnosis was read as a liver cancer, which contradicts the discharge summary. Showing that with a small warning icon is not safe.

- Held readings are **left out of Data, Summary and Timeline**.
- They are **counted, never silently dropped**: "3 unclear readings are held back", with a link to the review drawer.
- A reviewer who checks one against the page and verifies it releases it into the panel. Rejecting it removes it.
- Holding applies per reading, not per page. The rest of the page still shows.

### 10.3 Marks on a row

A row carries a mark only when it has a specific problem. Hover gives the reason in one sentence.

| Mark | Meaning | Shown as |
|---|---|---|
| Suspected | Written as suspected, not confirmed | amber word inside the bracket, plus ⚠ |
| Conflict | Another page says something different | ⚠ |
| Two values | The file has two values for the same thing | ⚠ |
| Partly readable | Only part of the line could be read | ⚠ |
| Ambiguous | Written in a way that can be read two ways | ⚠ |
| Verified | Checked against the source and saved | green ✓ |

### 10.4 Conflicts

When two pages disagree (two discharge dates, three names for one antibiotic, an allergy on one page and "none" on another):

- The panel shows **the better-supported reading with a conflict mark**. Better-supported means a typed or system-printed source over handwriting, and agreement across more documents.
- The review drawer lists both sources side by side under "Needs your decision" and asks for a choice in plain words ("Confirm 4 Mar" / "Don't record").
- **Nothing in conflict is written to the patient record until a person decides.** For allergies and medicines this is absolute.

### 10.5 Gaps

Two dashed boxes at the end of Data:

- **N unclear readings are held back** (10.2).
- **Not found in this file**: documents a doctor would expect for this kind of admission that the reader did not find, e.g. histopathology report, operative note, MRI report, whether a stent was left in place. This tells the doctor what to ask for.

"Not found" means not found in **this file**. It never says the thing does not exist.

---

## 11. The workspace: read, verify, check

The workspace is the Case File tab of the patient page and the review drawer opened by "Review and save". It serves two people: a doctor who wants to read the file properly, and a records (MRD) reviewer who turns the AI draft into patient record.

**Layout.** One toolbar row: three tabs on the left, one search box and the verified count on the right. The source page stays alongside. On the patient page the violet banner carries the heading (Case File, the "AI draft until verified" badge and the one-line file description) and the workspace card overlaps the lower half of the banner.

### 11.1 Structured record (read)

Nothing is decided on this tab. It retells the file in a fixed order:

0. **Review entry:** an amber strip at the top says the data is not verified yet and carries "Review and save", which opens Clinical data on the items still to review.
1. **Summary**: the story of the file, beat by beat. See section 7 and `CASE-FILE-SUMMARY-ARCHITECTURE.md`.
2. **Details**: the same sections, in the same order and wording, as the Rx pad panel (one component draws both): Diagnosis, Allergies, Procedures, Med (Rx), Lab Results, Vitals, Reports and Notes, then what is held back and what is not in the file.

The structure is deliberately identical in the three places a doctor meets the file: the Rx pad panel, this tab on the patient page, and this tab in the review drawer. Only the width differs.

- **Labs:** results that are out of range now, or were earlier and have recovered, with the dated trend. Always-normal results are counted: `+14 normal results`.
- **Medicines:** every medicine, grouped by tag (On discharge, At home, In hospital).
- **Subheadings are short tags** ("On discharge", "In hospital", a sample date), not second headings.
- A section name is a link to that kind of data under Clinical data, where it is verified.

### 11.2 Clinical data (verify)

Every fact, one row each, written as on the Rx pad panel, grouped the same way.

- **Opens here from the Rx pad.** "Review and save" in the panel (and the short sticky "Not verified" strip that replaces the notice once it scrolls away) opens the drawer on this tab, because it is a request to verify.
- **Review bar:** an amber bar at the top says how much is verified, what to do ("Verify it, edit it, or remove it") and jumps to the next row to review.
- **Table per kind, in the Rx pad's columns.** Medicines: Medicine, Unit per dose, Frequency, When, Duration, Notes. Diagnoses: Diagnosis, Status, Since, Notes. Labs: Test, Value, Unit, Ref. range, Date. The same fields are what is stored (section 15) and what "Copy JSON" copies.
- **Kinds:** a strip of chips (All, Diagnoses, Allergies, Medications, Procedures, Lab results, Vitals, Reports and notes) that scrolls sideways with arrows when it does not fit.
- **Status:** All, To review, Needs a look, Verified, Removed, each with its count. "Needs a look" is everything flagged, held back or hard to read. This replaces the old "Needs your decision" card: the doubt is shown on the row it belongs to.
- **A row:** checkbox, the fact, its marks and `[n]`, then the actions. Clicking the row opens its line on the source page and shows what is behind it: why it needs a look, the words as written, the conflicting reading, the code, who acted and when.

| Action | What it means | What happens |
|---|---|---|
| **Verify** | The row is right as read | Becomes patient record. The label says exactly what is confirmed: "Verify as suspected", "Confirm none", "Confirm 4 Mar". |
| **Edit** | The row is wrong | Fields open in place with the words as written beneath. "Save and verify" stores the correction with the reviewer's name. The original reading is kept and shown as "Read as". "Undo edit" restores it. |
| **Remove** | The row should not go into the record | Left out everywhere, struck through, listed under Removed. "Undo" brings it back. Nothing is deleted and the page is not changed. |

- **Several at once:** tick rows, or "Select all" in a section. A bar appears at the bottom: Verify, Remove, Clear.
- **Bulk verify is limited on purpose.** It only verifies rows that were read clearly and carry no flag. Flagged, held or hard-to-read rows stay selected with a note that they must be checked one by one. "Verify N clear" in a section header does the same without ticking.
- **Edit is field by field, in the Rx pad's fields.** A medicine: Medicine, Unit per dose, Frequency (OD, BD, TDS, QID, SOS, HS, Stat offered, free text allowed), When (Before Food, After Food, Empty Stomach, Bed Time offered), Duration, Notes. A diagnosis: Diagnosis, Status (Confirmed, Suspected, Ruled Out; moving off Suspected is an explicit choice and is warned), Since, Notes. A lab: Test, Value, Unit, Ref. range, Date.
- **Copy JSON** on a section, or "Copy all as JSON", copies the rows in the Rx pad's structure with each row's source page. Removed rows and unverified held-back readings are left out; unverified rows are marked as draft.
- **"Review next"** in the amber bar jumps to the next row still to review and opens its page.

### 11.3 Documents (check)

The file as it was filed: every document in page order, filterable by kind (Summaries, Doctor notes, Labs, Imaging, Medication charts, Nursing and forms).

- A document row reads `[2] Discharge summary (Pages 2-5, Typed and handwritten, 26 Feb-4 Mar'26)`, then how many items were read from it, then Open.
- Opening a document shows what was read from it, as the same structured rows, grouped by kind.
- A document with nothing read from it is still listed, marked "No data". Forms and consents are part of the file.
- Unreadable pages are marked on their document.
- Images cut out of the pages (X-ray, ECG, photos) are tiles; a tile opens its page.

### 11.4 Search

One box for the whole file. It searches three places and labels each:

- **Clinical data:** the structured rows, including a reviewer's corrections. A result opens that row for review and its line on the page.
- **Documents:** document titles.
- **On the pages:** every readable line of every page. A result opens that line.

Rules: two characters or more; every word typed must be present; case, extra spaces and the comma or point in a number are ignored (`0,5` finds `0.5`); every match is highlighted. Clearing the box, or Escape, returns to the tab the reader was on. Pages that could not be read are not searchable, and the empty state says so.

---

## 12. Original pages

Shown beside the workspace, and as a drawer on the Rx pad when any `[n]`, thumbnail or Files row is opened.

- **One strip for the whole file.** All pages scroll continuously, in page order, with extra air and a hairline where a new document starts.
- **Top:** a fixed heading, "Original pages", with the page and document count. It does not change while scrolling.
- **Floating tag, top left:** names the paper under the reader's eye, `[2] Discharge summary 1 of 4`, and changes as the next document scrolls in.
- **When a paper has no name.** The reader names most documents. When it cannot, the tag says something true instead of inventing a title: "Photographs and images" for pictures with no text, "Unclassified pages" for text it could not classify, "Unfiled page" for a page in no document. These read lighter than a real title.
- **Bottom, floating:** a dark pill with previous page, `2 / 99`, next page, zoom out, zoom level, zoom in, and hide. The strip has spare room at both ends so neither the tag nor the pill covers a line of the page.
- The cited line is outlined in amber.
- No review tools here. On the Rx pad, "Review and save" in the drawer header moves to the workspace on the same page.

---

## 13. Things Case File never does

1. Never shows a suspected diagnosis as confirmed.
2. Never infers "no allergy" from a blank.
3. Never converts a unit or a brand name. A frequency is converted only to the Rx pad's exact short forms (OD, BD, TDS, QID, SOS), with the words as written kept beside it.
4. Never fills a missing date, dose, strength or laterality.
5. Never shows a low-confidence reading as a fact (it is held).
6. Never drops anything silently: held readings and unread pages are counted, missing documents are named.
7. Never writes to the patient record without a person verifying.
8. Never interprets or recommends.

---

## 14. Where this differs from the Doctor Copilot summary guide, and why

| Topic | Copilot summary | Case File | Why |
|---|---|---|---|
| Structure | Fixed S, B, A, R sections | Summary, then Data / Timeline / Files lenses | The Copilot card summarises a live EMR chart. Case File presents one paper file, which also needs a course over time and a document list. |
| Flag position | Before the value: `Hb ↓9.8` | After value and unit: `Haemoglobin: 10.3 g/dL ↓` | Matches the on-screen Patient Summary in this app (`HbA1c: 7.8 % ↑`) and the row layout here, where the name is a key with a colon. |
| Lab names | Short names from a closed list (`Hb`, `S. Creat`) | Full names | A row has room, and old files span labs with different naming. Short names can be switched on per the closed list later. |
| Units | Default unit omitted | Unit always shown as printed | Old files come from many labs and eras; the unit cannot be assumed. |
| Reference range | Not in the overview | Shown, light and bracketed | Ranges on old reports differ from today's; the doctor needs the range that applied. |
| Frequency | Slots and OD/BD from structured fields | OD/BD/TDS/QID/SOS where exact, never slots; as written kept | A count per day converts exactly; a time of day would be a guess. |
| Dates | `6 Feb ’26` | `06 Feb'26` | Sidebar house style (Past Visits cards). |
| Missing data | Omitted | Omitted in rows, but **named** under "Not found in this file" | For a digitised file, what is missing is itself clinical information. |
| Certainty | As recorded | As recorded, plus held readings | OCR adds a kind of uncertainty the live chart does not have. |

Everything else is shared: name first with details in one bracket, no labels inside brackets, one date per group, citations at the end of the row, bold anchors only, count instead of dump, omit instead of fill, never invent.

---

## 15. Data shape the UI expects

One bundle per patient file. Field names follow sheet "04 Data Output Schema" of the RFP.

```json
{
  "source":     { "totalPages": 99, "pagesWithData": 32, "pagesFormsOnly": 66, "pagesUnread": 1, "language": "…", "engine": "…", "processedOn": "…" },
  "encounters": [{ "id": "E1", "type": "IPD", "dateLabel": "…", "department": "…" }],
  "documents":  [{ "id": "D2", "category": "summaries", "title": "Discharge summary", "from": 2, "to": 5 }],
  "findings": [{
    "id": "med2", "domain": "MED", "encounterId": "E1", "group": "On discharge (04 Mar'26)",
    "title": "Nexium 40 mg", "quals": ["1x1", "PO", "Qty 7"],
    "verbatim": "Nexium  40 mg  1x1  PO  7",
    "cite": { "page": 4, "rid": "p4-med-2" }, "also": [],
    "confidence": 0.93, "handwritten": true, "flags": [], "hold": false
  }],
  "exceptions": [{ "kind": "conflictingValue", "title": "…", "findingId": "rpt2", "cites": [] }],
  "notFound":   ["Histopathology report of the excised tumour"],
  "brief":      [{ "text": "**Bold anchors** and plain text.", "cites": ["dx1", "dx2"] }],
  "timeline":   [{ "date": "27 Feb", "title": "Surgery", "detail": "…", "cite": { "page": 39, "rid": "…" }, "key": true }]
}
```

- `domain` is one of DX, ALG, MED, PROC, LAB, VIT, RPT.
- `cite.rid` is the region on the page (the bounding region in production).
- Lab findings add `value`, `unit`, `range`, `abnormal` ("H", "L" or empty) and an optional `series` of dated readings.
- Vitals add `facts`, a list of `{k, v}` pairs.
- `quals` are already in display order. The formatter joins them; it does not reorder or relabel.
- **Format in code, not in the model.** The reader returns facts; the display strings are built by the front end from these fields.

---

## 15a. Stored structure: the Rx pad's own JSON

Every fact is stored in the row shape the Rx pad and VoiceRx already use, so it can be copied into a prescription, counted in analytics and exchanged with other systems without another conversion (`rxFormat.js`).

| Kind | Stored under | Fields |
|---|---|---|
| Diagnosis | `diagnosis` | `name`, `duration`, `status` (Confirmed, Suspected, Ruled Out), `notes`, `icd_code` |
| Medicine | `medications` | `name`, `dosage` (unit per dose), `frequency`, `when`, `duration`, `notes` |
| Surgery or procedure | `surgery` | `name`, `notes` |
| Allergy, chronic condition, past surgery | `medical_history` | `type`, `name`, `enable` (Y / N), `status`, `duration`, `date`, `notes` |
| Lab result | `lab_results` | `reportName`, `testName`, `value`, `units`, `refRange`, `arrowDirection`, `date` |
| Vitals | `vitals_and_body_composition` | `temperature`, `pulse`, `respiratory_rate`, `blood_pressure`, `spo2`, `height`, `weight`, `date`, `notes` |
| Complaint | `symptoms` | `name`, `duration`, `severity`, `notes` |
| Investigation report | `lab_investigation` | `name`, `notes` |
| Follow-up, other notes | `follow_up`, `others` | `name`, `notes` |

Every row also carries `_source`: the fact id, encounter, page and region it was read from, the words as written, the confidence and the review status. A field is filled only from what the page says; anything without a field of its own goes to `notes`.

## 15b. Real pages for local demos

The repository holds only a de-identified sample with drawn stand-in pages. For a demo on a developer's own machine, two git-ignored places can hold the real thing: `public/case-file-local/` (scanned page images and a manifest that maps data page numbers to scan pages) and `mock/archivedRecordsMock.local.js` (the same sample with real dates and values). When they exist, Original pages shows the real scans and a citation marks the whole cited page (no region is known on a scan yet). They must never be committed.

## 16. Open questions

1. The six document folders: confirm against the extraction team's categories.
2. Hold threshold and the bulk-verify threshold: who sets them, and are they per field?
3. Who verifies by default: the MRD team the next morning, the doctor, or both with different rights?
4. Copy to RxPad: should a verified discharge medicine be copyable into today's prescription, like Past Visits allows?
5. Short lab names and Indian shorthand (`Hb`, `TLC`, `OD/BD`): switch on from the Copilot closed lists, or keep full names for old files?
6. The scanned PDF shared for this exercise is a different patient from the digitised one, so the source pages in the draft are drawn stand-ins. A matching scan and digitised pair is needed to show real pages.

---

## 17. Checklist before a file is shown to a doctor

- [ ] Notice shows the right state and count.
- [ ] Summary is five lines or fewer, anchors bold, every line cited, certainty words kept.
- [ ] Data sections in the fixed order; empty ones omitted.
- [ ] Every row follows its format in section 8; no labels inside brackets.
- [ ] Dates in `DD Mon'YY`; one date per lab group.
- [ ] Arrows and red only where the source flags.
- [ ] No converted unit, frequency or brand name.
- [ ] Held readings are out of the panel and counted.
- [ ] Conflicts are marked and nothing in conflict is saved.
- [ ] "Not found in this file" lists what is missing.
- [ ] Coverage numbers add up to the page total.
- [ ] Every shown fact opens its exact place on a source page.
