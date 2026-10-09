
import { tesseractIcon } from "../../ui/tesseractIcon"
import { cn } from "../../../dr-agent/utils"
import { CardShell } from "../CardShell"
import { InsightBox } from "../InsightBox"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { DataRow } from "../DataRow"
import { ChainRail } from "./ChainRail"
import { CrossSiloView } from "./CrossSiloView"
import { ClinicalSnapshot } from "./ClinicalSnapshot"
import { CorrelationFocus } from "./CorrelationFocus"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Diagram = tesseractIcon("diagram")

const PREDICTION_STYLES = {
  blue: { color: "var(--tp-blue-700)", bg: "var(--tp-blue-50)" },
  amber: { color: "var(--tp-warning-700)", bg: "var(--tp-warning-50)" },
  error: { color: "var(--tp-error-700)", bg: "var(--tp-error-50)" },
} 

const SPECIALTY_ICON = {
  nephrology: "Kidney",
  cardiology: "Heart Rate",
  internal_med: "stethoscope",
}

const SPECIALTY_DOT = {
  nephrology: "bg-tp-blue-500",
  cardiology: "bg-tp-error-500",
  internal_med: "bg-tp-violet-500",
}

export function ClinicalCorrelationChainCard({ data }) {
  const badge = { label: data.prediction.label, ...PREDICTION_STYLES[data.prediction.color] }

  return (
    <CardShell
      icon={<Diagram size={15} variant="Bulk" />}
      title={data.title}
      badge={badge}
      collapsible={false}
    >
      <div className="flex flex-col gap-[10px]">
        {/* Patient context strip */}
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

        {/* Patient clinical picture */}
        <SectionSummaryBar icon="clipboard-activity" label="Clinical snapshot" />
        <ClinicalSnapshot persona={data.persona} />

        {/* Hero correlation pair — KT/V ↔ BNP (dialysis adequacy ↔ cardiac stress) */}
        <CorrelationFocus focus={data.correlationFocus} />

        {/* Chain rail */}
        <div className="flex flex-col gap-[6px]">
          <SectionSummaryBar
            icon="clipboard-activity"
            label="Causal chain"
            trailing={
              <span className="text-[11px] font-medium text-tp-slate-500">
                {data.chain.length} links · 3 specialists
              </span>
            }
          />
          <ChainRail chain={data.chain} />
        </div>

        {/* Per-specialist breakdown */}
        <div className="flex flex-col gap-[8px]">
          {data.specialists.map((s) => (
            <div
              key={s.specialty}
              className="rounded-[10px] bg-white"
              style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
            >
              <div className="flex items-center gap-[8px] px-[10px] pt-[8px]">
                <span className={cn("h-[6px] w-[6px] shrink-0 rounded-full", SPECIALTY_DOT[s.specialty])} aria-hidden />
                <p className="text-[13px] font-semibold text-tp-slate-800 leading-tight">{s.label}</p>
              </div>
              <div className="px-[10px] pb-[4px] pt-[4px]">
                {s.rows.map((r, idx) => (
                  <DataRow
                    key={idx}
                    label={r.label}
                    value={r.value}
                    refRange={r.refRange}
                    flag={r.flag}
                    isLast={idx === s.rows.length - 1}
                  />
                ))}
              </div>
              <p className="border-t border-tp-slate-50 px-[10px] py-[6px] text-[12px] text-tp-slate-500 leading-[1.5]">
                {s.note}
              </p>
            </div>
          ))}
        </div>

        {/* Predicted outcomes — if chain is not acted upon */}
        {data.predictedOutcomes.length > 0 && (
          <div
            className="rounded-[8px] bg-tp-slate-50 px-[10px] py-[8px]"
            style={{ borderLeft: "3px solid var(--tp-error-500)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-tp-slate-400">
              Predicted outcomes
            </p>
            <ul className="mt-[4px] flex flex-col gap-[3px]">
              {data.predictedOutcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-[6px] text-[13px] text-tp-slate-700 leading-[1.5]">
                  <span className="mt-[6px] inline-block h-[4px] w-[4px] shrink-0 rounded-full bg-tp-error-500" aria-hidden />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <InsightBox variant="purple">{data.insight}</InsightBox>

        {/* In-card CTAs removed — follow-up actions live in the PillBar above the input. */}
      </div>
    </CardShell>
  )
}

// Keep SPECIALTY_ICON export for future icon-header swaps.
export { SPECIALTY_ICON }
