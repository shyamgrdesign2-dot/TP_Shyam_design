"use client";

import { useEffect, useState } from "react";

import { cn } from "@/src/hooks/utils";
import { VOICE_RX_LOADER_HINTS } from "./utils";

/**
 * Inline "Dr. Agent is thinking" indicator rendered in the chat thread while
 * the submitted voice transcript is being processed. Deliberately restrained —
 * no shimmer bars, no glow — just a quiet triplet of breathing dots and a
 * softly-rotating hint line. Reads like a premium voice assistant, not a
 * progress meter.
 */
export function VoiceRxLoaderCard({ className }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(
      () => setIdx((i) => (i + 1) % VOICE_RX_LOADER_HINTS.length),
      2000
    );
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      className={cn(
        "relative flex items-start gap-[8px] py-[6px] pl-[4px] pr-[2px]",
        className
      )}
      role="status"
      aria-live="polite">
      
      {/* Quirky coin-flip spark with breathing AI halo */}
      <span className="vrx-loader-spark relative mt-[1px] inline-flex shrink-0 items-center justify-center" aria-hidden>
        <span className="vrx-loader-halo" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/dr-agent/spark-icon.svg"
          alt=""
          draggable={false}
          width={22}
          height={22}
          className="vrx-loader-flip pointer-events-none relative select-none" />
        
      </span>

      <div className="flex flex-col gap-[4px] pt-[2px]">
        {/* Triplet of breathing dots */}
        <div className="flex items-center gap-[5px]" aria-hidden>
          {[0, 1, 2].map((i) =>
          <span
            key={i}
            className="block h-[5px] w-[5px] rounded-full bg-tp-slate-400"
            style={{
              animation: `vrxSubtleDot 1.4s ease-in-out ${i * 0.18}s infinite`
            }} />

          )}
        </div>

        <div className="relative h-[14px] min-w-0 overflow-hidden" style={{ width: 180 }}>
          {VOICE_RX_LOADER_HINTS.map((h, i) =>
          <span
            key={h}
            className={cn(
              "absolute inset-0 text-[12px] font-normal leading-[14px] text-tp-slate-500 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              i === idx ?
              "translate-y-0 opacity-100" :
              i === (idx - 1 + VOICE_RX_LOADER_HINTS.length) % VOICE_RX_LOADER_HINTS.length ?
              "-translate-y-2 opacity-0" :
              "translate-y-2 opacity-0"
            )}>
            
              {h}
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes vrxSubtleDot {
          0%, 100% { transform: translateY(0) scale(0.85); opacity: 0.4; }
          50%      { transform: translateY(-2px) scale(1);   opacity: 1; }
        }

        /* Coin-flip TP AI spark with breathing halo — matches TypingIndicator */
        .vrx-loader-spark {
          width: 26px;
          height: 26px;
          perspective: 500px;
        }
        .vrx-loader-flip {
          display: inline-block;
          transform-style: preserve-3d;
          animation: vrxLoaderSparkFlip 2.2s cubic-bezier(0.6, 0, 0.4, 1) infinite;
          filter: drop-shadow(0 1px 2px rgba(103, 58, 172, 0.25));
        }
        .vrx-loader-halo {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: radial-gradient(circle at 50% 50%,
            rgba(213, 101, 234, 0.30) 0%,
            rgba(139, 92, 246, 0.22) 40%,
            rgba(75, 74, 213, 0) 75%);
          animation: vrxLoaderHalo 2.2s ease-in-out infinite;
        }
        @keyframes vrxLoaderSparkFlip {
          0%   { transform: rotateY(0deg) scale(1); }
          25%  { transform: rotateY(180deg) scale(1.1); }
          50%  { transform: rotateY(360deg) scale(1); }
          75%  { transform: rotateY(540deg) scale(1.1); }
          100% { transform: rotateY(720deg) scale(1); }
        }
        @keyframes vrxLoaderHalo {
          0%, 100% { opacity: 0.55; transform: scale(0.85); }
          50%      { opacity: 1;    transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vrx-loader-flip { animation: none; }
          .vrx-loader-halo { animation: none; opacity: 0.5; }
        }
      `}</style>
    </div>);

}