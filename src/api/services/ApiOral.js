import api from "./axiosService";
import config from "../../config";

const oralBaseUrl = { customBaseUrl: config.snap_rx_api_url };

// 1. Templates
export const listOralTemplates = (type) =>
  api.get(`/api/v1/dental/oral-templates/${type}`, oralBaseUrl);
export const getOralTemplate = (type, id) =>
  api.get(`/api/v1/dental/oral-templates/${type}/${id}`, oralBaseUrl);
export const saveOralExaminationTemplate = (data) =>
  api.post(`/api/v1/dental/oral-templates/examination`, data, oralBaseUrl);
export const saveOralFindingsTemplate = (data) =>
  api.post(`/api/v1/dental/oral-templates/findings`, data, oralBaseUrl);
export const saveOralProceduresTemplate = (data) =>
  api.post(`/api/v1/dental/oral-templates/procedures`, data, oralBaseUrl);
export const saveOralTreatmentHistoryTemplate = (data) =>
  api.post(`/api/v1/dental/oral-templates/treatment-history`, data, oralBaseUrl);
export const saveOralNotesTemplate = (data) =>
  api.post(`/api/v1/dental/oral-templates/notes`, data, oralBaseUrl);
export const updateOralTemplate = (type, id, data) =>
  api.put(`/api/v1/dental/oral-templates/${type}/${id}`, data, oralBaseUrl);
export const deleteOralTemplateById = (type, id) =>
  api.delete(`/api/v1/dental/oral-templates/${type}/${id}`, oralBaseUrl);

// 2. Masters
export const getOralAreas = () =>
  api.get(`/api/v1/dental/masters/oral-areas?type=oral`, oralBaseUrl);

// 3. Examinations
export const getOralExamination = (patientId) =>
  api.get(`api/v1/dental/patients/${patientId}/oral-examination`, oralBaseUrl);
export const getOralExaminationTodayOnly = (patientId) =>
  api.get(`api/v1/dental/patients/${patientId}/oral-examination?todayOnly=true`, oralBaseUrl);
export const saveOralExaminationFull = (patientId, data) =>
  api.put(`api/v1/dental/patients/${patientId}/oral-examination`, data, oralBaseUrl);
export const patchOralExamination = (patientId, data) =>
  api.patch(`api/v1/dental/patients/${patientId}/oral-examination`, data, oralBaseUrl);
export const getOralExaminationHistory = (patientId) =>
  api.get(`api/v1/dental/patients/${patientId}/oral-examination/history`, oralBaseUrl);
