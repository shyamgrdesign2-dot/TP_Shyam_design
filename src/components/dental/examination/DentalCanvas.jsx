/**
 * DentalCanvas
 *
 * Slim R3F <Canvas> wrapper.  All state and interaction logic lives in
 * useDentalCanvasInteraction; all scene/camera R3F components live in
 * useThreeDentalScene (CameraController, ZoneCameraRotator).
 */
import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Tooth } from "./Tooth";
import DentitionView from "./DentitionView";
import { ToothSelector } from "./ToothSelector";
import { QuickSurfaceSelector } from "./QuickSurfaceSelector";
import {
  QUADRANT_LABELS,
} from "./types";
import { CameraController, ZoneCameraRotator } from "./hooks/useThreeDentalScene";
import { useDentalCanvasInteraction } from "./hooks/useDentalCanvasInteraction";
import "./dental-canvas.css";
import dc from "./DentalCanvas.module.scss";
import { LottieIcon } from "../LottieIcon";
import { DentalChartPrintButton } from "./DentalChartPrint";

// ── Scope toolbar constants ────────────────────────────────────────────────────
const DENTITION_SCOPE_BUTTONS = [
  { id: "UR",         label: "UR",        title: "Upper right quadrant" },
  { id: "UL",         label: "UL",        title: "Upper left quadrant" },
  { id: "LR",         label: "LR",        title: "Lower right quadrant" },
  { id: "LL",         label: "LL",        title: "Lower left quadrant" },
  { id: "RIGHT_ARCH", label: "R arch",    title: "Patient's right arch (UR + LR)" },
  { id: "LEFT_ARCH",  label: "L arch",    title: "Patient's left arch (UL + LL)" },
  { id: "UPPER_ARCH", label: "Maxillary", title: "Maxillary arch (UR + UL)" },
  { id: "LOWER_ARCH", label: "Mandibular", title: "Mandibular arch (LR + LL)" },
  { id: "FULL",       label: "Full",      title: "Full mouth — all teeth" }
];

const ARCH_SCOPE_IDS = new Set([
  "RIGHT_ARCH", "LEFT_ARCH", "UPPER_ARCH", "LOWER_ARCH"
]);

const SCOPE_HEADER_BADGE = {
  FULL: "FULL",
  UR: "UR",
  UL: "UL",
  LR: "LR",
  LL: "LL",
  RIGHT_ARCH: "R arch",
  LEFT_ARCH: "L arch",
  UPPER_ARCH: "Maxillary",
  LOWER_ARCH: "Mandibular"
};

function dentitionScopeIsActive(scopeId, selectionScope) {
  if (scopeId === "FULL") return selectionScope.type === "full-mouth";
  if (ARCH_SCOPE_IDS.has(scopeId))
    return selectionScope.type === "arch" && selectionScope.id === scopeId;
  return selectionScope.type === "quadrant" && selectionScope.id === scopeId;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * @param {{ patientId: string, patientAge?: number, compact?: boolean,
 *           onStateChange?: function, initialData?: object }} props
 */
export function DentalCanvas({
  patientId,
  patientAge = 30,
  compact = false,
  onStateChange,
  initialData
}) {
  const interaction = useDentalCanvasInteraction({ patientId, patientAge, initialData });

  const {
    patientType,
    viewMode,
    selectedTooth,
    selectionScope,
    selectedZone,
    findingsByTooth,
    zoneNotes,
    implantTeeth,
    toothDiagnoses,
    toothNotes,
    allEntries,
    treatmentHistoryDetailsByTooth,
    highlightZones,
    multiSelectZones,
    multiSelectActive,
    hoveredToothFdi,
    dentitionVerticalNudge,
    dentitionCameraOverride,
    hideExamineHint,
    agentApplyPulseFdis,
    controlsRef,
    currentToothDiagnoses,
    isImplant,
    currentToothNotes,
    currentTreatmentHistoryDetails,
    findings,
    currentToothEntries,
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
    handleUpdateTreatmentHistoryDetail,
    handleRemoveTreatmentHistoryDetail,
    handleClearTreatmentHistoryDetails,
    handleSetHighlightZones,
    setHoveredToothFdi,
    getScopeFdis,
    oralEntries,
    oralNotes,
    oralHighlightFdis,
    addOralEntry,
    removeOralEntry,
    updateOralEntry,
    updateOralNotes,
    enterOralExam,
    setOralHighlight
  } = interaction;

  const toothEntriesForTooth = useMemo(
    () => currentToothEntries.map((e) => ({ kind: e.kind, name: e.name, surfaces: e.surfaces })),
    [currentToothEntries]
  );

  const isDentitionView = viewMode === "dentition";

  const dentitionTitle =
    patientType === "adult"
      ? "Full Adult Dentition View"
      : patientType === "pediatric"
      ? "Full Pediatric Dentition View"
      : "Full Mixed Dentition View";

  // ── Emit state to parent (ExaminationTab) ────────────────────────────────
  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      viewMode,
      patientType,
      selectedTooth,
      selectedZone,
      findings,
      toothDiagnoses,
      implantTeeth,
      findingsByTooth,
      toothNotes,
      treatmentHistoryDetailsByTooth,
      agentApplyPulseFdis,
      currentToothDiagnoses,
      currentToothNotes,
      zoneNotes,
      isImplant,
      currentToothEntries,
      currentTreatmentHistoryDetails,
      allEntries,
      oralEntries,
      oralNotes,
      oralHighlightFdis,
      highlightZones,
      multiSelectZones,
      multiSelectActive,
      hoveredToothFdi,
      selectionScopeType: selectionScope.type,
      selectionScopeId: selectionScope.id,
      selectionScopeLabel: selectionScope.label,
      selectionScopeFdis: selectionScope.fdis,
      onToggleToothDiagnosis: toggleToothDiagnosis,
      onToggleImplant: toggleImplant,
      onAddFinding: handleAddFinding,
      onRemoveFinding: handleRemoveFinding,
      onUpdateNotes: handleUpdateNotes,
      onUpdateToothNotes: updateToothNotes,
      onBackToDentition: handleBackToDentition,
      onSelectTooth: handleSelectTooth,
      onSelectZone: handleSelectZone,
      onClearSelectedZone: handleClearSelectedZone,
      onAddEntry: handleAddEntry,
      onUpdateEntry: handleUpdateEntry,
      onRemoveEntry: handleRemoveEntry,
      onAddOralEntry: addOralEntry,
      onRemoveOralEntry: removeOralEntry,
      onUpdateOralEntry: updateOralEntry,
      onUpdateOralNotes: updateOralNotes,
      onEnterOralExam: enterOralExam,
      onSetOralHighlight: setOralHighlight,
      onUpdateTreatmentHistoryDetail: handleUpdateTreatmentHistoryDetail,
      onRemoveTreatmentHistoryDetail: handleRemoveTreatmentHistoryDetail,
      onClearTreatmentHistoryDetails: handleClearTreatmentHistoryDetails,
      onSetHighlightZones: handleSetHighlightZones,
      onToggleZoneMultiSelect: handleToggleZoneMultiSelect,
      onSetMultiSelectZones: handleSetMultiSelectZones,
      onClearMultiSelect: handleClearMultiSelect,
      onSetMultiSelectActive: handleSetMultiSelectActive,
      onSetHoveredTooth: handleSetHoveredTooth
    });
  }, [
    viewMode,
    patientType,
    selectedTooth,
    selectedZone,
    findings,
    toothDiagnoses,
    implantTeeth,
    findingsByTooth,
    toothNotes,
    treatmentHistoryDetailsByTooth,
    agentApplyPulseFdis,
    currentToothDiagnoses,
    currentToothNotes,
    currentTreatmentHistoryDetails,
    zoneNotes,
    isImplant,
    onStateChange,
    currentToothEntries,
    allEntries,
    oralEntries,
    oralNotes,
    oralHighlightFdis,
    highlightZones,
    multiSelectZones,
    multiSelectActive,
    hoveredToothFdi,
    selectionScope,
    toggleToothDiagnosis,
    toggleImplant,
    handleAddFinding,
    handleRemoveFinding,
    handleUpdateNotes,
    updateToothNotes,
    handleBackToDentition,
    handleSelectTooth,
    handleSelectZone,
    handleClearSelectedZone,
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
    handleSetHighlightZones,
    handleToggleZoneMultiSelect,
    handleSetMultiSelectZones,
    handleClearMultiSelect,
    handleSetMultiSelectActive,
    handleSetHoveredTooth
  ]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`dental-canvas-root ${isDentitionView ? "dentition-mode" : ""} ${
        !isDentitionView ? "has-tooth-selector" : ""
      } ${compact ? "compact" : ""}`}
    >
      <div className="viewer">
        <div className="viewer-header">
          {isDentitionView ? (
            <div className="tooth-name tooth-name--dentition">
              <span className="tooth-name-text">{dentitionTitle}</span>
            </div>
          ) : (
            <div
              className={`tooth-name ${dc.toothNameBack}`}
              onClick={handleBackToDentition}
              title="Back to full dentition view"
              role="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className={dc.backChevron}
              >
                <path
                  d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08"
                  stroke="#1e293b"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.2"
                />
              </svg>
              {selectionScope.type === "tooth" ? (
                <>
                  {QUADRANT_LABELS[selectedTooth.quadrant]} {selectedTooth.name}
                  <span className="tooth-fdi">T{selectedTooth.fdi}</span>
                </>
              ) : (
                <>
                  {viewMode === "oral"
                    ? "Oral Examination"
                    : selectionScope.type === "full-mouth"
                    ? "Full Mouth View"
                    : `${selectionScope.label} View`}
                  <span className="tooth-fdi">
                    {viewMode === "oral"
                      ? "FULL"
                      : selectionScope.type === "full-mouth"
                      ? "FULL"
                      : SCOPE_HEADER_BADGE[selectionScope.id] ??
                        selectionScope.id}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {isDentitionView && (
          <div className={dc.patientTypeHost}>
            <div className={dc.patientTypeTrack}>
              <button
                type="button"
                onClick={() => handlePatientTypeChange("adult")}
                className={`${dc.patientTypeBtn} ${
                  patientType === "adult" ? dc.patientTypeBtnActive : ""
                }`}
              >
                Adult
              </button>
              <button
                type="button"
                onClick={() => handlePatientTypeChange("pediatric")}
                className={`${dc.patientTypeBtn} ${
                  patientType === "pediatric" ? dc.patientTypeBtnActive : ""
                }`}
              >
                Pediatric
              </button>
              <button
                type="button"
                onClick={() => handlePatientTypeChange("mixed")}
                className={`${dc.patientTypeBtn} ${
                  patientType === "mixed" ? dc.patientTypeBtnActive : ""
                }`}
              >
                Mixed
              </button>
            </div>
          </div>
        )}



        {isDentitionView && !hideExamineHint && (
          <div className={dc.examineHint}>
            <LottieIcon name="arrow-up" size={24} color="#d5dde8" />
            <span className={dc.examineHintText}>
              Click any tooth to examine
            </span>
          </div>
        )}

        {isDentitionView && (
          <>
            <div className={dc.printBtnWrap}>
              <DentalChartPrintButton patientId={patientId} />
            </div>
            <div className={dc.scopeHost}>
              <button
                type="button"
                onClick={enterOralExam}
                title="Record region-level oral findings & procedures"
                className={dc.oralExamBtn}
              >
                <span className={dc.oralExamBtnPlus}>＋</span>
                <span>Oral Examination</span>
              </button>
            </div>
          </>
        )}

        {!isDentitionView && (
          <ToothSelector
            selectedTooth={selectedTooth}
            patientType={patientType}
            onSelectTooth={handleSelectTooth}
            toothDiagnoses={toothDiagnoses}
            viewMode={viewMode}
            onBackToDentition={handleBackToDentition}
            onSelectScope={handleToothScopeJump}
            selectionScope={selectionScope}
            getScopeFdis={getScopeFdis}
            findingsByTooth={findingsByTooth}
            implantTeeth={implantTeeth}
            allEntries={allEntries}
            toothNotes={toothNotes}
            surfaceSelector={
              <QuickSurfaceSelector
                selectedZones={
                  multiSelectActive
                    ? multiSelectZones
                    : selectedZone
                    ? new Set([selectedZone])
                    : new Set()
                }
                onToggleZone={handleToggleZoneFromQuickSelector}
                arch={selectedTooth.arch}
                toothPosition={selectedTooth.position}
                zonesWithFindings={new Set(findings.map((f) => f.zoneId))}
                disabled={
                  currentToothDiagnoses.has("Missing") ||
                  currentToothDiagnoses.has("Extraction")
                }
              />
            }
          />
        )}

        <Canvas
          camera={{ position: [0, 2.5, 13], fov: 35 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            toneMapping: 3,
            toneMappingExposure: 1.3,
            powerPreference: "high-performance"
          }}
          performance={{ min: 0.5 }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 5, 4]} intensity={1.0} />
          <directionalLight position={[-2, 3, -2]} intensity={0.4} />
          <directionalLight position={[0, -2, 1]} intensity={0.3} />

          <CameraController
            viewMode={viewMode}
            patientType={patientType}
            selectionScopeType={selectionScope.type}
            selectionScopeId={selectionScope.id}
            dentitionCameraOverride={dentitionCameraOverride}
            dentitionVerticalNudge={dentitionVerticalNudge}
            onDentitionVerticalNudgeChange={handleDentitionVerticalNudgeChange}
            controlsRef={controlsRef}
          />

          {!isDentitionView && selectionScope.type === "tooth" && (
            <ZoneCameraRotator
              zone={selectedZone}
              toothFdi={selectedTooth.fdi}
              quadrant={selectedTooth.quadrant}
              arch={selectedTooth.arch}
              controlsRef={controlsRef}
            />
          )}

          <Suspense fallback={null}>
            {isDentitionView || viewMode === "oral" ? (
              <DentitionView
                patientType={patientType}
                layoutMode="split"
                toothDiagnoses={toothDiagnoses}
                findingsByTooth={findingsByTooth}
                implantTeeth={implantTeeth}
                onSelectTooth={handleSelectTooth}
                onHoverTooth={setHoveredToothFdi}
                externalHoveredFdi={hoveredToothFdi}
                allEntries={allEntries}
                toothNotes={toothNotes}
                agentPulseFdis={agentApplyPulseFdis}
                treatmentHistoryDetailsByTooth={treatmentHistoryDetailsByTooth}
                oralEntries={oralEntries}
              />
            ) : selectionScope.type !== "tooth" ? (
              <DentitionView
                patientType={patientType}
                visibleFdis={selectionScope.fdis}
                disableSelection={true}
                highlightFdis={oralHighlightFdis}
                layoutMode={
                  selectionScope.type === "full-mouth" ? "natural" : "split"
                }
                toothDiagnoses={toothDiagnoses}
                findingsByTooth={findingsByTooth}
                implantTeeth={implantTeeth}
                onSelectTooth={handleSelectTooth}
                onHoverTooth={setHoveredToothFdi}
                externalHoveredFdi={hoveredToothFdi}
                allEntries={allEntries}
                toothNotes={toothNotes}
                agentPulseFdis={agentApplyPulseFdis}
                treatmentHistoryDetailsByTooth={treatmentHistoryDetailsByTooth}
                oralEntries={oralEntries}
              />
            ) : (
              <group position={[0, -0.17, 0]}>
                <Tooth
                  selectedZone={selectedZone}
                  onSelectZone={handleSelectZone}
                  onClearSelectedZone={handleClearSelectedZone}
                  onHoverZone={setHoveredToothFdi}
                  modelPath={selectedTooth.modelPath}
                  arch={selectedTooth.arch}
                  mirrorX={selectedTooth.mirrorX}
                  quadrant={selectedTooth.quadrant}
                  toothPosition={selectedTooth.position}
                  toothFdi={selectedTooth.fdi}
                  isImplant={isImplant}
                  findings={findings}
                  zoneNotes={zoneNotes}
                  toothDiagnoses={currentToothDiagnoses}
                  multiSelectZones={multiSelectZones}
                  multiSelectActive={multiSelectActive}
                  hideTags={true}
                  treatmentHistoryDetails={currentTreatmentHistoryDetails}
                  toothEntries={toothEntriesForTooth}
                />
              </group>
            )}
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            onEnd={handleDentitionControlsEnd}
            enableDamping={true}
            dampingFactor={0.12}
            rotateSpeed={0.8}
            minDistance={
              isDentitionView
                ? 6
                : selectionScope.type === "tooth"
                ? 2.05
                : selectionScope.type === "quadrant" ||
                  (selectionScope.type === "arch" &&
                    (selectionScope.id === "RIGHT_ARCH" ||
                      selectionScope.id === "LEFT_ARCH"))
                ? 3.5
                : 5
            }
            maxDistance={
              isDentitionView
                ? patientType === "mixed"
                  ? 28
                  : 22
                : selectionScope.type === "tooth"
                ? 10.5
                : selectionScope.type === "quadrant" ||
                  (selectionScope.type === "arch" &&
                    (selectionScope.id === "RIGHT_ARCH" ||
                      selectionScope.id === "LEFT_ARCH"))
                ? 22
                : 30
            }
            enablePan={isDentitionView}
            touches={{ ONE: 0, TWO: 2 }}
          />
        </Canvas>
      </div>
    </div>
  );
}
