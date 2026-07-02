/**
 * AddProcedureDrawer — Add sub-procedures to a service.
 * Follows the examination procedures pattern: search → select → table with doctor/date/notes.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Trash2, Plus } from "lucide-react";
import { Calendar } from "iconsax-reactjs";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { usePlanContext } from "./plan-context";
import { DrawerHeader, PLAN_DRAWER_PANEL_CLASS } from "./plan-shared";
import { genId } from "./plan-types";
import { createPortal } from "react-dom";
import {
  getUniqueDentalBillItems,
  sortStringsForTypeahead } from
"../lib/billing-catalog";
import { useBillingCatalog } from "../lib/useBillingCatalog";
import { AddDentalBillItemDrawer } from "../AddDentalBillItemDrawer";
import styles from "./AddProcedureDrawer.module.scss";
const cx = (...classes) => classes.filter(Boolean).join(" ");
const DOCTORS = ["Dr. Sheela B R", "Dr. Shyam GR", "Dr. Riya Kapoor"];
export function AddProcedureDrawer() {
  const [searchParams] = useSearchParams();
  const { items: billingItems } = useBillingCatalog();
  const dentalNames = useMemo(() => {
    const unique = getUniqueDentalBillItems(billingItems);
    return sortStringsForTypeahead(
      unique.map((i) => i.name),
      ""
    );
  }, [billingItems]);
  const [customDentalOpen, setCustomDentalOpen] = useState(false);
  const [customDentalInitial, setCustomDentalInitial] = useState("");
  const { state, updateService, findService, findPlanForService, closeDrawer } = usePlanContext();
  const drawer = state.drawer;
  const isAdd = drawer.type === "add-procedure";
  const isEdit = drawer.type === "edit-procedure";
  const isOpen = isAdd || isEdit;
  const serviceId = isOpen ? drawer.serviceId : undefined;
  const procedureId = isEdit ? drawer.procedureId : undefined;
  const service = serviceId ? findService(serviceId) : undefined;
  const editingProcedure = procedureId ?
  service?.procedures?.find((p) => p.id === procedureId) :
  undefined;
  const [rows, setRows] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
  useEffect(() => {
    if (isOpen) {
      if (isEdit && editingProcedure) {
        setRows([
        {
          id: editingProcedure.id,
          name: editingProcedure.name,
          doctor: editingProcedure.doctor,
          date: editingProcedure.date,
          notes: editingProcedure.notes ?? "",
          status: editingProcedure.status ?? "in-progress"
        }]
        );
      } else {
        setRows([]);
      }
      setSearchQuery("");
      setSearchOpen(false);
    }
  }, [isOpen, isEdit, editingProcedure]);
  useEffect(() => {
    if (!isOpen) return;
    if (searchParams?.get("overlay") !== "procedure-search") return;
    setSearchQuery("Cr");
    setHighlightedIndex(0);
    setSearchOpen(true);
    searchRef.current?.focus();
  }, [isOpen, searchParams]);
  const filteredProcedures = useMemo(() => {
    const q = searchQuery.trim();
    const pool = dentalNames.filter(
      (p) => !q || p.toLowerCase().includes(q.toLowerCase())
    );
    return sortStringsForTypeahead(pool, q).slice(0, 25);
  }, [searchQuery, dentalNames]);
  const searchTrim = searchQuery.trim();
  const catalogHasExactName =
  searchTrim.length > 0 &&
  dentalNames.some((p) => p.toLowerCase() === searchTrim.toLowerCase());
  const showAddCustomProcedure = searchTrim.length > 0 && !catalogHasExactName;
  const listCount =
  filteredProcedures.length + (showAddCustomProcedure ? 1 : 0);
  useEffect(() => {
    if (!searchOpen || !searchRef.current) return;
    const rect = searchRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width
    });
  }, [searchOpen, searchQuery]);
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (searchRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);
  const addProcedure = (name) => {
    setRows((prev) => [
    ...prev,
    {
      id: genId("proc-row"),
      name,
      doctor: DOCTORS[0],
      date: "",
      notes: "",
      status: "not-started"
    }]
    );
    setSearchQuery("");
    setSearchOpen(false);
    searchRef.current?.focus();
  };
  const updateRow = (id, patch) => {
    setRows((prev) =>
    prev.map((r) =>
    r.id === id ?
    {
      ...r,
      ...patch
    } :
    r
    )
    );
  };
  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };
  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (listCount > 0)
      setHighlightedIndex((prev) => Math.min(prev + 1, listCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (listCount > 0) setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
      showAddCustomProcedure &&
      highlightedIndex === filteredProcedures.length)
      {
        setCustomDentalInitial(searchQuery.trim());
        setCustomDentalOpen(true);
        setSearchOpen(false);
      } else if (filteredProcedures[highlightedIndex]) {
        addProcedure(filteredProcedures[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };
  const handleSave = () => {
    if (!serviceId || rows.length === 0) return;
    const plan = findPlanForService(serviceId);
    if (!plan) return;
    const currentService = findService(serviceId);
    const subProcedures = currentService?.subProcedures ?? [];
    if (isEdit && procedureId) {
      const row = rows[0];
      updateService(plan.id, serviceId, {
        subProcedures: subProcedures.map((p) =>
          p.id === procedureId
            ? { ...p, name: row.name, date: row.date, doctor: row.doctor, notes: row.notes.trim() || undefined, status: row.status }
            : p
        ),
      });
    } else {
      updateService(plan.id, serviceId, {
        subProcedures: [
          ...subProcedures,
          ...rows.map((row) => ({
            id: genId("proc"),
            name: row.name,
            date: row.date,
            doctor: row.doctor,
            notes: row.notes.trim() || undefined,
            status: row.status,
          })),
        ],
      });
    }
    closeDrawer();
    setRows([]);
  };
  const blockProcedureSheetDismissFromPortals = (e) => {
    if (customDentalOpen) {
      e.preventDefault();
      return;
    }
    if (
    searchOpen &&
    dropdownRef.current &&
    e.target instanceof Node &&
    dropdownRef.current.contains(e.target))

    e.preventDefault();
  };
  return (
    <>
      <TPDrawer open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
        <TPDrawerContent
          side="right"
          size="lg"
          className={`${PLAN_DRAWER_PANEL_CLASS} ${styles.drawerPanel}`}
          onPointerDownOutside={blockProcedureSheetDismissFromPortals}
          onInteractOutside={blockProcedureSheetDismissFromPortals}
          onFocusOutside={(e) => {
            if (customDentalOpen) e.preventDefault();
          }}
          style={{
            background: "#F4F5F7"
          }}>

          <DrawerHeader
            title={isEdit ? "Edit Procedure" : "Add Procedures"}
            onClose={closeDrawer}
            action={
            <button
              type="button"
              onClick={handleSave}
              disabled={rows.length === 0}
              className={styles.primaryButton}>

                {isEdit ? "Save Procedure" : "Add Procedures"}
              </button>} />



          <div
            className={styles.drawerBody}
            style={{
              background: "#F4F5F7"
            }}>

            {service &&
            <div className={styles.serviceInfoBox}>
                <p className={styles.serviceTitle}>
                  {service.treatment}
                </p>
                <p className={styles.serviceSubtitle}>
                  {service.toothFdi === "full-mouth" ?
                "Full Mouth" :
                `T${service.toothFdi} — ${service.toothLabel}`}
                </p>
              </div>}


            <div className={styles.mainContainer}>
              {rows.length > 0 &&
              <div className={styles.tableContainer}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <colgroup>
                        <col
                        style={{
                          width: 36,
                          minWidth: 36
                        }} />


                        <col
                        style={{
                          minWidth: 180
                        }} />


                        <col
                        style={{
                          width: 170,
                          minWidth: 150
                        }} />


                        <col
                        style={{
                          width: 130,
                          minWidth: 120
                        }} />


                        <col
                        style={{
                          minWidth: 140
                        }} />


                        <col
                        style={{
                          width: 130,
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
                        <tr className={styles.tableHeadRow}>
                          <th className={styles.tableHeadCellEmpty} />
                          <th className={styles.tableHeadCell}>
                            Procedure
                          </th>
                          <th className={styles.tableHeadCell}>
                            Doctor
                          </th>
                          <th className={styles.tableHeadCell}>
                            Date
                          </th>
                          <th className={styles.tableHeadCell}>
                            Note
                          </th>
                          <th className={styles.tableHeadCell}>
                            Status
                          </th>
                          <th className={styles.tableHeadCellSticky} />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                        const isDoctorActive = isCellActive(row.id, "doctor");
                        const isDateActive = isCellActive(row.id, "date");
                        const isNoteActive = isCellActive(row.id, "note");
                        return (
                          <tr className={styles.tableRow}>
                              <td className={styles.tableCellDrag}>
                                <span className={styles.dragHandle}>
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
                              <td className={styles.tableCell}>
                                <div className={styles.cellInner}>
                                  <p className={styles.cellText}>
                                    {row.name}
                                  </p>
                                </div>
                              </td>
                              <td
                              className={cx(styles.tableCellWithState, styles.tableCell, isDoctorActive ? styles.cellActiveBg : "")}>

                                {isDoctorActive ?
                              <span className={styles.cellActiveIndicator} /> :
                              null}
                                <select
                                value={row.doctor}
                                onChange={(e) =>
                                updateRow(row.id, {
                                  doctor: e.target.value
                                })}

                                onFocus={() =>
                                setCellActive(row.id, "doctor")}

                                onBlur={() =>
                                clearCellActive(row.id, "doctor")}

                                className={styles.selectInput}>

                                  {DOCTORS.map((d) =>
                                <option value={d}>{d}</option>
                                )}
                                </select>
                              </td>
                              <td
                              className={cx(styles.tableCellWithState, styles.tableCell, isDateActive ? styles.cellActiveBg : styles.cellHoverBg)}>

                                {isDateActive ?
                              <span className={styles.cellActiveIndicator} /> :
                              null}
                                <div className={styles.dateInputWrapper}>
                                  {!row.date &&
                                <div className={styles.datePlaceholder}>
                                      <span className={styles.datePlaceholderText}>
                                        DD/MM/YYYY
                                      </span>
                                      <Calendar
                                    size={14}
                                    color="#94a3b8"
                                    variant="Linear" />

                                    </div>}


                                  <input
                                  type="date"
                                  value={row.date}
                                  onChange={(e) =>
                                  updateRow(row.id, {
                                    date: e.target.value
                                  })}

                                  onFocus={() =>
                                  setCellActive(row.id, "date")}

                                  onBlur={() =>
                                  clearCellActive(row.id, "date")}

                                  className={cx(styles.dateInput, row.date ? styles.dateInputFilled : styles.dateInputEmpty)} />

                                </div>
                              </td>
                              <td
                              className={cx(styles.noteCell, isNoteActive ? styles.cellActiveBg : styles.cellHoverBg)}>

                                {isNoteActive ?
                              <span className={styles.cellActiveIndicator} /> :
                              null}
                                <input
                                type="text"
                                value={row.notes}
                                onChange={(e) =>
                                updateRow(row.id, {
                                  notes: e.target.value
                                })}

                                onFocus={() => setCellActive(row.id, "note")}
                                onBlur={() => clearCellActive(row.id, "note")}
                                placeholder="e.g. Use RVG before obturation"
                                className={styles.textInput} />

                              </td>
                              <td className={styles.tableCell}>
                                <select
                                value={row.status}
                                onChange={(e) =>
                                updateRow(row.id, {
                                  status: e.target.value
                                })}

                                className={styles.statusSelect}>

                                  <option value="not-started">
                                    Not Started
                                  </option>
                                  <option value="in-progress">
                                    In Progress
                                  </option>
                                  <option value="completed">Completed</option>
                                  <option value="no-show">
                                    Patient No Show
                                  </option>
                                  <option value="not-interested">
                                    Patient Not Interested
                                  </option>
                                </select>
                              </td>
                              <td className={styles.tableCellSticky}>
                                <div className={styles.actionButtonWrapper}>
                                  <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  className={styles.deleteButton}>

                                    <Trash2 size={20} />
                                  </button>
                                </div>
                              </td>
                            </tr>);

                      })}
                      </tbody>
                    </table>
                  </div>
                </div>}


              {!isEdit &&
              <div
                className={`${styles.searchContainer} ${rows.length > 0 ? styles.searchContainerBorder : ""}`}>

                  <div className={styles.searchInputWrapper}>
                    <Search
                    size={16}
                    strokeWidth={1.5}
                    className={styles.searchIcon} />


                    <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(true);
                      setHighlightedIndex(0);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search procedures \u2014 e.g., Obturation, Crown Prep..."
                    className={styles.searchInput} />

                  </div>
                  {!searchOpen &&
                <div className={styles.suggestionsWrapper}>
                      {dentalNames.slice(0, 8).map((p) =>
                  <button
                    type="button"
                    onClick={() => addProcedure(p)}
                    className={styles.suggestionPill}>

                          {p}
                        </button>
                  )}
                    </div>}

                </div>}

            </div>
          </div>
        </TPDrawerContent>
        {!isEdit &&
        searchOpen &&
        mounted && (
        filteredProcedures.length > 0 || showAddCustomProcedure) &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 10001
            }}
            className={styles.dropdownMenu}>

              <div className={styles.dropdownInner}>
                <>
                  {filteredProcedures.map((p, i) =>
                <button
                  type="button"
                  onClick={() => addProcedure(p)}
                  className={cx(styles.dropdownItem, i === highlightedIndex ? styles.dropdownItemActive : styles.dropdownItemHover)}>

                      <p className={styles.dropdownItemText}>
                        {p}
                      </p>
                    </button>
                )}
                  {showAddCustomProcedure &&
                <button
                  type="button"
                  onClick={() => {
                    setCustomDentalInitial(searchQuery.trim());
                    setCustomDentalOpen(true);
                    setSearchOpen(false);
                  }}
                  className={cx(styles.dropdownAddCustom, highlightedIndex === filteredProcedures.length ? styles.dropdownAddCustomActive : styles.dropdownAddCustomHover)}>

                      <Plus
                    size={18}
                    strokeWidth={2}
                    className={styles.dropdownIcon} />


                      <span className={styles.dropdownAddCustomText}>
                        Add "{searchQuery.trim()}" as custom dental service
                      </span>
                    </button>}

                </>
              </div>
            </div>,
          document.body
        )}
      </TPDrawer>
      {mounted && typeof document !== "undefined" ?
      createPortal(
        <AddDentalBillItemDrawer
          open={customDentalOpen}
          onOpenChange={setCustomDentalOpen}
          initialName={customDentalInitial}
          onSaved={(item) => {
            addProcedure(item.name);
          }} />,


        document.body
      ) :
      null}
    </>);

}