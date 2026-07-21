# Data Analytics Module

**Branch:** `TPA-data-analytics`
**Route:** `/data-analytics-x`
**Target:** `prod`
**UI framework:** Tesseract UI (`@dhspl-tatvacare/tesseract-ui` v1.0.6)
**Viewport:** Tablet and desktop only (768px+)

---

## What this is

A fully native React analytics dashboard that replaces the legacy PHP iframe analytics. It runs inside the existing Doctor Portal as a full-page Drawer overlay, built entirely on Tesseract UI components (not Ant Design).

**Why we built it:**
- The PHP dashboard only works in a browser. Mobile/desktop native apps cannot render it.
- Competitors (Practo, Cliniko, Kareo) ship built-in analytics as a standard feature.
- The iframe approach had load delays, auth mismatches, and inconsistent styling.

**What it covers:**
- **OPD:** 8 sections with 50+ KPIs, 35+ charts, 7 clinical sub-tabs
- **IPD:** 5 sections with 17+ KPIs, 10+ charts
- **Reports:** 14 CSV-exportable reports across financial, clinical, and reference categories
- **Tracking:** 12 MoEngage events covering the full user behavior funnel

This is the base analytics tier included in every subscription. For advanced needs, users can purchase a Power BI/Tableau data link integration.

---

## Documentation index

| Document | What it covers |
|---|---|
| [DATA-ANALYTICS-README.md](DATA-ANALYTICS-README.md) | This file. Feature spec, page structure, complete section inventory |
| [ANALYTICS-FRONTEND-HANDOVER.md](ANALYTICS-FRONTEND-HANDOVER.md) | Developer handover: file structure, data flow, architecture, how to extend |
| [ANALYTICS-PR-DOCUMENT.md](ANALYTICS-PR-DOCUMENT.md) | PR summary: what changed, architecture, product metrics, testing notes |
| [ANALYTICS-MOENGAGE-EVENTS.md](ANALYTICS-MOENGAGE-EVENTS.md) | MoEngage event catalog: 12 events, attributes, PM questions, funnel analysis |
| [ANALYTICS-KNOWN-LIMITATIONS.md](ANALYTICS-KNOWN-LIMITATIONS.md) | Features removed or deferred due to backend API restrictions |

---

## How it works

1. User clicks the analytics entry point in the Doctor Portal
2. A full-screen Drawer opens at `/data-analytics-x` (lazy-loaded, code-split)
3. A segmented control at the top toggles between OPD and IPD
4. A sidebar on the left lists sections for the active department
5. Filters (doctor, clinic, date range) sit above the content area
6. The active section renders KPI cards, charts, and donuts below

**Filters:**
- **Date range:** Preset options (Today, Past 7 days, Past 30 days, This month, Last month, This year, Custom range) with a 31-day cap
- **Doctor:** Multi-select dropdown (admin doctors see all; sub-doctors are locked to themselves)
- **Clinic:** Multi-select dropdown showing only clinics the logged-in doctor has access to

**User access:**
- Admin doctors see all doctors and all clinics
- Sub-doctors are locked to their own data (dropdown disabled, auto-selected)
- IPD tab only appears for accounts with an IPD module
- Consultation mode labels gated by GrowthBook feature flags

---

## Page structure: OPD sections

### 1. Overview

Your OPD practice at a glance.

**KPIs (12):**
Total consultations, Total collected, Total due, Total refunded, Advance received, Advance refunded, Advance debited, Top consultation mode, Top diagnosis, Top symptom, Top medication, Top medical condition

**Charts (5):**
| Chart | Type | Notes |
|---|---|---|
| Consultations by week | Line/trend | Only when month-scoped date range |
| Appointment status | Donut | Completed, Cancelled, Draft, etc. |
| Consultation mode mix | Donut | In-person, Video, Walk-in split |
| Top medications | Donut | Top 5 prescribed medications |
| Gender distribution | Donut | Male/Female/Other patient split |

---

### 2. Appointments

Volume, status and case mix.

**KPIs (11):**
Total footfall, Completed visits, In queue, Draft, Pending digitization (SnapRx-gated), Cancelled, In-clinic visits, Video consultations (video-gated), Cancellation rate, Avg visits per day, Busiest day

**Charts (5):**
| Chart | Type | Notes |
|---|---|---|
| Appointment status | Donut | Status breakdown across all appointments |
| New vs returning | Donut | First-time vs repeat patients |
| Case-type mix | Bar | Distribution by case type |
| Visits by day of week | Bar | Averages when range > 7 days; only shows when range >= 7 days |
| Visits by hour | Bar | Hourly heatmap; only shows for single-day ranges |

---

### 3. Consultation Modes

In-person, video and walk-in split.

**KPIs (4):**
Total consultations, Top mode, AI-assisted Rx, Most active doctor

**Charts (3):**
| Chart | Type | Notes |
|---|---|---|
| Consultation mode mix | Donut | Split across all enabled modes |
| Mode adoption over time | Line/trend | Only when month-scoped |
| Usage by doctor | Stacked bar | Per-doctor mode breakdown; batched in groups of 4 |

---

### 4. Billing (shared OPD + IPD)

Collections, revenue and payment mix.

**KPIs (8):**
Total billed, Total collected, Total bill due, Total bill refunded, Advance received, Advance refunded, Advance debited, Avg bill value

**Charts (4):**
| Chart | Type | Notes |
|---|---|---|
| Billed amount status | Donut | Collected vs Due split |
| Collection by mode | Donut | Cash, Card, UPI, etc. |
| Refund by mode | Donut | Refund payment method split |
| Advance deposit status | Donut | Applied to bills / Refunded / Available balance |

---

### 5. Patients

New vs returning and demographics.

**KPIs (6):**
Total patients, One-time visitors, Returning patients, Top blood group, Top marital status, Avg patient age

**Charts (7):**
| Chart | Type | Notes |
|---|---|---|
| Gender distribution | Donut | Male/Female/Other |
| Marital status | Donut | Married/Single/etc. |
| Blood group distribution | Donut | Top blood groups |
| Age distribution | Bar | Age bands |
| Visit frequency | Bar | 1 visit, 2-3 visits, 4+ visits |
| Top cities | Donut | Patient geography |
| Patient segments | Donut | RFM segmentation |

---

### 6. Care (7 sub-tabs)

Diagnoses, conditions and outcomes.

#### Care Overview (default sub-tab)
**KPIs (4):** Top medication, Top investigation, Top vital, Top advice
**Charts (6):** Top medications (donut), Top investigations (donut), What's getting measured (donut), Top advice given (donut), Top vaccines given (donut), Top diagnoses (donut)

#### Diagnoses
**KPIs (2):** Top diagnosis, Patients with diagnosis
**Charts (2):** Top diagnoses (donut), Diagnoses over time (line/trend)

#### Medications
**KPIs (3):** Top medication, Total prescribed, Drugs per prescription
**Charts (6):** Top medications (donut), Top generics (donut), Top manufacturers (donut), Catalog vs custom (donut), Custom medicines by doctor (bar), Medications over time (line/trend)

#### Investigations
**KPIs (3):** Top investigation, Suggested investigations, Consults with investigation (%)
**Charts (3):** Top investigations (donut), Investigations by doctor (stacked bar), Investigations over time (line/trend)

#### Vitals
**KPIs (2):** Top vital, Total recordings
**Charts (6):** What's getting measured (donut), Blood pressure stages (donut), BMI distribution (bar), BMI coverage (donut), Repeat monitoring (donut), Vitals recorded over time (line/trend)

#### Advice
**KPIs (3):** Top advice, Total advice given, Patients advised
**Charts (3):** Top advice given (donut), Advice by doctor (stacked bar), Advice given over time (line/trend)

#### Vaccines
**KPIs (3):** Top vaccine, Doses administered, Patients vaccinated
**Charts (4):** Top vaccines given (donut), Top vaccine brands (donut), IAP schedule vs others (donut), Doses administered over time (line/trend)

> **Removed sub-tabs:** Symptoms, Examination, Medical History, Certificates, and Custom Modules are built but hidden due to backend data quality issues. See [ANALYTICS-KNOWN-LIMITATIONS.md](ANALYTICS-KNOWN-LIMITATIONS.md) for details.

---

### 7. Messages

Bulk SMS and WhatsApp campaign reach.

**KPIs (5):**
Credit balance, Campaigns sent, Patients reached, Scheduled campaigns, Avg reach per campaign

**Charts (3):**
| Chart | Type | Notes |
|---|---|---|
| Delivered vs scheduled | Donut | Delivery status split |
| Channel mix | Donut | SMS vs WhatsApp |
| Patient reach by campaign | Bar | Per-campaign reach; conditional |

---

### 8. Reports (CSV exports)

14 downloadable reports across 3 categories, with filter controls and table preview before download.

**Financial reports (6):**
1. Daily Collection (OPD + IPD) - Cash memo, receipt, advance, refund for a single day
2. Collection Report (OPD + IPD) - General / Detailed / Day Wise sub-types
3. Incentive Reports (OPD) - Detailed / Overall sub-types
4. 3C Report (OPD) - Cash, invoice, credit-note; Summary / Details sub-types
5. Billing Overall Reports (OPD + IPD) - Revenue / Cash Flow sub-types
6. IPD Reports (IPD) - Admitting / Discharged patient reports with financials

**Clinical reports (4):**
7. Appointment Analytics (OPD) - General / Detailed / Overall sub-types
8. IPD Analytics (IPD) - Inpatient clinical activity
9. Prescription Analytics (OPD) - Brand, generic, company volumes
10. Prescription Medicine Detailed (OPD) - Medicine-level detail

**Reference reports (4):**
11. Referred by Patients (OPD) - Patients who referred others
12. Referred by Others (OPD) - External referrer breakdown
13. Inpatient References (IPD) - IPD referrer breakdown
14. Patient Reference Source (OPD) - How patients found the practice

---

## Page structure: IPD sections

### 1. IPD Overview

Your inpatient service at a glance.

**KPIs (7):**
Current census, Total admissions, Total discharges, Net patient flow (admissions minus discharges), Bed occupancy rate (%), Avg length of stay (days), Avg daily census

**Charts (2):**
| Chart | Type | Notes |
|---|---|---|
| Admissions vs discharges | Line/trend | Only for multi-day ranges |
| Census over time | Line/trend | Only for multi-day ranges |

---

### 2. Admissions and Discharges

Patient flow, discharge mix and length of stay.

**KPIs (5):**
Total admissions, Total discharges, Avg length of stay (days), Discharge queue, Longest stay (days)

**Charts (4):**
| Chart | Type | Notes |
|---|---|---|
| Discharge types | Donut | Recovered, Referred, LAMA, DAMA, Transfer out, Death |
| Admissions by department | Bar | Which departments admit the most |
| Admissions by ward | Bar | Which wards receive the most admissions |
| Length of stay distribution | Bar | 0-1d, 2-3d, 4-7d, 8-14d, 15d+ bands |

---

### 3. Wards and Beds

Occupancy and bed utilisation.

**KPIs (5):**
Total wards, Total beds, Beds occupied, Beds available, Bed occupancy rate (%)

**Charts (4):**
| Chart | Type | Notes |
|---|---|---|
| Beds per ward | Bar | Occupied vs total capacity per ward |
| Occupancy rate by ward | Bar | Occupancy % for each ward |
| Bed distribution | Donut | How total beds are allocated across wards |
| Avg length of stay by ward | Bar | ALOS per ward |

---

### 4. IPD Billing

Same structure as OPD Billing (shared component). See Billing section above.

---

### 5. IPD Reports

IPD-specific reports from the Reports tab (Daily Collection, Collection Report, IPD Reports, IPD Analytics, Inpatient References).

---

## Architecture

```
User opens /data-analytics-x
  |
  v
App.js (lazy-loaded route)
  |
  v
DataAnalyticsPage.jsx (shell)
  |-- SegmentedControl (OPD/IPD toggle)
  |-- Sidebar (section nav from analyticsNav.js)
  |-- HeroBanner (section title)
  |-- FilterBar (doctor/clinic/date filters)
  |-- Active Section Component
        |-- useXxxData(filters) hook
        |     |-- cached() wrapper (30s dedup cache)
        |     |-- ApiReporting.xxx() -> GET /api/v1/reports/...
        |     |-- Returns { loading, kpis, chartData, ... }
        |-- KpiRow (KPI card strip)
        |-- ChartGrid > ChartTile (chart cards)
        |-- DonutWithLegend / BarChartZ / LineChartZ
```

**Key architectural decisions:**
- **Tesseract UI only** - no Ant Design components inside this module
- **CSS scoped under `.da-root`** - prevents style leaks into the host app
- **Code-split** - Tesseract styles and the module chunk only load when opened
- **One hook per section** - each section has its own data hook with isolated state
- **30s API cache** - shared across sections, prevents redundant fetches
- **`safe()` wrappers** - API failures render gracefully as "No data" instead of crashing
- **Zero-fill everywhere** - charts always show the expected categories even when backend omits them

---

## MoEngage event tracking

12 events organized by user behavior funnel. Every event carries the mandatory doctor/hospital base attribute set (doctor_name, doctor_id, hospital_name, hospital_id, doctor_specialty, module).

| Event | Funnel stage | When it fires |
|---|---|---|
| `TP_Analytics_Opened` | Acquisition | User opens the analytics drawer |
| `TP_Analytics_Closed` | Acquisition | User closes the drawer (includes time_spent_seconds) |
| `TP_Analytics_DeptSwitch` | Navigation | User toggles OPD/IPD |
| `TP_Analytics_SectionView` | Navigation | User clicks a sidebar section |
| `TP_Analytics_SubtabView` | Navigation | User switches sub-tabs (Care/Grow) |
| `TP_Analytics_FilterApplied` | Interaction | User changes date/doctor/clinic filter |
| `TP_Analytics_FilterCleared` | Interaction | User clicks "Clear all" |
| `TP_Analytics_Refresh` | Interaction | User clicks refresh button |
| `TP_Analytics_ReportOpened` | Conversion | User opens a report preview |
| `TP_Analytics_ReportDownloaded` | Conversion | User downloads a CSV (includes rows_exported) |
| `TP_Analytics_ReportError` | Reliability | CSV download fails |
| `TP_Analytics_DataError` | Reliability | Report returns zero rows |

See [ANALYTICS-MOENGAGE-EVENTS.md](ANALYTICS-MOENGAGE-EVENTS.md) for the complete attribute reference.

---

## Performance optimizations

| Optimization | Where | Impact |
|---|---|---|
| API request cache (30s TTL) | `apiCache.js` | Prevents redundant fetches on section switches |
| React.memo | DonutWithLegend, KpiRow | Skips re-render when props unchanged |
| useMemo on derived data | Overview, Billing, Care sections | Avoids recomputing on every render |
| Module-level constants | Tooltip maps, zero KPI objects | No per-render object allocations |
| Deferred fallback calls | Overview | Primary burst: 5 calls; 3 fallback calls fire only if needed |
| Sub-tab state merging | Care section | Tab switch preserves already-loaded data |
| Batched fan-out | Consultation Modes | Per-doctor calls batch in groups of 4 |
| Top-5 cap on donuts | DonutWithLegend | Sorted descending, sliced to top 5 |

---

## Known limitations

See [ANALYTICS-KNOWN-LIMITATIONS.md](ANALYTICS-KNOWN-LIMITATIONS.md) for the full list with details.

1. **7 features removed from UI:** Grow section (OPD), 5 Care sub-tabs (Symptoms, Examination, Medical History, Certificates, Custom Modules), Clinical Activity (IPD) -- all due to backend data gaps
2. **Multi-filter limited on clinic/* endpoints:** Only single doctorId/clinicId accepted; multi-select falls back to "all"
3. **31-day date range cap:** Custom ranges beyond 31 days are clamped to the most recent 31 days
4. **IPD discharge types always empty:** Backend returns empty array despite having discharge counts
5. **Top-cards doctorId returns 0:** Backend accepts the filter but does not apply it to the query

---

## Local development

```bash
npm install --legacy-peer-deps
npm run start:dev              # needs local .env.dev with auth tokens
```

Open `http://localhost:3000/data-analytics-x` after login. The reporting API base URL is configured per environment in `src/EnvironmentConfig.js`.

| Environment | Reporting API |
|---|---|
| UAT | `https://pm-reporting-uat.tatvacare.in` |
| QA | `https://pm-reporting-qa.tatvacare.in` |
| Prod | `https://pm-reporting-prod.tatvacare.in` |
| Preprod | `https://pm-reporting-preprod.tatvacare.in` |

---

## File structure

```
src/pages/data-analytics/
  index.js                        # Module entry point
  DataAnalyticsPage.jsx           # Shell: Drawer + Sidebar + filters + section routing
  data-analytics.css              # Scoped CSS overrides

  shell/
    analyticsNav.js               # OPD_NAV (9 sections), IPD_NAV (4 sections), hero copy

  filters/
    FilterBar.jsx                 # Doctor/clinic multi-select + date range picker
    periods.js                    # Date presets and range helpers

  sections/                       # One component per dashboard section
    OverviewSection.jsx           # OPD overview
    AppointmentsSection.jsx       # Appointment analytics
    ConsultationModesSection.jsx  # Mode split + per-doctor breakdown
    BillingSection.jsx            # OPD + IPD billing (shared)
    PatientsSection.jsx           # Demographics, retention, segments
    CareSection.jsx               # 12 clinical sub-tabs
    GrowSection.jsx               # Follow-ups, ABHA
    MessagesSection.jsx           # Campaign analytics
    InpatientOverviewSection.jsx  # IPD overview
    AdmissionsDepthSection.jsx    # Admissions + discharges
    WardsSection.jsx              # Ward occupancy + bed utilisation
    KpiRow.jsx                    # Reusable KPI card strip
    SectionBlock.jsx              # "More insights" container
    ChartLayout.jsx               # ChartGrid + ChartTile wrappers
    TrendTile.jsx                 # Line chart tile

  charts/
    DonutWithLegend.jsx           # Donut chart + legend (React.memo)
    EmptyAware.jsx                # Zero-state chart wrappers
    adapters.js                   # API shape -> chart data converters
    format.js                     # Number/currency/percent formatters
    scaffolds.js                  # Empty chart data constants

  data/                           # One hook per section
    apiCache.js                   # Request dedup cache (30s TTL)
    deltaUtils.js                 # Delta calculations, safe(), zero-fill helpers
    analyticsTracking.js          # MoEngage event helper (12 events)
    useCapabilities.js            # Role detection, feature flags
    useFilterOptions.js           # Doctor/clinic filter lists
    useOverviewData.js
    useAppointmentsData.js
    useAppointmentsLive.js
    useBillingLive.js
    useCareData.js
    useConsultationModesData.js
    usePatientsData.js
    useGrowData.js
    useMessagesData.js
    useInpatientData.js
    useAdmissionsData.js
    useWardsData.js
    useClinicalActivityData.js

  reports/
    ReportsTab.jsx                # Report card grid
    reportsCatalog.js             # 14 report definitions
    ReportTable.jsx               # Data table with pagination
    ReportDownloadDrawer.jsx      # Filter + preview + CSV download
    tableUtils.js                 # Cell formatters

docs/
  DATA-ANALYTICS-README.md        # This file
  ANALYTICS-FRONTEND-HANDOVER.md  # Developer handover
  ANALYTICS-PR-DOCUMENT.md        # PR summary
  ANALYTICS-MOENGAGE-EVENTS.md   # MoEngage event catalog
  ANALYTICS-KNOWN-LIMITATIONS.md  # Features removed/deferred due to backend restrictions
```
