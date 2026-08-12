import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Add, InfoCircle } from "iconsax-reactjs";
import { ZONE_INFO, getZoneLabel, getSurfacesForFdi, getProcedureLabel } from "./types";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import { SurfaceDots } from "./surface-pickers";
import ui from "./ExaminationTab.ui.module.scss";

export function DiagnosisNameCell({ name, color, activeRows, onSwap }) {
  const { activeProcedures } = useDentalMasters();
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
  // Available procedures to swap to (exclude currently-active ones except self).
  const options = activeProcedures.filter(
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

export function EditableNameCell({ value, catalog, onCommit, onFocusActivate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const [pos, setPos] = useState(null);
  const catalogLabels = useMemo(
    () => (catalog || []).map((c) => getProcedureLabel(c)).filter(Boolean),
    [catalog],
  );
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  useEffect(() => {
    setHighlightIdx(0);
  }, [draft]);
  const filtered = useMemo(() => {
    const q = draft.toLowerCase().trim();
    if (!q) return catalogLabels.slice(0, 8);
    return catalogLabels.
      filter((c) => c.toLowerCase().includes(q) && c !== value).
      slice(0, 8);
  }, [draft, catalogLabels, value]);
  const hasExactMatch = useMemo(
    () =>
      filtered.some((c) => c.toLowerCase() === draft.trim().toLowerCase()) ||
      catalogLabels.some((c) => c.toLowerCase() === draft.trim().toLowerCase()),
    [filtered, catalogLabels, draft]
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

export function SurfaceCellDropdown({
  entry,
  arch,
  toothPosition,
  isActive,
  mode,
  onActivate,
  onDeactivate,
  onToggleZone,
  onHover,
  multiSelectZones,
  onClearSurfaces
}) {
  const { activeSurfaces } = useDentalMasters();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !wasActiveRef.current) setOpen(true);
    if (!isActive) setOpen(false);
    wasActiveRef.current = isActive;
  }, [isActive]);
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
  const shown = isActive ? Array.from(multiSelectZones) : entry.surfaces;
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
              {activeSurfaces.filter((z) => z !== "whole" && getSurfacesForFdi(entry.toothFdi).includes(z)).map((z) => {
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
            {onClearSurfaces && shown.length > 0 && (
              <div style={{ borderTop: "1px solid #f1f5f9", padding: "8px 12px", display: "flex", justifyContent: "center", background: "#fff" }}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onClearSurfaces}
                  style={{ border: "none", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 10px" }}>
                  Clear all
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>);

}
