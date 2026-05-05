/**
 * Personal Notes panel — free-form notes area.
 */
import React, { useEffect, useMemo, useState } from "react";

import { isHistoricalMetaLine, useHistoricalSectionHighlights } from "../HistoricalInlineUpdates";

const PERSONAL_NOTES_STORAGE_KEY = "tp-rxpad-personal-notes";

export function PersonalNotesContent() {
  const { lines, hasFresh, showTooltipOnFirstOpen } = useHistoricalSectionHighlights("personalNotes");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(PERSONAL_NOTES_STORAGE_KEY);
    if (saved != null) {
      setNotes(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PERSONAL_NOTES_STORAGE_KEY, notes);
  }, [notes]);

  const voiceNotes = useMemo(
    () =>
    lines.
    map((line) => line.text.trim()).
    filter((line) => line && !isHistoricalMetaLine(line)),
    [lines]
  );

  const mergedNotes = useMemo(() => {
    const allLines = [
    ...notes.split("\n").map((line) => line.trim()).filter(Boolean),
    ...voiceNotes];

    return [...new Set(allLines)].join("\n");
  }, [notes, voiceNotes]);

  return (
    <div className="content-stretch flex flex-col items-start relative size-full">
      <div className="flex-[1_0_0] min-h-px min-w-px relative w-full overflow-y-auto">
        <div className="content-stretch flex flex-col gap-[12px] items-start p-[12px] w-full">
          {/* Textarea with a floating mic chip in the bottom-right
              corner — tap to dictate the personal note. The chip uses
              the same Voice Rx gradient family as the per-section mic
              on the Rx pad so the doctor recognises it instantly. */}
          <div className="relative w-full">
            <textarea
              value={mergedNotes}
              onChange={(event) => setNotes(event.currentTarget.value)}
              placeholder="Write private notes..."
              title={showTooltipOnFirstOpen && hasFresh ? "Updated by VoiceRx" : undefined}
              className={`min-h-[360px] w-full resize-y rounded-[10px] border bg-white px-3 py-2 pb-[44px] font-['Inter',sans-serif] text-[14px] leading-[20px] text-tp-slate-700 placeholder:text-tp-slate-400 focus:border-tp-blue-200 focus:outline-none focus:ring-0 ${hasFresh ? "border-[rgba(103,58,172,0.08)] bg-[linear-gradient(135deg,rgba(213,101,234,0.05)_0%,rgba(103,58,172,0.045)_55%,rgba(26,25,148,0.04)_100%)] shadow-[0_6px_18px_-18px_rgba(103,58,172,0.24)] animate-pulse" : "border-tp-slate-100"}`} />
            
            <button
              type="button"
              aria-label="Use Voice AI to fill personal notes"
              title="Use Voice AI to fill personal notes"
              onClick={() => {
                /* For the demo: dispatch the same signal the section
                   mic icons use so VoiceRxFlow can attach a recorder
                   here. Falls back to a no-op when the listener
                   isn't mounted (e.g. printable view). */
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("voicerx:dictate-personal-notes"));
                }
              }}
              className="absolute bottom-[10px] right-[10px] inline-flex h-[28px] w-[28px] items-center justify-center transition-transform hover:scale-[1.06] active:scale-[0.94]">
              
              <span className="tp-voice-wave-icon" aria-hidden />
            </button>
          </div>
          <p className="text-[12px] leading-[16px] text-tp-slate-500">
            Doctor-only note. This content is not included in print and is never shared with the patient.
          </p>
        </div>
      </div>
    </div>);

}