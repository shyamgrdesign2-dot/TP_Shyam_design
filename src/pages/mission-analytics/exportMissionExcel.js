/**
 * Export the currently filtered Mission OPD Analytics dashboard as a multi-sheet .xlsx.
 * Uses data already loaded in the page (same snapshot as the UI).
 * xlsx / file-saver are loaded on demand so they stay out of the home shell bundle.
 */
export async function exportMissionExcel({
  kpis = {},
  charts = {},
  filters = {},
  doctorOptions = [],
  clinicOptions = [],
} = {}) {
  const [XLSXmod, fileSaverMod] = await Promise.all([
    import("xlsx"),
    import("file-saver"),
  ]);
  const XLSX = XLSXmod?.default?.utils ? XLSXmod.default : XLSXmod;
  const saveAs =
    fileSaverMod.saveAs ||
    fileSaverMod.default?.saveAs ||
    fileSaverMod.default;
  if (typeof saveAs !== "function") {
    throw new Error("file-saver saveAs is unavailable");
  }

  const wb = XLSX.utils.book_new();

  appendSheet(XLSX, wb, "Summary", buildSummaryRows(filters, doctorOptions, clinicOptions));
  appendSheet(XLSX, wb, "Key Metrics", buildKpiRows(kpis));
  appendSheet(XLSX, wb, "Appointment Status", buildDonutRows(charts.appointmentStatus));
  appendSheet(XLSX, wb, "Visit Trend", buildXyRows(charts.visitTrend, ["booked", "completed", "digitized"]));
  appendSheet(XLSX, wb, "Doctor Comparison", buildXyRows(charts.byDoctor, ["booked", "consultations", "digitized"], "Doctor"));
  appendSheet(XLSX, wb, "Age Distribution", buildXyRows(charts.ageDistribution));
  appendSheet(XLSX, wb, "Visit Frequency", buildXyRows(charts.visitFrequency));
  appendSheet(XLSX, wb, "Gender", buildDonutRows(charts.genderDistribution));
  appendSheet(XLSX, wb, "Segmentation", buildDonutRows(charts.segmentation));

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const dateStamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `mission-opd-analytics_${dateStamp}.xlsx`);
}

function appendSheet(XLSX, wb, name, rows) {
  const safeRows = rows?.length ? rows : [["No data"]];
  const ws = XLSX.utils.aoa_to_sheet(safeRows);
  // Excel sheet names max 31 chars
  XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0, 31));
}

function buildSummaryRows(filters, doctorOptions, clinicOptions) {
  const doctorLabels = resolveLabels(filters.doctor, doctorOptions) || "All doctors";
  const clinicLabels = resolveLabels(filters.clinic, clinicOptions) || "All clinics";
  const start = filters.startDate || "—";
  const end = filters.endDate || "—";

  return [
    ["Mission Hospital — OPD Analytics Export"],
    [],
    ["Exported at", new Date().toLocaleString()],
    ["Date range start", start],
    ["Date range end", end],
    ["Doctors", doctorLabels],
    ["Clinics", clinicLabels],
    [],
    ["Note", "This file mirrors the currently filtered dashboard view."],
  ];
}

function buildKpiRows(kpis) {
  const rows = [["Metric", "Value", "Delta % vs previous period"]];

  const push = (label, value, delta) => {
    rows.push([
      label,
      value == null || value === "" ? "—" : value,
      typeof delta === "number" && Number.isFinite(delta) ? delta : "—",
    ]);
  };

  push("Total footfall", kpis.totalFootfall, kpis.totalFootfallDelta);
  push("Completed", kpis.completed, kpis.completedDelta);
  push("In queue / No-show", kpis.scheduled, null);
  push("Cancelled", kpis.cancelled, null);
  push("Avg visits / day", kpis.avgVisitsPerDay, kpis.avgVisitsPerDayDelta);
  push("Busiest day", kpis.busiestDay || "No data", null);
  push("Digitization %", kpis.digitalPrescriptionPercent, null);
  push("Total digitized", kpis.totalDigitized, null);
  push("Total patients", kpis.totalPatients, null);
  push("One-time visitors", kpis.oneTime, null);
  push("Returning patients", kpis.returning, null);

  return rows;
}

function buildDonutRows(donut) {
  const rows = [["Label", "Value"]];
  if (!Array.isArray(donut) || !donut.length) return rows;
  donut.forEach((d) => {
    rows.push([d?.label ?? "", Number(d?.value) || 0]);
  });
  return rows;
}

function buildXyRows(xy, preferredKeys, xHeader = "Category") {
  if (!xy?.data?.length) {
    return [[xHeader, "Value"]];
  }
  const series = Array.isArray(xy.series) && xy.series.length
    ? xy.series
    : preferredKeys
      ? preferredKeys.map((k) => ({ key: k, label: k }))
      : Object.keys(xy.data[0] || {})
          .filter((k) => k !== (xy.xKey || "x"))
          .map((k) => ({ key: k, label: k }));

  const header = [xHeader, ...series.map((s) => s.label || s.key)];
  const rows = [header];
  const xKey = xy.xKey || "x";

  xy.data.forEach((row) => {
    rows.push([
      row.fullName || row[xKey] || "",
      ...series.map((s) => {
        const v = row[s.key];
        return typeof v === "number" ? v : Number(v) || 0;
      }),
    ]);
  });
  return rows;
}

function resolveLabels(csvIds, options) {
  if (!csvIds) return null;
  const ids = String(csvIds).split(",").filter(Boolean);
  if (!ids.length) return null;
  const map = new Map((options || []).map((o) => [String(o.value), o.label]));
  return ids.map((id) => map.get(String(id)) || id).join(", ");
}
