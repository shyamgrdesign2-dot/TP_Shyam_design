/**
 * Medication cell inventory — fourth iteration
 * ────────────────────────────────────────────
 * Three-line cell:
 *   row 1  →  editable input + violet VC pill (positioned inline after the name)
 *   row 2  →  generic name (smaller, lighter)
 *   row 3  →  combined stock tag with embedded "Find alt." CTA (chevron arrow)
 *
 * Behaviours:
 *   • Tapping the chevron opens an alternatives popover and turns the cell
 *     "active": a blue focus-ring outlines the entire cell (input row +
 *     block content) so the doctor sees clearly that this cell is the locus
 *     of action. The chevron rotates up while the popover is open.
 *   • The popover shows a 3-second shimmer (simulated load) before content
 *     appears, then either the in-stock alternatives or the empty state.
 *
 * Exports `StockTagCombined` so MedicationSearchRow can reuse the same
 * embedded-CTA tag inside the search dropdown.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getInventoryByName,
  getStockStatus,
  getStockLabel,
  getAlternativesFor
} from "./medication-inventory";

// ───── Pills ──────────────────────────────────────────────────────────────

// Sky-blue gradient — same vivid depth as the previous violet but reads as
// "external reference catalogue" rather than competing with the violet that
// the AI / Voice surfaces already own.
const EV_GRADIENT = "linear-gradient(135deg, #0284C7 0%, #0369A1 60%, #075985 100%)";

function VCPill() {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-[4px] px-[5px] py-px font-['Inter',sans-serif] text-[9px] font-semibold tracking-[0.4px] text-white"
      style={{ background: EV_GRADIENT }}
      title="From the e-Vitals reference catalogue">
      eV
    </span>);
}

export function VCPillMini() {
  return (
    <span
      className="inline-flex items-center rounded-[3px] px-[4px] py-px text-[8px] font-semibold tracking-[0.4px] text-white"
      style={{ background: EV_GRADIENT }}>
      eV
    </span>);
}

// Inline chevron — rotates 180° when its parent CTA is "open".
function ChevronDownIcon({ open }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={"shrink-0 transition-transform duration-150 " + (open ? "rotate-180" : "")}>
      <path d="M6 9l6 6 6-6" />
    </svg>);
}

/**
 * Composite stock tag with an embedded CTA. Same pill recipe — colour swaps
 * between low (amber) and out (red). Used by both the in-cell row 3 and the
 * search-dropdown row's right column so the affordance is identical in
 * either place.
 */
export function StockTagCombined({ inv, ctaLabel, ctaOpen, onCtaClick, ctaAriaLabel }) {
  const status = getStockStatus(inv);
  if (!status || status === "in") return null;
  const palettes = {
    low: {
      bg: "bg-tp-warning-50",
      text: "text-tp-warning-700",
      dot: "bg-tp-warning-500",
      divider: "bg-tp-warning-200",
      ctaText: "text-tp-warning-700",
      ctaUnderline: "decoration-tp-warning-400",
      ctaHover: "hover:text-tp-warning-800"
    },
    out: {
      bg: "bg-tp-error-50",
      text: "text-tp-error-600",
      dot: "bg-tp-error-500",
      divider: "bg-tp-error-200",
      ctaText: "text-tp-error-700",
      ctaUnderline: "decoration-tp-error-400",
      ctaHover: "hover:text-tp-error-800"
    }
  };
  const p = palettes[status];
  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-[6px] rounded-full py-[2px] pl-[8px] pr-[8px] font-['Inter',sans-serif] " +
        p.bg
      }>
      <span className={"inline-flex items-center gap-[4px] text-[10px] font-medium " + p.text}>
        <span className={"h-[5px] w-[5px] shrink-0 rounded-full " + p.dot} aria-hidden="true" />
        {getStockLabel(inv)}
      </span>
      <span aria-hidden="true" className={"inline-block h-[9px] w-px " + p.divider} />
      <button
        type="button"
        aria-label={ctaAriaLabel ?? ctaLabel}
        aria-expanded={ctaOpen}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          onCtaClick();
        }}
        className={
          "inline-flex items-center gap-[2px] text-[10px] font-semibold underline underline-offset-[3px] transition-colors " +
          p.ctaText + " " + p.ctaUnderline + " " + p.ctaHover
        }>
        {ctaLabel}
        <ChevronDownIcon open={ctaOpen} />
      </button>
    </span>);
}

// ───── Skeleton row used during the 3s "load" shimmer ─────────────────────

function SkeletonAltRow({ keyIdx }) {
  // Two stagger widths so the column doesn't read as identical bars.
  const w1 = keyIdx % 2 === 0 ? "w-[58%]" : "w-[68%]";
  const w2 = keyIdx % 2 === 0 ? "w-[42%]" : "w-[36%]";
  return (
    <div className="flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[9px]">
      <div className="flex flex-1 flex-col gap-[5px]">
        <div className={"h-[12px] animate-pulse rounded bg-tp-slate-200 " + w1} />
        <div className={"h-[10px] animate-pulse rounded bg-tp-slate-200/70 " + w2} />
      </div>
      <div className="h-[18px] w-[78px] shrink-0 animate-pulse rounded-full bg-tp-slate-200" />
    </div>);
}

export function AltSkeletonList({ rows = 3 }) {
  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: rows }).map((_, idx) =>
        <SkeletonAltRow key={idx} keyIdx={idx} />
      )}
    </div>);
}

// ───── Text width measurement (matches the input's font) ──────────────────

const measureCanvas = (() => {
  let c = null;
  return () => {
    if (typeof document === "undefined") return null;
    if (!c) c = document.createElement("canvas");
    return c.getContext("2d");
  };
})();

function measureTextWidth(text) {
  const ctx = measureCanvas();
  if (!ctx) return 0;
  ctx.font = '400 14px Inter, "Inter Fallback", sans-serif';
  return ctx.measureText(text || "").width;
}

// ───── Popover with shimmer + empty state ─────────────────────────────────

function AlternativesPopover({ anchorRect, medicineName, onSelect, onClose }) {
  const minWidth = 360;
  const targetWidth = Math.max(minWidth, Math.round(anchorRect.width + 60));
  const maxLeft = Math.max(8, window.innerWidth - targetWidth - 8);
  const left = Math.min(Math.max(anchorRect.left, 8), maxLeft);
  const top = anchorRect.bottom + 6;
  const popRef = useRef(null);

  // 3s simulated load before showing content — same UX cue as the inline
  // expansion in the dropdown.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 3000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const alternatives = loading ? [] : getAlternativesFor(medicineName, 5);

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      aria-label={`In-stock alternatives for ${medicineName}`}
      style={{ position: "fixed", top, left, width: targetWidth, zIndex: 140 }}
      className="rounded-[12px] border border-tp-slate-100 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)]">
      <div className="border-b border-tp-slate-100 px-[14px] py-[10px]">
        <p className="font-['Inter',sans-serif] text-[10px] font-semibold uppercase tracking-[0.4px] text-tp-slate-400">
          In-stock alternatives
        </p>
        <p className="mt-[2px] truncate font-['Inter',sans-serif] text-[13px] font-semibold text-tp-slate-700">
          for {medicineName}
        </p>
      </div>

      <div className="max-h-[300px] overflow-y-auto p-[6px]">
        {loading ?
          <AltSkeletonList rows={4} /> :
        alternatives.length === 0 ?
          <div className="flex flex-col items-center justify-center gap-[6px] px-[14px] py-[28px] text-center">
            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-tp-slate-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tp-slate-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 9h.01M15 9h.01M8 15h8" />
              </svg>
            </div>
            <p className="font-['Inter',sans-serif] text-[13px] font-semibold text-tp-slate-700">
              No alternatives available
            </p>
            <p className="max-w-[260px] font-['Inter',sans-serif] text-[12px] leading-[16px] text-tp-slate-400">
              Nothing in stock matches this medicine&rsquo;s class right now.
            </p>
          </div> :

          alternatives.map((alt) =>
            <button
              key={alt.name}
              type="button"
              onClick={() => {
                onSelect(alt.name);
                onClose();
              }}
              className="flex w-full items-start gap-[10px] rounded-[8px] px-[10px] py-[9px] text-left transition-colors hover:bg-tp-slate-50">
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <div className="flex items-center gap-[8px]">
                  <span className="min-w-0 truncate font-['Inter',sans-serif] text-[13px] font-medium text-tp-slate-700">
                    {alt.name}
                  </span>
                  {alt.source === "VC" ? <VCPillMini /> : null}
                </div>
                {alt.generic ?
                  <span className="truncate font-['Inter',sans-serif] text-[11px] leading-[14px] text-tp-slate-400">
                    {alt.generic}
                  </span> :
                  null}
              </div>
              <span className="inline-flex shrink-0 items-center gap-[5px] rounded-full bg-tp-success-50 px-[8px] py-[2px] text-[10px] font-medium font-['Inter',sans-serif] text-tp-success-700">
                <span className="h-[5px] w-[5px] rounded-full bg-tp-success-500" aria-hidden="true" />
                {getStockLabel(alt)}
              </span>
            </button>
          )
        }
      </div>
    </div>,
    document.body);
}

// ───── Public overlay ──────────────────────────────────────────────────────

export function MedicationCellInventory({ value, onSelect }) {
  const inv = getInventoryByName(value);
  const status = getStockStatus(inv);
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);

  // Compute VC pill position so it sits inline immediately after the name.
  const [vcLeft, setVcLeft] = useState(null);
  useLayoutEffect(() => {
    if (!inv || inv.source !== "VC") return;
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      const w = Math.ceil(measureTextWidth(value));
      setVcLeft(12 + w + 6);
    };
    apply();
    document.fonts?.ready?.then(apply);
    return () => { cancelled = true; };
  }, [value, inv]);

  const openPopover = useCallback(() => {
    const td = anchorRef.current?.closest("td");
    const rect = (td ?? anchorRef.current)?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ left: rect.left, bottom: rect.bottom, width: rect.width });
    setOpen(true);
  }, []);

  if (!inv) return null;

  const showStockRow = status === "low" || status === "out";

  return (
    <>
      {/* Anchor for popover positioning */}
      <span ref={anchorRef} aria-hidden="true" className="absolute left-0 top-0 h-0 w-0" />

      {/* Active-state ring — covers the FULL outer cell (input row + block
          content below), growing with the cell as its height changes. */}
      {open ?
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[2px] z-10 rounded-[6px] border border-tp-blue-500 shadow-[0_0_0_2px_rgba(75,74,213,0.16)]" /> :
        null}

      {/* VC pill inline after the rendered name */}
      {inv.source === "VC" && vcLeft != null ?
        <span
          className="pointer-events-none absolute z-30 -translate-y-1/2"
          style={{ left: vcLeft, top: 26 }}>
          <VCPill />
        </span> :
        null}

      {/* Block content — row 2 (generic) + row 3 (stock+CTA tag) */}
      {inv.generic || showStockRow ?
        <div className="-mt-[14px] flex flex-col gap-[2px] px-[12px] pb-[8px]">
          {inv.generic ?
            <p className="truncate font-['Inter',sans-serif] text-[11px] leading-[14px] text-tp-slate-400">
              {inv.generic}
            </p> :
            null}
          {showStockRow ?
            <div className="mt-[3px] flex items-center">
              <StockTagCombined
                inv={inv}
                ctaLabel="Find alt."
                ctaOpen={open}
                onCtaClick={openPopover}
                ctaAriaLabel={`Find in-stock alternatives for ${value}`} />
            </div> :
            null}
        </div> :
        null}

      {open && anchor ?
        <AlternativesPopover
          anchorRect={anchor}
          medicineName={value}
          onSelect={onSelect}
          onClose={() => setOpen(false)} /> :
        null}
    </>);
}

export default MedicationCellInventory;
