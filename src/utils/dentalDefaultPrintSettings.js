/**
 * Print settings case_option entries for dental / oral examination modules.
 * id 21 = Dental Examination (odontogram + per-tooth records)
 * id 22 = Oral Examination (region-level oral entries)
 */

export const DENTAL_EXAM_CASE_OPTION_ID = 21;
export const ORAL_EXAM_CASE_OPTION_ID = 22;

export const DENTAL_GROUP_BY_TYPE = "type";
export const DENTAL_GROUP_BY_TOOTH = "tooth";

export const DEFAULT_DENTAL_EXAM_CASE_OPTION = {
  id: DENTAL_EXAM_CASE_OPTION_ID,
  title: "Dental Examination",
  format: "inline",
  enable: "Y",
  custom_status: "Y",
  showDentalChart: true,
  includeHistorical: false,
  groupDentalExaminationBy: DENTAL_GROUP_BY_TYPE,
};

export const DEFAULT_ORAL_EXAM_CASE_OPTION = {
  id: ORAL_EXAM_CASE_OPTION_ID,
  title: "Oral Examination",
  format: "inline",
  enable: "Y",
  custom_status: "Y",
  includeHistorical: false,
};

export function normalizeDentalExamOption(option = {}) {
  return {
    ...DEFAULT_DENTAL_EXAM_CASE_OPTION,
    ...option,
    id: DENTAL_EXAM_CASE_OPTION_ID,
    showDentalChart: option.showDentalChart !== false,
    includeHistorical: option.includeHistorical === true,
    groupDentalExaminationBy:
      option.groupDentalExaminationBy === DENTAL_GROUP_BY_TOOTH
        ? DENTAL_GROUP_BY_TOOTH
        : DENTAL_GROUP_BY_TYPE,
  };
}

export function normalizeOralExamOption(option = {}) {
  return {
    ...DEFAULT_ORAL_EXAM_CASE_OPTION,
    ...option,
    id: ORAL_EXAM_CASE_OPTION_ID,
    includeHistorical: option.includeHistorical === true,
  };
}

/**
 * Ensures dental (21) and oral (22) case options exist with default toggles.
 * @returns {{ caseOptions: array, updateFlag: boolean }}
 */
export function mergeDentalPrintCaseOptions(caseOptions = []) {
  const next = Array.isArray(caseOptions) ? [...caseOptions] : [];
  let updateFlag = false;

  const upsert = (defaults, normalize) => {
    const idx = next.findIndex((o) => o?.id === defaults.id);
    if (idx === -1) {
      next.push({ ...defaults });
      updateFlag = true;
      return;
    }
    const merged = normalize(next[idx]);
    const before = JSON.stringify(next[idx]);
    const after = JSON.stringify(merged);
    if (before !== after) {
      next[idx] = merged;
      updateFlag = true;
    }
  };

  upsert(DEFAULT_DENTAL_EXAM_CASE_OPTION, normalizeDentalExamOption);
  upsert(DEFAULT_ORAL_EXAM_CASE_OPTION, normalizeOralExamOption);

  return { caseOptions: next, updateFlag };
}

export function buildSavePrintSettingsPayload(defaultPrintSettings, caseOptions) {
  const rxPrescription = {
    ...defaultPrintSettings?.prescription,
    case_option: caseOptions,
  };
  return {
    ...defaultPrintSettings,
    prescription: JSON.stringify(rxPrescription),
    header_footer: JSON.stringify(defaultPrintSettings?.header_footer),
    page_format: JSON.stringify(defaultPrintSettings?.page_format),
  };
}
