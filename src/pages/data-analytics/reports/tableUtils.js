import { formatINR, formatNum } from "../charts/format";
import { isInNativeApp, sendMessageToParent } from "../../../utils/utils";
import { EVENTS } from "../../../utils/events";
import { uploadDocsToAzure } from "../../medicalRecords/service";

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

// Trigger a CSV download. Browsers use a blob + <a download>; the in-app
// WebView (tablet/phone) cannot start that download, so we upload the file
// and hand the URL to the native shell — same path as billing / Rx / LIMS.
export async function downloadBlob(payload, filename) {
  const name = filename || "report.csv";
  const blob =
    payload instanceof Blob
      ? payload
      : new Blob([payload], { type: "text/csv;charset=utf-8" });

  if (isInNativeApp()) {
    const file = new File([blob], name, { type: blob.type || "text/csv" });
    const formData = new FormData();
    formData.append(file.name, file);
    const res = await uploadDocsToAzure(formData);
    const url = res?.[0]?.url;
    if (!url) throw new Error("In-app download upload failed");
    sendMessageToParent(EVENTS.DOWNLOAD, { url });
    return;
  }

  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}
