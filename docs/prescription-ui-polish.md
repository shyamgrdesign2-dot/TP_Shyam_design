# Prescription UI Polish and Compactness

This changeset applies visual polish, compactness, and layout improvements to the prescription pad interface for a cleaner, denser look.

## Changes

### 1. Prescription card compactness (`tesseractRxPad.scss`)

- Reduced card padding from 24px/16px to 12px/10px.
- Removed card `border` (now borderless cards).
- Reduced card `border-radius` from 16px to 10px.
- Section header font size reduced from 18px to 14px, icon scaled down from 22px to 18px.
- Table header heights reduced from 38px to 30px, font from 13px to 12px.
- Input row heights reduced from 42px to 34px.
- Chip styles: smaller font (11px), reduced padding, height capped at 24px.
- Table action column widths reduced.
- Gap between cards reduced from 16px to 8px.
- Wrapper padding reduced from 16px to 8px.
- Medication table: compact row heights, smaller input fields, tighter action column.
- Sticky action columns: removed heavy box-shadows (scroll indicator removal).

### 2. Content area horizontal scroll support (`allComponent.scss`, `PrescriptionNew.jsx`)

- Added `min-width: 640px` on `.prescription-wrapper > .row` so content scrolls horizontally instead of squishing when the viewport is narrow.
- Changed `overflow-x` from `hidden` to `auto` on the prescription wrapper.
- Hidden the scrollbar using `scrollbar-width: none` (inline style for specificity) and `-webkit-scrollbar { display: none }`.

### 3. Scroll edge shadows (`PrescriptionNew.jsx`, `PrescriptionNew.module.scss`)

- Added two absolute-positioned gradient overlays (18px wide) inside the route shell.
- Left shadow: appears at `left: 80px` (after sidebar) when content is scrolled right.
- Right shadow: appears at `right: 0` (or behind the VoiceRx panel) when content can scroll further right.
- Shadows use `rgba(26, 26, 46, 0.08)` gradients with 200ms opacity transition.
- Right shadow position animates smoothly when the Dr. Agent panel opens/closes on tablet.
- A `useEffect` scroll listener updates shadow opacity based on `scrollLeft`, `scrollWidth`, and `clientWidth`.

### 4. VoiceRx panel layout fix (`PrescriptionNew.jsx`, `DrAgentRuntime.module.scss`)

- Changed wrapper from `padding-right` to `margin-right` for tablet overlay mode so the content area resizes correctly with the panel.
- Hidden panel now uses `width: 0 !important` instead of `translateX(100%)` to prevent it from affecting flex layout sizing.

### 5. Sticky action column scroll indicator removal (`tesseractRxPad.scss`, `VoiceRxModuleCapture.module.scss`)

- Removed `box-shadow` from all sticky action columns across 6 table types (Symptoms, Examinations, Diagnosis, Differential Diagnosis, Advices, Medications).
- Added `[data-behind] .tesseract-ct-sticky-action::before { display: none }` to suppress the scroll indicator pseudo-element.
- Removed shadow from VoiceRxModuleCapture module table sticky columns as well.

### 6. Follow-up and Additional Notes layout (`TabFollowUpBox.js`)

- Restructured from side-by-side to stacked vertical layout.
- Follow-up date and Additional Notes now each take full width.

### 7. Advice search icon alignment (`AdviceBox.js`)

- Centered the search icon vertically within the search input field.

### 8. Component-specific fixes

- **DiagnosisBox.js**: Compact row rendering adjustments.
- **DifferentialDiagnosis.js**: Compact table layout adjustments.
- **MedicationsBox.js**: Compact medication row heights, tighter action buttons.
- **PrescriptionEmptyLineUi.js**: Compact empty row styling.
- **OphthalmologyExamPanel**: Refactored styles to CSS modules, compact layout.
- **DrAgentFab.jsx**: Added SVG clipPath to prevent shimmer animation overflow outside the FAB shape.
- **VoiceRxModuleCapture**: Action button size variants (default 42px, small 36px), icon size (default 24px, small 16px).

### 9. Global style fixes (`sideNavbar.css`, `buttons.scss`, `fonts.scss`, `header.scss`)

- Sidebar, button, font, and header adjustments for consistency with the compact design.
