# LIMS - Laboratory Information Management System

Self-contained lab module for TatvaPractice. Built with the Tesseract Design System (`@dhspl-tatvacare/tesseract-ui@1.0.3`), CSS-isolated from the host Ant Design app.

## Features

- **Patient listing** with search, date filter, status filter, and sortable DataTable
- **Lab results drawer** to view/enter lab investigation values (reuses existing LabParams component)
- **Add new patient drawer** with personal details, address, and photo upload
- **Pincode auto-fetch** - enter 6 digits, city/state auto-fill; error state on invalid pincode
- **Print page** with Tesseract Header, sidebar date picker, and A4 print preview
- **Print settings** - toggle header/footer, watermark, paper size, and font size
- **Slide-in animation** on entry (drawer-style transition)

## Files changed

| Type | Count | Details |
|------|-------|---------|
| New files | 19 | 17 in `src/pages/lims/`, plus vendor tgz, Tatvacare SVG |
| Modified files | 5 | `App.js` (+3 routes), `SidebarDoctor.js` (+nav link), `LabParams.js` (badge styling), `package.json` (+dependency), `package-lock.json` |

## File structure

```
src/pages/lims/
  LimsPage.jsx / .module.css        # Patient listing (DataTable, search, filter)
  LimsPrintPage.jsx / .module.css   # Print preview with A4 card
  LimsPrintConfig.jsx / .module.css # Print settings (paper, font, toggles)
  LimsPatientForm.jsx / .module.css # Add-patient form (pincode auto-fetch)
  AddPatientDrawer.jsx / .css       # Drawer wrapper for patient form
  LabResultsDrawer.jsx / .css       # Drawer wrapper for lab entry
  LimsIsolation.css                 # CSS isolation from Ant Design globals
  limsApi.js                        # API calls (patient list, lab data)
  limsHelpers.js                    # Data transforms, formatters
  limsPrint.js                      # Print rendering logic
  limsPrintUtils.js                 # Print utility functions
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/lims` | LimsPage | Patient listing |
| `/lims/print/:patientId` | LimsPrintPage | Print preview |
| `/lims/print-settings` | LimsPrintConfig | Print configuration |

## Isolation

- All LIMS pages render inside a `.lims-root` wrapper
- `LimsIsolation.css` scopes Tesseract tokens and resets to prevent Ant Design bleed
- Drawers use `.lims-lab-drawer` and `.lims-add-patient-drawer` classes for portalled content
- No existing TatvaPractice code was modified beyond routing and sidebar additions
