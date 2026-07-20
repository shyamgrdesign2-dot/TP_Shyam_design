import React, { useRef, useEffect, useCallback } from "react";
import { LineChart, BarChart, DonutChart } from "@dhspl-tatvacare/tesseract-ui";
import {
  xyOrZero,
  donutOrZero,
  isPlaceholderDonut,
  PLACEHOLDER_DONUT_COLORS,
  dayLabels,
} from "./scaffolds";

// Empty-aware chart wrappers. When there is no data they render a zero baseline
// (line/bar) or a faint placeholder ring (donut) so the chart chrome — axes,
// legend, ring — is always visible instead of a bare "No data" message.

export function LineChartZ({
  data,
  series,
  xKey = "x",
  fallbackLabels,
  fallbackSeries,
  ...rest
}) {
  const z = xyOrZero(
    { data, series, xKey },
    fallbackLabels || dayLabels(7),
    fallbackSeries || [{ key: "value", label: "Value" }]
  );
  // curve="linear" + yMin=0: the DS default curve="smooth" is a non-monotone
  // spline, so it overshoots BELOW the zero baseline at sharp drops to 0 —
  // counts can never be negative, and a dip below the axis reads as a bug.
  // (Component-level fix for tesseract-ui: monotone cubic interpolation, or
  // clamp the path to the plot area; then "smooth" becomes safe again.)
  return (
    <LineChart
      data={z.data}
      series={z.series}
      xKey={z.xKey}
      margin={{ top: 20, bottom: 24 }}
      curve="linear"
      yMin={0}
      {...rest}
    />
  );
}

export function BarChartZ({
  data,
  series,
  xKey = "x",
  fallbackLabels,
  fallbackSeries,
  ...rest
}) {
  const z = xyOrZero(
    { data, series, xKey },
    fallbackLabels || ["A", "B", "C", "D"],
    fallbackSeries || [{ key: "value", label: "Value" }]
  );
  // Horizontal bars put category labels on the left gutter, which is ~40px by
  // default — long labels ("Hypertension") get cropped. Size the gutter to the
  // longest label so text is always fully visible (capped so bars keep room).
  const margin = rest.margin ?? (rest.horizontal ? { left: categoryGutter(z.data, z.xKey) } : undefined);
  return (
    <BarChart
      data={z.data}
      series={z.series}
      xKey={z.xKey}
      stacked={rest.stacked}
      {...rest}
      {...(margin ? { margin } : {})}
    />
  );
}

function categoryGutter(data, xKey) {
  const longest = (data || []).reduce((m, d) => Math.max(m, String(d?.[xKey] ?? "").length), 0);
  // ~6.5px per character at the chart's 11-12px axis font + padding.
  return Math.min(150, Math.max(48, Math.round(longest * 6.5) + 14));
}

export function DonutChartZ({ data, colors, showPercent, showValue, centerValueFormat, legend = "none", showTooltip = true, ...rest }) {
  const d = donutOrZero(data);
  const placeholder = isPlaceholderDonut(d);

  // tesseract-ui DonutChart bug: a single 100% slice is one SVG arc whose
  // start and end points coincide, and SVG renders such an arc as NOTHING —
  // the ring silently vanishes (all placeholder donuts and every real
  // one-category donut hit this). Pad with an invisible epsilon slice so the
  // arc stays under 360° and actually draws. The epsilon is sub-pixel (no
  // hover target) and the center total is rounded back to the true value.
  const visible = d.filter((s) => Number(s?.value) > 0);
  let chartData = d;
  if (visible.length === 1) {
    const s = visible[0];
    chartData = [...d, { ...s, label: s.label, value: Number(s.value) * 1e-6 }];
  }
  const centerFmt = placeholder
    ? () => "0"
    : (v) => {
        const rounded = Math.round(Number(v));
        return centerValueFormat ? centerValueFormat(rounded) : rounded;
      };

  return (
    <DonutChart
      data={chartData}
      colors={placeholder ? [...PLACEHOLDER_DONUT_COLORS, ...PLACEHOLDER_DONUT_COLORS] : colors}
      showPercent={placeholder ? false : showPercent}
      showValue={placeholder ? false : showValue}
      centerValueFormat={centerFmt}
      legend={legend}
      showTooltip={showTooltip}
      {...rest}
    />
  );
}

// Stacked BarChart wrapper that injects a "Total" row into the Tesseract
// tooltip. The Tesseract BarChart doesn't expose tooltip customization, so we
// observe DOM mutations and append the total when the tooltip appears.
export function StackedBarWithTotal({ data, series, xKey = "x", ...rest }) {
  const wrapRef = useRef(null);
  const totalsRef = useRef({});

  useEffect(() => {
    const map = {};
    for (const row of data || []) {
      const name = row[xKey];
      const t = (series || []).reduce((s, se) => s + (Number(row[se.key]) || 0), 0);
      map[name] = t;
    }
    totalsRef.current = map;
  }, [data, series, xKey]);

  const injectTotal = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const tip = el.querySelector("[style*='position: absolute'][style*='z-index']");
    if (!tip || tip.querySelector("[data-total-row]")) return;
    const titleDiv = tip.querySelector("div");
    if (!titleDiv) return;
    const doctorName = titleDiv.textContent;
    const total = totalsRef.current[doctorName];
    if (total == null) return;
    const row = document.createElement("div");
    row.setAttribute("data-total-row", "1");
    row.style.cssText =
      "display:flex;align-items:center;gap:8px;font-size:12px;line-height:18px;" +
      "border-top:1px solid var(--tesseract-border-neutral);margin-top:4px;padding-top:4px";
    row.innerHTML =
      '<span style="width:9px;height:9px;flex-shrink:0"></span>' +
      '<span style="color:var(--tesseract-fg-secondary);margin-right:auto">Total</span>' +
      `<strong style="color:var(--tesseract-fg-primary);font-weight:600">${total}</strong>`;
    tip.appendChild(row);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new MutationObserver(injectTotal);
    obs.observe(el, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [injectTotal]);

  return (
    <div ref={wrapRef}>
      <BarChartZ data={data} series={series} xKey={xKey} stacked {...rest} />
    </div>
  );
}
