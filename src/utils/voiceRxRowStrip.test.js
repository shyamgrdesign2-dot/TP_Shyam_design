import { appendDedupedText, mergeCopiedRows } from "./voiceRxRowStrip";

describe("mergeCopiedRows", () => {
  it("updates matching symptoms and appends only new symptoms", () => {
    const existing = [
      { symptom_name: "A", since: "2 days", note: "old note", unique_id: "existing-a" },
      { symptom_name: "B", since: "1 day", unique_id: "existing-b" },
      { symptom_name: "C", unique_id: "existing-c" },
    ];
    const incoming = [
      { symptom_name: "a", severity: "Mild", since: "", unique_id: "incoming-a" },
      { symptom_name: "F", since: "3 days", unique_id: "incoming-f" },
      { symptom_name: "G", unique_id: "incoming-g" },
    ];

    expect(mergeCopiedRows(existing, incoming, "symptoms")).toEqual([
      { symptom_name: "a", since: "2 days", note: "old note", severity: "Mild", unique_id: "existing-a" },
      { symptom_name: "B", since: "1 day", unique_id: "existing-b" },
      { symptom_name: "C", unique_id: "existing-c" },
      { symptom_name: "F", since: "3 days", unique_id: "incoming-f" },
      { symptom_name: "G", unique_id: "incoming-g" },
    ]);
  });

  it("keeps medicines with different dose as separate rows", () => {
    const existing = [
      { tmm_medicine_name: "Dolo", tmm_dosage: "650", tmm_dosage_unit_name: "mg", tmm_remarks: "after food" },
    ];
    const incoming = [
      { tmm_medicine_name: "dolo", tmm_dosage: "500", tmm_dosage_unit_name: "mg", tmm_remarks: "new" },
    ];

    expect(mergeCopiedRows(existing, incoming, "medications")).toEqual([
      { tmm_medicine_name: "Dolo", tmm_dosage: "650", tmm_dosage_unit_name: "mg", tmm_remarks: "after food" },
      { tmm_medicine_name: "dolo", tmm_dosage: "500", tmm_dosage_unit_name: "mg", tmm_remarks: "new" },
    ]);
  });

  it("matches copied medicine to selected dropdown medicine by original voice name", () => {
    const existing = [
      {
        tmm_id: 241832,
        tmm_medicine_name: "Dolo 650 Tablet",
        tmm_generic: "Paracetamol (650mg)",
        voice_rx_original_name: "Dolo 650",
        voice_rx_from_module: false,
        unique_id: "med-1",
      },
    ];
    const incoming = [
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo 650",
        voice_rx_original_name: "Dolo 650",
        voice_rx_from_module: true,
        unique_id: "med-copy",
      },
    ];

    expect(mergeCopiedRows(existing, incoming, "medications")).toEqual([
      {
        tmm_id: 241832,
        tmm_medicine_name: "Dolo 650 Tablet",
        tmm_generic: "Paracetamol (650mg)",
        voice_rx_original_name: "Dolo 650",
        voice_rx_from_module: false,
        unique_id: "med-1",
      },
    ]);
  });

  it("matches copied medicine to selected dropdown medicine even when selected dose fields differ", () => {
    const existing = [
      {
        tmm_id: 241832,
        tmm_medicine_name: "Dolo 650 Tablet",
        tmm_generic: "Paracetamol (650mg)",
        tmm_dosage: "650",
        tmm_dosage_unit_name: "650 Tablet",
        voice_rx_original_name: "Dolo 650",
        voice_rx_from_module: false,
        unique_id: "med-1",
      },
    ];
    const incoming = [
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo 650",
        tmm_dosage: "",
        tmm_dosage_unit_name: "",
        voice_rx_original_name: "Dolo 650",
        voice_rx_from_module: true,
        unique_id: "med-copy",
      },
    ];

    expect(mergeCopiedRows(existing, incoming, "medications")).toEqual([
      {
        tmm_id: 241832,
        tmm_medicine_name: "Dolo 650 Tablet",
        tmm_generic: "Paracetamol (650mg)",
        tmm_dosage: "650",
        tmm_dosage_unit_name: "650 Tablet",
        voice_rx_original_name: "Dolo 650",
        voice_rx_from_module: false,
        unique_id: "med-1",
      },
    ]);
  });

  it("keeps unselected copied medicines with same name but different dose as separate rows", () => {
    const existing = [
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo",
        tmm_dosage: "500",
        tmm_dosage_unit_name: "mg",
        voice_rx_original_name: "Dolo",
        voice_rx_from_module: true,
        unique_id: "med-500",
      },
    ];
    const incoming = [
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo",
        tmm_dosage: "650",
        tmm_dosage_unit_name: "mg",
        voice_rx_original_name: "Dolo",
        voice_rx_from_module: true,
        unique_id: "med-650",
      },
    ];

    expect(mergeCopiedRows(existing, incoming, "medications")).toEqual([
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo",
        tmm_dosage: "500",
        tmm_dosage_unit_name: "mg",
        voice_rx_original_name: "Dolo",
        voice_rx_from_module: true,
        unique_id: "med-500",
      },
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo",
        tmm_dosage: "650",
        tmm_dosage_unit_name: "mg",
        voice_rx_original_name: "Dolo",
        voice_rx_from_module: true,
        unique_id: "med-650",
      },
    ]);
  });

  it("matches numeric medicine names even when the existing row predates original-name metadata", () => {
    const existing = [
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo 650",
        tmm_dosage: "1",
        tmm_dosage_unit_name: "",
        voice_rx_from_module: true,
        unique_id: "legacy-med",
      },
    ];
    const incoming = [
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo 650",
        tmm_dosage: "",
        tmm_dosage_unit_name: "",
        voice_rx_original_name: "Dolo 650",
        voice_rx_from_module: true,
        unique_id: "med-copy",
      },
    ];

    expect(mergeCopiedRows(existing, incoming, "medications")).toEqual([
      {
        tmm_id: 0,
        tmm_medicine_name: "Dolo 650",
        tmm_dosage: "1",
        tmm_dosage_unit_name: "",
        voice_rx_from_module: true,
        unique_id: "legacy-med",
        voice_rx_original_name: "Dolo 650",
      },
    ]);
  });

  it("updates matching diagnosis by name without clearing existing fields", () => {
    const existing = [
      { tds_name: "Migraine", since: "1 year", status: "Suspected", note: "old", unique_id: "dx-1" },
    ];
    const incoming = [
      { tds_name: "migraine", since: "", status: "Confirmed", note: "", unique_id: "dx-new" },
    ];

    expect(mergeCopiedRows(existing, incoming, "diagnosis")).toEqual([
      { tds_name: "migraine", since: "1 year", status: "Confirmed", note: "old", unique_id: "dx-1" },
    ]);
  });

  it("matches diagnosis by name when only incoming has an id", () => {
    const existing = [{ tds_name: "Asthma", note: "known case" }];
    const incoming = [{ tds_id: 12, tds_name: "asthma", status: "Confirmed" }];

    expect(mergeCopiedRows(existing, incoming, "diagnosis")).toEqual([
      { tds_name: "asthma", tds_id: 12, note: "known case", status: "Confirmed" },
    ]);
  });

  it("matches copied diagnosis to selected dropdown diagnosis by original voice name", () => {
    const existing = [
      {
        tds_id: 10,
        tds_name: "Dengue fever",
        icd_code: "A90",
        voice_rx_original_name: "Dengue",
        voice_rx_from_module: false,
        unique_id: "dx-1",
      },
    ];
    const incoming = [
      {
        tds_id: 0,
        tds_name: "Dengue",
        voice_rx_original_name: "Dengue",
        voice_rx_from_module: true,
        unique_id: "dx-copy",
      },
    ];

    expect(mergeCopiedRows(existing, incoming, "diagnosis")).toEqual([
      {
        tds_id: 10,
        tds_name: "Dengue fever",
        icd_code: "A90",
        voice_rx_original_name: "Dengue",
        voice_rx_from_module: false,
        unique_id: "dx-1",
      },
    ]);
  });

  it("does not use generated investigation objectID as the only match key", () => {
    const existing = [
      { investigation_name: "CBC", objectID: "generated-1", note: "fasting" },
    ];
    const incoming = [
      { investigation_name: "cbc", objectID: "generated-2", note: "morning" },
    ];

    expect(mergeCopiedRows(existing, incoming, "investigations")).toEqual([
      { investigation_name: "cbc", objectID: "generated-2", note: "morning" },
    ]);
  });

  it("matches copied investigation to selected dropdown investigation by original voice name", () => {
    const existing = [
      {
        id: 300,
        investigation_name: "Complete Blood Count",
        service_code: "CBC001",
        hm_type: 15,
        um_id: 0,
        voice_rx_original_name: "CBC",
        voice_rx_from_module: false,
        unique_id: "inv-1",
      },
    ];
    const incoming = [
      {
        investigation_name: "CBC",
        voice_rx_original_name: "CBC",
        voice_rx_from_module: true,
        unique_id: "inv-copy",
      },
    ];

    expect(mergeCopiedRows(existing, incoming, "investigations")).toEqual([
      {
        id: 300,
        investigation_name: "Complete Blood Count",
        service_code: "CBC001",
        hm_type: 15,
        um_id: 0,
        voice_rx_original_name: "CBC",
        voice_rx_from_module: false,
        unique_id: "inv-1",
      },
    ]);
  });
});

describe("appendDedupedText", () => {
  it("appends new note lines and skips duplicate lines", () => {
    expect(appendDedupedText("Drink water\nRest", " rest \nFollow bland diet")).toBe(
      "Drink water\nRest\nFollow bland diet"
    );
  });
});
