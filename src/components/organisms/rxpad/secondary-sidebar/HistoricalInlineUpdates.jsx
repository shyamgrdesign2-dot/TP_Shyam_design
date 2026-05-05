"use client";

import { useEffect, useMemo, useState } from "react";

import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/atoms/Tooltip";
import { cn } from "@/src/hooks/utils";
import { ShinyText } from "@/src/components/atoms/ShinyText";












/**
 * How long a freshly-arrived line keeps its shimmer treatment before
 * auto-settling to plain text. Three visual phases:
 *   0 → INTRO_MS                 → gradient text intro animation
 *   INTRO_MS → SHIMMER_TOTAL_MS  → ongoing sweeping shimmer
 *   > SHIMMER_TOTAL_MS           → plain text (settled)
 */
const INTRO_MS = 2000;
const SHIMMER_TOTAL_MS = 6800;

export function isHistoricalMetaLine(text) {
  return /^(history update|clinical capture|new investigations|section:|synced \(|vitals update \(|voice consultation\b)/i.test(
    text.trim()
  );
}

export function useHistoricalSectionHighlights(sectionId) {
  const { historicalUpdates, isHistoricalSectionUnseen } = useRxPadSync();
  const [showTooltipOnFirstOpen] = useState(() => isHistoricalSectionUnseen(sectionId));
  const [introLineIds, setIntroLineIds] = useState({});
  const [shimmeringLineIds, setShimmeringLineIds] = useState({});

  const lines = useMemo(() => {
    return (historicalUpdates[sectionId] ?? []).flatMap((chunk) =>
    chunk.bullets.map((text, index) => ({
      id: `${chunk.id}-${index}`,
      text,
      isFresh: chunk.isFresh
    }))
    );
  }, [historicalUpdates, sectionId]);

  const hasFresh = lines.some((line) => line.isFresh);
  const freshLineIds = useMemo(() => lines.filter((line) => line.isFresh).map((line) => line.id), [lines]);

  useEffect(() => {
    if (!freshLineIds.length) {
      setIntroLineIds({});
      setShimmeringLineIds({});
      return;
    }

    // Phase 1: intro gradient (1.1s)
    setIntroLineIds(Object.fromEntries(freshLineIds.map((id) => [id, true])));
    // Phase 2: ongoing shimmer (until SHIMMER_TOTAL_MS elapsed)
    setShimmeringLineIds(Object.fromEntries(freshLineIds.map((id) => [id, true])));

    const introTimer = window.setTimeout(() => setIntroLineIds({}), INTRO_MS);
    const shimmerTimer = window.setTimeout(() => setShimmeringLineIds({}), SHIMMER_TOTAL_MS);

    return () => {
      window.clearTimeout(introTimer);
      window.clearTimeout(shimmerTimer);
    };
  }, [freshLineIds.join("|")]);

  return {
    lines,
    hasFresh,
    showTooltipOnFirstOpen,
    isIntroLine: (lineId) => Boolean(introLineIds[lineId]),
    /**
     * True while the line should render with the sweeping shimmer treatment.
     * Becomes false after SHIMMER_TOTAL_MS so the text settles to plain.
     */
    isShimmeringLine: (lineId) => Boolean(shimmeringLineIds[lineId]),
    /**
     * True while at least one fresh line is in its shimmer phase. Useful
     * for sections whose fresh items don't carry a stable line id (e.g.
     * Vitals rows derived from transcript matching) — the whole section
     * shimmers, then settles together.
     */
    isShimmerPhaseActive: Object.keys(shimmeringLineIds).length > 0,
    /** Total fresh-line count, regardless of shimmer/intro phase. */
    freshLineCount: freshLineIds.length
  };
}

export function historicalInlineHighlightClass(isHighlighted, _isFresh) {
  /* Row-level wash + left rail removed — the freshness affordance now
     lives only on the TEXT itself via the bg-clip shimmer in
     `historicalInlineTextClass`. The row keeps just the rounded-corner
     padding so the hit area still reads as a single row.
     `marker:` color only fires on <li> elements — no-op on divs. */
  return cn(isHighlighted && "group relative w-full overflow-visible rounded-[6px] marker:text-[#FBBF24]");
}

/**
 * Visual state for fresh data:
 *   - `isIntro`: gradient text intro (first ~1.1s after arrival)
 *   - `isShimmering` && !isIntro: ongoing sweeping shimmer (until ~5.8s)
 *   - default: plain text — the line has "settled" so the doctor can read it
 *
 * Older callers passing only (isHighlighted, isFresh, isIntro) still work:
 * `isShimmering` defaults to `isFresh`, preserving the previous behaviour
 * for components that haven't migrated yet — they just won't auto-settle.
 */
export function historicalInlineTextClass(
isHighlighted,
_isFresh,
isIntro = false,
_isShimmering = false)
{
  // The shimmer is now driven solely by `isHighlighted` — a row that
  // was filled by AI keeps its TP AI text shimmer for the lifetime of
  // the visit (no auto-settle after 6.8s). The intro flicker still
  // runs only on first arrival; the continuous sweep takes over from
  // then on. Recipe + sweep direction match the loader caption
  // (`vrxCaptionShine`) so both surfaces read as the same family.
  // Fresh-data pointers within sidebar sections (Medical History,
  // Vitals, etc.) now use an ORANGE/AMBER shimmer per design call —
  // distinct from the violet AI-fill shimmer the form sections use.
  // The colour family lines up with the bullet `marker:text-[#FBBF24]`
  // already on the row, so the pointer + text read as one fresh
  // affordance.
  return cn(
    isHighlighted &&
    "inline-block rounded-[4px] px-[1px] transition-colors duration-500 ease-out",
    isHighlighted &&
    isIntro &&
    "font-semibold bg-[linear-gradient(92deg,#F59E0B_0%,#D97706_58%,#B45309_100%)] bg-[length:180%_100%] bg-clip-text text-transparent [animation:tpHistoricalTextIntro_1s_cubic-bezier(0.22,1,0.36,1)_2]",
    isHighlighted &&
    !isIntro &&
    "[color:inherit] [background-image:linear-gradient(100deg,#45455c_0%,#45455c_32%,#F59E0B_46%,#D97706_50%,#B45309_54%,#45455c_68%,#45455c_100%)] [background-size:200%_100%] bg-clip-text [-webkit-text-fill-color:transparent] [animation:tpHistoricalTextShimmer_4s_linear_infinite]"
  );
}

export function HistoricalInlineTooltip({
  enabled,
  children



}) {
  if (!enabled) return children;

  return (
    <Tooltip open>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="rounded-lg bg-[#1F2937] px-2.5 py-1.5 text-[12px] leading-[16px] text-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.45)]">
        
        Updated by VoiceRx
      </TooltipContent>
    </Tooltip>);

}

export function HistoricalInlineUpdates({
  sectionId,
  className,
  lines: providedLines




}) {
  const { lines: sectionLines, isIntroLine } = useHistoricalSectionHighlights(sectionId);
  const lines = providedLines ?? sectionLines;

  if (!lines.length) return null;

  return (
    <div className={cn("w-full px-[12px] pt-[12px]", className)}>
      <div className="flex flex-col gap-[6px]">
        {lines.map((line) => {
          const meta = isHistoricalMetaLine(line.text);

          return (
            <div
              key={line.id}
              className={cn("flex items-start gap-[8px] px-[2px] py-[2px]", historicalInlineHighlightClass(!meta, line.isFresh))}>
              
              <span
                aria-hidden
                className={cn(
                  "mt-[4px] h-[16px] w-[2px] shrink-0 rounded-full",
                  meta ? "bg-tp-slate-200" : "bg-[linear-gradient(180deg,rgba(74,222,128,0.08)_0%,rgba(34,197,94,0.6)_52%,rgba(16,185,129,0.16)_100%)]"
                )} />
              
              <p className={cn("min-w-0 text-[12px] leading-[18px] text-tp-slate-700", meta && "font-medium text-tp-slate-500")}>
                {/* Fresh non-meta lines get the React-Bits ShinyText
                     treatment (motion-driven sweep). Settled / non-fresh
                     lines render plain so the doctor can read them. */}
                {!meta && line.isFresh ?
                <ShinyText
                  text={line.text}
                  color="#454551"
                  /* AI-gradient sweep — pink → violet → indigo
                     stops instead of a single violet flash, so the
                     freshly-filled sidebar lines mirror the same
                     "this just got AI-touched" vocabulary used by
                     the Rx-pad module pulse and the shiner card. */
                  shineColor={["#D565EA", "#673AAC", "#1A1994"]}
                  speed={2.4}
                  delay={0.6}
                  spread={120}
                  className="leading-[18px]" /> :


                <span>{line.text}</span>
                }
              </p>
            </div>);

        })}
      </div>
    </div>);

}