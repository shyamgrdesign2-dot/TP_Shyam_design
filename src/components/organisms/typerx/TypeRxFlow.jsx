"use client";

/**
 * TypeRxFlow — point-and-click RxPad consultation.
 *
 * Same shell, top header, blue secondary sidebar, RxPad form, Rx Preview and
 * Customise sidebar as VoiceRx — but with **no voice and no AI assistant**:
 *
 *   • No Dr.Agent side panel and no floating "VoiceRx" FAB
 *   • No `voiceCaptureMode`, no live border, no fullscreen AI overlay
 *   • Per-section dictation mics are hidden via the global `data-typerx-mode`
 *     flag (CSS in globals.css hides `.voicerx-mic-btn` / `.voicerx-section-mic`)
 *
 * The result is pure point-and-click: the doctor fills the RxPad form by hand.
 * Still wrapped in `RxPadSyncProvider` because the secondary sidebar reads it
 * for historical updates.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { RxPreviewSidebar } from "@/src/components/organisms/voicerx/RxPreviewSidebar";
import { FlashSnackbar } from "@/src/components/molecules/FlashSnackbar";
import { RxPad } from "@/src/components/organisms/rxpad/form/RxPad";
import { RxCustomiseSidebar } from "@/src/components/organisms/rxpad/RxCustomiseSidebar";
import { RxPadSyncProvider } from "@/src/components/organisms/rxpad/rxpad-sync-context";
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

  const rxScrollRef = useRef(null);
  const [scrollFade, setScrollFade] = useState({ left: false, right: false });
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [rxPreviewOpen, setRxPreviewOpen] = useState(false);

  // Flag the body so global CSS hides every voice mic in this mode — TypeRx is
  // point-and-click, so the per-section dictation affordances disappear.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.setAttribute("data-typerx-mode", "on");
    return () => document.body.removeAttribute("data-typerx-mode");
  }, []);

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

  // Sidebar section selection has no extra panels to coordinate in TypeRx.
  const handleSidebarSectionSelect = useCallback(() => {}, []);

  const saveDraft = useCallback(() => {
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
      `/tp-appointment-screen?tab=draft&snackbar=saved-draft${
        patientId ? `&patientId=${encodeURIComponent(patientId)}` : ""
      }`
    );
  }, [patientId, router]);

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
          onSaveDraft={saveDraft}
        />
      }
      sidebar={<TPRxPadSecondarySidebar patientId={patientId} onSectionSelect={handleSidebarSectionSelect} />}>

      <div className="relative flex h-[calc(100vh-62px)] min-h-0 min-w-0">
        <div ref={rxScrollRef} className="flex min-h-0 min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-tp-slate-100">
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
            "pointer-events-none absolute inset-y-0 right-0 z-[5] w-[18px] bg-gradient-to-l from-tp-slate-900/[0.10] to-transparent transition-opacity duration-200",
            scrollFade.right ? "opacity-100" : "opacity-0"
          )}
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
          saveDraft();
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
