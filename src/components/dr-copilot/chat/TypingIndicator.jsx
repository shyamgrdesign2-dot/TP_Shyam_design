import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "../../dr-agent/utils"
import { VeloraStar } from "../shared/VeloraStar"
import { useCopilotActivity } from "../chart-search/copilotActivity"

// -----------------------------------------------------------------
// TypingIndicator - what Velora is doing while an answer is on its way
//
// It used to rotate a loop of ward-round jokes every 900ms. Funny once, but
// a doctor in a full OPD reads a line that changes faster than they can
// finish it as noise, and a joke where a status should be as the tool not
// taking their patient seriously. So the lines are plain statements of what
// is happening, each held long enough to read, and the sequence moves
// forward only: it never loops back to the start, because a status that
// repeats itself looks like it is stuck. When an answer is genuinely slow
// it says so, which is the one thing a waiting person actually wants to
// know.
// -----------------------------------------------------------------

/** How long the first line (the one that names the task) stays up */
const FIRST_HOLD_MS = 2400
/** How long each later line stays up before the next one */
const STEP_HOLD_MS = 2800
/** Slide-out / swap / slide-in budget, inside the house 120-240ms range */
const TRANSITION_MS = 200
/** From here on the wait is longer than usual, and the copy says so */
const SLOW_AFTER_MS = 15000

/** When no hint is given (e.g. the design-system preview) */
const DEFAULT_FIRST_LINE = "Reading the record"

/** The middle of a chart answer's wait */
const WORKING_LINES = [
  "Matching your question to the record",
  "Preparing the answer",
]

/** The same wait for a hospital-wide search, which reads many records, not
    one: "the record" there would say the wrong thing about what is
    happening. Chosen by the first line the panel sends for that scope. */
const HOSPITAL_FIRST_LINE = "Searching all hospital patients"
const MINE_FIRST_LINE = "Searching all your patients"
const HOSPITAL_WORKING_LINES = [
  "Checking each patient's records",
  "Listing the patients who match",
]

/** Held until the answer lands, or until the slow notice replaces it */
const PATIENCE_LINE = "Still working. Long records take a little longer"
const HOSPITAL_PATIENCE_LINE = "Still working. A hospital-wide search takes a little longer"
const SLOW_LINE = "This is taking longer than usual. Please wait"

function buildThinkingSequence(queryHint) {
  const hint = typeof queryHint === "string" ? queryHint.trim() : ""
  const first = hint || DEFAULT_FIRST_LINE
  const hospital = first === HOSPITAL_FIRST_LINE || first === MINE_FIRST_LINE
  const seen = new Set([first])
  const middle = hospital ? HOSPITAL_WORKING_LINES : WORKING_LINES
  const patience = hospital ? HOSPITAL_PATIENCE_LINE : PATIENCE_LINE
  const rest = [...middle, patience].filter((line) => {
    if (seen.has(line)) return false
    seen.add(line)
    return true
  })
  return [first, ...rest]
}

/** prefers-reduced-motion, read once per mount; the CSS below honours it too */
function prefersReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  } catch (e) {
    return false
  }
}

export function TypingIndicator({ className, queryHint }) {
  const messages = useMemo(() => buildThinkingSequence(queryHint), [queryHint])
  const [idx, setIdx] = useState(0)
  const [slow, setSlow] = useState(false)
  const [phase, setPhase] = useState("in")
  const timersRef = useRef([])

  useEffect(() => {
    const timers = timersRef.current
    const schedule = (fn, ms) => {
      const id = setTimeout(fn, ms)
      timers.push(id)
    }
    const reduced = prefersReducedMotion()

    setIdx(0)
    setSlow(false)
    setPhase("in")

    /* Swap to a line, with the slide when motion is allowed. */
    const swapTo = (apply) => {
      if (reduced) {
        apply()
        return
      }
      setPhase("out")
      schedule(() => {
        apply()
        setPhase("in")
      }, TRANSITION_MS)
    }

    /* Forward only, one line at a time, stopping on the last. */
    const advance = (next) => {
      if (next >= messages.length) return
      swapTo(() => setIdx(next))
      if (next < messages.length - 1) schedule(() => advance(next + 1), STEP_HOLD_MS)
    }
    schedule(() => advance(1), FIRST_HOLD_MS)
    schedule(() => swapTo(() => setSlow(true)), SLOW_AFTER_MS)

    return () => {
      timers.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [messages])

  /* The service's own steps, when it streams them. They are the truth about
     what is happening, so they replace the written lines outright: the step
     running now is the one line shown, rolling to the next as the service
     moves on, and the answer as it is being written appears under it. Without a stream the written lines carry on as before. */
  const { steps, draft } = useCopilotActivity()
  const live = steps.length > 0
  const running = [...steps].reverse().find((s) => s.status !== "complete" && s.status !== "failed")
  const headline = live ? (running || steps[steps.length - 1]).label : null
  const displayText = headline || (slow ? SLOW_LINE : messages[idx] || "")

  return (
    <div className={cn("flex w-full flex-col", className)}>
    {/* Same geometry as an assistant reply: a 22px spark and a 6px gap, so the
        status line sits exactly where the answer's first line will appear and
        nothing jumps when it does. */}
    <div className="flex items-center gap-[6px]">
      {/* One polite announcement for screen readers. The rotating line is
          hidden from them, since a status that speaks every three seconds is
          worse than one that speaks once. */}
      <span role="status" aria-live="polite" className="velora-think-sr">
        Velora is preparing an answer
      </span>

      {/* The design team's star, playing for as long as Velora works: the
          same mark as the spark in the fields, so "busy" looks like Velora
          and not like a generic spinner. The step text beside it says what
          is happening. */}
      <span className="velora-think-spark relative inline-flex shrink-0 items-center justify-center" aria-hidden="true">
        <span className="velora-think-halo" />
        <VeloraStar size={26} className="relative" />
      </span>

      <div className="velora-think-wrap min-w-0 flex-1" aria-hidden="true">
        <span
          key={live ? displayText : undefined}
          className={cn(
            "velora-think-line",
            live || phase !== "out" ? "velora-think-in" : "velora-think-out",
          )}
        >
          <span className="velora-think-text">{displayText}</span>
          <span className="velora-think-ellipsis">
            <span className="velora-think-dot" style={{ animationDelay: "0ms" }} />
            <span className="velora-think-dot" style={{ animationDelay: "160ms" }} />
            <span className="velora-think-dot" style={{ animationDelay: "320ms" }} />
          </span>
        </span>
      </div>

      </div>

      {draft && (
        <p className="velora-think-draft" aria-hidden="true">
          {draft.replace(/\[(\d+)\]\(#evidence-\d+\)/g, "[$1]").replace(/[#*>_`]/g, "")}
          <span className="velora-think-caret" />
        </p>
      )}

      {/* Class names are prefixed: dr-agent-globals.css ships its own
          typing-* classes globally, and the two must not restyle each other. */}
      <style>{`
        .velora-think-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* The spark keeps its front-back flip: it is the brand's "working"
           mark across the product, and the only motion here that says the
           panel is alive between line changes. */
        .velora-think-spark {
          width: 26px;
          height: 26px;
          margin: -2px 0 -2px -2px;
          perspective: 500px;
        }
        .velora-think-flip {
          display: inline-block;
          transform-style: preserve-3d;
          animation: veloraThinkFlip 2.2s cubic-bezier(0.6, 0, 0.4, 1) infinite;
          filter: drop-shadow(0 1px 2px rgba(103, 58, 172, 0.25));
        }
        .velora-think-halo {
          position: absolute;
          inset: -2px;
          border-radius: 999px;
          background: radial-gradient(circle at 50% 50%,
            rgba(213, 101, 234, 0.28) 0%,
            rgba(139, 92, 246, 0.2) 40%,
            rgba(75, 74, 213, 0) 75%);
          animation: veloraThinkHalo 2.2s ease-in-out infinite;
        }
        @keyframes veloraThinkFlip {
          0%   { transform: rotateY(0deg) scale(1); }
          25%  { transform: rotateY(180deg) scale(1.08); }
          50%  { transform: rotateY(360deg) scale(1); }
          75%  { transform: rotateY(540deg) scale(1.08); }
          100% { transform: rotateY(720deg) scale(1); }
        }
        @keyframes veloraThinkHalo {
          0%, 100% { opacity: 0.55; transform: scale(0.85); }
          50%      { opacity: 1;    transform: scale(1.15); }
        }

        .velora-think-wrap {
          overflow: hidden;
          height: 20px;
          display: flex;
          align-items: center;
        }

        .velora-think-line {
          display: flex;
          align-items: center;
          min-width: 0;
          max-width: 100%;
          font-size: 13px;
          font-weight: 500;
          line-height: 20px;
          color: var(--tp-slate-600, #545460);
          white-space: nowrap;
        }
        /* A light passing across the words, in the AI gradient: the line is
           plainly a status (not an answer) and plainly still moving, even in
           the seconds between one step and the next. */
        .velora-think-text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          background: linear-gradient(90deg,
            var(--tp-slate-600, #545460) 0%,
            var(--tp-slate-600, #545460) 35%,
            #A855F7 48%, #6A69DE 54%,
            var(--tp-slate-600, #545460) 66%,
            var(--tp-slate-600, #545460) 100%);
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: veloraThinkShimmer 2.4s linear infinite;
        }
        @keyframes veloraThinkShimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -50% 0; }
        }

        @keyframes veloraThinkBlink { to { visibility: hidden; } }
        .velora-think-draft {
          margin: 8px 0 0 30px;
          font-size: 13.5px;
          line-height: 20px;
          color: var(--tp-slate-700, #454551);
          white-space: pre-wrap;
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 6;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .velora-think-caret {
          display: inline-block;
          width: 2px;
          height: 14px;
          margin-left: 1px;
          vertical-align: middle;
          background: var(--tp-violet-400, #BC85E3);
          animation: veloraThinkBlink 1s steps(2, start) infinite;
        }

        .velora-think-in {
          animation: veloraThinkIn 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .velora-think-out {
          animation: veloraThinkOut 220ms cubic-bezier(0.7, 0, 0.84, 0) both;
        }
        /* The change of step is meant to be seen: the old line lifts out
           and blurs, the new one rises in from below and sharpens, over a
           full line's height rather than a few pixels. */
        @keyframes veloraThinkIn {
          0%   { transform: translateY(16px); opacity: 0; filter: blur(3px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes veloraThinkOut {
          0%   { transform: translateY(0); opacity: 1; filter: blur(0); }
          100% { transform: translateY(-16px); opacity: 0; filter: blur(3px); }
        }

        /* Three dots that are plainly dots: 5px, in Velora's violet, each
           hopping in turn. */
        .velora-think-ellipsis {
          flex-shrink: 0;
          display: inline-flex;
          align-items: flex-end;
          gap: 4px;
          height: 12px;
          margin-left: 7px;
        }
        .velora-think-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: linear-gradient(135deg, #C86BE0, #6A69DE);
          animation: veloraThinkDot 1.1s ease-in-out infinite;
        }
        @keyframes veloraThinkDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30%           { transform: translateY(-5px); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .velora-think-flip { animation: none; }
          .velora-think-halo { animation: none; opacity: 0.5; }
          .velora-think-in,
          .velora-think-out { animation: none; }
          .velora-think-dot { animation: none; opacity: 0.7; }
          .velora-think-text { animation: none; -webkit-text-fill-color: var(--tp-slate-600, #545460); }
          .velora-think-caret { animation: none; }
        }
      `}</style>
    </div>
  )
}
