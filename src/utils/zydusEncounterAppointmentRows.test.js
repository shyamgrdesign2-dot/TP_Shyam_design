import { buildZydusEncounterAppointmentRows } from "./zydusEncounterAppointmentRows";

describe("buildZydusEncounterAppointmentRows", () => {
  const baseEncounter = {
    patientId: 1406385,
    patientName: "Abhinav Bindra",
    mobileNo: "9821885020",
    gender: "MALE",
    dob: "10-01-1990",
    encounterDateTime: "28-07-2026 11:36",
    patientAddress: "Ahmedabad",
    consultationType: "First Visit",
    consultationStatus: "Cancelled",
    encounterId: 6995576,
    source: "GENX",
  };

  const options = {
    createKey: () => "row-key",
    calculateAge: () => ({ years: 36, months: 6, days: 18 }),
  };

  it("maps every encounter to an appointment row without filtering", () => {
    const rows = buildZydusEncounterAppointmentRows(
      [
        { ...baseEncounter, isCancelled: false, encounterId: 1 },
        { ...baseEncounter, isCancelled: true, encounterId: 2 },
      ],
      options
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.encounterId)).toEqual([1, 2]);
  });

  it("maps the Zydus encounter fields to appointment row fields", () => {
    const [row] = buildZydusEncounterAppointmentRows(
      [{ ...baseEncounter, isCancelled: true }],
      options
    );

    expect(row).toEqual(
      expect.objectContaining({
        key: "row-key",
        patient_unique_id: 1406385,
        pm_fullname: "Abhinav Bindra",
        pm_contact_no: "9821885020",
        apTime: "11:36 AM",
        apDate: "28th Jul 2026",
        DOB: "10th Jan 1990",
        ageYears: 36,
        toct_type: "First Visit",
        appointmentStatus: "Cancelled",
        isCancelled: true,
        source: "GENX",
      })
    );
  });

  it("returns an empty list for a non array payload", () => {
    expect(buildZydusEncounterAppointmentRows(undefined, options)).toEqual([]);
  });
});
