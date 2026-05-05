/**
 * Vitals content panel with per-date accordion.
 * Each date can expand/collapse and provides mock values.
 */
import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { ActionButton, useStickyHeaderState } from "../detail-shared";
import {
  HistoricalInlineTooltip,
  historicalInlineHighlightClass,
  historicalInlineTextClass,
  isHistoricalMetaLine,
  useHistoricalSectionHighlights } from
"../HistoricalInlineUpdates";
import { tpSectionCardStyle } from "../tokens";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import { vitalsByDate } from "@/src/components/organisms/rxpad/digitization/adapters";
import { getMockPatientHistory } from "@/src/components/organisms/rxpad/digitization/mock-payload";
import { FreshUpdateChip } from "../FreshUpdateChip";















function getHighlightedVitalCount(block) {
  return block.rows.filter((row) => row.isHighlighted).length;
}

/**
 * Vitals are sourced from the AI digitization payload (one prescription per
 * visit). The adapter fans the schema's `vitalsAndBodyComposition` object out
 * into the per-date blocks the UI renders. Voice-transcription overlays
 * (`buildTodayVitals`) still apply on top of "today" for live updates.
 */
function loadVitalsByDate() {
  return vitalsByDate(getMockPatientHistory()).map((block) => ({
    id: block.id,
    dateLabel: block.dateLabel,
    rows: block.rows.map((row) => ({
      label: row.label,
      unit: row.unit,
      value: row.value
    }))
  }));
}

function normalizeVitalLabel(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Compare a vital value against its reference range and return whether
 * it's high / low / in-range. Range definitions match the doctor-side
 * reference values shown in the EMR card. Returns `null` when the
 * label / value aren't recognised.
 */
function getVitalAbnormality(label, value) {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return null;
  const key = normalizeVitalLabel(label);
  switch (key) {
    case "systolic":
      if (num > 130) return "high";
      if (num < 90) return "low";
      return null;
    case "diastolic":
      if (num > 85) return "high";
      if (num < 60) return "low";
      return null;
    case "pulse":
    case "heartrate":
      if (num > 100) return "high";
      if (num < 60) return "low";
      return null;
    case "temperature":
    case "temp":
      if (num > 99.5) return "high";
      if (num < 97) return "low";
      return null;
    case "resprate":
    case "respiratoryrate":
      if (num > 20) return "high";
      if (num < 12) return "low";
      return null;
    case "spo2":
      if (num < 95) return "low";
      return null;
    default:
      return null;
  }
}

function buildTodayVitals(
baseBlocks,
lines)
{
  const next = baseBlocks.map((block) => ({
    ...block,
    rows: block.rows.map((row) => ({ ...row }))
  }));
  const today = next[0];
  if (!today) return next;

  lines.forEach((line) => {
    const text = line.text.trim();
    if (!text || isHistoricalMetaLine(text)) return;

    const matchers = [
    { keys: ["bp", "bloodpressure"], label: "Systolic", unit: "mmhg", value: undefined },
    { keys: ["pulse", "heartrate", "hr"], label: "Pulse", unit: "/min", value: undefined },
    { keys: ["temperature", "temp"], label: "Temperature", unit: "Frh", value: undefined },
    { keys: ["spo2", "oxygensaturation", "o2sat"], label: "SpO2", unit: "%", value: undefined },
    { keys: ["resprate", "resprate", "respiratoryrate", "rr"], label: "Resp. Rate", unit: "/min", value: undefined },
    { keys: ["weight"], label: "Weight", unit: "kgs", value: undefined }];


    const normalized = normalizeVitalLabel(text);
    if (normalized.includes("bp") || normalized.includes("bloodpressure")) {
      const bp = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (bp) {
        const systolic = today.rows.find((row) => normalizeVitalLabel(row.label) === "systolic");
        const diastolic = today.rows.find((row) => normalizeVitalLabel(row.label) === "diastolic");
        if (systolic) {
          systolic.value = bp[1];
          systolic.isHighlighted = true;
          systolic.isFresh = line.isFresh;
        }
        if (diastolic) {
          diastolic.value = bp[2];
          diastolic.isHighlighted = true;
          diastolic.isFresh = line.isFresh;
        }
      }
      return;
    }

    const matchedConfig = matchers.find((matcher) => matcher.keys.some((key) => normalized.includes(key)));
    if (!matchedConfig) return;

    const rawValue =
    text.match(/(\d{2,3}(?:\.\d+)?)/)?.[1] ??
    text.split(":").slice(1).join(":").trim() ??
    "";
    if (!rawValue) return;

    const row = today.rows.find((entry) => normalizeVitalLabel(entry.label) === normalizeVitalLabel(matchedConfig.label));
    if (row) {
      row.value = rawValue;
      row.isHighlighted = true;
      row.isFresh = line.isFresh;
      return;
    }

    today.rows.push({
      label: matchedConfig.label,
      unit: matchedConfig.unit,
      value: rawValue,
      isHighlighted: true,
      isFresh: line.isFresh
    });
  });

  return next;
}

function VitalsDateCard({
  block,
  expanded,
  onToggle,
  showTooltipOnFirstOpen,
  shimmerActive










}) {
  const { headerRef, isStuck } = useStickyHeaderState();
  const firstHighlightedIndex = block.rows.findIndex((row) => row.isHighlighted);
  const highlightedCount = getHighlightedVitalCount(block);
  const hasHighlightedRows = highlightedCount > 0;

  return (
    <div
      className="group/date-card relative shrink-0 w-full overflow-hidden"
      style={tpSectionCardStyle}>
      
      <button
        type="button"
        ref={headerRef}
        onClick={onToggle}
        className={clsx(
          "group relative bg-tp-slate-100 sticky top-0 z-[2] shrink-0 w-full text-left",
          expanded ?
          isStuck ?
          "rounded-tl-none rounded-tr-none" :
          "rounded-tl-[10px] rounded-tr-[10px]" :
          "rounded-[10px]",
          !expanded &&
          hasHighlightedRows &&
          "before:absolute before:left-0 before:top-[5px] before:bottom-[5px] before:w-[2px] before:rounded-full before:bg-[linear-gradient(180deg,rgba(213,101,234,0.08)_0%,rgba(213,101,234,0.82)_46%,rgba(103,58,172,0.32)_100%)] after:absolute after:left-[-3px] after:top-[4px] after:bottom-[4px] after:w-[10px] after:rounded-full after:bg-[linear-gradient(180deg,rgba(213,101,234,0)_0%,rgba(213,101,234,0.12)_40%,rgba(103,58,172,0.16)_58%,rgba(103,58,172,0)_100%)] after:blur-[5px]"
        )}>
        
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex items-center justify-between px-[10px] py-[8px] relative w-full">
            <div className="flex min-w-0 items-center gap-[8px]">
            <p className="font-['Inter',sans-serif] font-semibold leading-[20px] not-italic text-tp-slate-700 text-[14px] tracking-[0.012px] whitespace-nowrap">
              {block.dateLabel}
            </p>
            {!expanded && hasHighlightedRows ?
              <FreshUpdateChip count={highlightedCount} /> :
              null}
            </div>
            <div className="flex items-center gap-1.5">
            <span className="opacity-0 transition-opacity group-hover/date-card:opacity-100">
                <AiTriggerIcon
                  tooltip={`Summarize vitals from ${block.dateLabel}`}
                  signalLabel={`Summarize ${block.dateLabel} vitals`}
                  sectionId="vitals"
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
        </div>
      </button>

      {expanded ?
      block.rows.map((row, index) => {
        const rowNode =
        <div
          className={clsx(
            "flex items-center justify-between bg-white px-[12px] py-[8px]",
            historicalInlineHighlightClass(row.isHighlighted, row.isFresh)
          )}>
          
                <span className="font-sans text-[14px] leading-[20px] text-tp-slate-700">
                  <span className={historicalInlineTextClass(row.isHighlighted, row.isFresh, false, shimmerActive)}>
                    {row.label}
                  </span>{" "}
                  <span className={clsx("text-[14px] leading-[20px] text-tp-slate-400", historicalInlineTextClass(row.isHighlighted, row.isFresh, false, shimmerActive))}>
                    ({row.unit})
                  </span>
                </span>
                {(() => {
            const dir = getVitalAbnormality(row.label, row.value);
            return (
              <span
                className={clsx(
                  // Hugs its own content (no fixed min-width)
                  // so the arrow + value sit snug; the inline-
                  // flex row keeps the glyph from wrapping.
                  "flex shrink-0 items-center gap-[4px] whitespace-nowrap font-sans font-semibold text-[14px] leading-[20px]",
                  dir ? "text-tp-error-500" : "text-tp-slate-700",
                  // Non-abnormal: AI gradient shimmer.
                  // Abnormal: subtle WHITE shimmer over the red.
                  !dir && historicalInlineTextClass(row.isHighlighted, row.isFresh, false, shimmerActive),
                  dir && row.isHighlighted && row.isFresh && shimmerActive && "tp-historical-red-shimmer"
                )}>
                
                      {/* Red ↑/↓ glyph on the LEFT of the value when
                    the vital is outside reference range. */}
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
                      {row.value}
                    </span>);

          })()}
              </div>;


        return (
          <HistoricalInlineTooltip
            key={`${block.id}-${row.label}`}
            enabled={Boolean(row.isHighlighted && row.isFresh && showTooltipOnFirstOpen && index === firstHighlightedIndex)}>
            
                {rowNode}
              </HistoricalInlineTooltip>);

      }) :
      null}
    </div>);

}

export function VitalsContent() {
  const { lines, showTooltipOnFirstOpen, isShimmerPhaseActive } = useHistoricalSectionHighlights("vitals");
  const baseBlocks = useMemo(loadVitalsByDate, []);
  const blocks = buildTodayVitals(baseBlocks, lines);
  const [expandedByDate, setExpandedByDate] = useState(() =>
  Object.fromEntries(baseBlocks.map((b, i) => [b.id, i === 0]))
  );

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="vitals" />
      <div className="flex-[1_0_0] min-h-px min-w-px relative w-full overflow-y-auto" data-sticky-scroll-root="true">
        <div className="content-stretch flex flex-col gap-[12px] items-start p-[12px] w-full">
          {blocks.map((block) =>
          <VitalsDateCard
            key={block.id}
            block={block}
            expanded={Boolean(expandedByDate[block.id])}
            showTooltipOnFirstOpen={showTooltipOnFirstOpen}
            shimmerActive={isShimmerPhaseActive}
            onToggle={() =>
            setExpandedByDate((prev) => ({
              ...prev,
              [block.id]: !prev[block.id]
            }))
            } />

          )}
        </div>
      </div>
    </div>);

}