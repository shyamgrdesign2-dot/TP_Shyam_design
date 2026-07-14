# Data Analytics module — end-to-end documentation

The native Data Analytics experience for the PM Doctor Portal: a full-page,
Tesseract-built dashboard covering OPD and IPD operations, reached at
**`/data-analytics-x`**. It replaces the legacy PHP `data_analytics` iframe and
is kept fully separate from the older `src/pages/opd-analytics` /
`ipd-analytics` modules (those remain untouched).

Companion document: **[ANALYTICS-BACKEND-SPEC-V4.md](./ANALYTICS-BACKEND-SPEC-V4.md)**
is the authoritative backend contract (endpoints, params, response shapes,
filter matrix, migration priorities). This file covers the frontend: how the
module is built, wired, and extended.

---

## 1. What ships

| Area | Sections |
|---|---|
| OPD | Overview · Appointments · Consult Modes · Billing · Patients · Care (15 sub-tabs) · Grow (3 sub-tabs) · Reports |
| IPD | Overview · Wards · Clinical Activity · Billing · Reports |

Care sub-tabs: Overview, Diagnoses, Symptoms, Examination, Medications, Lab
Tests, Vitals, History, Advice, Vaccines, Procedures, Certificates, Custom
Modules, Gynec, Obstetric. Each detail tab shows its KPI row, a top-N donut,
and a "‹Topic› over time" trend (Symptoms additionally has a severity donut).

## 2. Wiring — everything the module needs from the host app

The module is deliberately additive. Beyond its own folder it touches:

| File | Change | Why |
|---|---|---|
| `src/App.js` | lazy import + `<Route path="data-analytics-x" …>` under `PrivateRoute` | entry point |
| `src/config.js` | `reporting_api_url` key (env-overridable via `REACT_APP_REPORTING_API_URL`) | reporting service base URL |
| `src/EnvironmentConfig.js` | `reporting_api_url` per environment block | ditto |
| `src/api/services/ApiReporting.js` | Pm-Core reporting client (v2 contract, all endpoints) | data access |
| `src/setupProxy.js` | dev-only proxy `/reporting-proxy` → pm-core UAT | the reporting service doesn't CORS-allow localhost |
| `package.json` | `@dhspl-tatvacare/tesseract-ui` | the design system (auth for the GitHub Packages registry lives in `~/.npmrc`) |

Everything else it consumes already exists in the app: `axiosService`
(`customBaseUrl` + Bearer token), `ApiBulkMessages.listDoctor`,
`config.lab_params_api_url`, `config.appointment_api_url`, Redux
`state.doctors.profile` and `state.bulkMessages.doctorList`.

## 3. Folder map — `src/pages/data-analytics/`

```
DataAnalyticsPage.jsx   Shell: full-page Drawer → Header (OPD/IPD toggle) →
                        Sidebar → HeroBanner → card [sub-tabs → FilterBar →
                        scrollable SectionContent]. Owns ALL filter state.
data-analytics.css      The ONLY css. Scoped under .da-root; tokens-only
                        corrections for the host app's global text cascade
                        (tooltip text, active tab blue, segmented control),
                        plus the card gradient washes via color-mix over
                        tesseract tokens.
shell/analyticsNav.js   Sidebar items + hero copy per department/section.
filters/FilterBar.jsx   Doctor + Clinic multi-select checkbox Dropdowns,
                        DateRangePicker (presets), conditional "Clear all".
filters/periods.js      Preset ↔ {startDate,endDate,days,month} resolution.
data/useFilterOptions.js  Doctor list (Redux → GET /api/v1/doctor fallback)
                          + clinic list (state.doctors.profile.hospital_data).
data/use*.js            One hook per section. Each takes the filter object,
                        calls its endpoints (Promise.all, each call wrapped so
                        a 4xx zero-fills instead of throwing), and returns
                        { loading, kpis, ...charts }.
charts/adapters.js      {labels,datasets} → {data,series,xKey}; donut helpers;
                        capDonut (top-5 + "Others").
charts/EmptyAware.jsx   LineChartZ/BarChartZ/DonutChartZ — always render chart
                        chrome; zero-baseline / placeholder ring when empty.
                        LineChartZ pins curve="linear" + yMin=0 (the DS smooth
                        spline overshoots below zero at sharp drops).
charts/DonutWithLegend.jsx  Donut + side legend (full label + count, 12px),
                            capped top-5 + Others. THE renderer for ranked
                            top-N lists.
sections/KpiRow.jsx     StatCard row: kind (money/number/percent/days/text)
                        formatting, `approx: true` → "~" prefix on the value,
                        delta pill ("vs previous period"), icon maps
                        (CDN bulk icons by KPI key), InfoTooltip.
sections/TrendTile.jsx  ChartTile + boxy icon line/bar switch for time series.
sections/*Section.jsx   One per sidebar section; layout only — data via hooks.
reports/                Reports tab: catalog (live-flag + dept-gated), card
                        grid, download drawer (CSV via getBlob).
```

## 4. Filter contract (frontend side)

State lives in `DataAnalyticsPage` and flows to every hook as one object:

```js
filters = {
  startDate, endDate,   // YYYY-MM-DD from the DateRangePicker (presets or custom)
  days,                 // legacy Tab-2 bucket, snapped to {7,15,30,90}
  month,                // YYYY-MM for the legacy month-based endpoints
  doctor, clinic,       // CSV id strings from the multi-selects; undefined = all
}
```

Rules the module guarantees:
- Every hook forwards `startDate/endDate/doctorId/clinicId` on every call.
  Whether the backend honours them is the §5.2 support matrix in the spec.
- Multi-select → CSV. An endpoint that only understands a single value gets
  the value **withheld** when more than one is selected (shows "all" rather
  than silently mis-filtering). `useBillingLive` expands the CSV into repeated
  `doctorIds`/`clinicId` params (natively supported).
- A widget that cannot follow the filter yet says so on the card
  ("This calendar month vs last", "as of today").
- "Clear all" resets doctors, clinics, and the date preset to defaults.

### 4.1 Capability & role gating — `data/useCapabilities.js`

Analytics never renders a metric for a feature the account doesn't have.
One hook resolves every gate from data the app already holds at login (no
extra API call); spec §1.7 documents the same matrix for the backend plus
the consolidated `GET /analytics/capabilities` follow-up.

| Gate | Source | Effect when off |
|---|---|---|
| `isAdmin` | JWT `result.admin` (fallback profile `ownerDoctor`) | Doctor filter locked to the sub-doctor's own name; all data self-scoped |
| `singleClinic` | profile `hospital_data.length <= 1` | Clinic filter renders as a disabled field, not a dropdown |
| `ipd` | profile `module_data[].type` has `"ipd"` | IPD disappears from the department switcher |
| `abdm` | profile `abhaEnable` | ABHA donut/trend/KPIs hidden in Grow |
| `modes.video` | GrowthBook `video-consult`/`tele-consult` | "Video consultations" KPI hidden in Appointments |
| `modes.snapRx` | GrowthBook `snap-rx` | "Pending digitization" KPI hidden; Snap RX series dropped |
| `modes.tabRx` / `modes.smartSync` | GrowthBook `tab-rx` / `smartsync-connect` | Series dropped from mode charts |
| `gynecObstetric` | GrowthBook `obs-gynec-history` | Gynec + Obstetric Care sub-tabs hidden |

Honesty override: a disabled mode with **non-zero historical data** stays
visible — hiding real numbers would corrupt visible totals. Voice RX and
Point & Click have no kill switch and are always on.

## 5. Chart-type doctrine

Fixed by data kind, not taste (details + rationale in spec §2):
- Parts of a meaningful whole → **Donut** (gender, mode mix, payment modes, status).
- Ranked top-N list → **DonutWithLegend** (top 5 + Others; the legend carries
  the full clinical name + count, so long names never crop).
- Time trend → **TrendTile** (line/area default, user-toggleable to bar).
- Ordered distribution (age bands, hour, weekday) → vertical bar, subtitle
  says "summed over period".
- Per-entity comparison / averages (modes by doctor, ALOS by ward) → vertical
  bar; an average is never a donut slice.

## 6. Data integrity rules (learned the hard way)

- A KPI must trace to a live endpoint for the SELECTED window — no silent
  window swaps (the old Overview "collected" used 30 days under a 7-day filter).
- Never fabricate a value from an unrelated count (removed: "ICD coded",
  "patients vaccinated" mirroring dose count, "avg per Rx" that wasn't).
- Label matching must be exact: `/linked/` also matches "Not linked" —
  that regex once produced a 100% ABHA linkage rate for a 0.1% reality.
- Strip entry remarks from investigation names (`"… Remark: //~//"`);
  the backend contract is a clean `label`.
- Live states (queue, draft) are never KPI-grade for a past period; they
  appear only in the status donut.
- Overview reuses the SAME hooks as Billing/Appointments/Consult Modes so its
  numbers can never disagree with the deep-dive sections.

## 7. Styling — Tesseract end to end

- Components: Tesseract only (Drawer, Header, Sidebar, HeroBanner, Tabs,
  Dropdown, DateRangePicker, StatCard, Card, charts, Tooltip, Skeleton,
  SegmentedControl, Button, Chip).
- Every colour / radius / shadow / font in the module resolves to a
  `--tesseract-*` token (violet washes via `color-mix` over tokens). No raw
  hex; fonts come from `--tesseract-font-body/heading`.
- `data-analytics.css` exists ONLY because the host app's global text cascade
  overrides component-internal colours (tooltip text, active-tab label,
  segmented-control label, sidebar chip). Each correction is scoped under
  `.da-root` and uses tokens. If the host ever scopes its global text rules,
  this file shrinks to the layout helpers.
- Icons: CDN mask icons (`…/tp-icons/rounded/{variant}/{family}/{name}.svg`).
  Content icons use **bulk**; info-tooltips and inactive tab icons use
  **linear**; the Tabs component swaps linear→bulk on the active tab
  automatically. Probe the CDN before using a new icon path — not every icon
  exists in every variant (e.g. `social/atom` is linear-only).

## 8. Dev setup

1. `npm install --legacy-peer-deps` (tesseract-ui comes from the org GitHub
   Packages registry — auth in `~/.npmrc`).
2. `npm run start:dev` (needs the usual `.env.dev`). The dev proxy in
   `src/setupProxy.js` forwards `/reporting-proxy` to the UAT reporting
   service; set `REACT_APP_REPORTING_API_URL=/reporting-proxy` in `.env.dev`.
3. Open `http://localhost:<port>/data-analytics-x` (desktop/tablet widths —
   the module targets wide viewports).

## 9. Extending

- **New KPI**: add it in the section's hook (value must come from a real
  endpoint field; add `tooltip`, and `approx: true` if it's an average),
  then an icon mapping in `KpiRow`.
- **New chart**: pick the type from §5, render through the zero-aware
  wrappers, state the aggregation window in the subtitle.
- **New endpoint**: add the method to `ApiReporting.js`, document it in
  spec §3/§4, and wire the hook with the standard `safe()` zero-fill pattern.
- **New Care tab**: entry in `CARE_SUB_TABS` (folder-qualified icon path,
  `fixedVariant` if the CDN lacks a bulk build), block + `buildKpis` case in
  `CareSection`, fetch in `useCareData`, `TREND_META` entry, spec section.

## 10. Known backend gaps (fully specced, FE already sends everything)

Priority order lives in spec §7. Headlines: range-aware buckets on all trend
endpoints (x-axis must match the filter), a GET replacement for the
operational `listAppointment` POST, CSV `doctorId`/`clinicId` support
everywhere, `previous` blocks for delta pills, multi-series `byDoctor` for the
stacked mode chart, and the Care deep-dive fields (`trend`, symptom
`severity`/`patientsWith`, `/clinical/procedures`).
