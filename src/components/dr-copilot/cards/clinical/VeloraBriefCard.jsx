
import { cn } from "../../../dr-agent/utils"
import { tesseractIcon } from "../../ui/tesseractIcon"
import { CardShell } from "../CardShell"
import { CrossSiloView } from "./CrossSiloView"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Flash = tesseractIcon("flash")

const TAG_TONE_TOKENS = {
  neutral: { bg: "bg-tp-slate-100", text: "text-tp-slate-700" },
  blue: { bg: "bg-tp-blue-50", text: "text-tp-blue-700" },
  violet: { bg: "bg-tp-violet-50", text: "text-tp-violet-700" },
  amber: { bg: "bg-tp-warning-50", text: "text-tp-warning-700" },
  error: { bg: "bg-tp-error-50", text: "text-tp-error-700" },
  success: { bg: "bg-tp-success-50", text: "text-tp-success-700" },
  slate: { bg: "bg-tp-slate-100", text: "text-tp-slate-600" },
}

const TONE_TOKENS = {
  critical: { badgeBg: "var(--tp-error-50)", badgeColor: "var(--tp-error-700)", accent: "bg-tp-error-500" },
  warning: { badgeBg: "var(--tp-warning-50)", badgeColor: "var(--tp-warning-700)", accent: "bg-tp-warning-500" },
  info: { badgeBg: "var(--tp-blue-50)", badgeColor: "var(--tp-blue-700)", accent: "bg-tp-blue-500" },
  neutral: { badgeBg: "var(--tp-slate-100)", badgeColor: "var(--tp-slate-700)", accent: "bg-tp-slate-400" },
} 

/**
 * Compact intro card shown as the first AI message for a Velora patient.
 * Answers "what's the one thing to notice?" in a glanceable block.
 * Drill-downs are exposed via `suggestions` rendered by ChatBubble below the card.
 */
export function VeloraBriefCard({ data }) {
  const tone = TONE_TOKENS[data.urgencyBadge.tone]

  return (
    <CardShell
      icon={<Flash size={15} variant="Bulk" />}
      title={data.headline}
      badge={{ label: data.urgencyBadge.label, bg: tone.badgeBg, color: tone.badgeColor }}
      collapsible={false}
    >
      <div className="flex flex-col gap-[10px]">
        {/* Subhead under title */}
        <p className="text-[13px] text-tp-slate-600 leading-[1.5]">{data.subhead}</p>

        {/* Patient strip */}
        <div className="flex items-center gap-[10px] rounded-[8px] bg-tp-slate-50 px-[10px] py-[8px]">
          <div className={cn("h-[24px] w-[3px] shrink-0 rounded-full", tone.accent)} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-tp-slate-800 leading-tight">
              {data.patient.label}
            </p>
            <p className="mt-[1px] truncate text-[12px] text-tp-slate-500 leading-tight">
              {data.patient.summary}
            </p>
          </div>
        </div>

        {/* Cross-silo view — the signature Velora framing */}
        <CrossSiloView silos={data.silos} note={data.siloNote} />

        {/* Key highlights — structured rows: bold primary + value, muted context, tag on the right. */}
        {data.highlights.length > 0 && (
          <div className="flex flex-col gap-[2px]">
            <p className="px-[2px] text-[12px] font-semibold text-tp-slate-800">Key highlights</p>
            <ul className="flex flex-col gap-[4px]">
              {data.highlights.map((h, i) => {
                const tagTone = h.tag ? TAG_TONE_TOKENS[h.tag.tone] : null
                return (
                  <li
                    key={i}
                    className="rounded-[8px] bg-white px-[10px] py-[7px]"
                    style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-start gap-[8px]">
                      <p className="text-[13px] leading-tight text-tp-slate-700">
                        <span className="font-semibold text-tp-slate-900">{h.primary}</span>
                        {h.value && (
                          <span className="ml-[6px] font-semibold text-tp-slate-900">{h.value}</span>
                        )}
                      </p>
                      {h.tag && tagTone && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-[8px] py-[2px] text-[10px] font-semibold whitespace-nowrap",
                            tagTone.bg,
                            tagTone.text,
                          )}
                        >
                          {h.tag.label}
                        </span>
                      )}
                    </div>
                    {h.context && (
                      <p className="mt-[2px] text-[11px] leading-tight text-tp-slate-500">
                        {h.context}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </CardShell>
  )
}
