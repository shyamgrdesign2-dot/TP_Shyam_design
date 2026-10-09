import { chartLabelOf, firstNameOf } from "../shared/patientName"
import React from "react"
import { cn } from "../../dr-agent/utils"
import { CopilotIcon } from "../ui/CopilotIcon"
import { hospitalGroupLabel, useHospitalGroup } from "../surfaces/copilotScopeStore"

/**
 * WelcomeScreen: the intro screen for Velora.
 *
 * Shown when the chat is empty (no messages sent yet).
 * Disappears on first message or canned action click.
 *
 * It has three jobs, in this order, and each one gets one line:
 *
 *   1. Say what is being searched, and be the way to change it. The scope
 *      sentence carries the scope as a control (ScopeWord), because before
 *      the first question nothing else on screen says whose record will be
 *      read except a chip in the corner.
 *   2. Say what to do here. A short label over the starter chips names the
 *      action in this scope: ask about the chart, or find patients.
 *   3. Offer examples of exactly that. The chips are real questions the
 *      service answers in this scope, and pressing one sends it.
 *
 * Content adapts to the current page context:
 * - Homepage: hospital-wide scope (find patients)
 * - RxPad / Patient Detail: one patient's chart
 * - Billing: billing-focused suggestions
 */

const ICON_SIZE = 18

/**
 * Icons are Tesseract tokens, drawn linear: these are offers at rest, and
 * bulk is kept for the selected state. Stored as names rather than elements
 * so each surface draws them at its own size (a card wants 18, a chip 14, the
 * rail's compact chip 13) instead of shrinking an element with CSS.
 */
const CONTEXT_ACTIONS = {
  homepage: [
    {
      iconName: "calendar-tick",
      title: "Follow-up Dues",
      subtitle: "View overdue and pending follow-ups that need your attention today",
      message: "Follow-up dues today",
    },
    {
      iconName: "status-up",
      title: "Weekly KPIs",
      subtitle: "Compare this week's clinic performance against your previous week",
      message: "Weekly KPI dashboard",
    },
    {
      iconName: "receipt-search",
      title: "Today's Collection",
      subtitle: "Get a quick summary of billing, advances, and outstanding dues",
      message: "Today's collection",
    },
    {
      iconName: "health-condition",
      title: "Chronic Conditions",
      subtitle: "See distribution of DM, HTN, and other chronic conditions in your clinic",
      message: "Condition distribution",
    },
  ],
  // RxPad actions are built dynamically: see buildPatientActions()
  rxpad: [],
  patient_detail: [
    {
      iconName: "medical-record",
      title: "Patient Summary",
      subtitle: "Get a complete clinical overview including vitals, labs, and history",
      message: "Patient summary",
    },
    {
      iconName: "heart-rate",
      title: "Vital Trends",
      subtitle: "Track blood pressure, weight, and SpO2 trends over recent visits",
      message: "Vital trends",
    },
    {
      iconName: "test-tube",
      title: "Lab Results",
      subtitle: "Review recent lab values and flagged abnormal parameters",
      message: "Labs flagged",
    },
    {
      iconName: "calendar-2",
      title: "Last Visit",
      subtitle: "View the previous visit summary, prescriptions, and follow-up notes",
      message: "Last visit details",
    },
  ],
  billing: [
    {
      iconName: "receipt-search",
      title: "Today's Billing",
      subtitle: "View today's revenue collection and outstanding payment summary",
      message: "Show today's billing summary",
    },
    {
      iconName: "status-up",
      title: "Revenue Trends",
      subtitle: "Compare weekly and monthly revenue to spot growth patterns",
      message: "Show revenue trends this week",
    },
    {
      iconName: "hospital-3",
      title: "Pending Dues",
      subtitle: "See patients with outstanding balances that need follow-up",
      message: "Show patients with pending dues",
    },
    {
      iconName: "message-question",
      title: "Generate Invoice",
      subtitle: "Create and send a new invoice for a specific patient visit",
      message: "Help me generate an invoice",
    },
  ],
  default: [
    {
      iconName: "medical-record",
      title: "Patient Summary",
      subtitle: "Get a complete clinical overview of the selected patient's history",
      message: "Show me this patient's summary",
    },
    {
      iconName: "test-tube",
      title: "Lab Results",
      subtitle: "Review recent investigation reports and flagged abnormal values",
      message: "Show recent lab results",
    },
    {
      iconName: "calendar-2",
      title: "Today's Schedule",
      subtitle: "View today's appointment list and upcoming patient queue",
      message: "Show today's schedule",
    },
    {
      iconName: "message-question",
      title: "Ask Anything",
      subtitle: "Ask clinical questions, guidelines, or anything about your practice",
      message: "What clinical guidelines apply here?",
    },
  ],
}

/**
 * ═══════════════════════════════════════════════════════════════
 * PATIENT CANNED ACTIONS: Smart Priority System
 * ═══════════════════════════════════════════════════════════════
 *
 * 5 candidate cards, pick best 4 based on available patient data:
 *
 *   1. INTAKE    : "Reported by patient"        (only if symptom collector data exists)
 *   2. SUMMARY   : "Patient summary"            (always available)
 *   3. HISTORY   : "Medical history"            (past visits, prescriptions)
 *   4. SPECIALTY : Specialty-specific history   (obstetric / gynec / pediatric / ophthal)
 *   5. VITALS    : "Vital trends"               (fallback when a slot is empty)
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
  iconName: "clipboard-text",
  title: "Reported by patient",
  subtitle: "Symptoms & history shared before the visit",
  message: "Show reported intake",
}
const PATIENT_ACTION_SUMMARY = {
  iconName: "medical-record",
  title: "Patient summary",
  subtitle: "Clinical overview with vitals, labs, and history",
  message: "Patient summary",
}
const PATIENT_ACTION_HISTORY = {
  iconName: "calendar-2",
  title: "Medical history",
  subtitle: "Past visits, prescriptions, and treatment history",
  message: "Medical history",
}
const PATIENT_ACTION_VITALS = {
  iconName: "heart-rate",
  title: "Today's vitals",
  subtitle: "View today's recorded vital parameters at a glance",
  message: "Today's vitals",
}
const PATIENT_ACTION_PAST_VISITS = {
  iconName: "calendar-search",
  title: "Past visit details",
  subtitle: "Previous visit prescriptions, follow-ups, and notes",
  message: "Last visit details",
}

function getSpecialtyAction(summary) {
  if (summary.obstetricData) {
    return {
      iconName: "health-condition",
      title: "Obstetric history",
      subtitle: "ANC schedule, pregnancy parameters, and alerts",
      message: "Obstetric summary",
    }
  }
  if (summary.gynecData) {
    return {
      iconName: "health-condition",
      title: "Gynec history",
      subtitle: "Menstrual cycle, screening, and gynec parameters",
      message: "Gynec summary",
    }
  }
  if (summary.pediatricsData) {
    return {
      iconName: "health-condition",
      title: "Vaccination & growth",
      subtitle: "Growth chart, milestones, and vaccination schedule",
      message: "Growth & vaccines",
    }
  }
  if (summary.ophthalData) {
    return {
      iconName: "health-condition",
      title: "Vision history",
      subtitle: "Visual acuity, IOP, and ophthalmic examination",
      message: "Vision summary",
    }
  }
  return null
}

function buildPatientActions(summary) {
  if (!summary) {
    // No summary data: show generic actions
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

/**
 * The question picks its own icon, so the dock only has to pass text.
 *
 * Order matters: the first pattern that matches wins, so the specific ones
 * come first. "Family history of CAD" is about relatives before it is about
 * history; "latest HbA1c" is a lab before it is anything recent.
 */
const SUGGESTION_ICONS = [
  [/summar|overview/i, "medical-record"],
  [/prescription|prescribed/i, "note-text"],
  [/medicat|medicine|drug|tablet|dose/i, "pill-tablet"],
  [/family/i, "profile-2user"],
  [/hba1c|\blabs?\b|result|investigation|\btests?\b|sugar|glucose|creatinine/i, "test-tube"],
  [/pressure|\bbp\b|vital|pulse|weight|temperature/i, "heart-rate"],
  [/allerg|reaction/i, "heart-protect"],
  [/condition|diagnos|diabetes|disease|problem/i, "health-condition"],
  [/advice|advis|follow.?up/i, "health-talk"],
  [/chang|since|recent|history|timeline|visit/i, "calendar-2"],
  [/find patients|patients with|patients whose/i, "user-search"],
]

/**
 * A starter prompt is the question and nothing else.
 *
 * The subtitle was restating what the question already said, and on a phone
 * it turned four one-line prompts into four blocks. The question is short,
 * specific and the thing being clicked; it can stand alone. The icon stays,
 * small, because it is what lets four chips be told apart at a glance.
 *
 * Short on the chip, full in the thread. The chip carries at most six words
 * so it holds one line and reads as one thing to press; pressing it sends the
 * question in full, which is what the doctor then sees as their own message.
 * The long form is also the one that was run against the index, so it is the
 * one that must be sent.
 */
function iconForPrompt(text) {
  const match = SUGGESTION_ICONS.find(([pattern]) => pattern.test(text))
  return match ? match[1] : "message-question"
}

function toSuggestionAction(prompt) {
  if (typeof prompt === "string") return { title: prompt, message: prompt, iconName: iconForPrompt(prompt) }
  const title = prompt.short || prompt.label
  return {
    title,
    /* The fuller wording, for rows with the width to carry it. */
    titleWide: prompt.wide || title,
    message: prompt.label,
    iconName: iconForPrompt(`${title} ${prompt.label}`),
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
     would put the bundled feature cards (built from demo patient data) in
     front of a real chart. */
  if (Array.isArray(suggestions)) return suggestions.map(toSuggestionAction)
  if (actionsOverride) return actionsOverride
  if (context === "rxpad" || context === "patient_detail") return buildPatientActions(summary)
  return _nullishCoalesce(CONTEXT_ACTIONS[context], () => ( CONTEXT_ACTIONS.default))
}

/**
 * An action's icon at the size its surface asks for. Actions built here carry
 * a Tesseract token; an override from elsewhere may still carry a ready-made
 * element, which is drawn as given.
 */
function ActionIcon({ action, size }) {
  if (action.iconName) {
    return <CopilotIcon name={action.iconName} variant="bulk" size={size} />
  }
  return action.icon || null
}

/**
 * The scope, inside the sentence that announces it.
 *
 * Bold, in violet, with a dotted underline: a word that reads as clickable
 * the way a link does, without a box competing with the prompt pills right
 * below it. Pressing it opens the same context picker as the tag in the
 * header.
 */
function ScopeWord({ children, label, scope, onClick }) {
  const glyph =
    scope === "hospital" ? (
      <CopilotIcon asset="medical/hospital-building-4" variant="bulk" size={14} />
    ) : (
      <CopilotIcon asset="users/user" variant="bulk" size={14} />
    )

  if (!onClick) {
    return (
      <span className="welcome-scope-static">
        <span className="welcome-scope-glyph">{glyph}</span>
        <span>{children}</span>
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      title="Change what Velora answers about"
      aria-label={`Change what Velora answers about. Now: ${label}`}
      /* Keyed on the scope by the caller, so a switch replays the short
         entrance and the change is seen, not just swapped. */
      className="welcome-scope-word"
    >
      <span className="welcome-scope-text">{children}</span>
    </button>
  )
}

/**
 * The four offers as tags, for use under the greeting and in the top bar.
 *
 * Above the input they compete with it less as tags than as cards: the doctor
 * read four cards and never looked at the field they were meant to be
 * examples for. As tags they read as what they are: four ways to fill the box
 * that is already the focus.
 *
 * `layout` decides the shape, because wrapping cannot be trusted to.
 *
 * Left to `flex-wrap`, four chips of uneven length came out three-then-one,
 * which reads as a mistake rather than a set. So the caller says which shape
 * its width can hold:
 *
 *   "row"   - one line (the page's top bar, which has the width for it)
 *   "grid"  - two by two (the popup)
 *   "stack" - two by two, tightened (the narrow sheet)
 *
 * The narrow sheet is two by two as well, not a four-high ladder: stacked, the
 * chips ate the vertical room the greeting and the field need, and four
 * full-width pills read as a menu. They fit two to a line at a smaller size,
 * which is what `compact` buys.
 *
 * Every chip is a real button with a visible hover, press and keyboard focus,
 * and says in its accessible name that pressing it asks the question: the chip
 * sends straight away, and nothing about a pill says so on its own.
 */
export function WelcomePrompts({
  actions,
  onActionClick,
  layout = "row",
  className = "",
  /* Names the group for assistive technology; the welcome screen passes the
     same words it shows above the chips. */
  ariaLabel,
  /* The welcome screen draws the shared styles once for itself; anywhere else
     (the top bar) the chips bring their own. */
  withStyles = true,
}) {
  if (!actions || !actions.length) return null

  /* `w-max` with `1fr` columns is what makes all four the same width without
     naming one. In an intrinsically-sized grid an `fr` column resolves to the
     largest max-content contribution in the track, so the columns come out
     equal to the widest chip and the block ends where that chip ends: no
     stretching to a measure nobody's label reaches, and no dead space on the
     right. */
  const shape =
    layout === "grid"
      ? "grid w-max max-w-full grid-cols-2 gap-[8px] justify-items-stretch"
      : layout === "stack"
        ? "grid w-max max-w-full grid-cols-2 gap-[6px] justify-items-stretch"
        : "flex flex-nowrap items-center justify-center gap-[8px] max-w-full overflow-x-auto"
  const compact = layout === "stack"

  return (
    <>
      {withStyles && <WelcomeStyles />}
      <div
        role="group"
        aria-label={ariaLabel || "Suggested questions"}
        className={`copilot-prompt-row relative z-[1] mx-auto ${shape} ${className}`.trim()}
        data-compact={compact ? "true" : undefined}
        data-layout={layout}
      >
        {actions.map((action, i) => {
          const label = layout === "grid" && action.titleWide ? action.titleWide : action.title
          return (
            <button
              key={i}
              type="button"
              onClick={() => onActionClick(action.message)}
              aria-label={`Ask: ${action.message}`}
              /* The chip shows the short form; the tooltip shows what will
                 actually be sent, so nothing about pressing it is a guess. */
              title={action.message && action.message !== label ? `Ask: ${action.message}` : undefined}
              /* Left-aligned, not centred. A stretched chip centres its label
                 in whatever width the grid gave it, so four of them put their
                 text at four different x positions and the column stops
                 reading as a column. Where the chip hugs its content (the top
                 bar's row) the two are the same thing. */
              className="welcome-prompt-tag group"
              /* A short stagger, so the four arrive as a set rather than a
                 block; replayed when the scope changes, because the caller
                 keys the row on it. */
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* The same animated AI wash the panel carries, at 6%, so the
                  chips and the surface behind them move together. */}
              <span className="welcome-prompt-wash" aria-hidden="true" />

              {(action.iconName || action.icon) && (
                <span className="welcome-tag-icon welcome-icon-grad" aria-hidden="true">
                  <ActionIcon action={action} size={compact ? 14 : 16} />
                </span>
              )}
              <span className="welcome-prompt-label">
                {/* "Patients with" is the frame; what follows is the
                    criterion, set a weight heavier so it is what the eye
                    reads. */}
                {(() => {
                  const m = /^(patients with\s+)(.+)$/i.exec(String(label || ""))
                  return m ? (
                    <>
                      {m[1]}
                      <span className="welcome-prompt-key">{m[2]}</span>
                    </>
                  ) : (
                    label
                  )
                })()}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/**
 * Everything the welcome surfaces need that utilities cannot say: the state
 * styles, the motion, and the gradient that legacy SVG icons (an override's
 * iconsax elements) are filled with.
 *
 * Rendered by whoever draws the chips rather than by the welcome screen alone:
 * the same tags sit in the page's own top bar, where the screen's styles are
 * not in the document. An `url(#id)` fill with no matching def paints nothing,
 * so the def has to travel with the icons.
 *
 * Plain class selectors, and none of these properties are also set by a
 * utility on the same element: the module's utilities are emitted under
 * #dr-copilot-root and would win any tie.
 *
 * Motion is kept to 120-240ms and to transform and opacity, and all of it
 * stops under prefers-reduced-motion: the colour changes that carry hover and
 * press stay, so every state is still visible without movement.
 */
function WelcomeStyles() {
  return (
    <>
      <style>{`
        /* ── Scope token ─────────────────────────────────────────── */
        .welcome-scope-word,
        .welcome-scope-static {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 100%;
          vertical-align: middle;
          white-space: nowrap;
          font: inherit;
          font-weight: 600;
          line-height: 20px;
        }
        /* A word in the sentence, not a control box: bold, in the
           product's violet, with a dotted underline that says "this is
           clickable" the way a link does. It opens the context picker. */
        .welcome-scope-word {
          cursor: pointer;
          margin: 0 1px;
          padding: 0;
          border: 0;
          background: none;
          color: var(--tp-violet-700, #703A9E);
          text-decoration: underline;
          text-decoration-style: dotted;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 4px;
          text-decoration-color: var(--tp-violet-400, #B07FDC);
          transition: color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease),
            text-decoration-color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease);
          animation: welcomeScopeIn var(--copilot-dur-enter, 200ms) var(--copilot-ease-out, ease-out) backwards;
        }
        .welcome-scope-word:hover {
          color: var(--tp-violet-800, #5B2E82);
          text-decoration-color: var(--tp-violet-700, #703A9E);
          text-decoration-style: solid;
        }
        .welcome-scope-word:focus-visible {
          outline: 2px solid var(--copilot-focus-ring-color, #4b4ad5);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .welcome-scope-text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 260px;
        }
        .welcome-scope-glyph,
        .welcome-scope-chevron {
          display: inline-flex;
          flex-shrink: 0;
          color: var(--tp-violet-600, #8A4DBB);
        }
        .welcome-scope-chevron {
          transition: transform var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease);
        }
        /* The chevron dips toward where the picker will open. */
        .welcome-scope-word:hover .welcome-scope-chevron {
          transform: translateY(1px);
        }
        .welcome-scope-static {
          color: var(--tp-slate-700, #454551);
        }
        .welcome-scope-static .welcome-scope-glyph {
          color: var(--tp-slate-500, #717179);
        }
        @keyframes welcomeScopeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        /* ── Starter chips ───────────────────────────────────────── */
        .copilot-prompt-row {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .copilot-prompt-row::-webkit-scrollbar { display: none; }
        .welcome-prompt-tag {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          min-width: 0;
          flex-shrink: 0;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          min-height: 38px;
          min-width: 196px;
          padding: 8px 16px 8px 12px;
          border-radius: 999px;
          text-align: left;
          cursor: pointer;
          /* A surface of its own against the wash: near-white, a violet
             hairline that still draws on a pale ground, and a whisper of lift
             so it reads as something raised and pressable. */
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid var(--tp-violet-100, #EDDFF7);
          box-shadow: 0 1px 2px rgba(23, 23, 37, 0.05);
          color: var(--tp-slate-700, #454551);
          transition: transform var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease),
            background-color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease), border-color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease),
            box-shadow var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease), color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease);
          /* backwards, not both: a fill that outlived the entrance would hold
             the transform and the hover lift would never show. */
          animation: welcomeTagIn var(--copilot-dur-enter, 200ms) var(--copilot-ease-out, ease-out) backwards;
        }
        .welcome-prompt-tag:hover {
          background: #fff;
          border-color: var(--tp-violet-300, #C89FE7);
          box-shadow: 0 3px 10px rgba(87, 42, 129, 0.12);
          color: var(--tp-violet-800, #572A81);
          transform: translateY(-1px);
        }
        .welcome-prompt-tag:active {
          background: var(--tp-violet-50, #FAF5FE);
          border-color: var(--tp-violet-400, #BA7DE9);
          box-shadow: none;
          transform: translateY(0) scale(0.98);
        }
        .welcome-prompt-tag:focus-visible {
          outline: 2px solid var(--copilot-focus-ring-color, #4b4ad5);
          outline-offset: 2px;
        }
        .welcome-prompt-wash {
          pointer-events: none;
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background-image: url(/icons/dr-agent/chat-bg.gif);
          background-size: cover;
          background-position: center;
          opacity: 0.06;
        }
        .welcome-tag-icon {
          position: relative;
          z-index: 1;
          display: inline-flex;
          flex-shrink: 0;
          color: var(--tp-violet-600, #8A4DBB);
        }
        .welcome-tag-icon svg { width: 14px; height: 14px; }
        /* The AI gradient through the glyph: the bulk icon is a mask, so the
           gradient painted behind it shows in its shape. */
        .welcome-tag-icon [data-tp-icon] {
          background-image: linear-gradient(135deg, #D565EA 0%, #8E62CF 50%, #4B4AD5 100%);
        }
        /* The words in the same gradient, at a regular weight. The stops
           run deep enough (to indigo, not pale pink) to stay readable on the
           pale tag. */
        .welcome-prompt-label {
          position: relative;
          z-index: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 400;
          line-height: 18px;
          color: #673AAC;
          background-image: linear-gradient(90deg, #B04FD0 0%, #7B4FC4 50%, #4B4AD5 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .welcome-prompt-key {
          font-weight: 500;
        }
        /* Two to a line in the narrow sheet only fits at a smaller size. */
        /* In a row under a field (the patient page's top bar) each pill is
           as wide as its words; the generous fixed width is for the popup's
           empty state, where the pills sit in a grid. */
        .copilot-prompt-row[data-layout="row"] .welcome-prompt-tag {
          min-width: 0;
          padding-right: 14px;
        }
        .copilot-prompt-row[data-compact="true"] .welcome-prompt-tag {
          min-height: 28px;
          padding: 4px 10px 4px 8px;
          gap: 5px;
        }
        .copilot-prompt-row[data-compact="true"] .welcome-prompt-label {
          font-size: 11.5px;
          letter-spacing: -0.1px;
        }
        .copilot-prompt-row[data-compact="true"] .welcome-tag-icon svg {
          width: 13px;
          height: 13px;
        }
        @keyframes welcomeTagIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Legacy SVG icons and the large cards ────────────────── */
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
        .welcome-canned-card {
          cursor: pointer;
          transition: transform var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease), box-shadow var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease), border-color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease);
        }
        .welcome-canned-card:hover {
          transform: translateY(-1px);
          border-color: var(--tp-violet-300, #C89FE7) !important;
        }
        .welcome-canned-card:active {
          transform: translateY(0) scale(0.99);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
        }
        .welcome-canned-card:focus-visible {
          outline: 2px solid var(--copilot-focus-ring-color, #4b4ad5);
          outline-offset: 2px;
        }

        @keyframes welcomeSparkRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .welcome-spark-rotate {
          animation: welcomeSparkRotate 16s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .welcome-scope-word,
          .welcome-prompt-tag,
          .welcome-spark-rotate {
            animation: none;
          }
          .welcome-scope-word,
          .welcome-prompt-tag,
          .welcome-canned-card,
          .welcome-scope-chevron {
            transition: background-color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease), border-color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease), color var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease);
          }
          .welcome-scope-word:active,
          .welcome-prompt-tag:hover,
          .welcome-prompt-tag:active,
          .welcome-canned-card:hover,
          .welcome-canned-card:active,
          .welcome-scope-word:hover .welcome-scope-chevron {
            transform: none;
          }
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

/**
 * The words over the chips: what pressing one does, in this scope.
 *
 * The chips alone were four fragments ("HbA1c above 7%") with no verb, and
 * nothing said whether they were filters, tags or questions. One plain line
 * says they are examples, that pressing one sends it, and what kind of
 * question this scope takes, which is the same lesson the composer's
 * placeholder then repeats in the doctor's own field.
 */
function promptsLabelFor(context, isPatientContext) {
  if (isPatientContext) return "Pick one to ask about this chart"
  if (context === "homepage") return "Pick one to find matching patients"
  return "Pick one to get started"
}

export function WelcomeScreen({
  context = "default",
  doctorName,
  patientName,
  hasIntake = false,
  summary,
  actionsOverride,
  suggestions,
  /* Opens the scope picker from the sentence that names the scope. */
  onScopeClick,
  /* Four cards in two columns took most of an empty panel to say four short
     things. As a single row of tags they cost one line, which leaves the
     field below them as the largest thing on the screen. */
  promptsAsTags = false,
  /* "grid" in the popup, "stack" in the narrow sheet: see WelcomePrompts. */
  promptsLayout = "grid",
  onActionClick,
}) {
  const actions = resolveWelcomeActions({ context, summary, actionsOverride, suggestions })
  const greeting = getGreeting()
  /* firstNameOf drops a leading "Dr", so a name stored with its title does
     not come out as "Dr. Dr. Sheela". */
  const doctorFirst = doctorName ? firstNameOf(doctorName) : ""
  const displayName = doctorFirst ? `Dr. ${doctorFirst}` : "Doctor"
  const isPatientContext = context === "rxpad" || context === "patient_detail"
  const isHospitalScope = context === "homepage"
  /* In the sentence it is the doctor being addressed: "You are asking about
     All your patients". The picker, where the doctor speaks, keeps "All my
     patients". */
  const hospitalGroup = useHospitalGroup()
  const hospitalLabel = hospitalGroup === "mine" ? "All your patients" : hospitalGroupLabel(hospitalGroup)
  const promptsLabel = promptsLabelFor(context, isPatientContext)
  /* Keys the scope token and the chip row, so switching scope replays their
     short entrance: the doctor sees the screen change with the scope rather
     than four labels silently swapping under them. */
  const scopeKey = `${context}:${patientName || ""}`
  const chartLabel = chartLabelOf(patientName)

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-[12px] py-[14px]">
      {/* Transparent: the panel's rotating AI wash is the only background. No white overlay here. */}
      <WelcomeStyles />

      {/* Spark icon: 44px tile with animated gradient GIF underlay + rotating white spark overlay. */}
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

      {/* Greeting: the first line of the block, so it carries the weight. */}
      <h2 className="relative z-[1] text-[22px] font-semibold text-tp-slate-800 text-center leading-[28px]">
        {greeting}, {displayName}!
      </h2>

      {/* The scope sentence.

          It states the current scope in the same words the header chip uses,
          so the two are recognisably one setting, and the scope inside it is
          the control that changes it. "You are asking about" was chosen over
          a verb per scope ("Find patients in All hospital patients" said
          patients twice): this line is only about what is being searched,
          and the label over the chips says what to do with it.

          Slate-500, not 400: at 15px on the pale wash the lighter grey fell
          under readable contrast, and this is the sentence that must be read.
          Allowed to wrap, balanced, with the token itself kept whole, so a
          long first name in the narrow sheet breaks the line before the
          token rather than through it. */}
      <p
        className="relative z-[1] mt-[6px] max-w-full text-center text-[15px] leading-[28px] text-tp-slate-500"
        style={{ textWrap: "balance" }}
      >
        {isPatientContext && patientName ? (
          <>
            You are asking about{" "}
            <ScopeWord key={scopeKey} scope="patient" label={chartLabel} onClick={onScopeClick}>
              {chartLabel}
            </ScopeWord>
          </>
        ) : isHospitalScope ? (
          /* The hospital scope finds patients and cannot answer about one
             chart. The scope name says which patients; the label over the
             chips says that finding them is what this scope does. */
          <>
            You are asking about{" "}
            <ScopeWord key={scopeKey} scope="hospital" label={hospitalLabel} onClick={onScopeClick}>
              {hospitalLabel}
            </ScopeWord>
          </>
        ) : context === "billing" ? (
          <>Ask anything about <span className="font-semibold text-tp-slate-700">billing</span> today</>
        ) : (
          <>Ask anything about your <span className="font-semibold text-tp-slate-700">practice</span> today</>
        )}
      </p>

      {/* The label and the chips are one unit: the label sits close above
          them and well clear of the scope line, so it reads as the chips'
          heading and not as a second line of the greeting. */}
      {promptsAsTags ? (
        actions.length > 0 && (
          <div key={scopeKey} className="relative z-[1] mt-[20px] flex w-full flex-col items-center">
            <WelcomePrompts
              layout={promptsLayout}
              actions={actions}
              onActionClick={onActionClick}
              ariaLabel={promptsLabel}
              withStyles={false}
            />
          </div>
        )
      ) : (
        /* Two columns of cards, held to a readable measure. One column below
           640px, where two would truncate every title. */
        <div
          role="group"
          aria-label={promptsLabel}
          className="relative z-[1] mt-[16px] grid w-full max-w-[560px] grid-cols-1 gap-[8px] sm:grid-cols-2"
        >
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onActionClick(action.message)}
              className={cn(
                "welcome-canned-card group relative flex items-start gap-[9px] overflow-hidden text-left",
              )}
              style={{
                borderRadius: 12,
                padding: "11px 13px",
                /* Neutral. Four tinted cards stacked under a tinted panel
                   turned the whole popup pink; the brand colour is carried by
                   the spark and the composer's glow, which is enough. */
                background: "rgba(255,255,255,0.72)",
                border: "1px solid var(--tp-slate-200, #E2E2EA)",
              }}
            >
              {(action.iconName || action.icon) && (
                <span
                  className="welcome-icon-grad relative z-[1] mt-[1px] flex-shrink-0 text-tp-violet-600"
                  aria-hidden="true"
                >
                  <ActionIcon action={action} size={ICON_SIZE} />
                </span>
              )}

              <span className="relative z-[1] flex min-w-0 flex-col">
                <span className="truncate whitespace-nowrap text-[12.5px] font-medium leading-[16px] text-tp-slate-700">
                  {action.title}
                </span>

                {action.subtitle && (
                  <span className="welcome-card-subtitle mt-[3px] text-[10.5px] font-normal leading-[14px] text-tp-slate-500">
                    {action.subtitle}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
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
