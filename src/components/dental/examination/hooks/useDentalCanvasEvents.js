/**
 * useDentalCanvasEvents — all interaction callbacks (navigation, zone/surface
 * selection, findings, entries, oral, treatment history) plus the AI-scan apply
 * window-event listener. Receives the state bag from useDentalCanvasState and
 * returns the action handlers.
 */
import { useCallback, useEffect, useRef } from "react";
import {
  QUADRANT_LABELS,
  getDefaultTreatmentSurfaces,
  ALL_ZONES,
  isOralRegionPosition
} from "../types";
import { applyDiagnosisSelection } from "../DiagnosisMatrix";
import { DENTAL_AI_SCAN_APPLY_EVENT } from "../../tp-rxpad/dental-ai/dental-ai-events";
import {
  ARCH_SCOPE_IDS,
  SCOPE_SELECTION_LABELS,
  allocateTreatmentHistoryDetailKey,
  zonesFromAgentHistorySurface,
  getTeethForPatientType,
  getDefaultFdiForPatientType
} from "./canvas-interaction-helpers";

// ── Module-level counter so IDs are unique across mounts ─────────────────────
let findingIdCounter = 0;

export function useDentalCanvasEvents(s) {
  const {
    patientId,
    patientType,
    activeTeeth,
    viewMode,
    selectedTooth,
    zoneHitPoints,
    multiSelectActive,
    currentToothDiagnoses,
    controlsRef,
    agentPulseClearTimerRef,
    oralIdRef,
    VALID_TOOTH_DIAG,
    VALID_SURFACE_FINDING,
    setPatientType,
    setViewMode,
    setSelectedTooth,
    setSelectionScope,
    setSelectedZone,
    setHoveredZone,
    setZoneHitPoints,
    setZoneNotes,
    setFindingsByTooth,
    setImplantTeeth,
    setToothDiagnoses,
    setToothNotes,
    setAllEntries,
    setOralEntries,
    setOralNotes,
    setOralHighlightFdis,
    setTreatmentHistoryDetailsByTooth,
    setHighlightZones,
    setMultiSelectZones,
    setMultiSelectActive,
    setHoveredToothFdi,
    setDentitionVerticalNudgeByType,
    setDentitionCameraByType,
    setAgentApplyPulseFdis
  } = s;

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

  return {
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
    handleSetHighlightZones
  };
}
