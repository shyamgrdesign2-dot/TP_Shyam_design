/**
 * ToothPicker — FDI tooth multi-select popover used inside TreatmentPlanTab.
 * Uses createPortal to render the dropdown at document body level,
 * preventing clipping by overflow-hidden ancestor containers.
 *
 * Two variants:
 *   - "default": standalone button with border (for use outside tables)
 *   - "inline": borderless cell-style button matching SurfacePicker (for table use)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown2 } from "iconsax-reactjs";
import styles from "./ToothPicker.module.scss";
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
const QUICK_SELECT_GROUPS = [
  {
    label: "UR",
    getTeeth: (q) => q.UR,
  },
  {
    label: "UL",
    getTeeth: (q) => q.UL,
  },
  {
    label: "LR",
    getTeeth: (q) => q.LR,
  },
  {
    label: "LL",
    getTeeth: (q) => q.LL,
  },
  {
    label: "Maxillary",
    getTeeth: (q) => [...q.UR, ...q.UL],
  },
  {
    label: "Mandibular",
    getTeeth: (q) => [...q.LR, ...q.LL],
  },
  {
    label: "R Arch",
    getTeeth: (q) => [...q.UR, ...q.LR],
  },
  {
    label: "L Arch",
    getTeeth: (q) => [...q.UL, ...q.LL],
  },
  {
    label: "Full",
    getTeeth: (q) => [...q.UR, ...q.UL, ...q.LR, ...q.LL],
  },
];

export function ToothPicker({
  value,
  onChange,
  isPediatric = false,
  disabled,
  variant = "default",
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const quadrants = isPediatric ? PEDIATRIC_QUADRANTS : ADULT_QUADRANTS;
  const allTeeth = [
    ...quadrants.UR,
    ...quadrants.UL,
    ...quadrants.LR,
    ...quadrants.LL,
  ];

  useEffect(() => {
    setMounted(true);
  }, []);
  const toggle = (fdi) => {
    if (value.includes("full-mouth")) {
      onChange([fdi]);
      return;
    }
    if (value.includes(fdi)) onChange(value.filter((v) => v !== fdi));
    else onChange([...value, fdi]);
  };
  const selectAll = () => {
    onChange(allTeeth);
  };
  const clear = () => onChange([]);
  const displayValue =
    value.length === 0
      ? "Select teeth"
      : value.includes("full-mouth")
        ? "Full mouth"
        : value.length <= 3
          ? value.map((v) => `T${v}`).join(", ")
          : `${value
              .slice(0, 2)
              .map((v) => `T${v}`)
              .join(", ")} +${value.length - 2}`;
  // Compute dropdown position relative to viewport when opening
  const openDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(520, window.innerWidth - 24);
    const viewportWidth = window.innerWidth;
    let left = rect.left;
    // Prevent going off right edge
    if (left + dropdownWidth > viewportWidth - 12) {
      left = viewportWidth - dropdownWidth - 12;
    }
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left,
      zIndex: 9999,
      width: dropdownWidth,
      pointerEvents: "auto",
    });
    setOpen(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    const handleDocClick = (e) => {
      const target = e.target;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const reposition = () => openDropdown();
    document.addEventListener("mousedown", handleDocClick);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);
  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={styles.dropdownWrapper}
    >
      <div className={styles.dropdownHeader}>
        <div>
          <p className={styles.dropdownTitle}>
            {isPediatric ? "Pediatric Teeth" : "Select Teeth"}
          </p>
          <p className={styles.dropdownSubtitle}>
            Choose one, many, or switch to full-mouth mode.
          </p>
        </div>
        <div className={styles.selectionCount}>
          {value.includes("full-mouth") ? "FM" : value.length}
        </div>
      </div>
      <div className={styles.quickSelectWrapper}>
        {QUICK_SELECT_GROUPS.map((g) => {
          const teeth = g.getTeeth(quadrants);
          const active =
            teeth.length > 0 && teeth.every((t) => value.includes(t));
          return (
            <button
              type="button"
              onClick={() =>
                onChange(
                  active
                    ? value.filter((v) => !teeth.includes(v))
                    : [
                        ...new Set([
                          ...value.filter((v) => v !== "full-mouth"),
                          ...teeth,
                        ]),
                      ],
                )
              }
              className={`${styles.quickSelectButton} ${active ? styles.quickSelectActive : styles.quickSelectInactive}`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
      <div className={styles.quadrantsWrapper}>
        {[
          ["Upper Right", quadrants.UR],
          ["Upper Left", quadrants.UL],
          ["Lower Right", quadrants.LR],
          ["Lower Left", quadrants.LL],
        ].map(([label, teeth]) => (
          <div className={styles.quadrantBox}>
            <div className={styles.quadrantHeader}>
              <span className={styles.quadrantLabel}>
                {label}
              </span>
              <span className={styles.quadrantCount}>
                {teeth.length} teeth
              </span>
            </div>
            <div className={styles.toothListWrapper}>
              {teeth.map((fdi) => (
                <ToothPick
                  fdi={fdi}
                  selected={value.includes(fdi)}
                  onClick={() => toggle(fdi)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.footerWrapper}>
        <button
          type="button"
          onClick={clear}
          className={styles.clearButton}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={styles.doneButton}
        >
          Done
        </button>
      </div>
    </div>
  ) : null;
  const isInline = variant === "inline";
  return (
    <div className={isInline ? "" : styles.triggerWrapper}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          open ? setOpen(false) : openDropdown();
        }}
        className={isInline ? styles.triggerInline : styles.triggerDefault}
      >
        {value.length > 0 ? (
          <span className={styles.valueContainer}>
            {isInline ? (
              value.includes("full-mouth") ? (
                <span className={styles.tagBlue}>
                  Full mouth
                </span>
              ) : value.length <= 3 ? (
                value.map((v) => (
                  <span className={styles.tagSlate}>{`T${v}`}</span>
                ))
              ) : (
                <>
                  {value.slice(0, 2).map((v) => (
                    <span className={styles.tagSlate}>
                      T{v}
                    </span>
                  ))}
                  <span className={styles.tagOverflow}>
                    +{value.length - 2}
                  </span>
                </>
              )
            ) : (
              <>
                <span>{displayValue}</span>
              </>
            )}
          </span>
        ) : (
          <span
            className={`${styles.placeholderWrapper} ${isInline ? styles.placeholderInline : styles.placeholderDefault}`}
          >
            {isInline ? (
              "—"
            ) : (
              <>
                <span>Select teeth</span>
              </>
            )}
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
