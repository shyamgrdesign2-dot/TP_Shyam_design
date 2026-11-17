# Case File: structure and formatting guide

15 Nov 2026 · For design, the Velora extraction team and the Doctor Portal front end · UI draft on branch `feat/archived-records-digitization`

Case File is the place on the Rx pad where a consulting doctor reads what a patient's old paper file says. A 100-page scanned file has already been read by AI the night before the appointment. This guide defines **what each part of the panel contains, how each fact is written, and what happens to anything the reader was unsure about**.

> **One-line rule:** show the doctor the fact first, in the shape they already read on a prescription pad, with where it came from one click away, and never show a guess as a fact.

It builds on two things already in the product:

1. **The blue sidebar's own formatting** (Past Visits, Vitals, Investigation Results, Medical History, Obstetric). Case File sits in the same sidebar, so it reads the same way.
2. **The Doctor Copilot patient summary guide** (`PATIENT-SUMMARY-FORMATTING-GUIDE.md`, 12 Nov 2026). Where the two overlap, this guide follows it. Section 13 lists where Case File differs and why.

Code: `src/components/archived-records/`. Preview without login: `http://localhost:3007/dev/archived-records`.

---

> **Sample data, 16 Nov 2026.** The built-in sample is now a de-identified copy of a real patient folder from the hospital's records department: six PDFs, 275 pages, two emergency visits and two admissions. The examples in this guide were written against an earlier sample (one admission with a pre-admission visit); the rules are the same. A folder of several files is treated as one run of pages, and each file stays visible under Documents.

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

## 3a. Rx pad panel as of 16 Nov 2026: search first, no summary

This replaces the order drawn in section 3 for the panel beside the Rx pad. The review workspace is unchanged.

| Order | Part | Rule |
|---|---|---|
| Header | `Case File` + `AI draft` tag | The tag sits beside the title in the blue header. Hover or focus says what a draft is. |
| 1 | Search | `Search this case file`. Stays under the header while the panel scrolls. |
| 2 | Notice | `Not verified yet`, as before. Scrolled away, it becomes a one-line strip under the search. |
| 3 | Details | Medical History, Diagnosis, Procedures, Med (Rx), Lab Results, Vitals, Reports and Notes. |

- **No summary in the panel.** In a consultation there is no time to read one, so the details start straight away. The six-pointer summary stays on the Structured record tab of the review. (`summary` on `ArchivedRecordsRailPanel` brings it back.)
- **Search looks at the data, not the pages.** Two characters or more. Every word typed must be in the row as shown. Results are the same sections with only the matching rows, all of them: normal lab results are found too, and "+N more" does not apply. No match offers the review, which also searches the pages. Escape clears.
- **A row's bracket carries only what a reading doctor needs.** Left out, and still in Clinical data and on the page:

| Left out | Example | Why |
|---|---|---|
| Form and oral route | `Tablet`, `Capsule`, `PO` | The medicine's name says it |
| A count of one | `1 Tablet` beside `1-0-1` | Says nothing new. `2 Tablets` stays as `2 per dose` |
| A long medicine note | `(1-0-1, note)` | Notes over 40 characters wait behind the word `note`; hover or focus shows them whole. A short one (`Last dose this morning`) stays. Routes other than oral (`IV`, `SC`, `Both eyes`) always stay |
| Proof of a statement | `Stated on 8 pages` | The citations beside the row say where |
| Routine wording | `under aseptic technique` | Not a finding |
| An echo of the name | `(s/p WLE (2016))` after `… after wide local excision (2016)` | The bracket only repeats the name |

- **Vitals:** the earlier sets are one link, `+N earlier sets (in the review)`, in place of a sentence.
- **Every fact says when it was written.** Diagnoses, procedures, lab results, vitals and notes already carry their date. Medicines and allergies now do too:

| Case | Shown as |
|---|---|
| Every medicine under a tag has the same date | The date is on the tag once: `On discharge (16 Jul'26)`, `At home (09 Jul'26)`. The rows do not repeat it |
| The medicines under a tag span days | The tag gives the span, `In hospital (09 Jul to 16 Jul'26)`, and each row carries its own date or days in its bracket, before `note`: `(Q12H, IV, 09 to 16 Jul'26, note)` |
| The row's own words already give the date | It is not added again |
| An allergy statement | The date it was stated, in the bracket: `No known drug allergy (09 Jul'26)` |


## 3b. One record component, three places (16 Nov 2026)

The record is one component, `CaseFileRecord` (`src/components/archived-records/CaseFileRecord.jsx`). It is the same piece in every place, so the order, the section headings, the tags and the wording cannot drift apart.

| Place | Link in the preview | What is around it |
|---|---|---|
| Review workspace, Structured record tab | `/dev/archived-records` | Clinical data and Documents tabs, the original pages alongside. The workspace has its own search and Documents tab, so the record shows no tabs and no search box here. No timeline: beside the original pages it adds nothing |
| Rx pad panel | `/dev/archived-records/rx-pad` | The Rx pad's blue sidebar and its section frame; a light drawer for the original page |
| On its own | `/dev/archived-records/record` | Nothing. This is how another screen or another EMR places it: in a column, a card, a drawer or a page |

- **No summary anywhere a doctor reads.** The record is the notice, then the details. The summary logic stays in `caseFileStory.js` and is off by default (`summary`).
- **It lays itself out from its own width.** Under 640px, one fact per line. From 640px, short facts run along the line with hairline dividers and lab results sit in an even grid. The host does not say which.
- **It carries its own look.** The section title bar is drawn by the record (`CaseFileSection`), matching the Rx pad panel, so no sidebar stylesheet is needed. A host with its own frame passes `RxSection`.
- **Tabs at the top.** The Rx pad panel has two, Data and Documents: the course of each stay is already the Hospital Course section at the foot of Data, so the panel has no Timeline tab. In the panel the two tabs share the width equally and run from one edge of the panel to the other (Tesseract `TabsList fullWidth`, no side gutter). The record on its own has three, Data, Timeline, Documents. Tabs and search stay fixed together while the record scrolls; search looks at the tab that is open.
- **Documents are listed by period.** One entry per visit or stay, newest first: `IPD · Orthopaedics  09 Jul-16 Jul'26  62 documents, 235 pages`. The newest is open. Inside, papers sit under their kind (Summaries, Doctor notes, Lab reports, Imaging, Medication charts, Nursing and forms). Papers that share a name within a period are one line that opens to its parts: `Consultation record  13 papers, 27 pages`. The workspace's Documents tab uses the same periods; each document there names the PDF it is in.
- **Red dot on the rail icon.** When the Rx pad opens for a patient who has a Case File, the Case File icon in the blue rail carries the rail's own red dot. Opening the panel clears it. In the real build "seen" is kept per doctor and patient, and the dot comes back when new pages are added.
- **Timeline** (record on its own only) events sit under the visit they belong to.
- **What the host gives:** `onOpenReview` (where facts are verified; without it the notice has no button), `onOpenDomain` (makes a section heading a way in to that kind of data), `heading` (shows "Case File · AI draft" when the host has no heading), `tabs` (which of the three to show; `false` for Data only), `search`, `notice`, `quick`.
- The preview has no header of its own any more: each place is its own link.

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
- **A group tag is a heading and must be seen first** (17 Nov 2026): the tag over a group of rows (`Medical Condition`, `Final diagnosis`, a stay in Hospital Course) is 12px semibold in the darker ink on a soft grey tag, 24px tall. No dot and no icon on it: size and ink carry it, and the only dots are the grey ones on rows. A tag too long for the panel wraps; it is never cut.
- **One idea per row.** A row never mixes two facts to save space.

---

## 5. Separators, dates and citations

**Fewer citations, on purpose.** A row shows one citation: the page a reader would open first (the discharge summary or a typed report where one exists). Other sources sit behind a small grey `+2`. A summary pointer shows at most two. A screen full of blue numbers is a screen nobody clicks.

**Short forms for spans of time.** `2 weeks` is shown as `2w`, `2 years` as `2y`, `5 days` as `5d`, `3 months` as `3mo`. Display only; the stored data keeps the words as written.

**No remarks about reading problems in a row.** "Frequency drawn as tally marks" is not a clinical fact. The part that could not be read is left out, the row keeps its warning mark, and the explanation is kept for the reviewer (`readerNote`). A fact whose main value could not be read is held back.

**"Suspected" explains itself.** The word is amber with a dotted underline, and hovering or focusing it says "Written as suspected, not confirmed". There is no second warning mark at the end of that row. Tooltip text is always white on the dark tooltip.

**Links inside the summary are not blue.** A visit number or a count that jumps to a section reads as a key phrase (dark ink, medium weight) and underlines on hover.


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

Medical History → Diagnosis → Procedures → Med (Rx) → Lab Results → Vitals → Reports and Notes → Hospital Course

Section title bars and icons are the sidebar's own (`RxSection`), the same as Past Visits.

### 8.0 Medical History (17 Nov 2026)

What stays true about the patient beyond one visit. It is the Rx pad's own Medical History: the same six sections, the same names, the same fields, so a verified item can be saved into the patient's history and counted without another conversion (`medicalHistory.js`).

| Section (tag) | What goes here | Fields stored | How a row reads |
|---|---|---|---|
| Medical Condition | Long-standing conditions, and conditions the page says the patient does not have | `title`, `enable`, `status`, `since`, `medication`, `note` | `Type 2 diabetes mellitus (18y, on OHAs)` · `Hypertension (18y, on medication)` · `No ischaemic heart disease` |
| Allergies | Named allergies, and "no known allergy" as written | `title`, `enable`, `status`, `since`, `note` | `Penicillin (rash)` · `No known drug allergy (09 Jul'26)` |
| Surgical History | Operations before this file's stays | `title`, `dateType`, `date`, `note` | `Wide local excision with primary closure (2016)` |
| Family History | Conditions in the family | `title`, `enable`, `relationship`, `note` | `Diabetes (Father, Mother)` |
| Lifestyle | Habits: smoking, alcohol, tobacco, diet, activity | `title`, `enable`, `status`, `since`, `note` | `Smoking (20y, Inactive, stopped 2019)` · `No alcohol (09 Jul'26)` |
| Additional History | Anything about the past that fits none of the above | free text | `Immunisation status not known (09 Jul'26)` |

Rules:

- **Tags, then dots.** Each section is a short tag that starts at the same left edge as the heading "Medical History". In a narrow column the items under it are a dotted list, as in the sidebar's own Medical History. On a wide page they run along the line with hairline dividers.
- **Order:** Medical Condition, Allergies, Surgical History, Family History, Lifestyle, Additional History. Inside a section, what the patient has comes first, then what the page says they do not have.
- **The name is the clean name.** `Squamous cell carcinoma, right gluteal skin`, not the sentence it came in. What happened to it goes to the fields and the note: `(Inactive, excised 2016, no recurrence)`. Clean names are what make the data countable.
- **The bracket is read off the stored fields**, in this order: relationship, since (short: 18y), date, status, medication, note. "Active" is the usual state and is not written; "Inactive" is. `medication: Yes` reads "on medication" unless the note already says which ("on OHAs"). A note longer than 40 characters waits behind the word "note".
- **A denial is data.** "No h/o IHD" is the tag Ischaemic heart disease with `enable: "N"`, shown as `No ischaemic heart disease`. It is never dropped and never turned into a free-text remark.
- **History that can change carries the date it was written:** allergies, lifestyle, family history and additional history end with the date in the bracket.
- **A section the file has nothing for is simply left out** (no "Not recorded: Family History" line; the doctor's time goes to what is there). Allergies are the one exception: with no allergy entry at all, the Allergies tag still shows with "Not recorded in this file", because a missing allergy line must never read as "none".
- **Nothing unreliable becomes history.** A margin note that could not be read stays held back; it does not produce a Family History entry.
- **In the review workspace** Medical History is one kind in Clinical data (it replaces the separate Allergies kind), grouped by the same six tags. A row is corrected in that section's own fields: Medical Condition has Status, Since, Medication, Note; Family History has Relationship; Surgical History has Date of surgery and Remarks.

### 8.1 Diagnosis (17 Nov 2026)

What this file diagnosed. Long-standing conditions are Medical History (8.0), not here. A diagnosis is stored as the Rx pad's diagnosis row plus the two fields the database keeps beside it (`diagnosisTypes.js`, `rxFormat.js`): `name`, `type`, `duration` (since), `status`, `icd_code`, `notes`.

| Tag (type) | What goes here | How a row reads |
|---|---|---|
| Final diagnosis | What the stay concluded: the discharge summary's final diagnosis | `Closed left neck of femur fracture (after a slip and fall at home, 09 Jul'26)` |
| Secondary diagnosis | Also recorded for the stay: other problems found or treated | `MASLD (Suspected, 09 Jul'26)` · `Bedsore over right gluteal region (coloplast patch applied, 16 Jul'26)` |
| Provisional diagnosis | What was being considered on admission or during the stay (provisional, working, impression) | `Basal atelectasis (Suspected, for desaturation, 14 Jul'26)` |

Rules:

- **Order:** Final, Secondary, Provisional. The conclusion first; what was only being considered last.
- **The type is the tag, never a word in the bracket.** It is stored on the row (`type`: Final, Secondary, Provisional) and a reviewer can change it, which moves the row to the other tag.
- **Status and type are different things.** Status is the Rx pad's own: Confirmed, Suspected, Ruled Out. `Suspected` and `Ruled out` are the one amber word in the bracket; `Confirmed` is not written. A status is filled only when the page gives one (a question mark, "ruled out") or the diagnosis is a final one read clearly. A provisional diagnosis written plainly has no status.
- **A suspected diagnosis stays suspected**, including after verification.
- **The bracket is read off the stored fields**, in this order: status, since, note, date. The note is clinical context only ("after a slip and fall at home"), never a description of where on the page it was written. A note longer than 40 characters waits behind the word "note".
- **Every diagnosis carries its date**, because a file can hold more than one stay.
- **One diagnosis, one row.** "? Volume overload / Basal atelectasis" is two suspected diagnoses, each its own row, so each can be counted.
- **The name is the clean name**, without an expansion in brackets after it.
- **ICD-10 is stored, not read out.** The reading views do not show the code. It is a field of its own when the row is corrected (Diagnosis, Type, Since, Status, ICD-10, Notes).
- **Narrow column:** a dotted list under each tag, as in Medical History. Wide page: rows run along the line with hairline dividers.
- If a diagnosis line is only partly readable, the readable part is shown with the mark "Only part of this line could be read". Nothing is filled in.

### 8.2 Allergies

| | |
|---|---|
| Format | `Allergen (reaction)` |
| Negative | `No known drug allergy` |

- A negative is shown **only when the file says so**. It is never inferred from an empty field.
- When pages disagree (one says an allergy, another says none), the allergy is shown with a conflict mark and nothing is added to the allergy list until someone decides.

### 8.3 Procedures (17 Nov 2026)

What was done to the patient during the stays this file covers. An operation before these stays is Medical History (Surgical History). A procedure is stored as the Rx pad's surgery row (`name`, `notes`) with the fields the inpatient record keeps beside it (`procedureTypes.js`, `rxFormat.js`): `name`, `type`, `date`, `time`, `anaesthesia`, `notes`.

| Tag (type) | What goes here | How a row reads |
|---|---|---|
| Surgery | An operation, in theatre | `Left hip bipolar hemiarthroplasty, cemented (11 Jul'26, Block + Spinal, Southern Moore approach)` |
| Other procedures | Anything else done to the patient: a catheter, traction, a tap, a dressing under anaesthesia | `Bladder catheterisation (09 Jul'26, 16 No. Foley's, 550 ml drained)` |

Rules:

- **Order:** Surgery first, then other procedures. The two tags show only when a file has both kinds; with one kind the heading "Procedures" says enough.
- **The bracket is read off the stored fields**, in this order: date, anaesthesia, note. The date leads because when it was done is the first thing asked about an operation.
- **The name is the clean name.** A detail that is not the name of the procedure goes to the note (`16 No. Foley's`), and a qualifier is joined with a comma, not a second bracket (`..., cemented`).
- **Time of day and type are stored, not read out.** Both are fields when the row is corrected (Surgery / procedure, Type, Date, Time, Anaesthesia, Notes).
- **The note is clinical only:** approach, size, what was drained. Who did it and where on the page it was written are not notes. Staff names are never stored.
- **A value the file gives two ways is not filled in.** Blood loss written as two different amounts stays out of the row until a reviewer settles it.
- Laterality (`left`, `right`) is part of the name when written.
- **Narrow column:** a dotted list. Wide page: rows run along the line with hairline dividers.

### 8.4 Med (Rx)

Three groups, in this order, each with its own small title:

1. **On discharge (date)**: what the patient went home on. Most relevant, so first.
2. **At home before admission**: from the reconciliation form.
3. **Given in hospital**: only the ones a later doctor needs (steroids, antibiotics with a conflict, anticoagulants, strong analgesics). The full hand-written list is one row in Reports and Notes.

**As of 17 Nov 2026** a medicine is stored as the Rx pad's medicine row with three fields beside it (`rxFormat.js`): `name`, `generic`, `type` (form), `dosage` (unit per dose), `frequency`, `when`, `duration`, `notes`, `stage` (At home, In hospital, On discharge).

- **The name is the brand and strength alone:** `Augmentin 1000 mg Duo`. What is in it is the **generic**, a field of its own, written short (`Amoxycillin + clavulanate`). The full composition as printed is kept and shows on hover or focus of the generic. This is what makes medicines countable by drug.
- **How a row reads:** brand in dark ink, generic in mid grey, then the light bracket: `Pradaxa 110 mg Dabigatran (1-0-1, 1mo)`. A generic that only repeats the name is not written (`Tramadol 50 mg (injection, Q12H, IV)`). A generic is filled only where the page or the row gives one; it is never looked up.
- **Form:** a tablet or capsule is the usual thing and is not said. Any other form leads the bracket, because it changes how the medicine is given: `(injection, ...)`, `(nebulisation, ...)`, `(eye drops, ...)`. The form is a field, so it is no longer repeated as a note.
- **One medicine, one row.** Two medicines written on one line are two rows.
- **Correcting a row:** Medicine, Generic, Form, Unit per dose, Frequency, When, Duration, Note.
- **Narrow column:** a dotted list under each tag (On discharge, At home, In hospital).

| | |
|---|---|
| Format | `Name strength Generic (form if not oral, unit per dose, frequency, when, duration, notes)` |
| Example | `Nexium 40 mg (1 per dose, OD, PO, Qty 7) [2]` |
| Example | `Dexyclav 500 mg (1 per dose, TDS, PO, Qty 19) [2]` |
| Example | `Vometa FT (SOS, PO, Qty 10) [2]` |
| Example | `Hydrocortisone 100 mg IV (During surgery, 27 Feb 2026, 08:10) [10]` |

- **The bracket follows the Rx pad's own column order:** unit per dose, frequency, when, duration, notes. This is the same order a doctor sees in the Rx pad's medicine table and in Past Visits.
- **Frequency uses the Rx pad's short forms where the conversion is exact:** `1x1` is OD, `2x1` BD, `3x1` TDS, `4x1` QID, "when needed" SOS. Anything else stays as written (`Every 2 weeks`). It is never turned into `1-0-1` slots, because the page does not say morning or night.
- **Nothing is computed or guessed.** "When" and "Duration" stay empty unless the page states them; a duration is never worked out from a quantity.
- **Whatever has no column goes to notes:** route (`PO`), quantity (`Qty 7`), "Stopped before surgery". No detail is dropped.
- **The words as written are kept** with the fact (`1x1  PO  7`) and shown beside the row in review, so the conversion can always be checked.
- A missing strength is simply absent. Brand names stay as written; a generic is stored beside the brand only when the file itself gives it.
- A dose that can be read two ways (`1 x 2 tab`) keeps its mark.

### 8.5 Lab Results (17 Nov 2026)

A result is stored as the Rx pad's lab row (`rxFormat.js`): `reportName`, `testName`, `value`, `units`, `refRange`, `arrowDirection` (up, down), `date`.

| Tag | What goes here | How a row reads |
|---|---|---|
| Out of range | The latest value is high or low | `Potassium: 3.2 mmol/L ↓ (11 Jul'26, from 3.6, 2 readings)` |
| Back in range | The latest value is normal, an earlier one was not | `Sodium: 138 mmol/L (12 Jul'26, from 133, 2 readings)` |

Rules:

- **The reading view shows only what needs attention:** results that are, or were, out of range. Normal results are not listed and not counted there (no "+50 normal results" line). Search still finds every result, and Clinical data in the review lists them all, with an "In range" group.
- **Latest value, with its date in the bracket.** Where a test was read more than once the bracket also says where it came from (`from 3.6, 2 readings`); the full trend is on hover and in Clinical data.
- **One clean name per test, the same across the file:** `Total leucocyte count` (not "TLC" on one page and "Total count (TC)" on another), `Capillary blood glucose`, `Platelet count`. The short forms doctors type (TLC, GRBS, FBS, RBS, Hb, K, Na) still find the row in search.
- **Every test carries its report** (`reportName`: Complete blood count, Electrolytes, Renal function test, Blood glucose, Arterial blood gas, Coagulation profile, ...), so results can be grouped and counted the way the Rx pad's are. The report is stored and editable; the reading view does not show it.
- **One test, one row.** "PT / INR 10.7 / 1.01" is two rows; "HBsAg and HCV: NR" is two rows.
- **Stored one row per reading.** A test read three times is three stored rows, each with its own date, so a trend can be drawn from the data alone.
- **Units and reference ranges are filled only when the page gives them.** A hand-copied value without a unit stays without one; a range is never assumed. High or low is marked only where the page marks it (an arrow, a circle, "H").
- Abnormal values are the one use of colour: red with an arrow.
- **Never "+1 more":** a group that is one row over its limit shows that row.
- **Correcting a row:** Report, Test, Value, Flag, Unit, Ref. range, Date.

### 8.6 Vitals (17 Nov 2026)

A set is stored as the Rx pad's vitals row: `temperature`, `pulse`, `respiratory_rate`, `blood_pressure`, `spo2`, `height`, `weight`, `date`, `notes` (the moment, and readings the Rx pad has no field for, such as GCS).

- **Only the last recorded set is shown**, under a tag that says when: `Morning of discharge (16 Jul'26)`, then `BP: 133/84 | Pulse: 89 | SpO2: 99%`.
- **When the last set is thin, the last full one is shown with it.** A last entry that is one reading off a chart (a blood pressure and nothing else) does not tell a doctor enough, so when it carries fewer than three of the main vitals (BP, pulse, SpO2, temperature, respiratory rate), the most recent set of the same stay that does is shown under it, with its own tag and date. Never more than these two.
- **Sets are never merged.** Each set keeps its own date and its own citation; readings from two moments are not combined into one line.
- Earlier sets are not listed and not counted in the reading view (no "+27 earlier sets" line). A long stay has hundreds; saving them all would flood the patient's vitals.
- Units follow the product: `F`, `/min`, `mmHg`, `%`, `cms`, `kgs`.

### 8.7 Reports and Notes (17 Nov 2026)

Everything in the file that is prose: what was found, said, done and advised. Notes are sorted into tags, in the order a discharge summary tells it, and each tag is stored where the Rx pad keeps that kind of thing (`rxFormat.js`).

| Tag | What goes here | Stored under | In the reading view |
|---|---|---|---|
| Keep in mind | What a later doctor must not miss: a low saturation, a hypoglycaemia, a difficult airway, an incidental finding | `others` (kind: Keep in mind) | All shown |
| Symptoms | Presenting complaints, one row per symptom | `symptoms`: `name`, `duration`, `severity`, `notes` | All shown |
| Examination | The doctor's examination first, then nursing findings | `examinations`: `name`, `notes` | 1, rest behind "+N more notes" |
| Investigations | Imaging, ECG, echo and other reports with their findings | `lab_investigation`: `name`, `notes` | 3 |
| Opinions | What other specialities said | `others` (kind: Opinions) | 2 |
| Operation notes | Anaesthesia, the operation report, implants | `others` (kind: Operation notes) | 1 |
| Course | The story of the stay in notes | `others` (kind: Course) | Folded: "Show 22 notes" (the Hospital Course section tells it in short) |
| Advice and follow-up | Advice on discharge, and each follow-up with its date | `advice`, `follow_up`: `name`, `notes` | 3 |
| Other notes | Nursing and administrative detail: cannulas, risk scores, intake and output | `others` (kind: Other notes) | Folded: "Show 10 notes" |

Rules:

- **A symptom is a short fact, not a note:** `Cough (3d, mucoid expectoration, 16 Jan'26)`. Bracket order: since, severity, note, date. A complaint written as a sentence becomes one row per symptom, so symptoms can be counted. It is corrected in the Rx pad's symptoms table (Symptom, Since, Severity, Notes).
- **A note is `Title: text (date)`**, two lines until it is opened. The title is a short name without a date in it (`CT brain, plain`, not "CT brain, plain (09/07/2026)"); the date is the row's own and shows once, in the bracket.
- **A follow-up's date is its date field**, not part of its name: `Suture removal at local hospital (25 Jul'26)`.
- **Nothing a doctor must not miss is folded.** Keep in mind and Symptoms always show in full. Never "+1 more".
- **Order of tags:** Keep in mind, Symptoms, Examination, Investigations, Opinions, Operation notes, Course, Advice and follow-up, Other notes.
- Images found in the file (X-ray, ECG, clinical photographs) are small tiles at the end of the section.

### 8.8 Hospital Course (17 Nov 2026)

What happened during each stay, in order, at the foot of Data. One tag per stay, newest first; under it one row per event (`hospitalCourse.js`).

```
IPD 2 · Orthopaedics (09 Jul-16 Jul'26, 7d)
09 Jul   Came to the emergency: fall from stairs at about 11 am; left hip pain [1]
         Admitted under Orthopaedics: closed left femur neck fracture [2]
11 Jul   Left hip bipolar hemiarthroplasty, cemented: spinal with nerve blocks [3]
         Shifted to HDU [3]
12 Jul   Shifted to the ward: post-operative day 1 [4]
16 Jul   Discharged: stable, afebrile, partial weight bearing with walker [5]
```

| Field | What it holds | Shown |
|---|---|---|
| `kind` | arrival, admission, opinion, investigation, procedure, transfer, event, milestone, discharge, followUp | No. Stored, and found by search ("transfer") |
| `on`, `until` | The day as a date that sorts (`2026-07-11`); `until` for a span of days | As `11 Jul`, once per day |
| `time` | 24-hour, only when the page gives one (`13:15`) | No. Stored |
| `day` | The day of the stay; the day of admission is 1 | No. Stored |
| `title` | What happened, in a few plain words | Darker ink |
| `note` | One short remark | After a colon, lighter ink |

Rules:

- **The tag is the stay:** kind of stay with its number when there are several, department, dates and length in the short form (`7d`).
- **One event, one row.** "Operated, then shifted to HDU" is two rows, so moves to HDU or ICU can be counted.
- **A row says what happened, not what was found.** Results, diagnoses and medicines are in their own sections. A number is in the note only when it is the event (`SpO2 88% on room air`).
- **The day is written once.** Later events of the same day sit under it; a line that wraps stays clear of the date column. The year is in the tag.
- **The emergency visit a stay began with is the first row of that stay.** A visit that was not a stay has no course.
- **An event follows the fact it restates.** If a reviewer removes that fact, the event is not shown; a corrected procedure name is the name the event uses.
- **Follow-ups are not part of the course.** They are under Advice and follow-up.
- **Stored twice from the same rows** (`buildHospitalCourse`): as rows per stay (`admittedOn`, `dischargedOn`, `days`, `entry`, `outcome`, `events`) for analytics, and as one paragraph (`text`) for the Hospital Course box of the product's discharge summary.

### 8.9 What Data never shows

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

**Drawer width (17 Nov 2026).** Over the Rx pad the review drawer covers 90% of the page on every screen (`90vw`, no pixel cap), so the data and the original pages both have room and a strip of the pad stays in view.

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

## 12. Source page viewer

Shown beside the workspace, and as a drawer on the Rx pad when any `[n]`, thumbnail or Files row is opened.

- **One strip for the whole file.** All pages scroll continuously, in page order. A folder of several files is one run of pages.
- **Two columns, each with its own header.** The tabs, the search box and the verified count belong to the digitised record and sit over the left column only. The original document on the right has its own header at the same height. The feature name, the "AI draft" badge and the one-line description of the file live in the page's top header (the violet banner on the patient page, the drawer header in review), not inside the workspace.
- **The viewer's header** is in the grey of the paper area, not white. It reads, left to right on one centre line: a small `ORIGINAL` label, the document's title with an arrow, then at the far end the file name, the page range and the citation number. Example: `ORIGINAL  Discharge summary ⌄ ...... File 6 | p. 164-169 | [54]`. It changes as the next document scrolls in. A long title is cut with an ellipsis; the full title is on hover.
- **The title opens the catalogue.** A list of every document, grouped under its file, with a "Find a document" box and one quiet line saying what the file holds (`6 files · 77 documents · 275 pages`). Choosing a document jumps to it.
- **When a paper has no name.** The reader names most documents. When it cannot, the header says something true instead of inventing a title: "Photographs and images", "Unclassified pages" or "Unfiled page", in lighter ink.
- **Bottom, centred: the page dock**, the one floating control, in grey glass. Previous page, `164 / 275`, next page, zoom out, zoom level, zoom in. There is no collapse control.
- **A citation lands on the words, not just the page (17 Nov 2026).** Opening any `[n]` scrolls the strip so the cited words sit in the middle of the pane, inside an amber box, with a short pulse as it arrives. The doctor never has to search the page. This is the same on a drawn sample page and on a real scan, on the Rx pad's drawer and beside the workspace.
- **What that needs from the reader:** with every fact, the box of the words it was read from, as `[x, y, width, height]` in fractions of the page image, keyed by page and region. For local demos these sit in `public/case-file-local/regions.json` beside the scans. A region with no box falls back to marking the whole cited page ("cited on this page"); a box is never guessed.
- **The Rx pad's drawer is for reading only.** No "Review and save" and no "Next to review" there: the doctor is checking a source, not saving. Both stay in the review workspace, where the file is verified.

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
  "timeline":   [{ "id": "t9", "encounterId": "E1", "kind": "procedure", "on": "2026-02-27", "time": "", "date": "27 Feb", "title": "Surgery", "detail": "…", "factId": "proc1", "cite": { "page": 39, "rid": "…" }, "key": true }]
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
| Diagnosis | `diagnosis` | `name`, `type` (Final, Secondary, Provisional), `duration`, `status` (Confirmed, Suspected, Ruled Out), `notes`, `icd_code` |
| Medicine | `medications` | `name`, `generic`, `type` (form), `dosage` (unit per dose), `frequency`, `when`, `duration`, `notes`, `stage` (At home, In hospital, On discharge) |
| Surgery or procedure | `surgery` | `name`, `type` (Surgery, Procedure), `date`, `time`, `anaesthesia`, `notes` |
| Medical history (condition, allergy, past surgery, family history, lifestyle, additional history) | `medical_history` | `type` (medical_condition, allergy, surgery, family_history, lifestyle, others), `name`, `enable` (Y has it / N page says not), then by type: `status` (Active, Inactive), `duration` ("18 Year(s)"), `medication` (Yes, No), `relation`, `dateType` (year, full), `date`, `notes` |
| Lab result | `lab_results` | `reportName` (the panel), `testName`, `value`, `units`, `refRange`, `arrowDirection`, `date`; one row per reading |
| Vitals | `vitals_and_body_composition` | `temperature`, `pulse`, `respiratory_rate`, `blood_pressure`, `spo2`, `height`, `weight`, `date`, `notes` |
| Symptom | `symptoms` | `name`, `duration`, `severity` (Mild, Moderate, Severe), `notes` |
| Examination | `examinations` | `name`, `notes` |
| Investigation report | `lab_investigation` | `name`, `notes` |
| Advice, follow-up | `advice`, `follow_up` | `name`, `notes` (a follow-up's date is the row's date) |
| Other notes | `others` | `name`, `notes`, `kind` (Keep in mind, Opinions, Operation notes, Course, Other notes) |
| Hospital course | `hospital_course` (one entry per stay) | `encounterId`, `type`, `department`, `admittedOn`, `dischargedOn`, `days`, `entry`, `outcome`, `text`, and `events`: `kind`, `date`, `until`, `time`, `day`, `title`, `note` |

Medical history is also available in the shape the product stores it (`buildMedicalHistory` in `medicalHistory.js`, the JSON in `tbl_micro_patient_medical_history.medical_history`): one entry per section with `tmmhs_id`, `title`, `no_know_history` and its `tags` (`title`, `enable`, `status`, `since`, `medication`, `relationship`, `dateType`, `date`, `note`); Additional History is the first entry's `medical_history_remarks`.

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
