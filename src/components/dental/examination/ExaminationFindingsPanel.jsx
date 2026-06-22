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
import { ExaminationTemplateActions } from "./ExaminationTemplateActions";
import { useExaminationTemplates } from "./hooks/useExaminationTemplates";
import { PrimaryDiagnosisBody } from "./diagnosis-panel";
import { EntryTab } from "./entry-tab";
import { DX_MARKER } from "../../../utils/dentalApiMappers";
import {
  DENTAL_MOENGAGE_EVENTS,
  getToothAnalyticsMeta,
  trackDentalEvent,
} from "../../../utils/dentalMoengage";
import { DENTAL_RX_PAD_ROUTE } from "../../../utils/dentalRoutes";

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

  const pastTpl = useExaminationTemplates({ type: "treatment-history", domain: "dental" });
  const findingsTpl = useExaminationTemplates({ type: "findings", domain: "dental" });
  const procTpl = useExaminationTemplates({ type: "procedures", domain: "dental" });
  const notesTpl = useExaminationTemplates({ type: "notes", domain: "dental" });
  const examTpl = useExaminationTemplates({ type: "examination", domain: "dental" });

  const toDentalRow = (e) => {
    const row = { name: e.name, surface_codes: e.surfaces, notes: e.notes || "" };
    if (e.since) row.since_date = e.since;
    return row;
  };
  const applyDentalEntries = (kind, items = []) => {
    items.forEach((f) =>
      state.onAddEntry({ kind, name: f.name, surfaces: f.surface_codes || [], since: f.since_date || "", notes: f.notes || "" })
    );
  };
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
    const toothMeta = getToothAnalyticsMeta(state.selectedTooth?.fdi, state.selectedTooth);
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.TOOTH_SECTION_EXPANDED, {
      ...toothMeta,
      section_name: id,
      existing_item_count:
        id === "findings"
          ? findingCount
          : id === "planned"
            ? plannedCount
            : id === "procedures"
              ? diagnosisCount + procedureCount
              : 0,
      source_page: DENTAL_RX_PAD_ROUTE,
    });
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
      templateSection={
        <ExaminationTemplateActions
          title="Dental Examination Templates"
          templates={examTpl.templates}
          saving={examTpl.saving}
          hasData={hasAnyData}
          onSelect={(t) => examTpl.applyTemplate(t, (full) => {
            (full.payload?.tooth_states || []).forEach((ts) => {
              const history = ts.treatment_history || [];
              history.filter((h) => h.notes === DX_MARKER).forEach((h) => (state.onSetToothDiagnosis || state.onToggleToothDiagnosis)(h.name));
              applyDentalEntries("procedure", history.filter((h) => h.notes !== DX_MARKER));
              applyDentalEntries("finding", ts.findings);
              applyDentalEntries("planned", ts.procedures);
              if (ts.overall_notes) state.onUpdateToothNotes(ts.overall_notes);
            });
          })}
          onDelete={examTpl.onDelete}
          onSaveNew={(name) => {
            const entries = state.currentToothEntries;
            const dxRows = [...(state.currentToothDiagnoses || [])].map((d) => ({ name: d, surface_codes: ["whole"], notes: DX_MARKER }));
            examTpl.onSaveNew(name, {
              dentition_type: state.patientType || "adult",
              tooth_states: [{
                tooth_code: String(state.selectedTooth?.fdi || ""),
                findings: entries.filter((e) => e.kind === "finding").map(toDentalRow),
                procedures: entries.filter((e) => e.kind === "planned").map(toDentalRow),
                treatment_history: [...dxRows, ...entries.filter((e) => e.kind === "procedure").map(toDentalRow)],
                overall_notes: state.currentToothNotes,
              }],
            });
          }}
          onUpdate={(sel) => {
            const entries = state.currentToothEntries;
            const dxRows = [...(state.currentToothDiagnoses || [])].map((d) => ({ name: d, surface_codes: ["whole"], notes: DX_MARKER }));
            examTpl.onUpdate(sel, {
              dentition_type: state.patientType || "adult",
              tooth_states: [{
                tooth_code: String(state.selectedTooth?.fdi || ""),
                findings: entries.filter((e) => e.kind === "finding").map(toDentalRow),
                procedures: entries.filter((e) => e.kind === "planned").map(toDentalRow),
                treatment_history: [...dxRows, ...entries.filter((e) => e.kind === "procedure").map(toDentalRow)],
                overall_notes: state.currentToothNotes,
              }],
            });
          }}
          btnClassName={ui.panelIconBtn}
        />
      }
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
                templateActions={
                  activeSection === "procedures"
                    ? <ExaminationTemplateActions
                        title="Past Procedures Templates"
                        templates={pastTpl.templates}
                        saving={pastTpl.saving}
                        hasData={(diagnosisCount + procedureCount) > 0}
                        onSelect={(t) => pastTpl.applyTemplate(t, (full) => applyDentalEntries("procedure", full.payload?.treatment_history))}
                        onDelete={pastTpl.onDelete}
                        onSaveNew={(name) => pastTpl.onSaveNew(name, { treatment_history: state.currentToothEntries.filter((e) => e.kind === "procedure").map(toDentalRow) })}
                        onUpdate={(sel) => pastTpl.onUpdate(sel, { treatment_history: state.currentToothEntries.filter((e) => e.kind === "procedure").map(toDentalRow) })}
                        btnClassName={ui.secToolBtn}
                      />
                    : undefined
                }
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
                templateActions={
                  activeSection === "findings"
                    ? <ExaminationTemplateActions
                        title="Findings Templates"
                        templates={findingsTpl.templates}
                        saving={findingsTpl.saving}
                        hasData={findingCount > 0}
                        onSelect={(t) => findingsTpl.applyTemplate(t, (full) => applyDentalEntries("finding", full.payload?.findings))}
                        onDelete={findingsTpl.onDelete}
                        onSaveNew={(name) => findingsTpl.onSaveNew(name, { findings: state.currentToothEntries.filter((e) => e.kind === "finding").map(toDentalRow) })}
                        onUpdate={(sel) => findingsTpl.onUpdate(sel, { findings: state.currentToothEntries.filter((e) => e.kind === "finding").map(toDentalRow) })}
                        btnClassName={ui.secToolBtn}
                      />
                    : undefined
                }
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
                templateActions={
                  activeSection === "planned"
                    ? <ExaminationTemplateActions
                        title="Procedures Templates"
                        templates={procTpl.templates}
                        saving={procTpl.saving}
                        hasData={plannedCount > 0}
                        onSelect={(t) => procTpl.applyTemplate(t, (full) => applyDentalEntries("planned", full.payload?.procedures))}
                        onDelete={procTpl.onDelete}
                        onSaveNew={(name) => procTpl.onSaveNew(name, { procedures: state.currentToothEntries.filter((e) => e.kind === "planned").map(toDentalRow) })}
                        onUpdate={(sel) => procTpl.onUpdate(sel, { procedures: state.currentToothEntries.filter((e) => e.kind === "planned").map(toDentalRow) })}
                        btnClassName={ui.secToolBtn}
                      />
                    : undefined
                }
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
                templateActions={
                  activeSection === "notes"
                    ? <ExaminationTemplateActions
                        title="Notes Templates"
                        templates={notesTpl.templates}
                        saving={notesTpl.saving}
                        hasData={state.currentToothNotes.trim().length > 0}
                        onSelect={(t) => notesTpl.applyTemplate(t, (full) => { const n = full.payload?.overall_notes; if (n) state.onUpdateToothNotes(n); })}
                        onDelete={notesTpl.onDelete}
                        onSaveNew={(name) => notesTpl.onSaveNew(name, { overall_notes: state.currentToothNotes })}
                        onUpdate={(sel) => notesTpl.onUpdate(sel, { overall_notes: state.currentToothNotes })}
                        btnClassName={ui.secToolBtn}
                      />
                    : undefined
                }
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

