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

  it("appends copied notes to an existing matching medical condition without repeating them", () => {
    const existing = [
      {
        tmmhs_id: 2,
        section_name: "Medical Condition",
        title: "Medical Condition",
        tags: [
          {
            title: "Type 2 diabetes",
            enable: "Y",
            since: "2 Years",
            status: "Active",
            note: "metformin 500 mg and glimepiride 2 mg",
          },
        ],
      },
    ];
    const copiedPayload = [
      {
        name: "Type 2 diabetes",
        type: "Medical Condition",
        duration: "2 Years",
        relation: "",
        enable: "Y",
        notes: "Using insulin",
      },
    ];

    const copiedOnce = convertMedicalHistoryToContextFormat(copiedPayload, existing);

    expect(copiedOnce[0].tags[0].note).toBe(
      "metformin 500 mg and glimepiride 2 mg, Using insulin"
    );

    const copiedAgain = convertMedicalHistoryToContextFormat(copiedPayload, copiedOnce);

    expect(copiedAgain[0].tags[0].note).toBe(
      "metformin 500 mg and glimepiride 2 mg, Using insulin"
    );
  });
});

describe("medicalHistoryConverters negation status handling", () => {
  it("does not default negated conditions to an Active status", () => {
    const converted = convertMedicalHistoryToContextFormat([
      { type: "Medical Condition", name: "No BP" },
      { type: "Medical Condition", name: "Diabetes", enable: "N" },
    ]);

    expect(converted[0].tags.map((tag) => [tag.title, tag.enable, tag.status])).toEqual([
      ["BP", "N", ""],
      ["Diabetes", "N", ""],
    ]);
  });

  it("clears a previously Active status when the condition becomes negated", () => {
    const existing = [
      {
        tmmhs_id: 2,
        section_name: "Medical Condition",
        title: "Medical Condition",
        tags: [{ title: "BP", enable: "Y", status: "Active" }],
      },
    ];

    const converted = convertMedicalHistoryToContextFormat(
      [{ type: "Medical Condition", name: "BP", enable: "N" }],
      existing
    );

    expect(converted[0].tags[0].enable).toBe("N");
    expect(converted[0].tags[0].status).toBe("");
  });

  it("drops an agent-supplied Active status on negated rows", () => {
    const sections = convertAgentMedicalHistoryRowsToSections([
      { type: "allergy", title: "Allergy", enable: "N", status: "Active" },
    ]);

    expect(sections[0].tags[0].status).toBe("");
  });
});
