"use client";

import React from "react";






export function DocumentAttachmentBubble({ attachment }) {
  return (
    <div className="flex items-center gap-[8px] rounded-[8px] border border-tp-slate-200 bg-white px-[10px] py-[8px] shadow-sm">
      {/* PDF icon */}
      <div className="flex h-[32px] w-[26px] shrink-0 items-center justify-center rounded-[4px] bg-tp-error-50">
        <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
          <path
            d="M10 1H3C2.44772 1 2 1.44772 2 2V16C2 16.5523 2.44772 17 3 17H13C13.5523 17 14 16.5523 14 16V5L10 1Z"
            fill="var(--tp-error-100, #FFE4E6)"
            stroke="var(--tp-error-500, #E11D48)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round" />
          
          <path d="M10 1V5H14" stroke="var(--tp-error-500, #E11D48)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="8" y="13" textAnchor="middle" fill="var(--tp-error-500, #E11D48)" fontSize="5" fontWeight="700" fontFamily="sans-serif">
            PDF
          </text>
        </svg>
      </div>

      {/* File info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-medium leading-[1.3] text-tp-slate-700">
          {attachment.fileName}
        </span>
        {attachment.pageCount &&
        <span className="text-[12px] leading-[1.3] text-tp-slate-400">
            {attachment.pageCount} {attachment.pageCount === 1 ? "page" : "pages"}
          </span>
        }
      </div>
    </div>);

}