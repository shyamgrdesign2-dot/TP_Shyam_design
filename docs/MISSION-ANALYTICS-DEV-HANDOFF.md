# Mission Hospital Analytics - Dev Handoff

**Branch:** `TPA-data-analytics`
**Date:** 2026-07-28
**Hospital:** THE MISSION HOSPITAL (Business ID: 7921766745277649, Clinic ID: 663)

---

## What has been built

A standalone OPD Analytics page at `/mission-analytics`, accessible from the sidebar "Data Analytics" entry. It reuses all existing `data-analytics` UI components (no custom UI) and displays all metrics on a single scrollable page (no sidebar/section tabs).

### Files created / modified

| File | Status | Purpose |
|------|--------|---------|
| `src/pages/mission-analytics/MissionAnalyticsPage.jsx` | NEW | Full-page analytics drawer with KPIs + charts |
| `src/pages/mission-analytics/data/useMissionData.js` | NEW | Data hook: fetches 4 APIs, shapes KPI + chart data |
| `src/pages/mission-analytics/index.js` | NEW | Barrel export |
| `src/pages/mission-analytics/mission-analytics.css` | NEW | Placeholder for future overrides |
| `src/App.js` | MODIFIED | Added lazy route for `/mission-analytics` |
| `src/common/SidebarDoctor.js` | MODIFIED | Added "Data Analytics" sidebar entry for CVT ext hospitals |
| `docs/CVT-API-CONTRACT.md` | NEW | Backend API contract for CVT endpoints |

### Page layout

1. **Header** with back button, "OPD Analytics" title, refresh
2. **HeroBanner** (violet)
3. **FilterBar** with doctor picker, clinic display, date range (max 31 days)
4. **Key Metrics** (11 KPI cards):
   - Total footfall, Completed, In queue / No-show, Cancelled
   - Avg visits / day, Busiest day, Digitization %, Total digitized (~approx)
   - Total patients, One-time visitors, Returning patients
5. **More Insights** (8 charts):
   - Appointment status (donut)
   - Visit trend (3-metric grouped bar)
   - Doctor-wise comparison (3-metric grouped bar)
   - Overall donut (completed / in queue / cancelled)
   - Age distribution (bar)
   - Visit frequency (bar)
   - Gender distribution (donut)
   - Patient segmentation (donut: New / Occasional / Regular / Loyal)

### Sidebar entry

For hospitals with the `GB_CVT_EXT_HOS` GrowthBook flag ON (like Mission Hospital), a "Data Analytics" entry appears in the sidebar below "Appointment". Clicking it navigates to `/mission-analytics`.

For other hospitals (flag OFF), the existing `data_analytics` module from `profile.module_data` also routes to `/mission-analytics` (changed from `/data-analytics-x`).

---

## APIs currently used (available)

These 4 endpoints are called in parallel on page load and on filter change:

### 1. Appointment Analytics
```
GET /api/v1/reports/analytics/appointment
Params: startDate, endDate, [doctorId], [clinicId]
```
**Provides:**
- `appointmentStatus` (chart series) - status breakdown donut (Completed, Scheduled, Cancelled, Draft)
- `appointments` (chart series) - daily appointment totals (used for Visit trend "Appointments booked" series)
- `visitsByWeekday` (chart series) - weekday distribution (used to find Busiest day KPI)
- `newVsReturning` (chart series) - new vs returning donut

### 2. Operational Overview
```
GET /api/v1/reports/operational/overview
Params: startDate, endDate, [doctorId], [clinicId]
```
**Provides:**
- `totalFootfall` (number) - total footfall KPI
- `digitalPrescriptionPercent` (number) - digitization % KPI
- `totalPrescriptionsWithMeds` (number) - total digitized count KPI
- `avgConsultationsPerDay` (number) - fallback for avg visits/day

### 3. Patient Analytics
```
GET /api/v1/reports/analytics/patients
Params: startDate, endDate, [doctorId], [clinicId]
```
**Provides:**
- `kpis.totalPatients` (number)
- `kpis.oneTime` (number)
- `kpis.returning` (number)
- `age` (chart series) - age distribution bar chart
- `visitFrequency` (chart series) - visit frequency bar + patient segmentation donut
- `gender` (array) - gender distribution donut

### 4. Consultation Modes
```
GET /api/v1/reports/clinic/consultation-modes
Params: startDate, endDate, [doctorId], [clinicId]
```
**Provides:**
- `byDoctor` (chart series) - per-doctor consultation counts (used for "Consultations completed" series in Doctor-wise chart)
- `kpis.total` (number) - total consultations
- `kpis.smartSync` (number) - SmartSync count

---

## APIs NOT available (needed from backend)

The Visit trend and Doctor-wise comparison charts are designed as 3-metric grouped bar charts showing: **Appointments booked vs Consultations completed vs Digitized (CVT)**.

Currently, placeholder zeros are shown for the missing series. The frontend is ready to consume the data once the APIs are available.

### Missing API 1: CVT (Digitization) daily counts - CRITICAL

**What:** Per-day count of prescriptions that were digitized (CVT-ed) in SmartSync.
**Why:** Populates the "Digitized (CVT)" series in the Visit trend bar chart.
**Source:** MongoDB (CVT/digitization records)

```
Suggested: GET /api/v1/reports/cvt/daily
Params: startDate, endDate, [doctorId], [clinicId]
Response shape: { labels: ["2026-07-01", ...], datasets: [{ label: "Digitized", data: [12, 8, ...] }] }
```

Date labels must match the format from `analyticsAppointment` so the frontend can merge by date.

### Missing API 2: CVT (Digitization) by doctor - CRITICAL

**What:** Per-doctor count of digitized prescriptions.
**Why:** Populates the "Digitized (CVT)" series in the Doctor-wise comparison bar chart.
**Source:** MongoDB (CVT/digitization records)

```
Suggested: GET /api/v1/reports/cvt/by-doctor
Params: startDate, endDate, [clinicId]
Response shape: { labels: ["Dr. Sharma", ...], datasets: [{ label: "Digitized", data: [45, ...] }] }
```

Doctor name labels must match those from `clinicConsultationModes` (`byDoctor.labels`).

### Missing API 3: Daily completed consultation counts - NICE TO HAVE

**What:** Per-day count of completed consultations (not just total appointments).
**Why:** Populates the "Consultations completed" series in the Visit trend chart. Currently zero because the existing appointment endpoint only returns total daily counts, not a status breakdown per day.
**Alternative:** If the existing `/api/v1/reports/analytics/appointment` endpoint can add a second dataset to its `appointments` response for completed counts, that also works.

```
Option A - extend existing endpoint:
GET /api/v1/reports/analytics/appointment
Response: appointments.datasets = [
  { label: "Booked", data: [...] },
  { label: "Completed", data: [...] }   // <-- new dataset
]

Option B - new endpoint:
GET /api/v1/reports/consultations/daily
Params: startDate, endDate, [doctorId], [clinicId]
Response shape: { labels: [...], datasets: [{ label: "Completed", data: [...] }] }
```

### Missing API 4: Doctor-wise booked appointment counts - NICE TO HAVE

**What:** Per-doctor count of appointments booked (not just completed consultations).
**Why:** Populates the "Appointments booked" series in the Doctor-wise comparison chart. Currently zero because the consultation modes endpoint only returns completed consultations per doctor.

```
Option A - extend existing endpoint:
GET /api/v1/reports/clinic/consultation-modes
Response: byDoctor.datasets = [
  { label: "Completed", data: [...] },  // existing
  { label: "Booked", data: [...] }      // <-- new dataset
]

Option B - new endpoint:
GET /api/v1/reports/appointments/by-doctor
Params: startDate, endDate, [clinicId]
Response shape: { labels: [...], datasets: [{ label: "Booked", data: [...] }] }
```

---

## Priority summary

| # | API | Priority | Status | Impact |
|---|-----|----------|--------|--------|
| 1 | CVT daily counts | CRITICAL | Not available | Visit trend "Digitized" series shows 0 |
| 2 | CVT by doctor | CRITICAL | Not available | Doctor-wise "Digitized" series shows 0 |
| 3 | Daily completed counts | Nice to have | Not available | Visit trend "Completed" series shows 0 |
| 4 | Doctor-wise booked counts | Nice to have | Not available | Doctor-wise "Booked" series shows 0 |

**All response shapes should follow the existing Pm-Core reporting standard:** `{ labels: [...], datasets: [{ label: "...", data: [...] }] }`

---

## Frontend integration instructions

Once the APIs are available, update `src/pages/mission-analytics/data/useMissionData.js`:

1. Add the new API calls to the `Promise.all` in the `load` function
2. In `buildVisitTrend`: merge the CVT daily data and completed daily data into the existing date-keyed rows
3. In `buildDoctorBars`: merge the CVT by-doctor data and booked by-doctor data into the existing doctor-keyed rows

The chart components (BarChartZ) already render multi-series grouped bars. No UI changes needed once the data hooks are updated.

---

## How to test

1. Run `npm run start:dev` (needs `.env.dev`)
2. Navigate to `http://localhost:3000/?authToken=<mission-hospital-token>`
3. Click "Data Analytics" in the sidebar, or go directly to `/mission-analytics`
4. The page loads with live data from UAT for Mission Hospital
