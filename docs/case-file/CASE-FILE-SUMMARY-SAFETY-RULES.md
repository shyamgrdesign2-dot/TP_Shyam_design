# Case File Summary: edge cases, degradation and safety rules

16 Nov 2026 · Companion to CASE-FILE-SUMMARY-ARCHITECTURE.md (beat order and sentence templates) · Read with `docs/case-file/CASE-FILE-FORMATTING-GUIDE.md`

This document says what the summary generator does when the data is unusual, missing, excessive, contradictory or unsafe. The generator is code: selection, ordering and sentence templates over extracted facts. Nothing here needs a model at render time.

**The promise in one line:** a summary card is always rendered, it never says more than the readable pages say, and anything left out is counted or named.

---

## 0. Terms and constants used below

| Term | Meaning |
|---|---|
| Eligible fact | `isShownToDoctor(finding, review)` is true (not removed; not held unless verified) AND the fact is not sensitivity-masked for this viewer. Only eligible facts may put words or numbers into a story sentence. |
| Core beats | Entry (how they came in), Found (diagnosis or key finding), Done (procedure or treatment), Left (how it ended). Plus two file-level lines: Keep in mind, Background. Map these to the architecture doc's names. |
| Index encounter | The encounter the story is told about: newest dated encounter; tie-break IPD before OPD, then lowest id. An undated encounter is index only when no dated one exists. |
| Source-certainty words | `suspected`, `as written`, `partly readable`, `can be read two ways`, `undated`. They describe the page. They survive verification. |
| Reading marks | `hard to read` (confidence below 0.70 or `lowConfidence`), `pages differ` (`conflict`, `conflictingValue`). They describe the reader. They clear on verify or correct. |
| Critical statement | Allergy (positive or negative), death, leaving against advice, a named keep-in-mind medicine. Needs confidence 0.85 or above with no reading mark, or a verified status, before its value is printed. |
| Absence sentence | One of the closed list in 0.1. The only sentences allowed without a citation. |
| Withheld line | One line under the story, outside the five-line budget: held count and sensitive count. |
| Card footer | Encounters found, then the fact count: `Built from 14 facts, 7 verified.` |
| Emphasised | Darker ink, not heavier weight. In the examples below, `**double stars**` mark the emphasised words. |

Summary dates follow the house style `04 Mar'26`. Four-digit years appear only in the span line `File covers 2004 to 2006.`

### 0.1 Closed list of absence sentences

Use "in this file" when `source.pagesUnread` is 0. Use "in the pages that were read" when it is above 0. No other negative wording exists in the generator.

| Id | Copy | Fires when |
|---|---|---|
| A1 | `Allergies: not recorded in this file.` | No ALG finding exists at all (eligible, held or removed) |
| A2 | `No diagnosis is written in this file.` | No DX finding exists at all |
| A3 | `How this admission ended is not in this file.` | IPD encounter with no discharge condition, date or disposition fact |
| A4 | `Dates are not written in this file.` | No encounter and no fact has a date |
| A5 | `What happened after the transfer is not in this file.` | Disposition is transfer out |
| A6 | `No {document} in the file.` (e.g. `No histology in the file.`) | A `notFound` entry tagged by extraction as summary-worthy for the index encounter |
| A7 | `{Domain}: an unclear reading is held back.` | The domain's only findings are held. Replaces A1, A2 or A3 for that domain |
| A8 | `{Domain}: entry removed in review.` | The domain's only findings were removed by a reviewer. Replaces A1, A2 or A3 |
| A9 | `{n} pages could not be read.` | `pagesUnread` above 0 at levels L2 and lower |

### 0.2 What the generator needs from extraction (each as a finding with its own citation, confidence and flags, never as a bare attribute)

| Need | Shape | If missing |
|---|---|---|
| Encounter type | `IPD`, `OPD`, `ER`, `DAYCARE`, `UNKNOWN` | Treated as `UNKNOWN` (row M5) |
| Entry route | `opd`, `emergency`, `direct`, `referral`, `transferIn` | No route words (row M6) |
| Disposition | `home`, `lama`, `transferred`, `referred`, `absconded`, `died` | A3 |
| Date precision | `day`, `month`, `year`, `none`; `sortKey` null when none | Rows M3, M4 |
| Encounter link | `partOf: "E1"` on a work-up visit | Encounters stay separate (row D3) |
| Stated negative | `negative: true` | No negative is ever written |
| Conflict primary | The finding that carries `conflictWith` is the primary side; an exception with no `findingId` has no primary | No value printed (row U3) |
| Sensitivity | `sensitive: ["hiv", "mentalHealth", "substance", "reproductive", "sexualHealth", "abuse", "mlc"]` | Generator's own closed code and term list applies; fail closed (section 1.8) |
| Age at encounter, sex | Findings with citation | Omitted (row M9) |
| Number format | Normalised value plus `ambiguous` when a separator could be thousands or decimal | Value kept out of the summary (row L4) |

---

## 1. Variability matrix

### 1.1 Volume

| # | Situation | What the generator does | Exact fallback wording | Why |
|---|---|---|---|---|
| V1 | No clinical facts at all (`findings` is empty) | Level L5. Coverage line only. No beats, no Background line, no A1. | `No clinical facts were read from this file. {total} pages: {forms} forms and charts, {unread} not readable.` | The card must exist. "Nothing was read" is a fact about the file; "no medical history" would be a claim about the patient. |
| V2 | Only labs | Level L3. One descriptor line, then up to 2 source-flagged results. No encounter verbs, no diagnosis. Flag clause dropped when zero (never "all normal"). | `This file holds lab reports only: {n} results from {d} dates ({first} to {last}); {k} flagged high or low by the lab.` | A story cannot be built from results. A list of labs must not imply why they were done. |
| V3 | Only a prescription | Level L3. Count and date. Names only for keep-in-mind classes tagged by extraction. No "is taking". | `This file holds one prescription ({date}) with {n} medicines.` then A2 if it applies | A prescription shows what was written, not what was taken or why. |
| V4 | Only vitals | Level L3. Count and date span. No values in the summary line. | `This file holds vitals only: {n} sets, {first} to {last}.` | Isolated vitals carry no story and invite over-reading. |
| V5 | Very large file (40 medicines, 120 labs, 15 encounters, 12 diagnoses) | Five-line budget holds. Caps: diagnoses 3 named (final, working, then secondary in page order); procedures 2; medicines counted per list, only keep-in-mind names (max 3); labs max 2 trends, source-flagged only; story for index encounter, one clause each for the next 2. Every overflow is counted and clickable. | `+9 more diagnoses` · `40 medicines on the discharge list` · `+31 more flagged results` · `+12 earlier encounters (Mar'11 to Aug'24)` | Long summaries get skimmed and trusted anyway (automation bias). A count that opens the exact rows keeps omission visible. |
| V6 | Single-page file | Same rules. Notice reads `1-page file`. Lines with nothing to say are dropped; no padding to five lines. | none | Shape must not depend on size. One real line beats five thin ones. |

### 1.2 Missing pieces

| # | Situation | What the generator does | Exact fallback wording | Why |
|---|---|---|---|---|
| M1 | No diagnosis | Lead with complaint or procedure. Never derive a diagnosis from medicines, labs or a procedure name. | A2, or A7 `Diagnosis: an unclear reading is held back.` | Inferring a diagnosis is a commission error; saying nothing hides a gap the doctor should know. |
| M2 | No presenting complaint | Drop the clause. Sentence starts at the next slot. | none | Not safety relevant; absence wording here is noise. |
| M3 | No dates on anything | Story without date tokens. No sequence words (then, later, after). No trends. Order by page. Footer: `IPD (undated)`. | A4 | A date is never inferred (guide rule 4). Sequence words would invent an order. |
| M4 | One undated encounter among dated ones | Listed last in the footer. Never the index encounter. No before or after claims about it. | `OPD visit (undated)` | Sorting it by page position would silently date it. |
| M5 | Unknown encounter type | Neutral noun and verb. IPD-only beats (discharge, hospital medicines) appear only if those facts exist. | `Visit on {date}` · `Seen on {date} with {complaint}.` | "Admitted" or "OPD" would be a guess. |
| M6 | Unknown entry route | No route word. Sentence starts at the first known slot. Never defaults to OPD. | `Admitted on {date} with {complaint}.` | Emergency versus planned changes how the reader weighs the story. |
| M7 | Admission with no discharge information | No "discharged", no length of stay, no "went home on". Adds `Discharge summary` to Not found. | A3 | An unstated ending is the most dangerous silent gap (death, LAMA, transfer). |
| M8 | No allergy statement | Background line always carries allergy status, in exactly one form: stated allergy, stated negative, A1, A7 or A8. | A1. Never `no allergies`, `NKDA`, `nil`, `none`. | Guide rule 2. A blank read as "none" is the classic transcription harm. |
| M9 | Missing age or sex | Omit. Templates use no pronouns. Sex never inferred from name, procedure or obstetric data. Age never computed from a birth date against today. | `aged {n} at the time` only when written | A wrong demographic at the top discredits everything below; old files make "age" ambiguous. |
| M10 | No follow-up | Drop the clause. | none. Never `no follow-up advised`. | Absence of a follow-up line is not an instruction. |

### 1.3 Uncertainty

| # | Situation | What the generator does | Exact fallback wording | Why |
|---|---|---|---|---|
| U1 | Suspected diagnosis | Qualifier sits inside the emphasised (darker ink) anchor and never wraps away from the name. Stays after verification. Never moved to Background as a standing condition. | `**lipoma or liposarcoma (suspected)**` | Guide rule 1. Verification confirms the reading, not the diagnosis. |
| U2 | Partly readable line | Readable part only, with the qualifier. Nothing completed. | `(partly readable)` | The unread half may negate the read half (site, laterality, "ruled out"). |
| U3 | Two conflicting values (dates, drug names, doses) | Show the side extraction marked primary, not emphasised, with the mark, citing every side. Generator never picks a side. No primary marked: no value. Nothing is derived from a conflicted value (no length of stay). Allergy versus "none": the allergy shows, the negative never does. | `Discharged stable on 04 Mar'26 (pages differ)` · no primary: `The file gives two discharge dates.` · `pre-operative antibiotic Cefazolin (pages differ)` | Guide 10.4. Printing both invites the reader to choose by eye; printing one silently hides the dispute. |
| U4 | Ambiguous dose | Medicine title as extracted, with none of its dose or frequency qualifiers. Qualifier note only when the medicine is a keep-in-mind item. | `Fartison 20 mg (dose can be read two ways)` | A dose in a summary gets copied. Doses live in Data with their mark. |
| U5 | Low-confidence handwriting, not held, other evidence exists | Value shown, not emphasised, with the mark. Counted like any shown row. | `(hard to read)` | Matches the Data lens so counts agree. |
| U6 | Held-back facts | No words, no numbers, no citations from them anywhere in the story or its counts. Withheld line states the count. An absence sentence for that domain is replaced by A7. | `3 unclear readings are held back.` (link: Review) | Guide 10.2: counted, never silently dropped. Saying "not recorded" while an allergy is held would be false reassurance. |
| U7 | The only evidence for a key beat is low confidence (below 0.70, unverified), or a critical statement is below 0.85 | Value not printed. The sentence says the item exists and where. Level may drop (section 2). | `A diagnosis is written but was hard to read.` · `An allergy entry is written but was hard to read.` · `How this admission ended was hard to read.` | The summary is the most trusted surface. One shaky reading must not become the headline; pointing at the page avoids both commission and omission. |

### 1.4 Review states

| # | Situation | What the generator does | Exact fallback wording | Why |
|---|---|---|---|---|
| R1 | Fact verified | Words and order unchanged. Reading marks clear; source-certainty words stay. Footer count goes up. | Footer: `Built from 14 facts, 8 verified.` | Verifying must not make text jump. |
| R2 | Fact corrected by a reviewer | Corrected value shows, treated as verified. The original reading never appears in a sentence. Citation hover carries the note. `partly readable` and `can be read two ways` clear; `suspected` stays. Lab arrows follow the edited `abnormal` field, never recomputed. | Hover: `Corrected in review. Page reads: "{verbatim}"` · Footer: `1 corrected` | The reviewer has read the page. Both values must stay retrievable (store keeps `original`). |
| R3 | Fact removed | Zero contribution. Same template re-forms with one slot fewer. Every count drops by exactly one. Its citation disappears if no other fact in that sentence shares it. Not counted in the withheld line. If the beat empties, it drops, or A8 replaces an absence sentence that would now be false. | `Allergies: entry removed in review.` | A removed fact that still colours a sentence or a count is a ghost. "Not recorded" would misstate the file. |
| R4 | Everything verified | Same text as the draft minus reading marks. Notice turns green. Withheld line gone once no held item is pending. | Footer: `All 14 facts used here are verified.` | "Verified" is said once, not per sentence. |
| R5 | Half verified | No per-sentence badges. A sentence may get a tick only when every fact feeding it is verified. | Footer: `Built from 14 facts, 7 verified.` | A tick on a sentence with one unverified slot overstates. |

### 1.5 Time

| # | Situation | What the generator does | Exact fallback wording | Why |
|---|---|---|---|---|
| T1 | Encounters out of order in the file | Sort by date key; page order is only a tie-break. Citation numbers stay document numbers. | none | Paper files are filed newest on top or at random. |
| T2 | Overlapping dates | OPD inside an admission's dates: both listed, no sequence words. Two overlapping admissions: both kept, an exception is raised, no "readmitted", no length of stay. | Exception: `Two admissions have overlapping dates.` | Overlap usually means a misread date or a duplicate; the summary must not narrate around it. |
| T3 | Very old records (20 years) | House-style dates as everywhere else; the first line carries the span with four-digit years, so the era is never in doubt. No present tense for medicines or status (never `is on`, `current`, `now`). Medicine counts are tied to a dated list. No relative ages ("20 years ago"). | `File covers 2004 to 2006.` · `9 medicines on the discharge list of 12 Mar'06.` | A stale medicine list read as current is the main risk of an old file. Relative ages go stale. |
| T4 | Follow-up date that has now passed | Tense-free wording. Never says whether it happened. No clock in the generator. | `Follow-up planned for 11 Mar'26.` Never `due`, `overdue`, `missed`. | Same facts must give the same text on any day (section 4). |
| T5 | Patient died during admission | Outcome is stated plainly, first in the Left beat, as a critical statement. No follow-up, discharge-medicine or "went home" clause. Cause only if written. If a later-dated encounter exists, or the upstream identity check finds the file attached to a patient with a live appointment, the outcome fact is held and an identity exception is raised. | `Died in hospital on {date}.` · cause: `Cause as written: {text}.` · Exception: `Recorded outcome conflicts with later records. Check that this file belongs to this patient.` | The gravest fact must not be softened or buried, and must not rest on one unclear reading. A death in a living patient's file usually means a misfiled record. |
| T6 | Left against medical advice | Stated as written with the plain form first. No condition or judgement words unless written. | `Left against medical advice on {date}.` | Changes how the last plan is read. |
| T7 | Transferred out | Destination named only if written. | `Transferred to {facility as written} on {date}.` or `Transferred to another hospital on {date}.` then A5 | The story has no ending in this file and must say so. |

### 1.6 Language and units

| # | Situation | What the generator does | Exact fallback wording | Why |
|---|---|---|---|---|
| L1 | Non-English source text | Uses only extraction's English fields. Generator never translates. A term extraction could not render stays as written, in quotes, not emphasised. ⓘ names the source languages. | ⓘ: `Source language: Indonesian and English.` | Translation is a reading step with its own confidence; it belongs upstream where it is scored. |
| L2 | Units missing | Value not printed in the summary. Exempt closed list: INR, pH, ratios, blood group, GCS, scores. Data shows it as printed. | none | A number without a unit in a summary gets a unit supplied by the reader. |
| L3 | Local brand name, no strength | Name as written, no strength, no generic, no drug-class claim unless extraction tagged the class with a citation. Counted normally. | none. Never `strength not written` in the summary. | Guide rules 3 and 4. A wrong generic is worse than a brand the doctor can look up. |
| L4 | Comma decimals and separators | Print extraction's normalised value when unambiguous (`36,8` shown as `36.8`). When a separator could be thousands or decimal (`400.000`, `1,005`, `1,50,000`), the fact carries `ambiguous` and its number stays out of the summary. Trends need the same unit at every point. `<` and `>` kept. | none | A thousand-fold error from a misread separator is a known transcription harm. |

### 1.7 Duplicates

| # | Situation | What the generator does | Exact fallback wording | Why |
|---|---|---|---|---|
| D1 | Same medicine or diagnosis on several pages | One fact, all citations, counted once. Guard key: domain + normalised name + strength + role + encounter. Different strength or different list (home versus discharge) is not a duplicate. A different spelling is a conflict (U3), not a duplicate. | none | Double counting inflates the medicine count; over-merging hides a dose change. |
| D2 | Same lab repeated | Same test, date and value on two pages: one reading, two citations. Different dates: a trend, first and latest only in the summary, each with its date. Same date, different values: `conflictingValue`. | `Hb 12.5 (25 Feb'26) to 10.3 (03 Mar'26)` | No "fell" or "improved": direction words are interpretation. |
| D3 | OPD work-up that belongs to the admission | Folded into the admission's Entry beat only when extraction sets `partOf`, as its own dated clause. Footer still lists both. Never linked by date proximity. | `Work-up as an outpatient on 25 Feb'26.` | Keeps the story whole without merging two encounters' facts. |

### 1.8 Sensitive content (the panel sits where anyone at the desk may glance)

Default posture: **mask in the summary, count honestly, one-click reveal for clinical roles, log the reveal.** The placeholder never names the category.

| # | Situation | What the generator does | Exact fallback wording | Why |
|---|---|---|---|---|
| S1 | Any fact tagged sensitive (by extraction, or by the generator's own closed list of codes and terms; either tag is enough) | Fact contributes no words to a story sentence until revealed. Withheld line counts it. Reveal is per user, per session, re-masks when the panel closes, and is written to the access log. Roles without clinical rights get no reveal control. Missing tags on an older bundle: the closed list alone decides; when unsure, mask. | `1 item in this file is marked sensitive.` (control: `Show`) | The treating doctor must be able to reach it in one click; a bystander must not learn even the category. |
| S2 | HIV status, ART medicines | Masked. If prescribing-relevant, the placeholder sits in the Keep in mind line. | `Keep in mind: 1 item marked sensitive.` | HIV and AIDS Act 2017 s.8 bars disclosure without consent, with a carve-out for providers involved in care. |
| S3 | Psychiatric diagnoses, self-harm | Masked. Code never generates intent or manner words; only extraction's as-written title, after reveal. | same as S1 | Mental Healthcare Act 2017 s.23. |
| S4 | Substance use | Masked. Never summarised as a trait; only as written. | same as S1 | Stigma, and often third-party hearsay in old notes. |
| S5 | Pregnancy termination, reproductive history | Masked. Never in Background as "past surgery" without the mask. | same as S1 | MTP Act s.5A protects the woman's particulars. |
| S6 | Sexual history, STI | Masked. | same as S1 | Same reasoning; rarely needed at a glance. |
| S7 | Minors (under 18 at the encounter, or age unknown in a paediatric department) | All of S2 to S6 plus abuse-related items masked. No statement or advice about reporting duties. Never included in anything a guardian-facing surface shows without review. | same as S1 | DPDP Act s.9 treats children's data as higher duty; POCSO s.19 reporting is a clinical and legal decision, not a summary's. |
| S8 | Medico-legal case | A neutral marker for clinical roles; narrative, alleged history, police or MLC numbers and names never enter the summary. `alleged` and `history of` are kept exactly as written after reveal. | `Marked medico-legal on the file.` | The doctor needs the flag; the detail is evidence, and code must not characterise cause. |
| S9 | Identifiers | Never in summary text: name, MRN, ABHA, phone, address, relatives, staff names. | none | Data minimisation; the summary does not need them. |
| S10 | Leak paths | Masking also applies to the collapsed encounter gist, card footer, tooltips, tab title, notifications, print, copy and the Ask row. A department name on the closed list (psychiatry, de-addiction, ART centre) is replaced by the encounter type alone. | Footer: `OPD 12 Mar'19` | A masked sentence with `Psychiatry OPD` in the footer is not masked. |

---

## 2. Degradation ladder

Evaluate top to bottom on the eligible set. Take the first level whose trigger holds. The level is recorded in the audit entry. The withheld line and footer render at every level where they have something to count.

| Level | Name | Trigger | Summary shown |
|---|---|---|---|
| L0 | Full story | Index encounter has all four core beats from eligible facts | Up to five lines in the architecture doc's order. Example line: `**Laparotomy with tumour excision** on 27 Feb'26, GA with epidural. Discharged stable on 04 Mar'26 (pages differ). [2] [1] [10]` |
| L1 | Partial story | Index encounter has two or three core beats | Present beats in fixed order; absent beats dropped. Only the safety absences are spoken: A1, A2, A3, A5, A7, A8. Example: `Admitted on 26 Feb'26 with interrupted urination. [2]` then `How this admission ended is not in this file.` |
| L2 | Facts, no story | No encounter has two core beats, and eligible facts span two or more domains | `This file holds {2 diagnoses, 6 medicines and 14 lab results}. No visit or admission could be made out, so they are listed without a story.` then one line per domain in the Data order, capped as in V5, each cited. A4 and A9 when they apply. |
| L3 | One kind of record | Eligible facts sit in one domain | The V2, V3 or V4 sentence, then at most one cited line. |
| L4 | Read but withheld | Findings exist, eligible set is empty | Held pending: `{n} readings were found in this file but are too unclear to summarise. They are waiting for review.` (button: Review). All removed: `Every reading from this file was removed in review.` No clinical word appears. |
| L5 | Nothing clinical read | `findings` is empty | V1 sentence. Button: Files. |
| L6 | Safe stop | Bundle fails schema check, generator throws, a hard rule in section 3 fails its self-check, or an identity exception is open | `The summary could not be built for this file. The record below is not affected.` Identity case: `The summary is not shown until someone checks that this file belongs to this patient.` |

Dropping rules:

1. **L0 to L1:** a core beat loses its last eligible fact (removed, held, masked, or caught by U7).
2. **L1 to L2:** fewer than two core beats remain on every encounter. An encounter with type and date but no clinical beat does not count as a story.
3. **L2 to L3:** eligible facts collapse to one domain.
4. **Any level to L4:** eligible set becomes empty while findings exist.
5. **Any level to L6:** self-check failure. L6 is the only level that may hide facts that exist; it must raise an operational alert, never fail silently.
6. Levels move up by the same triggers in reverse when a reviewer releases a held fact or restores a removed one. No level is sticky.

---

## 3. Hard safety rules (testable assertions)

**Truth and negatives**

- **H1.** Every sentence either carries at least one citation or is byte-identical to an absence sentence from 0.1.
- **H2.** A negative clinical statement (no allergy, no transfusion, no devices) is printed only from a finding with `negative: true`. Its wording includes where it is stated: `No known drug allergy, stated on 3 pages.`
- **H3.** The strings `no allergies`, `NKDA`, `nil`, `none known`, `normal`, `unremarkable` never appear unless they are inside an extraction field of a cited finding.
- **H4.** No sentence contains interpretation, recommendation or urgency words. Closed deny list includes: `well controlled`, `worsening`, `improved`, `fell`, `rose`, `should`, `advise`, `urgent`, `critical`, `likely`, `probably`, `current`, `currently`, `is on`.
- **H5.** No value is computed that the file does not state: no length of stay, age, BMI, dose total, day count, unit conversion, frequency conversion or generic name.
- **H6.** No date is inferred. An undated fact renders `(undated)`; an undated encounter is never sorted between dated ones.
- **H7.** The generator reads no clock. The same bundle, review state and versions produce the same bytes on any day.

**Uncertainty**

- **H8.** `suspected` stays attached to its diagnosis in every rendering and after verification. A suspected diagnosis never appears in the Background line.
- **H9.** A fact with a reading mark is never emphasised (darker ink).
- **H10.** A value under `conflict` or `conflictingValue` is shown only if extraction marked it primary, always with `(pages differ)`, always citing every side. With no primary, no value is printed.
- **H11.** A critical statement prints its value only at confidence 0.85 or above with no reading mark, or when verified. Otherwise the U7 wording is used.
- **H12.** For a medicine flagged `ambiguous`, no dose or frequency qualifier is printed in the summary; only its title as extracted.
- **H13.** A lab value is printed only with its unit (or from the unitless closed list), and a high or low mark only where the source flags it.

**Held, removed, masked**

- **H14.** A held or removed fact contributes no words, no numbers, no emphasised (darker ink) anchor, no citation and no count to any story sentence.
- **H15.** The withheld count equals the number of findings with `hold` true and status `draft`. Removed findings are never in it.
- **H16.** No absence sentence A1, A2 or A3 is shown for a domain that has a held or removed finding; A7 or A8 is shown instead.
- **H17.** A masked sensitive fact contributes no words outside the generic placeholder, on every surface in S10. The placeholder never names a category.
- **H18.** No identifier listed in S9 appears in any summary string.

**Structure and counts**

- **H19.** A sentence about an encounter uses facts of that encounter only. Two explicit exceptions: the file-level Background and Keep in mind lines, and a single-test trend where every value carries its own date.
- **H20.** Every count shown equals the number of rows its click reveals for that viewer, at that moment. Masked items are counted separately (`2 diagnoses and 1 item marked sensitive`).
- **H21.** Every count noun names the list it counts (`9 medicines on the discharge list`), never a patient state (`on 9 medicines`).
- **H22.** Every overflow is counted (`+N more`); nothing is dropped by a cap without a count.
- **H23.** The story is five lines or fewer. The withheld line and footer are outside that budget and are never dropped to make room.
- **H24.** Sequence words (`then`, `later`, `after`, `before`, `readmitted`) are used only between events whose dates strictly order them.
- **H25.** Each citation in a sentence resolves to a document that contains at least one fact feeding that sentence; no citation survives the removal of its last fact.

**Outcome**

- **H26.** `Discharged`, `went home` and discharge-medicine counts appear only when a disposition or discharge fact exists for that encounter. Death, leaving against advice and transfer each suppress follow-up and "went home" clauses.
- **H27.** A card is always rendered. L6 is reached by an explicit path, with an alert, and never by an uncaught error.

**Generation**

- **H28.** Summary text is produced only by templates over extraction fields. No free text is concatenated from `verbatim`, and no model is called at render time.
- **H29.** Every rendered summary has an audit entry (section 4.3) written before it is shown.
- **H30.** A self-check runs H1, H14, H15, H17, H20 and H25 on every generation; any failure yields L6.

---

## 4. Regeneration rules

### 4.1 When the summary is rebuilt

| Trigger | Rebuild | Note |
|---|---|---|
| Verify (single or bulk) | Yes | Usually only marks and the footer change |
| Correct (edit) or revert edit | Yes | Affected sentences only |
| Remove, or restore a removed fact | Yes | Counts, citations, possibly level |
| Verify a held fact (release) | Yes | Fact enters; withheld count drops by one |
| New extraction version of the same file | Yes, as a new summary lineage | Old versions stay retrievable |
| Change to thresholds, caps, deny list, template set or sensitive list | Yes, for every open file | Recorded as a config-triggered rebuild |
| Sensitive reveal or re-mask | No rebuild | View state only; logged in the access log |
| Date rollover, panel reopen, different viewer with the same rights | No | H7 |

### 4.2 What must stay stable

1. **Pure function.** `summary = f(bundle version, review state, edits, generator version, template version, config version, viewer role)`. No clock, no randomness, no network.
2. **Fixed beat order.** A beat never moves because its facts were verified, corrected or re-scored.
3. **Stable order inside a beat.** Sort key is role rank, then date, then finding id. Never confidence, never review status. Verifying a fact does not reorder a list.
4. **Template choice depends only on which slots are filled**, not on confidence or status. Removing a fact selects the same template family with one slot fewer.
5. **Locality.** A review action on one fact may change only: the sentences that fact fed, counts that included it, the withheld line, the footer, the level. A snapshot diff outside those is a bug.
6. **Stable sentence ids** (`beat + encounterId`), so the UI can keep scroll position and mark a changed sentence for a few seconds instead of redrawing the card.
7. **Caps refill by rank.** When a named item is removed, the next by rank is named and `+N more` drops by one. Nothing else shifts.
8. **Citation numbers are document numbers** and never renumber on review.
9. **Marks change, words do not.** Verification removes reading marks only; it never rewrites the clause around them.
10. **No swap under the reader's eyes.** The actor's own action updates their card at once. A change made by someone else (MRD review while the doctor reads) shows `Summary updated after review.` with the changed sentence marked, applied on the next interaction.

### 4.3 What the audit trail records

One append-only entry per generation. Earlier entries are never overwritten, so "what did the doctor see at 10:05" is answerable.

| Field | Content |
|---|---|
| Identity | summary id, file id, patient reference, lineage (previous summary id) |
| Versions | extraction engine and version, generator version, template set version, config version (thresholds, caps, deny list, sensitive list) |
| Trigger | event type (verify, correct, remove, restore, release, re-extraction, config), actor id and role, ISO 8601 timestamp with zone (not the locale string the draft store uses today) |
| Input fingerprint | hash of bundle plus review state plus edits |
| Level | L0 to L6, and the trigger that selected it |
| Per sentence | sentence id, template id, each slot mapped to finding ids, rendered value per slot (after edits), marks applied, citations (document, page, region) |
| Per count | the number shown and the list of finding ids behind it |
| Exclusions | every finding not used, with one reason: held, removed, sensitive-masked, sole-evidence (U7), critical-statement threshold (H11), unit missing, ambiguous number, cap overflow, no English field |
| Self-check | result of H30 |
| Output | full rendered text and its hash |

Kept alongside, per fact (already in guide section 11): who verified, corrected or removed, when, original reading, corrected value. Kept in a separate access log: who opened the summary, who revealed a sensitive item, when, from which surface.

Shown to the user in the ⓘ, in plain language (the pattern HTI-1 calls source attributes): which reader and version, when processed, source languages, `Built by fixed rules from the facts below. Not written by an AI model.`, how many facts fed it and how many are verified, what it is not for (`Not a discharge summary and not a medico-legal document.`).

---

## 5. Test checklist (fixtures)

Base fixture is the sample bundle (`archivedRecordsMock.js`). Each scenario is a small change to it or a minimal new bundle. All fixtures stay de-identified.

| # | Name | Setup | Expected observable outcome |
|---|---|---|---|
| 1 | `no-facts` | `findings: []`, 12 pages, 1 unread | L5. Exact V1 sentence with 12, 11, 1. No Background line, no A1. Card renders. |
| 2 | `labs-only` | 14 LAB findings on 2 dates, 3 flagged | L3. V2 sentence with 14, 2, 3. No encounter verb, no A2. |
| 3 | `labs-only-none-flagged` | As 2 with no `abnormal` | Flag clause absent. The word `normal` appears nowhere. |
| 4 | `rx-only` | One OPD document, 4 MED, no DX | L3. V3 sentence, then A2. No `is taking`. |
| 5 | `vitals-only` | 3 VIT findings | L3. V4 sentence, no values printed. |
| 6 | `huge-file` | 40 MED, 120 LAB, 15 encounters, 12 DX | Five lines or fewer. 3 diagnoses named, `+9 more diagnoses`. Each `+N` click reveals exactly N rows. |
| 7 | `single-page` | 1 page, 1 DX, 2 MED | Notice says `1-page file`. One or two lines, no padding. |
| 8 | `no-diagnosis` | Remove all DX from the base | Lead is complaint or procedure. A2 present. No diagnosis word derived from procedure names. |
| 9 | `no-dates` | Strip every date and `sortKey` | A4 present. No sequence words, no trend, footer `IPD (undated)`. |
| 10 | `undated-encounter` | Add E2 with `sortKey: null` | E2 last in footer as `(undated)`. Index encounter unchanged. Order is stable across 50 runs. |
| 11 | `unknown-type-and-route` | E1 `type: "UNKNOWN"`, no route finding | `Seen on` or `Visit on`. Words `admitted`, `OPD`, `emergency` absent. |
| 12 | `admission-no-discharge` | Remove rpt2, rpt3, vit1, discharge meds | A3 present. `discharged` and `went home` absent. Not found gains `Discharge summary`. |
| 13 | `no-allergy-finding` | Remove alg1 from the bundle | A1 exactly. H3 deny list passes. |
| 14 | `allergy-held` | alg1 `hold: true`, unverified | `Allergies: an unclear reading is held back.` A1 absent. Withheld count is 4. |
| 15 | `allergy-removed` | Reject alg1 | `Allergies: entry removed in review.` A1 absent. Withheld count unchanged at 3. |
| 16 | `allergy-conflict` | Add an ALG finding (penicillin) flagged `conflict` against alg1 | Allergy shown with `(pages differ)`, not emphasised. The negative is not printed. |
| 17 | `suspected-verified` | Verify dx2 | `(suspected)` still attached. Footer verified count up by 1. No other byte changes. |
| 18 | `conflict-date-primary` | Base (rpt2 `conflictingValue`) | `04 Mar'26 (pages differ)`, not emphasised, cites both documents. No length of stay anywhere. |
| 19 | `conflict-no-primary` | Discharge-date exception with no `findingId` | `The file gives two discharge dates.` No date printed for discharge. |
| 20 | `sole-evidence-low` | Only DX is dx1 at confidence 0.55, unverified | `A diagnosis is written but was hard to read. [2]` Diagnosis text not printed. After verify, the text appears. |
| 21 | `ambiguous-dose` | Base (med8) promoted to keep-in-mind | `Fartison 20 mg (dose can be read two ways)`. `1 x 2 tab` absent from the summary. |
| 22 | `held-release` | Verify dx6 | dx6 text enters the diagnosis line. Withheld count 3 to 2. No other sentence changes. |
| 23 | `corrected-value` | Edit lab1 value to 10.9 | Trend ends at 10.9. Hover shows the page reading 10.3. Footer `1 corrected`. Audit holds both values. |
| 24 | `remove-one-med` | Reject med4 | `8 medicines on the discharge list`. Click reveals 8 rows. Only that sentence and the footer change (snapshot diff). |
| 25 | `remove-last-of-beat` | Reject proc1 and proc2 | Done beat gone, level L0 to L1. No citation remains in any sentence that those two facts alone fed. |
| 26 | `all-verified` and `half-verified` | Verify all; verify 7 of 14 used | `All {n} facts used here are verified.` versus `Built from 14 facts, 7 verified.` Story text identical apart from reading marks. |
| 27 | `out-of-order-and-overlap` | Shuffle documents; add an OPD visit dated inside E1 | Story order by date. Both encounters in footer. No `then` or `later` between them. Citation numbers unchanged. |
| 28 | `old-file` | Shift all dates to 2006 | Span line `File covers 2006.` with a four-digit year; every other date in house style (`12 Mar'06`). No `current`, `is on`, `ago`. Output identical when run with a mocked system date in 2031. |
| 29 | `followup-passed` | Base, system date before and after 11 Mar'26 | `Follow-up planned for 11 Mar'26.` in both runs; `due`, `overdue`, `missed` absent. |
| 30 | `died`, `lama`, `transfer` | Disposition finding set to each, confidence 0.9 | Exact T5, T6, T7 sentences. No follow-up or discharge-medicine clause. Transfer adds A5. With confidence 0.6: `How this admission ended was hard to read.` |
| 31 | `death-with-later-visit` | `died` plus a later-dated encounter | Outcome not printed. Identity exception raised. Card shows the L6 identity message. |
| 32 | `units-and-separators` | Lab with empty unit; lab value `400.000`; vitals `36,8` | Unit-less value absent from summary. `400.000` absent. `36.8` allowed. |
| 33 | `duplicate-med` | Same medicine on 3 pages; same name with a second strength | First counted once with 3 citations. Second strength is a separate row; count is 2. |
| 34 | `workup-link` | E0 with and without `partOf: "E1"` | With: one dated work-up clause in the admission's Entry beat. Without: no shared sentence. |
| 35 | `sensitive-mask` | Tag one DX `hiv`, one RPT `mentalHealth`; department `Psychiatry` | Neither text appears in summary, gist, footer or tooltip. `2 items in this file are marked sensitive.` Reveal by a clinical role shows them and writes an access log row. Front-desk role has no `Show`. |
| 36 | `minor-and-mlc` | Age 16 finding; `mlc` tag; RPT tagged `reproductive` | Reproductive item masked. `Marked medico-legal on the file.` for clinical roles. No reporting advice. No police or MLC number. |
| 37 | `all-held` | Every finding `hold: true` | L4 held sentence with the count. No clinical word on the card. |
| 38 | `determinism-and-audit` | Run the base twice, then verify one fact | Runs 1 and 2 byte-identical with equal hashes. Third run writes a new audit entry linking to the previous one, listing slot-to-finding maps and exclusions with reasons. |
| 39 | `generator-fault` | Corrupt one finding (no `cite`) | L6 general message. Alert raised. Data lens still renders. |

---

## 6. Status in the draft

Read from `caseFileStory.js` (`buildStory`) and `caseFileSummary.js` (`buildStructuredRecord`) on 16 Nov 2026. The fixtures in section 5 have not been run against this code; this is a reading of the source.

### 6.1 Done

| Rule | What the draft does |
|---|---|
| H14, H28 | The summary is built by `buildStory` on every review change, from facts that are shown to the doctor and carry no `sensitive` tag. Removing a fact removes its words, its count and its citation. No model, no free text from `verbatim`. |
| H15 | The held count is `hold` and status `draft` in both files. A held reading that a reviewer removed is no longer counted. |
| H16, M8 | Allergy wording follows A1, A7 and A8 in the story and in the structured record: "not recorded" is never shown while an allergy reading is held or was removed. |
| H2 | A stated negative allergy is quoted together with where it is stated. |
| H6 | Encounters sort consistently when a date is missing: first in the story (so never told as the latest), last in the structured record. |
| H19 | Timeline events attach to an encounter by `encounterId` only. |
| H21 | `N medicines on the discharge list` or `on the prescription`; `N medicines on the list taken before admission`. |
| H7, T4 | `Follow-up planned`. The generator reads no clock. |
| H8, H9, R1 | Doubt about the page (suspected, partly readable, can be read two ways) stays for good; doubt about the reading (hard to read, pages differ) clears on verify and keeps the words unemphasised until then. `(suspected)` sits inside the anchor. |
| H10 (part) | A disputed discharge date carries `(pages differ)` until verified. |
| H13 | A lab number is quoted only with its unit. |
| L4, L5 | Empty-set cards: no facts read, readings held, everything removed. |
| S1 (part) | Sensitive-tagged facts are left out of the story and counted with a placeholder that does not name the kind. |
| Dates | House style `04 Mar'26` through `shortDate`. |

Level names in code map to the ladder as: `full` = L0, `partial` = L1, `thin` = L2 and L3 together, `withheld` = L4, `none` = L5. L6 has no counterpart yet.

### 6.2 Still open

1. **Sensitive masking outside the story text (S10, H17).** The collapsed gist (`dx[0].title · procedures[0].title`) and the subtitle that joins it with the department are unmasked. The arrival beat prints `under {department}`. `buildStructuredRecord` does not filter sensitive facts. There is no reveal control, role check, access log or generator-side closed list.
2. **Audit entry (H29, section 4.3).** `buildStory` returns beats and fact ids only. No template ids, exclusions with reasons, versions, input hash or stored output.
3. **ISO timestamps.** Review stamps still store `by: "You"` and a locale time string with no year or zone.
4. **Self-check and safe stop (H27, H30, L6).** No validation or guarded path around `buildStory`; a malformed finding would throw into the panel.
5. **L2 and L3 inventory levels (V2 to V4).** A labs-only or prescription-only file is told through encounter beats (`Seen in OPD on ...`) at level `thin`. The descriptor sentences are not implemented, and `thin` does not separate "several domains, no story" from "one domain".
6. **Critical statements and sole evidence (H11, U7).** A low-confidence value is printed with `(hard to read)` even when it is the only evidence for a beat or is an allergy.
7. **One flag per fact.** `named()` reads `flags[0]` only. A fact that is both suspected and in conflict shows one qualifier.
8. **Outcome (H26, T5 to T7, H1).** `Discharged` is the default whenever an end date exists and `outcome` is absent. `died`, `lama` and `transferred` do not suppress the medicines and follow-up beats, and A5 is not written. `entry`, `outcome` and `visitKind` are bare encounter attributes with no citation or confidence, so an arrival beat with no complaint renders with no citation.
9. **An absence sentence outside the closed list.** `The reason for admission is not recorded.` Either add it to 0.1 or drop it; it also fires when a complaint reading is only held or removed.
10. **Trends and dropped labs (D2, H22).** A trend prints as `12.8 to 10.6 g/dL (low)` with no dates on the values. An abnormal lab with no unit is left out of the story without being counted.
11. **Undated encounters in the earlier lines (M4).** Sorting first makes an undated encounter read as the earliest, and when it is the oldest counted one the "Earlier in this file" line prints an empty start date.
12. **Conflicts (H10).** Only the primary side is cited, and only the discharge date is handled; the date itself comes from the encounter label, not from the disputed finding.
13. **Counts without rows (H20).** `normalCount` adds `labsNotShown.count`, which no finding backs.
14. **To align with CASE-FILE-SUMMARY-ARCHITECTURE.md.** Line budget (the draft tells up to seven beats for the latest encounter plus background and gaps; H23 says five), medicine names in the summary (the draft names up to five; V5 names only keep-in-mind medicines), and the index-encounter tie-break.

---

## 7. Sources and how far to rely on them

- **Automation bias, omission and commission errors.** Goddard, Roudsari and Wyatt, JAMIA (systematic review): users miss what automation does not flag, and act on what it gets wrong. Basis for U7, H9 to H11, V5 and the counted overflow. https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751
- **Error rates in machine-written clinical summaries.** Asgari et al., npj Digital Medicine 2025: about 1.5% hallucination and 3.5% omission across roughly 13,000 clinician-annotated sentences. Omission is the commoner failure, which is why every exclusion here is counted or named, and why the text is built by templates. https://pmc.ncbi.nlm.nih.gov/articles/PMC12075489/
- **Provenance shown to the user.** ONC HTI-1 decision support criterion, 45 CFR 170.315(b)(11): plain-language source attributes available to the user. Used here as a design benchmark for the ⓘ and the audit entry, not as an obligation in India. One search result suggested a later US rule may withdraw parts of it from December 2026; not confirmed. https://www.healthit.gov/sites/default/files/page/2023-12/HTI-1_DSI_fact%20sheet_508.pdf
- **India, data protection.** DPDP Act 2023 and Rules 2025: purpose limitation, safeguards, higher duty for children's data with a health-purpose carve-out for clinical establishments (Fourth Schedule). ABDM Health Data Management Policy: consent-based exchange. Secondary commentary only was read, and no hospital-specific audit-trail clause in the ABDM policy was confirmed: https://www.mondaq.com/india/healthcare/1722484/health-data-the-dpdp-actnavigating-indias-healthcare-privacy-frontier and https://www.storyboard18.com/digital/dpdp-rules-carve-out-key-exemptions-for-healthcare-providers-schools-and-childcare-services-processing-childrens-data-84208.htm
- **India, condition-specific confidentiality.** HIV and AIDS (Prevention and Control) Act 2017 s.8; Mental Healthcare Act 2017 s.23; MTP Act s.5A; POCSO Act s.19. Section numbers checked against secondary sources only (https://nyaaya.org/?p=5177, https://ijme.in/articles/navigating-the-conundrum-of-mandatory-reporting-under-the-pocso-act-implications-for-medical-professionals/?galley=html).

**Needs a decision before build:** (a) legal review of section 1.8 against the primary statute texts and MAHE's own policy; (b) who may reveal sensitive items, by role; (c) the 0.70 and 0.85 thresholds, which follow the guide's pilot bands and are MAHE's to set; (d) whether the withheld line may name the domain of a held reading (A7 does, for allergies, diagnosis and outcome only); (e) the index-encounter rule, to be aligned with CASE-FILE-SUMMARY-ARCHITECTURE.md.
