import {
  convertAgentMedicalHistoryRowsToSections,
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

  it("does not repeat Past medication use heading for Others additional history", () => {
    expect(formatOtherMedicalHistoryLineItem({
      type: "Others",
      name: "**Past medication use**",
      notes: "Taking XYZ",
      duration: "5 Years",
    })).toBe("Taking XYZ, Duration: 5 Years");
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

  it("only appends new incoming additional-history chunks when older chunks are already present", () => {
    const existing = [
      {
        tmmhs_id: 1,
        section_name: "Lifestyle",
        title: "Lifestyle",
        tags: [],
        medical_history_remarks: "qwerty xyz",
      },
    ];

    const copied = convertMedicalHistoryToContextFormat([
      {
        type: "Others",
        notes: "xyz. abc.",
      },
    ], existing);

    expect(copied[0].medical_history_remarks).toBe("qwerty xyz\nabc.");
  });

  it("keeps agents/module Others medical history rows as additional-history remarks", () => {
    expect(convertAgentMedicalHistoryRowsToSections([
      {
        type: "Others",
        name: "Food Allergy",
        notes: "peanuts",
        duration: "2 years",
      },
    ])).toEqual([
      {
        tmmhs_id: 1,
        title: "Lifestyle",
        section_name: "Lifestyle",
        no_know_history: false,
        medical_history_remarks: "Food Allergy: peanuts, Duration: 2 years",
        tags: [],
      },
    ]);
  });
});
