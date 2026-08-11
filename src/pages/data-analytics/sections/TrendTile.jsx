import React, { useState } from "react";
import { ChartTile } from "./ChartLayout";
import { LineChartZ, BarChartZ } from "../charts/EmptyAware";

// Boxy icon-only chart-type switch (per the prototype reference): a muted
// rounded container with two 28×24 icon buttons; the active one gets a white
// chip, primary-colored icon and a soft shadow.
function ChartTypeToggle({ value, onChange }) {
  const btn = (active) => ({
    display: "flex",
    height: 24,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--tesseract-radius-6)",
    border: 0,
    padding: 0,
    cursor: "pointer",
    transition: "all 150ms",
    background: active ? "var(--tesseract-bg-surface, #fff)" : "transparent",
    color: active
      ? "var(--tesseract-blue-600, #2563eb)"
      : "var(--tesseract-slate-400, #94a3b8)",
    boxShadow: active ? "var(--tesseract-shadow-xs)" : "none",
  });
  return (
    <span
      role="group"
      aria-label="Chart type"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        borderRadius: "var(--tesseract-radius-8)",
        background: "var(--tesseract-slate-100, #f1f5f9)",
        padding: 2,
      }}
    >
      <button type="button" aria-label="Line chart" aria-pressed={value === "line"} onClick={() => onChange("line")} style={btn(value === "line")}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <polyline points="1,10 5,6 8,8 13,2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" aria-label="Bar chart" aria-pressed={value === "bar"} onClick={() => onChange("bar")} style={btn(value === "bar")}>
        <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
          <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" />
          <rect x="5.5" y="3.5" width="3" height="9.5" rx="1" fill="currentColor" />
          <rect x="10" y="9" width="3" height="4" rx="1" fill="currentColor" />
        </svg>
      </button>
    </span>
  );
}

// A ChartTile for time-series data with the line/bar switch in the header.
// Same data/series contract as LineChartZ/BarChartZ.
export default function TrendTile({
  title,
  subtitle,
  icon,
  iconUrl,
  titleTooltip,
  data,
  series,
  fallbackLabels,
  fallbackSeries,
  height = 260,
  yFormat,
  defaultType = "line",
}) {
  const [type, setType] = useState(defaultType);
  const common = { data, series, fallbackLabels, fallbackSeries, height };
  return (
    <ChartTile
      title={title}
      subtitle={subtitle}
      icon={icon}
      iconUrl={iconUrl}
      titleTooltip={titleTooltip}
      headerRight={<ChartTypeToggle value={type} onChange={setType} />}
    >
      {type === "line" ? (
        <LineChartZ {...common} area {...(yFormat ? { yFormat } : {})} />
      ) : (
        <BarChartZ {...common} {...(yFormat ? { valueFormat: yFormat } : {})} />
      )}
    </ChartTile>
  );
}
