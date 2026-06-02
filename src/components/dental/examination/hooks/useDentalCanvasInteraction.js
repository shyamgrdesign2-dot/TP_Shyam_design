/**
 * useDentalCanvasInteraction
 *
 * Encapsulates all stateful interaction logic for the DentalCanvas:
 * patient-type selection, tooth/zone selection, findings, entries,
 * treatment history, multi-select, AI-scan event handling, and
 * localStorage persistence.
 *
 * Returns a stable shape: { ...state, ...actions }
 */
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo
} from "react";
import { applyDiagnosisSelection } from "../DiagnosisMatrix";
import {
  TEETH,
  PEDIATRIC_TEETH,
  QUADRANT_LABELS,
  getDefaultTreatmentSurfaces,
  ALL_ZONES,
  isOralRegionPosition
} from "../types";
import { DENTAL_AI_SCAN_APPLY_EVENT } from "../../tp-rxpad/dental-ai/dental-ai-events";
import { EXAM_CHART_STORAGE_PREFIX } from "../../plan/exam-suggestions";
import { useDentalMasters } from "../../../../hooks/useDentalMasters";
import { INITIAL_TOOTH_STATE } from "../../mock-data";

// ── Module-level counter so IDs are unique across mounts ─────────────────────
let findingIdCounter = 0;

// ── Stable empty references ───────────────────────────────────────────────────
const EMPTY_FINDINGS = [];
const EMPTY_DIAGNOSES = new Set();
const EMPTY_TREATMENTS = {};

// ── Helpers (pure, no React deps) ────────────────────────────────────────────

/** Convert a YYYY-MM-DD date string back to the closest UI label ("1 hour" … "1 year"). */
const dateToSinceLabel = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const diffDays = Math.round((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000);
  if (diffDays < 1) return "1 hour";
  if (diffDays <= 3) return "1 day";
  if (diffDays <= 14) return "1 week";
  if (diffDays <= 180) return "1 month";
  return "1 year";
};

const ARCH_SCOPE_IDS = new Set([
  "RIGHT_ARCH",
  "LEFT_ARCH",
  "UPPER_ARCH",
  "LOWER_ARCH"
]);

const SCOPE_SELECTION_LABELS = {
  UR: "Upper Right Quadrant",
  UL: "Upper Left Quadrant",
  LR: "Lower Right Quadrant",
  LL: "Lower Left Quadrant",
  RIGHT_ARCH: "Right arch",
  LEFT_ARCH: "Left arch",
  UPPER_ARCH: "Maxillary arch",
  LOWER_ARCH: "Mandibular arch"
};

/**
 * Agent / voice rows share the same clinical name — give each applied row its own key.
 * @param {object} acc
 * @param {string} preferredName
 * @returns {string}
 */
function allocateTreatmentHistoryDetailKey(acc, preferredName) {
  const base = (preferredName && String(preferredName).trim()) || "Treatment";
  if (!acc[base]) return base;
  let i = 2;
  while (acc[`${base} (${i})`]) i += 1;
  return `${base} (${i})`;
}

/**
 * Map radiology / voice surface text to chart zones for treatment-history rows.
 * @param {string} surfaceRaw
 * @param {string} treatmentName
 * @returns {string[]}
 */
function zonesFromAgentHistorySurface(surfaceRaw, treatmentName) {
  const fallback = () => {
    const d = [...getDefaultTreatmentSurfaces(treatmentName)];
    return d.length ? d : ["whole"];
  };
  const raw = (surfaceRaw || "").trim();
  if (!raw || /whole/i.test(raw)) return fallback();
  const s = raw.toLowerCase();
  const pairs = [
    ["occlusal", "occlusal"],
    ["buccal", "buccal"],
    ["labial", "buccal"],
    ["lingual", "lingual"],
    ["palatal", "lingual"],
    ["mesial", "mesial"],
    ["distal", "distal"],
    ["cervical", "cervical"],
    ["incisal", "occlusal"],
    ["root", "root"]
  ];
  for (const [needle, z] of pairs) {
    if (s.includes(needle)) {
      if (z === "whole" || ALL_ZONES.includes(z)) return [z];
      break;
    }
  }
  return fallback();
}

/**
 * Return the teeth array for a given patient type.
 * @param {"adult"|"pediatric"|"mixed"} type
 * @returns {object[]}
 */
export function getTeethForPatientType(type) {
  if (type === "adult") return TEETH;
  if (type === "pediatric") return PEDIATRIC_TEETH;
  return [...TEETH, ...PEDIATRIC_TEETH];
}

/**
 * Return the default selected FDI for a given patient type.
 * @param {"adult"|"pediatric"|"mixed"} type
 * @returns {string}
 */
export function getDefaultFdiForPatientType(type) {
  if (type === "adult") return "26";
  if (type === "pediatric") return "64";
  return "26";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param {{ patientId: string, patientAge: number, initialData?: object }} params
 * @returns {{ ...state, ...actions }}
 */
export function useDentalCanvasInteraction({ patientId, patientAge = 30, initialData }) {
  const { activeDiagnoses, activeToothDiagnoses } = useDentalMasters();
  const VALID_TOOTH_DIAG = useMemo(
    () => new Set(activeToothDiagnoses),
    [activeToothDiagnoses]
  );
  const VALID_SURFACE_FINDING = useMemo(
    () => new Set(activeDiagnoses),
    [activeDiagnoses]
  );

  // ── Seed data ──────────────────────────────────────────────────────────────
  const initialState = initialData || INITIAL_TOOTH_STATE[patientId];

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
    patientAge < 12 ? "pediatric" : patientAge < 18 ? "mixed" : "adult"
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

  // ── Hydrate dental canvas state from API initialData (one-time per patient) ──
  useEffect(() => {
    if (!initialData || hydratedApiPatientIdRef.current === patientId) return;
    hydratedApiPatientIdRef.current = patientId;

    // Treatment history: API array [{name, surface_codes, since_date, notes}] → object map
    const rawHistory = initialData.treatmentHistoryDetailsByTooth;
    if (rawHistory && Object.keys(rawHistory).length) {
      const converted = {};
      for (const [fdi, history] of Object.entries(rawHistory)) {
        if (Array.isArray(history)) {
          converted[fdi] = {};
          for (const h of history) {
            converted[fdi][h.name] = {
              surfaces: h.surface_codes || ["whole"],
              since: dateToSinceLabel(h.since_date),
              note: h.notes || "",
            };
          }
        } else if (history && typeof history === "object") {
          converted[fdi] = history;
        }
      }
      if (Object.keys(converted).length > 0) {
        setTreatmentHistoryDetailsByTooth(converted);
      }
    }

    // Findings: API [{id, type, zoneId, notes}] → canvas array per tooth
    const rawFindings = initialData.findingsByTooth;
    if (rawFindings && Object.keys(rawFindings).length) {
      const converted = {};
      for (const [fdi, list] of Object.entries(rawFindings)) {
        if (!Array.isArray(list) || !list.length) continue;
        converted[fdi] = list.map((f, i) => ({
          id: f.id || `seed-${fdi}-${i}`,
          zoneId: f.zoneId || "whole",
          type: f.type,
          notes: f.notes || "",
        }));
      }
      if (Object.keys(converted).length > 0) {
        setFindingsByTooth(converted);
      }
    }

    // Tooth notes
    const rawNotes = initialData.toothNotes;
    if (rawNotes && Object.keys(rawNotes).length) {
      setToothNotes(rawNotes);
    }

    // Primary diagnosis chips (Missing, Crown, RCT…)
    const rawDiagnoses = initialData.toothDiagnoses;
    if (rawDiagnoses && Object.keys(rawDiagnoses).length) {
      setToothDiagnoses((prev) => {
        const next = { ...prev };
        for (const [fdi, diags] of Object.entries(rawDiagnoses)) {
          const arr = Array.isArray(diags) ? diags : diags instanceof Set ? [...diags] : [];
          if (arr.length > 0) next[fdi] = new Set(arr);
        }
        return next;
      });
      // Sync implantTeeth from diagnoses
      setImplantTeeth((prev) => {
        const next = new Set(prev);
        for (const [fdi, diags] of Object.entries(rawDiagnoses)) {
          const arr = Array.isArray(diags) ? diags : diags instanceof Set ? [...diags] : [];
          if (arr.includes("Implant")) next.add(fdi);
        }
        return next;
      });
    }

  }, [initialData, patientId]);

  // ── Hydrate oral entries from API initialData (fires once oral data is available) ─
  // Separate from the dental hydration so that oral entries arriving after dental
  // (due to independent fetch timing) are not blocked by the dental hydration guard.
  useEffect(() => {
    if (!initialData || hydratedOralApiPatientIdRef.current === patientId) return;
    const rawOralEntries = initialData.oralEntries;
    // Only hydrate once we have actual oral data (non-empty array)
    if (!Array.isArray(rawOralEntries) || rawOralEntries.length === 0) return;
    hydratedOralApiPatientIdRef.current = patientId;
    setOralEntries(rawOralEntries);
    const rawOralNotes = initialData.oralNotes;
    if (typeof rawOralNotes === "string") {
      setOralNotes(rawOralNotes);
    }
  }, [initialData, patientId]);

  // ── Hydrate from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || hydratedStoragePatientIdRef.current === patientId) return;
    hydratedStoragePatientIdRef.current = patientId;
    const raw = window.localStorage.getItem(`dental.canvas.state.${patientId}`);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      const nextType =
        saved.patientType === "adult" ||
        saved.patientType === "pediatric" ||
        saved.patientType === "mixed"
          ? saved.patientType
          : undefined;
      if (nextType) setPatientType(nextType);
      const source = getTeethForPatientType(nextType ?? patientType);
      const candidateFdi = saved.selectedToothFdi;
      const fallbackFdi = getDefaultFdiForPatientType(nextType ?? patientType);
      const tooth =
        source.find((t) => t.fdi === candidateFdi) ??
        source.find((t) => t.fdi === fallbackFdi) ??
        source[0];
      if (tooth) {
        setSelectedTooth(tooth);
        setSelectionScope({
          type: "tooth",
          id: tooth.fdi,
          label: `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name}`,
          fdis: [tooth.fdi]
        });
      }
      if (saved.selectionScope && saved.selectionScope.fdis?.length) {
        setSelectionScope(saved.selectionScope);
      }
      // NOTE: intentionally do NOT restore `viewMode` from localStorage.
      if (saved.dentitionVerticalNudgeByType) {
        setDentitionVerticalNudgeByType(saved.dentitionVerticalNudgeByType);
      }
      if (saved.dentitionCameraByType) {
        setDentitionCameraByType(saved.dentitionCameraByType);
      }
      if (Array.isArray(saved.oralEntries)) {
        setOralEntries(saved.oralEntries);
      }
      if (typeof saved.oralNotes === "string") {
        setOralNotes(saved.oralNotes);
      }
    } catch {
      // ignore corrupted localStorage payload
    }
  }, [patientId, patientType]);

  // ── Hint dismissal ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hidden = window.localStorage.getItem(
      `dental.canvas.hintDismissed.${patientId}`
    );
    if (hidden === "1") setHideExamineHint(true);
  }, [patientId]);

  // ── Persist UI state ───────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      patientType,
      viewMode,
      selectedToothFdi: selectedTooth.fdi,
      selectionScope,
      dentitionVerticalNudgeByType,
      dentitionCameraByType,
      oralEntries,
      oralNotes
    };
    window.localStorage.setItem(
      `dental.canvas.state.${patientId}`,
      JSON.stringify(payload)
    );
  }, [
    patientId,
    patientType,
    viewMode,
    selectedTooth.fdi,
    selectionScope,
    dentitionVerticalNudgeByType,
    dentitionCameraByType,
    oralEntries,
    oralNotes
  ]);

  // ── Persist clinical chart data ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const entries = allEntries
      .filter((e) => e.kind === "procedure" || e.kind === "planned")
      .map((e) => ({
        toothFdi: e.toothFdi,
        kind: e.kind,
        name: e.name,
        surfaces: [...(e.surfaces ?? [])]
      }));
    const findingsSerialized = Object.fromEntries(
      Object.entries(findingsByTooth).map(([fdi, list]) => [
        fdi,
        list.map((f) => ({ zoneId: f.zoneId, type: f.type }))
      ])
    );
    const diagSerialized = Object.fromEntries(
      Object.entries(toothDiagnoses).map(([fdi, set]) => [fdi, [...set]])
    );
    try {
      window.localStorage.setItem(
        `${EXAM_CHART_STORAGE_PREFIX}${patientId}`,
        JSON.stringify({
          updatedAt: Date.now(),
          entries,
          toothDiagnoses: diagSerialized,
          findingsByTooth: findingsSerialized,
          oralEntries,
          oralNotes
        })
      );
      window.dispatchEvent(
        new CustomEvent("dental-exam-chart-updated", { detail: { patientId } })
      );
    } catch {
      // ignore quota / private mode
    }
  }, [patientId, allEntries, toothDiagnoses, findingsByTooth, oralEntries, oralNotes]);

  // ── Auto-dismiss hint when chart has data ──────────────────────────────────
  useEffect(() => {
    if (hideExamineHint) return;
    const hasExamData =
      allEntries.length > 0 ||
      Object.values(findingsByTooth).some((items) => items.length > 0);
    if (!hasExamData) return;
    setHideExamineHint(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `dental.canvas.hintDismissed.${patientId}`,
        "1"
      );
    }
  }, [allEntries.length, findingsByTooth, hideExamineHint, patientId]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentToothDiagnoses = useMemo(
    () => toothDiagnoses[selectedTooth.fdi] || EMPTY_DIAGNOSES,
    [toothDiagnoses, selectedTooth.fdi]
  );
  const isImplant =
    currentToothDiagnoses.has("Implant") || implantTeeth.has(selectedTooth.fdi);
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

  // ── Scope helpers ──────────────────────────────────────────────────────────
  const getScopeFdis = useCallback(
    (scope) => {
      const source = getTeethForPatientType(patientType);
      if (scope === "FULL") return source.map((t) => t.fdi);
      const quadrantMap = {
        UR: "upper-right",
        UL: "upper-left",
        LR: "lower-right",
        LL: "lower-left"
      };
      if (quadrantMap[scope])
        return source
          .filter((t) => t.quadrant === quadrantMap[scope])
          .map((t) => t.fdi);
      const archQuadrants = {
        RIGHT_ARCH: ["upper-right", "lower-right"],
        LEFT_ARCH: ["upper-left", "lower-left"],
        UPPER_ARCH: ["upper-right", "upper-left"],
        LOWER_ARCH: ["lower-right", "lower-left"]
      };
      const qs = archQuadrants[scope];
      if (qs)
        return source.filter((t) => qs.includes(t.quadrant)).map((t) => t.fdi);
      return [];
    },
    [patientType]
  );

  // ── Camera nudge / orbit ───────────────────────────────────────────────────
  const handleDentitionVerticalNudgeChange = useCallback(
    (value) => {
      setDentitionVerticalNudgeByType((prev) => {
        const current = prev[patientType] ?? 0;
        const nextRaw = typeof value === "function" ? value(current) : value;
        const next = Math.max(-2.0, Math.min(2.0, nextRaw));
        if (Math.abs(next - current) < 0.0001) return prev;
        return { ...prev, [patientType]: next };
      });
    },
    [patientType]
  );

  const handleDentitionControlsEnd = useCallback(() => {
    if (viewMode !== "dentition" || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const p = ctrl.object?.position;
    const t = ctrl.target;
    if (!p || !t) return;
    const pose = { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
    setDentitionCameraByType((prev) => ({ ...prev, [patientType]: pose }));
  }, [patientType, viewMode]);

  // ── Diagnosis / implant toggles ────────────────────────────────────────────
  const toggleToothDiagnosisRef = useRef(null);

  const toggleToothDiagnosis = useCallback(
    (diagnosis) => {
      const fdi = selectedTooth.fdi;
      setToothDiagnoses((prev) => {
        const current = new Set(prev[fdi] || []);
        const next = applyDiagnosisSelection(current, diagnosis);
        if (current.has("Implant") && !next.has("Implant")) {
          setImplantTeeth((ip) => {
            const n = new Set(ip);
            n.delete(fdi);
            return n;
          });
        }
        if (!current.has("Implant") && next.has("Implant")) {
          setImplantTeeth((ip) => {
            const n = new Set(ip);
            n.add(fdi);
            return n;
          });
        }
        return { ...prev, [fdi]: next };
      });
      setFindingsByTooth((prev) => {
        const next = { ...prev };
        delete next[fdi];
        return next;
      });
      if (diagnosis === "Missing" || diagnosis === "Extraction") {
        setImplantTeeth((prev) => {
          const next = new Set(prev);
          next.delete(selectedTooth.fdi);
          return next;
        });
        setSelectedZone(null);
      }
    },
    [selectedTooth.fdi]
  );

  // Keep deferred ref in sync so toggleImplant can route through the matrix.
  toggleToothDiagnosisRef.current = toggleToothDiagnosis;

  const toggleImplant = useCallback(() => {
    toggleToothDiagnosisRef.current?.("Implant");
    setSelectedZone((prev) =>
      prev === "cervical" || prev === "root" ? null : prev
    );
  }, []);

  const updateToothNotes = useCallback(
    (notes) => {
      setToothNotes((prev) => ({ ...prev, [selectedTooth.fdi]: notes }));
    },
    [selectedTooth.fdi]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleSelectTooth = useCallback((tooth) => {
    setSelectedTooth(tooth);
    setSelectionScope({
      type: "tooth",
      id: tooth.fdi,
      label: `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name}`,
      fdis: [tooth.fdi]
    });
    setSelectedZone(null);
    setViewMode("single-tooth");
  }, []);

  const handleBackToDentition = useCallback(() => {
    setViewMode("dentition");
    setSelectionScope((prevScope) => ({
      type: "tooth",
      id: prevScope.fdis[0] ?? "tooth",
      label: prevScope.label,
      fdis: prevScope.fdis
    }));
    setSelectedZone(null);
    setHoveredZone(null);
  }, []);

  const handleSelectScope = useCallback(
    (scope) => {
      const fdis = getScopeFdis(scope);
      if (fdis.length === 0) return;
      const representative =
        activeTeeth.find((t) => t.fdi === fdis[0]) ?? activeTeeth[0];
      setSelectedTooth(representative);
      const scopeType =
        scope === "FULL"
          ? "full-mouth"
          : ARCH_SCOPE_IDS.has(scope)
          ? "arch"
          : "quadrant";
      setSelectionScope({
        type: scopeType,
        id: scope,
        label: scope === "FULL" ? "Full mouth" : SCOPE_SELECTION_LABELS[scope],
        fdis
      });
      setSelectedZone(null);
      setViewMode("single-tooth");
    },
    [activeTeeth, getScopeFdis]
  );

  const handleToothScopeJump = useCallback(
    (scope) => {
      const fdis = getScopeFdis(scope);
      if (fdis.length === 0) return;
      setSelectedTooth((prev) => {
        if (prev && fdis.includes(prev.fdi)) return prev;
        return activeTeeth.find((t) => t.fdi === fdis[0]) ?? prev;
      });
      setSelectionScope({
        type:
          scope === "FULL"
            ? "full-mouth"
            : ARCH_SCOPE_IDS.has(scope)
            ? "arch"
            : "quadrant",
        id: scope,
        label: scope === "FULL" ? "Full mouth" : SCOPE_SELECTION_LABELS[scope],
        fdis
      });
      setSelectedZone(null);
      setViewMode("single-tooth");
    },
    [activeTeeth, getScopeFdis]
  );

  const handlePatientTypeChange = useCallback((nextType) => {
    setPatientType(nextType);
    const nextTeeth = getTeethForPatientType(nextType);
    setSelectedTooth((prev) => {
      const nextSelected =
        nextTeeth.find((t) => t.fdi === prev.fdi) ??
        nextTeeth.find(
          (t) => t.fdi === getDefaultFdiForPatientType(nextType)
        ) ??
        nextTeeth[0];
      setSelectionScope({
        type: "tooth",
        id: nextSelected.fdi,
        label: `${QUADRANT_LABELS[nextSelected.quadrant]} ${nextSelected.name}`,
        fdis: [nextSelected.fdi]
      });
      return nextSelected;
    });
  }, []);

  // ── Zone / surface selection ───────────────────────────────────────────────
  const handleSelectZone = useCallback(
    (zone, hitPoint, opts) => {
      if (
        currentToothDiagnoses.has("Missing") ||
        currentToothDiagnoses.has("Extraction")
      )
        return;
      if (hitPoint) {
        const key = `${selectedTooth.fdi}-${zone}`;
        setZoneHitPoints((prev) => ({ ...prev, [key]: hitPoint }));
      }
      if (opts?.multi) {
        setSelectedZone(zone);
        setMultiSelectZones((prev) => {
          const next = new Set(prev);
          if (zone !== "whole" && next.has("whole")) next.delete("whole");
          if (next.has(zone)) next.delete(zone);
          else next.add(zone);
          return next;
        });
        return;
      }
      setSelectedZone((prev) => (prev === zone ? null : zone));
    },
    [currentToothDiagnoses, selectedTooth.fdi]
  );

  const handleToggleZoneMultiSelect = useCallback(
    (zone) => {
      setSelectedZone((prev) =>
        multiSelectActive ? zone : prev === zone ? null : zone
      );
      if (!multiSelectActive) return;
      setMultiSelectZones((prev) => {
        if (zone === "whole") {
          return prev.has("whole") ? new Set() : new Set(["whole"]);
        }
        const next = new Set(prev);
        if (next.has("whole")) next.delete("whole");
        if (next.has(zone)) next.delete(zone);
        else next.add(zone);
        return next;
      });
    },
    [multiSelectActive]
  );

  const handleToggleZoneFromQuickSelector = useCallback(
    (zone) => {
      if (!multiSelectActive) {
        setMultiSelectZones((prev) => (prev.size === 0 ? prev : new Set()));
        setSelectedZone((prev) => (prev === zone ? null : zone));
        return;
      }
      setSelectedZone(zone);
      setMultiSelectZones((prev) => {
        if (zone === "whole") {
          return prev.has("whole") ? new Set() : new Set(["whole"]);
        }
        const next = new Set(prev);
        if (next.has("whole")) next.delete("whole");
        if (next.has(zone)) next.delete(zone);
        else next.add(zone);
        return next;
      });
    },
    [multiSelectActive]
  );

  const handleClearMultiSelect = useCallback(() => {
    setMultiSelectZones((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const handleClearSelectedZone = useCallback(() => {
    setSelectedZone(null);
  }, []);

  const handleSetMultiSelectZones = useCallback((zones) => {
    setMultiSelectZones((prev) => {
      if (prev.size === zones.length && zones.every((zone) => prev.has(zone)))
        return prev;
      return new Set(zones);
    });
  }, []);

  const handleSetMultiSelectActive = useCallback((active) => {
    setMultiSelectActive(active);
  }, []);

  const handleSetHoveredTooth = useCallback((fdi) => {
    setHoveredToothFdi(fdi);
  }, []);

  // ── Findings ───────────────────────────────────────────────────────────────
  const handleAddFinding = useCallback(
    (zoneId, type) => {
      const id = `finding-${++findingIdCounter}`;
      const fdi = selectedTooth.fdi;
      const hitPoint = zoneHitPoints[`${fdi}-${zoneId}`];
      setFindingsByTooth((prev) => {
        let list = [...(prev[fdi] || [])];
        if (type === "Normal") {
          list = list.filter((f) => f.zoneId !== zoneId);
        } else {
          list = list.filter(
            (f) => !(f.zoneId === zoneId && f.type === "Normal")
          );
        }
        list.push({ id, zoneId, type, notes: "", hitPoint });
        return { ...prev, [fdi]: list };
      });
    },
    [zoneHitPoints, selectedTooth.fdi]
  );

  const handleRemoveFinding = useCallback(
    (id) => {
      const fdi = selectedTooth.fdi;
      setFindingsByTooth((prev) => {
        const list = (prev[fdi] || []).filter((f) => f.id !== id);
        return { ...prev, [fdi]: list };
      });
    },
    [selectedTooth.fdi]
  );

  const handleUpdateNotes = useCallback((zoneId, notes) => {
    setZoneNotes((prev) => ({ ...prev, [zoneId]: notes }));
  }, []);

  // ── Entries (procedures / planned) ────────────────────────────────────────
  const handleAddEntry = useCallback(
    (partial) => {
      const fdi = selectedTooth.fdi;
      setAllEntries((prev) => [
        ...prev,
        {
          ...partial,
          id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          toothFdi: fdi
        }
      ]);
    },
    [selectedTooth.fdi]
  );

  const handleUpdateEntry = useCallback((id, patch) => {
    setAllEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  }, []);

  const handleRemoveEntry = useCallback((id) => {
    setAllEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateOralNotes = useCallback((v) => setOralNotes(v ?? ""), []);

  const addOralEntry = useCallback((kind, name) => {
    if (!name) return;
    setOralEntries((prev) => {
      if (prev.some((e) => e.kind === kind && e.name === name)) return prev;
      const id = `oral-${Date.now().toString(36)}-${++oralIdRef.current}`;
      return [...prev, { id, kind, name, surfaces: [], since: "", note: "" }];
    });
  }, []);

  const removeOralEntry = useCallback((id) => {
    setOralEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateOralEntry = useCallback((id, patch) => {
    setOralEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  }, []);

  const enterOralExam = useCallback(() => {
    setSelectionScope({
      type: "full-mouth",
      id: "FULL",
      label: "Full mouth",
      fdis: getScopeFdis("FULL")
    });
    setSelectedZone(null);
    setOralHighlightFdis(new Set());
    setViewMode("oral");
  }, [getScopeFdis]);

  const setOralHighlight = useCallback((positionIds) => {
    const ids = Array.isArray(positionIds) ? positionIds : [];
    const regionIds = ids.filter((p) => isOralRegionPosition(p));
    if (regionIds.length === 0) {
      setOralHighlightFdis(new Set());
      return;
    }
    const fdis = new Set();
    regionIds.forEach((r) => {
      ((r === "WHOLE" || r === "GENERALIZED") ? getScopeFdis("FULL") : getScopeFdis(r)).forEach((f) =>
        fdis.add(f)
      );
    });
    setOralHighlightFdis(fdis);
  }, [getScopeFdis]);

  // ── Treatment history details ──────────────────────────────────────────────
  const handleUpdateTreatmentHistoryDetail = useCallback(
    (name, patch) => {
      const fdi = selectedTooth.fdi;
      setTreatmentHistoryDetailsByTooth((prev) => {
        const currentToothDetails = prev[fdi] || {};
        const previous = currentToothDetails[name] || {
          surfaces: getDefaultTreatmentSurfaces(name)
        };
        return {
          ...prev,
          [fdi]: { ...currentToothDetails, [name]: { ...previous, ...patch } }
        };
      });
    },
    [selectedTooth.fdi]
  );

  const handleRemoveTreatmentHistoryDetail = useCallback(
    (name) => {
      const fdi = selectedTooth.fdi;
      setTreatmentHistoryDetailsByTooth((prev) => {
        const toothMap = prev[fdi];
        if (!toothMap || !toothMap[name]) return prev;
        const { [name]: _removed, ...rest } = toothMap;
        return { ...prev, [fdi]: rest };
      });
    },
    [selectedTooth.fdi]
  );

  const handleClearTreatmentHistoryDetails = useCallback(() => {
    const fdi = selectedTooth.fdi;
    setTreatmentHistoryDetailsByTooth((prev) => {
      if (!prev[fdi]) return prev;
      const next = { ...prev };
      delete next[fdi];
      return next;
    });
  }, [selectedTooth.fdi]);

  const handleSetHighlightZones = useCallback((zones) => {
    setHighlightZones(zones);
  }, []);

  // ── AI scan event listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      const detail = e.detail;
      if (!detail || detail.patientId !== patientId) return;
      const {
        teeth,
        focusFdi,
        openFullDentition,
        patientTypeHint,
        highlightFdis
      } = detail;
      if (!Array.isArray(teeth) || teeth.length === 0) return;
      const effectivePatientType =
        patientTypeHint === "adult" ||
        patientTypeHint === "pediatric" ||
        patientTypeHint === "mixed"
          ? patientTypeHint
          : patientType;
      if (
        patientTypeHint === "adult" ||
        patientTypeHint === "pediatric" ||
        patientTypeHint === "mixed"
      ) {
        setPatientType(patientTypeHint);
      }
      setToothDiagnoses((prev) => {
        const next = { ...prev };
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const cur = new Set(next[fdi] || []);
          if (t.implant) cur.add("Implant");
          for (const d of t.diagnoses || []) {
            if (VALID_TOOTH_DIAG.has(d)) cur.add(d);
          }
          next[fdi] = cur;
        }
        return next;
      });
      setImplantTeeth((prev) => {
        const n = new Set(prev);
        for (const t of teeth) {
          if (t.implant) n.add(String(t.fdi));
        }
        return n;
      });
      setFindingsByTooth((prev) => {
        const next = { ...prev };
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const list = [...(next[fdi] || [])];
          for (const f of t.findings || []) {
            const z = f.zoneId;
            const zoneId =
              z === "whole" || ALL_ZONES.includes(z) ? z : "occlusal";
            const type = VALID_SURFACE_FINDING.has(f.type) ? f.type : "Staining";
            const notes = (f.notes || "").trim();
            list.push({
              id: `finding-${++findingIdCounter}`,
              zoneId,
              type,
              notes: notes || "From AI scan"
            });
          }
          next[fdi] = list;
        }
        return next;
      });
      setTreatmentHistoryDetailsByTooth((prev) => {
        let next = prev;
        let changed = false;
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const rows =
            t.treatmentHistoryRows && t.treatmentHistoryRows.length > 0
              ? t.treatmentHistoryRows
              : (t.treatmentHistory || []).map((line) => ({ name: line }));
          if (!rows.length) continue;
          if (!changed) {
            next = { ...prev };
            changed = true;
          }
          const cur = next[fdi] || {};
          const acc = { ...cur };
          for (const row of rows) {
            const baseName =
              (row.name && String(row.name).trim()) || "Treatment";
            const key = allocateTreatmentHistoryDetailKey(acc, baseName);
            const zones = zonesFromAgentHistorySurface(row.surface, baseName);
            const prevD = acc[key];
            const noteMerge = [prevD?.note, row.notes]
              .filter(Boolean)
              .join(", ")
              .trim();
            acc[key] = {
              ...prevD,
              surfaces: zones.length
                ? zones
                : [...getDefaultTreatmentSurfaces(baseName)],
              since:
                (row.since && String(row.since).trim()) || prevD?.since || "",
              note: noteMerge || prevD?.note || ""
            };
          }
          next[fdi] = acc;
        }
        return changed ? next : prev;
      });
      setAllEntries((prev) => {
        const add = [];
        for (const t of teeth) {
          const fdi = String(t.fdi);
          for (const p of t.procedures || []) {
            const name = (p.name && String(p.name).trim()) || "";
            if (!name) continue;
            const noteBits = [
              p.surface && p.surface !== "—" ? p.surface : null,
              p.date,
              p.status,
              p.notes
            ].filter(Boolean);
            add.push({
              id: `agent-proc-${fdi}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              toothFdi: fdi,
              kind: "procedure",
              name,
              surfaces: [...getDefaultTreatmentSurfaces(name)],
              notes: noteBits.length ? noteBits.join(" · ") : undefined
            });
          }
        }
        return add.length ? [...prev, ...add] : prev;
      });
      setToothNotes((prev) => {
        let next = prev;
        let changed = false;
        for (const t of teeth) {
          const note = t.scannerNotes?.trim();
          if (!note) continue;
          const fdi = String(t.fdi);
          const existing = (next[fdi] || "").trim();
          const merged = existing ? `${existing}\n${note}` : note;
          if (!changed) {
            next = { ...prev };
            changed = true;
          }
          next[fdi] = merged;
        }
        return changed ? next : prev;
      });
      const goFullDentition = openFullDentition !== false;
      if (goFullDentition) {
        const source = getTeethForPatientType(effectivePatientType);
        const allFdis = source.map((t) => t.fdi);
        if (allFdis.length > 0) {
          const representative =
            source.find((t) => t.fdi === allFdis[0]) ?? source[0];
          setSelectedTooth(representative);
          setSelectionScope({
            type: "full-mouth",
            id: "FULL",
            label: "Full mouth",
            fdis: allFdis
          });
          setSelectedZone(null);
          setViewMode("dentition");
        }
        const pulseList =
          highlightFdis && highlightFdis.length > 0
            ? highlightFdis
            : teeth.map((t) => String(t.fdi));
        const pulseSet = new Set(pulseList.map((fdi) => String(fdi)));
        setAgentApplyPulseFdis(pulseSet);
        if (agentPulseClearTimerRef.current)
          window.clearTimeout(agentPulseClearTimerRef.current);
        agentPulseClearTimerRef.current = window.setTimeout(() => {
          setAgentApplyPulseFdis(new Set());
          agentPulseClearTimerRef.current = null;
        }, 1300);
      } else if (focusFdi) {
        const source = getTeethForPatientType(effectivePatientType);
        const tooth = source.find((x) => x.fdi === String(focusFdi));
        if (tooth) handleSelectTooth(tooth);
        const pulseList =
          highlightFdis && highlightFdis.length > 0
            ? highlightFdis
            : [String(focusFdi)];
        const pulseSet = new Set(pulseList.map((fdi) => String(fdi)));
        setAgentApplyPulseFdis(pulseSet);
        if (agentPulseClearTimerRef.current)
          window.clearTimeout(agentPulseClearTimerRef.current);
        agentPulseClearTimerRef.current = window.setTimeout(() => {
          setAgentApplyPulseFdis(new Set());
          agentPulseClearTimerRef.current = null;
        }, 1300);
      }
    };
    window.addEventListener(DENTAL_AI_SCAN_APPLY_EVENT, handler);
    return () => {
      window.removeEventListener(DENTAL_AI_SCAN_APPLY_EVENT, handler);
      if (agentPulseClearTimerRef.current)
        window.clearTimeout(agentPulseClearTimerRef.current);
    };
  }, [patientId, patientType, handleSelectTooth, VALID_TOOTH_DIAG, VALID_SURFACE_FINDING]);

  // ── Stable return shape ────────────────────────────────────────────────────
  return {
    // State
    patientType,
    activeTeeth,
    viewMode,
    selectedTooth,
    selectionScope,
    selectedZone,
    findingsByTooth,
    zoneHitPoints,
    zoneNotes,
    implantTeeth,
    toothDiagnoses,
    toothNotes,
    allEntries,
    oralEntries,
    oralNotes,
    oralHighlightFdis,
    treatmentHistoryDetailsByTooth,
    highlightZones,
    multiSelectZones,
    multiSelectActive,
    hoveredToothFdi,
    dentitionVerticalNudge,
    dentitionCameraOverride,
    hideExamineHint,
    agentApplyPulseFdis,
    controlsRef,
    // Derived
    currentToothDiagnoses,
    isImplant,
    currentToothNotes,
    currentTreatmentHistoryDetails,
    findings,
    currentToothEntries,
    // Actions
    getScopeFdis,
    handleDentitionVerticalNudgeChange,
    handleDentitionControlsEnd,
    toggleImplant,
    toggleToothDiagnosis,
    updateToothNotes,
    handleSelectTooth,
    handleBackToDentition,
    handleSelectScope,
    handleToothScopeJump,
    handlePatientTypeChange,
    handleSelectZone,
    handleToggleZoneMultiSelect,
    handleToggleZoneFromQuickSelector,
    handleClearMultiSelect,
    handleClearSelectedZone,
    handleSetMultiSelectZones,
    handleSetMultiSelectActive,
    handleSetHoveredTooth,
    handleAddFinding,
    handleRemoveFinding,
    handleUpdateNotes,
    handleAddEntry,
    handleUpdateEntry,
    handleRemoveEntry,
    addOralEntry,
    removeOralEntry,
    updateOralEntry,
    updateOralNotes,
    enterOralExam,
    setOralHighlight,
    handleUpdateTreatmentHistoryDetail,
    handleRemoveTreatmentHistoryDetail,
    handleClearTreatmentHistoryDetails,
    handleSetHighlightZones,
    setHoveredToothFdi
  };
}
