// Shared strip util for voice-rx new UI empty-row feature.
// Strips rows that have no data in any meaningful column.
// Used by Box template-apply, HeaderPrescription global template apply,
// and PrescriptionNew copy-to-rxpad append flows.

export const MODULE_STRIP_KEYS = {
  symptoms: ["symptom_name", "since", "severity", "note"],
  examinations: ["examination_name", "note"],
  diagnosis: ["tds_name", "icd_code", "since", "status", "note"],
  medications: ["tmm_medicine_name", "medicine_name", "name", "tmm_dosage", "tmm_dosage_unit_name", "tmm_freq_type_name", "tmm_time_name", "tmm_days_duration_type", "tmm_remarks"],
  investigations: ["investigation_name", "note"],
  advice: ["advice_name"],
  surgeries: ["name", "notes"],
};

export function stripEmptyRows(rows, moduleKey) {
  const keys = MODULE_STRIP_KEYS[moduleKey];
  if (!keys || !Array.isArray(rows)) return rows;
  return rows.filter((r) => keys.some((k) => String(r?.[k] ?? "").trim() !== ""));
}

export function appendStripped(prev, next, moduleKey) {
  const cleanedPrev = stripEmptyRows(prev, moduleKey);
  return [...cleanedPrev, ...(next || [])];
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return Boolean(text);
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (hasValue(row?.[key])) return row[key];
  }
  return "";
}

function idKey(prefix, value) {
  return hasValue(value) && String(value).trim() !== "0" ? `${prefix}:${String(value).trim()}` : "";
}

function textKey(prefix, value) {
  const normalized = normalizeText(value);
  return normalized ? `${prefix}:${normalized}` : "";
}

function hasNumericToken(value) {
  return /\d/.test(String(value ?? ""));
}

function medicationIdentityParts(row = {}) {
  const medicineId = idKey("medicine-id", row.tmm_id);
  const medicineNameValue = firstValue(row, [
    "tmm_medicine_name",
    "tm_medicine_name",
    "medicine_name",
    "medicine",
    "name",
    "title",
  ]);
  const medicineName = textKey("medicine", medicineNameValue);
  const medicineOriginalName = textKey("medicine-original", row.voice_rx_original_name);
  const medicineIdentities = [medicineId, medicineName, medicineOriginalName].filter(Boolean);
  if (!medicineIdentities.length) return [];

  const dose = normalizeText(firstValue(row, ["tmm_dosage", "dosage", "dose"]));
  const unit = normalizeText(firstValue(row, ["tmm_dosage_unit_name", "unitPerDose", "tmm_unit_name"]));
  const form = normalizeText(firstValue(row, ["tmm_type_name", "type", "form"]));
  const doseAwareKeys = medicineIdentities.map((medicineIdentity) =>
    [medicineIdentity, `dose:${dose}`, `unit:${unit}`, `form:${form}`].join("|")
  );

  const directMedicineKeys = [
    hasNumericToken(medicineNameValue) ? medicineName : "",
    medicineOriginalName && (hasPositiveId(row.tmm_id) || hasNumericToken(row.voice_rx_original_name))
      ? medicineOriginalName
      : "",
  ].filter(Boolean);

  if (directMedicineKeys.length) {
    return [...directMedicineKeys, ...doseAwareKeys];
  }

  return doseAwareKeys;
}

function rowMergeKeys(row = {}, moduleKey) {
  switch (moduleKey) {
    case "symptoms":
      return [textKey("symptom", firstValue(row, ["symptom_name", "name", "lineItem", "title"]))].filter(Boolean);
    case "examinations":
      return [textKey("examination", firstValue(row, ["examination_name", "name", "lineItem", "title"]))].filter(Boolean);
    case "diagnosis":
      return [
        idKey("diagnosis-id", row.tds_id),
        textKey("diagnosis-icd", row.icd_code),
        textKey("diagnosis", firstValue(row, ["tds_name", "name", "lineItem", "title"])),
        textKey("diagnosis-original", row.voice_rx_original_name),
      ].filter(Boolean);
    case "medications":
      return medicationIdentityParts(row);
    case "investigations":
      return [
        textKey("investigation", firstValue(row, ["investigation_name", "test_name", "name", "lineItem", "title"])),
        textKey("investigation-original", row.voice_rx_original_name),
        idKey("investigation-service", row.service_code),
        idKey("investigation-um", row.um_id),
        idKey("investigation-id", row.id),
      ].filter(Boolean);
    case "advice":
      return [textKey("advice", firstValue(row, ["advice_name", "advice", "name", "lineItem", "title"]))].filter(Boolean);
    case "surgeries":
      return [
        textKey("surgery", firstValue(row, ["name", "surgery_name", "procedure_name", "lineItem", "title"])),
        idKey("surgery-id", row.id),
      ].filter(Boolean);
    default:
      return [];
  }
}

const PRESERVE_EXISTING_KEYS_ON_MATCH = new Set([
  "unique_id",
  "voice_rx_group_id",
  "index",
]);

function hasPositiveId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0;
}

function hasNonZeroValue(value) {
  return hasValue(value) && String(value).trim() !== "0";
}

const SELECTED_MEDICATION_KEYS = new Set([
  "tmm_id",
  "tmm_medicine_name",
  "tmm_generic",
  "tmm_company",
  "tmm_type",
  "objectID",
  "reference_id",
  "quantity",
  "stock_status",
  "tmm_hm_type",
  "hm_type",
  "um_id",
  "voice_rx_from_module",
  "voice_rx_requires_inventory_selection",
]);

const SELECTED_DIAGNOSIS_KEYS = new Set([
  "tds_id",
  "tds_name",
  "icd_code",
  "pms_default",
  "objectID",
  "voice_rx_from_module",
]);

const SELECTED_INVESTIGATION_KEYS = new Set([
  "id",
  "objectID",
  "investigation_name",
  "hm_type",
  "um_id",
  "service_code",
  "pms_default",
  "voice_rx_from_module",
]);

function shouldPreserveSelectedRowValue(existing = {}, key, moduleKey) {
  if (PRESERVE_EXISTING_KEYS_ON_MATCH.has(key) && hasValue(existing?.[key])) return true;

  if (moduleKey === "medications") {
    return hasPositiveId(existing?.tmm_id) && SELECTED_MEDICATION_KEYS.has(key) && hasValue(existing?.[key]);
  }

  if (moduleKey === "diagnosis") {
    const hasSelectedDiagnosis = hasPositiveId(existing?.tds_id) || hasValue(existing?.icd_code);
    return hasSelectedDiagnosis && SELECTED_DIAGNOSIS_KEYS.has(key) && hasValue(existing?.[key]);
  }

  if (moduleKey === "investigations") {
    const hasSelectedInvestigation =
      hasPositiveId(existing?.id) ||
      hasNonZeroValue(existing?.service_code) ||
      hasNonZeroValue(existing?.hm_type);
    return hasSelectedInvestigation && SELECTED_INVESTIGATION_KEYS.has(key) && hasValue(existing?.[key]);
  }

  return false;
}

function overlayPresentValues(existing = {}, incoming = {}, moduleKey) {
  const merged = { ...existing };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (shouldPreserveSelectedRowValue(existing, key, moduleKey)) return;
    if (hasValue(value)) {
      merged[key] = value;
    }
  });
  return merged;
}

export function mergeCopiedRows(prev, next, moduleKey) {
  const cleanedPrev = stripEmptyRows(Array.isArray(prev) ? prev : [], moduleKey);
  const incomingRows = stripEmptyRows(Array.isArray(next) ? next : [], moduleKey);
  if (!incomingRows?.length) return cleanedPrev;

  const merged = [...cleanedPrev];
  const keyToIndex = new Map();

  merged.forEach((row, index) => {
    rowMergeKeys(row, moduleKey).forEach((key) => {
      if (keyToIndex.has(key)) return;
      keyToIndex.set(key, index);
    });
  });

  incomingRows.forEach((row) => {
    const keys = rowMergeKeys(row, moduleKey);
    const existingIndex = keys.map((key) => keyToIndex.get(key)).find((index) => index !== undefined);

    if (existingIndex !== undefined) {
      merged[existingIndex] = overlayPresentValues(merged[existingIndex], row, moduleKey);
      return;
    }

    const nextIndex = merged.length;
    merged.push(row);
    keys.forEach((key) => {
      if (!keyToIndex.has(key)) keyToIndex.set(key, nextIndex);
    });
  });

  return merged;
}

export function appendDedupedText(prev, incoming) {
  const incomingText = String(incoming ?? "").trim();
  if (!incomingText) return prev || "";

  const currentLines = String(prev || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set(currentLines.map(normalizeText).filter(Boolean));
  const newLines = incomingText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = normalizeText(line);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return [...currentLines, ...newLines].join("\n");
}
