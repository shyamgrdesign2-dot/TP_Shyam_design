function firstTextValue(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const text = firstTextValue(...value);
      if (text) return text;
      continue;
    }
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function normalizeMatchText(value) {
  return String(value || "").trim().toLowerCase();
}

function getRawMedicineFrequencyText(medicine) {
  return firstTextValue(
    medicine?.frequency,
    medicine?.freq,
    medicine?.frequencyText,
    medicine?.frequency_text,
    medicine?.tmm_freq_type_name
  );
}

function getRawMedicineScheduleText(medicine) {
  return firstTextValue(
    medicine?.schedule,
    medicine?.when,
    medicine?.timing,
    medicine?.tmm_time_name
  );
}

function appendMedicineTextToNotes(notes, label, value) {
  const current = String(notes || "").trim();
  const text = String(value || "").trim();
  if (!text) return current;
  const labelledText = label ? `${label}: ${text}` : text;
  if (current.includes(labelledText) || (!label && current.includes(text))) return current;
  return current ? `${current} | ${labelledText}` : labelledText;
}

function normalizeFrequencyToken(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text === "½") return "0.5";
  if (text === "¼") return "0.25";
  if (text === "¾") return "0.75";

  const fractionMatch = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return "";
    return String(numerator / denominator).replace(/\.0$/, "");
  }

  if (/^\.\d+$/.test(text)) return `0${text}`;
  if (/^\d+(?:\.\d+)?$/.test(text)) return text;
  return "";
}

export const CUSTOM_MEDICINE_TYPE_ID = 40;
export const CUSTOM_MEDICINE_DEFAULT_UNIT_ID = 5;

export const CUSTOM_MEDICINE_UNITS = [
  { tmu_id: 1, tmu_title: "Ampule(s)" },
  { tmu_id: 2, tmu_title: "Tablet(s)" },
  { tmu_id: 4, tmu_title: "ml" },
  { tmu_id: 5, tmu_title: "unit(s)" },
  { tmu_id: 6, tmu_title: "Capsule(s)" },
  { tmu_id: 7, tmu_title: "Fingertip(s)" },
  { tmu_id: 8, tmu_title: "Pea sized" },
  { tmu_id: 9, tmu_title: "gm" },
  { tmu_id: 11, tmu_title: "tsp" },
  { tmu_id: 14, tmu_title: "Drop(s)" },
  { tmu_id: 24, tmu_title: "Puff(s)" },
  { tmu_id: 27, tmu_title: "tbsp(s)" },
];

export const MEDICINE_UNIT_FALLBACK_MAP = CUSTOM_MEDICINE_UNITS.reduce((acc, unit) => {
  acc[unit.tmu_id] = unit.tmu_title;
  return acc;
}, {
  3: "mg",
});

const DOSAGE_WORDS = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

function normalizeUnitTitle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\(s\)/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/s$/, "");
}

function normalizeDoseValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text === "½") return "0.5";
  if (text === "¼") return "0.25";
  if (text === "¾") return "0.75";
  const lower = text.toLowerCase();
  if (DOSAGE_WORDS[lower]) return DOSAGE_WORDS[lower];
  const fractionMatch = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return "";
    return String(numerator / denominator).replace(/\.0$/, "");
  }
  if (/^\.\d+$/.test(text)) return `0${text}`;
  if (/^\d+(?:\.\d+)?$/.test(text)) return text;
  return "";
}

export function parseMedicationDoseText(...values) {
  let parsedWithoutUnit = null;
  for (const value of values.flat()) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+(?:\.\d+)?|\.\d+|\d+\s*\/\s*\d+|[¼½¾]|one|two|three|four|five|six|seven|eight|nine|ten)\s*([a-zA-Z][a-zA-Z()/. -]*)?$/i);
    if (!match) continue;

    const doseValue = normalizeDoseValue(match[1]);
    if (!doseValue) continue;
    const parsed = {
      value: doseValue,
      unitText: String(match[2] || "").trim(),
      raw: trimmed,
    };
    if (parsed.unitText) return parsed;
    if (!parsedWithoutUnit) parsedWithoutUnit = parsed;
  }
  return parsedWithoutUnit;
}

export function findMedicineUnitByTitle(unitText, medicineUnits = []) {
  const key = normalizeUnitTitle(unitText);
  if (!key) return null;
  return medicineUnits.find((unit) => normalizeUnitTitle(unit?.tmu_title) === key) || null;
}

function firstPositiveId(...values) {
  for (const value of values) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) return value;
  }
  return 0;
}

function getUnitTitleById(unitId, medicineUnits = []) {
  const unit = medicineUnits.find((item) => item?.tmu_id == unitId);
  return unit?.tmu_title || "";
}

export function resolveMedicineUnitTitle(item = {}, unitId = item?.tmm_unit || item?.tmu_id || item?.default_tmm_unit) {
  if (unitId === undefined || unitId === null || String(unitId).trim() === "") return "";
  if (item?.tmm_unit == unitId && item?.tmm_unit_name) return item.tmm_unit_name;
  const matchedUnit = Array.isArray(item?.medicineUnit)
    ? item.medicineUnit.find((unit) => unit?.tmu_id == unitId)
    : null;
  return matchedUnit?.tmu_title || MEDICINE_UNIT_FALLBACK_MAP[unitId] || "";
}

export function buildMedicineDoseDisplayText(item = {}) {
  const dosage = String(item?.tmm_dosage ?? item?.dosage ?? item?.unitPerDose ?? item?.unit_per_dose ?? "").trim();
  if (!dosage) return String(item?.tmm_dosage_unit_name || "").trim();
  if (/\d/.test(dosage) && /[a-zA-Z]/i.test(dosage)) return dosage;
  const unitTitle = resolveMedicineUnitTitle(item, item?.tmm_unit || item?.tmu_id || item?.default_tmm_unit);
  return [dosage, unitTitle].filter(Boolean).join(" ");
}

export function mergeMedicineUnitOptions(...unitLists) {
  const merged = [];
  const seen = new Set();
  unitLists.flat().forEach((unit) => {
    if (!unit?.tmu_id) return;
    const key = String(unit.tmu_id);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(unit);
  });
  return merged;
}

export function resolveCopiedDoseFields(row = {}, medicineUnits = [], options = {}) {
  const normalizedUnits = mergeMedicineUnitOptions(
    Array.isArray(medicineUnits) ? medicineUnits : [],
    options.includeCustomUnits ? CUSTOM_MEDICINE_UNITS : []
  );
  const existingUnitId = firstPositiveId(row.tmm_unit, row.tmu_id);
  const existingDose = String(row.tmm_dosage ?? "").trim();
  if (existingUnitId && existingDose) {
    const existingUnitTitle = row.tmm_unit_name || getUnitTitleById(existingUnitId, normalizedUnits);
    return {
      tmm_dosage: existingDose,
      tmm_unit: existingUnitId,
      tmu_id: existingUnitId,
      tmm_unit_name: existingUnitTitle,
      tmm_dosage_unit_name: existingUnitTitle ? `${existingDose} ${existingUnitTitle}` : row.tmm_dosage_unit_name || existingDose,
    };
  }

  const parsedDose = parseMedicationDoseText(row.tmm_dosage_unit_name, row.unitPerDose, row.dosage, row.dose, row.tmm_dosage);
  if (parsedDose) {
    const matchedUnit = findMedicineUnitByTitle(parsedDose.unitText, normalizedUnits);
    if (matchedUnit) {
      return {
        tmm_dosage: parsedDose.value,
        tmm_unit: matchedUnit.tmu_id,
        tmu_id: matchedUnit.tmu_id,
        tmm_unit_name: matchedUnit.tmu_title,
        tmm_dosage_unit_name: `${parsedDose.value} ${matchedUnit.tmu_title}`,
      };
    }

    if (options.fallbackUnitIdOnUnitMismatch) {
      const fallbackUnitId = options.fallbackUnitIdOnUnitMismatch;
      const fallbackUnitTitle = getUnitTitleById(fallbackUnitId, normalizedUnits) || options.fallbackUnitTitle || "";
      return {
        tmm_dosage: parsedDose.value,
        tmm_unit: fallbackUnitId,
        tmu_id: fallbackUnitId,
        tmm_unit_name: fallbackUnitTitle,
        tmm_dosage_unit_name: fallbackUnitTitle ? `${parsedDose.value} ${fallbackUnitTitle}` : parsedDose.raw,
      };
    }

    return {
      tmm_dosage: parsedDose.value,
      tmm_dosage_unit_name: row.tmm_dosage_unit_name || parsedDose.raw,
      tmm_unit: 0,
      tmu_id: 0,
      tmm_unit_name: "",
    };
  }

  if (!options.defaultIfMissing) return {};

  const fallbackUnitId = firstPositiveId(
    options.defaultUnitId,
    options.fallbackUnitIdOnMissing,
    normalizedUnits[0]?.tmu_id
  );
  const fallbackUnitTitle = getUnitTitleById(fallbackUnitId, normalizedUnits) || options.fallbackUnitTitle || "";
  return {
    tmm_dosage: String(options.defaultDose ?? "1"),
    tmm_unit: fallbackUnitId,
    tmu_id: fallbackUnitId,
    tmm_unit_name: fallbackUnitTitle,
    tmm_dosage_unit_name: fallbackUnitTitle
      ? `${options.defaultDose ?? "1"} ${fallbackUnitTitle}`
      : String(options.defaultDose ?? "1"),
  };
}

export function parseMedicationFrequencySlots(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const normalizedText = text.replace(/[–—−]/g, "-");
  const parts = normalizedText.split(/\s*(?:-|x|X|×|,)\s*/);
  if (parts.length !== 3 && parts.length !== 4) return null;

  const slots = parts.map(normalizeFrequencyToken);
  if (slots.some((slot) => slot === "")) return null;

  const [morning, afternoon, eveningOrNight, night] = slots;
  const hasEvening = parts.length === 4;
  return {
    label: slots.join(" - "),
    morning,
    afternoon,
    evening: hasEvening ? eveningOrNight : 0,
    night: hasEvening ? night : eveningOrNight,
  };
}

function hasMedicineFrequencyBlockValues(medicine) {
  return [
    medicine?.tcm_tmm_freq_morning,
    medicine?.tcm_tmm_freq_afternoon,
    medicine?.tcm_tmm_freq_evening,
    medicine?.tcm_tmm_freq_night,
  ].some((value) => value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "0");
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

function findMedicineFrequencyTitle(value, frequencyList = []) {
  const text = normalizeMatchText(value);
  if (!text) return null;
  return frequencyList.find(
    (item) => item?.tmf_block !== 0 && normalizeMatchText(item?.tmf_title) === text
  ) || null;
}

function findMedicineTiming(value, timingList = []) {
  const text = normalizeMatchText(value);
  if (!text || text === "none") return null;
  return timingList.find(
    (item) => normalizeMatchText(item?.tmt_title) === text
  ) || null;
}

export function getMedicineFrequencyDisplay(medicine, frequencyList = []) {
  const rawFrequency = getRawMedicineFrequencyText(medicine);
  const parsedRawFrequency = parseMedicationFrequencySlots(rawFrequency);
  if (parsedRawFrequency) {
    return {
      label: parsedRawFrequency.label,
      blockValue: "",
    };
  }

  const frequencyObjById = frequencyList.find((x) => x.tmf_id == medicine?.tmm_freq_type);
  const frequencyObjByExactTitle = findMedicineFrequencyTitle(rawFrequency, frequencyList);
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

function normalizeCopiedMedicineFrequency(row, frequencyList = []) {
  const rawFrequency = getRawMedicineFrequencyText(row);
  const parsedRawFrequency = [
    row?.frequency,
    row?.freq,
    row?.frequencyText,
    row?.frequency_text,
    row?.tmm_freq_type_name,
  ].map(parseMedicationFrequencySlots).find(Boolean);
  const parsedFrequency = parsedRawFrequency || (
    hasMedicineFrequencyBlockValues(row)
      ? parseMedicationFrequencySlots(formatMedicineFrequencyBlock(row))
      : null
  );

  if (parsedFrequency) {
    return {
      ...row,
      tmm_freq_type_name: parsedFrequency.label,
      tmm_freq_type: 0,
      tmf_block: 0,
      tmf_block_val: "",
      tcm_tmm_freq_morning: parsedFrequency.morning,
      tcm_tmm_freq_afternoon: parsedFrequency.afternoon,
      tcm_tmm_freq_evening: parsedFrequency.evening,
      tcm_tmm_freq_night: parsedFrequency.night,
    };
  }

  const frequencyObjById = frequencyList.find((x) => x.tmf_id == row?.tmm_freq_type && x?.tmf_block !== 0);
  const frequencyObjByTitle = findMedicineFrequencyTitle(rawFrequency, frequencyList);
  const frequencyObj = frequencyObjById || frequencyObjByTitle;
  if (frequencyObj) {
    return {
      ...row,
      tmm_freq_type_name: frequencyObj.tmf_title,
      tmm_freq_type: frequencyObj.tmf_id,
      tmf_block: frequencyObj.tmf_block,
      tmf_block_val: frequencyObj.tmf_block_val || "",
      tcm_tmm_freq_morning: 0,
      tcm_tmm_freq_afternoon: 0,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: 0,
    };
  }

  if (!rawFrequency) return row;

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
    tmm_remarks: appendMedicineTextToNotes(row?.tmm_remarks || row?.notes || row?.note, "Frequency", rawFrequency),
  };
}

function normalizeCopiedMedicineSchedule(row, timingList = []) {
  const rawSchedule = getRawMedicineScheduleText(row);
  if (!rawSchedule || normalizeMatchText(rawSchedule) === "none") return row;

  const timingObj = findMedicineTiming(rawSchedule, timingList);
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
    tmm_remarks: appendMedicineTextToNotes(row?.tmm_remarks || row?.notes || row?.note, "Schedule", rawSchedule),
  };
}

function normalizeCopiedMedicineDose(row) {
  const doseFields = resolveCopiedDoseFields(row, row?.medicineUnit, {
    includeCustomUnits: true,
  });
  return Object.keys(doseFields).length ? { ...row, ...doseFields } : row;
}

export function normalizeCopiedMedicationRows(rows = [], frequencyList = [], timingList = []) {
  return rows.map((row) => normalizeCopiedMedicineDose(
    normalizeCopiedMedicineSchedule(
      normalizeCopiedMedicineFrequency(row, frequencyList),
      timingList
    )
  ));
}
