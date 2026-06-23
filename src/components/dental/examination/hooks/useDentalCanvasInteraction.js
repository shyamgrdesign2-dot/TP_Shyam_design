/**
 * useDentalCanvasInteraction
 *
 * Encapsulates all stateful interaction logic for the DentalCanvas:
 * patient-type selection, tooth/zone selection, findings, entries,
 * treatment history, multi-select, AI-scan event handling, and
 * localStorage persistence.
 *
 * Composed from three focused hooks (public return shape is unchanged):
 *   • useDentalCanvasState       — state, refs, pure-derived values
 *   • useDentalCanvasPersistence — API/localStorage hydration + persistence
 *   • useDentalCanvasEvents      — interaction callbacks + AI-scan listener
 *
 * Returns a stable shape: { ...state, ...actions }
 */
import { useDentalCanvasState } from "./useDentalCanvasState";
import { useDentalCanvasPersistence } from "./useDentalCanvasPersistence";
import { useDentalCanvasEvents } from "./useDentalCanvasEvents";

export {
  getTeethForPatientType,
  getDefaultFdiForPatientType
} from "./canvas-interaction-helpers";

/**
 * @param {{ patientId: string, patientAge: number, initialData?: object }} params
 * @returns {{ ...state, ...actions }}
 */
export function useDentalCanvasInteraction({ patientId, patientAge = 30, initialData }) {
  const state = useDentalCanvasState({ patientId, patientAge, initialData });
  useDentalCanvasPersistence(state);
  const events = useDentalCanvasEvents(state);

  return {
    // State
    patientType: state.patientType,
    activeTeeth: state.activeTeeth,
    viewMode: state.viewMode,
    selectedTooth: state.selectedTooth,
    selectionScope: state.selectionScope,
    selectedZone: state.selectedZone,
    findingsByTooth: state.findingsByTooth,
    zoneHitPoints: state.zoneHitPoints,
    zoneNotes: state.zoneNotes,
    implantTeeth: state.implantTeeth,
    toothDiagnoses: state.toothDiagnoses,
    toothNotes: state.toothNotes,
    allEntries: state.allEntries,
    oralEntries: state.oralEntries,
    oralNotes: state.oralNotes,
    oralHighlightFdis: state.oralHighlightFdis,
    treatmentHistoryDetailsByTooth: state.treatmentHistoryDetailsByTooth,
    highlightZones: state.highlightZones,
    multiSelectZones: state.multiSelectZones,
    multiSelectActive: state.multiSelectActive,
    hoveredToothFdi: state.hoveredToothFdi,
    dentitionVerticalNudge: state.dentitionVerticalNudge,
    dentitionCameraOverride: state.dentitionCameraOverride,
    hideExamineHint: state.hideExamineHint,
    agentApplyPulseFdis: state.agentApplyPulseFdis,
    controlsRef: state.controlsRef,
    // Derived
    currentToothDiagnoses: state.currentToothDiagnoses,
    currentToothVisualTypes: state.currentToothVisualTypes,
    isImplant: state.isImplant,
    currentToothNotes: state.currentToothNotes,
    currentTreatmentHistoryDetails: state.currentTreatmentHistoryDetails,
    findings: state.findings,
    currentToothEntries: state.currentToothEntries,
    // Actions
    ...events,
    setHoveredToothFdi: state.setHoveredToothFdi
  };
}
