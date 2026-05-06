"use client";

import React, { useState } from "react";
import { cn, safeClipboardWrite } from "@/src/hooks/utils";
import { useTouchDevice } from "@/src/hooks/use-touch-device";
import { CardShell } from "../CardShell";
import { CopyIcon } from "../CopyIcon";
import { ActionableTooltip } from "../ActionableTooltip";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/atoms/Tooltip";
import { DocumentText } from "iconsax-reactjs";










/** Format a VoiceRxItem to a plain text string for clipboard copy */
function formatVoiceItem(item) {
  return item.detail ? `${item.name} (${item.detail})` : item.name;
}

/**
 * Build a minimal RxPadCopyPayload for a single item (or list of items)
 * scoped to one section. Used by per-item / per-section Copy actions
 * so the doctor can sync individual rows to the RxPad — earlier the
 * per-item icon only wrote to clipboard and the section icon was
 * filtered out by the empty payload.
 */
function buildSectionPayload(sectionId, items) {
  const labels = items.map(formatVoiceItem);
  const base = {
    sourceDateLabel: "Voice consult",
    targetSection: "rxpad"
  };
  switch (sectionId) {
    case "symptoms":
      return { ...base, symptoms: labels };
    case "examination":
    case "examinations":
      return { ...base, examinations: labels };
    case "diagnosis":
    case "diagnoses":
      return { ...base, diagnoses: labels };
    case "advice":
      return { ...base, advice: labels.join("\n") };
    case "investigation":
    case "investigations":
    case "lab":
    case "labInvestigations":
      return { ...base, labInvestigations: labels };
    case "followUp":
    case "follow_up":
      return { ...base, followUp: labels.join("; ") };
    case "history":
      return { ...base, historyChangeSummaries: labels };
    case "medication":
    case "medications":
      // We don't have structured fields here, so push the readable
      // composed string as a medication "note" until the Voice parser
      // emits structured medication seeds.
      return {
        ...base,
        medications: items.map((it) => ({
          medicine: it.name,
          unitPerDose: "",
          frequency: "",
          when: "",
          duration: "",
          note: it.detail ?? ""
        }))
      };
    default:
      // Catch-all: drop into additionalNotes so nothing is lost.
      return { ...base, additionalNotes: labels.join("\n") };
  }
}

export function VoiceStructuredRxCard({ data, onCopy, onExpand, hideHeader, isStale = false }) {
  const isTouch = useTouchDevice();
  const [copiedKey, setCopiedKey] = useState(null);

  // Canvas mode = the header-less embed inside VoiceRxCanvas. In that
  // surface we always show section-level copy affordances so the doctor
  // doesn't have to discover them on hover. The first-time educational
  // coachmark for this surface lives in VoiceRxCanvas (anchored to its
  // footer), not here — keeps this component about content, not nudges.
  const isCanvasMode = !!hideHeader;

  const handleCopyItem = (sectionId, item, key) => {
    safeClipboardWrite(formatVoiceItem(item));
    onCopy?.(buildSectionPayload(sectionId, [item]));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleCopySection = (sectionId, items) => {
    const text = items.map(formatVoiceItem).join("\n");
    safeClipboardWrite(text);
    onCopy?.(buildSectionPayload(sectionId, items));
    setCopiedKey(`section-${sectionId}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleExpand = () => {
    if (onExpand) {
      onExpand();
    } else {
      window.dispatchEvent(new CustomEvent("open-voicerx", { detail: { data } }));
    }
  };

  const innerContent =
  <div className="flex flex-col gap-[8px]">
        {/* Structured sections */}
        {data.sections.map((section) =>
    <div key={section.sectionId}>
            {/* Section header bar with hover copy icon */}
            <SectionSummaryBar
        label={section.title}
        icon={section.tpIconName}
        trailing={
        copiedKey === `section-${section.sectionId}` ?
        <TooltipProvider delayDuration={120}>
                    <Tooltip open>
                      <TooltipTrigger asChild>
                        <span className="vrx-filled-flash inline-flex items-center gap-[3px] text-[12px] font-semibold text-tp-success-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Filled
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6} className="rounded-[6px] border-0 bg-tp-slate-900 px-2.5 py-1.5 text-[12px] leading-[1.4] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)]">
                        {section.title} filled into RxPad
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider> :

        <span
          className="transition-opacity opacity-100">
          
                    <ActionableTooltip
            label={`Fill ${section.title.toLowerCase()} to RxPad`}
            onAction={() => handleCopySection(section.sectionId, section.items)}>
            
                      <CopyIcon size={14} onClick={() => handleCopySection(section.sectionId, section.items)} />
                    </ActionableTooltip>
                  </span>

        } />
      

            {/* Bullet items with per-item hover copy — structured name (detail) format */}
            <ul className="mt-1 flex flex-col gap-[2px] pl-1">
              {section.items.map((item, idx) => {
          const itemKey = `${section.sectionId}-${idx}`;
          return (
            <li
              key={idx}
              className="group/voice-item flex items-start gap-[6px] rounded-[4px] px-1 -mx-1 py-[2px] text-[14px] leading-[1.6] text-tp-slate-700 transition-colors hover:bg-tp-slate-50/80">
              
                    <span className="mt-[1px] flex-shrink-0 text-tp-slate-400">
                      •
                    </span>
                    {/* On touch the doctor taps the row text to surface
                   an actionable "Copy to Rx" tooltip — no inline
                   copy icon clutters every line. On desktop the
                   per-item copy icon stays as before. */}
                    {isTouch ?
              <ActionableTooltip
                label="Copy to Rx"
                onAction={() => handleCopyItem(section.sectionId, item, itemKey)}>
                
                        <span className="flex-1 cursor-pointer font-normal text-tp-slate-700">
                          {item.name}
                          {item.detail &&
                  <span className="ml-1 text-tp-slate-400">({item.detail})</span>
                  }
                        </span>
                      </ActionableTooltip> :

              <span className="flex-1 font-normal text-tp-slate-700">
                        {item.name}
                        {item.detail &&
                <span className="ml-1 text-tp-slate-400">({item.detail})</span>
                }
                      </span>
              }
                    {!isTouch &&
              <span className={cn("flex-shrink-0 transition-opacity", copiedKey === itemKey ? "opacity-100" : "opacity-0 group-hover/voice-item:opacity-100")}>
                        {copiedKey === itemKey ?
                <TooltipProvider delayDuration={120}>
                            <Tooltip open>
                              <TooltipTrigger asChild>
                                <span className="vrx-filled-flash inline-flex items-center gap-[3px] text-[12px] font-semibold text-tp-success-500">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  Filled
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={6} className="rounded-[6px] border-0 bg-tp-slate-900 px-2.5 py-1.5 text-[12px] leading-[1.4] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)]">
                                {section.title} filled into RxPad
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider> :

                <ActionableTooltip
                  label={`Fill to RxPad`}
                  onAction={() => handleCopyItem(section.sectionId, item, itemKey)}>
                  
                            <CopyIcon
                    size={14}
                    onClick={() => handleCopyItem(section.sectionId, item, itemKey)} />
                  
                          </ActionableTooltip>
                }
                      </span>
              }
                  </li>);

        })}
            </ul>
          </div>
    )}
    </div>;


  if (hideHeader) return innerContent;

  // Compact "Clinical Notes" preview card — header + a single
  // Copy-all CTA + the expand glyph back to the canvas.
  // We deliberately drop the time meta and the "N sections · M items"
  // count: the chat already carries the timestamp on the bubble itself,
  // and the count was visual noise the doctor never acted on. The card
  // now just says WHAT it is and HOW to use it.

  // Copy-all from chat: no per-section flash, just one batch call.
  const handleCopyAll = () => {
    onCopy?.(data.copyAllPayload);
    setCopiedKey("all");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div
      className={isStale ? "opacity-50 grayscale-[0.4] pointer-events-none select-none" : undefined}
      aria-disabled={isStale || undefined}>
      <CardShell
        icon={<DocumentText size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
        title={isStale ? "Structured Clinical Notes (outdated)" : "Structured Clinical Notes"}
        collapsible={false}
        dataSources={["Voice consultation"]}>

        {/* When this card is stale (a newer voice card exists below in
            the chat), suppress the expand CTA — the doctor has already
            iterated past this generation. */}
        {!isStale ? (
          <button
            type="button"
            onClick={handleExpand}
            className="flex h-[36px] w-full items-center justify-center gap-[6px] rounded-[10px] border px-3 text-[14px] font-semibold transition-all active:scale-[0.99] border-tp-blue-300 bg-white text-tp-blue-500 hover:bg-tp-blue-50">

            View clinical notes
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : (
          <p className="text-[12px] italic leading-[1.5] text-tp-slate-400">
            Replaced by a newer recording below.
          </p>
        )}
      </CardShell>
    </div>);

}