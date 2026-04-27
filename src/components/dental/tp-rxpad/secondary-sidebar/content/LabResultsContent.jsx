/**
 * Lab Results content panel — date-based expandable cards.
 */
import React, { useState } from "react";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { ActionButton, useStickyHeaderState } from "../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import { LAB_PRIMARY_DATE_LABEL, LAB_PRIMARY_ROWS } from "./today-data";
import layout from "./sidebarContentLayout.module.scss";
const BASE_ROWS = LAB_PRIMARY_ROWS;
const LAB_ENTRIES = [
  {
    id: "l-27",
    dateLabel: LAB_PRIMARY_DATE_LABEL,
    rows: BASE_ROWS,
  },
  {
    id: "l-26",
    dateLabel: "26 Jan'26",
    rows: BASE_ROWS.map((row, index) =>
      index % 4 === 0
        ? {
            ...row,
            value: (Number.parseFloat(row.value) * 0.98).toFixed(1),
          }
        : row,
    ),
  },
  {
    id: "l-24",
    dateLabel: "24 Jan'26",
    rows: BASE_ROWS.map((row, index) =>
      index % 5 === 0
        ? {
            ...row,
            value: (Number.parseFloat(row.value) * 1.02).toFixed(1),
          }
        : row,
    ),
  },
  {
    id: "l-22",
    dateLabel: "22 Jan'26",
    rows: BASE_ROWS.map((row, index) =>
      index % 3 === 0
        ? {
            ...row,
            value: (Number.parseFloat(row.value) * 1.01).toFixed(1),
          }
        : row,
    ),
  },
  {
    id: "l-20",
    dateLabel: "20 Jan'26",
    rows: BASE_ROWS.map((row, index) =>
      index % 6 === 0
        ? {
            ...row,
            value: (Number.parseFloat(row.value) * 0.97).toFixed(1),
          }
        : row,
    ),
  },
];
function LabRow({ label, unit, value, abnormal = false }) {
  return (
    <div className={layout.labRow}>
      <div className={layout.labRowInner}>
        <div className={layout.labLeft}>
          <span className={layout.labLabel}>{label}</span>
          <span className={layout.labUnit}>{unit}</span>
        </div>
        <span
          className={`${layout.labValue} ${abnormal ? layout.labValueAbnormal : ""}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
function LabDateCard({ entry, expanded, onToggle }) {
  const { headerRef, isStuck } = useStickyHeaderState();
  return (
    <div className={layout.accCard} style={tpSectionCardStyle}>
      <button
        ref={headerRef}
        type="button"
        onClick={onToggle}
        className={`${layout.accHeader} ${
          expanded
            ? isStuck
              ? layout.accHeaderStuck
              : layout.accHeaderRoundedOpen
            : layout.accHeaderCollapsed
        }`}
      >
        <div className={layout.accHeaderInner}>
          <p className={layout.accTitle}>{entry.dateLabel}</p>
          <div className={layout.accChevron}>
            {expanded ? (
              <ArrowSquareUp
                color="var(--tp-slate-500)"
                size={18}
                strokeWidth={1.5}
                variant="Linear"
              />
            ) : (
              <ArrowSquareDown
                color="var(--tp-slate-500)"
                size={18}
                strokeWidth={1.5}
                variant="Linear"
              />
            )}
          </div>
        </div>
      </button>
      {expanded ? (
        <div className={layout.accBody}>
          {entry.rows.map((row) => (
            <LabRow {...row} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
export function LabResultsContent() {
  const [expandedState, setExpandedState] = useState(() =>
    Object.fromEntries(
      LAB_ENTRIES.map((entry, index) => [entry.id, index === 0]),
    ),
  );
  return (
    <div className={layout.pageRoot}>
      <ActionButton label="Add/Edit Details" icon="plus" />
      <div className={layout.scrollFlex} data-sticky-scroll-root="true">
        <div className={layout.innerStack}>
          {LAB_ENTRIES.map((entry) => (
            <LabDateCard
              entry={entry}
              expanded={Boolean(expandedState[entry.id])}
              onToggle={() => {
                setExpandedState((prev) => ({
                  ...prev,
                  [entry.id]: !prev[entry.id],
                }));
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
