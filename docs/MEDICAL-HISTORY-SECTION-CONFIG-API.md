# Medical History — Section Config API

Contract for two new endpoints that persist a **doctor's personal layout** of the
Medical History drawer: the order the sections appear in, and which ones are
hidden.

Status: **live on UAT** at `pm-medicalhistory-uat.tatvacare.in`. The frontend is
wired to these endpoints and degrades to defaults if they fail.

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
| 6 | Additional History *(frontend-only, not sent)* |

`tmmhs_id: 6` is **frontend-only and never sent to these endpoints** — the API
accepts ids 1-5. Additional History is persisted on `medical_history_remarks` of
the first section, not as its own row, so it has no server-side identity. It is
given id 6 in the UI only so the customize panel can list it alongside the real
sections (the same id `MobileMedicalHistorySectionsList` already uses). The
frontend strips it from every payload and pins it last on load, which means its
position and visibility are **not persistable** today.

---

## `GET /api/v1/medicalhistory/getUserSectionOrder`

No payload — the doctor is resolved from the bearer token.

Response — a doctor who has customised their layout (`data` is a **flat array**,
not a wrapper object):

```json
{
  "status": true,
  "data": [
    { "tmmhs_id": 2, "visible": true,  "order": 1 },
    { "tmmhs_id": 4, "visible": true,  "order": 3 },
    { "tmmhs_id": 3, "visible": false, "order": 2 },
    { "tmmhs_id": 1, "visible": true,  "order": 0 },
    { "tmmhs_id": 5, "visible": true,  "order": 4 }
  ]
}
```

A doctor who has never customised anything should get an **empty list**, not an
error:

```json
{ "status": true, "data": [] }
```

The frontend treats an empty list, a missing `data`, a non-200, and a network
failure identically: fall back to the default order with everything visible.

---

## `POST /api/v1/medicalhistory/setUserSectionOrder`

Sends the **complete** layout every time — this is a replace, not a patch. The
frontend fires it on each individual reorder or toggle.

Request:

```json
{
  "doctor_unique_id": "d3f1c2a0-…",
  "sections": [
    { "tmmhs_id": 2, "visible": true,  "order": 1 },
    { "tmmhs_id": 4, "visible": true,  "order": 3 },
    { "tmmhs_id": 3, "visible": false, "order": 2 },
    { "tmmhs_id": 1, "visible": true,  "order": 0 },
    { "tmmhs_id": 5, "visible": true,  "order": 4 }
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
| `tmmhs_id` | int | 1–5. Id 6 is never sent — see above. |
| `visible` | bool | `false` = section hidden in the drawer. |
| `order` | int | 0-based, contiguous, ascending. Ties are undefined behaviour. |

Always persist all five rows. Partial sets work but force the frontend to
reconcile against defaults on every load.

---

## Frontend behaviour today

Wired in [`useSectionConfig.js`](../src/components/medical-history/useSectionConfig.js):

- `getUserSectionOrder` fires when the drawer opens.
- `setUserSectionOrder` fires immediately on every drag-reorder and visibility toggle.
- Both thunks **swallow all errors and resolve to `null`.** "No config saved yet"
  and "endpoint unreachable" are indistinguishable to the doctor, and neither is
  worth an error toast for a layout preference.
- Nothing is cached client-side — no localStorage fallback. If an environment
  lacks these endpoints, customisation simply applies for the session and resets
  on reload.
- Additional History (id 6) is appended to the order client-side after the
  response is applied; dragging it has no persisted effect.

One safety rule is enforced client-side regardless of config: **a hidden section
still renders if the patient already has data recorded in it.** Hiding a section
can never conceal recorded clinical history.
