import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Add, Trash, SearchNormal1 } from "iconsax-reactjs";
import { getDefaultTreatmentSurfaces } from "./types";
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
import { SinceDropdown } from "./examination-shared-ui";
import { SurfaceMultiSelect } from "./surface-pickers";
import { EditableNameCell, SurfaceCellDropdown } from "./entry-cells";
import { DENTAL_SYMPTOM_CATALOG } from "./symptoms-panel";
import ui from "./ExaminationTab.ui.module.scss";
export function EntryTab({ state, kind }) {
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
        kind === "procedure" || kind === "planned" ? "PLANNED" : undefined,
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
