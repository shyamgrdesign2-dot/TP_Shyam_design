const isBlankValue = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "");

const ZYDUS_FREQUENCY_LANGUAGE_FIELDS = [
  "tmf_title",
  "tmf_gujarati",
  "tmf_hindi",
  "tmf_marathi",
  "tmf_kannada",
  "tmf_tamil",
  "tmf_assamese",
  "tmf_bengali",
  "tmf_odia",
];

const normalizeComparableId = (value) => {
  if (isBlankValue(value)) return "";
  return String(value).trim();
};

const normalizeMasterId = (value) => {
  const normalized = normalizeComparableId(value);
  if (!normalized) return "";
  const numericValue = Number(normalized);
  return Number.isNaN(numericValue) ? normalized : numericValue;
};

export const normalizeZydusFrequencyList = (result) => {
  const content = Array.isArray(result?.content)
    ? result.content
    : Array.isArray(result?.data?.content)
    ? result.data.content
    : [];

  return content.reduce((list, frequency) => {
    const frequencyId = normalizeComparableId(frequency?.frequencyId);
    const frequencyName = String(frequency?.frequencyName || "").trim();

    if (!frequencyId || !frequencyName) return list;

    const languageTitles = ZYDUS_FREQUENCY_LANGUAGE_FIELDS.reduce(
      (titles, field) => ({
        ...titles,
        [field]: frequencyName,
      }),
      {}
    );

    list.push({
      ...frequency,
      ...languageTitles,
      frequencyId,
      genx_frequency_id: frequencyId,
      is_genx_frequency: true,
      tmf_id: normalizeMasterId(frequencyId),
      tmf_block: 1,
      tmf_block_val: frequencyId,
    });

    return list;
  }, []);
};

const hasMedicationFrequencySlots = (medication = {}) =>
  [
    medication?.tcm_tmm_freq_morning,
    medication?.tcm_tmm_freq_afternoon,
    medication?.tcm_tmm_freq_evening,
    medication?.tcm_tmm_freq_night,
  ].some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      String(value) !== "0"
  );

export const findZydusFrequencyById = (frequencyList = [], frequencyId) => {
  const normalizedFrequencyId = normalizeComparableId(frequencyId);
  if (!normalizedFrequencyId || !Array.isArray(frequencyList)) return null;

  return (
    frequencyList.find(
      (frequency) =>
        normalizeComparableId(
          frequency?.genx_frequency_id ??
          frequency?.frequencyId
        ) === normalizedFrequencyId
    ) || null
  );
};

export const normalizeZydusMedicineFrequencyRows = (
  medicines = [],
  frequencyList = []
) => {
  if (!Array.isArray(medicines) || medicines.length === 0) return [];

  return medicines.map((medicine) => {
    if (!medicine || hasMedicationFrequencySlots(medicine)) return medicine;

    const frequency = findZydusFrequencyById(
      frequencyList,
      medicine?.genx_frequency_id ??
      medicine?.frequencyId ??
      medicine?.tmm_freq_type
    );

    if (!frequency) return medicine;

    return {
      ...medicine,
      tmm_freq_type: frequency.tmf_id,
      tmm_freq_type_name: frequency.tmf_title,
      tmf_block: frequency.tmf_block,
      tmf_block_val: frequency.tmf_block_val,
      genx_frequency_id: frequency.genx_frequency_id,
      frequencyId: frequency.frequencyId,
    };
  });
};

export const convertGenxMedicationItem = (item = {}, uniqueId = "") => {
  const genericProfile = item?.itemGenericProfile || {};
  const medicineName = item?.itemName || "";

  return {
    is_genx_medicine: true,
    genx_item_id: item?.itemId || 0,
    genx_item_code: item?.itemCode || "",
    genx_item_name: medicineName,
    genx_item_type_code: item?.itemType?.lookupCode || "",
    genx_item_type_name: item?.itemType?.lookupName || "",
    genx_drug_class: genericProfile?.drugClass || "",
    genx_generic_profile: genericProfile || null,
    genx_item_raw: item || null,
    tmm_id: item?.itemId || 0,
    tmm_medicine_name: medicineName,
    tmm_generic: genericProfile?.genericName || "",
    tmm_type: 0,
    tmm_dosage: "",
    tmm_dosage_unit_name: "",
    tmm_unit: 0,
    tmm_unit_name: "",
    tmu_id: 0,
    tmm_freq_type: 0,
    tmm_freq_type_name: "",
    tmf_block: 0,
    tmf_block_val: "",
    genx_frequency_id: "",
    frequencyId: "",
    tcm_tmm_freq_morning: 0,
    tcm_tmm_freq_afternoon: 0,
    tcm_tmm_freq_evening: 0,
    tcm_tmm_freq_night: 0,
    tmm_time: 0,
    tmm_time_name: "",
    tmm_days: "",
    tmm_duration_type: "",
    tmm_days_duration_type: "",
    tmm_remarks: "",
    display_qty: "",
    medicineUnit: [],
    unique_id: uniqueId,
  };
};

export const convertGenxMedicationSearchResults = (
  items = [],
  createUniqueId
) => {
  if (!Array.isArray(items)) return [];

  return items
    .slice(0, 10)
    .map((item) =>
      convertGenxMedicationItem(
        item,
        typeof createUniqueId === "function" ? createUniqueId() : ""
      )
    );
};

export const getGenxMedicationOrderItemId = (
  medication = {},
  { allowRehydratedZydusMedicationRow = false } = {}
) => {
  const itemId =
    medication?.genx_item_id ||
    medication?.itemId ||
    (
      medication?.is_genx_medicine ||
      allowRehydratedZydusMedicationRow
        ? medication?.tmm_id
        : ""
    );

  return isBlankValue(itemId) || String(itemId) === "0" ? "" : itemId;
};

export const getGenxMedicationOrderFrequencyId = (
  medication = {},
  { allowRehydratedZydusMedicationRow = false } = {}
) => {
  const frequencyId =
    medication?.genx_frequency_id ||
    medication?.frequencyId ||
    (
      medication?.is_genx_medicine ||
      allowRehydratedZydusMedicationRow
        ? medication?.tmm_freq_type
        : ""
    );

  return isBlankValue(frequencyId) || String(frequencyId) === "0"
    ? ""
    : frequencyId;
};

export const getGenxMedicationOrderDuration = (medication = {}) => {
  if (!isBlankValue(medication?.tmm_days_duration_type)) {
    return medication.tmm_days_duration_type;
  }

  if (!isBlankValue(medication?.duration)) {
    return medication.duration;
  }

  if (
    !isBlankValue(medication?.tmm_days) &&
    !isBlankValue(medication?.tmm_duration_type)
  ) {
    return `${medication.tmm_days} ${medication.tmm_duration_type}`;
  }

  return "";
};

export const buildGenxMedicationOrderDrugLines = (
  medications = [],
  { allowRehydratedZydusMedicationRows = false } = {}
) => {
  if (!Array.isArray(medications)) return [];

  return medications.reduce((drugLines, medication) => {
    const rowOptions = {
      allowRehydratedZydusMedicationRow: allowRehydratedZydusMedicationRows,
    };
    const itemId = getGenxMedicationOrderItemId(medication, rowOptions);
    const frequencyId = getGenxMedicationOrderFrequencyId(
      medication,
      rowOptions
    );

    if (isBlankValue(itemId) || isBlankValue(frequencyId)) {
      return drugLines;
    }

    drugLines.push({
      itemId,
      frequencyId,
      duration: getGenxMedicationOrderDuration(medication),
      remarks:
        medication?.tmm_remarks ??
        medication?.remarks ??
        medication?.notes ??
        "",
    });

    return drugLines;
  }, []);
};
