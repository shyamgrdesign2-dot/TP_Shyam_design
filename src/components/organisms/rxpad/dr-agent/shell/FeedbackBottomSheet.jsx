"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/src/hooks/utils";
import styles from "./FeedbackBottomSheet.module.scss";

function CloseIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill={color} />
    </svg>);

}








export function FeedbackBottomSheet({ isOpen, onClose, onSubmit }) {
  const [comment, setComment] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) setComment("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const portalTarget =
  typeof document !== "undefined" ?
  document.getElementById("dr-agent-panel-root") ?? document.body :
  null;
  if (!portalTarget) return null;

  const isBodyPortal = portalTarget === document.body;

  const handleSubmit = () => {
    onSubmit(comment.trim());
  };

  const sheet =
  <div
    className={cn(
      "flex flex-col justify-end",
      isBodyPortal ? "fixed inset-0 z-[100]" : "absolute inset-0 z-[55]"
    )}>
    
      <div
      className={cn("absolute inset-0", styles.backdrop)}
      onClick={onClose}
      aria-hidden />
    

      <div
      className={`relative z-10 flex max-h-[55vh] flex-col overflow-hidden rounded-t-[16px] ${styles.sheetPanel}`}>
      
        <div className={`sticky top-0 z-10 shrink-0 ${styles.stickyHeader}`}>
          <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[10px]">
            <h3 className="text-[14px] font-semibold text-tp-slate-800">Feedback</h3>
            <button
            type="button"
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-tp-slate-700 transition-colors hover:bg-tp-slate-100"
            aria-label="Close">
            
              <CloseIcon size={24} />
            </button>
          </div>
          <div className="border-t border-tp-slate-300" />
        </div>

        <div className="flex flex-1 flex-col gap-[12px] overflow-y-auto px-[16px] pb-[20px] pt-[14px]">
          <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what went wrong or how we can improve… (optional)"
          rows={4}
          className="w-full resize-none rounded-[8px] border border-tp-slate-200 bg-white px-[12px] py-[10px] text-[14px] leading-[1.5] text-tp-slate-800 outline-none transition-colors placeholder:text-tp-slate-300 focus:border-tp-blue-400 focus:ring-2 focus:ring-[rgba(75,74,213,0.08)]" />
        
          <button
          type="button"
          onClick={handleSubmit}
          className={`w-full rounded-[8px] py-[10px] text-[14px] font-semibold text-white transition-opacity ${styles.submitButton}`}>
          
            Submit
          </button>
        </div>
      </div>
      {/* da-* styles live in app/globals.css */}
    </div>;


  return createPortal(sheet, portalTarget);
}