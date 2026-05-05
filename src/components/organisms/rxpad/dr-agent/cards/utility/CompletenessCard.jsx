"use client";

import { CheckCircle, Circle } from "lucide-react";
import { CardShell } from "../CardShell";

import { cn } from "@/src/hooks/utils";










export function CompletenessCard({ data, onPillTap }) {
  return (
    <CardShell
      icon={<span />}
      tpIconName="clipboard-activity"
      title="Documentation Check"
      badge={
      data.emptyCount > 0 ?
      {
        label: `${data.emptyCount} empty`,
        color: "#64748B",
        bg: "#F1F5F9"
      } :
      undefined
      }>

      
      <div className="space-y-0">
        {data.sections.map((section, i) =>
        <div
          key={section.name}
          className="flex items-center gap-2 py-[4px]"
          style={i < data.sections.length - 1 ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" } : undefined}>
          
            {/* Status icon */}
            {section.filled ?
          <CheckCircle size={14} className="flex-shrink-0 text-tp-success-500" /> :

          <Circle size={14} className="flex-shrink-0 text-tp-slate-300" />
          }

            {/* Section name */}
            <span
            className={cn(
              "flex-1 text-[14px]",
              section.filled ?
              "text-tp-slate-600" :
              "font-medium text-tp-slate-500"
            )}>
            
              {section.name}
            </span>

            {/* Count badge */}
            {section.count != null &&
          <span className="rounded-[4px] bg-tp-slate-100 px-1 py-[0.5px] text-[12px] text-tp-slate-400">
                {section.count}
              </span>
          }
          </div>
        )}
      </div>
    </CardShell>);

}