/**
 * Past Visits content panel
 * - Supports per-date digital/written modes.
 * - Written Rx opens in a right sidebar PDF viewer.
 * - Copy affordances on date / section / item provide UX-level copy feedback.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowSquareDown,
  ArrowSquareUp,
  Calendar2,
  Note1,
  Copy as CopyIcon,
  CopySuccess,
  DocumentDownload,
  Eye,
  Import,
  Printer } from
"iconsax-reactjs";
import { MoreVertical } from "@/src/components/atoms/icons/lucide";

// Custom stethoscope-with-circle glyph used on the doctor stamp.
// 24px viewBox; the path strokes (`fill: currentColor` via CSS var)
// inherit the parent's text colour.
function StethoscopeGlyph({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path opacity="0.4" d="M7.83003 16.0302C7.24003 16.6202 6.52003 16.9802 5.76003 17.1302C5.27003 17.2202 4.75003 17.2202 4.26003 17.1302C3.49003 16.9902 2.76 16.6202 2.17 16.0302C0.61 14.4602 0.61 11.9302 2.17 10.3702C3.73 8.8102 6.27003 8.8102 7.83003 10.3702C9.39003 11.9302 9.39003 14.4602 7.83003 16.0302Z" fill={color} />
      <path d="M22.25 6V8C22.25 11.19 19.89 13.61 16.7 13.74C16.73 13.82 16.75 13.91 16.75 14V17C16.75 20.17 14.17 22.75 11 22.75H10C6.87 22.75 4.32001 20.24 4.26001 17.13C4.75001 17.22 5.27001 17.22 5.76001 17.13C5.82001 19.41 7.7 21.25 10 21.25H11C13.34 21.25 15.25 19.34 15.25 17V14C15.25 13.91 15.27 13.82 15.3 13.74C12.11 13.61 9.75 11.19 9.75 8V6C9.75 4.03 11.29 2.41 13.25 2.27V2C13.25 1.59 13.59 1.25 14 1.25C14.41 1.25 14.75 1.59 14.75 2V4C14.75 4.41 14.41 4.75 14 4.75C13.59 4.75 13.25 4.41 13.25 4V3.77C12.12 3.92 11.25 4.86 11.25 6V8C11.25 10.46 13.07 12.25 15.58 12.25H16.42C18.93 12.25 20.75 10.46 20.75 8V6C20.75 4.86 19.88 3.92 18.75 3.77V4C18.75 4.41 18.41 4.75 18 4.75C17.59 4.75 17.25 4.41 17.25 4V2C17.25 1.59 17.59 1.25 18 1.25C18.41 1.25 18.75 1.59 18.75 2V2.27C20.71 2.41 22.25 4.03 22.25 6Z" fill={color} />
      <path d="M5 14.2001C4.87 14.2001 4.74 14.1701 4.62 14.1201C4.5 14.0701 4.38998 14.0001 4.28998 13.9001C4.19998 13.8101 4.13002 13.7001 4.08002 13.5801C4.02002 13.4601 4 13.3301 4 13.2001C4 13.0701 4.02002 12.9401 4.08002 12.8101C4.13002 12.6901 4.19998 12.5801 4.28998 12.4901C4.51998 12.2601 4.87001 12.1501 5.20001 12.2201C5.26001 12.2301 5.32 12.2501 5.38 12.2701C5.44 12.3001 5.5 12.3301 5.56 12.3701C5.61 12.4001 5.66002 12.4401 5.71002 12.4901C5.80002 12.5801 5.86998 12.6901 5.91998 12.8101C5.97998 12.9401 6 13.0701 6 13.2001C6 13.3301 5.97998 13.4601 5.91998 13.5801C5.86998 13.7001 5.80002 13.8101 5.71002 13.9001C5.52002 14.0901 5.27 14.2001 5 14.2001Z" fill={color} />
    </svg>
  );
}

import { cn } from "@/src/hooks/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/atoms/Tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/src/components/molecules/DropdownMenu";
import {
  Drawer as TPDrawer,
  DrawerContent as TPDrawerContent,
  DrawerDescription as TPDrawerDescription,
  DrawerHeader as TPDrawerHeader,
  DrawerTitle as TPDrawerTitle } from
"@/src/components/molecules/Drawer";
import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { toast } from "@/src/components/molecules/Toaster";
import { SidebarHeader } from "@/src/components/molecules/SidebarHeader";
import { CloseSquareIcon } from "@/src/components/organisms/rxpad/templates/shared";
import { TPButton } from "@/src/components/atoms/Button/button-system";

import { tpSectionCardStyle } from "../tokens";
import { useStickyHeaderState } from "../detail-shared";
import { AiTriggerIcon } from "@/src/components/organisms/rxpad/dr-agent/shared/AiTriggerIcon";
import { pastVisits as buildPastVisits } from "@/src/components/organisms/rxpad/digitization/adapters";
import { getMockPatientHistory } from "@/src/components/organisms/rxpad/digitization/mock-payload";
import { useHistoricalSectionHighlights } from "../HistoricalInlineUpdates";
import { FreshUpdateChip } from "../FreshUpdateChip";
import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";
import { ActionableTooltip } from "@/src/components/organisms/rxpad/dr-agent/cards/ActionableTooltip";






















































function normalizePointerText(value) {
  return value.
  replace(/\s*[•·]\s*/g, " • ").
  replace(/\s*\|\s*/g, " | ").
  replace(/\s+/g, " ").
  replace(/\(\s+/g, "(").
  replace(/\s+\)/g, ")").
  trim();
}

/**
 * Past visits are sourced from the AI digitization payload, one
 * `DigitizationPrescription` per visit. The adapter shapes each visit's
 * symptoms / examinations / diagnosis / medications / advice / followUp into
 * the view-model the UI below already knows how to render. Backend payloads
 * land in the same path with no UI change.
 */
function loadPastVisits() {
  return buildPastVisits(getMockPatientHistory());
}

function useIsTouchLike() {
  const [touchLike, setTouchLike] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => {
      setTouchLike(query.matches || window.navigator.maxTouchPoints > 0);
    };

    update();
    query.addEventListener?.("change", update);

    return () => query.removeEventListener?.("change", update);
  }, []);

  return touchLike;
}

function CopyAffordance({
  onCopy,
  showOnHover = true,
  hideOnTouch = false,
  copyHint = "Fill to RxPad",
  copiedLabel = "Copied to RxPad",
  className







}) {
  const isTouchLike = useIsTouchLike();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const runCopy = () => {
    onCopy();
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 1200);
  };

  const visibilityClass = isTouchLike ?
  hideOnTouch ?
  "pointer-events-none w-0 opacity-0" :
  "opacity-100" :
  showOnHover ?
  "opacity-0 group-hover:opacity-100 focus-within:opacity-100" :
  "opacity-100";

  const button =
  <button
    type="button"
    aria-label={copyHint}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onClick={(event) => {
      event.stopPropagation();
      runCopy();
    }}
    className={cn(
      "inline-flex h-6 w-6 items-center justify-center rounded-md transition-all",
      copied ?
      "bg-tp-success-50 text-tp-success-600" :
      "text-tp-blue-500 hover:bg-tp-blue-50 active:bg-tp-blue-100",
      visibilityClass,
      className
    )}>
    
      {copied ?
    <CopySuccess size={14} color="var(--tp-success-600)" variant="Bulk" /> :

    <CopyIcon
      size={14}
      color="var(--tp-blue-500)"
      variant={hovered ? "Bulk" : "Linear"} />

    }
    </button>;


  return (
    <ActionableTooltip label={copyHint} onAction={runCopy}>
      {button}
    </ActionableTooltip>);

}

function TapCopyTooltip({
  onCopy,
  copyHint = "Fill to RxPad",
  copiedLabel = "Copied to RxPad",
  className,
  children





}) {
  const isTouchLike = useIsTouchLike();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const runCopy = () => {
    onCopy();
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 900);
  };

  if (!isTouchLike) {
    return <>{children}</>;
  }

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          aria-label={copyHint}
          className={cn("min-w-0 text-left", className)}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((prev) => !prev);
          }}
          type="button">
          
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        className="rounded-lg bg-tp-slate-900 px-2 py-1.5 text-[12px] text-white"
        collisionPadding={10}
        side="top"
        sideOffset={4}>
        
        <div className="flex items-center gap-2">
          <span className="text-white/85">{copyHint}</span>
          <button
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
              copied ?
              "bg-tp-success-500/25 text-tp-success-200" :
              "bg-white/12 text-white hover:bg-white/20 active:bg-white/25"
            )}
            onClick={(event) => {
              event.stopPropagation();
              runCopy();
            }}
            type="button">
            
            <CopyIcon
              size={11}
              color={copied ? "var(--tp-success-300)" : "white"}
              variant="Linear" />
            
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </TooltipContent>
    </Tooltip>);

}

function SymptomsIcon() {
  return <TPMedicalIcon name="Virus" variant="bulk" size={18} color="var(--tp-slate-500)" className="shrink-0" />;
}

function ExamIcon() {
  return <TPMedicalIcon name="medical service" variant="bulk" size={18} color="var(--tp-slate-500)" className="shrink-0" />;
}

function DiagnosisIcon() {
  return <TPMedicalIcon name="Diagnosis" variant="bulk" size={18} color="var(--tp-slate-500)" className="shrink-0" />;
}

function PillIcon() {
  return <TPMedicalIcon name="Tablets" variant="bulk" size={18} color="var(--tp-slate-500)" className="shrink-0" />;
}

function AdviceIcon() {
  return <TPMedicalIcon name="health care" variant="bulk" size={18} color="var(--tp-slate-500)" className="shrink-0" />;
}

function ClockIcon() {
  return <Calendar2 size={18} color="var(--tp-slate-500)" variant="Bulk" className="shrink-0" />;
}

function NotesDocIcon() {
  return <Note1 size={18} color="var(--tp-slate-500)" variant="Bulk" className="shrink-0" />;
}

function DateHeader({
  dateLabel,
  expanded,
  onToggle,
  onCopyDate,
  canCopy,
  freshCount












}) {
  const { headerRef, isStuck } = useStickyHeaderState();

  return (
    <div
      ref={headerRef}
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "group bg-tp-slate-100 shrink-0 w-full sticky top-0 z-[4] text-left cursor-pointer",
        expanded ?
        isStuck ?
        "rounded-tl-none rounded-tr-none" :
        "rounded-tl-[10px] rounded-tr-[10px]" :
        "rounded-[10px]"
      )}>
      
      <div className="flex items-center justify-between px-[10px] py-[8px] w-full">
        <div className="flex items-center gap-1.5">
          <div className="font-['Inter',sans-serif] font-semibold text-tp-slate-700 text-[14px] tracking-[0.012px] whitespace-nowrap leading-[20px]">
            {dateLabel}
          </div>
          {canCopy ?
          <CopyAffordance
            onCopy={onCopyDate}
            showOnHover={false}
            copyHint={`Fill all details from ${dateLabel} to RxPad`}
            copiedLabel={`${dateLabel} copied to RxPad`} /> :

          null}
          {!expanded && freshCount > 0 ?
          <FreshUpdateChip count={freshCount} /> :
          null}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="opacity-0 transition-opacity group-hover/date-card:opacity-100">
            <AiTriggerIcon
              tooltip={`Ask Dr.Agent about ${dateLabel} visit`}
              signalLabel={`Summarize ${dateLabel} visit summary`}
              sectionId="past-visits"
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
    </div>);

}

function RxTabStrip({
  activeTab,
  onSwitch



}) {
  return (
    <div className="bg-white shrink-0 sticky top-[40px] w-full z-[3]">
      <div className="flex items-center pb-[10px] pt-[10px] px-[8px] gap-0 w-full">
        <button
          onClick={() => onSwitch("digital")}
          className={cn(
            "flex-1 rounded-bl-[5px] rounded-tl-[5px] py-[4px] text-center text-[14px] font-sans font-medium tracking-[0.05px]",
            "leading-[20px]",
            activeTab === "digital" ? "text-white" : "text-tp-slate-700"
          )}
          style={
          activeTab === "digital" ?
          {
            backgroundImage: "linear-gradient(180deg, #6a69ff 0%, #3a39b2 100%)",
            border: "0.518px solid var(--tp-blue-400)"
          } :
          {
            backgroundImage: "linear-gradient(180.418deg, rgba(255,255,255,0) 0%, rgb(240,240,255) 100%)",
            border: "0.518px solid var(--tp-slate-200)",
            borderRight: "none"
          }
          }>
          
          Digital Rx
        </button>

        <button
          onClick={() => onSwitch("written")}
          className={cn(
            "flex-1 rounded-br-[5px] rounded-tr-[5px] py-[4px] text-center text-[14px] font-sans font-medium tracking-[0.05px]",
            "leading-[20px]",
            activeTab === "written" ? "text-white" : "text-tp-slate-700"
          )}
          style={
          activeTab === "written" ?
          {
            backgroundImage: "linear-gradient(180deg, #6a69ff 0%, #3a39b2 100%)",
            border: "0.518px solid var(--tp-blue-400)"
          } :
          {
            backgroundImage: "linear-gradient(180.418deg, rgba(255,255,255,0) 0%, rgb(240,240,255) 100%)",
            border: "0.518px solid var(--tp-slate-200)",
            borderLeft: "none"
          }
          }>
          
          Written Rx
        </button>
      </div>
    </div>);

}

const SECTION_TITLE_TO_ID = {
  Symptoms: "symptoms",
  Examination: "examination",
  Diagnosis: "diagnosis",
  "Med (Rx)": "medications"
};

function ListSection({
  icon,
  title,
  items,
  onCopySection,
  onCopyItem






}) {
  const sectionDescriptions = {
    Symptoms: "all symptoms",
    Examination: "all examination findings",
    Diagnosis: "all diagnoses",
    "Med (Rx)": "all medications"
  };
  const itemDescriptions = {
    Symptoms: "this symptom",
    Examination: "this finding",
    Diagnosis: "this diagnosis",
    "Med (Rx)": "this medication"
  };

  return (
    <div className="relative shrink-0 w-full px-[12px] py-[8px] flex flex-col gap-[6px]">
      <div className="flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[3px] mb-[4px]">
        {icon}
        <TapCopyTooltip
          onCopy={onCopySection}
          copyHint={`Fill ${sectionDescriptions[title] ?? "all items"} to RxPad`}
          copiedLabel={`${title} copied to RxPad`}>

          <span className="flex min-h-0 min-w-0 flex-1 items-center text-left font-sans font-semibold text-tp-slate-500 text-[14px] leading-none">{title}</span>
        </TapCopyTooltip>
        <CopyAffordance
          onCopy={onCopySection}
          showOnHover={false}
          copyHint={`Click to fill ${sectionDescriptions[title] ?? "all items"} to RxPad`}
          copiedLabel={`${title} filled to RxPad`} />

      </div>

      <div className="space-y-1 pl-[6px]">
        {items.map((item) => {
          const normalizedLabel = normalizePointerText(item.label);
          const normalizedDetail = normalizePointerText(item.detail);
          return (
            <div key={`${title}-${item.label}-${item.detail}`} className="group flex items-start gap-[4px] -mr-[6px] text-[14px] leading-[20px] text-tp-slate-700">
              <span className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-tp-slate-500" />
              <TapCopyTooltip
                className="min-w-0 flex-1"
                copyHint={`Click to fill ${itemDescriptions[title] ?? "this item"} to RxPad`}
                copiedLabel={`${item.label} filled to RxPad`}
                onCopy={() => onCopyItem(item)}>
                
                <span className="block min-w-0">
                  <span className="font-sans font-medium text-tp-slate-700">{normalizedLabel}</span>
                  {normalizedDetail ?
                  <span className="ml-1 font-sans text-[14px] leading-[20px] text-tp-slate-500">{`(${normalizedDetail})`}</span> :
                  null}
                </span>
              </TapCopyTooltip>
              <div className="shrink-0 self-start">
                <CopyAffordance
                  onCopy={() => onCopyItem(item)}
                  showOnHover
                  hideOnTouch
                  copyHint={`Click to fill ${itemDescriptions[title] ?? "this item"} to RxPad`}
                  copiedLabel={`${item.label} filled to RxPad`} />
                
              </div>
            </div>);

        })}
      </div>
    </div>);

}

function AdviceSection({ advice, onCopy, onCopyItem }) {
  // Normalise to array of { label, detail } objects so the section
  // renders as a bulleted list — same convention as Symptoms /
  // Examination / Diagnosis. Each entry's `(notes)` becomes the
  // lighter-coloured detail; everything else is the label.
  const items = (Array.isArray(advice) ? advice : advice ? [advice] : [])
    .map((entry) => {
      if (typeof entry === "object" && entry !== null) {
        return {
          label: entry.label ?? entry.name ?? "",
          detail: entry.detail ?? entry.notes ?? ""
        };
      }
      const text = String(entry ?? "").trim();
      const m = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (m) return { label: m[1].trim(), detail: m[2].trim() };
      return { label: text, detail: "" };
    })
    .filter((it) => it.label);

  if (items.length === 0) return null;

  return (
    <div className="relative shrink-0 w-full px-[12px] py-[8px] flex flex-col gap-[6px]">
      <div className="flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[3px] mb-[4px]">
        <AdviceIcon />
        <TapCopyTooltip
          onCopy={onCopy}
          copyHint="Fill all advice to RxPad"
          copiedLabel="Advice copied to RxPad">

          <span className="flex min-h-0 min-w-0 flex-1 items-center text-left font-sans font-semibold text-tp-slate-500 text-[14px] leading-none">Advice</span>
        </TapCopyTooltip>
        <CopyAffordance
          onCopy={onCopy}
          showOnHover={false}
          copyHint="Click to fill advice to RxPad"
          copiedLabel="Advice filled to RxPad" />
      </div>

      <div className="space-y-1 pl-[6px]">
        {items.map((item, idx) => {
          const normalizedLabel = normalizePointerText(item.label);
          const normalizedDetail = normalizePointerText(item.detail);
          return (
            <div key={`advice-${idx}-${item.label}`} className="group flex items-start gap-[4px] -mr-[6px] text-[14px] leading-[20px] text-tp-slate-700">
              <span className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-tp-slate-500" />
              <TapCopyTooltip
                className="min-w-0 flex-1"
                copyHint="Click to fill this advice to RxPad"
                copiedLabel={`${item.label} filled to RxPad`}
                onCopy={() => onCopyItem ? onCopyItem(item) : onCopy()}>
                <span className="block min-w-0">
                  <span className="font-sans font-medium text-tp-slate-700">{normalizedLabel}</span>
                  {normalizedDetail ? (
                    <span className="ml-1 font-sans text-[14px] leading-[20px] text-tp-slate-500">{`(${normalizedDetail})`}</span>
                  ) : null}
                </span>
              </TapCopyTooltip>
              <div className="shrink-0 self-start">
                <CopyAffordance
                  onCopy={() => onCopyItem ? onCopyItem(item) : onCopy()}
                  showOnHover
                  hideOnTouch
                  copyHint="Click to fill this advice to RxPad"
                  copiedLabel={`${item.label} filled to RxPad`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>);

}

function FollowUpSection({ followUp }) {
  // Follow-up is read-only here (per design call). The doctor sets
  // the cadence directly in the RxPad form's Follow-up section, so a
  // copy affordance in past-visit history would only confuse.
  return (
    <div className="relative shrink-0 w-full px-[12px] py-[8px] flex flex-col gap-[6px]">
      <div className="flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[3px] mb-[4px]">
        <ClockIcon />
        <span className="flex min-h-0 min-w-0 flex-1 items-center text-left font-sans font-semibold text-tp-slate-500 text-[14px] leading-none">Follow Up</span>
      </div>
      <span className="pl-[6px] font-sans text-[14px] leading-[20px] text-tp-slate-500">{followUp}</span>
    </div>);

}

function AdditionalNotesSection({ notes, onCopy }) {
  return (
    <div className="relative shrink-0 w-full px-[12px] py-[8px] flex flex-col gap-[6px]">
      <div className="flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[3px] mb-[4px]">
        <NotesDocIcon />
        <TapCopyTooltip
          onCopy={onCopy}
          copyHint="Fill additional notes to RxPad"
          copiedLabel="Additional notes copied to RxPad">
          <span className="flex min-h-0 min-w-0 flex-1 items-center text-left font-sans font-semibold text-tp-slate-500 text-[14px] leading-none">Additional Notes</span>
        </TapCopyTooltip>
        <CopyAffordance
          onCopy={onCopy}
          showOnHover={false}
          copyHint="Click to fill additional notes to RxPad"
          copiedLabel="Additional notes filled to RxPad" />
      </div>
      <TapCopyTooltip
        className="w-full pl-[6px]"
        onCopy={onCopy}
        copyHint="Fill additional notes to RxPad"
        copiedLabel="Additional notes copied to RxPad">
        <span className="font-sans text-[14px] leading-[20px] text-tp-slate-500">{notes}</span>
      </TapCopyTooltip>
    </div>);

}

// Signature-style footer that lives at the BOTTOM of the digital Rx
// card. Vertical violet fade (transparent at top → soft violet at
// bottom) so the doctor stamp reads as a letterhead signature.
function SignatureFooter({ doctorName, specialty }) {
  // Reads as a quiet, "disabled-looking" sign-off block: lighter
  // slate fade, no chip ring around the icon, all text in the lighter
  // slate-500 family. Top padding is bumped so the strip has room to
  // breathe under the last clinical section above it.
  return (
    <div
      className="relative mt-[4px] flex items-center gap-3 overflow-hidden rounded-b-[10px] px-[14px] pt-[20px] pb-[10px]"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(148,163,184,0.05) 50%, rgba(148,163,184,0.10) 100%)"
      }}>
      <span className="shrink-0 font-sans text-[13px] font-normal leading-[18px] text-tp-slate-400/80">Rx by:</span>
      <div className="min-w-0">
        <p className="font-sans text-[13px] font-medium leading-[18px] text-tp-slate-400">{doctorName}</p>
        {specialty ? (
          <p className="font-sans text-[12px] leading-[16px] text-tp-slate-400">{specialty}</p>
        ) : null}
      </div>
    </div>
  );
}

function PrescribedByFooter({ doctorName, specialty, bare = false }) {
  const inner = (
    <div
      className="flex items-center gap-2 rounded-[10px] px-2 py-[6px]"
      style={{
        background:
          "linear-gradient(135deg, rgba(213,101,234,0.05) 0%, rgba(103,58,172,0.07) 60%, rgba(26,25,148,0.05) 100%)"
      }}>
      <span
        aria-hidden
        className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-tp-violet-100/70 text-tp-violet-500">
        <StethoscopeGlyph size={18} color="currentColor" />
      </span>
      <div className="min-w-0">
        <p className="font-sans text-[13px] font-semibold leading-[18px] text-tp-slate-700">{doctorName}</p>
        {specialty ? (
          <p className="font-sans text-[12px] leading-[16px] text-tp-slate-500">{specialty}</p>
        ) : null}
      </div>
    </div>
  );
  return bare ? inner : <div className="px-[10px] pt-[10px] pb-[8px]">{inner}</div>;
}

function WrittenRxPreviewCard({
  document,
  dateLabel,
  onOpen,
  onPreview,
  onDownload,
  onPrint
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(document)}
      className="group w-full overflow-hidden rounded-[10px] border border-tp-slate-100 bg-white text-left transition-colors hover:border-tp-blue-200">
      
      <div className="h-[88px] w-full bg-tp-slate-50 overflow-hidden">
        <img alt={document.title} src={document.previewImage} className="h-full w-full object-cover opacity-85" />
      </div>
      <div className="flex items-center justify-between gap-3 bg-tp-slate-50 px-[12px] py-[8px]">
        <div className="min-w-0">
          <p className="truncate font-sans text-[13px] font-semibold leading-[18px] text-tp-slate-700">
            {document.doctorName ?? dateLabel ?? document.title}
          </p>
          {document.doctorSpecialty ? (
            <p className="truncate font-sans text-[12px] leading-[16px] text-tp-slate-500">{document.doctorSpecialty}</p>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-tp-slate-600 hover:bg-tp-slate-100">
              
              <MoreVertical color="var(--tp-slate-500)" size={16} strokeWidth={1.5} />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onPreview(document);
              }}>

              <Eye color="currentColor" size={18} variant="Linear" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onDownload(document);
              }}>

              {/* DocumentDownload reads more clearly as "save this
                  document" than the generic Import (down-arrow) glyph,
                  and matches sizing of Eye/Printer at 18px. */}
              <DocumentDownload color="currentColor" size={18} variant="Linear" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onPrint(document);
              }}>

              <Printer color="currentColor" size={18} variant="Linear" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </button>);

}

function fillToRxPad(
request,
dateLabel,
payload)
{
  request({ sourceDateLabel: dateLabel, targetSection: "rxpad", ...payload });
}

export function PastVisitsContent() {
  const orderedVisits = useMemo(loadPastVisits, []);
  // `runCopyWithAura` is the bulk path (page-edge shimmer, no per-
  // section flash / scroll / sidebar focus); `requestCopyToRxPad` is
  // the per-section path (target-module flash + scroll-into-view).
  // Date-level "Copy all from this date" → bulk; section / inline →
  // per-section.
  const { requestCopyToRxPad, runCopyWithAura } = useRxPadSync();
  // Fresh updates land on TODAY's visit — index 0 is the most recent.
  const { freshLineCount } = useHistoricalSectionHighlights("pastVisits");

  const [expandedState, setExpandedState] = useState(() =>
  Object.fromEntries(orderedVisits.map((entry, index) => [entry.id, index === 0]))
  );

  const [tabState, setTabState] = useState(() =>
  Object.fromEntries(
    orderedVisits.map((entry) => [entry.id, entry.digitalRx ? "digital" : "written"])
  )
  );

  const [activeDocument, setActiveDocument] = useState(


    null);
  // No-op: RxPadFunctional fires its own TPSnackbar at the destination
  // when data lands in the Rx (single source of truth for copy
  // confirmation). The previous source-side toast was firing on top of
  // it — exactly the duplicate the design call called out. Kept the
  // helper signature so all the existing call-sites stay intact; we
  // just don't fire any snackbar from this side anymore. The Written-
  // Rx download / print messages still go through here, so we route
  // those few cases to the global toast as fallback.
  const showCopySnackbar = (message) => {
    // Only fire for download / print confirmations; copy-to-RxPad
    // confirmations are owned by the destination snackbar.
    if (/download|print|preview/i.test(message)) {
      toast.success(message);
    }
  };

  const openDocument = (dateLabel, document) => {
    setActiveDocument({ dateLabel, document });
  };

  const handleDownload = (doc) => {
    const anchor = window.document.createElement("a");
    anchor.href = doc.pdfUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.download = `${doc.title.toLowerCase().replace(/\\s+/g, "-")}.pdf`;
    anchor.click();
    showCopySnackbar("Written Rx download started");
  };

  const handlePrint = (doc) => {
    const printWindow = window.open(doc.pdfUrl, "_blank", "noopener,noreferrer");
    if (printWindow) {
      printWindow.focus();
      window.setTimeout(() => {
        try {
          printWindow.print();
        } catch {

          // no-op
        }}, 500);
      showCopySnackbar("Opened print view for written Rx");
    }
  };

  return (
    <>
      <div className="content-stretch flex flex-col items-center relative size-full">
        <div className="flex-[1_0_0] min-h-px min-w-px relative w-full overflow-y-auto" data-sticky-scroll-root="true">
          <div className="content-stretch flex flex-col gap-[12px] items-start p-[12px] relative w-full">
          {orderedVisits.map((entry) => {
              const expanded = Boolean(expandedState[entry.id]);
              const hasDigital = Boolean(entry.digitalRx);
              const hasWritten = entry.writtenRx.length > 0;
              const activeTab = tabState[entry.id];
              const showDigital = expanded && hasDigital && activeTab === "digital";
              const showWritten = expanded && hasWritten && (!hasDigital || activeTab === "written");

              return (
                <div key={entry.id} className="group/date-card relative shrink-0 w-full" style={tpSectionCardStyle}>
                <DateHeader
                    dateLabel={entry.dateLabel}
                    expanded={expanded}
                    canCopy={hasDigital && activeTab !== "written"}
                    freshCount={
                    /* Fresh updates from Dr.Agent attach to the most recent visit. */
                    orderedVisits[0]?.id === entry.id ? freshLineCount : 0
                    }
                    onToggle={() => {
                      setExpandedState((prev) => ({
                        ...prev,
                        [entry.id]: !prev[entry.id]
                      }));
                    }}
                    onCopyDate={() => {
                      if (entry.digitalRx) {
                        // Date-level "Copy all from this date" → bulk
                        // path. Page-edge shimmer only; per-module
                        // flash + scroll + sidebar focus are all
                        // suppressed inside RxPadFunctional via the
                        // copyAllAuraActive guard.
                        runCopyWithAura({
                          sourceDateLabel: entry.dateLabel,
                          targetSection: "rxpad",
                          symptoms: entry.digitalRx.symptoms.map((s) => `${s.label}${s.detail ? ` (${s.detail})` : ""}`),
                          examinations: entry.digitalRx.examinations.map((e) => `${e.label}${e.detail ? ` (${e.detail})` : ""}`),
                          diagnoses: entry.digitalRx.diagnoses.map((d) => `${d.label}${d.detail ? ` (${d.detail})` : ""}`),
                          medications: entry.digitalRx.medications.map((m) => m.row),
                          advice: Array.isArray(entry.digitalRx.advice)
                            ? entry.digitalRx.advice
                                .map((a) =>
                                  typeof a === "object" && a !== null
                                    ? a.notes || a.detail
                                      ? `${a.name ?? a.label} (${a.notes ?? a.detail})`
                                      : (a.name ?? a.label ?? "")
                                    : a)
                                .filter(Boolean)
                                .join(" ")
                            : (entry.digitalRx.advice || undefined),
                          followUp: entry.digitalRx.followUp || undefined,
                          labInvestigations: entry.digitalRx.labInvestigations.length ? entry.digitalRx.labInvestigations : undefined
                        }, { bulk: true });
                      }
                      showCopySnackbar(`${entry.dateLabel} details added successfully to RxPad`);
                    }} />
                  

                {expanded ?
                  <>
                    {hasDigital && hasWritten ?
                    <RxTabStrip
                      activeTab={activeTab}
                      onSwitch={(tab) => {
                        setTabState((prev) => ({ ...prev, [entry.id]: tab }));
                      }} /> :

                    null}

                    {showDigital && entry.digitalRx ?
                    <>
                        <ListSection
                        icon={<SymptomsIcon />}
                        title="Symptoms"
                        items={entry.digitalRx.symptoms}
                        onCopySection={() => {
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, {
                            symptoms: entry.digitalRx.symptoms.map((s) => `${s.label}${s.detail ? ` (${s.detail})` : ""}`)
                          });
                          showCopySnackbar("Symptoms added successfully to RxPad");
                        }}
                        onCopyItem={(item) => {
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, {
                            symptoms: [`${item.label}${item.detail ? ` (${item.detail})` : ""}`]
                          });
                          showCopySnackbar(`${item.label} symptom added successfully to RxPad`);
                        }} />
                      

                        <ListSection
                        icon={<ExamIcon />}
                        title="Examination"
                        items={entry.digitalRx.examinations}
                        onCopySection={() => {
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, {
                            examinations: entry.digitalRx.examinations.map((e) => `${e.label}${e.detail ? ` (${e.detail})` : ""}`)
                          });
                          showCopySnackbar("Examination findings added successfully to RxPad");
                        }}
                        onCopyItem={(item) => {
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, {
                            examinations: [`${item.label}${item.detail ? ` (${item.detail})` : ""}`]
                          });
                          showCopySnackbar(`${item.label} finding added successfully to RxPad`);
                        }} />
                      

                        <ListSection
                        icon={<DiagnosisIcon />}
                        title="Diagnosis"
                        items={entry.digitalRx.diagnoses}
                        onCopySection={() => {
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, {
                            diagnoses: entry.digitalRx.diagnoses.map((d) => `${d.label}${d.detail ? ` (${d.detail})` : ""}`)
                          });
                          showCopySnackbar("Diagnoses added successfully to RxPad");
                        }}
                        onCopyItem={(item) => {
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, {
                            diagnoses: [`${item.label}${item.detail ? ` (${item.detail})` : ""}`]
                          });
                          showCopySnackbar(`${item.label} diagnosis added successfully to RxPad`);
                        }} />
                      

                        <ListSection
                        icon={<PillIcon />}
                        title="Med (Rx)"
                        items={entry.digitalRx.medications}
                        onCopySection={() => {
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, {
                            medications: entry.digitalRx.medications.map((m) => m.row)
                          });
                          showCopySnackbar("Medications added successfully to RxPad");
                        }}
                        onCopyItem={(item) => {
                          const med = entry.digitalRx.medications.find((m) => m.label === item.label);
                          if (med) {
                            fillToRxPad(requestCopyToRxPad, entry.dateLabel, { medications: [med.row] });
                          }
                          showCopySnackbar(`${item.label} medication added successfully to RxPad`);
                        }} />
                      

                        <AdviceSection
                        advice={entry.digitalRx.advice}
                        onCopy={() => {
                          // Send the object array so the form's fill
                          // handler can split each entry's name/notes
                          // into separate columns.
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, { advice: entry.digitalRx.advice });
                          showCopySnackbar("Advice added successfully to RxPad");
                        }}
                        onCopyItem={(item) => {
                          fillToRxPad(requestCopyToRxPad, entry.dateLabel, {
                            advice: [{ name: item.label, notes: item.detail }]
                          });
                          showCopySnackbar(`${item.label} advice added successfully to RxPad`);
                        }} />
                      

                        <FollowUpSection followUp={entry.digitalRx.followUp} />

                        {entry.digitalRx.additionalNotes ? (
                          <AdditionalNotesSection
                            notes={entry.digitalRx.additionalNotes}
                            onCopy={() => {
                              fillToRxPad(requestCopyToRxPad, entry.dateLabel, { additionalNotes: entry.digitalRx.additionalNotes });
                              showCopySnackbar("Additional notes added successfully to RxPad");
                            }} />
                        ) : null}
                        {/* Doctor signature — bottom-of-card fade
                            (violet darkening downward). Reads like a
                            letterhead signature stamp at the foot of
                            the prescription. */}
                        <SignatureFooter
                          doctorName={entry.writtenRx?.[0]?.doctorName ?? "Dr. Shyam Sundar"}
                          specialty={entry.writtenRx?.[0]?.doctorSpecialty ?? "General Physician"} />
                      </> :
                    null}

                    {showWritten ?
                    <div className="space-y-2 px-[10px] py-[10px]">
                        {entry.writtenRx.map((document) =>
                      <WrittenRxPreviewCard
                        key={document.id}
                        document={document}
                        dateLabel={entry.dateLabel}
                        onOpen={(selectedDocument) => openDocument(entry.dateLabel, selectedDocument)}
                        onPreview={(selectedDocument) => {
                          openDocument(entry.dateLabel, selectedDocument);
                          showCopySnackbar("Opened written Rx preview");
                        }}
                        onDownload={handleDownload}
                        onPrint={handlePrint} />

                      )}
                      </div> :
                    null}
                  </> :
                  null}
              </div>);

            })}
          </div>
        </div>
      </div>

      <TPDrawer
        open={Boolean(activeDocument)}
        onOpenChange={(open) => {
          if (!open) setActiveDocument(null);
        }}>
        
        <TPDrawerContent side="right" size="xl" className="p-0 w-[min(90vw,860px)] sm:max-w-none">
          {/* Uses the shared SidebarHeader convention (cross + divider
              + title + trailing CTAs). No secondary description line —
              the date / source context lives inside the body now. */}
          <SidebarHeader
            onClose={() => setActiveDocument(null)}
            closeAriaLabel="Close written Rx preview"
            closeIcon={<CloseSquareIcon size={24} />}
            title={
              activeDocument
                ? `Written Rx (${activeDocument.dateLabel})`
                : "Written Rx"
            }
            actions={activeDocument ? (
              <>
                {/* Icon-only chip CTAs — same glazed slate-100
                    background as the RxpadHeader Customisation /
                    Settings chips. No "Preview" CTA per design call;
                    only Download + Print. */}
                <button
                  type="button"
                  aria-label="Download written Rx"
                  onClick={() => handleDownload(activeDocument.document)}
                  className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-tp-slate-100 text-tp-slate-700 transition-colors hover:bg-tp-slate-200 active:scale-[0.96]">
                  <DocumentDownload color="currentColor" size={20} strokeWidth={1.5} variant="Linear" />
                </button>
                <button
                  type="button"
                  aria-label="Print written Rx"
                  onClick={() => handlePrint(activeDocument.document)}
                  className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-tp-slate-100 text-tp-slate-700 transition-colors hover:bg-tp-slate-200 active:scale-[0.96]">
                  <Printer color="currentColor" size={20} strokeWidth={1.5} variant="Linear" />
                </button>
              </>
            ) : null}
          />

          {/* Body — fills the remaining viewport height (drawer is full
              height; the only chrome above is the 56px header).
              Slate wash spans the whole body; the Rx image sits inside
              naked (no nested border / rounded shell). The image
              auto-fits the column with its natural aspect ratio. */}
          <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-auto bg-tp-slate-50 p-4">
            {/* Doctor stamp — keeps the violet wash from the digital
                Rx body so the convention stays consistent across
                surfaces. White background variant available via
                tone="white" if a calmer treatment is needed. */}
            {activeDocument ? (
              <div className="mx-auto w-full max-w-[820px]">
                <PrescribedByFooter
                  bare
                  doctorName={activeDocument.document.doctorName ?? "Dr. Shyam Sundar"}
                  specialty={activeDocument.document.doctorSpecialty ?? "General Physician"} />
              </div>
            ) : null}
            {/* Document surface — soft 12px corners + a hairline top
                border so the page reads as a clean A4 sheet sitting
                on the slate-50 wash. The top padding (~56px) gives
                the first page room to breathe under the doctor stamp.
                Container is `min-h-0` + the inner object is sized via
                content height, which lets multi-page PDFs render
                their own internal scroll inside this surface. */}
            <div
              className="mx-auto w-full max-w-[820px] flex-1 overflow-hidden rounded-[12px] bg-white pt-[56px]"
              style={{ borderTop: "0.5px solid rgba(15,23,42,0.08)" }}>
              <object
                data={activeDocument?.document.pdfUrl}
                type="application/pdf"
                className="h-full w-full bg-white">
                <div className="flex h-full flex-col items-center justify-start">
                  {activeDocument ? (
                    <img
                      alt={activeDocument.document.title}
                      src={activeDocument.document.previewImage}
                      className="w-full h-auto" />
                  ) : null}
                </div>
              </object>
            </div>
          </div>
        </TPDrawerContent>
      </TPDrawer>
    </>);

}