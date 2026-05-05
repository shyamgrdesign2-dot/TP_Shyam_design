"use client";

import React, { useId } from "react";
import { cn } from "@/src/hooks/utils";
import styles from "./DrAgentFab.module.scss";









function BrandSparkIcon({ size = 42 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 375 375"
      fill="none"
      aria-hidden="true"
      className="vrx-fab-spark-icon">
      
      <path
        d="M290.387 195.649C240.198 200.476 200.481 240.165 195.649 290.32L187.497 375L179.351 290.326C174.521 240.179 134.803 200.478 84.6131 195.642L0 187.503L84.6199 179.358C134.807 174.53 174.519 134.834 179.351 84.6805L187.503 0L195.649 84.6737C200.479 134.821 240.197 174.522 290.387 179.358L375 187.497L290.387 195.649Z"
        fill="white" />
      
    </svg>);

}

const FAB_PATH =
"M395.24 23.6125C381.35 31.5666 366.81 41.5232 360.83 55.4195C352.63 74.3548 341.13 86.7689 319.47 86.769H110.53C88.87 86.7689 77.37 74.3548 69.17 55.4195C63.19 41.5232 48.62 31.5666 34.73 23.6125L28.43 20H401.32L395.24 23.6125Z";

function RecordingMicIcon({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-[fabMicPulse_1.4s_ease-in-out_infinite]">
      
      {/* da-* styles live in app/globals.css */}
      <path d="M12 19v3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="2" width="6" height="13" rx="3" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.8" />
    </svg>);

}

export function DrAgentFab({ onClick, hasNudge, isPanelOpen, isModuleRecording }) {
  const SHELL_W = 230;
  const SHELL_H = 66;
  const VB_H_SCALED = SHELL_W * (115 / 430);
  const MEET_OFFSET_Y = (SHELL_H - VB_H_SCALED) / 2;
  const SCALE = SHELL_W / 430;

  const uid = useId();
  const shadowId = `${uid}-fab-shadow`;
  const shellId = `${uid}-fab-shell`;
  const sheenId = `${uid}-fab-sheen`;

  const showShimmer = hasNudge && !isPanelOpen && !isModuleRecording;

  return (
    <div
      className={cn(
        "group pointer-events-auto fixed z-40 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isPanelOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
      style={{
        top: "50%",
        right: 0,
        width: SHELL_H,
        height: SHELL_W,
        transform: isPanelOpen ?
        "translateY(-50%) translateX(110%)" :
        "translateY(-50%)"
      }}
      role="button"
      tabIndex={0}
      aria-label="Open VoiceRx"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}>
      
      {/* Hover tooltip — left of the chip */}
      <div className="pointer-events-none absolute right-[calc(100%+6px)] top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="relative whitespace-nowrap rounded-md bg-tp-slate-800 px-2 py-1 text-[12px] font-medium text-white shadow-lg">
          {isModuleRecording ? "Voice recording in progress" : "Open VoiceRx"}
          <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-[4px] border-transparent border-l-tp-slate-800" />
        </div>
      </div>

      <div
        className="dr-agent-fab-inner absolute"
        style={{
          left: "50%",
          top: "50%",
          width: SHELL_W,
          height: SHELL_H,
          transform: "translate(-50%,-50%) rotate(90deg)",
          transformOrigin: "center center"
        }}>
        
        <svg
          aria-hidden
          className="block overflow-visible"
          style={{
            width: SHELL_W,
            height: SHELL_H,
            position: "absolute",
            left: -7,
            top: -14,
            pointerEvents: "none"
          }}
          viewBox="0 0 430 115"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet">
          
          <defs>
            <filter
              id={shadowId}
              x="0"
              y="0"
              width="430"
              height="114.769"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB">
              
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha" />
              
              <feOffset dy="4" />
              <feGaussianBlur stdDeviation="12" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.175838 0 0 0 0 0.173404 0 0 0 0 0.173404 0 0 0 0.42 0" />
              
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feBlend in="SourceGraphic" in2="effect1_dropShadow" mode="normal" result="shape" />
            </filter>
            <linearGradient id={shellId} x1="28.43" x2="401.32" y1="53" y2="53" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#D565EA">
                <animate attributeName="stop-color" values="#D565EA;#E88BF5;#D565EA" dur="6s" repeatCount="indefinite" />
              </stop>
              <stop offset="0.5" stopColor="#673AAC">
                <animate attributeName="stop-color" values="#673AAC;#8B5CF6;#673AAC" dur="6s" repeatCount="indefinite" />
              </stop>
              <stop offset="1" stopColor="#1A1994">
                <animate attributeName="stop-color" values="#1A1994;#3730A3;#1A1994" dur="6s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
            {showShimmer &&
            <linearGradient id={sheenId} x1="0" y1="20" x2="430" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="white" stopOpacity="0" />
                <stop offset="0.30" stopColor="white" stopOpacity="0" />
                <stop offset="0.50" stopColor="white" stopOpacity="0.55" />
                <stop offset="0.70" stopColor="white" stopOpacity="0" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            }
          </defs>

          <g filter={`url(#${shadowId})`}>
            <path d={FAB_PATH} fill={`url(#${shellId})`} />
          </g>
          {showShimmer &&
          <path
            d={FAB_PATH}
            fill={`url(#${sheenId})`}
            className="vrx-fab-sheen" />

          }
        </svg>

        <div
          style={{
            position: "absolute",
            left: -7,
            top: -14 + MEET_OFFSET_Y,
            width: 430,
            height: 115,
            transform: `scale(${SCALE})`,
            transformOrigin: "0 0",
            pointerEvents: "none"
          }}>
          
          <div className={styles.fabContentFlex}>
            {isModuleRecording ?
            <RecordingMicIcon size={42} /> :

            <span className={showShimmer ? "vrx-fab-spark-pulse" : undefined}>
                <BrandSparkIcon size={42} />
              </span>
            }
            <span className={styles.fabLabel}>
              {isModuleRecording ? "Rec…" : "VoiceRx"}
            </span>
          </div>
        </div>
      </div>
      {/* da-* styles live in app/globals.css */}
    </div>);

}