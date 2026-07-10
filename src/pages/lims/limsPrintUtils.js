import { updateFooterImageHeight } from "../../utils/utils";

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

export function saveLimsSettings(ps, files) {
  try {
    localStorage.setItem(LIMS_SETTINGS_KEY, JSON.stringify({ printSettings: ps, files }));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadLimsSettings() {
  try {
    const raw = localStorage.getItem(LIMS_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ensureLabOption(ps) {
  if (!ps.prescription?.case_option) {
    ps.prescription = { case_option: [] };
  }
  const has = ps.prescription.case_option.some((o) => o.id === LAB_RESULTS_CASE_ID);
  if (!has) {
    ps.prescription.case_option.push({
      id: LAB_RESULTS_CASE_ID,
      title: "Lab Results",
      format: "table",
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
