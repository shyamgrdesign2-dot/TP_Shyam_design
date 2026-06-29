import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listTemplates,
  getTemplate,
  saveExaminationTemplate,
  saveFindingsTemplate,
  saveProceduresTemplate,
  saveTreatmentHistoryTemplate,
  saveNotesTemplate,
  updateTemplate,
  deleteTemplateById,
} from "../api/services/ApiDental";
import {
  getDentalApiError,
  getDentalApiPayload,
  toDentalTemplate,
  toDentalTemplates,
} from "../utils/dentalApiMappers";

const SAVE_FN_BY_TYPE = {
  examination: saveExaminationTemplate,
  findings: saveFindingsTemplate,
  procedures: saveProceduresTemplate,
  "treatment-history": saveTreatmentHistoryTemplate,
  notes: saveNotesTemplate,
};

const initialState = {
  byType: {},
  current: null,
  loading: false,
  error: null,
};

export const fetchTemplates = createAsyncThunk(
  "dentalTemplate/fetchAll",
  async (type, { rejectWithValue }) => {
    try {
      const response = await listTemplates(type);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch templates"));
      }
      return { type, items: toDentalTemplates(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchTemplate = createAsyncThunk(
  "dentalTemplate/fetchOne",
  async ({ type, id }, { rejectWithValue }) => {
    try {
      const response = await getTemplate(type, id);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch template"));
      }
      return toDentalTemplate(getDentalApiPayload(response));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const saveTemplate = createAsyncThunk(
  "dentalTemplate/save",
  async ({ type, data }, { rejectWithValue }) => {
    const saveFn = SAVE_FN_BY_TYPE[type];
    if (!saveFn) return rejectWithValue(`Unknown template type: ${type}`);
    try {
      const response = data.id
        ? await updateTemplate(type, data.id, data)
        : await saveFn(data);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to save template"));
      }
      return { type, template: toDentalTemplate(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "dentalTemplate/delete",
  async ({ type, id }, { rejectWithValue }) => {
    try {
      const response = await deleteTemplateById(type, id);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to delete template"));
      }
      return { type, id };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const dentalTemplateSlice = createSlice({
  name: "dentalTemplate",
  initialState,
  reducers: {
    clearTemplateError: (state) => {
      state.error = null;
    },
    clearCurrentTemplate: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.byType[action.payload.type] = action.payload.items;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTemplate.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(saveTemplate.fulfilled, (state, action) => {
        const { type, template } = action.payload;
        if (!state.byType[type]) state.byType[type] = [];
        const idx = state.byType[type].findIndex((t) => t.id === template.id);
        if (idx !== -1) {
          state.byType[type][idx] = template;
        } else {
          state.byType[type].push(template);
        }
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        const { type, id } = action.payload;
        if (state.byType[type]) {
          state.byType[type] = state.byType[type].filter((t) => t.id !== id);
        }
      });
  },
});

export const { clearTemplateError, clearCurrentTemplate } = dentalTemplateSlice.actions;
export const selectTemplatesByType = (type) => (state) =>
  state.dentalTemplate.byType[type] || [];
export const selectCurrentTemplate = (state) => state.dentalTemplate.current;
export default dentalTemplateSlice.reducer;
