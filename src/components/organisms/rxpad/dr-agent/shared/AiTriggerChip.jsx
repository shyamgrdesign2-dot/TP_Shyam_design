"use client";

import { useState } from "react";
import { cn } from "@/src/hooks/utils";
import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";













/**
 * Subtle AI trigger chip rendered inside RxPad sections.
 * Clicking it opens Dr. Agent and auto-sends a contextual message.
 *
 * Design: Warm purple gradient text with a subtle shimmer sweep.
 */
export function AiTriggerChip({
  label,
  signalLabel,
  sectionId,
  className,
  onAfterClick
}) {
  const { publishSignal } = useRxPadSync();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    publishSignal({
      type: "ai_trigger",
      label: signalLabel,
      sectionId
    });
    onAfterClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "inline-flex h-[28px] items-center gap-[4px] rounded-full px-[10px]",
        "text-[14px] font-medium transition-all",
        "animate-[fadeIn_300ms_ease-out]",
        className
      )}
      style={{
        background: isHovered ?
        "rgba(139, 92, 246, 0.08)" :
        "rgba(139, 92, 246, 0.05)",
        border: "1px solid rgba(139, 92, 246, 0.15)"
      }}>
      
      <span
        style={{
          background: "linear-gradient(90deg, #D565EA 0%, #8B5CF6 25%, #4F46E5 50%, #8B5CF6 75%, #D565EA 100%)",
          backgroundSize: "200% 100%",
          animation: "aiShimmer 3s ease-in-out infinite",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
        
        {label}
      </span>
    </button>);

}