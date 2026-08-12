import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  duplicatePlan,
  activatePlan,
  startTreatment,
  markPlanCompleted,
  revertPlanToEstimates,
  revertPlanToProgress,
  addPlanService as addPlanServiceApi,
  updatePlanService as updatePlanServiceApi,
  deletePlanService as deletePlanServiceApi,
  markServiceCompleted as markServiceCompletedApi,
  revertServiceToProgress as revertServiceToProgressApi,
} from "../api/services/ApiDental";
import {
  getDentalApiError,
  getDentalApiPayload,
  qvrToSitting,
  toDentalPlan,
  toDentalPlanPatchRequest,
  toDentalPlanRequest,
  toDentalPlans,
  toDentalService,
  toDentalServicePatchRequest,
  toDentalServiceRequest,
  toDentalTransitionRequest,
} from "../utils/dentalApiMappers";
import { createQvr, updateQvr, deleteQvr } from "./dentalQvrSlice";

const initialState = {
  plans: [],
  loading: false,
  error: null,
  currentPlan: null,
  sessionPendingServices: [],
};

// ==========================================
// 1. Plan Thunks
// ==========================================

export const fetchDentalPlans = createAsyncThunk(
  "dentalPlan/fetchAll",
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await getPlans(patientId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to fetch dental plans"));
      }
      return toDentalPlans(getDentalApiPayload(response));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createDentalPlan = createAsyncThunk(
  "dentalPlan/create",
  async ({ patientId, data }, { rejectWithValue }) => {
    try {
      const response = await createPlan(patientId, toDentalPlanRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to create dental plan"));
      }
      return toDentalPlan(getDentalApiPayload(response));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateDentalPlan = createAsyncThunk(
  "dentalPlan/update",
  async ({ patientId, planId, data }, { rejectWithValue }) => {
    try {
      const response = await updatePlan(patientId, planId, toDentalPlanRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to update dental plan"));
      }
      return { planId, data: toDentalPlan(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteDentalPlan = createAsyncThunk(
  "dentalPlan/delete",
  async ({ patientId, planId }, { rejectWithValue }) => {
    try {
      const response = await deletePlan(patientId, planId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to delete dental plan"));
      }
      return planId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const duplicateDentalPlan = createAsyncThunk(
  "dentalPlan/duplicate",
  async ({ patientId, planId }, { rejectWithValue }) => {
    try {
      const response = await duplicatePlan(patientId, planId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to duplicate dental plan"));
      }
      return toDentalPlan(getDentalApiPayload(response));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// State Transitions
export const activateDentalPlan = createAsyncThunk(
  "dentalPlan/activate",
  async ({ patientId, planId, data }, { rejectWithValue }) => {
    try {
      const response = await activatePlan(patientId, planId, toDentalTransitionRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to activate dental plan"));
      }
      return { planId, data: toDentalPlan(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const startDentalTreatment = createAsyncThunk(
  "dentalPlan/startTreatment",
  async ({ patientId, planId, data }, { rejectWithValue }) => {
    try {
      const response = await startTreatment(patientId, planId, toDentalTransitionRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to start treatment"));
      }
      return { planId, data: toDentalPlan(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markDentalPlanCompleted = createAsyncThunk(
  "dentalPlan/markCompleted",
  async ({ patientId, planId, data }, { rejectWithValue }) => {
    try {
      const response = await markPlanCompleted(patientId, planId, toDentalTransitionRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to mark plan as completed"));
      }
      return { planId, data: toDentalPlan(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const revertDentalPlanToEstimates = createAsyncThunk(
  "dentalPlan/revertToEstimates",
  async ({ patientId, planId, data }, { rejectWithValue }) => {
    try {
      const response = await revertPlanToEstimates(patientId, planId, toDentalTransitionRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to revert plan to estimates"));
      }
      return { planId, data: toDentalPlan(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const revertDentalPlanToProgress = createAsyncThunk(
  "dentalPlan/revertToProgress",
  async ({ patientId, planId, data }, { rejectWithValue }) => {
    try {
      const response = await revertPlanToProgress(patientId, planId, toDentalTransitionRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to revert plan to in-progress"));
      }
      return { planId, data: toDentalPlan(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ==========================================
// 2. Service Thunks
// ==========================================

export const addPlanService = createAsyncThunk(
  "dentalPlan/addService",
  async ({ patientId, planId, data }, { rejectWithValue }) => {
    try {
      const response = await addPlanServiceApi(patientId, planId, toDentalServiceRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to add service"));
      }
      return { planId, service: toDentalService(getDentalApiPayload(response)) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updatePlanService = createAsyncThunk(
  "dentalPlan/updateService",
  async ({ patientId, planId, serviceId, data }, { rejectWithValue }) => {
    try {
      const response = await updatePlanServiceApi(
        patientId,
        planId,
        serviceId,
        toDentalServicePatchRequest(data)
      );
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to update service"));
      }
      return { planId, serviceId, patch: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markDentalServiceCompleted = createAsyncThunk(
  "dentalPlan/markServiceCompleted",
  async ({ patientId, planId, serviceId, data }, { rejectWithValue }) => {
    try {
      const response = await markServiceCompletedApi(patientId, planId, serviceId, toDentalTransitionRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to mark service as completed"));
      }
      return { planId, serviceId, patch: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const revertDentalServiceToProgress = createAsyncThunk(
  "dentalPlan/revertServiceToProgress",
  async ({ patientId, planId, serviceId, data }, { rejectWithValue }) => {
    try {
      const response = await revertServiceToProgressApi(patientId, planId, serviceId, toDentalTransitionRequest(data));
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to revert service to in-progress"));
      }
      return { planId, serviceId, patch: getDentalApiPayload(response) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deletePlanService = createAsyncThunk(
  "dentalPlan/deleteService",
  async ({ patientId, planId, serviceId }, { rejectWithValue }) => {
    try {
      const response = await deletePlanServiceApi(patientId, planId, serviceId);
      if (response?.status === false) {
        return rejectWithValue(getDentalApiError(response, "Failed to delete service"));
      }
      return { planId, serviceId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const dentalPlanSlice = createSlice({
  name: "dentalPlan",
  initialState,
  reducers: {
    setCurrentPlan: (state, action) => {
      state.currentPlan = action.payload;
    },
    clearPlanError: (state) => {
      state.error = null;
    },
    setSessionPendingServices: (state, action) => {
      state.sessionPendingServices = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
    clearSessionPendingServices: (state) => {
      state.sessionPendingServices = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchDentalPlans.pending, (state) => {
        state.loading = true;
        state.plans = [];
        state.sessionPendingServices = [];
        state.error = null;
      })
      .addCase(fetchDentalPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(fetchDentalPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createDentalPlan.fulfilled, (state, action) => {
        state.plans.push(action.payload);
      })
      // Update
      .addCase(updateDentalPlan.fulfilled, (state, action) => {
        const index = state.plans.findIndex(p => p.id === action.payload.planId);
        if (index !== -1) {
          state.plans[index] = action.payload.data;
        }
      })
      // Delete
      .addCase(deleteDentalPlan.fulfilled, (state, action) => {
        state.plans = state.plans.filter(p => p.id !== action.payload);
      })
      // Duplicate
      .addCase(duplicateDentalPlan.fulfilled, (state, action) => {
        state.plans.push(action.payload);
      })
      // Activate
      .addCase(activateDentalPlan.fulfilled, (state, action) => {
        state.plans = state.plans.map(p => {
          if (p.id === action.payload.planId) {
            return action.payload.data;
          }
          if (action.payload.data.status === 'active' && p.status === 'active') {
            return { ...p, status: 'draft' };
          }
          return p;
        });
      })
      // Start Treatment
      .addCase(startDentalTreatment.fulfilled, (state, action) => {
        const index = state.plans.findIndex(p => p.id === action.payload.planId);
        if (index !== -1) {
          state.plans[index] = action.payload.data;
        }
      })
      // Mark Completed
      .addCase(markDentalPlanCompleted.fulfilled, (state, action) => {
        const index = state.plans.findIndex(p => p.id === action.payload.planId);
        if (index !== -1) {
          state.plans[index] = action.payload.data;
        }
      })
      // Revert To Estimates
      .addCase(revertDentalPlanToEstimates.fulfilled, (state, action) => {
        const index = state.plans.findIndex(p => p.id === action.payload.planId);
        if (index !== -1) state.plans[index] = action.payload.data;
      })
      // Revert To Progress
      .addCase(revertDentalPlanToProgress.fulfilled, (state, action) => {
        const index = state.plans.findIndex(p => p.id === action.payload.planId);
        if (index !== -1) state.plans[index] = action.payload.data;
      })
      // Mark Service Completed
      .addCase(markDentalServiceCompleted.fulfilled, (state, action) => {
        const plan = state.plans.find(p => p.id === action.payload.planId);
        if (plan?.services) {
          const idx = plan.services.findIndex(s => s.id === action.payload.serviceId);
          if (idx !== -1) plan.services[idx] = toDentalService({ ...plan.services[idx], ...action.payload.patch });
        }
      })
      // Revert Service To Progress
      .addCase(revertDentalServiceToProgress.fulfilled, (state, action) => {
        const plan = state.plans.find(p => p.id === action.payload.planId);
        if (plan?.services) {
          const idx = plan.services.findIndex(s => s.id === action.payload.serviceId);
          if (idx !== -1) plan.services[idx] = toDentalService({ ...plan.services[idx], ...action.payload.patch });
        }
      })
      // Add Service
      .addCase(addPlanService.fulfilled, (state, action) => {
        const plan = state.plans.find(p => p.id === action.payload.planId);
        if (plan) {
          if (!plan.services) plan.services = [];
          plan.services.push(action.payload.service);
        }
      })
      // Update Service
      .addCase(updatePlanService.fulfilled, (state, action) => {
        const plan = state.plans.find(p => p.id === action.payload.planId);
        if (plan?.services) {
          const sIndex = plan.services.findIndex(s => s.id === action.payload.serviceId);
          if (sIndex !== -1) {
            const previous = plan.services[sIndex];
            const updated = toDentalService({
              ...previous,
              ...action.payload.patch,
            });
            plan.services[sIndex] = {
              ...updated,
              sittings: updated.sittings?.length
                ? updated.sittings
                : previous.sittings,
              quickVisitRecords: updated.quickVisitRecords?.length
                ? updated.quickVisitRecords
                : previous.quickVisitRecords,
            };
          }
        }
      })
      // Delete Service
      .addCase(deletePlanService.fulfilled, (state, action) => {
        const plan = state.plans.find(p => p.id === action.payload.planId);
        if (plan && plan.services) {
          plan.services = plan.services.filter(s => s.id !== action.payload.serviceId);
        }
      })
      // Quick visit records — keep plan service sittings in sync with QVR API
      .addCase(createQvr.fulfilled, (state, action) => {
        const { serviceId, qvr } = action.payload;
        const doctorName = action.meta?.arg?.doctorName;
        const sitting = qvrToSitting(qvr, { doctorName });
        for (const plan of state.plans) {
          const svc = plan.services?.find((s) => s.id === serviceId);
          if (!svc) continue;
          if (!svc.sittings) svc.sittings = [];
          svc.sittings.push(sitting);
          if (!svc.quickVisitRecords) svc.quickVisitRecords = [];
          svc.quickVisitRecords.push(qvr);
          break;
        }
      })
      .addCase(updateQvr.fulfilled, (state, action) => {
        const { serviceId, qvrId, qvr } = action.payload;
        const doctorName = action.meta?.arg?.doctorName;
        const sitting = qvrToSitting(qvr, { doctorName });
        for (const plan of state.plans) {
          const svc = plan.services?.find((s) => s.id === serviceId);
          if (!svc) continue;
          if (!svc.sittings) svc.sittings = [];
          const idx = svc.sittings.findIndex((s) => s.id === qvrId);
          if (idx === -1) svc.sittings.push(sitting);
          else svc.sittings[idx] = { ...svc.sittings[idx], ...sitting };
          if (!svc.quickVisitRecords) svc.quickVisitRecords = [];
          const qIdx = svc.quickVisitRecords.findIndex((q) => q.id === qvrId);
          if (qIdx === -1) svc.quickVisitRecords.push(qvr);
          else svc.quickVisitRecords[qIdx] = qvr;
          break;
        }
      })
      .addCase(deleteQvr.fulfilled, (state, action) => {
        const { serviceId, qvrId } = action.payload;
        for (const plan of state.plans) {
          const svc = plan.services?.find((s) => s.id === serviceId);
          if (!svc) continue;
          if (svc.sittings) {
            svc.sittings = svc.sittings.filter((s) => s.id !== qvrId);
          }
          if (svc.quickVisitRecords) {
            svc.quickVisitRecords = svc.quickVisitRecords.filter((q) => q.id !== qvrId);
          }
          break;
        }
      });
  },
});

export const {
  setCurrentPlan,
  clearPlanError,
  setSessionPendingServices,
  clearSessionPendingServices,
} = dentalPlanSlice.actions;
export default dentalPlanSlice.reducer;

export const selectDentalPlan         = (state) => state.dentalPlan;
export const selectDentalPlans        = (state) => state.dentalPlan.plans;
export const selectDentalPlansLoading = (state) => state.dentalPlan.loading;
export const selectDentalPlansError   = (state) => state.dentalPlan.error;
export const selectCurrentDentalPlan  = (state) => state.dentalPlan.currentPlan;
export const selectSessionPendingServices = (state) =>
  state.dentalPlan.sessionPendingServices;
