
import React, { useState } from "react"
import { cn } from "../../dr-agent/utils"
import { CopyIcon } from "./CopyIcon"
import { ActionableTooltip } from "./ActionableTooltip"
import { TPMedicalIcon } from "../compat/tp-ui"
import { CopilotIcon } from "../ui/CopilotIcon"

/** Small info icon with hover tooltip showing data sources */
export function SourceInfoIcon({ sources }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative ml-[4px] flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered((v) => !v)}
    >
      <button
        type="button"
        className="flex h-[20px] w-[20px] items-center justify-center rounded-full text-tp-violet-400 transition-colors hover:text-tp-violet-600 hover:bg-tp-violet-50"
        aria-label="Data sources"
      >
        <CopilotIcon name="info-circle" size={14} variant="bulk" />
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute right-0 top-full z-[100] mt-[4px] min-w-[160px] max-w-[220px] rounded-[8px] border-[1px] border-tp-slate-100/80 bg-white/95 px-[10px] py-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <p className="mb-[4px] text-[12px] font-semibold tracking-wider text-tp-slate-400">Sources</p>
          <div className="flex flex-col gap-[3px]">
            {sources.map((src, i) => (
              <div key={i} className="flex items-center gap-[5px]">
                <div className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-tp-violet-400" />
                <span className="text-[14px] leading-[1.4] text-tp-slate-600">{src}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
  children,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [copyHovered, setCopyHovered] = useState(false)

  return (
    <div
      className="w-full overflow-hidden rounded-[14px] bg-white"
      style={{
        border: "1px solid transparent",
        backgroundImage: "linear-gradient(white, white), linear-gradient(180deg, rgba(75,74,213,0.18) 0%, rgba(75,74,213,0.04) 25%, rgba(23,23,37,0.02) 50%, rgba(75,74,213,0.04) 75%, rgba(75,74,213,0.18) 100%)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      {/* Header */}
      <div
        /* Centred, with or without a subtitle: the badge and the accordion
           sit on the middle of the two lines, not on the first. */
        className={cn("flex items-center px-3 py-[11px]", date ? "gap-[9px]" : "gap-[7px]")}
        style={{
          background: "linear-gradient(180deg, rgba(75,74,213,0.05) 0%, #FFFFFF 100%)",
          borderBottom: "1px solid var(--tp-slate-50, #F8FAFC)",
        }}
      >
        {/* Icon — always TP blue */}
        {/* As tall as the title and subtitle together when there are two
            lines, so the tile reads as the pair's marker, not the title's. */}
        <div
          className={cn(
            "flex flex-shrink-0 items-center justify-center",
            date ? "h-[34px] w-[34px] rounded-[10px]" : "h-[26px] w-[26px] rounded-[8px]",
          )}
          style={{ background: "var(--tp-blue-50, rgba(75, 74, 213, 0.08))" }}
        >
          {tpIconName ? (
            <TPMedicalIcon name={tpIconName} variant="bulk" size={date ? 18 : 15} color="var(--tp-blue-500, #4B4AD5)" />
          ) : (
            <span style={{ color: "var(--tp-blue-500, #4B4AD5)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
          )}
        </div>

        {/* Title + Date */}
        <div className="flex min-w-0 flex-col text-tp-slate-800">
          <span className="group/title relative min-w-0 max-w-full flex-1 text-[13px] font-semibold leading-[1.4] truncate">
            {title}
            {/* Instant tooltip on truncated title */}
            <span className="pointer-events-none absolute bottom-full left-0 mb-1 hidden whitespace-nowrap rounded-[4px] bg-tp-slate-800 px-2 py-1 text-[10px] font-normal text-white shadow-md group-hover/title:block z-50">
              {title}
            </span>
          </span>
          {date && (
            <span className="mt-[1px] min-w-0 max-w-full text-[11px] font-normal text-tp-slate-500 leading-[1.4] truncate">
              {date}
            </span>
          )}
        </div>

        {/* Copy All — horizontally aligned with primary heading text */}
        {copyAll && (
          <div className="flex-shrink-0">
            {copyAllTooltip ? (
              <ActionableTooltip label={copyAllTooltip} onAction={() => copyAll()}>
                <span
                  className={cn("cursor-pointer transition-colors", copyHovered ? "text-tp-blue-600" : "text-tp-blue-500")}
                  onMouseEnter={() => setCopyHovered(true)}
                  onMouseLeave={() => setCopyHovered(false)}
                >
                  <CopilotIcon name="copy" size={14} variant="bulk" />
                </span>
              </ActionableTooltip>
            ) : (
              <CopyIcon size={14} onClick={() => copyAll()} />
            )}
          </div>
        )}

        {/* Spacer — pushes badge and chevron to the right */}
        <span className="flex-1" />

        {/* Badge — truncated with tooltip if too long */}
        {badge && (
          <span
            className="group/badge relative max-w-[100px] truncate rounded-[4px] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.2]"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
            <span className="pointer-events-none absolute bottom-full right-0 mb-1 hidden whitespace-nowrap rounded-[4px] bg-tp-slate-800 px-2 py-1 text-[10px] font-normal text-white shadow-md group-hover/badge:block z-50">
              {badge.label}
            </span>
          </span>
        )}

        {/* Header Extra (e.g. data completeness donut) — gap-[6px] from badge */}
        {headerExtra && <div className="ml-[4px] flex-shrink-0">{headerExtra}</div>}

        {/* Source indicator removed from header — now rendered in ChatBubble feedback area */}

        {/* Collapse toggle — line icon, no stroke bg */}
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand answer" : "Collapse answer"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-[8px] bg-tp-slate-100 text-tp-slate-600 transition-colors hover:bg-tp-slate-200"
          >
            <CopilotIcon name={collapsed ? "chevron-down" : "chevron-up"} size={12} variant="linear" />
          </button>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <>
          <div className="px-3 py-[10px]">
            {children}
          </div>

          {/* Actions row — single-line horizontal scroll */}
          {actions && (
            <div className="overflow-x-auto px-3 pt-[2px] pb-[10px]">
              <div className="flex gap-1 whitespace-nowrap">
                {actions}
              </div>
            </div>
          )}

          {/* Sidebar link (below actions, with bottom gradient) */}
          {sidebarLink && (
            <div
              className="px-3 py-[8px]"
              style={{
                borderTop: "0.5px solid var(--tp-slate-50, #F8FAFC)",
                background: "linear-gradient(180deg, #FFFFFF 0%, rgba(75,74,213,0.04) 100%)",
              }}
            >
              {sidebarLink}
            </div>
          )}
        </>
      )}
    </div>
  )
}
