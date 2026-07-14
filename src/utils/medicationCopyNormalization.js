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

export function normalizeCopiedMedicationRows(rows = [], frequencyList = [], timingList = []) {
  return rows.map((row) => normalizeCopiedMedicineSchedule(
    normalizeCopiedMedicineFrequency(row, frequencyList),
    timingList
  ));
}
