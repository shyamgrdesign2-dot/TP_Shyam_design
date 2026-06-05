import React, { useRef, useState } from "react";
import { Trash, Eraser } from "iconsax-reactjs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "../ui/alert-dialog";
import { QUADRANT_LABELS } from "./types";
import { MiniToothCanvas } from "./MiniToothCanvas";
import { MiniScopeCanvas } from "./MiniScopeCanvas";
import { AccordionWrap, SectionHeader } from "./examination-shared-ui";
import ui from "./ExaminationTab.ui.module.scss";
import { PanelShell } from "./PanelShell";
import { DentalSymptomsBody } from "./symptoms-panel";
import { PrimaryDiagnosisBody } from "./diagnosis-panel";
import { EntryTab } from "./entry-tab";

const ARCH_SCOPE_BADGE = {
  RIGHT_ARCH: "R arch",
  LEFT_ARCH: "L arch",
  UPPER_ARCH: "Maxillary",
  LOWER_ARCH: "Mandibular"
};
export function SingleToothPanel({ state, onSave }) {
  const isGroupedScope =
    state.selectionScopeType === "quadrant" ||
    state.selectionScopeType === "full-mouth" ||
    state.selectionScopeType === "arch";
  const entityLabel = isGroupedScope ?
    state.selectionScopeLabel || "Selected Scope" :
    `${QUADRANT_LABELS[state.selectedTooth.quadrant]} ${state.selectedTooth.name}`;
  const entityBadge = isGroupedScope ?
    state.selectionScopeType === "full-mouth" ?
      "FULL" :
      state.selectionScopeType === "arch" ?
        ARCH_SCOPE_BADGE[state.selectionScopeId] ?? state.selectionScopeId :
        state.selectionScopeId || "Q" :
    `T${state.selectedTooth.fdi}`;
  const [activeSection, setActiveSection] = useState("procedures");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const tryBack = () => state.onBackToDentition();
  const sectionRefs = useRef({
    procedures: null,
    findings: null,
    planned: null,
    notes: null
  });
  const clearAllToothData = () => {
    // Clear all diagnoses
    state.currentToothDiagnoses.forEach((d) => state.onToggleToothDiagnosis(d));
    // Clear implant
    if (state.isImplant) state.onToggleImplant();
    // Clear treatment-history table rows (incl. Dr Agent / voice merges)
    state.onClearTreatmentHistoryDetails?.();
    // Clear all entries (findings, procedures, planned)
    state.currentToothEntries.forEach((e) => state.onRemoveEntry(e.id));
    // Clear notes
    state.onUpdateToothNotes("");
    setShowClearConfirm(false);
  };
  const treatmentDetailCount = Object.keys(
    state.currentTreatmentHistoryDetails ?? {}
  ).length;
  const hasAnyData =
    state.currentToothDiagnoses.size > 0 ||
    state.isImplant ||
    state.currentToothEntries.length > 0 ||
    state.currentToothNotes.trim().length > 0 ||
    treatmentDetailCount > 0;
  const findingCount = state.currentToothEntries.filter(
    (e) => e.kind === "finding"
  ).length;
  const procedureCount = state.currentToothEntries.filter(
    (e) => e.kind === "procedure"
  ).length;
  const plannedCount = state.currentToothEntries.filter(
    (e) => e.kind === "planned"
  ).length;
  const diagnosisCount =
    state.currentToothDiagnoses.size + (state.isImplant ? 1 : 0);
  // Dental charting sections — standard clinical workflow order
  const sections = [
    {
      id: "procedures",
      label: "Past Procedures",
      icon: "clipboard-activity",
      count: diagnosisCount + procedureCount
    },
    {
      id: "findings",
      label: "Findings",
      icon: "diagnosis",
      count: findingCount
    },
    {
      id: "planned",
      label: "Procedures",
      icon: "surgical-scissors-02",
      count: plannedCount
    },
    {
      id: "notes",
      label: isGroupedScope ? "Overall Group Notes" : "Overall Tooth Notes",
      icon: "note-2"
    }];


  const jumpTo = (id) => {
    // Toggle: collapse if already active, otherwise expand
    if (activeSection === id) {
      setActiveSection(null);
      return;
    }
    setActiveSection(id);
    // Delay scroll until the accordion has expanded so we scroll to the expanded height.
    requestAnimationFrame(() => {
      sectionRefs.current[id]?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  };
  return (
    <PanelShell
      thumbnail={isGroupedScope ?
        <MiniScopeCanvas
          patientType={state.patientType ?? "adult"}
          scopeType={
            state.selectionScopeType === "full-mouth" ?
              "full-mouth" :
              state.selectionScopeType === "arch" ?
                "arch" :
                "quadrant"}
          fdis={state.selectionScopeFdis ?? []}
          toothDiagnoses={state.toothDiagnoses}
          findingsByTooth={state.findingsByTooth}
          implantTeeth={state.implantTeeth}
          size={40} /> :
        <MiniToothCanvas
          tooth={state.selectedTooth}
          size={40}
          diagnoses={state.currentToothDiagnoses}
          isImplant={state.isImplant}
          findings={state.findings} />}
      title={entityLabel}
      badge={entityBadge}
      onSave={onSave}
      onClose={tryBack}
      clearSection={
        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <AlertDialogTrigger asChild={true}>
            <button
              type="button"
              title="Clear all data for this tooth"
              disabled={!hasAnyData}
              className={ui.panelIconBtnDanger}>
              <Eraser color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className={ui.clearDialogContent}>
            <AlertDialogHeader>
              <div className={ui.clearDialogTitleRow}>
                <div className={ui.clearDialogIcon}>
                  <Trash color="#ef4444" size={18} variant="Bulk" />
                </div>
                <AlertDialogTitle className={ui.clearDialogTitle}>
                  Clear all data?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className={ui.clearDialogDesc}>
                This will remove all past procedures, findings,
                procedures, and notes for{" "}
                <span className={ui.clearDialogStrong}>
                  {entityLabel} ({entityBadge})
                </span>
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={ui.clearDialogFooter}>
              <AlertDialogCancel className={ui.clearDialogCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearAllToothData} className={ui.clearDialogAction}>
                Clear all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }>
        <div
          ref={(el) => {
            sectionRefs.current.procedures = el;
          }}>

          <AccordionWrap
            open={activeSection === "procedures"}
            onExpand={() => jumpTo("procedures")}
            header={
              <SectionHeader
                title="Past Procedures"
                count={diagnosisCount + procedureCount}
                medicalIcon="clipboard-activity"
                onTemplate={
                  activeSection === "procedures" ? () => { } : undefined}

                onSave={activeSection === "procedures" ? () => { } : undefined}
                onClear={
                  activeSection === "procedures" ?
                    () => {
                      state.currentToothDiagnoses.forEach((d) =>
                        state.onToggleToothDiagnosis(d)
                      );
                      if (state.isImplant) state.onToggleImplant();
                      state.currentToothEntries.
                        filter((e) => e.kind === "procedure").
                        forEach((e) => state.onRemoveEntry(e.id));
                      state.onClearTreatmentHistoryDetails?.();
                    } :
                    undefined}

                clearDisabled={
                  diagnosisCount === 0 &&
                  procedureCount === 0 &&
                  treatmentDetailCount === 0}

                chevron={activeSection === "procedures" ? "up" : "down"}
                onClick={() => jumpTo("procedures")}
                onChevronClick={() => jumpTo("procedures")} />}>



            <PrimaryDiagnosisBody state={state} />
          </AccordionWrap>
        </div>
        <div
          ref={(el) => {
            sectionRefs.current.findings = el;
          }}>

          <AccordionWrap
            open={activeSection === "findings"}
            onExpand={() => jumpTo("findings")}
            header={
              <SectionHeader
                title="Findings"
                count={findingCount}
                medicalIcon="diagnosis"
                onTemplate={activeSection === "findings" ? () => { } : undefined}
                onSave={activeSection === "findings" ? () => { } : undefined}
                onClear={
                  activeSection === "findings" ?
                    () => {
                      state.currentToothEntries.
                        filter((e) => e.kind === "finding").
                        forEach((e) => state.onRemoveEntry(e.id));
                    } :
                    undefined}

                clearDisabled={findingCount === 0}
                chevron={activeSection === "findings" ? "up" : "down"}
                onClick={() => jumpTo("findings")}
                onChevronClick={() => jumpTo("findings")} />}>



            <EntryTab state={state} kind="finding" />
          </AccordionWrap>
        </div>
        <div
          ref={(el) => {
            sectionRefs.current.planned = el;
          }}>

          <AccordionWrap
            open={activeSection === "planned"}
            onExpand={() => jumpTo("planned")}
            header={
              <SectionHeader
                title="Procedures"
                count={plannedCount}
                medicalIcon="surgical-scissors-02"
                onTemplate={activeSection === "planned" ? () => { } : undefined}
                onSave={activeSection === "planned" ? () => { } : undefined}
                onClear={
                  activeSection === "planned" ?
                    () => {
                      state.currentToothEntries.
                        filter((e) => e.kind === "planned").
                        forEach((e) => state.onRemoveEntry(e.id));
                    } :
                    undefined}

                clearDisabled={plannedCount === 0}
                chevron={activeSection === "planned" ? "up" : "down"}
                onClick={() => jumpTo("planned")}
                onChevronClick={() => jumpTo("planned")} />}>



            <EntryTab state={state} kind="planned" />
          </AccordionWrap>
        </div>
        <div
          ref={(el) => {
            sectionRefs.current.notes = el;
          }}>

          <AccordionWrap
            open={activeSection === "notes"}
            onExpand={() => jumpTo("notes")}
            header={
              <SectionHeader
                title={
                  isGroupedScope ? "Overall Group Notes" : "Overall Tooth Notes"}

                medicalIcon="note-2"
                onTemplate={activeSection === "notes" ? () => { } : undefined}
                onSave={activeSection === "notes" ? () => { } : undefined}
                onClear={
                  activeSection === "notes" ?
                    () => state.onUpdateToothNotes("") :
                    undefined}

                chevron={activeSection === "notes" ? "up" : "down"}
                onClick={() => jumpTo("notes")}
                onChevronClick={() => jumpTo("notes")} />}>



            <div className={ui.notesPad}>
              <textarea
                value={state.currentToothNotes}
                onChange={(e) => state.onUpdateToothNotes(e.target.value)}
                placeholder={
                  isGroupedScope ?
                    "General notes for this selected group…" :
                    "General notes for this tooth…"}

                className={ui.notesArea} />

            </div>
          </AccordionWrap>
        </div>
    </PanelShell>);

}

