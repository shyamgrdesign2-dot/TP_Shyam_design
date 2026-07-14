import React, { useState, useMemo, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DateRangePicker,
  SegmentedControl,
  Dropdown,
  Button,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";
import { downloadBlob } from "./tableUtils";
import useFilterOptions from "../data/useFilterOptions";
import {
  BILL_TYPE_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  IPD_FILTER_BY_OPTIONS,
  APPOINTMENT_REPORT_TYPE_OPTIONS,
  COLLECTION_REPORT_TYPE_OPTIONS,
  INCENTIVE_REPORT_TYPE_OPTIONS,
  THREE_C_REPORT_TYPE_OPTIONS,
  THREE_C_SELECT_TYPE_OPTIONS,
  CLINICAL_DATA_OPTIONS,
  IPD_REPORT_TYPE_OPTIONS,
} from "./reportsCatalog";

export default function ReportDownloadDrawer({ report, department = "opd", filters, onClose }) {
  const open = !!report;
  const [range, setRange] = useState(null);
  const [type, setType] = useState(department);
  const [downloading, setDownloading] = useState(false);
  // "N rows exported" / "0 rows for these filters" from the X-Report-Rows
  // header every CSV export now carries (API-CONTRACTS-CURRENT §1).
  const [exportedRows, setExportedRows] = useState(null);

  const [billType, setBillType] = useState(undefined);
  const [paymentMode, setPaymentMode] = useState(undefined);
  const [issuedBy, setIssuedBy] = useState(undefined);
  const [accountant, setAccountant] = useState(undefined);
  const [clinicId, setClinicId] = useState(undefined);
  const [ipdFilterBy, setIpdFilterBy] = useState(undefined);

  const [appointmentReportType, setAppointmentReportType] = useState("general");
  const [collectionReportType, setCollectionReportType] = useState("general");
  const [incentiveReportType, setIncentiveReportType] = useState("detailed");
  const [threeCReportType, setThreeCReportType] = useState("summary");
  const [ipdReportType, setIpdReportType] = useState("admitting");
  const [clinicalData, setClinicalData] = useState(undefined);
  const [selectType, setSelectType] = useState(undefined);
  const [incentiveUser, setIncentiveUser] = useState(undefined);
  const [deptFilter, setDeptFilter] = useState(undefined);

  useEffect(() => {
    if (open) {
      setRange(null);
      setType(department);
      setBillType(undefined);
      setPaymentMode(undefined);
      setIssuedBy(undefined);
      setAccountant(undefined);
      setClinicId(undefined);
      setIpdFilterBy(undefined);
      setAppointmentReportType("general");
      setCollectionReportType("general");
      setIncentiveReportType("detailed");
      setThreeCReportType("summary");
      setIpdReportType("admitting");
      setClinicalData(undefined);
      setSelectType(undefined);
      setIncentiveUser(undefined);
      setDeptFilter(undefined);
    }
  }, [open, department]);

  // Same live doctor + clinic sources as the page FilterBar (Redux with API
  // fallback; hospital_data lives on the DOCTORS slice) — the old direct
  // selectors here read a dead path, so these dropdowns were always empty.
  const { doctorOptions, clinicOptions } = useFilterOptions();

  const reportFilters = report?.filters || [];

  const needsDept = report?.dept === "both";
  const needsDate = reportFilters.includes("date");
  const needsDateRange = reportFilters.includes("dateRange");
  const needsClinic = reportFilters.includes("clinic");
  const needsBillType = reportFilters.includes("billType");
  const needsPaymentMode = reportFilters.includes("paymentMode");
  const needsIssuedBy = reportFilters.includes("issuedBy");
  const needsAccountant = reportFilters.includes("accountant");
  const needsIpdFilter = reportFilters.includes("ipdFilterBy");
  const needsAppointmentReportType = reportFilters.includes("appointmentReportType");
  const needsCollectionReportType = reportFilters.includes("collectionReportType");
  const needsIncentiveReportType = reportFilters.includes("incentiveReportType");
  const needsThreeCReportType = reportFilters.includes("threeCReportType");
  const needsIpdReportType = reportFilters.includes("ipdReportType");
  const needsClinicalData = reportFilters.includes("clinicalData");
  const needsSelectType = reportFilters.includes("selectType");
  const needsIncentiveUser = reportFilters.includes("incentiveUser");
  const needsDepartment = reportFilters.includes("department");

  const resolvedReport = useMemo(() => {
    if (!report?.subFetchers) return report;
    let key;
    if (needsAppointmentReportType) key = appointmentReportType;
    else if (needsCollectionReportType) key = collectionReportType;
    else if (needsIncentiveReportType) key = incentiveReportType;
    else if (needsThreeCReportType) key = threeCReportType;
    else return report;

    const sub = report.subFetchers[key];
    if (!sub) return report;
    return { ...report, fetcher: sub.fetcher, exportFetcher: sub.exportFetcher };
  }, [report, appointmentReportType, collectionReportType, incentiveReportType, threeCReportType, needsAppointmentReportType, needsCollectionReportType, needsIncentiveReportType, needsThreeCReportType]);

  const canExport = typeof resolvedReport?.exportFetcher === "function";

  const doDownload = async () => {
    if (!resolvedReport || !canExport) return;
    setDownloading(true);
    setExportedRows(null);
    try {
      const { startDate, endDate } = resolveDates(range, filters);
      const base = {
        startDate,
        endDate,
        type,
        // The page-level filters follow into the download: the drawer's own
        // clinic pick wins, else the FilterBar selection. The report
        // endpoints accept a SINGLE id today (contract §Reports), so a
        // multi-select is withheld rather than silently mis-filtered.
        clinicId: clinicId || singleId(filters?.clinic),
        doctorId: singleId(filters?.doctor),
        billType: billType || undefined,
        paymentMode: paymentMode || undefined,
        issuedBy: issuedBy || undefined,
        accountant: accountant || undefined,
        ipdFilterBy: ipdFilterBy || undefined,
        ipdReportType: ipdReportType || undefined,
        clinicalData: clinicalData || undefined,
        selectType: selectType || undefined,
        incentiveUser: incentiveUser || undefined,
        department: deptFilter || undefined,
      };
      const built = resolvedReport.buildParams ? resolvedReport.buildParams(base) : base;
      const blob = await resolvedReport.exportFetcher({ ...built, format: "csv" });
      const rows = blob?.headers?.["x-report-rows"];
      if (rows != null) setExportedRows(Number(rows));
      downloadBlob(blob?.data ?? blob, `${resolvedReport.id}.csv`);
    } catch (e) {
      // Endpoint not deployed / errored — surface it instead of a silent no-op
      // eslint-disable-next-line no-console
      console.warn("Report export failed", resolvedReport?.id, e?.response?.status || e?.message);
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
              />
            </Field>
          )}

          {needsIpdFilter && (
            <Field label="Department or Doctor">
              <Dropdown
                placeholder="Select"
                options={IPD_FILTER_BY_OPTIONS}
                value={ipdFilterBy}
                onChange={setIpdFilterBy}
              />
            </Field>
          )}

          {needsIncentiveUser && (
            <Field label="Incentive User">
              <Dropdown
                placeholder="Select Incentive User"
                options={doctorOptions}
                value={incentiveUser}
                onChange={setIncentiveUser}
              />
            </Field>
          )}

          {needsDepartment && (
            <Field label="Department">
              <Dropdown
                placeholder="Select"
                options={IPD_FILTER_BY_OPTIONS}
                value={deptFilter}
                onChange={setDeptFilter}
              />
            </Field>
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
                value={range}
                onChange={setRange}
                placeholder="Select range"
              />
            </Field>
          )}

          {needsBillType && (
            <Field label="Bill Type">
              <Dropdown
                placeholder="All types"
                options={BILL_TYPE_OPTIONS}
                value={billType}
                onChange={setBillType}
              />
            </Field>
          )}

          {needsPaymentMode && (
            <Field label="Payment Mode">
              <Dropdown
                placeholder="All modes"
                options={PAYMENT_MODE_OPTIONS}
                value={paymentMode}
                onChange={setPaymentMode}
              />
            </Field>
          )}

          {needsIssuedBy && (
            <Field label="Issued By">
              <Dropdown
                placeholder="All users"
                options={doctorOptions}
                value={issuedBy}
                onChange={setIssuedBy}
              />
            </Field>
          )}

          {needsAccountant && (
            <Field label="Accountant">
              <Dropdown
                placeholder="All users"
                options={doctorOptions}
                value={accountant}
                onChange={setAccountant}
              />
            </Field>
          )}

          {needsSelectType && (
            <Field label="Select Type">
              <Dropdown
                placeholder="Select"
                options={THREE_C_SELECT_TYPE_OPTIONS}
                value={selectType}
                onChange={setSelectType}
              />
            </Field>
          )}

          {needsClinicalData && (
            <Field label="Clinical Data">
              <SegmentedControl
                size="sm"
                theme="primary"
                options={CLINICAL_DATA_OPTIONS}
                value={clinicalData || "no"}
                onValueChange={setClinicalData}
              />
            </Field>
          )}

          {exportedRows != null && (
            <span
              style={{
                fontSize: 12.5,
                color:
                  exportedRows === 0
                    ? "var(--tesseract-warning-600)"
                    : "var(--tesseract-success-600)",
              }}
            >
              {exportedRows === 0
                ? "No records found for these filters — the file has headers only."
                : `${exportedRows} rows exported.`}
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

// Multi-select CSV → single id when exactly one is selected, else undefined
// (report endpoints accept one id; withholding beats mis-filtering).
function singleId(csv) {
  const s = csv == null ? "" : String(csv);
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
