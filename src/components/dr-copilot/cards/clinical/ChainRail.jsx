
import { cn } from "../../../dr-agent/utils"

const SPECIALTY_LABEL = {
  nephrology: "Nephrology",
  cardiology: "Cardiology",
  internal_med: "Internal med",
}

const SPECIALTY_TINT = {
  nephrology: { dot: "bg-tp-blue-500", label: "text-tp-blue-600" },
  cardiology: { dot: "bg-tp-error-500", label: "text-tp-error-600" },
  internal_med: { dot: "bg-tp-violet-500", label: "text-tp-violet-600" },
}

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

export function ChainRail({ chain }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-stretch gap-[4px] py-[2px]">
        {chain.map((link, i) => {
          const tint = SPECIALTY_TINT[link.specialty]
          return (
            <div key={i} className="flex items-stretch gap-[4px]">
              <div
                className="relative flex min-w-[116px] flex-col gap-[2px] rounded-[10px] bg-white px-[10px] py-[8px]"
                style={{
                  border: "1px solid var(--tp-slate-100, #F1F1F5)",
                  boxShadow: "0 1px 2px rgba(23, 23, 37, 0.04)",
                }}
              >
                <div className="flex items-center gap-[6px]">
                  <span className={cn("h-[6px] w-[6px] shrink-0 rounded-full", tint.dot)} aria-hidden />
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-tp-slate-500 leading-tight">
                    {link.marker}
                  </span>
                  <span className="ml-auto"><TrendGlyph trend={link.trend} /></span>
                </div>
                <span className="text-[16px] font-semibold text-tp-slate-900 leading-tight">{link.value}</span>
                {link.target && (
                  <span className="text-[11px] text-tp-slate-400 leading-tight">Target {link.target}</span>
                )}
                <span className={cn("mt-[2px] text-[11px] font-medium leading-tight", tint.label)}>
                  {SPECIALTY_LABEL[link.specialty]}
                </span>
                {link.note && (
                  <span className="text-[11px] text-tp-slate-500 leading-tight">{link.note}</span>
                )}
              </div>

              {i < chain.length - 1 && (
                <div className="flex items-center px-[1px]" aria-hidden>
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                    <path
                      d="M1 5h14M11 1l4 4-4 4"
                      stroke="var(--tp-slate-300, #D0D5DD)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
