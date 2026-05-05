"use client";

import { cn } from "@/src/hooks/utils";
import { VoiceRxIcon } from "@/src/components/organisms/voicerx/voice-consult-icons";
import { PillBar } from "../chat/PillBar";
import { AttachPanel } from "../chat/AttachPanel";
import { ChatInput } from "../chat/ChatInput";




























export function FooterBar({
  voiceRxMode,
  voiceRxRecording,
  voiceFirstTimeMode,
  pills,
  messages,
  isTyping,
  glanceInlinePillsActive,
  showAttachPanel,
  inputValue,
  isPrefilled,
  isDisabled,
  patientLabel,
  patientGender,
  patientAge,
  onPillTap,
  onAttachSelect,
  onAttachClose,
  onStartVoice,
  onInputChange,
  onSend,
  onAttach,
  onVoiceTranscription,
  onLockedChipClick
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 shrink-0 bg-white",
        voiceRxMode && voiceRxRecording ?
        "border-t-0 shadow-none" :
        "border-t border-tp-slate-300 shadow-[0_-4px_16px_rgba(15,23,42,0.04)]"
      )}>
      
      <div
        className="pointer-events-none absolute -top-[16px] left-0 right-0"
        style={{
          height: 16,
          background: "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0.55) 42%, transparent)"
        }} />
      
      {pills.length > 0 && messages.length > 0 && !isTyping && !glanceInlinePillsActive && !voiceFirstTimeMode && !voiceRxMode &&
      <div className="px-[4px] pt-[8px] pb-[6px]">
          <PillBar pills={pills} onTap={onPillTap} disabled={false} />
        </div>
      }
      {showAttachPanel && !voiceFirstTimeMode &&
      <AttachPanel onSelect={onAttachSelect} onClose={onAttachClose} />
      }
      {voiceFirstTimeMode && messages.length > 0 &&
      <div className="px-[14px] pb-[14px] pt-[10px]">
      {/* da-* styles live in app/globals.css */}
          <button
          type="button"
          onClick={onStartVoice}
          className="vrx-ai-cta group relative flex w-full items-center justify-center gap-[10px] h-[48px] overflow-hidden rounded-[12px] px-[18px] text-[14px] font-bold tracking-wide text-white transition-all hover:brightness-105 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #D565EA 0%, #673AAC 55%, #1A1994 100%)" }}>
          
            <span aria-hidden className="vrx-ai-cta-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]" />
            <VoiceRxIcon size={32} color="#FFFFFF" className="relative z-[1]" />
            <span className="relative z-[1]">Start with Voice</span>
          </button>
        </div>
      }
      {!voiceFirstTimeMode && (!voiceRxMode || !voiceRxRecording) &&
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        onAttach={onAttach}
        onVoiceTranscription={onVoiceTranscription}
        disabled={isDisabled}
        isPrefilled={isPrefilled}
        placeholder={voiceRxMode ? "Type Rx here, or use the voice Rx below to speak" : `Ask about ${patientLabel}...`}
        patientName={voiceRxMode ? undefined : patientLabel || undefined}
        patientMeta={voiceRxMode ? undefined : patientGender && patientAge ? `${patientGender}|${patientAge}y` : undefined}
        patientLocked
        patientLockedMessage={`You're inside ${patientLabel?.split(" ")[0] || "this patient"}'s prescription page — chat is focused on this patient`}
        onLockedChipClick={onLockedChipClick}
        isClinicContext={false}
        voiceRxCta={voiceRxMode}
        onVoiceRxCtaClick={onStartVoice}
        voiceRxFooterLayout={voiceRxMode} />

      }
    </div>);

}