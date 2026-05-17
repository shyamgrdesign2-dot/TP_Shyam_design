import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getSurfaces,
  getDiagnoses,
  getProcedures,
  getToothMap,
  getBillingItems,
} from "../api/services/ApiDental";
import { DIAGNOSES, PROCEDURE_CATALOG, ALL_ZONES } from "../components/dental/examination/types";
import { getDentalApiPayload } from "../utils/dentalApiMappers";

const initialState = {
  surfaces: [],
  diagnoses: [],
  procedures: [],
  toothMapAdult: null,
  toothMapPediatric: null,
  billingItems: [],
  loading: false,
  error: null,
};

// Helper to normalize API data with fallbacks
const normalize = (apiArr, fallbackArr) => {
  if (!apiArr || apiArr.length === 0) return fallbackArr;
  return apiArr.map(item => (typeof item === 'object' ? (item.code || item.name || item.id) : item));
};

export const fetchAllDentalMasters = createAsyncThunk(
  "dentalMasters/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const [
        surfacesRes,
        diagnosesRes,
        proceduresRes,
        toothMapAdultRes,
        toothMapPediatricRes,
        billingItemsRes,
      ] = await Promise.all([
        getSurfaces(),
        getDiagnoses(),
        getProcedures(),
        getToothMap("adult"),
        getToothMap("pediatric"),
        getBillingItems(),
      ]);

      return {
        surfaces: normalize(getDentalApiPayload(surfacesRes)?.items || getDentalApiPayload(surfacesRes), ALL_ZONES),
        diagnoses: normalize(getDentalApiPayload(diagnosesRes)?.items || getDentalApiPayload(diagnosesRes), DIAGNOSES),
        procedures: normalize(getDentalApiPayload(proceduresRes)?.items || getDentalApiPayload(proceduresRes), PROCEDURE_CATALOG),
        toothMapAdult: getDentalApiPayload(toothMapAdultRes) || null,
        toothMapPediatric: getDentalApiPayload(toothMapPediatricRes) || null,
        billingItems: getDentalApiPayload(billingItemsRes)?.items || getDentalApiPayload(billingItemsRes) || [],
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const dentalMastersSlice = createSlice({
  name: "dentalMasters",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllDentalMasters.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllDentalMasters.fulfilled, (state, action) => {
        state.loading = false;
        state.surfaces = action.payload.surfaces;
        state.diagnoses = action.payload.diagnoses;
        state.procedures = action.payload.procedures;
        state.toothMapAdult = action.payload.toothMapAdult;
        state.toothMapPediatric = action.payload.toothMapPediatric;
        state.billingItems = action.payload.billingItems;
      })
      .addCase(fetchAllDentalMasters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default dentalMastersSlice.reducer;
