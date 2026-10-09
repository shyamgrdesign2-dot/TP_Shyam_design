import { updateFooterImageHeight } from "../../utils/utils";
import ApiPrintSettings from "../../api/services/ApiPrintSettings";
import config from "../../config";
import QRCode from "qrcode";
import { fetchPrintSetting } from "../opdBilling/service";

export const LIMS_SETTINGS_KEY = "lims_print_settings";
export const LAB_RESULTS_CASE_ID = 15;

export function fileToBase64(file) {
  return new Promise((resolve) => {
    if (!(file instanceof File) && !(file instanceof Blob)) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

export async function serializeFileState(fileState) {
  if (!fileState) return null;
  if (fileState.uploadFile) {
    const base64 = await fileToBase64(fileState.uploadFile);
    return {
      imageShow: fileState.imageShow,
      showFile: base64 || fileState.showFile,
      crop: fileState.crop,
    };
  }
  if (!fileState.showFile) return null;
  return {
    imageShow: fileState.imageShow,
    showFile: fileState.showFile,
    crop: fileState.crop,
  };
}

/** @deprecated Prefer fetchLimsPrintSettings / saveLimsPrintSettingsToApi */
export function saveLimsSettings(ps, files) {
  try {
    localStorage.setItem(LIMS_SETTINGS_KEY, JSON.stringify({ printSettings: ps, files }));
    return true;
  } catch (e) {
    return false;
  }
}

/** @deprecated Prefer fetchLimsPrintSettings */
export function loadLimsSettings() {
  try {
    const raw = localStorage.getItem(LIMS_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ensureLabOption(ps) {
  if (!ps) return ps;
  if (!ps.prescription?.case_option) {
    ps.prescription = { case_option: [] };
  }
  const has = ps.prescription.case_option.some((o) => o.id === LAB_RESULTS_CASE_ID);
  if (!has) {
    ps.prescription.case_option.push({
      id: LAB_RESULTS_CASE_ID,
      title: "Lab Results",
      format: "inline",
      enable: "Y",
      custom_status: "Y",
    });
  }
  ps.prescription.case_option = ps.prescription.case_option.filter(
    (o) => o.id === LAB_RESULTS_CASE_ID,
  );
  const opt = ps.prescription.case_option.find((o) => o.id === LAB_RESULTS_CASE_ID);
  if (opt) opt.title = "Lab Results";
  return ps;
}

export function initFileStates(ps, setters) {
  const { setFileLogo, setFileWatermark, setFileSignature, setFileHeader, setFileFooter } = setters;
  if (ps.logo_enable === "Y" && ps.logo_image) setFileLogo({ imageShow: true, showFile: ps.logo_image });
  if (ps.water_mark_enable === "Y" && ps.water_mark_image) setFileWatermark({ imageShow: true, showFile: ps.water_mark_image });
  if (ps.signature_enable === "Y" && ps.signature_image) setFileSignature({ imageShow: true, showFile: ps.signature_image });
  if (ps.header_image) setFileHeader({ imageShow: true, showFile: ps.header_image });
  if (ps.footer_image) updateFooterImageHeight({ showFile: ps.footer_image }, setFileFooter, true);
}

/**
 * GET /api/v1/printsettings/lims
 * Returns normalized print-settings object (or null if none / error).
 */
export async function fetchLimsPrintSettings() {
  try {
    const result = await ApiPrintSettings.getLimsPrintsettings();
    if (!result?.status) return null;
    const data = result.data ?? result.result ?? null;
    if (!data || typeof data !== "object") return null;
    return ensureLabOption(JSON.parse(JSON.stringify(data)));
  } catch (e) {
    console.error("LIMS: failed to fetch print settings", e);
    return null;
  }
}

/**
 * DELETE /api/v1/printsettings/lims then GET defaults from the same API.
 */
export async function resetLimsPrintSettingsToApiDefaults() {
  try {
    await ApiPrintSettings.deleteLimsPrintsettings();
  } catch (e) {
    // Continue to GET — service may already have no saved LIMS settings.
    console.warn("LIMS: delete print settings failed (continuing to refetch)", e);
  }
  const settings = await fetchLimsPrintSettings();
  if (!settings) {
    throw new Error("Failed to load LIMS default print settings");
  }
  return settings;
}

/**
 * Build multipart payload matching /api/v1/printsettings/lims form fields.
 */
export function buildLimsPrintSettingsPayload(printSettings, files = {}) {
  const {
    fileLogo,
    fileHeader,
    fileFooter,
    fileWatermark,
    fileSignature,
  } = files;

  return {
    letterhead_format: printSettings?.letterhead_format,
    whatsapp_letterhead_format: printSettings?.whatsapp_letterhead_format,
    logo_enable: printSettings?.logo_enable,
    signature_enable: printSettings?.signature_enable,
    qrcode_enable: printSettings?.qrcode_enable,
    water_mark_enable: printSettings?.water_mark_enable,
    signature_image_delete:
      printSettings?.signature_image_delete !== undefined
        ? printSettings.signature_image_delete
        : 0,
    prescription: JSON.stringify(printSettings?.prescription ?? {}),
    header_footer: JSON.stringify(printSettings?.header_footer ?? {}),
    page_format: JSON.stringify(printSettings?.page_format ?? {}),
    logo_image: fileLogo?.uploadFile || "",
    header_image: fileHeader?.uploadFile || "",
    footer_image: fileFooter?.uploadFile || "",
    water_mark_image: fileWatermark?.uploadFile || "",
    signature_image: fileSignature?.uploadFile || "",
  };
}

/**
 * POST /api/v1/printsettings/lims
 */
export async function saveLimsPrintSettingsToApi(printSettings, files = {}) {
  const payload = buildLimsPrintSettingsPayload(printSettings, files);
  const formData = new FormData();
  Object.keys(payload).forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) return;
    formData.append(key, value);
  });

  const result = await ApiPrintSettings.saveLimsPrintsettings(formData);
  if (result?.status) {
    return result.data ?? result.result ?? true;
  }
  throw new Error(result?.error || result?.message || "Failed to save LIMS print settings");
}

export function groupByReport(inputs) {
  const map = new Map();
  (inputs || []).forEach((inp) => {
    if (!inp?.testName || inp.testName === "Remarks") return;
    const key = (inp.reportName || "General").trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(inp);
  });
  return map;
}

/** ViewPDF groups all inputs per report, including Remarks, for print/PDF output. */
export function groupByReportForPrint(inputs) {
  const map = new Map();
  (inputs || []).forEach((inp) => {
    if (!inp?.testName) return;
    const key = (inp.reportName || "General").trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(inp);
  });
  return map;
}

export function isRemarksTest(test) {
  return test?.testName === "Remarks";
}

/** Match ViewPDF: Remarks show value only, other tests include units. */
export function formatLabResultValue(test) {
  if (isRemarksTest(test)) return String(test?.value ?? "");
  return [String(test?.value ?? ""), test?.units || ""].filter(Boolean).join(" ");
}

export function rangeText(inp) {
  const rr = inp.refRange;
  if (!rr || !Array.isArray(rr.ranges) || rr.ranges.length === 0) return "";
  const r = rr.ranges[0];
  if (r.min != null && r.max != null && r.min !== "" && r.max !== "")
    return `${r.min} - ${r.max}`;
  return "";
}

export function arrowSymbol(dir) {
  if (dir === "UP") return "▲";
  if (dir === "DOWN") return "▼";
  return "";
}

/** Same margin mapping used by bill/Rx print PDFs (values in cm → points). */
const CM_TO_PT = 25;
const DEFAULT_MARGIN_PT = 0.75 * 30;

function getLimsMarginKey(letterheadFormat) {
  const format = Number(letterheadFormat);
  if (format === 0) return "custom_letterhead_margin";
  if (format === 1) return "uploaded_letterhead_margin";
  if (format === 2) return "margin";
  return null;
}

export function getLimsMarginByFormat(letterheadFormat, headerFooter, position, defaultCm = 0.5) {
  const marginType = getLimsMarginKey(letterheadFormat);
  if (!marginType) {
    return Number.isFinite(defaultCm) ? defaultCm * CM_TO_PT : DEFAULT_MARGIN_PT;
  }

  const raw = headerFooter?.[marginType]?.[position];
  if (raw === "" || raw == null) {
    return (Number.isFinite(defaultCm) ? defaultCm : 0.5) * CM_TO_PT;
  }

  const value = Number(raw);
  // Match bill print: explicit 0 means "unset" → fall back to default margin.
  const effectiveCm =
    Number.isFinite(value) && value > 0
      ? value
      : Number.isFinite(defaultCm)
        ? defaultCm
        : 0.5;
  return effectiveCm * CM_TO_PT;
}

/** CSS preview uses ~28px per cm to match the on-screen A4 card scale. */
export function getLimsMarginCssPx(letterheadFormat, headerFooter, position, defaultCm = 0.5) {
  const marginType = getLimsMarginKey(letterheadFormat);
  if (!marginType) {
    return (Number.isFinite(defaultCm) ? defaultCm : 0.5) * 28;
  }

  const raw = headerFooter?.[marginType]?.[position];
  if (raw === "" || raw == null) {
    return (Number.isFinite(defaultCm) ? defaultCm : 0.5) * 28;
  }

  const value = Number(raw);
  const effectiveCm =
    Number.isFinite(value) && value > 0
      ? value
      : Number.isFinite(defaultCm)
        ? defaultCm
        : 0.5;
  return effectiveCm * 28;
}

/** Same target URL as OPD bill PDF QR (BillOtherSettings). */
export function buildBillingStyleQrTargetUrl(um_contact, hm_refer_code) {
  if (um_contact == null || um_contact === "" || hm_refer_code == null || hm_refer_code === "") {
    return null;
  }
  const contactNum = parseInt(um_contact, 10);
  if (!Number.isFinite(contactNum)) return null;
  return `${config.doctor_website_url}${contactNum.toString(36)}_${hm_refer_code}`;
}

async function resolveQrContactFields(printSettings, profile, doctorUmId) {
  let um_contact = printSettings?.um_contact ?? profile?.um_contact;
  let hm_refer_code = printSettings?.hm_refer_code;

  if ((!um_contact || !hm_refer_code) && doctorUmId) {
    try {
      const billingSettings = await fetchPrintSetting(doctorUmId);
      um_contact = um_contact ?? billingSettings?.um_contact;
      hm_refer_code = hm_refer_code ?? billingSettings?.hm_refer_code;
    } catch (error) {
      console.warn("LIMS: billing print settings fallback for QR failed", error);
    }
  }

  return { um_contact, hm_refer_code };
}

/** Client-side QR — same sources as billing print settings, no agents API. */
export async function resolveLimsQrCodeDataUrl({ printSettings, profile, doctorUmId } = {}) {
  try {
    const publishUrl = profile?.website_publish ? profile?.publish_url : null;
    const { um_contact, hm_refer_code } = await resolveQrContactFields(
      printSettings,
      profile,
      doctorUmId,
    );
    const billingUrl = buildBillingStyleQrTargetUrl(um_contact, hm_refer_code);
    const qrCodeUrl = billingUrl || publishUrl;
    if (!qrCodeUrl) return null;
    return await QRCode.toDataURL(qrCodeUrl);
  } catch (error) {
    console.error("Failed to generate LIMS QR code:", error);
    return null;
  }
}

/** CSS classes used by normal print settings for page-format font families. */
export const LIMS_PREVIEW_FONT_CLASS = {
  Roboto: "fontroboto",
  "Times-Roman": "fonttimesroman",
  Verdana: "fontverdana",
  Calibri: "fontcalibri",
  Tahoma: "fonttahoma",
  Arial: "fontroboto",
};


