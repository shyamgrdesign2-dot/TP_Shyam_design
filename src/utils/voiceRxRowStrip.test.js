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
});

describe("appendDedupedText", () => {
  it("appends new note lines and skips duplicate lines", () => {
    expect(appendDedupedText("Drink water\nRest", " rest \nFollow bland diet")).toBe(
      "Drink water\nRest\nFollow bland diet"
    );
  });
});
