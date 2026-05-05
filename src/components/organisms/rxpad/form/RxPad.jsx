"use client";

import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";



import { RxPadFunctional } from "./RxPadFunctional";

/**
 * RxPad content area.
 *
 * While a voice consultation is live, the viewport-wide block handler in
 * VoiceRxFlow catches all interaction attempts and shows the voice-Rx
 * tooltip. No per-component wiring is needed here.
 */
export function RxPad({ patientId, sectionConfig }) {
  const { aiFillInProgress } = useRxPadSync();
  return (
    <div className="relative h-full w-full">
      <div
        className={aiFillInProgress ? "pointer-events-none select-none" : undefined}
        aria-hidden={aiFillInProgress}>
        
        <RxPadFunctional patientId={patientId} sectionConfig={sectionConfig} />
      </div>
      {/* RxPadAiOverlay no longer rendered here — it's now mounted at the
           VoiceRxFlow root as a fullscreen fixed overlay that covers the
           RxPad AND the blue sidebar AND the top nav while the AI fill is
           in progress (keeping only the voice-rim edges visible). */}
    </div>);

}