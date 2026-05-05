"use client";

import { useEffect, useState } from "react";

import { VOICE_RX_LOADER_HINTS } from "@/src/components/organisms/voicerx/utils";
import { cn } from "@/src/hooks/utils";
import styles from "./RxPadAiOverlay.module.scss";






/**
 * RxPad AI overlay — heavy backdrop-blur on the underlying content with a
 * centred AI loading state, TP AI gradient corners, and progress indicator.
 */
export function RxPadAiOverlay({ active, className }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    setIdx(0);
    const iv = setInterval(() => setIdx((i) => (i + 1) % VOICE_RX_LOADER_HINTS.length), 2400);
    return () => clearInterval(iv);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden",
        styles.overlay,
        className
      )}
      aria-live="polite"
      role="status">
      
      {/* ── Heavy backdrop blur — full-obscure pass so only the loader reads ── */}
      <div
        className={cn("absolute inset-0 z-0", styles.backdrop)} />
      

      {/* ── Corner gradient accents — TP AI gradient: pink + violet + blue ── */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        {/* Top-left — pink */}
        <div className={cn("absolute left-0 top-0", styles.cornerTopLeft)} />
        {/* Top-right — violet */}
        <div className={cn("absolute right-0 top-0", styles.cornerTopRight)} />
        {/* Bottom-right — blue */}
        <div className={cn("absolute bottom-0 right-0", styles.cornerBottomRight)} />
        {/* Bottom-left — pink+violet blend */}
        <div className={cn("absolute bottom-0 left-0", styles.cornerBottomLeft)} />
      </div>

      {/* ── Edge gradient sweep — TP AI gradient rotating around border ── */}
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
        <div className={cn("absolute inset-0", styles.edgeSweep)} />
      </div>

      {/* ── Centred content ── */}
      <div className="relative z-[3] flex flex-col items-center gap-[20px] px-6">
        {/* Rotating TP AI spark — same coin-flip + halo family as the
             chat TypingIndicator & VoiceRxLoaderCard. Using the shared
             visual grammar here so every "AI is thinking" moment in the
             product reads as the same loader, not a bespoke spinner. */}
        <span className="rx-overlay-spark relative inline-flex items-center justify-center" aria-hidden>
          <span className="rx-overlay-halo" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/dr-agent/spark-icon.svg"
            alt=""
            draggable={false}
            width={52}
            height={52}
            className="rx-overlay-flip pointer-events-none relative select-none" />
          
        </span>

        {/* Label */}
        <p
          className={cn("text-[14px] font-semibold tracking-[0.3px]", styles.labelText)}>
          
          Structuring your Rx
        </p>

        {/* Transcript hint carousel */}
        <div className="relative h-[20px] w-[260px] overflow-hidden text-center">
          {VOICE_RX_LOADER_HINTS.map((h, i) =>
          <span
            key={h}
            className={cn(
              "absolute inset-x-0 text-[14px] font-medium transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              styles.hintSpan,
              i === idx ?
              "translate-y-0 opacity-100" :
              i === (idx - 1 + VOICE_RX_LOADER_HINTS.length) % VOICE_RX_LOADER_HINTS.length ?
              "-translate-y-3 opacity-0" :
              "translate-y-3 opacity-0"
            )}>
            
              {h}
            </span>
          )}
        </div>

        {/* Progress bar — wider */}
        <div
          className={cn("relative h-[3px] w-[220px] overflow-hidden rounded-full", styles.progressTrack)}
          aria-hidden>
          
          <span className={cn("absolute inset-y-0 w-[45%] rounded-full", styles.progressBar)} />
        </div>
      </div>
      {/* styles live in app/globals.css */}
    </div>);

}