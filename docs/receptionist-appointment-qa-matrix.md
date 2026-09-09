# Receptionist Appointment Listing — QA Matrix

## Access control

| Case | Expected |
|------|----------|
| Open `/receptionist/appointments?receptionist` with Kea token | Page loads, no Header/Sidebar |
| Open `/receptionist/appointments` without `?receptionist` (doctor token) | Redirect to `/` |
| Doctor opens `/appointments-x` | Unchanged doctor v2 listing |

## Doctor dropdown

| Case | Expected |
|------|----------|
| Clinic with 2+ doctors | Dropdown lists all; default = first or URL `um_id` |
| Change doctor | List + calendar refresh for selected doctor |
| URL `um_id=1,2&um_name=A,B` | Dropdown populated from URL when API unavailable |

## List view

| Case | Expected |
|------|----------|
| Queue / Finished / Cancelled tabs | Data scoped to selected doctor |
| Search patient | Debounced server search |
| Row kebab | Reschedule (queue), Cancel only |
| No Patient Details / Consult / Rx / billing CTAs | Hidden |

## Calendar view

| Case | Expected |
|------|----------|
| All / Queue / Finished / Cancelled | Merged schedule for selected doctor |
| Dual clinic + tele free slots | Separate chips; mode-locked book drawer |
| Tele offset (TP-2771) | Tele book uses matched tele grid start |
| Drag reschedule (tablet) | Opens book drawer seeded to drop slot |
| Book from free slot | Drawer opens with correct mode |

## Book / cancel / reschedule

| Case | Expected |
|------|----------|
| Book in-clinic | Success toast; list + slots refresh |
| Book teleconsult | Success; tele slot validation |
| Reschedule from kebab | PUT move; same pam_id |
| Cancel queue appointment | Confirm dialog; cancelled tab updates |
| Backend 403 | Clear error toast |

## Hidden (must not appear)

- Walk-In, `/add-appointment` nav, Draft/Pending/Referral tabs
- ICS export, Rx CTAs, billing, lab results, ABHA, IPD, end visit
- Zydus encounter tabs, AI receptionist promo

## Regression (doctor flow)

| Case | Expected |
|------|----------|
| `/appointments-x` book/cancel/reschedule | Works as before |
| Doctor calendar dual grids | Unchanged |
| `BookAppointmentDrawer` without `receptionistMode` | Uses JWT doctor id |
