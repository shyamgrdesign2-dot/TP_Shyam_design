import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.medicalhistory_api_url }

// Section order/visibility lives on its own configured host: the endpoints are
// currently only deployed on UAT, so every environment points there until prod
// is ready. See EnvironmentConfig.medicalhistory_section_order_api_url.
const sectionOrderBaseUrl = { customBaseUrl: config.medicalhistory_section_order_api_url }

const ApiMedicalHistory = {};

ApiMedicalHistory.getPatientLastHistory = function (data) {
  return api.post(`/api/v1/medicalhistory/getPatientLastHistory`, data, baseUrl);
};

ApiMedicalHistory.listSectionwithTag = function () {
  return api.get(`/api/v1/medicalhistory/listSectionwithTag`, baseUrl);
};

ApiMedicalHistory.addTag = function (data) {
  return api.post(`/api/v1/medicalhistory/addTag`, data, baseUrl);
};

ApiMedicalHistory.searchTag = function (data) {
  return api.post(`/api/v1/medicalhistory/searchTag`, data, baseUrl);
};

/**
 * Per-doctor Medical History drawer layout: section order + visibility.
 * Contract: docs/MEDICAL-HISTORY-SECTION-CONFIG-API.md
 *
 * getUserSectionOrder is a GET and takes no payload — the doctor is resolved
 * from the bearer token. It responds { status, data: [{tmmhs_id, visible,
 * order}] } with a flat array (no wrapper object).
 */
ApiMedicalHistory.getUserSectionOrder = function () {
  return api.get(`/api/v1/medicalhistory/getUserSectionOrder`, sectionOrderBaseUrl);
};

ApiMedicalHistory.setUserSectionOrder = function (data) {
  return api.post(`/api/v1/medicalhistory/setUserSectionOrder`, data, sectionOrderBaseUrl);
};

ApiMedicalHistory.addEditPrivateNotes = function (data) {
  return api.post(`/api/v1/privatenotes/addPrivateNotes`, data, baseUrl);
};

ApiMedicalHistory.listPrivateNotes = function (data) {
  return api.post(`/api/v1/privatenotes/listPrivateNotes`, data, baseUrl);
};

ApiMedicalHistory.deletePrivateNotes = function (data) {
  return api.post(`/api/v1/privatenotes/deletePrivateNotes`, data, baseUrl);
};

export default ApiMedicalHistory;
