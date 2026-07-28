/**
 * PlanServiceTable — Memoised service rows table for AddEditPlanDrawer.
 * Renders the colgroup/thead/tbody and the sticky totals bar.
 */
import { useRef, useState, useEffect, useCallback, memo } from "react";
import { Trash2 } from "lucide-react";
import { ArrowDown2 } from "iconsax-reactjs";
import { createPortal } from "react-dom";
import { formatINR, PlanSurfaceAbbrTags } from "./plan-shared";
import {
  SURFACE_OPTIONS,
  SURFACE_COLORS,
  SURFACE_ABBR,
} from "./plan-types";
import { ToothPicker } from "./ToothPicker";
import { computeDiscount } from "./lib/planFormHelpers";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import styles from "./AddEditPlanDrawer.module.scss";
import { useChikitsalay } from "../../../pages/chikitsalay/useChikitsalay";

// ─── SurfacePicker (portal-based dropdown to avoid clipping) ─────────────────

function SurfacePicker({ value, onChange, disabled }) {
  const isChikitsalayAccessable = useChikitsalay();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 260;
    const viewportWidth = window.innerWidth;
    let left = rect.left;
    if (left + dropdownWidth > viewportWidth - 12) {
      left = viewportWidth - dropdownWidth - 12;
    }
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left,
      zIndex: 10001,
      minWidth: dropdownWidth,
      pointerEvents: "auto",
    });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => openDropdown();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, openDropdown]);

  const toggle = (id) => {
    if (id === "whole") {
      onChange(value.includes("whole") ? [] : ["whole"]);
      return;
    }
    const selected = new Set(value);
    if (selected.has("whole")) selected.delete("whole");
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    onChange(Array.from(selected));
  };

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={styles.surfacePickerDropdown}
      data-tp-portal="true"
    >
      <div className={styles.surfacePickerInfo}>
        <div className={styles.surfacePickerInfoBox}>
          <span className={styles.surfacePickerInfoDot} />
          <span className={styles.surfacePickerInfoText}>
            Select whole tooth or mix individual surfaces
          </span>
        </div>
      </div>
      {SURFACE_OPTIONS.map((opt, index) => {
        const selected = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`${styles.surfacePickerItem} ${selected ? styles.selected : styles.unselected} ${index === 1 ? styles.divider : ""}`}
          >
            <span className={`${styles.checkbox} ${selected ? styles.checked : ""}`}>
              {selected ? (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5L4 7L8 3"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span
              className={styles.surfaceDot}
              style={{ background: SURFACE_COLORS[opt.id] }}
            />
            <span className={styles.surfaceLabel}>{opt.label}</span>
            <span className={styles.surfaceAbbr}>{opt.abbr}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          open ? setOpen(false) : openDropdown();
        }}
        className={styles.surfaceTrigger}
        disabled={isChikitsalayAccessable}
      >
        <span className={styles.surfaceTriggerText}>
          {value.length > 0 ? (
            <PlanSurfaceAbbrTags surfaces={value} gapClass="gap-[4px]" maxCount={3} />
          ) : (
            <span className={styles.surfacePlaceholder}>Select surface</span>
          )}
        </span>
        <ArrowDown2 size={14} color="currentColor" variant="Linear" />
      </button>
      {mounted && typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </>
  );
}

// ─── PlanServiceTable ─────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {object[]} props.rows - Service rows
 * @param {function} props.updateRow - (id, patch) => void
 * @param {function} props.removeRow - (id) => void
 * @param {object|null} props.activeCell - { rowId, colKey } | null
 * @param {function} props.setCellActive - (rowId, colKey) => void
 * @param {function} props.clearCellActive - (rowId, colKey) => void
 * @param {function} props.isCellActive - (rowId, colKey) => boolean
 */
function PlanServiceTableInner({
  rows,
  updateRow,
  removeRow,
  activeCell,
  setCellActive,
  clearCellActive,
  isCellActive,
}) {
  const isChikitsalayAccessable = useChikitsalay();
  if (rows.length === 0) return null;

  return (
    <div className={styles.tableWrapPad}>
      <div className={styles.tableShell}>
        <table className={styles.servicesTable}>
          <colgroup>
            <col style={{ width: 36, minWidth: 32 }} />
            <col style={{ minWidth: 160, maxWidth: 260 }} />
            <col style={{ width: 130, minWidth: 130 }} />
            <col style={{ width: 160, minWidth: 160 }} />
            <col style={{ width: 120, minWidth: 114 }} />
            <col style={{ minWidth: 160, maxWidth: 280 }} />
            <col style={{ width: 110, minWidth: 100 }} />
            <col style={{ width: 110, minWidth: 100 }} />
            <col style={{ width: 90, minWidth: 80 }} />
            <col style={{ width: 44, minWidth: 44, maxWidth: 44 }} />
          </colgroup>
          <thead>
            <tr className={styles.tableHeadRow}>
              <th className={styles.tableHeadCellCenterStickyLeft} />
              <th className={styles.tableHeadCellLeft}>Service</th>
              <th className={styles.tableHeadCellLeft}>Teeth</th>
              <th className={styles.tableHeadCellLeft}>Surfaces</th>
              <th className={styles.tableHeadCellLeftNarrow}>Surgery Date</th>
              <th className={styles.tableHeadCellLeftNarrow}>Notes</th>
              <th className={styles.tableHeadCellRight}>Rate/Tooth</th>
              <th className={styles.tableHeadCellRight}>Discount</th>
              <th className={styles.tableHeadCellRight}>Amount</th>
              <th className={styles.tableHeadCellSticky} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const teethCount = Math.max(1, row.teeth.length);
              const totalRate = row.rate * teethCount;
              const discAmt = computeDiscount(row, totalRate);
              const rowAmount = Math.max(0, totalRate - discAmt);
              const isDateActive = isCellActive(row.id, "date");
              const isNoteActive = isCellActive(row.id, "note");
              const isRateActive = isCellActive(row.id, "rate");
              const isDiscActive = isCellActive(row.id, "disc");
              return (
                <tr key={row.id} className={styles.tableBodyRow}>
                  <td className={styles.rowIndexCellStickyLeft}>{idx + 1}</td>
                  <td className={styles.tableCell}>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild={true}>
                        <div
                          className={styles.serviceNameWrap}
                          tabIndex={0}
                          aria-label={row.treatment}
                        >
                          <p className={styles.serviceNameText}>{row.treatment}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={6}
                        className={styles.serviceNameTooltip}
                      >
                        {row.treatment}
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className={styles.tableCell}>
                    <ToothPicker
                      value={row.teeth}
                      onChange={(teeth) => updateRow(row.id, { teeth })}
                      variant="inline"
                    />
                  </td>
                  <td className={styles.tableCell}>
                    <SurfacePicker
                      value={row.surfaces}
                      onChange={(surfaces) => updateRow(row.id, { surfaces })}
                    />
                  </td>
                  <td
                    className={`${styles.tableCellInteractive} ${isDateActive ? styles.cellActiveBg : styles.cellHoverBg}`}
                  >
                    {isDateActive ? (
                      <span className={styles.cellFocusRing} />
                    ) : null}
                    <div className={styles.cellInputWrap}>
                      {!row.procedureDate && (
                        <div className={styles.datePlaceholderWrap}>
                          <span className={styles.datePlaceholderText}>
                            DD/MM/YYYY
                          </span>
                        </div>
                      )}
                      <input
                        type="date"
                        value={row.procedureDate || ""}
                        onChange={(e) =>
                          updateRow(row.id, { procedureDate: e.target.value })
                        }
                        onFocus={() => setCellActive(row.id, "date")}
                        onBlur={() => clearCellActive(row.id, "date")}
                        className={`${styles.dateInput} ${row.procedureDate ? styles.dateInputFilled : styles.dateInputEmpty}`}
                      />
                    </div>
                  </td>
                  <td
                    className={`${styles.tableCellInteractive} ${isNoteActive ? styles.cellActiveBg : styles.cellHoverBg}`}
                  >
                    {isNoteActive ? (
                      <span className={styles.cellFocusRing} />
                    ) : null}
                    <input
                      type="text"
                      value={row.notes ?? ""}
                      onChange={(e) =>
                        updateRow(row.id, { notes: e.target.value })
                      }
                      onFocus={() => setCellActive(row.id, "note")}
                      onBlur={() => clearCellActive(row.id, "note")}
                      placeholder="Add notes..."
                      className={styles.noteInput}
                    />
                  </td>
                  <td
                    className={`${styles.tableCellInteractive} ${isRateActive ? styles.cellActiveBg : styles.cellHoverBg}`}
                  >
                    {isRateActive ? (
                      <span className={styles.cellFocusRing} />
                    ) : null}
                    <div className={styles.currencyInputWrap}>
                      <span className={styles.currencySymbol}>₹</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={row.rate ? String(row.rate) : ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          updateRow(row.id, {
                            rate:
                              v === ""
                                ? 0
                                : Math.min(parseInt(v, 10) || 0, 999999999),
                          });
                        }}
                        onFocus={() => setCellActive(row.id, "rate")}
                        onBlur={() => clearCellActive(row.id, "rate")}
                        className={styles.currencyInput}
                        disabled={isChikitsalayAccessable}
                      />
                    </div>
                  </td>
                  <td
                    className={`${styles.tableCellInteractive} ${isDiscActive ? styles.cellActiveBg : styles.cellHoverBg}`}
                  >
                    {isDiscActive && !isChikitsalayAccessable ? (
                      <span className={styles.cellFocusRing} />
                    ) : null}
                    <div className={styles.discountInputWrap}>
                      <button
                        type="button"
                        className={styles.discountTypeBtn}
                        onClick={() =>
                          updateRow(row.id, {
                            discountType:
                              row.discountType === "percentage" ? "flat" : "percentage",
                            discount: 0,
                          })
                        }
                        disabled={isChikitsalayAccessable}
                        title="Toggle discount type"
                      >
                        <span className={styles.discountTypeBtnSymbol}>
                          {row.discountType === "percentage" ? "%" : "₹"}
                        </span>
                        <svg
                          width="8"
                          height="12"
                          viewBox="0 0 8 12"
                          fill="none"
                          className={styles.discountTypeBtnArrows}
                        >
                          <path d="M1 4.5L4 1.5L7 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M1 7.5L4 10.5L7 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={row.discount ? String(row.discount) : ""}
                        disabled={isChikitsalayAccessable}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          const max =
                            row.discountType === "percentage" ? 100 : 999999999;
                          updateRow(row.id, {
                            discount:
                              v === ""
                                ? 0
                                : Math.min(parseInt(v, 10) || 0, max),
                          });
                        }}
                        onFocus={() => setCellActive(row.id, "disc")}
                        onBlur={() => clearCellActive(row.id, "disc")}
                        placeholder="0"
                        className={styles.discountInput}
                      />
                    </div>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.amountWrap}>
                      {formatINR(rowAmount)}
                    </div>
                  </td>
                  <td className={styles.tableStickyCell}>
                    <div className={styles.rowActionWrap}>
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className={styles.deleteBtn}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const PlanServiceTable = memo(PlanServiceTableInner);
