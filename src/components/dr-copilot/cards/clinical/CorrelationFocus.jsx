
import { cn } from "../../../dr-agent/utils"

function TrendGlyph({ trend }) {
  if (!trend) return null
  const color =
    trend === "up"
      ? "text-tp-error-600"
      : trend === "down"
        ? "text-tp-warning-600"
        : "text-tp-slate-400"
  const glyph = trend === "up" ? "▲" : trend === "down" ? "▼" : "■"
  return <span className={cn("text-[10px]", color)}>{glyph}</span>
}

function Axis({
  axis,
  tint,
}

) {
  const dotClass = tint === "blue" ? "bg-tp-blue-500" : "bg-tp-error-500"
  const labelClass = tint === "blue" ? "text-tp-blue-600" : "text-tp-error-600"
  return (
    <div
      className="flex min-w-[120px] flex-1 flex-col gap-[2px] rounded-[10px] bg-white px-[10px] py-[8px]"
      style={{
        border: "1px solid var(--tp-slate-100, #F1F1F5)",
        boxShadow: "0 1px 2px rgba(23, 23, 37, 0.04)",
      }}
    >
      <div className="flex items-center gap-[6px]">
        <span className={cn("h-[6px] w-[6px] shrink-0 rounded-full", dotClass)} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-tp-slate-500">
          {axis.marker}
        </span>
        <span className="ml-auto"><TrendGlyph trend={axis.trend} /></span>
      </div>
      <span className="text-[18px] font-semibold text-tp-slate-900 leading-tight">{axis.value}</span>
      {axis.target && (
        <span className="text-[11px] text-tp-slate-400 leading-tight">Target {axis.target}</span>
      )}
      <span className={cn("mt-[2px] text-[11px] font-medium leading-tight", labelClass)}>
        {axis.specialtyLabel}
      </span>
    </div>
  )
}

export function CorrelationFocus({ focus }) {
  return (
    <div
      className="overflow-hidden rounded-[10px]"
      style={{
        border: "1px solid rgba(75, 74, 213, 0.15)",
        background:
          "linear-gradient(180deg, rgba(75,74,213,0.05) 0%, rgba(75,74,213,0.015) 100%)",
      }}
    >
      <div className="px-[10px] pt-[8px] pb-[6px]">
        <div className="flex items-center gap-[6px]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <circle cx="4" cy="7" r="2" fill="var(--tp-blue-500)" opacity="0.85" />
            <circle cx="10" cy="7" r="2" fill="var(--tp-error-500)" opacity="0.85" />
            <path
              d="M4 7h6"
              stroke="var(--tp-slate-400, #A2A2A8)"
              strokeWidth="1"
              strokeDasharray="1.5 1.5"
            />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-tp-blue-700">
            Correlation focus
          </span>
          <span className="ml-auto text-[12px] font-semibold text-tp-slate-700">{focus.title}</span>
        </div>
      </div>

      <div className="flex items-stretch gap-[6px] px-[10px] pb-[8px]">
        <Axis axis={focus.axisA} tint="blue" />
        <div className="flex items-center" aria-hidden>
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            <path
              d="M4 4h14M18 1l3 3-3 3M18 10H4M4 13l-3-3 3-3"
              stroke="var(--tp-slate-400, #A2A2A8)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <Axis axis={focus.axisB} tint="error" />
      </div>

      <p
        className="px-[10px] pt-[4px] pb-[8px] text-[12px] italic text-tp-slate-600 leading-[1.5]"
        style={{ borderTop: "0.5px dashed rgba(75, 74, 213, 0.18)" }}
      >
        {focus.narrative}
      </p>
    </div>
  )
}
