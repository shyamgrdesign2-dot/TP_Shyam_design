# Case File Summary: how it is generated

16 Nov 2026 · For the designer, the CTO and the developer who builds the production generator · Draft code: `src/components/archived-records/caseFileStory.js`

Companion documents: `CASE-FILE-FORMATTING-GUIDE.md` (how every fact is written on screen) and `CASE-FILE-SUMMARY-SAFETY-RULES.md` (the degradation ladder L0 to L6, the variability matrix, hard rules H1 to H30, regeneration and audit rules, fixtures). This document explains the architecture. Where the safety document gives more detail on a rule, it is the authority.

---

## 1. What the summary is for

- A doctor opens a patient whose old paper file has been scanned and read. The Summary is the first thing they see.
- It is a short story of the file: how the patient came in, what was found, what was done, how it went, how they left, what they went home on, what was planned next, and what to keep in mind.
- It is read in under a minute, in the order things happened.
- It is built by code from facts already read off the pages. No model writes it.
- Every bullet points back to the pages it came from.

**Three promises**

| Promise | What it means in practice |
|---|---|
| It is always generated | A 300-page file, a 2-page file and a file of consent forms all get a summary. When little can be told, it says so and says where to look. |
| It never says more than the pages | Each sentence is a fixed template filled with facts. No guessing a route, a date, a diagnosis, a "no allergy", or a "normal". |
| Everything left out is counted or named | Held readings, removed entries, sensitive items, unread pages and missing documents appear in the last bullet as counts or names. Nothing disappears quietly. |

---

## 2. The pipeline

1. **Scanned file.** The hospital's paper file arrives as page images (2 to 300+ pages). The original pages are never changed. *Why:* the pages are the only source of truth; every later step can be checked against them.
2. **Extraction into facts.** The extraction service reads the pages into structured facts: diagnoses, allergies, medicines, procedures, labs, vitals, reports and notes. Each fact carries a **role** (what part it plays: final diagnosis, discharge medicine, presenting complaint), a **citation** (page and region), a **confidence**, and **flags** (suspected, partly readable, pages differ). It also groups facts into **encounters** and says how each began and ended. *Why:* the story needs to know what a fact is for, not just what it says.
3. **Review state.** A reviewer can verify a fact, edit it, remove it, or leave it held. This state lives beside the facts and never overwrites the reading. *Why:* the summary must follow human decisions immediately, and the original reading must stay available for audit.
4. **Eligibility filter.** A fact may speak only if it is shown to the doctor (not held unless verified, not removed) and not marked sensitive. Everything filtered out is counted for the last bullet. *Why:* one gate, applied once, before any sentence is built, so no later step can leak a held or removed fact.
5. **Encounter ordering and the index encounter.** Encounters are sorted oldest first. One is chosen as the **index encounter** and told in full; the others get one line each or are counted (section 6). *Why:* a story needs a centre. Without one, a long file becomes a list.
6. **Beats.** The index encounter is split into fixed beats in a fixed order (section 4). A beat with no facts is left out. *Why:* doctors learn where to look; the same order for every patient makes the summary scannable.
7. **Weight limits and budget.** Each beat has a limit on how many items it names; the rest are counted. The panel and the page have a length budget and a fixed drop order (section 7). *Why:* 100 pages must stay one screen, and trimming must never be a judgement call.
8. **Sentences from templates.** Each beat fills its template. Doubt words travel with the fact. Key words are marked. *Why:* templates cannot invent; they can only leave a slot empty.
9. **Self-check.** Before display, the output is checked: every sentence is cited or is an allowed absence or count; no held, removed or sensitive fact is cited; every number in the text exists in a cited fact; the allergy line appears exactly once; no route word appears when the route is unknown. Any failure stops the summary safely: a fixed message is shown, the record below is not affected, and an alert is raised (ladder level L6). *Why:* a last net for template bugs and bad data; a wrong summary is worse than none.
10. **Render.** The same bullets are shown in two places: the narrow Case File panel on the Rx pad and the wide Structured record tab. Key words are shown in darker ink at regular weight. Citations are `[n]` chips that open the page. *Why:* one builder, so the two places can never disagree.
11. **Audit entry.** Each generated summary is logged: file version, builder version, review state version, the level, the bullets, and the fact ids behind each. It is written before the summary is shown. *Why:* anyone must be able to answer "what did the doctor see, and why" later.

---

## 3. Inputs: the data contract

| Input | Exists in the draft today | Must be added |
|---|---|---|
| File facts | `source.totalPages`, `pagesUnread`, `documents`, `notFound` | A document kind on each document, so a loose lab report can be named as one |
| Encounter | `id`, `type` (IPD, OPD, ER, DAYCARE, TELE, OTHER), `department`, `startLabel`, `endLabel`, `sortKey` | ISO `startKey` and `endKey` (today the house date is made by rewriting a text label) |
| How it began | `entry`: emergency, referral, fromOpd, transfer, planned, direct, or null. `visitKind`: first, followUp, workup, or null | A citation and confidence for `entry` and `visitKind`, so the opening can be cited and can be held. `partOf` on a visit that belongs to an admission (work-up before, follow-up after) |
| How it ended | `outcome`: discharged, lama, transferred, died, or null | A citation for `outcome`. Outcomes for visits: sent home, admission advised, referred |
| Who | Nothing | `age` as written for each encounter, `sex` for the file. Never taken from clinical content |
| Fact | `id`, `domain`, `encounterId`, `role`, `title`, `detail`, `quals`, `cite`, `also`, `confidence`, `flags`, `hold`, `negative`, `sensitive` | ISO `dateKey` (today only a text `dateLabel`) |
| Short forms | `short` on alert notes | `short` on the presenting complaint and the follow-up note, so the sentence does not carry a whole paragraph or a long-form date |
| Labs | `value`, `unit`, `range`, `abnormal` (H or L as flagged by the source), `series` | Nothing required |
| Review | Status per fact: draft, verified, rejected; edits kept beside the reading | Who and when are stored today; a version number for the review state is needed for audit |

Roles in use: DX `final`, `working`, `secondary`, `chronic` · PROC `procedure`, `pastSurgery` · MED `discharge`, `prescribed`, `home`, `inHospital` · VIT `last`, `interim` · RPT `complaint`, `course`, `conditionAtDischarge`, `dischargeDate`, `followUp`, `investigation`, `alert`, `anaesthesia`, `hospitalMeds`, `detail`.

**Rule for the extraction service:** set `entry`, `visitKind` and `outcome` only when a page states them. Null is a valid, safe answer. The safety document asks for each of these as a finding with its own citation, confidence and flags, and uses slightly different value names; one list must be agreed (section 12).

---

## 4. The beats

Fixed order: **earlier lines → arrival → diagnosis → treatment → course → leaving → medicines → follow-up → background → gaps.** Marks like `**this**` are key words. `{slot}` is filled from a fact. `[ ... ]` is dropped when empty.

### 4.1 Arrival
- **Purpose:** how the patient came in, where, and with what.
- **Fed by:** the encounter's `type`, `entry` or `visitKind`, start date, department; the RPT `complaint` fact; age and sex.
- **Template:** `[{Who}, ]{opening from section 5}[ under {department}][ with {complaint}].` A stay with no complaint adds `The reason for admission is not recorded.`
- **Key words:** the complaint, when it has a short form.
- **Omitted:** never, for the index encounter.
- **Example:** Referred in and admitted on 26 Feb'26 under Digestive Surgery with **interrupted, frequent urination and constipation**. `[3] [2]`

### 4.2 Diagnosis
- **Purpose:** what it was.
- **Fed by:** DX facts of the encounter with role `final`, `working`, `secondary` (not `chronic`).
- **Template:** `Final diagnosis: {final}. Working diagnosis: {working}. Also {others}.` A visit says `Diagnosis:` instead of `Final diagnosis:`. Up to 3 names in each part.
- **Key words:** each diagnosis name. `(suspected)` sits inside the key words.
- **Omitted:** when the encounter has no shown diagnosis. If the file has no diagnosis reading at all, the last bullet says `No diagnosis is written in this file.` If one exists but is held or was removed, it is counted there instead.
- **Example:** Final diagnosis: **Soft-tissue tumour, intra-abdominal** (partly readable). Working diagnosis: **Lipoma or liposarcoma (suspected)**. `[2] [6]`

### 4.3 Treatment
- **Purpose:** what was done.
- **Fed by:** PROC facts with role `procedure`.
- **Template:** `{procedure}[, {procedure}] and {procedure}[ on {date}].` The date is said only when all share one.
- **Key words:** procedure names.
- **Omitted:** no procedure.
- **Example:** **Laparotomy with tumour excision** and **cystoscopy with right ureteric catheter insertion** on 27 Feb'26. `[2] [8]`

### 4.4 Course
- **Purpose:** how it went: the results that were out of range, and what was given.
- **Fed by:** LAB facts the source flagged high or low, with a unit; MED facts with role `inHospital`.
- **Template:** `Abnormal results: **{test}** [{earliest value} to ]{latest value} {unit} ({high or low})[, ...][ and {n} more]. Given in hospital: {medicine}, {medicine} and {medicine}[ and {n} more].`
- **Key words:** test names.
- **Omitted:** nothing flagged and nothing given.
- **Example:** Abnormal results: **Haemoglobin** 12.5 to 10.3 g/dL (low). Given in hospital: Hydrocortisone 100 mg IV. `[15] [10]`

### 4.5 Leaving
- **Purpose:** how the stay ended, and the last recorded state.
- **Fed by:** `outcome`, end date; RPT `dischargeDate` (for doubt on the date), RPT `conditionAtDischarge`; VIT `last`.
- **Template:** `{Discharged / Left against medical advice / Transferred out / Died in hospital}[ on {date}][ (pages differ)][: {condition as written}]. Last vitals: BP {v}, Pulse {v}, SpO2 {v}, Temp {v}.` An outcome word is printed only when the ending is stated. A stay with no ending recorded: `How this admission ended is not in this file.` After a transfer out: `What happened after the transfer is not in this file.` A visit shows only the last vitals.
- **Key words:** none for a routine discharge. `**Left against medical advice**`, `**Transferred out**` and `**Died in hospital**` are key words.
- **Omitted:** a visit with no vitals.
- **Example:** Discharged on 04 Mar'26 (pages differ): stable, conscious. Last vitals: BP 102/74, Pulse 72, SpO2 98%, Temp 36.6 C. `[2]`

### 4.6 Medicines
- **Purpose:** what the patient went home on.
- **Fed by:** MED facts with role `discharge` (stay) or `prescribed` (visit).
- **Template:** `**{n} medicines** on the {discharge list / prescription}: {name}, {name} and {name}[ and {n} more].` The count always names the list it counts.
- **Key words:** the count. Names are name and strength only, never the schedule.
- **Omitted:** no such medicines. Also after death, leaving against advice or transfer out.
- **Example:** **9 medicines** on the discharge list: Alganax 0.5 mg, Nexium 40 mg, Dexyclav 500 mg, Acetram, Cliad and 4 more. `[2]`

### 4.7 Follow-up
- **Purpose:** what was planned next. Worded without a clock, because the reader's date is unknown.
- **Fed by:** RPT `followUp`.
- **Template:** `Follow-up planned: {date in house style}[, {with whom, by role}][. {advice}].`
- **Key words:** the date.
- **Omitted:** no follow-up note; also after death, leaving against advice or transfer out. If a later visit in the file follows the stay, that visit's line comes here instead (section 6).
- **Example:** Follow-up planned: **11 Mar'26**, urologist and digestive surgeon. `[2]`

### 4.8 Background
- **Purpose:** what stays true beyond one visit. Built once for the whole file.
- **Fed by:** DX `chronic`, PROC `pastSurgery`, all ALG facts, MED `home` (count only), RPT `alert`.
- **Template:** `Known {condition}[, {condition}] and {condition}. Past {surgery}. {allergy line}. **{n} medicines** on the list taken before admission. Keep in mind: **{alert short form}**; **{alert short form}**.`
- **Allergy line, always present, exactly one form:**

| The file and the review say | The line |
|---|---|
| An allergy is stated | `Allergy: **{allergen}**[ ({reaction})]` |
| "No allergy" is stated | `**No known drug allergy**, stated on {n} pages` |
| Nothing is recorded | `Allergies: not recorded in this file` |
| A reading exists but is held | `Allergies: an unclear reading is held back` |
| The only reading was removed | `Allergies: entry removed in review` |
| The only entry is marked sensitive | `Allergies: an entry is marked sensitive and not shown here` |

- **Key words:** condition names, the allergen, the stated negative, alert short forms, the count.
- **Omitted:** never. The allergy line alone is enough to keep the bullet.
- **Example:** Known **rheumatoid arthritis** and **hypercoagulable state**. **No known drug allergy**, stated on 3 pages. `[2] [11]`

### 4.9 Gaps
- **Purpose:** what the reader will not find, so silence is never read as "nothing".
- **Fed by:** `notFound`, `pagesUnread`, and the counts from the eligibility filter.
- **Template:** `No diagnosis is written in this file. Not in this file: {item}, {item}[ and {n} more]. {n} pages could not be read. {n} unclear readings are held back until reviewed. {n} entries removed in review. {n} facts could not be tied to a visit; see Clinical data. {n} items in this file are marked sensitive and not shown here.` Each part appears only when it applies.
- **Key words:** none.
- **Omitted:** when every count is zero and nothing is missing. The sensitive count never names the kind of item.
- **Example:** Not in this file: histopathology report of the excised tumour, operative note and 4 more. 3 unclear readings are held back until reviewed.

### 4.10 Earlier lines
- **Purpose:** the rest of the file, briefly, before the index encounter.
- **Template, one line:** `{opening}: {diagnosis}; {procedure}[; {n} abnormal results].` With no diagnosis or procedure, the complaint; then report titles; then up to 2 abnormal results by name.
- **Template, counted:** `Also in this file: {2 OPD, 1 Emergency} from {date} to {date}.` One encounter: `on {date}`.
- **Example:** Pre-admission work-up in OPD on 25 Feb'26: Chest X-ray and ECG; 6 abnormal results. `[17] [16]`

---

## 5. How the patient came in

The opening is chosen from what the extraction service read. It is never worked out from the department name, the hour, or a nearby visit.

| Case | Data | Opening |
|---|---|---|
| OPD, first visit | OPD, `visitKind: first` | `First OPD visit on {date}` |
| OPD, follow-up | OPD, `followUp` | `Follow-up OPD visit on {date}` |
| OPD, work-up before admission | OPD, `workup` | `Pre-admission work-up in OPD on {date}` |
| OPD, kind not stated | OPD, null | `Seen in OPD on {date}` |
| Emergency, then admitted | IPD, `entry: emergency` | `Came to the emergency on {date} and was admitted` |
| Emergency, not admitted | ER | `Seen in the emergency on {date}` |
| Admitted from OPD | IPD, `fromOpd` | `Admitted from OPD on {date}` |
| Planned admission | IPD, `planned` | `Planned admission on {date}` |
| Direct admission | IPD, `direct` | `Admitted directly on {date}` |
| Referred in | IPD, `referral` | `Referred in and admitted on {date}` |
| Transferred in | IPD, `transfer` | `Transferred in from another hospital on {date}` |
| Day care | DAYCARE | `Day care admission on {date}` |
| Teleconsultation | TELE | `Teleconsultation on {date}` |
| Admission, route not stated | IPD, null | `Admitted on {date}` |
| A record that is not a visit, or a kind not known | OTHER | `Record dated {date}` |

- No date on the page: the `on {date}` part is left out. A date is never filled in.
- "First OPD visit" means the page says new case. The earliest visit in a file is not assumed to be the first ever.
- `Record dated` is for a record that is not a visit but still carries a story. When no visit or admission can be made out at all, the summary lists what the file holds instead (section 7.4, levels L2 and L3).

**Who.** Said once, in front of the opening of the index encounter, with the opening's first letter lowered: `Man aged 62 at the time, came to the emergency on ...`

| The file gives | Who |
|---|---|
| Age and sex | `Man aged 58 at the time` · `Woman aged 34 at the time` · under 18: `Boy aged 6 at the time` · under 1 year: `Girl aged 8 months at the time` |
| Age only | `Patient aged 58 at the time` |
| Sex only | `Female patient` · `Male patient` |
| Neither | Nothing. The sentence starts with the opening. |

Age is the age written for that encounter; it is never worked out from a birth date. "At the time" stops an old file's age being read as today's. Sex is never taken from a name, a diagnosis or a procedure.

---

## 6. File shapes

**Choosing the index encounter.** The newest dated encounter (tie: IPD before OPD, then lowest id), as in the safety document and the draft. Two refinements are specified and not built. First, a visit that extraction links to an admission with `partOf` belongs to that admission: it gets a line inside that story and cannot be the index. Second, proposed for the clinician to confirm: with no link, a visit that starts up to 30 days before an admission, or up to 90 days after it ends, is treated the same way. Without these, a suture-removal visit becomes the full story and the operation gets one line.

**Three levels of telling.** Full: all beats. One line: section 4.10. Counted: a number in the "Also in this file" line.

| File shape | Told in full | One line each | Only counted |
|---|---|---|---|
| Single IPD | The admission | Nothing | Nothing |
| IPD with pre-admission OPD | The admission | The OPD visit, before arrival | Nothing |
| Only one OPD | The visit. Leaving shows vitals only. | Nothing | Nothing |
| Multiple OPDs | The latest visit | The earliest visit in the file, and the 2 visits just before the latest. Each middle line says what is new at that visit (a new diagnosis, medicines first seen on that prescription). | Visits in between |
| Multiple IPDs | The latest admission | Up to 3 earlier admissions, newest kept | Older admissions |
| OPD + IPD + follow-up OPD | The admission, when the visits are attached to it. Its opening says `Admitted from OPD` when stated. | The OPD visit before; the follow-up visit after discharge, in place of "Follow-up planned" | Nothing |
| Emergency only | The emergency visit, with its outcome when stated | Nothing | Nothing |
| Mixed long history | The newest encounter that is not attached to an admission | Visits attached to it; then up to 3 earlier encounters, newest kept | Everything else, by kind, with the date range |
| Records only (a lab report, a prescription) | Nothing as a story. One cited line per kind of fact (ladder L2, L3). Today: `Record dated` lines. | Nothing | Nothing |
| Nothing readable | One fixed sentence (ladder L4, L5) | Nothing | Pages |

Rules that hold for every shape:
- Lines and beats run oldest to newest. Background and gaps are always the last two bullets.
- An encounter with no date is never the index and never "latest".
- Day care and teleconsultations are told like any other encounter of their kind: a day care stay has a leaving beat, a teleconsultation does not.
- An encounter of an unknown kind is shown as "Other" and still counted.

---

## 7. How much data: more, less, none

### 7.1 Weight limits

| Thing | What is told | Limit | The rest |
|---|---|---|---|
| Medicines to go home on | Name and strength | 5 named | Counted in the same sentence; the total leads |
| Medicines given in hospital | Name and strength | 5 named | `and {n} more` |
| Medicines at home before admission | Count only | 0 named | In the record below |
| Labs | Only results the source flagged, latest value, with the earliest value when it moved. A value with no unit is not quoted. | 3 named | `and {n} more` |
| Vitals | The last recorded set of the encounter | 4 values: BP, Pulse, SpO2, Temp | In the record below |
| Diagnoses | Final, working, others | 3 each | `and {n} more` |
| Chronic conditions | Name | 4 | `and {n} more` |
| Alerts | Short form | 3 | In the record below |
| Notes (complaint, condition, follow-up) | The short form; else the note as written, first two sentences | Whole sentences only | In the record below |
| Missing documents | Name | 2 | `and {n} more` |
| Earlier encounters | One line | 3 | Counted by kind |

Results that are in range are never mentioned and never called normal.

### 7.2 Length budget

| | Rx pad panel (226px) | Structured record tab |
|---|---|---|
| Bullets | 5 story bullets at most (safety rule H23), plus the gaps bullet, which is never dropped | One per beat, plus earlier lines. This needs H23 scoped to the panel (section 12). |
| Characters per bullet | 230 | 340 |
| Characters in total | 1,100 | 2,200 |
| How it gets there | Beats are merged: earlier · arrival + diagnosis · treatment + course · leaving + medicines + follow-up · background · gaps | No merging |
| Tighter limits | Medicines 3, labs 2, earlier lines 1, missing documents 1 | Section 7.1 |

### 7.3 Fixed drop order

When a bullet or the total is over budget, drop in this order and stop as soon as it fits:

1. Last vitals.
2. Medicines given in hospital.
3. "Also" diagnoses.
4. The count of medicines taken before admission.
5. Past surgery.
6. Department, and any complaint sentence after the first.
7. Named items beyond the first in a list. The count stays.
8. Advice after the follow-up date.

Never dropped: the opening, final and working diagnosis, an outcome other than a routine discharge, the allergy line, alerts, and the counts in the gaps bullet. If these alone exceed the budget, the budget gives way.

### 7.4 Degradation ladder (digest)

The summary shrinks in steps. It never fails and never pads. The exact triggers, every fallback sentence and the fixtures are in `CASE-FILE-SUMMARY-SAFETY-RULES.md`, which is the authority.

| Level | When | What the doctor reads | Builder level today |
|---|---|---|---|
| L0 Full story | The index encounter has all four core beats: how they came in, what was found, what was done, how it ended | Every beat that has facts | `full` |
| L1 Partial story | Two or three core beats | The beats that exist. Only the safety absences are spoken (allergy, diagnosis, how the admission ended). | `partial` |
| L2 Facts, no story | No encounter has two core beats; facts of two or more kinds | `This file holds 3 medicines and 13 lab results. No visit or admission could be made out, so they are listed without a story.` Then one cited line per kind. | `thin` |
| L3 One kind of record | Facts of one kind only | One sentence such as `This file holds lab reports only: ...` and at most one cited line | `thin` |
| L4 Read but withheld | Readings exist, none may be shown | `3 readings were found in this file but are too unclear to summarise. They are waiting for review.` or `Every reading from this file was removed in review.` | `withheld` |
| L5 Nothing clinical read | No facts | `No clinical facts were read from this file. 14 pages: 13 forms and charts, 1 not readable.` | `none` |
| L6 Safe stop | Bad input, a builder error, or a failed self-check | `The summary could not be built for this file. The record below is not affected.` An alert is raised. | none yet |

**The ten rules that matter most** (numbered as in the safety document, which lists all thirty):

1. **H1.** Every sentence carries a citation or is one of the fixed absence sentences.
2. **H2.** A negative ("no known drug allergy") is printed only when a page states it, with where it is stated. A blank never becomes "none".
3. **H5, H6.** Nothing is computed or inferred: no date, age, length of stay, converted unit or frequency, generic name.
4. **H7.** No clock. The same file, review state and versions give the same words on any day.
5. **H8.** Suspected stays attached to its diagnosis everywhere, after verification too.
6. **H10, H11.** A value in conflict shows only the side extraction marked primary, with `(pages differ)`. An allergy, a death, leaving against advice or a keep-in-mind medicine prints its value only when read with high confidence or verified.
7. **H13.** A lab value is printed only with its unit, and high or low only where the source flags it. Nothing is called normal.
8. **H14, H17.** A held, removed or sensitive fact adds no words, no numbers and no citation to any story sentence.
9. **H21, H22.** A count names the list it counts, and every shortened list says how many more.
10. **H26, H27.** "Discharged" and the discharge list appear only when the ending is stated; death, leaving against advice and transfer suppress them and the follow-up. A summary card is always shown.

---

## 8. Wording

| Topic | Rule |
|---|---|
| Voice | Third person, as one doctor briefs another. No "he", "she" or "they". |
| Tense | Past for events (`was admitted`). Present for facts about the file (`is not recorded in this file`). |
| Sentences | Short. One idea each. Digits for every number. |
| Vocabulary | OPD, IPD, emergency, admitted, discharged, medicines, follow-up. British spelling. Brand names, units and frequencies as written. |
| Dates | House style: `04 Mar'26`. Month only: `Mar'26`. No date on the page: none is written. No relative time ("last year", "recently"). |
| Key words | Marked with `**`. Shown in darker ink at regular weight, not bold. Only names, counts and key dates; never a whole sentence. Headings may be semibold. |
| Capitals | A name keeps its capital after a colon. Inside a sentence it takes a lower-case first letter unless it is an acronym. Medicine and test names keep their case. |
| Counts | A count names its list: `9 medicines on the discharge list`. Never "went home on 9 medicines". |
| Follow-up | `Follow-up planned: ...`. Never "is due" or "was due". |
| Absence | Fixed sentences only. They say "in this file", or "in the pages that were read" when some pages could not be read. |

**Doubt travels with the fact.**

| Kind | Flag | Wording | Emphasis | After verification |
|---|---|---|---|---|
| About the page | suspected | `**Lipoma or liposarcoma (suspected)**` | Inside the key words | Stays |
| About the page | partly readable | `**Name** (partly readable)` | Name is a key word | Stays |
| About the page | can be read two ways | `**Name** (can be read two ways)` | Name is a key word | Stays |
| About the reading | low confidence | `Name (hard to read)` | Never | Clears; the name becomes a key word |
| About the reading | pages disagree | `Name (pages differ)` | Never | Clears; the name becomes a key word |

**Never says**
- A diagnosis, route, date, dose or laterality the page does not give.
- "No allergy" from a blank, or "normal" for any result.
- Better, worse, stable, well controlled, uneventful, significant, unless it is the page's own word in a quoted note.
- Due to, because of, should, needs, consider, urgent.
- A patient, relative or staff name, or any record number. Clinicians appear by role.
- A medicine schedule, a converted unit, a generic for a brand.
- Anything about a held, removed or sensitive item beyond its count.
- Numbered lists, em dashes, ellipses.

---

## 9. Review and regeneration

The summary is rebuilt from scratch every time the review state changes. It is never patched.

| The reviewer does | What changes in the summary |
|---|---|
| Verifies a clear fact | Nothing in the words. |
| Verifies a fact with a reading doubt | `(hard to read)` or `(pages differ)` goes; the name becomes a key word. The words around it do not change. |
| Verifies a fact with a page doubt | Nothing. `(suspected)`, `(partly readable)` and `(can be read two ways)` stay. |
| Verifies a held fact | The fact enters its beat. The held count drops by one. |
| Corrects a fact | The corrected value is used and treated as verified. `(partly readable)` and `(can be read two ways)` clear; `(suspected)` stays. The reading is kept for audit. |
| Removes a fact | Its words, numbers and citation go. Every count that included it drops by exactly one. The removed count in the last bullet rises by one. |
| Removes the only allergy reading | The allergy line becomes `Allergies: entry removed in review`. |
| Removes or holds everything | The summary falls to level L4. Levels move back up the same way when a fact is released or restored. |

**What must stay stable**
- The order of beats, the templates, and the order inside a list (role, then date, then id; never confidence or review status).
- Every sentence built from facts the reviewer did not touch. One change must not reshuffle the rest.
- Citation numbers. `[2]` is the same document before and after review.
- The index encounter, unless the change removes its last fact.
- The result for the same inputs: no clock, no random choice, no model.
- The reader's view: a change made by someone else is announced (`Summary updated after review.`), not swapped in silently.

Rebuild triggers, versioning and the audit record are specified in `CASE-FILE-SUMMARY-SAFETY-RULES.md`, section 4.

---

## 10. Worked examples

Page form (Structured record tab), as specified in this document. `[n]` are document numbers. Clinical content in (b) to (h) is invented and neutral.

### (a) The sample file: one admission with a pre-admission OPD visit

- Pre-admission work-up in OPD on 25 Feb'26: Chest X-ray and ECG; 6 abnormal results. [17][16]
- Referred in and admitted on 26 Feb'26 under Digestive Surgery with **interrupted, frequent urination and constipation**. MRI showed a lump pressing on the urinary tract. [3][2]
- Final diagnosis: **Soft-tissue tumour, intra-abdominal** (partly readable). Working diagnosis: **Lipoma or liposarcoma (suspected)**. Also **hypoalbuminaemia**. [2][6]
- **Laparotomy with tumour excision** and **cystoscopy with right ureteric catheter insertion** on 27 Feb'26. [2][8]
- Abnormal results: **Haemoglobin** 12.5 to 10.3 g/dL (low), **Haematocrit** 39 to 33 % (low), **Cortisol, morning serum** < 0.6 ug/dL (low). Given in hospital: Hydrocortisone 100 mg IV, Cefazolin 2 g (pages differ) and Ketorolac 60 mg IV. [15][16][10][7]
- Discharged on 04 Mar'26 (pages differ): stable, conscious. Sent home for outpatient follow-up. Last vitals: BP 102/74, Pulse 72, SpO2 98%, Temp 36.6 C. [2]
- **9 medicines** on the discharge list: Alganax 0.5 mg, Nexium 40 mg, Dexyclav 500 mg, Acetram, Cliad and 4 more. [2]
- Follow-up planned: **11 Mar'26**, urologist and digestive surgeon. Keep the dressing clean and dry. [2]
- Known **rheumatoid arthritis** and **hypercoagulable state**. Past **hysterectomy**. **No known drug allergy**, stated on 3 pages. **5 medicines** on the list taken before admission. Keep in mind: **1 red-cell unit cross-matched, no transfusion recorded**; **long-term steroid use (triamcinolone)**. [2][11][12][14][5]
- Not in this file: histopathology report of the excised tumour, operative note and 4 more. 1 page could not be read. 3 unclear readings are held back until reviewed.

The same file in the Rx pad panel (merged, tighter limits):

- Pre-admission work-up in OPD on 25 Feb'26: Chest X-ray and ECG; 6 abnormal results. [17][16]
- Referred in and admitted on 26 Feb'26 with **interrupted, frequent urination and constipation**. Final diagnosis: **Soft-tissue tumour, intra-abdominal** (partly readable). Working diagnosis: **Lipoma or liposarcoma (suspected)**. [3][2][6]
- **Laparotomy with tumour excision** and **cystoscopy with right ureteric catheter insertion** on 27 Feb'26. Abnormal results: **Haemoglobin** 12.5 to 10.3 g/dL (low), **Haematocrit** 39 to 33 % (low) and 1 more. [2][8][15]
- Discharged on 04 Mar'26 (pages differ): stable, conscious. **9 medicines** on the discharge list: Alganax 0.5 mg, Nexium 40 mg, Dexyclav 500 mg and 6 more. Follow-up planned: **11 Mar'26**, urologist and digestive surgeon. [2]
- Known **rheumatoid arthritis** and **hypercoagulable state**. **No known drug allergy**, stated on 3 pages. Keep in mind: **1 red-cell unit cross-matched, no transfusion recorded**; **long-term steroid use (triamcinolone)**. [2][11][14][5]
- Not in this file: histopathology report of the excised tumour and 5 more. 1 page could not be read. 3 unclear readings are held back until reviewed.

### (b) Emergency admission

- Man aged 62 at the time, came to the emergency on 14 Jul'25 and was admitted under Cardiology with **chest pain for 2 hours and sweating**. [1][2]
- Final diagnosis: **Acute inferior wall myocardial infarction**. [2]
- **Coronary angiography** and **angioplasty with stent to right coronary artery** on 14 Jul'25. [3]
- Abnormal results: **Troponin I** 4.8 ng/mL (high). Given in hospital: Aspirin 300 mg, Clopidogrel 300 mg and Heparin 5000 IU. [4][6]
- Discharged on 18 Jul'25: stable. Last vitals: BP 118/74, Pulse 68, SpO2 98%, Temp 98.2 F. [2]
- **7 medicines** on the discharge list: Aspirin 75 mg, Clopidogrel 75 mg, Atorvastatin 80 mg, Metoprolol 25 mg, Ramipril 2.5 mg and 2 more. [2]
- Follow-up planned: **01 Aug'25**, cardiology OPD. [2]
- Known **type 2 diabetes mellitus** and **hypertension**. Allergy: **sulfonamides** (rash). **3 medicines** on the list taken before admission. [2][6]

### (c) One first OPD visit

- Woman aged 34 at the time, first OPD visit on 09 Jan'26 under General Medicine with **burning urination for 3 days and fever for 1 day**. [1]
- Diagnosis: **Urinary tract infection (suspected)**. [1]
- Abnormal results: **Urine pus cells** 25-30 /hpf (high). [2]
- Last vitals: BP 110/70, Pulse 96, Temp 100.4 F. [1]
- **2 medicines** on the prescription: Nitrofurantoin 100 mg and Paracetamol 650 mg. [3]
- Follow-up planned: review after 5 days with the urine culture report. [1]
- Allergies: not recorded in this file.

### (d) Five OPD visits over two years

- First OPD visit on 12 Mar'24: **Type 2 diabetes mellitus**; 2 abnormal results. [1][2]
- Also in this file: 1 OPD on 20 Sep'24.
- Follow-up OPD visit on 14 Mar'25: new **hypertension**; Telmisartan 40 mg first on this prescription. [4]
- Follow-up OPD visit on 22 Aug'25: Atorvastatin 10 mg first on this prescription. [5]
- Man aged 58 at the time, follow-up OPD visit on 10 Feb'26 under General Medicine with **tingling in both feet for 1 month**. [6]
- Diagnosis: **Diabetic peripheral neuropathy (suspected)**. [6]
- Abnormal results: **HbA1c** 9.4 to 7.1 % (high). [7][2]
- Last vitals: BP 138/86, Pulse 78. [6]
- **5 medicines** on the prescription: Metformin 1 g, Glimepiride 1 mg, Telmisartan 40 mg, Atorvastatin 10 mg and Pregabalin 75 mg. [6]
- Follow-up planned: **12 May'26**, with the urine microalbumin report. [6]
- Known **type 2 diabetes mellitus** and **hypertension**. **No known drug allergy**, stated on 1 page. [1][4]

### (e) Two admissions a year apart

- Planned admission on 05 Nov'24: **Osteoarthritis of right knee**; **right total knee replacement**. [1][2]
- Woman aged 68 at the time, came to the emergency on 18 Nov'25 and was admitted under General Medicine with **fever for 3 days and breathlessness**. [3][4]
- Final diagnosis: **Community-acquired pneumonia, right lower lobe**. Also **hyponatraemia**. [4]
- Abnormal results: **Sodium** 126 to 134 mEq/L (low). Given in hospital: Ceftriaxone 1 g IV and Azithromycin 500 mg. [5][7]
- Discharged on 24 Nov'25: stable. Last vitals: BP 126/78, Pulse 84, SpO2 96%, Temp 98.4 F. [4]
- **4 medicines** on the discharge list: Co-amoxiclav 625 mg, Azithromycin 500 mg, Paracetamol 650 mg and Telmisartan 40 mg. [4]
- Follow-up planned: **01 Dec'25**, medicine OPD with a repeat chest X-ray. [4]
- Known **hypertension** and **hypothyroidism**. **No known drug allergy**, stated on 2 pages. [4]

### (f) OPD, then admission, then follow-up OPD

Both visits are attached to the admission (`partOf`), so the admission is the index. The follow-up visit takes the place of "Follow-up planned".

- First OPD visit on 03 Feb'26: right lower abdominal pain for 2 days and vomiting. [1]
- Man aged 45 at the time, admitted from OPD on 03 Feb'26 under General Surgery with **right lower abdominal pain for 2 days and vomiting**. [2]
- Final diagnosis: **Acute appendicitis**. [3]
- **Laparoscopic appendicectomy** on 03 Feb'26. [4]
- Abnormal results: **Leukocytes** 14.8 10^3/uL (high). [5]
- Discharged on 06 Feb'26: stable. Last vitals: BP 116/72, Pulse 80, SpO2 99%, Temp 98.6 F. [3]
- **3 medicines** on the discharge list: Cefixime 200 mg, Pantoprazole 40 mg and Paracetamol 650 mg. [3]
- After discharge, follow-up OPD visit on 13 Feb'26: wound healthy, sutures removed. [7]
- Allergies: an unclear reading is held back.
- 1 unclear reading is held back until reviewed.

### (g) Thin file: a lab report and a prescription (ladder L2)

- This file holds 3 medicines and 13 lab results. No visit or admission could be made out, so they are listed without a story.
- **3 medicines** on the prescription of 16 Aug'25: Metformin 500 mg, Glimepiride 1 mg and Atorvastatin 10 mg. [2]
- Abnormal results on 14 Aug'25: **HbA1c** 8.2 % (high) and **Fasting glucose** 168 mg/dL (high). [1]
- Allergies: not recorded in this file. No diagnosis is written in this file.

### (h) Near-empty file: forms only (ladder L5)

- No clinical facts were read from this file. 14 pages: 13 forms and charts, 1 not readable.

---

## 10a. What every summary covers (decided 16 Nov 2026)

The same pointers are written for every patient, in the same order, so a doctor always knows where to look. A pointer is left out only when the file has nothing for it. Where this section differs from an earlier limit in this document, this section wins.

| Pointer | IPD | OPD | IPD with OPD | Rule |
|---|---|---|---|---|
| How they came in, with the visit or admission number | Yes | Yes | Both, oldest first | The number is in brackets and opens the page it was read from: `on 26 Feb'26 (IP-2602-0147)` |
| Diagnosis | Final, working, others | Diagnosis | Per encounter | Certainty kept |
| Procedures | Yes | If any | Per encounter | With date |
| Abnormal results | Out of range now, with the first value when it moved | Same | Per encounter | Three named, the rest counted; a value is quoted only with its unit |
| Report findings | Imaging, ECG and similar, first sentence each | Same | Per encounter | `Reports: Chest X-ray: normal heart size; ECG: sinus rhythm, rate 80.` |
| Medicines given in hospital | Five named, rest counted | Not applicable | From the admission | |
| How they left and last vitals | Outcome, condition, last set of vitals | Last vitals if recorded | From the admission | "Discharged" only when the file says so |
| Medicines the patient left with | **Every medicine on the discharge list, named** | **Every medicine on the prescription, named** | From the latest encounter | Never cut to "and N more": this is the list a doctor most often needs whole |
| Follow-up | Yes | Yes | From the latest encounter | "Follow-up planned", no clock |
| Background | Chronic conditions, past surgery, allergy line, medicines before admission, keep in mind | Same | Once, for the file | The allergy line is always present |
| Not in this file | Missing documents, unreadable pages, held, removed and sensitive items | Same | Once | Counts and names |

An earlier encounter that is told in one line (for example a pre-admission work-up) carries the same things in short: its number, its report findings and its abnormal results by name.

Below the summary, the Details repeat every fact in full under fixed headings (Diagnosis, Allergies, Procedures, Med (Rx), Lab Results, Vitals, Reports and Notes). The summary is the story; the details are the record. Both are drawn by the same code on the Rx pad panel, on the patient page and in the review drawer.

---

## 11. Built today vs specified

"Built" means `caseFileStory.js` in the UI draft, running on sample data. The production generator is not started.

| Capability | State today | Note |
|---|---|---|
| One builder for panel and page | Built | Both places print the same bullets. No panel merging or budget yet. |
| Sentences from templates, no model | Built | |
| Eligibility filter (held, removed, sensitive) | Built | Sensitive is read from a field the sample does not use yet. |
| Oldest-first order | Built | An undated encounter is never the latest. |
| Index encounter | Partly | Newest encounter with facts. No `partOf` link and no attach windows, so a follow-up visit after an admission is told in full and the admission gets one line. |
| Outcome said only when stated | Not built | "Discharged" is printed whenever an end date exists. Death, leaving against advice and transfer do not suppress medicines and follow-up. |
| Entry-route openings | Built | Six routes, three visit kinds, emergency, day care, teleconsult, unknown. |
| Wording of two openings | Built | `planned` prints "Planned admission on ..."; an unknown kind prints "Record dated ...". |
| Citation for route and outcome | Not built | Arrival cites only the complaint. Needs the contract addition. |
| Who (age and sex) | Not built | Needs the contract addition. |
| Beats: arrival to gaps | Built | |
| Absence sentences | Built | "Reason for admission is not recorded", "How this admission ended is not in this file", and "No diagnosis is written in this file" (in the last bullet). |
| Doubt wording | Built | Diagnoses, procedures, background, allergies and medicine names all carry their doubt. Medicine names are never emphasised. |
| Allergy line, five forms | Built | A stated allergy prints as "Allergy: name (reaction)". An allergy marked sensitive prints "an entry is marked sensitive and not shown here", never "not recorded". |
| Counted in the last bullet | Built | Held, removed, sensitive, unread pages, and facts that could not be tied to a visit. |
| Weight limits | Built | As constants (`STORY_LIMITS`). Items are taken in record order; no ranking. An abnormal result with no unit is not quoted but is counted in "and N more". |
| Earlier encounters: one line, then counted | Built | Three lines, the rest counted by kind with their date span (one date when there is only one). |
| First visit kept, "what is new" lines, after-discharge line | Not built | |
| Files with no story (ladder L2, L3) | Partly | Loose facts are counted in the last bullet. The inventory sentences are not built; such a file is told through `Record dated` lines. |
| Empty states (ladder L4, L5) | Built | The L5 sentence differs from the safety document's wording. |
| Levels | Built | `full` = L0, `partial` = L1, `thin` = L2 and L3, `withheld` = L4, `none` = L5. |
| House dates | Partly | Made by rewriting text labels. A date inside a note prints as written (`Wed 11 Mar 2026`). |
| Key words by colour | Built | Darker ink at medium weight in summaries (regular weight in rows), in both the panel and the page. Arrival has no key words yet. |
| Lower case inside a sentence | Partly | The step runs after the key-word marks are added, so it has no effect on marked names. |
| Budget, panel merging, drop order | Not built | The panel shows up to ten bullets today. |
| Self-check and safe stop (L6) | Not built | A malformed fact would throw into the panel. |
| Regeneration on every review change | Built | Stability tests are not written. |
| Audit entry | Not built | |
| Real extraction feed | Not built | Roles, entry and outcome are hand-set in the sample. |

---

## 12. Open questions

**For the clinician**
1. Index encounter: should a visit near an admission be folded into it when extraction gives no link? Are 30 days before and 90 days after the right windows?
2. Day care: for a file of many sessions (dialysis, chemotherapy), tell the latest session in full, or the series as a whole?
3. Abnormal results: is record order acceptable, or should results far outside the range come first? Should each value carry its date?
4. Medicines: this document names up to five. The safety document names only keep-in-mind medicines (anticoagulants, insulin, steroids, opioids) and counts the rest. Which is safer to read? Should a medicine that was stopped or put on hold get its own sentence?
5. Background: should the allergy line come first? Is "Known" the right word for a condition taken from past history?

**For the CTO**
1. Can the extraction service supply entry, visit kind, outcome, age and sex as findings, each with a citation and a confidence? Which value names are final: this draft's or the safety document's?
2. Will loose documents (a lab report with no visit) arrive as an `OTHER` encounter, or as facts with no encounter?
3. Where does the builder run in production: in the browser as today, or on the server so the audit entry is written before display?
4. Who owns the thresholds (hold, hard to read, sensitive), and are they per field?

**For the designer and the owners of the two documents**
1. Line budget: the safety document says five lines everywhere (H23). This document keeps five for the panel and one bullet per beat on the page. Agree one.
2. Fixed wording: the builder prints `The reason for admission is not recorded.`, a `Not in this file:` list, a removed count and `Record dated`. The safety document's closed list has none of these (it does not count removed entries, and says `Seen on` for an unknown kind). Agree one list.
3. Is 1,100 characters acceptable for the 226px panel, or should the panel show fewer beats with a link to the page?
