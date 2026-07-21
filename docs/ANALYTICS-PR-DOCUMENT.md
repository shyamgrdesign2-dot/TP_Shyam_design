# Data Analytics Module: PR Document

**Branch:** `TPA-data-analytics`
**Route:** `/data-analytics-x`
**Target:** `prod`

---

## Why This Feature

### The Problem

Analytics was previously served through a legacy PHP dashboard embedded via iframe. This had several limitations:

1. **No native support.** The PHP dashboard only works in a browser. Mobile (Android/iOS) and desktop native apps cannot render it, leaving a large segment of doctors without analytics access.
2. **Sales gap.** Competitors (Practo, Cliniko, Kareo) ship built-in analytics as a standard feature. Without native analytics, the product loses on feature comparison during sales demos.
3. **Poor UX.** The iframe approach introduces load delays, auth token mismatches, and inconsistent styling with the main application.

### The Solution

A fully native React analytics module built on tesseract-ui components. It runs inside the existing doctor portal, works across all platforms (web, tablet, native via WebView), and provides a consistent, fast experience.

### What This Covers

This is the **base analytics tier**: the standard set of dashboards that every Tatva Practice user gets as part of their subscription. It covers:

- **OPD:** 8 sections: Overview, Appointments, Consultation Modes, Billing, Patients, Care (7 sub-tabs), Messages, Reports (CSV exports)
- **IPD:** 5 sections: Overview, Admissions and Discharges, Wards and Beds, Billing, Reports

**For advanced analytics needs:** If a user requires deeper analysis, custom dashboards, or cross-clinic aggregation beyond what this module provides, they can purchase a separate data link integration. This gives them direct access to their data via Power BI, Tableau, or similar tools. The base module here is designed to cover 90%+ of day-to-day analytics needs without requiring that upgrade.

---

## What Changed

### New Files
- `src/pages/data-analytics/` - Complete module (40+ files): shell, sections, data hooks, charts, reports, CSS
- `src/pages/data-analytics/data/analyticsTracking.js` - MoEngage event instrumentation
- `docs/ANALYTICS-FRONTEND-HANDOVER.md` - Frontend developer handover document
- `docs/ANALYTICS-MOENGAGE-EVENTS.md` - MoEngage event catalog and attribute reference
- `docs/ANALYTICS-KNOWN-LIMITATIONS.md` - Features removed or deferred due to backend restrictions

### Modified Files
- `src/App.js` - Added lazy-loaded route for `/data-analytics-x`
- `src/api/services/ApiReporting.js` - Reconciled to v2 reporting API, added all endpoint methods

### Deleted Files
- `src/pages/data-analytics/data/useBillingData.js` - Replaced by `useBillingLive.js`
- `src/pages/data-analytics/data/usePharmacyData.js` - Pharmacy section removed (no backend data)
- `src/pages/data-analytics/sections/AdmissionsSection.jsx` - Replaced by `AdmissionsDepthSection.jsx`
- `src/pages/data-analytics/sections/PharmacySection.jsx` - Removed (no backend support)

---

## Architecture

- **UI framework:** tesseract-ui (internal component library)
- **Layout:** Full-page Drawer with sidebar navigation
- **Data layer:** Custom React hooks per section, 30s API cache with dedup, safe() wrappers for error resilience
- **CSS:** Scoped under `.da-root` to avoid host app cascade conflicts
- **Viewport:** Tablet and desktop only. No mobile support.
- **Performance:** React.memo on chart components, useMemo on derived data, batched fan-out for per-doctor calls, sub-tab gated fetching

---

## MoEngage Tracking

12 events covering the full user journey. See `docs/ANALYTICS-MOENGAGE-EVENTS.md` for the complete catalog.

All events carry the mandatory doctor/hospital base attribute set.

---

## Product Metrics (PID)

Track these to measure adoption and engagement:

| Metric | How to Measure | Target |
|---|---|---|
| **Adoption rate** | Unique doctors firing `TP_Analytics_Opened` / total active doctors | 30%+ within 30 days of launch |
| **Session depth** | Avg `TP_Analytics_SectionView` count per session | 3+ sections per visit |
| **Time spent** | Avg `time_spent_seconds` from `TP_Analytics_Closed` | 2+ minutes |
| **Report adoption** | Unique doctors firing `TP_Analytics_ReportDownloaded` / total openers | 15%+ |
| **Return rate** | Doctors who open analytics 3+ times per week | 20%+ of adopters |
| **OPD vs IPD split** | `TP_Analytics_DeptSwitch` direction analysis | Reflects user mix |
| **Filter engagement** | `TP_Analytics_FilterApplied` rate per session | 1+ filter change per session |
| **Top sections** | `TP_Analytics_SectionView` ranked by section | Identifies high-value features |

---

## Known Limitations

See `docs/ANALYTICS-KNOWN-LIMITATIONS.md` for the complete list.

1. 7 features removed from the UI (1 OPD section, 5 Care sub-tabs, 1 IPD section) due to backend data gaps
2. Multi-doctor/clinic filter limited on `clinic/*` endpoints (single ID only; `operational/*` and `analytics/*` accept CSV)
3. 31-day date range cap enforced by the reporting service
4. IPD discharge types array always empty despite having discharge counts
5. Top-cards doctorId filter returns 0 (backend bug, accepted but not applied)

---

## Testing Notes

- Open `/data-analytics-x` after login
- Test on tablet (768px+) and desktop viewports
- Verify OPD and IPD department switching
- Check each sidebar section loads data (or shows "No data" gracefully)
- Test date range, doctor, and clinic filters
- Open Reports tab, preview a report, download CSV
- Verify MoEngage events fire in the MoEngage debug console
