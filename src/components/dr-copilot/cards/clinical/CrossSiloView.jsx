
import { cn } from "../../../dr-agent/utils"

const DOT_COLORS = {
  blue: "bg-tp-blue-500",
  violet: "bg-tp-violet-500",
  amber: "bg-tp-warning-500",
  error: "bg-tp-error-500",
  slate: "bg-tp-slate-400",
}

/**
 * Cross-silo view — a distinct section inside the brief card.
 * Bordered light-tinted container with a grey-bar heading, vertical silo list,
 * and an italic framing slab at the bottom.
 */
export function CrossSiloView({ silos, note }) {
  return (
    <section
      className="overflow-hidden rounded-[10px] bg-white"
      style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
    >
      {/* Section heading bar */}
      <div className="flex h-[28px] items-center justify-between gap-[6px] bg-tp-slate-50 px-[10px]">
        <span className="text-[12px] font-semibold text-tp-slate-800">Cross-silo view</span>
        <span className="text-[11px] text-tp-slate-500">{silos.length} silos</span>
      </div>

      {/* Silo list */}
      <ul className="flex flex-col gap-[6px] px-[12px] py-[10px]">
        {silos.map((silo) => (
          <li key={silo.label} className="flex items-center gap-[10px]">
            <span
              className={cn("h-[8px] w-[8px] shrink-0 rounded-full", DOT_COLORS[silo.tone])}
              aria-hidden
            />
            <span className="text-[13px] text-tp-slate-800 leading-tight">{silo.label}</span>
          </li>
        ))}
      </ul>

      {/* Italic framing footer */}
      <p
        className="px-[12px] py-[10px] text-[12px] italic text-tp-slate-600 leading-[1.55]"
        style={{
          borderTop: "0.5px solid var(--tp-slate-100, #F1F1F5)",
          background: "var(--tp-slate-50, #FAFAFB)",
        }}
      >
        {note}
      </p>
    </section>
  )
}
