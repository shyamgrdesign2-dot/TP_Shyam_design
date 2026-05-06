"use client";

import { useEffect, useState } from "react";
import { Mic, MoreVertical, X } from "@/src/components/atoms/icons/lucide";
import { Copy as CopyGlyph, InfoCircle, Microphone2, DocumentText } from "iconsax-reactjs";
import { DictationTranscript } from "./VoiceTranscriptProcessingCard";
import { cn } from "@/src/hooks/utils";

import { FeedbackRow } from "./VoiceRxResultTabs";
import { VoiceRxIcon } from "./voice-consult-icons";
import { VoiceRxModuleRecorder } from "./VoiceRxModuleRecorder";
import recorderStyles from "./VoiceRxModuleRecorder.module.scss";
import { VoiceRxSectionProcessing } from "@/src/components/organisms/rxpad/form/VoiceRxSectionProcessing";
import { toast } from "@/src/components/molecules/Toaster";
import styles from "./VoiceRxCanvas.module.scss";

/** localStorage key — gates the first-time educational coachmark for
 *  the structured-clinical-notes canvas. Bump the suffix if the copy
 *  changes meaningfully and you want every doctor to see the new tip. */
const VRX_CANVAS_COACHMARK_KEY = "tp-vrx-canvas-coachmark-v1";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/src/components/molecules/DropdownMenu";
import { HoverTooltip } from "@/src/components/atoms/Tooltip";

/**
 * VoiceRxCanvas
 * ─────────────
 * The post-processing surface for the new VoiceRx flow.
 *
 * Shape:
 *   • Same chrome as VoiceRxResultTabs (mode pill + back + minimize) so
 *     the visual frame doesn't jump when the shiner card hands off here.
 *   • Body: a single canvas — the structured TP EMR card. No tabs, no
 *     transcript pane, no clinical-notes pane. (Those views still exist
 *     in `VoiceRxResultTabs` / `ClinicalNotesEditor` for the future
 *     plugin variant; this flow simply doesn't surface them.)
 *   • Footer: a single row with two CTAs — Copy to EMR (primary) and
 *     Add / Edit by voice (gradient outline). Print is intentionally
 *     gone in this flow.
 *
 * The "Add / Edit by voice" handler is owned by the parent. In the
 * Phase 2 wire-up it will mount an inline recorder ABOVE the canvas
 * (canvas stays mounted) and merge the resulting delta into the
 * structured Rx in place. For now it falls through to whatever the
 * parent passes — the existing parent handler restarts a recording
 * session, which keeps the flow working until the inline recorder
 * lands.
 */






















function formatDuration(ms) {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceRxCanvas({
  modeLabel = "Conversation Mode",
  transcript = "",
  transcriptSegments,
  emrCard,
  inlineRecorderSlot,
  onCopyToRx,
  onBack,
  onMinimize,
  onAddDetailsByVoice,
  onQuickEditSubmit
}) {
  const canvasTitle = "Back";
  void modeLabel;

  const [activeTab, setActiveTab] = useState("emr");
  // Inline quick-edit recorder overlay. Replaces the previous "kick
  // back to conversation mode" handler with a transient bottom sheet
  // pinned over the canvas — the existing clinical notes stay visible
  // (and copyable) but back/minimize/etc. are blocked until the doctor
  // submits or cancels. On submit, the new transcript chunk is forwarded
  // to onAddDetailsByVoice so the parent can append + re-generate.
  const [quickEditActive, setQuickEditActive] = useState(false);
  // Quick-edit regeneration UX:
  //   idle       → normal canvas, no overlay.
  //   recording  → bottom-sheet recorder visible (mic + waveform + submit).
  //   processing → recorder is replaced with a ShineBorder + animated
  //                "Updating clinical notes…" loader in the SAME bottom
  //                sheet. Stays mounted for ~12s so the doctor sees the
  //                regen unfold. The EMR card behind transforms into
  //                shimmer skeletons during this window so stale text
  //                isn't visible while the new note is being merged.
  //   idle (post)→ overlay closes; updated note re-appears with no flash.
  const [regenPhase, setRegenPhase] = useState("idle");
  const navLocked = quickEditActive || regenPhase !== "idle";
  const overlayActive = quickEditActive || regenPhase === "processing";
  const transcriptCount = Array.isArray(transcriptSegments) ? transcriptSegments.length : 0;

  const [feedback, setFeedback] = useState({
    transcript: null,
    emr: null
  });
  const handleFeedback = (tab, val) => {
    setFeedback((prev) => ({ ...prev, [tab]: prev[tab] === val ? null : val }));
  };

  // First-time educational coachmark — gated by localStorage so it only
  // shows the very FIRST time a doctor lands on the structured-clinical-
  // notes canvas. After dismiss it never reappears for that user.
  const [coachmarkVisible, setCoachmarkVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem(VRX_CANVAS_COACHMARK_KEY)) {
        setCoachmarkVisible(true);
      }
    } catch {
      // Private mode etc. — fall back to showing the tip; worst case the
      // doctor sees it every visit, which is preferable to swallowing it.
      setCoachmarkVisible(true);
    }
  }, []);
  const dismissCoachmark = () => {
    setCoachmarkVisible(false);
    try {
      window.localStorage.setItem(VRX_CANVAS_COACHMARK_KEY, "1");
    } catch {

      /* ignore — session-only dismiss is acceptable */}
  };

  // The coachmark also dismisses (permanently) the moment the doctor
  // ACTS on the canvas — either Copy all to EMR or Quick Edit. The tip
  // explains both paths, so successfully using either means the
  // explanation has done its job. Calling dismissCoachmark before the
  // parent handler keeps the localStorage flip ahead of any state churn
  // the parent triggers (e.g., Quick Edit unmounts the canvas).
  const handleCopyToRx = () => {
    if (coachmarkVisible) dismissCoachmark();
    onCopyToRx?.();
  };

  return (
    <div className="vrx-canvas vrx-canvas--enter relative flex h-full w-full flex-col bg-white">
      {/* Header — mirrors VoiceRxResultTabs so the surface reads
           consistently across the two flows that share the same panel. */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-[4px] pb-[12px]">
        {/* Right padding bumped post-kebab-removal so the title doesn't
            sit flush against the pill's trailing edge. */}
        <span className="vrx-cn-mode-pill inline-flex items-center gap-[6px] rounded-[10px] py-[6px] pl-[8px] pr-[12px]">
          <button
            type="button"
            onClick={navLocked ? undefined : onBack}
            disabled={navLocked}
            aria-label="Back to chat"
            /* Naked icon — no chip background, 16px SVG with hover
               color change. Matches the recorder's mode-pill back. */
            className={cn(
              "inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center bg-transparent transition-colors active:scale-[0.92]",
              navLocked
                ? "cursor-not-allowed text-tp-slate-300"
                : "text-tp-slate-700 hover:text-tp-slate-900"
            )}>
            
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Output-state label — the canvas surfaces structured notes,
               not a "mode". Calling it "Clinical Notes" tells the doctor
               what they're looking at and replaces the duplicate inline
               heading that used to live inside the violet card. */}
          <span
            className={cn("text-[14px] font-semibold leading-none text-tp-slate-700 truncate", styles.modePillLabel)}
            title={canvasTitle}>
            
            {canvasTitle}
          </span>

          {/* Kebab removed per design call — Conversation/Dictate
              mode-pill no longer carries a "More options" dropdown. */}
        </span>
        <div className="flex items-center gap-2">
          {onMinimize &&
          <button
            type="button"
            onClick={navLocked ? undefined : onMinimize}
            disabled={navLocked}
            aria-label="Minimize agent"
            /* Naked icon — strips the chunky glossy chip; just a 16px
               SVG with hover color change to match the rest of the
               chrome. */
            className={cn(
              "inline-flex h-[20px] w-[20px] items-center justify-center bg-transparent transition-colors active:scale-[0.95]",
              navLocked
                ? "cursor-not-allowed text-tp-slate-300"
                : "text-tp-slate-600 hover:text-tp-slate-900"
            )}>
            
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
                <path d="M9 3v18" stroke="currentColor" strokeWidth="2" />
                <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          }
        </div>
      </div>

      {/* Tab strip stays visible while the quick-edit overlay is up
          so the doctor sees the underlying canvas (tabs + clinical
          notes) behind the bottom-dock recorder / loader. */}
      <div className="shrink-0 px-3 pb-[6px] pt-[6px]">
        <div className="vrx-cn-tabs flex h-[44px] w-full items-stretch gap-[4px] overflow-x-auto rounded-[14px] bg-tp-slate-100 p-[5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("transcript")}
            className={cn(
              "shrink-0 flex-1 flex items-center justify-center gap-[6px] whitespace-nowrap rounded-[10px] px-[10px] text-[12px] font-semibold tracking-tight transition-all",
              activeTab === "transcript" ?
              "bg-white text-tp-blue-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)]" :
              "text-tp-slate-600"
            )}>
            
            <Microphone2 size={15} variant={activeTab === "transcript" ? "Bulk" : "Linear"} color="currentColor" /> {transcriptCount > 1 ? "Transcripts" : "Transcript"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("emr")}
            className={cn(
              "shrink-0 flex-1 flex items-center justify-center gap-[6px] whitespace-nowrap rounded-[10px] px-[10px] text-[12px] font-semibold tracking-tight transition-all",
              activeTab === "emr" ?
              "bg-white text-tp-blue-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)]" :
              "text-tp-slate-600"
            )}>
            
            <DocumentText size={15} variant={activeTab === "emr" ? "Bulk" : "Linear"} color="currentColor" /> Clinical Notes
          </button>
        </div>
      </div>

      {/* Body — tab content. Stays mounted (and visible) when the
          quick-edit overlay is up so the canvas reads as a true
          overlay over the existing clinical notes. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[12px] pt-[6px]">
        {inlineRecorderSlot ?
        <div className="mb-[10px]">{inlineRecorderSlot}</div> :
        null}

        {activeTab === "transcript" ?
        <div className="flex flex-col gap-3">
            {Array.isArray(transcriptSegments) && transcriptSegments.length > 0 ? (
              transcriptSegments.map((seg, idx) => (
                <div
                  key={seg.id ?? idx}
                  className="vrx-transcript-frame rounded-[12px] bg-tp-slate-100/80 p-[12px] backdrop-blur-sm">
                  <div className="mb-[2px] flex items-center justify-between gap-2">
                    <p className="font-sans text-[13px] font-medium leading-[18px] text-tp-slate-400">
                      {seg.mode === "ambient_consultation" ? "Conversation Transcript" : "Dictation Transcript"}
                    </p>
                    <span
                      className="inline-flex items-center gap-[4px] rounded-full bg-white/80 px-[10px] py-[3.5px] text-[12px] font-medium text-tp-slate-400 tabular-nums"
                      aria-label={`Recording duration ${formatDuration(seg.durationMs)}`}>
                      <Mic size={12} strokeWidth={1.8} aria-hidden />
                      {formatDuration(seg.durationMs)}
                    </span>
                  </div>
                  <DictationTranscript raw={seg.body} animate={false} />
                  {/* Subtle horizontal gradient divider — same recipe
                      as the Customise sidebar header divider, rotated
                      to the horizontal axis. Separates transcript
                      body from the feedback footer. */}
                  <div className="my-[10px] h-px w-full bg-gradient-to-r from-[rgba(208,213,221,0.2)] via-[#d0d5dd] to-[rgba(208,213,221,0.2)]" />
                  <FeedbackRow
                    value={feedback[`transcript-${seg.id ?? idx}`] ?? null}
                    onChange={(v) => handleFeedback(`transcript-${seg.id ?? idx}`, v)}
                    audioQuality="good"
                    timestamp={seg.createdAt ? new Date(seg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : null} />
                </div>
              ))
            ) : transcript ? (
              <div className="vrx-transcript-frame rounded-[12px] bg-tp-slate-100/80 p-[12px] backdrop-blur-sm">
                <DictationTranscript raw={transcript} animate={false} />
                <div className="my-[10px] h-px w-full bg-gradient-to-r from-[rgba(208,213,221,0.2)] via-[#d0d5dd] to-[rgba(208,213,221,0.2)]" />
                <FeedbackRow
                  value={feedback.transcript}
                  onChange={(v) => handleFeedback("transcript", v)}
                  audioQuality="good" />
              </div>
            ) : (
              <div className="vrx-transcript-frame rounded-[12px] bg-tp-slate-100/80 p-[12px] backdrop-blur-sm">
                <p className="text-[14px] italic leading-[1.6] text-tp-slate-400">No transcript captured.</p>
              </div>
            )}

          </div> :

        <div className="flex flex-col gap-3">
            <div
              className={cn(
                "vrx-cn-emr-shell relative w-full overflow-hidden rounded-[14px] bg-white",
                styles.emrShell
              )}>
              <div className="px-3 py-[10px]">{emrCard}</div>
            </div>
            <FeedbackRow
            value={feedback.emr}
            onChange={(v) => handleFeedback("emr", v)} />

          </div>
        }
      </div>

      {/* Footer — Clinical Notes tab gets a single secondary "Copy all to EMR"
           CTA. Transcript tab hides the footer entirely. */}
      {activeTab === "emr" &&
      <div className="shrink-0 border-t border-tp-slate-200 bg-white px-3 py-3">
        {coachmarkVisible &&
        <div
          role="note"
          /* Warning-accent palette — orange/amber instead of brand blue.
             This isn't a brand callout, it's a heads-up about
             imperfection in capture, so a soft amber reads more like
             "be careful, scan before you copy" than a marketing tip. */
          /* X moved out of absolute positioning into the flex flow so
             the text physically cannot overlap it. The button is now a
             sibling flex child on the right; the paragraph sits between
             the icon (left) and the close (right) and naturally wraps
             before reaching either. */
          className={cn("vrx-canvas-coachmark mb-[10px] flex items-start gap-[8px] rounded-[10px] px-[10px] py-[8px]", styles.coachmark)}>
          
            <span className="mt-[2px] flex-shrink-0 text-amber-600" aria-hidden>
              <InfoCircle size={16} variant="Bulk" color="currentColor" />
            </span>
            <p className="min-w-0 flex-1 text-[12px] leading-[1.5] text-tp-slate-700">
              <span className="font-semibold text-amber-700">Heads up. </span>
              Notes aren&apos;t always perfect. Copy to your RxPad and fine-tune as needed.
            </p>
            <button
            type="button"
            onClick={dismissCoachmark}
            aria-label="Dismiss tip"
            className="mt-[2px] inline-flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-[6px] text-amber-600/70 transition-colors hover:bg-amber-100/60 hover:text-amber-800">
            
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        }
        <div className="flex items-center gap-2">
          <HoverTooltip content="Fill all of these structured sections into the active RxPad" side="top" fill>
            <button
              type="button"
              onClick={handleCopyToRx}
              disabled={!onCopyToRx}
              className="vrx-cn-secondary-blue flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] px-3 text-[14px] font-semibold transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">

              <CopyGlyph size={16} variant="Linear" color="currentColor" />
              Copy all to RxPad
            </button>
          </HoverTooltip>

          <HoverTooltip content="Quickly edit the clinical notes using voice AI" side="top" align="end">
            <button
              type="button"
              onClick={() => {
                if (coachmarkVisible) dismissCoachmark();
                setQuickEditActive(true);
              }}
              disabled={quickEditActive}
              aria-label="Edit clinical notes with voice"
              className="vrx-rt-voice-cta-outline flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">

              <VoiceRxIcon size={20} color="#673AAC" />
            </button>
          </HoverTooltip>
        </div>
      </div>
      }

      {/* Quick-edit overlay — pinned to the bottom 40% of the canvas.
          Two states share the same surface so the doctor never sees
          a flash:
            - quickEditActive  → VoiceRxModuleRecorder (mic + submit)
            - regenPhase=processing → ShineBorder + loader copy in
              the same dock; the EMR area above renders shimmer
              skeletons. After ~12s the overlay clears and the
              merged notes re-appear. */}
      {overlayActive ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-stretch"
          style={{ height: "40%" }}>
          <div className="pointer-events-auto w-full" data-voice-allow>
            {regenPhase === "processing" ? (
              <div className={cn("flex h-full w-full items-center justify-center px-4 py-4", recorderStyles.recorderBgStack)}>
                <VoiceRxSectionProcessing
                  transcript={transcript}
                  sectionLabel="Clinical Notes" />
              </div>
            ) : (
              <VoiceRxModuleRecorder
                sectionLabel="Clinical Notes"
                showSectionInStatus={false}
                variant="stack"
                fillHeight
                radiusClassName="rounded-none"
                onCancel={() => setQuickEditActive(false)}
                onSubmit={(submittedTranscript) => {
                  setQuickEditActive(false);
                  setRegenPhase("processing");
                  onQuickEditSubmit?.();
                  window.setTimeout(() => {
                    setRegenPhase("idle");
                    toast.success("Clinical notes updated successfully");
                  }, 12000);
                  void submittedTranscript;
                }} />
            )}
          </div>
        </div>
      ) : null}
      {/* vrx-* styles live in app/globals.css */}
    </div>);

}