import { toDentalToothState, getDentalApiPayload, getDentalApiError, DX_MARKER } from "../../utils/dentalApiMappers";

describe("getDentalApiPayload", () => {
  it("returns data when response has status boolean and data field", () => {
    const resp = { status: true, data: { version: 1 } };
    expect(getDentalApiPayload(resp)).toEqual({ version: 1 });
  });

  it("returns response directly when no status field", () => {
    const resp = { version: 2 };
    expect(getDentalApiPayload(resp)).toEqual({ version: 2 });
  });

  it("returns null for null input", () => {
    expect(getDentalApiPayload(null)).toBeNull();
  });
});

describe("getDentalApiError", () => {
  it("returns error field when present", () => {
    expect(getDentalApiError({ error: "Not found" }, "default")).toBe("Not found");
  });

  it("returns message field when error absent", () => {
    expect(getDentalApiError({ message: "Server error" }, "default")).toBe("Server error");
  });

  it("returns fallback when neither error nor message present", () => {
    expect(getDentalApiError({}, "default")).toBe("default");
  });
});

describe("DX_MARKER", () => {
  it("is the string __dx__", () => {
    expect(DX_MARKER).toBe("__dx__");
  });
});

describe("toDentalToothState", () => {
  it("returns empty object for empty payload", () => {
    expect(toDentalToothState({})).toEqual({});
    expect(toDentalToothState({ tooth_states: [] })).toEqual({});
  });

  it("maps tooth findings from API shape", () => {
    const payload = {
      tooth_states: [
        {
          tooth_code: "21",
          findings: [{ id: "f1", name: "Cavity/Caries", surface_codes: ["labial"], notes: "" }],
          procedures: [],
          treatment_history: [],
          overall_notes: "",
        },
      ],
    };
    const result = toDentalToothState(payload);
    expect(result["21"]).toBeDefined();
    expect(result["21"].findings[0].type).toBe("Cavity/Caries");
    expect(result["21"].findings[0].zoneId).toBe("labial");
  });

  it("splits treatment_history on DX_MARKER into diagnoses", () => {
    const payload = {
      tooth_states: [
        {
          tooth_code: "21",
          findings: [],
          procedures: [],
          treatment_history: [
            { name: "RCT", surface_codes: ["whole"], notes: DX_MARKER },
            { name: "Crown", surface_codes: ["whole"], notes: "Placed 2024" },
          ],
          overall_notes: "",
        },
      ],
    };
    const result = toDentalToothState(payload);
    expect(result["21"].diagnoses).toContain("RCT");
    expect(result["21"].diagnoses).not.toContain("Crown");
    expect(result["21"].treatmentHistory[0].name).toBe("Crown");
  });

  it("maps procedure status from API", () => {
    const payload = {
      tooth_states: [
        {
          tooth_code: "21",
          findings: [],
          procedures: [{ id: "p1", name: "Composite restoration", surface_codes: ["labial"], status: "PLANNED", notes: "" }],
          treatment_history: [],
          overall_notes: "",
        },
      ],
    };
    const result = toDentalToothState(payload);
    expect(result["21"].procedures[0].status).toBe("planned");
  });

  it("uses overall_notes as notes", () => {
    const payload = {
      tooth_states: [
        {
          tooth_code: "21",
          findings: [],
          procedures: [],
          treatment_history: [],
          overall_notes: "Watch this tooth carefully",
        },
      ],
    };
    const result = toDentalToothState(payload);
    expect(result["21"].notes).toBe("Watch this tooth carefully");
  });

  it("skips teeth without tooth_code", () => {
    const payload = {
      tooth_states: [
        { tooth_code: "", findings: [], procedures: [], treatment_history: [], overall_notes: "" },
      ],
    };
    expect(toDentalToothState(payload)).toEqual({});
  });
});
