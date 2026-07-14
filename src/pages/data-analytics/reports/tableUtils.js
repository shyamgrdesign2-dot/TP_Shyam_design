import { formatINR, formatNum } from "../charts/format";

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

// Trigger a browser download for a CSV blob response.
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(
    blob instanceof Blob ? blob : new Blob([blob], { type: "text/csv" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
