"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ShineBorder } from "@/src/components/atoms/ShineBorder";
import { DictationTranscript } from "@/src/components/organisms/voicerx/VoiceTranscriptProcessingCard";

/**
 * Inline voice-processing overlay shown inside an Rx section while
 * VoiceRx is transcribing/structuring dictation for that module.
 *
 * Extracted from RxPadFunctional.tsx during Phase 8 decomposition.
 */
export function VoiceRxSectionProcessing({
  transcript,
  sectionLabel



}) {
  const captions = useMemo(() => [
  `Analysing your ${sectionLabel.toLowerCase()} dictation…`,
  "Structuring your clinical notes…",
  "Preparing entries for review…"],
  [sectionLabel]);
  const [captionIdx, setCaptionIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setCaptionIdx((i) => (i + 1) % captions.length), 2000);
    return () => window.clearInterval(t);
  }, [captions.length]);

  const transcriptScrollRef = useRef(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = transcriptScrollRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();
    let pausedUntil = 0;
    const PX_PER_SEC = 24;

    const tick = (now) => {
      if (now < pausedUntil) {
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - last) / 1000;
      last = now;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 8) {
        const next = el.scrollTop + PX_PER_SEC * dt;
        if (next >= max) {
          el.scrollTop = max;
          pausedUntil = now + 1400;
          window.setTimeout(() => {
            transcriptScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }, 1400);
        } else {
          el.scrollTop = next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex w-full min-h-0 flex-col items-center justify-center gap-[14px]">
      {/* Shiner card — content vertically + horizontally centered so the
           transcript sits in the middle of the box rather than top-
           anchored. Spacing below the box tightened so caption +
           progress loader read as one tight "we're working" cluster
           (matches VoiceRxActiveAgent.jsx in the sidebar). */}
      <div
        className="vrx-shiner-enter relative flex w-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-[16px] bg-tp-slate-50/60"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04)", maxHeight: 140 }}>

        <ShineBorder
          variant="rotate"
          borderWidth={1.5}
          duration={2.2}
          shineColor={["#D565EA", "#673AAC", "#1A1994"]}
          baseColor="rgba(226,226,234,0.95)" />

        <div
          ref={transcriptScrollRef}
          className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto p-[14px] text-center">

          {/* Instant render: word-by-word reveal added an unwanted
              ~5s delay before the doctor could read the transcript
              they just dictated. The loader caption covers the
              "we're working" feel. */}
          <DictationTranscript raw={transcript} animate={false} />
        </div>
      </div>

      {/* Caption shimmer carousel + line progress loader — same recipe
           as the VoiceRx sidebar (`VoiceRxActiveAgent.jsx`) for design
           parity. Replaces the previous circular SVG spinner so every
           "we're working" surface across the app uses the same
           horizontal AI-gradient progress meter. */}
      <div className="flex w-full flex-col items-center gap-[10px]">
        <div className="vrx-caption-stage flex w-full items-center justify-center text-[14px] font-semibold leading-[1.4] text-tp-slate-600">
          <span
            key={captionIdx}
            className="vrx-process-caption vrx-caption-slide whitespace-nowrap"
            style={{
              backgroundImage:
                "linear-gradient(100deg, #45455c 0%, #45455c 32%, #D565EA 46%, #673AAC 50%, #1A1994 54%, #45455c 68%, #45455c 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              display: "inline-block",
              paddingBottom: 2,
            }}>
            {captions[captionIdx]}
          </span>
        </div>

        <div className="vrx-progress-track relative h-[5px] w-[200px] overflow-hidden rounded-full bg-tp-slate-100/80 shadow-[0_0_0_1px_rgba(75,74,213,0.08),0_4px_14px_-6px_rgba(75,74,213,0.35)]">
          <span
            aria-hidden
            className="vrx-progress-fill absolute inset-y-0 left-0 block w-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #D565EA 0%, #673AAC 50%, #1A1994 100%)",
            }}
          />
          <span
            aria-hidden
            className="vrx-progress-sheen absolute inset-y-0 left-0 block w-[40%] rounded-full"
          />
        </div>
      </div>
      {/* vrx-progress-fill / vrx-progress-sheen keyframes live in
           app/globals.css */}
    </div>
  );
}