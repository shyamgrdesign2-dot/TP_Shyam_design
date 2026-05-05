/**
 * Download tabular data as a CSV file (opens correctly in Excel).
 * BOM prefix ensures Excel uses correct UTF-8 encoding.
 */
export function downloadAsExcel(filename, headers, rows) {
  const csv = [
  headers.join(","),
  ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].
  join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}