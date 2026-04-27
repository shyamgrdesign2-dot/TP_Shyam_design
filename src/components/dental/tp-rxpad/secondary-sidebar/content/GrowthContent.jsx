/**
 * Growth content panel — date-based expandable cards.
 */
import React, { useState } from "react";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { useStickyHeaderState } from "../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import layout from "./sidebarContentLayout.module.scss";
const GROWTH_ENTRIES = [
  {
    id: "g-27",
    dateLabel: "27 Jan'26",
    rows: [
      {
        label: "Age",
        unit: "years",
        value: "3",
      },
      {
        label: "Height",
        unit: "cm",
        value: "130",
      },
      {
        label: "Weight",
        unit: "kg",
        value: "12.8",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "24.2",
      },
      {
        label: "OFC",
        unit: "cm",
        value: "49",
      },
    ],
  },
  {
    id: "g-26",
    dateLabel: "26 Jan'26",
    rows: [
      {
        label: "Age",
        unit: "years",
        value: "3",
      },
      {
        label: "Height",
        unit: "cm",
        value: "129.8",
      },
      {
        label: "Weight",
        unit: "kg",
        value: "12.6",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "24.0",
      },
      {
        label: "OFC",
        unit: "cm",
        value: "49",
      },
    ],
  },
  {
    id: "g-24",
    dateLabel: "24 Jan'26",
    rows: [
      {
        label: "Age",
        unit: "years",
        value: "3",
      },
      {
        label: "Height",
        unit: "cm",
        value: "129.5",
      },
      {
        label: "Weight",
        unit: "kg",
        value: "12.5",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "23.8",
      },
      {
        label: "OFC",
        unit: "cm",
        value: "48.8",
      },
    ],
  },
  {
    id: "g-22",
    dateLabel: "22 Jan'26",
    rows: [
      {
        label: "Age",
        unit: "years",
        value: "3",
      },
      {
        label: "Height",
        unit: "cm",
        value: "129.3",
      },
      {
        label: "Weight",
        unit: "kg",
        value: "12.4",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "23.7",
      },
      {
        label: "OFC",
        unit: "cm",
        value: "48.8",
      },
    ],
  },
  {
    id: "g-20",
    dateLabel: "20 Jan'26",
    rows: [
      {
        label: "Age",
        unit: "years",
        value: "3",
      },
      {
        label: "Height",
        unit: "cm",
        value: "129.1",
      },
      {
        label: "Weight",
        unit: "kg",
        value: "12.3",
      },
      {
        label: "BMI",
        unit: "kg/m²",
        value: "23.6",
      },
      {
        label: "OFC",
        unit: "cm",
        value: "48.7",
      },
    ],
  },
];
function SeeChartButton() {
  return (
    <div className={layout.seeChartBar}>
      <div className={layout.seeChartHit}>
        <div aria-hidden="true" className={layout.seeChartOutline} />
        <div className={layout.seeChartCenter}>
          <div className={layout.seeChartInner}>
            <p className={layout.seeChartLabel}>See Chart</p>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={layout.seeChartChevron}
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="var(--tp-blue-500)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
function GrowthDateCard({ entry, expanded, onToggle }) {
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
            <div className={layout.growthRow}>
              <span className={layout.growthLabel}>
                {row.label}{" "}
                <span className={layout.growthUnit}>({row.unit})</span>
              </span>
              <span className={layout.growthValue}>{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
export function GrowthContent() {
  const [expandedState, setExpandedState] = useState(() =>
    Object.fromEntries(
      GROWTH_ENTRIES.map((entry, index) => [entry.id, index === 0]),
    ),
  );
  return (
    <div className={layout.pageRoot}>
      <SeeChartButton />
      <div className={layout.scrollFlex} data-sticky-scroll-root="true">
        <div className={`${layout.innerStack} ${layout.innerStackCenter}`}>
          {GROWTH_ENTRIES.map((entry) => (
            <GrowthDateCard
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
