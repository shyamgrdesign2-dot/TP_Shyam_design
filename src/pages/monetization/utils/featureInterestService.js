import api from "../../../api/services/axiosService";
import { env } from "../../../EnvironmentConfig";
import {
  getClinic,
  getClinicCity,
  getClinicName,
  getTokenData,
} from "../../../utils/utils";

/**
 * Host-only digitization base.
 * Prefer snap_rx_api_url — digitization_api_url can include /api/v1/digitization/snap-rx.
 * Backend mount (consolidated featureInterest.route.ts):
 *   GET/POST /api/v1/digitization/feature-interest/:feature
 */
const DIGITIZATION_HOST = (env.snap_rx_api_url || env.digitization_api_url || "")
  .replace(/\/api\/v1\/digitization(?:\/snap-rx)?\/?$/, "")
  .replace(/\/$/, "");

const baseUrl = { customBaseUrl: DIGITIZATION_HOST };

export const FEATURE_INTEREST_FEATURES = ["lims", "pharmacy"];
export const FEATURE_INTEREST_SOURCES = ["kea", "doctor_portal"];

const FEATURE_INTEREST_PATH = "/api/v1/digitization/feature-interest";
const FALLBACK = "-";

function ensureSuccessful(res) {
  // axiosService interceptor returns response.data:
  // { success: boolean, error: string|null, data: any }
  if (!res?.success) {
    const message = res?.error || "Request failed";
    const err = new Error(message);
    err.response = res;
    throw err;
  }
  return res.data;
}

function unwrapAxiosError(error) {
  const apiError =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "Request failed";
  const err = new Error(apiError);
  err.cause = error;
  throw err;
}

/**
 * Build POST body matching backend SubmitInput in featureInterest.route.ts.
 * Missing clinic/address fields fall back to "-" (approved product behavior).
 */
export function buildFeatureInterestPayload({
  feature,
  profile,
  isReceptionist = false,
  search = typeof window !== "undefined" ? window.location.search : "",
}) {
  const tokenData = getTokenData();
  const clinic = getClinic(profile?.hospital_data);
  const urlParams = new URLSearchParams(search);

  const tokenUserId = tokenData?.user_id;
  // Backend doctorId expects um_id / user_id (not doctor_unique_id).
  // Receptionist JWT user_id is the receptionist — use URL um_id / profile um_id for doctorId.
  // Doctor JWT user_id is the doctorId.
  const urlDoctorUmId = urlParams.get("um_id")?.split(",")?.[0]?.trim();
  const doctorId = isReceptionist
    ? urlDoctorUmId || profile?.um_id || urlParams.get("doctorId") || FALLBACK
    : tokenUserId ||
      profile?.um_id ||
      urlDoctorUmId ||
      urlParams.get("doctorId") ||
      FALLBACK;

  const hmAddress =
    clinic?.hm_address || (clinic?.hm_address1 ? clinic.hm_address1 : "");

  // Receptionist/Kea sessions pass clinic + receptionist details in the URL, e.g.
  // ?receptionist=dashboard&receptionistId=1008&receptionistName=...&clinicName=...&city=...&address=...
  const urlClinicName = urlParams.get("clinicName");
  const urlCity = urlParams.get("city") || urlParams.get("centerCity");
  const urlAddress = urlParams.get("address");

  const clinicId =
    urlParams.get("clinicId") ||
    tokenData?.clinic_id ||
    clinic?.hm_id ||
    FALLBACK;

  const hmBusinessId =
    urlParams.get("hospitalBusinessId") ||
    urlParams.get("hm_business_id") ||
    tokenData?.hospital_business_id ||
    clinic?.hm_business_id ||
    FALLBACK;

  const payload = {
    doctorName: profile?.um_name || FALLBACK,
    // Receptionist token mobile is the receptionist number — never use it as doctorNumber.
    doctorNumber: profile?.um_contact
      ? String(profile.um_contact)
      : !isReceptionist && tokenData?.mobile_no
        ? String(tokenData.mobile_no)
        : FALLBACK,
    city: (isReceptionist ? urlCity : null) || getClinicCity(profile?.hospital_data) || FALLBACK,
    state: clinic?.hm_state || FALLBACK,
    address:
      (isReceptionist ? urlAddress : null) || hmAddress || FALLBACK,
    clinicName:
      (isReceptionist ? urlClinicName : null) ||
      getClinicName(profile?.hospital_data) ||
      FALLBACK,
    clinicId: String(clinicId).trim() || FALLBACK,
    hmBusinessId: String(hmBusinessId).trim() || FALLBACK,
    doctorId: String(doctorId).trim() || FALLBACK,
    source: isReceptionist ? "kea" : "doctor_portal",
  };

  let receptionistId = null;
  if (isReceptionist) {
    // Receptionist token user_id is receptionistId (URL receptionistId as fallback).
    receptionistId =
      tokenUserId || urlParams.get("receptionistId") || FALLBACK;
    const receptionistName = urlParams.get("receptionistName");
    payload.receptionistId = String(receptionistId).trim() || FALLBACK;
    receptionistId = payload.receptionistId;
    if (receptionistName) payload.receptionistName = receptionistName;
    if (tokenData?.mobile_no) {
      payload.receptionistNumber = String(tokenData.mobile_no);
    }
  }

  // feature is path param only; keep for callers that need it
  return {
    feature,
    payload,
    doctorId: payload.doctorId,
    receptionistId,
  };
}

/**
 * Status lookup: receptionist sessions use receptionistId; doctor sessions use doctorId.
 */
export const getFeatureInterestStatus = async ({
  feature,
  doctorId,
  receptionistId,
}) => {
  try {
    const query = receptionistId
      ? `receptionistId=${encodeURIComponent(receptionistId)}`
      : `doctorId=${encodeURIComponent(doctorId)}`;
    const response = await api.get(
      `${FEATURE_INTEREST_PATH}/${encodeURIComponent(feature)}?${query}`,
      baseUrl,
    );
    return ensureSuccessful(response);
  } catch (error) {
    if (error?.response?.data && typeof error.response.data === "object") {
      // Soft API envelope sometimes returned via rejected axios config
      try {
        return ensureSuccessful(error.response.data);
      } catch {
        // fall through
      }
    }
    return unwrapAxiosError(error);
  }
};

export const submitFeatureInterest = async ({ feature, payload }) => {
  try {
    const response = await api.post(
      `${FEATURE_INTEREST_PATH}/${encodeURIComponent(feature)}`,
      payload,
      baseUrl,
    );
    return ensureSuccessful(response);
  } catch (error) {
    if (error?.response?.data && typeof error.response.data === "object") {
      try {
        return ensureSuccessful(error.response.data);
      } catch {
        // fall through
      }
    }
    return unwrapAxiosError(error);
  }
};
