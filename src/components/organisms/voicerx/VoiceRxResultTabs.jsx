"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { FeedbackBottomSheet } from "@/src/components/organisms/rxpad/dr-agent/shell/FeedbackBottomSheet";
import {
  Download,

  MoreVertical,
  Printer } from

"@/src/components/atoms/icons/lucide";
import { VoiceRxIcon } from "@/src/components/organisms/voicerx/voice-consult-icons";
import { CopyIcon } from "@/src/components/organisms/rxpad/dr-agent/cards/CopyIcon";
import { toast } from "@/src/components/molecules/Toaster";

import { cn } from "@/src/hooks/utils";
import styles from "./VoiceRxResultTabs.module.scss";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/molecules/Tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/src/components/molecules/DropdownMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, HoverTooltip } from "@/src/components/atoms/Tooltip";
import { ClinicalNotesEditor, emrSectionsToHtml } from "./ClinicalNotesEditor";
import { DictationTranscript } from "./VoiceTranscriptProcessingCard";


import { DocumentText, Like1, Dislike, Microphone2, Health, InfoCircle, Copy as CopyGlyph } from "iconsax-reactjs";






























export function VoiceRxResultTabs({
  modeLabel = "Conversation Mode",
  transcript,
  emrSections,
  emrCard,
  clinicalNotesHtml,
  audioQuality = "good",
  initialTab = "emr",
  feedback: feedbackProp,
  onClinicalNotesChange,
  onFeedback,
  onCopyToRx,
  onBack,
  onMinimize,
  onAddDetailsByVoice,
  onPrint
}) {
  const [tab, setTab] = useState(initialTab);
  const [feedback, setFeedback] = useState(
    feedbackProp ?? { transcript: null, emr: null, clinical: null }
  );
  const [notesHtml, setNotesHtml] = useState(
    clinicalNotesHtml ?? emrSectionsToHtml(emrSections)
  );

  const handleNotesChange = useCallback(
    (html) => {
      setNotesHtml(html);
      onClinicalNotesChange?.(html);
    },
    [onClinicalNotesChange]
  );

  const handleFeedback = useCallback(
    (kind, value) => {
      setFeedback((prev) => ({ ...prev, [kind]: prev[kind] === value ? null : value }));
      onFeedback?.(kind, value);
    },
    [onFeedback]
  );

  const copyCurrent = useCallback(async () => {
    let text = "";
    if (tab === "transcript") text = transcript;else
    if (tab === "emr") text = emrSectionsToPlainText(emrSections);else
    text = htmlToPlainText(notesHtml);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy — try again");
    }
  }, [tab, transcript, emrSections, notesHtml]);

  return (
    <div className="vrx-result-tabs vrx-result-tabs--enter relative flex h-full w-full flex-col bg-white">
      {/* vrx-* styles live in app/globals.css */}
      {/* Top bar — mirrors the recorder's header so the surface reads
           consistently. Back arrow returns to chat; minimize collapses the
           rail. The mode label sits as a chip on the left. */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-[4px] pb-[12px]">
        <span className="vrx-rt-mode-pill inline-flex items-center gap-[7px] rounded-[10px] p-[5px]">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to chat"
            className="vrx-rt-back inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-tp-slate-700 transition-colors hover:text-tp-slate-900 active:scale-[0.92]">
            
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className={cn("text-[14px] font-semibold leading-none text-tp-slate-700", styles.modePillLabel)}>{modeLabel}</span>

          {/* Kebab moved INSIDE the mode pill — matches the Conversation
               Mode pill pattern in VoiceRxActiveAgent so the kebab always
               reads as part of its section, not a free-floating button. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className={cn("relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-tp-slate-500 transition-colors hover:bg-white/70 hover:text-tp-slate-800 active:scale-[0.94]", styles.kebabBtn)}
                onClick={(e) => e.stopPropagation()}>
                
                <MoreVertical size={14} strokeWidth={2.2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px] border-tp-slate-200 bg-white">
              <div className="px-2 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-tp-slate-400">
                Current Session: VRX-8149
              </div>
              <DropdownMenuSeparator className="bg-tp-slate-100" />
              <div className="px-2 py-1 text-[12px] font-semibold text-tp-slate-500">
                Session History
              </div>
              <DropdownMenuItem className="text-[14px] text-tp-slate-700 hover:bg-tp-slate-50 flex items-center justify-between">
                <span>12 Oct, Consultation</span>
                <span className="text-[12px] text-tp-slate-400">View</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[14px] text-tp-slate-700 hover:bg-tp-slate-50 flex items-center justify-between">
                <span>10 Oct, Follow-up</span>
                <span className="text-[12px] text-tp-slate-400">View</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[14px] text-tp-slate-700 hover:bg-tp-slate-50 flex items-center justify-between">
                <span>05 Oct, Initial Visit</span>
                <span className="text-[12px] text-tp-slate-400">View</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-tp-slate-100" />
              <DropdownMenuItem className="text-[14px] text-tp-slate-700 hover:bg-tp-slate-50">
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
        <div className="flex items-center gap-1.5">
          {onMinimize &&
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize agent"
            className="vrx-rt-glossy flex h-[32px] w-[32px] items-center justify-center rounded-[10px] text-tp-slate-600 transition-colors hover:text-tp-slate-900 active:scale-[0.95]">
            
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="3.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="M9 3v18" stroke="currentColor" strokeWidth="1.7" />
                <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          }
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v)} className="flex h-full min-h-0 flex-1 flex-col !gap-0">
        <div className="shrink-0 px-3 pb-[6px] pt-[6px]">
          {/* Tab strip — taller (h-[44px]) with a 14px outer radius and
              10px chip radius. Active chip swaps the icon to its Bulk
              variant and pulls TP-blue for both glyph and label so the
              selected tab reads as a real selection, not a faint tonal
              shift. Inactive chips stay slate-600 with Linear icons. */}
          {/* Tabs strip — switched from `grid grid-cols-3` to a flex
              row with horizontal overflow-auto so the three chips have
              a 4px gap between them and can scroll sideways on tight
              panel widths instead of squeezing each chip down to a
              cramped 1-2 character ellipsis. */}
          <TabsList className="vrx-rt-tabs flex h-[44px] w-full items-stretch gap-[4px] overflow-x-auto rounded-[14px] bg-tp-slate-100 p-[5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger
              value="transcript"
              className={cn(
                "shrink-0 flex-1 min-w-[110px] gap-[6px] whitespace-nowrap rounded-[10px] px-[10px] text-[12px] font-semibold tracking-tight transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-tp-blue-600 data-[state=active]:shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
                "data-[state=inactive]:text-tp-slate-600"
              )}>
              
              <Microphone2 size={15} variant={tab === "transcript" ? "Bulk" : "Linear"} color="currentColor" /> Transcript
            </TabsTrigger>
            <TabsTrigger
              value="emr"
              className={cn(
                "shrink-0 flex-1 min-w-[110px] gap-[6px] whitespace-nowrap rounded-[10px] px-[10px] text-[12px] font-semibold tracking-tight transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-tp-blue-600 data-[state=active]:shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
                "data-[state=inactive]:text-tp-slate-600"
              )}>
              
              <Health size={15} variant={tab === "emr" ? "Bulk" : "Linear"} color="currentColor" /> TP EMR
            </TabsTrigger>
            <TabsTrigger
              value="clinical"
              className={cn(
                "shrink-0 flex-1 min-w-[110px] gap-[6px] whitespace-nowrap rounded-[10px] px-[10px] text-[12px] font-semibold tracking-tight transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-tp-blue-600 data-[state=active]:shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
                "data-[state=inactive]:text-tp-slate-600"
              )}>
              
              <DocumentText size={15} variant={tab === "clinical" ? "Bulk" : "Linear"} color="currentColor" /> Clinical Notes
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[12px] pt-[6px]">
          <TabsContent value="transcript" className="m-0 outline-none">
            <TranscriptPane transcript={transcript} audioQuality={audioQuality} />
            <FeedbackRow value={feedback.transcript} onChange={(v) => handleFeedback("transcript", v)} audioQuality={audioQuality} />
          </TabsContent>
          <TabsContent value="emr" className="m-0 outline-none">
            {/* Same UI-card vocabulary as PatientReportedCard:
                 rounded-[14px] outer with the violet shiner border,
                 blue→white gradient header strip, white body. Wraps
                 the structured Rx sections so the EMR tab reads as a
                 proper card surface, not loose rows on the panel. */}
            <div
              className={cn("vrx-rt-emr-shell w-full overflow-hidden rounded-[14px] bg-white", styles.emrShell)}>
              
              <div className="px-3 py-[10px]">
                {emrCard ?? <EmrPaneFallback sections={emrSections} />}
              </div>
            </div>
            <FeedbackRow value={feedback.emr} onChange={(v) => handleFeedback("emr", v)} />
          </TabsContent>
          <TabsContent value="clinical" className="m-0 h-full flex flex-col outline-none">
            <ClinicalPane html={notesHtml} onChange={handleNotesChange} />
          </TabsContent>
        </div>

        <StickyFooter
          tab={tab}
          onCopyToRx={onCopyToRx}
          onCopyClipboard={copyCurrent}
          onPrint={() => onPrint?.(tab)}
          onAddVoice={onAddDetailsByVoice} />
        
      </Tabs>
      {/* vrx-* styles live in app/globals.css */}
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────

function TranscriptPane({ transcript, audioQuality: _audioQuality }) {
  if (!transcript) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-[12px] bg-tp-slate-50 px-4 py-3">
          <p className="text-[14px] italic leading-[1.6] text-tp-slate-400">No transcript captured.</p>
        </div>
      </div>);

  }
  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="vrx-transcript-frame rounded-[12px] bg-tp-slate-100/80 p-[12px] backdrop-blur-sm">
        <DictationTranscript raw={transcript} animate={false} />
      </div>
    </div>);

}

// Plain fallback used only when no chat-UI emrCard is provided by the
// parent. The hosted parent normally renders the existing
// VoiceStructuredRxCard here so the EMR tab matches the chat pattern.
function EmrPaneFallback({ sections }) {
  if (!sections.length) {
    return <div className="rounded-[12px] border border-dashed border-tp-slate-200 bg-tp-slate-50/40 px-4 py-6 text-center text-[14px] text-tp-slate-500">No EMR data yet.</div>;
  }
  return (
    <div className="flex flex-col gap-6 pt-1 pb-4">
      {sections.map((s) =>
      <div key={s.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[14px] font-bold uppercase tracking-[0.06em] text-tp-slate-800">{s.title}</h4>
          </div>
          {s.items.length ?
        <div className="space-y-1.5 text-[14px] leading-[1.6] text-tp-slate-700">
              {s.items.map((it, i) =>
          <div key={i} className="flex items-start gap-2">
                  <span className="mt-[7px] flex-shrink-0 h-[4.5px] w-[4.5px] rounded-full bg-tp-blue-500" aria-hidden />
                  <p>{it}</p>
                </div>
          )}
            </div> :

        <p className="text-[14px] italic text-tp-slate-400">No content</p>
        }
        </div>
      )}
    </div>);

}

function ClinicalPane({ html, onChange }) {
  return <ClinicalNotesEditor value={html} onChange={onChange} />;
}

export function FeedbackRow({ value, onChange, audioQuality, timestamp }) {
  const [downSheetOpen, setDownSheetOpen] = React.useState(false);
  const handleDown = () => {
    onChange("down");
    setDownSheetOpen(true);
  };
  return (
    <div className="flex items-center gap-1.5">
      {/* vrx-* styles live in app/globals.css */}
      <button
        type="button"
        onClick={() => onChange("up")}
        className={cn(
          "flex h-[20px] w-[20px] items-center justify-center rounded transition-colors",
          value === "up" ? "text-tp-success-500" : "text-tp-slate-400 hover:text-tp-success-500"
        )}>

        <Like1 size={14} variant={value === "up" ? "Bold" : "Linear"} />
      </button>
      <button
        type="button"
        onClick={handleDown}
        className={cn(
          "flex h-[20px] w-[20px] items-center justify-center rounded transition-colors",
          value === "down" ? "text-tp-error-500" : "text-tp-slate-400 hover:text-tp-error-500"
        )}>

        <Dislike size={14} variant={value === "down" ? "Bold" : "Linear"} />
      </button>

      {audioQuality &&
      <>
          <span aria-hidden className="vrx-fb-divider mx-[6px]" />
          <div className="flex items-center gap-1 text-[14px] font-medium text-emerald-600">
            Audio quality: {audioQuality.charAt(0).toUpperCase() + audioQuality.slice(1)}
            <HoverTooltip content="Audio was clear and easily processed by the AI models." side="top">
              <button type="button" className="ml-0.5 mt-0.5 text-tp-slate-400 hover:text-tp-slate-600">
                <InfoCircle size={14} variant="Linear" />
              </button>
            </HoverTooltip>
          </div>
          <span aria-hidden className="vrx-fb-divider mx-[6px]" />
          <HoverTooltip content="Download transcript" side="top">
            <button
              type="button"
              onClick={() => toast.success("Transcript downloaded")}
              className="flex h-6 w-6 items-center justify-center rounded-md text-tp-slate-400 transition-colors hover:bg-tp-slate-50 hover:text-tp-slate-600">

              <Download size={14} strokeWidth={2.2} />
            </button>
          </HoverTooltip>
        </>
      }

      {timestamp ? (
        <>
          <span aria-hidden className="vrx-fb-divider mx-[6px]" />
          <span className="ml-auto font-sans text-[11px] leading-[14px] text-tp-slate-400">{timestamp}</span>
        </>
      ) : null}
      <FeedbackBottomSheet
        isOpen={downSheetOpen}
        onClose={() => setDownSheetOpen(false)}
        onSubmit={() => {
          setDownSheetOpen(false);
          toast.success("Thanks — feedback submitted");
        }} />
    </div>);

}

// Sticky footer follows the TP design system: a single PRIMARY CTA on top
// (Copy to Rx / Copy / Print depending on tab), with two NEUTRAL OUTLINE
// CTAs side-by-side below it. There is intentionally no "Back to chat"
// here — the header back arrow handles that.
function StickyFooter({
  tab,
  onCopyToRx,
  onCopyClipboard,
  onPrint,
  onAddVoice






}) {
  // Per-tab footer composition.
  // Transcript  → primary: Copy            | secondary: Edit via voice
  // TP EMR      → primary: Copy to Rx      | secondary: Print, Edit via voice
  // Clinical    → primary: Print           | secondary: Copy, Edit via voice
  let primaryLabel = "Copy all to RxPad";
  // Use the plain iconsax glyph (not the wrapped CopyIcon) so the icon
  // inherits the parent button's white text colour. The wrapped
  // CopyIcon paints itself blue and would vanish on the blue CTA.
  let primaryIcon = <CopyGlyph size={16} variant="Linear" color="currentColor" />;
  let primaryAction = onCopyToRx ?? onCopyClipboard;

  if (tab === "transcript") {
    primaryLabel = "Copy to Clipboard";
    primaryAction = onCopyClipboard;
  }

  // Tooltip helper-classes — ALL tooltips across this surface use the
  // same dark slate-900 chip, so action vs. info reads consistently.
  const tooltipDarkCls = "rounded-[6px] border-0 bg-tp-slate-900 px-2.5 py-1.5 text-[12px] leading-[1.45] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)]";
  const primaryHelp =
  tab === "transcript" ? "Copy the full conversation transcript to your clipboard" :
  "Fill all of these structured sections into the active RxPad";
  return (
    <div className="shrink-0 border-t border-tp-slate-200 bg-white px-3 py-3">
      <div className="flex items-center gap-2">
        <HoverTooltip content={primaryHelp} side="top" fill>
          <button
            type="button"
            onClick={primaryAction}
            disabled={!primaryAction}
            className="vrx-rt-primary flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] px-3 text-[14px] font-semibold text-white transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">

            {primaryIcon}
            {primaryLabel}
          </button>
        </HoverTooltip>

        <HoverTooltip content="Quickly edit the clinical notes using voice AI" side="top" align="end">
          <button
            type="button"
            onClick={onAddVoice}
            disabled={!onAddVoice}
            aria-label="Edit clinical notes with voice"
            className="vrx-rt-voice-cta-outline flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">

            <VoiceRxIcon size={20} color="#673AAC" />
          </button>
        </HoverTooltip>
      </div>
      {/* vrx-* styles live in app/globals.css */}
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────

function sectionToPlainText(s) {
  const lines = s.items.map((i) => `• ${i}`).join("\n");
  return `${s.title}:\n${lines || "—"}`;
}

export function emrSectionsToPlainText(sections) {
  return sections.map(sectionToPlainText).join("\n\n");
}

function htmlToPlainText(html) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("h1, h2, h3, p, li").forEach((el) => {
    el.appendChild(document.createTextNode("\n"));
  });
  tmp.querySelectorAll("li").forEach((el) => {
    el.insertBefore(document.createTextNode("• "), el.firstChild);
  });
  return (tmp.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}