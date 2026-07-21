# Data Analytics Module: Frontend Handover

**Repository:** `DHSPL-Tatvacare/Pm-Doctor-Portal` (GitHub)
**Branch:** `TPA-data-analytics`
**Target branch:** `prod`
**Route:** `/data-analytics-x` (lazy-loaded in `src/App.js:52,787`)
**Date:** 2026-07-21

---

## 1. What this module is

A full-page analytics dashboard built entirely on **Tesseract UI** (`@dhspl-tatvacare/tesseract-ui`), rendered inside a Drawer overlay. It replaces the legacy PHP analytics and covers two departments: **OPD** (8 sections) and **IPD** (5 sections).

**Supported viewports: tablet and desktop only.** Mobile is not supported for this module as of now. The layout, sidebar, and chart grids are designed for wider screens. Do not add mobile-specific breakpoints or test on phone dimensions.

---

## 2. Tesseract UI: How it works in this module

### What Tesseract UI is

Tesseract UI is an internal component library (`@dhspl-tatvacare/tesseract-ui`) that provides design-system-consistent components. The data analytics module is built **entirely** on Tesseract, not on Ant Design (which the rest of the Doctor Portal uses). This means the analytics module has its own visual language and component set, separate from the host app.

### Why it doesn't affect the existing app

1. **Scoped styles:** Tesseract's CSS is imported only inside `DataAnalyticsPage.jsx` via `import "@dhspl-tatvacare/tesseract-ui/styles.css"`. The import is code-split (lazy-loaded route), so Tesseract styles only load when the user opens `/data-analytics-x`. They do not pollute the rest of the Ant Design app.

2. **Theme isolation:** The module wraps everything in `<TesseractThemeProvider colorScheme="light">`, which scopes Tesseract CSS variables. The host app's Ant Design theme variables are unaffected.

3. **CSS cascade fixes:** Where the host app's global CSS (Ant Design resets, body-level text colors) leaks into the Drawer, we override them in `data-analytics.css` scoped under `.da-root`. These overrides only apply inside the analytics module.

4. **No shared state:** Tesseract components have their own internal state management. They don't touch Redux, Ant's ConfigProvider, or any global context from the host app.

### How to import and use

```jsx
// 1. Import components by name from the package
import {
  Drawer, DrawerContent,
  Sidebar, HeroBanner,
  Card, SectionCard,
  SegmentedControl, Header,
  Tabs, TabsList, TabsTrigger,
  Dropdown, DateRangePicker,
  LineChart, BarChart, DonutChart,
  DataTable, Button, Badge, Empty,
  Skeleton, TPLibraryIcon, Field,
} from "@dhspl-tatvacare/tesseract-ui";

// 2. Import the stylesheet (once, at the module entry point)
import "@dhspl-tatvacare/tesseract-ui/styles.css";

// 3. Wrap your root component in the theme provider
<TesseractThemeProvider colorScheme="light">
  {/* all Tesseract components go here */}
</TesseractThemeProvider>
```

### Package details

| Item | Value |
|---|---|
| NPM package | `@dhspl-tatvacare/tesseract-ui` |
| Version used | `^1.0.6` |
| Install | `npm install @dhspl-tatvacare/tesseract-ui --legacy-peer-deps` |
| CSS entry | `@dhspl-tatvacare/tesseract-ui/styles.css` |
| Exports map | Uses `"exports"` field in package.json (ESM + CJS) |

### Components used in this module

| Component | Where used | Purpose |
|---|---|---|
| `Drawer`, `DrawerContent` | Shell | Full-page overlay container |
| `Sidebar` | Shell | Left navigation (section list) |
| `HeroBanner` | Shell | Section title + subtitle header |
| `SegmentedControl` | Shell | OPD/IPD department toggle |
| `Header` | Shell | Top bar with refresh button |
| `Tabs`, `TabsList`, `TabsTrigger` | Shell, CareSection | Sub-tab navigation |
| `SectionCard`, `Card` | Sections | Chart and KPI containers |
| `Dropdown` | FilterBar, ReportDrawer | Multi-select dropdowns with checkbox options |
| `DateRangePicker` | FilterBar | Date range with presets |
| `LineChart`, `BarChart`, `DonutChart` | Sections | Data visualizations |
| `DataTable` | ReportTable | Tabular data display with pagination |
| `Button`, `Badge`, `Empty` | Reports, Sections | Actions, status indicators, empty states |
| `Skeleton` | All sections | Loading placeholders |
| `TPLibraryIcon` | ChartLayout | Icon set (Tesseract's icon library) |
| `Field` | ReportDrawer | Form field wrapper with label |
| `TesseractThemeProvider` | Shell | Theme context (light/dark scoping) |

### Gotchas

- **Prop passthrough:** Tesseract spreads unrecognized props onto DOM elements via `...rest`. Only pass props the component actually accepts; extra boolean props like `withActions` will trigger React DOM warnings. The Dropdown component accepts `primaryAction`, `secondaryAction`, `tertiaryAction` directly (no `withActions` flag needed).
- **Icon names:** `TPLibraryIcon` uses Tesseract's icon catalog. Check the icon list in the package; not all icons have both "linear" and "bulk" variants.
- **Chart data format:** `LineChart`/`BarChart`/`DonutChart` expect specific data shapes. See `charts/adapters.js` for the converters (`seriesToXY`, `anyToDonut`, `listToDonut`) that transform API responses into chart-ready formats.
- **CSS variable namespace:** Tesseract uses `--tesseract-*` CSS variables. When writing custom overrides, use these (e.g. `var(--tesseract-fg-primary)`, `var(--tesseract-slate-100)`), not Ant Design variables.

---

## 3. File structure

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
    useCapabilities.js      # role detection, IPD flag, consult mode flags from JWT + Redux
    analyticsTracking.js    # MoEngage event helper (12 events, base attrs from Redux/JWT)

  reports/                  # Tab 3: CSV report downloads
    ReportsTab.jsx          # report card grid
    reportsCatalog.js       # report definitions: endpoint, filters, column config
    ReportTable.jsx         # data table with pagination
    ReportDownloadDrawer.jsx # filter form + preview + CSV download
    tableUtils.js           # cell formatters
```

---

## 4. How the shell works

`DataAnalyticsPage.jsx` opens as a full-screen `Drawer`. Inside:

1. **SegmentedControl** at the top toggles OPD / IPD (state: `department`)
2. **Sidebar** on the left shows section nav from `analyticsNav.js` (state: `section`)
3. **HeroBanner** shows section title + subtitle
4. **Care sub-tabs** appear only when `section === "care"` (Tesseract `Tabs` component)
5. **FilterBar** renders doctor/clinic dropdowns + date range picker
6. The active **Section component** renders below the filters

Filters are lifted to the shell as `filters` state and passed down to every section. Changing a filter re-triggers the section's data hook.

---

## 5. User management and role-based access

Role-based access is **fully handled** on the frontend. No backend call is needed beyond what the app already loads at login.

### How roles are detected

`useCapabilities.js` reads the JWT token and Redux profile at render time:

```js
const isAdmin = Number(token.admin) === 1 || Number(profile.ownerDoctor) === 1;
```

- **Admin doctor** (`isAdmin = true`): full access to all doctor/clinic filters
- **Sub-doctor** (`isAdmin = false`): locked to their own data only

### Sub-doctor behavior

When `isAdmin` is false and `selfId` is available:

1. **Doctor filter is locked.** `DataAnalyticsPage.jsx:128` sets `doctorLocked = true`. The FilterBar renders a disabled Dropdown showing the sub-doctor's own name (no menu opens).
2. **Auto-selected on mount.** `DataAnalyticsPage.jsx:130` runs `setDoctors([caps.selfId])` so the sub-doctor's ID is always in the filter.
3. **Cannot be cleared.** The "Clear all" button resets to the sub-doctor's own ID, not to empty (line 201).
4. **API always scoped.** `filters.doctor` always uses `caps.selfId` for locked doctors (line 166), regardless of what the dropdown state says.

### Clinic access

Clinics are sourced from `profile.hospital_data` (Redux `state.doctors.profile`). This is the same list the app's header clinic-switcher uses. The backend already scopes this to clinics the logged-in doctor has access to, so the dropdown only shows permitted clinics.

For single-clinic accounts (`clinics.length <= 1`), the clinic dropdown renders as disabled showing that clinic's name.

### IPD visibility

The IPD department tab only appears when the account has an IPD module:
```js
DEPARTMENTS.filter((d) => d.value !== "ipd" || caps.ipd)
```
`caps.ipd` is derived from `profile.module_data` containing a record with `type: "ipd"`.

### Feature gating

Consultation mode labels in the Consult Modes section are gated by GrowthBook flags (same flags that gate the live features). A mode the account doesn't have won't show in charts. See `useCapabilities.js` for the full flag list.

### What's already working vs what needs backend coordination

| Item | Status | Details |
|---|---|---|
| Admin vs sub-doctor detection | Done | JWT `admin` + profile `ownerDoctor` |
| Sub-doctor filter lock | Done | Disabled dropdown, auto-selected ID |
| Clinic scoping | Done | Uses `profile.hospital_data` (backend-scoped) |
| IPD visibility | Done | Gated by `module_data` |
| Consult mode flags | Done | GrowthBook feature flags |
| Per-doctor report scoping | Partial | Reports pass `doctorId` filter when available, but some report endpoints ignore it (see backend fixes doc) |

---

## 6. Data flow pattern

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

- **`singleIdOnly()` (deltaUtils.js):** The `clinic/*` endpoints reject CSV multi-IDs with a 400 error. This helper passes through a single value or returns `undefined` (all-doctors/all-clinics) for multi-select. Hooks that call both `clinic/*` and `operational/*` endpoints split their params into `sp` (single-ID for clinic/*) and `csvParams` (CSV-ok for operational/analytics/*). See `useOverviewData.js` for the canonical split-params pattern.

- **`previousWindow()` (deltaUtils.js):** Computes the equal-length window before the selected range. Used to double-fetch for delta pills ("+8% vs previous period") on billing endpoints that lack a server-side `previous` block.

- **Sub-tab gating (useCareData.js):** Only fetches endpoints for the active sub-tab. When switching tabs, merges new data into existing state so previously loaded tabs don't flash empty.

- **Batched fan-out (useConsultationModesData.js):** Per-doctor calls batch in groups of 4 to respect the browser's 6-connection limit.

---

## 7. API layer

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
| Appointments | `clinical/appointment/summary`, `analytics/appointment` | channelMix, visitsByHour, newVsReturning; footfall from analytics/appointment |
| Consult Modes | `clinic/consultation-modes` | per-doctor calls fan out in batches |
| Billing | Billing service (`/billing/bill/dashboard`, `/billing/advancedDeposit/dashboard`) + `financial/collection/summary` | paymentModeSummary for mode donuts; previous-period via double-fetch |
| Patients | `analytics/patients` | demographics, gender, age, retention |
| Care (7 tabs) | `clinical/diagnosis`, `clinical/lab-test`, `clinical/vitals`, `clinical/advice`, `clinical/vaccines`, `clinic/rx` | Sub-tab gated; 5 additional tabs built but hidden (see Known Limitations) |
| Messages | `operational/overview` (messaging fields) | |
| IPD Overview | `analytics/inpatient-summary` | BOR, ALOS, ADC |
| IPD Admissions | `analytics/inpatient-summary` | census series, discharge types |
| IPD Wards | `ipd/wards`, `analytics/inpatient-summary` | 5 KPIs + 4 charts (beds per ward, occupancy by ward, bed distribution donut, ALOS by ward) |
| IPD Billing | Billing service (`/billing/ipd-bill/dashboard`, `/billing/advancedDeposit/dashboard`) | same shape as OPD billing |
| Reports (CSV) | `financial/*`, `clinical/appointment/*`, `clinical/prescription/*`, `reference/*` | Tab 3, CSV export via `?format=csv` |

---

## 8. Performance optimizations in place

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

## 9. CSS scoping

All custom styles live in `data-analytics.css`. Every rule is scoped under `.da-root` (the module's outermost wrapper) so nothing leaks into the host Ant Design app.

Key overrides:
- **Accent contrast corrections:** The host app's global text cascade forces inner spans dark on accent surfaces. We restore white text on active segments, solid buttons, etc.
- **KPI card styling:** Liquid-glass gradient border + radial gradient shimmer
- **Chart card styling:** Same glass treatment
- **Care sub-tabs:** Active = bold (700) + blue; Inactive = semi-bold (600) + primary text color
- **Tooltip text fix:** Tooltips portal to `<body>` outside `.da-root`, so their text fix is unscoped
- **Report drawer z-index:** Nested drawer gets bumped above the parent

---

## 10. Known limitations

See `docs/ANALYTICS-KNOWN-LIMITATIONS.md` for the complete list.

**Features removed from the UI (backend data gaps):**
- OPD Grow section (follow-ups endpoint returns empty)
- Care sub-tabs: Symptoms, Examination, Medical History, Certificates, Custom Modules
- IPD Clinical Activity (returns all zeros)

**Features limited by backend restrictions:**
- `clinic/*` endpoints reject CSV doctorId/clinicId (multi-select falls back to "all")
- `clinic/dashboard/top-cards` accepts doctorId but returns 0 for any doctor
- IPD `dischargeTypes` always empty despite having discharge counts
- 31-day date range cap enforced by the reporting service

**What the frontend does when data is missing:**
- `safe()` wrapper catches errors; the section renders with "No data" placeholders
- Zero-fill helpers (`withCategories`) ensure donut slices appear even when backend omits them
- `singleIdOnly()` helper passes single IDs to clinic/* endpoints, skips filter for multi-select

---

## 11. What is NOT connected yet

These are frontend-ready features waiting on backend support. See `docs/ANALYTICS-KNOWN-LIMITATIONS.md` for full details.

| Feature | What's needed | Where in code |
|---|---|---|
| Grow section (follow-ups, ABHA) | Backend to populate follow-up records in reporting tables | `GrowSection.jsx`, nav entry commented in `analyticsNav.js:19` |
| Symptoms/Examination/History sub-tabs | Fix data quality in `clinical/symptoms`, `clinical/examination`, `clinical/medical-history` | Tab triggers commented in `DataAnalyticsPage.jsx:74-80` |
| Certificates/Custom Modules sub-tabs | Backend to populate data in reporting tables | Tab triggers commented in `DataAnalyticsPage.jsx:84-87` |
| IPD Clinical Activity section | Fix `ipd/clinical` to return real data | `ClinicalActivitySection.jsx` exists, nav commented in `analyticsNav.js:28` |
| CSV doctorId on clinic/* endpoints | Backend to accept comma-separated IDs | `singleIdOnly()` workaround in `deltaUtils.js` |
| Report filter lookups | `GET /reports/lookups` endpoint | `reportsCatalog.js` filter definitions |
| Till-date with account creation date | `accountCreatedAt` from backend | `FilterBar.jsx` (uses 365-day fallback, clamped to 31) |

---

## 12. How to add a new section

1. Create `sections/NewSection.jsx` following the pattern of any existing section
2. Create `data/useNewData.js` hook: call `cached()` around `ApiReporting.xxx()`, return `{ loading, kpis, ... }`
3. Add the nav entry in `analyticsNav.js` (OPD_NAV or IPD_NAV)
4. Add the hero copy in `SECTION_HERO`
5. Import and add a `case` in `DataAnalyticsPage.jsx`'s section switch
6. Add API methods to `ApiReporting.js` if new endpoints are needed

---

## 13. How to add a new Care sub-tab

1. Add the tab trigger in `DataAnalyticsPage.jsx` (look for the `<TabsTrigger>` list around line 310)
2. Add the data fetching in `useCareData.js`: add a case in the sub-tab gating `useEffect`, define the state shape
3. Add the rendering in `CareSection.jsx`: add a case in the `buildKpis()` and `buildTiles()` functions

---

## 14. Local development

```bash
npm install --legacy-peer-deps
npm run start:dev              # needs local .env.dev with auth tokens
```

The module loads at `http://localhost:3000/data-analytics-x`. You need to be logged in (the app's auth flow handles this). The reporting API base URL is configured per environment in `src/EnvironmentConfig.js`.

To force-refresh all cached data, click the Refresh button in the header bar (calls `clearApiCache()`).

---

## 15. Key files to start with

If you're new to this module, read these files in order:

1. `shell/analyticsNav.js` - understand the section structure
2. `DataAnalyticsPage.jsx` - understand the shell, routing, and filter state
3. `data/apiCache.js` + `data/deltaUtils.js` - understand the data layer utilities
4. `sections/BillingSection.jsx` - a clean, mid-complexity section example
5. `data/useBillingLive.js` - its data hook, shows the standard pattern
6. `sections/CareSection.jsx` + `data/useCareData.js` - the most complex section (12 sub-tabs)
7. `reports/reportsCatalog.js` - understand the report download system
