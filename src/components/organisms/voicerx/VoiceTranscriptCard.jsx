"use client";

import { useState } from "react";
import { ChevronUp, Mic } from "lucide-react";

import { cn } from "@/src/hooks/utils";












function formatDuration(ms) {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * VoiceTranscriptCard — the new transcript representation rendered in the
 * chat thread right after a voice submission.
 *
 * Header
 *   • Title: "Dictate Rx Transcript" | "Ambient Rx Transcript"
 *   • Mic-pill with elapsed duration ("1:23")
 *   • Chevron toggle — accordion expand/collapse
 *
 * Body
 *   • Dictation: flat paragraph (continuous clinical narration)
 *   • Ambient:   Doctor/Patient turns rendered as alternating chat
 *                bubbles (Doctor = left, neutral slate; Patient = right,
 *                brand-violet tint)
 */
export function VoiceTranscriptCard({
  mode = "dictation_consultation",
  transcript,
  durationMs,
  defaultExpanded = true,
  className
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const title =
  mode === "ambient_consultation" ? "Conversation Transcript" : "Dictation Transcript";

  const rawTranscript = transcript.replace(/\b(Doctor|Patient)\s*:\s*/gi, "").replace(/\n+/g, " ").trim();

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-[12px] rounded-br-[0px] bg-tp-slate-100",
        className
      )}>
      
      <div className="flex items-center justify-between gap-[10px] bg-white px-[14px] py-[10px]">
        <h4 className="truncate text-[14px] font-medium leading-[18px] tracking-[-0.05px] text-tp-slate-500">
          {title}
        </h4>
        <div className="flex flex-shrink-0 items-center gap-[8px]">
          <span
            className="inline-flex items-center gap-[4px] rounded-full bg-tp-slate-50/80 px-[10px] py-[3.5px] text-[12px] font-medium text-tp-slate-400 tabular-nums"
            aria-label={`Recording duration ${formatDuration(durationMs)}`}>
            
            <Mic size={12} strokeWidth={1.8} aria-hidden />
            {formatDuration(durationMs)}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse transcript" : "Expand transcript"}
            aria-expanded={expanded}
            className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] text-tp-slate-400 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-600 active:scale-[0.96]">
            
            <ChevronUp
              size={14}
              strokeWidth={2}
              aria-hidden
              className={cn(
                "transition-transform duration-200",
                expanded ? "" : "rotate-180"
              )} />
            
          </button>
        </div>
      </div>

      {expanded &&
      <div className="px-[14px] py-[12px]">
          <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-tp-slate-500">
            <span className="mr-[2px] text-tp-slate-300">&ldquo;</span>
            {rawTranscript}
            <span className="ml-[2px] text-tp-slate-300">&rdquo;</span>
          </p>
        </div>
      }
    </div>);

}