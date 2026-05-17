/**
 * DentalScoreCard — animated circular gauge showing the patient dental score.
 * Receives pre-computed score data from useDentalScore#computeDentalScore.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InfoCircle } from "iconsax-reactjs";
import ui from "./ExaminationTab.ui.module.scss";

// ─── Tooltip sub-components ───────────────────────────────────────────────

function TooltipRow({ label, value }) {
  return (
    <div className={ui.tooltipRow}>
      <span className={ui.tooltipRowLabel}>{label}</span>
      <span className={ui.tooltipRowVal}>−{value}</span>
    </div>
  );
}

function ScoreTooltip({ anchor, data }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const TOOLTIP_W = 220;
  const TOOLTIP_H_ESTIMATE = 110;
  const pad = 12;
  const ARROW = 6;
  let placeBelow = true;
  let left = anchor.x - TOOLTIP_W / 2;
  let top = anchor.y + ARROW + 4;

  if (typeof window !== "undefined") {
    if (top + TOOLTIP_H_ESTIMATE + pad > window.innerHeight) {
      placeBelow = false;
      top = anchor.y - TOOLTIP_H_ESTIMATE - ARROW - 4;
    }
    if (left + TOOLTIP_W + pad > window.innerWidth)
      left = window.innerWidth - TOOLTIP_W - pad;
    if (left < pad) left = pad;
  }

  const arrowX =
    Math.max(12, Math.min(TOOLTIP_W - 12, anchor.x - left)) - ARROW;

  return createPortal(
    <div className={ui.tooltipRoot} style={{ top, left }}>
      {placeBelow && (
        <div
          style={{
            position: "absolute",
            top: -ARROW,
            left: arrowX,
            width: 0,
            height: 0,
            borderLeft: `${ARROW}px solid transparent`,
            borderRight: `${ARROW}px solid transparent`,
            borderBottom: `${ARROW}px solid #0f172a`
          }}
        />
      )}
      <div
        className={ui.tooltipPanel}
        style={{ background: "#0f172a", color: "#ffffff" }}
      >
        <p className={ui.tooltipTitle}>How this is calculated</p>
        <p className={ui.tooltipLead}>
          Starts at 100, decreases with diagnoses &amp; findings.
        </p>
        <div className={ui.tooltipStack}>
          <TooltipRow label="Diagnoses" value={data.breakdown.diag} />
          <TooltipRow label="Findings" value={data.breakdown.findings} />
        </div>
        <div className={ui.tooltipFooter}>
          <span className={ui.tooltipFooterMuted}>Total deducted</span>
          <span className={ui.tooltipFooterVal}>−{data.totalDeduction}</span>
        </div>
      </div>
      {!placeBelow && (
        <div
          style={{
            position: "absolute",
            bottom: -ARROW,
            left: arrowX,
            width: 0,
            height: 0,
            borderLeft: `${ARROW}px solid transparent`,
            borderRight: `${ARROW}px solid transparent`,
            borderTop: `${ARROW}px solid #0f172a`
          }}
        />
      )}
    </div>,
    document.body
  );
}

// ─── Main component ───────────────────────────────────────────────────────

const ZONE_COLOURS = [
  { accent: "#EF4444", accentDark: "#B91C1C", tint: "#FFE4E6" },
  { accent: "#F97316", accentDark: "#C2410C", tint: "#FFEDD5" },
  { accent: "#F59E0B", accentDark: "#B45309", tint: "#FEF3C7" },
  { accent: "#8B5CF6", accentDark: "#6D28D9", tint: "#EDDFF7" },
  { accent: "#10B981", accentDark: "#047857", tint: "#D1FAE5" }
];

/**
 * @param {{ data: { score: number, rating: string, affectedTeeth: number, totalDeduction: number, breakdown: { diag: number, findings: number } }, infoBtnRef: React.Ref, showFormula: boolean, setShowFormula: function }} props
 */
export function DentalScoreCard({ data, infoBtnRef, showFormula, setShowFormula }) {
  const { score, rating } = data;
  const zoneIdx =
    score >= 90 ? 4 : score >= 75 ? 3 : score >= 60 ? 2 : score >= 40 ? 1 : 0;
  const colour = ZONE_COLOURS[zoneIdx];

  // Animate score from 0 → target on mount.
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const gapDeg = 28;
  const startA = 90 + gapDeg / 2;
  const sweepTotal = 360 - gapDeg;
  const progress = Math.max(0, Math.min(1, displayScore / 100));
  const endA = startA + sweepTotal * progress;
  const polar = (a, radius = r) => ({
    x: cx + radius * Math.cos((a * Math.PI) / 180),
    y: cy + radius * Math.sin((a * Math.PI) / 180)
  });
  const p0 = polar(startA);
  const pFull = polar(startA + sweepTotal);
  const pProg = polar(endA);
  const bgArc = `M ${p0.x} ${p0.y} A ${r} ${r} 0 1 1 ${pFull.x} ${pFull.y}`;
  const fgArc = `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${sweepTotal * progress > 180 ? 1 : 0} 1 ${pProg.x} ${pProg.y}`;
  const gid = `gauge-ring-${zoneIdx}`;

  const infoIconRef = useRef(null);
  const [iconAnchor, setIconAnchor] = useState(null);

  const openTooltip = () => {
    const rect = infoIconRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIconAnchor({ x: rect.left + rect.width / 2, y: rect.bottom });
    setShowFormula(true);
  };
  const closeTooltip = () => {
    setShowFormula(false);
    setIconAnchor(null);
  };

  return (
    <div
      ref={infoBtnRef}
      className={ui.scoreCard}
      style={{
        background: `linear-gradient(140deg, ${colour.tint} 0%, ${colour.accent}2b 60%, ${colour.accent}4d 100%)`
      }}
    >
      <span
        className={ui.scoreRibbon}
        style={{
          background: "rgba(255,255,255,0.98)",
          color: colour.accentDark,
          borderBottomRightRadius: "14px",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)"
        }}
      >
        Dental score
      </span>
      {showFormula && iconAnchor && (
        <ScoreTooltip anchor={iconAnchor} data={data} />
      )}
      <div className={ui.scoreSvgWrap}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colour.accent} stopOpacity="0.85" />
              <stop offset="100%" stopColor={colour.accentDark} stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            d={bgArc}
            stroke={colour.tint}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
          />
          {progress > 0 && (
            <path
              d={fgArc}
              stroke={`url(#${gid})`}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>
        <div className={ui.scoreCenter} style={{ gap: 4 }}>
          <span
            className={ui.scoreHuge}
            style={{ fontSize: 42, lineHeight: 1, color: colour.accentDark }}
          >
            {displayScore}
          </span>
          <span className={ui.scoreSub}>out of 100</span>
          <span
            ref={infoIconRef}
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
            onClick={openTooltip}
            className={ui.scoreRatingBtn}
            style={{
              background: `linear-gradient(135deg, ${colour.tint} 0%, ${colour.accent}22 100%)`,
              color: colour.accentDark,
              border: `1px solid ${colour.accent}33`,
              letterSpacing: "0.6px"
            }}
          >
            {rating.toUpperCase()}
            <InfoCircle size={14} color="currentColor" variant="Linear" />
          </span>
        </div>
      </div>
    </div>
  );
}
