"use client";

import * as React from "react";

import { cn } from "@/src/hooks/utils";

/**
 * Inline keyframes — colocated so HMR / Turbopack picks them up
 * deterministically (rules appended to globals.css were getting dropped).
 * Idempotent: only injected once per page via an id check.
 */
const SHINE_STYLE_ID = "magicui-shine-keyframes";
function ensureShineKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHINE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHINE_STYLE_ID;
  style.textContent = `
/* "perimeter" mode — bright band traces the four corners. */
@keyframes shine {
  0%   { background-position: 0%   0%;   }
  25%  { background-position: 100% 0%;   }
  50%  { background-position: 100% 100%; }
  75%  { background-position: 0%   100%; }
  100% { background-position: 0%   0%;   }
}
.animate-shine { animation: shine var(--duration, 14s) linear infinite; }

/* "rotate" mode — clockwise spin of a conic gradient. The static base
   ring is painted by the parent's background-image, the rotating cone
   sits on top via this child overlay. */
@keyframes shineRotate {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.animate-shine-rotate { animation: shineRotate var(--duration, 8s) linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .animate-shine, .animate-shine-rotate { animation: none; }
}
`;
  document.head.appendChild(style);
}
































/**
 * ShineBorder — animated gradient border (magicui-style).
 *
 * Renders a single absolutely-positioned overlay that draws an animated
 * gradient stroke around its parent. The parent must be `position: relative`
 * (or have a containing block) and provide the radius via `border-radius`
 * — the overlay inherits via `rounded-[inherit]`.
 *
 * Usage with the TP AI gradient:
 *   <ShineBorder shineColor={["#D565EA", "#673AAC", "#1A1994"]} borderWidth={1.5} />
 */
export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = "#000000",
  variant = "perimeter",
  baseColor = "#FFFFFF",
  className,
  style,
  ...props
}) {
  React.useEffect(() => {
    ensureShineKeyframes();
  }, []);

  const colors = Array.isArray(shineColor) ? shineColor.join(",") : shineColor;

  if (variant === "rotate") {
    /**
     * Two-layer composition:
     *   1. STATIC base ring — painted by the OUTER element via a solid
     *      background-color (baseColor), shown wherever the rotating
     *      sweep below is transparent.
     *   2. ROTATING conic gradient — the inner span spins clockwise.
     *      Its conic gradient cycles transparent → shineColor → transparent
     *      so a ~60° bright arc moves around the border.
     * Both layers are masked to the perimeter via the same content-box
     * exclude mask used by the perimeter variant.
     */
    const maskStyle = {
      mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
      WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
      WebkitMaskComposite: "xor",
      maskComposite: "exclude",
      padding: "var(--border-width)"
    };
    return (
      <div
        style={
        {
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          backgroundColor: baseColor,
          ...maskStyle,
          ...style
        }
        }
        className={cn(
          "pointer-events-none absolute inset-0 size-full overflow-hidden rounded-[inherit]",
          className
        )}
        {...props}>
        
        <div className="absolute left-1/2 top-1/2 aspect-square w-[300%] -translate-x-1/2 -translate-y-1/2 animate-shine-rotate">
          <span
            aria-hidden
            className="block h-full w-full rounded-full"
            style={{
              backgroundImage: `conic-gradient(from 0deg, transparent 0deg, transparent 270deg, ${colors} 320deg, transparent 360deg)`,
              willChange: "transform"
            }} />
          
        </div>
      </div>);

  }

  // Default — perimeter "orbit" variant.
  return (
    <div
      style={
      {
        "--border-width": `${borderWidth}px`,
        "--duration": `${duration}s`,
        backgroundImage: `radial-gradient(transparent,transparent, ${colors},transparent,transparent)`,
        backgroundSize: "300% 300%",
        mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        padding: "var(--border-width)",
        ...style
      }
      }
      className={cn(
        "animate-shine pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
        className
      )}
      {...props} />);


}