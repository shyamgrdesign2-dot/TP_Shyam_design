import moment from "moment";
import {
  buildGynecPayloadForApi,
  getGynecClinicalNoteItems,
  normalizeGynaecHistoryFromDigitiseData,
} from "./gynecHistoryUtils";

describe("gynecHistoryUtils LMP normalization", () => {
  it("normalizes date-and-month LMP values with the current year for copy state and API payloads", () => {
    const expectedLmp = `${moment().year()}-02-28`;
    const copiedGynec = normalizeGynaecHistoryFromDigitiseData({
      gynaec_history: {
        lmp: "28th February",
        ageAtMenarche: 13,
      },
    });

    expect(copiedGynec.lmp).toBe(expectedLmp);

    const payload = buildGynecPayloadForApi(copiedGynec, 10403);
    expect(payload.lmp).toBe(expectedLmp);
  });

  it("normalizes numeric day-month LMP values with the current year", () => {
    const expectedLmp = `${moment().year()}-02-28`;

    expect(normalizeGynaecHistoryFromDigitiseData({ lmp: "28/02" }).lmp).toBe(expectedLmp);
    expect(normalizeGynaecHistoryFromDigitiseData({ lmp: "28 02" }).lmp).toBe(expectedLmp);
  });

  it("formats partial LMP values in clinical notes with the inferred current year", () => {
    const expectedDetail = `28 Feb ${moment().year()}`;

    expect(getGynecClinicalNoteItems({ lmp: "28th February" })).toEqual([
      { name: "LMP", detail: expectedDetail, payload: { lmp: "28th February" } },
    ]);
  });
});
