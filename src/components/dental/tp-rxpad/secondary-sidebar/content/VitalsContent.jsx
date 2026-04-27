/**
 * Vitals content panel with per-date accordion.
 * Each date can expand/collapse and provides mock values.
 */
import React, { useState } from "react";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { ActionButton, useStickyHeaderState } from "../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import { VITALS_PRIMARY_DATE_LABEL, VITALS_PRIMARY_ROWS } from "./today-data";
import layout from "./sidebarContentLayout.module.scss";
const VITALS_BY_DATE = [
  {
    id: "today-27",
    dateLabel: VITALS_PRIMARY_DATE_LABEL,
    rows: VITALS_PRIMARY_ROWS,
  },
  {
    id: "d-26",
    dateLabel: "26 Jan'26",
    rows: [
      {
        label: "Temperature",
        unit: "Frh",
        value: "99.2",
      },
      {
        label: "Pulse",
        unit: "/min",
        value: "84",
      },
      {
        label: "Resp. Rate",
        unit: "/min",
        value: "20",
      },
      {
        label: "Systolic",
        unit: "mmhg",
        value: "124",
      },
      {
        label: "Diastolic",
        unit: "mmhg",
        value: "78",
      },
      {
        label: "SpO2",
        unit: "%",
        value: "97",
      },
      {
        label: "Weight",
        unit: "kgs",
        value: "68.4",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "23.1",
      },
    ],
  },
  {
    id: "d-24",
    dateLabel: "24 Jan'26",
    rows: [
      {
        label: "Temperature",
        unit: "Frh",
        value: "98.6",
      },
      {
        label: "Pulse",
        unit: "/min",
        value: "79",
      },
      {
        label: "Resp. Rate",
        unit: "/min",
        value: "18",
      },
      {
        label: "Systolic",
        unit: "mmhg",
        value: "118",
      },
      {
        label: "Diastolic",
        unit: "mmhg",
        value: "74",
      },
      {
        label: "SpO2",
        unit: "%",
        value: "99",
      },
      {
        label: "Weight",
        unit: "kgs",
        value: "68.0",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "22.9",
      },
    ],
  },
  {
    id: "d-22",
    dateLabel: "22 Jan'26",
    rows: [
      {
        label: "Temperature",
        unit: "Frh",
        value: "98.4",
      },
      {
        label: "Pulse",
        unit: "/min",
        value: "76",
      },
      {
        label: "Resp. Rate",
        unit: "/min",
        value: "17",
      },
      {
        label: "Systolic",
        unit: "mmhg",
        value: "116",
      },
      {
        label: "Diastolic",
        unit: "mmhg",
        value: "72",
      },
      {
        label: "SpO2",
        unit: "%",
        value: "99",
      },
      {
        label: "Weight",
        unit: "kgs",
        value: "67.8",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "22.8",
      },
    ],
  },
  {
    id: "d-20",
    dateLabel: "20 Jan'26",
    rows: [
      {
        label: "Temperature",
        unit: "Frh",
        value: "98.5",
      },
      {
        label: "Pulse",
        unit: "/min",
        value: "80",
      },
      {
        label: "Resp. Rate",
        unit: "/min",
        value: "18",
      },
      {
        label: "Systolic",
        unit: "mmhg",
        value: "119",
      },
      {
        label: "Diastolic",
        unit: "mmhg",
        value: "75",
      },
      {
        label: "SpO2",
        unit: "%",
        value: "98",
      },
      {
        label: "Weight",
        unit: "kgs",
        value: "68.2",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "23.0",
      },
    ],
  },
];
function VitalsDateCard({ block, expanded, onToggle }) {
  const { headerRef, isStuck } = useStickyHeaderState();
  return (
    <div className={layout.accCard} style={tpSectionCardStyle}>
      <button
        type="button"
        ref={headerRef}
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
          <p className={layout.accTitle}>{block.dateLabel}</p>
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
      {expanded
        ? block.rows.map((row) => (
            <div className={layout.vitalsRow}>
              <span className={layout.vitalsLabel}>
                {row.label}{" "}
                <span className={layout.vitalsUnit}>({row.unit})</span>
              </span>
              <span className={layout.vitalsValue}>{row.value}</span>
            </div>
          ))
        : null}
    </div>
  );
}
export function VitalsContent() {
  const [expandedByDate, setExpandedByDate] = useState({
    "today-27": true,
    "d-26": false,
    "d-24": false,
    "d-22": false,
    "d-20": false,
  });
  return (
    <div className={layout.pageRoot}>
      <ActionButton label="Add/Edit Details" icon="plus" />
      <div className={layout.scrollFlex} data-sticky-scroll-root="true">
        <div className={layout.innerStack}>
          {VITALS_BY_DATE.map((block) => (
            <VitalsDateCard
              block={block}
              expanded={Boolean(expandedByDate[block.id])}
              onToggle={() =>
                setExpandedByDate((prev) => ({
                  ...prev,
                  [block.id]: !prev[block.id],
                }))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
