# Dr. Copilot — backend API contract

What the portal calls, what it needs back, and what is missing today.

**Scope: the Copilot chat only.** VoiceRx is live and unchanged; it keeps its
own capture and structuring pipeline. Copilot hosts it as a mode of its input
box, but nothing in this document touches it.

Everything under "Live today" was read off the running client
(`src/components/dr-copilot/chart-search/api.js`) and verified against the UAT
service. Everything under "Needed" is not there yet.

---

## 1. Service and auth

| | |
|---|---|
| Base URL | `https://pm-turbopuffer-uat.tatvacare.in` (override: `REACT_APP_CHART_SEARCH_URL`) |
| Auth | `Authorization: Bearer <jwt>` |
| Token source | Its own doctor session, **not** the portal login. Held in `localStorage["chart_search_jwt"]` |

Two problems with this, both worth fixing before a wider rollout.

**One session, not two.** The archive mints its own JWT, so a doctor already
signed into the portal has to acquire a second credential for Copilot to work.
Today a tester pastes one into `localStorage`. That is not shippable. Either
accept the portal's token, or expose a token-exchange endpoint the portal can
call with the session it already has:

```
POST /auth/exchange
  { portal_token: "<portal jwt>" }
→ { token: "<archive jwt>", expires_at: "2026-09-10T18:00:00Z" }
```

**CORS.** The service allows `http://localhost:5173`,
`https://pmdoctorportal.tatvacare.in` and its own origin, and rejects
`http://localhost:3007` with `Disallowed CORS origin`. 3007 is the portal's own
dev port, so today Copilot cannot be developed against the live archive from
the portal's dev server. Add `http://localhost:3007` to the allow-list.

---

## 2. `POST /chat/stream` — ask a question about one patient

**Live today.** Server-Sent Events, not JSON.

### Request

```jsonc
{
  "question": "What medications were recorded?",
  "context": { "scope_kind": "patient", "mrn": "1096320180244" },
  "history": [],          // accepted; the portal does not send it yet — see §5
  "session_id": null      // accepted; the portal does not send it yet — see §5
}
```

Headers: `Accept: text/event-stream`, `Content-Type: application/json`,
`Authorization: Bearer …`.

### Response stream

Two event types. Frames are separated by a blank line; the portal's reader
tolerates a frame split across chunks and skips any frame it cannot parse, so
partial or unknown events will not kill the stream.

```
event: stage
data: {"name": "retrieve", "detail": "…"}

event: answer
data: { …the payload below… }
```

`stage` events are optional and advisory — they let the panel say what the
archive is doing instead of showing an anonymous spinner. **The portal does not
render them yet**; the field names above are a guess and need confirming before
it does.

Exactly one `answer` event must arrive. No `answer` is treated as a failure.

### The `answer` payload

Every field the portal reads. Anything not listed is ignored.

| Field | Type | Status | What it is |
|---|---|---|---|
| `markdown` | string | **needed** | The whole reply, written to `answer-markdown-contract.md`. See §4 |
| `intent` | string | **needed** | One of `medications` `vitals` `labs` `diagnosis` `advice` `history` `intake` `documents`. Picks the card's icon and lead-in |
| `text` | string | live | Plain-prose answer. The fallback when `markdown` is absent |
| `segments[]` | array | live | Sentences with citations attached. `{ text, citation_numbers: number[] }`, 1-based into `citations` |
| `citations[]` | array | live | See below |
| `evidence[]` | array | live | See below |
| `retrieval` | object | live | Retrieval diagnostics. Read but not shown to the doctor |
| `context` | object | live | Echo of the request context |

### `citations[]`

| Field | Type | What it is |
|---|---|---|
| `source_path` | string | **The join key.** Must match an `evidence[].source_path` exactly |
| `resource_kind` | string | `Composition` `MedicationRequest` `Observation` `Condition` `DiagnosticReport` |
| `section` | string | Where in the record it came from |
| `event_date` | string | ISO date |
| `visit_id` | string | The consultation this belongs to |
| `provenance` | object | System / table / record id |

Citation *n* in the UI is `citations[n-1]`. The order is the contract.

### `evidence[]`

| Field | Type | What it is |
|---|---|---|
| `source_path` | string | Joins to a citation |
| `source_key`, `source_system`, `source_table` | string | Provenance, shown on the evidence card |
| `visit_id` | string | Used to group evidence by consultation |
| `event_at` | string | ISO timestamp |
| `text` | string | **The consultation narrative.** See §4 — this is the important one |
| `code`, `value_num`, `value_text`, `unit`, `status` | mixed | For observations and conditions |
| `lane` | string | Retrieval lane |
| `fhir_source` | object | The unflattened source row. Carries `icd_code`, `tcd_remarks`, `since_when`, which the flat fields drop |
| `kind` | string | **needed** — `"rx"` \| `"vitals"` \| `"document"`. Today the portal infers it |

---

## 3. `POST /patients/search` — resolve a patient

**Live today.** Not currently used by the Copilot panel (the portal already
knows its patient), but used by the standalone Chart Search harness.

```jsonc
// request
{ "query": "Saurabh" }
```

Response shape is unverified from the portal side. If it is to stay, it needs
documenting; if not, it can be dropped from this contract.

---

## 4. The four changes that matter most

In priority order. 1 and 2 are the format; 3 is the one that changes what a
doctor actually sees.

### 4.1 Send `markdown`

Today the portal composes the answer's Markdown itself, from `segments` and
`evidence`, in `chart-search/mockMarkdown.js`. That file is scaffolding written
so the format could be reviewed against real data, and it is meant to be
deleted the moment the archive sends `markdown`.

The full grammar is in `answer-markdown-contract.md`. The short version:

- Standard Markdown, one card's worth.
- `**bold**` marks the primary datum of a line — the drug, the value, the
  diagnosis. Not for emphasis.
- `==mark==` wraps a phrase quoted verbatim from the source record. The portal
  highlights exactly that phrase inside the cited document.
- `[^n]` is a citation, 1-based into `citations`.
- The first line is a heading; it picks the icon when `intent` is absent.

### 4.2 Send `intent`

Optional, because the portal guesses it from the heading. A declared intent is
always better than a guessed one.

### 4.3 Send the visit's `Composition` alongside any cited row

**This is the highest-value change and it is currently blocking a finished
feature.**

`text` — the doctor's actual OPD narrative — arrives only on `Composition`
rows, and only when a Composition is itself cited. `MedicationRequest`,
`Observation` and `Condition` rows come back with `text: ""`.

So a citation on a drug, a blood pressure or a diagnosis can only show that
row's own fields: system, table, record id. That proves provenance. It is not
what the doctor wrote.

Worked example, from the live archive. Ask *"What conditions are recorded?"*
and two `Condition` rows come back and nothing else. The consultation those
diagnoses were written into exists — the same visit's `Composition` carries
`Diagnosis:\n- Primary Myelofibrosis with CALR Mutation` in its narrative — but
it is not in `evidence[]`. Following the citation can therefore only show the
condition's own fields.

Either send `text` on those rows too, or include the visit's `Composition` in
`evidence[]` whenever any row from that visit is cited. **The portal already
joins on `visit_id` and will render the full prescription with the cited phrase
highlighted, automatically.** That code is written and live. It is waiting on
the row.

### 4.4 Never emit `StructuredQuery` rows as citations

They are retrieval mechanics. They reach the doctor as noise, and the portal
filters them out today — which means citation numbering has to be recomputed
client-side. Filtering them server-side removes that whole class of bug.

---

## 5. Endpoints that do not exist yet

### 5.1 Which resource kinds does this patient have?

**Needed for the starter questions.** The rule, documented in
`starter-question-logic.md`, is that Copilot never offers a question the
archive cannot answer for this patient — an offer that dead-ends costs more
trust than one that was never made.

The gate is written (`pickStarterPrompts(availableKinds)`) and is **called with
`null` today**, which means every prompt passes and the ordering alone decides.
One endpoint switches it on:

```
GET /patients/{mrn}/coverage
→ {
    "kinds": ["Composition", "MedicationRequest", "Observation", "Condition"],
    "visit_count": 3,
    "first_event_at": "2025-05-02",
    "last_event_at": "2025-11-13"
  }
```

`kinds` is the only required field. The prompts depend on exactly these five:
`Composition`, `MedicationRequest`, `Observation`, `DiagnosticReport`,
`Condition`.

The date span and visit count would also let the no-match reply say what *is*
on the chart without a second round trip — see §6.

This should be cheap. If it cannot be, the same three fields on the first
`answer` of a session would do.

### 5.2 Conversation memory

`/chat/stream` already accepts `history` and `session_id`; the portal sends
neither, so every question is currently standalone. Before follow-ups like
*"and what dose?"* can work, we need to know:

- Is `session_id` minted by the server or the client?
- What shape is `history` — `{role, content}[]`, or something narrower?
- Does the server retain anything, or is `history` replayed each time?

### 5.3 Answer feedback

The thumbs up/down in the chat is **local-only today** — it sets a flag on the
message in React state and is lost on reload. To be worth anything it needs a
sink:

```
POST /feedback
  { session_id, answer_id, verdict: "up" | "down", question, note? }
```

This also requires an `answer_id` on the payload, which does not exist yet.

---

## 6. Errors and limits

| Case | Today | Needed |
|---|---|---|
| Expired token | `401` | Keep. The portal raises `code: "unauthorized"` and asks for a fresh token |
| Nothing matched | Empty `citations` | Also return the chart's shape — visit count and date span — so the reply can say what *is* there rather than only that this attempt failed. The portal renders a no-match as a plain sentence, never a card |
| Rate limit | unknown | Document the limit and return `429` with `Retry-After` |
| Upstream failure | unknown | A terminal `event: error` frame with `{ code, message }` would be better than a dropped stream. The portal currently reports "returned no answer", which is true but unhelpful |

The portal aborts an in-flight request when a new question is asked. The server
should treat a client disconnect as a cancel.

---

## 7. What Copilot is, and what it therefore must not be asked to do

Chart Search is a **query engine over stored records** — prescriptions, vitals,
labs, conditions, consultation notes. It retrieves; it does not reason across
what it retrieves.

This is why the starter questions are all lookups, and why *"what changed
across recent records?"* was removed from them: comparing two visits is a
conclusion, and a starter question is a promise about the kind of answer that
comes back.

If that changes — if the service starts deriving, comparing or interpreting —
that is a contract change, not an implementation detail, and the guardrails in
`eval-questions.md` (classes `R0`–`R4`) need revisiting with it. `R2`
(interpretation) and `R3` (clinical judgement) must keep declining until there
is something behind them.

---

## 8. Summary for the backend

Ordered by what unblocks the most.

1. **Return the visit's `Composition` with any cited row** (§4.3). Unblocks
   evidence for drugs, vitals and diagnoses. Portal code is already written.
2. **`GET /patients/{mrn}/coverage`** (§5.1). Switches on the starter-question
   gate, which is written and inert.
3. **Add `markdown` and `intent` to `answer`** (§4.1, §4.2). Lets
   `mockMarkdown.js` be deleted.
4. **Add `kind` to `evidence[]`** (§2).
5. **Stop emitting `StructuredQuery` citations** (§4.4).
6. **Allow `http://localhost:3007`**, and give us token exchange (§1).
7. **Answer the session/history questions** (§5.2), then feedback (§5.3).
