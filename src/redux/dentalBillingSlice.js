import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPlanBillPreview,
  getServiceBillPreview,
  createInvoice,
  getInvoice,
  getPlanRxPreview,
  getServiceRxPreview,
  getServiceAppointments,
  updateServiceAppointment,
} from "../api/services/ApiDental";
import { getDentalApiError, getDentalApiPayload } from "../utils/dentalApiMappers";

const initialState = {
  billPreviews: {},
  invoices: {},
  rxPreviews: {},
  appointmentsByServiceId: {},
  loading: false,
  error: null,
};

export const fetchPlanBillPreview = createAsyncThunk(
  "dentalBilling/fetchPlanBillPreview",
  async ({ patientId, planId }, { rejectWithValue }) => {
    try {
      const response = await getPlanBillPreview(patientId, planId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch bill preview"));
      }
      return { key: `plan-${planId}`, data: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchServiceBillPreview = createAsyncThunk(
  "dentalBilling/fetchServiceBillPreview",
  async ({ patientId, planId, serviceId }, { rejectWithValue }) => {
    try {
      const response = await getServiceBillPreview(patientId, planId, serviceId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch service bill preview"));
      }
      return { key: `service-${serviceId}`, data: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createDentalInvoice = createAsyncThunk(
  "dentalBilling/createInvoice",
  async ({ patientId, planId, data }, { rejectWithValue }) => {
    try {
      const response = await createInvoice(patientId, planId, data);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to create invoice"));
      }
      const invoice = getDentalApiPayload(response);
      return { invoiceId: invoice.invoiceId, data: invoice };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchDentalInvoice = createAsyncThunk(
  "dentalBilling/fetchInvoice",
  async ({ patientId, invoiceId }, { rejectWithValue }) => {
    try {
      const response = await getInvoice(patientId, invoiceId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch invoice"));
      }
      return { invoiceId, data: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPlanRxPreview = createAsyncThunk(
  "dentalBilling/fetchPlanRxPreview",
  async ({ patientId, planId }, { rejectWithValue }) => {
    try {
      const response = await getPlanRxPreview(patientId, planId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch Rx preview"));
      }
      return { key: `plan-${planId}`, data: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchServiceRxPreview = createAsyncThunk(
  "dentalBilling/fetchServiceRxPreview",
  async ({ patientId, planId, serviceId }, { rejectWithValue }) => {
    try {
      const response = await getServiceRxPreview(patientId, planId, serviceId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch service Rx preview"));
      }
      return { key: `service-${serviceId}`, data: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchServiceAppointmentsThunk = createAsyncThunk(
  "dentalBilling/fetchServiceAppointments",
  async ({ patientId, planId, serviceId }, { rejectWithValue }) => {
    try {
      const response = await getServiceAppointments(patientId, planId, serviceId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch appointments"));
      }
      const payload = getDentalApiPayload(response);
      const items = Array.isArray(payload) ? payload : payload?.items || [];
      return { serviceId, items };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateServiceAppointmentThunk = createAsyncThunk(
  "dentalBilling/updateServiceAppointment",
  async ({ patientId, planId, serviceId, appointmentId, data }, { rejectWithValue }) => {
    try {
      const response = await updateServiceAppointment(patientId, planId, serviceId, appointmentId, data);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to update appointment"));
      }
      return { serviceId, appointmentId, data: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const dentalBillingSlice = createSlice({
  name: "dentalBilling",
  initialState,
  reducers: {
    clearBillingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlanBillPreview.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPlanBillPreview.fulfilled, (state, action) => {
        state.loading = false;
        state.billPreviews[action.payload.key] = action.payload.data;
      })
      .addCase(fetchPlanBillPreview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchServiceBillPreview.fulfilled, (state, action) => {
        state.billPreviews[action.payload.key] = action.payload.data;
      })
      .addCase(createDentalInvoice.fulfilled, (state, action) => {
        state.invoices[action.payload.invoiceId] = action.payload.data;
      })
      .addCase(fetchDentalInvoice.fulfilled, (state, action) => {
        state.invoices[action.payload.invoiceId] = action.payload.data;
      })
      .addCase(fetchPlanRxPreview.fulfilled, (state, action) => {
        state.rxPreviews[action.payload.key] = action.payload.data;
      })
      .addCase(fetchServiceRxPreview.fulfilled, (state, action) => {
        state.rxPreviews[action.payload.key] = action.payload.data;
      })
      .addCase(fetchServiceAppointmentsThunk.fulfilled, (state, action) => {
        state.appointmentsByServiceId[action.payload.serviceId] = action.payload.items;
      })
      .addCase(updateServiceAppointmentThunk.fulfilled, (state, action) => {
        const { serviceId, appointmentId, data } = action.payload;
        const list = state.appointmentsByServiceId[serviceId];
        if (list) {
          const idx = list.findIndex((a) => a.id === appointmentId);
          if (idx !== -1) list[idx] = { ...list[idx], ...data };
        }
      });
  },
});

export const { clearBillingError } = dentalBillingSlice.actions;
export const selectBillPreview = (key) => (state) => state.dentalBilling.billPreviews[key];
export const selectRxPreview = (key) => (state) => state.dentalBilling.rxPreviews[key];
export const selectAppointmentsByServiceId = (serviceId) => (state) =>
  state.dentalBilling.appointmentsByServiceId[serviceId] || [];
export default dentalBillingSlice.reducer;
