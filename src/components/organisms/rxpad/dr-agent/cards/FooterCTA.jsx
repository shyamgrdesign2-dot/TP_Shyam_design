"use client";

import Link from "next/link";
import { cn } from "@/src/hooks/utils";

/**
 * ═══════════════════════════════════════════════════════════════
 * FOOTER CTA — Pixel-perfect match to Card Anatomy Footer Zone
 * ═══════════════════════════════════════════════════════════════
 *
 * Specs (from FooterVariantPreview in Card Anatomy):
 *   Height:        36px
 *   Border radius: 10px
 *   Font:          12px, medium weight
 *   Padding:       px-2
 *   Icon gap:      4px
 *
 * SINGLE CTA:
 *   Width:    w-[250px] max-w-full (fixed, left-aligned)
 *   Align:    always left (justify-start)
 *
 * TWO CTAs:
 *   Width:    flex-1 each (equal split, fills full card width)
 *   Tertiary: gradient divider between them
 *   Secondary: 24px (w-6) spacer between them, NO divider
 *
 * TONES:
 *   primary (tertiary):  transparent bg, blue text — NAVIGATION
 *   secondary:           border + white bg, blue text — ACTIONS
 *   danger:              border + white bg, red text — Cancel/destructive
 *   success:             border + white bg, green text — Confirmed
 *   neutral:             transparent bg, gray text — Disabled
 * ═══════════════════════════════════════════════════════════════
 */
















// Tertiary tones (no border, transparent bg)
const tertiaryTones = {
  primary: "text-tp-blue-500 hover:bg-tp-blue-50/60",
  neutral: "text-tp-slate-400"
};

// Secondary/bordered tones (border + white bg)
const borderedTones = {
  secondary: "border-tp-blue-200 text-tp-blue-500 hover:border-tp-blue-300 hover:bg-tp-blue-50/60",
  danger: "border-tp-error-200 text-tp-error-600 hover:border-tp-error-300 hover:bg-tp-error-50",
  success: "border-tp-success-200 text-tp-success-600 hover:border-tp-success-300 hover:bg-tp-success-50"
};

function isBorderedTone(tone) {
  return tone === "secondary" || tone === "danger" || tone === "success";
}

function buildClassName({
  tone = "primary",
  disabled = false,
  fullWidth = false,
  compact = false
}) {
  // Single CTA: hug content starting at min 200px, grow with text, cap at available space.
  // Two CTAs (fullWidth): flex-1 each, equal split filling full footer width.
  // Compact: no min-width, just hug the text.
  const widthClass = fullWidth ? "flex-1 w-0" : compact ? "" : "min-w-[200px]";
  const base = `${widthClass} inline-flex h-[36px] items-center justify-center gap-[4px] rounded-[10px] px-3 text-[14px] font-medium transition-colors`;

  const bordered = isBorderedTone(tone);
  const toneClass = bordered ?
  `border bg-white ${borderedTones[tone] || borderedTones.secondary}` :
  `${tertiaryTones[tone] || tertiaryTones.primary}`;

  return cn(
    base,
    toneClass,
    disabled && "cursor-not-allowed opacity-40 pointer-events-none"
  );
}

export function FooterCTA({
  label,
  onClick,
  href,
  target,
  rel,
  tone = "primary",
  iconLeft,
  iconRight,
  disabled = false,
  align = "left",
  fullWidth = false,
  compact = false
}) {
  const className = buildClassName({ tone, disabled, fullWidth, compact });

  const content =
  <>
      {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
      <span className="truncate">{label}</span>
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </>;


  // When fullWidth (2-CTA layout): render button directly with flex-1, no wrapper div
  if (fullWidth) {
    if (href) {
      return <Link href={href} target={target} rel={rel} className={className}>{content}</Link>;
    }
    return <button type="button" onClick={onClick} disabled={disabled} className={className}>{content}</button>;
  }

  // Single CTA: wrap in left-aligned flex container
  const wrapperClassName = cn("flex", align === "center" ? "justify-center" : "justify-start");

  if (href) {
    return (
      <div className={wrapperClassName}>
        <Link href={href} target={target} rel={rel} className={className}>{content}</Link>
      </div>);

  }

  return (
    <div className={wrapperClassName}>
      <button type="button" onClick={onClick} disabled={disabled} className={className}>{content}</button>
    </div>);

}

/**
 * Two-CTA wrapper for TERTIARY footers.
 * Equal split with centered gradient divider between them.
 */
export function FooterCTAGroupTertiary({ children }) {
  return (
    <div className="flex items-center">
      {children}
    </div>);

}

/**
 * Two-CTA wrapper for SECONDARY/bordered footers.
 * Equal split with 24px (w-6) spacing between bordered buttons.
 */
export function FooterCTAGroup({ children }) {
  return (
    <div className="flex items-center gap-6">
      {children}
    </div>);

}

/**
 * Gradient divider line — use between two TERTIARY CTAs only.
 */
export function FooterDivider() {
  return (
    <div
      className="h-[20px] flex-shrink-0"
      style={{
        width: "1px",
        background: "linear-gradient(180deg, transparent 0%, #CBD5E1 50%, transparent 100%)"
      }} />);


}