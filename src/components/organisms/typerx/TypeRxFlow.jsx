"use client";

/**
 * TypeRxFlow — type-only RxPad consultation.
 *
 * Mirrors VoiceRxFlow's shell + secondary sidebar + RxPad form +
 * Dr.Agent panel + Rx Preview + Customise sidebar, but **without** any
 * voice features:
 *
 *   • No `voiceCaptureMode` state or voice lockdown
 *   • No `VoiceRxLiveBorder` voice-active edge aura
 *   • No `FullscreenAiOverlay` (only used during voice submission)
 *   • Dr.Agent panel renders without the "VoiceRx" header brand
 *   • The RxPad form renders read-write the whole time
 *   • Per-section dictation mics inside RxPad / sidebar are hidden via
 *     the global `data-typerx-mode` flag (CSS in globals.css hides
 *     `.voicerx-mic-btn` and `.voicerx-section-mic` while this flag is
 *     present on <body>).
 *
 * Same data bus (`RxPadSyncProvider`) so the Dr.Agent panel still
 * syncs Copy → RxPad and the secondary sidebar still surfaces
 * historical updates. Same shell composition so future consultation
 * types (point-and-click, template-based, etc.) can clone this file.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DrAgentFab } from "@/src/components/organisms/rxpad/dr-agent/shell/DrAgentFab";
import { DrAgentPanel } from "@/src/components/organisms/rxpad/dr-agent/DrAgentPanel";
import { RxPreviewSidebar } from "@/src/components/organisms/voicerx/RxPreviewSidebar";
import { FlashSnackbar } from "@/src/components/molecules/FlashSnackbar";
import { RxPad } from "@/src/components/organisms/rxpad/form/RxPad";
import { RxCustomiseSidebar } from "@/src/components/organisms/rxpad/RxCustomiseSidebar";
import { RxPadSyncProvider, useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";
import { RX_CONTEXT_OPTIONS } from "@/src/components/organisms/rxpad/dr-agent/constants";
import { SecondarySidebar as TPRxPadSecondarySidebar } from "@/src/components/organisms/rxpad/secondary-sidebar/SecondarySidebar";
import { TPRxPadShell } from "@/src/components/organisms/rxpad/TPRxPadShell";
import RxpadHeader from "@/src/components/organisms/rxpad/imports/RxpadHeader";
import { ConfirmDialog as TPConfirmDialog } from "@/src/components/molecules/ConfirmDialog";
import { cn } from "@/src/hooks/utils";

function TypeRxFlowInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? "__patient__";
  const patient = useMemo(
    () => RX_CONTEXT_OPTIONS.find((p) => p.id === patientId) ?? RX_CONTEXT_OPTIONS[0],
    [patientId]
  );

  const { lastSignal } = useRxPadSync();

  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(true);
  const [voicePanelOffset, setVoicePanelOffset] = useState(0);
  const [hasNudge, setHasNudge] = useState(true);
  const rxScrollRef = useRef(null);
  const [scrollFade, setScrollFade] = useState({ left: false, right: false });
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [rxPreviewOpen, setRxPreviewOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const bothOpen = isVoicePanelOpen && isSidebarExpanded;

  // Flag the body so global CSS can hide every voice mic in this mode.
  // The styling is opt-in: components that render mics check
  // `body[data-typerx-mode="on"]` and disappear or short-circuit.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.setAttribute("data-typerx-mode", "on");
    return () => document.body.removeAttribute("data-typerx-mode");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOffset = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setVoicePanelOffset(0);
        return;
      }
      if (bothOpen) {
        const clamped = Math.min(Math.max(width * 0.28, 300), 380);
        setVoicePanelOffset(Math.round(clamped));
        return;
      }
      const clamped = Math.min(Math.max(width * 0.32, 300), 400);
      setVoicePanelOffset(Math.round(clamped));
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [bothOpen]);

  useEffect(() => {
    const el = rxScrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setScrollFade({
        left: scrollLeft > 1,
        right: scrollLeft + clientWidth < scrollWidth - 1,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const handleSidebarSectionSelect = useCallback((sectionId) => {
    setIsSidebarExpanded(!!sectionId && sectionId !== "drAgent");
  }, []);

  useEffect(() => {
    if (!lastSignal) return;
    if (lastSignal.type === "sidebar_pill_tap" || lastSignal.type === "ai_trigger") {
      if (!isVoicePanelOpen) {
        setIsVoicePanelOpen(true);
        setHasNudge(false);
      }
    } else if (!isVoicePanelOpen) {
      setHasNudge(true);
    }
  }, [lastSignal, isVoicePanelOpen]);

  const agentRailPad = bothOpen
    ? "pr-[clamp(300px,28vw,380px)]"
    : isVoicePanelOpen
    ? "pr-[clamp(300px,32vw,400px)]"
    : "";

  return (
    <TPRxPadShell
      topNav={
        <RxpadHeader
          className="relative h-[62px] w-full bg-white"
          onBack={() => setBackConfirmOpen(true)}
          patientName={patient.label}
          patientMeta={`${patient.gender === "M" ? "Male" : "Female"}, ${patient.age}y`}
          onVisitSummary={() =>
            router.push(
              `/patient-details?patientId=${encodeURIComponent(patientId)}&name=${encodeURIComponent(patient.label)}&gender=${patient.gender}&age=${patient.age}&from=rxpad-type`
            )
          }
          onPreview={() => setRxPreviewOpen(true)}
          onCustomise={() => setCustomiseOpen(true)}
          onEndVisit={() => {
            const qs = new URLSearchParams();
            if (patientId) qs.set("patientId", patientId);
            qs.set("returnTo", "/rxpad/type");
            qs.set("flash", "rx-saved");
            router.push(`/rxpad/end-visit?${qs.toString()}`);
          }}
          onSaveDraft={() => {
            if (typeof window !== "undefined" && patientId) {
              try {
                const raw = window.localStorage.getItem("tp.appointments.drafts") || "[]";
                const drafts = JSON.parse(raw);
                if (!drafts.includes(patientId)) drafts.push(patientId);
                window.localStorage.setItem("tp.appointments.drafts", JSON.stringify(drafts));
              } catch {
                /* swallow */
              }
            }
            router.push(
              `/tp-appointment-screen?tab=draft&snackbar=saved-draft${patientId ? `&patientId=${encodeURIComponent(patientId)}` : ""}`
            );
          }}
        />
      }
      sidebar={<TPRxPadSecondarySidebar onSectionSelect={handleSidebarSectionSelect} />}>

      <div className="relative flex h-[calc(100vh-62px)] min-h-0 min-w-0">
        <div ref={rxScrollRef} className="flex min-h-0 min-w-0 flex-1 overflow-x-auto">
          <div className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto bg-tp-slate-100",
            bothOpen ? "min-w-[900px]" : "min-w-0",
            agentRailPad
          )}>
            <RxPad patientId={patientId} />
          </div>
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-[5] w-[18px] bg-gradient-to-r from-tp-slate-900/[0.10] to-transparent transition-opacity duration-200",
            scrollFade.left ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 z-[5] w-[18px] bg-gradient-to-l from-tp-slate-900/[0.10] to-transparent transition-opacity duration-200",
            scrollFade.right ? "opacity-100" : "opacity-0"
          )}
          style={{ right: isVoicePanelOpen ? voicePanelOffset : 0 }}
        />
        <div
          className={cn(
            "pointer-events-none fixed right-0 top-[62px] z-[135] hidden h-[calc(100vh-62px)] overflow-hidden md:block transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            bothOpen ? "w-[clamp(300px,28vw,380px)]" : "w-[clamp(300px,32vw,400px)]",
            isVoicePanelOpen ? "translate-x-0" : "translate-x-[110%]"
          )}
          aria-hidden={!isVoicePanelOpen}>

          <div className="pointer-events-auto relative h-full w-full before:pointer-events-none before:absolute before:inset-y-0 before:-left-[12px] before:z-10 before:w-[12px] before:bg-gradient-to-r before:from-transparent before:to-tp-slate-900/[0.06] before:content-['']">
            <DrAgentPanel
              onClose={() => setIsVoicePanelOpen(false)}
              onOpen={() => {
                setIsVoicePanelOpen(true);
                setHasNudge(false);
              }}
              isPanelVisible={isVoicePanelOpen}
              initialPatientId={patientId}
              mode="rxpad"
              voiceRxMode={false}
              headerBrandTitle="Dr.Agent"
              autoOpenBottomSheet={false}
            />
          </div>
        </div>
        <DrAgentFab
          onClick={() => {
            setIsVoicePanelOpen(true);
            setHasNudge(false);
          }}
          hasNudge={hasNudge}
          isRecording={false}
          isPanelOpen={isVoicePanelOpen}
          isModuleRecording={false}
        />
      </div>

      <RxPreviewSidebar open={rxPreviewOpen} onClose={() => setRxPreviewOpen(false)} patientId={patientId} />
      <RxCustomiseSidebar open={customiseOpen} onClose={() => setCustomiseOpen(false)} />

      <TPConfirmDialog
        open={backConfirmOpen}
        onOpenChange={setBackConfirmOpen}
        title="Are you sure you want to go back?"
        warning="Going back, all the details from this session won't be saved. Save as draft to resume later."
        secondaryLabel="Discard & Go Back"
        secondaryTone="destructive"
        onSecondary={() => {
          setBackConfirmOpen(false);
          router.push("/tp-appointment-screen");
        }}
        primaryLabel="Save as Draft"
        primaryTone="primary"
        onPrimary={() => {
          setBackConfirmOpen(false);
          if (typeof window !== "undefined" && patientId) {
            try {
              const raw = window.localStorage.getItem("tp.appointments.drafts") || "[]";
              const drafts = JSON.parse(raw);
              if (!drafts.includes(patientId)) drafts.push(patientId);
              window.localStorage.setItem("tp.appointments.drafts", JSON.stringify(drafts));
            } catch {
              /* swallow */
            }
          }
          router.push(
            `/tp-appointment-screen?tab=draft&snackbar=saved-draft${patientId ? `&patientId=${encodeURIComponent(patientId)}` : ""}`
          );
        }}
      />

      <FlashSnackbar />
    </TPRxPadShell>
  );
}

export function TypeRxFlow() {
  return (
    <Suspense fallback={null}>
      <RxPadSyncProvider>
        <TypeRxFlowInner />
      </RxPadSyncProvider>
    </Suspense>
  );
}
