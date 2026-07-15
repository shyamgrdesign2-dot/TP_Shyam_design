// LIMS data layer.
//
// This module deliberately reuses the EXISTING backend contracts so anything
// saved here shows up unchanged in the EMR (patient detail → Lab Results):
//   • patient list   → GET  {visit_api_url}/api/v1/patient/listDashboard/lims
//   • lab catalog     → GET  {lab_params_api_url}/api/v1/lab-parameters?search=
//   • saved results   → GET  {lab_params_api_url}/api/v1/lab-parameters/results/{patientId}
//   • save results    → POST {lab_params_api_url}/api/v1/lab-parameters/results
//
// The save payload shape mirrors LabParams.js exactly:
//   { patientId, doctorId, results: [{ date, inputs: [{ reportName, testName, value, units, arrowDirection, refRange }] }] }
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import api from "../../api/services/axiosService";
import ApiCaseManager from "../../api/services/ApiCaseManager";
import config from "../../config";
import { env } from "../../EnvironmentConfig";
import { LAB_PARAMS_RESULTS, PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";
import {
  normalizeLabResultsResponse,
  buildLabResultsSavePayload,
  getAttendingDoctorUmIdFromUrl,
  isLabResultsReceptionistSession,
} from "../../utils/labResultsUtils";

const visitBaseUrl = { customBaseUrl: config.visit_api_url };
const labBaseUrl = { customBaseUrl: env.lab_params_api_url };
const labRoot = env.lab_params_api_url;

function getToken() {
  const raw = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  return raw ? raw.trim().replace(/^["']+|["']+$/g, "") : "";
}

export function getDoctorId() {
  try {
    const decoded = jwtDecode(getToken());
    return decoded?.result?.user_id ?? decoded?.user_id;
  } catch (e) {
    return undefined;
  }
}

// Paginated patient list for LIMS. Unlike the plain listDashboard used by the
// All Patients screen, the `/lims` variant returns each patient's last-visit
// `investigations` and saved `labResults` inline, so the listing no longer needs
// per-row follow-up calls to hydrate tests and lab-result status.
export async function fetchLimsPatients({
  search = "",
  page = 1,
  limit = 25,
  startDate,
  endDate,
} = {}) {
  const queryParams = { search, page, limit };
  if (startDate) queryParams.startDate = startDate;
  if (endDate) queryParams.endDate = endDate;
  const queryString = new URLSearchParams(queryParams).toString();
  try {
    return await api.get(`/api/v1/patient/listDashboard/lims?${queryString}`, visitBaseUrl);
  } catch (e) {
    console.error("LIMS: failed to fetch patients", e);
    return {};
  }
}

// All saved lab result dates for a patient (flattened across doctors under hm_id).
export async function fetchPatientLabResults(patientId) {
  if (!patientId) return [];
  try {
    const res = await axios.get(`${labRoot}/api/v1/lab-parameters/results/${patientId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return normalizeLabResultsResponse(res);
  } catch (e) {
    console.error("LIMS: failed to fetch lab results", e);
    return [];
  }
}

// Free-text search across the lab parameter catalog.
export async function searchLabCatalog(query) {
  if (!query) return [];
  try {
    const res = await axios.get(
      `${labRoot}/api/v1/lab-parameters?search=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    return res?.data || [];
  } catch (e) {
    console.error("LIMS: failed to search lab catalog", e);
    return [];
  }
}

// Persist results against a patient. Same endpoint + payload as the EMR drawer.
// Receptionist LIMS: doctorId = lastVisitDoctor.um_id, receptionist_id = token user_id.
export async function saveLabResults({ patientId, results, um_id }) {
  const payload = buildLabResultsSavePayload({
    patientId,
    results,
    tokenUserId: getDoctorId(),
    attendingDoctorUmId: um_id ?? getAttendingDoctorUmIdFromUrl(),
    isReceptionist: isLabResultsReceptionistSession(),
  });
  return api.post(LAB_PARAMS_RESULTS, payload, labBaseUrl);
}

// Fetch investigations suggested in the patient's most recent consultation.
// Returns { investigations: [{ name, serviceCode }], tcmId } or null.
export async function fetchLastVisitTests(patientUniqueId) {
  if (!patientUniqueId) return null;
  try {
    const recent = await ApiCaseManager.getRecentConsultations(patientUniqueId);
    const tcmIds = recent?.data?.tcm_ids ?? recent?.tcm_ids ?? [];
    if (!Array.isArray(tcmIds) || tcmIds.length === 0) return null;
    const latestTcmId = tcmIds[0];
    const res = await ApiCaseManager.getInvestigationAndMedicine({
      patient_unique_id: patientUniqueId,
      tcm_id: latestTcmId,
    });
    const investigations = (res?.data?.investigation ?? res?.investigation ?? []).map((i) => ({
      name: (i.investigation_name || "").trim(),
      serviceCode: i.service_code || "",
    })).filter((i) => i.name);
    return { investigations, tcmId: latestTcmId };
  } catch (e) {
    console.error("LIMS: failed to fetch last-visit tests", e);
    return null;
  }
}
