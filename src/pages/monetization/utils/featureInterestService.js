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
const OWNER_DOCTOR_PATH = "/api/v1/digitization/owner-doctor";
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
 * Owner-doctor may return either:
 * - digitization envelope: { success, data: { um_name, um_contact1, ... } }
 * - flat body: { um_name, um_contact1, hm_id, ... } (as from curl)
 */
function normalizeOwnerDoctorResponse(res) {
  if (!res || typeof res !== "object") return null;

  if (res.success === true) {
    return res.data && typeof res.data === "object" ? res.data : null;
  }

  if (res.success === false) {
    const err = new Error(res.error || "Request failed");
    err.response = res;
    throw err;
  }

  // Flat owner payload (no success envelope)
  if (
    res.um_id != null ||
    res.um_name != null ||
    res.um_contact1 != null ||
    res.owner_doctor != null
  ) {
    return res;
  }

  return null;
}

/**
 * GET clinic owner doctor for the authenticated session.
 * Response fields used on interest submit: um_name → ownerDocName, um_contact1 → ownerDocMobile.
 */
export const getOwnerDoctor = async () => {
  try {
    const response = await api.get(OWNER_DOCTOR_PATH, baseUrl);
    const owner = normalizeOwnerDoctorResponse(response);
    if (!owner) {
      throw new Error("Owner doctor response missing");
    }
    return owner;
  } catch (error) {
    if (error?.response?.data && typeof error.response.data === "object") {
      try {
        const owner = normalizeOwnerDoctorResponse(error.response.data);
        if (owner) return owner;
      } catch {
        // fall through
      }
    }
    // Some paths throw our normalized Error with .response already set
    if (error?.response && !error?.response?.data) {
      try {
        const owner = normalizeOwnerDoctorResponse(error.response);
        if (owner) return owner;
      } catch {
        // fall through
      }
    }
    return unwrapAxiosError(error);
  }
};

function withOwnerDoctorFields(payload, owner) {
  return {
    ...payload,
    ownerDocName: owner?.um_name?.trim() || FALLBACK,
    ownerDocMobile: owner?.um_contact1
      ? String(owner.um_contact1).trim()
      : FALLBACK,
  };
}

/**
 * Build POST body matching backend SubmitInput in featureInterest.route.ts.
 * Missing clinic/address fields fall back to "-" (approved product behavior).
 * ownerDocName / ownerDocMobile are filled at submit time via getOwnerDoctor.
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
    ownerDocName: FALLBACK,
    ownerDocMobile: FALLBACK,
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
 * Status lookup by feature (auth/session identifies the actor; no doctorId/receptionistId query).
 */
export const getFeatureInterestStatus = async ({ feature }) => {
  try {
    const response = await api.get(
      `${FEATURE_INTEREST_PATH}/${encodeURIComponent(feature)}`,
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

/**
 * On interest click: fetch owner doctor → merge ownerDocName/ownerDocMobile → POST interest.
 */
export const submitFeatureInterest = async ({ feature, payload }) => {
  let owner = null;
  try {
    owner = await getOwnerDoctor();
  } catch (error) {
    console.error("Owner doctor fetch failed", error);
  }

  const payloadWithOwner = withOwnerDoctorFields(payload, owner);

  try {
    const response = await api.post(
      `${FEATURE_INTEREST_PATH}/${encodeURIComponent(feature)}`,
      payloadWithOwner,
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
