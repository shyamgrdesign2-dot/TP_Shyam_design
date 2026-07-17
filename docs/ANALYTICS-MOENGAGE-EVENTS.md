# Data Analytics: MoEngage Event Tracking

**Module:** `data_analytics`
**Implementation:** `src/pages/data-analytics/data/analyticsTracking.js`
**Date:** 2026-07-17

---

## Naming Convention

All events follow the house standard: `TP_Analytics_Action`

- **TP** = Tatva Practice (product prefix)
- **Analytics** = module name
- **Action** = what the user did (PascalCase)

---

## Mandatory Base Attributes

Every event includes the doctor/hospital base set (pulled from Redux store + JWT token at fire time):

| Attribute | Source | Example |
|---|---|---|
| `doctor_name` | `state.doctors.profile.um_name` | "Dr. Priya Sharma" |
| `doctor_id` | JWT `user_id` or `profile.um_id` | "12345" |
| `doctor_unique_id` | `profile.doctor_unique_id` | "DOC-ABC-001" |
| `doctor_mobile_no` | `profile.um_contact` | "9876543210" |
| `hospital_name` | `profile.hospital_data[0].hm_name` | "City Care Clinic" |
| `hospital_id` | `profile.hospital_data[0].hm_id` | "67890" |
| `doctor_specialty` | `profile.dp_name` | "General Medicine" |
| `dp_id` | `profile.dp_id` | "5" |
| `module` | hardcoded | "data_analytics" |

---

## Events

### 1. TP_Analytics_Opened

**When:** User opens the analytics drawer (mount).

| Attribute | Type | Description |
|---|---|---|
| *(base set only)* | | |

**File:** `DataAnalyticsPage.jsx` (mount useEffect)

---

### 2. TP_Analytics_Closed

**When:** User closes the analytics drawer (unmount).

| Attribute | Type | Description |
|---|---|---|
| `time_spent_seconds` | number | Seconds the drawer was open |

**File:** `DataAnalyticsPage.jsx` (unmount cleanup in useEffect)

---

### 3. TP_Analytics_DeptSwitch

**When:** User toggles between OPD and IPD.

| Attribute | Type | Description |
|---|---|---|
| `from_department` | string | Previous department ("opd" or "ipd") |
| `to_department` | string | New department ("opd" or "ipd") |

**File:** `DataAnalyticsPage.jsx` (onDepartmentChange handler)

---

### 4. TP_Analytics_SectionView

**When:** User clicks a section in the sidebar.

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department ("opd" or "ipd") |
| `section` | string | Section ID (e.g. "billing", "care", "appointments") |

**File:** `DataAnalyticsPage.jsx` (onSectionChange handler)

---

### 5. TP_Analytics_SubtabView

**When:** User switches sub-tabs within a section (e.g. Care sub-tabs).

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department |
| `section` | string | Current section |
| `subtab` | string | Sub-tab ID (e.g. "diagnoses", "symptoms", "medications") |

**File:** `DataAnalyticsPage.jsx` (Tabs onValueChange)

---

### 6. TP_Analytics_FilterApplied

**When:** User changes any filter (date range, doctor, clinic).

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department |
| `section` | string | Current section |
| `filter_type` | string | "period", "doctor", or "clinic" |
| `filter_value` | string | For period: preset label. For doctor/clinic: not sent |
| `filter_count` | number | For doctor/clinic: number of items selected |

**File:** `DataAnalyticsPage.jsx` (handleDateChange, onDoctorsChange, onClinicsChange)

---

### 7. TP_Analytics_Refresh

**When:** User clicks the refresh button.

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department |
| `section` | string | Current section |

**File:** `DataAnalyticsPage.jsx` (handleRefresh)

---

### 8. TP_Analytics_ReportOpened

**When:** User opens a report download drawer.

| Attribute | Type | Description |
|---|---|---|
| `report_name` | string | Report display name (e.g. "Appointment Report") |
| `department` | string | Current department |

**File:** `ReportDownloadDrawer.jsx` (useEffect on open)

---

### 9. TP_Analytics_ReportDownloaded

**When:** User successfully downloads a report CSV.

| Attribute | Type | Description |
|---|---|---|
| `report_name` | string | Report display name |
| `rows_exported` | number | Number of rows in the downloaded file |

**File:** `ReportDownloadDrawer.jsx` (after downloadBlob success)

---

## User Journey Coverage

```
Open drawer           --> TP_Analytics_Opened
Switch OPD/IPD        --> TP_Analytics_DeptSwitch
Click sidebar section --> TP_Analytics_SectionView
Click sub-tab         --> TP_Analytics_SubtabView
Change date/filter    --> TP_Analytics_FilterApplied
Hit refresh           --> TP_Analytics_Refresh
Open a report         --> TP_Analytics_ReportOpened
Download CSV          --> TP_Analytics_ReportDownloaded
Close drawer          --> TP_Analytics_Closed (with time_spent_seconds)
```

## Key Metrics You Can Derive

- **Adoption:** count of `TP_Analytics_Opened` per doctor per day/week
- **Engagement depth:** avg sections viewed per session, avg time_spent_seconds
- **Feature usage:** which sections get the most views (SectionView counts)
- **Filter behavior:** most popular date ranges, single vs multi-doctor selection
- **Report adoption:** which reports are opened vs actually downloaded (conversion)
- **OPD vs IPD interest:** DeptSwitch frequency and direction
