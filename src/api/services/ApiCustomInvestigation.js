import api from "./axiosService";
import { env } from "../../EnvironmentConfig";

// Hospital-scoped custom investigation groups/investigations.
// Backend contract: docs/2026-08-19-custom-investigation-BACKEND-API-CONTRACT.md
// (Pm-Patient-Docs, live on UAT as of 2026-08-19). hm_id/um_id are always derived
// server-side from the auth token — never sent in request bodies.

const baseUrl = { customBaseUrl: env.lab_params_api_url };

// The backend keys everything on _id; the rest of this app's code was written
// against .id. Alias it here once so callers never have to think about it.
const withId = (doc) => (doc ? { ...doc, id: doc._id } : doc);
const normalizeGroup = (g) => ({ ...withId(g), investigations: (g?.investigations || []).map(withId) });

/** GET /custom-report-groups — every group for the caller's hospital, each with
 * its investigations nested inside. No query params, no separate investigations
 * list endpoint. */
export const getCustomInvestigations = async () => {
  const groups = await api.get(`/api/v1/custom-report-groups`, baseUrl);
  return (Array.isArray(groups) ? groups : []).map(normalizeGroup);
};

/** POST /custom-report-groups — creates a group AND its first investigation(s) in
 * one call; there is no create-empty-group endpoint. `investigations` must have
 * at least one item. Returns { group, investigations }. */
export const createCustomInvestigationGroup = async ({ name, investigations }) => {
  const res = await api.post(`/api/v1/custom-report-groups`, { name, investigations }, baseUrl);
  return { group: withId(res?.group), investigations: (res?.investigations || []).map(withId) };
};

/** PUT /custom-report-groups/:id — rename only; any other field in the body is
 * silently ignored server-side. */
export const updateCustomInvestigationGroup = async ({ id, name }) => {
  const res = await api.put(`/api/v1/custom-report-groups/${id}`, { name }, baseUrl);
  return withId(res);
};

/** DELETE /custom-report-groups/:id — cascades to every investigation inside
 * (only reachable if none are usage-locked). */
export const deleteCustomInvestigationGroup = async (id) => {
  return api.delete(`/api/v1/custom-report-groups/${id}`, baseUrl);
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
    `/api/v1/custom-lab-tests`,
    { groupId, name, resultType, unit, dropdownOptions, referenceRanges },
    baseUrl
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
  const res = await api.put(`/api/v1/custom-lab-tests/${id}`, body, baseUrl);
  return withId(res);
};

/** DELETE /custom-lab-tests/:id — 409 if the investigation has any patient result
 * recorded against it (usage lock). */
export const deleteCustomInvestigation = async (id) => {
  return api.delete(`/api/v1/custom-lab-tests/${id}`, baseUrl);
};

/** GET /custom-lab-tests/check-duplicate — proactive UX check, not the real
 * enforcement (the create/update endpoints reject independently regardless).
 * Response: { blocked, reason: "global_master" | "custom_duplicate" | null,
 * existing }. `existing`'s shape depends on `reason` — branch before reading it. */
export const checkDuplicate = async (name) => {
  return api.get(`/api/v1/custom-lab-tests/check-duplicate?name=${encodeURIComponent(name)}`, baseUrl);
};
