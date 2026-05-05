/**
 * Empty state content panel — shown when there are no records for a section.
 */
import React from "react";



export function EmptyStateContent({ sectionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center size-full gap-[12px] px-[20px] py-[40px]">
      {/* Illustration circle */}
      <div className="flex items-center justify-center w-[64px] h-[64px] rounded-full bg-tp-slate-100">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path
            d="M26.667 12H5.333A2.667 2.667 0 0 0 2.667 14.667v10.666A2.667 2.667 0 0 0 5.333 28h21.334a2.667 2.667 0 0 0 2.666-2.667V14.667A2.667 2.667 0 0 0 26.667 12Z"
            fill="var(--tp-slate-200)" />
          
          <path
            d="M10.667 12V9.333a5.333 5.333 0 0 1 10.666 0V12"
            stroke="var(--tp-blue-300)"
            strokeWidth="2"
            strokeLinecap="round" />
          
          <circle cx="16" cy="20" r="2" fill="var(--tp-blue-300)" />
        </svg>
      </div>

      {/* Message */}
      <div className="flex flex-col items-center gap-[4px]">
        <p className="font-sans font-semibold text-[14px] text-tp-slate-700 text-center leading-[20px]">
          No {sectionLabel} Records
        </p>
        <p className="font-sans text-[12px] text-tp-slate-400 text-center leading-[18px] max-w-[180px]">
          No {sectionLabel.toLowerCase()} data has been recorded for this patient yet.
        </p>
      </div>

      {/* Add button hint */}
      <button className="flex items-center gap-[6px] px-[14px] py-[6px] bg-tp-blue-500 text-white text-[12px] font-sans font-medium leading-[18px] cursor-pointer border-0">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add {sectionLabel}
      </button>
    </div>);

}