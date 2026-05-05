"use client";

/**
 * SourcePill — small "Source" pill with a portaled hover tooltip listing
 * the data sources backing the agent's response. Replaces the older
 * `<SourceInfoIcon>` (info-circle only) so the affordance is more
 * discoverable without taking too much space.
 *
 * Visual contract matches the existing agent-response footer pattern:
 *   • Icon (note-2 style document) + the literal label "Source"
 *   • text-tp-slate-400 by default, slate-500 on hover, slate-50 bg
 *   • Tooltip is rendered into `document.body` via a fixed-positioned
 *     portal so no ancestor `overflow: hidden` (chat scroll, drawer)
 *     can clip it. Anchor recomputed on scroll/resize while open.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/src/hooks/utils";






export function SourcePill({ sources, className }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 6, left: r.left });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="View data sources"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-[3px] rounded-[4px] px-[5px] py-[2px] transition-colors text-tp-slate-400 hover:text-tp-slate-500 hover:bg-tp-slate-50",
          className
        )}>
        
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M22 10v5c0 5-2 7-7 7H9c-5 0-7-2-7-7V9c0-5 2-7 7-7h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 10h-4c-3 0-4-1-4-4V2l8 8ZM7 13h6M7 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[14px] font-medium leading-[1]">Source</span>
      </button>

      {open && pos && typeof document !== "undefined" ?
      createPortal(
        <div
          role="tooltip"
          className="rounded-[8px] bg-tp-slate-900 px-[12px] py-[10px] shadow-[0_12px_28px_-12px_rgba(15,23,42,0.55)]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 2147483647,
            minWidth: 180,
            maxWidth: 260,
            pointerEvents: "none"
          }}>
          
              <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55">Sources</p>
              <div className="flex flex-col gap-[6px]">
                {sources.map((s, i) =>
            <div key={i} className="flex items-center gap-[8px]">
                    <div className="h-[6px] w-[6px] flex-shrink-0 rounded-full bg-tp-violet-300" />
                    <span className="text-[12px] leading-[1.4] text-white">{s}</span>
                  </div>
            )}
              </div>
            </div>,
        document.body
      ) :
      null}
    </>);

}