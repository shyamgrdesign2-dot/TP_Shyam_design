# Appointment Listing V2 — UI Fixes & Polish

A round of doctor-facing UI work on the new appointment listing page (`/appointments-x`):
the calendar view, the date control, the add-patient form, table typography, and the
page header. This doc explains what changed, why, how it was verified, and what dead
code is worth cleaning later.

- **Branch:** `fix/appointment-v2-ui-fixes` (base: `prod`)
- **Compare / open PR:** https://github.com/DHSPL-Tatvacare/Pm-Doctor-Portal/compare/prod...fix/appointment-v2-ui-fixes

### Commits

This branch carries two commits:

1. `509d2239f` — **fix(appointments): calendar view, add-patient form, and banner CTA consistency** *(earlier today)* — the first pass: tab reorder, calendar restructure, the unified date pill, empty-state and hero fixes, add-patient DOB fix, and the app-wide "Tutorial" label tidy.
2. **This commit** — **fix(appointments): date-pill Today action, calendar header + table typography, tab-bar scroll cue** *(the round documented here; its hash prints under `git log origin/prod..HEAD` on the branch).* — the polish pass: shared control-height token, Today footer, DOB declutter, table two-tier typography, calendar header/scrollbar, the tab-bar overflow fade, and the code-quality/perf fixes.

## Build status

Production build passes: `NODE_OPTIONS=--max-old-space-size=8192 npx craco build` → **exit 0,
compiled with warnings only**. Every warning is third-party (`@ricky0123/vad-*` source maps)
or a pre-existing eslint hint. **No errors, no warnings from the appointment or add-patient
code.** eslint on the touched files is clean.

## Change count

| | |
|---|---|
| Files changed | **30** |
| Lines added | **1,466** |
| Lines removed | **508** |
| Net | **+958** |

The bulk sits in five files (the page, its two views, and their stylesheets). The rest are
one- to three-line ripple changes across shared components (a global "Tutorial" label tidy,
a banner icon tint) that rode along with the same branch.

## Follow-up fixes (responsive polish)

A later pass on smaller-screen behaviour and one CTA consistency bug:

- **The week fits its seven columns in the card — it shrinks, it does not scroll.**
  The earlier build gave the slot chip a 120px minimum width, so narrow week columns
  overflowed and clipped the time + mode icon. Now each week day column is a CSS
  size container, and the slot chip sheds detail in tiers keyed on its own column
  width (not the viewport). The **time is kept longest** — it is what a doctor most
  needs — and the clinic/video mode glyph is dropped first, because the lane already
  implies the type and every slot carries a native tooltip ("Book in-clinic 10:15 AM")
  that names it exactly on hover / long-press. Order of loss as a column narrows:
  mode glyph → "+" → time-to-tooltip. Tablet and desktop show all seven columns with
  no horizontal scroll; only a phone-width week scrolls sideways (a 520px floor), with
  slots degraded to their dashed "open" outline plus the tooltip.
- **AM/PM always shows on a slot time.** The meridiem is never stripped — a bare
  "10:15" on a 24h-ambiguous grid is a booking hazard.
- **Week header "+N" chip no longer collides with the date.** The count of
  appointments outside the visible hours sat absolutely over the date numeral, which
  on a phone-width column (~64px) landed on top of it. The header column is now a size
  container too, and the chip drops at phone width (content-box < 58px) while tablet
  (~91px columns) keeps it; tapping the day header still drills into Day view where
  those appointments show in full.
- **Calendar chrome.** Top corner radius eased 16 → 12; edge scroll-fades on both
  sides of the week grid (it auto-scrolls to today, so hidden days can be to the left
  or right) that square the card's top corners when days are off-screen; the calendar
  scrollbar is hidden (it still scrolls, the bar just doesn't reserve a gutter).
- **ResizeObserver dev-overlay noise silenced.** The benign "ResizeObserver loop
  completed with undelivered notifications" browser warning (which CRA's dev overlay
  treats as fatal) is suppressed, and the grid's own observers set up synchronously so
  the edge fades seed correctly even when the tab is unfocused (rAF is paused there).
- **Tab bar bleeds to the card edge.** When the tabs overflow, the right padding is
  dropped so the last tab runs to the very edge of the card (no white gutter cutting
  it short), and the fade sits flush at that edge.
- **Tab fade is now a white dissolve**, not a grey shadow — the last tab fades into the
  card's own white, a cleaner "scroll for more" cue than a shadow smudged over the text.
- **Hero CTA weight fixed.** "Book Appointment" / "Start Walk-In" hard-coded
  `font-weight: 600`, which diverged from the app-wide button weight after it was
  changed centrally. They now inherit the design system button weight (semibold token),
  so they match the same button on every other page.

## Pre-ship QA pass (code quality + responsive audit)

A final review before the production build, driven live at desktop, tablet and mobile:

- **Memo-defeat in `useListingAccess` fixed (real perf bug).** `finishedData` was
  `useSelector(...) || []`, minting a fresh `[]` every render. That changed the
  `finishedEncounterIds` memo's dependency identity each render, which re-minted the
  *entire access object* the hook returns — and that hook runs on the page, every row,
  and the calendar popover. It now falls back to a stable `EMPTY_FINISHED` constant, the
  same fix already applied to `AppointmentListView`'s `EMPTY_ROWS`.
- **Dead `showLabel` / `showHelper` props removed.** They were passed to the design
  system `InputBox` (page toolbar search + booking-drawer search) but the component has
  no such props, so React forwarded them to the DOM `<input>` and logged a repeating
  "React does not recognize the prop" warning on every render. Removed; the field is
  unchanged (it never rendered a label anyway).
- **Responsive audit.** Desktop / tablet / mobile checked in both list and calendar
  views: no page-level horizontal overflow, no ResizeObserver overlay, the week header
  overlap above is the one defect it surfaced (now fixed). One **pre-existing** item is
  left for a separate change: on a 375px phone the two banner CTAs ("Book Appt" +
  "Start Walk-In") total wider than the viewport and clip at the right edge (an ancestor
  clips them, so the page itself never scrolls sideways). It lives in shared banner
  layout and is unrelated to this work.

## What changed, in plain terms

**The date control.** One pill, `‹ date ›`, with the arrows living inside the same box as the
date. Clicking the date opens the picker; the arrows step a day. It shows a single, universal
format — "Today" / "Yesterday" / "Tomorrow" near the current day, then "Sat, 29 Aug", and a
preset's own name ("Past 7 days") when one is chosen. In the table it selects a date **range**
with quick presets; in the calendar it selects **one day**. Picking a preset or a single day
commits and closes in one click — no Apply step for the common case.

**"Today" in the calendar picker.** The single-date picker has one footer action: a plain,
centered **Today** link that jumps the selection back to the current day from any month and
closes. Cancel and Apply are hidden there (a day click already commits). This is scoped to
this one picker so it never touches the add-patient date field.

**Calendar view.** The old in-grid header row (Day/Week + Show Slots) moved out: Day/Week now
lives in the page toolbar, and Show Slots + the legend sit in the bottom bar. The column header
rail is a calm 48px grey band (matching the table's own column header), with the date numeral
sized down so it reads as a column head, not a headline. The selected day's column lifts out in
a light-blue wash. The scrollbar is hidden in the calendar (it scrolls; the bar just doesn't
show).

**Table typography.** Clear two-tier hierarchy in every cell: the primary line (name, contact,
patient ID, visit type, **slot time**) is near-black; the subtext beneath it (gender/age, date,
specialty) is one size smaller and a lighter slate. The slot time is no longer blue — it reads
as primary data like the rest of the row.

**Header.** A time-aware greeting, "Good evening, Dr. {first name}". The greeting always stays;
on a narrow screen only the name ellipsizes (never the greeting), and the primary button
shortens to "Book Appt". Every control in the toolbar (search, Day/Week, date pill, filter,
kebab) is held to one shared height via a single token, so the row lines up in both views.

**Tab bar.** When the tabs are wider than the card (narrow screens / many tabs), a soft
right-edge fade appears over the last visible tab as the "more tabs this way" cue, and clears
once the strip is scrolled to the end. The table and calendar grids do **not** carry this fade
(by design — it lives only on the tab strip).

**Add-patient Date of Birth.** Decluttered to one footer action (Clear, centered); Cancel and
Apply are dropped, and clicking a day commits the date and closes. Scoped to this field's own
popover.

**Empty states.** Every status tab's empty state fills the table body and centers vertically,
instead of sitting at a fixed height near the top.

## File-by-file

| File | Why it was touched |
|---|---|
| `src/pages/appointment-listing/AppointmentListingPage.jsx` | The page shell: unified date pill + universal format, instant-commit interception, calendar Day/Week mode sync, "Today" footer wiring, time-aware/responsive greeting, shared control-height, filter badge, tab-bar overflow-fade detection. |
| `src/pages/appointment-listing/AppointmentListingPage.module.css` | Toolbar control-height token, tonal date pill + filter, `.dayPopover` Today-footer restyle, tab-bar fade, header/alignment, empty-state fill, hero-ray overflow fix. |
| `src/pages/appointment-listing/components/AppointmentCalendarView.jsx` | Removed the in-grid header, added Day/Week mode sync (`onModeChange`), single-day selection model, dead-code cleanup (unused imports, hoisted constants). |
| `src/pages/appointment-listing/components/AppointmentCalendarView.module.css` | 48px grey column-header rail, smaller date numeral, selected-column wash, month-header parity, scrollbar hidden. |
| `src/pages/appointment-listing/components/AppointmentListView.jsx` | Empty-state CTA copy; stable `EMPTY_ROWS` constant (perf, see below); removed a redundant hook dep. |
| `src/pages/appointment-listing/components/AppointmentListView.module.css` | Two-tier cell typography (primary near-black, subtext lighter/smaller), slot time de-blued, empty-state height. |
| `src/pages/add-patient/PatientForm.jsx` | DOB picker decluttered: `applyDob` extracted, day-click commit interception, popover tagging. |
| `src/pages/add-patient/PatientForm.module.css` | `.dobPopover` footer restyle (Clear only, centered). |
| `src/pages/appointment-listing/components/AppointmentEventCard.jsx` / `.module.css` | Calendar event-card consistency (committed). |
| `src/pages/appointment-listing/components/BookAppointmentDrawer.jsx` | Booking-drawer consistency (committed). |
| `src/pages/appointment-listing/data/appointmentsConfig.js` | Tab order: Queue, Draft, Finished, Cancelled. |
| `src/pages/appointment-listing/data/viewPreferences.js` | Persisted list/calendar + day/week preference. |
| `src/index.css` | Portaled-popover theme fixes (DatePicker / menus rendered under `<body>`). |
| `src/common/*`, `src/components/*`, `src/pages/{MessageCreateCampaign,addAppointment,...}` | One-line ripple: dropped the "Tutorial" text label (icon-only) across shared headers, and a banner credit-icon tint. Committed with the branch; unrelated to the appointment listing itself. |

## Performance notes

The code is efficient; nothing here is a runtime hot spot. Specifics:

- **Fixed a real memo-defeat bug.** `AppointmentListView` derived `zydusAppointmentData` as
  `useSelector(...) || []`, minting a fresh `[]` every render, which changed the columns
  `useMemo`'s dependency identity and made it recompute on **every** render. Now it falls back
  to a stable `EMPTY_ROWS` constant, so the memo holds.
- **Stable constants.** Month layout constants were hoisted to module scope (no per-render
  allocation, stable identity for the fit calc).
- **Listeners are cheap.** The instant-commit interceptions (date pill, DOB) are capture-phase
  document click listeners that early-return the instant a click isn't inside their own popover;
  the DOB one only mounts with the add-patient form. Scroll listeners are `passive`. Two small
  `ResizeObserver`s (tab-fade, calendar column width). No timers or polling are left running.

## Line-count assessment

+958 net is proportionate to the surface area (a bespoke date-pill system, calendar Day/Week
mode + single-day model, instant-commit, the Today action, DOB declutter, tab fade, responsive
header, two-tier table typography). The functional JS is tight. The one place lines could be
trimmed is CSS **comment density** — the stylesheets carry thorough design rationale in prose.
That aids maintenance but does inflate the line count; it is a style choice, not dead weight.

## Dead code — cleanup candidates (highlighted, NOT removed)

Confirmed unused (zero `styles.*` references, verified against the JSX). Left in place for the
team to remove at its discretion:

**`AppointmentCalendarView.module.css`** — leftovers from the removed in-grid calendar header
and the removed legend refresh icon:

| Selector | Lines | Note |
|---|---|---|
| `.header`, `.header[data-scrolled]` | 33–69 | removed header band |
| `.navGroup` | 71–75 | |
| `.headerRight` | 77–91 | |
| `.navBtn`, `.navBtn:hover` | 158–175 | |
| `.datePick` + subrules | 178–215 | old in-header date trigger |
| `.granularity` + subrules | 97–108, 341–349 | ⚠️ the rule at **97–101 is shared with `.availabilityToggle`**, which is still live in the legend — split it, don't delete the whole block |
| `.legendRefresh` + subrules | 1563–1593 | refresh icon was removed from the legend |

**`AppointmentListView.module.css`** — `.tagRow` is defined but never referenced.

Removing these (roughly ~180 lines, minus the one shared-rule split) is safe and would cut the
diff, but is intentionally deferred so a developer can confirm and do it in a focused change.

## How it was verified

Driven in the live dev server (`npm run start:dev`, port 3007) at desktop and narrow widths:
list + calendar render, tab order, empty-state centering, date-picker presets + instant-commit,
the Today jump (from another month back to today), calendar Day/Week stability, the DOB
day-click commit, table typography, the tab-bar fade appearing on overflow and clearing at the
end, and the hidden calendar scrollbar. No console errors from this code across the interactions.
