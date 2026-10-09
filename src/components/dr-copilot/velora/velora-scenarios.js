

// Deadlines computed relative to "now" so the countdown feels alive.
const inHours = (h) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString()

// ─── PATIENT A · Priya Reddy · Ca Breast post-MRM ─────────────────

const PRIYA_MEDS = [
  { name: "Letrozole", dose: "2.5 mg", frequency: "OD", route: "PO", timing: "Planned · Day 60", status: "planned" },
  { name: "Calcium + Vit D3", dose: "500 mg / 400 IU", frequency: "OD", route: "PO", timing: "Ongoing", status: "ongoing" },
  { name: "Paracetamol", dose: "500 mg", frequency: "TID", route: "PO", timing: "PRN · pain ≥ 4/10", status: "prn" },
  { name: "Cefuroxime", dose: "500 mg", frequency: "BID", route: "PO", timing: "Stopped Day 14", status: "stopped" },
]

const PRIYA_FULL = {
  patient: { label: "Priya Reddy", summary: "63F · Ca Breast post-MRM · Day 54 post-op" },
  title: "Missed window: radiation oncology",
  deadlineIso: inHours(22),
  deadlineLabel: "Window closes in ~22 hours",
  urgency: "critical",
  silos: [
    { label: "Appointment system", tone: "blue" },
    { label: "LIS", tone: "amber" },
    { label: "Pharmacy", tone: "violet" },
  ],
  siloNote:
    "Appointment system doesn't see the pharmacy schedule. LIS doesn't see the rad-onc booking. Velora sees all three.",
  persona: {
    presentation:
      "Post-operative follow-up, Ca Breast (R) · IDC, T2N1M0, ER+/PR+/HER2− · Modified radical mastectomy Day 0.",
    history: [
      "MRM performed · Day 0",
      "Histopath confirmed · Day 6",
      "Medical oncology review · Day 28",
      "Adjuvant plan: RT + Letrozole 5y",
    ],
    labs: [
      { label: "Hb", value: "11.8", unit: "g/dL", flag: "normal" },
      { label: "ALT / AST", value: "28 / 31", unit: "U/L", flag: "normal" },
      { label: "Ca 15-3", value: "18", unit: "U/mL", flag: "normal" },
      { label: "Lipid panel", value: "Not ordered", flag: "missing" },
      { label: "DEXA (baseline)", value: "Not ordered", flag: "missing" },
    ],
    meds: PRIYA_MEDS,
  },
  pathway: [
    { label: "MRM + axillary clearance", status: "done", meta: "Day 0 · 15 Jan" },
    { label: "Histopathology + receptor status", status: "done", meta: "Day 6 · 21 Jan" },
    { label: "Post-op wound review", status: "done", meta: "Day 14 · 29 Jan" },
    { label: "Medical oncology consult", status: "done", meta: "Day 28 · 12 Feb" },
    { label: "Radiation oncology consult", status: "overdue", meta: "Expected by Day 56 · 12 Mar" },
    { label: "Pre-Letrozole lipid baseline", status: "due", meta: "Required before Day 60 · 16 Mar" },
    { label: "DEXA baseline", status: "due", meta: "Before AI start · by 14 Mar" },
    { label: "Letrozole start", status: "pending", meta: "Day 60 · 16 Mar" },
    { label: "RT planning CT", status: "pending", meta: "Post rad-onc consult" },
  ],
  gaps: [
    {
      label: "Radiation oncology consult",
      state: "not_booked",
      detectedBy: "Appointment system",
      expectation: "Expected within 8 weeks of MRM — Day 56 cut-off",
      rationale:
        "Adjuvant radiation is time-critical post-mastectomy. No rad-onc referral has closed the loop with scheduling.",
    },
    {
      label: "Pre-Letrozole lipid baseline",
      state: "not_ordered",
      detectedBy: "LIS · order-entry flag",
      expectation: "Required before Letrozole start — scheduled for Day 60",
      rationale:
        "Aromatase inhibitors warrant a pre-treatment lipid panel. LIS detected a missing order against a scheduled Letrozole start.",
    },
  ],
  clinicalSignificance:
    "Delay past the Day 56 window increases loco-regional recurrence risk; starting Letrozole without a lipid baseline means any later dyslipidaemia cannot be attributed or compared.",
  rationale:
    "Two silos — the appointment system and the LIS — each hold one half of this gap. Neither would flag it alone.",
  actions: [
    { label: "Book rad-onc consult", kind: "primary" },
    { label: "Order lipid panel", kind: "secondary" },
    { label: "Snooze 24h", kind: "pill" },
  ],
}

const PRIYA_BRIEF = {
  patientId: "velora-priya",
  headline: "Missed window: radiation oncology",
  subhead: "Two silos each hold half a gap · window closes in ~22 hours",
  urgencyBadge: { label: "Time-critical", tone: "critical" },
  patient: PRIYA_FULL.patient,
  silos: PRIYA_FULL.silos,
  siloNote: PRIYA_FULL.siloNote,
  highlights: [
    {
      primary: "Rad-onc consult",
      value: "Not booked",
      context: "Day 54 of 56 · cut-off tomorrow",
      tag: { label: "Appointment system", tone: "blue" },
    },
    {
      primary: "Pre-Letrozole lipid",
      value: "Not ordered",
      context: "Required before Day 60 start",
      tag: { label: "LIS", tone: "amber" },
    },
    {
      primary: "Letrozole start",
      value: "Day 60",
      context: "6 days away",
      tag: { label: "Pharmacy", tone: "violet" },
    },
  ],
  primaryExploreLabel: "Show full clinical assessment",
}

// ─── PATIENT B · Rajesh Iyer · CKD-5 on CAPD ──────────────────────

const RAJESH_MEDS = [
  { name: "Amlodipine", dose: "10 mg", frequency: "OD", route: "PO", timing: "Ongoing · 4 months", status: "ongoing" },
  { name: "Losartan", dose: "100 mg", frequency: "OD", route: "PO", timing: "Ongoing · 6 months", status: "ongoing" },
  { name: "Chlorthalidone", dose: "25 mg", frequency: "OD", route: "PO", timing: "Added 4 months ago", status: "ongoing" },
  { name: "Erythropoietin", dose: "4,000 IU", frequency: "Weekly", route: "SC", timing: "Ongoing", status: "ongoing" },
  { name: "Sevelamer", dose: "800 mg", frequency: "TDS", route: "PO", timing: "With meals · ongoing", status: "ongoing" },
  { name: "CAPD exchanges", dose: "2 L × 4", frequency: "QID", route: "Peritoneal", timing: "Unchanged 14 months", status: "ongoing" },
]

const RAJESH_FULL = {
  patient: { label: "Rajesh Iyer", summary: "58M · CKD Stage 5D on CAPD · 14 months" },
  title: "Correlation: fluid-overload chain",
  prediction: { label: "2 admissions predictable", color: "blue" },
  silos: [
    { label: "Nephrology", tone: "blue" },
    { label: "Cardiology", tone: "error" },
    { label: "Internal medicine", tone: "violet" },
  ],
  siloNote:
    "Each specialist sees one signal. None sees the chain. Velora overlays the three notes and the chain appears.",
  persona: {
    presentation:
      "CKD Stage 5D secondary to diabetic nephropathy · CAPD since 14 months · paroxysmal AF · resistant hypertension on 3-drug regimen.",
    history: [
      "CAPD initiated · 14 months ago",
      "2 emergency admissions · past 6 months (fluid overload)",
      "AF first documented · 10 months ago",
      "Antihypertensive regimen escalated to 3 agents · 4 months ago",
    ],
    labs: [
      { label: "KT/V", value: "1.4", flag: "low" },
      { label: "BNP", value: "812", unit: "pg/mL", flag: "high" },
      { label: "eGFR (residual)", value: "4", unit: "mL/min", flag: "low" },
      { label: "Serum albumin", value: "3.2", unit: "g/dL", flag: "low" },
      { label: "Hb", value: "9.8", unit: "g/dL", flag: "low" },
    ],
    meds: RAJESH_MEDS,
  },
  correlationFocus: {
    title: "Dialysis adequacy ↔ Cardiac stress",
    axisA: {
      marker: "KT/V",
      value: "1.4",
      target: ">1.7",
      trend: "down",
      specialtyLabel: "Nephrology",
    },
    axisB: {
      marker: "BNP",
      value: "812 pg/mL",
      target: "<100",
      trend: "up",
      specialtyLabel: "Cardiology",
    },
    narrative:
      "As KT/V has drifted below target, BNP has climbed in lock-step — the classic under-dialysis → volume-overload pattern. Each signal is read in isolation by its own specialist; the correlation only appears when the two are overlaid.",
  },
  chain: [
    { marker: "KT/V", value: "1.4", target: ">1.7", trend: "down", specialty: "nephrology", note: "Under-dialysis" },
    { marker: "BNP", value: "812", target: "<100", trend: "up", specialty: "cardiology", note: "Volume overload" },
    { marker: "AF", value: "Paroxysmal", trend: "flat", specialty: "cardiology", note: "Rate-controlled" },
    { marker: "BP", value: "172/98", target: "<130/80", trend: "up", specialty: "internal_med", note: "3-drug regimen" },
  ],
  specialists: [
    {
      specialty: "nephrology",
      label: "Nephrology",
      rows: [
        { label: "KT/V", value: "1.4", refRange: ">1.7", flag: "low" },
        { label: "Last PD review", value: "18 days ago" },
        { label: "Residual renal fn", value: "0.6 mL/min" },
      ],
      note: "Under-dialysed — prescription not escalated despite adequacy drift.",
    },
    {
      specialty: "cardiology",
      label: "Cardiology",
      rows: [
        { label: "BNP", value: "812 pg/mL", refRange: "<100", flag: "high" },
        { label: "AF episodes", value: "3 in 6 wks" },
        { label: "Echo EF", value: "42%" },
      ],
      note: "Volume-driven AF pattern; cardiology note does not reference dialysis adequacy.",
    },
    {
      specialty: "internal_med",
      label: "Internal medicine",
      rows: [
        { label: "BP (in-clinic)", value: "172/98", refRange: "<130/80", flag: "high" },
        { label: "Antihypertensives", value: "3 agents" },
        { label: "Adherence", value: "Reported 100%" },
      ],
      note: "Resistant hypertension on 3-drug regimen — volume status not reviewed.",
    },
  ],
  predictedOutcomes: [
    "Next volume-overload admission within ~3 weeks if PD prescription unchanged",
    "AF episode frequency likely to rise as BNP climbs",
    "BP will remain resistant until dialysis adequacy is corrected",
  ],
  insight:
    "KT/V drift → fluid overload → rising BNP → paroxysmal AF → resistant hypertension. A single causal chain across three silos. Two recent emergency admissions fit this pattern in retrospect.",
  actions: [
    { label: "Open unified timeline", kind: "primary" },
    { label: "Copy to SBAR", kind: "secondary" },
    { label: "Flag for MDT", kind: "pill" },
  ],
}

const RAJESH_BRIEF = {
  patientId: "velora-rajesh",
  headline: "Correlation: fluid-overload chain",
  subhead: "KT/V ↔ BNP · one causal chain hiding across three specialists",
  urgencyBadge: { label: "2 admissions predictable", tone: "info" },
  patient: RAJESH_FULL.patient,
  silos: RAJESH_FULL.silos,
  siloNote: RAJESH_FULL.siloNote,
  highlights: [
    {
      primary: "KT/V",
      value: "1.4",
      context: "Target >1.7 · under-dialysed",
      tag: { label: "Nephrology", tone: "blue" },
    },
    {
      primary: "BNP",
      value: "812 pg/mL",
      context: "AF paroxysmal · volume overload",
      tag: { label: "Cardiology", tone: "error" },
    },
    {
      primary: "BP",
      value: "172/98",
      context: "3-drug regimen · resistant",
      tag: { label: "Internal med", tone: "violet" },
    },
  ],
  primaryExploreLabel: "Show full correlation assessment",
}

// ─── Exports ──────────────────────────────────────────────────────

export const VELORA_BRIEFS = {
  "velora-priya": PRIYA_BRIEF,
  "velora-rajesh": RAJESH_BRIEF,
}

/** Full extensive cards — routed from the brief card via "Show full …" pill. */
export const VELORA_FULL = {
  "velora-priya": { kind: "care_gap_window", data: PRIYA_FULL },
  "velora-rajesh": { kind: "clinical_correlation_chain", data: RAJESH_FULL },
}

/** Back-compat alias so existing callers keep working. */
export const VELORA_SCENARIOS = VELORA_FULL

export const VELORA_BRIEF_OUTPUT = {
  "velora-priya": { kind: "velora_brief", data: PRIYA_BRIEF },
  "velora-rajesh": { kind: "velora_brief", data: RAJESH_BRIEF },
}
