"use client";

import { CardShell } from "../CardShell";
import { Chart2 } from "iconsax-reactjs";






export function FollowUpRateCard({ data }) {
  const delta = data.currentRate - data.lastWeekRate;
  const deltaTone = delta >= 0 ? "text-tp-success-600" : "text-tp-error-600";
  const trendMax = Math.max(...data.trend.map((p) => p.rate), 1);
  const trendMin = Math.min(...data.trend.map((p) => p.rate), 0);
  const chartW = 220;
  const chartH = 64;
  const padX = 8;
  const padY = 8;
  const xStep = data.trend.length > 1 ? (chartW - padX * 2) / (data.trend.length - 1) : 0;
  const gradientId = `fuTrendFill-${data.title.replace(/\s+/g, "-").toLowerCase()}`;
  const yScale = (v) => {
    const range = Math.max(trendMax - trendMin, 1);
    return padY + (chartH - padY * 2) * (1 - (v - trendMin) / range);
  };
  const points = data.trend.map((p, i) => `${padX + i * xStep},${yScale(p.rate)}`).join(" ");
  const areaPoints = `${padX},${chartH - padY} ${points} ${padX + (data.trend.length - 1) * xStep},${chartH - padY}`;

  return (
    <CardShell
      icon={<Chart2 size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}>
      
      <div className="grid grid-cols-2 gap-[6px]">
        <div className="rounded-[8px] bg-tp-blue-50/60 px-[8px] py-[7px]">
          <p className="text-[12px] text-tp-blue-500">Current follow-up rate</p>
          <p className="text-[14px] font-semibold text-tp-blue-700">{data.currentRate}%</p>
        </div>
        <div className="rounded-[8px] bg-tp-slate-50 px-[8px] py-[7px]">
          <p className="text-[12px] text-tp-slate-500">Change vs last week</p>
          <p className={`text-[14px] font-semibold ${deltaTone}`}>{delta >= 0 ? "+" : ""}{delta}%</p>
        </div>
      </div>

      <div className="mt-[8px] rounded-[8px] border border-tp-slate-100 bg-white px-[8px] py-[7px]">
        <div className="grid grid-cols-2 gap-y-[4px] text-[12px] text-tp-slate-600">
          <p>Due today: <span className="font-semibold text-tp-slate-800">{data.dueToday}</span></p>
          <p>Overdue today: <span className="font-semibold text-tp-warning-700">{data.overdueToday}</span></p>
          <p>Completed this week: <span className="font-semibold text-tp-success-700">{data.completedThisWeek}</span></p>
          <p>Scheduled this week: <span className="font-semibold text-tp-slate-800">{data.scheduledThisWeek}</span></p>
        </div>
      </div>

      <div className="mt-[8px] rounded-[8px] border border-tp-slate-100 bg-white px-[8px] py-[7px]">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-tp-slate-500">4-week trend</p>
          <span className="text-[12px] text-tp-slate-500">
            Avg: <span className="font-semibold text-tp-slate-700">{Math.round(data.trend.reduce((a, p) => a + p.rate, 0) / Math.max(1, data.trend.length))}%</span>
          </span>
        </div>
        <div className="mt-[6px] rounded-[8px] bg-tp-blue-50/40 px-[6px] py-[6px]">
          <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="block">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(75,74,213,0.30)" />
                <stop offset="100%" stopColor="rgba(75,74,213,0.04)" />
              </linearGradient>
            </defs>
            <line x1={padX} y1={chartH - padY} x2={chartW - padX} y2={chartH - padY} stroke="var(--tp-slate-200, #E2E8F0)" strokeWidth="1" />
            <polygon points={areaPoints} fill={`url(#${gradientId})`} />
            <polyline points={points} fill="none" stroke="var(--tp-blue-500, #4B4AD5)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {data.trend.map((p, i) =>
            <circle key={p.label} cx={padX + i * xStep} cy={yScale(p.rate)} r="2.5" fill="var(--tp-blue-500, #4B4AD5)" />
            )}
          </svg>
          <div className="mt-[4px] flex items-center justify-between px-[2px]">
            {data.trend.map((p) =>
            <span key={p.label} className="text-[12px] text-tp-slate-500">{p.label}</span>
            )}
          </div>
        </div>
      </div>
    </CardShell>);

}