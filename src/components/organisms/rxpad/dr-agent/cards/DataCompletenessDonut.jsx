"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./DataCompletenessDonut.module.scss";

/** Rich source document entry with clickable link */























// Ring colors — neutral palette for the inline donut (download-progress style)
const EMR_COLOR_RING = "#94A3B8"; // slate-400 — neutral for ring
const AI_COLOR_RING = "#CBD5E1"; // slate-300 — neutral for ring
const MISSING_COLOR = "#E2E8F0"; // slate-200

// Tooltip colors — vivid, from original design system
const EMR_COLOR_TOOLTIP = "var(--tp-violet-500, #A461D8)"; // violet-500
const AI_COLOR_TOOLTIP = "var(--tp-amber-500, #F5B832)"; // amber-500

/**
 * Circular donut chart showing data completeness.
 * "sm" = 14px for inline, "md" = 24px for card headers.
 * On hover: portal tooltip with horizontal stacked bar + percentage labels.
 */
export function DataCompletenessDonut({ emr, ai, missing, size = "md" }) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const [pos, setPos] = useState(null);

  const total = emr + ai + missing;

  const TOOLTIP_W = 220;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipH = tooltipRef.current.offsetHeight;
    const MARGIN = 8;
    const GAP = 8;

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    let left = triggerCenterX - TOOLTIP_W / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - TOOLTIP_W - MARGIN));

    const arrowLeft = Math.max(12, Math.min(triggerCenterX - left, TOOLTIP_W - 12));
    const top = triggerRect.top - GAP - tooltipH;

    setPos({ top, left, arrowLeft });
  }, []);

  useEffect(() => {
    if (!isVisible) {setPos(null);return;}
    requestAnimationFrame(updatePosition);
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible) return;
    const reposition = () => requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isVisible, updatePosition]);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => setIsVisible(true), 200);
  }, []);
  const hide = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setIsVisible(false), 150);
  }, []);
  const keepOpen = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  if (total === 0) return null;

  const svgSize = size === "md" ? 24 : 14;
  const strokeWidth = size === "md" ? 3.5 : 2;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Arc lengths
  const emrLen = emr / total * circumference;
  const aiLen = ai / total * circumference;
  const missingLen = missing / total * circumference;

  // Center percentage (EMR + AI = verified data)
  const verifiedPct = Math.round((emr + ai) / total * 100);

  const tooltip =
  isVisible && typeof document !== "undefined" ?
  createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[9999]"
      style={
      pos ?
      { top: pos.top, left: pos.left, width: TOOLTIP_W, opacity: 1, transition: "opacity 100ms ease-out" } :
      { top: -9999, left: -9999, width: TOOLTIP_W, opacity: 0 }
      }
      onMouseEnter={keepOpen}
      onMouseLeave={hide}>
      
            <div
        className={`rounded-[8px] bg-white overflow-hidden px-[10px] py-[8px] ${styles.tooltipCard}`}>
        
              <p className="mb-[5px] text-[14px] font-semibold text-tp-slate-600">Data Completeness</p>

              {/* Horizontal stacked bar */}
              <div className="mb-[5px] flex h-[5px] w-full overflow-hidden rounded-full">
                <div style={{ width: `${emr}%`, background: EMR_COLOR_TOOLTIP }} />
                <div style={{ width: `${ai}%`, background: AI_COLOR_TOOLTIP }} />
                <div style={{ width: `${missing}%`, background: MISSING_COLOR }} />
              </div>

              {/* Legend row */}
              <div className="flex items-center gap-[8px] text-[14px] leading-[1.4]">
                <span className="flex items-center gap-[3px]">
                  <span className={`inline-block h-[5px] w-[5px] rounded-full ${styles.dotEmr}`} />
                  <span className="text-tp-slate-500">{emr}% EMR</span>
                </span>
                <span className="flex items-center gap-[3px]">
                  <span className={`inline-block h-[5px] w-[5px] rounded-full ${styles.dotAi}`} />
                  <span className="text-tp-slate-500">{ai}% Doc. Extraction</span>
                </span>
                <span className="flex items-center gap-[3px]">
                  <span className={`inline-block h-[5px] w-[5px] rounded-full ${styles.dotMissing}`} />
                  <span className="text-tp-slate-500">{missing}%</span>
                </span>
              </div>
            </div>
            {/* Downward arrow */}
            {pos &&
      <div style={{ paddingLeft: pos.arrowLeft - 5 }}>
                <div className={styles.tooltipArrow} />
              </div>
      }
          </div>,
    document.body
  ) :
  null;

  return (
    <div
      ref={triggerRef}
      className="flex-shrink-0 cursor-default"
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={() => setIsVisible((v) => !v)}>
      
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {/* Background track */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={MISSING_COLOR}
          strokeWidth={strokeWidth}
          opacity={0.5} />
        
        {/* EMR arc — anti-clockwise */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={EMR_COLOR_RING}
          strokeWidth={strokeWidth}
          strokeDasharray={`${emrLen} ${circumference - emrLen}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2}) scale(1, -1) translate(0, -${svgSize})`} />
        
        {/* AI arc — anti-clockwise */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={AI_COLOR_RING}
          strokeWidth={strokeWidth}
          strokeDasharray={`${aiLen} ${circumference - aiLen}`}
          strokeDashoffset={-emrLen}
          strokeLinecap="round"
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2}) scale(1, -1) translate(0, -${svgSize})`} />
        
        {/* Missing arc — anti-clockwise */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={MISSING_COLOR}
          strokeWidth={strokeWidth}
          strokeDasharray={`${missingLen} ${circumference - missingLen}`}
          strokeDashoffset={-(emrLen + aiLen)}
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2}) scale(1, -1) translate(0, -${svgSize})`} />
        
        {/* Center text — verified % */}
        {size === "md" &&
        <text
          x={svgSize / 2}
          y={svgSize / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="7"
          fontWeight="600"
          fill="#64748B">
          
            {verifiedPct}
          </text>
        }
      </svg>

      {tooltip}
    </div>);

}