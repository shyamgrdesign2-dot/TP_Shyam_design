/**
 * ToothPicker — FDI tooth multi-select popover used inside TreatmentPlanTab.
 * Uses createPortal to render the dropdown at document body level.
 *
 * Variants:
 *   - "default": standalone button with border
 *   - "inline": borderless cell-style button matching SurfacePicker
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown2 } from "iconsax-reactjs";
import styles from "./ToothPicker.module.scss";
import { useChikitsalay } from "../../../pages/chikitsalay/useChikitsalay";

const ADULT_QUADRANTS = {
  UR: ["18", "17", "16", "15", "14", "13", "12", "11"],
  UL: ["21", "22", "23", "24", "25", "26", "27", "28"],
  LR: ["48", "47", "46", "45", "44", "43", "42", "41"],
  LL: ["31", "32", "33", "34", "35", "36", "37", "38"],
};
const PEDIATRIC_QUADRANTS = {
  UR: ["55", "54", "53", "52", "51"],
  UL: ["61", "62", "63", "64", "65"],
  LR: ["85", "84", "83", "82", "81"],
  LL: ["71", "72", "73", "74", "75"],
};
const MIXED_QUADRANTS = {
  UR: ["18", "17", "16", "55", "54", "53", "52", "51", "15", "14", "13", "12", "11"],
  UL: ["21", "22", "23", "24", "25", "61", "62", "63", "64", "65", "26", "27", "28"],
  LR: ["48", "47", "46", "85", "84", "83", "82", "81", "45", "44", "43", "42", "41"],
  LL: ["31", "32", "33", "34", "35", "71", "72", "73", "74", "75", "36", "37", "38"],
};
const DENTITION_TABS = ["Adult", "Pedia", "Mixed"];
const QUADRANT_MAP = { Adult: ADULT_QUADRANTS, Pedia: PEDIATRIC_QUADRANTS, Mixed: MIXED_QUADRANTS };

export function ToothPicker({
  value,
  onChange,
  isPediatric = false,
  disabled,
  variant = "default",
}) {
  const isChikitsalayAccessable = useChikitsalay();
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [mounted, setMounted] = useState(false);
  const [dentitionType, setDentitionType] = useState(isPediatric ? "Pedia" : "Adult");
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const quadrants = QUADRANT_MAP[dentitionType];
  const quickChips = [
    { label: "UR", teeth: quadrants.UR },
    { label: "UL", teeth: quadrants.UL },
    { label: "LR", teeth: quadrants.LR },
    { label: "LL", teeth: quadrants.LL },
    { label: "Maxillary", teeth: [...quadrants.UR, ...quadrants.UL] },
    { label: "Mandibular", teeth: [...quadrants.LR, ...quadrants.LL] },
    { label: "R Arch", teeth: [...quadrants.UR, ...quadrants.LR] },
    { label: "L Arch", teeth: [...quadrants.UL, ...quadrants.LL] },
    { label: "Full", teeth: [...quadrants.UR, ...quadrants.UL, ...quadrants.LR, ...quadrants.LL] },
  ];

  useEffect(() => { setMounted(true); }, []);

  const toggle = (fdi) => {
    if (value.includes("full-mouth")) { onChange([fdi]); return; }
    if (value.includes(fdi)) onChange(value.filter((v) => v !== fdi));
    else onChange([...value, fdi]);
  };

  const clear = () => onChange([]);

  const displayValue =
    value.length === 0 ? "Select teeth"
    : value.includes("full-mouth") ? "Full mouth"
    : value.length <= 3 ? value.map((v) => `T${v}`).join(", ")
    : `${value.slice(0, 2).map((v) => `T${v}`).join(", ")} +${value.length - 2}`;

  const openDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(640, window.innerWidth - 24);
    const viewportWidth = window.innerWidth;
    let left = rect.left;
    if (left + dropdownWidth > viewportWidth - 12) left = viewportWidth - dropdownWidth - 12;
    const maxHeight = Math.max(320, window.innerHeight - rect.bottom - 24);
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left,
      zIndex: 10001,
      width: dropdownWidth,
      maxHeight,
      pointerEvents: "auto",
    });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleDocClick = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const reposition = (e) => {
      if (dropdownRef.current?.contains(e.target)) return;
      openDropdown();
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey, true);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey, true);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, openDropdown]);

  const isChipActive = (chip) =>
    chip.teeth[0] === "full-mouth"
      ? value.includes("full-mouth")
      : chip.teeth.length > 0 && chip.teeth.every((t) => value.includes(t));

  const handleChipClick = (chip) => {
    if (chip.teeth[0] === "full-mouth") {
      onChange(value.includes("full-mouth") ? [] : ["full-mouth"]);
      return;
    }
    const isActive = isChipActive(chip);
    const currentSet = new Set(value.filter((v) => v !== "full-mouth"));
    if (isActive) {
      chip.teeth.forEach((t) => currentSet.delete(t));
    } else {
      chip.teeth.forEach((t) => currentSet.add(t));
    }
    onChange(Array.from(currentSet));
  };

  const dropdown = open ? (
    <div ref={dropdownRef} style={dropdownStyle} className={styles.dropdownWrapper} data-tp-portal="true">
      <div className={styles.dropdownHeader}>
        <p className={styles.dropdownTitle}>SELECT TEETH</p>
        <div className={styles.selectionCount}>
          {value.includes("full-mouth") ? "FM" : value.length}
        </div>
      </div>

      <div className={styles.dropdownScroll} onWheel={(e) => e.stopPropagation()}>
        <div className={styles.dentitionSegment}>
          {DENTITION_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.dentitionTab} ${dentitionType === tab ? styles.dentitionTabActive : ""}`}
              onClick={() => { setDentitionType(tab); onChange([]); }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.quickSelectWrapper}>
          {quickChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChipClick(chip)}
              className={`${styles.quickSelectButton} ${isChipActive(chip) ? styles.quickSelectActive : styles.quickSelectInactive}`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className={styles.quadrantsWrapper}>
          {[
            ["Upper Right", quadrants.UR],
            ["Upper Left", quadrants.UL],
            ["Lower Right", quadrants.LR],
            ["Lower Left", quadrants.LL],
          ].map(([label, teeth]) => (
            <div key={label} className={styles.quadrantBox}>
              <div className={styles.quadrantHeader}>
                <span className={styles.quadrantLabel}>{label}</span>
                <span className={styles.quadrantCount}>{teeth.length} teeth</span>
              </div>
              <div className={styles.toothListWrapper}>
                {teeth.map((fdi) => (
                  <ToothPick key={fdi} fdi={fdi} selected={value.includes(fdi)} onClick={() => toggle(fdi)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footerWrapper}>
        <button type="button" onClick={clear} className={styles.clearButton}>Clear</button>
        <button type="button" onClick={() => setOpen(false)} className={styles.doneButton}>Done</button>
      </div>
    </div>
  ) : null;

  const isInline = variant === "inline";
  return (
    <div className={isInline ? "" : styles.triggerWrapper}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || isChikitsalayAccessable}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openDropdown(); }}
        className={isInline ? styles.triggerInline : styles.triggerDefault}
      >
        {value.length > 0 ? (
          <span className={styles.valueContainer}>
            {isInline ? (
              value.includes("full-mouth") ? (
                <span className={styles.tagBlue}>Full mouth</span>
              ) : value.length <= 3 ? (
                value.map((v) => <span key={v} className={styles.tagSlate}>{`T${v}`}</span>)
              ) : (
                <>
                  {value.slice(0, 2).map((v) => <span key={v} className={styles.tagSlate}>T{v}</span>)}
                  <span className={styles.tagOverflow}>+{value.length - 2}</span>
                </>
              )
            ) : (
              <span>{displayValue}</span>
            )}
          </span>
        ) : (
          <span className={`${styles.placeholderWrapper} ${isInline ? styles.placeholderInline : styles.placeholderDefault}`}>
            {isInline ? "—" : <span>Select teeth</span>}
          </span>
        )}
        <ArrowDown2 size={14} color="currentColor" variant="Linear" />
      </button>
      {mounted && typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}

function ToothPick({ fdi, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.toothPickButton} ${selected ? styles.toothPickSelected : styles.toothPickUnselected}`}
    >
      {fdi}
    </button>
  );
}
