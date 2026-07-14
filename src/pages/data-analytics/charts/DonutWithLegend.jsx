import React from "react";
import { DonutChartZ } from "./EmptyAware";
import { capDonut } from "./adapters";

export const DONUT_PALETTE = [
  "var(--tesseract-blue-500)",
  "var(--tesseract-violet-500)",
  "var(--tesseract-amber-500)",
  "var(--tesseract-success-500)",
  "var(--tesseract-error-500)",
];

export default function DonutWithLegend({
  data,
  centerLabel,
  height = 200,
  colors = DONUT_PALETTE,
  max = 5,
  valueFormat,
  ...rest
}) {
  const capped = capDonut(data, max);
  const items = capped.map((d, i) => ({
    ...d,
    color: colors[i] || colors[colors.length - 1],
  }));

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ flexShrink: 0 }}>
        <DonutChartZ
          data={items}
          colors={colors}
          centerLabel={centerLabel}
          centerValueFormat={(v) => (valueFormat ? valueFormat(v) : v)}
          height={height}
          {...rest}
        />
      </div>
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, marginLeft: "auto" }}>
          {items.map((d, i) => (
            /* The VALUE must never be truncated away — only the label
               ellipsizes (full text on hover via the native title). */
            <div key={i} title={`${d.label}: ${valueFormat ? valueFormat(d.value) : d.value}`} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: d.color,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--tesseract-fg-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.4,
                  minWidth: 0,
                  maxWidth: 140,
                }}
              >
                {d.label}
              </span>
              <span style={{ color: "var(--tesseract-fg-tertiary)", flexShrink: 0 }}>:</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--tesseract-fg-primary)",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {valueFormat ? valueFormat(d.value) : d.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
