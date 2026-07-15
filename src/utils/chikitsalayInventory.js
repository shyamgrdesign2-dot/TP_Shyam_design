export const INVENTORY_WARNING_TOOLTIP =
  "This is not part of our inventory. Please try to click and select from the dropdown.";

export const DIAGNOSIS_INVENTORY_WARNING =
  "The diagnosis does not have an ICD code. Please click and select a diagnosis from the dropdown.";

export const INVESTIGATION_INVENTORY_WARNING =
  "The investigation is not part of Chikitsalay inventory. Please click and select an investigation from the dropdown.";

export const MEDICATION_INVENTORY_WARNING =
  "The medicine is not selected from Chikitsalay inventory. Please click and select the medicine from the dropdown.";

export const getInvalidChikitsalayInventoryMessage = ({
  diagnosisData = [],
  investigationData = [],
  medicationData = [],
} = {}) => {
  if (diagnosisData.some(hasInvalidChikitsalayDiagnosis)) {
    return DIAGNOSIS_INVENTORY_WARNING;
  }
  if (investigationData.some(hasInvalidChikitsalayInvestigation)) {
    return INVESTIGATION_INVENTORY_WARNING;
  }
  if (medicationData.some(hasInvalidChikitsalayMedication)) {
    return MEDICATION_INVENTORY_WARNING;
  }
  return INVENTORY_WARNING_TOOLTIP;
};

export const hasDiagnosisIcdCode = (diagnosis = {}) =>
  String(diagnosis?.icd_code ?? "").trim() !== "";

export const isChikitsalayInvestigationRow = (investigation = {}) =>
  Number(investigation?.hm_type) === 15;

export const shouldShowInvestigationVCBadge = (
  investigation = {},
  isChikitsalayAccessable = false
) =>
  Boolean(isChikitsalayAccessable) &&
  Number(investigation?.hm_type ?? investigation?.metadata?.hm_type) === 15 &&
  Number(investigation?.um_id ?? investigation?.metadata?.um_id) === 0 &&
  Number(investigation?.is_available ?? investigation?.metadata?.is_available) === 1;

export const hasMedicineMasterId = (medicine = {}) => {
  const value = medicine?.tmm_id;
  if (value === undefined || value === null || String(value).trim() === "") {
    return false;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue !== 0;
};

export const requiresMedicineInventorySelection = (medicine = {}) =>
  Boolean(medicine?.voice_rx_requires_inventory_selection);

export const hasInvalidChikitsalayDiagnosis = (diagnosis = {}) =>
  String(diagnosis?.tds_name ?? "").trim() !== "" && !hasDiagnosisIcdCode(diagnosis);

export const hasInvalidChikitsalayInvestigation = (investigation = {}) =>
  String(investigation?.investigation_name ?? "").trim() !== "" &&
  !isChikitsalayInvestigationRow(investigation);

export const hasInvalidChikitsalayMedication = (medicine = {}) =>
  String(medicine?.tmm_medicine_name ?? "").trim() !== "" &&
  (requiresMedicineInventorySelection(medicine) || !hasMedicineMasterId(medicine));

export const hasAnyInvalidChikitsalayInventoryRows = ({
  diagnosisData = [],
  investigationData = [],
  medicationData = [],
} = {}) =>
  diagnosisData.some(hasInvalidChikitsalayDiagnosis) ||
  investigationData.some(hasInvalidChikitsalayInvestigation) ||
  medicationData.some(hasInvalidChikitsalayMedication);
