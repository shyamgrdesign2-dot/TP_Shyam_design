import { ASSETS } from "../../../../assets";

const M = ASSETS.dental.medicalIcons;

export const tpMedicalIconRegistry = {
  "clipboard-activity": { bulk: M.clipboardActivity },
  Diagnosis: { bulk: M.diagnosis },
  "health care": { bulk: M.healthCare },
  "health-file-03": { bulk: M.healthFile03 },
  "medical service": { bulk: M.medicalService },
  "note-2": { bulk: M.note2 },
  "surgical-scissors-02": { bulk: M.surgicalScissors02 },
  Tablets: { bulk: M.tablets },
  "Test Tube": { bulk: M.testTube },
  tooth: { bulk: M.tooth },
};

export const tpMedicalIconNames = Object.keys(tpMedicalIconRegistry);

const tpMedicalIconAliasMap = {
  "clipboard activity": "clipboard-activity",
  "clipboard-activity": "clipboard-activity",
  diagnosis: "Diagnosis",
  Diagnosis: "Diagnosis",
  "health care": "health care",
  "health file 03": "health-file-03",
  "health-care": "health care",
  "health-file-03": "health-file-03",
  healthcare: "health care",
  "medical service": "medical service",
  "medical-service": "medical service",
  medicalservice: "medical service",
  "note-2": "note-2",
  "note 2": "note-2",
  "surgical scissors 02": "surgical-scissors-02",
  "surgical-scissors-02": "surgical-scissors-02",
  tablets: "Tablets",
  Tablets: "Tablets",
  "test tube": "Test Tube",
  "Test Tube": "Test Tube",
  "test-tube": "Test Tube",
  testtube: "Test Tube",
  tooth: "tooth",
};

export function resolveTPMedicalIconName(name) {
  const direct =
    tpMedicalIconAliasMap[name] ?? tpMedicalIconAliasMap[name.trim()];
  if (direct) return direct;
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ");
  return tpMedicalIconAliasMap[normalized] ?? null;
}
