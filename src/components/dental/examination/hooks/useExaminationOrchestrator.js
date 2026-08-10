import { useEffect, useMemo, useRef } from "react";
import { syncOralCanvasState } from "../../../../redux/oralExaminationSlice";
import { setSessionPendingServices, clearSessionPendingServices } from "../../../../redux/dentalPlanSlice";
import {
  buildSessionPendingPlanServices,
  buildSessionPendingPlanServicesFromOral,
} from "../../plan/exam-suggestions";
import { normalizeOralSurfaceIds } from "../types";

/**
 * Orchestrates derived state and side-effects for ExaminationTab:
 *   - initialCanvasData: transforms Redux dental + oral state into the canvas
 *     initialisation structure that DentalCanvas expects.
 *   - Syncs live canvas state back into Redux on every canvasState change.
 */
export function useExaminationOrchestrator({
  loading,
  oralLoading,
  toothState,
  oralFindings,
  oralProcedures,
  oralTreatmentHistory,
  oralOverallNotes,
  dentitionType,
  canvasState,
  syncState,
  dispatch,
  baselineToothState,
  baselineOralEntries,
  procedureItems,
  oralProcedureItems,
  appointmentId,
}) {
  const pendingSnapshotRef = useRef("");
  // Transform Redux state back to the structure DentalCanvas expects for initialization.
  // Only blocks on dental loading; oral entries are included once oral loading completes.
  const initialCanvasData = useMemo(() => {
    if (loading) return null;

    const hasDentalData = toothState && Object.keys(toothState).length > 0;
    const hasOralData =
      !oralLoading &&
      (oralFindings.length > 0 ||
        oralProcedures.length > 0 ||
        oralTreatmentHistory.length > 0 ||
        !!oralOverallNotes);

    // dentitionType is null only when the API returned no saved record (new patient).
    // If the API provided a dentition_type (even with no tooth entries), dentitionType is non-null
    // and we must surface initialCanvasData so the canvas opens with the saved type.
    if (!hasDentalData && !hasOralData && dentitionType == null) return null;

    const out = {
      toothDiagnoses: {},
      implantTeeth: [],
      findingsByTooth: {},
      toothNotes: {},
      treatmentHistoryDetailsByTooth: {},
      allEntries: [],
      // null → undefined so useDentalCanvasState falls back to age-based when not set by API
      dentitionType: dentitionType ?? undefined,
      // Oral entries are only populated once oral loading is complete; empty array during oral loading
      // prevents the API hydration guard from consuming the "first non-null initialData" slot with
      // empty oral data, leaving no chance for the real oral data to hydrate later.
      oralEntries: oralLoading ? [] : [
        ...oralTreatmentHistory.map((h) => ({
          id: h.id,
          kind: "past",
          name: h.name,
          surfaces: normalizeOralSurfaceIds(h.area || []),
          since: h.since_date || "",
          note: h.notes || "",
        })),
        ...oralFindings.map((f) => ({
          id: f.id,
          kind: "finding",
          name: f.name,
          surfaces: normalizeOralSurfaceIds(f.area || []),
          since: f.since_date || "",
          note: f.notes || "",
        })),
        ...oralProcedures.map((p) => ({
          id: p.id,
          kind: "procedure",
          name: p.name,
          surfaces: normalizeOralSurfaceIds(p.area || []),
          since: p.procedure_date || "",
          status: p.status,
          note: p.notes || "",
        })),
      ],
      oralNotes: oralLoading ? "" : (oralOverallNotes || ""),
    };

    if (hasDentalData) {
      Object.entries(toothState).forEach(([fdi, data]) => {
        if (data.diagnoses) out.toothDiagnoses[fdi] = data.diagnoses;
        if (data.isImplant) out.implantTeeth.push(fdi);
        if (data.findings) out.findingsByTooth[fdi] = data.findings;
        if (data.notes) out.toothNotes[fdi] = data.notes;
        if (data.treatmentHistory) out.treatmentHistoryDetailsByTooth[fdi] = data.treatmentHistory;

        // Findings → allEntries (kind="finding") so the Findings accordion list is populated
        (data.findings || []).forEach((f, i) => {
          out.allEntries.push({
            id: f.id || `seed-${fdi}-${i}`,  // must match findingsByTooth id generation in useDentalCanvasState
            toothFdi: fdi,
            kind: "finding",
            name: f.type,
            surfaces: [f.zoneId || "whole"],
            notes: f.notes || "",
            since: f.since_date || "",
          });
        });

        // Procedures → allEntries (kind="planned") so the Procedures accordion list is populated
        (data.procedures || []).forEach((p, i) => {
          out.allEntries.push({
            id: p.id || `proc-${fdi}-${i}`,  // unique namespace prevents null-id collision with findings
            toothFdi: fdi,
            kind: "planned",
            name: p.name,
            surfaces: p.surface_codes || ["whole"],
            status: p.status || "PLANNED",
            notes: p.notes || "",
            plannedDate: p.procedure_date || "",
            visitProcedure: p.visitProcedure,
          });
        });
      });
    }

    return out;
  }, [loading, oralLoading, toothState, oralFindings, oralProcedures, oralTreatmentHistory, oralOverallNotes, dentitionType]);

  // Sync canvas state to Redux for global "End Visit" access
  useEffect(() => {
    if (!canvasState) {
      if (pendingSnapshotRef.current !== "[]") {
        pendingSnapshotRef.current = "[]";
        dispatch(clearSessionPendingServices());
      }
      return;
    }

    const newToothState = {};

    // 1. Findings
    if (canvasState.findingsByTooth) {
      Object.entries(canvasState.findingsByTooth).forEach(([fdi, findings]) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].findings = findings;
      });
    }

    // 2. Diagnoses (Set -> Array for Redux)
    if (canvasState.toothDiagnoses) {
      Object.entries(canvasState.toothDiagnoses).forEach(([fdi, diags]) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].diagnoses = Array.from(diags);
      });
    }

    // 3. Implants
    if (canvasState.implantTeeth) {
      canvasState.implantTeeth.forEach((fdi) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].isImplant = true;
      });
    }

    // 4. Notes
    if (canvasState.toothNotes) {
      Object.entries(canvasState.toothNotes).forEach(([fdi, note]) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].notes = note;
      });
    }

    // 5. Treatment History
    if (canvasState.treatmentHistoryDetailsByTooth) {
      Object.entries(canvasState.treatmentHistoryDetailsByTooth).forEach(([fdi, history]) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].treatmentHistory = history;
      });
    }

    // 6. allEntries: clinical findings + planned procedures from SingleToothPanel EntryTab
    if (canvasState.allEntries?.length) {
      canvasState.allEntries.forEach((entry) => {
        const fdi = entry.toothFdi;
        if (!fdi) return;
        if (!newToothState[fdi]) newToothState[fdi] = {};
        if (entry.kind === "finding") {
          if (!newToothState[fdi].entryFindings) newToothState[fdi].entryFindings = [];
          newToothState[fdi].entryFindings.push(entry);
        } else if (entry.kind === "procedure" || entry.kind === "planned") {
          if (!newToothState[fdi].procedures) newToothState[fdi].procedures = [];
          newToothState[fdi].procedures.push(entry);
        }
      });
    }

    syncState({ toothState: newToothState, dentitionType: canvasState.patientType });

    const dentalPending = buildSessionPendingPlanServices(
      newToothState,
      baselineToothState || {},
      { appointmentId, procedureItems },
    );
    const oralPending = buildSessionPendingPlanServicesFromOral(
      canvasState.oralEntries || [],
      baselineOralEntries || [],
      {
        appointmentId,
        procedureItems: oralProcedureItems?.length ? oralProcedureItems : procedureItems,
      },
    );
    const pendingServices = [...dentalPending, ...oralPending];
    const pendingSnapshot = JSON.stringify(pendingServices);
    if (pendingSnapshot !== pendingSnapshotRef.current) {
      pendingSnapshotRef.current = pendingSnapshot;
      dispatch(setSessionPendingServices(pendingServices));
    }

    dispatch(syncOralCanvasState({
      canvasOralEntries: canvasState.oralEntries || [],
      canvasOralNotes: canvasState.oralNotes || "",
    }));
  }, [
    canvasState,
    syncState,
    dispatch,
    baselineToothState,
    baselineOralEntries,
    procedureItems,
    oralProcedureItems,
    appointmentId,
  ]);

  return { initialCanvasData };
}
