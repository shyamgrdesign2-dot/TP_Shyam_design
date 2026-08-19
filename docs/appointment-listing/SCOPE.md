# Appointment Listing — scope and blast radius

What was built, what was touched, and what was deliberately left alone.
Figures below are from `git diff --stat` against `prod`.

---

## 1. Folder structure

```
src/pages/appointment-listing/          the screen
├── index.js                            lazy-route entry
├── AppointmentListingPage.jsx          page shell: tabs, toolbar, view switch, all drawers
├── AppointmentListingPage.module.css
├── assets/
│   └── empty-docs.svg
├── components/
│   ├── AppointmentListView.jsx         the table (DS DataTable)
│   ├── AppointmentListView.module.css
│   ├── AppointmentCalendarView.jsx     day/week/month grid, zoom, drag, slot layer
│   ├── AppointmentCalendarView.module.css
│   ├── AppointmentEventCard.jsx        one appointment on the grid, four density tiers
│   ├── AppointmentEventCard.module.css
│   ├── BookAppointmentDrawer.jsx       book AND reschedule
│   ├── BookAppointmentDrawer.module.css
│   ├── TeleconsultPopover.jsx          the video marker's card + Join
│   ├── TeleconsultPopover.module.css
│   ├── RowActionDrawers.jsx            bill / deposit / lab / certificate hosts
│   ├── rowActions.js                   per-status action map + row kebab
│   └── BillingTag.jsx                  billing + status chips (DS Badge)
└── data/
    ├── appointmentsConfig.js           tab ids, status mapping, filter groups
    ├── appointmentStates.js            single source of truth for state colour/glyph/label
    ├── useAppointments.js              row fetching, mapping, counts
    ├── useDoctorSlots.js               availability fetching + per-day cache
    ├── viewPreferences.js              localStorage, allow-list validated
    └── exportIcs.js                    calendar export

src/pages/add-patient/                  the inline patient creation drawer
├── AddPatientDrawer.jsx                DS Drawer shell + error toast host
├── AddPatientDrawer.module.css
├── PatientForm.jsx                     all fields, validation, save
└── PatientForm.module.css
```

## 2. File count

| | Files | Lines |
| --- | --- | --- |
| `appointment-listing/` | 23 | ~9,000 |
| `add-patient/` | 4 | ~1,290 |
| **Total new module** | **27** | **~10,290** |

## 3. Everything touched outside those two folders

Three files. That is the entire blast radius.

| File | Change | Risk |
| --- | --- | --- |
| `src/App.js` | One lazy import + one route, `appointments-x` | **None** — additive; no existing route altered |
| `src/api/services/ApiAppointments.js` | **+15 lines**: `rescheduleAppointment(pamId, data)` | **Low** — a new method, nothing existing modified |
| `src/index.css` | **+55 lines**: hide DS status glyphs, DataTable left-edge scroll veil, placeholder normalisation | **Medium — read this** |
| `package.json` | `@dhspl-tatvacare/tesseract-ui` 1.0.6 → 1.1.0 | **Medium — read this** |

### 3.1 The `src/index.css` additions are app-wide

They are scoped by DS class-name pattern, not by page, so they reach every
Tesseract component in the app:

- `[class*="_statusIcon_"] { display: none }` — removes the in-field status
  glyph on every InputBox everywhere.
- `[class*="_footer_"] [data-tp-icon^="danger"]` and siblings — removes the
  leading glyph from helper lines.
- `html[data-tp-theme] [class*="_placeholder_"]` — pins placeholder weight,
  size and colour.
- `[class*="_scrollerWrap_"]:has(...)::before` — left-edge scroll veil on every
  DS DataTable.

**Anyone reviewing this should confirm these are wanted globally**, or move them
under a page-scoped selector. They were written as house rules on purpose, but
that was a decision, not an accident.

### 3.2 The Tesseract bump is app-wide

1.0.6 → 1.1.0 affects every screen using the design system, not only this one.
Regression testing beyond this module is a separate exercise.

## 4. Legacy code deliberately NOT touched

- The legacy appointment screen and its route are untouched and still live. This
  is a parallel implementation at a parallel route.
- `AppointmentData.js`, `ProfilePopover.js`, `SidebarPatient.js` and the rest of
  the legacy patient chrome are unmodified. The new screen **reads** their
  conventions (for example the `pm_pid` vs `pm_reference_id` Patient ID rule
  mirrored from `ProfilePopover.js:143`) but does not change them.
- No redux slice was modified. The module calls `ApiAppointments` directly and
  reuses `addAppointment` / `bookTeleconsult` / `getSlotsList` from the existing
  `addAppointment/service`.
- No shared component was edited. Everything visual is either a Tesseract
  component or lives inside this module.

## 5. Data sources — there is no mock data

A grep for `mock|dummy|sample|fake|placeholderData|generateMock` across both
folders returns nothing. Every value on screen comes from:

| Surface | Call |
| --- | --- |
| Rows, tab counts | `getAllAppointment` |
| Slot grid | `getSlotsList` + `getTeleconsultSlotsList` |
| Pending Digitisation | `getSnapRxUnDigitisedIds` |
| Patient search | `searchPatients` |
| Visit types, categories | `getCaseTypes`, `listCategories` |
| Book | `addAppointment` / `bookTeleconsult` |
| Reschedule | `rescheduleAppointment` (`PUT /api/v1/appointment/{pam_id}`) |
| Cancel | `cancelAppointments` |
| Add patient | `addPatient`, `listSalutation`, `listBloodGroup`, `searchPincode` |

Full request/response detail: [../appointment-listing-backend-map.md](../appointment-listing-backend-map.md).

## 6. Open backend questions

These need a backend decision before production. They are not frontend bugs.

1. **Reschedule drops visit type, category and remarks.** `PUT
   /api/v1/appointment/{pam_id}` accepts only `doctor_id`, `appointment_date`,
   `appointment_start_time`, `appointment_end_time`, `appointment_duration`.
   Changing the visit type inside the reschedule drawer will not persist.
   Either the endpoint takes those fields, or the drawer must lock them during
   a move. **Currently it does neither** — the fields are editable and silently
   discarded.
2. **No optimistic concurrency on reschedule.** Two users moving the same
   appointment both succeed; last write wins with no warning.
3. **`queue_count` badge semantics** — see the backend map; the count and the
   row set can disagree under some status combinations.

## 7. Environment traps

None of these are caused by this branch. All four were hit while preparing it,
so they are written down rather than rediscovered.

| # | Symptom | Cause | Fix |
| --- | --- | --- | --- |
| 1 | `npm install` fails with `401 Unauthorized ... @dhspl-tatvacare%2ftesseract-ui` | The design system is on a **private GitHub Packages registry**; `.npmrc` reads `NODE_AUTH_TOKEN` from the environment | `NODE_AUTH_TOKEN=$(gh auth token) npm install --legacy-peer-deps`, with `read:packages` in scope |
| 2 | `npm ci` installs but the design system is missing | `package-lock.json` is gitignored **and** stale on `prod` — it has no `@dhspl-tatvacare` entry at all | Never `npm ci`. Always `npm install --legacy-peer-deps` |
| 3 | `npm run build` fails in `@cloudflare/realtimekit` with a Babel `transform-classes` error | Pre-existing on `prod`. Verified by building an untouched `prod` checkout in a separate worktree: identical failure | Belongs in its own change. Adding `@babel/plugin-transform-classes`, or pinning the SDK |
| 4 | Import errors for exports that plainly exist (usually `ConsultationLayout.js` against the dental slices), or a CSS change that will not appear | Webpack keeps the module graph from the branch that was checked out when the dev server started | Restart the dev server after switching branches |

The `babel-preset-react-app` peer-dependency warning is noise, not an error. It
prints on install, build and push, and is a create-react-app defect.

## 8. Known limitations

- **Write paths are untested against the live API.** Booking, rescheduling and
  patient creation are implemented and reviewed but were never fired, because
  each creates real data. See [TEST-PLAN.md](TEST-PLAN.md) § 1.
- **Tablet behaviour is unverified on hardware.** The media queries and pointer
  gating are sound by construction; the Android pinch-zoom and the touch move
  flow want a real device.
- **Table view has no refresh control.** Refresh lives in the calendar's legend
  bar only. A decision is pending on where it belongs in the table.

## 9. Open decisions

Six questions the code cannot answer. Each needs an owner before this ships.

| # | Question | Options |
| --- | --- | --- |
| 1 | Reschedule silently discards visit type, category and remarks (§ 6.1) | Backend accepts them, or the drawer locks them during a move |
| 2 | No concurrency guard on reschedule; last write wins (§ 6.2) | Accept, or add an `If-Match` / `updated_at` check |
| 3 | Should the app-wide `src/index.css` rules stay global? (§ 3.1) | Keep as house rules, or scope to this page |
| 4 | Where does Refresh live in the table view? | Toolbar glyph, its own footer bar, or none |
| 5 | Should a new booking on a tele-capable slot default to Tele-Consultation? | Only when filtered to video (current), or always |
| 6 | Field radius is 10px, info cards are 12px | Keep the distinction, unify at 12, or unify at 10 |
