import config from "../../config";
import { joinUrl, withClinicTokenRetry } from "../chikitsalay/service";
import { getLoggedInDoctorId } from "../appointment-listing/data/useDoctorSlots";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const call = async (path, { method = "GET", body } = {}) =>
  withClinicTokenRetry(async (token) => {
    const url = joinUrl(config.chikitsalay_api_url, path);
    const response = await fetch(url, {
      method,
      headers: authHeaders(token),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => null);
    return {
      status: response.status,
      statusCode: data?.statusCode,
      error: data?.error,
      message: data?.message,
      data,
    };
  });

const ok = (status) => status >= 200 && status < 300;

// Keyed by doctorId — a shared-device logout/login between two doctors must
// not serve doctor A's queue/counter to doctor B.
let cachedQueueAndCounter = null;
let cachedForDoctorId = null;

// A doctor has exactly one pre-provisioned Queue+Counter; neither endpoint
// takes a filter param, so this lists everything and filters client-side.
export const resolveMyQueueAndCounter = async function () {
  const doctorId = getLoggedInDoctorId();
  if (cachedQueueAndCounter && cachedForDoctorId === doctorId) return cachedQueueAndCounter;

  const queuesRes = await call("/api/v1/queues");
  const queue = (Array.isArray(queuesRes.data) ? queuesRes.data : []).find(
    (q) => q.queueType === "DOCTOR" && String(q.doctorId) === String(doctorId)
  );
  if (!queue) return null;

  const countersRes = await call("/api/v1/counters");
  const counter = (Array.isArray(countersRes.data) ? countersRes.data : []).find(
    (c) => c.queueId === queue.id
  );
  if (!counter) return null;

  cachedQueueAndCounter = { queue, counter };
  cachedForDoctorId = doctorId;
  return cachedQueueAndCounter;
};

// Returns every schedule on the counter for the given type — a counter can
// have several non-overlapping windows (e.g. Mon-Fri mornings + Sat
// afternoon)
export const listMySchedules = async function (counterId, scheduleType = "IN_CLINIC") {
  const res = await call(`/api/v1/counter-schedules?counterId=${encodeURIComponent(counterId)}`);
  const list = Array.isArray(res.data) ? res.data : [];
  return list
    .filter((s) => (s.scheduleType || "IN_CLINIC") === scheduleType)
    .sort((a, b) => (a.startTime > b.startTime ? 1 : -1));
};

// In-clinic and video-consult windows on one counter may overlap in
// wall-clock time — each type's overlap is checked independently.
export const saveMySchedule = async function (
  counterId,
  { startTime, endTime, daysOfWeek },
  existingId,
  scheduleType = "IN_CLINIC"
) {
  const res = existingId
    ? await call(`/api/v1/counter-schedules/${encodeURIComponent(existingId)}`, {
        method: "PUT",
        body: { startTime, endTime, daysOfWeek },
      })
    : await call("/api/v1/counter-schedules", {
        // timeDurationInMinutes is server-derived from the queue's
        // estimatedDurationMin — not client-settable, so it's omitted here.
        method: "POST",
        body: { counterId, scheduleType, startTime, endTime, daysOfWeek },
      });
  // Create returns the full row (id + server-derived timeDurationInMinutes)
  // — read it here, not a follow-up GET, so a stale refetch can't turn a
  // later save into a duplicate POST.
  return {
    success: ok(res.status),
    message: res.data?.message,
    id: existingId || res.data?.id,
    timeDurationInMinutes: res.data?.timeDurationInMinutes,
  };
};

export const listMyLeaves = async function (counterId) {
  const res = await call(`/api/v1/leaves?counterId=${encodeURIComponent(counterId)}`);
  return Array.isArray(res.data) ? res.data : [];
};

export const getAffectedBookingsCount = async function (counterId, { startDate, endDate, startTime, endTime }) {
  const params = new URLSearchParams({ counterId, startDate, endDate });
  if (startTime) params.set("startTime", startTime);
  if (endTime) params.set("endTime", endTime);
  const res = await call(`/api/v1/leaves/affected-bookings-count?${params.toString()}`);
  return res.data?.count || 0;
};

export const createLeave = async function (counterId, payload) {
  const res = await call("/api/v1/leaves", { method: "POST", body: { counterId, ...payload } });
  return { success: ok(res.status), message: res.data?.message };
};

export const updateLeave = async function (id, payload) {
  const res = await call(`/api/v1/leaves/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
  return { success: ok(res.status), message: res.data?.message };
};

export const deleteLeave = async function (id) {
  const res = await call(`/api/v1/leaves/${encodeURIComponent(id)}`, { method: "DELETE" });
  return { success: ok(res.status), message: res.data?.message };
};

// Pm-visit-integration, not Pm-queue-management — reads PHP's schedule
// directly. Filters to the requested scheduleType; the raw response can carry both.
export const importAvailabilityFromPhp = async function (scheduleType = "IN_CLINIC") {
  const doctorId = getLoggedInDoctorId();
  const res = await withClinicTokenRetry(async (token) => {
    const url = joinUrl(
      config.visit_api_url,
      `/api/v1/visit-clinic/availability-template?doctorId=${encodeURIComponent(doctorId)}`
    );
    const response = await fetch(url, { headers: authHeaders(token) });
    const data = await response.json().catch(() => null);
    return {
      status: response.status,
      statusCode: data?.statusCode,
      error: data?.error,
      message: data?.message,
      data,
    };
  });
  if (!ok(res.status)) {
    return { success: false, message: res.message || "Could not fetch PHP availability." };
  }
  const filtered = (res.data?.schedules || []).filter((s) => s.scheduleType === scheduleType);
  return { success: true, schedules: filtered };
};
