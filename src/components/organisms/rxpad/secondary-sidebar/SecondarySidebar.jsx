/**
 * SecondarySidebar — top-level orchestrator.
 * Manages active section state and renders:
 *   • NavPanel   (80px, dark-purple gradient, scrollable, with 3-state icons)
 *   • ContentPanel (250px, white, section-scrollable, sticky section headers)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { NavPanel } from "./NavPanel";
import { ContentPanel } from "./ContentPanel";

import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";
import { SECTIONS_WITH_DATA, SECTIONS_EMPTY } from "./types";

/** All valid NavItemIds for validation */
const ALL_NAV_IDS = new Set([...SECTIONS_WITH_DATA, ...SECTIONS_EMPTY]);

/**
 * Section traversal order for swipe / overscroll navigation. Mirrors the
 * top-to-bottom order in NavPanel so swiping feels spatially consistent.
 * `drAgent` is excluded — it lives in its own panel.
 */
const NAV_SEQUENCE = [
"pastVisits",
"vitals",
"history",
"labResults",
"medicalRecords",
"gynec",
"obstetric",
"vaccine",
"growth",
// Ophthal (Optal) sits above Private Notes — Private Notes is the
// last item in the rail because it's a free-form scratchpad rather
// than structured patient history.
"optal",
"personalNotes"];


function neighbourSection(current, dir) {
  const idx = NAV_SEQUENCE.indexOf(current);
  if (idx === -1) return null;
  const target = dir === "next" ? idx + 1 : idx - 1;
  return NAV_SEQUENCE[target] ?? null;
}






export function SecondarySidebar({ collapseExpandedOnly = false, onSectionSelect }) {
  const [activeId, setActiveId] = useState("pastVisits");
  const { lastSignal, publishSignal, acknowledgeHistoricalSection, activeVoiceModule } = useRxPadSync();
  const lastSignalIdRef = useRef(0);

  // Note: collapseExpandedOnly is no longer used — both sidebars can
  // coexist. Kept in the interface for backward compatibility.

  // Listen for section_focus signals from Dr. Agent panel (or elsewhere)
  // and open the corresponding sidebar section
  useEffect(() => {
    if (!lastSignal || lastSignal.id === lastSignalIdRef.current) return;
    lastSignalIdRef.current = lastSignal.id;

    if (lastSignal.type === "section_focus" && lastSignal.sectionId) {
      const targetId = lastSignal.sectionId;
      if (ALL_NAV_IDS.has(targetId)) {
        setActiveId(targetId);
        acknowledgeHistoricalSection(targetId);
        onSectionSelect?.(targetId);
      }
    }
  }, [lastSignal, onSectionSelect, acknowledgeHistoricalSection]);

  // Sidebar-section labels (matches NavPanel.jsx NAV_META). Only when
  // `activeVoiceModule` resolves to one of these labels do we paint the
  // recording dot on a sidebar nav item — RxPad form modules
  // ("Symptoms", "Examinations", "Diagnosis", …) intentionally yield no
  // dot here because their recording state belongs to the form, not
  // the sidebar.
  //
  // This fixes the bug where opening a quick-mic on Symptoms while
  // Records was the open sidebar tab made a red dot show up on Records.
  const SIDEBAR_VOICE_LABELS = {
    "Past Visits": "pastVisits",
    Vitals: "vitals",
    History: "history",
    "Medical History": "history",
    "Lab Results": "labResults",
    Records: "medicalRecords",
    "Medical Records": "medicalRecords",
    Gynec: "gynec",
    "Gynec History": "gynec",
    Obstetric: "obstetric",
    "Obstetric History": "obstetric",
    Vaccine: "vaccine",
    "Vaccination History": "vaccine",
    Growth: "growth",
    Ophthal: "optal",
    "Optal History": "optal",
    "Ophthal History": "optal",
    "Personal Notes": "personalNotes",
    "Private Notes": "personalNotes",
  };
  const voiceActiveSection = activeVoiceModule
    ? SIDEBAR_VOICE_LABELS[activeVoiceModule] ?? null
    : null;

  // True only when a *sidebar* section (Past Visits, Vitals, etc.) is
  // recording — used to lock sidebar tab switching mid-recording. An
  // RxPad-form recording (Symptoms / Examinations / etc.) yields false
  // here so the doctor can still browse the historical sidebar.
  const sidebarVoiceLocked = voiceActiveSection !== null;

  function handleSelect(id) {
    // Only block sidebar tab switching when the voice module that's
    // recording belongs to a sidebar section — the global VoiceRx FAB
    // flow and per-RxPad-module recorders both keep sidebar nav free.
    if (sidebarVoiceLocked) return;
    setActiveId((prev) => {
      if (prev === id && sidebarVoiceLocked) return prev;
      const next = prev === id ? null : id;
      if (next) {
        publishSignal({ type: "section_focus", sectionId: next });
        acknowledgeHistoricalSection(next);
      }
      onSectionSelect?.(next);
      return next;
    });
  }

  const activeIdRef = useRef(activeId);
  useEffect(() => {activeIdRef.current = activeId;}, [activeId]);

  const handleSwipeNavigate = useCallback(
    (dir) => {
      const current = activeIdRef.current;
      if (!current) return;
      const target = neighbourSection(current, dir);
      if (!target) return;
      setActiveId(target);
      publishSignal({ type: "section_focus", sectionId: target });
      acknowledgeHistoricalSection(target);
      onSectionSelect?.(target);
    },
    [acknowledgeHistoricalSection, onSectionSelect, publishSignal]
  );

  return (
    // overflow-visible → the white selection arrow on the right edge isn't clipped
    <div className="content-stretch flex items-start relative h-full overflow-visible">
      <NavPanel active={activeId} onSelect={handleSelect} voiceActiveSection={voiceActiveSection} />
      {activeId && !collapseExpandedOnly ?
      <ContentPanel
        activeId={activeId}
        onClose={() => {setActiveId(null);onSectionSelect?.(null);}}
        onSwipeNavigate={handleSwipeNavigate} /> :

      null}
    </div>);

}