"use client";

import { CardShell } from "../CardShell";

import { SidebarLink } from "../SidebarLink";
import { cn } from "@/src/hooks/utils";
import { DirectionArrow } from "../../shared/DirectionArrow";









export function LabComparisonCard({ data }) {
  // Derive dates from first row for column headers
  const prevDate =
  data.rows.length > 0 ? data.rows[0].prevDate : "Prev";
  const currDate =
  data.rows.length > 0 ? data.rows[0].currDate : "Curr";

  return (
    <CardShell
      icon={<span />}
      tpIconName="Lab"
      title="Lab Comparison"
      sidebarLink={<SidebarLink text="View full lab history" />}>
      
      {/* Grid-based comparison table */}
      <div className="overflow-hidden rounded-[8px] border border-tp-slate-100">
        {/* Header */}
        <div className="grid grid-cols-4 gap-[1px] bg-tp-slate-100 px-[8px] py-[4px] text-[12px] font-medium text-tp-slate-500 tracking-wider">
          <span>Parameter</span>
          <span>{prevDate}</span>
          <span>{currDate}</span>
          <span>Change</span>
        </div>
        {/* Rows */}
        {data.rows.map((row, i) =>
        <div
          key={row.parameter}
          className={cn(
            "grid grid-cols-4 gap-[1px] px-[8px] py-[7px] text-[14px]",
            i % 2 === 0 ? "bg-white" : "bg-tp-slate-50"
          )}>
          
            <span className="font-medium text-tp-slate-700 truncate">{row.parameter}</span>
            <span className="text-tp-slate-500">{row.prevValue}</span>
            <span className={cn(
            row.isFlagged ? "font-medium text-tp-error-600" : "text-tp-slate-700"
          )}>
              {row.currValue}
            </span>
            <span className="inline-flex items-center gap-[3px]">
              <DirectionArrow direction={row.direction} />
              <span
              className={cn(
                "text-[14px] font-medium",
                row.direction === "up" && "text-tp-error-500",
                row.direction === "down" && "text-tp-success-600",
                row.direction === "stable" && "text-tp-slate-400"
              )}>
              
                {row.delta}
              </span>
            </span>
          </div>
        )}
      </div>

    </CardShell>);

}