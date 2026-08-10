import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getOralExamination,
  saveOralExaminationFull,
  patchOralExamination,
} from "../api/services/ApiOral";
import { getDentalApiError, getDentalApiPayload } from "../utils/dentalApiMappers";

function toBaselineOralProcedureEntries(procedures = []) {
  return (Array.isArray(procedures) ? procedures : []).map((p) => ({
    id: p.id,
    kind: "procedure",
    name: p.name,
    surfaces: p.area || [],
    since: p.procedure_date || "",
    status: p.status,
    note: p.notes || "",
  }));
}

const initialState = {
  findings: [],
  procedures: [],
  treatmentHistory: [],
  overallNotes: "",
  version: 0,
  canvasOralEntries: [],
  canvasOralNotes: "",
  /** Snapshot of oral procedures already accounted for as plan pending (API load or End Visit). */
  baselineOralEntries: [],
  loading: false,
  saving: false,
  error: null,
  lastSaved: null,
};

export const fetchOralExamination = createAsyncThunk(
  "oralExamination/fetch",
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await getOralExamination(patientId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch oral examination"));
      }
      const payload = getDentalApiPayload(response);
      // Empty object means no existing document — return empty state
      if (!payload || Object.keys(payload).length === 0) return null;
      return payload;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const saveOralExaminationThunk = createAsyncThunk(
  "oralExamination/save",
  async ({ patientId, data }, { rejectWithValue }) => {
    try {
      const response = await saveOralExaminationFull(patientId, data);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to save oral examination"));
      }
      return getDentalApiPayload(response) || {};
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const patchOralExaminationThunk = createAsyncThunk(
  "oralExamination/patch",
  async ({ patientId, data }, { rejectWithValue }) => {
    try {
      const response = await patchOralExamination(patientId, data);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to patch oral examination"));
      }
      return getDentalApiPayload(response) || {};
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const oralExaminationSlice = createSlice({
  name: "oralExamination",
  initialState,
  reducers: {
    clearOralExamination: () => ({ ...initialState }),
    syncOralCanvasState: (state, action) => {
      state.canvasOralEntries = action.payload.canvasOralEntries || [];
      state.canvasOralNotes = action.payload.canvasOralNotes || "";
    },
    setBaselineOralEntries: (state, action) => {
      state.baselineOralEntries = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOralExamination.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.findings = [];
        state.procedures = [];
        state.treatmentHistory = [];
        state.overallNotes = "";
        state.version = 0;
        state.baselineOralEntries = [];
        state.canvasOralEntries = [];
        state.canvasOralNotes = "";
      })
      .addCase(fetchOralExamination.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        if (!payload) return;
        state.findings = Array.isArray(payload.findings) ? payload.findings : [];
        state.procedures = Array.isArray(payload.procedures) ? payload.procedures : [];
        state.treatmentHistory = Array.isArray(payload.treatment_history) ? payload.treatment_history : [];
        state.overallNotes = payload.overall_notes || "";
        state.version = payload.version || 0;
        state.baselineOralEntries = toBaselineOralProcedureEntries(state.procedures);
      })
      .addCase(fetchOralExamination.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(saveOralExaminationThunk.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveOralExaminationThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.lastSaved = new Date().toISOString();
        const payload = action.payload;
        if (payload?.version) state.version = payload.version;
        if (Array.isArray(payload?.findings)) state.findings = payload.findings;
        if (Array.isArray(payload?.procedures)) state.procedures = payload.procedures;
        if (Array.isArray(payload?.treatment_history)) state.treatmentHistory = payload.treatment_history;
        if (typeof payload?.overall_notes === "string") state.overallNotes = payload.overall_notes;
      })
      .addCase(saveOralExaminationThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(patchOralExaminationThunk.pending, (state) => {
        state.saving = true;
      })
      .addCase(patchOralExaminationThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.lastSaved = new Date().toISOString();
        const payload = action.payload;
        if (payload?.version) state.version = payload.version;
      })
      .addCase(patchOralExaminationThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearOralExamination,
  syncOralCanvasState,
  setBaselineOralEntries,
} = oralExaminationSlice.actions;
export const selectOralExamination = (state) => state.oralExamination;
export const selectBaselineOralEntries = (state) =>
  state.oralExamination.baselineOralEntries;
export default oralExaminationSlice.reducer;
