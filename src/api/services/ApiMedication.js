import api from "./axiosService";
import config from '../../config';
import { MEDICINE_STOCK_STATUS } from "../../utils/constants";

const baseUrl = { customBaseUrl: config.medication_api_url }
const doseBaseUrl = { customBaseUrl: config.lab_params_api_url };
const fuzzySearchBaseUrl = { customBaseUrl: config.searchengine_url };
const quantityBaseUrl = { customBaseUrl: config.symptoms_collector_api_url };
const eVitalsInventoryBaseUrl = { customBaseUrl: config.searchengine_url };

const ApiMedication = {};

ApiMedication.addTemplate = function (template) {
  return api.post(`/api/v1/medicine/addTemplate`, template, baseUrl);
};

ApiMedication.updateTemplate = function (template) {
  return api.post(`/api/v1/medicine/editTemplate`, template, baseUrl);
};

ApiMedication.deleteTemplate = function (templateId) {
  return api.get(`/api/v1/medicine/deleteTemplate/${templateId}`, baseUrl);
};

ApiMedication.getMedicationTemplates = function () {
  return api.get(`/api/v1/medicine/listTemplate`, baseUrl);
};

ApiMedication.singleTemplateDetails = async function (
  templateId,
  { mergeInventory = false } = {}
) {
  const result = await api.get(
    `/api/v1/medicine/singleTemplateDetails/${templateId}`,
    baseUrl
  );

  if (!mergeInventory || !result?.status) {
    return result;
  }

  const templateMedicines = Array.isArray(result.data) ? result.data : [];
  const mergedData =
    await ApiMedication.mergeSearchResultsWithInventory(templateMedicines);

  return {
    ...result,
    data: mergedData,
  };
};

ApiMedication.getMedicineDetails = function (query) {
  return api.post(`/api/v1/medicine/getMedicineDetails`, {
    tmm_id: query
  }, baseUrl);
};

ApiMedication.getFrequentlySearchedMedication = function () {
  return api.get(`/api/v1/medicine/frequentlyMedicine`, baseUrl);
};

// ApiMedication.getFrequentlySearchedMedication = function () {
//   return api.post(`/api/v1/medicine/searchMedicine`, {
//     search: "dolo"
//   }, baseUrl);
// };

ApiMedication.searchMedication = function (query) {
  return api.post(`/api/v1/medicine/searchMedicine`, {
    search: query
  }, baseUrl);
};

ApiMedication.getFuzzySearch = function (query, max_results = 1) {
  return api.get(
    `/api/v1/medicines/fuzzySearch?search=${query}&max_results=${max_results}`,
    fuzzySearchBaseUrl
  );
};

ApiMedication.getEvitalsInventory = function (referenceIds) {
  return api.post(
    `/api/v1/medicines/get-evitals-inventory`,
    { referenceIds },
    eVitalsInventoryBaseUrl
  );
};

ApiMedication.getMedicineAlternatives = function (medicineId) {
  return api.post(
    `/api/v1/medicines/get-alternatives`,
    { medicineId },
    fuzzySearchBaseUrl
  );
};

const getInventoryReferenceKey = (row) =>
  String(row?.referenceId ?? row?.reference_id ?? "");

const getMedicineReferenceId = (item) => {
  const refId = item?.reference_id ?? item?.referenceId;
  if (refId === undefined || refId === null) return "";
  return String(refId).trim();
};

ApiMedication.enrichMedicinesWithReferenceId = async function (medicines) {
  return Promise.all(
    medicines.map(async (item) => {
      if (getMedicineReferenceId(item)) {
        return item;
      }

      const name = String(item?.tmm_medicine_name ?? "").trim();
      if (!name) {
        return item;
      }

      try {
        const result = await ApiMedication.getFuzzySearch(name, 5);
        const rows = Array.isArray(result) ? result : result ? [result] : [];
        const match =
          rows.find((row) => String(row?.tmm_id) === String(item?.tmm_id)) ||
          rows[0];

        if (!getMedicineReferenceId(match)) {
          return item;
        }

        return {
          ...item,
          reference_id: match.reference_id ?? match.referenceId,
          objectID: match.objectID ?? item.objectID,
          tmm_hm_type: match.tmm_hm_type ?? item.tmm_hm_type,
          um_id: match.um_id ?? item.um_id,
        };
      } catch {
        return item;
      }
    })
  );
};

ApiMedication.mergeSearchResultsWithInventory = async function (searchResults) {
  const hasMissingReferenceId = searchResults.some(
    (item) => !getMedicineReferenceId(item)
  );
  const items = hasMissingReferenceId
    ? await ApiMedication.enrichMedicinesWithReferenceId(searchResults)
    : searchResults;

  const referenceIds = items
    .map((item) => getMedicineReferenceId(item))
    .filter((id) => id !== "");

  if (referenceIds.length === 0) {
    return items;
  }

  const applyNoStock = (list) =>
    list.map((item) => {
      const refId = getMedicineReferenceId(item);
      if (!refId) {
        return item;
      }
      return {
        ...item,
        quantity: 0,
        stock_status: MEDICINE_STOCK_STATUS.NO_STOCK,
      };
    });

  try {
    const inv = await ApiMedication.getEvitalsInventory(referenceIds);
    const invRows = Array.isArray(inv)
      ? inv
      : inv?.status && Array.isArray(inv.data)
        ? inv.data
        : Array.isArray(inv?.data)
          ? inv.data
          : [];
    const invByRef = new Map(
      invRows.map((row) => [getInventoryReferenceKey(row), row])
    );

    return items.map((item) => {
      const refId = getMedicineReferenceId(item);
      if (!refId) {
        return item;
      }

      const invRow = invByRef.get(refId);
      return {
        ...item,
        quantity: Number(invRow?.quantity ?? 0),
        stock_status: invRow?.stock_status ?? MEDICINE_STOCK_STATUS.NO_STOCK,
      };
    });
  } catch (e) {
    return applyNoStock(items);
  }
};

ApiMedication.mergeCaseManagerMedicineInventory = async function (
  caseManagerData,
  isChikitsalayAccessable = false
) {
  if (!isChikitsalayAccessable || !caseManagerData) {
    return caseManagerData;
  }

  const medicines = Array.isArray(caseManagerData.medicine)
    ? caseManagerData.medicine
    : [];

  if (medicines.length === 0) {
    return caseManagerData;
  }

  const mergedMedicine =
    await ApiMedication.mergeSearchResultsWithInventory(medicines);

  return {
    ...caseManagerData,
    medicine: mergedMedicine,
  };
};

ApiMedication.getQuantity = function (data) {
  return api.post(`/api/v1/cvt/get-medicine-quantity`, data, quantityBaseUrl);
};

ApiMedication.showMedicineFrequency = function () {
  return api.get(`/api/v1/medicine/showMedicineFrequency`, baseUrl);
};

ApiMedication.showMedicineTime = function () {
  return api.get(`/api/v1/medicine/showMedicineTime`, baseUrl);
};

ApiMedication.getMedicineType = function () {
  return api.get(`/api/v1/medicine/getMedicineType`, baseUrl);
};

ApiMedication.searchGeneric = function (query) {
  return api.post(`/api/v1/medicine/searchGeneric`, {
    search: query
  }, baseUrl);
};

ApiMedication.addMedicine = function (data) {
  return api.post(`/api/v1/medicine/addMedicine`, data, baseUrl);
};

ApiMedication.editMedicine = function (data) {
  return api.post(`/api/v1/medicine/editMedicine`, data, baseUrl);
};

ApiMedication.getLoadPreviousRx = async function (
  data,
  { mergeInventory = false } = {}
) {
  const result = await api.post(
    `/api/v1/medicine/getLoadPreviousRx`,
    data,
    baseUrl
  );

  if (!mergeInventory || !result?.status) {
    return result;
  }

  const previousRxMedicines = Array.isArray(result.data) ? result.data : [];
  const mergedData =
    await ApiMedication.mergeSearchResultsWithInventory(previousRxMedicines);

  return {
    ...result,
    data: mergedData,
  };
};

ApiMedication.getAllDoses = function () {
  return api.get(`/api/v1/doses`, doseBaseUrl);
};

ApiMedication.createDose = function (data) {
  return api.post(`/api/v1/doses`, data, doseBaseUrl);
};

ApiMedication.updateDose = function (data) {
  return api.put(`/api/v1/doses/${data?.id}`, data, doseBaseUrl);
};

ApiMedication.deleteDose = function (id) {
  return api.delete(`/api/v1/doses/${id}`, doseBaseUrl);
};

export default ApiMedication;