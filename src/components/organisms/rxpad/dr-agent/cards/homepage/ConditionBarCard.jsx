"use client";

import React, { useState } from "react";
import { DocumentDownload } from "iconsax-reactjs";
import { CardShell } from "../CardShell";
import { FooterCTA } from "../FooterCTA";
import { ViewToggle } from "../ViewToggle";

import { downloadAsExcel } from "../../utils/downloadExcel";



export function ConditionBarCard({ data, onPillTap }) {
  const [viewMode, setViewMode] = useState("graph");

  const total = data.items.reduce((sum, item) => sum + item.count, 0) || 1;

  const handleDownload = () => {
    downloadAsExcel("condition_distribution", ["Condition", "Count"], data.items.map((i) => [i.condition, String(i.count)]));
  };

  // Build conic-gradient stops for the donut
  let cumPercent = 0;
  const stops = data.items.map((item) => {
    const start = cumPercent;
    const pct = item.count / total * 100;
    cumPercent += pct;
    return `${item.color} ${start}% ${cumPercent}%`;
  }).join(", ");

  return (
    <CardShell
      icon={<span />}
      tpIconName="medical-record"
      title={data.title}
      sidebarLink={<FooterCTA label="Download as Excel" onClick={handleDownload} tone="secondary" iconLeft={<DocumentDownload size={14} variant="Linear" />} />}>
      
      <div className="flex items-center justify-between mb-[6px]">
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === "graph" ?
      <div className="py-[2px]">
          <div className="flex items-center gap-[16px]">
            {/* Donut */}
            <div className="relative flex-shrink-0">
              <div
              className="h-[90px] w-[90px] rounded-full"
              style={{ background: `conic-gradient(${stops})` }} />
            
              {/* Center hole */}
              <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[14px] font-semibold text-tp-slate-800">{total}</span>
                <span className="text-[12px] text-tp-slate-400">Total</span>
              </div>
            </div>

            {/* Ranked legend */}
            <div className="flex-1 space-y-[4px]">
              {data.items.map((item, i) => {
              const pct = (item.count / total * 100).toFixed(0);
              return (
                <div key={i} className="flex items-center gap-[6px]">
                    <span className="h-[8px] w-[8px] flex-shrink-0 rounded-[2px]" style={{ background: item.color }} />
                    <span className="flex-1 text-[14px] text-tp-slate-600 truncate">{item.condition}</span>
                    <span className="text-[14px] font-semibold text-tp-slate-700">{pct}%</span>
                    <span className="text-[12px] text-tp-slate-400">({item.count})</span>
                  </div>);

            })}
            </div>
          </div>
        </div> : (

      /* Text view — ranked list */
      <div className="rounded-[8px] border border-tp-slate-100 overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-tp-slate-50">
                <th className="text-left px-[8px] py-[6px] font-semibold text-tp-slate-500 w-[28px]">#</th>
                <th className="text-left px-[8px] py-[6px] font-semibold text-tp-slate-500">Condition</th>
                <th className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-500">Count</th>
                <th className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-500">%</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) =>
            <tr key={i} className={i % 2 === 1 ? "bg-tp-slate-50/50" : ""}>
                  <td className="px-[8px] py-[6px] text-tp-slate-400 font-semibold">{i + 1}</td>
                  <td className="px-[8px] py-[6px]">
                    <div className="flex items-center gap-[6px]">
                      <span className="inline-block h-[8px] w-[8px] rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-tp-slate-700">{item.condition}</span>
                    </div>
                  </td>
                  <td className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-800">{item.count}</td>
                  <td className="text-right px-[8px] py-[6px] text-tp-slate-500">{(item.count / total * 100).toFixed(0)}%</td>
                </tr>
            )}
            </tbody>
          </table>
        </div>)
      }

      {data.note &&
      <p className="mt-[8px] text-[12px] text-tp-slate-400 italic">{data.note}</p>
      }
    </CardShell>);

}