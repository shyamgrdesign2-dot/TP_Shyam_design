// Zero-state chart scaffolds. Charts must render their chrome (axes, legend,
// ring) even when there is no data — so when the adapted data is empty we feed
// a zero-filled dataset built from the section's reference labels/series
// (mirrors the legacy analytics widgets). Line/bar show a flat zero baseline;
// donut shows a single faint placeholder ring.

export const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4"];

// last-N day labels like "08 Jul" (app runtime — Date is fine here)
export function dayLabels(n = 7) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
  }
  return out;
}

// Build a zero-filled { data, series, xKey } for LineChart/BarChart.
export function zeroXY(labels, series) {
  const keys = series.map((s) => s.key);
  return {
    xKey: "x",
    series,
    data: (labels || []).map((l) => {
      const row = { x: l };
      keys.forEach((k) => (row[k] = 0));
      return row;
    }),
  };
}

// Real XY if it has rows, else a zero baseline over the fallback labels/series.
export function xyOrZero(real, fallbackLabels, fallbackSeries) {
  if (real?.data?.length && real?.series?.length) return real;
  return zeroXY(fallbackLabels, fallbackSeries);
}

// A single faint slice so the donut ring is still visible with no data.
export const PLACEHOLDER_DONUT = [{ label: "No data", value: 1 }];
export const PLACEHOLDER_DONUT_COLORS = ["var(--tesseract-slate-200)"];

// Real donut data if non-empty, else the placeholder ring.
export function donutOrZero(data) {
  const has = Array.isArray(data) && data.some((d) => Number(d?.value) > 0);
  return has ? data : PLACEHOLDER_DONUT;
}
export function isPlaceholderDonut(data) {
  return data === PLACEHOLDER_DONUT;
}
