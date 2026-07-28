# CVT (Digitization) API Contract

Backend API requirements for the Mission Hospital analytics 3-metric comparison charts.

## Context

The Mission Analytics page shows two comparison bar charts:
1. **Visit trend** - daily breakdown: appointments booked vs consultations completed vs digitized (CVT)
2. **Doctor-wise comparison** - per-doctor breakdown: booked vs completed vs digitized (CVT)

"Digitized (CVT)" = whether a handwritten prescription written in SmartSync was subsequently converted to structured digital data via the "Digitize" action.

The frontend placeholders are ready (series renders as 0 until the API provides data). Once endpoints are available, plug them into `src/pages/mission-analytics/data/useMissionData.js`.

---

## Endpoint 1: Daily CVT counts

Returns per-day digitization counts for a date range.

```
GET /api/v2/reporting/cvt-daily
```

### Query parameters

| Param       | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| startDate   | string | yes      | ISO date `YYYY-MM-DD`              |
| endDate     | string | yes      | ISO date `YYYY-MM-DD`              |
| doctorId    | string | no       | Comma-separated doctor IDs filter  |
| clinicId    | string | no       | Comma-separated clinic IDs filter  |

### Response

```json
{
  "success": true,
  "data": {
    "labels": ["2026-07-01", "2026-07-02", "2026-07-03"],
    "datasets": [
      {
        "label": "Digitized",
        "data": [12, 8, 15]
      }
    ]
  }
}
```

Labels must match the same date strings returned by `analyticsAppointment` (the existing daily appointments endpoint) so the frontend can merge them by date.

---

## Endpoint 2: Doctor-wise CVT counts

Returns per-doctor digitization counts for a date range.

```
GET /api/v2/reporting/cvt-by-doctor
```

### Query parameters

| Param       | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| startDate   | string | yes      | ISO date `YYYY-MM-DD`              |
| endDate     | string | yes      | ISO date `YYYY-MM-DD`              |
| clinicId    | string | no       | Comma-separated clinic IDs filter  |

### Response

```json
{
  "success": true,
  "data": {
    "labels": ["Dr. Sharma", "Dr. Patel", "Dr. Gupta"],
    "datasets": [
      {
        "label": "Digitized",
        "data": [45, 32, 28]
      }
    ]
  }
}
```

Doctor name labels must match those returned by `clinicConsultationModes` (`byDoctor.labels`) so the frontend can merge by doctor name.

---

## Endpoint 3: Daily completed-consultation counts (optional enhancement)

The existing `analyticsAppointment` endpoint returns total daily appointment counts but does not break them down by status (booked vs completed). If this breakdown is available, provide it:

```
GET /api/v2/reporting/consultations-daily
```

### Query parameters

Same as Endpoint 1.

### Response

```json
{
  "success": true,
  "data": {
    "labels": ["2026-07-01", "2026-07-02", "2026-07-03"],
    "datasets": [
      {
        "label": "Completed",
        "data": [10, 6, 12]
      }
    ]
  }
}
```

If the existing `analyticsAppointment` endpoint can be extended to include a second dataset for completed counts (in addition to the existing total), that also works. The frontend adapter will pick up additional datasets automatically.

---

## Endpoint 4: Doctor-wise booked counts (optional enhancement)

The existing `clinicConsultationModes` endpoint returns completed consultations per doctor. If per-doctor booked appointment counts are available:

```
GET /api/v2/reporting/appointments-by-doctor
```

### Query parameters

Same as Endpoint 2.

### Response

Same shape as Endpoint 2, with `"label": "Booked"`.

---

## MongoDB source

Per the backend team, the CVT data resides in MongoDB. The key fields to query:

- Whether a prescription was digitized (CVT flag/status)
- The doctor who wrote it
- The date of digitization
- The clinic/hospital association

---

## Integration notes

- **Business ID**: 7921766745277649 (Mission Hospital)
- **Clinic ID**: 663
- The frontend currently calls 4 endpoints in parallel (`analyticsAppointment`, `operationalOverview`, `analyticsPatients`, `clinicConsultationModes`). The CVT endpoint(s) will be added as a 5th (and 6th) parallel call.
- The `{ labels, datasets }` chart-series shape is the standard Pm-Core reporting format already used by all other analytics endpoints.
- Date labels should be ISO `YYYY-MM-DD` format to match the existing appointment series.
- Max date range the frontend allows: 31 days.
