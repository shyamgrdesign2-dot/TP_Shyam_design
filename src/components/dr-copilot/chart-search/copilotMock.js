import { SUNITA_DEMO_RECORD, SUNITA_OVERVIEW, SUNITA_SOURCES, SUNITA_VISITS, sunitaVisitText } from './sunitaDemoRecord';

/**
 * Velora on made-up data, end to end.
 *
 * For design review and demos: every patient, appointment, answer, citation
 * and conversation here is invented. It answers the same endpoints the live
 * record search does, in the same shapes (copied from a real preprod turn),
 * so everything above the API layer - reply shapes, sessions, history,
 * redirects, the picker - runs exactly as it does live. Demo records stay isolated from live patient retrieval.
 *
 * Switched on with ?veloraMock=1 in the address bar (remembered in this
 * browser), off with ?veloraMock=0. The synthetic /copilot-v0 catalog always
 * uses demo chat; this route override is not persisted to other screens.
 */

const FLAG_KEY = "velora:mock"
const STORE_KEY = "velora:mock:sessions:v3"

let cached = null

/* Read the switch the moment this module loads, which is at app start (the
   boundary imports it). Waiting for the first call was too late: the app's
   own routing had already rewritten the address and dropped the query. */
function captureFlag() {
  try {
    const param = new URLSearchParams(window.location.search).get("veloraMock")
    if (param === "1") window.localStorage.setItem(FLAG_KEY, "1")
    if (param === "0") window.localStorage.removeItem(FLAG_KEY)
  } catch (e) {
    /* storage blocked: demo mode simply stays off */
  }
}
captureFlag()

/** The response catalog is a synthetic sandbox, including its chat. */
export function isCopilotDemoCatalog() {
  return typeof window !== "undefined" && /^\/copilot-v0\/?$/.test(window.location.pathname)
}

export function isCopilotMock() {
  // Do not persist this route override: leaving the catalog restores live mode.
  if (isCopilotDemoCatalog()) return true
  if (cached !== null) return cached
  try {
    const param = new URLSearchParams(window.location.search).get("veloraMock")
    if (param === "1") window.localStorage.setItem(FLAG_KEY, "1")
    if (param === "0") window.localStorage.removeItem(FLAG_KEY)
    /* A deploy can make demo data the default (REACT_APP_VELORA_DEMO=true,
       for a hosted preview with no record search behind it); ?veloraMock=0
       still turns it off. Unset, demo mode stays opt-in. */
    const demoDefault = process.env.REACT_APP_VELORA_DEMO === "true" && param !== "0"
    cached = window.localStorage.getItem(FLAG_KEY) === "1" || demoDefault
  } catch (e) {
    cached = false
  }
  return cached
}

/* ── The people ──────────────────────────────────────────────────────────── */

const D = (iso) => iso
const PRETTY = (iso) => {
  const [y, m, d] = iso.split("-").map(Number)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${d} ${months[m - 1]} ${y}`
}

function patient(uid, name, gender, age, phone, record, today = false) {
  /* The ID the portal shows a doctor ("PAT1001"), beside the internal uid. */
  return { uid, pid: `PAT${uid.slice(-4)}`, name, gender, age, phone, today, ...record }
}

const PATIENTS = [
  patient("MOCK1001", "Ramesh Patel", "M", 58, "9824012345", {
    conditions: [["Type 2 diabetes mellitus", D("2019-03-11")], ["Essential hypertension", D("2021-07-02")]],
    meds: [["Metformin", "500 mg twice daily", D("2026-08-12")], ["Telmisartan", "40 mg once daily", D("2026-08-12")]],
    labs: [["HbA1c", 8.1, "%", "4.0-5.6", "high", D("2026-08-12")], ["HbA1c", 7.6, "%", "4.0-5.6", "high", D("2026-05-04")], ["Fasting plasma glucose", 142, "mg/dL", "70-100", "high", D("2026-08-12")]],
    bp: [["148/92", D("2026-08-12")], ["142/88", D("2026-05-04")]],
    allergies: [["Sulfonamides", "skin rash", D("2020-11-20")]],
    family: [],
    visit: { date: D("2026-08-12"), dept: "Internal Medicine", doctor: "Dr. Sheela", advice: "Reduce salt, walk 30 minutes daily, recheck HbA1c in 3 months." },
  }, true),
  patient("MOCK1002", "Sunita Sharma", "F", 46, "9898123456", {
    ...SUNITA_DEMO_RECORD,
  }, true),
  patient("MOCK1003", "Arjun Mehta", "M", 34, "9925011223", {
    conditions: [["Bronchial asthma", D("2012-06-30")]],
    meds: [["Salbutamol inhaler", "2 puffs when needed", D("2026-09-02")], ["Budesonide-formoterol inhaler", "1 puff twice daily", D("2026-09-02")]],
    labs: [],
    bp: [["118/76", D("2026-09-02")]],
    allergies: [],
    family: [],
    visit: { date: D("2026-09-02"), dept: "Pulmonology", doctor: "Dr. Kiran Joshi", advice: "Use the controller inhaler daily, not only when wheezy." },
  }, true),
  patient("MOCK1004", "Priya Nair", "F", 29, "9978456123", {
    conditions: [["Iron deficiency anaemia", D("2026-06-18")]],
    meds: [["Ferrous ascorbate", "100 mg once daily", D("2026-06-18")], ["Folic acid", "5 mg once daily", D("2026-06-18")]],
    labs: [["Haemoglobin", 9.8, "g/dL", "12.0-15.5", "low", D("2026-06-18")], ["Serum ferritin", 8, "ng/mL", "15-150", "low", D("2026-06-18")]],
    bp: [["110/70", D("2026-06-18")]],
    allergies: [["Penicillin", "hives", D("2015-04-02")]],
    family: [],
    visit: { date: D("2026-06-18"), dept: "General Medicine", doctor: "Dr. Sheela", advice: "Iron-rich diet; take iron with vitamin C, away from tea." },
  }, true),
  patient("MOCK1005", "Mohammed Iqbal", "M", 63, "9909332211", {
    conditions: [["Coronary artery disease, post PCI", D("2024-02-09")], ["Dyslipidaemia", D("2023-11-15")]],
    meds: [["Aspirin", "75 mg once daily", D("2026-08-28")], ["Atorvastatin", "40 mg at night", D("2026-08-28")], ["Clopidogrel", "75 mg once daily", D("2026-08-28")]],
    labs: [["LDL cholesterol", 92, "mg/dL", "<70", "high", D("2026-08-28")]],
    bp: [["132/84", D("2026-08-28")]],
    allergies: [],
    family: [["Father", "Coronary artery disease"]],
    visit: { date: D("2026-08-28"), dept: "Cardiology", doctor: "Dr. Anand Rao", advice: "Continue dual antiplatelets; cardiac rehab walking programme." },
  }, true),
  patient("MOCK1006", "Kavita Desai", "F", 52, "9824765432", {
    conditions: [["Type 2 diabetes mellitus", D("2022-01-17")]],
    meds: [["Metformin", "1000 mg twice daily", D("2026-09-10")], ["Glimepiride", "1 mg once daily", D("2026-09-10")]],
    labs: [["HbA1c", 7.4, "%", "4.0-5.6", "high", D("2026-09-10")]],
    bp: [["142/90", D("2026-09-10")]],
    allergies: [],
    family: [["Father", "Coronary artery disease"], ["Mother", "Type 2 diabetes"]],
    visit: { date: D("2026-09-10"), dept: "Internal Medicine", doctor: "Dr. Sheela", advice: "Watch for low sugars with glimepiride; foot care reviewed." },
  }, true),
  // Not on today's list: reached through the search.
  patient("MOCK1007", "Anil Kumar", "M", 67, "9811122233", {
    conditions: [["Type 2 diabetes mellitus", D("2015-05-05")], ["Chronic kidney disease stage 3", D("2025-03-12")]],
    meds: [["Linagliptin", "5 mg once daily", D("2026-07-30")]],
    labs: [["HbA1c", 7.9, "%", "4.0-5.6", "high", D("2026-07-30")], ["Serum creatinine", 1.7, "mg/dL", "0.7-1.3", "high", D("2026-07-30")]],
    bp: [["146/90", D("2026-07-30")]], allergies: [], family: [],
    visit: { date: D("2026-07-30"), dept: "Nephrology", doctor: "Dr. Pooja Iyer", advice: "Avoid painkillers like ibuprofen; recheck kidney function in 3 months." },
  }),
  patient("MOCK1008", "Neha Joshi", "F", 38, "9876501234", {
    conditions: [["Hypothyroidism", D("2020-09-01")]], meds: [["Levothyroxine", "50 mcg once daily", D("2026-05-12")]],
    labs: [["TSH", 3.2, "mIU/L", "0.4-4.0", "normal", D("2026-05-12")]], bp: [["120/78", D("2026-05-12")]], allergies: [], family: [],
    visit: { date: D("2026-05-12"), dept: "Endocrinology", doctor: "Dr. Mehul Shah", advice: "Continue the same dose." },
  }),
  patient("MOCK1009", "Suresh Reddy", "M", 55, "9900887766", {
    conditions: [["Essential hypertension", D("2017-12-20")]], meds: [["Amlodipine", "5 mg once daily", D("2026-08-01")]],
    labs: [], bp: [["156/96", D("2026-08-01")]], allergies: [], family: [["Brother", "Coronary artery disease"]],
    visit: { date: D("2026-08-01"), dept: "Cardiology", doctor: "Dr. Anand Rao", advice: "Home BP log twice a day for two weeks." },
  }),
  patient("MOCK1010", "Fatima Shaikh", "F", 44, "9822334455", {
    conditions: [["Type 2 diabetes mellitus", D("2021-04-08")]], meds: [["Metformin", "500 mg twice daily", D("2026-06-25")]],
    labs: [["HbA1c", 6.6, "%", "4.0-5.6", "high", D("2026-06-25")]], bp: [["128/82", D("2026-06-25")]], allergies: [["Aspirin", "breathlessness", D("2019-01-10")]], family: [],
    visit: { date: D("2026-06-25"), dept: "Internal Medicine", doctor: "Dr. Sheela", advice: "Good control; continue." },
  }),
  patient("MOCK1011", "Vikram Singh", "M", 49, "9811998877", {
    conditions: [["Dyslipidaemia", D("2024-10-02")]], meds: [["Rosuvastatin", "10 mg at night", D("2026-04-14")]],
    labs: [["LDL cholesterol", 118, "mg/dL", "<100", "high", D("2026-04-14")]], bp: [["138/88", D("2026-04-14")]], allergies: [], family: [["Father", "Coronary artery disease"]],
    visit: { date: D("2026-04-14"), dept: "Cardiology", doctor: "Dr. Anand Rao", advice: "Diet review; repeat lipids in 3 months." },
  }),
  patient("MOCK1012", "Lakshmi Iyer", "F", 61, "9840011223", {
    conditions: [["Type 2 diabetes mellitus", D("2010-08-19")], ["Essential hypertension", D("2014-03-03")]], meds: [["Insulin glargine", "18 units at night", D("2026-08-20")]],
    labs: [["HbA1c", 9.2, "%", "4.0-5.6", "high", D("2026-08-20")]], bp: [["150/94", D("2026-08-20")]], allergies: [], family: [],
    visit: { date: D("2026-08-20"), dept: "Endocrinology", doctor: "Dr. Mehul Shah", advice: "Titrate insulin by 2 units every 3 days to fasting target." },
  }),
  patient("MOCK1013", "Rahul Verma", "M", 41, "9988776655", {
    conditions: [["Gastro-oesophageal reflux disease", D("2025-11-11")]], meds: [["Pantoprazole", "40 mg before breakfast", D("2026-03-03")]],
    labs: [], bp: [["122/80", D("2026-03-03")]], allergies: [], family: [],
    visit: { date: D("2026-03-03"), dept: "Gastroenterology", doctor: "Dr. Ritu Kapoor", advice: "Avoid late dinners; elevate the head of the bed." },
  }),
  // Same name as today's MOCK1001, on purpose: the bridge card has to tell
  // two Ramesh Patels apart by sex, age and mobile.
  patient("MOCK1015", "Ramesh Patel", "M", 31, "9712345680", {
    conditions: [["Allergic rhinitis", D("2024-03-19")]], meds: [["Cetirizine", "10 mg at night", D("2026-04-02")]],
    labs: [], bp: [["116/74", D("2026-04-02")]], allergies: [], family: [],
    visit: { date: D("2026-04-02"), dept: "ENT", doctor: "Dr. Neel Shah", advice: "Saline nasal rinse twice daily." },
  }),
  patient("MOCK1014", "Meera Pillai", "F", 57, "9847012345", {
    conditions: [["Osteoarthritis of knee", D("2023-07-07")]], meds: [["Paracetamol", "650 mg when needed", D("2026-02-18")]],
    labs: [], bp: [["134/86", D("2026-02-18")]], allergies: [], family: [["Mother", "Type 2 diabetes"]],
    visit: { date: D("2026-02-18"), dept: "Orthopaedics", doctor: "Dr. Sameer Bhat", advice: "Quadriceps strengthening exercises." },
  }),
  /* More diabetics, so a hospital-wide search returns a list long enough to
     need its own search. */
  patient("MOCK1016", "Suresh Nair", "M", 64, "9845011122", {
    conditions: [["Type 2 diabetes mellitus", D("2017-05-14")]], meds: [["Metformin", "500 mg twice daily", D("2026-08-28")]],
    labs: [["HbA1c", 8.6, "%", "4.0-5.6", "high", D("2026-08-28")], ["Fasting plasma glucose", 150, "mg/dL", "70-100", "high", D("2026-08-28")]],
    bp: [["152/94", D("2026-08-28")]], allergies: [], family: [],
    visit: { date: D("2026-08-28"), dept: "Internal Medicine", doctor: "Dr. Sheela", advice: "Diet control, daily walk, recheck HbA1c in 3 months." },
  }),
  patient("MOCK1017", "Anjali Verma", "F", 49, "9810223344", {
    conditions: [["Type 2 diabetes mellitus", D("2021-01-09")]], meds: [["Metformin", "500 mg twice daily", D("2026-07-11")]],
    labs: [["HbA1c", 7.2, "%", "4.0-5.6", "high", D("2026-07-11")], ["Fasting plasma glucose", 140, "mg/dL", "70-100", "high", D("2026-07-11")]],
    bp: [["128/82", D("2026-07-11")]], allergies: [], family: [],
    visit: { date: D("2026-07-11"), dept: "Endocrinology", doctor: "Dr. Mehul Shah", advice: "Diet control, daily walk, recheck HbA1c in 3 months." },
  }),
  patient("MOCK1018", "Rahul Gupta", "M", 55, "9820334455", {
    conditions: [["Type 2 diabetes mellitus", D("2019-11-22")]], meds: [["Metformin", "500 mg twice daily", D("2026-09-03")]],
    labs: [["HbA1c", 9.4, "%", "4.0-5.6", "high", D("2026-09-03")], ["Fasting plasma glucose", 155, "mg/dL", "70-100", "high", D("2026-09-03")]],
    bp: [["146/90", D("2026-09-03")]], allergies: [], family: [],
    visit: { date: D("2026-09-03"), dept: "Internal Medicine", doctor: "Dr. Anand Rao", advice: "Diet control, daily walk, recheck HbA1c in 3 months." },
  }),
  patient("MOCK1019", "Farah Khan", "F", 61, "9833445566", {
    conditions: [["Type 2 diabetes mellitus", D("2016-06-30")]], meds: [["Metformin", "500 mg twice daily", D("2026-06-19")]],
    labs: [["HbA1c", 6.8, "%", "4.0-5.6", "high", D("2026-06-19")], ["Fasting plasma glucose", 137, "mg/dL", "70-100", "high", D("2026-06-19")]],
    bp: [["138/88", D("2026-06-19")]], allergies: [], family: [],
    visit: { date: D("2026-06-19"), dept: "Endocrinology", doctor: "Dr. Pooja Iyer", advice: "Diet control, daily walk, recheck HbA1c in 3 months." },
  }),
  patient("MOCK1020", "Vijay Kulkarni", "M", 70, "9844556677", {
    conditions: [["Type 2 diabetes mellitus", D("2012-02-17")]], meds: [["Metformin", "500 mg twice daily", D("2026-08-05")]],
    labs: [["HbA1c", 8.0, "%", "4.0-5.6", "high", D("2026-08-05")], ["Fasting plasma glucose", 146, "mg/dL", "70-100", "high", D("2026-08-05")]],
    bp: [["158/96", D("2026-08-05")]], allergies: [], family: [],
    visit: { date: D("2026-08-05"), dept: "Cardiology", doctor: "Dr. Sheela", advice: "Diet control, daily walk, recheck HbA1c in 3 months." },
  }),
  patient("MOCK1021", "Neha Joshi", "F", 43, "9855667788", {
    conditions: [["Type 2 diabetes mellitus", D("2023-04-02")]], meds: [["Metformin", "500 mg twice daily", D("2026-09-12")]],
    labs: [["HbA1c", 7.7, "%", "4.0-5.6", "high", D("2026-09-12")], ["Fasting plasma glucose", 143, "mg/dL", "70-100", "high", D("2026-09-12")]],
    bp: [["124/80", D("2026-09-12")]], allergies: [], family: [],
    visit: { date: D("2026-09-12"), dept: "General Medicine", doctor: "Dr. Ritu Kapoor", advice: "Diet control, daily walk, recheck HbA1c in 3 months." },
  }),
  patient("MOCK1022", "Deepak Menon", "M", 58, "9866778899", {
    conditions: [["Type 2 diabetes mellitus", D("2018-09-25")]], meds: [["Metformin", "500 mg twice daily", D("2026-05-30")]],
    labs: [["HbA1c", 7.1, "%", "4.0-5.6", "high", D("2026-05-30")], ["Fasting plasma glucose", 139, "mg/dL", "70-100", "high", D("2026-05-30")]],
    bp: [["142/92", D("2026-05-30")]], allergies: [], family: [],
    visit: { date: D("2026-05-30"), dept: "Internal Medicine", doctor: "Dr. Mehul Shah", advice: "Diet control, daily walk, recheck HbA1c in 3 months." },
  }),
  patient("MOCK1023", "Pooja Reddy", "F", 52, "9877889900", {
    conditions: [["Type 2 diabetes mellitus", D("2020-12-03")]], meds: [["Metformin", "500 mg twice daily", D("2026-08-21")]],
    labs: [["HbA1c", 8.9, "%", "4.0-5.6", "high", D("2026-08-21")], ["Fasting plasma glucose", 152, "mg/dL", "70-100", "high", D("2026-08-21")]],
    bp: [["132/84", D("2026-08-21")]], allergies: [], family: [],
    visit: { date: D("2026-08-21"), dept: "Endocrinology", doctor: "Dr. Kiran Joshi", advice: "Diet control, daily walk, recheck HbA1c in 3 months." },
  }),
]

const byUid = new Map(PATIENTS.map((p) => [p.uid, p]))

/** Explicit demo mode only. A selected appointment can carry an arbitrary ID.
 * Give that demo identity a stable synthetic scenario, never fetch or alter its
 * real chart. Missing demographics stay missing rather than borrowing a donor's.
 */
export function registerMockPatient(option) {
  if (!isCopilotMock() || !option?.id || !option.label) return
  const uid = String(option.id)
  if (byUid.has(uid)) return
  const hash = [...uid].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0)
  const scenario = PATIENTS[hash % 6]
  const entry = { ...scenario, uid, pid: uid, name: option.label,
    age: option.age ?? null, gender: option.gender || null, phone: "", today: true }
  byUid.set(uid, entry)
  // Only identity is stored. Clinical fixtures remain in the demo source code.
  try {
    const saved = JSON.parse(sessionStorage.getItem("velora:mock:identities") || "{}")
    saved[uid] = { id: uid, label: entry.name, age: entry.age, gender: entry.gender }
    sessionStorage.setItem("velora:mock:identities", JSON.stringify(saved))
  } catch (e) { /* session-only demo still works without storage */ }
}

function selectedMockPatient(uid) {
  if (!byUid.has(uid) && isCopilotMock()) {
    try { registerMockPatient(JSON.parse(sessionStorage.getItem("velora:mock:identities") || "{}")[uid]) }
    catch (e) { /* no saved demo identity */ }
  }
  return byUid.get(uid)
}


/* ── The picker's appointment list ───────────────────────────────────────── */

function toOption(p) {
  return {
    id: p.uid,
    label: p.name,
    gender: p.gender,
    age: p.age,
    meta: [p.gender, `${p.age}y`, p.phone].join(" | "),
    pid: p.pid,
    phone: p.phone,
    isToday: p.today,
    kind: "patient",
  }
}

/** "52y | F | PAT1006" for a demo patient, for tooltips that name who a
    chat is about. */
export function mockPatientMeta(uid) {
  const p = byUid.get(String(uid || ""))
  return p ? [p.age != null ? `${p.age}y` : null, p.gender, p.pid].filter(Boolean).join(" | ") : null
}

/** Today's appointments, or everyone matching the words typed. */
export function mockListPatients({ search, isToday } = {}) {
  const q = String(search || "").trim().toLowerCase()
  const rows = [...byUid.values()].filter((p) =>
    q ? p.name.toLowerCase().includes(q) || p.uid.toLowerCase().includes(q) || p.pid.toLowerCase().includes(q) || p.phone.includes(q) : p.today
  )
  return delay(q ? 380 : 260).then(() => rows.map(toOption).map((o) => ({ ...o, isToday: o.isToday || !!isToday && o.isToday })))
}

/* ── Evidence rows, in the service's shape ───────────────────────────────── */

function evRow(p, kind, i, extra) {
  return {
    id: `${kind}:${p.uid}:${i}`,
    source_ref: `${kind}:${p.uid}:${i}`,
    code: kind,
    patientUid: p.uid,
    tableName: { lab_result: "lab_results", medicine: "prescriptions", diagnosis: "diagnoses", vitals: "vitals", allergy: "allergies", advice: "advice" }[kind],
    departmentName: p.visit.dept,
    doctorName: p.visit.doctor,
    ...extra,
  }
}

export function chartAnswer(p, question) {
  const q = question.toLowerCase()
  const evidence = []
  const cite = (row) => {
    evidence.push(row)
    return `[${evidence.length}](#evidence-${evidence.length})`
  }
  const lines = []
  let interpretation = ""
  let intent = "patient_summary"
  let demoSummary = null

  const meds = () => p.meds.map(([name, dose, date], i) =>
    `- ${PRETTY(date)}: **${name}** ${dose}. ${cite(evRow(p, "medicine", i, { eventDate: date, text: `${name} ${dose}` }))}`)
  const labs = (filter) => p.labs
    .map((l, i) => [l, i])
    .sort(([a], [b]) => b[5].localeCompare(a[5]))
    .filter(([l], i, all) => !/latest|recent/.test(q) || all.findIndex(([other]) => other[0] === l[0]) === i)
    .filter(([l]) => !filter || filter.test(l[0]))
    .map(([[test, value, unit, ref, flag, date], i]) =>
      `- ${PRETTY(date)}: ${test}: **${value} ${unit}**; reference ${ref}; recorded flag ${flag}. ${cite(evRow(p, "lab_result", i, { eventDate: date, testName: test, panelName: test, valueNum: value, unit, refRangeText: ref, abnormalFlag: flag, text: `${test} ${value} ${unit}` }))}`)
  const vitals = () => p.bp.map(([bp, date], i) =>
    `- ${PRETTY(date)}: Blood pressure **${bp} mmHg**. ${cite(evRow(p, "vitals", i, { eventDate: date, text: `BP ${bp} mmHg` }))}`)
  const conditions = () => p.conditions.map(([name, date], i) =>
    `- Recorded diagnosis since ${PRETTY(date)}: **${name}**. ${cite(evRow(p, "diagnosis", i, { eventDate: date, text: name }))}`)
  const allergies = () => p.allergies.length
    ? p.allergies.map(([drug, reaction, date], i) =>
      `- ${PRETTY(date)}: **${drug}**, reaction recorded as ${reaction}. ${cite(evRow(p, "allergy", i, { eventDate: date, text: `${drug}: ${reaction}` }))}`)
    : ["- No drug allergy or reaction is documented in the indexed records."]

  if (/\bmed(?:ication|ications|icine|icines|s)?\b|prescri|tablet/.test(q) && !/allerg/.test(q)) {
    intent = "medications"
    interpretation = `Medicines on the most recent prescriptions in ${p.name}'s indexed record.`
    lines.push("# Medications on record", ...meds())
  } else if (/allerg|reaction/.test(q)) {
    intent = "allergy"
    interpretation = "Documented drug allergies and the reactions recorded against them."
    lines.push("# Allergies", ...allergies())
  } else if (HBA1C.test(q) || /sugar|glucose|tsh|thyroid|ldl|cholesterol|haemoglobin|hemoglobin|ferritin|creatinine|lab/.test(q)) {
    intent = "labs"
    const filter = HBA1C.test(q) || /sugar|glucose/.test(q) ? /HbA1c|glucose/i : /tsh|thyroid/.test(q) ? /TSH/ : /ldl|cholesterol/.test(q) ? /LDL/ : null
    const rows = labs(filter)
    interpretation = rows.length ? "The dated lab results in the indexed record, newest first." : "No matching lab result is recorded."
    lines.push(/latest|recent/.test(q) ? "# Latest lab records" : "# Lab records", ...(rows.length ? rows : ["- No matching lab result is recorded in the indexed record."]))
  } else if (/\bbp\b|blood pressure|vital/.test(q)) {
    intent = "vitals"
    interpretation = "Blood pressure readings recorded at visits, newest first."
    lines.push("# Blood pressure", ...vitals())
  } else if (/condition|diagnos|history|problem/.test(q)) {
    intent = "diagnosis"
    interpretation = "Conditions recorded as diagnoses in the indexed record."
    lines.push("# Medical history", ...conditions())
  } else if (/advice|counsel|follow/.test(q)) {
    intent = "advice"
    interpretation = "Advice recorded at the most recent visit."
    lines.push("### Advice at the last visit", `- ${PRETTY(p.visit.date)}, ${p.visit.dept}: ${p.visit.advice} ${cite(evRow(p, "advice", 0, { eventDate: p.visit.date, text: p.visit.advice }))}`)
  } else {
    interpretation = `Here's ${p.name}'s patient summary.`
    if (p.uid === 'MOCK1002') {
      const sourceNumbers = new Map(SUNITA_SOURCES.map((record, i) => {
        cite(evRow(p, record.kind, i, { eventDate:record.date, text:record.text }))
        return [record.id, evidence.length]
      }))
      const resolve = value => Array.isArray(value) ? value.map(resolve) : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'sources' ? item.map(id => sourceNumbers.get(id)) : resolve(item)])) : value
      demoSummary = resolve(SUNITA_OVERVIEW)
      lines.push('# Patient overview', '', demoSummary.situation.text, '', ...evidence.map((record,i)=>`[${i+1}](#evidence-${i+1})`))
    } else {
    const source = (kind, i, extra) => {
      cite(evRow(p, kind, i, extra))
      return evidence.length
    }
    const conditionItems = p.conditions.map(([name, date], i) => ({ id: `condition-${i}`, text: name,
      sources: [source("diagnosis", i, { eventDate: date, text: name })] }))
    const allergyItems = p.allergies.map(([name, reaction, date], i) => ({ id: `allergy-${i}`, text: name, detail: reaction,
      sources: [source("allergy", i, { eventDate: date, text: `${name}: ${reaction}` })] }))
    const identity = [p.age != null ? `${p.age}-year-old` : null, p.gender === "M" ? "man" : p.gender === "F" ? "woman" : null].filter(Boolean).join(" ")
    const story = `${p.name}${identity ? `, a ${identity},` : ""} has a recorded history of ${p.conditions.map(([name]) => name).join(" and ")}.` +
      (p.allergies.length ? ` Allergic to ${p.allergies.map(([name, reaction]) => `${name} (${reaction})`).join(", ")}.` : "")
    const background = [{ id: "conditions", label: "Chronic conditions", separator: "comma", values: conditionItems }]
    if (allergyItems.length) background.push({ id: "allergies", label: "Allergies", separator: "comma", values: allergyItems })
    if (p.family.length) background.push({ id: "family", label: "Family history", text: p.family.map(([who, what]) => `${who}: ${what}`).join(", "),
      sources: [source("history", 0, { eventDate: p.visit.date, text: p.family.map(([who, what]) => `${who}: ${what}`).join(", ") })] })
    const groups = []
    const latestBP = [...p.bp].sort((a,b) => b[1].localeCompare(a[1]))[0]
    if (latestBP) groups.push({ id: "vitals", label: "Latest vitals", date: PRETTY(latestBP[1]).replace(/20(\d{2})$/, "’$1"), icon: "HeartRate", items: [{ id: "bp", label: "BP", text: `${latestBP[0]} mmHg`, sources: [source("vitals", 0, { eventDate: latestBP[1], text: `BP ${latestBP[0]} mmHg` })] }] })
    const latestLabs = [...p.labs].sort((a,b) => b[5].localeCompare(a[5])).filter((lab, i, all) => all.findIndex(row => row[0] === lab[0]) === i)
    if (latestLabs.length) groups.push({ id: "labs", label: "Key labs", icon: "clipboard-activity", items: [{ id: "labs", values: latestLabs.map(([test, value, unit, ref, flag, date], i) => ({ id: `lab-${i}`, label: test, text: `${value} ${unit}`, flag,
      sources: [source("lab_result", i, { eventDate: date, testName: test, valueNum: value, unit, refRangeText: ref, abnormalFlag: flag, text: `${test}: ${value} ${unit}` })] })) }] })
    const visitSource = source("visit", 0, { eventDate: p.visit.date, text: visitNarrative(p, p.visit.date) })
    demoSummary = { situation: { text: story, emphasis: [...p.conditions.map(([name]) => name), ...p.allergies.map(([name]) => name)], sources: [...conditionItems, ...allergyItems].flatMap(item => item.sources) }, sections: [
      { id: "background", label: "Background", items: background },
      { id: "assessment", label: "Assessment", icon: "HeartRate", items: [], groups },
      { id: "last-visit", label: "Last visit", date: PRETTY(p.visit.date).replace(/20(\d{2})$/, "’$1"), items: [
        { id: "sx", label: "Sx", text: "Routine follow-up", sources: [visitSource] },
        { id: "dx", label: "Dx", text: p.conditions.map(([name]) => name).join(", "), sources: [visitSource] },
        { id: "rx", label: "Rx", text: p.meds.map(([name, dose]) => `${name} ${dose}`).join(", "), sources: [visitSource] },
      ] },
    ] }
    lines.push("# Patient overview", "", story, "", ...demoSummary.sections.map(section => `### ${section.label}`), "", ...evidence.map((row, i) => `[${i+1}](#evidence-${i+1})`))
  }

  }

  const suggestions = [
    { short: "Patient summary", ask: "Summarise this patient's record.", intent: "patient_summary" },
    { short: "Medications on record", ask: "What medications were recorded?", intent: "medications" },
    ...(p.labs.length ? [{ short: "Latest labs", ask: "What are the latest lab results?", intent: "labs" }] : []),
    ...(p.allergies.length ? [{ short: "Allergies", ask: "Any documented drug allergy?", intent: "allergy" }] : []),
    { short: "Blood pressure trend", ask: "Show the blood pressure readings over time.", intent: "vitals" },
  ].filter((s) => s.intent !== intent).slice(0, 3).map((s, i) => ({ id: `s${i}`, selection_id: `s${i}`, code: null, ...s }))

  return {
    interpretation,
    demoSummary,
    answer: lines.join("\n"),
    response_kind: "answer",
    intent,
    evidence,
    cited_source_refs: evidence.map((e) => e.source_ref),
    coverage: [],
    suggestions,
  }
}

/* ── Hospital-wide search ────────────────────────────────────────────────── */

const SINGLE_PATIENT = /\b(this patient|the patient|his |her |their )\b/i

/* HbA1c as doctors actually type it: "HbA1c", "HBAC1", "Hb A1c", "A1c",
   "glycated haemoglobin". */
const HBA1C = /hb\s*a\s*1\s*c|hbac1|hba1|\ba1c\b|glycat/

/* The consultation sheet behind a demo finding, in the archive's narrative
   format (see rxNarrative.js), so following a citation opens a real-looking
   prescription: the visit's diagnoses, lab results, medicines, advice and
   vitals, with the finding it backs among them. Invented, like everything
   in this file. */
function visitNarrative(p, date) {
  if (p.uid === 'MOCK1002') {
    const recorded = SUNITA_VISITS.find(visit => visit.date === (date || p.visit.date))
    if (recorded) return sunitaVisitText(recorded)
  }
  const when = PRETTY(date || p.visit.date)
  const lines = [`${p.name} · OPD prescription, ${when}.`]
  lines.push("Presenting complaints / history:", "- Routine follow-up")
  if (p.family && p.family.length) {
    lines.push("Medical history:", ...p.family.map(([who, what]) => `- ${who}: ${what}`))
  }
  if (p.conditions.length) lines.push("Diagnosis:", ...p.conditions.map(([name]) => `- ${name}`))
  if (p.labs.length) {
    lines.push(
      "Lab results:",
      ...p.labs.map(([test, value, unit, ref, flag, d]) => `- ${test}: ${value} ${unit} (ref ${ref}), ${flag}, ${PRETTY(d)}`)
    )
  }
  if (p.meds.length) lines.push("Medicines prescribed:", ...p.meds.map(([name, dose]) => `- ${name.toUpperCase()} — ${dose}`))
  if (p.visit.advice) lines.push("Advice:", `- ${p.visit.advice}`)
  if (p.bp && p.bp[0]) lines.push(`Vitals: bp=${p.bp[0][0]} mmHg`)
  return lines.join("\n")
}

/* The signed-in doctor's own patients, for "All my patients": everyone on
   today's list, and everyone whose last visit was with this doctor or the
   two colleagues who share the clinic. */
const MY_DOCTORS = new Set(["Dr. Sheela", "Dr. Mehul Shah", "Dr. Anand Rao"])
const isMine = (p) => p.today || MY_DOCTORS.has(p.visit && p.visit.doctor)

function discovery(question, page, scope = "all") {
  const q = question.toLowerCase()
  if (SINGLE_PATIENT.test(question) && !/patients\b/.test(q)) {
    return {
      interpretation: "No patient is selected, so I can't identify whose record to read.",
      answer: "Which patient do you mean? Please select the patient or provide identifying details.",
      patients: [],
      result_scope: { kind: "ranked", limit: 20, returned_count: 0, search_exhausted: false, additional_candidates_unchecked: false },
      discovery_actions: [],
      response_kind: "answer",
    }
  }

  const threshold = (re, fallback) => {
    const m = q.match(re)
    return m ? Number(m[1]) : fallback
  }

  /* Every criterion the question names, each its own matcher. A patient is
     listed only when all of them hold, and every one that held becomes a
     fact on the row: "type 2 diabetes with HbA1c above 7" lists diabetics
     whose HbA1c is over 7, with both facts and both sources shown. */
  const criteria = []
  if (HBA1C.test(q)) {
    const t = threshold(/(?:above|over|>)\s*(\d+(?:\.\d+)?)/, 7)
    criteria.push({
      says: `latest recorded HbA1c above ${t}%`,
      match: (p) => {
        const l = p.labs.find((x) => x[0] === "HbA1c")
        return l && l[1] > t ? { label: "Latest HbA1c", text: `${l[1]}%`, date: l[5], kind: "lab_result" } : null
      },
    })
  }
  if (/\bbp\b|blood pressure/.test(q)) {
    criteria.push({
      says: "latest recorded blood pressure at or above 140/90",
      match: (p) => {
        const [bp, date] = p.bp[0] || []
        if (!bp) return null
        const [sys, dia] = bp.split("/").map(Number)
        return sys >= 140 || dia >= 90 ? { label: "Latest BP", text: `${bp} mmHg`, date, kind: "vitals" } : null
      },
    })
  }
  if (/family history/.test(q) && /cad|coronary|heart/.test(q)) {
    criteria.push({
      says: "a recorded family history of coronary artery disease",
      match: (p) => {
        const f = p.family.find((x) => /coronary/i.test(x[1]))
        return f ? { label: "Family history", text: `${f[0]}: ${f[1]}`, date: p.visit.date, kind: "diagnosis" } : null
      },
    })
  }
  const TERMS = [
    [/diabet|t2dm|\bdm\b/, /diabetes/i, "type 2 diabetes"],
    [/thyroid/, /thyroid/i, "hypothyroidism"],
    [/asthma/, /asthma/i, "asthma"],
    [/anaemia|anemia/, /anaemia/i, "anaemia"],
    [/hypertens/, /hypertension/i, "hypertension"],
    [/coronary|\bcad\b/, /coronary/i, "coronary artery disease"],
    [/kidney|ckd/, /kidney/i, "chronic kidney disease"],
    [/lipid|cholesterol/, /lipid/i, "dyslipidaemia"],
  ]
  const familyAsked = /family history/.test(q)
  for (const [re, rx, name] of TERMS) {
    if (!re.test(q)) continue
    if (familyAsked && rx.source === "coronary") continue
    criteria.push({
      says: `a recorded diagnosis of ${name}`,
      match: (p) => {
        const c = p.conditions.find((x) => rx.test(x[0]))
        return c ? { label: "Diagnosis", text: c[0], date: c[1], kind: "diagnosis" } : null
      },
    })
  }

  const interpretation = criteria.length
    ? `Patients with ${criteria.map((c) => c.says).join(" and ")}.`
    : "I could not turn that into a search over recorded facts."
  const matchAll = (p) => {
    if (!criteria.length) return null
    const facts = criteria.map((c) => c.match(p))
    return facts.every(Boolean) ? facts : null
  }

  const pool = scope === "mine" ? PATIENTS.filter(isMine) : PATIENTS
  const all = pool.map((p) => [p, matchAll(p)]).filter(([, m]) => m)
  /* Twenty to a page, the live service's own limit. */
  const PAGE = 20
  const slice = page === 2 ? all.slice(PAGE) : all.slice(0, PAGE)
  const more = page !== 2 && all.length > PAGE

  /* One record per fact, numbered the way the service numbers them
     ("evidence-3" is Source 3). */
  const evidence = []
  const patients = slice.map(([p, facts]) => {
    const rows = facts.map((m, i) => {
      const row = { ...evRow(p, m.kind, i, { eventDate: m.date, text: visitNarrative(p, m.date) }), evidenceId: `evidence-${evidence.length + 1}` }
      evidence.push(row)
      return { label: m.label, text: m.text, date: PRETTY(m.date), source_ref: row.source_ref }
    })
    return {
      patientUid: p.uid,
      patientName: p.name,
      patientId: p.pid,
      phone: p.phone,
      age: p.age,
      gender: p.gender,
      reason: rows.map((f) => `${f.label}: ${f.text}`).join("; "),
      facts: rows,
      source_refs: rows.map((f) => f.source_ref),
    }
  })

  return {
    interpretation,
    answer: all.length ? "" : "No patients matched that search in the indexed records.",
    patients,
    evidence,
    result_scope: {
      kind: "ranked",
      limit: 20,
      returned_count: slice.length,
      search_exhausted: !more,
      additional_candidates_unchecked: false,
    },
    discovery_actions: more ? [{ id: "discovery_more", label: "Show more patients" }] : [],
    response_kind: "answer",
  }
}

/* ── Conversations, kept for this tab ────────────────────────────────────── */

const now = () => Math.floor(Date.now() / 1000)
let idSeq = 1
const newId = (prefix) => `${prefix}${Date.now().toString(36)}${(idSeq++).toString(36)}`

function readStore() {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* fall through to a fresh seed */
  }
  return seed()
}

function writeStore(store) {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch (e) {
    /* storage full or blocked: the demo just forgets on reload */
  }
}

/* A morning's worth of earlier conversations, so history has something to
   show; one from yesterday evening (inside 24 hours) and one from three
   days ago (outside it, so the window can be seen working). */
function seed() {
  const t = now()
  const store = {}
  const add = (mode, uid, question, ago, scope = "all") => {
    const id = newId("seed")
    const p = uid ? byUid.get(uid) : null
    const result = mode === "patient" ? chartAnswer(p, question) : discovery(question, 1, scope)
    store[id] = {
      session_id: id,
      mode,
      scope: mode === "patient" ? null : scope,
      patient: p ? { patientUid: p.uid, patientName: p.name } : null,
      updated_at: t - ago,
      turns: [{ question, result: { ...result, question, session_id: id, request_id: newId("r"), mode } }],
    }
  }
  add("find_patients", null, "Find patients whose latest HbA1c is above 7%", 40 * 60, "mine")
  add("patient", "MOCK1001", "What medications were recorded?", 75 * 60)
  add("patient", "MOCK1004", "Summarise this patient's record.", 2.5 * 3600)
  add("find_patients", null, "Find patients with a family history of coronary artery disease", 15 * 3600)
  add("patient", "MOCK1005", "What are the latest lab results?", 3 * 86400)
  writeStore(store)
  return store
}

/* ── The endpoints ───────────────────────────────────────────────────────── */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function notFound(message) {
  const err = new Error(message)
  err.code = "not_indexed"
  err.status = 404
  return err
}

const OTHER_PATIENTS = /\b(other patients|which patients|all patients|patients with|patients who|how many patients)\b/i

/* The service's working steps, streamed the way it streams them: each step
   arrives running, then again complete with its duration. Spread over the
   answer's wait so the loader has something true-shaped to show. */
async function streamSteps(onEvent, labels, total) {
  if (!onEvent) return delay(total)
  const each = Math.round(total / labels.length)
  for (let i = 0; i < labels.length; i++) {
    const id = `step-${i}`
    onEvent("activity", { id, label: labels[i], status: "running" })
    const took = each + Math.round((Math.random() - 0.5) * each * 0.4)
    await delay(took)
    onEvent("activity", { id, label: labels[i], status: "complete", duration_ms: took })
  }
  return undefined
}

/* The answer as it is written, in a few pieces, as the service sends it. */
async function streamDraft(onEvent, text) {
  if (!onEvent || !text) return
  const words = text.split(/(\s+)/)
  const per = Math.max(1, Math.ceil(words.length / 8))
  for (let i = 0; i < words.length; i += per) {
    onEvent("answer", { answer: words.slice(i, i + per).join(""), append: i > 0 })
    await delay(110)
  }
}

export async function mockRequest(path, { method = "GET", body, onEvent } = {}) {
  const [route] = path.split("?")
  const store = readStore()

  if (route === "/auth") return { authenticated: true }

  if (route === "/sessions" && method === "GET") {
    await delay(320)
    const sessions = Object.values(store)
      .sort((a, b) => b.updated_at - a.updated_at)
      .map((s) => ({
        session_id: s.session_id,
        mode: s.mode,
        scope: s.scope || null,
        patient: s.patient,
        preview: (s.turns[0] && s.turns[0].question) || "",
        updated_at: s.updated_at,
      }))
    return { sessions }
  }

  let m = route.match(/^\/sessions\/([^/]+)$/)
  if (m) {
    await delay(260)
    const s = store[m[1]]
    if (!s) throw notFound("That conversation is no longer available.")
    const last = s.turns[s.turns.length - 1]
    return {
      mode: s.mode,
      scope: s.scope || null,
      session_id: s.session_id,
      patientUid: s.patient ? s.patient.patientUid : null,
      patient: s.patient,
      last_request_id: last ? last.result.request_id : null,
      turns: s.turns,
    }
  }

  if (route === "/discovery/sessions" && method === "POST") {
    const id = newId("fp")
    store[id] = { session_id: id, mode: "find_patients", patient: null, updated_at: now(), turns: [] }
    writeStore(store)
    return { session_id: id }
  }

  if (route === "/discovery/ask" && method === "POST") {
    await streamSteps(onEvent, ["Understanding the question", "Searching recorded facts", "Checking each patient's record", "Preparing the list"], 2200)
    const s = store[body.session_id]
    if (!s) throw notFound("That search session has ended.")
    const more = body.intent === "discovery_more"
    const question = more && s.turns.length ? s.turns[s.turns.length - 1].question : body.question
    s.scope = body.scope === "mine" ? "mine" : s.scope || "all"
    const result = { ...discovery(question, more ? 2 : 1, s.scope), question: body.question, session_id: s.session_id, request_id: newId("r"), mode: "find_patients" }
    s.turns.push({ question: body.question, result })
    s.updated_at = now()
    writeStore(store)
    return result
  }

  m = route.match(/^\/patients\/([^/]+)\/(starters|sessions|ask)$/)
  if (m) {
    const p = selectedMockPatient(decodeURIComponent(m[1]))
    if (!p) throw notFound("This patient's record has not been indexed yet.")
    if (m[2] === "starters") {
      await delay(200)
      const starters = [
        { ask: "Summarise this patient's record.", short: "Patient summary", intent: "patient_summary", code: null },
        { ask: "What medications were recorded?", short: "Medications on record", intent: "medications", code: "medicine" },
        p.labs.length ? { ask: "What are the latest lab results?", short: "Latest lab results", intent: "labs", code: "lab_result" } : null,
        { ask: "What conditions are recorded?", short: "Medical history", intent: "diagnosis", code: "diagnosis" },
      ].filter(Boolean)
      return { starters, availableKinds: ["diagnosis", "medicine", "lab_result", "vitals"], visitCount: 6 }
    }
    if (m[2] === "sessions") {
      const id = newId("pt")
      store[id] = { session_id: id, mode: "patient", patient: { patientUid: p.uid, patientName: p.name }, updated_at: now(), turns: [] }
      writeStore(store)
      return { session_id: id }
    }
    await streamSteps(onEvent, ["Reading the question", `Searching ${p.name}'s record`, "Checking the sources"], 1800)
    const s = store[body.session_id]
    if (!s || s.patient?.patientUid !== p.uid) throw notFound("That conversation has ended.")
    const question = String(body.question || "")
    const result = OTHER_PATIENTS.test(question)
      ? {
          interpretation: "This request extends beyond the selected patient's chart.",
          answer: "> I can only answer clinical questions about the selected patient's record.",
          response_kind: "other_patient",
          evidence: [],
          cited_source_refs: [],
          coverage: [],
          suggestions: [],
        }
      : chartAnswer(p, question)
    await streamDraft(onEvent, result.answer)
    const full = { ...result, question, session_id: s.session_id, request_id: newId("r"), mode: "patient" }
    s.turns.push({ question, result: full })
    s.updated_at = now()
    writeStore(store)
    return full
  }

  throw notFound(`Mock data has no answer for ${method} ${route}.`)
}

/** Forget every mock conversation, for "clear today's chats". */
export function clearMockSessions(sessionIds) {
  const store = readStore()
  for (const id of sessionIds || Object.keys(store)) delete store[id]
  writeStore(store)
}

/* ── The appointment list, in demo mode ──────────────────────────────────
   Today's demo patients appear in the appointment queue, and every demo
   patient can be found by the listing's search, so the portal around Velora
   shows the same people Velora answers about. Added to the listAppointment
   response in the browser only; nothing is booked or written anywhere.
   The rows are for looking at and searching: actions that call the server
   with them (start a consult, open the chart) have no record to find. */

const SLOT_TIMES = ["09:30 AM", "10:00 AM", "10:45 AM", "11:30 AM", "12:15 PM", "02:30 PM"]

function ordinalDate(d) {
  const day = d.getDate()
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th"
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function appointmentRow(p, index, date) {
  const isoDay = date.toISOString().slice(0, 10)
  return {
    pam_id: `demo-${p.uid}-${isoDay}`,
    pam_ref_id: `demo-${p.uid}-${isoDay}`,
    pm_id: `demo-${p.uid}`,
    pm_pid: p.pid,
    patient_unique_id: p.uid,
    pm_salutation: p.gender === "M" ? "Mr" : "Ms",
    pm_fullname: p.name,
    pm_gender: p.gender === "M" ? "Male" : "Female",
    pm_contact_no: p.phone,
    ageYears: p.age,
    apDate: ordinalDate(date),
    apTime: SLOT_TIMES[index % SLOT_TIMES.length],
    toct_type: index % 3 === 0 ? "New" : "Follow-up",
    pt_name: p.visit ? p.visit.dept : "",
    billStatus: "Unbilled",
    pam_appointment_remark: "",
    pam_status_type_appointment: 0,
    appointmentStatus: "Queue",
    __veloraDemo: true,
  }
}

function inWindow(day, start, end) {
  const iso = day.toISOString().slice(0, 10)
  return (!start || iso >= String(start).slice(0, 10)) && (!end || iso <= String(end).slice(0, 10))
}

/** Demo rows for one listAppointment request. */
export function mockAppointmentRows({ startDate, endDate, apStatue, search, page } = {}) {
  if (Number(page || 0) > 0) return []
  if (Number(apStatue || 0) !== 0) return []
  const q = String(search || "").trim().toLowerCase()
  const today = new Date()
  if (q) {
    return PATIENTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.pid.toLowerCase().includes(q)
    ).map((p, i) => appointmentRow(p, i, today))
  }
  if (!inWindow(today, startDate, endDate)) return []
  return PATIENTS.filter((p) => p.today).map((p, i) => appointmentRow(p, i, today))
}

/** A listAppointment response with the demo rows added in front. */
export function withDemoAppointments(res, request) {
  const rows = mockAppointmentRows(request || {})
  const base = res && res.data ? res : { status: true, data: { app_data: [], queue_count: 0 } }
  if (!rows.length) return res || base
  const live = (base.data.app_data || []).filter((r) => !rows.some((d) => d.pm_pid === r.pm_pid))
  return {
    ...base,
    status: true,
    data: {
      ...base.data,
      app_data: [...rows, ...live],
      queue_count: Number(base.data.queue_count || 0) + rows.length,
    },
  }
}
