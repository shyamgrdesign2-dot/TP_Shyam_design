"use client";
import React from "react";
import { Chart } from "iconsax-reactjs";
import { CardShell } from "../CardShell";





export function DonutChartCard({ data, onPillTap }) {
  // Build conic-gradient stops
  let cumPercent = 0;
  const stops = data.segments.map((seg) => {
    const start = cumPercent;
    const pct = seg.value / data.total * 100;
    cumPercent += pct;
    return `${seg.color} ${start}% ${cumPercent}%`;
  }).join(", ");

  return (
    <CardShell
      icon={<Chart size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}>

      
      <div className="py-[2px]">
        <div className="flex items-center gap-[16px]">
          {/* Donut */}
          <div className="relative flex-shrink-0">
            <div
              className="h-[90px] w-[90px] rounded-full"
              style={{ background: `conic-gradient(${stops})` }} />
            
            {/* Center hole */}
            <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white">
              <span className="text-[14px] font-semibold text-tp-slate-800">{data.total}</span>
              <span className="text-[12px] text-tp-slate-400">{data.centerLabel}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-[4px]">
            {data.segments.map((seg, i) => {
              const pct = (seg.value / data.total * 100).toFixed(0);
              return (
                <div key={i} className="flex items-center gap-[6px]">
                  <span className="h-[8px] w-[8px] flex-shrink-0 rounded-[2px]" style={{ background: seg.color }} />
                  <span className="flex-1 text-[12px] text-tp-slate-600 truncate">{seg.label}</span>
                  <span className="text-[12px] font-semibold text-tp-slate-700">{pct}%</span>
                  <span className="text-[12px] text-tp-slate-400">({seg.value})</span>
                </div>);

            })}
          </div>
        </div>
      </div>
    </CardShell>);

}