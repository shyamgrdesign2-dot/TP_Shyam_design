"use client";

import { cn } from "@/src/hooks/utils";

/**
 * Small iconless toggle for switching between Line and Bar chart views.
 * Designed to sit on the right end of the toggle row (alongside ViewToggle on the left).
 *
 * Height matches ViewToggle (26px) for visual alignment.
 * No icons — just "Line" / "Bar" text labels.
 */





export function ChartTypeToggle({ chartType, onChange }) {
  return (
    <div className="relative h-[26px] rounded-[7px] bg-tp-slate-100 p-[2px] inline-flex">
      {/* Sliding background indicator */}
      <div
        className="absolute top-[2px] h-[22px] w-[calc(50%-2px)] rounded-[5px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out pointer-events-none"
        style={{
          transform: chartType === "bar" ? "translateX(100%)" : "translateX(0)"
        }} />
      

      <button
        type="button"
        onClick={() => onChange("line")}
        className={cn(
          "relative z-10 flex items-center px-[10px] text-[12px] font-medium rounded-[5px] transition-colors",
          chartType === "line" ? "text-tp-slate-800" : "text-tp-slate-400"
        )}>
        
        Line
      </button>

      <button
        type="button"
        onClick={() => onChange("bar")}
        className={cn(
          "relative z-10 flex items-center px-[10px] text-[12px] font-medium rounded-[5px] transition-colors",
          chartType === "bar" ? "text-tp-slate-800" : "text-tp-slate-400"
        )}>
        
        Bar
      </button>
    </div>);

}