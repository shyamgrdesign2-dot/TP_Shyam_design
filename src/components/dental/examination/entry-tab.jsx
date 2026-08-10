import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Add, Trash, SearchNormal1 } from "iconsax-reactjs";
import { VISUAL_TYPE } from "../../../utils/dentalVisualTypes";
import { getDefaultTreatmentSurfaces, findProcedureCatalogItem, getProcedureLabel, resolveVisitProcedure } from "./types";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import { sortStringsForTypeahead } from "../lib/billing-catalog";
import { SinceDropdown } from "./examination-shared-ui";
import { SurfaceMultiSelect } from "./surface-pickers";
import { EditableNameCell, SurfaceCellDropdown } from "./entry-cells";
import { DENTAL_SYMPTOM_CATALOG } from "./symptoms-panel";
import ui from "./ExaminationTab.ui.module.scss";
import { useChikitsalay } from "../../../pages/chikitsalay/useChikitsalay";
export function EntryTab({ state, kind }) {
  const { activeSurfaceFindings, activeProcedures, activeSurfaces, procedureItems } = useDentalMasters();
  const isChikitsalayAccessable = useChikitsalay();
  const [activeCell, setActiveCell] = useState(null);
  const [query, setQuery] = useState("");
  // Portal Dropdown Search States
  const [searchOpen, setSearchOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const searchInputRef = useRef(null);
  const searchPopoverRef = useRef(null);
  // Tracks the Set we last passed to onSetMultiSelectZones so we can tell whether
  // we still "own" the shared multiSelectZones when our cell deactivates.
  const lastSetZonesSnapshotRef = useRef(null);
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
  const isMissing = state.currentToothVisualTypes?.has(VISUAL_TYPE.MISSING);
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


  const usesProcedureCatalog = kind === "procedure" || kind === "planned";
  const catalog =
    kind === "finding" ?
      isGroupedScope ? groupedFindingCatalog : activeSurfaceFindings :
      kind === "symptom" ?
        DENTAL_SYMPTOM_CATALOG :
        isGroupedScope
          ? groupedProcedureCatalog
          : usesProcedureCatalog
            ? procedureItems
            : activeProcedures;
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
  }, [state.multiSelectZones]);
  // Seed multiSelectZones when active row changes + toggle multi-select mode.
  useEffect(() => {
    if (!activeRow) {
      const snap = lastSetZonesSnapshotRef.current;
      lastSetZonesSnapshotRef.current = null;
      // Only clear shared multiSelect state if we are still the owner.
      // If another entry-tab has since called onSetMultiSelectZones (detected by
      // the current zones differing from our snapshot and being non-empty), skip —
      // clearing would corrupt the other tab's active surface picker.
      if (snap !== null) {
        const zs = state.multiSelectZones;
        const weOwnIt =
          zs.size === 0 ||
          (zs.size === snap.size && [...zs].every((z) => snap.has(z)));
        if (weOwnIt) {
          state.onClearMultiSelect();
          state.onClearSelectedZone?.();
          state.onSetMultiSelectActive(false);
        }
      }
      return;
    }
    lastSetZonesSnapshotRef.current = new Set(activeRow.surfaces);
    state.onSetMultiSelectZones(activeRow.surfaces);
    state.onSetMultiSelectActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSurfaceRowId]);
  // Deactivate multi-select mode on unmount (switching tabs away).
  useEffect(
    () => () => {
      state.onSetMultiSelectActive(false);
      state.onClearMultiSelect();
      state.onClearSelectedZone?.();
    },
    []
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredCatalog = useMemo(() => {
    const q = query.toLowerCase().trim();
    const selected = new Set(entries.map((e) => e.name.toLowerCase()));
    const pool = usesProcedureCatalog && !isGroupedScope
      ? (q
        ? catalog.filter((c) => getProcedureLabel(c).toLowerCase().includes(q))
        : catalog)
      : (q
        ? catalog.filter((c) => String(c).toLowerCase().includes(q))
        : catalog);
    const filtered = pool.filter(
      (c) => !selected.has(getProcedureLabel(c).toLowerCase()),
    );
    if (usesProcedureCatalog && !isGroupedScope) {
      const labels = filtered.map(getProcedureLabel);
      const sortedLabels = sortStringsForTypeahead(labels, query);
      const byLabel = new Map(filtered.map((item) => [getProcedureLabel(item), item]));
      return sortedLabels.map((label) => byLabel.get(label)).filter(Boolean).slice(0, 12);
    }
    const sorted = sortStringsForTypeahead(filtered, query);
    return sorted.slice(0, 12);
  }, [query, catalog, entries, usesProcedureCatalog, isGroupedScope]);
  const queryTrim = query.trim();
  const catalogHasExactName = queryTrim.length > 0 &&
    catalog.some((c) => getProcedureLabel(c).toLowerCase() === queryTrim.toLowerCase());

  const quickSelectChips = useMemo(() => {
    const selected = new Set(entries.map((e) => e.name.toLowerCase()));
    if (kind === "finding") {
      const defaults = isGroupedScope ? [
        "Generalized plaque accumulation",
        "Generalized gingival inflammation",
        "Quadrant-level calculus",
        "Widespread sensitivity",
      ] : [
        "Cavity/Caries",
        "Crack",
        "Fracture",
        "Sensitivity",
        "Plaque",
        "Calculus",
      ];
      const matchedChips = [];
      for (const defName of defaults) {
        const match = catalog.find(
          (c) => getProcedureLabel(c).toLowerCase() === defName.toLowerCase(),
        );
        if (match && !selected.has(getProcedureLabel(match).toLowerCase())) {
          matchedChips.push(match);
        }
      }
      if (matchedChips.length > 0) return matchedChips;
    }
    return catalog
      .filter((item) => !selected.has(getProcedureLabel(item).toLowerCase()))
      .slice(0, 8);
  }, [catalog, entries, isGroupedScope, kind]);
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
  const addEntryFromName = (nameOrItem) => {
    const name = getProcedureLabel(nameOrItem);
    const catalogItem = usesProcedureCatalog
      ? (typeof nameOrItem === "object" && nameOrItem !== null
        ? nameOrItem
        : findProcedureCatalogItem(procedureItems, name))
      : null;
    state.onClearMultiSelect();
    const surfaces = getDefaultTreatmentSurfaces(name);
    pendingActivateRef.current = true;
    const visitProcedure = isChikitsalayAccessable
      ? resolveVisitProcedure(catalogItem)
      : undefined;
    state.onAddEntry({
      kind,
      name,
      surfaces,
      since: undefined,
      plannedDate: undefined,
      status:
        kind === "procedure" || kind === "planned" ? "PLANNED" : undefined,
      notes: undefined,
      ...(visitProcedure ? { visitProcedure } : {}),
    });
    setQuery("");
    setSearchOpen(false);
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
                            const name = v.trim();
                            if (!name) return;
                            const match = usesProcedureCatalog
                              ? findProcedureCatalogItem(procedureItems, name)
                              : null;
                            const visitProcedure =
                              isChikitsalayAccessable && usesProcedureCatalog
                                ? resolveVisitProcedure(match)
                                : undefined;
                            state.onUpdateEntry(e.id, {
                              name,
                              ...(usesProcedureCatalog
                                ? { visitProcedure: visitProcedure || undefined }
                                : {}),
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
                            state.onClearSelectedZone?.();
                            clearCellActive(e.id, "surfaces");
                          }}
                          onToggleZone={state.onToggleZoneMultiSelect}
                          onHover={state.onSetHighlightZones}
                          multiSelectZones={state.multiSelectZones}
                          onClearSurfaces={state.onClearMultiSelect} />

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
                            value={e.status ?? "PLANNED"}
                            onChange={(ev) =>
                              state.onUpdateEntry(e.id, {
                                status: ev.target.value
                              })}

                            onFocus={() => setCellActive(e.id, "status")}
                            onBlur={() => clearCellActive(e.id, "status")}
                            className={ui.selectNative}>

                            <option value="PLANNED">Planned</option>
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="COMPLETED">Completed</option>
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
                            state.onSetHighlightZones([]);
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
                  const match = usesProcedureCatalog
                    ? findProcedureCatalogItem(procedureItems, queryTrim)
                    : catalog.find(
                      (c) => c.toLowerCase() === queryTrim.toLowerCase()
                    );
                  if (match) {
                    addEntryFromName(match);
                    setSearchOpen(false);
                  } else if (!catalogHasExactName) {
                    addEntryFromName(queryTrim);
                    setSearchOpen(false);
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
              (!isChikitsalayAccessable || filteredCatalog.length > 0) &&
              typeof document !== "undefined" &&
              (filteredCatalog.length > 0 || query.trim()) &&
              createPortal(
                <div
                  ref={searchPopoverRef}
                  className={ui.popover}
                  style={{
                    top: pos.top,
                    left: pos.left,
                    width: pos.width
                  }}>

                  {(kind === "planned" || kind === "procedure") &&
                    (filteredCatalog.length > 0 || query.trim()) &&
                    <div className={ui.popoverSectionHeader}>
                      <p className={ui.popoverSectionTitle}>Procedure</p>
                    </div>}

                  {filteredCatalog.map((c) =>
                    <button
                      type="button"
                      key={getProcedureLabel(c)}
                      onClick={() => addEntryFromName(c)}
                      className={ui.popoverItem}>

                      {getProcedureLabel(c)}
                    </button>
                  )}
                  {queryTrim && !catalogHasExactName &&
                    <button
                      className={ui.popoverAdd}
                      onClick={() => addEntryFromName(query.trim())}>

                      <span className={ui.popoverAddInner}>
                        <Add
                          size={14}
                          color="currentColor"
                          variant="Linear" />
                        {" "}
                        Add "{query.trim()}"
                      </span>

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
                  key={getProcedureLabel(chip)}
                  onClick={() => addEntryFromName(chip)}
                  className={ui.chipBtn}>

                  {getProcedureLabel(chip)}
                </button>
              )}
            </div>}

        </div>
      </div>
    </>);

}
