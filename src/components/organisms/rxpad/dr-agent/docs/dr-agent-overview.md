# Dr. Agent — Product Overview

## What is Dr. Agent?

Dr. Agent is an **AI co-pilot for doctors** embedded directly into the TatvaPractice EMR. It runs alongside the prescription pad (RxPad) during patient consultations, surfacing the right clinical context at the right time — so the doctor spends less time navigating screens and more time treating patients.

### Entry Points

Dr. Agent is accessible from **three entry points** across the product:

| Entry Point | Where | Behavior |
|-------------|-------|----------|
| **RxPad Panel** | Inside the prescription pad (right sidebar) | Full agent experience during active consultation |
| **Patient Details Page** | Patient profile → Dr. Agent FAB button | Same agent panel, pre-loaded with that patient's context |
| **Homepage** | Clinic overview dashboard | Operational mode — schedule, follow-ups, analytics |

All three entry points render the **same `DrAgentPanel` component** — ensuring a consistent experience regardless of where the doctor accesses it.

#### Canned action smart priority system

The WelcomeScreen uses a smart priority system to pick the best 4 canned action cards from 5 candidates based on available patient data:

| Candidate | Title | When available |
|-----------|-------|---------------|
| **Intake** | "Details from patient" | Only when symptom collector data exists (patient filled pre-visit form) |
| **Summary** | "Patient summary" | Always available |
| **Medical history** (canned action) | "Medical history" | Always available (past visits, prescriptions, treatment history). Patient Summary section: **Medical History** `SectionSummaryBar` + semibold slate-400 row labels. |
| **Specialty** | Varies by specialty | Only when specialty data exists (obstetric / gynec / pediatric / ophthal) |
| **Vitals** | "Today's vitals" | Always available as fallback |

Selection rules (pick 4):
- **With intake + with specialty**: Details from patient → Patient summary → Medical history → [Specialty] history
- **With intake + no specialty**: Details from patient → Patient summary → Medical history → Today's vitals
- **Without intake + with specialty**: Patient summary → Medical history → [Specialty] history → Today's vitals
- **Without intake + no specialty**: Patient summary → Medical history → Today's vitals → Past visit details

This logic lives in `buildPatientActions()` (WelcomeScreen component).

### How It Interfaces with the Product

```
Doctor Action → Dr. Agent Response → RxPad Integration
```

1. **Agent → UI**: AI generates structured outputs (cards, tables, charts) that render natively in the EMR
2. **UI → Agent**: Doctor interactions (tapping pills, clicking sidebar icons, copying to RxPad) feed context back to the agent
3. **Copy-to-RxPad**: Every data point the agent surfaces can be copied to the prescription with one click — symptoms, diagnoses, medications, investigations, advice

The doctor never leaves their workflow. AI intelligence is woven into the clinical interface itself.

---

## Clinical Research & Structuring Principles

### How Doctors Spend Their Consultation Time

Through studying real consultation patterns, we identified how doctors actually spend their time during a patient encounter:

| Activity | Time Spent | What the Doctor Does |
|----------|-----------|---------------------|
| **Context gathering** | ~30% | Reading past records, understanding history, reviewing labs |
| **Clinical assessment** | ~25% | Examining patient, correlating symptoms with findings |
| **Decision making** | ~20% | Choosing diagnosis, selecting medications, ordering tests |
| **Documentation** | ~15% | Writing prescriptions, entering data into EMR |
| **Patient communication** | ~10% | Explaining diagnosis, giving advice, planning follow-up |

Dr. Agent targets the **context gathering** and **documentation** phases — the two biggest time sinks that don't require clinical judgment.

### Clinical Structuring Protocols

We follow two established clinical frameworks to organize how patient data is presented and how cards are structured:

#### SBAR (Situation → Background → Assessment → Recommendation)

SBAR is a clinical communication protocol originally developed for nursing handoffs. We use it as a **conceptual layout principle** — not as literal labels, but as the ordering logic for how patient data flows:

| SBAR Element | What It Maps To | Example in Dr. Agent |
|-------------|-----------------|---------------------|
| **Situation** | Why the patient is here today | Short context line at top of Patient Summary card |
| **Background** | Medical history, chronic conditions, allergies | **Medical History** section (● rows; standard section bar; semibold slate-400 category labels) |
| **Assessment** | Current clinical findings | Key Labs with flags, chronic condition status |
| **Recommendation** | What needs attention now | Today's Vitals with abnormal highlighting |

The Patient Summary card arranges its sections in this order. Other cards follow similar logic — always leading with context before presenting actionable data.

#### POMR (Problem-Oriented Medical Record)

For patients with multiple chronic conditions (e.g., CKD + Diabetes + Hypertension), we use a **problem-oriented** approach:

- Each active problem gets its own **POMR Problem Card** showing relevant labs, medications, and missing data
- A **data completeness donut** shows how much of the expected data set is available (EMR vs. AI-extracted vs. missing)
- **Cross-problem flags** surface drug interactions and conflicting treatments across problems

POMR cards are the only cards that show the completeness donut, because they have a **fixed expected data set** — unlike summary or trend cards that simply display whatever data is available.

---

## Feature Set

### 1. Patient Context Intelligence
- Auto-loads patient summary when consultation begins
- Surfaces chronic conditions, active medications, allergies, and key labs
- Highlights abnormal vitals with clinical severity flags
- Shows patient-reported symptom data from the Visit app's symptom collector
- Data provenance indicators (green dot = EMR, amber dot = AI-extracted)

### 2. Specialty-Aware Consultation
- Supports GP, Gynecology, Ophthalmology, Obstetrics, and Pediatrics
- Specialty switch auto-loads relevant patient context and card types
- Embedded specialty boxes within the Patient Summary card for quick reference

### 3. Smart Card System (45+ card types)
- **Summary cards**: Patient summary, patient-reported intake, last visit, specialty summaries
- **Data cards**: Today's vitals, lab panels, lab comparisons, medication history, timelines
- **Action cards**: DDX generation, protocol meds, investigation suggestions, advice drafts
- **Clinical cards**: POMR problem cards with completeness donut and cross-problem flags
- **Utility cards**: Completeness checker, clinical guidelines, translation, referral
- **Safety cards**: Drug interaction alerts, allergy conflict alerts
- **Homepage cards**: Schedule overview, analytics, revenue, follow-up lists

### 4. Contextual Prompt System (Canned Pills)
- **4-layer priority pipeline**: Safety → Clinical Flags → Consultation Phase → Tab Lens
- Phase-aware suggestions change as the consultation progresses
- CKD/chronic disease pills surface when relevant problems are detected
- Up to 35 pills computed, deduplicated, and prioritized per context

### 5. Voice-to-Structured-Rx
- Dictate an entire consultation via voice
- AI parses voice into structured RxPad fields with one-click acceptance

### 6. Document Intelligence (OCR)
- Upload pathology reports, prescriptions, or medical records
- AI extracts structured data for review before copying to RxPad

### 7. Data Completeness & Provenance
- **Donut chart**: Shows EMR/AI-extracted/missing data ratios on POMR problem cards
- **Provenance dots**: Green (EMR) and amber (AI-extracted) indicators on lab values
- Only shown on cards with fixed expected data sets where missing data is clinically meaningful

---

## UX Design Principles

1. **Minimal cognitive load**: Cards are compact, collapsible, and scannable
2. **Copy-first workflow**: Every data point can be copied to RxPad with one click
3. **No modal interruptions**: AI operates in a side panel, never blocks the prescription flow
4. **Progressive disclosure**: Start with summary, drill down on demand
5. **Hover-to-discover**: AI trigger icons appear on hover, reducing visual clutter
6. **Trust indicators**: AI outputs are labeled with verification reminders
7. **SBAR-ordered content**: Patient data follows Situation → Background → Assessment → Recommendation flow
8. **Provenance transparency**: Doctors can see whether data came from EMR or AI extraction
9. **No uppercase headings**: All labels and headings use sentence case — never uppercase or all-caps
10. **Consistent patient context**: Patient chip in the input box is always a non-clickable reference tag; patient switching happens via the floating chip at the top of the chat area, which opens the "Select Chat Context" bottom sheet
11. **TP design system compliance**: All fonts follow the TP scale — 14px for normal text, 12-13px for secondary, 18px max for greetings. Dividers between gender and age use a lighter color (`#D0D5DD`) separator. Patient metadata shows gender / age / phone number.
12. **Radio selection pattern**: The patient selector bottom sheet uses radio buttons (not checkmarks) to indicate the selected patient, placed beside a square avatar icon (rounded-[10px])
13. **Breathing space**: All cards, lists, and interactive elements have generous padding and spacing to feel tappable and readable

---

## Technical Architecture

- **Frontend**: Next.js + React, styled with Tailwind CSS + TP design tokens
- **Card system**: 45+ card types rendered via a unified `CardRenderer`
- **Intent engine**: Classifies doctor queries into card-type responses (keyword-based, ready for LLM)
- **Phase engine**: Tracks consultation progress (empty → symptoms → dx → meds → complete)
- **Pill engine**: 4-layer priority pipeline generating context-aware prompt suggestions
- **Reply engine**: Maps intents + patient data to structured responses
- **RxPad sync**: Bidirectional context via React context (`useRxPadSync`)
- **Patient selector**: Shared `PatientSelector` bottom sheet component — supports custom title prop, radio-button selection, circular avatars, gender/age/phone metadata
- **Shared arrow indicators**: `shared/FlagArrow.tsx` (8×8 SVG triangle for abnormal values, always red) and `shared/DirectionArrow.tsx` (10×10 SVG for trend direction — red/green/gray). All cards use these shared components for consistent flag display.

---

## What's Next (v1 Roadmap)

- Live LLM integration replacing mock engines
- Real-time symptom collector integration with Visit app
- Multi-language advice translation
- Drug interaction checking with evidence citations
- Clinical decision support with guideline references
- Cross-patient analytics and population health insights
