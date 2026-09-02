# Session changes — VoiceRx credits guard, UI rollout flags & Tesseract design system

Work was done in `pm-portal-clone/Pm-Doctor-Portal` on branch **TP-2374** (base `prod`).
This document records everything changed in the session, why, and how it was verified.

---

## 1. VoiceRx credits guard — audit + fixes

### What the PR already did
A single `guardVoiceRxUsage` callback defined in `src/pages/PrescriptionNew.jsx`, passed down
through `RxPadSyncProvider` (`src/components/dr-agent/rxpad/dr-agent/RxPadSyncContext.jsx`) and
called at every voice surface with three phases:

| phase | behaviour |
| --- | --- |
| `start` | cheap check against cached `servicesList`; blocks + opens the upgrade modal when the tier is expired |
| `submit` | real `checkCredits` API call **before** the transcription request fires |
| `mark-used` | sets `useVoiceRx = true` so End Visit knows to decrement a credit |

Surfaces covered: Dr Agent full consult / add-details / quick-edit, module + section voice
(`VoiceRxModuleCapture`, incl. custom modules V1 & V2), SideNavbar sections, header dictation and
double-Shift Quick Dictator.

### Gaps found and fixed
1. **SOAP retry was ungated** — `retryVoiceRxSoap` (`useDrAgentPanel.js`) hit `/agents/get-soap-notes`
   with no guard. Now awaits `guardVoiceRxUsage({ phase: "submit", surface: "agent-soap-retry" })`.
2. **Streaming chunk uploads** — `VoiceRecorderCore.jsx` posts to `/audio-chunks` while recording.
   Added a `silent: true` guard option (checks tier without popping the modal); the recorder runs a
   silent check when the mic activates and disables chunk uploads for blocked users.
3. **Quick Dictator race** — `VoiceBar.js` had an un-guarded `transcribeAnyAudio` fallback for its
   "uncontrolled" mode. It now receives `guardVoiceRxUsage` as a prop (it mounts outside
   `RxPadSyncProvider`, so context would not reach it) and guards submit + fires `mark-used`.

### End-visit credit burn aligned with the old UI
`src/common/HeaderPrescription.js` used a tier/balance combination that could decrement credits for
GrowthBook free-flag users. Replaced with the old-UI rule (`ConsultationDrawer.js`):

```js
if (!isFreeVoiceRxUser && useVoiceRx) {
  dispatch(updateCredits({ b2c_id, service_name: S_VOICE_RX })); // PUT credits { action: "DECREASE" }
}
```

Also removed the leftover `console.log("[VoiceRx credits] End Visit", …)` and the now-unused
`FREE` import / `servicesList` selector in that file.

### Analytics on every block
`guardVoiceRxUsage` now emits **`TP_VoiceRx_Credit_Blocked`** (via the existing `trackEvent` util)
whenever it returns `false`:

`reason` (`voice_rx_not_accessible` | `credits_exhausted` | `payment_failed` |
`credit_check_failed` | `credit_check_invalid_response`), `phase`, `surface`, `module_name`,
`section_id`, `silent`, `plan_tier`, `credit_balance`, `doctor_unique_id`, `doctor_name`.

### Plan-tier reference (service `voice_rx`)

| User | `plan_tier` | Blocked? | Credit burn on End Visit |
| --- | --- | --- | --- |
| Trial / new doctor | `FREE` (balance > 0) | no | yes |
| FREE, balance ≤ 0 | `FREE` | yes (upgrade modal) | no |
| Paid | `PAID` | no | yes |
| Payment failed | `FAILED-VERIFICATION` | yes | — |
| Payment processing | `PENDING-VERIFICATION` | no | yes |
| `free-voice-rx` flag user | any | never | never |

Mobile old-voice-UI parity was verified — `ConsultationDrawerMobile`, `MobileRxPad`,
`MobileVoiceRecording` and `VoiceRxConsult` already implement the same checkCredits/updateCredits
pattern as the desktop old UI.

---

## 2. UI-selection flags (tp-config-data)

All UI selection now runs through one hook: `useVoiceRxNewUiFlag()` in
`src/utils/voiceRxNavigation.js`. Every previous `useFeatureIsOn(GB_VOICE_RX_NEW_UI)` call site
(18 files) reads it instead.

```
oldVoiceUiOnlyDoctors contains my user_id ? OLD UI
: voice-rx-new flag on                     ? NEW UI
: onboarded ≥ newVoiceUiOnboardCutoff      ? NEW UI
: free-voice-rx && today ≥ newVoiceUiForFreeUsersFrom ? NEW UI
: OLD UI
```

* `onboarding_date` comes from the plan API (`/user/v2/pm/info/plan` → `body.profile.onboarding_date`)
  and is already stored in `state.subscription.planDetails.onboarding_date`.
* Per-doctor overrides key on the **JWT `user_id`** (e.g. `32010`), number/string tolerant.
* Every value may be plain or env-keyed `{ uat, prod }`; the bucket is resolved from
  `REACT_APP_ENV` — `prod`, `zy-prod`, `zy-preprod` → `prod`, everything else → `uat`.
  (`NODE_ENV` is unusable: CRA sets it to `production` for every build.)

### Point-n-click rollout (`useNewPointClickUiFlag`)
When `newPointClickUi` is enabled, **every** `/prescription` entry (fresh, edit, repeat, draft)
renders `PrescriptionNew` in **voice-less** mode instead of the old `Prescription.js`.

* Phones excluded; opt-out list `oldPointClickUiOnlyDoctors` (separate from the voice list).
* Voice surfaces are gated on `state.isVoiceRxNewUiFlow`, so point-n-click entries render the same
  page with no Dr Agent, module/sidenav voice, double-Shift, trial chip or landing credits modal —
  and therefore never burn a credit.
* The header **Voice Rx** CTA re-enters the same route with the voice flow enabled, in place.

### Config shape

```json
{
  "newVoiceUiOnboardCutoff":    { "uat": "2026-08-01", "prod": "2026-08-01" },
  "newVoiceUiForFreeUsersFrom": { "uat": "2026-09-01", "prod": "2026-09-01" },
  "oldVoiceUiOnlyDoctors":      { "uat": [], "prod": [] },
  "newPointClickUi":            { "uat": true, "prod": true },
  "oldPointClickUiOnlyDoctors": { "uat": [], "prod": [] }
}
```

> The old `newEmptyLineUI` key is now dead — see §4.

---

## 3. VoiceRx navigation touchpoints

Nine call sites hand-rolled `isVoiceRxNewFromGB ? "/prescription" : "/voice-rx-consult"` and
hardcoded `isVoiceRxNewUiFlow`, skipping the mobile-phone guard in
`shouldUseVoiceRxNewUiNavigation` (phones must stay on the old voice UI). One more
(`ConsultationLayout` fallback) was hardcoded to the old route regardless of the flag.

All now use `getVoiceRxNavigationPath` / `getVoiceRxNavigationState`:
`AppointmentData` (the "Voice Rx" dropdown item), `PatientForm`, `Cardiology` (×2), `Welcome1`,
`WalkInConsultation`, `WalkInConsultationZydus`, `Prescription` (old header CTA),
`ConsultationLayout` (fallback branch).

The old-page header Voice Rx CTA visibility already matched the appointment dropdown
(`isFreeVoiceRxUser || tp_monetization_enable`) — no change needed there.

---

## 4. Tesseract design system (`@dhspl-tatvacare/tesseract-ui`)

Sections converted to the `RxPadSection` shell, **PrescriptionNew only** (prop-gated with
`useTesseractUi`; the old UI is untouched):

| Section | Icon | Header row | Chips | Sticky action |
| --- | --- | --- | --- | --- |
| Symptoms | `bulk/virus` | ✅ | ✅ | ✅ |
| Examinations | `bulk/stethoscope` | ✅ | ✅ | ✅ |
| Diagnosis | `bulk/diagnosis` | ✅ | ✅ | ✅ |
| Medications (Rx) | `bulk/pills` | restyled in place | ✅ (prefills all columns) | ✅ |
| Investigation | `bulk/microscope` | ✅ | ✅ | ✅ |
| Surgeries/Procedures | `bulk/health` | ✅ | — (no frequent API) | ✅ |
| Advices | `bulk/clipboard-check` | — (shell only) | — | — |
| Custom modules V1 & V2 | `bulk/note-2` | V2's own header restyled | — | ✅ |

Shared skin lives in `src/components/tesseractRxPad.scss`; the scroll-shadow driver in
`src/components/tesseractCt.js`.

Key details:

* **Two UI modes only.** The GrowthBook `newEmptyLineUI` gate was removed from
  `usePrescriptionNewEmptyLineUi` — `isEnabled` is now simply `useTesseractUi`. Tesseract shells
  always show the inline "Search & add" row; the old UI always shows the classic bottom autocomplete.
* **Fonts.** Section titles and table headers use the portal's Poppins (not Tesseract's Mulish).
* **Column sizing.** Notes column flexes (`flex: 1 1 auto`), action column is a fixed 48px in both
  header and body rows, so header/body always align and there is no dead gap before the delete CTA.
* **Sticky action column** mirrors ClinicalTable: pinned right, left fade shown **only** while the
  table overflows and is not scrolled fully right (`data-behind`, computed on mount + scroll +
  ResizeObserver). Legacy voice-mode fixed-width cell classes are disabled in Tesseract mode so
  header and body share one scroller.
* **Medication voice mode** sizes its rows to content (`width: max-content; min-width: 100%`) so the
  header background and row borders paint across the whole scrollable width.
* **Chips**: sourced from each section's frequently-searched API, `font-weight: 500`, max-width 180px
  with ellipsis and a full-text `title`; adding hides the chip, deleting the row brings it back.
  Medication chips route through `onSelectParent`, so dose/unit/frequency/when/duration prefill.
* **Custom modules**: no "Add New Line" CTA in Tesseract mode (a trailing empty row is the add
  affordance, auto-appended once the last row has content), no delete CTA on the empty row, single
  outer border, no inner top gap.
* **Icons**: template/trash icons inside every template popover, `refresh-arrow` for load-previous,
  `grid-5` / `ram` / `eraser` for the header quartet, `calculator` for dose calc, `menu` for the
  Advices drag handle, and header `Temp` / `Save` / `Custom` (`grid-5` / `ram` / `setting-2`).
* **Voice Rx CTA** on the new UI uses the prod `GenRxButton` (rotating gradient-video border) with a
  `tesseract-genrx-cta` class fixing the inner radius so the corners stay concentric.

### Design-system global-reset containment (`src/styles/tesseractContainment.scss`)
`TesseractThemeProvider` wraps the whole app (`src/index.js`), so the package's
`[data-tp-theme] …` rules applied to **every** portal screen: base font switched to Inter, all
headings retyped to Mulish with `margin: 0`, every scrollbar hidden, every corner squircled.
Tokens live on `:root`, so the resets are safe to neutralize. The new stylesheet (imported right
after the package CSS) restores the portal's Poppins stack, heading inheritance + Bootstrap margins,
normal scrollbars and round corners; Tesseract components keep their own component-class styling,
and the RxPad tables re-hide their scrollbars (by design — the pinned column + fade is the
affordance).

---

## 5. Quick Dictator tutorial drawer

The "Know more" drawer rendered flush against all edges because the portal has a global
`body .ant-drawer .ant-drawer-body { padding: 0 }` that outranked the drawer's own rules. Fixed in
`src/components/quick-dictator/quick-dictator.css` by matching that specificity
(`body .qd-tutorial-drawer …`) and tightening the layout: 64px header with 24px sides, 24px body
padding, 16px heading, 28px step chips, tighter step rhythm, inset "Try it now" card.

---

## 6. Files touched

```
src/utils/voiceRxNavigation.js                 (central UI-selection + navigation helpers)
src/App.js                                     (PrescriptionRouteElement: point-n-click branch)
src/index.js                                   (containment stylesheet import)
src/styles/tesseractContainment.scss           (new)
src/components/tesseractRxPad.scss             (new)
src/components/tesseractCt.js                  (new)
src/pages/PrescriptionNew.jsx                  (guard, voice-flow gating, useTesseractUi props)
src/common/HeaderPrescription.js               (credit burn, header icons, VoiceRx CTA)
src/components/PrescriptionEmptyLineUi.js      (empty-line gate)
src/components/{Symptoms,Examination,Diagnosis,Medications,Advice,Investigation,Surgical}Box.js
src/components/CustomModule.js
src/components/customModulesV2/CustomModuleV2.js
src/components/dr-agent/rxpad/dr-agent/hooks/useDrAgentPanel.js
src/components/dr-agent/voicerx/VoiceRecorderCore.jsx
src/components/quick-dictator/VoiceBar.js
src/components/quick-dictator/quick-dictator.css
src/components/{AppointmentData,PatientForm,Cardiology,ConsultationLayout}.js
src/common/Welcome1.js
src/pages/{Prescription,WalkInConsultation,WalkInConsultationZydus}.js
```

---

## 7. Verification

* `npx eslint` on every touched file — **0 errors** (pre-existing warnings only).
* Dev server compiled clean throughout; all UI behaviour checked live in the browser:
  guard blocking + credits modal, chip add/remove round-trips, header/body column alignment,
  sticky action + scroll-shadow states, medication paint while scrolled, custom-module auto-row,
  drawer padding, and the Poppins font restore.

---

## 8. Findings / open items

* **`newPointClickUi` differs per GrowthBook environment** — prod currently `false`, uat `true`.
  Local dev builds with `REACT_APP_ENV=prod`, so `/prescription` opens the old UI there.
* **Landing credits modal re-opens** whenever the services list refreshes — the effect in
  `PrescriptionNew.jsx` depends on the `VOICE_RX_planDetails` object reference. A "shown once" guard
  (or keying on `plan_tier` / `credit_balance` primitives) is the fix. Not yet applied.
* **Leaked token**: `ipd-dev`'s `.npmrc` contains a plaintext GitHub PAT committed to git history.
  Nothing in this branch commits a token (env-var form only) — rotate the leaked PAT separately.
* **Zydus free-VoiceRx window expired**: `zydus_voice_rx_expiry_date` is `2025-11-01`, so the
  `free-voice-rx` flag is now the only free path.
