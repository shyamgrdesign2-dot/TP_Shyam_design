"use client";

import React, { useState } from "react";
import { MoneyRecive } from "iconsax-reactjs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer } from
"recharts";
import { CardShell } from "../CardShell";
import { ViewToggle } from "../ViewToggle";

import styles from "./RevenueBarCard.module.scss";



export function RevenueBarCard({ data, onPillTap }) {
  const [viewMode, setViewMode] = useState("graph");

  const isDepositMode = data.mode === "deposit";
  const isSinglePoint = data.days.length === 1;
  const mode = isDepositMode ? "deposit" : "collection";

  // Recharts data
  const rechartsData = data.days.map((day) => ({
    name: day.label,
    paid: day.paid,
    due: day.due,
    refunded: day.refunded ?? 0,
    total: day.paid + day.due + (day.refunded ?? 0)
  }));
  const pointCount = rechartsData.length;
  const chartHeight = 160;
  const minWidth = Math.max(300, pointCount * 60);

  return (
    <CardShell
      icon={<MoneyRecive size={14} variant="Bulk" />}
      title={data.title}>
      
      {/* Summary chips */}
      <div className="mb-[10px] grid grid-cols-2 gap-[6px]">
        <div className="rounded-[8px] bg-tp-slate-50 px-[8px] py-[7px]">
          <span className="block truncate text-[14px] font-semibold leading-tight text-tp-slate-800">
            &#x20B9;{data.totalRevenue.toLocaleString("en-IN")}
          </span>
          <span className="mt-[3px] block text-[12px] font-medium text-tp-slate-500">
            {isDepositMode ? "Total advance received" : "Total billed amount"}
          </span>
        </div>
        <div className={`rounded-[8px] px-[8px] py-[7px] ${styles.chipPrimary}`} data-mode={mode}>
          <span className={`block truncate text-[14px] font-semibold leading-tight ${styles.chipPrimaryLabel}`} data-mode={mode}>
            &#x20B9;{isDepositMode ? data.totalRefunded.toLocaleString("en-IN") : data.totalPaid.toLocaleString("en-IN")}
          </span>
          <span className={`mt-[3px] block text-[12px] font-medium ${styles.chipPrimaryMeta}`} data-mode={mode}>
            {isDepositMode ? "Total advance refunded" : "Paid fully"}
          </span>
        </div>
        <div className={`rounded-[8px] px-[8px] py-[7px] ${styles.chipWarn}`}>
          <span className={`block truncate text-[14px] font-semibold leading-tight ${styles.chipWarnLabel}`}>
            &#x20B9;{data.totalDue.toLocaleString("en-IN")}
          </span>
          <span className={`mt-[3px] block text-[12px] font-medium ${styles.chipWarnMeta}`}>
            {isDepositMode ? "Total advance debited" : "Due"}
          </span>
        </div>
        {!isDepositMode &&
        <div className={`rounded-[8px] px-[8px] py-[7px] ${styles.chipError}`}>
            <span className={`block truncate text-[14px] font-semibold leading-tight ${styles.chipErrorLabel}`}>
              &#x20B9;{data.totalRefunded.toLocaleString("en-IN")}
            </span>
            <span className={`mt-[3px] block text-[12px] font-medium ${styles.chipErrorMeta}`}>
              Refunded
            </span>
          </div>
        }
      </div>

      {/* Toggle row — graph/text only, no line/bar toggle for revenue */}
      {!isSinglePoint &&
      <div className="flex items-center justify-between mb-[6px]">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      }

      {viewMode === "graph" ?
      <>
          {!isSinglePoint &&
        <>
              <div className="overflow-x-auto -mx-1 px-1">
                {/* minWidth and height are JS-computed — must stay inline */}
                <div style={{ minWidth, height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rechartsData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tp-slate-100, #F1F5F9)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} tickCount={5} width={36} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                      <Bar dataKey="paid" stackId="a" fill="var(--tp-success-500, #22C55E)" radius={[0, 0, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="due" stackId="a" fill="var(--tp-warning-500, #F59E0B)" radius={[0, 0, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="refunded" stackId="a" fill="var(--tp-error-500, #EF4444)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Legend — below chart, circular dots for consistency */}
              <div className="mt-[6px] flex gap-[12px] text-[12px] text-tp-slate-400">
                <span className="flex items-center gap-[3px]"><span className={`inline-block h-[6px] w-[6px] rounded-full ${styles.dotSuccess}`} /> {isDepositMode ? "Received" : "Paid fully"}</span>
                <span className="flex items-center gap-[3px]"><span className={`inline-block h-[6px] w-[6px] rounded-full ${styles.dotWarn}`} /> {isDepositMode ? "Debited" : "Due"}</span>
                <span className="flex items-center gap-[3px]"><span className={`inline-block h-[6px] w-[6px] rounded-full ${styles.dotError}`} /> Refunded</span>
              </div>
            </>
        }
        </> :

      !isSinglePoint &&
      <div className="rounded-[8px] border border-tp-slate-100 overflow-hidden">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="bg-tp-slate-50">
                  <th className="text-left px-[8px] py-[6px] font-semibold text-tp-slate-500">Day</th>
                  <th className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-500">{isDepositMode ? "Received" : "Paid"}</th>
                  <th className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-500">{isDepositMode ? "Debited" : "Due"}</th>
                  <th className="text-right px-[8px] py-[6px] font-semibold text-tp-slate-500">Refunded</th>
                </tr>
              </thead>
              <tbody>
                {data.days.map((day, i) =>
            <tr key={i} className={i % 2 === 1 ? "bg-tp-slate-50/50" : ""}>
                    <td className="text-left px-[8px] py-[6px] text-tp-slate-500">{day.label}</td>
                    <td className={`text-right px-[8px] py-[6px] font-semibold ${styles.cellSuccess}`}>&#x20B9;{day.paid.toLocaleString("en-IN")}</td>
                    <td className={`text-right px-[8px] py-[6px] font-semibold ${styles.cellWarn}`}>&#x20B9;{day.due.toLocaleString("en-IN")}</td>
                    <td className={`text-right px-[8px] py-[6px] font-semibold ${styles.cellError}`}>&#x20B9;{(day.refunded ?? 0).toLocaleString("en-IN")}</td>
                  </tr>
            )}
              </tbody>
            </table>
          </div>

      }
    </CardShell>);

}