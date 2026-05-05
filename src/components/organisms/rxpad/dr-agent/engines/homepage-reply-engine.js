// -----------------------------------------------------------------
// Homepage Reply Engine -- Maps operational queries → Homepage cards
// Generates mock operational data for the Homepage Doctor Agent
// -----------------------------------------------------------------



























// ═══════════════ MOCK DATA GENERATORS ═══════════════

function mockPatientList() {
  return {
    title: "Queue List: Today",
    totalCount: 19,
    items: [
    { name: "Ramesh M", age: 35, gender: "M", time: "10:15 AM", status: "Queue", statusTone: "info", patientId: "apt-zerodata" },
    { name: "Neha Gupta", age: 32, gender: "F", time: "10:20 AM", status: "Follow-up", statusTone: "warning", patientId: "apt-neha" },
    { name: "Shyam GR", age: 25, gender: "M", time: "10:30 AM", status: "Follow-up", statusTone: "warning", patientId: "__patient__" },
    { name: "Anjali Patel", age: 28, gender: "F", time: "10:45 AM", status: "New", statusTone: "info", patientId: "apt-anjali" },
    { name: "Vikram Singh", age: 42, gender: "M", time: "11:00 AM", status: "Overdue", statusTone: "danger", patientId: "apt-vikram" },
    { name: "Priya Rao", age: 26, gender: "F", time: "11:15 AM", status: "Routine", statusTone: "success", patientId: "apt-priya" }]

  };
}

function mockFollowUpList() {
  return {
    title: "Follow-up Dues Today",
    overdueCount: 2,
    items: [
    { name: "Shyam GR", scheduledDate: "9 Mar'26", reason: "Review culture results", isOverdue: false, patientId: "__patient__" },
    { name: "Vikram Singh", scheduledDate: "5 Mar'26", reason: "HTN medication review", isOverdue: true, patientId: "apt-vikram" },
    { name: "Lakshmi K", scheduledDate: "2 Mar'26", reason: "Hb recheck after iron therapy", isOverdue: true, patientId: "apt-lakshmi" }]

  };
}

function mockOverdueFollowUpsToday() {
  return {
    title: "Overdue Follow-ups Today",
    overdueCount: 2,
    items: [
    { name: "Vikram Singh", scheduledDate: "Today · 11:15 AM", reason: "HTN medication review", isOverdue: true, patientId: "apt-vikram" },
    { name: "Lakshmi K", scheduledDate: "Today · 4:10 PM", reason: "Hb recheck after iron therapy", isOverdue: true, patientId: "apt-lakshmi" }]

  };
}

function mockThisWeekFollowUps() {
  return {
    title: "This Week Follow-ups",
    overdueCount: 3,
    items: [
    { name: "Shyam GR", scheduledDate: "Mon · 10:30 AM", reason: "Review culture results", isOverdue: false, patientId: "__patient__" },
    { name: "Vikram Singh", scheduledDate: "Tue · 11:15 AM", reason: "HTN medication review", isOverdue: true, patientId: "apt-vikram" },
    { name: "Lakshmi K", scheduledDate: "Wed · 4:10 PM", reason: "Hb recheck after iron therapy", isOverdue: true, patientId: "apt-lakshmi" },
    { name: "Neha Gupta", scheduledDate: "Thu · 9:50 AM", reason: "Asthma follow-up", isOverdue: false, patientId: "apt-neha" },
    { name: "Priya Rao", scheduledDate: "Fri · 3:00 PM", reason: "ANC review", isOverdue: false, patientId: "apt-priya" },
    { name: "Arjun S", scheduledDate: "Sat · 12:20 PM", reason: "Vaccination catch-up", isOverdue: true, patientId: "apt-arjun" }]

  };
}

function mockRevenueBar() {
  return {
    title: "This Week's Billing",
    mode: "billing",
    totalRevenue: 42500,
    totalPaid: 38200,
    totalDue: 4300,
    totalRefunded: 1100,
    days: [
    { label: "Mon", paid: 7200, due: 800, refunded: 120 },
    { label: "Tue", paid: 6500, due: 500, refunded: 140 },
    { label: "Wed", paid: 8100, due: 1200, refunded: 180 },
    { label: "Thu", paid: 5400, due: 600, refunded: 160 },
    { label: "Fri", paid: 6800, due: 700, refunded: 210 },
    { label: "Sat", paid: 4200, due: 500, refunded: 290 }]

  };
}

function mockDepositBar() {
  return {
    title: "This Week's Deposits",
    mode: "deposit",
    totalRevenue: 3600,
    totalPaid: 3600,
    totalDue: 500,
    totalRefunded: 800,
    days: [
    { label: "Mon", paid: 600, due: 100, refunded: 120 },
    { label: "Tue", paid: 700, due: 50, refunded: 90 },
    { label: "Wed", paid: 500, due: 120, refunded: 160 },
    { label: "Thu", paid: 650, due: 80, refunded: 110 },
    { label: "Fri", paid: 650, due: 90, refunded: 170 },
    { label: "Sat", paid: 500, due: 60, refunded: 150 }]

  };
}

function mockTodayRevenueBar() {
  return {
    title: "Today's Billing",
    mode: "billing",
    totalRevenue: 7800,
    totalPaid: 6400,
    totalDue: 1200,
    totalRefunded: 200,
    days: [
    { label: "Today", paid: 6400, due: 1200, refunded: 200 }]

  };
}

function mockTodayDepositBar() {
  return {
    title: "Today's Deposits",
    mode: "deposit",
    totalRevenue: 2200,
    totalPaid: 2200,
    totalDue: 300,
    totalRefunded: 150,
    days: [
    { label: "Today", paid: 2200, due: 300, refunded: 150 }]

  };
}

function mockRevenueComparison() {
  return {
    title: "Billing Comparison",
    primaryDateLabel: "Today (12 Mar)",
    compareDateLabel: "Yesterday (11 Mar)",
    primaryRevenue: 7800,
    compareRevenue: 6950,
    primaryRefunded: 180,
    compareRefunded: 95,
    primaryDeposits: 2200,
    compareDeposits: 1800
  };
}

function mockBulkAction(recipientNames) {
  return {
    action: `Send SMS reminder to ${recipientNames.length} patients`,
    messagePreview: "Dear patient, this is a reminder for your follow-up appointment at TP Clinic. Please confirm your availability.",
    recipients: recipientNames,
    totalCount: recipientNames.length
  };
}

function mockDonutChart() {
  return {
    title: "Patient Demographics: Age Groups",
    total: 284,
    centerLabel: "patients",
    segments: [
    { label: "0–17y", value: 42, color: "#3B6FE0" },
    { label: "18–30y", value: 68, color: "#7049C7" },
    { label: "31–45y", value: 82, color: "#0E7E7E" },
    { label: "46–60y", value: 56, color: "#C6850C" },
    { label: "60+", value: 36, color: "#C42B2B" }]

  };
}

function mockPieChart() {
  return {
    title: "Top Diagnoses: This Week",
    total: 64,
    centerLabel: "diagnoses",
    segments: [
    { label: "Viral Fever", value: 16, color: "#C42B2B" },
    { label: "DM Follow-up", value: 13, color: "#3B6FE0" },
    { label: "HTN Review", value: 10, color: "#7049C7" },
    { label: "URTI", value: 9, color: "#0E7E7E" },
    { label: "ANC Routine", value: 8, color: "#C6850C" },
    { label: "Others", value: 8, color: "#9E978B" }]

  };
}

function mockLineGraph() {
  return {
    title: "Patient Volume: Last 4 Weeks",
    average: 17,
    changePercent: "12%",
    changeDirection: "up",
    points: [
    { label: "W1", value: 14 },
    { label: "W2", value: 18 },
    { label: "W3", value: 15 },
    { label: "W4", value: 22 }]

  };
}

function mockAnalyticsTable() {
  return {
    title: "Weekly Performance: KPIs",
    kpis: [
    { metric: "Total Patients", thisWeek: "64", lastWeek: "58", delta: "+10%", direction: "up", isGood: true },
    { metric: "Revenue", thisWeek: "₹42,500", lastWeek: "₹38,800", delta: "+9.5%", direction: "up", isGood: true },
    { metric: "Avg / Patient", thisWeek: "₹664", lastWeek: "₹669", delta: "-0.7%", direction: "down", isGood: false },
    { metric: "Follow-up Rate", thisWeek: "72%", lastWeek: "68%", delta: "+4%", direction: "up", isGood: true },
    { metric: "Cancellation", thisWeek: "11%", lastWeek: "8%", delta: "+3%", direction: "up", isGood: false },
    { metric: "Due Bills", thisWeek: "₹4,300", lastWeek: "₹3,100", delta: "+38%", direction: "up", isGood: false }]

  };
}

function mockConditionBar() {
  return {
    title: "Chronic Condition Distribution",
    note: "68 patients have 2+ conditions (DM+HTN most common: 42)",
    items: [
    { condition: "Diabetes Mellitus", count: 86, color: "#3B6FE0" },
    { condition: "Hypertension", count: 72, color: "#C42B2B" },
    { condition: "Thyroid", count: 45, color: "#7049C7" },
    { condition: "Asthma", count: 28, color: "#0E7E7E" },
    { condition: "COPD", count: 18, color: "#C6850C" },
    { condition: "Others", count: 35, color: "#9E978B" }]

  };
}

function mockHeatmap() {
  return {
    title: "Appointment Slot Utilization",
    rows: ["9–10 AM", "10–11 AM", "11–12 PM", "4–5 PM", "5–6 PM"],
    cols: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    cells: [
    [{ value: 3, intensity: "low" }, { value: 4, intensity: "medium" }, { value: 2, intensity: "low" }, { value: 5, intensity: "medium" }, { value: 3, intensity: "low" }, { value: 1, intensity: "low" }],
    [{ value: 7, intensity: "high" }, { value: 8, intensity: "high" }, { value: 6, intensity: "medium" }, { value: 7, intensity: "high" }, { value: 5, intensity: "medium" }, { value: 3, intensity: "low" }],
    [{ value: 5, intensity: "medium" }, { value: 6, intensity: "medium" }, { value: 8, intensity: "high" }, { value: 4, intensity: "medium" }, { value: 6, intensity: "medium" }, { value: 2, intensity: "low" }],
    [{ value: 4, intensity: "medium" }, { value: 5, intensity: "medium" }, { value: 3, intensity: "low" }, { value: 6, intensity: "medium" }, { value: 4, intensity: "medium" }, { value: 2, intensity: "low" }],
    [{ value: 2, intensity: "low" }, { value: 3, intensity: "low" }, { value: 2, intensity: "low" }, { value: 3, intensity: "low" }, { value: 2, intensity: "low" }, { value: 1, intensity: "low" }]]

  };
}

function mockReferral() {
  return {
    title: "Doctor Referral Summary (Incoming)",
    totalReferrers: 4,
    totalPatients: 19,
    items: [
    { doctorName: "Dr. Meena Iyer", doctorPhone: "9876501122", specialty: "OBG", patientsReferred: 7, topReason: "ANC and high-risk pregnancy follow-up" },
    { doctorName: "Dr. Ravi Mehta", doctorPhone: "9899001134", specialty: "Cardiology", patientsReferred: 5, topReason: "HTN and chest pain workup" },
    { doctorName: "Dr. Sanjay Nair", doctorPhone: "9822207711", specialty: "Ophthalmology", patientsReferred: 4, topReason: "Diabetic retinopathy screening" },
    { doctorName: "Dr. Kiran Joshi", doctorPhone: "9966112200", specialty: "General Medicine", patientsReferred: 3, topReason: "Fever and chronic disease review" }]

  };
}

function mockVaccinationSchedule() {
  return {
    title: "Vaccination Schedule: This Week",
    overdueCount: 1,
    dueCount: 3,
    givenCount: 1,
    vaccines: [
    { patientName: "Arjun S", patientId: "apt-arjun", name: "MMR-2", dose: "0.5ml SC", dueDate: "15 Feb'26", status: "overdue" },
    { patientName: "Neha Gupta", patientId: "apt-neha", name: "Td/TT Booster", dose: "0.5ml IM", dueDate: "12 Mar'26", status: "due" },
    { patientName: "Sita R", name: "Hepatitis B (Dose 3)", dose: "1ml IM", dueDate: "12 Mar'26", status: "due" },
    { patientName: "Vikram Singh", patientId: "apt-vikram", name: "Influenza (Annual)", dose: "0.5ml IM", dueDate: "14 Mar'26", status: "due" },
    { patientName: "Priya Rao", patientId: "apt-priya", name: "Tdap (ANC)", dose: "0.5ml IM", dueDate: "10 Mar'26", status: "given" }]

  };
}

function mockClinicalGuideline() {
  return {
    title: "Clinical Guidelines: Asthma in Pregnancy",
    condition: "Bronchial Asthma in Pregnancy",
    source: "GINA 2025 / Indian Chest Society",
    recommendations: [
    "Budesonide is the preferred ICS in pregnancy (Category B)",
    "Uncontrolled asthma poses greater risk to fetus than medication use",
    "Monitor PEFR weekly — target ≥80% predicted",
    "Step down only after ≥3 months of well-controlled asthma",
    "Avoid Deriphyllin in 1st trimester — use LABA if needed",
    "Screen for GDM if on systemic corticosteroids"],

    evidenceLevel: "A"
  };
}

function mockBillingSummary(mode = "combined") {
  return {
    title: mode === "billing" ?
    "OPD Billing: This Week" :
    mode === "deposit" ?
    "Advance Deposits: This Week" :
    "Billing & Deposits: This Week",
    items: [
    mode === "deposit" ?
    { referenceNo: "ADV-2900567", patientName: "Tony Danza", amount: 500, status: "deposited" } :
    { referenceNo: "INV-2900567", patientName: "Tony Danza", amount: 500, billedAmount: 500, paidAmount: 500, status: "paid_fully" },
    mode === "deposit" ?
    { referenceNo: "ADV-2900571", patientName: "Templeton Peck", amount: 500, status: "deposited" } :
    { referenceNo: "INV-2900569", patientName: "Jonathan Higgins", amount: 250, billedAmount: 750, paidAmount: 500, status: "due" },
    mode === "deposit" ?
    { referenceNo: "ADV-2900572", patientName: "Capt. Trunk", amount: 500, status: "debited" } :
    { referenceNo: "INV-2900571", patientName: "Templeton Peck", amount: 500, billedAmount: 500, paidAmount: 500, status: "paid_fully" },
    mode === "deposit" ?
    { referenceNo: "ADV-2900573", patientName: "Michael Knight", amount: 800, status: "refunded" } :
    { referenceNo: "INV-2900573", patientName: "Michael Knight", amount: 800, billedAmount: 800, paidAmount: 800, status: "refunded" }],

    mode,
    totalBilledAmount: 42500,
    totalPaidFullyAmount: 38200,
    totalDueAmount: 4300,
    totalRefundedAmount: 1100,
    totalAdvanceReceived: 3600,
    totalAdvanceRefunded: 800,
    totalAdvanceDebited: 500,
    footerCtaLabel: "Open OPD billing section",
    footerCtaAction: "Open OPD billing section"
  };
}

function mockTodayCollectionSummary() {
  return {
    ...mockBillingSummary("combined"),
    title: "Today's Collection Overview",
    items: [
    { referenceNo: "INV-2900611", patientName: "Neha Gupta", amount: 1200, billedAmount: 1200, paidAmount: 1200, status: "paid_fully" },
    { referenceNo: "INV-2900612", patientName: "Vikram Singh", amount: 1500, billedAmount: 1500, paidAmount: 300, status: "due" },
    { referenceNo: "INV-2900613", patientName: "Ramesh M", amount: 1000, billedAmount: 1000, paidAmount: 1000, status: "paid_fully" },
    { referenceNo: "INV-2900614", patientName: "Priya Rao", amount: 800, billedAmount: 800, paidAmount: 800, status: "paid_fully" },
    { referenceNo: "INV-2900615", patientName: "Sita R", amount: 400, billedAmount: 400, paidAmount: 0, status: "due" },
    { referenceNo: "ADV-2900616", patientName: "Arjun S", amount: 500, status: "deposited" },
    { referenceNo: "ADV-2900617", patientName: "Meera Nair", amount: 200, status: "debited" },
    { referenceNo: "ADV-2900618", patientName: "Tony Danza", amount: 300, status: "refunded" }],

    totalBilledAmount: 7800,
    totalPaidFullyAmount: 6400,
    totalDueAmount: 1200,
    totalRefundedAmount: 200,
    totalAdvanceReceived: 2200,
    totalAdvanceDebited: 300,
    totalAdvanceRefunded: 150,
    footerCtaLabel: "View details",
    footerCtaAction: "Open OPD billing section"
  };
}

function mockPast30DayCollectionSummary() {
  return {
    ...mockBillingSummary("combined"),
    title: "Past 30 Days Collection",
    totalBilledAmount: 184000,
    totalPaidFullyAmount: 161500,
    totalDueAmount: 18500,
    totalRefundedAmount: 4000,
    totalAdvanceReceived: 27600,
    totalAdvanceDebited: 4200,
    totalAdvanceRefunded: 2100,
    footerCtaLabel: "Open OPD billing section",
    footerCtaAction: "Open OPD billing section"
  };
}

function mockGenerateInvoiceCard() {
  return {
    ...mockBillingSummary("combined"),
    title: "Generate Invoice",
    minimal: true,
    footerCtaLabel: "Open OPD billing section",
    footerCtaAction: "Open OPD billing section"
  };
}

function opdBillingTodayPills() {
  return [
  { id: "hp-collection-today", label: "Today's collection", priority: 8, layer: 3, tone: "primary" },
  { id: "hp-billing-today", label: "Today's billing", priority: 10, layer: 3, tone: "primary" },
  { id: "hp-deposits-today", label: "Today's deposits", priority: 12, layer: 3, tone: "primary" },
  { id: "hp-generate-invoice", label: "Generate invoice", priority: 14, layer: 3, tone: "primary" }];

}

function mockDuePatients(period) {
  const isWeek = period === "week";
  return {
    title: isWeek ? "Patients With Due — This Week" : "Patients With Due — Till Now",
    periodLabel: isWeek ? "Week to date" : "Cumulative (till now)",
    patientCount: 10,
    totalDueAmount: 18500,
    asOf: isWeek ? "this week" : "today",
    ctaLabel: "View in detail"
  };
}

function mockFollowUpRateCard() {
  return {
    title: "Follow-up Rate",
    currentRate: 72,
    lastWeekRate: 68,
    dueToday: 5,
    overdueToday: 2,
    completedThisWeek: 18,
    scheduledThisWeek: 25,
    trend: [
    { label: "W1", rate: 61 },
    { label: "W2", rate: 65 },
    { label: "W3", rate: 68 },
    { label: "W4", rate: 72 }]

  };
}

function mockPatientTimeline() {
  return {
    title: "Patient Activity: This Week",
    events: [
    { date: "10 Mar'26", type: "visit", summary: "Neha Gupta — Asthma follow-up + ANC" },
    { date: "10 Mar'26", type: "lab", summary: "Shyam GR — CBC, LFT results received" },
    { date: "9 Mar'26", type: "visit", summary: "Vikram Singh — HTN review, ECG done" },
    { date: "8 Mar'26", type: "procedure", summary: "Priya Rao — NST performed at 38wk" },
    { date: "7 Mar'26", type: "lab", summary: "Lakshmi K — Hb recheck: 9.8 g/dL (improving)" },
    { date: "6 Mar'26", type: "visit", summary: "Arjun S — Cough follow-up, MMR-2 pending" }]

  };
}

function mockVaccinationDueList() {
  return {
    title: "Vaccination Due & Overdue",
    overdueCount: 2,
    dueCount: 3,
    items: [
    { patientName: "Arjun S", patientId: "apt-arjun", vaccineName: "MMR", dose: "Dose 2", dueDate: "15 Feb'26", isOverdue: true },
    { patientName: "Baby Meera", vaccineName: "IPV", dose: "Booster", dueDate: "1 Mar'26", isOverdue: true },
    { patientName: "Neha Gupta", patientId: "apt-neha", vaccineName: "Td/TT", dose: "Dose 1", dueDate: "12 Mar'26", isOverdue: false },
    { patientName: "Priya Rao", patientId: "apt-priya", vaccineName: "Tdap", dose: "Dose 1", dueDate: "14 Mar'26", isOverdue: false },
    { patientName: "Sita R", vaccineName: "Hepatitis B", dose: "Dose 3", dueDate: "18 Mar'26", isOverdue: false }]

  };
}

function mockANCScheduleList() {
  return {
    title: "ANC Schedule — Due & Overdue",
    overdueCount: 1,
    dueCount: 3,
    items: [
    { patientName: "Priya Rao", patientId: "apt-priya", ancItem: "Dating Scan", dueWeek: "8-10 wk", gestationalAge: "38wk", isOverdue: true },
    { patientName: "Neha Gupta", patientId: "apt-neha", ancItem: "NT Scan", dueWeek: "11-14 wk", gestationalAge: "12wk", isOverdue: false },
    { patientName: "Neha Gupta", patientId: "apt-neha", ancItem: "First Trimester Screening", dueWeek: "11-14 wk", gestationalAge: "12wk", isOverdue: false },
    { patientName: "Shalini M", ancItem: "GDM Screening", dueWeek: "24-28 wk", gestationalAge: "25wk", isOverdue: false }]

  };
}

function mockExternalExportCard(format) {
  const isExcel = format === "excel";
  return {
    title: isExcel ? "Export ready: Excel" : "Export ready: Word",
    description: isExcel ?
    "Your requested data is prepared in spreadsheet format. Use the link below to open or download the file." :
    "Your requested document is prepared in Word format. Use the link below to open or download the file.",
    ctaLabel: isExcel ? "Open Excel file" : "Open Word document",
    ctaUrl: isExcel ? "https://example.com/exports/daily-collection.xlsx" : "https://example.com/exports/daily-collection.docx",
    openInNewTab: true
  };
}

// ═══════════════ MAIN BUILDER ═══════════════

export function buildHomepageReply(input, intent) {
  const n = input.toLowerCase();

  // ── Multi-word phrase handlers (must come before single-word matches like "schedule") ──

  // External export CTA (single-view response card)
  if (n.includes("excel") || n.includes("xlsx") || n.includes("sheet format") || n.includes("spreadsheet")) {
    return {
      text: "I prepared an Excel output for this request.",
      rxOutput: { kind: "external_cta", data: mockExternalExportCard("excel") },
      followUpPills: [
      { id: "hp-billing-today", label: "Today's billing", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-collection-today", label: "Today's collection", priority: 12, layer: 3, tone: "primary" }]

    };
  }
  if (n.includes("word") || n.includes("docx") || n.includes("document format")) {
    return {
      text: "I prepared a Word document output for this request.",
      rxOutput: { kind: "external_cta", data: mockExternalExportCard("word") },
      followUpPills: [
      { id: "hp-billing-today", label: "Today's billing", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-collection-today", label: "Today's collection", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Referral Summary
  if (n.includes("referral") || n.includes("refer") || n.includes("specialist referral")) {
    return {
      text: "Here is the incoming referral summary: doctors who referred patients to your clinic this week.",
      rxOutput: { kind: "referral", data: mockReferral() },
      followUpPills: [
      { id: "hp-billing-week", label: "This week's billing", priority: 12, layer: 3, tone: "primary" },
      { id: "hp-followups", label: "Follow-ups due", priority: 14, layer: 3, tone: "primary" }]

    };
  }

  // Vaccination Due/Overdue List (must come before generic "vaccination" match)
  if (n.includes("vaccination due") || n.includes("vaccine overdue") || n.includes("vaccination overdue") || n.includes("immunization due")) {
    return {
      text: "5 patients with pending vaccinations — 2 overdue, 3 due this week.",
      rxOutput: { kind: "vaccination_due_list", data: mockVaccinationDueList() },
      followUpPills: [
      { id: "hp-vaccine-schedule", label: "Vaccination schedule", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-followups", label: "Follow-ups due", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // ANC Schedule Due/Overdue List
  if (n.includes("anc schedule") || n.includes("anc due") || n.includes("antenatal") || n.includes("obstetric schedule") || n.includes("anc overdue")) {
    return {
      text: "4 ANC checkpoints pending — 1 overdue (Dating Scan for Priya Rao at 38wk).",
      rxOutput: { kind: "anc_schedule_list", data: mockANCScheduleList() },
      followUpPills: [
      { id: "hp-vaccine-due", label: "Vaccination due list", priority: 10, layer: 3, tone: "warning" },
      { id: "hp-followups", label: "Follow-ups due", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Vaccination Schedule
  if (n.includes("vaccination") || n.includes("vaccine schedule") || n.includes("immunization") || n.includes("vaccine due")) {
    return {
      text: "3 vaccinations pending this week, 1 overdue. Here's the schedule.",
      rxOutput: { kind: "vaccination_schedule", data: mockVaccinationSchedule() },
      followUpPills: [
      { id: "hp-followups", label: "Follow-ups due", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-guidelines", label: "Clinical guidelines", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Clinical Guidelines
  if (n.includes("guideline") || n.includes("clinical guideline") || n.includes("evidence") || n.includes("treatment protocol")) {
    return {
      text: "Here are the latest clinical guidelines relevant to your current patient mix.",
      rxOutput: { kind: "clinical_guideline", data: mockClinicalGuideline() },
      followUpPills: [
      { id: "hp-vaccine-schedule", label: "Vaccination schedule", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-referrals", label: "Referral summary", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Billing Overview
  if (n.includes("bill summary") || n.includes("billing overview") || n.includes("invoice summary")) {
    return {
      text: "This week's billing (excluding deposits): ₹42,500 billed, ₹38,200 paid fully, ₹4,300 due, ₹1,100 refunded.",
      rxOutput: { kind: "revenue_bar", data: mockRevenueBar() },
      followUpPills: [
      { id: "hp-billing-week", label: "This week's billing", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-deposits-week", label: "This week's deposits", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Patient Timeline — removed from clinic overview (patient-specific; handled via guardrail in DrAgentPanel)

  // Patient List / Schedule
  if (n.includes("schedule") || n.includes("queue") || n.includes("appointment") || n.includes("who's next") || n.includes("today's schedule")) {
    return {
      text: "Appointments are already visible on screen. Current snapshot: 18 patients total, 7 in queue, 3 finished, 2 drafts pending.",
      rxOutput: { kind: "patient_list", data: mockPatientList() },
      followUpPills: [
      { id: "hp-fu-due", label: "Follow-ups due", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-kpi-queue", label: "Weekly KPIs", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Follow-ups (specific handlers first)
  if (n.includes("follow-up dues this week") || n.includes("follow up dues this week")) {
    return {
      text: "Showing follow-up dues for this week.",
      rxOutput: { kind: "follow_up_list", data: mockThisWeekFollowUps() },
      followUpPills: [
      { id: "hp-fu-due", label: "Follow-up dues today", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-fu-rate", label: "Follow-up rate", priority: 12, layer: 3, tone: "info" }]

    };
  }

  if (n.includes("overdue follow-ups today") || n.includes("overdue follow up today")) {
    return {
      text: "Showing overdue follow-ups scheduled for today.",
      rxOutput: { kind: "follow_up_list", data: mockOverdueFollowUpsToday() },
      followUpPills: [
      { id: "hp-fu-due", label: "Follow-up dues today", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-fu-week", label: "This week follow-ups", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  if (n.includes("this week follow-ups") || n.includes("this week's follow-up") || n.includes("this week follow-up")) {
    return {
      text: "Here's the follow-up roster for this week.",
      rxOutput: { kind: "follow_up_list", data: mockThisWeekFollowUps() },
      followUpPills: [
      { id: "hp-fu-due", label: "Follow-up dues today", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-fu-rate", label: "Follow-up rate", priority: 12, layer: 3, tone: "info" }]

    };
  }

  if (n.includes("follow-up rate") || n.includes("follow up rate")) {
    return {
      text: "Here is the current follow-up rate overview.",
      rxOutput: { kind: "follow_up_rate", data: mockFollowUpRateCard() },
      followUpPills: [
      { id: "hp-fu-due", label: "Follow-up dues today", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-fu-week", label: "This week follow-ups", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  if (n.includes("follow-up dues today") || n.includes("follow-ups due today") || n.includes("follow up due today")) {
    return {
      text: "Showing follow-up dues scheduled for today.",
      rxOutput: { kind: "follow_up_list", data: mockFollowUpList() },
      followUpPills: [
      { id: "hp-fu-overdue", label: "Overdue follow-ups today", priority: 10, layer: 3, tone: "warning" },
      { id: "hp-fu-week", label: "This week follow-ups", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Follow-ups (fallback generic)
  if (n.includes("follow-up") || n.includes("follow up") || n.includes("overdue") || n.includes("callback") || n.includes("follow-ups due")) {
    return {
      text: "3 follow-ups scheduled today, 2 are overdue. You can send individual or bulk reminders.",
      rxOutput: { kind: "follow_up_list", data: mockFollowUpList() },
      followUpPills: [
      { id: "hp-fu-due", label: "Follow-up dues today", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-fu-rate", label: "Follow-up rate", priority: 12, layer: 3, tone: "info" }]

    };
  }

  if (
  n.includes("this week's deposits") ||
  n.includes("this week deposits") ||
  n.includes("weekly deposits") ||
  n.includes("week deposits") ||
  n.includes("deposit this week"))
  {
    return {
      text: "This week's deposits: ₹3,600 received, ₹800 refunded, ₹500 debited.",
      rxOutput: { kind: "revenue_bar", data: mockDepositBar() },
      followUpPills: [
      { id: "hp-billing-week", label: "This week's billing", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-compare-yday", label: "Compare with yesterday", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  if (
  n.includes("this week's billing") ||
  n.includes("this week billing") ||
  n.includes("weekly billing") ||
  n.includes("week billing"))
  {
    return {
      text: "This week's billing (excluding advance deposits): ₹42,500 total billed, ₹38,200 collected, ₹4,300 due, ₹1,100 refunded.",
      rxOutput: { kind: "revenue_bar", data: mockRevenueBar() },
      followUpPills: [
      { id: "hp-deposits-week", label: "This week's deposits", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-compare-yday", label: "Compare with yesterday", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  if (n.includes("compare with yesterday")) {
    return {
      text: "Here's today's billing versus yesterday for quick comparison.",
      rxOutput: { kind: "revenue_comparison", data: mockRevenueComparison() },
      followUpPills: [
      { id: "hp-billing-week", label: "This week's billing", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-deposits-week", label: "This week's deposits", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  if (n.includes("revenue today") || n.includes("today revenue") || n.includes("today's revenue")) {
    return {
      text: "Top-level billing today: ₹7,800 billed, ₹180 refunded. Deposits are tracked separately.",
      rxOutput: { kind: "billing_summary", data: mockTodayCollectionSummary() },
      followUpPills: [
      { id: "hp-collection-today", label: "Today's collection", priority: 8, layer: 3, tone: "primary" },
      { id: "hp-billing-today", label: "Today's billing", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-deposits-today", label: "Today's deposits", priority: 12, layer: 3, tone: "primary" },
      { id: "hp-collection-30d", label: "Past 30 days collection", priority: 14, layer: 3, tone: "primary" }]

    };
  }

  // OPD Billing rail specifics (kept before generic revenue matcher)
  if (n.includes("total bill today") || n.includes("today bill total") || n.includes("today's billing") || n.includes("todays billing")) {
    return {
      text: "Here's today's billing only.",
      rxOutput: { kind: "revenue_bar", data: mockTodayRevenueBar() },
      followUpPills: opdBillingTodayPills()
    };
  }

  if (n.includes("today's deposit") || n.includes("todays deposit") || n.includes("today deposit")) {
    return {
      text: "Here's today's deposits only.",
      rxOutput: { kind: "revenue_bar", data: mockTodayDepositBar() },
      followUpPills: opdBillingTodayPills()
    };
  }

  if (n.includes("overall collection") || n.includes("past 30 days collection") || n.includes("last 30 days collection")) {
    return {
      text: "Here's the overall collection snapshot for the past 30 days.",
      rxOutput: { kind: "billing_summary", data: mockPast30DayCollectionSummary() },
      followUpPills: [
      { id: "hp-collection-today", label: "Today's collection", priority: 8, layer: 3, tone: "primary" },
      { id: "hp-billing-week", label: "This week's billing", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-deposits-week", label: "This week's deposits", priority: 12, layer: 3, tone: "primary" },
      { id: "hp-generate-invoice", label: "Generate invoice", priority: 14, layer: 3, tone: "primary" }]

    };
  }

  if (n.includes("today's collection") || n.includes("todays collection")) {
    return {
      text: "Here's today's collection summary with billing, advance, and dues.",
      rxOutput: { kind: "billing_summary", data: mockTodayCollectionSummary() },
      followUpPills: opdBillingTodayPills()
    };
  }

  if (n.includes("patients with due") || n.includes("patient with due") || n.includes("dues this week") || n.includes("due this week")) {
    return {
      text: "Here are patients with due for this week.",
      rxOutput: { kind: "due_patients", data: mockDuePatients("week") },
      followUpPills: opdBillingTodayPills()
    };
  }

  if (n.includes("due till now") || n.includes("dues till now") || n.includes("dues till date")) {
    return {
      text: "Here are patients with due till now.",
      rxOutput: { kind: "due_patients", data: mockDuePatients("till_now") },
      followUpPills: opdBillingTodayPills()
    };
  }

  if (n.includes("open billing") || n.includes("open opd billing") || n.includes("billing section")) {
    return {
      text: "Opening OPD billing overview with dues and collection summary.",
      rxOutput: { kind: "billing_summary", data: mockTodayCollectionSummary() },
      followUpPills: opdBillingTodayPills()
    };
  }

  // Revenue
  if (n.includes("revenue") || n.includes("billing") || n.includes("collection") || n.includes("payment") || n.includes("income") || n.includes("earnings")) {
    return {
      text: "This week's billing (excluding advance deposits): ₹42,500 total billed, ₹38,200 paid fully, ₹4,300 due, ₹1,100 refunded.",
      rxOutput: { kind: "revenue_bar", data: mockRevenueBar() },
      followUpPills: [
      { id: "hp-deposits-week", label: "This week's deposits", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-compare-yday", label: "Compare with yesterday", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // SMS / Reminders / Bulk
  if (n.includes("send sms") || n.includes("send reminder") || n.includes("remind all") || n.includes("bulk sms") || n.includes("notify")) {
    // Extract specific patient name if "send reminder to <name>"
    const singleMatch = n.match(/send reminder to (.+)/);
    const isAll = n.includes("remind all") || n.includes("reminder to all") || n.includes("bulk");
    if (singleMatch && !isAll) {
      const patientName = singleMatch[1].trim().replace(/^(dr\.?\s+)/i, "");
      // Capitalize each word for display
      const displayName = patientName.replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        text: `I've prepared an SMS reminder for ${displayName}. Please review and confirm.`,
        rxOutput: { kind: "bulk_action", data: mockBulkAction([displayName]) }
      };
    }
    return {
      text: "I've prepared a bulk SMS for overdue follow-up patients. Please review and confirm.",
      rxOutput: { kind: "bulk_action", data: mockBulkAction(["Vikram Singh", "Lakshmi K", "Shyam GR"]) }
    };
  }

  // Demographics
  if (n.includes("demographic") || n.includes("age group") || n.includes("gender split") || n.includes("patient composition") || n.includes("patient distribution")) {
    return {
      text: "Here's the patient demographics breakdown by age group. 284 total patients on record.",
      rxOutput: { kind: "donut_chart", data: mockDonutChart() },
      followUpPills: [
      { id: "hp-diagnosis-dist", label: "Diagnosis breakdown", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-conditions", label: "Chronic conditions", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Diagnosis Distribution
  if (n.includes("diagnosis distribution") || n.includes("top diagnos") || n.includes("common condition") || n.includes("diagnosis breakdown")) {
    return {
      text: "Top diagnoses this week: Viral Fever leads at 25%, followed by DM Follow-up and HTN Review.",
      rxOutput: { kind: "pie_chart", data: mockPieChart() },
      followUpPills: [
      { id: "hp-demographics", label: "Patient demographics", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-conditions", label: "Chronic conditions", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Patient Volume / Footfall
  if (n.includes("patient volume") || n.includes("footfall") || n.includes("monthly patient") || n.includes("patient trend") || n.includes("trend") && !n.includes("vital")) {
    return {
      text: "Patient volume has increased 12% over the last 4 weeks, from 14/day average to 22/day.",
      rxOutput: { kind: "line_graph", data: mockLineGraph() },
      followUpPills: [
      { id: "hp-peak-hours", label: "Peak hours", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-demographics", label: "Patient demographics", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // KPIs / Analytics
  if (n.includes("kpi") || n.includes("performance") || n.includes("weekly summary") || n.includes("analytics") || n.includes("dashboard") || n.includes("weekly kpi")) {
    return {
      text: "Here's this week's performance dashboard compared to last week.",
      rxOutput: { kind: "analytics_table", data: mockAnalyticsTable() },
      followUpPills: [
      { id: "hp-billing-week", label: "This week's billing", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-deposits-week", label: "This week's deposits", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Chronic Conditions
  if (n.includes("chronic") || n.includes("diabetic") || n.includes("hypertensive") || n.includes("condition breakdown") || n.includes("condition distribution")) {
    return {
      text: "Chronic condition distribution across your patient base. DM and HTN are the most prevalent.",
      rxOutput: { kind: "condition_bar", data: mockConditionBar() },
      followUpPills: [
      { id: "hp-demographics", label: "Patient demographics", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-guidelines", label: "Clinical guidelines", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Heatmap / Busiest
  if (n.includes("busiest") || n.includes("slot utilization") || n.includes("peak hour") || n.includes("appointment density") || n.includes("busiest hours") || n.includes("peak hours")) {
    return {
      text: "Appointment slot heatmap: 10-11 AM is consistently the busiest across all days.",
      rxOutput: { kind: "heatmap", data: mockHeatmap() },
      followUpPills: [
      { id: "hp-patient-volume", label: "Patient trends", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-cancel-rate", label: "Cancellation rate", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // How many patients
  if (n.includes("how many patient") || n.includes("patient count") || n.includes("total patient")) {
    return {
      text: "Today: 18 patients scheduled, 7 in queue, 3 finished, 2 cancelled, 2 drafts, 2 pending discharge. Total on record: 284 patients."
    };
  }

  // Cancellation
  if (n.includes("cancel") || n.includes("no show") || n.includes("no-show") || n.includes("cancellation rate")) {
    return {
      text: "This week's cancellation rate: 11% (7 out of 64). Up from 8% last week. Main reasons: patient called to postpone (3), no reason given (2), rescheduled (2).",
      followUpPills: [
      { id: "hp-cancel-detail", label: "Show cancelled patients", priority: 10, layer: 3, tone: "primary" },
      { id: "hp-reduce-cancel", label: "Reduce cancellations", priority: 12, layer: 3, tone: "primary" }]

    };
  }

  // Pre-consultation: add symptoms
  if (n.includes("add") && (n.includes("fever") || n.includes("symptom") || n.includes("cough") || n.includes("pain"))) {
    // Try to extract patient name
    const patients = ["shyam", "anjali", "vikram", "priya", "arjun", "lakshmi", "ramesh"];
    const matched = patients.find((p) => n.includes(p));
    const patientName = matched ? matched.charAt(0).toUpperCase() + matched.slice(1) : "the patient";
    return {
      text: `\u2705 Pre-consultation data noted for ${patientName}. This will appear in the Symptoms section when you open their Rx.`
    };
  }

  // Pre-consultation: copy last Rx
  if (n.includes("copy last") || n.includes("copy rx") || n.includes("copy prescription")) {
    return {
      text: "\u2705 Last visit medications have been pre-filled. When you open the Rx, you'll see them in the Med(Rx) section. Review before saving."
    };
  }

  // ── Rail-specific: Follow-ups ──
  if (n.includes("overdue follow-up") || n.includes("overdue follow up")) {
    return {
      text: "You have 2 overdue follow-ups: Vikram Singh (HTN review, 4 days overdue) and Lakshmi K (Hb recheck, 7 days overdue). Shall I send reminders?",
      rxOutput: { kind: "follow_up_list", data: mockFollowUpList() }
    };
  }
  if (n.includes("this week's follow-up") || n.includes("this week follow-up")) {
    return {
      text: "Here's the follow-up roster for this week.",
      rxOutput: { kind: "follow_up_list", data: mockThisWeekFollowUps() }
    };
  }
  if (n.includes("follow-up rate") || n.includes("follow up rate")) {
    return {
      text: "Here is the current follow-up rate overview.",
      rxOutput: { kind: "follow_up_rate", data: mockFollowUpRateCard() }
    };
  }

  // ── Rail-specific: OPD Billing ──
  if (n.includes("generate invoice")) {
    return {
      text: "Generate invoice from OPD billing for the selected patient.",
      rxOutput: { kind: "billing_summary", data: mockGenerateInvoiceCard() },
      followUpPills: opdBillingTodayPills()
    };
  }

  // ── Rail-specific: Pharmacy ──
  if (n.includes("low stock")) {
    return { text: "Low stock alerts: Metformin 500mg (12 strips left, ~3 days), Amoxicillin 250mg (8 strips), Pantoprazole 40mg (15 strips). Reorder recommended for all 3." };
  }
  if (n.includes("pending prescription")) {
    return { text: "3 prescriptions pending dispensing: Shyam GR (10:30 AM, 4 items), Anjali Patel (10:45 AM, 2 items), Ramesh M (10:15 AM, 3 items)." };
  }
  if (n.includes("dispense history")) {
    return { text: "Today's dispense log: 4 prescriptions fulfilled. Total items: 14. Most dispensed: Paracetamol 650mg (4 patients), Metformin 500mg (3 patients)." };
  }
  if (n.includes("expiring medicine")) {
    return { text: "Medicines expiring within 30 days: Azithromycin 500mg (batch AZ-2024, exp 2 Apr), Ceftriaxone Inj (batch CT-2024, exp 28 Mar). Action: Return/use immediately." };
  }

  // ── Rail-specific: Bulk Messages ──
  if (n.includes("draft campaign")) {
    return { text: "Campaign draft started. Template: Follow-up reminder. Recipients: 12 overdue patients. Preview: 'Dear [Name], your follow-up at TP Clinic is overdue. Please call +91-XXXXX to reschedule.'" };
  }
  if (n.includes("delivery stat")) {
    return { text: "Last campaign stats: 45 messages sent, 42 delivered (93.3%), 3 failed. Open rate: 78%. Response rate: 34% (14 patients confirmed/rescheduled)." };
  }
  if (n.includes("template library")) {
    return { text: "Available templates: Follow-up Reminder, Appointment Confirmation, Lab Report Ready, Vaccination Due, Birthday Greeting, Health Tip of the Week. 6 templates total." };
  }
  if (n.includes("scheduled message")) {
    return { text: "2 scheduled messages: Tomorrow 9 AM, 'Appointment reminder' to 5 patients. Wednesday 10 AM, 'Lab report ready' to 3 patients." };
  }

  // ── Patient-context pills ──
  if (n.includes("patient snapshot") || n.includes("patient's detailed summary") || n.includes("detailed summary")) {
    return { text: "Select a specific patient from the dropdown above to see their clinical snapshot, including vitals, recent visits, and active medications." };
  }
  if (n.includes("pre-consult prep")) {
    return { text: "Pre-consult prep ready. Review pending labs, overdue follow-up reasons, and symptom reports before starting the consultation. Switch to the patient context above to see specific data." };
  }
  if (n.includes("abnormal lab")) {
    return { text: "Patients with abnormal labs this week: Shyam GR (HbA1c 8.2%, Creatinine 1.4), Vikram Singh (LDL 168, TG 210), Lakshmi K (Hb 9.8, improving). 3 patients flagged." };
  }

  // Fallback
  return {
    text: "I can help with follow-ups, weekly billing, weekly deposits, patient demographics, diagnosis trends, and more.",
    followUpPills: [
    { id: "hp-fu", label: "Follow-ups due", priority: 12, layer: 3, tone: "primary" },
    { id: "hp-bill", label: "This week's billing", priority: 14, layer: 3, tone: "primary" },
    { id: "hp-dep", label: "This week's deposits", priority: 16, layer: 3, tone: "primary" },
    { id: "hp-kpi", label: "Weekly KPIs", priority: 18, layer: 3, tone: "primary" }]

  };
}