import React from "react";
import { ZONE_INFO, getZoneLabel } from "./types";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import ui from "./ExaminationTab.ui.module.scss";

export function SurfaceMultiSelect({
  selected,
  arch,
  toothPosition,
  onToggle,
  onHover
}) {
  const { activeSurfaces } = useDentalMasters();
  return (
    <div className={ui.zoneChipsRow}>
      {activeSurfaces.map((z) => {
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
