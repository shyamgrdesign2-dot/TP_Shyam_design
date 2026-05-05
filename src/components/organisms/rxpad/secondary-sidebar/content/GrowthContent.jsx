/**
 * Growth content panel — date-based expandable cards.
 */
import React, { useState } from "react";
import clsx from "clsx";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { ActionButton, useStickyHeaderState } from "../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import { HistoricalNewDataBanner } from "../HistoricalNewDataBanner";




const GROWTH_ENTRIES = [
{
  id: "g-27",
  dateLabel: "27 Jan'26",
  rows: [
  { label: "Age", unit: "years", value: "3" },
  { label: "Height", unit: "cm", value: "130" },
  { label: "Weight", unit: "kg", value: "12.8" },
  { label: "BMI", unit: "kg/m²", value: "24.2" },
  { label: "OFC", unit: "cm", value: "49" }]

},
{
  id: "g-26",
  dateLabel: "26 Jan'26",
  rows: [
  { label: "Age", unit: "years", value: "3" },
  { label: "Height", unit: "cm", value: "129.8" },
  { label: "Weight", unit: "kg", value: "12.6" },
  { label: "BMI", unit: "kg/m²", value: "24.0" },
  { label: "OFC", unit: "cm", value: "49" }]

},
{
  id: "g-24",
  dateLabel: "24 Jan'26",
  rows: [
  { label: "Age", unit: "years", value: "3" },
  { label: "Height", unit: "cm", value: "129.5" },
  { label: "Weight", unit: "kg", value: "12.5" },
  { label: "BMI", unit: "kg/m²", value: "23.8" },
  { label: "OFC", unit: "cm", value: "48.8" }]

},
{
  id: "g-22",
  dateLabel: "22 Jan'26",
  rows: [
  { label: "Age", unit: "years", value: "3" },
  { label: "Height", unit: "cm", value: "129.3" },
  { label: "Weight", unit: "kg", value: "12.4" },
  { label: "BMI", unit: "kg/m²", value: "23.7" },
  { label: "OFC", unit: "cm", value: "48.8" }]

},
{
  id: "g-20",
  dateLabel: "20 Jan'26",
  rows: [
  { label: "Age", unit: "years", value: "3" },
  { label: "Height", unit: "cm", value: "129.1" },
  { label: "Weight", unit: "kg", value: "12.3" },
  { label: "BMI", unit: "kg/m²", value: "23.6" },
  { label: "OFC", unit: "cm", value: "48.7" }]

}];


// `SeeChartButton` retired in favour of the shared `Add/Edit Details`
// CTA used by every other section (Vitals, Gynec, Obstetric, Vaccine).
// The growth-chart visualization itself will land in a follow-up; for
// now the doctor enters/edits values via the same affordance pattern
// they already learned elsewhere in the rail.

function GrowthDateCard({
  entry,
  expanded,
  onToggle




}) {
  const { headerRef, isStuck } = useStickyHeaderState();

  return (
    <div className="group/date-card relative shrink-0 w-full" style={tpSectionCardStyle}>
      <button
        ref={headerRef}
        type="button"
        onClick={onToggle}
        className={clsx(
          "group bg-tp-slate-100 sticky top-0 z-[2] shrink-0 w-full text-left",
          expanded ?
          isStuck ?
          "rounded-tl-none rounded-tr-none" :
          "rounded-tl-[10px] rounded-tr-[10px]" :
          "rounded-[10px]"
        )}>
        
        <div className="content-stretch flex items-center justify-between px-[10px] py-[8px] w-full">
          <p className="font-['Inter',sans-serif] font-semibold leading-[20px] text-tp-slate-700 text-[14px] whitespace-nowrap">
            {entry.dateLabel}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="opacity-0 transition-opacity group-hover/date-card:opacity-100">
              <AiTriggerIcon
                tooltip={`Summarize growth from ${entry.dateLabel}`}
                signalLabel={`Summarize ${entry.dateLabel} growth`}
                sectionId="growth"
                size={12}
                as="span" />
              
            </span>
            <div className="relative shrink-0 size-[18px]">
              {expanded ?
              <ArrowSquareUp color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" /> :

              <ArrowSquareDown color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" />
              }
            </div>
          </div>
        </div>
      </button>

      {expanded ?
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
          {entry.rows.map((row) =>
        <div
          key={`${entry.id}-${row.label}`}
          className="flex w-full items-center justify-between gap-3 bg-white px-[12px] py-[8px]">
          
              <span className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-tp-slate-700">
                {row.label} <span className="text-[14px] leading-[20px] text-tp-slate-500">({row.unit})</span>
              </span>
              <span className="shrink-0 text-right font-sans font-semibold text-[14px] leading-[20px] text-tp-slate-700 whitespace-nowrap">{row.value}</span>
            </div>
        )}
        </div> :
      null}
    </div>);

}

export function GrowthContent() {
  const [expandedState, setExpandedState] = useState(() =>
  Object.fromEntries(GROWTH_ENTRIES.map((entry, index) => [entry.id, index === 0]))
  );

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="growth" />
      <HistoricalNewDataBanner activeId="growth" />
      <div className="flex-[1_0_0] min-h-px min-w-px overflow-y-auto relative w-full" data-sticky-scroll-root="true">
        <div className="content-stretch flex flex-col gap-[12px] items-center p-[12px] relative w-full">
          {GROWTH_ENTRIES.map((entry) =>
          <GrowthDateCard
            key={entry.id}
            entry={entry}
            expanded={Boolean(expandedState[entry.id])}
            onToggle={() => {
              setExpandedState((prev) => ({
                ...prev,
                [entry.id]: !prev[entry.id]
              }));
            }} />

          )}
        </div>
      </div>
    </div>);

}