import {
  convertMedicalHistoryToContextFormat,
  formatOtherMedicalHistoryLineItem,
} from "./medicalHistoryConverters";

describe("medicalHistoryConverters others copy handling", () => {
  it("formats others medical history rows as labeled additional-history line items", () => {
    expect(formatOtherMedicalHistoryLineItem({
      type: "others",
      name: "Food Allergy",
      notes: "peanuts",
      duration: "2 years",
    })).toBe("Food Allergy: peanuts, Duration: 2 years");
  });

  it("appends others medical history to existing additional history with exact line dedupe", () => {
    const existing = [
      {
        tmmhs_id: 1,
        section_name: "Lifestyle",
        title: "Lifestyle",
        tags: [],
        medical_history_remarks: "Existing history",
      },
    ];

    const copiedOnce = convertMedicalHistoryToContextFormat([
      {
        type: "Others",
        name: "Food Allergy",
        notes: "peanuts",
        duration: "2 years",
      },
    ], existing);

    expect(copiedOnce[0].medical_history_remarks).toBe(
      "Existing history\nFood Allergy: peanuts, Duration: 2 years"
    );

    const copiedAgain = convertMedicalHistoryToContextFormat([
      {
        type: "Others",
        name: "Food Allergy",
        notes: "peanuts",
        duration: "2 years",
      },
    ], copiedOnce);

    expect(copiedAgain[0].medical_history_remarks).toBe(
      "Existing history\nFood Allergy: peanuts, Duration: 2 years"
    );
  });
});
