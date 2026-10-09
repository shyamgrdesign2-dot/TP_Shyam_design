/**
 * useDentalCanvasPersistence — hydration + persistence effects for the dental
 * canvas: API initialData hydration, localStorage hydrate/write, and the
 * exam-chart broadcast. Receives the state bag from useDentalCanvasState.
 */
import { VISUAL_TYPE, getVisualType } from "../../../../utils/dentalVisualTypes";
import { useEffect } from "react";
import { QUADRANT_LABELS } from "../types";
import { EXAM_CHART_STORAGE_PREFIX } from "../../plan/exam-suggestions";
import {
  dateToSinceLabel,
  getTeethForPatientType,
  getDefaultFdiForPatientType
} from "./canvas-interaction-helpers";

export function useDentalCanvasPersistence(s) {
  const {
    initialData,
    patientId,
    patientType,
    viewMode,
    selectedTooth,
    selectionScope,
    dentitionVerticalNudgeByType,
    dentitionCameraByType,
    oralEntries,
    oralNotes,
    allEntries,
    toothDiagnoses,
    findingsByTooth,
    hideExamineHint,
    hydratedApiPatientIdRef,
    hydratedOralApiPatientIdRef,
    hydratedStoragePatientIdRef,
    setTreatmentHistoryDetailsByTooth,
    setFindingsByTooth,
    setToothNotes,
    setToothDiagnoses,
    setImplantTeeth,
    setOralEntries,
    setOralNotes,
    setPatientType,
    setSelectedTooth,
    setSelectionScope,
    setDentitionVerticalNudgeByType,
    setDentitionCameraByType,
    setHideExamineHint,
    visualTypeMap,
  } = s;

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
              ...(h.visitProcedure ? { visitProcedure: h.visitProcedure } : {}),
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
          if (arr.some((n) => getVisualType(n, visualTypeMap) === VISUAL_TYPE.IMPLANT)) next.add(fdi);
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
      // patientType is NOT restored from localStorage.
      // useDentalCanvasState already initialises it from API dentitionType (highest priority)
      // or from the patient's age (fallback for new patients). localStorage is too stale
      // to be a reliable source and causes wrong dentition type for patients with no API data.
      const source = getTeethForPatientType(patientType);
      const candidateFdi = saved.selectedToothFdi;
      const fallbackFdi = getDefaultFdiForPatientType(patientType);
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
    // oralEntries/oralNotes excluded — oral data is API-only; caching causes cross-patient leakage
    const payload = {
      patientType,
      viewMode,
      selectedToothFdi: selectedTooth.fdi,
      selectionScope,
      dentitionVerticalNudgeByType,
      dentitionCameraByType,
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
          patientType,
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
  }, [patientId, allEntries, toothDiagnoses, findingsByTooth, oralEntries, oralNotes, patientType]);

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
}
