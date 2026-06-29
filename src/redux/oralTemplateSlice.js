import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listOralTemplates,
  getOralTemplate,
  saveOralExaminationTemplate,
  saveOralFindingsTemplate,
  saveOralProceduresTemplate,
  saveOralTreatmentHistoryTemplate,
  saveOralNotesTemplate,
  updateOralTemplate,
  deleteOralTemplateById,
} from "../api/services/ApiOral";
import {
  getDentalApiError,
  getDentalApiPayload,
  toDentalTemplate,
  toDentalTemplates,
} from "../utils/dentalApiMappers";

const SAVE_FN_BY_TYPE = {
  examination: saveOralExaminationTemplate,
  findings: saveOralFindingsTemplate,
  procedures: saveOralProceduresTemplate,
  "treatment-history": saveOralTreatmentHistoryTemplate,
  notes: saveOralNotesTemplate,
};

const initialState = {
  byType: {},
  current: null,
  loading: false,
  error: null,
};

export const fetchOralTemplates = createAsyncThunk(
  "oralTemplate/fetchAll",
  async (type, { rejectWithValue }) => {
    try {
      const response = await listOralTemplates(type);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch oral templates"));
      }
      return { type, items: toDentalTemplates(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchOralTemplate = createAsyncThunk(
  "oralTemplate/fetchOne",
  async ({ type, id }, { rejectWithValue }) => {
    try {
      const response = await getOralTemplate(type, id);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch oral template"));
      }
      return toDentalTemplate(getDentalApiPayload(response));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const saveOralTemplate = createAsyncThunk(
  "oralTemplate/save",
  async ({ type, data }, { rejectWithValue }) => {
    const saveFn = SAVE_FN_BY_TYPE[type];
    if (!saveFn) return rejectWithValue(`Unknown oral template type: ${type}`);
    try {
      const response = data.id
        ? await updateOralTemplate(type, data.id, data)
        : await saveFn(data);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to save oral template"));
      }
      return { type, template: toDentalTemplate(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteOralTemplate = createAsyncThunk(
  "oralTemplate/delete",
  async ({ type, id }, { rejectWithValue }) => {
    try {
      const response = await deleteOralTemplateById(type, id);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to delete oral template"));
      }
      return { type, id };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const oralTemplateSlice = createSlice({
  name: "oralTemplate",
  initialState,
  reducers: {
    clearOralTemplateError: (state) => { state.error = null; },
    clearCurrentOralTemplate: (state) => { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOralTemplates.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOralTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.byType[action.payload.type] = action.payload.items;
      })
      .addCase(fetchOralTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchOralTemplate.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(saveOralTemplate.fulfilled, (state, action) => {
        const { type, template } = action.payload;
        if (!state.byType[type]) state.byType[type] = [];
        const idx = state.byType[type].findIndex((t) => t.id === template.id);
        if (idx !== -1) {
          state.byType[type][idx] = template;
        } else {
          state.byType[type].push(template);
        }
      })
      .addCase(deleteOralTemplate.fulfilled, (state, action) => {
        const { type, id } = action.payload;
        if (state.byType[type]) {
          state.byType[type] = state.byType[type].filter((t) => t.id !== id);
        }
      })
      .addCase(deleteOralTemplate.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearOralTemplateError, clearCurrentOralTemplate } = oralTemplateSlice.actions;
export const selectOralTemplatesByType = (type) => (state) =>
  state.oralTemplate?.byType[type] || [];
export const selectCurrentOralTemplate = (state) => state.oralTemplate?.current;
export default oralTemplateSlice.reducer;
