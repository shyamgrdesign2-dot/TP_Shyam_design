import { medicalHistoryToHtmlList } from "./buildReportContentFromGroupedData";

describe("medicalHistoryToHtmlList", () => {
  it("renders negated tags as 'No <condition>' without a status", () => {
    const html = medicalHistoryToHtmlList(
      [
        {
          tmmhs_id: 2,
          title: "Medical Condition",
          tags: [
            { tmmhst_id: 11, title: "BP", enable: "N", status: "Active" },
            { tmmhst_id: 12, title: "Diabetes", enable: "N", status: "Active" },
          ],
        },
      ],
      "Medical Condition"
    );

    expect(html).toBe(
      "<ol><li><strong>No BP</strong></li><li><strong>No Diabetes</strong></li></ol>"
    );
    expect(html).not.toContain("Status");
  });

  it("keeps details for active tags", () => {
    const html = medicalHistoryToHtmlList(
      [
        {
          tmmhs_id: 2,
          title: "Medical Condition",
          tags: [
            {
              tmmhst_id: 21,
              title: "Hypertension",
              enable: "Y",
              since: "2 Years",
              status: "Active",
              medication: "Amlodipine",
            },
          ],
        },
      ],
      "Medical Condition"
    );

    expect(html).toBe(
      "<ol><li><strong>Hypertension</strong> (Since: 2 Years | Status: Active | Medication: Amlodipine)</li></ol>"
    );
  });

  it("does not double the 'No' prefix when the title already carries it", () => {
    const html = medicalHistoryToHtmlList(
      [
        {
          tmmhs_id: 4,
          title: "Allergies",
          tags: [{ tmmhst_id: 31, title: "No allergy", enable: "N", status: "Active" }],
        },
      ],
      "Allergies"
    );

    expect(html).toBe("<ol><li><strong>No allergy</strong></li></ol>");
  });

  it("renders 'No known history' for sections flagged no_know_history", () => {
    const html = medicalHistoryToHtmlList(
      [{ tmmhs_id: 2, title: "Medical Condition", no_know_history: true, tags: [] }],
      "Medical Condition"
    );

    expect(html).toBe("<ol><li>No known history</li></ol>");
  });

  it("prints 'No known history' once when several consultations report it", () => {
    const html = medicalHistoryToHtmlList(
      [
        { tmmhs_id: 4, title: "Allergies", no_know_history: true, tags: [] },
        { tmmhs_id: 4, title: "Allergies", no_know_history: true, tags: [] },
      ],
      "Allergies"
    );

    expect(html).toBe("<ol><li>No known history</li></ol>");
  });

  it("prefers real tags over the no_know_history flag", () => {
    const html = medicalHistoryToHtmlList(
      [
        {
          tmmhs_id: 2,
          title: "Medical Condition",
          no_know_history: true,
          tags: [{ tmmhst_id: 41, title: "Asthma", enable: "Y", status: "Active" }],
        },
      ],
      "Medical Condition"
    );

    expect(html).toBe("<ol><li><strong>Asthma</strong> (Status: Active)</li></ol>");
  });

  it("keeps additional remarks on a no_know_history section", () => {
    const html = medicalHistoryToHtmlList(
      [
        {
          tmmhs_id: 2,
          title: "Medical Condition",
          no_know_history: true,
          medical_history_remarks: "Patient denies any chronic illness",
          tags: [],
        },
      ],
      "Medical Condition"
    );

    expect(html).toBe(
      "<ol><li> (Patient denies any chronic illness)</li></ol>"
    );
  });

  it("handles a real caseManagerData Family History section", () => {
    const html = medicalHistoryToHtmlList(
      [
        {
          title: "Family History",
          tmmhs_id: 3,
          no_know_history: true,
          tags: [],
          tmpmh_remarks: "",
        },
      ],
      "Family History"
    );

    expect(html).toBe("<ol><li>No known history</li></ol>");
  });

  it("renders negated tags from a real caseManagerData section", () => {
    const html = medicalHistoryToHtmlList(
      [
        {
          title: "Allergies",
          tmmhs_id: 4,
          no_know_history: false,
          tags: [
            {
              tmmhst_id: 22578,
              title: "pollen",
              pms_default: 1,
              since: "",
              status: "",
              note: "",
              enable: "N",
              newSince: "",
              MonthYear: "",
            },
          ],
          tmpmh_remarks: "",
        },
      ],
      "Allergies"
    );

    expect(html).toBe("<ol><li><strong>No pollen</strong></li></ol>");
  });

  it("renders negated flat items without tags as 'No <condition>'", () => {
    const html = medicalHistoryToHtmlList(
      [{ title: "Allergy", enable: "N", status: "Active", since: "2 Years" }],
      "Allergies"
    );

    expect(html).toBe("<ol><li><strong>No Allergy</strong></li></ol>");
  });
});
