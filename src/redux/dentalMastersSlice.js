import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getSurfaces,
  getDiagnoses,
  getProcedures,
  getToothMap,
} from "../api/services/ApiDental";
import { getOralAreas } from "../api/services/ApiOral";
import { DIAGNOSES, PROCEDURE_CATALOG, ALL_ZONES } from "../components/dental/examination/types";
import { buildInitialDentalBillingItems } from "../utils/dentalBillingCatalog";
import { getDentalApiPayload } from "../utils/dentalApiMappers";

const initialState = {
  surfaces: [],
  diagnoses: [],
  surfaceFindings: [],
  procedures: [],
  toothMapAdult: null,
  toothMapPediatric: null,
  oralAreaItems: [],
  billingItems: buildInitialDentalBillingItems(),
  loading: false,
  error: null,
};

// Helper to normalize API data with fallbacks
const normalize = (apiArr, fallbackArr, key = null) => {
  if (!apiArr || apiArr.length === 0) return fallbackArr;
  return apiArr.map(item => {
    if (typeof item !== 'object') return item;
    if (key) return item[key] || item.code || item.name || item.id;
    return item.code || item.name || item.id;
  });
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
        oralAreasRes,
      ] = await Promise.all([
        getSurfaces(),
        getDiagnoses(),
        getProcedures(),
        getToothMap("adult"),
        getToothMap("pediatric"),
        getOralAreas(),
      ]);

      const diagnosesPayload = getDentalApiPayload(diagnosesRes);
      const rawSurfaceFindings = Array.isArray(diagnosesPayload?.surface_findings)
        ? diagnosesPayload.surface_findings
        : [];
      const rawToothDiagnoses = Array.isArray(diagnosesPayload?.tooth_diagnoses)
        ? diagnosesPayload.tooth_diagnoses
        : Array.isArray(diagnosesPayload?.items)
          ? diagnosesPayload.items
          : Array.isArray(diagnosesPayload)
            ? diagnosesPayload
            : [];
      return {
        surfaces: normalize(getDentalApiPayload(surfacesRes)?.items || getDentalApiPayload(surfacesRes), ALL_ZONES),
        diagnoses: normalize(rawToothDiagnoses, []),
        surfaceFindings: normalize(rawSurfaceFindings, DIAGNOSES),
        procedures: normalize(getDentalApiPayload(proceduresRes)?.items || getDentalApiPayload(proceduresRes), PROCEDURE_CATALOG, 'label'),
        toothMapAdult: getDentalApiPayload(toothMapAdultRes) || null,
        toothMapPediatric: getDentalApiPayload(toothMapPediatricRes) || null,
        oralAreaItems: getDentalApiPayload(oralAreasRes)?.items || [],
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const dentalMastersSlice = createSlice({
  name: "dentalMasters",
  initialState,
  reducers: {
    setDentalBillingItems: (state, action) => {
      state.billingItems = Array.isArray(action.payload) ? action.payload : [];
    },
    addDentalBillingItem: (state, action) => {
      if (!action.payload) return;
      state.billingItems.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllDentalMasters.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllDentalMasters.fulfilled, (state, action) => {
        state.loading = false;
        state.surfaces = action.payload.surfaces;
        state.diagnoses = action.payload.diagnoses;
        state.surfaceFindings = action.payload.surfaceFindings;
        state.procedures = action.payload.procedures;
        state.toothMapAdult = action.payload.toothMapAdult;
        state.toothMapPediatric = action.payload.toothMapPediatric;
        state.oralAreaItems = action.payload.oralAreaItems;
      })
      .addCase(fetchAllDentalMasters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setDentalBillingItems, addDentalBillingItem } = dentalMastersSlice.actions;
export const selectDentalMasters = (state) => state.dentalMasters;
export const selectDentalBillingItems = (state) => state.dentalMasters.billingItems;
export default dentalMastersSlice.reducer;
