"use client"

import React, { useId, useState } from "react"
import { cn } from "@/lib/utils"
import { type VoiceConsultKind } from "@/components/voicerx/voice-consult-types"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Bottom-sheet row titles (distinct from longer `VOICE_CONSULT_LABELS` elsewhere). */
const VOICE_RX_SHEET_MODE_LABELS: Record<VoiceConsultKind, string> = {
  ambient_consultation: "Conversation Mode",
  dictation_consultation: "Dictation Mode",
}
import { VoiceConsultKindIcon, VoiceRxIcon } from "@/components/voicerx/voice-consult-icons"

/** Rounded-square close icon (reverted to earlier filled style, slightly darker). */
function HeaderCloseIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill={color} />
    </svg>
  )
}

interface VoiceRxBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  consultOptions: { value: VoiceConsultKind; description: string }[]
  selectedOption: VoiceConsultKind
  onSelectOption: (val: VoiceConsultKind) => void
  onConfirm: () => void
}

export function VoiceRxBottomSheet({
  isOpen,
  onClose,
  consultOptions,
  selectedOption,
  onSelectOption,
  onConfirm,
}: VoiceRxBottomSheetProps) {
  // Default-enabled per spec — doctor can uncheck if needed.
  const [consentGiven, setConsentGiven] = useState(true)
  const uid = useId()

  if (!isOpen) return null

  const canStart = consentGiven

  const startConsultationLabel =
    selectedOption === "ambient_consultation" ? "Start conversation" : "Start dictation"

  return (
    <div className="absolute inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{ background: "rgba(15,23,42,0.65)", animation: "docFadeIn 200ms ease-out" }}
      />

      {/* Bottom Sheet */}
      <div
        className="relative z-10 flex h-auto flex-col overflow-hidden rounded-t-[20px] bg-white pb-6 shadow-2xl"
        style={{ animation: "docSlideUp 450ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-[8px] pb-[4px]">
          <span className="h-[4px] w-[40px] rounded-full bg-tp-slate-200" aria-hidden />
        </div>

        {/* Header — with bottom divider stroke */}
        <div className="flex items-start justify-between border-b border-tp-slate-100 px-[16px] pb-[12px] pt-[8px]">
          <div className="min-w-0">
            <h3 className="inline-flex items-center gap-1.5 text-[16px] font-semibold leading-tight text-tp-slate-900">
              Consultation mode
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full align-middle text-tp-slate-400 hover:text-tp-slate-600"
                    aria-label="Consultation mode information"
                  >
                    <Info size={13} strokeWidth={2.2} />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="max-w-[300px] rounded-[8px] border-0 bg-tp-slate-900 px-[12px] py-[10px] text-[12px] leading-[1.5] text-white shadow-[0_12px_28px_-12px_rgba(15,23,42,0.55)]"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55">
                    Consultation modes
                  </div>
                  <div className="mt-[8px] flex flex-col gap-[6px]">
                    <div>
                      <span className="font-semibold text-white">Conversation:</span>{" "}
                      <span className="text-white/80">captures the live doctor-patient discussion in real time.</span>
                    </div>
                    <div>
                      <span className="font-semibold text-white">Dictation:</span>{" "}
                      <span className="text-white/80">captures only your narrated clinical notes.</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-[2px] flex items-center justify-center text-tp-slate-700 transition-colors hover:text-tp-slate-900 active:scale-[0.95]"
          >
            <HeaderCloseIcon size={26} color="currentColor" />
          </button>
        </div>

        {/* Two independent option cards — no shared container, no divider, no outer shadow.
            The selected card alone carries a blue gradient wash to signal state. */}
        <div className="flex flex-col gap-[10px] px-[16px] pt-[12px]">
          {consultOptions.map((opt) => {
            const isSelected = selectedOption === opt.value
            const showConsent = opt.value === "ambient_consultation" && isSelected
            return (
              <React.Fragment key={opt.value}>
                <div
                  className={cn(
                    "vrx-option-card overflow-hidden rounded-[14px] transition-[background] duration-200",
                    isSelected ? "vrx-option-card--selected" : "vrx-option-card--idle",
                  )}
                >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectOption(opt.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onSelectOption(opt.value)
                        }
                      }}
                      aria-pressed={isSelected}
                      className="flex w-full cursor-pointer items-center gap-0 px-[12px] py-0 text-left"
                    >
                      {/* Premium radial AI tile with larger inner icon */}
                      <span className={cn("vrx-option-tile", isSelected && "vrx-option-tile--selected")} aria-hidden>
                        <VoiceConsultKindIcon
                          kind={opt.value}
                          size={28}
                          gradientId={`${uid}-${opt.value}-grad`}
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-[14px] leading-tight transition-colors",
                            isSelected ? "font-semibold text-tp-blue-600" : "font-medium text-tp-slate-700",
                          )}
                        >
                          {VOICE_RX_SHEET_MODE_LABELS[opt.value]}
                        </span>
                      </span>

                      {/* TP blue radio */}
                      <span
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
                          isSelected ? "border-tp-blue-500" : "border-tp-slate-300",
                        )}
                        aria-hidden
                      >
                        {isSelected && <span className="h-[8px] w-[8px] rounded-full bg-tp-blue-500" />}
                      </span>
                    </div>

                    {/* Patient consent — informative blue tint, no stroke/shadow. */}
                    {showConsent && (
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="vrx-consent-pill mx-[12px] mb-[12px] mt-[6px] flex cursor-pointer items-center gap-[8px] rounded-[10px] px-[10px] py-[8px] text-left"
                        style={{ animation: "docFadeIn 180ms ease-out" }}
                      >
                        <span className="relative flex h-[16px] w-[16px] shrink-0 items-center justify-center">
                          <input
                            type="checkbox"
                            checked={consentGiven}
                            onChange={(e) => setConsentGiven(e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                            aria-label="Patient consent"
                          />
                          <span
                            className={cn(
                              "pointer-events-none flex h-[16px] w-[16px] items-center justify-center rounded-[4px] border-[1.5px] transition-colors",
                              consentGiven ? "border-tp-blue-500 bg-tp-blue-500" : "border-tp-blue-300 bg-white",
                            )}
                          >
                            {consentGiven && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M20 6L9 17L4 12" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1 text-[12px] leading-[1.4] text-tp-blue-700">
                          Patient consents to this session being recorded.
                        </span>
                      </label>
                    )}
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {/* Start Consultation — TP AI gradient (shared brand token) with a
            subtle sheen sweep so the CTA reads as an AI-initiated action. */}
        <div className="px-[16px] pb-[16px] pt-[12px]">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canStart}
            aria-label={startConsultationLabel}
            // No `border` class — Tailwind's default 1px adds a hairline
            // dark stroke that's visible on the gradient. Match the
            // DrAgentPanel "Start Consultation" CTA, which has none.
            className={cn(
              "vrx-ai-cta relative flex w-full items-center justify-center gap-[10px] overflow-hidden rounded-[12px] px-[18px] transition-all",
              canStart
                ? "text-white hover:brightness-105 active:scale-[0.98]"
                : "bg-tp-slate-100 text-tp-slate-400 cursor-not-allowed",
            )}
            style={{
              height: 48,
              background: canStart
                ? "linear-gradient(135deg, #D565EA 0%, #673AAC 50%, #1A1994 100%)"
                : undefined,
              boxShadow: canStart
                ? "0 8px 22px -10px rgba(103, 58, 172, 0.55), 0 2px 6px -3px rgba(26, 25, 148, 0.35), inset 0 1px 0 rgba(255,255,255,0.32)"
                : undefined,
            }}
          >
            {canStart ? (
              <span
                aria-hidden
                className="vrx-ai-cta-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]"
              />
            ) : null}
            <VoiceRxIcon size={24} color={canStart ? "#FFFFFF" : "#94A3B8"} className="relative z-[1] shrink-0" />
            <span className="relative z-[1] text-[14px] font-semibold tracking-[0.2px]">{startConsultationLabel}</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes docFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes docSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        /* AI CTA sheen — slow sweeping highlight to mark the button as an
           AI-initiated action (matches the AI brand language used by other
           Dr.Agent affordances). */
        @keyframes vrxAiCtaSheen {
          0%   { transform: translateX(-120%); opacity: 0; }
          18%  { opacity: 0.55; }
          55%  { opacity: 0.55; }
          100% { transform: translateX(320%); opacity: 0; }
        }
        .vrx-ai-cta-sheen {
          background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%);
          animation: vrxAiCtaSheen 3.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .vrx-ai-cta-sheen { animation: none; opacity: 0; }
        }

        /* Two independent option cards.
           Idle → transparent (just gap); selected → blueish gradient wash with its
           own rounded radius. No divider, no outer shadow, no stroke. */
        .vrx-option-card--idle {
          background: transparent;
        }
        .vrx-option-card--idle:hover {
          background: rgba(248, 250, 252, 0.65);
        }
        /* Subtle, aesthetic selected state — very light indigo wash + a hairline
           TP-blue keyline for an iOS-style premium feel. The real selection cue is
           the blue title text + filled radio; the bg just provides a gentle "lift". */
        .vrx-option-card--selected,
        .vrx-option-card--selected:hover {
          background: linear-gradient(180deg, #FBFCFF 0%, #F3F5FF 100%);
          padding-top: 6px;
          padding-bottom: 6px;
          box-shadow:
            inset 0 0 0 1px rgba(75,74,213,0.14),
            0 1px 2px rgba(75,74,213,0.04);
        }

        /* Consent pill — gentle blue tint that reads on the near-white card
           without being a heavy solid block. */
        .vrx-consent-pill {
          background: rgba(75, 74, 213, 0.06);
          box-shadow: none;
        }

        /* Premium radial AI tile — white base + warm AI wash + inset halo that
           adapts to the row bg so the edge feathers cleanly. */
        .vrx-option-tile {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 303.03px;
          background: #FFF;
          isolation: isolate;
          --vrx-tile-halo: #FFFFFF;
        }
        .vrx-option-tile::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at 50% 50%,
            rgba(213,101,234,0.26) 0%,
            rgba(180,110,220,0.20) 28%,
            rgba(167,139,250,0.14) 52%,
            rgba(167,139,250,0) 88%);
          z-index: 0;
        }
        .vrx-option-tile::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          box-shadow: 0 0 7.5px 6.75px var(--vrx-tile-halo) inset;
          z-index: 1;
        }
        .vrx-option-tile > svg {
          position: relative;
          z-index: 2;
        }
        /* Selected → halo matches the subtle card mid-tone (#F7F8FF) so the tile
           edge feathers seamlessly into the near-white selected card. */
        .vrx-option-tile--selected {
          background: #F7F8FF;
          --vrx-tile-halo: #F7F8FF;
        }
      `}</style>
    </div>
  )
}
