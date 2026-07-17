# Data Analytics Module: Frontend Handover

**Branch:** `Tp_new_data_analytics_shyam`
**Route:** `/data-analytics-x` (lazy-loaded in `src/App.js:52,787`)
**Date:** 2026-07-17

---

## 1. What this module is

A full-page analytics dashboard built on `tesseract-ui` components, rendered inside a Drawer overlay. It replaces the legacy PHP analytics and covers two departments: **OPD** (9 sections) and **IPD** (4 sections).

**Supported viewports: tablet and desktop only.** Mobile is not supported for this module as of now. The layout, sidebar, and chart grids are designed for wider screens. Do not add mobile-specific breakpoints or test on phone dimensions.

---

## 2. File structure

```
src/pages/data-analytics/
  index.js                  # re-exports DataAnalyticsPage
  DataAnalyticsPage.jsx     # shell: Drawer + Sidebar + SegmentedControl + FilterBar + section routing
  data-analytics.css        # scoped overrides (host-app cascade fixes, card styles, tab fixes)

  shell/
    analyticsNav.js         # nav config (OPD_NAV, IPD_NAV), hero titles per section

  filters/
    FilterBar.jsx           # doctor/clinic multi-select dropdowns + date range picker
    periods.js              # date presets, range helpers, isMonthScoped()

  sections/                 # one file per dashboard section
    OverviewSection.jsx     # OPD overview: KPIs + trend + donuts
    AppointmentsSection.jsx # appointment status, channel mix, hourly heatmap
    ConsultationModesSection.jsx  # mode split + per-doctor bar chart
    BillingSection.jsx      # billing KPIs + collection/refund/advance donuts
    PatientsSection.jsx     # demographics, gender, age, retention
    CareSection.jsx         # 12 sub-tabs (diagnoses, symptoms, meds, vitals, etc.)
    GrowSection.jsx         # referrals, follow-ups, ABHA
    MessagesSection.jsx     # bulk messaging campaigns
    InpatientOverviewSection.jsx  # IPD overview KPIs
    AdmissionsDepthSection.jsx    # IPD admissions + discharges
    WardsSection.jsx        # IPD ward occupancy
    ClinicalActivitySection.jsx   # IPD clinical (currently disabled, backend returns zeros)
    KpiRow.jsx              # reusable KPI card strip (React.memo wrapped)
    SectionBlock.jsx        # collapsible "More insights" container
    ChartLayout.jsx         # ChartGrid + ChartTile wrappers
    TrendTile.jsx           # line chart tile (week-over-week)

  charts/                   # chart components and data adapters
    DonutWithLegend.jsx     # donut chart + legend list (React.memo, capDonut top-5)
    EmptyAware.jsx          # wraps charts with "No data" placeholder
    adapters.js             # data shape converters: capDonut, seriesToXY, anyToDonut, listToDonut
    format.js               # formatINR, formatPct, formatCount
    scaffolds.js            # WEEK_LABELS, empty chart data constants

  data/                     # custom hooks (one per section)
    apiCache.js             # request dedup cache (30s TTL), clearApiCache() on refresh
    deltaUtils.js           # pctDelta, previousWindow, singleIdOnly, safe(), zero-fill helpers
    useOverviewData.js
    useAppointmentsData.js
    useAppointmentsLive.js  # real-time appointment status/channel from summary endpoint
    useBillingLive.js       # billing KPIs + payment modes (OPD + IPD shared)
    useCareData.js          # all 12 Care sub-tabs, sub-tab gating, state merging
    useConsultationModesData.js  # mode mix + batched per-doctor fan-out
    usePatientsData.js
    useGrowData.js
    useInpatientData.js
    useAdmissionsData.js
    useWardsData.js
    useClinicalActivityData.js
    useMessagesData.js
    useFilterOptions.js     # fetches doctor/clinic lists for filter dropdowns
    useCapabilities.js      # feature flags from backend (not yet active)

  reports/                  # Tab 3: CSV report downloads
    ReportsTab.jsx          # report card grid
    reportsCatalog.js       # report definitions: endpoint, filters, column config
    ReportTable.jsx         # data table with pagination
    ReportDownloadDrawer.jsx # filter form + preview + CSV download
    tableUtils.js           # cell formatters
```

---

## 3. How the shell works

`DataAnalyticsPage.jsx` opens as a full-screen `Drawer`. Inside:

1. **SegmentedControl** at the top toggles OPD / IPD (state: `department`)
2. **Sidebar** on the left shows section nav from `analyticsNav.js` (state: `section`)
3. **HeroBanner** shows section title + subtitle
4. **Care sub-tabs** appear only when `section === "care"` (Tesseract `Tabs` component)
5. **FilterBar** renders doctor/clinic dropdowns + date range picker
6. The active **Section component** renders below the filters

Filters are lifted to the shell as `filters` state and passed down to every section. Changing a filter re-triggers the section's data hook.

---

## 4. Data flow pattern

Every section follows the same pattern:

```
Section component
  └─ useXxxData(filters)        # custom hook
       └─ useEffect(filters)    # fires API calls when filters change
            └─ cached("label", params, () => ApiReporting.xxx(params))
                 └─ ApiReporting.xxx  →  GET /api/v1/reports/...
       └─ returns { loading, kpis, donutData, chartData, ... }
  └─ renders KpiRow + ChartGrid + DonutWithLegend
```

**Key patterns to know:**

- **`cached()` (apiCache.js):** Every API call goes through this. Same URL+params within 30s returns the cached promise. Prevents duplicate fetches when switching sections that share data (Overview reuses billing + appointment hooks).

- **`safe()` (deltaUtils.js):** Wraps promises so `Promise.all` never rejects. Returns `null` on failure, downstream code treats null as "no data".

- **`singleIdOnly()` (deltaUtils.js):** The care/clinic endpoints choke on CSV multi-IDs (silently coerce to first ID). This helper passes through a single value or returns `undefined` (business-wide) for multi-select.

- **`previousWindow()` (deltaUtils.js):** Computes the equal-length window before the selected range. Used to double-fetch for delta pills ("+8% vs previous period") on billing endpoints that lack a server-side `previous` block.

- **Sub-tab gating (useCareData.js):** Only fetches endpoints for the active sub-tab. When switching tabs, merges new data into existing state so previously loaded tabs don't flash empty.

- **Batched fan-out (useConsultationModesData.js):** Per-doctor calls batch in groups of 4 to respect the browser's 6-connection limit.

---

## 5. API layer

All API calls go through `src/api/services/ApiReporting.js`, which uses the shared `axiosService` (Bearer JWT already attached). The base URL comes from `config.reporting_api_url`:

| Environment | URL |
|---|---|
| UAT | `https://pm-reporting-uat.tatvacare.in` |
| QA | `https://pm-reporting-qa.tatvacare.in` |
| Prod | `https://pm-reporting-prod.tatvacare.in` |
| Preprod | `https://pm-reporting-preprod.tatvacare.in` |

**Endpoint families used by the dashboard:**

| Section | Primary endpoints | Notes |
|---|---|---|
| Overview | `clinic/dashboard/top-cards`, `clinic/consultations/weekly`, `operational/overview` | Overview also pulls from billing + appointment hooks |
| Appointments | `clinical/appointment/summary` | channelMix, visitsByHour, newVsReturning |
| Consult Modes | `clinic/consultation-modes` | per-doctor calls fan out in batches |
| Billing | `analytics/opd-billing`, `analytics/ipd-billing` | paymentModeSummary for mode donuts |
| Patients | `analytics/patients` | demographics, gender, age, retention |
| Care (12 tabs) | `clinical/symptoms`, `clinical/examination`, `clinical/diagnosis`, `clinical/lab-test`, `clinical/vitals`, `clinical/certificates`, `clinical/advice`, `clinical/vaccines`, `clinical/medical-history`, `clinical/custom-models`, `clinical/gynec`, `clinical/obstetric` | Sub-tab gated |
| Grow | `clinic/followups`, `clinic/rx`, `operational/abha` | |
| Messages | `operational/overview` (messaging fields) | |
| IPD Overview | `analytics/inpatient-summary` | BOR, ALOS, ADC |
| IPD Admissions | `analytics/inpatient-summary` | census series, discharge types |
| IPD Wards | `ipd/wards` | occupancy, ALOS by ward |
| IPD Billing | `analytics/ipd-billing` | same shape as OPD billing |
| Reports (CSV) | `financial/*`, `clinical/appointment/*`, `clinical/prescription/*`, `reference/*` | Tab 3, CSV export via `?format=csv` |

---

## 6. Performance optimizations in place

These are already shipped. Don't remove them.

| What | Where | Why |
|---|---|---|
| API request cache (30s TTL) | `data/apiCache.js` | Prevents redundant fetches on section switches |
| `React.memo` | `DonutWithLegend.jsx`, `KpiRow.jsx` | Skips re-render when props unchanged |
| `useMemo` on derived data | `OverviewSection`, `BillingSection`, `CareSection` | Avoids recomputing on every render |
| Module-level constants | `BillingSection` (BILLING_TOOLTIPS), `deltaUtils` (INVERTED_POLARITY_KEYS) | No per-render object allocations |
| Deferred fallback calls | `useOverviewData.js` | Primary batch = 5 calls; 3 fallback calls fire only if primary fails |
| Sub-tab state merging | `useCareData.js` | Tab switch preserves already-loaded data |
| Batched fan-out | `useConsultationModesData.js` | Per-doctor calls batch in groups of 4 |
| Top-5 cap on ranked donuts | `DonutWithLegend.jsx` via `capDonut()` | Sorts descending, slices top 5 |

---

## 7. CSS scoping

All custom styles live in `data-analytics.css`. Every rule is scoped under `.da-root` (the module's outermost wrapper) so nothing leaks into the host Ant Design app.

Key overrides:
- **Accent contrast corrections:** The host app's global text cascade forces inner spans dark on accent surfaces. We restore white text on active segments, solid buttons, etc.
- **KPI card styling:** Liquid-glass gradient border + radial gradient shimmer
- **Chart card styling:** Same glass treatment
- **Care sub-tabs:** Active = bold (700) + blue; Inactive = semi-bold (600) + primary text color
- **Tooltip text fix:** Tooltips portal to `<body>` outside `.da-root`, so their text fix is unscoped
- **Report drawer z-index:** Nested drawer gets bumped above the parent

---

## 8. Known backend issues

See `docs/ANALYTICS-BACKEND-FIXES.md` for the complete list (19 items, prioritized P0 to P3). The most impactful ones for the frontend:

**Currently broken (P0):**
- `operational/overview` crashes (500) for any date window. Overview uses fallback calls.
- Care endpoints (`clinical/symptoms`, `clinical/examination`, `clinical/summary`) crash without `doctorId`. We always pass `doctorId` when available; "All doctors" mode shows "No data" for these.
- `clinical/appointment/detailed` crashes. Appointment Detailed Report CSV export is broken.

**Missing data (P1):**
- Symptoms, examination, and medical history return zero rows for all doctors (free-text parse issue on the backend). The donuts show "No data".
- Advance deposit has no per-mode breakdown. We show an "Advance deposit status" donut (Applied/Refunded/Balance) using existing KPI totals instead.
- IPD `dischargeTypes` always returns empty array despite having discharge counts.
- IPD Clinical Activity returns all zeros (disabled in nav, see `analyticsNav.js:27`).

**What the frontend does when data is missing:**
- `safe()` wrapper catches 500s; the section renders with "No data" placeholders
- Zero-fill helpers (`withCategories`) ensure donut slices appear even when backend omits them
- Fallback patterns: Overview tries `operational/overview` first, falls back to individual endpoint calls

---

## 9. What is NOT connected yet

These are frontend-ready features waiting on backend support:

| Feature | What's needed | Where in code |
|---|---|---|
| Report filter lookups (payment modes, accounts, departments) | `GET /reports/lookups` endpoint | `reportsCatalog.js` filter definitions |
| Per-doctor bar charts for symptoms, examination, advice | `byDoctor` field on those endpoints | `CareSection.jsx` (would add bar chart tiles) |
| Catalog vs custom split for symptoms/examination | `catalogVsCustom` field | Would add a donut showing structured vs free-text |
| Follow-ups by doctor | `byDoctor` field on `clinic/followups` | `GrowSection.jsx` |
| IPD Clinical Activity section | Fix `ipd/clinical` to return real data | `ClinicalActivitySection.jsx` exists but nav entry is commented out |
| Till-date preset with real account creation date | `accountCreatedAt` from backend | `FilterBar.jsx` (currently uses 365 days as fallback) |

---

## 10. How to add a new section

1. Create `sections/NewSection.jsx` following the pattern of any existing section
2. Create `data/useNewData.js` hook: call `cached()` around `ApiReporting.xxx()`, return `{ loading, kpis, ... }`
3. Add the nav entry in `analyticsNav.js` (OPD_NAV or IPD_NAV)
4. Add the hero copy in `SECTION_HERO`
5. Import and add a `case` in `DataAnalyticsPage.jsx`'s section switch
6. Add API methods to `ApiReporting.js` if new endpoints are needed

---

## 11. How to add a new Care sub-tab

1. Add the tab trigger in `DataAnalyticsPage.jsx` (look for the `<TabsTrigger>` list around line 310)
2. Add the data fetching in `useCareData.js`: add a case in the sub-tab gating `useEffect`, define the state shape
3. Add the rendering in `CareSection.jsx`: add a case in the `buildKpis()` and `buildTiles()` functions

---

## 12. Local development

```bash
npm install --legacy-peer-deps
npm run start:dev              # needs local .env.dev with auth tokens
```

The module loads at `http://localhost:3000/data-analytics-x`. You need to be logged in (the app's auth flow handles this). The reporting API base URL is configured per environment in `src/EnvironmentConfig.js`.

To force-refresh all cached data, click the Refresh button in the header bar (calls `clearApiCache()`).

---

## 13. Key files to start with

If you're new to this module, read these files in order:

1. `shell/analyticsNav.js` - understand the section structure
2. `DataAnalyticsPage.jsx` - understand the shell, routing, and filter state
3. `data/apiCache.js` + `data/deltaUtils.js` - understand the data layer utilities
4. `sections/BillingSection.jsx` - a clean, mid-complexity section example
5. `data/useBillingLive.js` - its data hook, shows the standard pattern
6. `sections/CareSection.jsx` + `data/useCareData.js` - the most complex section (12 sub-tabs)
7. `reports/reportsCatalog.js` - understand the report download system
