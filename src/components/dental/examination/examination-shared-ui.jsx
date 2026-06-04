/**
 * examination-shared-ui — presentational primitives shared across the
 * examination panels (single-tooth findings, dentition, and oral clusters).
 *
 *   • AccordionWrap   — rounded card with animated expand/collapse
 *   • SectionHeader   — TP medical icon + title + count + Template/Save/Clear
 *   • SinceDropdown   — "since" duration input with a portalled option menu
 *
 * Extracted from ExaminationTab so the oral panel can reuse them without a
 * circular import back into ExaminationTab.jsx.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Grid5, Ram, Eraser } from "iconsax-reactjs";
import { TPMedicalIcon } from "../tp-ui";
import ui from "./ExaminationTab.ui.module.scss";

// ──────────────────────────────────────────────────────────────
// AccordionWrap — rounded card with animated expand/collapse.
// Uses a measured height transition so content visibly slides open/shut.
// ──────────────────────────────────────────────────────────────
export function AccordionWrap({ open, header, children, onExpand, fitContent }) {
  return (
    <div
      className={`${ui.accordion} ${open ? (fitContent ? ui.accordionFitOpen : ui.accordionOpen) : ui.accordionClosed
        }`}
      onClick={open ? undefined : onExpand}>

      <div className={ui.accordionHeaderSlot}>{header}</div>
      <div
        className={ui.accordionGrid}
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          flex: open ? (fitContent ? "0 0 auto" : "1 1 0%") : "0 0 0px"
        }}>

        <div className={ui.accordionGridInner}>{children}</div>
      </div>
    </div>);

}
// ──────────────────────────────────────────────────────────────
// SectionHeader — TP medical icon + title + count + Template/Save/Clear
// Matches RxPad section header styling.
// ──────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  count,
  medicalIcon,
  onTemplate,
  onSave,
  onClear,
  clearDisabled,
  onClick,
  chevron,
  onChevronClick
}) {
  const stop = (e) => e.stopPropagation();
  const titleWithCount =
    typeof count === "number" ? `${title} (${count})` : title;
  return (
    <header
      onClick={onClick}
      className={`${ui.secHead} ${onClick ? ui.secHeadClick : ""}`}>

      {medicalIcon &&
        <span className={ui.secIcon}>
          <TPMedicalIcon
            name={medicalIcon}
            variant="bulk"
            size={22}
            color="var(--tp-violet-500)" />

        </span>}


      <h4 className={ui.secTitle}>{titleWithCount}</h4>
      <div className={ui.secGrow} />
      <div className={ui.secActions} onClick={stop}>
        {onTemplate &&
          <button
            type="button"
            title="Templates"
            onClick={onTemplate}
            className={ui.secToolBtn}>

            <Grid5
              color="currentColor"
              size={16}
              strokeWidth={1.5}
              variant="Linear" />

          </button>}


        {onSave &&
          <button
            type="button"
            title="Save as template"
            onClick={onSave}
            className={ui.secToolBtn}>

            <Ram
              color="currentColor"
              size={16}
              strokeWidth={1.5}
              variant="Linear" />

          </button>}


        {onClear &&
          <button
            type="button"
            title="Clear"
            onClick={onClear}
            disabled={clearDisabled}
            className={ui.secToolBtn}>

            <Eraser
              color="currentColor"
              size={16}
              strokeWidth={1.5}
              variant="Linear" />

          </button>}


        {chevron &&
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChevronClick?.() ?? onClick?.();
            }}
            className={ui.secChevronBtn}>

            {chevron === "up" ?
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19.92 15.05L13.4 8.53c-.77-.77-2.03-.77-2.8 0l-6.52 6.52"
                  stroke="#334155"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10" />

              </svg> :

              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19.92 8.95L13.4 15.47c-.77.77-2.03.77-2.8 0L4.08 8.95"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10" />

              </svg>}

          </button>}

      </div>
    </header>);

}
// ──────────────────────────────────────────────────────────────
// SinceDropdown — "since" duration input with portalled option menu.
// ──────────────────────────────────────────────────────────────
function getDynamicSinceOptions(query) {
  const match = query.match(/\d+/);
  const n = match ? parseInt(match[0], 10) : 1;
  const plural = n > 1 ? "s" : "";
  return [
    `${n} hour${plural}`,
    `${n} day${plural}`,
    `${n} month${plural}`,
    `${n} year${plural}`];

}
export function SinceDropdown({
  value,
  onChange,
  autoOpen,
  onFocusActivate,
  onBlurDeactivate
}) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  useEffect(() => {
    if (autoOpen && !value) setOpen(true);
  }, [autoOpen, value]);
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  const options = useMemo(() => {
    return internalValue && internalValue.match(/\d+/) ?
      getDynamicSinceOptions(internalValue) :
      ["1 hour", "1 day", "1 week", "1 month", "1 year"];
  }, [internalValue]);
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
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const a = anchorRef.current,
        p = popoverRef.current;
      const t = e.target;
      if (a && !a.contains(t) && p && !p.contains(t)) {
        setOpen(false);
        onBlurDeactivate?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onBlurDeactivate]);
  return (
    <>
      <div className={ui.sinceAnchor} ref={anchorRef}>
        <input
          type="text"
          value={internalValue}
          onFocus={() => {
            onFocusActivate?.();
            setOpen(true);
          }}
          onChange={(e) => {
            setInternalValue(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(internalValue);
              setOpen(false);
            }
          }}
          placeholder="e.g. 5 days"
          className={ui.sinceInput} />


        <svg
          className={ui.sinceChevronAbs}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            flexShrink: 0
          }}>

          <path
            d="M1 1L5 5L9 1"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round" />

        </svg>
      </div>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            className={ui.sinceMenu}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            {options.map((opt) =>
              <button
                type="button"
                className={ui.popoverItem}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}>

                {opt}
              </button>
            )}
          </div>,
          document.body
        )}
    </>);

}
