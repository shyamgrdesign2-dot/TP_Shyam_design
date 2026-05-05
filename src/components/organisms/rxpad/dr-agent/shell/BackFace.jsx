"use client";

import { cn } from "@/src/hooks/utils";
import { VoiceRxCanvas } from "@/src/components/organisms/voicerx/VoiceRxCanvas";
import { VoiceRxActiveAgent } from "@/src/components/organisms/voicerx/VoiceRxActiveAgent";
import { VoiceStructuredRxCard } from "../cards/action/VoiceStructuredRxCard";




































export function BackFace({
  isFlipped,
  isPanelVisible,
  voiceRxResult,
  voiceRxDialogChoice,
  voiceRxLiveTranscript,
  voiceRxAwaitingResponse,
  voiceRxHandoffExiting,
  patientName,
  onCancel,
  onSubmit,
  onCollapse,
  onExpand,
  onPauseChange,
  onBack,
  onMinimize,
  onAddDetailsByVoice,
  onCopyResult,
  onCopyAll
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full bg-white",
        (!isFlipped || !isPanelVisible) && "pointer-events-none invisible"
      )}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg) translate3d(0,0,1px)",
        WebkitTransform: "rotateY(180deg) translate3d(0,0,1px)"
      }}>
      
      <div className="h-full w-full overflow-hidden">
        {isFlipped && voiceRxResult ?
        <VoiceRxCanvas
          modeLabel={voiceRxResult.modeLabel}
          transcript={voiceRxResult.transcript}
          emrCard={
          <VoiceStructuredRxCard
            data={voiceRxResult.structured}
            onCopy={onCopyResult}
            hideHeader={true} />

          }
          onCopyToRx={onCopyAll}
          onBack={onBack}
          onMinimize={onMinimize}
          onAddDetailsByVoice={onAddDetailsByVoice} /> :

        isFlipped ?
        <VoiceRxActiveAgent
          mode={voiceRxDialogChoice}
          transcript={voiceRxLiveTranscript}
          isAwaitingResponse={voiceRxAwaitingResponse}
          isHandoffExiting={voiceRxHandoffExiting}
          onCancel={onCancel}
          onSubmit={onSubmit}
          onCollapse={onCollapse}
          onExpand={onExpand}
          isPanelVisible={isPanelVisible}
          onPauseChange={onPauseChange}
          patientName={patientName} /> :

        null}
      </div>
    </div>);

}