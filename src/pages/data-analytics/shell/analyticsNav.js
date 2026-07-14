// Section navigation for the Tesseract Data Analytics page.
// One list per top-level department tab (OPD / IPD). Each item feeds the
// Tesseract <Sidebar/> (id · label · icon). Icons are validated Tesseract
// library icon names.

export const DEPARTMENTS = [
  { value: "opd", label: "OPD Analytics", icon: "clipboard-activity" },
  { value: "ipd", label: "IPD Analytics", icon: "hospital-bed" },
];

export const OPD_NAV = [
  { id: "overview", label: "Overview", icon: "grids" },
  { id: "appointments", label: "Appointments", icon: "calendar" },
  { id: "consultation-modes", label: "Consult Modes", icon: "stethoscope" },
  { id: "billing", label: "Billing", icon: "wallet-3" },
  { id: "patients", label: "Patients", icon: "profile-2user" },
  { id: "care", label: "Care", icon: "health" },
  { id: "grow", label: "Grow", icon: "chart-2" },
  { id: "messages", label: "Messages", icon: "message" },
  { id: "reports", label: "Reports", icon: "document-download" },
];

export const IPD_NAV = [
  { id: "overview", label: "Overview", icon: "grids" },
  { id: "admissions", label: "Admissions", icon: "login" },
  { id: "wards", label: "Wards", icon: "building" },
  { id: "clinical", label: "Clinical", icon: "health" },
  { id: "billing", label: "Billing", icon: "wallet-3" },
  { id: "reports", label: "Reports", icon: "document-download" },
];

export const NAV_BY_DEPARTMENT = { opd: OPD_NAV, ipd: IPD_NAV };

// Per-section hero copy (title + subtitle). Falls back to a generic line.
export const SECTION_HERO = {
  opd: {
    overview: { title: "Overview", subtitle: "Your OPD practice at a glance" },
    appointments: { title: "Appointments", subtitle: "Volume, status and case mix" },
    "consultation-modes": { title: "Consultation Modes", subtitle: "In-person, video and walk-in split" },
    billing: { title: "Billing", subtitle: "Collections, revenue and payment mix" },
    patients: { title: "Patients", subtitle: "New vs returning and demographics" },
    care: { title: "Care", subtitle: "Diagnoses, conditions and outcomes" },
    messages: { title: "Messages", subtitle: "Bulk SMS and WhatsApp campaign reach" },
    grow: { title: "Grow", subtitle: "Referrals, retention and reach" },
    reports: { title: "Reports", subtitle: "Financial and clinical report exports" },
  },
  ipd: {
    admissions: { title: "Admissions & Discharges", subtitle: "Patient flow, discharge mix and length of stay" },
    overview: { title: "Overview", subtitle: "Your inpatient service at a glance" },
    wards: { title: "Wards & Beds", subtitle: "Occupancy and bed utilisation" },
    clinical: { title: "Clinical Activity", subtitle: "Procedures, LOS and case metrics" },
    billing: { title: "Billing", subtitle: "IPD collections and revenue" },
    reports: { title: "Reports", subtitle: "Inpatient report exports" },
  },
};

export function heroFor(department, sectionId) {
  const dept = SECTION_HERO[department] || {};
  return dept[sectionId] || { title: "Data Analytics", subtitle: "" };
}
