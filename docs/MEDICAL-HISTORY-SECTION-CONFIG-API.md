# Medical History — Section Config API

Contract for two new endpoints that persist a **doctor's personal layout** of the
Medical History drawer: the order the sections appear in, and which ones are
hidden.

Status: **not implemented.** The frontend is already wired to these endpoints and
degrades cleanly without them — see [Frontend behaviour today](#frontend-behaviour-today).

---

## What this stores

This is a **UI preference, not clinical data.** It never affects what is saved to
or read from a patient's medical history. Losing it costs a doctor their column
order, nothing more.

- **Order** — the sequence of section cards in the drawer's left panel.
- **Visibility** — whether a section card is rendered at all.

Scoped **per doctor**, not per clinic. A doctor consulting at two hospitals sees
the same layout in both.

---

## Sections

| `tmmhs_id` | Section |
|---|---|
| 1 | Lifestyle |
| 2 | Medical Condition |
| 3 | Family History |
| 4 | Allergies |
| 5 | Surgical History |
| 6 | Additional History |

`tmmhs_id: 6` is **not a real backend section.** Additional History is persisted
on `medical_history_remarks` of the first section, not as its own row. It is
given id 6 here purely so it can be ordered and hidden alongside the real
sections — the same id already used by `MobileMedicalHistorySectionsList`. Store
it as an ordinary int; no special handling needed.

---

## `POST /api/v1/medicalhistory/getSectionConfig`

Request:

```json
{ "doctor_unique_id": "d3f1c2a0-…" }
```

Response — a doctor who has customised their layout:

```json
{
  "status": true,
  "data": {
    "doctor_unique_id": "d3f1c2a0-…",
    "sections": [
      { "tmmhs_id": 2, "visible": true,  "order": 0 },
      { "tmmhs_id": 4, "visible": true,  "order": 1 },
      { "tmmhs_id": 3, "visible": false, "order": 2 },
      { "tmmhs_id": 1, "visible": true,  "order": 3 },
      { "tmmhs_id": 5, "visible": true,  "order": 4 },
      { "tmmhs_id": 6, "visible": true,  "order": 5 }
    ]
  }
}
```

A doctor who has never customised anything should get an **empty list**, not an
error:

```json
{ "status": true, "data": { "doctor_unique_id": "d3f1c2a0-…", "sections": [] } }
```

The frontend treats an empty list, a missing `data`, a non-200, and a network
failure identically: fall back to the default order with everything visible.

---

## `POST /api/v1/medicalhistory/saveSectionConfig`

Sends the **complete** layout every time — this is a replace, not a patch. The
frontend fires it on each individual reorder or toggle.

Request:

```json
{
  "doctor_unique_id": "d3f1c2a0-…",
  "sections": [
    { "tmmhs_id": 2, "visible": true,  "order": 0 },
    { "tmmhs_id": 4, "visible": true,  "order": 1 },
    { "tmmhs_id": 3, "visible": false, "order": 2 },
    { "tmmhs_id": 1, "visible": true,  "order": 3 },
    { "tmmhs_id": 5, "visible": true,  "order": 4 },
    { "tmmhs_id": 6, "visible": true,  "order": 5 }
  ]
}
```

Response:

```json
{ "status": true, "data": { "doctor_unique_id": "d3f1c2a0-…" } }
```

The frontend updates optimistically and ignores the response body, so returning
the saved rows is optional.

### Reset

"Reset" in the customize panel sends the default order with everything visible.
There is no separate delete endpoint; backend may treat a default payload as a
row deletion if that's cheaper.

---

## Field rules

| Field | Type | Notes |
|---|---|---|
| `doctor_unique_id` | string | From `profile.doctor_unique_id`. |
| `tmmhs_id` | int | 1–6. See table above. |
| `visible` | bool | `false` = section hidden in the drawer. |
| `order` | int | 0-based, contiguous, ascending. Ties are undefined behaviour. |

Always persist all six rows. Partial sets work but force the frontend to
reconcile against defaults on every load.

---

## Frontend behaviour today

Wired in [`useSectionConfig.js`](../src/components/medical-history/useSectionConfig.js):

- `getSectionConfig` fires when the drawer opens.
- `saveSectionConfig` fires immediately on every drag-reorder and visibility toggle.
- Both thunks **swallow all errors and resolve to `null`.** A 404 from an
  undeployed endpoint is indistinguishable from "no config saved", and neither
  shows the doctor an error.
- Until the endpoints exist, customisation applies for the current session and
  resets on reload. Nothing is cached client-side — there is deliberately no
  localStorage fallback, so the day these endpoints deploy the feature starts
  persisting with **no frontend change** and no stale local state to migrate.

One safety rule is enforced client-side regardless of config: **a hidden section
still renders if the patient already has data recorded in it.** Hiding a section
can never conceal recorded clinical history.
