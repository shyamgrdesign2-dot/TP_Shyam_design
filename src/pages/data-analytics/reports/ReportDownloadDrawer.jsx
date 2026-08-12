import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Drawer,
  DrawerContent,
  DateRangePicker,
  SegmentedControl,
  Dropdown,
  InputBox,
  Button,
  TPLibraryIcon,
  Toast,
} from "@dhspl-tatvacare/tesseract-ui";
import { downloadBlob } from "./tableUtils";
import useFilterOptions from "../data/useFilterOptions";
import { trackAnalytics, EVENTS } from "../data/analyticsTracking";
import ApiReporting from "../../../api/services/ApiReporting";
import ApiAppointments from "../../../api/services/ApiAppointments";
import {
  BILL_TYPE_OPTIONS,
  GENDER_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  BILLING_OVERALL_TYPE_OPTIONS,
  IPD_FILTER_BY_OPTIONS,
  APPOINTMENT_REPORT_TYPE_OPTIONS,
  COLLECTION_REPORT_TYPE_OPTIONS,
  THREE_C_REPORT_TYPE_OPTIONS,
  IPD_REPORT_TYPE_OPTIONS,
  PAYMENT_MODE_OPTIONS,
} from "./reportsCatalog";
import { isoLocal } from "../filters/periods";
import { getDecodedToken } from "../../../utils/localStorage";
import { getSpecialityList } from "../data/doctorList";

// Every report endpoint rejects ranges longer than this ("Date range must
// not exceed 30 days", 400) — 31 days inclusive passes, so full calendar
// months work. Verified against UAT on every /financial and /clinical report.
const MAX_REPORT_RANGE_DAYS = 31;

// Quick-select presets capped at the export limit — no This year / Till date
// here (they'd always 400).
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const REPORT_PRESETS = [
  { id: "today", label: "Today", getRange: () => ({ start: startOfDay(new Date()), end: startOfDay(new Date()) }) },
  { id: "yesterday", label: "Yesterday", getRange: () => ({ start: addDays(new Date(), -1), end: addDays(new Date(), -1) }) },
  { id: "last-7", label: "Past 7 days", getRange: () => ({ start: addDays(new Date(), -6), end: startOfDay(new Date()) }) },
  { id: "last-30", label: "Past 30 days", getRange: () => ({ start: addDays(new Date(), -29), end: startOfDay(new Date()) }) },
  { id: "this-month", label: "This month", getRange: () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: startOfDay(new Date()) }) },
  { id: "last-month", label: "Last month", getRange: () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) }) },
];

function rangeDaysOf(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.round((e - s) / 86400000) + 1;
}

export default function ReportDownloadDrawer({ report, department = "opd", filters, onClose }) {
  const open = !!report;
  useEffect(() => {
    if (open && report) trackAnalytics(EVENTS.REPORT_OPENED, { department, report_name: report.label || report.id });
  }, [open, report, department]);
  const [range, setRange] = useState(null);
  const [type, setType] = useState(department);
  const [downloading, setDownloading] = useState(false);
  // "N rows exported" / "0 rows for these filters" from the X-Report-Rows
  // header every CSV export carries (API-CONTRACTS-CURRENT §1).
  const [exportedRows, setExportedRows] = useState(null);
  // Tesseract Toast: { status, title, subtext } — the drawer's one feedback
  // surface for range violations, empty results and failed downloads.
  const [toast, setToast] = useState(null);
  const [attempted, setAttempted] = useState(false);

  // Multi-selects (checkbox dropdowns): arrays of the backend's own tokens/
  // ids, empty = "all". Serialized to CSV at download time.
  const [billType, setBillType] = useState([]);
  const [issuedBy, setIssuedBy] = useState([]);
  const [apptStatus, setApptStatus] = useState([]);
  const [caseType, setCaseType] = useState([]);
  const [ipdFilterIds, setIpdFilterIds] = useState([]);

  // Singles — gender is matched verbatim in SQL (`pm_gender = ?`), account
  // is REQUIRED by 3C ("all" sentinel accepted). Clinic is always the
  // auth-token clinic (read-only).
  const [gender, setGender] = useState(undefined);
  const [account, setAccount] = useState("all");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [ipdFilterBy, setIpdFilterBy] = useState(undefined);

  const [appointmentReportType, setAppointmentReportType] = useState("general");
  const [collectionReportType, setCollectionReportType] = useState("general");
  const [threeCReportType, setThreeCReportType] = useState("summary");
  const [ipdReportType, setIpdReportType] = useState("admitting");
  const [billingOverallType, setBillingOverallType] = useState("revenue");

  useEffect(() => {
    if (open) {
      setRange(null);
      setType(department);
      setBillType([]);
      setIssuedBy([]);
      setApptStatus([]);
      setCaseType([]);
      setIpdFilterIds([]);
      setGender(undefined);
      setAccount("all");
      setAgeMin("");
      setAgeMax("");
      setIpdFilterBy(undefined);
      setAppointmentReportType("general");
      setCollectionReportType("general");
      setThreeCReportType("summary");
      setIpdReportType("admitting");
      setBillingOverallType("revenue");
      setPaymentMode([]);
      setDeptIds([]);
      setExportedRows(null);
      setToast(null);
      setAttempted(false);
    }
  }, [open, department]);

  // Same live doctor + clinic sources as the page FilterBar (Redux with API
  // fallback; hospital_data lives on the DOCTORS slice).
  const { doctorOptions, clinicOptions } = useFilterOptions();
  const lockedClinicId = useMemo(() => {
    const fromFilters = singleId(filters?.clinic);
    if (fromFilters) return fromFilters;
    const tokenClinic = getDecodedToken()?.result?.clinic_id;
    return tokenClinic != null ? String(tokenClinic) : undefined;
  }, [filters?.clinic]);
  const lockedClinicLabel = useMemo(() => {
    if (!lockedClinicId) return "Your clinic";
    return clinicOptions.find((c) => String(c.value) === String(lockedClinicId))?.label || "Your clinic";
  }, [lockedClinicId, clinicOptions]);

  const reportFilters = report?.filters || [];

  const needsDept = report?.dept === "both";
  const needsDate = reportFilters.includes("date");
  const needsDateRange = reportFilters.includes("dateRange");
  const needsClinic = reportFilters.includes("clinic");
  const needsBillType = reportFilters.includes("billType");
  const needsIssuedBy = reportFilters.includes("issuedBy");
  const needsIpdFilter = reportFilters.includes("ipdFilterBy");
  const needsAppointmentReportType = reportFilters.includes("appointmentReportType");
  const needsCollectionReportType = reportFilters.includes("collectionReportType");
  const needsThreeCReportType = reportFilters.includes("threeCReportType");
  const needsIpdReportType = reportFilters.includes("ipdReportType");
  const needsBillingOverallType = reportFilters.includes("billingOverallType");
  const needsAccount = reportFilters.includes("account");
  const needsPaymentMode = reportFilters.includes("paymentMode");
  const needsDepartment = reportFilters.includes("department");
  const hasAppointmentDetailFields = reportFilters.includes("appointmentDetailFields");

  // Per-tab field visibility, matched to what each endpoint's schema accepts:
  // • Collection: Bill Type / Issued By exist only on the Detailed endpoint.
  // • Billing Overall: Revenue takes Issued By; Cash Flow adds Bill Types.
  // • 3C: both tabs take the same Bill Type list as Collection Detailed (account always "all").
  // • Appointment Analytics: Detailed swaps to gender/age/status/case-type.
  const isCashFlow = needsBillingOverallType && billingOverallType === "cashflow";
  const isCollectionDetailed = !needsCollectionReportType || collectionReportType === "detailed";
  const showBillType =
    needsBillType &&
    (needsThreeCReportType || (isCollectionDetailed && (!needsBillingOverallType || isCashFlow)));
  const showIssuedBy = needsIssuedBy && isCollectionDetailed;
  const showPaymentMode = needsPaymentMode && isCollectionDetailed;
  const showAccount = needsAccount && (!needsThreeCReportType || threeCReportType === "summary");
  const showAppointmentDetail = hasAppointmentDetailFields && appointmentReportType === "detailed";

  // Account / department still come from /reports/lookups when needed.
  // Mode of Payment uses the static billing labels (PAYMENT_MODE_OPTIONS).
  const [accountOptions, setAccountOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [paymentMode, setPaymentMode] = useState([]);
  const [deptFilter, setDeptIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    const needsLookup = needsAccount || needsDepartment || needsIpdFilter;
    if (!needsLookup) return;
    let alive = true;

    // 1) Same lookups mapping that already showed Dept 8 / 7 / 110 / 9 / 31.
    // 2) Speciality master (the list we previously dumped in full).
    // Then keep only those lookup IDs and swap in displayName.
    ApiReporting.reportLookups()
      .then((r) => {
        const data = r?.data ?? r ?? {};
        if (!alive) return [];
        const accounts = Array.isArray(data.accounts) ? data.accounts : [];
        if (accounts.length) {
          setAccountOptions([
            { value: "all", label: "All accounts" },
            ...accounts.map((a) => ({ value: String(a.id), label: a.name || `Account ${a.id}` })),
          ]);
        }
        const departments = Array.isArray(data.departments) ? data.departments : [];
        const mapped = departments
          .filter((d) => d?.id != null)
          .map((d) => ({ value: String(d.id), label: d.name || `Dept ${d.id}` }));
        if (mapped.length) setDepartmentOptions(mapped);
        return mapped;
      })
      .then((mapped) => {
        if (!alive || !mapped?.length) return;
        return getSpecialityList().then((specialities) => {
          if (!alive) return;
          const named = mapped.map((opt) => {
            const spec = findSpecialityForDeptId(specialities, opt.value);
            return { ...opt, label: specName(spec) || opt.label };
          });
          setDepartmentOptions(named);
        });
      })
      .catch((err) => {
        console.warn("[DA depts] failed", err);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, needsAccount, needsDepartment, needsIpdFilter]);

  // Case types are ids (toct_id) — listCasetype returns { status, data: { case_type } }.
  const [caseTypeOptions, setCaseTypeOptions] = useState([]);
  useEffect(() => {
    if (!open || !showAppointmentDetail || caseTypeOptions.length) return;
    let alive = true;
    ApiAppointments.getCaseTypes()
      .then((r) => {
        const rows = firstList(
          r,
          r?.data?.case_type,
          r?.data?.caseTypes,
          r?.data,
          r?.case_type,
          r?.caseTypes
        );
        if (!alive || !rows.length) return;
        setCaseTypeOptions(
          rows
            .filter((c) => c?.toct_id != null)
            .map((c) => ({ value: String(c.toct_id), label: c.toct_type || `Type ${c.toct_id}` }))
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, showAppointmentDetail, caseTypeOptions.length]);

  const resolvedReport = useMemo(() => {
    if (!report?.subFetchers) return report;
    let key;
    if (needsAppointmentReportType) key = appointmentReportType;
    else if (needsCollectionReportType) key = collectionReportType;
    else if (needsThreeCReportType) key = threeCReportType;
    else if (needsBillingOverallType) key = billingOverallType;
    else return report;

    const sub = report.subFetchers[key];
    if (!sub) return report;
    return { ...report, fetcher: sub.fetcher, exportFetcher: sub.exportFetcher };
  }, [report, appointmentReportType, collectionReportType, threeCReportType, billingOverallType, needsAppointmentReportType, needsCollectionReportType, needsThreeCReportType, needsBillingOverallType]);

  const canExport = typeof resolvedReport?.exportFetcher === "function";

  const dateRequired = needsDate || needsDateRange;
  const ownDates = resolveDates(range, {});
  const hasDates = !!(ownDates.startDate && ownDates.endDate);

  const dateError = attempted && dateRequired && !hasDates;
  const rangeTooLong = dateRequired && hasDates && rangeDaysOf(ownDates.startDate, ownDates.endDate) > MAX_REPORT_RANGE_DAYS;

  const doDownload = async () => {
    if (!resolvedReport || !canExport) return;
    if (dateRequired && !hasDates) {
      setAttempted(true);
      setToast({
        status: "error",
        title: needsDate ? "Date required" : "Period required",
        subtext: needsDate
          ? "Please select a date before downloading."
          : "Please select a date range before downloading.",
      });
      return;
    }
    if (rangeTooLong) return;
    setDownloading(true);
    setExportedRows(null);
    setToast(null);
    try {
      const { startDate, endDate } = resolveDates(range, filters);
      const base = {
        startDate,
        endDate,
        type,
        // Clinic is always the auth-token / page-locked clinic (read-only).
        // Multi-selects serialize to CSV lists; empty = all = omitted.
        clinicId: lockedClinicId,
        doctorId: filters?.doctor || undefined,
        billType: csv(billType),
        issuedBy: showIssuedBy ? csv(issuedBy) : undefined,
        gender: showAppointmentDetail ? gender : undefined,
        // fromAge/toAge apply only as a pair (appointment.model.ts)
        ageMin: showAppointmentDetail && ageMin !== "" && ageMax !== "" ? Number(ageMin) : undefined,
        ageMax: showAppointmentDetail && ageMin !== "" && ageMax !== "" ? Number(ageMax) : undefined,
        status: showAppointmentDetail ? csv(apptStatus) : undefined,
        caseType: showAppointmentDetail ? csv(caseType) : undefined,
        ipdFilterBy: ipdFilterBy || undefined,
        ipdFilterIds: csv(ipdFilterIds),
        ipdReportType: ipdReportType || undefined,
        account: needsAccount ? account : undefined,
        modeOfPayment: needsPaymentMode ? csv(paymentMode) : undefined,
        deptIds: needsDepartment ? csv(deptFilter) : undefined,
      };
      const built = resolvedReport.buildParams ? resolvedReport.buildParams(base) : base;
      const blob = await resolvedReport.exportFetcher({ ...built, format: "csv" });
      const rows = blob?.headers?.["x-report-rows"];
      if (rows != null) setExportedRows(Number(rows));
      // Empty result: tell the user why nothing useful downloaded instead of
      // saving a headers-only file.
      if (rows != null && Number(rows) === 0) {
        trackAnalytics(EVENTS.DATA_ERROR, { department, section: "reports", error_type: "empty_data", report_name: resolvedReport?.label || resolvedReport?.id });
        setToast({
          status: "info",
          title: "No data available",
          subtext: "There are no records for the selected filters and period. Try widening the date range or clearing some filters.",
        });
        return;
      }
      await downloadBlob(blob?.data ?? blob, `${resolvedReport.id}.csv`);
      trackAnalytics(EVENTS.REPORT_DOWNLOADED, { department, report_name: resolvedReport.label || resolvedReport.id, rows_exported: rows != null ? Number(rows) : undefined });
    } catch (e) {
      // Surface the failure — with the server's own reason when it sent one
      // (error payloads arrive as a Blob because the request asked for one).
      const serverMsg = await extractErrorMessage(e);
      // eslint-disable-next-line no-console
      console.warn("Report export failed", resolvedReport?.id, e?.response?.status || e?.message);
      trackAnalytics(EVENTS.REPORT_ERROR, { department, report_name: resolvedReport?.label || resolvedReport?.id, error_status: e?.response?.status || "unknown", error_message: serverMsg || e?.message || "" });
      setToast({
        status: "error",
        title: "Download failed",
        subtext: serverMsg || "The report could not be downloaded. Please try again in a moment.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DrawerContent
        side="right"
        width="40%"
        title={report?.label || "Download report"}
        description={report ? `${report.group} report` : ""}
      >
        <div className="da-report-drawer" style={{ display: "flex", flexDirection: "column", gap: 20, padding: 4 }}>
          {needsAppointmentReportType && (
            <Field label="Report Type">
              <SegmentedControl
                size="sm"
                theme="primary"
                options={APPOINTMENT_REPORT_TYPE_OPTIONS}
                value={appointmentReportType}
                onValueChange={setAppointmentReportType}
              />
            </Field>
          )}

          {needsCollectionReportType && (
            <Field label="Report Type">
              <SegmentedControl
                size="sm"
                theme="primary"
                options={COLLECTION_REPORT_TYPE_OPTIONS}
                value={collectionReportType}
                onValueChange={setCollectionReportType}
              />
            </Field>
          )}

          {needsThreeCReportType && (
            <Field label="Report Type">
              <SegmentedControl
                size="sm"
                theme="primary"
                options={THREE_C_REPORT_TYPE_OPTIONS}
                value={threeCReportType}
                onValueChange={setThreeCReportType}
              />
            </Field>
          )}

          {needsIpdReportType && (
            <Field label="Report Type">
              <SegmentedControl
                size="sm"
                theme="primary"
                options={IPD_REPORT_TYPE_OPTIONS}
                value={ipdReportType}
                onValueChange={setIpdReportType}
              />
            </Field>
          )}

          {needsBillingOverallType && (
            <Field label="Report Type">
              <SegmentedControl
                size="sm"
                theme="primary"
                options={BILLING_OVERALL_TYPE_OPTIONS}
                value={billingOverallType}
                onValueChange={setBillingOverallType}
              />
            </Field>
          )}

          {needsDept && (
            <Field label="Department">
              <SegmentedControl
                size="sm"
                theme="primary"
                options={[
                  { value: "opd", label: "OPD" },
                  { value: "ipd", label: "IPD" },
                ]}
                value={type}
                onValueChange={setType}
              />
            </Field>
          )}

          {needsClinic && (
            <Field label="Hospital">
              <Dropdown
                placeholder={lockedClinicLabel}
                options={[]}
                value={undefined}
                disabled
                chevron={false}
                ariaLabel="Hospital (locked to logged-in clinic)"
              />
            </Field>
          )}

          {needsIpdFilter && (
            <Field label="Filter By">
              <Dropdown
                placeholder="Select"
                options={IPD_FILTER_BY_OPTIONS}
                value={ipdFilterBy}
                onChange={(v) => {
                  setIpdFilterBy(v);
                  setIpdFilterIds([]);
                }}
              />
            </Field>
          )}

          {needsIpdFilter && ipdFilterBy === "doctor" && (
            <MultiField
              label="Doctors"
              placeholder="Select doctors"
              options={doctorOptions}
              value={ipdFilterIds}
              onChange={setIpdFilterIds}
            />
          )}

          {needsIpdFilter && ipdFilterBy === "department" && (
            <MultiField
              label="Departments"
              placeholder="Select departments"
              options={departmentOptions}
              value={ipdFilterIds}
              onChange={setIpdFilterIds}
            />
          )}

          {needsDate && (
            <Field label="Date" required error={dateError}>
              <DateRangePicker
                mode="single"
                size="sm"
                // Single mode expects a Date as value; onChange emits
                // { mode: "single", date, label } — normalize to {start,end}
                // so resolveDates / download params stay consistent with range mode.
                value={range?.start instanceof Date ? range.start : null}
                onChange={(v) => {
                  const date =
                    v instanceof Date
                      ? v
                      : v?.date instanceof Date
                        ? v.date
                        : v?.start instanceof Date
                          ? v.start
                          : null;
                  setRange(date ? { start: date, end: date } : null);
                  setAttempted(false);
                }}
                placeholder="Select date"
              />
            </Field>
          )}

          {needsDateRange && (
            <Field label="Period" required error={dateError}>
              <DateRangePicker
                mode="range"
                size="sm"
                showPresets
                presets={REPORT_PRESETS}
                value={range}
                onChange={(v) => {
                  setRange(v);
                  setAttempted(false);
                  const { startDate, endDate } = resolveDates(v, {});
                  if (rangeDaysOf(startDate, endDate) > MAX_REPORT_RANGE_DAYS) {
                    setToast({
                      status: "warning",
                      title: "Date range too long",
                      subtext: `Reports can be downloaded for up to ${MAX_REPORT_RANGE_DAYS} days at a time.`,
                    });
                  }
                }}
                placeholder="Select range"
              />
            </Field>
          )}

          {showBillType && (
            <MultiField
              label={needsBillingOverallType ? "Type" : "Bill Type"}
              placeholder="All types"
              options={BILL_TYPE_OPTIONS}
              value={billType}
              onChange={setBillType}
            />
          )}

          {showIssuedBy && (
            <MultiField
              label="Issued By"
              placeholder="All users"
              options={doctorOptions}
              value={issuedBy}
              onChange={setIssuedBy}
            />
          )}

          {showAccount && (
            <Field label="Account">
              <Dropdown
                placeholder="All accounts"
                options={accountOptions.length ? accountOptions : [{ value: "all", label: "All accounts" }]}
                value={account}
                onChange={(v) => setAccount(v || "all")}
                searchable={accountOptions.length > 5}
              />
            </Field>
          )}

          {showPaymentMode && (
            <MultiField
              label="Mode of Payment"
              placeholder="All modes"
              options={PAYMENT_MODE_OPTIONS}
              value={paymentMode}
              onChange={setPaymentMode}
            />
          )}

          {needsDepartment && (
            <MultiField
              label="Department"
              placeholder="All departments"
              options={departmentOptions}
              value={deptFilter}
              onChange={setDeptIds}
            />
          )}

          {showAppointmentDetail && (
            <>
              <Field label="Gender">
                <Dropdown
                  placeholder="All genders"
                  options={GENDER_OPTIONS}
                  value={gender}
                  onChange={setGender}
                  clearable
                />
              </Field>
              <Field label="Age (both fields apply together)">
                <div style={{ display: "flex", gap: 10 }}>
                  <InputBox
                    size="sm"
                    allow="numeric"
                    placeholder="Min"
                    value={ageMin}
                    onChange={(e) => setAgeMin(e?.target?.value ?? e ?? "")}
                    showLabel={false}
                    showHelper={false}
                    fullWidth
                  />
                  <InputBox
                    size="sm"
                    allow="numeric"
                    placeholder="Max"
                    value={ageMax}
                    onChange={(e) => setAgeMax(e?.target?.value ?? e ?? "")}
                    showLabel={false}
                    showHelper={false}
                    fullWidth
                  />
                </div>
              </Field>
              <MultiField
                label="Status"
                placeholder="All statuses"
                options={APPOINTMENT_STATUS_OPTIONS}
                value={apptStatus}
                onChange={setApptStatus}
              />
              <MultiField
                label="Case Type"
                placeholder="All case types"
                options={caseTypeOptions}
                value={caseType}
                onChange={setCaseType}
              />
            </>
          )}

          {exportedRows != null && exportedRows > 0 && (
            <span style={{ fontSize: 12.5, color: "var(--tesseract-success-600)" }}>
              {`${exportedRows} rows exported.`}
            </span>
          )}

          {!canExport && (
            <span style={{ fontSize: 12.5, color: "var(--tesseract-fg-secondary, var(--tesseract-slate-500))" }}>
              CSV export is not available for this report yet.
            </span>
          )}

          <Button
            variant="solid"
            theme="primary"
            leftIcon={<TPLibraryIcon name="document-download" size={16} />}
            loading={downloading}
            disabled={!canExport}
            onClick={doDownload}
            fullWidth
          >
            Download CSV
          </Button>
        </div>

        {/* Portal to <body>: DrawerContent animates with a CSS transform,
            which turns position:fixed descendants into drawer-relative
            boxes and pushes them off screen. */}
        {toast &&
          createPortal(
            <div
              className="da-report-toast"
              style={{
                position: "fixed",
                top: 24,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10000,
                minWidth: 420,
                maxWidth: "90vw",
              }}
            >
              <Toast
                status={toast.status}
                title={toast.title}
                dismissible
                duration={3000}
                progress
                onDismiss={() => setToast(null)}
              >
                {toast.subtext}
              </Toast>
            </div>,
            document.body
          )}
      </DrawerContent>
    </Drawer>
  );
}

function firstList(...candidates) {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
    if (c && typeof c === "object") {
      if (Array.isArray(c.rows) && c.rows.length) return c.rows;
      if (Array.isArray(c.list) && c.list.length) return c.list;
      if (Array.isArray(c.items) && c.items.length) return c.items;
    }
  }
  return [];
}

function specName(spec) {
  if (!spec) return null;
  return spec.displayName || spec.name || spec.dp_name || spec.speciality || null;
}

function findSpecialityForDeptId(specialities, deptId) {
  const key = String(deptId);
  return (specialities || []).find((s) =>
    [s?.id, s?.pmMasterId, s?.code, s?.dp_id, s?.dpId, s?.departmentId].some(
      (v) => v != null && String(v) === key
    )
  );
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: error
            ? "var(--tesseract-error-500, #ef4444)"
            : "var(--tesseract-fg-secondary, var(--tesseract-slate-500))",
        }}
      >
        {label}
        {required && <span style={{ color: "var(--tesseract-error-500, #ef4444)", marginLeft: 2 }}>*</span>}
      </span>
      {error ? (
        <div className="da-field-error">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

// The one multi-select every report filter uses: checkbox option rows, live
// search on longer lists, and footer "Select all" / "Clear" CTAs. Empty
// selection means "all" (the param is omitted from the export).
function MultiField({ label, placeholder, options = [], value = [], onChange }) {
  return (
    <Field label={label}>
      <Dropdown
        placeholder={placeholder}
        options={options}
        value={value}
        onChange={onChange}
        mode="multi"
        optionControl="checkbox"
        searchable={options.length > 5}
        primaryAction={{ label: "Select all", onClick: () => onChange(options.map((o) => o.value)) }}
        secondaryAction={{ label: "Clear", onClick: () => onChange([]) }}
        ariaLabel={`Select ${label}`}
      />
    </Field>
  );
}

// Multi-select array → CSV list; empty = all = omitted.
function csv(arr) {
  return Array.isArray(arr) && arr.length ? arr.join(",") : undefined;
}

// Multi-select CSV → single id when exactly one is selected, else undefined
// (single-value endpoints; withholding beats mis-filtering).
function singleId(csvStr) {
  const s = csvStr == null ? "" : String(csvStr);
  return s && !s.includes(",") ? s : undefined;
}

function resolveDates(range, filters) {
  // Use local YYYY-MM-DD (same as dashboard periods.isoLocal) — toISOString
  // shifts local midnight back one calendar day in +ve offsets like IST.
  const toLocalDate = (d) => {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : isoLocal(dt);
  };
  // Bare Date (single-mode value) or picker payloads:
  // range → { start, end }; single → { date } (also accept from/to / arrays).
  if (range instanceof Date) {
    const d = toLocalDate(range);
    return { startDate: d || filters?.startDate, endDate: d || filters?.endDate };
  }
  const start = range?.start || range?.from || range?.date || (Array.isArray(range) ? range[0] : null);
  const end = range?.end || range?.to || range?.date || (Array.isArray(range) ? range[1] : null) || start;
  return {
    startDate: (start && toLocalDate(start)) || filters?.startDate,
    endDate: (end && toLocalDate(end)) || filters?.endDate,
  };
}

// Axios error → the server's own error line. Blob responses (CSV requests)
// need reading + parsing before the message is visible.
async function extractErrorMessage(e) {
  try {
    let data = e?.response?.data;
    if (data instanceof Blob) data = JSON.parse(await data.text());
    else if (typeof data === "string") data = JSON.parse(data);
    return data?.error || data?.message || null;
  } catch {
    return null;
  }
}
