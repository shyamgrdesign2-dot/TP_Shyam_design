# Data Analytics — Backend Spec v4 (authoritative)

**Status: current.** This document supersedes `DATA-ANALYTICS-BACKEND-BRD.md`,
`BACKEND-API-REQUIREMENTS.md`, `API-CONTRACTS-v3-REQUIREMENTS.md` and
`ANALYTICS-API-CONTRACT.md`. Where they disagree, this file wins.

It was produced by auditing every widget the Data Analytics UI actually renders
(`src/pages/data-analytics/`) and asking, per widget: *does a doctor or clinic
admin act on this number, and can the backend compute it truthfully for the
filter the user selected?* Every widget below survived that audit. Anything not
listed here was removed from the UI and must NOT be built.

---

## 1. Global conventions (apply to every endpoint)

### 1.1 Reads are GET. No exceptions.
Analytics never mutates state, so every endpoint in this spec is a `GET`.
The one POST the FE still makes — `POST /api/v1/appointment/listAppointment`
(the operational EMR endpoint, reused as a stopgap for footfall counts) — is a
**defect to be retired**. Its replacement is `GET /analytics/appointments/summary`
(§3.2). The only POSTs that stay anywhere near reporting are the two reference
WRITES (`/reference/references`, `/reference/inpatient`), which are data entry,
not analytics.

### 1.2 One filter contract everywhere
Every endpoint accepts exactly this query set. `month` and `days` are
deprecated: they made the UI show a different window than the filter bar
(e.g. Overview "Total collected" silently used 30 days while the filter said
"Past 7 days") — that class of bug is why v4 exists.

| Param | Required | Meaning |
|---|---|---|
| `startDate` | yes | `YYYY-MM-DD`, inclusive, clinic-local time |
| `endDate` | yes | `YYYY-MM-DD`, inclusive |
| `doctorId` | no | comma-separated doctor ids (filter is multi-select); absent = all doctors |
| `clinicId` | no | comma-separated clinic ids (filter is multi-select); absent = all clinics |

Business scope always comes from the Bearer token, never from the body/query.
An endpoint that cannot honour `doctorId` (e.g. ward occupancy) must ignore it
silently, and the field is marked "clinic-level" below.

### 1.3 Time-series granularity rule
Trend charts must bucket to match the selected range so the x-axis always
matches the filter (user mandate):

| Range length | Bucket | Label format |
|---|---|---|
| ≤ 14 days | daily | `DD MMM` (e.g. `08 Jul`) |
| 15–62 days | weekly (Mon-start) | `DD MMM` of week start |
| > 62 days | monthly | `MMM YYYY` |

Labels are produced by the **backend** and rendered verbatim by the FE.
Buckets with no data are returned as `0`, never omitted (zero-fill mandate).

### 1.4 Previous-period block for delta pills
Wherever the spec says `previous`, compute the same metrics over the window of
equal length immediately before `startDate` (7-day filter → the 7 days before).
The FE shows the ↑/↓ "vs previous period" pill only when `previous` is present,
so ship it on every volume/money KPI object. If the previous window predates
the account's data, return `previous: null` (FE hides the pill).

### 1.5 Response shapes (unchanged from v2)
1. **KPI object** — flat numbers `{ total: 119, previous: { total: 147 } }`
2. **Chart series** — `{ labels: [...], datasets: [{ label, data: [...] }] }`
3. **Donut list** — `[{ label, value }]`, categories that sum to a meaningful whole

### 1.6 Semantics must be period-true
Every number is computed strictly inside `[startDate, endDate]` unless a field
is explicitly marked **snapshot** (e.g. current census, ABHA linkage of the
whole patient base). The FE labels snapshot cards "as of today"; the backend
must not mix snapshot and in-period semantics inside one field.

### 1.7 Capability & role gating (who sees what)

Analytics must never render a metric for a feature the clinic/doctor doesn't
have. The FE resolves every gate from data the app already holds at login —
**no extra API call is needed today**:

| Gate | Source of truth | What it hides when off |
|---|---|---|
| Role (admin vs sub-doctor) | JWT `result.admin` (fallback profile `ownerDoctor`) | Sub-doctor: doctor filter locked to self; cannot view other doctors' metrics |
| Clinic access | profile `hospital_data` (already only the clinics the login can access) | 1 clinic → clinic filter is a disabled field, not a dropdown |
| IPD module | profile `module_data[].type` contains `"ipd"` | The whole IPD department (switcher shows OPD only) |
| ABDM / ABHA | profile `abhaEnable` | ABHA linkage donut + trend + all `abha*` KPIs in Grow |
| Video consultation | GrowthBook `video-consult` / `tele-consult` | "Video consultations" KPI in Appointments |
| SnapRx | GrowthBook `snap-rx` | "Pending digitization" KPI; Snap RX series in mode charts |
| TabRx | GrowthBook `tab-rx` | Tab RX series in mode charts |
| SmartSync | GrowthBook `smartsync-connect` | Smart Sync series in mode charts |
| Gynec + Obstetric | GrowthBook `obs-gynec-history` | The Gynec and Obstetric Care sub-tabs |

Honesty override: a disabled mode that still carries **non-zero historical
data** stays visible (hiding real numbers would corrupt visible totals).

**Backend follow-up (P1): `GET /analytics/capabilities`.** The reporting
service must apply the same gates server-side (a sub-doctor's token must not
be able to fetch other doctors' data by editing `doctorId`), and a single
consolidated endpoint lets FE and BE share one contract instead of four
sources:

```json
{
  "role": "admin | sub_doctor",
  "selfDoctorId": 524,
  "clinics": [{ "id": 390, "name": "Apex Ortho Clinic" }],
  "modules": { "ipd": true, "abdm": false, "gynecObstetric": false, "messages": true },
  "modes": { "video": false, "snapRx": true, "tabRx": true, "smartSync": true, "voiceRx": true, "typeRx": true }
}
```

Until it ships, **every read endpoint must validate `doctorId` server-side**:
if the JWT is a sub-doctor (`result.admin != 1`), reject or coerce any
`doctorId` other than the token's own `user_id`.

---

## 2. Chart-type doctrine (why the UI asks for these shapes)

So FE and BE stop second-guessing each other, the representation is fixed by
the *kind* of data, not taste:

| Data kind | Visualization | Examples |
|---|---|---|
| Parts of a meaningful whole (≤ 6 slices) | Donut | gender split, mode mix, payment modes, appointment status |
| Ranked top-N list | Donut + side legend, top 5 + "Others" slice | top diagnoses, symptoms, medications, investigations, vaccines, procedures, certificates |
| Trend over time | Line/area (line↔bar user-toggleable), buckets per §1.3 | footfall, collections, census |
| Distribution over ordered buckets | Vertical bar, "summed over period" | age bands, visits by hour, visits by weekday |
| Comparison / average per entity | Vertical bar (stacked when composed) | Rx modes per doctor, OT per doctor, ALOS per ward |

Why donut-with-legend for ranked lists: clinical names are long ("Honey Bee
Venom Allergy Test By ImmunoCAP") and any bar axis crops them; the donut's
side legend carries the FULL name + count, and the "Others" tail slice makes
the ring a true composition of the period's total. A category split must never
be a line, and an average (ALOS) must never be a donut slice — averages are
not additive. Backends return top 10; the FE shows 5 + Others.

---

## 3. OPD endpoints

### 3.1 Overview — `GET /api/v1/reports/analytics/overview` ★NEW (P0)
The 10-second practice pulse: operational volume/money + a clinical highlight
row (top diagnosis / symptom / medication / chronic condition — single
headline values only; clinical breakdowns stay in Care).

```jsonc
{
  "consultations": { "count": 119, "previous": { "count": 147 } },
  "topMode":       { "label": "Voice RX", "count": 45 },        // highest-use Rx mode in period
  "topDiagnosis":  { "label": "Viral fever", "count": 18 },
  "topSymptom":    { "label": "Fever", "count": 40 },
  "topMedication": { "label": "Dolo 650", "count": 31 },
  "topMedicalCondition": { "label": "Hypertension", "count": 22 },
  "modeMix":       { "labels": ["Smart Sync", ...], "datasets": [{ "label": "Consultations", "data": [...] }] },
  "consultationsTrend": { "labels": [...], "datasets": [
      { "label": "Current period", "data": [...] },
      { "label": "Previous period", "data": [...] } ] }          // buckets per §1.3
}
```
Until this ships, `topSymptom` / `topMedication` / `topMedicalCondition` must
be served by `GET /operational/overview` (fields exist in its contract; today
they come back empty → the FE shows "No data").
The other Overview widgets are deliberately served by their home sections'
endpoints so numbers can never diverge: money cards + collection-vs-refund
trend from §3.5, footfall + status donut from §3.2. Overview is a composition,
not a second source of truth.

*Interim (until this ships):* FE composes `/clinic/dashboard/top-cards` and
`/clinic/consultation-modes` (month-based) and labels the trend card
"calendar month" honestly.

### 3.2 Appointments — `GET /api/v1/reports/analytics/appointments/summary` ★NEW (P0, retires the POST)
```jsonc
{
  "kpis": {
    "total": 342, "booked": 300, "walkIns": 42, "completed": 310,
    "cancelled": 22, "bookedClinic": 260, "bookedVideo": 40,
    "previous": { ...same keys... }
  },
  "statusNow": [ { "label": "Completed", "value": 310 }, { "label": "In queue", "value": 4 },
                 { "label": "Cancelled", "value": 22 }, { "label": "Draft", "value": 6 } ],
  "newVsReturning": [ { "label": "New", "value": 120 }, { "label": "Returning", "value": 222 } ],
  "caseType": [ { "label": "New", "value": ... }, { "label": "Follow-Up", "value": ... }, { "label": "Urgent", "value": ... } ],
  "footfallTrend": { "labels": [...], "datasets": [ { "label": "Total" }, { "label": "Cancelled" } ] },
  "byWeekday": { "labels": ["Mon", ..., "Sun"], "datasets": [{ "label": "Visits", "data": [...] }] },  // summed over period
  "byHour":    { "labels": ["00", ..., "23"],   "datasets": [{ "label": "Visits", "data": [...] }] }   // summed over period
}
```
Semantics the UI promises the doctor (backend must match):
- `total` = footfall = booked + walk-ins in period. Cancellation rate is derived FE-side.
- "In queue" / "Draft" are **live states**, valid only in `statusNow` — never KPI-grade for a past window.
- `byWeekday` / `byHour` are **totals summed across the period** (peak-day / peak-hour staffing signals), not averages.

### 3.3 Consultation modes — `GET /api/v1/reports/clinic/consultation-modes` (UPGRADE: month → range, P1)
Keep the current shape; switch `month` → `startDate/endDate` and:
- `kpis`: `{ total, smartSync, voiceRx, tabRx, snapRx, typeRx, previous:{...} }` (FE derives top mode + assisted-Rx share).
- `modeTrend`: buckets per §1.3 (today it is fixed weekly — that is why the chart says "Week 1–4" under a 7-day filter).
- `byDoctor`: **one dataset per mode** (stacked bar): `{ labels: ["Dr A", ...], datasets: [{ "label": "Smart Sync", ... }, { "label": "Voice RX", ... }, ...] }`. Today it returns a single "Consultations" dataset, which cannot stack.

### 3.4 Patients — `GET /api/v1/reports/analytics/patients` (UPGRADE: range params, P1)
Population = distinct patients with ≥1 visit in the period.
- `kpis`: `{ total, oneTime, returning, avgAge, topBloodGroup,
  topMaritalStatus, previous:{...} }` (`returning` = visited in period AND had
  any visit before it). `contactable` was DROPPED — mobile is mandatory at
  patient creation, so it is always ≈100%. `topMaritalStatus` is derived
  client-side from the marital donut until the field ships.
- `gender`: donut list — always all three categories `Male / Female / Others`
  (FE zero-fills missing ones defensively).
- ★NEW `maritalStatus`: donut list over `Married / Single / Divorced / Widowed /
  Separated` for patients seen in the period. FE renders the card today and
  zero-fills until the field ships.
- ★NEW `bloodGroups`: donut list over `A+ / A- / B+ / B- / O+ / O- / AB+ / AB-`
  for patients seen in the period. FE renders the card today and zero-fills
  until the field ships.
- `age`: vertical-bar series over fixed bands `<18, 18-30, 31-45, 46-60, >60`.
- `visitFrequency`: vertical-bar series over `1, 2, 3, 4-5, 6-10, 10+` visits **within the period**.

### 3.5 Billing — existing live dashboards (KEEP, already period-true)
`GET /api/v1/billing/{bill|ipd-bill}/dashboard` and
`GET /api/v1/billing/advancedDeposit/dashboard` (lab-params service) already
accept `startDate/endDate/doctorIds/clinicId` and feed all 8 KPI cards + the
payment-mode donuts. The UI shows FOUR mode donuts: **Collection by mode**
(`paymentModeSummary`), **Refund by mode** (`refundPaymentModeSummary`),
**Advance collected by mode** (advance `paymentModeSummary`), **Advance
refunded by mode** (advance `refundPaymentModeSummary`). Required additions:
- `previous` block on both summaries (delta pills currently never render).
- `refundPaymentModeSummary` on the advancedDeposit dashboard (feeds the
  "Advance refunded by mode" donut — FE zero-states until it ships).
- Optional, wanted if the ledger can support it: `dueClearedPaymentModeSummary`
  — payments in-period that settled previously-due bills, by mode ("Due cleared
  by mode" donut; FE will add the card once the field exists).
- `GET /api/v1/reports/analytics/opd-billing` (and ipd): switch `days ∈ {7,15,30,90}` → `startDate/endDate`, buckets per §1.3, and keep `collectionChart` (Collection vs Refund). `revenueChart` is no longer consumed.

### 3.6 Care — `/api/v1/reports/clinic/diagnosis`, `/clinical/symptoms`, `/clinical/examination`, `/clinical/lab-test`, `/clinical/vitals`, `/clinical/medical-history`, `/clinical/advice`, `/clinical/vaccines`, `/clinical/certificates`, `/clinical/custom-models`, `/clinical/gynec`, `/clinical/obstetric` (UPGRADE: range params, P2)
All are ranked top-N lists → `[{ label, value }]`, top 10, sorted desc, counted
within the period. Notes:
- `/clinic/diagnosis`: only `topDiagnosis` is consumed now. `ageProfile` /
  `genderProfile` were removed from Care (they duplicate §3.4) — do not extend them.
- `/clinical/lab-test`: **names must be clean investigation names** — no entry
  remarks ("... Remark: //~//") appended. The FE strips them defensively, but
  the contract is a clean `label`.
- `/clinical/vaccines`: `{ given: [...], givenCount, pendingCount }` where
  `pendingCount` = doses due in period but not administered.
- `/clinical/certificates`: `{ topCertificates: [...], totalIssued, uniqueTypes }`.
- `/clinical/custom-models`: `{ created, reused, reuseRate, topTemplates: [...] }`.
- The FE derives "unique / total / top" KPI cards from these lists; no extra endpoint needed.
- **Deep-dive fields (P2, one per endpoint)** — every clinical endpoint adds a
  `trend` chart series (`{ labels, datasets: [{ label, data }] }`, buckets per
  §1.3) feeding the "‹Topic› over time" card on that Care tab. Additionally on
  `/clinical/symptoms`: `severity` donut list (mild/moderate/severe mention
  split) and `patientsWith` (distinct patients with ≥1 symptom in period).
  The FE renders all of these today and zero-fills until they ship.

#### Care deep-dive fields per tab (P2 — FE renders all of these today, zero-filled)
| Endpoint | New fields |
|---|---|
| `/clinic/diagnosis` | `statusMix` donut (Suspected / Confirmed / Ruled out / Provisional) |
| `/clinic/rx` | `catalogVsCustom` donut (catalog-picked vs doctor-typed medicines), `customByDoctor` chart series, `drugsPerRx` (avg medicine count per prescription) — generics/manufacturers already ship as `topSalts`/`companyShare` |
| `/clinical/lab-test` | `byDoctor` chart series (who orders the most investigations) |
| `/clinical/vitals` | `bpStages` donut, `bmiBands` series, `bmiCoverage` donut (with/without BMI), `rbsBands` series, `repeatMonitoring` donut (single vs repeat entries). ⚠ Buildability: vitals are free-text varchars with NO height/weight (Analytics_Buildability_and_Scope §4.2) — these need a parsing/cleaning layer and BMI needs height/weight capture; low-confidence until then. |
| `/clinical/medical-history` | `topFamilyHistory` list, `additionalHistory` donut (entries with vs without notes) |
| `/clinical/vaccines` | `scheduleMix` donut (IAP schedule vs others). `brandMix` (vaccine brand split) is WANTED IF COMPUTABLE — confirm whether brand is captured per dose before building. |
| `/clinical/certificates` | `topDoctor` (name), `patientsCertified` (distinct patients), `byDoctor` chart series |
| `/clinical/custom-models` | `creatingDoctors` (doctors who created ≥1 template) |
| `/clinical/gynec` | `avgMenarcheAge`, `avgCycleInterval` (days), `irregularPct`, `cycleRegularity` donut, `flowMix` donut (light/moderate/heavy), `painMix` donut (none/mild/moderate/severe), `lifeStage` donut |
| `/clinical/obstetric` | `deliveryEvents`, `abortEvents`, `outcomesMix` donut (ongoing/delivered/aborted), `childrenMeasured` + `totalMeasurements` (growth-chart monitoring) |
| `/clinic/followups` | `byDoctor` chart series (Advised + Kept per doctor). `avgIntervalDays` was DROPPED (user ruling: not honestly computable) — do not build it. |

Grow ABHA KPIs (user ruling): exactly two — **patients with ABHA linked** and
**patients without ABHA** — both derivable from the existing `linkage` donut.
The linkage-rate % and total-patients KPIs were removed. Medications
`companyShare`: rows with an empty manufacturer are a real bucket — the FE
labels them "No manufacturer name"; the backend should ship the same label
rather than an empty string.

KPI doctrine addendum (user ruling): **no "unique/distinct" counters anywhere**
— headline KPIs are the TOP name per topic plus patient/entry counts
("Patients with diagnosis", "Symptom entries"). The Care Overview KPI row is
exactly the top-name list: diagnosis, symptom, examination, medication, lab
test, vital, medical condition, allergy, family history, lifestyle, advice,
procedure.

### 3.6b Care Procedures — `GET /api/v1/reports/clinical/procedures` ★NEW (P2)
Procedures/surgeries **suggested** to patients during consultations (from the
Rx procedure-advice section), counted within the period:
```jsonc
{ "topProcedures": [ { "name": "Appendectomy", "count": 4 }, ... ],  // top 10
  "totalSuggested": 12 }
```
Feeds the Care ▸ Procedures tab (top-procedures ranked bar + KPI cards).
FE zero-fills until deployed.

### 3.7 Grow — follow-ups + ABHA
- `GET /clinic/followups` (UPGRADE: range params + buckets per §1.3, P2):
  `{ kpis: { advised, kept, previous:{...} }, trend: { labels, datasets: [Advised, Kept] } }`.
  `kept` = follow-up visits that actually happened in period; adherence derived FE-side.
- `GET /operational/abha` (KEEP): `linkage` donut is a **snapshot** of the whole
  patient base (UI labels it "as of today"); `enrolments` trend, if served, follows §1.3.

---

### 3.8 Messages — bulk campaign analytics (LIVE today, existing APIs)
The Messages section reads the SAME endpoints as the Messages page — no new
backend needed:
- `GET /api/v1/communication/userCredit` → credit balance (live snapshot).
- `POST /api/v1/campaign/userCampaign` `{ draft: 0, start_date, end_date }` →
  campaign rows (`message_text`, `campaign_date/time`, `send_on` SMS/WhatsApp,
  `total_patient`, `campaign_sent`, `campaign_status`).
FE derives: campaigns sent / scheduled, patients reached, avg reach per
campaign, delivered-vs-scheduled donut, channel mix donut, reach-by-campaign
bar. Campaigns are business-level — `doctorId`/`clinicId` do not apply.
Nice-to-have field: per-campaign `delivered_count` vs `failed_count` (today
the page equates delivered with `total_patient`; a true delivered/failed split
would enable a delivery-success metric).

## 4. IPD endpoints (clinic-level; `doctorId` ignored)

### 4.1 Inpatient overview — `GET /api/v1/reports/analytics/inpatient-summary` (UPGRADE: range params, P1)
- `kpis`: `{ census (snapshot, now), admissions, discharges, bor, alos, adc, previous:{...} }`
  — `admissions`/`discharges` are period totals; `bor`/`adc` are averaged over the period.
- `flow`: `{ labels, datasets: [Admissions, Discharges] }` per §1.3.
- `census`: occupied beds per bucket per §1.3.

### 4.1b Admissions & Discharges depth — fields on `/analytics/inpatient-summary` ★NEW (P2)
FE renders all of these today (zero-filled). Per-metric buildability from
`Analytics_Buildability_and_Scope.md` (the schema research):

| Field | Feeds | Buildability |
|---|---|---|
| `readmissions` | KPI | ✅ `tbl_atd_patient_master.tapm_readmit` |
| `alos`, `losDistribution` (bands 0-1/2-3/4-7/8-14/15+) | KPI + bar | ⚠ discharge timestamp recoverable from `tbl_atd_logs` (`tal_transfer_type` + `tal_create_date`) — run PB-3 profiling first |
| `longestStayDays` | KPI | ✅ derivable from `tapm_admitting_date` (current) / ⚠ completed stays need discharge timestamp |
| `dischargeQueue`, `avgQueueTimeHrs` | KPIs | ⚠ needs a discharge-initiated timestamp; confirm in discharge flow |
| `dischargeTypes` (Recovered/Referred/LAMA/DAMA/Transfer out/Death) | donut | ⚠ plausible from the discharge summary / ADT status — profile the status values |
| `admissionsByWard` | bar | ✅ ward tables (`twrm_*`/`twm_*`) joined to admissions |
| `admissionsByDept` | bar | ⚠ needs department on the admission record — profile |
| `payorMix` (Self pay/Insurance/TPA) | donut | 🔴 no payor column found in the schema research — confirm capture exists before building |

### 4.2 Wards — `GET /api/v1/reports/ipd/wards` (KEEP shape + new fields, range params)
`kpis` `{ totalBeds (snapshot), occupied (snapshot), available (snapshot),
occupancyPct, blocked (snapshot — maintenance/reserved/isolation beds),
totalWards }`, `occupancyOverTime` per §1.3, `alosByWard` bar list, and ★NEW
`occupancyByWard`: `{ labels: [ward names], datasets: [{ "label": "Occupied" },
{ "label": "Capacity" }] }` — occupied vs capacity per ward, snapshot. The FE
renders all of these today and zero-fills the new fields until they ship.

### 4.3 Clinical activity — `GET /api/v1/reports/ipd/clinical` (KEEP shape + new fields, range params)
`kpis` `{ clinicalNotes, otProcedures, dischargeSummaries, crossReferrals, previous:{...} }`,
`notesByType` donut, `otByDoctor` bar list. ★NEW: `anaesthesiaMix` donut
(general/spinal/local/sedation per OT procedure) and `mlcCases` count.
Wards ★NEW: `roomShifts` (ADT transfer events — ✅ buildable from `tbl_atd_logs`).

### 4.4 IPD billing — same as §3.5 with `type=ipd`.

---

## 5. Filter contract — sources + support matrix

The filter bar has four criteria: **date range**, **doctor**, **clinic**, and
**department (OPD/IPD)** — the department toggle in the header is part of the
filter contract: endpoints that serve both departments take `type=opd|ipd`
(billing family) or have separate OPD/IPD paths.

### 5.1 Dropdown data sources
| Filter | Source today | Gap |
|---|---|---|
| Doctor list | `GET /api/v1/doctor` (communication service) — FE fetches live when Redux is cold | none — live |
| Clinic list | `hospital_data` on the login profile (`state.doctors.profile`, same source as the app header's clinic switcher) | works today; a standalone `GET /api/v1/reports/meta/clinics` would still decouple analytics from the login payload |

Both filters are **multi-select** (Tesseract Dropdown, checkbox options); the
FE sends the selection as comma-separated ids in `doctorId` / `clinicId`.
Endpoints that only support a single value today treat a CSV as "all" on the
FE side (the value is withheld) until they support lists.

### 5.2 Which endpoints honour which filter (FE sends all of them; ✗ = backend ignores it today → must be added)
| Endpoint | date range | doctorId | clinicId |
|---|---|---|---|
| billing dashboards (lab-params, §3.5) | ✓ | ✓ (`doctorIds`) | ✓ |
| `listAppointment` POST (stopgap) | ✓ | **✗ unverified** — GET replacement must honour it | ✓ |
| `clinic/dashboard/top-cards`, `clinic/consultations/weekly`, `clinic/diagnosis`, `clinic/consultation-modes`, Care family, `clinic/followups` | ✗ (`month` only) | ✓ | ✓ |
| `analytics/appointment`, `analytics/opd-billing`, `analytics/ipd-billing` | ✗ (`days` ∈ {7,15,30,90}) | **✗** | ✓ |
| `analytics/patients` | ✓ | ✓ | ✓ |
| `operational/overview`, `operational/abha` | ✓ | **✗** | ✓ |
| `analytics/inpatient-summary`, `ipd/wards`, `ipd/clinical` | ✗ (`days`) | n/a (clinic-level) | ✓ |

**Requirement:** every ✗ above becomes ✓ (range params per §1.2, `doctorId`
narrowing everywhere it is semantically valid). The FE already sends
`startDate/endDate/doctorId/clinicId` on every call, so each backend fix goes
live with zero FE changes. Until then, a widget served by a ✗ endpoint will
not respond to that filter — this is a backend gap, not an FE bug.

## 6. Reports tab (tabular downloads)
Unchanged from v2: `/financial/*`, `/clinical/*`, `/reference/*` tabular
endpoints with `?format=csv` on Tab-3 reports. No analytics widget may depend
on a tabular endpoint.

---

## 7. Migration priorities

| # | Change | Fixes | Priority |
|---|---|---|---|
| 1 | §3.2 appointments summary GET | retires the operational POST; period-true footfall | **P0** |
| 2 | §3.1 overview GET (or range params on top-cards/diagnosis/consultation-modes) | Overview honours the filter; "calendar month" caveat cards disappear | **P0** |
| 3 | §1.3 bucketing on all trend endpoints | x-axis finally matches the filter (7 days → 7 daily points) | **P0** |
| 4 | `byDoctor` multi-series (§3.3) | stacked "Usage by doctor" renders per-mode | P1 |
| 5 | `previous` blocks everywhere (§1.4) | delta pills render consistently | P1 |
| 6 | range params on patients/billing-analytics/inpatient (§3.4, §3.5, §4.1) | kills `days ∈ {7,15,30,90}` snapping | P1 |
| 7 | range params on Care + Grow family (§3.6, §3.7) | last month-based holdouts | P2 |

Until an upgrade ships, the FE keeps the old call **and labels the true window
on the card** ("current calendar month", "as of today") — no widget is allowed
to imply it follows the filter when it doesn't.
