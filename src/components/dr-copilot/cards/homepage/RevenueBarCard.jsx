import React, { useState } from "react"
import { tesseractIcon } from "../../ui/tesseractIcon"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import { CardShell } from "../CardShell"
import { ViewToggle } from "../ViewToggle"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const MoneyRecive = tesseractIcon("money-recive")

export function RevenueBarCard({ data, onPillTap }) {
  const [viewMode, setViewMode] = useState("graph")

  const isDepositMode = data.mode === "deposit"
  const isSinglePoint = data.days.length === 1

  // Recharts data
  const rechartsData = data.days.map((day) => ({
    name: day.label,
    paid: day.paid,
    due: day.due,
    refunded: _nullishCoalesce(day.refunded, () => ( 0)),
    total: day.paid + day.due + (_nullishCoalesce(day.refunded, () => ( 0))),
  }))
  const pointCount = rechartsData.length
  const chartHeight = 160
  const minWidth = Math.max(300, pointCount * 60)

  return (
    <CardShell
      icon={<MoneyRecive size={14} variant="Bulk" />}
      title={data.title}
    >
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
        <div className="rounded-[8px] px-[8px] py-[7px]" style={{ backgroundColor: isDepositMode ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)" }}>
          <span className="block truncate text-[14px] font-semibold leading-tight" style={{ color: isDepositMode ? "var(--tp-error-600, #DC2626)" : "var(--tp-success-600, #16A34A)" }}>
            &#x20B9;{isDepositMode ? data.totalRefunded.toLocaleString("en-IN") : data.totalPaid.toLocaleString("en-IN")}
          </span>
          <span className="mt-[3px] block text-[12px] font-medium" style={{ color: isDepositMode ? "var(--tp-error-500, #EF4444)" : "var(--tp-success-500, #22C55E)" }}>
            {isDepositMode ? "Total advance refunded" : "Paid fully"}
          </span>
        </div>
        <div className="rounded-[8px] px-[8px] py-[7px]" style={{ backgroundColor: "rgba(245,158,11,0.08)" }}>
          <span className="block truncate text-[14px] font-semibold leading-tight" style={{ color: "var(--tp-warning-600, #D97706)" }}>
            &#x20B9;{data.totalDue.toLocaleString("en-IN")}
          </span>
          <span className="mt-[3px] block text-[12px] font-medium" style={{ color: "var(--tp-warning-500, #F59E0B)" }}>
            {isDepositMode ? "Total advance debited" : "Due"}
          </span>
        </div>
        {!isDepositMode && (
          <div className="rounded-[8px] px-[8px] py-[7px]" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
            <span className="block truncate text-[14px] font-semibold leading-tight" style={{ color: "var(--tp-error-600, #DC2626)" }}>
              &#x20B9;{data.totalRefunded.toLocaleString("en-IN")}
            </span>
            <span className="mt-[3px] block text-[12px] font-medium" style={{ color: "var(--tp-error-500, #EF4444)" }}>
              Refunded
            </span>
          </div>
        )}
      </div>

      {/* Toggle row — graph/text only, no line/bar toggle for revenue */}
      {!isSinglePoint && (
        <div className="flex items-center justify-between mb-[6px]">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      )}

      {viewMode === "graph" ? (
        <>
          {!isSinglePoint && (
            <>
              <div className="overflow-x-auto -mx-1 px-1">
                <div style={{ minWidth, height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rechartsData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tp-slate-100, #F1F5F9)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} tickCount={5} width={36} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                      <Bar dataKey="paid" stackId="a" fill="var(--tp-success-500, #22C55E)" radius={[0, 0, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="due" stackId="a" fill="var(--tp-warning-500, #F59E0B)" radius={[0, 0, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="refunded" stackId="a" fill="var(--tp-error-500, #EF4444)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Legend — below chart, circular dots for consistency */}
              <div className="mt-[6px] flex gap-[12px] text-[12px] text-tp-slate-400">
                <span className="flex items-center gap-[3px]"><span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: "var(--tp-success-500, #22C55E)" }} /> {isDepositMode ? "Received" : "Paid fully"}</span>
                <span className="flex items-center gap-[3px]"><span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: "var(--tp-warning-500, #F59E0B)" }} /> {isDepositMode ? "Debited" : "Due"}</span>
                <span className="flex items-center gap-[3px]"><span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: "var(--tp-error-500, #EF4444)" }} /> Refunded</span>
              </div>
            </>
          )}
        </>
      ) : (
        !isSinglePoint && (
          <div className="rounded-[8px] border-[1px] border-tp-slate-100 overflow-hidden">
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
                {data.days.map((day, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-tp-slate-50/50" : ""}>
                    <td className="text-left px-[8px] py-[6px] text-tp-slate-500">{day.label}</td>
                    <td className="text-right px-[8px] py-[6px] font-semibold" style={{ color: "var(--tp-success-600, #16A34A)" }}>&#x20B9;{day.paid.toLocaleString("en-IN")}</td>
                    <td className="text-right px-[8px] py-[6px] font-semibold" style={{ color: "var(--tp-warning-600, #D97706)" }}>&#x20B9;{day.due.toLocaleString("en-IN")}</td>
                    <td className="text-right px-[8px] py-[6px] font-semibold" style={{ color: "var(--tp-error-600, #DC2626)" }}>&#x20B9;{(_nullishCoalesce(day.refunded, () => ( 0))).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
