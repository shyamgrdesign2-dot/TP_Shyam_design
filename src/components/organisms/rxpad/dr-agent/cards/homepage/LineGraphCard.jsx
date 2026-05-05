"use client";

import React, { useState } from "react";
import { TrendUp, DocumentDownload } from "iconsax-reactjs";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer } from
"recharts";
import { CardShell } from "../CardShell";
import { FooterCTA } from "../FooterCTA";
import { ViewToggle } from "../ViewToggle";
import { ChartTypeToggle } from "../ChartTypeToggle";

import { downloadAsExcel } from "../../utils/downloadExcel";



export function LineGraphCard({ data, onPillTap }) {
  const [viewMode, setViewMode] = useState("graph");
  const [chartType, setChartType] = useState("bar");

  const dirArrow = data.changeDirection === "up" ? "\u25B2" : data.changeDirection === "down" ? "\u25BC" : "\u25B6";
  const dirColor = data.changeDirection === "up" ? "#15803D" : data.changeDirection === "down" ? "#DC2626" : "#6D28D9";

  const handleDownload = () => {
    downloadAsExcel("patient_volume", ["Period", "Value"], data.points.map((p) => [p.label, String(p.value)]));
  };

  // Recharts data
  const rechartsData = data.points.map((p) => ({ name: p.label, value: p.value }));
  const pointCount = rechartsData.length;
  const chartHeight = 160;
  const minWidth = Math.max(300, pointCount * 60);

  return (
    <CardShell
      icon={<TrendUp size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}
      badge={{ label: `${dirArrow} ${data.changePercent}`, color: dirColor, bg: data.changeDirection === "up" ? "#DCFCE7" : data.changeDirection === "down" ? "#FEE2E2" : "#EDE9FE" }}
      sidebarLink={<FooterCTA label="Download as Excel" onClick={handleDownload} tone="secondary" iconLeft={<DocumentDownload size={14} variant="Linear" />} />}>
      
      <div className="flex items-center justify-between mb-[6px]">
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        {viewMode === "graph" && <ChartTypeToggle chartType={chartType} onChange={setChartType} />}
      </div>

      {viewMode === "graph" ?
      <div className="overflow-x-auto -mx-1 px-1">
          <div style={{ minWidth, height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ?
            <LineChart data={rechartsData} margin={{ top: 16, right: 8, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tp-slate-100, #F1F5F9)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9E978B" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9E978B" }} tickLine={false} axisLine={false} tickCount={5} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                  <ReferenceLine y={data.average} stroke="#7049C7" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "avg", position: "right", fontSize: 10, fill: "#7049C7" }} />
                  <Line type="monotone" dataKey="value" stroke="#3B6FE0" strokeWidth={2} dot={{ r: 3, fill: "white", strokeWidth: 1.5, stroke: "#3B6FE0" }} activeDot={{ r: 5 }} label={{ position: "top", fontSize: 10, fill: "#3B6FE0", fontWeight: 600 }} />
                </LineChart> :

            <BarChart data={rechartsData} margin={{ top: 16, right: 8, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tp-slate-100, #F1F5F9)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9E978B" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9E978B" }} tickLine={false} axisLine={false} tickCount={5} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                  <ReferenceLine y={data.average} stroke="#7049C7" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "avg", position: "right", fontSize: 10, fill: "#7049C7" }} />
                  <Bar dataKey="value" fill="#3B6FE0" radius={[3, 3, 0, 0]} maxBarSize={24} opacity={0.8} label={{ position: "top", fontSize: 10, fill: "#3B6FE0", fontWeight: 600 }} />
                </BarChart>
            }
            </ResponsiveContainer>
          </div>
        </div> :

      <div className="rounded-[8px] border border-tp-slate-100 overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-tp-slate-50">
                <th className="text-left px-[8px] py-[6px] font-semibold text-tp-slate-500">Period</th>
                <th className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-500">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.points.map((p, i) =>
            <tr key={i} className={i % 2 === 1 ? "bg-tp-slate-50/50" : ""}>
                  <td className="text-left px-[8px] py-[6px] text-tp-slate-500">{p.label}</td>
                  <td className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-700">{p.value}</td>
                </tr>
            )}
            </tbody>
            <tfoot>
              <tr className="border-t border-tp-slate-300">
                <td className="text-left px-[8px] py-[6px] text-tp-slate-500 font-medium">Average</td>
                <td className="text-right px-[8px] py-[6px] font-semibold text-purple-600">{data.average}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </CardShell>);

}