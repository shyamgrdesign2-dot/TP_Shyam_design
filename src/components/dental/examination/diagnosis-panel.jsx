import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Trash, Add, SearchNormal1 } from "iconsax-reactjs";
import { getDefaultTreatmentSurfaces } from "./types";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import { DiagnosisNameCell, SurfaceCellDropdown } from "./entry-cells";
import { SinceDropdown } from "./examination-shared-ui";
import ui from "./ExaminationTab.ui.module.scss";

const PRIMARY_DIAG_COLOR = {
  Implant: "#0891b2",
  Missing: "#dc2626",
  RCT: "#ea580c",
  Crown: "#d4af37",
  Bridge: "#a16207",
  Denture: "#ec4899",
  Extraction: "#b91c1c",
  "Composite Filling": "#f5f5f4",
  Scaling: "#059669",
  Polishing: "#10b981",
  Veneer: "#e2e8f0",
  "Pulp Cap": "#f97316",
  "Root Planing": "#0d9488",
  "Fluoride Treatment": "#06b6d4"
};

export function PrimaryDiagnosisBody({ state }) {
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
                <th className={ui.th}>WHEN</th>
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
