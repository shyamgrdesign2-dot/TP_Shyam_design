/**
 * End-visit helpers for Voice / Neo Sapien rows not present in master inventory.
 * Medicines → POST addMedicine (HeaderPrescription.buildMedicinePayload).
 * Investigations → InvestigationBox "Add Custom" shape (`change: 1`).
 */

export function hasMedicineMasterId(item = {}) {
  const numericTmmId = Number(item?.tmm_id);
  return (
    item?.tmm_id !== undefined &&
    item?.tmm_id !== null &&
    String(item.tmm_id).trim() !== "" &&
    Number.isFinite(numericTmmId) &&
    numericTmmId !== 0
  );
}

export function needsCustomMedicineCreate(item = {}) {
  return Boolean(item?.voice_rx_from_module) && !hasMedicineMasterId(item);
}

export function isUngroundedVoiceInvestigation(item = {}) {
  return Boolean(item?.voice_rx_from_module);
}

export function buildInvestigationEndVisitPayload(investigationData = []) {
  if (!Array.isArray(investigationData)) return [];

  return investigationData.map((item) => {
    if (!item || typeof item !== "object" || !isUngroundedVoiceInvestigation(item)) {
      return item;
    }

    const investigationName = String(
      item.investigation_name || item.voice_rx_original_name || item.name || ""
    ).trim();

    return {
      ...item,
      change: 1,
      investigation_name: investigationName,
      unique_id: item.unique_id || item.objectID,
      note: item.note || "",
      voice_rx_from_module: false,
      voice_rx_fuzzy_miss: false,
      voice_rx_requires_inventory_selection: false,
      voice_rx_original_name: item.voice_rx_original_name || investigationName,
    };
  });
}
