# Appointment Listing — test plan

Written to be executed by a person **or** consumed by a test-writing agent.
Every case states its precondition, its steps and a machine-checkable
expectation, so it can be turned into Playwright/Cypress without interpretation.

Route under test: `/appointments-x`
Branch: `feat/new-appointment-v1-shyam`
Environment: UAT (`pm-master-uat-webservice` + `pm-visit-integration-uat`)

**Before you start**, read [SCOPE.md § 7 Environment traps](SCOPE.md#7-environment-traps).
Four things will look like bugs in this build and are not: the private-registry
401 on install, `npm ci` silently omitting the design system, the pre-existing
`npm run build` failure on `prod`, and webpack reporting phantom import errors
after a branch switch. Do not raise any of those against this work.

> **Selector convention.** CSS Modules hash their class names, so match on the
> stable prefix: `[class*="AppointmentCalendarView_root"]`. Behavioural state is
> exposed on data attributes that are part of the contract and safe to assert
> on: `data-view`, `data-state`, `data-status`, `data-selected`, `data-drop`,
> `data-peek`, `data-taken`, `data-gone`, `data-original`, `data-today`,
> `data-incomplete`, `data-busy`, `data-locked`.

---

## 0. Priority order

Run in this order. Everything below P0 assumes P0 passed.

| Priority | Group | Why first |
| --- | --- | --- |
| **P0** | § 1 Write paths | Never executed against a live API. Highest unknown. |
| **P1** | § 2 Smoke | Proves the page loads and reads correctly at all |
| **P2** | § 3 Table, § 4 Calendar | The two main surfaces |
| **P3** | § 5 Drawers, § 6 Add patient | Deep flows |
| **P4** | § 7 API contract, § 8 Touch, § 9 Regression | Breadth |
| **P4** | § 10 Load and stress | Where it breaks, and how it breaks |

---

## 1. Write paths — P0, never yet executed

Each of these creates or mutates real UAT data. Use a disposable test patient.

| # | Case | Steps | Expected |
| --- | --- | --- | --- |
| 1.1 | Book in-clinic | Calendar → Day → click a free slot → pick patient → visit type → **Confirm Booking** | Success toast; drawer closes; row appears in Queue; slot on grid becomes an event card |
| 1.2 | Book teleconsult | As 1.1, switch mode to Tele-Consultation first | Booked via `bookTeleconsult`; row shows the video marker |
| 1.3 | Book with tele-only slot | Pick a slot where `teleAvailable` is false, switch to Tele-Consultation | Mode is disabled with an inline warning; CTA refuses with a named reason |
| 1.4 | **Reschedule same day** | Queue row → kebab → Reschedule → pick another slot → **Confirm Reschedule** | **One** `PUT /api/v1/appointment/{pam_id}`. **No** `addAppointment`. **No** `cancelAppointment`. `pam_id` unchanged. Old slot frees, new slot fills |
| 1.5 | Reschedule to another date | As 1.4, change the date first | Same as 1.4; row's date updates in both views |
| 1.6 | Reschedule via drag | Calendar → Day → drag a queue card onto a free slot → release → confirm | Drawer opens seeded to the dropped slot, correct day-part tab active, that chip selected |
| 1.7 | Reschedule failure | Force a 500 on the PUT | Error toast names the failure; drawer stays open; nothing changed server-side |
| 1.8 | Network drop mid-write | Kill the network during a booking | Error toast, not a silent stop. Spinner clears |
| 1.9 | Cancel appointment | Kebab → Cancel Appointment → confirm | Row moves to Cancelled; slot frees |
| 1.10 | Add patient then book | Search a name that does not exist → Add a new patient → save → book them | Patient created, prefilled name carried through, selectable immediately |

**1.4 is the single most important case in this document.** It is the newest
code and the only one that replaced a two-call flow with a one-call flow.

---

## 2. Smoke — P1

| # | Case | Expected |
| --- | --- | --- |
| 2.1 | Page loads | No console errors; `[class*="AppointmentListingPage_page"]` present |
| 2.2 | Tabs load counts | Each tab badge shows a number; no `NaN`, no blank |
| 2.3 | Table renders | Rows > 0 on Queue for a day with appointments |
| 2.4 | Calendar renders | Toggle to calendar; `[data-view="calendar"]`; slot blocks > 0 |
| 2.5 | No mock data | Network tab shows a real request behind every populated surface |
| 2.6 | Refresh | Legend refresh glyph → `data-busy="true"` then cleared; rows refetched |

---

## 3. Table view — P2

| # | Case | Expected |
| --- | --- | --- |
| 3.1 | Every tab | Queue / Finished / Cancelled / Draft / Pending — each renders rows or its empty state, no errors |
| 3.2 | Pending date label | On Pending Digitisation the date control reads **"Till date"**, not "Today" |
| 3.3 | Patient ID column | Shows `pm_pid` (`PAT0402`), **not** a referral code (`TEST_REF-`). Under the `GB_CVT_EXT_HOS` flag it shows the reference id instead |
| 3.4 | Slot column | Time in blue, date below in secondary ink |
| 3.5 | Video marker colour | Matches the row's state: blue queue, green finished, red cancelled, amber draft |
| 3.6 | Teleconsult popover | Hovering the marker opens a white card with name, time, contact, visit type, tags and **Join** |
| 3.7 | Join does not navigate | Pressing Join starts the call. URL must **not** change to the prescription page |
| 3.8 | Row kebab per status | Queue has Reschedule; Draft has Print Draft Rx and no End Visit; Cancelled has no Cancel |
| 3.9 | Search | Typing filters by name, phone and ID |
| 3.10 | Filters | Slot (in-clinic/tele) and visit type filter the rows; the active-filter bar reflects them; Clear resets |
| 3.11 | Empty states | Each tab's empty state shows subtext at regular weight in a lighter tone |
| 3.12 | Tab weight | Only the active tab is semibold; the rest are regular |

---

## 4. Calendar view — P2

### 4.1 Grid

| # | Case | Expected |
| --- | --- | --- |
| 4.1.1 | Day / Week / Month | Each renders; the choice survives a reload |
| 4.1.2 | Week fetches its span | Switching to Week loads the whole week's appointments, not just the anchor day |
| 4.1.3 | Month fills the panel | No dead space below the last week row; `monthGrid` bottom meets the legend |
| 4.1.4 | Now line | Present on today only; "Back to now" appears when scrolled away and clears the legend |
| 4.1.5 | Zoom | ctrl+wheel and pinch change hour height between 96px and 280px, anchored under the pointer |
| 4.1.6 | Legend | In queue / Finished / Cancelled / Draft, colours matching the cards |

### 4.2 Date semantics

| # | Case | Expected |
| --- | --- | --- |
| 4.2.1 | Day label | Reads "Today", or "D MMM YYYY (ddd)" |
| 4.2.2 | Week label | Reads a **range**: "10 Aug 2026 – 16 Aug 2026" |
| 4.2.3 | Month label | Reads "Aug 2026" |
| 4.2.4 | Header and toolbar agree | Both pickers show the same string at all times |
| 4.2.5 | Arrows step by unit | Next in Week advances 7 days and the label follows; in Month advances a month |
| 4.2.6 | Picking jumps | Choosing a date in the picker moves the grid to the period containing it |
| 4.2.7 | No stray day highlight | In Week and Month no single column or cell is marked as "chosen"; only `data-today` |

### 4.3 Slots

| # | Case | Expected |
| --- | --- | --- |
| 4.3.1 | Show Slots on | Slot blocks render; free ones dashed blue |
| 4.3.2 | Show Slots off | Zero slot blocks; appointment cards remain |
| 4.3.3 | Hover peek | With it off, hovering reveals exactly **one** block, `data-peek`, under the pointer |
| 4.3.4 | Peek shows unavailable too | Hovering past or blocked time reveals it in muted grey, not clickable |
| 4.3.5 | Hover keeps dashed | A free slot's border stays `dashed` on hover, never `solid` |
| 4.3.6 | Drag reveals all | Starting a drag with the layer off brings every slot back for the gesture |
| 4.3.7 | Preference persists | The toggle survives a reload |

### 4.4 Drag to reschedule (pointer only)

| # | Case | Expected |
| --- | --- | --- |
| 4.4.1 | Only queue cards drag | A cancelled or finished card does not start a drag |
| 4.4.2 | Grid eases, not collapses | Hour height goes to 180px, not 96px |
| 4.4.3 | Target highlights | The slot under the pointer takes `data-drop`, solid blue-400 edge, blue-50 fill |
| 4.4.4 | Pill follows | Reads "Move to 6:30 PM", or "No free slot here" off-target |
| 4.4.5 | Drop opens the drawer | Seeded to the dropped slot, correct day part, chip selected |
| 4.4.6 | Cancel restores | Escape or pointercancel restores the previous zoom and clears all highlights |

---

## 5. Book / Reschedule drawer — P3

| # | Case | Expected |
| --- | --- | --- |
| 5.1 | Titles and CTAs | Book: title "Book Appointment", CTA "Confirm Booking". Reschedule: "Reschedule Appointment" / "Confirm Reschedule" |
| 5.2 | Incomplete CTA speaks | Pressing it with no patient says "Choose a patient, or add a new one, before booking." Drawer stays open, nothing written |
| 5.3 | Missing-field order | Slot, then patient, then visit type, then tele availability |
| 5.4 | Reschedule shows the whole day | Count reads "N of M slots open"; taken slots `data-taken`, past `data-gone`, both disabled |
| 5.5 | Disabled tooltips | "That time has passed" / "Already taken" / "Not open for teleconsultation" |
| 5.6 | Day-part badges | Count only bookable slots; a part with none is disabled |
| 5.7 | Original marker | The appointment's current time is marked **only while still bookable** |
| 5.8 | Teleconsult default | Rescheduling a video appointment opens on Tele-Consultation |
| 5.9 | Patient locked | In reschedule the patient row is a disabled field with no Change |
| 5.10 | Result line | "Moving from 05:45 PM to 08:00 PM (12 Aug 26)", both dates shown when the day changes |
| 5.11 | Selected chip | Solid fill **and** a tick |

---

## 6. Add new patient — P3

| # | Case | Field | Input | Expected |
| --- | --- | --- | --- | --- |
| 6.1 | Blocking | Name | empty | "Add the patient's name so the record can be found later" |
| 6.2 | Blocking | Name | `John123` | "Names do not contain numbers. Remove the digits from the name" |
| 6.3 | Blocking | Name | `John@Doe#` | "Use letters only, with spaces, hyphens or apostrophes…" |
| 6.4 | Pass | Name | `Mary-Jane O'Neil` | No error |
| 6.5 | Blocking | Mobile | `98765` | "A mobile number is 10 digits. This one has 5" |
| 6.6 | Blocking | Gender | nothing selected | Clicking **Male first** selects Male (regression: it used to no-op) |
| 6.7 | Blocking | Age/DOB | both empty | "Add an age or a date of birth. Either one is enough" |
| 6.8 | **Advisory** | Email | `dfghykjlk` | Warning, **Save still allowed** |
| 6.9 | **Advisory** | Aadhaar | `12345` | "An Aadhaar number is 12 digits. This one has 5". **Save allowed** |
| 6.10 | **Advisory** | Pincode | `4567` | "A pincode is 6 digits. This one has 4". **Save allowed** |
| 6.11 | Multi-error toast | several blocking fields | "A few details still need your attention. The fields are marked below." |
| 6.12 | Single-error toast | one blocking field | The specific sentence for that field |
| 6.13 | Pincode autofill | `560001` | City and State populate; both disabled; hover explains |
| 6.14 | DOB → age | pick a DOB | Age fills. Typing an age must **not** fill the DOB |
| 6.15 | Section memory | collapse Address, reopen the drawer | Stays collapsed |
| 6.16 | Name prefill | search "Zzq Test" → Add new patient | Name field prefilled with the typed text |

---

## 7. API contract — P4

Assert on the wire, not the UI.

| # | Call | Assert |
| --- | --- | --- |
| 7.1 | `listAppointment` | Fires per tab change and per date change; `apStatue` matches the tab (Queue 0, Finished 3, Cancelled 4, Draft 6) |
| 7.2 | Week/Month range | Request span covers the whole visible window, not one day |
| 7.3 | `getSlotsList` | Fires once per `doctorId|date`; cached on revisit (no second request) |
| 7.4 | `rescheduleAppointment` | `PUT /api/v1/appointment/{pam_id}` with exactly `doctor_id`, `appointment_date`, `appointment_start_time` (HH:mm), `appointment_end_time`, `appointment_duration` |
| 7.5 | No duplicate write | A reschedule must produce **no** `addAppointment` and **no** `cancelAppointment` |
| 7.6 | Auth | Every request carries `Authorization: Bearer` |
| 7.7 | Failure handling | 4xx/5xx on any write surfaces a toast; no silent failure |

---

## 8. Touch and tablet — P4, unverified on hardware

| # | Case | Expected |
| --- | --- | --- |
| 8.1 | Tap opens | Tapping a card opens its popover pinned; it can be dismissed |
| 8.2 | No stuck hover | No hover state persists after a tap |
| 8.3 | Card does not block scroll | Dragging a finger across a card scrolls the day |
| 8.4 | Move flow | Tap card → **Move** → banner names the patient → tap a free slot → drawer opens seeded |
| 8.5 | Pinch zoom | Works on iPad Safari **and** Android Chrome |
| 8.6 | iPad mini portrait (744pt) | Toolbar wraps, week grid scrolls sideways, nothing clipped |
| 8.7 | Targets | Slots ≥30px, nav buttons ≥36px, tabs ≥44px |

---

## 9. Regression — P4

Because of the app-wide changes in [SCOPE.md § 3](SCOPE.md#3-everything-touched-outside-those-two-folders).

| # | Case | Expected |
| --- | --- | --- |
| 9.1 | Tesseract 1.1.0 | Spot-check other DS screens (LIMS, data-analytics) for visual regressions |
| 9.2 | Global status-glyph removal | InputBoxes elsewhere in the app no longer show the in-field error glyph. Confirm that is wanted |
| 9.3 | Global placeholder rule | Placeholders app-wide are regular weight, 14px, slate-400 |
| 9.4 | DataTable scroll veil | Other DataTables gained a left-edge gradient. Confirm intended |
| 9.5 | Legacy screen | The old appointment page still works and is unchanged |

---

## 10. Load and stress

Everything above tests a realistic day. This section tests an unreasonable one,
because the failure mode of a calendar is not "wrong", it is "unusable" — and
that only shows up under volume.

**These are the cases most likely to find something.** Nothing in this module
has been run against more than ~60 appointments.

### 10.1 Generating the data

Seed through the real booking API, not a fixture file: the point is to test the
mapping and rendering path the screen actually uses.

```
for each of N appointments:
  POST /api/v1/appointment  { doctor_id, patient_unique_id, pm_pid,
                              appointment_date, appointment_start_time,
                              appointment_end_time, appointment_duration,
                              toct_id }
```

Vary deliberately:
- **Overlap**: many appointments on the exact same `appointment_start_time`.
- **Near-overlap**: starts one minute apart inside the same slot.
- **Long names**: 120-character patient names, and names in Devanagari.
- **Long remarks**: 2,000 characters.
- **Spread**: some days empty, some days carrying the whole load.

Clean up afterwards — cancel everything the run created.

### 10.2 Cases

| # | Load | Where | Expected | Failure to watch for |
| --- | --- | --- | --- | --- |
| 10.1 | **500 in one day** | Day view | Renders; scroll stays smooth; overlapping cards lay out side by side | Cards stacked on top of each other and unreadable; frame rate collapse on scroll |
| 10.2 | **2,000 in one day** | Day view | Renders or degrades honestly. It must not white-screen | Browser tab hangs; React never commits |
| 10.3 | **50 at one identical time** | Day view | The overlap layout divides the column; each card stays clickable | Fifty cards at 2px wide; a card with no hit area |
| 10.4 | **50 at one identical time** | Week view | `stackForWeek` compacts the run and shows "+N more" | Run overflows its column into the next day |
| 10.5 | **1,000 across a month** | Month view | Each cell shows its cap and an accurate "+N more" | A cell claiming "+3 more" while clipping a fourth chip |
| 10.6 | **5,000 across a month** | Month → Week → Day | Switching views stays responsive | Multi-second freeze on every switch |
| 10.7 | **500 in a day** | Table view | DataTable paginates or virtualises; sort and filter still respond | Whole list rendered at once, scroll janks |
| 10.8 | **Overlapping + zoom** | Day view | Pinch/ctrl+wheel through the full 96–280px range under load | Layout thrash; cards detaching from their times |
| 10.9 | **Overlapping + drag** | Day view | Drag a card through a dense column; the drop target resolves correctly | Wrong slot highlighted; `elementsFromPoint` picking a card instead of the column |
| 10.10 | **120-char names** | All views | Truncate with ellipsis | Name wrapping and blowing out the row height |
| 10.11 | **2,000-char remark** | Table + popover | Table clamps to two lines; the popover wraps and scrolls | Popover taller than the viewport with no way out |
| 10.12 | **A month of full days** | Month, Show Slots on | Availability bars all read "Fully booked" | 40+ parallel slot requests stalling the page |
| 10.13 | **Rapid view switching** | Day↔Week↔Month, 20 times fast | No duplicate fetches, no stale render | Requests racing; a later view showing an earlier view's data |
| 10.14 | **Rapid date stepping** | Hold Next for 30 steps | Requests coalesce; the grid lands on the final date | A pile-up of in-flight requests committing out of order |

### 10.3 What to measure, not just observe

| Metric | Threshold | How |
| --- | --- | --- |
| Time to first render after a view switch | < 1s at 500 appointments | `performance.mark` around the switch |
| Scroll frame rate in Day view | ≥ 50fps at 500 | DevTools performance trace |
| Slot requests per month | ≤ 31 with Show Slots on, **0** with it off | Network panel count |
| Memory after 20 view switches | No monotonic growth | Heap snapshot before and after |
| Long tasks | None > 200ms | `PerformanceObserver` on `longtask` |

### 10.4 Known structural risks

Where a reviewer should look first if one of the above fails:

1. **Day/Week render every slot as a DOM node.** 188 blocks a day is fine;
   a week at full availability is ~1,300. There is no virtualisation.
2. **`resolveDrop` and `resolveHover` call `elementsFromPoint` per frame.**
   Cheap normally, but the returned stack grows with overlap depth.
3. **`useDoctorSlots` fetches per day.** A month with Show Slots on issues up
   to 31 pairs of requests. They are cached and committed incrementally, but
   the first paint of a fresh month is the worst case in this module.
4. **The month chip cap is measured, not assumed** (§ 4.1.3), so it is a
   correctness risk under odd row heights rather than a performance one.

---

## 11. For an agent building this suite

Suggested structure:

```
e2e/appointments/
├── fixtures/         auth token, a disposable test patient, a doctor with published slots
├── 00-smoke.spec     § 2
├── 10-table.spec     § 3
├── 20-calendar.spec  § 4
├── 30-booking.spec   § 1 + § 5
├── 40-patient.spec   § 6
├── 50-api.spec       § 7  (intercept, do not stub — this screen has no mock layer)
├── 60-touch.spec     § 8  (device emulation + real device run)
└── 70-load.spec      § 10 (seeds via the real API, cleans up after itself)
```

Rules for the agent:

1. **Never stub the backend.** The whole point of this build is that it reads
   live data. Intercept to assert, then let the request through.
2. **Assert on data attributes**, listed at the top of this file. Do not assert
   on hashed class names or on visual position.
3. **Write-path tests must clean up.** Cancel what they book.
4. **§ 1.4 gets its own guard**: fail the run if a reschedule ever produces more
   than one write request.
