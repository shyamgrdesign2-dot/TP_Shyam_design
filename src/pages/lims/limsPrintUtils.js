import { updateFooterImageHeight } from "../../utils/utils";
import ApiPrintSettings from "../../api/services/ApiPrintSettings";

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
