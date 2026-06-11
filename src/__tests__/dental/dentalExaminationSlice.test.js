import dentalExaminationReducer, {
  updateToothData,
  syncWholeState,
  clearDentalChart,
  resetDentalError,
  fetchDentalExamination,
  saveDentalExamination,
} from "../../redux/dentalExaminationSlice";

// Mock the API service to avoid ESM axios import issues.
// Jest hoists jest.mock() calls, so this runs before the module imports above.
jest.mock("../../api/services/ApiDental", () => ({
  getExamination: jest.fn(),
  updateExaminationFull: jest.fn(),
}));

const initialState = {
  toothState: {},
  version: 0,
  loading: false,
  saving: false,
  error: null,
  lastSaved: null,
  dentitionType: "adult",
};

describe("dentalExaminationSlice reducers", () => {
  it("returns initial state", () => {
    expect(dentalExaminationReducer(undefined, { type: "@@INIT" })).toEqual(initialState);
  });

  describe("updateToothData", () => {
    it("merges data into existing tooth", () => {
      const state = { ...initialState, toothState: { "21": { notes: "old" } } };
      const next = dentalExaminationReducer(state, updateToothData({ toothId: "21", data: { notes: "new" } }));
      expect(next.toothState["21"].notes).toBe("new");
    });

    it("creates tooth entry when absent", () => {
      const next = dentalExaminationReducer(initialState, updateToothData({ toothId: "21", data: { notes: "hello" } }));
      expect(next.toothState["21"]).toBeDefined();
      expect(next.toothState["21"].notes).toBe("hello");
    });
  });

  describe("syncWholeState", () => {
    it("replaces toothState and dentitionType", () => {
      const newTeeth = { "21": { notes: "x" } };
      const next = dentalExaminationReducer(initialState, syncWholeState({ toothState: newTeeth, dentitionType: "pediatric" }));
      expect(next.toothState).toEqual(newTeeth);
      expect(next.dentitionType).toBe("pediatric");
    });

    it("keeps existing dentitionType when not provided", () => {
      const state = { ...initialState, dentitionType: "mixed" };
      const next = dentalExaminationReducer(state, syncWholeState({ toothState: {} }));
      expect(next.dentitionType).toBe("mixed");
    });
  });

  describe("clearDentalChart", () => {
    it("resets toothState and version to zero", () => {
      const state = { ...initialState, toothState: { "21": { notes: "x" } }, version: 5 };
      const next = dentalExaminationReducer(state, clearDentalChart());
      expect(next.toothState).toEqual({});
      expect(next.version).toBe(0);
    });
  });

  describe("resetDentalError", () => {
    it("clears error field", () => {
      const state = { ...initialState, error: "some error" };
      const next = dentalExaminationReducer(state, resetDentalError());
      expect(next.error).toBeNull();
    });
  });
});

describe("dentalExaminationSlice async thunks (extraReducers)", () => {
  describe("fetchDentalExamination", () => {
    it("sets loading=true on pending", () => {
      const next = dentalExaminationReducer(initialState, { type: fetchDentalExamination.pending.type });
      expect(next.loading).toBe(true);
      expect(next.error).toBeNull();
      expect(next.version).toBe(0);
    });

    it("populates toothState and version on fulfilled", () => {
      const payload = {
        dentition_type: "adult",
        version: 3,
        tooth_states: [
          { tooth_code: "21", findings: [], procedures: [], treatment_history: [], overall_notes: "" },
        ],
      };
      const next = dentalExaminationReducer(initialState, { type: fetchDentalExamination.fulfilled.type, payload });
      expect(next.loading).toBe(false);
      expect(next.version).toBe(3);
      expect(next.dentitionType).toBe("adult");
      expect(next.toothState["21"]).toBeDefined();
    });

    it("sets error on rejected and clears loading", () => {
      const next = dentalExaminationReducer(initialState, {
        type: fetchDentalExamination.rejected.type,
        payload: "Network error",
      });
      expect(next.loading).toBe(false);
      expect(next.error).toBe("Network error");
    });
  });

  describe("saveDentalExamination", () => {
    it("sets saving=true on pending", () => {
      const next = dentalExaminationReducer(initialState, { type: saveDentalExamination.pending.type });
      expect(next.saving).toBe(true);
    });

    it("clears saving and updates version on fulfilled", () => {
      const state = { ...initialState, saving: true, version: 1 };
      const payload = { version: 2 };
      const next = dentalExaminationReducer(state, { type: saveDentalExamination.fulfilled.type, payload });
      expect(next.saving).toBe(false);
      expect(next.version).toBe(2);
      expect(next.lastSaved).not.toBeNull();
    });

    it("retains existing version when payload has no version", () => {
      const state = { ...initialState, saving: true, version: 5 };
      const next = dentalExaminationReducer(state, { type: saveDentalExamination.fulfilled.type, payload: {} });
      expect(next.version).toBe(5);
    });

    it("sets error on rejected", () => {
      const next = dentalExaminationReducer(initialState, {
        type: saveDentalExamination.rejected.type,
        payload: "Save failed",
      });
      expect(next.saving).toBe(false);
      expect(next.error).toBe("Save failed");
    });
  });
});
