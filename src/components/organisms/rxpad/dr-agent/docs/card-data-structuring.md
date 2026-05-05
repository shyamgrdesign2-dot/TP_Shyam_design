# Card Data Structuring — What Data Drives Each Card & Fallback States

## Overview

Every card in the Dr. Agent system is driven by structured data. This document defines, for each card kind:
- **What data it needs** (required vs optional fields)
- **What happens when data is missing** (fallback behavior, hidden sections, empty states)
- **When the card should NOT be shown**
- **How the card adapts** to partial data

---

## 1. Summary Family

### `patient_summary` — Patient Summary Card

**Data source:** `SmartSummaryData` (assembled from EMR + intake + vitals + labs)

| Field | Required? | Fallback When Missing |
|-------|-----------|-----------------------|
| `specialtyTags` | Yes (always) | Default: `["General Medicine"]` |
| `followUpOverdueDays` | Yes | Default: `0` (no overdue badge shown) |
| `labFlagCount` | Yes | Default: `0` |
| `patientNarrative` | Optional | Generate minimal: "[Age][Gender] patient" |
| `todayVitals` | Optional | Entire vitals section hidden |
| `keyLabs` | Optional | Entire labs section hidden |
| `symptomCollectorData` | Optional | Symptom Reports section hidden |
| `chronicConditions` | Optional | Chronic Conditions section hidden |
| `activeMeds` | Optional | Active Meds section hidden |
| `allergies` | Optional | Allergies section hidden |
| `familyHistory` | Optional | Family History section hidden |
| `lifestyleNotes` | Optional | Lifestyle section hidden |
| `concernTrend` | Optional | Concern Trend section hidden |
| `lastVisit` | Optional | No "Last visit" reference in narrative |
| `dueAlerts` | Optional | Due Alerts section hidden |
| `recordAlerts` | Optional | Record Alerts section hidden |
| `gynecData` | Optional | Gynec overlay section hidden |
| `ophthalData` | Optional | Ophthal overlay section hidden |
| `obstetricData` | Optional | Obstetric overlay section hidden |
| `pediatricsData` | Optional | Pediatric overlay section hidden |

**Minimum viable card:** `specialtyTags` + at least one of: `symptomCollectorData`, `todayVitals`, `keyLabs`, `chronicConditions`, or `activeMeds`. If NONE of these exist (true zero-data), show narrative: "New patient. No prior clinical data available."

**See also:** `patient-summary-permutations.md` for the 4 fundamental permutation layouts.

---

### `symptom_collector` — Patient-Reported Intake

**Data source:** `SymptomCollectorData` (from intake form)

| Field | Required? | Fallback When Missing |
|-------|-----------|-----------------------|
| `reportedAt` | Yes | — |
| `symptoms` | Yes (at least 1) | Card not shown if empty |
| `medicalHistory` | Optional | Section hidden |
| `familyHistory` | Optional | Section hidden |
| `allergies` | Optional | Section hidden |
| `lifestyle` | Optional | Section hidden |
| `questionsToDoctor` | Optional | Section hidden |
| `currentMedications` | Optional | Section hidden |
| `lastVisitSummary` | Optional | Section hidden |
| `suggestedMeds` | Optional | Section hidden |
| `isNewPatient` | Optional | Default: `false` |

**When NOT to show:** Patient didn't fill the intake form (`symptomCollectorData` is `undefined`).

**Adaptation:** For new patients (`isNewPatient: true`), self-reported data is labeled "(self-reported)" to distinguish from verified clinical records. Sections appear in order of clinical priority: symptoms first, then allergies, then meds, then history.

---

### `last_visit` — Last Visit Summary

**Data source:** `LastVisitCardData` (from past visit records)

| Field | Required? | Fallback When Missing |
|-------|-----------|-----------------------|
| `visitDate` | Yes | — |
| `sections` | Yes (at least 1) | Card not shown if no sections |
| `copyAllPayload` | Yes | — |

Each section has: `tag` (label), `icon`, `items[]` (with `label`, optional `detail`, optional `severity`), optional `notes`.

**When NOT to show:** New patient with no prior visits. Card is never generated for first-visit patients.

---

### `obstetric_summary` — Obstetric History Overlay

**Data source:** `ObstetricData`

ALL fields are optional. The card shows only what's available:

| Data Present | Section Shown |
|-------------|---------------|
| `gravida/para/living/abortion/ectopic` | Obstetric formula (G_P_L_A_E_) |
| `lmp + edd + gestationalWeeks` | Current pregnancy status |
| `presentation + fetalMovement` | Fetal details |
| `fundusHeight + amnioticFluid` | Examination findings |
| `ancDue` | ANC schedule alerts |
| `vaccineStatus` | Vaccine status badges |
| `alerts` | Warning badges |

**When NOT to show:** Patient is not an obstetric case (`obstetricData` is `undefined`).

**Minimum viable:** At least one of `gravida`, `lmp`, or `gestationalWeeks` must exist.

---

### `gynec_summary` — Gynecological History Overlay

**Data source:** `GynecData`

ALL fields optional. Shows only what's available:

| Data Present | Section Shown |
|-------------|---------------|
| `menarche + cycleLength + cycleRegularity` | Menstrual history |
| `flowDuration + flowIntensity + padsPerDay` | Flow details |
| `painScore` | Dysmenorrhea assessment |
| `lmp` | Last menstrual period |
| `lastPapSmear` | Screening status |
| `alerts` | Warning badges |

**When NOT to show:** `gynecData` is `undefined`.

---

### `pediatric_summary` — Pediatric Growth Overlay

**Data source:** `PediatricsData`

| Data Present | Section Shown |
|-------------|---------------|
| `heightPercentile + weightPercentile` | Growth percentiles |
| `heightCm + weightKg + ofcCm` | Measurements |
| `vaccinesPending + vaccinesOverdue` | Vaccine status |
| `overdueVaccineNames` | Overdue vaccine list |
| `milestoneNotes` | Developmental milestones |
| `feedingNotes` | Feeding assessment |
| `alerts` | Warning badges |

**When NOT to show:** `pediatricsData` is `undefined`.

**Key flag:** If `vaccinesOverdue > 0`, show overdue count as a red badge.

---

### `ophthal_summary` — Ophthalmology Overlay

**Data source:** `OphthalData`

| Data Present | Section Shown |
|-------------|---------------|
| `vaRight + vaLeft` | Visual acuity |
| `nearVaRight + nearVaLeft` | Near vision |
| `iop` | Intraocular pressure |
| `slitLamp + fundus` | Examination findings |
| `glassPrescription` | Current prescription |
| `alerts` | Warning badges |

**When NOT to show:** `ophthalData` is `undefined`.

---

## 2. Data Family

### `lab_panel` — Flagged Lab Results

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `panelDate` | Yes | — |
| `flagged` | Yes (at least 1) | Card not shown if no flagged labs |
| `hiddenNormalCount` | Yes | `0` |
| `insight` | Yes | Empty string (InsightBox hidden) |

**When NOT to show:** No flagged labs exist for this patient.

**Adaptation:** If `hiddenNormalCount > 0`, show expandable "+ N normal" button. The `insight` field powers an InsightBox below the lab values — if empty string, InsightBox is hidden.

---

### `vitals_trend_bar` / `vitals_trend_line` — Vital Trends (Bar/Line Chart)

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `series` | Yes (at least 1) | Card not shown |

Each `VitalTrendSeries`:
| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `label` | Yes | — |
| `values` | Yes (at least 2 points) | Not shown if < 2 data points |
| `dates` | Yes | — |
| `tone` | Yes | `"ok"` |
| `unit` | Yes | — |
| `threshold` | Optional | No threshold line on chart |
| `thresholdLabel` | Optional | No label on threshold line |

**When NOT to show:** Patient has < 2 historical vital readings.

---

### `lab_trend` — Lab Value Trend Chart

Same structure as vitals trend, plus:
| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `parameterName` | Yes | — |

**When NOT to show:** Lab parameter has < 2 historical readings.

---

### `lab_comparison` — Lab Comparison Table

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `rows` | Yes (at least 1) | Card not shown |
| `insight` | Yes | Empty string (InsightBox hidden) |

Each `LabComparisonRow` — all fields required (parameter, prevValue, currValue, prevDate, currDate, delta, direction, isFlagged).

**When NOT to show:** Patient has no previous lab panel to compare against.

**Adaptation:** Flagged rows get a left-border accent (`border-l-[2px] border-tp-error-300`). Direction arrows (↑/↓/→) are color-coded.

---

### `med_history` — Medication History

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `entries` | Yes (at least 1) | Card not shown |
| `insight` | Yes | Empty string |

**When NOT to show:** No medication history available.

---

### `vaccination_schedule` — Vaccine Schedule

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `vaccines` | Yes (at least 1) | Card not shown |

Each vaccine: `name`, `dose`, `dueDate` (required), `status` (given/due/overdue).

**When NOT to show:** No vaccine data (typically only shown for pediatric patients or obstetric patients with vaccine tracking).

**Adaptation:** Status badges are color-coded: green (given), amber (due), red (overdue).

---

### `patient_timeline` — Chronological History

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `events` | Yes (at least 1) | Card not shown |

Each event: `date`, `summary`, `type` (visit/lab/procedure/admission) — all required.

**When NOT to show:** New patient with no prior events.

**Adaptation:** Type-coded dots: blue (visit), teal (lab), violet (procedure), red (admission).

---

## 3. Action Family

### `ddx` — Differential Diagnosis

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `context` | Yes | — |
| `options` | Yes (at least 1) | Card not shown |

Each `DDXOption`: `name`, `bucket` (can't_miss / most_likely / consider) — required. `selected` optional (default `false`).

**When NOT to show:** Insufficient clinical data to generate differentials (no symptoms AND no vitals).

**Adaptation:** Options are grouped by `bucket` tier. "Can't miss" tier always shown first with warning accent. Selected options are tracked for copy-to-RxPad.

---

### `protocol_meds` — Suggested Medications

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `diagnosis` | Yes | — |
| `meds` | Yes (at least 1) | Card not shown |
| `safetyCheck` | Yes | Empty string |
| `copyPayload` | Yes | — |

Each `ProtocolMed`: `name`, `dosage`, `timing`, `duration` (required). `notes` optional.

**When NOT to show:** No diagnosis selected/accepted yet.

**Adaptation:** If `safetyCheck` is non-empty, show safety InsightBox. Copy icons appear on hover for each med.

---

### `investigation_bundle` — Suggested Investigations

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `items` | Yes (at least 1) | Card not shown |
| `copyPayload` | Yes | — |

Each `InvestigationItem`: `name`, `rationale` (required). `selected` optional.

**When NOT to show:** No clinical context to generate investigation suggestions.

**Adaptation:** Items are selectable with checkboxes. SidebarLink changes text between "Copy selected to RxPad (N)" and "Copy all to RxPad" based on selection state.

---

### `follow_up` — Follow-Up Scheduling

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `context` | Yes | — |
| `options` | Yes (at least 1) | Card not shown |

Each `FollowUpOption`: `label`, `days` (required). `recommended` and `reason` optional.

**When NOT to show:** Consultation not yet at a stage where follow-up is relevant.

**Adaptation:** If an option has `recommended: true`, it gets a highlighted style. Reason text shown below the option label.

---

### `advice_bundle` — Patient Advice

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `items` | Yes (at least 1) | Card not shown |
| `shareMessage` | Yes | — |
| `copyPayload` | Yes | — |

**When NOT to show:** No diagnosis or context to generate advice.

---

### `voice_structured_rx` — Voice-to-RxPad Structured Output

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `voiceText` | Yes | — |
| `sections` | Yes (at least 1) | Card not shown |
| `copyAllPayload` | Yes | — |

Each `VoiceRxSection`: `sectionId`, `title`, `tpIconName`, `items[]` — all required.

**When NOT to show:** Voice input not captured or transcription failed.

---

### `rx_preview` — Prescription Preview

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `patientName` | Yes | — |
| `date` | Yes | — |
| `diagnoses` | Yes | — |
| `medications` | Yes | — |
| `investigations` | Yes | Empty array → section hidden |
| `advice` | Yes | Empty array → section hidden |
| `followUp` | Yes | — |

**When NOT to show:** No prescription data entered yet.

---

## 4. Analysis Family

### `ocr_pathology` — OCR Lab Report Extraction

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `category` | Yes | — |
| `parameters` | Yes (at least 1) | Card not shown |
| `normalCount` | Yes | `0` |
| `insight` | Yes | Empty string |

Each `OCRParameter`: `name`, `value` (required). `refRange`, `flag`, `confidence` optional.

**When NOT to show:** No uploaded document or OCR extraction failed.

**Adaptation:** Parameters with `flag` get ↑/↓ indicators. Low-confidence values get a subtle opacity treatment. Normal parameters are collapsed behind "+ N normal" button.

---

### `ocr_extraction` — OCR General Document Extraction

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `category` | Yes | — |
| `sections` | Yes (at least 1) | Card not shown |
| `insight` | Yes | Empty string |

Each `OCRSection`: `heading`, `icon`, `items[]`, `copyDestination` — all required.

**When NOT to show:** No uploaded document or OCR extraction failed.

---

## 5. Utility Family

### `translation` — Language Translation

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `sourceLanguage` | Yes | — |
| `targetLanguage` | Yes | — |
| `sourceText` | Yes | — |
| `translatedText` | Yes | — |
| `copyPayload` | Yes | — |

**When NOT to show:** No translation requested.

---

### `completeness` — Documentation Check

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `sections` | Yes | — |
| `emptyCount` | Yes | `0` |

Each `CompletenessSection`: `name`, `filled` (required). `count` optional.

**When NOT to show:** Always shown during consultation (it's a proactive check).

**Adaptation:** Badge shows "N empty" in neutral slate. Empty sections show unfilled circle icon. Action pills are generated dynamically from empty section names (e.g., "Investigation" → "Suggest inv" pill).

---

### `follow_up_question` — Clarifying Question

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `question` | Yes | — |
| `options` | Yes (at least 2) | Card not shown |
| `multiSelect` | Yes | `false` |

**When NOT to show:** No ambiguity requiring clarification.

**Adaptation:** If `multiSelect: true`, checkboxes are shown. If `false`, radio buttons. Submit button appears when at least 1 option selected.

---

### `clinical_guideline` — Evidence-Based Reference

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `condition` | Yes | — |
| `source` | Yes | — |
| `recommendations` | Yes (at least 1) | Card not shown |
| `evidenceLevel` | Yes | — |

**When NOT to show:** No relevant guideline for current clinical context.

**Adaptation:** Evidence level badge (A/B/C) with color coding: A = green, B = amber, C = slate.

---

### `referral` — Specialist Referral

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `specialist` | Yes | — |
| `department` | Yes | — |
| `reason` | Yes | — |
| `urgency` | Yes | — |
| `notes` | Optional | Notes section hidden |
| `attachments` | Optional | Attachments section hidden |

**When NOT to show:** No referral requested.

**Adaptation:** Urgency badge color: routine = slate, urgent = amber, emergency = red.

---

## 5b. Clinical Family (POMR)

### `pomr_problem_card` — Problem-Oriented Medical Record Card

**Data source:** `PomrProblemCardData` (derived from `SmartSummaryData.pomrProblems` + `keyLabs` + `activeMeds`)

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `problem` | Yes | — |
| `status` | Yes | — |
| `statusColor` | Yes | Default: `"amber"` |
| `completeness` | Yes | Default: `{ emr: 0, ai: 0, missing: 100 }` |
| `labs` | Optional | Labs section hidden |
| `meds` | Optional | Meds section hidden |
| `missingFields` | Optional | Missing fields section hidden |
| `labKeys` | Optional | Used to resolve labs from `keyLabs` |
| `vitalKeys` | Optional | Used to resolve vitals |
| `medKeys` | Optional | Used to resolve medications |
| `missingKeys` | Optional | Used to show missing data prompts |

**When NOT to show:** No `pomrProblems` in summary data.

**Data completeness donut (unique to this card):**
- 18px SVG with 3 arcs: green (EMR %) → amber (AI-extracted %) → gray (missing %)
- Hover tooltip: `"45% EMR · 30% AI · 25% missing"` + source document names from `dataProvenance`
- Rendered internally via `DataCompletenessDonut` component in CardShell's `headerExtra` slot

**Data provenance on labs:**
- Each lab value shows a 5px provenance dot: green (#22c55e) = EMR, amber (#f59e0b) = AI-extracted
- Source: `dataProvenance[labName].source`
- Only shown when provenance mapping exists

**Cross-problem flags:**
- If `crossProblemFlags` has high-severity items, rendered as InsightBox (red variant) below card body
- Max 2 flags shown

**Adaptation:** Card adjusts based on which data is available — empty sections are suppressed. Missing fields show as interactive chips with prompts (e.g., "Order PTH test").

---

## 6. Safety Family

### `drug_interaction` — Drug Interaction Warning

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `drug1` | Yes | — |
| `drug2` | Yes | — |
| `severity` | Yes | — |
| `risk` | Yes | — |
| `action` | Yes | — |

**When NOT to show:** No drug-drug interaction detected.

**Trigger:** Automatically checked when medications are added to RxPad. Card appears proactively.

**Adaptation:** Severity badge color: critical = red, high = orange, moderate = amber, low = slate. Card uses left-border accent instead of full red background.

---

### `allergy_conflict` — Allergy-Drug Conflict

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `drug` | Yes | — |
| `allergen` | Yes | — |
| `alternative` | Yes | — |

**When NOT to show:** No allergy-drug conflict detected.

**Trigger:** Automatically checked when medications are added and patient has known allergies.

---

## 7. Text Family

These are lightweight, cardless text outputs rendered as styled chat messages.

| Kind | Required Fields | Fallback |
|------|----------------|----------|
| `text_fact` | `value`, `context`, `source` | — |
| `text_alert` | `message`, `severity` | — |
| `text_list` | `items` (at least 1) | Not shown if empty |
| `text_step` | `steps` (at least 1) | Not shown if empty |
| `text_quote` | `quote`, `source` | — |
| `text_comparison` | `labelA`, `labelB`, `itemsA`, `itemsB` | Not shown if both arrays empty |

**Adaptation by variant:**
- `text_fact`: Large value display with smaller context and source citation
- `text_alert`: Severity-colored left border (red/amber/purple/teal)
- `text_list`: Bulleted list
- `text_step`: Numbered steps with blue step numbers and left border accent
- `text_quote`: Italic blockquote with violet left border and source citation
- `text_comparison`: Two-column layout with subtle background difference

---

## 8. Homepage / Operational Family

### `welcome_card` — Today's Schedule

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `greeting` | Yes | — |
| `date` | Yes | — |
| `stats` | Yes (at least 1) | — |
| `quickActions` | Optional | No action pills shown |

All stat boxes use neutral slate colors (`#64748B`). No per-stat color differentiation.

**When NOT to show:** Always shown on homepage.

**Note:** The greeting text is rendered as a separate `text_list` message ABOVE the welcome card, not inside it.

---

### `patient_list` — Patient Queue

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `items` | Yes (at least 1) | Card not shown |
| `totalCount` | Yes | — |

**Adaptation:** Status badges are tone-coded (warning = amber, success = green, info = blue, danger = red).

---

### `follow_up_list` — Pending Follow-Ups

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `items` | Yes (at least 1) | Card not shown |
| `overdueCount` | Yes | `0` |

**Adaptation:** Overdue items get red date text. "Send reminder to all" CTA appears as secondary outline button below card body.

---

### `revenue_bar` — Revenue Bar Chart

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `totalRevenue`, `totalPaid`, `totalDue` | Yes | — |
| `days` | Yes (at least 1) | Card not shown |

---

### `bulk_action` — Bulk Message/Action

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `action` | Yes | — |
| `messagePreview` | Yes | — |
| `recipients` | Yes (at least 1) | Card not shown |
| `totalCount` | Yes | — |

---

### Chart Cards (`donut_chart`, `pie_chart`, `line_graph`, `condition_bar`, `heatmap`)

All require `title` and their specific data arrays. Cards are not shown if the primary data array is empty.

### `analytics_table` — KPI Dashboard

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `title` | Yes | — |
| `kpis` | Yes (at least 1) | Card not shown |
| `insight` | Yes | Empty string (InsightBox hidden) |

---

### `billing_summary` — Session Billing

| Field | Required? | Fallback |
|-------|-----------|-----------------------|
| `items` | Yes (at least 1) | Card not shown |
| `totalAmount`, `totalPaid`, `balance` | Yes | — |

---

## 9. Cross-Cutting Rules

### Empty Section Suppression
**Rule:** Never show an empty section with placeholder text like "—" or "N/A". If a data field is missing/undefined, hide the entire section.

### Minimum Data Threshold
**Rule:** Each card has an implicit minimum — if the primary data array is empty (0 items), the card is not generated at all.

### InsightBox Suppression
**Rule:** If the `insight` field is an empty string, the InsightBox component is not rendered.

### Copy Payload
**Rule:** Cards with `copyPayload` or `copyAllPayload` always include the copy-to-clipboard and copy-to-RxPad functionality, regardless of data completeness.

### Data Completeness Donut Eligibility
**Rule:** Only show the completeness donut on cards with a **fixed expected data set** where missing data is clinically meaningful. Currently only `pomr_problem_card`. Do NOT show on cards that display whatever data happens to be available (patient_summary, lab_panel, vitals_trend, etc.).

### Data Provenance Indicators
**Rule:** Lab values in `InlineDataRow` may show a 5px provenance dot after the value text:
- Green (#22c55e) = data sourced from EMR (structured, reliable)
- Amber (#f59e0b) = data AI-extracted from uploaded documents (needs verification)
- Only rendered when `dataProvenance` mapping exists for that specific lab name
- Dot has a `title` tooltip showing the source type

### SBAR Section Ordering
**Rule:** The Patient Summary card (`GPSummaryCard`) orders its sections following the SBAR conceptual layout: Situation (context line) → Background (history) → Assessment (labs) → Last Visit → Recommendation (vitals). This is a section arrangement principle, not literal SBAR labels. Other cards should follow similar logic — context before actionable data.

### Safety Card Priority
**Rule:** `drug_interaction` and `allergy_conflict` cards are always shown IMMEDIATELY when triggered — they interrupt the normal card flow and appear at the top.

### Phase-Dependent Visibility
Some cards only appear during specific consultation phases:
| Phase | Cards Available |
|-------|----------------|
| `empty` | `patient_summary`, `symptom_collector`, completeness |
| `symptoms_entered` | + `ddx`, `investigation_bundle` |
| `dx_accepted` | + `protocol_meds`, `advice_bundle` |
| `meds_written` | + `follow_up`, `translation`, `rx_preview` |
| `near_complete` | + `completeness` (proactive check) |

Safety cards (`drug_interaction`, `allergy_conflict`) can appear at ANY phase.
