# Backend Integration Guide

> How to swap the demo's mock data with a real backend / agentic API
> without touching component code. Read after `engineering.md` §5 — the
> data flow diagram shows WHERE the seams are; this file explains WHAT to
> send and HOW to wire it.

---

## 1. The contract (TL;DR)

The frontend speaks in stable JS shapes. Plug in a backend by producing
these shapes and feeding them through the existing hand-off points:

| Shape | Where consumed | Source file |
|---|---|---|
| `VoiceStructuredRxData` | Structured EMR card (canvas + chat preview) | `components/tp-rxpad/dr-agent/types.js` |
| `RxPadCopyPayload` | Rx form fan-out via `requestCopyToRxPad` | `components/tp-rxpad/rxpad-sync-context.jsx` |
| `HistoricalUpdateBatch` | Sidebar fan-out via `pushHistoricalUpdates` | `components/tp-rxpad/rxpad-sync-context.jsx` |
| `RxAgentChatMessage` | A chat bubble in the Dr.Agent panel | `components/tp-rxpad/dr-agent/types.js` |

If the backend returns these directly, you skip transformation entirely.
If it returns its own shape, write a single adapter per endpoint — the
rest of the UI stays the same.

---

## 2. Endpoints the demo currently mocks

These calls exist today with `setTimeout` / hard-coded data. Replace each
with an HTTP call to your backend.

### 2.1 `POST /voicerx/structure`

**When**: Doctor hits Submit on the recorder.

**Currently mocked in**: `components/tp-rxpad/dr-agent/DrAgentPanel.jsx`,
function `submitVoiceRxRecording`.

**Request**:
```json
{
  "patientId": "string",
  "transcript": "raw voice transcript",
  "mode": "ambient_consultation | dictation",
  "durationMs": 34000,
  "contextHints": {
    "specialty": "gp | gynec | cardio | …",
    "visitType": "first | followUp",
    "patientAge": 42,
    "patientGender": "M | F",
    "activeMedications": ["Metformin 500mg"],
    "activeConditions": ["Type 2 diabetes"]
  }
}
```

**Response** (must satisfy `VoiceStructuredRxData`):
```json
{
  "voiceText": "can be transcript or server-cleaned version",
  "sections": [
    {
      "sectionId": "symptoms",
      "title": "Symptoms",
      "tpIconName": "virus",
      "items": [
        { "name": "Fever", "detail": "3 days, moderate" },
        { "name": "Cough", "detail": "dry, persistent" }
      ]
    }
  ],
  "copyAllPayload": {
    "sourceDateLabel": "Voice consult",
    "targetSection": "rxpad",
    "symptoms": ["Fever (3 days, moderate)"],
    "diagnoses": ["Viral pharyngitis"],
    "medications": [
      {
        "medicine": "Paracetamol 650mg",
        "unitPerDose": "1 tablet",
        "frequency": "1-0-0-1",
        "when": "AF",
        "duration": "3 days",
        "note": ""
      }
    ],
    "advice": "Rest, adequate fluids",
    "labInvestigations": ["CBC"],
    "vitals": { "temperature": 99.8, "heartRate": 88 }
  },
  "sidebarBatch": {
    "vitals": [{ "id": "v1", "bullets": ["Temp 99.8°F", "Pulse 88 bpm"] }]
  }
}
```

### 2.2 `GET /patient/:id/snapshot`

**When**: Patient is selected; Dr.Agent panel loads vitals, history, last visit.

**Currently mocked in**: `components/tp-rxpad/dr-agent/mock-data.js` and
`engines/voice-rx-patient-mock.js` — hard-coded per-patient maps.

Response feeds the various `*Data` card interfaces in `types.js`. Each
card has a stable contract; the mock data shows the expected shape.

### 2.3 `POST /chat/intent`

**When**: Doctor types a free-form message.

**Currently mocked in**: `engines/intent-engine.js` + `engines/reply-engine.js`.

**Request**:
```json
{
  "patientId": "string",
  "text": "what are the likely diagnoses here?",
  "conversationHistory": [
    { "role": "user", "text": "…", "createdAt": "ISO 8601" }
  ]
}
```

**Response**:
```json
{
  "reply": {
    "text": "Based on the symptoms, consider viral pharyngitis.",
    "rxOutput": {
      "kind": "ddx",
      "data": { "options": [{ "label": "Viral pharyngitis", "likelihood": "high" }] }
    }
  }
}
```

`rxOutput` is a discriminated union over ~30 card kinds. Common ones:

| `kind` | When to use |
|---|---|
| `voice_structured_rx` | Full structured clinical notes |
| `patient_reported` | Symptom collector result |
| `lab_panel` | Single lab report |
| `lab_trends` | Time-series lab values |
| `ddx` | Differential diagnosis options |
| `advice_bundle` | Structured advice sections |
| `vitals_summary` | Single-visit vitals |
| `follow_up_question` | When intent is ambiguous — ask the doctor back |

See `components/tp-rxpad/dr-agent/types.js` and `cards/CardRenderer.jsx`
for the full union.

### 2.4 `POST /rxpad/copy/:section` (optional)

If you want server-side persistence of copy events (audit trail, undo
across sessions): receive `RxPadCopyPayload`, return a server-assigned
`copyId`. The frontend generates a local id today — swap it out when the
response arrives.

### 2.5 `POST /print/render` (optional)

`app/print-preview/` currently renders client-side from local Rx state.
Replace the data source with a server endpoint for PDF generation.

---

## 3. Where to plug in (the seam map)

### Seam A — Voice submit

**File**: `components/tp-rxpad/dr-agent/DrAgentPanel.jsx`
**Function**: `submitVoiceRxRecording`

Replace this:
```js
voiceRxTimeoutRef.current = setTimeout(() => {
  const structured = buildPatientVoiceStructuredRx(selectedPatientId, transcript)
  // … other mock builders
  setVoiceRxResult({ structured, … })
}, 1800)
```

With:
```js
const [result] = await Promise.all([
  fetch("/api/voicerx/structure", {
    method: "POST",
    body: JSON.stringify({ patientId: selectedPatientId, transcript, mode, durationMs }),
  }).then(r => r.json()),
  new Promise(r => setTimeout(r, 1800)), // keep min shiner visibility
])

setVoiceRxResult({
  structured: result,
  transcript,
  sections: result.sections.map(s => ({
    id: s.sectionId, title: s.title,
    items: s.items.map(it => it.detail ? `${it.name} — ${it.detail}` : it.name),
  })),
  durationMs,
  modeLabel: mode === "ambient_consultation" ? "Conversation Mode" : "Dictation Mode",
  pendingSidebarBatch: result.sidebarBatch,
})
```

### Seam B — Chat send

**File**: `DrAgentPanel.jsx`, function `handleChatSubmit`

Replace `replyEngine.process(text)` with:
```js
const { reply } = await fetch("/api/chat/intent", {
  method: "POST",
  body: JSON.stringify({ patientId, text, conversationHistory }),
}).then(r => r.json())

// Push assistant message — CardRenderer handles rxOutput
appendMessage({ role: "assistant", text: reply.text, rxOutput: reply.rxOutput })
```

### Seam C — Patient context load

**File**: wherever `selectedPatientId` triggers a data load.

```js
useEffect(() => {
  if (!selectedPatientId) return;
  fetch(`/api/patient/${selectedPatientId}/snapshot`)
    .then(r => r.json())
    .then(setPatientSnapshot)
}, [selectedPatientId])
```

Cards already handle `undefined` / empty data — skeleton states render
automatically while the fetch is in flight.

---

## 4. Loading / error / empty contract

**The cardinal rule**: no red error banners during a live consultation.

| Situation | Frontend behaviour | Backend should… |
|---|---|---|
| Background load (patient snapshot) | Skeleton → fills when resolved | Return `null` / `204` for missing data |
| User-triggered action (voice submit) | Shiner card shown; inline retry if fails | Return structured error; frontend shows retry button |
| Partial data (some sections missing) | Renders only available sections | Omit missing keys — don't send empty arrays |
| Network offline | Toast + recording continues | N/A — handled by `useNetConnection` |
| 500 / unexpected error | Silent empty-state | Never surface raw error text to doctor |
| Save / Print (critical) | Only place a modal error is acceptable | Include a `userFacingMessage` in the error body |

---

## 5. Authentication

Not implemented in the demo. When adding:

- **Token storage**: `httpOnly` cookies preferred over localStorage.
- **401 handling**: silent re-auth or redirect to login — never show a red banner mid-consult.
- **Token refresh**: background; only surface to user if refresh truly fails.

Add a single `lib/api-client.js` that injects auth headers and handles
401 retry. All fetch calls go through it — no auth logic in components.

---

## 6. Icon mapping

The `tpIconName` field in section responses must match a registered
`TPMedicalIcon`. Icons live in `public/icons/medical/`. Common mappings:

| `sectionId` | `tpIconName` |
|---|---|
| `symptoms` | `virus` |
| `examination` | `medical-service` |
| `diagnosis` | `Diagnosis` |
| `medication` | `tablets` |
| `advice` | `health-care` |
| `investigation` / `labs` | `Lab` |
| `followUp` | `calendar` |
| `history` | `medical-record` |
| `vitals` | `heart-rate` |
| `surgeries` | `surgical-scissors-02` |

To add a new section type: drop an SVG into `public/icons/medical/` and
register the name in `components/tp-ui/medical-icons/index.js`.

---

## 7. Integration checklist

- [ ] Stand up the API endpoints from §2
- [ ] Match response shapes to interfaces in `types.js` (or write adapters)
- [ ] Add `lib/api-client.js` with auth header injection + 401 retry
- [ ] Replace Seam A in `DrAgentPanel.jsx` (voice submit)
- [ ] Replace Seam B in `DrAgentPanel.jsx` (chat send)
- [ ] Replace Seam C (patient snapshot load)
- [ ] Verify loading / empty / error contract — no red banners
- [ ] Test offline path (DevTools → Network → Offline)
- [ ] Test 401 / 500 paths — silent fallback to empty state
- [ ] Test partial-data response — missing sections are omitted gracefully
- [ ] Test patient switch during in-flight fetch — abort previous request
- [ ] Test `prefers-reduced-motion` — animations off, data still correct

When the checklist passes, every component above the seams is untouched.
That confirms the data contracts held.
