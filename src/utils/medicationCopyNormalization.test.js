import {
  buildMedicineDoseDisplayText,
  getMedicineFrequencyDisplay,
  normalizeCopiedMedicationRows,
  parseMedicationFrequencySlots,
  resolveCopiedDoseFields,
} from "./medicationCopyNormalization";

const frequencyList = [
  { tmf_id: 1, tmf_title: "SOS", tmf_block: 1, tmf_block_val: "SOS block" },
  { tmf_id: 2, tmf_title: "TDS", tmf_block: 1, tmf_block_val: "TDS block" },
];

const timingList = [
  { tmt_id: 5, tmt_title: "After Food" },
  { tmt_id: 6, tmt_title: "Before Breakfast" },
];

const medicineUnits = [
  { tmu_id: 2, tmu_title: "Tablet(s)" },
  { tmu_id: 3, tmu_title: "mg" },
  { tmu_id: 4, tmu_title: "ml" },
  { tmu_id: 5, tmu_title: "unit(s)" },
];

describe("parseMedicationFrequencySlots", () => {
  it("parses supported dashed, x, comma, and fractional frequency formats", () => {
    expect(parseMedicationFrequencySlots("1-0-1")).toMatchObject({
      label: "1 - 0 - 1",
      morning: "1",
      afternoon: "0",
      evening: 0,
      night: "1",
    });
    expect(parseMedicationFrequencySlots("1 - 0 - 1 - 0")).toMatchObject({
      label: "1 - 0 - 1 - 0",
      morning: "1",
      afternoon: "0",
      evening: "1",
      night: "0",
    });
    expect(parseMedicationFrequencySlots("1×0×.5")).toMatchObject({
      label: "1 - 0 - 0.5",
      night: "0.5",
    });
    expect(parseMedicationFrequencySlots("1,0,½")).toMatchObject({
      label: "1 - 0 - 0.5",
      night: "0.5",
    });
    expect(parseMedicationFrequencySlots("1/2-0-1")).toMatchObject({
      label: "0.5 - 0 - 1",
      morning: "0.5",
    });
  });

  it("rejects non-numeric dashed strings", () => {
    expect(parseMedicationFrequencySlots("SOS-SOS-SOS")).toBeNull();
    expect(parseMedicationFrequencySlots("alternate-day")).toBeNull();
  });
});

describe("normalizeCopiedMedicationRows", () => {
  it("uses dashed frequency before raw string and maps schedule case-insensitively", () => {
    const [row] = normalizeCopiedMedicationRows([
      {
        frequency: "TDS",
        tmm_freq_type_name: "1-0-1",
        schedule: "after food",
      },
    ], frequencyList, timingList);

    expect(row).toMatchObject({
      tmm_freq_type_name: "1 - 0 - 1",
      tmm_freq_type: 0,
      tmf_block: 0,
      tcm_tmm_freq_morning: "1",
      tcm_tmm_freq_afternoon: "0",
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: "1",
      tmm_time: 5,
      tmm_time_name: "After Food",
    });
  });

  it("maps exact frequency dropdown titles case-insensitively and clears slots", () => {
    const [row] = normalizeCopiedMedicationRows([
      {
        frequency: "sos",
      },
    ], frequencyList, timingList);

    expect(row).toMatchObject({
      tmm_freq_type_name: "SOS",
      tmm_freq_type: 1,
      tmf_block: 1,
      tmf_block_val: "SOS block",
      tcm_tmm_freq_morning: 0,
      tcm_tmm_freq_afternoon: 0,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: 0,
    });
  });

  it("moves unmatched frequency and schedule into labelled notes", () => {
    const [row] = normalizeCopiedMedicationRows([
      {
        frequency: "alternate day",
        schedule: "take with milk",
        tmm_remarks: "existing note",
      },
    ], frequencyList, timingList);

    expect(row).toMatchObject({
      tmm_freq_type_name: "",
      tmm_freq_type: 0,
      tmf_block: 0,
      tmf_block_val: "",
      tmm_time: 0,
      tmm_time_name: "",
      tmm_remarks: "existing note | Frequency: alternate day | Schedule: take with milk",
    });
  });

  it("ignores None schedule", () => {
    const [row] = normalizeCopiedMedicationRows([
      {
        frequency: "SOS",
        schedule: "None",
      },
    ], frequencyList, timingList);

    expect(row).toMatchObject({
      tmm_freq_type_name: "SOS",
    });
    expect(row.tmm_time_name).toBeUndefined();
    expect(row.tmm_remarks).toBeUndefined();
  });

  it("repairs copied past-visit dose display from persisted unit ids", () => {
    const [row] = normalizeCopiedMedicationRows([
      {
        tmm_medicine_name: "Azithromycin",
        dosage: "1 Tablet(s)",
        tmm_dosage: "1",
        tmm_unit: "2",
        medicineUnit: [
          { tmu_id: 3, tmu_title: "mg" },
          { tmu_id: 5, tmu_title: "unit(s)" },
          { tmu_id: 6, tmu_title: "Capsule(s)" },
        ],
      },
    ], frequencyList, timingList);

    expect(row).toMatchObject({
      tmm_dosage: "1",
      tmm_unit: "2",
      tmu_id: "2",
      tmm_unit_name: "Tablet(s)",
      tmm_dosage_unit_name: "1 Tablet(s)",
    });
  });

  it("prefers copied dosage text with units over a numeric-only dose display", () => {
    const [row] = normalizeCopiedMedicationRows([
      {
        tmm_medicine_name: "Pantop",
        dosage: "1 Tablet(s)",
        tmm_dosage: "1",
        tmm_dosage_unit_name: "1",
      },
    ], frequencyList, timingList);

    expect(row).toMatchObject({
      tmm_dosage: "1",
      tmm_unit: 2,
      tmu_id: 2,
      tmm_unit_name: "Tablet(s)",
      tmm_dosage_unit_name: "1 Tablet(s)",
    });
  });
});

describe("getMedicineFrequencyDisplay", () => {
  it("prefers dashed frequency text over stale dropdown frequency ids", () => {
    expect(getMedicineFrequencyDisplay({
      tmm_freq_type_name: "1 - 1 - 1",
      tmm_freq_type: 2,
      tmf_block: 1,
      tcm_tmm_freq_morning: "1",
      tcm_tmm_freq_afternoon: "1",
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_night: "1",
    }, frequencyList)).toMatchObject({
      label: "1 - 1 - 1",
      blockValue: "",
    });
  });
});

describe("resolveCopiedDoseFields", () => {
  it("maps copied dosage text to matching medicine units case-insensitively", () => {
    expect(resolveCopiedDoseFields({ tmm_dosage_unit_name: "1 tablet(s)" }, medicineUnits)).toMatchObject({
      tmm_dosage: "1",
      tmm_unit: 2,
      tmu_id: 2,
      tmm_unit_name: "Tablet(s)",
      tmm_dosage_unit_name: "1 Tablet(s)",
    });
    expect(resolveCopiedDoseFields({ tmm_dosage_unit_name: "5ML" }, medicineUnits)).toMatchObject({
      tmm_dosage: "5",
      tmm_unit: 4,
      tmu_id: 4,
      tmm_unit_name: "ml",
      tmm_dosage_unit_name: "5 ml",
    });
    expect(resolveCopiedDoseFields({ tmm_dosage_unit_name: "1 Mg" }, medicineUnits)).toMatchObject({
      tmm_dosage: "1",
      tmm_unit: 3,
      tmm_unit_name: "mg",
    });
  });

  it("uses default dose/unit when copied dosage is empty", () => {
    expect(resolveCopiedDoseFields({}, medicineUnits, {
      defaultIfMissing: true,
      defaultDose: "1",
      defaultUnitId: 2,
    })).toMatchObject({
      tmm_dosage: "1",
      tmm_unit: 2,
      tmm_dosage_unit_name: "1 Tablet(s)",
    });
  });

  it("uses custom fallback unit on unmatched copied dosage unit", () => {
    expect(resolveCopiedDoseFields({ tmm_dosage_unit_name: "5 sachet" }, medicineUnits, {
      fallbackUnitIdOnUnitMismatch: 5,
      fallbackUnitTitle: "unit(s)",
    })).toMatchObject({
      tmm_dosage: "5",
      tmm_unit: 5,
      tmm_unit_name: "unit(s)",
      tmm_dosage_unit_name: "5 unit(s)",
    });
  });

  it("can resolve copied units from the standard custom unit list when medicine details omit that unit", () => {
    const medicineSpecificUnits = [
      { tmu_id: 3, tmu_title: "mg" },
      { tmu_id: 5, tmu_title: "unit(s)" },
      { tmu_id: 6, tmu_title: "Capsule(s)" },
    ];

    expect(resolveCopiedDoseFields({ tmm_dosage_unit_name: "1 Tablet(s)" }, medicineSpecificUnits, {
      includeCustomUnits: true,
    })).toMatchObject({
      tmm_dosage: "1",
      tmm_unit: 2,
      tmu_id: 2,
      tmm_unit_name: "Tablet(s)",
      tmm_dosage_unit_name: "1 Tablet(s)",
    });
  });

  it("keeps explicitly selected unit per dose", () => {
    expect(resolveCopiedDoseFields({
      tmm_dosage: "7",
      tmm_unit: 4,
      tmm_unit_name: "ml",
      tmm_dosage_unit_name: "7 ml",
    }, medicineUnits, {
      fallbackUnitIdOnUnitMismatch: 5,
    })).toMatchObject({
      tmm_dosage: "7",
      tmm_unit: 4,
      tmm_unit_name: "ml",
      tmm_dosage_unit_name: "7 ml",
    });
  });
});

describe("buildMedicineDoseDisplayText", () => {
  it("resolves persisted unit ids even when medicineUnit omits the selected unit", () => {
    expect(buildMedicineDoseDisplayText({
      tmm_dosage: "1",
      tmm_unit: "2",
      medicineUnit: [
        { tmu_id: 3, tmu_title: "mg" },
        { tmu_id: 5, tmu_title: "unit(s)" },
        { tmu_id: 6, tmu_title: "Capsule(s)" },
      ],
    })).toBe("1 Tablet(s)");
  });
});
