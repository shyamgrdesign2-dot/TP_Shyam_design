/**
 * Digitization Prescription Schema — TypeScript mirror of the
 * `DIGITIZATION_PRESCRIPTION_FIELDS` JSON contract used by the AI extraction
 * pipeline. The shape here is intentionally identical to the backend payload
 * so a future API response can be assigned directly to `DigitizationPrescription`
 * without any reshaping in the UI layer.
 *
 * All string fields default to "" when the AI cannot extract them (per the
 * schema description: "Leave empty if not present"). Arrays default to [].
 */

// ─── Patient ──────────────────────────────────────────────────────────────────









// ─── Vitals & body composition ────────────────────────────────────────────────





















// ─── Clinical lists ───────────────────────────────────────────────────────────





































































// ─── Gynec ────────────────────────────────────────────────────────────────────






















// ─── Obstetric ────────────────────────────────────────────────────────────────










































































// ─── Investigations / advice / dynamic ────────────────────────────────────────












// ─── Top-level prescription (one visit's AI extraction) ───────────────────────





















// ─── Patient history (many visits) ────────────────────────────────────────────

/**
 * One stored visit. The `payload` matches the AI extraction schema exactly so
 * backend payloads slot in untouched. `dateLabel` is a UI-friendly label
 * derived once at ingest time.
 */


























// ─── Empty defaults ───────────────────────────────────────────────────────────

export const EMPTY_VITALS = {
  temperature: "",
  pulse: "",
  respiratoryRate: "",
  bloodPressure: "",
  systolic: "",
  diastolic: "",
  spo2: "",
  randomBloodSugar: "",
  height: "",
  weight: "",
  headCircumference: "",
  waistCircumference: "",
  bmi: "",
  bmr: "",
  bsa: "",
  fib4: "",
  generalRBS: ""
};

export const EMPTY_GYNEC = {
  lastMenstrualPeriod: "",
  ageAtMenarche: 0,
  cycle: "",
  intervalCycle: 0,
  intervalNotes: "",
  flow: "",
  durationOfMenstrualFlow: 0,
  clotsDuringFlow: "",
  numberOfPadsPerDay: 0,
  clotsNotes: "",
  pain: "",
  occurrenceOfPain: "",
  painNotes: "",
  lifecycleHarmonialChanges: "",
  ageAtMenopause: 0,
  typeOfMenopause: "",
  lifecycleHarmonialChangesNotes: "",
  notes: ""
};

export const EMPTY_OBSTETRIC = {
  gravidity: 0,
  parity: 0,
  livingChildren: 0,
  abortions: 0,
  ectopicPregnancies: 0,
  lastMenstrualPeriod: "",
  expectedDateOfDelivery: "",
  calculatedExpectedDateOfDelivery: "",
  gestationWeeks: 0,
  gestationDays: 0,
  bloodGroup: "",
  husbandsBloodGroup: "",
  consanguineousMarriage: "",
  maritalStatus: "",
  marriageDurationYears: 0,
  marriageDurationMonths: 0,
  pastPregnancyDetails: [],
  antenatalExamination: [],
  ancHistory: [],
  immunisationHistory: [],
  diagnosisNotes: ""
};

export function emptyPrescription() {
  return {
    patientDetails: { name: "", age: "", gender: "", bloodGroup: "", notes: "" },
    vitalsAndBodyComposition: { ...EMPTY_VITALS },
    symptoms: [],
    examinations: [],
    diagnosis: [],
    medications: [],
    vaccinations: [],
    surgeries: [],
    labResults: [],
    medicalHistory: [],
    gyneacHistory: { ...EMPTY_GYNEC },
    obstetricHistory: { ...EMPTY_OBSTETRIC },
    advice: [],
    labInvestigation: [],
    followUp: "",
    others: [],
    dynamicFields: []
  };
}