import api from "./axiosService";
import config from "../../config";
import {
  receptionistRequestExtras,
  withReceptionistBody,
  withReceptionistConfig,
  withReceptionistQuery,
  withReceptionistVisitMutationBody,
} from "../../utils/receptionistRequestExtras";

const appointmentBase = { customBaseUrl: config.appointment_api_url };
const visitBase = { customBaseUrl: config.visit_api_url };

function visitConfig() {
  return withReceptionistConfig(visitBase);
}

function appointmentConfig() {
  return withReceptionistConfig(appointmentBase);
}

/** POST /api/v1/appointment/listAppointment */
export async function listAppointments(data) {
  return api.post(
    withReceptionistQuery("/api/v1/appointment/listAppointment"),
    withReceptionistBody(data),
    appointmentConfig()
  );
}

/**
 * GET /api/v1/appointment/listAppointmentCalendar
 * Month grid for Kea receptionist: one call for the window, `size` chips/day.
 * Selected doctor is required as query `doctor_id` (same as BE Kea contract).
 * Also sends um_id / receptionist_id via withReceptionistQuery.
 */
export async function listAppointmentCalendar({
  startDate,
  endDate,
  size = 3,
  appointmentStatus,
  doctorId,
} = {}) {
  if (doctorId == null || doctorId === "") {
    return { status: false, message: "doctor_id is required for receptionist calendar." };
  }
  const params = new URLSearchParams({
    startDate,
    endDate,
    size: String(size),
    doctor_id: String(doctorId),
  });
  if (appointmentStatus != null && appointmentStatus !== "") {
    params.set("appointmentStatus", String(appointmentStatus));
  }
  return api.get(
    withReceptionistQuery(`/api/v1/appointment/listAppointmentCalendar?${params}`),
    appointmentConfig()
  );
}

/** GET /api/v1/appointment/listSlots */
export async function listSlots(doctorId, date) {
  const path = withReceptionistQuery(
    `/api/v1/appointment/listSlots?doctorId=${doctorId}&date=${date}`
  );
  try {
    const response = await api.get(path, visitConfig());
    if (response?.status === undefined) {
      return { status: true, ...response };
    }
    return { status: false, message: response?.data?.message };
  } catch (error) {
    return { status: false, message: error?.response?.data?.message };
  }
}

/** GET tele slots (pam_status_type_appointment=2) */
export async function listTeleSlots(doctorId, date) {
  const path = withReceptionistQuery(
    `/api/v1/appointment/listSlots?doctorId=${doctorId}&date=${date}&pam_status_type_appointment=2`
  );
  try {
    const response = await api.get(path, visitConfig());
    const slots = response?.data?.slots ?? response?.slots;
    if (slots !== undefined) {
      return { status: true, slots };
    }
    return {
      status: false,
      message: response?.data?.message || response?.message || "Failed to fetch slots",
    };
  } catch (error) {
    return { status: false, message: error?.response?.data?.message || "Error fetching slots" };
  }
}

/** POST /api/v1/appointment — in-clinic book */
export async function bookAppointment(data) {
  try {
    // Minimal visit PR: body must not include receptionist_id / doctorId extras.
    const response = await api.post(
      withReceptionistQuery("/api/v1/appointment"),
      withReceptionistVisitMutationBody(data),
      visitConfig()
    );
    if (response?.status === undefined) {
      return { status: true, ...response };
    }
    return { status: false, message: response?.data?.message };
  } catch (error) {
    return { status: false, message: error?.response?.data?.message };
  }
}

/** POST /api/v1/appointment — tele book (appointment_type 2) */
export async function bookTeleAppointment(data) {
  try {
    const body = withReceptionistVisitMutationBody({ ...data, appointment_type: 2 });
    const response = await api.post(
      withReceptionistQuery("/api/v1/appointment"),
      body,
      visitConfig()
    );
    const responseData = response?.data ?? response;
    const appointmentId = responseData?.appointment_id ?? responseData?.appointmentId;
    if (appointmentId !== undefined && appointmentId !== null) {
      return {
        status: true,
        appointment_id: responseData.appointment_id ?? appointmentId,
        consultationId: responseData.consultationId,
        patientMeetingLink: responseData.patientMeetingLink,
      };
    }
    return { status: false, message: responseData?.message || "Failed to book" };
  } catch (error) {
    return { status: false, message: error?.response?.data?.message || "Error booking appointment" };
  }
}

/** PUT /api/v1/appointment/:pam_id */
export async function rescheduleAppointment(pamId, data) {
  return api.put(
    withReceptionistQuery(`/api/v1/appointment/${pamId}`),
    withReceptionistVisitMutationBody(data),
    visitConfig()
  );
}

/** POST /api/v1/appointment/cancelAppointment */
export async function cancelAppointment(data) {
  return api.post(
    withReceptionistQuery("/api/v1/appointment/cancelAppointment"),
    withReceptionistBody(data),
    appointmentConfig()
  );
}

/** POST /api/v1/appointment/searchPatient */
export async function searchPatients(query) {
  return api.post(
    withReceptionistQuery("/api/v1/appointment/searchPatient"),
    withReceptionistBody({ search: query }),
    appointmentConfig()
  );
}

/** POST /api/v1/appointment/listCasetype */
export async function getCaseTypes() {
  return api.post(
    withReceptionistQuery("/api/v1/appointment/listCasetype"),
    withReceptionistBody({}),
    appointmentConfig()
  );
}

/** GET /api/v1/patient/listCategories */
export async function listCategories() {
  return api.get(
    withReceptionistQuery("/api/v1/patient/listCategories"),
    visitConfig()
  );
}

/** POST /api/v1/appointment/addPatient */
export async function addPatient(formData) {
  return api.post(
    withReceptionistQuery("/api/v1/appointment/addPatient"),
    formData,
    appointmentConfig()
  );
}

/** Returns receptionist name/id from URL for audit fields on billing-style payloads. */
export function getReceptionistAuditFields() {
  try {
    const params = new URLSearchParams(window.location.search);
    const { body } = receptionistRequestExtras();
    return {
      receptionistId: params.get("receptionistId") || body.receptionist_id,
      receptionistName: params.get("receptionistName") || undefined,
    };
  } catch {
    return {};
  }
}
