import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { cn } from "../dr-agent/utils"
import { useRxPadSync } from "./compat/rxpad-sync-context"

import { CONTEXT_PATIENT_ID, QUICK_CLINICAL_SNAPSHOT_PROMPT, RX_CONTEXT_OPTIONS } from "./constants"
import { buildQuickClinicalSnapshotInlineSuggestions, buildQuickClinicalSnapshotText } from "./shared/buildCoreNarrative"
import { isSituationAtGlanceAssistantMessage } from "./shared/isSituationAtGlanceMessage"
import { SMART_SUMMARY_BY_CONTEXT } from "./mock-data"

import { inferPhase } from "./engines/phase-engine"
import { classifyIntent, PILL_INTENT_MAP } from "./engines/intent-engine"
import { buildReply } from "./engines/reply-engine"

import { tesseractIcon } from "./ui/tesseractIcon"
import { AgentHeader } from "./shell/AgentHeader"
import { ChatThread } from "./chat/ChatThread"
import { PillBar } from "./chat/PillBar"
import { SuggestionBar } from "./chat/SuggestionBar"

import { PatientSelector } from "./shell/PatientSelector"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const SearchNormal1 = tesseractIcon("search-normal")
const DocumentText = tesseractIcon("document-text")
const ClipboardText = tesseractIcon("clipboard-text")
const Health = tesseractIcon("health")
const Calendar2 = tesseractIcon("calendar2")
const Activity = tesseractIcon("activity")
const Clock = tesseractIcon("clock")
const SecuritySafe = tesseractIcon("security-safe")

// ═══════════════ HELPERS ═══════════════

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function getQueryHint(category, query) {
  const q = query.toLowerCase()
  if (q.includes("interaction") || q.includes("drug")) return "Checking drug interactions"
  if (q.includes("lab") || q.includes("vital") || q.includes("trend")) return "Fetching lab results"
  if (q.includes("summary") || q.includes("snapshot") || q.includes("patient")) return "Looking up patient records"
  if (q.includes("intake") || q.includes("pre-visit")) return "Loading intake data"
  if (q.includes("ddx") || q.includes("diagnos")) return "Reviewing clinical guidelines"
  if (q.includes("investigation") || q.includes("test")) return "Reviewing investigation protocols"
  switch (category) {
    case "data_retrieval": return "Looking up patient records"
    case "clinical_decision": return "Reviewing clinical guidelines"
    case "clinical_question": return "Reviewing clinical data"
    case "comparison": return "Comparing clinical data"
    default: return "Reviewing clinical data"
  }
}

function detectSpecialties(summary) {
  const tabs = ["gp"]
  if (summary.obstetricData) tabs.push("obstetric")
  if (summary.pediatricsData) tabs.push("pediatrics")
  if (summary.gynecData) tabs.push("gynec")
  if (summary.ophthalData) tabs.push("ophthal")
  return tabs
}

/** Inline bulk user SVG matching ChatInput PatientChip — tp-slate-600 neutral */
function UserBulkIcon({ size = 12, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path opacity="0.4" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" fill="currentColor" />
      <path d="M12 14.5c-5.01 0-9.09 3.36-9.09 7.5 0 .28.22.5.5.5h17.18c.28 0 .5-.22.5-.5 0-4.14-4.08-7.5-9.09-7.5Z" fill="currentColor" />
    </svg>
  )
}

// ═══════════════ V0 ALLOWED CARD KINDS ═══════════════

const V0_ALLOWED_KINDS = new Set([
  "sbar_overview", "patient_summary", "symptom_collector", "last_visit",
  "obstetric_summary", "gynec_summary", "pediatric_summary", "ophthal_summary",
  "vitals_summary", "medical_history", "text_quote",
])

// ═══════════════ V0 PILL-TO-CARD MAP ═══════════════

const PILL_TO_CARD_KINDS = {
  "Reported by patient": ["symptom_collector"],
  "Show reported intake": ["symptom_collector"],
  "Patient reported details": ["symptom_collector"],
  "Patient summary": ["sbar_overview", "patient_summary"],
  "Patient's detailed summary": ["patient_summary", "sbar_overview"],
  "Medical history": ["medical_history"],
  "Medical history summary": ["medical_history"],
  "Chronic conditions": ["medical_history"],
  "Allergies": ["medical_history"],
  "Family history": ["medical_history"],
  "Lifestyle": ["medical_history"],
  "Last visit": ["last_visit"],
  "Last visit details": ["last_visit"],
  "Past visit details": ["last_visit"],
  "Past visit summaries": ["last_visit"],
  "Vital trends": ["vitals_trend_bar"],
  "Today's vitals": ["vitals_summary"],
  "Obstetric summary": ["obstetric_summary"],
  "Obstetric history": ["obstetric_summary"],
  "Gynec summary": ["gynec_summary"],
  "Gynec history": ["gynec_summary"],
  "Growth & vaccines": ["pediatric_summary"],
  "Vaccination & growth": ["pediatric_summary"],
  "Vaccination & growth history": ["pediatric_summary"],
  "Vision summary": ["ophthal_summary"],
  "Vision history": ["ophthal_summary"],
}

// ═══════════════ V0 CANNED ACTIONS — Smart Priority System ═══════════════
//
// 5 candidate cards, pick best 4 based on available data:
//
//   1. INTAKE    — "Reported by patient"         (only if symptom collector data exists)
//   2. SUMMARY   — "Patient summary"            (always available)
//   3. HISTORY   — "Medical history"            (past visits, prescriptions)
//   4. SPECIALTY — Specialty-specific history    (obstetric / gynec / pediatric / ophthal)
//   5. VITALS    — "Today's vitals"              (fallback when a slot is empty)
//
// Priority rules:
//   WITH intake + WITH specialty → intake, summary, history, specialty
//   WITH intake + NO specialty  → intake, summary, history, vitals
//   NO intake + WITH specialty  → summary, history, specialty, vitals
//   NO intake + NO specialty    → summary, history, vitals, past visit details
//
// ═══════════════════════════════════════════════════════════════════════════

const ICON_SIZE = 18

const ACTION_INTAKE = {
  icon: <ClipboardText size={ICON_SIZE} variant="Bulk" />,
  title: "Reported by patient",
  subtitle: "Symptoms & history shared before the visit",
  message: "Show reported intake",
}

const ACTION_SUMMARY = {
  icon: <DocumentText size={ICON_SIZE} variant="Bulk" />,
  title: "Patient summary",
  subtitle: "Clinical overview with vitals, labs, and history",
  message: "Patient summary",
}

const ACTION_HISTORY = {
  icon: <Clock size={ICON_SIZE} variant="Bulk" />,
  title: "Medical history",
  subtitle: "Past visits, prescriptions, and treatment history",
  message: "Medical history",
}

const ACTION_VITALS = {
  icon: <Activity size={ICON_SIZE} variant="Bulk" />,
  title: "Today's vitals",
  subtitle: "View today's recorded vital parameters at a glance",
  message: "Today's vitals",
}

const ACTION_PAST_VISITS = {
  icon: <Calendar2 size={ICON_SIZE} variant="Bulk" />,
  title: "Past visit summaries",
  subtitle: "Browse any past visit — prescriptions, diagnosis, and notes",
  message: "Past visit summaries",
}

function getSpecialtyAction(summary) {
  if (summary.obstetricData) {
    return {
      icon: <Health size={ICON_SIZE} variant="Bulk" />,
      title: "Obstetric history",
      subtitle: "ANC schedule, pregnancy parameters, and alerts",
      message: "Obstetric summary",
    }
  }
  if (summary.gynecData) {
    return {
      icon: <Health size={ICON_SIZE} variant="Bulk" />,
      title: "Gynec history",
      subtitle: "Menstrual cycle, screening, and gynec parameters",
      message: "Gynec summary",
    }
  }
  if (summary.pediatricsData) {
    return {
      icon: <Health size={ICON_SIZE} variant="Bulk" />,
      title: "Vaccination & growth",
      subtitle: "Growth chart, milestones, and vaccination schedule",
      message: "Growth & vaccines",
    }
  }
  if (summary.ophthalData) {
    return {
      icon: <Health size={ICON_SIZE} variant="Bulk" />,
      title: "Vision history",
      subtitle: "Visual acuity, IOP, and ophthalmic examination",
      message: "Vision summary",
    }
  }
  return null
}

function buildV0Actions(summary) {
  const hasIntake = !!summary.symptomCollectorData
  const specialtyAction = getSpecialtyAction(summary)

  if (hasIntake && specialtyAction) {
    // intake → summary → history → specialty
    return [ACTION_INTAKE, ACTION_SUMMARY, ACTION_HISTORY, specialtyAction]
  }
  if (hasIntake && !specialtyAction) {
    // intake → summary → history → vitals
    return [ACTION_INTAKE, ACTION_SUMMARY, ACTION_HISTORY, ACTION_VITALS]
  }
  if (!hasIntake && specialtyAction) {
    // summary → history → specialty → vitals
    return [ACTION_SUMMARY, ACTION_HISTORY, specialtyAction, ACTION_VITALS]
  }
  // No intake, no specialty → summary → history → vitals → past visits
  return [ACTION_SUMMARY, ACTION_HISTORY, ACTION_VITALS, ACTION_PAST_VISITS]
}

// ═══════════════ V0 WELCOME SCREEN ═══════════════

function V0WelcomeScreen({
  patientName,
  summary,
  onActionClick,
}

) {
  const actions = buildV0Actions(summary)
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  })()

  return (
    <div className={cn("flex flex-col items-center justify-center px-[16px] relative", patientName && "flex-1")}>
      <div className="absolute inset-0 bg-white pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "url(/icons/dr-agent/chat-bg.gif)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.04,
      }} />

      {/* Spark icon */}
      <div className="relative z-[1] mb-[10px]">
        <span
          className="pointer-events-none select-none relative inline-flex items-center justify-center overflow-hidden"
          style={{ width: 36, height: 36, borderRadius: 36 * 0.24 }}
        >
          <div className="absolute inset-0 bg-white" style={{ borderRadius: 36 * 0.24 }} />
          <div className="absolute inset-0" style={{
            backgroundImage: "url(/icons/dr-agent/chat-bg.gif)",
            backgroundSize: "cover",
            borderRadius: 36 * 0.24,
            opacity: 0.3,
          }} />
          <img
            src="/icons/dr-agent/agent-spark.svg"
            width={36 * 0.75}
            height={36 * 0.75}
            alt=""
            className="relative z-10 v0-welcome-spark-rotate"
            draggable={false}
          />
        </span>
      </div>

      <h2 className="relative z-[1] text-[18px] font-semibold text-tp-slate-800 text-center leading-[24px]">
        {greeting}, Doctor!
      </h2>
      <p className="relative z-[1] mt-[4px] text-[14px] text-center leading-[18px]" style={{ color: "#A2A2A8" }}>
        {patientName
          ? <>What would you like to know about <span className="font-semibold" style={{ color: "#6B7280" }}>{patientName.split(" ")[0]}</span>?</>
          : "Search and select a patient to view the summary"
        }
      </p>

      {/* Quick action cards — only shown when patient is selected */}
      {patientName && (
        <div className="relative z-[1] mt-[16px] grid grid-cols-2 gap-[10px] w-full">
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onActionClick(action.message)}
              className="v0-canned-card group relative flex flex-col items-start text-left transition-all overflow-hidden"
              style={{
                borderRadius: 14,
                padding: "14px 12px 16px",
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(226,226,234,0.5)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: "url(/icons/dr-agent/chat-bg.gif)",
                backgroundSize: "cover",
                opacity: 0.06,
                borderRadius: 14,
              }} />
              <span className="relative z-[1] mb-[8px] v0-icon-grad" style={{ opacity: 0.85 }}>
                {action.icon}
              </span>
              <span className="relative z-[1] text-[12px] font-semibold leading-[15px] w-full" style={{ color: "#3D3D4E" }}>
                {action.title}
              </span>
              <span className="relative z-[1] mt-[4px] text-[11px] font-normal leading-[15px] w-full v0-card-subtitle" style={{ color: "#9E9EA8" }}>
                {action.subtitle}
              </span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .v0-icon-grad svg { color: #8B5CF6; }
        .v0-icon-grad svg path, .v0-icon-grad svg circle, .v0-icon-grad svg rect {
          fill: url(#v0IconGrad);
        }
        .v0-card-subtitle {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .v0-canned-card {
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .v0-canned-card:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 3px 12px rgba(0,0,0,0.06) !important;
          border-color: rgba(139,92,246,0.25) !important;
        }
        .v0-canned-card:active {
          transform: translateY(0) scale(0.99);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
        }
        @keyframes v0SparkRotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .v0-welcome-spark-rotate { animation: v0SparkRotate 16s linear infinite; }
      `}</style>
      <svg width={0} height={0} className="absolute">
        <defs>
          <linearGradient id="v0IconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BE6DCF" />
            <stop offset="100%" stopColor="#5351BD" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ═══════════════ V0 PATIENT SEARCH (pre-selection inline) ═══════════════

/** Extract phone number (last segment after last ·) from meta string */
function extractPhoneFromMeta(meta) {
  const parts = meta.split("·").map(s => s.trim())
  return parts.length >= 3 ? parts[parts.length - 1] : parts.length > 1 ? parts.slice(1).join(" · ") : meta
}

function V0PatientSearchScreen({ onSelectPatient }) {
  const [query, setQuery] = useState("")
  const searchRef = useRef(null)
  const allPatients = RX_CONTEXT_OPTIONS.filter(o => o.kind === "patient")
  // When typing: show all matching patients. When empty: show today's appointments
  const filtered = query.trim()
    ? allPatients.filter(p => p.label.toLowerCase().includes(query.toLowerCase()))
    : allPatients.filter(p => p.isToday)

  return (
    <div className="relative z-[1] flex flex-col w-full px-[16px] mt-[16px] pb-[20px]">
      {/* Search input — full width with proper focus/hover states */}
      <div className="v0-search-wrapper relative">
        <SearchNormal1
          size={14}
          className="absolute left-[10px] top-1/2 -translate-y-1/2 text-tp-slate-400 pointer-events-none"
        />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patient by name..."
          className="v0-search-input w-full rounded-[8px] border-[1px] border-tp-slate-200 bg-white py-[8px] pl-[32px] pr-[10px] text-[13px] text-tp-slate-700 placeholder:text-tp-slate-300 outline-none transition-all"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        />
      </div>

      {/* Patient suggestions list */}
      <div className="mt-[8px] w-full max-h-[280px] overflow-y-auto rounded-[10px] border-[1px] border-tp-slate-100 bg-white v0-patient-list" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {!query.trim() && (
          <div className="px-[12px] py-[6px] border-b border-tp-slate-100">
            <p className="text-[11px] font-medium text-tp-slate-400 tracking-wide">Today&apos;s appointments</p>
          </div>
        )}
        {query.trim() && filtered.length === 0 ? (
          <p className="py-[16px] text-center text-[13px] text-tp-slate-400">No patients found</p>
        ) : (
          filtered.map((p) => {
            const phone = extractPhoneFromMeta(p.meta)
            const secondaryParts = [p.gender || "", p.age ? `${p.age}y` : "", phone].filter(Boolean)
            return (
              <button
                key={p.id}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelectPatient(p.id) }}
                className="v0-patient-row flex w-full items-center gap-[10px] px-[10px] py-[8px] text-left transition-colors border-b border-tp-slate-50 last:border-b-0 rounded-[6px]"
              >
                <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[10px] bg-tp-slate-100">
                  <UserBulkIcon size={14} className="text-tp-slate-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-tp-slate-800">{p.label}</p>
                  <p className="text-[11px] text-tp-slate-400 leading-[1.3]">
                    {secondaryParts.map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span style={{ color: "#D0D5DD", margin: "0 3px" }}>/</span>}
                        <span>{part}</span>
                      </React.Fragment>
                    ))}
                  </p>
                </div>
                {p.isToday && (
                  <span className="shrink-0 rounded-[4px] bg-tp-success-50 px-[5px] py-[1px] text-[10px] font-medium text-tp-success-600">Today</span>
                )}
              </button>
            )
          })
        )}
      </div>

      <style>{`
        .v0-search-input:hover { border-color: var(--tp-slate-300, #CBD5E1); background: var(--tp-slate-50, #F8FAFC); }
        .v0-search-input:focus { border-color: var(--tp-blue-400, #6C6BDE); box-shadow: 0 0 0 2px rgba(75,74,213,0.08); background: #fff; }
        .v0-patient-row:hover { background: var(--tp-blue-50, #EEEEFF); }
        .v0-patient-list::-webkit-scrollbar { width: 3px; }
        .v0-patient-list::-webkit-scrollbar-track { background: transparent; }
        .v0-patient-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
      `}</style>
    </div>
  )
}

// ═══════════════ V0 FLOATING PATIENT CHIP ═══════════════

function V0PatientChip({
  selectedId,
  onOpenSelector,
  locked,
  scrollRef,
  shaking,
}

) {
  // Scroll-aware: hide on scroll-down (slow), show on scroll-up, auto-reappear after 2s idle
  const [chipHidden, setChipHidden] = useState(false)
  const lastScrollTop = useRef(0)
  const idleTimerRef = useRef(null)

  useEffect(() => {
    const el = _optionalChain([scrollRef, 'optionalAccess', _ => _.current])
    if (!el) return
    function onScroll() {
      const st = el.scrollTop
      const delta = st - lastScrollTop.current
      // Only hide when scrolling down significantly (>5px delta) and past threshold
      if (delta > 5 && st > 40) {
        setChipHidden(true)
      } else if (delta < -3) {
        setChipHidden(false)
      }
      lastScrollTop.current = st

      // Auto-reappear after 2s of no scrolling
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        setChipHidden(false)
      }, 2000)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", onScroll)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [scrollRef])

  const allPatients = RX_CONTEXT_OPTIONS.filter(o => o.kind === "patient")
  const selected = allPatients.find(p => p.id === selectedId)

  if (!selected) return null

  const genderLabel = selected.gender === "M" ? "M" : selected.gender === "F" ? "F" : ""
  const ageLabel = selected.age ? `${selected.age}y` : ""

  // Glass chip style — shared between locked and unlocked
  const chipStyle = {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px) saturate(1.4)",
    WebkitBackdropFilter: "blur(12px) saturate(1.4)",
    boxShadow: "0 2px 12px rgba(15,23,42,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset",
    height: 28,
    borderRadius: 14,
  }

  const metaContent = genderLabel ? (
    <span className="flex-shrink-0 whitespace-nowrap flex items-center" style={{ fontSize: 10, lineHeight: "12px" }}>
      <span style={{ color: "#B0B7C3" }}>(</span>
      <span style={{ color: "#B0B7C3" }}>{genderLabel}</span>
      {ageLabel && <><span className="mx-[2px]" style={{ color: "#D0D5DD" }}>|</span><span style={{ color: "#B0B7C3" }}>{ageLabel}</span></>}
      <span style={{ color: "#B0B7C3" }}>)</span>
    </span>
  ) : null

  // Locked mode — non-clickable chip
  if (locked) {
    return (
      <div className={cn(
        "sticky top-0 z-10 flex justify-center pb-1 pt-3 transition-all duration-500 ease-in-out",
        chipHidden ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
      )}>
        <span
          className={cn("inline-flex items-center gap-[4px] px-[8px] py-[3px]", shaking && "v0-chip-shake")}
          style={chipStyle}
        >
          <span className="flex-shrink-0 text-tp-slate-500">
            <UserBulkIcon size={12} />
          </span>
          <span style={{ color: "#3D3D4E", fontWeight: 600, fontSize: 11, lineHeight: "12px" }}>{selected.label}</span>
          {metaContent}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex justify-center pb-1 pt-3 transition-all duration-500 ease-in-out",
        chipHidden ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
      )}
    >
      <button
        type="button"
        onClick={onOpenSelector}
        className={cn("v0-floating-chip inline-flex items-center gap-[4px] px-[8px] py-[3px] transition-all", shaking && "v0-chip-shake")}
        style={chipStyle}
      >
        <span className="flex-shrink-0 text-tp-slate-500">
          <UserBulkIcon size={12} />
        </span>
        <span style={{ color: "#3D3D4E", fontWeight: 600, fontSize: 11, lineHeight: "12px" }}>{selected.label}</span>
        {metaContent}
        <svg
          width={12}
          height={12}
          viewBox="0 0 12 12"
          fill="none"
          className="flex-shrink-0"
          style={{ color: "#667085" }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

// ═══════════════ MAIN V0 COMPONENT ═══════════════

export function DrAgentPanelV0({
  onClose,
  initialPatientId,
  isPatientDetailPage = false,
  autoMessage,
  autoMessageTrigger,
  patientSwitchTrigger,
  onSnapshotDelivered,
  persistedMessagesByPatient,
  onPersistedMessagesChange,
}) {
  // ── Patient Context ──
  const [selectedPatientId, setSelectedPatientId] = useState(_nullishCoalesce(initialPatientId, () => ( null)))
  // Animation state for patient selection
  const [animatingPatient, setAnimatingPatient] = useState(null)

  // Sync when initialPatientId changes from parent
  // patientSwitchTrigger forces re-sync even if same patient ID
  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId)
    }
  }, [initialPatientId, patientSwitchTrigger])

  // ── Per-Patient State (lifted to parent when onPersistedMessagesChange is provided) ──
  const [internalMessagesByPatient, setInternalMessagesByPatient] = useState({})
  const isMessagesPersisted = onPersistedMessagesChange != null
  const messagesByPatient = isMessagesPersisted ? (_nullishCoalesce(persistedMessagesByPatient, () => ( {}))) : internalMessagesByPatient
  const setMessagesByPatient = useCallback(
    (u) => {
      if (onPersistedMessagesChange) {
        onPersistedMessagesChange(u)
      } else {
        setInternalMessagesByPatient(u)
      }
    },
    [onPersistedMessagesChange],
  )
  const [phaseByPatient, setPhaseByPatient] = useState({})

  // ── UI State ──
  const [activeSpecialty, setActiveSpecialty] = useState("gp")
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [typingHint, setTypingHint] = useState("")

  // ── Integration ──
  const { requestCopyToRxPad, setPatientAllergies } = useRxPadSync()

  // ── Derived State ──
  const patient = useMemo(
    () => selectedPatientId ? (RX_CONTEXT_OPTIONS.find((p) => p.id === selectedPatientId) || RX_CONTEXT_OPTIONS[0]) : null,
    [selectedPatientId],
  )

  const summary = useMemo(
    () => selectedPatientId
      ? (SMART_SUMMARY_BY_CONTEXT[selectedPatientId] || SMART_SUMMARY_BY_CONTEXT[CONTEXT_PATIENT_ID])
      : SMART_SUMMARY_BY_CONTEXT[CONTEXT_PATIENT_ID],
    [selectedPatientId],
  )

  const messages = useMemo(
    () => selectedPatientId ? (messagesByPatient[selectedPatientId] || []) : [],
    [messagesByPatient, selectedPatientId],
  )

  const glanceInlinePillsActive = useMemo(
    () => messages.some((m) => isSituationAtGlanceAssistantMessage(m) && !!_optionalChain([m, 'access', _2 => _2.suggestions, 'optionalAccess', _3 => _3.length])),
    [messages],
  )

  const stickyReplySuggestions = useMemo(() => {
    if (isTyping) return undefined
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") return undefined
    if (!_optionalChain([last, 'access', _4 => _4.suggestions, 'optionalAccess', _5 => _5.length])) return undefined
    if (isSituationAtGlanceAssistantMessage(last)) return undefined
    return last.suggestions
  }, [messages, isTyping])

  const phase = useMemo(
    () => selectedPatientId ? (phaseByPatient[selectedPatientId] || "empty") : "empty",
    [phaseByPatient, selectedPatientId],
  )

  const availableSpecialties = useMemo(() => detectSpecialties(summary), [summary])

  // ── Pill deduplication ──
  const shownCardKinds = useMemo(() => {
    const kinds = new Set()
    for (const msg of messages) {
      if (_optionalChain([msg, 'access', _6 => _6.rxOutput, 'optionalAccess', _7 => _7.kind])) kinds.add(msg.rxOutput.kind)
    }
    return kinds
  }, [messages])

  // ── V0 pills: dedicated summary-only pill list ──
  // Uses labels that are known to exist in PILL_TO_CARD_KINDS and map to V0_ALLOWED_KINDS.
  // Unlike the generic pill-engine (which generates labels like "Vital trends", "Flagged lab results"
  // that don't survive V0 filtering), this directly builds V0-appropriate pills.
  const pills = useMemo(() => {
    if (!selectedPatientId) return []

    const hasIntake = !!_optionalChain([summary, 'access', _8 => _8.symptomCollectorData, 'optionalAccess', _9 => _9.symptoms, 'optionalAccess', _10 => _10.length])
    const hasVitals = !!(summary.todayVitals && Object.keys(summary.todayVitals).length > 0)
    const hasLastVisit = !!summary.lastVisit

    const tone = "primary"
    const candidates = [
      // Patient summary pill removed — short summary is auto-shown on patient select
      ...(hasIntake ? [{ id: "v0-intake", label: "Reported by patient", priority: 15, layer: 3, tone } ] : []),
      { id: "v0-history", label: "Medical history", priority: 20, layer: 3, tone },
      ...(_optionalChain([summary, 'access', _11 => _11.chronicConditions, 'optionalAccess', _12 => _12.length]) ? [{ id: "v0-chronic", label: "Chronic conditions", priority: 21, layer: 3, tone } ] : []),
      ...(_optionalChain([summary, 'access', _13 => _13.allergies, 'optionalAccess', _14 => _14.length]) ? [{ id: "v0-allergies", label: "Allergies", priority: 22, layer: 3, tone } ] : []),
      ...(_optionalChain([summary, 'access', _15 => _15.familyHistory, 'optionalAccess', _16 => _16.length]) ? [{ id: "v0-family", label: "Family history", priority: 23, layer: 3, tone } ] : []),
      ...(_optionalChain([summary, 'access', _17 => _17.lifestyleNotes, 'optionalAccess', _18 => _18.length]) ? [{ id: "v0-lifestyle", label: "Lifestyle", priority: 24, layer: 3, tone } ] : []),
      ...(hasVitals ? [{ id: "v0-vitals", label: "Today's vitals", priority: 25, layer: 3, tone } ] : []),
      ...(hasLastVisit ? [{ id: "v0-past-visits", label: "Past visit summaries", priority: 30, layer: 3, tone } ] : []),
      ...(summary.obstetricData ? [{ id: "v0-obstetric", label: "Obstetric summary", priority: 35, layer: 3, tone } ] : []),
      ...(summary.gynecData ? [{ id: "v0-gynec", label: "Gynec summary", priority: 35, layer: 3, tone } ] : []),
      ...(summary.pediatricsData ? [{ id: "v0-pediatric", label: "Growth & vaccines", priority: 35, layer: 3, tone } ] : []),
      ...(summary.ophthalData ? [{ id: "v0-ophthal", label: "Vision summary", priority: 35, layer: 3, tone } ] : []),
    ]

    // Filter out pills whose card has already been shown in conversation
    return candidates.filter(pill => {
      const cardKinds = PILL_TO_CARD_KINDS[pill.label]
      if (!cardKinds) return false
      return !cardKinds.some(kind => shownCardKinds.has(kind))
    })
  }, [selectedPatientId, summary, shownCardKinds])

  // ── Sync allergies ──
  useEffect(() => {
    setPatientAllergies(_nullishCoalesce(summary.allergies, () => ( [])))
  }, [summary, setPatientAllergies])

  // ── Initialize patient messages with auto short summary (once per patient when not persisted yet) ──
  const hasMessagesForPatient = selectedPatientId ? (_nullishCoalesce(_optionalChain([messagesByPatient, 'access', _19 => _19[selectedPatientId], 'optionalAccess', _20 => _20.length]), () => ( 0))) > 0 : false
  useEffect(() => {
    if (selectedPatientId && !hasMessagesForPatient) {
      // Icon-open flow sends autoMessage — skip silent inject so the user message + loader run first
      if (autoMessage) return
      // V0: Auto-inject situation-at-a-glance (not the full SBAR narrative)
      const quote = buildQuickClinicalSnapshotText(summary)
      const autoMessages = [
        {
          id: `v0-auto-summary-${selectedPatientId}`,
          role: "assistant",
          text: "Here's the situation at a glance.",
          feedbackGiven: null,
          rxOutput: {
            kind: "text_quote",
            data: {
              quote,
              source: "",
            },
          },
          suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "v0"),
          createdAt: new Date().toISOString(),
        },
      ]
      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: autoMessages,
      }))
      _optionalChain([onSnapshotDelivered, 'optionalCall', _21 => _21(selectedPatientId)])
    }
  }, [selectedPatientId, hasMessagesForPatient, summary, autoMessage, onSnapshotDelivered])

  // ── Reset specialty when patient changes ──
  useEffect(() => {
    const detected = detectSpecialties(summary)
    if (!detected.includes(activeSpecialty)) {
      setActiveSpecialty("gp")
    }
  }, [summary, activeSpecialty])

  // ── Core: Send Message ──
  const handleSend = useCallback((text) => {
    const msg = text || inputValue.trim()
    if (!msg || !selectedPatientId) return

    // Clear inline suggestions from first message (so bottom pill bar reappears)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).map(m => m.suggestions ? { ...m, suggestions: undefined } : m),
    }))

    const userMsg = {
      id: uid(),
      role: "user",
      text: msg,
      createdAt: new Date().toISOString(),
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setInputValue("")

    const pillOverride = PILL_INTENT_MAP[msg]
    const intent = pillOverride
      ? { category: pillOverride, format: "card" , confidence: 1 }
      : classifyIntent(msg)

    setTypingHint(getQueryHint(intent.category, msg))
    setIsTyping(true)

    setTimeout(() => {
      const currentMessages = [...(messagesByPatient[selectedPatientId] || []), userMsg]
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"
      const newPhase = inferPhase(currentMessages, currentPhase)
      if (newPhase !== currentPhase) {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: newPhase }))
      }

      let reply = buildReply(msg, summary, newPhase, intent)

      const t = msg.trim().toLowerCase()
      const q = QUICK_CLINICAL_SNAPSHOT_PROMPT.toLowerCase()
      if (t === q || t.startsWith(`${q}`)) {
        reply = {
          text: "Here's the situation at a glance.",
          rxOutput: { kind: "text_quote", data: { quote: buildQuickClinicalSnapshotText(summary), source: "" } },
          suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "v0"),
        }
      }

      // V0 guard: only allow summary card kinds, strip unsupported cards
      if (reply.rxOutput && !V0_ALLOWED_KINDS.has(reply.rxOutput.kind)) {
        reply = {
          text: "Sorry, I couldn't help you with that at the moment. You can ask me about patient summaries, vitals, or medical history, or try the quick-action pills below to get started.",
          rxOutput: undefined,
        }
      }
      delete reply.followUpPills

      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: reply.text,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
        suggestions: reply.suggestions,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
      setTypingHint("")
      _optionalChain([onSnapshotDelivered, 'optionalCall', _22 => _22(selectedPatientId)])
    }, 1800 + Math.random() * 700)
  }, [inputValue, selectedPatientId, summary, messagesByPatient, phaseByPatient, onSnapshotDelivered])

  // ── Auto-message from parent (e.g. AI icon "View Detailed Summary" CTA) ──
  const handleSendRef = useRef(handleSend)
  handleSendRef.current = handleSend
  useEffect(() => {
    if (!autoMessage || !selectedPatientId) return
    const am = autoMessage.trim().toLowerCase()
    const qp = QUICK_CLINICAL_SNAPSHOT_PROMPT.trim().toLowerCase()
    if (am === qp || am.startsWith(qp)) {
      const existing = messagesByPatient[selectedPatientId] || []
      if (
        existing.some(
          (m) => m.role === "user" && m.text.trim().toLowerCase() === am,
        )
      ) {
        return
      }
    }
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handleSendRef.current(autoMessage)
      })
    })
    return () => cancelAnimationFrame(rafId)
  }, [autoMessage, autoMessageTrigger, selectedPatientId, messagesByPatient])

  const handlePillTap = useCallback((pill) => {
    handleSend(pill.label)
  }, [handleSend])

  const handleFeedback = useCallback((messageId, feedback) => {
    if (!selectedPatientId) return
    setMessagesByPatient((prev) => {
      const msgs = prev[selectedPatientId] || []
      return {
        ...prev,
        [selectedPatientId]: msgs.map((m) =>
          m.id === messageId ? { ...m, feedbackGiven: feedback } : m,
        ),
      }
    })
  }, [selectedPatientId])

  const handleCopy = useCallback((payload) => {
    if (payload && typeof payload === "object" && "sourceDateLabel" in payload) {
      requestCopyToRxPad(payload )
      try {
        const existing = sessionStorage.getItem("pendingRxPadCopy")
        const arr = existing ? JSON.parse(existing) : []
        arr.push(payload)
        sessionStorage.setItem("pendingRxPadCopy", JSON.stringify(arr))
      } catch (e2) { /* ignore */ }
    }
  }, [requestCopyToRxPad])

  const handleChatPillTap = useCallback((label) => {
    handleSend(label)
  }, [handleSend])

  // ── Chip shake state — triggered when locked chip in input is clicked ──
  const [chipShaking, setChipShaking] = useState(false)
  const handleLockedChipClick = useCallback(() => {
    setChipShaking(true)
    setTimeout(() => setChipShaking(false), 600)
  }, [])

  // ── Edit message — ChatGPT-style: truncate after edited msg, re-send ──
  const handleEditMessage = useCallback((messageId, newText) => {
    if (!selectedPatientId) return
    setMessagesByPatient((prev) => {
      const msgs = prev[selectedPatientId] || []
      const idx = msgs.findIndex((m) => m.id === messageId)
      if (idx < 0) return prev
      const kept = msgs.slice(0, idx)
      return { ...prev, [selectedPatientId]: kept }
    })
    setTimeout(() => handleSend(newText), 50)
  }, [selectedPatientId, handleSend])

  // ── Patient Selector (bottom sheet) ──
  const [patientSelectorOpen, setPatientSelectorOpen] = useState(false)

  // ── Patient Change (from PatientSelector or floating chip) ──
  const handlePatientChange = useCallback((id) => {
    setSelectedPatientId(id)
    setInputValue("")
    setIsTyping(false)
  }, [])

  // ── Patient selection from search screen (with animation) ──
  const handlePatientSearchSelect = useCallback((patientId) => {
    const p = RX_CONTEXT_OPTIONS.find(o => o.id === patientId)
    if (!p) return
    setAnimatingPatient(p.label)
    setTimeout(() => {
      setSelectedPatientId(patientId)
      setAnimatingPatient(null)
    }, 600)
  }, [])

  // ── Chat scroll ref ──
  const chatScrollRef = useRef(null)

  // ── Reveal animation: fade-in content after patient selection ──
  const [showContent, setShowContent] = useState(!!initialPatientId)
  useEffect(() => {
    if (selectedPatientId && !animatingPatient) {
      const t = setTimeout(() => setShowContent(true), 100)
      return () => clearTimeout(t)
    }
    if (!selectedPatientId) setShowContent(false)
  }, [selectedPatientId, animatingPatient])

  const hasPatient = !!selectedPatientId && !!patient

  return (
    <div id="dr-agent-panel-root" className="relative flex h-full flex-col bg-white" style={{ minWidth: 350, maxWidth: 400 }}>
      {/* ── Header ── */}
      <AgentHeader
        availableSpecialties={availableSpecialties}
        activeSpecialty={activeSpecialty}
        onSpecialtyChange={setActiveSpecialty}
        onPatientChange={handlePatientChange}
        selectedPatientId={selectedPatientId || ""}
        onClose={onClose}
        variant="v0"
      />

      {/* ── Chat area ── */}
      <div
        className="relative flex flex-1 flex-col overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FAFAFE 0%, #F8F8FC 40%, #FAFAFD 100%)",
        }}
      >
        <div ref={chatScrollRef} className="da-chat-scroll flex flex-1 flex-col overflow-y-auto">

          {/* Floating patient chip — only when patient is selected and not animating */}
          {hasPatient && !animatingPatient && (
            <V0PatientChip
              selectedId={selectedPatientId}
              onOpenSelector={() => setPatientSelectorOpen(true)}
              locked={isPatientDetailPage}
              scrollRef={chatScrollRef}
              shaking={chipShaking}
            />
          )}

          {/* Animating patient chip — glass style sliding into position */}
          {animatingPatient && (
            <div className="relative z-[2] flex items-center justify-center pt-3 pb-1">
              <span
                className="inline-flex items-center gap-[4px] px-[8px] py-[3px]"
                style={{
                  background: "rgba(255,255,255,0.65)",
                  backdropFilter: "blur(12px) saturate(1.4)",
                  boxShadow: "0 2px 12px rgba(15,23,42,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset",
                  height: 28,
                  borderRadius: 14,
                  animation: "v0-chip-settle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                }}
              >
                <span className="flex-shrink-0 text-tp-slate-500">
                  <UserBulkIcon size={12} />
                </span>
                <span style={{ color: "#3D3D4E", fontWeight: 600, fontSize: 11 }}>{animatingPatient}</span>
              </span>
            </div>
          )}

          {/* Content: search screen or welcome or chat */}
          {!hasPatient && !animatingPatient ? (
            // No patient — greeting + search, vertically centered as one block
            <div className="flex flex-1 flex-col items-center justify-center">
              <V0WelcomeScreen
                summary={summary}
                onActionClick={() => {}}
              />
              <V0PatientSearchScreen onSelectPatient={handlePatientSearchSelect} />
            </div>
          ) : !hasPatient && animatingPatient ? (
            null
          ) : (
            // V0: Skip welcome screen — go directly to chat with auto-injected short summary
            <div className={cn("flex flex-1 flex-col", showContent ? "v0-content-reveal" : "opacity-0")}>
              <ChatThread
                messages={messages}
                isTyping={isTyping}
                typingHint={typingHint}
                onFeedback={handleFeedback}
                onPillTap={handleChatPillTap}
                onCopy={handleCopy}
                className="flex-1"
                activeSpecialty={activeSpecialty}
                patientDocuments={[]}
                onEditMessage={handleEditMessage}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: Canned Messages only (V0 — no input box) ── */}
      {hasPatient && (
        <div className={cn("sticky bottom-0 z-10 shrink-0 border-t border-tp-slate-100/80 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.04)] relative", showContent ? "v0-content-reveal" : "opacity-0")}>
          <div
            className="pointer-events-none absolute -top-[16px] left-0 right-0"
            style={{
              height: 16,
              background: "linear-gradient(to top, rgba(255,255,255,0.98), rgba(255,255,255,0.4) 40%, transparent)",
            }}
          />
          {stickyReplySuggestions && stickyReplySuggestions.length > 0 && (
            <SuggestionBar
              suggestions={stickyReplySuggestions}
              onTap={handleChatPillTap}
              disabled={isTyping}
              className="pt-[8px]"
            />
          )}
          {pills.length > 0 && !isTyping && !glanceInlinePillsActive && (
            <div className="px-[4px] pt-[8px] pb-[6px]">
              <PillBar
                pills={pills}
                onTap={handlePillTap}
                disabled={false}
              />
            </div>
          )}
          {/* Trust mark — no input box in V0 */}
          <div className="px-3 py-2 flex items-center justify-center gap-1.5">
            <SecuritySafe size={12} variant="Bulk" className="shrink-0 text-tp-slate-300" />
            <p className="text-[10px] text-tp-slate-300">Data stays private · AI-assisted, you decide</p>
          </div>
        </div>
      )}

      {/* ── Patient Selector Bottom Sheet — same UI as full agent ── */}
      <PatientSelector
        selectedId={selectedPatientId || ""}
        onSelect={handlePatientChange}
        isOpen={patientSelectorOpen}
        onClose={() => setPatientSelectorOpen(false)}
        title="Select Chat Context"
      />

      {/* Animation keyframes */}
      <style>{`
        @keyframes v0-chip-settle {
          0% { opacity: 0; transform: translateY(30px) scale(0.85); }
          60% { opacity: 1; transform: translateY(-2px) scale(1.03); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes v0ContentReveal {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .v0-content-reveal {
          animation: v0ContentReveal 0.4s ease-out forwards;
        }
        .v0-floating-chip:hover {
          box-shadow: 0 4px 16px rgba(15,23,42,0.12), 0 0 0 1px rgba(255,255,255,0.6) inset !important;
          transform: translateY(-1px);
        }
        .v0-floating-chip:active {
          transform: translateY(0) scale(0.97);
          box-shadow: 0 1px 6px rgba(15,23,42,0.06), 0 0 0 1px rgba(255,255,255,0.5) inset !important;
        }
        @keyframes v0ChipShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-3px); }
          30% { transform: translateX(3px); }
          45% { transform: translateX(-2px); }
          60% { transform: translateX(2px); }
          75% { transform: translateX(-1px); }
          90% { transform: translateX(1px); }
        }
        .v0-chip-shake {
          animation: v0ChipShake 0.5s ease-in-out;
        }
        .da-chat-scroll::-webkit-scrollbar { width: 3px; }
        .da-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .da-chat-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
        .da-chat-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.12) transparent; }
      `}</style>
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
