import ApiReporting from "../../../api/services/ApiReporting";

const dates = (f) => ({ startDate: f?.startDate, endDate: f?.endDate });

export const BILL_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "consultation", label: "Consultation" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "lab", label: "Lab" },
  { value: "procedure", label: "Procedure" },
];

export const PAYMENT_MODE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "online", label: "Online" },
  { value: "cheque", label: "Cheque" },
];

export const IPD_FILTER_BY_OPTIONS = [
  { value: "department", label: "Department" },
  { value: "doctor", label: "Doctor" },
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

export const THREE_C_SELECT_TYPE_OPTIONS = [
  { value: "case_memo", label: "Case Memo" },
  { value: "invoice", label: "Invoice" },
  { value: "credit_notes", label: "Credit Notes" },
];

export const CLINICAL_DATA_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const IPD_REPORT_TYPE_OPTIONS = [
  { value: "admitting", label: "Admitting Report" },
  { value: "discharged", label: "Discharged Report" },
];

export const REPORTS = [
  // --- Financial ---
  {
    id: "daily-collection", group: "Financial", dept: "both",
    label: "Daily Collection",
    desc: "Cash memo, receipt, advance and refund for a single day.",
    live: true,
    filters: ["date", "clinic"],
    fetcher: ApiReporting.financialDailyCollection,
    exportFetcher: ApiReporting.exportFinancialDailyCollection,
    buildParams: (f) => ({ type: f?.type || "opd", date: f?.endDate, clinicId: f?.clinicId, doctorId: f?.doctorId }),
  },
  {
    id: "collection-report", group: "Financial", dept: "both",
    label: "Collection Report",
    desc: "Day-wise or detailed collection by date, bill type and payment mode.",
    live: true,
    filters: ["collectionReportType", "dateRange", "billType", "paymentMode"],
    fetcher: ApiReporting.financialCollectionSummary,
    exportFetcher: ApiReporting.exportFinancialCollectionSummary,
    subFetchers: {
      general: { fetcher: ApiReporting.financialCollectionSummary, exportFetcher: ApiReporting.exportFinancialCollectionSummary },
      detailed: { fetcher: ApiReporting.financialCollectionDetailed, exportFetcher: ApiReporting.exportFinancialCollectionDetailed },
      daywise: { fetcher: ApiReporting.financialCollectionSummary, exportFetcher: ApiReporting.exportFinancialCollectionSummary },
    },
    buildParams: (f) => ({ ...dates(f), type: f?.type || "opd", clinicId: f?.clinicId, doctorId: f?.doctorId, billTypes: f?.billType, modeOfPayment: f?.paymentMode }),
  },
  {
    id: "incentive-report", group: "Financial", dept: "opd",
    label: "Incentive Reports",
    desc: "Per-user and service-level incentive payouts.",
    filters: ["incentiveReportType", "dateRange", "incentiveUser", "department"],
    subFetchers: {
      detailed: { fetcher: ApiReporting.financialIncentiveDetailed, exportFetcher: ApiReporting.exportFinancialIncentiveDetailed },
      overall: { fetcher: ApiReporting.financialIncentiveOverall, exportFetcher: ApiReporting.exportFinancialIncentiveOverall },
    },
    fetcher: ApiReporting.financialIncentiveDetailed,
    exportFetcher: ApiReporting.exportFinancialIncentiveDetailed,
    buildParams: (f) => ({ ...dates(f), incentiveUser: f?.incentiveUser, department: f?.department }),
  },
  {
    id: "3c-report", group: "Financial", dept: "opd",
    label: "3C Report",
    desc: "Cash, invoice and credit-note breakdown by account.",
    filters: ["threeCReportType", "dateRange", "selectType"],
    subFetchers: {
      summary: { fetcher: ApiReporting.financialThreeC, exportFetcher: ApiReporting.exportFinancialThreeC },
      details: { fetcher: ApiReporting.financialThreeCDetails, exportFetcher: ApiReporting.exportFinancialThreeCDetails },
    },
    fetcher: ApiReporting.financialThreeC,
    exportFetcher: ApiReporting.exportFinancialThreeC,
    buildParams: (f) => ({ ...dates(f), selectType: f?.selectType }),
  },
  {
    id: "billing-overall", group: "Financial", dept: "both",
    label: "Billing Overall Reports",
    desc: "Revenue and cash-flow reports across the whole practice.",
    filters: ["dateRange", "billType", "issuedBy", "accountant", "paymentMode"],
    fetcher: ApiReporting.financialBillingOverallRevenue,
    exportFetcher: ApiReporting.exportFinancialBillingOverallRevenue,
    buildParams: (f) => ({ ...dates(f), type: f?.type || "opd", clinicId: f?.clinicId, doctorId: f?.doctorId, billTypes: f?.billType, issuedBy: f?.issuedBy, accountant: f?.accountant, modeOfPayment: f?.paymentMode }),
  },
  {
    id: "ipd-reports", group: "Financial", dept: "ipd",
    label: "IPD Reports",
    desc: "Admitting and discharged patient reports with financials.",
    live: true,
    filters: ["ipdReportType", "dateRange", "clinic", "ipdFilterBy"],
    fetcher: ApiReporting.financialIpdReports,
    exportFetcher: ApiReporting.exportFinancialIpdReports,
    buildParams: (f) => ({ ...dates(f), reportType: f?.ipdReportType || "admitting", clinicId: f?.clinicId, filterBy: f?.ipdFilterBy, ids: f?.ipdFilterIds }),
  },
  // --- Clinical ---
  {
    id: "appointment-analytics", group: "Clinical", dept: "opd",
    label: "Appointment Analytics",
    desc: "Appointment status and doctor-wise breakdown.",
    filters: ["appointmentReportType", "dateRange", "clinic", "clinicalData"],
    subFetchers: {
      general: { fetcher: ApiReporting.clinicalAppointmentOverall, exportFetcher: ApiReporting.exportClinicalAppointmentOverall },
      detailed: { fetcher: ApiReporting.clinicalAppointmentDetailed, exportFetcher: ApiReporting.exportClinicalAppointmentDetailed },
      overall: { fetcher: ApiReporting.clinicalAppointmentOverall, exportFetcher: ApiReporting.exportClinicalAppointmentOverall },
    },
    fetcher: ApiReporting.clinicalAppointmentOverall,
    exportFetcher: ApiReporting.exportClinicalAppointmentOverall,
    buildParams: (f) => ({ ...dates(f), clinicId: f?.clinicId, doctorId: f?.doctorId, clinicalData: f?.clinicalData }),
  },
  {
    id: "ipd-analytics", group: "Clinical", dept: "ipd",
    label: "IPD Analytics",
    desc: "Inpatient clinical activity and department-wise breakdown.",
    filters: ["dateRange", "clinic", "ipdFilterBy"],
    fetcher: ApiReporting.financialIpdReports,
    exportFetcher: ApiReporting.exportFinancialIpdReports,
    buildParams: (f) => ({ ...dates(f), clinicId: f?.clinicId, filterBy: f?.ipdFilterBy }),
  },
  {
    id: "prescription-analytics", group: "Clinical", dept: "opd",
    label: "Prescription Analytics",
    desc: "Brand, generic and company prescription volumes.",
    filters: ["dateRange"],
    fetcher: ApiReporting.clinicalPrescriptionAnalytics,
    exportFetcher: ApiReporting.exportClinicalPrescriptionAnalytics,
    buildParams: (f) => ({ ...dates(f), clinicId: f?.clinicId, doctorId: f?.doctorId }),
  },
  {
    id: "prescription-medicine", group: "Clinical", dept: "opd",
    label: "Prescription Medicine Detailed",
    desc: "Medicine-level prescription detail for OPD.",
    filters: ["dateRange"],
    fetcher: ApiReporting.clinicalPrescriptionMedicineDetailed,
    exportFetcher: ApiReporting.exportClinicalPrescriptionMedicineDetailed,
    buildParams: (f) => ({ ...dates(f), clinicId: f?.clinicId, doctorId: f?.doctorId }),
  },
  // --- Reference ---
  {
    id: "ref-patients", group: "Reference", dept: "opd",
    label: "Referred by Patients",
    desc: "Patients who referred others, with referred-case counts.",
    live: true,
    filters: ["dateRange"],
    fetcher: ApiReporting.referencePatients,
    buildParams: (f) => ({ ...dates(f), clinicId: f?.clinicId, doctorId: f?.doctorId }),
  },
  {
    id: "ref-others", group: "Reference", dept: "opd",
    label: "Referred by Others",
    desc: "External referrers with their referred-case counts.",
    live: true,
    filters: [],
    fetcher: ApiReporting.referencesList,
    buildParams: () => ({}),
  },
  {
    id: "ref-inpatient", group: "Reference", dept: "ipd",
    label: "Inpatient References",
    desc: "Inpatient referrers with their referred cases.",
    filters: [],
    fetcher: ApiReporting.referenceInpatientList,
    buildParams: () => ({}),
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
