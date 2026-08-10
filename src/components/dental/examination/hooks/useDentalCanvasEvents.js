/**
 * useDentalCanvasEvents — all interaction callbacks (navigation, zone/surface
 * selection, findings, entries, oral, treatment history) plus the AI-scan apply
 * window-event listener. Receives the state bag from useDentalCanvasState and
 * returns the action handlers.
 */
import { useCallback, useEffect, useRef } from "react";
import { VISUAL_TYPE, getVisualType } from "../../../../utils/dentalVisualTypes";
import {
  DENTAL_MOENGAGE_EVENTS,
  getNoteLengthBucket,
  getPatientAgeGroup,
  getToothAnalyticsMeta,
  markDentalPanelClosed,
  markDentalPanelOpened,
  trackDentalEvent,
  trackOralRecordAdded,
  trackSurfaceSelected,
  trackToothHovered,
  trackToothRecordAdded,
} from "../../../../utils/dentalMoengage";
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
    multiSelectZones,
    currentToothDiagnoses,
    currentToothVisualTypes,
    controlsRef,
    agentPulseClearTimerRef,
    oralIdRef,
    VALID_TOOTH_DIAG,
    VALID_SURFACE_FINDING,
    visualTypeMap,
    allEntries,
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
    oralNotes,
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

  const orbitDragActiveRef = useRef(false);
  const orbitStartPosRef = useRef(null);
  const toothNotesDebounceRef = useRef(null);

  const handleOrbitControlsStart = useCallback(() => {
    if (!controlsRef.current) return;
    orbitDragActiveRef.current = true;
    const p = controlsRef.current.object?.position;
    if (p) orbitStartPosRef.current = [p.x, p.y, p.z];
  }, [controlsRef]);

  const handleDentitionControlsEnd = useCallback(() => {
    if (orbitDragActiveRef.current && orbitStartPosRef.current && controlsRef.current) {
      const p = controlsRef.current.object?.position;
      if (p) {
        const dx = p.x - orbitStartPosRef.current[0];
        const dy = p.y - orbitStartPosRef.current[1];
        const dz = p.z - orbitStartPosRef.current[2];
        if (dx * dx + dy * dy + dz * dz > 0.01) {
          trackDentalEvent(DENTAL_MOENGAGE_EVENTS.CHART_ROTATED, {
            view_mode: viewMode,
            rotation_source: "orbit_controls",
            patient_age_group: getPatientAgeGroup(),
            tooth_count_visible: activeTeeth.length,
          });
        }
      }
    }
    orbitDragActiveRef.current = false;
    orbitStartPosRef.current = null;

    if (viewMode !== "dentition" || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const p = ctrl.object?.position;
    const t = ctrl.target;
    if (!p || !t) return;
    const pose = { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
    setDentitionCameraByType((prev) => ({ ...prev, [patientType]: pose }));
  }, [activeTeeth.length, patientType, viewMode, controlsRef]);

  // ── Diagnosis / implant toggles ────────────────────────────────────────────
  const toggleToothDiagnosisRef = useRef(null);

  const toggleToothDiagnosis = useCallback(
    (diagnosis) => {
      const fdi = selectedTooth.fdi;
      setToothDiagnoses((prev) => {
        const current = new Set(prev[fdi] || []);
        const wasPresent = current.has(diagnosis);
        const next = applyDiagnosisSelection(current, diagnosis);
        const toothMeta = getToothAnalyticsMeta(fdi, selectedTooth);
        if (!wasPresent && next.has(diagnosis)) {
          trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PAST_PROCEDURE_ADDED, {
            ...toothMeta,
            procedure_name: diagnosis,
            entry_source: "manual",
          });
          trackToothRecordAdded({
            recordType: "past_procedure",
            recordName: diagnosis,
            tooth: selectedTooth,
          });
        } else if (wasPresent && !next.has(diagnosis)) {
          trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PAST_PROCEDURE_DELETED, {
            ...toothMeta,
            procedure_name: diagnosis,
            delete_source: "manual",
          });
        }
        if ([...current].some((n) => getVisualType(n, visualTypeMap) === VISUAL_TYPE.IMPLANT) &&
            ![...next].some((n) => getVisualType(n, visualTypeMap) === VISUAL_TYPE.IMPLANT)) {
          setImplantTeeth((ip) => {
            const n = new Set(ip);
            n.delete(fdi);
            return n;
          });
        }
        if (![...current].some((n) => getVisualType(n, visualTypeMap) === VISUAL_TYPE.IMPLANT) &&
            [...next].some((n) => getVisualType(n, visualTypeMap) === VISUAL_TYPE.IMPLANT)) {
          setImplantTeeth((ip) => {
            const n = new Set(ip);
            n.add(fdi);
            return n;
          });
        }
        const removed = [...current].filter(n => !next.has(n));
        if (removed.length > 0) {
          setTreatmentHistoryDetailsByTooth((prevDetails) => {
            const toothMap = { ...(prevDetails[fdi] || {}) };
            removed.forEach(n => { delete toothMap[n]; });
            return { ...prevDetails, [fdi]: toothMap };
          });
        }
        return { ...prev, [fdi]: next };
      });
      if (getVisualType(diagnosis, visualTypeMap) === VISUAL_TYPE.MISSING) {
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

  // Add-only variant: used by template apply to avoid accidental toggle-off
  // when the diagnosis was already active from a prior apply.
  const setToothDiagnosis = useCallback(
    (diagnosis) => {
      const fdi = selectedTooth.fdi;
      setToothDiagnoses((prev) => {
        const current = new Set(prev[fdi] || []);
        if (current.has(diagnosis)) return prev;
        const next = applyDiagnosisSelection(current, diagnosis);
        if (![...current].some((n) => getVisualType(n, visualTypeMap) === VISUAL_TYPE.IMPLANT) &&
            [...next].some((n) => getVisualType(n, visualTypeMap) === VISUAL_TYPE.IMPLANT)) {
          setImplantTeeth((ip) => {
            const n = new Set(ip);
            n.add(fdi);
            return n;
          });
        }
        return { ...prev, [fdi]: next };
      });
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
      if (toothNotesDebounceRef.current) clearTimeout(toothNotesDebounceRef.current);
      toothNotesDebounceRef.current = setTimeout(() => {
        const toothMeta = getToothAnalyticsMeta(selectedTooth.fdi, selectedTooth);
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_NOTE_UPDATED, {
          ...toothMeta,
          has_note: String(notes || "").trim().length > 0,
          note_length_bucket: getNoteLengthBucket(notes),
        });
      }, 800);
    },
    [selectedTooth]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleSelectTooth = useCallback((tooth, meta = {}) => {
    const prevView = viewMode;
    setSelectedTooth(tooth);
    setSelectionScope({
      type: "tooth",
      id: tooth.fdi,
      label: `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name}`,
      fdis: [tooth.fdi]
    });
    setSelectedZone(null);
    setViewMode("single-tooth");
    const toothMeta = getToothAnalyticsMeta(tooth.fdi, tooth);
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_SELECTED, {
      ...toothMeta,
      selection_source: meta.selectionSource || "3d_chart",
      has_existing_tooth_data: Boolean(meta.tooth_entry_count),
      tooth_entry_count: meta.tooth_entry_count ?? 0,
    });
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_VIEW_OPENED, {
      ...toothMeta,
      previous_view: prevView,
      current_view: "single-tooth",
      has_existing_tooth_data: Boolean(meta.tooth_entry_count),
    });
    markDentalPanelOpened(`tooth:${tooth.fdi}`);
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_EXPANDED_OPENED, {
      ...toothMeta,
      tooth_entry_count: meta.tooth_entry_count ?? 0,
    });
  }, [viewMode]);

  const handleBackToDentition = useCallback(() => {
    if (viewMode === "oral") {
      const timeSpent = markDentalPanelClosed("oral");
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_MINIMIZED, {
        time_spent_ms: timeSpent,
      });
    } else if (viewMode === "single-tooth") {
      const timeSpent = markDentalPanelClosed(`tooth:${selectedTooth.fdi}`);
      const toothMeta = getToothAnalyticsMeta(selectedTooth.fdi, selectedTooth);
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_EXPANDED_MINIMIZED, {
        ...toothMeta,
        time_spent_ms: timeSpent,
      });
    }
    setViewMode("dentition");
    setSelectionScope((prevScope) => ({
      type: "tooth",
      id: prevScope.fdis[0] ?? "tooth",
      label: prevScope.label,
      fdis: prevScope.fdis
    }));
    setSelectedZone(null);
    setHoveredZone(null);
    setHighlightZones([]);
    setMultiSelectZones(new Set());
    setMultiSelectActive(false);
  }, [viewMode, selectedTooth]);

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
      if (currentToothVisualTypes.has(VISUAL_TYPE.MISSING))
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
      setSelectedZone((prev) => {
        const next = prev === zone ? null : zone;
        if (prev !== zone && zone) {
          trackSurfaceSelected({
            tooth: selectedTooth,
            surfaceId: zone,
            selectionMode: opts?.multi ? "multi" : "single",
            surfaceCount: 1,
            entryContext: "3d_tooth",
          });
        }
        return next;
      });
    },
    [currentToothVisualTypes, selectedTooth]
  );

  const handleToggleZoneMultiSelect = useCallback(
    (zone) => {
      if (!multiSelectActive) {
        setSelectedZone((prev) => (prev === zone ? null : zone));
        return;
      }
      const isRemoving = zone === "whole"
        ? multiSelectZones.has("whole")
        : multiSelectZones.has(zone);
      setSelectedZone(isRemoving ? null : zone);
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
    [multiSelectActive, multiSelectZones]
  );

  const handleToggleZoneFromQuickSelector = useCallback(
    (zone) => {
      if (!multiSelectActive) {
        setMultiSelectZones((prev) => (prev.size === 0 ? prev : new Set()));
        setSelectedZone((prev) => (prev === zone ? null : zone));
        return;
      }
      // Determine add vs remove before updating state so selectedZone clears
      // immediately when a zone is deselected (fixes 3D model residual highlight).
      const isRemoving = zone === "whole"
        ? multiSelectZones.has("whole")
        : multiSelectZones.has(zone);
      setSelectedZone(isRemoving ? null : zone);
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
    [multiSelectActive, multiSelectZones]
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
    if (fdi) trackToothHovered(fdi);
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
      const toothMeta = getToothAnalyticsMeta(fdi, selectedTooth);
      const id = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const surfaces = partial.surfaces?.length ? partial.surfaces : ["whole"];
      const updatedPartial = { ...partial, surfaces };
      setAllEntries((prev) => [...prev, { ...updatedPartial, id, toothFdi: fdi }]);
      if (updatedPartial.kind === "finding") {
        setFindingsByTooth((fp) => {
          const list = [...(fp[fdi] || [])];
          for (const surface of surfaces) {
            list.push({ id, zoneId: surface, type: updatedPartial.name, notes: updatedPartial.notes || "" });
          }
          return { ...fp, [fdi]: list };
        });
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_FINDING_ADDED, {
          ...toothMeta,
          finding_name: updatedPartial.name,
          surface_count: surfaces.length,
          surfaces,
          incidence_unit: updatedPartial.since || "",
          entry_source: "manual",
        });
        trackToothRecordAdded({
          recordType: "finding",
          recordName: updatedPartial.name,
          tooth: selectedTooth,
          extra: { surface_count: surfaces.length },
        });
      } else if (updatedPartial.kind === "planned") {
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PROCEDURE_ADDED, {
          ...toothMeta,
          procedure_name: updatedPartial.name,
          surface_count: surfaces.length,
          surfaces,
          procedure_status: updatedPartial.status || "PLANNED",
          entry_source: "manual",
        });
        trackToothRecordAdded({
          recordType: "procedure",
          recordName: updatedPartial.name,
          tooth: selectedTooth,
          extra: {
            surface_count: surfaces.length,
            procedure_status: updatedPartial.status || "PLANNED",
          },
        });
      }
    },
    [selectedTooth, setFindingsByTooth]
  );

  const handleUpdateEntry = useCallback((id, patch) => {
    const existing = allEntries.find((e) => e.id === id);
    if (existing) {
      const toothMeta = getToothAnalyticsMeta(existing.toothFdi, selectedTooth);
      const fieldChanged = Object.keys(patch).join(",");
      if (existing.kind === "finding") {
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_FINDING_UPDATED, {
          ...toothMeta,
          finding_name: existing.name,
          field_changed: fieldChanged,
          surface_count: (patch.surfaces || existing.surfaces || []).length,
          incidence_unit: patch.since ?? existing.since ?? "",
        });
      } else if (existing.kind === "planned") {
        if (patch.status && patch.status !== existing.status) {
          trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PROCEDURE_STATUS_CHANGED, {
            ...toothMeta,
            procedure_name: existing.name,
            old_status: existing.status || "PLANNED",
            new_status: patch.status,
            surface_count: (existing.surfaces || []).length,
          });
        }
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PROCEDURE_UPDATED, {
          ...toothMeta,
          procedure_name: existing.name,
          field_changed: fieldChanged,
          surface_count: (patch.surfaces || existing.surfaces || []).length,
          procedure_status: patch.status ?? existing.status ?? "PLANNED",
        });
      }
    }
    setAllEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    if (patch.surfaces !== undefined) {
      const entry = allEntries.find((e) => e.id === id);
      if (entry?.kind === "finding" && entry.toothFdi) {
        const fdi = entry.toothFdi;
        const newSurfaces = patch.surfaces;
        setFindingsByTooth((fp) => {
          const list = (fp[fdi] || []).filter((f) => f.id !== id);
          for (const surface of newSurfaces) {
            list.push({ id, zoneId: surface, type: entry.name, notes: entry.notes || "" });
          }
          return { ...fp, [fdi]: list };
        });
      }
    }
  }, [allEntries, selectedTooth, setFindingsByTooth]);

  const handleRemoveEntry = useCallback((id) => {
    const entry = allEntries.find((e) => e.id === id);
    if (entry) {
      const toothMeta = getToothAnalyticsMeta(entry.toothFdi, selectedTooth);
      if (entry.kind === "finding") {
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_FINDING_DELETED, {
          ...toothMeta,
          finding_name: entry.name,
          surface_count: (entry.surfaces || []).length,
          delete_source: "manual",
        });
      } else if (entry.kind === "planned") {
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PROCEDURE_DELETED, {
          ...toothMeta,
          procedure_name: entry.name,
          procedure_status: entry.status || "PLANNED",
          surface_count: (entry.surfaces || []).length,
          delete_source: "manual",
        });
      }
    }
    setAllEntries((prev) => prev.filter((e) => e.id !== id));
    if (entry?.kind === "finding" && entry.toothFdi) {
      setFindingsByTooth((fp) => {
        const fdi = entry.toothFdi;
        if (!fp[fdi]) return fp;
        const filtered = fp[fdi].filter((f) => f.id !== id);
        if (filtered.length === fp[fdi].length) return fp;
        return { ...fp, [fdi]: filtered };
      });
    }
  }, [allEntries, setFindingsByTooth]);

  const updateOralNotes = useCallback((v) => {
    setOralNotes(v ?? "");
    if (toothNotesDebounceRef.current) clearTimeout(toothNotesDebounceRef.current);
    toothNotesDebounceRef.current = setTimeout(() => {
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_NOTE_UPDATED, {
        has_note: String(v || "").trim().length > 0,
        note_length_bucket: getNoteLengthBucket(v),
      });
    }, 800);
  }, []);

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

  const addOralEntry = useCallback((kind, name, extra) => {
    if (!name) return;
    setOralEntries((prev) => {
      const id = `oral-${Date.now().toString(36)}-${++oralIdRef.current}`;
      const surfaces = extra?.surfaces?.length ? extra.surfaces : ["WHOLE"];
      const oralBase = {
        procedure_name: name,
        finding_name: name,
        location_group: surfaces[0] || "",
        region_ids: surfaces,
        region_count: surfaces.length,
        oral_site_ids: surfaces,
        incidence_value: extra?.since || "",
        incidence_unit: extra?.since || "",
        is_custom_entry: false,
      };
      if (kind === "past") {
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_PAST_PROCEDURE_ADDED, oralBase);
        trackOralRecordAdded({ recordType: "past_procedure", recordName: name, extra: { region_count: surfaces.length } });
      } else if (kind === "finding") {
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_FINDING_ADDED, oralBase);
        trackOralRecordAdded({ recordType: "finding", recordName: name, extra: { region_count: surfaces.length } });
      } else if (kind === "procedure") {
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_PROCEDURE_ADDED, {
          ...oralBase,
          procedure_status: extra?.status || "PLANNED",
        });
        trackOralRecordAdded({ recordType: "procedure", recordName: name, extra: { region_count: surfaces.length } });
      }
      return [...prev, {
        id, kind, name,
        surfaces,
        since: extra?.since ?? "",
        note: extra?.note ?? "",
        ...(extra?.status ? { status: extra.status } : {}),
        ...(extra?.visitProcedure ? { visitProcedure: extra.visitProcedure } : {}),
      }];
    });
  }, []);

  const removeOralEntry = useCallback((id) => {
    setOralEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateOralEntry = useCallback((id, patch) => {
    setOralEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
    if (patch.surfaces !== undefined) {
      setOralHighlight(patch.surfaces);
    }
  }, [setOralHighlight]);

  const enterOralExam = useCallback((meta = {}) => {
    setSelectionScope({
      type: "full-mouth",
      id: "FULL",
      label: "Full mouth",
      fdis: getScopeFdis("FULL")
    });
    setSelectedZone(null);
    setOralHighlightFdis(new Set());
    setViewMode("oral");
    markDentalPanelOpened("oral");
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_EXAM_OPENED, {
      entry_source: meta.entrySource || "canvas_cta",
      has_oral_notes: String(oralNotes || "").trim().length > 0,
    });
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_EXPANDED_OPENED, {
      has_oral_notes: String(oralNotes || "").trim().length > 0,
    });
  }, [getScopeFdis, oralNotes]);

  // ── Treatment history details ──────────────────────────────────────────────
  const handleUpdateTreatmentHistoryDetail = useCallback(
    (name, patch) => {
      const fdi = selectedTooth.fdi;
      const toothMeta = getToothAnalyticsMeta(fdi, selectedTooth);
      setTreatmentHistoryDetailsByTooth((prev) => {
        const currentToothDetails = prev[fdi] || {};
        const previous = currentToothDetails[name];
        const isNew = !previous;
        const merged = {
          surfaces: getDefaultTreatmentSurfaces(name),
          ...previous,
          ...patch,
        };
        if (isNew) {
          trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PAST_PROCEDURE_ADDED, {
            ...toothMeta,
            procedure_name: name,
            surface_count: (merged.surfaces || []).length,
            surfaces: merged.surfaces || [],
            incidence_unit: merged.since || "",
            entry_source: "manual",
          });
          trackToothRecordAdded({
            recordType: "past_procedure",
            recordName: name,
            tooth: selectedTooth,
            extra: { surface_count: (merged.surfaces || []).length },
          });
        } else {
          trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PAST_PROCEDURE_UPDATED, {
            ...toothMeta,
            procedure_name: name,
            field_changed: Object.keys(patch).join(","),
            surface_count: (merged.surfaces || []).length,
            incidence_unit: merged.since || "",
          });
        }
        return {
          ...prev,
          [fdi]: { ...currentToothDetails, [name]: merged },
        };
      });
    },
    [selectedTooth]
  );

  const handleRemoveTreatmentHistoryDetail = useCallback(
    (name) => {
      const fdi = selectedTooth.fdi;
      const toothMeta = getToothAnalyticsMeta(fdi, selectedTooth);
      setTreatmentHistoryDetailsByTooth((prev) => {
        const toothMap = prev[fdi];
        if (!toothMap || !toothMap[name]) return prev;
        trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_PAST_PROCEDURE_DELETED, {
          ...toothMeta,
          procedure_name: name,
          surface_count: (toothMap[name]?.surfaces || []).length,
          delete_source: "manual",
        });
        const { [name]: _removed, ...rest } = toothMap;
        return { ...prev, [fdi]: rest };
      });
    },
    [selectedTooth]
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
    handleOrbitControlsStart,
    toggleImplant,
    toggleToothDiagnosis,
    setToothDiagnosis,
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
