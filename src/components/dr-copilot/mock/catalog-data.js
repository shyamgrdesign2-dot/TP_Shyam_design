

// Builder that keeps kind & data in sync with the discriminated union
function entry(
  kind,
  label,
  category,
  categoryName,
  data,
) {
  return { kind, label, category, categoryName, data }
}

export const CATALOG_ENTRIES = [
  // ═══════════════════════════════════════════════════════════
  // A. Summary Cards
  // ═══════════════════════════════════════════════════════════

  // A1 — GP Summary (patient_summary)
  entry("patient_summary", "A1 — GP Summary", "A", "Summary Cards", {
    specialtyTags: ["General Practice", "Diabetology"],
    followUpOverdueDays: 12,
    labFlagCount: 3,
    todayVitals: {
      bp: "138/88",
      pulse: "82",
      spo2: "97%",
      temp: "98.6\u00b0F",
      weight: "74 kg",
      height: "172 cm",
      bmi: "25.0",
    },
    keyLabs: [
      { name: "HbA1c", value: "8.1", unit: "%", flag: "high", refRange: "<7%" },
      { name: "Fasting Glucose", value: "168", unit: "mg/dL", flag: "high", refRange: "70-100" },
      { name: "Vitamin D", value: "18", unit: "ng/mL", flag: "low", refRange: "30-100" },
    ],
    chronicConditions: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
    allergies: ["Penicillin", "Dust mites"],
    activeMeds: ["Metformin 500mg BD", "Amlodipine 5mg OD", "Atorvastatin 10mg HS"],
  }),

  // A2 — Obstetric Summary
  entry("obstetric_summary", "A2 — Obstetric Summary", "A", "Summary Cards", {
    gravida: 2,
    para: 1,
    living: 1,
    lmp: "15 Sep'25",
    edd: "22 Jun'26",
    gestationalWeeks: "26",
    presentation: "Cephalic",
    fundusHeight: "26cm",
    ancDue: ["OGTT due (24-28wk)"],
    alerts: ["Mild anemia \u2014 monitor Hb"],
  }),

  // A3 — Gynec Summary
  entry("gynec_summary", "A3 — Gynec Summary", "A", "Summary Cards", {
    menarche: "13 years",
    cycleLength: "28 days",
    lmp: "12 Feb'26",
    flowDuration: "5 days",
    flowIntensity: "Moderate",
    painScore: "3/10",
    lastPapSmear: "Jun'25",
    alerts: ["Pap smear due"],
  }),

  // A4 — Pediatric Summary
  entry("pediatric_summary", "A4 — Pediatric Summary", "A", "Summary Cards", {
    ageDisplay: "2y 4m",
    heightCm: 88,
    heightPercentile: "50th",
    weightKg: 12.5,
    weightPercentile: "55th",
    ofcCm: 48,
    vaccinesPending: 2,
    vaccinesOverdue: 1,
    overdueVaccineNames: ["MMR-2"],
    milestoneNotes: ["Walking independently", "2-word sentences"],
  }),

  // A5 — Ophthal Summary
  entry("ophthal_summary", "A5 — Ophthal Summary", "A", "Summary Cards", {
    vaRight: "6/9",
    vaLeft: "6/12",
    nearVaRight: "N6",
    nearVaLeft: "N8",
    iop: "14/16 mmHg",
    slitLamp: "Clear cornea, no flare",
    fundus: "Normal disc, C:D 0.3",
    glassPrescription: "-1.50 DS (R), -2.00 DS (L)",
  }),

  // A6 — Symptom Collector
  entry("symptom_collector", "A6 — Symptom Collector", "A", "Summary Cards", {
    reportedAt: "Today, 10:15 AM",
    symptoms: [
      { name: "Fever", duration: "3 days", severity: "High" },
      { name: "Dry Cough", duration: "2 days" },
    ],
    allergies: ["Dust"],
    medicalHistory: ["Hypertension"],
    questionsToDoctor: ["Should I get a chest X-ray?"],
  }),

  // A7 — Last Visit
  entry("last_visit", "A7 — Last Visit", "A", "Summary Cards", {
    visitDate: "27 Jan'26",
    sections: [
      {
        tag: "Symptoms",
        icon: "symptoms",
        items: [{ label: "Fever", detail: "3 days, high" }],
      },
      {
        tag: "Diagnosis",
        icon: "diagnosis",
        items: [{ label: "Viral Fever" }],
      },
      {
        tag: "Medication",
        icon: "medication",
        items: [{ label: "Paracetamol 650mg SOS" }],
      },
    ],
    copyAllPayload: {
      sourceDateLabel: "27 Jan'26",
    },
  }),

  // ═══════════════════════════════════════════════════════════
  // B. Data Cards
  // ═══════════════════════════════════════════════════════════

  // B1 — Lab Panel
  entry("lab_panel", "B1 — Lab Panel", "B", "Data Cards", {
    panelDate: "05 Mar'26",
    flagged: [
      { name: "HbA1c", value: "8.1", unit: "%", flag: "high", refRange: "<7%" },
      { name: "Fasting Glucose", value: "168", unit: "mg/dL", flag: "high", refRange: "70-100" },
      { name: "Vitamin D", value: "18", unit: "ng/mL", flag: "low", refRange: "30-100" },
    ],
    hiddenNormalCount: 12,
    insight: "HbA1c elevated \u2014 consider intensifying therapy",
  }),

  // B2 — Vitals Trend Bar
  entry("vitals_trend_bar", "B2 — Vitals Trend Bar", "B", "Data Cards", {
    title: "BP Trend (Last 4 Visits)",
    series: [
      {
        label: "Systolic",
        values: [130, 128, 135, 132],
        dates: ["Jan", "Feb", "Mar", "Apr"],
        tone: "warn",
        threshold: 140,
        thresholdLabel: "High",
        unit: "mmHg",
      },
    ],
  }),

  // B3 — Vitals Trend Line
  entry("vitals_trend_line", "B3 — Vitals Trend Line", "B", "Data Cards", {
    title: "SpO\u2082 Trend",
    series: [
      {
        label: "SpO\u2082",
        values: [97, 96, 94, 93],
        dates: ["20 Jan", "22 Jan", "24 Jan", "27 Jan"],
        tone: "critical",
        threshold: 95,
        thresholdLabel: "Low",
        unit: "%",
      },
    ],
  }),

  // B4 — Lab Trend
  entry("lab_trend", "B4 — Lab Trend", "B", "Data Cards", {
    title: "HbA1c Trend",
    parameterName: "HbA1c",
    series: [
      {
        label: "HbA1c",
        values: [7.2, 7.8, 8.1],
        dates: ["Jul'25", "Nov'25", "Mar'26"],
        tone: "warn",
        threshold: 7,
        thresholdLabel: "Target",
        unit: "%",
      },
    ],
  }),

  // B5 — Lab Comparison
  entry("lab_comparison", "B5 — Lab Comparison", "B", "Data Cards", {
    rows: [
      {
        parameter: "HbA1c",
        prevValue: "7.8",
        currValue: "8.1",
        prevDate: "Nov'25",
        currDate: "Mar'26",
        delta: "+0.3",
        direction: "up",
        isFlagged: true,
      },
      {
        parameter: "LDL",
        prevValue: "155",
        currValue: "142",
        prevDate: "Nov'25",
        currDate: "Mar'26",
        delta: "-13",
        direction: "down",
        isFlagged: true,
      },
      {
        parameter: "TSH",
        prevValue: "4.2",
        currValue: "3.8",
        prevDate: "Nov'25",
        currDate: "Mar'26",
        delta: "-0.4",
        direction: "down",
        isFlagged: false,
      },
    ],
    insight: "HbA1c trending up \u2014 glycemic control worsening",
  }),

  // B6 — Med History
  entry("med_history", "B6 — Med History", "B", "Data Cards", {
    entries: [
      {
        drug: "Metformin 500mg",
        dosage: "1-0-0-0 BF",
        date: "15 Jan'26",
        diagnosis: "Type 2 DM",
        source: "prescribed",
      },
      {
        drug: "Amlodipine 5mg",
        dosage: "1-0-0-0",
        date: "10 Dec'25",
        diagnosis: "HTN",
        source: "prescribed",
      },
    ],
    insight: "Two active medications \u2014 check for interactions",
  }),

  // B7 — Vaccination Schedule
  entry("vaccination_schedule", "B7 — Vaccination Schedule", "B", "Data Cards", {
    title: "Immunization Schedule",
    overdueCount: 1,
    dueCount: 2,
    givenCount: 5,
    vaccines: [
      {
        patientName: "Arjun S",
        name: "MMR",
        dose: "Dose 2",
        dueDate: "15 Mar'26",
        status: "overdue",
      },
      {
        patientName: "Arjun S",
        name: "DPT Booster",
        dose: "Dose 1",
        dueDate: "20 Mar'26",
        status: "due",
      },
      {
        patientName: "Arjun S",
        name: "OPV",
        dose: "Dose 3",
        dueDate: "05 Jan'26",
        status: "given",
      },
    ],
  }),

  // B8 — Patient Timeline
  entry("patient_timeline", "B8 — Patient Timeline", "B", "Data Cards", {
    title: "Patient Timeline",
    events: [
      { date: "05 Mar'26", type: "lab", summary: "CBC, LFT, HbA1c \u2014 3 flagged" },
      { date: "27 Jan'26", type: "visit", summary: "Follow-up for viral fever + DM review" },
      { date: "15 Dec'25", type: "procedure", summary: "ECG \u2014 Normal sinus rhythm" },
      { date: "02 Nov'25", type: "admission", summary: "Admitted for acute gastritis \u2014 2 days" },
    ],
  }),

  // ═══════════════════════════════════════════════════════════
  // C. Action Cards
  // ═══════════════════════════════════════════════════════════

  // C1 — DDx
  entry("ddx", "C1 — Differential Diagnosis", "C", "Action Cards", {
    context: "Fever + Cough + Bilateral eye redness",
    options: [
      { name: "Viral Upper Respiratory Infection", bucket: "most_likely" },
      { name: "Bacterial Pneumonia", bucket: "cant_miss" },
      { name: "COVID-19", bucket: "cant_miss" },
      { name: "Allergic Rhinitis with Conjunctivitis", bucket: "consider" },
      { name: "Influenza", bucket: "most_likely" },
    ],
  }),

  // C2 — Protocol Meds
  entry("protocol_meds", "C2 — Protocol Meds", "C", "Action Cards", {
    diagnosis: "Viral Fever with Conjunctivitis",
    meds: [
      {
        name: "Paracetamol",
        dosage: "650mg",
        timing: "SOS (max 4/day)",
        duration: "3 days",
        notes: "For fever >100.4\u00b0F",
      },
      {
        name: "Moxifloxacin Eye Drops",
        dosage: "0.5%",
        timing: "1 drop QID",
        duration: "5 days",
      },
    ],
    safetyCheck: "No conflicts with current medications",
    copyPayload: {
      sourceDateLabel: "07 Mar'26",
      medications: [
        { medicine: "Paracetamol 650mg", unitPerDose: "1", frequency: "SOS", when: "Max 4/day", duration: "3 days", note: "For fever >100.4\u00b0F" },
      ],
    },
  }),

  // C3 — Investigation Bundle
  entry("investigation_bundle", "C3 — Investigation Bundle", "C", "Action Cards", {
    title: "Suggested Investigations",
    items: [
      { name: "CBC with ESR", rationale: "Fever workup \u2014 rule out bacterial infection" },
      { name: "Chest X-Ray PA", rationale: "Persistent cough \u2014 rule out pneumonia" },
      { name: "CRP", rationale: "Inflammatory marker assessment" },
    ],
    copyPayload: {
      sourceDateLabel: "07 Mar'26",
      labInvestigations: ["CBC with ESR", "Chest X-Ray PA", "CRP"],
    },
  }),

  // C4 — Follow Up
  entry("follow_up", "C4 — Follow Up", "C", "Action Cards", {
    context: "Viral fever recovering, labs pending",
    options: [
      { label: "3 days", days: 3, recommended: true, reason: "Review CBC report" },
      { label: "1 week", days: 7, reason: "Standard post-fever check" },
      { label: "2 weeks", days: 14, reason: "HbA1c recheck" },
    ],
  }),

  // C5 — Advice Bundle
  entry("advice_bundle", "C5 — Advice Bundle", "C", "Action Cards", {
    title: "Patient Advice",
    items: [
      "Rest for 2-3 days, avoid strenuous activity",
      "Drink 2-3L fluids daily (water, ORS, soups)",
      "Monitor temperature every 6 hours",
      "Return if fever persists beyond 3 days or breathing difficulty",
    ],
    shareMessage: "Dear Shyam, here are your post-visit instructions:",
    copyPayload: {
      sourceDateLabel: "07 Mar'26",
      advice: "Rest for 2-3 days. Drink 2-3L fluids daily.",
    },
  }),

  // C6 — Voice Structured Rx
  entry("voice_structured_rx", "C6 — Voice Structured Rx", "C", "Action Cards", {
    voiceText:
      "Patient has fever three days with dry cough. Examination shows mild pharyngeal congestion. Diagnosis viral fever. Tab Paracetamol 650 SOS. Advice rest fluids.",
    sections: [
      {
        sectionId: "symptoms",
        title: "Symptoms",
        tpIconName: "symptoms",
        items: [
          { name: "Fever", detail: "3 days" },
          { name: "Dry Cough" },
        ],
      },
      {
        sectionId: "diagnosis",
        title: "Diagnosis",
        tpIconName: "diagnosis",
        items: [{ name: "Viral Fever" }],
      },
      {
        sectionId: "medication",
        title: "Medication",
        tpIconName: "medication",
        items: [{ name: "Tab Paracetamol 650mg", detail: "SOS" }],
      },
    ],
    copyAllPayload: {
      sourceDateLabel: "07 Mar'26",
      symptoms: ["Fever"],
      diagnoses: ["Viral Fever"],
      medications: [{ medicine: "Paracetamol 650mg", unitPerDose: "1", frequency: "SOS", when: "", duration: "", note: "" }],
    },
  }),

  // C7 — Rx Preview
  entry("rx_preview", "C7 — Rx Preview", "C", "Action Cards", {
    patientName: "Shyam GR",
    date: "07 Mar'26",
    diagnoses: ["Viral Fever", "Conjunctivitis"],
    medications: ["Paracetamol 650mg SOS", "Moxifloxacin Eye Drops 0.5% QID"],
    investigations: ["CBC with ESR", "CRP"],
    advice: ["Rest for 2-3 days", "Fluids 2-3L/day"],
    followUp: "3 days",
  }),

  // ═══════════════════════════════════════════════════════════
  // D. Analysis Cards
  // ═══════════════════════════════════════════════════════════

  // D1 — OCR Pathology
  entry("ocr_pathology", "D1 — OCR Pathology", "D", "Analysis Cards", {
    title: "CBC Report \u2014 OCR Extract",
    category: "Pathology",
    parameters: [
      { name: "Hemoglobin", value: "11.2", refRange: "12-16 g/dL", flag: "low", confidence: "high" },
      { name: "WBC", value: "12,400", refRange: "4000-11000", flag: "high", confidence: "high" },
      { name: "Platelets", value: "2.1L", refRange: "1.5-4.0L", confidence: "high" },
    ],
    normalCount: 8,
    insight: "Elevated WBC + low Hb \u2014 suggests active infection with anemia",
  }),

  // D2 — OCR Extraction
  entry("ocr_extraction", "D2 — OCR Extraction", "D", "Analysis Cards", {
    title: "Discharge Summary \u2014 OCR Extract",
    category: "Discharge Summary",
    sections: [
      {
        heading: "Diagnosis",
        icon: "diagnosis",
        items: ["Acute Gastritis", "Dehydration Grade II"],
        copyDestination: "diagnosis",
      },
      {
        heading: "Medications at Discharge",
        icon: "medication",
        items: ["Pantoprazole 40mg OD", "Ondansetron 4mg SOS"],
        copyDestination: "medication",
      },
    ],
    insight:
      "Patient was admitted for 2 days for acute gastritis \u2014 review current meds for continuity",
  }),

  // ═══════════════════════════════════════════════════════════
  // E. Utility & Safety Cards
  // ═══════════════════════════════════════════════════════════

  // E1 — Translation
  entry("translation", "E1 — Translation", "E", "Utility & Safety Cards", {
    sourceLanguage: "Kannada",
    targetLanguage: "English",
    sourceText:
      "\u0ca8\u0ca8\u0c97\u0cc6 \u0cae\u0cc2\u0cb0\u0cc1 \u0ca6\u0cbf\u0ca8\u0c97\u0cb3\u0cbf\u0c82\u0ca6 \u0c9c\u0ccd\u0cb5\u0cb0 \u0cae\u0ca4\u0ccd\u0ca4\u0cc1 \u0c95\u0cc6\u0cae\u0ccd\u0cae\u0cc1 \u0c87\u0ca6\u0cc6",
    translatedText: "I have had fever and cough for three days",
    copyPayload: {
      sourceDateLabel: "11 Mar'26",
      symptoms: ["Fever (3 days)", "Cough (3 days)"],
    },
  }),

  // E2 — Completeness
  entry("completeness", "E2 — Completeness", "E", "Utility & Safety Cards", {
    sections: [
      { name: "Vitals", filled: true, count: 5 },
      { name: "Symptoms", filled: true, count: 2 },
      { name: "Examination", filled: false },
      { name: "Diagnosis", filled: true, count: 1 },
      { name: "Medication", filled: true, count: 2 },
      { name: "Investigation", filled: false },
      { name: "Advice", filled: false },
    ],
    emptyCount: 3,
  }),

  // E3 — Drug Interaction
  entry("drug_interaction", "E3 — Drug Interaction", "E", "Utility & Safety Cards", {
    drug1: "Metformin 500mg",
    drug2: "Contrast Dye (CT scan)",
    severity: "high",
    risk: "Risk of lactic acidosis with iodinated contrast in patients on metformin",
    action: "Hold Metformin 48hrs before and after contrast procedure",
  }),

  // E4 — Allergy Conflict
  entry("allergy_conflict", "E4 — Allergy Conflict", "E", "Utility & Safety Cards", {
    drug: "Amoxicillin 500mg",
    allergen: "Penicillin",
    alternative: "Azithromycin 500mg",
  }),

  // E5 — Follow Up Question
  entry("follow_up_question", "E5 — Follow Up Question", "E", "Utility & Safety Cards", {
    question: "Where is the fever most prominent?",
    options: [
      "Evening spikes only",
      "Continuous throughout the day",
      "Morning with chills",
      "After physical activity",
    ],
    multiSelect: false,
  }),

  // E6 — Referral
  entry("referral", "E6 — Referral", "E", "Utility & Safety Cards", {
    title: "Doctor Referral Summary (Incoming)",
    totalReferrers: 2,
    totalPatients: 5,
    items: [
      {
        doctorName: "Dr. Mehra",
        doctorPhone: "98XXXXXX11",
        specialty: "Cardiology",
        patientsReferred: 3,
        topReason: "Elevated creatinine + HTN review",
      },
      {
        doctorName: "Dr. Priya",
        doctorPhone: "98XXXXXX22",
        specialty: "Endocrinology",
        patientsReferred: 2,
        topReason: "Thyroid optimization in pregnancy",
      },
    ],
  }),

  // E7 — Clinical Guideline
  entry("clinical_guideline", "E7 — Clinical Guideline", "E", "Utility & Safety Cards", {
    title: "Guideline Reference",
    condition: "Type 2 Diabetes Management",
    source: "ADA Standards of Care 2026",
    recommendations: [
      "HbA1c target < 7% for most adults",
      "Metformin remains first-line therapy",
      "Add SGLT2i or GLP-1 RA if HbA1c > 7.5% on metformin alone",
      "Annual retinal screening and foot exam",
    ],
    evidenceLevel: "A",
  }),

  // ═══════════════════════════════════════════════════════════
  // F. Homepage Cards
  // ═══════════════════════════════════════════════════════════

  // F1 — Welcome Card
  entry("welcome_card", "F1 — Welcome Card", "F", "Homepage Cards", {
    greeting: "Good Morning, Dr. Sheela!",
    date: "Wednesday, 07 Mar'26",
    stats: [
      { label: "Today's Patients", value: 18, color: "#3B82F6", icon: "people" },
      { label: "Follow-ups Due", value: 5, color: "#F59E0B", icon: "calendar" },
      { label: "Lab Reports", value: 3, color: "#10B981", icon: "lab" },
    ],
    tips: ["3 patients have overdue follow-ups"],
    contextLine: "You have 18 appointments scheduled today",
  }),

  // F2 — Patient List
  entry("patient_list", "F2 — Patient List", "F", "Homepage Cards", {
    title: "Today's Patients",
    items: [
      { name: "Shyam GR", age: 28, gender: "M", time: "10:00 AM", status: "In Progress", statusTone: "info" },
      { name: "Lakshmi K", age: 32, gender: "F", time: "10:30 AM", status: "Waiting", statusTone: "warning" },
      { name: "Arjun S", age: 2, gender: "M", time: "11:00 AM", status: "Scheduled", statusTone: "info" },
    ],
    totalCount: 18,
  }),

  // F3 — Follow Up List
  entry("follow_up_list", "F3 — Follow Up List", "F", "Homepage Cards", {
    title: "Follow-up dues today",
    items: [
      { name: "Vikram Singh", scheduledDate: "11:15 AM", reason: "HTN medication review", isOverdue: false },
      { name: "Lakshmi K", scheduledDate: "4:10 PM", reason: "Hb recheck", isOverdue: true },
      { name: "Neha Gupta", scheduledDate: "5:30 PM", reason: "Asthma follow-up", isOverdue: false },
    ],
    overdueCount: 1,
  }),

  // F4 — Revenue Bar
  entry("revenue_bar", "F4 — Revenue Bar", "F", "Homepage Cards", {
    title: "Today's Billing",
    mode: "billing",
    totalRevenue: 7800,
    totalPaid: 5400,
    totalDue: 1800,
    totalRefunded: 600,
    days: [
      { label: "Today", paid: 5400, due: 1800, refunded: 600 },
    ],
  }),

  // F5 — Bulk Action
  entry("bulk_action", "F5 — Bulk Action", "F", "Homepage Cards", {
    action: "Send Follow-up Reminders",
    messagePreview:
      "Dear patient, your follow-up appointment is due. Please visit the clinic at your earliest convenience.",
    recipients: ["Shyam GR", "Meera Devi", "Ravi Kumar", "Sunita Reddy"],
    totalCount: 4,
  }),

  // F6 — Donut Chart
  entry("donut_chart", "F6 — Donut Chart", "F", "Homepage Cards", {
    title: "Consultation Types",
    segments: [
      { label: "New", value: 8, color: "#3B82F6" },
      { label: "Follow-up", value: 6, color: "#8B5CF6" },
      { label: "Emergency", value: 2, color: "#EF4444" },
      { label: "Teleconsult", value: 2, color: "#10B981" },
    ],
    total: 18,
    centerLabel: "Total",
  }),

  // F7 — Pie Chart
  entry("pie_chart", "F7 — Pie Chart", "F", "Homepage Cards", {
    title: "Payment Methods",
    segments: [
      { label: "Cash", value: 12, color: "#10B981" },
      { label: "Card", value: 4, color: "#3B82F6" },
      { label: "UPI", value: 8, color: "#8B5CF6" },
      { label: "Insurance", value: 3, color: "#F59E0B" },
    ],
    total: 27,
    centerLabel: "Payments",
  }),

  // F8 — Line Graph
  entry("line_graph", "F8 — Line Graph", "F", "Homepage Cards", {
    title: "Daily Footfall",
    points: [
      { label: "Mon", value: 15 },
      { label: "Tue", value: 18 },
      { label: "Wed", value: 12 },
      { label: "Thu", value: 20 },
      { label: "Fri", value: 16 },
    ],
    average: 16.2,
    changePercent: "+8%",
    changeDirection: "up",
  }),

  // F9 — Analytics Table
  entry("analytics_table", "F9 — Analytics Table", "F", "Homepage Cards", {
    title: "Weekly KPIs",
    kpis: [
      {
        metric: "Avg Wait Time",
        thisWeek: "12 min",
        lastWeek: "15 min",
        delta: "-3 min",
        direction: "down",
        isGood: true,
      },
      {
        metric: "Patient Satisfaction",
        thisWeek: "4.6/5",
        lastWeek: "4.4/5",
        delta: "+0.2",
        direction: "up",
        isGood: true,
      },
      {
        metric: "No-shows",
        thisWeek: "3",
        lastWeek: "2",
        delta: "+1",
        direction: "up",
        isGood: false,
      },
    ],
    insight: "Wait time improved by 20% this week",
  }),

  // F10 — Condition Bar
  entry("condition_bar", "F10 — Condition Bar", "F", "Homepage Cards", {
    title: "Top Conditions Today",
    items: [
      { condition: "Viral Fever", count: 5, color: "#EF4444" },
      { condition: "Hypertension", count: 4, color: "#3B82F6" },
      { condition: "Diabetes", count: 3, color: "#F59E0B" },
      { condition: "URTI", count: 2, color: "#10B981" },
    ],
    note: "Viral fever cases up 40% vs last week",
  }),

  // F11 — Heatmap
  entry("heatmap", "F11 — Heatmap", "F", "Homepage Cards", {
    title: "Appointment Density",
    rows: ["9 AM", "10 AM", "11 AM", "12 PM", "2 PM", "3 PM"],
    cols: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    cells: [
      [
        { value: 3, intensity: "high" },
        { value: 2, intensity: "medium" },
        { value: 1, intensity: "low" },
        { value: 3, intensity: "high" },
        { value: 2, intensity: "medium" },
      ],
      [
        { value: 3, intensity: "high" },
        { value: 3, intensity: "high" },
        { value: 2, intensity: "medium" },
        { value: 3, intensity: "high" },
        { value: 2, intensity: "medium" },
      ],
      [
        { value: 2, intensity: "medium" },
        { value: 2, intensity: "medium" },
        { value: 1, intensity: "low" },
        { value: 2, intensity: "medium" },
        { value: 1, intensity: "low" },
      ],
      [
        { value: 1, intensity: "low" },
        { value: 1, intensity: "low" },
        { value: 0, intensity: "low" },
        { value: 1, intensity: "low" },
        { value: 0, intensity: "low" },
      ],
      [
        { value: 2, intensity: "medium" },
        { value: 3, intensity: "high" },
        { value: 2, intensity: "medium" },
        { value: 3, intensity: "high" },
        { value: 2, intensity: "medium" },
      ],
      [
        { value: 2, intensity: "medium" },
        { value: 2, intensity: "medium" },
        { value: 1, intensity: "low" },
        { value: 2, intensity: "medium" },
        { value: 1, intensity: "low" },
      ],
    ],
  }),

  // F12 — Billing Summary
  entry("billing_summary", "F12 — Billing Summary", "F", "Homepage Cards", {
    title: "Today's collection",
    mode: "combined",
    items: [
      { referenceNo: "BIL-2900567", patientName: "Shyam GR", amount: 2400, status: "paid_fully" },
      { referenceNo: "BIL-2900571", patientName: "Vikram Singh", amount: 1800, status: "due" },
      { referenceNo: "BIL-2900572", patientName: "Lakshmi K", amount: 600, status: "refunded" },
      { referenceNo: "ADV-2900573", patientName: "Neha Gupta", amount: 900, status: "deposited" },
    ],
    totalBilledAmount: 7800,
    totalPaidFullyAmount: 5400,
    totalDueAmount: 1800,
    totalRefundedAmount: 600,
    totalAdvanceReceived: 2100,
    totalAdvanceRefunded: 300,
    totalAdvanceDebited: 500,
    footerCtaLabel: "Open OPD billing section",
    insight: "Billing and advance metrics shown for today only.",
  }),

  // F15 — Due Patients
  entry("due_patients", "F15 — Due Patients", "F", "Homepage Cards", {
    title: "Patients with due",
    periodLabel: "This week",
    patientCount: 6,
    totalDueAmount: 18400,
    asOf: "Today, 12:30 PM",
    ctaLabel: "View in detail",
  }),

  // F16 — Follow-up Rate
  entry("follow_up_rate", "F16 — Follow-up Rate", "F", "Homepage Cards", {
    title: "Follow-up rate",
    currentRate: 74,
    lastWeekRate: 69,
    dueToday: 9,
    overdueToday: 3,
    completedThisWeek: 31,
    scheduledThisWeek: 42,
    trend: [
      { label: "W1", rate: 66 },
      { label: "W2", rate: 71 },
      { label: "W3", rate: 69 },
      { label: "W4", rate: 74 },
    ],
  }),

  // F17 — External CTA
  entry("external_cta", "F17 — External CTA", "F", "Homepage Cards", {
    title: "Export ready: Excel",
    description: "Your requested data is prepared in spreadsheet format. Use the link below to open or download the file.",
    ctaLabel: "Open Excel file",
    ctaUrl: "https://example.com/exports/daily-collection.xlsx",
    openInNewTab: true,
  }),

  // F13 — Vaccination Due List
  entry("vaccination_due_list", "F13 — Vaccination Due List", "F", "Homepage Cards", {
    title: "Vaccinations Due/Overdue",
    overdueCount: 2,
    dueCount: 3,
    items: [
      {
        patientName: "Arjun S",
        vaccineName: "MMR",
        dose: "Dose 2",
        dueDate: "01 Mar'26",
        isOverdue: true,
      },
      {
        patientName: "Baby Priya",
        vaccineName: "DPT",
        dose: "Dose 3",
        dueDate: "28 Feb'26",
        isOverdue: true,
      },
      {
        patientName: "Meera K",
        vaccineName: "HPV",
        dose: "Dose 1",
        dueDate: "15 Mar'26",
        isOverdue: false,
      },
    ],
  }),

  // F14 — ANC Schedule List
  entry("anc_schedule_list", "F14 — ANC Schedule List", "F", "Homepage Cards", {
    title: "ANC Schedule \u2014 Due/Overdue",
    overdueCount: 1,
    dueCount: 2,
    items: [
      {
        patientName: "Priya Rao",
        ancItem: "OGTT",
        dueWeek: "24-28 wk",
        gestationalAge: "26 weeks",
        isOverdue: false,
      },
      {
        patientName: "Lakshmi K",
        ancItem: "NT Scan",
        dueWeek: "11-14 wk",
        gestationalAge: "13 weeks",
        isOverdue: true,
      },
    ],
  }),

  // ═══════════════════════════════════════════════════════════
  // G. Text Cards
  // ═══════════════════════════════════════════════════════════

  // G1 — Text Fact
  entry("text_fact", "G1 — Text Fact", "G", "Text Cards", {
    value:
      "Normal fasting blood sugar is 70-100 mg/dL. Your reading of 168 mg/dL is significantly elevated.",
    context: "Blood Sugar Reference",
    source: "ADA Guidelines 2026",
  }),

  // G2 — Text Alert
  entry("text_alert", "G2 — Text Alert", "G", "Text Cards", {
    message:
      "**Critical:** SpO\u2082 has dropped to 93% \u2014 below the 95% threshold. Consider pulse oximetry monitoring and supplemental oxygen if needed.",
    severity: "critical",
  }),

  // G3 — Text List
  entry("text_list", "G3 — Text List", "G", "Text Cards", {
    items: [
      "Rest for 2-3 days",
      "Increase fluid intake to 2-3L/day",
      "Monitor temperature every 6 hours",
      "Avoid cold foods and beverages",
      "Complete the full course of antibiotics",
    ],
  }),

  // G4 — Text Step
  entry("text_step", "G4 — Text Step", "G", "Text Cards", {
    steps: [
      "Take a detailed history including fever pattern and associated symptoms",
      "Perform focused examination: throat, chest, abdomen",
      "Order CBC and CRP if bacterial infection suspected",
      "Start empirical treatment based on clinical findings",
      "Schedule follow-up in 3-5 days to review lab results",
    ],
  }),

  // G5 — Text Quote
  entry("text_quote", "G5 — Text Quote", "G", "Text Cards", {
    quote:
      "In patients with diabetes and hypertension, target blood pressure should be maintained below 130/80 mmHg to reduce cardiovascular risk.",
    source: "AHA/ACC 2025 Guidelines",
  }),

  // G6 — Text Comparison
  entry("text_comparison", "G6 — Text Comparison", "G", "Text Cards", {
    labelA: "Viral Fever",
    labelB: "Bacterial Infection",
    itemsA: [
      "Gradual onset",
      "Low-grade fever",
      "Body aches common",
      "Self-limiting 3-5 days",
      "WBC normal or low",
    ],
    itemsB: [
      "Sudden onset",
      "High-grade fever",
      "Localized pain",
      "Requires antibiotics",
      "WBC elevated with left shift",
    ],
  }),
]
