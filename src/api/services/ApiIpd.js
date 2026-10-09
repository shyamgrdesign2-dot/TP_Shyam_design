import api from "./axiosService";
import config from "../../config";

const getIpdApiBaseUrl = () => {
  if (process.env.NODE_ENV === "development") {
    return { customBaseUrl: "/ipd-api" };
  }
  return { customBaseUrl: config.ipd_api_url || config.ipd_portal_url };
};

const ApiIpdService = {};

/**
 * Check if a patient is already admitted to IPD
 * @param {Object} data - Object containing patientId
 * @returns {Promise} API response
 */
ApiIpdService.checkPatientAdmitted = function ({ patientId }) {
  return api.get(
    `/patients/check-patient-admitted?patientId=${patientId}`,
    getIpdApiBaseUrl()
  );
};

ApiIpdService.createZydusAdmissionToIpd = function (data) {
  return api.post(`/genx2/admission-to-ipd`, data, {
    customBaseUrl: config.ipd_api_url,
  });
};

ApiIpdService.getPatients = function (params = {}) {
  const {
    page = 1,
    limit = 25,
    search = "",
    ward = "",
    patientId = "",
    startDate = "",
    endDate = "",
    doctorIdsFilter = "",
    sort = "admittedOn:desc",
    isDischarged = false,
    sentForApproval = false,
    isIntimateDischarged = false,
  } = params;

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
    ward,
    patientId,
    startDate,
    endDate,
    doctorIdsFilter,
    sort,
    isDischarged: String(isDischarged),
    sentForApproval: String(sentForApproval),
    isIntimateDischarged: String(isIntimateDischarged),
  });

  return api.get(`/patients?${query.toString()}`, getIpdApiBaseUrl());
};

export default ApiIpdService;
