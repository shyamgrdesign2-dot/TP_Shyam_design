
import { cn } from "../../../dr-agent/utils"

const STATUS_TOKENS

 = {
  done: {
    dot: "bg-tp-success-500",
    pill: "text-tp-success-700",
    pillBg: "bg-tp-success-100",
    label: "Done",
    cardBg: "bg-tp-success-50/40",
    cardBorder: "var(--tp-success-100, #D1FAE5)",
  },
  due: {
    dot: "bg-tp-warning-500",
    pill: "text-tp-warning-700",
    pillBg: "bg-tp-warning-100",
    label: "Due",
    cardBg: "bg-tp-warning-50/50",
    cardBorder: "var(--tp-warning-200, #FDE68A)",
  },
  overdue: {
    dot: "bg-tp-error-500",
    pill: "text-tp-error-700",
    pillBg: "bg-tp-error-100",
    label: "Overdue",
    cardBg: "bg-tp-error-50/60",
    cardBorder: "var(--tp-error-200, #FECDD3)",
  },
  pending: {
    dot: "bg-tp-slate-300",
    pill: "text-tp-slate-500",
    pillBg: "bg-tp-slate-100",
    label: "Pending",
    cardBg: "bg-white",
    cardBorder: "var(--tp-slate-100, #F1F1F5)",
  },
}

function formatMeta(meta) {
  if (!meta) return { prefix: null, day: null, date: null }
  const dateMatch = meta.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i)
  const dayMatch = meta.match(/(Day\s+\d+)/i)
  let cleaned = meta
  if (dateMatch) cleaned = cleaned.replace(dateMatch[0], "")
  if (dayMatch) cleaned = cleaned.replace(dayMatch[0], "")
  cleaned = cleaned.replace(/·/g, "").replace(/\s+/g, " ").trim()
  return {
    prefix: cleaned || null,
    day: dayMatch ? dayMatch[0] : null,
    date: dateMatch ? dateMatch[0] : null,
  }
}

/**
 * Vertical timeline: a dashed rail runs through every step's dot so the list reads
 * as a sequence, not a stack. Dot sits in its own gutter on the left (outside the
 * card) with the connector line going through it.
 */
export function TreatmentPathway({ steps }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const t = STATUS_TOKENS[step.status]
        const { prefix, day, date } = formatMeta(step.meta)
        const isFirst = i === 0
        const isLast = i === steps.length - 1
        return (
          <li key={i} className="relative flex items-stretch gap-[10px] pb-[6px]">
            {/* Left rail: dashed connector + dot centred on the card's midline */}
            <div className="relative flex w-[12px] shrink-0 flex-col items-center">
              {/* Connector line above the dot */}
              <span
                className={cn("w-0 flex-[1]", isFirst && "invisible")}
                style={{
                  minHeight: "8px",
                  borderLeft: "1.25px dashed var(--tp-slate-200, #E2E2EA)",
                }}
                aria-hidden
              />
              {/* Dot */}
              <span
                className={cn(
                  "relative z-10 h-[10px] w-[10px] shrink-0 rounded-full",
                  t.dot,
                )}
                style={{ boxShadow: "0 0 0 2px white" }}
                aria-hidden
              />
              {/* Connector line below the dot */}
              <span
                className={cn("w-0 flex-[1]", isLast && "invisible")}
                style={{
                  minHeight: "8px",
                  borderLeft: "1.25px dashed var(--tp-slate-200, #E2E2EA)",
                }}
                aria-hidden
              />
            </div>

            {/* Right column: full-width card */}
            <div
              className={cn("flex-1 rounded-[10px] px-[12px] py-[8px]", t.cardBg)}
              style={{ border: `1px solid ${t.cardBorder}` }}
            >
              <div className="grid grid-cols-[1fr_auto] items-center gap-[8px]">
                <span className="text-[13px] font-medium text-tp-slate-800 leading-tight truncate">
                  {step.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-[8px] py-[2px] text-[10px] font-semibold uppercase tracking-wide",
                    t.pillBg,
                    t.pill,
                  )}
                >
                  {t.label}
                </span>
              </div>
              {(prefix || day || date) && (
                <div className="mt-[4px] text-[11px] leading-tight text-tp-slate-500">
                  {prefix && <span>{prefix} </span>}
                  {day && <span className="font-semibold text-tp-slate-900">{day}</span>}
                  {day && date && <span> </span>}
                  {date && (
                    <span>
                      (<span className="font-semibold text-tp-slate-900">{date}</span>)
                    </span>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
