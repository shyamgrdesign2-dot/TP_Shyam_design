# Dr. Agent — Interaction Logic & Scenario Playbook

> How pills work, how consultation flows, how the agent adapts to every scenario.
> Written so a non-technical person can understand every nuance.

---

## Part 1: The Consultation Flow (End-to-End)

### What Happens When a Doctor Opens a Patient

```
Step 1: Doctor clicks a patient → DrAgentPanel loads
Step 2: Patient data fetched → SmartSummaryData assembled
Step 3: Agent auto-sends 2 messages:
        Message 1: Symptom collector card (if intake data exists)
        Message 2: Patient summary card (always)
Step 4: Pills computed from patient data + phase "empty"
Step 5: Doctor starts interacting → phase transitions begin
```

### The 5 Consultation Phases

| Phase | What triggered it | What the doctor sees | What the agent suggests |
|-------|------------------|---------------------|------------------------|
| `empty` | Patient opened | Summary + intake cards | Patient summary, Vital trends, Lab overview, Last visit |
| `symptoms_entered` | Symptoms recorded in RxPad | — | Suggest DDX, Compare with last visit |
| `dx_accepted` | Diagnosis entered in RxPad | — | Suggest medications, Investigations, Draft advice |
| `meds_written` | Medications added to RxPad | — | Translate to regional, Plan follow-up |
| `near_complete` | Most RxPad sections filled | — | Completeness check, Visit summary |

**Key insight:** The agent watches the RxPad state. As the doctor fills sections, the phase transitions automatically and pills change accordingly. The doctor never manually sets the phase.

---

## Part 2: How Pills Work (Complete Logic)

### The Generation Pipeline

```
Patient data (vitals, labs, conditions, meds, allergies)
  +
Consultation phase (empty → symptoms → dx → meds → near_complete)
  +
Active sidebar tab (Lab Results, History, Past Visits, etc.)
       ↓
4-Layer Priority Engine
       ↓
Sorted + Deduplicated + Capped at 35
       ↓
Pill bar rendered below chat input
```

### What Each Layer Contributes

#### Layer 1: Safety Force (Priority 0-9)
These pills CANNOT be removed. They are always visible.

| Trigger condition | Pill shown | Tone |
|------------------|-----------|------|
| SpO2 < 90% | "Review SpO₂" | Critical (red) |
| Patient has allergies | "Allergy Alert" | Warning (amber) |

#### Layer 2: Clinical Flags (Priority 10-51)
These pills are triggered by abnormal or notable patient data.

**Lab-based pills:**
| Trigger | Pill |
|---------|------|
| labFlagCount > 0 | "13 lab values flagged" |
| missingTests exist | "5 missing tests" |
| overdueItems exist | "5 overdue items" |
| actionNeeded exist | "3 actions needed" |

**Vitals-based pills:**
| Trigger | Pill |
|---------|------|
| SpO2 declining trend | "SpO₂ trend declining" |
| BP abnormal | "BP needs attention" |

**Specialty pills (only if data exists):**
| Data present | Pill |
|-------------|------|
| obstetricData | "Obstetric summary" |
| gynecData | "Gynec summary" |
| pediatricsData | "Pediatric summary" |
| ophthalData | "Ophthal summary" |

**POMR problem pills (one per active problem):**
| pomrProblems entry | Pill |
|-------------------|------|
| CKD Stage 5 | "CKD Stage 5" |
| Hypertension | "Hypertension" |
| Type 2 Diabetes Mellitus | "Type 2 Diabetes Mellitus" |
| Anaemia of CKD | "Anaemia of CKD" |

**Chronic disease specialist pills:**
| Condition detected | Pills added |
|-------------------|-------------|
| CKD | Dialysis adequacy, Fluid & electrolytes, Bone mineral status, CV risk assessment |
| Diabetes | Glycemic control, Insulin adjustment |
| Anaemia | EPO dosing, Iron stores |
| 3+ problems | Polypharmacy review, Medication timeline |

**Cross-problem pills:**
| Trigger | Pill |
|---------|------|
| Drug interactions detected | "Drug interactions" |
| Pending records | "Pending records" |

#### Layer 3: Consultation Phase (Priority 30-58)
These pills change as the consultation progresses (see Phase table above).

**Always-available pills** (appended to every phase):
- Lab comparison
- Medication review
- Chronic conditions

**Data-aware suppression:**
- "Vital trends" only appears if vitals recorded
- "Lab comparison" only if previous labs exist
- "Last visit" only if patient has prior visits

#### Layer 4: Tab Lens (Priority 60-69)
| Active sidebar tab | Additional pills |
|-------------------|-----------------|
| Lab Results | Lab comparison, Annual panel |
| Past Visits | Compare visits, Recurrence check |
| History | Chronic conditions, Family history |
| Records | Pending records, Upload summary |

### Pill Tap → Response Flow

```
Doctor taps pill → PILL_INTENT_MAP lookup (deterministic)
       ↓
Intent resolved without NLU → Reply engine
       ↓
Reply engine generates card + text response
       ↓
Pills regenerated for new context
```

This bypass is critical: pill taps are INSTANT and RELIABLE. No keyword matching, no confidence scores, no false positives.

**Pill deduplication:** Pills corresponding to already-shown cards are filtered from the pill bar. `DrAgentPanel.tsx` tracks `shownCardKinds` and removes pills whose mapped card kind has already been rendered in the conversation (see `PILL_TO_CARD_KIND` mapping in `01-response-management-system.md`).

---

## Part 3: Response Formatting Nuances

### How Text Responses Are Formatted

Every text response follows these formatting rules:

| Element | How it's rendered | When used |
|---------|------------------|-----------|
| **##** heading | Large section title | Breaking response into sections |
| **###** subheading | Smaller section title | Sub-sections within a card |
| **Bold text** | Key terms, drug names | Emphasizing important information |
| *Italic text* | Narratives, quotes | Patient-reported data, clinical narratives |
| Bullet points | Lists | Symptoms, medications, side effects |
| Numbered lists | Sequences | Step-by-step procedures |
| `code blocks` | Values with units | Lab values, dosages |
| > Blockquotes | Clinical guidelines | Guideline citations |

### How Copy Works (Every Scenario)

| Context | Copy button location | What gets copied | Destination |
|---------|---------------------|-----------------|-------------|
| Card header | Top-right copy icon | Entire card content as text | Clipboard |
| Per-item (hover) | Right side of item row | Single item text | Clipboard |
| Per-section | Right side of section header | All items in section | RxPad section |
| SidebarLink CTA | Bottom of card | Selected items or all | RxPad |
| Per-med (protocol) | Right side of medication | Drug name + dosage + timing | Clipboard |
| Advice item | Right side of advice text | Single advice point | Clipboard |

**Copy feedback:** Brief "Copied" flash animation (200ms fade in, hold 1s, fade out).

### Insight Boxes — When and Why

| Variant | Color | When used |
|---------|-------|-----------|
| Red | #ef4444 bg | Cross-problem flags, critical clinical warnings |
| Amber | #f59e0b bg | Borderline findings, "needs attention" |
| Purple | #8b5cf6 bg | AI clinical insights, pattern recognition |
| Teal | #14b8a6 bg | Positive suggestions, "looking good" |

---

## Part 4: Scenario Playbook

### Scenario 1: New Patient, No History
```
Data: Empty EMR, no prior visits, no labs
Agent shows: "New patient. No prior clinical data available."
Pills: Pre-visit intake, Suggest DDX, Initial investigations, Ask anything
Interaction: Doctor enters symptoms → DDX suggested → Protocol meds → Advice
```

### Scenario 2: New Patient, With Intake Form
```
Data: Symptom collector data filled, no EMR history
Agent shows: Symptom collector card + minimal patient summary
Pills: Pre-visit intake, Suggest DDX, Compare with last visit (disabled)
Specialty: If intake mentions pregnancy → obstetric pills appear
```

### Scenario 3: Returning Patient, Routine Follow-Up
```
Data: Full EMR history, normal vitals, no flags
Agent shows: Patient summary (compact), last visit reference
Pills: Patient summary, Lab comparison, Vital trends, Last visit
Flow: Quick review → "Completeness check" → End visit
```

### Scenario 4: Returning Patient, CKD Multi-Morbidity (Ramesh)
```
Data: CKD Stage 5 + DM + HTN + Anaemia, 8 flagged labs, SpO2 declining
Agent shows: Symptom collector + patient summary (rich, cross-problem flags)
Pills: Allergy Alert (forced), 13 lab values flagged, SpO₂ declining, BP needs attention, CKD Stage 5, Hypertension, Type 2 DM, Anaemia, Dialysis adequacy, Fluid & electrolytes, Bone mineral status, CV risk, Glycemic control, Insulin adjustment, EPO dosing, Iron stores, Polypharmacy review, Drug interactions, 5 missing tests, 5 overdue items, 3 actions needed...
Source: EMR + Lab Results (8 results from 3 dates) + Records (3 uploaded) + Past Visit (02 Mar'26) + Symptom Collector (15 Mar'26)
```

### Scenario 5: Pregnant Patient (Obstetric)
```
Data: Obstetric history (G2P1L1), 32 weeks GA, ANC due
Agent shows: Patient summary with embedded obstetric box
Pills: Obstetric summary, ANC schedule, Vital trends, Vaccine status
Specialty pills: obstetric-specific
```

### Scenario 6: Pediatric Patient
```
Data: 3-year-old, growth data, vaccines overdue
Agent shows: Patient summary with embedded pediatric box
Pills: Pediatric summary, Vaccine schedule, Growth chart
Special: Weight-adjusted dosing in protocol meds
```

### Scenario 7: Document Upload (OCR)
```
Doctor uploads lab report PDF → Intent: document_analysis
Agent shows: OCR pathology card (extracted values, flagged vs normal)
Source: Records (uploaded document name, date)
Next pills: Compare with previous, Copy to Lab Results
```

### Scenario 8: Voice Dictation
```
Doctor dictates entire consultation → Intent: voice processing
Agent shows: Voice structured Rx card (parsed into sections)
Interaction: Per-section copy to RxPad + edit capability
```

### Scenario 9: Homepage (No Patient Selected)
```
Context: Clinic overview, no specific patient
Agent shows: Welcome card (stats: today's patients, follow-ups, revenue)
Pills: View queue, Follow-ups due, Revenue, Weekly KPIs, Send reminders
Cards available: patient_list, follow_up_list, revenue_bar, analytics_table, bulk_action
```

### Scenario 10: Patient Search (Homepage)
```
Doctor types: "Show me Neha's details"
Agent shows: Patient search card with search input + results
Doctor selects patient → Loads patient context → Transitions to consultation mode
```

### Scenario 11: Drug Interaction Detected
```
Doctor adds Metformin + (conflict drug) to RxPad
Agent interrupts: Drug interaction card (severity, risk, recommended action)
This card appears IMMEDIATELY — it jumps above normal flow
```

---

## Part 5: Specialty Handling Logic

### The Scalable Approach

```
Same data + Same cards + Different pills + Different framing = Scalable
```

| What changes per specialty | What stays the same |
|---------------------------|---------------------|
| Canned message text (pills) | Clinical data structure |
| Narrative framing (intro text) | Card components |
| Which pills appear | Intent classification |
| Emphasis in summary | Reply engine routing |

### How a GP Sees vs. a Nephrologist Sees

**Same patient (Ramesh, CKD Stage 5):**

| Aspect | GP View | Nephrologist View |
|--------|---------|-------------------|
| Summary narrative | "76M with multiple chronic conditions" | "76M with CKD Stage 5, needs renal assessment" |
| Specialty pills | General: Summary, Labs, Vitals | CKD-specific: Dialysis adequacy, Fluid & electrolytes, Bone mineral status |
| Lab emphasis | All flagged labs | Renal-specific labs highlighted |
| Treatment context | All medications | Renal-adjusted medications |

### Adding a New Specialty (Developer Guide)
1. Define specialty-specific pills in `pill-engine.ts` Layer 2
2. Add condition detection logic (e.g., "if patient has [condition]")
3. Add pill labels to `PILL_INTENT_MAP` in `intent-engine.ts`
4. Add response handlers in `reply-engine.ts`
5. No new card components needed — existing cards handle the data

---

## Part 6: Data Source & Trust System

### The Source Dropdown (How It Works)

Every AI response has a Source button. Opening it shows where data was compiled from.

**Rendering logic:**
```
Card output (kind + data) → getSourcesForOutput() → SourceEntry[]
       ↓
SourceDropdown (portal-based, viewport-aware)
       ↓
Opens on: click (toggle) or hover (200ms delay)
Closes on: outside click or hover leave (250ms grace)
```

**Source entry format:**
```
● EMR          Patient's EMR records
● Lab Results  8 results (3 dates)
● Records      3 uploaded records
● Past Visits  Consultation (02 Mar'26)
● Symptom Collector  Patient's reported data (15 Mar'26)
```

### How Source Maps to Sidebar Sections

| Source label | Sidebar section | What it means |
|-------------|-----------------|---------------|
| EMR | Patient chart | Structured clinical records |
| Lab Results | Lab Results tab | EMR lab orders (not uploaded reports) |
| Records | Records tab | Uploaded documents (even lab PDFs) |
| Past Visits | Past Visits tab | Previous consultation data |
| Symptom Collector | Pre-visit form | Patient-reported intake |
| History | History tab | Medical/family/social history |
| Obstetric | Obstetric tab | Obstetric-specific data |
| Gynec | Gynec tab | Gynecological data |
| Ophthal | Ophthal tab | Ophthalmology data |
| Growth | Growth tab | Pediatric growth data |
| Vaccine | Vaccine tab | Vaccination records |
| AI | — | AI-generated analysis |
| Protocol | — | Clinical guidelines used |

**Important distinction:** "Lab Results" ≠ "Records". Lab Results are EMR lab orders. Records are uploaded documents — even if those documents are lab reports (PDFs). This matches how the sidebar organizes data.

### Data Completeness Donut

| Where shown | Values | Why |
|-------------|--------|-----|
| POMR problem card header | EMR % / AI % / Missing % from actual data | Fixed expected data set — missing fields are clinically meaningful |
| SBAR critical | 70% EMR / 20% AI / 10% Missing (demo) | Emergency — shows data reliability |
| OCR extraction | 90% AI / 10% Missing (demo) | Document extraction — shows extraction coverage |

**Never shown on:** Patient summary, lab panel, vitals, DDX, protocol meds, advice, text responses.

---

## Part 7: Key Design Decisions & Reasoning

| Decision | Reasoning |
|----------|-----------|
| Pill deduplication by card kind | Once a card is shown, its pill is redundant — removing it reduces clutter and guides the doctor to unexplored actions |
| Max 35 pills | Chronic disease workflows generate many actionable items — scrollable pill bar accommodates this |
| Safety pills can't be displaced | A doctor must ALWAYS see allergy alerts and critical vital warnings |
| Phase-aware pills | Don't suggest "Plan follow-up" at consultation start — it's irrelevant then |
| Data-aware suppression | Don't show "Vital trends" if no vitals recorded — it would produce an error card |
| Pill bypass (no NLU) | Pills are hardcoded routes — zero latency, zero false positives |
| Tab lens pills | If doctor is on Lab Results tab, they're thinking about labs — surface lab-specific actions |
| POMR per-problem pills | One pill per chronic condition — doctor can drill into any problem independently |
| Specific term priority | "Dialysis adequacy" should give clinical text, NOT match "dialysis" as a POMR problem name |
| Completeness donut only on POMR | Most cards display whatever's available — showing completeness on them would always be "100% of available data" which is meaningless |
| Source maps to sidebar sections | Doctors navigate by sidebar tab — source labels should match their mental model |
| Specialty changes pills, not data | Data is structured per clinical guidelines regardless of viewer — only the framing changes |
| Copy-first workflow | Every data point should be one click away from the prescription — zero re-typing |
| No modal interruptions | AI operates in a side panel — never blocks the prescription flow |
| Divider character: pipe `\|` not `·` | All structural dividers use `\|` with `mx-[6px]` spacing for consistent visual separation |
| SectionTag icon: 12px | Standardized at 12px (not 10px) for visual consistency across all card sections |
| "Pre-visit intake" naming | Pill label is "Pre-visit intake" (not "Review intake data") to match the WelcomeScreen action label |

---

## Part 8: File Reference Map

| File | What it does |
|------|-------------|
| `intent-engine.ts` | Keyword → intent classification. Contains RULES array + PILL_INTENT_MAP |
| `pill-engine.ts` | 4-layer priority pipeline. Generates context-aware pills |
| `reply-engine.ts` | Intent + data → structured card output. 50+ query handlers |
| `homepage-pill-engine.ts` | Homepage-specific pills (operational mode) |
| `types.ts` | All TypeScript interfaces — RxAgentOutput union, card data types |
| `mock-data.ts` | Demo patient data for 8+ patients |
| `ChatBubble.tsx` | Renders each message — cards, text, source dropdown, feedback |
| `CardRenderer.tsx` | Routes output.kind → card component |
| `CardShell.tsx` | Universal card wrapper (header, body, actions, CTA) |
| `DrAgentPanel.tsx` | Main panel — manages state, chat thread, pill bar |
| `ChatThread.tsx` | Scrollable message list |
| `cards/` | All 50+ card components organized by family |
| `docs/` | This documentation directory |
