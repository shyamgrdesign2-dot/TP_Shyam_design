/**
 * Mock patient history shaped exactly like the AI digitization payload.
 *
 * Each visit's `payload` is a `DigitizationPrescription` — the same shape the
 * backend will return. Swap `getMockPatientHistory()` for a real API call and
 * every consumer keeps working.
 */

import {



  emptyPrescription } from
"./schema";

const WRITTEN_RX_PDF =
"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
const WRITTEN_RX_PREVIEW =
"/assets/afc7c9e55f8624dd8cba9c2017f7a975fba9d2d2.png";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function visit(
partial,
meta)
{
  return {
    id: meta.id,
    dateLabel: meta.dateLabel,
    isCurrent: meta.isCurrent,
    // Visit-level prescriber. Surfaced on the Past Visits date header so
    // each visit can show its own doctor + specialty (short tag). Falls
    // back to the first written-Rx attachment when absent.
    doctor: meta.doctor,
    attachments: meta.attachments,
    payload: { ...emptyPrescription(), ...partial }
  };
}

// ─── Visits (newest first) ────────────────────────────────────────────────────

const TODAY = visit(
  {
    patientDetails: {
      name: "Aarav Mehta",
      age: "34",
      gender: "Male",
      bloodGroup: "O+",
      notes: ""
    },
    vitalsAndBodyComposition: {
      temperature: "95",
      pulse: "68",
      respiratoryRate: "18",
      bloodPressure: "120/75",
      systolic: "120",
      diastolic: "75",
      spo2: "98",
      randomBloodSugar: "",
      height: "172",
      weight: "68",
      headCircumference: "",
      waistCircumference: "",
      bmi: "23.0",
      bmr: "1680",
      bsa: "1.82",
      fib4: "",
      generalRBS: ""
    },
    symptoms: [
    { name: "Fever", duration: "2 days", severity: "High", notes: "No measured temperature" },
    { name: "Redness in both eyes", duration: "2 days", severity: "High", notes: "Conjunctival congestion" }],

    examinations: [
    { name: "Lung Infection", notes: "Mild crepitations in bilateral lower zones" }],

    diagnosis: [
    { name: "Viral Fever", since: "2 days", status: "Confirmed", notes: "Moderate" },
    { name: "Conjunctivitis", since: "", status: "Confirmed", notes: "Acute, Bilateral" }],

    medications: [
    {
      name: "Telma20 Tablet",
      frequency: "1-0-0-1",
      dosage: "1 Tablet(s)",
      schedule: "Before Food",
      duration: "4 Days",
      notes: "Stop if no fever",
      quantity: 8
    },
    {
      name: "Metsmail 500 Tablet",
      frequency: "1-0-0-1",
      dosage: "1 Tablet(s)",
      schedule: "After Food",
      duration: "4 Days",
      notes: "Hydration advised",
      quantity: 8
    }],

    advice: [
    { name: "Adequate hydration", notes: "8-10 glasses of water daily" },
    { name: "Eye hygiene", notes: "warm compresses 2x/day" },
    { name: "Steam inhalation", notes: "twice daily for 5 days" },
    { name: "Return if fever persists", notes: "after 48 hours" }],

    labInvestigation: [
    { name: "CBC", instruction: "", notes: "" },
    { name: "LFT", instruction: "", notes: "" }],

    followUp: "2 Weeks",
    // Resolved referral (display labels) — shows in this past visit's Rx.
    referral: {
      specialty: "Cardiology",
      doctor: "Dr. Anil Mehta",
      doctorMeta: "MD, DM (Cardiology) · Apollo Heart Institute",
      date: "10 Feb '26",
      notes: "Evaluate for exertional chest discomfort; ECG + 2D Echo prior to consult.",
    },
    medicalHistory: [
    { name: "Type 2 Diabetes", type: "Medical condition", duration: "2 Year(s)", relation: "", enable: "Y", notes: "" },
    { name: "Hypertension", type: "Medical condition", duration: "5 Year(s)", relation: "", enable: "Y", notes: "" },
    { name: "Dyslipidemia", type: "Medical condition", duration: "1 Year(s)", relation: "", enable: "Y", notes: "" },
    { name: "Dust", type: "Allergies", duration: "3 Year(s)", relation: "", enable: "Y", notes: "" },
    { name: "Ibuprofen", type: "Allergies", duration: "5 Year(s)", relation: "", enable: "Y", notes: "Gastric intolerance" },
    { name: "Diabetes Mellitus", type: "Family History", duration: "", relation: "Father, Paternal Uncle", enable: "Y", notes: "" },
    { name: "Hypertension", type: "Family History", duration: "", relation: "Mother", enable: "Y", notes: "" },
    { name: "Thyroid disorder", type: "Family History", duration: "", relation: "Mother, Maternal Grandmother", enable: "Y", notes: "" },
    { name: "Appendectomy", type: "Surgical History", duration: "", relation: "", enable: "Y", notes: "2018, Uncomplicated, laparoscopic" },
    { name: "Right knee arthroscopy", type: "Surgical History", duration: "", relation: "", enable: "Y", notes: "2022, Meniscus tear repair, full recovery" },
    { name: "Smoking", type: "Lifestyle", duration: "10 Year(s)", relation: "", enable: "Y", notes: "6 cigarettes/day, quit target 3 months" },
    { name: "Alcohol", type: "Lifestyle", duration: "8 Year(s)", relation: "", enable: "Y", notes: "Occasional, social drinking" },
    { name: "Diet", type: "Additional Notes", duration: "", relation: "", enable: "Y", notes: "Mixed diet, Irregular meal timing during work shifts" }],

    labResults: [
    { testname: "Hb", value: "13.8 g/dL", notes: "" },
    { testname: "Creatinine", value: "0.9 mg/dL", notes: "" },
    { testname: "TSH", value: "2.4 mIU/L", notes: "" }],

    others: ["Digital Rx imported from 27 Jan consultation."]
  },
  {
    id: "visit-27-jan",
    dateLabel: "27 Jan'26",
    isCurrent: true,
    doctor: { name: "Dr. Shyam Sundar", specialty: "General Physician" },
    attachments: [
    {
      id: "wrx-27-a",
      title: "Written Rx",
      description: "Scanned OPD sheet (27 Jan'26)",
      pdfUrl: WRITTEN_RX_PDF,
      previewImage: WRITTEN_RX_PREVIEW,
      doctorName: "Dr. Shyam Sundar",
      doctorSpecialty: "General Physician"
    }]

  }
);

const D_26 = visit(
  {
    vitalsAndBodyComposition: {
      ...emptyPrescription().vitalsAndBodyComposition,
      temperature: "99.2",
      pulse: "84",
      respiratoryRate: "20",
      bloodPressure: "124/78",
      systolic: "124",
      diastolic: "78",
      spo2: "97",
      weight: "68.4",
      bmi: "23.1"
    },
    symptoms: [
    { name: "Cough", duration: "3 days", severity: "Productive", notes: "Night worsening" },
    { name: "Mild breathlessness", duration: "Intermittent", severity: "", notes: "Exertional" }],

    examinations: [{ name: "Chest auscultation", notes: "Rhonchi present" }],
    diagnosis: [{ name: "Acute Bronchitis", since: "3 days", status: "Confirmed", notes: "Mild" }],
    medications: [
    {
      name: "Azithromycin 500",
      frequency: "1-0-0",
      dosage: "1 Tablet(s)",
      schedule: "After Food",
      duration: "3 Days",
      notes: "Complete course",
      quantity: 3
    }],

    advice: [
    { name: "Warm fluids", notes: "ginger tea, soups; 4-5x/day" },
    { name: "Adequate rest", notes: "minimum 8 hours sleep" },
    { name: "Avoid cold exposure", notes: "no cold drinks or AC" }],
    labInvestigation: [{ name: "CBC", instruction: "", notes: "" }],
    followUp: "5 Days",
    others: ["Digital Rx imported from 26 Jan consultation."]
  },
  {
    id: "visit-26-jan",
    dateLabel: "26 Jan'26",
    // Long name — exercises the date-header truncation on narrow widths.
    doctor: { name: "Dr. Ananya Krishnamurthy Rao", specialty: "Pediatrician" }
  }
);

const D_24 = visit(
  {
    vitalsAndBodyComposition: {
      ...emptyPrescription().vitalsAndBodyComposition,
      temperature: "98.6",
      pulse: "79",
      respiratoryRate: "18",
      bloodPressure: "118/74",
      systolic: "118",
      diastolic: "74",
      spo2: "99",
      weight: "68.0",
      bmi: "22.9"
    },
    symptoms: [
    { name: "Headache", duration: "1 day", severity: "Frontal", notes: "Intermittent" },
    { name: "Photophobia", duration: "", severity: "Mild", notes: "" }],

    examinations: [{ name: "Neurological exam", notes: "No focal deficits" }],
    diagnosis: [{ name: "Migraine (episodic)", since: "", status: "Confirmed", notes: "Known history" }],
    medications: [
    {
      name: "Naproxen 250",
      frequency: "SOS",
      dosage: "1 Tablet(s)",
      schedule: "After Food",
      duration: "Till Required",
      notes: "Max 2/day",
      quantity: 0
    }],

    advice: [
    { name: "Sleep hygiene", notes: "fixed bedtime, no screens 1hr before sleep" },
    { name: "Hydration", notes: "2-3 L water daily" },
    { name: "Trigger diary", notes: "log onset, food, stress" }],
    labInvestigation: [{ name: "TSH", instruction: "", notes: "" }],
    followUp: "1 Week",
    others: ["Digital Rx imported from 24 Jan consultation."]
  },
  {
    id: "visit-24-jan",
    dateLabel: "24 Jan'26",
    // Very long name — worst-case truncation check.
    doctor: { name: "Dr. Padmanabhan Venkataraghavan", specialty: "Cardiologist" },
    attachments: [
    {
      id: "wrx-24-a",
      title: "Written Rx",
      description: "Legacy handwritten prescription (24 Jan'26)",
      pdfUrl: WRITTEN_RX_PDF,
      previewImage: WRITTEN_RX_PREVIEW,
      doctorName: "Dr. Padmanabhan Venkataraghavan",
      doctorSpecialty: "Cardiologist"
    }]

  }
);

const D_22 = visit(
  {
    vitalsAndBodyComposition: {
      ...emptyPrescription().vitalsAndBodyComposition,
      temperature: "98.4",
      pulse: "76",
      respiratoryRate: "17",
      bloodPressure: "116/72",
      systolic: "116",
      diastolic: "72",
      spo2: "99",
      weight: "67.8",
      bmi: "22.8"
    }
  },
  {
    id: "visit-22-jan",
    dateLabel: "22 Jan'26",
    // Short name — the comfortable case.
    doctor: { name: "Dr. Rohan Mehta", specialty: "Dermatologist" },
    attachments: [
    {
      id: "wrx-22-a",
      title: "Written Rx",
      description: "Only written Rx available for this date",
      pdfUrl: WRITTEN_RX_PDF,
      previewImage: WRITTEN_RX_PREVIEW,
      doctorName: "Dr. Rohan Mehta",
      doctorSpecialty: "Dermatologist"
    }]

  }
);

const D_20 = visit(
  {
    vitalsAndBodyComposition: {
      ...emptyPrescription().vitalsAndBodyComposition,
      temperature: "98.5",
      pulse: "80",
      respiratoryRate: "18",
      bloodPressure: "119/75",
      systolic: "119",
      diastolic: "75",
      spo2: "98",
      weight: "68.2",
      bmi: "23.0"
    }
  },
  {
    id: "visit-20-jan",
    dateLabel: "20 Jan'26",
    doctor: { name: "Dr. Lakshmi Subramaniam Iyer", specialty: "Endocrinologist" },
    attachments: [
    {
      id: "wrx-20-a",
      title: "Written Rx",
      description: "Only written Rx available for this date",
      pdfUrl: WRITTEN_RX_PDF,
      previewImage: WRITTEN_RX_PREVIEW,
      doctorName: "Dr. Lakshmi Subramaniam Iyer",
      doctorSpecialty: "Endocrinologist"
    }]

  }
);

const MOCK_HISTORY = { visits: [TODAY, D_26, D_24, D_22, D_20] };

/**
 * Single source of truth for historical sidebar data.
 * Replace with `fetch('/api/patient/.../history').then(...)` to wire backend.
 */
export function getMockPatientHistory() {
  return MOCK_HISTORY;
}

// First-time / walk-in patients who arrive with no prior records. Every
// historical secondary-sidebar section renders its empty state for these
// patients (the doctor captures everything fresh this visit). `apt-zerodata`
// (Ramesh M) is the canonical new-patient permutation used across the app.
const EMPTY_HISTORY_PATIENT_IDS = new Set(["apt-zerodata"]);

/**
 * True when the patient has no historical data to show — drives the
 * empty-state screens across the secondary sidebar sections.
 */
export function patientHasEmptyHistory(patientId) {
  return EMPTY_HISTORY_PATIENT_IDS.has(patientId);
}