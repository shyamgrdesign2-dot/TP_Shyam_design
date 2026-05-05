/**
 * Sample Data for RX Workspace
 * ─────────────────────────────
 * Realistic medical data for component development and testing.
 * All data is fictional and for demonstration purposes only.
 */
















export const samplePatient = {
  id: "PAT-001",
  name: "Rajesh Kumar",
  age: 34,
  gender: "Male",
  bloodGroup: "B+",
  phone: "+91 98765 43210",
  uhid: "TP-2024-00142"
};

export const samplePastVisits = [
{
  id: "pv-1",
  date: "2025-06-24",
  visitType: "OPD",
  doctorName: "Dr. Ananya Sharma",
  speciality: "General Medicine",
  symptoms: ["Fever", "Headache", "Body ache", "Sore throat"],
  examination: [
  "Throat — Congested, mild erythema",
  "Chest — Clear, bilateral air entry equal",
  "Abdomen — Soft, non-tender"],

  diagnosis: ["Acute Upper Respiratory Infection", "Viral Pharyngitis"],
  medications: [
  { name: "Paracetamol 500mg", dosage: "1 Tab", frequency: "1-0-1", duration: "5 Days" },
  { name: "Cetirizine 10mg", dosage: "1 Tab", frequency: "0-0-1", duration: "5 Days" },
  { name: "Azithromycin 500mg", dosage: "1 Tab", frequency: "1-0-0", duration: "3 Days" }],

  advices: ["Warm saline gargles thrice daily", "Plenty of fluids", "Rest for 2-3 days"],
  followUp: "5 Days",
  notes: "Patient advised to revisit if fever persists beyond 3 days"
},
{
  id: "pv-2",
  date: "2025-05-10",
  visitType: "OPD",
  doctorName: "Dr. Ananya Sharma",
  speciality: "General Medicine",
  symptoms: ["Cough", "Running nose", "Mild fever"],
  examination: [
  "Throat — Normal",
  "Chest — Occasional rhonchi, no crepitations",
  "Vitals — Stable"],

  diagnosis: ["Common Cold", "Acute Bronchitis"],
  medications: [
  { name: "Ambroxol 30mg", dosage: "1 Tab", frequency: "1-0-1", duration: "5 Days" },
  { name: "Levocetirizine 5mg", dosage: "1 Tab", frequency: "0-0-1", duration: "3 Days" }],

  advices: ["Steam inhalation twice daily", "Avoid cold beverages"],
  followUp: "1 Week"
},
{
  id: "pv-3",
  date: "2025-03-15",
  visitType: "Teleconsult",
  doctorName: "Dr. Priya Mehta",
  speciality: "Dermatology",
  symptoms: ["Skin rash", "Itching on arms"],
  examination: ["Erythematous papular rash on bilateral forearms", "No vesicles or pustules"],
  diagnosis: ["Contact Dermatitis"],
  medications: [
  { name: "Hydroxyzine 25mg", dosage: "1 Tab", frequency: "0-0-1", duration: "7 Days" },
  { name: "Mometasone Cream", dosage: "Apply thin layer", frequency: "1-0-1", duration: "7 Days" }],

  advices: ["Avoid contact with suspected allergen", "Use mild soap", "Wear cotton clothing"],
  followUp: "2 Weeks"
}];


export const sampleVitals = [
{
  id: "v-1",
  date: "2025-06-24",
  bloodPressure: { systolic: 128, diastolic: 82, status: "normal" },
  temperature: { value: 99.2, unit: "F", status: "warning" },
  heartRate: { value: 88, status: "normal" },
  respiratoryRate: { value: 18, status: "normal" },
  spO2: { value: 97, status: "normal" },
  weight: { value: 72, unit: "kg" },
  height: { value: 175, unit: "cm" },
  bmi: { value: 23.5, status: "normal" }
},
{
  id: "v-2",
  date: "2025-05-10",
  bloodPressure: { systolic: 122, diastolic: 78, status: "normal" },
  temperature: { value: 98.6, unit: "F", status: "normal" },
  heartRate: { value: 76, status: "normal" },
  respiratoryRate: { value: 16, status: "normal" },
  spO2: { value: 98, status: "normal" },
  weight: { value: 71.5, unit: "kg" }
},
{
  id: "v-3",
  date: "2025-03-15",
  bloodPressure: { systolic: 142, diastolic: 92, status: "warning" },
  temperature: { value: 98.4, unit: "F", status: "normal" },
  heartRate: { value: 92, status: "warning" },
  spO2: { value: 96, status: "normal" },
  weight: { value: 73, unit: "kg" }
}];


export const sampleHistory = {
  allergies: [
  {
    id: "a-1",
    allergen: "Penicillin",
    type: "Drug",
    severity: "severe",
    reaction: "Anaphylaxis — Difficulty breathing, swelling of face and throat",
    reportedDate: "2020-03-15"
  },
  {
    id: "a-2",
    allergen: "Peanuts",
    type: "Food",
    severity: "moderate",
    reaction: "Hives, nausea, abdominal cramping",
    reportedDate: "2019-08-22"
  },
  {
    id: "a-3",
    allergen: "Dust Mites",
    type: "Environmental",
    severity: "mild",
    reaction: "Sneezing, runny nose, watery eyes"
  }],

  chronicConditions: [
  {
    id: "cc-1",
    condition: "Type 2 Diabetes Mellitus",
    diagnosedDate: "2021-06-15",
    status: "Active",
    medications: ["Metformin 500mg BD"],
    notes: "HbA1c last checked: 6.8% (Mar 2025)"
  },
  {
    id: "cc-2",
    condition: "Essential Hypertension",
    diagnosedDate: "2022-01-10",
    status: "Active",
    medications: ["Amlodipine 5mg OD"],
    notes: "Well controlled on current medication"
  }],

  surgicalHistory: [
  {
    id: "sh-1",
    procedure: "Appendectomy",
    date: "2018-11-20",
    hospital: "City General Hospital",
    outcome: "Uneventful recovery"
  }],

  familyHistory: [
  {
    id: "fh-1",
    relation: "Father",
    condition: "Type 2 Diabetes Mellitus",
    ageOfOnset: "45 years",
    status: "Living"
  },
  {
    id: "fh-2",
    relation: "Mother",
    condition: "Hypertension",
    ageOfOnset: "50 years",
    status: "Living"
  },
  {
    id: "fh-3",
    relation: "Paternal Grandfather",
    condition: "Coronary Artery Disease",
    ageOfOnset: "60 years",
    status: "Deceased",
    notes: "MI at age 65"
  }],

  socialHistory: {
    smoking: { status: "Never" },
    alcohol: { status: "Occasional", details: "Social drinking, 1-2 drinks per month" },
    occupation: "Software Engineer",
    exercise: "Moderate — walks 30 min daily, gym twice a week",
    diet: "Mixed — vegetarian on weekdays, non-vegetarian on weekends"
  }
};

export const sampleOphthal = [
{
  id: "oph-1",
  date: "2025-04-10",
  vision: [
  { eye: "Right", unaided: "6/12", withGlasses: "6/6", pinhole: "6/6", nearVision: "N6" },
  { eye: "Left", unaided: "6/9", withGlasses: "6/6", pinhole: "6/6", nearVision: "N6" }],

  iop: { right: 14, left: 16, method: "Non-contact tonometry" },
  anteriorSegment: { right: "Normal", left: "Normal" },
  posteriorSegment: { right: "Normal fundus, CDR 0.3", left: "Normal fundus, CDR 0.3" },
  diagnosis: ["Myopia — Right eye", "Mild Myopia — Left eye"],
  treatment: ["Corrective lenses prescribed"],
  notes: "Annual review recommended"
}];


export const sampleGynec = [
{
  id: "gyn-1",
  date: "2025-02-20",
  menstrualHistory: {
    lmp: "2025-02-05",
    cycleLength: 28,
    duration: 5,
    regularity: "Regular",
    flow: "Moderate",
    dysmenorrhea: true,
    notes: "Mild cramping on day 1-2, manages with OTC analgesics"
  },
  papSmear: { date: "2024-12-15", result: "Normal — No abnormal cells detected" },
  contraception: "Oral contraceptive pills",
  complaints: ["Mild dysmenorrhea"],
  diagnosis: ["Primary Dysmenorrhea"],
  treatment: ["Mefenamic Acid 500mg SOS for pain"]
}];


export const sampleObstetric = {
  obstetricFormula: "G3P2A0L2",
  previousPregnancies: [
  {
    id: "preg-1",
    year: "2020",
    outcome: "Live Birth",
    modeOfDelivery: "NVD",
    birthWeight: "3.2 kg",
    gender: "Male",
    complications: []
  },
  {
    id: "preg-2",
    year: "2022",
    outcome: "Live Birth",
    modeOfDelivery: "LSCS",
    birthWeight: "3.5 kg",
    gender: "Female",
    complications: ["Gestational Diabetes"],
    notes: "Elective LSCS due to previous section"
  }],

  currentPregnancy: {
    edd: "2025-09-15",
    lmp: "2024-12-08",
    gestationalAge: "28 weeks",
    gravida: 3,
    para: 2,
    abortion: 0,
    living: 2,
    antenatalVisits: [
    {
      id: "an-1",
      date: "2025-06-20",
      gestationalAge: "28 weeks",
      weight: 68,
      bp: "118/76",
      fetalHeartRate: 142,
      presentation: "Cephalic",
      uterineHeight: "28 cm",
      notes: "All normal, GCT — Normal"
    },
    {
      id: "an-2",
      date: "2025-05-23",
      gestationalAge: "24 weeks",
      weight: 66,
      bp: "120/78",
      fetalHeartRate: 148,
      presentation: "Cephalic",
      uterineHeight: "24 cm"
    }]

  }
};

export const sampleVaccines = [
{
  category: "COVID-19",
  vaccines: [
  {
    id: "vac-1",
    vaccineName: "Covishield",
    dose: "Dose 1",
    dateAdministered: "2021-05-15",
    status: "Completed",
    batchNumber: "4121Z025",
    site: "Left Deltoid"
  },
  {
    id: "vac-2",
    vaccineName: "Covishield",
    dose: "Dose 2",
    dateAdministered: "2021-08-10",
    status: "Completed",
    batchNumber: "4121Z089",
    site: "Left Deltoid"
  },
  {
    id: "vac-3",
    vaccineName: "Covishield",
    dose: "Booster",
    dateAdministered: "2022-04-20",
    status: "Completed",
    batchNumber: "4122Z012",
    site: "Right Deltoid"
  }]

},
{
  category: "Influenza",
  vaccines: [
  {
    id: "vac-4",
    vaccineName: "Influenza (Quadrivalent)",
    dose: "Annual",
    dateAdministered: "2024-10-05",
    status: "Completed",
    site: "Right Deltoid"
  },
  {
    id: "vac-5",
    vaccineName: "Influenza (Quadrivalent)",
    dose: "Annual",
    scheduledDate: "2025-10-01",
    status: "Scheduled"
  }]

},
{
  category: "Hepatitis",
  vaccines: [
  {
    id: "vac-6",
    vaccineName: "Hepatitis B",
    dose: "Dose 1",
    dateAdministered: "2020-01-10",
    status: "Completed"
  },
  {
    id: "vac-7",
    vaccineName: "Hepatitis B",
    dose: "Dose 2",
    dateAdministered: "2020-02-10",
    status: "Completed"
  },
  {
    id: "vac-8",
    vaccineName: "Hepatitis B",
    dose: "Dose 3",
    scheduledDate: "2020-07-10",
    status: "Overdue"
  }]

}];


export const sampleGrowth = [
{
  id: "gr-1",
  date: "2025-06-24",
  age: "34 years",
  weight: 72,
  height: 175,
  bmi: 23.5,
  notes: "BMI in normal range"
},
{
  id: "gr-2",
  date: "2025-03-15",
  age: "34 years",
  weight: 73,
  height: 175,
  bmi: 23.8
},
{
  id: "gr-3",
  date: "2024-12-10",
  age: "33 years",
  weight: 74.5,
  height: 175,
  bmi: 24.3,
  notes: "Slight weight gain noted, dietary advice given"
}];


export const sampleLabReports = [
{
  id: "lab-1",
  date: "2025-06-20",
  labName: "PathCare Diagnostics",
  orderedBy: "Dr. Ananya Sharma",
  category: "Hematology",
  tests: [
  { id: "lt-1", testName: "Hemoglobin", value: "14.2", unit: "g/dL", referenceRange: "13.0–17.0", status: "Normal" },
  { id: "lt-2", testName: "WBC Count", value: "11,200", unit: "/μL", referenceRange: "4,000–11,000", status: "Abnormal", flag: "High" },
  { id: "lt-3", testName: "Platelet Count", value: "2,45,000", unit: "/μL", referenceRange: "1,50,000–4,00,000", status: "Normal" },
  { id: "lt-4", testName: "ESR", value: "28", unit: "mm/hr", referenceRange: "0–20", status: "Abnormal", flag: "High" }]

},
{
  id: "lab-2",
  date: "2025-06-20",
  labName: "PathCare Diagnostics",
  orderedBy: "Dr. Ananya Sharma",
  category: "Biochemistry",
  tests: [
  { id: "lt-5", testName: "Fasting Blood Sugar", value: "118", unit: "mg/dL", referenceRange: "70–100", status: "Abnormal", flag: "High" },
  { id: "lt-6", testName: "HbA1c", value: "6.8", unit: "%", referenceRange: "<5.7", status: "Abnormal", flag: "High" },
  { id: "lt-7", testName: "Creatinine", value: "0.9", unit: "mg/dL", referenceRange: "0.7–1.3", status: "Normal" },
  { id: "lt-8", testName: "SGPT (ALT)", value: "32", unit: "U/L", referenceRange: "7–56", status: "Normal" },
  { id: "lt-9", testName: "SGOT (AST)", value: "28", unit: "U/L", referenceRange: "10–40", status: "Normal" },
  { id: "lt-10", testName: "Total Cholesterol", value: "215", unit: "mg/dL", referenceRange: "<200", status: "Abnormal", flag: "High" }]

},
{
  id: "lab-3",
  date: "2025-03-10",
  labName: "PathCare Diagnostics",
  category: "Thyroid",
  tests: [
  { id: "lt-11", testName: "TSH", value: "3.2", unit: "mIU/L", referenceRange: "0.4–4.0", status: "Normal" },
  { id: "lt-12", testName: "T3", value: "1.1", unit: "ng/mL", referenceRange: "0.8–2.0", status: "Normal" },
  { id: "lt-13", testName: "T4", value: "7.8", unit: "μg/dL", referenceRange: "5.1–14.1", status: "Normal" }]

}];


export const sampleDocuments = [
{
  id: "doc-1",
  title: "Blood Test Report — June 2025",
  type: "Lab Report",
  date: "2025-06-20",
  uploadedBy: "Dr. Ananya Sharma",
  fileUrl: "#",
  fileType: "pdf",
  fileSize: "1.2 MB",
  tags: ["Hematology", "Biochemistry"]
},
{
  id: "doc-2",
  title: "Prescription — OPD Visit",
  type: "Prescription",
  date: "2025-06-24",
  uploadedBy: "Dr. Ananya Sharma",
  fileUrl: "#",
  fileType: "pdf",
  fileSize: "245 KB"
},
{
  id: "doc-3",
  title: "Chest X-Ray",
  type: "Radiology",
  date: "2025-05-10",
  uploadedBy: "Dr. Ananya Sharma",
  fileUrl: "#",
  fileType: "image",
  fileSize: "3.8 MB",
  notes: "PA view — No significant abnormality"
},
{
  id: "doc-4",
  title: "Appendectomy Discharge Summary",
  type: "Discharge Summary",
  date: "2018-11-25",
  uploadedBy: "City General Hospital",
  fileUrl: "#",
  fileType: "pdf",
  fileSize: "580 KB"
}];


export const sampleFollowUps = [
{
  id: "fu-1",
  scheduledDate: "2025-06-29",
  reason: "Review after antibiotics course",
  doctorName: "Dr. Ananya Sharma",
  status: "Scheduled",
  visitType: "OPD",
  notes: "Check throat, review symptoms",
  reminderSent: true
},
{
  id: "fu-2",
  scheduledDate: "2025-07-20",
  reason: "Lab review — HbA1c and Lipid Profile",
  doctorName: "Dr. Ananya Sharma",
  status: "Scheduled",
  visitType: "Lab Review",
  notes: "Fasting sample required",
  reminderSent: false
},
{
  id: "fu-3",
  scheduledDate: "2025-05-17",
  reason: "Follow-up for cough",
  doctorName: "Dr. Ananya Sharma",
  status: "Completed",
  visitType: "OPD"
},
{
  id: "fu-4",
  scheduledDate: "2025-04-01",
  reason: "Dermatology follow-up for rash",
  doctorName: "Dr. Priya Mehta",
  status: "Missed",
  visitType: "Teleconsult"
}];


/** Quick-access chip suggestions for the RxPad search fields */
export const symptomSuggestions = [
"Chest Pain", "Chest Discomfort", "High Blood Pressure", "Vomiting",
"Diarrhea", "Shortness of Breath", "Abdominal Pain", "Frequent Urination",
"Joint Pain", "Muscle Aches", "Fever", "Headache", "Cough",
"Running Nose", "Sore Throat", "Fatigue", "Dizziness", "Nausea",
"Back Pain", "Skin Rash", "Changes in Vision", "Loss of Appetite"];


export const examinationSuggestions = [
"Chest Pain", "Chest Discomfort", "High Blood Pressure", "Vomiting",
"Diarrhea", "Shortness of Breath", "Abdominal Pain", "Frequent Urination",
"Joint Pain", "Muscle Aches", "Throat Congested", "Bilateral Air Entry Equal",
"Soft Non-Tender Abdomen", "Lymphadenopathy", "Edema"];


export const diagnosisSuggestions = [
"Acute Upper Respiratory Infection", "Viral Pharyngitis", "Common Cold",
"Type 2 Diabetes Mellitus", "Essential Hypertension", "Acute Bronchitis",
"Contact Dermatitis", "Urinary Tract Infection", "Gastroenteritis",
"Migraine", "Allergic Rhinitis", "Iron Deficiency Anemia",
// DDX-relevant diagnoses
"Viral Fever", "Dengue Fever", "Conjunctivitis", "COVID-19", "Influenza",
"Tension-type Headache", "Cluster Headache", "Sinusitis",
"Obstructive Sleep Apnea", "Hypothyroidism", "Chronic Fatigue Syndrome",
"Pre-eclampsia", "Gestational Hypertension", "Deep Vein Thrombosis",
"Reactive Airway Disease", "Bronchiolitis", "Early-onset Asthma",
"AUB-Ovulatory Dysfunction", "Uterine Fibroids", "Endometrial Hyperplasia", "Adenomyosis",
"Osteoarthritis", "Meniscal Injury", "Ligament Sprain", "Gout", "Rheumatoid Arthritis"];


export const medicationSuggestions = [
"Paracetamol 650mg Tablet",
"Azithromycin 500mg Tablet",
"Pantoprazole 40mg Tablet",
"Cetirizine 10mg Tablet",
"Ondansetron 4mg Tablet",
"Dolo 650 Tablet",
"Ibuprofen 400mg Tablet",
"Amoxicillin 500mg Capsule",
"Levocetirizine 5mg Tablet",
"Montelukast 10mg Tablet",
"ORS Sachet",
"Vitamin D3 60000 IU Capsule",
"Calcium + Vitamin D Tablet",
"Metformin 500mg Tablet",
"Amlodipine 5mg Tablet"];


export const labInvestigationSuggestions = [
"Complete Blood Count", "Liver Function Test", "Renal Function Test",
"Lipid Profile", "Thyroid Profile", "HbA1c", "Fasting Blood Sugar",
"Urine Routine", "Chest X-Ray", "ECG", "USG Abdomen"];