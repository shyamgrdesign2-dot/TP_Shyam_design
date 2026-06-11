import { transformToothStateToApi } from "../../components/dental/lib/examination-helpers";

describe("transformToothStateToApi", () => {
  it("returns empty array for empty toothState", () => {
    expect(transformToothStateToApi({})).toEqual([]);
  });

  it("maps a single tooth with a finding", () => {
    const toothState = {
      "21": {
        findings: [{ type: "Cavity/Caries", zoneId: "labial", id: "f1" }],
        entryFindings: [],
        procedures: [],
        diagnoses: [],
        treatmentHistory: [],
        notes: "",
      },
    };
    const result = transformToothStateToApi(toothState);
    expect(result).toHaveLength(1);
    expect(result[0].tooth_code).toBe("21");
    expect(result[0].findings).toHaveLength(1);
    expect(result[0].findings[0].name).toBe("Cavity/Caries");
    expect(result[0].findings[0].surface_codes).toEqual(["labial"]);
  });

  it("maps procedures with PLANNED status", () => {
    const toothState = {
      "21": {
        findings: [],
        entryFindings: [],
        procedures: [{ name: "Composite restoration", surfaces: ["labial"], status: "planned", id: "p1" }],
        diagnoses: [],
        treatmentHistory: [],
        notes: "",
      },
    };
    const result = transformToothStateToApi(toothState);
    expect(result[0].procedures[0].name).toBe("Composite restoration");
    expect(result[0].procedures[0].status).toBe("PLANNED");
    expect(result[0].procedures[0].surface_codes).toEqual(["labial"]);
  });

  it("serializes diagnoses as treatment_history with DX_MARKER", () => {
    const toothState = {
      "21": {
        findings: [],
        entryFindings: [],
        procedures: [],
        diagnoses: ["RCT"],
        treatmentHistory: [],
        notes: "",
      },
    };
    const result = transformToothStateToApi(toothState);
    const histEntry = result[0].treatment_history.find((h) => h.name === "RCT");
    expect(histEntry).toBeDefined();
    expect(histEntry.notes).toBe("__dx__");
  });

  it("assigns correct quadrant code for adult teeth", () => {
    const mkTooth = (fdi) => ({
      [fdi]: { findings: [], entryFindings: [], procedures: [], diagnoses: [], treatmentHistory: [], notes: "" },
    });
    expect(transformToothStateToApi(mkTooth("11"))[0].quadrant).toBe("UR");
    expect(transformToothStateToApi(mkTooth("21"))[0].quadrant).toBe("UL");
    expect(transformToothStateToApi(mkTooth("31"))[0].quadrant).toBe("LL");
    expect(transformToothStateToApi(mkTooth("41"))[0].quadrant).toBe("LR");
  });

  it("deduplicates findings by id", () => {
    const toothState = {
      "21": {
        findings: [{ type: "Cavity/Caries", zoneId: "labial", id: "f1" }],
        entryFindings: [{ name: "Cavity/Caries", surfaces: ["labial"], id: "f1" }],
        procedures: [],
        diagnoses: [],
        treatmentHistory: [],
        notes: "",
      },
    };
    const result = transformToothStateToApi(toothState);
    expect(result[0].findings).toHaveLength(1);
  });

  it("handles multi-surface selection", () => {
    const toothState = {
      "21": {
        findings: [],
        entryFindings: [{ name: "Cavity/Caries", surfaces: ["labial", "mesial"], id: "f1" }],
        procedures: [],
        diagnoses: [],
        treatmentHistory: [],
        notes: "",
      },
    };
    const result = transformToothStateToApi(toothState);
    expect(result[0].findings[0].surface_codes).toEqual(["labial", "mesial"]);
  });

  it("falls back to whole-tooth when surfaces is empty", () => {
    const toothState = {
      "21": {
        findings: [],
        entryFindings: [{ name: "Cavity/Caries", surfaces: [], id: "f1" }],
        procedures: [],
        diagnoses: [],
        treatmentHistory: [],
        notes: "",
      },
    };
    const result = transformToothStateToApi(toothState);
    expect(result[0].findings[0].surface_codes).toEqual(["whole"]);
  });

  it("stores overall_notes correctly", () => {
    const toothState = {
      "21": {
        findings: [],
        entryFindings: [],
        procedures: [],
        diagnoses: [],
        treatmentHistory: [],
        notes: "Watch this tooth",
      },
    };
    const result = transformToothStateToApi(toothState);
    expect(result[0].overall_notes).toBe("Watch this tooth");
  });

  it("handles object-style treatmentHistory", () => {
    const toothState = {
      "21": {
        findings: [],
        entryFindings: [],
        procedures: [],
        diagnoses: [],
        treatmentHistory: { RCT: { surfaces: ["whole"], since: "1 week", note: "completed" } },
        notes: "",
      },
    };
    const result = transformToothStateToApi(toothState);
    const hist = result[0].treatment_history.find((h) => h.name === "RCT" && h.notes === "completed");
    expect(hist).toBeDefined();
  });
});
