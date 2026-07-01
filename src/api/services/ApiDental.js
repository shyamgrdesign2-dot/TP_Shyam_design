import api from "./axiosService";
import config from "../../config";

const dentalBaseUrl = { customBaseUrl: config.snap_rx_api_url };
const billingBaseUrl = { customBaseUrl: config.lab_params_api_url };

export const fetchDentalBillItems = (page = 1, limit = 200) =>
  api.get(
    `/api/v1/billing/billItem/list?type=Dental_Service&page=${page}&limit=${limit}`,
    billingBaseUrl
  );

// 1. Templates
export const listTemplates = (type) =>
  api.get(`/api/v1/dental/templates/${type}`, dentalBaseUrl);
export const getTemplate = (type, id) =>
  api.get(`/api/v1/dental/templates/${type}/${id}`, dentalBaseUrl);
export const saveExaminationTemplate = (data) =>
  api.post(`/api/v1/dental/templates/examination`, data, dentalBaseUrl);
export const saveFindingsTemplate = (data) =>
  api.post(`/api/v1/dental/templates/findings`, data, dentalBaseUrl);
export const saveProceduresTemplate = (data) =>
  api.post(`/api/v1/dental/templates/procedures`, data, dentalBaseUrl);
export const saveTreatmentHistoryTemplate = (data) =>
  api.post(`/api/v1/dental/templates/treatment-history`, data, dentalBaseUrl);
export const saveNotesTemplate = (data) =>
  api.post(`/api/v1/dental/templates/notes`, data, dentalBaseUrl);
export const updateTemplate = (type, id, data) =>
  api.put(`/api/v1/dental/templates/${type}/${id}`, data, dentalBaseUrl);
export const deleteTemplateById = (type, id) =>
  api.delete(`/api/v1/dental/templates/${type}/${id}`, dentalBaseUrl);

// 2. Masters
export const getSurfaces = () => api.get(`/api/v1/dental/masters/surfaces?type=dental`, dentalBaseUrl);
export const getDiagnoses = (type = 'dental') => api.get(`/api/v1/dental/masters/diagnoses?type=${type}`, dentalBaseUrl);
export const getProcedures = (type = 'dental') => api.get(`/api/v1/dental/masters/procedures?type=${type}`, dentalBaseUrl);
export const getToothMap = (dentition = "adult") =>
  api.get(`/api/v1/dental/masters/tooth-map?dentition=${dentition}`, dentalBaseUrl);

// 3. Examinations
export const getExamination = (patientId) =>
  api.get(`/api/v1/dental/patients/${patientId}/examination`, dentalBaseUrl);
export const getExaminationTodayOnly = (patientId) =>
  api.get(`/api/v1/dental/patients/${patientId}/examination?todayOnly=true`, dentalBaseUrl);
export const updateExaminationFull = (patientId, data) =>
  api.put(`/api/v1/dental/patients/${patientId}/examination`, data, dentalBaseUrl);
export const updateExaminationPartial = (patientId, data) =>
  api.patch(`/api/v1/dental/patients/${patientId}/examination`, data, dentalBaseUrl);
export const getExaminationHistory = (patientId) =>
  api.get(`/api/v1/dental/patients/${patientId}/examination/history`, dentalBaseUrl);
export const getRxExamination = (patientId, rxId) =>
  api.get(
    `/api/v1/dental/patients/${patientId}/prescriptions/${rxId}/examination`,
    dentalBaseUrl
  );
export const updateRxExaminationFull = (patientId, rxId, data) =>
  api.put(
    `/api/v1/dental/patients/${patientId}/prescriptions/${rxId}/examination`,
    data,
    dentalBaseUrl
  );
export const updateRxExaminationPartial = (patientId, rxId, data) =>
  api.patch(
    `/api/v1/dental/patients/${patientId}/prescriptions/${rxId}/examination`,
    data,
    dentalBaseUrl
  );
export const updateToothFindings = (patientId, toothCode, data) =>
  api.put(
    `/api/v1/dental/patients/${patientId}/teeth/${toothCode}/findings`,
    data,
    dentalBaseUrl
  );
export const updateToothProcedures = (patientId, toothCode, data) =>
  api.put(
    `/api/v1/dental/patients/${patientId}/teeth/${toothCode}/procedures`,
    data,
    dentalBaseUrl
  );
export const updateToothTreatmentHistory = (patientId, toothCode, data) =>
  api.put(
    `/api/v1/dental/patients/${patientId}/teeth/${toothCode}/treatment-history`,
    data,
    dentalBaseUrl
  );
export const updateToothNotes = (patientId, toothCode, data) =>
  api.put(
    `/api/v1/dental/patients/${patientId}/teeth/${toothCode}/notes`,
    data,
    dentalBaseUrl
  );

// 4. Treatment Plans
export const getPlans = (patientId) =>
  api.get(`/api/v1/dental/patients/${patientId}/plans`, dentalBaseUrl);
export const createPlan = (patientId, data) =>
  api.post(`/api/v1/dental/patients/${patientId}/plans`, data, dentalBaseUrl);
export const updatePlan = (patientId, planId, data) =>
  api.patch(`/api/v1/dental/patients/${patientId}/plans/${planId}`, data, dentalBaseUrl);
export const deletePlan = (patientId, planId) =>
  api.delete(`/api/v1/dental/patients/${patientId}/plans/${planId}`, dentalBaseUrl);
export const duplicatePlan = (patientId, planId) =>
  api.post(`/api/v1/dental/patients/${patientId}/plans/${planId}/duplicate`, {}, dentalBaseUrl);
export const activatePlan = (patientId, planId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/activate`,
    data || {},
    dentalBaseUrl
  );
export const startTreatment = (patientId, planId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/start-treatment`,
    data || {},
    dentalBaseUrl
  );
export const markPlanCompleted = (patientId, planId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/mark-completed`,
    data || {},
    dentalBaseUrl
  );
export const revertPlanToEstimates = (patientId, planId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/revert-to-estimates`,
    data || {},
    dentalBaseUrl
  );
export const revertPlanToProgress = (patientId, planId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/revert-to-progress`,
    data || {},
    dentalBaseUrl
  );

// 5. Plan Services
export const addPlanService = (patientId, planId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services`,
    data,
    dentalBaseUrl
  );
export const updatePlanService = (patientId, planId, serviceId, data) =>
  api.patch(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}`,
    data,
    dentalBaseUrl
  );
export const deletePlanService = (patientId, planId, serviceId) =>
  api.delete(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}`,
    dentalBaseUrl
  );
export const markServiceCompleted = (patientId, planId, serviceId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/mark-completed`,
    data || {},
    dentalBaseUrl
  );
export const revertServiceToProgress = (patientId, planId, serviceId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/revert-to-progress`,
    data || {},
    dentalBaseUrl
  );

// 6. Quick Visit Records
export const getQuickVisitRecords = (patientId, planId, serviceId) =>
  api.get(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/quick-visit-records`,
    dentalBaseUrl
  );
export const getQuickVisitRecord = (patientId, planId, serviceId, qvrId) =>
  api.get(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/quick-visit-records/${qvrId}`,
    dentalBaseUrl
  );
export const createQuickVisitRecord = (patientId, planId, serviceId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/quick-visit-records`,
    data,
    dentalBaseUrl
  );
export const updateQuickVisitRecord = (patientId, planId, serviceId, qvrId, data) =>
  api.patch(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/quick-visit-records/${qvrId}`,
    data,
    dentalBaseUrl
  );
export const deleteQuickVisitRecord = (patientId, planId, serviceId, qvrId) =>
  api.delete(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/quick-visit-records/${qvrId}`,
    dentalBaseUrl
  );

// 7. Appointments
export const getServiceAppointments = (patientId, planId, serviceId) =>
  api.get(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/appointments`,
    dentalBaseUrl
  );
export const updateServiceAppointment = (patientId, planId, serviceId, appointmentId, data) =>
  api.patch(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/appointments/${appointmentId}`,
    data,
    dentalBaseUrl
  );

// 8. Billing & Invoices
export const getPlanBillPreview = (patientId, planId) =>
  api.get(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/bill-preview`,
    dentalBaseUrl
  );
export const getServiceBillPreview = (patientId, planId, serviceId) =>
  api.get(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/bill-preview`,
    dentalBaseUrl
  );
export const createInvoice = (patientId, planId, data) =>
  api.post(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/invoices`,
    data,
    dentalBaseUrl
  );
export const getInvoice = (patientId, invoiceId) =>
  api.get(`/api/v1/dental/patients/${patientId}/invoices/${invoiceId}`, dentalBaseUrl);

// 9. Plan & Service Templates
export const listPlanTemplates = () =>
  api.get(`/api/v1/dental/plan-templates/plan`, dentalBaseUrl);
export const getPlanTemplateById = (id) =>
  api.get(`/api/v1/dental/plan-templates/plan/${id}`, dentalBaseUrl);
export const createPlanTemplate = (data) =>
  api.post(`/api/v1/dental/plan-templates/plan`, data, dentalBaseUrl);
export const updatePlanTemplateById = (id, data) =>
  api.put(`/api/v1/dental/plan-templates/plan/${id}`, data, dentalBaseUrl);
export const deletePlanTemplateById = (id) =>
  api.delete(`/api/v1/dental/plan-templates/plan/${id}`, dentalBaseUrl);

export const listServiceTemplates = () =>
  api.get(`/api/v1/dental/service-templates/service`, dentalBaseUrl);
export const getServiceTemplateById = (id) =>
  api.get(`/api/v1/dental/service-templates/service/${id}`, dentalBaseUrl);
export const createServiceTemplate = (data) =>
  api.post(`/api/v1/dental/service-templates/service`, data, dentalBaseUrl);
export const updateServiceTemplateById = (id, data) =>
  api.put(`/api/v1/dental/service-templates/service/${id}`, data, dentalBaseUrl);
export const deleteServiceTemplateById = (id) =>
  api.delete(`/api/v1/dental/service-templates/service/${id}`, dentalBaseUrl);

// 10. Rx Previews
export const getPlanRxPreview = (patientId, planId) =>
  api.get(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/rx-preview`,
    dentalBaseUrl
  );
export const getServiceRxPreview = (patientId, planId, serviceId) =>
  api.get(
    `/api/v1/dental/patients/${patientId}/plans/${planId}/services/${serviceId}/rx-preview`,
    dentalBaseUrl
  );
