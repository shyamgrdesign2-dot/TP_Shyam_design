# Patient Summary — Data Permutations & Structuring

## Overview

The Patient Summary card is the most complex card in the system. Its content is entirely driven by available data — and the data availability varies wildly across patients. This document defines every permutation, what gets shown, what gets hidden, and what fallback text to use.

---

## 1. Data Availability Matrix

### 8 Demo Patients vs Data Signals

| Signal | Shyam GR | Neha G | Anjali P | Vikram S | Priya R | Arjun S | Lakshmi K | Ramesh M | Suresh N |
|--------|----------|--------|----------|----------|---------|---------|-----------|----------|----------|
| **Symptom Collector** | Yes | **No** | Yes | Yes | Yes | Yes | Yes | Yes | **No** |
| **Vitals (today)** | Yes (critical) | Yes (normal) | Yes (normal) | Yes (borderline) | Yes (borderline) | Yes (mild) | Yes (normal) | **No** | Yes (normal) |
| **Lab Flags** | 7 | 2 | 1 | 3 | 2 | 0 | 3 | 0 | 2 |
| **Last Visit** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **No** | Yes |
| **Chronic Conditions** | Yes (2) | Yes (2) | Yes (1) | Yes (3) | Yes (1) | **No** | Yes (3) | **No** | Yes (3) |
| **Active Meds** | Yes (2) | Yes (4) | Yes (3) | Yes (4) | Yes (3) | Yes (2) | Yes (3) | Yes (2) | Yes (4) |
| **Allergies** | Yes (3) | Yes (2) | **No** | Yes (1) | Yes (1) | **No** | Yes (1) | Yes (1) | Yes (1) |
| **Family History** | Yes | Yes | **No** | Yes | Yes | Yes | Yes | **No** | Yes |
| **Specialty Data** | — | — | Gynec+Ophthal | Ophthal | Obstetric | Pediatric | Gynec | — | — |
| **Follow-up Overdue** | 5d | 3d | 0 | 12d | 0 | 0 | 0 | 0 | 0 |
| **Is New Patient** | No | No | No | No | No | No | No | **Yes** | No |
| **Concern Trend** | SpO2 ↓ | SpO2 ↓ | — | — | — | — | — | — | LDL ↓ |

---

## 2. Four Fundamental Permutations

### P1: New Patient, No History, Symptoms Only (`apt-zerodata` — Ramesh M)

**Available:** Symptom collector data only (self-reported symptoms, self-declared allergies, self-declared meds)
**Missing:** Vitals, labs, last visit, chronic conditions, family history, concern trends

**Patient Summary Structure:**
```
┌─ Patient Summary ─────────────────────────────────────┐
│                                                        │
│  🏷️ General Medicine (First Visit)                     │
│                                                        │
│  📋 "New patient. No prior clinical data available."    │
│                                                        │
│  ♦ Symptom Reports                                     │
│    • Knee Pain (1 week, moderate)                      │
│    • Morning Stiffness (3 days, mild)                  │
│                                                        │
│  ♦ Self-Declared Allergies                             │
│    Sulfonamides                                        │
│                                                        │
│  ♦ Current Medications (self-reported)                 │
│    Vitamin D3 60K weekly, Calcium 500mg daily          │
│                                                        │
│  ♦ Medical History (self-reported)                     │
│    Childhood asthma (resolved), Appendectomy 2018      │
│                                                        │
│  [No vitals section — not taken yet]                   │
│  [No labs section — none available]                    │
│  [No concern trend — no historical data]               │
│                                                        │
│  Pills: Pre-visit intake, Suggest DDX, Initial workup     │
└────────────────────────────────────────────────────────┘
```

**Agent intro text:** "This is Ramesh M's first visit. I don't have any prior clinical records. Here's what he reported during intake."

**Key rules:**
- Show "First Visit" badge or "New Patient" tag
- Symptom collector data is the PRIMARY content
- Mark all self-reported data as "(self-reported)" since it's unverified
- Do NOT show empty sections (no "Vitals: —", no "Labs: —")
- Canned pills focus on initial workup

---

### P2: Returning Patient, History Only, No Symptoms (`reg-suresh` — Suresh Nair)

**Available:** Full history (vitals, labs, last visit, chronic conditions, meds, allergies, family history, concern trend)
**Missing:** Symptom collector data (patient did not fill intake form)

**Patient Summary Structure:**
```
┌─ Patient Summary ─────────────────────────────────────┐
│                                                        │
│  🏷️ General Medicine, Cardiology                       │
│  ⚠️ Follow-up: On schedule                              │
│                                                        │
│  📋 "58M with stable IHD post-angioplasty, controlled  │
│     HTN. No new symptoms reported today."               │
│                                                        │
│  ♦ Today's Vitals                                      │
│    BP: 132/84 | Pulse: 74 | SpO2: 98% | Wt: 76kg      │
│                                                        │
│  ♦ Key Labs (2 flagged)                                │
│    ↑ LDL: 118 mg/dL (ref <100)                         │
│    ↑ Triglycerides: 178 mg/dL (ref <150)               │
│                                                        │
│  ♦ Chronic Conditions                                  │
│    IHD (2024), HTN (5yr), Dyslipidemia (3yr)           │
│                                                        │
│  ♦ Active Medications (4)                              │
│    Clopidogrel 75mg, Atorvastatin 40mg, ...            │
│                                                        │
│  ♦ Allergies                                           │
│    Aspirin (GI intolerance)                            │
│                                                        │
│  ♦ Concern Trend: LDL ↓ (improving)                   │
│    142 → 128 → 118                                     │
│                                                        │
│  [No Symptom Reports section — intake not filled]      │
│                                                        │
│  Pills: Patient summary, Lab overview, Last visit      │
└────────────────────────────────────────────────────────┘
```

**Agent intro text:** "Suresh Nair is here for a follow-up. He hasn't filled the symptom collector today. Here's his clinical snapshot from available records."

**Key rules:**
- Do NOT show "Symptom Reports" section at all
- Narrative acknowledges "No new symptoms reported today"
- Historical data is the PRIMARY content
- All sections populated from SmartSummaryData
- Canned pills focus on review and comparison (not intake)

---

### P3: Returning Patient, Both Symptoms + History (`__patient__` — Shyam GR)

**Available:** Everything — symptoms, vitals, labs, history, meds, allergies, family history, trends
**This is the richest state.**

**Patient Summary Structure:**
```
┌─ Patient Summary ─────────────────────────────────────┐
│                                                        │
│  🏷️ General Medicine, Diabetology                      │
│  ⚠️ Follow-up overdue: 5 days                           │
│                                                        │
│  📋 "25M with DM + HTN presenting with fever 3d,       │
│     dry cough 2d. Critical BP 70/60, SpO2 93%."        │
│                                                        │
│  ♦ Today's Vitals (with flags)                         │
│    BP: ⚠️70/60 | Pulse: 78 | SpO2: ⚠️93% | Temp: ⚠️104°F│
│                                                        │
│  ♦ Key Labs (7 flagged)                                │
│    ↑ HbA1c: 8.1% | ↑ FBS: 168 | ↑ TSH: 5.8 | ...     │
│                                                        │
│  ♦ Symptom Reports (from intake)                       │
│    • Fever (3d, high, evening spikes)                  │
│    • Dry Cough (2d, moderate)                          │
│                                                        │
│  ♦ Chronic Conditions                                  │
│    Diabetes (1yr), Hypertension (6mo)                  │
│                                                        │
│  ♦ Active Medications                                  │
│    Telma20, Metsmail 500                               │
│                                                        │
│  ♦ Allergies                                           │
│    Dust, Egg, Prawns                                   │
│                                                        │
│  ♦ Family History                                      │
│    Thyroid (Mom, Aunt), Diabetes (Father)              │
│                                                        │
│  ♦ Concern Trend: SpO2 ↓ (declining)                  │
│    97 → 96 → 94 → 93                                  │
│                                                        │
│  Pills: Review SpO2, Allergy Alert, Suggest DDX        │
└────────────────────────────────────────────────────────┘
```

**Agent intro text:** "Shyam GR is back with fever and cough. Vitals are concerning — BP 70/60, SpO2 93%. He has 7 flagged labs and a declining SpO2 trend."

**Key rules:**
- Vitals shown with flag icons for abnormals
- Symptoms from collector are integrated alongside clinical data
- Concern trend is prominent when declining
- Safety pills (SpO2, Allergy) take priority
- Narrative weaves acute + chronic together

---

### P4: Returning Patient, Symptoms + No Significant History (`apt-arjun` — Arjun S, 4y)

**Available:** Symptoms, vitals, pediatric growth data
**Limited:** No flagged labs, no chronic conditions, minimal history

**Patient Summary Structure:**
```
┌─ Patient Summary ─────────────────────────────────────┐
│                                                        │
│  🏷️ Pediatrics                                         │
│                                                        │
│  📋 "4M with dry cough 3d, reduced appetite 1w.        │
│     Weight 14kg (15th percentile — below expected)."    │
│                                                        │
│  ♦ Today's Vitals                                      │
│    BP: 90/60 | Pulse: 110 | Temp: 99.2°F               │
│                                                        │
│  ♦ Symptom Reports                                     │
│    • Dry Cough (3 days)                                │
│    • Reduced Appetite (1 week)                         │
│                                                        │
│  ♦ Growth                                              │
│    Weight: 14kg (15th %ile), Height: 98cm (25th %ile)  │
│                                                        │
│  ♦ Milestones                                          │
│    Walking (age-appropriate), Speech: 2-word only ⚠️    │
│                                                        │
│  ♦ Vaccines                                            │
│    MMR-2 overdue, 1 pending                            │
│                                                        │
│  [No labs section — none flagged]                      │
│  [No chronic conditions]                               │
│                                                        │
│  Pills: Growth & vaccines, Suggest DDX                  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Section Visibility Rules

| Section | Show When | Hide When |
|---------|-----------|-----------|
| Specialty Tags | Always (even if empty — show "General Medicine") | Never hidden |
| Follow-up Overdue | `followUpOverdueDays > 0` | `followUpOverdueDays === 0` or new patient |
| Patient Narrative | Always (generated from available data) | Never hidden |
| Today's Vitals | `todayVitals` exists and has at least 1 value | No vitals taken today |
| Key Labs | `keyLabs.length > 0` | No flagged labs |
| Symptom Reports | `symptomCollectorData` exists | Patient didn't fill collector |
| Chronic Conditions | `chronicConditions.length > 0` | New patient or no conditions |
| Active Medications | `activeMeds.length > 0` | No active meds |
| Allergies | `allergies.length > 0` | No known allergies |
| Family History | `familyHistory.length > 0` | Not available |
| Lifestyle Notes | `lifestyleNotes.length > 0` | Not available |
| Concern Trend | `concernTrend` exists | No trend data |
| Due Alerts | `dueAlerts.length > 0` | No pending items |
| Record Alerts | `recordAlerts.length > 0` | No record issues |
| Obstetric Data | `obstetricData` exists | Not obstetric patient |
| Gynec Data | `gynecData` exists | Not gynec patient |
| Pediatric Data | `pediatricsData` exists | Not pediatric patient |
| Ophthal Data | `ophthalData` exists | Not ophthal patient |

---

## 4. Agent Intro Text Patterns

The agent generates a text message ABOVE the patient summary card. This text adapts to the available data:

### Pattern: New Patient, No History
```
"This is [Name]'s first visit. No prior clinical records are available.
Here's what [he/she] reported during intake."
```
Followed by: `patient_summary` card (P1 layout)

### Pattern: Returning Patient, No Intake
```
"[Name] is here today. [He/She] hasn't filled the symptom collector.
Here's [his/her] clinical snapshot from available records."
```
Followed by: `patient_summary` card (P2 layout)

### Pattern: Returning Patient, With Intake + Critical Vitals
```
"[Name] is back with [primary symptom]. Vitals are concerning — [flagged vitals].
[He/She] has [N] flagged labs and [trend description]."
```
Followed by: `patient_summary` card (P3 layout)

### Pattern: Returning Patient, With Intake + Normal Vitals
```
"[Name] presents with [primary symptom]. Vitals are within normal range.
[Context: overdue follow-up / flagged labs / specialty note]."
```
Followed by: `patient_summary` card (P3/P4 layout)

### Pattern: Returning Patient, Routine Follow-up
```
"[Name] is here for a routine follow-up. Last visit was [date].
[Summary of what was done last time and what's due]."
```
Followed by: `patient_summary` card (P2 layout)

---

## 5. Short Summary vs Full Summary

### Short Summary (used in: Patient tooltip, appointment card preview)

One-liner format: `"[Conditions] patient, on [key meds], last visited [date] with [chief complaint], [key finding]."`

Generated from: `patientNarrative` + `chronicConditions[0..2]` + `activeMeds[0..2]` + `lastVisit.date` + `lastVisit.diagnosis`

**SBAR alignment note:** The `patientNarrative` field is now the primary source for the SBAR Overview Card's Situation line (Priority 1), ensuring the tooltip summary shown on the appointment queue hover matches the Situation text inside the consultation. This creates a consistent experience as the doctor transitions from queue to consult. See `sbar-overview-card-spec.md` Section 3 for the full priority chain.

**If no history:** `"New patient with [self-reported symptoms]. [Allergy note]."`
**If no symptoms:** `"Returning patient with [conditions]. Last visit [date], [diagnosis]."`

### Full Summary (used in: patient_summary card)

Multi-section card with all available data. See Section 2 for layouts.

---

## 5A. Patient Tooltip Summary — Structure & Formulation

### Overview

On the appointment listing page, hovering over the AI icon shows a **short patient summary tooltip** (`AiPatientTooltip`). This is a concise, one-paragraph clinical snapshot designed for quick context before the doctor opens the consult. The tooltip is tab-aware — queue tab shows clinical summary text, while other tabs (finished, cancelled, draft, pending-digitisation) show structured data.

### Component Architecture

```
AiPatientTooltip (portal-based)
├── Heading: "Patient Summary" (text only, no icon)
├── Content: tab-aware rendering
│   ├── Queue tab → summary text with clinical highlighting (from PATIENT_TOOLTIP_SUMMARIES)
│   ├── Finished tab → structured: Came for, Diagnosed, Prescribed, Ordered, Follow-up
│   ├── Cancelled tab → structured: Reason, Cancelled at, Notes
│   ├── Draft tab → checklist: Symptoms, Diagnosis, Medications, Advice, Investigations, Follow-up
│   └── Pending Digitisation → structured: Admitted, Status, Pending items
└── CTA: "View Detailed Summary" (secondary button, outline + AI gradient text)
       → triggers auto-message in Dr. Agent chat
```

### Queue Tab — Summary Text Formula

The `PATIENT_TOOLTIP_SUMMARIES` record stores pre-generated one-liner summaries keyed by patient ID. In production, these would be AI-generated from the patient's `SmartSummaryData`. The formula varies by data availability:

#### Formula A: Returning Patient + Symptoms + History (richest)

**Template:**
```
"Patient with {chronicConditions[0..2]}, on {activeMeds[0..2]},
 last visited on {lastVisit.date} with {lastVisit.symptoms},
 diagnosed {lastVisit.diagnosis},
 suggested {activeMeds[0..1] or suggestedMeds}."
```

**Data sources:**
- `chronicConditions` → first 2-3 conditions with duration
- `activeMeds` → first 2-3 key medications with dosage
- `lastVisit.date` → formatted as "DD Mon'YY"
- `lastVisit.symptoms` → chief complaints (shortened)
- `lastVisit.diagnosis` → primary + secondary diagnoses
- `symptomCollectorData.suggestedMeds` → fallback for suggested meds

**Example (Shyam GR):**
> "Patient with Hypertension 3yr and Diabetes Mellitus 2yr, on Telma 20mg, last visited on 27 Jan'26 with fever, diagnosed Viral fever and Conjunctivitis, suggested Paracetamol 650mg and Azithromycin 500mg."

#### Formula B: Returning Patient + History Only (no symptom collector)

**Template:**
```
"Patient with {chronicConditions[0..2]}, on {activeMeds[0..2]},
 last visited {lastVisit.date}, {lastVisit.diagnosis},
 {concernTrend or keyLabs highlight}."
```

**Data sources:**
- Same as Formula A but without `symptomCollectorData`
- `concernTrend` → if declining trend exists, append metric + value
- `keyLabs` → fallback: mention highest-priority flagged lab

**Example (Neha Gupta — no symptom collector):**
> "Patient with Bronchial Asthma since childhood and Hypothyroidism 3yr, on Budecort 200mcg and Thyronorm 50mcg, last visited 18 Feb'26 with nocturnal cough, diagnosed Acute exacerbation of asthma, SpO2 trending down (96%)."

**Example (Suresh Nair — no symptom collector):**
> "Patient with IHD post-angioplasty (2024), HTN 5yr, on Clopidogrel 75mg, Atorvastatin 40mg, last visited 10 Feb'26, stable IHD, LDL 118 (above target)."

#### Formula C: New Patient + Symptoms Only (no history)

**Template:**
```
"New patient with {symptoms[0..2]} {duration}.
 Allergy: {allergies}. On {currentMedications[0..2]}."
```

**Data sources:**
- `symptomCollectorData.symptoms` → first 2-3 symptoms with duration
- `symptomCollectorData.allergies` → self-reported allergies
- `symptomCollectorData.currentMedications` → self-reported current meds

**Example (Ramesh M):**
> "New patient with Knee Pain and Morning Stiffness 1 week. Allergy: Sulfonamides, on Vit D3 60K (weekly)."

#### Formula D: No Data Available

**Template:**
```
"New patient. No prior clinical data or symptom reports available."
```

This case occurs when a walk-in patient has neither filled the symptom collector NOR has any historical records. The tooltip should still be shown but with minimal text.

### Data Availability → Formula Mapping

| Has History | Has Symptom Collector | Formula | Example Patient |
|-------------|----------------------|---------|-----------------|
| Yes | Yes | A (richest) | Shyam GR, Anjali, Vikram, Priya, Arjun, Lakshmi |
| Yes | No | B (history-only) | Neha Gupta, Suresh Nair |
| No | Yes | C (symptoms-only) | Ramesh M |
| No | No | D (minimal) | (theoretical — no demo patient) |

### Text Highlighting

The `highlightClinicalText()` function (in `shared/highlightClinicalText.tsx`) applies a two-tier highlight system:

**PRIMARY patterns (semibold, dark `tp-slate-700`):**
- **Conditions:** Hypertension, Type 2 Diabetes, CKD Stage N, Dyslipidemia, Hypothyroidism, Migraine, URTI, Acute URTI, Bronchial Asthma, IHD, Conjunctivitis, Viral Fever, Fibroid Uterus, Iron Deficiency Anemia, AUB-Ovulatory Dysfunction, Stable Angina, Reactive Airways, and 30+ more
- **Medications:** Metformin, Telma, Paracetamol, Azithromycin, Sumatriptan, Vitamin D, Thyronorm, Folic Acid, Amoxicillin, Salbutamol, Clopidogrel, Atorvastatin, Budecort, Sulfonamides, and 25+ more (with optional numeric dose suffixes)
- **Lab values:** HbA1c, eGFR, Hb, Creatinine, TSH, LDL, K+ (with numeric values and units)
- **Vitals:** BP, SpO₂, Pulse, HR (with numeric values)
- **Clinical events:** "N ER admissions", "fluid overload", pregnancy notation (G#P#), follow-up overdue

**SECONDARY patterns (normal weight, muted `tp-slate-400`):**
- Parenthetical content only: `(2yr)`, `(childhood)`, `(2024)`, `(resolved)`

**Merge logic:** Primary wins over secondary when overlapping. This ensures a medication name inside parentheses is still highlighted dark.

### Symptom Collector Icon on Appointment Page

The appointment listing shows a green virus icon (`hasSymptoms: true`) next to the visit type ONLY for patients who have filled the symptom collector (i.e., have `symptomCollectorData` in their mock data). This icon:
- Indicates pre-visit intake data is available
- Has tooltip: "Symptoms collected — Click to view"
- Clicking opens Dr. Agent panel for that patient

**Consistency rule:** `hasSymptoms === true` on the appointment row ↔ `symptomCollectorData` exists in `SMART_SUMMARY_BY_CONTEXT`. If the icon is absent, opening Dr. Agent shows Patient Summary directly (not Patient Reported card).

### Production AI Integration Notes

In production, the tooltip summary would be generated by an AI model with this structured prompt:

```
Given the following patient data, generate a concise one-paragraph clinical summary
(max 2 sentences, under 200 characters) for a doctor's quick reference tooltip.

Input schema:
- chronicConditions: string[]     // e.g. ["Hypertension (3yr)", "Diabetes (1yr)"]
- activeMeds: string[]            // e.g. ["Telma20 1-0-0-1", "Metsmail 500"]
- lastVisit: { date, symptoms, diagnosis }
- keyLabs: { name, value, flag }[]
- concernTrend: { label, values, tone }
- symptomCollectorData?: { symptoms, allergies, currentMedications }
- isNewPatient: boolean

Rules:
1. Lead with chronic conditions if returning patient, or "New patient" if first visit
2. Include 1-2 key medications
3. Reference last visit date and primary diagnosis
4. If concern trend exists, mention it last
5. Bold-worthy terms: condition names, medication names, dates
6. Do NOT include patient name (shown separately in UI)
```

---

## 6. Homepage Intro Message Structure

When the doctor opens the homepage (no patient selected), the agent shows:

1. **Text intro** (chat bubble): Greeting + daily context
   ```
   "Good morning, Dr. Sharma! You have [N] patients queued today.
   [N] follow-ups are overdue — [names].
   [Patient name] has [N] new flagged lab values since last visit.
   [N] draft prescriptions are pending your review."
   ```

2. **Welcome Card**: Today's schedule with neutral stat boxes (Queued, Follow-ups, Drafts, Finished)

3. **Canned Pills**: View Queue, Pending follow-ups, Revenue overview, Review drafts

---

## 7. Patient Scenarios Coverage

| Permutation | Patient | Key Demonstration |
|-------------|---------|-------------------|
| New + Symptoms + No History | Ramesh M (apt-zerodata) | First-time patient, intake-only data |
| Returning + Symptoms + Full History + Critical Vitals | Shyam GR (__patient__) | Richest state, all sections populated |
| **Returning + No Symptoms + Full History (Today's Queue)** | **Neha G (apt-neha)** | **No intake → Patient Summary shown directly, no symptom icon** |
| Returning + Symptoms + History + Specialty (Obstetric) | Priya R (apt-priya) | Obstetric overlay on GP summary |
| Returning + Symptoms + History + Specialty (Pediatric) | Arjun S (apt-arjun) | Growth/vaccine overlay, no labs |
| Returning + Symptoms + History + Specialty (Gynec) | Lakshmi K (apt-lakshmi) | Gynec overlay, anemia management |
| Returning + Symptoms + History + Multi-specialty | Anjali P (apt-anjali) | Ophthalmology + Gynec on GP base |
| Returning + Symptoms + History + Overdue Follow-up | Vikram S (apt-vikram) | Metabolic syndrome, risk stratification |
| **Returning + No Symptoms + Full History (Registered)** | **Suresh N (reg-suresh)** | **History-only workflow, registered patient** |

---

## 8. SBAR Overview Card (`sbar_overview`) Handling Per Permutation

The `sbar_overview` card is the primary summary shown when a doctor asks for "Patient Summary". It renders using the same `SmartSummaryData` but presents it in SBAR sections. Each section is independently shown/hidden based on data availability.

### P1: New Patient, No History

| Section | Shown? | Content |
|---------|--------|---------|
| **S (Situation)** | Yes | "New patient, no prior clinical data available." |
| **B (Background)** | Hidden | No conditions, no allergies, no meds |
| **A (Assessment)** | Hidden | No vitals, no labs |
| **Last Visit** | Hidden | No prior visits |
| **R (Recommendation)** | Hidden | No actionable items |

### P2: Returning, History Only (No Intake)

| Section | Shown? | Content |
|---------|--------|---------|
| **S (Situation)** | Yes | Composed from chronic conditions + current meds + last visit date |
| **B (Background)** | Yes | Conditions, allergies, active meds (max 6) |
| **A (Assessment)** | Conditional | Vitals if recorded today; Labs if available |
| **Last Visit** | Yes | Date, diagnosis, symptoms from previous visit |
| **R (Recommendation)** | Conditional | Follow-up overdue, critical vitals, due alerts |

### P3: Returning, Full Data (History + Intake)

| Section | Shown? | Content |
|---------|--------|---------|
| **S (Situation)** | Yes | Composed from symptoms + chronic conditions + drug allergies + meds + last visit |
| **B (Background)** | Yes | Full: Conditions, allergies (with drug allergies), active meds |
| **A (Assessment)** | Yes | Today's vitals with flags + key labs with indicators |
| **Last Visit** | Yes | Full previous visit context |
| **R (Recommendation)** | Yes | All applicable: overdue follow-up, critical vitals, due alerts, cross-problem flags |

### P4: Limited History (Partial Data)

| Section | Shown? | Content |
|---------|--------|---------|
| **S (Situation)** | Yes | Whatever is available (may be 1 sentence) |
| **B (Background)** | Partial | Only sub-sections with data (e.g., meds but no allergies) |
| **A (Assessment)** | Partial | Vitals or labs (whichever is available) |
| **Last Visit** | Conditional | Only if prior visit exists |
| **R (Recommendation)** | Conditional | Only critical items |

### Key Rule
Each section is hidden entirely if it has no data. No placeholder dashes, no "N/A" values, no empty labels. The card gracefully degrades from 5 sections (richest) to 1 section (Situation only for new patients).

---

## 9. Complete Patient Summary Card — Section-by-Section Reference

This section documents every part of the Patient Summary card system in detail: what data is displayed, where it comes from, how concerning values are identified, how arrows and flags work, and how content is ordered.

### 9.1 Complete Card Example (P3 — Richest State)

```
┌─ SBAR Overview Card ───────────────────────────────────────────┐
│                                                                 │
│  S  Situation                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  "25M with DM + HTN presenting with fever 3d, dry      │    │
│  │   cough 2d. Critical BP 70/60, SpO₂ 93%."              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  B  Medical History                                             │
│     ● Chronic: Diabetes (1yr) | Hypertension (6mo)              │
│     ● Allergies: Dust | Egg | Prawns                            │
│                                                                 │
│  A  Assessment                                                  │
│     Vitals: BP ⚠️70/60 | Pulse 78 | SpO₂ ⚠️93% | Temp ⚠️104°F │
│     Labs:  ↑ HbA1c 8.1% | ↑ FBS 168 | ↑ TSH 5.8               │
│                                                                 │
│     Last Visit: 27 Jan'26                                       │
│     Dx: Viral Fever, Conjunctivitis                             │
│     Sx: Fever, eye redness                                      │
│                                                                 │
│  R  Recommendations                                             │
│     • Follow-up overdue by 5 days                               │
│     • ⚠️ BP 70/60 — consider IV fluids                          │
│     • ⚠️ SpO₂ 93% — supplemental oxygen                        │
│     • ⚠️ Temp 104°F — evaluate fever source                     │
│                                                                 │
│  Pills: Review SpO₂ | Allergy Alert | Suggest DDX              │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9.2 Situation (S)

**What it displays:** A 1-3 sentence clinical snapshot combining the patient's identity, current presentation, and critical alerts.

**Data source (priority chain):**
1. `SmartSummaryData.patientNarrative` — If set, used as-is (pre-written by intake system or mock data). This is also the tooltip summary on the appointment page, ensuring consistency.
2. `SmartSummaryData.sbarSituation` — Clinician-written override.
3. **Auto-generated** from available data in this composition order:
   - Chief complaint from `symptomCollectorData.symptoms[0]` (name + duration + severity)
   - Chronic conditions from `chronicConditions[0..2]`
   - Drug allergies from `allergies[]` (if flagged as drug allergy)
   - Key active medications from `activeMeds[0..2]`
   - Last visit context from `lastVisit.date` + `lastVisit.diagnosis`

**Rendering:** Italic text in a purple-bordered quote box. Clinical terms are highlighted via `highlightClinicalText()` — conditions and medications appear semibold dark, parenthetical durations appear muted.

**Max length:** ~200 characters or 2-3 sentences. Truncated with "..." if exceeding.

---

### 9.3 Background / Medical History (B)

**What it displays:** Chronic conditions, allergies, and when present lifestyle, family, surgical, and other history — each as its own **●** row under a **Medical History** `SectionSummaryBar`.

**Section headers:** `SectionSummaryBar` / `SectionTag` use `bg-tp-slate-100/70`, label `text-tp-slate-500` semibold (standard chrome). **Inline keys** use the shared `SECTION_INLINE_SUBKEY_CLASS` export (`shared/sectionInlineKey.ts`) — `text-tp-slate-400` semibold — in `InlineDataRow`, `SbarOverviewCard`, and other summary cards. **V0 and full agent** use the same components.

**Data sources (subsections shown when non-empty):**
| Field | Source in SmartSummaryData |
|-------|--------------------------|
| Chronic | `chronicConditions[]` |
| Allergies | `allergies[]` |
| Lifestyle | `lifestyleNotes[]` |
| Family history | `familyHistory[]` |
| Surgical history | `surgicalHistory[]` |
| Other | `additionalHistory[]` |

**Formatting rules:**
- Row shape: **`Category:`** (`font-semibold text-tp-slate-400`) + items joined by **` | `**; each item via `formatWithHierarchy()` (primary `tp-slate-700`, brackets `tp-slate-400`)
- **10px** vertical gap between pointer rows; **●** bullet in `text-tp-slate-400`
- Subsection omitted if its array is empty

**Ordering:** Subsections follow `buildHistorySegments` order (chronic → allergies → lifestyle → family → surgical → other).

---

### 9.4 Assessment (A) — Vitals

**What it displays:** Today's recorded vital signs with abnormality flags.

**Data source:** `SmartSummaryData.todayVitals` (type `VitalEntry`)

**Available vital signs:**
| Vital | Field | Unit | Display Format |
|-------|-------|------|----------------|
| Blood Pressure | `todayVitals.bp` | mmHg | "132/84" |
| Pulse | `todayVitals.pulse` | bpm | "78" |
| SpO₂ | `todayVitals.spo2` | % | "93%" |
| Temperature | `todayVitals.temp` | °F | "104°F" |
| Weight | `todayVitals.weight` | kg | "76kg" |
| Respiratory Rate | `todayVitals.rr` | /min | "18/min" |

**Display order:** BP → Pulse → SpO₂ → Temp → Weight → RR (fixed order via `VITAL_ORDER` constant)

**Flag/concern logic:**
| Vital | Normal Range | ⚠️ Flag Condition | Critical Threshold |
|-------|-------------|-------------------|-------------------|
| BP (systolic) | 90-139 mmHg | systolic ≥ 140 (high) or ≤ 90 (low) | ≤ 90 or ≥ 160 |
| SpO₂ | ≥ 95% | Below normal → "low" flag | < 92% |
| Temperature | < 100.4°F | ≥ 100.4°F → "high" flag | ≥ 104°F |
| BMI | 18.5-29.9 | > 30 (high) or < 18.5 (low) | — |
| Pulse | 60-100 bpm | Abnormal → flag | — |

**Arrow convention:**
- Single ↑ for HIGH values (e.g., "↑ BP 170/100")
- Single ↓ for LOW values (e.g., "↓ SpO₂ 91%")
- **NEVER use double arrows** (↑↑ or ↓↓) anywhere in the system
- No arrow = normal value

**Flag colors:**
- Normal: default text color
- High/Low: warning color (amber/red depending on severity)
- Critical: red with ⚠️ icon

---

### 9.5 Assessment (A) — Key Labs

**What it displays:** Flagged lab values from the most recent panel — only abnormal results shown.

**Data source:** `SmartSummaryData.keyLabs[]` (type `LabFlag[]`)

**LabFlag structure:**
```typescript
interface LabFlag {
  name: string      // "HbA1c", "LDL", "TSH", "Hb", "eGFR", "K+"
  value: string     // "8.1", "118", "5.8"
  unit: string      // "%", "mg/dL", "mIU/L", "g/dL"
  flag: "high" | "low" | "critical"
  refRange?: string // "< 6.5%", "< 100 mg/dL"
}
```

**Display rules:**
- Max 3-4 labs shown in summary (first N by array order)
- Each lab: `{arrow} {shortName}: {value} {unit}`
- Lab names shortened via mapping: "HbA1c" → "A1c", "Hemoglobin" → "Hb", "Triglycerides" → "TG", etc.
- Full list available in expanded lab panel card

**Arrow convention:**
- `↑` prefix for `flag: "high"` — value above reference range
- `↓` prefix for `flag: "low"` — value below reference range
- `↑` prefix for `flag: "critical"` — treated as high for display
- No arrow for normal (but normal labs are typically not in `keyLabs` since only flagged values appear)

**How "concerning" is determined:**
- The `flag` field is set at data ingestion time based on lab-specific reference ranges
- Reference ranges are age- and gender-aware in production
- In mock data: explicitly set per patient (e.g., HbA1c > 6.5% → "high")

**Ordering:** Labs appear in array order from `keyLabs[]`. In practice: most clinically significant first (HbA1c before Triglycerides, eGFR before Microalbumin).

---

### 9.6 Last Visit

**What it displays:** Context from the patient's most recent consultation.

**Data source:** `SmartSummaryData.lastVisit` (type `LastVisitData`)

**Fields displayed:**
| Field | Source | Example |
|-------|--------|---------|
| Date | `lastVisit.date` | "27 Jan'26" |
| Symptoms | `lastVisit.symptoms` | "Fever, eye redness" |
| Diagnosis | `lastVisit.diagnosis` | "Viral Fever, Conjunctivitis" |
| Medications | `lastVisit.medication` | "Paracetamol 650mg, Azithromycin 500mg" |
| Doctor | `lastVisit.doctorName` | "Dr. Meera" (shown as trailing badge) |

**Formatting:**
- Symptoms shortened via `shortenSymptom()`: drops modifiers ("high-grade fever" → "fever")
- Medications shortened via `shortenMedication()`: drops frequency ("Paracetamol 650mg 1-0-1" → "Paracetamol 650mg")
- Labels: "Sx:" for symptoms, "Dx:" for diagnosis, "Rx:" for medications
- Pipe separator `|` between fields

**Ordering:** Date → Dx → Sx → Rx (diagnosis is more important than symptoms for quick scan)

---

### 9.7 Recommendations (R)

**What it displays:** Actionable clinical recommendations based on current data.

**Data sources and priority order** (`buildRecommendations` in `SbarOverviewCard.tsx`):
1. **Critical vitals** (thresholds only): BP systolic ≤ 90 or ≥ 160; SpO₂ below 92%; temp ≥ 104°F
2. **Tiered recommendations** (`recommendationTiers[]`, sorted act → verify → gather)
3. **Due alerts** (`dueAlerts[]`), excluding pure visit-scheduling phrasing
4. **Last visit** suggested tests (`lastVisit.labTestsSuggested`)
5. **Flagged key labs** (`keyLabs` with abnormal flags) → order/recheck lines
6. **Cross-problem flags** (`crossProblemFlags[]`, high severity first)

**Collection limits:** Up to **6** raw strings collected; each string may be **split** for display (see below).

**Display formatting (no truncation):**
- **No** `line-clamp` or ellipsis on bullet text — full content is visible (may wrap to multiple lines in the narrow panel).
- Long lines are split into **additional ● bullets** at `;`, em-dash clauses, comma-grouped phrases, or ~**88** characters at a word boundary — target **~1–1.5 lines per bullet** in the sidebar width without cutting mid-thought.
- Cap **12** bullets after splitting.
- `highlightRecommendation`: urgent / electrolyte / acidosis phrases in error tone; numbers and key terms emphasized.

**What is NOT shown in recommendations:**
- “Follow-up overdue by N days” as a standalone scheduling line (other due alerts still appear)
- Non-threshold vitals (e.g. mild BP elevation below the critical cutoffs above) unless also present in tiers/flags

**Arrow convention in recommendations:** Single ↑/↓ only where source text uses it. Example: "↑ BP 170/100 — titrate antihypertensive"

---

### 9.8 Concern Trend

**What it displays:** A declining or improving metric over time (sparkline).

**Data source:** `SmartSummaryData.concernTrend` (type `ConcernTrend`)

```typescript
interface ConcernTrend {
  label: string          // "SpO₂", "LDL", "eGFR"
  values: number[]       // [97, 96, 94, 93] — sequential values
  labels: string[]       // ["20 Jan", "22 Jan", "24 Jan", "27 Jan"]
  unit: string           // "%", "mg/dL", "mL/min"
  tone: "teal" | "red" | "amber" | "violet"
}
```

**Tone mapping:**
| Tone | Meaning | Example |
|------|---------|---------|
| `red` | Declining, concerning | SpO₂ 97→93 (oxygen dropping) |
| `amber` | Slight decline, watch | SpO₂ 98→96 (mild drop) |
| `teal` | Improving | LDL 142→118 (cholesterol improving) |
| `violet` | AI-highlighted | Informational trend |

**Trend summary text** (generated by `getTrendSummary()`):
- Less than 2% change: `→ Stable`
- Positive direction: `↑ Increasing`
- Negative direction: `↓ Declining`
- **Single arrows only** — never double.

**Display format:** `"{label} {arrow} ({tone label})\n{value₁} → {value₂} → {value₃} → {value₄}"`

---

### 9.9 Specialty Overlays

Specialty data renders as an embedded box within the summary card. Only one specialty overlay is shown at a time (priority: Obstetric > Gynec > Pediatric > Ophthal).

#### Obstetric (`obstetricData`)
- **Fields:** G/P/L/A, LMP, EDD, gestational weeks, presentation, fetal movement, oedema, fundus height, amniotic fluid, ANC dates, vaccine status, BP trend, alerts
- **Key alerts:** Pre-eclampsia risk (BP ≥ 140/90 + proteinuria), gestational DM, IUGR

#### Pediatric (`pediatricsData`)
- **Fields:** Age months, height/weight with percentiles, OFC, BMI%, vaccines pending/overdue, milestone notes, feeding notes, growth date
- **Key alerts:** Below 5th percentile weight, overdue vaccines, speech delay

#### Gynecologic (`gynecData`)
- **Fields:** LMP, cycle length/regularity, flow intensity, pain score, last pap smear, alerts
- **Key alerts:** Irregular cycles, heavy flow (menorrhagia), overdue screening

#### Ophthalmologic (`ophthalData`)
- **Fields:** VA (right/left), near VA, IOP, slit lamp findings, fundus findings, last exam, glass prescription, alerts
- **Key alerts:** IOP > 21 (glaucoma risk), VA decline, diabetic retinopathy

---

### 9.10 History Formatting Convention

Throughout the card, medical history follows a consistent two-tier formatting:

**Primary tier** (semibold, dark `tp-slate-700`):
- Condition names: "Hypertension", "Type 2 Diabetes", "CKD Stage 5"
- Medication names: "Metformin 500mg", "Telma 20mg"
- Lab names + values: "HbA1c 8.1%", "eGFR 11"
- Vital readings: "BP 170/100", "SpO₂ 93%"

**Secondary tier** (normal weight, muted `tp-slate-400`):
- Durations in parentheses: "(2yr)", "(6mo)", "(since 2024)"
- Status notes in parentheses: "(resolved)", "(childhood)", "(Active)"
- Date references in parentheses: "(2021)", "(Jan 2024)"

This ensures the doctor's eye naturally goes to the clinical term first, then to the supporting temporal context. The two-tier system is implemented by `highlightClinicalText()` which applies regex-based pattern matching with PRIMARY patterns (conditions, meds, labs, vitals) and SECONDARY patterns (parenthetical content).

---

### 9.11 Canned Pills Post-Summary

After the patient summary card is generated, the canned pills dynamically update:

**Before summary shown:**
- "Patient's detailed summary" (forced, priority -1)
- Vital trends (if vitals exist)
- Lab overview (if labs exist)
- Last visit details (if last visit exists)

**After summary shown (deduplication removes "Patient's detailed summary"):**
- Pre-visit intake (if `symptomCollectorData.symptoms` exist)
- Vital trends (if vitals exist)
- Flagged lab results (if labs have flagged values)
- Last visit details (if last visit exists)
- Follow-up overview (if follow-up is overdue)
- Ask me anything (always)

The deduplication works via `PILL_TO_CARD_KIND` mapping in `DrAgentPanel.tsx` — once a card kind appears in the message thread, its corresponding pill is filtered out.

---

### 9.12 Tooltip Summary → Chat Trigger Flow

The appointment page tooltip ("View Detailed Summary" CTA) triggers the following flow:

1. **User hovers** AI icon → tooltip appears with short patient summary
2. **User clicks** "View Detailed Summary" CTA
3. `onViewSummary` callback fires → `openAgentForPatient(row, "View detailed patient summary of {name}")`
4. Agent panel opens with patient context set
5. Auto-message `"View detailed patient summary of {name}"` is sent via `pendingAutoMessageRef` mechanism
6. Intent engine matches "detailed summary" → routes to `patient_summary` card builder
7. Reply engine generates `patient_summary` card with full `SmartSummaryData`
8. Card renders in chat thread with all applicable sections

This ensures the tooltip serves as a lightweight preview, and the CTA seamlessly transitions into the full clinical summary inside the chat.
