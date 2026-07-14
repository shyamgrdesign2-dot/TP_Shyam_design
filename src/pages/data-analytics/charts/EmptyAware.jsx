import React from "react";
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
