"use client";

import { ArrowDown2, ArrowUp2, MoneyRecive } from "iconsax-reactjs";
import { CardShell } from "../CardShell";







function formatMoney(value) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function RevenueComparisonCard({ data, onPillTap }) {
  const revenueDelta = data.primaryRevenue - data.compareRevenue;
  const deltaDirection = revenueDelta >= 0 ? "up" : "down";
  const deltaTone = deltaDirection === "up" ?
  { bg: "rgba(34,197,94,0.10)", text: "var(--tp-success-600, #16A34A)" } :
  { bg: "rgba(239,68,68,0.10)", text: "var(--tp-danger-600, #DC2626)" };

  return (
    <CardShell
      icon={<MoneyRecive size={14} variant="Bulk" />}
      title={data.title}>

      
      <div className="grid grid-cols-2 gap-[8px]">
        <div className="rounded-[8px] bg-tp-slate-50 px-[8px] py-[7px]">
          <p className="text-[12px] font-medium text-tp-slate-500">{data.primaryDateLabel}</p>
          <p className="mt-[2px] text-[14px] font-bold text-tp-slate-800">{formatMoney(data.primaryRevenue)}</p>
          <p className="mt-[3px] text-[12px] text-tp-slate-500">Refunded {formatMoney(data.primaryRefunded)}</p>
          <p className="text-[12px] text-tp-slate-500">Deposits {formatMoney(data.primaryDeposits)}</p>
        </div>
        <div className="rounded-[8px] bg-tp-slate-50 px-[8px] py-[7px]">
          <p className="text-[12px] font-medium text-tp-slate-500">{data.compareDateLabel}</p>
          <p className="mt-[2px] text-[14px] font-bold text-tp-slate-800">{formatMoney(data.compareRevenue)}</p>
          <p className="mt-[3px] text-[12px] text-tp-slate-500">Refunded {formatMoney(data.compareRefunded)}</p>
          <p className="text-[12px] text-tp-slate-500">Deposits {formatMoney(data.compareDeposits)}</p>
        </div>
      </div>

      <div className="mt-[8px] flex items-center justify-between rounded-[8px] px-[8px] py-[6px]" style={{ backgroundColor: deltaTone.bg }}>
        <p className="text-[14px] font-medium text-tp-slate-700">Revenue change</p>
        <div className="flex items-center gap-[4px]" style={{ color: deltaTone.text }}>
          {deltaDirection === "up" ? <ArrowUp2 size={14} variant="Bold" /> : <ArrowDown2 size={14} variant="Bold" />}
          <span className="text-[14px] font-semibold">{formatMoney(Math.abs(revenueDelta))}</span>
        </div>
      </div>

    </CardShell>);

}