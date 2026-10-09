
import React from "react"
import { CardShell } from "../CardShell"
import { cn } from "../../../dr-agent/utils"
import { FlagArrow } from "../../shared/FlagArrow"

/**
 * Today's Vitals card — compact clinical format:
 *   ShortLabel (unit)           ▲/▼ value
 *   e.g.  BP (mmHg)             ▼ 70/60
 */
export function VitalsSummaryCard({ data }) {
  return (
    <CardShell
      icon={<span />}
      tpIconName="Heart Rate"
      title={data.title}
      badge={
        data.recordedAt
          ? { label: data.recordedAt, color: "var(--tp-violet-600, #6D28D9)", bg: "var(--tp-violet-50, #EDE9FE)" }
          : undefined
      }
      collapsible
      dataSources={["EMR Records"]}
    >
      <div className="flex flex-col gap-0">
        {data.rows.map((row, i) => {
          const isFlagged = row.flag && row.flag !== "normal"
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between py-[5px]",
                i > 0 && "border-t border-tp-slate-50",
              )}
            >
              {/* Left: ShortLabel (unit) */}
              <span className="text-[12px] text-tp-slate-500">
                <span className="font-medium text-tp-slate-600">{row.shortLabel}</span>
                <span className="ml-[3px] text-tp-slate-400">({row.unit})</span>
              </span>

              {/* Right: arrow + value */}
              <div className="flex items-center gap-[3px]">
                {isFlagged && row.flag && row.flag !== "normal" && (
                  <FlagArrow flag={row.flag} />
                )}
                <span
                  className={cn(
                    "text-[13px] font-medium tabular-nums",
                    isFlagged ? "text-tp-error-600" : "text-tp-slate-700",
                  )}
                >
                  {row.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Insight */}
      {data.insight && (
        <div className="mt-[6px] rounded-[6px] bg-tp-slate-50 px-[8px] py-[5px]">
          <p className="text-[12px] italic leading-[1.5] text-tp-slate-500">{data.insight}</p>
        </div>
      )}
    </CardShell>
  )
}
