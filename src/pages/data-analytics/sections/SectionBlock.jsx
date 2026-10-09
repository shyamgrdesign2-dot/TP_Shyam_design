import React from "react";

export default function SectionBlock({ title, subtitle, count, children }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40 }}>
          <span
            style={{
              height: 16,
              width: 6,
              flexShrink: 0,
              borderRadius: "var(--tesseract-radius-full)",
              background:
                "linear-gradient(180deg, var(--tesseract-blue-500), var(--tesseract-blue-700))",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              whiteSpace: "nowrap",
              color: "var(--tesseract-fg-secondary, var(--tesseract-slate-500))",
            }}
          >
            {title}
          </span>
          {count != null && (
            <span
              style={{
                borderRadius: "var(--tesseract-radius-full)",
                background: "var(--tesseract-slate-100)",
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: "var(--tesseract-fg-secondary, var(--tesseract-slate-500))",
              }}
            >
              {count}
            </span>
          )}
          {subtitle && (
            <span
              style={{
                fontSize: 12,
                whiteSpace: "nowrap",
                color: "var(--tesseract-fg-tertiary, var(--tesseract-slate-400))",
              }}
            >
              {subtitle}
            </span>
          )}
          <span
            style={{
              marginLeft: 4,
              height: 1,
              flex: 1,
              background: "var(--tesseract-slate-100)",
            }}
          />
        </div>
      )}
      {children}
    </section>
  );
}
