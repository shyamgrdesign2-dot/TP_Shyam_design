import { useEffect, useMemo } from "react";
import { syncOralCanvasState } from "../../../../redux/oralExaminationSlice";

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
}) {
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
          surfaces: h.area || [],
          since: h.since_date || "",
          note: h.notes || "",
        })),
        ...oralFindings.map((f) => ({
          id: f.id,
          kind: "finding",
          name: f.name,
          surfaces: f.area || [],
          since: f.since_date || "",
          note: f.notes || "",
        })),
        ...oralProcedures.map((p) => ({
          id: p.id,
          kind: "procedure",
          name: p.name,
          surfaces: p.area || [],
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
        (data.findings || []).forEach((f) => {
          out.allEntries.push({
            id: f.id,
            toothFdi: fdi,
            kind: "finding",
            name: f.type,
            surfaces: [f.zoneId || "whole"],
            notes: f.notes || "",
            since: f.since_date || "",
          });
        });

        // Procedures → allEntries (kind="planned") so the Procedures accordion list is populated
        (data.procedures || []).forEach((p) => {
          out.allEntries.push({
            id: p.id,
            toothFdi: fdi,
            kind: "planned",
            name: p.name,
            surfaces: p.surface_codes || ["whole"],
            status: p.status || "planned",
            notes: p.notes || "",
            plannedDate: p.procedure_date || "",
          });
        });
      });
    }

    return out;
  }, [loading, oralLoading, toothState, oralFindings, oralProcedures, oralTreatmentHistory, oralOverallNotes, dentitionType]);

  // Sync canvas state to Redux for global "End Visit" access
  useEffect(() => {
    if (!canvasState) return;

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

    dispatch(syncOralCanvasState({
      canvasOralEntries: canvasState.oralEntries || [],
      canvasOralNotes: canvasState.oralNotes || "",
    }));
  }, [canvasState, syncState, dispatch]);

  return { initialCanvasData };
}
