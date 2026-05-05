"use client";

import React from "react";
import { SectionTag } from "./SectionTag";
import { ActionableTooltip } from "./ActionableTooltip";
import { CopyIcon } from "./CopyIcon";
import { FlagArrow } from "../shared/FlagArrow";
import { cn, safeClipboardWrite } from "@/src/hooks/utils";
import { useTouchDevice } from "@/src/hooks/use-touch-device";
import { SECTION_INLINE_SUBKEY_CLASS } from "../shared/sectionInlineKey";



























const FLAG_STYLES = {
  normal: "text-tp-slate-800",
  high: "text-tp-error-600 font-medium",
  low: "text-tp-error-600 font-medium",
  warning: "text-tp-warning-600 font-medium",
  success: "text-tp-success-600 font-medium"
};


/** Tooltip mapping for known tag labels */
const TAG_TOOLTIPS = {
  "Today's Vitals": { tooltip: "Open detailed vitals", copyTooltip: "Fill all vitals to RxPad" },
  "Key Labs": { tooltip: "Open lab results", copyTooltip: "Fill all lab values to RxPad" },
  "History": { tooltip: "Open medical history", copyTooltip: "Fill history to RxPad" },
  "Medical History": { tooltip: "Open medical history", copyTooltip: "Fill history to RxPad" },
  "Last Visit": { tooltip: "Open past visits", copyTooltip: "Fill last visit to RxPad" },
  "Symptoms": { tooltip: "View symptoms", copyTooltip: "Fill all symptoms to RxPad" },
  "Examination": { tooltip: "View examination", copyTooltip: "Fill examination to RxPad" },
  "Diagnosis": { tooltip: "View diagnosis", copyTooltip: "Fill diagnosis to RxPad" },
  "Medication": { tooltip: "View medication", copyTooltip: "Fill medication to RxPad" },
  "Investigation": { tooltip: "View investigations", copyTooltip: "Fill investigations to RxPad" },
  "Advice": { tooltip: "View advice", copyTooltip: "Fill advice to RxPad" },
  "Follow-up": { tooltip: "View follow-up", copyTooltip: "Fill follow-up to RxPad" }
};

/** Truncate text for display */
function truncate(text, maxLen = 30) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

/** Check if a value is compound (contains comma-separated sub-values) */
function isCompoundValue(value) {
  return value.includes(", ");
}

/** Split compound value into individual sub-values, respecting parentheses */
function splitCompoundValue(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;else
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Extract a clean display name from a sub-value, e.g. "Diabetes (1yr)" -> "Diabetes" */
function extractDisplayName(subValue) {
  // Remove parenthetical suffixes like "(1yr)", "(6mo)" for tooltip label
  const match = subValue.match(/^([^(]+)/);
  return match ? match[1].trim() : subValue.trim();
}

/**
 * ═══════════════════════════════════════════════════════════════
 * COLOR HIERARCHY SYSTEM FOR INLINE VALUES
 * ═══════════════════════════════════════════════════════════════
 *
 * Simple rule:
 *   • Text before brackets → tp-slate-700 (primary, dark)
 *   • Text inside brackets → tp-slate-400 (secondary, lighter)
 *   • Pipe dividers ( | ) and dot ( · ) → tp-slate-200 (lightest)
 *   • Value keys (BP:, lab name:, etc.) → SECTION_INLINE_SUBKEY_CLASS (shared with SbarOverviewCard / other cards)
 *   • Commas stay same color as surrounding text
 *
 * That's it. No complex classification of what's "numeric" vs "clinical".
 * The bracket is the only delimiter between primary and secondary.
 *
 * ── Layout principle (dense clinical rows) ──
 * Do not wrap section content in flex-row + flex-wrap for Sx | Dx | Rx style
 * rows: flex items get min-width:auto and tend to jump to the next line as
 * whole chunks, wasting horizontal space. Prefer normal inline flow (inline /
 * inline-block) so prose wraps at word boundaries and pipe dividers stay
 * mid-line until the viewport forces a break. Simple value cells here use
 * `inline`, not `inline-flex`, so long vitals/labs/last-visit lines use the
 * full card width.
 *
 * Examples:
 *   "Diabetes (2yr, Active)" → "Diabetes" dark + "(2yr, Active)" light
 *   "35-40 days (Irregular)" → "35-40 days" dark + "(Irregular)" light
 *   "7 days · Heavy (5 pads/day)" → "7 days" dark + "·" lightest + "Heavy" dark + "(5 pads/day)" light
 * ═══════════════════════════════════════════════════════════════
 */

function renderWithColorHierarchy(text, flagClass) {
  // 1. Parenthetical suffixes: "Diabetes (1yr)" → primary + (secondary)
  const parenMatch = text.match(/^(.+?)(\s*\([^)]+\))$/);
  if (parenMatch) {
    return (
      <>
        <span className={flagClass}>{parenMatch[1].trim()}</span>
        <span className="text-tp-slate-400 font-normal">{parenMatch[2]}</span>
      </>);

  }

  // 2. Dot/bullet separated: "7 days · Heavy (5 pads/day)"
  if (text.includes(" · ")) {
    const segments = text.split(" · ");
    return (
      <>
        {segments.map((seg, i) => {
          const trimSeg = seg.trim();
          const innerParen = trimSeg.match(/^(.+?)(\s*\([^)]+\))$/);
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-tp-slate-200"> · </span>}
              {innerParen ?
              <>
                  <span className={flagClass}>{innerParen[1].trim()}</span>
                  <span className="text-tp-slate-400 font-normal">{innerParen[2]}</span>
                </> :

              <span className={flagClass}>{trimSeg}</span>
              }
            </React.Fragment>);

        })}
      </>);

  }

  // 3. Default: primary (dark)
  return <span className={flagClass}>{text}</span>;
}

export function InlineDataRow({
  tag,
  tagIcon,
  tagVariant,
  values,
  onTagClick,
  onTagCopy,
  className,
  source,
  allowCopyToRxPad,
  copyDestination = "RxPad",
  trailingNote,
  showValueDivider = true
}) {
  const isTouch = useTouchDevice();
  const showCopy = source !== "existing" || allowCopyToRxPad === true;
  const tooltips = TAG_TOOLTIPS[tag];
  const destinationLabel = copyDestination.trim() || "RxPad";
  const sectionCopyTooltip = destinationLabel === "RxPad" ?
  tooltips?.copyTooltip || `Fill all ${tag.toLowerCase()} to RxPad` :
  `Fill all ${tag.toLowerCase()} to ${destinationLabel}`;

  const handleCopyText = (text) => {
    safeClipboardWrite(text);
  };

  const handleCopyAll = () => {
    const text = values.map((v) => `${v.key}: ${v.value}`).join("\n");
    safeClipboardWrite(text);
    onTagCopy?.();
  };

  const tagHidden = !tag.trim();
  /** Preserve sidebar nav when tag is omitted (no SectionTag hit target) */
  const rowActsAsTagNav = tagHidden && !!onTagClick && !showCopy;

  /** Render a single (non-compound) value with ActionableTooltip */
  /** Render a single (non-compound) value with color hierarchy applied */
  const renderSimpleValue = (v) => {
    const flagArrowType = v.flag === "high" ? "high" : v.flag === "low" ? "low" : null;
    // Keep Unicode in copy text for clipboard readability
    const flagPrefix = flagArrowType === "high" ? "\u25B2" : flagArrowType === "low" ? "\u25BC" : "";
    const copyText = `${v.key}: ${flagPrefix}${v.value}`;
    const tooltipLabel = `Fill ${truncate(copyText)} to ${destinationLabel}`;
    const flagClass = cn(FLAG_STYLES[v.flag || "normal"]);

    if (!showCopy) {
      return (
        <span className="inline">
          {v.key && <span className={SECTION_INLINE_SUBKEY_CLASS}>{v.key}:&nbsp;</span>}
          {flagArrowType && <FlagArrow flag={flagArrowType} className="mr-[2px]" />}
          {renderWithColorHierarchy(v.value, flagClass)}
        </span>);

    }

    return (
      <ActionableTooltip
        label={tooltipLabel}
        onAction={() => handleCopyText(copyText)}>
        
        <span className="inline cursor-pointer">
          {v.key && <span className={SECTION_INLINE_SUBKEY_CLASS}>{v.key}:&nbsp;</span>}
          {flagArrowType && <FlagArrow flag={flagArrowType} className="mr-[2px]" />}
          {renderWithColorHierarchy(v.value, flagClass)}
        </span>
      </ActionableTooltip>);

  };

  /** Render a compound value (comma-separated) with individual sub-value tooltips */
  const renderCompoundValue = (v) => {
    const subValues = splitCompoundValue(v.value);
    const count = subValues.length;
    const keyTooltipLabel = `Fill ${count} ${v.key.toLowerCase()} to ${destinationLabel}`;
    const keyCopyText = `${v.key}: ${v.value}`;

    if (!showCopy) {
      return (
        <span className="inline">
          {v.key && <span className={SECTION_INLINE_SUBKEY_CLASS}>{v.key}:&nbsp;</span>}
          {subValues.map((sub, j) =>
          <span key={j}>
              {renderWithColorHierarchy(sub, cn(FLAG_STYLES[v.flag || "normal"]))}
              {j < subValues.length - 1 &&
            <span className="text-tp-slate-400">, </span>
            }
            </span>
          )}
        </span>);

    }

    return (
      <span className="inline">
        {/* Key label — hovering copies all sub-values */}
        <ActionableTooltip
          label={keyTooltipLabel}
          onAction={() => handleCopyText(keyCopyText)}>
          
          <span className={cn(SECTION_INLINE_SUBKEY_CLASS, "cursor-pointer")}>{v.key ? `${v.key}: ` : ""}</span>
        </ActionableTooltip>

        {/* Each sub-value gets its own tooltip — with color hierarchy for durations */}
        {subValues.map((sub, j) => {
          const displayName = extractDisplayName(sub);
          const subTooltipLabel = `Fill ${truncate(displayName)} to ${destinationLabel}`;

          return (
            <span key={j}>
              <ActionableTooltip
                label={subTooltipLabel}
                onAction={() => handleCopyText(sub)}>
                
                <span className="cursor-pointer">
                  {renderWithColorHierarchy(sub, cn(FLAG_STYLES[v.flag || "normal"]))}
                </span>
              </ActionableTooltip>
              {j < subValues.length - 1 &&
              <span className="text-tp-slate-400">, </span>
              }
            </span>);

        })}
      </span>);

  };

  return (
    <div
      className={cn(
        "relative rounded-[4px] px-[3px] -mx-[3px] text-[14px] leading-[1.7] text-tp-slate-800 transition-colors",
        showCopy ?
        "group/section pr-[20px] hover:bg-tp-slate-50/80" :
        "",
        rowActsAsTagNav && "cursor-pointer",
        className
      )}
      role={rowActsAsTagNav ? "button" : undefined}
      tabIndex={rowActsAsTagNav ? 0 : undefined}
      onClick={rowActsAsTagNav ? onTagClick : undefined}
      onKeyDown={
      rowActsAsTagNav ?
      (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTagClick?.();
        }
      } :
      undefined
      }>
      
      {/* Tag — omit when label empty (e.g. SBAR full-width section headers) */}
      {!tagHidden ?
      <>
          <SectionTag
          label={tag}
          icon={tagIcon}
          variant={tagVariant}
          onClick={onTagClick}
          tooltip={tooltips?.tooltip} />
        {" "}
        </> :
      null}

      {/* Values — inline wrapping (full width; avoid flex chunks per value) */}
      {values.map((v, i) =>
      <span key={v.key ? `${v.key}-${i}` : `v-${i}`}>
          {isCompoundValue(v.value) ?
        renderCompoundValue(v) :
        renderSimpleValue(v)
        }
          {i < values.length - 1 && (
        showValueDivider ?
        <span className="mx-[6px] text-tp-slate-200">|</span> :

        <span className="text-tp-slate-400">, </span>)
        }
        </span>
      )}

      {/* Trailing note — lighter italic text (e.g. doctor name on last visit) */}
      {trailingNote &&
      <span className="ml-[4px] text-[14px] italic text-tp-slate-400 font-normal">
          — {trailingNote}
        </span>
      }

      {/* Section copy icon */}
      {showCopy && values.length > 0 &&
      <ActionableTooltip
        label={sectionCopyTooltip}
        onAction={handleCopyAll}
        className={cn("absolute right-0 top-[2px] transition-opacity", isTouch ? "opacity-70" : "opacity-0 group-hover/section:opacity-100")}>
        
          <CopyIcon size={14} onClick={handleCopyAll} />
        </ActionableTooltip>
      }
    </div>);

}