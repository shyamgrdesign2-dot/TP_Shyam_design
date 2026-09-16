import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.ipd_api_url || config.ipd_portal_url };

const ApiIpdService = {};

/**
 * Check if a patient is already admitted to IPD
 * @param {Object} data - Object containing patientId
 * @returns {Promise} API response
 */
ApiIpdService.checkPatientAdmitted = function ({ patientId }) {
  return api.get(
    `/patients/check-patient-admitted?patientId=${patientId}`,
    baseUrl
  );
};

/** Zydus: create admission-to-IPD request with category + reason (AdmitToIpdModal). */
ApiIpdService.createZydusAdmissionToIpd = function (data) {
  return api.post(`/genx2/admission-to-ipd`, data, {
    customBaseUrl: config.ipd_api_url,
  });
};

export default ApiIpdService;

