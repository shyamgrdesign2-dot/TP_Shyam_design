"use client";

import { cn } from "@/src/hooks/utils";













/**
 * Horizontal scrollable suggestion chips — rendered above the input box.
 * Shows contextual follow-up actions from the last assistant response.
 * Styled distinctly from PillBar (outline chips vs gradient pills).
 */
export function SuggestionBar({ suggestions, onTap, disabled = false, className }) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-[6px] overflow-x-auto px-[8px] pb-[6px] scrollbar-hide",
        className
      )}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      
      {suggestions.map((s, i) =>
      <button
        key={i}
        type="button"
        onClick={() => !disabled && onTap(s.message)}
        disabled={disabled}
        className={cn(
          "flex-shrink-0 rounded-full border border-tp-slate-200 bg-white px-[10px] py-[4px] text-[12px] font-medium text-tp-slate-600 transition-all duration-150",
          "hover:border-tp-blue-400 hover:bg-tp-blue-50 hover:text-tp-blue-600",
          "active:scale-[0.97]",
          disabled && "opacity-50 cursor-not-allowed"
        )}>
        
          {s.label}
        </button>
      )}
    </div>);

}