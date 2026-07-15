export const SOAP_PRINT_MODULE_ID = 90000101;

const SOAP_SECTION_ORDER = ["Subjective", "Objective", "Assessment", "Plan"];
const SOAP_SECTION_TITLE_BY_KEY = new Map(
  SOAP_SECTION_ORDER.map((title) => [title.toLowerCase(), title])
);
const BLOCK_CONTAINER_TAGS = new Set([
  "ARTICLE",
  "DIV",
  "SECTION",
]);

function cloneJson(value) {
  if (!value) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  return value == null ? "" : String(value).trim();
}

function normalizeInlineText(value) {
  return value == null
    ? ""
    : String(value)
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n");
}

function isBoldStyle(style = "") {
  const normalized = String(style).toLowerCase();
  if (/font-weight\s*:\s*(bold|bolder)/.test(normalized)) return true;
  const match = normalized.match(/font-weight\s*:\s*(\d+)/);
  return match ? Number(match[1]) >= 600 : false;
}

function isItalicStyle(style = "") {
  return /font-style\s*:\s*(italic|oblique)/i.test(String(style));
}

function pushRun(runs, text, marks) {
  const normalizedText = normalizeInlineText(text);
  if (!normalizedText) return;
  const run = {
    text: normalizedText,
    ...(marks.bold ? { bold: true } : {}),
    ...(marks.italic ? { italic: true } : {}),
  };
  const prev = runs[runs.length - 1];
  if (
    prev &&
    Boolean(prev.bold) === Boolean(run.bold) &&
    Boolean(prev.italic) === Boolean(run.italic)
  ) {
    prev.text += run.text;
    return;
  }
  runs.push(run);
}

function getInlineRuns(node, inheritedMarks = {}) {
  const runs = [];
  const walk = (currentNode, marks) => {
    if (!currentNode) return;
    if (currentNode.nodeType === 3) {
      pushRun(runs, currentNode.textContent || "", marks);
      return;
    }
    if (currentNode.nodeType !== 1) return;
    if (/^br$/i.test(currentNode.tagName)) {
      pushRun(runs, "\n", marks);
      return;
    }

    const style = currentNode.getAttribute?.("style") || "";
    const nextMarks = {
      bold:
        Boolean(marks.bold) ||
        /^(b|strong)$/i.test(currentNode.tagName) ||
        isBoldStyle(style),
      italic:
        Boolean(marks.italic) ||
        /^(i|em)$/i.test(currentNode.tagName) ||
        isItalicStyle(style),
    };

    Array.from(currentNode.childNodes || []).forEach((child) =>
      walk(child, nextMarks)
    );
  };

  walk(node, {
    bold: Boolean(inheritedMarks.bold),
    italic: Boolean(inheritedMarks.italic),
  });
  return runs;
}

function getRunsText(runs = []) {
  return runs.map((run) => run?.text || "").join("").trim();
}

function getBlockText(block) {
  if (block?.type === "list" || block?.type === "ordered-list") {
    return Array.isArray(block.items)
      ? block.items
          .map((item) =>
            typeof item === "string" ? item : item?.text || getRunsText(item?.runs)
          )
          .filter(Boolean)
          .join("\n")
      : "";
  }
  return block?.text || getRunsText(block?.runs);
}

function htmlToSoapRows(soapHtml) {
  if (!soapHtml || typeof DOMParser === "undefined") {
    return [];
  }

  const doc = new DOMParser().parseFromString(`<div>${soapHtml}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return [];

  let blocks = [];

  const appendNode = (node) => {
    if (node.nodeType === 3) {
      const runs = getInlineRuns(node);
      const text = normalizeText(getRunsText(runs));
      if (text) {
        blocks.push({
          type: "paragraph",
          text,
          runs,
          isFallback: text.toLowerCase() === "not documented.",
        });
      }
      return;
    }

    if (node.nodeType !== 1) return;

    if (/^h[1-6]$/i.test(node.tagName)) {
      const runs = getInlineRuns(node);
      const title = normalizeText(getRunsText(runs));
      const canonicalTitle = SOAP_SECTION_TITLE_BY_KEY.get(title.toLowerCase());
      if (canonicalTitle || title) {
        blocks.push({
          type: "heading",
          text: canonicalTitle || title,
          runs: canonicalTitle ? [{ text: canonicalTitle }] : runs,
          level: Number(node.tagName.slice(1)) || 2,
        });
      }
      return;
    }

    if (/^(ul|ol)$/i.test(node.tagName)) {
      const items = Array.from(node.querySelectorAll("li"))
        .map((item) => {
          const runs = getInlineRuns(item);
          const text = normalizeText(getRunsText(runs));
          return text ? { text, runs } : null;
        })
        .filter(Boolean);
      if (items.length) {
        blocks.push({
          type: node.tagName.toLowerCase() === "ol" ? "ordered-list" : "list",
          items,
        });
      }
      return;
    }

    if (BLOCK_CONTAINER_TAGS.has(node.tagName)) {
      const hasBlockChildren = Array.from(node.children || []).some((child) =>
        /^(article|div|h[1-6]|ol|p|section|ul)$/i.test(child.tagName)
      );
      if (hasBlockChildren) {
        Array.from(node.childNodes).forEach(appendNode);
        return;
      }
    }

    const runs = getInlineRuns(node);
    const text = normalizeText(getRunsText(runs));
    if (text) {
      blocks.push({
        type: "paragraph",
        text,
        runs,
        isFallback: text.toLowerCase() === "not documented.",
      });
    }
  };

  Array.from(root.childNodes).forEach(appendNode);
  blocks = blocks.filter((block) => normalizeText(getBlockText(block)));

  if (!blocks.length) return [];

  return [
    {
      title: "",
      notes: blocks.map(getBlockText).filter(Boolean).join("\n"),
      blocks,
      renderMode: "document",
    },
  ];
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
      is_soap_print_module: true,
      format: "listview",
    },
  ];

  return printSettings;
}

function normalizePrintAsset(asset, fallbackUrl) {
  const showFile =
    asset?.showFile ||
    asset?.uploadFile ||
    asset?.url ||
    asset?.image ||
    fallbackUrl ||
    "";

  if (!showFile) return null;

  return {
    ...(asset && typeof asset === "object" ? asset : {}),
    imageShow: asset?.imageShow !== false,
    showFile,
  };
}

function buildPrintAssetsFromSettings(printSettings, basePayload = {}) {
  if (!printSettings) {
    return {
      fileHeader: null,
      fileFooter: null,
      fileLogo: null,
      fileWatermark: null,
      fileSignature: null,
    };
  }

  return {
    fileLogo:
      printSettings.logo_enable === "Y"
        ? normalizePrintAsset(basePayload.fileLogo, printSettings.logo_image)
        : null,
    fileWatermark:
      printSettings.water_mark_enable === "Y"
        ? normalizePrintAsset(basePayload.fileWatermark, printSettings.water_mark_image)
        : null,
    fileSignature:
      printSettings.signature_enable === "Y"
        ? normalizePrintAsset(basePayload.fileSignature, printSettings.signature_image)
        : null,
    fileHeader: normalizePrintAsset(basePayload.fileHeader, printSettings.header_image),
    fileFooter: normalizePrintAsset(basePayload.fileFooter, printSettings.footer_image),
  };
}

function mapPatientDataForPrint(patientData, consultationDate, existing = {}) {
  return {
    ...existing,
    patient_unique_id:
      patientData?.patient_unique_id || existing?.patient_unique_id,
    patient_name:
      patientData?.pm_fullname ||
      existing?.patient_name ||
      patientData?.patient_name,
    patient_id: patientData?.pm_pid || existing?.patient_id,
    patient_contact_no:
      patientData?.pm_contact_no || existing?.patient_contact_no,
    patient_gender: patientData?.pm_gender || existing?.patient_gender,
    patient_age: patientData?.ageYears || patientData?.age || existing?.patient_age,
    patient_consultaion_date:
      consultationDate || existing?.patient_consultaion_date,
    patient_salutation:
      patientData?.pm_salutation || existing?.patient_salutation,
    patient_address: patientData?.pm_address || existing?.patient_address,
    patient_blood_group:
      patientData?.pm_blood_group || existing?.patient_blood_group,
    patient_dob: patientData?.pm_dob || existing?.patient_dob,
    patient_email: patientData?.pm_email || existing?.patient_email,
    patient_reference_id:
      patientData?.pm_reference_id ||
      patientData?.mrno ||
      existing?.patient_reference_id,
    pam_id: patientData?.pam_id || existing?.pam_id,
  };
}

function mapDoctorDataForPrint(profile, userId, existing) {
  if (existing && Object.keys(existing).length > 0) {
    return existing;
  }

  return {
    um_id: userId,
    doctor_name: profile?.um_name,
    dp_id: profile?.dp_id,
    dp_name: profile?.dp_name,
    gmc_no: profile?.gmc_no,
    um_qualifications: profile?.um_qualifications,
  };
}

export function buildSoapIndividualPrintPayload({
  soapHtml,
  basePrintPayload,
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
  const sourcePrintSettings = basePrintPayload?.printSettings || defaultPrintSettings;
  if (!rows.length || !sourcePrintSettings) {
    return null;
  }

  const printSettings = buildSoapOnlyPrintSettings(sourcePrintSettings);
  const soapModule = {
    module_id: SOAP_PRINT_MODULE_ID,
    origin_id: SOAP_PRINT_MODULE_ID,
    module_name: "SOAP Note",
    name: "SOAP Note",
    module_version: "v1",
    content: rows,
  };
  const {
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
  } = buildPrintAssetsFromSettings(printSettings, basePrintPayload);
  const baseCaseManagerData = basePrintPayload?.caseManagerData || {};

  return {
    ...(basePrintPayload || {}),
    mode: "NORMAL",
    caseManagerData: {
      ...baseCaseManagerData,
      ...(caseManagerData || {}),
      tcm_id: currentTcmId,
      pam_id: pamId,
      consultation_date: consultationDate,
      patient_data: mapPatientDataForPrint(
        patient_data,
        consultationDate,
        caseManagerData?.patient_data || baseCaseManagerData?.patient_data
      ),
      doctor_data: mapDoctorDataForPrint(
        profile,
        userId,
        caseManagerData?.doctor_data ||
          caseManagerData?.doctor_Data ||
          baseCaseManagerData?.doctor_data ||
          baseCaseManagerData?.doctor_Data
      ),
      symptoms: [],
      examination: [],
      surgeries: [],
      diagnosis: [],
      medicine: [],
      advice: [],
      investigation: [],
      vitals: [],
      medical_history: [],
      follow_up_date: null,
      visit_advice: "",
      moduleContents: [soapModule],
    },
    columns: [],
    initialRows: [],
    frequencyList: frequencyList || basePrintPayload?.frequencyList,
    timingList: timingList || basePrintPayload?.timingList,
    printSettings,
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
    customModules: [
      {
        module_id: SOAP_PRINT_MODULE_ID,
        origin_id: SOAP_PRINT_MODULE_ID,
        name: "SOAP Note",
        version: "v1",
      },
    ],
    patientBills: [],
    advanceReceipts: [],
    patientWalletBalance: 0,
    patientUniqueId: patient_data?.patient_unique_id,
    tcmId: currentTcmId,
  };
}
