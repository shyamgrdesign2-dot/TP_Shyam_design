"use client";

import { CardShell } from "../CardShell";

import { cn } from "@/src/hooks/utils";










function SourceBadge({ source }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-[4px] px-1.5 py-[1px] text-[12px] font-semibold leading-[1.5]",
        source === "prescribed" ?
        "bg-tp-blue-50 text-tp-blue-500" :
        "bg-tp-violet-50 text-tp-violet-600"
      )}>
      
      {source}
    </span>);

}

export function MedHistoryCard({ data, onPillTap }) {
  return (
    <CardShell
      icon={<span />}
      tpIconName="pill"
      title="Medication History"
      badge={{
        label: `${data.entries.length} found`,
        color: "#92400E",
        bg: "#FEF3C7"
      }}
      dataSources={["EMR Records", "Pharmacy Records"]}>

      
      <div className="space-y-0">
        {data.entries.map((entry, i) =>
        <div
          key={`${entry.drug}-${i}`}
          className={cn(
            "flex items-start gap-2 py-[4px]",
            i < data.entries.length - 1 &&
            "border-b border-tp-slate-300"
          )}>
          
            {/* Drug info */}
            <div className="min-w-0 flex-1">
              <div className="text-[14px]">
                <span className="font-semibold text-tp-slate-800">
                  {entry.drug}
                </span>
                {entry.dosage &&
              <span className="text-tp-slate-400"> ({entry.dosage})</span>
              }
              </div>
              <div className="text-[14px] text-tp-slate-400">
                {entry.date}
              </div>
            </div>

            {/* Source badge */}
            <SourceBadge source={entry.source} />
          </div>
        )}
      </div>

    </CardShell>);

}