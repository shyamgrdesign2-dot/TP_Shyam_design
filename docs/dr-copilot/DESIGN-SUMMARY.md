# Dr. Copilot: what it does, and what our portal does with it

Design-facing summary. Written 8 October 2026 from the service team's product
brief (`design.md`, 8 Oct 2026) plus live checks against
`https://pm-copilot-preprod.tatvacare.in` on the same day.

Two kinds of statement appear below:

- **Brief:** claimed by the service team's document.
- **Checked:** confirmed by calling the live preprod service today.

Our portal's side is the `dr-copilot` branch (see
[DEV-HANDOFF.md](./DEV-HANDOFF.md) for the engineering view).

---

## 1. The headline for design

**Dr. Copilot is no longer a lookup tool. It reasons.**

We built our chips, copy and expectations around "this is a query engine, not
an LLM: every suggestion must be a retrieval". The brief is explicit that the
assistant now explains, interprets and advises: medicine classes,
differentials, relevant risks, and considerations for the doctor's review. It
still separates what the chart records from what it concludes, and it cites
the record for the first.

What that changes for us:

- Starter chips no longer have to be pure lookups.
- Our promise copy ("answers from the record") understates it, and our
  "retrieval only" rule in [starter-question-logic.md](./starter-question-logic.md)
  is out of date.
- The doctor now needs to see, at a glance, which part of an answer is the
  record and which part is the assistant's reasoning. That separation is the
  main new design problem.

## 2. What changed since we integrated

| | Our build (Sept) | Now |
|---|---|---|
| Answer style | Retrieval, cited | Retrieval plus interpretation and advice (**brief**) |
| Follow-ups | We reused starters | Service returns its own `suggestions` per answer (**checked**) |
| Trends | Rendered as text | Response carries a `charts` object for trend questions (**checked**) |
| Progress | Generic typing dots | Response carries `activity`: labelled steps with timings (**checked**) |
| Refusals | Shown as plain text | `response_kind` distinguishes `write_action` and `other_patient` with fixed wording (**checked**) |
| Scope | One patient at a time | Second mode, **Find Patients**, searches the whole organisation (**brief**) |
| Conversations | Tab-local, reset after 30 idle minutes | Stored server side for 30 days, reopenable from a list (**brief**) |
| Visits | Evidence drawer only | A single visit can be opened on its own (**checked**: endpoint exists) |
| Patient search by name | We never used it | `GET /patients?q=` now returns 500 (**checked**) |
| Ops | None | Telemetry endpoints for usage, latency and per-request evidence (**checked**) |

## 3. What a doctor can ask

There is no fixed menu; the model picks its own record reads. The brief groups
it as follows. Everything here can be narrowed by date, encounter or treating
doctor.

- **Briefing / handover:** "What should I know before this consultation?"
- **History:** medical, surgical, family, lifestyle, including findings that
  exist only inside specialist narratives.
- **Diagnoses and contradictions:** confirmed vs suspected vs ruled out, and
  where a structured tag disagrees with a note.
- **Symptoms and examination findings**, including ones recorded outside a
  visit.
- **Prescriptions:** what was prescribed, the exact recorded instructions,
  and conflicts between instruction fields.
- **Medicine names, typos and classes:** "did I give levocetrazene", "has this
  patient had steroids".
- **Prescription comparisons** between two visits.
- **Prescribed versus actually taken or stopped.**
- **Labs and vitals:** latest values, ranges, flags, counts.
- **Trends** with a chart and backend-calculated changes.
- **Visits:** counts, dates, what one encounter documents.
- **Advice, referrals, follow-up and investigations recorded.**
- **Procedures and imaging mentioned in notes.**
- **General medical explanation** with no chart read at all.

**One thing to be careful about in the UI:** the **Patient summary** button is
formatted by backend code, while a typed briefing question is written by the
model. They will not match word for word, so do not present them as the same
thing.

**Nobody knows what doctors use most.** The brief says so directly: the
evaluation set is not usage, and no analysis separating real doctors from test
traffic exists. We should not design a hierarchy that claims to be based on
usage.

## 4. The two modes, and where they belong

**Selected patient** is a conversation bound to one chart, one doctor and one
organisation. It cannot be rebound to another patient. This is what our
consultation and patient-detail surfaces use today.

**Find Patients** has no selected patient and searches the organisation by
recorded criteria: diagnoses, symptoms, medicines, history, procedures, notes
and plans, numeric lab or vital thresholds, AND/OR combinations and dates. It
returns at most 20 supported patients per page, each card showing the exact
recorded facts with dates and sources, and opening one starts a normal patient
conversation.

Design position: Find Patients is an organisation-level surface. All Patients
is its natural home, not the consultation. Today our portal has no entry for
it at all.

### 4a. Switching between them, without a tutorial

Two scopes that read identically in a chat log is the thing most likely to
cause a clinical misreading: a hospital-wide answer taken for this patient's,
or the reverse. Four decisions, all of them in the panel rather than in
documentation a doctor will not read:

**One context bar, in both scopes.** It names the scope and it is the control
that changes it, in the same place every time. Patient scope carries age and
sex alongside the name, so the bar also answers "is this the right Sharma?".
It replaced a strip of two chips that appeared only in the hospital scope and
had "My patients" permanently disabled.

**The difference is explained where the choice is made.** The switcher's two
rows each carry one line: the chart answers from one record with citations,
the hospital search finds patients and answers about none of them. Each row
also says what is waiting in that scope ("2 questions so far", "nothing asked
yet"), so a switch is predictable before it is made rather than a surprise
after.

**Each scope keeps its own conversation.** Switching never mixes them, and
switching back resumes where the doctor left off. This is the answer to the
meeting's point about one chat holding both kinds of question: the scroll
never mixes them because the thread never does.

**The refusal became the doorway.** A chart question about other patients used
to end on the service's "I cannot search across patients", which is no longer
true of the product. Both scopes now answer their own refusals: the panel
names the scope that can answer and carries the question into it, so nothing
is retyped. The mirror case is handled too: a single-patient question asked
hospital-wide offers the chart it belongs in, and offers nothing when there is
no chart to return to.

**The scope that does not exist yet is a sentence, not a dead control.** A
disabled chip reads as broken; a line in the switcher reads as coming. See 6b
for the service ask behind it.

## 5. What our portal does not yet use

Ordered by what it would add for a doctor.

1. **Server follow-up suggestions.** The service returns up to three
   follow-ups drawn from the evidence it just read. We generate our own from
   the starter list, which can suggest questions this chart cannot answer.
2. **Trend charts.** Trend answers carry chart data, exact values and
   calculated changes. We show the prose and drop the chart.
3. **Activity steps.** Real labelled progress ("Checking lab results") instead
   of an undifferentiated wait. Trend answers took about 25 seconds in
   today's check, so this matters.
4. **Refusal kinds.** ~~`write_action` and `other_patient` deserve their own
   treatment rather than looking like an answer that failed.~~ Done for
   `other_patient`, in both directions: see 4a. `write_action` still renders
   as plain prose.
5. **Previous conversations.** Threads live 30 days on the server; ours vanish
   with the tab and reset after 30 idle minutes. A doctor returning to a
   patient should find the earlier conversation.
6. **Visit drill-down.** A citation could open the whole encounter, not just
   the cited row.
7. **Find Patients.** ~~A whole mode with no entry point.~~ Built: the top
   bar's Copilot search now runs the clinic scope, returns patient cards and
   opens a chart from a result. The doctor scope ("my patients") is still
   waiting on the service; see 6b.

## 6. Copy and states to get right

- **Freshness.** Call it **"Last successful data import"**, and say it is for
  the organisation, not this patient. Data becomes searchable after a nightly
  import, so a visit saved today may not be included. Never write "your latest
  consultation is already included" or "Patient updated at".
- **Three different empty states**, which we currently blur together:
  no patient selected; no indexed records for this patient; records could not
  be loaded. The third must keep the doctor's question.
- **Sparse data is not a dead end.** Fewer starters is a valid outcome, and
  general medical questions still work. Do not disable the assistant because
  the chips are empty.
- **Recorded versus suggested.** Label them differently, for example
  "Recorded findings" and "Clinical considerations". Never style a suggestion
  like an issued prescription or order.
- **Uncertainty belongs at the fact.** A missing unit sits beside that result;
  unclassified allergies sit where a doctor checks allergies. Never turn
  "not available" into a reassuring "none".
- **Dates belong next to values**, so an old lab cannot read as today's.
- **Find Patients results** are "Patients shown", never a total. A page is
  not a census.
- **Scope wording.** "What did I prescribe" filters to the asking doctor;
  "what was prescribed" covers all treating doctors. Our copy should not imply
  the narrower one.

## 6b. Asks for the service team

1. **A doctor scope for clinic-wide search.** Doctors expect "all patients"
   versus "my patients". Today only the first exists, and asking for the
   second fails in two different ways (checked 8 Oct 2026): a numerical search
   worded "patients I have treated" silently returned the same tenant-wide
   rows and still said "in your tenant", while the narrative equivalent
   returned nothing because the records are attributed to other clinicians.
   We need an explicit parameter on `/discovery/ask`, resolved server side
   from the authenticated doctor, for example `scope: "my_patients"`. Until
   then the portal shows the control disabled rather than filtering the
   returned page, which would drop real matches.
2. **Starters for the clinic scope.** The service builds patient starters from
   one chart; there is no equivalent for the organisation, so the portal
   currently ships four hardcoded examples. Service-built suggestions, based
   on what the index actually holds, would be better.
3. **`GET /patients?q=` returns 500.** Retired or broken?

## 7. Open questions

1. Which capabilities do doctors actually use? Nobody has measured it, and the
   service now has telemetry that could answer it.
2. Does Find Patients belong in this portal release, and on which screen?
3. Should our conversation history move to the service's 30-day storage, so a
   thread survives a reload and a different device?
4. Is `/ask` streaming now? The service's own chat app looks like it streams,
   and our portal waits for the whole answer.
5. Is `GET /patients?q=` retired or broken? It returns 500 today.
6. Who owns the "I cannot search across patients" wording once Find Patients
   is reachable from the portal?

## 8. Sources

- Service team's product brief, `design.md`, 8 October 2026, including both
  complete system prompts.
- Live checks on 8 October 2026 against `pm-copilot-preprod.tatvacare.in`:
  `/ask` response shape (`charts`, `activity`, `suggestions`,
  `response_kind`), `/sessions`, `/telemetry/*`, `/patients?q=`.
- Our side: [DEV-HANDOFF.md](./DEV-HANDOFF.md),
  [api-contract.md](./api-contract.md),
  [answer-markdown-contract.md](./answer-markdown-contract.md).
