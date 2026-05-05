"use client";

import { cn } from "@/src/hooks/utils";
import styles from "./VoiceEmptyState.module.scss";
import Lottie from "lottie-react";
import chevronDownLottie from "@/public/lottie/chevron-down.json";
import { VoiceRxIcon } from "@/src/components/organisms/voicerx/voice-consult-icons";







export function VoiceEmptyState({ onStartVoice, onViewPatientDetails, hasSymptomCollectorData }) {
  return (
    <div className="flex flex-1 flex-col items-center px-[20px] pt-[24px] pb-[20px] relative">
      {/* ── Center zone ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center w-full">
        <div className="relative z-[1] mb-[14px]">
          <span
            className={cn("pointer-events-none select-none relative inline-flex items-center justify-center overflow-hidden", styles.sparkWrapper)}
            aria-hidden>
            
            <div className={cn("absolute inset-0 bg-white", styles.sparkBase)} />
            <div className={cn("absolute inset-0", styles.sparkGif)} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/dr-agent/agent-spark.svg"
              width={40}
              height={40}
              alt=""
              className="relative z-10 vrx-empty-spark-rotate"
              draggable={false} />
            
          </span>
        </div>

        <h2 className="relative z-[1] text-[20px] font-semibold text-tp-slate-700 text-center leading-[26px]">
          {(() => {const h = new Date().getHours();return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";})()}, Doctor!
        </h2>
        <p
          className={cn("relative z-[1] mt-[4px] text-[16px] text-center leading-[24px]", styles.subtitle)}>
          
          Start consultation by{" "}
          <span className="font-medium text-tp-slate-500">dictating</span>{" "}
          or having a{" "}
          <span className="font-medium text-tp-slate-500">natural conversation</span>{" "}
          with the patient.
        </p>

        <div className="relative z-[1] mt-[20px] w-full px-[14px]">
      {/* da-* styles live in app/globals.css */}
          <button
            type="button"
            onClick={onStartVoice}
            className={cn("vrx-ai-cta group relative flex w-full items-center justify-center gap-[10px] h-[48px] overflow-hidden rounded-[12px] px-[14px] text-[14px] font-bold tracking-wide text-white transition-all hover:brightness-105 active:scale-[0.98]", styles.voiceCta)}>
            
            <span aria-hidden className="vrx-ai-cta-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]" />
            <VoiceRxIcon size={32} color="#FFFFFF" className="relative z-[1]" />
            <span className="relative z-[1]">Start with Voice</span>
          </button>
        </div>
      </div>

      {/* ── Bottom zone: glassy "View patient shared details" pill ─ */}
      {hasSymptomCollectorData &&
      <div className="relative z-[1] flex flex-col items-center gap-[10px] w-full">
          <div className="group/chip relative">
            <div
            aria-hidden
            className="pointer-events-none absolute bottom-full left-1/2 z-[50] mb-[10px] -translate-x-1/2 translate-y-[6px] opacity-0 transition-all duration-200 ease-out group-hover/chip:translate-y-0 group-hover/chip:opacity-100">
            
              <div
              className={cn("relative rounded-[10px] px-[14px] py-[10px]", styles.tooltipBox)}>
              
                <p className="text-[12px] font-semibold leading-[16px] text-white">
                  Patient-reported pre-visit details
                </p>
                <p className={cn("mt-[4px] text-[11px] leading-[16px]", styles.tooltipSubtext)}>
                  Submitted via the symptom collector before the visit
                </p>
                <span
                className={cn("absolute left-1/2 top-full -translate-x-1/2", styles.tooltipArrow)} />
              
              </div>
            </div>
            <button
            type="button"
            onClick={onViewPatientDetails}
            className={cn("vrx-patient-chip group relative flex items-center gap-[6px] overflow-hidden", styles.patientChip)}>
            
              <span aria-hidden className="vrx-patient-chip-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]" />
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" className="relative z-[1] flex-shrink-0" aria-hidden xmlns="http://www.w3.org/2000/svg">
                <path opacity="0.4" d="M21 18V8C21 5.79086 19.2091 4 17 4H8H7C4.79086 4 3 5.79086 3 8V18C3 20.2091 4.79086 22 7 22H17C19.2091 22 21 20.2091 21 18Z" fill="url(#chipIconGrad)" />
                <path d="M8 4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4C16 5.10457 15.1046 6 14 6H10C8.89543 6 8 5.10457 8 4Z" fill="url(#chipIconGrad)" />
                <path fillRule="evenodd" clipRule="evenodd" d="M11.1201 10.2597C11.3581 10.2983 11.563 10.449 11.6708 10.6646L13.2055 13.7339L14.4697 12.4697C14.6103 12.329 14.8011 12.25 15 12.25H17C17.4142 12.25 17.75 12.5858 17.75 13C17.75 13.4142 17.4142 13.75 17 13.75H15.3107L13.5303 15.5303C13.3599 15.7008 13.1178 15.7789 12.8799 15.7403C12.6419 15.7017 12.437 15.5511 12.3292 15.3354L10.7945 12.2661L9.53033 13.5303C9.38968 13.671 9.19891 13.75 9 13.75H7C6.58579 13.75 6.25 13.4142 6.25 13C6.25 12.5858 6.58579 12.25 7 12.25H8.68934L10.4697 10.4697C10.6401 10.2992 10.8822 10.2211 11.1201 10.2597Z" fill="url(#chipIconGrad)" />
                <defs>
                  <linearGradient id="chipIconGrad" x1="4" y1="6" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#D565EA" />
                    <stop offset="1" stopColor="#3A38B8" />
                  </linearGradient>
                </defs>
              </svg>
              <span
              className={cn("relative z-[1] text-[12px] font-semibold leading-none", styles.patientChipText)}>
              
                View patient shared details
              </span>
              <svg width="0" height="0" className="absolute" aria-hidden>
                <linearGradient id="vrx-chip-arrow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop stopColor="#C850E8" offset="0%" />
                  <stop stopColor="#673AAC" offset="55%" />
                  <stop stopColor="#3A38B8" offset="100%" />
                </linearGradient>
              </svg>
              <div className="vrx-lottie-gradient relative z-[1] shrink-0 w-4 h-4 flex items-center justify-center pointer-events-none" aria-hidden>
      {/* da-* styles live in app/globals.css */}
                <Lottie
                animationData={chevronDownLottie}
                loop={true}
                style={{ width: "100%", height: "100%", transform: "scale(1.2)" }} />
              
              </div>
            </button>
          </div>

          <p
          className={cn("flex items-center gap-[4px] text-[12px] leading-[16px] font-normal", styles.privacyNote)}>
          
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden className="flex-shrink-0">
              <path d="M6 1.5L9.5 3V6C9.5 7.93 7.97 9.73 6 10.5C4.03 9.73 2.5 7.93 2.5 6V3L6 1.5Z" stroke="#A2A2A8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.5 6L5.5 7L7.5 5" stroke="#A2A2A8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Data stays private · shared only with you
          </p>
        </div>
      }
      {/* da-* styles live in app/globals.css */}
    </div>);

}