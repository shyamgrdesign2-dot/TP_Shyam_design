"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { DrAgentFab } from "@/components/tp-rxpad/dr-agent/shell/DrAgentFab"
import { DrAgentPanel } from "@/components/tp-rxpad/dr-agent/DrAgentPanel"
import { VoiceRxLiveBorder } from "@/components/voicerx/VoiceRxLiveBorder"
import { FullscreenAiOverlay } from "@/components/voicerx/FullscreenAiOverlay"
import { RxPreviewSidebar } from "@/components/voicerx/RxPreviewSidebar"
import { FlashSnackbar } from "@/components/tp-ui/flash-snackbar"
import { RxPad } from "@/components/rx/rxpad/RxPad"
import { RxPadSyncProvider, useRxPadSync } from "@/components/tp-rxpad/rxpad-sync-context"
import { RX_CONTEXT_OPTIONS } from "@/components/tp-rxpad/dr-agent/constants"
import { patientHasSymptomCollectorData } from "@/components/tp-rxpad/RxPadFloatingAgent"
import {
  TPRxPadSecondarySidebar,
  TPRxPadShell,
  TPRxPadTopNav,
} from "@/components/tp-ui"
import { cn } from "@/lib/utils"
import type { VoiceConsultKind } from "@/components/voicerx/voice-consult-types"
import { TPConfirmDialog } from "@/components/tp-ui/tp-confirm-dialog"

function VoiceRxFlowInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patientId") ?? "__patient__"
  const patient = useMemo(
    () => RX_CONTEXT_OPTIONS.find((p) => p.id === patientId) ?? RX_CONTEXT_OPTIONS[0],
    [patientId],
  )

  const { lastSignal, setVoiceActive, aiFillInProgress, activeVoiceModule, copyAllAuraActive, copyOverlayActive } = useRxPadSync()
  const hasSymptomData = useMemo(() => patientHasSymptomCollectorData(patientId), [patientId])
  // Scenario 1 (no symptom data, e.g. Ramesh Kumar): panel starts collapsed,
  //   Past Visits sidebar expanded, FAB visible. Clicking FAB opens bottom sheet directly.
  // Scenario 2 (has symptom data, e.g. Neha Gupta): panel opens immediately
  //   with intro message showing symptom collector data + "Start consultation".
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(hasSymptomData)
  const [voicePanelOffset, setVoicePanelOffset] = useState(0)
  const [hasNudge, setHasNudge] = useState(true)
  const [voiceCaptureMode, setVoiceCaptureMode] = useState<VoiceConsultKind | null>(null)
  // Back-button confirm dialog state. While a voice session is live, the
  // top-nav back arrow opens this dialog instead of navigating directly —
  // on confirm we stop the recording AND route back; on cancel the user
  // stays on the page and recording continues.
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)
  // Rx Preview sidebar — replaces the /print-preview route navigation
  // with an in-app slide-in panel on the right edge.
  const [rxPreviewOpen, setRxPreviewOpen] = useState(false)

  // Mirror the capture mode into the sync context so the RxPad can go
  // read-only while voice is live.
  useEffect(() => {
    setVoiceActive(!!voiceCaptureMode)
    return () => setVoiceActive(false)
  }, [voiceCaptureMode, setVoiceActive])

  // ──────────────────────────────────────────────────────────────────────
  // Voice-active lockdown.
  //
  // While `voiceCaptureMode` is set, the *entire* shell (top nav, sidebar,
  // RxPad, footer actions) goes view-only. The Dr. Agent rail on the right
  // stays fully interactive — it's the surface the user needs to submit /
  // cancel voice. The lock is achieved in three layers:
  //
  //   1. `document.body[data-voice-lock="on"]`  — powers the global CSS
  //      (cursor: not-allowed, hover neutralisation, hide AI icons).
  //   2. Document-level capture handlers block click / mousedown / focusin
  //      on every element except those inside `[data-voice-scope="dragent"]`
  //      or marked `[data-voice-allow]` (sidebar nav items).
  //   3. A single Apple-Intelligence-style tooltip is mounted near the
  //      blocked cursor each time the user attempts an action.
  // ──────────────────────────────────────────────────────────────────────
  const [tooltip, setTooltip] = useState<{ x: number; y: number; key: number; mode: VoiceConsultKind | null; moduleLabel: string | null } | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const voiceCaptureModeRef = useRef(voiceCaptureMode)
  const activeVoiceModuleRef = useRef<string | null>(activeVoiceModule)
  useEffect(() => { voiceCaptureModeRef.current = voiceCaptureMode }, [voiceCaptureMode])
  useEffect(() => { activeVoiceModuleRef.current = activeVoiceModule }, [activeVoiceModule])
  const showTooltipAt = useCallback((x: number, y: number) => {
    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current)
    setTooltip({ x, y, key: Date.now(), mode: voiceCaptureModeRef.current, moduleLabel: activeVoiceModuleRef.current })
    hideTimerRef.current = window.setTimeout(() => setTooltip(null), 3000)
  }, [])

  useEffect(() => {
    // Lock fires for EITHER a full Dr. Agent voice consultation OR an
    // inline per-Rx-module / per-sidebar-section recorder. Both share the
    // same lock / tooltip / event-blocking stack so every surface around
    // the active voice becomes view-only and the tooltip names what's
    // currently dictating.
    if (!voiceCaptureMode && !activeVoiceModule) {
      setTooltip(null)
      return
    }
    document.body.setAttribute("data-voice-lock", "on")

    // Selector for elements that are ALWAYS blocked during voice, even
    // inside a `data-voice-allow` subtree — text-entry affordances are
    // always "add/edit" and should stay locked regardless of context.
    const DATA_ENTRY_SELECTOR =
      'input, textarea, select, [role="textbox"], [role="combobox"], [contenteditable="true"]'

    const shouldPass = (el: Element | null) => {
      if (!el) return true
      // Dr. Agent rail: everything inside stays interactive.
      if (el.closest('[data-voice-scope="dragent"]')) return true
      // Explicit per-element block marker — wins over any enclosing allow
      // (so an individual "Add / Edit" CTA inside an otherwise-viewable
      // section panel can be locked with `data-voice-block`).
      if (el.closest("[data-voice-block]")) return false
      const allowNode = el.closest("[data-voice-allow]")
      if (allowNode) {
        // Inside an allow subtree: pass view-only interactions (buttons
        // for collapse/expand, tabs, download, preview, etc.), but still
        // block text-entry surfaces because those are always add/edit.
        if (el.matches(DATA_ENTRY_SELECTOR)) return false
        if (el.closest(DATA_ENTRY_SELECTOR)) return false
        return true
      }
      return false
    }

    const isBlockable = (el: Element | null): boolean => {
      if (!el) return false
      // Tag-based fast path.
      const tag = el.tagName
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "A") return true
      // Role or contenteditable.
      const role = el.getAttribute("role")
      if (role === "button" || role === "textbox" || role === "combobox" || role === "checkbox" || role === "radio") return true
      if ((el as HTMLElement).isContentEditable) return true
      // Any element explicitly flagged for blocking.
      if (el.hasAttribute("data-voice-block")) return true
      // Walk a short distance up — some click surfaces are wrapping divs.
      const container = el.closest("button, a, [role=button], [data-voice-block]")
      return !!container
    }

    const onClickCapture = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (!t) return
      if (shouldPass(t)) return
      if (!isBlockable(t)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      showTooltipAt(e.clientX, e.clientY)
    }

    const onMouseDownCapture = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (!t) return
      if (shouldPass(t)) return
      if (!isBlockable(t)) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    const onFocusInCapture = (e: FocusEvent) => {
      const t = e.target as Element | null
      if (!t) return
      if (shouldPass(t)) return
      if (!isBlockable(t)) return
      ;(t as HTMLElement).blur?.()
      const rect = (t as HTMLElement).getBoundingClientRect()
      showTooltipAt(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }

    // `true` = capture phase, so we see events before any child handlers.
    document.addEventListener("click", onClickCapture, true)
    document.addEventListener("mousedown", onMouseDownCapture, true)
    document.addEventListener("focusin", onFocusInCapture, true)

    return () => {
      document.body.removeAttribute("data-voice-lock")
      document.removeEventListener("click", onClickCapture, true)
      document.removeEventListener("mousedown", onMouseDownCapture, true)
      document.removeEventListener("focusin", onFocusInCapture, true)
      setTooltip(null)
    }
  }, [voiceCaptureMode, activeVoiceModule, showTooltipAt])

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const bothOpen = isVoicePanelOpen && isSidebarExpanded

  useEffect(() => {
    if (typeof window === "undefined") return

    const updateOffset = () => {
      const width = window.innerWidth
      if (width < 768) {
        setVoicePanelOffset(0)
        return
      }
      if (bothOpen) {
        setVoicePanelOffset(300)
        return
      }
      const clamped = Math.min(Math.max(width * 0.32, 300), 360)
      setVoicePanelOffset(Math.round(clamped))
    }

    updateOffset()
    window.addEventListener("resize", updateOffset)
    return () => window.removeEventListener("resize", updateOffset)
  }, [bothOpen])

  const handleSidebarSectionSelect = useCallback(
    (sectionId: string | null) => {
      setIsSidebarExpanded(!!sectionId && sectionId !== "drAgent")
    },
    [],
  )

  useEffect(() => {
    if (!lastSignal) return
    if (lastSignal.type === "sidebar_pill_tap" || lastSignal.type === "ai_trigger") {
      if (!isVoicePanelOpen) {
        setIsVoicePanelOpen(true)
        setHasNudge(false)
      }
    } else if (!isVoicePanelOpen) {
      setHasNudge(true)
    }
  }, [lastSignal, isVoicePanelOpen])

  // Reserve right-side padding equal to the Dr. Agent panel's
  // rendered width so the RxPad section cards reflow under it
  // instead of being hidden behind it on iPad / smaller laptops.
  // Matches the panel container's `w-[clamp(330px,38vw,360px)]`
  // tablet width and `xl:w-[400px]`.
  const agentRailPad = bothOpen
    ? "pr-[300px]"
    : isVoicePanelOpen
      ? "md:pr-[300px] xl:pr-[360px]"
      : ""

  return (
    <TPRxPadShell
      topNav={
        <TPRxPadTopNav
          className="relative h-[62px] w-full bg-white"
          voiceCaptureMode={voiceCaptureMode}
          onBack={() => {
            // Always intercept the top-nav back button on the in-visit
            // page — leaving discards the in-progress Rx, so confirm
            // before routing away (and offer Save as Draft).
            setBackConfirmOpen(true)
          }}
          patientName={patient.label}
          patientMeta={`${patient.gender === "M" ? "Male" : "Female"}, ${patient.age}y`}
          onVisitSummary={() =>
            router.push(
              `/patient-details?patientId=${encodeURIComponent(patientId)}&name=${encodeURIComponent(patient.label)}&gender=${patient.gender}&age=${patient.age}&from=invisit`,
            )
          }
          onPreview={() => setRxPreviewOpen(true)}
          onEndVisit={() => {
            // Carry a flash flag so the EndVisit page surfaces
            // "Your Rx has been saved" via FlashSnackbar on arrival.
            const qs = new URLSearchParams()
            if (patientId) qs.set("patientId", patientId)
            qs.set("returnTo", "/invisit")
            qs.set("flash", "rx-saved")
            router.push(`/rxpad/end-visit?${qs.toString()}`)
          }}
          onSaveDraft={() => {
            // Persist a draft marker so the appointment screen can move
            // this patient's row into the Draft tab instead of Queue.
            if (typeof window !== "undefined" && patientId) {
              try {
                const raw = window.localStorage.getItem("tp.appointments.drafts") || "[]"
                const drafts: string[] = JSON.parse(raw)
                if (!drafts.includes(patientId)) drafts.push(patientId)
                window.localStorage.setItem("tp.appointments.drafts", JSON.stringify(drafts))
              } catch { /* swallow */ }
            }
            // Also carry snackbar + patientId flags so the appointments
            // page surfaces "Saved as draft" for this patient on arrival.
            router.push(
              `/tp-appointment-screen?tab=draft&snackbar=saved-draft${patientId ? `&patientId=${encodeURIComponent(patientId)}` : ""}`,
            )
          }}
        />
      }
      sidebar={
        <TPRxPadSecondarySidebar
          onSectionSelect={handleSidebarSectionSelect}
        />
      }
    >
      <div className="relative flex h-[calc(100vh-62px)] min-h-0 min-w-0 overflow-x-auto">
        <div className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto bg-tp-slate-100",
          bothOpen ? "min-w-[900px]" : "min-w-0",
          agentRailPad,
        )}>
          <RxPad patientId={patientId} />
        </div>
        <div
          data-voice-scope="dragent"
          className={cn(
            "pointer-events-none fixed right-0 top-[62px] z-[135] hidden h-[calc(100vh-62px)] overflow-hidden md:block transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            bothOpen ? "w-[300px]" : "w-[clamp(300px,32vw,360px)]",
            isVoicePanelOpen ? "translate-x-0" : "translate-x-[110%]",
          )}
          aria-hidden={!isVoicePanelOpen}
        >
          <div className="pointer-events-auto relative h-full w-full before:pointer-events-none before:absolute before:inset-y-0 before:-left-[12px] before:z-10 before:w-[12px] before:bg-gradient-to-r before:from-transparent before:to-tp-slate-900/[0.06] before:content-['']">
            <DrAgentPanel
              onClose={() => setIsVoicePanelOpen(false)}
              onOpen={() => {
                setIsVoicePanelOpen(true)
                setHasNudge(false)
              }}
              isPanelVisible={isVoicePanelOpen}
              initialPatientId={patientId}
              mode="rxpad"
              voiceRxMode
              headerBrandTitle="VoiceRx"
              onVoiceCaptureModeChange={setVoiceCaptureMode}
              autoOpenBottomSheet={!hasSymptomData}
            />
          </div>
        </div>
        {/* Regular fab only when we are NOT actively recording — during recording the active
            agent portals its own mini controller which replaces this generic fab. */}
        {!voiceCaptureMode && (
          <DrAgentFab
            onClick={() => {
              // While a per-section dictation is live, opening the
              // VoiceRx (Dr. Agent) panel would conflict with it. Tell
              // the doctor explicitly instead of silently no-op-ing.
              if (activeVoiceModule) {
                toast.error(
                  `VoiceRx can't open while ${activeVoiceModule} dictation is active. Submit or close that recording first.`,
                  { duration: 3200 },
                )
                return
              }
              setIsVoicePanelOpen(true)
              setHasNudge(false)
            }}
            hasNudge={hasNudge}
            isRecording={!!voiceCaptureMode}
            isPanelOpen={isVoicePanelOpen}
            // Per design: the VoiceRx FAB should NOT mutate when an
            // unrelated per-module / per-section dictation is running.
            // The module recorder is its own surface, with its own
            // status pill — promoting "Rec…" to the global FAB makes
            // the doctor think VoiceRx itself is recording. Keep the
            // FAB as the steady "VoiceRx" entrypoint and let the per-
            // module recorder own its visual state.
            isModuleRecording={false}
          />
        )}
      </div>

      {/* Fullscreen AI processing overlay — covers RxPad + blue sidebar +
          top nav while the voice submission is being processed. The voice
          edge rim is rendered AFTER this in the DOM and sits at a higher
          z so its coloured blur reads ABOVE the loader's white backdrop —
          otherwise the rim got visually diluted by the overlay's
          rgba(255,255,255,0.72) wash. */}
      <FullscreenAiOverlay active={aiFillInProgress} rightOffset={isVoicePanelOpen ? voicePanelOffset : 0} />

      {/* Copy → RxPad treatment is edge-gradient-only now (no backdrop
          blur, no caption) — driven via copyOverlayActive feeding into
          VoiceRxLiveBorder.active below. */}

      {/* Rx Preview — slide-in panel (replaces the old /print-preview
          full-page route). Pattern matches the dental-model preview. */}
      <RxPreviewSidebar
        open={rxPreviewOpen}
        onClose={() => setRxPreviewOpen(false)}
        patientId={patientId}
      />

      {/* Voice-reactive gradient focus ring — only while actively
          RECORDING. Hidden during aiFillInProgress (submit processing)
          so the fullscreen loader + its backdrop-blur is the sole focal
          surface, not competing with a coloured edge glow. */}
      <VoiceRxLiveBorder
        // Three triggers turn the edge aura on:
        //   1. The doctor is actively recording (voiceCaptureMode true)
        //   2. A "Copy all to RxPad" flash is firing (~2s window) —
        //      replaces the per-module pulses for the bulk-fill action.
        // We still hide it while the AI-fill overlay is up so the
        // fullscreen loader stays the sole focal surface.
        active={(!!voiceCaptureMode || copyAllAuraActive || copyOverlayActive) && !aiFillInProgress}
        rightOffset={isVoicePanelOpen ? voicePanelOffset : 0}
      />

      {/* Blocked-action tooltip — subtle dark pill + arrow pointer. The
          copy names the active mode so the user instantly knows why the
          field is locked and what to do. Positioned directly at the click
          point (only opacity fades), so no "drift toward cursor" hitch. */}
      {tooltip && (
        <div
          className="vrx-voice-tooltip pointer-events-none fixed z-[220] max-w-[280px] rounded-[8px] bg-tp-slate-900/95 px-3 py-2 text-[12px] leading-[16px] text-white shadow-[0_6px_20px_rgba(15,23,42,0.22)]"
          style={{
            left: tooltip.x,
            top: tooltip.y + 16,
            transform: "translateX(-50%)",
          }}
          key={tooltip.key}
          role="status"
          aria-live="polite"
        >
          <span className="block font-semibold">
            {tooltip.moduleLabel
              ? `VoiceRx is active in ${tooltip.moduleLabel}`
              : tooltip.mode === "dictation_consultation"
                ? "Dictation mode is active"
                : "Conversation mode is active"}
          </span>
          <span className="mt-[2px] block text-[12px] font-normal text-white/75">
            {tooltip.moduleLabel
              ? `Please submit or close the ${tooltip.moduleLabel} dictation before using other sections.`
              : "You can\u2019t edit details here while voice is recording. Submit or close the voice Rx to continue editing manually."}
          </span>
          <span aria-hidden className="vrx-voice-tooltip-arrow" />
        </div>
      )}

      {/* Back-button confirmation — appears when user clicks the top-nav
          back arrow while a voice session is live. Confirm cancels the
          voice recording AND navigates away; Cancel keeps them on the
          page with recording still running. */}
      <TPConfirmDialog
        open={backConfirmOpen}
        onOpenChange={setBackConfirmOpen}
        title="Are you sure you want to go back?"
        warning="Going back, all the details from this session won't be saved. Save as draft to resume later."
        secondaryLabel="Discard & Go Back"
        onSecondary={() => {
          setBackConfirmOpen(false)
          setVoiceCaptureMode(null)
          router.push("/tp-appointment-screen")
        }}
        primaryLabel="Save as Draft"
        primaryTone="primary"
        onPrimary={() => {
          setBackConfirmOpen(false)
          setVoiceCaptureMode(null)
          if (typeof window !== "undefined" && patientId) {
            try {
              const raw = window.localStorage.getItem("tp.appointments.drafts") || "[]"
              const drafts: string[] = JSON.parse(raw)
              if (!drafts.includes(patientId)) drafts.push(patientId)
              window.localStorage.setItem("tp.appointments.drafts", JSON.stringify(drafts))
            } catch { /* swallow */ }
          }
          router.push(
            `/tp-appointment-screen?tab=draft&snackbar=saved-draft${patientId ? `&patientId=${encodeURIComponent(patientId)}` : ""}`,
          )
        }}
      />

      {/* ── Global voice-lock styles ─────────────────────────────────────
           Applied while body[data-voice-lock="on"]. Everything inside the
           Dr. Agent rail (data-voice-scope="dragent") is excluded using
           `:not(:where([data-voice-scope="dragent"] *, [data-voice-allow] *))`. ─────────────── */}
      <style>{`
        /* not-allowed cursor on every interactive surface (except the
           Dr. Agent rail and elements explicitly allowed).
           Note: :not(:where(...)) is attached directly (no whitespace)
           to the compound selector so it tests the target element itself,
           not its descendants. */
        body[data-voice-lock="on"] :is(button, input, textarea, select, a,
          [role="button"], [role="textbox"], [role="combobox"], [role="checkbox"],
          [role="radio"], [contenteditable="true"], [data-voice-block]):not(:where([data-voice-scope="dragent"] *, [data-voice-scope="dragent"], [data-voice-allow] *, [data-voice-allow])) {
          cursor: not-allowed !important;
        }
        body[data-voice-lock="on"] :is(button, [role="button"], a,
          [data-voice-block]):not(:where([data-voice-scope="dragent"] *, [data-voice-scope="dragent"], [data-voice-allow] *, [data-voice-allow])):hover {
          background-color: inherit !important;
          color: inherit !important;
          box-shadow: inherit !important;
          filter: none !important;
          transform: none !important;
          opacity: 1 !important;
        }
        /* Inside allow-subtrees (sidebar content panels): text-entry
           surfaces are STILL blocked — cursor: not-allowed stays on
           inputs/textareas/selects/contenteditable even when they live
           inside data-voice-allow. */
        body[data-voice-lock="on"] [data-voice-allow] :is(input, textarea, select,
          [role="textbox"], [role="combobox"], [contenteditable="true"]) {
          cursor: not-allowed !important;
        }
        /* Explicit per-element block marker wins inside allow subtrees too —
           the marker or any of its descendants gets the locked cursor. */
        body[data-voice-lock="on"] [data-voice-block],
        body[data-voice-lock="on"] [data-voice-block] :is(button, input, textarea,
          select, a, [role="button"], [role="textbox"], [role="combobox"],
          [role="checkbox"], [role="radio"], [contenteditable="true"]) {
          cursor: not-allowed !important;
        }
        /* Hide AI icons and anything opted in to be hidden during voice. */
        body[data-voice-lock="on"] [data-voice-hide]:not(:where([data-voice-scope="dragent"] *, [data-voice-allow] *)) {
          display: none !important;
        }
        /* Inputs should not look "focused" even if the caret briefly appears
           before our focusin handler blurs them. Hide caret + ring. */
        body[data-voice-lock="on"] :is(input, textarea,
          [contenteditable="true"]):not(:where([data-voice-scope="dragent"] *, [data-voice-allow] *)) {
          caret-color: transparent !important;
        }
        body[data-voice-lock="on"] :is(input, textarea,
          [contenteditable="true"]):not(:where([data-voice-scope="dragent"] *, [data-voice-allow] *)):focus {
          outline: none !important;
          box-shadow: none !important;
        }

        /* Subtle voice-lock tooltip — pure opacity fade only.
           No transform tween: the tooltip must open at the click point and
           stay there; no "position drifts to the cursor" hitch. */
        .vrx-voice-tooltip {
          animation: vrxTooltipFade 140ms ease-out;
        }
        @keyframes vrxTooltipFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Arrow pointer. The tooltip sits BELOW the click point (top = y+16),
           so the arrow points UP out of the top edge toward the cursor. */
        .vrx-voice-tooltip-arrow {
          position: absolute;
          left: 50%;
          top: 0;
          width: 10px;
          height: 10px;
          transform: translate(-50%, -55%) rotate(45deg);
          background: rgba(15, 23, 42, 0.95);
          border-top-left-radius: 2px;
        }
      `}</style>

      {/* Flash toasts driven by ?flash=<key> — e.g. "visit-started" from
          the appointments screen, "rx-saved" from end-visit. */}
      <FlashSnackbar />
    </TPRxPadShell>
  )
}

export function VoiceRxFlow() {
  return (
    <Suspense fallback={null}>
      <RxPadSyncProvider>
        <VoiceRxFlowInner />
      </RxPadSyncProvider>
    </Suspense>
  )
}
