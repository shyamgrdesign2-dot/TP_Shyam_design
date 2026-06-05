import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Add } from "iconsax-reactjs";
import { TOOTH_DIAGNOSES } from "./types";
import ui from "./ExaminationTab.ui.module.scss";

export function DiagnosisNameCell({ name, color, activeRows, onSwap }) {
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

export function EditableNameCell({ value, catalog, onCommit, onFocusActivate }) {
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
