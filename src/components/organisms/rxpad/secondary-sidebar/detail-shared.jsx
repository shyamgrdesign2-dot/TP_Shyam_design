/**
 * Shared primitives for all detailed section content panels.
 *
 * KEY DESIGN DECISION: SectionCard does NOT use `overflow-clip/hidden` on its
 * wrapper. This allows `position: sticky` on the card header to work correctly
 * relative to the parent scroll container. The rounded border is achieved via
 * `border` + `border-radius` only.
 */
import React, { useEffect, useState } from "react";
import { cn as clsx } from "@/src/hooks/utils";
import { ArrowSquareDown, ArrowSquareUp } from "iconsax-reactjs";
import { rxSidebarTokens, tpSectionCardStyle } from "./tokens";
import { VoiceRxModuleRecorder } from "@/src/components/organisms/voicerx/VoiceRxModuleRecorder";
import { VoiceTranscriptProcessingCard, CaptionCarousel } from "@/src/components/organisms/voicerx/VoiceTranscriptProcessingCard";
import { TPSnackbar } from "@/src/components/molecules/Snackbar";
import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";

function getNearestScrollContainer(element) {
  let current = element.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function useStickyHeaderState(offset = 0) {
  const headerRef = React.useRef(null);
  const [isStuck, setIsStuck] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const node = headerRef.current;
    if (!node) return;

    const scrollRoot =
    node.closest('[data-sticky-scroll-root="true"]') ??
    getNearestScrollContainer(node);
    if (!scrollRoot) return;

    let frame = 0;

    const update = () => {
      const rootRect = scrollRoot.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const atStickyTop = nodeRect.top <= rootRect.top + offset + 0.5;
      setIsStuck(scrollRoot.scrollTop > 0 && atStickyTop);
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    scheduleUpdate();
    scrollRoot.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(scrollRoot);
    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(frame);
      scrollRoot.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      observer.disconnect();
    };
  }, [offset]);

  return { headerRef, isStuck };
}

// ─── Add/Edit Details button (outlined, indigo) ───────────────────────────────

export function ActionButton({
  label = "Add/Edit Details",
  icon = "plus",
  onClick,
  sectionId,
  onVoiceClick














}) {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceProcessingTranscript, setVoiceProcessingTranscript] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const rxSync = useRxPadSync();
  const micDisabled = rxSync.micUnavailable && !isVoiceActive;
  const globalLocked = rxSync.voiceActive && !isVoiceActive;

  const overlayActive = isVoiceActive || !!voiceProcessingTranscript;
  useEffect(() => {
    if (!overlayActive) return;
    const scrollRoot = document.querySelector('[data-sticky-scroll-root="true"]');
    if (!scrollRoot) return;
    const prev = scrollRoot.style.paddingBottom;
    scrollRoot.style.paddingBottom = "42%";
    return () => {scrollRoot.style.paddingBottom = prev;};
  }, [overlayActive]);

  // Flip the global voice-lock while this panel is dictating so every
  // other interactive surface (other sidebar panels, the Rx modules, the
  // Dr. Agent "Start Consultation" button) is frozen. Recorder stays
  // interactive via its own data-voice-allow marker.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isVoiceActive) return;
    const body = document.body;
    body.setAttribute("data-voice-lock", "on");
    body.setAttribute("data-voice-module-lock", sectionId ?? "sidebar");
    return () => {
      body.removeAttribute("data-voice-lock");
      body.removeAttribute("data-voice-module-lock");
    };
  }, [isVoiceActive, sectionId]);

  const handleVoice = onVoiceClick ?
  onVoiceClick :
  sectionId ?
  () => setIsVoiceActive((v) => !v) :
  null;

  const sectionLabel = label.replace(/Add\/Edit\s*/i, "").trim() || "Details";

  return (
    <>
    {/* Bottom-flush recorder overlay — absolute to the panel's
           `relative size-full` container. Takes the lower 40% of the panel
           and uses the `stack` variant so the transcript gets real estate
           like the Dr. Agent voice active panel (vertical layout: transcript
           on top, wave + CTAs below, pill at the bottom edge). */}
    {isVoiceActive ?
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-stretch"
        style={{ height: "40%" }}>
        
        <div className="pointer-events-auto w-full" data-voice-allow>
          <VoiceRxModuleRecorder
            sectionLabel={sectionLabel}
            onCancel={() => setIsVoiceActive(false)}
            onSubmit={(transcript) => {
              setIsVoiceActive(false);
              if (sectionId) {
                const MOCK_TRANSCRIPTS = {
                  history: "The patient reports a family history of diabetes on the maternal side, but no known history of hypertension or cardiac issues.",
                  vitals: "Current vitals: blood pressure 135 over 85, heart rate 78 beats per minute, temperature 98.6 Fahrenheit, respiratory rate 16, SpO2 98 percent on room air.",
                  medicalRecords: "Previous records indicate a mild allergic reaction to penicillin, characterized by a skin rash, diagnosed three years ago.",
                  followUp: "Advised patient to return in two weeks for a review of blood test results and to monitor blood pressure trends.",
                  gynec: "Last menstrual period was on the 15th of March. Cycle is regular, 28 days. No complaints of dysmenorrhea or menorrhagia.",
                  obstetric: "Gravida 2, Para 1, Living 1. Previous delivery was a full-term normal vaginal delivery, no complications.",
                  vaccine: "BCG and Hepatitis B given at birth. OPV and Pentavalent up to date. Due for MMR booster next month.",
                  growth: "Weight 12.4 kg, Height 86 cm. Head circumference 47.5 cm. Plotting on the 50th percentile for both weight and height.",
                  labResults: "Fasting blood sugar 110 mg/dL, HbA1c 6.2 percent. Lipid panel shows total cholesterol 210, LDL 130, HDL 45.",
                  personalNotes: "Patient is compliant with medication. Prefers morning appointments. Caregiver is the daughter, reachable at the secondary number on file."
                };
                const finalTranscript = transcript || MOCK_TRANSCRIPTS[sectionId] || "Patient reported new details via voice dictation.";
                setVoiceProcessingTranscript(finalTranscript);
              }
            }}
            radiusClassName="rounded-none"
            variant="stack"
            fillHeight />
          
        </div>
      </div> :
      voiceProcessingTranscript ?
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-stretch"
        style={{ height: "40%" }}>
        
        {/* Reserve a fixed footer slot under the shiner card so the
             shimmer caption (Structuring → Capturing → Drafting →
             Generating) is ALWAYS visible during the 10s processing
             window. Previously the shiner could grow to take all
             available height and push the caption off-screen, so the
             doctor saw "just the shimmer" with no textual cue. */}
        <div className="pointer-events-auto w-full p-2 h-full flex flex-col gap-[8px] bg-tp-slate-50/90 backdrop-blur-[4px]">
          <div className="min-h-0 flex-1">
            <VoiceTranscriptProcessingCard
              mode="dictation"
              transcript={voiceProcessingTranscript}
              totalMs={4500}
              structuringMs={0}
              onComplete={() => {
                setVoiceProcessingTranscript(null);
                setToastMessage(`${sectionLabel} filled from voice dictation`);
                if (sectionId) {
                  rxSync?.pushHistoricalUpdates?.({
                    [sectionId]: [
                    {
                      id: `voice-${Date.now()}`,
                      bullets: [voiceProcessingTranscript]
                    }]

                  });
                }
              }} />
            
          </div>
          {/* Rotating textual loader — cycles through the AI phases for
               the full 10s. Sits in its own row below the shiner so it
               can't be clipped. */}
          <div className="shrink-0 px-1 pb-1">
            <CaptionCarousel />
          </div>
          <div className="shrink-0 flex items-center justify-center pb-2">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#E2E2EA" strokeWidth="2.5" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="url(#spin-grad-sidebar)" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="spin-grad-sidebar" x1="12" y1="3" x2="21" y2="12" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D565EA" /><stop offset="1" stopColor="#673AAC" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div> :
      null}
    <div className={`bg-white content-stretch flex items-center gap-[8px] p-[12px] relative shrink-0 w-full border-b ${rxSidebarTokens.panelBorderClass}`}>
      <button
          type="button"
          onClick={onClick}
          className="h-[36px] relative shrink-0 flex-1 cursor-pointer bg-transparent p-0 text-left">
          
        <div aria-hidden="true" className="absolute border border-tp-blue-500 border-solid inset-0 pointer-events-none rounded-[10px]" />
        <div className="flex flex-row items-center justify-center size-full rounded-[10px]">
          <div className="content-stretch flex gap-[4px] items-center justify-center px-[16px] py-px relative size-full">
            {icon === "plus" &&
              <div className="relative shrink-0 size-[24px]">
                <svg className="absolute block size-full" fill="none" viewBox="0 0 24 24">
                  <path d="M6 12H18" stroke="var(--tp-blue-500)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d="M12 18V6" stroke="var(--tp-blue-500)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              </div>
              }
            <p className="font-sans font-medium leading-[22px] not-italic relative shrink-0 text-tp-blue-500 text-[14px] text-center whitespace-nowrap">
              {label}
            </p>
          </div>
        </div>
      </button>
      {handleVoice ?
        <button
          type="button"
          onClick={micDisabled || globalLocked ? undefined : handleVoice}
          aria-label={
          globalLocked ?
          "VoiceRx is active — submit or close VoiceRx to use section dictation" :
          micDisabled ?
          rxSync.micUnavailableReason ?? "Microphone unavailable" :
          `Use Voice AI to fill ${label.toLowerCase()}`
          }
          title={
          globalLocked ?
          "VoiceRx is active — submit or close VoiceRx to use section dictation" :
          micDisabled ?
          rxSync.micUnavailableReason ?? "Microphone unavailable" :
          `Use Voice AI to fill ${label.toLowerCase()}`
          }
          {...isVoiceActive ?
          { "data-voice-allow": true } :
          { "data-voice-block": true }}
          aria-disabled={micDisabled || globalLocked || isVoiceActive || !!voiceProcessingTranscript}
          className={clsx(
            "inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center transition-all",
            micDisabled || globalLocked ?
            "opacity-30 cursor-not-allowed" :
            isVoiceActive || voiceProcessingTranscript ?
            "opacity-25 pointer-events-none" :
            "hover:scale-[1.06] active:scale-[0.94]"
          )}>
          
          <span className="tp-voice-wave-icon" />
        </button> :
        null}
    </div>
    <TPSnackbar
        open={Boolean(toastMessage)}
        message={toastMessage ?? ""}
        severity="success"
        // Page-centred (top) so the success pill always lands in the
        // middle column; the dark pill body keeps its content on a
        // single line via `whitespace-nowrap`.
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={1800}
        onClose={() => setToastMessage(null)}
        sx={{
          left: "50% !important",
          right: "auto !important",
          transform: "translateX(-50%) !important",
          top: "24px !important",
          width: "auto",
          maxWidth: "min(560px, calc(100vw - 32px))"
        }}
        slotProps={{ root: { style: { whiteSpace: "nowrap" } } }} />
      
    </>);

}

// ─── Section card ─────────────────────────────────────────────────────────────
// NO overflow-clip → sticky header works relative to scroll container.
// Rounded visual via border-radius on the outer div.










function SectionCardHeader({
  title,
  titleAddon,
  expanded = true,
  onToggle,
  hideChevron = false






}) {
  const { headerRef, isStuck } = useStickyHeaderState();
  const HeaderTag = onToggle ? "button" : "div";
  const radiusClass = expanded ?
  isStuck ?
  "rounded-tl-none rounded-tr-none" :
  "rounded-tl-[10px] rounded-tr-[10px]" :
  "rounded-[10px]";

  return (
    <HeaderTag
      ref={headerRef}
      type={onToggle ? "button" : undefined}
      onClick={onToggle}
      className={clsx(
        "group bg-tp-slate-100 sticky top-0 z-[2] shrink-0 w-full text-left",
        radiusClass,
        onToggle ? "cursor-pointer" : ""
      )}>
      
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[10px] py-[8px] relative w-full">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`flex flex-col font-semibold justify-end leading-[0] not-italic relative shrink-0 text-tp-slate-700 ${rxSidebarTokens.bodyStrongClass}`}>
              <p className="leading-[18px] whitespace-pre-wrap">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Title addon (e.g. Primigravida pill on GPLAE) is now
                always visible — it's primary data for the section,
                not a hover-only secondary affordance. */}
            {titleAddon ? <span>{titleAddon}</span> : null}
            {!hideChevron ?
            <div className="flex items-center justify-center relative shrink-0">
                <div className="flex-none transition-transform duration-150">
                  <div className="relative size-[18px]">
                    {expanded ?
                  <ArrowSquareUp color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" /> :

                  <ArrowSquareDown color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" />
                  }
                  </div>
                </div>
              </div> :
            null}
          </div>
        </div>
      </div>
    </HeaderTag>);

}

export function SectionCard({
  title,
  titleAddon,
  expanded = true,
  onToggle,
  hideChevron = false,
  children
}) {
  return (
    <div className="group/section-card relative shrink-0 w-full" style={tpSectionCardStyle}>
      <SectionCardHeader title={title} titleAddon={titleAddon} expanded={expanded} onToggle={onToggle} hideChevron={hideChevron} />
      {expanded ?
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
          {children}
        </div> :
      null}
    </div>);

}

// ─── Scrollable section list wrapper ─────────────────────────────────────────
// overflow-y-auto here is the scroll container for sticky to work.

export function SectionScrollArea({ children }) {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px overflow-y-auto relative w-full" data-sticky-scroll-root="true">
      <div className="content-stretch flex flex-col gap-[12px] items-center p-[12px] relative w-full">
        {children}
      </div>
    </div>);

}

// ─── Content row (px-10 py-6, full width) ─────────────────────────────────────

export function ContentRow({ children }) {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[10px] py-[6px] relative w-full">
          <div className="flex-[1_0_0] min-h-px min-w-px relative">
            <div className="content-stretch flex flex-col gap-[2px] items-start justify-center relative w-full">
              <div className="font-sans font-normal text-tp-slate-700 text-[14px] leading-[20px] tracking-[0.012px] relative w-full">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}

// ─── Text helpers ─────────────────────────────────────────────────────────────

export function Grey({ children }) {
  // Label tone — matches Obstetric / Gynec inline labels (`text-tp-slate-500`)
  // so every section reads with the same muted-label / dark-value contrast.
  return <span className="text-tp-slate-500">{children}</span>;
}

export function Sep() {
  return <span className="text-tp-slate-300">{" | "}</span>;
}

/**
 * GradientDivider — horizontal 1px line painted with the same neutral
 * slate gradient the top nav bar already uses for its vertical
 * dividers. The original implementation used the AI-violet gradient,
 * which competed with section content; the neutral version recedes
 * cleanly while still feeling like a "soft separator" instead of a
 * hard slate-200 rule.
 *
 * Recipe matches `AppTopHeader`'s vertical dividers:
 *   `from-[rgba(208,213,221,0.2)] via-[#d0d5dd] to-[rgba(208,213,221,0.2)]`
 * rotated 90° (so via→middle peak runs horizontally).
 *
 * Default behaviour: full-width, 1px tall, ~12px vertical spacing.
 */
export function GradientDivider({ className }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "relative w-full h-px shrink-0 my-[12px]",
        "bg-[linear-gradient(90deg,rgba(208,213,221,0)_0%,#d0d5dd_50%,rgba(208,213,221,0)_100%)]",
        className
      )}
    />
  );
}

/**
 * Bullet — small dot pointer used as the leading marker of a row.
 *
 * Tuned to **match the Past Visits / History sections exactly** so
 * Gynec / Obstetric / Vaccine / Ophthal share one bullet language
 * with the rest of the sidebar:
 *
 *   • Size  : 5×5px  (was 6×6px — was reading larger than the
 *               `bg-tp-slate-500` dots in Past Visits)
 *   • Tone  : `tp-slate-500` (was `tp-slate-300` — too light, dots
 *               were near-invisible against the cards)
 *   • Top   : 8px  (was 7px — aligns with `text-[14px] leading-[22px]`
 *               so the bullet sits on the cap-height line of the row)
 *   • Fresh : green-tinted gradient kept for "freshly arrived" rows
 */
export function Bullet({ tone = "default", className }) {
  const colour =
    tone === "fresh"
      ? "linear-gradient(180deg,rgba(74,222,128,0.18)_0%,rgba(34,197,94,0.7)_55%,rgba(16,185,129,0.18)_100%)"
      : "var(--tp-slate-500)";
  return (
    <span
      aria-hidden
      className={clsx(
        "mt-[8px] inline-block h-[5px] w-[5px] shrink-0 rounded-full",
        className
      )}
      style={{ background: colour }}
    />
  );
}

export function Bold({ children }) {
  return <span className={clsx("font-semibold", rxSidebarTokens.bodyStrongClass)}>{children}</span>;
}

export function Red({ children }) {
  return <span className="text-tp-error-500">{children}</span>;
}

// ─── Collapsed card (past date) ───────────────────────────────────────────────

export function CollapsedCard({ text }) {
  return (
    <div className="relative shrink-0 w-full" style={tpSectionCardStyle}>
      <div className="bg-tp-slate-100 relative shrink-0 w-full rounded-[10px]">
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex items-center justify-between px-[10px] py-[8px] relative w-full">
            <div className={`flex flex-col font-medium justify-end leading-[0] not-italic relative shrink-0 text-tp-slate-700 whitespace-nowrap ${rxSidebarTokens.bodyMediumClass}`}>
              <p className="leading-[18px]">{text}</p>
            </div>
            <div className="relative shrink-0 size-[18px]">
              <ArrowSquareDown color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" />
            </div>
          </div>
        </div>
      </div>
    </div>);

}