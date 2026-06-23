/**
 * useDentalCanvasState — owns all raw state, refs, and pure-derived values for
 * useDentalCanvasInteraction. Returns a single bag consumed by the events and
 * persistence hooks and re-exposed (unchanged shape) by the composing hook.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { QUADRANT_LABELS } from "../types";
import { VISUAL_TYPE, toVisualTypeSet } from "../../../../utils/dentalVisualTypes";
import { useDentalMasters } from "../../../../hooks/useDentalMasters";
import {
  getTeethForPatientType,
  getDefaultFdiForPatientType
} from "./canvas-interaction-helpers";

// ── Stable empty references ───────────────────────────────────────────────────
const EMPTY_FINDINGS = [];
const EMPTY_DIAGNOSES = new Set();
const EMPTY_TREATMENTS = {};

export function useDentalCanvasState({ patientId, patientAge = 30, initialData }) {
  const { activeDiagnoses, activeToothDiagnoses, visualTypeMap } = useDentalMasters();
  const VALID_TOOTH_DIAG = useMemo(
    () => new Set(activeToothDiagnoses),
    [activeToothDiagnoses]
  );
  const VALID_SURFACE_FINDING = useMemo(
    () => new Set(activeDiagnoses),
    [activeDiagnoses]
  );

  // ── Seed data ──────────────────────────────────────────────────────────────
  const initialState = initialData;

  const initialToothDiagnoses = useMemo(() => {
    if (!initialState?.toothDiagnoses) return {};
    const out = {};
    for (const [fdi, diags] of Object.entries(initialState.toothDiagnoses)) {
      out[fdi] = new Set(diags);
    }
    return out;
  }, [initialState]);

  const initialImplants = useMemo(
    () => new Set(initialState?.implantTeeth ?? []),
    [initialState]
  );

  const initialFindings = useMemo(() => {
    if (!initialState?.findingsByTooth) return {};
    const out = {};
    for (const [fdi, list] of Object.entries(initialState.findingsByTooth)) {
      out[fdi] = list.map((f, i) => ({
        id: f.id || `seed-${fdi}-${i}`,
        zoneId: f.zoneId,
        type: f.type,
        notes: f.notes || ""
      }));
    }
    return out;
  }, [initialState]);

  // ── Core state ─────────────────────────────────────────────────────────────
  const [patientType, setPatientType] = useState(
    // API-sourced dentitionType takes priority — canvas only mounts after loading completes
    // so initialData is already the final value. Falls back to age-based for new patients.
    initialData?.dentitionType ??
      (patientAge < 12 ? "pediatric" : patientAge < 18 ? "mixed" : "adult")
  );
  const activeTeeth = useMemo(
    () => getTeethForPatientType(patientType),
    [patientType]
  );
  const [viewMode, setViewMode] = useState("dentition");
  const [selectedTooth, setSelectedTooth] = useState(
    () =>
      activeTeeth.find(
        (t) => t.fdi === getDefaultFdiForPatientType(patientType)
      ) ?? activeTeeth[0]
  );
  const [selectionScope, setSelectionScope] = useState({
    type: "tooth",
    id: "tooth",
    label: "",
    fdis: []
  });

  const hydratedStoragePatientIdRef = useRef(null);
  const hydratedApiPatientIdRef = useRef(null);
  const hydratedOralApiPatientIdRef = useRef(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [, setHoveredZone] = useState(null);
  const [findingsByTooth, setFindingsByTooth] = useState(initialFindings);
  const [zoneHitPoints, setZoneHitPoints] = useState({});
  const [zoneNotes, setZoneNotes] = useState({});
  const [implantTeeth, setImplantTeeth] = useState(initialImplants);
  const [toothDiagnoses, setToothDiagnoses] = useState(initialToothDiagnoses);
  const [toothNotes, setToothNotes] = useState({});
  const [allEntries, setAllEntries] = useState(
    () => Array.isArray(initialState?.allEntries) ? initialState.allEntries : []
  );
  const [oralEntries, setOralEntries] = useState(() => Array.isArray(initialState?.oralEntries) ? initialState.oralEntries : []);
  const [oralNotes, setOralNotes] = useState(() => initialState?.oralNotes ?? "");
  const [oralHighlightFdis, setOralHighlightFdis] = useState(() => new Set());
  const oralIdRef = useRef(0);
  const [treatmentHistoryDetailsByTooth, setTreatmentHistoryDetailsByTooth] =
    useState({});
  const [highlightZones, setHighlightZones] = useState([]);
  const [multiSelectZones, setMultiSelectZones] = useState(() => new Set());
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const [hoveredToothFdi, setHoveredToothFdi] = useState(null);
  const [dentitionVerticalNudgeByType, setDentitionVerticalNudgeByType] =
    useState({});
  const [dentitionCameraByType, setDentitionCameraByType] = useState({});
  const [hideExamineHint, setHideExamineHint] = useState(false);
  const [agentApplyPulseFdis, setAgentApplyPulseFdis] = useState(
    () => new Set()
  );

  const agentPulseClearTimerRef = useRef(null);
  const controlsRef = useRef(null);

  const dentitionVerticalNudge = dentitionVerticalNudgeByType[patientType] ?? 0;
  const dentitionCameraOverride = dentitionCameraByType[patientType];

  // ── Seed default selection scope ───────────────────────────────────────────
  useEffect(() => {
    if (!selectionScope.fdis.length) {
      setSelectionScope({
        type: "tooth",
        id: selectedTooth.fdi,
        label: `${QUADRANT_LABELS[selectedTooth.quadrant]} ${selectedTooth.name}`,
        fdis: [selectedTooth.fdi]
      });
    }
  }, [selectionScope.fdis.length, selectedTooth]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentToothDiagnoses = useMemo(
    () => toothDiagnoses[selectedTooth.fdi] || EMPTY_DIAGNOSES,
    [toothDiagnoses, selectedTooth.fdi]
  );
  const currentToothVisualTypes = useMemo(
    () => toVisualTypeSet(currentToothDiagnoses, visualTypeMap),
    [currentToothDiagnoses, visualTypeMap]
  );
  const isImplant =
    currentToothVisualTypes.has(VISUAL_TYPE.IMPLANT) || implantTeeth.has(selectedTooth.fdi);
  const currentToothNotes = toothNotes[selectedTooth.fdi] || "";
  const currentTreatmentHistoryDetails = useMemo(
    () => treatmentHistoryDetailsByTooth[selectedTooth.fdi] || EMPTY_TREATMENTS,
    [treatmentHistoryDetailsByTooth, selectedTooth.fdi]
  );
  const findings = findingsByTooth[selectedTooth.fdi] || EMPTY_FINDINGS;
  const currentToothEntries = useMemo(
    () => allEntries.filter((e) => e.toothFdi === selectedTooth.fdi),
    [allEntries, selectedTooth.fdi]
  );

  return {
    patientId,
    initialData,
    VALID_TOOTH_DIAG,
    VALID_SURFACE_FINDING,
    patientType, setPatientType,
    activeTeeth,
    viewMode, setViewMode,
    selectedTooth, setSelectedTooth,
    selectionScope, setSelectionScope,
    selectedZone, setSelectedZone,
    setHoveredZone,
    findingsByTooth, setFindingsByTooth,
    zoneHitPoints, setZoneHitPoints,
    zoneNotes, setZoneNotes,
    implantTeeth, setImplantTeeth,
    toothDiagnoses, setToothDiagnoses,
    toothNotes, setToothNotes,
    allEntries, setAllEntries,
    oralEntries, setOralEntries,
    oralNotes, setOralNotes,
    oralHighlightFdis, setOralHighlightFdis,
    oralIdRef,
    treatmentHistoryDetailsByTooth, setTreatmentHistoryDetailsByTooth,
    highlightZones, setHighlightZones,
    multiSelectZones, setMultiSelectZones,
    multiSelectActive, setMultiSelectActive,
    hoveredToothFdi, setHoveredToothFdi,
    dentitionVerticalNudgeByType, setDentitionVerticalNudgeByType,
    dentitionCameraByType, setDentitionCameraByType,
    hideExamineHint, setHideExamineHint,
    agentApplyPulseFdis, setAgentApplyPulseFdis,
    agentPulseClearTimerRef,
    controlsRef,
    hydratedStoragePatientIdRef,
    hydratedApiPatientIdRef,
    hydratedOralApiPatientIdRef,
    dentitionVerticalNudge,
    dentitionCameraOverride,
    currentToothDiagnoses,
    currentToothVisualTypes,
    isImplant,
    currentToothNotes,
    currentTreatmentHistoryDetails,
    findings,
    currentToothEntries,
    visualTypeMap,
  };
}
