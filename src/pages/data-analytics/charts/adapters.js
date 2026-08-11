// Adapters: Pm-Core Reporting chart-series shape ({ labels, datasets:[{label,data}] })
// → Tesseract chart props. The API shape is consumed verbatim; only the
// renderer differs (Tesseract charts instead of react-chartjs-2).

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function shortenDateLabel(label) {
  if (typeof label !== "string") return label;
  const m = label.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return label;
  return `${parseInt(m[3], 10)} ${SHORT_MONTHS[parseInt(m[2], 10) - 1]}`;
}

export const HOUR_LABELS_12H = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12am";
  if (i === 12) return "12pm";
  return i < 12 ? `${i}am` : `${i - 12}pm`;
});

// LineChart / BarChart want: { data:[{x, <seriesKey>:n, ...}], series:[{key,label}], xKey }
export function seriesToXY(chartSeries, { xKey = "x" } = {}) {
  const labels = chartSeries?.labels || [];
  const datasets = chartSeries?.datasets || [];
  const series = datasets.map((d, i) => ({
    key: d.label || `s${i}`,
    label: d.label || `Series ${i + 1}`,
  }));
  const data = labels.map((label, i) => {
    const row = { [xKey]: shortenDateLabel(label) };
    datasets.forEach((d, di) => {
      row[series[di].key] = toNum(d.data?.[i]);
    });
    return row;
  });
  return { data, series, xKey };
}

// Hour-of-day series ("00"…"23") → 12-hour labels the Appointments chart uses.
export function hourSeriesToXY(chartSeries) {
  const xy = seriesToXY(chartSeries);
  if (!xy?.data?.length) return null;
  const xKey = xy.xKey || "x";
  return {
    ...xy,
    data: xy.data.map((row, i) => {
      const raw = String(row[xKey] ?? "");
      const hour = /^\d{1,2}$/.test(raw) ? Number(raw) : i;
      return { ...row, [xKey]: HOUR_LABELS_12H[hour] ?? row[xKey] };
    }),
    series: (xy.series || []).map((s) => ({
      ...s,
      label: s.label === "Appointments" ? "Visits" : s.label,
    })),
  };
}

// DonutChart wants: [{ label, value }]
export function seriesToDonut(chartSeries, { datasetIndex = 0 } = {}) {
  const labels = chartSeries?.labels || [];
  const data = chartSeries?.datasets?.[datasetIndex]?.data || [];
  return labels.map((label, i) => ({ label, value: toNum(data[i]) }));
}

// Universal donut adapter (API-CONTRACTS-CURRENT §1): newer endpoints return
// donuts as ready [{ label, value }] arrays, older ones as { labels, datasets }
// chart series. Accept either; anything else → [].
export function anyToDonut(x) {
  if (Array.isArray(x)) return listToDonut(x, { labelKey: "label", valueKey: "value" });
  if (x && Array.isArray(x.labels)) return seriesToDonut(x);
  return [];
}

// [{label,value}] donut list → single-series bar/line XY (for distributions
// the chart doctrine renders as vertical bars, e.g. bmiBands).
export function donutToXY(list, seriesLabel = "Count") {
  const d = anyToDonut(list);
  if (!d.length) return null;
  return {
    data: d.map((it) => ({ x: it.label, [seriesLabel]: it.value })),
    series: [{ key: seriesLabel, label: seriesLabel }],
    xKey: "x",
  };
}

// Generic [{name/label, count/value}] list → Donut data.
// Aggregates entries that share the same label (backend may return un-grouped rows).
export function listToDonut(list, { labelKey = "name", valueKey = "count" } = {}) {
  if (!Array.isArray(list)) return [];
  const agg = {};
  for (const it of list) {
    const label = it[labelKey] ?? it.label ?? it.title ?? "Unknown";
    if (label == null) continue;
    const value = toNum(it[valueKey] ?? it.value ?? it.count);
    agg[label] = (agg[label] || 0) + value;
  }
  return Object.entries(agg)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => (b.value || 0) - (a.value || 0));
}

// { buckets|labels:[...], series:{ current:[...], last:[...] } } → Line/Bar XY.
export function bucketSeriesToXY(obj) {
  const labels = obj?.buckets || obj?.labels || [];
  const series = obj?.series || {};
  const keys = Object.keys(series);
  const seriesDefs = keys.map((k) => ({ key: k, label: humanizeKey(k) }));
  const data = labels.map((label, i) => {
    const row = { x: label };
    keys.forEach((k) => (row[k] = toNum(series[k]?.[i])));
    return row;
  });
  return { data, series: seriesDefs, xKey: "x" };
}

// A {labels, series:{current,last}} profile → donut using the `current` series.
export function profileToDonut(obj, { seriesKey = "current" } = {}) {
  const labels = obj?.labels || obj?.buckets || [];
  const values = obj?.series?.[seriesKey] || [];
  return labels.map((label, i) => ({ label, value: toNum(values[i]) }));
}

function humanizeKey(k) {
  const map = { current: "Current period", last: "Last period" };
  return map[k] || k.replace(/^\w/, (c) => c.toUpperCase());
}

export function isEmptySeries(chartSeries) {
  const datasets = chartSeries?.datasets || [];
  if (!chartSeries || !(chartSeries.labels || []).length) return true;
  return datasets.every((d) => (d.data || []).every((v) => !toNum(v)));
}

export function isEmptyDonut(data) {
  return !Array.isArray(data) || data.length === 0 || data.every((d) => !toNum(d.value));
}

// Sum a field across an array of detail points (e.g. collection[].collection).
export function sumField(rows, key) {
  return (rows || []).reduce((a, r) => a + toNum(r?.[key]), 0);
}

// Sum a named dataset's data across a chart series (e.g. "Cancelled Appointment").
export function sumDatasetByLabel(chartSeries, label) {
  const d = (chartSeries?.datasets || []).find((x) => x.label === label);
  return (d?.data || []).reduce((a, v) => a + toNum(v), 0);
}

// Cap donut data to `max` slices, grouping the tail into "Others".
// Always sorted by count DESCENDING (UX rule: counted lists are never in
// backend/random order), hard-capped at the top `max` — no "Others" tail
// slice (user ruling: show the top five only, everywhere).
export function capDonut(data, max = 5) {
  if (!Array.isArray(data)) return data;
  return [...data].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, max);
}

// Shorten x-axis labels so vertical bar charts don't overlap.
// Common medical department abbreviations, then a general character cap.
const DEPT_SHORT = {
  paediatrics: "Pedia",
  pediatrics: "Pedia",
  gynaecology: "Gynec",
  gynecology: "Gynec",
  orthopaedics: "Ortho",
  orthopedics: "Ortho",
  ophthalmology: "Ophthal",
  dermatology: "Derma",
  cardiology: "Cardio",
  neurology: "Neuro",
  pulmonology: "Pulmo",
  gastroenterology: "Gastro",
  endocrinology: "Endo",
  nephrology: "Nephro",
  rheumatology: "Rheum",
  anaesthesiology: "Anaesth",
  anesthesiology: "Anesth",
  "general/ family physician": "Gen/Family",
  "general/family physician": "Gen/Family",
  "general medicine": "Gen Med",
  "general surgery": "Gen Surg",
  "general surgical": "Gen Surg",
};

export function compactLabel(label, maxLen = 14) {
  if (typeof label !== "string") return label;
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();
  if (DEPT_SHORT[lower]) return DEPT_SHORT[lower];
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).trimEnd() + "…";
}

export function compactDoctorLabel(label) {
  if (typeof label !== "string") return label;
  const trimmed = label.trim();
  if (trimmed.length <= 12) return trimmed;
  const drMatch = trimmed.match(/^(Dr\.?\s+)(\S+)/i);
  if (drMatch) return drMatch[1] + drMatch[2];
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) return parts[0];
  return trimmed.slice(0, 11).trimEnd() + "…";
}

export function compactXY(xy, formatter) {
  if (!xy?.data) return xy;
  const fmt = formatter || compactLabel;
  return {
    ...xy,
    data: xy.data.map((row) => ({
      ...row,
      [xy.xKey || "x"]: fmt(row[xy.xKey || "x"]),
    })),
  };
}

export function zeroFillXY(xy, knownLabels, defaultSeriesKey) {
  if (!xy) {
    return {
      data: knownLabels.map((l) => ({ x: l, [defaultSeriesKey]: 0 })),
      series: [{ key: defaultSeriesKey, label: defaultSeriesKey }],
      xKey: "x",
    };
  }
  const xKey = xy.xKey || "x";
  const existingLabels = (xy.data || []).map((r) => String(r[xKey]).trim().toLowerCase());
  const missing = knownLabels.filter((w) => {
    const wl = w.toLowerCase();
    return !existingLabels.some((e) => e === wl || e.startsWith(wl) || wl.startsWith(e));
  });
  if (!missing.length) return xy;
  const zeroRow = (label) => {
    const row = { [xKey]: label };
    for (const s of xy.series) row[s.key] = 0;
    return row;
  };
  return { ...xy, data: [...(xy.data || []), ...missing.map(zeroRow)] };
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
