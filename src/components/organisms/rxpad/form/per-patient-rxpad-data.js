// ─────────────────────────────────────────────────────────────
// Per-patient initial RxPad data + DDX suggestions + drug interactions
// ─────────────────────────────────────────────────────────────


















let _seq = 0;
function rid(prefix) {
  _seq += 1;
  return `${prefix}-init-${_seq}`;
}

export const PER_PATIENT_RXPAD_DATA = {
  // ═══════════════ 1. SHYAM GR — GP (Viral Fever + DM + HTN) ═══════════════
  "__patient__": {
    symptoms: [
    { id: rid("s"), name: "Redness in both eyes", since: "2 days", status: "Severe", note: "" },
    { id: rid("s"), name: "Fever", since: "2 days", status: "Moderate", note: "" }],

    examinations: [
    { id: rid("e"), name: "Cold & Cough", note: "" },
    { id: rid("e"), name: "Left Knee Tenderness", note: "" }],

    diagnoses: [
    { id: rid("d"), name: "Allergic Rhinitis", since: "2 days", status: "Suspected", note: "" },
    { id: rid("d"), name: "Viral Pharyngitis", since: "2 days", status: "Confirmed", note: "" }],

    medications: [
    { id: rid("m"), medicine: "A Tron 4mg Tablet MD", unitPerDose: "1 tablet", frequency: "1-0-1", when: "After Food", duration: "5 days", note: "" },
    { id: rid("m"), medicine: "Paracetamol 650mg", unitPerDose: "1 tablet", frequency: "1-0-0-1", when: "After Food", duration: "3 days", note: "" }],

    advice: [
    { id: rid("a"), advice: "Stay hydrated daily", note: "" },
    { id: rid("a"), advice: "Practice deep breathing", note: "" }],

    labs: [
    { id: rid("l"), investigation: "Complete Blood Count", note: "" },
    { id: rid("l"), investigation: "Liver Function Test", note: "" }],

    surgeries: [
    { id: rid("su"), surgery: "Cardiac Restoration Surgery", note: "" },
    { id: rid("su"), surgery: "Gastrointestinal Detox Surgery", note: "" }],

    additionalNotes: "",
    followUpDate: "",
    followUpNotes: "",
    ddxSuggestions: ["Viral Fever", "Dengue Fever", "Conjunctivitis", "Allergic Rhinitis", "COVID-19", "Influenza"]
  },

  // ═══════════════ 2. NEHA GUPTA — GP + Pulmonology (Asthma F/U) ═══════════════
  "apt-neha": {
    symptoms: [
    { id: rid("s"), Symptom: "Nocturnal cough", Duration: "1 week", Severity: "Moderate" },
    { id: rid("s"), Symptom: "Wheeze on exertion", Duration: "5 days", Severity: "Mild" }],

    examinations: [
    { id: rid("e"), Examination: "Chest: Bilateral scattered rhonchi, no crepts", Finding: "Abnormal" },
    { id: rid("e"), Examination: "PEFR: 320 L/min (expected 380)", Finding: "Reduced" }],

    diagnoses: [
    { id: rid("d"), Diagnosis: "Acute exacerbation of bronchial asthma", Type: "Primary" },
    { id: rid("d"), Diagnosis: "Hypothyroidism on Rx", Type: "Secondary" }],

    medications: [
    { id: rid("m"), Medicine: "Budecort 200mcg", Dose: "1 puff", Frequency: "BD", Duration: "30d" },
    { id: rid("m"), Medicine: "Deriphyllin retard 150mg", Dose: "1 tab", Frequency: "BD", Duration: "14d" },
    { id: rid("m"), Medicine: "Montelukast 10mg", Dose: "1 tab", Frequency: "HS", Duration: "30d" },
    { id: rid("m"), Medicine: "Thyronorm 50mcg", Dose: "1 tab", Frequency: "OD BF", Duration: "90d" }],

    advice: [
    { id: rid("a"), Advice: "Avoid dust and smoke exposure" },
    { id: rid("a"), Advice: "Use inhaler before exercise" },
    { id: rid("a"), Advice: "Steam inhalation twice daily" }],

    labs: [
    { id: rid("l"), Investigation: "PEFR monitoring weekly" },
    { id: rid("l"), Investigation: "TSH recheck" }],

    surgeries: [],
    additionalNotes: "Patient counselled on inhaler technique. Review after 2 weeks.",
    followUpDate: "24 Mar'26",
    followUpNotes: "Recheck PEFR, TSH; review inhaler compliance",
    ddxSuggestions: ["Allergic bronchitis", "COPD early onset", "Vocal cord dysfunction", "GERD-induced cough"]
  },

  // ═══════════════ 3. ANJALI PATEL — GP + Ophthalmology ═══════════════
  "apt-anjali": {
    symptoms: [
    { id: rid("s"), name: "Headache", since: "4 days", status: "Moderate", note: "Frontal, throbbing" },
    { id: rid("s"), name: "Photophobia", since: "2 days", status: "Mild", note: "" }],

    examinations: [
    { id: rid("e"), name: "Neurological exam normal", note: "" },
    { id: rid("e"), name: "No papilledema on fundoscopy", note: "" }],

    diagnoses: [
    { id: rid("d"), name: "Migraine without aura", since: "Episodic", status: "Suspected", note: "" }],

    medications: [
    { id: rid("m"), medicine: "Sumatriptan 50mg", unitPerDose: "1 tablet", frequency: "SOS", when: "After Food", duration: "As needed", note: "" },
    { id: rid("m"), medicine: "Paracetamol 500mg", unitPerDose: "1 tablet", frequency: "SOS", when: "After Food", duration: "As needed", note: "" }],

    advice: [
    { id: rid("a"), advice: "Reduce screen time, follow 20-20-20 rule", note: "" },
    { id: rid("a"), advice: "Maintain sleep hygiene, regular schedule", note: "" }],

    labs: [
    { id: rid("l"), investigation: "Vitamin D", note: "" },
    { id: rid("l"), investigation: "Vitamin B12", note: "" }],

    surgeries: [],
    additionalNotes: "",
    followUpDate: "",
    followUpNotes: "",
    ddxSuggestions: ["Migraine without aura", "Tension-type headache", "Cluster headache", "Sinusitis", "Intracranial hypertension"]
  },

  // ═══════════════ 3. VIKRAM SINGH — GP + Cardio (F/U overdue) ═══════════════
  "apt-vikram": {
    symptoms: [
    { id: rid("s"), name: "Fatigue", since: "2 weeks", status: "Moderate", note: "Persistent, no relief with rest" },
    { id: rid("s"), name: "Poor Sleep", since: "2 weeks", status: "Moderate", note: "Difficulty staying asleep" }],

    examinations: [
    { id: rid("e"), name: "CVS: S1S2 normal, no murmur", note: "" },
    { id: rid("e"), name: "Chest: Clear, no added sounds", note: "" }],

    diagnoses: [
    { id: rid("d"), name: "HTN Stage I", since: "3 years", status: "Confirmed", note: "" },
    { id: rid("d"), name: "Dyslipidemia", since: "1 year", status: "Confirmed", note: "" },
    { id: rid("d"), name: "Fatigue syndrome", since: "2 weeks", status: "Suspected", note: "" }],

    medications: [
    { id: rid("m"), medicine: "Telma 40mg", unitPerDose: "1 tablet", frequency: "1-0-0-0", when: "Before Food", duration: "Ongoing", note: "" },
    { id: rid("m"), medicine: "Rosuvastatin 10mg", unitPerDose: "1 tablet", frequency: "0-0-0-1", when: "After Food", duration: "Ongoing", note: "" },
    { id: rid("m"), medicine: "Melatonin 3mg", unitPerDose: "1 tablet", frequency: "0-0-0-1", when: "Before Food", duration: "30 days", note: "" }],

    advice: [
    { id: rid("a"), advice: "Exercise 30 minutes daily — brisk walking", note: "" },
    { id: rid("a"), advice: "Avoid late dinners, eat by 8 PM", note: "" },
    { id: rid("a"), advice: "Limit alcohol to weekends only", note: "" }],

    labs: [
    { id: rid("l"), investigation: "Lipid Profile", note: "" },
    { id: rid("l"), investigation: "HbA1c", note: "" },
    { id: rid("l"), investigation: "TSH", note: "" },
    { id: rid("l"), investigation: "ECG", note: "" }],

    surgeries: [],
    additionalNotes: "Follow-up was overdue by 12 days. Reassess BP control and lipid levels.",
    followUpDate: "",
    followUpNotes: "Recheck lipids and BP in 2 weeks",
    ddxSuggestions: ["Essential Hypertension", "Obstructive Sleep Apnea", "Hypothyroidism", "Chronic fatigue syndrome", "Depression"]
  },

  // ═══════════════ 4. PRIYA RAO — Obstetric (38wk Primigravida) ═══════════════
  "apt-priya": {
    symptoms: [
    { id: rid("s"), name: "Pedal Edema", since: "3 days", status: "Mild", note: "Bilateral ankle swelling" },
    { id: rid("s"), name: "Lower Back Pain", since: "2 days", status: "Moderate", note: "" }],

    examinations: [
    { id: rid("e"), name: "Uterus 38wk, cephalic presentation", note: "FHS 142/min" },
    { id: rid("e"), name: "BP 130/85, mild pedal edema", note: "" }],

    diagnoses: [
    { id: rid("d"), name: "Routine ANC — 38 weeks", since: "Ongoing", status: "Confirmed", note: "" },
    { id: rid("d"), name: "Hypothyroid on treatment", since: "2 years", status: "Confirmed", note: "" }],

    medications: [
    { id: rid("m"), medicine: "Thyronorm 50mcg", unitPerDose: "1 tablet", frequency: "1-0-0-0", when: "Before Food", duration: "Ongoing", note: "" },
    { id: rid("m"), medicine: "Folic Acid 5mg", unitPerDose: "1 tablet", frequency: "1-0-0-0", when: "After Food", duration: "Ongoing", note: "" },
    { id: rid("m"), medicine: "Iron + Folic Acid", unitPerDose: "1 tablet", frequency: "1-0-0-0", when: "After Food", duration: "Ongoing", note: "" },
    { id: rid("m"), medicine: "Calcium 500mg", unitPerDose: "1 tablet", frequency: "0-1-0-1", when: "After Food", duration: "Ongoing", note: "" }],

    advice: [
    { id: rid("a"), advice: "Adequate rest, left lateral sleeping position", note: "" },
    { id: rid("a"), advice: "Monitor fetal movements daily (kick count)", note: "" },
    { id: rid("a"), advice: "Report any headache, blurring, or reduced urine output immediately", note: "" }],

    labs: [
    { id: rid("l"), investigation: "CBC", note: "" },
    { id: rid("l"), investigation: "TSH", note: "" },
    { id: rid("l"), investigation: "Urine Routine", note: "" }],

    surgeries: [],
    additionalNotes: "BP borderline — monitor for pre-eclampsia. Family history positive.",
    followUpDate: "",
    followUpNotes: "Weekly ANC visit",
    ddxSuggestions: ["Pre-eclampsia", "Gestational hypertension", "Physiological edema", "Deep vein thrombosis", "Hypothyroid-related edema"]
  },

  // ═══════════════ 5. ARJUN S — Pediatric (4y) ═══════════════
  "apt-arjun": {
    symptoms: [
    { id: rid("s"), name: "Dry Cough", since: "3 days", status: "Moderate", note: "Worse at night" },
    { id: rid("s"), name: "Reduced Appetite", since: "1 week", status: "Mild", note: "" }],

    examinations: [
    { id: rid("e"), name: "Chest: Bilateral wheeze, no crepts", note: "" },
    { id: rid("e"), name: "Throat: Congested, ears normal", note: "" }],

    diagnoses: [
    { id: rid("d"), name: "Acute URTI with reactive airways", since: "3 days", status: "Suspected", note: "" }],

    medications: [
    { id: rid("m"), medicine: "Amoxicillin 250mg", unitPerDose: "5ml syrup", frequency: "1-0-1", when: "After Food", duration: "5 days", note: "" },
    { id: rid("m"), medicine: "Salbutamol syrup 2ml", unitPerDose: "2ml", frequency: "1-1-1", when: "Before Food", duration: "3 days", note: "" },
    { id: rid("m"), medicine: "Cetirizine syrup 2.5ml", unitPerDose: "2.5ml", frequency: "0-0-0-1", when: "After Food", duration: "5 days", note: "" }],

    advice: [
    { id: rid("a"), advice: "Warm fluids, avoid cold food and beverages", note: "" },
    { id: rid("a"), advice: "Steam inhalation before bed (supervised)", note: "" },
    { id: rid("a"), advice: "Return if fever or breathing difficulty", note: "" }],

    labs: [],
    surgeries: [],
    additionalNotes: "Father has asthma history. Weight at 15th percentile — monitor growth.",
    followUpDate: "",
    followUpNotes: "Review in 5 days if no improvement, order CBC",
    ddxSuggestions: ["Acute URTI", "Reactive airway disease", "Bronchiolitis", "Allergic rhinitis", "Early-onset asthma"]
  },

  // ═══════════════ 6. LAKSHMI K — Gynecology ═══════════════
  "apt-lakshmi": {
    symptoms: [
    { id: rid("s"), name: "Heavy Menstrual Bleeding", since: "6 months", status: "Severe", note: "5 pads/day" },
    { id: rid("s"), name: "Fatigue", since: "3 months", status: "Moderate", note: "Increasing" }],

    examinations: [
    { id: rid("e"), name: "Pallor present", note: "" },
    { id: rid("e"), name: "P/A: Soft, P/V: Uterus bulky, no tenderness", note: "" }],

    diagnoses: [
    { id: rid("d"), name: "AUB — Ovulatory dysfunction", since: "6 months", status: "Confirmed", note: "" },
    { id: rid("d"), name: "Iron deficiency anemia", since: "3 months", status: "Confirmed", note: "" },
    { id: rid("d"), name: "Hypothyroid on Rx", since: "2020", status: "Confirmed", note: "" }],

    medications: [
    { id: rid("m"), medicine: "Thyronorm 75mcg", unitPerDose: "1 tablet", frequency: "1-0-0-0", when: "Before Food", duration: "Ongoing", note: "" },
    { id: rid("m"), medicine: "Autrin Capsule", unitPerDose: "1 capsule", frequency: "1-0-0-0", when: "After Food", duration: "90 days", note: "" },
    { id: rid("m"), medicine: "Tranexamic Acid 500mg", unitPerDose: "1 tablet", frequency: "1-1-1", when: "After Food", duration: "During flow", note: "" }],

    advice: [
    { id: rid("a"), advice: "Iron-rich diet — spinach, jaggery, dates", note: "" },
    { id: rid("a"), advice: "Rest during heavy flow days", note: "" },
    { id: rid("a"), advice: "Monitor pad count, report if >6/day", note: "" }],

    labs: [
    { id: rid("l"), investigation: "CBC", note: "" },
    { id: rid("l"), investigation: "TSH", note: "" },
    { id: rid("l"), investigation: "Iron Studies (Serum Iron, Ferritin, TIBC)", note: "" },
    { id: rid("l"), investigation: "USG Pelvis", note: "" }],

    surgeries: [],
    additionalNotes: "Pap smear >1yr overdue. PCOS history since 2018. Partial thyroidectomy 2020.",
    followUpDate: "",
    followUpNotes: "Review USG + labs in 6 weeks",
    ddxSuggestions: ["AUB-Ovulatory dysfunction", "Uterine fibroids", "Endometrial hyperplasia", "Adenomyosis", "Perimenopause", "Coagulopathy"]
  },

  // ═══════════════ 7. RAMESH M — New Patient (Walk-in) ═══════════════
  "apt-zerodata": {
    symptoms: [
    { id: rid("s"), name: "Knee Pain", since: "1 week", status: "Moderate", note: "Right knee, worse on climbing stairs" },
    { id: rid("s"), name: "Morning Stiffness", since: "3 days", status: "Mild", note: "Lasts about 15-20 minutes" }],

    examinations: [],
    diagnoses: [],
    medications: [],
    advice: [],
    labs: [],
    surgeries: [],
    additionalNotes: "",
    followUpDate: "",
    followUpNotes: "",
    ddxSuggestions: ["Osteoarthritis", "Meniscal injury", "Ligament sprain", "Gout", "Rheumatoid arthritis"]
  }
};

// ═══════════════ DRUG INTERACTION PAIRS ═══════════════
// [drugA keyword, drugB keyword, interaction description]
export const DRUG_INTERACTION_PAIRS = [
["aspirin", "ibuprofen", "Increased bleeding risk"],
["aspirin", "warfarin", "Major bleeding risk"],
["warfarin", "paracetamol", "Increased INR with prolonged use"],
["metformin", "alcohol", "Lactic acidosis risk"],
["ace inhibitor", "potassium", "Hyperkalemia risk"],
["telma", "potassium", "Hyperkalemia risk — ARB + K⁺"],
["rosuvastatin", "gemfibrozil", "Rhabdomyolysis risk"],
["amoxicillin", "methotrexate", "Increased methotrexate toxicity"],
["sumatriptan", "ssri", "Serotonin syndrome risk"],
["sumatriptan", "fluoxetine", "Serotonin syndrome risk"],
["ibuprofen", "aspirin", "Reduced cardioprotective effect"],
["ciprofloxacin", "theophylline", "Theophylline toxicity"],
["salbutamol", "propranolol", "Beta-blocker antagonism"],
["thyronorm", "calcium", "Reduced thyroid absorption — space 4hr apart"],
["thyronorm", "iron", "Reduced thyroid absorption — space 4hr apart"],
["tranexamic acid", "oral contraceptive", "Thrombosis risk"]];


/**
 * Check if a candidate medication interacts with any existing medications.
 * Returns the interaction description + conflicting drug, or null.
 */
export function checkDrugInteraction(
candidate,
existingMeds)
{
  const cLower = candidate.toLowerCase();
  for (const med of existingMeds) {
    const mLower = med.toLowerCase();
    for (const [a, b, desc] of DRUG_INTERACTION_PAIRS) {
      if (
      cLower.includes(a) && mLower.includes(b) ||
      cLower.includes(b) && mLower.includes(a))
      {
        return { interactsWith: med, description: desc };
      }
    }
  }
  return null;
}

/**
 * Check if a medication in the table has interactions with other table meds.
 * Returns all pairs.
 */
export function checkTableInteractions(
medRows)
{
  const results = [];
  for (let i = 0; i < medRows.length; i++) {
    const med = (medRows[i].medicine ?? "").trim();
    if (!med) continue;
    for (let j = i + 1; j < medRows.length; j++) {
      const other = (medRows[j].medicine ?? "").trim();
      if (!other) continue;
      const hit = checkDrugInteraction(med, [other]);
      if (hit) {
        results.push({ rowId: medRows[i].id, medName: med, interactsWith: other, description: hit.description });
        results.push({ rowId: medRows[j].id, medName: other, interactsWith: med, description: hit.description });
      }
    }
  }
  return results;
}