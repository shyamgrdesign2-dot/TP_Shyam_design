"use client";


import { cn } from "@/src/hooks/utils";
import { NoiseOverlay } from "@/src/components/atoms/NoiseOverlay/NoiseOverlay";








/**
 * AppointmentBanner — The dark radial-gradient hero banner used on the
 * Appointments page. Rounded bottom corners (16px), 148px tall (was
 * 149px pre-sweep — restored to the nearest even).
 *
 * Background: radial-gradient purple (#46286C → #25113E → #372153 → #6C4F90)
 * The card below should use -mt-[60px] so it overlaps this banner.
 */
export function AppointmentBanner({ title, actions, className }) {
  return (
    <div
      className={cn(
        "relative h-[148px] w-full overflow-hidden rounded-b-[16px]",
        className
      )}
      style={{
        background:
        "radial-gradient(99.09% 59.99% at 50% 55.44%, #46286C 0%, #25113E 39.08%, #372153 78.16%, #6C4F90 100%)"
      }}>
      
      {/* Geometric line pattern — right-aligned, scaled to banner height */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/8b46197b8125e32aedb152d3d430b818c39f3157.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-auto opacity-[0.75]"
        style={{ mixBlendMode: "screen", objectFit: "contain", objectPosition: "right center" }} />
      

      {/* Noise grain texture */}
      <NoiseOverlay opacity={0.06} />

      {/* Content */}
      <div className="relative h-full px-3 pt-6 sm:px-6 lg:px-[18px]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 flex-1 font-heading text-[24px] font-bold leading-[1.15] text-white">
            {title}
          </h1>
          {actions &&
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {actions}
            </div>
          }
        </div>
      </div>
    </div>);

}