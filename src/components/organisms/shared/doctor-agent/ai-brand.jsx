"use client";

import { useId } from "react";

import { cn } from "@/src/hooks/utils";

export const AI_GRADIENT = "linear-gradient(135deg, #D565EA 0%, #673AAC 45%, #1A1994 100%)";
export const AI_GRADIENT_SOFT =
"linear-gradient(135deg, rgba(213,101,234,0.18) 0%, rgba(139,92,246,0.22) 50%, rgba(103,58,172,0.18) 100%)";

/**
 * Dr. Agent brand sparkle icon.
 *
 * - Default (withBackground=false): plain spark icon from /icons/dr-agent/spark-icon.svg
 * - withBackground=true: gradient background from /icons/dr-agent/agent-bg.svg
 *   with white spark overlay from /icons/dr-agent/agent-spark.svg
 *
 * Both background assets are the user's Figma exports with embedded gradient PNG textures.
 */
export function AiBrandSparkIcon({
  size = 24,
  className,
  withBackground = false,
  /** Inner white spark size as a fraction of `size` (appointment header uses ~0.55) */
  sparkOverlayScale = 0.55,
  /** When true, applies a "thinking" zoom-in / zoom-out + slow rotation
   *  animation — used during AI loading states (typing indicator,
   *  awaitingResponse, etc.) to signal the brain is working. */
  thinking = false







}) {
  const inner = Math.round(size * sparkOverlayScale);
  if (withBackground) {
    return (
      <span
        className={cn("pointer-events-none select-none relative inline-flex items-center justify-center overflow-hidden", className)}
        style={{ width: size, height: size, borderRadius: size * 0.3 }}
        aria-hidden="true">
        
        {/* Gradient background — Figma export with textured gradient */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/dr-agent/agent-bg.svg"
          width={size}
          height={size}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false} />
        
        {/* White spark icon overlay — centered; scale matches appointment agent when sparkOverlayScale is default */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/dr-agent/agent-spark.svg"
          width={inner}
          height={inner}
          alt=""
          className="relative z-10"
          draggable={false} />
        
      </span>);

  }

  // Standalone spark — use the user-provided asset as-is.
  return (
    <span
      className={cn(
        "pointer-events-none inline-flex select-none items-center justify-center",
        thinking && "ai-spark-thinking",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true">
      
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/dr-agent/spark-icon.svg"
        width={size}
        height={size}
        alt=""
        draggable={false} />
      
      {thinking &&
      {/* styles live in app/globals.css */}
      }
    </span>);

}

/** Inline sparkle glyph filled with the TP AI gradient (D565EA → 673AAC → 1A1994). */
export function TpAiSparkIcon({
  size = 24,
  className



}) {
  const uid = useId();
  const gradId = `${uid}-tp-ai-spark`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true">
      
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D565EA" />
          <stop offset="55%" stopColor="#673AAC" />
          <stop offset="100%" stopColor="#1A1994" />
        </linearGradient>
      </defs>
      {/* 4-point sparkle */}
      <path
        d="M12 2L13.6 8.4L20 10L13.6 11.6L12 18L10.4 11.6L4 10L10.4 8.4L12 2Z"
        fill={`url(#${gradId})`} />
      
      {/* Small accent star */}
      <path
        d="M19 14L19.9 16.4L22.3 17.3L19.9 18.2L19 20.6L18.1 18.2L15.7 17.3L18.1 16.4L19 14Z"
        fill={`url(#${gradId})`}
        opacity="0.75" />
      
    </svg>);

}