# Data Analytics: Known Limitations and Deferred Features

**Branch:** `TPA-data-analytics`
**Last updated:** 2026-07-21

This document lists features that were removed, deferred, or limited due to backend API restrictions. These are all good-to-have features that the frontend is ready to support once the backend catches up.

---

## Features removed from the UI

These were built but removed because the backend returns no usable data.

### OPD Grow section (follow-ups, ABHA)

**What it was:** A section showing follow-up adherence (advised vs kept vs missed), follow-up trends, per-doctor breakdown, and ABHA linkage stats.

**Why removed:** The `clinic/followups` endpoint returns empty data (no records in the reporting tables). The ABHA endpoints (`operational/abha`) also return zeros.

**Frontend status:** `GrowSection.jsx`, `useGrowData.js` exist and are functional. The nav entry in `analyticsNav.js:19` is commented out. Uncomment and it works once the backend populates follow-up data.

---

### Care: Symptoms sub-tab

**What it was:** Top symptoms donut, symptoms by doctor bar chart, symptoms over time trend.

**Why removed:** The `clinical/symptoms` endpoint returns severity text (e.g. "Mild", "Moderate") as symptom names instead of the actual symptom text. The backend reads from `jsonEntryNames` which pulls from the wrong JSON field.

**Frontend status:** Tab trigger in `DataAnalyticsPage.jsx:74` is commented out. The data hook in `useCareData.js` still handles the `symptoms` sub-tab key.

---

### Care: Examination sub-tab

**What it was:** Top examination findings donut, examinations by doctor bar chart, trend chart.

**Why removed:** The `clinical/examination` endpoint returns truncated strings with slash separators and garbage characters. The backend truncates at 2048 chars and includes free-text noise.

**Frontend status:** Tab trigger in `DataAnalyticsPage.jsx:75` is commented out.

---

### Care: Medical History sub-tab

**What it was:** Top conditions, allergies, family history, lifestyle factors, history entries over time.

**Why removed:** The `clinical/medical-history` endpoint returns zero rows for all queries. The backend likely reads from the wrong table or has a JSON shape mismatch.

**Frontend status:** Tab trigger in `DataAnalyticsPage.jsx:80` is commented out.

---

### Care: Certificates sub-tab

**What it was:** Top certificates issued, certificates by doctor, trend chart.

**Why removed:** The `clinical/certificates` endpoint returns zero data. No certificates are populated in the reporting tables.

**Frontend status:** Tab trigger in `DataAnalyticsPage.jsx:84` is commented out.

---

### Care: Custom Modules sub-tab

**What it was:** Custom model usage (type distribution, by doctor, template usage over time).

**Why removed:** The `clinical/custom-models` endpoint returns zero data.

**Frontend status:** Tab trigger in `DataAnalyticsPage.jsx:87` is commented out.

---

### IPD Clinical Activity section

**What it was:** IPD clinical KPIs (nursing notes, OT procedures, lab results, discharge summaries) and related charts.

**Why removed:** The `ipd/clinical` endpoint returns zeros for every KPI and chart, even over a 365-day window. Nursing notes and OT procedures are untracked in the reporting service; lab results read from the wrong table.

**Frontend status:** `ClinicalActivitySection.jsx` and `useClinicalActivityData.js` exist. The nav entry in `analyticsNav.js:28` is commented out.

---

## Features limited by backend restrictions

These are working but with reduced functionality.

### Multi-doctor/clinic filtering on clinic/* endpoints

**Limitation:** The `clinic/*` family of endpoints (top-cards, consultation-modes, rx, followups, consultations/weekly) reject CSV values for `doctorId` and `clinicId` with a 400 VALIDATION_ERROR. Only single-ID values are accepted.

**Workaround:** The frontend uses `singleIdOnly()` to pass only single IDs to these endpoints. When multiple doctors/clinics are selected, these endpoints receive no filter and return data for all doctors/clinics. The `operational/*` and `analytics/*` endpoints accept CSV values and filter correctly.

**Impact:** When 2+ doctors are selected, Overview KPI cards (top consultations, top mode) and Consult Modes section may show broader data than expected.

---

### 31-day date range cap

**Limitation:** The reporting service enforces a maximum date range. Custom date ranges beyond 31 days are automatically clamped to the most recent 31 days from the end date.

**Frontend code:** `DataAnalyticsPage.jsx:155-160` enforces this cap on the client side.

---

### Till-date preset missing account creation date

**Limitation:** The "Till date" preset ideally should go back to the account creation date. The backend does not expose `accountCreatedAt`, so this preset uses 365 days as a fallback (then clamped to 31 days by the range cap).

---

### IPD discharge types always empty

**Limitation:** The `analytics/inpatient-summary` endpoint returns total discharge counts but the `dischargeTypes` array is always empty. The Admissions section shows discharge type donuts that zero-fill with the expected categories (Recovered, Referred, LAMA, DAMA, Transfer out, Death, Unspecified) but display no data.

---

### IPD per-ward breakdown incomplete

**Limitation:** Ward-level charts (beds per ward, occupancy by ward, bed distribution, ALOS by ward) rely on the `ipd/wards` endpoint. The endpoint returns real ward data but some fields (transfer count, bed "blocked" status) are not populated.

---

### Report filter lookups

**Limitation:** Report download drawers would benefit from dynamic filter options (payment modes, departments, accounts). Currently these are either hardcoded or omitted. A `GET /reports/lookups` endpoint would allow dynamic filter population.

---

### Diagnosis deduplication

**Limitation:** The `clinical/diagnosis` endpoint sometimes returns un-grouped duplicate rows (same diagnosis appearing multiple times with different counts). The frontend aggregates these client-side, but this should be deduplicated server-side for accurate counts.

---

### Top-cards doctorId filter

**Limitation:** The `clinic/dashboard/top-cards` endpoint accepts `doctorId` but returns 0 for all metrics regardless of which doctor is selected. This is a backend bug where the doctor filter is accepted but not applied to the SQL query.

**Impact:** When filtering by a specific doctor, the Overview section's top-cards KPIs (Total consultations, Top mode, Top diagnosis) show 0 instead of the doctor's actual numbers.

---

## Summary

| Category | Count | Items |
|---|---|---|
| OPD sections removed | 1 | Grow |
| Care sub-tabs removed | 5 | Symptoms, Examination, Medical History, Certificates, Custom Modules |
| IPD sections removed | 1 | Clinical Activity |
| Features limited | 8 | Multi-filter on clinic/*, 31-day cap, till-date preset, discharge types, ward breakdown, report lookups, diagnosis dedup, top-cards doctorId |
| Active OPD sections | 8 | Overview, Appointments, Consult Modes, Billing, Patients, Care (7 sub-tabs), Messages, Reports |
| Active IPD sections | 5 | Overview, Admissions, Wards, Billing, Reports |
