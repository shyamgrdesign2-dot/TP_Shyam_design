import React, { useRef, useState } from "react";
import { Trash, Eraser } from "iconsax-reactjs";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import { QUADRANT_LABELS, getDefaultTreatmentSurfaces, findProcedureCatalogItem, resolveVisitProcedure } from "./types";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import { TPMedicalIcon } from "../tp-ui";
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
  const { procedureItems } = useDentalMasters();
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
    // no onToggleImplant() here — toggleToothDiagnosis above already clears
    // implantTeeth when the last IMPLANT-visual-type diagnosis is removed. Calling
    // onToggleImplant() after would re-add "Implant" because state.isImplant is stale.
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
  // +1 only when the synthetic "Implant" row is actually rendered (isImplant via implantTeeth
  // but no chip in currentToothDiagnoses already maps to VISUAL_TYPE.IMPLANT)
  const diagnosisCount =
    state.currentToothDiagnoses.size +
    (state.isImplant && !state.currentToothVisualTypes?.has("VISUAL_IMPLANT") ? 1 : 0);

  const pastTpl = useExaminationTemplates({ type: "treatment-history", domain: "dental" });
  const findingsTpl = useExaminationTemplates({ type: "findings", domain: "dental" });
  const procTpl = useExaminationTemplates({ type: "procedures", domain: "dental" });
  const notesTpl = useExaminationTemplates({ type: "notes", domain: "dental" });
  const examTpl = useExaminationTemplates({ type: "examination", domain: "dental" });

  const toDentalRow = (e) => {
    const row = { name: e.name, surface_codes: e.surfaces, notes: e.notes || "" };
    if (e.since) row.since_date = e.since;
    if (e.status) row.status = e.status;
    return row;
  };
  const toProcedureRow = (e) => ({ ...toDentalRow(e), status: e.status || "PLANNED" });
  const applyDentalEntries = (kind, items = []) => {
    items.forEach((f) => {
      const visitProcedure =
        resolveVisitProcedure(f) ||
        ((kind === "procedure" || kind === "planned")
          ? resolveVisitProcedure(findProcedureCatalogItem(procedureItems, f.name))
          : undefined);
      state.onAddEntry({
        kind,
        name: f.name,
        surfaces: f.surface_codes || [],
        since: f.since_date || "",
        notes: f.notes || "",
        ...(kind === "planned" ? { status: f.status || "PLANNED" } : {}),
        ...(visitProcedure ? { visitProcedure } : {}),
      });
    });
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
      thumbnail={
        <TPMedicalIcon
          name={isGroupedScope ? "health-file-03" : "tooth"}
          variant="bulk"
          size={24}
          color="#9ca3af"
        />
      }
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
              // Support both new format (diagnoses array) and old __dx__ format
              const chipNames = ts.diagnoses?.length
                ? ts.diagnoses
                : history.filter((h) => h.notes === DX_MARKER).map((h) => h.name);
              const chipSet = new Set(chipNames);
              chipNames.forEach((name) => {
                // Find saved detail row in treatment_history for this chip
                const histEntry = history.find((h) => h.name === name);
                (state.onSetToothDiagnosis || state.onToggleToothDiagnosis)(name);
                const existing = state.currentTreatmentHistoryDetails?.[name];
                const visitProcedure =
                  resolveVisitProcedure(histEntry) ||
                  resolveVisitProcedure(findProcedureCatalogItem(procedureItems, name)) ||
                  existing?.visitProcedure;
                state.onUpdateTreatmentHistoryDetail?.(name, {
                  surfaces: histEntry?.surface_codes?.length ? histEntry.surface_codes :
                    existing?.surfaces?.length ? existing.surfaces : getDefaultTreatmentSurfaces(name),
                  since: histEntry?.since_date || existing?.since,
                  note: histEntry?.notes || existing?.note,
                  ...(visitProcedure ? { visitProcedure } : {}),
                });
              });
              
              // Only add non-chip entries as plain procedure entries to avoid duplicates
              applyDentalEntries("procedure", history.filter((h) => h.notes !== DX_MARKER && !chipSet.has(h.name)));
              applyDentalEntries("finding", ts.findings);
              applyDentalEntries("planned", ts.procedures);
              if (ts.overall_notes) state.onUpdateToothNotes(ts.overall_notes);
            });
          })}
          onDelete={examTpl.onDelete}
          onSaveNew={(name) => {
            const entries = state.currentToothEntries;
            const diagRows = Array.from(state.currentToothDiagnoses || []).map((n) => {
              const d = state.currentTreatmentHistoryDetails?.[n] ?? {};
              return toDentalRow({ name: n, surfaces: d.surfaces ?? [], notes: d.note ?? "", since: d.since ?? "" });
            });
            examTpl.onSaveNew(name, {
              dentition_type: state.patientType || "adult",
              tooth_states: [{
                tooth_code: String(state.selectedTooth?.fdi || ""),
                diagnoses: [...(state.currentToothDiagnoses || [])],
                findings: entries.filter((e) => e.kind === "finding").map(toDentalRow),
                procedures: entries.filter((e) => e.kind === "planned").map(toProcedureRow),
                treatment_history: [...diagRows, ...entries.filter((e) => e.kind === "procedure").map(toDentalRow)],
                overall_notes: state.currentToothNotes,
              }],
            });
          }}
          onUpdate={(sel) => {
            const entries = state.currentToothEntries;
            const diagRows = Array.from(state.currentToothDiagnoses || []).map((n) => {
              const d = state.currentTreatmentHistoryDetails?.[n] ?? {};
              return toDentalRow({ name: n, surfaces: d.surfaces ?? [], notes: d.note ?? "", since: d.since ?? "" });
            });
            examTpl.onUpdate(sel, {
              dentition_type: state.patientType || "adult",
              tooth_states: [{
                tooth_code: String(state.selectedTooth?.fdi || ""),
                diagnoses: [...(state.currentToothDiagnoses || [])],
                findings: entries.filter((e) => e.kind === "finding").map(toDentalRow),
                procedures: entries.filter((e) => e.kind === "planned").map(toProcedureRow),
                treatment_history: [...diagRows, ...entries.filter((e) => e.kind === "procedure").map(toDentalRow)],
                overall_notes: state.currentToothNotes,
              }],
            });
          }}
          btnClassName={ui.panelIconBtn}
        />
      }
      clearSection={
        <>
          <button
            type="button"
            title="Clear all data for this tooth"
            disabled={!hasAnyData}
            onClick={() => setShowClearConfirm(true)}
            className={ui.panelIconBtnDanger}>
            <Eraser color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
          </button>
          <TPConfirmDialog
            open={showClearConfirm}
            onOpenChange={setShowClearConfirm}
            analytics={{
              dialog_type: "tooth_clear_all",
              source_page: DENTAL_RX_PAD_ROUTE,
              source_action: "clear_all",
              primary_label: "No, Keep It",
              secondary_label: "Yes, Clear All",
            }}
            title={`Are you sure you want to clear all data for ${entityLabel}?`}
            warning={`This will remove all treatment history, findings, procedures, and notes for ${entityLabel} (${entityBadge}). This action cannot be undone.`}
            secondaryLabel="Yes, Clear All"
            secondaryTone="destructive"
            onSecondary={clearAllToothData}
            primaryLabel="No, Keep It"
          />
        </>
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
                        onSelect={(t) => pastTpl.applyTemplate(t, (full) => {
                          applyDentalEntries("procedure", full.payload?.treatment_history || []);
                        })}
                        onDelete={pastTpl.onDelete}
                        onSaveNew={(name) => {
                          const diagRows = Array.from(state.currentToothDiagnoses || []).map((n) => {
                            const d = state.currentTreatmentHistoryDetails?.[n] ?? {};
                            return toDentalRow({ name: n, surfaces: d.surfaces ?? [], notes: d.note ?? "", since: d.since ?? "" });
                          });
                          const entryRows = state.currentToothEntries.filter((e) => e.kind === "procedure").map(toDentalRow);
                          pastTpl.onSaveNew(name, { treatment_history: [...diagRows, ...entryRows] });
                        }}
                        onUpdate={(sel) => {
                          const diagRows = Array.from(state.currentToothDiagnoses || []).map((n) => {
                            const d = state.currentTreatmentHistoryDetails?.[n] ?? {};
                            return toDentalRow({ name: n, surfaces: d.surfaces ?? [], notes: d.note ?? "", since: d.since ?? "" });
                          });
                          const entryRows = state.currentToothEntries.filter((e) => e.kind === "procedure").map(toDentalRow);
                          pastTpl.onUpdate(sel, { treatment_history: [...diagRows, ...entryRows] });
                        }}
                        btnClassName={ui.secToolBtn}
                      />
                    : undefined
                }
                onClear={
                  activeSection === "procedures" ?
                    () => {
                      Array.from(state.currentToothDiagnoses || []).forEach((d) => state.onToggleToothDiagnosis(d));
                      state.onClearTreatmentHistoryDetails?.();
                      state.currentToothEntries?.
                        filter((e) => e.kind === "procedure").
                        forEach((e) => state.onRemoveEntry(e.id));
                    } :
                    undefined}

                clearDisabled={
                  diagnosisCount === 0 &&
                  procedureCount === 0 &&
                  treatmentDetailCount === 0}
                clearConfirmTitle="Are you sure you want to clear past procedures?"
                clearConfirmDesc={`This will remove all past procedures from this ${isGroupedScope ? "group" : "tooth"}. This action cannot be undone.`}

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
                clearConfirmTitle="Are you sure you want to clear findings?"
                clearConfirmDesc={`This will remove all findings from this ${isGroupedScope ? "group" : "tooth"}. This action cannot be undone.`}
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
                        onSaveNew={(name) => procTpl.onSaveNew(name, { procedures: state.currentToothEntries.filter((e) => e.kind === "planned").map(toProcedureRow) })}
                        onUpdate={(sel) => procTpl.onUpdate(sel, { procedures: state.currentToothEntries.filter((e) => e.kind === "planned").map(toProcedureRow) })}
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
                clearConfirmTitle="Are you sure you want to clear procedures?"
                clearConfirmDesc={`This will remove all procedures from this ${isGroupedScope ? "group" : "tooth"}. This action cannot be undone.`}
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
                clearConfirmTitle="Are you sure you want to clear notes?"
                clearConfirmDesc={`This will remove all notes from this ${isGroupedScope ? "group" : "tooth"}. This action cannot be undone.`}

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

