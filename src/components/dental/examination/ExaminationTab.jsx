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
import { useExaminationOrchestrator } from "./hooks/useExaminationOrchestrator";

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

  const { initialCanvasData } = useExaminationOrchestrator({
    loading,
    oralLoading,
    toothState,
    oralFindings,
    oralProcedures,
    oralTreatmentHistory,
    oralOverallNotes,
    canvasState,
    syncState,
    dispatch,
  });

  const handleSaveOralExam = useCallback(async () => {
    if (!canvasState) return;
    await saveOralExam({
      canvasOralEntries: canvasState.oralEntries,
      canvasOralNotes: canvasState.oralNotes,
    });
  }, [canvasState, saveOralExam]);

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
