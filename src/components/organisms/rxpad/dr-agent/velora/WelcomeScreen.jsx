"use client";
import React from "react"
import { cn } from "@/src/hooks/utils"
import {
  Calendar2, DocumentText, Receipt1,
  Heart, StatusUp, MessageQuestion,
  ClipboardText, Activity, Hospital,
  Health, SearchStatus, Clock,
} from "iconsax-reactjs"

/**
 * WelcomeScreen — ChatGPT-style intro screen for Dr. Agent.
 *
 * Shown when the chat is empty (no messages sent yet).
 * Disappears on first message or canned action click.
 *
 * Content adapts to the current page context:
 * - Homepage: clinic-wide suggestions
 * - RxPad: prescription-focused suggestions
 * - Patient Detail: patient-specific suggestions
 * - Billing: billing-focused suggestions
 */

 

const ICON_SIZE = 18

const CONTEXT_ACTIONS = {
  homepage: [
    {
      icon: <Heart size={ICON_SIZE} variant="Bulk" />,
      title: "Follow-up Dues",
      subtitle: "View overdue and pending follow-ups that need your attention today",
      message: "Follow-up dues today",
    },
    {
      icon: <StatusUp size={ICON_SIZE} variant="Bulk" />,
      title: "Weekly KPIs",
      subtitle: "Compare this week's clinic performance against your previous week",
      message: "Weekly KPI dashboard",
    },
    {
      icon: <Receipt1 size={ICON_SIZE} variant="Bulk" />,
      title: "Today's Collection",
      subtitle: "Get a quick summary of billing, advances, and outstanding dues",
      message: "Today's collection",
    },
    {
      icon: <Activity size={ICON_SIZE} variant="Bulk" />,
      title: "Chronic Conditions",
      subtitle: "See distribution of DM, HTN, and other chronic conditions in your clinic",
      message: "Condition distribution",
    },
  ],
  // RxPad actions are built dynamically — see buildRxPadActions()
  rxpad: [],
  patient_detail: [
    {
      icon: <DocumentText size={ICON_SIZE} variant="Bulk" />,
      title: "Patient Summary",
      subtitle: "Get a complete clinical overview including vitals, labs, and history",
      message: "Patient summary",
    },
    {
      icon: <Activity size={ICON_SIZE} variant="Bulk" />,
      title: "Vital Trends",
      subtitle: "Track blood pressure, weight, and SpO2 trends over recent visits",
      message: "Vital trends",
    },
    {
      icon: <ClipboardText size={ICON_SIZE} variant="Bulk" />,
      title: "Lab Results",
      subtitle: "Review recent lab values and flagged abnormal parameters",
      message: "Labs flagged",
    },
    {
      icon: <Calendar2 size={ICON_SIZE} variant="Bulk" />,
      title: "Last Visit",
      subtitle: "View the previous visit summary, prescriptions, and follow-up notes",
      message: "Last visit details",
    },
  ],
  billing: [
    {
      icon: <Receipt1 size={ICON_SIZE} variant="Bulk" />,
      title: "Today's Billing",
      subtitle: "View today's revenue collection and outstanding payment summary",
      message: "Show today's billing summary",
    },
    {
      icon: <StatusUp size={ICON_SIZE} variant="Bulk" />,
      title: "Revenue Trends",
      subtitle: "Compare weekly and monthly revenue to spot growth patterns",
      message: "Show revenue trends this week",
    },
    {
      icon: <Hospital size={ICON_SIZE} variant="Bulk" />,
      title: "Pending Dues",
      subtitle: "See patients with outstanding balances that need follow-up",
      message: "Show patients with pending dues",
    },
    {
      icon: <MessageQuestion size={ICON_SIZE} variant="Bulk" />,
      title: "Generate Invoice",
      subtitle: "Create and send a new invoice for a specific patient visit",
      message: "Help me generate an invoice",
    },
  ],
  default: [
    {
      icon: <Health size={ICON_SIZE} variant="Bulk" />,
      title: "Patient Summary",
      subtitle: "Get a complete clinical overview of the selected patient's history",
      message: "Show me this patient's summary",
    },
    {
      icon: <SearchStatus size={ICON_SIZE} variant="Bulk" />,
      title: "Lab Results",
      subtitle: "Review recent investigation reports and flagged abnormal values",
      message: "Show recent lab results",
    },
    {
      icon: <Calendar2 size={ICON_SIZE} variant="Bulk" />,
      title: "Today's Schedule",
      subtitle: "View today's appointment list and upcoming patient queue",
      message: "Show today's schedule",
    },
    {
      icon: <MessageQuestion size={ICON_SIZE} variant="Bulk" />,
      title: "Ask Anything",
      subtitle: "Ask clinical questions, guidelines, or anything about your practice",
      message: "What clinical guidelines apply here?",
    },
  ],
}

/**
 * ═══════════════════════════════════════════════════════════════
 * PATIENT CANNED ACTIONS — Smart Priority System
 * ═══════════════════════════════════════════════════════════════
 *
 * 5 candidate cards, pick best 4 based on available patient data:
 *
 *   1. INTAKE    — "Reported by patient"         (only if symptom collector data exists)
 *   2. SUMMARY   — "Patient summary"            (always available)
 *   3. HISTORY   — "Medical history"            (past visits, prescriptions)
 *   4. SPECIALTY — Specialty-specific history    (obstetric / gynec / pediatric / ophthal)
 *   5. VITALS    — "Vital trends"               (fallback when a slot is empty)
 *
 * Priority rules:
 *   WITH intake + WITH specialty → intake, summary, history, specialty
 *   WITH intake + NO specialty  → intake, summary, history, vitals
 *   NO intake + WITH specialty  → summary, history, specialty, vitals
 *   NO intake + NO specialty    → summary, history, vitals, past visit details
 *
 * This logic is shared between V0 and non-V0 panels.
 * ═══════════════════════════════════════════════════════════════
 */

// Individual action definitions for dynamic composition
const PATIENT_ACTION_INTAKE = {
  icon: <ClipboardText size={ICON_SIZE} variant="Bulk" />,
  title: "Reported by patient",
  subtitle: "Symptoms & history shared before the visit",
  message: "Show reported intake",
}
const PATIENT_ACTION_SUMMARY = {
  icon: <DocumentText size={ICON_SIZE} variant="Bulk" />,
  title: "Patient summary",
  subtitle: "Clinical overview with vitals, labs, and history",
  message: "Patient summary",
}
const PATIENT_ACTION_HISTORY = {
  icon: <Clock size={ICON_SIZE} variant="Bulk" />,
  title: "Medical history",
  subtitle: "Past visits, prescriptions, and treatment history",
  message: "Medical history",
}
const PATIENT_ACTION_VITALS = {
  icon: <Activity size={ICON_SIZE} variant="Bulk" />,
  title: "Today's vitals",
  subtitle: "View today's recorded vital parameters at a glance",
  message: "Today's vitals",
}
const PATIENT_ACTION_PAST_VISITS = {
  icon: <Calendar2 size={ICON_SIZE} variant="Bulk" />,
  title: "Past visit details",
  subtitle: "Previous visit prescriptions, follow-ups, and notes",
  message: "Last visit details",
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

function buildPatientActions(summary) {
  if (!summary) {
    // No summary data — show generic actions
    return [PATIENT_ACTION_SUMMARY, PATIENT_ACTION_HISTORY, PATIENT_ACTION_VITALS, PATIENT_ACTION_PAST_VISITS]
  }

  const hasIntake = !!summary.symptomCollectorData
  const specialtyAction = getSpecialtyAction(summary)

  if (hasIntake && specialtyAction) {
    return [PATIENT_ACTION_INTAKE, PATIENT_ACTION_SUMMARY, PATIENT_ACTION_HISTORY, specialtyAction]
  }
  if (hasIntake && !specialtyAction) {
    return [PATIENT_ACTION_INTAKE, PATIENT_ACTION_SUMMARY, PATIENT_ACTION_HISTORY, PATIENT_ACTION_VITALS]
  }
  if (!hasIntake && specialtyAction) {
    return [PATIENT_ACTION_SUMMARY, PATIENT_ACTION_HISTORY, specialtyAction, PATIENT_ACTION_VITALS]
  }
  // No intake, no specialty
  return [PATIENT_ACTION_SUMMARY, PATIENT_ACTION_HISTORY, PATIENT_ACTION_VITALS, PATIENT_ACTION_PAST_VISITS]
}

/* The question picks its own icon, so the dock only has to pass text. */
const SUGGESTION_ICONS = [
  [/prescription|prescribed/i, <DocumentText key="suggestion-1" size={ICON_SIZE} variant="Bulk" />],
  [/medicat|drug|tablet|dose/i, <ClipboardText key="suggestion-2" size={ICON_SIZE} variant="Bulk" />],
  [/pressure|vital|pulse|weight|temperature/i, <Activity key="suggestion-3" size={ICON_SIZE} variant="Bulk" />],
  [/lab|result|investigation/i, <SearchStatus key="suggestion-4" size={ICON_SIZE} variant="Bulk" />],
  [/chang|since|recent|history|timeline/i, <Clock key="suggestion-5" size={ICON_SIZE} variant="Bulk" />],
  [/allerg|reaction/i, <Health key="suggestion-6" size={ICON_SIZE} variant="Bulk" />],
  [/condition|diagnos|problem/i, <Health key="suggestion-7" size={ICON_SIZE} variant="Bulk" />],
  [/advice|advis|follow.?up/i, <MessageQuestion key="suggestion-8" size={ICON_SIZE} variant="Bulk" />],
]

/**
 * A starter prompt is the question and nothing else.
 *
 * The icon and the subtitle were both restating what the question already
 * said, and on a phone they turned four one-line prompts into four blocks. The
 * question is short, specific and the thing being clicked; it can stand alone.
 */
/**
 * Short on the chip, full in the thread.
 *
 * The chip carries at most six words so it holds one line and reads as one
 * thing to press; pressing it sends the question in full, which is what the
 * doctor then sees as their own message. The long form is also the one that
 * was run against the index, so it is the one that must be sent.
 */
function iconForPrompt(text) {
  const match = SUGGESTION_ICONS.find(([pattern]) => pattern.test(text))
  return match ? match[1] : <MessageQuestion size={ICON_SIZE} variant="Bulk" />
}

function toSuggestionAction(prompt) {
  if (typeof prompt === "string") return { title: prompt, message: prompt, icon: iconForPrompt(prompt) }
  const title = prompt.short || prompt.label
  return {
    title,
    /* The fuller wording, for rows with the width to carry it. */
    titleWide: prompt.wide || title,
    message: prompt.label,
    icon: iconForPrompt(`${title} ${prompt.label}`),
  }
}

/**
 * Which four offers this screen makes.
 *
 * Parent-supplied override wins (used by Velora for scenario-specific entry
 * cards). Otherwise: patient context picks 4 from the smart-priority list;
 * others use a preset.
 *
 * When the archive is answering, the four offers carry the questions
 * themselves rather than descriptions of features, because the doctor is about
 * to search a record, not pick a tool.
 */
export function resolveWelcomeActions({ context = "default", summary, actionsOverride, suggestions } = {}) {
  /* A supplied list is the answer even when it is empty. Falling through
     would put the bundled feature cards - built from demo patient data - in
     front of a real chart. */
  if (Array.isArray(suggestions)) return suggestions.map(toSuggestionAction)
  if (actionsOverride) return actionsOverride
  if (context === "rxpad" || context === "patient_detail") return buildPatientActions(summary)
  return _nullishCoalesce(CONTEXT_ACTIONS[context], () => ( CONTEXT_ACTIONS.default))
}

/**
 * The four offers as tags, for use under the composer.
 *
 * Above the input they competed with it: the doctor read four cards and never
 * looked at the field they were meant to be examples for. Below it they read
 * as what they are - four ways to fill the box that is already the focus.
 */
/**
 * `layout` decides the shape, because wrapping cannot be trusted to.
 *
 * Left to `flex-wrap`, four chips of uneven length came out three-then-one,
 * which reads as a mistake rather than a set. So the caller says which shape
 * its width can hold:
 *
 *   "row"   - one line (the page's top bar, which has the width for it)
 *   "grid"  - two by two (the popup)
 *   "stack" - two by two, tightened (the 384px rail)
 *
 * The rail is two by two as well, not a four-high ladder: stacked, the chips
 * ate the vertical room the greeting and the field need, and four full-width
 * pills read as a menu. They fit two to a line at a smaller size, which is
 * what `compact` buys.
 */
export function WelcomePrompts({ actions, onActionClick, layout = "row", className = "" }) {
  if (!actions || !actions.length) return null

  /* `w-max` with `1fr` columns is what makes all four the same width without
     naming one. In an intrinsically-sized grid an `fr` column resolves to the
     largest max-content contribution in the track, so the columns come out
     equal to the widest chip and the block ends where that chip ends - no
     stretching to a measure nobody's label reaches, and no dead space on the
     right. */
  const shape =
    layout === "grid"
      ? "grid w-max max-w-full grid-cols-2 gap-[8px] justify-items-stretch"
      : layout === "stack"
        ? "grid w-max max-w-full grid-cols-2 gap-[6px] justify-items-stretch"
        : "flex flex-nowrap items-center justify-center gap-[8px] max-w-full overflow-x-auto"

  return (
    <>
    <WelcomeIconDefs />
    <div
      className={`copilot-prompt-row relative z-[1] mx-auto ${shape} ${className}`.trim()}
      data-compact={layout === "stack" ? "true" : undefined}
    >
      {actions.map((action, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onActionClick(action.message)}
          /* Left-aligned, not centred. A stretched chip centres its label in
             whatever width the grid gave it, so four of them put their text at
             four different x positions and the column stops reading as a
             column. Where the chip hugs its content - the top bar's row - the
             two are the same thing. */
          className="welcome-prompt-tag group relative overflow-hidden inline-flex min-w-0 shrink-0 items-center justify-start gap-[6px] text-left"
          style={{
            borderRadius: 999,
            padding: "6px 11px",
            /* The reference card's surface, at a chip's scale: a whisper-light
               fill and a translucent white stroke, so it reads as a distinct
               surface against the rotating wash behind it rather than as a
               grey outline drawn on top of it. */
            background: "rgba(255,255,255,0.55)",
            /* The reference card's translucent white stroke disappears on a
               pale ground, which left the chips edgeless. The faintest violet
               that still draws a line. */
            border: "1px solid rgba(103, 58, 172, 0.12)",
          }}
        >
          {/* The same animated AI gradient the welcome cards carry, at the
              same 6%. A CSS gradient standing in for it was never going to
              match - this is the artwork itself, and it is already in the
              panel's own background, so the chips and the surface behind them
              move together. */}
          <span
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundImage: "url(/icons/dr-agent/chat-bg.gif)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.06,
              borderRadius: 999,
            }}
          />

          {action.icon && (
            <span className="relative z-[1] flex-shrink-0 welcome-icon-grad welcome-tag-icon" style={{ opacity: 0.85 }}>
              {action.icon}
            </span>
          )}
          <span
            className="relative z-[1] truncate whitespace-nowrap text-[12px] font-medium leading-[16px]"
            style={{ color: "var(--tp-slate-700, #454551)" }}
          >
            {layout === "grid" && action.titleWide ? action.titleWide : action.title}
          </span>
        </button>
      ))}
    </div>
    </>
  )
}

/**
 * The gradient the tag and card icons are filled with, plus their motion.
 *
 * Rendered by whoever draws them rather than by the welcome screen alone: the
 * same tags now sit in the page's own top bar, where the screen's defs are not
 * in the document. An `url(#id)` fill with no matching def paints nothing, so
 * the def has to travel with the icons.
 */
function WelcomeIconDefs() {
  return (
    <>
      <style>{`
        .welcome-icon-grad svg { color: #8B5CF6; }
        .welcome-icon-grad svg path,
        .welcome-icon-grad svg circle,
        .welcome-icon-grad svg rect {
          fill: url(#welcomeIconGrad);
        }
        .welcome-tag-icon svg { width: 14px; height: 14px; }
        /* Same motion as the cards it came from. */
        .welcome-prompt-tag {
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .welcome-prompt-tag:hover {
          transform: translateY(-1px) scale(1.01);
          background: rgba(255, 255, 255, 0.72) !important;
        }
        .welcome-prompt-tag:active {
          transform: translateY(0) scale(0.99);
        }
      `}</style>
      <svg width={0} height={0} className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="welcomeIconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BE6DCF" />
            <stop offset="100%" stopColor="#5351BD" />
          </linearGradient>
        </defs>
      </svg>
    </>
  )
}

export function WelcomeScreen({
  context = "default",
  doctorName,
  lastSyncedAt,
  patientName,
  hasIntake = false,
  summary,
  actionsOverride,
  suggestions,
  /* Four cards in two columns took most of an empty panel to say four short
     things. As a single row of tags they cost one line, which leaves the
     field below them as the largest thing on the screen. */
  promptsAsTags = false,
  /* "grid" in the popup, "stack" in the rail - see WelcomePrompts. */
  promptsLayout = "grid",
  onActionClick,
}) {
  const actions = resolveWelcomeActions({ context, summary, actionsOverride, suggestions })
  const greeting = getGreeting()
  const displayName = doctorName ? `Dr. ${doctorName.split(" ")[0]}` : "Doctor"
  const isPatientContext = context === "rxpad" || context === "patient_detail"

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-[12px] py-[14px]">
      {/* Transparent — the panel's rotating AI wash is the only background. No white overlay here. */}

      {/* Spark icon — 44px tile with animated gradient GIF underlay + rotating white spark overlay. */}
      <div className="relative z-[1] mb-[12px]">
        <span
          className="pointer-events-none select-none relative inline-flex items-center justify-center overflow-hidden"
          style={{ width: 44, height: 44, borderRadius: 44 * 0.24 }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-white" style={{ borderRadius: 44 * 0.24 }} />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/icons/dr-agent/chat-bg.gif)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: 44 * 0.24,
              opacity: 0.3,
            }}
          />
          <img
            src="/icons/dr-agent/agent-spark.svg"
            width={44 * 0.75}
            height={44 * 0.75}
            alt=""
            className="relative z-10 welcome-spark-rotate"
            draggable={false}
          />
        </span>
      </div>

      {/* Greeting — the first line of the block, so it carries the weight. */}
      <h2 className="relative z-[1] text-[22px] font-semibold text-tp-slate-800 text-center leading-[28px]">
        {greeting}, {displayName}!
      </h2>
      {/* Subtitle — short single-line focal copy so it never wraps in a 350-400px panel. */}
      <p className="relative z-[1] mt-[5px] whitespace-nowrap text-[15px] text-center leading-[20px]" style={{ color: "var(--tp-slate-400, #A2A2A8)" }}>
        {isPatientContext && patientName ? (
          <>Ask anything about <span className="font-semibold" style={{ color: "var(--tp-slate-500, #717179)" }}>{patientName.split(" ")[0]}</span> today</>
        ) : context === "homepage" ? (
          <>Ask anything about your <span className="font-semibold" style={{ color: "var(--tp-slate-500, #717179)" }}>clinic</span> today</>
        ) : context === "billing" ? (
          <>Ask anything about <span className="font-semibold" style={{ color: "var(--tp-slate-500, #717179)" }}>billing</span> today</>
        ) : (
          <>Ask anything about your <span className="font-semibold" style={{ color: "var(--tp-slate-500, #717179)" }}>practice</span> today</>
        )}
      </p>

      {lastSyncedAt && (
        <p className="relative z-[1] mt-[8px] flex items-center justify-center gap-[5px] text-[11px] text-tp-slate-400">
          <Clock size={12} /> Last synced
          <time dateTime={lastSyncedAt}>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(lastSyncedAt))} IST</time>
        </p>
      )}

      {/* Three across, centred, held to a readable measure.

          Stacked-icon cards in two columns took most of an empty popup for six
          short questions. Moving the icon beside the text halves the height,
          and three columns halves it again - the prompts are a starting point,
          not the screen. Two columns below 640px, where three would wrap. */}
      {promptsAsTags ? (
        <WelcomePrompts
          className="mt-[18px]"
          layout={promptsLayout}
          actions={actions}
          onActionClick={onActionClick}
        />
      ) : (
      <div className="relative z-[1] mt-[16px] grid w-full max-w-[560px] grid-cols-1 gap-[8px] sm:grid-cols-2">
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onActionClick(action.message)}
            className="welcome-canned-card group relative flex items-start gap-[9px] text-left transition-all overflow-hidden"
            style={{
              borderRadius: 12,
              padding: "11px 13px",
              /* Neutral. Four tinted cards stacked under a tinted panel turned
                 the whole popup pink; the brand colour is carried by the spark
                 and the composer's glow, which is enough. */
              background: "rgba(255,255,255,0.72)",
              border: "1px solid var(--tp-slate-200, #E2E2EA)",
            }}
          >

            {action.icon && (
              <span
                className="relative z-[1] mt-[1px] flex-shrink-0 welcome-icon-grad"
                style={{ opacity: 0.85 }}
              >
                {action.icon}
              </span>
            )}

            <span className="relative z-[1] flex min-w-0 flex-col">
              <span
                className="truncate whitespace-nowrap text-[12.5px] font-medium leading-[16px]"
                style={{ color: "var(--tp-slate-700, #454551)" }}
              >
                {action.title}
              </span>

              {action.subtitle && (
                <span className="mt-[3px] text-[10.5px] font-normal leading-[14px] welcome-card-subtitle" style={{ color: "var(--tp-slate-400, #A2A2A8)" }}>
                  {action.subtitle}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      )}

      {/* Gradient color for welcome card icons + spark rotation + hover/active card effects */}
      <style>{`
        .welcome-icon-grad svg { color: #8B5CF6; }
        .welcome-icon-grad svg path,
        .welcome-icon-grad svg circle,
        .welcome-icon-grad svg rect {
          fill: url(#welcomeIconGrad);
        }
        .welcome-card-subtitle {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .copilot-prompt-row {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .copilot-prompt-row::-webkit-scrollbar { display: none; }
        /* Two to a line in 384px only fits at a smaller size. */
        .copilot-prompt-row[data-compact="true"] .welcome-prompt-tag {
          padding: 5px 8px !important;
          gap: 5px !important;
        }
        .copilot-prompt-row[data-compact="true"] .welcome-prompt-tag span:last-child {
          font-size: 11px;
          letter-spacing: -0.1px;
        }
        .copilot-prompt-row[data-compact="true"] .welcome-tag-icon svg {
          width: 13px;
          height: 13px;
        }
        .welcome-tag-icon svg { width: 14px; height: 14px; }
        .welcome-prompt-tag {
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }
        .welcome-prompt-tag:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.92) !important;
          border-color: var(--tp-slate-300, #D0D5DD) !important;
        }
        .welcome-prompt-tag:active {
          transform: translateY(0);
        }
        .welcome-canned-card {
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .welcome-canned-card:hover {
          transform: translateY(-1px) scale(1.01);
        }
        .welcome-canned-card:active {
          transform: translateY(0) scale(0.99);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
        }
        @keyframes welcomeSparkRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .welcome-spark-rotate {
          animation: welcomeSparkRotate 16s linear infinite;
        }
      `}</style>
      <svg width={0} height={0} className="absolute">
        <defs>
          <linearGradient id="welcomeIconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BE6DCF" />
            <stop offset="100%" stopColor="#5351BD" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
