"use client";

import { cn } from "@/src/hooks/utils";

/**
 * Shared Graph / Text segmented toggle — used across all trend cards
 * (VitalTrendsLine, LabTrends, etc.)
 *
 * Touch-friendly (26px tall), iPad + desktop accessible.
 * Sliding white indicator with subtle shadow for selected state.
 */





export function ViewToggle({ viewMode, onChange }) {
  return (
    <div className="flex">
      <div className="relative h-[26px] rounded-[7px] bg-tp-slate-100 p-[2px] inline-flex">
        {/* Sliding background indicator */}
        <div
          className="absolute top-[2px] h-[22px] w-[calc(50%-2px)] rounded-[5px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out pointer-events-none"
          style={{
            transform: viewMode === "text" ? "translateX(100%)" : "translateX(0)"
          }} />
        

        <button
          type="button"
          onClick={() => onChange("graph")}
          className={cn(
            "relative z-10 flex items-center gap-[4px] px-[12px] text-[12px] font-medium rounded-[5px] transition-colors",
            viewMode === "graph" ? "text-tp-slate-800" : "text-tp-slate-400"
          )}>
          
          {/* Line chart mini-icon */}
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
            <path
              d="M1 10L4 5L7 7L11 2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round" />
            
          </svg>
          Graph
        </button>

        <button
          type="button"
          onClick={() => onChange("text")}
          className={cn(
            "relative z-10 flex items-center gap-[4px] px-[12px] text-[12px] font-medium rounded-[5px] transition-colors",
            viewMode === "text" ? "text-tp-slate-800" : "text-tp-slate-400"
          )}>
          
          {/* Text lines mini-icon */}
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
            <path
              d="M2 3h8M2 6h6M2 9h7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round" />
            
          </svg>
          Text
        </button>
      </div>
    </div>);

}