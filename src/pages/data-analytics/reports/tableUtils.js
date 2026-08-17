import * as XLSX from "xlsx";
import { formatINR, formatNum } from "../charts/format";
import { isInNativeApp, sendMessageToParent, getReactNativeWebView } from "../../../utils/utils";
import { EVENTS } from "../../../utils/events";
import api from "../../../api/services/axiosService";
import config from "../../../config";
import { uploadDocsToAzure } from "../../medicalRecords/service";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCS_UPLOAD_BASE = { customBaseUrl: config.lab_params_api_url };

// Humanize a snake_case / camelCase key into a column header.
export function humanize(key) {
  if (!key) return "";
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

const MONEY_RE = /(amount|collection|revenue|refund|balance|paid|due|credit|advance|net|gross|price|value|fee|discount|tax)/i;

function looksMoney(key) {
  return MONEY_RE.test(key || "");
}

// Format a single cell value for display.
export function formatCell(value, key) {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    return looksMoney(key) ? formatINR(value) : formatNum(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Derive DataTable columns from the first row's keys (robust to unknown shapes).
export function deriveColumns(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const sample = rows.find((r) => r && typeof r === "object") || {};
  return Object.keys(sample).map((key) => {
    const isNum = typeof sample[key] === "number";
    return {
      id: key,
      header: humanize(key),
      align: isNum ? "right" : "left",
      sortable: true,
      minWidth: 120,
      cell: (row) => formatCell(row?.[key], key),
    };
  });
}

// Normalize a tabular payload into { rows, pagination, summary }.
export function normalizeTable(payload) {
  const src = payload?.data ?? payload;
  if (!src) return { rows: [], pagination: null, summary: null };
  if (Array.isArray(src)) return { rows: src, pagination: null, summary: null };
  return {
    rows: src.rows || src.data || [],
    pagination: src.pagination || null,
    summary: src.summary || null,
  };
}

function unwrapUploadUrl(res) {
  if (Array.isArray(res)) return res?.[0]?.url;
  return res?.data?.[0]?.url || res?.[0]?.url || res?.url || null;
}

function inAppUploadError(err) {
  const status = err?.response?.status;
  const serverMsg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "upload failed";
  const wrapped = new Error(
    status
      ? `In-app file upload failed (${status}): ${serverMsg}`
      : `In-app file upload failed: ${serverMsg}`
  );
  wrapped.cause = err;
  return wrapped;
}

function xlsxFilenameFromCsv(preferredName) {
  const base = String(preferredName || "report.csv").replace(/\.(csv|txt)$/i, "") || "report";
  return `${base}.xlsx`;
}

/**
 * Convert a CSV string/blob into an .xlsx Blob. patient-docs /api/v1/docs/upload-temp
 * allowlists xlsx (AllPatients, VaccinationAnalytics) and pdf (billing, Rx, LIMS)
 * and 404s CSV with "File type not allowed".
 */
export async function csvToXlsxBlob(payload) {
  const csvText =
    typeof payload === "string"
      ? payload
      : payload instanceof Blob
        ? await payload.text()
        : String(payload ?? "");
  const workbook = XLSX.read(csvText, { type: "string" });
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], { type: XLSX_MIME });
}

function appendXlsxToFormData(xlsxBlob, filename) {
  const formData = new FormData();
  // Field key = filename — AllPatients / VaccinationAnalytics / billing / LIMS.
  try {
    const file = new File([xlsxBlob], filename, { type: XLSX_MIME });
    formData.append(file.name, file);
  } catch {
    // Some Android WebViews throw on `new File()`; Blob+filename is equivalent.
    formData.append(filename, xlsxBlob, filename);
  }
  return formData;
}

/**
 * Same in-app download used by AllPatients + VaccinationAnalytics:
 * upload xlsx via uploadDocsToAzure → send EVENTS.DOWNLOAD { url } to the native shell.
 * Direct axios is the fallback because uploadDocsToAzure swallows 4xx internally.
 */
async function uploadXlsxForInAppDownload(xlsxBlob, filename) {
  const viaHelper = await uploadDocsToAzure(appendXlsxToFormData(xlsxBlob, filename));
  const helperUrl = unwrapUploadUrl(viaHelper);
  if (helperUrl) return helperUrl;

  try {
    const res = await api.post(
      "/api/v1/docs/upload-temp",
      appendXlsxToFormData(xlsxBlob, filename),
      DOCS_UPLOAD_BASE
    );
    const url = unwrapUploadUrl(res);
    if (url) return url;
    throw new Error("no url returned");
  } catch (e) {
    throw inAppUploadError(e);
  }
}

export function isInAppDownloadContext() {
  if (typeof window === "undefined") return false;
  return isInNativeApp() || !!getReactNativeWebView() || window.parent !== window;
}

// Browsers: blob + <a download> CSV. In-app WebView / iframe: xlsx upload +
// native DOWNLOAD message — same path as AllPatients / VaccinationAnalytics.
export async function downloadBlob(payload, filename) {
  const name = filename || "report.csv";
  const csvBlob =
    payload instanceof Blob
      ? payload
      : new Blob([payload], { type: "text/csv;charset=utf-8" });

  if (isInAppDownloadContext()) {
    const xlsxBlob = await csvToXlsxBlob(csvBlob);
    const url = await uploadXlsxForInAppDownload(xlsxBlob, xlsxFilenameFromCsv(name));
    sendMessageToParent(EVENTS.DOWNLOAD, { url });
    return;
  }

  const objectUrl = window.URL.createObjectURL(csvBlob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}
