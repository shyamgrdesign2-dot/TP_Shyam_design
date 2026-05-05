"use client";

import React from "react";

/**
 * ═══════════════════════════════════════════════════════════════
 * FORMAT WITH HIERARCHY — Shared utility for bracket-based text formatting
 * ═══════════════════════════════════════════════════════════════
 *
 * This utility formats text items following the Dr. Agent display convention:
 *
 *   PRIMARY NAME (supportive details in brackets)
 *
 * The primary name is rendered in darker, bolder text (tp-slate-700, font-medium).
 * The parenthetical details are rendered in muted lighter text (tp-slate-400, font-normal).
 *
 * EXAMPLES:
 *   "Amlodipine 10mg (Once daily, increased from 5mg)"
 *     → "Amlodipine 10mg" dark + "(Once daily, increased from 5mg)" muted
 *
 *   "3 days (Recheck BP after medication adjustment)"
 *     → "3 days" dark + "(Recheck BP...)" muted
 *
 *   "Diabetes (1yr)"
 *     → "Diabetes" dark + "(1yr)" muted
 *
 * USED ACROSS:
 *   - RxPreviewCard (medications, follow-up)
 *   - AdviceCard (advice items)
 *   - InvestigationCard (investigation items)
 *   - ProtocolMedsCard (medication suggestions)
 *   - InlineDataRow (all inline values)
 *   - VoiceStructuredRxCard (parsed medication items)
 *   - Any card rendering text with primary + supportive parts
 *
 * CONVENTION:
 *   • Never use em-dashes (—) in data display. Use brackets instead.
 *   • Rx abbreviations should be expanded:
 *     OD → Once daily, BD → Twice daily, TDS → Three times daily,
 *     SOS → As needed, HS → At bedtime, STAT → Stat dose,
 *     BF → Before food, AF → After food, AC → Before meals, PC → After meals
 *   • Notes and context always go inside parentheses.
 *   • Primary name comes first, then supportive details in brackets.
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Render text with primary/secondary color hierarchy based on bracket pattern.
 *
 * @param text - The full text string (e.g., "Amlodipine 10mg (Once daily)")
 * @param primaryClass - CSS class for the primary part (defaults to "font-medium text-tp-slate-700")
 * @param secondaryClass - CSS class for the bracketed part (defaults to "font-normal text-tp-slate-400")
 */
export function formatWithHierarchy(
text,
primaryClass = "font-medium text-tp-slate-700",
secondaryClass = "font-normal text-tp-slate-400")
{
  // Match text with parenthetical suffix: "Primary text (details)"
  const match = text.match(/^(.+?)(\s*\([^)]+\))$/);
  if (match) {
    return (
      <>
        <span className={primaryClass}>{match[1]}</span>
        <span className={secondaryClass}>{match[2]}</span>
      </>);

  }
  // No brackets — render as primary
  return <span className={primaryClass}>{text}</span>;
}

/**
 * Render a list item (bullet point) with hierarchy.
 * Convenience wrapper that adds the bullet prefix.
 */
export function formatBulletWithHierarchy(
text,
primaryClass,
secondaryClass)
{
  return (
    <>
      <span className="text-tp-slate-400 mr-[6px]">•</span>
      {formatWithHierarchy(text, primaryClass, secondaryClass)}
    </>);

}