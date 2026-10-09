import React from "react"
import { highlightClinicalText } from "../shared/highlightClinicalText"
// Summary Cards (A1-A7)
import { GPSummaryCard, buildSummaryNarrative } from "./summary/GPSummaryCard"
import { ObstetricExpandedCard } from "./summary/ObstetricExpandedCard"
import { GynecSummaryCard } from "./summary/GynecSummaryCard"
import { PediatricSummaryCard } from "./summary/PediatricSummaryCard"
import { OphthalSummaryCard } from "./summary/OphthalSummaryCard"
import { PatientReportedCard } from "./summary/PatientReportedCard"
import { LastVisitCard } from "./summary/LastVisitCard"
import { SbarOverviewCard } from "./summary/SbarOverviewCard"
// Data Cards (B1-B6)
import { LabPanelCard } from "./data/LabPanelCard"
import { VitalTrendsBarCard } from "./data/VitalTrendsBarCard"
import { VitalTrendsLineCard } from "./data/VitalTrendsLineCard"
import { LabComparisonCard } from "./data/LabComparisonCard"
import { LabTrendsCard } from "./data/LabTrendsCard"
import { MedHistoryCard } from "./data/MedHistoryCard"
// Action Cards (C1-C6)
import { DDXCard } from "./action/DDXCard"
import { ProtocolMedsCard } from "./action/ProtocolMedsCard"
import { InvestigationCard } from "./action/InvestigationCard"
import { FollowUpCard } from "./action/FollowUpCard"
import { AdviceCard } from "./action/AdviceCard"
import { PatientMatchesCard } from "./clinical/PatientMatchesCard"
import { ScopeRedirectCard } from "./clinical/ScopeRedirectCard"
import { PatientBridgeCard } from "./clinical/PatientBridgeCard"
import { VoiceStructuredRxCard as RxPadVoiceStructuredRxCard } from "../../dr-agent/rxpad/dr-agent/cards/action/VoiceStructuredRxCard"
// Analysis Cards (D1, D3)
import { OCRPathologyCard } from "./analysis/OCRPathologyCard"
import { OCRFullExtractionCard } from "./analysis/OCRFullExtractionCard"
// Homepage Operational Cards (H1–H12)
import { PatientListCard } from "./homepage/PatientListCard"
import { FollowUpListCard } from "./homepage/FollowUpListCard"
import { RevenueBarCard } from "./homepage/RevenueBarCard"
import { RevenueComparisonCard } from "./homepage/RevenueComparisonCard"
import { BulkActionCard } from "./homepage/BulkActionCard"
import { DonutChartCard } from "./homepage/DonutChartCard"
import { PieChartCard } from "./homepage/PieChartCard"
import { LineGraphCard } from "./homepage/LineGraphCard"
import { AnalyticsTableCard } from "./homepage/AnalyticsTableCard"
import { ConditionBarCard } from "./homepage/ConditionBarCard"
import { HeatmapCard } from "./homepage/HeatmapCard"
import { WelcomeCard } from "./homepage/WelcomeCard"
import { DuePatientsCard } from "./homepage/DuePatientsCard"
import { ExternalCtaCard } from "./homepage/ExternalCtaCard"
import { FollowUpRateCard } from "./homepage/FollowUpRateCard"
// Utility & Safety Cards (E1-E2 + CDSS)
import { TranslationCard } from "./utility/TranslationCard"
import { CompletenessCard } from "./utility/CompletenessCard"
import { DrugInteractionCard } from "./utility/DrugInteractionCard"
import { AllergyConflictCard } from "./utility/AllergyConflictCard"
import { FollowUpQuestionCard } from "./utility/FollowUpQuestionCard"
import { GuardrailCard } from "./utility/GuardrailCard"
// Vitals Summary Card
import { VitalsSummaryCard } from "./data/VitalsSummaryCard"
// Medical History Card
import { MedicalHistoryCard } from "./summary/MedicalHistoryCard"
// Clinical Cards
import { PomrProblemCard } from "./clinical/PomrProblemCard"
import { SbarCriticalCard } from "./clinical/SbarCriticalCard"
import { CareGapWindowCard } from "./clinical/CareGapWindowCard"
import { ClinicalCorrelationChainCard } from "./clinical/ClinicalCorrelationChainCard"
import { VeloraBriefCard } from "./clinical/VeloraBriefCard"
import { VeloraScenarioCard } from "./clinical/VeloraScenarioCard"
// New Card Variants
import { ReferralCard } from "./utility/ReferralCard"
import { ClinicalGuidelinesCard } from "./utility/ClinicalGuidelinesCard"
import { VaccinationScheduleCard } from "./data/VaccinationScheduleCard"
import { PatientTimelineCard } from "./data/PatientTimelineCard"
import { RxPreviewCard } from "./action/RxPreviewCard"
import { BillingSummaryCard } from "./homepage/BillingSummaryCard"
import { VaccinationDueListCard } from "./homepage/VaccinationDueListCard"
import { ANCScheduleListCard } from "./homepage/ANCScheduleListCard"
import { PatientSearchCard } from "./homepage/PatientSearchCard"
import { ChartAnswerCard } from "./clinical/ChartAnswerCard"

/** Render **bold** markdown in text */
function renderBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

/**
 * Donut chart placement rules:
 *
 * Show donut ONLY on cards that require a **fixed/expected set of data fields**
 * where missing data is clinically meaningful. Currently only:
 * - `pomr_problem_card` — renders its own donut internally (expected labs, vitals, meds)
 *
 * Do NOT show donut on cards that display whatever data is available:
 * - patient_summary, last_visit, lab_panel, vital_trends, etc.
 * - text_* cards, homepage cards, utility cards
 *
 * Rationale: A donut showing "missing data" only makes sense when there IS an
 * expected data set. For open-ended responses, the response IS the available data
 * — there's nothing "missing" to indicate.
 */
export function CardRenderer({ output, onPillTap, onCopy, onSidebarNav, activeSpecialty, onPatientSelect }) {
  return renderCard(output, onPillTap, onCopy, onSidebarNav, activeSpecialty, onPatientSelect)
}

function renderCard(
  output,
  onPillTap,
  onCopy,
  onSidebarNav,
  activeSpecialty,
  onPatientSelect,
) {
  switch (output.kind) {
    // -- Summary Family (A) --------------------------------------------------
    case "patient_summary":
      // GPSummaryCard expects { data: SmartSummaryData; onPillTap?; onSidebarNav?; hideNarrative?; activeSpecialty? }
      return <GPSummaryCard data={output.data} onPillTap={onPillTap} onSidebarNav={onSidebarNav} defaultCollapsed={false} hideNarrative={output.hideNarrative} activeSpecialty={activeSpecialty} />

    case "patient_narrative": {
      // Standalone narrative quotation block — no CardShell, just the violet-bordered paragraph
      const narrativeParts = buildSummaryNarrative(output.data, activeSpecialty)
      if (!narrativeParts || narrativeParts.length === 0) return <></>
      return (
        <div className="rounded-[8px] bg-tp-slate-50 border-l-[3px] border-tp-violet-300 px-3 py-2">
          <p className="text-[14px] italic leading-[1.7] text-tp-slate-500">
            &ldquo;{narrativeParts}&rdquo;
          </p>
        </div>
      )
    }

    case "obstetric_summary":
      // ObstetricExpandedCard expects { data: ObstetricData; onSidebarNav? }
      return <ObstetricExpandedCard data={output.data} onSidebarNav={onSidebarNav} />

    case "gynec_summary":
      // GynecSummaryCard expects { data: GynecData; onSidebarNav? }
      return <GynecSummaryCard data={output.data} onSidebarNav={onSidebarNav} />

    case "pediatric_summary":
      // PediatricSummaryCard expects { data: PediatricsData; onSidebarNav? }
      return <PediatricSummaryCard data={output.data} onSidebarNav={onSidebarNav} />

    case "ophthal_summary":
      // OphthalSummaryCard expects { data: OphthalData; onSidebarNav? }
      return <OphthalSummaryCard data={output.data} onSidebarNav={onSidebarNav} />

    case "chart_answer":
      /* One card for every archive answer. What varies is the Markdown inside
         it, not the component - see docs/dr-copilot/answer-markdown-contract.md. */
      return <ChartAnswerCard data={output.data} />

    case "symptom_collector":
      // PatientReportedCard expects { data: SymptomCollectorData; onCopy?; onPillTap? }
      return <PatientReportedCard data={output.data} defaultCollapsed={false} onPillTap={onPillTap} />

    case "last_visit":
      // LastVisitCard expects { data: LastVisitCardData; onPillTap?; onSidebarNav?; onCopy?: () => void }
      return <LastVisitCard data={output.data} onPillTap={onPillTap} onSidebarNav={onSidebarNav} />

    // -- Data Family (B) -----------------------------------------------------
    case "lab_panel":
      // LabPanelCard expects { data: LabPanelData; onPillTap?; onSidebarNav? }
      return <LabPanelCard data={output.data} onPillTap={onPillTap} onSidebarNav={onSidebarNav} />

    case "vitals_trend_bar":
      // VitalTrendsBarCard expects { data: { title: string; series: VitalTrendSeries[] } }
      return <VitalTrendsBarCard data={output.data} onPillTap={onPillTap} />

    case "vitals_trend_line":
      // VitalTrendsLineCard expects { data: { title: string; series: VitalTrendSeries[] } }
      return <VitalTrendsLineCard data={output.data} onPillTap={onPillTap} />

    case "lab_trend":
      // LabTrendsCard expects { data: { title: string; series: VitalTrendSeries[]; parameterName: string } }
      return <LabTrendsCard data={output.data} onPillTap={onPillTap} />

    case "lab_comparison":
      // LabComparisonCard expects { data: { rows: LabComparisonRow[]; insight: string } }
      return <LabComparisonCard data={output.data} />

    case "med_history":
      // MedHistoryCard expects { data: { entries: MedHistoryEntry[]; insight: string } }
      return <MedHistoryCard data={output.data} onPillTap={onPillTap} />

    // -- Action Family (C) ---------------------------------------------------
    case "ddx":
      return (
        <DDXCard
          data={output.data}
          onCopyToDiagnosis={(selected) => _optionalChain([onCopy, 'optionalCall', _ => _({ section: "diagnosis", items: selected })])}
          onCopyToRxPad={(selected) => _optionalChain([onCopy, 'optionalCall', _2 => _2({ section: "rxpad", items: selected })])}
          onSendCannedMessage={(msg) => _optionalChain([onPillTap, 'optionalCall', _3 => _3(msg)])}
        />
      )

    case "protocol_meds":
      // ProtocolMedsCard expects { data: { diagnosis; meds; safetyCheck; copyPayload }; onCopy?; onCopySingle? }
      return (
        <ProtocolMedsCard
          data={output.data}
          onCopy={onCopy }
        />
      )

    case "investigation_bundle":
      // InvestigationCard expects { data: { title; items; copyPayload }; onCopy? }
      return (
        <InvestigationCard
          data={output.data}
          onCopy={onCopy }
        />
      )

    case "follow_up":
      // FollowUpCard expects { data: { context: string; options: FollowUpOption[] }; onSelect?; onCopyToFollowUp? }
      return <FollowUpCard data={output.data} onCopyToFollowUp={(days, label) => _optionalChain([onCopy, 'optionalCall', _4 => _4({ section: "follow_up", days, label })])} />

    // -- Analysis Family (D) -------------------------------------------------
    case "ocr_pathology":
      // OCRPathologyCard expects { data: { title; category; parameters; normalCount; insight } }
      return (
        <OCRPathologyCard
          data={output.data}
          onPillTap={onPillTap}
          onCopy={onCopy }
        />
      )

    case "ocr_extraction":
      // OCRFullExtractionCard expects { data: { title; category; sections; insight }; onCopySection?; onCopyItem? }
      return (
        <OCRFullExtractionCard
          data={output.data}
        />
      )

    // -- Utility & Safety Family (E + CDSS) ----------------------------------
    case "translation":
      // TranslationCard expects { data: TranslationData & { copyPayload }; onCopy? }
      return (
        <TranslationCard
          data={output.data}
          onCopy={onCopy }
          onPillTap={onPillTap}
        />
      )

    case "completeness":
      // CompletenessCard expects { data: { sections: CompletenessSection[]; emptyCount: number } }
      return <CompletenessCard data={output.data} onPillTap={onPillTap} />

    case "drug_interaction":
      // DrugInteractionCard expects { data: DrugInteractionData }
      return <DrugInteractionCard data={output.data} />

    case "allergy_conflict":
      // AllergyConflictCard expects { data: AllergyConflictData; onOverride? }
      return <AllergyConflictCard data={output.data} />

    case "follow_up_question":
      // FollowUpQuestionCard expects { data: { question; options; multiSelect }; onSubmit? }
      return <FollowUpQuestionCard data={output.data} />

    // -- Clinical Cards -------------------------------------------------------
    case "pomr_problem_card":
      return <PomrProblemCard data={output.data} onPillTap={onPillTap} />

    case "sbar_critical":
      return <SbarCriticalCard data={output.data} />

    case "sbar_overview":
      return <SbarOverviewCard data={output.data} onSidebarNav={onSidebarNav} activeSpecialty={activeSpecialty} />

    case "patient_search":
      return <PatientSearchCard data={output.data} onPatientSelect={onPatientSelect} />

    case "guardrail":
      return <GuardrailCard data={output.data} onPillTap={onPillTap} />

    case "vitals_summary":
      return <VitalsSummaryCard data={output.data} />

    case "medical_history":
      return <MedicalHistoryCard data={output.data} onSidebarNav={onSidebarNav} />

    // -- Velora Scenario Cards -----------------------------------------------
    case "velora_brief":
      return <VeloraBriefCard data={output.data} />

    case "care_gap_window":
      return <CareGapWindowCard data={output.data} />

    case "clinical_correlation_chain":
      return <ClinicalCorrelationChainCard data={output.data} />

    case "velora_scenario_card":
      return <VeloraScenarioCard data={output.data} onPillTap={onPillTap} />

    // -- Text-Only Kinds -----------------------------------------------------
    case "text_fact":
      return (
        <div className="rounded-[8px] bg-tp-slate-50 px-[10px] py-[8px] text-[14px] text-tp-slate-700 leading-[1.6]">
          <p className="mb-[2px] font-semibold text-tp-slate-800">{output.data.context}</p>
          <p>{highlightClinicalText(output.data.value)}</p>
          <p className="mt-[4px] text-[14px] text-tp-slate-400">Source: {output.data.source}</p>
        </div>
      )

    case "text_alert":
      return (
        <div
          className={`rounded-[8px] px-[10px] py-[8px] text-[14px] font-medium ${
            output.data.severity === "critical"
              ? "bg-tp-error-50 text-tp-error-700"
              : output.data.severity === "high"
                ? "bg-tp-warning-50 text-tp-warning-700"
                : "bg-tp-slate-50 text-tp-slate-700"
          }`}
        >
          {renderBold(output.data.message)}
        </div>
      )

    case "text_list":
      return (
        <ul className="list-inside list-disc space-y-[3px] text-[14px] text-tp-slate-700 leading-[1.6]">
          {output.data.items.map((item, i) => (
            <li key={i}>{highlightClinicalText(item)}</li>
          ))}
        </ul>
      )

    case "advice_bundle":
      return (
        <AdviceCard
          data={output.data}
          onCopy={onCopy }
          onPillTap={onPillTap}
        />
      )

    case "patient_bridge":
      return <PatientBridgeCard data={output.data} />

    case "scope_redirect":
      /* The way into the other scope, carrying the question. It talks to the
         scope store itself, so it needs no callback from the panel. */
      return <ScopeRedirectCard data={output.data} />

    case "patient_matches":
      /* Clinic-wide search results. Opening one leaves this conversation
         standing and starts that patient's own. */
      return (
        <PatientMatchesCard
          data={output.data}
          onOpenPatient={(p) => onPatientSelect && onPatientSelect(p.patientUid, p)}
          onAction={(action) => onPillTap && onPillTap(action.question || action.label)}
        />
      )

    case "voice_structured_rx":
      /* The Rx pad's own card: its expand reopens the VoiceRx result canvas
         and its copy goes to the Rx pad, the same as in Dr. Agent. */
      return (
        <div data-dr-agent="true">
          <RxPadVoiceStructuredRxCard
            data={output.data}
            onCopy={onCopy }
          />
        </div>
      )

    // -- Homepage Operational Cards (H1–H12) ---------------------------------
    case "patient_list":
      return <PatientListCard data={output.data} onPillTap={onPillTap} />

    case "follow_up_list":
      return <FollowUpListCard data={output.data} onPillTap={onPillTap} />

    case "revenue_bar":
      return <RevenueBarCard data={output.data} onPillTap={onPillTap} />

    case "revenue_comparison":
      return <RevenueComparisonCard data={output.data} onPillTap={onPillTap} />

    case "bulk_action":
      return <BulkActionCard data={output.data} onPillTap={onPillTap} />

    case "donut_chart":
      return <DonutChartCard data={output.data} onPillTap={onPillTap} />

    case "pie_chart":
      return <PieChartCard data={output.data} onPillTap={onPillTap} />

    case "line_graph":
      return <LineGraphCard data={output.data} onPillTap={onPillTap} />

    case "analytics_table":
      return <AnalyticsTableCard data={output.data} onPillTap={onPillTap} />

    case "condition_bar":
      return <ConditionBarCard data={output.data} onPillTap={onPillTap} />

    case "heatmap":
      return <HeatmapCard data={output.data} onPillTap={onPillTap} />

    case "due_patients":
      return <DuePatientsCard data={output.data} />

    case "external_cta":
      return <ExternalCtaCard data={output.data} />

    case "follow_up_rate":
      return <FollowUpRateCard data={output.data} />

    case "welcome_card":
      return <WelcomeCard data={output.data} onPillTap={onPillTap} />

    // -- New Card Variants ----------------------------------------------------
    case "referral":
      return <ReferralCard data={output.data} onPillTap={onPillTap} />

    case "vaccination_schedule":
      return <VaccinationScheduleCard data={output.data} onSidebarNav={onSidebarNav} onPillTap={onPillTap} />

    case "clinical_guideline":
      return <ClinicalGuidelinesCard data={output.data} onPillTap={onPillTap} />

    case "patient_timeline":
      return <PatientTimelineCard data={output.data} onSidebarNav={onSidebarNav} />

    case "rx_preview":
      return <RxPreviewCard data={output.data} onPillTap={onPillTap} />

    case "billing_summary":
      return <BillingSummaryCard data={output.data} onSidebarNav={onSidebarNav} />

    case "vaccination_due_list":
      return <VaccinationDueListCard data={output.data} onPillTap={onPillTap} />

    case "anc_schedule_list":
      return <ANCScheduleListCard data={output.data} onPillTap={onPillTap} />

    // -- New Text Variants ----------------------------------------------------
    case "text_step":
      return (
        <div className="space-y-[4px]">
          {output.data.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-[8px] text-[14px] text-tp-slate-700" style={{ borderLeft: "2px solid var(--tp-blue-200, #BFDBFE)", paddingLeft: "8px" }}>
              <span className="font-semibold text-tp-blue-500">{i + 1}.</span>
              <span className="leading-[1.6]">{step}</span>
            </div>
          ))}
        </div>
      )

    case "text_quote":
      return (
        <div
          className="w-full rounded-[6px] px-[10px] py-[8px] text-[14px] leading-[1.6] text-tp-slate-600 [overflow-wrap:anywhere]"
          style={{ borderLeft: "3px solid var(--tp-violet-200, #DDD6FE)" }}
        >
          {highlightClinicalText(output.data.quote)}
        </div>
      )

    case "text_comparison":
      return (
        <div className="grid grid-cols-2 gap-[1px] overflow-hidden rounded-[8px] border-[1px] border-tp-slate-100">
          <div className="bg-tp-slate-50 px-[8px] py-[6px]">
            <p className="mb-[4px] text-[14px] font-medium text-tp-slate-500">{output.data.labelA}</p>
            {output.data.itemsA.map((item, i) => (
              <p key={i} className="text-[14px] leading-[1.6] text-tp-slate-700">• {item}</p>
            ))}
          </div>
          <div className="bg-white px-[8px] py-[6px]">
            <p className="mb-[4px] text-[14px] font-medium text-tp-slate-500">{output.data.labelB}</p>
            {output.data.itemsB.map((item, i) => (
              <p key={i} className="text-[14px] leading-[1.6] text-tp-slate-700">• {item}</p>
            ))}
          </div>
        </div>
      )

    default: {
      /* A kind this build does not know, usually a newer service talking to
         an older portal. The doctor is told plainly that something came back
         and could not be drawn, rather than shown an internal type name; the
         kind rides along as a data attribute for whoever debugs it. */
      const _exhaustive = output
      return (
        <div
          data-unknown-card-kind={(_exhaustive ).kind}
          className="rounded-[10px] border-[1px] border-tp-slate-200 bg-tp-slate-50 px-[12px] py-[10px] text-[12.5px] leading-[18px] text-tp-slate-600"
        >
          This part of the answer needs a newer version of the portal. Refresh the page to see it.
        </div>
      )
    }
  }
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
