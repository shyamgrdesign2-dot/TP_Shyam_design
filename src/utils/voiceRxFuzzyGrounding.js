import ApiMedication from "../api/services/ApiMedication";
import ApiInvestigation from "../api/services/ApiInvestigation";

const firstText = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const toResultRows = (result) => {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];

  const nested =
    result.data
    || result.results
    || result.medicines
    || result.investigations
    || result.items;
  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === "object") return [nested];

  // Single hit object returned directly.
  if (result.tmm_id || result.tmm_medicine_name || result.investigation_name) {
    return [result];
  }
  return [];
};

const hasMedicineMasterId = (tmmId) =>
  tmmId !== undefined &&
  tmmId !== null &&
  String(tmmId).trim() !== "" &&
  Number(tmmId) !== 0;

const getMedicineName = (row) => {
  if (typeof row === "string") return firstText(row);
  return firstText(
    row?.tmm_medicine_name,
    row?.tm_medicine_name,
    row?.medicine_name,
    row?.medicine,
    row?.dm_name,
    row?.dm_names,
    row?.name,
    row?.title,
    row?.voice_rx_original_name
  );
};

const getInvestigationName = (row) => {
  if (typeof row === "string") return firstText(row);
  return firstText(
    row?.investigation_name,
    row?.test_name,
    row?.name,
    row?.title,
    row?.voice_rx_original_name
  );
};

const markMedicationFuzzyMiss = (row, spokenName) => {
  const base = typeof row === "object" && row ? row : { tmm_medicine_name: spokenName };
  return {
    ...base,
    tmm_id: 0,
    tmm_medicine_name: firstText(base.tmm_medicine_name, spokenName),
    voice_rx_original_name: firstText(base.voice_rx_original_name, spokenName),
    voice_rx_from_module: true,
    voice_rx_requires_inventory_selection: true,
    voice_rx_fuzzy_corrected: false,
    voice_rx_fuzzy_miss: true,
    voice_rx_auto_grounded: false,
  };
};

const markInvestigationFuzzyMiss = (row, spokenName) => {
  const base = typeof row === "object" && row ? row : { investigation_name: spokenName };
  return {
    ...base,
    investigation_name: firstText(base.investigation_name, spokenName),
    voice_rx_original_name: firstText(base.voice_rx_original_name, spokenName),
    voice_rx_from_module: true,
    voice_rx_requires_inventory_selection: true,
    voice_rx_fuzzy_corrected: false,
    voice_rx_fuzzy_miss: true,
  };
};

/**
 * Resolve Neo voice medication rows against medicine fuzzySearch before RxPad append.
 * Fuzzy miss → keep spoken name and mark for inventory "not found" UI.
 */
export async function fuzzyGroundMedicationRows(
  rows = [],
  { isChikitsalayAccessable } = {}
) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  return Promise.all(
    rows.map(async (row) => {
      const spokenName = getMedicineName(row);
      if (!spokenName) return row;
      if (typeof row === "object" && hasMedicineMasterId(row?.tmm_id) && !row?.voice_rx_fuzzy_miss) {
        return row;
      }

      try {
        const result = await ApiMedication.getFuzzySearch(spokenName, 1, {
          isChikitsalayAccessable,
        });
        const hit = toResultRows(result)[0];
        if (!hit || (!hasMedicineMasterId(hit.tmm_id) && !firstText(hit.tmm_medicine_name))) {
          return markMedicationFuzzyMiss(row, spokenName);
        }

        const correctedName = firstText(hit.tmm_medicine_name, spokenName);
        const base = typeof row === "object" && row ? row : { medicine: spokenName };
        const originalName = firstText(base.voice_rx_original_name, spokenName);
        const grounded = hasMedicineMasterId(hit.tmm_id);

        return {
          ...base,
          objectID: hit.objectID ?? base.objectID,
          reference_id: hit.reference_id ?? base.reference_id,
          tmm_id: hit.tmm_id ?? 0,
          tmm_medicine_name: correctedName,
          tmm_generic: hit.tmm_generic ?? base.tmm_generic ?? "",
          tmm_company: hit.tmm_company ?? base.tmm_company ?? "",
          tmm_type: hit.tmm_type ?? base.tmm_type ?? 0,
          tmm_hm_type: hit.tmm_hm_type ?? base.tmm_hm_type,
          um_id: hit.um_id ?? base.um_id,
          stock_status: hit.stock_status ?? base.stock_status,
          quantity: hit.quantity ?? base.quantity,
          medicineUnit: hit.medicineUnit ?? base.medicineUnit,
          default_tmm_unit: hit.default_tmm_unit ?? base.default_tmm_unit,
          voice_rx_original_name: originalName,
          voice_rx_fuzzy_corrected: grounded,
          voice_rx_fuzzy_miss: !grounded,
          voice_rx_requires_inventory_selection: !grounded,
          voice_rx_auto_grounded: grounded,
          voice_rx_from_module: grounded ? false : true,
        };
      } catch (error) {
        console.warn("VoiceRx medication fuzzy grounding failed", spokenName, error);
        return markMedicationFuzzyMiss(row, spokenName);
      }
    })
  );
}

/**
 * Resolve Neo voice lab investigation rows against investigation fuzzySearch before RxPad append.
 * Fuzzy miss → keep spoken name and mark for inventory "not found" UI.
 */
export async function fuzzyGroundLabInvestigationRows(
  rows = [],
  { isChikitsalayAccessable } = {}
) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  return Promise.all(
    rows.map(async (row) => {
      const spokenName = getInvestigationName(row);
      if (!spokenName) return row;
      if (typeof row === "object" && row?.voice_rx_fuzzy_corrected && !row?.voice_rx_fuzzy_miss) {
        return row;
      }

      try {
        const result = await ApiInvestigation.getFuzzySearch(spokenName, 1, {
          isChikitsalayAccessable,
        });
        const hit = toResultRows(result)[0];
        if (!hit || !firstText(hit.investigation_name)) {
          return markInvestigationFuzzyMiss(row, spokenName);
        }

        const correctedName = firstText(hit.investigation_name, spokenName);
        const base = typeof row === "object" && row ? row : { investigation_name: spokenName };
        const originalName = firstText(base.voice_rx_original_name, spokenName);

        return {
          ...base,
          investigation_name: correctedName,
          objectID: hit.objectID ?? hit.id ?? base.objectID,
          id: hit.id ?? hit.objectID ?? base.id,
          hm_type: hit.hm_type ?? base.hm_type,
          um_id: hit.um_id ?? base.um_id,
          service_code: hit.service_code ?? base.service_code,
          voice_rx_original_name: originalName,
          voice_rx_fuzzy_corrected: true,
          voice_rx_fuzzy_miss: false,
          voice_rx_requires_inventory_selection: false,
          voice_rx_from_module: false,
          note: base.note ?? "",
        };
      } catch (error) {
        console.warn("VoiceRx investigation fuzzy grounding failed", spokenName, error);
        return markInvestigationFuzzyMiss(row, spokenName);
      }
    })
  );
}
