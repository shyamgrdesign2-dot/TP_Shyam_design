import {
  buildInvestigationEndVisitPayload,
  hasMedicineMasterId,
  isUngroundedVoiceInvestigation,
  needsCustomMedicineCreate,
} from "./voiceRxEndVisitPayload";

describe("voiceRxEndVisitPayload", () => {
  it("needsCustomMedicineCreate for voice module meds without tmm_id", () => {
    expect(
      needsCustomMedicineCreate({
        tmm_medicine_name: "Pento",
        tmm_id: 0,
        voice_rx_from_module: true,
      })
    ).toBe(true);
  });

  it("does not need custom medicine create when master id exists", () => {
    expect(
      needsCustomMedicineCreate({
        tmm_medicine_name: "Paracetamol",
        tmm_id: 123,
        voice_rx_from_module: true,
      })
    ).toBe(false);
  });

  it("hasMedicineMasterId rejects zero ids", () => {
    expect(hasMedicineMasterId({ tmm_id: 0 })).toBe(false);
    expect(hasMedicineMasterId({ tmm_id: "45" })).toBe(true);
  });

  it("marks ungrounded voice investigations as Add Custom", () => {
    const payload = buildInvestigationEndVisitPayload([
      {
        investigation_name: "CBC test",
        voice_rx_from_module: true,
        note: "",
      },
    ]);

    expect(payload[0].change).toBe(1);
    expect(payload[0].voice_rx_from_module).toBe(false);
    expect(isUngroundedVoiceInvestigation(payload[0])).toBe(false);
  });

  it("leaves grounded investigations unchanged", () => {
    const payload = buildInvestigationEndVisitPayload([
      {
        investigation_name: "CBC",
        voice_rx_from_module: false,
      },
    ]);

    expect(payload[0].change).toBeUndefined();
    expect(payload[0].investigation_name).toBe("CBC");
  });
});
