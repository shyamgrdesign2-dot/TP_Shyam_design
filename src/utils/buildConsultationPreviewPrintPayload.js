import moment from "moment";
import {
  DENTAL_EXAM_CASE_OPTION_ID,
  ORAL_EXAM_CASE_OPTION_ID,
  mergeDentalPrintCaseOptions,
  normalizeDentalExamOption,
  normalizeOralExamOption,
} from "./dentalDefaultPrintSettings";
import { NEO_NATOLOGISTS_DP_ID, PAEDIATRICS_DP_ID } from "./constants";

const SHOW_DATE_FORMAT = "DD MMM, YY";

const BASE_VITAL_ROWS = [
  { key: "1", name: "Temp (F)" },
  { key: "2", name: "Pulse (/min)" },
  { key: "3", name: "Resp. Rate (/min)" },
  { key: "4", name: "Blood Pressure (mmHg)" },
  { key: "5", name: "SPO2 (%)" },
  { key: "6", name: "General RBS (mg/dl)" },
  { key: "7", name: "FIB4 " },
  { key: "8", name: "Waist Circumference (cms)" },
  { key: "9", name: "OFC (cms)" },
  { key: "10", name: "Height (cms)" },
  { key: "11", name: "Weight (kgs)" },
  { key: "12", name: "BMI (kg/m²)" },
  { key: "13", name: "BMR (kcals)" },
  { key: "14", name: "BSA (m²)" },
];

function buildInitialRows(isPediatricAccessable) {
  if (!isPediatricAccessable) {
    return BASE_VITAL_ROWS.map((row) => ({ ...row }));
  }

  const priorityNames = ["Weight (kgs)", "Height (cms)", "OFC (cms)"];
  const priorityRows = [];
  const otherRows = [];

  BASE_VITAL_ROWS.forEach((row) => {
    if (priorityNames.includes(row.name)) {
      priorityRows.push({ ...row });
    } else {
      otherRows.push({ ...row });
    }
  });

  const orderedPriority = priorityNames
    .map((name) => priorityRows.find((row) => row.name === name))
    .filter(Boolean);

  return [...orderedPriority, ...otherRows];
}

function buildVitalsTable(vitals = [], isPediatricAccessable) {
  const initialRows = buildInitialRows(isPediatricAccessable);
  const setRowValue = (rowName, columnIndex, value) => {
    const targetRow = initialRows.find((row) => row.name === rowName);
    if (targetRow) {
      targetRow[columnIndex] = value ?? "-";
    }
  };

  const uniqueDates =
    vitals.length > 0
      ? [...vitals.slice(0, 3).map((item) => item.date)]
      : [];

  const columns = [
    { title: "Name" },
    ...uniqueDates.map((date) => ({
      title: moment(date).format(SHOW_DATE_FORMAT),
    })),
  ];

  if (vitals.length > 0) {
    vitals.slice(0, 3).forEach((item, index) => {
      setRowValue("Temp (F)", index, item.temp || "-");
      setRowValue("Pulse (/min)", index, item.pres || "-");
      setRowValue("Resp. Rate (/min)", index, item.resp_rate || "-");
      const formattedBP = item.blood_press
        ? item.blood_press.endsWith("/")
          ? item.blood_press.substring(0, item.blood_press.length - 1)
          : item.blood_press
        : "-";
      setRowValue("Blood Pressure (mmHg)", index, formattedBP || "-");
      setRowValue("SPO2 (%)", index, item.spo2 || "-");
      setRowValue("General RBS (mg/dl)", index, item.general_rbs || "-");
      setRowValue("FIB4 ", index, item.fib4 || "-");
      setRowValue("Waist Circumference (cms)", index, item.waist_circumference || "-");
      setRowValue("OFC (cms)", index, item.ofc || "-");
      setRowValue("Height (cms)", index, item.height || "-");
      setRowValue("Weight (kgs)", index, item.weight || "-");
      setRowValue("BMI (kg/m²)", index, item.bmi ? parseFloat(item.bmi).toFixed(2) : "-");
      setRowValue("BMR (kcals)", index, item.bmr ? parseFloat(item.bmr).toFixed(2) : "-");
      setRowValue("BSA (m²)", index, item.bsa ? parseFloat(item.bsa).toFixed(2) : "-");
    });
  }

  return { columns, initialRows };
}

function buildPrintAssetsFromSettings(printSettings) {
  if (!printSettings) {
    return {
      fileHeader: null,
      fileFooter: null,
      fileLogo: null,
      fileWatermark: null,
      fileSignature: null,
    };
  }

  return {
    fileLogo:
      printSettings.logo_enable === "Y" && printSettings.logo_image
        ? { imageShow: true, showFile: printSettings.logo_image }
        : null,
    fileWatermark:
      printSettings.water_mark_enable === "Y" && printSettings.water_mark_image
        ? { imageShow: true, showFile: printSettings.water_mark_image }
        : null,
    fileSignature:
      printSettings.signature_enable === "Y" && printSettings.signature_image
        ? { imageShow: true, showFile: printSettings.signature_image }
        : null,
    fileHeader: printSettings.header_image
      ? { imageShow: true, showFile: printSettings.header_image }
      : null,
    fileFooter: printSettings.footer_image
      ? { imageShow: true, showFile: printSettings.footer_image }
      : null,
  };
}

function mapPatientDataForPrint(patientData, consultationDate, existing = {}) {
  return {
    ...existing,
    patient_unique_id:
      patientData?.patient_unique_id || existing?.patient_unique_id,
    patient_name:
      patientData?.pm_fullname ||
      existing?.patient_name ||
      patientData?.patient_name,
    patient_id: patientData?.pm_pid || existing?.patient_id,
    patient_contact_no:
      patientData?.pm_contact_no || existing?.patient_contact_no,
    patient_gender: patientData?.pm_gender || existing?.patient_gender,
    patient_age: patientData?.ageYears || existing?.patient_age,
    patient_consultaion_date:
      consultationDate || existing?.patient_consultaion_date,
    patient_salutation:
      patientData?.pm_salutation || existing?.patient_salutation,
    patient_address: patientData?.pm_address || existing?.patient_address,
    patient_blood_group:
      patientData?.pm_blood_group || existing?.patient_blood_group,
    patient_dob: patientData?.pm_dob || existing?.patient_dob,
    patient_email: patientData?.pm_email || existing?.patient_email,
    patient_reference_id:
      patientData?.pm_reference_id ||
      patientData?.mrno ||
      existing?.patient_reference_id,
    pam_id: patientData?.pam_id || existing?.pam_id,
  };
}

function mapDoctorDataForPrint(profile, userId, existing) {
  if (existing && Object.keys(existing).length > 0) {
    return existing;
  }

  return {
    um_id: userId,
    doctor_name: profile?.um_name,
    dp_id: profile?.dp_id,
    dp_name: profile?.dp_name,
    gmc_no: profile?.gmc_no,
    um_qualifications: profile?.um_qualifications,
  };
}

function applyDentalChartPrintSettings(printSettings, { dentalChartPrintMode, includePatientInfo }) {
  if (!dentalChartPrintMode || !printSettings?.prescription?.case_option) {
    return;
  }

  const isPlain = dentalChartPrintMode === "plain";
  const isHistorical = dentalChartPrintMode === "historical";
  const caseOptions = printSettings.prescription.case_option.map((option) => {
    if (option?.id === DENTAL_EXAM_CASE_OPTION_ID) {
      return normalizeDentalExamOption({
        ...option,
        enable: "Y",
        custom_status: "Y",
        showDentalChart: true,
        chartOnly: isPlain,
        includeHistorical: isHistorical,
      });
    }
    if (option?.id === ORAL_EXAM_CASE_OPTION_ID) {
      return normalizeOralExamOption({
        ...option,
        enable: isHistorical ? "Y" : "N",
        custom_status: "Y",
        includeHistorical: isHistorical,
      });
    }
    return option;
  });

  printSettings.prescription.case_option = caseOptions;

  if (!includePatientInfo && printSettings.header_footer) {
    printSettings.header_footer = {
      ...printSettings.header_footer,
      show_patient_info: "none",
      patient_info: (printSettings.header_footer.patient_info || []).map((item) => ({
        ...item,
        enable: "N",
      })),
    };
  }
}

function stripClinicalSectionsForDentalChartPrint(caseManagerData) {
  return {
    ...caseManagerData,
    symptoms: [],
    examination: [],
    surgeries: [],
    diagnosis: [],
    medicine: [],
    advice: [],
    investigation: [],
    vitals: [],
    medical_history: [],
    follow_up_date: null,
    visit_advice: "",
    moduleContents: [],
  };
}

/**
 * Builds a print payload from in-memory consultation state (no case-manager save).
 */
export function buildConsultationPreviewPrintPayload({
  patient_data,
  profile,
  userId,
  caseManagerData,
  currentTcmId,
  pamId,
  consultationDate,
  symptomsData,
  examinationData,
  surgeriesData,
  diagnosisData,
  adviceData,
  investigationData,
  medicationData,
  vitalsData,
  medicalHistoryData,
  followUpDate,
  additionalNote,
  customModuleContents,
  defaultPrintSettings,
  frequencyList,
  timingList,
  customModules,
  activeDentalData,
  oralExamination,
  isDentalEnabled,
  dentalChartPrintMode,
  includePatientInfo = true,
  dentitionType = "adult",
}) {
  if (!defaultPrintSettings) {
    return null;
  }

  const printSettings = JSON.parse(JSON.stringify(defaultPrintSettings));

  if (isDentalEnabled && printSettings.prescription?.case_option) {
    const merged = mergeDentalPrintCaseOptions(
      printSettings.prescription.case_option
    );
    printSettings.prescription.case_option = merged.caseOptions;
  }

  if (dentalChartPrintMode) {
    applyDentalChartPrintSettings(printSettings, {
      dentalChartPrintMode,
      includePatientInfo,
    });
  }

  const isPediatricAccessable =
    profile?.dp_id === PAEDIATRICS_DP_ID ||
    profile?.dp_id === NEO_NATOLOGISTS_DP_ID;

  const { columns, initialRows } = buildVitalsTable(
    vitalsData,
    isPediatricAccessable
  );

  const existingDoctor =
    caseManagerData?.doctor_data || caseManagerData?.doctor_Data;

  let localCaseManagerData = {
    ...(caseManagerData || {}),
    tcm_id: currentTcmId,
    pam_id: pamId,
    consultation_date: consultationDate,
    patient_data: mapPatientDataForPrint(
      patient_data,
      consultationDate,
      caseManagerData?.patient_data
    ),
    doctor_data: mapDoctorDataForPrint(profile, userId, existingDoctor),
    symptoms: symptomsData || [],
    examination: examinationData || [],
    surgeries: surgeriesData || [],
    diagnosis: diagnosisData || [],
    medicine: medicationData || [],
    advice: adviceData || [],
    investigation: investigationData || [],
    vitals: vitalsData || [],
    medical_history: medicalHistoryData || [],
    follow_up_date: followUpDate,
    visit_advice: additionalNote,
    moduleContents: customModuleContents || [],
  };

  if (dentalChartPrintMode) {
    localCaseManagerData = stripClinicalSectionsForDentalChartPrint(
      localCaseManagerData
    );
  }

  const resolvedDentalData =
    dentalChartPrintMode === "plain" ? [] : activeDentalData || [];

  const {
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
  } = buildPrintAssetsFromSettings(printSettings);

  return {
    mode: "NORMAL",
    caseManagerData: localCaseManagerData,
    columns,
    initialRows,
    frequencyList,
    timingList,
    printSettings,
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
    customModules,
    dentalExaminationData: {
      tooth_states: resolvedDentalData,
      dentition_type: dentitionType || "adult",
    },
    oralExamination: dentalChartPrintMode === "plain" ? null : oralExamination,
    patientUniqueId: patient_data?.patient_unique_id,
    tcmId: currentTcmId,
    dentalChartPrintMode,
    includePatientInfo,
  };
}
