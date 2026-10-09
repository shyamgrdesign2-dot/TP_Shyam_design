import config from "../../config";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";

const VISIT_CLINIC_TOKEN_KEY = "visitClinicToken";

const readClinicTokenFromStorage = () =>
  localStorage.getItem(VISIT_CLINIC_TOKEN_KEY);

const persistClinicTokenToStorage = (token) => {
  if (!token) return;
  localStorage.setItem(VISIT_CLINIC_TOKEN_KEY, token);
};

const readMainAuthTokenFromStorage = () => {
  try {
    const raw = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const joinUrl = (base, path) => {
  const baseTrimmed = String(base || "").replace(/\/+$/, "");
  const pathTrimmed = String(path || "").replace(/^\/+/, "");
  return `${baseTrimmed}/${pathTrimmed}`;
};

const isInvalidAuthToken401 = (resp) =>
  resp?.status === 401 &&
  resp?.statusCode === 401 &&
  resp?.error === "Unauthorized" &&
  resp?.message === "Invalid auth token";

// Cache-then-mint, exposed for the live-update socket (needs the token for
// its own auth handshake, not a REST call).
export const getOrMintClinicToken = async () => {
  const cached = readClinicTokenFromStorage();
  if (cached) return cached;
  return generateClinicToken();
};

// On an expired/invalid token, mints a fresh one and retries once. Shared by
// every queue-management call in this file.
export const withClinicTokenRetry = async (makeRequest) => {
  const token = readClinicTokenFromStorage();
  const resp = await makeRequest(token);

  if (!isInvalidAuthToken401(resp)) return resp;

  const refreshed = await generateClinicToken();
  persistClinicTokenToStorage(refreshed);
  return makeRequest(refreshed);
};

export const clinicTargetStatus = async function (appointmentId, payload) {
  const callAdvance = async (token) => {
    const url = joinUrl(
      config.chikitsalay_api_url,
      `/api/v1/bookings/${appointmentId}/advance`
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: true,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload ?? {}),
    });

    const responseData = await response.json();
    return { ...(responseData || {}), status: response.status };
  };

  return withClinicTokenRetry(callAdvance);
};

export const generateClinicToken = async function () {
  let res = null;
  try {
    const mainJwt = readMainAuthTokenFromStorage();
    const tokenUrl = joinUrl(
      config.visit_api_url,
      `/api/v1/kea/auth/generate-visit-clinic-token-from-jwt`
    );

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(mainJwt ? { Authorization: `Bearer ${mainJwt}` } : {}),
      },
      body: JSON.stringify({ expiry_in_seconds: 864000 }),
    });

    const responseData = await response.json();
    res = responseData?.token || null;
  } catch (e) {
    console.error("Error while generating clinic token: ", e);
  }
  persistClinicTokenToStorage(res);
  return res;
};

// `appointmentType`: 0 = IN_CLINIC, 2 = VIDEO_CONSULT (same convention as
// hospital-dashboard's getDoctorSlots). Omit to get the backend's default type.
export const getQueueDoctorSlots = async function (doctorId, date, appointmentType) {
  const callSlots = async (token) => {
    const typeParam = appointmentType != null ? `&appointment_type=${encodeURIComponent(appointmentType)}` : "";
    const url = joinUrl(
      config.chikitsalay_api_url,
      `/api/v1/bookings/doctor-slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}${typeParam}`
    );
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const responseData = await response.json().catch(() => ({}));
    return Array.isArray(responseData)
      ? { status: response.status, slots: responseData }
      : { ...(responseData || {}), status: response.status };
  };

  return withClinicTokenRetry(callSlots);
};

export const bookQueueAppointment = async function (payload) {
  const callBook = async (token) => {
    const url = joinUrl(
      config.chikitsalay_api_url,
      `/api/v1/bookings/book-doctor-appointment`
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        source: "CHIKITSALAY-PORTAL",
        type: "PRE_BOOKED",
        appointment_source: "CHIKITSALY-PORTAL",
        ...payload,
      }),
    });
    const responseData = await response.json().catch(() => ({}));
    return { ...(responseData || {}), status: response.status };
  };

  return withClinicTokenRetry(callBook);
};

export const cancelQueueAppointment = async function (appointmentId) {
  const callCancel = async (token) => {
    const url = joinUrl(
      config.chikitsalay_api_url,
      `/api/v1/bookings/cancel-doctor-appointment`
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ appointmentId }),
    });
    const responseData = await response.json().catch(() => ({}));
    return { ...(responseData || {}), status: response.status };
  };

  return withClinicTokenRetry(callCancel);
};

export const rescheduleQueueAppointment = async function (payload) {
  const callReschedule = async (token) => {
    const url = joinUrl(
      config.chikitsalay_api_url,
      `/api/v1/bookings/update-doctor-appointment`
    );
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const responseData = await response.json().catch(() => ({}));
    return { ...(responseData || {}), status: response.status };
  };

  return withClinicTokenRetry(callReschedule);
};

// Marks a patient as arrived (moves the Queue Management booking to
// WAITING and assigns a token number).
export const checkinQueuePatient = async function (patientId) {
  const callCheckin = async (token) => {
    const url = joinUrl(config.chikitsalay_api_url, `/api/v1/bookings/checkin`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ patientId }),
    });
    const responseData = await response.json().catch(() => ({}));
    return { ...(responseData || {}), status: response.status };
  };

  return withClinicTokenRetry(callCheckin);
};
