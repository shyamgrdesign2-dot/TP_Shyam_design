# Dr. Copilot V1 — prompting the model for readable Markdown

For the first launch, **the Markdown is the interface.**

V2 renders answers as the product's own UI cards: tables with citation tags,
an evidence drawer, a prescription sheet with the cited phrase highlighted.
That is `answer-markdown-contract.md`, and it depends on a renderer we
control.

V1 ships before that renderer. The model's Markdown is shown close to as-is,
so every bit of structure a doctor gets — what to read first, what is a value,
what is a caveat — has to come from the Markdown itself. This document is how
to prompt for that.

---

## 1. Standard Markdown only

V1 has no custom renderer, so anything non-standard shows up as literal
punctuation in front of a clinician.

**Use:**

| | For |
|---|---|
| `**bold**` | the values that answer the question |
| `- item` | lists of findings |
| `1. item` | steps or ordered history |
| `\| table \|` | three or more rows sharing the same columns |
| `> quote` | the one-line summary at the top |
| `### Heading` | sections, only when there is more than one |

**Never send:** `==highlight==`, `::: facts`, `!> caveat`, `[^1]` footnotes,
HTML tags, emoji, or code fences around prose. Those are V2 syntax or noise;
in V1 they print as characters.

---

## 2. The shape of every answer

Three parts, in this order. A doctor reading only the first line should have
the answer.

```markdown
> One sentence that answers the question outright.

- **The value** with the detail that qualifies it, and the date.
- **The next value**, same shape.

*What this answer does not cover.*
```

1. **Lead** (`>`), one sentence, always. Not "Here is what I found" — the
   actual finding. If the answer is a number, the number goes here.
2. **Body**, bullets or a table. One fact per line.
3. **Limit** (italic), one sentence, only when something real is missing.

Under 150 words. A doctor is reading this between patients.

---

## 3. What gets bold

Bold is for **the thing that answers the question**, and nothing else. It is a
pointer, not decoration; three bolds in a sentence point at nothing.

**Bold:** drug names, measured values with units, dates that matter to the
answer, a status that changed.

**Do not bold:** section labels, "Note", "Important", whole sentences, the
patient's name, words that are merely medical.

```markdown
Good:  - **Metformin 500 mg**, twice daily, started 12 May 2026
Bad:   - **Metformin 500 mg**, **twice daily**, **started 12 May 2026**
Bad:   - **Medication:** Metformin 500 mg
```

The second is unreadable; the third bolds the label instead of the fact.

---

## 4. Bullets, tables, or prose

| Shape | Use |
|---|---|
| **Prose** | One fact. A single reading, a single condition. Do not bullet one item. |
| **Bullets** | Two to five facts that do not share columns. |
| **Table** | Three or more rows that *do* share columns — drugs with doses and dates, readings with values and dates. |
| **Numbered** | Only when order carries meaning: a sequence of visits, a course of treatment. |

A bullet list where every line reads `Name: value, date` is a table that has
not been written as one.

---

## 5. Writing the values

- **Units always.** `106/77 mmHg`, not `106/77`.
- **Pairs stay together.** A blood pressure is `106/77 mmHg` on one line, never
  systolic and diastolic on two.
- **Dates as `12 May 2026`.** Not `2026-05-12`, not `12/05/26`.
- **The record's words, not a paraphrase.** If the note says "Continue ongoing
  medications", write that. A summary of advice is a different instruction
  from the advice.
- **No invented ranges.** Never call a value high, low, or normal unless a
  reference range came back with it. Say the number.
- **No em dashes** (house rule). Use a comma, a colon, or a full stop.
- **A doctor's vocabulary.** "Consultation note", not `Composition`.
  "Prescription", not `MedicationRequest`. Never surface a resource kind, a
  table name, or an internal id.

---

## 6. When there is nothing to say

Do not pad, and do not apologise into a card.

```markdown
> No record in this chart answers that.

*This chart holds 2 consultations between 24 Apr 2026 and 12 May 2026. Try
naming a drug, a test, or a date range.*
```

Naming what the chart *does* hold turns a dead end into a next step. "I could
not find that" on its own ends the conversation.

---

## 7. The prompt

Paste into the system prompt, after the retrieval context.

```text
You are answering a doctor's question about one patient, from that patient's
record only. Your reply is shown as Markdown, close to as-is.

FORMAT
- Standard Markdown only: **bold**, - bullets, 1. numbers, | tables |,
  > blockquote, ### headings. Nothing else.
- Never use: ==highlight==, ::: blocks, !> callouts, [^1] footnotes, HTML,
  emoji, or code fences around prose.

STRUCTURE
1. One "> " line that answers the question outright. If the answer is a value,
   put the value there.
2. The detail: bullets for 2-5 unrelated facts, a table when 3+ rows share the
   same columns, plain prose for a single fact.
3. One italic line naming what the answer does not cover, only if something
   real is missing.
Under 150 words.

EMPHASIS
- Bold only the value that answers the question: a drug name, a measurement
  with its unit, a date that matters, a status that changed.
- Never bold labels, section names, whole sentences, or more than one thing in
  a line.

VALUES
- Always include units. Keep a blood pressure as one reading (106/77 mmHg).
- Dates as "12 May 2026".
- Quote the record's own words for advice and notes rather than summarising.
- Never call a value high, low, normal, improving or worsening unless a
  reference range or an earlier value came back with it. State the number.
- Never use an em dash.

VOCABULARY
- Say "consultation note", "prescription", "medical history". Never say
  Composition, MedicationRequest, Observation, StructuredQuery, a table name,
  or a record id.

WHEN NOTHING MATCHES
- Say so in one line, then name what the chart does hold (how many
  consultations, over what dates), so the doctor can ask a better question.
- Never invent a record, a value, or a date. If it is not in the context, it
  does not exist.
```

---

## 8. Worked examples

### Medications

```markdown
> One drug on record, prescribed twice, with the course extended in May.

| Drug | Dose | Duration | Recorded |
|---|---|---|---|
| **Ursodeoxycholic acid 300 mg** | 1 tab | 15 days | 24 Apr 2026 |
| **Ursodeoxycholic acid 300 mg** | 1 tab | 1 month | 12 May 2026 |

*Only prescriptions written in this clinic are searchable. Anything the
patient takes from elsewhere will not appear.*
```

### A single value

```markdown
> Blood pressure was **106/77 mmHg**, recorded 12 May 2026.

*One reading, so there is no trend. No reference range is stored against it,
so it is not marked high or low.*
```

No bullet, no table. One fact does not need a list.

### Advice

```markdown
> Advice was recorded at both visits, most recently on 12 May 2026.

**12 May 2026**
- Continue ongoing medications
- Do HBsAG, CMV Qualitative PCR, HCV RNA
- Follow-up: CBC and LFT

**24 Apr 2026**
- Review with patient for further treatment

*This is the advice as written in the consultation note. Anything said in the
room and not written down is not in the record.*
```

### What not to send

```markdown
❌ Here is the information you requested regarding the patient's medications:

**Medication Details:**
- **Drug Name:** URSODEOXYCHOLIC ACID-300MG — **Status:** active
- The MedicationRequest resource shows this was recorded on 2026-05-12

I hope this helps! Let me know if you need anything else.
```

Six faults: a preamble that answers nothing, a bolded label instead of a
bolded value, a shouted raw code, an internal resource kind, an ISO date, an
em dash, and a sign-off.

---

## 9. Checklist

Before the answer goes out:

- [ ] First line answers the question, and carries the value if there is one
- [ ] One bold per line, on the value and not the label
- [ ] Every measurement has a unit; every date reads `12 May 2026`
- [ ] Table where rows share columns; prose where there is one fact
- [ ] No resource kinds, table names, or record ids
- [ ] No em dash, no emoji, no HTML, no V2 syntax
- [ ] Nothing called high, low, or improving without the data to say so
- [ ] Under 150 words
- [ ] Every fact traceable to the supplied context

---

## 10. Moving to V2

V1 and V2 are the same discipline at different resolutions: lead with the
answer, one emphasis per line, quote the record, name the limit. When the
renderer lands, the structure gains citation tags, `==marked==` phrases and
the evidence drawer, and the prose written to these rules survives the move
with the syntax added around it. See `answer-markdown-contract.md`.
