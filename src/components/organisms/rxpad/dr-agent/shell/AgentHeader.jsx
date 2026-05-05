"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/src/hooks/utils";
import styles from "./AgentHeader.module.scss";

import {
  DropdownMenu as TPDropdownMenu,
  DropdownMenuContent as TPDropdownMenuContent,
  DropdownMenuItem as TPDropdownMenuItem,
  DropdownMenuTrigger as TPDropdownMenuTrigger } from
"@/src/components/molecules/DropdownMenu";
import { Clock, Setting2 } from "iconsax-reactjs";

// -----------------------------------------------------------------
// Specialty → Auto-switch patient mapping
// -----------------------------------------------------------------

const SPECIALTY_PATIENT_MAP = {
  gp: "__patient__", // Shyam GR
  gynec: "apt-lakshmi", // Lakshmi K
  ophthal: "apt-anjali", // Anjali Patel
  obstetric: "apt-priya", // Priya Rao
  pediatrics: "apt-arjun" // Arjun S
};

const SPECIALTY_OPTIONS = [
{ id: "gp", label: "GP" },
{ id: "gynec", label: "Gynec" },
{ id: "ophthal", label: "Ophthal" },
{ id: "obstetric", label: "Obstetric" },
{ id: "pediatrics", label: "Pediatrics" }];


// -----------------------------------------------------------------
// Doctor View Type options (controls summary depth per doctor context)
// -----------------------------------------------------------------

const DOCTOR_VIEW_OPTIONS = [
{ id: "specialist_first_visit", label: "Specialist", shortLabel: "Specialist" },
{ id: "treating_physician", label: "Treating Doctor", shortLabel: "Treating" },
{ id: "emergency_oncall", label: "Emergency", shortLabel: "Emergency" }];


// -----------------------------------------------------------------
// Intake Mode options
// -----------------------------------------------------------------



const INTAKE_OPTIONS = [
{ id: "with_intake", label: "With previous intake" },
{ id: "without_intake", label: "Without previous intake" }];


// -----------------------------------------------------------------
// AgentHeader — Clean, minimal header with unified dropdown
// -----------------------------------------------------------------



























export function AgentHeader({
  activeSpecialty,
  onSpecialtyChange,
  onPatientChange,
  onClose,
  className,
  doctorViewType,
  onDoctorViewChange,
  showDoctorViewSelector,
  intakeMode = "with_intake",
  onIntakeModeChange,
  variant = "full",
  brandTitle,
  onViewSessionHistory,
  onOpenSettings
}) {
  const isV0 = variant === "v0";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const activeSpecLabel = SPECIALTY_OPTIONS.find((o) => o.id === activeSpecialty)?.label ?? "GP";
  const activeDoctorLabel = DOCTOR_VIEW_OPTIONS.find((o) => o.id === doctorViewType)?.shortLabel;
  const activeIntakeLabel = intakeMode === "with_intake" ? "Intake" : "No intake";

  // Build compact badge text for the dropdown trigger
  const badgeParts = [activeSpecLabel];
  if (showDoctorViewSelector && activeDoctorLabel) {
    badgeParts.push(activeDoctorLabel);
  }

  function handleSpecialtySelect(id) {
    onSpecialtyChange(id);
    const patientId = SPECIALTY_PATIENT_MAP[id];
    if (patientId) {
      onPatientChange(patientId);
    }
  }

  return (
    <div className={cn("relative z-20", className)}>
      {/* Header — transparent, floating tags (no bar, no divider). */}
      <div
        className={cn("relative flex items-center justify-between px-[14px] pt-[4px]", styles.headerBar)}>
        
        {/* Left: Dr. Agent brand tag — floating liquid-glass card with 10px radius */}
        <div className="pointer-events-auto relative z-10 flex items-center gap-[6px]">
          {/* Right padding bumped to 12px (kebab removed; the title
              shouldn't feel flush against the pill's trailing edge). */}
          <span className="vrx-agent-brand-tag relative flex items-center gap-[8px] rounded-[10px] py-[6px] pl-[6px] pr-[12px]">
            <span
              className={cn("relative inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center overflow-hidden", styles.brandIconWrapper)}
              aria-hidden>
              
              {/* AI sparkle — bumped to 24×24 to match the Conversation /
                   Dictation mode-pill spark sizing. */}
              <Image
                src="/icons/dr-agent/agent-bg.svg"
                alt=""
                draggable={false}
                fill
                className="object-cover" />

              <Image
                src="/icons/dr-agent/agent-spark.svg"
                alt=""
                draggable={false}
                className="relative z-10"
                width={14}
                height={14} />
              
            </span>
            <span
              className={cn("text-[14px] font-semibold leading-none text-tp-slate-700", styles.brandTitle)}>
              
              {brandTitle ?? "VoiceRx"}
            </span>

            {/* Kebab removed per design call — VoiceRx brand pill no
                longer carries a "VoiceRx options" dropdown. Session
                history and Settings move to the consult-mode footer. */}
          </span>

          {/* Unified Dropdown — Specialty + Doctor Type + Intake (removed — demo only) */}
          {false && <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                "flex items-center gap-[4px] rounded-full px-[7px] py-[2px]",
                "text-[12px] leading-[1.3] text-white/60",
                "bg-white/10 backdrop-blur-sm transition-colors duration-150",
                "hover:bg-white/20 hover:text-white/90",
                dropdownOpen && "bg-white/20 text-white/90"
              )}>
              
              {/* Compact badge chips */}
              {badgeParts.map((part, i) =>
              <React.Fragment key={part}>
                  {i > 0 && <span className="text-white/30">·</span>}
                  <span>{part}</span>
                </React.Fragment>
              )}
              <svg
                width={8}
                height={8}
                viewBox="0 0 10 10"
                fill="none"
                className={cn(
                  "flex-shrink-0 transition-transform duration-150",
                  dropdownOpen && "rotate-180"
                )}>
                
                <path
                  d="M2.5 3.75L5 6.25L7.5 3.75"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round" />
                
              </svg>
            </button>

            {/* Dropdown panel — multi-section */}
            {dropdownOpen &&
            <div
              className={cn(
                "absolute left-0 top-full z-[120] mt-[4px]",
                "min-w-[180px] rounded-[10px] border border-tp-slate-100/80",
                "bg-white/95 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
              )}>
              
                {/* Demo notice */}
                <div className="border-b border-tp-slate-300 px-[10px] py-[4px]">
                  <p className="text-[10px] leading-[1.3] text-tp-slate-400 italic">
                    Demo only — not in production
                  </p>
                </div>

                {/* ── Section 1: Specialty ── */}
                <div className="px-[10px] pt-[6px] pb-[2px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">Specialty</p>
                  <div className="flex flex-wrap gap-[4px] pb-[6px]">
                    {SPECIALTY_OPTIONS.map((opt) => {
                    const isActive = opt.id === activeSpecialty;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSpecialtySelect(opt.id)}
                        className={cn(
                          "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                          isActive ?
                          "bg-tp-slate-700 text-white font-medium" :
                          "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-slate-100 hover:text-tp-slate-700"
                        )}>
                        
                          {opt.label}
                        </button>);

                  })}
                  </div>
                </div>

                {/* ── Section 2: Doctor Type (View As) ── */}
                {showDoctorViewSelector && doctorViewType && onDoctorViewChange &&
              <>
                    <div className="mx-[10px] border-t border-tp-slate-300" />
                    <div className="px-[10px] pt-[6px] pb-[2px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">View as</p>
                      <div className="flex flex-wrap gap-[4px] pb-[6px]">
                        {DOCTOR_VIEW_OPTIONS.map((opt) => {
                      const isActive = opt.id === doctorViewType;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onDoctorViewChange(opt.id)}
                          className={cn(
                            "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                            isActive ?
                            "bg-tp-violet-600 text-white font-medium" :
                            "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-violet-50 hover:text-tp-violet-700"
                          )}>
                          
                              {opt.label}
                            </button>);

                    })}
                      </div>
                    </div>
                  </>
              }

                {/* ── Section 3: Intake Mode ── */}
                {onIntakeModeChange &&
              <>
                    <div className="mx-[10px] border-t border-tp-slate-300" />
                    <div className="px-[10px] pt-[6px] pb-[6px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">Intake</p>
                      <div className="flex gap-[4px]">
                        {INTAKE_OPTIONS.map((opt) => {
                      const isActive = opt.id === intakeMode;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onIntakeModeChange(opt.id)}
                          className={cn(
                            "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                            isActive ?
                            "bg-tp-blue-600 text-white font-medium" :
                            "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-blue-50 hover:text-tp-blue-700"
                          )}>
                          
                              {opt.label}
                            </button>);

                    })}
                      </div>
                    </div>
                  </>
              }
              </div>
            }
          </div>}
        </div>

        {/* Right: Actions — three-dots menu now lives inside the brand pill;
             this section keeps only the Collapse button. */}
        <div className="flex items-center gap-2">
          {/* Collapse Button — wrapped in the same liquid-glass chip
               (.vrx-agent-collapse-tag) used by the brand pill so the
               two affordances on this row read as a matched pair. 18px
               icon, slate-700, glossy backdrop. */}
          <button
            type="button"
            onClick={onClose}
            className="vrx-agent-collapse-tag pointer-events-auto inline-flex h-[32px] w-[32px] items-center justify-center rounded-[10px] text-tp-slate-700 transition-colors hover:text-tp-slate-900 active:scale-[0.95]"
            aria-label="Minimize agent">
            
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      {/* da-* styles live in app/globals.css */}
    </div>);

}