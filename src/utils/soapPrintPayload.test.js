import {
  buildSoapIndividualPrintPayload,
  SOAP_PRINT_MODULE_ID,
} from "./soapPrintPayload";

const defaultPrintSettings = {
  prescription: { case_option: [] },
  header_footer: {},
  page_format: {},
};

function buildPayload(soapHtml) {
  return buildSoapIndividualPrintPayload({
    soapHtml,
    patient_data: { patient_unique_id: "P1" },
    profile: {},
    userId: "U1",
    caseManagerData: {},
    currentTcmId: 1,
    pamId: 2,
    consultationDate: "2026-07-14 17:00:00",
    defaultPrintSettings,
    frequencyList: [],
    timingList: [],
  });
}

describe("buildSoapIndividualPrintPayload", () => {
  function getSoapContent(payload) {
    return payload.caseManagerData.moduleContents.find(
      (module) => module.module_id === SOAP_PRINT_MODULE_ID
    ).content;
  }

  it("preserves editable SOAP custom headings and ordered lists", () => {
    const payload = buildPayload(`
      <h2>Assessment</h2>
      <ul><li>Epilepsy</li><li>Ulcers</li></ul>
      <h2>Plan</h2>
      <ul><li>now</li><li>its time</li></ul>
      <h1>for big</h1>
      <h2>heading</h2>
      <ul><li>sdf</li></ul>
      <ol><li>one</li><li>two</li></ol>
      <p>sdf11123<br>sdf</p>
    `);

    const content = getSoapContent(payload);

    expect(content[0].renderMode).toBe("document");
    expect(content[0].notes).toBe(
      "Assessment\nEpilepsy\nUlcers\nPlan\nnow\nits time\nfor big\nheading\nsdf\none\ntwo\nsdf11123\nsdf"
    );
    expect(content[0].blocks).toEqual([
      expect.objectContaining({ type: "heading", text: "Assessment", level: 2 }),
      expect.objectContaining({
        type: "list",
        items: [
          expect.objectContaining({ text: "Epilepsy" }),
          expect.objectContaining({ text: "Ulcers" }),
        ],
      }),
      expect.objectContaining({ type: "heading", text: "Plan", level: 2 }),
      expect.objectContaining({
        type: "list",
        items: [
          expect.objectContaining({ text: "now" }),
          expect.objectContaining({ text: "its time" }),
        ],
      }),
      expect.objectContaining({ type: "heading", text: "for big", level: 1 }),
      expect.objectContaining({ type: "heading", text: "heading", level: 2 }),
      expect.objectContaining({
        type: "list",
        items: [expect.objectContaining({ text: "sdf" })],
      }),
      expect.objectContaining({
        type: "ordered-list",
        items: [
          expect.objectContaining({ text: "one" }),
          expect.objectContaining({ text: "two" }),
        ],
      }),
      expect.objectContaining({
        type: "paragraph",
        text: "sdf11123\nsdf",
        isFallback: false,
      }),
    ]);
  });

  it("does not synthesize missing SOAP sections for pasted free-form notes", () => {
    const payload = buildPayload(`
      <p>S — Subjective</p>
      <p>History of Present Illness: Patient reports fever.</p>
      <p>Allergies:<br>No known drug allergies.</p>
    `);

    expect(getSoapContent(payload)).toEqual([
      {
        title: "",
        notes:
          "S — Subjective\nHistory of Present Illness: Patient reports fever.\nAllergies:\nNo known drug allergies.",
        renderMode: "document",
        blocks: [
          {
            type: "paragraph",
            text: "S — Subjective",
            runs: [{ text: "S — Subjective" }],
            isFallback: false,
          },
          {
            type: "paragraph",
            text: "History of Present Illness: Patient reports fever.",
            runs: [{ text: "History of Present Illness: Patient reports fever." }],
            isFallback: false,
          },
          {
            type: "paragraph",
            text: "Allergies:\nNo known drug allergies.",
            runs: [{ text: "Allergies:\nNo known drug allergies." }],
            isFallback: false,
          },
        ],
      },
    ]);
  });

  it("keeps pasted SOAP headings and paragraphs as separate document blocks", () => {
    const payload = buildPayload(`
      <p>S — Subjective</p>
      <p>History of Present Illness:</p>
      <p>Patient reports fever.</p>
      <p>O — Objective</p>
    `);

    expect(getSoapContent(payload)).toEqual([
      {
        title: "",
        notes:
          "S — Subjective\nHistory of Present Illness:\nPatient reports fever.\nO — Objective",
        renderMode: "document",
        blocks: [
          {
            type: "paragraph",
            text: "S — Subjective",
            runs: [{ text: "S — Subjective" }],
            isFallback: false,
          },
          {
            type: "paragraph",
            text: "History of Present Illness:",
            runs: [{ text: "History of Present Illness:" }],
            isFallback: false,
          },
          {
            type: "paragraph",
            text: "Patient reports fever.",
            runs: [{ text: "Patient reports fever." }],
            isFallback: false,
          },
          {
            type: "paragraph",
            text: "O — Objective",
            runs: [{ text: "O — Objective" }],
            isFallback: false,
          },
        ],
      },
    ]);
  });

  it("preserves inline bold and italic marks for print rendering", () => {
    const payload = buildPayload(`
      <h1>Primary Title</h1>
      <h2>Secondary Title</h2>
      <p>Normal <em>italic text</em> and <strong>bold text</strong>.</p>
      <ul><li>plain and <i>italic item</i></li></ul>
    `);

    const blocks = getSoapContent(payload)[0].blocks;

    expect(blocks[0]).toEqual(
      expect.objectContaining({ type: "heading", text: "Primary Title", level: 1 })
    );
    expect(blocks[1]).toEqual(
      expect.objectContaining({ type: "heading", text: "Secondary Title", level: 2 })
    );
    expect(blocks[2]).toEqual(
      expect.objectContaining({
        type: "paragraph",
        text: "Normal italic text and bold text.",
        runs: [
          { text: "Normal " },
          { text: "italic text", italic: true },
          { text: " and " },
          { text: "bold text", bold: true },
          { text: "." },
        ],
      })
    );
    expect(blocks[3]).toEqual(
      expect.objectContaining({
        type: "list",
        items: [
          expect.objectContaining({
            text: "plain and italic item",
            runs: [
              { text: "plain and " },
              { text: "italic item", italic: true },
            ],
          }),
        ],
      })
    );
  });

  it("keeps normal prescription header and footer assets from the base print payload", () => {
    const payload = buildSoapIndividualPrintPayload({
      soapHtml: "<h1>Subjective</h1><ul><li>Fever</li></ul>",
      basePrintPayload: {
        mode: "NORMAL",
        printSettings: {
          ...defaultPrintSettings,
          letterhead_format: 1,
          header_image: "https://example.com/header.png",
          footer_image: "https://example.com/footer.png",
          water_mark_enable: "Y",
        },
        fileHeader: {
          imageShow: true,
          showFile: "data:image/png;base64,header",
          headerHeight: 100,
        },
        fileFooter: {
          imageShow: true,
          showFile: "data:image/png;base64,footer",
          footerHeight: 60,
          footerWidth: 500,
        },
        fileWatermark: {
          imageShow: true,
          showFile: "data:image/png;base64,watermark",
        },
        caseManagerData: {
          patient_data: {
            patient_name: "Print Patient",
            patient_id: "PAT077",
            patient_gender: "Male",
            ageYears: 38,
            ageMonths: 6,
            ageDays: 13,
            patient_ht_wt: "876kgs",
          },
          doctor_data: {
            um_id: "PRINT_DOCTOR",
            doctor_name: "Print Doctor",
          },
          symptoms: [{ symptom_name: "old symptom" }],
          moduleContents: [{ module_id: 123, content: [] }],
        },
        patientBills: [{ id: "bill" }],
      },
      patient_data: { patient_unique_id: "P1" },
      profile: {},
      userId: "U1",
      caseManagerData: {
        patient_data: {
          patient_name: "Route Patient",
          patient_id: "ROUTE",
        },
        doctor_data: {
          um_id: "ROUTE_DOCTOR",
          doctor_name: "Route Doctor",
        },
      },
      currentTcmId: 1,
      pamId: 2,
      consultationDate: "2026-07-14 17:00:00",
      defaultPrintSettings,
      frequencyList: [],
      timingList: [],
    });

    expect(payload.fileHeader).toEqual(
      expect.objectContaining({
        imageShow: true,
        showFile: "data:image/png;base64,header",
      })
    );
    expect(payload.fileFooter).toEqual(
      expect.objectContaining({
        imageShow: true,
        showFile: "data:image/png;base64,footer",
        footerHeight: 60,
        footerWidth: 500,
      })
    );
    expect(payload.fileWatermark).toEqual(
      expect.objectContaining({
        imageShow: true,
        showFile: "data:image/png;base64,watermark",
      })
    );
    expect(payload.caseManagerData.symptoms).toEqual([]);
    expect(payload.caseManagerData.moduleContents).toHaveLength(1);
    expect(payload.caseManagerData.moduleContents[0]).toEqual(
      expect.objectContaining({ module_id: SOAP_PRINT_MODULE_ID })
    );
    expect(payload.caseManagerData.patient_data).toEqual(
      expect.objectContaining({
        patient_name: "Print Patient",
        patient_id: "PAT077",
        patient_gender: "Male",
        ageYears: 38,
        ageMonths: 6,
        ageDays: 13,
        patient_ht_wt: "876kgs",
      })
    );
    expect(payload.caseManagerData.doctor_data).toEqual(
      expect.objectContaining({
        um_id: "PRINT_DOCTOR",
        doctor_name: "Print Doctor",
      })
    );
    expect(payload.patientBills).toEqual([]);
  });

  it("falls back to print settings when base print payload is unavailable", () => {
    const payload = buildSoapIndividualPrintPayload({
      soapHtml: "<h1>Subjective</h1><ul><li>Fever</li></ul>",
      basePrintPayload: null,
      patient_data: { patient_unique_id: "P1" },
      profile: {},
      userId: "U1",
      caseManagerData: {},
      currentTcmId: 1,
      pamId: 2,
      consultationDate: "2026-07-14 17:00:00",
      defaultPrintSettings: {
        ...defaultPrintSettings,
        letterhead_format: 1,
        header_image: "https://example.com/header.png",
        footer_image: "https://example.com/footer.png",
      },
      frequencyList: [],
      timingList: [],
    });

    expect(payload).toEqual(
      expect.objectContaining({
        fileHeader: expect.objectContaining({
          imageShow: true,
          showFile: "https://example.com/header.png",
        }),
        fileFooter: expect.objectContaining({
          imageShow: true,
          showFile: "https://example.com/footer.png",
        }),
      })
    );
    expect(payload.caseManagerData.moduleContents[0]).toEqual(
      expect.objectContaining({ module_id: SOAP_PRINT_MODULE_ID })
    );
  });

  it("does not read asset fields from a null base print payload", () => {
    const payload = buildSoapIndividualPrintPayload({
      soapHtml: "<h1>Subjective</h1><ul><li>Fever</li></ul>",
      basePrintPayload: null,
      patient_data: { patient_unique_id: "P1" },
      profile: {},
      userId: "U1",
      caseManagerData: {},
      currentTcmId: 1,
      pamId: 2,
      consultationDate: "2026-07-14 17:00:00",
      defaultPrintSettings: {
        ...defaultPrintSettings,
        logo_enable: "Y",
        logo_image: "https://example.com/logo.png",
        water_mark_enable: "Y",
        water_mark_image: "https://example.com/watermark.png",
        signature_enable: "Y",
        signature_image: "https://example.com/signature.png",
        header_image: "https://example.com/header.png",
        footer_image: "https://example.com/footer.png",
      },
      frequencyList: [],
      timingList: [],
    });

    expect(payload.fileLogo).toEqual(
      expect.objectContaining({ showFile: "https://example.com/logo.png" })
    );
    expect(payload.fileWatermark).toEqual(
      expect.objectContaining({ showFile: "https://example.com/watermark.png" })
    );
    expect(payload.fileSignature).toEqual(
      expect.objectContaining({ showFile: "https://example.com/signature.png" })
    );
  });

  it("maps confirmed route patient fields when print patient data is unavailable", () => {
    const payload = buildSoapIndividualPrintPayload({
      soapHtml: "<h1>Subjective</h1><ul><li>Fever</li></ul>",
      basePrintPayload: null,
      patient_data: {
        pm_fullname: "Test  Test",
        patient_unique_id: 6328056543,
        pm_id: 7564994,
        pm_pid: "PAT0000",
        pm_salutation: "Mr",
        pm_contact_no: "1231231231",
        DOB: "23rd Aug 2001",
        ageYears: 24,
        ageMonths: 10,
        ageDays: 23,
        pm_gender: "Male",
        pm_email: null,
        pm_address: "",
        pm_blood_group: null,
        patient_address: "",
      },
      profile: {},
      userId: "U1",
      caseManagerData: {},
      currentTcmId: 1,
      pamId: 2,
      consultationDate: "2026-07-16 14:33:32",
      defaultPrintSettings,
      frequencyList: [],
      timingList: [],
    });

    expect(payload.caseManagerData.patient_data).toEqual(
      expect.objectContaining({
        patient_unique_id: 6328056543,
        pm_id: 7564994,
        patient_id: "PAT0000",
        patient_salutation: "Mr",
        patient_name: "Test  Test",
        patient_dob: "23rd Aug 2001",
        patient_age: 24,
        ageYears: 24,
        ageMonths: 10,
        ageDays: 23,
        patient_gender: "Male",
        patient_contact_no: "1231231231",
        patient_email: null,
        patient_address: "",
        patient_blood_group: null,
        patient_consultaion_date: "2026-07-16 14:33:32",
      })
    );
  });
});
