/**
 * Right content panel.
 * Contains a gradient section header + the scrollable section content.
 */
import React, { useEffect, useRef, useState } from "react";
import { SidebarLeft } from "iconsax-reactjs";
import { AiTriggerIcon } from "@/src/components/organisms/rxpad/dr-agent/shared/AiTriggerIcon";
import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";
import { useEdgeSwipeNavigation } from "./useEdgeSwipeNavigation";
import { ConfirmDialog as TPConfirmDialog } from "@/src/components/molecules/ConfirmDialog";

// ─── Content imports ──────────────────────────────────────────────────────────

// DrAgentContent removed — Dr.Agent lives in its own panel, not in the sidebar
import { PastVisitsContent } from "./content/PastVisitsContent";
import { VitalsContent } from "./content/VitalsContent";
import { HistoryContent } from "./content/HistoryContent";
import { GynecHistoryContent } from "./content/GynecHistoryContent";
import { ObstetricHistoryContent } from "./content/ObstetricHistoryContent";
import { VaccineContent } from "./content/VaccineContent";
import { GrowthContent } from "./content/GrowthContent";
import { OptalContent } from "./content/OptalContent";
import { MedicalRecordsContent } from "./content/MedicalRecordsContent";
import { LabResultsContent } from "./content/LabResultsContent";
import { PersonalNotesContent } from "./content/PersonalNotesContent";
import { EmptyStateContent } from "./content/EmptyStateContent";


import { rxSidebarTokens } from "./tokens";

/**
 * Inline keyframes — kept colocated with the component so HMR picks them up
 * deterministically (Turbopack was missing rules appended to globals.css).
 */

// ─── Section title map ────────────────────────────────────────────────────────

const SECTION_TITLES = {
  drAgent: "Dr Agent",
  pastVisits: "Past Visit",
  vitals: "Vitals",
  history: "Medical History",
  gynec: "Gynec History",
  obstetric: "Obstetric History",
  vaccine: "Vaccination History",
  growth: "Growth",
  optal: "Ophthal History",
  medicalRecords: "Medical Records",
  labResults: "Lab Results",
  // Internal id stays `personalNotes`; visible header reads "Private Notes".
  personalNotes: "Private Notes"
};

// ─── Section header (gradient bar) ───────────────────────────────────────────

function sectionHeaderAiLabel(activeId, title) {
  switch (activeId) {
    case "pastVisits":
      return "Ask Dr. Agent to summarize all past visits";
    case "vitals":
      return "Ask Dr. Agent to analyze today's vitals and flag concerns";
    case "history":
      return "Ask Dr. Agent to summarize the complete medical history";
    case "gynec":
      return "Ask Dr. Agent to review gynecological history and due screenings";
    case "obstetric":
      return "Ask Dr. Agent to review obstetric history and pending ANC items";
    case "vaccine":
      return "Ask Dr. Agent to check vaccination schedule and pending doses";
    case "growth":
      return "Ask Dr. Agent to analyze growth trends and percentiles";
    case "labResults":
      return "Ask Dr. Agent to review flagged lab values and trends";
    case "personalNotes":
      return "Ask Dr. Agent to summarize your private notes";
    case "medicalRecords":
      return null;
    default:
      return `Ask Dr. Agent about ${title.toLowerCase()}`;
  }
}

function SectionHeader({ title, activeId, onClose }) {
  const headerSignalLabel = sectionHeaderAiLabel(activeId, title);
  // Recording-aware collapse. If a per-section recorder is live,
  // collapsing the panel would tear down the recorder mid-sentence.
  // Confirm first; on "Discard" we still call `onClose` so the
  // parent owns the actual cleanup. Global VoiceRx FAB flow does NOT
  // block collapse — it lives in its own panel.
  const { activeVoiceModule } = useRxPadSync();
  const isVoiceLive = !!activeVoiceModule;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleCollapseClick = () => {
    if (isVoiceLive) {
      setConfirmOpen(true);
      return;
    }
    onClose?.();
  };

  return (
    <div
      className="group/section-header h-[40px] shrink-0 w-full relative"
      style={{ backgroundImage: "linear-gradient(101.381deg, rgb(55,54,166) 2.0111%, rgb(38,38,136) 83.764%)" }}>
      
      <div className="content-stretch flex gap-[24px] items-center px-[12px] py-[8px] relative size-full">
        {/* Title */}
        <div className="content-stretch flex flex-[1_0_0] items-center gap-[6px] min-h-px min-w-px relative">
          <p className={`${rxSidebarTokens.titleClass} not-italic relative shrink-0 text-white whitespace-nowrap`}>
            {title}
          </p>
          {headerSignalLabel ?
          <span className="opacity-0 transition-opacity group-hover/section-header:opacity-100">
              <AiTriggerIcon
              tooltip={headerSignalLabel}
              signalLabel={headerSignalLabel}
              sectionId={activeId}
              size={11}
              as="span"
              tone="inverse" />
            
            </span> :
          null}
        </div>
        {/* Collapse icon — always interactive (data-voice-allow) so the
             global voice-lock doesn't swallow the click; we own the
             confirmation flow ourselves. */}
        <button
          type="button"
          className="text-white/80 transition-opacity hover:text-white"
          onClick={handleCollapseClick}
          data-voice-allow
          aria-label={isVoiceLive ? "Collapse section panel (voice recording is active)" : "Collapse section panel"}>
          
          <SidebarLeft size={16} variant="Linear" />
        </button>
      </div>
      <TPConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Recording is in progress"
        warning={
        activeVoiceModule ?
        `Voice dictation for ${activeVoiceModule} is still active. Closing this panel will discard the in-progress transcript.` :
        "VoiceRx is currently recording. Closing this panel will not stop the recording, but the transcript so far will be lost from this section."
        }
        primaryLabel="Keep recording"
        onPrimary={() => setConfirmOpen(false)}
        secondaryLabel="Discard and close"
        secondaryTone="destructive"
        onSecondary={() => {
          setConfirmOpen(false);
          onClose?.();
        }} />
      
    </div>);

}

// ─── Content switcher ─────────────────────────────────────────────────────────

function SectionContent({ activeId }) {
  switch (activeId) {
    // drAgent no longer in sidebar — falls through to pastVisits
    case "pastVisits":return <PastVisitsContent />;
    case "vitals":return <VitalsContent />;
    case "history":return <HistoryContent />;
    case "gynec":return <GynecHistoryContent />;
    case "obstetric":return <ObstetricHistoryContent />;
    case "vaccine":return <VaccineContent />;
    case "growth":return <GrowthContent />;
    case "optal":return <OptalContent />;
    case "medicalRecords":return <MedicalRecordsContent />;
    case "labResults":return <LabResultsContent />;
    case "personalNotes":return <PersonalNotesContent />;
    default:return <EmptyStateContent sectionLabel={SECTION_TITLES[activeId]} />;
  }
}

// ─── Public export ────────────────────────────────────────────────────────────












/**
 * Track which direction the section just changed (next vs prev) so the slide
 * animation can play in the correct direction. Returns the direction of the
 * latest change — "next" / "prev" / null on first render.
 */
function useTransitionDirection(activeId) {
  const NAV_ORDER = React.useMemo(
    () => [
    "pastVisits", "vitals", "history", "labResults", "medicalRecords",
    "gynec", "obstetric", "vaccine", "growth", "optal", "personalNotes"],

    []
  );
  const previousId = useRef(null);
  const [dir, setDir] = useState(null);

  useEffect(() => {
    const prev = previousId.current;
    if (prev && prev !== activeId) {
      const prevIdx = NAV_ORDER.indexOf(prev);
      const nextIdx = NAV_ORDER.indexOf(activeId);
      if (prevIdx !== -1 && nextIdx !== -1) {
        setDir(nextIdx > prevIdx ? "next" : "prev");
      }
    }
    previousId.current = activeId;
  }, [activeId, NAV_ORDER]);

  return dir;
}

export function ContentPanel({ activeId, onClose, onSwipeNavigate }) {
  const { acknowledgeHistoricalSection, isHistoricalSectionUnseen, historicalUpdates } = useRxPadSync();
  const unseenHere = isHistoricalSectionUnseen(activeId);
  const containerRef = useRef(null);
  const transitionDir = useTransitionDirection(activeId);
  const [fillFlash, setFillFlash] = useState(false);

  useEffect(() => {
    if (unseenHere) acknowledgeHistoricalSection(activeId);
  }, [activeId, unseenHere, acknowledgeHistoricalSection]);

  // ── Flash the panel when content was just synced into this section ──
  // Reuses the RxPad's `tp-module-just-filled` aura recipe so a
  // doctor sees the same "AI just touched this surface" affordance
  // whether the data lands in an RxPad module or here in the
  // secondary-sidebar panel. Triggers on mount (auto-navigate from a
  // copy) and on any new chunk arriving while the panel is open.
  const chunks = historicalUpdates[activeId];
  const latestAt = chunks && chunks.length ? chunks[chunks.length - 1].at : 0;
  const lastSeenAtRef = useRef(0);
  useEffect(() => {
    if (!latestAt) return;
    if (latestAt === lastSeenAtRef.current) return;
    lastSeenAtRef.current = latestAt;
    if (Date.now() - latestAt > 2500) return;
    setFillFlash(true);
    const t = window.setTimeout(() => setFillFlash(false), 2000);
    return () => window.clearTimeout(t);
  }, [activeId, latestAt]);

  useEdgeSwipeNavigation({
    containerRef,
    onNavigate: (dir) => onSwipeNavigate?.(dir),
    enabled: Boolean(onSwipeNavigate),
    resetKey: activeId
  });

  // Animation class — picked per direction. Animation defined in globals.css.
  const animClass =
  transitionDir === "next" ?
  "rx-section-slide-up" :
  transitionDir === "prev" ?
  "rx-section-slide-down" :
  "";

  return (
    <div
      ref={containerRef}
      className="bg-white content-stretch flex h-full w-[250px] min-w-[250px] max-w-[250px] shrink-0 flex-col items-center relative xl:w-[clamp(250px,26vw,350px)] xl:max-w-[350px]"
      /* During voice lockdown, this panel is VIEW-ONLY — but view-only still
         means the user can collapse/expand groups, switch tabs, download /
         preview images, etc. So we opt the whole panel into the allow list;
         the VoiceRxFlow `shouldPass()` will still block text inputs /
         textareas / contenteditable surfaces regardless, and individual
         Add-or-Edit CTAs can be tagged `data-voice-block` to lock them too. */
      data-voice-allow>
      
      {/* rx-section-slide-* styles live in app/globals.css */}
      <div aria-hidden="true" className={`absolute ${rxSidebarTokens.panelBorderClass} border-r border-solid inset-[0_-1px_0_0] pointer-events-none`} />
      <SectionHeader title={SECTION_TITLES[activeId]} activeId={activeId} onClose={onClose} />
      {/* flex-[1_0_0] + min-h-px → constrains height so inner overflow-y-auto works.
           overflow-hidden on the absolute layer prevents the slide animation from
           spilling outside the panel during the transition. */}
      <div className={`flex-[1_0_0] min-h-px min-w-px relative w-full overflow-hidden ${fillFlash ? "tp-section-just-filled" : ""}`}>
        <div className="absolute inset-0 flex flex-col">
          {/* `key={activeId}` forces React to remount on section change so the
               animation re-plays. */}
          <div
            key={activeId}
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${animClass}`}>
            
            <SectionContent activeId={activeId} />
          </div>
        </div>
      </div>
    </div>);

}