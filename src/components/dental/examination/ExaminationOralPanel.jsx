/**
 * ExaminationOralPanel — oral examination cluster extracted from ExaminationTab.
 *
 *   • OralPositionCell — multi-select dropdown for oral regions (internal)
 *   • OralTable        — findings / procedures table (internal)
 *   • OralExamPanel    — sidebar accordions (Findings, Past work, …)
 *   • OralRecordsList  — read-only summary card with counts & tags per section
 *
 * Shares AccordionWrap / SectionHeader / SinceDropdown with the findings cluster
 * via examination-shared-ui (avoids a circular import back into ExaminationTab).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash, Eraser, Add, SearchNormal1 } from "iconsax-reactjs";
import {
  oralPositionShort,
  reconcileOralPositions,
  ORAL_POSITION_LABEL,
  findProcedureCatalogItem,
  getProcedureLabel,
  resolveVisitProcedure,
} from "./types";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import { ExpandIcon } from "./ui-icons";
import { TPMedicalIcon, TPTooltip } from "../tp-ui";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import {
  DENTAL_MOENGAGE_EVENTS,
  trackDentalEvent,
} from "../../../utils/dentalMoengage";
import { DENTAL_RX_PAD_ROUTE } from "../../../utils/dentalRoutes";
import { useStickyActionEdge } from "./useStickyActionEdge";
import {
  AccordionWrap,
  SectionHeader,
  SinceDropdown
} from "./examination-shared-ui";
import ui from "./ExaminationTab.ui.module.scss";
import { PanelShell } from "./PanelShell";
import { ExaminationTemplateActions } from "./ExaminationTemplateActions";
import { useExaminationTemplates } from "./hooks/useExaminationTemplates";
import { useChikitsalay } from "../../../pages/chikitsalay/useChikitsalay";

/** Chikitsalay: Tooth regions allowlist (API codes + mapped internal ids). */
const CHIKITSALAY_TOOTH_REGION_IDS = new Set([
  "full_mouth", "FULL",
  "maxillary", "UPPER_ARCH",
  "mandibular", "LOWER_ARCH",
]);

// ──────────────────────────────────────────────────────────────
// OralPositionCell — multi-select dropdown for oral regions
// ──────────────────────────────────────────────────────────────
function OralPositionCell({ value = [], onChange, onHoverPreview, oralKind = "" }) {
  const { oralPositionGroups } = useDentalMasters();
  const isChikitsalayAccessable = useChikitsalay();
  const positionLabelMap = useMemo(
    () => Object.fromEntries(oralPositionGroups?.flatMap((g) => g.items.map((i) => [i.id, i.label])) || []),
    [oralPositionGroups]
  );
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [query, setQuery] = useState("");
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const searchRef = useRef(null);

  const scrollRef = useRef(null);
  const [scrollMetrics, setScrollMetrics] = useState({ thumbTop: 0, thumbH: 0, visible: false });

  const updateScrollMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setScrollMetrics((m) => (m.visible ? { thumbTop: 0, thumbH: 0, visible: false } : m));
      return;
    }
    const trackPad = 8;
    const trackH = clientHeight - trackPad * 2;
    const thumbH = Math.max(28, (clientHeight / scrollHeight) * trackH);
    const maxThumbTop = trackH - thumbH;
    const thumbTop = trackPad + ((scrollTop / Math.max(1, scrollHeight - clientHeight)) * maxThumbTop);
    setScrollMetrics({ thumbTop, thumbH, visible: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(updateScrollMetrics, 60);
    return () => clearTimeout(t);
  }, [open, query, updateScrollMetrics]);

  const normalizeDelta = useCallback((e) => {
    if (e.deltaMode === 1) return e.deltaY * 40;
    if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
    return e.deltaY;
  }, []);

  const handlePopupWheel = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const canScroll = scrollHeight > clientHeight + 1;
    const delta = normalizeDelta(e);
    const atTop    = scrollTop <= 0 && delta < 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && delta > 0;
    e.preventDefault();
    if (canScroll && !atTop && !atBottom) {
      el.scrollBy({ top: delta });
    } else {
      let parent = btnRef.current?.parentElement;
      while (parent && parent !== document.body) {
        const cs = getComputedStyle(parent);
        if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
          parent.scrollBy({ top: delta });
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, [normalizeDelta]);

  // Attach wheel listener as non-passive so preventDefault() actually works.
  // React onWheel is passive in React 17+ and cannot call preventDefault().
  useEffect(() => {
    if (!open || !pos) return;
    const el = popRef.current;
    if (!el) return;
    el.addEventListener('wheel', handlePopupWheel, { passive: false });
    return () => el.removeEventListener('wheel', handlePopupWheel);
  }, [open, pos, handlePopupWheel]);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const w = Math.min(440, Math.max(r.width, 360));
    const left = Math.max(8, Math.min(r.left, vw - w - 8));

    const SEARCH_H = 76; // search bar header approx height
    const FOOTER_H = 43; // Clear all footer row height
    const GAP = 4;
    const MARGIN = 8;
    const spaceBelow = vh - r.bottom - GAP - MARGIN;
    const spaceAbove = r.top - GAP - MARGIN;

    if (spaceBelow >= spaceAbove) {
      // More space below — open downward
      const maxScrollH = Math.max(80, Math.min(420, spaceBelow - SEARCH_H - FOOTER_H));
      setPos({ top: r.bottom + GAP, left, width: w, maxScrollH });
    } else {
      // More space above — flip upward
      const maxScrollH = Math.max(80, Math.min(420, spaceAbove - SEARCH_H - FOOTER_H));
      const popupH = maxScrollH + SEARCH_H + FOOTER_H;
      setPos({ top: Math.max(MARGIN, r.top - GAP - popupH), left, width: w, maxScrollH });
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    place();
    const t = setTimeout(() => searchRef.current?.focus(), 30);
    const onDoc = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const reposition = (ev) => {
      if (ev.target instanceof Node && scrollRef.current && scrollRef.current.contains(ev.target)) return;
      place();
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, place]);

  const sel = new Set(value);

  const toggle = (id) => {
    const arr = reconcileOralPositions(value, id);
    onChange(arr);
    onHoverPreview?.(arr);
    if (arr.length > value.length) {
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_LOCATION_SELECTED, {
        location_group: oralKind || "oral",
        region_id: id,
        region_label: ORAL_POSITION_LABEL[id] || positionLabelMap[id] || id,
        selection_count_after: arr.length,
        oral_kind: oralKind || "",
      });
    }
  };

  const shownPills = value;

  const tooltipTitle = value.length === 0 ? "" : value.map((v) => positionLabelMap[v] || v).join(", ");

  return (
    <>
      <TPTooltip title={tooltipTitle} arrow placement="top" enterDelay={250}>
        <button
          ref={btnRef}
          type="button"
          onClick={() => {
            const n = !open;
            setOpen(n);
            if (n) onHoverPreview?.(value);
          }}
          className={`${ui.surfaceTriggerBtn} ${open ? ui.surfaceTriggerActive : ""}`}>
          <span className={ui.surfaceTriggerText} style={{ minWidth: 0, flex: 1 }}>
            {value.length === 0 ? (
              <span className={ui.surfacePlaceholder}>Select area</span>
            ) : (
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, rowGap: 4, minWidth: 0 }}>
                {shownPills.map((v) => (
                  <span key={v} className={ui.pillStyle}>
                    {oralPositionShort(v, positionLabelMap)}
                  </span>
                ))}
              </span>
            )}
          </span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}>
            <path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </TPTooltip>

      {open && pos && typeof document !== "undefined" && createPortal(
        (() => {
          const q = query.trim().toLowerCase();
          const checkSvg = (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          );

          const renderRow = (it, caption) => {
            const on = sel.has(it.id);
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => toggle(it.id)}
                  onMouseEnter={() =>
                    onHoverPreview?.([
                      ...value.filter((v) => v !== it.id),
                      ...(sel.has(it.id) ? [] : [it.id])
                    ])
                  }
                  className={ui.surfaceZoneBtn}
                  style={{ padding: "8px 12px", gap: 10 }}>
                  <span className={`${ui.surfaceCheck} ${on ? ui.surfaceCheckOn : ""}`}>
                    {on && checkSvg}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.3, gap: 2 }}>
                    <span className={ui.surfaceMenuLabel} style={{ fontSize: 14, color: "#1e293b" }}>
                      {it.label}
                    </span>
                    {caption ? <span style={{ fontSize: 12, color: "#94a3b8" }}>{caption}</span> : null}
                  </span>
                </button>
              </li>
            );
          };

          const groupHead = (label) => (
            <div
              key={label}
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#64748b",
                padding: "8px 12px 4px"
              }}>
              {label}
            </div>
          );

          const filtered = oralPositionGroups
            .map((g) => ({
              group: g.group,
              items: g.items.filter((it) => {
                if (isChikitsalayAccessable && g.group === "Tooth regions") {
                  if (!CHIKITSALAY_TOOTH_REGION_IDS.has(it.id)) return false;
                }
                return !q || it.label.toLowerCase().includes(q);
              }),
            }))
            .filter((g) => g.items.length);

          return (
            <div
              ref={popRef}
              className={ui.surfacePopover}
              style={{ top: pos.top, left: pos.left, width: pos.width, display: "flex", flexDirection: "column", overflow: "hidden", position: "fixed", overscrollBehavior: "contain" }}>
              <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", background: "#f8fafc" }}>
                  <SearchNormal1 size={16} color="#94a3b8" variant="Linear" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search sites, regions, surfaces…"
                    style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#334155" }}
                  />
                  {query ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus();
                      }}
                      style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <div
                  ref={scrollRef}
                  onScroll={updateScrollMetrics}
                  className={ui.surfacePopoverScroll}
                  style={{ padding: "10px 4px", maxHeight: pos.maxScrollH ?? "min(460px, 60vh)", overflowY: "auto", overflowX: "hidden" }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                      No matching areas
                    </div>
                  ) : q ? (
                    <ul className={ui.surfaceZoneList} style={{ maxHeight: "none", overflow: "visible" }}>
                      {filtered.flatMap((g) => g.items.map((it) => renderRow(it, g.group)))}
                    </ul>
                  ) : (
                    <div style={{ columnCount: 2, columnGap: 8 }}>
                      {filtered.map((g) => (
                        <div key={`grp-${g.group}`} style={{ breakInside: "avoid", display: "block", marginBottom: 10, paddingInline: 8 }}>
                          {groupHead(g.group)}
                          <ul className={ui.surfaceZoneList} style={{ maxHeight: "none", overflow: "visible" }}>
                            {g.items.map((it) => renderRow(it))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {scrollMetrics.visible && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 8,
                      bottom: 8,
                      right: 4,
                      width: 6,
                      background: "var(--tp-slate-100, #f1f5f9)",
                      borderRadius: 999,
                      pointerEvents: "none"
                    }}
                  />
                )}
                {scrollMetrics.visible && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: scrollMetrics.thumbTop,
                      height: scrollMetrics.thumbH,
                      right: 4,
                      width: 6,
                      background: "var(--tp-slate-500, #64748b)",
                      borderRadius: 999,
                      pointerEvents: "none",
                      transition: "top 60ms linear"
                    }}
                  />
                )}
              </div>
              {value.length > 0 && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "8px 12px", display: "flex", justifyContent: "center", background: "#fff" }}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onChange([]); onHoverPreview?.([]); }}
                    style={{ border: "none", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 10px" }}>
                    Clear all
                  </button>
                </div>
              )}
            </div>
          );
        })(),
        document.body
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// OralTable — record/edit grid with quick-add chips for a given kind
// ──────────────────────────────────────────────────────────────
function OralTable({ state, kind, catalog = [], catalogItems = [], list = [] }) {
  const hasStatus = kind === "procedure";
  const { wrapRef, showEdge } = useStickyActionEdge(list.length);
  const isChikitsalayAccessable = useChikitsalay();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const inputRef = useRef(null);
  const popRef = useRef(null);

  // Same as EntryTab: attach visitProcedure only for procedure catalogs (past + planned)
  const usesProcedureCatalog = kind === "procedure" || kind === "past";

  const has = (name) => list.some((e) => e.name === name);
  const q = query.trim().toLowerCase();
  const available = catalog.filter((c) => !has(c));
  const quickChips = available.slice(0, 8);
  const matches = q ? available.filter((c) => c.toLowerCase().includes(q)).slice(0, 30) : [];
  const queryTrim = query.trim();

  const catalogExact = !!queryTrim && catalog.some((c) => c.toLowerCase() === q);
  const alreadyAdded = !!queryTrim && list.some((e) => e.name.toLowerCase() === q);
  const showAddCustom = !!queryTrim && !catalogExact && !alreadyAdded;
  const placeholder = kind === "finding"
    ? "Search & add oral finding"
    : kind === "past"
      ? "Search & add past procedure"
      : "Search & add oral procedure";

  const addAndClear = (nameOrItem, opts = {}) => {
    const name = getProcedureLabel(nameOrItem);
    if (!name) return;
    const catalogItem = usesProcedureCatalog
      ? (typeof nameOrItem === "object" && nameOrItem !== null
        ? nameOrItem
        : findProcedureCatalogItem(catalogItems, name))
      : null;
    const visitProcedure = isChikitsalayAccessable
      ? resolveVisitProcedure(catalogItem)
      : undefined;
    state.onAddOralEntry(kind, name, {
      ...(visitProcedure ? { visitProcedure } : {}),
    });
    if (opts.isCustom) {
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_CUSTOM_ENTRY_ADDED, {
        oral_kind: kind,
        location_group: "",
        region_count: 0,
        has_incidence: false,
        has_note: false,
      });
    }
    setQuery("");
    setSearchOpen(false);
  };

  const onAddCustom = () => {
    if (!queryTrim) return;
    setSearchOpen(false);
    addAndClear(queryTrim);
  };

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    place();
    const onDoc = (e) => {
      if (inputRef.current && inputRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setSearchOpen(false);
    };
    const rp = () => place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", rp, true);
    window.addEventListener("resize", rp);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", rp, true);
      window.removeEventListener("resize", rp);
    };
  }, [searchOpen, place]);

  const showDropdown = searchOpen;
  const displayItems = q ? matches : available.slice(0, 30);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 14px 12px" }}>
      {list.length > 0 && (
        <div ref={wrapRef} className={`${ui.tableWrap} ${showEdge ? ui.scrolledEdge : ""}`}>
          <table className={ui.table}>
            <colgroup>
              <col style={{ minWidth: 150 }} />
              <col style={{ width: 220, minWidth: 200 }} />
              <col style={{ width: 120, minWidth: 110 }} />
              <col style={{ minWidth: 130 }} />
              <col style={{ width: 44, minWidth: 44, maxWidth: 44 }} />
            </colgroup>
            <thead>
              <tr className={ui.theadRow}>
                <th className={ui.th}>NAME</th>
                <th className={ui.th}>AREA</th>
                <th className={ui.th}>{kind === "past" ? "WHEN" : hasStatus ? "STATUS" : "SINCE"}</th>
                <th className={ui.th}>NOTE</th>
                <th className={ui.thSticky} />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className={ui.tbodyRow}>
                  <td className={ui.tdPlain}>
                    <span className={ui.symptomName}>{e.name}</span>
                  </td>
                  <td className={ui.tdPlain}>
                    <OralPositionCell
                      value={e.surfaces || []}
                      onChange={(arr) => state.onUpdateOralEntry(e.id, { surfaces: arr })}
                      onHoverPreview={(arr) => state.onSetOralHighlight?.(arr)}
                      oralKind={kind}
                    />
                  </td>
                  <td className={ui.tdPlain}>
                    {hasStatus ? (
                      <select
                        value={e.status ?? "PLANNED"}
                        onChange={(ev) => state.onUpdateOralEntry(e.id, { status: ev.target.value })}
                        className={ui.selectNative}>
                        <option value="PLANNED">Planned</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    ) : (
                      <SinceDropdown
                        value={e.since || ""}
                        onChange={(v) => state.onUpdateOralEntry(e.id, { since: v })}
                      />
                    )}
                  </td>
                  <td className={ui.tdPlain}>
                    <input
                      type="text"
                      value={e.note || ""}
                      onChange={(ev) => state.onUpdateOralEntry(e.id, { note: ev.target.value })}
                      placeholder="Add note…"
                      className={ui.symptomField}
                    />
                  </td>
                  <td className={ui.tdStickyAct}>
                    <button
                      type="button"
                      onClick={() => state.onRemoveOralEntry(e.id)}
                      title="Remove"
                      className={ui.removeRowBtn}>
                      <Trash size={20} color="currentColor" strokeWidth={1.5} variant="Linear" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={ui.searchRel}>
        <span className={ui.searchIconAbs}>
          <SearchNormal1 size={14} color="currentColor" variant="Linear" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(ev) => {
            setQuery(ev.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && q) {
              const exact = catalog.find((c) => c.toLowerCase() === q);
              addAndClear(exact || query.trim());
            } else if (ev.key === "Escape") {
              setSearchOpen(false);
            }
          }}
          placeholder={placeholder}
          className={ui.searchInput}
        />
      </div>

      {showDropdown && pos && (!isChikitsalayAccessable || displayItems.length > 0) && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
            maxHeight: 260,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(2,6,23,0.22)",
            padding: 6
          }}>
          {displayItems.length > 0 ? (
            displayItems.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addAndClear(name)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "12.5px",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "#334155",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}>
                {name}
              </button>
            ))
          ) : (
            !showAddCustom && (
              <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 10px", fontFamily: "Inter, sans-serif" }}>
                No matches
              </div>
            )
          )}
          {showAddCustom && (
            <button
              type="button"
              className={ui.popoverAdd}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onAddCustom}>
              <span className={ui.popoverAddInner}>
                <Add size={14} color="currentColor" variant="Linear" /> Add "{queryTrim}"
              </span>
            </button>
          )}
        </div>,
        document.body
      )}

      {quickChips.length > 0 && (
        <div className={ui.chipRow}>
          {quickChips.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addAndClear(name)}
              className={ui.chipBtn}>
              {name}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// OralExamPanel — sidebar accordions for Findings, Past work, etc.
// ──────────────────────────────────────────────────────────────
export function OralExamPanel({ state, onSave, saving }) {
  const { activeOralProcedures, oralProcedureItems, activeOralSurfaceFindings } = useDentalMasters();
  const entries = Array.isArray(state.oralEntries) ? state.oralEntries : [];
  const pastProcedures = entries.filter((e) => e.kind === "past");
  const findings = entries.filter((e) => e.kind === "finding");
  const procedures = entries.filter((e) => e.kind === "procedure");
  const notes = state.oralNotes || "";
  const [activeSection, setActiveSection] = useState("past");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const hasAnyData = entries.length > 0 || notes.trim().length > 0;

  const pastTpl = useExaminationTemplates({ type: "treatment-history", domain: "oral" });
  const findingsTpl = useExaminationTemplates({ type: "findings", domain: "oral" });
  const procTpl = useExaminationTemplates({ type: "procedures", domain: "oral" });
  const notesTpl = useExaminationTemplates({ type: "notes", domain: "oral" });
  const examTpl = useExaminationTemplates({ type: "examination", domain: "oral" });

  const applyOralEntries = useCallback((kind, items = []) => {
    items.forEach((f) =>
      state.onAddOralEntry(kind, f.name, {
        surfaces: f.area || [],
        since: f.since_date || f.procedure_date || "",
        note: f.notes || "",
      })
    );
  }, [state]);

  const toOralRow = (e) => {
    const row = { name: e.name, area: e.surfaces, notes: e.note || "" };
    if (e.since) row.since_date = e.since;
    return row;
  };

  const toProcedureRow = (e) => ({
    name: e.name,
    area: e.surfaces,
    notes: e.note || "",
    status: e.status || "PLANNED",
  });

  useEffect(() => () => {
    state.onSetOralHighlight?.([]);
  }, []);

  const jumpTo = (id) => {
    if (activeSection === id) setActiveSection(null);
    else setActiveSection(id);
  };

  const clearAll = () => {
    const cleared = entries.length;
    entries.forEach((e) => state.onRemoveOralEntry(e.id));
    state.onUpdateOralNotes?.("");
    setShowClearConfirm(false);
    trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_CLEAR_ALL_CONFIRMED, {
      entries_cleared_count: cleared,
      had_oral_notes: notes.trim().length > 0,
    });
  };

  return (
    <PanelShell
      thumbnail={
        <TPMedicalIcon
          name="health-file-03"
          variant="bulk"
          size={32}
          color="#cbd5e1"
        />
      }
      title="Oral Examination"
      titleStyle={{ overflow: "visible", maxWidth: "none" }}
      onSave={onSave}
      saveDisabled={saving}
      onClose={() => state.onBackToDentition()}
      templateSection={
        <ExaminationTemplateActions
          title="Oral Examination Templates"
          templates={examTpl.templates}
          saving={examTpl.saving}
          hasData={hasAnyData}
          onSelect={(t) => examTpl.applyTemplate(t, (full) => {
            const p = full.payload || {};
            applyOralEntries("past", p.treatment_history);
            applyOralEntries("finding", p.findings);
            applyOralEntries("procedure", p.procedures);
            if (p.overall_notes) state.onUpdateOralNotes?.(p.overall_notes);
          })}
          onDelete={examTpl.onDelete}
          onSaveNew={(name) => examTpl.onSaveNew(name, {
            findings: findings.map(toOralRow),
            procedures: procedures.map(toProcedureRow),
            treatment_history: pastProcedures.map(toOralRow),
            overall_notes: notes,
          })}
          onUpdate={(sel) => examTpl.onUpdate(sel, {
            findings: findings.map(toOralRow),
            procedures: procedures.map(toProcedureRow),
            treatment_history: pastProcedures.map(toOralRow),
            overall_notes: notes,
          })}
          btnClassName={ui.panelIconBtn}
          oralSection="examination"
        />
      }
      clearSection={
        <>
          <button
            type="button"
            title="Clear all oral examination data"
            disabled={!hasAnyData}
            onClick={() => {
              trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_CLEAR_ALL_CLICKED, {
                oral_exam_count_total: entries.length,
                has_oral_notes: notes.trim().length > 0,
              });
              setShowClearConfirm(true);
            }}
            className={ui.panelIconBtnDanger}>
            <Eraser color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
          </button>
          <TPConfirmDialog
            open={showClearConfirm}
            onOpenChange={setShowClearConfirm}
            analytics={{
              dialog_type: "oral_clear_all",
              source_page: DENTAL_RX_PAD_ROUTE,
              source_action: "clear_all",
              primary_label: "No, Keep It",
              secondary_label: "Yes, Clear All",
            }}
            title="Are you sure you want to clear oral examination?"
            warning="This will remove all oral findings, procedures, and notes from this visit. This action cannot be undone."
            secondaryLabel="Yes, Clear All"
            secondaryTone="destructive"
            onSecondary={clearAll}
            primaryLabel="No, Keep It"
          />
        </>
      }>
        <AccordionWrap
          open={activeSection === "past"}
          fitContent
          onExpand={() => jumpTo("past")}
          header={
            <SectionHeader
              title="Past Procedures"
              count={pastProcedures.length}
              medicalIcon="clipboard-activity"
              templateActions={
                activeSection === "past"
                  ? <ExaminationTemplateActions
                      title="Past Procedures Templates"
                      templates={pastTpl.templates}
                      saving={pastTpl.saving}
                      hasData={pastProcedures.length > 0}
                      onSelect={(t) => pastTpl.applyTemplate(t, (full) => applyOralEntries("past", full.payload?.treatment_history))}
                      onDelete={pastTpl.onDelete}
                      onSaveNew={(name) => pastTpl.onSaveNew(name, { treatment_history: pastProcedures.map(toOralRow) })}
                      onUpdate={(sel) => pastTpl.onUpdate(sel, { treatment_history: pastProcedures.map(toOralRow) })}
                      btnClassName={ui.secToolBtn}
                      oralSection="past_procedures"
                    />
                  : undefined
              }
              onClear={
                activeSection === "past"
                  ? () => {
                      pastProcedures.forEach((e) => state.onRemoveOralEntry(e.id));
                    }
                  : undefined
              }
              clearDisabled={pastProcedures.length === 0}
              clearConfirmTitle="Are you sure you want to clear past procedures?"
              clearConfirmDesc="This will remove all past procedures from this oral examination. This action cannot be undone."
              chevron={activeSection === "past" ? "up" : "down"}
              onClick={() => jumpTo("past")}
              onChevronClick={() => jumpTo("past")}
            />
          }>
          <OralTable state={state} kind="past" catalog={activeOralProcedures} catalogItems={oralProcedureItems} list={pastProcedures} />
        </AccordionWrap>

        <AccordionWrap
          open={activeSection === "findings"}
          fitContent
          onExpand={() => jumpTo("findings")}
          header={
            <SectionHeader
              title="Findings"
              count={findings.length}
              medicalIcon="diagnosis"
              templateActions={
                activeSection === "findings"
                  ? <ExaminationTemplateActions
                      title="Findings Templates"
                      templates={findingsTpl.templates}
                      saving={findingsTpl.saving}
                      hasData={findings.length > 0}
                      onSelect={(t) => findingsTpl.applyTemplate(t, (full) => applyOralEntries("finding", full.payload?.findings))}
                      onDelete={findingsTpl.onDelete}
                      onSaveNew={(name) => findingsTpl.onSaveNew(name, { findings: findings.map(toOralRow) })}
                      onUpdate={(sel) => findingsTpl.onUpdate(sel, { findings: findings.map(toOralRow) })}
                      btnClassName={ui.secToolBtn}
                      oralSection="findings"
                    />
                  : undefined
              }
              onClear={
                activeSection === "findings"
                  ? () => {
                      findings.forEach((e) => state.onRemoveOralEntry(e.id));
                    }
                  : undefined
              }
              clearDisabled={findings.length === 0}
              clearConfirmTitle="Are you sure you want to clear findings?"
              clearConfirmDesc="This will remove all findings from this oral examination. This action cannot be undone."
              chevron={activeSection === "findings" ? "up" : "down"}
              onClick={() => jumpTo("findings")}
              onChevronClick={() => jumpTo("findings")}
            />
          }>
          <OralTable state={state} kind="finding" catalog={activeOralSurfaceFindings} list={findings} />
        </AccordionWrap>

        <AccordionWrap
          open={activeSection === "procedures"}
          fitContent
          onExpand={() => jumpTo("procedures")}
          header={
            <SectionHeader
              title="Procedures"
              count={procedures.length}
              medicalIcon="surgical-scissors-02"
              templateActions={
                activeSection === "procedures"
                  ? <ExaminationTemplateActions
                      title="Procedures Templates"
                      templates={procTpl.templates}
                      saving={procTpl.saving}
                      hasData={procedures.length > 0}
                      onSelect={(t) => procTpl.applyTemplate(t, (full) => applyOralEntries("procedure", full.payload?.procedures))}
                      onDelete={procTpl.onDelete}
                      onSaveNew={(name) => procTpl.onSaveNew(name, { procedures: procedures.map(toProcedureRow) })}
                      onUpdate={(sel) => procTpl.onUpdate(sel, { procedures: procedures.map(toProcedureRow) })}
                      btnClassName={ui.secToolBtn}
                      oralSection="procedures"
                    />
                  : undefined
              }
              onClear={
                activeSection === "procedures"
                  ? () => {
                      procedures.forEach((e) => state.onRemoveOralEntry(e.id));
                    }
                  : undefined
              }
              clearDisabled={procedures.length === 0}
              clearConfirmTitle="Are you sure you want to clear procedures?"
              clearConfirmDesc="This will remove all procedures from this oral examination. This action cannot be undone."
              chevron={activeSection === "procedures" ? "up" : "down"}
              onClick={() => jumpTo("procedures")}
              onChevronClick={() => jumpTo("procedures")}
            />
          }>
          <OralTable state={state} kind="procedure" catalog={activeOralProcedures} catalogItems={oralProcedureItems} list={procedures} />
        </AccordionWrap>

        <AccordionWrap
          open={activeSection === "notes"}
          fitContent
          onExpand={() => jumpTo("notes")}
          header={
            <SectionHeader
              title="Overall Notes"
              medicalIcon="note-2"
              templateActions={
                activeSection === "notes"
                  ? <ExaminationTemplateActions
                      title="Notes Templates"
                      templates={notesTpl.templates}
                      saving={notesTpl.saving}
                      hasData={notes.trim().length > 0}
                      onSelect={(t) => notesTpl.applyTemplate(t, (full) => { const n = full.payload?.overall_notes; if (n) state.onUpdateOralNotes?.(n); })}
                      onDelete={notesTpl.onDelete}
                      onSaveNew={(name) => notesTpl.onSaveNew(name, { overall_notes: notes })}
                      onUpdate={(sel) => notesTpl.onUpdate(sel, { overall_notes: notes })}
                      btnClassName={ui.secToolBtn}
                      oralSection="notes"
                    />
                  : undefined
              }
              onClear={activeSection === "notes" ? () => state.onUpdateOralNotes?.("") : undefined}
              clearConfirmTitle="Are you sure you want to clear notes?"
              clearConfirmDesc="This will remove all notes from this oral examination. This action cannot be undone."
              chevron={activeSection === "notes" ? "up" : "down"}
              onClick={() => jumpTo("notes")}
              onChevronClick={() => jumpTo("notes")}
            />
          }>
          <div className={ui.notesPad}>
            <textarea
              value={notes}
              onChange={(e) => state.onUpdateOralNotes?.(e.target.value)}
              placeholder="General notes for the oral examination…"
              className={ui.notesArea}
            />
          </div>
        </AccordionWrap>
    </PanelShell>
  );
}

// ──────────────────────────────────────────────────────────────
// OralRecordsList — summary card with counts & tags per section
// ──────────────────────────────────────────────────────────────
export function OralRecordsList({ state }) {
  const entries = Array.isArray(state?.oralEntries) ? state.oralEntries : [];
  if (entries.length === 0) return null;

  const pastProcs = entries.filter((e) => e.kind === "past").map((e) => e.name);
  const findings = entries.filter((e) => e.kind === "finding").map((e) => e.name);
  const procs = entries.filter((e) => e.kind === "procedure").map((e) => e.name);
  const overallNotes = (state?.oralNotes || "").trim();

  const fire = (detail) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("oral-tags-filter", { detail }));
    }
  };

  const onCardEnter = () => fire({ all: true });
  const onCardLeave = () => {
    fire(null);
    state?.onSetOralHighlight?.([]);
  };
  const onCardClick = () => {
    fire(null);
    state?.onSetOralHighlight?.([]);
    state.onEnterOralExam?.({ entrySource: "record_card" });
  };

  const onItemEnter = (kind, name) => {
    const e = entries.find((x) => x.kind === kind && x.name === name);
    if (e) state?.onSetOralHighlight?.(e.surfaces || []);
    fire({ kind, name });
  };

  const onItemLeave = () => {
    state?.onSetOralHighlight?.([]);
    fire({ all: true });
  };

  const sectionRow = (icon, label, items, key, kind) =>
    items.length === 0 ? null : (
      <div
        key={key}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          padding: "12px 14px",
          borderRadius: 10,
          background: "#f8fafc",
          border: "1px solid #eef2f7"
        }}>
        <span
          style={{
            display: "inline-flex",
            height: 32,
            width: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            background: "rgba(164,97,216,0.12)",
            flexShrink: 0
          }}>
          <TPMedicalIcon name={icon} variant="bulk" size={16} color="var(--tp-violet-600)" />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1, textAlign: "left" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "0.1px" }}>
            {label} <span style={{ fontWeight: 500, color: "#94a3b8" }}>({items.length})</span>
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {items.map((it, i) => (
              <span
                key={`${key}-${i}`}
                className={ui.itemTagStyle}
                title={it}
                onMouseEnter={(ev) => {
                  ev.stopPropagation();
                  onItemEnter(kind, it);
                }}
                onMouseLeave={(ev) => {
                  ev.stopPropagation();
                  onItemLeave();
                }}>
                {it}
              </span>
            ))}
          </div>
        </div>
      </div>
    );

  const notesRow = !overallNotes ? null : (
    <div
      key="notes"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 10,
        background: "#f8fafc",
        border: "1px solid #eef2f7"
      }}>
      <span
        style={{
          display: "inline-flex",
          height: 32,
          width: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "rgba(164,97,216,0.12)",
          flexShrink: 0
        }}>
        <TPMedicalIcon name="note-2" variant="bulk" size={16} color="var(--tp-violet-600)" />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1, textAlign: "left" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Oral Notes</span>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#475569",
            lineHeight: 1.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}
          title={overallNotes}>
          {overallNotes}
        </p>
      </div>
    </div>
  );

  return (
    <div className={ui.recordsList} style={{ marginTop: 4 }}>
      <button
        type="button"
        onMouseEnter={onCardEnter}
        onMouseLeave={onCardLeave}
        onClick={onCardClick}
        className={`${ui.toothRow}`}>
        <div className={ui.toothRowHeader}>
          <div className={ui.toothThumb}>
            <TPMedicalIcon
              name="health-file-03"
              variant="bulk"
              size={32}
              color="#cbd5e1"
            />
          </div>
          <div className={ui.toothHeaderText}>
            <span className={ui.toothName} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              Oral Examination
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", background: "rgba(100,116,139,0.16)", padding: "1px 8px", borderRadius: 999, lineHeight: 1.4 }}>
                {entries.length}
              </span>
            </span>
          </div>
          <span className={ui.toothChevron} aria-hidden="true">
            <ExpandIcon size={17} />
          </span>
        </div>
        <div className={ui.toothRowDivider} aria-hidden="true" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sectionRow("clipboard-activity", "Past Procedures", pastProcs, "past", "past")}
          {sectionRow("diagnosis", "Findings", findings, "fnd", "finding")}
          {sectionRow("surgical-scissors-02", "Procedures", procs, "proc", "procedure")}
          {notesRow}
        </div>
      </button>
    </div>
  );
}
