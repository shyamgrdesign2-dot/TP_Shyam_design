import {
  normalizeCopiedMedicationRows,
  parseMedicationFrequencySlots,
} from "./medicationCopyNormalization";

const frequencyList = [
  { tmf_id: 1, tmf_title: "SOS", tmf_block: 1, tmf_block_val: "SOS block" },
  { tmf_id: 2, tmf_title: "TDS", tmf_block: 1, tmf_block_val: "TDS block" },
];

const timingList = [
  { tmt_id: 5, tmt_title: "After Food" },
  { tmt_id: 6, tmt_title: "Before Breakfast" },
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
});
