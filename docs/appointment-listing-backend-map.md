# Appointment listing — backend dependency map

Every network call the Tesseract appointment module makes, cross-checked
against the legacy production screen (`src/components/AppointmentData.js`,
`src/pages/AppointmentList.js`). Base URL is the master webservice
(`pm-master-uat-webservice.tatvacare.in` locally, prod host in prod builds).

**There is no mock, stub or fixture layer anywhere in this module.** Verified
by grep for stubs/fixtures/hardcoded returns, and by capturing live XHR.

---

## 1. Read paths

| Flow | Endpoint | Same as prod? | Notes |
|---|---|---|---|
| Table + calendar rows | `POST /api/v1/appointment/listAppointment` | **Yes** | Same `apStatue` buckets: Queue 0, Finished 3, Cancelled 4, Draft 6 |
| Doctor availability (in-clinic) | `listSlots` via `getSlotsList(doctorId, date)` | **Yes** | Same call the Add Appointment page uses |
| Doctor availability (teleconsult) | `listSlots` with `pam_status_type_appointment=2` | **Yes** | Merged onto the in-clinic grid as `teleAvailable` |
| Visit types | `POST /api/v1/appointment/listCasetype` | **Yes** | Drives the Visit Type dropdown and the filter group |
| Categories | `listCategories` | **Yes** | |
| Patient search | `POST /api/v1/appointment/searchPatient` | **Yes** | 500ms debounce, same as legacy |
| Pending digitisation ids | `getSnapRxUnDigitisedIds` → `undigitizedAppointments` | **Yes** | All-time window, ids passed as `cvtAppointmentIdsStr` |
| Salutations | `GET /api/v1/appointment/showSalutation` | **Yes** | Add-patient form |
| Blood groups | `GET /api/v1/appointment/showBloodGroup` | **Yes** | Returns `{bg_value, bg_title}` |
| Pincode → city/state | `POST /api/v1/appointment/searchPincode` | **Yes** | Add-patient address section |

All availability comes from the logged-in doctor's own published schedule
(`getLoggedInDoctorId()` decoded from the auth token), never from a fixture.

## 2. Write paths

| Flow | Endpoint | Same as prod? |
|---|---|---|
| Book in-clinic | `addAppointment` → `POST /api/v1/appointment` | **Yes** |
| Book teleconsult | `bookTeleconsult` (`appointment_type 2`) | **Yes** |
| Cancel | `POST /api/v1/appointment/cancelAppointment` | **Yes** |
| End visit | `POST /api/v1/appointment/endVisit` | **Yes** |
| Add patient | `POST /api/v1/appointment/addPatient` | **Yes** |
| Join teleconsult | `ApiTeleconsult.checkVideoAvailability(pam_id)` | **Yes** |

## 3. Reschedule — the answer

**Production has no reschedule.** Grep for `reschedule` across
`AppointmentData.js` and `AppointmentList.js` returns **zero** hits, and there
is no reschedule endpoint on `ApiAppointments`.

Ours is therefore new behaviour, not a port, and it is composed from two
existing production calls:

1. `addAppointment` / `bookTeleconsult` for the new slot
2. `cancelAppointment` for the old one, **only after** the booking succeeds

Consequences worth knowing:

* It is **not atomic**. If the cancel fails after the booking succeeds, the
  patient briefly holds two appointments. The UI reports this rather than
  hiding it.
* The new appointment gets a **new `pam_id`**. Anything keyed to the old id
  (a draft prescription, a bill in progress) does not follow it.
* The copy in the drawer states the mechanic plainly: *"Their current slot is
  released only once the new one is confirmed."*

**If reschedule is meant to ship, ask the backend for a real
`rescheduleAppointment` endpoint that moves the slot in place.** That is the
one genuine backend gap in this module.

## 4. Row markers

| Marker | Source field | Verified live |
|---|---|---|
| Teleconsultation | `pam_status_type_appointment` ∈ {1, 2} | **Yes** |
| Symptom collector | `symptomsGathered` | **Yes** — present in the live payload, `false` on current UAT rows |

Both render in the table row, the calendar event card and the calendar
popover. Prod shows the symptom glyph only in its Action column; ours puts it
with the patient, where the fact belongs.

## 5. Join-teleconsult flow

Mirrors `TeleconsultWaitingBanner.handleJoinCall` exactly:

```
checkVideoAvailability(pam_id)
  → joinPayload.token  (absent ⇒ toast: join window ended / not yet joinable)
  → dispatch setJoinToken / setActiveTeleconsultAppointmentId
             / setActiveTeleconsultConsultationId
  → navigate("/prescription", { patient_data, videoConsultData,
                                teleconsultAutoJoin: { consultationId, token } })
```

Reachable from: the calendar popover's Join button, and the table row kebab
("Join Video Call", shown only when `hasVideo`).

## 6. Not covered by this module

These are launched from the row but are whole products of their own, reused
from the legacy screen unchanged: Create Bill, Advance Deposit, Add Lab
Results, Create Certificate, and every Rx flow (TypeRx / VoiceRx / SnapRx /
SmartSync / TabRx / Print / Resume / Digitise). Their backend contracts are
theirs, not ours.

## 7. Open items

1. **No `rescheduleAppointment` endpoint** — see §3. Needs a backend decision.
2. **Booking and reschedule submits are still untested end to end** against
   UAT, because confirming them writes real appointment data. Everything is
   verified up to the point of submission; the payload builders are shared
   with the legacy Add Appointment page.
3. **Blocked-slot toast** is code-verified only — the doctor's current
   schedule has no `unavailable` / `leave` slot to exercise it.


---

## Reschedule: resolved

The gap recorded in §3 is closed. Production exposes an in-place update on the
visit-integration service:

    PUT {visit_api_url}/api/v1/appointment/{pam_id}
    { doctor_id, appointment_date, appointment_start_time,
      appointment_end_time, appointment_duration }

`visit_api_url` resolves per environment in `src/EnvironmentConfig.js`
(uat: `pm-visit-integration-uat.tatvacare.in`, prod:
`pm-visit-integration-prod.tatvacare.in`), so no new host is introduced.

Wired as `ApiAppointments.rescheduleAppointment(pamId, payload)` and called
from `BookAppointmentDrawer` whenever `isReschedule && rescheduleId`.

This replaces the previous book-then-cancel pair, which had three problems:
two writes for one intent, a window in which the patient held two
appointments, and a fresh `pam_id` that broke anything referencing the
original. The page's `onBooked` now receives `{ moved: true }` and skips the
cancel entirely on that path.

**Not yet exercised against the live API.** The call writes a real UAT
appointment, so it has been wired and reviewed but not fired.
