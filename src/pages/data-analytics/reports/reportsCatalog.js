import ApiReporting from "../../../api/services/ApiReporting";

const IC = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/";
const dates = (f) => ({ startDate: f?.startDate, endDate: f?.endDate });

// Bill/document types — the EXACT tokens the Pm-Core schemas accept
// (collection.schema.ts / billingOverall.schema.ts: "CSV subset of
// cash_memo,receipt,advance,refund"). Multi-select; empty = all.
export const BILL_TYPE_OPTIONS = [
  { value: "cash_memo", label: "Cash Memo" },
  { value: "receipt", label: "Receipt" },
  { value: "advance", label: "Advance" },
  { value: "refund", label: "Refund" },
];

// pm_gender is matched verbatim in SQL (appointment.model.ts) — capitalized,
// single value (the column filter is `= ?`, not an IN list).
export const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Others", label: "Others" },
];

// pam_status codes (appointment.constant.ts): 0=Queue, 1=Arrived, 2=Engaged,
// 3=Finished, 4=Cancelled, 6=Draft. The `statuses` param is a CSV of these codes.
export const APPOINTMENT_STATUS_OPTIONS = [
  { value: "0", label: "In Queue" },
  { value: "1", label: "Arrived" },
  { value: "2", label: "Engaged" },
  { value: "3", label: "Completed" },
  { value: "4", label: "Cancelled" },
  { value: "6", label: "Draft" },
];

export const BILLING_OVERALL_TYPE_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "cashflow", label: "Cash Flow" },
];

// New OPD billing MOP labels — stored/filtered as these exact strings.
export const PAYMENT_MODE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "UPI", label: "UPI" },
  { value: "Cheque", label: "Cheque" },
  { value: "Advance Deposit", label: "Advance Deposit" },
  { value: "Others", label: "Others" },
];

// HIS / PHP IPD payment modes (data_analytics_reports.php IPD drawers).
export const IPD_PAYMENT_MODE_OPTIONS = [
  { value: "Bank Credit Cards", label: "Bank Credit Cards" },
  { value: "Online Bank Transfers", label: "Online Bank Transfers" },
  { value: "Bank Transfers", label: "Bank Transfers" },
  { value: "Mobile Payments", label: "Mobile Payments" },
  { value: "E-wallet Payments", label: "E-wallet Payments" },
  { value: "UPI", label: "UPI" },
];

export const IPD_FILTER_BY_OPTIONS = [
  { value: "doctor", label: "Doctor" },
  { value: "department", label: "Department" },
];

export const APPOINTMENT_REPORT_TYPE_OPTIONS = [
  { value: "general", label: "General Report" },
  { value: "detailed", label: "Detailed Report" },
  { value: "overall", label: "Overall Report" },
];

export const COLLECTION_REPORT_TYPE_OPTIONS = [
  { value: "general", label: "General Report" },
  { value: "detailed", label: "Detailed Report" },
  { value: "daywise", label: "Day Wise Report" },
];

export const INCENTIVE_REPORT_TYPE_OPTIONS = [
  { value: "detailed", label: "Detailed Report" },
  { value: "overall", label: "Overall Report" },
];

export const THREE_C_REPORT_TYPE_OPTIONS = [
  { value: "summary", label: "Summary" },
  { value: "details", label: "Details" },
];


export const IPD_REPORT_TYPE_OPTIONS = [
  { value: "admitting", label: "Admitting Report" },
  { value: "discharged", label: "Discharged Report" },
];

// roleId — the LEGACY role/right id (tbl_role_master.rm_id) that gates this
// tile, mirroring the PHP in_array checks in data_analytics_reports.php:
//   389 Daily Collection · 390 Collection Report · 392 3C ·
//   393 Billing Overall · 387 Appointment Analytics · 388 Prescription/
//   Medicine Analytics · 22 IPD reports/analytics.
// usePermissions().canView(roleId) decides visibility; tiles with no roleId
// are never gated. Grants come live from the admin panel's Role Assignment.
export const REPORTS = [
  // --- Financial ---
  {
    id: "daily-collection", roleId: 389, group: "Financial", dept: "both",
    icon: `${IC}money/receipt.svg`,
    label: "Daily Collection",
    desc: "Cash memo, receipt, advance and refund for a single day.",
    live: true,
    filters: ["date", "clinic"],
    fetcher: ApiReporting.financialDailyCollection,
    exportFetcher: ApiReporting.exportFinancialDailyCollection,
    buildParams: (f) => ({ type: f?.type || "opd", date: f?.endDate, clinicId: f?.clinicId, doctorId: f?.doctorId }),
  },
  {
    id: "collection-report", roleId: 390, group: "Financial", dept: "both",
    icon: `${IC}money/money-recive.svg`,
    label: "Collection Report",
    desc: "Day-wise or detailed collection by date, bill type and payment mode.",
    live: true,
    filters: ["collectionReportType", "dateRange", "billType", "issuedBy", "paymentMode"],
    fetcher: ApiReporting.financialCollectionSummary,
    exportFetcher: ApiReporting.exportFinancialCollectionSummary,
    subFetchers: {
      general: { fetcher: ApiReporting.financialCollectionSummary, exportFetcher: ApiReporting.exportFinancialCollectionSummary },
      detailed: { fetcher: ApiReporting.financialCollectionDetailed, exportFetcher: ApiReporting.exportFinancialCollectionDetailed },
      daywise: { fetcher: ApiReporting.financialCollectionSummary, exportFetcher: ApiReporting.exportFinancialCollectionSummary },
    },
    buildParams: (f) => ({
      ...dates(f),
      type: f?.type || "opd",
      clinicId: f?.clinicId,
      billTypes: f?.billType,
      issuedBy: f?.issuedBy,
      modeOfPayment: f?.modeOfPayment,
      account: f?.type === "ipd" ? f?.account : undefined,
    }),
  },
  {
    id: "incentive-report", group: "Financial", dept: "ipd",
    icon: `${IC}money/money-add.svg`,
    label: "Incentive Reports",
    desc: "Per-user and service-level incentive payouts.",
    // incentive.schema.ts: detailed takes `user` = CSV of incentive-user ids
    // (tim_id, NOT um_id); overall takes only dates + type. No department
    // dimension exists on this endpoint.
    filters: ["incentiveReportType", "dateRange", "incentiveUser"],
    subFetchers: {
      detailed: { fetcher: ApiReporting.financialIncentiveDetailed, exportFetcher: ApiReporting.exportFinancialIncentiveDetailed },
      overall: { fetcher: ApiReporting.financialIncentiveOverall, exportFetcher: ApiReporting.exportFinancialIncentiveOverall },
    },
    fetcher: ApiReporting.financialIncentiveDetailed,
    exportFetcher: ApiReporting.exportFinancialIncentiveDetailed,
    buildParams: (f) => ({ ...dates(f), type: f?.type || "ipd", user: f?.incentiveUser }),
  },
  {
    id: "3c-report", roleId: 392, group: "Financial", dept: "both",
    icon: `${IC}content-edit/bill.svg`,
    label: "3C Report",
    desc: "Cash, invoice and credit-note breakdown.",
    // threeC.schema.ts: summary still requires `account` ("all" sentinel);
    // the Account picker is out of scope so we always send "all".
    // dept "both" drives the inner OPD|IPD toggle in ReportDownloadDrawer
    // (needsDept = report.dept === "both") — same as Collection / Billing Overall.
    filters: ["dateRange", "billType"],
    fetcher: ApiReporting.financialThreeC,
    exportFetcher: ApiReporting.exportFinancialThreeC,
    buildParams: (f) => ({ ...dates(f), type: f?.type || "opd", account: "all", billTypes: f?.billType }),
  },
  {
    id: "billing-overall", roleId: 393, group: "Financial", dept: "both",
    icon: `${IC}essential/chart.svg`,
    label: "Billing Overall Reports",
    desc: "Revenue and cash-flow reports across the whole practice.",
    filters: ["billingOverallType", "dateRange", "billType", "issuedBy", "paymentMode"],
    subFetchers: {
      revenue: { fetcher: ApiReporting.financialBillingOverallRevenue, exportFetcher: ApiReporting.exportFinancialBillingOverallRevenue },
      cashflow: { fetcher: ApiReporting.financialBillingOverallCashFlow, exportFetcher: ApiReporting.exportFinancialBillingOverallCashFlow },
    },
    fetcher: ApiReporting.financialBillingOverallRevenue,
    exportFetcher: ApiReporting.exportFinancialBillingOverallRevenue,
    buildParams: (f) => ({
      ...dates(f),
      type: f?.type || "opd",
      clinicId: f?.clinicId,
      billTypes: f?.billType,
      issuedBy: f?.issuedBy,
      modeOfPayment: f?.modeOfPayment,
      accountant: f?.type === "ipd" ? (f?.accountant || f?.account) : undefined,
    }),
  },
  {
    id: "ipd-reports", roleId: 22, group: "Financial", dept: "ipd",
    icon: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/linear/content-edit/document-text.svg",
    label: "IPD Reports",
    desc: "Inpatient admitting and discharged reports for the selected period.",
    live: true,
    filters: ["ipdReportType", "dateRange", "clinic", "ipdFilterBy"],
    fetcher: ApiReporting.financialIpdReports,
    exportFetcher: ApiReporting.exportFinancialIpdReports,
    buildParams: (f) => ({ ...dates(f), reportType: f?.ipdReportType || "admitting", clinicId: f?.clinicId, filterBy: f?.ipdFilterBy, ids: f?.ipdFilterIds }),
  },
  // --- Clinical ---
  {
    id: "appointment-analytics", roleId: 387, group: "Clinical", dept: "opd",
    icon: `${IC}medical/clipboard-activity.svg`,
    label: "Appointment Analytics",
    desc: "Appointment status and doctor-wise breakdown.",
    // Legacy PHP (data_analytics_reports.php):
    //   General  → hospital, dates, clinicalData yes/no
    //   Overall  → hospital, department-or-doctor, doctor/dept ids, dates
    //   Detailed → gender, age, status, case type (appointment.schema.ts)
    filters: ["appointmentReportType", "dateRange", "clinic", "appointmentDetailFields"],
    subFetchers: {
      general: { fetcher: ApiReporting.clinicalAppointmentOverall, exportFetcher: ApiReporting.exportClinicalAppointmentOverall },
      detailed: { fetcher: ApiReporting.clinicalAppointmentDetailed, exportFetcher: ApiReporting.exportClinicalAppointmentDetailed },
      overall: { fetcher: ApiReporting.clinicalAppointmentOverall, exportFetcher: ApiReporting.exportClinicalAppointmentOverall },
    },
    fetcher: ApiReporting.clinicalAppointmentOverall,
    exportFetcher: ApiReporting.exportClinicalAppointmentOverall,
    buildParams: (f) => {
      const base = { ...dates(f), clinicId: f?.clinicId };
      const kind = f?.appointmentReportType || "general";
      if (kind === "detailed") {
        return {
          ...base,
          gender: f?.gender,
          ...(f?.ageMin != null && f?.ageMax != null ? { fromAge: f.ageMin, toAge: f.ageMax } : {}),
          statuses: f?.status,
          caseTypes: f?.caseType,
          doctorIds: f?.doctorId,
        };
      }
      if (kind === "overall") {
        const ids = f?.ipdFilterIds;
        return {
          ...base,
          reportType: "overall",
          filterBy: f?.ipdFilterBy,
          ids,
          ...(f?.ipdFilterBy === "doctor" && ids ? { doctorIds: ids } : {}),
          ...(f?.ipdFilterBy === "department" && ids ? { departmentIds: ids } : {}),
        };
      }
      return {
        ...base,
        reportType: "general",
        ...(f?.clinicalData ? { clinicalData: f.clinicalData } : {}),
      };
    },
  },
  {
    id: "ipd-analytics", roleId: 22, group: "Clinical", dept: "ipd",
    icon: `${IC}medical/clipboard-activity.svg`,
    label: "IPD Analytics",
    desc: "IPD census for the selected period.",
    filters: ["dateRange"],
    fetcher: ApiReporting.financialIpdCensusReport,
    exportFetcher: ApiReporting.exportFinancialIpdCensusReport,
    buildParams: (f) => ({ ...dates(f) }),
  },
  {
    id: "prescription-analytics", roleId: 388, group: "Clinical", dept: "opd",
    icon: `${IC}content-edit/document-sketch.svg`,
    label: "Prescription Analytics",
    desc: "Brand, generic and company prescription volumes.",
    filters: ["dateRange"],
    fetcher: ApiReporting.clinicalPrescriptionAnalytics,
    exportFetcher: ApiReporting.exportClinicalPrescriptionAnalytics,
    buildParams: (f) => ({ ...dates(f), clinicId: f?.clinicId, doctorId: f?.doctorId }),
  },
  {
    id: "prescription-medicine", roleId: 388, group: "Clinical", dept: "opd",
    icon: `${IC}medical/tablets.svg`,
    label: "Prescription Medicine Detailed",
    desc: "Medicine-level prescription detail for OPD.",
    filters: ["dateRange"],
    fetcher: ApiReporting.clinicalPrescriptionMedicineDetailed,
    exportFetcher: ApiReporting.exportClinicalPrescriptionMedicineDetailed,
    buildParams: (f) => ({ ...dates(f), clinicId: f?.clinicId, doctorId: f?.doctorId }),
  },
];

export const REPORT_OPTIONS = REPORTS.map((r) => ({
  value: r.id,
  label: r.label,
  group: r.group,
}));

export function getReport(id) {
  return REPORTS.find((r) => r.id === id) || REPORTS[0];
}
