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

// Generic [{name/label, count/value}] list → Donut data
export function listToDonut(list, { labelKey = "name", valueKey = "count" } = {}) {
  if (!Array.isArray(list)) return [];
  return list
    .map((it) => ({
      label: it[labelKey] ?? it.label ?? it.title ?? "Unknown",
      value: toNum(it[valueKey] ?? it.value ?? it.count),
    }))
    .filter((d) => d.label != null);
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

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
