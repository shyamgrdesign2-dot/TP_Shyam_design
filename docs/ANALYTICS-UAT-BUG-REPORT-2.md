# Analytics UAT Bug Report #2 — post PR #8/#9 verification

**Date:** 2026-07-15 · **UAT HEAD verified:** `642dc00b` (PR #9 merge, 07:26Z) · **Deployment confirmed
live** — PR #8's other fixes are visible in responses (certificates `byDoctor`/`patientsCertified`/
`topDoctor` present; medical-history returns the new `topLifestyle`/`topFamilyHistory`/`topAllergies`
fields; wards returns `roomShifts`/`wardTransfers`). So the findings below are NOT deploy lag.

Every finding was probed live against `pm-core-uat.tatvacare.in` with a real portal JWT
(business 396741719906700, clinic 390). Probe matrices are included so nothing needs re-diagnosis.

---

## P0-1 · BUG-1/2/3 fix is deployed but INCOMPLETE — the no-doctor path still 500s

The crash survives exactly on the **"All doctors" (no `doctorId`) code path**:

| Probe | Result |
|---|---|
| `clinical/symptoms?startDate&endDate` (7d, 1d, or Jan-2025 window) | **500** |
| `clinical/symptoms?…&doctorId=594` (same 7d window) | **200** |
| `clinical/examination` 1-day, no doctor | 200 |
| `clinical/examination` 7-day, no doctor | **500** |
| `clinical/summary` 7d, no doctor | **500** |
| `clinical/summary` 7d, `doctorId=594` | **200** |
| `clinical/trends?topic=symptoms` | **500** (investigations/conditions/medications topics all 200) |

**Root-cause pointer** — `src/modules/reports/clinic/clinic.model.ts`, `caseParts()`:

```ts
if (!useDoctor) from += ` RIGHT JOIN ${t.userMaster} u ON cm.um_id = u.um_id`;
```

A `RIGHT JOIN` against the whole `user_master` drives the query from every user of every business;
the doctor-scoped branch skips the join entirely, which is why it works. The `WHERE
cm.hm_business_id = ?` already makes the join inner-equivalent semantically — please switch to an
`INNER JOIN` (or an `EXISTS` on `u.ut_id IN (1,2)`), which should clear `symptoms`, `examination`,
`summary`, and `trends?topic=symptoms` in one change. The PR #8 bounded-prefix work itself looks
correct (`LEFT(…, FREE_TEXT_PREFIX)` + `LIMIT FREE_TEXT_ROW_CAP` + exact `boxCounts`).

**FE impact:** our dashboards default to "All doctors", so Care → Symptoms/Examination and the
Overview top-symptom cards are dead until this lands. **FE workaround shipped (temporary):** when the
business-wide call fails, the FE fans out one call per doctor and merges (top lists summed by label,
patient counts summed — slight overcount for shared patients). The direct call is always tried first,
so the workaround self-retires when your fix deploys. ⚠ Also note: a CSV `doctorId` on the care
family returns 200 but MySQL coerces `'594,766'` to `594` in the `um_id = ?` compare — silently
single-doctor data. Either split CSVs like the analytics family or 400 on commas.

## P0-2 · `operational/overview` — 500 unconditionally (NOT the P0-1 join)

Not fixed by PR #8 despite being BUG-3. 500 for 1-day/7-day/30-day windows, **with or without
`doctorId`/`clinicId`** — unlike the care family it fails even doctor-scoped, so this is a separate
crash in the operational module, not the no-doctor join. Feeds the Overview headline row fallbacks.

## P0-3 · `clinical/appointment/detailed` — 500 with any parameters (NEW, not in your triage)

Plain `?startDate&endDate` (1–7 days), with or without gender/age/status filters → 500. This is the
Appointment Analytics "Detailed Report" CSV — currently un-exportable.

---

## P1-1 · ALL free-text-box domains return EMPTY for every doctor over a FULL YEAR — the parse looks broken

**Widened after doctor-scoped probes:** `clinical/symptoms`, `clinical/examination` AND
`clinical/medical-history` return zero rows/counts for **all 8 doctors × 365 days each**
(doctor-scoped calls, so this is independent of the P0-1 crash). Meanwhile every structured-source
domain on the same account has plenty of data: diagnoses ("Bone dislocation"), medications
("Dolo 650"), investigations (10 ranked), vitals, certificates. The common factor of the empty
domains is the free-text box parse (`tcm_history_box` / `tcm_examination_box` / `tcm_mh_json`
tag-prefix extraction). Strong suspicion the PR #8 bounded-prefix parse (or the tag format it
expects) doesn't match what the EMR actually writes — please verify `rankFreeText` against raw
`tcm_history_box` rows for business 396741719906700.

Probed `startDate=2025-07-16&endDate=2026-07-15` (365d) **per doctor, all 8 doctors of the business**,
plus month modes May/June/July and clinic-scoped variants:

```
Ashish / Dr Harini / Dr Harish / Dr Sheela BR / Dr Sheela Gynec / Neha / Shashank / Shashank_test
→ topConditions:0 · topLifestyle:0 · topFamilyHistory:0 · topAllergies:0   (every one)
```

The same business has plenty of consultations, diagnoses and 102 catalog prescriptions in a 31-day
window — zero history entries across 8 doctors × 365 days is hard to believe. Please verify against
raw rows for this business: does `tbl_case_manager.tcm_mh_json` actually contain section data for
business 396741719906700, and does the `tmhs_id 1/2/3` section parse match the JSON shape the current
EMR writes? (`clinical/summary` cross-check is blocked by P0-1 — doctor-scoped summary also reports
0 condition/symptom mentions, consistent but not conclusive.) If the account genuinely has no history
data, tell us and we'll seed test entries via the Rx pad.

## P1-2 · `clinical/custom-models` — all-time snapshot returns all zeros (your BUG-10, still live)

`createdModels:0, creatingDoctors:0, modelsByType:[]` for a business that builds custom models. Your
triage already root-caused this (2-hop doctor→business scope) — confirming it's still broken on
`642dc00b`. **Product note:** if this can't be fixed, say so and we'll remove the Custom Modules tab
from the FE entirely; if the fix is coming (as your triage says), we keep it.

## P1-7 · `analytics/patients` — `clinicId` CSV → 400 (contract violation)

`analytics/patients?…&doctorId=766,594` → 200 (CSV split, correct), but
`…&clinicId=390,391` → **400**, despite contract §1 promising comma-separated multi-id on the
analytics family. Multi-clinic accounts lose the whole Patients section. FE narrows clinic to a
single id meanwhile; please split `clinicId` like `doctorId`.

## P1-4 · `analytics/inpatient-summary` — `dischargeTypes` is `[]` while `kpis.discharges = 7`

Till-date window (2025-07-16→2026-07-15): 7 discharges counted, but `dischargeTypes` comes back as an
empty array — either the discharge-type column isn't recorded in the test data or the classification
query drops everything. Please check. (FE renders the zero-filled Recovered/Referred/LAMA/DAMA/
Transfer-out donut meanwhile.)

## P1-5 · `analytics/inpatient-summary` — `adc` kpi never returned

`kpis` carries census/admissions/discharges/bor/alos/dischargeQueue/longestStayDays but NO `adc`
(v3 contract listed it). FE now derives it client-side as the mean of the `census` day-series — fine
long-term, just flagging the contract drift.

## P1-6 · `billing/advancedDeposit/dashboard` — no per-mode breakdown (EMR billing service)

The advance dashboard returns only totals (`totalAdvanceReceived/Refunded/Debited` — real values:
56,564 / 1,450 / 19,448 till-date) but NO `paymentModeSummary`, unlike the bill dashboard which has
per-mode received+refunded. The "Advance collected/refunded by mode" donuts can't fill for windows
over 31 days (the reporting `financial/collection/summary` fallback carries `advanceTotal` per mode
but is capped at 31 days). Ask: add `paymentModeSummary` to the advance dashboard, same shape as the
bill dashboard.

## P1-3 · `clinic/followups` — `byDoctor` still absent (§D partial)

PR #9's §D by-doctor work landed for `clinical/lab-test` (verified: `byDoctor` present, 2 doctors) but
`clinic/followups` still returns only `{labels, datasets}` — no `byDoctor`. The Grow section's
"Follow-ups by doctor" tile stays zero-filled until this ships.

---

## ✅ Verified working on `642dc00b` (so you don't re-check)

- `clinical/certificates` — new `byDoctor`/`patientsCertified`/`topDoctor` fields live.
- `clinical/medical-history` — new lifestyle/family/allergies **fields** live (values: see P1-1).
- `clinical/lab-test` — `byDoctor` live with real data.
- `clinic/rx` — `catalogVsCustom` live (`Catalog:102, Custom:0` — the zeros in our "Custom medicines
  by doctor" tile are real: this business prescribes only catalog meds).
- **IPD is NOT broken (BUG-4 closed from our side):** `analytics/inpatient-summary` over 365 days
  returns real events — `admissions:30, discharges:7, alos:5.1, bor:50, census:23, longestStayDays:9`,
  flow series sums match. The zeros we reported were the 7-day default window: the test IPD data
  simply has no events that week. We'll test with wider windows / ask ops to seed fresh admissions.
  `readmissions`/`avgQueueTimeHrs` now correctly `null` (ASK-2 ✓).
- `ipd/wards` — returns `roomShifts` + `wardTransfers`; we'll wire both into the Wards section as
  soon as you confirm the BUG-6 transfer-count fix is in.

---

## Lookup endpoints the FE needs (report filters are withheld until these exist)

The Tab-3 report filters take **ids**, but no endpoint serves the id→name lists:

| Filter | Wants | Suggested endpoint |
|---|---|---|
| Mode of Payment (collection/detailed, cash-flow) | `bpid` CSV | `GET /reports/lookups/payment-options` |
| Account / Accountant (3C, billing-overall) | `tban_id` CSV | `GET /reports/lookups/accounts` |
| Department (ipd-reports filterBy, appointment deptIds) | `dp_id` CSV | `GET /reports/lookups/departments` |
| Incentive user (incentive/detailed, 3c/details) | `tim_id` CSV | (we derive from incentive/overall rows — a dedicated lookup would still be cleaner) |

One `GET /reports/lookups` returning all four would unblock every remaining PHP-parity filter at once.

## New-capability asks (P3 — product wants these; confirm feasibility)

Per-domain insight depth, mirroring what `clinic/rx` and `clinical/lab-test` already prove possible:

| Ask | Field | Source feasibility |
|---|---|---|
| Custom symptoms split | `clinical/symptoms.catalogVsCustom` | tag-prefix vs free-text in `tcm_history_box` (same distinction `clinic/rx.catalogVsCustom` uses) |
| Custom examinations split | `clinical/examination.catalogVsCustom` | same, on `tcm_examination_box` |
| Symptoms by doctor | `clinical/symptoms.byDoctor` | same grouped query as `clinical/lab-test.byDoctor` (already shipped) |
| Examinations by doctor | `clinical/examination.byDoctor` | ditto |
| Advice by doctor | `clinical/advice.byDoctor` | ditto |

We may replace the low-value per-topic "over time" tiles with these by-doctor splits, which doctors
act on more.

## § Backend TODO — consolidated and schema-grounded (tatva_clinic dump, 2026-07-02)

Everything below is verified against the full `tatva_clinic` schema — table/column pointers included
so nothing needs research. Ordered by what unblocks the most FE surface.

### 1. P0 — fix the no-doctor crash (one line)
`clinic.model.ts caseParts()`: `RIGHT JOIN user_master` → `INNER JOIN` (or `EXISTS`). Clears
`clinical/symptoms`, `clinical/examination`, `clinical/summary`, `clinical/trends?topic=symptoms`.
Separately: `operational/overview` (500 even 1-day) and `clinical/appointment/detailed` (500 any params).

### 2. P1 — the free-text parse (why symptoms/examination/history are zero EVERYWHERE)
Schema facts the current parse likely misses:
- `tbl_case_manager.tcm_history_box` / `tcm_examination_box` are **longblob** with a **dual format**,
  flagged by **`tcm_history_box_type`** (`0 = textarea (not json), 1 = listing (json)` — the column's
  own comment). A tag-prefix parse tuned to one format returns zero on businesses that write the
  other. `rankFreeText` must branch on the type flag (and handle blob→utf8).
- `tcm_mh_json` (json) is the per-consult medical-history snapshot; note
  `tbl_patient_permanent_history.mh_json` is commented "**Not Use**" — the consult snapshot is the
  right source, so verify the section parse (`tmhs_id 1/2/3`) against real rows.
Evidence: all three domains are zero for all 8 doctors × 365d while every structured domain
(diagnoses/meds/labs/vitals/certificates) is full.

### 3. P1 — one lookups endpoint unblocks every remaining report filter
`GET /reports/lookups` (business-scoped from token), four arrays of `{id, name}`:
| List | Table | Columns | Filter |
|---|---|---|---|
| paymentOptions | `tbl_biiling_payment_option` | `bpid`, `title` | `del=0`, `hm_business_id` |
| accounts | `tbl_bill_account_name` | `tban_id`, `tban_account_name` | `tban_del=0`, `hm_business_id` |
| departments | `tbl_department` | `dp_id`, `dp_name` | `dp_del=0`, `hm_id` (clinic) |
| incentiveUsers | `tbl_incentive_master` | `tim_id`, `tim_user_name` | `tim_del=0`, `hm_business_id` |
(FE already gets case types from the EMR's own `listCasetype`; discharge types are the 6-row global
`tbl_inpatient_discharge_type` master if ever needed client-side.)

### 4. P1 — dischargeTypes is buildable; the empty array is a bug
`tbl_admit_patient_master.tidt_id` → `tbl_inpatient_discharge_type.tidt_type`, rows with
`tapm_discharge = 1` in the window. Data model fully supports it — 7 discharges counted, `[]` returned.

### 5. P1 — advance per-mode donuts
Add `paymentModeSummary` (same shape as the bill dashboard) to `billing/advancedDeposit/dashboard`:
`tbl_opd_billing_advance_master.payment_option ⋈ tbl_biiling_payment_option.bpid` — the identical
join the collection line-items SQL already uses for advances.

### 6. P1 — CSV multi-id on the clinic/care family
`hm_id = ?` / `um_id = ?` with a CSV coerces to the FIRST id (silent single-clinic/doctor data).
Split CSVs like the analytics family, or 400 on commas. Until then the FE narrows: single id passes,
multi-select is omitted (business-wide).

### 7. P2 — quality-of-life
- `previous:{}` on the billing dashboards + collection summary (FE currently double-fetches the
  previous window for delta pills).
- `adc` kpi on inpatient-summary (FE now derives census-series mean; fine either way).
- `clinic/followups.byDoctor` (the §D item that didn't ship with lab-test's).
- `ipd/clinical.labResults` → `tbl_inpatient_lab_val.tilv_date` (your own BUG-5).
- BUG-6 ward-transfer count (`tbl_atd_logs`) — FE will wire `roomShifts` + `wardTransfers` once
  confirmed.

### 8. P3 — new OPD metrics (product wants; sources exist)
- `byDoctor` for symptoms/examination/advice: same grouped `um_id` query lab-test already ships.
- `catalogVsCustom` for symptoms/examination: `tcm_history_box_type` (0 = free-typed, 1 = catalog
  listing) IS the split — one GROUP BY.

## § Appendix — full sweep matrix (2026-07-15, ~150 endpoint×filter combinations)

Variants per endpoint: `m` = month-only · `w7`/`w31` = 7/31-day range · `d` = +doctorId ·
`c` = +clinicId · `dc` = both. All against business 396741719906700 / clinic 390 on `642dc00b`.

**Fail on every no-doctor variant (m/w7/w31/c), pass with doctorId — the P0-1 join:**
`clinical/symptoms` · `clinical/examination` · `clinical/summary` · `clinical/trends?topic=symptoms`
(other trend topics pass; symptoms topic passes doctor-scoped too — same join).

**Fail unconditionally:** `operational/overview` (any window, any scoping) ·
`clinical/appointment/detailed` (any params).

**400 that is correct validation (not bugs; FE already conforms):**
`appointment/summary|overall`, `prescription/medicine-detailed` with month-only (range required) ·
`appointment/summary` >30d · `analytics/opd-billing?days=180` (only 7/15/30/90/365) ·
financial family >31d.

**400 that is a bug:** `analytics/patients?clinicId=390,391` (P1-7).

**Everything else passed every variant (200):** top-cards, consultations(+weekly), consultation-modes,
rx, diagnosis, followups, lab-test, medical-history, vitals, advice, vaccines, custom-models,
certificates, diagnosis-trends, appointment summary/overall (ranged), prescription analytics +
medicine-detailed (ranged), analytics patients/appointment/opd-billing(7/365)/ipd-billing/
billing-by-doctor/patient-retention/inpatient-summary(+clinic CSV ✓)/others, operational/abha(±doctor),
ipd wards/clinical/bed-turnover, reference patients/references/inpatient, clinic/patients, and the
full financial family with real filter tokens (collection detailed billTypes+issuedBy ✓,
billing-overall revenue+cash-flow billTypes=advance ✓, ipd-reports filterBy=doctor ids CSV ✓,
incentive user CSV ✓, 3c account+billTypes incl `credite_notes` ✓, daily-collection ✓).

## Your two product questions — answers

- **BUG-11 (collection scope):** yes — make `financial/collection/*` default to **all business
  clinics when `clinicId` is omitted** (matches how our Billing section presents money; the current
  single-clinic 403 surprises multi-clinic accounts). Flag the release since money totals change.
- **ASK-1 (Till date):** prefer **exposing `accountCreatedAt`** (e.g. on capabilities or a lookup)
  and keeping the 366-day cap; the FE will build the "Till date" preset from it.
