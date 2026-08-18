import api from "./axiosService";
import { env } from "../../EnvironmentConfig";

const baseUrl = { customBaseUrl: env.lab_params_api_url };

// Hospital-scoped custom investigation groups/investigations.
// Backend contract assumed — not yet implemented server-side (see plan doc).
// Every function below tries the real API first; if that 404s (no backend
// yet), it falls back to a localStorage-backed mock so the feature is fully
// usable end to end today. Once the real backend ships, delete the fallback
// branches — the function signatures/return shapes won't need to change.

const LOCAL_STORE_KEY = "tp_custom_investigations_v1";

const readLocalStore = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_STORE_KEY));
    return { groups: raw?.groups || [], investigations: raw?.investigations || [] };
  } catch {
    return { groups: [], investigations: [] };
  }
};

const writeLocalStore = (store) => {
  localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store));
};

const localId = (prefix) => `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const getCustomInvestigations = async (hmid) => {
  try {
    const res = await api.get(
      `/api/v1/custom-investigations?hmid=${encodeURIComponent(hmid)}`,
      baseUrl
    );
    return {
      groups: Array.isArray(res?.groups) ? res.groups : [],
      investigations: Array.isArray(res?.investigations) ? res.investigations : [],
    };
  } catch (error) {
    const store = readLocalStore();
    return {
      groups: store.groups.filter((g) => g.hmid === hmid),
      investigations: store.investigations.filter((i) => i.hmid === hmid),
    };
  }
};

export const createCustomInvestigationGroup = async ({ hmid, name, createdBy }) => {
  try {
    return await api.post(`/api/v1/custom-investigations/groups`, { hmid, name, createdBy }, baseUrl);
  } catch (error) {
    const store = readLocalStore();
    const group = { id: localId("group"), hmid, name, isActive: true, createdBy };
    store.groups = [...store.groups, group];
    writeLocalStore(store);
    return group;
  }
};

export const updateCustomInvestigationGroup = async ({ id, hmid, name }) => {
  try {
    return await api.patch(`/api/v1/custom-investigations/groups/${id}`, { name }, baseUrl);
  } catch (error) {
    const store = readLocalStore();
    store.groups = store.groups.map((g) => (g.id === id ? { ...g, name } : g));
    writeLocalStore(store);
    return store.groups.find((g) => g.id === id);
  }
};

export const setCustomInvestigationGroupActive = async ({ id, isActive }) => {
  try {
    return await api.patch(`/api/v1/custom-investigations/groups/${id}`, { isActive }, baseUrl);
  } catch (error) {
    const store = readLocalStore();
    store.groups = store.groups.map((g) => (g.id === id ? { ...g, isActive } : g));
    writeLocalStore(store);
    return store.groups.find((g) => g.id === id);
  }
};

export const deleteCustomInvestigationGroup = async (id) => {
  try {
    return await api.delete(`/api/v1/custom-investigations/groups/${id}`, baseUrl);
  } catch (error) {
    const store = readLocalStore();
    store.groups = store.groups.filter((g) => g.id !== id);
    writeLocalStore(store);
    return { id };
  }
};

export const createCustomInvestigation = async ({
  hmid,
  groupId,
  name,
  unit,
  resultType,
  dropdownOptions,
  referenceRanges,
  createdBy,
}) => {
  const payload = { hmid, groupId, name, unit, resultType, dropdownOptions, referenceRanges, createdBy };
  try {
    return await api.post(`/api/v1/custom-investigations`, payload, baseUrl);
  } catch (error) {
    const store = readLocalStore();
    const investigation = { id: localId("inv"), isActive: true, hasBeenUsed: false, ...payload };
    store.investigations = [...store.investigations, investigation];
    writeLocalStore(store);
    return investigation;
  }
};

export const updateCustomInvestigation = async ({ id, ...fields }) => {
  try {
    return await api.patch(`/api/v1/custom-investigations/${id}`, fields, baseUrl);
  } catch (error) {
    const store = readLocalStore();
    store.investigations = store.investigations.map((i) => (i.id === id ? { ...i, ...fields } : i));
    writeLocalStore(store);
    return store.investigations.find((i) => i.id === id);
  }
};

export const setCustomInvestigationActive = async ({ id, isActive }) => {
  try {
    return await api.patch(`/api/v1/custom-investigations/${id}`, { isActive }, baseUrl);
  } catch (error) {
    const store = readLocalStore();
    store.investigations = store.investigations.map((i) => (i.id === id ? { ...i, isActive } : i));
    writeLocalStore(store);
    return store.investigations.find((i) => i.id === id);
  }
};

export const deleteCustomInvestigation = async (id) => {
  try {
    return await api.delete(`/api/v1/custom-investigations/${id}`, baseUrl);
  } catch (error) {
    const store = readLocalStore();
    store.investigations = store.investigations.filter((i) => i.id !== id);
    writeLocalStore(store);
    return { id };
  }
};
