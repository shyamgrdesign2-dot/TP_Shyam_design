"use client";
import React from "react";
import { Calendar2, DocumentDownload } from "iconsax-reactjs";
import { CardShell } from "../CardShell";

import { FooterCTA } from "../FooterCTA";

import { downloadAsExcel } from "../../utils/downloadExcel";

const INTENSITY_COLORS = {
  low: "#EDF8F1",
  medium: "#FEF6E7",
  high: "#FDEDED"
};
const INTENSITY_TEXT = {
  low: "#1B8C54",
  medium: "#C6850C",
  high: "#C42B2B"
};



export function HeatmapCard({ data, onPillTap }) {
  const handleDownload = () => {
    const headers = ["Time Slot", ...data.cols];
    const rows = data.rows.map((row, ri) => [row, ...data.cells[ri].map((c) => String(c.value))]);
    downloadAsExcel("appointment_heatmap", headers, rows);
  };

  return (
    <CardShell
      icon={<Calendar2 size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}
      sidebarLink={<FooterCTA label="Download as Excel" onClick={handleDownload} tone="secondary" iconLeft={<DocumentDownload size={14} variant="Linear" />} />}>
      
      <div className="py-[2px]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="p-[3px] text-left font-semibold text-tp-slate-400" />
              {data.cols.map((col, i) =>
                <th key={i} className="p-[3px] text-center font-semibold text-tp-slate-500">{col}</th>
                )}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) =>
              <tr key={ri}>
                <td className="whitespace-nowrap p-[3px] font-medium text-tp-slate-500">{row}</td>
                {data.cells[ri].map((cell, ci) =>
                <td key={ci} className="p-[2px]">
                    <div
                    className="flex h-[26px] items-center justify-center rounded-[4px] font-semibold"
                    style={{
                      background: INTENSITY_COLORS[cell.intensity],
                      color: INTENSITY_TEXT[cell.intensity]
                    }}>
                    
                      {cell.value}
                    </div>
                  </td>
                )}
              </tr>
              )}
          </tbody>
        </table>
      </div>
      </div>

      {/* Legend */}
      <div className="mt-[6px] flex gap-[10px] text-[12px] text-tp-slate-400">
        <span className="flex items-center gap-[3px]"><span className="inline-block h-[8px] w-[8px] rounded-[2px]" style={{ background: INTENSITY_COLORS.low }} /> 1&ndash;3</span>
        <span className="flex items-center gap-[3px]"><span className="inline-block h-[8px] w-[8px] rounded-[2px]" style={{ background: INTENSITY_COLORS.medium }} /> 4&ndash;6</span>
        <span className="flex items-center gap-[3px]"><span className="inline-block h-[8px] w-[8px] rounded-[2px]" style={{ background: INTENSITY_COLORS.high }} /> 7+</span>
      </div>
    </CardShell>);

}