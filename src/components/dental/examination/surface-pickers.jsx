import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ZONE_INFO, getZoneLabel, getSurfacesForFdi } from "./types";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import ui from "./ExaminationTab.ui.module.scss";

export function SurfaceMultiSelect({
  selected,
  arch,
  toothPosition,
  fdi,
  onToggle,
  onHover
}) {
  const { activeSurfaces } = useDentalMasters();
  const validZones = getSurfacesForFdi(fdi);
  return (
    <div className={ui.zoneChipsRow}>
      {activeSurfaces.filter((z) => validZones.includes(z)).map((z) => {
        const isActive = selected.includes(z);
        const label = getZoneLabel(z, arch, toothPosition);
        const color = ZONE_INFO[z].color;
        return (
          <button
            type="button"
            onClick={() => onToggle(z)}
            onMouseEnter={() => onHover([z])}
            onMouseLeave={() => onHover(selected)}
            className={`${ui.zoneChip} ${isActive ? ui.zoneChipOn : ui.zoneChipOff
              }`}>

            <span
              className={ui.surfaceDot8}
              style={{
                background: color
              }} />


            {label}
          </button>);

      })}
    </div>);

}

export function SurfaceDots({ surfaces, arch, toothPosition }) {
  if (surfaces.length === 0) {
    return <span className={ui.dotsWholePill}>Whole tooth</span>;
  }
  const abbr = (z) => {
    const label = getZoneLabel(z, arch, toothPosition);
    return label[0];
  };
  const shown = surfaces.slice(0, 4);
  const overflow = surfaces.length - shown.length;
  const overflowTitle =
    overflow > 0 ?
      surfaces.
        slice(4).
        map((z) => getZoneLabel(z, arch, toothPosition)).
        join(", ") :
      undefined;
  return (
    <div className={ui.dotsRow}>
      {shown.map((z) =>
        <span
          title={getZoneLabel(z, arch, toothPosition)}
          className={ui.dotsAbbr}
          style={{
            background: ZONE_INFO[z].color
          }}>

          {abbr(z)}
        </span>
      )}
      {overflow > 0 &&
        <span title={overflowTitle} className={ui.dotsMore}>
          +{overflow}
        </span>}

    </div>);

}

let _symId = 0;
export const getSymId = () => `sym-${++_symId}`;

export function SymptomSurfacePicker({
  surfaces,
  arch,
  toothPosition,
  fdi,
  mode = "symptom",
  onChange
}) {
  const { activeSurfaces } = useDentalMasters();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [pos, setPos] = useState(null);
  const selected = new Set(surfaces);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 200)
    });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const a = anchorRef.current,
        p = popoverRef.current,
        t = e.target;
      if (a && !a.contains(t) && p && !p.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const toggle = (z) => {
    if (z === "whole") {
      onChange(selected.has(z) ? [] : ["whole"]);
      return;
    }
    if (selected.has("whole")) {
      onChange([z]);
      return;
    }
    onChange(
      selected.has(z) ? surfaces.filter((s) => s !== z) : [...surfaces, z]
    );
  };
  const validZones = getSurfacesForFdi(fdi);
  const surfaceOptions = activeSurfaces.filter((z) => z !== "whole" && validZones.includes(z));
  const optionsList = mode === "symptom" ? surfaceOptions : ["whole", ...surfaceOptions];
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${ui.symTrigger} ${open ? ui.symTriggerOpen : ""}`}>

        <span className={ui.surfaceTriggerText}>
          {surfaces.length === 0 ?
            <span className={ui.symMuted}>Select surface</span> :
            surfaces.includes("whole") ?
              <span className={ui.surfaceInlineRow}>
                Whole tooth
              </span> :

              <SurfaceDots
                surfaces={surfaces.filter((z) => z !== "whole")}
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
            d="M1 1l4 4 4-4"
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

            <ul className={ui.surfaceZoneList}>
              {optionsList.map((z, idx) => {
                let checked = selected.has(z);
                let label = getZoneLabel(z, arch, toothPosition);
                let color = ZONE_INFO[z]?.color || "#888";
                if (z === "whole") {
                  label = "Whole tooth";
                  color = "#64748b";
                  if (mode !== "treatment") {
                    checked = surfaceOptions.every((az) => selected.has(az));
                  }
                }
                return (
                  <React.Fragment key={z}>
                    <li>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          toggle(z);
                        }}
                        className={ui.surfaceZoneBtn}>

                        <span
                          className={`${ui.surfaceCheck} ${checked ? ui.surfaceCheckOn : ""
                            }`}>

                          {checked &&
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="none">

                              <path
                                d="M6 12l4.5 4.5L18 7.5"
                                stroke="#fff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round" />

                            </svg>}

                        </span>
                        <span
                          className={ui.surfaceDot8}
                          style={{
                            background: color
                          }} />


                        <span className={ui.surfaceMenuLabel}>{label}</span>
                      </button>
                    </li>
                    {z === "whole" && mode !== "symptom" &&
                      <li
                        aria-hidden={true}
                        style={{
                          height: 1,
                          background: "#e2e8f0",
                          margin: "4px 0",
                          listStyle: "none"
                        }} />}
                  </React.Fragment>);

              })}
            </ul>
            {surfaces.length > 0 && (
              <div style={{ borderTop: "1px solid #f1f5f9", padding: "8px 12px", display: "flex", justifyContent: "center", background: "#fff" }}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChange([])}
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
