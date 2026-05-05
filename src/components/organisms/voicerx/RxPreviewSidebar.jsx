"use client";

import { useEffect, useState } from "react";

/** Filled rounded-square close glyph — same one used in the VoiceRx
 *  bottom sheet and the Document bottom sheet. Keeps close-icon grammar
 *  consistent across every dialog / drawer surface. */
function CloseSquareIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z"
        fill={color} />
      
    </svg>);

}

import { RxPreviewDocument } from "@/src/components/organisms/rxpad/RxPreviewDocument";
import { useComposedRxPreviewSnapshot } from "@/src/components/organisms/rxpad/rx-preview-composer";








/**
 * RxPreviewSidebar — mirrors the dental-model Rx drawer pattern:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  [✕]  │  Rx Preview              [Download] [Print]      │  ← header
 *   ├──────────────────────────────────────────────────────────┤
 *   │                                                          │
 *   │   <collapsed RxPreviewCard — letterhead + body>          │  ← body
 *   │                                                          │
 *   └──────────────────────────────────────────────────────────┘
 *
 * - Solid close X on the far left (matching the patient-selection bottom
 *   sheet close glyph), followed by a vertical divider and the title.
 * - Backdrop dim + click-to-close + ESC to close.
 */
export function RxPreviewSidebar({ open, onClose, patientId }) {
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      const frameId = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frameId);
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => setIsMounted(false), 300);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  // ESC closes the panel.
  useEffect(() => {
    if (!isMounted) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMounted, onClose]);

  // Live snapshot — re-renders whenever any RxPad form value changes.
  const snapshot = useComposedRxPreviewSnapshot(patientId ?? "");

  if (!isMounted) return null;

  return (
    <>
      {/* Dimming backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[150] bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`
        } />
      

      {/* Slide-in panel from the right */}
      <aside
        role="dialog"
        aria-label="Rx preview"
        aria-hidden={!isVisible}
        className={`fixed right-0 top-0 z-[151] flex h-full w-[60vw] min-w-[520px] max-w-[94vw] flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isVisible ? "translate-x-0" : "translate-x-full"}`
        }>
        
        {/* ── Header ───────────────────────────────────────────────
            Left side: solid close X (same glyph used in the patient
            selection bottom sheet) → divider → "Rx Preview" title. */}
        <header className="flex h-[56px] shrink-0 items-center gap-3 border-b border-tp-slate-100 px-[16px]">
          <div className="flex min-w-0 items-center gap-[12px]">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-tp-slate-700 transition-colors hover:text-tp-slate-900 active:scale-[0.96]">
              
              <CloseSquareIcon size={22} />
            </button>
            {/* Vertical divider between close and title */}
            <span
              aria-hidden
              className="h-[24px] w-px shrink-0 bg-tp-slate-200" />
            
            <h3 className="truncate text-[16px] font-semibold tracking-[-0.1px] text-tp-slate-800">
              Rx Preview
            </h3>
          </div>
        </header>

        {/* ── Body — slate wash with the RxPreviewDocument letterhead.
              Same document the End Visit page renders, so the two surfaces
              stay visually consistent. */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-tp-slate-50/80 px-[16px] py-[16px]">
          <RxPreviewDocument snapshot={snapshot} />
        </div>
      </aside>
    </>);

}