"use client";
import React from "react";
import { CardShell } from "../CardShell";



const TONE_COLORS = {
  warning: { bg: "#FEF6E7", color: "#C6850C" },
  success: { bg: "#EDF8F1", color: "#1B8C54" },
  info: { bg: "#EEF3FC", color: "#3B6FE0" },
  danger: { bg: "#FDEDED", color: "#C42B2B" }
};



export function PatientListCard({ data, onPillTap }) {
  return (
    <CardShell
      icon={<span />}
      tpIconName="clipboard-activity"
      title={data.title}
      badge={{ label: `${data.totalCount}`, color: "#6D28D9", bg: "#EDE9FE" }}>
      
      <div className="space-y-[4px]">
        {data.items.map((item, i) => {
          const tone = TONE_COLORS[item.statusTone];
          return (
            <div key={i} className="flex items-center gap-[8px] rounded-[8px] bg-tp-slate-50 px-[8px] py-[5px]">
              <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-tp-slate-200 text-[12px] font-semibold text-tp-slate-600">
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-tp-slate-800">{item.name}</p>
                <p className="text-[12px] text-tp-slate-400">{item.gender}/{item.age}y &middot; {item.time}</p>
              </div>
              <span className="rounded-[4px] px-[6px] py-[1px] text-[12px] font-semibold" style={{ background: tone.bg, color: tone.color }}>
                {item.status}
              </span>
            </div>);

        })}
      </div>
      {data.totalCount > data.items.length &&
      <p className="mt-[6px] text-center text-[12px] text-tp-blue-500 cursor-pointer hover:underline">
          View all {data.totalCount} patients
        </p>
      }
    </CardShell>);

}