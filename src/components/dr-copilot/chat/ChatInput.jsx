import { useCallback, useState, useEffect, useRef, useId } from "react"
import { RollingPlaceholder, SCOPE_HOSPITAL, SCOPE_PATIENT, scopePlaceholder } from "../shared/RollingPlaceholder"
import { cn } from "../../dr-agent/utils"
import { Tooltip } from "@dhspl-tatvacare/tesseract-ui"
import { takePendingDictation } from "../surfaces/CopilotContext"
import { useDictation } from "../shared/useDictation"
import { CopilotIcon } from "../ui/CopilotIcon"
import Lottie from "lottie-react"
import soundWave from "../shared/sound-wave.lottie.json"
import { VoiceRxSiriWaveform } from "../../dr-agent/voicerx/VoiceRxSiriWaveform"

import { AI_GRADIENT } from "../constants"

/* ── Live-strip glyphs ──
   The tick and the cross belong to the recorder strip, which is VoiceRx's
   shared surface and is kept exactly as it ships. Everything the composer
   itself draws comes from Tesseract through CopilotIcon. */

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="5 13 10 18 19 6" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/* ── Recording wave animation bars ── */
function WaveAnimation() {
  return (
    <div className="flex items-center gap-[3px] h-[20px]">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="w-[2.5px] rounded-full"
          style={{
            background: AI_GRADIENT,
            animation: `wave-bar 1s ease-in-out ${i * 0.1}s infinite alternate`,
            height: "6px",
          }}
        />
      ))}
      <style>{`
        @keyframes wave-bar {
          0% { height: 4px; opacity: 0.4; }
          50% { height: 16px; opacity: 1; }
          100% { height: 6px; opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

/* ── Recording timer ── */
function RecordingTimer() {
  const [elapsed, setElapsed] = useState(0)
  const lastTickRef = useRef(Date.now())

  useEffect(() => {
    lastTickRef.current = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      setElapsed((prev) => prev + Math.round((now - lastTickRef.current) / 1000))
      lastTickRef.current = now
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")

  return (
    <span className="text-[14px] font-medium tabular-nums text-tp-slate-500">
      {mm}:{ss}
    </span>
  )
}

/** Symptom-collector virus glyph, from the TP icon set (rounded/bulk/medical). */
function SymptomVirusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path opacity="0.35" fillRule="evenodd" clipRule="evenodd" d="M13 2H11V6.08296C10.0882 6.23592 9.24622 6.59451 8.52323 7.10942L5.63602 4.2222L4.22181 5.63642L7.10909 8.5237C6.59436 9.24658 6.23589 10.0884 6.08296 11H2V13H6.08296C6.23589 13.9116 6.59437 14.7534 7.10911 15.4763L4.22171 18.3637L5.63593 19.7779L8.52327 16.8906C9.24625 17.4055 10.0883 17.7641 11 17.917V22H13V17.917C13.9116 17.7641 14.7535 17.4056 15.4764 16.8908L18.3641 19.7785L19.7783 18.3643L16.8907 15.4766C17.4055 14.7537 17.7641 13.9117 17.917 13H22V11H17.917C17.7641 10.0883 17.4055 9.24625 16.8906 8.52327L19.778 5.63589L18.3638 4.22168L15.4763 7.10911C14.7534 6.59437 13.9116 6.23589 13 6.08296V2Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M19.778 7.04988C20.1685 6.65935 20.1685 6.02619 19.778 5.63567L18.3638 4.22145C17.9733 3.83093 17.3401 3.83093 16.9496 4.22145C16.5591 4.61198 16.559 5.24514 16.9496 5.63567L18.3638 7.04988C18.7543 7.4404 19.3875 7.4404 19.778 7.04988ZM14 3C14 2.44771 13.5523 2 13 2H11C10.4477 2 10 2.44771 10 3C10 3.55228 10.4477 4 11 4H13C13.5523 4 14 3.55228 14 3ZM21 14C21.5523 14 22 13.5523 22 13V11C22 10.4477 21.5523 10 21 10C20.4477 10 20 10.4477 20 11V13C20 13.5523 20.4477 14 21 14ZM3 14C3.55229 14 4 13.5523 4 13V11C4 10.4477 3.55229 10 3 10C2.44772 10 2 10.4477 2 11V13C2 13.5523 2.44772 14 3 14ZM13 20C13.5523 20 14 20.4477 14 21C14 21.5523 13.5523 22 13 22H11C10.4477 22 10 21.5523 10 21C10 20.4477 10.4477 20 11 20H13ZM5.63606 7.0507C5.24554 7.44123 4.61237 7.44123 4.22185 7.0507C3.83133 6.66018 3.83133 6.02701 4.22185 5.63649L5.63606 4.22228C6.02659 3.83175 6.65975 3.83175 7.05028 4.22228C7.4408 4.6128 7.4408 5.24597 7.05028 5.63649L5.63606 7.0507ZM16.9499 19.7782C17.3404 20.1688 17.9736 20.1688 18.3641 19.7782L19.7783 18.364C20.1688 17.9735 20.1688 17.3403 19.7783 16.9498C19.3878 16.5593 18.7546 16.5593 18.3641 16.9498L16.9499 18.364C16.5594 18.7545 16.5594 19.3877 16.9499 19.7782ZM7.05022 18.3642C7.44074 18.7547 7.44074 19.3879 7.05022 19.7784C6.65969 20.1689 6.02653 20.1689 5.636 19.7784L4.22179 18.3642C3.83127 17.9736 3.83127 17.3405 4.22179 16.95C4.61231 16.5594 5.24548 16.5594 5.636 16.95L7.05022 18.3642Z" fill="currentColor" />
    </svg>
  )
}

/**
 * Strip above the input announcing that the patient filled in an intake before
 * the visit. It replaces the icon button that used to sit in the button row:
 * this is news, not a tool, and a doctor who does not already know the intake
 * exists will never think to press an icon for it.
 */
function SymptomCollectorStrip({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-[6px] flex w-full items-center gap-[8px] rounded-[10px] px-[10px] py-[7px] text-left transition-colors"
      style={{
        background: "rgba(16, 185, 129, 0.08)",
        border: "1px solid rgba(16, 185, 129, 0.22)",
      }}
    >
      <span className="flex shrink-0 items-center" style={{ color: "#059669" }}>
        <SymptomVirusIcon size={17} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium" style={{ color: "#047857" }}>
        Symptoms collected from the patient
      </span>
      <span className="shrink-0 text-[11px] font-semibold" style={{ color: "#059669" }}>
        Tap to view
      </span>
    </button>
  )
}

/**
 * The VoiceRx mark: the Sound Wave Lottie, as authored.
 *
 * This was five CSS-animated bars for a while, on the reasoning that a player
 * library and a network fetch were a lot to spend on one 16px glyph. The
 * reasoning was wrong about the thing that mattered: hand-timed keyframes read
 * as a level meter with something already recording into it, where the
 * authored animation reads as an invitation. `lottie-react` was already a
 * dependency and the file is 4.5KB imported as a module, so there is no fetch
 * and nothing new to install.
 *
 * The artwork is black; `brightness(0) invert(1)` makes it white on the
 * gradient CTA. Tinting a filter beats re-authoring the file.
 */
function WaveGlyph({ size = 16, tone = "white", className = "" }) {
  return (
    <span
      className={cn("voicerx-wave pointer-events-none inline-flex shrink-0", className)}
      style={{
        width: size,
        height: size,
        filter: tone === "white" ? "brightness(0) invert(1)" : undefined,
      }}
      aria-hidden="true"
    >
      <Lottie animationData={soundWave} loop autoplay style={{ width: size, height: size }} />
    </span>
  )
}

export function ChatInput({
  value,
  onChange,
  onSend,
  quickActions = [],
  onQuickActionTap,
  onAttach,
  onSymptomCollector,
  onVoiceTranscription,
  disabled = false,
  placeholder = "Ask about this patient...",
  rollingPlaceholder = false,
  bare = false,
  /* Before the first message the field is the whole point of the screen, so
     it stands taller, sets larger type, and takes focus on arrival. */
  tall = false,
  hideTrust = false,
  className,
  isPrefilled = false,
  patientName,
  patientMeta,
  onPatientClick,
  patientLocked = false,
  patientLockedMessage,
  onLockedChipClick,
  isClinicContext = false,
  allowVoiceRx = false,
  autoDictateTrigger = 0,
  onVoiceRx,
  /* Why the box is locked, in the doctor's words. Optional and additive: the
     panel locks the composer both while Velora answers and while a past
     conversation is being reopened, and only it knows which. Without a reason
     a locked box is just a grey box, which reads as broken. */
  disabledReason,
}) {
  const hasText = value.trim().length > 0
  const canSend = hasText && !disabled
  const lockedReason = disabled
    ? disabledReason || "Velora is working on your question. You can type again in a moment."
    : ""
  /* The keyboard hint only earns its place while the doctor is in the field.
     Shown at rest it is one more line to read on a screen that should be
     about the question. */
  const [focused, setFocused] = useState(false)
  const hintId = `chat-input-hint-${useId().replace(/[:]/g, "")}`
  /* Set when a question goes out, so the caret can come back once the answer
     has landed. The field is disabled while Velora answers, which drops focus;
     without this the doctor has to find the box again for every follow-up. */
  const refocusRef = useRef(false)
  // The strip announces the intake once. Once the doctor has opened it there is
  // nothing left to announce, so it stands down rather than sitting there for
  // the rest of the consultation.
  const [symptomStripDismissed, setSymptomStripDismissed] = useState(false)
  /**
   * Two ways of speaking into this box, and they are not the same thing.
   *
   * "dictate" is the plain mic: it fills the textarea, the way dictation
   * anywhere else does. Only the bottom row changes while it runs.
   *
   * "voicerx" is the product's own consultation capture. It has no use for a
   * text field - it structures a whole consultation - so it takes the
   * composer over completely and hands its result back as a message.
   *
   * Copilot is the chat; VoiceRx is a mode of it.
   */
  const [capture, setCapture] = useState(null)
  const isRecording = capture === "dictate"
  const dictation = useDictation()
  /* What was in the box before the doctor started speaking. Dictation appends
     to it rather than replacing it, so a half-typed question survives. */
  const baseTextRef = useRef("")
  const textareaRef = useRef(null)

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const maxH = 120 // ~5 lines
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden"
  }, [])

  /* `tall` is in here because it changes the field's line-height. Sending the
     first message drops the composer out of the tall state, and without this
     the inline height auto-resize wrote while it was tall would stick. */
  useEffect(() => {
    autoResize()
  }, [value, tall, autoResize])

  /* Selected by default in the empty state: the caret is the invitation, and
     the glow that comes with focus is what makes the field read as the thing
     to use. Only on arrival - after that the doctor's own focus wins. */
  useEffect(() => {
    if (!tall || disabled) return
    const el = textareaRef.current
    if (el) el.focus({ preventScroll: true })
  }, [tall, disabled])

  /* One way out for a question, whichever control sent it. Guarded here as
     well as on the button: the send control stays focusable while it cannot
     send (so its tooltip can say why), which means a click can still reach
     this with nothing to send. */
  const sendNow = useCallback(() => {
    if (!canSend) return
    refocusRef.current = true
    onSend()
  }, [canSend, onSend])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter" || e.shiftKey) return
      /* An input method (Hindi, Marathi, Tamil keyboards) uses Enter to pick
         the word it is composing. Sending on that Enter fires the question
         half-written, so it is left to the IME. */
      if (e.nativeEvent && (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229)) return
      /* Enter in an empty box used to drop a blank line in, which pushed the
         field taller with nothing in it. Nothing to send means nothing. */
      e.preventDefault()
      sendNow()
    },
    [sendNow],
  )

  /* Back to the field when the answer has landed, but only if the doctor has
     not gone somewhere else in the meantime. Pulling focus out of the chart
     they clicked into would be worse than leaving it. */
  const rootRef = useRef(null)
  useEffect(() => {
    if (disabled || !refocusRef.current) return
    refocusRef.current = false
    const el = textareaRef.current
    if (!el || typeof document === "undefined") return
    const active = document.activeElement
    const root = rootRef.current
    if (!active || active === document.body || (root && root.contains(active))) {
      el.focus({ preventScroll: true })
    }
  }, [disabled])

  /* The whole capsule is the field. The textarea is one line tall at rest, so
     a click on the padding around it, or on the empty end of the button row,
     used to do nothing at all. */
  const handleShellMouseDown = useCallback(
    (e) => {
      if (disabled) return
      const target = e.target
      if (target && target.closest && target.closest("button, textarea, a, [role='button']")) return
      e.preventDefault()
      const el = textareaRef.current
      if (el) el.focus({ preventScroll: true })
    },
    [disabled],
  )

  /* Live, not on submit: the words appear in the box as they are said, which
     is what tells the doctor it is hearing them. */
  const liveTranscript = dictation.transcript
  useEffect(() => {
    if (capture !== "dictate") return
    const base = baseTextRef.current
    onChange(base && liveTranscript ? `${base} ${liveTranscript}` : base + liveTranscript)
    // onChange identity is not stable in every host; the transcript is the signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTranscript, capture])

  /* The mic stays focusable when it cannot be used, so its tooltip can say
     why; the guard is what the native `disabled` used to do. */
  const micUnavailable = dictation.supported === false
  const micBlocked = disabled || micUnavailable
  const handleMicClick = useCallback(() => {
    if (micBlocked) return
    baseTextRef.current = value
    setCapture("dictate")
    dictation.start()
  }, [dictation, value, micBlocked])

  /* Arriving mid-gesture: the doctor pressed the mic on the page's search bar
     and the panel opened around it. Skip the first render's value so opening
     Copilot any other way does not switch the microphone on. */
  const dictateArmed = useRef(autoDictateTrigger)
  useEffect(() => {
    /* Either the trigger moved while this composer was on screen, or the
       panel was opened by the mic and this composer is the one it opened. */
    const moved = autoDictateTrigger !== dictateArmed.current
    const pending = takePendingDictation()
    if (!moved && !pending) return
    dictateArmed.current = autoDictateTrigger
    if (disabled) return
    baseTextRef.current = ""
    setCapture("dictate")
    dictation.start()
    // dictation.start is stable enough for this; the trigger is the signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDictateTrigger, disabled])

  /* VoiceRx is not this component's to invent. The CTA hands the gesture up
     to the panel, which owns the product's own consultation-mode sheet and
     the recorder behind it. */
  const handleVoiceRxClick = useCallback(() => {
    if (onVoiceRx) onVoiceRx()
  }, [onVoiceRx])


  const handleDiscard = useCallback(() => {
    /* Put the box back the way it was. Discard means discard - the half of a
       sentence that was heard before the doctor changed their mind is not
       something to leave behind for them to delete. */
    if (capture === "dictate") onChange(baseTextRef.current)
    dictation.cancel()
    setCapture(null)
  }, [capture, dictation, onChange])

  const handleSendRecording = useCallback(() => {
    const spoken = String(dictation.stop() || "").trim()

    if (capture === "dictate") {
      /* Already in the box, live. Stopping just ends the gesture. */
      setCapture(null)
        return
    }

    if (spoken && onVoiceTranscription) {
      onVoiceTranscription(spoken)
      setCapture(null)
        return
    }

    /* Nothing heard - no microphone, no recognition, or an empty room. There
       is nothing to send, so nothing is sent: inventing a consultation here
       would put words in the chart the doctor never said. */
    setCapture(null)
  }, [capture, dictation, onVoiceTranscription])

  /* The live strip: a dot, a wave, a clock, and the three things that can be
     done to a recording. The same strip serves both modes - dictation puts it
     where the composer's second row was, VoiceRx puts it where the composer
     was. */
  /**
   * One pill, everything inside it.
   *
   * Discard on the left, keep on the right, the wave and the clock between
   * them - so the strip reads left to right as "throw this away / here is
   * what I am hearing / keep it", and the composer's row stays one object
   * rather than a box with two loose buttons trailing after it.
   *
   * No pause: a dictation that can be paused is a recording session, and this
   * is a sentence being said. No red dot either - a moving wave and a running
   * clock already say it is live, and the discard control carries the red.
   */
  const liveStrip = (
        <div
          className="flex h-[32px] w-full min-w-0 items-center gap-[8px] rounded-[10px] px-[5px]"
          /* A tinted ground rather than an outline. An outlined strip inside
             an outlined composer was two strokes deep and read as a box in a
             box; a wash of the primary says "this is live" without drawing a
             second edge. */
          style={{ background: "rgba(75, 74, 213, 0.07)" }}
        >
          <button
            type="button"
            onClick={handleDiscard}
            className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(225, 29, 72, 0.10)", color: "#e11d48" }}
            title="Discard"
            aria-label="Discard"
          >
            <CrossIcon />
          </button>

          {/* The wave and the clock travel together in the middle. Stretched
              edge to edge the wave pushed the clock hard right, and the two
              things that describe the same recording sat at opposite ends of
              it. */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-[10px]">
            {dictation.stream ? (
              /* The product's own visualiser, on the real stream. The stand-in
                 bars only run when there is no microphone to draw. */
              <VoiceRxSiriWaveform
                stream={dictation.stream}
                className="!min-h-[22px] !h-[24px] !w-[104px] !min-w-0 !flex-none !p-0"
              />
            ) : (
              <WaveAnimation />
            )}
            <RecordingTimer />
          </div>

          <button
            type="button"
            onClick={handleSendRecording}
            className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(5, 150, 105, 0.12)", color: "#059669" }}
            title="Keep what was said"
            aria-label="Keep"
          >
            <CheckIcon />
          </button>
        </div>
  )

  /* What the field says while it is listening. A rolling "Ask Velora about
     medications" under a running microphone reads as two things happening at
     once; this says the one thing that is. The blocked case is said in the
     field because the strip below is VoiceRx's and stays as it ships. */
  const listeningPlaceholder = dictation.micError
    ? "Microphone is blocked. Allow it in the browser, or type instead."
    : "Listening. Speak now, your words will appear here."
  const fieldPlaceholder = isRecording ? listeningPlaceholder : rollingPlaceholder ? "" : placeholder
  /* One sentence for a screen reader per state change: the visual cues here
     (a stroke turning violet, a spinner) are silent otherwise. */
  const liveMessage = disabled
    ? lockedReason
    : isRecording
      ? dictation.micError
        ? "Microphone is blocked."
        : "Listening. Speak your question."
      : ""

  const sendTip = canSend ? "Send question (Enter)" : disabled ? lockedReason : "Type a question first"
  const micTip = micUnavailable
    ? "Voice typing does not work in this browser. Please type instead."
    : disabled
      ? lockedReason
      : "Speak instead of typing. Velora writes it here."

  /* The white ground and the sticky belong to whoever places this, not to
     the composer. In the popup the composer floats on the panel's own wash
     and the wrapper handles both; keeping them here painted a white plate
     under it that no amount of styling outside could remove.

     This comment sits above the return on purpose. Inside `return (` it
     shipped the composer as nothing: the production build prints compact
     code without the parentheses, and a multi-line comment straight after
     `return` counts as a line break, so the statement became `return;` and
     the whole input box was dropped as unreachable. Development kept the
     parentheses, which is why only built versions lost it. */
  return (
    <div
      ref={rootRef}
      className={cn(
        "px-[16px] pt-[8px] pb-[4px]",
        bare ? "bg-transparent" : "sticky bottom-0 bg-white",
        className,
      )}
    >
      {/* The composer's stylesheet, rendered in every mode.
          It used to live inside the normal-input branch, which meant the
          moment the card flipped to the VoiceRx face none of these rules
          existed any more - no ground, no stroke, no glow, and the flip
          itself did not animate. A component's styles cannot be a child of
          one of its states. */}
      <style>{`
            .chat-input-border {
              border: 1px solid var(--tp-slate-200, #E2E2EA);
              background: #fff;
              cursor: text;
              transition: border-color 180ms ease, box-shadow 200ms ease, background-color 180ms ease;
            }
            /* Floating on the panel's wash, the capsule needs to sit off the
               background without a plate behind it: a bloom that reads outside
               the stroke and stops well short of the content.

               Every layer here is blurred. A zero-blur spread ring reads as a
               second stroke drawn around the field, which is the one thing
               this glow must not look like. */
            .chat-input-bare {
              box-shadow:
                0 0 22px 2px rgba(103, 58, 172, 0.13),
                0 10px 30px -12px rgba(103, 58, 172, 0.30);
            }
            .chat-input-bare:focus-within {
              box-shadow:
                0 0 30px 4px rgba(103, 58, 172, 0.20),
                0 12px 36px -12px rgba(103, 58, 172, 0.36);
            }
            /* Placeholder at a readable grey. The old slate-300 was a near
               white on white: fine on a designer's monitor, gone on a clinic
               laptop at an angle, and the placeholder is the one line that
               tells the doctor what this box is for. */
            .chat-input-border textarea::placeholder {
              color: var(--tp-slate-500, #717179);
              line-height: 16px;
            }
            /* Hover before focus: the stroke darkens a step so the capsule
               answers the pointer and reads as a field, not a decoration. */
            .chat-input-border:hover:not(:focus-within):not(.chat-input-disabled) {
              border-color: var(--tp-slate-300, #D0D5DD);
            }
            /* Focus is a stroke, not a shadow ring - a zero-blur spread reads
               as a second border. */
            .chat-input-border:focus-within {
              border-color: var(--tp-blue-500, #4B4AD5);
            }
            .chat-input-tall textarea::placeholder {
              line-height: 22px;
            }
            /* The tab on the edge of the screen and this CTA are the same
               product saying the same thing, so they carry the same ramp. */
            .voicerx-chip-grad {
              background: linear-gradient(90deg, #D565EA 0%, #673AAC 55%, #1A1994 100%);
            }
            .voicerx-cta:hover {
              filter: brightness(1.06);
            }
            /* The card turns over rather than swapping: the composer is one
               object with two faces, and a cut would read as two components
               taking turns in the same slot. */
            .copilot-flip-in {
              animation: copilotFlip 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
              transform-origin: center;
              backface-visibility: hidden;
            }
            @keyframes copilotFlip {
              from { transform: perspective(700px) rotateX(-38deg); opacity: 0; }
              to   { transform: perspective(700px) rotateX(0deg); opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .copilot-flip-in { animation: none; }
            }
            .voicerx-cta:active {
              transform: scale(0.97);
            }

            /* At rest the stroke is quiet; on focus it goes blue, the same as
               every other field in the app. Without it there was no way to
               tell a live box from a decorative one. */
            .chat-input-tall.chat-input-bare {
              border-color: var(--tp-slate-200, #E2E2EA);
            }
            .chat-input-tall.chat-input-bare:hover:not(:focus-within):not(.chat-input-disabled) {
              border-color: var(--tp-slate-300, #D0D5DD);
            }
            .chat-input-tall.chat-input-bare:focus-within {
              border-color: var(--tp-blue-500, #4B4AD5);
            }
            .chat-input-tall.chat-input-bare,
            .chat-input-tall.chat-input-bare:focus-within {
              /* Wide and soft on every side. A drop shadow with a downward
                 offset pooled under the field and left its top edge bare,
                 which read as the glow being cut off rather than bleeding. */
              box-shadow:
                0 0 20px 1px rgba(103, 58, 172, 0.09),
                0 0 44px 8px rgba(103, 58, 172, 0.09),
                0 0 88px 24px rgba(103, 58, 172, 0.055);
            }
            /* Animated AI gradient border for pre-filled state */
            .chat-input-border.chat-input-prefilled {
              border-color: transparent;
              background-image: linear-gradient(white, white),
                linear-gradient(135deg, #D565EA, #673AAC, #1A1994, #D565EA, #673AAC);
              background-origin: border-box;
              background-clip: padding-box, border-box;
              background-size: 100% 100%, 300% 300%;
              animation: aiGradientBorderFlow 3s ease-in-out infinite;
              box-shadow: 0 0 0 2px rgba(103,58,172,0.08);
            }
            .chat-input-border.chat-input-prefilled:focus-within {
              border-color: transparent;
              box-shadow: 0 0 0 3px rgba(103,58,172,0.12);
            }
            @keyframes aiGradientBorderFlow {
              0% { background-position: 0% 0%, 0% 50%; }
              50% { background-position: 0% 0%, 100% 50%; }
              100% { background-position: 0% 0%, 0% 50%; }
            }

            /* Locked while Velora answers. This used to fade the whole capsule
               to half opacity, buttons and all, which looked like the panel
               had broken rather than like it was busy. Now the ground goes a
               step grey, the glow settles, and the row underneath says why
               in words. */
            /* Waiting for Velora: the whole box steps back. Lower opacity,
               no glow, no hover change, and nothing spinning inside it; the
               answer arriving in the thread is the progress to watch. */
            .chat-input-border.chat-input-disabled {
              background-color: var(--tp-slate-50, #FAFAFB);
              cursor: not-allowed;
              opacity: 0.55;
              box-shadow: none !important;
              transition: opacity var(--copilot-dur-state, 160ms) var(--copilot-ease-standard, ease);
            }
            .chat-input-bare.chat-input-disabled,
            .chat-input-tall.chat-input-bare.chat-input-disabled {
              box-shadow: 0 0 18px 1px rgba(103, 58, 172, 0.07);
            }
            .chat-input-disabled textarea {
              cursor: not-allowed;
            }

            /* Listening. Violet is Velora's colour for "the AI is doing
               something"; the stroke takes it so the box itself says the mic
               is on, not only the strip under it. Declared last so it wins
               over the blue focus stroke at equal weight. */
            .chat-input-border.chat-input-listening,
            .chat-input-border.chat-input-listening:focus-within,
            .chat-input-tall.chat-input-bare.chat-input-listening,
            .chat-input-tall.chat-input-bare.chat-input-listening:focus-within {
              border-color: var(--tp-violet-300, #C89FE7);
            }
            .chat-input-listening textarea::placeholder {
              color: var(--tp-violet-600, #8A4DBB);
            }

            /* Round controls in the button row. Each one answers in three
               steps: a darker ground on hover, a small press on click, and a
               blue outline for the keyboard. A control that does nothing it
               can be seen doing gets tapped twice. */
            .chat-input-iconbtn {
              position: relative;
              transition: background-color 140ms ease,
                transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 160ms ease, filter 160ms ease;
              -webkit-tap-highlight-color: transparent;
              touch-action: manipulation;
            }
            /* 32px drawn, 40px to hit. The row's 8px gaps mean neighbouring
               targets meet but never overlap. */
            .chat-input-iconbtn::after {
              content: "";
              position: absolute;
              inset: -4px;
              border-radius: 9999px;
            }
            .chat-input-iconbtn:focus-visible {
              outline: 2px solid var(--tp-blue-500, #4B4AD5);
              outline-offset: 2px;
            }
            .chat-input-mic {
              background-color: var(--tp-slate-100, #F1F1F5);
            }
            .chat-input-mic[aria-disabled="false"]:hover {
              background-color: var(--tp-slate-200, #E2E2EA);
            }
            .chat-input-mic[aria-disabled="false"]:active {
              background-color: var(--tp-slate-300, #D0D5DD);
              transform: scale(0.92);
            }
            .chat-input-mic[aria-disabled="true"] {
              cursor: not-allowed;
            }
            /* Send. Grey and flat until there is something to send, then the
               Velora gradient fades in under the arrow. The gradient sits on
               a layer of its own because a gradient cannot be transitioned,
               and a hard cut from grey to colour on the first keystroke is
               a flash rather than a signal. */
            .chat-input-send {
              background-color: var(--tp-slate-100, #F1F1F5);
            }
            .chat-input-send::before {
              content: "";
              position: absolute;
              inset: 0;
              border-radius: inherit;
              background: ${AI_GRADIENT};
              opacity: 0;
              transition: opacity 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            .chat-input-send[data-ready="true"]::before {
              opacity: 1;
            }
            .chat-input-send[data-ready="true"]:hover {
              filter: brightness(1.08);
              box-shadow: 0 4px 12px -4px rgba(103, 58, 172, 0.55);
            }
            .chat-input-send[data-ready="true"]:active {
              transform: scale(0.92);
              box-shadow: 0 2px 6px -2px rgba(103, 58, 172, 0.45);
            }
            .chat-input-send[data-ready="false"] {
              cursor: not-allowed;
            }
            .chat-input-send > span {
              position: relative;
            }

            /* Keyboard hint. Quiet on purpose: small grey type with the keys
               set as keycaps, because "Enter" as a word is easy to skim past
               and a keycap is recognised before it is read. The row is one
               line tall and wraps into overflow, so on a narrow panel the
               second hint drops out whole instead of being cut mid-word. */
            .chat-input-keyhint {
              transition: opacity 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            .chat-input-kbd {
              display: inline-flex;
              align-items: center;
              height: 16px;
              padding: 0 4px;
              border-radius: 4px;
              border: 1px solid var(--tp-slate-200, #E2E2EA);
              background: var(--tp-slate-50, #FAFAFB);
              box-shadow: 0 1px 0 var(--tp-slate-200, #E2E2EA);
              font-family: inherit;
              font-size: 10px;
              font-weight: 600;
              line-height: 1;
              color: var(--tp-slate-600, #545460);
            }
            /* Touch screens have no Enter key worth teaching. */
            @media (hover: none) {
              .chat-input-keyhint { display: none; }
            }

            /* Velora is answering. A ring rather than dots: it sits on the
               text baseline at type size and does not compete with the
               typing indicator in the thread above. */
            .chat-input-spinner {
              width: 12px;
              height: 12px;
              flex-shrink: 0;
              border-radius: 9999px;
              border: 2px solid var(--tp-violet-100, #EDDFF7);
              border-top-color: var(--tp-violet-500, #A461D8);
              animation: chatInputSpin 720ms linear infinite;
            }
            @keyframes chatInputSpin {
              to { transform: rotate(360deg); }
            }
            .chat-input-status {
              animation: chatInputFadeIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
            }
            @keyframes chatInputFadeIn {
              from { opacity: 0; transform: translateY(2px); }
              to { opacity: 1; transform: none; }
            }

            @media (prefers-reduced-motion: reduce) {
              .chat-input-border,
              .chat-input-iconbtn,
              .chat-input-send::before,
              .chat-input-keyhint {
                transition: none;
              }
              .chat-input-iconbtn:active,
              .chat-input-mic[aria-disabled="false"]:active,
              .chat-input-send[data-ready="true"]:active {
                transform: none;
              }
              .chat-input-border.chat-input-prefilled,
              .chat-input-status {
                animation: none;
              }
              /* Still, but still there: a stopped ring next to "Velora is
                 answering" says busy without anything spinning. */
              .chat-input-spinner {
                animation: none;
              }
            }
          `}</style>

      {/* Said aloud once per change of state. Visually hidden: the same
          words are on screen in the row under the field, or in the field
          itself while it is listening. */}
      <span role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </span>

      {/* ── Normal input mode: two-row layout ── */}
      <>
        <div
          className={cn(
            "chat-input-border flex flex-col justify-end",
            tall ? "chat-input-tall rounded-[16px]" : "rounded-[12px]",
            bare && "chat-input-bare",
            isPrefilled && "chat-input-prefilled",
            disabled && "chat-input-disabled",
            isRecording && "chat-input-listening",
          )}
          style={tall ? { padding: "15px 18px", gap: 14 } : { padding: "10px 14px", gap: 12 }}
          onMouseDown={handleShellMouseDown}
        >


          {/* Row 1: Textarea.
              The invitation is drawn over the field rather than set on it, so
              it can roll; it is the same one the top-bar search shows, because
              they are the same invitation in two places. It stands down while
              the mic is on, when the field has something more urgent to say. */}
          <div className="relative w-full">
            {!value && rollingPlaceholder && !isRecording && (
              <RollingPlaceholder
                patientLabel={patientName}
                active={!disabled}
                size={tall ? "lg" : "md"}
                /* Named when there is a name: "Ask Velora about Abhyuday's"
                   says whose chart this is in the field the doctor is typing
                   into, which the header tag alone does not. */
                named={!!patientName}
                scope={isClinicContext ? SCOPE_HOSPITAL : SCOPE_PATIENT}
                className="px-[4px]"
              />
            )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            placeholder={fieldPlaceholder}
            /* The rolling invitation is aria-hidden, so without a name of its
               own the field was announced as an unlabelled text box. */
            /* The drawn ghost is hidden from assistive technology, so the
               field carries the same invitation as its name. */
            aria-label={
              rollingPlaceholder
                ? scopePlaceholder(isClinicContext ? SCOPE_HOSPITAL : SCOPE_PATIENT, patientName)
                : isClinicContext
                  ? "Your question about all hospital patients"
                  : "Your question for Velora"
            }
            aria-describedby={disabled ? hintId : undefined}
            enterKeyHint="send"
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent px-[4px]",
              tall ? "text-[15.5px] text-tp-slate-800" : "text-[14px] leading-[16px] text-tp-slate-800",
              "focus:outline-none",
            )}
            style={
              tall
                ? { minHeight: 44, maxHeight: 120, fontWeight: 400, lineHeight: "22px" }
                : { minHeight: 28, maxHeight: 120, fontWeight: 400, lineHeight: "16px" }
            }
          />
          </div>

          {/* Row 2. Dictation fills the field above, so only the actions on
              the right of this row give way to the recorder.

              No patient chip here any more: the scope is the floating tag at
              the top of the panel, and two copies of it meant two things to
              read and two to keep in step. The left of the row is where the
              composer talks back instead: why it is locked while Velora
              answers, and the keyboard hint while the doctor is typing. */}
          <div className="flex items-center justify-between gap-[10px]" style={{ minHeight: 32 }}>
            {/* Nothing on the left while typing or waiting: no keyboard hint
                and no spinner inside the box. While Velora answers the whole
                composer dims instead, which says "not now" without a second
                thing moving on screen; the reason is still its accessible
                description. */}
            {!isRecording && (
              <div className="min-w-0 flex-1">
                {disabled && (
                  <span id={hintId} className="sr-only">
                    {lockedReason}
                  </span>
                )}
              </div>
            )}

            {isRecording ? (
              <div className="min-w-0 flex-1">{liveStrip}</div>
            ) : (
            /* Right side: attachment, mic, send, and VoiceRx where the page
               offers it. */
            <div className="flex shrink-0 items-center gap-[8px]">
              {/* Attachment button (hidden when onAttach is undefined, e.g. V0 mode) */}
              {onAttach && (
                <Tooltip className="copilot-tooltip" content={disabled ? lockedReason : "Attach a report or document"} side="top">
                  <button
                    type="button"
                    onClick={disabled ? undefined : onAttach}
                    aria-disabled={disabled ? "true" : "false"}
                    aria-label="Attach a report or document"
                    className="chat-input-iconbtn chat-input-mic flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full"
                  >
                    <CopilotIcon
                      name="paperclip-2"
                      variant="linear"
                      size={18}
                      color={disabled ? "var(--tp-slate-400, #A2A2A8)" : "var(--tp-slate-700, #454551)"}
                    />
                  </button>
                </Tooltip>
              )}

              {/* The mic and send now sit side by side rather than taking turns
                  in one slot. Swapping them on the first keystroke moved the
                  control under the doctor's finger, and an empty box showed no
                  send button at all, so nothing said how a question goes out.
                  The mic still types into the box; it does not write a
                  prescription - that is what the VoiceRx CTA is for. */}
              <Tooltip className="copilot-tooltip" content={micTip} side="top">
                <button
                  type="button"
                  onClick={handleMicClick}
                  aria-disabled={micBlocked ? "true" : "false"}
                  className="chat-input-iconbtn chat-input-mic flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full"
                  aria-label={micUnavailable ? "Voice typing is not available in this browser" : "Speak your question"}
                >
                  <CopilotIcon
                    name={micUnavailable ? "microphone-slash" : "microphone-2"}
                    variant="bulk"
                    size={18}
                    color={micBlocked ? "var(--tp-slate-400, #A2A2A8)" : "var(--tp-slate-700, #454551)"}
                  />
                </button>
              </Tooltip>

              <Tooltip className="copilot-tooltip" content={sendTip} side="top">
                <button
                  type="button"
                  onClick={sendNow}
                  aria-disabled={canSend ? "false" : "true"}
                  data-ready={canSend ? "true" : "false"}
                  className="chat-input-iconbtn chat-input-send flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full"
                  aria-label="Send question"
                >
                  {/* arrow-up2 is the straight arrow; plain "arrow-up" in this
                      set is a triangle. Colour is passed, not inherited: the
                      icon's mask paints with its own currentColor, which a
                      rule elsewhere in the panel overrides for spans. */}
                  <CopilotIcon
                    name="arrow-up2"
                    variant="linear"
                    size={18}
                    color={canSend ? "var(--tp-slate-0, #FFFFFF)" : "var(--tp-slate-400, #A2A2A8)"}
                  />
                </button>
              </Tooltip>

              {/* VoiceRx: the consultation recorder, reachable from the chat.
                  Copilot is the chat and VoiceRx is a mode of it, so this is a
                  named CTA rather than another grey glyph - it does something
                  different from everything beside it. */}
              {allowVoiceRx && onVoiceTranscription && (
                <button
                  type="button"
                  onClick={handleVoiceRxClick}
                  disabled={disabled}
                  className={cn(
                    "voicerx-cta voicerx-chip-grad flex h-[32px] shrink-0 items-center gap-[4px] rounded-[12px] pl-[6px] pr-[11px] transition-all",
                    disabled && "pointer-events-none opacity-50",
                  )}
                  title="VoiceRx - dictate the consultation and structure it"
                  aria-label="VoiceRx"
                >
                  <WaveGlyph size={24} />
                  <span className="text-[12px] font-semibold leading-none text-white">VoiceRx</span>
                </button>
              )}
            </div>
            )}
          </div>
        </div>
      </>

      {/* Trust indicator, centred. Suppressed when the panel pins it to its
          own bottom edge instead (see DrAgentPanel). */}
      {!hideTrust && (
      <div className="mt-[4px] mb-[14px] flex items-center justify-center gap-[4px]">
        <CopilotIcon name="security-safe" variant="linear" size={12} className="shrink-0 text-tp-slate-500" />
        <span className="text-[11px] leading-[1.4] text-tp-slate-500">
          Data stays private · AI-assisted, you decide
        </span>
      </div>
      )}
    </div>
  )
}
