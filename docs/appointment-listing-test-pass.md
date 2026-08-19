# Appointment listing — end-to-end test pass

Run against the live UAT backend (`pm-master-uat-webservice.tatvacare.in`) via
the local dev server. No mocks anywhere in this module.

Legend: **PASS** verified in the running app · **PASS (static)** verified by
reading code/config, not exercised · **N/T** not testable with current data.

---

## 1. Action wiring

| # | Scenario | Result |
|---|---|---|
| 1.1 | Every kebab/primary action id has a handler in `onRowAction` | **PASS** — 17 emitted ids, 17 handled, zero orphans |
| 1.2 | No handler exists without a caller | **PASS** — `join-video` is the only extra; emitted by the tooltip's Join button |
| 1.3 | Every `navigate()` target resolves to a declared route | **PASS (static)** — 9/9. `walk_in_consultation` is declared relative in `AppointmentList.js` |
| 1.4 | Drawer-opening actions map to a rendered drawer type | **PASS** — create-bill, advance-deposit, add-lab-results, create-certificate, end-visit |
| 1.5 | `reschedule` opens the booking drawer in reschedule mode, not a drawer type | **PASS** |
| 1.6 | `cancel-appointment` routes to the confirm dialog, then `ApiAppointments.cancelAppointments` | **PASS (static)** — not fired, to avoid mutating UAT data |

## 2. Table view

| # | Scenario | Result |
|---|---|---|
| 2.1 | All five tabs load | **PASS** — Queue, Finished, Cancelled, Draft, Pending Digitisation (25 rows) |
| 2.2 | Empty state renders when a tab has no rows | **PASS** — "No patients in queue" + Add Appointment CTA |
| 2.3 | Tab switch triggers a fresh `listAppointment` per status | **PASS** — captured 200s with correct `apStatue` per tab |
| 2.4 | Row kebab opens with the right options for the tab | **PASS** — Queue shows 8 incl. Reschedule; Draft adds Print Draft Rx |
| 2.5 | Console clean across all tab switches | **PASS** — zero errors |

## 3. Row action drawers

| # | Scenario | Result |
|---|---|---|
| 3.1 | Create Bill opens | **PASS** — renders with live balance (₹1200) |
| 3.2 | Advance Deposit opens | **PASS** |
| 3.3 | Add Lab Results opens | **PASS** |
| 3.4 | Create Certificate opens | **PASS** |
| 3.5 | End Visit opens | **PASS** |
| 3.6 | Each closes on Escape without leaking state | **PASS** |

## 4. Booking drawer

| # | Scenario | Result |
|---|---|---|
| 4.1 | Opens from a free slot with the right doctor/time summary | **PASS** |
| 4.2 | Patient search — idle state | **PASS** — "Start typing to see matching patients here." |
| 4.3 | Patient search — no match | **PASS** — "No match for "zzqqxxvv". Check the spelling, or add them as a new patient below." |
| 4.4 | Patient search — apostrophe (`O'Br`) does not error | **PASS** |
| 4.5 | Patient search — partial number (`98`) returns live results | **PASS** |
| 4.6 | Remarks accepts quotes, commas, semicolons, angle brackets | **PASS** |
| 4.7 | Remarks accepts Unicode (Devanagari) | **PASS** |
| 4.8 | Remarks accepts whitespace-only and empty | **PASS** |
| 4.9 | Consultation mode disables Tele when the slot is in-clinic only, with a reason | **PASS** |
| 4.10 | Drawer width is 50% of viewport | **PASS** — 640px at 1280px |
| 4.11 | Submitting a booking | **N/T** — would create real UAT data |

## 5. Reschedule

| # | Scenario | Result |
|---|---|---|
| 5.1 | Opens from the kebab in reschedule mode | **PASS** — header reads "Reschedule Appointment" |
| 5.2 | Date chips render a forward window | **PASS** — Today, Tmrw, then named days |
| 5.3 | Remarks behaves as in booking | **PASS** |
| 5.4 | Committing a reschedule | **N/T** — would mutate UAT data |

## 6. Calendar view

| # | Scenario | Result |
|---|---|---|
| 6.1 | Day renders grid + slots | **PASS** — 194 slots |
| 6.2 | Week renders 7 day heads | **PASS** — 1340 slots |
| 6.3 | Month renders a 42-cell grid | **PASS** |
| 6.4 | Returning to Day restores state | **PASS** |
| 6.5 | Past dates show every slot as past, none bookable | **PASS** — 11 Aug: 182 slots, 0 free |
| 6.6 | Today/future dates expose bookable slots | **PASS** |
| 6.7 | Date syncs both ways with the toolbar picker | **PASS** — stepping the calendar moved both to `20 Aug 2026` |
| 6.8 | Clear resets both controls | **PASS** — both return to "Today" |
| 6.9 | `.ics` export produces valid iCalendar | **PASS** — captured file, correct folding/escaping |
| 6.14 | Export carries only the agreed fields | **PASS** — verified on a real exported file: patient ID, age/sex, visit, category present; contact number, remarks and billing absent |
| 6.10 | Card tiers adapt to measured width | **PASS** — 217px stacks, 273px inline, 1105px full |
| 6.11 | Overflow `+N` chip jumps to the earliest hidden appointment | **PASS** |
| 6.12 | Tooltip opens, flips above/below, pins on click | **PASS** |
| 6.13 | Console clean across all view switches | **PASS** |

## 7. Card CTA on tinted backgrounds

| # | Scenario | Result |
|---|---|---|
| 7.1 | CTA renders white on every state tint | **PASS** — `rgb(255,255,255)` bg, blue-700 text, blue-200 border |
| 7.2 | Body content never overlaps the trailing cluster | **PASS** — body right edge 1070px, trail left edge 1078px |
| 7.3 | Remark truncates with full text on hover | **PASS (static)** — bounded 40–340px with `title`; no remark-bearing card in current data |

## 8. Backend wiring

| # | Scenario | Result |
|---|---|---|
| 8.1 | `listAppointment` live | **PASS** — 19 calls, all HTTP 200 / `status:true` |
| 8.2 | `listSlots` live (in-clinic + teleconsult) | **PASS** — 54 calls, all 200 |
| 8.3 | `listCasetype` live | **PASS** |
| 8.4 | `undigitizedAppointments` live | **PASS** |
| 8.5 | No mock, stub or fixture layer in the module | **PASS** — grep for stubs/TODO/hardcoded returns found none |
| 8.6 | Export menu present in both table and calendar views | **PASS** — toolbar order: date, filter, overflow |

## 9. Feedback on dead clicks

| # | Scenario | Result |
|---|---|---|
| 9.1 | Past slot click | **PASS** — "Can't book 12:00 AM, that time has passed." |
| 9.2 | Blocked slot click | **PASS (static)** — no `unavailable`/`leave` slot in the doctor's current schedule to exercise |
| 9.3 | Next-day on a non-Queue tab | **PASS** — "Only Queue shows future dates." |
| 9.4 | Date picker on Pending Digitisation | **PASS (static)** — wrapper toast; picker is `disabled` so the click never reaches it |
| 9.5 | Toast enters from above, exits upward | **PASS** — `toastDropIn` 220ms in, `toastLiftOut` 180ms out |
| 9.6 | Event tooltip shares the same downward gesture | **PASS** — `popIn` 180ms |
| 9.7 | Both honour `prefers-reduced-motion` | **PASS (static)** |

## 10. Queue-only export

| # | Scenario | Result |
|---|---|---|
| 10.1 | Export ships the queue regardless of active tab | **PASS** — run from the Cancelled tab, produced 2 queue events, all `STATUS:CONFIRMED` |
| 10.2 | Filename format | **PASS** — `TatvaPractice Queue (11 Aug 2026).ics` |
| 10.3 | Empty queue is explained, not a silent no-op | **PASS** — "No queued appointments to export for this date." |
| 10.4 | Menu label carries the queue count | **PASS** — `Download Queue (.ics) · 2` |

## 11. View-state persistence

| # | Scenario | Result |
|---|---|---|
| 11.1 | Calendar view survives a full reload | **PASS** — restored `calendar` |
| 11.2 | Day/Week/Month survives a full reload | **PASS** — restored `Week` |
| 11.3 | Restored view brings its natural tab | **PASS** — calendar restored with the All tab |
| 11.4 | Corrupt/stale stored value falls back safely | **PASS (static)** — values validated against an allow-list |
| 11.5 | Storage-disabled browsers do not break the page | **PASS (static)** — reads/writes wrapped |

## 12. Calendar window, caching and positioning

| # | Scenario | Result |
|---|---|---|
| 12.1 | Week/Month load their whole span of appointments, not just the anchor day | **PASS** — Month shows 56 across the grid where it previously showed the anchor day's 2 |
| 12.2 | Switching Day → Week shimmers, then fills column by column | **PASS** — 168 placeholders at 156ms, 84 left at 609ms, 0 at 1270ms |
| 12.3 | Returning to a view already visited is instant | **PASS** — Day → Week again: 1344 slots, 0 shimmer, at 120ms, no network |
| 12.4 | Clicking a month day opens it scrolled to its first appointment | **PASS** — 11:48 AM day opened at scrollTop 3164 (11:18 AM), card in view |
| 12.5 | A day with no appointments still opens sensibly | **PASS (static)** — falls back to now (today) or 8 AM |
| 12.6 | Cached availability re-derives "has this time passed" on read | **PASS (static)** — `withFreshPast` on every cache hit |
| 12.7 | Pending Digitisation shows the table without moving the view toggle | **PASS** — toggle stays on calendar, body renders rows, leaving restores the grid |

## 13. Week density and drill-down

| # | Scenario | Result |
|---|---|---|
| 13.1 | Overlapping appointments stack as compact rows in Week | **PASS** — 19 chips at 26px, `data-compact` set |
| 13.2 | A run deeper than the band caps with `+N more` | **PASS** — "+3 more" rendered |
| 13.3 | `+N more` opens that day in Day view | **PASS** — Week → Day on 11 Aug, scrolled to the 11:11–11:25 cluster |
| 13.4 | Clicking a week day head opens Day view | **PASS** |
| 13.5 | Chip drops the meridiem so the name survives | **PASS** — "9:00 Skmjs", "9:25 Sheela" (was "09:00 AM S…") |
| 13.6 | Week free-slot label keeps the video glyph visible | **PASS** — plus at 14px, glyph pinned right |
| 13.7 | Day head reads as a title, with a Today chip | **PASS** — "Wednesday, 12 August · Today"; "Tuesday, 11 August" with no chip |

## 14. Add New Patient drawer

| # | Scenario | Result |
|---|---|---|
| 14.1 | Drawer is 80% of the viewport | **PASS** — 750px of 938px |
| 14.2 | 18px padding inside sections and between them | **PASS** — body 18px, section body 18px, gap 18px |
| 14.3 | Field hairline is 1px, not the DS 1.5px | **PASS** — `1px rgb(226,226,234)` |
| 14.4 | Card stroke is neutral, not blue | **PASS** — slate-200, faded down the sides |
| 14.5 | DOB popover escapes the section card | **PASS** — popover bottom 792 vs card bottom 415 |
| 14.6 | Typed search text prefills the name | **PASS** — "Anjali Verma" |
| 14.7 | Confirm/Reschedule summary reads as two disabled field rows | **PASS** — 42px, no border, slate-50, radius-10 |

## 15. Design-system conformance

Every form control on the page and its sidebars now comes from
`@dhspl-tatvacare/tesseract-ui` rather than being rebuilt to look like it.

| Control | Was | Now |
|---|---|---|
| Toolbar search | raw `<input>` + absolute icon | `InputBox` (leftIcon, clearable, 38px) |
| Patient search | raw `<input>` + absolute icon | `InputBox` |
| Booking remarks | raw `<textarea>` | `InputBox autoGrow` |
| End-visit reason | raw `<textarea>` | `InputBox autoGrow` |
| Salutation | raw `<select>` styled as an addon | `InputBox leftAddon={{type:"select"}}` |
| Mobile prefix | custom chrome span | `InputBox` text add-on (glyph + `+91`) |
| Age years/months | bespoke split control, 2 bare inputs | two `InputBox` with `unit` |
| Date of birth | first-party MiniDatePopover | `DatePicker` |

Still first-party by necessity: the avatar dropzone (no upload component
exists), and the calendar's own affordances — slot blocks, event cards, day
heads, `+N` chips — which are positioned geometry, not form controls.

| # | Scenario | Result |
|---|---|---|
| 15.1 | Focus ring reaches every field in the patient drawer | **PASS** — border blue-500, 3px ring; the 1px override no longer sets colour |
| 15.2 | Blood group opens without throwing | **PASS** — 8 options, 0 errors |
| 15.3 | Blood group labels match the legacy screen | **PASS** — "A+ (A Positive)" |
| 15.4 | Add-new-patient action leads the results list | **PASS** — order: action, then hint/results |
| 15.5 | Action text is blue, typed text bolder blue | **PASS** — blue-500/500, blue-700/600 |
| 15.6 | Unit suffixes read as chrome, not data | **PASS** — slate-400, weight 400 |
| 15.7 | Drawer grows as the viewport narrows | **PASS** — 96% at 938px, floor 1020px |

**Fixed here:** the blood-group dropdown crashed the whole drawer. The
options were built from a `tbg_name` field that `showBloodGroup` does not
return — it sends `{bg_value, bg_title}` — so each option was the raw object
and React threw "Objects are not valid as a React child". `LimsPatientForm`
carries the identical line and the same latent crash.

## 16. Add New Patient validation

| # | Scenario | Result |
|---|---|---|
| 16.1 | Leaving mobile with fewer than 10 digits marks the field | **PASS** — `data-status=error`, red border + glyph, helper "Enter a valid 10-digit mobile number" |
| 16.2 | Save with missing required fields raises a toast | **PASS** — "3 fields need attention. Enter a valid 10-digit mobile number." |
| 16.3 | Every failing field enters its error state together | **PASS** — mobile, gender and age all marked at once |
| 16.4 | Messages use the design system's own error tone | **PASS** — all three at `error-600` (200,16,46), matching the DS helper |
| 16.5 | Gender shows no selection until one is made | **PASS** — indicator at opacity 0, hairlines between the three |
| 16.6 | An unanswered gender takes a red edge | **PASS** — 1px `error-500` ring plus its own message |
| 16.7 | Typing in a field clears its error | **PASS (static)** — `set()` clears the key on change |
| 16.8 | Save focuses and scrolls to the first failing field | **PASS (static)** — `data-field` anchors |
| 16.9 | Date of birth commits on outside-click, no Apply needed | **PASS** — picked 7, clicked away, field read "07 Aug 2026" |

## 17. Table columns

| # | Scenario | Result |
|---|---|---|
| 17.1 | Patient ID is its own column between Contact and Visit Type | **PASS** — `# · Name · Contact · Patient ID · Visit Type · Slot · Remarks · Action` |
| 17.2 | A long ID wraps rather than truncating mid-value | **PASS (static)** — bounded 120–180px, clamped to 2 lines |

## 18. Design-system conformance — final sweep

| # | Scenario | Result |
|---|---|---|
| 18.1 | No raw `<input>` / `<textarea>` / `<select>` in either module | **PASS** — grep clean |
| 18.2 | Tab bars are the DS `Tabs` | **PASS** — page tabs and drawer day-parts, `role="tab"` |
| 18.3 | Status chips are the DS `Badge` | **PASS** — `variant="soft"`, semantic colour per tone |
| 18.4 | Row links are the DS `Button` | **PASS** — patient name `variant="link"`, clear-filters `ghost` |
| 18.5 | No raw hex in any module stylesheet | **PASS** |
| 18.6 | No raw `rgba()` — all `color-mix` | **PASS** |
| 18.7 | No raw font sizes or radii | **PASS** — only `font-size: 0` (hidden glyphs) and intentional `0` radii |
| 18.8 | Lint clean | **PASS** — 0 errors, 0 warnings |

**Fixed here:** `PatientForm.module.css` referenced `var(--tesseract-red-500, …)`
twice. That token does not exist in the ramp, so the required asterisk and
the remove-photo button were falling through to a hardcoded hex instead of
the error tone. Both now use `--tesseract-error-500`, and every other hex
fallback was stripped for the same reason: a fallback on an always-present
token only hides the day it goes missing.

**Deliberately first-party:** 17 buttons in the calendar — slot blocks, day
heads, `+N` chips, month cells, nav chevrons, the now-chip — plus the event
card and the drawer's search-result rows. These are absolutely-positioned
geometry sized from `minPx` against a time axis, or two-line composite rows.
A DS `Button` carries a fixed height, padding and radius, which is the one
thing they cannot have. Converting them is a design-system request (a slot /
event primitive), not a page change.

---

## Findings

**Fixed during this pass**
1. CTA on tinted cards was using the DS outline button's own 4%-tinted fill,
   invisible against the card wash. Now explicitly white.
2. Card body could grow under the trailing cluster. `.line` and `.sub` now
   clip, and the remark is bounded 40–340px.
3. Patient result meta used a `·` between contact and ID; now the hairline
   divider used elsewhere.
4. Past and blocked slots were `disabled` buttons, so the click was swallowed
   and nothing could ever explain the refusal. Now `aria-disabled`, clickable
   only to raise a toast.
5. `.moreCount` lost its colour to the page's legacy
   `:where(span, div, …) { color: inherit }` reset — the same specificity trap
   that had already silently greyed the gutter labels. Scoped under
   `.monthCell`.

**Recurring trap worth knowing**
The page carries a legacy global reset, `.page :where(span, div, p, …) {
color: inherit }`. It has the same specificity as a single-class selector and
wins on source order, so **any new single-class colour rule on this page will
silently lose**. Scope such rules under a parent (e.g. `.monthCell .x`,
`.hourGutter .x`). This has now bitten three times.

**Pre-existing, not introduced here, not fixed**
* `LabResultsTable` (Add Lab Results) emits `validateDOMNesting` warnings —
  `<div>` inside `<table>`/`<tbody>` — and missing `key` props. Legacy
  component, outside this module.
* Ant Design deprecation warnings (`bodyStyle`, `bordered`) from the legacy
  drawers.
* `EnvironmentConfig.js` has duplicate keys (`tatvaRedirect`, `gynec_api_url`,
  `obstetric_api_url`) in two env blocks.

**Not covered**
* Any flow that writes to UAT: confirming a booking, committing a reschedule,
  cancelling, ending a visit. All verified up to the point of submission only.
* Teleconsultation Join — no video-enabled appointment in the current window.
