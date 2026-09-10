# Receptionist Appointment API — Backend Contract

Frontend route: `/receptionist/appointments?receptionist` (Kea / receptionist session)

All calls use the existing Bearer token (`Authorization` header via `axiosService`). For Kea/receptionist JWTs, the frontend additionally sends attending-doctor and receptionist attribution on every appointment-related request.

## Session detection (frontend)

- URL: `?receptionist` (persisted in `sessionStorage` for the tab)
- Optional URL params: `receptionistId`, `receptionistName`, `um_id`, `um_name` (comma-separated doctor lists from Kea embed)

## Required extras on receptionist calls

| Channel | Fields |
|---------|--------|
| Query string | `um_id` (selected doctor), `receptionist_id` (token `user_id`) |
| Headers | `x-um-id`, `x-receptionist-id` |
| PatientMaster POST body | `doctor_id` (selected doctor — **required** for list remap on minimal BE), optional `doctorId` / `receptionist_id` |
| Visit book/reschedule body | **Only** schema fields (`doctor_id` already in payload). Do **not** merge `receptionist_id` / `doctorId` (minimal visit schemas use `additionalProperties: false`) |

Pattern reference: `src/api/services/ApiCustomInvestigation.js` (LIMS / custom investigations).
Visit mutations use `withReceptionistVisitMutationBody` (query + headers only).

## Endpoints

### 1. List appointments

- **Method:** `POST`
- **URL:** `{appointment_api_url}/api/v1/appointment/listAppointment`
- **Body (existing +):** `doctorIds: [um_id]`, `startDate`, `endDate`, `apStatue`, `search`, `filterVisitType`, `page`
- **Receptionist auth:** Validate token role = receptionist; `clinic_id` from token; verify `doctorIds[0]` belongs to same clinic; reject cross-clinic with **403**

### 1b. Month calendar summary

- **Method:** `GET`
- **URL:** `{appointment_api_url}/api/v1/appointment/listAppointmentCalendar?startDate=&endDate=&size=3&appointmentStatus=0,1,2,3`
- **Query extras (receptionist):** `um_id`, `receptionist_id`, optional `doctor_id` (selected doctor)
- **Response:** per-day `{ date, total_count, appointments[] }` (up to `size` chips; `total_count` drives `+N more`)
- **Receptionist auth:** Same dual-auth as list — scope to selected doctor + clinic

### 2. List slots (clinic + tele)

- **Method:** `GET`
- **URL:** `{visit_api_url}/api/v1/appointment/listSlots?doctorId={um_id}&date={YYYY-MM-DD}`
- **Tele:** append `&pam_status_type_appointment=2`
- **Receptionist auth:** Allow Kea token when `doctorId` + `receptionist_id` present and doctor∈clinic

### 3. Book appointment

- **Method:** `POST`
- **URL:** `{visit_api_url}/api/v1/appointment`
- **Body:** `doctor_id` = selected doctor; tele uses `appointment_type: 2`
- **Audit:** persist `receptionist_id` on create

### 4. Reschedule

- **Method:** `PUT`
- **URL:** `{visit_api_url}/api/v1/appointment/:pam_id`
- **Receptionist auth:** verify appointment belongs to selected doctor + clinic

### 5. Cancel

- **Method:** `POST`
- **URL:** `{appointment_api_url}/api/v1/appointment/cancelAppointment`
- **Body:** `pam_id`, `patient_unique_id`, `pm_id`, `pm_pid`

### 6. Patient search

- **Method:** `POST`
- **URL:** `{appointment_api_url}/api/v1/appointment/searchPatient`
- **Body:** `{ search: string }`
- **Scope:** clinic patients only for receptionist token

### 7. Case types / categories / add patient

| Endpoint | Purpose |
|----------|---------|
| `POST .../listCasetype` | Visit type dropdown |
| `GET .../patient/listCategories` | Category dropdown |
| `POST .../addPatient` | New patient from book drawer |

### 8. Doctor roster

- **Method:** `GET`
- **URL:** `{bulk_messages}/api/v1/doctor`
- **Note:** Confirm Kea token returns all doctors for the clinic

## Error codes (recommended)

| Code | Meaning |
|------|---------|
| 401 | Invalid / expired token |
| 403 | Receptionist not allowed for this doctor or clinic |
| 400 | Missing `um_id` / `doctorId` on receptionist token request |

## Out of scope (frontend does not call for receptionist MVP)

- SnapRx undigitised, Zydus ICT proxy, GenX, `endVisit`, Rx/consult routes, teleconsult `doctorLeft`

## Frontend implementation

- Wrapper: `src/api/services/receptionistAppointmentApi.js`
- Extras helper: `src/utils/receptionistRequestExtras.js`
- Attending doctor set by doctor dropdown: `SelectedDoctorContext` → `setReceptionistAttendingDoctor(um_id)`

## Backend: Pm-PatientMaster (appointment_api_url)

Implemented on PatientMaster:

- `listAppointment` / `cancelAppointment` use `checkDoctorOrReceptionistToken`
- Receptionist path remaps `user_id` → selected doctor (`doctorIds` / `um_id` / `x-um-id`) after clinic membership check
- Doctor JWT path unchanged (`isReceptionist === false`)

**Required ops step (visit-integration Mongo `keaApiScopes`):** allow these routes for Kea tokens (same collection used by `validate-token`):

| method | route |
|--------|-------|
| POST | `/api/v1/appointment/listAppointment` |
| POST | `/api/v1/appointment/cancelAppointment` |

(`searchPatient`, `listCasetype`, `addPatient` already used receptionist auth — confirm scopes exist.)

## Backend: Pm-visit-integration (visit_api_url)

Implemented on visit-integration:

- `listSlots` already used `authenticateDoctorOrReceptionistJWT`
- `POST /api/v1/appointment` and `PUT /api/v1/appointment/:appointmentId` now use the same middleware
- Kea scope matching supports parameterized routes (`:appointmentId`)
- Create/reschedule schemas allow optional `receptionist_id` / `doctorId` extras
- Doctor JWT path unchanged (`isReceptionist === false`)

**Required ops step (Mongo `kea_api_scopes`):**

| method | route |
|--------|-------|
| GET | `/api/v1/appointment/listSlots` |
| POST | `/api/v1/appointment` |
| PUT | `/api/v1/appointment/:appointmentId` |
| GET | `/api/v1/patient/listCategories` |

See `Pm-visit-integration/RECEPTIONIST_APPOINTMENT_AUTH.md`.

## Backend: Pm-Communication (bulk_messages)

`GET /api/v1/doctor` already used `authenticateDoctorOrReceptionistJWT`. Hardened Kea path matching / error handling; doctor JWT listing unchanged.

**Required ops step (Mongo `kea_api_scopes`):**

| method | route |
|--------|-------|
| GET | `/api/v1/doctor` |

See `Pm-communication/RECEPTIONIST_DOCTOR_LIST_AUTH.md`.

## Manual test URL (UAT)

```
/receptionist/appointments?receptionist&um_id=123,456&um_name=Dr%20A,Dr%20B
```

Use a receptionist (Kea) JWT in localStorage. Select a doctor from the dropdown; verify list, calendar slots, book, reschedule, and cancel.
