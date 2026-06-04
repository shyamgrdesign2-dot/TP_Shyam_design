/**
 * ExaminationTab — side-by-side layout:
 *   Left: 3D dental canvas (SSR-safe dynamic import)
 *   Right: Context-aware panel —
 *     • Dentition view → Dental Score card + per-tooth examination summary
 *     • Single-tooth view → Tooth header (with Back arrow) + primary diagnosis
 *       section + surface examination section + general chip sections + Save footer
 *
 * Typography: 14px / 12px baseline; 10px only for tiny meta.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { DentalCanvas } from "./DentalCanvas";
import { saveDentalPreviewSnapshot } from "../tp-rxpad/rx-preview-store";
import { useDentalExamination } from "../lib/useDentalExamination";
import { useOralExamination } from "../../../hooks/useOralExamination";
import { syncOralCanvasState } from "../../../redux/oralExaminationSlice";
import { useDispatch } from "react-redux";
import ex from "./ExaminationTab.module.scss";
import { useExaminationLayout } from "./useExaminationLayout";
import { toDentalPreviewSections } from "../lib/useDentalScore";
import { OralExamPanel, OralRecordsList } from "./ExaminationOralPanel";
import { DentitionPanel } from "./ExaminationDentitionPanel";
import { SingleToothPanel } from "./ExaminationFindingsPanel";

export function ExaminationTab({ patientId, patientAge = 30 }) {
  const dispatch = useDispatch();
  const { syncState, toothState, version, loading, saveChart } = useDentalExamination(patientId);
  const {
    findings: oralFindings,
    procedures: oralProcedures,
    treatmentHistory: oralTreatmentHistory,
    overallNotes: oralOverallNotes,
    loading: oralLoading,
    saving: oralSaving,
    saveOralExam,
  } = useOralExamination(patientId);
  const [canvasState, setCanvasState] = useState(null);

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

  const handleSaveOralExam = useCallback(async () => {
    if (!canvasState) return;
    await saveOralExam({
      canvasOralEntries: canvasState.oralEntries,
      canvasOralNotes: canvasState.oralNotes,
    });
  }, [canvasState, saveOralExam]);

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

  const isSingle = canvasState?.viewMode === "single-tooth";
  const isOral = canvasState?.viewMode === "oral";
  const { containerRef, asidePct, canvasPct, dragging, setDragging } =
    useExaminationLayout({ isSingle, isOral });
  // version is set by fetchDentalExamination.fulfilled and reset to 0 on .pending.
  // It is NOT overwritten by syncWholeState (which only touches toothState), so it
  // reliably reflects whether the GET API returned saved examination data for this patient.
  const hasApiExaminationData = version > 0;
  const isGetStarted =
    !isSingle &&
    !isOral &&
    !!canvasState &&
    !hasApiExaminationData &&
    Object.values(canvasState.toothDiagnoses).every((s) => s.size === 0) &&
    canvasState.implantTeeth.size === 0 &&
    Object.values(canvasState.findingsByTooth).every((a) => a.length === 0) &&
    canvasState.allEntries.length === 0 &&
    !Object.values(canvasState.treatmentHistoryDetailsByTooth ?? {}).some(
      (d) => d && Object.keys(d).length > 0
    ) &&
    !Object.values(canvasState.toothNotes ?? {}).some(
      (n) => String(n ?? "").trim().length > 0
    );
  useEffect(() => {
    if (!canvasState) return;
    saveDentalPreviewSnapshot(patientId, {
      patientId,
      updatedAt: new Date().toISOString(),
      sections: toDentalPreviewSections(canvasState)
    });
  }, [canvasState, patientId]);
  const hideGetStarted = false;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
        Loading Dental Examination...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${ex.root} ${isGetStarted && !hideGetStarted ? ex.rootGap : ""
        }`}>

      <div
        className={ex.canvasShell}
        style={{
          width:
            isGetStarted && !hideGetStarted ?
              undefined :
              hideGetStarted ?
                "100%" :
                `${canvasPct}%`,
          minWidth: "320px",
          flex: isGetStarted ? "1" : "1 1 auto",
          transition: dragging ?
            "none" :
            "width 350ms ease-out, flex-basis 350ms ease-out"
        }}>

        <div
          className={ex.gridOverlay}
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,23,42,0.025) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(15,23,42,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px"
          }} />


        <div
          className={ex.dotOverlay}
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(15,23,42,0.04) 0.6px, transparent 0.9px)",
            backgroundSize: "16px 16px"
          }} />


        <div
          className={ex.radialOverlay}
          style={{
            background:
              "radial-gradient(ellipse 55% 42% at 50% 38%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 55%, transparent 78%)"
          }} />


        <div className={ex.canvasInner}>
          <DentalCanvas
            patientId={patientId}
            patientAge={patientAge}
            initialData={initialCanvasData}
            onStateChange={setCanvasState} />

        </div>
      </div>
      {!isGetStarted && !hideGetStarted &&
        <button
          type="button"
          role="separator"
          aria-label="Resize panel"
          aria-orientation="vertical"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
          }}
          className={ex.resizeHandle}>

          <span className={ex.resizeHit} />
          <img
            src={"/assets/images/ui/drag-handle.svg"}
            alt=""
            draggable={false}
            className={ex.resizeIcon}
            style={{
              display: "block",
              width: "22px",
              height: "32px",
              maxWidth: "none",
              left: "-11px"
            }} />

        </button>}


      {!hideGetStarted &&
        <aside
          className={`${ex.aside} ${isGetStarted ? ex.asideStarted : ex.asideSplit
            }`}
          style={{
            width: isGetStarted ? "auto" : `${asidePct}%`,
            minWidth: isGetStarted ? undefined : (isSingle || isOral) ? "360px" : "320px",
            flex: isGetStarted ? "none" : "1 1 auto",
            transition: dragging ?
              "none" :
              "width 350ms ease-out, flex-basis 350ms ease-out"
          }}>

          <div
            className={ex.asideInner}
            style={{
              animation: (isSingle || isOral) ?
                "dentalCardExpand 380ms cubic-bezier(0.34, 1.2, 0.64, 1)" :
                "dentalCardCollapse 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              transformOrigin: "center top"
            }}>

            {isOral && canvasState ?
              <div className={ex.singleCol}>
                <div className={ex.singleCard}>
                  <OralExamPanel state={canvasState} onSave={handleSaveOralExam} saving={oralSaving} />
                </div>
              </div> :
              isSingle && canvasState ?
              <div className={ex.singleCol}>
                <div className={ex.singleCard}>
                  <SingleToothPanel state={canvasState} onSave={saveChart} />
                </div>
              </div> :

              <div className={isGetStarted ? ex.scrollStarted : ex.scrollSplit}>
                <DentitionPanel state={canvasState} hasApiExaminationData={hasApiExaminationData} />
              </div>}

          </div>
          <style
            dangerouslySetInnerHTML={{
              __html: `
          @keyframes dentalCardExpand {
            0%   { opacity: 0; transform: scale(0.72) translateY(40px); }
            60%  { opacity: 1; }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes dentalCardCollapse {
            from { opacity: 0; transform: scale(1.04) translateY(-6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `
            }} />

        </aside>}

    </div>);

}

// OralExamPanel / OralRecordsList live in ExaminationOralPanel.jsx; ExaminationTab
// renders them internally (imported above) and re-exports them here for
// backward-compatible imports.
export { OralExamPanel, OralRecordsList };
