"use client";

import { useRef, useEffect } from "react";
import { ArrowLeft, XCircle } from "lucide-react";


















/**
 * Base expanded panel container for sidebar sections.
 *
 * Layout rules:
 *   - Width: 360px on desktop, 320px on tablet, full on mobile
 *   - Background: TP Slate 0 (white)
 *   - Border: 1px TP Slate 200 right edge
 *   - Border radius: 0 (flush with sidebar)
 *   - Shadow: shadow-2 on right edge for depth
 *   - Header: 56px height, sticky top, divider below
 *   - Content: scrollable, padding 16px
 *   - Animation: slide-in from left, 200ms ease-out
 *
 * Design tokens:
 *   - Header bg: TP Slate 0
 *   - Header text: TP Slate 900 (title), TP Slate 500 (count)
 *   - Close button: TP Slate 400 → TP Slate 600 on hover
 *   - Divider: TP Slate 200
 *   - Content bg: TP Slate 50
 */
export function ExpandedPanel({
  sectionId,
  title,
  icon,
  isOpen,
  onClose,
  count,
  subtitle,
  headerActions,
  children
}) {
  const panelRef = useRef(null);

  // Focus trap — focus panel when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="complementary"
      aria-label={`${title} panel`}
      data-section={sectionId}
      tabIndex={-1}
      className="
        flex h-full w-[360px] flex-col
        border-r border-tp-slate-200
        bg-tp-slate-0
        shadow-[2px_0_8px_-2px_rgba(23,23,37,0.08)]
        outline-none
        animate-in slide-in-from-left-2 duration-200
        max-lg:w-[320px] max-md:w-full
      ">








      
      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-tp-slate-200 px-4">
        <button
          type="button"
          onClick={onClose}
          className="
            flex items-center justify-center rounded-lg p-1.5
            text-tp-slate-400 transition-colors
            hover:bg-tp-slate-100 hover:text-tp-slate-600
          "




          aria-label="Close panel">
          
          <ArrowLeft size={18} />
        </button>

        {icon &&
        <span className="flex items-center justify-center text-tp-blue-500">
            {icon}
          </span>
        }

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-tp-slate-900" style={{ fontFamily: "var(--font-heading)" }}>
              {title}
            </h2>
            {count !== undefined && count > 0 &&
            <span className="inline-flex items-center justify-center rounded-full bg-tp-blue-50 px-2 py-0.5 text-[12px] font-semibold text-tp-blue-600">
                {count}
              </span>
            }
          </div>
          {subtitle &&
          <p className="truncate text-[12px] text-tp-slate-400">{subtitle}</p>
          }
        </div>

        {headerActions &&
        <div className="flex items-center gap-1">
            {headerActions}
          </div>
        }

        <button
          type="button"
          onClick={onClose}
          className="
            flex items-center justify-center rounded-lg p-1.5
            text-tp-slate-300 transition-colors
            hover:bg-tp-slate-100 hover:text-tp-slate-500
            max-md:hidden
          "





          aria-label="Close panel">
          
          <XCircle size={18} />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-tp-slate-50/50">
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>);

}

/**
 * Sub-section header within an expanded panel.
 * Used for grouping related data (e.g., "Allergies", "Chronic Conditions").
 */
export function PanelSubSection({
  title,
  count,
  actions,
  children,
  defaultOpen = true






}) {
  return (
    <details open={defaultOpen} className="group/section mb-4 last:mb-0">
      <summary className="
        flex cursor-pointer items-center gap-2 rounded-lg px-1 py-2
        text-xs font-semibold uppercase tracking-wider text-tp-slate-500
        hover:text-tp-slate-700
        [&::-webkit-details-marker]:hidden
        list-none
      ">





        
        <svg
          className="h-3 w-3 shrink-0 transition-transform group-open/section:rotate-90"
          fill="none"
          viewBox="0 0 12 12">
          
          <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{title}</span>
        {count !== undefined &&
        <span className="rounded-full bg-tp-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-tp-slate-600">
            {count}
          </span>
        }
        {actions &&
        <span className="ml-auto flex items-center gap-1">{actions}</span>
        }
      </summary>
      <div className="mt-1 pl-5">
        {children}
      </div>
    </details>);

}

/**
 * Data row within a panel — single key-value pair or labeled content.
 * Supports copy-on-hover behavior.
 */
export function PanelDataRow({
  label,
  value,
  highlight,
  className = "",
  children






}) {
  const highlightStyles = {
    normal: "",
    warning: "text-tp-warning-600",
    critical: "text-tp-error-600 font-semibold",
    info: "text-tp-blue-600"
  };

  return (
    <div className={`group flex items-start gap-2 py-1 text-sm ${className}`}>
      {label &&
      <span className="shrink-0 text-tp-slate-500 min-w-[100px] text-xs">{label}</span>
      }
      {value &&
      <span className={`flex-1 text-tp-slate-800 text-xs ${highlight ? highlightStyles[highlight] : ""}`}>
          {value}
        </span>
      }
      {children}
    </div>);

}

/**
 * Empty state for panels with no data.
 */
export function PanelEmptyState({
  icon,
  message = "No data available",
  description




}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon &&
      <div className="mb-3 text-tp-slate-300">{icon}</div>
      }
      <p className="text-sm font-medium text-tp-slate-500">{message}</p>
      {description &&
      <p className="mt-1 text-xs text-tp-slate-400">{description}</p>
      }
    </div>);

}