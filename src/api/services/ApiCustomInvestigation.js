import api from "./axiosService";
import { env } from "../../EnvironmentConfig";
import { getDecodedToken } from "../../utils/localStorage";
import {
  getAttendingDoctorUmIdFromUrl,
  isLabResultsReceptionistSession,
} from "../../utils/labResultsUtils";

// Hospital-scoped custom investigation groups/investigations.
// Backend contract: docs/2026-08-19-custom-investigation-BACKEND-API-CONTRACT.md
// (Pm-Patient-Docs, live on UAT as of 2026-08-19). hm_id/um_id are always derived
// server-side from the auth token for doctor JWTs. Receptionist/Kea JWTs are
// rejected unless the attending doctor's um_id is sent the same way lab-results
// save does (query + body extras).

const baseUrl = { customBaseUrl: env.lab_params_api_url };

export const CUSTOM_INVESTIGATIONS_CHANGED_EVENT = "tp-custom-investigations-changed";

let attendingDoctorUmIdOverride;

/** LIMS Add Lab Results can pin the last-visit doctor for receptionist API calls. */
export function setCustomInvestigationAttendingDoctor(umId) {
  attendingDoctorUmIdOverride = umId == null || umId === "" ? undefined : umId;
}

export function notifyCustomInvestigationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CUSTOM_INVESTIGATIONS_CHANGED_EVENT));
}

const withId = (doc) => (doc ? { ...doc, id: doc._id } : doc);
const normalizeGroup = (g) => ({ ...withId(g), investigations: (g?.investigations || []).map(withId) });

function receptionistRequestExtras() {
  let isReceptionist = false;
  let umId;
  let tokenUserId;
  try {
    const params = new URLSearchParams(window.location.search);
    isReceptionist = params.has("receptionist") || params.has("receptionistId");
    umId = attendingDoctorUmIdOverride ?? getAttendingDoctorUmIdFromUrl();
    if (umId == null || umId === "") {
      const raw = params.get("um_id");
      if (raw) {
        const first = String(raw).split(",").map((s) => s.trim()).filter(Boolean)[0];
        if (first) umId = Number.isNaN(Number(first)) ? first : Number(first);
      }
    }
    tokenUserId =
      getDecodedToken()?.result?.user_id ??
      params.get("receptionistId") ??
      undefined;
  } catch {
    isReceptionist = isLabResultsReceptionistSession();
    umId = attendingDoctorUmIdOverride ?? getAttendingDoctorUmIdFromUrl();
    tokenUserId = getDecodedToken()?.result?.user_id;
  }
  if (!isReceptionist) {
    return { query: "", headers: {}, body: {} };
  }
  const params = new URLSearchParams();
  const headers = {};
  const body = {};
  if (umId != null && umId !== "") {
    params.set("um_id", String(umId));
    headers["x-um-id"] = String(umId);
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

function withReceptionistConfig() {
  const { headers } = receptionistRequestExtras();
  return Object.keys(headers).length ? { ...baseUrl, headers } : baseUrl;
}

function withQuery(path) {
  const { query } = receptionistRequestExtras();
  if (!query) return path;
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}

function withReceptionistBody(payload = {}) {
  const { body } = receptionistRequestExtras();
  return { ...payload, ...body };
}

/** GET /custom-report-groups — every group for the caller's hospital, each with
 * its investigations nested inside. No query params, no separate investigations
 * list endpoint. */
export const getCustomInvestigations = async () => {
  const groups = await api.get(withQuery(`/api/v1/custom-report-groups`), withReceptionistConfig());
  return (Array.isArray(groups) ? groups : []).map(normalizeGroup);
};

/** POST /custom-report-groups — creates a group AND its first investigation(s) in
 * one call; there is no create-empty-group endpoint. `investigations` must have
 * at least one item. Returns { group, investigations }. */
export const createCustomInvestigationGroup = async ({ name, investigations }) => {
  const res = await api.post(
    withQuery(`/api/v1/custom-report-groups`),
    withReceptionistBody({ name, investigations }),
    withReceptionistConfig()
  );
  return { group: withId(res?.group), investigations: (res?.investigations || []).map(withId) };
};

/** PUT /custom-report-groups/:id — rename only; any other field in the body is
 * silently ignored server-side. */
export const updateCustomInvestigationGroup = async ({ id, name }) => {
  const res = await api.put(
    withQuery(`/api/v1/custom-report-groups/${id}`),
    withReceptionistBody({ name }),
    withReceptionistConfig()
  );
  return withId(res);
};

/** DELETE /custom-report-groups/:id — cascades to every investigation inside
 * (only reachable if none are usage-locked). */
export const deleteCustomInvestigationGroup = async (id) => {
  return api.delete(withQuery(`/api/v1/custom-report-groups/${id}`), withReceptionistConfig());
};

/** POST /custom-lab-tests — adds one investigation to an EXISTING group. */
export const createCustomInvestigation = async ({
  groupId,
  name,
  resultType,
  unit,
  dropdownOptions,
  referenceRanges,
}) => {
  const res = await api.post(
    withQuery(`/api/v1/custom-lab-tests`),
    withReceptionistBody({ groupId, name, resultType, unit, dropdownOptions, referenceRanges }),
    withReceptionistConfig()
  );
  return withId(res);
};

/** PUT /custom-lab-tests/:id — only name/unit/dropdownOptions/referenceRanges are
 * ever applied; groupId can't be changed this way (no move-between-groups op). */
export const updateCustomInvestigation = async ({ id, name, unit, dropdownOptions, referenceRanges }) => {
  const body = {};
  if (name !== undefined) body.name = name;
  if (unit !== undefined) body.unit = unit;
  if (dropdownOptions !== undefined) body.dropdownOptions = dropdownOptions;
  if (referenceRanges !== undefined) body.referenceRanges = referenceRanges;
  const res = await api.put(
    withQuery(`/api/v1/custom-lab-tests/${id}`),
    withReceptionistBody(body),
    withReceptionistConfig()
  );
  return withId(res);
};

/** DELETE /custom-lab-tests/:id — 409 if the investigation has any patient result
 * recorded against it (usage lock). */
export const deleteCustomInvestigation = async (id) => {
  return api.delete(withQuery(`/api/v1/custom-lab-tests/${id}`), withReceptionistConfig());
};

/** GET /custom-lab-tests/check-duplicate — proactive UX check, not the real
 * enforcement (the create/update endpoints reject independently regardless).
 * Response: { blocked, reason: "global_master" | "custom_duplicate" | null,
 * existing }. `existing`'s shape depends on `reason` — branch before reading it. */
export const checkDuplicate = async (name) => {
  return api.get(
    withQuery(`/api/v1/custom-lab-tests/check-duplicate?name=${encodeURIComponent(name)}`),
    withReceptionistConfig()
  );
};
