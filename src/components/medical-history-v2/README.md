# Medical History Drawer V2

Redesigned Medical History sidebar drawer built on the **Tesseract design system**. This is a **design prototype** that establishes the UX patterns for the new medical history experience. The frontend team needs to wire up backend APIs and expand integration across all Rx modes.

---

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `Medical_History_Drawer_V2.jsx` | 1,517 | Main component: sections, chips, detail panel, search, customize |
| `Medical_History_Drawer_V2.module.css` | 1,466 | CSS Modules scoped styles, Tesseract token-based |
| `README.md` | This file | Documentation for the developer taking this forward |

### Integration files (modified)

| File | What changed |
|------|-------------|
| `src/pages/PrescriptionNew.jsx` | Conditional V2 render when `canUseVoiceRxModuleUi && medicalHistoryDrawerMode !== "gynec"` |
| `src/components/ConsultationLayout.js` | Same conditional V2 render pattern |
| `src/components/MedicalHistoryRichTextEditor.jsx` | Always uses V2 with full `onSave` data conversion to existing format |

---

## Tesseract Components Used

| Component | Usage |
|-----------|-------|
| `Drawer` / `DrawerContent` | Full 80% width right-side panel |
| `SectionCard` | Collapsible section containers (Medical Condition, Allergies, etc.) |
| `SegmentedControl` | Enabled (Yes/No), Status (Active/Inactive), Medication (Yes/No) |
| `Checkbox` | "No known history" toggle per section |
| `DatePicker` | Surgical history date selection |
| `InputBox` | Search bar, notes, since duration |
| `Toggle` | Section visibility in customize panel |
| `Tooltip` | Chip hover tooltips, customize panel header tooltip |
| `TPIcon` | All icons (`family="arrow2"` for add, `family="essential"` for close, etc.) |
| `Button` | Save History, Show More, Add Custom |
| `ConfirmDialog` | Unsaved changes confirmation |
| `Dropdown` | Relationship selector in Family History |
| `Divider` | Visual separators |
| `Skeleton` | Loading states |
| `TesseractThemeProvider` | Theme wrapper |

---

## Architecture

```
MedicalHistoryDrawerV2 (main export)
  |
  +-- Drawer (Tesseract) ............ 80% width right panel
  |     |
  |     +-- Header .................. Title + settings gear + Save button
  |     |
  |     +-- Search bar .............. Global search across all sections
  |     |
  |     +-- Left panel (scrollable)
  |     |     |
  |     |     +-- SectionCard x5 .... Medical Condition, Allergies,
  |     |     |                       Family History, Lifestyle, Surgical History
  |     |     |     |
  |     |     |     +-- Selected chips (with cross-to-remove)
  |     |     |     +-- Suggested chips (default/frequently used)
  |     |     |     +-- "Show More" (after 2 rows)
  |     |     |     +-- "Add custom" button
  |     |     |
  |     |     +-- Current Medications (read-only display)
  |     |
  |     +-- Right detail panel ...... Edit fields for selected chip
  |           |
  |           +-- Enabled (Yes/No)
  |           +-- Status (Active/Inactive)
  |           +-- Since (duration input with suggestions)
  |           +-- Medication (Yes/No) -- Medical Condition only
  |           +-- Relationship (dropdown) -- Family History only
  |           +-- Date (DatePicker) -- Surgical History only
  |           +-- Note (textarea)
  |
  +-- Customize panel (overlay) .... Toggle section visibility, drag to reorder
```

---

## Data Flow

### Current state (prototype)
- Default suggestions are **hardcoded** in `DEFAULT_SUGGESTIONS` (line ~59)
- Section config (visibility, order) stored in **localStorage** under key `mh_v2_section_config`
- On save, the component calls `onSave(sectionsData)` with the full sections array

### Target state (after backend integration)

```
First visit:
  API returns ~35 defaults per section
  UI shows only defaults

After doctor saves:
  Backend tracks usage frequency per tag per doctor
  API returns: frequently_used (sorted by count) + defaults (appended)
  UI shows blended list, frequently used first

As usage grows:
  Frequently used items dominate the list
  Defaults fill remaining slots
  "Show More" reveals the full combined set
```

### Save payload format

```json
[
  {
    "tmmhs_id": 2,
    "title": "Medical Condition",
    "tags": [
      {
        "title": "Hypothyroidism",
        "enable": "Y",
        "status": "Active",
        "since": "2 Years",
        "medication": "Y",
        "note": "Taking levothyroxine daily"
      }
    ]
  },
  {
    "tmmhs_id": 4,
    "title": "Allergies",
    "tags": [
      {
        "title": "Penicillin",
        "enable": "Y",
        "status": "Active",
        "since": "",
        "note": "Causes rash"
      }
    ]
  }
]
```

### Section IDs

| tmmhs_id | Section |
|----------|---------|
| 1 | Lifestyle |
| 2 | Medical Condition |
| 3 | Family History |
| 4 | Allergies |
| 5 | Surgical History |

### Fields per section

| Field | Medical Condition | Allergies | Family History | Lifestyle | Surgical History |
|-------|:-:|:-:|:-:|:-:|:-:|
| Enabled (Y/N) | Yes | Yes | Yes | Yes | Yes |
| Status (Active/Inactive) | Yes | Yes | -- | Yes | Yes |
| Since (duration) | Yes | Yes | -- | Yes | Yes |
| Medication (Y/N) | Yes | -- | -- | -- | -- |
| Relationship | -- | -- | Yes | -- | -- |
| Date | -- | -- | -- | -- | Yes |
| Note | Yes | Yes | Yes | Yes | Yes |

---

## Frontend Tasks

### 1. Replace hardcoded defaults with API
- Replace `DEFAULT_SUGGESTIONS` object (line ~59) with API response
- Add a `useEffect` to fetch suggestions on mount
- Merge frequently used + defaults from API response into the suggested chips list

### 2. Expand V2 to all Rx modes
Currently gated by: `canUseVoiceRxModuleUi && medicalHistoryDrawerMode !== "gynec"`

The V2 drawer should open for **all medical history** access, not just VoiceRx. Files to update:
- `src/pages/PrescriptionNew.jsx` (line ~3449)
- `src/components/ConsultationLayout.js` (line ~2905)

Remove the `canUseVoiceRxModuleUi` check (or use a dedicated feature flag).

### 3. Separate Medical History from Gynec History
In some Rx modes, medical and gynec history share one drawer. They must be split:
- **Medical History**: Uses V2 drawer (this component). Sections: Medical Condition, Allergies, Family History, Lifestyle, Surgical History
- **Gynec History**: Continues using existing `MedicalHistoryBox` with `gynecOnly={true}`. Menstrual history, obstetric history, etc.
- The calling code decides which drawer to open based on user action, not a mode flag inside the drawer

### 4. Wire save to backend
- Connect the `onSave` callback to the actual save API
- `MedicalHistoryRichTextEditor.jsx` already has the full conversion logic mapping V2 data to the existing `convertedMedicalHistory` format (see `onSave` handler around line 494)
- For `PrescriptionNew.jsx` and `ConsultationLayout.js`, `onSave` is currently `undefined`. Wire it to the appropriate save action

### 5. Customization persistence
- Replace `localStorage` storage (key: `mh_v2_section_config`) with backend API
- Store per-doctor: section visibility (show/hide), section order (drag reorder)
- Load on mount, save on change

### 6. Current medications
- The "Current Medications" section at the bottom needs a real API to fetch active medications for the patient
- Currently shows placeholder or empty state

---

## Backend Dependencies

### APIs needed before frontend can complete

| # | API | Purpose | Suggested endpoint |
|---|-----|---------|-------------------|
| 1 | **Get suggested tags** | Returns default + frequently used tags per section per doctor | `GET /medical-history/suggestions?doctor_id=` |
| 2 | **Track tag usage** | Increment usage count when a doctor selects a tag | (piggyback on existing save, or separate `POST /medical-history/track-usage`) |
| 3 | **Save section config** | Persist section visibility and order per doctor | `POST /medical-history/section-config` |
| 4 | **Get section config** | Load saved section visibility and order | `GET /medical-history/section-config?doctor_id=` |
| 5 | **Get current medications** | Active medications for a patient | `GET /patient/:id/current-medications` |

### Suggested tags API response shape

```json
{
  "sections": [
    {
      "tmmhs_id": 2,
      "title": "Medical Condition",
      "suggested_tags": [
        { "title": "Diabetes", "source": "default" },
        { "title": "Hypothyroidism", "source": "frequently_used", "use_count": 15 },
        { "title": "Hypertension", "source": "frequently_used", "use_count": 12 },
        { "title": "Asthma", "source": "default" }
      ]
    }
  ]
}
```

**Sorting rule**: `frequently_used` items first (sorted by `use_count` desc), then `default` items. Frontend displays in this order.

### Section config API shape

```json
{
  "doctor_id": "...",
  "sections": [
    { "tmmhs_id": 2, "visible": true, "order": 0 },
    { "tmmhs_id": 4, "visible": true, "order": 1 },
    { "tmmhs_id": 3, "visible": false, "order": 2 },
    { "tmmhs_id": 1, "visible": true, "order": 3 },
    { "tmmhs_id": 5, "visible": true, "order": 4 }
  ]
}
```

---

## Deployment Order

1. **Backend**: Deploy all 5 APIs listed above
2. **Frontend**: Replace hardcoded data with API calls, expand to all Rx modes, separate gynec
3. **QA**: Test across all Rx modes, verify save/load, test customize persistence

---

## CSS Isolation

All styles are scoped via CSS Modules (`.module.css`). Key patterns:

- Root wrapper: `.medHistoryV2` class on the outermost div
- Tesseract overrides: `:global()` selectors target Tesseract class names (e.g., `:global([class*="_sectionCard_"])`)
- Portal elements (Drawer, Tooltip, Dropdown): styled via `:global()` since they render outside the component tree
- No Ant Design components inside V2
- No global CSS files
- All spacing/colors use Tesseract CSS variables (`--tesseract-space-*`, `--tesseract-color-*`, `--tesseract-weight-*`)

---

## How to Test Locally

1. Run `npm run start:dev` (needs local `.env.dev`, use `--legacy-peer-deps` for install)
2. Open any patient in VoiceRx mode
3. Click "History" in the left sidebar
4. Click "Add Medical History"
5. The V2 drawer opens with the Tesseract UI

### Things to test
- Select chips, verify detail panel updates
- Add custom items via search
- Toggle "No known history" checkbox
- Hover truncated chips to see tooltip
- Use "Show More" button on suggested chips
- Open customize panel (gear icon) to hide/show/reorder sections
- Close drawer with unsaved changes to see confirmation dialog
