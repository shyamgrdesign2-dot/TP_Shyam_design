# Backend API Fixes Required -- Data Analytics Module

**Date**: 2026-07-21
**UAT Base URL**: `https://pm-core-uat.tatvacare.in`
**Service**: Pm-Core Reporting (`/api/v1/reports/...`)
**Auth**: Bearer JWT (business scoped from token)
**Test clinic**: clinicId `390` (Apex Ortho), doctors `441` and `625`

This document lists every backend change the frontend Data Analytics module needs across both OPD and IPD. The frontend is already coded to handle the corrected responses. Once these fixes are deployed, multi-doctor filters, multi-clinic filters, and all KPI deltas will start working automatically.

---

## Priority legend

- **P0 (CRITICAL)**: Blocking. Multi-doctor and multi-clinic filters are completely broken without these.
- **P1 (MEDIUM)**: Data quality. Produces incorrect rankings and counts.
- **P2 (LOW)**: Missing data fields. Frontend falls back gracefully but cannot show delta indicators.

---

## Issue 1 -- CSV `doctorId` support on 15 OPD endpoints [P0]

### Problem

The frontend sends `doctorId=441,625` when the user selects multiple doctors. 15 endpoints reject this with `400 VALIDATION_ERROR` because the schema enforces `pattern: "^[^,]*$"` (no commas).

### Current error response

```json
{
  "error": "Invalid input data",
  "code": "VALIDATION_ERROR",
  "details": "querystring/doctorId must match pattern \"^[^,]*$\""
}
```

### Endpoints that need the fix (15 total)

**`clinic/*` group (6 endpoints)**:

| # | Path | Method |
|---|------|--------|
| 1 | `/api/v1/reports/clinic/dashboard/top-cards` | GET |
| 2 | `/api/v1/reports/clinic/consultation-modes` | GET |
| 3 | `/api/v1/reports/clinic/diagnosis` | GET |
| 4 | `/api/v1/reports/clinic/rx` | GET |
| 5 | `/api/v1/reports/clinic/followups` | GET |
| 6 | `/api/v1/reports/clinic/consultations/weekly` | GET |

**`clinical/*` group (9 endpoints)**:

| # | Path | Method |
|---|------|--------|
| 7 | `/api/v1/reports/clinical/symptoms` | GET |
| 8 | `/api/v1/reports/clinical/lab-test` | GET |
| 9 | `/api/v1/reports/clinical/examination` | GET |
| 10 | `/api/v1/reports/clinical/advice` | GET |
| 11 | `/api/v1/reports/clinical/medical-history` | GET |
| 12 | `/api/v1/reports/clinical/vitals` | GET |
| 13 | `/api/v1/reports/clinical/certificates` | GET |
| 14 | `/api/v1/reports/clinical/trends` | GET |
| 15 | `/api/v1/reports/clinical/diagnosis-trends` | GET |

### Endpoints that already accept CSV doctorId (reference, no change needed)

| # | Path | Status |
|---|------|--------|
| 1 | `/api/v1/reports/operational/overview` | 200 OK |
| 2 | `/api/v1/reports/operational/abha` | 200 OK |
| 3 | `/api/v1/reports/analytics/patients` | 200 OK |
| 4 | `/api/v1/reports/clinical/appointment/summary` | 200 OK (but see Issue 4) |
| 5 | `/api/v1/reports/clinical/vaccines` | 200 OK |
| 6 | `/api/v1/reports/clinical/custom-models` | 200 OK |
| 7 | `/api/v1/reports/ipd/wards` | 200 OK |
| 8 | `/api/v1/reports/ipd/clinical` | 200 OK |
| 9 | `/api/v1/reports/ipd/bed-turnover` | 200 OK |

### What to change

1. **Schema validation**: Change the `doctorId` query parameter from `pattern: "^[^,]*$"` to accept comma-separated integers. Recommended pattern: `"^\\d+(,\\d+)*$"` or simply validate as a string and split on commas.

2. **SQL query**: Change `WHERE doctor_id = ?` to `WHERE doctor_id IN (?)`. Split the CSV string into an array of integers before binding.

3. **Semantics**: Union, not intersection. `doctorId=441,625` means "data from doctor 441 OR doctor 625". All numeric counts/totals are the combined sum across selected doctors. The response shape stays identical.

### How to verify

```bash
# Currently returns 400, should return 200 with combined data
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinic/dashboard/top-cards?startDate=2026-07-21&endDate=2026-07-21&doctorId=441,625"

# Test each of the 15 endpoints above with doctorId=441,625
# All should return 200 with the union of data for both doctors
```

---

## Issue 2 -- CSV `clinicId` support on the same 15 OPD endpoints [P0]

### Problem

Same 15 endpoints also reject comma-separated `clinicId` values. The schema requires `clinicId` to be a single integer.

### Current error response

```json
{
  "details": "querystring/clinicId must be integer"
}
```

### What to change

1. **Schema validation**: Change `clinicId` from `type: integer` to accept a comma-separated string of integers (e.g., `clinicId=390,391`).

2. **SQL query**: Change `WHERE clinic_id = ?` to `WHERE clinic_id IN (?)`.

3. **Semantics**: Same union semantics as doctorId. Combined data across all selected clinics.

### How to verify

```bash
# Currently returns 400, should return 200
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinic/dashboard/top-cards?startDate=2026-07-21&endDate=2026-07-21&clinicId=390,391"
```

### Important note

Both `doctorId` and `clinicId` CSV support must be applied to ALL 15 endpoints. They should also work together:

```
?doctorId=441,625&clinicId=390,391
```

This should return data for doctors 441 and 625 across clinics 390 and 391.

---

## Issue 3 -- `top-cards` doctorId filter returns 0 for every doctor [P0]

### Problem

`/api/v1/reports/clinic/dashboard/top-cards` accepts a single `doctorId` without error (200 OK), but always returns `consultations.count = 0` regardless of which doctor is passed. The unfiltered response correctly shows 7 consultations.

### Reproduction

```bash
# No filter: correct
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinic/dashboard/top-cards?startDate=2026-07-21&endDate=2026-07-21"
# Response: { "consultations": { "count": 7 } }

# With doctorId=441: wrong (returns 0)
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinic/dashboard/top-cards?startDate=2026-07-21&endDate=2026-07-21&doctorId=441"
# Response: { "consultations": { "count": 0 } }

# With doctorId=625: also wrong (returns 0)
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinic/dashboard/top-cards?startDate=2026-07-21&endDate=2026-07-21&doctorId=625"
# Response: { "consultations": { "count": 0 } }
```

### Root cause (likely)

The SQL WHERE clause for the consultation count is filtering on the wrong column. Common causes:
- Filtering on `created_by` instead of `doctor_id`
- The doctorId filter is applied to a subquery/JOIN that doesn't have the doctor column
- A type mismatch (string vs integer comparison)

### Expected behavior

If there are 7 total consultations and doctor 441 did 6 of them while doctor 625 did 1:
- `?doctorId=441` should return `{ "consultations": { "count": 6 } }`
- `?doctorId=625` should return `{ "consultations": { "count": 1 } }`
- No filter should return `{ "consultations": { "count": 7 } }`

The doctorId filter should apply to ALL fields in the response (consultations, prescriptions, topDiagnosis, pctChange), not just some.

---

## Issue 4 -- `appointment/summary` ignores both `doctorId` and `clinicId` [P0]

### Problem

`/api/v1/reports/clinical/appointment/summary` accepts `doctorId` and `clinicId` query parameters without error, but completely ignores them. Returns identical data regardless of filter values, including for non-existent IDs.

### Reproduction

```bash
# No filter
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinical/appointment/summary?startDate=2026-07-21&endDate=2026-07-21"
# Response: { "kpis": { "total": 8, "completed": 7, "inQueue": 1, "cancelled": 0 } }

# Non-existent doctorId=99999: SAME result (should be 0)
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinical/appointment/summary?startDate=2026-07-21&endDate=2026-07-21&doctorId=99999"
# Response: { "kpis": { "total": 8, "completed": 7 } }  <-- should be all zeros

# Different clinicId=391: SAME result (should be different or 0)
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinical/appointment/summary?startDate=2026-07-21&endDate=2026-07-21&clinicId=391"
# Response: { "kpis": { "total": 8 } }  <-- should reflect clinic 391 only
```

### What to change

Add WHERE conditions for `doctorId` and `clinicId` to the appointment summary query:

```sql
-- Pseudocode
SELECT ... FROM appointments
WHERE business_id = :business_id
  AND appointment_date BETWEEN :startDate AND :endDate
  AND (:doctorId IS NULL OR doctor_id IN (:doctorIds))   -- ADD THIS
  AND (:clinicId IS NULL OR clinic_id IN (:clinicIds))   -- ADD THIS
```

Both parameters should support CSV format (IN clause) for multi-select.

The filter must apply to ALL sections of the response:
- `kpis` (total, completed, inQueue, cancelled)
- `kpis.previous` (same fields for previous period)
- `channelMix` (In Clinic vs Video breakdown)
- `visitsByHour` (if present)
- `newVsReturning` (if present)

### How to verify

```bash
# With doctorId=99999 (non-existent): should return all zeros
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinical/appointment/summary?startDate=2026-07-21&endDate=2026-07-21&doctorId=99999"
# Expected: { "kpis": { "total": 0, "completed": 0, "inQueue": 0, "cancelled": 0 } }

# With doctorId=441: should return only doctor 441's appointments
# With doctorId=441,625: should return combined data for both doctors
```

---

## Issue 5 -- Diagnosis endpoint returns un-grouped duplicate rows [P1]

### Problem

`/api/v1/reports/clinic/diagnosis` returns multiple rows for the same diagnosis name with `count: 1` each, instead of grouping by name and summing the count.

### Reproduction

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/clinic/diagnosis?startDate=2026-06-21&endDate=2026-07-21"
```

### Current (wrong) response

```json
{
  "topDiagnosis": [
    { "name": "test test test", "count": 1 },
    { "name": "test test test", "count": 1 },
    { "name": "Fever", "count": 1 },
    { "name": "Fever", "count": 1 }
  ]
}
```

### Expected (correct) response

```json
{
  "topDiagnosis": [
    { "name": "Fever", "count": 2 },
    { "name": "test test test", "count": 2 }
  ]
}
```

### What to change

Add `GROUP BY` and `SUM` to the diagnosis query:

```sql
-- Current (likely)
SELECT diagnosis_name AS name, 1 AS count FROM ...

-- Fix
SELECT diagnosis_name AS name, COUNT(*) AS count
FROM ...
GROUP BY diagnosis_name
ORDER BY count DESC
```

### Why this matters

The frontend has a client-side workaround (aggregating duplicates), but:
- Top-N ranking is wrong (the backend returns 10 rows that might be 3 unique diagnoses)
- Pagination breaks (page 2 may have duplicates of page 1 entries)
- The `byDoctor` breakdown (stacked bar) can't be accurately computed client-side

---

## Issue 6 -- `appointment/summary` incomplete `previous` period fields [P2]

### Problem

The `kpis.previous` object only includes `total` and `completed`. Missing: `cancelled`, `inQueue`. The frontend uses these to show percentage change (delta) indicators on KPI cards.

### Current response

```json
{
  "kpis": {
    "total": 8,
    "completed": 7,
    "inQueue": 1,
    "cancelled": 0,
    "previous": {
      "total": 5,
      "completed": 5
    }
  }
}
```

### Expected response

```json
{
  "kpis": {
    "total": 8,
    "completed": 7,
    "inQueue": 1,
    "cancelled": 0,
    "previous": {
      "total": 5,
      "completed": 5,
      "inQueue": 0,
      "cancelled": 0
    }
  }
}
```

### What to change

Run the same aggregation query for the previous period window and include `inQueue` and `cancelled` counts in the `previous` object. The previous period is the same-length window immediately before `startDate`:
- If the request is for July 15-21 (7 days), previous period = July 8-14
- If the request is for July 1-31 (31 days), previous period = June 1-30

---

## Issue 7 -- `appointment/summary` missing `channelMix` previous period data [P2]

### Problem

The `channelMix` array (In Clinic vs Video consultation split) has no previous-period data. The frontend cannot show trend arrows for channel distribution.

### Current response

```json
{
  "channelMix": [
    { "label": "In Clinic", "value": 8 },
    { "label": "Video", "value": 0 }
  ]
}
```

### Expected response

Add a `previous` field to each channelMix entry:

```json
{
  "channelMix": [
    { "label": "In Clinic", "value": 8, "previous": 5 },
    { "label": "Video", "value": 0, "previous": 0 }
  ]
}
```

---

## Issue 8 -- IPD endpoints: add `doctorId` filter support [P0]

The IPD endpoints already accept CSV `doctorId` in the schema (no 400 error), but they need to be verified to ensure the `doctorId` parameter actually filters the data (same class of bug as Issue 4 where the parameter is accepted but ignored).

The frontend will pass `doctorId` to all IPD endpoints. The backend must honor it.

### IPD endpoints that need `doctorId` filter verification and support

| # | Path | Method | CSV doctorId accepted? | Needs to verify: filter actually works |
|---|------|--------|----------------------|----------------------------------------|
| 1 | `/api/v1/reports/ipd/wards` | GET | Yes (200) | Verify doctorId actually filters ward data |
| 2 | `/api/v1/reports/ipd/clinical` | GET | Yes (200) | Verify doctorId filters clinical notes, OT procedures |
| 3 | `/api/v1/reports/ipd/bed-turnover` | GET | Yes (200) | Verify doctorId filters bed turnover/ALOS stats |
| 4 | `/api/v1/reports/analytics/inpatient-summary` | GET | Needs testing | Add doctorId filter to admissions, discharges, ALOS, BOR |

### What to verify and fix

For each IPD endpoint, run this test:

```bash
# Step 1: Call without doctorId
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/ipd/wards?startDate=2026-07-01&endDate=2026-07-21"

# Step 2: Call with a non-existent doctorId -- if the response is identical to Step 1,
# the filter is being IGNORED (same bug as Issue 4)
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/ipd/wards?startDate=2026-07-01&endDate=2026-07-21&doctorId=99999"
# Expected: zeros or empty data (no admissions under a non-existent doctor)

# Step 3: Call with a real doctorId
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/ipd/wards?startDate=2026-07-01&endDate=2026-07-21&doctorId=441"
# Expected: only data for doctor 441's patients

# Step 4: Call with CSV doctorId
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/ipd/wards?startDate=2026-07-01&endDate=2026-07-21&doctorId=441,625"
# Expected: combined data for both doctors
```

Repeat steps 1-4 for all 4 IPD endpoints listed above.

### What each IPD endpoint should filter by doctorId

**`/api/v1/reports/ipd/wards`** -- Filter by admitting/attending doctor:
- `kpis` (totalBeds, occupied, available, occupancyPct): filter occupied beds to those where the patient's doctor matches
- `wardBreakdown[]`: per-ward occupancy filtered by doctor's patients
- `occupancyOverTime`: time series filtered to doctor's patients
- `alosByWard`: ALOS for doctor's patients only

**`/api/v1/reports/ipd/clinical`** -- Filter by doctor who wrote the notes/performed procedures:
- `kpis` (clinicalNotes, otProcedures, dischargeSummaries, labResults): counts for the selected doctor(s)
- `notesByType[]`: note type breakdown for selected doctor(s)
- `otByDoctor`: this is already per-doctor, but when doctorId is passed, only show selected doctors
- `anaesthesiaMix[]`: procedures by selected doctor(s)

**`/api/v1/reports/ipd/bed-turnover`** -- Filter by attending doctor:
- All KPIs (ALOS, turnaroundTime, bedTurnover) computed only for patients under selected doctor(s)

**`/api/v1/reports/analytics/inpatient-summary`** -- Filter by admitting/attending doctor:
- `kpis` (census, admissions, discharges, alos, bor): for selected doctor's patients
- `kpis.previous`: same filter applied to previous period
- `flow` (admissions/discharges over time): filtered by doctor
- `census` (daily census series): filtered by doctor
- `dischargeTypes[]`: for selected doctor's discharges
- `admissionsByDept[]`, `admissionsByWard[]`: for selected doctor
- `losDistribution[]`: for selected doctor's patients

### CSV clinicId on IPD endpoints

Also verify that `clinicId` filtering works correctly on IPD endpoints. If it currently accepts only a single integer (like the OPD endpoints), add CSV support:

```bash
# Test CSV clinicId on IPD
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/ipd/wards?startDate=2026-07-01&endDate=2026-07-21&clinicId=390,391"
# Should return 200 with combined data across both clinics
```

---

## Issue 9 -- IPD `inpatient-summary` needs `doctorId` query param [P0]

### Problem

`/api/v1/reports/analytics/inpatient-summary` is used by three frontend sections (IPD Overview, Admissions & Discharges, and Wards). It currently accepts `days`, `startDate`, `endDate`, and `clinicId`, but does NOT accept `doctorId` at all.

### What to change

1. **Add `doctorId` to the schema**: Accept it as an optional query parameter (string, supporting CSV format like `doctorId=441,625`).

2. **Apply the filter**: When `doctorId` is passed, filter all aggregations to only include patients admitted under / attended by the selected doctor(s).

```sql
-- Pseudocode for admissions count
SELECT COUNT(*) as admissions FROM admissions
WHERE business_id = :business_id
  AND admission_date BETWEEN :startDate AND :endDate
  AND (:doctorId IS NULL OR doctor_id IN (:doctorIds))   -- ADD THIS
```

3. **Apply to ALL response sections**: kpis, kpis.previous, flow, census, dischargeTypes, admissionsByDept, admissionsByWard, losDistribution, wardSummary.

### How to verify

```bash
# Without doctorId: returns all data
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/analytics/inpatient-summary?startDate=2026-07-01&endDate=2026-07-21"

# With doctorId: should return filtered data (fewer admissions/discharges)
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/analytics/inpatient-summary?startDate=2026-07-01&endDate=2026-07-21&doctorId=441"

# With non-existent doctorId: should return zeros
curl -H "Authorization: Bearer $TOKEN" \
  "https://pm-core-uat.tatvacare.in/api/v1/reports/analytics/inpatient-summary?startDate=2026-07-01&endDate=2026-07-21&doctorId=99999"
```

---

## Summary checklist

| # | Issue | Priority | Scope | Endpoints | Change type |
|---|-------|----------|-------|-----------|-------------|
| 1 | CSV doctorId rejected | P0 | OPD | 15 endpoints | Schema validation + SQL IN clause |
| 2 | CSV clinicId rejected | P0 | OPD | Same 15 endpoints | Schema validation + SQL IN clause |
| 3 | top-cards doctorId returns 0 | P0 | OPD | 1 endpoint | Fix WHERE clause (wrong column) |
| 4 | appointment/summary ignores filters | P0 | OPD | 1 endpoint | Add WHERE for doctorId + clinicId |
| 5 | Diagnosis duplicates | P1 | OPD | 1 endpoint | Add GROUP BY + SUM |
| 6 | Missing previous period fields | P2 | OPD | 1 endpoint | Add cancelled/inQueue to previous |
| 7 | Missing channelMix previous | P2 | OPD | 1 endpoint | Add previous counts to channelMix |
| 8 | IPD doctorId filter ignored | P0 | IPD | 3 endpoints | Verify + fix WHERE for doctorId |
| 9 | inpatient-summary no doctorId param | P0 | IPD | 1 endpoint | Add doctorId param + filter |

### Complete endpoint map

All reporting endpoints the frontend calls, grouped by filter support status:

**OPD -- needs CSV doctorId + clinicId fix (15 endpoints)**:
1. `/api/v1/reports/clinic/dashboard/top-cards` (also fix: doctorId filter returns 0)
2. `/api/v1/reports/clinic/consultation-modes`
3. `/api/v1/reports/clinic/diagnosis` (also fix: GROUP BY dedup)
4. `/api/v1/reports/clinic/rx`
5. `/api/v1/reports/clinic/followups`
6. `/api/v1/reports/clinic/consultations/weekly`
7. `/api/v1/reports/clinical/symptoms`
8. `/api/v1/reports/clinical/lab-test`
9. `/api/v1/reports/clinical/examination`
10. `/api/v1/reports/clinical/advice`
11. `/api/v1/reports/clinical/medical-history`
12. `/api/v1/reports/clinical/vitals`
13. `/api/v1/reports/clinical/certificates`
14. `/api/v1/reports/clinical/trends`
15. `/api/v1/reports/clinical/diagnosis-trends`

**OPD -- filter logic broken (accepts param, ignores it)**:
16. `/api/v1/reports/clinical/appointment/summary` (ignores doctorId + clinicId)

**IPD -- verify doctorId filter actually works + add doctorId to inpatient-summary**:
17. `/api/v1/reports/ipd/wards` (accepts CSV doctorId, verify it filters)
18. `/api/v1/reports/ipd/clinical` (accepts CSV doctorId, verify it filters)
19. `/api/v1/reports/ipd/bed-turnover` (accepts CSV doctorId, verify it filters)
20. `/api/v1/reports/analytics/inpatient-summary` (add doctorId param entirely)

**Already working (no changes)**:
21. `/api/v1/reports/operational/overview` (CSV doctorId works)
22. `/api/v1/reports/operational/abha` (CSV doctorId works)
23. `/api/v1/reports/analytics/patients` (CSV doctorId works)
24. `/api/v1/reports/clinical/vaccines` (CSV doctorId works)
25. `/api/v1/reports/clinical/custom-models` (CSV doctorId works)

### Implementation order recommendation

1. Fix Issues 1 + 2 together (same 15 OPD endpoints, same schema change for CSV doctorId + clinicId)
2. Fix Issue 3 (top-cards doctorId filter, likely a one-line SQL fix)
3. Fix Issue 4 (appointment/summary filters, add WHERE conditions)
4. Fix Issue 5 (diagnosis GROUP BY)
5. Fix Issues 8 + 9 together (IPD doctorId: verify ipd/* endpoints, add param to inpatient-summary)
6. Fix Issues 6 + 7 together (appointment/summary previous period enhancements)

### Testing

After each fix, verify with these curl commands using `clinicId=390`, `doctorId=441,625`:

```bash
TOKEN="<your-bearer-token>"
BASE="https://pm-core-uat.tatvacare.in"

# Issue 1+2: CSV support (should return 200, not 400)
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/reports/clinic/dashboard/top-cards?startDate=2026-07-21&endDate=2026-07-21&doctorId=441,625"

# Issue 3: Single doctor filter (count should be > 0)
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/reports/clinic/dashboard/top-cards?startDate=2026-07-21&endDate=2026-07-21&doctorId=441"

# Issue 4: appointment/summary with fake doctor (total should be 0)
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/reports/clinical/appointment/summary?startDate=2026-07-21&endDate=2026-07-21&doctorId=99999"

# Issue 5: Diagnosis grouping (no duplicate names in topDiagnosis)
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/reports/clinic/diagnosis?startDate=2026-06-21&endDate=2026-07-21" | python3 -c "
import json,sys; d=json.load(sys.stdin)
names=[x['name'] for x in d.get('topDiagnosis',[])]
dupes=[n for n in set(names) if names.count(n)>1]
print('DUPLICATES:',dupes if dupes else 'None (PASS)')
"

# Issue 8: IPD wards with fake doctor (should return zeros/empty)
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/reports/ipd/wards?startDate=2026-07-01&endDate=2026-07-21&doctorId=99999"

# Issue 8: IPD clinical with fake doctor
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/reports/ipd/clinical?startDate=2026-07-01&endDate=2026-07-21&doctorId=99999"

# Issue 8: IPD bed-turnover with fake doctor
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/reports/ipd/bed-turnover?startDate=2026-07-01&endDate=2026-07-21&doctorId=99999"

# Issue 9: inpatient-summary with doctorId (should accept and filter)
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/reports/analytics/inpatient-summary?startDate=2026-07-01&endDate=2026-07-21&doctorId=441"
```
