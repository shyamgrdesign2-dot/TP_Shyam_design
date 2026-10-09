import React, { useState, useRef, useEffect } from "react"
import { cn } from "../../dr-agent/utils"
import { Tooltip } from "@dhspl-tatvacare/tesseract-ui"
import { CopilotIcon } from "../ui/CopilotIcon"

// -----------------------------------------------------------------
// Specialty → Auto-switch patient mapping
// -----------------------------------------------------------------

const SPECIALTY_PATIENT_MAP = {
  gp: "__patient__",         // Shyam GR
  gynec: "apt-lakshmi",      // Lakshmi K
  ophthal: "apt-anjali",     // Anjali Patel
  obstetric: "apt-priya",    // Priya Rao
  pediatrics: "apt-arjun",   // Arjun S
}

const SPECIALTY_OPTIONS = [
  { id: "gp", label: "GP" },
  { id: "gynec", label: "Gynec" },
  { id: "ophthal", label: "Ophthal" },
  { id: "obstetric", label: "Obstetric" },
  { id: "pediatrics", label: "Pediatrics" },
]

// -----------------------------------------------------------------
// Doctor View Type options (controls summary depth per doctor context)
// -----------------------------------------------------------------

const DOCTOR_VIEW_OPTIONS = [
  { id: "specialist_first_visit", label: "Specialist", shortLabel: "Specialist" },
  { id: "treating_physician", label: "Treating Doctor", shortLabel: "Treating" },
  { id: "emergency_oncall", label: "Emergency", shortLabel: "Emergency" },
]

// -----------------------------------------------------------------
// Intake Mode options
// -----------------------------------------------------------------

 

const INTAKE_OPTIONS = [
  { id: "with_intake", label: "With previous intake" },
  { id: "without_intake", label: "Without previous intake" },
]

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
  /* Sits beside the brand tag, in the same floating row: the scope tag, which
     belongs next to the product's name rather than in a band of its own. */
  trailing = null,
  /* Where the doctor came from, when there is somewhere to go back to: the
     brand tag's spark becomes a back arrow and the tag goes back on press. */
  onBack = null,
  backLabel = "",
}) {
  const isV0 = variant === "v0"
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target )) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [dropdownOpen])

  const activeSpecLabel = _nullishCoalesce(_optionalChain([SPECIALTY_OPTIONS, 'access', _ => _.find, 'call', _2 => _2((o) => o.id === activeSpecialty), 'optionalAccess', _3 => _3.label]), () => ( "GP"))
  const activeDoctorLabel = _optionalChain([DOCTOR_VIEW_OPTIONS, 'access', _4 => _4.find, 'call', _5 => _5((o) => o.id === doctorViewType), 'optionalAccess', _6 => _6.shortLabel])
  const activeIntakeLabel = intakeMode === "with_intake" ? "Intake" : "No intake"

  // Build compact badge text for the dropdown trigger
  const badgeParts = [activeSpecLabel]
  if (showDoctorViewSelector && activeDoctorLabel) {
    badgeParts.push(activeDoctorLabel)
  }

  function handleSpecialtySelect(id) {
    onSpecialtyChange(id)
    const patientId = SPECIALTY_PATIENT_MAP[id]
    if (patientId) {
      onPatientChange(patientId)
    }
  }

  return (
    <div className={cn("relative z-20", className)}>
      {/* Header — transparent, floating liquid-glass tags (no bar, no divider). */}
      <div
        className="relative flex items-center justify-between px-[14px]"
        style={{ height: 52, background: "transparent" }}
      >
        {/* Left: Dr. Agent brand tag — floating liquid-glass card with 10px radius */}
        <div className="pointer-events-auto relative z-10 flex items-center gap-[6px]">
          {onBack ? (
            <Tooltip
              className="copilot-tooltip"
              side="bottom"
              content={
                <span style={{ display: "block", maxWidth: 240 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>Back to {backLabel}</span>
                  <span style={{ display: "block", opacity: 0.85, marginTop: 2 }}>That conversation is kept as you left it.</span>
                </span>
              }
            >
              <button
                type="button"
                onClick={onBack}
                aria-label={`Back to ${backLabel}`}
                className="copilot-glass-tag group/back relative flex items-center gap-[7px] rounded-[10px] py-[5px] pl-[6px] pr-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
              >
                <span className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-tp-slate-100 text-tp-slate-700 transition-colors group-hover/back:bg-tp-slate-200">
                  <CopilotIcon name="chevron-left" variant="linear" size={14} />
                </span>
                <span
                  className="text-[13.5px] font-semibold leading-none text-tp-slate-700"
                  style={{ letterSpacing: "0.1px" }}
                >
                  {_nullishCoalesce(brandTitle, () => ( "Velora"))}
                </span>
              </button>
            </Tooltip>
          ) : (
          <span className="copilot-glass-tag relative flex items-center gap-[7px] rounded-[10px] py-[5px] pl-[6px] pr-[11px]">
            <span
              className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden"
              aria-hidden
              style={{ borderRadius: 7 }}
            >
              {/* Dr. Agent sparkle — same asset used in chat bubble for consistency */}
              <img
                src="/icons/dr-agent/agent-bg.svg"
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <img
                src="/icons/dr-agent/agent-spark.svg"
                alt=""
                draggable={false}
                className="relative z-10"
                width={13}
                height={13}
              />
            </span>
            <span
              className="text-[13.5px] font-semibold leading-none text-tp-slate-700"
              style={{ letterSpacing: "0.1px" }}
            >
              {_nullishCoalesce(brandTitle, () => ( "Velora"))}
            </span>
          </span>
          )}

          {trailing}

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
                dropdownOpen && "bg-white/20 text-white/90",
              )}
            >
              {/* Compact badge chips */}
              {badgeParts.map((part, i) => (
                <React.Fragment key={part}>
                  {i > 0 && <span className="text-white/30">·</span>}
                  <span>{part}</span>
                </React.Fragment>
              ))}
              <svg
                width={8}
                height={8}
                viewBox="0 0 10 10"
                fill="none"
                className={cn(
                  "flex-shrink-0 transition-transform duration-150",
                  dropdownOpen && "rotate-180",
                )}
              >
                <path
                  d="M2.5 3.75L5 6.25L7.5 3.75"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown panel — multi-section */}
            {dropdownOpen && (
              <div
                className={cn(
                  "absolute left-0 top-full z-[120] mt-[4px]",
                  "min-w-[180px] rounded-[10px] border-[1px] border-tp-slate-100/80",
                  "bg-white/95 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.08)]",
                )}
              >
                {/* Demo notice */}
                <div className="border-b border-tp-slate-100 px-[10px] py-[4px]">
                  <p className="text-[10px] leading-[1.3] text-tp-slate-400 italic">
                    Demo only — not in production
                  </p>
                </div>

                {/* ── Section 1: Specialty ── */}
                <div className="px-[10px] pt-[6px] pb-[2px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">Specialty</p>
                  <div className="flex flex-wrap gap-[4px] pb-[6px]">
                    {SPECIALTY_OPTIONS.map((opt) => {
                      const isActive = opt.id === activeSpecialty
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSpecialtySelect(opt.id)}
                          className={cn(
                            "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                            isActive
                              ? "bg-tp-slate-700 text-white font-medium"
                              : "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-slate-100 hover:text-tp-slate-700",
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ── Section 2: Doctor Type (View As) ── */}
                {showDoctorViewSelector && doctorViewType && onDoctorViewChange && (
                  <>
                    <div className="mx-[10px] border-t border-tp-slate-100" />
                    <div className="px-[10px] pt-[6px] pb-[2px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">View as</p>
                      <div className="flex flex-wrap gap-[4px] pb-[6px]">
                        {DOCTOR_VIEW_OPTIONS.map((opt) => {
                          const isActive = opt.id === doctorViewType
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onDoctorViewChange(opt.id)}
                              className={cn(
                                "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                                isActive
                                  ? "bg-tp-violet-600 text-white font-medium"
                                  : "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-violet-50 hover:text-tp-violet-700",
                              )}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Section 3: Intake Mode ── */}
                {onIntakeModeChange && (
                  <>
                    <div className="mx-[10px] border-t border-tp-slate-100" />
                    <div className="px-[10px] pt-[6px] pb-[6px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">Intake</p>
                      <div className="flex gap-[4px]">
                        {INTAKE_OPTIONS.map((opt) => {
                          const isActive = opt.id === intakeMode
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onIntakeModeChange(opt.id)}
                              className={cn(
                                "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                                isActive
                                  ? "bg-tp-blue-600 text-white font-medium"
                                  : "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-blue-50 hover:text-tp-blue-700",
                              )}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>}
        </div>

        {/* Right: collapse — matching floating glass tag (10px radius) */}
        <button
          type="button"
          onClick={onClose}
          className="da-agent-collapse-tag pointer-events-auto relative z-10 flex h-[32px] w-[32px] items-center justify-center rounded-[10px] text-tp-slate-600 transition-colors hover:text-tp-slate-900 active:scale-[0.95]"
          aria-label="Minimize agent"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="3.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M9 3v18" stroke="currentColor" strokeWidth="1.7" />
            <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <style>{`
        /* Dr. Agent brand tag — iOS liquid-glass with subtle AI gradient tint.
           Low bg opacity + strong blur + saturate so content scrolling behind
           is visibly diffused through the glass. */
        .da-agent-brand-tag {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 100%),
            linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.10) 55%, rgba(75,74,213,0.10) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.80),
            inset 0 0 0 1px rgba(103,58,172,0.12),
            0 4px 12px -4px rgba(103,58,172,0.12);
        }
        /* Collapse tag — same glass weight, subtle neutral AI hint */
        .da-agent-collapse-tag {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.22) 100%),
            linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(75,74,213,0.08) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.85),
            inset 0 0 0 1px rgba(15,23,42,0.08),
            0 4px 12px -4px rgba(15,23,42,0.08);
          transition: background 180ms ease, box-shadow 180ms ease, color 180ms ease, transform 120ms ease;
        }
        .da-agent-collapse-tag:hover {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.38) 100%),
            linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(75,74,213,0.10) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,1),
            inset 0 0 0 1px rgba(15,23,42,0.12),
            0 6px 16px -4px rgba(15,23,42,0.12);
        }
      `}</style>
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
