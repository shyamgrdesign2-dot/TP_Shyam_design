"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { DrAgentFab } from "@/components/tp-rxpad/dr-agent/shell/DrAgentFab"
import { RxPad } from "@/components/rx/rxpad/RxPad"
import { DrAgentPanel } from "@/components/tp-rxpad/dr-agent/DrAgentPanel"
import { RxPadSyncProvider, useRxPadSync } from "@/components/tp-rxpad/rxpad-sync-context"
import { RX_CONTEXT_OPTIONS } from "@/components/tp-rxpad/dr-agent/constants"
import {
  TPRxPadSecondarySidebar,
  TPRxPadShell,
  TPRxPadTopNav,
} from "@/components/tp-ui"
import { RxCustomiseSidebar } from "@/components/tp-rxpad/RxCustomiseSidebar"
import { cn } from "@/lib/utils"

function RxPadPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patientId") ?? "__patient__"
  const patient = useMemo(
    () => RX_CONTEXT_OPTIONS.find((p) => p.id === patientId) ?? RX_CONTEXT_OPTIONS[0],
    [patientId],
  )
  const { lastSignal } = useRxPadSync()
  const [isAgentOpen, setIsAgentOpen] = useState(true)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [hasNudge, setHasNudge] = useState(false)
  const [customiseOpen, setCustomiseOpen] = useState(false)

  const bothOpen = isAgentOpen && isSidebarExpanded

  const handleSidebarSectionSelect = useCallback(
    (sectionId: string | null) => {
      setIsSidebarExpanded(!!sectionId && sectionId !== "drAgent")
    },
    [],
  )

  useEffect(() => {
    if (!lastSignal) return
    if (lastSignal.type === "sidebar_pill_tap" || lastSignal.type === "ai_trigger") {
      // Pill tap or AI trigger → always open agent and clear nudge
      if (!isAgentOpen) {
        setIsAgentOpen(true)
        setHasNudge(false)
      }
    } else if (!isAgentOpen) {
      setHasNudge(true)
    }
  }, [lastSignal, isAgentOpen])

  return (
    <TPRxPadShell
      topNav={
        <TPRxPadTopNav
          className="relative h-[62px] w-full bg-white"
          onBack={() => router.push("/")}
          onCustomise={() => setCustomiseOpen(true)}
          patientName={patient.label}
          patientMeta={`${patient.gender === "M" ? "Male" : "Female"}, ${patient.age}y`}
          onVisitSummary={() =>
            router.push(
              `/patient-details?patientId=${encodeURIComponent(patientId)}&name=${encodeURIComponent(patient.label)}&gender=${patient.gender}&age=${patient.age}&from=rxpad`,
            )
          }
          onEndVisit={() => {
            const qs = new URLSearchParams()
            if (patientId) qs.set("patientId", patientId)
            qs.set("returnTo", `/rxpad${patientId ? `?patientId=${patientId}` : ""}`)
            qs.set("flash", "rx-saved")
            router.push(`/rxpad/end-visit?${qs.toString()}`)
          }}
          onSaveDraft={() => {
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
      }
      sidebar={
        <TPRxPadSecondarySidebar
          onSectionSelect={handleSidebarSectionSelect}
        />
      }
    >
      <RxCustomiseSidebar
        open={customiseOpen}
        onClose={() => setCustomiseOpen(false)}
      />
      <div className="relative flex h-full min-w-0 overflow-x-auto">
        <div className={cn(
          "flex-1",
          bothOpen
            ? "min-w-[900px] pr-[300px]"
            : isAgentOpen
              ? "min-w-0 md:pr-[300px] xl:pr-[360px]"
              : "min-w-0",
        )}>
          <RxPad patientId={patientId} />
        </div>
        <div
          className={cn(
            "pointer-events-none fixed right-0 top-[62px] z-[135] hidden h-[calc(100vh-62px)] overflow-hidden md:block transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            bothOpen ? "w-[300px]" : "w-[clamp(300px,32vw,360px)]",
            isAgentOpen ? "translate-x-0" : "translate-x-[110%]",
          )}
          aria-hidden={!isAgentOpen}
        >
          <div className="pointer-events-auto relative h-full w-full before:pointer-events-none before:absolute before:inset-y-0 before:-left-[12px] before:z-10 before:w-[12px] before:bg-gradient-to-r before:from-transparent before:to-tp-slate-900/[0.06] before:content-['']">
            <DrAgentPanel
              onClose={() => setIsAgentOpen(false)}
              onOpen={() => { setIsAgentOpen(true); setHasNudge(false) }}
              isPanelVisible={isAgentOpen}
              initialPatientId={patientId}
              mode="rxpad"
              voiceRxMode
              headerBrandTitle="VoiceRx"
            />
          </div>
        </div>
        <DrAgentFab
          onClick={() => { setIsAgentOpen(true); setHasNudge(false) }}
          hasNudge={hasNudge}
          isPanelOpen={isAgentOpen}
        />
      </div>
    </TPRxPadShell>
  )
}

export function RxPadPage() {
  return (
    <Suspense fallback={null}>
      <RxPadSyncProvider>
        <RxPadPageInner />
      </RxPadSyncProvider>
    </Suspense>
  )
}
