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
          symptoms: [{ symptom_name: "old symptom" }],
          moduleContents: [{ module_id: 123, content: [] }],
        },
        patientBills: [{ id: "bill" }],
      },
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
    expect(payload.patientBills).toEqual([]);
  });
});
