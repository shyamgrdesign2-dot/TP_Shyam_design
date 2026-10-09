import { useState, useRef, useCallback } from "react";
import { getZoneLabel } from "./types";
import { ZONE_INFO } from "./tooth-geometry";
import qs from "./QuickSurfaceSelector.module.scss";
// Shapes extracted from the provided quick-surface SVG (viewBox 114 x 229).
// These map directly to interactive zones, including "whole tooth" at the top.
const PATH_ROOT =
  "M36.8867 202.706H77.1133C79.7678 202.706 81.0969 206.024 79.0986 207.876L58.9854 226.513C57.8617 227.554 56.1384 227.554 55.0146 226.513L34.9004 207.876C32.9023 206.024 34.2321 202.706 36.8867 202.706Z";
const PATH_CERVICAL =
  "M34.8379 160.384C36.4665 158.775 39.285 158.672 41.5801 160.13C42.9573 161.004 44.4076 161.765 45.916 162.402C49.3632 163.858 53.0481 164.638 56.7607 164.697C60.4735 164.756 64.143 164.093 67.5586 162.741C68.9925 162.174 70.3702 161.489 71.6777 160.696C74.0318 159.27 76.86 159.377 78.4863 160.983L91.1387 173.479C92.8862 175.206 92.7701 177.866 91.0498 179.215C87.1174 182.298 82.7373 184.812 78.0342 186.674C75.2355 187.782 72.3549 187.262 68.9375 186.234C65.6773 185.254 61.7959 183.738 57.8018 183.675C53.8259 183.612 49.6776 184.989 46.1475 185.863C42.4349 186.783 39.2572 187.215 36.3906 186.005C31.555 183.963 27.0269 181.261 22.9404 177.987C21.2187 176.608 21.1158 173.938 22.8594 172.216L34.8379 160.384Z";
const PATH_BL =
  "M28.333 93.7061C28.5285 96.7782 29.2489 99.801 30.4717 102.649C31.9201 106.023 34.0412 109.085 36.7109 111.661C39.3807 114.237 42.5471 116.278 46.0273 117.669C48.9808 118.849 52.1133 119.541 55.2939 119.724V145.267C48.6064 145.068 42.0077 143.702 35.8203 141.229C32.9322 140.074 30.9982 137.533 29.0322 134.262C27.1638 131.153 25.2141 127.243 22.3545 124.483C19.4819 121.712 15.6489 120.056 12.6436 118.46C9.49039 116.785 7.08943 115.128 5.90723 112.374C3.35942 106.439 1.94928 100.114 1.73633 93.7061H28.333Z";
const PATH_BR =
  "M112.264 93.7061C112.051 100.114 110.641 106.44 108.093 112.375C106.91 115.129 104.509 116.785 101.356 118.46C98.3511 120.056 94.5181 121.712 91.6455 124.483C88.7859 127.243 86.8362 131.153 84.9678 134.262C83.0018 137.533 81.0677 140.074 78.1797 141.229C71.9923 143.702 65.3936 145.068 58.7061 145.267V119.724C61.8867 119.541 65.0192 118.849 67.9727 117.669C71.4529 116.278 74.6194 114.238 77.2891 111.662C79.959 109.086 82.0799 106.024 83.5283 102.649C84.7511 99.801 85.4715 96.7783 85.667 93.7061H112.264Z";
const PATH_TR =
  "M58.7061 38.7324C65.3936 38.9314 71.9923 40.2985 78.1797 42.7715C81.0678 43.9259 83.0018 46.4673 84.9678 49.7383C86.8362 52.8469 88.7859 56.7572 91.6455 59.5166C94.5181 62.2884 98.3511 63.9436 101.356 65.54C104.51 67.215 106.911 68.872 108.093 71.626C110.641 77.5611 112.051 83.8857 112.264 90.2939H85.667C85.4715 87.2218 84.751 84.1989 83.5283 81.3506C82.0799 77.9766 79.9588 74.915 77.2891 72.3389C74.6193 69.7628 71.4529 67.7221 67.9727 66.3311C65.0192 65.1506 61.8867 64.4584 58.7061 64.2754V38.7324Z";
const PATH_TL =
  "M55.2939 64.2754C52.1133 64.4584 48.9808 65.1506 46.0273 66.3311C42.5471 67.7221 39.3807 69.7628 36.7109 72.3389C34.0412 74.915 31.9201 77.9766 30.4717 81.3506C29.249 84.1989 28.5285 87.2218 28.333 90.2939H1.73633C1.94929 83.8857 3.35944 77.5611 5.90723 71.626C7.08943 68.872 9.49039 67.215 12.6436 65.54C15.6489 63.9436 19.4819 62.2884 22.3545 59.5166C25.2141 56.7572 27.1638 52.8469 29.0322 49.7383C30.9982 46.4673 32.9322 43.9259 35.8203 42.7715C42.0078 40.2985 48.6064 38.9314 55.2939 38.7324V64.2754Z";
const PATH_WHOLE =
  "M40.3711 1.70605H73.627C78.3391 1.70605 82.1599 5.52624 82.1602 10.2383V15.7617C82.1599 20.4738 78.3391 24.2939 73.627 24.2939H40.3711C35.6592 24.2937 31.8391 20.4736 31.8389 15.7617V10.2383C31.8391 5.52639 35.6592 1.7063 40.3711 1.70605Z";
// ──────────────────────────────────────────────────────────────
// Tooltip component — positioned above/below the hovered zone
// ──────────────────────────────────────────────────────────────
function ZoneTooltip({ text, x, y, visible }) {
  return (
    <div
      className={qs.tooltipHost}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.15s ease",
        zIndex: 20,
      }}
    >
      <div className={qs.tooltipBubble}>
        {text}
        <div className={qs.tooltipArrow} />
      </div>
    </div>
  );
}
/**
 * QuickSurfaceSelector — 7-zone picker (5 crown wedges + cervical band + root tip).
 * Uses the user-provided reference SVGs for cervical + root shapes.
 *
 * Enhancements:
 *  • Taller & narrower overall shape (width reduced, height increased)
 *  • Hover tooltips showing the context-aware surface name
 *  • Tooltip suppressed when a zone is already selected (active)
 */
export function QuickSurfaceSelector({
  selectedZones,
  onToggleZone,
  arch = "maxillary",
  toothPosition = 6,
  zonesWithFindings,
  disabled,
}) {
  const [hovered, setHovered] = useState(null);
  const containerRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({
    x: 0,
    y: 0,
  });
  // Resolve context-aware label for the hovered zone
  const getLabel = useCallback(
    (zone) => {
      return getZoneLabel(zone, arch, toothPosition);
    },
    [arch, toothPosition],
  );
  // Track mouse position within the container for tooltip placement
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 4,
    });
  }, []);
  const NEUTRAL_STROKE = "#c4c9d1";
  // Tooltip is visible only when:
  //  1. A zone is hovered
  //  2. That zone is NOT currently selected (selected zones don't need tooltip)
  //  3. Component is not disabled
  const showTooltip =
    hovered !== null && !disabled && !selectedZones.has(hovered);
  const zoneProps = (id) => {
    const isSel = selectedZones.has(id);
    const isHov = hovered === id;
    const hasFinding = zonesWithFindings?.has(id) ?? false;
    const zoneColor = ZONE_INFO[id]?.color ?? "#8a9098";
    let fill;
    let fillOpacity;
    let stroke;
    let strokeOpacity;
    if (isSel) {
      fill = zoneColor;
      fillOpacity = 0.85;
      stroke = zoneColor;
      strokeOpacity = 1;
    } else if (isHov) {
      fill = NEUTRAL_STROKE;
      fillOpacity = 0.22;
      stroke = NEUTRAL_STROKE;
      strokeOpacity = 1;
    } else if (hasFinding) {
      fill = zoneColor;
      fillOpacity = 0.35;
      stroke = zoneColor;
      strokeOpacity = 0.7;
    } else {
      fill = "#ffffff";
      fillOpacity = 1;
      stroke = NEUTRAL_STROKE;
      strokeOpacity = 0.85;
    }
    return {
      fill,
      fillOpacity: disabled ? 0 : fillOpacity,
      stroke,
      strokeWidth: isSel ? 2.8 : 1.6,
      strokeOpacity: disabled ? 0.4 : strokeOpacity,
      style: {
        cursor: disabled ? "default" : "pointer",
        transition:
          "fill-opacity 0.15s, stroke-width 0.15s, stroke 0.15s, fill 0.15s",
      },
      onMouseEnter: () => setHovered(id),
      onMouseLeave: () => setHovered(null),
      onClick: (e) => {
        e.stopPropagation();
        if (!disabled) {
          setHovered(null);
          onToggleZone(id);
        }
      },
    };
  };
  return (
    <div
      ref={containerRef}
      data-surface-selector-ui="true"
      className={qs.root}
      style={
        disabled
          ? {
              opacity: 0.45,
              pointerEvents: "none",
            }
          : undefined
      }
      onMouseMove={handleMouseMove}
    >
      {showTooltip && hovered && (
        <ZoneTooltip
          text={getLabel(hovered)}
          x={tooltipPos.x}
          y={tooltipPos.y}
          visible={showTooltip}
        />
      )}

      <svg viewBox="0 0 114 229" className={qs.svg}>
        <path d={PATH_WHOLE} {...zoneProps("whole")} />
        <g transform={arch === "maxillary" ? "matrix(1 0 0 -1 0 265)" : undefined}>
          <path d={PATH_TL} {...zoneProps("buccal")} />
          <path d={PATH_TR} {...zoneProps("lingual")} />
          <path d={PATH_BL} {...zoneProps("mesial")} />
          <path d={PATH_BR} {...zoneProps("distal")} />
          <circle cx={57} cy={92} r={20} {...zoneProps("occlusal")} />
          <path d={PATH_CERVICAL} {...zoneProps("cervical")} />
          <path d={PATH_ROOT} {...zoneProps("root")} />
        </g>
      </svg>
    </div>
  );
}
