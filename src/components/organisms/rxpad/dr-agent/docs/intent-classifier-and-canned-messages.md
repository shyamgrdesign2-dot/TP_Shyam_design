# Intent Classifier & Canned Message Logic

## Overview

The Doctor Agent uses a **two-stage pipeline** to decide what to show the doctor:

1. **Intent Classification** — Determines *what kind* of response is needed
2. **Canned Pill Engine** — Determines *what quick-action pills* to surface

Together, they drive the contextual, phase-aware experience where the agent proactively offers relevant suggestions based on the current state of the consultation.

---

## 1. Intent Classifier (`intent-engine.ts`)

### How It Works

The intent classifier takes a user's free-text input and maps it to:
- **IntentCategory** — What domain the query falls into
- **ResponseFormat** — Whether to respond with `text`, `card`, or `hybrid`
- **Confidence** — How confident the match is (0.0 to 1.0)

### Classification Strategy

**Keyword-based matching** with priority ordering. Rules are checked top-to-bottom; the first match wins.

```
Input: "Show me the patient's HbA1c trend"
       ↓
Rule match: keywords ["trend", "change", "previous"] → intent: "comparison"
       ↓
Output: { category: "comparison", format: "card", confidence: 0.85 }
```

### Intent Categories

| Category | Description | Typical Card Output |
|----------|-------------|---------------------|
| `data_retrieval` | Fetch patient data (summary, labs, vitals, history) | patient_summary, lab_panel, last_visit, specialty summaries |
| `clinical_decision` | Decision support (DDX, meds, investigations) | ddx, protocol_meds, investigation_bundle |
| `action` | Perform an action (copy, translate, follow-up, advice) | translation, follow_up, advice_bundle |
| `comparison` | Compare data over time (trends, deltas) | lab_comparison, vitals_trend_bar/line, lab_trend |
| `document_analysis` | Process uploaded documents (OCR) | ocr_pathology, ocr_extraction |
| `clinical_question` | Medical knowledge questions | text_fact, drug_interaction, text_quote |
| `operational` | Clinic operations (queue, revenue, KPIs) | welcome_card, patient_list, analytics_table, revenue_bar |
| `follow_up` | Clarification questions from the agent | follow_up_question |
| `ambiguous` | Cannot determine intent; fallback to free text | text response |

### Pill-to-Intent Bypass

When the doctor taps a **canned pill** (e.g., "Suggest DDX"), the system bypasses NLU entirely and uses the `PILL_INTENT_MAP` lookup table. This ensures:
- Zero latency on pill taps
- Deterministic routing (no false matches)
- Consistent behavior regardless of pill label phrasing

### Rule Priority

Rules are ordered strategically:
1. **Operational (multi-word)** — Checked first because "follow-ups due" must match operational, not generic "follow-up" (action)
2. **Data Retrieval** — Patient data queries
3. **Clinical Decision** — DDX, meds, investigations
4. **Action** — Copy, translate, advice
5. **Comparison** — Trends and deltas
6. **Document Analysis** — OCR/upload
7. **Clinical Question** — Knowledge queries
8. **Ambiguous fallback** — Confidence 0.3

---

## 2. Canned Pill Engine (`pill-engine.ts`)

### How It Works

The pill engine generates **contextual quick-action pills** that appear below the chat input. These are NOT random — they are computed from three inputs:

```
(PatientSummary, ConsultPhase, ActiveTab) → CannedPill[]
```

### 4-Layer Priority Pipeline

Pills are generated across 4 layers, then sorted by priority (lower = higher priority) and deduped:

#### Layer 1: Safety Force (Priority 0-9)
- **Always shown**, cannot be displaced
- Triggered by critical vital signs or allergy presence
- Examples: "Review SpO2" (SpO2 < 90), "Allergy Alert" (any allergies)

#### Layer 2: Clinical Flags (Priority 10-51)
- Triggered by abnormal patient data
- Lab flags, overdue follow-ups, abnormal vitals
- Specialty-specific pills (Obstetric, Gynec, Pediatric, Ophthal) when relevant data exists
- **POMR per-problem pills** when `pomrProblems` are present — generates a pill per active problem (e.g., "CKD Stage 5", "Hypertension", "Type 2 Diabetes")
- **Chronic disease pills** — CKD patients get: Dialysis adequacy, Fluid & electrolytes, Bone mineral status, CV risk assessment. DM patients get: Glycemic control, Insulin adjustment. Anaemia patients get: EPO dosing, Iron stores.
- **Multi-morbidity pills** — when 3+ problems: Polypharmacy review, Medication timeline
- **Cross-problem flags** — Drug interactions, missing tests, overdue items, action-needed alerts

#### Layer 3: Consultation Phase (Priority 30-58)
- **The core driver of contextual suggestions**
- Changes based on where the doctor is in the consultation workflow:

| Phase | Context | Pills Offered |
|-------|---------|---------------|
| `empty` (new patient) | No prior data | Review intake, Suggest DDX, Initial investigations, Ask anything |
| `empty` (existing) | Has history | Patient summary, Vital trends, Lab overview, Last visit, Ask anything |
| `symptoms_entered` | Symptoms recorded | Suggest DDX, Compare with last visit, Vital trends |
| `dx_accepted` | Diagnosis set | Suggest medications, Investigations, Draft advice, Plan follow-up |
| `meds_written` | Medications added | Translate to regional, Plan follow-up |
| `near_complete` | Most fields filled | Completeness check, Translate advice, Visit summary |

**Always-available pills** (appended to every phase):
- Patient detail summary, Lab comparison, Medication review, Chronic conditions

**Data-aware**: Layer 3 checks what data actually exists before offering pills. E.g., "Vital trends" only appears if vitals are recorded; "Lab comparison" only if labs exist.

#### Layer 4: Tab Lens (Priority 60-69)
- Triggered by which sidebar tab is active
- E.g., Lab Results tab → "Lab comparison", "Annual panel"
- Past Visits tab → "Compare visits", "Recurrence check"

### Pipeline Resolution

```
All 4 layers generate pills
       ↓
Sort by priority (ascending)
       ↓
Deduplicate by label
       ↓
Layer 1 force pills always included
       ↓
Remaining slots filled from pool (max 35 total)
       ↓
Final pill set displayed to doctor
```

### POMR Problem Pill → Card Flow

When a POMR problem pill is tapped (e.g., "CKD Stage 5"):
1. Reply engine matches the problem name against `pomrProblems` array
2. Builds a `pomr_problem_card` output with: problem name, status, completeness donut data, relevant labs (with provenance), medications, missing fields
3. Card renders with its own internal donut — no overlay from CardRenderer

Specific clinical term pills (e.g., "Dialysis adequacy", "Glycemic control") bypass POMR matching and generate targeted clinical text responses instead.

---

## 3. Canned Message Generation (Reply Engine)

### What Is a "Canned Message"?

When a pill is tapped or intent is classified, the **reply engine** generates a structured response. The "canned" part refers to the fact that for the POC, responses are **deterministic and template-driven** (not LLM-generated).

### Context Signals Used

The reply engine considers ALL of the following when generating its response:

| Signal | Source | How It Influences Response |
|--------|--------|---------------------------|
| Patient demographics | RxContextOption | Age/gender-appropriate guidelines |
| Active specialty | SpecialtyTabId | Show relevant specialty data (gynec, pediatric, etc.) |
| Today's vitals | SmartSummaryData.todayVitals | Highlight abnormals, include in DDX reasoning |
| Lab flags | SmartSummaryData.keyLabs | Drive lab-related cards, flag counts |
| Active medications | SmartSummaryData.activeMeds | Drug interaction checks, protocol conflicts |
| Consultation phase | ConsultPhase | Determines which card types are relevant |
| Last visit data | SmartSummaryData.lastVisit | Enables comparison cards |
| Symptom collector | SmartSummaryData.symptomCollectorData | Drives DDX, investigation suggestions |
| Allergies | SmartSummaryData.allergies | Safety alerts, drug alternatives |
| Chronic conditions | SmartSummaryData.chronicConditions | Narrative context, guideline selection |
| RxPad state | Sections filled/empty | Completeness checks, next-step suggestions |

### Response Routing

```
Intent Classification Result
       ↓
Switch on (category, format):
  - data_retrieval + card → PatientSummaryCard, LabPanelCard, LastVisitCard, etc.
  - clinical_decision + card → DDXCard, ProtocolMedsCard, InvestigationCard
  - comparison + card → LabComparisonCard, VitalsTrendCard
  - action + card → TranslationCard, FollowUpCard, AdviceBundleCard
  - operational + card → WelcomeCard, PatientListCard, RevenueBarCard, etc.
  - clinical_question + text → text_fact, text_quote, text_alert
  - ambiguous + text → Free-text response
       ↓
Card data populated from SmartSummaryData + mock data
       ↓
Follow-up pills regenerated for the new context
```

### How Canned Messages Adapt

The canned message text and card content change based on:

1. **Phase transitions**: When the doctor enters symptoms, the message shifts from "Here's the patient summary" to "Based on the symptoms, here are possible diagnoses"
2. **Data changes**: When new labs arrive, the message highlights deltas and flags
3. **Action context**: If the doctor is on the medication section, the message focuses on drug-related info
4. **Specialty context**: If the patient has obstetric data, specialty-specific insights are woven in

### Example Flow

```
Doctor opens patient → Phase: empty
  Agent: "Good morning! Here's Rajesh's snapshot."
  Card: PatientSummaryCard
  Pills: [Patient summary, Vital trends, Lab overview, Ask anything]

Doctor enters symptoms → Phase: symptoms_entered
  Agent: "Noted. Based on headache + dizziness + BP 152/96, here are possibilities."
  Card: DDXCard (ranked differentials)
  Pills: [Suggest DDX, Compare with last visit, Vital trends]

Doctor accepts Dx → Phase: dx_accepted
  Agent: "For Hypertensive Urgency, here's the recommended protocol."
  Card: ProtocolMedsCard
  Pills: [Suggest medications, Investigations, Draft advice, Plan follow-up]

Doctor writes meds → Phase: meds_written
  Agent: "Medications noted. Let me draft patient advice."
  Card: AdviceBundleCard
  Pills: [Generate advice, Translate, Plan follow-up]
```

---

## 4. For Backend Developers

When building the real backend, the canned message system should be replaced with:

1. **LLM-based intent classification** — Use the keyword rules as training data / few-shot examples
2. **Context-aware prompting** — Feed all SmartSummaryData signals into the LLM prompt
3. **Structured output** — LLM returns JSON matching `RxAgentOutput` union type
4. **Pill generation** — Keep the 4-layer priority engine server-side (it's deterministic and fast)
5. **Streaming** — Text portions stream; card JSON sent as a complete block

### Key Design Decisions

- **Max 35 pills** — Scrollable pill bar accommodates chronic disease workflows with many actionable items
- **Layer 1 cannot be displaced** — Safety-critical pills always visible
- **Phase-awareness** — Pills change as the consultation progresses
- **Data-awareness** — Don't offer "Lab trends" if no labs exist
- **Pill bypass** — Tapping a pill skips NLU for reliability
- **Tab lens** — Active sidebar tab influences suggestions
- **POMR-aware** — Per-problem pills auto-generated from `pomrProblems` data
- **Specific term priority** — Clinical terms (e.g., "dialysis adequacy") take priority over generic POMR problem matching

---

## 5. For Frontend Developers

### Adding a New Intent

1. Add keyword rule to `RULES` array in `intent-engine.ts`
2. Add pill label mapping to `PILL_INTENT_MAP`
3. Add card handler in `reply-engine.ts` switch statement
4. Add card type to `RxAgentOutput` union in `types.ts`
5. Create card component and register in `CardRenderer.tsx`

### Adding a New Canned Pill

1. Determine which layer (1-4) the pill belongs to
2. Add it to the appropriate `getLayerN()` function in `pill-engine.ts`
3. Set priority number (lower = higher priority within layer)
4. Map the pill label in `PILL_INTENT_MAP` in `intent-engine.ts`
5. Ensure the reply engine handles the mapped intent

### Testing

- Pill visibility: Change patient data → verify correct pills appear
- Intent routing: Type queries → verify correct card type renders
- Phase transitions: Progress through consultation → verify pill changes
