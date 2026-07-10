import { buildConsultationPreviewPrintPayload } from "./buildConsultationPreviewPrintPayload";

export const SOAP_PRINT_MODULE_ID = 90000101;

const SOAP_SECTION_LABELS = new Set([
  "subjective",
  "objective",
  "assessment",
  "plan",
]);
const SOAP_SECTION_ORDER = ["Subjective", "Objective", "Assessment", "Plan"];

function cloneJson(value) {
  if (!value) return value;
  return JSON.parse(JSON.stringify(value));
}

function htmlToSoapRows(soapHtml) {
  if (!soapHtml || typeof DOMParser === "undefined") {
    return [];
  }

  const doc = new DOMParser().parseFromString(`<div>${soapHtml}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return [];

  const rows = [];
  let currentTitle = "";
  let buffer = [];
  let blocks = [];

  const flush = () => {
    const notes = buffer.join("\n").trim();
    if (notes) {
      rows.push({
        title: currentTitle,
        notes,
        blocks,
      });
    }
    buffer = [];
    blocks = [];
  };

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === 1 && /^h[1-3]$/i.test(node.tagName)) {
      flush();
      const title = (node.textContent || "").trim();
      currentTitle = SOAP_SECTION_LABELS.has(title.toLowerCase()) ? title : "";
      return;
    }

    if (node.nodeType === 1 && /^(ul|ol)$/i.test(node.tagName)) {
      const items = Array.from(node.querySelectorAll("li"))
        .map((item) => (item.textContent || "").trim())
        .filter(Boolean);
      if (items.length) {
        buffer.push(items.join("\n"));
        blocks.push({ type: "list", items });
      }
      return;
    }

    const text = (node.textContent || "").trim();
    if (text) {
      buffer.push(text);
      blocks.push({
        type: "paragraph",
        text,
        italic: node.nodeType === 1 && Boolean(node.querySelector("em, i")),
      });
    }
  });
  flush();

  const sectionMap = new Map(
    rows
      .filter((row) => row?.title)
      .map((row) => [row.title.toLowerCase(), row])
  );

  return SOAP_SECTION_ORDER.map((title) => {
    const row = sectionMap.get(title.toLowerCase());
    if (row) return row;
    return {
      title,
      notes: "Not documented.",
      blocks: [{ type: "paragraph", text: "Not documented.", italic: true }],
    };
  });
}

function buildSoapOnlyPrintSettings(defaultPrintSettings) {
  const printSettings = cloneJson(defaultPrintSettings);
  if (!printSettings?.prescription) {
    return printSettings;
  }

  const existingOptions = Array.isArray(printSettings.prescription.case_option)
    ? printSettings.prescription.case_option.map((option) => ({
        ...option,
        enable: "N",
      }))
    : [];

  printSettings.prescription.case_option = [
    ...existingOptions,
    {
      id: SOAP_PRINT_MODULE_ID,
      title: "SOAP Note",
      name: "SOAP Note",
      enable: "Y",
      custom_status: "Y",
      is_custom_module: true,
      format: "listview",
    },
  ];

  return printSettings;
}

export function buildSoapIndividualPrintPayload({
  soapHtml,
  patient_data,
  profile,
  userId,
  caseManagerData,
  currentTcmId,
  pamId,
  consultationDate,
  defaultPrintSettings,
  frequencyList,
  timingList,
}) {
  const rows = htmlToSoapRows(soapHtml);
  if (!rows.length || !defaultPrintSettings) {
    return null;
  }

  const printSettings = buildSoapOnlyPrintSettings(defaultPrintSettings);
  const soapModule = {
    module_id: SOAP_PRINT_MODULE_ID,
    origin_id: SOAP_PRINT_MODULE_ID,
    module_name: "SOAP Note",
    name: "SOAP Note",
    module_version: "v1",
    content: rows,
  };

  return buildConsultationPreviewPrintPayload({
    patient_data,
    profile,
    userId,
    caseManagerData,
    currentTcmId,
    pamId,
    consultationDate,
    symptomsData: [],
    examinationData: [],
    surgeriesData: [],
    diagnosisData: [],
    adviceData: [],
    investigationData: [],
    medicationData: [],
    vitalsData: [],
    medicalHistoryData: [],
    followUpDate: null,
    additionalNote: "",
    customModuleContents: [soapModule],
    defaultPrintSettings: printSettings,
    frequencyList,
    timingList,
    customModules: [
      {
        module_id: SOAP_PRINT_MODULE_ID,
        origin_id: SOAP_PRINT_MODULE_ID,
        name: "SOAP Note",
        version: "v1",
      },
    ],
  });
}
