"use client";

import { MoneyRecive } from "iconsax-reactjs";
import { CardShell } from "../CardShell";
import { SidebarLink } from "../SidebarLink";







export function BillingSummaryCard({ data, onSidebarNav }) {
  return (
    <CardShell
      icon={<MoneyRecive size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}
      sidebarLink={
      <SidebarLink
        text={data.footerCtaLabel || "Open OPD billing section"}
        onClick={() => onSidebarNav?.("opd-billing")} />

      }>
      
      {!data.minimal &&
      <div className="mb-[8px] rounded-[10px] border border-tp-slate-100 bg-white">
          {(data.mode === "billing" || data.mode === "combined") &&
        <div className="px-[8px] py-[7px]">
              <p className="text-[12px] text-tp-slate-500">Billing</p>
              <div className="mt-[6px] grid grid-cols-2 gap-[6px]">
                <div className="rounded-[8px] bg-tp-slate-50 px-[7px] py-[6px]">
                  <p className="text-[12px] text-tp-slate-500">Total billed</p>
                  <p className="text-[14px] font-semibold text-tp-slate-800">₹{data.totalBilledAmount.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-[8px] bg-tp-success-50/60 px-[7px] py-[6px]">
                  <p className="text-[12px] text-tp-success-500">Paid fully</p>
                  <p className="text-[14px] font-semibold text-tp-success-700">₹{data.totalPaidFullyAmount.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-[8px] bg-tp-warning-50/60 px-[7px] py-[6px]">
                  <p className="text-[12px] text-tp-warning-500">Dues</p>
                  <p className="text-[14px] font-semibold text-tp-warning-700">₹{data.totalDueAmount.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-[8px] bg-tp-error-50/60 px-[7px] py-[6px]">
                  <p className="text-[12px] text-tp-error-500">Refunded</p>
                  <p className="text-[14px] font-semibold text-tp-error-700">₹{data.totalRefundedAmount.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
        }

          {(data.mode === "deposit" || data.mode === "combined") &&
        <>
              {data.mode === "combined" && <div className="mx-[8px] h-px bg-tp-slate-100" />}
              <div className="px-[8px] py-[7px]">
                <p className="text-[12px] text-tp-slate-500">Advance</p>
                <div className="mt-[6px] grid grid-cols-3 gap-[6px]">
                  <div className="rounded-[8px] bg-tp-slate-50 px-[7px] py-[6px]">
                    <p className="text-[12px] text-tp-slate-500">Total received</p>
                    <p className="text-[14px] font-semibold text-tp-slate-800">₹{data.totalAdvanceReceived.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-[8px] bg-tp-warning-50/60 px-[7px] py-[6px]">
                    <p className="text-[12px] text-tp-warning-500">Debited</p>
                    <p className="text-[14px] font-semibold text-tp-warning-700">₹{data.totalAdvanceDebited.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-[8px] bg-tp-error-50/60 px-[7px] py-[6px]">
                    <p className="text-[12px] text-tp-error-500">Refunded</p>
                    <p className="text-[14px] font-semibold text-tp-error-700">₹{data.totalAdvanceRefunded.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
            </>
        }
        </div>
      }

    </CardShell>);

}