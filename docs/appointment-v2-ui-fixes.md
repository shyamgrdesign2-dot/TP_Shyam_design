# Appointment V2 UI fixes

Branch: `fix/appointment-v2-ui-fixes` (based on `prod`)

Consolidates the appointment-listing calendar rework, add-patient form
improvements, and a cross-app banner / CTA consistency pass into one commit,
so it can be pulled as a single change.

Production build: exit 0, no compile errors.

## Files changed

| File | Why changed |
|------|-------------|
| **Appointment calendar** | |
| `src/pages/appointment-listing/AppointmentListingPage.jsx` | Move queue-export kebab to the toolbar right end (grey count tag + info box); date picker week / single-day snapping; remove the glitchy on-scroll toolbar collapse |
| `src/pages/appointment-listing/AppointmentListingPage.module.css` | Page height on 100dvh; fix the white bottom strip; drop the toolbar-collapse media query |
| `src/pages/appointment-listing/components/AppointmentCalendarView.jsx` | Unified slot colour; constant in-clinic / video mode icon in all states; mode-aware blocked labels; denser grid; zoom that scales the mode icon and persists across reloads; consultation-mode row in the popover |
| `src/pages/appointment-listing/components/AppointmentCalendarView.module.css` | Fixed 52px grid header; week-view slot label sizing so the mode icon always fits |
| `src/pages/appointment-listing/components/AppointmentEventCard.jsx` | Mode glyph is never cropped; drop the status rail / kebab by card width instead |
| `src/pages/appointment-listing/components/AppointmentEventCard.module.css` | Compact-tier padding and font tuning |
| `src/pages/appointment-listing/components/BookAppointmentDrawer.jsx` | Mode-aware title; merge the mode into the slot / date row; remove the locked mode switch; centre the header |
| `src/pages/appointment-listing/components/BookAppointmentDrawer.module.css` | Supporting style for the merged mode row |
| `src/pages/appointment-listing/data/appointmentStates.js` | Visit icon set to user-tag for the popover |
| `src/pages/appointment-listing/data/viewPreferences.js` | Numeric-preference support so the calendar zoom survives a reload |
| **Add patient** | |
| `src/pages/add-patient/PatientForm.jsx` | Join salutation + name; add a Days age input for newborns; compute DOB from years / months / days |
| `src/pages/add-patient/PatientForm.module.css` | Style the joined salutation / name and 3-segment age as single controls; darken the age-unit suffixes; larger photo preview |
| **Global** | |
| `src/index.css` | Header title margin fix; drawer scroll on 100dvh with contained overscroll; instant (no-animation) dropdown menus |
| **Banner / CTA consistency** | |
| `src/common/PageHeroBanner/PageHeroBanner.module.css` | Banner CTA weight bold to medium, in one place for all banners |
| `src/common/Welcome.js` | Force the Available Credits icon to white on the dark banner |
| `src/pages/addAppointment/AddAppointment.js` | Tutorial button to icon only, keeping the white pill |
| `src/pages/opdBilling/components/billingDashboard/BillingDashboard.js` | Tutorial button to icon only |
| `src/pages/appointmentAgent/components/AppointmentSuccess/AppointmentSuccess.js` | Tutorial button to icon only |
| `src/common/Header.js` | Global header Tutorial button to icon only |
| `src/common/HeaderAppointmentAgent.js` | Tutorial button to icon only |
| `src/common/HeaderPrintSetting.js` | Tutorial button to icon only |
| `src/common/HeaderSmartRxDigitise.js` | Tutorial button to icon only |
| `src/components/ConsultationDrawer.js` | Tutorial button to icon only |
| `src/components/ConsultationDrawerMobile.js` | Tutorial button to icon only |
| `src/components/tab_design/TabHeader.js` | Tutorial button to icon only |
| `src/pages/MessageCreateCampaign.js` | Tutorial button to icon only |

## Not touched on purpose

These are differently-styled Tutorial buttons, not the shared banner pill, so
they were left as-is:

- `src/pages/VoiceRxConsult.js` (CSS-module styled button)
- `src/pages/smartSync/components/EditTemplateModal.js` (small inline 24px button)
