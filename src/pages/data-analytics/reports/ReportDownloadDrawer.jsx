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
import ApiReporting from "../../../api/services/ApiReporting";
import ApiAppointments from "../../../api/services/ApiAppointments";
import {
  BILL_TYPE_OPTIONS,
  THREE_C_BILL_TYPE_OPTIONS,
  GENDER_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  BILLING_OVERALL_TYPE_OPTIONS,
  IPD_FILTER_BY_OPTIONS,
  APPOINTMENT_REPORT_TYPE_OPTIONS,
  COLLECTION_REPORT_TYPE_OPTIONS,
  INCENTIVE_REPORT_TYPE_OPTIONS,
  THREE_C_REPORT_TYPE_OPTIONS,
  IPD_REPORT_TYPE_OPTIONS,
} from "./reportsCatalog";

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
  const [range, setRange] = useState(null);
  const [type, setType] = useState(department);
  const [downloading, setDownloading] = useState(false);
  // "N rows exported" / "0 rows for these filters" from the X-Report-Rows
  // header every CSV export carries (API-CONTRACTS-CURRENT §1).
  const [exportedRows, setExportedRows] = useState(null);
  // Tesseract Toast: { status, title, subtext } — the drawer's one feedback
  // surface for range violations, empty results and failed downloads.
  const [toast, setToast] = useState(null);

  // Multi-selects (checkbox dropdowns): arrays of the backend's own tokens/
  // ids, empty = "all". Serialized to CSV at download time.
  const [billType, setBillType] = useState([]);
  const [threeCBillTypes, setThreeCBillTypes] = useState([]);
  const [issuedBy, setIssuedBy] = useState([]);
  const [incentiveUser, setIncentiveUser] = useState([]);
  const [apptStatus, setApptStatus] = useState([]);
  const [caseType, setCaseType] = useState([]);
  const [ipdFilterIds, setIpdFilterIds] = useState([]);

  // Singles — gender is matched verbatim in SQL (`pm_gender = ?`), account
  // is REQUIRED by 3C ("all" sentinel accepted).
  const [clinicId, setClinicId] = useState(undefined);
  const [gender, setGender] = useState(undefined);
  const [account, setAccount] = useState("all");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [ipdFilterBy, setIpdFilterBy] = useState(undefined);

  const [appointmentReportType, setAppointmentReportType] = useState("general");
  const [collectionReportType, setCollectionReportType] = useState("general");
  const [incentiveReportType, setIncentiveReportType] = useState("detailed");
  const [threeCReportType, setThreeCReportType] = useState("summary");
  const [ipdReportType, setIpdReportType] = useState("admitting");
  const [billingOverallType, setBillingOverallType] = useState("revenue");

  useEffect(() => {
    if (open) {
      setRange(null);
      setType(department);
      setBillType([]);
      setThreeCBillTypes([]);
      setIssuedBy([]);
      setIncentiveUser([]);
      setApptStatus([]);
      setCaseType([]);
      setIpdFilterIds([]);
      setClinicId(undefined);
      setGender(undefined);
      setAccount("all");
      setAgeMin("");
      setAgeMax("");
      setIpdFilterBy(undefined);
      setAppointmentReportType("general");
      setCollectionReportType("general");
      setIncentiveReportType("detailed");
      setThreeCReportType("summary");
      setIpdReportType("admitting");
      setBillingOverallType("revenue");
      setExportedRows(null);
      setToast(null);
    }
  }, [open, department]);

  // Same live doctor + clinic sources as the page FilterBar (Redux with API
  // fallback; hospital_data lives on the DOCTORS slice).
  const { doctorOptions, clinicOptions } = useFilterOptions();

  const reportFilters = report?.filters || [];

  const needsDept = report?.dept === "both";
  const needsDate = reportFilters.includes("date");
  const needsDateRange = reportFilters.includes("dateRange");
  const needsClinic = reportFilters.includes("clinic");
  const needsBillType = reportFilters.includes("billType");
  const needsThreeCBillTypes = reportFilters.includes("threeCBillTypes");
  const needsIssuedBy = reportFilters.includes("issuedBy");
  const needsIpdFilter = reportFilters.includes("ipdFilterBy");
  const needsAppointmentReportType = reportFilters.includes("appointmentReportType");
  const needsCollectionReportType = reportFilters.includes("collectionReportType");
  const needsIncentiveReportType = reportFilters.includes("incentiveReportType");
  const needsThreeCReportType = reportFilters.includes("threeCReportType");
  const needsIpdReportType = reportFilters.includes("ipdReportType");
  const needsBillingOverallType = reportFilters.includes("billingOverallType");
  const needsIncentiveUser = reportFilters.includes("incentiveUser");
  const needsAccount = reportFilters.includes("account");
  const hasAppointmentDetailFields = reportFilters.includes("appointmentDetailFields");

  // Per-tab field visibility, matched to what each endpoint's schema accepts:
  // • Collection: Bill Type / Issued By exist only on the Detailed endpoint.
  // • Billing Overall: Revenue takes Issued By; Cash Flow adds Bill Types.
  // • 3C: Summary takes account + billTypes; Details takes incentive users.
  // • Appointment Analytics: Detailed swaps to gender/age/status/case-type.
  const isCashFlow = needsBillingOverallType && billingOverallType === "cashflow";
  const isCollectionDetailed = !needsCollectionReportType || collectionReportType === "detailed";
  const showBillType = needsBillType && isCollectionDetailed && (!needsBillingOverallType || isCashFlow);
  const showIssuedBy = needsIssuedBy && isCollectionDetailed;
  const showThreeCBillTypes = needsThreeCBillTypes && threeCReportType === "summary";
  const showAccount = needsAccount && (!needsThreeCReportType || threeCReportType === "summary");
  const showIncentiveUser = needsIncentiveUser && (!needsThreeCReportType || threeCReportType === "details");
  const showAppointmentDetail = hasAppointmentDetailFields && appointmentReportType === "detailed";

  // Case types are ids (toct_id) — pulled from the EMR's own case-type list.
  const [caseTypeOptions, setCaseTypeOptions] = useState([]);
  useEffect(() => {
    if (!open || !showAppointmentDetail || caseTypeOptions.length) return;
    let alive = true;
    ApiAppointments.getCaseTypes()
      .then((r) => {
        const rows = Array.isArray(r) ? r : r?.data ?? r?.caseTypes ?? [];
        if (alive && Array.isArray(rows) && rows.length) {
          setCaseTypeOptions(
            rows
              .filter((c) => c?.toct_id != null)
              .map((c) => ({ value: String(c.toct_id), label: c.toct_type || `Type ${c.toct_id}` }))
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, showAppointmentDetail, caseTypeOptions.length]);

  // Incentive users are tim_ids (NOT doctor um_ids) and have no lookup
  // endpoint — the incentive OVERALL rows carry { timId, incentiveUser },
  // so they double as the picker's option source.
  const [incentiveUserOptions, setIncentiveUserOptions] = useState([]);
  useEffect(() => {
    if (!open || !showIncentiveUser || incentiveUserOptions.length) return;
    let alive = true;
    const { startDate, endDate } = resolveDates(range, filters);
    if (!startDate || !endDate) return;
    ApiReporting.financialIncentiveOverall({ startDate, endDate, limit: 100 })
      .then((r) => {
        const rows = (r?.data ?? r)?.rows || [];
        if (alive && rows.length) {
          setIncentiveUserOptions(
            rows
              .filter((u) => u?.timId != null)
              .map((u) => ({ value: String(u.timId), label: u.incentiveUser || `User ${u.timId}` }))
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showIncentiveUser, incentiveUserOptions.length]);

  const resolvedReport = useMemo(() => {
    if (!report?.subFetchers) return report;
    let key;
    if (needsAppointmentReportType) key = appointmentReportType;
    else if (needsCollectionReportType) key = collectionReportType;
    else if (needsIncentiveReportType) key = incentiveReportType;
    else if (needsThreeCReportType) key = threeCReportType;
    else if (needsBillingOverallType) key = billingOverallType;
    else return report;

    const sub = report.subFetchers[key];
    if (!sub) return report;
    return { ...report, fetcher: sub.fetcher, exportFetcher: sub.exportFetcher };
  }, [report, appointmentReportType, collectionReportType, incentiveReportType, threeCReportType, billingOverallType, needsAppointmentReportType, needsCollectionReportType, needsIncentiveReportType, needsThreeCReportType, needsBillingOverallType]);

  const canExport = typeof resolvedReport?.exportFetcher === "function";

  const doDownload = async () => {
    if (!resolvedReport || !canExport) return;
    // Server-enforced export window: every report endpoint 400s beyond 31
    // days — surface the reason instead of a silent no-op.
    if (needsDate || needsDateRange) {
      const { startDate, endDate } = resolveDates(range, filters);
      const days = rangeDaysOf(startDate, endDate);
      if (days > MAX_REPORT_RANGE_DAYS) {
        setToast({
          status: "warning",
          title: "Date range too long",
          subtext: `Reports can be downloaded for up to ${MAX_REPORT_RANGE_DAYS} days at a time. Please pick a shorter period.`,
        });
        return;
      }
    }
    setDownloading(true);
    setExportedRows(null);
    setToast(null);
    try {
      const { startDate, endDate } = resolveDates(range, filters);
      const base = {
        startDate,
        endDate,
        type,
        // The page-level filters follow into the download: the drawer's own
        // clinic pick wins, else the FilterBar selection. Multi-selects
        // serialize to CSV lists; empty = all = omitted.
        clinicId: clinicId || singleId(filters?.clinic),
        doctorId: filters?.doctor || undefined,
        billType: csv(billType),
        threeCBillTypes: csv(threeCBillTypes),
        issuedBy: showIssuedBy ? csv(issuedBy) : undefined,
        incentiveUser: showIncentiveUser ? csv(incentiveUser) : undefined,
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
      };
      const built = resolvedReport.buildParams ? resolvedReport.buildParams(base) : base;
      const blob = await resolvedReport.exportFetcher({ ...built, format: "csv" });
      const rows = blob?.headers?.["x-report-rows"];
      if (rows != null) setExportedRows(Number(rows));
      // Empty result: tell the user why nothing useful downloaded instead of
      // saving a headers-only file.
      if (rows != null && Number(rows) === 0) {
        setToast({
          status: "info",
          title: "No data available",
          subtext: "There are no records for the selected filters and period. Try widening the date range or clearing some filters.",
        });
        return;
      }
      downloadBlob(blob?.data ?? blob, `${resolvedReport.id}.csv`);
    } catch (e) {
      // Surface the failure — with the server's own reason when it sent one
      // (error payloads arrive as a Blob because the request asked for one).
      const serverMsg = await extractErrorMessage(e);
      // eslint-disable-next-line no-console
      console.warn("Report export failed", resolvedReport?.id, e?.response?.status || e?.message);
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 4 }}>
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

          {needsIncentiveReportType && (
            <Field label="Report Type">
              <SegmentedControl
                size="sm"
                theme="primary"
                options={INCENTIVE_REPORT_TYPE_OPTIONS}
                value={incentiveReportType}
                onValueChange={setIncentiveReportType}
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
                placeholder="Select"
                options={clinicOptions}
                value={clinicId}
                onChange={setClinicId}
                searchable={clinicOptions.length > 5}
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

          {showIncentiveUser && (
            <MultiField
              label="Incentive User"
              placeholder="All users"
              options={incentiveUserOptions}
              value={incentiveUser}
              onChange={setIncentiveUser}
            />
          )}

          {needsDate && (
            <Field label="Date">
              <DateRangePicker
                mode="single"
                size="sm"
                showPresets
                value={range}
                onChange={setRange}
                placeholder="Select date"
              />
            </Field>
          )}

          {needsDateRange && (
            <Field label="Period">
              <DateRangePicker
                mode="range"
                size="sm"
                showPresets
                presets={REPORT_PRESETS}
                value={range}
                onChange={(v) => {
                  setRange(v);
                  // Immediate feedback when a hand-picked range exceeds the
                  // export window (presets can never exceed it).
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

          {showThreeCBillTypes && (
            <MultiField
              label="Bill Type"
              placeholder="All types"
              options={THREE_C_BILL_TYPE_OPTIONS}
              value={threeCBillTypes}
              onChange={setThreeCBillTypes}
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
                options={[{ value: "all", label: "All accounts" }]}
                value={account}
                onChange={(v) => setAccount(v || "all")}
              />
            </Field>
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
              style={{
                position: "fixed",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10000,
                width: "max-content",
                maxWidth: "90vw",
              }}
            >
              <Toast
                status={toast.status}
                title={toast.title}
                subtext={toast.subtext}
                withSubtext={!!toast.subtext}
                withCTA={false}
                dismissible
                duration={5000}
                progress
                onDismiss={() => setToast(null)}
              />
            </div>,
            document.body
          )}
      </DrawerContent>
    </Drawer>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--tesseract-fg-secondary, var(--tesseract-slate-500))",
        }}
      >
        {label}
      </span>
      {children}
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
        withActions
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
  const start = range?.start || range?.from || (Array.isArray(range) ? range[0] : null);
  const end = range?.end || range?.to || (Array.isArray(range) ? range[1] : null);
  const toISO = (d) => {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  };
  return {
    startDate: (start && toISO(start)) || filters?.startDate,
    endDate: (end && toISO(end)) || filters?.endDate,
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
