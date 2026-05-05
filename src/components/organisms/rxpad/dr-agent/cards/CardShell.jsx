"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/src/hooks/utils";
import styles from "./CardShell.module.scss";
import { CopyIcon } from "./CopyIcon";
import { ActionableTooltip } from "./ActionableTooltip";
import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { Copy, ArrowDown2, ArrowUp2, InfoCircle } from "iconsax-reactjs";

/**
 * Small info icon with hover tooltip showing data sources.
 *
 * The tooltip is rendered into a portal on `document.body` and positioned
 * with `position: fixed` so no ancestor's `overflow: hidden` (e.g. the
 * chat-scroll container) can clip it. Position is recomputed on hover
 * open + on scroll/resize while open so it tracks the trigger.
 */
export function SourceInfoIcon({ sources }) {
  const [isOpen, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  // Recompute the tooltip's anchor whenever it opens or the layout
  // shifts beneath it (scroll/resize/orientation).
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      // Anchor: 4px below the trigger, right-aligned to the trigger.
      setPos({ top: r.bottom + 4, left: r.right });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen]);

  return (
    <div
      className="relative ml-[4px] flex-shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}>
      
      <button
        ref={triggerRef}
        type="button"
        className="flex h-[20px] w-[20px] items-center justify-center rounded-full text-tp-violet-400 transition-colors hover:text-tp-violet-600 hover:bg-tp-violet-50"
        aria-label="Data sources">
        
        <InfoCircle size={14} variant="Bold" />
      </button>

      {isOpen && pos && typeof document !== "undefined" ?
      createPortal(
        <div
          role="tooltip"
          className={cn("rounded-[8px] border border-tp-slate-100/80 bg-white/95 px-[10px] py-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md", styles.sourceInfoTooltip)}
          style={{
            top: pos.top,
            left: pos.left
          }}>
          
              <p className="mb-[4px] text-[12px] font-semibold tracking-wider text-tp-slate-400">Sources</p>
              <div className="flex flex-col gap-[3px]">
                {sources.map((src, i) =>
            <div key={i} className="flex items-center gap-[5px]">
                    <div className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-tp-violet-400" />
                    <span className="text-[14px] leading-[1.4] text-tp-slate-600">{src}</span>
                  </div>
            )}
              </div>
            </div>,
        document.body
      ) :
      null}
    </div>);

}





















export function CardShell({
  icon,
  title,
  date,
  tpIconName,
  badge,
  copyAll,
  copyAllTooltip,
  collapsible = true,
  defaultCollapsed = false,
  actions,
  sidebarLink,
  headerExtra,
  dataSources,
  children
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copyHovered, setCopyHovered] = useState(false);

  return (
    <div
      className={cn("w-full overflow-hidden rounded-[14px] bg-white", styles.card)}>
      
      {/* Header */}
      <div
        className={cn("flex gap-[7px] px-3 py-[12px]", date ? "items-start" : "items-center", styles.header)}>
        
        {/* Icon — always TP blue */}
        <div
          className={cn("flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[8px]", styles.iconWrap)}>
          
          {tpIconName ?
          <TPMedicalIcon name={tpIconName} variant="bulk" size={15} color="var(--tp-blue-500, #4B4AD5)" /> :

          <span className={styles.iconInner}>{icon}</span>
          }
        </div>

        {/* Title + Date */}
        <div className="flex min-w-0 flex-col text-tp-slate-800">
          <span className="group/title relative max-w-[200px] text-[14px] font-semibold leading-[1.4] truncate">
            {title}
            {/* Instant tooltip on truncated title */}
            <span className="pointer-events-none absolute bottom-full left-0 mb-1 hidden whitespace-nowrap rounded-[4px] bg-tp-slate-800 px-2 py-1 text-[10px] font-normal text-white shadow-md group-hover/title:block z-50">
              {title}
            </span>
          </span>
          {date &&
          <span className="mt-[1px] max-w-[200px] text-[12px] font-normal text-tp-slate-400 leading-[1.4] truncate">
              {date}
            </span>
          }
        </div>

        {/* Copy All — horizontally aligned with primary heading text */}
        {copyAll &&
        <div className="flex-shrink-0">
            {copyAllTooltip ?
          <ActionableTooltip label={copyAllTooltip} onAction={() => copyAll()}>
                <span
              className={cn("cursor-pointer transition-colors", copyHovered ? "text-tp-slate-900" : "text-tp-slate-700")}
              onMouseEnter={() => setCopyHovered(true)}
              onMouseLeave={() => setCopyHovered(false)}>
              
                  <Copy size={14} variant={copyHovered ? "Bulk" : "Linear"} />
                </span>
              </ActionableTooltip> :

          <CopyIcon size={14} onClick={() => copyAll()} />
          }
          </div>
        }

        {/* Spacer — pushes badge and chevron to the right */}
        <span className="flex-1" />

        {/* Badge — truncated with tooltip if too long */}
        {badge &&
        <span
          className="group/badge relative max-w-[100px] truncate rounded-[4px] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.2]"
          style={{ background: badge.bg, color: badge.color }}>
          
            {badge.label}
            <span className="pointer-events-none absolute bottom-full right-0 mb-1 hidden whitespace-nowrap rounded-[4px] bg-tp-slate-800 px-2 py-1 text-[10px] font-normal text-white shadow-md group-hover/badge:block z-50">
              {badge.label}
            </span>
          </span>
        }

        {/* Header Extra (e.g. data completeness donut) — gap-[6px] from badge */}
        {headerExtra && <div className="ml-[4px] flex-shrink-0">{headerExtra}</div>}

        {/* Source indicator removed from header — now rendered in ChatBubble feedback area */}

        {/* Collapse toggle — line icon, no stroke bg */}
        {collapsible &&
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[6px] bg-tp-slate-100 text-tp-slate-600 transition-colors hover:bg-tp-slate-200">
          
            {collapsed ? <ArrowDown2 size={12} variant="Linear" /> : <ArrowUp2 size={12} variant="Linear" />}
          </button>
        }
      </div>

      {/* Body */}
      {!collapsed &&
      <>
          <div className="px-3 py-[10px]">
            {children}
          </div>

          {/* Actions row — single-line horizontal scroll */}
          {actions &&
        <div className="overflow-x-auto px-3 pt-[2px] pb-[10px]">
              <div className="flex gap-1 whitespace-nowrap">
                {actions}
              </div>
            </div>
        }

          {/* Sidebar link (below actions, with bottom gradient) */}
          {sidebarLink &&
        <div
          className={cn("px-3 py-[8px]", styles.sidebarLinkWrap)}>
          
              {sidebarLink}
            </div>
        }
        </>
      }
    </div>);

}