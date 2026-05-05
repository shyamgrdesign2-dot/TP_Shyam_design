# Patient Summary Agent — End-to-End Generation Spec

## Purpose

Define exactly how the short patient summary is generated for doctors in a few seconds, including:
- what data to fetch when an appointment opens,
- how to combine historical + symptom collector data,
- medical history decomposition and priority hierarchy,
- specialty-aware inclusion/exclusion rules with specialty-specific short summary openers,
- what to do when data is partial or missing (all permutations),
- sentence formation logic and agent response rules,
- and the output ordering/constraints for reliable UX.

This document is implementation-oriented for backend + integration developers.

---

## Core Outcome

The summary agent should produce:
1. a **short text summary** (primary, fast scan — 2-4 sentences),
2. optional **structured summary sections/cards** (secondary, drill-down),
3. with strict handling of missing/irrelevant data by specialty.

The doctor must understand risk + context in under ~5 seconds.

---

## SBAR Framework — Clinical Communication Foundation

The patient summary follows the **SBAR framework**, a structured clinical communication protocol widely used in healthcare for handoffs, escalations, and rapid patient context transfer.

### What is SBAR?

SBAR originated in the US Navy for submarine communication and was adopted by healthcare as a standardized method for conveying critical patient information between clinicians. It ensures no vital context is missed during handoffs.

| Letter | Stands For | Purpose | Maps To |
|--------|-----------|---------|---------|
| **S** | Situation | Why the patient is here — chief complaint, presenting symptoms | Symptom collector data, specialty lead-in |
| **B** | Background | Relevant clinical history — chronic conditions, allergies, surgical history, medications | Medical history, chronic conditions, drug allergies, active medications |
| **A** | Assessment | Current clinical state — vitals, labs, flags | Today's vitals, key lab results, abnormal flags |
| **R** | Recommendation | What needs to happen — follow-up, treatment plan, alerts | Due alerts, follow-up overdue, cross-problem flags, medication review |

### How We Apply SBAR

The SBAR framework is used as a **conceptual ordering principle** — not literal section labels. The patient summary narrative, card section ordering, and data flow all follow SBAR sequencing:

1. **Short summary narrative** (`buildCoreNarrative` in `shared/buildCoreNarrative.ts`): Composes text in S→B→A→R order — specialty lead-in/symptoms first, then conditions/allergies, then meds, then last visit/follow-up.
2. **Card section layout** (`GPSummaryCard`): InlineDataRow sections arranged as Situation → Background → Assessment → Context → Recommendation → Specialty → Flags.
3. **SBAR Overview Card** (`SbarOverviewCard`): Explicit S/B/A/R sections with labeled headers, each showing relevant data from the same source.
4. **Completeness check**: The narrative builder verifies all four SBAR categories are covered. Missing categories are flagged as `[Missing: chief complaint]`, `[Missing: history]`, etc.
5. **Narrative alignment**: Both `GPSummaryCard` and `SbarOverviewCard` use the same shared `buildCoreNarrative()` utility to ensure consistent clinical content across the patient summary and SBAR situation line.

> For the full SBAR Overview card specification, see `docs/sbar-overview-card-spec.md`.

---

## Input Data Sources (Fetch Checklist)

When an appointment is opened, backend should attempt to fetch all applicable sources. Data may be partial — fetching must never fail if a source is unavailable.

### A) Historical Clinical Data (secondary sidebar domains)
- Past visits — previous encounter records (symptoms, diagnosis, treatment, follow-up notes)
- Vitals history — BP, SpO₂, Temp, HR, Weight, BMI trends across visits
- Medical history — broken down as:
  - **Chronic conditions (medical conditions)** — DM, HTN, Asthma, COPD, Thyroid, Epilepsy, etc.
  - **Allergies** — Drug (Sulfonamides, Penicillin), Food (Egg, Prawns), Environmental (Dust, Pollen)
  - **Surgical history** — Appendectomy, C-section, CABG, Cataract surgery, etc.
  - **Family history** — DM, HTN, Cancer, Heart disease in immediate family
  - **Lifestyle** — Smoking, alcohol, diet, exercise, occupation exposure
  - **Additional history** — Travel, hospital admissions, other notes
- Ophthal history — Visual acuity, IOP, fundus findings, lens status
- Gynec history — Menstrual history, PAP smear, contraception, procedures
- Obstetric history — GPLAE, LMP, EDD, ANC visits, pregnancy complications
- Vaccination history — Immunization records (pediatric + adult)
- Growth history — Height/weight percentiles, milestones (pediatric)
- Lab results — CBC, LFT, KFT, Thyroid, HbA1c, Lipid, Urine panels
- Uploaded medical records — External reports, discharge summaries (OCR-ready)

### B) Current Encounter Data
- Symptom collector payload (if filled via patient app)
- Current visit vitals (if already recorded by nurse/receptionist)
- Current RxPad entries (if doctor has started entering)

### C) Identity/Meta
- Patient demographics (name, age, gender, UHID)
- Appointment type/context (new, follow-up, walk-in, specialty context)

---

## Medical History Priority Hierarchy for Short Summary

Not all medical history sub-fields carry equal weight in the short summary:

| Priority | Field | Rule |
|----------|-------|------|
| **PRIMARY** | Chronic Conditions | ALWAYS include when present. Most critical for clinical context. |
| **HIGH** | Allergies (especially drug) | Include when present — critical for prescription safety. |
| **HIGH** | Surgical History | Include when clinically relevant to current complaint or specialty. |
| **CONTEXTUAL** | Family History | Mention only if directly relevant (e.g., cardiac family history for cardiology). |
| **CONTEXTUAL** | Lifestyle | Mention only if directly relevant (e.g., smoker with cough). |
| **LOW** | Additional History | Include only if exceptionally relevant. Usually omitted from short summary. |

**Rule:** Chronic conditions MUST always be in the summary. Allergies and surgical history should be included when space allows. Family/lifestyle are contextual only.

---

## Canonical Summary Model

Backend should normalize all fetched sources into a single summary object before generating narrative.

```typescript
interface PatientSummaryCanonical {
  patient: { name, age, gender, uhid }
  specialty: string
  appointmentType: 'new' | 'follow-up' | 'walk-in'
  isNewPatient: boolean
  isFollowUp: boolean
  followUpOverdueDays?: number
  symptomCollector?: { symptoms[], questionsToDoctor[], selfReportedAllergies[], selfReportedMeds[] }
  currentVitals?: { bp, spo2, temp, hr, weight, bmi, isCritical }
  chronicConditions?: { name, duration, status }[]
  concerningConditions?: { name, detail }[]   // cancer, severe cardiac, renal failure
  allergies?: { drugs[], food[], environmental[] }
  surgicalHistory?: { procedure, year }[]
  familyHistory?: { relation, conditions[] }[]
  lifestyle?: { habit, detail }[]
  activeMeds?: { name, dose, frequency }[]
  keyLabs?: { name, value, unit, flag, previousValue? }[]
  lastVisit?: { date, chiefComplaint, diagnosis, keyTreatment, followUpAdvised? }
  ophthalData?: { va, iop, fundus, lensStatus? }
  gynecData?: { menstrualHistory, lmp?, contraception? }
  obstetricData?: { gplae, lmp, edd, currentWeek, ancVisits? }
  pediatricsData?: { weight, percentile, vaccineStatus, milestones? }
}
```

---

## Specialty Relevance Rules (Permutation Guardrails)

Not all domains should be shown for all specialties.

### GP / General Medicine
- **Prioritize:** Past visits, vitals, all medical history, labs, meds, allergies, symptom collector
- **Hide:** Specialty blocks unless clearly relevant and present
- **Note:** Broadest scope — show everything available

### Ophthalmology
- **Prioritize:** Ophthal data (VA, IOP, fundus), vitals, relevant labs (HbA1c), meds, allergies, last visit
- **Short summary opener:** Lead with VA + IOP readings. DM/HTN relevant as they affect eyes.
- **Hide:** Gynec, obstetric, pediatric-growth/vaccine, unrelated surgical history

### Gynecology
- **Prioritize:** Gynec history (menstrual, PAP, contraception), vitals, history, labs, meds, allergies, last visit
- **Short summary opener:** Lead with gynec-specific context. Hormonal conditions (PCOS, Thyroid) are priority chronic.
- **Hide:** Ophthal, pediatric-growth/vaccine, obstetric (unless dual-context)

### Obstetrics
- **Prioritize:** Obstetric data (GPLAE/LMP/EDD/ANC/vaccine), vitals (BP critical), relevant labs (Hb, GCT, blood group), meds, allergies
- **Short summary opener:** ALWAYS lead with "G2P1L1A0, LMP [date], EDD [date], currently [X]wk." BP and Hb are critical vitals.
- **Hide:** Ophthal, gynec-only panels not relevant to pregnancy, pediatric-growth

### Pediatrics
- **Prioritize:** Growth data (percentiles, milestones), vaccine history, vitals, relevant labs, meds, allergies, last visit
- **Short summary opener:** Lead with weight/percentile and vaccine status. Age-appropriate framing.
- **Hide:** Gynec, obstetric, ophthal unless explicitly relevant, lifestyle

### Dermatology
- **Prioritize:** Symptom collector (skin complaints), medical history, allergies (critical), meds, labs if relevant
- **Short summary opener:** Allergy history especially important. Medication history for drug reactions.
- **Hide:** Gynec, obstetric, ophthal, pediatric growth/vaccine

### Cardiology
- **Prioritize:** Vitals (BP, HR critical), cardiac conditions, labs (Lipid, cardiac markers), meds, surgical history (CABG, stents), family history (cardiac)
- **Short summary opener:** Cardiac chronic conditions and family cardiac history are priority.
- **Hide:** Gynec, obstetric, ophthal, pediatric growth/vaccine

### ENT
- **Prioritize:** Symptom collector, medical history, allergies, meds, labs if relevant, ENT surgical history
- **Short summary opener:** Allergy history important (allergic rhinitis). Surgical history for ENT procedures.
- **Hide:** Gynec, obstetric, ophthal (unless related), pediatric growth/vaccine

**Universal rule:** If a domain has no data or is specialty-irrelevant, do not render it at all. No placeholders, no "N/A".

---

## Short Summary Composition Logic (Strict Order)

For the **top short summary sentence(s)**, use this exact sequence:

### Step 0: Critical Alert Prefix (if applicable)
- If critical vitals (BP critical, SpO₂ < 94%) or critical lab flags detected
- Prepend: "⚠ BP 70/60 (critical low), SpO₂ 93% (declining)."
- This goes BEFORE everything else

### Step 1: Current Symptom Context (if symptom collector exists)
- "Presents with [symptom1] ([duration], [qualifier]) and [symptom2] ([duration])."
- If no symptom collector, skip and start with Step 2

### Step 2: Chronic / Concerning Conditions
- "Known case of [Condition] ([duration])."
- Flag concerning diseases: cancer, severe cardiac, renal failure
- If no chronic conditions, skip entirely — do NOT say "No chronic conditions"

### Step 3: Drug Allergies
- "Allergic to [Drug]."
- Only when drug allergies exist. Food/environmental are lower priority
- If no allergies, skip — do NOT say "No known allergies"

### Step 4: Current Medications (max 3)
- "On [Med1 dose freq], [Med2 dose freq]."
- Cap at 3 meds. If more: "+ N others"
- If no current meds, skip

### Step 5: Last Visit One-liner
- "Last seen [date] for [complaint] — Dx: [diagnosis], Rx: [key treatment]."
- If no prior visits, skip

### Special: New Patient Tag
- When isNewPatient = true: prepend "New patient." to set doctor's expectation

### Special: Missing Intake Note
- When no symptom collector AND not a new patient: append "No intake symptoms submitted for today's visit."

---

## Patient Summary Card — Section Ordering (SBAR Layout)

The Patient Summary card (`GPSummaryCard`) arranges its `InlineDataRow` sections following the SBAR conceptual layout. This is NOT literal SBAR labels — it's the **ordering principle** for how data flows:

### Order of Sections

```
1. Situation   → Context line (auto-generated from chronic conditions + presenting symptoms)
2. Background  → Medical History row / section (chronic, allergies, etc.; standard `SectionSummaryBar`; category labels semibold slate-400)
3. Assessment  → Key Labs row (with provenance dots and flags)
4. Context     → Last Visit row (Sx, Dx, Rx — copyable to RxPad)
5. Recommendation → Today's Vitals row (with abnormal flags)
6. Specialty   → Embedded specialty box (if applicable)
7. Flags       → Cross-problem InsightBox alerts (max 2 high-severity)
```

### When is the Situation Line Shown?

The situation line appears **only when the Patient Summary card is the intro card** — i.e., when there is no `symptomCollectorData` (no PatientReportedCard shown first). It provides the brief clinical context that would otherwise come from the PatientReportedCard.

Auto-generation logic:
- If `sbarSituation` exists in data → use it directly
- Else → combine chronic conditions (max 3) + presenting symptoms from last visit
- Example output: `"CKD Stage 5, Hypertension, Type 2 DM — presenting with fatigue, swelling"`

### Data Provenance on Labs

Lab values in the Key Labs row show optional provenance indicators:
- **Green dot (5px)** → Data from EMR (reliable, structured source)
- **Amber dot (5px)** → Data AI-extracted from uploaded documents (needs verification)
- Only shown when `dataProvenance` mapping exists for that lab name

### Data Completeness Donut

The donut chart (18px SVG) is **NOT shown on the Patient Summary card**. It is only shown on cards with a fixed expected data set where missing data is clinically meaningful — currently only **POMR Problem Cards**.

Rule: If a card displays "whatever data is available" (summaries, trends, overviews), no donut. If a card requires a specific set of data fields and some are missing, show the donut.

---

## Specialty-Specific Short Summary Examples

### Obstetrics
```
G2P1L1A0, LMP 15 Sep, EDD 22 Jun, currently 26wk. Presents with mild swelling in feet (1wk).
BP: 130/85 (borderline). Previous pregnancy uneventful — NVD. On Iron + Folic acid, Calcium.
Recent labs: Hb 10.2 (mild anemia), GCT pending.
```

### Ophthalmology
```
Known case of Type 2 DM (8yr) — presenting for annual fundus screening. Last VA: R 6/9, L 6/12.
IOP: R 16, L 18 mmHg. Previous fundus: mild NPDR (R). On Metformin 1g BD, Insulin Glargine 16U HS.
```

### Pediatrics
```
Presents with recurrent cough (2wk) and low-grade fever (4d). Weight: 12kg (25th percentile, age-appropriate).
Vaccines up to date through 18mo schedule. No chronic conditions on record.
```

### Gynecology
```
Presents with irregular periods (3mo) and lower abdominal pain (1wk). Known case of PCOS (2yr), Hypothyroid (1yr).
LMP: 15 Feb. Last seen 10 Jan for routine follow-up — USG normal, TSH slightly elevated.
On Letrozole 2.5mg, Thyronorm 50mcg.
```

### General Medicine (complex)
```
Presents with fever (3d, evening spikes) and dry cough (2d, night worsening). Known case of Type 2 DM (1yr)
and HTN (6mo). Allergic to Sulfonamides. On Metformin 500mg BD, Amlodipine 5mg OD. Last seen 27 Jan
for viral fever + conjunctivitis — Rx: Paracetamol, Cetirizine.
```

### Cancer history
```
Known case of Ca Breast (Stage IIA, diagnosed 2024) — post-mastectomy, on Tamoxifen 20mg OD.
Also: HTN (3yr) on Losartan 50mg. Recent labs: CBC normal, LFT mildly deranged (SGPT 58).
Last seen 1 month ago — routine oncology follow-up, advised PET-CT.
```

---

## Sentence Formation Patterns

| Pattern | Template | When |
|---------|----------|------|
| **A — Symptom opener** | "Presents with [symptom] ([duration], [qualifier])." | Symptom collector available |
| **B — Chronic statement** | "Known case of [Condition] ([duration])." | Chronic conditions exist |
| **C — Allergy mention** | "Allergic to [Drug]." | Drug allergies exist |
| **D — Med snapshot** | "On [Med1 dose freq], [Med2 dose freq]." | Active meds exist |
| **E — Last visit** | "Last seen [date] for [complaint] — Dx: [diagnosis], Rx: [treatment]." | Past visits exist |
| **F — Critical alert** | "⚠ BP 70/60 (critical low), SpO₂ 93% (declining)." | Critical vitals/labs |
| **G — New patient** | "New patient." | isNewPatient = true |
| **H — Specialty opener** | Obstetric: "G2P1L1A0, LMP…" / Ophthal: "VA: R 6/9…" / Pedia: "Weight: 12kg (25th)…" | Specialty context |

---

## Agent Response Formatting Rules

1. **Sentence count:** 2-4 sentences. Never exceed 5.
2. **Character limit:** 150-300 chars target, ~400 hard cap. Tooltip: ~220 chars.
3. **Clinical shorthand:** Use DM, HTN, COPD, H/o, Dx, Rx, NVD, LSCS — doctors read these faster.
4. **Signal words:** "Critical", "Declining", "Trending up", "Overdue", "Flagged", "Abnormal".
5. **No empty mentions:** Never say "No allergies" or "No family history" — just skip it.
6. **Self-reported labeling:** Prefix symptom collector data with "Self-reported" or "Patient reports".
7. **Date format:** Short — "27 Jan", "15 Feb". Include year only if different from current.
8. **Med format:** Drug + strength + frequency. "Metformin 500mg BD". Max 3, then "+ N others".
9. **Specialty framing:** Frame chronic conditions in specialty context. E.g., Ophthal: "DM (8yr) — presenting for fundus screening".
10. **New patient tag:** Always begin with "New patient." when isNewPatient = true.
11. **Follow-up context:** Include what the follow-up is for and whether overdue.
12. **No data dumping:** Never list all labs/vitals/visits. Summarize trends, pick top 2-3.

---

## Missing Data Behavior (All Permutations)

### Case 1: Full history + Symptom collector available (Complete)
- Best case. Generate complete summary following strict order.
- Example: "Presents with [symptoms]. Known case of [chronic]. Allergic to [drug]. On [meds]. Last seen [date] for [reason]."

### Case 2: History available + No symptom collector (Partial)
- Start directly with chronic conditions / last visit context.
- Explicitly note: "No intake symptoms submitted for today's visit."
- Example: "Known case of [chronic]. On [meds]. Last seen [date] for [reason]. No intake symptoms submitted for today's visit."

### Case 3: No history + Symptom collector available (Intake only)
- Likely new/first-time patient. Use symptom collector as primary content.
- Label self-reported data clearly.
- Example: "New patient. Presents with [symptoms]. Self-reported allergy: [if any]. Currently taking [self-reported meds]. No prior clinical records available."

### Case 4: Partial history + No symptom collector (Sparse)
- Use whatever is available. Never show empty stubs.
- Example: "Known case of [chronic]. No recent visits, lab data, or intake symptoms available."

### Case 5: No history + No symptom collector (Zero data — New patient)
- Explicit fallback with next-action recommendations.
- Output: "New patient — no historical clinical data or symptom collector submission available. Recommend: collect symptoms via intake form, record vitals, and begin clinical assessment."

### Case 6: Full data + Critical vitals/labs (Critical)
- Follow standard order but prefix critical values.
- Example: "⚠ BP 70/60 (critical low), SpO₂ 93% (declining). Presents with [symptoms]. Known case of [chronic]..."

---

## Output Length & UX Constraints

- Target: 2-4 concise sentences in short summary
- Hard cap recommended: ~400 characters (tooltip: ~220)
- Use plain clinical language and signal words
- Prefer: "Critical", "Overdue", "Trend declining", "No prior records"
- Never output empty sections in the payload

---

## Suggested Backend Algorithm

```
onAppointmentOpen(patientId, appointmentId):
  // Step 1: Fetch all applicable data sources
  demographics   = fetchPatientDemographics(patientId)
  appointmentCtx = fetchAppointmentContext(appointmentId)
  medicalHistory = fetchMedicalHistory(patientId)
  pastVisits     = fetchPastVisits(patientId, limit=5)
  vitalsHistory  = fetchVitalsHistory(patientId)
  labResults     = fetchLabResults(patientId)
  symptomData    = fetchSymptomCollector(appointmentId)
  currentVitals  = fetchCurrentVisitVitals(appointmentId)
  specialtyData  = fetchSpecialtyData(patientId, appointmentCtx.specialty)

  // Step 2: Normalize into canonical summary object
  summary = normalizeToCanonicalSummary(all fetched data)

  // Step 3: Apply specialty relevance filter
  visibleDomains = filterBySpecialty(summary, appointmentCtx.specialty)

  // Step 4: Derive risk signals
  riskSignals = deriveRiskSignals(summary)

  // Step 5: Build short summary (strict order)
  sentences = []
  if (riskSignals.hasCritical) → append critical alert
  if (symptomCollector)        → append symptom opener
  if (chronicConditions)       → append chronic statement
  if (drugAllergies)           → append allergy mention
  if (activeMeds)              → append med snapshot (max 3)
  if (lastVisit)               → append last visit one-liner
  if (empty + newPatient)      → append fallback message
  if (!symptomCollector && !newPatient) → append missing intake note

  shortSummary = sentences.join(' ')

  // Step 6: Return payload
  return { shortSummary, riskSignals, visibleDomains, completeness }
```

---

## Backend Acceptance Criteria

1. Summary generation never fails when any source is missing.
2. Specialty filtering suppresses irrelevant domains automatically.
3. Short summary ordering is strict: critical → symptoms → chronic/concerning → allergies → current meds → last visit.
4. New patient fallback appears when both history + collector are absent.
5. No empty sections/labels in output payload.
6. Critical lab/vitals signals are surfaced at the very beginning.
7. Character limit respected (150-400 chars, tooltip ~220).
8. Self-reported data from symptom collector is clearly labeled.
9. Follow-up overdue is flagged prominently.
10. Max 3 medications in short summary, excess indicated with "+ N others".

---

## Reference to Existing Docs

Use this spec together with:
- `patient-summary-permutations.md` (scenario matrix and UI permutations)
- `card-data-structuring.md` (card-level data contracts)
- `intent-classifier-and-canned-messages.md` (prompt/intent behavior)
