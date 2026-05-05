/**
 * Shared primitive sub-components for the Secondary Sidebar.
 * Ported directly from Figma designs.
 */
import React from "react";
import clsx from "clsx";
import svgPaths from "./imports/svg-g7iuydxwol";
import { rxSidebarTokens, tpSectionCardStyle } from "./tokens";

// ─── Icon / SVG Wrappers ──────────────────────────────────────────────────────

/** Full-bleed SVG layer inside a 13.3×13.3 viewBox */
export function SvgLayer13({ children }) {
  return (
    <div className="absolute inset-[8.33%]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 13.3333">
        {children}
      </svg>
    </div>);

}

/** Full-bleed SVG layer inside a 20×20 viewBox (used for nav icons) */
export function SvgLayer20({ children }) {
  return (
    <div className="absolute contents inset-0">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        {children}
      </svg>
    </div>);

}

// ─── Nav Icon container ───────────────────────────────────────────────────────

/** Rounded pill that holds a 20×20 nav icon; bg changes when active */
export function NavIconWrapper({ active, children }) {
  return (
    <div
      className={clsx(
        "content-stretch flex flex-col items-center justify-center p-[6px] relative rounded-[10px] shrink-0",
        active ? rxSidebarTokens.navIconActiveBgClass : rxSidebarTokens.navIconBgClass
      )}>
      
      <div className="relative shrink-0 size-[20px]">{children}</div>
    </div>);

}

// ─── Content row building blocks ──────────────────────────────────────────────

/** Row wrapper: px-8 py-6 flex row */
export function RowWrapper({ children, className = "" }) {
  return (
    <div className={clsx("relative shrink-0 w-full", className)}>
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[8px] py-[6px] relative w-full">{children}</div>
      </div>
    </div>);

}

/** Right-hand data column: 209.845px, stacked flex, gap-4 */
export function DataColumn({ children }) {
  return (
    <div className="relative shrink-0 w-[209.845px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start justify-center relative w-full">
        {children}
      </div>
    </div>);

}

/** Label column: 209.845px, grey text */
export function GreyTextColumn({ children }) {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-[209.845px]">
      <div className={`flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-tp-slate-700 w-full ${rxSidebarTokens.bodyTextClass}`}>
        <ul>
          <li className="list-disc ms-[18px] whitespace-pre-wrap">{children}</li>
        </ul>
      </div>
    </div>);

}

/** Muted grey text paragraph column */
export function MutedTextColumn({ children }) {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-[209.845px]">
      <div className={`flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-tp-slate-400 w-full ${rxSidebarTokens.bodyTextClass}`}>
        {children}
      </div>
    </div>);

}

/** Bold label column (105px wide, semi-bold dark) */
export function FieldLabelColumn({ children }) {
  return (
    <div className={`flex flex-col font-semibold justify-center leading-[0] not-italic relative shrink-0 text-tp-slate-700 w-[105px] ${rxSidebarTokens.bodyStrongClass}`}>
      <p className="leading-[18px] whitespace-pre-wrap">{children}</p>
    </div>);

}

// ─── Bullet list helpers ──────────────────────────────────────────────────────

export function BulletItem({ label, detail }) {
  return (
    <ul>
      <li className="list-disc ms-[18px] whitespace-pre-wrap">
        <span className={`font-medium leading-[18px] not-italic text-tp-slate-700 ${rxSidebarTokens.bodyMediumClass}`}>{label}</span>
        <span className="leading-[18px]">{` (`}</span>
        <span className="leading-[18px]">{detail}</span>
      </li>
    </ul>);

}

// ─── Collapsed date card ──────────────────────────────────────────────────────

export function CollapsedDateCard({ text }) {
  return (
    <div className="relative rounded-[10px] shrink-0 w-full" style={tpSectionCardStyle}>
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-tp-slate-100 relative shrink-0 w-full">
          <DateCardHeader>
            <p className="leading-[18px]">{text}</p>
          </DateCardHeader>
        </div>
      </div>
    </div>);

}

/** Inner layout of a date row header */
export function DateCardHeader({ children }) {
  return (
    <div className="flex flex-row items-center size-full">
      <div className="content-stretch flex items-center justify-between px-[10px] py-[8px] relative w-full">
        <div className={`flex flex-col font-semibold justify-end leading-[0] not-italic relative shrink-0 text-tp-slate-700 whitespace-nowrap ${rxSidebarTokens.bodyStrongClass}`}>
          {children}
        </div>
        {/* Collapse/expand arrow icon */}
        <div className="relative shrink-0 size-[18px]">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
            <div className="absolute contents inset-0">
              <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
                <g id="arrow-square-down">
                  <path d={svgPaths.p274dc900} stroke="var(--tp-slate-300)" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={svgPaths.p3e19eb80} stroke="var(--tp-slate-700)" strokeLinecap="round" strokeLinejoin="round" />
                  <g opacity="0" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>);

}

// ─── Rx content sub-item icon (Med/Examination) ───────────────────────────────

export function MedRxIcon() {
  return (
    <div className="overflow-clip relative shrink-0 size-[16px]">
      <div className="absolute inset-[5.21%_8.33%_8.33%_8.33%]">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 13.8333">
          <g>
            <path clipRule="evenodd" d={svgPaths.p13413000} fill="var(--tp-slate-400)" fillRule="evenodd" />
            <path d={svgPaths.pb7dd600} fill="var(--tp-slate-400)" opacity="0.35" />
            <path d={svgPaths.pc60990} fill="var(--tp-slate-400)" />
          </g>
        </svg>
      </div>
    </div>);

}

export function MedRxFieldLabel({ text }) {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-full">
      <MedRxIcon />
      <FieldLabelColumn>{text}</FieldLabelColumn>
    </div>);

}