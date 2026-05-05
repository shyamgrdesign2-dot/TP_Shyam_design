# Dr. Agent — Card Catalog (Detailed)

> Every card: what it does, when to use it, what triggers it, and how to vary it.
> 63 card kinds organized by family.

---

## How to Read Each Card Entry

- **What it does**: One-line purpose
- **When triggered**: What pill tap, intent, or system event produces this card
- **Scenario**: When a doctor would need this
- **Key params**: The data fields the backend must provide
- **Permutations**: How the same card structure can serve different data without UI changes
- **Completeness donut**: Whether this card shows data completeness
- **Source tag**: What appears in the Source dropdown

---

## A. Summary Family (8 cards)

### A0. `sbar_overview` — SBAR Patient Summary
**What it does:** Structured patient handoff card using SBAR framework: Situation (short summary), Background (conditions, allergies, meds), Assessment (vitals, labs with flags), Recommendation (actionable alerts). Primary quick-scan card for consultation prep.

**When triggered:**
- "Patient summary", "summary", "snapshot" pills or free-text
- "sbar", "s-bar", "handoff" queries
- Pre-consult prep queries

**Scenario:** Doctor opens a patient record and needs a structured 30-second scan: what's the situation, what's the history, what are today's numbers, and what needs attention right now.

**Key params:** `SmartSummaryData` (same as patient_summary). Data mapped internally:
- **S (Situation):** Composed from symptoms, chronic conditions, drug allergies, current meds, last visit (follows SUMMARY_COMPOSITION_ORDER). Falls back to `sbarSituation` if pre-written.
- **B (Background):** `chronicConditions[]`, `allergies[]`, `activeMeds[]` (max 6, shortened). Rendered with `formatWithHierarchy()` for color differentiation.
- **A (Assessment):** `todayVitals` (BP, Pulse, SpO2, Temp, Wt) + `keyLabs[]` (max 4, with flag indicators).
- **R (Recommendation):** `followUpOverdueDays`, critical vitals (BP<=90 or >=160, SpO2<92, Temp>=104), top 2 `dueAlerts`, 1 critical `crossProblemFlag`.

**Permutations:**
| Permutation | Data present | What changes |
|-------------|-------------|--------------|
| New patient, no data | None | Situation: "New patient, no prior clinical data available." All other sections hidden |
| Returning, no intake | chronicConditions, meds, lastVisit | S from conditions + last visit. B, A (if vitals), Last Visit shown. |
| Returning with intake | + symptomCollectorData | Richest: S from symptoms + conditions. All sections visible. |
| Limited history | Only some fields | Each section shown/hidden independently per data availability |

**Completeness donut:** No
**Source tag:** EMR + Lab Results + Past Visits

**Compared to patient_summary:** SBAR Overview is the primary summary (quick structured scan, ~30 seconds). GPSummaryCard (patient_summary) is the detailed summary (comprehensive, ~2 minutes).

---

### A1. `patient_summary` — Patient Overview (Detailed)
**What it does:** Full patient snapshot at consultation start — vitals, labs, history, last visit, specialty data. Follows SBAR ordering.

**When triggered:**
- Consultation opens (auto-generated)
- "Patient's detailed summary" pill
- "Patient summary" free-text query

**Scenario:** Doctor opens a patient record and needs the complete clinical picture in one glance before starting the consultation.

**Key params:**
- `specialtyTags` (required), `patientNarrative`, `todayVitals[]`, `keyLabs[]`, `chronicConditions[]`, `activeMeds[]`, `allergies[]`, `lastVisit`, `symptomCollectorData`, `obstetricData`, `gynecData`, `ophthalData`, `pediatricsData`, `pomrProblems[]`, `crossProblemFlags[]`, `dataProvenance`

**Permutations (same card, different data):**
| Permutation | Data present | What changes |
|-------------|-------------|--------------|
| New patient, no history | Only specialtyTags | Narrative: "New patient. No prior clinical data." All sections hidden |
| New patient, with intake | + symptomCollectorData | Symptom collector section appears, narrative references complaints |
| Returning, history only | + chronicConditions, activeMeds, lastVisit | Full history sections, no symptom collector |
| Returning, history + intake | All data present | Richest version — all sections visible |
| CKD/chronic multi-morbidity | + pomrProblems, crossProblemFlags | Cross-problem InsightBox flags shown |
| Specialty patient | + obstetricData / gynecData / ophthalData / pediatricsData | Embedded specialty box appears |

**Completeness donut:** No — displays whatever data is available
**Source tag:** EMR + Lab Results + Records + Past Visits + Symptom Collector

---

### A2. `patient_narrative` — Clinical Narrative
**What it does:** Standalone violet-bordered narrative paragraph block — the AI-generated clinical summary. Renders without CardShell.

**When triggered:** Used internally as part of patient_summary rendering. Can also appear standalone in chat.

**Scenario:** When only the narrative is needed without the full card (e.g., inline in chat text).

**Key params:** `patientNarrative`, `specialtyTags`, `followUpOverdueDays`, `labFlagCount`

**Permutations:** Same as patient_summary — narrative text adapts to available data.

**Completeness donut:** No
**Source tag:** EMR

---

### A3. `symptom_collector` — Patient-Reported Intake
**What it does:** Shows what the patient reported via the Visit app's symptom collector before arriving. Starts directly with patient-reported sections — no chart summary or snapshot block.

**When triggered:**
- Consultation opens (auto-generated if intake data exists)
- Shown alongside patient_summary

**Scenario:** Patient filled the pre-visit intake form. Doctor sees reported symptoms, chronic conditions, current medications, and questions to doctor — all before examining the patient.

**Sections (in order):**
1. **Symptoms Reported** — name + detail (duration, severity, notes)
2. **Chronic Conditions** — parsed from medicalHistory with name + duration detail in lighter brackets
3. **Current Medications** — drug name in dark, frequency/timing in lighter brackets (e.g. "Telma 20mg" dark + "(Twice daily)" lighter)
4. **Questions to Doctor** — free-text questions from patient

**Key params:**
- `reportedAt` (required), `symptoms[]` (required), `medicalHistory[]`, `questionsToDoctor[]`, `currentMedications[]`

**Color hierarchy for medications:**
- Drug name + dosage → `text-tp-slate-700` (dark)
- Frequency/timing in brackets → `text-tp-slate-400` (lighter)
- Example: **Telma 20mg** (Twice daily)

**Permutations:**
| Permutation | Data present | What changes |
|-------------|-------------|--------------|
| Minimal intake | symptoms only | Only symptoms section shown |
| Full intake | symptoms + meds + conditions + questions | All 4 sections visible |

**Completeness donut:** No — patient-reported, no EMR expectation
**Source tag:** Patient Intake (date)

---

### A4. `last_visit` — Previous Visit Summary
**What it does:** Previous visit details with per-section copy to RxPad — symptoms, diagnosis, medication, investigation, advice, follow-up.

**When triggered:**
- "Last visit details" pill
- "Last visit" free-text query
- "Compare with last visit" pill

**Scenario:** Doctor wants to see what happened in the last consultation — what was diagnosed, what was prescribed, and whether the patient followed through.

**Key params:**
- `visitDate` (required), `sections[]` (required — each has tag, icon, items), `copyAllPayload`

**Permutations:**
| Permutation | What changes |
|-------------|--------------|
| Visit with meds + dx + advice | All sections shown |
| Visit with only dx | Only diagnosis section |
| Visit from different doctor | Doctor name shown in context |

**Completeness donut:** No
**Source tag:** Past Visits (date)

---

### A5. `obstetric_summary` — Obstetric History
**What it does:** Gravida status, LMP, EDD, gestational age, ANC schedule, vaccine status, fetal details.

**When triggered:**
- Obstetric tab active
- Obstetric patient detected
- "Obstetric summary" pill

**Scenario:** Pregnant patient — doctor needs gravida/para status, gestational age, ANC schedule compliance, vaccine status at a glance.

**Key params:** `gravida`, `para`, `living`, `abortion`, `ectopic`, `lmp`, `edd`, `gestationalWeeks`, `presentation`, `fetalMovement`, `fundusHeight`, `amnioticFluid`, `ancDue[]`, `vaccineStatus[]`, `alerts[]`

**Permutations:** Sections appear/hide based on available data. First-trimester vs. third-trimester shows different details.

**Completeness donut:** No
**Source tag:** Obstetric History

---

### A6. `gynec_summary` — Gynecological History
**What it does:** Menstrual history, cycle details, pain score, pap smear status.

**When triggered:** Gynec tab active or gynec patient detected.

**Scenario:** Female patient — doctor needs cycle regularity, flow intensity, screening status.

**Key params:** `menarche`, `cycleLength`, `cycleRegularity`, `flowDuration`, `flowIntensity`, `padsPerDay`, `painScore`, `lmp`, `lastPapSmear`, `alerts[]`

**Completeness donut:** No
**Source tag:** Gynec History

---

### A7. `pediatric_summary` — Pediatric Growth
**What it does:** Height/weight percentiles, BMI, vaccine schedule, milestones, feeding notes.

**When triggered:** Pediatric patient detected or Growth tab active.

**Scenario:** Child patient — doctor needs growth tracking, vaccine compliance, developmental milestones.

**Key params:** `heightPercentile`, `weightPercentile`, `heightCm`, `weightKg`, `ofcCm`, `vaccinesPending`, `vaccinesOverdue`, `overdueVaccineNames[]`, `milestoneNotes`, `feedingNotes`, `alerts[]`

**Completeness donut:** No
**Source tag:** Growth + Vaccine records

---

### A8. `ophthal_summary` — Ophthalmology
**What it does:** Visual acuity (near/far), IOP, slit lamp findings, fundus, glass prescription.

**When triggered:** Ophthal tab active or ophthal patient detected.

**Scenario:** Eye patient — doctor needs VA, IOP, examination findings.

**Key params:** `vaRight`, `vaLeft`, `nearVaRight`, `nearVaLeft`, `iop`, `slitLamp`, `fundus`, `glassPrescription`, `alerts[]`

**Completeness donut:** No
**Source tag:** Ophthal records

---

## B. Data Family (8 cards)

### B1. `lab_panel` — Flagged Lab Results
**What it does:** Grid table of flagged lab values — only abnormal results shown with SVG flag arrows (▲/▼), reference ranges, and AI insight.

**When triggered:**
- "13 lab values flagged" pill
- "Lab overview" pill
- "Lab results" free-text query

**Scenario:** Patient has abnormal labs. Doctor needs to see which values are flagged, how far from normal, and what the clinical significance is.

**Key params:** `panelDate`, `flagged[]` (name, value, unit, refRange, flag: high|low), `hiddenNormalCount`, `insight`

**Permutations:**
| Permutation | What changes |
|-------------|--------------|
| Few flags (3-5) | Compact table |
| Many flags (10+) | Scrollable table |
| Normal count > 0 | "+ N normal" expandable button |
| Has insight | InsightBox shown below table |

**Completeness donut:** No — shows whatever labs are flagged
**Source tag:** Lab Results (date)

---

### B2. `vitals_trend_bar` — Vital Trends (Bar Chart)
**What it does:** Bar chart showing vital parameter(s) over time with trend direction and threshold lines.

**When triggered:** "Vital trends" pill, "BP trend" query, "SpO₂ trend declining" pill

**Scenario:** Doctor wants to see how a vital sign has changed across visits.

**Key params:** `title`, `series[]` (label, values, dates, tone: ok|warn|critical, unit, threshold?, thresholdLabel?)

**Permutations:**
| Permutation | What changes |
|-------------|--------------|
| Single parameter | One bar series |
| Multi-parameter (BP systolic + diastolic) | Two bar series overlaid |
| With threshold | Horizontal threshold line on chart |
| All normal | Green tone bars |
| Declining trend | Red/amber tone bars |

**Completeness donut:** No
**Source tag:** Vitals (parameter names, date range)

---

### B3. `vitals_trend_line` — Vital Trends (Line Chart)
**What it does:** Same data as bar chart, rendered as line chart.

**When triggered:** "Graph view" pill (switches from bar to line)

**Permutations:** Same as vitals_trend_bar.

---

### B4. `lab_trend` — Lab Parameter Trend
**What it does:** Trend chart for a specific lab parameter over time (e.g., HbA1c over 6 months).

**When triggered:** "HbA1c trend" pill, "[parameter] trend" query

**Scenario:** Doctor tracking a chronic condition marker — wants to see if treatment is working.

**Key params:** `title`, `parameterName`, `series[]` (same as vitals trend)

**Completeness donut:** No
**Source tag:** Lab Results (parameter name, date range)

---

### B5. `lab_comparison` — Lab Comparison Table
**What it does:** Side-by-side previous vs. current lab values with deltas and direction arrows.

**When triggered:** "Lab comparison" pill, "Compare labs" query

**Scenario:** Doctor wants to see what changed since last visit — which values improved, worsened, or stayed stable.

**Key params:** `rows[]` (parameter, prevValue, currValue, prevDate, currDate, delta, direction: up|down|stable, isFlagged), `insight`

**Permutations:**
| Permutation | What changes |
|-------------|--------------|
| Mostly improved | Green direction arrows |
| Mostly worsened | Red direction arrows |
| Mixed | Color-coded per row |

**Completeness donut:** No
**Source tag:** Lab Results (2 dates compared)

---

### B6. `med_history` — Medication History
**What it does:** Medication timeline — what drugs were prescribed when, dosage, source.

**When triggered:** "Medication timeline" pill, "Med history" query

**Scenario:** Doctor reviewing prescription history — especially for chronic patients on multiple medications.

**Key params:** `entries[]` (drug, dosage, date, diagnosis, source: prescribed|uploaded), `insight`

**Completeness donut:** No
**Source tag:** EMR + Records

---

### B7. `vaccination_schedule` — Vaccine Schedule
**What it does:** Vaccine schedule with given/due/overdue status badges.

**When triggered:** Pediatric or obstetric context, vaccine queries

**Key params:** `title`, `overdueCount`, `dueCount`, `givenCount`, `vaccines[]` (name, dose, dueDate, status)

**Completeness donut:** No
**Source tag:** Vaccine records

---

### B8. `patient_timeline` — Chronological History
**What it does:** Vertical timeline of all patient events — visits, labs, procedures, admissions.

**When triggered:** "View all records" navigation

**Key params:** `title`, `events[]` (date, summary, type: visit|lab|procedure|admission)

**Completeness donut:** No
**Source tag:** EMR + Records

---

## C. Clinical Family (2 cards)

### C1. `pomr_problem_card` — Problem-Oriented Medical Record
**What it does:** Per-problem card for chronic conditions — shows relevant labs (with provenance), current medications, missing fields with actionable prompts, and a data completeness donut.

**When triggered:**
- "CKD Stage 5" pill (or any POMR problem pill)
- Clinical keyword matching against pomrProblems array

**Scenario:** CKD patient with multiple chronic conditions. Doctor needs to see each problem's status — what data exists, what's missing, and what actions are needed.

**Key params:**
- `problem` (required), `status` (required), `statusColor`, `completeness: { emr, ai, missing }`, `labs[]` (with provenance dots), `meds[]`, `missingFields[]` (with actionable prompts)

**Permutations:**
| Permutation | What changes |
|-------------|--------------|
| CKD Stage 5 | Labs: Creatinine, GFR, Calcium, Phosphorus, PTH. Meds: Torsemide, Nicardia. Missing: PTH, 24h urine protein |
| Hypertension | Labs: BP readings, Creatinine. Meds: Amlodipine, Telmisartan. Missing: ECG, Echocardiogram |
| Type 2 DM | Labs: HbA1c, FBS, PPBS. Meds: Metformin, Insulin. Missing: Foot exam, Eye exam |
| Anaemia of CKD | Labs: Hb, Ferritin, TIBC, B12, Folate. Meds: EPO, Iron. Missing: Reticulocyte count |

**Completeness donut:** ✅ YES — the ONLY card with a completeness donut
**Source tag:** EMR + Lab Results + Records

**This is the most complex card in the system.** It combines:
- Lab values with EMR/AI-extracted provenance dots
- Active medications as pills
- Missing fields as interactive chips with prompts (e.g., "Order PTH test")
- Cross-problem flags via InsightBox
- Data completeness donut in the header

---

### C2. `sbar_critical` — Emergency Summary
**What it does:** SBAR-structured emergency summary for critical patients — Situation, Background, Assessment, Recommendation. Used for emergency handoff.

**When triggered:** Critical patient detected (SpO2 < 90, emergency vitals)

**Scenario:** Emergency case. Doctor needs structured handoff format — what's happening, what's the history, what's critical, what to do.

**Key params:**
- S (situation): narrative
- B (background): active problems
- A (assessment): critical flags (2-column grid)
- R (recommendation): key medications + recent ER admissions
- allergies with red badges

**Completeness donut:** Yes (EMR 70% + AI 20% + Missing 10%)
**Source tag:** EMR + AI

---

## D. Action Family (7 cards)

### D1. `ddx` — Differential Diagnosis
**What it does:** Ranked differential diagnoses in 3 tiers — Can't Miss (red), Most Likely (blue), Extended (slate). Doctor selects diagnoses to copy to RxPad.

**When triggered:** "Suggest DDX" pill, symptom entry, clinical decision intent

**Scenario:** Doctor has symptoms and vitals. Needs AI-suggested differentials ranked by clinical urgency.

**Key params:** `context` (reasoning basis), `options[]` (name, bucket: cant_miss|most_likely|consider, selected?)

**Permutations:**
| Permutation | What changes |
|-------------|--------------|
| Single presenting complaint | Fewer differentials, clearer ranking |
| Multiple symptoms | Broader differential list |
| With abnormal vitals | Vitals factored into reasoning |
| Pediatric patient | Age-appropriate differentials |

**Interaction:** Pattern 6 (Tiered Checkbox Selection)
**Completeness donut:** No
**Source tag:** Context + Protocol

---

### D2. `protocol_meds` — Suggested Medications
**What it does:** Protocol-based medication suggestions for a diagnosis — with dosage, timing, duration, safety check.

**When triggered:** "Suggest medications" pill, dx_accepted phase

**Scenario:** Doctor accepted a diagnosis. Needs medication protocol with dosing guidance and safety verification against allergies.

**Key params:** `diagnosis`, `meds[]` (name, dosage, timing, duration, notes?), `safetyCheck`, `copyPayload`

**Permutations:**
| Permutation | What changes |
|-------------|--------------|
| No conflicts | Safety check: ✓ |
| Allergy conflict | Safety check: ⚠ with alternative suggestion |
| Pediatric dosing | Weight-adjusted dosages |
| CKD patient | Renal-adjusted dosages |

**Interaction:** Pattern 4 (Section Copy) — per-med copy + copy-all
**Completeness donut:** No
**Source tag:** Context + Protocol

---

### D3. `investigation_bundle` — Suggested Investigations
**What it does:** Checklist of recommended investigations with rationale.

**When triggered:** "Suggest investigations" pill, "5 missing tests" pill

**Scenario:** Doctor needs to order tests. AI suggests based on diagnosis, missing data, and clinical guidelines.

**Key params:** `title`, `items[]` (name, rationale, selected?), `copyPayload`

**Permutations:** Items change based on diagnosis and what labs are already available.

**Interaction:** Pattern 1 (Checkbox + Copy to RxPad)
**Completeness donut:** No
**Source tag:** Context + Protocol

---

### D4. `follow_up` — Follow-Up Scheduling
**What it does:** Follow-up timing options with recommended option highlighted.

**When triggered:** "Plan follow-up" pill, meds_written phase

**Scenario:** Consultation wrapping up. Doctor needs to schedule next visit — AI recommends timing based on condition severity.

**Key params:** `context`, `options[]` (label, days, recommended?, reason?)

**Interaction:** Pattern 3 (Radio Single-Select)
**Completeness donut:** No
**Source tag:** Context + Protocol

---

### D5. `advice_bundle` — Patient Advice
**What it does:** Advice items for the patient — diet, lifestyle, medication instructions. Copy-to-RxPad and share via WhatsApp.

**When triggered:** "Draft advice" pill, "Generate advice" pill

**Scenario:** Doctor wants ready-made patient-friendly advice to copy into the prescription.

**Key params:** `title`, `items[]`, `shareMessage`, `copyPayload`

**Permutations:**
| Permutation | What changes |
|-------------|--------------|
| CKD patient | Renal diet, fluid restriction, medication timing |
| Diabetic patient | Diet, exercise, glucose monitoring |
| Post-surgery | Wound care, activity restrictions |
| Pediatric | Parent-directed advice language |

**Interaction:** Pattern 4 (Per-item copy + copy-all)
**Completeness donut:** No
**Source tag:** Protocol

---

### D6. `voice_structured_rx` — Voice-to-Structured-Rx
**What it does:** Voice dictation parsed into structured RxPad sections — symptoms, examination, diagnosis, medication, advice, investigation, follow-up.

**When triggered:** Voice dictation input

**Scenario:** Doctor dictates the entire consultation verbally. AI parses into structured sections for one-click acceptance.

**Key params:** `voiceText`, `sections[]` (sectionId, title, tpIconName, items[]), `copyAllPayload`

**Interaction:** Pattern 4 (Section Copy)
**Completeness donut:** No
**Source tag:** AI

---

### D7. `rx_preview` — Prescription Preview
**What it does:** Final summary of the prescription before ending the visit.

**When triggered:** "Visit summary" pill, near_complete phase

**Key params:** `patientName`, `date`, `diagnoses[]`, `medications[]`, `investigations[]`, `advice[]`, `followUp`

**Completeness donut:** No
**Source tag:** EMR

---

## E. Analysis Family (2 cards)

### E1. `ocr_pathology` — Lab Report OCR
**What it does:** Structured lab report extracted from uploaded PDF — flagged values + expandable normal values.

**When triggered:** Document upload (lab report type)

**Scenario:** Patient brings a printed lab report. Doctor uploads it. AI extracts structured parameters.

**Key params:** `title`, `category`, `parameters[]` (name, value, refRange?, flag?, confidence?), `normalCount`, `insight`

**Permutations:** Different lab types (CBC, KFT, LFT, thyroid) produce different parameter sets.

**Interaction:** Per-parameter copy to Lab Results section
**Completeness donut:** No
**Source tag:** Records (uploaded document name)

---

### E2. `ocr_extraction` — General Document OCR
**What it does:** Multi-section extraction from uploaded documents (discharge summaries, prescriptions, medical records).

**When triggered:** Document upload (non-lab type)

**Key params:** `title`, `category`, `sections[]` (heading, icon, items[], copyDestination), `insight`

**Completeness donut:** No
**Source tag:** Records (uploaded document name)

---

## F. Utility Family (5 cards)

### F1. `translation` — Language Translation
**What it does:** Translate prescription/advice text to regional language (Hindi, Tamil, Telugu).

**When triggered:** "Translate to regional" pill

**Key params:** `sourceLanguage`, `targetLanguage`, `sourceText`, `translatedText`, `copyPayload`

**Source tag:** AI

---

### F2. `completeness` — Documentation Check
**What it does:** Shows which RxPad sections are filled/empty. Suggests actions for empty sections.

**When triggered:** "Completeness check" pill, near_complete phase

**Key params:** `sections[]` (name, filled, count), `emptyCount`

**Source tag:** EMR

---

### F3. `follow_up_question` — Clarification Question
**What it does:** Agent asks the doctor for more information before generating a response.

**When triggered:** System-triggered when intent is ambiguous

**Key params:** `question`, `options[]`, `multiSelect`

**Source tag:** AI

---

### F4. `clinical_guideline` — Evidence-Based Reference
**What it does:** Clinical guideline with evidence level badge (A/B/C) and numbered recommendations.

**When triggered:** Clinical knowledge queries

**Key params:** `title`, `condition`, `source`, `recommendations[]`, `evidenceLevel`

**Source tag:** Protocol

---

### F5. `referral` — Specialist Referral
**What it does:** Referral card with specialist, department, reason, urgency.

**When triggered:** "Refer patient" action

**Key params:** `title`, `totalReferrers`, `totalPatients`, `items[]`

**Source tag:** EMR

---

### F6. Guardrail (Text + Suggestion Pills)
**What it does:** When the user asks an out-of-scope question (sports, weather, entertainment, etc.) or an ambiguous query, Dr. Agent replies with a short text message and horizontal scrollable suggestion pills below the bubble. This is NOT a card — it's a text reply with inline `suggestions[]` on the `RxAgentChatMessage`.

**When triggered:** `out_of_scope` intent category (keyword detection), or as default fallback for low-confidence queries.

**Key params:** `ReplyResult.text` (2-line guardrail message), `ReplyResult.suggestions[]` (label + message pairs rendered as horizontal scrollable pills)

**Visual:** Standard assistant text bubble + horizontal pill row below. Pills styled like canned action chips with border, hover → tp-blue.

---

### F7. `medical_history` — Medical History (Expanded)
**What it does:** Shows the patient's clinical background using SectionTag-based sections: chronic conditions, allergies, family history, lifestyle, active meds, surgical/past history.

**When triggered:** "Medical history" canned action or free-text query

**Key params:** `sections[]` (tag, icon, items[]), `insight`

**Visual:** Uses CardShell with "medical-record" TP icon. Each section rendered via InlineDataRow with SectionTag. Collapsible.

**Source tag:** EMR Records

---

### F8. `vitals_summary` — Today's Vitals Table
**What it does:** Displays today's recorded vital parameters in a clean table format with flag indicators (normal/high/low/critical).

**When triggered:** "Today's vitals" canned action or free-text query

**Key params:** `title`, `recordedAt`, `rows[]` (label, value, unit, flag), `insight`

**Visual:** Activity icon header. Table rows with color-coded flag badges. Optional AI insight footer.

**Source tag:** EMR

---

## G. Safety Family (2 cards)

### G1. `drug_interaction` — Drug Interaction Alert
**What it does:** Drug-drug interaction warning with severity, risk description, and recommended action.

**When triggered:** Automatically when medications are added and interactions detected.

**Scenario:** Doctor prescribes two drugs that interact. Card appears IMMEDIATELY — interrupting normal flow.

**Key params:** `drug1`, `drug2`, `severity` (critical|high|moderate|low), `risk`, `action`

**Completeness donut:** No
**Source tag:** Protocol

---

### G2. `allergy_conflict` — Allergy-Drug Conflict
**What it does:** Alert when prescribed drug conflicts with known allergy. Suggests alternative.

**When triggered:** Automatically when medication matches patient's allergy profile.

**Key params:** `drug`, `allergen`, `alternative`

**Completeness donut:** No
**Source tag:** EMR + Protocol

---

## H. Text Family (7 variants)

### H1. `text_fact` — Single Fact Display
**Scenario:** Doctor asks "What's the normal range for PTH?" → Concise answer with source.

### H2. `text_alert` — Severity Alert
**Scenario:** Critical clinical warning that needs attention.

### H3. `text_list` — Bulleted List
**Scenario:** "What are the side effects of Metformin?" → Simple list response.

### H4. `text_step` — Step-by-Step
**Scenario:** "How to perform a fundus examination?" → Numbered procedure steps.

### H5. `text_quote` — Clinical Quote
**Scenario:** Guideline citation with source attribution.

### H6. `text_comparison` — Two-Column Comparison
**Scenario:** "Compare Metformin vs Glimepiride" → Side-by-side comparison.

### H7. `patient_narrative` — Patient Narrative Block
**What it does:** Violet-bordered narrative paragraph. Renders without CardShell.
**Scenario:** Inline clinical narrative in chat or as a standalone summary block.
**Key params:** `patientNarrative`, `specialtyTags`, `followUpOverdueDays`, `labFlagCount`

---

## I. Operational Family (19 cards)

### I1. `welcome_card` — Daily Greeting
**Scenario:** Doctor opens the app. Sees today's schedule, patient count, pending follow-ups.
**Key params:** `greeting`, `date`, `stats[]` (icon, value, label), `quickActions[]`

### I2. `patient_list` — Patient Queue
**Scenario:** "Show today's queue" → List of patients with status badges.

### I3. `follow_up_list` — Pending Follow-Ups
**Scenario:** "Follow-ups due" → Overdue patients with reminder CTA.

### I4. `patient_search` — Patient Search
**Scenario:** Doctor asks "Details about Neha" → Search card with results, clickable to load patient.
**Key params:** `query`, `results[]` (name, meta, hasAppointmentToday)

### I5. `revenue_bar` — Daily Revenue Bar Chart
**Scenario:** Doctor checks daily revenue breakdown by consultation type.
**Key params:** `title`, `series[]`, `total`, `periodLabel`

### I6. `revenue_comparison` — Revenue Comparison
**What it does:** Side-by-side revenue comparison across two date ranges with refunds and deposits.
**Scenario:** Doctor compares this week's revenue to last week, or this month to previous month.
**Key params:** `title`, `primaryDateLabel`, `compareDateLabel`, `primaryRevenue`, `compareRevenue`, `primaryRefunded`, `compareRefunded`, `primaryDeposits`, `compareDeposits`, `insight`

### I7. `donut_chart` — Patient Distribution Donut
**Scenario:** Demographics or condition distribution as a donut chart.
**Key params:** `title`, `segments[]`, `total`

### I8. `pie_chart` — Consultation Type Breakdown
**Scenario:** Consultation type split (new vs. follow-up, in-clinic vs. teleconsult).
**Key params:** `title`, `segments[]`, `total`

### I9. `line_graph` — Daily Patient Count Trend
**Scenario:** Patient volume over a date range.
**Key params:** `title`, `series[]`, `xLabels[]`

### I10. `analytics_table` — KPI Dashboard
**Scenario:** Weekly KPIs with week-over-week comparison.
**Key params:** `title`, `columns[]`, `rows[]`

### I11. `condition_bar` — Top Conditions
**Scenario:** Most common diagnoses as horizontal bars.
**Key params:** `title`, `items[]` (condition, count, percentage)

### I12. `heatmap` — Appointment Density
**Scenario:** Busiest hours/days shown as a heatmap grid.
**Key params:** `title`, `xLabels[]`, `yLabels[]`, `data[][]`

### I13. `billing_summary` — Session Billing
**Scenario:** Payment status breakdown for billing queries.
**Key params:** `title`, `items[]`, `totalCollected`, `totalPending`

### I14. `anc_schedule_list` — ANC Schedule List
**What it does:** Lists ANC patients with due/overdue status for clinic-level tracking.
**Scenario:** Doctor or staff reviews which pregnant patients are due or overdue for their ANC visits.
**Key params:** `title`, `overdueCount`, `dueCount`, `items[]` (patientName, patientId, ancItem, dueWeek, gestationalAge, isOverdue)

### I15. `follow_up_rate` — Follow-Up Rate Analytics
**What it does:** Follow-up compliance rate with trend sparkline and daily counts.
**Scenario:** Doctor reviews follow-up adherence: what percentage of scheduled follow-ups were completed this week.
**Key params:** `title`, `currentRate`, `lastWeekRate`, `dueToday`, `overdueToday`, `completedThisWeek`, `scheduledThisWeek`, `trend[]` (label, rate)

### I16. `vaccination_due_list` — Vaccination Due List
**What it does:** Lists patients due or overdue for vaccinations, with vaccine name and dose.
**Scenario:** Staff checks which patients need vaccination reminders.
**Key params:** `title`, `overdueCount`, `dueCount`, `items[]` (patientName, patientId, vaccineName, dose, dueDate, isOverdue)

### I17. `due_patients` — Patient Dues Summary
**What it does:** Summary of outstanding patient dues with count and total amount.
**Scenario:** Doctor or billing staff reviews pending payments.
**Key params:** `title`, `periodLabel`, `patientCount`, `totalDueAmount`, `asOf`, `ctaLabel`

### I-extra. `bulk_action`, `external_cta`
**Scenario:** Batch operations (SMS reminders) and external CTAs (links to reports, tools).

---

## Shared Components — Arrow Indicators

All flag and trend arrow indicators use shared SVG components for consistency across every card.

### `shared/FlagArrow.tsx` — Abnormal Value Flag
- **Purpose:** Indicates a value is outside normal range (high/low/critical)
- **Format:** 8×8px SVG filled triangle — ▲ for high/critical, ▼ for low
- **Color:** Always `text-tp-error-500` (red) — both up and down
- **Used in:** `LabPanelCard`, `VitalsSummaryCard`, `OCRPathologyCard`, `DataRow`, `InlineDataRow`, `PomrProblemCard`
- **Clipboard:** Copy-to-clipboard still uses Unicode `↑`/`↓` for text readability

### `shared/DirectionArrow.tsx` — Trend Direction
- **Purpose:** Shows direction of change between two values (lab comparison, KPIs)
- **Format:** 10×10px SVG — filled triangle or horizontal line
- **Colors:** Up → `text-tp-error-500` (red/worsening), Down → `text-tp-success-600` (green/improving), Stable → `text-tp-slate-400` (gray)
- **Used in:** `LabComparisonCard`
- **Note:** Semantically different from FlagArrow — "up" means worsening trend, not just above range
