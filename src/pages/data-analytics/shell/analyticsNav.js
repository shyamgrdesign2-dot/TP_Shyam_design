// Section navigation for the Tesseract Data Analytics page.
// One list per top-level department tab (OPD / IPD). Each item feeds the
// Tesseract <Sidebar/> (id · label · icon). Icons are validated Tesseract
// library icon names.

export const DEPARTMENTS = [
  { value: "opd", label: "OPD Analytics", icon: "clipboard-activity" },
];

export const OPD_NAV = [
  { id: "overview", label: "Overview", icon: "grids" },
  { id: "appointments", label: "Appointments", icon: "calendar-2", iconLinearUrl: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/linear/time/calendar.svg", iconBulkUrl: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/time/calendar-2.svg" },
  { id: "consultation-modes", label: "Consult Modes", icon: "stethoscope" },
  { id: "billing", label: "Billing", icon: "wallet-3" },
  { id: "patients", label: "Patients", icon: "profile-2user" },
  { id: "care", label: "Care", icon: "health" },
  // grow hidden: backend follow-ups endpoint returns empty data (no records in reporting tables).
  // { id: "grow", label: "Grow", icon: "chart-2" },
  { id: "messages", label: "Messages", icon: "message", iconLinearUrl: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/linear/emails-messages/messages.svg", iconBulkUrl: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/emails-messages/messages-2.svg" },
  { id: "reports", label: "Reports", icon: "document-download" },
];

export const IPD_NAV = [
  { id: "overview", label: "Overview", icon: "grids" },
  { id: "admissions", label: "Admissions", icon: "login" },
  { id: "wards", label: "Wards", icon: "building", iconLinearUrl: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/linear/building/building.svg", iconBulkUrl: "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/building/building-4.svg" },
  // "Clinical Activity" removed (user ruling 2026-07-15): ipd/clinical returns
  // zeros for every KPI/chart even over a 365-day window (notes/OT untracked;
  // labResults reads the wrong table — Pm-Core BUG-5). Restore this entry when
  // the backend ships real data.
  { id: "billing", label: "Billing", icon: "wallet-3" },
  { id: "reports", label: "Reports", icon: "document-download" },
];

export const NAV_BY_DEPARTMENT = { opd: OPD_NAV, ipd: IPD_NAV };

// Per-section hero copy (title + subtitle). Falls back to a generic line.
export const SECTION_HERO = {
  opd: {
    overview: { title: "Overview" },
    appointments: { title: "Appointments" },
    "consultation-modes": { title: "Consultation Modes" },
    billing: { title: "Billing" },
    patients: { title: "Patients" },
    care: { title: "Care" },
    messages: { title: "Messages" },
    grow: { title: "Grow" },
    reports: { title: "Reports" },
  },
  ipd: {
    admissions: { title: "Admissions & Discharges" },
    overview: { title: "Overview" },
    wards: { title: "Wards & Beds" },
    clinical: { title: "Clinical Activity" },
    billing: { title: "Billing" },
    reports: { title: "Reports" },
  },
};

export function heroFor(department, sectionId) {
  const dept = SECTION_HERO[department] || {};
  return dept[sectionId] || { title: "Data Analytics", subtitle: "" };
}
