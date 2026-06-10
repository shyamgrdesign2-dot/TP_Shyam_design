/**
 * Medication search dropdown row — third iteration
 * ─────────────────────────────────────────────────
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │ Cetirizine 10mg Tablet [VC]               [● Out of stock | Show alt. ▾]│
 *   │ Cetirizine Hydrochloride                                              │
 *   └──────────────────────────────────────────────────────────────────────┘
 *      └ Alternatives in stock                                  (expansion)
 *          (3s shimmer skeleton → real rows)
 *
 * Visual + interaction rules:
 *  • Stock + "Show alt." live inside a single rounded pill — same recipe as
 *    the in-cell tag (StockTagCombined). Chevron rotates when expanded.
 *  • In-stock medicines render only the plain green stock chip — no CTA.
 *  • Opening the inline expansion shows a 3-second skeleton shimmer before
 *    the alternatives are revealed, simulating the network call we'll wire.
 *  • Only one option's expansion is open at a time — that state is owned by
 *    EditableTableModule and passed in via isExpanded / setExpanded.
 */
import React, { useEffect, useState } from "react";
import {
  getInventoryByName,
  getStockStatus,
  getStockLabel,
  getAlternativesFor
} from "./medication-inventory";
import { StockTagCombined, VCPillMini, AltSkeletonList } from "./MedicationCellInventory";

// ───── Pieces ─────────────────────────────────────────────────────────────

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

// Plain green chip — used only for in-stock medicines (the StockTagCombined
// returns null for "in" since there's nothing to find alternatives for).
function InStockChip({ inv }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-[4px] rounded-full bg-tp-success-50 px-[8px] py-[2px] font-['Inter',sans-serif] text-[10px] font-medium text-tp-success-700">
      <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-tp-success-500" aria-hidden="true" />
      {getStockLabel(inv)}
    </span>);
}

// Inline alternative row inside the expansion — subtle green tint so the
// rows read as "available / safe to swap in" at a glance.
function AlternativeRow({ inv, onSelect }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(inv.name);
      }}
      className="group flex w-full items-start gap-[10px] rounded-[6px] bg-white px-[10px] py-[8px] text-left transition-colors hover:bg-tp-slate-50">
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <div className="flex items-center gap-[6px]">
          <span className="min-w-0 truncate font-['Inter',sans-serif] text-[13px] font-medium text-tp-slate-700">
            {inv.name}
          </span>
          {inv.source === "VC" ? <VCPillMini /> : null}
        </div>
        {inv.generic ?
          <span className="truncate font-['Inter',sans-serif] text-[11px] leading-[14px] text-tp-slate-400">
            {inv.generic}
          </span> :
          null}
      </div>
      <InStockChip inv={inv} />
    </button>);
}

// ───── Public row ─────────────────────────────────────────────────────────

export function MedicationSearchRow({
  option,
  index,
  isHighlighted,
  isExpanded,
  setExpanded,
  onSelect,
  // Host-forwarded tag (e.g. "DDI match") rendered alongside VC so DDI
  // warnings remain visible on the medicine row.
  tag
}) {
  const value = typeof option === "string" ? option : option?.name;
  const inv = getInventoryByName(value);
  const status = getStockStatus(inv);
  const canShowAlts = status === "low" || status === "out";

  // 3-second shimmer when the expansion opens — simulated "fetching
  // alternatives" feedback so the empty moment between click and content
  // doesn't look like a bug.
  const [loadingAlts, setLoadingAlts] = useState(false);
  useEffect(() => {
    if (!isExpanded || !canShowAlts) {
      setLoadingAlts(false);
      return;
    }
    setLoadingAlts(true);
    const t = window.setTimeout(() => setLoadingAlts(false), 3000);
    return () => window.clearTimeout(t);
  }, [isExpanded, canShowAlts]);

  const alternatives = loadingAlts ? [] : (canShowAlts ? getAlternativesFor(value, 5) : []);

  return (
    <div className="flex w-full flex-col">
      <div
        className={
          "flex w-full items-start gap-3 rounded-[8px] px-[10px] py-[8px] " +
          (isHighlighted ? "bg-tp-slate-100" : "hover:bg-tp-slate-100/70")
        }>
        {/* Left column — name + VC + generic */}
        <button
          type="button"
          data-rx-menu-index={index}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(value)}
          className="flex min-w-0 flex-1 flex-col items-stretch gap-[2px] bg-transparent p-0 text-left">
          <div className="flex w-full min-w-0 items-center gap-[6px]">
            <span className="min-w-0 truncate font-['Inter',sans-serif] text-[14px] font-medium text-tp-slate-700">
              {value}
            </span>
            {inv?.source === "VC" ? <VCPill /> : null}
            {tag}
          </div>
          <span className="min-w-0 truncate font-['Inter',sans-serif] text-[11px] leading-[14px] text-tp-slate-400">
            {inv?.generic ?? "—"}
          </span>
        </button>

        {/* Right column — single combined tag (low/out) or plain in-stock chip */}
        <div className="flex shrink-0 items-start pt-[2px]">
          {canShowAlts ?
            <StockTagCombined
              inv={inv}
              ctaLabel="Show alt."
              ctaOpen={isExpanded}
              onCtaClick={() => setExpanded(!isExpanded)}
              ctaAriaLabel={`Show in-stock alternatives for ${value}`} /> :
            status === "in" ?
            <InStockChip inv={inv} /> :
            null}
        </div>
      </div>

      {/* Inline expansion — reads as a nested subsection of the parent
          medicine row: subtle slate card, no violet accent, with greenish
          alternative rows tucked inside. */}
      {isExpanded && canShowAlts ?
        <div className="mx-[6px] mb-[6px] mt-[2px] rounded-[10px] bg-tp-slate-50/80 p-[8px] ring-1 ring-inset ring-tp-slate-200/60">
          <p className="px-[4px] pb-[6px] font-['Inter',sans-serif] text-[10px] font-semibold uppercase tracking-[0.4px] text-tp-slate-500">
            {loadingAlts ? "Loading alternatives…" :
              alternatives.length > 0 ? "Alternatives in stock" :
                "No in-stock alternatives in your formulary"}
          </p>
          {loadingAlts ?
            <AltSkeletonList rows={3} /> :
            <div className="flex flex-col gap-[4px]">
              {alternatives.map((alt) =>
                <AlternativeRow key={alt.name} inv={alt} onSelect={onSelect} />
              )}
            </div>
          }
        </div> :
        null}
    </div>);
}

export default MedicationSearchRow;
