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
  useRef,
  useState
} from "react";
import { Spin } from "antd";
import { TPMedicalIcon } from "../tp-ui";
import { useSelector } from "react-redux";
import { getClinic } from "../../../utils/utils";
import {
  DENTAL_MOENGAGE_EVENTS,
  fireDentalOnce,
  getPatientAgeGroup,
  setDentalAnalyticsContext,
  trackDentalEvent,
} from "../../../utils/dentalMoengage";
import { useGLTF } from "@react-three/drei";
import { getModelPathsForPatientType } from "./tooth-geometry";
import { DENTAL_RX_PAD_ROUTE } from "../../../utils/dentalRoutes";
import { DentalCanvas } from "./DentalCanvas";
import { saveDentalPreviewSnapshot } from "../tp-rxpad/rx-preview-store";
import { useDentalExamination } from "../lib/useDentalExamination";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import { selectDentalExamination } from "../../../redux/dentalExaminationSlice";
import { useOralExamination } from "../../../hooks/useOralExamination";
import { useDispatch } from "react-redux";
import ex from "./ExaminationTab.module.scss";
import { useExaminationLayout } from "./useExaminationLayout";
import { toDentalPreviewSections } from "../lib/useDentalScore";
import { OralExamPanel, OralRecordsList } from "./ExaminationOralPanel";
import { DentitionPanel } from "./ExaminationDentitionPanel";
import { SingleToothPanel } from "./ExaminationFindingsPanel";
import { useExaminationOrchestrator } from "./hooks/useExaminationOrchestrator";
import { ASSETS } from "../../../assets";

export function ExaminationTab({ patientId, patientAge = 30, appointmentId }) {
  const dispatch = useDispatch();
  const { profile, userId } = useSelector((state) => state.doctors);
  const { baselineToothState } = useSelector(selectDentalExamination);
  const baselineOralEntries = useSelector(
    (state) => state.oralExamination?.baselineOralEntries || [],
  );
  const { procedureItems, oralProcedureItems } = useDentalMasters();
  const patientType = patientAge < 12 ? "pediatric" : patientAge < 18 ? "mixed" : "adult";

  const { syncState, toothState, dentitionType, loading, saveChart, error } = useDentalExamination(patientId);
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
  const moduleOpenedRef = useRef(false);

  // Drop local canvas state when switching patients so prior oral/dental entries cannot re-sync
  useEffect(() => {
    setCanvasState(null);
    moduleOpenedRef.current = false;
  }, [patientId]);

  // Staggered preload for all dentition geometries
  useEffect(() => {
    // Collect all paths (adult, pedia, implant, etc)
    const allPaths = getModelPathsForPatientType("all"); 
    // We can just use the provided patientType or all. Let's just use "all" to be safe.
    // Wait, getModelPathsForPatientType in tooth-geometry.js:
    // export function getModelPathsForPatientType(patientType)
    const paths = getModelPathsForPatientType(patientType ?? "adult");
    
    paths.forEach((p, index) => {
      // Stagger by 100ms per file to avoid locking network and worker pool
      setTimeout(() => {
        useGLTF.preload(p, "/draco/");
      }, index * 100);
    });
  }, [patientType]);

  useEffect(() => {
    setDentalAnalyticsContext({
      profile,
      userId,
      patientData: { patient_unique_id: patientId, ageYears: patientAge },
      clinic: getClinic(profile?.hospital_data),
      sourcePage: DENTAL_RX_PAD_ROUTE,
    });
  }, [profile, userId, patientId, patientAge]);

  useEffect(() => {
    if (loading || oralLoading || moduleOpenedRef.current) return;
    moduleOpenedRef.current = true;
    fireDentalOnce("module_opened", () => {
      const hasToothState =
        toothState && Object.keys(toothState).length > 0;
      const oralCount =
        (oralFindings?.length || 0) +
        (oralProcedures?.length || 0) +
        (oralTreatmentHistory?.length || 0) +
        (oralOverallNotes?.trim() ? 1 : 0);
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.MODULE_OPENED, {
        patient_age_group: getPatientAgeGroup(patientAge),
        chart_type: dentitionType || patientType,
        default_view: "dentition",
        has_existing_dental_data: Boolean(hasToothState || oralCount > 0),
        tooth_record_count_total: hasToothState
          ? Object.keys(toothState).length
          : 0,
        oral_exam_count_total: oralCount,
        source_page: DENTAL_RX_PAD_ROUTE,
      });
    });
  }, [
    loading,
    oralLoading,
    patientAge,
    patientType,
    dentitionType,
    toothState,
    oralFindings,
    oralProcedures,
    oralTreatmentHistory,
    oralOverallNotes,
  ]);

  const { initialCanvasData } = useExaminationOrchestrator({
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
  // initialCanvasData is non-null only when the API returned a saved record (dental/oral data
  // or a dentition_type). Null means brand-new patient with no prior examination.
  const hasApiExaminationData = !!initialCanvasData;
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

  if (loading || oralLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <Spin size="large" />
        <span style={{ color: '#64748b', fontSize: 13 }}>Loading Dental Examination…</span>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff', flexDirection: 'column', gap: '12px' }}>
        <p>Failed to load dental examination. Please try again.</p>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
          Retry
        </button>
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
          <React.Suspense fallback={
            <div className={ex.loaderWrapper}>
              <div className={ex.shimmerIcon}>
                <TPMedicalIcon name="tooth" variant="bulk" size={56} color="#94a3b8" />
              </div>
              <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>Loading 3D view…</span>
            </div>
          }>
            <DentalCanvas
              key={patientId}
              patientId={patientId}
              patientAge={patientAge}
              initialData={initialCanvasData}
              onStateChange={setCanvasState} />
          </React.Suspense>
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
            src={ASSETS.dental.dragHandle}
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
