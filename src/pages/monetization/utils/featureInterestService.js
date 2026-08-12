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

  const doctorId =
    tokenData?.doctor_unique_id ||
    profile?.doctor_unique_id ||
    tokenData?.doctorId ||
    urlParams.get("doctorId") ||
    FALLBACK;

  const hmAddress =
    clinic?.hm_address || (clinic?.hm_address1 ? clinic.hm_address1 : "");

  const payload = {
    doctorName: profile?.um_name || FALLBACK,
    doctorNumber: profile?.um_contact
      ? String(profile.um_contact)
      : tokenData?.mobile_no
        ? String(tokenData.mobile_no)
        : FALLBACK,
    city: getClinicCity(profile?.hospital_data) || FALLBACK,
    state: clinic?.hm_state || FALLBACK,
    address: hmAddress || FALLBACK,
    clinicName: getClinicName(profile?.hospital_data) || FALLBACK,
    doctorId: String(doctorId).trim() || FALLBACK,
    source: isReceptionist ? "kea" : "doctor_portal",
  };

  if (isReceptionist) {
    const receptionistName = urlParams.get("receptionistName");
    if (receptionistName) payload.receptionistName = receptionistName;
    if (tokenData?.mobile_no) {
      payload.receptionistNumber = String(tokenData.mobile_no);
    }
  }

  // feature is path param only; keep for callers that need it
  return { feature, payload, doctorId: payload.doctorId };
}

export const getFeatureInterestStatus = async ({ feature, doctorId }) => {
  try {
    const response = await api.get(
      `${FEATURE_INTEREST_PATH}/${encodeURIComponent(feature)}?doctorId=${encodeURIComponent(
        doctorId,
      )}`,
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
