import React, { useEffect, useRef, useContext } from "react";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { useDispatch, useSelector } from "react-redux";

import CashManagerContext from "../context/CashManagerContext";
import { useRxPadSync } from "./dr-agent/rxpad/dr-agent/RxPadSyncContext";
import { normalizeModuleRows } from "./dr-agent/voicerx/VoiceRxModuleCapture";
import { toast } from "./dr-agent/voicerx/toast";
import { appendDedupedText, mergeCopiedRows } from "../utils/voiceRxRowStrip";
import { addUpdateVitals } from "../redux/vitalsSlice";
import { convertMedicalHistoryToContextFormat } from "../utils/medicalHistoryConverters";
import { errorMessage } from "../utils/utils";
import { getGynecDetails, postGynecDetails, updateGynecDetails } from "../api/services/ApiGynec";
import { isGynecDataEmpty, mergeGynecHistory, normalizeGynaecHistoryFromDigitiseData, syncGynecHistoryAfterEndVisit } from "../utils/gynecHistoryUtils";
import {
  findLatestVitalsRowIndexForDate,
  getCopiedVitalsObject,
  getVitalsRowDate,
  hasMatchingVitalsRow,
  moveCopiedVitalsRowToEnd,
  normalizeCopiedVitalsRow,
  normalizeVitalsInputRow,
} from "../utils/vitalsHelpers";

const FOLLOW_UP_DATE_FORMATS = [
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "DD/MM/YYYY",
  "YYYY/MM/DD",
  "DD MMM YYYY",
  "DD MMMM YYYY",
  "MMM DD, YYYY",
  "MMMM DD, YYYY",
];

function firstNonEmpty(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      if (value.length > 0) return value;
      continue;
    }
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || String(value).trim() === "") return [];
  return [value];
}

function parseFollowUpDate(value, baseDate) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const iso = moment(text, moment.ISO_8601, true);
  if (iso.isValid()) return iso.format("YYYY-MM-DD");
  const parsed = moment(text, FOLLOW_UP_DATE_FORMATS, true);
  if (parsed.isValid()) return parsed.format("YYYY-MM-DD");

  const relativeDateMatch = text.match(/(\d+)\s*(day|days|week|weeks|month|months|year|years)/i);
  if (!relativeDateMatch) return "";

  const amount = parseInt(relativeDateMatch[1], 10);
  if (!Number.isFinite(amount)) return "";

  const unitText = relativeDateMatch[2].toLowerCase();
  const unit = unitText.includes("year")
    ? "years"
    : unitText.includes("month")
      ? "months"
      : unitText.includes("week")
        ? "weeks"
        : "days";
  const base = moment(baseDate).isValid() ? moment(baseDate) : moment();
  return base.clone().add(amount, unit).format("YYYY-MM-DD");
}

function appendAdditionalNote(setAdditionalNote, value) {
  const text = String(value ?? "").trim();
  if (!text) return;
  setAdditionalNote((prev) => appendDedupedText(prev, text));
}

function hasCopiedCustomModuleValue(value) {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

function customModuleRowHasValue(row) {
  return Object.entries(row || {}).some(
    ([key, value]) => key !== "id" && hasCopiedCustomModuleValue(value)
  );
}

function normalizeCopiedCustomModule(module) {
  if (!module?.module_id) return null;
  const content = toArray(module.content)
    .filter(customModuleRowHasValue)
    .map((row) => ({
      ...row,
      id: row?.id || uuidv4(),
    }));

  if (!content.length) return null;

  return {
    ...module,
    module_id: module.module_id,
    module_name: module.module_name || module.name || module.title || String(module.module_id),
    module_version: module.module_version || module.version || "v2",
    content,
  };
}

function customModuleRowSignature(row) {
  return JSON.stringify(
    Object.entries(row || {})
      .filter(([key, value]) => key !== "id" && hasCopiedCustomModuleValue(value))
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  );
}

function mergeCopiedCustomModules(prevContents = [], copiedModules = []) {
  const nextContents = [...prevContents];

  copiedModules.forEach((module) => {
    const existingIndex = nextContents.findIndex(
      (item) => String(item?.module_id) === String(module.module_id)
    );

    if (existingIndex === -1) {
      nextContents.push(module);
      return;
    }

    const existing = nextContents[existingIndex];
    const mergedRows = [];
    const seenRows = new Set();
    [...toArray(existing.content), ...toArray(module.content)]
      .filter(customModuleRowHasValue)
      .forEach((row) => {
        const signature = customModuleRowSignature(row);
        if (!signature || seenRows.has(signature)) return;
        seenRows.add(signature);
        mergedRows.push(row);
      });

    nextContents[existingIndex] = {
      ...existing,
      ...module,
      module_name: existing.module_name || module.module_name,
      module_version: existing.module_version || module.module_version,
      namedFields: existing.namedFields || module.namedFields,
      content: mergedRows,
    };
  });

  return nextContents;
}

function getRawMedicineFrequencyText(medicine) {
  return firstNonEmpty(
    medicine?.frequency,
    medicine?.freq,
    medicine?.frequencyText,
    medicine?.frequency_text,
    medicine?.tmm_freq_type_name
  ) || "";
}

function hasMedicineFrequencyBlockValues(medicine) {
  return [
    medicine?.tcm_tmm_freq_morning,
    medicine?.tcm_tmm_freq_afternoon,
    medicine?.tcm_tmm_freq_evening,
    medicine?.tcm_tmm_freq_night,
  ].some((value) => value !== undefined && value !== null && String(value).trim() !== "" && String(value) !== "0");
}

function formatMedicineFrequencyBlock(medicine) {
  const morning = medicine?.tcm_tmm_freq_morning && medicine.tcm_tmm_freq_morning != 0
    ? medicine.tcm_tmm_freq_morning
    : "0";
  const afternoon = medicine?.tcm_tmm_freq_afternoon && medicine.tcm_tmm_freq_afternoon != 0
    ? medicine.tcm_tmm_freq_afternoon
    : "0";
  const evening = medicine?.tcm_tmm_freq_evening && medicine.tcm_tmm_freq_evening != 0
    ? medicine.tcm_tmm_freq_evening
    : "";
  const night = medicine?.tcm_tmm_freq_night && medicine.tcm_tmm_freq_night != 0
    ? medicine.tcm_tmm_freq_night
    : "0";

  return evening ? `${morning} - ${afternoon} - ${evening} - ${night}` : `${morning} - ${afternoon} - ${night}`;
}

function getMedicineFrequencyDisplay(medicine, frequencyList = []) {
  const rawFrequency = getRawMedicineFrequencyText(medicine);
  const frequencyObjById = frequencyList.find((x) => x.tmf_id == medicine?.tmm_freq_type);
  const frequencyObjByExactTitle = rawFrequency
    ? frequencyList.find((x) => String(x?.tmf_title || "").trim() === String(rawFrequency).trim())
    : undefined;
  const frequencyObj = frequencyObjById || frequencyObjByExactTitle;

  if (medicine?.tmf_block == 0 && hasMedicineFrequencyBlockValues(medicine)) {
    return {
      label: formatMedicineFrequencyBlock(medicine),
      blockValue: frequencyObj?.tmf_block_val || "",
    };
  }

  if (frequencyObj) {
    return {
      label: frequencyObj.tmf_title,
      blockValue: frequencyObj.tmf_block_val || "",
    };
  }

  return {
    label: rawFrequency,
    blockValue: "",
  };
}

function isNumericMedicineFrequencyText(value) {
  return /^(?!-)[\d.\s-]+$/.test(String(value || "").trim());
}

function isExactMedicineFrequencyTitle(value, frequencyList = []) {
  const text = String(value || "").trim();
  if (!text) return false;
  return frequencyList.some(
    (item) => item?.tmf_block !== 0 && String(item?.tmf_title || "").trim() === text
  );
}

function appendMedicineFrequencyToNotes(notes, frequency) {
  return appendMedicineTextToNotes(notes, frequency);
}

function appendMedicineScheduleToNotes(notes, schedule) {
  return appendMedicineTextToNotes(notes, schedule);
}

function appendMedicineTextToNotes(notes, value) {
  const current = String(notes || "").trim();
  const text = String(value || "").trim();
  if (!text || current.includes(text)) return current;
  return current ? `${current} | ${text}` : text;
}

function moveUnmatchedMedicineFrequenciesToNotes(rows = [], frequencyList = []) {
  return rows.map((row) => {
    const rawFrequency = getRawMedicineFrequencyText(row);
    if (!rawFrequency) return row;

    const normalizedFrequency = String(row?.tmm_freq_type_name || "").trim();
    const canUseFrequencyField =
      isNumericMedicineFrequencyText(normalizedFrequency) ||
      isExactMedicineFrequencyTitle(rawFrequency, frequencyList) ||
      isExactMedicineFrequencyTitle(normalizedFrequency, frequencyList);

    if (canUseFrequencyField) return row;

    return {
      ...row,
      tmm_freq_type_name: "",
      tmm_freq_type: 0,
      tmf_block: 0,
      tmf_block_val: "",
      tcm_tmm_freq_morning: 0,
      tcm_tmm_freq_afternoon: 0,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: 0,
      tmm_remarks: appendMedicineFrequencyToNotes(row?.tmm_remarks || row?.notes || row?.note, rawFrequency),
    };
  });
}

function getRawMedicineScheduleText(medicine) {
  return [
    medicine?.schedule,
    medicine?.when,
    medicine?.timing,
    medicine?.tmm_time_name,
  ].find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function findExactMedicineTiming(value, timingList = []) {
  const text = String(value || "").trim();
  if (!text || text === "None") return null;
  return timingList.find(
    (item) => String(item?.tmt_title || "").trim().toLowerCase() === text.toLowerCase()
  ) || null;
}

function moveUnmatchedMedicineSchedulesToNotes(rows = [], timingList = []) {
  return rows.map((row) => {
    const rawSchedule = getRawMedicineScheduleText(row);
    if (!rawSchedule || String(rawSchedule).trim() === "None") return row;

    const timingObj = findExactMedicineTiming(rawSchedule, timingList);
    if (timingObj) {
      return {
        ...row,
        tmm_time: timingObj.tmt_id,
        tmm_time_name: timingObj.tmt_title,
      };
    }

    return {
      ...row,
      tmm_time: 0,
      tmm_time_name: "",
      tmm_remarks: appendMedicineScheduleToNotes(row?.tmm_remarks || row?.notes || row?.note, rawSchedule),
    };
  });
}

export default function ConsultationRxPadCopyListener() {
  const { lastCopyRequest, publishSignal } = useRxPadSync();
  const dispatch = useDispatch();
  const { selectedVitalsList, patientBirthWeight } = useSelector((state) => state.vitals);
  const { frequencyList, timingList, userId } = useSelector((state) => state.doctors);
  const {
    patient_data,
    pamId,
    consultationDate,
    vitalsData,
    setVitalsData,
    setSymptomsData,
    setExaminationData,
    setDiagnosisData,
    setMedicationData,
    setInvestigationData,
    setAdviceData,
    setMedicalHistoryData,
    updatedGynecHistory,
    setUpdatedGynecHistory,
    setSurgeriesData,
    setFollowUpDate,
    setAdditionalNote,
    copyCustomModuleContentsToRxPad,
  } = React.useContext(CashManagerContext);
  const handledRequestIdRef = useRef(null);

  useEffect(() => {
    if (!lastCopyRequest || handledRequestIdRef.current === lastCopyRequest.id) return;
    handledRequestIdRef.current = lastCopyRequest.id;

    const payload = lastCopyRequest.payload || {};
    const digitization = payload.digitization || {};
    const appendRows = (setter, rows, moduleKey) => {
      if (!rows.length) return;
      setter((prev) => mergeCopiedRows(prev, rows, moduleKey));
    };

    const symptoms = firstNonEmpty(digitization.symptoms, payload.symptoms);
    appendRows(
      setSymptomsData,
      normalizeModuleRows({ symptoms: toArray(symptoms) }, "symptoms"),
      "symptoms"
    );

    const examinations = firstNonEmpty(digitization.examinations, payload.examinations);
    appendRows(
      setExaminationData,
      normalizeModuleRows({ examinations: toArray(examinations) }, "examinations"),
      "examinations"
    );

    const diagnosis = firstNonEmpty(digitization.diagnosis, payload.diagnosis, payload.diagnoses);
    appendRows(
      setDiagnosisData,
      normalizeModuleRows({ diagnosis: toArray(diagnosis) }, "diagnosis"),
      "diagnosis"
    );

    const medications = firstNonEmpty(digitization.medications, payload.medications);
    appendRows(
      setMedicationData,
      moveUnmatchedMedicineSchedulesToNotes(
        moveUnmatchedMedicineFrequenciesToNotes(
          normalizeModuleRows({ medications: toArray(medications) }, "medications"),
          frequencyList
        ),
        timingList
      ),
      "medications"
    );

    const investigations = firstNonEmpty(
      digitization.lab_investigation,
      digitization.labInvestigation,
      payload.labInvestigations,
      payload.investigations
    );
    appendRows(
      setInvestigationData,
      normalizeModuleRows({ lab_investigation: toArray(investigations) }, "lab_investigations"),
      "investigations"
    );

    const advice = firstNonEmpty(digitization.advice, payload.advice);
    appendRows(
      setAdviceData,
      normalizeModuleRows({ advice: toArray(advice) }, "advice"),
      "advice"
    );

    const copiedVitals = firstNonEmpty(
      digitization.vitals_and_body_composition,
      digitization.vitalsAndBodyComposition,
      digitization.vitals,
      payload.vitals_and_body_composition,
      payload.vitalsAndBodyComposition,
      payload.vitals
    );
    const copiedVitalsObject = getCopiedVitalsObject(copiedVitals);
    if (copiedVitalsObject && patient_data?.patient_unique_id) {
      const today = moment().format("YYYY-MM-DD");
      const modalRows = Array.isArray(vitalsData) ? vitalsData : [];
      const existingRows = Array.isArray(selectedVitalsList) && selectedVitalsList.length
        ? selectedVitalsList
        : modalRows;
      const normalizedExistingRows = existingRows.map((row) => normalizeVitalsInputRow(row, patient_data));
      const editTargetIndex = findLatestVitalsRowIndexForDate(normalizedExistingRows, today);
      const editTargetRow = editTargetIndex >= 0 ? normalizedExistingRows[editTargetIndex] : {};
      const copiedVitalsRow = editTargetIndex >= 0
        ? normalizeCopiedVitalsRow(
          { ...copiedVitalsObject, date: getVitalsRowDate(editTargetRow) || today },
          editTargetRow,
          patient_data
        )
        : normalizeCopiedVitalsRow(
          { ...copiedVitalsObject, date: today, tcv_id: 0, tcbc_id: 0, dev_unique_id: 0 },
          {},
          patient_data
        );

      if (copiedVitalsRow) {
        const shouldCreateNewVitalsRow = editTargetIndex < 0;
        const isDuplicateVitalsRow = shouldCreateNewVitalsRow &&
          hasMatchingVitalsRow(normalizedExistingRows, copiedVitalsRow);

        if (isDuplicateVitalsRow) {
          if (!lastCopyRequest.isBulk) {
            toast.success("Copied to RxPad");
          }
        } else {
          const nextVitalsRows = shouldCreateNewVitalsRow
            ? [...normalizedExistingRows, copiedVitalsRow]
            : normalizedExistingRows.map((row, index) => (index === editTargetIndex ? copiedVitalsRow : row));

          publishSignal?.({ type: "vitals_copy_status", status: "pending" });
          const saveCopiedVitals = async () => {
            const action = await dispatch(addUpdateVitals({
              patient_unique_id: patient_data.patient_unique_id,
              pm_pid: patient_data.pm_pid ?? 0,
              pm_id: patient_data.pm_id ?? 0,
              pam_id: patient_data.pam_id ?? pamId ?? 0,
              patient_birth_weight: patientBirthWeight || vitalsData?.[0]?.patient_birth_weight || "",
              data: nextVitalsRows,
            }));

            if (action.meta.requestStatus === "fulfilled") {
              const savedVitalsRows = Array.isArray(action.payload) && action.payload.length
                ? action.payload
                : nextVitalsRows;
              const normalizedSavedVitalsRows = savedVitalsRows.map((row) => normalizeVitalsInputRow(row, patient_data));
              const displayVitalsRows = shouldCreateNewVitalsRow
                ? moveCopiedVitalsRowToEnd(normalizedSavedVitalsRows, copiedVitalsRow)
                : normalizedSavedVitalsRows;
              setVitalsData?.(displayVitalsRows);
              publishSignal?.({ type: "vitals_copy_status", status: "done" });
              if (!lastCopyRequest.isBulk) {
                toast.success("Copied to RxPad");
              }
            } else {
              publishSignal?.({ type: "vitals_copy_status", status: "error" });
              errorMessage(action.error?.message || "Failed to save vitals");
            }
          };

          saveCopiedVitals().catch((error) => {
            publishSignal?.({ type: "vitals_copy_status", status: "error" });
            errorMessage(error?.message || "Failed to save vitals");
          });
        }
      }
    }

    const medicalHistory = firstNonEmpty(
      digitization.medical_history,
      digitization.medicalHistory,
      payload.medicalHistory
    );
    const medicalHistoryRows = toArray(medicalHistory);
    if (medicalHistoryRows.length) {
      setMedicalHistoryData((prev = []) => convertMedicalHistoryToContextFormat(medicalHistoryRows, prev));
    }

    const copiedGynecHistory = normalizeGynaecHistoryFromDigitiseData(digitization);
    if (!isGynecDataEmpty(copiedGynecHistory)) {
      const mergedGynecHistory = mergeGynecHistory(updatedGynecHistory, copiedGynecHistory);
      setUpdatedGynecHistory?.((prev) => {
        return mergeGynecHistory(prev, copiedGynecHistory);
      });
      if (patient_data?.patient_unique_id && userId !== undefined && userId !== null) {
        syncGynecHistoryAfterEndVisit(
          patient_data.patient_unique_id,
          userId,
          mergedGynecHistory,
          { getGynecDetails, postGynecDetails, updateGynecDetails }
        );
      }
    }

    const surgeries = firstNonEmpty(digitization.surgeries, payload.surgeries);
    appendRows(
      setSurgeriesData,
      normalizeModuleRows({ surgery: toArray(surgeries) }, "surgery"),
      "surgeries"
    );

    const followUp = firstNonEmpty(digitization.follow_up, digitization.followUp, payload.followUp);
    toArray(followUp).forEach((item) => {
      const parsedDate = parseFollowUpDate(item, consultationDate);
      if (parsedDate) {
        setFollowUpDate(parsedDate);
      } else {
        const followUpText = String(item ?? "").trim();
        if (followUpText) setFollowUpDate(followUpText);
      }
    });

    const additionalNotes = firstNonEmpty(
      digitization.others,
      digitization.additionalNotes,
      payload.additionalNotes
    );
    toArray(additionalNotes).forEach((item) => appendAdditionalNote(setAdditionalNote, item));

    const copiedModuleContents = firstNonEmpty(
      digitization.moduleContents,
      digitization.module_contents,
      payload.moduleContents,
      payload.module_contents
    );
    if (copiedModuleContents && typeof copyCustomModuleContentsToRxPad === "function") {
      copyCustomModuleContentsToRxPad(toArray(copiedModuleContents));
    }
  }, [
    copyCustomModuleContentsToRxPad,
    consultationDate,
    dispatch,
    frequencyList,
    lastCopyRequest,
    pamId,
    patientBirthWeight,
    patient_data,
    publishSignal,
    selectedVitalsList,
    setAdditionalNote,
    setAdviceData,
    setDiagnosisData,
    setExaminationData,
    setFollowUpDate,
    setInvestigationData,
    setMedicalHistoryData,
    setMedicationData,
    setSurgeriesData,
    setSymptomsData,
    setUpdatedGynecHistory,
    setVitalsData,
    timingList,
    updatedGynecHistory,
    userId,
    vitalsData,
  ]);

  return null;
}
