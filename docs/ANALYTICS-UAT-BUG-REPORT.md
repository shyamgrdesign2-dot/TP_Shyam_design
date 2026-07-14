# Analytics UAT Bug Report & Missing-Data Contract Gaps

**Version 1.0 · 2026-07-15 · From:** PM Doctor Portal frontend (Data Analytics, `/data-analytics-x`)
**To:** Pm-Core Reporting owner (+ AI agent) — companion to `API-CONTRACTS-CURRENT.md`
**Test account:** businessId `396741719906700` (Dr Sheela BR, admin), UAT, verified live on 2026-07-15.

Every item below was verified by calling the deployed endpoint directly with a
valid portal JWT and inspecting the JSON. Format per item: **symptom →
evidence → expected**. Items marked FE-REMOVED are hidden in the UI until you
ship the fix — tell us when they land and we switch the cards back on.

---

## A. Endpoints that are DOWN (fix first — they blank whole sections)

### BUG-1 · `GET /clinical/symptoms` → 500 on every call
- Evidence: `?month=2026-07` → 500 · `?startDate=2026-07-08&endDate=2026-07-14` → 500 · both → 500. Uniform body `{"error":"Internal Server Error","code":"INTERNAL_ERROR"}`.
- `API-CONTRACTS-CURRENT.md` §C claims "500 is FIXED" — it is not fixed on UAT.
- Blanks: Care ▸ Symptoms tab, Overview "Top symptom" card.

### BUG-2 · `GET /clinical/examination` → 500 on every call
- Same evidence pattern as BUG-1. Blanks Care ▸ Examination tab.

### BUG-3 · `GET /operational/overview` → 500 (REGRESSION)
- Returned 200 with data on 2026-07-14 (`topMedication:"Dolo,Cetrizen 5mg Tablet"` observed); 500 on every range since 2026-07-15.
- Blanks: Overview topSymptom/topMedication/topMedicalCondition (FE now falls back to `clinic/rx` + `clinical/medical-history`, but the endpoint should not be dead).

---

## B. Endpoints that respond but return NO usable data

### BUG-4 · `GET /analytics/inpatient-summary` — flow counters permanently 0
- Evidence: `census: 23`, `bor: 69.7` are real, but `admissions: 0, discharges: 0`, `flow` datasets all-zero, `alos: 0`, `longestStayDays: 0`, `losDistribution` all-zero, `dischargeTypes: []`, `admissionsByDept/Ward` empty — for every window tested up to 30 days.
- A facility cannot hold a 23-patient census with zero admissions/discharges over a month. The admission/discharge **event counting is broken** (likely date-column or clinic-scope mismatch), and everything derived from stays (ALOS, LOS bands, discharge types, dept/ward splits) is empty with it.
- Blanks: the entire IPD ▸ Admissions section + IPD Overview flow chart.
- Also: a `days`-only request → 400 (`startDate+endDate` mandatory) — either accept `days` or document it as removed.

### BUG-5 · `GET /ipd/clinical` — all KPIs 0 year-round
- Evidence: `kpis { clinicalNotes: 0, otProcedures: 0, dischargeSummaries: 0, labResults: 0 }` and `otByDoctor`/`anaesthesiaMix` empty for a 30-day window, on a business with an active 23-patient IPD census.
- Notes ARE being written in the IPD app daily — the pipeline is not reading them (wrong table/scope?). `notesByType` returns 4 labels but zero counts.

### BUG-6 · `GET /ipd/wards` — activity fields empty
- Live and correct: `totalBeds 33, occupied 27, available 6, occupancyPct 82`.
- Dead: `roomShifts: 0` always, `wardTransfers` empty labels, `alosByWard` empty labels — despite ADT log data existing (`tbl_atd_logs`).
- FE-REMOVED: Room shifts KPI, Ward transfers chart, Occupancy-over-time chart (user ruling: dead cards out). ALOS-by-ward card kept, flagged. Restore signal when fixed.

### BUG-7 · `GET /ipd/bed-turnover` — returns nothing usable
- No KPI values and no chart series with data for any window tested. FE-REMOVED.

### BUG-8 · `GET /clinical/medical-history` — History tab starves
- Evidence: response contains ONLY `topConditions` (often empty labels even for a 30-day window on a business with recorded histories).
- MISSING fields the UI renders: `topAllergies`, `topLifestyle`, `topSurgicalHistory`, `topFamilyHistory`, `additionalHistory`. The whole Care ▸ History tab is blank because of this one endpoint.

### BUG-9 · `GET /clinical/certificates` — headline fields missing/empty
- `topDoctor`, `patientsCertified`, `byDoctor` are absent; certificate type split empty. Care ▸ Certificates shows "Unknown"/zeros. Certificates are issued in the product (the register report has rows) — the aggregate must read the same source.

### BUG-10 · `GET /clinical/custom-models` — zeros for a business that has models
- `createdModels: 0, creatingDoctors: 0`, `modelsByType`/`modelsByDoctor` empty. Verify the business scoping — custom templates exist for this account in the EMR.

### BUG-11 · Reporting financial pipeline disagrees with the billing dashboards
- For the same window the lab-params `bill/dashboard` shows real collections (e.g. ₹1,500 on 2026-07-15) while:
  - `financial/collection/summary` returns `summary.grandTotal: 0` and all-zero `paymentModes` rows, and
  - `analytics/opd-billing` returns an all-zero day-series (`collection: 0, refund: 0` for every day; `collectionChart` datasets sum to 0).
- Suspect both default to the token clinic (`clinicId: 390` echoed) instead of all accessible clinics when `clinicId` is omitted — the dashboards aggregate all. Align the default scope.
- Blanks: the "Collection vs refund" trend chart AND the refund/advance-by-mode donuts (all wired and waiting).

---

## C. Contested WONT-BUILDs — the product DOES capture this data

### GAP-1 · Diagnosis `statusMix` — wrong enum cited
- Your §7 says the diagnosis status enum is only Primary/Secondary/Provisional. **In the Rx pad, every diagnosis entry carries a Status picker with exactly: Suspected · Confirmed · Ruled out.** That column exists at entry time; aggregate it:
  `statusMix: [ {label:"Suspected"}, {label:"Confirmed"}, {label:"Ruled out"} ]` on `clinic/diagnosis`.
- The UI already renders this matrix (zero-filled).

### GAP-2 · Symptom `severityMix` — severity IS captured
- Your §7 marks symptom severity WONT-BUILD. **The symptoms module captures severity per symptom: Mild · Moderate · Severe.** Aggregate it:
  `severityMix: [ {label:"Mild"}, {label:"Moderate"}, {label:"Severe"} ]` on `clinical/symptoms` (after BUG-1).
- The UI already renders this matrix (zero-filled).

---

## D. Missing by-doctor splits (one pattern, five endpoints) — P1

Every "… by doctor" card in Care/Grow is empty because the aggregate
endpoints don't return the split. Same shape everywhere —
`byDoctor: { labels:[doctor names], datasets:[{label, data}] }`:

| Endpoint | Field wanted | Feeds |
|---|---|---|
| `clinic/rx` | `customByDoctor` (in contract §4 but returns empty) | Custom medicines by doctor |
| `clinical/lab-test` | `byDoctor` (suggested investigations per doctor) | Investigations by doctor |
| `clinical/certificates` | `byDoctor` (issued per doctor) | Certificates by doctor |
| `clinic/followups` | `byDoctor` (Advised + Kept datasets per doctor) | Follow-ups by doctor |
| `clinic/diagnosis` | optional `byDoctor` | future |

If any of these cannot be built, answer `WONT-BUILD` + reason and we remove
the cards (as done for wards).

---

### GAP-3 · `POST /appointment/listAppointment` summary has NO booking counters
- The summary block returns only `queue_count, finished_count, cancelled_count, draft_count, checked_in_count, referral_count`. There is no booked/walk-in split and no channel split — the "Booked appointments" and "Direct walk-ins" cards were reading fields that do not exist and have been REMOVED from the UI.
- Wanted on the summary (or on the §3.2 GET replacement): `booked_count`, `walk_in_count` (booked = created with a slot in advance, walk-in = same-time creation).
- Channel split (In Clinic / Video) is now taken from `clinical/appointment/summary.channelMix` — live and correct (64 In Clinic verified), but capped at ≤30-day windows; lift the cap or mirror the fields onto the replacement endpoint.

## E. Filters & platform asks

### ASK-1 · "Till date" range
- Product wants a preset covering everything since account creation. The API caps ranges at 366 days, so the FE ships "Till date = last 365 days" as a stopgap.
- Wanted, either: lift the cap for aggregate endpoints, or accept `tillDate=true`, or expose `accountCreatedAt` (e.g. on the future capabilities endpoint) so the FE can clamp precisely.

### ASK-2 · Explicit failure signal
- When an endpoint is up but a sub-pipeline has no source (e.g. flow counters in BUG-4), return the field as `null` rather than `0`. The FE renders `0` as "true zero" and `null` as "not available" — silent zeros are how these bugs stayed invisible.

---

## F. Working & confirmed (no action — for completeness)

`analytics/patients` (gender/marital/bloodGroups/topBloodGroup + previous) ·
`clinic/rx` (brands/salts/companyShare/drugsPerRx/catalogVsCustom) ·
`clinic/consultation-modes` (incl. 5-mode `byDoctor`) · `clinic/diagnosis`
(topDiagnosis) · `clinical/lab-test` (topInvestigations) · `clinical/vitals` ·
`clinical/advice` · `clinical/vaccines` · `clinic/dashboard/top-cards` ·
`clinic/consultations/weekly` · `analytics/opd-billing` · billing dashboards ·
`operational/abha` · `financial/daily-collection` (+CSV) · campaign/userCredit
+ userCampaign · `ipd/wards` bed KPIs · `analytics/appointment`.

## G. Priority order

| P | Items |
|---|---|
| P0 | BUG-1, BUG-2, BUG-3 (dead endpoints) · BUG-4 (IPD flow counting) |
| P1 | BUG-5, BUG-6 (IPD activity pipelines) · BUG-8 (History fields) · BUG-11 (collection-summary scope) · §D by-doctor splits · GAP-1, GAP-2 |
| P2 | BUG-7, BUG-9, BUG-10 · ASK-1, ASK-2 |
