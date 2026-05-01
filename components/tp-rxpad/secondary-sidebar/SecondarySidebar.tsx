/**
 * SecondarySidebar — top-level orchestrator.
 * Manages active section state and renders:
 *   • NavPanel   (80px, dark-purple gradient, scrollable, with 3-state icons)
 *   • ContentPanel (250px, white, section-scrollable, sticky section headers)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { NavPanel }     from "./NavPanel";
import { ContentPanel } from "./ContentPanel";
import type { NavItemId } from "./types";
import { useRxPadSync } from "@/components/tp-rxpad/rxpad-sync-context";
import { SECTIONS_WITH_DATA, SECTIONS_EMPTY } from "./types";

/** All valid NavItemIds for validation */
const ALL_NAV_IDS = new Set<string>([...SECTIONS_WITH_DATA, ...SECTIONS_EMPTY]);

/**
 * Section traversal order for swipe / overscroll navigation. Mirrors the
 * top-to-bottom order in NavPanel so swiping feels spatially consistent.
 * `drAgent` is excluded — it lives in its own panel.
 */
const NAV_SEQUENCE: NavItemId[] = [
  "pastVisits",
  "vitals",
  "history",
  "labResults",
  "medicalRecords",
  "gynec",
  "obstetric",
  "vaccine",
  "growth",
  "personalNotes",
];

function neighbourSection(current: NavItemId, dir: "next" | "prev"): NavItemId | null {
  const idx = NAV_SEQUENCE.indexOf(current);
  if (idx === -1) return null;
  const target = dir === "next" ? idx + 1 : idx - 1;
  return NAV_SEQUENCE[target] ?? null;
}

interface SecondarySidebarProps {
  collapseExpandedOnly?: boolean
  onSectionSelect?: (id: NavItemId | null) => void
}

export function SecondarySidebar({ collapseExpandedOnly = false, onSectionSelect }: SecondarySidebarProps) {
  const [activeId, setActiveId] = useState<NavItemId | null>("pastVisits");
  const { lastSignal, publishSignal, acknowledgeHistoricalSection, activeVoiceModule } = useRxPadSync()
  const lastSignalIdRef = useRef<number>(0)

  // Note: collapseExpandedOnly is no longer used — both sidebars can
  // coexist. Kept in the interface for backward compatibility.

  // Listen for section_focus signals from Dr. Agent panel (or elsewhere)
  // and open the corresponding sidebar section
  useEffect(() => {
    if (!lastSignal || lastSignal.id === lastSignalIdRef.current) return
    lastSignalIdRef.current = lastSignal.id

    if (lastSignal.type === "section_focus" && lastSignal.sectionId) {
      const targetId = lastSignal.sectionId as NavItemId
      if (ALL_NAV_IDS.has(targetId)) {
        setActiveId(targetId)
        acknowledgeHistoricalSection(targetId)
        onSectionSelect?.(targetId)
      }
    }
  }, [lastSignal, onSectionSelect, acknowledgeHistoricalSection])

  const voiceActiveSection = activeVoiceModule ? activeId : null

  function handleSelect(id: NavItemId) {
    // While a per-section sidebar dictation is recording, the sidebar
    // is locked to its current section — switching tabs mid-recording
    // would orphan the active recorder. The global VoiceRx FAB flow
    // does NOT block sidebar navigation; it lives in its own panel.
    if (activeVoiceModule) return
    setActiveId((prev) => {
      if (prev === id && activeVoiceModule) return prev
      const next = prev === id ? null : id
      if (next) {
        publishSignal({ type: "section_focus", sectionId: next })
        acknowledgeHistoricalSection(next)
      }
      onSectionSelect?.(next)
      return next
    });
  }

  const activeIdRef = useRef<NavItemId | null>(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const handleSwipeNavigate = useCallback(
    (dir: "next" | "prev") => {
      const current = activeIdRef.current
      if (!current) return
      const target = neighbourSection(current, dir)
      if (!target) return
      setActiveId(target)
      publishSignal({ type: "section_focus", sectionId: target })
      acknowledgeHistoricalSection(target)
      onSectionSelect?.(target)
    },
    [acknowledgeHistoricalSection, onSectionSelect, publishSignal],
  )

  return (
    // overflow-visible → the white selection arrow on the right edge isn't clipped
    <div className="content-stretch flex items-start relative h-full overflow-visible">
      <NavPanel active={activeId} onSelect={handleSelect} voiceActiveSection={voiceActiveSection} />
      {activeId && !collapseExpandedOnly ? (
        <ContentPanel
          activeId={activeId}
          onClose={() => setActiveId(null)}
          onSwipeNavigate={handleSwipeNavigate}
        />
      ) : null}
    </div>
  );
}
