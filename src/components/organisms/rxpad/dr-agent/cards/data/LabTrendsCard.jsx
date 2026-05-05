"use client";

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell } from
"recharts";
import { CardShell } from "../CardShell";
import { SidebarLink } from "../SidebarLink";
import { ViewToggle } from "../ViewToggle";
import { ChartTypeToggle } from "../ChartTypeToggle";







function seriesColor(tone) {
  if (tone === "critical") return "#EF4444";
  if (tone === "warn") return "#F59E0B";
  return "#22C55E";
}

function getTrendSummary(series) {
  if (series.values.length < 2) return "";
  const first = series.values[0];
  const last = series.values[series.values.length - 1];
  const diff = last - first;
  const pct = Math.abs(diff / (first || 1)) * 100;
  if (pct < 2) return "\u25B6 Stable";
  return diff > 0 ? "\u25B2 Increasing" : "\u25BC Declining";
}

function toRechartsData(allSeries) {
  const longest = allSeries.reduce((a, b) => a.dates.length >= b.dates.length ? a : b);
  return longest.dates.map((date, i) => {
    const row = { date };
    allSeries.forEach((s) => {row[s.label] = i < s.values.length ? s.values[i] : 0;});
    return row;
  });
}

function SeriesLegend({ series }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-[6px]">
      {series.map((s) =>
      <div key={s.label} className="flex items-center gap-1.5">
          <div className="h-[8px] w-[8px] rounded-full" style={{ backgroundColor: seriesColor(s.tone) }} />
          <span className="text-[14px] font-medium text-tp-slate-700">{s.label}</span>
        </div>
      )}
    </div>);

}

/* ── Bar chart with per-point coloring (above threshold = red) ── */
function LabRechartsBarChart({ allSeries, data, chartHeight, minWidth

}) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ minWidth, height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: -8 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tp-slate-100, #F1F5F9)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} tickCount={5} width={36} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} labelStyle={{ fontWeight: 600, marginBottom: 2 }} />
            {allSeries.map((s) =>
            s.threshold != null ?
            <ReferenceLine key={`t-${s.label}`} y={s.threshold} stroke="#EF4444" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: s.thresholdLabel ?? "", position: "right", fontSize: 10, fill: "#EF4444" }} /> :
            null
            )}
            {allSeries.map((s) =>
            <Bar key={s.label} dataKey={s.label} radius={[3, 3, 0, 0]} maxBarSize={24} label={{ position: "top", fontSize: 10, fontWeight: 600 }}>
                {data.map((entry, idx) => {
                const val = Number(entry[s.label] ?? 0);
                const color = s.threshold != null && val > s.threshold ? "#EF4444" : seriesColor(s.tone);
                return <Cell key={idx} fill={color} />;
              })}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>);

}

/* ── Line chart with per-point coloring ── */
function LabRechartsLineChart({ allSeries, data, chartHeight, minWidth

}) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ minWidth, height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tp-slate-100, #F1F5F9)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} tickCount={5} width={36} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} labelStyle={{ fontWeight: 600, marginBottom: 2 }} />
            {allSeries.map((s) =>
            s.threshold != null ?
            <ReferenceLine key={`t-${s.label}`} y={s.threshold} stroke="#EF4444" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: s.thresholdLabel ?? "", position: "right", fontSize: 10, fill: "#EF4444" }} /> :
            null
            )}
            {allSeries.map((s) =>
            <Line key={s.label} type="monotone" dataKey={s.label} stroke={seriesColor(s.tone)} strokeWidth={2} dot={{ r: 3, fill: "white", strokeWidth: 1.5 }} activeDot={{ r: 5 }} label={{ position: "top", fontSize: 10, fill: seriesColor(s.tone), fontWeight: 600 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>);

}

function LabTrendsTable({ series }) {
  if (series.length === 0) return null;
  const longest = series.reduce((a, b) => a.dates.length >= b.dates.length ? a : b);
  const toneColor = (tone, value, threshold) => {
    if (tone === "critical") return "text-tp-error-600 font-semibold";
    if (tone === "warn") return "text-tp-warning-600 font-semibold";
    if (threshold != null && value > threshold) return "text-tp-error-600 font-semibold";
    return "text-tp-slate-700";
  };

  return (
    <div className="rounded-[8px] border border-tp-slate-100 overflow-hidden">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="bg-tp-slate-50">
            <th className="text-left px-[8px] py-[6px] font-semibold text-tp-slate-500">Date</th>
            {series.map((s) =>
            <th key={s.label} className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-500">{s.label} ({s.unit})</th>
            )}
          </tr>
        </thead>
        <tbody>
          {longest.dates.map((date, di) =>
          <tr key={date} className={di % 2 === 1 ? "bg-tp-slate-50/50" : ""}>
              <td className="text-left px-[8px] py-[6px] text-tp-slate-500">{date}</td>
              {series.map((s) => {
              const val = di < s.values.length ? s.values[di] : null;
              return (
                <td key={s.label} className={`text-right px-[8px] py-[6px] ${val != null ? toneColor(s.tone, val, s.threshold) : "text-tp-slate-300"}`}>
                    {val != null ? val : "\u2014"}
                  </td>);

            })}
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}

export function LabTrendsCard({ data, onPillTap }) {
  const [viewMode, setViewMode] = useState("graph");
  const [chartType, setChartType] = useState("line");
  const totalVisits = data.series.length > 0 ? data.series[0].values.length : 0;

  const rechartsData = toRechartsData(data.series);
  const pointCount = rechartsData.length;
  const chartHeight = 160;
  const minWidth = Math.max(300, pointCount * 60);

  return (
    <CardShell
      icon={<span />}
      tpIconName="Lab"
      title={data.title}
      date={`${totalVisits} visits`}
      dataSources={["EMR Records", "Lab Reports"]}
      sidebarLink={<SidebarLink text="View full lab report" />}>
      
      {data.series.length > 0 ?
      <>
          <div className="mb-[6px] flex items-center justify-between">
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
            {viewMode === "graph" && <ChartTypeToggle chartType={chartType} onChange={setChartType} />}
          </div>
          {viewMode === "graph" ?
        <>
              {chartType === "line" ?
          <LabRechartsLineChart allSeries={data.series} data={rechartsData} chartHeight={chartHeight} minWidth={minWidth} /> :

          <LabRechartsBarChart allSeries={data.series} data={rechartsData} chartHeight={chartHeight} minWidth={minWidth} />
          }
              <SeriesLegend series={data.series} />
            </> :

        <LabTrendsTable series={data.series} />
        }
        </> :

      <div className="py-4 text-center text-[14px] text-tp-slate-400">No lab data available for charting.</div>
      }
    </CardShell>);

}