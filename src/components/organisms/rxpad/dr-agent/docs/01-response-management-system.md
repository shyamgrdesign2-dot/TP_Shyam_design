# Dr. Agent — Response Management System

> How does the agent decide what to show, when to show it, and in what format?

---

## How It Works (Simple Version)

```
Doctor types or taps a pill
       ↓
Intent Engine classifies: "What does the doctor want?"
       ↓
Reply Engine decides: "Which card answers this best?"
       ↓
Card renders with data from: EMR + Uploads + Intake + AI
       ↓
Source dropdown shows: "Where did this data come from?"
       ↓
Follow-up pills regenerate for the new context
```

---

## Part 1: Two Modes of Input

### Mode A: Free-Text Input
The doctor types a question like _"Show me HbA1c trend"_ or _"What meds is the patient on?"_

→ Goes through **Intent Classification** (keyword matching → category → card type)

### Mode B: Pill Tap (Deterministic)
The doctor taps a contextual pill like `Suggest DDX` or `CKD Stage 5`

→ **Bypasses** intent classification entirely. Uses `PILL_INTENT_MAP` — a direct lookup table:
- Pill label → Intent → Card type
- Zero latency, zero false matches
- This is why pills are reliable: they're hardcoded routes

---

## Part 2: Intent Classification

### What It Does
Takes any text input and returns:
- **Category**: What domain (data_retrieval, clinical_decision, action, comparison, etc.)
- **Format**: How to respond (card, text, or hybrid)
- **Confidence**: How sure the match is (0.0 to 1.0)

### Categories

| Category | What the doctor is asking | Example query | Response type |
|----------|--------------------------|---------------|---------------|
| `data_retrieval` | "Show me patient data" | "Patient summary", "Lab results" | Card |
| `clinical_decision` | "Help me decide" | "Suggest DDX", "Protocol meds" | Card |
| `action` | "Do something for me" | "Translate advice", "Draft follow-up" | Card |
| `comparison` | "Compare over time" | "HbA1c trend", "Compare visits" | Card |
| `document_analysis` | "Process this upload" | "Extract lab report" | Card |
| `clinical_question` | "Medical knowledge" | "What's the dose for Metformin?" | Text |
| `operational` | "Clinic operations" | "Today's queue", "Revenue this week" | Card |
| `follow_up` | Agent needs more info | (System-triggered) | Card |
| `ambiguous` | Can't determine intent | "Hello", "What do you think?" | Text |

### Rule Priority (Why It Matters)
Rules are checked top-to-bottom. First match wins. Order matters because:
- "Follow-ups due" must match `operational` (clinic queue), NOT `action` (schedule a follow-up)
- "Drug interaction" must match `clinical_question` (knowledge), NOT `data_retrieval` (show data)

Priority order: Operational → Data Retrieval → Clinical Decision → Action → Comparison → Document Analysis → Clinical Question → Ambiguous fallback

---

## Part 3: Response Generation

### The Three Factors
Every response is generated considering:

1. **Patient's complete clinical picture**
   - All conditions, medications, allergies, vitals, labs, history
   - Chronic disease status (CKD stage, DM control, etc.)
   - Uploaded documents and their extracted data

2. **Patient's current situation**
   - Today's chief complaint (from symptom collector)
   - Current vitals taken today
   - Current consultation phase (just started vs. near complete)

3. **Type of doctor viewing**
   - GP vs. specialist vs. emergency
   - Changes canned messages and pill sets, NOT the underlying data
   - A nephrologist sees CKD-specific pills; a GP sees general ones
   - The clinical data remains the same — only the framing changes

### Response Format Decision

| If the intent maps to... | Format | Why |
|--------------------------|--------|-----|
| A specific card type | Card (structured) | Doctors process structured data faster |
| A knowledge question | Text (formatted) | No data to structure, just information |
| Mixed context | Hybrid (text + card) | Explain, then show the data |
| Unknown/ambiguous | Text (plain) | Safe fallback |

### Card Selection Logic (Reply Engine)

The reply engine checks 50+ specific query patterns:

```
"patient summary"   → sbar_overview card (primary structured summary)
"summary"           → sbar_overview card
"snapshot"          → sbar_overview card
"sbar" / "handoff"  → sbar_overview card
"detailed summary"  → patient_summary card (full GPSummaryCard)
"vital trends"      → vitals_trend_bar card
"suggest DDX"       → ddx card
"CKD Stage 5"      → pomr_problem_card (matched against pomrProblems)
"dialysis adequacy" → targeted clinical text
"drug interactions" → drug_interaction card
```

For **POMR problem pills** (e.g., "CKD Stage 5", "Hypertension"):
1. Reply engine matches pill label against `pomrProblems` array
2. Finds the matching problem data
3. Builds a `pomr_problem_card` with labs, meds, completeness, missing fields

For **specific clinical terms** (e.g., "Dialysis adequacy", "Glycemic control"):
- These bypass POMR matching
- Generate targeted clinical text responses instead
- Specific terms take priority over generic POMR matching

---

## Part 4: Contextual Pill System (Canned Messages)

### What Are Pills?
Pills are **quick-action buttons** below the chat input. They're not random — they're computed from patient data, consultation phase, and active sidebar tab.

### The 4-Layer Priority Pipeline

```
Layer 1: SAFETY FORCE          (Priority 0-9)    — Always shown, cannot be displaced
Layer 2: CLINICAL FLAGS         (Priority 10-51)  — Triggered by abnormal patient data
Layer 3: CONSULTATION PHASE     (Priority 30-58)  — Changes as consultation progresses
Layer 4: TAB LENS               (Priority 60-69)  — Based on active sidebar tab
```

#### Layer 1: Safety Force
- **Cannot be removed** from the pill bar
- SpO2 < 90 → "Review SpO2" pill (red tone)
- Patient has allergies → "Allergy Alert" pill
- These are safety-critical — doctor must always see them

#### Layer 2: Clinical Flags
- Lab flag count > 0 → "13 lab values flagged"
- Overdue follow-up → "5 overdue items"
- Abnormal vitals → "BP needs attention", "SpO₂ trend declining"
- Specialty data exists → Obstetric/Gynec/Pediatric/Ophthal summary pills
- POMR problems → One pill per active problem (e.g., "CKD Stage 5", "Hypertension")
- Chronic disease pills → CKD patients get: Dialysis adequacy, Fluid & electrolytes, Bone mineral status, CV risk assessment
- DM patients get: Glycemic control, Insulin adjustment
- Anaemia patients get: EPO dosing, Iron stores
- 3+ problems → Polypharmacy review, Medication timeline

#### Layer 3: Consultation Phase
The pills change as the doctor progresses through the consultation:

| Phase | What happened | Pills offered |
|-------|--------------|---------------|
| `empty` (new patient) | No prior data | Pre-visit intake, Suggest DDX, Initial investigations |
| `empty` (existing) | Has history | Patient summary, Vital trends, Lab overview, Last visit |
| `symptoms_entered` | Symptoms recorded | Suggest DDX, Compare with last visit |
| `dx_accepted` | Diagnosis set | Suggest medications, Investigations, Draft advice |
| `meds_written` | Meds added | Translate to regional, Plan follow-up |
| `near_complete` | Most fields filled | Completeness check, Visit summary |

#### Layer 4: Tab Lens
- Doctor clicks "Lab Results" sidebar tab → "Lab comparison", "Annual panel" pills appear
- Doctor clicks "Past Visits" tab → "Compare visits", "Recurrence check" pills appear

### Pill Deduplication

Once a card has been rendered in the conversation, its corresponding canned pill is automatically removed from the pill bar to avoid redundancy.

**Implementation:** `DrAgentPanel.tsx` tracks `shownCardKinds` (a Set of card kinds from rendered messages) and filters pills through a `PILL_TO_CARD_KIND` mapping:

| Pill Label | Card Kind |
|------------|-----------|
| Patient's detailed summary | patient_summary |
| Patient summary | sbar_overview |
| Pre-visit intake | symptom_collector |
| Last visit | last_visit |
| Vital trends | vitals_trend_bar |
| Suggest DDX | ddx |
| Lab overview | lab_panel |
| Obstetric summary | obstetric_summary |
| Gynec summary | gynec_summary |
| Growth & vaccines | pediatric_summary |
| Vision summary | ophthal_summary |

### Pipeline Resolution
```
All 4 layers generate pills → Sort by priority (lower = higher) → Deduplicate by label → Layer 1 always included → Filter pills for already-shown card kinds → Cap at 35 total → Display
```

---

## Part 5: Source Provenance (Trust Signal)

### Why It Exists
Doctors need to trust AI responses. The source dropdown answers: _"Where did this data come from?"_

### How It Works
- Every AI response has a **Source** button in the feedback row
- Click or hover opens a dropdown showing data origins
- Each entry maps to a sidebar section (Lab Results, Records, Past Visits, etc.)

### Source Types
| Source | What it means | Maps to sidebar |
|--------|--------------|-----------------|
| EMR | Structured EMR records | Patient's chart |
| Lab Results | EMR lab orders | Lab Results tab |
| Records | Uploaded documents (PDFs, reports) | Records tab |
| Past Visits | Previous consultation data | Past Visits tab |
| Symptom Collector | Patient-reported data from intake | Pre-visit form |
| History | Medical/family/social history | History tab |
| AI | AI-generated analysis or inference | — |
| Protocol | Clinical guidelines/protocols | — |

### Source Logic Per Card
The source is derived from the card's actual data — not hardcoded. For example:
- Patient Summary → EMR + Lab Results (count) + Records (count) + Past Visit (date) + Symptom Collector (date)
- POMR Problem Card → EMR + Lab Results + Records
- DDX Card → Context + Protocol
- Protocol Meds → Context + Protocol

---

## Part 6: Specialty-Aware Responses

### The Scalable Approach

**What does NOT change per specialty:**
- The underlying clinical data (a lab result is a lab result)
- The card structure (same card anatomy for all specialties)
- The intent classification logic

**What DOES change per specialty:**
- Canned messages and context pills
- Narrative framing (intro text emphasis)
- Which specialty-specific pills appear

### Adding a New Specialty
1. Add new pill definitions to `pill-engine.ts` (Layer 2)
2. Add specialty-specific canned messages to `reply-engine.ts`
3. Map new pill labels in `PILL_INTENT_MAP`
4. No changes to card components needed

---

## Part 7: For Developers — Adding New Capabilities

### Adding a New Intent
1. Add keyword rule to `RULES` array in `intent-engine.ts`
2. Add pill label mapping to `PILL_INTENT_MAP`
3. Add card handler in `reply-engine.ts` switch statement
4. Add card type to `RxAgentOutput` union in `types.ts`
5. Create card component and register in `CardRenderer.tsx`

### Adding a New Pill
1. Determine which layer (1-4) the pill belongs to
2. Add it to the appropriate layer function in `pill-engine.ts`
3. Set priority number (lower = shown first)
4. Map the pill label in `PILL_INTENT_MAP`
5. Add the pill label to `PILL_TO_CARD_KIND` mapping if the pill corresponds to a card kind (for deduplication)
6. Ensure the reply engine handles the mapped intent

### Adding a New Specialty
1. Add specialty-specific pills to Layer 2 in `pill-engine.ts`
2. Add canned message handlers in `reply-engine.ts`
3. No card component changes needed

---

## Part 8: End-to-End Flow Example

```
1. Doctor opens Ramesh Kumar (76M, CKD Stage 5 + DM + HTN + Anaemia)

2. Agent auto-loads patient summary
   → Card: sbar_overview (SBAR structured summary)
   → Source: EMR, Lab Results (8 results from 3 dates), Records (3 uploaded), Past Visit (02 Mar'26), Symptom Collector (15 Mar'26)

3. Pills generated (4 layers):
   Layer 1: Allergy Alert (safety)
   Layer 2: 13 lab values flagged, SpO₂ declining, BP needs attention, CKD Stage 5, Hypertension, Type 2 DM, Anaemia, Dialysis adequacy, Fluid & electrolytes, Bone mineral status, CV risk, Glycemic control, Insulin adjustment, EPO dosing, Iron stores, Polypharmacy review, Medication timeline, Drug interactions, 5 missing tests, 5 overdue items, 3 actions needed
   Layer 3: Patient summary, Vital trends, Lab overview, Last visit, Lab comparison
   Layer 4: (depends on active tab)

4. Doctor taps "CKD Stage 5" pill
   → Bypasses intent engine (PILL_INTENT_MAP lookup)
   → Reply engine finds matching pomrProblem
   → Card: pomr_problem_card with completeness donut (45% EMR, 30% AI, 25% missing)
   → Source: EMR, Lab Results, Records
   → New follow-up pills generated for CKD context

5. Doctor taps "Suggest DDX"
   → Card: ddx (ranked differentials based on symptoms + vitals + labs)
   → Doctor selects 2 diagnoses → "Copy selected to RxPad (2)"
   → Phase transitions to dx_accepted
   → Pills change: Suggest medications, Investigations, Draft advice, Plan follow-up

6. Doctor taps "Suggest medications"
   → Card: protocol_meds (with safety check against allergies)
   → Doctor reviews, copies to RxPad
   → Phase transitions to meds_written

7. Doctor taps "Completeness check"
   → Card: completeness (shows filled/empty RxPad sections)
   → Phase: near_complete
```

**UI rules applied throughout:**
- All structural dividers use `|` (pipe, never `·`) with `mx-[6px]` spacing
- SectionTag icon size is 12px (not 10px)
- Intake pill is labeled "Pre-visit intake" (not "Review intake data")

This entire flow is deterministic in the POC. For v1, the intent engine and reply engine will be replaced with LLM-based classification and generation — but the pill system, card architecture, and source provenance remain the same.
