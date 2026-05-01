"use client"

import { RxPadAiOverlay } from "@/components/rx/rxpad/RxPadAiOverlay"

interface FullscreenAiOverlayProps {
  active: boolean
  /** Leave this many pixels visible on the right edge so the Dr. Agent
   *  rail stays interactive during processing. Same logic used by
   *  VoiceRxLiveBorder so the overlay and the edge rim align. */
  rightOffset?: number
}

/**
 * Full-viewport AI processing overlay.
 *
 * When the voice submission is being processed (`aiFillInProgress`), this
 * blurs EVERYTHING behind it — top nav, blue sidebar, RxPad — leaving
 * only the voice edge rim visible. The RxPadAiOverlay visuals (heavy
 * backdrop blur + TP AI corner accents + rotating sweep + centered
 * rotating spark + progress bar) are reused verbatim; the wrapper just
 * anchors them to the viewport instead of the RxPad container.
 */
export function FullscreenAiOverlay({ active, rightOffset = 0 }: FullscreenAiOverlayProps) {
  if (!active) return null
  return (
    <div
      className="pointer-events-auto fixed left-0 bottom-0 z-[134]"
      style={{
        // Starts BELOW the 62-px top nav so the top bar stays crisp
        // (disabled by the existing voice-lock, but visually intact).
        // Only the RxPad + secondary sidebar content below this get
        // blurred + loader'd.
        top: 62,
        right: rightOffset,
      }}
      aria-live="polite"
    >
      <RxPadAiOverlay active className="!z-0" />
    </div>
  )
}
