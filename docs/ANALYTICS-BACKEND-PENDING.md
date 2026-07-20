# Data Analytics: Backend items still pending

**Date:** 2026-07-20
**Branch:** `TPA-data-analytics`
**Backend repo:** `DHSPL-Tatvacare/Pm-Core` (branch `uat`)
**Last UAT deploy:** 2026-07-18 (PR #11, feat/reports-uat-bugfixes-3)

---

## Status summary

Out of the original 20 backend items in `ANALYTICS-BACKEND-FIXES.md`, **11 have been fixed** on UAT. The **9 items below are still pending**. For each item, the "FE action taken" column shows what we did on the frontend to handle the gap.

---

## Still pending from Pm-Core

### 1. `operational/overview` crashes unconditionally (P0)

**Endpoint:** `GET /reports/operational/overview`
**Symptom:** 500 for any window, with or without filters. Separate crash from the care family join (which was fixed in UAT#2).
**FE action taken:** Overview section uses 3 fallback endpoint calls instead. Works, but adds 3 extra requests per load.
**Backend fix needed:** Debug and fix the crash. Likely a similar JOIN issue to the one fixed in UAT#2.

---

### 2. `custom-models` returns all zeros (P1)

**Endpoint:** `GET /reports/clinical/custom-models`
**Symptom:** `createdModels:0, creatingDoctors:0, modelsByType:[]` for a business that uses custom models.
**Root cause:** 2-hop doctor-to-business scope issue (original BUG-10).
**FE action taken:** Custom Modules sub-tab hidden from Care section. Will restore when this is fixed.
**Backend fix needed:** Fix the business scope resolution so the curation snapshot query returns data.

---

### 3. `inpatient-summary` dischargeTypes always empty (P1)

**Endpoint:** `GET /reports/analytics/inpatient-summary`
**Symptom:** `kpis.discharges = 7` but `dischargeTypes: []`. The admission counts are correct but the type breakdown is missing.
**Source:** `tbl_admit_patient_master.tidt_id` joined to `tbl_inpatient_discharge_type.tidt_type`, filtered by `tapm_discharge = 1`.
**FE action taken:** Discharge types donut chart hidden from Admissions section. Will restore when this is fixed.
**Backend fix needed:** Add the `tidt_id` JOIN to populate `dischargeTypes` array.

---

### 4. `ipd/clinical` labResults missing (P2)

**Endpoint:** `GET /reports/ipd/clinical`
**Source:** `tbl_inpatient_lab_val.tilv_date` (original BUG-5).
**FE action taken:** IPD Clinical Activity section removed from the sidebar nav entirely. Will restore when backend ships real data for notes, OT, and lab results.
**Backend fix needed:** Wire the lab values query from the correct table.

---

### 5. Ward transfer count not available (P2)

**Source:** `tbl_atd_logs` (room shifts and ward transfers).
**FE action taken:** Not wired. Will add `roomShifts` + `wardTransfers` KPIs and transfer bar chart once confirmed.
**Backend fix needed:** Add ward transfer counts from `tbl_atd_logs` to `ipd/wards` response.

---

### 6. `financial/collection/*` default scope for multi-clinic (P2)

**Endpoints:** `GET /reports/financial/collection/summary`, `/collection/detailed`
**Symptom:** Returns 403 for multi-clinic accounts when `clinicId` is omitted.
**FE action taken:** No change. Single-clinic accounts work fine. Multi-clinic accounts must select a specific clinic.
**Backend fix needed:** Default to all business clinics when `clinicId` is omitted (same behavior as the billing section).

---

### 7. Bed "blocked" status not exposed (P3 / new)

**Endpoint:** `GET /reports/ipd/wards`
**Current behavior:** Returns `beds` (total), `occupied`, `available`. Blocked beds are implicitly `total - occupied - available` but not explicitly returned.
**Source:** `tbl_ward_room_management.twrm_block` (0 = not blocked, 1 = blocked). Available is already filtered to `twrm_status='0' AND twrm_block='0'`.
**FE action taken:** None. We can derive blocked count client-side, but an explicit `blocked` field would be cleaner.
**Backend ask:** Add `blocked` count to the ward KPIs and `wardBreakdown` array entries.

---

### 8. Symptom/Examination data quality: severity and slash artifacts (P3 / new)

**Endpoints:** `GET /reports/clinical/symptoms`, `GET /reports/clinical/examination`
**Symptom:** The `topSymptoms` donut shows severity text ("Mild", "Moderate") as separate symptom entries. The `topFindings` shows slashes from medical abbreviations or truncated JSON.
**Root cause:** `splitFreeText()` in `care.helper.ts` uses `jsonEntryNames()` which pulls from ALL of `[name, title, value, label, text]` fields. When a JSON listing entry has `{"name":"Fever","value":"Mild"}`, both "Fever" and "Mild" get counted as separate items.
**FE action taken:** None yet. Can add client-side filtering of known severity keywords.
**Backend fix needed:** In `jsonEntryNames()`, prefer `name`/`title` only and skip `value`/`label`/`text` when `name` is already present. Or strip known severity/status values from the ranked output.

---

## Out of Pm-Core scope (different service)

These live in **Pm-Patient-Docs** (MongoDB), not in the Pm-Core MySQL reporting pipeline:

| Item | Endpoint | What's missing |
|---|---|---|
| Advance deposit per-mode breakdown | `billing/advancedDeposit/dashboard` | `paymentModeSummary` array |
| Period-compare on billing | `billing/bill/dashboard` | `previous:{}` block |

**FE action taken:** Advance mode donuts replaced with "Advance deposit status" summary donut using existing totals. Billing period-compare uses double-fetch (two API calls for current + previous window).

---

## Already fixed on UAT (for reference)

| # | Item | Fixed in |
|---|---|---|
| 1 | No-doctor path crashes (symptoms/exam/summary/trends) | UAT#2 |
| 3 | `clinical/appointment/detailed` crashes | UAT#2 |
| 4 | Free-text parse empty (symptoms/exam/history) | UAT#3 |
| 8 | CSV multi-id coercion on clinic/care | UAT#3 (rejects 400) |
| 11 | `clinic/followups` missing `byDoctor` | UAT#3 |
| 12 | `adc` KPI on inpatient-summary | UAT#3 |
| 15 | Lookups endpoint for report filters | UAT#2 |
| 16 | `byDoctor` for symptoms/examination/advice | UAT#2 |
| 17 | `catalogVsCustom` for symptoms | UAT#3 |
| 19 | `accountCreatedAt` for "Till date" preset | UAT#3 |
| 20 | Per-ward breakdown on `ipd/wards` | UAT#3 |

---

## New UAT features not yet wired on frontend

These shipped on UAT but our frontend hasn't integrated them yet:

| Feature | Endpoint | What to wire |
|---|---|---|
| `catalogVsCustom` on symptoms | `clinical/symptoms` | Add a "Catalog vs Free-typed" donut to the Symptoms sub-tab |
| `accountCreatedAt` from lookups | `lookups` | Use as anchor for the "Till date" date preset instead of hardcoded 365 days |
| `adc` as server-computed KPI | `analytics/inpatient-summary` | Use `kpis.adc` directly instead of client-side derivation from census series |
| `byDoctor` on symptoms/exam/advice | `clinical/symptoms`, `examination`, `advice` | Already wired in CareSection (these now return real data) |
