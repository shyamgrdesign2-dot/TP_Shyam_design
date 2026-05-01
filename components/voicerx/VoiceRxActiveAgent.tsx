"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { playSubmitSound } from "@/lib/voice-rx-sounds"
import {
  AlertCircle,
  Check,
  ChevronDown,
  Mic,
  MicOff,
  WifiOff,
} from "lucide-react"
import { Clock, Setting2 } from "iconsax-reactjs"
import { CaptionCarousel, VoiceTranscriptProcessingCard } from "./VoiceTranscriptProcessingCard"
import {
  TPDropdownMenu,
  TPDropdownMenuContent,
  TPDropdownMenuItem,
  TPDropdownMenuTrigger,
} from "@/components/tp-ui/tp-dropdown-menu"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useRxPadSync } from "@/components/tp-rxpad/rxpad-sync-context"
import { VoiceRxSiriWaveform } from "./VoiceRxSiriWaveform"
import { VoiceRxMiniFab, type VoiceRxMiniFabBannerTone } from "./VoiceRxMiniFab"
import { useNetConnection } from "./use-net-connection"
import { type VoiceConsultKind } from "./voice-consult-types"
import { playVoiceRxErrorSound, playVoiceRxStartSound } from "./voice-audio-utils"
import { TPConfirmDialog } from "@/components/tp-ui/tp-confirm-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface VoiceRxActiveAgentProps {
  mode: VoiceConsultKind
  transcript: string
  isAwaitingResponse: boolean
  /** Briefly true (~320ms) at the moment the panel is about to swap
   *  from the shiner card to the result tabs. We use it to play an
   *  exit animation on the shiner so the handoff doesn't read as a
   *  single-frame jump. */
  isHandoffExiting?: boolean
  onCancel: () => void
  /** Called on submit. Passes the elapsed recording duration in ms so the
   *  receiver can show it on the transcript card in chat. */
  onSubmit: (meta?: { durationMs: number }) => void
  onCollapse: () => void
  onExpand?: () => void
  isPanelVisible?: boolean
  onPauseChange?: (paused: boolean) => void
  /** Patient identity rendered as the left chip in the action dock. */
  patientName?: string
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

/**
 * Mock transformed transcripts shown in the shiner card during the
 * processing phase. We don't echo what the user actually said — the demo
 * always renders these curated samples so the shiner card looks the same
 * regardless of the live mic state.
 */
const MOCK_AMBIENT_TRANSCRIPT = [
  "Doctor: Hi, how are you feeling today?",
  "Patient: Doctor, I've had a headache for the past three days. It's mostly in the front, throbbing.",
  "Doctor: Any nausea or vomiting? Vision changes?",
  "Patient: A bit of dizziness when I stand up. Vision is fine.",
  "Doctor: Are you taking your blood pressure medication regularly?",
  "Patient: Yes, but I missed two days last week.",
  "Doctor: Okay, let's check your BP and review the meds. We'll also do a basic neuro check.",
  "Patient: Thank you, doctor.",
].join("\n")

const MOCK_DICTATION_TRANSCRIPT =
  "76-year-old male, known case of CKD G5 on PD and Type 2 Diabetes Mellitus. Presents with mild pedal oedema for one week, fatigue for two weeks, reduced appetite for one week. Vitals stable. BP 138 / 86, pulse 84. Continue Furosemide 40mg, increase if oedema persists. Repeat KFT and electrolytes in one week. Strict fluid log. Allergic to iodinated contrast and sulfonamides — avoid both."

function useRecordingTimer(active: boolean) {
  const [ms, setMs] = useState(0)
  const msRef = useRef(0)
  useEffect(() => { msRef.current = ms }, [ms])
  useEffect(() => {
    if (!active) return
    const start = performance.now() - msRef.current
    const iv = window.setInterval(() => setMs(performance.now() - start), 250)
    return () => window.clearInterval(iv)
  }, [active])
  return ms
}

function useMicStream(deviceId: string | undefined, enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const retry = useCallback(() => { setError(null); setRetryKey((k) => k + 1) }, [])

  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not supported in this browser"); return
    }
    let cancelled = false
    let acquired: MediaStream | null = null
    ;(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        })
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
        acquired = s; setStream(s); setError(null)
        try {
          const all = await navigator.mediaDevices.enumerateDevices()
          if (!cancelled) setDevices(all.filter((d) => d.kind === "audioinput"))
        } catch { /* ignore */ }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Microphone access denied")
      }
    })()
    return () => { cancelled = true; acquired?.getTracks().forEach((t) => t.stop()); setStream(null) }
  }, [deviceId, enabled, retryKey])

  // Watch for OS-level device changes (e.g. AirPods connecting). Re-enumerate
  // so the picker stays current; when on system default, re-acquire the
  // stream so it follows the new default device.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return
    const onChange = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices()
        setDevices(all.filter((d) => d.kind === "audioinput"))
      } catch { /* ignore */ }
      if (!deviceId && enabled) setRetryKey((k) => k + 1)
    }
    navigator.mediaDevices.addEventListener?.("devicechange", onChange)
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", onChange)
  }, [deviceId, enabled])

  return { stream, devices, error, retry }
}

function useActiveMic(
  stream: MediaStream | null,
  devices: MediaDeviceInfo[],
  selectedDeviceId: string | undefined,
) {
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined)
  const lastNotifiedRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (!track) return
    const id = (track.getSettings && track.getSettings().deviceId) || selectedDeviceId
    setActiveDeviceId(id || undefined)
  }, [stream, selectedDeviceId])

  const activeDevice = useMemo(() => {
    if (activeDeviceId) {
      const m = devices.find((d) => d.deviceId === activeDeviceId)
      if (m) return m
    }
    return devices[0]
  }, [devices, activeDeviceId])

  const activeLabel = activeDevice?.label || "System default mic"

  useEffect(() => {
    const id = activeDevice?.deviceId
    if (!id || !activeDevice?.label) return
    if (lastNotifiedRef.current === undefined) {
      lastNotifiedRef.current = id
      return
    }
    if (lastNotifiedRef.current !== id) {
      lastNotifiedRef.current = id
      toast.message("Microphone switched", { description: activeDevice.label })
    }
  }, [activeDevice])

  return { activeDevice, activeLabel }
}

function useLevelCssVar(
  targetRef: React.RefObject<HTMLElement | null>,
  levelRef: React.MutableRefObject<number>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) { targetRef.current?.style.setProperty("--vrx-level", "0"); return }
    let raf = 0
    const tick = () => {
      targetRef.current?.style.setProperty("--vrx-level", String(levelRef.current.toFixed(3)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, levelRef, targetRef])
}

/**
 * Word-level transcript with reveal-fade effect.
 * New words animate in with a very light color and settle, while text near the
 * top of the scroll area fades via a CSS gradient overlay.
 */
function AnimatedTranscript({
  text,
  paused,
  className,
}: {
  text: string
  paused: boolean
  className?: string
}) {
  const tokens = useMemo(() => (text ? text.split(/(\s+)/) : []), [text])
  const prevVisibleCountRef = useRef(0)
  let visibleIndex = -1
  const prevVisible = prevVisibleCountRef.current

  const rendered = tokens.map((tok, i) => {
    const isSpace = /^\s+$/.test(tok)
    if (isSpace) return <React.Fragment key={i}>{tok}</React.Fragment>
    visibleIndex += 1
    const isNew = visibleIndex >= prevVisible
    const stagger = Math.min((visibleIndex - prevVisible) * 30, 280)
    return (
      <span
        key={i}
        className="vrx-word"
        style={
          isNew
            ? { animation: `vrxWordReveal 600ms cubic-bezier(0.22,1,0.36,1) ${stagger}ms both` }
            : undefined
        }
      >
        {tok}
      </span>
    )
  })

  useEffect(() => { prevVisibleCountRef.current = visibleIndex + 1 })

  return (
    <p className={className}>
      {rendered}
      {!paused && <span className="vrx-caret" aria-hidden />}
    </p>
  )
}

export function VoiceRxActiveAgent({
  mode, transcript, isAwaitingResponse, isHandoffExiting = false, onCancel, onSubmit, onCollapse, onExpand,
  isPanelVisible = true, onPauseChange,
  patientName,
}: VoiceRxActiveAgentProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [manualMute, setManualMute] = useState(false)
  const [isCompactLayout, setIsCompactLayout] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [devicePopoverOpen, setDevicePopoverOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /**
   * Submit-phase split. The parent's `isAwaitingResponse` flips true as
   * soon as the user clicks Submit, but the user wants the submit slot
   * itself to spin for ~3 seconds while the rest of the active panel
   * (live transcript, action dock, mic pill) STAYS in place. After the
   * 3-second hold elapses, the panel transitions to the processing view
   * (transcript zone swaps for the shiner card).
   *
   *   processingPhase
   *     "idle"        — !isAwaitingResponse
   *     "submitting"  — first 3s after isAwaitingResponse went true
   *     "processing"  — after the 3s hold, until isAwaitingResponse falls
   */
  const [processingPhase, setProcessingPhase] = useState<"idle" | "submitting" | "processing">("idle")
  useEffect(() => {
    if (!isAwaitingResponse) {
      setProcessingPhase("idle")
      return
    }
    setProcessingPhase("submitting")
    const t = window.setTimeout(() => setProcessingPhase("processing"), 3000)
    return () => window.clearTimeout(t)
  }, [isAwaitingResponse])

  /**
   * The dock (waveform + mic + submit) needs an *exit* animation when
   * we cross from "submitting" → "processing", and the bottom-loader
   * needs an *entrance* immediately after. We can't do both with a
   * naked ternary — the dock would unmount instantly. So we lag the
   * loader mount by EXIT_MS while a `--exit` class on the dock plays
   * its slide-down. Same idea for the transcript zone above it: the
   * live transcript fades + drops, then the shiner card rises in.
   */
  const BOTTOM_EXIT_MS = 320
  const [bottomLoaderActive, setBottomLoaderActive] = useState(false)
  useEffect(() => {
    if (processingPhase !== "processing") {
      setBottomLoaderActive(false)
      return
    }
    const t = window.setTimeout(() => setBottomLoaderActive(true), BOTTOM_EXIT_MS)
    return () => window.clearTimeout(t)
  }, [processingPhase])
  const dockExiting = processingPhase === "processing" && !bottomLoaderActive

  const { online } = useNetConnection()
  const networkPaused = !online
  const paused = manualMute || networkPaused || isAwaitingResponse

  const elapsedMs = useRecordingTimer(!paused)
  const elapsedLabel = formatElapsed(elapsedMs)
  const { stream, devices, error: micError, retry: retryMic } = useMicStream(selectedDeviceId, !isAwaitingResponse)
  const { activeDevice, activeLabel } = useActiveMic(stream, devices, selectedDeviceId)
  const levelRef = useRef(0)

  const { setMicUnavailable } = useRxPadSync()
  useEffect(() => {
    setMicUnavailable(!!micError, micError || null)
    return () => setMicUnavailable(false)
  }, [micError, setMicUnavailable])

  useEffect(() => {
    if (!stream) return
    stream.getAudioTracks().forEach((t) => { t.enabled = !paused })
  }, [stream, paused])

  useEffect(() => { onPauseChange?.(paused) }, [paused, onPauseChange])

  useEffect(() => {
    const node = rootRef.current
    if (!node || typeof ResizeObserver === "undefined") return

    const update = () => {
      setIsCompactLayout(node.getBoundingClientRect().width < 340)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const transcriptRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = transcriptRef.current
    if (!el) return
    requestAnimationFrame(() => { el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }) })
  }, [transcript])

  // wobbleRef removed — blobs now driven directly by rAF in the blob useEffect

  // Submit enablement:
  //   • independent of manualMute — the user can mute but still submit
  //   • requires a non-empty transcript (nothing to save otherwise)
  //   • disabled while awaiting response from a previous submission
  //   • disabled while EITHER error is active (offline OR mic). Rationale:
  //       - offline: the network request to save can't succeed.
  //       - mic down mid-recording: lets the user stabilise before
  //         submitting; prevents half-captured syllables from going out
  //         as the final record. Submit re-enables the moment the error
  //         clears (so the captured transcript is never lost — just
  //         held back until the platform is healthy again).
  const canSubmit =
    !isAwaitingResponse
    && !networkPaused
    && !micError
    && transcript.trim().length > 0
  const handleDeviceSelect = useCallback((id: string) => { setSelectedDeviceId(id); setDevicePopoverOpen(false) }, [])
  const handleCancelConfirm = useCallback(() => { setConfirmOpen(false); onCancel() }, [onCancel])
  const handleRequestCancel = useCallback(() => setConfirmOpen(true), [])

  const statusLabel = useMemo(() => {
    if (isAwaitingResponse) return "Processing"
    if (!online) return "Waiting for connection"
    if (micError) return "Mic unavailable"
    if (manualMute) return "Paused"
    return "Listening"
  }, [isAwaitingResponse, online, micError, manualMute])

  const isListening = statusLabel === "Listening"

  // Inline empty-state shown over the transcript when something goes wrong.
  // Kind drives whether submit is blocked (offline → block; mic issue →
  // still allow, so the doctor can save what they already captured).
  const criticalBlock = useMemo<null | {
    kind: "offline" | "mic"
    icon: React.ReactNode
    title: string
    description: string
    submitBlocked: boolean
  }>(() => {
    if (!online) return {
      kind: "offline",
      icon: <WifiOff size={40} strokeWidth={2.2} absoluteStrokeWidth />,
      title: "You\u2019re offline",
      description: "Recording is paused until you\u2019re back online. Your transcript is safe — everything resumes automatically once the connection returns.",
      submitBlocked: true,
    }
    if (micError) return {
      kind: "mic",
      icon: <MicOff size={40} strokeWidth={2.2} absoluteStrokeWidth />,
      title: "Microphone unavailable",
      description: "Please allow microphone access in your browser. Submit is paused until the mic is working again — your transcript so far is safe.",
      submitBlocked: true,
    }
    return null
  }, [online, micError])

  const miniBanner = useMemo<{ tone: VoiceRxMiniFabBannerTone; icon: React.ReactNode; message: string } | null>(() => {
    if (!online) return { tone: "offline", icon: <WifiOff size={12} strokeWidth={2.4} />, message: "Offline \u2014 recording on hold" }
    if (micError) return { tone: "error", icon: <AlertCircle size={12} strokeWidth={2.4} />, message: micError.length > 40 ? micError.slice(0, 38) + "\u2026" : micError }
    return null
  }, [online, micError])

  useEffect(() => {
    if (criticalBlock) {
      setManualMute(true)
    }
  }, [criticalBlock])

  /**
   * Effective transcript shown in the centre. When the live transcript
   * is empty (mic blocked, demo environment, or just before any words
   * have been captured), and the user has hit submit, we substitute a
   * FLAT version of the scripted transcript — Doctor:/Patient: prefixes
   * stripped — so the live view always reads as one continuous monologue.
   * The structured Doctor/Patient split only appears AFTER the 3s submit
   * loader, inside the shiner card.
   */
  const fallbackScripted = useMemo(() => {
    const raw = mode === "ambient_consultation" ? MOCK_AMBIENT_TRANSCRIPT : MOCK_DICTATION_TRANSCRIPT
    return raw.replace(/^(Doctor|Patient):\s*/gim, "").replace(/\n+/g, " ").trim()
  }, [mode])
  const liveHasText = !!transcript && transcript.trim().length > 0
  const rawEffectiveTranscript = liveHasText
    ? transcript
    : (isAwaitingResponse ? fallbackScripted : transcript)
  // Freeze the transcript while a critical block (mic unavailable /
  // offline) is showing — neither add new dummy words nor wipe what the
  // doctor already captured. The blurred backdrop should hold steady
  // until they dismiss the error / regain access.
  const frozenTranscriptRef = useRef<string | null>(null)
  if (criticalBlock) {
    if (frozenTranscriptRef.current === null) frozenTranscriptRef.current = rawEffectiveTranscript
  } else if (frozenTranscriptRef.current !== null) {
    frozenTranscriptRef.current = null
  }
  const effectiveTranscript = frozenTranscriptRef.current ?? rawEffectiveTranscript
  const hasTranscript = !!effectiveTranscript && effectiveTranscript.trim().length > 0

  // ── Slim rAF loop — publishes the `--vrx-live-level` CSS variable
  //    consumed by VoiceRxLiveBorder. Blob morphing removed (the whole
  //    spectrum wash was deleted), so the loop is now just an envelope
  //    follower + one CSS var write per frame. Writes are debounced:
  //    only committed when the rounded value actually changes.
  useEffect(() => {
    const root = typeof document !== "undefined" ? document.documentElement : null
    if (!root) return
    let raf = 0
    let smoothed = 0
    let lastLevelPublished = -1
    const tick = () => {
      const target = paused ? 0 : levelRef.current
      // Asymmetric envelope — fast attack (0.55) catches each syllable,
      // slower release (0.22) prevents the rim from snapping back to rest
      // the moment the user pauses between words.
      const rate = target > smoothed ? 0.55 : 0.22
      smoothed += (target - smoothed) * rate
      if (target < 0.005 && smoothed < 0.01) smoothed = 0

      // Soft-knee compressor: tanh asymptotes so loud voice caps at ~0.40.
      const shaped = Math.tanh(smoothed * 2.2) * 0.40
      const clamped = Math.max(0, Math.min(0.40, shaped))
      const rounded = Math.round(clamped * 1000) / 1000
      if (rounded !== lastLevelPublished) {
        root.style.setProperty("--vrx-live-level", rounded.toFixed(3))
        lastLevelPublished = rounded
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      root.style.setProperty("--vrx-live-level", "0")
    }
  }, [paused, levelRef])

  useEffect(() => {
    playVoiceRxStartSound()
  }, [])

  const lastErrorToneRef = useRef<string | null>(null)
  useEffect(() => {
    const errorKey = criticalBlock ? `${criticalBlock.kind}:${criticalBlock.title}` : null
    if (!errorKey) {
      lastErrorToneRef.current = null
      return
    }
    if (lastErrorToneRef.current === errorKey) return
    lastErrorToneRef.current = errorKey
    playVoiceRxErrorSound()
  }, [criticalBlock])

  return (
    <>
      <div
        ref={rootRef}
        className={cn("relative flex h-full w-full flex-col overflow-hidden font-sans", !isPanelVisible && "invisible")}
        aria-hidden={!isPanelVisible}
      >
        {/* ── Background — transparent so parent panel gradient shows through ── */}
        <div className="absolute inset-0 bg-transparent" aria-hidden />

        {/* ── Ambient footer wash — soft TP-AI radial gradient sitting
             behind all card content (z-0) so the conversation surface
             reads as alive. Voice-reactive: width + opacity nudge with
             --vrx-live-level so the glow "breathes" with speaking. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[-40px] z-0 mx-auto h-[190px] w-[92%] max-w-[360px]"
          aria-hidden
          style={{
            background:
              "radial-gradient(58% 70% at 50% 58%, rgba(103,58,172,0.22) 0%, rgba(103,58,172,0.10) 45%, rgba(103,58,172,0.00) 100%), radial-gradient(38% 48% at 32% 70%, rgba(213,101,234,0.20) 0%, rgba(213,101,234,0.00) 100%), radial-gradient(38% 48% at 68% 70%, rgba(26,25,148,0.20) 0%, rgba(26,25,148,0.00) 100%)",
            filter: "blur(14px)",
            opacity: "calc(0.78 + var(--vrx-live-level, 0) * 0.35)",
            transform: "translateZ(0)",
          }}
        />

        {/* Behind-transcript blob animation removed — the edge-rim aura +
            Siri waveform already carry the "alive" signal; adding a
            second animated spectrum wash was competing for attention.
            The card is now visually calm behind the transcript. */}

        {/* ── Top bar: [← mode heading]  ·  [collapse]
             The heading pill mirrors the Dr. Agent brand tag (icon slot on
             the left + text on the right) — only the icon slot here is a
             BACK ARROW that opens the cancel-confirm dialog, so the user
             has two ways to exit (this + the footer × button). Text is
             plain dark label, no gradient fill. ────────────────────── */}
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between", isCompactLayout ? "px-[10px] pt-[12px]" : "px-[14px] pt-[14px]")}>
          <span
              className="vrx-mode-heading pointer-events-auto relative flex items-center gap-[4px] rounded-[10px] px-[8px] py-[6px]"
            style={{ animation: "vrxChipIn 320ms cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <button
              type="button"
              onClick={handleRequestCancel}
              aria-label="Go back"
              className="relative inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center bg-transparent text-tp-slate-700 transition-colors hover:text-tp-slate-900 active:scale-[0.92]"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span
              className="text-[14px] font-semibold leading-none text-tp-slate-700"
              style={{ letterSpacing: "0.1px" }}
            >
              {mode === "ambient_consultation" ? "Conversation Mode" : "Dictation Mode"}
            </span>

            {/* Kebab menu — same View session history / Settings actions
                as the Dr.Agent brand-pill kebab, surfaced inline next to
                the consult mode label so the doctor reaches them without
                leaving the active panel. */}
            <TPDropdownMenu>
              <TPDropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Consultation options"
                  /* Naked icon — no chip background, just the SVG with
                     a subtle hover color change. Heavier dot radius
                     keeps it visually present without a wrapper. */
                  className="relative inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center bg-transparent text-tp-slate-700 transition-colors hover:text-tp-slate-900 active:scale-[0.94]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
              </TPDropdownMenuTrigger>
              <TPDropdownMenuContent align="start" className="w-[220px]">
                <TPDropdownMenuItem className="flex items-center gap-1.5 hover:bg-tp-slate-100 hover:text-tp-slate-900 focus:bg-tp-slate-100 focus:text-tp-slate-900">
                  <Clock size={16} variant="Bulk" className="text-tp-violet-500" />
                  <span>View session history</span>
                </TPDropdownMenuItem>
                <TPDropdownMenuItem className="flex items-center gap-1.5 hover:bg-tp-slate-100 hover:text-tp-slate-900 focus:bg-tp-slate-100 focus:text-tp-slate-900">
                  <Setting2 size={16} variant="Bulk" className="text-tp-violet-500" />
                  <span>Settings</span>
                </TPDropdownMenuItem>
              </TPDropdownMenuContent>
            </TPDropdownMenu>
          </span>

          <button
            type="button"
            onClick={onCollapse}
            aria-label="Minimize agent"
            /* Liquid-glass chip — same .vrx-agent-collapse-tag visual
               language used by the chat-mode collapse so all three
               surfaces (chat / conversation / dictation) read as one
               family. 18px slate-700 glyph. */
            className="vrx-agent-collapse-tag pointer-events-auto inline-flex h-[32px] w-[32px] items-center justify-center rounded-[10px] text-tp-slate-700 transition-colors hover:text-tp-slate-900 active:scale-[0.95]"
            style={{ animation: "vrxChipIn 320ms cubic-bezier(0.16,1,0.3,1) 60ms both" }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Patient identity chip removed from the active VoiceRx panel
            at the user's direction — patient context is already conveyed
            by the Dr.Agent header above the panel. */}

        {/* ── Main body —
             No longer globally blurred when there's an error. Blur is now
             applied ONLY to the transcript block below, so the header /
             waveform / footer CTAs stay crisp and usable (important —
             user should still be able to close, collapse, and when it's
             a mic-issue, still submit their captured transcript). */}
        <div className="relative flex min-h-0 flex-1 flex-col">

          {/* ── Transcript zone: VERTICALLY CENTERED ──
               When a submit is in flight (`isAwaitingResponse`), the
               transcript area swaps for the post-submit processing card.
               The header, collapse, mute, mic-picker, listening tag and
               action row all stay in place so the doctor can still go
               back / collapse / cancel during processing. */}
          {bottomLoaderActive ? (
            <div className={cn("vrx-transcript-zone-in relative flex min-h-0 flex-1 flex-col items-stretch justify-center gap-[14px]", isCompactLayout ? "px-[16px] pt-[64px] pb-[12px]" : "px-[24px] pt-[80px] pb-[16px]", isHandoffExiting && "vrx-shiner-handoff-exit")}>
              {/* Mock transformed transcript — for the demo, the shiner
                  card always shows curated content so the visual is
                  predictable regardless of the live mic state. */}
              <VoiceTranscriptProcessingCard
                mode={mode === "ambient_consultation" ? "ambient_consultation" : "dictation"}
                transcript={mode === "ambient_consultation" ? MOCK_AMBIENT_TRANSCRIPT : MOCK_DICTATION_TRANSCRIPT}
              />
              {/* Caption + progress bar sit RIGHT BELOW the shiner card so
                  the two read as one tightly coupled "we're working" unit
                  — earlier the loader anchored to the panel's bottom edge
                  which left a large dead gap when the shiner was small. */}
              <div className={cn("vrx-shiner-loader flex flex-col items-center gap-[10px]", isHandoffExiting && "vrx-bottom-loader--exit")}>
                <CaptionCarousel />
                <div className="vrx-progress-track relative h-[5px] w-[240px] overflow-hidden rounded-full bg-tp-slate-100/80 shadow-[0_0_0_1px_rgba(75,74,213,0.08),0_4px_14px_-6px_rgba(75,74,213,0.35)]">
                  <span
                    aria-hidden
                    className="vrx-progress-fill absolute inset-y-0 left-0 block w-full rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--ai-pink, #D565EA) 0%, var(--ai-violet, #673AAC) 50%, var(--ai-indigo, #1A1994) 100%)",
                    }}
                  />
                  <span aria-hidden className="vrx-progress-sheen absolute inset-y-0 left-0 block w-[40%] rounded-full" />
                </div>
              </div>
              <style>{`
                .vrx-progress-sheen {
                  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%);
                  animation: vrxLoaderSheen 1.8s linear infinite;
                }
                @keyframes vrxLoaderSheen {
                  0%   { transform: translateX(-120%); }
                  100% { transform: translateX(360%); }
                }
                @media (prefers-reduced-motion: reduce) {
                  .vrx-progress-sheen { animation: none; }
                }
              `}</style>
            </div>
          ) : (
          <div className={cn("relative flex min-h-0 flex-1 flex-col items-center justify-center", isCompactLayout ? "px-[16px] pt-[88px]" : "px-[24px] pt-[100px]", dockExiting && "vrx-transcript-zone--exit")}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[130px]"
              aria-hidden
              style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0) 100%)" }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[60px]"
              aria-hidden
              style={{ background: "linear-gradient(to top, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)" }}
            />
            {/* Transcript — shown only when there's no error.
                When a transcript is in progress AND an error arrives, the
                transcript stays visible underneath but blurred so the user
                sees their captured words are safe.
                When there's no transcript yet AND an error fires, we skip
                the "Start speaking…" placeholder entirely — the empty
                state below is the primary content, centered cleanly. */}
            {!criticalBlock || hasTranscript ? (
              <div
                ref={transcriptRef}
                className={cn(
                  "vrx-scroll w-full overflow-y-auto transition-[filter,opacity] duration-300",
                  criticalBlock && hasTranscript && "blur-[6px] saturate-[0.85] opacity-60",
                )}
                style={{ scrollbarWidth: "none", maxHeight: isCompactLayout ? "240px" : "280px" }}
              >
                {hasTranscript ? (
                  <AnimatedTranscript
                    text={effectiveTranscript}
                    paused={paused}
                    className={cn("text-center font-normal tracking-[-0.01em] text-tp-slate-400 whitespace-pre-wrap break-words", isCompactLayout ? "text-[16px] leading-[1.68]" : "text-[20px] leading-[1.75]")}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center" style={{ animation: "vrxTextIn 420ms ease-out both" }}>
                    <p className={cn("font-light text-tp-slate-400/60", isCompactLayout ? "text-[14px] leading-[1.55]" : "text-[16px] leading-[1.6]")}>
                      Start speaking, you&rsquo;ll see the caption here
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* ── Inline empty state — shown OVER the (optionally blurred)
                 transcript when the mic is unavailable or the user is
                 offline. No popup, no close button; this is the same
                 screen, calmer. Icon is a bold Lucide glyph in a neutral
                 light-slate tint with reduced opacity, followed by a
                 concise title + description. Fades in after a short
                 delay so we don't flash on transient blips. ─────────── */}
            {criticalBlock && (
              <div
                className="vrx-empty-state absolute inset-0 z-[3] flex flex-col items-center justify-center px-[32px] text-center"
                role="status"
                aria-live="polite"
              >
                {/* Illustrated empty-state mark — chunky bold icon inside
                    a concentric halo. Reads more like an illustration
                    than a button. */}
                <span
                  className="vrx-empty-mark pointer-events-none relative inline-flex h-[96px] w-[96px] items-center justify-center rounded-full"
                  aria-hidden
                >
                  {/* Lighter neutral halos — slate-100/50 + slate-200/40
                      instead of the previous 65/55 intensities. Reads as
                      a subtle empty-state mark, not a filled alert. */}
                  <span className="absolute inset-0 rounded-full bg-tp-slate-100/50" />
                  <span className="absolute inset-[10px] rounded-full bg-tp-slate-200/40" />
                  <span className="relative inline-flex h-[58px] w-[58px] items-center justify-center rounded-full bg-white text-tp-slate-400 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04),0_2px_8px_-2px_rgba(15,23,42,0.06)]">
                    {criticalBlock.icon}
                  </span>
                </span>

                {/* Lighter neutral tones for title + description — slate-500
                    title and slate-400 description, closer to the 200-300
                    range the user asked for (still with enough contrast
                    to be readable). */}
                <h3 className="pointer-events-none mt-[18px] text-[16px] font-semibold tracking-[-0.01em] text-tp-slate-500">
                  {criticalBlock.title}
                </h3>
                <p className={cn("pointer-events-none mt-[6px] text-[12px] leading-[1.55] text-tp-slate-400", isCompactLayout ? "max-w-[240px]" : "max-w-[280px]")}>
                  {criticalBlock.description}
                </p>

                {/* Mic-case CTA — small secondary using the TP design
                    system spec: min-height 36px, 10px radius (not a
                    pill), TP brand blue (tp-blue-500 #4B4AD5). Clicking
                    re-triggers getUserMedia so the browser shows its
                    native permission prompt. */}
                {criticalBlock.kind === "mic" && (
                  <button
                    type="button"
                    onClick={retryMic}
                    className="pointer-events-auto mt-[18px] inline-flex min-h-[36px] items-center gap-[6px] rounded-[10px] border bg-transparent px-[14px] text-[14px] font-semibold transition-colors active:scale-[0.98]"
                    style={{
                      color: "var(--tp-blue-500)",
                      borderColor: "var(--tp-blue-500)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--tp-blue-50)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <Mic size={14} strokeWidth={2.2} aria-hidden />
                    Allow microphone access
                  </button>
                )}
              </div>
            )}
          </div>
          )}

          {/* ── Bottom zone: waveform + CTAs + status ──
               During the processing phase, this whole block animates out
               (slide-down + fade) and is replaced by the CaptionCarousel
               loader sitting in its place at the bottom. */}
          {bottomLoaderActive ? (
            // Loader is now rendered INSIDE the centered transcript zone
            // above (right beneath the shiner card) so the two read as
            // a single unit. Keep the bottom block empty during the
            // processing phase rather than reserving a tall slot.
            null
          ) : (
          <div className={cn("vrx-bottom-block relative z-10 shrink-0 overflow-visible", dockExiting && "vrx-bottom-block--exit")}>
            {/* Footer blob removed — it sat INSIDE the card shell and was
                dimming the "Listening" text + dots. The listening feedback
                now reads crisply against the plain card background. Any
                ambient wash belongs behind the whole shell, not inside. */}
            {/* Waveform — hidden when an error is shown so the empty-state
                above can center cleanly in the available vertical space.
                Reserved height stays via a spacer so CTA row doesn't jump. */}
            {!criticalBlock ? (
              <div
                className="relative"
                // Nudged lower: extra top margin, smaller bottom margin so
                // the visualizer sits closer to the footer CTAs — reduces
                // the empty air between the transcript and the waveform.
                style={{
                  marginLeft: isCompactLayout ? "-16px" : "-22px",
                  marginRight: isCompactLayout ? "-16px" : "-22px",
                  marginTop: isCompactLayout ? "20px" : "28px",
                  marginBottom: isCompactLayout ? "10px" : "14px",
                  width: isCompactLayout ? "calc(100% + 32px)" : "calc(100% + 44px)",
                }}
              >
                {/* Shorter + more subtle: 88→56 px height and 0.75
                    opacity so the waveform reads as a supporting signal
                    rather than the hero of the frame. */}
                <VoiceRxSiriWaveform
                  stream={stream}
                  paused={paused}
                  levelRef={levelRef}
                  className={cn("relative px-0 opacity-75", isCompactLayout ? "h-[48px] min-h-[48px]" : "h-[56px] min-h-[56px]")}
                />
              </div>
            ) : (
              <div style={{ height: 32 }} aria-hidden />
            )}

            {/* ── Floating CTAs — Apple-style liquid glass with gradient
                dividers (original layout). No surrounding dock container,
                no shine border. The patient identity sits as a floating
                chip above the panel; the mic option lives in the bottom
                listening row. */}
            <div className={cn("relative z-10 flex items-center justify-center", isCompactLayout ? "gap-[10px] pb-[18px] pt-[10px]" : "gap-[14px] pb-[24px] pt-[14px]")}>
              {/* Close — deeper TP red fill as the single default state.
                  Stands out confidently regardless of error state; no
                  separate "emphasis" variant needed anymore. */}
              <button
                type="button"
                onClick={handleRequestCancel}
                aria-label="End voice consultation"
                className="vrx-lg-btn vrx-close-btn group relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] transition-transform active:scale-[0.94]"
              >
                <span className="vrx-lg-surface" aria-hidden />
                <span className="vrx-lg-sheen" aria-hidden />
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="relative text-[#DC2626] transition-colors">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <span className="vrx-cta-divider" aria-hidden />

              {/* Segmented mic control — ONE card with the glossy
                  treatment, two clickable regions inside (mute / device
                  picker) split by the hairline divider. The outer shell
                  defines the 12px corner radius and clips with
                  overflow-hidden so the inner buttons don't get to draw
                  their own rounded edges (no nested-card look). */}
              <div
                className={cn(
                  "vrx-lg-btn relative flex h-[42px] items-stretch overflow-hidden rounded-[12px] transition-opacity",
                  (criticalBlock || isAwaitingResponse) && "opacity-60",
                  criticalBlock && "pointer-events-none",
                  manualMute && "vrx-mic-muted"
                )}
              >
                <span className="vrx-lg-surface" aria-hidden />
                <span className="vrx-lg-sheen" aria-hidden />

                {/* Left segment — mute / unmute */}
                <button
                  type="button"
                  onClick={() => setManualMute((v) => !v)}
                  disabled={networkPaused || isAwaitingResponse}
                  aria-label={manualMute ? "Unmute microphone" : "Mute microphone"}
                  aria-pressed={manualMute}
                  className={cn(
                    "relative flex h-full w-[44px] items-center justify-center transition-transform active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-60",
                    manualMute ? "text-amber-600" : "text-tp-slate-500",
                  )}
                >
                  <span className="relative inline-flex h-[24px] w-[24px] items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M19.12 9.12c-.39 0-.7.31-.7.7v1.58c0 3.54-2.88 6.42-6.42 6.42s-6.42-2.88-6.42-6.42V9.81c0-.39-.31-.7-.7-.7-.39 0-.7.31-.7.7v1.58c0 4.07 3.13 7.42 7.12 7.78v2.13c0 .39.31.7.7.7.39 0 .7-.31.7-.7v-2.13c3.98-.35 7.12-3.71 7.12-7.78V9.81a.707.707 0 0 0-.7-.69Z" />
                      <path d="M12 2c-2.44 0-4.42 1.98-4.42 4.42v5.12c0 2.44 1.98 4.42 4.42 4.42s4.42-1.98 4.42-4.42V6.42C16.42 3.98 14.44 2 12 2Zm1.31 6.95c-.07.26-.3.43-.56.43-.05 0-.1-.01-.15-.02-.39-.11-.8-.11-1.19 0-.32.09-.63-.1-.71-.41-.09-.31.1-.63.41-.71.59-.16 1.21-.16 1.8 0 .3.08.48.4.4.71Zm.53-1.94c-.09.24-.31.38-.55.38-.07 0-.14-.01-.2-.03-.69-.26-1.47-.26-2.17 0-.3.11-.63-.05-.74-.35-.11-.3.05-.63.35-.74.97-.35 2.03-.35 3 0 .3.11.46.44.31.74Z" />
                    </svg>
                    {manualMute && (
                      <svg
                        aria-hidden
                        viewBox="0 0 20 20"
                        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                      >
                        {/* tiny white halo behind the slash so it reads on top of the mic glyph */}
                        <line x1="3.5" y1="16.5" x2="16.5" y2="3.5" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
                        <line x1="3.5" y1="16.5" x2="16.5" y2="3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    )}
                  </span>
                </button>

                <div className="vrx-lg-divider" aria-hidden />

                {/* Right segment — device picker popover trigger */}
                <Popover open={devicePopoverOpen} onOpenChange={setDevicePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={!!criticalBlock || isAwaitingResponse}
                      aria-label="Choose microphone"
                      className={cn(
                        "relative flex h-full w-[28px] items-center justify-center transition-transform active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60",
                        manualMute ? "text-amber-600 hover:text-amber-700" : "text-tp-slate-500 hover:text-tp-slate-700"
                      )}
                    >
                      <ChevronDown
                        size={16}
                        strokeWidth={2.5}
                        className={cn("relative transition-transform duration-200", devicePopoverOpen && "rotate-180")}
                        aria-hidden
                      />
                    </button>
                  </PopoverTrigger>
                <PopoverContent
                  align="center" side="top" sideOffset={8}
                  data-voice-allow
                  className="overflow-hidden rounded-2xl border border-tp-slate-200 bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.08)] w-[260px]"
                >
                  <div className="flex items-center gap-2 px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-tp-slate-400">Microphone</div>
                  {devices.length === 0 ? (
                    <div className="px-3 py-3 text-[14px] text-tp-slate-500">{micError ? micError : "No input devices detected"}</div>
                  ) : (
                    devices.map((d, i) => {
                      const isSelected = activeDevice?.deviceId === d.deviceId || (selectedDeviceId ? selectedDeviceId === d.deviceId : i === 0)
                      return (
                        <button key={d.deviceId || i} type="button" onClick={() => handleDeviceSelect(d.deviceId)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors",
                            isSelected
                              ? "bg-tp-slate-100 font-semibold text-tp-slate-900"
                              : "text-tp-slate-700 hover:bg-tp-slate-50",
                          )}
                        >
                          <span className="truncate">{d.label || `Microphone (${(d.deviceId || "default").slice(0, 6)})`}</span>
                          {isSelected && <Check size={14} className="shrink-0 text-tp-slate-700" />}
                        </button>
                      )
                    })
                  )}
                </PopoverContent>
              </Popover>
              </div>

              <span className="vrx-cta-divider" aria-hidden />

              {/* Submit slot — when not awaiting, render the gradient
                  hero CTA. The moment a consult is submitted, the whole
                  AI gradient surface vanishes from this slot and a
                  neutral loader pill takes its place at the same height
                  so the action row's rhythm is preserved. */}
              {isAwaitingResponse ? (
                <div
                  role="status"
                  aria-label="Processing consultation"
                  className="relative flex h-[42px] min-w-[120px] items-center justify-center gap-[8px] rounded-[12px]"
                  style={{
                    background: "rgba(255,255,255,0.65)",
                    backdropFilter: "blur(10px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(10px) saturate(1.4)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.7), 0 1px 6px rgba(15,23,42,0.06)",
                  }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-tp-slate-200 border-t-tp-slate-400"
                  />
                  <span className="text-[14px] font-semibold tracking-[0.05px] text-tp-slate-400">
                    Processing
                  </span>
                </div>
              ) : (
              <button
                type="button"
                onClick={() => { playSubmitSound(); onSubmit({ durationMs: elapsedMs }) }}
                disabled={!canSubmit}
                aria-label="Submit consultation"
                className={cn(
                  "vrx-submit-hero group relative flex h-[42px] items-center gap-[8px] overflow-hidden rounded-[12px] pl-[18px] pr-[22px] text-white transition-transform",
                  canSubmit ? "hover:scale-[1.03] active:scale-[0.97]" : "vrx-submit-dim cursor-not-allowed",
                  criticalBlock && "opacity-50",
                )}
              >
                {/* Inner gradient + top sheen — both use rounded-[inherit]
                    so the inner & outer corner radii stay locked together
                    (no mismatched curvature at the rounded edges). */}
                <span className="vrx-submit-gradient absolute inset-0 rounded-[inherit]" aria-hidden />
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-[55%] rounded-[inherit]"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 100%)" }}
                  aria-hidden
                />
                {/* Shimmer sweep — only plays when the button is enabled. */}
                {canSubmit ? (
                  <span
                    aria-hidden
                    className="vrx-submit-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]"
                  />
                ) : null}
                <span className="relative z-[1] flex items-center gap-[8px]">
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M20.46 6.17969L8.82003 17.8197L3.53003 12.5297" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-semibold tracking-[0.2px] text-[14px]">Submit</span>
                </span>
              </button>
              )}
            </div>

            {/* ── Status indicator — "Listening" text + animated dots.
                 Hidden entirely while an inline empty-state is up: the
                 empty state already tells the user what's happening, and
                 a separate "Listening / Reconnecting" feedback below it
                 conflicts with the message shown above. ────────────── */}
              <div className="flex items-end justify-center pt-[8px]">
                <div
                  className={cn(
                    "vrx-status-card relative inline-flex items-center gap-[8px] rounded-t-[12px] rounded-b-none bg-white/60 pl-[12px] pr-[14px] pt-[7px] pb-[10px] backdrop-blur-[10px] transition-all duration-200",
                    criticalBlock ? "vrx-status-card--error" : manualMute && "vrx-status-card--paused",
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {criticalBlock ? (
                    <span className="inline-flex h-[14px] w-[14px] items-center justify-center text-red-500">
                      <AlertCircle size={14} strokeWidth={2.4} />
                    </span>
                  ) : isListening ? (
                    <span className="relative inline-flex h-[10px] w-[10px] items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-rose-400" />
                      <span className="absolute inset-0 rounded-full bg-rose-400/55" style={{ animation: "vrxRecRing 1.8s ease-out infinite" }} />
                    </span>
                  ) : manualMute ? (
                    <span className="inline-flex h-[10px] w-[10px] items-center justify-center text-amber-500/80">
                      <svg width={7} height={9} viewBox="0 0 8 10" fill="none" aria-hidden>
                        <rect x="0" y="0" width="3" height="10" rx="1" fill="currentColor" />
                        <rect x="5" y="0" width="3" height="10" rx="1" fill="currentColor" />
                      </svg>
                    </span>
                  ) : (
                    <span className="inline-block h-[7px] w-[7px] rounded-full bg-tp-slate-400/70" />
                  )}

                  <span className={cn(
                    "text-[14px] font-medium tracking-[-0.05px] leading-none tabular-nums",
                    criticalBlock ? "text-red-600" : "text-tp-slate-600",
                  )}>
                    {statusLabel}
                    {!criticalBlock && (isListening || manualMute) && elapsedMs > 0 && (
                      <span className="ml-[6px] font-normal text-tp-slate-400">
                        ({elapsedLabel})
                      </span>
                    )}
                  </span>
                </div>
              </div>
          </div>
          )}
        </div>

        {/* The old hard-popup "critical overlay" was removed. The inline
            empty-state inside the transcript zone replaces it: same screen,
            no modal, no close/cross button. The header (back + collapse)
            and footer CTAs (close / mic / submit) stay available so the
            user can always act — submit on mic errors, close anytime. */}

        <TPConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Close this voice consultation?"
          warning="Are you sure you want to close this voice Rx? If you close it, no data will be stored."
          secondaryLabel="Keep recording"
          onSecondary={() => setConfirmOpen(false)}
          primaryLabel="Close and discard"
          primaryTone="destructive"
          onPrimary={handleCancelConfirm}
        />

        <style>{`
          @keyframes vrxRec {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.45; transform: scale(0.78); }
          }
          @keyframes vrxChipIn {
            from { opacity: 0; transform: translateY(-6px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }

          /* .vrx-agent-glossy-btn was removed when the minimize button
             was stripped to a naked 16px SVG with hover color change. */

          /* Liquid-glass chip — same recipe used by AgentHeader so the
             chat-mode and conversation/dictation-mode collapse buttons
             share one visual language. Lives here too so the rule is
             present regardless of mount order. */
          .vrx-agent-collapse-tag {
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
          .vrx-agent-collapse-tag:hover {
            background:
              linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.38) 100%),
              linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(75,74,213,0.10) 100%);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,1),
              inset 0 0 0 1px rgba(15,23,42,0.12),
              0 6px 16px -4px rgba(15,23,42,0.12);
          }

          /* ── Mode heading pill — liquid-glass card tinted with the AI
                gradient, wrapping a shimmering gradient text. Reads as a
                branded "title bar" without needing an icon. ─────────── */
          .vrx-mode-heading {
            background:
              linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.20) 100%),
              linear-gradient(135deg, rgba(213,101,234,0.16) 0%, rgba(103,58,172,0.12) 55%, rgba(75,74,213,0.12) 100%);
            /* Cheaper backdrop-filter — 12px blur, saturate removed. Each
               backdrop-filter resamples everything behind it every frame;
               with the animated blob + edge strips, the previous
               blur(24px) + saturate(200%) stack was the biggest paint
               cost on this face. */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.85),
              inset 0 0 0 1px rgba(103,58,172,0.14),
              0 4px 12px -4px rgba(103,58,172,0.12);
          }
          /* .vrx-mode-heading-back was removed when the back button was
             stripped to a naked 16px SVG with hover color change. */

          @keyframes vrxTextIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes vrxWordReveal {
            from { opacity: 0; color: rgba(148,163,184,0.3); transform: translateY(4px); filter: blur(1.5px); }
            60%  { opacity: 1; color: rgba(148,163,184,0.55); transform: translateY(0); filter: blur(0); }
            to   { opacity: 1; color: inherit; transform: translateY(0); filter: blur(0); }
          }
          .vrx-word { display: inline; }
          .vrx-caret {
            display: inline-block; width: 2px; height: 0.85em;
            background: currentColor; margin-left: 3px; vertical-align: -2px;
            animation: vrxCaret 1s steps(1) infinite; opacity: 0.4;
          }
          @keyframes vrxCaret { 50% { opacity: 0; } }
          .vrx-scroll::-webkit-scrollbar { width: 0; height: 0; }

          /* Plain mic chip — sits below the header, deliberately simple
             (white background, thin slate border, soft shadow) so it
             reads as a system-status indicator, not a hero CTA. */
          .vrx-mic-chip {
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.10);
            box-shadow:
              0 1px 2px rgba(15, 23, 42, 0.04),
              0 4px 10px -6px rgba(15, 23, 42, 0.10);
            transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease;
          }
          .vrx-mic-chip:hover {
            background: #fafbfc;
            border-color: rgba(15, 23, 42, 0.16);
            box-shadow:
              0 1px 2px rgba(15, 23, 42, 0.06),
              0 6px 14px -6px rgba(15, 23, 42, 0.14);
          }

          /* Squircle — Apple-smoothed corners at 18px radius */
          .vrx-squircle {
            border-radius: 18px;
            /* iOS-smooth corner feel via higher radius + overflow hidden on gradient bg */
          }

          /* Vertical gradient divider between CTAs — fades at the ends */
          .vrx-cta-divider {
            display: inline-block;
            width: 1px;
            height: 36px;
            background: linear-gradient(
              180deg,
              transparent 0%,
              rgba(255,255,255,0.15) 18%,
              rgba(148,163,184,0.55) 50%,
              rgba(255,255,255,0.15) 82%,
              transparent 100%
            );
            flex-shrink: 0;
          }

          /* Apple-style liquid glass CTA — each button is its own glass surface */
          .vrx-lg-btn {
            isolation: isolate;
            position: relative;
            cursor: pointer;
          }
          .vrx-lg-surface {
            position: absolute; inset: 0; border-radius: inherit;
            background: linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.60) 100%);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border: 1px solid rgba(255,255,255,0.85);
            box-shadow:
              0 10px 28px -10px rgba(31,38,135,0.18),
              0 4px 12px -4px rgba(15,23,42,0.08),
              inset 0 1.5px 0 rgba(255,255,255,1),
              inset 0 -1px 0 rgba(255,255,255,0.55),
              inset 1px 0 0 rgba(255,255,255,0.5),
              inset -1px 0 0 rgba(255,255,255,0.5);
            transition: background 220ms ease, box-shadow 220ms ease;
          }
          .vrx-lg-btn:hover .vrx-lg-surface {
            background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 100%);
            box-shadow:
              0 14px 34px -10px rgba(31,38,135,0.22),
              0 6px 16px -4px rgba(15,23,42,0.10),
              inset 0 1.5px 0 rgba(255,255,255,1),
              inset 0 -1px 0 rgba(255,255,255,0.6),
              inset 1px 0 0 rgba(255,255,255,0.55),
              inset -1px 0 0 rgba(255,255,255,0.55);
          }
          .vrx-lg-sheen {
            pointer-events: none;
            position: absolute; left: 12%; right: 12%; top: 1px; height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 50%, transparent 100%);
            border-radius: 9999px;
            z-index: 1;
          }
          .vrx-lg-divider {
            width: 1px;
            margin: 14px 0;
            background: linear-gradient(180deg, transparent, rgba(15,23,42,0.14) 30%, rgba(15,23,42,0.14) 70%, transparent);
            position: relative;
            z-index: 1;
          }

          /* ── Close button — deeper TP red gloss, default state.
             Shadow intensities lowered (user felt the previous shadow
             was "too heavy"). Keeps the same glossy two-stop fill +
             inset highlights — just a lighter halo beneath it. */
          .vrx-close-btn .vrx-lg-surface {
            background: linear-gradient(180deg, rgba(252, 195, 195, 0.95) 0%, rgba(249, 168, 168, 0.85) 100%);
            border: 1px solid rgba(220, 38, 38, 0.18);
            box-shadow:
              0 6px 16px -6px rgba(220, 38, 38, 0.18),
              0 2px 6px -2px rgba(220, 38, 38, 0.12),
              inset 0 1px 0 rgba(255,255,255,0.85),
              inset 0 -1px 0 rgba(220, 38, 38, 0.08);
          }
          .vrx-close-btn:hover .vrx-lg-surface {
            background: linear-gradient(180deg, rgba(250, 180, 180, 1) 0%, rgba(248, 150, 150, 0.9) 100%);
            border: 1px solid rgba(220, 38, 38, 0.24);
            box-shadow:
              0 8px 20px -6px rgba(220, 38, 38, 0.24),
              0 3px 8px -2px rgba(220, 38, 38, 0.16),
              inset 0 1px 0 rgba(255,255,255,0.92),
              inset 0 -1px 0 rgba(220, 38, 38, 0.10);
          }

          /* ── Mic pill — same glossy two-stop pattern as the close, in a
             warm neutral tone so it sits calmly next to the rose close.
             Slightly creamy-slate gradient + soft slate halo shadow,
             matching the new lower shadow weight. */
          .vrx-lg-btn:not(.vrx-close-btn):not(.vrx-mic-muted) .vrx-lg-surface {
            background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(241, 245, 249, 0.82) 100%);
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow:
              0 6px 16px -6px rgba(15, 23, 42, 0.16),
              0 2px 6px -2px rgba(15, 23, 42, 0.10),
              inset 0 1px 0 rgba(255,255,255,1),
              inset 0 -1px 0 rgba(15, 23, 42, 0.05);
          }
          .vrx-lg-btn:not(.vrx-close-btn):not(.vrx-mic-muted):hover .vrx-lg-surface {
            background: linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248, 250, 252, 0.92) 100%);
            border: 1px solid rgba(15, 23, 42, 0.12);
            box-shadow:
              0 8px 20px -6px rgba(15, 23, 42, 0.22),
              0 3px 8px -2px rgba(15, 23, 42, 0.14),
              inset 0 1px 0 rgba(255,255,255,1),
              inset 0 -1px 0 rgba(15, 23, 42, 0.07);
          }

          /* Mic pill — muted state: soft orange glass */
          .vrx-mic-muted .vrx-lg-surface {
            background: linear-gradient(180deg, rgba(253, 230, 178, 0.75) 0%, rgba(250, 209, 143, 0.55) 100%);
            border: 1px solid rgba(245, 158, 11, 0.35);
            box-shadow:
              0 10px 28px -10px rgba(217, 119, 6, 0.32),
              0 4px 12px -4px rgba(217, 119, 6, 0.18),
              inset 0 1px 0 rgba(255,255,255,0.85),
              inset 0 -1px 0 rgba(217, 119, 6, 0.12);
          }
          /* Muted hover — retain orange, just lighten intensity slightly */
          .vrx-mic-muted:hover .vrx-lg-surface {
            background: linear-gradient(180deg, rgba(253, 235, 195, 0.65) 0%, rgba(250, 215, 160, 0.45) 100%);
            border: 1px solid rgba(245, 158, 11, 0.25);
            box-shadow:
              0 10px 28px -10px rgba(217, 119, 6, 0.24),
              0 4px 12px -4px rgba(217, 119, 6, 0.14),
              inset 0 1px 0 rgba(255,255,255,0.9),
              inset 0 -1px 0 rgba(217, 119, 6, 0.08);
          }

          /* Submit disabled — keep the gradient, just dim via opacity */
          .vrx-submit-dim {
            opacity: 0.5;
            filter: saturate(0.85);
          }

          /* Submit hero — animated TP AI gradient. Shadow weight brought
             down to match the new lighter close / mic shadow scale, plus
             a brighter inset-top highlight + subtle inset-bottom
             darken for the same glossy liquid feel as the close. */
          .vrx-submit-hero {
            box-shadow:
              0 6px 16px -6px rgba(103, 58, 172, 0.38),
              0 2px 6px -2px rgba(103, 58, 172, 0.24),
              inset 0 1px 0 rgba(255, 255, 255, 0.55),
              inset 0 -1px 0 rgba(15, 23, 42, 0.14);
          }
          .vrx-submit-hero:hover {
            box-shadow:
              0 8px 20px -6px rgba(103, 58, 172, 0.46),
              0 3px 8px -2px rgba(103, 58, 172, 0.30),
              inset 0 1px 0 rgba(255, 255, 255, 0.62),
              inset 0 -1px 0 rgba(15, 23, 42, 0.16);
          }
          /* Static TP AI gradient — no shifting/animation. The sheen
             sweep overlay (.vrx-submit-sheen) provides the only motion
             on the button. */
          .vrx-submit-gradient {
            background: linear-gradient(135deg, #D565EA 0%, #673AAC 55%, #1A1994 100%);
            border-radius: inherit;
          }

          /* Submit flip removed — submit slot now hard-swaps between
             the gradient hero CTA and a neutral loader pill, rather
             than rotating the same surface in place. */

          /* Bottom-loader entrance — caption + progress bar slide up
             from below into the slot the dock just vacated, with a
             subtle fade so the transition reads as a hand-off, not a
             pop. */
          .vrx-bottom-loader {
            animation: vrxBottomLoaderIn 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          @keyframes vrxBottomLoaderIn {
            0%   { opacity: 0; transform: translateY(22px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          /* Dock exit — when we cross from "submitting" → "processing"
             the dock slides DOWN and fades out before the loader rises
             from below. Duration matches BOTTOM_EXIT_MS (320ms). */
          .vrx-bottom-block--exit {
            animation: vrxBottomBlockExit 320ms cubic-bezier(0.4, 0, 1, 1) both;
            pointer-events: none;
          }
          @keyframes vrxBottomBlockExit {
            0%   { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(28px); }
          }

          /* Live-transcript exit + shiner-card entrance —
             during the same 320ms hand-off, the upper transcript zone
             scales down + fades, then the shiner card lifts in from
             below as the loader appears. Together with the dock exit
             this reads as one coordinated "the consult is being
             transformed" gesture. */
          .vrx-transcript-zone--exit {
            animation: vrxTranscriptZoneExit 320ms cubic-bezier(0.4, 0, 1, 1) both;
          }
          @keyframes vrxTranscriptZoneExit {
            0%   { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-10px) scale(0.985); }
          }
          .vrx-transcript-zone-in {
            animation: vrxTranscriptZoneIn 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          @keyframes vrxTranscriptZoneIn {
            0%   { opacity: 0; transform: translateY(18px) scale(0.985); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .vrx-transcript-zone--exit,
            .vrx-transcript-zone-in,
            .vrx-bottom-block--exit { animation: none; opacity: 1; transform: none; }
          }

          /* Shiner-card → result-tabs handoff. The shiner zone slides
             UP and fades out while the bottom-loader gently drops out;
             VoiceRxResultTabs (mounted ~320ms later) slides in from
             the top against this empty stage, so the visual reads as
             one coordinated swap instead of a single-frame jump. */
          .vrx-shiner-handoff-exit {
            animation: vrxShinerHandoffExit 320ms cubic-bezier(0.4, 0, 1, 1) both;
            pointer-events: none;
          }
          @keyframes vrxShinerHandoffExit {
            0%   { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-22px) scale(0.985); }
          }
          .vrx-bottom-loader--exit {
            animation: vrxBottomLoaderHandoffExit 280ms cubic-bezier(0.4, 0, 1, 1) both;
            pointer-events: none;
          }
          @keyframes vrxBottomLoaderHandoffExit {
            0%   { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(14px); }
          }
          @media (prefers-reduced-motion: reduce) {
            .vrx-shiner-handoff-exit,
            .vrx-bottom-loader--exit { animation: none; opacity: 1; transform: none; }
          }

          /* Progress bar — fills left-to-right over ~7s (the time
             between processing-phase enter and tabs reveal). Uses
             scaleX so the gradient pre-renders edge-to-edge and the
             motion stays pixel-cheap. */
          .vrx-progress-fill {
            transform-origin: left center;
            animation: vrxProgressFill 11s linear forwards;
          }
          @keyframes vrxProgressFill {
            0%   { transform: scaleX(0); }
            100% { transform: scaleX(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .vrx-bottom-loader { animation: none; opacity: 1; transform: none; }
            .vrx-progress-fill { animation: none; transform: scaleX(1); }
          }

          /* Submit-button shimmer sweep — slow diagonal highlight that
             sweeps across the hero CTA every ~3s while it's enabled, so
             the doctor's eye lands on Submit when the consult is ready. */
          @keyframes vrxSubmitSheen {
            0%   { transform: translateX(-120%); opacity: 0; }
            18%  { opacity: 0.65; }
            55%  { opacity: 0.65; }
            100% { transform: translateX(320%); opacity: 0; }
          }
          .vrx-submit-sheen {
            background: linear-gradient(100deg,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.55) 50%,
              rgba(255,255,255,0) 100%);
            animation: vrxSubmitSheen 3s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .vrx-submit-sheen { animation: none; opacity: 0; }
          }

          .vrx-dot {
            width: 5px; height: 5px; border-radius: 50%;
            background: rgba(255,255,255,0.98);
            box-shadow: 0 0 6px rgba(255,255,255,0.62);
            animation: vrxDotBounce 1.2s ease-in-out infinite;
          }
          @keyframes vrxDotBounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1.1); opacity: 1; }
          }

          /* ── Listening card — pulsing rec-ring around the red dot.
             A second ring expands + fades out on a 1.4s loop so the
             recording state reads at a glance. */
          @keyframes vrxRecRing {
            0%   { transform: scale(1);   opacity: 0.75; }
            70%  { transform: scale(2.2); opacity: 0;    }
            100% { transform: scale(2.2); opacity: 0;    }
          }

          /* Listening card — no border, no shadow, no "clickable" look.
             Pure subtle frost with a gentle voice-reactive tint via
             filter drop-shadow. Quiet → barely any halo, loud → a thin
             violet glow. */
          .vrx-status-card {
            filter:
              drop-shadow(0 0 calc(3px + var(--vrx-live-level, 0) * 16px)
                rgba(139, 92, 246, calc(0.05 + var(--vrx-live-level, 0) * 0.22)));
          }
          .vrx-status-card--paused {
            background: rgba(254, 243, 199, 0.55) !important;
          }
          .vrx-status-card--error {
            background: rgba(254, 226, 226, 0.72) !important;
          }

          .vrx-footer-blob {
            opacity: calc(0.7 + var(--vrx-live-level, 0) * 0.9);
            animation: vrxFooterBlobDrift 4.6s ease-in-out infinite;
            will-change: transform, opacity;
          }
          @keyframes vrxFooterBlobDrift {
            0%, 100% {
              transform:
                translateY(0px)
                scale(1)
                translateX(calc(var(--vrx-live-level, 0) * -4px));
            }
            50% {
              transform:
                translateY(calc(-3px - var(--vrx-live-level, 0) * 6px))
                scale(calc(1.02 + var(--vrx-live-level, 0) * 0.08))
                translateX(calc(var(--vrx-live-level, 0) * 4px));
            }
          }
          /* Inline empty-state fade-in. The 180ms delay keeps the state
             from flashing on every transient blip (a brief offline event
             that recovers within ~150ms won't trigger a visible swap). */
          .vrx-empty-state {
            animation: vrxEmptyStateIn 420ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both;
          }
          @keyframes vrxEmptyStateIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          
        `}</style>
      </div>

      {/* ── Portaled mini controller when panel is hidden ── */}
      {mounted && !isPanelVisible &&
        createPortal(
          <VoiceRxMiniFab
            stream={stream} paused={paused} levelRef={levelRef} elapsedLabel={elapsedLabel}
            statusLabel={statusLabel} manualMute={manualMute} isAwaitingResponse={isAwaitingResponse}
            canSubmit={canSubmit} banner={miniBanner}
            onToggleMute={() => setManualMute((v) => !v)} onSubmit={() => { playSubmitSound(); onSubmit({ durationMs: elapsedMs }) }}
            onExpand={onExpand ?? (() => {})} onRequestCancel={handleRequestCancel}
          />,
          document.body,
        )}
    </>
  )
}
