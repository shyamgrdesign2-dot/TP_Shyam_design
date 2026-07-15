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
Overview top-symptom cards are dead until this lands. No FE change needed once fixed.

## P0-2 · `operational/overview` — 500 on every window (even 1 day)

Not fixed by PR #8 despite being BUG-3. 500 for 1-day, 7-day and 30-day windows, with and without
narrowing. Feeds the Overview headline row fallbacks.

## P0-3 · `clinical/appointment/detailed` — 500 with any parameters (NEW, not in your triage)

Plain `?startDate&endDate` (1–7 days), with or without gender/age/status filters → 500. This is the
Appointment Analytics "Detailed Report" CSV — currently un-exportable.

---

## P1-1 · `clinical/medical-history` returns EMPTY for every doctor over a FULL YEAR — parse or source?

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

## New-capability asks (P3 — only if cheap)

- **Catalog-vs-custom split for other domains** (symptoms/examination/diagnosis/advice entered from
  catalog vs typed free-text), like `clinic/rx.catalogVsCustom`. Wanted product-side; presumably the
  boxes' tag-prefix vs free-text distinction makes this computable. Confirm feasibility before we
  design UI.
- **Per-topic `byDoctor`** for examination/advice (lab-test already has it) — we may replace the
  low-value per-topic "over time" tiles with by-doctor splits, which doctors act on more.

## Your two product questions — answers

- **BUG-11 (collection scope):** yes — make `financial/collection/*` default to **all business
  clinics when `clinicId` is omitted** (matches how our Billing section presents money; the current
  single-clinic 403 surprises multi-clinic accounts). Flag the release since money totals change.
- **ASK-1 (Till date):** prefer **exposing `accountCreatedAt`** (e.g. on capabilities or a lookup)
  and keeping the 366-day cap; the FE will build the "Till date" preset from it.
