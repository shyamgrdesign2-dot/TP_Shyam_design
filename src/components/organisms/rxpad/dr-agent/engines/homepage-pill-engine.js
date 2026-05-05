// -----------------------------------------------------------------
// Homepage Pill Engine -- Generates operational canned pills
// for the Homepage Doctor Agent based on active tab, rail item,
// and patient context (now patient-data-aware)
// -----------------------------------------------------------------





// ─── Master list: one pill per homepage card type (15 total) ─────
// The UI will show max 4–5 at a time; tab overrides pick the
// most relevant subset. This master list is the exhaustive catalogue
// so every homepage card kind has a discoverable entry-point.
const ALL_HOMEPAGE_PILLS = [
/* ① follow_up_list     */{ id: "hp-followups", label: "Follow-up dues today", priority: 12, layer: 3, tone: "primary" },
/* ② follow_up_week     */{ id: "hp-followups-week", label: "Follow-up dues this week", priority: 14, layer: 3, tone: "primary" },
/* ⑤ donut_chart        */{ id: "hp-demographics", label: "Patient demographics", priority: 20, layer: 3, tone: "primary" },
/* ⑥ pie_chart          */{ id: "hp-diagnosis-dist", label: "Diagnosis breakdown", priority: 22, layer: 3, tone: "primary" },
/* ⑦ line_graph         */{ id: "hp-patient-volume", label: "Patient trends", priority: 24, layer: 3, tone: "primary" },
/* ⑧ analytics_table    */{ id: "hp-kpis", label: "Weekly KPIs", priority: 26, layer: 3, tone: "primary" },
/* ⑨ condition_bar      */{ id: "hp-conditions", label: "Chronic conditions", priority: 28, layer: 3, tone: "primary" },
/* ⑩ heatmap            */{ id: "hp-peak-hours", label: "Peak hours", priority: 30, layer: 3, tone: "primary" },
/* ⑪ referral           */{ id: "hp-referrals", label: "Referral summary", priority: 32, layer: 3, tone: "primary" },
/* ⑫ vaccination_sched  */{ id: "hp-vaccine-schedule", label: "Vaccination schedule", priority: 34, layer: 3, tone: "primary" },
/* ⑭ vaccination_due    */{ id: "hp-vaccine-due", label: "Vaccination due list", priority: 38, layer: 3, tone: "warning" },
/* ⑮ anc_schedule_list  */{ id: "hp-anc-schedule", label: "ANC schedule", priority: 40, layer: 3, tone: "warning" }];


// ─── Tab overrides: pick the 4 most relevant pills per tab ──────
const TAB_OVERRIDES = {
  queue: [
  ALL_HOMEPAGE_PILLS[2], // Patient demographics
  ALL_HOMEPAGE_PILLS[3], // Diagnosis breakdown
  ALL_HOMEPAGE_PILLS[4], // Patient trends
  ALL_HOMEPAGE_PILLS[5], // Weekly KPIs
  ALL_HOMEPAGE_PILLS[6], // Chronic conditions
  ALL_HOMEPAGE_PILLS[7], // Peak hours
  ALL_HOMEPAGE_PILLS[8], // Referral summary
  ALL_HOMEPAGE_PILLS[9], // Vaccination schedule
  ALL_HOMEPAGE_PILLS[10], // Vaccination due list
  ALL_HOMEPAGE_PILLS[11], // ANC schedule
  ALL_HOMEPAGE_PILLS[0], // Follow-up dues today
  ALL_HOMEPAGE_PILLS[1] // Follow-up dues this week
  ],
  finished: [
  ALL_HOMEPAGE_PILLS[3], // Diagnosis breakdown
  ALL_HOMEPAGE_PILLS[1], // Follow-up dues this week
  ALL_HOMEPAGE_PILLS[2], // Patient demographics
  ALL_HOMEPAGE_PILLS[6] // Chronic conditions
  ],
  cancelled: [
  ALL_HOMEPAGE_PILLS[7], // Peak hours
  ALL_HOMEPAGE_PILLS[4], // Patient trends
  ALL_HOMEPAGE_PILLS[5], // Weekly KPIs
  ALL_HOMEPAGE_PILLS[2] // Patient demographics
  ],
  draft: [
  ALL_HOMEPAGE_PILLS[9], // Vaccination schedule
  ALL_HOMEPAGE_PILLS[8], // Referral summary
  ALL_HOMEPAGE_PILLS[10], // Vaccination due list
  ALL_HOMEPAGE_PILLS[11] // ANC schedule
  ],
  "pending-digitisation": [
  ALL_HOMEPAGE_PILLS[8], // Referral summary
  ALL_HOMEPAGE_PILLS[1], // Follow-up dues this week
  ALL_HOMEPAGE_PILLS[5], // Weekly KPIs
  ALL_HOMEPAGE_PILLS[0] // Follow-up dues today
  ]
};

// Rail-specific pills — shown when a non-appointments rail item is active
const RAIL_PILLS = {
  "follow-ups": [
  { id: "rail-due-today", label: "Follow-up dues today", priority: 10, layer: 3, tone: "primary" },
  { id: "rail-overdue-today", label: "Overdue follow-ups today", priority: 12, layer: 3, tone: "warning" },
  { id: "rail-thisweek", label: "This week follow-ups", priority: 14, layer: 3, tone: "primary" },
  { id: "rail-rate", label: "Follow-up rate", priority: 16, layer: 3, tone: "info" }],

  "opd-billing": [
  { id: "rail-collection", label: "Today's collection", priority: 10, layer: 3, tone: "primary" },
  { id: "rail-billing-today", label: "Today's billing", priority: 12, layer: 3, tone: "primary" },
  { id: "rail-deposits-today", label: "Today's deposits", priority: 14, layer: 3, tone: "primary" },
  { id: "rail-invoice", label: "Generate invoice", priority: 16, layer: 3, tone: "primary" },
  { id: "rail-due-week", label: "Patients with due this week", priority: 18, layer: 3, tone: "warning" },
  { id: "rail-due-till", label: "Patients with due till now", priority: 20, layer: 3, tone: "warning" }],

  "all-patients": [
  { id: "rail-demographics", label: "Patient demographics", priority: 10, layer: 3, tone: "primary" },
  { id: "rail-diagnosis", label: "Diagnosis breakdown", priority: 12, layer: 3, tone: "primary" },
  { id: "rail-trends", label: "Patient trends", priority: 14, layer: 3, tone: "primary" },
  { id: "rail-kpis", label: "Weekly KPIs", priority: 16, layer: 3, tone: "primary" },
  { id: "rail-chronic", label: "Chronic conditions", priority: 18, layer: 3, tone: "primary" },
  { id: "rail-peak", label: "Peak hours", priority: 20, layer: 3, tone: "primary" },
  { id: "rail-referrals", label: "Referral summary", priority: 22, layer: 3, tone: "primary" },
  { id: "rail-vaccine", label: "Vaccination schedule", priority: 24, layer: 3, tone: "primary" },
  { id: "rail-vaccine-due", label: "Vaccination due list", priority: 26, layer: 3, tone: "warning" },
  { id: "rail-anc", label: "ANC schedule", priority: 28, layer: 3, tone: "warning" },
  { id: "rail-fu-due-today", label: "Follow-up dues today", priority: 30, layer: 3, tone: "primary" },
  { id: "rail-fu-due-week", label: "Follow-up dues this week", priority: 32, layer: 3, tone: "primary" }],

  pharmacy: [
  { id: "rail-lowstock", label: "Low stock alerts", priority: 10, layer: 3, tone: "danger" },
  { id: "rail-pendingrx", label: "Pending prescriptions", priority: 12, layer: 3, tone: "warning" },
  { id: "rail-dispense", label: "Dispense history", priority: 14, layer: 3, tone: "primary" },
  { id: "rail-expiring", label: "Expiring medicines", priority: 16, layer: 3, tone: "warning" }],

  "bulk-messages": [
  { id: "rail-campaign", label: "Draft campaign", priority: 10, layer: 3, tone: "primary" },
  { id: "rail-delivery", label: "Delivery stats", priority: 12, layer: 3, tone: "info" },
  { id: "rail-templates", label: "Template library", priority: 14, layer: 3, tone: "primary" },
  { id: "rail-scheduled", label: "Scheduled messages", priority: 16, layer: 3, tone: "primary" }]

};

// ─── Patient-Context-Aware Pill Generator ────────────────────────
// Generates pills based on the patient's actual data — no "Last visit"
// if they've never visited, no "Flagged labs" if they have no labs, etc.
function generatePatientContextPills(summary) {
  const isNew = summary.symptomCollectorData?.isNewPatient || summary.specialtyTags.length === 0;
  const hasVitals = !!(summary.todayVitals && Object.keys(summary.todayVitals).length > 0);
  const hasLabs = !!(summary.keyLabs && summary.keyLabs.length > 0);
  const hasLastVisit = !!summary.lastVisit;

  const pills = [];
  let p = 10;

  if (isNew) {
    // New patient: focus on intake review, DDX, initial workup
    if (summary.symptomCollectorData?.symptoms?.length) {
      pills.push({ id: "pc-intake", label: "Reported by patient", priority: p, layer: 3, tone: "primary" });p += 2;
    }
    pills.push({ id: "pc-ddx", label: "Suggest DDX", priority: p, layer: 3, tone: "primary" });p += 2;
    if (summary.allergies?.length) {
      pills.push({ id: "pc-allergy", label: `Allergy: ${summary.allergies[0]}`, priority: p, layer: 3, tone: "warning" });p += 2;
    }
    pills.push({ id: "pc-workup", label: "Initial workup", priority: p, layer: 3, tone: "info" });p += 2;
  } else {
    // Existing patient: show data-relevant pills
    pills.push({ id: "pc-snapshot", label: "Patient's detailed summary", priority: p, layer: 3, tone: "primary" });p += 2;

    if (hasLastVisit) {
      pills.push({ id: "pc-lastvisit", label: "Last visit", priority: p, layer: 3, tone: "primary" });p += 2;
    }

    if (hasLabs && summary.labFlagCount > 0) {
      pills.push({ id: "pc-labs", label: `${summary.labFlagCount} flagged labs`, priority: p, layer: 3, tone: "warning" });p += 2;
    }

    // Follow-up overdue
    if (summary.followUpOverdueDays > 0) {
      pills.push({ id: "pc-fu-overdue", label: `Follow-up overdue ${summary.followUpOverdueDays}d`, priority: p, layer: 3, tone: "warning" });p += 2;
    }

    // Specialty pills — prioritize the most clinically relevant specialty
    if (summary.obstetricData) {
      pills.push({ id: "pc-ob", label: "Obstetric summary", priority: p, layer: 3, tone: "primary" });p += 2;
    }
    if (summary.gynecData) {
      pills.push({ id: "pc-gynec", label: "Gynec summary", priority: p, layer: 3, tone: "primary" });p += 2;
    }
    if (summary.pediatricsData) {
      pills.push({ id: "pc-pedia", label: "Growth & vaccines", priority: p, layer: 3, tone: "primary" });p += 2;
    }
    if (summary.ophthalData) {
      pills.push({ id: "pc-ophthal", label: "Vision summary", priority: p, layer: 3, tone: "primary" });p += 2;
    }

    if (hasVitals && pills.length < 4) {
      pills.push({ id: "pc-vitals", label: "Vital trends", priority: p, layer: 3, tone: "info" });p += 2;
    }

    if (pills.length < 4) {
      pills.push({ id: "pc-preconsult", label: "Pre-consult prep", priority: p, layer: 3, tone: "info" });p += 2;
    }
  }

  return pills.slice(0, 4);
}

// ─── Legacy fallback for when no summary is available ────────────
const FALLBACK_PATIENT_PILLS = [
{ id: "pc-snapshot", label: "Patient's detailed summary", priority: 10, layer: 3, tone: "primary" },
{ id: "pc-lastvisit", label: "Last visit", priority: 12, layer: 3, tone: "primary" },
{ id: "pc-preconsult", label: "Pre-consult prep", priority: 16, layer: 3, tone: "info" }];


export function generateHomepagePills(
activeTab,
activeRailItem,
/** Pass SmartSummaryData for patient-specific pills, null for operational mode */
patientSummary)
{
  // Patient-specific context → data-aware pills
  if (patientSummary) {
    return generatePatientContextPills(patientSummary);
  }

  // Rail-specific context (non-appointments rail items)
  if (activeRailItem && activeRailItem !== "appointments" && RAIL_PILLS[activeRailItem]) {
    return RAIL_PILLS[activeRailItem];
  }

  // Demo mode: show ALL pills so every card type is discoverable
  // In production, swap to: TAB_OVERRIDES[tab] || ALL_HOMEPAGE_PILLS.slice(0, 4)
  return ALL_HOMEPAGE_PILLS;
}

/** Exposed for documentation / team reference — every homepage card's pill */
export { ALL_HOMEPAGE_PILLS };