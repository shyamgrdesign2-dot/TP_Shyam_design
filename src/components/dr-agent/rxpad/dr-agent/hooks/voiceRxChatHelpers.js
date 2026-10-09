import { CONTEXT_PATIENT_ID } from "../constants";
import { hasVitalsAndBodyCompositionData } from "../../../../../utils/symptomCollectorVitalsMerge";

/*
 * Pure helpers shared by the Rx pad Dr. Agent panel and the VoiceRx chat flow
 * (useVoiceRxChat). Moved verbatim out of useDrAgentPanel.js so both surfaces
 * build identical VoiceRx messages, contexts and payloads.
 */

export const VOICE_RX_SUBMIT_BUTTON_MIN_MS = 5000;

export const cleanText = (value) => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  return text && text !== "null" && text !== "undefined" ? text : "";
};

export const toStructuredVoiceItem = (item) => {
  if (item && typeof item === "object") {
    return {
      name: item.name ?? "",
      detail: item.detail ?? "",
    };
  }
  return { name: item };
};

export const hasObjectData = (value) =>
  value && typeof value === "object" && Object.keys(value).length > 0;

export const hasTextData = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const firstMeaningfulObject = (...values) =>
  values.find((value) => hasObjectData(value)) || null;

export const hasMeaningfulVoiceDigitization = (voiceDigitization) => {
  if (!voiceDigitization) return false;
  return (
    (Array.isArray(voiceDigitization.history) && voiceDigitization.history.length > 0) ||
    hasObjectData(voiceDigitization.clinicNotes) ||
    hasObjectData(voiceDigitization.digitizeData) ||
    hasObjectData(voiceDigitization.editedData) ||
    hasObjectData(voiceDigitization.soap) ||
    hasTextData(voiceDigitization.soapHtml)
  );
};

export const hasPatientReportedData = (data) =>
  Boolean(
    data &&
    (
      data.symptoms?.length ||
      data.medicalHistory?.length ||
      data.allergies?.length ||
      data.currentMedications?.length ||
      data.questionsToDoctor?.length ||
      hasVitalsAndBodyCompositionData(data.vitalsAndBodyComposition)
    )
  );

export const normalizeHistoryItem = (item, typeOverride = "") => {
  if (!item) return null;
  if (typeof item === "string") return cleanText(item);
  const name = cleanText(item.name || item.history_name || item.lineItem || item.notes);
  if (!name) return null;
  const detail = [item.duration || item.since, item.status, item.relation, item.notes || item.note]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
  return {
    ...item,
    type: item.type || typeOverride,
    name,
    lineItem: item.lineItem || name,
    duration: item.duration || item.since || "",
    since: item.since || item.duration || "",
    status: item.status || "",
    relation: item.relation || item.relationship || "",
    notes: item.notes || item.note || "",
    detail,
  };
};

export const normalizeQuestionList = (notes) => {
  if (Array.isArray(notes)) {
    return notes.map((item) => cleanText(item?.question || item?.name || item?.notes || item)).filter(Boolean);
  }
  const text = cleanText(notes);
  if (!text) return [];
  return text
    .split(/\n+|(?:^|\s)[•-]\s+/)
    .map(cleanText)
    .filter(Boolean);
};

export const normalizeSymptomCollectorData = (raw) => {
  if (!raw || typeof raw !== "object" || !Object.keys(raw).length) return null;

  const symptoms = Array.isArray(raw.symptoms)
    ? raw.symptoms.filter((item) => cleanText(item?.name || item?.symptom_name || item?.lineItem || item))
    : [];
  const medicalHistory = [];
  const allergies = Array.isArray(raw.allergies) ? raw.allergies.map(cleanText).filter(Boolean) : [];
  const directMedications = raw.currentMedications || raw.current_medications || raw.medications;
  const currentMedications = Array.isArray(directMedications)
    ? directMedications.map((item) => cleanText(item?.name || item?.medicine || item?.lineItem || item)).filter(Boolean)
    : [];
  const historySource = Array.isArray(raw.medicalHistory) ? raw.medicalHistory : [];

  historySource.forEach((item) => {
    if (!item) return;
    if (Array.isArray(item.items)) {
      item.items.forEach((child) => {
        if (!child) return;
        const sectionTitle = cleanText(item.title).toLowerCase();
        if (sectionTitle.includes("allerg")) {
          const allergy = cleanText(child.name || child.lineItem || child.notes);
          if (allergy) allergies.push(allergy);
          return;
        }
        const normalized = normalizeHistoryItem(child, item.title);
        if (normalized) medicalHistory.push(normalized);
      });
      return;
    }

    const type = cleanText(item.type).toLowerCase();
    if (type.includes("allerg")) {
      const allergy = cleanText(item.name || item.lineItem || item.notes);
      if (allergy) allergies.push(allergy);
      return;
    }
    if (type.includes("medication")) {
      const medication = cleanText(item.name || item.lineItem || item.notes);
      if (medication) currentMedications.push(medication);
      return;
    }
    const normalized = normalizeHistoryItem(item, item.type);
    if (normalized) medicalHistory.push(normalized);
  });

  const questionsToDoctor = [
    ...normalizeQuestionList(raw.questionsToDoctor || raw.questions_to_doctor || raw.questions),
    ...normalizeQuestionList(raw.notes || raw.others),
  ];

  const data = {
    reportedAt: raw.reportedAt || raw.reported_at || raw.createdAt || "today",
    symptoms,
    medicalHistory,
    allergies,
    currentMedications,
    questionsToDoctor,
    vitalsAndBodyComposition: raw.vitalsAndBodyComposition || null,
    _id: raw._id,
  };

  return hasPatientReportedData(data) ? data : null;
};

export const formatVitalValue = (vital) => {
  if (!vital || typeof vital !== "object") return cleanText(vital);
  const value = cleanText(vital.value);
  if (!value) return "";
  const unit = cleanText(vital.unit);
  return [value, unit].filter(Boolean).join(" ");
};

export const compactObject = (object) => Object.fromEntries(
  Object.entries(object).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return cleanText(value) !== "";
  })
);

export const mapSymptomCollectorVitals = (vitals) => compactObject({
  temperature: formatVitalValue(vitals?.temperature),
  pulse: formatVitalValue(vitals?.pulse),
  respiratory_rate: formatVitalValue(vitals?.respiratoryRate),
  blood_pressure: formatVitalValue(vitals?.bloodPressure),
  systolic: formatVitalValue(vitals?.systolic),
  diastolic: formatVitalValue(vitals?.diastolic),
  spo2: formatVitalValue(vitals?.spo2),
  random_blood_sugar: formatVitalValue(vitals?.randomBloodSugar),
  height: formatVitalValue(vitals?.height),
  weight: formatVitalValue(vitals?.weight),
  head_circumference: formatVitalValue(vitals?.headCircumference),
  waist_circumference: formatVitalValue(vitals?.waistCircumference),
  bmi: formatVitalValue(vitals?.bmi),
  bmr: formatVitalValue(vitals?.bmr),
  bsa: formatVitalValue(vitals?.bsa),
  fib4: formatVitalValue(vitals?.fib4),
  general_rbs: formatVitalValue(vitals?.generalRBS),
});

export const buildSymptomCollectorPreviousContext = (symptomCollectorData, patientData) => {
  if (!hasPatientReportedData(symptomCollectorData)) return null;

  const patientDetails = compactObject({
    name: cleanText(
      patientData?.pm_fullname ||
      patientData?.patient_name ||
      [patientData?.pm_first_name, patientData?.pm_last_name].map(cleanText).filter(Boolean).join(" ")
    ),
    age: cleanText(patientData?.ageYears ?? patientData?.age_years ?? patientData?.age),
    gender: cleanText(patientData?.pm_gender || patientData?.gender),
    blood_group: cleanText(patientData?.blood_group || patientData?.pm_blood_group),
  });
  const vitalsAndBodyComposition = mapSymptomCollectorVitals(symptomCollectorData.vitalsAndBodyComposition);
  const symptoms = (symptomCollectorData.symptoms || []).map((item) => compactObject({
    name: cleanText(item?.name || item?.symptom_name || item?.lineItem || item),
    duration: cleanText(item?.duration || item?.since),
    severity: cleanText(item?.severity),
    notes: cleanText(item?.notes || item?.note),
  })).filter((item) => cleanText(item.name));
  const medications = (symptomCollectorData.currentMedications || []).map((item) => compactObject({
    name: cleanText(item),
  })).filter((item) => cleanText(item.name));
  const medicalHistory = [
    ...(symptomCollectorData.allergies || []).map((item) => compactObject({
      name: cleanText(item),
      status: "Allergy",
    })),
    ...(symptomCollectorData.medicalHistory || []).map((item) => compactObject({
      name: cleanText(item?.name || item?.lineItem || item),
      since: cleanText(item?.since || item?.duration),
      status: cleanText(item?.status || item?.type),
      notes: cleanText(item?.notes || item?.note || item?.detail),
    })),
  ].filter((item) => cleanText(item.name));

  const previousContext = compactObject({
    patient_details: patientDetails,
    vitals_and_body_composition: vitalsAndBodyComposition,
    symptoms,
    medications,
    medical_history: medicalHistory,
  });

  return hasObjectData(previousContext) ? previousContext : null;
};

export const buildPatientFromData = (patientData, fallback) => {
  if (!patientData) return fallback;
  const label = cleanText(
    patientData.pm_fullname ||
    patientData.patient_name ||
    [patientData.pm_first_name, patientData.pm_last_name].map(cleanText).filter(Boolean).join(" ")
  );
  const gender = cleanText(patientData.pm_gender || patientData.gender || fallback?.gender);
  const age = patientData.ageYears ?? patientData.age_years ?? patientData.age ?? fallback?.age;
  const mrn = cleanText(patientData.mrno || patientData.patient_unique_id);
  const contact = cleanText(patientData.pm_contact_no || patientData.mobile);
  return {
    ...(fallback || {}),
    id: patientData.patient_unique_id || fallback?.id || CONTEXT_PATIENT_ID,
    label: label || fallback?.label || "Patient",
    gender,
    age,
    meta: [gender, age !== undefined && age !== null && age !== "" ? `${age}y` : "", mrn, contact].filter(Boolean).join(" · "),
    kind: "patient",
  };
};

export const getPatientNameFromData = (patientData) => cleanText(
  patientData?.pm_fullname ||
  patientData?.patient_name ||
  [patientData?.pm_first_name, patientData?.pm_last_name].map(cleanText).filter(Boolean).join(" ")
);

export const buildVoiceRxContextParams = ({ patientId, doctorId, sessionId, patientData, profile }) => ({
  patientId,
  doctorId,
  sessionId,
  doctorName: profile?.um_name || "",
  patientName: getPatientNameFromData(patientData),
});
