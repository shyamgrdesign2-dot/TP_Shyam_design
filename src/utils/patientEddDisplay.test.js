import { resolvePatientEddDisplay } from "./patientEddDisplay";

describe("resolvePatientEddDisplay", () => {
  it("prefers patient_edd_date when the API sends it", () => {
    expect(
      resolvePatientEddDisplay(
        { patient_edd_date: "15/06/2027" },
        { currentPregnancy: { edd: "2027-06-14T18:30:00.000Z" } },
      ),
    ).toBe("15/06/2027");
  });

  it("falls back to currentPregnancy.edd", () => {
    expect(
      resolvePatientEddDisplay(
        {},
        { currentPregnancy: { edd: "2027-06-14T18:30:00.000Z" } },
      ),
    ).toBe("15 Jun 2027");
  });

  it("prefers the corrected EDD over the LMP-derived one", () => {
    expect(
      resolvePatientEddDisplay(
        {},
        {
          currentPregnancy: {
            edd: "2027-06-14T18:30:00.000Z",
            ceed: "2027-07-01T18:30:00.000Z",
          },
        },
      ),
    ).toBe("02 Jul 2027");
  });

  it("returns a dash when there is no obstetric data", () => {
    expect(resolvePatientEddDisplay({}, null)).toBe("-");
    expect(resolvePatientEddDisplay(null, { currentPregnancy: null })).toBe("-");
  });

  it("passes through an unparseable value rather than printing Invalid date", () => {
    expect(
      resolvePatientEddDisplay({}, { currentPregnancy: { edd: "not a date" } }),
    ).toBe("not a date");
  });
});
