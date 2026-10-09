
import React from "react"

/** Scooped horizontal "Dr. Agent" tab shape. Designed for a 430×115 viewBox. */
const FAB_PATH =
  "M395.24 23.6125C381.35 31.5666 366.81 41.5232 360.83 55.4195C352.63 74.3548 341.13 86.7689 319.47 86.769H110.53C88.87 86.7689 77.37 74.3548 69.17 55.4195C63.19 41.5232 48.62 31.5666 34.73 23.6125L28.43 20H401.32L395.24 23.6125Z"

/** Centre point on the flat edge of the shape (x=215, y=20), used so the rotation
 *  anchors the flat edge against the viewport's right border when rotated 90deg. */

/** Crisp 5-point white spark with a gentle shimmer loop — matches the brand spark. */
function WhiteSparkIcon({ size = 42 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="4 4 16 16"
      fill="none"
      aria-hidden="true"
      className="animate-[sparkShimmer_4s_ease-in-out_infinite]"
    >
      <style>{`
        @keyframes sparkShimmer {
          0%, 100% { opacity: 0.88; transform: scale(1) rotate(0deg); }
          50%      { opacity: 1;    transform: scale(1.12) rotate(15deg); }
        }
      `}</style>
      <path
        d="M18.0841 11.612C18.4509 11.6649 18.4509 12.3351 18.0841 12.388C14.1035 12.9624 12.9624 14.1035 12.388 18.0841C12.3351 18.4509 11.6649 18.4509 11.612 18.0841C11.0376 14.1035 9.89647 12.9624 5.91594 12.388C5.5491 12.3351 5.5491 11.6649 5.91594 11.612C9.89647 11.0376 11.0376 9.89647 11.612 5.91594C11.6649 5.5491 12.3351 5.5491 12.388 5.91594C12.9624 9.89647 14.1035 11.0376 18.0841 11.612Z"
        fill="white"
      />
    </svg>
  )
}

/**
 * Dr. Agent FAB — scooped horizontal tab that hugs the right edge of the viewport.
 * Rotated 90° so the flat side sits against the edge and the curve bows inward.
 * Brand gradient (pink → violet → indigo) + soft drop shadow.
 *
 * Geometry (in rotated-display coordinates):
 *   viewport anchor:  right edge, vertically centered
 *   flat (sized)      230 × 66 px
 *   natural viewBox   430 × 115 (content rendered at scale ≈ 0.535)
 */
export function DrAgentFab({ onClick }) {
  const GRADIENT_ID = "da-fab-shell"
  const SHADOW_ID = "da-fab-shadow"

  return (
    <div
      className="group fixed z-40 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Open Velora"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick()
      }}
      // Outer frame holds the flat-shape in its post-rotation footprint (66×230).
      // Vertically centred against the viewport, as the header comment describes
      // (source had it bottom-anchored, which read as a stray tab near the corner).
      style={{ right: 0, top: "50%", transform: "translateY(-50%)", width: 66, height: 230 }}
    >
      {/* Hover tooltip — appears left of the tab */}
      <div className="pointer-events-none absolute right-[72px] top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="relative whitespace-nowrap rounded-[6px] bg-tp-slate-800 px-[8px] py-[4px] text-[12px] font-medium text-white shadow-lg">
          Open Velora
          <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-[4px] border-transparent border-l-tp-slate-800" />
        </div>
      </div>

      {/* Rotated tab — flat 230×66 → rotated 90° so the scoop faces left. */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: 230,
          height: 66,
          transform: "translate(-50%, -50%) rotate(90deg)",
          transformOrigin: "center center",
        }}
      >
        {/* Gradient shape with soft drop shadow */}
        <svg
          className="pointer-events-none block overflow-visible"
          width={230}
          height={66}
          viewBox="0 0 430 115"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", left: -7, top: -14 }}
        >
          <defs>
            <filter
              id={SHADOW_ID}
              x="0"
              y="0"
              width="430"
              height="114.769"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="4" />
              <feGaussianBlur stdDeviation="12" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.175838 0 0 0 0 0.173404 0 0 0 0 0.173404 0 0 0 0.42 0"
              />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feBlend in="SourceGraphic" in2="effect1_dropShadow" mode="normal" result="shape" />
            </filter>
            <linearGradient
              id={GRADIENT_ID}
              x1="28.43"
              x2="401.32"
              y1="53"
              y2="53"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#D565EA" />
              <stop offset="0.5" stopColor="#673AAC" />
              <stop offset="1" stopColor="#1A1994" />
            </linearGradient>
          </defs>
          <g filter={`url(#${SHADOW_ID})`}>
            <path d={FAB_PATH} fill={`url(#${GRADIENT_ID})`} />
          </g>
        </svg>

        {/* Content layer — spark + label, horizontally laid out in the un-rotated frame */}
        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            left: -7,
            top: -11.75,
            width: 430,
            height: 115,
            transform: "scale(0.5349)",
            transformOrigin: "0 0",
          }}
        >
          <div
            style={{
              width: 430,
              height: 115,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              padding: "17px 60px 26px",
            }}
          >
            <WhiteSparkIcon size={42} />
            <span
              style={{
                color: "white",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "0.3px",
                textShadow: "0 1px 3px rgba(0,0,0,0.25)",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              Velora
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
