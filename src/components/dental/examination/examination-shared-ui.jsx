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
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Grid5, Ram, Eraser, Trash } from "iconsax-reactjs";
import { TPMedicalIcon } from "../tp-ui";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import ui from "./ExaminationTab.ui.module.scss";

dayjs.extend(customParseFormat);

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
  templateActions,
  onClear,
  clearDisabled,
  clearConfirmTitle,
  clearConfirmDesc,
  onClick,
  chevron,
  onChevronClick
}) {
  const [showConfirm, setShowConfirm] = useState(false);
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
        {templateActions ?? (
          <>
            {onTemplate &&
              <button
                type="button"
                title="Templates"
                onClick={onTemplate}
                className={ui.secToolBtn}>
                <Grid5 color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
              </button>}
            {onSave &&
              <button
                type="button"
                title="Save as template"
                onClick={onSave}
                className={ui.secToolBtn}>
                <Ram color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
              </button>}
          </>
        )}


        {onClear && clearConfirmTitle ? (
          <>
            <button
              type="button"
              title="Clear"
              disabled={clearDisabled}
              className={ui.secToolBtn}
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
              }}
            >
              <Eraser color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
            </button>
            <TPConfirmDialog
              open={showConfirm}
              onOpenChange={setShowConfirm}
              title={clearConfirmTitle}
              warning={clearConfirmDesc}
              secondaryLabel="Yes, Clear All"
              secondaryTone="destructive"
              onSecondary={() => {
                setShowConfirm(false);
                onClear();
              }}
              primaryLabel="No, Keep It"
            />
          </>
        ) : onClear ? (
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

          </button>
        ) : null}


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
    `${n} day${plural}`,
    `${n} week${plural}`,
    `${n} month${plural}`,
    `${n} year${plural}`,
  ];
}

function tryParseToISO(val) {
  if (!val) return "";
  const d = dayjs(val, "D MMM YYYY", true);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
}

function  CalendarSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.695 13.7h.009M15.695 16.7h.009M11.995 13.7h.01M11.995 16.7h.01M8.294 13.7h.01M8.294 16.7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
  const [hiddenDateValue, setHiddenDateValue] = useState(() => tryParseToISO(value));
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const dateInputRef = useRef(null);
  useEffect(() => {
    if (autoOpen && !value) setOpen(true);
  }, [autoOpen, value]);
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  useEffect(() => {
    setHiddenDateValue(tryParseToISO(value));
  }, [value]);
  const options = useMemo(() => {
    return internalValue && internalValue.match(/\d+/) ?
      getDynamicSinceOptions(internalValue) :
      ["1 day", "1 week", "1 month", "1 year"];
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
  function handleDatePick(e) {
    const iso = e.target.value;
    if (!iso) return;
    const display = dayjs(iso).format("D MMM YYYY");
    setInternalValue(display);
    setHiddenDateValue(iso);
    onChange(display);
    setOpen(false);
  }

  function openDatePicker() {
    if (!dateInputRef.current) return;
    try { dateInputRef.current.showPicker(); }
    catch { dateInputRef.current.click(); }
  }

  function handleSelectCustomDate() {
    setOpen(false);
    setTimeout(openDatePicker, 0);
  }

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

        <input
          ref={dateInputRef}
          type="date"
          aria-hidden="true"
          tabIndex={-1}
          value={hiddenDateValue}
          onChange={handleDatePick}
          className={ui.sinceDateHidden} />

        <button
          type="button"
          aria-label="Pick exact date"
          title="Pick exact date"
          className={ui.sinceDateBtn}
          onClick={(e) => { e.stopPropagation(); openDatePicker(); }}>
          <CalendarSvg />
        </button>
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
            <div style={{ display: "flex", flexDirection: "column" }}>
              {options.map((opt) =>
                <button
                  key={opt}
                  type="button"
                  className={ui.popoverItem}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}>
                  {opt}
                </button>
              )}
            </div>
            <div className={ui.sinceMenuSep} />
            <button
              type="button"
              className={ui.sinceCustomDateBtn}
              onClick={handleSelectCustomDate}>
              <CalendarSvg />
              <span>Select custom date</span>
            </button>
          </div>,
          document.body
        )}
    </>);

}
