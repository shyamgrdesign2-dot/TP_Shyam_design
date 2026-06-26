import React, { useState, useEffect, useRef, useMemo } from "react";
import { Trash, Add, SearchNormal1 } from "iconsax-reactjs";
import { SymptomSurfacePicker, getSymId } from "./surface-pickers";
import ui from "./ExaminationTab.ui.module.scss";

export const DENTAL_SYMPTOM_CATALOG = [
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

export function DentalSymptomsBody({ rows, onUpdateRows, state }) {
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
                        fdi={state.selectedTooth.fdi}
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
