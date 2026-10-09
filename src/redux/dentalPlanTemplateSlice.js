import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listPlanTemplates,
  getPlanTemplateById,
  createPlanTemplate,
  updatePlanTemplateById,
  deletePlanTemplateById,
  listServiceTemplates,
  getServiceTemplateById,
  createServiceTemplate,
  updateServiceTemplateById,
  deleteServiceTemplateById,
} from "../api/services/ApiDental";
import { getDentalApiError, getDentalApiPayload, toDentalTemplate, toDentalTemplates } from "../utils/dentalApiMappers";

const domainConfig = {
  plan: {
    list: listPlanTemplates,
    getOne: getPlanTemplateById,
    create: createPlanTemplate,
    update: updatePlanTemplateById,
    remove: deletePlanTemplateById,
  },
  service: {
    list: listServiceTemplates,
    getOne: getServiceTemplateById,
    create: createServiceTemplate,
    update: updateServiceTemplateById,
    remove: deleteServiceTemplateById,
  },
};

const initialDomainState = { items: [], loading: false, error: null };

const initialState = {
  plan: { ...initialDomainState },
  service: { ...initialDomainState },
};

export const fetchPlanTemplates = createAsyncThunk(
  "dentalPlanTemplate/fetchPlan",
  async (_, { rejectWithValue }) => {
    try {
      const res = await domainConfig.plan.list();
      if (res?.status === false) return rejectWithValue(getDentalApiError(res, "Failed to fetch plan templates"));
      return toDentalTemplates(getDentalApiPayload(res));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchServiceTemplates = createAsyncThunk(
  "dentalPlanTemplate/fetchService",
  async (_, { rejectWithValue }) => {
    try {
      const res = await domainConfig.service.list();
      if (res?.status === false) return rejectWithValue(getDentalApiError(res, "Failed to fetch service templates"));
      return toDentalTemplates(getDentalApiPayload(res));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchOnePlanTemplate = createAsyncThunk(
  "dentalPlanTemplate/fetchOnePlan",
  async (id, { rejectWithValue }) => {
    try {
      const res = await domainConfig.plan.getOne(id);
      if (res?.status === false) return rejectWithValue(getDentalApiError(res, "Failed to fetch template"));
      return toDentalTemplate(getDentalApiPayload(res));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchOneServiceTemplate = createAsyncThunk(
  "dentalPlanTemplate/fetchOneService",
  async (id, { rejectWithValue }) => {
    try {
      const res = await domainConfig.service.getOne(id);
      if (res?.status === false) return rejectWithValue(getDentalApiError(res, "Failed to fetch template"));
      return toDentalTemplate(getDentalApiPayload(res));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// { name, payload, id? } — id present → update (PUT), absent → create (POST)
export const savePlanTemplate = createAsyncThunk(
  "dentalPlanTemplate/savePlan",
  async ({ name, payload, id }, { rejectWithValue }) => {
    try {
      const data = { name, ...payload };
      const res = id
        ? await domainConfig.plan.update(id, data)
        : await domainConfig.plan.create(data);
      if (res?.status === false) return rejectWithValue(getDentalApiError(res, "Failed to save plan template"));
      return toDentalTemplate(getDentalApiPayload(res));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const saveServiceTemplate = createAsyncThunk(
  "dentalPlanTemplate/saveService",
  async ({ name, payload, id }, { rejectWithValue }) => {
    try {
      const data = { name, ...payload };
      const res = id
        ? await domainConfig.service.update(id, data)
        : await domainConfig.service.create(data);
      if (res?.status === false) return rejectWithValue(getDentalApiError(res, "Failed to save service template"));
      return toDentalTemplate(getDentalApiPayload(res));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const removePlanTemplate = createAsyncThunk(
  "dentalPlanTemplate/removePlan",
  async (id, { rejectWithValue }) => {
    try {
      const res = await domainConfig.plan.remove(id);
      if (res?.status === false) return rejectWithValue(getDentalApiError(res, "Failed to delete plan template"));
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const removeServiceTemplate = createAsyncThunk(
  "dentalPlanTemplate/removeService",
  async (id, { rejectWithValue }) => {
    try {
      const res = await domainConfig.service.remove(id);
      if (res?.status === false) return rejectWithValue(getDentalApiError(res, "Failed to delete service template"));
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const upsert = (items, template) => {
  const idx = items.findIndex((t) => t.id === template.id);
  if (idx !== -1) { items[idx] = template; } else { items.push(template); }
};

const dentalPlanTemplateSlice = createSlice({
  name: "dentalPlanTemplate",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlanTemplates.pending, (state) => { state.plan.loading = true; state.plan.error = null; })
      .addCase(fetchPlanTemplates.fulfilled, (state, { payload }) => { state.plan.loading = false; state.plan.items = payload; })
      .addCase(fetchPlanTemplates.rejected, (state, { payload }) => { state.plan.loading = false; state.plan.error = payload; })
      .addCase(fetchServiceTemplates.pending, (state) => { state.service.loading = true; state.service.error = null; })
      .addCase(fetchServiceTemplates.fulfilled, (state, { payload }) => { state.service.loading = false; state.service.items = payload; })
      .addCase(fetchServiceTemplates.rejected, (state, { payload }) => { state.service.loading = false; state.service.error = payload; })
      .addCase(savePlanTemplate.pending, (state) => { state.plan.loading = true; })
      .addCase(savePlanTemplate.fulfilled, (state, { payload }) => { state.plan.loading = false; upsert(state.plan.items, payload); })
      .addCase(savePlanTemplate.rejected, (state, { payload }) => { state.plan.loading = false; state.plan.error = payload; })
      .addCase(saveServiceTemplate.pending, (state) => { state.service.loading = true; })
      .addCase(saveServiceTemplate.fulfilled, (state, { payload }) => { state.service.loading = false; upsert(state.service.items, payload); })
      .addCase(saveServiceTemplate.rejected, (state, { payload }) => { state.service.loading = false; state.service.error = payload; })
      .addCase(removePlanTemplate.fulfilled, (state, { payload: id }) => { state.plan.items = state.plan.items.filter((t) => t.id !== id); })
      .addCase(removeServiceTemplate.fulfilled, (state, { payload: id }) => { state.service.items = state.service.items.filter((t) => t.id !== id); });
  },
});

export const selectPlanTemplates = (state) => state.dentalPlanTemplate.plan.items;
export const selectServiceTemplates = (state) => state.dentalPlanTemplate.service.items;
export const selectPlanTemplateSaving = (state) =>
  state.dentalPlanTemplate.plan.loading || state.dentalPlanTemplate.service.loading;

export default dentalPlanTemplateSlice.reducer;
