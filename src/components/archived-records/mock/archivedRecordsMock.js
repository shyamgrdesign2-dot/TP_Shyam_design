/**
 * Case File: sample bundle for the UI draft.
 *
 * SOURCE. One patient's hospital folder as a records department hands it
 * over: six PDFs, 275 pages, two emergency visits and the two admissions
 * they led to. The six extractions were merged into this one bundle: the same
 * fact found in several PDFs is one finding with every page it is on.
 *
 * DE-IDENTIFIED AND SCRAMBLED. No name, record number, address, phone,
 * relative, staff name, hospital, ward or unit is in this file. Every date is
 * moved by the same whole number of weeks (weekdays stay true), every lab and
 * vitals number is changed a little (its high or low status is kept), the
 * admission numbers are made up and the age is changed. It cannot be matched
 * to a real person and must not be "corrected" back.
 *
 * GENERATED. Do not edit by hand: it is written by the merge and scramble
 * scripts from the extraction output. Page numbers are global page numbers
 * across the six PDFs (see source.files).
 *
 * "As written" keeps the wording of the page, including the reader's doubts
 * on hard handwriting. That is on purpose: it is what a reviewer has to check.
 *
 * Shape follows sheet "04 Data Output Schema" of the RFP: encounters
 * (ENC), documents (DOC), findings for DX / MED / ALG / LAB / VIT / PROC / RPT,
 * each with a citation (provenance), a confidence (QC) and exceptions (ERR).
 */

export const DOMAINS = [
  { code: "DX", label: "Diagnoses", fhir: "Condition", risk: "critical", historySection: "Medical Condition" },
  { code: "ALG", label: "Allergies", fhir: "AllergyIntolerance", risk: "critical", historySection: "Allergies" },
  { code: "MED", label: "Medications", fhir: "MedicationStatement", risk: "critical", historySection: null },
  { code: "PROC", label: "Procedures", fhir: "Procedure", risk: "high", historySection: "Surgical History" },
  { code: "LAB", label: "Lab results", fhir: "Observation", risk: "critical", historySection: null },
  { code: "VIT", label: "Vitals", fhir: "Observation", risk: "high", historySection: null },
  { code: "RPT", label: "Reports and notes", fhir: "DiagnosticReport", risk: "high", historySection: null },
];

export const DOCUMENT_CATEGORIES = [
  { id: "summaries", label: "Summaries", hint: "Face sheet, discharge summary, referral" },
  { id: "doctorNotes", label: "Doctor notes", hint: "Progress notes, anaesthesia and recovery records" },
  { id: "labs", label: "Lab reports", hint: "Haematology, chemistry, hormones, blood bank" },
  { id: "imaging", label: "Imaging", hint: "X-ray report, ECG, scope and operative images" },
  { id: "medication", label: "Medication charts", hint: "Allergy list, drug chart, reconciliation" },
  { id: "nursingForms", label: "Nursing and forms", hint: "Consents, checklists, education, fluid charts" },
];

// How the patient came in and how the stay ended. Null or absent when the
// file does not say: the summary then says only "Admitted", it never guesses.
//   entry    emergency | referral | fromOpd | transfer | planned | direct
//   outcome  discharged | lama | transferred | died   (an emergency visit: admitted)
// An emergency visit that ended in admission names the admission it led to
// (admissionId); the admission cites that visit (entryEncounterId, entryCite).
const encounters = [
  { facility: "Teaching hospital", id: "E1", type: "IPD", label: "IPD admission", department: "Orthopaedics", speciality: "Orthopaedics", dateLabel: "9 Jul to 16 Jul 2026", shortDate: "09 Jul-16 Jul'26", startLabel: "9 Jul 2026", endLabel: "16 Jul 2026", sortKey: "2026-07-09", ref: "4003392", refCite: { page: 144, rid: "p144-ipno" }, entry: "emergency", outcome: "discharged", clinician: "Professor and Head of Unit, Orthopaedics", pages: 235, entryEncounterId: "E2", entryCite: { page: 5, rid: "p5-disposition" } },
  { facility: "Teaching hospital", id: "E2", type: "ER", label: "Emergency visit", department: "Emergency Medicine", speciality: "Emergency Medicine", dateLabel: "9 Jul 2026", shortDate: "09 Jul'26", startLabel: "9 Jul 2026", sortKey: "2026-07-09", clinician: "Junior Resident, Emergency Medicine; Junior Resident, Orthopaedics", pages: 26, outcome: "admitted", admissionId: "E1" },
  { facility: "Teaching hospital", id: "E3", type: "IPD", label: "IPD admission", department: "General Medicine", speciality: "General Medicine", dateLabel: "16 Jan to 22 Jan 2026", shortDate: "16 Jan-22 Jan'26", startLabel: "16 Jan 2026", endLabel: "22 Jan 2026", sortKey: "2026-01-16", ref: "9032231", refCite: { page: 50, rid: "p50-admit" }, outcome: "discharged", clinician: "Senior Resident, General Medicine", pages: 3, entry: "emergency", entryEncounterId: "E4", entryCite: { page: 22, rid: "p22-transfer" } },
  { facility: "Teaching hospital", id: "E4", type: "ER", label: "Emergency visit", department: "Emergency Medicine", speciality: "Emergency Medicine", dateLabel: "16 Jan 2026", shortDate: "16 Jan'26", startLabel: "16 Jan 2026", sortKey: "2026-01-16", clinician: "Junior Resident, Emergency Medicine; Junior Resident, Medicine", pages: 11, outcome: "admitted", admissionId: "E3" },
];

// The PDFs of the folder, in page order.
const files = [
  { id: "F1", name: "File 1: ICU chart", pages: 4, from: 1, to: 4, what: "ICU patient monitoring chart (Department of Critical Care), two sheets, 11 and 12 Jul 2026: hand-plotted hourly vitals, intake and output, lines and drains" },
  { id: "F2", name: "File 2: Emergency records", pages: 27, from: 5, to: 31, what: "Emergency department records for two visits: 9 Jul 2026 (fall, left hip fracture, admitted under Orthopaedics) and 16 Jan 2026 (cough, admitted under Medicine)" },
  { id: "F3", name: "File 3: Consent form", pages: 1, from: 32, to: 32, what: "Counselling and consent form for HIV testing, signed 10 Jul 2026 during the orthopaedic admission" },
  { id: "F4", name: "File 4: Consultation records", pages: 19, from: 33, to: 51, what: "Inter-department consultation records for the Jul 2026 orthopaedic admission (Medicine, Surgical Oncology, Cardiology, Pulmonology, Ophthalmology), its plan of care and admission order with discharge slip; then the plan of care, admission order with discharge slip and one consultation request from the Jan 2026 medical admission" },
  { id: "F5", name: "File 5: Nursing file", pages: 90, from: 52, to: 141, what: "Nursing file of one orthopaedic admission, 9 to 16 Jul 2026: nurse's record, intake-output, nursing assessments, care plans, handover sheets, insulin chart, observation charts, admission order and plan of care. Almost all handwritten. No discharge summary, doctor's notes or lab reports." },
  { id: "F6", name: "File 6: Inpatient case file", pages: 134, from: 142, to: 275, what: "Inpatient case file, Orthopaedics, 9 to 16 Jul 2026: admission record, consents, typed discharge summary, emergency and orthopaedic case records, consultation records, progress sheets, medication orders, anaesthesia record, operation report and nursing forms (mostly handwritten)" },
];

// Order = page order. A document's position here is its citation number.
// fileId is the PDF of the folder it is in (see source.files).
const documents = [
  { id: "D1", category: "nursingForms", title: "ICU monitoring chart, 11 Jul 2026: intake/output, GCS, lines and drains", encounterId: "E1", fileId: "F1", from: 1, to: 1, script: "handwritten" },
  { id: "D2", category: "nursingForms", title: "ICU monitoring chart, 11 Jul 2026: hourly vitals graph", encounterId: "E1", fileId: "F1", from: 2, to: 2, script: "handwritten" },
  { id: "D3", category: "nursingForms", title: "ICU monitoring chart, 12 Jul 2026: intake/output, GCS, lines and drains", encounterId: "E1", fileId: "F1", from: 3, to: 3, script: "handwritten" },
  { id: "D4", category: "nursingForms", title: "ICU monitoring chart, 12 Jul 2026: hourly vitals graph", encounterId: "E1", fileId: "F1", from: 4, to: 4, script: "handwritten" },
  { id: "D5", category: "nursingForms", title: "ED nursing record: disposition summary, handover and vitals, investigation and consultation tracker", encounterId: "E2", fileId: "F2", from: 5, to: 7, script: "handwritten" },
  { id: "D6", category: "medication", title: "ED drug and IV fluid chart", encounterId: "E2", fileId: "F2", from: 8, to: 8, script: "handwritten" },
  { id: "D7", category: "nursingForms", title: "ED nursing assessment, procedure log and triage form", encounterId: "E2", fileId: "F2", from: 9, to: 10, script: "handwritten" },
  { id: "D8", category: "doctorNotes", title: "Orthopaedics: history and physical examination of an injured person (6 pages, scanned last page first)", encounterId: "E2", fileId: "F2", from: 11, to: 16, script: "handwritten" },
  { id: "D9", category: "doctorNotes", title: "Emergency Medicine trauma case record (4 pages, scanned last page first)", encounterId: "E2", fileId: "F2", from: 17, to: 20, script: "handwritten" },
  { id: "D10", category: "doctorNotes", title: "Out-patient record sheet: Medicine review in the ED", encounterId: "E4", fileId: "F2", from: 21, to: 21, script: "handwritten" },
  { id: "D11", category: "nursingForms", title: "ED nursing record: disposition summary, handover and vitals, investigation and consultation tracker", encounterId: "E4", fileId: "F2", from: 22, to: 24, script: "handwritten" },
  { id: "D12", category: "medication", title: "ED drug and IV fluid chart", encounterId: "E4", fileId: "F2", from: 25, to: 25, script: "handwritten" },
  { id: "D13", category: "nursingForms", title: "ED nursing assessment, procedure log and triage form", encounterId: "E4", fileId: "F2", from: 26, to: 27, script: "handwritten" },
  { id: "D14", category: "doctorNotes", title: "Emergency Medicine non-trauma case record (4 pages, scanned last page first)", encounterId: "E4", fileId: "F2", from: 28, to: 31, script: "handwritten" },
  { id: "D15", category: "nursingForms", title: "Counselling and consent form for HIV testing", encounterId: "E1", fileId: "F3", from: 32, to: 32, script: "mixed" },
  { id: "D16", category: "doctorNotes", title: "Consultation record: Medicine, 9 Jul 2026 (reply continues on the back, scanned first)", encounterId: "E1", fileId: "F4", from: 33, to: 34, script: "handwritten" },
  { id: "D17", category: "doctorNotes", title: "Consultation record: Ophthalmology, 10 Jul 2026 (back scanned first)", encounterId: "E1", fileId: "F4", from: 35, to: 36, script: "handwritten" },
  { id: "D18", category: "doctorNotes", title: "Consultation record: Surgical Oncology, 9 Jul 2026 (back scanned first)", encounterId: "E1", fileId: "F4", from: 37, to: 38, script: "handwritten" },
  { id: "D19", category: "doctorNotes", title: "Consultation record: Cardiology, 9 to 10 Jul 2026 (back scanned first)", encounterId: "E1", fileId: "F4", from: 39, to: 40, script: "handwritten" },
  { id: "D20", category: "nursingForms", title: "Blank page", encounterId: "E1", fileId: "F4", from: 41, to: 41, script: "image" },
  { id: "D21", category: "doctorNotes", title: "Consultation record: Pulmonology reviews, 11 Jul and after the 14 Jul 2026 request", encounterId: "E1", fileId: "F4", from: 42, to: 43, script: "handwritten" },
  { id: "D22", category: "doctorNotes", title: "Consultation record: Pulmonology clearance for surgery", encounterId: "E1", fileId: "F4", from: 44, to: 44, script: "handwritten" },
  { id: "D23", category: "doctorNotes", title: "Consultation record: Pulmonology, 10 Jul 2026 (back scanned first)", encounterId: "E1", fileId: "F4", from: 45, to: 46, script: "handwritten" },
  { id: "D24", category: "doctorNotes", title: "Plan of care, Orthopaedics, 9 Jul 2026", encounterId: "E1", fileId: "F4", from: 47, to: 47, script: "mixed" },
  { id: "D25", category: "nursingForms", title: "Admission order, general consent and discharge slip, Jul 2026", encounterId: "E1", fileId: "F4", from: 48, to: 48, script: "mixed" },
  { id: "D26", category: "doctorNotes", title: "Plan of care, Medicine, 16 Jan 2026", encounterId: "E3", fileId: "F4", from: 49, to: 49, script: "mixed" },
  { id: "D27", category: "nursingForms", title: "Admission order, general consent and discharge slip, Jan 2026", encounterId: "E3", fileId: "F4", from: 50, to: 50, script: "mixed" },
  { id: "D28", category: "doctorNotes", title: "Consultation record: request to Cardiology for 2D echo, 20 Jan", encounterId: "E3", fileId: "F4", from: 51, to: 51, script: "handwritten" },
  { id: "D29", category: "nursingForms", title: "Intake and output charts", encounterId: "E1", fileId: "F5", from: 52, to: 57, script: "handwritten" },
  { id: "D30", category: "nursingForms", title: "Nurse's record (9 to 16 Jul 2026)", encounterId: "E1", fileId: "F5", from: 58, to: 85, script: "handwritten" },
  { id: "D31", category: "nursingForms", title: "Nursing initial assessment", encounterId: "E1", fileId: "F5", from: 86, to: 86, script: "mixed" },
  { id: "D32", category: "medication", title: "Pain, fall and pressure-ulcer risk assessment with medication reconciliation", encounterId: "E1", fileId: "F5", from: 87, to: 87, script: "mixed" },
  { id: "D33", category: "nursingForms", title: "Fall-prevention awareness and nursing care plan", encounterId: "E1", fileId: "F5", from: 88, to: 88, script: "mixed" },
  { id: "D34", category: "nursingForms", title: "Peripheral venous access documentation", encounterId: "E1", fileId: "F5", from: 89, to: 90, script: "mixed" },
  { id: "D35", category: "nursingForms", title: "DVT risk assessment", encounterId: "E1", fileId: "F5", from: 91, to: 91, script: "mixed" },
  { id: "D36", category: "nursingForms", title: "Patient and family education record", encounterId: "E1", fileId: "F5", from: 92, to: 92, script: "mixed" },
  { id: "D37", category: "nursingForms", title: "Discharge check list", encounterId: "E1", fileId: "F5", from: 93, to: 93, script: "mixed" },
  { id: "D38", category: "nursingForms", title: "Nutritional assessment and diet reassessment", encounterId: "E1", fileId: "F5", from: 94, to: 97, script: "mixed" },
  { id: "D39", category: "nursingForms", title: "Daily nursing care plans and checklists", encounterId: "E1", fileId: "F5", from: 98, to: 113, script: "handwritten" },
  { id: "D40", category: "nursingForms", title: "SBAR nursing report handover sheets", encounterId: "E1", fileId: "F5", from: 114, to: 121, script: "handwritten" },
  { id: "D41", category: "medication", title: "Insulin chart (GRBS and insulin doses)", encounterId: "E1", fileId: "F5", from: 122, to: 123, script: "handwritten" },
  { id: "D42", category: "nursingForms", title: "Urinary catheter maintenance and insertion care bundles", encounterId: "E1", fileId: "F5", from: 124, to: 125, script: "mixed" },
  { id: "D43", category: "nursingForms", title: "Daily monitoring for worsening of pressure sore", encounterId: "E1", fileId: "F5", from: 126, to: 127, script: "mixed" },
  { id: "D44", category: "nursingForms", title: "MEWS charts", encounterId: "E1", fileId: "F5", from: 128, to: 131, script: "mixed" },
  { id: "D45", category: "nursingForms", title: "Graphic (T.P.R.) charts", encounterId: "E1", fileId: "F5", from: 132, to: 135, script: "handwritten" },
  { id: "D46", category: "nursingForms", title: "Blood pressure charts", encounterId: "E1", fileId: "F5", from: 136, to: 139, script: "handwritten" },
  { id: "D47", category: "summaries", title: "Admission order, general consent and discharge slip", encounterId: "E1", fileId: "F5", from: 140, to: 140, script: "mixed" },
  { id: "D48", category: "doctorNotes", title: "Plan of care", encounterId: "E1", fileId: "F5", from: 141, to: 141, script: "mixed" },
  { id: "D49", category: "nursingForms", title: "Process check slip", encounterId: "E1", fileId: "F6", from: 142, to: 143, script: "mixed" },
  { id: "D50", category: "summaries", title: "Admission record (face sheet)", encounterId: "E1", fileId: "F6", from: 144, to: 145, script: "mixed" },
  { id: "D51", category: "nursingForms", title: "Checklists of documents during transfer", encounterId: "E1", fileId: "F6", from: 146, to: 149, script: "mixed" },
  { id: "D52", category: "nursingForms", title: "Consent forms (HIV testing, CT contrast, treatment, hemiarthroplasty, high risk surgery)", encounterId: "E1", fileId: "F6", from: 150, to: 159, script: "mixed" },
  { id: "D53", category: "nursingForms", title: "Insurance consent and declaration forms", encounterId: "E1", fileId: "F6", from: 160, to: 163, script: "mixed" },
  { id: "D54", category: "summaries", title: "Discharge summary", encounterId: "E1", fileId: "F6", from: 164, to: 169, script: "typed" },
  { id: "D55", category: "doctorNotes", title: "Emergency medicine trauma case record", encounterId: "E2", fileId: "F6", from: 170, to: 173, script: "handwritten" },
  { id: "D56", category: "doctorNotes", title: "Orthopaedics: history and physical examination of an injured person", encounterId: "E2", fileId: "F6", from: 174, to: 179, script: "handwritten" },
  { id: "D57", category: "doctorNotes", title: "IP assessment form and plan of care", encounterId: "E1", fileId: "F6", from: 180, to: 183, script: "handwritten" },
  { id: "D58", category: "doctorNotes", title: "Consultation record: Cardiology", encounterId: "E1", fileId: "F6", from: 184, to: 185, script: "handwritten" },
  { id: "D59", category: "doctorNotes", title: "Consultation record: Surgical oncology", encounterId: "E1", fileId: "F6", from: 186, to: 187, script: "handwritten" },
  { id: "D60", category: "doctorNotes", title: "Consultation record: General medicine", encounterId: "E1", fileId: "F6", from: 188, to: 189, script: "handwritten" },
  { id: "D61", category: "doctorNotes", title: "Consultation record: Pulmonology", encounterId: "E1", fileId: "F6", from: 190, to: 193, script: "handwritten" },
  { id: "D62", category: "doctorNotes", title: "Consultation record: Ophthalmology", encounterId: "E1", fileId: "F6", from: 194, to: 195, script: "handwritten" },
  { id: "D63", category: "doctorNotes", title: "Consultation record: Pulmonology review", encounterId: "E1", fileId: "F6", from: 196, to: 197, script: "handwritten" },
  { id: "D64", category: "labs", title: "Department of Medicine investigation chart", encounterId: "E1", fileId: "F6", from: 198, to: 199, script: "handwritten" },
  { id: "D65", category: "doctorNotes", title: "Progress sheets (10 to 16 Jul)", encounterId: "E1", fileId: "F6", from: 200, to: 209, script: "handwritten" },
  { id: "D66", category: "nursingForms", title: "Transfer summaries (nurses) and transfer out forms", encounterId: "E1", fileId: "F6", from: 210, to: 215, script: "handwritten" },
  { id: "D67", category: "medication", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", encounterId: "E1", fileId: "F6", from: 216, to: 245, script: "handwritten" },
  { id: "D68", category: "doctorNotes", title: "Physiotherapy record", encounterId: "E1", fileId: "F6", from: 246, to: 249, script: "handwritten" },
  { id: "D69", category: "doctorNotes", title: "Pre-anaesthetic record", encounterId: "E1", fileId: "F6", from: 250, to: 251, script: "handwritten" },
  { id: "D70", category: "nursingForms", title: "Anaesthesia consent forms (including high-risk anaesthesia consent)", encounterId: "E1", fileId: "F6", from: 252, to: 256, script: "mixed" },
  { id: "D71", category: "doctorNotes", title: "Anaesthetic record", encounterId: "E1", fileId: "F6", from: 257, to: 257, script: "handwritten" },
  { id: "D72", category: "labs", title: "Blood gas printout (11 Jul)", encounterId: "E1", fileId: "F6", from: 258, to: 259, script: "typed" },
  { id: "D73", category: "doctorNotes", title: "Anaesthetic record (continued), regional anaesthesia and post-anaesthetic record", encounterId: "E1", fileId: "F6", from: 260, to: 265, script: "handwritten" },
  { id: "D74", category: "nursingForms", title: "Pre-operative check list", encounterId: "E1", fileId: "F6", from: 266, to: 267, script: "mixed" },
  { id: "D75", category: "doctorNotes", title: "Operation report", encounterId: "E1", fileId: "F6", from: 268, to: 269, script: "typed" },
  { id: "D76", category: "nursingForms", title: "Surgical safety checklist", encounterId: "E1", fileId: "F6", from: 270, to: 271, script: "mixed" },
  { id: "D77", category: "nursingForms", title: "Pain assessment score sheets", encounterId: "E1", fileId: "F6", from: 272, to: 275, script: "handwritten" },
];

// Drawn stand-ins for the pages findings cite: a heading, then the cited
// lines as read. Search indexes these.
const pages = {
  1: {
    docId: "D1",
    blocks: [
      { t: "head", title: "ICU monitoring chart, 11 Jul 2026: intake/output, GCS, lines and drains", sub: "File 1: ICU chart · page 1 of 4" },
      { t: "kv", rid: "p1-dx", k: "DIAGNOSIS", v: "(L) NOF #", hand: true },
      { t: "kv", rid: "p1-proc", k: "DIAGNOSIS (second line)", v: "(L) hip Bipolar.", hand: true },
      { t: "kv", rid: "p1-inf-1", k: "INPUT 1", v: "IVF RL", hand: true },
      { t: "kv", rid: "p1-inf-2", k: "INPUT 2", v: "Inj: Advent", hand: true },
      { t: "kv", rid: "p1-inf-3", k: "INPUT 3", v: "Inj Tramadol", hand: true },
      { t: "kv", rid: "p1-inf-4", k: "INPUT 4", v: "Inj Pan", hand: true },
      { t: "kv", rid: "p1-received", k: "Note written along the 16:00 column", v: "Patient rec to OT", hand: true },
      { t: "kv", rid: "p1-totals", k: "Totals", v: "Total intake: 2550 ml. DT - 40ml. Total output: 1440 ml.", hand: true },
      { t: "kv", rid: "p1-devices", k: "DEVICE / Insertion Date", v: "(L) DT 11/7/26 · 20G (R) 11/7/26 · (18) Gauge 11/7/26", hand: true },
      { t: "kv", rid: "p1-gcs", k: "GCS / PUPILS (R/L)", v: "15, 15, 15, then E4V5M6 in each hour · 2mm / 2mm", hand: true },
    ],
  },
  2: {
    docId: "D2",
    blocks: [
      { t: "head", title: "ICU monitoring chart, 11 Jul 2026: hourly vitals graph", sub: "File 1: ICU chart · page 2 of 4" },
      { t: "kv", rid: "p2-vitals-17", k: "Graph, 17:00 column", v: "Temp mark just below 36.4 · systolic mark at about 143 · diastolic mark at about 74 · HR mark at about 76 · RR mark at about 15 · SpO2 98%", hand: true },
    ],
  },
  3: {
    docId: "D3",
    blocks: [
      { t: "head", title: "ICU monitoring chart, 12 Jul 2026: intake/output, GCS, lines and drains", sub: "File 1: ICU chart · page 3 of 4" },
      { t: "kv", rid: "p3-label", k: "Patient label", v: "(name and hospital number removed) F · Orthopaedics · 82 Y · the ward", hand: true },
      { t: "kv", rid: "p3-dx", k: "DIAGNOSIS", v: "(L) NOF #", hand: true },
      { t: "kv", rid: "p3-io", k: "FEED / URINE, 8:00 to 12:00", v: "Feed 100, 50, 50 · running total 100, 150, 200 · Urine 50, 50, 30, 25, 25 · running total 50, 100, 130, 155, 180", hand: true },
      { t: "kv", rid: "p3-devices", k: "DEVICE / Insertion Date", v: "IV cannula 20G · (18) cannula 11/7/26 · Foley's cath 9/7/26 · (R) DT", hand: true },
      { t: "kv", rid: "p3-gcs", k: "GCS / PUPILS (R/L)", v: "15, 15, 15, 15, 15 · 2mm / 2mm", hand: true },
    ],
  },
  4: {
    docId: "D4",
    blocks: [
      { t: "head", title: "ICU monitoring chart, 12 Jul 2026: hourly vitals graph", sub: "File 1: ICU chart · page 4 of 4" },
      { t: "kv", rid: "p4-vitals-12", k: "Graph, 12:00 column", v: "Temp mark at 36.9 · systolic mark at about 123 · diastolic mark just below 63 · HR mark at about 73 · RR mark at about 16 · SpO2 97", hand: true },
    ],
  },
  5: {
    docId: "D5",
    blocks: [
      { t: "head", title: "ED nursing record: disposition summary, handover and vitals, investigation and consultation tracker", sub: "File 2: Emergency records · page 1 of 27" },
      { t: "kv", rid: "p5-disposition", k: "Transfer / Disposition Summary, 9/7/26 6:30PM", v: "Patient is Conscious, oriented. SPO2 99% Maintained in room air. Patient 20 G IV Cannula present in Right hand. Patient report handed over to the ward. Patient medicine reconciliation done. Patient sent to the ward.", hand: true },
      { t: "kv", rid: "p5-ecg", k: "Other Significant events, 9/7/26 2PM", v: "ECG report Attached & Shown to ED PG", hand: true },
      { t: "kv", rid: "p5-urine", k: "Other Significant events, 9/7/26 6:15PM", v: "550ml urine drained.", hand: true },
    ],
  },
  6: {
    docId: "D5",
    blocks: [
      { t: "head", title: "ED nursing record: disposition summary, handover and vitals, investigation and consultation tracker", sub: "File 2: Emergency records · page 2 of 27" },
      { t: "kv", rid: "p6-vitals-1", k: "Vitals Monitoring", v: "2:15PM · RR 19 · SpO2 93 · HR 86 · BP 133/84 · GCS E4 V5 M6 · Temp 98.8 F · Pain 2", hand: true },
      { t: "kv", rid: "p6-vitals-last", k: "Vitals Monitoring", v: "6 [PM] · RR 19 · SpO2 96 · HR 86 · BP · GCS E4 V5 M6 · Temp · Pain 2", hand: true },
      { t: "kv", rid: "p6-disposition", k: "Patient disposition", v: "Admission (ticked). Admission to the ward under department ortho 4. Report handed over at 6:00PM. Patient shifted at 6:30 PM", hand: true },
    ],
  },
  7: {
    docId: "D5",
    blocks: [
      { t: "head", title: "ED nursing record: disposition summary, handover and vitals, investigation and consultation tracker", sub: "File 2: Emergency records · page 3 of 27" },
      { t: "kv", rid: "p7-rad-1", k: "Radiological Investigation 1", v: "ECG · 2PM · Bedside · done", hand: true },
      { t: "kv", rid: "p7-rad-2", k: "Radiological Investigation 2", v: "ortho xray · 2:40PM · 3:05PM · done", hand: true },
      { t: "kv", rid: "p7-rad-3", k: "Radiological Investigation 3", v: "CT Tomogram · 4:55PM · 5:15PM · done", hand: true },
      { t: "kv", rid: "p7-lab", k: "Lab Investigation tracker", v: "CBC, RFT, SE · sent 2PM", hand: true },
      { t: "kv", rid: "p7-consult", k: "Consultation & Assessments", v: "Orthopaedics · informed 1:40PM · seen 2:15PM // Orthopaedics · informed 3:15PM · seen 3:35PM", hand: true },
    ],
  },
  8: {
    docId: "D6",
    blocks: [
      { t: "head", title: "ED drug and IV fluid chart", sub: "File 2: Emergency records · page 4 of 27" },
      { t: "kv", rid: "p8-drug-1", k: "Drugs 1", v: "9/7/26 · 1:40PM · Inj Finamac · 1g · IV", hand: true },
      { t: "kv", rid: "p8-drug-2", k: "Drugs 2", v: "9/7/26 · 4:00PM · Neb Duolin · 1 resp · Inhalation", hand: true },
      { t: "kv", rid: "p8-drug-3", k: "Drugs 3", v: "9/7/26 · 4:15PM · Neb Budecort · 1 resp · Inhalation", hand: true },
      { t: "kv", rid: "p8-drug-4", k: "Drugs 4", v: "9/7/26 · 4:00PM · Inj Hydrocort · 100mg · IV", hand: true },
      { t: "kv", rid: "p8-drug-5", k: "Drugs 5", v: "9/7/26 · 4:25PM · Neb Duolin · 1 resp · Inhalation", hand: true },
      { t: "kv", rid: "p8-drug-6", k: "Drugs 6", v: "9/7/26 · 4:50PM · Neb Budecort · 1 resp · Inhalation", hand: true },
      { t: "kv", rid: "p8-ivf", k: "Infusions, IV fluids 1", v: "IVF RL 500ml · 75 ml/hr · 9/7/26 2:15PM", hand: true },
    ],
  },
  9: {
    docId: "D7",
    blocks: [
      { t: "head", title: "ED nursing assessment, procedure log and triage form", sub: "File 2: Emergency records · page 5 of 27" },
      { t: "kv", rid: "p9-skin", k: "Salient skin condition / wounds / bed sores: Yes", v: "Scar mark present in Buttocks & Blackish discolouration over Right hand.", hand: true },
      { t: "kv", rid: "p9-proc-2", k: "Process/Procedure log 2", v: "9/7/26 · 2:20PM · 4 l/m oxygen started via Nasal prongs", hand: true },
      { t: "kv", rid: "p9-proc-3", k: "Process/Procedure log 3", v: "9/7/26 · 4:35PM · Skin traction Applied to left leg", hand: true },
      { t: "kv", rid: "p9-proc-4", k: "Process/Procedure log 4", v: "9/7/26 · 5:40PM · Bladder Catheterization done c 16 No Folleys under Aseptic technique", hand: true },
    ],
  },
  10: {
    docId: "D7",
    blocks: [
      { t: "head", title: "ED nursing assessment, procedure log and triage form", sub: "File 2: Emergency records · page 6 of 27" },
      { t: "kv", rid: "p10-complaint", k: "Chief Complaint / Duration", v: "c/o Left leg pain & left hip pain. H/o slip and fall from steps · 9/7/26 @ around 11:00 am (place removed)", hand: true },
      { t: "kv", rid: "p10-vitals", k: "Vital Signs", v: "RR: 19/min SpO2: 91% Pulse: 86/min BP: 133/92 mm/hg Temp 98.8 F · Glasgow Coma Scale: 15/15 · Pain 4 (moderate) · Site of pain: left hip", hand: true },
      { t: "kv", rid: "p10-grbs", k: "GRBS", v: "250 mg/dl", hand: true },
      { t: "kv", rid: "p10-triage", k: "Triage", v: "Date 9/7/26 · Time of Entry 1:15 Pm · Stretcher · Brought by Relative · Criticality 2. Moderate · Triage: Yellow · End Triage Time 1:18 Pm", hand: true },
    ],
  },
  12: {
    docId: "D8",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person (6 pages, scanned last page first)", sub: "File 2: Emergency records · page 8 of 27" },
      { t: "kv", rid: "p12-other-injury", k: "I. ANY OTHER SIGNIFICANT INJURY", v: "Nil other significant injuries", hand: true },
      { t: "kv", rid: "p12-impression", k: "IMPRESSION", v: "Closed left femur neck fracture", hand: true },
      { t: "kv", rid: "p12-mlc", k: "MLC", v: "DONE (ticked)", hand: true },
      { t: "kv", rid: "p12-xrays-asked", k: "Investigations asked for: X-rays", v: "Chest, pelvis, left femur - AP, lateral", hand: true },
      { t: "kv", rid: "p12-xray-findings", k: "Radiological findings", v: "left femur neck fracture", hand: true },
      { t: "kv", rid: "p12-plan", k: "Treatment planned", v: "Admission - Preops - Skin traction", hand: true },
    ],
  },
  13: {
    docId: "D8",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person (6 pages, scanned last page first)", sub: "File 2: Emergency records · page 9 of 27" },
      { t: "kv", rid: "p13-spine", k: "Examination of the spine, pelvis, abdomen, face, skull", v: "No deformity. No tenderness. Bladder: Not palpable. Nil motor sensory deficits. Pelvis: ecchymosis absent, tenderness absent, compression test negative. Abdomen: rigidity, tenderness, mass absent. Face: Nil injuries. Skull: Nil injuries", hand: true },
    ],
  },
  14: {
    docId: "D8",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person (6 pages, scanned last page first)", sub: "File 2: Emergency records · page 10 of 27" },
      { t: "kv", rid: "p14-lower-limb", k: "B. EXAMINATION OF THE LOWER EXTREMITY", v: "Left lower limb shortened and externally rotated - No external injuries - No swelling - Tenderness present over left hip - ROM left hip and knee couldn't be assessed due to pain - ROM Right hip, knee, both ankles - within normal limits - Active toe movements present bilaterally - Distal pulses palpable. Distal sensations intact", hand: true },
    ],
  },
  15: {
    docId: "D8",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person (6 pages, scanned last page first)", sub: "File 2: Emergency records · page 11 of 27" },
      { t: "kv", rid: "p15-general", k: "GENERAL EXAMINATION", v: "Consciousness: conscious, oriented. Pupillary reaction: Bilaterally reactive. Pulse 86 /min. BP 133/92 mm of Hg. Temp 38.2 °C. Respiration 19 /min.", hand: true },
      { t: "kv", rid: "p15-upper-limb", k: "A. EXAMINATION OF THE UPPER EXTREMITY", v: "Nil significant injuries. Radial intact, Ulnar intact, Median intact. Radial Pulse palpable", hand: true },
    ],
  },
  16: {
    docId: "D8",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person (6 pages, scanned last page first)", sub: "File 2: Emergency records · page 12 of 27" },
      { t: "kv", rid: "p16-age-sex", k: "Age / Sex", v: "Age: 82 · Sex: F", hand: true },
      { t: "kv", rid: "p16-complaint", k: "Chief Complaints / Mechanism of Injury", v: "pain over left hip. Alleged history of slip and fall from stairs at (place removed) (Home). Time and Date of Injury: 11am 09/07/2026", hand: true },
      { t: "kv", rid: "p16-history", k: "History of present injury", v: "H/o loss of consciousness: Absent. H/o bleeding from ENT: Absent. Bladder function after the injury: Hasn't passed urine. Preliminary treatment already given: No. Referred by: self. Immunisation status: Not known", hand: true },
      { t: "kv", rid: "p16-past", k: "History of any significant past history", v: "T2DM, HTN, SCC Right gluteal skin s/p WLE (2016), Acute bronchitis", hand: true },
    ],
  },
  18: {
    docId: "D9",
    blocks: [
      { t: "head", title: "Emergency Medicine trauma case record (4 pages, scanned last page first)", sub: "File 2: Emergency records · page 14 of 27" },
      { t: "kv", rid: "p18-survey", k: "Secondary Survey & Injuries noted", v: "Head, Neck & ENT: no external injuries noted. Thorax: no external injuries noted. Abdomen & Pelvis: Non-tender, no external injury noted. Log roll/Spine: Non-tender. Extremities: No external injuries noted. Neurovascular: Peripheral pulsations +nt, peripheral sensations intact. Plan: Symp Mx, Admission", hand: true },
      { t: "kv", rid: "p18-prov-dx", k: "Provisional Diagnosis", v: "? IT # (L). ? NOF #", hand: true },
    ],
  },
  19: {
    docId: "D9",
    blocks: [
      { t: "head", title: "Emergency Medicine trauma case record (4 pages, scanned last page first)", sub: "File 2: Emergency records · page 15 of 27" },
      { t: "kv", rid: "p19-efast", k: "E-FAST /RUSH Protocol", v: "(-) (-) (-) (-) c B/L lung (+)", hand: true },
      { t: "kv", rid: "p19-pmh-dm", k: "Past Medical History", v: "DM x 18 yrs - On meds", hand: true },
      { t: "kv", rid: "p19-pmh-htn", k: "Past Medical History", v: "HTN x 18 yrs - On meds", hand: true },
      { t: "kv", rid: "p19-mechanism", k: "Mechanism of Injury, Signs & Symptoms", v: "Pat. was walking down the stairs at the home near the kitchen premises & had history of slip & fall & was in sitting down position & c/o of pain of (L) hip region & ↓ movement of (L) lower limb. LOC (-) Headache (-) ENT Bleed (-) Vomiting (-)", hand: true },
      { t: "kv", rid: "p19-inv", k: "Investigations", v: "VBG, CBC, RFT, SE, ECG, X-Ray", hand: true },
      { t: "kv", rid: "p19-rx-1", k: "Treatment orders", v: "(1) Inj. FINAMAC 1g IV", hand: true },
      { t: "kv", rid: "p19-rx-ivf", k: "Treatment orders", v: "(2) IVF RL @ 75 ml/hr", hand: true },
      { t: "kv", rid: "p19-rx-neb", k: "Treatment orders", v: "Neb Duolin 1 resp inhalation / Neb Budecort 1 resp } 2 cycle", hand: true },
      { t: "kv", rid: "p19-rx-hydrocort", k: "Treatment orders", v: "Inj. Hydrocort 100 mg IV stat", hand: true },
      { t: "kv", rid: "p19-rx-o2", k: "Treatment orders", v: "Oxygen mask 4 l via nasal prongs", hand: true },
    ],
  },
  20: {
    docId: "D9",
    blocks: [
      { t: "head", title: "Emergency Medicine trauma case record (4 pages, scanned last page first)", sub: "File 2: Emergency records · page 16 of 27" },
      { t: "kv", rid: "p20-mechanism", k: "Concise Mechanism of Injury", v: "A/h/o slip & fall from stairs · Date of Incident 9/7/26 · Time of Incident 11 am", hand: true },
      { t: "kv", rid: "p20-triage", k: "Triage / MLC", v: "Date 9/7/26 · Time 1:45 pm · Triage: P3 (circled) · MLC / non-MLC: non-MLC marked", hand: true },
      { t: "kv", rid: "p20-breathing", k: "Breathing with Ventilation", v: "Breathing pattern: Normal (ticked). RR: 19/min SpO2: 91% @fiO2: 21%. Air entry: B/L Equal / (+)", hand: true },
      { t: "kv", rid: "p20-circulation", k: "Circulation / Disability", v: "HR: 86 bpm Rhythm: regular BP: 133/92 mmHg · GCS: E4 V5 M6 15/15 · Pupils normal, reacting · Focal neurologic deficits: Difficulty in (L) lower limb movement", hand: true },
      { t: "kv", rid: "p20-grbs", k: "GRBS", v: "250 mg/dl", hand: true },
    ],
  },
  21: {
    docId: "D10",
    blocks: [
      { t: "head", title: "Out-patient record sheet: Medicine review in the ED", sub: "File 2: Emergency records · page 17 of 27" },
      { t: "kv", rid: "p21-history", k: "16/01/26 · History", v: "h/o cough -> 3 days, nonproductive, no blood, wheeze +, no SOB / PND. h/o fever 1 ep - no chills, no night sweats. h/o gen. fatigue, ↓ appetite. no FND / alt sens. no B/B complaints. no travel hist. no similar illness", hand: true },
      { t: "kv", rid: "p21-kco", k: "Known case of", v: "k/c/o T2DM, HTN. no h/o RAD / IHD", hand: true },
      { t: "kv", rid: "p21-scc", k: "Past history, 2016", v: "h/o - SCC (R) upper gluteal skin s/p WLE", hand: true },
      { t: "kv", rid: "p21-oe", k: "O/E", v: "HR - 81 bpm. BP - 153/92. SpO2 - 99 RA. afeb. JVP (-). CVS - muffled. RS - (L) ISA, IAA crepts (+). P/A - CNS - NAD", hand: true },
      { t: "kv", rid: "p21-lab-k", k: "labs", v: "K 3.6", hand: true },
      { t: "kv", rid: "p21-lab-na", k: "labs", v: "Na 140", hand: true },
      { t: "kv", rid: "p21-lab-cr", k: "labs", v: "Cr 0.48", hand: true },
      { t: "kv", rid: "p21-lab-urea", k: "labs", v: "urea 21", hand: true },
      { t: "kv", rid: "p21-lab-hb", k: "labs", v: "Hb 12.5", hand: true },
      { t: "kv", rid: "p21-lab-tc", k: "labs", v: "TC 8.1", hand: true },
      { t: "kv", rid: "p21-lab-plt", k: "labs", v: "Plt 174", hand: true },
      { t: "kv", rid: "p21-cxr", k: "Investigations column", v: "CXR - (L) haziness", hand: true },
      { t: "kv", rid: "p21-ecg", k: "Investigations column", v: "ECG - NSR", hand: true },
      { t: "kv", rid: "p21-echo", k: "Investigations column", v: "2D ECHO", hand: true },
    ],
  },
  22: {
    docId: "D11",
    blocks: [
      { t: "head", title: "ED nursing record: disposition summary, handover and vitals, investigation and consultation tracker", sub: "File 2: Emergency records · page 18 of 27" },
      { t: "kv", rid: "p22-transfer", k: "Transfer / Disposition Summary, 16-01-2026 @ 9:35 PM", v: "Patient is conscious and oriented. Vital signs Temperature - 98.8 F Pulse - 92 bpm BP - 153/74 mmHg SPO2 - 99%. Patient seen by ED PG and medicine PG. Advised for admission. Patient and party willing for admission. medicine reconciliation done. 20G Venflow secured on (R) hand. Blackish discolouration present on (L) leg and bilateral upper limbs. shifted to the ward.", hand: true },
      { t: "kv", rid: "p22-ecg", k: "Other Significant events, 16/1/26 @ 5:10pm", v: "ECG Done. Seen by the ED doctor and attached to op file.", hand: true },
    ],
  },
  23: {
    docId: "D11",
    blocks: [
      { t: "head", title: "ED nursing record: disposition summary, handover and vitals, investigation and consultation tracker", sub: "File 2: Emergency records · page 19 of 27" },
      { t: "kv", rid: "p23-vitals-9pm", k: "Vitals Monitoring", v: "9 PM · RR 19 · SpO2 99% · HR 93 · BP 153/74 · GCS E4 V5 M6 · Temp 98.8 F", hand: true },
      { t: "kv", rid: "p23-disposition", k: "Patient disposition", v: "Admission (ticked) at 9:35 PM. Admission to the ward under department Medicine. Patient shifted at 9:35 PM. Non MLC (ticked)", hand: true },
    ],
  },
  24: {
    docId: "D11",
    blocks: [
      { t: "head", title: "ED nursing record: disposition summary, handover and vitals, investigation and consultation tracker", sub: "File 2: Emergency records · page 20 of 27" },
      { t: "kv", rid: "p24-rad-1", k: "Radiological Investigation 1", v: "ECG · 5:10pm · Bedside · Done", hand: true },
      { t: "kv", rid: "p24-rad-2", k: "Radiological Investigation 2", v: "C. Xray · 5:55pm · 6 pm · Done", hand: true },
      { t: "kv", rid: "p24-consult", k: "Consultation & Assessments", v: "Medicine · informed 6:20pm · seen at 6:50pm", hand: true },
    ],
  },
  25: {
    docId: "D12",
    blocks: [
      { t: "head", title: "ED drug and IV fluid chart", sub: "File 2: Emergency records · page 21 of 27" },
      { t: "kv", rid: "p25-ivf", k: "Infusions, IV fluids 1", v: "IVF RL 500 ML · @ 75 ml/hr · 16/1/26 6pm (Drugs table above is empty)", hand: true },
    ],
  },
  26: {
    docId: "D13",
    blocks: [
      { t: "head", title: "ED nursing assessment, procedure log and triage form", sub: "File 2: Emergency records · page 22 of 27" },
      { t: "kv", rid: "p26-skin", k: "Salient skin condition / wounds / bed sores", v: "Blackish discolouration bilateral upper and (L) lower limb.", hand: true },
    ],
  },
  27: {
    docId: "D13",
    blocks: [
      { t: "head", title: "ED nursing assessment, procedure log and triage form", sub: "File 2: Emergency records · page 23 of 27" },
      { t: "kv", rid: "p27-complaint", k: "Chief Complaint / Duration", v: "Cough and generalized weakness · Since from 3 days", hand: true },
      { t: "kv", rid: "p27-vitals", k: "Vital Signs", v: "RR: 19/min SpO2: 95 Pulse: 87/min BP: 153/92 mm/hg Temp: 98.8 F · Glasgow Coma Scale: 15/15", hand: true },
      { t: "kv", rid: "p27-grbs", k: "GRBS", v: "226 mg/dl", hand: true },
    ],
  },
  29: {
    docId: "D14",
    blocks: [
      { t: "head", title: "Emergency Medicine non-trauma case record (4 pages, scanned last page first)", sub: "File 2: Emergency records · page 25 of 27" },
      { t: "kv", rid: "p29-orders", k: "Treatment orders / Consultation", v: "1) IVF 1 pint RL @ 75 ml/hr · Consultation: Medicine", hand: true },
    ],
  },
  30: {
    docId: "D14",
    blocks: [
      { t: "head", title: "Emergency Medicine non-trauma case record (4 pages, scanned last page first)", sub: "File 2: Emergency records · page 26 of 27" },
      { t: "kv", rid: "p30-exam", k: "Head to toe / Focussed systemic examination", v: "Pallor (+) icterus (-) clubbing (-) pedal oedema (+). CVS: S1 S2 (+). RS: B/L crepitations (+). P/A: soft, non tender, BS (+). CNS: no FND", hand: true },
      { t: "kv", rid: "p30-prov-dx", k: "Provisional Diagnosis", v: "LRTI", hand: true },
      { t: "kv", rid: "p30-plan", k: "Plan / Investigations asked", v: "Symptomatic management -> R/w with reports · Investigations asked: CBC, RFT, SE, ABG, ECG, CXR", hand: true },
    ],
  },
  31: {
    docId: "D14",
    blocks: [
      { t: "head", title: "Emergency Medicine non-trauma case record (4 pages, scanned last page first)", sub: "File 2: Emergency records · page 27 of 27" },
      { t: "kv", rid: "p31-triage", k: "Triage / MLC", v: "Date 16/01/26 · Time 5:00 pm · Triage: P3 (circled) · non-MLC (circled) · Presenting complaint: Cough", hand: true },
      { t: "kv", rid: "p31-breathing", k: "Initial assessment", v: "Airway: Patent. RR: 24/min SpO2: 95% @fiO2: RA. Air entry: B/L equal. Work of breathing: Increased (circled). HR: 87/min BP: 153/92 mmHg. GCS: E4 V5 M6. Pupils: PEARL. Focal neurologic deficits: nil. Temperature: Afebrile", hand: true },
      { t: "kv", rid: "p31-grbs", k: "GRBS", v: "226 mg/dl", hand: true },
      { t: "kv", rid: "p31-comorbid", k: "Co morbid Illness", v: "DM, HTN", hand: true },
      { t: "kv", rid: "p31-past", k: "Relevant past history", v: "H/o Squamous cell carcinoma of skin (R) upper gluteal region (2016)", hand: true },
      { t: "kv", rid: "p31-history", k: "Focussed History", v: "Patient presented with h/o cough with mucoid expectoration since the last 3 days a/w shortness of breath (mMRC grade 2). H/o low grade fever without chills since the last 3 days. No h/o sweating / chest pain / vomiting / abdominal pain. No h/o orthopnoea / PND", hand: true },
    ],
  },
  32: {
    docId: "D15",
    blocks: [
      { t: "head", title: "Counselling and consent form for HIV testing", sub: "File 3: Consent form · page 1 of 1" },
      { t: "kv", rid: "p32-label", k: "Patient label", v: "(name and hospital number removed) F · Orthopaedics · 82 Y · the ward", hand: false },
      { t: "kv", rid: "p32-date", k: "Date / Time", v: "10/7/26 · 6 am", hand: false },
      { t: "kv", rid: "p32-test", k: "Tests consented to", v: "HIV 1 & 2 Antibodies Test (circled by hand)", hand: false },
    ],
  },
  33: {
    docId: "D16",
    blocks: [
      { t: "head", title: "Consultation record: Medicine, 9 Jul 2026 (reply continues on the back, scanned first)", sub: "File 4: Consultation records · page 1 of 19" },
      { t: "kv", rid: "p33-admitted-for", k: "Medicine reply (continued)", v: "Currently admitted for (L) Femur neck #, s/p slip & fall, planned for Bipolar Hemiarthroplasty", hand: true },
      { t: "kv", rid: "p33-vitals", k: "Medicine reply: examination", v: "BP: 143/84 PR: 92 bpm SpO2: 94% on 4 L O2 via NP. CVS: S1+ S2+. RS: B/L NVBS. PA: soft. CNS: HMF intact", hand: true },
      { t: "kv", rid: "p33-rx-1", k: "On Rx", v: "T- Rozavel 5 0-0-1", hand: true },
      { t: "kv", rid: "p33-rx-2", k: "On Rx", v: "T- Stamlo 5 1-0-0", hand: true },
      { t: "kv", rid: "p33-rx-3", k: "On Rx", v: "T- Glimy M1 1-0-1", hand: true },
      { t: "kv", rid: "p33-rx-4", k: "On Rx", v: "T- Telma 40 1-0-1", hand: true },
      { t: "kv", rid: "p33-hb", k: "Labs column", v: "Hb = 12.0", hand: true },
      { t: "kv", rid: "p33-plt", k: "Labs column", v: "Plt = 1.57 L", hand: true },
      { t: "kv", rid: "p33-tlc", k: "Labs column", v: "TLC = 12.8K", hand: true },
      { t: "kv", rid: "p33-n", k: "Labs column", v: "N = 91.2 L = M =", hand: true },
      { t: "kv", rid: "p33-rbs", k: "Biochem", v: "RBS = 170", hand: true },
      { t: "kv", rid: "p33-trop", k: "Biochem", v: "Trop T = 0.008", hand: true },
      { t: "kv", rid: "p33-crp", k: "Biochem", v: "CRP = 4.91", hand: true },
      { t: "kv", rid: "p33-creat", k: "Biochem", v: "RFT (N) · Urea = 13 · Creat = 0.59", hand: true },
      { t: "kv", rid: "p33-a1c", k: "Biochem", v: "A1c awaited", hand: true },
      { t: "kv", rid: "p33-echo", k: "Right column", v: "ECG: noted. Echo: EF = 65% overall good BVSF no RWMA", hand: true },
      { t: "kv", rid: "p33-cxr", k: "Right column", v: "CXR: (L) sided homogenous opacification of lung field. Cardio & Costo Phrenic angles not blunted. CT yet to be reported", hand: true },
      { t: "kv", rid: "p33-advice", k: "Discussed with Medicine staff: advice", v: "1. Cardiac clearance 2. Pulmonology clearance 3. Pt. can be posted for surgery if BP < 140/90 and GRBS pre op < 1[8]0 mg/dl after being cleared for surgery by Pulmonology & Cardiology. 4. W/H OHAs on day of surgery & give IVF DNS c 8 U neutralising dose of Actrapid", hand: true },
    ],
  },
  34: {
    docId: "D16",
    blocks: [
      { t: "head", title: "Consultation record: Medicine, 9 Jul 2026 (reply continues on the back, scanned first)", sub: "File 4: Consultation records · page 2 of 19" },
      { t: "kv", rid: "p34-label", k: "Patient label", v: "(name and hospital number removed) F · Orthopaedics · 82 Y · the ward", hand: true },
      { t: "kv", rid: "p34-request", k: "Consultation request, 09/07/26 4 pm, Orthopaedics to Medicine", v: "Kindly evaluate this patient for glycemic control & BP control, admitted for (L) femur neck fracture & give advice regarding management & surgical clearance. k/c/o T2DM / HTN / SCC (R) gluteal skin s/p wide excision (2016)", hand: true },
      { t: "kv", rid: "p34-reply-dx", k: "Reply, 9/7/26 9 PM, seen by Medicine JR", v: "Thanks for the referral. Pt is a case of T2DM, HTN, Acute bronchitis (in Jan 2026) & ? MASLD, (R) gluteal skin SCC s/p Sx 2016.", hand: true },
    ],
  },
  35: {
    docId: "D17",
    blocks: [
      { t: "head", title: "Consultation record: Ophthalmology, 10 Jul 2026 (back scanned first)", sub: "File 4: Consultation records · page 3 of 19" },
      { t: "kv", rid: "p35-exam", k: "Eye examination (diagram)", v: "Lid (N) · congestion (+) · K appears clear · AC appears normal depth · pupil 3mm RR (no RAPD) · lens SIMC · Discharge (+)(+) @ fornix (BE) (Greenish)", hand: true },
      { t: "kv", rid: "p35-imp", k: "Imp", v: "Acute Bacterial conjunctivitis", hand: true },
      { t: "kv", rid: "p35-adv", k: "Adv", v: "G MOSI / G EYEMIST } (BE) x 2 weeks", hand: true },
      { t: "kv", rid: "p35-followup", k: "Review", v: "R/w in eye OPD (1) once stable & shiftable. (mon, wed, fri) · signed 10/7/26 7:00pm", hand: true },
    ],
  },
  36: {
    docId: "D17",
    blocks: [
      { t: "head", title: "Consultation record: Ophthalmology, 10 Jul 2026 (back scanned first)", sub: "File 4: Consultation records · page 4 of 19" },
      { t: "kv", rid: "p36-request", k: "Consultation request, 10/7/26 6:30 pm, Orthopaedics to Eye on duty", v: "Kindly evaluate pt k/c/o eye discharge. Pt posted tomorrow", hand: true },
      { t: "kv", rid: "p36-findings", k: "Reply (Ophthalmology)", v: "Thanks for the consult, pt seen bedside, history noted: c/o itchy (BE), c/o discharge (BE) x 2 days. O/E: VA (LE) Visual acuity unaided: CF @ 3m / CF @ 3m. EOM full painless (pt finds difficult to follow commands)", hand: true },
      { t: "kv", rid: "p36-dx", k: "Diagnosis box", v: "T2DM (+) HTN (+)", hand: true },
    ],
  },
  37: {
    docId: "D18",
    blocks: [
      { t: "head", title: "Consultation record: Surgical Oncology, 9 Jul 2026 (back scanned first)", sub: "File 4: Consultation records · page 5 of 19" },
      { t: "kv", rid: "p37-scc", k: "Surgical Oncology reply (continued)", v: "Old case of SCC over natal cleft -> S/P WLE + 1° closure done in 2016. Last follow up - Jan 2023. Biopsy -> WD SCC -> margin free. L/E: Scar healthy. No signs of any LRR.", hand: true },
      { t: "kv", rid: "p37-advice", k: "Advice (after discussion with a senior)", v: "Orthopaedics to proceed c planned procedure.", hand: true },
    ],
  },
  38: {
    docId: "D18",
    blocks: [
      { t: "head", title: "Consultation record: Surgical Oncology, 9 Jul 2026 (back scanned first)", sub: "File 4: Consultation records · page 6 of 19" },
      { t: "kv", rid: "p38-request", k: "Consultation request, 09/07/26 4 pm, Orthopaedics to Surgical Oncology", v: "Kindly evaluate this patient operated by Surgical Oncology for (R) upper gluteal skin SCC s/p wide excision & give surgical clearance. Admitted for (L) femur neck fracture & posted for surgery.", hand: true },
      { t: "kv", rid: "p38-reply", k: "Reply, 9/7/26 7:45pm, seen by Surgical Oncology", v: "Many thanks for the reference. Referred i/v/o clearance for surgery. Case of left NOF # secondary to fall from stairs", hand: true },
    ],
  },
  39: {
    docId: "D19",
    blocks: [
      { t: "head", title: "Consultation record: Cardiology, 9 to 10 Jul 2026 (back scanned first)", sub: "File 4: Consultation records · page 7 of 19" },
      { t: "kv", rid: "p39-echo", k: "Cardiology reply, 10/7/26", v: "Case details noted. ECHO - (N) study, 65% EF. ECG - NSR", hand: true },
      { t: "kv", rid: "p39-planned", k: "Cardiology reply, 10/7/26", v: "Planned for (L) Bipolar hemiarthroplasty", hand: true },
      { t: "kv", rid: "p39-advice", k: "Adv.", v: "pt. can be taken up for planned Sx [↓] added cardiac risk.", hand: true },
    ],
  },
  40: {
    docId: "D19",
    blocks: [
      { t: "head", title: "Consultation record: Cardiology, 9 to 10 Jul 2026 (back scanned first)", sub: "File 4: Consultation records · page 8 of 19" },
      { t: "kv", rid: "p40-request", k: "Consultation request, 09/07/26 4 pm, Orthopaedics to Cardiology", v: "Kindly evaluate this patient admitted for (L) femur neck fracture and posted for bipolar hemiarthroplasty, give surgical clearance. k/c/o T2DM / HTN / SCC (R) gluteal skin s/p wide excision (2016). Adv: ECG (ticked), ECHO (ticked)", hand: true },
    ],
  },
  42: {
    docId: "D21",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology reviews, 11 Jul and after the 14 Jul 2026 request", sub: "File 4: Consultation records · page 10 of 19" },
      { t: "kv", rid: "p42-baseline", k: "Findings (Pulmonology)", v: "Baseline SpO2 (Jan 26) = 99% RA. Baseline SpO2 @ presentation 91% RA (ED sheet)", hand: true },
      { t: "kv", rid: "p42-rx", k: "Treatment list", v: "+ Augmentin 1.2 Q12h (D4) + Tramadol + Pan, Stamlo 5, Rozavel 5 OD + Clexane 0.4 ml S/C OD. Duolin Q8 + Budecort Q12h. Glimy M1 1-0-1", hand: true },
      { t: "kv", rid: "p42-rx-augmentin", k: "Treatment list", v: "+ Augmentin 1.2 Q12h (D4)", hand: true },
      { t: "kv", rid: "p42-rx-tramadol", k: "Treatment list", v: "+ Tramadol", hand: true },
      { t: "kv", rid: "p42-rx-clexane", k: "Treatment list", v: "+ Clexane 0.4 ml S/C OD", hand: true },
      { t: "kv", rid: "p42-hb", k: "Labs (left margin)", v: "Hb = 10.4 (underlined)", hand: true },
      { t: "kv", rid: "p42-fbs", k: "Labs (left margin)", v: "= (40), circled", hand: true },
      { t: "kv", rid: "p42-k", k: "Labs (left margin)", v: "K+ = (3.6), circled", hand: true },
      { t: "kv", rid: "p42-na", k: "Labs (left margin)", v: "Na = 138", hand: true },
      { t: "kv", rid: "p42-oe", k: "O/E", v: "SOB. Patient PR 108 b/m. SpO2: 91% RA. BP: 172/84 mmHg. RR: 22 cpm. R-S: Bilateral creps (+)", hand: true },
      { t: "kv", rid: "p42-imp", k: "Impression", v: "? Volume overload / Basal atelectasis", hand: true },
      { t: "kv", rid: "p42-advice", k: "Advice (after discussion with a senior)", v: "(1) NT-Pro BNP (2) Strict I/O charting (4) Maintain I = O (5) Continue O2 @ 1 L/min (SpO2 >= 90%) (6) Incentive Spirometry", hand: true },
    ],
  },
  43: {
    docId: "D21",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology reviews, 11 Jul and after the 14 Jul 2026 request", sub: "File 4: Consultation records · page 11 of 19" },
      { t: "kv", rid: "p43-request", k: "Request, 11/07/26 5:45pm", v: "Respected staff, Kindly review the patient and give advice regarding management.", hand: true },
      { t: "kv", rid: "p43-ctpa", k: "CTPA", v: "(R) & (L) PA prominent, but no e/o acute PTE. B/L (R>L) dependent basal atelectasis", hand: true },
      { t: "kv", rid: "p43-vitals", k: "Vitals", v: "BP = 146/73 mmHg PR = 77 bpm RR = 15 cpm SpO2 = 99% c 6 L O2 via face mask", hand: true },
      { t: "kv", rid: "p43-advice", k: "Seen by Pulmonology JR, discussed with SR · signed 11/7/26", v: "1-> CTPA (-) 2- Continue nebulized bronchodilators (NEB DUOLIN Q8H, NEB BUDECORT Q12H) and oxygen supplementation (to maintain O2 sat > 90%) 3. Chest Physiotherapy 4. Incentive Spirometry", hand: true },
      { t: "kv", rid: "p43-request-10nov", k: "Request, 14/7/26", v: "Respected staff, Kindly review the pt i/v/o O2 saturation drop", hand: true },
    ],
  },
  44: {
    docId: "D22",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology clearance for surgery", sub: "File 4: Consultation records · page 12 of 19" },
      { t: "kv", rid: "p44-findings", k: "Pulmonology: Case reviewed", v: "CTPA (ticked) · D-dimer = 2.3 · ABG (ticked)", hand: true },
      { t: "kv", rid: "p44-vitals", k: "Vitals", v: "BP = 133/84 mmHg PR = 80 bpm RR = 23 bpm SpO2 = 97% c 4L, 85% c RA. R/S: B/L NVBS", hand: true },
      { t: "kv", rid: "p44-advice", k: "Advice (after discussion with a senior) · signed 11/7/26 as read", v: "Patient can be taken up for Surgery under high risk if Surgery cannot be postponed.", hand: true },
    ],
  },
  45: {
    docId: "D23",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology, 10 Jul 2026 (back scanned first)", sub: "File 4: Consultation records · page 13 of 19" },
      { t: "kv", rid: "p45-hb", k: "CBC (left column)", v: "Hb = 12.0", hand: true },
      { t: "kv", rid: "p45-esr", k: "CBC (left column)", v: "ESR = (30), circled", hand: true },
      { t: "kv", rid: "p45-tlc", k: "CBC (left column)", v: "TLC = (12.8), circled", hand: true },
      { t: "kv", rid: "p45-n", k: "CBC (left column)", v: "N = (93.0%), circled · AEC = 0", hand: true },
      { t: "kv", rid: "p45-plt", k: "CBC (left column)", v: "PLT = 157K", hand: true },
      { t: "kv", rid: "p45-a1c", k: "Left column", v: "A1c 6.1%", hand: true },
      { t: "kv", rid: "p45-trop", k: "Left column", v: "Trop (-)", hand: true },
      { t: "kv", rid: "p45-rft", k: "Left column", v: "Coag (N) · RFT (N) · LFT (N)", hand: true },
      { t: "kv", rid: "p45-oe", k: "O/E", v: "Patient PR: 97 b/m. SpO2: 94% on 2 L O2. RR: 19 cpm. BP: 143/84 mmHg. R-S: B/L NVBS", hand: true },
      { t: "kv", rid: "p45-cxr", k: "CXR", v: "Rotated film. Cannot comment", hand: true },
      { t: "kv", rid: "p45-advice-1", k: "Adv (after discussion with a senior), 10/7/26", v: "Case details noted. (1) D-dimer, Room air ABG. Shall r/w reports.", hand: true },
      { t: "kv", rid: "p45-abg", k: "ABG", v: "pH -> 7.47 · PCO2 -> 35 · PO2 -> 40 · SO2 -> 78", hand: true },
      { t: "kv", rid: "p45-ddimer", k: "Seen by Pulmonology JR: Reports noted", v: "D-dimer -> (2.3), circled", hand: true },
      { t: "kv", rid: "p45-advise-ctpa", k: "Advise (after discussion with a senior), 10/7/26", v: "To do CT pulmonary angiography -> to r/o ? PTE. R/w c reports for clearance.", hand: true },
    ],
  },
  46: {
    docId: "D23",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology, 10 Jul 2026 (back scanned first)", sub: "File 4: Consultation records · page 14 of 19" },
      { t: "kv", rid: "p46-request", k: "Consultation request, 10/7/26 12 AM, Orthopaedics to Pulmonology", v: "Kindly evaluate pt and give Sx clearance as advised by Medicine.", hand: true },
      { t: "kv", rid: "p46-reply", k: "Reply, seen by Pulmonology JR", v: "Patient is a c/o (L) NOF # planned for (L) Bipolar hemiarthroplasty. - SCC (R) upper gluteal region (WLE). - Patient has Nil Active Respiratory Complaints. - H/o Acute Bronchitis Jan '26. PTO", hand: true },
      { t: "kv", rid: "p46-rx", k: "On Rx (right margin)", v: "(1) Clexane 0.4 (2) Stamlo 5 (3) Glimy M-M1 BD (4) Rozavel 5 OD · ECHO (N)", hand: true },
      { t: "kv", rid: "p46-margin", k: "Left and right margin", v: "TB/COVID · Family (-) · Addiction (-) · (+) · Walks 1.5 · Occupation", hand: true },
    ],
  },
  47: {
    docId: "D24",
    blocks: [
      { t: "head", title: "Plan of care, Orthopaedics, 9 Jul 2026", sub: "File 4: Consultation records · page 15 of 19" },
      { t: "kv", rid: "p47-plan", k: "PLAN OF CARE", v: "(L) Bipolar hemiarthroplasty", hand: true },
      { t: "kv", rid: "p47-prov-dx", k: "Provisional Diagnosis", v: "(L) Femur neck fracture", hand: false },
      { t: "kv", rid: "p47-care", k: "Plan of care boxes", v: "Built: moderate · Nourishment: moderate · Signs of deficiency: absent · Purpose: Diagnostic / Curative · Medications: as per the Doctors' Order chart · Diet: Diabetic Diet, Hypertensive Diet · Physiotherapy · Senior citizens (>65 yrs) · signed 09/07/26 4pm and 10/7/2026", hand: true },
    ],
  },
  48: {
    docId: "D25",
    blocks: [
      { t: "head", title: "Admission order, general consent and discharge slip, Jul 2026", sub: "File 4: Consultation records · page 16 of 19" },
      { t: "kv", rid: "p48-admit", k: "ADMISSION ORDER", v: "I.P. No. (the number used as this encounter's ref) · Dept/Unit Orthopaedics · Date 09/07/26 Time 4pm · Bed Category General", hand: true },
      { t: "kv", rid: "p48-discharge", k: "DISCHARGE SLIP", v: "Date of Discharge 16/7/26 · Time of Discharge: After billing · Any Blood Transfusion? No · Any X-Ray / investigation on the discharge day? No · Any dressings? No · Remarks: Discharge", hand: false },
    ],
  },
  49: {
    docId: "D26",
    blocks: [
      { t: "head", title: "Plan of care, Medicine, 16 Jan 2026", sub: "File 4: Consultation records · page 17 of 19" },
      { t: "kv", rid: "p49-prov-dx", k: "Provisional Diagnosis", v: "(L) LL pneumonia", hand: true },
      { t: "kv", rid: "p49-care", k: "PLAN OF CARE: Medical", v: "Purpose: Curative (circled) · Diagnostic Investigation: CXR, ECG · Medications: as per the Doctors' Order chart · signed 16/1/26 and 17/1/26 10 am", hand: true },
    ],
  },
  50: {
    docId: "D27",
    blocks: [
      { t: "head", title: "Admission order, general consent and discharge slip, Jan 2026", sub: "File 4: Consultation records · page 18 of 19" },
      { t: "kv", rid: "p50-admit", k: "ADMISSION ORDER", v: "I.P. No. (the number used as this encounter's ref) · Dept/Unit Medicine · Date 16/1/26 · Expected Length of Stay 7 days", hand: true },
      { t: "kv", rid: "p50-discharge", k: "DISCHARGE SLIP", v: "Date of Discharge 22/1/26 · Any Blood Transfusion? No · Any X-Ray / investigation on the discharge day? No · Any dressings? No · Remarks: Discharge", hand: true },
    ],
  },
  51: {
    docId: "D28",
    blocks: [
      { t: "head", title: "Consultation record: request to Cardiology for 2D echo, 20 Jan", sub: "File 4: Consultation records · page 19 of 19" },
      { t: "kv", rid: "p51-request", k: "Consultation request, 20/1 9 am, Medicine to Cardiology", v: "Respected staff, kindly do 2D ECHO", hand: true },
    ],
  },
  54: {
    docId: "D29",
    blocks: [
      { t: "head", title: "Intake and output charts", sub: "File 5: Nursing file · page 3 of 90" },
      { t: "kv", rid: "p54-iv", k: "14/7/26, I.V. - S.C. Infusion, 12 am", v: "Total IV 100 ml", hand: true },
    ],
  },
  55: {
    docId: "D29",
    blocks: [
      { t: "head", title: "Intake and output charts", sub: "File 5: Nursing file · page 4 of 90" },
      { t: "kv", rid: "p55-tramadol", k: "15/7/2026, I.V. - S.C. Infusion, 1 pm", v: "Inj. Tramadol 50mg added in 100ml NS is on flow", hand: true },
    ],
  },
  58: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 7 of 90" },
      { t: "kv", rid: "p58-admit", k: "09/07/2026 Thursday, 7pm", v: "patient got admitted the ward by trolly with IP and OP file. patient general condition is good. vitals are checked", hand: true },
      { t: "kv", rid: "p58-vitals", k: "7pm vitals", v: "T: 98.8°F BP: 143/84mmHg PR: 92bpm RR: 24 b/m SpO2: 96% c 4 liter nasal prongs", hand: true },
      { t: "kv", rid: "p58-dx", k: "7pm", v: "patient diagnosis is left femur neck fracture. patient having foleys catheter. patient having skin traction over the left leg. patient having IV cannula. patient on oxygen with nasal prongs of 4 ltr. patient back skin intact. bowel and bladder pattern normal", hand: true },
      { t: "kv", rid: "p58-bloods", k: "7:10pm", v: "Blood sent for Glyco Hb, RBS, TSH, Trop T, Uric acid, CRP, RFT, Electrolytes (Sod, Pot, Chlo), LFT, PT INR, APTT, CBC, ESR", hand: true },
    ],
  },
  59: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 8 of 90" },
      { t: "kv", rid: "p59-consults", k: "9/7/26 continued and 10/7/2026", v: "7:10pm Bedside echo informed. 8:15pm Medicine consultation put. 12:10am phone call received from ortho duty PG, advised to send serology morning and to put Pulmonology consultation. 1:15am Pulmonology consultation online done", hand: true },
    ],
  },
  60: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 9 of 90" },
      { t: "kv", rid: "p60-serology", k: "10/7/2026, 5:10am", v: "Blood sent to lab for HIV, HBsAg and Anti-HCV", hand: true },
      { t: "kv", rid: "p60-skin", k: "6am", v: "Sponge bath given. Back care given. Back skin intact. dry skin with fragile skin present. Blackish discolouration present in right hand. catheter care given", hand: true },
      { t: "kv", rid: "p60-rounds", k: "9:15am", v: "Rounds done, advised to continue same treatment and posted tomorrow", hand: true },
    ],
  },
  61: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 10 of 90" },
      { t: "kv", rid: "p61-ptcd", k: "10/07/26, 5pm", v: "Pulmonology consultation taken by Pulmonology PG", hand: true },
      { t: "kv", rid: "p61-xmatch", k: "6:45pm and 7pm", v: "Blood grouping and 2 U PRBC cross matching sent to blood bank. 2nd grouping blood sent to blood bank", hand: true },
    ],
  },
  62: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 11 of 90" },
      { t: "kv", rid: "p62-ct", k: "Page headed 10/7/26 - continue; 8:45 Am", v: "Patient received to Main CT for CT Pulmonary Angiogram with IP and OP file by trolley. patient is on 4 liter oxygen support. SpO2 97% Resp 19 bpm. 9:05 patient CT Pulmonary Angio done. patient shift back to ward", hand: true },
    ],
  },
  63: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 12 of 90" },
      { t: "kv", rid: "p63-review", k: "11/7/26 continued, 9:50am to 10:20am", v: "CT scan done, call given to ortho IV duty PG, advised to Pulmonology review. Pulmonology review seen, consultation sheet taken", hand: true },
      { t: "kv", rid: "p63-neb", k: "11:30am and 11:40am", v: "Neb Duolin given. Neb Budecort given", hand: true },
    ],
  },
  64: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 13 of 90" },
      { t: "kv", rid: "p64-pac", k: "10/07/2026, 9:15pm", v: "PAC chart viewed, inform duty PG, advised to follow orders", hand: true },
      { t: "kv", rid: "p64-preop-meds", k: "10pm and 10:30pm", v: "Tab. Pan 40mg - 1 orally given as per anaesthesia order. Neb. Duolin given as per anaesthesia order. Neb Budecort given as per anaesthesia order", hand: true },
      { t: "kv", rid: "p64-abg", k: "10:30pm", v: "Blood sent for ABG, D Dimer and ABG sent", hand: true },
      { t: "kv", rid: "p64-eye", k: "10:30pm", v: "Eye consultation done, inform ortho duty PG, they advised to tomorrow see, not urgent (first word read with some doubt)", hand: true },
      { t: "kv", rid: "p64-fasting", k: "11/07/2026, 5:10am", v: "Blood sent for fasting glucose", hand: true },
    ],
  },
  65: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 14 of 90" },
      { t: "kv", rid: "p65-grbs", k: "11/07/2026, 5:45am", v: "GRBS 78mg/dl inform duty PG", hand: true },
      { t: "kv", rid: "p65-npo", k: "6am to 7:50am", v: "Tab. Pan 40mg - 1 orally given as per anaesthesia order. IVF DNS 500ml at 50ml/hr is connected. Patient is on NPO. General condition good. Vitals stable", hand: true },
      { t: "kv", rid: "p65-ctpa", k: "7:55am and 8:30am", v: "Unit PG advised to send patient to CT Room. Patient shifted to main CT Room for CTPA with IP & OP file", hand: true },
    ],
  },
  66: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 15 of 90" },
      { t: "kv", rid: "p66-abx", k: "11/7/26 continued, transfer summary", v: "Patient is on NPO. Foleys catheter present. Back skin intact. Inj Vancomycin 1gm - 2, Inj Ticocin 400mg - 1, Inj Advent 1.2gm - 1 sent to OT", hand: true },
      { t: "kv", rid: "p66-preop-vitals", k: "12:10pm", v: "Patient received with IP OP file by trolley. while receiving vitals are BP: 146/80mmHg P: 84 b/m R: 16 b/m SpO2: 99% on 4L O2 via NP", hand: true },
    ],
  },
  67: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 16 of 90" },
      { t: "kv", rid: "p67-blister", k: "11/7/26 continued", v: "Back skin: Blister present over back. 5cm blister present near lower back", hand: true },
      { t: "kv", rid: "p67-ot", k: "1:10pm and 1:15pm", v: "patient shifted to OT. Patient received to OT with blue sheet, computer sheet, doctor's order, admission order, consent form checklist. Inj Advent 1.2g - 1, Inj Ticocin 400mg - 1, Inj Vankomycin 1g - 2", hand: true },
      { t: "kv", rid: "p67-surgery", k: "4:30pm", v: "Patient underwent Left Bipolar Hemiarthroplasty under Spinal Anaesthesia. IV line patent in right hand. Romovac 10F DT present in left hip. Patient shifted to HDU with blue sheet, computer sheet, doctor's order & Inj Vanc 1g - 1", hand: true },
    ],
  },
  68: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 17 of 90" },
      { t: "kv", rid: "p68-hdu", k: "11/7/26, 5pm", v: "patient received to HDU. patient General condition conscious & oriented. Vitals Temp: 98.8F pulse: 82 b/mt Resp: 24 br/mt BP: 143/74mmHg SpO2: 99% in 2 liter oxygen", hand: true },
      { t: "kv", rid: "p68-skin", k: "5pm", v: "(L) Leg Dressing with DT present. Right side of buttock skin peel present 1x1 cm, Right side scapula Region Redness with blister present", hand: true },
    ],
  },
  69: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 18 of 90" },
      { t: "kv", rid: "p69-neb", k: "11/07/26 continue, 8:30pm and 8:40pm", v: "advised to start Neb. Duolin 8hrly and Budecort 12 hrly. Neb. Duolin 1 resp given as per Pulmonology order. Neb. Budecort 1 resp given as per Pulmonology order", hand: true },
      { t: "kv", rid: "p69-eye", k: "8:40pm to 9pm", v: "Eyemist eyedrops not available in pharmacy, advised to give Just tear eye drops. Just tear eye drop 1 drop administered to bilateral eye", hand: true },
      { t: "kv", rid: "p69-npo", k: "9pm and 9:30pm", v: "NPO broken, sips of water given. patient not having any vomiting sensation, liquid diet started", hand: true },
    ],
  },
  71: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 20 of 90" },
      { t: "kv", rid: "p71-cbc", k: "12/07/26, 5am", v: "Blood sample sent for CBC", hand: true },
      { t: "kv", rid: "p71-grbs", k: "6:30am and 6:40am", v: "GRBS - 276 mg/dl informed, advised to inform endocrine. call given to Medicine regarding GRBS 276mg/dl advised to give Inj. H. Actrapid 6 unit s/c", hand: true },
    ],
  },
  72: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 21 of 90" },
      { t: "kv", rid: "p72-actrapid", k: "12/07/26, 8am", v: "Inj HUMAN ACTRAPID 6 units given over right hand subcutaneously as per order. Inj site no redness, no bleed", hand: true },
      { t: "kv", rid: "p72-vitals", k: "8am", v: "SpO2: 96% Temp 98.8F Pulse: 75 b/m Resp 19 b/m BP: 123/63 mmHg", hand: true },
      { t: "kv", rid: "p72-withheld", k: "8:35am and 9am", v: "T. GLIMY M1 not given, Medicine PG advised to withhold today & give Inj Actrapid today. T. Stamlo not given, informed, BP 112/63 mmHg", hand: true },
    ],
  },
  73: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 22 of 90" },
      { t: "kv", rid: "p73-clexane", k: "12/7/26, 11am", v: "Inj CLEXANE 0.4ml given over right thigh S/C. Inj site no redness, no bleed. vitals stable", hand: true },
      { t: "kv", rid: "p73-shift", k: "11:15am and 12pm", v: "Rounds done, advised to shift out. Transfer summary: Patient shifted to the ward with IP & OP file by trolley. Patient on 1L of O2 through nasal prongs", hand: true },
    ],
  },
  74: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 23 of 90" },
      { t: "kv", rid: "p74-xray", k: "12/7/26, transfer summary continued", v: "Left leg dressing with (1) Romovac DT present. Foleys catheter present. X-ray of hip pelvis + left leg done. Medicine reconciliation done", hand: true },
    ],
  },
  75: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 24 of 90" },
      { t: "kv", rid: "p75-ward", k: "12/7/26, 12:30pm", v: "Patient received from HDU. Patient general condition is good. Vital signs: Temp: 98.8F pulse: 72 b/m RR 19 b/m BP: 123/74 mmHg SpO2: 97% on 1L O2 via nasal prongs. Foleys catheter & 1 DT present. Blister present over the right buttock", hand: true },
      { t: "kv", rid: "p75-grbs", k: "1pm", v: "Patient GRBS is 254mg/dl. Informed to Medicine PG, advised to give 6 units of Human Actrapid subcutaneously. Air bed applied on orders", hand: true },
    ],
  },
  76: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 25 of 90" },
      { t: "kv", rid: "p76-grbs", k: "12/7/26, 8:5pm", v: "Patient GRBS 245mg/dl. Informed to Medicine duty PG. Advised to give Inj Human Actrapid 6 units subcutaneously", hand: true },
      { t: "kv", rid: "p76-drain", k: "13/07/2026, 5:40am", v: "DT: 6ml", hand: true },
      { t: "kv", rid: "p76-o2stop", k: "8:30am and 8:45am", v: "advised to clamp catheter and to stop O2. O2 stopped", hand: true },
    ],
  },
  77: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 26 of 90" },
      { t: "kv", rid: "p77-day", k: "13/7/2026, 8:50am to 12:30pm", v: "urinary catheter clamped. Rounds done. dressing change, DT removed. informed to physiotherapy. physiotherapy done, SpO2 - 97%. clamp released", hand: true },
    ],
  },
  78: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 27 of 90" },
      { t: "kv", rid: "p78-desat", k: "13/7/26 continued, 4:20pm and 4:30pm", v: "Patient SpO2: 88% with Room air. Informed to Dr, Advised to restart oxygen at 1 liter. O2 with 1 liter with nasal prongs started. Catheter clamped", hand: true },
    ],
  },
  79: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 28 of 90" },
      { t: "kv", rid: "p79-catheter", k: "14/7/2026 Tuesday, 6am", v: "Patient is not having sensation while clamping foleys catheter. Informed to Dr. Advised not to remove catheter until further order", hand: true },
      { t: "kv", rid: "p79-eye", k: "7am", v: "G. moxi B/E instilled 1 drops in each eyes", hand: true },
      { t: "kv", rid: "p79-insulin-skip", k: "7:50am", v: "call given to med V PG about GRBS (99 mg/dl) advised skip the dose of insulin", hand: true },
      { t: "kv", rid: "p79-dulcolax", k: "9:40am", v: "Rounds done, advised Tab. Dulcolax suppository stat and continue same treatment", hand: true },
    ],
  },
  80: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 29 of 90" },
      { t: "kv", rid: "p80-refused", k: "14/7/26, 12 noon", v: "Patient refused dulcolax suppository, she wanted it in the evening, informed to duty PG", hand: true },
    ],
  },
  81: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 30 of 90" },
      { t: "kv", rid: "p81-immobilizer", k: "14/7/26 continued, 5:30pm", v: "Rounds done by ortho 4. Advised to knee immobilizer", hand: true },
      { t: "kv", rid: "p81-catheter", k: "8:35pm and 9:30pm", v: "advised to remove urinary catheter and send NT pro BNP blood investigation. urinary catheter sensation present, and catheter removed", hand: true },
    ],
  },
  82: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 31 of 90" },
      { t: "kv", rid: "p82-bnp", k: "14/7/2026, 10:15pm", v: "Blood sent for NT-pro BNP", hand: true },
    ],
  },
  83: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 32 of 90" },
      { t: "kv", rid: "p83-coloplast", k: "15/7/2026, 12pm and 5pm", v: "Back care given and coloplast patch applied in bedsore. Redness present over scapula region, over the skin peel area coloplast applied", hand: true },
      { t: "kv", rid: "p83-grbs", k: "12:30pm", v: "GRBS 161 mg/dl inform Medicine duty PG, they advised to Inj Human Actrapid (4) units s/c give", hand: true },
    ],
  },
  84: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 33 of 90" },
      { t: "kv", rid: "p84-discharge", k: "16/7/2026 Thursday, 8am and 9am", v: "patient had food. patient general condition is good. vitals are stable. Rounds done, advised to continue same treatment and advised discharge", hand: true },
    ],
  },
  85: {
    docId: "D30",
    blocks: [
      { t: "head", title: "Nurse's record (9 to 16 Jul 2026)", sub: "File 5: Nursing file · page 34 of 90" },
      { t: "kv", rid: "p85-education", k: "16/7/26 continued", v: "Health education given about diet, medication and personal hygiene", hand: true },
    ],
  },
  86: {
    docId: "D31",
    blocks: [
      { t: "head", title: "Nursing initial assessment", sub: "File 5: Nursing file · page 35 of 90" },
      { t: "kv", rid: "p86-complaint", k: "Chief complaints", v: "left femur neck fracture. DOA: 09/07/26. Time of arrival: 7pm. Informant: Patient. Mode of arrival: Stretcher. Arrived with: Oxygen, IV line", hand: false },
      { t: "kv", rid: "p86-allergy", k: "Known Drug Allergies", v: "No [x] Yes [ ] if yes Specify", hand: true },
      { t: "kv", rid: "p86-habits", k: "Habits", v: "Smoking Yes [ ] No [x]. Alcohol Yes [ ] No [x]", hand: true },
      { t: "kv", rid: "p86-vitals", k: "Vitals", v: "Temp: 98.8 F Pulse: 81 b/mt Resp: 24 b/mt BP: Height / Weight: not able to assess", hand: false },
      { t: "kv", rid: "p86-catheter", k: "GU", v: "Urinary Catheter: Yes [x]. Date Inserted 09/07/26", hand: true },
    ],
  },
  87: {
    docId: "D32",
    blocks: [
      { t: "head", title: "Pain, fall and pressure-ulcer risk assessment with medication reconciliation", sub: "File 5: Nursing file · page 36 of 90" },
      { t: "kv", rid: "p87-pain", k: "Pain", v: "Yes [x]. rating: 0-2. Location: left leg", hand: false },
      { t: "kv", rid: "p87-scores", k: "Risk assessment", v: "FALL RISK ASSESSMENT Score: 02. Pressure ulcer risk assessment score: 17", hand: true },
      { t: "kv", rid: "p87-med-1", k: "Medication Reconciliation, current medication 1", v: "T. Stamlo 5 mg 1-0-0 9/7/26 at 8am", hand: true },
      { t: "kv", rid: "p87-med-2", k: "Current medication 2", v: "T. Rozavel 5 mg 0-0-1 8/7/26 at 8pm", hand: true },
      { t: "kv", rid: "p87-med-3", k: "Current medication 3", v: "T. Evion 0-1-0 8/7/26 at 2pm", hand: true },
      { t: "kv", rid: "p87-med-4", k: "Current medication 4", v: "T. Glimy M1 500 mg 1-0-1 9/7/26 at 8am", hand: true },
    ],
  },
  89: {
    docId: "D34",
    blocks: [
      { t: "head", title: "Peripheral venous access documentation", sub: "File 5: Nursing file · page 38 of 90" },
      { t: "kv", rid: "p89-cannula", k: "Cannula insertion and removal record", v: "09/07/26 1:35pm (R) hand 20G, inserted in the emergency area, removed 11/7/26 2pm, reason leaking. 11/7/26 (L) hand 18G, inserted by OT, removed 14/7/26 11am, reason leaking. 14/7/26 11am (R) hand 20G, removed 16/7/26, reason Discharge", hand: true },
    ],
  },
  91: {
    docId: "D35",
    blocks: [
      { t: "head", title: "DVT risk assessment", sub: "File 5: Nursing file · page 40 of 90" },
      { t: "kv", rid: "p91-dvt", k: "DVT risk assessment", v: "TOTAL SCORE: 9. LOW RISK (<10%) SCORE 7-10 [x]. DATE: 09/07/26", hand: true },
    ],
  },
  92: {
    docId: "D36",
    blocks: [
      { t: "head", title: "Patient and family education record", sub: "File 5: Nursing file · page 41 of 90" },
      { t: "kv", rid: "p92-education", k: "16/7/26, Discharge education on", v: "Diet/medications, Follow up, Home care: given and received", hand: false },
    ],
  },
  93: {
    docId: "D37",
    blocks: [
      { t: "head", title: "Discharge check list", sub: "File 5: Nursing file · page 42 of 90" },
      { t: "kv", rid: "p93-checklist", k: "Discharge check list", v: "1 Written order for discharge: Yes. 11 Received discharge summary: Yes. 14 All invasive lines and catheter removed: Yes. Date & time: 16/7/26", hand: false },
    ],
  },
  94: {
    docId: "D38",
    blocks: [
      { t: "head", title: "Nutritional assessment and diet reassessment", sub: "File 5: Nursing file · page 43 of 90" },
      { t: "kv", rid: "p94-dx", k: "Diagnosis", v: "(L) femur neck #. SCC (R) gluteal skin s/p wide excision. Plan (L) Bipolar hemiarthroplasty", hand: true },
      { t: "kv", rid: "p94-history", k: "Previous History", v: "T2DM HTN", hand: false },
      { t: "kv", rid: "p94-food-allergy", k: "Food Allergy/Intolerance", v: "[x] None [ ] Yes (Specify)", hand: true },
      { t: "kv", rid: "p94-nutrition", k: "Screening", v: "NRS/PNRS Score - 02. Nutritional Status - At Nutritional Risk. Calorie (Kcal): 1600 Approx/day. Protein (g): 60g Approx/day. Therapeutic Diet: Diabetic low salt soft diet", hand: true },
    ],
  },
  95: {
    docId: "D38",
    blocks: [
      { t: "head", title: "Nutritional assessment and diet reassessment", sub: "File 5: Nursing file · page 44 of 90" },
      { t: "kv", rid: "p95-diet", k: "Reassessment", v: "11/7 NPO. 12/7 oral liquid -> Diabetic low salt soft diet. 13/7 and 14/7 Diabetic low salt soft diet. 15/7 Diabetic low salt soft diet, NRS score 02, Not at nutritional risk", hand: true },
    ],
  },
  114: {
    docId: "D40",
    blocks: [
      { t: "head", title: "SBAR nursing report handover sheets", sub: "File 5: Nursing file · page 63 of 90" },
      { t: "kv", rid: "p114-allergy", k: "09/07/2026, B - Background", v: "left femur neck fracture. no any history of allergy / no any past history of allergies", hand: true },
      { t: "kv", rid: "p114-vitals", k: "09/07/2026, A - Assessment, Evening", v: "T: 98.8°F BP: 143/92mmHg PR: 92bpm SpO2: 96% with 4 liter nasal prongs. patient having IV cannula. patient having Foleys catheter", hand: true },
    ],
  },
  116: {
    docId: "D40",
    blocks: [
      { t: "head", title: "SBAR nursing report handover sheets", sub: "File 5: Nursing file · page 65 of 90" },
      { t: "kv", rid: "p116-surgery", k: "11/7/2026 Evening, B - Background", v: "Dx: (L) NOF fracture. Left Bipolar Arthroplasty done. no history of allergy", hand: true },
    ],
  },
  117: {
    docId: "D40",
    blocks: [
      { t: "head", title: "SBAR nursing report handover sheets", sub: "File 5: Nursing file · page 66 of 90" },
      { t: "kv", rid: "p117-dx", k: "11/07/26 Night, B - Background", v: "Diagnosis: (L) neck of femur fracture. s/p (L) bipolar hemiarthroplasty. No any allergic history", hand: true },
    ],
  },
  121: {
    docId: "D40",
    blocks: [
      { t: "head", title: "SBAR nursing report handover sheets", sub: "File 5: Nursing file · page 70 of 90" },
      { t: "kv", rid: "p121-vitals", k: "15/7/2026 Evening, A - Assessment", v: "Temp 98.8F Pulse: 89bpm Resp 19bpm BP: 133/84mmHg SpO2 99% GCS 15. IV line over (R) hand. left leg dressing with knee immobilizer present", hand: true },
    ],
  },
  122: {
    docId: "D41",
    blocks: [
      { t: "head", title: "Insulin chart (GRBS and insulin doses)", sub: "File 5: Nursing file · page 71 of 90" },
      { t: "kv", rid: "p122-grbs", k: "Insulin chart, GRBS in mgs", v: "9/7/26 10:15pm 146. 10/7/26 7am 90, 10am 116, 3:30pm 122, 10:30pm 134. 11/7/2026 6am 80, 8am 103, 6pm 115. 12/7/26 6am 276, 10:30am 284, 1pm 254, 3pm 285, evening 245. 13/7/26 6am 227, 1pm 139, 4pm 121, 7pm 114, 10pm 125. 14/7/26 6am 99, 10am 159, 1:30pm 192, 4:15pm 140, 6:45pm 165, 10pm 134. 15/7/26 7am 139", hand: true },
      { t: "kv", rid: "p122-insulin", k: "Insulin chart, insulin infusion/bolus", v: "12/7/26 6am Inj. H. Actrapid 6 unit; 1pm Inj H-Actrapid 6 unit; evening Inj H Actrapid 6 unit. 13/7/26 6am Inj H-Actrapid (4) units; 1pm S/C H-Actrapid (4) U; 7pm Skip. 14/7/26 6am Skip; 10am Skip; 1:30pm 4u H. Actrapid; 6:45pm 6 unit H Actrapid. 15/7/26 7am FBS, (4) units s/c", hand: true },
    ],
  },
  123: {
    docId: "D41",
    blocks: [
      { t: "head", title: "Insulin chart (GRBS and insulin doses)", sub: "File 5: Nursing file · page 72 of 90" },
      { t: "kv", rid: "p123-grbs", k: "Insulin chart, continued", v: "10am 154 mg/dl PPGRBS. 12:30pm 161 mg/dl, Inj Human (4) units s/c. 7pm 97 mg/dl Skip. 6am 94 mg/dl FBS Skip. Stop", hand: true },
    ],
  },
  124: {
    docId: "D42",
    blocks: [
      { t: "head", title: "Urinary catheter maintenance and insertion care bundles", sub: "File 5: Nursing file · page 73 of 90" },
      { t: "kv", rid: "p124-catheter", k: "Urinary catheter maintenance bundle", v: "D.O.I: 10/7/26. D1 to D5 ticked (10/7 to 14/7). Catheter removed on 14/7/26 @ 9:30pm", hand: true },
    ],
  },
  125: {
    docId: "D42",
    blocks: [
      { t: "head", title: "Urinary catheter maintenance and insertion care bundles", sub: "File 5: Nursing file · page 74 of 90" },
      { t: "kv", rid: "p125-catheter", k: "Urinary catheter insertion bundle", v: "Date & time of Urinary catheterization: 5:40PM 9/7/26. Location: emergency area. Date of removal", hand: true },
    ],
  },
  126: {
    docId: "D43",
    blocks: [
      { t: "head", title: "Daily monitoring for worsening of pressure sore", sub: "File 5: Nursing file · page 75 of 90" },
      { t: "kv", rid: "p126-sore", k: "Daily monitoring for worsening of pressure sore", v: "Origin: [x] B Hospital Acquired. Grade 1 Reddened area skin intact. Stage 1 Reddened. 12/7/26 to 16/7/26: Grade I, Stage I, site buttock and shoulder. General Remark: (R) buttock blister measuring 1x1cm and (R) shoulder multiple small blisters with redness present", hand: false },
    ],
  },
  127: {
    docId: "D43",
    blocks: [
      { t: "head", title: "Daily monitoring for worsening of pressure sore", sub: "File 5: Nursing file · page 76 of 90" },
      { t: "kv", rid: "p127-sore", k: "15/7/2026", v: "(R) buttock skin peel present 1x1 cm and (R) shoulder multiple small blister and redness present. oil application. air bed provided. 15/7/26 - coloplast dressing applied", hand: false },
    ],
  },
  130: {
    docId: "D44",
    blocks: [
      { t: "head", title: "MEWS charts", sub: "File 5: Nursing file · page 79 of 90" },
      { t: "kv", rid: "p130-last", k: "MEWS chart, last column (16/7)", v: "Respiration 15-20. SpO2 >90. Temp 97-100. Systolic BP mark at 133. Diastolic BP 84. Heart rate 51-100. AVPU A. Total MEWS score 1", hand: true },
    ],
  },
  138: {
    docId: "D46",
    blocks: [
      { t: "head", title: "Blood pressure charts", sub: "File 5: Nursing file · page 87 of 90" },
      { t: "kv", rid: "p138-bp", k: "Blood pressure chart", v: "@ 8AM on 16/7/26: arrow from about 123-133 down to about 74", hand: true },
    ],
  },
  140: {
    docId: "D47",
    blocks: [
      { t: "head", title: "Admission order, general consent and discharge slip", sub: "File 5: Nursing file · page 89 of 90" },
      { t: "kv", rid: "p140-label", k: "Patient label (identity removed)", v: "F 82 Y", hand: false },
      { t: "kv", rid: "p140-ipno", k: "I.P. No.", v: "4003392", hand: false },
      { t: "kv", rid: "p140-admit", k: "Admission order", v: "Please Admit. Ward: (removed). Bed Category: General. Dept/Unit: Orthopaedics. Date 09/07/26 Time 4pm", hand: true },
      { t: "kv", rid: "p140-transfer", k: "Handwritten note", v: "Kindly Transfer the ward to HDU", hand: true },
      { t: "kv", rid: "p140-discharge", k: "Discharge slip", v: "Date of Discharge 16/7/26. Time of Discharge: After billing. Patient will leave Ward on 16/7/26 at After billing. Remarks: Discharge", hand: false },
      { t: "kv", rid: "p140-transfusion", k: "Discharge slip", v: "Any Blood Transfusion? Yes / (No). Is it a Delivery Case? (No). Any dressings? (No)", hand: true },
    ],
  },
  141: {
    docId: "D48",
    blocks: [
      { t: "head", title: "Plan of care", sub: "File 5: Nursing file · page 90 of 90" },
      { t: "kv", rid: "p141-surgery", k: "Handwritten above the title", v: "(L) Bipolar hemiarthroplasty", hand: false },
      { t: "kv", rid: "p141-dx", k: "Provisional Diagnosis", v: "(L) femur neck fracture", hand: false },
      { t: "kv", rid: "p141-plan", k: "Plan of care", v: "Built: moderate. Nourishment: moderate. Signs of deficiency: absent. Desired Result: Diagnostic / Curative. Medications: As per the Doctors' Order chart. Diet: Hypertensive Diet [x] Diabetic Diet [x]. Rehabilitative advice: Physiotherapy [x]. Special needs: Senior citizens (>65 yrs) [x]. 09/07/26 4pm", hand: true },
    ],
  },
  144: {
    docId: "D50",
    blocks: [
      { t: "head", title: "Admission record (face sheet)", sub: "File 6: Inpatient case file · page 3 of 134" },
      { t: "kv", rid: "p144-admission-dx", k: "Provisional / Admission Diagnosis", v: "CLOSED LEFT FEMUR NECK FRACTURE", hand: false },
      { t: "kv", rid: "p144-admitted", k: "Admission Date & Time", v: "09/07/2026 18:19 · Discipline: ORTHOPAEDICS", hand: false },
      { t: "kv", rid: "p144-codes", k: "Codes handwritten in the right margin", v: "W01 · S72.0 · E11.9 · J20.9 · Z09.0 · C44.5 · I10 · 5816", hand: false },
      { t: "kv", rid: "p144-ipno", k: "IP No.", v: "[admission number, held in encounters.ref]", hand: false },
      { t: "kv", rid: "p144-operative", k: "Operative Procedure", v: "LEFT BIPOLAR HEMIARTHROPLASTY ON 11/07/26", hand: false },
      { t: "kv", rid: "p144-result", k: "Result (circle whichever applicable)", v: "Improved (circled)", hand: false },
      { t: "kv", rid: "p144-secondary-dx", k: "Secondary Diagnosis", v: "T2DM, HTN, SCC RIGHT GLUTEAL SKIN S/P WLE, ACUTE BRONCHITIS", hand: false },
    ],
  },
  164: {
    docId: "D54",
    blocks: [
      { t: "head", title: "Discharge summary", sub: "File 6: Inpatient case file · page 23 of 134" },
      { t: "kv", rid: "p164-age-sex", k: "Age / Sex", v: "82 Y · F", hand: false },
      { t: "kv", rid: "p164-complaint", k: "Complaints on Reporting", v: "Pain over left hip", hand: false },
      { t: "kv", rid: "p164-dates", k: "Date admitted / Date Discharged", v: "09/07/2026 · 16/7/2026", hand: false },
      { t: "kv", rid: "p164-exam", k: "Physical findings of Examination", v: "General Examination - NAD · Systemic Examination - NAD · Local Examinations - Findings suggestive of above mentioned diagnosis", hand: false },
      { t: "kv", rid: "p164-final-comorbid", k: "Final Diagnosis", v: "T2DM,HTN,Acute Bronchitis, SCC right gluteal skin s/p WLE(2016)", hand: false },
      { t: "kv", rid: "p164-final-dx", k: "Final Diagnosis", v: "Diagnosis - Closed left neck of femur fracture", hand: false },
      { t: "kv", rid: "p164-final-treatment", k: "Final Diagnosis", v: "Treatment -Left Hip Bipolar Hemiarthroplasty (cemented) on 11/07/2026", hand: false },
      { t: "kv", rid: "p164-hpi", k: "History of Present Illness", v: "Patient gives alleged history of slip and fall at home on 09/07/26. Patient complains of pain over left hip which was sudden in onset, gradually progressive, severe, non radiating and persistent. The patient was not able to bear weight on left lower limb post fall. The pain was aggravated on trying to mobilize and was partially relieved at rest. No history of LOC / ENT bleed / seizures. No history of other injuries. No bowel / bladder disturbances", hand: false },
      { t: "kv", rid: "p164-labs", k: "Laboratory Data", v: "Hb: 12.0 g/dl, RBS: 170 mg/dl, HbA1c: 6.10 %, TSH: 1.08 µIU/ml", hand: false },
      { t: "kv", rid: "p164-past", k: "Past History", v: "T2DM · HTN · SCC right gluteal skin s/p wide excision (2016) · Acute bronchitis", hand: false },
      { t: "kv", rid: "p164-subconsult", k: "Sub-Consultation", v: "Cardio 1: surgical clearance, Advice followed · PUL 2: i/v/o Acute bronchitis and decreased SpO2 saturation, Advice followed · Eye 1: i/v/o eye discharge, Advice followed", hand: false },
    ],
  },
  165: {
    docId: "D54",
    blocks: [
      { t: "head", title: "Discharge summary", sub: "File 6: Inpatient case file · page 24 of 134" },
      { t: "kv", rid: "p165-ct-brain", k: "PLAIN CT STUDY OF BRAIN (09/07/2026)", v: "Intra axial confluent hypodense areas noted in centrum semiovale, periventricular white matter and corona radiate regions- s/o chronic small vessel ischaemic changes. Sulci, ventricles and cisterns are prominent - age related cerebral atrophy. No e/o extra axial lesions/collection. Mucosal thickening of sphenoid sinus noted. Left concha bullosa noted.", hand: false },
      { t: "kv", rid: "p165-ct-cspine", k: "PLAIN CT STUDY OF CERVICAL SPINE (09/07/2026)", v: "Craniovertebral junction is normal. Vertebrae are normal in alignment. Disc spaces are grossly maintained. Diffuse osteopenia. Degenerative changes in the form of anterior marginal osteophytes, uncovertebral hypertrophy.", hand: false },
      { t: "kv", rid: "p165-ct-impression", k: "CT TRAUMOGRAM: IMPRESSION", v: "No e/o trauma related neuro-parenchymal/ cervical spine injury in the present study. -Chronic small vessel ischaemic changes with age related cerebral atrophy", hand: false },
      { t: "kv", rid: "p165-ctpa", k: "CT PULMONARY ANGIOGRAPHY (11/07/2026): IMPRESSION", v: "Right and left pulmonary arteries are prominent in calibre, however, no evidence of acute pulmonary embolism. -Bilateral(right>left) dependent basal atelectasis. -Hypodense lesions with calcification in right lobe of thyroid. Suggested USG correlation if clinically indicated.", hand: false },
      { t: "kv", rid: "p165-implants", k: "Implants if any", v: "CORAIL Hip system cemented Femoral stem 12/14 AMT 135° size 8 standard no collar · Aqurate cement stopper diameter 40mm UHMWPE · Self centering Bipolar head 28mm ID 43mm OD · ARTICUL/EZE Femoral head 28mm +1.5 12/14 taper · SmartSet GHV Gentamicin bone cement 40g", hand: false },
      { t: "kv", rid: "p165-operative", k: "Therapeutic /Operative Procedures", v: "Left Hip Bipolar Hemiarthroplasty (cemented) on 11/07/2026 · Surgery Date: 11/07/2026", hand: false },
    ],
  },
  166: {
    docId: "D54",
    blocks: [
      { t: "head", title: "Discharge summary", sub: "File 6: Inpatient case file · page 25 of 134" },
      { t: "kv", rid: "p166-condition", k: "Condition on Discharge", v: "Stable, afebrile · PWB with walker · On knee immobilizer · Bedsore present over right gluteal region- coloplast patch applied", hand: false },
      { t: "kv", rid: "p166-course", k: "Courses of Treatment in the Hospital", v: "The patient came with the above mentioned complaints and was clinicoradiologically diagnosed as mentioned above. After appropriate pre-anaesthetic clearances and informed consents, the patient underwent on 11/07/2026. Intra-op and Post-op period was uneventful. Wound inspection was done as per unit protocol on POD2, POD4, and was found to be healthy. The patient underwent supervised physiotherapy in the form of PWB mobilization with crutches, knee ROM, sQSE, ankle pumps. The patient is symptomatically better, hence being discharged with the following advice", hand: false },
      { t: "kv", rid: "p166-icu", k: "Summary of ICU Stay", v: "Not Applicable", hand: false },
      { t: "kv", rid: "p166-rx-augmentin", k: "Drugs Advice on Discharge", v: "AUGMENTIN 1000MG -DUO · Generic: AMOXYCILLIN 875 MG | CLAVULANATE POTASSIUM 125 MG · TABLET · 1 - 0 - 1 · 1 week", hand: false },
      { t: "kv", rid: "p166-rx-chymoral", k: "Drugs Advice on Discharge", v: "CHYMORAL BR TABLET · Generic: TRYPSIN - | CHYMOTRYPSIN WITH BROMELIAN 0RUTOSIDE · TABLET · 1 - 0 - 1 · 3 days", hand: false },
      { t: "kv", rid: "p166-rx-ezorb", k: "Drugs Advice on Discharge", v: "EZORB D3+ 15s STRIP TAB · Generic: calcium aspartate 1120mg,magnesium hydroxide 180 m · TABLET · 0 - 1 - 0 · 1 month", hand: false },
      { t: "kv", rid: "p166-rx-gastrorid", k: "Drugs Advice on Discharge", v: "GASTRORID-DSR(40MG/30MG) · Generic: PANTOPRAZOLE 40MG| DOMPERIDONE 30 MG SUSTAINED REL · TABLET · 1 - 0 - 0 · 1 week", hand: false },
      { t: "kv", rid: "p166-rx-limcee", k: "Drugs Advice on Discharge", v: "LIMCEE CHEWABLE 500MG 15\"S STRIP · Generic: ASCORBIC ACID IP 100MG, SODIUM ASOCORBATE 450MG.EQ · TABLET · 1 - 0 - 1 · 1 month", hand: false },
      { t: "kv", rid: "p166-rx-pradaxa", k: "Drugs Advice on Discharge", v: "PRADAXA 110MG CAPSULES · Generic: DABIGATRAN ETEXILATE MEXILATE 110MG · CAPSULE · 1 - 0 - 1 · 1 month", hand: false },
      { t: "kv", rid: "p166-rx-ultracet", k: "Drugs Advice on Discharge", v: "ULTRACET SEMI 18.75MG/162.5MG · Generic: TRAMADOL HCL 18.75MG | PARACETAMOL 162.5MG · TABLET · 1 - 0 - 1 · 1 week", hand: false },
    ],
  },
  167: {
    docId: "D54",
    blocks: [
      { t: "head", title: "Discharge summary", sub: "File 6: Inpatient case file · page 26 of 134" },
      { t: "kv", rid: "p167-advice", k: "Further Advice on Discharge", v: "Maintain hygiene and wound care · Continue medications as advised · Change patch dressings once in 3 days as advised · Continue physiotherapy as advised (PWB mobilization with walker, QSE, SLR, Knee ROM, ankle pumps) · NO LEFT HIP ADDUCTION,FLEXION AND INTERNAL ROTATION · Continue chest physio (DBE, Incentive spirometry) · Icepacks to continue · Abduction pillow between the legs to continue", hand: false },
      { t: "kv", rid: "p167-contact", k: "To contact if there are any symptoms like", v: "To Call [hospital phone number removed] if symptoms of fever, pain present.", hand: false },
      { t: "kv", rid: "p167-diet", k: "Dietry Advice", v: "low salt diet · Diabetic diet", hand: false },
      { t: "kv", rid: "p167-follow-up", k: "Further Advice on Discharge", v: "Suture removal on 25/7/2026(Saturday) at local hospital · Review in Orthopaedics OPD on 12/08/2026 (Wednesday) for follow up · Review in Pulmonology OPD on 12/08/2026 (Wednesday) for follow up. · KINDLY BRING WALKER ON REVIEW", hand: false },
      { t: "kv", rid: "p167-rx-d3must", k: "Drugs Advice on Discharge", v: "D3MUST 60K TABLETS · Generic: CHOLECALCIFEROL 60000 IU · TABLET · Once a week · 2 months", hand: false },
      { t: "kv", rid: "p167-rx-evion", k: "Drugs Advice on Discharge", v: "EVION 400 CAPSULES · Generic: VIT E 400 MG · CAPSULE · Continue", hand: false },
      { t: "kv", rid: "p167-rx-glimy", k: "Drugs Advice on Discharge", v: "GLIMY -M1TABLET · Generic: GLIMEPIRIDE 1 MG | METFORMIN HCL 500MG SUSTAINED R · TABLET · 1 - 0 - 1 · Continue", hand: false },
      { t: "kv", rid: "p167-rx-justtears", k: "Drugs Advice on Discharge", v: "JUST TEARS EYE DROPS 10ML · Generic: CARBOXY METHYL CELLULOSE 0.5% · SOLUTION · 1 - 1 - 1 - 1 Both eyes · 1 week", hand: false },
      { t: "kv", rid: "p167-rx-mosi", k: "Drugs Advice on Discharge", v: "MOSI (EYE DROPS) · Generic: MOXIFLOXACIN OPHTHALMIC SOL 0.5% · DROPS · 1 - 1 - 1 - 1 Both eyes · 1 week", hand: false },
      { t: "kv", rid: "p167-rx-rozavel", k: "Drugs Advice on Discharge", v: "ROZAVEL 5MG TABLET · Generic: ROSUVASTATIN CALCIUM 5MG · TABLET · 0 - 0 - 1 · Continue", hand: false },
      { t: "kv", rid: "p167-rx-stamlo", k: "Drugs Advice on Discharge", v: "STAMLO 5 MG TABLET · Generic: AMLODIPINE BESYLATE 5 MG · CAPSULE · 1 - 0 - 0 · Continue", hand: false },
      { t: "kv", rid: "p167-rx-tegaderm", k: "Drugs Advice on Discharge", v: "TEGADERM WITH PAD8593 9CMX35CM · Generic: TRANSPARENT ADHESIVE DRESSING · DRESSING · 5 nos", hand: false },
    ],
  },
  168: {
    docId: "D54",
    blocks: [
      { t: "head", title: "Discharge summary", sub: "File 6: Inpatient case file · page 27 of 134" },
      { t: "kv", rid: "p168-review-date", k: "Review Date/ Follow up date", v: "12/08/2026 · Post Discharge Lab Request: NIL", hand: false },
    ],
  },
  170: {
    docId: "D55",
    blocks: [
      { t: "head", title: "Emergency medicine trauma case record", sub: "File 6: Inpatient case file · page 29 of 134" },
      { t: "kv", rid: "p170-primary-survey", k: "Emergency trauma case record 9/7/26, 1:45 pm", v: "RR 19/min · SpO2 91% @ FiO2 21% · Air entry: B/L Equal · HR 86 bpm · Rhythm: regular · BP 133/92 mmHg · GCS E4 V5 M6 15/15 · Focal neurologic deficits: Difficulty in (L) lower limb movement · GRBS 250 mg/dl", hand: true },
      { t: "kv", rid: "p170-triage", k: "Emergency trauma case record", v: "Date: 9/7/26 · Time: 1:45 pm · Triage: P3 · Date of Incident: 9/7/26 · Time of Incident: 11 am · Concise Mechanism of Injury: A/H/O slip & fall from stairs", hand: true },
    ],
  },
  171: {
    docId: "D55",
    blocks: [
      { t: "head", title: "Emergency medicine trauma case record", sub: "File 6: Inpatient case file · page 30 of 134" },
      { t: "kv", rid: "p171-efast", k: "E-FAST /RUSH Protocol", v: "all views marked (-) · with B/L lung sliding (+)", hand: true },
      { t: "kv", rid: "p171-mechanism", k: "Mechanism of Injury, Signs & Symptoms (emergency)", v: "Pat. was walking down the stairs at the home near the kitchen premises & had history of slip & fall & was in sitting down position... & c/o pain of (L) hip region & decreased movement of (L) lower limb · LOC (-) · Headache (-) · ENT Bleed (-) · Vomiting (-)", hand: true },
      { t: "kv", rid: "p171-past-history", k: "Past Medical History", v: "DM x 18 yrs - On meds · HTN x 18 yrs - On meds", hand: true },
      { t: "kv", rid: "p171-treatment", k: "Treatment orders (emergency, 9/7/26)", v: "1) Inj. FINAMAC 1g IV · 2) IVF RL @ 75 ml/hr · Neb Duolin 1 resp, Neb Budecort 1 resp: 2 cycle · Inj. Hydrocort 100mg IV stat · Oxygen mask 4 l via nasal prongs", hand: true },
    ],
  },
  172: {
    docId: "D55",
    blocks: [
      { t: "head", title: "Emergency medicine trauma case record", sub: "File 6: Inpatient case file · page 31 of 134" },
      { t: "kv", rid: "p172-provisional", k: "Provisional Diagnosis", v: "? IT # (L) · ? NOF #", hand: true },
      { t: "kv", rid: "p172-secondary-survey", k: "Secondary Survey & Injuries noted", v: "Head, Neck & ENT: no external injuries noted · Thorax: no external injuries noted · Abdomen & Pelvis: Non-tender, no external injury noted · Log roll/ Spine examination: Non-tender · Extremities: No external injuries noted · Neurovascular: Peripheral pulsations +nt · Plan: Admission", hand: true },
    ],
  },
  174: {
    docId: "D56",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person", sub: "File 6: Inpatient case file · page 33 of 134" },
      { t: "kv", rid: "p174-complaint", k: "Chief Complaints", v: "i) pain over left hip", hand: true },
      { t: "kv", rid: "p174-mechanism", k: "HISTORY OF PRESENT INJURY (9/7/26; arrival 1:15 pm, examined 1:45 pm)", v: "Mechanism of Injury: Alleged history of slip and fall from stairs at [place removed] (Home) · Time and Date of Injury: 11am 09/07/2026 · H/o loss of consciousness: Absent · H/o bleeding from ENT: Absent · Referred by: self · Immunisation status: Not Known", hand: true },
      { t: "kv", rid: "p174-past-history", k: "History of any significant past history", v: "T2DM, HTN, SCC Right gluteal skin s/p WLE (2016), Acute bronchitis", hand: true },
    ],
  },
  175: {
    docId: "D56",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person", sub: "File 6: Inpatient case file · page 34 of 134" },
      { t: "kv", rid: "p175-general-exam", k: "GENERAL EXAMINATION (orthopaedic case record, 9/7/26)", v: "Consciousness: conscious, oriented · Pupillary reaction: Bilaterally reactive · Pulse 86 /min (good), Regular · BP 133/92 mm of Hg · Temp 38.2 °C · Respiration 19 /min", hand: true },
    ],
  },
  176: {
    docId: "D56",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person", sub: "File 6: Inpatient case file · page 35 of 134" },
      { t: "kv", rid: "p176-local-exam", k: "EXAMINATION OF THE LOWER EXTREMITY", v: "Left lower limb shortened and externally rotated · No external injuries · No swelling · Tenderness present over left hip · ROM left hip and knee couldn't be assessed due to pain · ROM Right hip, Knee, both ankles - within normal limits · Active toe movements present bilaterally · Distal pulses palpable. Distal sensations intact", hand: true },
    ],
  },
  178: {
    docId: "D56",
    blocks: [
      { t: "head", title: "Orthopaedics: history and physical examination of an injured person", sub: "File 6: Inpatient case file · page 37 of 134" },
      { t: "kv", rid: "p178-impression", k: "IMPRESSION", v: "Closed left femur neck fracture", hand: true },
      { t: "kv", rid: "p178-plan", k: "Treatment planned", v: "Investigations asked for: X-rays - Chest, pelvis, left femur - AP, lateral · Treatment planned: Admission · Preops · skin traction", hand: true },
      { t: "kv", rid: "p178-radiology", k: "Radiological findings", v: "left femur neck fracture", hand: true },
    ],
  },
  180: {
    docId: "D57",
    blocks: [
      { t: "head", title: "IP assessment form and plan of care", sub: "File 6: Inpatient case file · page 39 of 134" },
      { t: "kv", rid: "p180-hpi", k: "IP Assessment Form (11/07/26): History of Present illness", v: "A/h/o slip & fall at home on 09/07/26 at 11am. C/o pain over left hip. No h/o loss of consciousness / ENT bleed / head trauma. Pain over left hip was sudden in onset, progressive, severe, non-radiating & persistent. The patient was not able to bear weight on left side post fall. No h/o other injuries. No bowel / bladder disturbances.", hand: true },
    ],
  },
  182: {
    docId: "D57",
    blocks: [
      { t: "head", title: "IP assessment form and plan of care", sub: "File 6: Inpatient case file · page 41 of 134" },
      { t: "kv", rid: "p182-local-exam", k: "IP Assessment Form: local examination", v: "(L) Lower limb: No external injuries · No swelling noted · Tenderness elicited over (L) hip · ROM of (L) hip & knee - Not assessed due to pain · Distal sensations intact · Peripheral pulses palpable · Active toe movements +nt · (R) LL: Normal", hand: true },
    ],
  },
  183: {
    docId: "D57",
    blocks: [
      { t: "head", title: "IP assessment form and plan of care", sub: "File 6: Inpatient case file · page 42 of 134" },
      { t: "kv", rid: "p183-provisional", k: "Provisional Diagnosis / Plan of care", v: "Closed left neck of femur fracture · Plan of care: (L) hip bipolar hemiarthroplasty", hand: true },
    ],
  },
  185: {
    docId: "D58",
    blocks: [
      { t: "head", title: "Consultation record: Cardiology", sub: "File 6: Inpatient case file · page 44 of 134" },
      { t: "kv", rid: "p185-opinion", k: "Cardiology opinion (10/7/26)", v: "Case details noted · ECHO - (N) study, 65% EF · ECG - NSR · Planned for (L) Bipolar hemiarthroplasty · Adv: pt. can be taken up for planned Sx under (arrow symbol) added cardiac risk.", hand: true },
    ],
  },
  187: {
    docId: "D59",
    blocks: [
      { t: "head", title: "Consultation record: Surgical oncology", sub: "File 6: Inpatient case file · page 46 of 134" },
      { t: "kv", rid: "p187-opinion", k: "Surgical oncology opinion (9/7/26, 7:45 pm)", v: "Old case of SCC over natal cleft -> S/P WLE + 1° closure done in 2016. Last follow up - Jan 2023. Biopsy -> WD SCC -> margin free. L/E: Scar healthy. No signs of any LRR. Orthopaedics to proceed with planned procedure.", hand: true },
    ],
  },
  188: {
    docId: "D60",
    blocks: [
      { t: "head", title: "Consultation record: General medicine", sub: "File 6: Inpatient case file · page 47 of 134" },
      { t: "kv", rid: "p188-diagnosis", k: "General medicine consult (9/7/26, 9 PM)", v: "Pt is a case of T2DM, HTN, Acute bronchitis (in Jan 2026) & ? MASLD, (R) gluteal skin SCC s/p Sx 2016.", hand: true },
    ],
  },
  189: {
    docId: "D60",
    blocks: [
      { t: "head", title: "Consultation record: General medicine", sub: "File 6: Inpatient case file · page 48 of 134" },
      { t: "kv", rid: "p189-advice", k: "General medicine advice (9/7/26)", v: "1. Cardiac clearance 2. Pulmonology clearance 3. Pt. can be posted for surgery if BP < 140/90 and GRBS pre op < mg/dl after being cleared for Surgery by Pulmonology & Cardiology. 4. W/H OHAs on day of surgery & give IVF DNS with 8 U neutralising dose of Actrapid", hand: true },
      { t: "kv", rid: "p189-cxr", k: "CXR (general medicine consult, 9/7/26)", v: "(L) sided homogenous opacification of lung field. Cardio & Costo Phrenic angles not blunted · CT yet to be reported", hand: true },
      { t: "kv", rid: "p189-echo", k: "ECG / Echo (general medicine consult)", v: "ECG: noted · Echo: EF = 65% · overall good BVSF · no RWMA", hand: true },
      { t: "kv", rid: "p189-labs", k: "Labs noted in the general medicine consult (9/7/26)", v: "Hb 12.0 · Plt 1.57 L · TLC 12.8K · N 91.2, L 4.2, M 2 · RBS 170 · TSH 1.08 · Trop T 0.008 · UA 4.3 · CRP 4.91 · RFT (N) · T-B 0.93 · DB 0.39 · TP 7.48 · Alb 4.5 · glo 3.18 · AST 37 · ALT 37 · ALP 107 · A1c awaited", hand: true },
      { t: "kv", rid: "p189-on-rx", k: "On Rx (general medicine consult, 9/7/26)", v: "T. Rozavel 5 0-0-1 · T. Stamlo 5 1-0-0 · T. Glimy M1 1-0-1 · T. Telma 40 1-0-1", hand: true },
      { t: "kv", rid: "p189-vitals", k: "General medicine consult (9/7/26, 9 PM)", v: "BP: 143/84 · PR: 92 bpm · SpO2: 94% on 4 L O2 via NP · CVS: S1 + S2 + · RS: B/L NVBS · PA: soft · CNS: HMF intact", hand: true },
    ],
  },
  190: {
    docId: "D61",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology", sub: "File 6: Inpatient case file · page 49 of 134" },
      { t: "kv", rid: "p190-history", k: "Pulmonology consult (10/7/26, requested 12 AM)", v: "Patient is a c/o (L) NOF # planned for (L) bipolar hemiarthroplasty · SCC (R) upper gluteal region (WLE) · Patient has Nil Active Respiratory Complaints · H/O Acute Bronchitis Jan '26 · margin notes: TB/COVID (-), MDI (-), Family (-), Addiction (-), Biomass (+) · ECHO (N)", hand: true },
      { t: "kv", rid: "p190-on-rx", k: "On Rx (pulmonology consult, 10/7/26)", v: "1) · 2) Stamlo 5 · 3) Glimy M-1 BD · 4) Rozavel 5 OD", hand: true },
    ],
  },
  191: {
    docId: "D61",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology", sub: "File 6: Inpatient case file · page 50 of 134" },
      { t: "kv", rid: "p191-abg", k: "ABG (pulmonology note, 10/7/26; room air ABG was advised)", v: "pH 7.43 · PCO2 35 · PO2 40 · SO2 78", hand: true },
      { t: "kv", rid: "p191-cxr", k: "CXR (pulmonology consult, 10/7/26)", v: "Rotated film. Cannot comment", hand: true },
      { t: "kv", rid: "p191-ddimer", k: "Pulmonology review (10/7/26)", v: "Reports noted: D-dimer -> 2.3 (circled) · Advise: To do CT pulmonary angiography to r/o ? PTE · R/w with reports for clearance", hand: true },
      { t: "kv", rid: "p191-labs", k: "Labs noted in the pulmonology consult (10/7/26)", v: "ESR = 30 (circled) · Hb = 12.0 · TLC = 12.8 (circled) · N = 93.0% (circled) · AEC = 0 · PLT = 157K · Coag (N) · A1c 6.1% · Trop (-) · RFT (N) · LFT (N)", hand: true },
      { t: "kv", rid: "p191-vitals", k: "Pulmonology consult (10/7/26)", v: "PR: 97/min · SpO2: 94% on 2 L O2 · RR: 19 cpm · BP: 143/84 mmHg · R/S: B/L NVBS", hand: true },
    ],
  },
  192: {
    docId: "D61",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology", sub: "File 6: Inpatient case file · page 51 of 134" },
      { t: "kv", rid: "p192-review", k: "Pulmonology review (signed 11/7/26)", v: "CTPA ✓ · D-dimer = 2.3 · ABG ✓ · Vitals: BP 133/84 mmHg · PR 80 bpm · RR 23 bpm · SpO2 97% with 4L, 85% with RA · R/S: B/L NVBS · Patient can be taken up for surgery under high risk if surgery cannot be postponed.", hand: true },
    ],
  },
  193: {
    docId: "D61",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology", sub: "File 6: Inpatient case file · page 52 of 134" },
      { t: "kv", rid: "p193-referral-10", k: "Referral written on 14/7/26", v: "Respected staff, Kindly review the pt i/v/o O2 saturation drop", hand: true },
      { t: "kv", rid: "p193-review", k: "Pulmonology review (11/7/26, after the 5:45 pm referral)", v: "CTPA: (R) & (L) PA prominent, but no e/o acute PTE; B/L (R>L) dependent basal atelectasis · Vitals: BP 146/73 mmHg, PR 77 bpm, RR 15 cpm, SpO2 99% with 6 L O2 via face mask · 1) CTPA (-) 2) Continue nebulized bronchodilators (NEB DUOLIN Q8H, NEB BUDECORT Q12H) and oxygen supplementation (to maintain O2 sat > 90%) 3) Chest Physiotherapy 4) Incentive Spirometry", hand: true },
    ],
  },
  194: {
    docId: "D62",
    blocks: [
      { t: "head", title: "Consultation record: Ophthalmology", sub: "File 6: Inpatient case file · page 53 of 134" },
      { t: "kv", rid: "p194-history", k: "Ophthalmology consult (10/7/26, requested 6:50 pm for eye discharge)", v: "Pt seen bedside · history noted: c/o itching (BE), c/o discharge (BE) x 2 days · T2DM (+), HTN (+) · O/E: visual acuity unaided: CF @ in each eye · EOM free, painless (pt finds difficult to follow commands)", hand: true },
    ],
  },
  195: {
    docId: "D62",
    blocks: [
      { t: "head", title: "Consultation record: Ophthalmology", sub: "File 6: Inpatient case file · page 54 of 134" },
      { t: "kv", rid: "p195-impression", k: "Ophthalmology opinion (10/7/26, 7 pm)", v: "Discharge ++ @ fornix (BE) (greenish) · Imp: Acute Bacterial conjunctivitis · Adv: G. MOSI 1-1-1-1, G. EYEMIST 1-1-1-1 (BE) x 2 weeks · R/w in Eye OPD (1) once stable & shiftable (mon, wed, fri)", hand: true },
    ],
  },
  196: {
    docId: "D63",
    blocks: [
      { t: "head", title: "Consultation record: Pulmonology review", sub: "File 6: Inpatient case file · page 55 of 134" },
      { t: "kv", rid: "p196-labs", k: "Values listed in the pulmonology review (14 Jul)", v: "Hb = 10.4 · FBS = 39 (circled) · K+ = 3.6 (circled) · Na = 138", hand: true },
      { t: "kv", rid: "p196-review", k: "Pulmonology review (Augmentin D4)", v: "Baseline SpO2 (Jan 26) = 99% RA · Baseline SpO2 @ presentation 91% RA (ED sheet) · O/E: SOB (-) · PR 108 b/m · SpO2 91% RA · BP 172/84 mmHg · RR 22 cpm · R/S: bibasilar creps + · ? volume overload / Basal atelectasis · 1) NT-Pro BNP 2) Strict I/O charting 4) Maintain I=O 5) Continue O2 @ 1 L/min (SpO2 > 90%) 6) Incentive spirometry", hand: true },
    ],
  },
  198: {
    docId: "D64",
    blocks: [
      { t: "head", title: "Department of Medicine investigation chart", sub: "File 6: Inpatient case file · page 57 of 134" },
      { t: "kv", rid: "p198-biochem", k: "Investigation chart (9/7)", v: "RBS 170 · UREA 14 · CREAT 0.50 · Na+ 138 · K+ 3.6", hand: true },
      { t: "kv", rid: "p198-cbc", k: "Investigation chart, CBC (9/7)", v: "Hb/pcv 12.0 · TLC 12.8 K · DLC N 93.0, L 4.2, M 2, E 0, B 0.2 · PLT 157 K · ESR 30", hand: true },
      { t: "kv", rid: "p198-lft", k: "Investigation chart (9/7)", v: "AST 37 · ALT 37.4 · ALP 107 · T.P 7.48 · ALB 4.54 · GLO 3.18 · PT/INR 10.7 / 1.01 · APTT 25.6", hand: true },
      { t: "kv", rid: "p198-other", k: "Investigation chart, other (9/7)", v: "TSH 1.08 · Uric Acid 4.1 · CRP 4.9 · HBsAg NR · HCV NR · HbA1c -> 6.1 %", hand: true },
    ],
  },
  200: {
    docId: "D65",
    blocks: [
      { t: "head", title: "Progress sheets (10 to 16 Jul)", sub: "File 6: Inpatient case file · page 59 of 134" },
      { t: "kv", rid: "p200-labs", k: "Progress sheet 10/07/26, 7 am (right margin)", v: "Hb: 12.0 · ESR - 30 · CRP: 4.9 · RFT: 14 / 0.50 / 137 / 3.7 · ALP - 107 · ALT - 37 · AST - 37 · HbA1c: 6.10 %", hand: true },
      { t: "kv", rid: "p200-note", k: "Progress sheet 10/07/26, 7 am", v: "Dx: (L) femur neck fracture · plan: (L) Bipolar hemiarthroplasty · Vitals stable · No fresh complaints · Surgical Oncology - cleared for surgery · Medicine consult, Cardiology: awaited", hand: true },
    ],
  },
  202: {
    docId: "D65",
    blocks: [
      { t: "head", title: "Progress sheets (10 to 16 Jul)", sub: "File 6: Inpatient case file · page 61 of 134" },
      { t: "kv", rid: "p202-pod1", k: "Progress sheet 12/07/26, 7 am (POD 1)", v: "Vitals: HR 72/min · BP 123/74 · RR 14/min · SpO2 97% 1L O2 · GRBS: 276 · BP: 123/74 · postop Hb: 10.4 <- 12.0 · DT: 40ml · Dressing: No soakage · I/O: 2550/1440 ml · plan: Shift to ward, physio", hand: true },
    ],
  },
  203: {
    docId: "D65",
    blocks: [
      { t: "head", title: "Progress sheets (10 to 16 Jul)", sub: "File 6: Inpatient case file · page 62 of 134" },
      { t: "kv", rid: "p203-pod2", k: "Progress sheet 13/07/26, 7 am (POD 2)", v: "Patient conscious, oriented · Vitals stable · No fresh complaints · GRBS: 227 mg/dL · BP: 123/84 · DT: 6 ml · physio: PWB mobilization · plan: Continue physio", hand: true },
    ],
  },
  204: {
    docId: "D65",
    blocks: [
      { t: "head", title: "Progress sheets (10 to 16 Jul)", sub: "File 6: Inpatient case file · page 63 of 134" },
      { t: "kv", rid: "p204-pod3", k: "Progress sheet 14/7/26, 7 am (POD 3)", v: "Patient conscious, oriented · Vitals stable · No fresh complaints · Dressing: no soakage · plan: Continue physio", hand: true },
    ],
  },
  206: {
    docId: "D65",
    blocks: [
      { t: "head", title: "Progress sheets (10 to 16 Jul)", sub: "File 6: Inpatient case file · page 65 of 134" },
      { t: "kv", rid: "p206-pod4", k: "Progress sheet 15/7/26, 7 am (POD 4)", v: "Patient conscious, oriented · Vitals stable · No fresh complaints · GRBS - 138 · BP - 143/92 · Dressing: no soakage · plan: W/I today, Continue physio", hand: true },
    ],
  },
  208: {
    docId: "D65",
    blocks: [
      { t: "head", title: "Progress sheets (10 to 16 Jul)", sub: "File 6: Inpatient case file · page 67 of 134" },
      { t: "kv", rid: "p208-pod5", k: "Progress sheet 16/7/26, 7 am (POD 5)", v: "Patient conscious, oriented · Vitals stable · No fresh complaints · GRBS: · BP: · Dressing: no soakage · plan: Continue physio, discharge today", hand: true },
    ],
  },
  210: {
    docId: "D66",
    blocks: [
      { t: "head", title: "Transfer summaries (nurses) and transfer out forms", sub: "File 6: Inpatient case file · page 69 of 134" },
      { t: "kv", rid: "p210-allergy", k: "Allergies: None / Yes", v: "None (marked) · nurses' transfer summary 9/7/26", hand: true },
      { t: "kv", rid: "p210-vitals", k: "Transfer summary (nurses) 9/7/26, 6:30 PM, emergency to ward", v: "Temperature 98.8°F · Pulse 92 · BP 133/92 · RR 19 · SPO2 96% · GCS 15 · Existing pressure ulcers: No · On oxygen: Yes · On Nebulization: Yes", hand: true },
    ],
  },
  212: {
    docId: "D66",
    blocks: [
      { t: "head", title: "Transfer summaries (nurses) and transfer out forms", sub: "File 6: Inpatient case file · page 71 of 134" },
      { t: "kv", rid: "p212-lines", k: "Lines and drains (transfer summary 11/07/2026)", v: "Peripheral Line: 10/07/26 · Foley's Catheter: date of insertion 09/07/26 · Medication reconciliation: Inj. Tramadol 50mg 12th · Inj. PCM 1g 12th · Tab. Gastrorid 40mg 1-0-0 · Tab. Chymoral BR 1-0-1 · Tab. Rozavel 5mg 0-0-1 · Tab. Evion 0-1-0 · Tab. Stamlo 5mg 1-0-0 · Tab. Glimy M1 1-0-1", hand: true },
      { t: "kv", rid: "p212-vitals", k: "Transfer summary (nurses) 11/07/2026, 12 PM, ward to operation theatre", v: "Temperature 98.8 · Pulse 89 · BP 133/84 · RR 19 · SPO2 99% · Pain score 01/10 · Braden Score 17 · Existing pressure ulcers: No · On oxygen: Yes · On Nebulization: Yes", hand: true },
    ],
  },
  214: {
    docId: "D66",
    blocks: [
      { t: "head", title: "Transfer summaries (nurses) and transfer out forms", sub: "File 6: Inpatient case file · page 73 of 134" },
      { t: "kv", rid: "p214-allergy", k: "Allergies: None / Yes", v: "None (underlined) · nurses' transfer summary 12/7/26", hand: true },
      { t: "kv", rid: "p214-lines", k: "Lines and drains (transfer summary 12/7/26)", v: "Peripheral Line: 9/7/26, 11/7/26 · Foley's Catheter: date of insertion 10/7/26 · Surgical Drain: 11/7/26 · Medication reconciliation: Inj AUGMENTIN 1.2g Q12H · Inj TEICONIN 400mg OD · Inj TRAMADOL 50mg BD · Inj [paracetamol brand] 1g BD · T. PAN 40mg OD · T. Chymoral BR 1-0-1 · T. ROZAVEL 5mg 0-0-1 · T. STAMLO 5mg BD · T. EVION 0-1-0 · G. MOSI 1-1-1-1 · Inj CLEXANE 0.4ml OD · G. EYEMIST 1-1-1-1", hand: true },
      { t: "kv", rid: "p214-pressure-ulcer", k: "Existing pressure ulcers: Yes/No", v: "Yes (underlined) · transfer HDU to ward, 12/7/26", hand: true },
      { t: "kv", rid: "p214-vitals", k: "Transfer summary (nurses) 12/7/26, 12 pm, HDU to ward", v: "Temperature 98.8 · Pulse 75 · BP 123/84 · RR 19 · SPO2 97 · Pain score 1/10 · GCS 15 · Braden Score 17 · Total ICU Days: 01 · On oxygen: Yes · On Nebulization: Yes", hand: true },
    ],
  },
  216: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 75 of 134" },
      { t: "kv", rid: "p216-orders", k: "Doctor's orders 09/07/26, 4 pm", v: "Inj. TRAMADOL 50mg/100ml NS IV Q12H alt Inj. PCM 1g IV Q12H · T. GASTRORID 40 1-0-0 (B/F) · T. CHYMORAL BR 1-0-1 · T. ROZAVEL 5 0-0-1 · T. EVION 0-1-0 · T. STAMLO 5 1-0-0 · T. GLIMY M1 1-0-1", hand: true },
    ],
  },
  217: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 76 of 134" },
      { t: "kv", rid: "p217-orders", k: "Doctor's orders 09/07/26 (continued)", v: "Inj. CLEXANE 0.4ml s/c OD · Adv: Monitor vitals, BP monitoring Q6H · GRBS monitoring - F, PP - B, L, D · skin traction with 3kg weight", hand: true },
    ],
  },
  220: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 79 of 134" },
      { t: "kv", rid: "p220-orders", k: "Doctor's orders 10/07/26 (continued)", v: "Inj. CLEXANE 0.4ml s/c OD: withhold · Monitor vitals, BP monitoring Q6H · GRBS monitoring F, PP - B, L, D · Skin traction with 3Kg wt · Chest physio - DBE, Incentive spirometry", hand: true },
    ],
  },
  222: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 81 of 134" },
      { t: "kv", rid: "p222-preop", k: "PREOP ORDERS 10/07/26", v: "Inj. AUGMENTIN 1.2g IV - (1) · Inj. TEICONIN 400mg IV - (1) · NPO from 12am midnight · IVF DNS @ 50ml/hr with 8 U neutralizing dose of Actrapid · Informed consent, FC · parts preparation (L) LL + private parts · Adult diaper", hand: true },
      { t: "kv", rid: "p222-preop-last-line", k: "PREOP ORDERS 10/07/26, last line (different hand)", v: "Inj 1g IV - (2)", hand: true },
    ],
  },
  224: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 83 of 134" },
      { t: "kv", rid: "p224-postop", k: "Postop orders 11/7/26, 3 PM", v: "Inj AUGMENTIN 1.2g IV Q12H (D1) · Inj TEICONIN 400mg IV Q24H (D1/D2) · Inj TRAMADOL 50mg/100ml NS IV Q12H alt Inj FINAMAC 1g IV Q12H · Inj EMESET 4mg IV 30 min before TRAMADOL · Inj PAN 40mg IV STAT · IVF NS/RL till NPO · After NPO: T. CHYMORAL BR 1-0-1", hand: true },
    ],
  },
  225: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 84 of 134" },
      { t: "kv", rid: "p225-postop", k: "Postop orders 11/7/26 (continued)", v: "T. ROZAVEL 5 0-0-1 · T. EVION 0-1-0 · T. STAMLO 5 1-0-0 · T. GLIMY M1 1-0-1 · G. MOSI 1-1-1-1-1 (BE) (D1/D14) · G. EYEMIST (JUST TEARS) 1-1-1-1 (BE) (D1/D14) · monitor vitals, BP Q6H, W/F soakage · GRBS - F, PP - B, L, D · Abd. pillow, inform SOS · Chest physio: DBE, Incentive spirometry", hand: true },
    ],
  },
  226: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 85 of 134" },
      { t: "kv", rid: "p226-orders", k: "Doctor's orders 12/07/26, 7 am (POD 1)", v: "Inj. AUGMENTIN 1.2g IV Q12H (D2) · Inj. TEICONIN 400mg IV Q24H (D2/2) · Inj. TRAMADOL 50mg/100ml NS IV Q12H alt Inj. FINAMAC 1g IV Q12H · Inj. EMESET 4mg IV 30mins before TRAMADOL · T. PAN 40 1-0-0 (B/F) · T. CHYMORAL BR 1-0-1 · T. ROZAVEL 5 0-0-1", hand: true },
    ],
  },
  227: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 86 of 134" },
      { t: "kv", rid: "p227-orders", k: "Doctor's orders 12/07/26 (continued)", v: "T. STAMLO 5 1-0-0 · T. GLIMY M1 1-0-1 (W/H) · T. EVION 0-1-0 · G. MOSI (B/E) 1-1-1-1-1 (D2/D14) · Inj. CLEXANE 0.4ml s/c OD · G. EYEMIST / JUST TEARS 1-1-1-1 (B/E) (D2/D14) · Monitor vitals BP Q6H, W/F soakage · Abduction pillow", hand: true },
    ],
  },
  228: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 87 of 134" },
      { t: "kv", rid: "p228-orders", k: "Doctor's orders 12/07/26 (continued)", v: "NEB. DUOLIN Q8H · NEB. BUDECORT Q12H · Inj. H. ACTRAPID (6) u s/c - (6) - (6) · Physio: QSE, Ankle pumps", hand: true },
    ],
  },
  230: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 89 of 134" },
      { t: "kv", rid: "p230-orders", k: "Doctor's orders 13/07/26", v: "Monitor vitals, BP Q6H, W/F soakage, inform SOS · Chest physio: DBE, Incentive spirometry · Physio (BD): Make her stand followed by PWB mobilization with walker; QSE, Ankle pumps · T. LIMCEE 500 1-0-1 · clamp & release catheter Q4H · Remove catheter tomorrow (6am)", hand: true },
    ],
  },
  232: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 91 of 134" },
      { t: "kv", rid: "p232-orders", k: "Doctor's orders 13/07/26, 7 am (POD 2)", v: "Inj. AUGMENTIN 1.2g IV Q12H (D3) · Inj. TRAMADOL 50mg/100ml NS IV Q12H · Inj. FINAMAC 1g IV Q12H · Inj. EMESET 4mg IV 30mins before TRAMADOL · T. PAN 40 1-0-0 (B/F) · T. CHYMORAL BR 1-0-1 · T. ROZAVEL 5 0-0-1 · T. STAMLO 5 1-0-0 · note at top: stop O2", hand: true },
    ],
  },
  233: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 92 of 134" },
      { t: "kv", rid: "p233-orders", k: "Doctor's orders 13/07/26 (continued)", v: "T. GLIMY M1 1-0-1 (W/H) · T. EVION 0-1-0 · Inj. CLEXANE 0.4ml s/c OD · Inj. H. ACTRAPID (4) - (4) - (0) s/c · G. MOSI B/E 1-1-1-1 (D3/D14) · G. EYEMIST / JUST TEARS 1-1-1-1 B/E (D3/D14) · NEB. DUOLIN Q8H · NEB. BUDECORT Q12H", hand: true },
    ],
  },
  234: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 93 of 134" },
      { t: "kv", rid: "p234-orders", k: "Doctor's orders 14/7/26 (POD 3)", v: "Inj. AUGMENTIN 1.2g IV Q12H (D4) · Inj. TRAMADOL 50mg/100ml NS IV Q12H · Inj. FINAMAC 1g IV Q12H · Inj. EMESET 4mg IV 30mins before TRAMADOL · T. PAN 40 1-0-0 (B/F) · T. CHYMORAL BR 1-0-1 · T. ROZAVEL 5 0-0-1 · T. STAMLO 5 1-0-0 · note at top: KNEE IMMOBILIZER (M) - 1, TEGADERM 9x35 - 1", hand: true },
    ],
  },
  235: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 94 of 134" },
      { t: "kv", rid: "p235-orders", k: "Doctor's orders 14/7/26, 7 am (continued)", v: "T. GLIMY M1 1-0-1 (W/H) · T. EVION 0-1-0 · Inj. CLEXANE 0.4ml s/c OD · Inj. H. ACTRAPID (skip) - (4) - (6) s/c · G. MOSI B/E 1-1-1-1 (D4/D14) · G. EYEMIST / JUST TEARS 1-1-1-1 B/E (D4/D14) · NEB. DUOLIN Q8H · NEB. BUDECORT Q12H", hand: true },
    ],
  },
  236: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 95 of 134" },
      { t: "kv", rid: "p236-orders", k: "Doctor's orders 14/7/26 (continued)", v: "T. LIMCEE 500 1-0-1 · Monitor vitals, BP Q6H, W/F soakage, inform SOS · Abduction pillow · Chest physio: DBE, Incentive spirometry · Physio (BD): PWB mobilization with walker; QSE, Ankle pumps · O2 @ 2 L/min · DULCOLAX SUPPOSITORY 2 tab (nurse entry 12 am: Refused)", hand: true },
    ],
  },
  238: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 97 of 134" },
      { t: "kv", rid: "p238-coloplast", k: "Note above the 15/7/26 orders", v: "Arrange: COLOPLAST PATCH FOR BACK SKIN PEEL", hand: true },
      { t: "kv", rid: "p238-orders", k: "Doctor's orders 15/7/26, 7 am (POD 4)", v: "Inj. AUGMENTIN 1.2g IV Q12H (D5) · Inj. TRAMADOL 50mg/100ml NS IV Q12H · Inj. FINAMAC 1g IV Q12H · Inj. EMESET 4mg IV 30mins before TRAMADOL · T. PAN 40 1-0-0 (B/F) · T. CHYMORAL BR 1-0-1 · T. ROZAVEL 5 0-0-1 · T. STAMLO 5 1-0-0", hand: true },
    ],
  },
  239: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 98 of 134" },
      { t: "kv", rid: "p239-orders", k: "Doctor's orders 15/7/26 (continued)", v: "T. GLIMY M1 1-0-1 · T. EVION 0-1-0 · Inj. CLEXANE 0.4ml s/c OD · Inj. H. ACTRAPID (4) - (4) - (0) s/c · G. MOSI B/E 1-1-1-1 (D5/D14) · G. JUST TEARS 1-1-1-1 B/E (D5/D14) · NEB. DUOLIN Q8H · NEB. BUDECORT Q12H", hand: true },
    ],
  },
  240: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 99 of 134" },
      { t: "kv", rid: "p240-orders", k: "Doctor's orders 15/7/26 (continued)", v: "T. LIMCEE 500 1-0-1 · Monitor vitals BP Q6H, W/F soakage, inform SOS · Abduction pillow · Chest physio: DBE, Incentive spirometry · Physio (BD): PWB mobilization with walker; QSE, Ankle pumps · O2 @ 2L/min", hand: true },
    ],
  },
  242: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 101 of 134" },
      { t: "kv", rid: "p242-orders", k: "Doctor's orders 16/7/26, 7 am (POD 5)", v: "Inj. AUGMENTIN 1.2g IV Q12H (D6) · Inj. TRAMADOL 50mg/100ml NS IV Q12H · Inj. FINAMAC 1g IV Q12H · Inj. EMESET 4mg IV 30 mins before TRAMADOL · T. PAN 40 1-0-0 (B/F) · T. CHYMORAL BR 1-0-1 · T. ROZAVEL 5 0-0-1 · T. STAMLO 5 1-0-0", hand: true },
    ],
  },
  243: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 102 of 134" },
      { t: "kv", rid: "p243-orders", k: "Doctor's orders 16/7/26 (continued)", v: "T. GLIMY M1 1-0-1 · T. EVION 0-1-0 · Inj. CLEXANE 0.4ml s/c OD · Inj. H. ACTRAPID (0) - () - () s/c 30 mins B/F · G. MOSI 1-1-1-1 B/E (D6/D14) · G. JUST TEARS 1-1-1-1 B/E (D6/D14) · NEB. DUOLIN Q8H · NEB. BUDECORT Q12H", hand: true },
    ],
  },
  244: {
    docId: "D67",
    blocks: [
      { t: "head", title: "Doctor's orders: medications and treatment chart (9 to 16 Jul)", sub: "File 6: Inpatient case file · page 103 of 134" },
      { t: "kv", rid: "p244-orders", k: "Doctor's orders 16/7/26 (continued)", v: "T. LIMCEE 500 1-0-1 · Monitor vitals BP Q6H, W/F soakage, inform SOS · Abduction pillow · Chest physio: DBE, Incentive spirometry · Physio (BD): PWB mobilization with walker; QSE, Ankle pumps · O2 @ 2L/min", hand: true },
    ],
  },
  246: {
    docId: "D68",
    blocks: [
      { t: "head", title: "Physiotherapy record", sub: "File 6: Inpatient case file · page 105 of 134" },
      { t: "kv", rid: "p246-physio-10", k: "Physiotherapy record 14/7/26", v: "Deep breathing exercises · Incentive spirometry · Static quads · ATM · PWB ambulation with walker · SpO2 - 90 · HR - 85 · Pt is stable post Rx", hand: true },
      { t: "kv", rid: "p246-physio-9", k: "Physiotherapy record 13/07/26 (POD 2)", v: "PT Rx: Deep breathing Ex · Incentive Spirometry (900 cc/sec) · static Quads · Ankle toe movements · pt was made to stand with walker · PWB ambulation with walker", hand: true },
    ],
  },
  247: {
    docId: "D68",
    blocks: [
      { t: "head", title: "Physiotherapy record", sub: "File 6: Inpatient case file · page 106 of 134" },
      { t: "kv", rid: "p247-physio-11", k: "Physiotherapy record 15/7/26 and 16/7/26", v: "15/7/26: ATM · static quads · Heel slides · SLR · EOB sitting · Ambulation with walker · 16/7/26: ATM · Heel slides · SLR · Ambulation · EOB sitting · Static quads", hand: true },
    ],
  },
  248: {
    docId: "D68",
    blocks: [
      { t: "head", title: "Physiotherapy record", sub: "File 6: Inpatient case file · page 107 of 134" },
      { t: "kv", rid: "p248-physio-pre", k: "Physiotherapy record 10/07/26 and 11/07/26", v: "10/07/26: Incentive Spirometry (Attempted) · Deep breathing exercises · 11/07/26: Incentive Spirometer · Deep breathing Exs", hand: true },
    ],
  },
  250: {
    docId: "D69",
    blocks: [
      { t: "head", title: "Pre-anaesthetic record", sub: "File 6: Inpatient case file · page 109 of 134" },
      { t: "kv", rid: "p250-airway", k: "Airway Examination", v: "Teeth: edentulous · hollow cheeks, short neck · Denture: (-) · Mouth opening: > 6 cm · Thyromental distance: 6 cm · Neck movements: not assessed · BHT < 8 sec · Mallampati: Class 3 (circled)", hand: true },
      { t: "kv", rid: "p250-allergy", k: "Allergies / Smoking / Alcohol", v: "(-) bracketed against all three", hand: true },
      { t: "kv", rid: "p250-drug-therapy", k: "Drug therapy (pre-anaesthetic record)", v: "T. ROSUVASTATIN 5 0-0-1 · T. AMLODIPINE 5mg 1-0-0 · T. GLIMEPRIDE 1 METFORMIN 500 1-0-1 · T. TELMISARTAN 40mg 1-0-1 · INJ. CLEXANE 0.4 s/c OD", hand: true },
      { t: "kv", rid: "p250-efast", k: "Pre-anaesthetic record (bedside checks)", v: "CCT / PCT - WNL · lung sliding (+ve) · eFAST - (-ve)", hand: true },
      { t: "kv", rid: "p250-history", k: "History", v: "A/H/O slip & fall in steps @ home on 10/7/26 sustaining injury to (L) hip. Comorb: T2DM 18 yrs - on OHAs - compliant · HTN 18 yrs, compliant · ? MASLD · prev H/o SCC - skin (R) upper gluteal region s/p WLE (2016) margin free · recent URTI/LRTI: fever 2 weeks ago, Rx outside, symp free 1 wk · chest pain / orthopnea / PND / SOB: NIL · walk with support x 2 yrs · ADL +", hand: true },
      { t: "kv", rid: "p250-physical-exam", k: "Physical exam (pre-anaesthetic record)", v: "anxious · Pulse 86/min · BP 163/84 · RR 29/min, increased effort · Temp afebrile · SpO2 93% on 4 L O2 · GRBS 122 · Weight ~61 kg · Veins accessible · Spine: midline spaces not felt · CVS S1S2 · RS NVBS + · CNS HMF (N) · PA soft · under added cardiac risk", hand: true },
    ],
  },
  251: {
    docId: "D69",
    blocks: [
      { t: "head", title: "Pre-anaesthetic record", sub: "File 6: Inpatient case file · page 110 of 134" },
      { t: "kv", rid: "p251-cxr", k: "CXR (pre-anaesthetic record)", v: "sketch of both lungs with the left lung shaded · CP angle free", hand: true },
      { t: "kv", rid: "p251-ecg", k: "ECG (pre-anaesthetic record)", v: "(N) SR rate 81 · no ST-T · PR / QTc WNL", hand: true },
      { t: "kv", rid: "p251-echo", k: "Echo (pre-anaesthetic record; 9/7/26)", v: "EF 65% · (N) BV sys func · no RWMA · MAC (+) · mild MR · LVH (+) · mild LVDD · TR (+) · no PAH", hand: true },
      { t: "kv", rid: "p251-fbs", k: "Immediate preoperative re-evaluation 11/7/26", v: "Heart rate 82 /min · Blood pressure 146/80 mmHg · NPO status, investigation reports: checked · FBS (39, circled) -> GRBS -> 103", hand: true },
      { t: "kv", rid: "p251-investigations", k: "Investigations (pre-anaesthetic record, 9/7/26)", v: "Hb 12.0 · Hct 38.5 % · Plt 157K · WBC 12.8K · urea 14 · creat 0.50 · Na 137 · K 3.7 · Cl 93.0 · PT 10.7 · INR 1.01 · aPTT 25.6 · Sero NR · HbA1c 6.1 · RBS 170 · TSH 1.08 · AST 37, ALT 37.4, ALP 107 (an upward arrow is drawn beside these three) · D-dimer 2.3 · CRP 4.9 · Trop T 0.008", hand: true },
      { t: "kv", rid: "p251-plan", k: "Anaesthetic Plan and preoperative instructions", v: "under SAB / GA ± Block · T. PANTAPRAZOLE 40mg HS & 6 AM · To cont all medication as per schedule · Pulmonology clearance -> will be reviewed in the morning prior procedure (i/v/o decreased SpO2, raised RR, CXR changes) · High risk informed consent · NPO: Solids 8 hrs, Clear fluids 2 hr · Arrange blood products: adequately · Investigations required: FBS · To W/H Antidiabetic medication · IVF with neutralising dose of Insulin in DNS as per Medicine order · Neb. Duolin, Budecort: HS & 30 mins prior procedure", hand: true },
    ],
  },
  254: {
    docId: "D70",
    blocks: [
      { t: "head", title: "Anaesthesia consent forms (including high-risk anaesthesia consent)", sub: "File 6: Inpatient case file · page 113 of 134" },
      { t: "kv", rid: "p254-high-risk", k: "High-risk anaesthesia informed consent (typed, July 11, 2026)", v: "Patient is scheduled for Bipolar Arthroplasty - Hip (Right NOF fracture) under Subarachnoid Block (SAB) / General Anaesthesia (GA) +/- Peripheral Nerve Block.... Left Neck of Femur (NOF) fracture s/p slip and fall, long-standing Type 2 Diabetes Mellitus (18 years), Hypertension (18 years), suspected MASLD, history of skin SCC (Right-upper gluteal region s/p WLE 2016), hypoxia/desaturation on room air (SpO2 85% on room air, requiring supplemental O2), elevated D-dimer (2.3 µg/mL), pulmonology evaluation for suspected Pulmonary Thromboembolism (PTE), short neck, edentulous jaw, and echocardiographic findings of EF 65%, mild MR, mild TR, LVH, and mild LVDD", hand: true },
    ],
  },
  257: {
    docId: "D71",
    blocks: [
      { t: "head", title: "Anaesthetic record", sub: "File 6: Inpatient case file · page 116 of 134" },
      { t: "kv", rid: "p257-antibiotic", k: "ANTIBIOTIC GIVEN (anaesthetic record, 11/7/26)", v: "I/V AUGMENT 1.2g @ 1:45 pm · I/V TEICOPLANIN 400mg @ 3:15 pm", hand: true },
      { t: "kv", rid: "p257-record", k: "Anaesthetic record 11/7/26", v: "Surgical Procedure: (L) Hip - bipolar Arthroplasty · under SAB + (L) femoral + (L) LFCN block · Regional box ticked, General box also marked · Elective · Anaesthesia: start 1:15 pm, finish 4:30 PM · Surgery: start 1:45 pm, finish 4:25 PM · O2 by face mask, spontaneous breathing · SpO2 94, 90, 90, 94, 94, 94, 94 % · Blood loss: 500 ml · Position: Lateral - (R) lateral · Pressure points padded · forced air warmer", hand: true },
    ],
  },
  259: {
    docId: "D72",
    blocks: [
      { t: "head", title: "Blood gas printout (11 Jul)", sub: "File 6: Inpatient case file · page 118 of 134" },
      { t: "kv", rid: "p259-abg", k: "Blood gas printout 11/07/2026 13:26:53, arterial (handwritten: Room Air, SpO2 86%)", v: "#pH 7.48 · pCO2 38 mmHg · #pO2 48 mmHg · #Na+ 133 mmol/L · #K+ 3.2 mmol/L · #Ca++ 1.01 mmol/L · Glu 70 mg/dL · Lac 12 mg/dL · Hct 42 % · Ca++(7.4) 1.07 mmol/L · HCO3- 27.4 mmol/L · HCO3std 29.0 mmol/L · TCO2 28.8 mmol/L · BEecf 4.9 mmol/L · BE(B) 4.6 mmol/L · SO2c 87 % · THbc 11.9 g/dL · # = outside ref. range", hand: false },
    ],
  },
  260: {
    docId: "D73",
    blocks: [
      { t: "head", title: "Anaesthetic record (continued), regional anaesthesia and post-anaesthetic record", sub: "File 6: Inpatient case file · page 119 of 134" },
      { t: "kv", rid: "p260-fluids", k: "Anaesthetic record (page 2)", v: "under SAB + block · Face mask · Ventilation: Spontaneous · IV fluids: DNS, NS, RL", hand: true },
    ],
  },
  261: {
    docId: "D73",
    blocks: [
      { t: "head", title: "Anaesthetic record (continued), regional anaesthesia and post-anaesthetic record", sub: "File 6: Inpatient case file · page 120 of 134" },
      { t: "kv", rid: "p261-regional", k: "REGIONAL ANAESTHESIA", v: "Technique: subarachnoid block · Position: sitting · Approach: midline · Space: L3-L4 · Needle type: 23G Quincke Babcock's needle · Drug injected/Dose: 2.2 ml of 0.5% Heavy bupivacaine + 30 mcg of clonidine · Adequacy of block: Adequate · (L) femoral + (L) LFCN block under USG guidance: 10 ml of 0.5% levobupivacaine + 10 ml of 2% lignoadrenaline + 4 mg dexamethasone - adequate analgesia", hand: true },
    ],
  },
  262: {
    docId: "D73",
    blocks: [
      { t: "head", title: "Anaesthetic record (continued), regional anaesthesia and post-anaesthetic record", sub: "File 6: Inpatient case file · page 121 of 134" },
      { t: "kv", rid: "p262-post-anaesthesia", k: "Postanaesthetic record (11/7/26)", v: "Unplanned mechanical ventilation: NO · Adverse anaesthetic events: NO · Shifted to: HDU · BP 143/73 mmHg · Pulse 82/min · SpO2 95% on 6 L/min 100% O2 · PONV (-) · Reflexes (+) · Level of consciousness: Awake · As per HDU", hand: true },
    ],
  },
  265: {
    docId: "D73",
    blocks: [
      { t: "head", title: "Anaesthetic record (continued), regional anaesthesia and post-anaesthetic record", sub: "File 6: Inpatient case file · page 124 of 134" },
      { t: "kv", rid: "p265-ct-note", k: "Loose note in the anaesthesia section", v: "CT Brain -> chronic small vessel isch. changes · C spine -> no TBI / bleed", hand: true },
    ],
  },
  268: {
    docId: "D75",
    blocks: [
      { t: "head", title: "Operation report", sub: "File 6: Inpatient case file · page 127 of 134" },
      { t: "kv", rid: "p268-anaesthesia", k: "Operation report", v: "Elective · Surgery Start Date 11/07/2026 · Start Time 14:00 · End Time 16:00 · Duration 02:00 hrs · Anaesthesia: Block + Spinal · Position of Patient: Right lateral decubitus", hand: false },
      { t: "kv", rid: "p268-drug", k: "Drug / Dosage (operation report)", v: "Inj Augmentin 1.2g IV · Inj Teiconin 400mg IV", hand: false },
      { t: "kv", rid: "p268-incision", k: "Skin Incision including length", v: "", hand: false },
      { t: "kv", rid: "p268-indication", k: "Operation / Indications", v: "Left Hip Bipolar Hemiarthroplasty (cemented) · Closed Left Neck of Femur fracture", hand: false },
      { t: "kv", rid: "p268-steps", k: "Steps of Surgery (page 1)", v: "Patient was positioned in right lateral decubitus, parts were painted and draped. Short external rotators and piriformis tendon were both incised near their attachment and reflected backwards to protect the sciatic nerve. Capsule was incised. Fractured femoral head was extracted after cutting the ligamentum teres using cork screw.", hand: false },
    ],
  },
  269: {
    docId: "D75",
    blocks: [
      { t: "head", title: "Operation report", sub: "File 6: Inpatient case file · page 128 of 134" },
      { t: "kv", rid: "p269-closure", k: "Counts, blood loss and wound closure", v: "Sponge Count Verified: Yes · Gauze Count Verified: Yes · Instrument Count Verified: Yes · Wound Wash: NS · Approximate Blood Loss: 200ml · Muscle Level: No. 1 Vicryl · Deep Facia: Stratafix · Subcutaneous level: Vicryl 1-0 · Skin: Staples", hand: false },
      { t: "kv", rid: "p269-implant-labels", k: "Implant sticker labels", v: "Four manufacturer labels: cemented femoral stem size 8, self centering bi-polar head 28 mm ID 43 mm OD, femoral head 28 mm +1.5, gentamicin bone cement 40 g", hand: false },
      { t: "kv", rid: "p269-implants", k: "Implant Details (with the implant sticker labels)", v: "CORAIL Hip system cemented Femoral stem 12/14 AMT 135° size 8 standard no collar · Aqurate cement stopper diameter 40mm UHMWPE · Self centering Bipolar head 28mm ID 43mm OD · ARTICUL/EZE Femoral head 28mm +1.5 12/14 taper · SmartSet GHV Gentamicin bone cement 40g · Special Equipment: Power Instruments", hand: false },
      { t: "kv", rid: "p269-steps", k: "Steps of Surgery (page 2)", v: "a head size of 28mm was chosen. Broaching was done on femur serially from small to larger size (till 9 size) keeping anteversion ~15 degree. Trial implants were placed; head reduced and hip range of movements assessed. Cement stopper (40mm) was inserted in the femoral canal. A cemented femoral stem (size 8) inserted in approximately 15 degrees of anteversion. Irrigation done, hemostasis achieved and drain placed. Capsular layer sutured with vicryl no.1, short external rotators sutured through transosseously with GT. Deep fascia closed with Stratafix and subcutaneus closure done with Vicryl 1-0. Skin closed with stratafix. Above knee compression & knee immobilizer were applied and patient shifted out with stable vitals", hand: false },
    ],
  },
  270: {
    docId: "D76",
    blocks: [
      { t: "head", title: "Surgical safety checklist", sub: "File 6: Inpatient case file · page 129 of 134" },
      { t: "kv", rid: "p270-airway", k: "Surgical safety checklist, sign in (11/07/2026)", v: "DIFFICULT AIRWAY/ASPIRATION RISK? YES, AND EQUIPMENT/ASSISTANCE AVAILABLE (ticked) · RISK OF >500ML BLOOD LOSS? YES, AND ADEQUATE INTRAVENOUS ACCESS AND FLUIDS PLANNED (ticked) · Antibiotic prophylaxis given within the last 60 minutes: YES", hand: true },
      { t: "kv", rid: "p270-allergy", k: "DOES PATIENT HAVE A: KNOWN ALLERGY?", v: "NO (ticked) · surgical safety checklist, sign in, 11/07/2026", hand: true },
    ],
  },
};

// cite = { page, rid } is where the value was read. also = other places that
// say the same thing. hold = too unclear to show a doctor before review.
// role is the part a fact plays in the story of the file:
//   DX    final | working | secondary | chronic
//   PROC  procedure | pastSurgery
//   MED   discharge | home | inHospital          (OPD files use: prescribed)
//   VIT   last | interim
//   RPT   complaint | course | conditionAtDischarge | dischargeDate | followUp | hospitalMeds
//         | investigation | alert | anaesthesia | detail
// quals is the one bracket after a name: (Suspected, Working dx, 12 Mar'26).
const findings = [
  { id: "dx1", domain: "DX", encounterId: "E1", role: "final", title: "Closed left neck of femur fracture", detail: "Final diagnosis · after a slip and fall at home on 09/07/26", dateLabel: "9 Jul 2026", verbatim: "Diagnosis - Closed left neck of femur fracture", coding: "ICD-10 S72.0 (handwritten in the margin of the admission record)", cite: { page: 164, rid: "p164-final-dx" }, also: [{ page: 144, rid: "p144-admission-dx" }, { page: 178, rid: "p178-impression" }, { page: 183, rid: "p183-provisional" }, { page: 268, rid: "p268-indication" }, { page: 144, rid: "p144-codes" }, { page: 3, rid: "p3-dx" }, { page: 1, rid: "p1-dx" }, { page: 12, rid: "p12-impression" }, { page: 12, rid: "p12-xray-findings" }, { page: 18, rid: "p18-prov-dx" }, { page: 47, rid: "p47-prov-dx" }, { page: 33, rid: "p33-admitted-for" }, { page: 34, rid: "p34-request" }, { page: 38, rid: "p38-reply" }, { page: 46, rid: "p46-reply" }, { page: 141, rid: "p141-dx" }, { page: 58, rid: "p58-dx" }, { page: 86, rid: "p86-complaint" }, { page: 94, rid: "p94-dx" }, { page: 117, rid: "p117-dx" }], confidence: 0.96, handwritten: false, flags: [], quals: ["Final dx", "09 Jul'26"] },
  { id: "dx2", domain: "DX", encounterId: "E1", role: "working", title: "Volume overload or basal atelectasis", detail: "Working diagnosis · suspected, written with a question mark by Pulmonology at the review for oxygen saturation drop", dateLabel: "14 Jul 2026", verbatim: "? Volume overload / Basal atelectasis", cite: { page: 42, rid: "p42-imp" }, also: [{ page: 43, rid: "p43-ctpa" }, { page: 196, rid: "p196-review" }], confidence: 0.7, handwritten: true, flags: ["suspected"], quals: [{ v: "Suspected", tone: "warning" }, "Working dx", "14 Jul'26"] },
  { id: "dx3", domain: "DX", encounterId: "E2", role: "working", title: "Intertrochanteric fracture, left", detail: "Working diagnosis · suspected, written with a question mark as the ED provisional diagnosis beside '? NOF #'; the Orthopaedics impression on the same day is femur neck fracture", dateLabel: "9 Jul 2026", verbatim: "Provisional Diagnosis: ? IT # (L).  ? NOF #", cite: { page: 18, rid: "p18-prov-dx" }, confidence: 0.8, handwritten: true, flags: ["suspected"], quals: [{ v: "Suspected", tone: "warning" }, "Working dx", "09 Jul'26"] },
  { id: "dx4", domain: "DX", encounterId: "E3", role: "working", title: "Left lower lobe pneumonia", detail: "Working diagnosis · provisional diagnosis on the Medicine plan of care, written as (L) LL pneumonia", dateLabel: "16 Jan 2026", verbatim: "Provisional Diagnosis: (L) LL pneumonia", cite: { page: 49, rid: "p49-prov-dx" }, confidence: 0.85, handwritten: true, flags: [], quals: ["Working dx", "16 Jan'26"] },
  { id: "dx5", domain: "DX", encounterId: "E4", role: "working", title: "Lower respiratory tract infection (LRTI)", detail: "Working diagnosis · provisional diagnosis on the ED non-trauma record", dateLabel: "16 Jan 2026", verbatim: "Provisional Diagnosis: LRTI", cite: { page: 30, rid: "p30-prov-dx" }, confidence: 0.8, handwritten: true, flags: [], quals: ["Working dx", "16 Jan'26"] },
  { id: "dx6", domain: "DX", encounterId: "E1", role: "secondary", title: "Acute bronchitis", detail: "Secondary diagnosis · listed in the final diagnosis and in past history · the medicine note dates it to Jan 2026", dateLabel: "Jan 2026", verbatim: "T2DM,HTN,Acute Bronchitis, SCC right gluteal skin s/p WLE(2016)", coding: "ICD-10 J20.9 (handwritten in the margin of the admission record)", cite: { page: 164, rid: "p164-final-comorbid" }, also: [{ page: 144, rid: "p144-secondary-dx" }, { page: 164, rid: "p164-past" }, { page: 174, rid: "p174-past-history" }, { page: 188, rid: "p188-diagnosis" }, { page: 144, rid: "p144-codes" }, { page: 16, rid: "p16-past" }, { page: 34, rid: "p34-reply-dx" }, { page: 46, rid: "p46-reply" }], confidence: 0.9, handwritten: false, flags: ["conflict"], conflictWith: { text: "Acute bronchitis (in Jan 2026)", page: 188, rid: "p188-diagnosis" }, quals: ["Secondary", "Jan'26"] },
  { id: "dx7", domain: "DX", encounterId: "E1", role: "secondary", title: "MASLD (metabolic dysfunction-associated steatotic liver disease)", detail: "Secondary diagnosis · suspected, written with a question mark", dateLabel: "9 Jul 2026", verbatim: "& ? MASLD", cite: { page: 188, rid: "p188-diagnosis" }, also: [{ page: 250, rid: "p250-history" }, { page: 254, rid: "p254-high-risk" }, { page: 34, rid: "p34-reply-dx" }], confidence: 0.8, handwritten: true, flags: ["suspected"], quals: [{ v: "Suspected", tone: "warning" }, "Secondary", "09 Jul'26"] },
  { id: "dx8", domain: "DX", encounterId: "E1", role: "secondary", title: "Acute bacterial conjunctivitis, both eyes", detail: "Secondary diagnosis · Ophthalmology impression at the bedside", dateLabel: "10 Jul 2026", verbatim: "Imp: Acute Bacterial conjunctivitis", cite: { page: 35, rid: "p35-imp" }, also: [{ page: 36, rid: "p36-findings" }, { page: 195, rid: "p195-impression" }, { page: 164, rid: "p164-subconsult" }], confidence: 0.8, handwritten: true, flags: [], quals: ["Secondary", "10 Jul'26"] },
  { id: "dx9", domain: "DX", encounterId: "E1", role: "secondary", title: "Bedsore over right gluteal region", detail: "Secondary diagnosis · present at discharge, coloplast patch applied", dateLabel: "16 Jul 2026", verbatim: "Bedsore present over right gluteal region- coloplast patch applied", cite: { page: 166, rid: "p166-condition" }, also: [{ page: 214, rid: "p214-pressure-ulcer" }, { page: 238, rid: "p238-coloplast" }, { page: 126, rid: "p126-sore" }, { page: 127, rid: "p127-sore" }, { page: 68, rid: "p68-skin" }, { page: 67, rid: "p67-blister" }, { page: 83, rid: "p83-coloplast" }], confidence: 0.95, handwritten: false, flags: [], quals: ["Secondary", "16 Jul'26"] },
  { id: "dx10", domain: "DX", encounterId: "E1", role: "chronic", title: "Type 2 diabetes mellitus", detail: "Secondary diagnosis · 18 yrs, on OHAs", dateLabel: "Past history", verbatim: "T2DM,HTN,Acute Bronchitis, SCC right gluteal skin s/p WLE(2016)", coding: "ICD-10 E11.9 (handwritten in the margin of the admission record)", cite: { page: 164, rid: "p164-final-comorbid" }, also: [{ page: 144, rid: "p144-secondary-dx" }, { page: 164, rid: "p164-past" }, { page: 171, rid: "p171-past-history" }, { page: 250, rid: "p250-history" }, { page: 144, rid: "p144-codes" }, { page: 19, rid: "p19-pmh-dm" }, { page: 16, rid: "p16-past" }, { page: 21, rid: "p21-kco" }, { page: 31, rid: "p31-comorbid" }, { page: 34, rid: "p34-reply-dx" }, { page: 34, rid: "p34-request" }, { page: 36, rid: "p36-dx" }, { page: 40, rid: "p40-request" }, { page: 94, rid: "p94-history" }, { page: 141, rid: "p141-plan" }, { page: 87, rid: "p87-med-4" }], confidence: 0.95, handwritten: false, flags: [], quals: ["18 yrs, on OHAs", "Past history"] },
  { id: "dx11", domain: "DX", encounterId: "E1", role: "chronic", title: "Hypertension", detail: "Secondary diagnosis · 18 yrs, on medicines", dateLabel: "Past history", verbatim: "T2DM,HTN,Acute Bronchitis, SCC right gluteal skin s/p WLE(2016)", coding: "ICD-10 I10 (handwritten in the margin of the admission record)", cite: { page: 164, rid: "p164-final-comorbid" }, also: [{ page: 144, rid: "p144-secondary-dx" }, { page: 164, rid: "p164-past" }, { page: 171, rid: "p171-past-history" }, { page: 250, rid: "p250-history" }, { page: 144, rid: "p144-codes" }, { page: 19, rid: "p19-pmh-htn" }, { page: 16, rid: "p16-past" }, { page: 21, rid: "p21-kco" }, { page: 31, rid: "p31-comorbid" }, { page: 34, rid: "p34-reply-dx" }, { page: 34, rid: "p34-request" }, { page: 36, rid: "p36-dx" }, { page: 40, rid: "p40-request" }, { page: 94, rid: "p94-history" }, { page: 141, rid: "p141-plan" }, { page: 87, rid: "p87-med-1" }], confidence: 0.95, handwritten: false, flags: [], quals: ["18 yrs, on medicines", "Past history"] },
  { id: "dx12", domain: "DX", encounterId: "E1", role: "chronic", title: "Squamous cell carcinoma, right gluteal skin, after wide local excision (2016)", detail: "Secondary diagnosis · s/p WLE (2016) · surgical oncology: well differentiated, margin free, no sign of local recurrence", dateLabel: "Past history", verbatim: "SCC right gluteal skin s/p WLE(2016)", coding: "ICD-10 C44.5 (handwritten in the margin of the admission record)", cite: { page: 164, rid: "p164-final-comorbid" }, also: [{ page: 144, rid: "p144-secondary-dx" }, { page: 164, rid: "p164-past" }, { page: 174, rid: "p174-past-history" }, { page: 187, rid: "p187-opinion" }, { page: 250, rid: "p250-history" }, { page: 144, rid: "p144-codes" }, { page: 16, rid: "p16-past" }, { page: 21, rid: "p21-scc" }, { page: 31, rid: "p31-past" }, { page: 37, rid: "p37-scc" }, { page: 34, rid: "p34-reply-dx" }, { page: 38, rid: "p38-request" }, { page: 46, rid: "p46-reply" }, { page: 94, rid: "p94-dx" }], confidence: 0.95, handwritten: false, flags: [], quals: ["s/p WLE (2016)", "Past history"] },
  { id: "alg1", domain: "ALG", encounterId: "E1", role: "allergy", negative: true, title: "No known drug allergy", label: "No known drug allergy", detail: "Known drug allergies ticked No on the nursing initial assessment. The handover sheets repeat no history of allergy.", dateLabel: "9 Jul 2026", verbatim: "Known Drug Allergies: No [x]  Yes [ ]", cite: { page: 86, rid: "p86-allergy" }, also: [{ page: 114, rid: "p114-allergy" }, { page: 116, rid: "p116-surgery" }, { page: 117, rid: "p117-dx" }, { page: 270, rid: "p270-allergy" }, { page: 210, rid: "p210-allergy" }, { page: 214, rid: "p214-allergy" }, { page: 250, rid: "p250-allergy" }], confidence: 0.93, handwritten: true, flags: [], verifyLabel: "Confirm none", rejectLabel: "Don't record", quals: ["Stated on 8 pages"] },
  { id: "alg2", domain: "ALG", encounterId: "E1", role: "allergy", negative: true, title: "No food allergy or intolerance", label: "No food allergy or intolerance", detail: "None is ticked on the nutritional assessment.", dateLabel: "10 Jul 2026", verbatim: "Food Allergy/Intolerance: [x] None  [ ] Yes (Specify)", cite: { page: 94, rid: "p94-food-allergy" }, confidence: 0.85, handwritten: true, flags: [], verifyLabel: "Confirm none", rejectLabel: "Don't record" },
  { id: "med1", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Augmentin 1000 mg Duo (amoxycillin 875 mg + clavulanate potassium 125 mg)", detail: "1-0-1 · 1 week · Tablet", dateLabel: "16 Jul 2026", verbatim: "AUGMENTIN 1000MG -DUO · Generic: AMOXYCILLIN 875 MG | CLAVULANATE POTASSIUM 125 MG · TABLET · 1 - 0 - 1 · 1 week", cite: { page: 166, rid: "p166-rx-augmentin" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med2", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Ultracet Semi 18.75 mg/162.5 mg (tramadol HCl 18.75 mg + paracetamol 162.5 mg)", detail: "1-0-1 · 1 week · Tablet", dateLabel: "16 Jul 2026", verbatim: "ULTRACET SEMI 18.75MG/162.5MG · Generic: TRAMADOL HCL 18.75MG | PARACETAMOL 162.5MG · TABLET · 1 - 0 - 1 · 1 week", cite: { page: 166, rid: "p166-rx-ultracet" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med3", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Gastrorid-DSR 40 mg/30 mg (pantoprazole 40 mg + domperidone 30 mg sustained release)", detail: "1-0-0 · 1 week · Tablet", dateLabel: "16 Jul 2026", verbatim: "GASTRORID-DSR(40MG/30MG) · Generic: PANTOPRAZOLE 40MG| DOMPERIDONE 30 MG SUSTAINED REL · TABLET · 1 - 0 - 0 · 1 week", cite: { page: 166, rid: "p166-rx-gastrorid" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med4", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Chymoral BR (trypsin-chymotrypsin with bromelain and rutoside)", detail: "1-0-1 · 3 days · Tablet", dateLabel: "16 Jul 2026", verbatim: "CHYMORAL BR TABLET · Generic: TRYPSIN - | CHYMOTRYPSIN WITH BROMELIAN 0RUTOSIDE · TABLET · 1 - 0 - 1 · 3 days", cite: { page: 166, rid: "p166-rx-chymoral" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med5", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Pradaxa 110 mg (dabigatran etexilate mesilate 110 mg)", detail: "1-0-1 · 1 month · Capsule", dateLabel: "16 Jul 2026", verbatim: "PRADAXA 110MG CAPSULES · Generic: DABIGATRAN ETEXILATE MEXILATE 110MG · CAPSULE · 1 - 0 - 1 · 1 month", cite: { page: 166, rid: "p166-rx-pradaxa" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med6", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Ezorb D3+ (calcium aspartate 1120 mg, magnesium hydroxide)", detail: "0-1-0 · 1 month · Tablet", dateLabel: "16 Jul 2026", verbatim: "EZORB D3+ 15s STRIP TAB · Generic: calcium aspartate 1120mg,magnesium hydroxide 180 m · TABLET · 0 - 1 - 0 · 1 month", readerNote: "The generic line is cut off after 'magnesium hydroxide 180 m'", cite: { page: 166, rid: "p166-rx-ezorb" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med7", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Limcee chewable 500 mg (ascorbic acid 100 mg + sodium ascorbate 450 mg)", detail: "1-0-1 · 1 month · Tablet", dateLabel: "16 Jul 2026", verbatim: "LIMCEE CHEWABLE 500MG 15\"S STRIP · Generic: ASCORBIC ACID IP 100MG, SODIUM ASOCORBATE 450MG.EQ · TABLET · 1 - 0 - 1 · 1 month", cite: { page: 166, rid: "p166-rx-limcee" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med8", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "D3 Must 60K (cholecalciferol 60000 IU)", detail: "Once a week · 2 months · Tablet", dateLabel: "16 Jul 2026", verbatim: "D3MUST 60K TABLETS · Generic: CHOLECALCIFEROL 60000 IU · TABLET · Once a week · 2 months", cite: { page: 167, rid: "p167-rx-d3must" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med9", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Rozavel 5 mg (rosuvastatin calcium 5 mg)", detail: "0-0-1 · Continue · Tablet", dateLabel: "16 Jul 2026", verbatim: "ROZAVEL 5MG TABLET · Generic: ROSUVASTATIN CALCIUM 5MG · TABLET · 0 - 0 - 1 · Continue", cite: { page: 167, rid: "p167-rx-rozavel" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med10", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Stamlo 5 mg (amlodipine besylate 5 mg)", detail: "1-0-0 · Continue · form printed as Capsule", dateLabel: "16 Jul 2026", verbatim: "STAMLO 5 MG TABLET · Generic: AMLODIPINE BESYLATE 5 MG · CAPSULE · 1 - 0 - 0 · Continue", cite: { page: 167, rid: "p167-rx-stamlo" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med11", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Glimy-M1 (glimepiride 1 mg + metformin HCl 500 mg sustained release)", detail: "1-0-1 · Continue · Tablet", dateLabel: "16 Jul 2026", verbatim: "GLIMY -M1TABLET · Generic: GLIMEPIRIDE 1 MG | METFORMIN HCL 500MG SUSTAINED R · TABLET · 1 - 0 - 1 · Continue", cite: { page: 167, rid: "p167-rx-glimy" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med12", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Evion 400 (vitamin E 400 mg)", detail: "Continue · Capsule", dateLabel: "16 Jul 2026", verbatim: "EVION 400 CAPSULES · Generic: VIT E 400 MG · CAPSULE · [frequency blank] · Continue", readerNote: "The frequency cell is blank on the discharge list", cite: { page: 167, rid: "p167-rx-evion" }, confidence: 0.95, handwritten: false, flags: ["partlyRead"] },
  { id: "med13", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Mosi eye drops (moxifloxacin ophthalmic solution 0.5%)", detail: "1-1-1-1 · Both eyes · 1 week · Drops", dateLabel: "16 Jul 2026", verbatim: "MOSI (EYE DROPS) · Generic: MOXIFLOXACIN OPHTHALMIC SOL 0.5% · DROPS · 1 - 1 - 1 - 1 Both eyes · 1 week", cite: { page: 167, rid: "p167-rx-mosi" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med14", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Just Tears eye drops 10 ml (carboxymethyl cellulose 0.5%)", detail: "1-1-1-1 · Both eyes · 1 week · Solution", dateLabel: "16 Jul 2026", verbatim: "JUST TEARS EYE DROPS 10ML · Generic: CARBOXY METHYL CELLULOSE 0.5% · SOLUTION · 1 - 1 - 1 - 1 Both eyes · 1 week", cite: { page: 167, rid: "p167-rx-justtears" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med15", domain: "MED", encounterId: "E1", role: "discharge", group: "On discharge (16 Jul'26)", title: "Tegaderm with pad 9 cm x 35 cm (transparent adhesive dressing)", detail: "5 nos · Dressing", dateLabel: "16 Jul 2026", verbatim: "TEGADERM WITH PAD8593 9CMX35CM · Generic: TRANSPARENT ADHESIVE DRESSING · DRESSING · 5 nos", cite: { page: 167, rid: "p167-rx-tegaderm" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "med16", domain: "MED", encounterId: "E1", role: "home", group: "At home", title: "Evion", detail: "0-1-0 · last dose 8/7/26 at 2pm", dateLabel: "9 Jul 2026", verbatim: "T. Evion  (dose blank)  0-1-0  8/7/26 at 2pm", readerNote: "No dose written. Name read as Evion", cite: { page: 87, rid: "p87-med-3" }, confidence: 0.7, handwritten: true, flags: [] },
  { id: "med17", domain: "MED", encounterId: "E1", role: "home", group: "At home", title: "Rozavel 5 (rosuvastatin 5 mg)", detail: "0-0-1", dateLabel: "9 Jul 2026", verbatim: "T. Rozavel 5  0-0-1", cite: { page: 189, rid: "p189-on-rx" }, also: [{ page: 250, rid: "p250-drug-therapy" }, { page: 190, rid: "p190-on-rx" }, { page: 33, rid: "p33-rx-1" }, { page: 46, rid: "p46-rx" }, { page: 42, rid: "p42-rx" }, { page: 87, rid: "p87-med-2" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "med18", domain: "MED", encounterId: "E1", role: "home", group: "At home", title: "Stamlo 5 (amlodipine 5 mg)", detail: "1-0-0", dateLabel: "9 Jul 2026", verbatim: "T. Stamlo 5  1-0-0", cite: { page: 189, rid: "p189-on-rx" }, also: [{ page: 250, rid: "p250-drug-therapy" }, { page: 190, rid: "p190-on-rx" }, { page: 33, rid: "p33-rx-2" }, { page: 46, rid: "p46-rx" }, { page: 42, rid: "p42-rx" }, { page: 87, rid: "p87-med-1" }, { page: 72, rid: "p72-withheld" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "med19", domain: "MED", encounterId: "E1", role: "home", group: "At home", title: "Glimy M1 (glimepiride 1 mg + metformin 500 mg)", detail: "1-0-1", dateLabel: "9 Jul 2026", verbatim: "T. Glimy M1  1-0-1", cite: { page: 189, rid: "p189-on-rx" }, also: [{ page: 250, rid: "p250-drug-therapy" }, { page: 190, rid: "p190-on-rx" }, { page: 33, rid: "p33-rx-3" }, { page: 46, rid: "p46-rx" }, { page: 42, rid: "p42-rx" }, { page: 33, rid: "p33-advice" }, { page: 87, rid: "p87-med-4" }, { page: 72, rid: "p72-withheld" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "med20", domain: "MED", encounterId: "E1", role: "home", group: "At home", title: "Telma 40 (telmisartan 40 mg)", detail: "1-0-1 · listed as a current medicine by medicine and anaesthesia; not on the in-hospital orders and not on the discharge list", dateLabel: "9 Jul 2026", verbatim: "T. Telma 40  1-0-1", cite: { page: 189, rid: "p189-on-rx" }, also: [{ page: 250, rid: "p250-drug-therapy" }, { page: 33, rid: "p33-rx-4" }], confidence: 0.85, handwritten: true, flags: ["conflict"], conflictWith: { text: "The discharge drug list has no telmisartan; Stamlo 5 mg is the only blood pressure medicine on it", page: 167, rid: "p167-rx-stamlo" } },
  { id: "med21", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "Tramadol 50 mg injection", detail: "50 mg in 100 ml NS · Q12H · IV · alternating with paracetamol (PCM / Finamac) 1 g IV Q12H · 9 to 16 Jul", dateLabel: "9 to 16 Jul 2026", verbatim: "Inj. TRAMADOL 50mg/100ml NS IV Q12H", cite: { page: 216, rid: "p216-orders" }, also: [{ page: 224, rid: "p224-postop" }, { page: 226, rid: "p226-orders" }, { page: 232, rid: "p232-orders" }, { page: 234, rid: "p234-orders" }, { page: 238, rid: "p238-orders" }, { page: 242, rid: "p242-orders" }, { page: 1, rid: "p1-inf-3" }, { page: 42, rid: "p42-rx-tramadol" }, { page: 55, rid: "p55-tramadol" }, { page: 54, rid: "p54-iv" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "med22", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "Clexane 0.4 ml injection (enoxaparin)", detail: "0.4 ml · OD · SC · started 9 Jul, withheld 10 Jul before surgery, given again 12 to 16 Jul", dateLabel: "9 to 16 Jul 2026", verbatim: "Inj. CLEXANE 0.4ml s/c OD", cite: { page: 217, rid: "p217-orders" }, also: [{ page: 220, rid: "p220-orders" }, { page: 227, rid: "p227-orders" }, { page: 233, rid: "p233-orders" }, { page: 235, rid: "p235-orders" }, { page: 239, rid: "p239-orders" }, { page: 243, rid: "p243-orders" }, { page: 250, rid: "p250-drug-therapy" }, { page: 42, rid: "p42-rx-clexane" }, { page: 46, rid: "p46-rx" }, { page: 73, rid: "p73-clexane" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "med23", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "Budecort nebulisation (budesonide) with Duolin nebulisation", detail: "Budecort Q12H · Duolin Q8H · nebulised · 2 cycles in emergency on 9 Jul, then regular from 12 to 16 Jul on pulmonology advice", dateLabel: "9 to 16 Jul 2026", verbatim: "NEB. DUOLIN Q8H · NEB. BUDECORT Q12H", cite: { page: 228, rid: "p228-orders" }, also: [{ page: 171, rid: "p171-treatment" }, { page: 193, rid: "p193-review" }, { page: 233, rid: "p233-orders" }, { page: 235, rid: "p235-orders" }, { page: 239, rid: "p239-orders" }, { page: 243, rid: "p243-orders" }, { page: 43, rid: "p43-advice" }, { page: 42, rid: "p42-rx" }, { page: 69, rid: "p69-neb" }, { page: 64, rid: "p64-preop-meds" }, { page: 63, rid: "p63-neb" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "med24", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "G. Mosi (eye drops)", detail: "both eyes · 2 weeks", dateLabel: "10 Jul 2026", verbatim: "Adv: G MOSI [marks] } (BE) x 2 weeks", readerNote: "Eye drops, name as read. Frequency is drawn as tally marks and was not read as a number", cite: { page: 35, rid: "p35-adv" }, confidence: 0.65, handwritten: true, flags: ["partlyRead"] },
  { id: "med25", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "G. Eyemist (eye drops)", detail: "both eyes · 2 weeks", dateLabel: "10 Jul 2026", verbatim: "G EYEMIST [marks] } (BE) x 2 weeks", readerNote: "Eye drops, name as read. Frequency is drawn as tally marks and was not read as a number", cite: { page: 35, rid: "p35-adv" }, confidence: 0.65, handwritten: true, flags: ["partlyRead"] },
  { id: "med26", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "Human Actrapid injection (regular insulin)", detail: "12 Jul: 6-6-6 units · 13 Jul: 4-4-0 · 14 Jul: skip-4-6 · 15 Jul: 4-4-0 · 16 Jul: 0 · SC · also 8 U neutralising dose in IV DNS before surgery", dateLabel: "10 to 16 Jul 2026", verbatim: "Inj. H. ACTRAPID (6) u s/c - (6) - (6)", cite: { page: 228, rid: "p228-orders" }, also: [{ page: 222, rid: "p222-preop" }, { page: 233, rid: "p233-orders" }, { page: 235, rid: "p235-orders" }, { page: 239, rid: "p239-orders" }, { page: 243, rid: "p243-orders" }, { page: 189, rid: "p189-advice" }, { page: 33, rid: "p33-advice" }, { page: 122, rid: "p122-insulin" }, { page: 72, rid: "p72-actrapid" }, { page: 75, rid: "p75-grbs" }, { page: 76, rid: "p76-grbs" }, { page: 83, rid: "p83-grbs" }, { page: 123, rid: "p123-grbs" }], confidence: 0.82, handwritten: true, flags: [] },
  { id: "med27", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "Vancomycin 1 g (injection)", detail: "2 vials · sent to theatre with the patient · 11 Jul 2026 · 1 vial is listed again when the patient left theatre", dateLabel: "11 Jul 2026", verbatim: "Inj Vancomycin 1gm - 2 sent to OT ... & Inj Vanc 1g - 1", readerNote: "The pre-operative orders have a 1 g IV injection marked 2 whose name is hard to read. When it was given is not written in this file", cite: { page: 66, rid: "p66-abx" }, also: [{ page: 67, rid: "p67-ot" }, { page: 67, rid: "p67-surgery" }, { page: 222, rid: "p222-preop-last-line" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "med28", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "Augmentin 1.2 g injection (amoxycillin + clavulanate)", detail: "1.2 g · Q12H · 6 days (D1 on 11 Jul to D6 on 16 Jul) · IV · first dose 1:45 pm on the day of surgery", dateLabel: "11 to 16 Jul 2026", verbatim: "Inj AUGMENTIN 1.2g IV Q12H (D1)", readerNote: "Written as Advent on the nursing and ICU charts", cite: { page: 224, rid: "p224-postop" }, also: [{ page: 222, rid: "p222-preop" }, { page: 257, rid: "p257-antibiotic" }, { page: 268, rid: "p268-drug" }, { page: 226, rid: "p226-orders" }, { page: 232, rid: "p232-orders" }, { page: 234, rid: "p234-orders" }, { page: 238, rid: "p238-orders" }, { page: 242, rid: "p242-orders" }, { page: 1, rid: "p1-inf-2" }, { page: 42, rid: "p42-rx-augmentin" }, { page: 66, rid: "p66-abx" }, { page: 67, rid: "p67-ot" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "med29", domain: "MED", encounterId: "E1", role: "inHospital", group: "In hospital", title: "Teiconin 400 mg injection (teicoplanin)", detail: "400 mg · Q24H · 2 doses (D1 on 11 Jul, D2/2 on 12 Jul) · IV", dateLabel: "11 to 12 Jul 2026", verbatim: "Inj TEICONIN 400mg IV Q24H (D1/D2)", readerNote: "Read as Ticocin in the nurse's record", cite: { page: 224, rid: "p224-postop" }, also: [{ page: 222, rid: "p222-preop" }, { page: 257, rid: "p257-antibiotic" }, { page: 268, rid: "p268-drug" }, { page: 226, rid: "p226-orders" }, { page: 67, rid: "p67-ot" }, { page: 66, rid: "p66-abx" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "med30", domain: "MED", encounterId: "E2", role: "inHospital", group: "In hospital", title: "Inj. Hydrocort 100 mg", detail: "100 mg · stat · IV · given 9 Jul 2026, 4:00 PM in the ED", dateLabel: "9 Jul 2026", verbatim: "Inj. Hydrocort 100 mg IV stat", cite: { page: 19, rid: "p19-rx-hydrocort" }, also: [{ page: 8, rid: "p8-drug-4" }, { page: 171, rid: "p171-treatment" }], confidence: 0.9, handwritten: true, flags: [] },
  { id: "med31", domain: "MED", encounterId: "E2", role: "inHospital", group: "In hospital", title: "Neb. Budecort", detail: "1 resp · 2 cycles · inhalation · given 9 Jul 2026 at 4:15 PM and 4:50 PM in the ED", dateLabel: "9 Jul 2026", verbatim: "Neb Budecort 1 resp } 2 cycle", cite: { page: 19, rid: "p19-rx-neb" }, also: [{ page: 8, rid: "p8-drug-3" }, { page: 8, rid: "p8-drug-6" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "med32", domain: "MED", encounterId: "E2", role: "inHospital", group: "In hospital", title: "Neb. Duolin", detail: "1 resp · 2 cycles · inhalation · given 9 Jul 2026 at 4:00 PM and 4:25 PM in the ED", dateLabel: "9 Jul 2026", verbatim: "Neb Duolin 1 resp inhalation } 2 cycle", cite: { page: 19, rid: "p19-rx-neb" }, also: [{ page: 8, rid: "p8-drug-2" }, { page: 8, rid: "p8-drug-5" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "med33", domain: "MED", encounterId: "E2", role: "inHospital", group: "In hospital", title: "Inj. Finamac 1 g", detail: "1 g · IV · given 9 Jul 2026, 1:40 PM in the ED", dateLabel: "9 Jul 2026", verbatim: "(1) Inj. FINAMAC 1g IV", readerNote: "Name as read. The name is read as Finamac on two pages. The second letter could be E", cite: { page: 19, rid: "p19-rx-1" }, also: [{ page: 8, rid: "p8-drug-1" }], confidence: 0.6, handwritten: true, flags: ["ambiguous"] },
  { id: "proc1", domain: "PROC", encounterId: "E1", role: "procedure", title: "Left hip bipolar hemiarthroplasty (cemented)", detail: "11/07/2026 · Block + Spinal · Southern Moore approach · right lateral decubitus", dateLabel: "11 Jul 2026", verbatim: "Left Hip Bipolar Hemiarthroplasty (cemented)", cite: { page: 268, rid: "p268-indication" }, also: [{ page: 164, rid: "p164-final-treatment" }, { page: 165, rid: "p165-operative" }, { page: 144, rid: "p144-operative" }, { page: 268, rid: "p268-anaesthesia" }, { page: 268, rid: "p268-incision" }, { page: 1, rid: "p1-proc" }, { page: 47, rid: "p47-plan" }, { page: 33, rid: "p33-admitted-for" }, { page: 39, rid: "p39-planned" }, { page: 36, rid: "p36-request" }, { page: 40, rid: "p40-request" }, { page: 67, rid: "p67-surgery" }, { page: 141, rid: "p141-surgery" }, { page: 116, rid: "p116-surgery" }, { page: 117, rid: "p117-dx" }, { page: 94, rid: "p94-dx" }], confidence: 0.96, handwritten: false, flags: [], quals: ["11 Jul'26", "Block + Spinal", "Southern Moore approach"] },
  { id: "proc2", domain: "PROC", encounterId: "E2", role: "procedure", title: "Skin traction, left leg", detail: "9 Jul 2026, 4:35 PM · applied in the ED by the Orthopaedics resident", dateLabel: "9 Jul 2026", verbatim: "Skin traction Applied to left leg", cite: { page: 9, rid: "p9-proc-3" }, also: [{ page: 12, rid: "p12-plan" }], confidence: 0.88, handwritten: true, flags: [], quals: ["09 Jul'26"] },
  { id: "proc3", domain: "PROC", encounterId: "E2", role: "procedure", title: "Bladder catheterisation, 16 No. Foley's", detail: "9 Jul 2026, 5:40 PM · under aseptic technique · 550 ml urine drained by 6:15 PM", dateLabel: "9 Jul 2026", verbatim: "Bladder Catheterization done c 16 No Folleys under Aseptic technique", cite: { page: 9, rid: "p9-proc-4" }, also: [{ page: 5, rid: "p5-urine" }, { page: 125, rid: "p125-catheter" }, { page: 124, rid: "p124-catheter" }, { page: 81, rid: "p81-catheter" }, { page: 86, rid: "p86-catheter" }], confidence: 0.88, handwritten: true, flags: ["conflictingValue"], conflictWith: { text: "The maintenance bundle gives the date of insertion as 10/7/26", page: 124, rid: "p124-catheter" }, quals: ["09 Jul'26", "under aseptic technique"] },
  { id: "proc4", domain: "PROC", encounterId: "E1", role: "pastSurgery", title: "Wide local excision with primary closure, squamous cell carcinoma of right gluteal skin", detail: "2016", dateLabel: "2016", verbatim: "T2DM · HTN · SCC right gluteal skin s/p wide excision (2016) · Acute bronchitis", cite: { page: 164, rid: "p164-past" }, also: [{ page: 187, rid: "p187-opinion" }, { page: 174, rid: "p174-past-history" }, { page: 16, rid: "p16-past" }, { page: 21, rid: "p21-scc" }, { page: 37, rid: "p37-scc" }, { page: 34, rid: "p34-request" }, { page: 38, rid: "p38-request" }, { page: 94, rid: "p94-dx" }], confidence: 0.8, handwritten: false, flags: [], quals: ["Past surgery", "2016"] },
  { id: "lab1", domain: "LAB", encounterId: "E1", title: "D-dimer", value: "2.3", unit: "µg/mL", range: "", abnormal: "H", dateLabel: "10 Jul 2026", verbatim: "D-dimer -> 2.3 (circled); typed consent: elevated D-dimer (2.3 µg/mL)", cite: { page: 191, rid: "p191-ddimer" }, also: [{ page: 251, rid: "p251-investigations" }, { page: 254, rid: "p254-high-risk" }, { page: 45, rid: "p45-ddimer" }, { page: 44, rid: "p44-findings" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab2", domain: "LAB", encounterId: "E1", title: "Total leucocyte count (TLC)", value: "12.8", unit: "K", range: "", abnormal: "H", dateLabel: "9 Jul 2026", verbatim: "TLC 12.8 K (circled in the pulmonology note)", cite: { page: 198, rid: "p198-cbc" }, also: [{ page: 191, rid: "p191-labs" }, { page: 251, rid: "p251-investigations" }, { page: 189, rid: "p189-labs" }, { page: 45, rid: "p45-tlc" }, { page: 33, rid: "p33-tlc" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "lab3", domain: "LAB", encounterId: "E1", title: "Neutrophils", value: "93.0", unit: "%", range: "", abnormal: "H", dateLabel: "9 Jul 2026", verbatim: "DLC N 93.0 (circled as N = 93.0% in the pulmonology note)", cite: { page: 198, rid: "p198-cbc" }, also: [{ page: 191, rid: "p191-labs" }, { page: 189, rid: "p189-labs" }, { page: 45, rid: "p45-n" }, { page: 33, rid: "p33-n" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab4", domain: "LAB", encounterId: "E1", title: "ESR", value: "30", unit: "", range: "", abnormal: "H", dateLabel: "9 Jul 2026", verbatim: "ESR 30 (circled in the pulmonology note)", cite: { page: 198, rid: "p198-cbc" }, also: [{ page: 191, rid: "p191-labs" }, { page: 200, rid: "p200-labs" }, { page: 45, rid: "p45-esr" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "lab5", domain: "LAB", encounterId: "E1", title: "Fasting blood sugar (FBS)", value: "39", unit: "", range: "", abnormal: "L", dateLabel: "11 Jul 2026", verbatim: "FBS (39, circled) -> GRBS -> 103", cite: { page: 251, rid: "p251-fbs" }, also: [{ page: 196, rid: "p196-labs" }, { page: 42, rid: "p42-fbs" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab6", domain: "LAB", encounterId: "E1", title: "Arterial pH", value: "7.48", unit: "", range: "", abnormal: "H", dateLabel: "11 Jul 2026", series: [{ d: "10 Jul", v: "7.43" }, { d: "11 Jul", v: "7.48", f: "H" }], verbatim: "#pH 7.48 (marked outside ref. range)", cite: { page: 259, rid: "p259-abg" }, also: [{ page: 191, rid: "p191-abg" }, { page: 45, rid: "p45-abg" }], confidence: 0.93, handwritten: false, flags: ["conflictingValue"], conflictWith: { text: "Consultation records: Arterial pH 7.47", page: 45, rid: "p45-abg" } },
  { id: "lab7", domain: "LAB", encounterId: "E1", title: "Arterial pO2 (room air)", value: "48", unit: "mmHg", range: "", abnormal: "L", dateLabel: "11 Jul 2026", series: [{ d: "10 Jul", v: "40" }, { d: "11 Jul", v: "48", f: "L" }], verbatim: "#pO2 48 mmHg (marked outside ref. range; handwritten: Room Air, SpO2 86%)", cite: { page: 259, rid: "p259-abg" }, also: [{ page: 191, rid: "p191-abg" }, { page: 45, rid: "p45-abg" }], confidence: 0.93, handwritten: false, flags: [] },
  { id: "lab8", domain: "LAB", encounterId: "E1", title: "Potassium", value: "3.2", unit: "mmol/L", range: "", abnormal: "L", dateLabel: "11 Jul 2026", series: [{ d: "9 Jul", v: "3.6" }, { d: "11 Jul", v: "3.2", f: "L" }], verbatim: "#K+ 3.2 mmol/L (blood gas printout, marked outside ref. range)", cite: { page: 259, rid: "p259-abg" }, also: [{ page: 198, rid: "p198-biochem" }, { page: 196, rid: "p196-labs" }, { page: 42, rid: "p42-k" }], confidence: 0.93, handwritten: false, flags: ["conflictingValue"], conflictWith: { text: "9 Jul potassium is 3.6 on the investigation chart but 3.6 on the progress sheet and the pre-anaesthetic record", page: 200, rid: "p200-labs" } },
  { id: "lab9", domain: "LAB", encounterId: "E1", title: "Sodium", value: "133", unit: "mmol/L", range: "", abnormal: "L", dateLabel: "11 Jul 2026", series: [{ d: "9 Jul", v: "138" }, { d: "11 Jul", v: "133", f: "L" }], verbatim: "#Na+ 133 mmol/L (blood gas printout, marked outside ref. range)", cite: { page: 259, rid: "p259-abg" }, also: [{ page: 198, rid: "p198-biochem" }, { page: 196, rid: "p196-labs" }, { page: 42, rid: "p42-na" }], confidence: 0.93, handwritten: false, flags: ["conflictingValue"], conflictWith: { text: "9 Jul sodium is 138 on the investigation chart but 136 on the progress sheet and the pre-anaesthetic record", page: 200, rid: "p200-labs" } },
  { id: "lab10", domain: "LAB", encounterId: "E1", title: "Ionised calcium (Ca++)", value: "1.01", unit: "mmol/L", range: "", abnormal: "L", dateLabel: "11 Jul 2026", verbatim: "#Ca++ 1.01 mmol/L (marked outside ref. range)", cite: { page: 259, rid: "p259-abg" }, confidence: 0.93, handwritten: false, flags: [] },
  { id: "lab11", domain: "LAB", encounterId: "E1", title: "ABG PCO2", value: "35", unit: "", range: "", abnormal: "", dateLabel: "10 Jul 2026", verbatim: "PCO2 -> 35", cite: { page: 45, rid: "p45-abg" }, confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab12", domain: "LAB", encounterId: "E1", title: "Capillary glucose (GRBS)", value: "94", unit: "mg/dl", range: "", abnormal: "", dateLabel: "16 Jul 2026", series: [{ d: "9 Jul", v: "250" }, { d: "9 Jul 10:15pm", v: "146" }, { d: "10 Jul 7am", v: "94" }, { d: "10 Jul 10am", v: "116" }, { d: "10 Jul 3:30pm", v: "122" }, { d: "10 Jul 10:30pm", v: "134" }, { d: "11 Jul 6am", v: "78" }, { d: "11 Jul 8am", v: "103" }, { d: "11 Jul 6pm", v: "115" }, { d: "12 Jul 6am", v: "276" }, { d: "12 Jul 10:30am", v: "284" }, { d: "12 Jul 1pm", v: "254" }, { d: "12 Jul 3pm", v: "285" }, { d: "12 Jul evening", v: "245" }, { d: "13 Jul 6am", v: "227" }, { d: "13 Jul 1pm", v: "139" }, { d: "13 Jul 4pm", v: "121" }, { d: "13 Jul 7pm", v: "114" }, { d: "13 Jul 10pm", v: "125" }, { d: "14 Jul 6am", v: "99" }, { d: "14 Jul 10am", v: "159" }, { d: "14 Jul 1:30pm", v: "192" }, { d: "14 Jul 4:15pm", v: "140" }, { d: "14 Jul 6:45pm", v: "165" }, { d: "14 Jul 10pm", v: "134" }, { d: "15 Jul", v: "138" }, { d: "15 Jul 7am", v: "139" }, { d: "15 Jul 10am", v: "154" }, { d: "15 Jul 12:30pm", v: "161" }, { d: "15 Jul 7pm", v: "97" }, { d: "16 Jul 6am", v: "94" }], verbatim: "6am  94 mg/dl  FBS  Skip (last row of the insulin chart; the date is not written on this row)", cite: { page: 123, rid: "p123-grbs" }, also: [{ page: 122, rid: "p122-grbs" }, { page: 65, rid: "p65-grbs" }, { page: 71, rid: "p71-grbs" }, { page: 75, rid: "p75-grbs" }, { page: 76, rid: "p76-grbs" }, { page: 79, rid: "p79-insulin-skip" }, { page: 83, rid: "p83-grbs" }, { page: 206, rid: "p206-pod4" }, { page: 170, rid: "p170-primary-survey" }, { page: 251, rid: "p251-fbs" }, { page: 202, rid: "p202-pod1" }, { page: 203, rid: "p203-pod2" }], confidence: 0.75, handwritten: true, flags: ["partlyRead"] },
  { id: "lab13", domain: "LAB", encounterId: "E1", title: "HbA1c", value: "6.10", unit: "%", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "HbA1c: 6.10 %", cite: { page: 164, rid: "p164-labs" }, also: [{ page: 198, rid: "p198-other" }, { page: 200, rid: "p200-labs" }, { page: 251, rid: "p251-investigations" }, { page: 191, rid: "p191-labs" }, { page: 45, rid: "p45-a1c" }, { page: 33, rid: "p33-a1c" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "lab14", domain: "LAB", encounterId: "E1", title: "Random blood sugar (RBS)", value: "170", unit: "mg/dl", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "RBS: 170 mg/dl", cite: { page: 164, rid: "p164-labs" }, also: [{ page: 198, rid: "p198-biochem" }, { page: 251, rid: "p251-investigations" }, { page: 189, rid: "p189-labs" }, { page: 33, rid: "p33-rbs" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "lab15", domain: "LAB", encounterId: "E1", title: "TSH", value: "1.08", unit: "µIU/ml", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "TSH: 1.08 µIU/ml", cite: { page: 164, rid: "p164-labs" }, also: [{ page: 198, rid: "p198-other" }, { page: 251, rid: "p251-investigations" }, { page: 189, rid: "p189-labs" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "lab16", domain: "LAB", encounterId: "E1", title: "Platelet count", value: "157", unit: "K", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "PLT 157 K", cite: { page: 198, rid: "p198-cbc" }, also: [{ page: 251, rid: "p251-investigations" }, { page: 191, rid: "p191-labs" }, { page: 189, rid: "p189-labs" }, { page: 33, rid: "p33-plt" }, { page: 45, rid: "p45-plt" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "lab17", domain: "LAB", encounterId: "E1", title: "CRP", value: "4.9", unit: "", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "CRP 4.9 (4.9 on the progress sheet, 4.91 in the medicine note)", cite: { page: 198, rid: "p198-other" }, also: [{ page: 200, rid: "p200-labs" }, { page: 251, rid: "p251-investigations" }, { page: 189, rid: "p189-labs" }, { page: 33, rid: "p33-crp" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab18", domain: "LAB", encounterId: "E1", title: "Creatinine", value: "0.50", unit: "", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "CREAT 0.50", cite: { page: 198, rid: "p198-biochem" }, also: [{ page: 200, rid: "p200-labs" }, { page: 251, rid: "p251-investigations" }, { page: 33, rid: "p33-creat" }, { page: 45, rid: "p45-rft" }], confidence: 0.88, handwritten: true, flags: ["conflictingValue"], conflictWith: { text: "Consultation records: Creatinine 0.59", page: 33, rid: "p33-creat" } },
  { id: "lab19", domain: "LAB", encounterId: "E1", title: "Urea", value: "14", unit: "", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "UREA 14", cite: { page: 198, rid: "p198-biochem" }, also: [{ page: 200, rid: "p200-labs" }, { page: 251, rid: "p251-investigations" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "lab20", domain: "LAB", encounterId: "E1", title: "PT / INR", value: "10.7 / 1.01", unit: "", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "PT/INR 10.7 / 1.01", cite: { page: 198, rid: "p198-lft" }, also: [{ page: 251, rid: "p251-investigations" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "lab21", domain: "LAB", encounterId: "E1", title: "HBsAg and HCV", value: "NR", unit: "", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "HBsAg NR · HCV NR (pre-anaesthetic record: Sero NR)", cite: { page: 198, rid: "p198-other" }, also: [{ page: 251, rid: "p251-investigations" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab22", domain: "LAB", encounterId: "E1", title: "Haemoglobin", value: "10.4", unit: "g/dl", range: "", abnormal: "", dateLabel: "12 Jul 2026", series: [{ d: "9 Jul", v: "12.0" }, { d: "12 Jul", v: "10.4" }], verbatim: "postop Hb: 10.4 <- 12.0", cite: { page: 202, rid: "p202-pod1" }, also: [{ page: 164, rid: "p164-labs" }, { page: 198, rid: "p198-cbc" }, { page: 251, rid: "p251-investigations" }, { page: 196, rid: "p196-labs" }, { page: 42, rid: "p42-hb" }, { page: 45, rid: "p45-hb" }, { page: 33, rid: "p33-hb" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "lab23", domain: "LAB", encounterId: "E1", title: "Troponin T", value: "0.008", unit: "", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "Trop T - 0.008", cite: { page: 251, rid: "p251-investigations" }, also: [{ page: 189, rid: "p189-labs" }, { page: 191, rid: "p191-labs" }, { page: 33, rid: "p33-trop" }, { page: 45, rid: "p45-trop" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab24", domain: "LAB", encounterId: "E1", title: "Oxygen saturation on blood gas (SO2)", value: "87", unit: "%", range: "", abnormal: "", dateLabel: "11 Jul 2026", series: [{ d: "10 Jul", v: "78" }, { d: "11 Jul", v: "87" }], verbatim: "SO2c 87 %", cite: { page: 259, rid: "p259-abg" }, also: [{ page: 191, rid: "p191-abg" }, { page: 45, rid: "p45-abg" }], confidence: 0.93, handwritten: false, flags: [] },
  { id: "lab25", domain: "LAB", encounterId: "E2", title: "GRBS (bedside glucose)", value: "250", unit: "mg/dl", range: "", abnormal: "", dateLabel: "9 Jul 2026", verbatim: "GRBS: 250 mg/dl", cite: { page: 10, rid: "p10-grbs" }, also: [{ page: 20, rid: "p20-grbs" }], confidence: 0.9, handwritten: true, flags: [] },
  { id: "lab26", domain: "LAB", encounterId: "E4", title: "Haemoglobin", value: "12.5", unit: "", range: "", abnormal: "", dateLabel: "16 Jan 2026", verbatim: "Hb 12.5", cite: { page: 21, rid: "p21-lab-hb" }, confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab27", domain: "LAB", encounterId: "E4", title: "Total count (TC)", value: "8.1", unit: "", range: "", abnormal: "", dateLabel: "16 Jan 2026", verbatim: "TC 8.1", cite: { page: 21, rid: "p21-lab-tc" }, confidence: 0.8, handwritten: true, flags: [] },
  { id: "lab28", domain: "LAB", encounterId: "E4", title: "Platelets", value: "174", unit: "", range: "", abnormal: "", dateLabel: "16 Jan 2026", verbatim: "Plt 174", cite: { page: 21, rid: "p21-lab-plt" }, confidence: 0.8, handwritten: true, flags: [] },
  { id: "lab29", domain: "LAB", encounterId: "E4", title: "Creatinine", value: "0.48", unit: "", range: "", abnormal: "", dateLabel: "16 Jan 2026", verbatim: "Cr 0.48", cite: { page: 21, rid: "p21-lab-cr" }, confidence: 0.8, handwritten: true, flags: [] },
  { id: "lab30", domain: "LAB", encounterId: "E4", title: "Urea", value: "21", unit: "", range: "", abnormal: "", dateLabel: "16 Jan 2026", verbatim: "urea 21", cite: { page: 21, rid: "p21-lab-urea" }, confidence: 0.8, handwritten: true, flags: [] },
  { id: "lab31", domain: "LAB", encounterId: "E4", title: "Potassium", value: "3.6", unit: "", range: "", abnormal: "", dateLabel: "16 Jan 2026", verbatim: "K 3.6", cite: { page: 21, rid: "p21-lab-k" }, confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab32", domain: "LAB", encounterId: "E4", title: "Sodium", value: "140", unit: "", range: "", abnormal: "", dateLabel: "16 Jan 2026", verbatim: "Na 140", cite: { page: 21, rid: "p21-lab-na" }, confidence: 0.85, handwritten: true, flags: [] },
  { id: "lab33", domain: "LAB", encounterId: "E4", title: "GRBS (bedside glucose)", value: "226", unit: "mg/dl", range: "", abnormal: "", dateLabel: "16 Jan 2026", verbatim: "GRBS: 226 mg/dl", cite: { page: 27, rid: "p27-grbs" }, also: [{ page: 31, rid: "p31-grbs" }], confidence: 0.9, handwritten: true, flags: [] },
  { id: "vit1", domain: "VIT", encounterId: "E1", role: "last", title: "Morning of discharge", detail: "BP 133/84", dateLabel: "16 Jul 2026", verbatim: "MEWS chart, last column (16/7): systolic mark at 133, diastolic written 84, heart rate 51-100, respiration 15-20, SpO2 >90, temp 97-100, total MEWS score 1", readerNote: "Read off the charts", cite: { page: 130, rid: "p130-last" }, confidence: 0.6, handwritten: true, flags: ["conflictingValue", "lowConfidence"], conflictWith: { text: "The blood pressure chart arrow for 8AM on 16/7/26 runs from about 123-133 down to about 74", page: 138, rid: "p138-bp" }, facts: [{ k: "BP", v: "133/84" }] },
  { id: "vit2", domain: "VIT", encounterId: "E1", role: "interim", title: "Evening handover, day before discharge", detail: "BP 133/84 · Pulse 89 · SpO2 99% · Temp 98.8 F · RR 19 · GCS 15", dateLabel: "15 Jul 2026", verbatim: "Temp 98.8F  Pulse: 89bpm  Resp 19bpm  BP: 133/84mmHg  SpO2 99%  GCS 15", cite: { page: 121, rid: "p121-vitals" }, confidence: 0.8, handwritten: true, flags: [], facts: [{ k: "BP", v: "133/84" }, { k: "Pulse", v: "89" }, { k: "SpO2", v: "99%" }, { k: "Temp", v: "98.8 F" }, { k: "RR", v: "19" }, { k: "GCS", v: "15" }] },
  { id: "vit3", domain: "VIT", encounterId: "E1", role: "interim", title: "Post-operative day 4", detail: "BP 143/92", dateLabel: "15 Jul 2026", verbatim: "Patient conscious, oriented · Vitals stable · No fresh complaints · GRBS - 138 · BP - 143/92 · Dressing: no soakage · plan: W/I today, Continue physio", cite: { page: 206, rid: "p206-pod4" }, confidence: 0.88, handwritten: true, flags: [], facts: [{ k: "BP", v: "143/92" }] },
  { id: "vit4", domain: "VIT", encounterId: "E1", role: "interim", title: "Pulmonology review after the 14 Jul 2026 request", detail: "BP 172/84 · Pulse 108 · SpO2 91% on room air · RR 22", dateLabel: "14 Jul 2026", verbatim: "PR 108 b/m  SpO2: 91% RA  BP: 172/84 mmHg  RR: 22 cpm", readerNote: "Undated reply", cite: { page: 42, rid: "p42-oe" }, also: [{ page: 196, rid: "p196-review" }], confidence: 0.65, handwritten: true, flags: ["ambiguous"], facts: [{ k: "BP", v: "172/84" }, { k: "Pulse", v: "108" }, { k: "SpO2", v: "91% on room air" }, { k: "RR", v: "22" }] },
  { id: "vit5", domain: "VIT", encounterId: "E1", role: "interim", title: "After physiotherapy", detail: "Pulse 85 · SpO2 90", dateLabel: "14 Jul 2026", verbatim: "Deep breathing exercises · Incentive spirometry · Static quads · ATM · PWB ambulation with walker · SpO2 - 90 · HR - 85 · Pt is stable post Rx", cite: { page: 246, rid: "p246-physio-10" }, confidence: 0.8, handwritten: true, flags: [], facts: [{ k: "Pulse", v: "85" }, { k: "SpO2", v: "90" }] },
  { id: "vit6", domain: "VIT", encounterId: "E1", role: "interim", title: "Off oxygen, afternoon", detail: "SpO2 88% on room air", dateLabel: "13 Jul 2026", verbatim: "4:20pm Patient SpO2: 88% with Room air", cite: { page: 78, rid: "p78-desat" }, confidence: 0.85, handwritten: true, flags: [], facts: [{ k: "SpO2", v: "88% on room air" }] },
  { id: "vit7", domain: "VIT", encounterId: "E1", role: "interim", title: "ICU, 12 Jul 2026, 12:00", detail: "BP about 123/59 · Pulse about 73 · SpO2 97% · Temp about 36.9 C · RR about 16", dateLabel: "12 Jul 2026", verbatim: "Marks plotted in the 12:00 column of the graph; SpO2 row 8:00 to 12:00: 97, 96, 95, 99, 97 (last figure overwritten)", cite: { page: 4, rid: "p4-vitals-12" }, confidence: 0.6, handwritten: true, flags: ["partlyRead"], facts: [{ k: "BP", v: "about 123/59" }, { k: "Pulse", v: "about 73" }, { k: "SpO2", v: "97%" }, { k: "Temp", v: "about 36.9 C" }, { k: "RR", v: "about 16" }] },
  { id: "vit8", domain: "VIT", encounterId: "E1", role: "interim", title: "Day 1 after surgery, HDU", detail: "BP 123/63 · Pulse 75 · SpO2 96% · Temp 98.8 F · RR 19", dateLabel: "12 Jul 2026", verbatim: "SpO2: 96%  Temp 98.8F  Pulse: 75 b/m  Resp 19 b/m  BP: 123/63 mmHg", cite: { page: 72, rid: "p72-vitals" }, confidence: 0.75, handwritten: true, flags: [], facts: [{ k: "BP", v: "123/63" }, { k: "Pulse", v: "75" }, { k: "SpO2", v: "96%" }, { k: "Temp", v: "98.8 F" }, { k: "RR", v: "19" }] },
  { id: "vit9", domain: "VIT", encounterId: "E1", role: "interim", title: "Post-operative day 1", detail: "BP 123/74 · Pulse 72 · SpO2 97% on 1 L O2 · RR 14", dateLabel: "12 Jul 2026", verbatim: "Vitals: HR 72/min · BP 123/74 · RR 14/min · SpO2 97% 1L O2 · GRBS: 276 · BP: 123/74 · postop Hb: 10.4 <- 12.0 · DT: 40ml · Dressing: No soakage · I/O: 2550/1440 ml · plan: Shift to ward, physio", cite: { page: 202, rid: "p202-pod1" }, also: [{ page: 214, rid: "p214-vitals" }, { page: 75, rid: "p75-ward" }], confidence: 0.88, handwritten: true, flags: [], facts: [{ k: "BP", v: "123/74" }, { k: "Pulse", v: "72" }, { k: "SpO2", v: "97% on 1 L O2" }, { k: "RR", v: "14" }] },
  { id: "vit10", domain: "VIT", encounterId: "E1", role: "interim", title: "Pulmonology review, 11 Jul 2026, 5:45 PM", detail: "BP 146/73 · Pulse 77 · SpO2 99% with 6 L O2 via face mask · RR 15", dateLabel: "11 Jul 2026", verbatim: "BP = 146/73 mmHg  PR = 77 bpm  RR = 15 cpm  SpO2 = 99% c 6 L O2 via face mask", cite: { page: 43, rid: "p43-vitals" }, confidence: 0.85, handwritten: true, flags: [], facts: [{ k: "BP", v: "146/73" }, { k: "Pulse", v: "77" }, { k: "SpO2", v: "99% with 6 L O2 via face mask" }, { k: "RR", v: "15" }] },
  { id: "vit11", domain: "VIT", encounterId: "E1", role: "interim", title: "ICU, 11 Jul 2026, 17:00 (first charted set)", detail: "BP about 143/74 · Pulse about 76 · SpO2 98% · Temp about 36.6 C · RR about 15", dateLabel: "11 Jul 2026", verbatim: "Marks plotted in the 17:00 column of the graph; SpO2 row: 98%", cite: { page: 2, rid: "p2-vitals-17" }, confidence: 0.6, handwritten: true, flags: ["partlyRead"], facts: [{ k: "BP", v: "about 143/74" }, { k: "Pulse", v: "about 76" }, { k: "SpO2", v: "98%" }, { k: "Temp", v: "about 36.6 C" }, { k: "RR", v: "about 15" }] },
  { id: "vit12", domain: "VIT", encounterId: "E1", role: "interim", title: "Pulmonology review before surgery", detail: "BP 133/84 · Pulse 80 · SpO2 97% with 4 L O2, 85% on room air · RR 23", dateLabel: "11 Jul 2026", verbatim: "CTPA ✓ · D-dimer = 2.3 · ABG ✓ · Vitals: BP 133/84 mmHg · PR 80 bpm · RR 23 bpm · SpO2 97% with 4L, 85% with RA · R/S: B/L NVBS · Patient can be taken up for surgery under high risk if surgery cannot be postponed.", cite: { page: 192, rid: "p192-review" }, also: [{ page: 254, rid: "p254-high-risk" }, { page: 44, rid: "p44-vitals" }], confidence: 0.82, handwritten: true, flags: [], facts: [{ k: "BP", v: "133/84" }, { k: "Pulse", v: "80" }, { k: "SpO2", v: "97% with 4 L O2, 85% on room air" }, { k: "RR", v: "23" }] },
  { id: "vit13", domain: "VIT", encounterId: "E1", role: "interim", title: "Before surgery, at theatre reception", detail: "BP 146/80 · Pulse 84 · SpO2 99% on 4 L O2 · RR 16", dateLabel: "11 Jul 2026", verbatim: "while receiving vitals are BP: 146/80mmHg  P: 84 b/m  R: 16 b/m  SpO2: 99% on 4L O2 via NP", cite: { page: 66, rid: "p66-preop-vitals" }, confidence: 0.8, handwritten: true, flags: [], facts: [{ k: "BP", v: "146/80" }, { k: "Pulse", v: "84" }, { k: "SpO2", v: "99% on 4 L O2" }, { k: "RR", v: "16" }] },
  { id: "vit14", domain: "VIT", encounterId: "E1", role: "interim", title: "After surgery, on arrival in HDU", detail: "BP 143/74 · Pulse 82 · SpO2 99% on 2 L oxygen · Temp 98.8 F · RR 24", dateLabel: "11 Jul 2026", verbatim: "Temp: 98.8F  pulse: 82 b/mt  Resp: 24 br/mt  BP: 143/74mmHg  SpO2: 99% in 2 liter oxygen", cite: { page: 68, rid: "p68-hdu" }, confidence: 0.82, handwritten: true, flags: [], facts: [{ k: "BP", v: "143/74" }, { k: "Pulse", v: "82" }, { k: "SpO2", v: "99% on 2 L oxygen" }, { k: "Temp", v: "98.8 F" }, { k: "RR", v: "24" }] },
  { id: "vit15", domain: "VIT", encounterId: "E1", role: "interim", title: "Before surgery (transfer to theatre and immediate pre-op check)", detail: "BP 133/84 · Pulse 89 · SpO2 99% · Temp 98.8 · RR 19 · immediate pre-op check: HR 82, BP 146/80", dateLabel: "11 Jul 2026", verbatim: "Temperature 98.8 · Pulse 89 · BP 133/84 · RR 19 · SPO2 99% · Pain score 01/10 · Braden Score 17 · Existing pressure ulcers: No · On oxygen: Yes · On Nebulization: Yes", cite: { page: 212, rid: "p212-vitals" }, also: [{ page: 251, rid: "p251-fbs" }], confidence: 0.8, handwritten: true, flags: [], facts: [{ k: "BP", v: "133/84" }, { k: "Pulse", v: "89" }, { k: "SpO2", v: "99%" }, { k: "Temp", v: "98.8" }, { k: "RR", v: "19" }, { k: "", v: "immediate pre-op check: HR 82, BP 146/80" }] },
  { id: "vit16", domain: "VIT", encounterId: "E1", role: "interim", title: "After anaesthesia, shifted to HDU", detail: "BP 143/73 · Pulse 82 · SpO2 95% on 6 L/min O2", dateLabel: "11 Jul 2026", verbatim: "Unplanned mechanical ventilation: NO · Adverse anaesthetic events: NO · Shifted to: HDU · BP 143/73 mmHg · Pulse 82/min · SpO2 95% on 6 L/min 100% O2 · PONV (-) · Reflexes (+) · Level of consciousness: Awake · As per HDU", cite: { page: 262, rid: "p262-post-anaesthesia" }, also: [{ page: 193, rid: "p193-review" }], confidence: 0.75, handwritten: true, flags: [], facts: [{ k: "BP", v: "143/73" }, { k: "Pulse", v: "82" }, { k: "SpO2", v: "95% on 6 L/min O2" }] },
  { id: "vit17", domain: "VIT", encounterId: "E1", role: "interim", title: "Pulmonology consult", detail: "BP 143/84 · Pulse 97 · SpO2 94% on 2 L O2 · RR 19", dateLabel: "10 Jul 2026", verbatim: "PR: 97/min · SpO2: 94% on 2 L O2 · RR: 19 cpm · BP: 143/84 mmHg · R/S: B/L NVBS", cite: { page: 191, rid: "p191-vitals" }, also: [{ page: 45, rid: "p45-oe" }], confidence: 0.7, handwritten: true, flags: [], facts: [{ k: "BP", v: "143/84" }, { k: "Pulse", v: "97" }, { k: "SpO2", v: "94% on 2 L O2" }, { k: "RR", v: "19" }] },
  { id: "vit18", domain: "VIT", encounterId: "E1", role: "interim", title: "Pre-anaesthetic check", detail: "BP 163/84 · Pulse 86 · SpO2 93% on 4 L O2 · Temp afebrile · RR 29 · Wt ~61 kg", dateLabel: "10 or 11 Jul 2026", verbatim: "anxious · Pulse 86/min · BP 163/84 · RR 29/min, increased effort · Temp afebrile · SpO2 93% on 4 L O2 · GRBS 122 · Weight ~61 kg · Veins accessible · Spine: midline spaces not felt · CVS S1S2 · RS NVBS + · CNS HMF (N) · PA soft · under added cardiac risk", cite: { page: 250, rid: "p250-physical-exam" }, confidence: 0.82, handwritten: true, flags: ["ambiguous"], facts: [{ k: "BP", v: "163/84" }, { k: "Pulse", v: "86" }, { k: "SpO2", v: "93% on 4 L O2" }, { k: "Temp", v: "afebrile" }, { k: "RR", v: "29" }, { k: "Wt", v: "~61 kg" }] },
  { id: "vit19", domain: "VIT", encounterId: "E1", role: "interim", title: "General medicine consult", detail: "BP 143/84 · Pulse 92 · SpO2 94% on 4 L O2 by nasal prongs", dateLabel: "9 Jul 2026", verbatim: "BP: 143/84 · PR: 92 bpm · SpO2: 94% on 4 L O2 via NP · CVS: S1 + S2 + · RS: B/L NVBS · PA: soft · CNS: HMF intact", cite: { page: 189, rid: "p189-vitals" }, also: [{ page: 33, rid: "p33-vitals" }], confidence: 0.82, handwritten: true, flags: [], facts: [{ k: "BP", v: "143/84" }, { k: "Pulse", v: "92" }, { k: "SpO2", v: "94% on 4 L O2 by nasal prongs" }] },
  { id: "vit20", domain: "VIT", encounterId: "E1", role: "interim", title: "On admission to the ward", detail: "BP 143/84 · Pulse 92 · SpO2 96% on 4 L nasal prongs · Temp 98.8 F · RR 24", dateLabel: "9 Jul 2026", verbatim: "T: 98.8°F  BP: 143/84mmHg  PR: 92bpm (overwritten)  RR: 24 b/m  SpO2: 96% c 4 liter nasal prongs", cite: { page: 58, rid: "p58-vitals" }, also: [{ page: 114, rid: "p114-vitals" }], confidence: 0.72, handwritten: true, flags: ["conflictingValue"], conflictWith: { text: "The nursing initial assessment form of the same evening says Pulse 81 b/mt", page: 86, rid: "p86-vitals" }, facts: [{ k: "BP", v: "143/84" }, { k: "Pulse", v: "92" }, { k: "SpO2", v: "96% on 4 L nasal prongs" }, { k: "Temp", v: "98.8 F" }, { k: "RR", v: "24" }] },
  { id: "vit21", domain: "VIT", encounterId: "E1", role: "interim", title: "Transfer to ward", detail: "BP 133/92 · Pulse 92 · SpO2 96% · Temp 98.8 F · RR 19 · GCS 15", dateLabel: "9 Jul 2026", verbatim: "Temperature 98.8°F · Pulse 92 · BP 133/92 · RR 19 · SPO2 96% · GCS 15 · Existing pressure ulcers: No · On oxygen: Yes · On Nebulization: Yes", cite: { page: 210, rid: "p210-vitals" }, confidence: 0.85, handwritten: true, flags: [], facts: [{ k: "BP", v: "133/92" }, { k: "Pulse", v: "92" }, { k: "SpO2", v: "96%" }, { k: "Temp", v: "98.8 F" }, { k: "RR", v: "19" }, { k: "GCS", v: "15" }] },
  { id: "vit22", domain: "VIT", encounterId: "E2", role: "last", title: "ED, 9 Jul 2026, 6 PM (last charted set)", detail: "Pulse 86 · SpO2 96% · RR 19 · GCS E4V5M6 · Pain 2", dateLabel: "9 Jul 2026", verbatim: "6 [PM]  19  96  86  13[..]/[..]  E4 V5 M6  98[..]  2", readerNote: "BP and temperature entries in this row are not clearly readable (5:30 PM row: BP 133/92, Temp 98.8 F)", cite: { page: 6, rid: "p6-vitals-last" }, confidence: 0.65, handwritten: true, flags: ["partlyRead"], facts: [{ k: "Pulse", v: "86" }, { k: "SpO2", v: "96%" }, { k: "RR", v: "19" }, { k: "GCS", v: "E4V5M6" }, { k: "Pain", v: "2" }] },
  { id: "vit23", domain: "VIT", encounterId: "E2", role: "interim", title: "ED, 9 Jul 2026, 2:15 PM (first hourly set)", detail: "BP 133/84 · Pulse 86 · SpO2 93% · Temp 98.8 F · RR 19 · GCS E4V5M6 · Pain 2", dateLabel: "9 Jul 2026", verbatim: "2:15PM  19  93  86  133/84  E4 V5 M6  98.8 F  2", cite: { page: 6, rid: "p6-vitals-1" }, confidence: 0.8, handwritten: true, flags: [], facts: [{ k: "BP", v: "133/84" }, { k: "Pulse", v: "86" }, { k: "SpO2", v: "93%" }, { k: "Temp", v: "98.8 F" }, { k: "RR", v: "19" }, { k: "GCS", v: "E4V5M6" }, { k: "Pain", v: "2" }] },
  { id: "vit24", domain: "VIT", encounterId: "E2", role: "interim", title: "ED triage, 9 Jul 2026, 1:15 PM", detail: "BP 133/92 · Pulse 86 · SpO2 91% · Temp 98.8 F · RR 19 · GCS 15/15 · Pain 4, left hip", dateLabel: "9 Jul 2026", verbatim: "RR: 19/min SpO2: 91% Pulse: 86/min BP: 133/92 mm/hg Temp 98.8 F", cite: { page: 10, rid: "p10-vitals" }, also: [{ page: 20, rid: "p20-breathing" }, { page: 20, rid: "p20-circulation" }, { page: 170, rid: "p170-primary-survey" }], confidence: 0.85, handwritten: true, flags: ["conflictingValue"], conflictWith: { text: "Orthopaedics examination form, 1:45 PM the same day: Temp 38.2 °C (pulse 86, BP 133/92 and respiration 19 agree)", page: 15, rid: "p15-general" }, facts: [{ k: "BP", v: "133/92" }, { k: "Pulse", v: "86" }, { k: "SpO2", v: "91%" }, { k: "Temp", v: "98.8 F" }, { k: "RR", v: "19" }, { k: "GCS", v: "15/15" }, { k: "Pain", v: "4, left hip" }] },
  { id: "vit25", domain: "VIT", encounterId: "E2", role: "interim", title: "Orthopaedic examination on arrival", detail: "BP 133/92 · Pulse 86 · Temp 38.2 °C · RR 19", dateLabel: "9 Jul 2026", verbatim: "Consciousness: conscious, oriented · Pupillary reaction: Bilaterally reactive · Pulse 86 /min (good), Regular · BP 133/92 mm of Hg · Temp 38.2 °C · Respiration 19 /min", cite: { page: 175, rid: "p175-general-exam" }, confidence: 0.82, handwritten: true, flags: ["ambiguous"], facts: [{ k: "BP", v: "133/92" }, { k: "Pulse", v: "86" }, { k: "Temp", v: "38.2 °C" }, { k: "RR", v: "19" }] },
  { id: "vit26", domain: "VIT", encounterId: "E4", role: "last", title: "At transfer to the ward, 16 Jan 2026, 9:35 PM", detail: "BP 153/74 · Pulse 92 · SpO2 99% · Temp 98.8 F", dateLabel: "16 Jan 2026", verbatim: "Vital signs Temperature - 98.8 F Pulse - 92 bpm BP - 153/74 mmHg SPO2 - 99%", cite: { page: 22, rid: "p22-transfer" }, also: [{ page: 23, rid: "p23-vitals-9pm" }], confidence: 0.9, handwritten: true, flags: [], facts: [{ k: "BP", v: "153/74" }, { k: "Pulse", v: "92" }, { k: "SpO2", v: "99%" }, { k: "Temp", v: "98.8 F" }] },
  { id: "vit27", domain: "VIT", encounterId: "E4", role: "interim", title: "ED triage, 16 Jan 2026, 5 PM", detail: "BP 153/92 · Pulse 87 · SpO2 95% · Temp 98.8 F · RR 19 · GCS 15/15", dateLabel: "16 Jan 2026", verbatim: "RR: 19/min SpO2: 95 Pulse: 87/min BP: 153/92 mm/hg Temp: 98.8 F", cite: { page: 27, rid: "p27-vitals" }, also: [{ page: 31, rid: "p31-breathing" }], confidence: 0.85, handwritten: true, flags: ["conflictingValue"], conflictWith: { text: "ED doctor's record at 5:00 pm: RR 24/min, temperature written as Afebrile (SpO2 95% on room air, HR 87, BP 153/92 agree)", page: 31, rid: "p31-breathing" }, facts: [{ k: "BP", v: "153/92" }, { k: "Pulse", v: "87" }, { k: "SpO2", v: "95%" }, { k: "Temp", v: "98.8 F" }, { k: "RR", v: "19" }, { k: "GCS", v: "15/15" }] },
  { id: "vit28", domain: "VIT", encounterId: "E4", role: "interim", title: "Medicine review in the ED, 16 Jan 2026", detail: "BP 153/92 · Pulse 81 · SpO2 99 on room air · afebrile", dateLabel: "16 Jan 2026", verbatim: "HR - 81 bpm. BP - 153/92. SpO2 - 99 RA. afeb", cite: { page: 21, rid: "p21-oe" }, confidence: 0.85, handwritten: true, flags: [], facts: [{ k: "BP", v: "153/92" }, { k: "Pulse", v: "81" }, { k: "SpO2", v: "99 on room air" }, { k: "Temp", v: "afebrile" }] },
  { id: "rpt1", domain: "RPT", encounterId: "E1", role: "alert", group: "Keep in mind", title: "Low oxygen saturation on room air during this admission", detail: "SpO2 91% on room air on arrival, 85% on room air before surgery (11 Jul) and 91% on room air on 14 Jul. Oxygen at 2 L/min is still on the orders of 16 Jul; the discharge summary does not mention oxygen.", dateLabel: "9 to 16 Jul 2026", verbatim: "CTPA ✓ · D-dimer = 2.3 · ABG ✓ · Vitals: BP 133/84 mmHg · PR 80 bpm · RR 23 bpm · SpO2 97% with 4L, 85% with RA · R/S: B/L NVBS · Patient can be taken up for surgery under high risk if surgery cannot be postponed.", short: "low oxygen saturation on room air during this admission (85% before surgery)", cite: { page: 192, rid: "p192-review" }, also: [{ page: 170, rid: "p170-primary-survey" }, { page: 259, rid: "p259-abg" }, { page: 196, rid: "p196-review" }, { page: 244, rid: "p244-orders" }, { page: 240, rid: "p240-orders" }, { page: 20, rid: "p20-breathing" }, { page: 9, rid: "p9-proc-2" }, { page: 19, rid: "p19-rx-o2" }, { page: 10, rid: "p10-vitals" }, { page: 42, rid: "p42-baseline" }, { page: 33, rid: "p33-vitals" }, { page: 45, rid: "p45-oe" }, { page: 44, rid: "p44-vitals" }, { page: 43, rid: "p43-vitals" }, { page: 42, rid: "p42-oe" }, { page: 42, rid: "p42-advice" }, { page: 78, rid: "p78-desat" }, { page: 58, rid: "p58-vitals" }, { page: 68, rid: "p68-hdu" }, { page: 76, rid: "p76-o2stop" }, { page: 65, rid: "p65-ctpa" }], confidence: 0.82, handwritten: true, flags: [] },
  { id: "rpt2", domain: "RPT", encounterId: "E1", role: "alert", group: "Keep in mind", title: "Fasting blood sugar 39 on the morning of surgery", detail: "FBS 39 (circled) on 11 Jul, GRBS 103 afterwards. Glimy M1 is marked W/H on the orders of 12 to 14 Jul and is given again from 15 Jul; it is continued on discharge.", dateLabel: "11 Jul 2026", verbatim: "Heart rate 82 /min · Blood pressure 146/80 mmHg · NPO status, investigation reports: checked · FBS (39, circled) -> GRBS -> 103", short: "a fasting blood sugar of 39 on the morning of surgery (11 Jul 2026)", cite: { page: 251, rid: "p251-fbs" }, also: [{ page: 196, rid: "p196-labs" }, { page: 227, rid: "p227-orders" }, { page: 239, rid: "p239-orders" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "rpt3", domain: "RPT", encounterId: "E1", role: "alert", group: "Keep in mind", title: "Thyroid lesions seen on CT, ultrasound suggested", detail: "CT pulmonary angiography (11/07/2026) notes hypodense lesions with calcification in the right lobe of the thyroid and suggests ultrasound correlation if clinically indicated. No thyroid ultrasound is in this file.", dateLabel: "11 Jul 2026", verbatim: "-Right and left pulmonary arteries are prominent in calibre, however, no evidence of acute pulmonary embolism. -Bilateral(right>left) dependent basal atelectasis. -Hypodense lesions with calcification in right lobe of thyroid. Suggested USG correlation if clinically indicated.", short: "hypodense calcified lesions in the right lobe of the thyroid on CT (ultrasound correlation suggested)", cite: { page: 165, rid: "p165-ctpa" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt4", domain: "RPT", encounterId: "E1", role: "alert", group: "Keep in mind", title: "Difficult airway features noted by anaesthesia", detail: "Edentulous, hollow cheeks, short neck, Mallampati class 3. The surgical safety checklist marks difficult airway or aspiration risk as yes.", dateLabel: "11 Jul 2026", verbatim: "Teeth: edentulous · hollow cheeks, short neck · Denture: (-) · Mouth opening: > 6 cm · Thyromental distance: 6 cm · Neck movements: not assessed · BHT < 8 sec · Mallampati: Class 3 (circled)", short: "difficult airway features (Mallampati class 3, short neck, edentulous)", cite: { page: 250, rid: "p250-airway" }, also: [{ page: 270, rid: "p270-airway" }, { page: 254, rid: "p254-high-risk" }], confidence: 0.82, handwritten: true, flags: [] },
  { id: "rpt5", domain: "RPT", encounterId: "E1", role: "alert", group: "Keep in mind", title: "Pulmonology cleared surgery only under high risk", detail: "Pulmonology wrote that the patient can be taken up for surgery under high risk if surgery cannot be postponed. At that review SpO2 was 85% on room air and 97% with 4 L oxygen; D-dimer was 2.3 and the CTPA and ABG had been seen.", dateLabel: "11 Jul 2026", verbatim: "Patient can be taken up for Surgery under high risk if Surgery cannot be postponed.", short: "surgery cleared by Pulmonology under high risk, SpO2 85% on room air", cite: { page: 44, rid: "p44-advice" }, also: [{ page: 44, rid: "p44-vitals" }, { page: 44, rid: "p44-findings" }], confidence: 0.9, handwritten: true, flags: [] },
  { id: "rpt6", domain: "RPT", encounterId: "E1", role: "alert", group: "Keep in mind", title: "Blood products", detail: "Blood grouping and cross-match for 2 units of PRBC were sent to the blood bank on 10 Jul. The discharge slip circles No for any blood transfusion.", dateLabel: "10 Jul 2026", verbatim: "6:45pm Blood grouping and 2 U PRBC cross matching sent to blood bank / Any Blood Transfusion? No", short: "2 units PRBC cross-matched, no transfusion per the discharge slip", cite: { page: 61, rid: "p61-xmatch" }, also: [{ page: 140, rid: "p140-transfusion" }], confidence: 0.82, handwritten: true, flags: [] },
  { id: "rpt7", domain: "RPT", encounterId: "E1", role: "detail", group: "Keep in mind", title: "Lines and drains in ICU", detail: "11 Jul sheet: left DT (drain) inserted 11/7/26; a 20G cannula, right side, 11/7/26; an 18 gauge cannula 11/7/26. 12 Jul sheet: IV cannula 20G; 18G cannula 11/7/26; Foley's catheter 9/7/26.", dateLabel: "11 to 12 Jul 2026", verbatim: "(L) DT 11/7/26 · [..] 20G (R) 11/7/26 · (18) Gauge 11/7/26  //  IV cannula 20G · (18) [..] cannula 11/7/26 · Foley's cath 9/7/26 · (R) s[..]gical DT", readerNote: "A fourth entry reads as '(R) surgical DT' with no date. The device names are hard to read and the side of the drain differs between the two sheets", cite: { page: 1, rid: "p1-devices" }, also: [{ page: 3, rid: "p3-devices" }], confidence: 0.6, handwritten: true, flags: ["partlyRead"] },
  { id: "rpt8", domain: "RPT", encounterId: "E1", role: "investigation", group: "Investigations", title: "CT brain, plain (09/07/2026)", detail: "Chronic small vessel ischaemic changes with age related cerebral atrophy. No evidence of trauma related neuro-parenchymal injury.", dateLabel: "9 Jul 2026", verbatim: "Intra axial confluent hypodense areas noted in centrum semiovale, periventricular white matter and corona radiate regions- s/o chronic small vessel ischaemic changes. Sulci, ventricles and cisterns are prominent - age related cerebral atrophy. No e/o extra axial lesions/collection. Mucosal thickening of sphenoid sinus noted. Left concha bullosa noted.", cite: { page: 165, rid: "p165-ct-brain" }, also: [{ page: 165, rid: "p165-ct-impression" }, { page: 265, rid: "p265-ct-note" }, { page: 7, rid: "p7-rad-3" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt9", domain: "RPT", encounterId: "E1", role: "investigation", group: "Investigations", title: "CT cervical spine, plain (09/07/2026)", detail: "No evidence of trauma related cervical spine injury. Diffuse osteopenia and degenerative changes (anterior marginal osteophytes, uncovertebral hypertrophy).", dateLabel: "9 Jul 2026", verbatim: "Craniovertebral junction is normal. Vertebrae are normal in alignment. Disc spaces are grossly maintained. Diffuse osteopenia. Degenerative changes in the form of anterior marginal osteophytes, uncovertebral hypertrophy.", cite: { page: 165, rid: "p165-ct-cspine" }, also: [{ page: 165, rid: "p165-ct-impression" }, { page: 265, rid: "p265-ct-note" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt10", domain: "RPT", encounterId: "E1", role: "investigation", group: "Investigations", title: "Chest X-ray", detail: "General medicine: left sided homogenous opacification of the lung field, cardiophrenic and costophrenic angles not blunted. Pulmonology: rotated film, cannot comment.", dateLabel: "9 Jul 2026", verbatim: "(L) sided homogenous opacification of lung field. Cardio & Costo Phrenic angles not blunted · CT yet to be reported", cite: { page: 189, rid: "p189-cxr" }, also: [{ page: 251, rid: "p251-cxr" }, { page: 33, rid: "p33-cxr" }], confidence: 0.75, handwritten: true, flags: ["conflict"], conflictWith: { text: "Rotated film. Cannot comment", page: 191, rid: "p191-cxr" } },
  { id: "rpt11", domain: "RPT", encounterId: "E1", role: "investigation", group: "Investigations", title: "ECG", detail: "Normal sinus rhythm, rate 81, no ST-T changes, PR and QTc within normal limits.", dateLabel: "9 Jul 2026", verbatim: "(N) SR rate 81 · no ST-T · PR / QTc WNL", cite: { page: 251, rid: "p251-ecg" }, also: [{ page: 185, rid: "p185-opinion" }, { page: 5, rid: "p5-ecg" }, { page: 7, rid: "p7-rad-1" }, { page: 39, rid: "p39-echo" }, { page: 33, rid: "p33-echo" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt12", domain: "RPT", encounterId: "E1", role: "investigation", group: "Investigations", title: "Echocardiogram (9/7/26)", detail: "EF 65%, normal biventricular systolic function, no regional wall motion abnormality. MAC present, mild MR, LVH, mild LVDD, TR present, no PAH. The cardiology note calls it a normal study.", dateLabel: "9 Jul 2026", verbatim: "EF 65% · (N) BV sys func · no RWMA · MAC (+) · mild MR · LVH (+) · mild LVDD · TR (+) · no PAH", cite: { page: 251, rid: "p251-echo" }, also: [{ page: 185, rid: "p185-opinion" }, { page: 189, rid: "p189-echo" }, { page: 254, rid: "p254-high-risk" }, { page: 33, rid: "p33-echo" }, { page: 39, rid: "p39-echo" }, { page: 46, rid: "p46-rx" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt13", domain: "RPT", encounterId: "E1", role: "investigation", group: "Investigations", title: "CT pulmonary angiography (11/07/2026)", detail: "No evidence of acute pulmonary embolism; right and left pulmonary arteries prominent in calibre. Bilateral (right more than left) dependent basal atelectasis. Hypodense lesions with calcification in the right lobe of the thyroid.", dateLabel: "11 Jul 2026", verbatim: "-Right and left pulmonary arteries are prominent in calibre, however, no evidence of acute pulmonary embolism. -Bilateral(right>left) dependent basal atelectasis. -Hypodense lesions with calcification in right lobe of thyroid. Suggested USG correlation if clinically indicated.", cite: { page: 165, rid: "p165-ctpa" }, also: [{ page: 193, rid: "p193-review" }, { page: 43, rid: "p43-ctpa" }, { page: 45, rid: "p45-advise-ctpa" }, { page: 44, rid: "p44-findings" }, { page: 43, rid: "p43-advice" }, { page: 65, rid: "p65-ctpa" }, { page: 62, rid: "p62-ct" }, { page: 63, rid: "p63-review" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt14", domain: "RPT", encounterId: "E1", role: "investigation", group: "Investigations", title: "X-ray of hip, pelvis and left leg after surgery", detail: "The HDU transfer note of 12 Jul says the X-ray was done. The report is not in this file.", dateLabel: "12 Jul 2026", verbatim: "X-ray of hip pelvis + left leg done", cite: { page: 74, rid: "p74-xray" }, confidence: 0.65, handwritten: true, flags: ["partlyRead"] },
  { id: "rpt15", domain: "RPT", encounterId: "E2", role: "investigation", group: "Investigations", title: "X-rays: chest, pelvis, left femur (AP, lateral)", detail: "Radiological findings written by the Orthopaedics resident: left femur neck fracture. The nursing tracker logs an ortho X-ray sent at 2:40 PM and back at 3:05 PM. There is no formal radiology report in this file.", dateLabel: "9 Jul 2026", verbatim: "X-rays - Chest, pelvis, left femur - AP, lateral. Radiological findings: left femur neck fracture", cite: { page: 12, rid: "p12-xray-findings" }, also: [{ page: 12, rid: "p12-xrays-asked" }, { page: 7, rid: "p7-rad-2" }, { page: 178, rid: "p178-radiology" }, { page: 178, rid: "p178-plan" }], confidence: 0.9, handwritten: true, flags: [] },
  { id: "rpt16", domain: "RPT", encounterId: "E2", role: "investigation", group: "Investigations", title: "E-FAST in emergency", detail: "E-FAST negative, with lung sliding present on both sides.", dateLabel: "9 Jul 2026", verbatim: "all views marked (-) · with B/L lung sliding (+)", cite: { page: 171, rid: "p171-efast" }, also: [{ page: 250, rid: "p250-efast" }, { page: 19, rid: "p19-efast" }], confidence: 0.7, handwritten: true, flags: [] },
  { id: "rpt17", domain: "RPT", encounterId: "E2", role: "detail", group: "Investigations", title: "Blood tests sent", detail: "VBG, CBC, RFT and SE asked for; CBC, RFT and SE sent at 2 PM.", dateLabel: "9 Jul 2026", verbatim: "Investigations: VBG, CBC, RFT, SE, ECG, X-Ray", cite: { page: 19, rid: "p19-inv" }, also: [{ page: 7, rid: "p7-lab" }, { page: 58, rid: "p58-bloods" }, { page: 59, rid: "p59-consults" }, { page: 60, rid: "p60-serology" }, { page: 64, rid: "p64-abg" }, { page: 64, rid: "p64-fasting" }, { page: 71, rid: "p71-cbc" }, { page: 82, rid: "p82-bnp" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt18", domain: "RPT", encounterId: "E3", role: "investigation", group: "Investigations", title: "2D echo requested from Cardiology (20 Jan)", detail: "Medicine asked Cardiology to do a 2D echo on 20/1 at 9 am. There is no reply or result on the page.", dateLabel: "20 Jan 2026", verbatim: "Respected staff, kindly do 2D ECHO", cite: { page: 51, rid: "p51-request" }, confidence: 0.85, handwritten: true, flags: [] },
  { id: "rpt19", domain: "RPT", encounterId: "E4", role: "investigation", group: "Investigations", title: "Chest X-ray, 16 Jan 2026", detail: "Written in the Medicine note as left-sided haziness. Logged by nursing as sent 5:55 pm, back 6 pm. No formal report in this file.", dateLabel: "16 Jan 2026", verbatim: "CXR - (L) haziness", cite: { page: 21, rid: "p21-cxr" }, also: [{ page: 24, rid: "p24-rad-2" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt20", domain: "RPT", encounterId: "E4", role: "investigation", group: "Investigations", title: "ECG, 16 Jan 2026", detail: "Written as NSR in the Medicine note. Done at the bedside at 5:10 pm, seen by the ED resident and attached to the OP file. No tracing in this file.", dateLabel: "16 Jan 2026", verbatim: "ECG - NSR", cite: { page: 21, rid: "p21-ecg" }, also: [{ page: 22, rid: "p22-ecg" }, { page: 24, rid: "p24-rad-1" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "rpt21", domain: "RPT", encounterId: "E4", role: "investigation", group: "Investigations", title: "2D echo (listed, no result)", detail: "Written under the lab results in the investigations column of the Medicine note, with no finding beside it.", dateLabel: "16 Jan 2026", verbatim: "2D ECHO", cite: { page: 21, rid: "p21-echo" }, confidence: 0.75, handwritten: true, flags: [] },
  { id: "rpt22", domain: "RPT", encounterId: "E1", role: "anaesthesia", group: "Surgery", title: "Pre-anaesthetic assessment", detail: "High risk consent. Plan: subarachnoid block or general anaesthesia, with or without a block. Pantoprazole 40 mg at night and at 6 am, antidiabetic medicines withheld, IV fluid with neutralising insulin in DNS, Duolin and Budecort nebulisation at night and 30 minutes before the procedure; pulmonology clearance to be reviewed on the morning of surgery.", dateLabel: "10 or 11 Jul 2026", verbatim: "under SAB / GA ± Block · T. PANTAPRAZOLE 40mg HS & 6 AM · To cont all medication as per schedule · Pulmonology clearance -> will be reviewed in the morning prior procedure (i/v/o decreased SpO2, raised RR, CXR changes) · High risk informed consent · NPO: Solids 8 hrs, Clear fluids 2 hr · Arrange blood products: adequately · Investigations required: FBS · To W/H Antidiabetic medication · IVF with neutralising dose of Insulin in DNS as per Medicine order · Neb. Duolin, Budecort: HS & 30 mins prior procedure", cite: { page: 251, rid: "p251-plan" }, also: [{ page: 250, rid: "p250-airway" }, { page: 250, rid: "p250-physical-exam" }, { page: 254, rid: "p254-high-risk" }, { page: 250, rid: "p250-history" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt23", domain: "RPT", encounterId: "E1", role: "anaesthesia", group: "Surgery", title: "Anaesthesia given", detail: "Subarachnoid block at L3-L4 (2.2 ml of 0.5% heavy bupivacaine + 30 mcg clonidine) with left femoral and left lateral femoral cutaneous nerve blocks under ultrasound (10 ml 0.5% levobupivacaine + 10 ml 2% lignoadrenaline + 4 mg dexamethasone). Spontaneous breathing with face mask oxygen, SpO2 90 to 94%. Blood loss written as 500 ml. No adverse anaesthetic events; shifted to HDU.", dateLabel: "11 Jul 2026", verbatim: "Technique: subarachnoid block · Position: sitting · Approach: midline · Space: L3-L4 · Needle type: 23G Quincke Babcock's needle · Drug injected/Dose: 2.2 ml of 0.5% Heavy bupivacaine + 30 mcg of clonidine · Adequacy of block: Adequate · (L) femoral + (L) LFCN block under USG guidance: 10 ml of 0.5% levobupivacaine + 10 ml of 2% lignoadrenaline + 4 mg dexamethasone - adequate analgesia", cite: { page: 261, rid: "p261-regional" }, also: [{ page: 257, rid: "p257-record" }, { page: 260, rid: "p260-fluids" }, { page: 262, rid: "p262-post-anaesthesia" }, { page: 268, rid: "p268-anaesthesia" }, { page: 67, rid: "p67-surgery" }, { page: 64, rid: "p64-preop-meds" }, { page: 65, rid: "p65-npo" }], confidence: 0.72, handwritten: true, flags: ["conflictingValue"], conflictWith: { text: "Approximate Blood Loss: 200ml (operation report)", page: 269, rid: "p269-closure" } },
  { id: "rpt24", domain: "RPT", encounterId: "E1", role: "detail", group: "Surgery", title: "Theatre times and drain", detail: "Shifted to theatre at 1:10 pm on 11 Jul and received in theatre at 1:15 pm. The 4:30 pm note records the surgery done and a 10F drain in the left hip. Received in HDU at 5 pm.", dateLabel: "11 Jul 2026", verbatim: "1:10pm patient shifted to OT. 1:15pm Patient received to OT. 4:30pm Patient underwent Left Bipolar Hemiarthroplasty ... Romovac 10F DT present in left hip. Patient shifted to HDU", cite: { page: 67, rid: "p67-ot" }, also: [{ page: 67, rid: "p67-surgery" }, { page: 68, rid: "p68-hdu" }], confidence: 0.78, handwritten: true, flags: [] },
  { id: "rpt25", domain: "RPT", encounterId: "E1", role: "detail", group: "Surgery", title: "Implants", detail: "CORAIL cemented femoral stem 12/14 AMT 135° size 8 standard no collar; Aqurate cement stopper 40 mm; self centering bipolar head 28 mm ID 43 mm OD; ARTICUL/EZE femoral head 28 mm +1.5 12/14 taper; SmartSet GHV gentamicin bone cement 40 g.", dateLabel: "11 Jul 2026", verbatim: "CORAIL Hip system cemented Femoral stem 12/14 AMT 135° size 8 standard no collar · Aqurate cement stopper diameter 40mm UHMWPE · Self centering Bipolar head 28mm ID 43mm OD · ARTICUL/EZE Femoral head 28mm +1.5 12/14 taper · SmartSet GHV Gentamicin bone cement 40g", cite: { page: 165, rid: "p165-implants" }, also: [{ page: 269, rid: "p269-implants" }, { page: 269, rid: "p269-implant-labels" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt26", domain: "RPT", encounterId: "E1", role: "detail", group: "Surgery", title: "Operation report: what was done", detail: "Right lateral decubitus, Southern Moore approach with a 15 cm curved incision. Fractured femoral head extracted; 28 mm head chosen; 40 mm cement stopper and a cemented femoral stem size 8 in about 15 degrees of anteversion. Drain placed. Above knee compression and knee immobilizer applied; shifted out with stable vitals. Counts verified. Approximate blood loss 200 ml.", dateLabel: "11 Jul 2026", verbatim: "a head size of 28mm was chosen. Broaching was done on femur serially from small to larger size (till 9 size) keeping anteversion ~15 degree. Trial implants were placed; head reduced and hip range of movements assessed. Cement stopper (40mm) was inserted in the femoral canal. A cemented femoral stem (size 8) inserted in approximately 15 degrees of anteversion. Irrigation done, hemostasis achieved and drain placed. Capsular layer sutured with vicryl no.1, short external rotators sutured through transosseously with GT. Deep fascia closed with Stratafix and subcutaneus closure done with Vicryl 1-0. Skin closed with stratafix. Above knee compression & knee immobilizer were applied and patient shifted out with stable vitals", cite: { page: 269, rid: "p269-steps" }, also: [{ page: 268, rid: "p268-steps" }, { page: 268, rid: "p268-incision" }, { page: 269, rid: "p269-closure" }, { page: 268, rid: "p268-anaesthesia" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt27", domain: "RPT", encounterId: "E1", role: "complaint", group: "Course", title: "Presenting complaint", detail: "Pain over left hip after an alleged slip and fall at home on 09/07/26: sudden in onset, severe, non radiating; not able to bear weight on the left lower limb. No loss of consciousness, ENT bleed or seizures.", dateLabel: "9 Jul 2026", verbatim: "Pain over left hip", cite: { page: 164, rid: "p164-complaint" }, also: [{ page: 164, rid: "p164-hpi" }, { page: 174, rid: "p174-complaint" }, { page: 180, rid: "p180-hpi" }, { page: 10, rid: "p10-complaint" }, { page: 16, rid: "p16-complaint" }, { page: 19, rid: "p19-mechanism" }, { page: 20, rid: "p20-mechanism" }, { page: 86, rid: "p86-complaint" }, { page: 87, rid: "p87-pain" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt28", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Medicine advice before surgery (9 Jul 2026, 9 PM)", detail: "Cardiac clearance and Pulmonology clearance asked for. The patient can be posted for surgery if BP is below 140/90 and pre-operative GRBS is below 180 mg/dl, after clearance by Pulmonology and Cardiology. Withhold oral antidiabetics on the day of surgery and give IVF DNS with an 8 U neutralising dose of Actrapid.", dateLabel: "9 Jul 2026", verbatim: "1. Cardiac clearance 2. Pulmonology clearance 3. Pt. can be posted for surgery if BP < 140/90 and GRBS pre op < 1[8]0 mg/dl after being cleared for surgery by Pulmonology & Cardiology. 4. W/H OHAs on day of surgery & give IVF DNS c 8 U neutralising dose of Actrapid", readerNote: "The figure is overwritten and could be 150", cite: { page: 33, rid: "p33-advice" }, also: [{ page: 34, rid: "p34-request" }, { page: 189, rid: "p189-advice" }, { page: 188, rid: "p188-diagnosis" }, { page: 189, rid: "p189-vitals" }], confidence: 0.75, handwritten: true, flags: ["ambiguous"] },
  { id: "rpt29", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Admission", detail: "Admission order dated 9 Jul 2026, 4 pm, under Orthopaedics. Reached the ward at 7 pm by trolley on 4 L oxygen by nasal prongs, with a Foley catheter, skin traction on the left leg and an IV cannula. Back skin intact.", dateLabel: "9 Jul 2026", verbatim: "patient got admitted the ward by trolly with IP and OP file. patient having foleys catheter. patient having skin traction over the left leg. patient having IV cannula. patient on oxygen with nasal prongs of 4 ltr", cite: { page: 58, rid: "p58-admit" }, also: [{ page: 58, rid: "p58-dx" }, { page: 140, rid: "p140-admit" }, { page: 89, rid: "p89-cannula" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "rpt30", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Work-up before surgery", detail: "Medicine and pulmonary consultations were requested and taken on 9 to 10 Jul. Surgery was posted for the next day on the 10 Jul round. PAC chart was viewed at 9:15 pm on 10 Jul. An eye consultation is noted the same night.", dateLabel: "9 to 10 Jul 2026", verbatim: "8:15pm Medicine consultation put. 1:15am Pulmonology consultation online done. 9:15am Rounds done, advised to continue same treatment and posted tomorrow. 9:15pm PAC chart viewed", cite: { page: 59, rid: "p59-consults" }, also: [{ page: 60, rid: "p60-rounds" }, { page: 61, rid: "p61-ptcd" }, { page: 64, rid: "p64-pac" }, { page: 64, rid: "p64-eye" }], confidence: 0.75, handwritten: true, flags: [] },
  { id: "rpt31", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Hospital course (discharge summary)", detail: "Diagnosed clinically and on imaging; after pre-anaesthetic clearances and consents, operated on 11/07/2026. Intra-operative and post-operative period uneventful. Wound inspected on POD2 and POD4 and found healthy. Supervised physiotherapy with partial weight bearing mobilisation. Symptomatically better at discharge.", dateLabel: "9 to 16 Jul 2026", verbatim: "The patient came with the above mentioned complaints and was clinicoradiologically diagnosed as mentioned above. After appropriate pre-anaesthetic clearances and informed consents, the patient underwent on 11/07/2026. Intra-op and Post-op period was uneventful. Wound inspection was done as per unit protocol on POD2, POD4, and was found to be healthy. The patient underwent supervised physiotherapy in the form of PWB mobilization with crutches, knee ROM, sQSE, ankle pumps. The patient is symptomatically better, hence being discharged with the following advice", cite: { page: 166, rid: "p166-course" }, also: [{ page: 166, rid: "p166-icu" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt32", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Surgical oncology opinion", detail: "Old case of SCC over the natal cleft, wide local excision with primary closure in 2016; biopsy well differentiated SCC, margin free; last follow up Jan 2023. Scar healthy, no sign of local recurrence. Orthopaedics to proceed with the planned procedure.", dateLabel: "9 Jul 2026", verbatim: "Old case of SCC over natal cleft -> S/P WLE + 1° closure done in 2016. Last follow up - Jan 2023. Biopsy -> WD SCC -> margin free. L/E: Scar healthy. No signs of any LRR. Orthopaedics to proceed with planned procedure.", cite: { page: 187, rid: "p187-opinion" }, also: [{ page: 200, rid: "p200-note" }, { page: 37, rid: "p37-advice" }, { page: 38, rid: "p38-reply" }, { page: 37, rid: "p37-scc" }], confidence: 0.78, handwritten: true, flags: [] },
  { id: "rpt33", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Skin traction, urinary catheter and drain", detail: "Skin traction with 3 kg weight before surgery. Foley's catheter (insertion date written as 09/07/26 on one transfer sheet and 10/7/26 on another); clamp and release from 13 Jul with removal ordered for 14 Jul at 6 am. Surgical drain placed on 11 Jul.", dateLabel: "9 to 14 Jul 2026", verbatim: "Monitor vitals, BP Q6H, W/F soakage, inform SOS · Chest physio: DBE, Incentive spirometry · Physio (BD): Make her stand followed by PWB mobilization with walker; QSE, Ankle pumps · T. LIMCEE 500  1-0-1 · clamp & release catheter Q4H · Remove catheter tomorrow (6am)", cite: { page: 230, rid: "p230-orders" }, also: [{ page: 217, rid: "p217-orders" }, { page: 212, rid: "p212-lines" }, { page: 214, rid: "p214-lines" }], confidence: 0.82, handwritten: true, flags: [] },
  { id: "rpt34", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Cardiology opinion", detail: "Echo normal study with EF 65%, ECG normal sinus rhythm. Can be taken up for the planned surgery under added cardiac risk.", dateLabel: "10 Jul 2026", verbatim: "Case details noted · ECHO - (N) study, 65% EF · ECG - NSR · Planned for (L) Bipolar hemiarthroplasty · Adv: pt. can be taken up for planned Sx under (arrow symbol) added cardiac risk.", cite: { page: 185, rid: "p185-opinion" }, also: [{ page: 164, rid: "p164-subconsult" }, { page: 39, rid: "p39-advice" }, { page: 39, rid: "p39-planned" }, { page: 40, rid: "p40-request" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt35", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Pulmonology opinion before surgery", detail: "No active respiratory complaints; history of acute bronchitis in Jan 2026; biomass exposure marked positive. D-dimer and room air ABG were advised; D-dimer 2.3, so CT pulmonary angiography was done to rule out pulmonary thromboembolism. On review, the patient can be taken up for surgery under high risk if surgery cannot be postponed.", dateLabel: "10 to 11 Jul 2026", verbatim: "CTPA ✓ · D-dimer = 2.3 · ABG ✓ · Vitals: BP 133/84 mmHg · PR 80 bpm · RR 23 bpm · SpO2 97% with 4L, 85% with RA · R/S: B/L NVBS · Patient can be taken up for surgery under high risk if surgery cannot be postponed.", cite: { page: 192, rid: "p192-review" }, also: [{ page: 190, rid: "p190-history" }, { page: 191, rid: "p191-ddimer" }, { page: 191, rid: "p191-vitals" }, { page: 164, rid: "p164-subconsult" }, { page: 45, rid: "p45-advise-ctpa" }, { page: 45, rid: "p45-advice-1" }, { page: 46, rid: "p46-reply" }, { page: 46, rid: "p46-request" }], confidence: 0.78, handwritten: true, flags: [] },
  { id: "rpt36", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Ophthalmology opinion", detail: "Seen at the bedside for itching and discharge in both eyes for 2 days. Greenish discharge at the fornix in both eyes; impression acute bacterial conjunctivitis. Mosi and Eyemist eye drops 1-1-1-1 in both eyes for 2 weeks.", dateLabel: "10 Jul 2026", verbatim: "Discharge ++ @ fornix (BE) (greenish) · Imp: Acute Bacterial conjunctivitis · Adv: G. MOSI 1-1-1-1, G. EYEMIST 1-1-1-1 (BE) x 2 weeks · R/w in Eye OPD (1) once stable & shiftable (mon, wed, fri)", readerNote: "The visual acuity entry could not be read", cite: { page: 195, rid: "p195-impression" }, also: [{ page: 194, rid: "p194-history" }, { page: 164, rid: "p164-subconsult" }, { page: 36, rid: "p36-findings" }, { page: 35, rid: "p35-exam" }, { page: 35, rid: "p35-imp" }, { page: 35, rid: "p35-adv" }, { page: 36, rid: "p36-request" }], confidence: 0.65, handwritten: true, flags: ["partlyRead"] },
  { id: "rpt37", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Physiotherapy", detail: "Before surgery: deep breathing and incentive spirometry. From POD 2 (13 Jul): made to stand, partial weight bearing walking with a walker, static quadriceps and ankle exercises; later heel slides, straight leg raise and edge of bed sitting.", dateLabel: "10 to 16 Jul 2026", verbatim: "PT Rx: Deep breathing Ex · Incentive Spirometry (900 cc/sec) · static Quads · Ankle toe movements · pt was made to stand with walker · PWB ambulation with walker", cite: { page: 246, rid: "p246-physio-9" }, also: [{ page: 248, rid: "p248-physio-pre" }, { page: 246, rid: "p246-physio-10" }, { page: 247, rid: "p247-physio-11" }, { page: 230, rid: "p230-orders" }], confidence: 0.82, handwritten: true, flags: [] },
  { id: "rpt38", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Received in ICU, 11 Jul 2026", detail: "Hourly charting starts at 17:00 on 11 Jul and the last entries are at 12:00 on 12 Jul.", dateLabel: "11 Jul 2026", verbatim: "Patient rec[...] to OT", readerNote: "Partly read. A note written upright along the 16:00 column reads as 'Patient received... to OT'", cite: { page: 1, rid: "p1-received" }, also: [{ page: 2, rid: "p2-vitals-17" }, { page: 4, rid: "p4-vitals-12" }], confidence: 0.6, handwritten: true, flags: ["partlyRead"] },
  { id: "rpt39", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "HDU stay after surgery", detail: "Received in HDU at 5 pm on 11 Jul, conscious and oriented, left leg dressing with drain. Liquid diet started at 9:30 pm. Shifted back to the ward at 12 noon on 12 Jul on 1 L oxygen.", dateLabel: "11 to 12 Jul 2026", verbatim: "5pm patient received to HDU. patient General condition conscious & oriented. 9:30pm liquid diet started. 12pm Transfer summary: Patient shifted to the ward, on 1L of O2 through nasal prongs", cite: { page: 68, rid: "p68-hdu" }, also: [{ page: 69, rid: "p69-npo" }, { page: 73, rid: "p73-shift" }, { page: 75, rid: "p75-ward" }, { page: 140, rid: "p140-transfer" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt40", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Pulmonology review after surgery", detail: "CT pulmonary angiography negative for acute pulmonary thromboembolism, with bilateral dependent basal atelectasis. Continue Duolin Q8H and Budecort Q12H nebulisation and oxygen to keep saturation above 90%, chest physiotherapy and incentive spirometry.", dateLabel: "11 Jul 2026", verbatim: "CTPA: (R) & (L) PA prominent, but no e/o acute PTE; B/L (R>L) dependent basal atelectasis · Vitals: BP 146/73 mmHg, PR 77 bpm, RR 15 cpm, SpO2 99% with 6 L O2 via face mask · 1) CTPA (-) 2) Continue nebulized bronchodilators (NEB DUOLIN Q8H, NEB BUDECORT Q12H) and oxygen supplementation (to maintain O2 sat > 90%) 3) Chest Physiotherapy 4) Incentive Spirometry", cite: { page: 193, rid: "p193-review" }, also: [{ page: 43, rid: "p43-advice" }, { page: 43, rid: "p43-request" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "rpt41", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Blood sugar after surgery", detail: "GRBS was 276 mg/dl at 6:30 am on 12 Jul. Medicine advised Human Actrapid 6 units SC. Glimy M1 was withheld that day. Sugars were then covered with Actrapid doses on Medicine advice until 15 Jul.", dateLabel: "12 Jul 2026", verbatim: "GRBS - 276 mg/dl ... advised to give Inj. H. Actrapid 6 unit s/c. T. GLIMY M1 not given, Medicine PG advised to withhold today & give Inj Actrapid today", cite: { page: 71, rid: "p71-grbs" }, also: [{ page: 72, rid: "p72-withheld" }, { page: 122, rid: "p122-insulin" }], confidence: 0.82, handwritten: true, flags: [] },
  { id: "rpt42", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Progress after surgery", detail: "POD 1 (12 Jul): drain 40 ml, dressing dry, intake/output 2550/1440 ml, shifted from HDU to the ward. POD 2: drain 6 ml, partial weight bearing mobilisation. POD 3: no soakage. POD 4: wound inspection that day. POD 5 (16 Jul): vitals stable, no fresh complaints, discharge.", dateLabel: "12 to 16 Jul 2026", verbatim: "Vitals: HR 72/min · BP 123/74 · RR 14/min · SpO2 97% 1L O2 · GRBS: 276 · BP: 123/74 · postop Hb: 10.4 <- 12.0 · DT: 40ml · Dressing: No soakage · I/O: 2550/1440 ml · plan: Shift to ward, physio", cite: { page: 202, rid: "p202-pod1" }, also: [{ page: 203, rid: "p203-pod2" }, { page: 204, rid: "p204-pod3" }, { page: 206, rid: "p206-pod4" }, { page: 208, rid: "p208-pod5" }], confidence: 0.86, handwritten: true, flags: [] },
  { id: "rpt43", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Wound, drain and physiotherapy", detail: "Drain output 6 ml on the morning of 13 Jul. Dressing changed and drain removed at about 10 am, physiotherapy informed and done by 11 am. Knee immobilizer advised on the evening round of 14 Jul.", dateLabel: "13 to 14 Jul 2026", verbatim: "5:40am DT: 6ml. (10am, partly read) dressing change ... DT removed. (11am, partly read) physiotherapy done. 5:30pm Rounds done by ortho 4, Advised to knee immobilizer", readerNote: "The entries for later that morning are hard to read", cite: { page: 77, rid: "p77-day" }, also: [{ page: 76, rid: "p76-drain" }, { page: 81, rid: "p81-immobilizer" }, { page: 121, rid: "p121-vitals" }], confidence: 0.6, handwritten: true, flags: ["partlyRead"] },
  { id: "rpt44", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Urinary catheter removal", detail: "Catheter was clamped and released from 13 Jul. At 6 am on 14 Jul the patient had no sensation on clamping and the doctor advised not to remove it. That evening sensation was present and the catheter was removed at 9:30 pm.", dateLabel: "13 to 14 Jul 2026", verbatim: "6am Patient is not having sensation while clamping foleys catheter. Advised not to remove catheter until further order. (9:30pm, partly read) urinary catheter sensation present, and catheter removed", cite: { page: 79, rid: "p79-catheter" }, also: [{ page: 81, rid: "p81-catheter" }, { page: 124, rid: "p124-catheter" }], confidence: 0.75, handwritten: true, flags: [] },
  { id: "rpt45", domain: "RPT", encounterId: "E1", role: "course", group: "Course", title: "Pulmonology review for oxygen saturation drop", detail: "Reviewed for a saturation drop: SpO2 91% on room air, pulse 108, BP 172/84, bibasilar creps; ? volume overload or basal atelectasis. Advised NT-proBNP, strict intake and output charting, oxygen at 1 L/min to keep SpO2 above 90% and incentive spirometry.", dateLabel: "14 Jul 2026", verbatim: "Baseline SpO2 (Jan 26) = 99% RA · Baseline SpO2 @ presentation 91% RA (ED sheet) · O/E: SOB (-) · PR 108 b/m · SpO2 91% RA · BP 172/84 mmHg · RR 22 cpm · R/S: bibasilar creps + · ? volume overload / Basal atelectasis · 1) NT-Pro BNP 2) Strict I/O charting 4) Maintain I=O 5) Continue O2 @ 1 L/min (SpO2 > 90%) 6) Incentive spirometry", readerNote: "The page is hard to read and undated", cite: { page: 196, rid: "p196-review" }, also: [{ page: 193, rid: "p193-referral-10" }, { page: 236, rid: "p236-orders" }, { page: 42, rid: "p42-advice" }, { page: 43, rid: "p43-request-10nov" }, { page: 42, rid: "p42-oe" }, { page: 42, rid: "p42-imp" }], confidence: 0.6, handwritten: true, flags: ["lowConfidence", "partlyRead"] },
  { id: "rpt46", domain: "RPT", encounterId: "E1", role: "hospitalMeds", group: "Course", title: "Medicines given in hospital", detail: "IV Augmentin 1.2 g Q12H (11 to 16 Jul) and IV Teiconin 400 mg (2 doses); IV tramadol alternating with IV paracetamol, Emeset before tramadol; Clexane 0.4 ml SC once daily (withheld 10 Jul); Human Actrapid SC by sugar readings; Duolin and Budecort nebulisations; Gastrorid/Pan, Chymoral BR, Rozavel, Stamlo, Evion, Limcee, Mosi and Just Tears eye drops. Glimy M1 is marked W/H on 12 to 14 Jul.", dateLabel: "9 to 16 Jul 2026", verbatim: "Inj AUGMENTIN 1.2g IV Q12H (D1) · Inj TEICONIN 400mg IV Q24H (D1/D2) · Inj TRAMADOL 50mg/100ml NS IV Q12H alt Inj FINAMAC 1g IV Q12H · Inj EMESET 4mg IV 30 min before TRAMADOL · Inj PAN 40mg IV STAT · IVF NS/RL till NPO · After NPO: T. CHYMORAL BR 1-0-1", cite: { page: 224, rid: "p224-postop" }, also: [{ page: 225, rid: "p225-postop" }, { page: 216, rid: "p216-orders" }, { page: 226, rid: "p226-orders" }, { page: 227, rid: "p227-orders" }, { page: 228, rid: "p228-orders" }, { page: 242, rid: "p242-orders" }, { page: 243, rid: "p243-orders" }, { page: 1, rid: "p1-inf-1" }, { page: 1, rid: "p1-inf-2" }, { page: 1, rid: "p1-inf-3" }, { page: 1, rid: "p1-inf-4" }, { page: 42, rid: "p42-rx" }, { page: 46, rid: "p46-rx" }, { page: 64, rid: "p64-preop-meds" }, { page: 65, rid: "p65-npo" }, { page: 69, rid: "p69-eye" }, { page: 79, rid: "p79-eye" }, { page: 79, rid: "p79-dulcolax" }, { page: 80, rid: "p80-refused" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "rpt47", domain: "RPT", encounterId: "E1", role: "dischargeDate", group: "Course", title: "Discharged on 16 Jul 2026", detail: "Admitted 09/07/2026, discharged 16/7/2026.", dateLabel: "16 Jul 2026", verbatim: "09/07/2026 · 16/7/2026", cite: { page: 164, rid: "p164-dates" }, also: [{ page: 144, rid: "p144-admitted" }, { page: 208, rid: "p208-pod5" }, { page: 48, rid: "p48-discharge" }, { page: 140, rid: "p140-discharge" }, { page: 84, rid: "p84-discharge" }, { page: 93, rid: "p93-checklist" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt48", domain: "RPT", encounterId: "E1", role: "conditionAtDischarge", group: "Course", title: "Condition at discharge", detail: "Stable, afebrile. Partial weight bearing with walker, on knee immobilizer. Bedsore over the right gluteal region with a coloplast patch applied. The admission record marks the result as Improved.", dateLabel: "16 Jul 2026", verbatim: "Stable, afebrile · PWB with walker · On knee immobilizer · Bedsore present over right gluteal region- coloplast patch applied", cite: { page: 166, rid: "p166-condition" }, also: [{ page: 144, rid: "p144-result" }, { page: 84, rid: "p84-discharge" }, { page: 93, rid: "p93-checklist" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt49", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "Admission order and plan of care (9 Jul 2026)", detail: "Admitted under Orthopaedics on 09/07/26 at 4 pm, general bed category. Plan of care: left bipolar hemiarthroplasty; purpose diagnostic and curative; built and nourishment moderate, no signs of deficiency; diabetic and hypertensive diet; physiotherapy; senior citizen.", dateLabel: "9 Jul 2026", verbatim: "Dept/Unit Orthopaedics · Date 09/07/26 Time 4pm · Bed Category General", cite: { page: 48, rid: "p48-admit" }, also: [{ page: 47, rid: "p47-care" }, { page: 47, rid: "p47-plan" }, { page: 141, rid: "p141-plan" }], confidence: 0.9, handwritten: true, flags: [] },
  { id: "rpt50", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "Habits", detail: "Smoking: No. Alcohol: No.", dateLabel: "9 Jul 2026", verbatim: "Habits: Smoking Yes [ ] No [x]. Alcohol Yes [ ] No [x]", cite: { page: 86, rid: "p86-habits" }, confidence: 0.9, handwritten: true, flags: [] },
  { id: "rpt51", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "IV cannulas", detail: "Right hand 20G on 9 Jul, removed 11 Jul for leaking. Left hand 18G placed in theatre on 11 Jul, removed 14 Jul for leaking. Right hand 20G on 14 Jul, removed at discharge on 16 Jul.", dateLabel: "9 to 16 Jul 2026", verbatim: "DATE 09/07/26 TIME 1:35pm SITE (R) hand SIZE 20G ... REASON: leaking. DATE 11/7/26 SITE (L) hand SIZE 18G INSERTED BY: OT ... DATE 14/7/26 TIME 11am SITE (R) hand SIZE 20G ... REASON: Discharge", cite: { page: 89, rid: "p89-cannula" }, confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt52", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "Risk scores on admission", detail: "DVT risk total score 9, low risk (<10%). Fall risk score 02. Pressure ulcer risk score 17.", dateLabel: "9 Jul 2026", verbatim: "TOTAL SCORE: 9. LOW RISK (<10%) SCORE 7-10 [x] / FALL RISK ASSESSMENT Score: 02 / Pressure ulcer risk assessment score: 17", cite: { page: 91, rid: "p91-dvt" }, also: [{ page: 87, rid: "p87-scores" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt53", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "Sub-consultations listed on the discharge summary", detail: "Cardiology (surgical clearance), Pulmonology (acute bronchitis and decreased SpO2 saturation) and Ophthalmology (eye discharge); advice followed for all three.", dateLabel: "9 to 16 Jul 2026", verbatim: "Cardio 1: surgical clearance, Advice followed · PUL 2: i/v/o Acute bronchitis and decreased SpO2 saturation, Advice followed · Eye 1: i/v/o eye discharge, Advice followed", cite: { page: 164, rid: "p164-subconsult" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt54", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", hold: true, title: "Background notes in the margin of the Pulmonology record", detail: "", dateLabel: "10 Jul 2026", verbatim: "TB/COVID [..] · Family (-) · Addiction (-) · Bio[..] (+) · Walks 1.5 [..] · Occupation [..]", readerNote: "A column of short entries beside the 10 Jul Pulmonology note (TB/COVID, family, addiction, biomass, walks, occupation) with plus and minus marks could not be read reliably", cite: { page: 46, rid: "p46-margin" }, confidence: 0.45, handwritten: true, flags: ["lowConfidence"] },
  { id: "rpt55", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "Skin on admission", detail: "On 10 Jul: back skin intact, dry and fragile skin, blackish discolouration in the right hand. Before theatre on 11 Jul: a blister over the back, 5 cm, near the lower back.", dateLabel: "10 to 11 Jul 2026", verbatim: "Back skin intact. dry skin with fragile skin present. Blackish discolouration present in right hand / 5cm blister present near lower back", cite: { page: 60, rid: "p60-skin" }, also: [{ page: 67, rid: "p67-blister" }], confidence: 0.78, handwritten: true, flags: [] },
  { id: "rpt56", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "Nutrition and diet", detail: "NRS score 02, at nutritional risk on 10 Jul. About 1600 kcal and 60 g protein a day, diabetic low salt soft diet. On 15 Jul the reassessment says NRS score 02, not at nutritional risk.", dateLabel: "10 Jul 2026", verbatim: "NRS/PNRS Score - 02. Nutritional Status - At Nutritional Risk. Calorie (Kcal): 1600 Approx/day. Protein (g): 60g Approx/day. Therapeutic Diet: Diabetic low salt soft diet", cite: { page: 94, rid: "p94-nutrition" }, also: [{ page: 95, rid: "p95-diet" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt57", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "Intake and output in ICU", detail: "11 Jul sheet: total intake 2550 ml, total output 1440 ml. Urine is charted every hour, 200 ml at first and 50 to 75 ml an hour overnight. 12 Jul sheet, 8:00 to 12:00: feed 100, 50 and 50 ml (running total 200); urine 50, 50, 30, 25 and 25 ml (running total 180).", dateLabel: "11 to 12 Jul 2026", verbatim: "Total intake: 2550 ml.   DT - 40ml.   Total output: 1440 ml.", readerNote: "A note beside the totals reads as 'DT - 40 ml'", cite: { page: 1, rid: "p1-totals" }, also: [{ page: 3, rid: "p3-io" }], confidence: 0.75, handwritten: true, flags: [] },
  { id: "rpt58", domain: "RPT", encounterId: "E1", role: "detail", group: "Course", title: "Consciousness and pupils in ICU", detail: "GCS is entered as 15 (E4V5M6) in every charted hour on both sheets. Pupils are entered as 2 mm / 2 mm.", dateLabel: "11 to 12 Jul 2026", verbatim: "GCS: 15, 15, 15, E4V5M6 ... · PUPILS (R/L): 2mm / 2mm", cite: { page: 1, rid: "p1-gcs" }, also: [{ page: 3, rid: "p3-gcs" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt59", domain: "RPT", encounterId: "E1", role: "followUp", group: "Course", title: "Suture removal on 25/7/2026 at local hospital", detail: "Suture removal on 25/7/2026 (Saturday) at the local hospital.", dateLabel: "25 Jul 2026", verbatim: "Suture removal on 25/7/2026(Saturday) at local hospital · Review in Orthopaedics OPD on 12/08/2026 (Wednesday) for follow up · Review in Pulmonology OPD on 12/08/2026 (Wednesday) for follow up. · KINDLY BRING WALKER ON REVIEW", cite: { page: 167, rid: "p167-follow-up" }, confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt60", domain: "RPT", encounterId: "E1", role: "followUp", group: "Course", title: "Review in Orthopaedics and Pulmonology OPD on 12/08/2026", detail: "Review in Orthopaedics OPD and in Pulmonology OPD on 12/08/2026 (Wednesday). Bring the walker.", dateLabel: "12 Aug 2026", verbatim: "Suture removal on 25/7/2026(Saturday) at local hospital · Review in Orthopaedics OPD on 12/08/2026 (Wednesday) for follow up · Review in Pulmonology OPD on 12/08/2026 (Wednesday) for follow up. · KINDLY BRING WALKER ON REVIEW", cite: { page: 167, rid: "p167-follow-up" }, also: [{ page: 168, rid: "p168-review-date" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt61", domain: "RPT", encounterId: "E1", role: "followUp", group: "Course", title: "Advice on discharge", detail: "Wound care and hygiene; change patch dressings once in 3 days; physiotherapy (partial weight bearing with walker, QSE, SLR, knee ROM, ankle pumps); no left hip adduction, flexion and internal rotation; chest physiotherapy; ice packs; abduction pillow between the legs.", dateLabel: "16 Jul 2026", verbatim: "Maintain hygiene and wound care · Continue medications as advised · Change patch dressings once in 3 days as advised · Continue physiotherapy as advised (PWB mobilization with walker, QSE, SLR, Knee ROM, ankle pumps) · NO LEFT HIP ADDUCTION,FLEXION AND INTERNAL ROTATION · Continue chest physio (DBE, Incentive spirometry) · Icepacks to continue · Abduction pillow between the legs to continue", cite: { page: 167, rid: "p167-advice" }, also: [{ page: 92, rid: "p92-education" }, { page: 85, rid: "p85-education" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt62", domain: "RPT", encounterId: "E1", role: "followUp", group: "Course", title: "Diet and when to call", detail: "Low salt diet, diabetic diet. Call the hospital if fever or pain.", dateLabel: "16 Jul 2026", verbatim: "low salt diet · Diabetic diet", cite: { page: 167, rid: "p167-diet" }, also: [{ page: 167, rid: "p167-contact" }], confidence: 0.95, handwritten: false, flags: [] },
  { id: "rpt63", domain: "RPT", encounterId: "E1", role: "followUp", group: "Course", title: "Eye OPD review once stable and shiftable", detail: "Review in eye OPD (1) once stable and shiftable; Monday, Wednesday or Friday.", dateLabel: "10 Jul 2026", verbatim: "R/w in eye OPD (1) once stable & shiftable. (mon, wed, fri)", cite: { page: 35, rid: "p35-followup" }, also: [{ page: 195, rid: "p195-impression" }], confidence: 0.78, handwritten: true, flags: [] },
  { id: "rpt64", domain: "RPT", encounterId: "E2", role: "course", group: "Course", title: "ED course and disposition, 9 Jul 2026", detail: "Arrived 1:15 PM on a stretcher; triage yellow, moderate. Seen by Orthopaedics at 2:15 PM and again at 3:35 PM. Treatment planned: admission, pre-operative work-up, skin traction. Admitted to the ward under Orthopaedics and shifted at 6:30 PM: conscious and oriented, 20G IV cannula in the right hand, SpO2 written as 99% maintained in room air.", dateLabel: "9 Jul 2026", verbatim: "Patient is Conscious, oriented. SPO2 99% Maintained in room air. Patient 20 G IV Cannula present in Right hand. Patient report handed over to the ward.", cite: { page: 5, rid: "p5-disposition" }, also: [{ page: 6, rid: "p6-disposition" }, { page: 7, rid: "p7-consult" }, { page: 12, rid: "p12-plan" }, { page: 10, rid: "p10-triage" }], confidence: 0.85, handwritten: true, flags: ["conflict"], conflictWith: { text: "Procedure log: oxygen 4 L by nasal prongs started at 2:20 PM; the hourly chart shows SpO2 94 to 96% up to 6 PM", page: 9, rid: "p9-proc-2" } },
  { id: "rpt65", domain: "RPT", encounterId: "E2", role: "course", group: "Course", title: "Emergency department treatment", detail: "Triage P3. Inj. Finamac 1 g IV, IV fluid RL at 75 ml/hr, Duolin and Budecort nebulisation (2 cycles), Inj. Hydrocort 100 mg IV stat and oxygen 4 L by nasal prongs. Provisional diagnosis written as ? IT fracture left, ? NOF fracture. Plan: admission, pre-operative work-up, skin traction.", dateLabel: "9 Jul 2026", verbatim: "1) Inj. FINAMAC 1g IV · 2) IVF RL @ 75 ml/hr · Neb Duolin 1 resp, Neb Budecort 1 resp: 2 cycle · Inj. Hydrocort 100mg IV stat · Oxygen mask 4 l via nasal prongs", cite: { page: 171, rid: "p171-treatment" }, also: [{ page: 170, rid: "p170-triage" }, { page: 172, rid: "p172-provisional" }, { page: 178, rid: "p178-plan" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt66", domain: "RPT", encounterId: "E2", role: "hospitalMeds", group: "Course", title: "IV fluid in the ED, 9 Jul 2026", detail: "IVF RL 500 ml at 75 ml/hr, started 2:15 PM.", dateLabel: "9 Jul 2026", verbatim: "(2) IVF RL @ 75 ml/hr", cite: { page: 19, rid: "p19-rx-ivf" }, also: [{ page: 8, rid: "p8-ivf" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "rpt67", domain: "RPT", encounterId: "E2", role: "detail", group: "Course", title: "Skin findings noted by nursing, 9 Jul 2026", detail: "Scar mark present on the buttocks and blackish discolouration over the right hand.", dateLabel: "9 Jul 2026", verbatim: "Scar mark present in Buttocks & Blackish discolouration over Right hand.", cite: { page: 9, rid: "p9-skin" }, confidence: 0.7, handwritten: true, flags: ["partlyRead"] },
  { id: "rpt68", domain: "RPT", encounterId: "E2", role: "detail", group: "Course", title: "Orthopaedic examination, 9 Jul 2026", detail: "Left lower limb shortened and externally rotated, tenderness over the left hip; movement of the left hip and knee could not be assessed due to pain. No external injuries, no swelling. Right hip, knee and both ankles move within normal limits; active toe movements present on both sides; distal pulses palpable, distal sensation intact. Nil significant injuries of the upper limbs, spine, pelvis, abdomen, chest, face and skull.", dateLabel: "9 Jul 2026", verbatim: "Left lower limb shortened and externally rotated - No external injuries - No swelling - Tenderness present over left hip - ROM left hip and knee couldn't be assessed due to pain", cite: { page: 14, rid: "p14-lower-limb" }, also: [{ page: 12, rid: "p12-other-injury" }, { page: 13, rid: "p13-spine" }, { page: 15, rid: "p15-upper-limb" }, { page: 18, rid: "p18-survey" }, { page: 176, rid: "p176-local-exam" }, { page: 182, rid: "p182-local-exam" }, { page: 172, rid: "p172-secondary-survey" }, { page: 164, rid: "p164-exam" }], confidence: 0.9, handwritten: true, flags: [] },
  { id: "rpt69", domain: "RPT", encounterId: "E2", role: "detail", group: "Course", title: "History after the injury", detail: "No loss of consciousness and no bleeding from ENT. Had not passed urine after the injury. No preliminary treatment given elsewhere; came by self-referral. Immunisation status not known.", dateLabel: "9 Jul 2026", verbatim: "H/o loss of consciousness: Absent. H/o bleeding from ENT: Absent. Hasn't passed urine (ticked). Preliminary treatment already given: No. Immunisation status: Not known", cite: { page: 16, rid: "p16-history" }, confidence: 0.9, handwritten: true, flags: [] },
  { id: "rpt70", domain: "RPT", encounterId: "E2", role: "detail", group: "Course", title: "How the injury happened", detail: "Slip and fall from stairs at home at 11 am on 09/07/2026; reached the trauma centre at 1:15 pm. The pre-anaesthetic record writes the date of the fall as 10/7/26.", dateLabel: "9 Jul 2026", verbatim: "Mechanism of Injury: Alleged history of slip and fall from stairs at [place removed] (Home) · Time and Date of Injury: 11am 09/07/2026 · H/o loss of consciousness: Absent · H/o bleeding from ENT: Absent · Referred by: self · Immunisation status: Not Known", cite: { page: 174, rid: "p174-mechanism" }, also: [{ page: 171, rid: "p171-mechanism" }, { page: 170, rid: "p170-triage" }, { page: 180, rid: "p180-hpi" }], confidence: 0.85, handwritten: true, flags: ["conflict"], conflictWith: { text: "A/H/O slip & fall in steps @ home on 10/7/26", page: 250, rid: "p250-history" } },
  { id: "rpt71", domain: "RPT", encounterId: "E3", role: "dischargeDate", group: "Course", title: "Discharged 22 Jan 2026", detail: "Discharge slip: date of discharge 22/1/26. Remarks: Discharge. Blood transfusion: No. No X-ray, investigation or dressing on the discharge day.", dateLabel: "22 Jan 2026", verbatim: "Date of Discharge 22/1/26 · Any Blood Transfusion? No · Remarks: Discharge", cite: { page: 50, rid: "p50-discharge" }, confidence: 0.85, handwritten: true, flags: [] },
  { id: "rpt72", domain: "RPT", encounterId: "E3", role: "detail", group: "Course", title: "Admission order and plan of care (16 Jan 2026)", detail: "Admitted under Medicine on 16/1/26, expected length of stay 7 days. Plan of care headed 'Medical': provisional diagnosis left lower lobe pneumonia, purpose curative, investigations CXR and ECG.", dateLabel: "16 Jan 2026", verbatim: "Dept/Unit Medicine · Date 16/1/26 · Expected Length of Stay 7 days", readerNote: "The diet tick marks are untidy and were not read", cite: { page: 50, rid: "p50-admit" }, also: [{ page: 49, rid: "p49-care" }, { page: 49, rid: "p49-prov-dx" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "rpt73", domain: "RPT", encounterId: "E4", role: "complaint", group: "Course", title: "Presenting complaint", detail: "Cough and generalised weakness for 3 days. The ED record adds mucoid expectoration, shortness of breath (mMRC grade 2) and low grade fever without chills for 3 days; no sweating, chest pain, vomiting, abdominal pain, orthopnoea or PND.", dateLabel: "16 Jan 2026", verbatim: "Cough and generalized weakness · Since from 3 days", cite: { page: 27, rid: "p27-complaint" }, also: [{ page: 31, rid: "p31-history" }], confidence: 0.88, handwritten: true, flags: ["conflict"], conflictWith: { text: "Medicine note the same day: cough 3 days, nonproductive, wheeze +, no SOB / PND, fever 1 episode with no chills", page: 21, rid: "p21-history" } },
  { id: "rpt74", domain: "RPT", encounterId: "E4", role: "course", group: "Course", title: "ED course and disposition, 16 Jan 2026", detail: "Arrived at 5 PM; triage P3, criticality moderate. ED plan: symptomatic management and review with reports. Medicine informed at 6:20 pm and seen at 6:50 pm; advised admission. IVF RL 500 ml at 75 ml/hr from 6 pm; no drugs are entered on the ED drug chart. Shifted at 9:35 PM to the ward under Medicine, conscious and oriented, 20G venflon in the right hand. Non-MLC.", dateLabel: "16 Jan 2026", verbatim: "Patient is conscious and oriented. Patient seen by ED PG and medicine PG. Advised for admission. Patient and party willing for admission. medicine reconciliation done. 20G Venflow secured on (R) hand.", cite: { page: 22, rid: "p22-transfer" }, also: [{ page: 23, rid: "p23-disposition" }, { page: 24, rid: "p24-consult" }, { page: 30, rid: "p30-plan" }, { page: 25, rid: "p25-ivf" }, { page: 29, rid: "p29-orders" }, { page: 31, rid: "p31-triage" }], confidence: 0.88, handwritten: true, flags: [] },
  { id: "rpt75", domain: "RPT", encounterId: "E4", role: "detail", group: "Course", title: "History in the Medicine note, 16 Jan 2026", detail: "Cough for 3 days, nonproductive, no blood, wheeze present, no SOB or PND. One episode of fever, no chills, no night sweats. General fatigue and reduced appetite. No focal deficit or altered sensorium, no bowel or bladder complaints, no travel history, no similar illness. Known T2DM and HTN; no history of RAD or IHD.", dateLabel: "16 Jan 2026", verbatim: "h/o cough -> 3 days, nonproductive, no blood, wheeze +, no SOB / PND. h/o fever 1 ep - no chills. h/o gen. fatigue, ↓ appetite. k/c/o T2DM, HTN. no h/o RAD / IHD", cite: { page: 21, rid: "p21-history" }, also: [{ page: 21, rid: "p21-kco" }], confidence: 0.8, handwritten: true, flags: [] },
  { id: "rpt76", domain: "RPT", encounterId: "E4", role: "detail", group: "Course", title: "Skin findings noted by nursing, 16 Jan 2026", detail: "Blackish discolouration of both upper limbs and the left lower limb.", dateLabel: "16 Jan 2026", verbatim: "Blackish discolouration bilateral upper and (L) lower limb.", cite: { page: 26, rid: "p26-skin" }, also: [{ page: 22, rid: "p22-transfer" }], confidence: 0.85, handwritten: true, flags: [] },
  { id: "rpt77", domain: "RPT", encounterId: "E4", role: "detail", group: "Course", title: "Examination, 16 Jan 2026", detail: "ED record: pallor present, pedal oedema present, no icterus, no clubbing; S1 S2 present; bilateral crepitations; abdomen soft and non-tender with bowel sounds; no focal neurological deficit; work of breathing marked as increased. Medicine note: crepitations in the left infrascapular and infra-axillary areas (written L ISA, IAA), heart sounds written as muffled, JVP not raised, abdomen and CNS NAD.", dateLabel: "16 Jan 2026", verbatim: "Pallor (+) icterus (-) clubbing (-) pedal oedema (+). CVS: S1 S2 (+). RS: B/L crepitations (+). P/A: soft, non tender, BS (+). CNS: no FND", cite: { page: 30, rid: "p30-exam" }, also: [{ page: 21, rid: "p21-oe" }, { page: 31, rid: "p31-breathing" }], confidence: 0.75, handwritten: true, flags: ["partlyRead"] },
];

const images = [
  { id: "img1", page: 269, rid: "p269-implant-labels", kind: "photo", title: "Implant sticker labels on the operation report", dateLabel: "11 Jul 2026" },
];

// Where pages disagree or a reading is in doubt, said in words.
const exceptions = [
  { id: "ex1", kind: "conflictingValue", title: "Blood loss at surgery: 200 ml or 500 ml", body: "The operation report gives an approximate blood loss of 200 ml. The anaesthetic record writes 500 ml.", findingId: "rpt23", cites: [{ label: "Operation report", page: 269, rid: "p269-closure" }, { label: "Anaesthetic record", page: 257, rid: "p257-record" }] },
  { id: "ex2", kind: "conflict", title: "Side of the fracture on the typed high-risk anaesthesia consent", body: "The consent's procedure line says 'Right NOF fracture', while its own next paragraph and every other page say left.", findingId: null, cites: [{ label: "High-risk anaesthesia consent", page: 254, rid: "p254-high-risk" }, { label: "Discharge summary", page: 164, rid: "p164-final-dx" }, { label: "Operation report", page: 268, rid: "p268-indication" }] },
  { id: "ex3", kind: "conflict", title: "Date of the fall", body: "The discharge summary, the orthopaedic case record and the IP assessment form give 09/07/26 (11 am). The pre-anaesthetic record writes 10/7/26, which is after the admission date.", findingId: "rpt70", cites: [{ label: "Discharge summary", page: 164, rid: "p164-hpi" }, { label: "Orthopaedic case record", page: 174, rid: "p174-mechanism" }, { label: "Pre-anaesthetic record", page: 250, rid: "p250-history" }] },
  { id: "ex4", kind: "conflict", title: "Telmisartan 40 mg: taken at home, missing afterwards", body: "General medicine and anaesthesia list Telma (telmisartan) 40 mg 1-0-1 as a current medicine. It is not on any in-hospital order sheet and not on the discharge list, and no page says it was stopped.", findingId: "med20", cites: [{ label: "General medicine consult", page: 189, rid: "p189-on-rx" }, { label: "Pre-anaesthetic record", page: 250, rid: "p250-drug-therapy" }, { label: "Discharge drug list", page: 167, rid: "p167-rx-stamlo" }] },
  { id: "ex5", kind: "conflictingValue", title: "Sodium and potassium on 9 Jul copied differently", body: "The investigation chart has Na 138 and K 3.6. The orthopaedic progress sheet and the pre-anaesthetic record have Na 137 and K 3.7. No printed report is in this file to settle it.", findingId: "lab8", cites: [{ label: "Investigation chart", page: 198, rid: "p198-biochem" }, { label: "Progress sheet 10 Jul", page: 200, rid: "p200-labs" }, { label: "Pre-anaesthetic record", page: 251, rid: "p251-investigations" }] },
  { id: "ex6", kind: "conflictingValue", title: "Sodium and potassium on 9 Jul copied differently", body: "The investigation chart has Na 138 and K 3.6. The orthopaedic progress sheet and the pre-anaesthetic record have Na 137 and K 3.7. No printed report is in this file to settle it.", findingId: "lab9", cites: [{ label: "Investigation chart", page: 198, rid: "p198-biochem" }, { label: "Progress sheet 10 Jul", page: 200, rid: "p200-labs" }, { label: "Pre-anaesthetic record", page: 251, rid: "p251-investigations" }] },
  { id: "ex7", kind: "conflict", title: "Chest X-ray read two ways", body: "General medicine describes left sided homogenous opacification of the lung field. Pulmonology writes 'rotated film, cannot comment'. No radiology report is in the file.", findingId: "rpt10", cites: [{ label: "General medicine consult", page: 189, rid: "p189-cxr" }, { label: "Pulmonology consult", page: 191, rid: "p191-cxr" }, { label: "Pre-anaesthetic record", page: 251, rid: "p251-cxr" }, { label: "Medicine note", page: 33, rid: "p33-cxr" }, { label: "Pulmonology note", page: 45, rid: "p45-cxr" }] },
  { id: "ex8", kind: "conflict", title: "Acute bronchitis: current or past", body: "The discharge summary lists acute bronchitis in the final diagnosis. The medicine and pulmonology notes date it to Jan 2026, and the pre-anaesthetic record mentions a recent chest infection with fever 2 weeks earlier, symptom free for 1 week.", findingId: "dx6", cites: [{ label: "Discharge summary", page: 164, rid: "p164-final-comorbid" }, { label: "General medicine consult", page: 188, rid: "p188-diagnosis" }, { label: "Pre-anaesthetic record", page: 250, rid: "p250-history" }] },
  { id: "ex9", kind: "conflict", title: "Temperature on arrival", body: "The orthopaedic examination sheet has 38.2 written in the printed 'Temp ... °C' field. The nurses' transfer summary the same evening records 98.8°F, and the patient is called afebrile on the pre-anaesthetic record.", findingId: "vit25", cites: [{ label: "Orthopaedic case record", page: 175, rid: "p175-general-exam" }, { label: "Transfer summary", page: 210, rid: "p210-vitals" }, { label: "Pre-anaesthetic record", page: 250, rid: "p250-physical-exam" }] },
  { id: "ex10", kind: "conflict", title: "Skin closure and surgery times in the operative records", body: "The steps of surgery say the skin was closed with stratafix, the wound closure table says staples. The operation report times surgery 14:00 to 16:00; the anaesthetic record writes about 1:45 pm to 4:25 pm, and has a mark on the General box although the technique written is spinal with nerve blocks.", findingId: "rpt23", cites: [{ label: "Operation report, steps", page: 269, rid: "p269-steps" }, { label: "Operation report, closure", page: 269, rid: "p269-closure" }, { label: "Operation report, times", page: 268, rid: "p268-anaesthesia" }, { label: "Anaesthetic record", page: 257, rid: "p257-record" }] },
  { id: "ex11", kind: "lowConfidence", title: "Hard handwriting on three consultation pages", body: "The undated pulmonology review (14 Jul), the ophthalmology visual acuity line, and the urea, creatinine and pre-operative sugar limit in the general medicine note were only partly readable. Values taken from them carry low confidence.", findingId: "rpt45", cites: [{ label: "Pulmonology review", page: 196, rid: "p196-review" }, { label: "Ophthalmology consult", page: 194, rid: "p194-history" }, { label: "General medicine consult", page: 189, rid: "p189-advice" }, { label: "General medicine labs", page: 189, rid: "p189-labs" }] },
  { id: "ex12", kind: "lowConfidence", title: "Frequency missing for Evion on the discharge list", body: "The frequency cell for Evion 400 is blank on the typed discharge list. The in-hospital orders gave it 0-1-0.", findingId: "med12", cites: [{ label: "Discharge drug list", page: 167, rid: "p167-rx-evion" }, { label: "Doctor's orders", page: 243, rid: "p243-orders" }] },
  { id: "ex13", kind: "lowConfidence", title: "Some hand-copied lab digits can be read two ways", body: "In the Medicine note of 9 Jul 2026 the writer's 5 and 3 look alike. Haemoglobin is taken as 12.0 because the Pulmonology note gives the same figure clearly. RBS (170 or 179), creatinine (0.48 and an unclear last digit), urea and TSH are less certain. None has a unit or range on the page.", findingId: null, cites: [{ label: "Medicine note", page: 33, rid: "p33-rbs" }, { label: "Medicine note", page: 33, rid: "p33-creat" }, { label: "Medicine note", page: 33, rid: "p33-hb" }, { label: "Pulmonology note", page: 45, rid: "p45-hb" }] },
  { id: "ex14", kind: "lowConfidence", title: "Sugar limit for surgery is overwritten", body: "Medicine's condition for surgery reads as pre-operative GRBS below 180 mg/dl, but the middle digit is written over and could be 150.", findingId: "rpt28", cites: [{ label: "Medicine advice", page: 33, rid: "p33-advice" }] },
  { id: "ex15", kind: "lowConfidence", title: "Pulmonology review of the saturation drop is undated and hard to read", body: "The reply to the 14 Jul request has no date or time and is in a difficult hand. BP is read as 172/84 (could be 123/84), the tramadol frequency and the 'SOB' mark are unclear, and the advice list skips number 3.", findingId: "vit4", cites: [{ label: "Request", page: 43, rid: "p43-request-10nov" }, { label: "Pulmonology reply", page: 42, rid: "p42-oe" }, { label: "Pulmonology reply", page: 42, rid: "p42-advice" }] },
  { id: "ex16", kind: "conflict", title: "Site of the old skin cancer is worded two ways", body: "Surgical Oncology writes SCC over the natal cleft. The requests and the other teams write right (upper) gluteal skin. Both describe the same 2016 excision.", findingId: null, cites: [{ label: "Surgical Oncology reply", page: 37, rid: "p37-scc" }, { label: "Consultation request", page: 38, rid: "p38-request" }] },
  { id: "ex17", kind: "lowConfidence", title: "Eye drop frequency and one acuity line not read", body: "The Ophthalmology advice gives the frequency of the two eye drops as tally marks, which were not turned into a number. One line about visual acuity in the left eye could not be read.", findingId: "med24", cites: [{ label: "Ophthalmology advice", page: 35, rid: "p35-adv" }, { label: "Ophthalmology reply", page: 36, rid: "p36-findings" }] },
  { id: "ex18", kind: "lowConfidence", title: "Eye drop frequency and one acuity line not read", body: "The Ophthalmology advice gives the frequency of the two eye drops as tally marks, which were not turned into a number. One line about visual acuity in the left eye could not be read.", findingId: "med25", cites: [{ label: "Ophthalmology advice", page: 35, rid: "p35-adv" }, { label: "Ophthalmology reply", page: 36, rid: "p36-findings" }] },
  { id: "ex19", kind: "conflictingValue", title: "Temperature on 9 Jul 2026 is written two ways", body: "The nursing triage form and the hourly chart give 98.8 F. The Orthopaedics examination form, filled half an hour later, gives 38.2 °C. 98.8 F is shown until you decide.", findingId: "vit24", cites: [{ label: "ED triage form", page: 10, rid: "p10-vitals" }, { label: "Orthopaedics examination form", page: 15, rid: "p15-general" }] },
  { id: "ex20", kind: "conflict", title: "Oxygen status at transfer to the ward, 9 Jul 2026", body: "The nursing disposition note at 6:30 PM says SpO2 99% maintained in room air. Earlier pages record SpO2 91% on room air at triage, oxygen 4 L by nasal prongs started at 2:20 PM, and 94 to 96% on the hourly chart. No page says when oxygen was stopped.", findingId: "rpt64", cites: [{ label: "Disposition summary", page: 5, rid: "p5-disposition" }, { label: "Procedure log", page: 9, rid: "p9-proc-2" }, { label: "ED trauma record", page: 20, rid: "p20-breathing" }] },
  { id: "ex21", kind: "lowConfidence", title: "Name of the 1 g IV injection is uncertain", body: "The first treatment order on 9 Jul 2026 is read as 'Finamac 1 g IV' on the doctor's order and on the nursing drug chart. The name could not be matched with certainty; the second letter may be E.", findingId: "med33", cites: [{ label: "ED treatment orders", page: 19, rid: "p19-rx-1" }, { label: "ED drug chart", page: 8, rid: "p8-drug-1" }] },
  { id: "ex22", kind: "conflict", title: "MLC status differs between forms, 9 Jul 2026", body: "The Orthopaedics injury form has MLC 'DONE' ticked. The ED trauma record has non-MLC marked, and the nursing sheet leaves both boxes blank.", findingId: null, cites: [{ label: "Orthopaedics injury form", page: 12, rid: "p12-mlc" }, { label: "ED trauma record", page: 20, rid: "p20-triage" }] },
  { id: "ex23", kind: "conflict", title: "Cough and breathlessness described differently, 16 Jan 2026", body: "The ED record says cough with mucoid expectoration and shortness of breath (mMRC grade 2). The Medicine note the same evening says nonproductive cough and no SOB. The examination also differs: bilateral crepitations in the ED record, left-sided crepitations in the Medicine note.", findingId: "rpt73", cites: [{ label: "ED non-trauma record", page: 31, rid: "p31-history" }, { label: "Medicine note", page: 21, rid: "p21-history" }, { label: "ED examination", page: 30, rid: "p30-exam" }] },
  { id: "ex24", kind: "conflictingValue", title: "Breathing rate at triage, 16 Jan 2026", body: "The nursing triage form gives RR 19/min; the ED doctor's record at the same time gives 24/min. The other vitals agree.", findingId: "vit27", cites: [{ label: "ED triage form", page: 27, rid: "p27-vitals" }, { label: "ED non-trauma record", page: 31, rid: "p31-breathing" }] },
  { id: "ex25", kind: "lowConfidence", title: "Last vitals row on 9 Jul 2026 partly unreadable", body: "In the 6 PM row of the ED chart the BP and temperature entries are scribbled and could not be read with confidence. The 1:30 PM handover SpO2 is also overwritten.", findingId: "vit22", cites: [{ label: "ED vitals chart", page: 6, rid: "p6-vitals-last" }] },
  { id: "ex26", kind: "conflictingValue", title: "Admission pulse: 92 or 81", body: "The nurse's record at 7 pm on 9 Jul reads PR 92 bpm, written over an earlier figure, and the handover sheet also says 92. The nursing initial assessment form of the same evening says 81 b/mt. 92 is shown until you decide.", findingId: "vit20", cites: [{ label: "Nurse's record", page: 58, rid: "p58-vitals" }, { label: "Nursing initial assessment", page: 86, rid: "p86-vitals" }, { label: "Handover sheet", page: 114, rid: "p114-vitals" }] },
  { id: "ex27", kind: "conflictingValue", title: "Catheter insertion date: 9 Jul or 10 Jul", body: "The insertion bundle and the nursing initial assessment say the urinary catheter was inserted on 9/7/26 (5:40 PM). The maintenance bundle writes the date of insertion as 10/7/26. 9 Jul is shown.", findingId: "proc3", cites: [{ label: "Insertion bundle", page: 125, rid: "p125-catheter" }, { label: "Maintenance bundle", page: 124, rid: "p124-catheter" }] },
  { id: "ex28", kind: "conflict", title: "CT pulmonary angiogram page is headed 10/7/26", body: "The sheet with the CT entries (8:45 am received at CT, 9:05 done) is headed 10/7/26 - continue. The nurse's record of 11/7 sends the patient to CT for CTPA at 8:30 am and the next page, headed 11/7/26, receives the patient back at 9:45 am. The CT is dated 11 Jul here.", findingId: null, cites: [{ label: "Nurse's record, CT entries", page: 62, rid: "p62-ct" }, { label: "Nurse's record, 11 Jul", page: 65, rid: "p65-ctpa" }] },
  { id: "ex29", kind: "conflictingValue", title: "Blood pressure on the morning of discharge", body: "The MEWS chart for 16 Jul marks systolic at 133 with diastolic written as 84. The blood pressure chart arrow for 8 AM on 16/7/26 reads about 123-133 over about 74. Both are read off hand-drawn charts.", findingId: "vit1", cites: [{ label: "MEWS chart", page: 130, rid: "p130-last" }, { label: "Blood pressure chart", page: 138, rid: "p138-bp" }] },
  { id: "ex30", kind: "lowConfidence", title: "Two GRBS values on 12 Jul can be read two ways", body: "On the insulin chart the 10:30 am value is read as 284 (could be 230) and the 3 pm value as 285 (could be 222). The time of the 245 reading is unclear on the chart; the nurse's record gives it at about 8 pm. The first row of the second insulin chart page has an overwritten date (10 or 15/7/26); it matches the nurse's record of 15 Jul.", findingId: "lab12", cites: [{ label: "Insulin chart", page: 122, rid: "p122-grbs" }, { label: "Insulin chart, continued", page: 123, rid: "p123-grbs" }, { label: "Nurse's record", page: 76, rid: "p76-grbs" }] },
  { id: "ex31", kind: "lowConfidence", title: "One nurse's entries on 13 to 16 Jul are only partly readable", body: "The entries on drain removal, dressing change, physiotherapy and catheter removal are in hard handwriting. Catheter removal at 9:30 pm on 14 Jul is confirmed by the maintenance bundle. Drain removal and physiotherapy on 13 Jul rest on this reading alone.", findingId: "rpt43", cites: [{ label: "Nurse's record, 13 Jul", page: 77, rid: "p77-day" }, { label: "Nurse's record, 14 Jul", page: 81, rid: "p81-catheter" }] },
  { id: "ex32", kind: "lowConfidence", title: "Vitals are read off a hand-plotted graph", body: "Blood pressure, pulse, temperature and breathing rate on the ICU sheets are marks on a graph, not written numbers. The figures given are approximate. Only SpO2 is written as a number.", findingId: "vit11", cites: [{ label: "ICU chart, 11 Jul", page: 2, rid: "p2-vitals-17" }, { label: "ICU chart, 12 Jul", page: 4, rid: "p4-vitals-12" }] },
  { id: "ex33", kind: "conflict", title: "Side of the drain differs between the two ICU sheets", body: "The 11 Jul sheet lists a left drain (DT) inserted on 11/7/26. The 12 Jul sheet has an entry read as a right surgical drain, with no date. The handwriting in both device lists is hard to read.", findingId: null, cites: [{ label: "ICU chart, 11 Jul", page: 1, rid: "p1-devices" }, { label: "ICU chart, 12 Jul", page: 3, rid: "p3-devices" }] },
  { id: "ex34", kind: "lowConfidence", title: "Procedure and arrival note partly read", body: "The second diagnosis line reads as 'hip Bipolar' with a side letter that is not clear, and the note along the 16:00 column is only partly readable. The chart does not state the operation date in words.", findingId: "rpt38", cites: [{ label: "ICU chart, 11 Jul", page: 1, rid: "p1-proc" }, { label: "ICU chart, 11 Jul", page: 1, rid: "p1-received" }] },
  { id: "ex35", kind: "unreadable", title: "Part of each A3 sheet is outside the scan", body: "The right edge of every page is cut off: the date box shows only '11/7' and '8/', and the hourly columns after about 02:00 to 06:00 are missing or only visible as a folded strip. Entries in those hours were not extracted.", findingId: null, cites: [{ label: "ICU chart, 11 Jul", page: 2, rid: "p2-vitals-17" }, { label: "ICU chart, 12 Jul", page: 3, rid: "p3-io" }] },
  { id: "ex36", kind: "conflictingValue", title: "Arterial pH: two readings for the same day", body: "Arterial pH 7.43 is shown for 10 Jul. Consultation records: Arterial pH 7.47. Both are hand-copied values; check the page.", findingId: "lab6", cites: [{ label: "Blood gas printout (11 Jul)", page: 259, rid: "p259-abg" }, { label: "Consultation record: Pulmonology, 10 Jul 2026 (back scanned first)", page: 45, rid: "p45-abg" }] },
  { id: "ex37", kind: "conflictingValue", title: "Creatinine: two readings for the same day", body: "Creatinine 0.50 is shown for 9 Jul. Consultation records: Creatinine 0.59. Both are hand-copied values; check the page.", findingId: "lab18", cites: [{ label: "Department of Medicine investigation chart", page: 198, rid: "p198-biochem" }, { label: "Consultation record: Medicine, 9 Jul 2026 (reply continues on the back, scanned first)", page: 33, rid: "p33-creat" }] },
];

// Things a doctor would expect in a folder like this that the reader did
// not find. Saying so is part of "no silent omission".
const notFound = [
  "Printed laboratory reports (only handwritten copies of the values, without units or reference ranges)",
  "ECG tracing and the echocardiogram report (only quoted in notes)",
  "X-ray films or a radiology report for chest, pelvis and left femur",
  "Original CT reports (CT brain, cervical spine and pulmonary angiography are only quoted in the discharge summary)",
  "Discharge summary and discharge medicines for the Jan 2026 admission",
  "Daily progress notes and treatment chart for the Jan 2026 admission",
  "NT-proBNP result (advised by pulmonology on 14 Jul)",
  "Thyroid ultrasound suggested by the CT report",
  "Progress note for 11 Jul (day of surgery)",
  "A written decision on telmisartan 40 mg (taken at home; not on the in-hospital orders or the discharge list)",
  "Blood group, and height (weight is written as about 61 kg on the pre-anaesthetic record only)",
  "Blood bank cross-match record",
  "Result of the HIV 1 & 2 antibodies test this form gives consent for",
  "Chest X-ray report of 16 Jan 2026",
  "Tetanus immunisation status (blank; immunisation written as not known)",
  "Cardiology reply to the 2D echo request of 20 Jan 2026",
];

// Normal results that are in the file but not listed row by row.
const labsNotShown = { count: 27, encounterId: "E1", names: "Lymphocytes, Monocytes, Eosinophils, Basophils, Absolute eosinophil count, Haematocrit, AST, ALT, ALP, Total protein, Albumin, Globulin, Total bilirubin, Direct bilirubin, APTT, Uric acid, Chloride, Blood gas glucose, Lactate, Blood gas haematocrit, HCO3-, HCO3 std, TCO2, BEecf, BE(B), Ca++ (7.4), THbc", cite: { page: 198, rid: "p198-cbc" } };

// The course as dated events. Dates are as written in the file.
const timeline = [
  { date: "16 Jan", title: "Arrived at the ED, 5 PM", detail: "Cough and generalised weakness for 3 days. Provisional diagnosis LRTI; chest X-ray written as left-sided haziness.", cite: { page: 27, rid: "p27-complaint" }, type: "ER", encounterId: "E4", id: "t1" },
  { date: "16 Jan", title: "Admitted under Medicine", detail: "Provisional diagnosis left lower lobe pneumonia; expected stay 7 days.", cite: { page: 50, rid: "p50-admit" }, type: "IPD", encounterId: "E3", key: true, id: "t2" },
  { date: "20 Jan", title: "2D echo requested", detail: "Request to Cardiology at 9 am; no reply on the page.", cite: { page: 51, rid: "p51-request" }, type: "IPD", encounterId: "E3", id: "t3" },
  { date: "22 Jan", title: "Discharged", detail: "Discharge slip dated 22/1/26.", cite: { page: 50, rid: "p50-discharge" }, type: "IPD", encounterId: "E3", key: true, id: "t4" },
  { date: "9 Jul", title: "Arrived at the ED, 1:15 PM", detail: "Fall from stairs at about 11 am; left hip pain. SpO2 91% on room air, GRBS 250 mg/dl.", cite: { page: 10, rid: "p10-triage" }, type: "ER", encounterId: "E2", id: "t5" },
  { date: "9 Jul", title: "Admitted under Orthopaedics", detail: "Closed left femur neck fracture; CT brain and cervical spine show no trauma related injury", cite: { page: 144, rid: "p144-admitted" }, type: "IPD", encounterId: "E1", key: true, id: "t6" },
  { date: "9 to 10 Jul", title: "Pre-operative opinions", detail: "Cardiology, surgical oncology, general medicine, pulmonology and ophthalmology", cite: { page: 185, rid: "p185-opinion" }, type: "IPD", encounterId: "E1", id: "t7" },
  { date: "11 Jul", title: "CT pulmonary angiography", detail: "D-dimer 2.3 and low oxygen: no acute pulmonary embolism; cleared under high risk", cite: { page: 165, rid: "p165-ctpa" }, type: "IPD", encounterId: "E1", id: "t8" },
  { date: "11 Jul", title: "Left hip bipolar hemiarthroplasty (cemented)", detail: "Spinal with nerve blocks; shifted to HDU", cite: { page: 268, rid: "p268-indication" }, type: "IPD", encounterId: "E1", key: true, id: "t9" },
  { date: "12 Jul", title: "Post-operative day 1", detail: "Post-op Hb 10.4; shifted to the ward", cite: { page: 202, rid: "p202-pod1" }, type: "IPD", encounterId: "E1", id: "t10" },
  { date: "13 Jul", title: "Oxygen trial off", detail: "Oxygen stopped in the morning. SpO2 88% on room air at 4:20 pm, restarted at 1 L.", cite: { page: 78, rid: "p78-desat" }, type: "IPD", encounterId: "E1", id: "t11" },
  { date: "13 Jul", title: "Stood and walked with a walker", detail: "Partial weight bearing mobilisation started", cite: { page: 246, rid: "p246-physio-9" }, type: "IPD", encounterId: "E1", id: "t12" },
  { date: "14 Jul", title: "Oxygen saturation drop", detail: "SpO2 91% on room air, pulse 108. ? Volume overload / basal atelectasis; NT-proBNP and strict intake/output advised. Hb 10.4.", cite: { page: 42, rid: "p42-advice" }, type: "IPD", encounterId: "E1", id: "t13" },
  { date: "14 Jul", title: "Catheter removed", detail: "Urinary catheter removed at 9:30 pm. Knee immobilizer advised. NT-pro BNP sent.", cite: { page: 124, rid: "p124-catheter" }, type: "IPD", encounterId: "E1", id: "t14" },
  { date: "16 Jul", title: "Discharged", detail: "Stable, afebrile, partial weight bearing with walker", cite: { page: 166, rid: "p166-condition" }, type: "IPD", encounterId: "E1", key: true, id: "t15" },
  { date: "25 Jul", title: "Follow-up was due", detail: "Suture removal on 25/7/2026 (Saturday) at the local hospital.", cite: { page: 167, rid: "p167-follow-up" }, type: "Plan", id: "t16" },
  { date: "12 Aug", title: "Follow-up was due", detail: "Review in Orthopaedics OPD and in Pulmonology OPD on 12/08/2026 (Wednesday). Bring the walker.", cite: { page: 167, rid: "p167-follow-up" }, type: "Plan", id: "t17" },
];

export const ARCHIVED_RECORDS_MOCK = {
  // Stated on the page cited. No name or identifier is ever held here.
  patient: { sex: "Female", age: 82, cite: { page: 164, rid: "p164-age-sex" } },
  source: {
    fileId: "Patient folder (sample)",
    fileName: "patient folder, 6 PDFs, 275 pages",
    facility: "Teaching hospital",
    totalPages: 275,
    language: "English",
    processedOn: "14 Nov 2026, 9:40 pm",
    trigger: "Prepared last night for today's appointment",
    engine: "Velora reader v0.3 (sample)",
    pagesWithData: 208,
    pagesFormsOnly: 67,
    pagesUnread: 0,
    files: files,
  },
  encounters,
  documents,
  pages,
  findings,
  images,
  exceptions,
  notFound,
  labsNotShown,
  timeline,
};

// A local-only copy of this bundle with the real dates and values may sit
// beside this file as archivedRecordsMock.local.js (git-ignored, never
// committed). When it exists, demos use it so the data agrees with the real
// scanned pages in public/case-file-local/. Everyone else gets the sample above.
let local = null;
try {
  // Resolved by the bundler at build time: an empty list when the file is absent.
  const found = require.context("./", false, /archivedRecordsMock\.local\.js$/);
  if (found.keys().length) local = found(found.keys()[0]).default;
} catch (error) {
  local = null;
}

export default local || ARCHIVED_RECORDS_MOCK;
