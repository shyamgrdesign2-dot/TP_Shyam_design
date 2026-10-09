import React, { useMemo, useState, useRef, useCallback, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "../../dr-agent/utils"
import { useTouchDevice } from "../../dr-agent/hooks/use-touch-device"

import { CardRenderer } from "../cards/CardRenderer"
import { VeloraSpark } from "../shared/VeloraStar"
import { CardStreamContext } from "../cards/CardStreamContext"
import { FeedbackRow } from "../cards/FeedbackRow"
import { CopyIcon } from "../cards/CopyIcon"
import { ActionableTooltip } from "../cards/ActionableTooltip"
import { AiBrandSparkIcon } from "../../dr-agent/shared/AiBrandSparkIcon"
import { CopilotIcon } from "../ui/CopilotIcon"
import { DocumentAttachmentBubble } from "./DocumentAttachmentBubble"
import { VoiceTranscriptCard } from "../../dr-agent/voicerx/VoiceTranscriptCard"
import { VoiceRxIcon } from "../../dr-agent/voicerx/voice-consult-icons"
import { DataCompletenessDonut } from "../cards/DataCompletenessDonut"
import { isSituationAtGlanceAssistantMessage } from "../shared/isSituationAtGlanceMessage"

/**
 * Derive data completeness from card kind — used for completeness ring.
 * Only shown for cards where completeness is meaningful:
 * - POMR problem cards (have actual completeness data)
 * - Document extraction (OCR) — mix of AI extraction vs missing
 * - SBAR — mix of EMR + AI assessment
 * NOT shown for: patient summaries, labs, vitals, med history (pure EMR),
 * DDX/protocol meds (pure AI), symptom collector (patient-reported), etc.
 */
function getCompletenessForOutput(output) {
  if (!output) return null
  // POMR cards have their own completeness data
  if (output.kind === "pomr_problem_card") {
    const d = output.data
    return { emr: d.completeness.emr, ai: d.completeness.ai, missing: d.completeness.missing }
  }
  switch (output.kind) {
    // Document extraction — meaningful: shows how much was extracted vs missing
    case "ocr_extraction":
    case "ocr_pathology":
      return { emr: 0, ai: 90, missing: 10 }
    // SBAR — meaningful: mix of EMR data + AI clinical assessment
    case "sbar_critical":
      return { emr: 70, ai: 20, missing: 10 }
    // Everything else — no completeness ring (only source tag)
    default:
      return null
  }
}

/** Rich source entry for the source tooltip */

/**
 * Derive provenance-focused source references from card output data.
 * Each entry answers "WHERE did this data come from?" — the origin, not the count.
 *
 * Provenance types:
 * - EMR historical records (past visits, demographics, chronic conditions)
 * - Uploaded documents (lab PDFs, prescriptions, discharge summaries)
 * - AI extraction (from uploaded/scanned documents)
 * - Patient-reported (symptom collector intake)
 * - Clinical protocols (guidelines, treatment standards)
 */
function getSourcesForOutput(output, documents) {
  if (!output) return null

  /* Chart Search answers carry their own Evidence card, which names the system,
     table and row every claim came from. A second, vaguer "Source" row beneath
     the bubble would say less than the card already does - and a guardrail is
     a statement about the absence of records, so it has no source at all. */
  /* Hospital-wide matches name their own source on every row, and a scope
     redirect is a statement about this conversation rather than a reading of
     any record, so the generic "AI" footer below is wrong for both. */
  if (
    output.kind === "chart_answer" ||
    output.kind === "guardrail" ||
    output.kind === "patient_matches" ||
    output.kind === "patient_bridge" ||
    output.kind === "scope_redirect"
  ) {
    return null
  }

  /** Helper: readable doc name from fileName */
  const docName = (doc) =>
    doc.fileName.replace(/_/g, " ").replace(/\.pdf$/i, "").replace(/\.jpg$/i, "")

  switch (output.kind) {
    case "patient_summary":
    case "patient_narrative": {
      const d = output.data
      const entries = [{ label: "EMR", description: "Patient's clinical data" }]

      if (_optionalChain([d, 'access', _ => _.keyLabs, 'optionalAccess', _2 => _2.length])) {
        const prov = d.dataProvenance
        if (prov) {
          const emrLabs = d.keyLabs.filter(l => _optionalChain([prov, 'access', _3 => _3[l.name], 'optionalAccess', _4 => _4.source]) === "emr")
          if (emrLabs.length > 0) {
            entries.push({ label: "Lab Results", description: `${emrLabs.length} lab results` })
          }
          const extractedLabs = d.keyLabs.filter(l => _optionalChain([prov, 'access', _5 => _5[l.name], 'optionalAccess', _6 => _6.source]) === "ai_extracted")
          if (extractedLabs.length > 0) {
            const sources = new Set(extractedLabs.map(l => prov[l.name].extractedFrom).filter(Boolean))
            entries.push({ label: "Records", description: `${sources.size} uploaded record${sources.size > 1 ? "s" : ""} (${sources.size > 1 ? "multiple dates" : "1 date"})` })
          }
        } else {
          const uploadedDocs = _optionalChain([documents, 'optionalAccess', _7 => _7.filter, 'call', _8 => _8(doc =>
            ["pathology", "radiology", "discharge_summary", "prescription", "other"].includes(doc.docType)
          )]) || []
          if (uploadedDocs.length > 0) {
            const uniqueDates = new Set(uploadedDocs.map(doc => doc.uploadedAt)).size
            entries.push({ label: "Records", description: `${uploadedDocs.length} uploaded record${uploadedDocs.length > 1 ? "s" : ""} (${uniqueDates > 1 ? `${uniqueDates} dates` : uploadedDocs[0].uploadedAt})` })
          } else {
            entries.push({ label: "Lab Results", description: `${d.keyLabs.length} lab results` })
          }
        }
      }

      if (d.lastVisit) {
        entries.push({ label: "Past Visits", description: `Consultation (${d.lastVisit.date})` })
      }
      if (d.symptomCollectorData) {
        entries.push({ label: "Symptom Collector", description: `Patient's reported data (${d.symptomCollectorData.reportedAt})` })
      }
      return entries
    }

    case "symptom_collector":
      return [{ label: "Symptom Collector", description: `Patient's reported data (${output.data.reportedAt || "today"})` }]

    case "last_visit":
      return [{ label: "Past Visits", description: `Last consultation (${_optionalChain([output, 'access', _9 => _9.data, 'optionalAccess', _10 => _10.visitDate]) || "recent"})` }]

    case "lab_panel": {
      const d = output.data
      const labDocs = _optionalChain([documents, 'optionalAccess', _11 => _11.filter, 'call', _12 => _12(doc => doc.docType === "pathology")]) || []
      const match = _optionalChain([d, 'optionalAccess', _13 => _13.panelDate]) ? labDocs.find(doc => doc.uploadedAt === d.panelDate) : labDocs[0]
      return [{ label: match ? "Records" : "Lab Results", description: match ? `Uploaded report (${match.uploadedAt})` : `EMR lab results${_optionalChain([d, 'optionalAccess', _14 => _14.panelDate]) ? ` (${d.panelDate})` : ""}` }]
    }

    case "lab_trend": {
      const dates = [...new Set((_optionalChain([output, 'access', _15 => _15.data, 'optionalAccess', _16 => _16.series]) || []).flatMap(s => s.dates || []).map(d => d.trim()))]
      const dateStr = dates.length > 1 ? `${dates.length} dates` : dates[0] || ""
      return [{ label: "Lab Results", description: `${_optionalChain([output, 'access', _17 => _17.data, 'optionalAccess', _18 => _18.series, 'optionalAccess', _19 => _19.length]) || 0} parameters${dateStr ? ` (${dateStr})` : ""}` }]
    }

    case "lab_comparison":
      return [{ label: "Lab Results", description: `${_optionalChain([output, 'access', _20 => _20.data, 'access', _21 => _21.rows, 'optionalAccess', _22 => _22.length]) || 0} parameters compared` }]

    case "vitals_trend_bar":
    case "vitals_trend_line": {
      const series = _optionalChain([output, 'access', _23 => _23.data, 'optionalAccess', _24 => _24.series]) || []
      const dates = [...new Set(series.flatMap(s => s.dates || []).map(d => d.trim()))]
      const dateStr = dates.length > 1 ? `${dates.length} dates` : dates[0] || ""
      return [{ label: "Vitals", description: `${series.map(s => s.label).join(", ")}${dateStr ? ` (${dateStr})` : ""}` }]
    }

    case "med_history":
      return [{ label: "History", description: "Medication history" }]

    case "ddx":
      return [
        { label: "Context", description: output.data.context || "Patient's symptoms & history" },
        { label: "Protocol", description: "Clinical DDx guidelines" },
      ]

    case "protocol_meds":
      return [
        { label: "Context", description: output.data.diagnosis },
        { label: "Protocol", description: "Treatment protocols" },
      ]

    case "investigation_bundle":
      return [
        { label: "Context", description: "Patient's conditions & history" },
        { label: "Protocol", description: "Investigation guidelines" },
      ]

    case "follow_up":
      return [
        { label: "Context", description: output.data.context || "Current conditions & treatment" },
        { label: "Protocol", description: "Follow-up guidelines" },
      ]

    case "advice_bundle":
      return [{ label: "Protocol", description: "Clinical care & lifestyle guidelines" }]

    case "obstetric_summary":
      return [{ label: "Obstetric", description: `ANC records${output.data.gestationalWeeks ? `, ${output.data.gestationalWeeks}` : ""}` }]

    case "gynec_summary":
      return [{ label: "Gynec", description: "Gynaecology history & records" }]

    case "ophthal_summary":
      return [{ label: "Ophthal", description: "Ophthalmology records" }]

    case "pediatric_summary":
      return [{ label: "Growth", description: "Pediatric growth & development records" }]

    case "pomr_problem_card": {
      const d = output.data
      const entries = [{ label: "History", description: `${d.problem} clinical data` }]
      if (_optionalChain([d, 'access', _25 => _25.labs, 'optionalAccess', _26 => _26.length])) entries.push({ label: "Lab Results", description: `${d.labs.length} results` })
      if (_optionalChain([d, 'access', _27 => _27.sourceEntries, 'optionalAccess', _28 => _28.some, 'call', _29 => _29(se => se.type === "uploaded")])) entries.push({ label: "Records", description: "Uploaded records" })
      return entries
    }

    case "sbar_critical":
      return [
        { label: "History", description: "Clinical history & vitals" },
        { label: "AI", description: "AI clinical assessment" },
      ]

    case "ocr_pathology":
      return [{ label: "Records", description: "Uploaded report" }]

    case "ocr_extraction":
      return [{ label: "Records", description: "Uploaded document" }]

    case "drug_interaction":
      return [{ label: "History", description: "Active medications" }, { label: "Protocol", description: "Drug interaction check" }]

    case "allergy_conflict":
      return [{ label: "History", description: "Allergy records" }, { label: "Protocol", description: "Allergen contraindication check" }]

    case "translation":
      return [{ label: "Context", description: "Current consultation content" }]

    case "completeness":
      return [{ label: "EMR", description: "Current visit completeness check" }]

    case "text_fact":
      return [{ label: output.data.source ? "Reference" : "Context", description: output.data.source || "Patient's clinical context" }]

    case "text_alert":
      return [{ label: "AI", description: "Current clinical data & visit context" }]

    case "text_list":
      return [{ label: "Context", description: "Clinical history & current visit" }]

    case "voice_structured_rx":
      return [{ label: "Voice", description: "Doctor's voice input" }, { label: "Protocol", description: "Prescription format" }]

    case "referral":
      return [{ label: "History", description: "Clinical records & diagnosis" }, { label: "Context", description: "Current consultation" }]

    case "vaccination_schedule":
      return [{ label: "Vaccine", description: "Immunisation records" }, { label: "Protocol", description: "Immunisation schedule" }]

    case "follow_up_question":
      return [{ label: "AI", description: "Conversation context" }]

    case "patient_list":
    case "follow_up_list":
    case "due_patients":
      return [{ label: "EMR", description: "Clinic records" }]

    case "revenue_bar":
    case "revenue_comparison":
    case "analytics_table":
    case "line_graph":
    case "donut_chart":
    case "pie_chart":
    case "condition_bar":
    case "heatmap":
    case "follow_up_rate":
      return [{ label: "EMR", description: "Clinic analytics" }]

    case "bulk_action":
      return [{ label: "EMR", description: "Patient communication records" }]

    case "welcome_card":
    case "external_cta":
    case "patient_search":
      return null

    default:
      return [{ label: "AI", description: "Patient & clinical data" }]
  }
}

/** Short badge text for each source type — maps to sidebar section names */
function getSourceTag(label) {
  const TAG_MAP = {
    "EMR": "EMR", "Lab Results": "Lab Results", "Records": "Records",
    "Past Visits": "Past Visits", "History": "History", "Vitals": "Vitals",
    "Obstetric": "Obstetric", "Gynec": "Gynec", "Ophthal": "Ophthal",
    "Growth": "Growth", "Vaccine": "Vaccine",
    "Symptom Collector": "Symptom Collector", "Receptionist Agent": "Receptionist Agent",
    "AI": "AI", "Context": "Context", "Protocol": "Protocol",
    "Rx": "Rx", "Voice": "Voice", "Reference": "Reference",
  }
  return TAG_MAP[label] || label
}

/**
 * Portal-based tooltip with arrow — shared by SourceTag and DataCompletenessDonut.
 * Renders above the trigger, arrow points to center of trigger, viewport-aware.
 */
function PortalTooltip({
  isVisible,
  triggerRef,
  children,
  width = 240,
  onMouseEnter,
  onMouseLeave,
}

) {
  const tooltipRef = useRef(null)
  const [pos, setPos] = useState(null)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipEl = tooltipRef.current
    const tooltipH = tooltipEl.offsetHeight
    const MARGIN = 8
    const GAP = 8

    // Center tooltip horizontally on trigger
    const triggerCenterX = triggerRect.left + triggerRect.width / 2
    let left = triggerCenterX - width / 2

    // Clamp to viewport
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN))

    // Arrow points at trigger center
    const arrowLeft = Math.max(12, Math.min(triggerCenterX - left, width - 12))

    // Position above trigger
    const top = triggerRect.top - GAP - tooltipH

    setPos({ top, left, arrowLeft })
  }, [triggerRef, width])

  useEffect(() => {
    if (!isVisible) { setPos(null); return }
    requestAnimationFrame(updatePosition)
  }, [isVisible, updatePosition])

  useEffect(() => {
    if (!isVisible) return
    const reposition = () => requestAnimationFrame(updatePosition)
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    return () => {
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
    }
  }, [isVisible, updatePosition])

  if (!isVisible || typeof document === "undefined") return null

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[9999]"
      style={
        pos
          ? { top: pos.top, left: pos.left, width, opacity: 1, transition: "opacity 100ms ease-out" }
          : { top: -9999, left: -9999, width, opacity: 0 }
      }
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="rounded-[8px] bg-white overflow-hidden"
        style={{
          boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
          border: "1px solid rgba(148,163,184,0.2)",
        }}
      >
        {children}
      </div>
      {/* Downward arrow */}
      {pos && (
        <div style={{ paddingLeft: pos.arrowLeft - 5 }}>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid white",
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.06))",
            }}
          />
        </div>
      )}
    </div>,
    document.body,
  )
}

/** Dot color for each source type — subtle, meaningful differentiation */
function getDotColor(label) {
  switch (label) {
    case "EMR": return "#7C3AED"            // violet — primary clinical data
    case "Lab Results": return "#3C3BB5"     // blue — lab/diagnostic
    case "Records": return "#D97706"        // amber — uploaded documents
    case "Past Visits": return "#059669"     // green — visit history
    case "Symptom Collector":
    case "Receptionist Agent": return "#DB2777" // pink — patient-reported
    case "Vitals": return "#0891B2"         // teal — vitals
    case "History": return "#7C3AED"        // violet — clinical history
    case "Obstetric":
    case "Gynec":
    case "Ophthal":
    case "Growth":
    case "Vaccine": return "#7C3AED"        // violet — specialty sections
    case "AI": return "#4F46E5"             // indigo — AI-generated
    case "Protocol": return "#475569"       // slate — guidelines
    case "Context": return "#475569"        // slate — context
    default: return "#64748B"               // neutral
  }
}

/**
 * Source provenance — click-to-open dropdown below the Source button.
 * Uses portal for proper layering. Positioned directly below the trigger.
 * Shows WHERE data was fetched from — trust signal for doctors.
 */
function SourceDropdown({
  isOpen,
  onToggle,
  sources,
}

) {
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [pos, setPos] = useState(null)
  const showTimer = useRef(null)
  const hideTimer = useRef(null)

  // Hover handlers — show on hover after short delay, hide with grace period
  const hoverShow = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (isOpen) return
    showTimer.current = setTimeout(() => onToggle(), 200)
  }, [isOpen, onToggle])
  const hoverHide = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => {
      if (isOpen) onToggle()
    }, 250)
  }, [isOpen, onToggle])
  const keepOpen = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (showTimer.current) clearTimeout(showTimer.current)
  }, [])

  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  // Position dropdown — above or below depending on viewport space
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownH = dropdownRef.current.offsetHeight
    const dropdownWidth = 280
    const GAP = 4
    const MARGIN = 8

    // Open above if not enough room below
    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove = spaceBelow < dropdownH + GAP + MARGIN

    const top = openAbove
      ? rect.top - dropdownH - GAP
      : rect.bottom + GAP

    // Clamp left to stay in viewport
    let left = rect.left
    if (left + dropdownWidth > window.innerWidth - MARGIN) {
      left = window.innerWidth - dropdownWidth - MARGIN
    }
    if (left < MARGIN) left = MARGIN

    setPos({ top, left })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    const reposition = () => requestAnimationFrame(updatePosition)
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    return () => {
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
    }
  }, [isOpen, updatePosition])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (
        _optionalChain([triggerRef, 'access', _30 => _30.current, 'optionalAccess', _31 => _31.contains, 'call', _32 => _32(e.target )]) ||
        _optionalChain([dropdownRef, 'access', _33 => _33.current, 'optionalAccess', _34 => _34.contains, 'call', _35 => _35(e.target )])
      ) return
      onToggle()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen, onToggle])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        onMouseEnter={hoverShow}
        onMouseLeave={hoverHide}
        className={cn(
          "flex items-center gap-[3px] rounded-[4px] px-[5px] py-[2px] transition-colors",
          isOpen
            ? "text-tp-blue-600 bg-tp-blue-50"
            : "text-tp-slate-400 hover:text-tp-slate-500 hover:bg-tp-slate-50",
        )}
        aria-label="View data sources"
        aria-expanded={isOpen}
      >
        <CopilotIcon name="document-text" variant="bulk" size={13} />
        <span className="text-[14px] font-medium leading-[1]">Source</span>
      </button>

      {/* Portal dropdown */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-[280px] rounded-[8px] bg-white overflow-hidden"
          onMouseEnter={keepOpen}
          onMouseLeave={hoverHide}
          style={{
            top: _nullishCoalesce(_optionalChain([pos, 'optionalAccess', _36 => _36.top]), () => ( -9999)),
            left: _nullishCoalesce(_optionalChain([pos, 'optionalAccess', _37 => _37.left]), () => ( -9999)),
            boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(148,163,184,0.12)",
          }}
        >
          {/* Header — dynamic source count */}
          <div
            className="flex items-center gap-[5px] px-[12px] py-[7px]"
            style={{ borderBottom: "1px solid rgba(148,163,184,0.10)" }}
          >
            <CopilotIcon name="document-text" variant="bulk" size={12} color="var(--tp-slate-500, #717179)" />
            <p className="text-[14px] font-semibold text-tp-slate-500">
              Compiled from {sources.length} source{sources.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Source entries — colored dot + label + description */}
          <div className="px-[10px] py-[6px] max-h-[240px] overflow-y-auto">
            {sources.map((src, i) => {
              const dotColor = getDotColor(src.label)
              const tag = getSourceTag(src.label)
              return (
                <div key={i} className="flex items-start gap-[7px] py-[4px]">
                  {/* Colored dot */}
                  <span
                    className="mt-[4px] flex-shrink-0 h-[5px] w-[5px] rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-[1.5] text-tp-slate-700">
                      <span className="font-semibold">{tag}</span>
                      <span className="text-tp-slate-400 mx-[4px]">&middot;</span>
                      <span className="text-tp-slate-500">{src.description}</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

/** Convert light markdown (bold + links) into rich text. */
function renderAssistantMarkdown(text, onPillTap) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={i} className="font-semibold text-tp-slate-900">{token.slice(2, -2)}</strong>
    }

    if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (!match) return <span key={i}>{token}</span>
      const [, label, href] = match

      if (href.startsWith("action:")) {
        const actionLabel = decodeURIComponent(href.slice("action:".length))
        return (
          <button
            key={i}
            type="button"
            onClick={() => _optionalChain([onPillTap, 'optionalCall', _38 => _38(actionLabel || label)])}
            className="font-medium text-tp-blue-600 underline underline-offset-2 transition-colors hover:text-tp-blue-700"
          >
            {label}
          </button>
        )
      }

      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-tp-blue-600 underline underline-offset-2 transition-colors hover:text-tp-blue-700"
        >
          {label}
        </a>
      )
    }

    return <span key={i}>{token}</span>
  })
}

// -----------------------------------------------------------------
// ChatBubble
//
// ASSISTANT layout:
//   [AI Spark 20px]  Text content (plain, no bubble)
//                    Card output (standalone, not inside a bubble)
//                    thumbs-up  thumbs-down
//
// USER layout:
//   Right-aligned bubble with rounded corners
// -----------------------------------------------------------------

function formatTime(iso) {
  try {
    const d = new Date(iso)
    let hours = d.getHours()
    const mm = d.getMinutes().toString().padStart(2, "0")
    const ampm = hours >= 12 ? "pm" : "am"
    hours = hours % 12
    if (hours === 0) hours = 12
    return `${hours}:${mm} ${ampm}`
  } catch (e2) {
    return ""
  }
}

/**
 * Typewriter hook — reveals text character by character for a streaming feel.
 * Only runs once when the component first mounts with text; subsequent renders
 * show the full text immediately.
 */
function useTypewriter(text, shouldAnimate, speed = 18) {
  const [charIndex, setCharIndex] = useState(shouldAnimate ? 0 : text.length)
  const isDone = charIndex >= text.length

  useEffect(() => {
    if (!shouldAnimate || charIndex >= text.length) return
    const t = setTimeout(() => setCharIndex(i => Math.min(i + 1, text.length)), speed)
    return () => clearTimeout(t)
  }, [charIndex, text.length, shouldAnimate, speed])

  return { displayText: text.slice(0, charIndex), isDone }
}

export function ChatBubble({
  message,
  onFeedback,
  onPillTap,
  onCopy,
  onSidebarNav,
  activeSpecialty,
  patientDocuments,
  onPatientSelect,
  onEditMessage,
}) {
  const isTouch = useTouchDevice()
  const isUser = message.role === "user"
  const timestamp = useMemo(() => formatTime(message.createdAt), [message.createdAt])
  const [sourceOpen, setSourceOpen] = useState(false)

  // ── Edit state — must be before any conditionals (hooks rule) ──
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.text)
  const editRef = useRef(null)

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.style.height = "auto"
      editRef.current.style.height = editRef.current.scrollHeight + "px"
    }
  }, [isEditing])

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== message.text && onEditMessage) {
      onEditMessage(message.id, trimmed)
    }
    setIsEditing(false)
  }, [editText, message.text, message.id, onEditMessage])

  const handleCancelEdit = useCallback(() => {
    setEditText(message.text)
    setIsEditing(false)
  }, [message.text])

  // ── Track whether this is a "new" message (just appeared) for streaming ──
  /* "New" means it arrived just now, not "mounted just now": switching
     patient or reopening a conversation remounts every bubble, and those
     answers were already read, so they must not type themselves out again. */
  const arrivedNow = useMemo(() => {
    const at = Date.parse(message.createdAt || "")
    return !Number.isFinite(at) || Date.now() - at < 4000
  }, [message.createdAt])
  const isNewRef = useRef(arrivedNow)
  const shouldStream = isNewRef.current && !isUser && !!message.text
  useEffect(() => { isNewRef.current = false }, [])

  // ── Typewriter for assistant text ──
  const { displayText, isDone: textDone } = useTypewriter(
    message.text || "",
    shouldStream,
    16, // ~60 chars/sec
  )

  // ── AI row vertical alignment: center when the text is a single line, top-align once it wraps.
  //    Uses ResizeObserver so streaming text updates correctly without a re-measure on every tick.
  const aiTextRef = useRef(null)
  const [aiTextMultiLine, setAiTextMultiLine] = useState(false)
  useLayoutEffect(() => {
    const el = aiTextRef.current
    if (!el) return
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 18
      setAiTextMultiLine(el.offsetHeight > lh * 1.5)
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [message.text, displayText, shouldStream])

  // ── Phased card reveal: card fades in after text finishes streaming ──
  const [cardRevealed, setCardRevealed] = useState(false)
  const hasCard = !!message.rxOutput
  useEffect(() => {
    if (!hasCard || isUser) { setCardRevealed(true); return }
    if (shouldStream && !textDone) return // Wait for text to finish
    // Small delay after text completes, then reveal card
    const delay = message.text ? 150 : 80
    const t = setTimeout(() => setCardRevealed(true), delay)
    return () => clearTimeout(t)
  }, [hasCard, isUser, message.text, shouldStream, textDone])

  // ---- USER bubble ----
  if (isUser) {
    return (
      <div className="group/msg flex w-full flex-col">
        {isEditing ? (
          /* ── Edit mode — full-width within chat area ──
             Says what the two keys do, because a doctor who opened this by
             accident needs to know the way out as much as the way through.
             Enter sends, the same as the main composer; Shift+Enter is a new
             line. Send stays disabled, and says why in its tooltip, until
             the text actually differs from what was asked. */
          <div className="w-full rounded-[12px] border-[1px] border-tp-blue-300 bg-white px-3 py-2.5" style={{ boxShadow: "0 0 0 3px rgba(75,74,213,0.10)" }}>
            <label htmlFor={`edit-${message.id}`} className="mb-[4px] block text-[11.5px] font-semibold text-tp-slate-500">
              Edit your question
            </label>
            <textarea
              id={`edit-${message.id}`}
              ref={editRef}
              value={editText}
              onChange={(e) => { setEditText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px" }}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancelEdit()
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  /* Same rule as the Send button beside it: an empty or
                     unchanged question is not sent. It used to close the
                     editor silently, which read as "sent" when nothing was. */
                  const trimmed = editText.trim()
                  if (trimmed && trimmed !== message.text) handleSaveEdit()
                }
              }}
              className="w-full resize-none bg-transparent text-[14px] leading-[20px] text-tp-slate-800 outline-none"
              rows={1}
            />
            <div className="mt-[8px] flex flex-wrap items-center justify-between gap-[8px]">
              <span className="text-[11.5px] text-tp-slate-500">Enter to send. Esc to cancel.</span>
              <div className="flex gap-[6px]">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-[32px] rounded-[10px] px-[12px] text-[12.5px] font-medium text-tp-slate-600 transition-colors duration-[var(--copilot-dur-state)] hover:bg-tp-slate-100 hover:text-tp-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() || editText.trim() === message.text}
                  title={!editText.trim() || editText.trim() === message.text ? "Change the question to send it again" : undefined}
                  className="h-[32px] rounded-[10px] bg-tp-blue-500 px-[12px] text-[12.5px] font-semibold text-white transition-colors duration-[var(--copilot-dur-state)] hover:bg-tp-blue-600 disabled:cursor-not-allowed disabled:bg-tp-slate-200 disabled:text-tp-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
        <div className="flex w-full justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-[2px]">
          {/* Attachment card (PDF) — shown above text bubble */}
          {message.attachment && (
            <div className="w-full max-w-[220px]">
              <DocumentAttachmentBubble attachment={message.attachment} />
            </div>
          )}

          {/* A VoiceRx turn is the Rx pad's own transcript bubble, not a
              typed message: mode, duration and the transcript, collapsible. */}
          {message.voiceTranscript ? (
              <div className="w-full min-w-[240px]" data-dr-agent="true">
                <VoiceTranscriptCard
                  mode={message.voiceMode}
                  transcript={message.voiceTranscript}
                  durationMs={message.voiceDurationMs}
                />
              </div>
            ) : message.text ? (
              <div
                className="rounded-[12px] rounded-br-[0px] px-3 py-2 text-[14px] leading-[18px] text-tp-slate-800"
                style={{
                  // High-legibility frosted bubble: nearly opaque white with strong saturated blur
                  // so it pops cleanly against whatever hue the rotating wash is currently at.
                  background: "rgba(255, 255, 255, 0.94)",
                  backdropFilter: "blur(14px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(14px) saturate(1.4)",
                  /* White on a very pale wash has no edge, so a short message
                     read as text floating on the panel rather than as
                     something the doctor said. A shadow seats it. One or the
                     other, never both: a stroke and a shadow together draw the
                     same edge twice and the bubble starts looking like a
                     card. */
                  boxShadow: "0 1px 2px rgba(23, 23, 37, 0.05), 0 6px 16px -8px rgba(103, 58, 172, 0.22)",
                }}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            ) : null}

          {/* Hover action icons */}
          {/* Hidden until the message is hovered, so a long thread is not a
              wall of icons, but also shown whenever focus is inside the
              message: a keyboard user tabbing through must be able to see
              what they have landed on. Each target is 24px with its own hover
              fill, where it was a bare 16px glyph. */}
          {message.text && (
            <div
              className={cn(
                "flex items-center gap-[2px] transition-opacity duration-[var(--copilot-dur-state)] motion-reduce:transition-none",
                isTouch ? "opacity-80" : "opacity-0 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100",
              )}
            >
              <ActionableTooltip
                label="Copy to clipboard"
                onAction={() => _optionalChain([navigator, 'access', _39 => _39.clipboard, 'optionalAccess', _40 => _40.writeText, 'call', _41 => _41(message.text)])}
              >
                <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] transition-colors duration-[var(--copilot-dur-state)] hover:bg-tp-slate-100">
                  <CopyIcon onClick={() => _optionalChain([navigator, 'access', _42 => _42.clipboard, 'optionalAccess', _43 => _43.writeText, 'call', _44 => _44(message.text)])} className="!text-tp-slate-500 hover:!text-tp-slate-700" />
                </span>
              </ActionableTooltip>
              {message.voiceTranscript ? (
                /* Same action as the Rx pad: add to this consultation by voice. */
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("voicerx:begin-addon"))}
                  className="flex h-[16px] w-[16px] items-center justify-center text-tp-slate-400 transition-colors hover:text-tp-slate-600"
                  title="Edit/VoiceRx"
                  aria-label="Edit/VoiceRx"
                >
                  <VoiceRxIcon size={14} color="currentColor" />
                </button>
              ) : onEditMessage && (
                <button
                  type="button"
                  onClick={() => { setEditText(message.text); setIsEditing(true) }}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] text-tp-slate-500 transition-colors duration-[var(--copilot-dur-state)] hover:bg-tp-slate-100 hover:text-tp-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
                  title="Edit and ask again"
                  aria-label="Edit and ask again"
                >
                  <CopilotIcon name="edit-2" variant="bulk" size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        </div>
        )}
      </div>
    )
  }

  // ---- ASSISTANT layout ----
  return (
    <div className="group/msg flex w-full justify-start">
      <div className="flex w-full flex-col items-start">
        {/* Top row: AI icon + text (typewriter reveal for new messages) */}
        {message.text && (
          <div
            className={cn(
              "flex gap-[6px]",
              aiTextMultiLine ? "items-start" : "items-center",
            )}
          >
            {/* The published spark asset, as the Dr. Agent reference uses it.
                Centered with the first line when the reply is single-line,
                top-aligned when it wraps. */}
            <VeloraSpark
              size={22}
              className={cn(
                "pointer-events-none select-none shrink-0",
                aiTextMultiLine && "mt-[1px]",
              )}
            />

            {/* Plain text with streaming reveal */}
            <p
              ref={aiTextRef}
              className="text-[14px] leading-[18px] text-tp-slate-700 whitespace-pre-wrap break-words"
            >
              {renderAssistantMarkdown(shouldStream ? displayText : message.text, onPillTap)}
              {shouldStream && !textDone && <span className="inline-block w-[2px] h-[14px] bg-tp-violet-400 ml-[1px] align-middle animate-pulse" />}
            </p>
          </div>
        )}

        {/* If there is no text but we have a card, still show the icon row */}
        {!message.text && message.rxOutput && (
          <div className="flex items-start gap-[6px]">
            <VeloraSpark
              size={22}
              className="pointer-events-none select-none mt-[1px] shrink-0"
            />
          </div>
        )}

        {/* Card output -- offset to align under text (22px icon + 6px gap + 2px optical) */}
        {/* Phased reveal: card slides in after text finishes streaming */}
        {message.rxOutput && (
          <div
            /* 240ms on opacity and transform only, the top of the house
               range: long enough to read as "the answer arrived", short
               enough not to hold the doctor up. With reduced motion it simply
               appears. */
            className={cn(
              "ml-[30px] mt-[8px] w-[calc(100%-30px)] transition-[opacity,transform] duration-[var(--copilot-dur-enter)] ease-out motion-reduce:transition-none",
              cardRevealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-[6px] motion-reduce:translate-y-0",
            )}
          >
            {/* A streaming card mounts when its turn comes, so the rows and
                text it writes in are seen being written, not finished behind
                the fade. */}
            {(cardRevealed || !shouldStream) && (
            <CardStreamContext.Provider value={!isUser && arrivedNow}>
            <CardRenderer
              output={message.rxOutput}
              onPillTap={onPillTap}
              onCopy={onCopy}
              onSidebarNav={onSidebarNav}
              activeSpecialty={activeSpecialty}
              onPatientSelect={onPatientSelect}
            />
            </CardStreamContext.Provider>
            )}
          </div>
        )}

        {/* Inline suggestion pills, only under "situation at a glance"; other replies use sticky chips above input */}
        {/* Under "situation at a glance", and under live Copilot answers,
            which carry the chart's remaining starter questions. */}
        {message.role === "assistant" && (isSituationAtGlanceAssistantMessage(message) || !!message.suggestions) && message.suggestions && message.suggestions.length > 0 && (
          /* Next questions, one tap each. Labelled, because a row of pills
             under an answer does not on its own say "tap to ask this".
             Wrapped rather than scrolled sideways: a pill hidden past the
             edge is a question the doctor never learns they could ask. Solid
             the AI gradient at a regular weight, the same as every other
             suggestion chip, with stops deep enough to stay readable. */
          <div className="ml-[30px] mt-[10px] w-[calc(100%-30px)]">
            <p className="m-0 mb-[6px] text-[11.5px] font-medium text-tp-slate-500">You can also ask</p>
            <div className="flex flex-wrap gap-[6px]">
              {message.suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => _optionalChain([onPillTap, 'optionalCall', _45 => _45(s.message)])}
                  className={cn(
                    "max-w-full rounded-full border-[1px] border-tp-violet-200 bg-tp-violet-50 px-[12px] py-[6px] text-left text-[12.5px] font-normal leading-[16px]",
                    "transition-[background-color,border-color,transform] duration-[var(--copilot-dur-state)] ease-out hover:border-tp-violet-300 hover:bg-tp-violet-100 active:scale-[0.97]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
                    "motion-reduce:transition-none motion-reduce:active:scale-100",
                  )}
                >
                  <span className="copilot-grad-text">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback row — thumbs up/down + source provenance */}
        <div className="ml-[30px] mt-[2px] flex items-center gap-[6px]">
          {onFeedback ? (
            <FeedbackRow
              messageId={message.id}
              initialFeedback={message.feedbackGiven}
              onFeedback={onFeedback}
            />
          ) : null}

          {/* Completeness ring + divider + source tag */}
          {(() => {
            const output = message.rxOutput
            if (!output) return null

            const completeness = getCompletenessForOutput(output)
            const sources = getSourcesForOutput(output, patientDocuments)

            return (
              <>
                {/* Completeness ring */}
                {completeness && (
                  <>
                    <div
                      className="h-[12px] w-[1px] flex-shrink-0"
                      style={{
                        background: "linear-gradient(180deg, transparent 0%, rgba(148,163,184,0.25) 50%, transparent 100%)",
                      }}
                    />
                    <DataCompletenessDonut
                      emr={completeness.emr}
                      ai={completeness.ai}
                      missing={completeness.missing}
                      size="sm"
                    />
                  </>
                )}

                {/* Source dropdown */}
                {sources && (
                  <>
                    <div
                      className="h-[12px] w-[1px] flex-shrink-0"
                      style={{
                        background: "linear-gradient(180deg, transparent 0%, rgba(148,163,184,0.25) 50%, transparent 100%)",
                      }}
                    />
                    <SourceDropdown
                      isOpen={sourceOpen}
                      onToggle={() => setSourceOpen(v => !v)}
                      sources={sources}
                    />
                  </>
                )}
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
