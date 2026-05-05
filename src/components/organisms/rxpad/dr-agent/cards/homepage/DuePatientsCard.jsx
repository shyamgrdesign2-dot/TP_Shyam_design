"use client";

import { WalletMinus } from "iconsax-reactjs";
import { CardShell } from "../CardShell";
import { SidebarLink } from "../SidebarLink";






export function DuePatientsCard({ data }) {
  return (
    <CardShell
      icon={<WalletMinus size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}
      sidebarLink={<SidebarLink text={data.ctaLabel} />}>
      
      <div className="rounded-[12px] border border-tp-warning-100 bg-tp-warning-50/45 px-[8px] py-[7px]">
        <p className="text-[12px] font-semibold text-tp-warning-700">{data.periodLabel}</p>
        <p className="mt-[3px] text-[14px] text-tp-slate-700">
          <span className="font-semibold text-tp-warning-700">{data.patientCount}</span> patients with dues
        </p>
        <p className="text-[14px] text-tp-slate-700">
          Total due amount: <span className="font-semibold text-tp-warning-700">₹{data.totalDueAmount.toLocaleString("en-IN")}</span>
        </p>
        <p className="mt-[3px] text-[12px] text-tp-slate-500">As of {data.asOf}</p>
      </div>
    </CardShell>);

}