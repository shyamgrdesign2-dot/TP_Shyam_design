/**
 * Gynec History content panel — always-open section cards.
 */
import React from "react";

import { ActionButton, SectionCard, SectionScrollArea } from "../detail-shared";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import {
  HistoricalInlineTooltip,
  historicalInlineHighlightClass,
  historicalInlineTextClass,
  isHistoricalMetaLine,
  useHistoricalSectionHighlights } from
"../HistoricalInlineUpdates";













const BASE_SECTIONS = [
{ id: "lmp", title: "LMP", lines: [{ text: "LMP: 15 Feb'26" }] },
{ id: "menarche", title: "Menarche", lines: [{ text: "Age at: 13 years" }] },
{ id: "cycle", title: "Cycle", lines: [{ text: "Type: Irregular | Interval: 35-40 days" }] },
{ id: "flow", title: "Flow", lines: [{ text: "Volume: Heavy | Duration: 5 days | Clots: Yes | Pads/day: 5" }] },
{ id: "pain", title: "Pain", lines: [{ text: "Severity: None | Occurrence: Before Menses" }] },
{ id: "lifecycle", title: "Lifecycle Hormonal Changes", lines: [{ text: "Stage: Perimenopause" }] },
{ id: "notes", title: "Notes", lines: [{ text: "Patient reports good medication adherence and tracks cycles on mobile app." }] }];


function pickGynecSection(text) {
  const lower = text.toLowerCase();
  if (/(lmp|last menstrual)/i.test(lower)) return "lmp";
  if (/(menarche|first period)/i.test(lower)) return "menarche";
  if (/(cycle|interval|regular|irregular)/i.test(lower)) return "cycle";
  if (/(flow|pads\/day|pads per day|clots|bleeding|duration)/i.test(lower)) return "flow";
  if (/(pain|dysmenorr|cramp)/i.test(lower)) return "pain";
  if (/(peri|meno|hormonal|lifecycle)/i.test(lower)) return "lifecycle";
  return "notes";
}

function buildGynecSections(lines) {
  const next = BASE_SECTIONS.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({ ...line }))
  }));

  lines.forEach((line) => {
    const text = line.text.trim();
    if (!text || isHistoricalMetaLine(text)) return;
    const sectionId = pickGynecSection(text);
    const section = next.find((entry) => entry.id === sectionId);
    if (!section) return;
    section.lines.push({
      text,
      isHighlighted: true,
      isFresh: line.isFresh
    });
  });

  return next;
}

/**
 * Parse a `"Label: value | Label: value"` line into structured segments so
 * each label can render in the muted color and each value in the darker
 * primary text color. Segments without a label fall back to the value
 * style. Used by Gynec / Obstetric / Antenatal where field labels matter.
 */
function parseLabelledSegments(text) {
  return text.
  split("|").
  map((s) => s.trim()).
  filter(Boolean).
  map((seg) => {
    const idx = seg.indexOf(":");
    if (idx === -1) return { value: seg };
    return { label: seg.slice(0, idx).trim(), value: seg.slice(idx + 1).trim() };
  });
}

function GynecLineRow({
  line,
  showTooltip



}) {
  const segments = parseLabelledSegments(line.text);

  const row =
  <div className={historicalInlineHighlightClass(line.isHighlighted, line.isFresh)}>
      <p className="whitespace-pre-wrap text-[14px] leading-[22px] text-tp-slate-700">
        <span className={historicalInlineTextClass(line.isHighlighted, line.isFresh)}>
          {segments.map((seg, i) =>
        <span key={i}>
              {i > 0 ? <span className="text-tp-slate-300"> | </span> : null}
              {seg.label ?
          <>
                  <span className="text-tp-slate-500">{seg.label}: </span>
                  <span className="font-medium text-tp-slate-700">{seg.value}</span>
                </> :

          <span className="text-tp-slate-700">{seg.value}</span>
          }
            </span>
        )}
        </span>
      </p>
    </div>;


  return (
    <HistoricalInlineTooltip enabled={showTooltip}>
      {row}
    </HistoricalInlineTooltip>);

}

export function GynecHistoryContent() {
  const { lines, showTooltipOnFirstOpen } = useHistoricalSectionHighlights("gynec");
  const sections = buildGynecSections(lines);
  const firstTooltipSectionId = sections.find((section) => section.lines.some((line) => line.isHighlighted))?.id;

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="gynec" />
      <SectionScrollArea>
        {sections.map((section) => {
          const firstHighlightedIndex = section.lines.findIndex((line) => line.isHighlighted);

          return (
            <SectionCard
              key={section.id}
              title={section.title}
              hideChevron
              titleAddon={
              <AiTriggerIcon
                tooltip={`Summarize ${section.title.toLowerCase()}`}
                signalLabel={`Summarize ${section.title.toLowerCase()}`}
                sectionId="gynec"
                size={12} />

              }>
              
              <div className="bg-white px-[12px] py-[12px] flex flex-col gap-[8px] w-full">
                {section.lines.map((line, index) => {
                  const showTooltip = Boolean(
                    line.isHighlighted &&
                    line.isFresh &&
                    showTooltipOnFirstOpen &&
                    section.id === firstTooltipSectionId &&
                    index === firstHighlightedIndex
                  );

                  return (
                    <GynecLineRow
                      key={`${section.id}-${index}`}
                      line={line}
                      showTooltip={showTooltip}
                    />
                  );
                })}
              </div>
            </SectionCard>);

        })}
      </SectionScrollArea>
    </div>);

}