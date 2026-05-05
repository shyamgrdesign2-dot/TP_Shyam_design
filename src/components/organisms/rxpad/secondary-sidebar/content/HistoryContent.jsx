/**
 * Medical History content panel — always-open section cards.
 */
import React, { useMemo } from "react";
import clsx from "clsx";
import { ActionButton, SectionCard } from "../detail-shared";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import {
  HistoricalInlineTooltip,
  historicalInlineHighlightClass,
  historicalInlineTextClass,
  isHistoricalMetaLine,
  useHistoricalSectionHighlights } from
"../HistoricalInlineUpdates";
import { historySections } from "@/src/components/organisms/rxpad/digitization/adapters";
import { getMockPatientHistory } from "@/src/components/organisms/rxpad/digitization/mock-payload";









/**
 * Sections sourced from the AI digitization payload's `medicalHistory[]`,
 * grouped by `type`. The adapter aggregates entries across visits so the
 * sidebar shows the patient's full history, not just today's extraction.
 */
function loadHistorySections() {
  return historySections(getMockPatientHistory()).map((s) => ({
    id: s.id,
    title: s.title,
    items: s.items.map((item) => ({ name: item.name, detail: item.detail }))
  }));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalHistoryKey(value) {
  const normalized = normalizeText(value);
  if (/\btype 2 diabetes\b|\bdiabetes mellitus\b|\bdiabetes\b/.test(normalized)) return "type 2 diabetes";
  if (/\bhypertension\b|\bhigh blood pressure\b|\bhtn\b/.test(normalized)) return "hypertension";
  if (/\bdyslipidemia\b|\bdyslipidaemia\b|\bhyperlipidemia\b/.test(normalized)) return "dyslipidemia";
  if (/\bthyroid disorder\b|\bthyroid\b/.test(normalized)) return "thyroid disorder";
  if (/\bdust\b/.test(normalized)) return "dust";
  if (/\bibuprofen\b/.test(normalized)) return "ibuprofen";
  if (/\bsmoking\b|\bsmoker\b/.test(normalized)) return "smoking";
  if (/\balcohol\b|\bdrinking\b/.test(normalized)) return "alcohol";
  if (/\bdiet\b|\bmeal\b/.test(normalized)) return "diet";
  return normalized;
}

function mergeDetailWithChange(current, change) {
  const arrowMatch = change.match(/(.+?)\s*→\s*(.+)/);
  if (arrowMatch) {
    const from = arrowMatch[1].replace(/^updated\s*/i, "").trim();
    const to = arrowMatch[2].trim();
    if (!current) return to;

    if (from) {
      const re = new RegExp(escapeRegExp(from), "i");
      if (re.test(current)) {
        return current.replace(re, to);
      }
    }

    const parts = current.split("|").map((part) => part.trim()).filter(Boolean);
    if (parts.length) {
      parts[parts.length - 1] = to;
      return parts.join(" | ");
    }

    return to;
  }

  const cleaned = change.replace(/^updated\s*→\s*/i, "").trim();
  return cleaned || current;
}

function mergeMatchingHistoryItem(
sections,
subject,
change,
isFresh)
{
  const normalizedSubject = canonicalHistoryKey(subject);
  let matched = false;

  sections.forEach((section) => {
    section.items = section.items.map((item) => {
      const normalizedName = canonicalHistoryKey(item.name);
      const isMatch =
      normalizedSubject.length >= 3 && (
      normalizedName.includes(normalizedSubject) || normalizedSubject.includes(normalizedName));

      if (!isMatch) return item;
      matched = true;

      return {
        ...item,
        detail: change ? mergeDetailWithChange(item.detail, change) : item.detail,
        isHighlighted: true,
        isFresh: item.isFresh || isFresh
      };
    });
  });

  return matched;
}

function fallbackHistorySectionId(text) {
  const lower = text.toLowerCase();
  if (/(allerg|ibuprofen|dust|drug reaction)/i.test(lower)) return "allergies";
  if (/(father|mother|maternal|paternal|family)/i.test(lower)) return "family";
  if (/(appendectomy|arthroscopy|surgery|procedure|operative)/i.test(lower)) return "surgical";
  if (/(smoking|alcohol|tobacco|sleep|diet|exercise|lifestyle)/i.test(lower)) return "lifestyle";
  if (/(diabetes|hypertension|dyslipidemia|thyroid|asthma|pcos|condition)/i.test(lower)) return "medical";
  return "additional";
}

function buildHistoryItemFromLine(text) {
  const prefixed = text.match(/^(Added|Updated):\s*(.+)$/i);
  if (prefixed) {
    return { name: prefixed[2].trim(), isHighlighted: true, isFresh: true };
  }
  const separatorIndex = text.indexOf(":");
  if (separatorIndex === -1) {
    return { name: text, isHighlighted: true, isFresh: true };
  }
  return {
    name: text.slice(0, separatorIndex).trim(),
    detail: text.slice(separatorIndex + 1).trim(),
    isHighlighted: true,
    isFresh: true
  };
}

function applyHistoryHighlights(baseSections, lines) {
  const nextSections = baseSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item }))
  }));

  lines.forEach((line) => {
    const text = line.text.trim();
    if (!text || isHistoricalMetaLine(text)) {
      return;
    }

    const prefixed = text.match(/^(Added|Updated):\s*(.+)$/i);
    if (prefixed) {
      const body = prefixed[2].trim();
      const separatorIndex = body.indexOf(":");
      const subject = separatorIndex === -1 ? body : body.slice(0, separatorIndex).trim();
      const change = separatorIndex === -1 ? undefined : body.slice(separatorIndex + 1).trim();

      if (!mergeMatchingHistoryItem(nextSections, subject, change, line.isFresh)) {
        const sectionId = fallbackHistorySectionId(body);
        const section = nextSections.find((entry) => entry.id === sectionId);
        if (section) {
          section.items.push({
            ...buildHistoryItemFromLine(text),
            isFresh: line.isFresh
          });
        }
      }
      return;
    }

    const separatorIndex = text.indexOf(":");
    if (separatorIndex === -1) {
      if (mergeMatchingHistoryItem(nextSections, text, undefined, line.isFresh)) {
        return;
      }
      const sectionId = fallbackHistorySectionId(text);
      const section = nextSections.find((entry) => entry.id === sectionId);
      if (section) {
        section.items.push({
          ...buildHistoryItemFromLine(text),
          isFresh: line.isFresh
        });
      }
      return;
    }

    const subject = text.slice(0, separatorIndex).trim();
    const change = text.slice(separatorIndex + 1).trim();
    const matched = mergeMatchingHistoryItem(nextSections, subject, change, line.isFresh);

    if (!matched) {
      const sectionId = fallbackHistorySectionId(text);
      const section = nextSections.find((entry) => entry.id === sectionId);
      if (section) {
        section.items.push({
          ...buildHistoryItemFromLine(text),
          isFresh: line.isFresh
        });
      }
    }
  });

  return nextSections;
}

function HistoryCard({
  title,
  items,
  showTooltipOnFirstOpen,
  shimmerActive






}) {
  const firstHighlightedIndex = items.findIndex((item) => item.isHighlighted);

  return (
    <SectionCard
      title={title}
      hideChevron
      titleAddon={
      <AiTriggerIcon
        tooltip={`Summarize ${title.toLowerCase()}`}
        signalLabel={`Summarize ${title.toLowerCase()}`}
        sectionId="history"
        size={12} />

      }>
      
      {/* Bullet list — same shape as Past Visits' ListSection so the doctor's
           eye reads both surfaces with the same scanning pattern: one item per
           line, name dark, bracketed values muted on the same row. */}
      <ul className="bg-white px-[12px] py-[12px] pl-[26px] flex flex-col gap-[6px] list-disc marker:text-tp-slate-500">
        {items.map((item, index) => {
          const row =
          <li
            key={`${title}-${item.name}`}
            className={clsx(
              "text-[14px] leading-[20px] text-tp-slate-700",
              historicalInlineHighlightClass(item.isHighlighted, item.isFresh)
            )}>
            
              <span className="font-sans font-medium">
                <span className={historicalInlineTextClass(item.isHighlighted, item.isFresh, false, shimmerActive)}>
                  {item.name}
                </span>
              </span>
              {item.detail ?
            <span className="ml-1 font-sans text-tp-slate-500">
                  <span className={historicalInlineTextClass(item.isHighlighted, item.isFresh, false, shimmerActive)}>
                    ({item.detail})
                  </span>
                </span> :
            null}
            </li>;


          return (
            <HistoricalInlineTooltip
              key={`${title}-${item.name}`}
              enabled={Boolean(item.isHighlighted && item.isFresh && showTooltipOnFirstOpen && index === firstHighlightedIndex)}>
              
              {row}
            </HistoricalInlineTooltip>);

        })}
      </ul>
    </SectionCard>);

}

export function HistoryContent() {
  const { lines, showTooltipOnFirstOpen, isShimmerPhaseActive } = useHistoricalSectionHighlights("history");
  const baseSections = useMemo(loadHistorySections, []);
  const nextSections = applyHistoryHighlights(baseSections, lines);
  const firstTooltipSectionId = nextSections.find((section) => section.items.some((item) => item.isHighlighted))?.id;

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="history" />
      <div className="overflow-x-clip overflow-y-auto size-full" data-sticky-scroll-root="true">
        {/* Section heading — clarifies that the cards below are the
             patient's full Medical History, broken into the six canonical
             groups (Medical Conditions, Allergies, Family History,
             Surgeries, Lifestyle, Additional Notes). */}
        <div className="px-[12px] pt-[12px] pb-[6px]">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-tp-slate-500">
            Medical History
          </h3>
        </div>
        <div className="content-stretch flex flex-col gap-[12px] items-start px-[12px] pb-[12px] w-full">
          {nextSections.map((section) =>
          <HistoryCard
            key={section.id}
            title={section.title}
            items={section.items}
            shimmerActive={isShimmerPhaseActive}
            showTooltipOnFirstOpen={Boolean(showTooltipOnFirstOpen && section.id === firstTooltipSectionId)} />

          )}
        </div>
      </div>
    </div>);

}