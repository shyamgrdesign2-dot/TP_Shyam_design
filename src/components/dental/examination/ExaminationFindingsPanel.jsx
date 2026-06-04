/**
 * ExaminationFindingsPanel — the single-tooth findings/procedures view extracted
 * from ExaminationTab. Owns the per-tooth clinical entry workflow:
 *   • SingleToothPanel    — tooth header + primary diagnosis + entry tabs + save
 *   • EntryTab            — shared builder + table for Findings and Procedures
 *   • DiagnosisNameCell / EditableNameCell / SurfaceCellDropdown / SurfaceMultiSelect /
 *     SurfaceDots         — table cell editors
 *   • SymptomSurfacePicker / DentalSymptomsBody — symptom workflow
 *   • PrimaryDiagnosisBody — tooth-level diagnosis section
 *
 * Shares AccordionWrap / SectionHeader / SinceDropdown with the oral panel via
 * examination-shared-ui (avoids a circular import back into ExaminationTab).
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import {
  InfoCircle,
  Trash,
  Eraser,
  Add,
  SearchNormal1
} from "iconsax-reactjs";
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
import {
  TOOTH_DIAGNOSES,
  ZONE_INFO,
  getZoneLabel,
  QUADRANT_LABELS,
  getDefaultTreatmentSurfaces
} from "./types";
import { MiniToothCanvas } from "./MiniToothCanvas";
import { MiniScopeCanvas } from "./MiniScopeCanvas";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import { useBillingCatalog } from "../lib/useBillingCatalog";
import {
  getUniqueDentalBillItems,
  mapApiBillItemToDentalCatalog,
  sortDentalBillItemsForSearch,
  sortStringsForTypeahead
} from "../lib/billing-catalog";
import { searchDentalBillItems } from "../../../pages/opdBilling/service";
import ServiceItemPopup from "../../../pages/opdBilling/components/serviceItemPopup/ServiceItemPopup";
import {
  AccordionWrap,
  SectionHeader,
  SinceDropdown
} from "./examination-shared-ui";
import ui from "./ExaminationTab.ui.module.scss";
import { PanelShell } from "./PanelShell";

/** Accent colors per tooth-level diagnosis — makes each chip visually distinct */
const PRIMARY_DIAG_COLOR = {
  Implant: "#0891b2",
  // cyan
  Missing: "#dc2626",
  // red
  RCT: "#ea580c",
  // orange
  Crown: "#d4af37",
  // gold
  Bridge: "#a16207",
  // amber-brown
  Denture: "#ec4899",
  // pink
  Extraction: "#b91c1c",
  // dark red (similar to missing)
  "Composite Filling": "#f5f5f4",
  // off-white (filling material)
  Scaling: "#059669",
  // emerald
  Polishing: "#10b981",
  // green
  Veneer: "#e2e8f0",
  // light porcelain
  "Pulp Cap": "#f97316",
  // orange
  "Root Planing": "#0d9488",
  // teal
  "Fluoride Treatment": "#06b6d4" // cyan-light
};
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
// ──────────────────────────────────────────────────────────────
// EntryTab — shared builder + table for Findings and Procedures
// ──────────────────────────────────────────────────────────────
function EntryTab({ state, kind }) {
  const { activeSurfaceFindings, activeProcedures, activeSurfaces } = useDentalMasters();
  const [activeCell, setActiveCell] = useState(null);
  const [query, setQuery] = useState("");
  const { items: billingItems, addItem: addBillingCatalogItem } = useBillingCatalog();
  const [serviceItemPopupOpen, setServiceItemPopupOpen] = useState(false);
  const [serviceItemPopupSeed, setServiceItemPopupSeed] = useState({
    name: "",
    type: "Dental_Service"
  });
  const [dentalBillSearchHits, setDentalBillSearchHits] = useState([]);
  const [dentalBillSearchLoading, setDentalBillSearchLoading] = useState(false);
  const usesDentalBillSearch = kind === "planned";
  // Portal Dropdown Search States
  const [searchOpen, setSearchOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const searchInputRef = useRef(null);
  const searchPopoverRef = useRef(null);
  useEffect(() => {
    if (!searchOpen) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = searchInputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: r.width
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [searchOpen, query]);
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target) &&
        searchPopoverRef.current &&
        !searchPopoverRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  const isMissing =
    state.currentToothDiagnoses.has("Missing") ||
    state.currentToothDiagnoses.has("Extraction");
  const isGroupedScope =
    state.selectionScopeType === "quadrant" ||
    state.selectionScopeType === "full-mouth" ||
    state.selectionScopeType === "arch";
  const groupedFindingCatalog = [
    "Generalized plaque accumulation",
    "Generalized gingival inflammation",
    "Quadrant-level calculus",
    "Generalized recession",
    "Generalized bleeding on probing",
    "Widespread sensitivity"];


  const groupedProcedureCatalog = [
    "Quadrant scaling and root planing",
    "Full-arch scaling and root planing",
    "Full-mouth scaling and polishing",
    "Oral prophylaxis",
    "Fluoride varnish (full arch)",
    "Desensitization therapy (quadrant)",
    "Periodontal maintenance"];


  const dentalProcedureNames = useMemo(() => {
    const unique = getUniqueDentalBillItems(billingItems);
    return sortStringsForTypeahead(
      unique.map((i) => i.name),
      ""
    );
  }, [billingItems]);
  const catalog =
    kind === "finding" ?
      isGroupedScope ?
        groupedFindingCatalog :
        activeSurfaceFindings :
      kind === "symptom" ?
        DENTAL_SYMPTOM_CATALOG :
        kind === "planned" ?
          (usesDentalBillSearch ? [] : dentalProcedureNames) :
          kind === "procedure" ?
            isGroupedScope ?
              groupedProcedureCatalog :
              activeProcedures :
            activeProcedures;
  const entries = state.currentToothEntries.filter((e) => e.kind === kind);
  const activeSurfaceRowId =
    activeCell?.colKey === "surfaces" ? activeCell.rowId : null;
  const activeRow = entries.find((e) => e.id === activeSurfaceRowId) ?? null;
  const setCellActive = useCallback((rowId, colKey) => {
    setActiveCell({
      rowId,
      colKey
    });
  }, []);
  const clearCellActive = useCallback((rowId, colKey) => {
    window.setTimeout(() => {
      setActiveCell((current) =>
        current && current.rowId === rowId && current.colKey === colKey ?
          null :
          current
      );
    }, 80);
  }, []);
  const isCellActive = useCallback(
    (rowId, colKey) =>
      activeCell?.rowId === rowId && activeCell?.colKey === colKey,
    [activeCell]
  );
  // Push multiSelectZones → active row.
  useEffect(() => {
    if (!activeRow) return;
    const zonesFromCanvas = Array.from(state.multiSelectZones);
    const same =
      zonesFromCanvas.length === activeRow.surfaces.length &&
      zonesFromCanvas.every((z) => activeRow.surfaces.includes(z));
    if (!same)
      state.onUpdateEntry(activeRow.id, {
        surfaces: zonesFromCanvas
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.multiSelectZones, activeSurfaceRowId]);
  // Seed multiSelectZones when active row changes + toggle multi-select mode.
  useEffect(() => {
    if (!activeRow) {
      state.onClearMultiSelect();
      state.onSetMultiSelectActive(false);
      return;
    }
    state.onSetMultiSelectZones(activeRow.surfaces);
    state.onSetMultiSelectActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSurfaceRowId]);
  // Deactivate multi-select mode on unmount (switching tabs away).
  useEffect(
    () => () => {
      state.onSetMultiSelectActive(false);
    },
    []
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredCatalog = useMemo(() => {
    const q = query.toLowerCase().trim();
    const selected = new Set(entries.map((e) => e.name.toLowerCase()));
    const pool = q ?
      catalog.filter((c) => c.toLowerCase().includes(q)) :
      catalog;
    const filtered = pool.filter((c) => !selected.has(c.toLowerCase()));
    const sorted = sortStringsForTypeahead(filtered, query);
    return sorted.slice(0, 12);
  }, [query, catalog, entries]);
  const queryTrim = query.trim();
  const catalogHasExactName = usesDentalBillSearch
    ? queryTrim.length > 0 &&
      dentalBillSearchHits.some(
        (i) => i?.name?.trim().toLowerCase() === queryTrim.toLowerCase()
      )
    : queryTrim.length > 0 &&
      catalog.some((c) => c.toLowerCase() === queryTrim.toLowerCase());

  useEffect(() => {
    if (!usesDentalBillSearch || !searchOpen) {
      if (!searchOpen) {
        setDentalBillSearchHits([]);
        setDentalBillSearchLoading(false);
      }
      return;
    }
    let cancelled = false;
    const debounceMs = queryTrim ? 300 : 0;
    const timer = window.setTimeout(async () => {
      setDentalBillSearchLoading(true);
      try {
        const hits = await searchDentalBillItems(queryTrim);
        if (!cancelled) setDentalBillSearchHits(hits);
      } catch {
        if (!cancelled) setDentalBillSearchHits([]);
      } finally {
        if (!cancelled) setDentalBillSearchLoading(false);
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [usesDentalBillSearch, queryTrim, searchOpen]);

  const plannedSearchRows = useMemo(() => {
    if (!usesDentalBillSearch) return [];
    const selected = new Set(entries.map((e) => e.name.toLowerCase()));
    const apiPool = sortDentalBillItemsForSearch(
      dentalBillSearchHits.filter(
        (i) =>
          i?.name &&
          !selected.has(String(i.name).trim().toLowerCase())
      ),
      queryTrim
    );
    return apiPool.slice(0, 50).map((item) => ({
      source: "api",
      name: item.name.trim(),
      item
    }));
  }, [usesDentalBillSearch, queryTrim, dentalBillSearchHits, entries]);

  const openDentalServiceItemPopup = (name) => {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return;
    setServiceItemPopupSeed({
      name: trimmed,
      type: "Dental_Service"
    });
    setServiceItemPopupOpen(true);
    setSearchOpen(false);
  };

  const quickSelectChips = useMemo(() => {
    if (kind === "planned") return [];
    const defaults =
      kind === "finding" ?
        isGroupedScope ?
          [
            "Generalized plaque accumulation",
            "Generalized gingival inflammation",
            "Quadrant-level calculus",
            "Widespread sensitivity"] :

          [
            "Cavity/Caries",
            "Crack",
            "Fracture",
            "Sensitivity",
            "Plaque",
            "Calculus"] :

        isGroupedScope ?
            [
              "Quadrant scaling and root planing",
              "Full-mouth scaling and polishing",
              "Oral prophylaxis",
              "Periodontal maintenance"] :

            [
              "RCT",
              "Restoration",
              "Extraction",
              "Scaling",
              "Polishing",
              "Crown Prep",
              "Implant Placement",
              "Veneer"];


    const selected = new Set(entries.map((e) => e.name.toLowerCase()));
    return defaults.filter(
      (name) => catalog.includes(name) && !selected.has(name.toLowerCase())
    );
  }, [catalog, entries, isGroupedScope, kind, dentalProcedureNames]);
  const pendingActivateRef = useRef(false);
  const prevCountRef = useRef(entries.length);
  useEffect(() => {
    if (pendingActivateRef.current && entries.length > prevCountRef.current) {
      const latest = entries[entries.length - 1];
      if (latest)
        setActiveCell({
          rowId: latest.id,
          colKey: "surfaces"
        });
      pendingActivateRef.current = false;
    }
    prevCountRef.current = entries.length;
  }, [entries.length, entries]);
  const addEntryFromName = (name) => {
    state.onClearMultiSelect();
    const surfaces = getDefaultTreatmentSurfaces(name);
    pendingActivateRef.current = true;
    state.onAddEntry({
      kind,
      name,
      surfaces,
      since: undefined,
      plannedDate: undefined,
      status:
        kind === "procedure" || kind === "planned" ? "planned" : undefined,
      notes: undefined
    });
    setQuery("");
  };

  const handleDentalBillItemSaved = (billItemRes) => {
    const catalogItem = mapApiBillItemToDentalCatalog(billItemRes);
    if (catalogItem) addBillingCatalogItem(catalogItem);
    if (billItemRes?.name) addEntryFromName(String(billItemRes.name).trim());
    setServiceItemPopupOpen(false);
  };

  if (isMissing) {
    return (
      <div className={ui.missingWrap}>
        <p className={ui.missingText}>
          Tooth marked as Missing — no surfaces to{" "}
          {kind === "finding" ? "examine" : "treat"}.
        </p>
      </div>);

  }
  const hasStatus = kind === "procedure" || kind === "planned";
  return (
    <>
      <div data-rx-module-root={true} className={ui.entryRoot}>
        {entries.length > 0 &&
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <colgroup>
                <col
                  style={{
                    width: 36,
                    minWidth: 36
                  }} />


                <col
                  style={{
                    minWidth: 150
                  }} />


                <col
                  style={{
                    width: 140,
                    minWidth: 120
                  }} />


                {(kind === "finding" || kind === "symptom") &&
                  <col
                    style={{
                      width: 120,
                      minWidth: 110
                    }} />}


                {hasStatus &&
                  <col
                    style={{
                      width: 120,
                      minWidth: 110
                    }} />}



                <col
                  style={{
                    minWidth: 120
                  }} />


                <col
                  style={{
                    width: 44,
                    minWidth: 44,
                    maxWidth: 44
                  }} />

              </colgroup>
              <thead>
                <tr className={ui.theadRow}>
                  <th className={ui.thCenter} />
                  <th className={ui.th}>NAME</th>
                  <th className={ui.th}>SURFACES</th>
                  {(kind === "finding" || kind === "symptom") &&
                    <th className={ui.th}>SINCE</th>}
                  {hasStatus && <th className={ui.th}>STATUS</th>}
                  <th className={ui.th}>NOTE</th>
                  <th className={ui.thSticky} />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isSurfaceActive = isCellActive(e.id, "surfaces");
                  const isDateActive = (kind === "finding" || kind === "symptom")
                    ? isCellActive(e.id, "since")
                    : false;
                  const isStatusActive = isCellActive(e.id, "status");
                  const isNoteActive = isCellActive(e.id, "note");
                  const activateSurfaceCell = () => {
                    setCellActive(e.id, "surfaces");
                    state.onSetMultiSelectZones(e.surfaces);
                    state.onSetMultiSelectActive(true);
                  };
                  return (
                    <tr
                      onMouseEnter={() => {
                        if (!isSurfaceActive)
                          state.onSetHighlightZones(e.surfaces);
                      }}
                      onMouseLeave={() => {
                        if (!isSurfaceActive) state.onSetHighlightZones([]);
                      }}
                      className={ui.tbodyRow}>

                      <td className={`${ui.td} ${ui.tdGrip}`}>
                        <span className={ui.gripIcon}>
                          <svg
                            width="8"
                            height="16"
                            viewBox="0 0 8 16"
                            fill="currentColor">

                            <circle cx="2" cy="3" r="1.2" />
                            <circle cx="2" cy="8" r="1.2" />
                            <circle cx="2" cy="13" r="1.2" />
                            <circle cx="6" cy="3" r="1.2" />
                            <circle cx="6" cy="8" r="1.2" />
                            <circle cx="6" cy="13" r="1.2" />
                          </svg>
                        </span>
                      </td>
                      <td
                        className={`${ui.td} ${ui.tdHover}`}
                        onClick={(ev) => ev.stopPropagation()}>

                        <EditableNameCell
                          value={e.name}
                          catalog={catalog}
                          onCommit={(v) => {
                            if (v.trim())
                              state.onUpdateEntry(e.id, {
                                name: v.trim()
                              });
                          }}
                          onFocusActivate={() => setCellActive(e.id, "name")} />

                      </td>
                      <td
                        className={`${ui.td} ${ui.tdRel} ${isSurfaceActive ? ui.tdActive : ui.tdHover
                          }`}
                        onClick={(ev) => ev.stopPropagation()}>

                        {isSurfaceActive ?
                          <span className={ui.cellFocusRing} /> :
                          null}
                        <SurfaceCellDropdown
                          entry={e}
                          arch={state.selectedTooth.arch}
                          toothPosition={state.selectedTooth.position}
                          mode={
                            kind === "finding" ?
                              "finding" :
                              kind === "symptom" ?
                                "symptom" :
                                "treatment"}

                          isActive={isSurfaceActive}
                          onActivate={activateSurfaceCell}
                          onDeactivate={() => {
                            if (state.selectedZone === "whole")
                              state.onClearSelectedZone();
                            clearCellActive(e.id, "surfaces");
                          }}
                          onToggleZone={state.onToggleZoneMultiSelect}
                          onHover={state.onSetHighlightZones}
                          multiSelectZones={state.multiSelectZones} />

                      </td>
                      {(kind === "finding" || kind === "symptom") &&
                        <td
                          className={`${ui.td} ${ui.tdRel} ${isDateActive ? ui.tdActive : ui.tdHover
                            }`}
                          onClick={(ev) => ev.stopPropagation()}>

                          {isDateActive ?
                            <span className={ui.cellFocusRing} /> :
                            null}
                          <SinceDropdown
                            value={e.since ?? ""}
                            onChange={(v) =>
                              state.onUpdateEntry(e.id, {
                                since: v || undefined
                              })}

                            onFocusActivate={() => setCellActive(e.id, "since")}
                            onBlurDeactivate={() =>
                              clearCellActive(e.id, "since")} />

                        </td>}
                      {hasStatus &&
                        <td
                          className={`${ui.td} ${ui.tdRel} ${isStatusActive ? ui.tdActive : ""
                            }`}
                          onClick={(ev) => ev.stopPropagation()}>

                          {isStatusActive ?
                            <span className={ui.cellFocusRing} /> :
                            null}
                          <select
                            value={e.status ?? "planned"}
                            onChange={(ev) =>
                              state.onUpdateEntry(e.id, {
                                status: ev.target.value
                              })}

                            onFocus={() => setCellActive(e.id, "status")}
                            onBlur={() => clearCellActive(e.id, "status")}
                            className={ui.selectNative}>

                            <option value="planned">Planned</option>
                            <option value="in-progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>}


                      <td
                        className={`${ui.td} ${ui.tdRel} ${isNoteActive ? ui.tdActive : ui.tdHover
                          }`}
                        onClick={(ev) => ev.stopPropagation()}>

                        {isNoteActive ?
                          <span className={ui.cellFocusRing} /> :
                          null}
                        <input
                          type="text"
                          value={e.notes ?? ""}
                          onChange={(ev) =>
                            state.onUpdateEntry(e.id, {
                              notes: ev.target.value
                            })}

                          onFocus={() => setCellActive(e.id, "note")}
                          onBlur={() => clearCellActive(e.id, "note")}
                          placeholder="e.g. Monitor at next visit"
                          className={ui.noteInput} />

                      </td>
                      <td
                        className={ui.tdStickyAct}
                        onClick={(ev) => ev.stopPropagation()}>

                        <button
                          type="button"
                          onClick={() => {
                            if (activeSurfaceRowId === e.id)
                              setActiveCell(null);
                            state.onRemoveEntry(e.id);
                          }}
                          title="Remove"
                          className={ui.removeRowBtn}>

                          <Trash
                            size={14}
                            color="currentColor"
                            variant="Linear" />

                        </button>
                      </td>
                    </tr>);

                })}
              </tbody>
            </table>
          </div>}


        <div
          className={`${entries.length > 0 ? ui.searchBlock : ui.searchBlockFirst
            }`}>

          <div className={ui.searchRel}>
            <span className={ui.searchIconAbs}>
              <SearchNormal1 size={14} color="currentColor" variant="Linear" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && queryTrim) {
                  if (kind === "planned") {
                    const apiMatch = plannedSearchRows[0];
                    if (apiMatch) {
                      if (apiMatch.item) {
                        const catalogItem = mapApiBillItemToDentalCatalog(apiMatch.item);
                        if (catalogItem) addBillingCatalogItem(catalogItem);
                      }
                      addEntryFromName(apiMatch.name);
                      setSearchOpen(false);
                    } else {
                      openDentalServiceItemPopup(queryTrim);
                    }
                  } else {
                    const match = catalog.find(
                      (c) => c.toLowerCase() === queryTrim.toLowerCase()
                    );
                    if (match) {
                      addEntryFromName(match);
                      setSearchOpen(false);
                    } else if (kind === "finding" && !catalogHasExactName) {
                      addEntryFromName(queryTrim);
                      setSearchOpen(false);
                    }
                  }
                }
              }}
              placeholder={
                kind === "finding" ?
                  isGroupedScope ?
                    "Search & Add Group Finding" :
                    "Search & Add Examination" :
                  kind === "symptom" ?
                    "Search & Add Symptom" :
                    kind === "planned" ?
                      isGroupedScope ?
                        "Search & Add Group Planned Procedure" :
                        "Search & Add Planned Procedure" :
                      isGroupedScope ?
                        "Search & Add Group Procedure" :
                        "Search & Add Procedure"}

              className={ui.searchInput} />


            {searchOpen &&
              pos &&
              typeof document !== "undefined" && (
                usesDentalBillSearch ?
                  true :
                  (filteredCatalog.length > 0 || query.trim())) &&
              createPortal(
                <div
                  ref={searchPopoverRef}
                  className={ui.popover}
                  style={{
                    top: pos.top,
                    left: pos.left,
                    width: pos.width
                  }}>

                  {(kind === "planned" || kind === "procedure") && (
                    usesDentalBillSearch ?
                      true :
                      (filteredCatalog.length > 0 || query.trim())) &&
                    <div className={ui.popoverSectionHeader}>
                      <p className={ui.popoverSectionTitle}>
                        {kind === "planned" ? "Dental service" : "Procedure"}
                      </p>
                    </div>}

                  {usesDentalBillSearch && dentalBillSearchLoading ?
                    <p className={ui.popoverSectionTitle} style={{ padding: "8px 12px" }}>
                      Searching dental services…
                    </p> :
                    null}

                  {usesDentalBillSearch && !dentalBillSearchLoading && plannedSearchRows.length === 0 ?
                    <p className={ui.popoverSectionTitle} style={{ padding: "8px 12px", color: "#94a3b8" }}>
                      {queryTrim ? "No dental services found" : "No dental services configured"}
                    </p> :
                    null}

                  {usesDentalBillSearch ?
                    plannedSearchRows.map((row) =>
                      <button
                        key={`${row.source}-${row.name}`}
                        type="button"
                        onClick={() => {
                          if (row.source === "api" && row.item) {
                            const catalogItem = mapApiBillItemToDentalCatalog(row.item);
                            if (catalogItem) addBillingCatalogItem(catalogItem);
                          }
                          addEntryFromName(row.name);
                          setSearchOpen(false);
                        }}
                        className={ui.popoverItem}>

                        {row.name}
                      </button>
                    ) :
                    filteredCatalog.map((c) =>
                      <button
                        type="button"
                        onClick={() => addEntryFromName(c)}
                        className={ui.popoverItem}>

                        {c}
                      </button>
                    )}
                  {queryTrim && !catalogHasExactName &&
                    <button
                      className={ui.popoverAdd}
                      onClick={() => {
                        if (kind === "planned") {
                          openDentalServiceItemPopup(query.trim());
                        } else {
                          addEntryFromName(query.trim());
                        }
                      }}>

                      {kind === "planned" ?
                        <span className={ui.popoverAddInner}>
                          <Add
                            size={16}
                            color="var(--tp-blue-600)"
                            variant="Bold" />


                          <span>
                            Add "{query.trim()}" as custom dental service
                          </span>
                        </span> :

                        <span className={ui.popoverAddInner}>
                          <Add
                            size={14}
                            color="currentColor"
                            variant="Linear" />
                          {" "}
                          Add "{query.trim()}"
                        </span>}

                    </button>}

                </div>,
                document.body
              )}
          </div>
          {query.length === 0 && quickSelectChips.length > 0 &&
            <div className={ui.chipRow}>
              {quickSelectChips.map((chip) =>
                <button
                  type="button"
                  onClick={() => addEntryFromName(chip)}
                  className={ui.chipBtn}>

                  {chip}
                </button>
              )}
            </div>}

        </div>
      </div>
      {kind === "planned" && serviceItemPopupOpen &&
        <ServiceItemPopup
          onCancel={() => setServiceItemPopupOpen(false)}
          editIndex={-1}
          item={serviceItemPopupSeed}
          dentalOnly
          onSaved={handleDentalBillItemSaved} />}


    </>);

}
// ──────────────────────────────────────────────────────────────
// SurfaceCellDropdown — in-cell dropdown with highlighted hint row
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// EditableNameCell — click to turn a name cell into an input + catalog dropdown
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// DiagnosisNameCell — editable diagnosis name w/ swap dropdown
// ──────────────────────────────────────────────────────────────
function DiagnosisNameCell({ name, color, activeRows, onSwap }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 200)
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);
  // Available diagnoses to swap to (exclude currently-active ones except self).
  const options = TOOTH_DIAGNOSES.filter(
    (d) => d === name || !activeRows.includes(d)
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);
  useEffect(() => {
    setHighlightIdx(0);
  }, [draft]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      setTimeout(() => {
        if (inputRef.current)
          inputRef.current.setSelectionRange(draft.length, draft.length);
      }, 0);
    }
  }, [editing, draft.length]);
  const filtered = useMemo(() => {
    const q = draft.toLowerCase().trim();
    if (!q) return options;
    return options.filter((c) => c.toLowerCase().includes(q));
  }, [draft, options]);
  const commit = (next) => {
    setEditing(false);
    setOpen(false);
    const trimmed = next.trim();
    if (trimmed && trimmed !== name) onSwap(trimmed); else
      setDraft(name);
  };
  // Suppress unused variable warning (color no longer rendered)
  void color;
  return (
    <div ref={wrapRef} className={ui.rel}>
      {!editing ?
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setOpen(true);
            setDraft(name);
          }}
          className={`${ui.diagToggleBtn} ${open ? ui.diagToggleOpen : ""}`}>

          <span className={ui.diagToggleLabel}>{name}</span>
        </button> :

        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const pick = filtered[highlightIdx];
              commit(pick ?? (draft.trim() || name));
            } else if (e.key === "Escape") {
              setEditing(false);
              setOpen(false);
              setDraft(name);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const totalItems =
                filtered.length + (
                  draft.trim().length > 0 &&
                    !options.some(
                      (o) => o.toLowerCase() === draft.trim().toLowerCase()
                    ) ?
                    1 :
                    0);
              setHighlightIdx((i) => Math.min(totalItems - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIdx((i) => Math.max(0, i - 1));
            }
          }}
          onBlur={() => { }}
          placeholder="Search & Add Diagnosis..."
          className={ui.nameComboInput} />}



      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            className={ui.portalList}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            {filtered.map((d, i) => {
              const isCurrent = d === name;
              const highlighted = i === highlightIdx;
              return (
                <li>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightIdx(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(d);
                    }}
                    className={`${ui.menuRowBtn} ${highlighted ? ui.menuRowBtnHi : ""
                      } ${isCurrent ? ui.menuRowStrong : ""
                      }`}>

                    <span className={ui.menuRowGrow}>{d}</span>
                    {isCurrent &&
                      <span className={ui.menuCurrentHint}>current</span>}

                  </button>
                </li>);

            })}
            {draft.trim().length > 0 &&
              !options.some(
                (o) => o.toLowerCase() === draft.trim().toLowerCase()
              ) &&
              <div className={ui.customAddMargin}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(draft.trim());
                  }}
                  onMouseEnter={() => setHighlightIdx(filtered.length)}
                  className={`${ui.customAddBtn} ${highlightIdx === filtered.length ? ui.customAddBtnHi : ""
                    }`}>

                  <Add size={12} color="currentColor" variant="Linear" />
                  Add custom: "{draft.trim()}"
                </button>
              </div>}

          </ul>,
          document.body
        )}
    </div>);

}
function EditableNameCell({ value, catalog, onCommit, onFocusActivate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  useEffect(() => {
    setHighlightIdx(0);
  }, [draft]);
  const filtered = useMemo(() => {
    const q = draft.toLowerCase().trim();
    if (!q) return catalog.slice(0, 8);
    return catalog.
      filter((c) => c.toLowerCase().includes(q) && c !== value).
      slice(0, 8);
  }, [draft, catalog, value]);
  const hasExactMatch = useMemo(
    () =>
      filtered.some((c) => c.toLowerCase() === draft.trim().toLowerCase()) ||
      catalog.some((c) => c.toLowerCase() === draft.trim().toLowerCase()),
    [filtered, catalog, draft]
  );
  const showCustom = draft.trim().length > 0 && !hasExactMatch;
  const totalItems = filtered.length + (showCustom ? 1 : 0);
  const commit = useCallback(
    (next) => {
      setEditing(false);
      setPos(null);
      const trimmed = next.trim();
      if (trimmed && trimmed !== value) onCommit(trimmed);
    },
    [value, onCommit]
  );
  useEffect(() => {
    if (!editing) return;
    const onDoc = (e) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        listRef.current &&
        !listRef.current.contains(e.target)) {
        commit(draft);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [editing, draft, commit]);
  useEffect(() => {
    if (!editing) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 200)
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [editing]);
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(totalItems - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (totalItems === 0 && !draft.trim()) return;
      if (totalItems === 0 && draft.trim()) commit(draft.trim()); else
        if (highlightIdx < filtered.length) commit(filtered[highlightIdx]); else
          commit(draft.trim()); // custom row
    } else if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
      setPos(null);
    }
  };
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setDraft(value);
          onFocusActivate?.();
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={ui.editIdleBtn}>

        <span className={ui.editIdleLabel}>{value}</span>
      </button>);

  }
  return (
    <div ref={wrapRef} className={ui.rel}>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search..."
        className={ui.nameComboInput} />


      {(filtered.length > 0 || showCustom) &&
        typeof document !== "undefined" &&
        pos &&
        createPortal(
          <div
            ref={listRef}
            className={ui.portalListWide}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            <ul>
              {filtered.map((c, i) => {
                const highlighted = i === highlightIdx;
                return (
                  <li>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        commit(c);
                      }}
                      onMouseEnter={() => setHighlightIdx(i)}
                      className={`${ui.menuRowBtn} ${highlighted ? ui.menuRowBtnHi : ""
                        }`}>

                      {c}
                    </button>
                  </li>);

              })}
            </ul>
            {showCustom &&
              <div className={ui.customAddMargin}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(draft.trim());
                  }}
                  onMouseEnter={() => setHighlightIdx(filtered.length)}
                  className={`${ui.customAddBtn} ${highlightIdx === filtered.length ? ui.customAddBtnHi : ""
                    }`}>

                  <Add size={12} color="currentColor" variant="Linear" />
                  Add custom: "{draft.trim()}"
                </button>
              </div>}

          </div>,
          document.body
        )}
    </div>);

}
function SurfaceCellDropdown({
  entry,
  arch,
  toothPosition,
  isActive,
  mode,
  onActivate,
  onDeactivate,
  onToggleZone,
  onHover,
  multiSelectZones
}) {
  const { activeSurfaces } = useDentalMasters();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const wasActiveRef = useRef(false);
  // Auto-open when this row becomes active (user just clicked a search chip).
  useEffect(() => {
    if (isActive && !wasActiveRef.current) setOpen(true);
    if (!isActive) setOpen(false);
    wasActiveRef.current = isActive;
  }, [isActive]);
  // Compute portal position when opened / on scroll / resize.
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 240)
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const a = anchorRef.current,
        p = popoverRef.current;
      const t = e.target;
      if (
        t?.tagName === "CANVAS" ||
        t?.closest("[data-dental-annotation-ui='true']") ||
        t?.closest("[data-surface-selector-ui='true']"))

        return;
      if (a && !a.contains(t) && p && !p.contains(t)) {
        setOpen(false);
        onDeactivate?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onDeactivate]);
  // When the dropdown is open AND this is the active row, what the user sees
  // mirrors multiSelectZones. When NOT active, show the entry's saved surfaces.
  const shown = isActive ? Array.from(multiSelectZones) : entry.surfaces;
  // Whole tooth = array containing 'whole'
  const isWholeTooth = shown.includes("whole");
  const toggle = (z) => {
    if (!isActive) {
      onActivate();
      return;
    }
    onToggleZone(z);
  };
  const clickWholeTooth = () => {
    if (!isActive) onActivate();
    onToggleZone("whole");
  };
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            onDeactivate?.();
            return;
          }
          onActivate();
          setOpen(true);
        }}
        className={ui.surfaceTriggerBtn}>

        <span className={ui.surfaceTriggerText}>
          {shown.length === 0 ?
            <span className={ui.surfacePlaceholder}>Select surface</span> :
            isWholeTooth ?
              <span className={ui.surfaceInlineRow}>
                <span
                  className={ui.surfaceDot8}
                  style={{
                    background: ZONE_INFO.whole.color
                  }} />

                Whole tooth
              </span> :

              <SurfaceDots
                surfaces={shown}
                arch={arch}
                toothPosition={toothPosition} />}


        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s"
          }}>

          <path
            d="M1 1L5 5L9 1"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round" />

        </svg>
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className={ui.surfacePopover}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            <div className={ui.surfacePopoverPad}>
              <div className={ui.surfaceHint}>
                <InfoCircle
                  size={13}
                  color="var(--tp-amber-700)"
                  variant="Bold" />


                <span className={ui.surfaceHintText}>
                  Tap the <span className={ui.surfaceHintBold}>3D tooth</span>{" "}
                  to select surfaces, or pick from the list below
                </span>
              </div>
            </div>
            <ul className={ui.surfaceZoneList}>
              <li>
                <button
                  type="button"
                  onClick={clickWholeTooth}
                  className={ui.surfaceZoneBtn}>

                  <span
                    className={`${ui.surfaceCheck} ${isWholeTooth ? ui.surfaceCheckOn : ""
                      }`}>

                    {isWholeTooth &&
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5L4 7L8 3"
                          stroke="#fff"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round" />

                      </svg>}

                  </span>
                  <span
                    className={ui.surfaceDot8}
                    style={{
                      background: ZONE_INFO.whole.color
                    }} />


                  <span
                    className={`${ui.surfaceMenuLabel} ${ui.surfaceMenuStrong}`}>

                    Whole tooth
                  </span>
                </button>
              </li>
              <li className={ui.surfaceListRule} />
              {activeSurfaces.filter((z) => z !== "whole").map((z) => {
                const checked = shown.includes(z);
                const label = getZoneLabel(z, arch, toothPosition);
                return (
                  <li>
                    <button
                      type="button"
                      onClick={() => toggle(z)}
                      onMouseEnter={() => onHover([z])}
                      onMouseLeave={() => onHover(shown)}
                      className={ui.surfaceZoneBtn}>

                      <span
                        className={`${ui.surfaceCheck} ${checked ? ui.surfaceCheckOn : ""
                          }`}>

                        {checked &&
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 10 10"
                            fill="none">

                            <path
                              d="M2 5L4 7L8 3"
                              stroke="#fff"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round" />

                          </svg>}

                      </span>
                      <span
                        className={ui.surfaceDot8}
                        style={{
                          background: ZONE_INFO[z].color
                        }} />


                      <span className={ui.surfaceMenuLabel}>{label}</span>
                    </button>
                  </li>);

              })}
            </ul>
          </div>,
          document.body
        )}
    </>);

}
function SurfaceMultiSelect({
  selected,
  arch,
  toothPosition,
  onToggle,
  onHover
}) {
  const { activeSurfaces } = useDentalMasters();
  return (
    <div className={ui.zoneChipsRow}>
      {activeSurfaces.map((z) => {
        const isActive = selected.includes(z);
        const label = getZoneLabel(z, arch, toothPosition);
        const color = ZONE_INFO[z].color;
        return (
          <button
            type="button"
            onClick={() => onToggle(z)}
            onMouseEnter={() => onHover([z])}
            onMouseLeave={() => onHover(selected)}
            className={`${ui.zoneChip} ${isActive ? ui.zoneChipOn : ui.zoneChipOff
              }`}>

            <span
              className={ui.surfaceDot8}
              style={{
                background: color
              }} />


            {label}
          </button>);

      })}
    </div>);

}
function SurfaceDots({ surfaces, arch, toothPosition }) {
  if (surfaces.length === 0) {
    return <span className={ui.dotsWholePill}>Whole tooth</span>;
  }
  const abbr = (z) => {
    const label = getZoneLabel(z, arch, toothPosition);
    return label[0];
  };
  const shown = surfaces.slice(0, 4);
  const overflow = surfaces.length - shown.length;
  const overflowTitle =
    overflow > 0 ?
      surfaces.
        slice(4).
        map((z) => getZoneLabel(z, arch, toothPosition)).
        join(", ") :
      undefined;
  return (
    <div className={ui.dotsRow}>
      {shown.map((z) =>
        <span
          title={getZoneLabel(z, arch, toothPosition)}
          className={ui.dotsAbbr}
          style={{
            background: ZONE_INFO[z].color
          }}>

          {abbr(z)}
        </span>
      )}
      {overflow > 0 &&
        <span title={overflowTitle} className={ui.dotsMore}>
          +{overflow}
        </span>}

    </div>);

}
const DENTAL_SYMPTOM_CATALOG = [
  "Tooth pain",
  "Sensitivity to cold",
  "Sensitivity to hot",
  "Sensitivity to sweet",
  "Throbbing pain",
  "Pain on biting",
  "Swelling",
  "Bleeding gums",
  "Bad breath",
  "Loose tooth",
  "Discolouration",
  "Difficulty chewing",
  "Jaw pain",
  "Clicking sound",
  "Food impaction",
  "Spontaneous pain"];


let _symId = 0;
const getSymId = () => `sym-${++_symId}`;
function SymptomSurfacePicker({
  surfaces,
  arch,
  toothPosition,
  mode = "symptom",
  onChange
}) {
  const { activeSurfaces } = useDentalMasters();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [pos, setPos] = useState(null);
  const selected = new Set(surfaces);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 200)
    });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const a = anchorRef.current,
        p = popoverRef.current,
        t = e.target;
      if (a && !a.contains(t) && p && !p.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const toggle = (z) => {
    if (z === "whole") {
      onChange(selected.has(z) ? [] : ["whole"]);
      return;
    }
    if (selected.has("whole")) {
      onChange([z]);
      return;
    }
    onChange(
      selected.has(z) ? surfaces.filter((s) => s !== z) : [...surfaces, z]
    );
  };
  const surfaceOptions = activeSurfaces.filter((z) => z !== "whole");
  const optionsList = mode === "symptom" ? activeSurfaces : ["whole", ...surfaceOptions];
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${ui.symTrigger} ${open ? ui.symTriggerOpen : ""}`}>

        <span className={ui.surfaceTriggerText}>
          {surfaces.length === 0 ?
            <span className={ui.symMuted}>Select surface</span> :
            surfaces.includes("whole") ?
              <span className={ui.surfaceInlineRow}>
                <span
                  className={ui.surfaceDot8}
                  style={{
                    background: "#94a3b8"
                  }} />

                Whole tooth
              </span> :

              <SurfaceDots
                surfaces={surfaces.filter((z) => z !== "whole")}
                arch={arch}
                toothPosition={toothPosition} />}


        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s"
          }}>

          <path
            d="M1 1l4 4 4-4"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round" />

        </svg>
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className={ui.surfacePopover}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            <ul className={ui.surfaceZoneList}>
              {optionsList.map((z, idx) => {
                let checked = selected.has(z);
                let label = getZoneLabel(z, arch, toothPosition);
                let color = ZONE_INFO[z]?.color || "#888";
                if (z === "whole") {
                  label = "Whole tooth";
                  color = "#64748b";
                  if (mode !== "treatment") {
                    checked = surfaceOptions.every((az) => selected.has(az));
                  }
                }
                return (
                  <React.Fragment key={z}>
                    <li>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          toggle(z);
                        }}
                        className={ui.surfaceZoneBtn}>

                        <span
                          className={`${ui.surfaceCheck} ${checked ? ui.surfaceCheckOn : ""
                            }`}>

                          {checked &&
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="none">

                              <path
                                d="M6 12l4.5 4.5L18 7.5"
                                stroke="#fff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round" />

                            </svg>}

                        </span>
                        <span
                          className={ui.surfaceDot8}
                          style={{
                            background: color
                          }} />


                        <span className={ui.surfaceMenuLabel}>{label}</span>
                      </button>
                    </li>
                    {z === "whole" && mode !== "symptom" &&
                      <li
                        aria-hidden={true}
                        style={{
                          height: 1,
                          background: "#e2e8f0",
                          margin: "4px 0",
                          listStyle: "none"
                        }} />}
                  </React.Fragment>);

              })}
            </ul>
          </div>,
          document.body
        )}
    </>);

}
function DentalSymptomsBody({ rows, onUpdateRows, state }) {
  const [query, setQuery] = useState("");
  const [activeRowId, setActiveRowId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchPopoverRef = useRef(null);
  useEffect(() => {
    if (!searchOpen) return;
    const onDoc = (e) => {
      const el = e.target;
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(el) &&
        searchPopoverRef.current &&
        !searchPopoverRef.current.contains(el)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [searchOpen]);
  const selectedNames = new Set(rows.map((r) => r.name.toLowerCase()));
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const pool = q ?
      DENTAL_SYMPTOM_CATALOG.filter((s) => s.toLowerCase().includes(q)) :
      DENTAL_SYMPTOM_CATALOG;
    return pool.filter((s) => !selectedNames.has(s.toLowerCase())).slice(0, 12);
  }, [query, selectedNames]);
  const symptomQueryTrim = query.trim();
  const symptomCatalogExact =
    symptomQueryTrim.length > 0 &&
    DENTAL_SYMPTOM_CATALOG.some(
      (s) => s.toLowerCase() === symptomQueryTrim.toLowerCase()
    );
  const symptomAlreadyAdded =
    symptomQueryTrim.length > 0 &&
    selectedNames.has(symptomQueryTrim.toLowerCase());
  const addSymptom = (name) => {
    onUpdateRows([
      ...rows,
      {
        id: getSymId(),
        name,
        surfaces: [],
        since: "",
        severity: "",
        note: ""
      }]
    );
    setQuery("");
    setSearchOpen(false);
  };
  const updateRow = (id, patch) => {
    onUpdateRows(
      rows.map((r) =>
        r.id === id ?
          {
            ...r,
            ...patch
          } :
          r
      )
    );
  };
  const removeRow = (id) => onUpdateRows(rows.filter((r) => r.id !== id));
  return (
    <div data-rx-module-root={true} className={ui.entryRoot}>
      {rows.length > 0 &&
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <colgroup>
              <col
                style={{
                  minWidth: 140
                }} />


              <col
                style={{
                  width: 140,
                  minWidth: 120
                }} />


              <col
                style={{
                  width: 100,
                  minWidth: 90
                }} />


              <col
                style={{
                  width: 140,
                  minWidth: 140
                }} />


              <col
                style={{
                  minWidth: 110
                }} />


              <col
                style={{
                  width: 44,
                  minWidth: 44,
                  maxWidth: 44
                }} />

            </colgroup>
            <thead>
              <tr className={ui.theadRow}>
                <th className={ui.thUpper}>NAME</th>
                <th className={ui.thUpper}>SURFACES</th>
                <th className={ui.thUpper}>SINCE</th>
                <th className={ui.thUpper}>SEVERITY</th>
                <th className={ui.thUpper}>NOTE</th>
                <th className={ui.thSticky} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isRowActive = activeRowId === r.id;
                return (
                  <tr
                    className={ui.tbodyRowInteractive}
                    onClick={() => setActiveRowId(isRowActive ? null : r.id)}>

                    <td className={ui.tdPlain}>
                      <span className={ui.symptomName}>{r.name}</span>
                    </td>
                    <td
                      className={ui.tdPlain}
                      onClick={(ev) => ev.stopPropagation()}>

                      <SymptomSurfacePicker
                        surfaces={r.surfaces}
                        arch={state.selectedTooth.arch}
                        toothPosition={state.selectedTooth.position}
                        onChange={(next) =>
                          updateRow(r.id, {
                            surfaces: next
                          })} />


                    </td>
                    <td className={ui.tdPlain}>
                      <input
                        type="text"
                        value={r.since}
                        onChange={(e) =>
                          updateRow(r.id, {
                            since: e.target.value
                          })}

                        placeholder="e.g. 5 days"
                        className={ui.symptomField} />

                    </td>
                    <td className={ui.tdPlain}>
                      <select
                        value={r.severity}
                        onChange={(e) =>
                          updateRow(r.id, {
                            severity: e.target.value
                          })}

                        className={`${ui.symptomSelect} ${r.severity ?
                            ui.symptomSelectFilled :
                            ui.symptomSelectEmpty
                          }`}>

                        <option value="" className={ui.optionMuted}>
                          e.g. Moderate
                        </option>
                        <option value="Mild">Mild</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                      </select>
                    </td>
                    <td className={ui.tdPlain}>
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) =>
                          updateRow(r.id, {
                            note: e.target.value
                          })}

                        placeholder="e.g. Worsens at night"
                        className={ui.symptomField} />

                    </td>
                    <td className={ui.tdStickyAct}>
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          removeRow(r.id);
                        }}
                        title="Remove"
                        className={ui.removeRowBtn}>

                        <Trash
                          size={14}
                          color="currentColor"
                          variant="Linear" />

                      </button>
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>}


      <div className={ui.searchBlockTop}>
        <div className={ui.searchRel}>
          <span className={ui.searchIconAbs}>
            <SearchNormal1 size={14} color="currentColor" variant="Linear" />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && symptomQueryTrim && !symptomAlreadyAdded)
                addSymptom(symptomQueryTrim);
            }}
            placeholder="Search & Add Dental Symptom"
            className={ui.searchInput14} />


          {searchOpen && (filtered.length > 0 || symptomQueryTrim) &&
            <div ref={searchPopoverRef} className={ui.popoverBelow}>
              {filtered.map((s) =>
                <button
                  type="button"
                  onClick={() => addSymptom(s)}
                  className={ui.popoverItem}>

                  {s}
                </button>
              )}
              {symptomQueryTrim &&
                !symptomCatalogExact &&
                !symptomAlreadyAdded &&
                <button
                  type="button"
                  className={ui.popoverAdd}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addSymptom(symptomQueryTrim)}>

                  <span className={ui.popoverAddInner}>
                    <Add size={14} color="currentColor" variant="Linear" />{" "}
                    Add "{symptomQueryTrim}"
                  </span>
                </button>}

            </div>}

        </div>
      </div>
    </div>);

}
function PrimaryDiagnosisBody({ state }) {
  const { activeToothDiagnoses } = useDentalMasters();
  const [activeCell, setActiveCell] = useState(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchPopoverRef = useRef(null);
  const [pos, setPos] = useState(null);
  // Auto-close search popover on outside click
  useEffect(() => {
    if (!searchOpen) {
      setPos(null);
      return;
    }
    const onDoc = (e) => {
      const el = e.target;
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(el) &&
        searchPopoverRef.current &&
        !searchPopoverRef.current.contains(el)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [searchOpen]);
  // Active diagnoses as "rows"
  const activeRows = useMemo(() => {
    const list = [];
    state.currentToothDiagnoses.forEach((d) => list.push(d));
    if (state.isImplant && !list.includes("Implant")) list.push("Implant");
    return list;
  }, [state.currentToothDiagnoses, state.isImplant]);
  const displayRows = useMemo(() => {
    const detailMap = state.currentTreatmentHistoryDetails ?? {};
    const keys = Object.keys(detailMap);
    const orphans = keys.
      filter((k) => !activeRows.includes(k)).
      sort((a, b) => a.localeCompare(b));
    return [...activeRows, ...orphans];
  }, [activeRows, state.currentTreatmentHistoryDetails]);
  const filteredCatalog = useMemo(() => {
    const q = query.toLowerCase().trim();
    const activeSet = new Set(activeRows.map((r) => r.toLowerCase()));
    const pool = q ?
      activeToothDiagnoses.filter((c) => c.toLowerCase().includes(q)) :
      activeToothDiagnoses;
    return pool.filter((c) => !activeSet.has(c.toLowerCase())).slice(0, 12);
  }, [query, activeRows]);
  const queryTrim = query.trim();
  const catalogHasExactName =
    queryTrim.length > 0 &&
    activeToothDiagnoses.some((d) => d.toLowerCase() === queryTrim.toLowerCase());
  const alreadyHasTypedTreatmentLabel =
    queryTrim.length > 0 &&
    displayRows.some((r) => r.toLowerCase() === queryTrim.toLowerCase());
  useEffect(() => {
    if (!searchOpen) return;
    const el = searchInputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: r.left,
      width: r.width
    });
  }, [searchOpen, filteredCatalog, query]);
  // Track most recently added diagnosis so we can auto-open its Since dropdown.
  const [lastAddedName, setLastAddedName] = useState(null);
  const addDiagnosis = (name) => {
    if (name === "Implant") state.onToggleImplant(); else
      state.onToggleToothDiagnosis(name);
    const existing = state.currentTreatmentHistoryDetails[name];
    state.onUpdateTreatmentHistoryDetail(name, {
      surfaces: existing?.surfaces?.length ?
        existing.surfaces :
        getDefaultTreatmentSurfaces(name),
      since: existing?.since,
      note: existing?.note
    });
    setActiveCell({
      rowId: name,
      colKey: "surfaces"
    });
    setLastAddedName(name);
    setQuery("");
    setSearchOpen(false);
  };
  const removeRow = (name) => {
    const isDiagnosisRow = activeRows.includes(name);
    state.onRemoveTreatmentHistoryDetail?.(name);
    if (isDiagnosisRow) {
      if (name === "Implant") state.onToggleImplant(); else
        state.onToggleToothDiagnosis(name);
    }
    if (activeCell?.rowId === name) setActiveCell(null);
  };
  useEffect(() => {
    if (activeCell?.rowId && !displayRows.includes(activeCell.rowId))
      setActiveCell(null);
  }, [activeCell, displayRows]);
  const activeRowName =
    activeCell?.colKey === "surfaces" &&
      activeCell.rowId &&
      displayRows.includes(activeCell.rowId) ?
      activeCell.rowId :
      null;
  const activeRowSurfaces = activeRowName ?
    state.currentTreatmentHistoryDetails[activeRowName]?.surfaces ?? [] :
    [];
  const clearCellActive = useCallback((rowId, colKey) => {
    window.setTimeout(() => {
      setActiveCell((current) =>
        current && current.rowId === rowId && current.colKey === colKey ?
          null :
          current
      );
    }, 80);
  }, []);
  const isCellActive = useCallback(
    (rowId, colKey) =>
      activeCell?.rowId === rowId && activeCell?.colKey === colKey,
    [activeCell]
  );
  useEffect(() => {
    if (!activeRowName) {
      state.onClearMultiSelect();
      state.onSetMultiSelectActive(false);
      return;
    }
    state.onSetMultiSelectZones(activeRowSurfaces);
    state.onSetMultiSelectActive(true);
  }, [activeRowName]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeRowName) return;
    const zonesFromCanvas = Array.from(state.multiSelectZones);
    const same =
      zonesFromCanvas.length === activeRowSurfaces.length &&
      zonesFromCanvas.every((zone) => activeRowSurfaces.includes(zone));
    if (!same) {
      state.onUpdateTreatmentHistoryDetail(activeRowName, {
        surfaces: zonesFromCanvas
      });
    }
  }, [activeRowName, activeRowSurfaces, state.multiSelectZones]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      state.onSetMultiSelectActive(false);
    },
    []
  ); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div data-rx-module-root={true} className={ui.entryRoot}>
      {displayRows.length > 0 &&
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <colgroup>
              <col
                style={{
                  width: 36,
                  minWidth: 36
                }} />


              <col
                style={{
                  minWidth: 120
                }} />


              <col
                style={{
                  width: 140,
                  minWidth: 120
                }} />


              <col
                style={{
                  width: 140,
                  minWidth: 120
                }} />


              <col
                style={{
                  minWidth: 140
                }} />


              <col
                style={{
                  width: 44,
                  minWidth: 44,
                  maxWidth: 44
                }} />

            </colgroup>
            <thead>
              <tr className={ui.theadRow}>
                <th className={ui.thCenter} />
                <th className={ui.th}>NAME</th>
                <th className={ui.th}>SURFACES</th>
                <th className={ui.th}>SINCE</th>
                <th className={ui.th}>NOTE</th>
                <th className={ui.thSticky} />
              </tr>
            </thead>
            <tbody>
              {displayRows.map((name) => {
                const isOrphanHistoryRow = !activeRows.includes(name);
                const color = PRIMARY_DIAG_COLOR[name] ?? "#4b4ad5";
                const d = state.currentTreatmentHistoryDetails[name] ?? {
                  since: "",
                  note: "",
                  surfaces: []
                };
                const isSurfaceActive = isCellActive(name, "surfaces");
                const isSinceActive = isCellActive(name, "since");
                const isNoteActive = isCellActive(name, "note");
                const activateSurfaceCell = () => {
                  setActiveCell({
                    rowId: name,
                    colKey: "surfaces"
                  });
                  state.onSetMultiSelectZones(d.surfaces ?? []);
                  state.onSetMultiSelectActive(true);
                };
                return (
                  <tr
                    onMouseEnter={() => {
                      if (!isSurfaceActive)
                        state.onSetHighlightZones(d.surfaces ?? []);
                    }}
                    onMouseLeave={() => {
                      if (!isSurfaceActive) state.onSetHighlightZones([]);
                    }}
                    className={ui.tbodyRow}>

                    {isOrphanHistoryRow ?
                      <td
                        className={`${ui.td} ${ui.tdGrip}`}
                        aria-hidden={true} /> :


                      <td className={`${ui.td} ${ui.tdGrip}`}>
                        <span className={ui.gripIcon}>
                          <svg
                            width="8"
                            height="16"
                            viewBox="0 0 8 16"
                            fill="currentColor">

                            <circle cx="2" cy="3" r="1.2" />
                            <circle cx="2" cy="8" r="1.2" />
                            <circle cx="2" cy="13" r="1.2" />
                            <circle cx="6" cy="3" r="1.2" />
                            <circle cx="6" cy="8" r="1.2" />
                            <circle cx="6" cy="13" r="1.2" />
                          </svg>
                        </span>
                      </td>}


                    {isOrphanHistoryRow ?
                      <td className={ui.tdPlain}>
                        <span className={ui.symptomName}>{name}</span>
                      </td> :

                      <td className={ui.tdPlain}>
                        <DiagnosisNameCell
                          name={name}
                          color={color}
                          activeRows={activeRows}
                          onSwap={(next) => {
                            if (next === name) return;
                            const currentDetails =
                              state.currentTreatmentHistoryDetails[name];
                            const nextDetails =
                              state.currentTreatmentHistoryDetails[next];
                            // Remove current, add next
                            if (name === "Implant") state.onToggleImplant(); else
                              state.onToggleToothDiagnosis(name);
                            if (next === "Implant") state.onToggleImplant(); else
                              state.onToggleToothDiagnosis(next);
                            state.onUpdateTreatmentHistoryDetail(next, {
                              surfaces: nextDetails?.surfaces?.length ?
                                nextDetails.surfaces :
                                currentDetails?.surfaces ??
                                getDefaultTreatmentSurfaces(next),
                              since:
                                nextDetails?.since ?? currentDetails?.since,
                              note: nextDetails?.note ?? currentDetails?.note
                            });
                            if (activeCell?.rowId === name)
                              setActiveCell({
                                rowId: next,
                                colKey: activeCell.colKey
                              });
                          }} />

                      </td>}


                    <td
                      className={`${ui.td} ${ui.tdRel} ${isSurfaceActive ? ui.tdActive : ""
                        }`}
                      onClick={(ev) => ev.stopPropagation()}>

                      {isSurfaceActive ?
                        <span className={ui.cellFocusRing} /> :
                        null}
                      <SurfaceCellDropdown
                        entry={{
                          id: name,
                          toothFdi: state.selectedTooth.fdi,
                          kind: "procedure",
                          name,
                          surfaces: d.surfaces ?? []
                        }}
                        arch={state.selectedTooth.arch}
                        toothPosition={state.selectedTooth.position}
                        mode="treatment"
                        isActive={isSurfaceActive}
                        onActivate={activateSurfaceCell}
                        onDeactivate={() => {
                          if (state.selectedZone === "whole")
                            state.onClearSelectedZone();
                          clearCellActive(name, "surfaces");
                        }}
                        onToggleZone={state.onToggleZoneMultiSelect}
                        onHover={state.onSetHighlightZones}
                        multiSelectZones={state.multiSelectZones} />

                    </td>
                    <td
                      className={`${ui.td} ${ui.tdRel} ${isSinceActive ? ui.tdActive : ""
                        }`}>

                      {isSinceActive ?
                        <span className={ui.cellFocusRing} /> :
                        null}
                      <SinceDropdown
                        value={d.since ?? ""}
                        onChange={(v) =>
                          state.onUpdateTreatmentHistoryDetail(name, {
                            since: v
                          })}

                        autoOpen={lastAddedName === name}
                        onFocusActivate={() =>
                          setActiveCell({
                            rowId: name,
                            colKey: "since"
                          })}

                        onBlurDeactivate={() => clearCellActive(name, "since")} />

                    </td>
                    <td
                      className={`${ui.td} ${ui.tdRel} ${isNoteActive ? ui.tdActive : ui.tdHover
                        }`}>

                      {isNoteActive ?
                        <span className={ui.cellFocusRing} /> :
                        null}
                      <input
                        type="text"
                        value={d.note ?? ""}
                        onChange={(e) =>
                          state.onUpdateTreatmentHistoryDetail(name, {
                            note: e.target.value
                          })}

                        onFocus={() =>
                          setActiveCell({
                            rowId: name,
                            colKey: "note"
                          })}

                        onBlur={() => clearCellActive(name, "note")}
                        placeholder="e.g. Monitor at next visit"
                        className={ui.primaryNoteInput} />

                    </td>
                    <td className={ui.tdStickyAct}>
                      <button
                        type="button"
                        onClick={() => removeRow(name)}
                        title="Remove"
                        className={ui.removeRowBtn}>

                        <Trash
                          size={14}
                          color="currentColor"
                          variant="Linear" />

                      </button>
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>}


      <div className={ui.searchBlockTop}>
        <div className={ui.searchRel}>
          <span className={ui.searchIconAbs}>
            <SearchNormal1 size={14} color="currentColor" variant="Linear" />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !queryTrim) return;
              const match = activeToothDiagnoses.find(
                (d) => d.toLowerCase() === queryTrim.toLowerCase()
              );
              if (match) {
                addDiagnosis(match);
                return;
              }
              if (!alreadyHasTypedTreatmentLabel) addDiagnosis(queryTrim);
            }}
            placeholder="Search & add past procedure"
            className={ui.searchInput} />


          {searchOpen &&
            pos && (
              filteredCatalog.length > 0 || queryTrim) &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                ref={searchPopoverRef}
                className={ui.portalListPlain}
                style={{
                  top: pos.top,
                  left: pos.left,
                  width: pos.width
                }}>

                {filteredCatalog.map((c) =>
                  <button
                    type="button"
                    onClick={() => addDiagnosis(c)}
                    className={ui.popoverItem}>

                    {c}
                  </button>
                )}
                {queryTrim &&
                  !catalogHasExactName &&
                  !alreadyHasTypedTreatmentLabel &&
                  <button
                    type="button"
                    className={ui.popoverAdd}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addDiagnosis(queryTrim)}>

                    <span className={ui.popoverAddInner}>
                      <Add size={14} color="currentColor" variant="Linear" />{" "}
                      Add "{queryTrim}"
                    </span>
                  </button>}

              </div>,
              document.body
            )}
        </div>
        {query.length === 0 &&
          <div className={ui.diagQuickChips}>
            {[
              "Implant",
              "RCT",
              "Missing",
              "Crown",
              "Bridge",
              "Denture",
              "Extraction"].
              map((chip) => {
                if (activeRows.includes(chip)) return null;
                return (
                  <button
                    type="button"
                    onClick={() => addDiagnosis(chip)}
                    className={ui.chipBtn}>

                    {chip}
                  </button>);

              })}
          </div>}

      </div>
    </div>);

}
