import {
  buildGenxSyncPayload,
  formatGenxClinicalEncounterDate,
  getGenxEncounterIdentity,
  normalizeGenxClinicalEncounter,
  normalizeGenxClinicalEncounterResponse,
  normalizeGenxSyncResponse,
  normalizeZydusGender,
  parseZydusPatientName,
  parseGenxTotalElements,
} from "./zydusClinicalEncounterAdapter";

describe("zydusClinicalEncounterAdapter", () => {
  const baseEncounter = {
    mrno: " 10002026587284 ",
    patientName: " Mr PARESHBHAI P. VAISHYA ",
    patientId: 1406385,
    visitNo: "OP-001",
    encounterDate: "16-07-2026 16:40",
    gender: "Male",
    mobileNo: "918141638676",
    visitId: 5028499,
    encounterId: 6995576,
    departmentName: "Neurology",
    departmentId: 31,
    unitName: "",
    encounterNo: "OP10003910606",
    consultationStatus: "Not Arrived",
    pvsId: "",
    patientStatus: "",
    branchCode: "1000",
    branchName: "ZYDUS HOSPITAL AHMEDABAD",
    employeeName: "DINESH SAINI",
    employeeId: 19640,
    queueNo: "14",
    departmentCode: "D0030",
    patientAddress: "A-1",
    dob: "20-09-1952",
    encounterDateTime: "16-07-2026 16:40",
    registeredOn: "16-07-2026 16:39",
    consultationType: "FIRST VISIT",
    visitTypeId: 108,
    visitTypeCode: "VISITTYPE1",
    isCancelled: false,
    updatedBy: "DR.DINESH SAINI",
  };

  it("converts selected UI date to Genx creationTimeStamp format", () => {
    expect(formatGenxClinicalEncounterDate("16-07-2026")).toBe("2026-07-16");
  });

  it("does not parse unsupported date formats through browser date parsing", () => {
    expect(formatGenxClinicalEncounterDate("2026/07/16")).toBe("2026/07/16");
  });

  it("normalizes gender to the app enum", () => {
    expect(normalizeZydusGender("Male")).toBe("MALE");
    expect(normalizeZydusGender("female")).toBe("FEMALE");
    expect(normalizeZydusGender("")).toBe("UNKNOWN");
  });

  it("normalizes Genx encounter fields without inventing pvsId", () => {
    const normalized = normalizeGenxClinicalEncounter(baseEncounter);

    expect(normalized).toEqual(
      expect.objectContaining({
        source: "GENX",
        patientId: 1406385,
        patient_unique_id: 1406385,
        mrno: "10002026587284",
        patientName: "Mr PARESHBHAI P. VAISHYA",
        gender: "MALE",
        pvsId: undefined,
        unitName: "",
        isValidEncounterRecord: true,
      })
    );
  });

  it("marks records invalid when mandatory identity fields are missing", () => {
    const normalized = normalizeGenxClinicalEncounter({
      ...baseEncounter,
      patientId: "",
      encounterId: "",
      encounterNo: "",
    });

    expect(normalized.isValidEncounterRecord).toBe(false);
  });

  it("parses totalElements safely", () => {
    expect(parseGenxTotalElements("7")).toBe(7);
    expect(parseGenxTotalElements("bad")).toBe(0);
  });

  it("normalizes response wrapper to legacy success envelope", () => {
    const normalized = normalizeGenxClinicalEncounterResponse({
      data: [baseEncounter],
      page: 1,
      totalElements: "7",
      totalPages: 2,
    });

    expect(normalized.status).toBe("success");
    expect(normalized.totalElements).toBe(7);
    expect(normalized.totalPages).toBe(2);
    expect(normalized.data).toHaveLength(1);
    expect(normalized.data[0].source).toBe("GENX");
  });

  it("builds a stable encounter identity from meaningful identifiers", () => {
    expect(getGenxEncounterIdentity(baseEncounter)).toBe(
      "6995576|OP10003910606|5028499|OP-001|10002026587284"
    );
  });

  it("parses patient names with salutation and middle names", () => {
    expect(parseZydusPatientName("Mr MADHUSUDAN KUMAR MUKERJEE")).toEqual({
      salutation: "Mr",
      firstName: "MADHUSUDAN",
      middleName: "KUMAR",
      lastName: "MUKERJEE",
    });
  });

  it("builds Genx sync payload from encounter and user context", () => {
    const payload = buildGenxSyncPayload(
      {
        ...baseEncounter,
        patientId: 28007,
        mrno: "10002024444270",
        encounterId: 703,
        encounterDateTime: "17-07-2026 07:54",
        visitTypeCode: "IP",
        patientName: "SONU SONI",
      },
      {
        businessId: "754811713438773",
        doctorRefId: "31704005",
      }
    );

    expect(payload).toEqual(
      expect.objectContaining({
        source: "TP-React-FE",
        businessId: "754811713438773",
        doctorRefId: "31704005",
        patientRefId: "10002024444270",
        encounterRefId: "703",
        visitType: "IP",
        scheduledDate: "17-07-2026",
        scheduledTime: "07:54:00",
        scheduledDuration: "15",
        billingStatus: "PAID",
      })
    );
    expect(payload.patientRefId).not.toBe("28007");
    expect(payload.patientDetails).toEqual(
      expect.objectContaining({
        firstName: "SONU",
        lastName: "SONI",
        contactNumber: "918141638676",
      })
    );
  });

  it("fails Genx sync payload build when doctorRefId is missing", () => {
    expect(() =>
      buildGenxSyncPayload(baseEncounter, {
        businessId: "754811713438773",
      })
    ).toThrow("doctorRefId is required");
  });

  it("fails Genx sync payload build when encounter date is malformed", () => {
    expect(() =>
      buildGenxSyncPayload(
        { ...baseEncounter, encounterDateTime: "2026-07-17T07:54:00Z" },
        { businessId: "754811713438773", doctorRefId: "31704005" }
      )
    ).toThrow("encounterDateTime must be in DD-MM-YYYY HH:mm format");
  });

  it("normalizes Genx sync response identifiers", () => {
    const normalized = normalizeGenxSyncResponse({
      status: true,
      data: {
        patient: {
          patient_unique_id: 212956445,
        },
        appointment: {
          pam_id: 9876,
        },
        caseManager: {
          tcm_id: 1234,
        },
      },
    });

    expect(normalized.patient_unique_id).toBe(212956445);
    expect(normalized.pam_id).toBe(9876);
    expect(normalized.tcm_id).toBe(1234);
  });
});
