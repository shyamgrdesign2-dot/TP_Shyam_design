"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/src/hooks/utils";
import styles from "./DocumentBottomSheet.module.scss";
import { DocumentUpload } from "iconsax-reactjs";


import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";

const DOC_CANNED_SUGGESTIONS = [
{ id: "doc-summarize", label: "Summarize document" },
{ id: "doc-compare", label: "Compare documents" },
{ id: "doc-extract", label: "Extract key findings" },
{ id: "doc-abnormal", label: "Check abnormalities" }];













const DOC_TYPE_CONFIG =


{
  pathology: { iconName: "test-tube", iconColor: "#1B8C54", bgColor: "rgba(27,140,84,0.08)", label: "Pathology" },
  radiology: { iconName: "x-ray", iconColor: "#3B6FE0", bgColor: "rgba(59,111,224,0.08)", label: "Radiology" },
  prescription: { iconName: "clipboard-activity", iconColor: "#C6850C", bgColor: "rgba(198,133,12,0.08)", label: "Prescription" },
  discharge_summary: { iconName: "file-text", iconColor: "#7C3AED", bgColor: "rgba(124,58,237,0.08)", label: "Discharge" },
  vaccination: { iconName: "injection", iconColor: "#0891B2", bgColor: "rgba(8,145,178,0.08)", label: "Vaccination" },
  other: { iconName: "document", iconColor: "#64748B", bgColor: "rgba(100,116,139,0.08)", label: "Document" }
};

function CloseIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill={color} />
    </svg>);

}

export function DocumentBottomSheet({
  documents,
  onSendDocuments,
  onUploadNew,
  onClose,
  onCannedAction,
  maxSelect = 2,
  patientFirstName
}) {
  const [selected, setSelected] = useState(new Set());
  const [maxWarning, setMaxWarning] = useState(false);

  const toggleDoc = useCallback(
    (docId) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(docId)) {
          next.delete(docId);
          setMaxWarning(false);
        } else {
          if (next.size >= maxSelect) {
            setMaxWarning(true);
            setTimeout(() => setMaxWarning(false), 2000);
            return prev;
          }
          next.add(docId);
        }
        return next;
      });
    },
    [maxSelect]
  );

  const handleSend = useCallback(() => {
    const docs = documents.filter((d) => selected.has(d.id));
    if (docs.length > 0) onSendDocuments(docs);
  }, [documents, selected, onSendDocuments]);

  const selectedCount = selected.size;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={cn("absolute inset-0", styles.backdrop)}
        onClick={onClose} />
      

      {/* Bottom Sheet */}
      <div
        className={cn("relative z-10 flex flex-col rounded-t-[16px] shadow-2xl overflow-hidden", styles.sheet)}>
        
        {/* Sticky header — white bg (only header) */}
        <div className="sticky top-0 z-10">
          <div className="bg-white">
            <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[10px]">
              <div className="flex items-center gap-[6px]">
                <h3 className="text-[16px] font-semibold text-tp-slate-800">{patientFirstName ? `${patientFirstName}'s Medical Records` : "Medical Records"}</h3>
                <span className="rounded-full bg-tp-slate-100 px-[7px] py-[1px] text-[12px] font-medium text-tp-slate-500">{documents.length}</span>
              </div>
              <button type="button" onClick={onClose} className="flex items-center justify-center transition-colors text-tp-slate-700">
                <CloseIcon size={24} />
              </button>
            </div>
            <div className="border-t border-tp-slate-300" />
          </div>

          {/* CTA + divider — only when documents exist */}
          {documents.length > 0 &&
          <div className={styles.sectionBg}>
              <div className="px-[12px] py-[10px]">
                <button type="button" onClick={onUploadNew}
              className="flex w-full items-center justify-center gap-[6px] rounded-[8px] border border-tp-blue-200 bg-white px-[12px] py-[8px] text-[14px] font-medium text-tp-blue-500 transition-colors hover:bg-tp-blue-50/60 hover:border-tp-blue-300">
                  <DocumentUpload size={14} variant="Linear" />
                  <span>Add New Medical Record</span>
                </button>
              </div>
              <div className="relative mx-[16px] pb-[6px]">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-tp-slate-300" /></div>
                <div className="relative flex justify-center"><span className={cn("px-[10px] text-[12px] font-medium text-tp-slate-300", styles.orDividerLabel)}>or</span></div>
              </div>
            </div>
          }
        </div>

        {/* Scrollable content — seamless gray bg, no extra border */}
        <div className={cn("doc-scroll flex-1 overflow-y-auto", styles.scrollArea)}>
          {documents.length === 0 ? (
          /* ── Empty state — vertically + horizontally centered ── */
          <div className="flex h-full flex-col items-center justify-center px-[24px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/dr-agent/empty-docs.svg" width={100} height={100} alt="" className="mb-[16px] opacity-60" draggable={false} />
              <h4 className="text-[14px] font-semibold text-tp-slate-600 mb-[4px]">No Medical Records</h4>
              <p className={cn("text-[14px] text-tp-slate-400 text-center leading-[16px] mb-[16px]", styles.emptyStateText)}>
                {patientFirstName ?
              `No medical records have been added for ${patientFirstName}. Upload one to get started.` :
              "No medical records have been added yet. Upload one to get started."}
              </p>
              <button type="button" onClick={onUploadNew}
            className="flex items-center justify-center gap-[6px] rounded-[8px] border border-tp-blue-200 bg-white px-[16px] py-[8px] text-[14px] font-medium text-tp-blue-500 transition-colors hover:bg-tp-blue-50/60 hover:border-tp-blue-300">
                <DocumentUpload size={14} variant="Linear" />
                <span>Add New Medical Record</span>
              </button>
            </div>) :

          <>
          {/* Selection hint */}
          <div className="flex items-center justify-between px-[16px] py-[6px]">
            <p className="text-[12px] text-tp-slate-400">
              {selectedCount > 0 ? `${selectedCount} selected` : "Select documents to analyze"}
            </p>
            {maxWarning &&
              <p className="text-[12px] font-medium text-tp-amber-600">Max {maxSelect} documents</p>
              }
            {selectedCount > 0 && !maxWarning &&
              <button
                type="button"
                onClick={() => {setSelected(new Set());setMaxWarning(false);}}
                className="text-[12px] font-medium text-tp-slate-400 hover:text-tp-slate-600">
                
                Clear all
              </button>
              }
          </div>

          {/* Document list */}
          <div className="px-[10px] pb-[8px]">
            <div className="flex flex-col gap-[2px]">
              {documents.map((doc) => {
                  const config = DOC_TYPE_CONFIG[doc.docType] ?? DOC_TYPE_CONFIG.other;
                  const isSelected = selected.has(doc.id);

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => toggleDoc(doc.id)}
                      className={cn(
                        "flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[10px] text-left transition-colors",
                        isSelected ?
                        "bg-tp-violet-50" :
                        "hover:bg-tp-slate-100/80"
                      )}>
                      
                    <div
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all",
                          isSelected ? cn("border-transparent", styles.checkboxSelected) : "border-tp-slate-300 bg-white"
                        )}>
                        
                      {isSelected &&
                        <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        }
                    </div>
                    <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px]" style={{ background: config.bgColor }}>
                      <TPMedicalIcon name={config.iconName} variant="bulk" size={16} color={config.iconColor} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                      <span className="truncate text-[14px] font-medium text-tp-slate-700">{doc.fileName}</span>
                      <span className="text-[12px] text-tp-slate-400">{config.label} · {doc.uploadedAt} · {doc.uploadedBy}</span>
                    </div>
                    <span className="shrink-0 text-[12px] text-tp-slate-300">{doc.size}</span>
                  </button>);

                })}
            </div>
          </div>
          </>
          }
        </div>

        {/* Footer — white bg (hidden when empty) */}
        {documents.length > 0 && <div className="bg-white border-t border-tp-slate-300 px-[16px] py-[10px]">
          <button
            type="button"
            onClick={handleSend}
            disabled={selectedCount === 0}
            className={cn(
              "flex w-full items-center justify-center gap-[6px] rounded-[10px] px-4 py-[10px] text-[14px] font-semibold text-white transition-all",
              selectedCount === 0 ? "cursor-not-allowed bg-tp-slate-200 text-tp-slate-400" : cn("hover:opacity-90 active:scale-[0.98]", styles.sendBtn)
            )}>
            
            {selectedCount === 0 ? "Select documents to analyze" : `Add ${selectedCount} document${selectedCount > 1 ? "s" : ""} to chat`}
          </button>
        </div>}
      </div>
      {/* da-* styles live in app/globals.css */}
    </div>);

}