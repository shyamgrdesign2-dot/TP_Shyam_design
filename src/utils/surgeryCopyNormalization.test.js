import { enrichCopiedSurgeryRows } from "./surgeryCopyNormalization";

jest.mock("../api/services/ApiSurgical", () => ({
  __esModule: true,
  default: {
    searchExamination: jest.fn(),
    createSurgery: jest.fn(),
  },
}));

describe("enrichCopiedSurgeryRows", () => {
  it("uses an exact surgery master match when one exists", async () => {
    const surgicalApi = {
      searchExamination: jest.fn().mockResolvedValue([
        { id: "master-1", name: "Knee replacement" },
      ]),
      createSurgery: jest.fn(),
    };

    await expect(enrichCopiedSurgeryRows([
      { name: "Knee replacement", notes: "left knee" },
    ], surgicalApi)).resolves.toEqual([
      {
        masterId: "master-1",
        name: "Knee replacement",
        notes: "left knee",
        change: 1,
      },
    ]);
    expect(surgicalApi.createSurgery).not.toHaveBeenCalled();
  });

  it("creates a custom surgery when no exact master match exists", async () => {
    const surgicalApi = {
      searchExamination: jest.fn().mockResolvedValue([]),
      createSurgery: jest.fn().mockResolvedValue({ id: "custom-1", name: "Custom procedure" }),
    };

    await expect(enrichCopiedSurgeryRows([
      { procedure_name: "Custom procedure", note: "same day" },
    ], surgicalApi)).resolves.toEqual([
      {
        procedure_name: "Custom procedure",
        note: "same day",
        masterId: "custom-1",
        name: "Custom procedure",
        notes: "same day",
        change: 1,
      },
    ]);
    expect(surgicalApi.createSurgery).toHaveBeenCalledWith({ name: "Custom procedure" });
  });
});
