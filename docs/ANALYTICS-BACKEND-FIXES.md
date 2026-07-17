# Data Analytics: Backend fixes needed

**Date:** 2026-07-17
**Branch:** `data_analytics_sham_final`
**UAT:** `pm-core-uat.tatvacare.in` (business 396741719906700, clinic 390)

All items below are things the frontend cannot fix. They are ordered by what
unblocks the most surface area first.

---

## P0: Server crashes (500 errors)

### 1. No-doctor path crashes on the care family

**Endpoints:** `clinical/symptoms`, `clinical/examination`, `clinical/summary`,
`clinical/trends?topic=symptoms`

**Symptom:** 500 when called without `doctorId`. Works fine with `doctorId`.

**Root cause:** `clinic.model.ts caseParts()` uses `RIGHT JOIN user_master`
which fans the query across every user of every business. The
`WHERE cm.hm_business_id = ?` makes this semantically inner already.

**Fix:** Change `RIGHT JOIN` to `INNER JOIN` (or `EXISTS` on
`u.ut_id IN (1,2)`).

**FE impact:** The dashboard defaults to "All doctors". Care section Symptoms,
Examination, and Overview top-symptom KPI are dead until this lands.

### 2. `operational/overview` crashes unconditionally

**Endpoint:** `operational/overview`

**Symptom:** 500 for any window (1-day, 7-day, 30-day), with or without
`doctorId`/`clinicId`. This is a separate crash from the care family join.

**FE impact:** Overview headline KPIs (top symptom/medication/condition) fall
back to individual endpoint calls, adding 3 extra requests.

### 3. `clinical/appointment/detailed` crashes

**Endpoint:** `clinical/appointment/detailed`

**Symptom:** 500 with any parameters (startDate, endDate, with or without
filters).

**FE impact:** The Appointment Detailed Report CSV export is completely
un-exportable.

---

## P1: Missing data / wrong responses

### 4. Free-text parse returns empty for all doctors (symptoms, examination, history)

**Endpoints:** `clinical/symptoms`, `clinical/examination`,
`clinical/medical-history`

**Symptom:** Zero rows/counts for all 8 doctors over a full year
(365-day window, per-doctor calls). Meanwhile structured domains (diagnoses,
medications, investigations, vitals, certificates) have plenty of data.

**Root cause:** `tcm_history_box` / `tcm_examination_box` are **longblob**
with a dual format flagged by `tcm_history_box_type` (0 = textarea, not JSON;
1 = listing, JSON). The `rankFreeText` parse is likely tuned to one format
and returns zero on businesses that write the other. Must branch on the type
flag and handle blob-to-UTF8 conversion.

Also verify: `tcm_mh_json` (json) section parse (`tmhs_id 1/2/3`) against
real rows. Note `tbl_patient_permanent_history.mh_json` is commented
"Not Use" in the schema.

**FE impact:** "Top symptom", "Top examination", and all History sub-tab
donuts show "No data" across the module.

### 5. Advance deposit has no per-mode breakdown

**Endpoint:** `billing/advancedDeposit/dashboard`

**Symptom:** Returns only totals (`totalAdvanceReceived/Refunded/Debited`)
but no `paymentModeSummary`.

**Fix:** Add `paymentModeSummary` (same shape as the bill dashboard):
`tbl_opd_billing_advance_master.payment_option` joined to
`tbl_biiling_payment_option.bpid`. Identical join the collection
line-items SQL already uses.

**FE impact:** We removed the "Advance by mode" donuts and replaced with an
"Advance deposit status" summary donut. If you add the per-mode breakdown,
we can restore the per-mode view.

### 6. `custom-models` returns all zeros

**Endpoint:** `clinical/custom-models`

**Symptom:** `createdModels:0, creatingDoctors:0, modelsByType:[]` for a
business that builds custom models.

**Root cause:** 2-hop doctor-to-business scope (your triage BUG-10).

**FE impact:** Custom Modules tab shows all zeros. If unfixable, tell us and
we remove the tab entirely.

### 7. `analytics/patients` rejects CSV `clinicId`

**Endpoint:** `analytics/patients?clinicId=390,391`

**Symptom:** 400 error. `doctorId` CSV works fine.

**Fix:** Split `clinicId` the same way `doctorId` is split.

**FE impact:** Multi-clinic accounts lose the entire Patients section. FE
currently narrows to single clinic as workaround.

### 8. CSV multi-id silently coerces on clinic/care endpoints

**Endpoints:** All `clinical/*` and `clinic/*` endpoints

**Symptom:** `clinicId=390,391` quietly coerces to `clinicId=390` via MySQL
`um_id = ?` compare. Single-doctor data returned silently.

**Fix:** Either split CSVs like the analytics family, or return 400 on
commas. Until then the FE omits multi-select values (sends business-wide).

### 9. `inpatient-summary` dischargeTypes is always empty

**Endpoint:** `analytics/inpatient-summary`

**Symptom:** `kpis.discharges = 7` but `dischargeTypes: []`.

**Fix:** `tbl_admit_patient_master.tidt_id` joined to
`tbl_inpatient_discharge_type.tidt_type`, filtered by
`tapm_discharge = 1` in the window. The schema fully supports this.

---

## P2: Quality-of-life improvements

### 10. No `previous` block on billing dashboards

**Endpoints:** `billing/bill/dashboard`, `billing/advancedDeposit/dashboard`

**Current:** The FE double-fetches the previous window to compute delta
pills (e.g. "8% vs previous period").

**Ask:** Add a `previous:{}` block (same fields, previous equal-length
window) server-side. Would halve the billing API calls.

### 11. `clinic/followups` missing `byDoctor`

**Endpoint:** `clinic/followups`

**Symptom:** Shipped for `clinical/lab-test` but not followups.

**FE impact:** Grow section "Follow-ups by doctor" tile stays empty.

### 12. `adc` KPI not returned on inpatient-summary

**Endpoint:** `analytics/inpatient-summary`

**Symptom:** `kpis` carries census/admissions/discharges/bor/alos but no
`adc` (Average Daily Census).

**FE workaround:** Derived client-side as mean of the `census` day-series.
Fine either way, flagging the contract drift.

### 13. `ipd/clinical` labResults missing

**Endpoint:** `ipd/clinical`

**Source:** `tbl_inpatient_lab_val.tilv_date` (your BUG-5).

### 14. Ward transfer count (BUG-6)

**Source:** `tbl_atd_logs`

**FE status:** Will wire `roomShifts` + `wardTransfers` once confirmed
fixed.

---

## P3: New capabilities (product requests, sources exist)

### 15. Lookups endpoint for report filters

**Ask:** `GET /reports/lookups` (business-scoped from token), four arrays:

| List | Table | Columns | Filter |
|---|---|---|---|
| paymentOptions | `tbl_biiling_payment_option` | `bpid`, `title` | `del=0`, `hm_business_id` |
| accounts | `tbl_bill_account_name` | `tban_id`, `tban_account_name` | `tban_del=0`, `hm_business_id` |
| departments | `tbl_department` | `dp_id`, `dp_name` | `dp_del=0`, `hm_id` |
| incentiveUsers | `tbl_incentive_master` | `tim_id`, `tim_user_name` | `tim_del=0`, `hm_business_id` |

**FE impact:** Unblocks every remaining Tab-3 report filter at once.

### 16. `byDoctor` for symptoms, examination, and advice

**Endpoints:** `clinical/symptoms`, `clinical/examination`,
`clinical/advice`

**Ask:** Same grouped `um_id` query that `clinical/lab-test.byDoctor`
already ships.

**FE impact:** Enables per-doctor bar charts for these Care sub-tabs.

### 17. `catalogVsCustom` for symptoms and examination

**Endpoints:** `clinical/symptoms`, `clinical/examination`

**Source:** `tcm_history_box_type` (0 = free-typed, 1 = catalog listing) is
the split. One `GROUP BY`.

### 18. `financial/collection/*` default scope

**Ask:** Default to all business clinics when `clinicId` is omitted (matches
how the Billing section presents money). Currently returns 403 for
multi-clinic accounts without an explicit clinic.

### 19. Account creation date for "Till date" preset

**Ask:** Expose `accountCreatedAt` (on capabilities or a lookup). The FE
will build the "Till date" preset from it. Keep the 366-day cap.

---

## Frontend optimizations already shipped (this branch)

For context, these are the performance improvements already implemented on the
frontend side:

- **API request cache** (30s TTL): prevents redundant fetches when switching
  sections. Shared across all data hooks.
- **Deferred fallback calls** in Overview: primary burst cut from 8 to 5
  concurrent requests. Fallback endpoints fire only when needed.
- **Sub-tab state merging** in Care: switching tabs preserves loaded data
  instead of flashing empty.
- **Batched fan-out** in Consultation Modes: per-doctor calls batch in groups
  of 4 (respects browser 6-connection limit).
- **React.memo** on DonutWithLegend and KpiRow to skip unnecessary re-renders.
- **useMemo** on all derived data in OverviewSection, BillingSection, and
  CareSection.
- **Module-level constants** (BILLING_TOOLTIPS, ZERO_KPIS, etc.) to avoid
  re-creating objects on every render.
- **Removed unsupported advance mode donuts** and replaced with "Advance
  deposit status" donut using existing data (no new API call).
