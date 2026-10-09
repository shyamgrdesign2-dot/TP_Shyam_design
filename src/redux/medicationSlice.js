import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiMedication from "../api/services/ApiMedication";
import { MEDICINE_STOCK_STATUS } from "../utils/constants";
import { convertGenxMedicationSearchResults } from "../utils/genxMedicationUtils";

const mergeInventoryData = (searchResults, invRows) => {
  const invByRef = new Map(
    invRows.map((row) => [String(row.referenceId), row])
  );

  return searchResults.map((item) => {
    const rid = String(item?.reference_id ?? "");
    const inv = invByRef.get(rid);

    return {
      ...item,
      quantity: Number(inv?.quantity ?? 0),
      stock_status: inv?.stock_status ?? MEDICINE_STOCK_STATUS.NO_STOCK,
    };
  });
};

const withEmptyInventory = (searchResults) =>
  searchResults.map((item) => ({
    ...item,
    quantity: 0,
    stock_status: MEDICINE_STOCK_STATUS.NO_STOCK,
  }));

const initialState = {
  selectedMedicationList: [],
  parentOptionsList: [],
  childOptionsList: [],
  templates: [],
  loading: false,
  error: null,
  genericList: [],
  dosesList: [],
  medicineDetailsById: {}
};

export const addTemplate = createAsyncThunk(
  "medication/addTemplate",
  async (template) => {
    let result = {};
    result = await ApiMedication.addTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const updateTemplate = createAsyncThunk(
  "medication/updateTemplate",
  async (template) => {
    const result = await ApiMedication.updateTemplate(template);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "medication/deleteTemplate",
  async (templateId) => {
    const result = await ApiMedication.deleteTemplate(templateId);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getMedicationTemplates = createAsyncThunk(
  "medication/getMedicationTemplates",
  async () => {
    let result = {};
    result = await ApiMedication.getMedicationTemplates();
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const singleTemplateDetails = createAsyncThunk(
  "medication/singleTemplateDetails",
  async ({ templateId, tmtd_id, isChikitsalayAccessable = false } = {}) => {
    const resolvedTemplateId = templateId ?? tmtd_id;
    if (
      resolvedTemplateId === undefined ||
      resolvedTemplateId === null ||
      resolvedTemplateId === ""
    ) {
      throw new Error(
        "singleTemplateDetails requires templateId in the request payload."
      );
    }

    const result = await ApiMedication.singleTemplateDetails(resolvedTemplateId, {
      mergeInventory: !!isChikitsalayAccessable,
    });

    if (result.status) {
      return result.data;
    }

    throw Error(result.error);
  }
);

export const getMedicineDetails = createAsyncThunk(
  "medication/getMedicineDetails",
  async (query) => {
    let result = {};
    result = await ApiMedication.getMedicineDetails(query);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getFrequentlySearchedMedication = createAsyncThunk(
  "medication/getFrequentlySearchedMedication",
  async (data) => {
    let result = {};
    result = await ApiMedication.getFrequentlySearchedMedication({
      isChikitsalayAccessable: data?.isChikitsalayAccessable,
    });
    if (result.status) {
      const searchResults = Array.isArray(result.data) ? result.data : [];

      // Inventory is a Chikitsalay-only feature
      if (!data?.isChikitsalayAccessable) {
        return searchResults;
      }

      const referenceIds = searchResults
        .map((item) => item?.reference_id)
        .filter((id) => id !== undefined && id !== null && String(id).trim() !== "")
        .map((id) => String(id));

      if (referenceIds.length === 0) {
        return withEmptyInventory(searchResults);
      }

      try {
        const inv = await ApiMedication.getEvitalsInventory(referenceIds);
        const invRows = Array.isArray(inv)
          ? inv
          : inv?.status && Array.isArray(inv.data)
            ? inv.data
            : Array.isArray(inv?.data)
              ? inv.data
              : [];
        return mergeInventoryData(searchResults, invRows);
      } catch (e) {
        return withEmptyInventory(searchResults);
      }
    } else {
      throw Error(result.error);
    }
  }
);

export const searchMedication = createAsyncThunk(
  "medication/searchMedication",
  async (data) => {
    let result = {};
    result = await ApiMedication.searchMedication(data.searchQuery, {
      isChikitsalayAccessable: data?.isChikitsalayAccessable,
    });
    if (result.status) {
      const searchResults = Array.isArray(result.data) ? result.data : [];

      // Inventory is a Chikitsalay-only feature
      if (!data?.isChikitsalayAccessable) {
        return searchResults;
      }

      const referenceIds = searchResults
        .map((item) => item?.reference_id)
        .filter((id) => id !== undefined && id !== null && String(id).trim() !== "")
        .map((id) => String(id));

      if (referenceIds.length === 0) {
        return withEmptyInventory(searchResults);
      }

      try {
        const inv = await ApiMedication.getEvitalsInventory(referenceIds);
        const invRows = Array.isArray(inv)
          ? inv
          : inv?.status && Array.isArray(inv.data)
            ? inv.data
            : Array.isArray(inv?.data)
              ? inv.data
              : [];
        return mergeInventoryData(searchResults, invRows);
      } catch (e) {
        return withEmptyInventory(searchResults);
      }
    } else {
      throw Error(result.error);
    }
  }
);

export const fetchGenxAccessToken = createAsyncThunk(
  "medication/fetchGenxAccessToken",
  async () => {
    return ApiMedication.getGenxAccessToken();
  }
);

export const searchGenxMedication = createAsyncThunk(
  "medication/searchGenxMedication",
  async (data) => {
    const result = await ApiMedication.searchGenxMedication(data.searchQuery);
    return convertGenxMedicationSearchResults(result);
  }
);

export const getLoadPreviousRx = createAsyncThunk(
  "medication/getLoadPreviousRx",
  async (data) => {
    const { isChikitsalayAccessable, ...requestData } = data ?? {};

    const result = await ApiMedication.getLoadPreviousRx(requestData, {
      mergeInventory: !!isChikitsalayAccessable,
    });

    if (result.status) {
      return result.data;
    }

    throw Error(result.error);
  }
);

export const searchGeneric = createAsyncThunk(
  "medication/searchGeneric",
  async (query) => {
    let result = {};
    result = await ApiMedication.searchGeneric(query);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const addMedicine = createAsyncThunk(
  "medication/addMedicine",
  async (data) => {
    let result = {};
    result = await ApiMedication.addMedicine(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const editMedicine = createAsyncThunk(
  "medication/editMedicine",
  async (data) => {
    let result = {};
    result = await ApiMedication.editMedicine(data);
    if (result.status) {
      return result.data;
    } else {
      throw Error(result.error);
    }
  }
);

export const getAllDoses = createAsyncThunk(
  "medication/getAllDoses",
  async () => {
    const result = await ApiMedication.getAllDoses();
    return result;
  }
);

export const createDose = createAsyncThunk(
  "medication/createDose",
  async (data) => {
    const result = await ApiMedication.createDose(data);
    return result;
  }
);

export const updateDose = createAsyncThunk(
  "medication/updateDose",
  async (data) => {
    const result = await ApiMedication.updateDose(data);
    if (result.status === 204) {
      return true;
    } else {
      throw Error(result.error);
    }
  }
);

export const deleteDose = createAsyncThunk(
  "medication/deleteDose",
  async (id) => {
    const result = await ApiMedication.deleteDose(id);
    if (result.status === 204) {
      return true;
    } else {
      throw Error(result.error);
    }
  }
);

const medicationSlice = createSlice({
  name: "medication",
  initialState,
  reducers: {
    updateFrequentlyMedication: (state, action) => {
      const modifyData = action.payload
      const updatedData = state.parentOptionsList.map((item) => {
        if (item?.tmm_id == modifyData.tmm_id) {
          item.tmm_medicine_name = modifyData.tmm_medicine_name;
          item.tmm_generic = modifyData.tmm_generic;
        }
        return item;
      });
      state.parentOptionsList = [...updatedData]
    },
    clearGenericList: (state, action) => {
      state.genericList = []
    },
    clearMedicationOptions: (state) => {
      state.parentOptionsList = [];
      state.childOptionsList = [];
    },
    clearMedicineDetailsCache: (state) => {
      state.medicineDetailsById = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMedicationList = action.payload.medication;
        const medication = {
          tmtd_id: action.payload.tmtd_id,
          tmtd_tmm_id: action.payload.data.map(e => e.tmm_id).toString(),
          tmtd_tmr_type: action.payload.data.map(e => e.tcm_tmr_type).toString(),
          tmtd_template_name: action.payload.tmtd_template_name,
          pms_default: 0,
          medicine_name: action.payload.data.map(e => e.tmm_medicine_name).toString()
        }
        state.templates.unshift(medication);
      })
      .addCase(addTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(updateTemplate.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMedicationList = action.payload.medication;
        const medication = {
          tmtd_id: action.payload.tmtd_id,
          tmtd_tmm_id: action.payload.data.map(e => e.tmm_id).toString(),
          tmtd_tmr_type: action.payload.data.map(e => e.tcm_tmr_type).toString(),
          tmtd_template_name: action.payload.tmtd_template_name,
          pms_default: 0,
          medicine_name: action.payload.data.map(e => e.tmm_medicine_name).toString()
        }
        const index = state.templates.findIndex(
          (e) => e.tmtd_id == action.payload.tmtd_id
        );
        if (index !== -1) {
          state.templates[index] = medication;
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.loading = false;
      })
      .addCase(deleteTemplate.pending, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tmtd_id == action.meta.arg ? { ...e, loading: true } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        const result = state.templates.filter(
          (item) => item.tmtd_id !== action.payload.tmtd_id
        );
        state.templates = [...result];
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        const updatedData = state.templates.map((e) =>
          e.tmtd_id == action.meta.arg ? { ...e, loading: false } : e
        );
        state.templates = [...updatedData];
      })
      .addCase(getMedicationTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(getMedicationTemplates.rejected, (state, action) => {
        state.templates = [];
      })
      .addCase(getFrequentlySearchedMedication.fulfilled, (state, action) => {
        state.parentOptionsList = action.payload;
      })
      .addCase(getFrequentlySearchedMedication.rejected, (state, action) => {
        state.parentOptionsList = [];
      })
      .addCase(searchMedication.pending, (state) => { })
      .addCase(searchMedication.fulfilled, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = action.payload;
        } else {
          state.childOptionsList = action.payload;
        }
      })
      .addCase(searchMedication.rejected, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = [];
        } else {
          state.childOptionsList = [];
        }
      })
      .addCase(fetchGenxAccessToken.rejected, () => { })
      .addCase(searchGenxMedication.fulfilled, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = action.payload;
        } else {
          state.childOptionsList = action.payload;
        }
      })
      .addCase(searchGenxMedication.rejected, (state, action) => {
        if (action.meta.arg.type == "parent") {
          state.parentOptionsList = [];
        } else {
          state.childOptionsList = [];
        }
      })
      .addCase(getMedicineDetails.fulfilled, (state, action) => {
        const rows = Array.isArray(action.payload) ? action.payload : action.payload ? [action.payload] : [];
        rows.forEach((medicine) => {
          const medicineId = medicine?.tmm_id;
          if (medicineId !== undefined && medicineId !== null && String(medicineId).trim() !== "") {
            state.medicineDetailsById[String(medicineId)] = medicine;
          }
        });
      })
      .addCase(searchGeneric.pending, (state) => { })
      .addCase(searchGeneric.fulfilled, (state, action) => {
        state.genericList = action.payload;
      })
      .addCase(searchGeneric.rejected, (state, action) => {
        state.genericList = [];
      })
      .addCase(addMedicine.pending, (state) => {
        state.loading = true
      })
      .addCase(addMedicine.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(addMedicine.rejected, (state) => {
        state.loading = false
      })
      .addCase(editMedicine.pending, (state) => {
        state.loading = true
      })
      .addCase(editMedicine.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(editMedicine.rejected, (state) => {
        state.loading = false
      })
      .addCase(getAllDoses.fulfilled, (state, action) => {
        state.dosesList = action.payload
      })
      .addCase(createDose.fulfilled, (state, action) => {
        state.dosesList = [...state.dosesList, ...action.payload]
      })
      .addCase(updateDose.fulfilled, (state, action) => {
        const data = action.meta.arg
        state.dosesList = state.dosesList.map((row) => row.id === data?.id ? { ...row, ...data } : row)
      })
      .addCase(deleteDose.fulfilled, (state, action) => {
        const id = action.meta.arg
        state.dosesList = state.dosesList.filter((e) => e.id !== id)
      })
  },
});

export const { updateFrequentlyMedication, clearGenericList, clearMedicationOptions, clearMedicineDetailsCache } = medicationSlice.actions
export default medicationSlice.reducer;
