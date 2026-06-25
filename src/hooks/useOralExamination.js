import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchOralExamination,
  saveOralExaminationThunk,
  patchOralExaminationThunk,
  clearOralExamination,
} from "../redux/oralExaminationSlice";

export function useOralExamination(patientId) {
  const dispatch = useDispatch();
  const {
    findings,
    procedures,
    treatmentHistory,
    overallNotes,
    version,
    loading,
    saving,
    error,
    lastSaved,
  } = useSelector((state) => state.oralExamination);

  useEffect(() => {
    if (patientId) {
      dispatch(fetchOralExamination(patientId));
    }
  }, [patientId, dispatch]);

  // Map canvas oralEntries + oralNotes → API payload and dispatch save/patch
  const saveOralExam = useCallback(
    async ({ canvasOralEntries, canvasOralNotes }) => {
      if (!patientId) return;

      const entries = Array.isArray(canvasOralEntries) ? canvasOralEntries : [];
      const data = {
        findings: entries
          .filter((e) => e.kind === "finding")
          .map((e) => ({
            id: e.id,
            name: e.name,
            area: e.surfaces || [],
            since_date: e.since || undefined,
            notes: e.note || "",
          })),
        procedures: entries
          .filter((e) => e.kind === "procedure")
          .map((e) => ({
            id: e.id,
            name: e.name,
            area: e.surfaces || [],
            procedure_date: e.since || undefined,
            status: e.status || "PLANNED",
            notes: e.note || "",
          })),
        treatment_history: entries
          .filter((e) => e.kind === "past")
          .map((e) => ({
            id: e.id,
            name: e.name,
            area: e.surfaces || [],
            since_date: e.since || undefined,
            notes: e.note || "",
          })),
        overall_notes: canvasOralNotes || "",
      };

      if (version === 0) {
        return dispatch(saveOralExaminationThunk({ patientId, data }));
      }
      return dispatch(
        patchOralExaminationThunk({
          patientId,
          data: {
            version,
            operations: [
              { type: "UPSERT_ORAL_FINDINGS", findings: data.findings },
              { type: "UPSERT_ORAL_PROCEDURES", procedures: data.procedures },
              { type: "UPSERT_ORAL_TREATMENT_HISTORY", treatment_history: data.treatment_history },
              { type: "UPSERT_ORAL_NOTES", overall_notes: data.overall_notes },
            ],
          },
        })
      );
    },
    [patientId, version, dispatch]
  );

  const clearExamination = useCallback(() => {
    dispatch(clearOralExamination());
  }, [dispatch]);

  return {
    findings,
    procedures,
    treatmentHistory,
    overallNotes,
    version,
    loading,
    saving,
    error,
    lastSaved,
    saveOralExam,
    clearExamination,
  };
}
