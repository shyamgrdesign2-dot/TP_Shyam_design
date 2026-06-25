import api from "./axiosService";
import config from '../../config';
import ApiMedication from "./ApiMedication";

const baseUrl = { customBaseUrl: config.casemanager_api_url }
const consultationBaseUrl = { customBaseUrl: config.consultation_api_url }
const orderManagementBaseUrl = { customBaseUrl: config.order_management_api_url }

const ApiCaseManager = {};

ApiCaseManager.oneClickAddTemplate = function (template) {
    return api.post(`/api/v1/casemanager/oneclickAddTemplate`, template, baseUrl);
};

ApiCaseManager.oneClickUpdateTemplate = function (template) {
    return api.post(`/api/v1/casemanager/oneclickEditTemplate`, template, baseUrl);
};

ApiCaseManager.oneClickDeleteTemplate = function (templateId) {
    return api.get(`/api/v1/casemanager/oneclickDeleteTemplate/${templateId}`, baseUrl);
};

ApiCaseManager.oneClickTemplatesList = function () {
    return api.get(`/api/v1/casemanager/oneclickTemplateList`, baseUrl);
};

ApiCaseManager.oneClickSingleTemplateDetails = async function (
    templateId,
    { mergeInventory = false } = {}
) {
    const result = await api.get(
        `/api/v1/casemanager/oneclickSingleTemplateDetails/${templateId}`,
        baseUrl
    );

    if (!mergeInventory || !result?.status) {
        return result;
    }

    const templateData = result.data;
    const medicines = Array.isArray(templateData?.medicine)
        ? templateData.medicine
        : [];

    if (medicines.length === 0) {
        return result;
    }

    const mergedMedicines =
        await ApiMedication.mergeSearchResultsWithInventory(medicines);

    return {
        ...result,
        data: {
            ...templateData,
            medicine: mergedMedicines,
        },
    };
};

ApiCaseManager.addFollowupTemplate = function (template) {
    return api.post(`/api/v1/casemanager/addFollowupTemplate`, template, baseUrl);
};

ApiCaseManager.editFollowupTemplate = function (template) {
    return api.post(`/api/v1/casemanager/editFollowupTemplate`, template, baseUrl);
};

ApiCaseManager.deleteFollowupTemplate = function (templateId) {
    return api.get(`/api/v1/casemanager/deleteFollowupTemplate/${templateId}`, baseUrl);
};

ApiCaseManager.listFollowupTemplate = function () {
    return api.get(`/api/v1/casemanager/listFollowupTemplate`, baseUrl);
};

ApiCaseManager.addCaseManager = function (data) {
    return api.post(`/api/v1/casemanager/addCaseManager`, data, baseUrl);
};

ApiCaseManager.editCaseManager = function (data) {
    return api.post(`/api/v1/casemanager/editCaseManager`, data, baseUrl);
};

ApiCaseManager.viewCaseManager = function (data) {
    return api.post(`/api/v1/casemanager/viewCaseManager`, data, baseUrl);
};

ApiCaseManager.sendCashsheetWhatsapp = function (data) {
    return api.post(`/api/v1/casemanager/sendCashsheetWhatsapp`, data, baseUrl);
};

ApiCaseManager.getSmartRx = function (data) {
    return api.post(`/api/v1/casemanager/smart-rx`, data, baseUrl);
};

ApiCaseManager.getInvestigationAndMedicine = function (data) {
    return api.post(`/api/v1/casemanager/getInvestigationAndMedicine`, data, baseUrl);
};

ApiCaseManager.listConsultations = function (data) {
    return api.post(`/api/v1/casemanager/listConsultations`, data, consultationBaseUrl);
};

ApiCaseManager.getRecentConsultations = function (patient_unique_id) {
    return api.get(`/api/v1/casemanager/getRecentConsultations?patient_unique_id=${encodeURIComponent(patient_unique_id)}`, consultationBaseUrl);
};

ApiCaseManager.orderMedicineAndInvestigation = function (data) {
    return api.post(`/api/v1/genx/orderMedicineAndInvestigation`, data, orderManagementBaseUrl);
};

ApiCaseManager.draftToConsultation = function (data) {
    return api.post(`/api/v1/casemanager/draft-to-consultation`, data, baseUrl);
};

export default ApiCaseManager;