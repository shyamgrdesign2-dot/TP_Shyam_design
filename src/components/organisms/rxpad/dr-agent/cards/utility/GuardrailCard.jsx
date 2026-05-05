"use client";

import React from "react";
import { InfoCircle } from "iconsax-reactjs";







export function GuardrailCard({ data, onPillTap }) {
  return (
    <div className="guardrail-card overflow-hidden rounded-[12px] border border-[rgba(217,165,32,0.2)]">
      {/* Subtle amber top accent */}
      <div
        className="h-[2px]"
        style={{
          background: "linear-gradient(90deg, rgba(217,165,32,0.3) 0%, rgba(217,165,32,0.08) 100%)"
        }} />
      

      {/* Info message */}
      <div className="flex items-start gap-[8px] px-[12px] pt-[10px] pb-[8px] bg-[rgba(217,165,32,0.04)]">
        <InfoCircle
          size={16}
          variant="Bulk"
          className="mt-[1px] flex-shrink-0 text-[#D9A520]" />
        
        <p className="text-[14px] leading-[1.5] text-tp-slate-600">
          {data.message}
        </p>
      </div>

      {/* Suggestion chips */}
      {data.suggestions.length > 0 &&
      <div className="px-[12px] pb-[10px]">
          <p className="mb-[6px] text-[10px] font-medium uppercase tracking-wider text-tp-slate-400">
            Try asking about
          </p>
          <div className="flex flex-wrap gap-[6px]">
            {data.suggestions.map((s, i) =>
          <button
            key={i}
            type="button"
            onClick={() => onPillTap?.(s.message)}
            className="rounded-full border border-tp-slate-200 bg-white px-[10px] py-[4px] text-[12px] font-medium text-tp-slate-600 transition-all duration-150 hover:border-tp-blue-300 hover:bg-tp-blue-50 hover:text-tp-blue-600 active:scale-[0.97]">
            
                {s.label}
              </button>
          )}
          </div>
        </div>
      }
    </div>);

}