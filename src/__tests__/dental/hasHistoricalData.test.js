import { hasHistoricalData } from "../../components/dental/examination/DentalChartPrint";

const PATIENT_ID = "test-patient-1";
const LS_KEY = `dental.exam.chart.${PATIENT_ID}`;

beforeEach(() => {
  window.localStorage.clear();
});

describe("hasHistoricalData", () => {
  it("returns false when no localStorage entry exists", () => {
    expect(hasHistoricalData(PATIENT_ID)).toBe(false);
  });

  it("returns false when all sections are empty", () => {
    const empty = {
      entries: [],
      oralEntries: [],
      oralNotes: "",
      toothDiagnoses: {},
      findingsByTooth: {},
      treatmentHistoryByTooth: {},
      toothNotes: {},
      implantTeeth: [],
    };
    window.localStorage.setItem(LS_KEY, JSON.stringify(empty));
    expect(hasHistoricalData(PATIENT_ID)).toBe(false);
  });

  it("returns true when oralEntries has data", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ oralEntries: [{ id: "e1" }] }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(true);
  });

  it("returns true when oralNotes is non-empty", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ oralEntries: [], oralNotes: "Gingivitis present" }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(true);
  });

  it("returns true when entries array has data", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ entries: [{ toothFdi: "21", kind: "finding" }] }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(true);
  });

  it("returns true when toothDiagnoses has data (array)", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ toothDiagnoses: { "21": ["RCT"] } }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(true);
  });

  it("returns true when toothDiagnoses has data (object)", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ toothDiagnoses: { "21": { RCT: true } } }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(true);
  });

  it("returns true when findingsByTooth has data", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ findingsByTooth: { "21": [{ type: "Caries" }] } }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(true);
  });

  it("returns true when toothNotes has non-empty note", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ toothNotes: { "21": "Monitor closely" } }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(true);
  });

  it("returns true when implantTeeth has entries", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ implantTeeth: ["21"] }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(true);
  });

  it("returns false when toothNotes values are blank strings", () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ toothNotes: { "21": "  " } }));
    expect(hasHistoricalData(PATIENT_ID)).toBe(false);
  });

  it("returns false for malformed JSON", () => {
    window.localStorage.setItem(LS_KEY, "{bad json");
    expect(hasHistoricalData(PATIENT_ID)).toBe(false);
  });

  it("falls back to apt-1 when patientId is falsy", () => {
    const key = "dental.exam.chart.apt-1";
    window.localStorage.setItem(key, JSON.stringify({ oralEntries: [{ id: "e1" }] }));
    expect(hasHistoricalData(null)).toBe(true);
    window.localStorage.removeItem(key);
  });
});
