import { digitizationToSections } from "./result-formatters";

describe("digitizationToSections", () => {
  it("renders singular surgery payloads as Surgeries/Procedures clinical-note section", () => {
    const sections = digitizationToSections({
      artifact_type: "digitise_data",
      surgeries: [],
      surgery: [
        {
          name: "Knee replacement",
          notes: "left knee",
        },
      ],
    });

    expect(sections).toEqual([
      {
        id: "surgeries",
        title: "Surgeries/Procedures",
        tpIconName: "lab",
        items: [
          {
            name: "Knee replacement",
            detail: "left knee",
          },
        ],
      },
    ]);
  });
});
