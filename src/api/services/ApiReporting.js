import api from "./axiosService";
import config from "../../config";
import { refreshHeaders } from "../../utils/freshData";

// Pm-Core Reporting API client — reconciled to the v2 contract
// (API-CONTRACTS-v2.md, branch feat/reports-collection-daily, PR#2 → uat).
//
// Selects the Reporting (Pm-Core) service via the shared axiosService. The
// Bearer JWT the app already holds is attached by axiosService; no new axios
// instance and no new auth flow. Mirrors the ApiIpd.js pattern. Every path
// lives under /api/v1/reports/... on config.reporting_api_url
//
// Scope: business id always comes from the token. clinicId (and doctorId on
// Tab 1) are OPTIONAL narrowing filters. Writes never read scope from the body.
//
// v2 path renames (the old prefixes are GONE — do not resurrect them):
//   /reports/revenue/*        → /reports/analytics/opd-billing | ipd-billing | inpatient-summary
//   /reports/incentive/*      → /reports/financial/incentive/*
//   /reports/3c*              → /reports/financial/3c*
//   /reports/collection/*     → /reports/financial/(daily-collection | collection/*)
//   /reports/appointment/*    → /reports/clinical/appointment/*
//   /reports/prescription/*   → /reports/clinical/prescription/*
//
// Response shapes (pick the renderer by shape):
//   1. KPI/summary  → object of numbers (Tab-1 cards)
//   2. chart series → { labels, datasets:[{ label, data }] }
//   3. tabular      → { rows, pagination, summary? }; ?format=csv streams a download (Tab-3 only)
//
// CSV export (?format=csv) is supported ONLY on #13–#22 (all Tab-3 tabular
// reports). Charts/KPIs (Tabs 1–2) are JSON-only — their getBlob helpers exist
// for call-site compatibility but the backend will 4xx a csv request.
//
// Backend readiness: as of this writing the Tab-3 report endpoints match the
// contract exactly; several Tab-1/Tab-2 dashboard endpoints may not be live yet
// and will return 4xx/empty until the backend ships them — callers fall back to
// zero-fill.
// Heavy dashboard aggregations (consultation-modes, patients, CVT) can exceed
// the shared axios 20s default under browser connection contention — raise
// timeout for reporting only so Mission / Data Analytics do not cancel early.
const REPORTING_TIMEOUT_MS = 300000; // 5 minutes
// Heavy aggregations must not be retried by axiosService (3× would block ~15 min).
const baseUrl = {
  customBaseUrl: config.reporting_api_url,
  timeout: REPORTING_TIMEOUT_MS,
  skipRetry: true,
};

// ...refreshHeaders() adds X-Refresh-Cache when the tester "fresh data" mode is on,
// so Pm-Core recomputes from the DB instead of serving its cached report value.
const get = (url, params) => api.get(url, { params, ...baseUrl, ...refreshHeaders() });
const getBlob = (url, params) =>
  api.get(url, { params, responseType: "blob", ...baseUrl, ...refreshHeaders() });
const post = (url, data) => api.post(url, data, { ...baseUrl, ...refreshHeaders() });

const ApiReporting = {};

/* ================================================================== *
 * TAB 1 — Clinic Dashboard  (/reports/clinic)
 * Query: month? (YYYY-MM, default current) · clinicId? · doctorId?
 * ================================================================== */
// #1 KPI — consultations + prescriptions counts, pctChange (null → "—"), isDown, topDiagnosis[]
ApiReporting.clinicDashboardTopCards = (params) =>
  get(`/api/v1/reports/clinic/dashboard/top-cards`, params);
// #2 chart — weekly total consults, datasets [prevMonth, currentMonth], labels Week 1..4
ApiReporting.clinicConsultationsWeekly = (params) =>
  get(`/api/v1/reports/clinic/consultations/weekly`, params);
// #3 detail — 4 metrics × 4 WeekPoint {start,end,value}
ApiReporting.clinicConsultations = (params) =>
  get(`/api/v1/reports/clinic/consultations`, params);
// #4 chart — NEW — weekly planned follow-ups, prev vs current month (same shape as #2)
ApiReporting.clinicFollowups = (params) =>
  get(`/api/v1/reports/clinic/followups`, params);
// #5 charts — NEW — Rx analytics for the month: topBrands, companyShare, topSalts (stacked-bar ready)
ApiReporting.clinicRx = (params) => get(`/api/v1/reports/clinic/rx`, params);
// #6 detail — topDiagnosis + ageProfile + genderProfile (current vs last)
ApiReporting.clinicDiagnosis = (params) =>
  get(`/api/v1/reports/clinic/diagnosis`, params);
// #7 table — refer-by-patient master, paginated (page, limit)
ApiReporting.clinicPatients = (params) =>
  get(`/api/v1/reports/clinic/patients`, params);

/* ================================================================== *
 * TAB 2 — Analytics Dashboard  (/reports/analytics)  [JSON only]
 * Query: days? ∈ {7,15,30,90} (default 7) · clinicId? (default: all hospitals)
 * ================================================================== */
// #8 revenue/billing dashboard — collection[] + revenue[] + collectionChart + revenueChart.
//    Also accepts days ∈ {365} and counter?. Prefer the ready-made *Chart series.
ApiReporting.analyticsOpdBilling = (params) =>
  get(`/api/v1/reports/analytics/opd-billing`, params);
// #9 same shape as #8, IPD
ApiReporting.analyticsIpdBilling = (params) =>
  get(`/api/v1/reports/analytics/ipd-billing`, params);
// Legacy-PHP IPD/OPD billed+collected by doctor. days ∈ {7,15,30,90,365}, department=opd|ipd.
ApiReporting.analyticsBillingByDoctor = (params) =>
  get(`/api/v1/reports/analytics/billing-by-doctor`, params);
// #10 { appointments: chart (Total + Cancelled), caseType: donut [New, Follow-Up, Urgent] }
ApiReporting.analyticsAppointment = (params) =>
  get(`/api/v1/reports/analytics/appointment`, params);
// #11 { pharmacy: chart (Purchase/Sale Invoice/Return), pathology: chart (OPD/IPD) } — zero-filled if none
ApiReporting.analyticsOthers = (params) =>
  get(`/api/v1/reports/analytics/others`, params);
// #12 KPI — BOR / ALOS / ADC + ward + discharge summaries (counter?)
ApiReporting.analyticsInpatientSummary = (params) =>
  get(`/api/v1/reports/analytics/inpatient-summary`, params);

/* ================================================================== *
 * TAB 3A — Financial Reports  (/reports/financial)  [tabular · CSV export]
 * ================================================================== */
// #13 date?, type?(opd/ipd), clinicId?, format? — summary + rows + paymentModes
ApiReporting.financialDailyCollection = (params) =>
  get(`/api/v1/reports/financial/daily-collection`, params);
ApiReporting.exportFinancialDailyCollection = (params) =>
  getBlob(`/api/v1/reports/financial/daily-collection`, params);
// #14 startDate,endDate(≤30d), type?, clinicId?, page?, limit?, format? — 4 sections + grand total + paymentModes
ApiReporting.financialCollectionSummary = (params) =>
  get(`/api/v1/reports/financial/collection/summary`, params);
ApiReporting.exportFinancialCollectionSummary = (params) =>
  getBlob(`/api/v1/reports/financial/collection/summary`, params);
// #15 #14 + billTypes?, issuedBy?, modeOfPayment? (CSVs) — adds Bill Type column
ApiReporting.financialCollectionDetailed = (params) =>
  get(`/api/v1/reports/financial/collection/detailed`, params);
ApiReporting.exportFinancialCollectionDetailed = (params) =>
  getBlob(`/api/v1/reports/financial/collection/detailed`, params);
// #16 incentive overall
ApiReporting.financialIncentiveOverall = (params) =>
  get(`/api/v1/reports/financial/incentive/overall`, params);
ApiReporting.exportFinancialIncentiveOverall = (params) =>
  getBlob(`/api/v1/reports/financial/incentive/overall`, params);
// #17 incentive detailed
ApiReporting.financialIncentiveDetailed = (params) =>
  get(`/api/v1/reports/financial/incentive/detailed`, params);
ApiReporting.exportFinancialIncentiveDetailed = (params) =>
  getBlob(`/api/v1/reports/financial/incentive/detailed`, params);
// #18 3C report
ApiReporting.financialThreeC = (params) =>
  get(`/api/v1/reports/financial/3c`, params);
ApiReporting.exportFinancialThreeC = (params) =>
  getBlob(`/api/v1/reports/financial/3c`, params);
// #19 3C details
ApiReporting.financialThreeCDetails = (params) =>
  get(`/api/v1/reports/financial/3c/details`, params);
ApiReporting.exportFinancialThreeCDetails = (params) =>
  getBlob(`/api/v1/reports/financial/3c/details`, params);
// #20 NEW — Billing Overall Revenue. type?(opd/ipd), startDate, endDate, issuedBy?, accountant?, page?, limit?, format?
ApiReporting.financialBillingOverallRevenue = (params) =>
  get(`/api/v1/reports/financial/billing-overall/revenue`, params);
ApiReporting.exportFinancialBillingOverallRevenue = (params) =>
  getBlob(`/api/v1/reports/financial/billing-overall/revenue`, params);
// #21 NEW — Billing Overall Cash Flow. type?, startDate, endDate, billTypes?, category?, accountant?, issuedBy?, modeOfPayment?, page?, limit?, format?
ApiReporting.financialBillingOverallCashFlow = (params) =>
  get(`/api/v1/reports/financial/billing-overall/cash-flow`, params);
ApiReporting.exportFinancialBillingOverallCashFlow = (params) =>
  getBlob(`/api/v1/reports/financial/billing-overall/cash-flow`, params);
// #22 IPD admitting/discharged reports
const withIpdReportType = (params = {}) => ({
  ...params,
  reportType: params.reportType === "discharged" ? "discharged" : "admitting",
});
ApiReporting.financialIpdReports = (params) =>
  get(`/api/v1/reports/financial/ipd-reports`, withIpdReportType(params));
ApiReporting.exportFinancialIpdReports = (params) =>
  getBlob(`/api/v1/reports/financial/ipd-reports`, withIpdReportType(params));
// IPD census CSV — startDate, endDate, format=csv
ApiReporting.financialIpdCensusReport = (params) =>
  get(`/api/v1/reports/financial/ipd-census-report`, params);
ApiReporting.exportFinancialIpdCensusReport = (params) =>
  getBlob(`/api/v1/reports/financial/ipd-census-report`, params);

/* ================================================================== *
 * TAB 3B — Clinical Reports  (/reports/clinical)  [tabular · JSON]
 * ================================================================== */
// #23 appointment overall
ApiReporting.clinicalAppointmentOverall = (params) =>
  get(`/api/v1/reports/clinical/appointment/overall`, params);
ApiReporting.exportClinicalAppointmentOverall = (params) =>
  getBlob(`/api/v1/reports/clinical/appointment/overall`, params);
// #24 appointment detailed
ApiReporting.clinicalAppointmentDetailed = (params) =>
  get(`/api/v1/reports/clinical/appointment/detailed`, params);
ApiReporting.exportClinicalAppointmentDetailed = (params) =>
  getBlob(`/api/v1/reports/clinical/appointment/detailed`, params);
// #25 prescription analytics
ApiReporting.clinicalPrescriptionAnalytics = (params) =>
  get(`/api/v1/reports/clinical/prescription/analytics`, params);
ApiReporting.exportClinicalPrescriptionAnalytics = (params) =>
  getBlob(`/api/v1/reports/clinical/prescription/analytics`, params);
// #26 prescription medicine-detailed
ApiReporting.clinicalPrescriptionMedicineDetailed = (params) =>
  get(`/api/v1/reports/clinical/prescription/medicine-detailed`, params);
ApiReporting.exportClinicalPrescriptionMedicineDetailed = (params) =>
  getBlob(`/api/v1/reports/clinical/prescription/medicine-detailed`, params);

/* ================================================================== *
 * TAB 3C — Reference  (/reports/reference)  — contains the WRITES
 * ================================================================== */
// #27 NEW — "Referred by Patients" (same rows as /clinic/patients)
ApiReporting.referencePatients = (params) =>
  get(`/api/v1/reports/reference/patients`, params);
ApiReporting.exportReferencePatients = (params) =>
  getBlob(`/api/v1/reports/reference/patients`, params);
// #28 "Referred by Others" list — search?, page?, limit?
ApiReporting.referencesList = (params) =>
  get(`/api/v1/reports/reference/references`, params);
ApiReporting.exportReferencesList = (params) =>
  getBlob(`/api/v1/reports/reference/references`, params);
// #29 WRITE — Add Reference (OPD/others). rm_name + rm_type required; scope from token; unknown keys → 400.
//     ⚠ Legacy-parity quirk: stores hm_business_id=0, so the created row will NOT appear in list #28 —
//     render the returned 201 row directly instead of relying on a refetch.
ApiReporting.addReference = (data) =>
  post(`/api/v1/reports/reference/references`, data);
// #30 NEW — Inpatient reference list, incl. referred_cases per row
ApiReporting.referenceInpatientList = (params) =>
  get(`/api/v1/reports/reference/inpatient`, params);
// #31 WRITE — Inpatient Add Reference. rm_name required, rm_phone_no?, rm_email?.
//     Unlike #29 this DOES store the business id, so the created row appears in list #30 on refetch.
ApiReporting.addInpatientReference = (data) =>
  post(`/api/v1/reports/reference/inpatient`, data);

/* ================================================================== *
 * v3 — Data-Analytics dashboard endpoints (new + expanded)
 * All 🟢 BUILT on feat/reports-collection-daily branch.
 * Same base /api/v1/reports, same auth/scoping/shapes.
 * ================================================================== */
// OPD Consultation Modes — kpis, modeMix, modeTrend, byDoctor
ApiReporting.clinicConsultationModes = (params) =>
  get(`/api/v1/reports/clinic/consultation-modes`, params);
// CVT digitization — daily + by-doctor (Mission Visit trend / Doctor-wise charts)
ApiReporting.cvtDaily = (params) =>
  get(`/api/v1/reports/cvt/daily`, params);
ApiReporting.cvtByDoctor = (params) =>
  get(`/api/v1/reports/cvt/by-doctor`, params);
// OPD Patients — demographics, gender, age, visitFrequency, rfm
ApiReporting.analyticsPatients = (params) =>
  get(`/api/v1/reports/analytics/patients`, params);
// Operational Overview — totalFootfall, topMedication, netPharmacySales
ApiReporting.operationalOverview = (params) =>
  get(`/api/v1/reports/operational/overview`, params);
// ABHA linkage + enrolment — linkage donut, enrolments line
ApiReporting.operationalAbha = (params) =>
  get(`/api/v1/reports/operational/abha`, params);
// Care family — clinical data widgets
ApiReporting.clinicalSymptoms = (params) =>
  get(`/api/v1/reports/clinical/symptoms`, params);
ApiReporting.clinicalLabTest = (params) =>
  get(`/api/v1/reports/clinical/lab-test`, params);
ApiReporting.clinicalMedicalHistory = (params) =>
  get(`/api/v1/reports/clinical/medical-history`, params);
ApiReporting.clinicalDiagnosisSyndromes = (params) =>
  get(`/api/v1/reports/clinical/diagnosis`, params);
// IPD Wards — kpis, occupancyOverTime, alosByWard
ApiReporting.ipdWards = (params) =>
  get(`/api/v1/reports/ipd/wards`, params);
// IPD Clinical Activity — kpis, notesByType, otByDoctor
ApiReporting.ipdClinical = (params) =>
  get(`/api/v1/reports/ipd/clinical`, params);
// Care — Vitals analytics (topVitals, totalRecordings, uniqueTypes)
ApiReporting.clinicalVitals = (params) =>
  get(`/api/v1/reports/clinical/vitals`, params);
// Care — Certificates analytics (topCertificates, totalIssued, uniqueTypes)
ApiReporting.clinicalCertificates = (params) =>
  get(`/api/v1/reports/clinical/certificates`, params);
// Care — Examination (topFindings, totalExaminations)
ApiReporting.clinicalExamination = (params) =>
  get(`/api/v1/reports/clinical/examination`, params);
// Care — Advice analytics (topAdvice, totalAdvice)
ApiReporting.clinicalAdvice = (params) =>
  get(`/api/v1/reports/clinical/advice`, params);
// Care — Vaccines (topVaccines, givenCount, pendingCount)
ApiReporting.clinicalVaccines = (params) =>
  get(`/api/v1/reports/clinical/vaccines`, params);
// Care — Gynecology analytics
ApiReporting.clinicalGynec = (params) =>
  get(`/api/v1/reports/clinical/gynec`, params);
// Care — Obstetrics analytics
ApiReporting.clinicalObstetric = (params) =>
  get(`/api/v1/reports/clinical/obstetric`, params);
// Care — Custom models (templates created, reuse rate)
ApiReporting.clinicalCustomModels = (params) =>
  get(`/api/v1/reports/clinical/custom-models`, params);
// Care — Procedures suggested to patients. WONT-BUILD per
// API-CONTRACTS-CURRENT §7 (no data source) — kept only so legacy callers
// fail soft; do NOT wire new UI to it.
ApiReporting.clinicalProcedures = (params) =>
  get(`/api/v1/reports/clinical/procedures`, params);

// Lookups — payment options, accounts, departments, incentive users
ApiReporting.reportLookups = (params) =>
  get(`/api/v1/reports/lookups`, params);

/* --- v2.0 additions (API-CONTRACTS-CURRENT.md §3/§4) --- */
// Per-topic monthly trends: topic=symptoms|investigations|conditions|medications,
// months=3|6|12, top=1..10 → { trends:{labels,datasets}, emerging:[...] }
ApiReporting.clinicalTrends = (params) =>
  get(`/api/v1/reports/clinical/trends`, params);
// Monthly diagnosis trends + emerging (months, top)
ApiReporting.clinicalDiagnosisTrends = (params) =>
  get(`/api/v1/reports/clinical/diagnosis-trends`, params);
// Appointment KPIs + channelMix/visitsByHour/newVsReturning (startDate+endDate ≤30d)
ApiReporting.clinicalAppointmentSummary = (params) =>
  get(`/api/v1/reports/clinical/appointment/summary`, params);
// IPD bed turnover / ALOS / turnaround (days, clinicId?)
ApiReporting.ipdBedTurnover = (params) =>
  get(`/api/v1/reports/ipd/bed-turnover`, params);

/* ================================================================== *
 * Backward-compatible aliases — legacy method names used by the current
 * opd-analytics (service.js, reports/ReportsHub.jsx) now resolve to the
 * v2-correct endpoints above. Prefer the v2 names in new code.
 * ================================================================== */
// Tab 2 — revenue → analytics/*-billing
ApiReporting.revenueOpd = ApiReporting.analyticsOpdBilling;
ApiReporting.revenueIpd = ApiReporting.analyticsIpdBilling;
ApiReporting.revenueInpatientSummary = ApiReporting.analyticsInpatientSummary;
ApiReporting.exportRevenueOpd = ApiReporting.analyticsOpdBilling; // JSON-only in v2
ApiReporting.exportRevenueIpd = ApiReporting.analyticsIpdBilling;
ApiReporting.exportRevenueInpatientSummary =
  ApiReporting.analyticsInpatientSummary;
// Tab 3A — collection + incentive + 3c
ApiReporting.dailyCollection = ApiReporting.financialDailyCollection;
ApiReporting.exportDailyCollection = ApiReporting.exportFinancialDailyCollection;
ApiReporting.collectionSummary = ApiReporting.financialCollectionSummary;
ApiReporting.exportCollectionSummary =
  ApiReporting.exportFinancialCollectionSummary;
ApiReporting.collectionDetailed = ApiReporting.financialCollectionDetailed;
ApiReporting.exportCollectionDetailed =
  ApiReporting.exportFinancialCollectionDetailed;
ApiReporting.incentiveOverall = ApiReporting.financialIncentiveOverall;
ApiReporting.exportIncentiveOverall =
  ApiReporting.exportFinancialIncentiveOverall;
ApiReporting.incentiveDetailed = ApiReporting.financialIncentiveDetailed;
ApiReporting.exportIncentiveDetailed =
  ApiReporting.exportFinancialIncentiveDetailed;
ApiReporting.threeC = ApiReporting.financialThreeC;
ApiReporting.threeCDetails = ApiReporting.financialThreeCDetails;
ApiReporting.exportThreeC = ApiReporting.exportFinancialThreeC;
// Tab 3B — appointment + prescription (moved under clinical/*)
ApiReporting.appointmentOverall = ApiReporting.clinicalAppointmentOverall;
ApiReporting.exportAppointmentOverall =
  ApiReporting.exportClinicalAppointmentOverall;
ApiReporting.appointmentDetailed = ApiReporting.clinicalAppointmentDetailed;
ApiReporting.exportAppointmentDetailed =
  ApiReporting.exportClinicalAppointmentDetailed;
ApiReporting.prescriptionAnalytics = ApiReporting.clinicalPrescriptionAnalytics;
ApiReporting.exportPrescriptionAnalytics =
  ApiReporting.exportClinicalPrescriptionAnalytics;
ApiReporting.prescriptionMedicineDetailed =
  ApiReporting.clinicalPrescriptionMedicineDetailed;
ApiReporting.exportPrescriptionMedicineDetailed =
  ApiReporting.exportClinicalPrescriptionMedicineDetailed;

// Deprecated — not present in the v2 contract. Kept only so existing call
// sites don't throw; these will 4xx. Migrate consumers to #1 top-cards (KPI)
// and remove.
ApiReporting.clinicDashboard = (params) =>
  get(`/api/v1/reports/clinic/dashboard`, params);
ApiReporting.clinicSummary = (params) =>
  get(`/api/v1/reports/clinic/summary`, params);

/* ================================================================== *
 * Permissions — resolved module/role grants for the caller
 * ================================================================== */
// { hospitalId, hospitals[], modules[], roles[], hasAnalytics } resolved live
// from the legacy grant tables (PHP admin panel "Role Assignment" screen).
// hospitalId? must be one of the caller's own hospitals (403 otherwise);
// omitted = the token clinic.
ApiReporting.myPermissions = (params) =>
  get(`/api/v1/reports/permissions/me`, params);

export default ApiReporting;
