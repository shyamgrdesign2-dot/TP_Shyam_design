import { useMemo } from "react";

/**
 * Orchestrates derived state for ExaminationTab:
 *   - initialCanvasData: transforms Redux dental + oral state into the canvas
 *     initialisation structure that DentalCanvas expects.
 */
export function useExaminationOrchestrator({
  loading,
  oralLoading,
  toothState,
  oralFindings,
  oralProcedures,
  oralTreatmentHistory,
  oralOverallNotes,
}) {
  // Transform Redux state back to the structure DentalCanvas expects for initialization.
  // Only blocks on dental loading; oral entries are included once oral loading completes.
  const initialCanvasData = useMemo(() => {
    // Only block on dental loading — oral data arrives independently and is added once ready.
    if (loading) return null;

    const hasDentalData = toothState && Object.keys(toothState).length > 0;
    const hasOralData =
      !oralLoading &&
      (oralFindings.length > 0 ||
        oralProcedures.length > 0 ||
        oralTreatmentHistory.length > 0 ||
        !!oralOverallNotes);

    if (!hasDentalData && !hasOralData) return null;

    const out = {
      toothDiagnoses: {},
      implantTeeth: [],
      findingsByTooth: {},
      toothNotes: {},
      treatmentHistoryDetailsByTooth: {},
      allEntries: [],
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
  }, [loading, oralLoading, toothState, oralFindings, oralProcedures, oralTreatmentHistory, oralOverallNotes]);

  return { initialCanvasData };
}
