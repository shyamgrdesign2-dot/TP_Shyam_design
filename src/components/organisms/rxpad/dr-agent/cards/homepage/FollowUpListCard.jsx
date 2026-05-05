"use client";
import React, { useState } from "react";
import { Calendar2, NotificationBing } from "iconsax-reactjs";
import { CardShell } from "../CardShell";

import { FooterCTA } from "../FooterCTA";



export function FollowUpListCard({ data, onPillTap }) {
  const [disabledItems, setDisabledItems] = useState(new Set());
  const [allDisabled, setAllDisabled] = useState(false);

  const handleSendAll = () => {
    setAllDisabled(true);
    setDisabledItems(new Set(data.items.map((_, i) => i)));
    onPillTap?.("Send reminder to all");
  };

  const handleSendItem = (index, name) => {
    setDisabledItems((prev) => new Set(prev).add(index));
    onPillTap?.(`Send reminder to ${name}`);
  };

  return (
    <CardShell
      icon={<Calendar2 size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}
      badge={data.overdueCount > 0 ? { label: `${data.overdueCount} overdue`, color: "#DC2626", bg: "#FEE2E2" } : undefined}
      sidebarLink={
      data.items.length > 0 && !allDisabled ?
      <FooterCTA
        label={`Send reminder to all (${data.items.length})`}
        onClick={handleSendAll}
        tone="secondary"
        iconLeft={<NotificationBing size={14} variant="Linear" />} /> :

      undefined
      }>
      
      <div className="space-y-[5px]">
        {data.items.map((item, i) => {
          const isDisabled = disabledItems.has(i);
          return (
            <div key={i} className="flex items-center gap-[8px] rounded-[8px] bg-tp-slate-50 px-[8px] py-[6px] transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[4px]">
                  <p className="truncate text-[14px] font-medium text-tp-slate-800">
                    {item.name}
                  </p>
                  {item.isOverdue &&
                  <span className="flex-shrink-0 rounded-[4px] bg-tp-error-50 px-[5px] py-[1px] text-[12px] font-semibold text-tp-error-600">
                      Overdue
                    </span>
                  }
                </div>
                <p className="text-[12px] text-tp-slate-400">{item.scheduledDate}</p>
              </div>
              <button
                type="button"
                disabled={isDisabled}
                className="flex-shrink-0 rounded-[6px] border border-tp-blue-400 bg-transparent px-[10px] py-[3px] text-[12px] font-medium text-tp-blue-600 transition-colors hover:bg-tp-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => handleSendItem(i, item.name)}>
                
                Remind
              </button>
            </div>);

        })}
      </div>
    </CardShell>);

}