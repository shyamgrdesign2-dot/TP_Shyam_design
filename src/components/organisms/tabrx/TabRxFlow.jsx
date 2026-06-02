"use client";

/**
 * TabRxFlow — tablet point-and-write RxPad consultation.
 *
 * Same shell, top header, and blue secondary sidebar as VoiceRx/TypeRx, but
 * the central RxPad form is replaced by the TabRx freehand drawing canvas
 * (multi-page A4, pen / highlighter / eraser, letterhead templates). There is
 * **no** voice capture, no Dr.Agent panel, and no floating "VoiceRx" FAB — the
 * canvas owns the full width of the work area.
 *
 *   • Header drops the "Save as template" action and keeps "Templates", which
 *     opens the letterhead picker docked over the canvas.
 *   • Blue sidebar is the exact same `SecondarySidebar` as VoiceRx (unchanged).
 *   • Still wrapped in `RxPadSyncProvider` because the secondary sidebar reads
 *     it for historical updates — the canvas itself doesn't depend on it.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { FlashSnackbar } from "@/src/components/molecules/FlashSnackbar";
import { RxPadSyncProvider } from "@/src/components/organisms/rxpad/rxpad-sync-context";
import { RxExtrasProvider, useRxExtras } from "@/src/components/organisms/rxpad/rx-extras-context";
import { RX_CONTEXT_OPTIONS } from "@/src/components/organisms/rxpad/dr-agent/constants";
import { SecondarySidebar as TPRxPadSecondarySidebar } from "@/src/components/organisms/rxpad/secondary-sidebar/SecondarySidebar";
import { TPRxPadShell } from "@/src/components/organisms/rxpad/TPRxPadShell";
import RxpadHeader from "@/src/components/organisms/rxpad/imports/RxpadHeader";
import { ConfirmDialog as TPConfirmDialog } from "@/src/components/molecules/ConfirmDialog";
import { RxPreviewSidebar } from "@/src/components/organisms/voicerx/RxPreviewSidebar";
import { saveRxPreviewSnapshot } from "@/src/components/organisms/rxpad/rx-preview-store";
import { getComposedRxPreviewSnapshot } from "@/src/components/organisms/rxpad/rx-preview-composer";
import { resolveReferral } from "@/src/components/organisms/rxpad/referral/referral-data";
import TabRxCanvas from "./canvas/TabRxCanvas";
import "./canvas/tabrx-canvas.scss";

// Handwriting flows surface Follow-up + Referral as blue-sidebar tabs.
const TAB_RX_EXTRA_TABS = ["followUps", "referral"];

function TabRxFlowInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? "__patient__";
  const patient = useMemo(
    () => RX_CONTEXT_OPTIONS.find((p) => p.id === patientId) ?? RX_CONTEXT_OPTIONS[0],
    [patientId]
  );

  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { followUpDate, referral } = useRxExtras();

  // Mirror the sidebar Follow-up + Referral into the shared Rx-preview snapshot
  // so the EXACT same `RxPreviewSidebar` used by VoiceRx/TypeRx renders them on
  // Preview. (Other Rx sections stay empty in handwriting flows.)
  useEffect(() => {
    if (!patientId) return;
    const base = getComposedRxPreviewSnapshot(patientId);
    saveRxPreviewSnapshot(patientId, {
      ...base,
      followUpDate: followUpDate || "",
      referral: resolveReferral(referral),
    });
  }, [patientId, followUpDate, referral]);

  // The secondary sidebar selects sections; TabRx has no extra panels to open,
  // so the handler is a no-op kept for API parity with the other flows.
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
          showSave={false}
          onTemplates={() => setShowTemplateDrawer((v) => !v)}
          onPreview={() => setPreviewOpen(true)}
          onVisitSummary={() =>
            router.push(
              `/patient-details?patientId=${encodeURIComponent(patientId)}&name=${encodeURIComponent(
                patient.label
              )}&gender=${patient.gender}&age=${patient.age}&from=rxpad-tab`
            )
          }
          onCustomise={() => {}}
          onEndVisit={() => {
            const qs = new URLSearchParams();
            if (patientId) qs.set("patientId", patientId);
            qs.set("returnTo", "/rxpad/tab");
            qs.set("flash", "rx-saved");
            router.push(`/rxpad/end-visit?${qs.toString()}`);
          }}
          onSaveDraft={saveDraft}
        />
      }
      sidebar={
        <TPRxPadSecondarySidebar
          patientId={patientId}
          onSectionSelect={handleSidebarSectionSelect}
          extraTabs={TAB_RX_EXTRA_TABS}
        />
      }
    >
      <div className="relative h-[calc(100vh-62px)] min-h-0 min-w-0">
        <TabRxCanvas
          patientId={patientId}
          templates={templates}
          onTemplatesUpdate={setTemplates}
          showTemplateDrawer={showTemplateDrawer}
          onToggleTemplateDrawer={() => setShowTemplateDrawer((v) => !v)}
        />
      </div>

      <RxPreviewSidebar
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        patientId={patientId}
      />

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

export function TabRxFlow() {
  return (
    <Suspense fallback={null}>
      <RxPadSyncProvider>
        <RxExtrasProvider>
          <TabRxFlowInner />
        </RxExtrasProvider>
      </RxPadSyncProvider>
    </Suspense>
  );
}
