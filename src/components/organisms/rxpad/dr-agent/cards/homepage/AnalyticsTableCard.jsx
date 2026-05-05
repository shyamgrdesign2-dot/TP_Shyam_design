"use client";
import React from "react";
import { StatusUp, DocumentDownload } from "iconsax-reactjs";
import { CardShell } from "../CardShell";


import { FooterCTA } from "../FooterCTA";

import { downloadAsExcel } from "../../utils/downloadExcel";



export function AnalyticsTableCard({ data, onPillTap }) {
  const handleDownload = () => {
    downloadAsExcel(
      "weekly_kpis",
      ["Metric", "This Week", "Last Week", "Change"],
      data.kpis.map((k) => [k.metric, k.thisWeek, k.lastWeek, k.delta])
    );
  };

  return (
    <CardShell
      icon={<StatusUp size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}
      sidebarLink={<FooterCTA label="Download as Excel" onClick={handleDownload} tone="secondary" iconLeft={<DocumentDownload size={14} variant="Linear" />} />}>

      
      {/* Table */}
      <div className="overflow-hidden rounded-[8px] border border-tp-slate-100">
        {/* Header */}
        <div className="grid grid-cols-4 gap-[1px] bg-tp-slate-100 px-[8px] py-[4px] text-[12px] font-semibold text-tp-slate-500 tracking-wider">
          <span>Metric</span>
          <span className="text-right">This Week</span>
          <span className="text-right">Last Week</span>
          <span className="text-right">Change</span>
        </div>
        {/* Rows */}
        {data.kpis.map((kpi, i) => {
          const arrow = kpi.direction === "up" ? "\u25B2" : kpi.direction === "down" ? "\u25BC" : "\u25B6";
          const deltaColor = kpi.isGood ? "text-tp-green-600" : kpi.direction === "stable" ? "text-tp-slate-400" : "text-tp-error-600";
          return (
            <div key={i} className={`grid grid-cols-4 gap-[1px] px-[8px] py-[6px] text-[14px] ${i % 2 === 0 ? "bg-white" : "bg-tp-slate-50"}`}>
              <span className="font-medium text-tp-slate-700 truncate">{kpi.metric}</span>
              <span className="text-right font-semibold text-tp-slate-700">{kpi.thisWeek}</span>
              <span className="text-right font-semibold text-tp-slate-700">{kpi.lastWeek}</span>
              <span className={`text-right font-semibold ${deltaColor}`}>{arrow} {kpi.delta}</span>
            </div>);

        })}
      </div>

    </CardShell>);

}