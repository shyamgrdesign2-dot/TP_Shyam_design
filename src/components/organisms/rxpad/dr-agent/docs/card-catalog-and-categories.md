# Card Catalog & Categorization

## Overview

The Doctor Agent renders **63 card variants** organized into families. Each card has:
- A **kind** (discriminated union tag in `RxAgentOutput`)
- A **family** (logical grouping by clinical purpose)
- A **data type** (TypeScript interface in `types.ts`)
- A **component** (React component in `cards/` subdirectory)

### Categorization Principle

Cards are categorized by **what they serve the doctor**:

| Category | Purpose | Donut Eligible? |
|----------|---------|-----------------|
| **Summary** | Patient overview at consultation start | No — displays available data |
| **Data** | Lab/vital/med data display and trends | No — displays available data |
| **Clinical** | Problem-oriented analysis with expected data sets | **Yes** — fixed expected fields |
| **Action** | Decision support → copy to RxPad | No — generates suggestions |
| **Analysis** | Document processing (OCR) | No — extracts from uploads |
| **Utility** | Helper tools (translate, completeness, etc.) | No — utility functions |
| **Safety** | Critical alerts that interrupt workflow | No — alert-only |
| **Text** | Lightweight text responses (no card shell) | No — text-only |
| **Operational** | Clinic-level operational dashboard | No — operational data |

**Donut chart rule**: Only show the data completeness donut on cards with a **fixed expected data set** where missing data is clinically meaningful. Currently only `pomr_problem_card` qualifies — it manages its own donut internally.

---

## Card Families

### A. Summary Family (8 cards)

Cards that present patient overviews and intake data. Shown at consultation start or when the doctor asks for a snapshot. Content follows **SBAR conceptual ordering** (Situation → Background → Assessment → Recommendation).

| Kind | Component | Description | When Shown |
|------|-----------|-------------|------------|
| `sbar_overview` | SbarOverviewCard | SBAR-structured patient summary (Situation, Background, Assessment, Recommendation) | "Summary" pill, "sbar" query, pre-consult prep |
| `patient_summary` | GPSummaryCard | Full detailed patient overview: history, labs, last visit, vitals | "Detailed summary" pill, explicit request |
| `symptom_collector` | PatientReportedCard | Patient-reported symptoms from intake form | Consultation start (if intake data exists) |
| `last_visit` | LastVisitCard | Previous visit summary with copy-to-rx | "Last visit" pill, data_retrieval intent |
| `obstetric_summary` | ObstetricSummaryCard | Obstetric data (GP, EDD, ANC, vaccines) | Obstetric patients, specialty tab |
| `gynec_summary` | GynecSummaryCard | Gynecological history | Gynec patients, specialty tab |
| `pediatric_summary` | PediatricSummaryCard | Growth, milestones, vaccines | Pediatric patients, specialty tab |
| `ophthal_summary` | OphthalSummaryCard | Visual acuity, IOP, fundus | Ophthal patients, specialty tab |

**GPSummaryCard section order (SBAR):**
1. Situation — Context line (chronic conditions + presenting symptoms, shown only when no PatientReportedCard)
2. Background — History (chronic conditions, allergies)
3. Assessment — Key Labs (with provenance dots: green=EMR, amber=AI-extracted)
4. Last Visit — Previous care context (Sx, Dx, Rx — copyable)
5. Recommendation — Today's Vitals (with abnormal flags)
6. Specialty embed (if applicable)
7. Cross-problem InsightBox flags (max 2 high-severity)

### B. Data Family (8 cards)

Cards that display clinical data — labs, vitals, trends, timelines. Read-only or with copy functionality. These display **whatever data is available** — no fixed expected set.

| Kind | Component | Description | When Shown |
|------|-----------|-------------|------------|
| `lab_panel` | LabPanelCard | Flagged lab results in grid table | "Lab overview" pill, lab queries |
| `vitals_trend_bar` | VitalsTrendChart (bar) | Vitals over time as bar chart | "Vital trends" pill, comparison intent |
| `vitals_trend_line` | VitalsTrendChart (line) | Vitals over time as line chart | "Graph view" pill |
| `lab_trend` | VitalsTrendChart (lab) | Single lab parameter trend | "HbA1c trend" pill |
| `lab_comparison` | LabComparisonCard | Previous vs current lab values with deltas | "Lab comparison" pill |
| `med_history` | MedHistoryCard | Medication history timeline | "Med history" pill |
| `vaccination_schedule` | VaccinationScheduleCard | Vaccine schedule with status badges | Pediatric context, vaccine queries |
| `patient_timeline` | PatientTimelineCard | Chronological event timeline | "View all records" navigation |

### C. Clinical Family (2 cards + donut component)

Problem-oriented cards for patients with chronic/multi-morbidity conditions. These are the **only cards with data completeness indicators** because they require a fixed expected data set.

| Kind | Component | Description | When Shown |
|------|-----------|-------------|------------|
| `pomr_problem_card` | PomrProblemCard | Per-problem card (CKD, HTN, DM, Anaemia) with completeness donut, labs, meds, missing fields | POMR problem pills, clinical keyword queries |
| `sbar_critical` | SbarCriticalCard | SBAR-structured emergency summary for critical patients | Critical patient detected (SpO2 < 90, emergency vitals) |

**PomrProblemCard structure:**
- Header: Problem name + status badge + internal completeness donut (18px SVG)
- Donut: 3 arcs — green (EMR), amber (AI-extracted), gray (missing) — with hover tooltip showing percentages + source documents
- Body: InlineDataRows for relevant labs (with provenance dots), medication pills, missing field chips with prompts
- Only rendered when `pomrProblems` data exists in the summary

**Supporting component:**
| Component | File | Purpose |
|-----------|------|---------|
| `DataCompletenessDonut` | `DataCompletenessDonut.tsx` | 18px SVG donut with 3 arcs (EMR/AI/missing) + hover tooltip |

### D. Action Family (7 cards)

Cards that drive clinical decisions — the doctor interacts, selects, and copies to RxPad.

| Kind | Component | Interaction | When Shown |
|------|-----------|-------------|------------|
| `ddx` | DDXCard | Checkbox selection → Copy to Diagnosis | "Suggest DDX" pill, dx_accepted phase |
| `protocol_meds` | ProtocolMedsCard | Review + Copy to Medication | "Protocol meds" pill, dx_accepted phase |
| `investigation_bundle` | InvestigationCard | Checkbox selection → Copy to RxPad | "Suggest investigations" pill |
| `follow_up` | FollowUpCard | Radio selection → Set follow-up | "Plan follow-up" pill |
| `advice_bundle` | AdviceBundleCard | Copy advice → Share with patient | "Generate advice" pill |
| `voice_structured_rx` | VoiceStructuredRxCard | Section-by-section Copy to RxPad | Voice dictation |
| `rx_preview` | RxPreviewCard | Final prescription summary | "Visit summary" pill, near_complete phase |

### E. Analysis Family (2 cards)

Cards that process uploaded documents using OCR.

| Kind | Component | Description | When Shown |
|------|-----------|-------------|------------|
| `ocr_pathology` | OCRPathologyCard | Structured lab report with parameters | Document upload (lab report) |
| `ocr_extraction` | OCRFullExtractionCard | Multi-section document extraction | Document upload (discharge summary, etc.) |

### F. Utility Family (5 cards)

Helper cards for translation, completeness, guidelines, referrals, and follow-up questions.

| Kind | Component | Description | When Shown |
|------|-----------|-------------|------------|
| `translation` | TranslationCard | Source → target language translation | "Translate" pill |
| `completeness` | CompletenessCard | RxPad section fill status | "Completeness check" pill |
| `follow_up_question` | FollowUpQuestionCard | Agent asks doctor for clarification | Agent needs more info |
| `clinical_guideline` | ClinicalGuidelinesCard | Evidence-based recommendations | Clinical question intent |
| `referral` | ReferralCard | Specialist referral with urgency | "Refer patient" action |

### G. Safety Family (2 cards)

Critical safety alerts that interrupt workflow.

| Kind | Component | Description | When Shown |
|------|-----------|-------------|------------|
| `drug_interaction` | DrugInteractionCard | Drug-drug interaction alert | Medication entry triggers check |
| `allergy_conflict` | AllergyConflictCard | Drug-allergy conflict alert | Medication entry triggers check |

### H. Text Family (7 variants)

Lightweight text-only responses (no card shell needed for simple answers).

| Kind | Rendering | Description | When Shown |
|------|-----------|-------------|------------|
| `text_fact` | Inline box | Single fact with source citation | Clinical knowledge queries |
| `text_alert` | Severity-colored bar | Critical/high/moderate/low alerts | Safety warnings |
| `text_list` | Bulleted list | Simple list of items | List-type responses |
| `text_step` | Numbered steps with left accent | Step-by-step instructions | Procedure instructions |
| `text_quote` | Italic blockquote | Clinical reference quotation | Guideline citations |
| `text_comparison` | Two-column grid | Side-by-side comparison | Drug/treatment comparisons |
| `patient_narrative` | Violet-bordered paragraph | Patient narrative block (no CardShell) | Inline clinical narrative display |

### I. Operational Family (19 cards)

Clinic-level operational cards for the homepage dashboard.

| Kind | Component | Description | When Shown |
|------|-----------|-------------|------------|
| `welcome_card` | WelcomeCard | Daily greeting with stats and tips | Homepage load |
| `patient_list` | PatientListCard | Queue or filtered patient list | "View Queue" pill |
| `patient_search` | PatientSearchCard | Patient search results with clickable entries | "Search patient" query |
| `follow_up_list` | FollowUpListCard | Upcoming follow-ups with overdue flags | "Follow-ups" pill |
| `revenue_bar` | RevenueBarCard | Daily revenue bar chart | "Revenue" pill |
| `revenue_comparison` | RevenueComparisonCard | Revenue comparison across two date ranges | "Compare revenue" pill |
| `bulk_action` | BulkActionCard | Batch SMS/reminder interface | "Send reminders" pill |
| `external_cta` | ExternalCtaCard | External link CTA (reports, tools) | Contextual external links |
| `donut_chart` | DonutChartCard | Patient distribution donut | "Demographics" pill |
| `pie_chart` | PieChartCard | Consultation type breakdown | Analytics queries |
| `line_graph` | LineGraphCard | Daily patient count trend | "Patient volume" pill |
| `analytics_table` | AnalyticsTableCard | KPI dashboard with week-over-week | "Weekly KPIs" pill |
| `condition_bar` | ConditionBarCard | Top conditions horizontal bars | "Diagnosis breakdown" pill |
| `heatmap` | HeatmapCard | Appointment density heatmap | "Busiest hours" pill |
| `billing_summary` | BillingSummaryCard | Session billing with payment status | Billing queries |
| `anc_schedule_list` | ANCScheduleListCard | ANC schedule with overdue/due patients | "ANC schedule" pill, obstetric operational queries |
| `follow_up_rate` | FollowUpRateCard | Follow-up rate analytics with trend | "Follow-up rate" pill |
| `vaccination_due_list` | VaccinationDueListCard | Vaccination due/overdue patient list | "Vaccination due" pill |
| `due_patients` | DuePatientsCard | Patient dues summary with total amount | "Pending dues" pill |

---

## Card Architecture

### Shared Components

All cards build on these primitives:

| Component | File | Purpose |
|-----------|------|---------|
| `CardShell` | `CardShell.tsx` | Outer wrapper: header (icon + title + date + badge + headerExtra), collapse/expand, copy button, children, actions (pills), sidebarLink (CTA) |
| `ChatPillButton` | `ActionRow.tsx` | Follow-up action pill buttons below card content |
| `SidebarLink` | `SidebarLink.tsx` | CTA below divider (e.g., "Copy to RxPad", "View full report") |
| `InsightBox` | `InsightBox.tsx` | AI insight callout (red/amber/purple/teal variants) |
| `CopyIcon` | `CopyIcon.tsx` | Copy-to-clipboard icon with Linear/Bulk variant |
| `DataRow` | `DataRow.tsx` | Key-value row with optional copy |
| `CheckboxRow` | `CheckboxRow.tsx` | Multi-select checkbox row |
| `RadioRow` | `RadioRow.tsx` | Single-select radio row |
| `InlineDataRow` | `InlineDataRow.tsx` | Inline key-value pairs with optional provenance dots and flags |
| `SectionTag` | `SectionTag.tsx` | Section heading with icon |
| `DataCompletenessDonut` | `DataCompletenessDonut.tsx` | 18px SVG donut for data completeness (used internally by POMR cards) |
| `EmbeddedSpecialtyBox` | `EmbeddedSpecialtyBox.tsx` | Compact specialty data embed within Patient Summary |

### Design System Elements

| Element | Specification | Usage |
|---------|--------------|-------|
| **Provenance dot** | 5px circle, inline after value text | Green (#22c55e) = EMR, Amber (#f59e0b) = AI-extracted |
| **Completeness donut** | 18px SVG, 3 arcs + hover tooltip | Green = EMR data, Amber = AI-extracted, Gray = missing |
| **Flag colors** | Red = high/critical, Amber = warning, Green = normal | Used on InlineDataRow values |
| **InsightBox variants** | Red, Amber, Purple, Teal | Cross-problem flags use Red (high) or Amber (medium) |
| **CardShell headerExtra** | Slot between badge and collapse chevron, `ml-[4px]` spacing | Used for donut on POMR cards |

### File Organization

```
cards/
  CardShell.tsx              # Shared card wrapper (with headerExtra slot)
  CardRenderer.tsx           # Discriminated union → component router
  ActionRow.tsx              # ChatPillButton + row divider
  SidebarLink.tsx            # CTA link component
  InsightBox.tsx             # AI insight callout
  CopyIcon.tsx               # Copy icon with variants
  CopyTooltip.tsx            # Copy feedback tooltip
  DataRow.tsx                # Key-value row
  CheckboxRow.tsx            # Checkbox row
  RadioRow.tsx               # Radio row
  InlineDataRow.tsx          # Inline data pairs (with provenance dots)
  SectionTag.tsx             # Section heading
  DataCompletenessDonut.tsx  # Donut SVG component
  action/                    # Action family cards
    DDXCard.tsx
    FollowUpCard.tsx
    InvestigationCard.tsx
    ProtocolMedsCard.tsx
    RxPreviewCard.tsx
    VoiceStructuredRxCard.tsx
  clinical/                  # Clinical family cards (POMR)
    PomrProblemCard.tsx
  data/                      # Data family cards
    LabComparisonCard.tsx
    LabPanelCard.tsx
    MedHistoryCard.tsx
    PatientTimelineCard.tsx
    VaccinationScheduleCard.tsx
    VitalsTrendChart.tsx
  summary/                   # Summary family cards
    GPSummaryCard.tsx
    EmbeddedSpecialtyBox.tsx
  homepage/                  # Homepage/operational cards
    AnalyticsTableCard.tsx
    BillingSummaryCard.tsx
    BulkActionCard.tsx
    ConditionBarCard.tsx
    DonutChartCard.tsx
    FollowUpListCard.tsx
    HeatmapCard.tsx
    LineGraphCard.tsx
    PatientListCard.tsx
    PieChartCard.tsx
    RevenueBarCard.tsx
    WelcomeCard.tsx
  utility/                   # Utility & safety cards
    AllergyConflictCard.tsx
    ClinicalGuidelinesCard.tsx
    CompletenessCard.tsx
    DrugInteractionCard.tsx
    FollowUpQuestionCard.tsx
    OCRFullExtractionCard.tsx
    OCRPathologyCard.tsx
    ReferralCard.tsx
    TranslationCard.tsx
```

---

## Intent → Card Mapping

| Intent Category | Cards Produced |
|----------------|---------------|
| `data_retrieval` | patient_summary, last_visit, lab_panel, med_history, specialty summaries |
| `clinical_decision` | ddx, protocol_meds, investigation_bundle, clinical_guideline, pomr_problem_card |
| `action` | follow_up, advice_bundle, translation, rx_preview |
| `comparison` | lab_comparison, vitals_trend_bar, vitals_trend_line, lab_trend |
| `document_analysis` | ocr_pathology, ocr_extraction |
| `clinical_question` | drug_interaction, text_fact, text_quote, text_alert |
| `operational` | welcome_card, patient_list, follow_up_list, revenue_bar, analytics_table, etc. |
| `follow_up` | follow_up_question |
| `ambiguous` | text response (no card) |

---

## Donut Chart Eligibility Rules

**Show donut when:**
- The card requires a **fixed set of expected data fields** (e.g., a CKD problem card expects: Creatinine, GFR, Hemoglobin, Calcium, Phosphorus, PTH)
- Missing data is **clinically meaningful** — the doctor should know what's not available

**Do NOT show donut when:**
- The card displays **whatever data is available** with no fixed expectation
- Examples: Patient Summary (shows available vitals/labs/history), Lab Panel (shows available labs), Vital Trends (shows available vitals)

**Currently donut-eligible cards:**
- `pomr_problem_card` — manages its own donut internally in the CardShell header

**Implementation note:** The donut is rendered by `DataCompletenessDonut.tsx` and passed as `headerExtra` prop to `CardShell`. CardRenderer does NOT apply donut overlays — each eligible card handles its own donut.
