"use client";

import { cn } from "@/src/hooks/utils";

/**
 * Compact SVG triangle arrow for flagged clinical values.
 * ▲ for high/critical, ▼ for low — always in error red.
 *
 * Usage: Inline next to lab values, vitals, or any numeric
 * parameter that can be outside normal range.
 */
export function FlagArrow({
  flag,
  className



}) {
  const isUp = flag === "high" || flag === "critical";
  return (
    <span className={cn("inline-flex items-center text-tp-error-500", className)}>
      <svg width={8} height={8} viewBox="0 0 8 8" fill="none">
        <path
          d={isUp ? "M4 1L7 6H1L4 1Z" : "M4 7L1 2H7L4 7Z"}
          fill="currentColor" />
        
      </svg>
    </span>);

}