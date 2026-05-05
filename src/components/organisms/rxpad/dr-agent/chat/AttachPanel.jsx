"use client";

import React from "react";
import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";






const DUMMY_FILES =







[
{
  docType: "pathology",
  name: "Lab_Report_Mar2026.pdf",
  size: "340 KB",
  pages: 2,
  iconName: "test-tube",
  iconColor: "#1B8C54",
  bgColor: "rgba(27,140,84,0.08)"
},
{
  docType: "radiology",
  name: "X-Ray_Chest_Mar2026.pdf",
  size: "1.2 MB",
  pages: 1,
  iconName: "x-ray",
  iconColor: "#3B6FE0",
  bgColor: "rgba(59,111,224,0.08)"
},
{
  docType: "prescription",
  name: "Previous_Rx_Mar2026.pdf",
  size: "180 KB",
  pages: 1,
  iconName: "clipboard-activity",
  iconColor: "#C6850C",
  bgColor: "rgba(198,133,12,0.08)"
}];


export function AttachPanel({ onSelect, onClose }) {
  return (
    <div
      className="mx-[10px] mb-[6px] overflow-hidden rounded-[12px] border border-white/50 shadow-lg animate-in slide-in-from-bottom-2 duration-200"
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)"
      }}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tp-slate-300 px-[12px] py-[6px]">
        <span className="text-[14px] font-semibold text-tp-slate-600">Select a document to upload</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-tp-slate-400 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-600"
          aria-label="Close">
          
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* File rows */}
      <div className="py-[4px]">
        {DUMMY_FILES.map((file) =>
        <button
          key={file.docType}
          type="button"
          onClick={() => onSelect(file.docType)}
          className="flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left transition-colors hover:bg-tp-slate-50">
          
            {/* Icon */}
            <div
            className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-[8px]"
            style={{ background: file.bgColor }}>
            
              <TPMedicalIcon name={file.iconName} variant="bulk" size={16} color={file.iconColor} />
            </div>

            {/* File info */}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-medium text-tp-slate-700">{file.name}</span>
              <span className="text-[12px] text-tp-slate-400">{file.pages} {file.pages === 1 ? "page" : "pages"} &middot; {file.size}</span>
            </div>

            {/* Upload arrow */}
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-tp-slate-300">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>);

}