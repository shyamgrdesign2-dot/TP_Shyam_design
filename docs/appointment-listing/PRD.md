# Appointment Listing — product requirements

Route `/appointments-x` · replaces the legacy appointment screen · design system: Tesseract 1.1.0

---

## 1. Problems this solves

1. **Doctors cannot see their full schedule in one place.** The appointment
   screen is a single-day table, so answering "what does my week look like?"
   means stepping through dates one at a time and holding the answer in your
   head.

2. **Doctors cannot tell free time from busy time at a glance.** The table
   lists what is booked. It never shows what is open, so planning where a
   patient could go means leaving the screen for a separate slot page.

3. **Moving an appointment is not a move.** Rescheduling meant cancelling the
   old appointment and booking a new one: two writes, a window in which the
   patient held two appointments, and a new appointment id that broke anything
   referencing the original.

4. **Appointment states are not visually distinguishable.** Queue, finished,
   cancelled and draft appointments read the same on the grid, so a cancelled
   visit and a live one look alike until you read the row.

5. **Creating a patient interrupts booking.** A walk-in whose record does not
   exist yet meant abandoning the booking, going to another screen, and
   starting again.

## 2. What was built

Five things, in one page.

| # | What | Was | Is |
| --- | --- | --- | --- |
| 1 | **Table view** | The legacy appointment table | Rebuilt on Tesseract: DS DataTable, tabs, filters, per-row actions. Same job, same buckets, new foundation. Adds a Patient ID column and a teleconsult popover |
| 2 | **Calendar view** | Did not exist | Day / week / month schedule with the doctor's own availability drawn under the appointments, zoom, and drag-to-reschedule |
| 3 | **Confirm Appointment drawer** | A separate page | A side drawer: mode, doctor, slot, patient search, visit type, remarks |
| 4 | **Reschedule drawer** | Cancel + rebook | The same drawer in move mode, with its own date and slot picker, committing as one `PUT` |
| 5 | **Add New Patient drawer** | A separate page | A side drawer opened from the patient search, prefilled with what was typed |

Everything is Tesseract, and everything reads production APIs. There is no mock
data in this module.

## 3. The two views

One page, one data source, two renderings. A toggle in the banner switches
between them and the choice is remembered per browser.

### 3.1 Table view

The working list. Columns: index, name, contact, **Patient ID**, visit type,
slot, remarks, actions.

- **Tabs** — Queue, Finished, Cancelled, Draft, Pending Digitisation. Each
  carries a live count.
- **Pending Digitisation is an all-time worklist**, not a schedule. Its date
  control reads "Till date", not "Today", because the list reaches back years.
- Patient name opens the patient; the row kebab carries the per-status actions
  (Patient Details, Reschedule, Create Bill, Advance Deposit, Add Lab Results,
  Cancel, Create Certificate, End Visit).
- The teleconsult marker is a **popover, not a menu item**: it shows who the
  call is with and when, then offers Join. Joining starts the call; it does not
  navigate to the prescription page.

### 3.2 Calendar view

The schedule. Day, Week, Month, on a 24-hour grid.

- **All** is the default tab and merges Queue + Finished + Cancelled + Draft,
  because a schedule is the whole day, not one status of it.
- **Colour is state**: blue in queue, green finished, red cancelled, amber
  draft. A legend under the grid says so, and the teleconsult marker takes the
  same colour as the card it sits on.
- **Show Slots** draws the doctor's own availability under the appointments.
  On by default. Turned off, hovering the grid reveals only the one slot under
  the pointer, so the day can still be probed without being filled.
- **Zoom**: trackpad ctrl+wheel, iPad pinch, Android pinch. An hour ranges from
  96px to 280px.
- **Drag to reschedule** (pointer devices): the grid eases out, the target slot
  highlights, a pill names the time, and release opens the reschedule drawer
  seeded to that slot.
- **Tap to move** (touch devices): tap the card, tap **Move**, tap the
  destination. See § 6.

## 4. Booking and rescheduling

Both run through one drawer, in two modes.

### 4.1 Book

Reached by clicking a free slot on the grid.

1. **Mode** — In-clinic or Tele-Consultation, as a segmented control at the top,
   because it filters every field beneath it.
2. **Doctor and slot**, stated read-only.
3. **Patient** — search by name, phone or ID; or add a new one inline (§ 5).
4. **Visit type** (required) and **category**.
5. **Remarks**, free text, four lines minimum.

The CTA stays live even when the form is incomplete: pressing it names the one
thing that is missing rather than doing nothing.

### 4.2 Reschedule

Reached from the row kebab, from a drag-drop, or from **Move** on touch.

- Opens on its own **date + slot picker** under one heading, "New date & time
  slot".
- The **whole published day** is shown. Slots that are taken or past are drawn
  greyed and unclickable, so a 4 PM reschedule reads "1 of 20 slots open"
  rather than showing a single lonely chip.
- The patient is **stated, not offered** — rescheduling moves a slot, it does
  not reassign the appointment.
- A teleconsult appointment reopens on Tele-Consultation.
- The result is restated below the picker: *Moving from 05:45 PM to 08:00 PM
  (12 Aug 26)*.
- **It is one write.** `PUT /api/v1/appointment/{pam_id}` moves the appointment
  in place, preserving its id, its patient and its visit type.

## 5. Add new patient

A drawer, reachable from the patient search when nothing matches. The typed
text prefills the name.

Three collapsible sections: Personal Details, Additional Details, Address. The
last two remember how the doctor left them.

**Validation is in two tiers, and the distinction matters:**

| Tier | Fields | Behaviour |
| --- | --- | --- |
| **Blocking** | Name, mobile, gender, age-or-DOB | Save is refused, the field is marked, one sentence says why |
| **Advisory** | Email, Aadhaar, pincode | Warned, **not blocked** — they are optional, and a doctor who wants it saved as typed gets to save it |

Messages are written to be repaired, not obeyed. Where a field has a fixed
length the line counts for you: *"An Aadhaar number is 12 digits. This one has
5."* Names reject digits and symbols with their own separate lines.

Pincode fills City and State; both are disabled and say so on hover.

## 6. Touch and tablet

Designed from what a finger can actually do, not by shrinking the desktop.

A touch on a card has to serve three intents — scroll the day, open the
appointment, move it — and there is only one finger. **Tap means open**: it is
the most frequent, the least destructive, and it is what tap means everywhere
else in the app. That leaves scroll and move contesting press-and-drag, and
**scroll already owns it**.

So **touch does not drag**. Tap opens the card, the card offers **Move**, and
every free slot becomes a tap target. Two taps, nothing hidden, no timing, no
precision, and the destination stays visible because nothing is under the
finger. Drag remains for mouse and pen, gated on `(hover: hover) and
(pointer: fine)`.

Also: hover states are suppressed where there is no pointer, targets grow on
coarse pointers, and the week grid scrolls sideways below 834px rather than
crushing seven columns into a portrait iPad.

## 7. Date semantics

The date control names **the window on screen**, not one day inside it — the
same contract Google Calendar and Teams use.

| View | Picker mode | Reads |
| --- | --- | --- |
| Day | single date | "Today" |
| Week | range, whole week selected | "10 Aug 2026 – 16 Aug 2026" |
| Month | month picker | "Aug 2026" |

Picking a date jumps to the period containing it. The toolbar picker and the
calendar's own picker are two views of one value and always agree.

## 8. Non-goals

- **No mock data, ever.** Every number on this screen came from an API.
- No offline mode. No bulk actions. No multi-doctor schedule.
- Pending Digitisation has no calendar rendering; selecting it borrows the
  table and leaving it restores the calendar.
