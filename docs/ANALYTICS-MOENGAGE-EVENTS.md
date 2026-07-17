# Data Analytics: MoEngage Event Tracking

**Module:** `data_analytics`
**Implementation:** `src/pages/data-analytics/data/analyticsTracking.js`
**Branch:** `tp-data-analytics`
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

## Events (12 total)

The events are designed around a user behavior funnel: Acquisition, Navigation, Interaction, Conversion, and Reliability. Each event answers a specific PM question.

---

### Acquisition

#### 1. TP_Analytics_Opened

**PM question:** How many doctors are discovering and using analytics? What is the adoption rate?

**When:** User opens the analytics drawer (component mount).

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Initial department shown ("opd") |

**File:** `DataAnalyticsPage.jsx` (mount useEffect)

---

#### 2. TP_Analytics_Closed

**PM question:** How long do sessions last? Are users getting value or bouncing quickly?

**When:** User closes the analytics drawer (component unmount).

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Last active department |
| `section` | string | Last active section |
| `time_spent_seconds` | number | Total seconds the drawer was open |

**File:** `DataAnalyticsPage.jsx` (unmount cleanup in useEffect)

**Analysis notes:** Sessions under 10 seconds suggest the user opened by accident or couldn't find what they wanted. Sessions over 3 minutes indicate strong engagement. Segment by `doctor_specialty` to find which specialties get the most value.

---

### Navigation

#### 3. TP_Analytics_DeptSwitch

**PM question:** Do IPD users also explore OPD data, and vice versa? Is the department toggle discoverable?

**When:** User toggles between OPD and IPD.

| Attribute | Type | Description |
|---|---|---|
| `from_department` | string | Previous department ("opd" or "ipd") |
| `to_department` | string | New department ("opd" or "ipd") |

**File:** `DataAnalyticsPage.jsx` (onDepartmentChange handler)

---

#### 4. TP_Analytics_SectionView

**PM question:** Which sections are most/least visited? Where should we invest in richer data?

**When:** User clicks a section in the sidebar.

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department ("opd" or "ipd") |
| `section` | string | Section ID (e.g. "billing", "care", "appointments") |

**File:** `DataAnalyticsPage.jsx` (onSectionChange handler)

**Analysis notes:** Rank sections by view count to identify high-value features. Sections with high views but short dwell time (derived from next SectionView timestamp minus this one) may need better data or UX. Sections with near-zero views may be hidden too deep in the nav or not relevant to the specialty.

---

#### 5. TP_Analytics_SubtabView

**PM question:** Within Care's 12 sub-tabs, which clinical data do doctors look at most?

**When:** User switches sub-tabs (Care has 12 sub-tabs, Grow has 3).

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department |
| `section` | string | Current section |
| `subtab` | string | Sub-tab ID (e.g. "diagnoses", "symptoms", "medications") |

**File:** `DataAnalyticsPage.jsx` (Tabs onValueChange)

---

### Interaction

#### 6. TP_Analytics_FilterApplied

**PM question:** How do doctors customize their view? Which date ranges are most popular? Do multi-clinic accounts filter by clinic?

**When:** User changes any filter (date range, doctor, clinic).

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department |
| `section` | string | Current section |
| `filter_type` | string | "period", "doctor", or "clinic" |
| `filter_value` | string | For period: preset label (e.g. "last-7", "this-month", "custom_range"). Omitted for doctor/clinic |
| `filter_count` | number | For doctor/clinic: number of items selected |

**File:** `DataAnalyticsPage.jsx` (handleDateChange, onDoctorsChange, onClinicsChange)

**Analysis notes:** `filter_value` distribution shows if doctors prefer daily, weekly, or monthly views. High `filter_count` for doctors/clinics suggests multi-location accounts are comparing specific subsets. If "custom_range" frequency is high, users may want more preset options.

---

#### 7. TP_Analytics_FilterCleared

**PM question:** Are users resetting filters frequently? Could indicate confusion or trial-and-error behavior.

**When:** User clicks the "Clear all" button to reset all filters to defaults.

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department |
| `section` | string | Current section |

**File:** `DataAnalyticsPage.jsx` (clearAllFilters handler)

**Analysis notes:** High clear-all rate relative to FilterApplied suggests filters may be confusing or defaults are wrong. If a specific section triggers frequent resets, that section's filter UX may need attention.

---

#### 8. TP_Analytics_Refresh

**PM question:** How often do doctors manually refresh? High rates may mean they expect real-time data updates.

**When:** User clicks the refresh button in the header.

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department |
| `section` | string | Current section |

**File:** `DataAnalyticsPage.jsx` (handleRefresh)

**Analysis notes:** If Refresh fires frequently for a particular section (e.g. Appointments), that section may benefit from auto-refresh or real-time polling.

---

### Conversion (Reports)

#### 9. TP_Analytics_ReportOpened

**PM question:** Which reports do doctors explore? What is the report discovery rate?

**When:** User opens a report download drawer (previews a report).

| Attribute | Type | Description |
|---|---|---|
| `report_name` | string | Report display name (e.g. "Appointment Report") |
| `department` | string | Current department |

**File:** `ReportDownloadDrawer.jsx` (useEffect on open)

---

#### 10. TP_Analytics_ReportDownloaded

**PM question:** Which reports are actually exported? What is the open-to-download conversion rate?

**When:** User successfully downloads a report CSV.

| Attribute | Type | Description |
|---|---|---|
| `report_name` | string | Report display name |
| `department` | string | Current department |
| `rows_exported` | number | Number of rows in the downloaded file |

**File:** `ReportDownloadDrawer.jsx` (after downloadBlob success)

**Analysis notes:** `ReportOpened` minus `ReportDownloaded` = drop-off. High drop-off on a specific report suggests the preview didn't show what the user expected, or filters were too restrictive. `rows_exported` distribution shows data volume patterns; very large exports (10k+ rows) may indicate users need aggregated views instead.

---

### Reliability

#### 11. TP_Analytics_ReportError

**PM question:** Are downloads failing? Which reports are unreliable?

**When:** A report CSV download fails (API error, timeout, or server rejection).

| Attribute | Type | Description |
|---|---|---|
| `report_name` | string | Report display name |
| `department` | string | Current department |
| `error_status` | string/number | HTTP status code or "unknown" |
| `error_message` | string | Server error message (if available) |

**File:** `ReportDownloadDrawer.jsx` (catch block after download attempt)

**Analysis notes:** Group by `report_name` to find which reports fail most. Group by `error_status` to distinguish server bugs (500) from user-facing issues (400/422). High error rates on a specific report = escalate to backend team.

---

#### 12. TP_Analytics_DataError

**PM question:** How often do users see "No data" when they expected results? Which sections have data quality problems?

**When:** A report returns zero rows for the selected filters (empty result set).

| Attribute | Type | Description |
|---|---|---|
| `department` | string | Current department |
| `section` | string | Always "reports" (currently wired in report flow only) |
| `error_type` | string | "empty_data" |
| `report_name` | string | Report that returned zero rows |

**File:** `ReportDownloadDrawer.jsx` (zero-rows check before download)

**Analysis notes:** High `empty_data` rates on specific reports suggest either a data gap (backend not populating those fields) or user expectation mismatch (filters too narrow). Cross-reference with `FilterApplied` to identify problematic filter combinations. Future enhancement: wire this into section-level data hooks via the `safe()` wrapper to track "No data" states across all dashboard sections, not just reports.

---

## User Journey Funnel

```
Open drawer              --> TP_Analytics_Opened          [Acquisition]
Switch OPD/IPD           --> TP_Analytics_DeptSwitch      [Navigation]
Click sidebar section    --> TP_Analytics_SectionView     [Navigation]
Click sub-tab            --> TP_Analytics_SubtabView      [Navigation]
Change date/filter       --> TP_Analytics_FilterApplied   [Interaction]
Clear all filters        --> TP_Analytics_FilterCleared   [Interaction]
Hit refresh              --> TP_Analytics_Refresh         [Interaction]
Open a report            --> TP_Analytics_ReportOpened    [Conversion]
Download CSV             --> TP_Analytics_ReportDownloaded [Conversion]
Download fails           --> TP_Analytics_ReportError     [Reliability]
No data for report       --> TP_Analytics_DataError       [Reliability]
Close drawer             --> TP_Analytics_Closed          [Acquisition]
```

---

## Key Metrics and How to Build Them in MoEngage

### Adoption and Retention

| Metric | Formula | Target |
|---|---|---|
| **Daily adoption rate** | Unique `doctor_id` on `Opened` / total active doctors | 30%+ within 30 days |
| **Weekly return rate** | Doctors with 3+ `Opened` events per week / total adopters | 20%+ |
| **Avg session duration** | Mean `time_spent_seconds` from `Closed` | 2+ minutes |
| **Bounce rate** | Sessions with `time_spent_seconds` < 10s / total sessions | < 15% |

### Engagement Depth

| Metric | Formula | Target |
|---|---|---|
| **Sections per session** | Count `SectionView` between `Opened` and `Closed` per session | 3+ sections |
| **Sub-tab exploration** | Count `SubtabView` per session (Care/Grow only) | 2+ tabs |
| **Filter engagement** | Sessions with at least 1 `FilterApplied` / total sessions | 50%+ |
| **Clear-all rate** | `FilterCleared` / `FilterApplied` ratio | < 20% (low = good) |

### Feature Value

| Metric | How to measure | What it tells you |
|---|---|---|
| **Top sections** | Rank `SectionView` by `section` | Where to invest in richer data |
| **Top sub-tabs** | Rank `SubtabView` by `subtab` | Which clinical data matters most |
| **Date range preference** | `FilterApplied` where `filter_type=period`, group by `filter_value` | Daily vs weekly vs monthly usage |
| **OPD vs IPD split** | `DeptSwitch` direction analysis + `Opened` department | Reflects user base mix |

### Report Conversion Funnel

| Metric | Formula | Target |
|---|---|---|
| **Report discovery** | Unique doctors firing `ReportOpened` / total openers | 15%+ |
| **Download conversion** | `ReportDownloaded` / `ReportOpened` per report | 60%+ |
| **Report reliability** | `ReportError` / (`ReportDownloaded` + `ReportError`) per report | < 5% |
| **Empty-data rate** | `DataError` / `ReportOpened` per report | < 10% |

### Specialty-Level Segmentation

All events carry `doctor_specialty` and `dp_id`. Build segments in MoEngage:
- **By specialty:** Which specialties use analytics most? Do surgeons care about billing more than diagnoses?
- **By hospital:** Multi-clinic accounts vs single-clinic. Do multi-clinic accounts use filters more?
- **By module (OPD vs IPD):** Which department is the primary draw?

---

## Recommended MoEngage Campaigns (Data-Driven)

| Trigger | Campaign | Goal |
|---|---|---|
| No `Opened` event in 7 days for an active doctor | "Your practice insights are ready" push/email | Re-engagement |
| `Opened` but `time_spent < 10s` (bounce) 3+ times | "Quick tour: find your billing and appointments data" | Activation |
| Heavy `SectionView` on "billing" + no `ReportDownloaded` | "Download your billing report as CSV" | Report adoption |
| `ReportError` fired for a doctor | "We fixed the issue, try downloading again" (after fix ships) | Recovery |
| `FilterApplied` with `filter_type=period` + `filter_value=till-date` | User wants long-range trends, potential Power BI upsell candidate | Upsell |
