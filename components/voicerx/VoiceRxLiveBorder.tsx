"use client"

import React from "react"

/**
 * VoiceRxLiveBorder — TP AI gradient edge aura.
 *
 * Four thin coloured rims — top / right / bottom / left — each painting the
 * canonical TP AI gradient (#D565EA → #673AAC → #1A1994) across the whole
 * side. The colour palette is intentionally limited to the brand stops; the
 * shift effect comes from a *narrow-band* hue-rotation (±18°) that breathes
 * the gradient back and forth without drifting away from the TP palette —
 * so you never see cyans, pinks or any off-brand hues.
 *
 * Three behaviours layered per rim:
 *
 *   1. Brand-bounded hue sway (vrxHueSway).   8 s ease-in-out, shared by
 *                                             every edge via `--vrx-hue`.
 *   2. Gentle drift.                          Smooth slide + pulse glow
 *                                             (Gemini-like ambient motion).
 *
 * Default state is deliberately faint — just a hint of violet along the
 * frame — so the interface stays calm and does not react to voice level.
 */
interface VoiceRxLiveBorderProps {
  active: boolean
  /** Pixel offset from the right edge (to clear the Dr. Agent panel when open) */
  rightOffset?: number
}

export function VoiceRxLiveBorder({ active, rightOffset = 0 }: VoiceRxLiveBorderProps) {
  if (!active) return null
  return (
    <>
      <div
        className="vrx-live-halo"
        aria-hidden
        style={{ right: `${rightOffset}px` }}
      >
        <span className="vrx-live-edge vrx-live-edge--top" />
        <span className="vrx-live-edge vrx-live-edge--right" />
        <span className="vrx-live-edge vrx-live-edge--bottom" />
        <span className="vrx-live-edge vrx-live-edge--left" />
      </div>
      <style>{`
        /* Registered <angle> so hue-rotate interpolates smoothly rather
           than stepping. inherits:false so each edge can hold its OWN
           --vrx-hue value simultaneously — that's the key to the
           "rotation illusion" (see below). */
        @property --vrx-hue {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        /* Always-on idle breathe. Animated on the halo root and inherited
           by every edge so they all breathe in unison. Multiplied into
           each edge's opacity (see .vrx-live-edge) so the rim never sits
           fully static — it glows gently in and out even during silence. */
        @property --vrx-idle {
          syntax: '<number>';
          inherits: true;
          initial-value: 1;
        }
        @keyframes vrxIdleBreathe {
          0%, 100% { --vrx-idle: 0.35; }
          50%      { --vrx-idle: 1.45; }
        }

        .vrx-live-halo {
          position: fixed;
          top: 62px;
          left: 0;
          bottom: 0;
          z-index: 136; /* above RxPad portals (z-130), FullscreenAiOverlay
                          (z-24) and the Dr. Agent rail (z-135). */
          pointer-events: none;
          border-radius: 0;
          overflow: hidden;
          transition: right 0.45s cubic-bezier(0.16, 1, 0.3, 1);
          animation:
            vrxHaloEnter 700ms cubic-bezier(0.16, 1, 0.3, 1) both,
            vrxIdleBreathe 3.8s ease-in-out infinite;
          will-change: opacity, --vrx-idle;
        }
        @keyframes vrxHaloEnter {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }

        /* ── Rotation illusion via PHASE-OFFSET hue sway.
              Every edge runs the SAME 3.2s hue-sway (±35°) keyframe, but
              each one starts at a different phase. Because the @property
              --vrx-hue is per-element (inherits:false), every side is at
              a DIFFERENT point in the colour cycle at any given moment.
              As time passes, each side's colour shifts — and because they
              are offset by ¼ period each, the eye reads it as "the hue is
              rotating around the frame". No gradients actually slide;
              all four sides are always fully coloured. ───────────── */
        @keyframes vrxHueSway {
          0%, 100% { --vrx-hue: -35deg; }
          50%      { --vrx-hue:  35deg; }
        }

        /* ── Shared edge-strip base — pink → violet → deep violet. Full
              TP AI gradient on every side, no masks, always visible. */
        .vrx-live-edge {
          position: absolute;
          opacity: calc(0.84 * var(--vrx-idle, 1));
          will-change: transform, filter, opacity;
        }

        /* Top / bottom strips */
        .vrx-live-edge--top,
        .vrx-live-edge--bottom {
          left: -5%;
          right: -5%;
          height: 3.5%;
          filter:
            blur(14px)
            hue-rotate(var(--vrx-hue, 0deg));
          will-change: filter, transform;
        }
        .vrx-live-edge--top {
          top: -2.5%;
          background: linear-gradient(90deg,
            rgba(213, 101, 234, 1)   0%,
            rgba(139,  92, 246, 1)  55%,
            rgba(213, 101, 234, 1) 100%);
          animation:
            vrxEdgeDriftTop 5.8s ease-in-out infinite,
            vrxHueSway 3.2s ease-in-out infinite 0s;
        }
        .vrx-live-edge--bottom {
          bottom: -2.5%;
          background: linear-gradient(90deg,
            rgba(213, 101, 234, 1)   0%,
            rgba(139,  92, 246, 1)  55%,
            rgba(213, 101, 234, 1) 100%);
          animation:
            vrxEdgeDriftBottom 6.2s ease-in-out infinite,
            vrxHueSway 3.2s ease-in-out infinite -1.6s;
        }

        /* Left / right strips */
        .vrx-live-edge--left,
        .vrx-live-edge--right {
          top: -5%;
          bottom: -5%;
          width: 3%;
          filter:
            blur(16px)
            hue-rotate(var(--vrx-hue, 0deg));
          will-change: filter, transform;
        }
        .vrx-live-edge--left {
          left: -2.5%;
          background: linear-gradient(180deg,
            rgba(213, 101, 234, 1)   0%,
            rgba(139,  92, 246, 1)  55%,
            rgba(213, 101, 234, 1) 100%);
          animation:
            vrxEdgeDriftLeft 6s ease-in-out infinite,
            vrxHueSway 3.2s ease-in-out infinite -2.4s;
        }
        .vrx-live-edge--right {
          right: -2.5%;
          background: linear-gradient(180deg,
            rgba(213, 101, 234, 1)   0%,
            rgba(139,  92, 246, 1)  55%,
            rgba(213, 101, 234, 1) 100%);
          animation:
            vrxEdgeDriftRight 6.4s ease-in-out infinite,
            vrxHueSway 3.2s ease-in-out infinite -0.8s;
        }

        @keyframes vrxEdgeDriftTop {
          0%, 100% { transform: translateY(0%) scaleY(1); }
          50% { transform: translateY(1.4%) scaleY(1.08); }
        }
        @keyframes vrxEdgeDriftBottom {
          0%, 100% { transform: translateY(0%) scaleY(1); }
          50% { transform: translateY(-1.4%) scaleY(1.08); }
        }
        @keyframes vrxEdgeDriftLeft {
          0%, 100% { transform: translateX(0%) scaleX(1); }
          50% { transform: translateX(1.2%) scaleX(1.08); }
        }
        @keyframes vrxEdgeDriftRight {
          0%, 100% { transform: translateX(0%) scaleX(1); }
          50% { transform: translateX(-1.2%) scaleX(1.08); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vrx-live-edge { animation: none; }
          .vrx-live-halo {
            animation: vrxHaloEnter 300ms linear both;
          }
        }
      `}</style>
    </>
  )
}
