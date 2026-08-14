import React, { useRef, useEffect, useCallback, useMemo } from "react";
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
  showAverage,
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

  const autoAvg = showAverage !== false && z.series?.length === 1 && !rest.horizontal && !rest.stacked;
  if (autoAvg) {
    return (
      <BarChartWithAvg data={z.data} series={z.series} xKey={z.xKey} rest={rest} margin={margin} />
    );
  }

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

function BarChartWithAvg({ data, series, xKey, rest, margin }) {
  const wrapRef = useRef(null);
  const key = series[0]?.key;
  const avg = useMemo(() => {
    const vals = (data || []).map((d) => Number(d[key]) || 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [data, key]);
  const fmtAvg = Math.round(avg * 10) / 10;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !avg) return;
    const inject = () => {
      const svg = el.querySelector("svg");
      if (!svg || svg.querySelector("[data-avg-line]")) return;
      const ticks = svg.querySelectorAll("g[pointer-events='none'] line");
      if (ticks.length < 2) return;
      const tickVals = [];
      const tickYs = [];
      svg.querySelectorAll("text").forEach((t) => {
        const n = Number(t.textContent);
        if (!isNaN(n) && t.getAttribute("text-anchor") === "end") {
          tickVals.push(n);
          tickYs.push(Number(t.getAttribute("y")));
        }
      });
      if (tickVals.length < 2) return;
      const [v0, v1] = [tickVals[0], tickVals[tickVals.length - 1]];
      const [y0, y1] = [tickYs[0], tickYs[tickYs.length - 1]];
      const yAvg = y0 + ((avg - v0) / (v1 - v0)) * (y1 - y0);
      const x1 = Number(ticks[0].getAttribute("x1"));
      const x2 = Number(ticks[0].getAttribute("x2"));
      const ns = "http://www.w3.org/2000/svg";
      const line = document.createElementNS(ns, "line");
      line.setAttribute("data-avg-line", "1");
      line.setAttribute("x1", x1);
      line.setAttribute("x2", x2);
      line.setAttribute("y1", yAvg);
      line.setAttribute("y2", yAvg);
      line.setAttribute("stroke", "var(--tesseract-slate-500)");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-dasharray", "6 4");
      line.setAttribute("opacity", "0.7");
      svg.appendChild(line);
      const label = document.createElementNS(ns, "text");
      label.setAttribute("data-avg-line", "1");
      label.setAttribute("x", x2);
      label.setAttribute("y", yAvg - 6);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("fill", "var(--tesseract-slate-500)");
      label.setAttribute("font-size", "11");
      label.setAttribute("font-weight", "500");
      label.textContent = `Avg: ${fmtAvg}`;
      svg.appendChild(label);
    };
    const tipInject = () => {
      const tip = el.querySelector("[style*='position: absolute'][style*='z-index']");
      if (!tip || tip.querySelector("[data-avg-row]")) return;
      const row = document.createElement("div");
      row.setAttribute("data-avg-row", "1");
      row.style.cssText =
        "display:flex;align-items:center;gap:8px;font-size:12px;line-height:18px;" +
        "border-top:1px solid var(--tesseract-border-neutral);margin-top:4px;padding-top:4px";
      row.innerHTML =
        '<span style="width:9px;height:9px;flex-shrink:0;border:1.5px dashed var(--tesseract-slate-400);border-radius:2px"></span>' +
        '<span style="color:var(--tesseract-fg-secondary);margin-right:auto">Avg</span>' +
        `<strong style="color:var(--tesseract-fg-primary);font-weight:600">${fmtAvg}</strong>`;
      tip.appendChild(row);
    };
    const raf = requestAnimationFrame(inject);
    const obs = new MutationObserver(() => { inject(); tipInject(); });
    obs.observe(el, { childList: true, subtree: true });
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [avg, fmtAvg]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <BarChart
        data={data}
        series={series}
        xKey={xKey}
        {...rest}
        {...(margin ? { margin } : {})}
      />
    </div>
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
    // row.style.cssText =
    //   "display:flex;align-items:center;gap:8px;font-size:12px;line-height:18px;" +
    //   "border-top:1px solid var(--tesseract-border-neutral);margin-top:4px;padding-top:4px";
    // row.innerHTML =
    //   '<span style="width:9px;height:9px;flex-shrink:0"></span>' +
    //   '<span style="color:var(--tesseract-fg-secondary);margin-right:auto">Total</span>' +
    //   `<strong style="color:var(--tesseract-fg-primary);font-weight:600">${total}</strong>`;
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
