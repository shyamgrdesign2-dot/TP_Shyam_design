import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getQuickVisitRecords,
  createQuickVisitRecord,
  updateQuickVisitRecord,
  deleteQuickVisitRecord,
} from "../api/services/ApiDental";
import {
  getDentalApiError,
  getDentalApiPayload,
  toDentalQvr,
  toDentalQvrRequest,
} from "../utils/dentalApiMappers";

const initialState = {
  qvrsByServiceId: {},
  loading: false,
  error: null,
};

export const fetchQvrs = createAsyncThunk(
  "dentalQvr/fetchAll",
  async ({ patientId, planId, serviceId }, { rejectWithValue }) => {
    try {
      const response = await getQuickVisitRecords(patientId, planId, serviceId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch quick visit records"));
      }
      const payload = getDentalApiPayload(response);
      const items = Array.isArray(payload) ? payload : payload?.items || [];
      return { serviceId, items: items.map(toDentalQvr) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createQvr = createAsyncThunk(
  "dentalQvr/create",
  async ({ patientId, planId, serviceId, data }, { rejectWithValue }) => {
    try {
      const response = await createQuickVisitRecord(patientId, planId, serviceId, toDentalQvrRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to create quick visit record"));
      }
      return { serviceId, qvr: toDentalQvr(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateQvr = createAsyncThunk(
  "dentalQvr/update",
  async ({ patientId, planId, serviceId, qvrId, data }, { rejectWithValue }) => {
    try {
      const response = await updateQuickVisitRecord(patientId, planId, serviceId, qvrId, toDentalQvrRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to update quick visit record"));
      }
      return { serviceId, qvrId, qvr: toDentalQvr(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteQvr = createAsyncThunk(
  "dentalQvr/delete",
  async ({ patientId, planId, serviceId, qvrId }, { rejectWithValue }) => {
    try {
      const response = await deleteQuickVisitRecord(patientId, planId, serviceId, qvrId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to delete quick visit record"));
      }
      return { serviceId, qvrId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const dentalQvrSlice = createSlice({
  name: "dentalQvr",
  initialState,
  reducers: {
    clearQvrError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQvrs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQvrs.fulfilled, (state, action) => {
        state.loading = false;
        state.qvrsByServiceId[action.payload.serviceId] = action.payload.items;
      })
      .addCase(fetchQvrs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createQvr.fulfilled, (state, action) => {
        const { serviceId, qvr } = action.payload;
        if (!state.qvrsByServiceId[serviceId]) state.qvrsByServiceId[serviceId] = [];
        state.qvrsByServiceId[serviceId].push(qvr);
      })
      .addCase(updateQvr.fulfilled, (state, action) => {
        const { serviceId, qvrId, qvr } = action.payload;
        const list = state.qvrsByServiceId[serviceId];
        if (list) {
          const idx = list.findIndex((q) => q.id === qvrId);
          if (idx !== -1) list[idx] = qvr;
        }
      })
      .addCase(deleteQvr.fulfilled, (state, action) => {
        const { serviceId, qvrId } = action.payload;
        if (state.qvrsByServiceId[serviceId]) {
          state.qvrsByServiceId[serviceId] = state.qvrsByServiceId[serviceId].filter(
            (q) => q.id !== qvrId
          );
        }
      });
  },
});

export const { clearQvrError } = dentalQvrSlice.actions;
export const selectQvrsByServiceId = (serviceId) => (state) =>
  state.dentalQvr.qvrsByServiceId[serviceId] || [];
export default dentalQvrSlice.reducer;
