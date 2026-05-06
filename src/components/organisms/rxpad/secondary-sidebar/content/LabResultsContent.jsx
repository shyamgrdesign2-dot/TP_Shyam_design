/**
 * Lab Results content panel — date-based expandable cards.
 */
import React, { useState } from "react";
import { cn as clsx } from "@/src/hooks/utils";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { ActionButton, useStickyHeaderState } from "../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import { AiTriggerIcon } from "@/src/components/organisms/rxpad/dr-agent/shared/AiTriggerIcon";
import {
  HistoricalInlineTooltip,
  historicalInlineHighlightClass,
  historicalInlineTextClass,
  isHistoricalMetaLine,
  useHistoricalSectionHighlights } from
"../HistoricalInlineUpdates";




















const BASE_ROWS = [
{ label: "Haemoglobin", unit: "(g/dL)", value: "11.2" },
{ label: "Neutrophils", unit: "(%)", value: "62" },
{ label: "WBC Count", unit: "(cells/mm³)", value: "7800" },
{ label: "TSH", unit: "(mIU/L)", value: "5.2", abnormal: true, direction: "high" },
{ label: "T3", unit: "(ng/dL)", value: "102" },
{ label: "Iron, Serum", unit: "(µg/dL)", value: "76" },
{ label: "UIBC", unit: "(µg/dL)", value: "365", abnormal: true, direction: "high" },
{ label: "TIBC", unit: "(µg/dL)", value: "441" },
{ label: "Vitamin D", unit: "(ng/mL)", value: "20", abnormal: true, direction: "low" },
{ label: "Calcium, Total", unit: "(mg/dL)", value: "9.4" },
{ label: "Phosphorus", unit: "(mg/dL)", value: "4.0" },
{ label: "Magnesium", unit: "(mg/dL)", value: "2.2" },
{ label: "Cholesterol, Total", unit: "(mg/dL)", value: "220", abnormal: true, direction: "high" },
{ label: "Triglycerides", unit: "(mg/dL)", value: "150" },
{ label: "HDL", unit: "(mg/dL)", value: "45", abnormal: true, direction: "low" },
{ label: "LDL", unit: "(mg/dL)", value: "130", abnormal: true, direction: "high" },
{ label: "Glucose", unit: "(mg/dL)", value: "116", abnormal: true, direction: "high" }];


const LAB_ENTRIES = [
{ id: "l-27", dateLabel: "27 Jan'26", rows: BASE_ROWS },
{
  id: "l-26",
  dateLabel: "26 Jan'26",
  rows: BASE_ROWS.map((row, index) =>
  index % 4 === 0 ?
  { ...row, value: (Number.parseFloat(row.value) * 0.98).toFixed(1) } :
  row
  )
},
{
  id: "l-24",
  dateLabel: "24 Jan'26",
  rows: BASE_ROWS.map((row, index) =>
  index % 5 === 0 ?
  { ...row, value: (Number.parseFloat(row.value) * 1.02).toFixed(1) } :
  row
  )
},
{
  id: "l-22",
  dateLabel: "22 Jan'26",
  rows: BASE_ROWS.map((row, index) =>
  index % 3 === 0 ?
  { ...row, value: (Number.parseFloat(row.value) * 1.01).toFixed(1) } :
  row
  )
},
{
  id: "l-20",
  dateLabel: "20 Jan'26",
  rows: BASE_ROWS.map((row, index) =>
  index % 6 === 0 ?
  { ...row, value: (Number.parseFloat(row.value) * 0.97).toFixed(1) } :
  row
  )
}];


function normalizeLabLabel(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseLabSegment(segment) {
  const [rawLabel, rawValue] = segment.includes(":") ?
  segment.split(/:\s*/, 2) :
  [segment, ""];

  const value = rawValue.trim();
  const labelPart = rawLabel.replace(/^•\s*/, "").trim();
  const flagMatch = labelPart.match(/\[(high|low|critical|abnormal)\]\s*$/i);
  const cleanedLabelPart = labelPart.replace(/\[(high|low|critical|abnormal)\]\s*$/i, "").trim();
  const unitMatch = cleanedLabelPart.match(/\(([^)]+)\)\s*$/);
  const cleanLabel = cleanedLabelPart.replace(/\(([^)]+)\)\s*$/, "").trim();

  return {
    label: cleanLabel,
    unit: unitMatch ? `(${unitMatch[1].trim()})` : "",
    value,
    abnormal: Boolean(flagMatch && flagMatch[1].toLowerCase() !== "normal")
  };
}

function buildTodayLabEntries(lines) {
  const next = LAB_ENTRIES.map((entry) => ({
    ...entry,
    rows: entry.rows.map((row) => ({ ...row }))
  }));
  const today = next[0];
  if (!today) return next;

  lines.forEach((line) => {
    const text = line.text.trim();
    if (!text || isHistoricalMetaLine(text)) return;

    const core = text.replace(/^labs?:/i, "").trim();
    const segments = core.split(/,\s*/).map((segment) => segment.trim()).filter(Boolean);

    segments.forEach((segment) => {
      const { label, unit, value, abnormal } = parseLabSegment(segment);
      if (!label) return;

      const row = today.rows.find((entry) => normalizeLabLabel(entry.label) === normalizeLabLabel(label));
      if (row) {
        row.isHighlighted = true;
        row.isFresh = line.isFresh;
        if (value) row.value = value;
        if (unit) row.unit = unit;
        row.abnormal = abnormal || row.abnormal;
        return;
      }

      if (!value) return;

      today.rows.push({
        label,
        unit,
        value,
        abnormal,
        isHighlighted: true,
        isFresh: line.isFresh
      });
    });
  });

  return next;
}

function LabRow({
  label,
  unit,
  value,
  abnormal = false,
  direction,
  isHighlighted = false,
  isFresh = false
}) {
  const dir = abnormal ? direction ?? "high" : null;
  return (
    <div className={clsx("relative shrink-0 w-full", historicalInlineHighlightClass(isHighlighted, isFresh))}>
      <div className="content-stretch flex items-center justify-between px-[12px] py-[8px] w-full">
        <div className="flex items-baseline gap-[6px] min-w-0">
          <span className="font-sans font-normal text-tp-slate-700 text-[14px] tracking-[0.012px] leading-[20px] truncate">
            <span className={historicalInlineTextClass(isHighlighted, isFresh)}>{label}</span>
          </span>
          <span className={clsx("font-sans text-tp-slate-500 text-[14px] leading-[20px] whitespace-nowrap", historicalInlineTextClass(isHighlighted, isFresh))}>
            {unit}
          </span>
        </div>
        <span
          className={clsx(
            // Hugs its own content (no fixed min-width) — short values
            // like "84" stay snug next to the arrow. The arrow + value
            // share one inline-flex row so the glyph can't wrap.
            "flex shrink-0 items-center gap-[4px] whitespace-nowrap font-sans font-semibold text-[14px] leading-[20px]",
            abnormal ? "text-tp-error-500" : "text-tp-slate-700",
            // Non-abnormal: AI gradient shimmer.
            // Abnormal: subtle WHITE shimmer band over the red text so
            // the out-of-range state still reads as red while the row
            // is fresh.
            !abnormal && historicalInlineTextClass(isHighlighted, isFresh),
            abnormal && isHighlighted && isFresh && "tp-historical-red-shimmer"
          )}>
          
          {/* Red ↑/↓ glyph sits to the LEFT of the result value when
               the lab is outside its reference range — instantly tells
               the doctor whether the patient is over or under range. */}
          {dir ?
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            aria-label={dir === "high" ? "Above reference range" : "Below reference range"}>
            
              {dir === "high" ?
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /> :

            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            }
            </svg> :
          null}
          {value}
        </span>
      </div>
    </div>);

}

function LabDateCard({
  entry,
  expanded,
  onToggle,
  showTooltipOnFirstOpen





}) {
  const { headerRef, isStuck } = useStickyHeaderState();
  const firstHighlightedIndex = entry.rows.findIndex((row) => row.isHighlighted);

  return (
    <div className="group/date-card relative shrink-0 w-full overflow-hidden" style={tpSectionCardStyle}>
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
          <div className="flex items-center gap-[6px]">
            <span className="opacity-0 transition-opacity group-hover/date-card:opacity-100">
              <AiTriggerIcon
                tooltip={`Summarize labs from ${entry.dateLabel}`}
                signalLabel={`Summarize lab results from ${entry.dateLabel}`}
                sectionId="labResults"
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
          {entry.rows.map((row, index) => {
          const rowNode = <LabRow {...row} />;

          return (
            <HistoricalInlineTooltip
              key={`${entry.id}-${row.label}`}
              enabled={Boolean(row.isHighlighted && row.isFresh && showTooltipOnFirstOpen && index === firstHighlightedIndex)}>
              
                {rowNode}
              </HistoricalInlineTooltip>);

        })}
        </div> :
      null}
    </div>);

}

export function LabResultsContent() {
  const { lines, showTooltipOnFirstOpen } = useHistoricalSectionHighlights("labResults");
  const entries = buildTodayLabEntries(lines);
  const [expandedState, setExpandedState] = useState(() =>
  Object.fromEntries(LAB_ENTRIES.map((entry, index) => [entry.id, index === 0]))
  );

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="labResults" />
      <div className="flex-[1_0_0] min-h-px min-w-px overflow-y-auto relative w-full" data-sticky-scroll-root="true">
        <div className="content-stretch flex flex-col gap-[12px] items-start p-[12px] relative w-full">
          {entries.map((entry) =>
          <LabDateCard
            key={entry.id}
            entry={entry}
            expanded={Boolean(expandedState[entry.id])}
            showTooltipOnFirstOpen={showTooltipOnFirstOpen}
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