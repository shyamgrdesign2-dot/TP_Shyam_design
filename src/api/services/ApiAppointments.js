import api from "./axiosService";
import config from "../../config";
import { generateMockData } from "../../utils/utils";
import { IS_DEV } from "../../utils/constants";
import { isCopilotMock, withDemoAppointments } from "../../components/dr-copilot/chart-search/copilotMock";
import {
  formatGenxClinicalEncounterDate,
  getGenxEncounterIdentity,
  normalizeGenxClinicalEncounterResponse,
  normalizeGenxSyncResponse,
} from "../../utils/zydusClinicalEncounterAdapter";

const baseUrl = { customBaseUrl: config.appointment_api_url };
const baseZydusUrl = { customBaseUrl: config.zydus_api_url };
const baseZydusProxyUrl = { customBaseUrl: config.zydus_proxy_url };
const baseVisitUrl = { customBaseUrl: config.visit_api_url };
const baseSnapRxUrl = { customBaseUrl: config.snap_rx_api_url };
const baseIpdUrl = { customBaseUrl: config.ipd_api_url };
const GENX_CLINICAL_ENCOUNTER_PAGE_SIZE = 100;

const ApiAppointments = {};

// ApiAppointments.getAll = function (params) {
//   if (IS_DEV) {
//     return {
//       status: true,
//       data: {
//         queue_count: 34,
//         finished_count: 22,
//         cancelled_count: 41,
//         app_data: generateMockData(),
//       },
//     };
//   } else {
//     return api.post(`/api/v1/appointment/listAppointment`, params, baseUrl);
//   }
// };

ApiAppointments.getProfile = function () {
  return api.get(`/api/v1/appointment/showProfile`, baseUrl);
};

ApiAppointments.changeHospital = function (data) {
  return api.post(`/api/v1/appointment/changeHospital`, data, baseUrl);
};

ApiAppointments.getCaseTypes = function () {
  return api.post(`/api/v1/appointment/listCasetype`, {}, baseUrl);
};

ApiAppointments.getAllAppointment = function (data) {
  const live = api.post(`/api/v1/appointment/listAppointment`, data, baseUrl);
  /* Velora's demo mode (?veloraMock=1) shows its invented patients in the
     queue and in search, in this browser only. Off by default; the live
     response is untouched otherwise. */
  if (!isCopilotMock()) return live;
  return live
    .then((res) => withDemoAppointments(res, data))
    .catch(() => withDemoAppointments(null, data));
};

/* Month calendar summary: one GET for the window, `size` appointments per
   day plus that day's total_count. Query params match the webservice
   contract (startDate, endDate, size, appointmentStatus CSV). */
ApiAppointments.listAppointmentCalendar = function ({
  startDate,
  endDate,
  size = 3,
  appointmentStatus,
} = {}) {
  return api.get(`/api/v1/appointment/listAppointmentCalendar`, {
    ...baseUrl,
    params: {
      startDate,
      endDate,
      size,
      ...(appointmentStatus != null && appointmentStatus !== ""
        ? { appointmentStatus }
        : {}),
    },
  });
};

ApiAppointments.cancelAppointments = function (data) {
  return api.post(`/api/v1/appointment/cancelAppointment`, data, baseUrl);
};

ApiAppointments.endVisit = function (data) {
  return api.post(`/api/v1/appointment/endVisit`, data, baseUrl);
};

ApiAppointments.searchPatients = function (query, company) {
  if (company === "zydus") {
    return api.get(
      `/zyduspatientsearch?wt=json&rows=10&q=${query}`,
      baseZydusUrl
    );
  } else {
    return api.post(
      `/api/v1/appointment/searchPatient`,
      {
        search: query,
      },
      baseUrl
    );
  }
};

ApiAppointments.listSalutation = function () {
  return api.get(`/api/v1/appointment/showSalutation`, baseUrl);
};

ApiAppointments.listBloodGroup = function () {
  return api.get(`/api/v1/appointment/showBloodGroup`, baseUrl);
};

ApiAppointments.editBloodGroup = function (body) {
  return api.post(`/api/v1/appointment/editBloodGroup`, body, baseUrl);
};

ApiAppointments.searchPincode = function (body) {
  return api.post(`/api/v1/appointment/searchPincode`, body, baseUrl);
};

ApiAppointments.addPatient = function (formData) {
  return api.post(`/api/v1/appointment/addPatient`, formData, baseUrl);
};

ApiAppointments.editPatient = function (formData) {
  return api.post(`/api/v1/appointment/editPatientProfile`, formData, baseUrl);
};

ApiAppointments.viewPatient = function (data) {
  return api.post(`/api/v1/appointment/viewPatient`, data, baseUrl);
};

ApiAppointments.customizedPad = function (data) {
  return api.post(`/api/v1/appointment/customizedPad`, data, baseUrl);
};

ApiAppointments.swtichLayout = function (data) {
  return api.post(`/api/v1/appointment/swtichLayout`, data, baseUrl);
};

ApiAppointments.navigatetoTatvaPedia = function () {
  return api.post(`/api/v1/appointment/navigatetoTatvaPedia`, {}, baseUrl);
};

ApiAppointments.upsertDoctorSettingFlag = function (data) {
  return api.post(`/api/v1/appointment/upsertDoctorSettingFlag`, data, baseUrl);
};

ApiAppointments.synczyduspatient = function (body) {
  return api.post(`/appointment/synczyduspatient`, body, baseZydusUrl);
};

ApiAppointments.zydusRefIds = function () {
  return api.get(`/appointment/zydusRefIds`, baseZydusUrl);
};

ApiAppointments.ictAuthToken = function () {
  return api.post(`/ictAuthProxy`, {}, baseZydusProxyUrl);
};

const getClinicalEncounterPath = (date, page = 1, isCancel = false) => {
  const creationTimeStamp = encodeURIComponent(
    formatGenxClinicalEncounterDate(date)
  );
  return `/genx2/clinical-encounters?page=${page}&size=${GENX_CLINICAL_ENCOUNTER_PAGE_SIZE}&sort=encounterNumber%2Cdesc&isActiveFlag=true&isCancel=${Boolean(
    isCancel
  )}&creationTimeStamp=${creationTimeStamp}`;
};

ApiAppointments.clinicalEncounters = async function (date, isCancel = false) {
  const firstResponse = normalizeGenxClinicalEncounterResponse(
    await api.get(getClinicalEncounterPath(date, 1, isCancel), baseIpdUrl)
  );
  const totalPages = Math.max(firstResponse.totalPages || 1, 1);
  const recordsByIdentity = new Map();

  firstResponse.data.forEach((record) => {
    const identity = getGenxEncounterIdentity(record);
    if (identity) recordsByIdentity.set(identity, record);
  });

  for (let page = 2; page <= totalPages; page += 1) {
    const pageResponse = normalizeGenxClinicalEncounterResponse(
      await api.get(getClinicalEncounterPath(date, page, isCancel), baseIpdUrl)
    );
    pageResponse.data.forEach((record) => {
      const identity = getGenxEncounterIdentity(record);
      if (identity && !recordsByIdentity.has(identity)) {
        recordsByIdentity.set(identity, record);
      }
    });
  }

  return {
    ...firstResponse,
    data: Array.from(recordsByIdentity.values()),
  };
};

ApiAppointments.consultations = function (siteId, empNo, date, isCancel = false) {
  return ApiAppointments.clinicalEncounters(date, isCancel);
};

ApiAppointments.appointments = function (siteId, empNo, date) {
  return api.get(
    `/ictApiProxy/emr/op/appointments/list?siteId=${siteId}&empNo=${empNo}&date=${date}`,
    baseZydusProxyUrl
  );
};

ApiAppointments.syncZydusPatientAndAppointment = function (body) {
  return api.post(
    `/appointment/syncZydusPatientAndAppointment`,
    body,
    baseZydusUrl
  );
};

ApiAppointments.syncGenxPatientAndAppointment = async function (body) {
  const response = await api.post(
    `/genx2/sync-patient-and-appointment`,
    body,
    baseIpdUrl
  );
  return normalizeGenxSyncResponse(response);
};

ApiAppointments.zydusDocsList = function (mrno) {
  return api.get(
    `/ictApiProxy/emr/lab/result/list?mrno=${mrno}&noOfDays=6000`,
    baseZydusProxyUrl
  );
};

ApiAppointments.zydusRadioList = function (mrno) {
  return api.get(
    `/ictApiProxy/emr/serviceorder/radiology/orders?mrno=${mrno}&noOfDays=150`,
    baseZydusProxyUrl
  );
};

ApiAppointments.placeIctOrder = function (data) {
  return api.post(`/appointment/placeIctOrder`, data, baseZydusUrl);
};

ApiAppointments.listCategories = function () {
  return api.get(`/api/v1/patient/listCategories`, baseVisitUrl);
};

/**
 * Move an existing appointment to a new date/time in place.
 *
 * Until this landed, a "reschedule" was a booking of the new slot followed by
 * a cancel of the old one: two writes, a window where the patient held two
 * appointments, and a new pam_id that broke anything referencing the original.
 * This is one call against the same appointment, so the id, the patient and
 * the visit type all survive the move. Slot fields plus toct_id, category_id
 * and appointment_remark so those values are not dropped.
 *
 * PUT /api/v1/appointment/:pam_id on the visit-integration service.
 */
ApiAppointments.rescheduleAppointment = function (pamId, data) {
  return api.put(`/api/v1/appointment/${pamId}`, data, baseVisitUrl);
};

ApiAppointments.getSnapRxUnDigitisedIds = function () {
  return api.get(`/api/v1/digitization/undigitizedAppointments`, baseSnapRxUrl);
};

ApiAppointments.getAllUnDigitisedAppointmentsList = function () {
  return api.get(
    `/api/v1/digitization/undigitizedAppointments/list`,
    baseSnapRxUrl
  );
};

export default ApiAppointments;
