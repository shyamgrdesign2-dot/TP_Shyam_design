import { getDecodedToken } from "./localStorage";
import { isReceptionistSession } from "./receptionistSession";

/**
 * Attending doctor override for receptionist API calls (set by doctor dropdown).
 * Mirrors ApiCustomInvestigation.setCustomInvestigationAttendingDoctor.
 */
let attendingDoctorUmIdOverride;

export function setReceptionistAttendingDoctor(umId) {
  attendingDoctorUmIdOverride = umId == null || umId === "" ? undefined : umId;
}

function firstUmIdFromUrl() {
  try {
    const raw = new URLSearchParams(window.location.search).get("um_id");
    if (!raw) return undefined;
    const first = String(raw).split(",").map((s) => s.trim()).filter(Boolean)[0];
    if (!first) return undefined;
    return Number.isNaN(Number(first)) ? first : Number(first);
  } catch {
    return undefined;
  }
}

function toId(value) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

/**
 * Query params, headers, and body extras for Kea / receptionist JWT calls.
 *
 * Aligned with minimal UAT backend PRs:
 * - PatientMaster list remaps via body.doctor_id (isKeaToken)
 * - Visit create/reschedule schemas reject unknown body fields — use
 *   withReceptionistVisitMutationBody (no body extras) for those calls
 */
export function receptionistRequestExtras() {
  const isReceptionist = isReceptionistSession();
  if (!isReceptionist) {
    return { query: "", headers: {}, body: {} };
  }

  const umId = toId(attendingDoctorUmIdOverride ?? firstUmIdFromUrl());
  const tokenUserId = toId(
    getDecodedToken()?.result?.user_id ??
      new URLSearchParams(window.location.search).get("receptionistId") ??
      undefined
  );

  const params = new URLSearchParams();
  const headers = {};
  const body = {};

  if (umId != null && umId !== "") {
    params.set("um_id", String(umId));
    headers["x-um-id"] = String(umId);
    // PatientMaster minimal list/cancel path reads doctor_id (snake_case).
    body.doctor_id = umId;
    // Kept for other dual-auth endpoints / older readers.
    body.doctorId = umId;
  }
  if (tokenUserId != null && tokenUserId !== "") {
    params.set("receptionist_id", String(tokenUserId));
    headers["x-receptionist-id"] = String(tokenUserId);
    body.receptionist_id = tokenUserId;
  }

  const query = params.toString();
  return { query, headers, body };
}

export function withReceptionistQuery(path) {
  const { query } = receptionistRequestExtras();
  if (!query) return path;
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}

/** Merge Kea extras into PatientMaster (and similar) POST bodies. */
export function withReceptionistBody(payload = {}) {
  const { body } = receptionistRequestExtras();
  return { ...payload, ...body };
}

/**
 * Visit create/reschedule bodies must stay schema-clean (additionalProperties: false).
 * Attending doctor is payload.doctor_id; Kea context goes on query + headers only.
 */
export function withReceptionistVisitMutationBody(payload = {}) {
  return { ...payload };
}

export function withReceptionistConfig(baseUrl) {
  const { headers } = receptionistRequestExtras();
  return Object.keys(headers).length ? { ...baseUrl, headers } : baseUrl;
}
