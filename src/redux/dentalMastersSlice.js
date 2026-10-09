import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getSurfaces,
  getDiagnoses,
  getProcedures,
  getToothMap,
  fetchDentalBillItems,
} from "../api/services/ApiDental";
import { getOralAreas } from "../api/services/ApiOral";
import { DIAGNOSES, PROCEDURE_CATALOG, ALL_ZONES, normalizeProcedureCatalogItems, getProcedureLabel } from "../components/dental/examination/types";
import { mapApiBillItemToDentalCatalog } from "../components/dental/lib/billing-catalog";
import { getDentalApiPayload } from "../utils/dentalApiMappers";
import { buildVisualTypeMap } from "../utils/dentalVisualTypes";

const initialState = {
  surfaces: [],
  diagnoses: [],
  surfaceFindings: [],
  procedures: [],
  procedureItems: [],
  toothMapAdult: null,
  toothMapPediatric: null,
  oralAreaItems: [],
  visualTypeMap: null,
  billingItems: [],
  billingItemsLoaded: false,
  billingItemsLoading: false,
  fetchedAt: null,
  loading: false,
  error: null,
  oralDiagnoses: [],
  oralSurfaceFindings: [],
  oralProcedures: [],
  oralProcedureItems: [],
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
        oralDiagnosesRes,
        oralProceduresRes,
        toothMapAdultRes,
        toothMapPediatricRes,
        oralAreasRes,
      ] = await Promise.all([
        getSurfaces(),
        getDiagnoses("dental"),
        getProcedures("dental"),
        getDiagnoses("oral"),
        getProcedures("oral"),
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

      const oralDiagnosesPayload = getDentalApiPayload(oralDiagnosesRes);
      const rawOralSurfaceFindings = Array.isArray(oralDiagnosesPayload?.surface_findings)
        ? oralDiagnosesPayload.surface_findings
        : [];
      const rawOralDiagnoses = Array.isArray(oralDiagnosesPayload?.tooth_diagnoses)
        ? oralDiagnosesPayload.tooth_diagnoses
        : Array.isArray(oralDiagnosesPayload?.items)
          ? oralDiagnosesPayload.items
          : Array.isArray(oralDiagnosesPayload)
            ? oralDiagnosesPayload
            : [];
      const rawProcedures = getDentalApiPayload(proceduresRes)?.items || getDentalApiPayload(proceduresRes) || [];
      const procedureItems = normalizeProcedureCatalogItems(
        Array.isArray(rawProcedures) ? rawProcedures : [],
        PROCEDURE_CATALOG,
      );
      const rawOralProcedures =
        getDentalApiPayload(oralProceduresRes)?.items ||
        getDentalApiPayload(oralProceduresRes) ||
        [];
      const oralProcedureItems = normalizeProcedureCatalogItems(
        Array.isArray(rawOralProcedures) ? rawOralProcedures : [],
        [],
      );
      return {
        surfaces: normalize(getDentalApiPayload(surfacesRes)?.items || getDentalApiPayload(surfacesRes), ALL_ZONES),
        rawDiagnosesMeta: [...rawToothDiagnoses, ...(Array.isArray(rawProcedures) ? rawProcedures : [])],
        diagnoses: normalize(rawToothDiagnoses, []),
        surfaceFindings: normalize(rawSurfaceFindings, DIAGNOSES),
        procedures: procedureItems.map(getProcedureLabel),
        procedureItems,
        toothMapAdult: getDentalApiPayload(toothMapAdultRes) || null,
        toothMapPediatric: getDentalApiPayload(toothMapPediatricRes) || null,
        oralAreaItems: getDentalApiPayload(oralAreasRes)?.items || [],
        oralDiagnoses: normalize(rawOralDiagnoses, []),
        oralSurfaceFindings: normalize(rawOralSurfaceFindings, []),
        oralProcedures: oralProcedureItems.map(getProcedureLabel),
        oralProcedureItems,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const loadDentalBillItems = createAsyncThunk(
  "dentalMasters/loadBillItems",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchDentalBillItems(1, 100);
      const raw = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return raw.map(mapApiBillItemToDentalCatalog).filter(Boolean);
    } catch (err) {
      return rejectWithValue(err?.message ?? "Failed to load dental bill items");
    }
  },
  {
    condition: (_, { getState }) => {
      const { billingItemsLoaded, billingItemsLoading } = getState().dentalMasters;
      return !billingItemsLoaded && !billingItemsLoading;
    },
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
        state.procedureItems = action.payload.procedureItems;
        state.toothMapAdult = action.payload.toothMapAdult;
        state.toothMapPediatric = action.payload.toothMapPediatric;
        state.oralAreaItems = action.payload.oralAreaItems;
        state.oralDiagnoses = action.payload.oralDiagnoses;
        state.oralSurfaceFindings = action.payload.oralSurfaceFindings;
        state.oralProcedures = action.payload.oralProcedures;
        state.oralProcedureItems = action.payload.oralProcedureItems || [];
        state.visualTypeMap = buildVisualTypeMap(action.payload.rawDiagnosesMeta);
        state.fetchedAt = Date.now();
      })
      .addCase(fetchAllDentalMasters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadDentalBillItems.pending, (state) => {
        state.billingItemsLoading = true;
      })
      .addCase(loadDentalBillItems.fulfilled, (state, action) => {
        state.billingItems = action.payload;
        state.billingItemsLoaded = true;
        state.billingItemsLoading = false;
      })
      .addCase(loadDentalBillItems.rejected, (state) => {
        state.billingItemsLoading = false;
      });
  },
});

export const { setDentalBillingItems, addDentalBillingItem } = dentalMastersSlice.actions;
export const selectDentalMasters = (state) => state.dentalMasters;
export const selectDentalBillingItems = (state) => state.dentalMasters.billingItems;
export const selectDentalBillingItemsLoaded = (state) => state.dentalMasters.billingItemsLoaded;
export const selectVisualTypeMap = (state) => state.dentalMasters.visualTypeMap;
export default dentalMastersSlice.reducer;
