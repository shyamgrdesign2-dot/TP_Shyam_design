import React from "react";
import { Card, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";
import { InfoTooltip } from "./KpiRow";

// A responsive widget grid (matches the older analytics' 2-up layout: cards
// reflow to one column when narrow).
export function ChartGrid({ children }) {
  return (
    <div className="da-chart-grid">
      {children}
    </div>
  );
}

// Horizontal-scroll wrapper for dense charts (e.g. 24-hour bar).
// Shows a right-edge fade when content overflows.
export function ScrollableChart({ minWidth = 500, children }) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingTop: 80,
          paddingBottom: 30,
          marginTop: -80,
          marginBottom: -30,
        }}
      >
        <div style={{ minWidth }}>
          {children}
        </div>
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 80,
          right: 0,
          bottom: 30,
          width: 32,
          background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--tesseract-bg-surface, #fff) 85%, transparent))",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    </div>
  );
}

// Scalability guard for category charts (by doctor, by ward, ...): up to
// `fit` categories render normally; beyond that the chart gets a horizontal
// scroll with a fixed width per category, so any future data volume stays
// readable instead of squeezing.
export function MaybeScroll({ count = 0, fit = 5, perItem = 110, children }) {
  if (!count || count <= fit) return children;
  return <ScrollableChart minWidth={Math.max(count * perItem, 560)}>{children}</ScrollableChart>;
}

// One titled chart widget — a light outlined card with a violet glyph, its own
// title/subtitle, and the chart body.
export function ChartTile({ title, subtitle, icon = "chart-square", iconUrl, titleTooltip, headerRight, children }) {
  return (
    <Card
      variant="elevated"
      padding="lg"
      className="da-chart-card"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: "var(--tesseract-radius-10)",
              background: "var(--tesseract-violet-100)",
              color: "var(--tesseract-violet-600)",
            }}
          >
            {iconUrl ? (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  backgroundColor: "var(--tesseract-violet-600)",
                  WebkitMaskImage: `url(${iconUrl})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskImage: `url(${iconUrl})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                }}
              />
            ) : (
              <TPLibraryIcon name={icon} size={20} variant="bulk" color="var(--tesseract-violet-600)" />
            )}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--tesseract-fg-heading, var(--tesseract-slate-800))",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              minWidth: 0,
            }}
          >
            {title}
            {(titleTooltip || subtitle) && <InfoTooltip text={titleTooltip || subtitle} />}
          </span>
          {headerRight && <span style={{ marginLeft: "auto", flexShrink: 0 }}>{headerRight}</span>}
        </div>
        {children}
      </div>
    </Card>
  );
}
