
import { useEffect, useState } from "react"
import { tesseractIcon } from "../../ui/tesseractIcon"
import { cn } from "../../../dr-agent/utils"
import { CardShell } from "../CardShell"
import { InsightBox } from "../InsightBox"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { CrossSiloView } from "./CrossSiloView"
import { ClinicalSnapshot } from "./ClinicalSnapshot"
import { TreatmentPathway } from "./TreatmentPathway"
import { highlightDates } from "../../velora/highlightDates"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Clock = tesseractIcon("clock")
const Calendar2 = tesseractIcon("calendar2")
const CloseCircle = tesseractIcon("close-circle")
const InfoCircle = tesseractIcon("info-circle")

// SidebarLink intentionally not imported — the footer CTA was removed.

const URGENCY_TOKENS

 = {
  critical: {
    badge: { label: "Time-critical", color: "var(--tp-error-700)", bg: "var(--tp-error-50)" },
    ringBg: "bg-tp-error-50/70",
    stripe: "bg-tp-error-500",
    accentText: "text-tp-error-600",
  },
  warning: {
    badge: { label: "Due soon", color: "var(--tp-warning-700)", bg: "var(--tp-warning-50)" },
    ringBg: "bg-tp-warning-50/70",
    stripe: "bg-tp-warning-500",
    accentText: "text-tp-warning-600",
  },
  info: {
    badge: { label: "For review", color: "var(--tp-blue-700)", bg: "var(--tp-blue-50)" },
    ringBg: "bg-tp-blue-50/70",
    stripe: "bg-tp-blue-500",
    accentText: "text-tp-blue-600",
  },
}

const STATE_ICON = {
  not_booked: Calendar2,
  not_ordered: CloseCircle,
  not_performed: InfoCircle,
}

const STATE_LABEL = {
  not_booked: "Not booked",
  not_ordered: "Not ordered",
  not_performed: "Not performed",
}

function useCountdown(iso) {
  const [text, setText] = useState(() => format(iso))
  useEffect(() => {
    const id = setInterval(() => setText(format(iso)), 60000)
    return () => clearInterval(id)
  }, [iso])
  return text
}

function format(iso) {
  const diffMs = new Date(iso).getTime() - Date.now()
  if (diffMs <= 0) return "Window has closed"
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `Closes in ~${days} day${days === 1 ? "" : "s"}`
  }
  if (hours >= 1) return `Closes in ~${hours}h ${minutes}m`
  return `Closes in ~${minutes}m`
}

export function CareGapWindowCard({ data }) {
  const countdown = useCountdown(data.deadlineIso)
  const tokens = URGENCY_TOKENS[data.urgency]

  return (
    <CardShell
      icon={<Clock size={15} variant="Bulk" />}
      title={data.title}
      date={countdown}
      badge={tokens.badge}
      collapsible={false}
    >
      <div className="flex flex-col gap-[10px]">
        {/* Patient context — quiet, left-stripe, reads like a chart header not a card */}
        <div className="flex items-center gap-[10px] rounded-[8px] bg-tp-slate-50 px-[10px] py-[8px]">
          <div className="h-[28px] w-[3px] shrink-0 rounded-full bg-tp-blue-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-tp-slate-800 leading-tight">
              {data.patient.label}
            </p>
            <p className="mt-[2px] truncate text-[12px] text-tp-slate-500 leading-tight">
              {data.patient.summary}
            </p>
          </div>
        </div>

        <CrossSiloView silos={data.silos} note={data.siloNote} />

        {/* Patient clinical picture — presentation, history, labs, meds */}
        <SectionSummaryBar icon="clipboard-activity" label="Clinical snapshot" />
        <ClinicalSnapshot persona={data.persona} />

        {/* HMS treatment pathway — done / due / overdue / pending */}
        <SectionSummaryBar
          icon="medical-record"
          label="Treatment pathway"
          trailing={
            <span className="text-[11px] font-medium text-tp-slate-500">
              {data.pathway.filter((s) => s.status === "done").length}/{data.pathway.length} complete
            </span>
          }
        />
        <div className="rounded-[10px] bg-white px-[10px] py-[8px]" style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}>
          <TreatmentPathway steps={data.pathway} />
        </div>

        <SectionSummaryBar
          icon="stethoscope"
          label="Gaps detected"
          trailing={
            <span className="text-[12px] font-semibold text-tp-error-600">{data.gaps.length}</span>
          }
        />

        <ul className="flex flex-col gap-[6px]">
          {data.gaps.map((gap, i) => {
            const Icon = STATE_ICON[gap.state]
            return (
              <li
                key={i}
                className="relative overflow-hidden rounded-[10px] bg-white"
                style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
              >
                <span className={cn("absolute inset-y-0 left-0 w-[3px]", tokens.stripe)} aria-hidden />
                <div className="pl-[12px] pr-[10px] py-[8px]">
                  <div className="flex items-center justify-between gap-[8px]">
                    <div className="flex items-center gap-[6px] min-w-0">
                      <span className={cn("inline-flex h-[18px] w-[18px] items-center justify-center rounded-[6px] shrink-0", tokens.ringBg, tokens.accentText)}>
                        <Icon size={12} variant="Bulk" />
                      </span>
                      <p className="truncate text-[14px] font-semibold text-tp-slate-800 leading-tight">
                        {gap.label}
                      </p>
                    </div>
                    <span className={cn("shrink-0 rounded-full bg-white px-[8px] py-[2px] text-[11px] font-semibold", tokens.accentText)}>
                      {STATE_LABEL[gap.state]}
                    </span>
                  </div>
                  <ul className="mt-[8px] flex flex-col gap-[4px]">
                    <li className="flex items-start gap-[6px]">
                      <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" aria-hidden />
                      <span className="text-[12px] leading-[1.55] text-tp-slate-700">
                        <strong className="font-semibold text-tp-slate-800">Detected by:</strong>{" "}
                        {gap.detectedBy}
                      </span>
                    </li>
                    <li className="flex items-start gap-[6px]">
                      <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" aria-hidden />
                      <span className="text-[12px] leading-[1.55] text-tp-slate-700">
                        <strong className="font-semibold text-tp-slate-800">Expected:</strong>{" "}
                        {highlightDates(gap.expectation)}
                      </span>
                    </li>
                    <li className="flex items-start gap-[6px]">
                      <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" aria-hidden />
                      <span className="text-[12px] leading-[1.55] text-tp-slate-600">
                        <strong className="font-semibold text-tp-slate-800">Why:</strong>{" "}
                        {highlightDates(gap.rationale)}
                      </span>
                    </li>
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Clinical significance — why the gap matters */}
        <div
          className="rounded-[8px] bg-tp-slate-50 px-[10px] py-[8px]"
          style={{ borderLeft: "3px solid var(--tp-blue-500)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-tp-slate-400">
            Clinical significance
          </p>
          <p className="mt-[2px] text-[13px] text-tp-slate-700 leading-[1.5]">
            {highlightDates(data.clinicalSignificance)}
          </p>
        </div>

        <InsightBox variant={data.urgency === "critical" ? "red" : data.urgency === "warning" ? "amber" : "purple"}>
          {highlightDates(data.rationale)}
        </InsightBox>

        {/* In-card CTAs removed — follow-up actions live in the PillBar above the input
            and (for confirmable operations) as CTAs inside their own scenario cards. */}
      </div>
    </CardShell>
  )
}
