import { getUploadedFilePublicUrl } from "../pages/smartSync/services/templateUtils";

/** Resolve a printable image URL from a SmartSync / blank SSRX file row. */
export const getSmartSyncUploadedFileUri = (file) =>
  getUploadedFilePublicUrl(file) ||
  file?.fileUrl ||
  file?.showFile ||
  file?.smart_prescription_file ||
  file?.url ||
  file?.smart_prescription_file_url ||
  null;

/**
 * Print APIs and FETCH_SMART_RX return blank Smart Rx images as either:
 * - an array of file rows, or
 * - an object with uploaded_files (digitized / snap flows).
 * viewpdf.js expects the object shape; normalize before render.
 */
export function normalizeSmartRxDataForPrint(raw) {
  if (raw == null) return null;

  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) {
    return { uploaded_files: value };
  }

  if (typeof value === "object") {
    if (Array.isArray(value.uploaded_files)) {
      return value;
    }
    if (Array.isArray(value.data)) {
      return { ...value, uploaded_files: value.data };
    }
    return value;
  }

  return null;
}

export function getSmartRxUploadedFiles(smartRxData) {
  const normalized = normalizeSmartRxDataForPrint(smartRxData);
  if (!normalized) return [];
  return Array.isArray(normalized.uploaded_files) ? normalized.uploaded_files : [];
}
