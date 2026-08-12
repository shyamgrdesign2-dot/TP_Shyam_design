import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getExamination, updateExaminationFull } from "../api/services/ApiDental";
import {
  getDentalApiError,
  getDentalApiPayload,
  toDentalToothState,
} from "../utils/dentalApiMappers";

const initialState = {
  // Tooth state: Map of toothId (string) to its clinical data
  // Example: { "T18": { findings: ["Caries"], procedures: [], notes: "Watch" } }
  toothState: {},
  baselineToothState: {},
  version: 0,
  loading: false,
  saving: false,
  error: null,
  lastSaved: null,
  dentitionType: null, // null until API responds; "adult"|"pediatric"|"mixed" after
};

export const fetchDentalExamination = createAsyncThunk(
  "dentalExamination/fetch",
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await getExamination(patientId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch dental examination"));
      }
      return getDentalApiPayload(response) || {};
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const saveDentalExamination = createAsyncThunk(
  "dentalExamination/save",
  async ({ patientId, data }, { rejectWithValue }) => {
    try {
      const response = await updateExaminationFull(patientId, data);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to save dental examination"));
      }
      return getDentalApiPayload(response) || {};
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const dentalExaminationSlice = createSlice({
  name: "dentalExamination",
  initialState,
  reducers: {
    updateToothData: (state, action) => {
      const { toothId, data } = action.payload;
      state.toothState[toothId] = {
        ...state.toothState[toothId],
        ...data,
      };
    },
    syncWholeState: (state, action) => {
      const { toothState, dentitionType } = action.payload;
      state.toothState = toothState;
      if (dentitionType) state.dentitionType = dentitionType;
    },
    clearDentalChart: (state) => {
      state.toothState = {};
      state.baselineToothState = {};
      state.version = 0;
      state.dentitionType = null;
      state.error = null;
      state.lastSaved = null;
    },
    resetDentalError: (state) => {
      state.error = null;
    },
    setBaselineToothState: (state, action) => {
      state.baselineToothState = action.payload || {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDentalExamination.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.toothState = {};
        state.baselineToothState = {};
        state.version = 0;
        state.dentitionType = null; // reset so stale type from previous patient doesn't bleed through
      })
      .addCase(fetchDentalExamination.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        state.dentitionType = payload?.dentition_type ?? null; // null means API returned no saved type
        state.version = payload?.version || 0;

        state.toothState = toDentalToothState(payload);
        state.baselineToothState = JSON.parse(
          JSON.stringify(toDentalToothState(payload)),
        );
      })
      .addCase(fetchDentalExamination.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(saveDentalExamination.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveDentalExamination.fulfilled, (state, action) => {
        state.saving = false;
        state.lastSaved = new Date().toISOString();
        state.version = action.payload?.version || state.version;
      })
      .addCase(saveDentalExamination.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { updateToothData, syncWholeState, clearDentalChart, resetDentalError, setBaselineToothState } = dentalExaminationSlice.actions;
export default dentalExaminationSlice.reducer;

export const selectDentalExamination   = (state) => state.dentalExamination;
export const selectToothState          = (state) => state.dentalExamination.toothState;
export const selectDentalExamVersion   = (state) => state.dentalExamination.version;
export const selectDentalDentitionType = (state) => state.dentalExamination.dentitionType;
export const selectDentalExamLoading   = (state) => state.dentalExamination.loading;
export const selectDentalExamSaving    = (state) => state.dentalExamination.saving;
export const selectDentalExamError     = (state) => state.dentalExamination.error;
