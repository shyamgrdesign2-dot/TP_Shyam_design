"use client";

/**
 * FreshUpdateChip — small pill rendered next to a COLLAPSED group/date
 * header to tell the doctor "new data was added inside this group."
 *
 * Visual contract:
 *   - subtle violet/blue gradient background (matches the AI brand tones)
 *   - a sweeping highlight bar shimmers across the chip every ~2.4s
 *   - count label e.g. "3 updated"
 *   - shimmer auto-stops after `shimmerDurationMs` (default ~6s) so the
 *     chip becomes a static pill once the doctor has had a chance to see
 *     it; the chip itself stays until the underlying data is no longer
 *     "fresh" or the user opens the section
 *
 * Two states are conveyed:
 *   1. shimmering = active fresh update just landed — draws the eye
 *   2. settled    = chip still visible but no longer animating — calmer
 */

import { useEffect, useState } from "react";
import { cn } from "@/src/hooks/utils";

const STYLE_TAG_ID = "rx-fresh-chip-styles";
const KEYFRAMES_CSS = `
@keyframes rxFreshChipSweep {
  0%   { transform: translateX(-120%); opacity: 0; }
  20%  { opacity: 0.85; }
  60%  { opacity: 0.85; }
  100% { transform: translateX(220%); opacity: 0; }
}
@keyframes rxFreshChipPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(103, 58, 172, 0.0); }
  50%      { box-shadow: 0 0 0 3px rgba(103, 58, 172, 0.10); }
}
`;

/**
 * Inject keyframes once per page (idempotent across mounts) — kept
 * alongside the chip so HMR picks it up reliably.
 */
function ensureKeyframesInjected() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = KEYFRAMES_CSS;
  document.head.appendChild(style);
}











export function FreshUpdateChip({
  count,
  shimmerDurationMs = 6000,
  forceSettled = false,
  className
}) {
  const [shimmering, setShimmering] = useState(!forceSettled);

  useEffect(() => {
    ensureKeyframesInjected();
  }, []);

  useEffect(() => {
    if (forceSettled) {
      setShimmering(false);
      return;
    }
    setShimmering(true);
    const t = window.setTimeout(() => setShimmering(false), shimmerDurationMs);
    return () => window.clearTimeout(t);
  }, [forceSettled, shimmerDurationMs, count]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center overflow-hidden rounded-full px-[7px] py-[2px] text-[10px] font-semibold leading-[14px] text-tp-violet-700",
        "bg-[linear-gradient(135deg,rgba(213,101,234,0.14)_0%,rgba(103,58,172,0.10)_60%,rgba(26,25,148,0.08)_100%)]",
        "border border-[rgba(103,58,172,0.18)]",
        shimmering && "[animation:rxFreshChipPulse_1.8s_ease-in-out_infinite]",
        className
      )}
      aria-label={`${count} new updates`}>
      
      <span className="relative z-[1]">{count} updated</span>
      {shimmering ?
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-[55%] [background:linear-gradient(100deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.85)_50%,rgba(255,255,255,0)_100%)] [animation:rxFreshChipSweep_2.4s_ease-in-out_infinite]" /> :

      null}
    </span>);

}