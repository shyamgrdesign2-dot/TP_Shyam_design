"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import Lottie from "lottie-react"
import chipArrowAnimation from "@/public/animations/chip-arrow-up.json"
import chevronDownLottie from "@/public/lottie/chevron-down.json"

import { cn } from "@/lib/utils"
import { useRxPadSync } from "@/components/tp-rxpad/rxpad-sync-context"
import type { HistoricalUpdateBatch, RxPadCopyPayload } from "@/components/tp-rxpad/rxpad-sync-context"

import type {
  CannedPill,
  ConsultPhase,
  DoctorViewType,
  RxAgentChatMessage,
  RxTabLens,
  SmartSummaryData,
  SpecialtyTabId,
} from "./types"
import { CONTEXT_PATIENT_ID, QUICK_CLINICAL_SNAPSHOT_PROMPT, RX_CONTEXT_OPTIONS } from "./constants"
import {
  buildQuickClinicalSnapshotInlineSuggestions,
  buildQuickClinicalSnapshotText,
  patientHasQuickClinicalSnapshotData,
} from "./shared/buildCoreNarrative"
import {
  isSituationAtGlanceAssistantMessage,
  SITUATION_AT_A_GLANCE_ASSISTANT_TEXT,
  threadAlreadyHasQuickClinicalGlance,
} from "./shared/isSituationAtGlanceMessage"
import { VoiceRxIcon } from "@/components/voicerx/voice-consult-icons"
import { SMART_SUMMARY_BY_CONTEXT } from "./mock-data"
import { generatePills } from "./engines/pill-engine"
import { generateHomepagePills } from "./engines/homepage-pill-engine"
import { inferPhase } from "./engines/phase-engine"
import { classifyIntent, PILL_INTENT_MAP } from "./engines/intent-engine"
import { buildReply, buildDocumentReply, buildPomrCardData } from "./engines/reply-engine"
import { buildHomepageReply } from "./engines/homepage-reply-engine"
import { parseVoiceToStructuredRx } from "./engines/voice-rx-engine"
import { buildPatientVoiceStructuredRx } from "./engines/voice-rx-patient-mock"

import { Hospital, User } from "iconsax-reactjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TPButton as TPButtonAgent } from "@/components/tp-ui/button-system"
import { TPSnackbar } from "@/components/tp-ui/tp-snackbar"
import { VoiceRxRecorderPanel } from "@/components/voicerx/VoiceRxRecorderPanel"
import type { VoiceConsultKind } from "@/components/voicerx/voice-consult-types"
import { VOICE_CONSULT_LABELS } from "@/components/voicerx/voice-consult-types"
import { VOICE_RX_LOADER_MS, VOICE_RX_DICTATION_CHUNKS, VOICE_RX_AMBIENT_CHUNKS } from "@/components/voicerx/voice-session-utils"
// VoiceRxLoaderCard removed — in-chat TypingIndicator now handles the loading state.
import { VoiceRxBottomSheet } from "@/components/voicerx/VoiceRxBottomSheet"
import { VoiceRxActiveAgent } from "@/components/voicerx/VoiceRxActiveAgent"
import { VoiceRxResultTabs } from "@/components/voicerx/VoiceRxResultTabs"
import { VoiceRxCanvas } from "@/components/voicerx/VoiceRxCanvas"
import { VoiceRxInPanelLoader } from "@/components/voicerx/VoiceRxInPanelLoader"
import { VoiceTranscriptProcessingCard } from "@/components/voicerx/VoiceTranscriptProcessingCard"
import { emrSectionsToHtml } from "@/components/voicerx/ClinicalNotesEditor"
import type { EmrSection as VoiceRxEmrSection } from "@/lib/voicerx-session-store"
import { VoiceStructuredRxCard } from "./cards/action/VoiceStructuredRxCard"
import { FeedbackRow } from "./cards/FeedbackRow"
import { PatientReportedCard } from "./cards/summary/PatientReportedCard"
import { SourcePill } from "./cards/SourcePill"
import type { SymptomCollectorData } from "./types"
import type { VoiceStructuredRxData } from "./types"
// VoiceRxSavingSnackbar removed — in-chat TypingIndicator supersedes it.
import { useLiveTranscript } from "@/components/voicerx/use-live-transcript"
import { AgentHeader } from "./shell/AgentHeader"
import { SessionHistoryDrawer } from "./shell/SessionHistoryDrawer"
import { PatientSelector } from "./shell/PatientSelector"
import { ChatThread } from "./chat/ChatThread"
import { PillBar } from "./chat/PillBar"
import { ChatInput } from "./chat/ChatInput"
import { AttachPanel } from "./chat/AttachPanel"
import { DocumentBottomSheet } from "./chat/DocumentBottomSheet"
import type { PatientDocument } from "./types"
import { PATIENT_DOCUMENTS } from "./mock-data"

// ═══════════════ HELPERS ═══════════════

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

/** Map intent category + query keywords to a context-aware typing indicator hint */
function getQueryHint(category: string, query: string): string {
  const q = query.toLowerCase()
  if (q.includes("interaction") || q.includes("drug")) return "Checking drug interactions"
  if (q.includes("lab") || q.includes("vital") || q.includes("trend")) return "Fetching lab results"
  if (q.includes("summary") || q.includes("snapshot") || q.includes("patient")) return "Looking up patient records"
  if (q.includes("intake") || q.includes("pre-visit")) return "Loading intake data"
  if (q.includes("ddx") || q.includes("diagnos")) return "Reviewing clinical guidelines"
  if (q.includes("investigation") || q.includes("test")) return "Reviewing investigation protocols"
  if (q.includes("document") || q.includes("report") || q.includes("upload")) return "Analyzing document"
  switch (category) {
    case "data_retrieval": return "Looking up patient records"
    case "clinical_decision": return "Reviewing clinical guidelines"
    case "clinical_question": return "Reviewing clinical data"
    case "comparison": return "Comparing clinical data"
    case "operational": return "Fetching clinic data"
    case "document_analysis": return "Analyzing document"
    case "action": return "Preparing response"
    default: return "Reviewing clinical data"
  }
}

function detectSpecialties(summary: SmartSummaryData): SpecialtyTabId[] {
  const tabs: SpecialtyTabId[] = ["gp"]
  if (summary.obstetricData) tabs.push("obstetric")
  if (summary.pediatricsData) tabs.push("pediatrics")
  if (summary.gynecData) tabs.push("gynec")
  if (summary.ophthalData) tabs.push("ophthal")
  return tabs
}

type VoiceSidebarSection = {
  sectionId: string
  title: string
  items: Array<{ name: string; detail?: string }>
}

/**
 * Highlight clinically significant phrases in a free-form summary string.
 * Returns React nodes so matched terms render as bold dark-slate text and
 * everything else stays the regular muted color. Patterns are intentionally
 * loose — chronic conditions, allergies, urgency cues — so the same helper
 * works for any patient narrative without per-patient tuning.
 */
const SUMMARY_HIGHLIGHT_PATTERNS = [
  /\bChronic Kidney Disease( Stage \w+)?\b/gi,
  /\bCKD( G\w+)?\b/gi,
  /\bType\s*2\s*Diabetes( Mellitus)?\b/gi,
  /\bHypertension\b/gi,
  /\bAllergic to [^.|—\n]+/gi,
  /\bDx:\s*[^.|—\n]+/gi,
  /\bFollow-up overdue[^.|—\n]*/gi,
] as const

/**
 * Condense a long patient snapshot into a tight 4-5 sentence quote that
 * always FITS in the card body without needing CSS truncation. Splits on
 * sentence boundaries, drops "filler" sentences (last-seen / on-meds
 * inventories), and stops once the output would push past ~360 chars or
 * the 5th sentence — whichever comes first. Never truncates mid-word.
 */
function condensePatientSnapshot(raw: string): string {
  const text = raw.trim()
  if (!text) return ""
  // Split on sentence-ending punctuation followed by a space.
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const SKIP_PATTERNS: RegExp[] = [
    /^On (Insulin|Furosemide|Amlodipine|Metformin)/i,
    /^Last seen /i,
  ]
  const MAX_SENTENCES = 4
  const MAX_CHARS = 360

  const picked: string[] = []
  for (const s of sentences) {
    if (SKIP_PATTERNS.some((re) => re.test(s))) continue
    const candidate = picked.concat(s).join(" ")
    if (candidate.length > MAX_CHARS) break
    picked.push(s)
    if (picked.length >= MAX_SENTENCES) break
  }
  return picked.join(" ") || sentences.slice(0, 2).join(" ")
}

function renderSummaryWithHighlights(text: string): React.ReactNode {
  const ranges: Array<[number, number]> = []
  for (const re of SUMMARY_HIGHLIGHT_PATTERNS) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      ranges.push([m.index, m.index + m[0].length])
    }
  }
  if (ranges.length === 0) return text
  ranges.sort((a, b) => a[0] - b[0])
  // Merge overlapping ranges
  const merged: Array<[number, number]> = []
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1]
    if (last && s <= last[1]) last[1] = Math.max(last[1], e)
    else merged.push([s, e])
  }
  const out: React.ReactNode[] = []
  let cursor = 0
  merged.forEach(([s, e], i) => {
    if (s > cursor) out.push(text.slice(cursor, s))
    out.push(
      <span key={i} className="font-semibold not-italic text-tp-slate-900">
        {text.slice(s, e)}
      </span>,
    )
    cursor = e
  })
  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

function formatVoiceSidebarItem(item: { name: string; detail?: string }) {
  return item.detail ? `${item.name}: ${item.detail}` : item.name
}

function compactVoiceLines(lines: Array<string | undefined>, limit = 6) {
  return [...new Set(lines.map((line) => String(line ?? "").trim()).filter(Boolean))].slice(0, limit)
}

type HistorySeedScope = "condition" | "allergy" | "family" | "surgical" | "lifestyle" | "additional"

function expandHistoryDurationToken(token: string) {
  const trimmed = token.trim()
  const match = trimmed.match(/^(\d+)\s*(yr|yrs|y|year|years|mo|mos|month|months|wk|wks|week|weeks|day|days)\b/i)
  if (!match) return trimmed

  const value = match[1]
  const unit = match[2].toLowerCase()
  const singular = value === "1"

  if (unit.startsWith("yr") || unit === "y") return `${value} ${singular ? "year" : "years"}`
  if (unit.startsWith("mo")) return `${value} ${singular ? "month" : "months"}`
  if (unit.startsWith("wk")) return `${value} ${singular ? "week" : "weeks"}`
  return `${value} ${singular ? "day" : "days"}`
}

function normalizeHistoryFacet(token: string) {
  const trimmed = token.trim().replace(/\.$/, "")
  if (!trimmed) return ""
  if (/^on\s+/i.test(trimmed)) return trimmed.replace(/^on\s+/i, "On ")
  if (/^(active|inactive|resolved|occasional|vegetarian|sedentary|non-smoker|no alcohol)$/i.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }
  return expandHistoryDurationToken(trimmed)
}

function splitHistorySeed(raw: string) {
  const trimmed = raw.trim()
  const match = trimmed.match(/^([^()]+?)(?:\(([^)]+)\))?$/)
  const subject = (match?.[1] ?? trimmed).trim()
  const facets = (match?.[2] ?? "")
    .split(",")
    .map((part) => normalizeHistoryFacet(part))
    .filter(Boolean)

  return { subject, facets }
}

function normalizeHistorySubject(subject: string, scope: HistorySeedScope) {
  const lower = subject.trim().toLowerCase()

  if (scope === "condition") {
    if (/\b(type\s*2\s*)?diabetes|dm\b/.test(lower)) return "Type 2 Diabetes"
    if (/\bhypertension|high blood pressure|htn\b/.test(lower)) return "Hypertension"
    if (/\bdyslipidemia|dyslipidaemia|hyperlipidemia|cholesterol\b/.test(lower)) return "Dyslipidemia"
    if (/\bthyroid|hypothyroid|hyperthyroid\b/.test(lower)) return "Thyroid disorder"
  }

  if (scope === "allergy") {
    if (/\bdust\b/.test(lower)) return "Dust"
    if (/\bibuprofen\b/.test(lower)) return "Ibuprofen"
  }

  if (scope === "family") {
    if (/\bdiabetes\b/.test(lower)) return "Diabetes Mellitus"
    if (/\bhypertension\b/.test(lower)) return "Hypertension"
    if (/\bthyroid\b/.test(lower)) return "Thyroid disorder"
  }

  if (scope === "lifestyle") {
    if (/\bsmok/i.test(lower)) return "Smoking"
    if (/\balcohol|drink/i.test(lower)) return "Alcohol"
    if (/\bdiet|meal/i.test(lower)) return "Diet"
  }

  if (scope === "additional" && /\bdiet|meal/i.test(lower)) {
    return "Diet"
  }

  return subject.trim()
}

function normalizeFamilyFacet(detail: string) {
  return detail
    .replace(/\bmom\b/gi, "Mother")
    .replace(/\bdad\b/gi, "Father")
    .replace(/\baunt\b/gi, "Aunt")
    .replace(/\buncle\b/gi, "Uncle")
}

function buildHistorySeedUpdate(raw: string, scope: HistorySeedScope) {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  const { subject, facets } = splitHistorySeed(trimmed)
  const normalizedSubject = normalizeHistorySubject(subject, scope)
  let normalizedFacets = [...facets]

  if (scope === "family") {
    normalizedFacets = normalizedFacets.map(normalizeFamilyFacet)
  }

  if (scope === "allergy" && !normalizedFacets.length) {
    if (normalizedSubject === "Dust") normalizedFacets = ["3 years", "Active"]
    if (normalizedSubject === "Ibuprofen") normalizedFacets = ["5 years", "Active", "Gastric intolerance"]
  }

  if (scope === "lifestyle" && !normalizedFacets.length) {
    if (normalizedSubject === "Smoking") normalizedFacets = ["2 years", "Active"]
    if (normalizedSubject === "Alcohol") normalizedFacets = ["Occasional", "Active"]
  }

  if (scope === "additional" && normalizedSubject === "Diet" && !normalizedFacets.length) {
    normalizedFacets = ["Mixed diet", "Irregular meal timing during work shifts"]
  }

  const detail = scope === "family" ? normalizedFacets.join(", ") : normalizedFacets.join(" | ")
  return detail ? `${normalizedSubject}: ${detail}` : normalizedSubject
}

function normalizeLabSeedLabel(label: string) {
  const lower = label.trim().toLowerCase()
  if (lower === "fasting glucose" || lower === "blood sugar") return "Glucose"
  if (lower === "cholesterol total") return "Cholesterol, Total"
  return label.trim()
}

function buildLabSeedLine(lab: { name: string; value: string; unit?: string }) {
  const normalizedLabel = normalizeLabSeedLabel(lab.name)
  const value = String(lab.value ?? "").trim()
  if (!normalizedLabel || !value) return undefined
  const unit = String(lab.unit ?? "").trim()
  const flag = "flag" in lab ? String((lab as { flag?: string }).flag ?? "").trim().toLowerCase() : ""
  const unitPart = unit ? ` (${unit})` : ""
  const flagPart = flag && flag !== "normal" ? ` [${flag}]` : ""
  return `${normalizedLabel}${unitPart}${flagPart}: ${value}`
}

function buildVoiceConsultSidebarBatch(
  patientId: string,
  transcript: string,
  structured: { sections: VoiceSidebarSection[]; copyAllPayload: RxPadCopyPayload },
): HistoricalUpdateBatch {
  const batch: HistoricalUpdateBatch = {}
  const stamp = Date.now()
  const summary = SMART_SUMMARY_BY_CONTEXT[patientId] ?? SMART_SUMMARY_BY_CONTEXT[CONTEXT_PATIENT_ID]
  const corpus = [
    transcript,
    ...structured.sections.flatMap((section) =>
      section.items.map((item) => [item.name, item.detail].filter(Boolean).join(" ")),
    ),
    structured.copyAllPayload.additionalNotes ?? "",
    structured.copyAllPayload.followUpNotes ?? structured.copyAllPayload.followUp ?? "",
  ]
    .filter(Boolean)
    .join(" . ")

  const add = (sectionId: keyof HistoricalUpdateBatch & string, bullets: Array<string | undefined>) => {
    const cleaned = [...new Set(bullets.map((line) => String(line ?? "").trim()).filter(Boolean))]
    if (!cleaned.length) return
    batch[sectionId] = [{ id: `voice-${sectionId}-${stamp}`, bullets: cleaned }]
  }

  const takeSectionItems = (matcher: RegExp) =>
    structured.sections
      .filter((section) => matcher.test(section.sectionId) || matcher.test(section.title))
      .flatMap((section) => section.items.map(formatVoiceSidebarItem))

  const symptomLines = takeSectionItems(/symptom/i)
  const examinationLines = takeSectionItems(/exam/i)
  const diagnosisLines = takeSectionItems(/diagnos/i)
  const adviceLines = takeSectionItems(/advice/i)
  const historyLines = compactVoiceLines([
    ...(structured.copyAllPayload.historyChangeSummaries ?? []),
    ...(summary.chronicConditions ?? []).slice(0, 2).map((line) => buildHistorySeedUpdate(line, "condition")),
    ...(summary.allergies ?? []).slice(0, 1).map((line) => buildHistorySeedUpdate(line, "allergy")),
    ...(summary.familyHistory ?? []).slice(0, 2).map((line) => buildHistorySeedUpdate(line, "family")),
    ...(summary.surgicalHistory ?? []).slice(0, 1).map((line) => buildHistorySeedUpdate(line, "surgical")),
    ...(summary.lifestyleNotes ?? []).slice(0, 2).map((line) => buildHistorySeedUpdate(line, "lifestyle")),
    ...(summary.additionalHistory ?? []).slice(0, 1).map((line) => buildHistorySeedUpdate(line, "additional")),
  ], 8)

  const vitals: string[] = []
  const bpMatch = corpus.match(/\b(?:bp|blood pressure)\s*(?:is|was|of)?\s*(\d{2,3})\s*(?:\/|by)\s*(\d{2,3})/i)
  if (bpMatch) vitals.push(`BP ${bpMatch[1]}/${bpMatch[2]}`)
  const pulseMatch = corpus.match(/\b(?:pulse|heart rate|hr)\s*(?:is|was|of)?\s*(\d{2,3})\b/i)
  if (pulseMatch) vitals.push(`Pulse ${pulseMatch[1]}/min`)
  const spo2Match = corpus.match(/\b(?:spo2|o2 sat(?:uration)?|oxygen saturation)\s*(?:is|was|of)?\s*(\d{2,3})\s*%?/i)
  if (spo2Match) vitals.push(`SpO2 ${spo2Match[1]}%`)
  const rrMatch = corpus.match(/\b(?:rr|resp(?:iratory)?(?:\s+rate)?)\s*(?:is|was|of)?\s*(\d{1,2})\b/i)
  if (rrMatch) vitals.push(`Resp. rate ${rrMatch[1]}/min`)
  const weightMatch = corpus.match(/\bweight\s*(?:is|was|of)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs?)\b/i)
  if (weightMatch) vitals.push(`Weight ${weightMatch[1]} kg`)
  const tempMatch = corpus.match(/\b(?:temp|temperature)\s*(?:is|was|of)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:°?\s*[fc])?/i)
  if (tempMatch) vitals.push(`Temperature ${tempMatch[1]}`)
  if (!vitals.length && summary.todayVitals) {
    if (summary.todayVitals.bp) vitals.push(`BP ${summary.todayVitals.bp}`)
    if (summary.todayVitals.pulse) vitals.push(`Pulse ${summary.todayVitals.pulse}/min`)
    if (summary.todayVitals.spo2) vitals.push(`SpO2 ${summary.todayVitals.spo2}%`)
    if (summary.todayVitals.temp) vitals.push(`Temperature ${summary.todayVitals.temp}`)
    if (summary.todayVitals.rr) vitals.push(`Resp. rate ${summary.todayVitals.rr}/min`)
    if (summary.todayVitals.weight) vitals.push(`Weight ${summary.todayVitals.weight} kg`)
  }
  add("vitals", ["Voice consultation", ...vitals])
  add("history", ["Voice consultation", ...historyLines])
  add("labResults", [
    "Voice consultation",
    ...(summary.keyLabs ?? []).slice(0, 5).map((lab) => buildLabSeedLine(lab)),
  ])

  const lowerCorpus = corpus.toLowerCase()
  const isGynec =
    patientId === "apt-lakshmi" ||
    /(lmp|menstrual|menses|bleeding|cycle|pcos|pap smear|flow|pads\/day|gynec)/i.test(lowerCorpus)
  const gynecLines = compactVoiceLines([
    ...symptomLines.slice(0, 2),
    ...diagnosisLines.slice(0, 1),
    adviceLines[0],
    summary.gynecData?.lmp ? `LMP: ${summary.gynecData.lmp}` : undefined,
    summary.gynecData?.menarche ? `Age at: ${summary.gynecData.menarche}` : undefined,
    summary.gynecData?.cycleRegularity || summary.gynecData?.cycleLength
      ? `Cycle: ${[summary.gynecData.cycleRegularity, summary.gynecData.cycleLength].filter(Boolean).join(" | ")}`
      : undefined,
    summary.gynecData?.flowIntensity || summary.gynecData?.flowDuration || summary.gynecData?.padsPerDay
      ? `Flow: ${[
          summary.gynecData.flowIntensity,
          summary.gynecData.flowDuration,
          summary.gynecData.padsPerDay ? `Pads/day ${summary.gynecData.padsPerDay}` : undefined,
        ]
          .filter(Boolean)
          .join(" | ")}`
      : undefined,
    summary.gynecData?.painScore ? `Pain: ${summary.gynecData.painScore}` : undefined,
    summary.gynecData?.alerts?.[0],
    structured.copyAllPayload.followUpNotes ? `Follow-up: ${structured.copyAllPayload.followUpNotes}` : undefined,
    structured.copyAllPayload.additionalNotes,
  ])
  if (isGynec) {
    add("gynec", [
      "Voice consultation",
      ...gynecLines,
    ])
  }

  const isObstetric =
    patientId === "apt-priya" ||
    /(pregnan|gestation|anc|fetal|gravida|edd|kick count|cephalic|fundus height|obstetric)/i.test(lowerCorpus)
  const obstetricLines = compactVoiceLines([
    ...symptomLines.slice(0, 2),
    ...examinationLines.slice(0, 2),
    ...diagnosisLines.slice(0, 1),
    adviceLines[0],
    summary.obstetricData?.lmp ? `LMP: ${summary.obstetricData.lmp}` : undefined,
    summary.obstetricData?.edd ? `EDD: ${summary.obstetricData.edd}` : undefined,
    summary.obstetricData?.gestationalWeeks ? `Gestation: ${summary.obstetricData.gestationalWeeks}` : undefined,
    summary.obstetricData?.bpLatest ? `BP: ${summary.obstetricData.bpLatest}` : undefined,
    summary.obstetricData?.fundusHeight ? `Fundus Height: ${summary.obstetricData.fundusHeight}` : undefined,
    summary.obstetricData?.presentation ? `Presentation: ${summary.obstetricData.presentation}` : undefined,
    summary.obstetricData?.ancDue?.[0],
    structured.copyAllPayload.followUpNotes ? `Follow-up: ${structured.copyAllPayload.followUpNotes}` : undefined,
    structured.copyAllPayload.additionalNotes,
  ])
  if (isObstetric) {
    add("obstetric", [
      "Voice consultation",
      ...obstetricLines,
    ])
  }

  if (structured.copyAllPayload.additionalNotes?.trim()) {
    add("personalNotes", [structured.copyAllPayload.additionalNotes.trim()])
  }

  return batch
}

function buildIntroMessages(
  summary: SmartSummaryData,
  patient: typeof RX_CONTEXT_OPTIONS[0],
  _doctorViewType?: DoctorViewType,
  intakeMode: "with_intake" | "without_intake" = "with_intake",
  panelMode: "rxpad" | "homepage" = "homepage",
): RxAgentChatMessage[] {
  const hasData = summary.specialtyTags.length > 0
  const messages: RxAgentChatMessage[] = []

  // ── RxPad mode: open directly into quick snapshot when chart data exists (same card as Appointments AI icon)
  if (panelMode === "rxpad") {
    if (!patientHasQuickClinicalSnapshotData(summary)) {
      return messages
    }
    const quote = buildQuickClinicalSnapshotText(summary)
    messages.push({
      id: uid(),
      role: "assistant",
      text: SITUATION_AT_A_GLANCE_ASSISTANT_TEXT,
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "text_quote", data: { quote, source: "" } },
      feedbackGiven: null,
      suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "full"),
    })
    return messages
  }

  // ── Homepage mode WITH specific patient: situation at a glance (not full SBAR narrative) ──
  if (panelMode === "homepage" && hasData) {
    const quote = buildQuickClinicalSnapshotText(summary)
    messages.push({
      id: uid(),
      role: "assistant",
      text: SITUATION_AT_A_GLANCE_ASSISTANT_TEXT,
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "text_quote", data: { quote, source: "" } },
      feedbackGiven: null,
      suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "full"),
    })
    return messages
  }

  // ── Homepage mode WITHOUT patient data: no messages, WelcomeScreen handles ──
  if (panelMode === "homepage") {
    return messages
  }

  // ── Homepage / Appointment page intro flow ──
  //
  // With intake:
  //   Single message → Intake card (already includes quick snapshot via patientNarrative)
  //
  // Without intake:
  //   Single message → Quick historical snapshot (patient_narrative)
  //
  // No data:
  //   Single message → New patient text
  //
  const showIntake = intakeMode === "with_intake" && !!summary.symptomCollectorData

  if (showIntake) {
    // Intake card — includes quick snapshot inside via patientNarrative
    messages.push({
      id: uid(),
      role: "assistant",
      text: `${patient.label}'s details reported by patient via Symptom Collector:`,
      createdAt: new Date().toISOString(),
      rxOutput: {
        kind: "symptom_collector",
        data: {
          ...summary.symptomCollectorData!,
          patientNarrative: summary.patientNarrative,
        },
      },
      feedbackGiven: null,
    })
  } else if (hasData) {
    // No intake — show quick historical snapshot
    messages.push({
      id: uid(),
      role: "assistant",
      text: `Quick snapshot for ${patient.label}:`,
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "patient_narrative", data: summary },
      feedbackGiven: null,
    })
  } else {
    messages.push({
      id: uid(),
      role: "assistant",
      text: `${patient.label} — new patient, first visit. No prior records yet.`,
      createdAt: new Date().toISOString(),
      feedbackGiven: null,
    })
  }

  return messages
}

// ═══════════════ STATIC PATIENT INFO STRIP ═══════════════

function StaticPatientStrip({ selectedPatientId }: { selectedPatientId: string }) {
  const selected =
    RX_CONTEXT_OPTIONS.find((o) => o.id === selectedPatientId) ??
    RX_CONTEXT_OPTIONS[0]

  const genderLabel = selected?.gender === "M" ? "M" : selected?.gender === "F" ? "F" : ""
  const ageLabel = selected?.age ? `${selected.age}y` : ""
  const metaParts = [genderLabel, ageLabel].filter(Boolean).join(", ")

  return (
    <div className="sticky top-0 z-10 flex justify-center pb-1 pt-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/55 px-2.5 py-1 text-[14px] font-medium text-tp-slate-600 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.5)] backdrop-blur-md">
        {selected?.label}
        {metaParts && <span className="text-tp-slate-400">· {metaParts}</span>}
      </span>
    </div>
  )
}

// ═══════════════ MAIN COMPONENT ═══════════════

interface DrAgentPanelProps {
  onClose: () => void
  /** Re-open the panel — used by the VoiceRx mini-fab to ask the host to slide the panel back in. */
  onOpen?: () => void
  /** Whether the host has the panel currently visible. The VoiceRx active agent reads this
   *  to decide whether to render the full view or a portaled mini controller. */
  isPanelVisible?: boolean
  /** Override the default patient — used when embedding in appointment page */
  initialPatientId?: string
  /** "homepage" mode enables operational queries and homepage pills */
  mode?: "rxpad" | "homepage"
  /** Active tab on homepage — used for pill generation */
  activeTab?: string
  /** Active rail item on homepage (e.g. "follow-ups", "pharmacy") */
  activeRailItem?: string
  /** Homepage patient list — mapped from queue appointments */
  homepagePatients?: import("./types").RxContextOption[]
  /** Auto-send a message when the panel opens (e.g. from tooltip CTA). Incremented counter triggers re-send. */
  autoMessage?: string
  /** Counter to re-trigger autoMessage even with same text */
  autoMessageTrigger?: number
  /** Counter to force patient context re-sync from parent */
  patientSwitchTrigger?: number
  /** Fires when an assistant reply is shown for a patient (appointment-row hover unlock) */
  onSnapshotDelivered?: (patientId: string) => void
  /** When set (e.g. Appointments page), chat threads survive panel close — parent owns the map */
  persistedMessagesByPatient?: Record<string, RxAgentChatMessage[]>
  onPersistedMessagesChange?: Dispatch<SetStateAction<Record<string, RxAgentChatMessage[]>>>
  /** In-visit VoiceRx: full agent UI + VoiceRx capture flow and branded header/input */
  voiceRxMode?: boolean
  /** Fires when consultation capture mode starts/stops (for Rx pad top-nav pill). */
  onVoiceCaptureModeChange?: (mode: VoiceConsultKind | null) => void
  /** Gradient header title override (e.g. VoiceRx) */
  headerBrandTitle?: string
  /** When true, skip the welcome screen and auto-open the voice mode
   *  bottom sheet on first render (Scenario 1: no symptom collector data). */
  autoOpenBottomSheet?: boolean
}

const HOMEPAGE_COMMON_ID = "__homepage_common__"

const VOICE_RX_CONSULT_OPTIONS: { value: VoiceConsultKind; description: string }[] = [
  {
    value: "ambient_consultation",
    description: "Capture live doctor–patient conversation in the room.",
  },
  {
    value: "dictation_consultation",
    description: "You dictate clinical content; optimized for solo narration.",
  },
]

export function DrAgentPanel({
  onClose,
  onOpen,
  isPanelVisible = true,
  initialPatientId,
  mode = "rxpad",
  activeTab,
  activeRailItem,
  homepagePatients,
  autoMessage,
  autoMessageTrigger,
  patientSwitchTrigger,
  onSnapshotDelivered,
  persistedMessagesByPatient,
  onPersistedMessagesChange,
  voiceRxMode = false,
  onVoiceCaptureModeChange,
  headerBrandTitle,
  autoOpenBottomSheet = false,
}: DrAgentPanelProps) {
  // ── Patient Context ──
  // In homepage mode with no patient, use a special common ID for operational context
  const effectiveDefaultId = (mode === "homepage" && !initialPatientId) ? HOMEPAGE_COMMON_ID : (initialPatientId ?? CONTEXT_PATIENT_ID)
  const [selectedPatientId, setSelectedPatientId] = useState(effectiveDefaultId)

  // Sync when initialPatientId changes from parent (appointment page)
  useEffect(() => {
    if (mode === "homepage" && !initialPatientId) {
      if (selectedPatientId !== HOMEPAGE_COMMON_ID) {
        setSelectedPatientId(HOMEPAGE_COMMON_ID)
      }
    } else if (initialPatientId) {
      setSelectedPatientId(initialPatientId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatientId, mode, patientSwitchTrigger])

  // ── Per-Patient State (keyed by patient ID; lifted to parent when onPersistedMessagesChange is set) ──
  const [internalMessagesByPatient, setInternalMessagesByPatient] = useState<Record<string, RxAgentChatMessage[]>>({})
  const isMessagesPersisted = onPersistedMessagesChange != null
  const messagesByPatient = isMessagesPersisted ? (persistedMessagesByPatient ?? {}) : internalMessagesByPatient
  const setMessagesByPatient = useCallback(
    (u: SetStateAction<Record<string, RxAgentChatMessage[]>>) => {
      if (onPersistedMessagesChange) {
        onPersistedMessagesChange(u)
      } else {
        setInternalMessagesByPatient(u)
      }
    },
    [onPersistedMessagesChange],
  )
  const [phaseByPatient, setPhaseByPatient] = useState<Record<string, ConsultPhase>>({})

  // ── UI State ──
  const [activeSpecialty, setActiveSpecialty] = useState<SpecialtyTabId>("gp")
  const [activeTabLens] = useState<RxTabLens>("dr-agent")
  const [doctorViewType, setDoctorViewType] = useState<DoctorViewType>("specialist_first_visit")
  const [intakeMode, setIntakeMode] = useState<"with_intake" | "without_intake">("with_intake")
  const [inputValue, setInputValue] = useState("")
  const [isPrefilled, setIsPrefilled] = useState(false)
  const [isPatientSheetOpen, setIsPatientSheetOpen] = useState(false)
  /** Right-side drawer triggered by the brand-pill kebab → "View session history". */
  const [isSessionHistoryOpen, setIsSessionHistoryOpen] = useState(false)
  const [chipShaking, setChipShaking] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingHint, setTypingHint] = useState("")
  const [showAttachPanel, setShowAttachPanel] = useState(false)
  const [showDocBottomSheet, setShowDocBottomSheet] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [voiceRxDialogOpen, setVoiceRxDialogOpen] = useState(false)
  const autoOpenedRef = useRef(false)
  const scFlowStartedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (autoOpenBottomSheet && isPanelVisible && voiceRxMode && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      const timer = setTimeout(() => setVoiceRxDialogOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [autoOpenBottomSheet, isPanelVisible, voiceRxMode])
  const [voiceRxDialogChoice, setVoiceRxDialogChoice] = useState<VoiceConsultKind>("ambient_consultation")
  const [voiceRxRecording, setVoiceRxRecording] = useState(false)
  /** Scripted-demo transcript — used only as a fallback when the browser has no Web Speech API. */
  const [voiceRxScriptedTranscript, setVoiceRxScriptedTranscript] = useState("")
  const [voiceRxAwaitingResponse, setVoiceRxAwaitingResponse] = useState(false)
  /**
   * When the user clicks Back on the 3-tab result view, we don't WIPE
   * the result — we minimise it. The chat then shows the new
   * "Conversation Mode" card; clicking the expand icon on that card
   * sets minimised back to false and the panel flips back into the
   * 3-tab view it was in before, with all state preserved.
   */
  const [voiceRxResultMinimized, setVoiceRxResultMinimized] = useState(false)
  /**
   * `voiceRxHandoffExiting` is briefly true (≈320ms) at the moment we
   * cross from "shiner card with loader" to "result tabs". Lets us
   * play a coordinated exit (shiner slides UP + fades out) BEFORE the
   * panel hard-swaps to VoiceRxResultTabs, which then slides in from
   * the top. Without this gate the swap reads as a single-frame jump
   * and the user perceives a glitch.
   */
  const [voiceRxHandoffExiting, setVoiceRxHandoffExiting] = useState(false)
  // Post-submit result panel — when set, the back face shows the 3-tab
  // result view (Transcript / TP EMR / Clinical Notes) instead of the
  // recorder. "Back to chat" clears this and flips the panel back.
  const [voiceRxResult, setVoiceRxResult] = useState<{
    transcript: string
    sections: VoiceRxEmrSection[]
    clinicalNotesHtml: string
    durationMs: number
    structured: VoiceStructuredRxData
    modeLabel: string
    /** Sidebar (vitals / history) updates derived from this voice
     *  session, *deferred* until the doctor explicitly hits Copy to
     *  EMR. Submitting the recording shouldn't side-effect the rest of
     *  the page — only the structured Rx card preview shows up. */
    pendingSidebarBatch?: HistoricalUpdateBatch
  } | null>(null)
  const voiceRxStreamIdx = useRef(0)
  const voiceRxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Active agent lifts its paused state here so the scripted transcript can also pause. */
  const voiceRxPausedRef = useRef(false)
  const [voiceRxPaused, setVoiceRxPaused] = useState(false)
  const handleVoiceRxPauseChange = useCallback((paused: boolean) => {
    voiceRxPausedRef.current = paused
    setVoiceRxPaused(paused)
  }, [])

  // ── Listen for VoiceRx expand events from chat cards ──
  // The Conversation Mode card on the chat fires "open-voicerx" when
  // the doctor taps its expand icon. If we already have a cached
  // result we just unminimise it (preserves transcript / tabs / scroll
  // position). Otherwise — defensive path for cards seeded from
  // elsewhere — we synthesise a minimal result so the panel can flip.
  useEffect(() => {
    const handleOpen = (e: Event) => {
      setVoiceRxResultMinimized(false)
      setVoiceRxResult((prev) => {
        if (prev) return prev
        const customEvent = e as CustomEvent
        const data = customEvent.detail?.data
        if (!data) return prev
        return {
          transcript: "",
          sections: data.sections,
          clinicalNotesHtml: emrSectionsToHtml(data.sections.map((s: { sectionId: string; title: string; items: { name: string; detail?: string }[] }) => ({ id: s.sectionId, title: s.title, items: s.items.map((it) => (it.detail ? `${it.name} — ${it.detail}` : it.name)) }))),
          durationMs: 0,
          structured: data,
          modeLabel: data.modeLabel || "Conversation Mode",
        }
      })
      setVoiceRxRecording(false)
    }
    window.addEventListener("open-voicerx", handleOpen)
    return () => window.removeEventListener("open-voicerx", handleOpen)
  }, [])

  // ── Real live transcription via Web Speech API (free, browser-native) ──
  const {
    transcript: liveFinal,
    interim: liveInterim,
    isSupported: liveSupported,
    reset: resetLiveTranscript,
  } = useLiveTranscript({ enabled: !!voiceRxMode && voiceRxRecording, paused: voiceRxPaused })

  /** What the active agent actually renders — prefers real speech, falls back to the scripted
   *  demo when the browser can't transcribe. Interim words render with the finalised text so the
   *  doctor sees each syllable as they speak it. */
  const voiceRxLiveTranscript = useMemo(() => {
    if (liveSupported) {
      return [liveFinal, liveInterim].filter(Boolean).join(liveFinal && liveInterim ? " " : "")
    }
    return voiceRxScriptedTranscript
  }, [liveSupported, liveFinal, liveInterim, voiceRxScriptedTranscript])

  // ── Integration ──
  const { requestCopyToRxPad, lastSignal, publishSignal, setPatientAllergies, setAiFillInProgress, pushHistoricalUpdates, activeVoiceModule, runCopyWithAura } = useRxPadSync()
  const lastSignalIdRef = useRef<number>(0)

  // Scripted fallback — only when the browser can't do real live transcription.
  useEffect(() => {
    if (!voiceRxMode || !voiceRxRecording) return
    if (liveSupported) return
    voiceRxStreamIdx.current = 0
    voiceRxPausedRef.current = false
    setVoiceRxScriptedTranscript("")
    // Pick scripted chunks per mode: ambient = Doctor/Patient turns,
    // dictation = single-voice clinical narration.
    const chunks =
      voiceRxDialogChoice === "ambient_consultation"
        ? VOICE_RX_AMBIENT_CHUNKS
        : VOICE_RX_DICTATION_CHUNKS
    const iv = window.setInterval(() => {
      if (voiceRxPausedRef.current) return
      const i = voiceRxStreamIdx.current
      if (i >= chunks.length) return
      setVoiceRxScriptedTranscript((t) => t + chunks[i])
      voiceRxStreamIdx.current = i + 1
    }, 700)
    return () => window.clearInterval(iv)
  }, [voiceRxMode, voiceRxRecording, liveSupported, voiceRxDialogChoice])

  // Fresh slate each new recording — clears any text left from a prior session.
  useEffect(() => {
    if (!voiceRxRecording) return
    setVoiceRxScriptedTranscript("")
    resetLiveTranscript()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceRxRecording])

  const needsSnapshotSeedRef = useRef(false)

  // Surfaced when the user tries to start the full Dr. Agent voice
  // consultation while a per-Rx-module (or per-sidebar-section) inline
  // recorder is already running. We can't run two voice sessions in
  // parallel, so we nudge the clinician to close the module recorder
  // first instead of silently ignoring the click.
  const [blockedVoiceToast, setBlockedVoiceToast] = useState<string | null>(null)

  const confirmVoiceRxConsult = useCallback(() => {
    // Guard against starting a full-panel consultation while an inline
    // per-module / per-sidebar recorder is already running. Shared state
    // lives in the rxpad-sync context; the tooltip on hover uses the
    // same signal so the click + hover paths agree.
    if (activeVoiceModule) {
      setBlockedVoiceToast(
        `VoiceRx is already active in ${activeVoiceModule}. Please close that dictation before starting a full consultation.`,
      )
      setVoiceRxDialogOpen(false)
      return
    }
    onVoiceCaptureModeChange?.(voiceRxDialogChoice)
    setVoiceRxDialogOpen(false)
    // Starting a fresh consultation clears any previously generated
    // structured Rx — the doctor explicitly chose dictate/ambient again,
    // so we should drop them straight into the recorder, not flip back
    // into the old result tabs. They can still copy/edit on the RxPad
    // independently; this CTA is for capturing a NEW Rx.
    setVoiceRxResult(null)
    setVoiceRxResultMinimized(false)
    setVoiceRxScriptedTranscript("")
    resetLiveTranscript()
    setVoiceRxAwaitingResponse(false)
    setVoiceRxRecording(true)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [],
    }))
  }, [voiceRxDialogChoice, onVoiceCaptureModeChange, selectedPatientId, setMessagesByPatient, activeVoiceModule, resetLiveTranscript])

  const cancelVoiceRxRecording = useCallback(() => {
    if (voiceRxTimeoutRef.current) {
      clearTimeout(voiceRxTimeoutRef.current)
      voiceRxTimeoutRef.current = null
    }
    setVoiceRxRecording(false)
    setVoiceRxScriptedTranscript("")
    resetLiveTranscript()
    setVoiceRxAwaitingResponse(false)
    setAiFillInProgress(false)
    onVoiceCaptureModeChange?.(null)
  }, [onVoiceCaptureModeChange, setAiFillInProgress, resetLiveTranscript])

  const submitVoiceRxRecording = useCallback((meta?: { durationMs: number }) => {
    const transcript = voiceRxLiveTranscript.trim()
    if (!transcript) {
      setVoiceRxRecording(false)
      onVoiceCaptureModeChange?.(null)
      return
    }

    // For the DEMO, always echo the curated scripted transcript into
    // chat so the transcript card can reliably render its mode-specific
    // UI: Doctor/Patient alternating bubbles for ambient, single-voice
    // clinical paragraph for dictation. Live speech recognition may have
    // produced fragmented text without "Doctor:" / "Patient:" markers;
    // those can't drive the conversation bubbles, so we substitute the
    // matching scripted content here.
    const demoTranscript =
      voiceRxDialogChoice === "ambient_consultation"
        ? VOICE_RX_AMBIENT_CHUNKS.join("").trim()
        : VOICE_RX_DICTATION_CHUNKS.join("").trim()

    // 1. Echo user transcript into chat (label + quoted body via voiceTranscript).
    //    Attach the mode (ambient vs dictation) and the elapsed duration so
    //    ChatBubble can render the new transcript card with header + timer
    //    and a mode-aware body (Doctor/Patient turns for ambient, plain
    //    paragraph for dictation).
    const userMsg: RxAgentChatMessage = {
      id: uid(),
      role: "user",
      text: demoTranscript,
      voiceTranscript: demoTranscript,
      voiceMode: voiceRxDialogChoice ?? undefined,
      voiceDurationMs: meta?.durationMs,
      createdAt: new Date().toISOString(),
      feedbackGiven: null,
      // Flag picked up by ChatThread to play the slide-up-from-bottom animation.
      voiceEntryAnimation: true,
    }
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))

    // 2. Exit recording mode; start processing state — the in-panel loader
    //    on the back face takes over (no fullscreen overlay anymore so the
    //    user stays inside the agent panel through the whole flow).
    setVoiceRxRecording(false)
    setVoiceRxScriptedTranscript("")
    resetLiveTranscript()
    setVoiceRxAwaitingResponse(true)
    onVoiceCaptureModeChange?.(null)

    // 3. After simulated processing delay, push a human-like text message + structured card + fill RxPad.
    //    We use a PATIENT-SPECIFIC mock (keyed by patientId) so each demo patient gets a
    //    consistent, curated consultation summary that matches their clinical picture —
    //    instead of running heuristic keyword extraction over the scripted transcript.
    voiceRxTimeoutRef.current = setTimeout(() => {
      const parsedVoice = parseVoiceToStructuredRx(transcript)
      const structured = buildPatientVoiceStructuredRx(selectedPatientId, transcript)
      if (parsedVoice.copyAllPayload.historyChangeSummaries?.length) {
        structured.copyAllPayload.historyChangeSummaries = [
          ...new Set([
            ...(structured.copyAllPayload.historyChangeSummaries ?? []),
            ...parsedVoice.copyAllPayload.historyChangeSummaries,
          ]),
        ]
      }
      const cardMsg: RxAgentChatMessage = {
        id: uid(),
        role: "assistant",
        text: "Your clinical notes are ready — view your clinical notes to review, fine-tune, and copy them to the RxPad.",
        createdAt: new Date().toISOString(),
        rxOutput: { kind: "voice_structured_rx", data: structured },
        feedbackGiven: null,
      }
      setMessagesByPatient((prev) => {
        const existing = prev[selectedPatientId] || []
        return { ...prev, [selectedPatientId]: [...existing, cardMsg] }
      })
      // INTENTIONALLY no side-effects on submit — neither the RxPad
      // nor the sidebar (vitals / history) get auto-filled. The doctor
      // reviews the structured Rx card on the back face first, then
      // explicitly hits Copy to EMR to fan the data out. The sidebar
      // batch is computed now (so the result carries it), but
      // *deferred* on `pendingSidebarBatch` until the copy click.
      const sidebarBatch = buildVoiceConsultSidebarBatch(selectedPatientId, transcript, structured)
      const pendingSidebarBatch = Object.keys(sidebarBatch).length ? sidebarBatch : undefined

      // Populate the result-tabs view: convert the structured rx sections
      // into the simpler {title, items[]} shape the tabs expect, and seed
      // the Clinical Notes editor with the same content as <h3> + <ul>.
      const resultSections: VoiceRxEmrSection[] = structured.sections.map((s) => ({
        id: s.sectionId,
        title: s.title,
        items: s.items.map((it) => (it.detail ? `${it.name} — ${it.detail}` : it.name)),
      }))
      // For the demo, the result-tabs Transcript pane mirrors the same
      // scripted conversation that the shiner card animates in — so the
      // doctor sees the same Doctor/Patient turns they just watched
      // morph in the active-agent panel, not the raw recording.
      // Direct hand-off — no exit animation on the shiner. The
      // result-tabs view mounts in place, which feels smoother than
      // the previous staged 320ms slide-up + remount.
      setVoiceRxHandoffExiting(false)
      setVoiceRxResultMinimized(false)
      setVoiceRxResult({
        transcript: demoTranscript,
        sections: resultSections,
        clinicalNotesHtml: emrSectionsToHtml(resultSections),
        durationMs: meta?.durationMs ?? 0,
        structured,
        modeLabel: voiceRxDialogChoice === "dictation_consultation" ? "Dictation Mode" : "Conversation Mode",
        pendingSidebarBatch,
      })
      setVoiceRxAwaitingResponse(false)
      voiceRxTimeoutRef.current = null
    }, VOICE_RX_LOADER_MS)
  }, [
    voiceRxLiveTranscript,
    selectedPatientId,
    setMessagesByPatient,
    onVoiceCaptureModeChange,
    setAiFillInProgress,
    requestCopyToRxPad,
    pushHistoricalUpdates,
  ])

  // Cleanup any pending simulated response on unmount
  useEffect(() => {
    return () => {
      if (voiceRxTimeoutRef.current) {
        clearTimeout(voiceRxTimeoutRef.current)
        voiceRxTimeoutRef.current = null
      }
      setAiFillInProgress(false)
    }
  }, [setAiFillInProgress])

  // Custom events for external sticky fab control
  useEffect(() => {
    const handleRemoteSubmit = () => submitVoiceRxRecording();
    const handleRemoteCancel = () => cancelVoiceRxRecording();
    window.addEventListener("voicerx:submit", handleRemoteSubmit);
    window.addEventListener("voicerx:cancel", handleRemoteCancel);
    return () => {
      window.removeEventListener("voicerx:submit", handleRemoteSubmit);
      window.removeEventListener("voicerx:cancel", handleRemoteCancel);
    }
  }, [submitVoiceRxRecording, cancelVoiceRxRecording])

  // ── Derived State ──
  const patient = useMemo(
    () => RX_CONTEXT_OPTIONS.find((p) => p.id === selectedPatientId) || RX_CONTEXT_OPTIONS[0],
    [selectedPatientId],
  )

  const summary = useMemo(
    () => SMART_SUMMARY_BY_CONTEXT[selectedPatientId] || SMART_SUMMARY_BY_CONTEXT[CONTEXT_PATIENT_ID],
    [selectedPatientId],
  )

  // Snapshot seed removed — VoiceRx welcome screen is always shown until
  // the doctor submits their first voice consultation.

  const messages = useMemo(
    () => messagesByPatient[selectedPatientId] || [],
    [messagesByPatient, selectedPatientId],
  )

  /**
   * VoiceRx first-time UX: hide canned intro messages and the text chat input until the
   * doctor has submitted at least one voice consultation. Until then the panel shows only
   * a single "Start Consultation" CTA (and the contextual patient strip).
   */
  const voiceHasFirstSubmission = useMemo(
    () => voiceRxMode && messages.some((m) => m.role === "user" && !!m.voiceTranscript),
    [voiceRxMode, messages],
  )
  // Pre-first-submission gate — true from panel mount until the doctor's
  // first voice consultation lands. Drives BOTH the centered empty-state
  // (when there are no messages yet) and the full-width "Start with Voice"
  // sticky-footer CTA (when there are messages but still no voice
  // submission). The text ChatInput is suppressed while this is true.
  const voiceFirstTimeMode = voiceRxMode && !voiceHasFirstSubmission && !voiceRxRecording && !voiceRxAwaitingResponse
  // Centered greeting + inline CTA + canned card. Only shown when nothing
  // has been seeded into the thread yet.
  // SKIP the welcome screen when symptom collector data exists — the doctor
  // should see the auto-loaded patient report immediately (with loader).
  const hasSymptomData = !!summary.symptomCollectorData?.symptoms?.length
  const voiceEmptyState = voiceFirstTimeMode && messages.length === 0 && !hasSymptomData && !isTyping

  /** Glance intro still has inline pills under the bubble — hide context PillBar until cleared */
  const glanceInlinePillsActive = useMemo(
    () => messages.some((m) => isSituationAtGlanceAssistantMessage(m) && !!m.suggestions?.length),
    [messages],
  )

  const phase = useMemo(
    () => phaseByPatient[selectedPatientId] || "empty",
    [phaseByPatient, selectedPatientId],
  )

  const availableSpecialties = useMemo(() => detectSpecialties(summary), [summary])

  const isPatientContext = mode === "homepage" && selectedPatientId !== HOMEPAGE_COMMON_ID

  // Show doctor view selector only for patients with POMR/SBAR data (POC: Ramesh Kumar only)
  const showDoctorViewSelector = selectedPatientId === "apt-ramesh-ckd"

  // ── Pill deduplication: track which card kinds have been shown ──
  const shownCardKinds = useMemo(() => {
    const kinds = new Set<string>()
    for (const msg of messages) {
      if (msg.rxOutput?.kind) kinds.add(msg.rxOutput.kind)
    }
    return kinds
  }, [messages])

  /** Map pill labels to the card kind(s) they produce — used to hide pills for already-shown cards */
  const PILL_TO_CARD_KINDS: Record<string, string[]> = {
    "Patient's detailed summary": ["patient_summary", "sbar_overview"],
    "Patient summary": ["sbar_overview", "patient_summary"],
    "Reported by patient": ["symptom_collector"],
    "Show reported intake": ["symptom_collector"],
    "Last visit": ["last_visit"],
    "Last visit details": ["last_visit"],
    "Past visit summaries": ["last_visit"],
    "Vital trends": ["vitals_trend_bar"],
    "Suggest DDX": ["ddx"],
    "Lab overview": ["lab_panel"],
    "Lab comparison": ["lab_comparison"],
    "Obstetric summary": ["obstetric_summary"],
    "Gynec summary": ["gynec_summary"],
    "Growth & vaccines": ["pediatric_summary"],
    "Vision summary": ["ophthal_summary"],
    "Flagged lab results": ["lab_panel"],
    "Follow-up overview": ["follow_up"],
  }

  const pills = useMemo(() => {
    const rawPills = (mode === "homepage" && selectedPatientId === HOMEPAGE_COMMON_ID)
      ? generateHomepagePills(activeTab, activeRailItem, null)
      : isPatientContext
        ? generateHomepagePills(activeTab, activeRailItem, summary)
        : generatePills(summary, phase, activeTabLens, showDoctorViewSelector ? doctorViewType : undefined)

    // Filter out pills whose card has already been shown in the current conversation
    return rawPills.filter(pill => {
      const cardKinds = PILL_TO_CARD_KINDS[pill.label]
      if (!cardKinds) return true // Unknown mapping — always show
      return !cardKinds.some(kind => shownCardKinds.has(kind))
    })
  }, [mode, activeTab, activeRailItem, isPatientContext, summary, phase, activeTabLens, selectedPatientId, showDoctorViewSelector, doctorViewType, shownCardKinds])

  // ── Sync patient allergies to context (for RxPad medication alerts) ──
  useEffect(() => {
    setPatientAllergies(summary.allergies ?? [])
  }, [summary, setPatientAllergies])

  // ── Initialize patient messages on first visit or after intake mode change ──
  // Note: we track whether messages exist for the current patient using a ref-derived flag
  // to avoid putting messagesByPatient in the dep array (which would cause infinite loops
  // since this effect itself sets messagesByPatient).
  const hasMessagesForPatient = (messagesByPatient[selectedPatientId]?.length ?? 0) > 0
  useEffect(() => {
    if (!hasMessagesForPatient) {
      let introMessages: RxAgentChatMessage[]
      if (voiceRxMode) {
        if (summary.symptomCollectorData?.symptoms?.length) {
          introMessages = []
          const scData = summary.symptomCollectorData
          const patientName = patient.label
          const pid = selectedPatientId
          if (scFlowStartedRef.current.has(pid)) return
          scFlowStartedRef.current.add(pid)

          // Phase 1: SC card message immediately with shimmer text reveal
          const nowIso = new Date().toISOString()
          setMessagesByPatient((prev) => ({
            ...prev,
            [pid]: [
              {
                id: uid(),
                role: "assistant" as const,
                text: `${patientName} has shared pre-visit details via Symptom Collector.`,
                rxOutput: { kind: "symptom_collector", data: scData },
                createdAt: nowIso,
                feedbackGiven: null,
                shimmerReveal: true,
              },
            ],
          }))

          // Phase 2 (2.5s): follow-up message after card + feedback row have revealed
          window.setTimeout(() => {
            const replyIso = new Date().toISOString()
            setMessagesByPatient((prev) => ({
              ...prev,
              [pid]: [
                ...(prev[pid] || []),
                {
                  id: uid(),
                  role: "assistant" as const,
                  text: "Start consultation by **dictating** or having a **natural conversation** with the patient. **Tap below** to begin.",
                  createdAt: replyIso,
                  feedbackGiven: null,
                  hideFeedback: true,
                  shimmerReveal: true,
                },
              ],
            }))
          }, 2500)
          return
        } else {
          introMessages = []
        }
      } else if (mode === "homepage" && selectedPatientId === HOMEPAGE_COMMON_ID) {
        introMessages = []
      } else if (
        mode === "homepage" &&
        selectedPatientId !== HOMEPAGE_COMMON_ID &&
        autoMessage?.trim() === QUICK_CLINICAL_SNAPSHOT_PROMPT
      ) {
        return
      } else {
        introMessages = buildIntroMessages(summary, patient, showDoctorViewSelector ? doctorViewType : undefined, intakeMode, mode)
      }
      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: introMessages,
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId, hasMessagesForPatient, summary, patient, mode, initialPatientId, autoMessage])

  // ── Reset specialty when patient changes ──
  useEffect(() => {
    const detected = detectSpecialties(summary)
    if (!detected.includes(activeSpecialty)) {
      setActiveSpecialty("gp")
    }
  }, [summary, activeSpecialty])

  // ── Handle Sidebar Signals ──
  useEffect(() => {
    if (!lastSignal || lastSignal.id === lastSignalIdRef.current) return
    lastSignalIdRef.current = lastSignal.id

    if (lastSignal.type === "sidebar_pill_tap" && lastSignal.label) {
      // Pre-fill input box — doctor decides whether to send
      setInputValue(lastSignal.label)
      setIsPrefilled(true)
    }

    // AI trigger from RxPad section chips or sidebar icons → pre-fill input
    if (lastSignal.type === "ai_trigger" && lastSignal.label) {
      setInputValue(lastSignal.label)
      setIsPrefilled(true)
    }

    // When symptoms are added in RxPad, advance phase to show DDX pills
    if (lastSignal.type === "symptoms_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"
      if (currentPhase === "empty") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "symptoms_entered" }))
      }
    }

    // When diagnosis is added, advance phase
    if (lastSignal.type === "diagnosis_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"
      if (currentPhase === "symptoms_entered") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "dx_accepted" }))
      }
    }

    // When medications are added, advance phase accordingly
    if (lastSignal.type === "medications_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"
      if (currentPhase === "dx_accepted") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "meds_written" }))
      }
    }
  }, [lastSignal])

  // ── Core: Send Message ──
  const handleSend = useCallback((text?: string) => {
    const msg = text || inputValue.trim()
    if (!msg) return

    const msgNorm = msg.trim().toLowerCase()
    const qp = QUICK_CLINICAL_SNAPSHOT_PROMPT.trim().toLowerCase()
    if (msgNorm === qp || msgNorm.startsWith(qp)) {
      const cur = messagesByPatient[selectedPatientId] || []
      if (threadAlreadyHasQuickClinicalGlance(cur, qp)) {
        return
      }
    }

    // Clear inline suggestions from all messages (so bottom pill bar reappears)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).map(m => m.suggestions ? { ...m, suggestions: undefined } : m),
    }))

    const userMsg: RxAgentChatMessage = {
      id: uid(),
      role: "user",
      text: msg,
      createdAt: new Date().toISOString(),
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setInputValue("")

    // Classify intent — check PILL_INTENT_MAP first (exact pill labels bypass NLU)
    const pillOverride = PILL_INTENT_MAP[msg]
    const intent = pillOverride
      ? { category: pillOverride, format: "card" as const, confidence: 1 }
      : classifyIntent(msg)

    // Set context-aware typing hint before showing indicator
    setTypingHint(getQueryHint(intent.category, msg))
    setIsTyping(true)

    // Build reply after a short delay (simulate thinking)
    setTimeout(() => {
      const currentMessages = [...(messagesByPatient[selectedPatientId] || []), userMsg]
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"

      // Update phase
      const newPhase = inferPhase(currentMessages, currentPhase)
      if (newPhase !== currentPhase) {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: newPhase }))
      }

      // ── Guardrails + Routing ──
      const isClinicOverview = mode === "homepage" && selectedPatientId === HOMEPAGE_COMMON_ID
      const isRxPadMode = mode === "rxpad"

      // Patient-specific intents that should NOT render in Clinic Overview
      const PATIENT_SPECIFIC_INTENTS: Set<string> = new Set([
        "data_retrieval", "clinical_decision", "comparison", "document_analysis",
      ])
      // Patient-specific keywords in the message
      const nl = msg.toLowerCase()
      const isPatientSpecificQuery = nl.includes("timeline") || nl.includes("last visit") || nl.includes("patient summary")
        || nl.includes("snapshot") || nl.includes("lab") || nl.includes("vital")
        || nl.includes("medication") || nl.includes("obstetric summary") || nl.includes("gynec summary")
        || nl.includes("growth") || nl.includes("vision") || nl.includes("intake")

      // Operational (clinic-overview) keywords
      const isOperationalQuery = intent.category === "operational"

      let reply: import("./types").ReplyResult

      // Extract patient name from message for search
      const extractPatientQuery = (text: string): string => {
        const patterns = [
          /(?:details?\s+(?:about|of|for)\s+)(.+)/i,
          /(?:search|find|look\s*up|show)\s+(?:patient\s+)?(.+)/i,
          /(?:patient\s+named?\s+)(.+)/i,
          /(?:who\s+is\s+)(.+)/i,
        ]
        for (const p of patterns) {
          const m = text.match(p)
          if (m) return m[1].trim().replace(/[?.!]+$/, "")
        }
        return ""
      }

      // Check if message mentions a patient name (fuzzy match against known patients)
      const allPatients = RX_CONTEXT_OPTIONS.filter(o => o.kind === "patient")
      let nameQuery = extractPatientQuery(msg)
      // If no pattern matched, check if the raw input matches a known patient name
      if (!nameQuery) {
        const directMatch = allPatients.some(
          p => p.label.toLowerCase().includes(nl) || nl.includes(p.label.toLowerCase().split(" ")[0])
        )
        if (directMatch) nameQuery = msg.trim()
      }

      if (isClinicOverview && nameQuery) {
        // ── Patient search → show search card with pre-filled query ──
        const matches = allPatients
          .filter(p => p.label.toLowerCase().includes(nameQuery.toLowerCase()))
          .map(p => ({
            patientId: p.id,
            name: p.label,
            meta: p.meta,
            hasAppointmentToday: !!p.isToday,
          }))
        reply = {
          text: matches.length > 0
            ? `Found ${matches.length} patient${matches.length > 1 ? "s" : ""} matching "${nameQuery}". Select to view details.`
            : `No patients found for "${nameQuery}". Try searching with a different name.`,
          rxOutput: {
            kind: "patient_search",
            data: { query: nameQuery, results: matches },
          },
        }
      } else if (isClinicOverview && (PATIENT_SPECIFIC_INTENTS.has(intent.category) || isPatientSpecificQuery)) {
        // ── GUARDRAIL: Patient-specific query without a name → show search card ──
        reply = {
          text: "Please search for a patient to view their clinical data.",
          rxOutput: {
            kind: "patient_search",
            data: { query: "", results: [] },
          },
        }
      } else if (isRxPadMode && isOperationalQuery) {
        // ── GUARDRAIL: Operational/clinic query inside RxPad → redirect to appointments page ──
        const patientLabel = summary.patientNarrative
          ? "this patient"
          : "the current patient"
        reply = {
          text: `You're currently inside ${patientLabel}'s consultation. Clinic-wide analytics like revenue, KPIs, and scheduling are available on the Appointments page. Switch to the Clinic Overview context to access operational data.`,
          followUpPills: [
            { id: "grd-suggest", label: "Suggest DDX", priority: 10, layer: 3, tone: "primary" as const },
            { id: "grd-labs", label: "Lab overview", priority: 12, layer: 3, tone: "primary" as const },
          ],
        }
      } else if (mode === "homepage" && isOperationalQuery) {
        // ── Normal: Operational query in Clinic Overview ──
        reply = buildHomepageReply(msg, intent)
      } else {
        // ── Normal: Patient-context reply ──
        reply = buildReply(msg, summary, newPhase, intent)
      }

      const qt = msg.trim().toLowerCase()
      const qp = QUICK_CLINICAL_SNAPSHOT_PROMPT.toLowerCase()
      if (
        selectedPatientId !== HOMEPAGE_COMMON_ID &&
        (qt === qp || qt.startsWith(qp))
      ) {
        reply = {
          text: SITUATION_AT_A_GLANCE_ASSISTANT_TEXT,
          rxOutput: { kind: "text_quote", data: { quote: buildQuickClinicalSnapshotText(summary), source: "" } },
          suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "full"),
        }
      }

      const assistantMsg: RxAgentChatMessage = {
        id: uid(),
        role: "assistant",
        text: reply.text,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
        suggestions: reply.suggestions,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
      setTypingHint("")
      onSnapshotDelivered?.(selectedPatientId)
    // Delay simulates AI thinking — 2-2.5s feels natural for clinical queries
    }, 1800 + Math.random() * 700)
  }, [inputValue, selectedPatientId, summary, messagesByPatient, phaseByPatient, mode, homepagePatients, onSnapshotDelivered])

  // ── Auto-message from parent (e.g. tooltip "View Detailed Summary" CTA) ──
  const handleSendRef = useRef(handleSend)
  handleSendRef.current = handleSend
  useEffect(() => {
    if (!autoMessage || !selectedPatientId) return
    const am = autoMessage.trim().toLowerCase()
    const qp = QUICK_CLINICAL_SNAPSHOT_PROMPT.trim().toLowerCase()
    if (am === qp || am.startsWith(qp)) {
      const existing = messagesByPatient[selectedPatientId] || []
      if (threadAlreadyHasQuickClinicalGlance(existing, am)) {
        return
      }
    }
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handleSendRef.current(autoMessage)
      })
    })
    return () => cancelAnimationFrame(rafId)
  }, [autoMessage, autoMessageTrigger, selectedPatientId, messagesByPatient])

  // ── Pill Tap ──
  const handlePillTap = useCallback((pill: CannedPill) => {
    handleSend(pill.label)
  }, [handleSend])

  // ── Feedback ──
  const handleFeedback = useCallback((messageId: string, feedback: "up" | "down") => {
    setMessagesByPatient((prev) => {
      const msgs = prev[selectedPatientId] || []
      return {
        ...prev,
        [selectedPatientId]: msgs.map((m) =>
          m.id === messageId ? { ...m, feedbackGiven: feedback } : m,
        ),
      }
    })
  }, [selectedPatientId])

  // ── Patient Search Selection ──
  const handlePatientSelect = useCallback((patientId: string) => {
    setSelectedPatientId(patientId)
  }, [])

  // ── Fill to RxPad ──
  const handleCopy = useCallback((payload: unknown) => {
    if (payload && typeof payload === "object" && "sourceDateLabel" in payload) {
      // Show the copy overlay + edge aura for ~2.5s, THEN fire the
      // actual fill — reads as a deliberate AI-mediated transfer
      // instead of an instant clipboard write.
      runCopyWithAura(payload as RxPadCopyPayload)
      // Also persist to sessionStorage so RxPad can pick it up if opened later
      try {
        const existing = sessionStorage.getItem("pendingRxPadCopy")
        const arr: unknown[] = existing ? JSON.parse(existing) : []
        arr.push(payload)
        sessionStorage.setItem("pendingRxPadCopy", JSON.stringify(arr))
      } catch { /* ignore storage errors */ }
    }
  }, [runCopyWithAura])

  // ── Sidebar Navigation ──
  const handleSidebarNav = useCallback((tab: string) => {
    // Publish signal first so sidebar can process it
    publishSignal({ type: "section_focus", sectionId: tab })
    // Small delay to let sidebar process the signal before closing agent panel
    setTimeout(() => {
      onClose()
    }, 50)
  }, [publishSignal, onClose])

  // ── From pill tap in chat (text-based) ──
  const handleChatPillTap = useCallback((label: string) => {
    handleSend(label)
  }, [handleSend])

  // ── Doctor View Change — directly rebuild intro messages ──
  const handleDoctorViewChange = useCallback((newType: DoctorViewType) => {
    setDoctorViewType(newType)
    // Directly rebuild intro messages instead of delete-then-recreate via useEffect
    // This avoids the intermediate empty state that could cause visual flicker
    const newIntro = buildIntroMessages(summary, patient, showDoctorViewSelector ? newType : undefined, intakeMode, mode)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: newIntro,
    }))
    setIsTyping(false)
  }, [selectedPatientId, summary, patient, showDoctorViewSelector, intakeMode])

  // ── Intake Mode Change — directly rebuild intro messages ──
  const handleIntakeModeChange = useCallback((newMode: "with_intake" | "without_intake") => {
    setIntakeMode(newMode)
    // Directly rebuild intro messages instead of delete-then-recreate via useEffect
    const newIntro = buildIntroMessages(summary, patient, showDoctorViewSelector ? doctorViewType : undefined, newMode, mode)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: newIntro,
    }))
    setIsTyping(false)
  }, [selectedPatientId, summary, patient, showDoctorViewSelector, doctorViewType])

  // ── Patient Change ──
  const handlePatientChange = useCallback((id: string) => {
    setSelectedPatientId(id)
    setInputValue("")
    setIsTyping(false)
  }, [])

  // ── Chip shake — triggered when locked chip in input is clicked ──
  const handleLockedChipClick = useCallback(() => {
    setChipShaking(true)
    setTimeout(() => setChipShaking(false), 600)
  }, [])

  // ── Edit message — ChatGPT-style: truncate after edited msg, re-send ──
  const handleEditMessage = useCallback((messageId: string, newText: string) => {
    setMessagesByPatient((prev) => {
      const msgs = prev[selectedPatientId] || []
      const idx = msgs.findIndex((m) => m.id === messageId)
      if (idx < 0) return prev
      // Keep messages up to (not including) the edited one
      const kept = msgs.slice(0, idx)
      return { ...prev, [selectedPatientId]: kept }
    })
    // Re-send with new text after state updates
    setTimeout(() => handleSend(newText), 50)
  }, [selectedPatientId, handleSend])

  // ── Handle attach — context-aware ──
  // Homepage (Clinic Overview, no patient) → open native file picker
  // Patient context → show bottom sheet with patient's documents
  const handleAttach = useCallback(() => {
    if (mode === "homepage" && selectedPatientId === HOMEPAGE_COMMON_ID) {
      // No patient context → trigger native file input
      fileInputRef.current?.click()
    } else {
      // Patient context → show document bottom sheet
      setShowDocBottomSheet(true)
    }
  }, [mode, selectedPatientId])

  // ── Handle sending selected documents from bottom sheet ──
  const handleSendDocuments = useCallback((docs: PatientDocument[]) => {
    setShowDocBottomSheet(false)

    const fileNames = docs.map(d => d.fileName)
    const textPrefix = docs.length === 1
      ? `Analyze this document: **${docs[0].fileName}**`
      : `Analyze these ${docs.length} documents: ${fileNames.map(f => `**${f}**`).join(", ")}`

    const userMsg: RxAgentChatMessage = {
      id: uid(),
      role: "user",
      text: textPrefix,
      createdAt: new Date().toISOString(),
      attachment: {
        type: "pdf",
        fileName: docs[0].fileName,
        pageCount: docs[0].pageCount,
      },
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setIsTyping(true)

    // Determine reply based on first doc's type
    const docType = docs[0].docType === "radiology" ? "radiology"
      : docs[0].docType === "prescription" ? "prescription"
      : "pathology"

    setTimeout(() => {
      const reply = buildDocumentReply(docType, summary)
      const assistantMsg: RxAgentChatMessage = {
        id: uid(),
        role: "assistant",
        text: docs.length === 1
          ? reply.text
          : `I've analyzed ${docs.length} documents. Here's the key extraction from the primary report:\n\n${reply.text}`,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
    }, 1200)
  }, [selectedPatientId, summary])

  // ── Handle upload from bottom sheet or file input ──
  const handleUploadNew = useCallback(() => {
    setShowDocBottomSheet(false)
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(() => {
    // In POC, just open the old attach panel for doc type selection
    setShowAttachPanel(true)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleAttachSelect = useCallback((docType: "pathology" | "radiology" | "prescription") => {
    setShowAttachPanel(false)

    const fileNameMap: Record<string, string> = {
      pathology: "Lab_Report_Mar2026.pdf",
      radiology: "X-Ray_Chest_Mar2026.pdf",
      prescription: "Previous_Rx_Mar2026.pdf",
    }
    const pageMap: Record<string, number> = { pathology: 2, radiology: 1, prescription: 1 }

    const userMsg: RxAgentChatMessage = {
      id: uid(),
      role: "user",
      text: "",
      createdAt: new Date().toISOString(),
      attachment: {
        type: "pdf",
        fileName: fileNameMap[docType] ?? "Document.pdf",
        pageCount: pageMap[docType] ?? 1,
      },
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setIsTyping(true)

    setTimeout(() => {
      const reply = buildDocumentReply(docType, summary)
      const assistantMsg: RxAgentChatMessage = {
        id: uid(),
        role: "assistant",
        text: reply.text,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
        suggestions: reply.suggestions,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
    }, 1200)
  }, [selectedPatientId, summary])

  // ── Voice transcription → structured RX ──
  const handleVoiceTranscription = useCallback((text: string) => {
    const userMsg: RxAgentChatMessage = {
      id: uid(),
      role: "user",
      text,
      voiceTranscript: text,
      createdAt: new Date().toISOString(),
      feedbackGiven: null,
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setIsTyping(true)

    setTimeout(() => {
      const structured = parseVoiceToStructuredRx(text)
      const assistantMsg: RxAgentChatMessage = {
        id: uid(),
        role: "assistant",
        text: "",
        createdAt: new Date().toISOString(),
        rxOutput: { kind: "voice_structured_rx", data: structured },
        feedbackGiven: null,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
    }, 800)
  }, [selectedPatientId])

  // ── Chat scroll ref ──
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = chatScrollRef.current
    if (!el) return
    return () => {
    }
  }, [])

  // ── Patient documents for bottom sheet ──
  const patientDocuments = useMemo(
    () => PATIENT_DOCUMENTS[selectedPatientId] || [],
    [selectedPatientId],
  )

  // Flip only while actively recording — submit flips back immediately so the chat loader
  // (VoiceRxLoaderCard) + RxPad processing overlay become visible.
  // Stay on the back face for the entire voice flow:
  //   recording → loading (awaiting response) → result tabs
  // The user only returns to chat by pressing the back arrow inside the
  // result tabs (which clears voiceRxResult) or by cancelling.
  // Flip for active voice recording/loading, OR when viewing a restored session
  // result (from chat card expand). The latter doesn't require voiceRxMode prop.
  const isFlipped = (voiceRxMode && (voiceRxRecording || voiceRxAwaitingResponse)) || (voiceRxResult !== null && !voiceRxResultMinimized)

  return (
    <div
      id="dr-agent-panel-root"
      className="relative flex h-full flex-col bg-transparent"
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        perspective: 1200,
        WebkitPerspective: 1200,
        // Force a new stacking / paint context. Safari needs this or the
        // ancestor `overflow: hidden` from the sliding fixed wrapper in
        // VoiceRxFlow flattens our preserve-3d subtree (back face ends up
        // 2D-mirrored instead of 3D-rotated — the exact iPad bug).
        isolation: "isolate",
      }}
    >
      {/* 3D Wrapper — every property below has a -webkit- twin because
          Safari (iPad, esp. iOS <16) silently falls back to flat compositing
          otherwise, which is why the BACK FACE was rendering the MIRROR of
          the front face content. `translate3d(0,0,0)` promotes the wrapper
          into its own GPU layer so the 3D context cannot be flattened by any
          overflow-hidden ancestor. */}
      <div
        className={cn("relative w-full h-full transition-transform duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]")}
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          transform: isFlipped
            ? "translate3d(0,0,0) rotateY(180deg)"
            : "translate3d(0,0,0) rotateY(0deg)",
          WebkitTransform: isFlipped
            ? "translate3d(0,0,0) rotateY(180deg)"
            : "translate3d(0,0,0) rotateY(0deg)",
          willChange: "transform",
        }}
      >

        {/* FRONT FACE —
            `translate3d(0,0,1px)` pushes the face 1px forward in Z space so
            Safari keeps it as its own 3D layer (instead of coalescing both
            faces into a single flat plane). `overflow-hidden` is moved to an
            INNER div below, because overflow clipping on a transformed 3D
            face is what triggers the Safari flattening bug. */}
        <div
          className={cn("absolute inset-0 w-full h-full bg-white", isFlipped && "pointer-events-none")}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translate3d(0,0,1px)",
            WebkitTransform: "translate3d(0,0,1px)",
          }}
        >
        <div className="flex h-full w-full flex-col overflow-hidden">

      {/* Animated TP AI gradient wash — 5% opacity moving across the whole panel */}
      <div className="vrx-da-gradient-wash pointer-events-none absolute inset-0 z-0" aria-hidden />

      {/* Hidden file input for native upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ── Chat area — transparent; inherits the FRONT FACE white + animated AI wash. ── */}
      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ background: "transparent" }}
      >
        <div ref={chatScrollRef} className="da-chat-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">

          {/* Sticky liquid-glass header — stays pinned at the top of the scroll area
              so chat content scrolls behind the tags (content blurs under glass). */}
          <div className="pointer-events-none sticky top-0 z-30">
            <AgentHeader
              availableSpecialties={availableSpecialties}
              activeSpecialty={activeSpecialty}
              onSpecialtyChange={setActiveSpecialty}
              onPatientChange={handlePatientChange}
              selectedPatientId={selectedPatientId}
              onClose={onClose}
              doctorViewType={doctorViewType}
              onDoctorViewChange={handleDoctorViewChange}
              showDoctorViewSelector={showDoctorViewSelector}
              onViewSessionHistory={() => setIsSessionHistoryOpen(true)}
              intakeMode={intakeMode}
              onIntakeModeChange={handleIntakeModeChange}
              brandTitle={headerBrandTitle}
            />
          </div>

          {/* Patient chip removed from voiceRx mode — the header already identifies the patient */}

          {mode === "homepage" && (
            <div className="sticky top-0 z-10 flex justify-center pb-1 pt-3">
              <button
                type="button"
                onClick={() => setIsPatientSheetOpen(true)}
                className={cn("da-floating-chip inline-flex items-center gap-[4px] px-[8px] py-[3px] transition-all", chipShaking && "da-chip-shake")}
                style={{
                  background: "rgba(255,255,255,0.65)",
                  backdropFilter: "blur(12px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(12px) saturate(1.4)",
                  boxShadow: "0 2px 12px rgba(15,23,42,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset",
                  height: 28,
                  borderRadius: 14,
                }}
              >
                {selectedPatientId === HOMEPAGE_COMMON_ID ? (
                  <>
                    <span className="flex-shrink-0 text-tp-slate-500">
                      <Hospital size={12} variant="Bulk" />
                    </span>
                    <span style={{ color: "#3D3D4E", fontWeight: 600, fontSize: 12, lineHeight: "12px" }}>Clinic overview</span>
                  </>
                ) : (
                  <>
                    <span className="flex-shrink-0 text-tp-slate-500">
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                        <path opacity="0.4" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" fill="currentColor" />
                        <path d="M12 14.5c-5.01 0-9.09 3.36-9.09 7.5 0 .28.22.5.5.5h17.18c.28 0 .5-.22.5-.5 0-4.14-4.08-7.5-9.09-7.5Z" fill="currentColor" />
                      </svg>
                    </span>
                    <span style={{ color: "#3D3D4E", fontWeight: 600, fontSize: 12, lineHeight: "12px" }}>{patient.label}</span>
                    {patient.gender && (
                      <span className="flex-shrink-0 whitespace-nowrap flex items-center" style={{ fontSize: 10, lineHeight: "12px" }}>
                        <span style={{ color: "#B0B7C3" }}>(</span>
                        <span style={{ color: "#B0B7C3" }}>{patient.gender}</span>
                        {patient.age && <><span className="mx-[2px]" style={{ color: "#D0D5DD" }}>|</span><span style={{ color: "#B0B7C3" }}>{patient.age}y</span></>}
                        <span style={{ color: "#B0B7C3" }}>)</span>
                      </span>
                    )}
                  </>
                )}
                <svg width={12} height={12} viewBox="0 0 12 12" fill="none" className="flex-shrink-0" style={{ color: "#667085" }}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}

          {voiceEmptyState ? (
            // Two-zone layout: vertically-centered brand content (spark
            // chip, greeting, subtitle, voice CTA) + bottom-anchored
            // "View patient shared details" glassy pill + trust marker.
            // The pill replaces the old mid-content canned card so the
            // primary CTA area stays clean.
            <div className="flex flex-1 flex-col items-center px-[20px] pt-[24px] pb-[20px] relative">
              {/* ── Center zone ───────────────────────────────────── */}
              <div className="flex flex-1 flex-col items-center justify-center w-full">
                {/* Spark chip — 100×100 white-base + chat-bg gradient
                    overlay + slow-rotating spark glyph (72px). */}
                <div className="relative z-[1] mb-[14px]">
                  <span
                    className="pointer-events-none select-none relative inline-flex items-center justify-center overflow-hidden"
                    style={{ width: 62, height: 62, borderRadius: 16 }}
                    aria-hidden
                  >
                    <div className="absolute inset-0 bg-white" style={{ borderRadius: 16 }} />
                    <div className="absolute inset-0" style={{
                      backgroundImage: "url(/icons/dr-agent/chat-bg.gif)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      borderRadius: 16,
                      opacity: 0.32,
                    }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/dr-agent/agent-spark.svg"
                      width={40}
                      height={40}
                      alt=""
                      className="relative z-10 vrx-empty-spark-rotate"
                      draggable={false}
                    />
                  </span>
                </div>

                <h2 className="relative z-[1] text-[20px] font-semibold text-tp-slate-700 text-center leading-[26px]">
                  {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening" })()}, Doctor!
                </h2>
                <p
                  className="relative z-[1] mt-[4px] text-[16px] text-center leading-[24px]"
                  style={{ color: "var(--tp-slate-400, #A2A2A8)" }}
                >
                  Start consultation by{" "}
                  <span className="font-medium text-tp-slate-500">dictating</span>{" "}
                  or having a{" "}
                  <span className="font-medium text-tp-slate-500">natural conversation</span>{" "}
                  with the patient.
                </p>

                {/* Inline primary CTA — single source of truth in this
                    state; the sticky footer CTA does not render while
                    voiceEmptyState is true. */}
                <div className="relative z-[1] mt-[20px] w-full px-[14px]">
                  <style>{`
                    @keyframes vrxAiCtaSheen {
                      0%   { transform: translateX(-120%); opacity: 0; }
                      18%  { opacity: 0.55; }
                      55%  { opacity: 0.55; }
                      100% { transform: translateX(320%); opacity: 0; }
                    }
                    .vrx-ai-cta-sheen {
                      background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%);
                      animation: vrxAiCtaSheen 3.6s ease-in-out infinite;
                    }
                    @media (prefers-reduced-motion: reduce) {
                      .vrx-ai-cta-sheen { animation: none; opacity: 0; }
                    }
                  `}</style>
                  <button
                    type="button"
                    onClick={() => setVoiceRxDialogOpen(true)}
                    className="vrx-ai-cta group relative flex w-full items-center justify-center gap-[10px] h-[48px] overflow-hidden rounded-[12px] px-[14px] text-[14px] font-bold tracking-wide text-white transition-all hover:brightness-105 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #D565EA 0%, #673AAC 55%, #1A1994 100%)" }}
                  >
                    <span aria-hidden className="vrx-ai-cta-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]" />
                    <VoiceRxIcon size={32} color="#FFFFFF" className="relative z-[1]" />
                    <span className="relative z-[1]">Start with Voice</span>
                  </button>
                </div>
              </div>

              {/* ── Bottom zone: glassy "View patient shared details"
                  pill — only shown when SC data exists ────────────── */}
              {summary.symptomCollectorData && <div className="relative z-[1] flex flex-col items-center gap-[10px] w-full">
                {/* Tooltip wrapper — group/chip provides the hover target
                    so the tooltip can live outside the overflow-hidden button */}
                <div className="group/chip relative">
                {/* Arrow-pointer tooltip — appears above the chip on hover */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute bottom-full left-1/2 z-[50] mb-[10px] -translate-x-1/2 translate-y-[6px] opacity-0 transition-all duration-200 ease-out group-hover/chip:translate-y-0 group-hover/chip:opacity-100"
                >
                  <div
                    className="relative rounded-[10px] px-[14px] py-[10px]"
                    style={{
                      background: "rgba(30,20,50,0.90)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      boxShadow: "0 4px 16px -4px rgba(15,23,42,0.32), 0 0 0 1px rgba(255,255,255,0.06) inset",
                      width: 220,
                      textAlign: "center",
                    }}
                  >
                    <p className="text-[12px] font-semibold leading-[16px] text-white">
                      Patient-reported pre-visit details
                    </p>
                    <p className="mt-[4px] text-[11px] leading-[16px]" style={{ color: "rgba(255,255,255,0.62)" }}>
                      Submitted via the symptom collector before the visit
                    </p>
                    {/* Down-arrow caret */}
                    <span
                      className="absolute left-1/2 top-full -translate-x-1/2"
                      style={{
                        width: 0, height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid rgba(30,20,50,0.90)",
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!summary.symptomCollectorData) {
                      handleSend("Reported by patient")
                      return
                    }
                    // Three-step sequence so the click reads as a real
                    // chat exchange, not a JSX swap:
                    //   1) inject the doctor's user message (slides in from
                    //      bottom of the thread via ChatThread's animation)
                    //   2) flip isTyping for ~2s so the agent shows the
                    //      rotating-spark indicator
                    //   3) inject the assistant response (symptom-collector
                    //      card + short "start consultation" nudge with
                    //      hideFeedback so it doesn't get a thumbs row)
                    const nowIso = new Date().toISOString()
                    setMessagesByPatient((prev) => ({
                      ...prev,
                      [selectedPatientId]: [
                        ...(prev[selectedPatientId] || []),
                        {
                          id: uid(),
                          role: "user",
                          text: "Show me the patient-reported details",
                          createdAt: nowIso,
                          feedbackGiven: null,
                        },
                      ],
                    }))
                    const replyIso = new Date().toISOString()
                    setMessagesByPatient((prev) => ({
                      ...prev,
                      [selectedPatientId]: [
                        ...(prev[selectedPatientId] || []),
                        {
                          id: uid(),
                          role: "assistant" as const,
                          text: "Here's what the patient reported via the symptom collector.",
                          rxOutput: { kind: "symptom_collector" as const, data: summary.symptomCollectorData! },
                          createdAt: replyIso,
                          feedbackGiven: null,
                          shimmerReveal: true,
                        },
                      ],
                    }))
                    window.setTimeout(() => {
                      const followUpIso = new Date().toISOString()
                      setMessagesByPatient((prev) => ({
                        ...prev,
                        [selectedPatientId]: [
                          ...(prev[selectedPatientId] || []),
                          {
                            id: uid(),
                            role: "assistant" as const,
                            text: "Start your consultation by dictating or having a natural conversation with the patient.",
                            createdAt: followUpIso,
                            feedbackGiven: null,
                            hideFeedback: true,
                            shimmerReveal: true,
                          },
                        ],
                      }))
                    }, 2500)
                  }}
                  className="vrx-patient-chip group relative flex items-center gap-[6px] overflow-hidden"
                  style={{
                    borderRadius: 20,
                    height: 36,
                    padding: "0 14px",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.28) 100%), linear-gradient(135deg, rgba(213,101,234,0.16) 0%, rgba(103,58,172,0.20) 55%, rgba(26,25,148,0.16) 100%)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90), inset 0 0 0 1px rgba(183,130,220,0.30), 0 6px 20px -6px rgba(103,58,172,0.22)",
                  }}
                >
                  {/* Sheen overlay */}
                  <span
                    aria-hidden
                    className="vrx-patient-chip-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]"
                  />
                  {/* LEFT — clipboard-activity glyph (TP medical icon
                      family) painted with the brand gradient. Same SVG
                      as /public/icons/medical/clipboard-activity--bulk
                      so the canned card reads as part of the medical
                      content family, not a generic AI affordance. */}
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    className="relative z-[1] flex-shrink-0"
                    aria-hidden
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path opacity="0.4" d="M21 18V8C21 5.79086 19.2091 4 17 4H8H7C4.79086 4 3 5.79086 3 8V18C3 20.2091 4.79086 22 7 22H17C19.2091 22 21 20.2091 21 18Z" fill="url(#chipIconGrad)" />
                    <path d="M8 4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4C16 5.10457 15.1046 6 14 6H10C8.89543 6 8 5.10457 8 4Z" fill="url(#chipIconGrad)" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M11.1201 10.2597C11.3581 10.2983 11.563 10.449 11.6708 10.6646L13.2055 13.7339L14.4697 12.4697C14.6103 12.329 14.8011 12.25 15 12.25H17C17.4142 12.25 17.75 12.5858 17.75 13C17.75 13.4142 17.4142 13.75 17 13.75H15.3107L13.5303 15.5303C13.3599 15.7008 13.1178 15.7789 12.8799 15.7403C12.6419 15.7017 12.437 15.5511 12.3292 15.3354L10.7945 12.2661L9.53033 13.5303C9.38968 13.671 9.19891 13.75 9 13.75H7C6.58579 13.75 6.25 13.4142 6.25 13C6.25 12.5858 6.58579 12.25 7 12.25H8.68934L10.4697 10.4697C10.6401 10.2992 10.8822 10.2211 11.1201 10.2597Z" fill="url(#chipIconGrad)" />
                    <defs>
                      <linearGradient id="chipIconGrad" x1="4" y1="6" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#D565EA" />
                        <stop offset="1" stopColor="#3A38B8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span
                    className="relative z-[1] text-[12px] font-semibold leading-none"
                    style={{
                      background: "linear-gradient(135deg, #C850E8 0%, #673AAC 55%, #3A38B8 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    View patient shared details
                  </span>
                  {/* RIGHT — custom arrow SVG */}
                  <svg width="0" height="0" className="absolute" aria-hidden>
                    <linearGradient id="vrx-chip-arrow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop stopColor="#C850E8" offset="0%" />
                      <stop stopColor="#673AAC" offset="55%" />
                      <stop stopColor="#3A38B8" offset="100%" />
                    </linearGradient>
                  </svg>
                  <div className="vrx-lottie-gradient relative z-[1] shrink-0 w-4 h-4 flex items-center justify-center pointer-events-none" aria-hidden>
                    <style>{`
                      .vrx-lottie-gradient path {
                        stroke: url(#vrx-chip-arrow-grad) !important;
                      }
                    `}</style>
                    <Lottie
                      animationData={chevronDownLottie}
                      loop={true}
                      style={{ width: "100%", height: "100%", transform: "scale(1.2)" }}
                    />
                  </div>
                </button>
                </div>{/* end group/chip tooltip wrapper */}

                {/* Trust marker */}
                <p
                  className="flex items-center gap-[4px] text-[12px] leading-[16px] font-normal"
                  style={{ color: "var(--tp-slate-400, #A2A2A8)" }}
                >
                  <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden className="flex-shrink-0">
                    <path
                      d="M6 1.5L9.5 3V6C9.5 7.93 7.97 9.73 6 10.5C4.03 9.73 2.5 7.93 2.5 6V3L6 1.5Z"
                      stroke="#A2A2A8"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M4.5 6L5.5 7L7.5 5" stroke="#A2A2A8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Data stays private · shared only with you
                </p>
              </div>}

              <style>{`
                @keyframes vrxEmptySparkRotate {
                  0%   { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .vrx-empty-spark-rotate {
                  animation: vrxEmptySparkRotate 16s linear infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                  .vrx-empty-spark-rotate { animation: none; }
                }
                @keyframes vrxChipSheen {
                  0%   { transform: translateX(-120%); opacity: 0; }
                  20%  { opacity: 0.4; }
                  60%  { opacity: 0.4; }
                  100% { transform: translateX(320%); opacity: 0; }
                }
                .vrx-patient-chip-sheen {
                  background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%);
                  animation: vrxChipSheen 4s ease-in-out infinite;
                }
                .vrx-patient-chip {
                  transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .vrx-patient-chip:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 16px rgba(103,58,172,0.18);
                }
                .vrx-patient-chip:active {
                  transform: translateY(0) scale(0.98);
                }
                @media (prefers-reduced-motion: reduce) {
                  .vrx-patient-chip-sheen { animation: none; opacity: 0; }
                }
              `}</style>
            </div>
          ) : (
            /* Chat messages. `isTyping || voiceRxAwaitingResponse` so the
               same in-chat TypingIndicator (rotating AI icon + carousel)
               is used for BOTH manual chat replies AND voice-submit
               processing. Replaces the old docked VoiceRxLoaderCard. */
            <ChatThread
              messages={messages}
              isTyping={isTyping || voiceRxAwaitingResponse}
              typingHint={typingHint}
              onFeedback={handleFeedback}
              onPillTap={handleChatPillTap}
              onCopy={handleCopy}
              onSidebarNav={handleSidebarNav}
              className="flex-1"
              activeSpecialty={activeSpecialty}
              patientDocuments={patientDocuments}
              onPatientSelect={handlePatientSelect}
              onEditMessage={handleEditMessage}
            />
          )}
        </div>
      </div>

      {/* Voice processing loader is now rendered INSIDE the chat thread
          via ChatThread's built-in TypingIndicator (see isTyping prop
          above). The old docked VoiceRxLoaderCard above the input is
          gone — one loader grammar for all AI responses. */}

      {/* ── Sticky footer: context PillBar + input (glance canned pills stay inline under that bubble only) ── */}
      <div
        className={cn(
          "sticky bottom-0 z-10 shrink-0 bg-white",
          voiceRxMode && voiceRxRecording
            ? "border-t-0 shadow-none"
            : "border-t border-tp-slate-300 shadow-[0_-4px_16px_rgba(15,23,42,0.04)]",
        )}
      >
        {/* Fade-in top edge — white blend into thread (no hard color break) */}
        <div
          className="pointer-events-none absolute -top-[16px] left-0 right-0"
          style={{
            height: 16,
            background: "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0.55) 42%, transparent)",
          }}
        />
        {/* Hide context PillBar while glance inline pills are still on the thread, and during the
            VoiceRx first-time experience so the footer stays a single focused CTA. */}
        {pills.length > 0 && messages.length > 0 && !isTyping && !glanceInlinePillsActive && !voiceFirstTimeMode && !voiceRxMode && (
          <div className="px-[4px] pt-[8px] pb-[6px]">
            <PillBar
              pills={pills}
              onTap={handlePillTap}
              disabled={false}
            />
          </div>
        )}
        {showAttachPanel && !voiceFirstTimeMode && (
          <AttachPanel
            onSelect={handleAttachSelect}
            onClose={() => setShowAttachPanel(false)}
          />
        )}
        {/* VoiceRx pre-first-submission state: render the full-width
            "Start with Voice" CTA in the sticky footer. Suppressed
            during the empty state itself (where the CTA lives inline
            inside the centered greeting). The text ChatInput comes
            back after the first voice submission. */}
        {voiceFirstTimeMode && messages.length > 0 && (
          <div className="px-[14px] pb-[14px] pt-[10px]">
            {/* Shimmer keyframes for the AI CTA sheen. Colocated with
                the button so the rule is guaranteed to be present even
                if the bottom-sheet's own <style> hasn't mounted yet. */}
            <style>{`
              @keyframes vrxAiCtaSheen {
                0%   { transform: translateX(-120%); opacity: 0; }
                18%  { opacity: 0.55; }
                55%  { opacity: 0.55; }
                100% { transform: translateX(320%); opacity: 0; }
              }
              .vrx-ai-cta-sheen {
                background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%);
                animation: vrxAiCtaSheen 3.6s ease-in-out infinite;
              }
              @media (prefers-reduced-motion: reduce) {
                .vrx-ai-cta-sheen { animation: none; opacity: 0; }
              }
            `}</style>
            <button
              type="button"
              onClick={() => setVoiceRxDialogOpen(true)}
              className="vrx-ai-cta group relative flex w-full items-center justify-center gap-[10px] h-[48px] overflow-hidden rounded-[12px] px-[18px] text-[14px] font-bold tracking-wide text-white transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #D565EA 0%, #673AAC 55%, #1A1994 100%)" }}
            >
              {/* Shimmer sweep — same `vrx-ai-cta-sheen` overlay used by
                  the Start Conversation CTA in VoiceRxBottomSheet so the
                  two AI hero buttons share one motion vocabulary. */}
              <span
                aria-hidden
                className="vrx-ai-cta-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-[40%]"
              />
              <VoiceRxIcon size={32} color="#FFFFFF" className="relative z-[1]" />
              <span className="relative z-[1]">Start with Voice</span>
            </button>
          </div>
        )}
        {!voiceFirstTimeMode && (!voiceRxMode || !voiceRxRecording) && (
          <ChatInput
            value={inputValue}
            onChange={(v) => { setInputValue(v); if (isPrefilled) setIsPrefilled(false) }}
            onSend={() => { setIsPrefilled(false); handleSend() }}
            onAttach={handleAttach}
            onVoiceTranscription={handleVoiceTranscription}
            disabled={isTyping || voiceRxAwaitingResponse}
            isPrefilled={isPrefilled}
            placeholder={voiceRxMode ? "Type Rx here, or use the voice Rx below to speak" : selectedPatientId === HOMEPAGE_COMMON_ID ? "Ask about today's clinic..." : `Ask about ${patient.label}...`}
            patientName={
              voiceRxMode
                ? undefined
                : selectedPatientId === HOMEPAGE_COMMON_ID
                  ? "Clinic Overview"
                  : (patient.label || undefined)
            }
            patientMeta={
              voiceRxMode
                ? undefined
                : selectedPatientId === HOMEPAGE_COMMON_ID
                  ? undefined
                  : (patient.gender && patient.age ? `${patient.gender}|${patient.age}y` : undefined)
            }
            patientLocked
            patientLockedMessage={mode === "homepage" ? "Use the floating chip above to switch patient" : `You're inside ${patient.label?.split(" ")[0] || "this patient"}'s ${mode === "rxpad" ? "prescription" : "detail"} page — chat is focused on this patient`}
            onLockedChipClick={handleLockedChipClick}
            isClinicContext={selectedPatientId === HOMEPAGE_COMMON_ID}
            voiceRxCta={voiceRxMode}
            onVoiceRxCtaClick={() => setVoiceRxDialogOpen(true)}
            voiceRxFooterLayout={voiceRxMode}
          />
        )}
      </div>

      {/* ── Document Bottom Sheet — overlays entire panel ── */}
      {showDocBottomSheet && (
        <DocumentBottomSheet
          documents={patientDocuments}
          onSendDocuments={handleSendDocuments}
          onUploadNew={handleUploadNew}
          onClose={() => setShowDocBottomSheet(false)}
          patientFirstName={patient?.label?.split(" ")[0]}
        />
      )}

      {/* Patient/Context selector — bottom sheet overlays entire panel */}
      {mode === "homepage" && (
        <PatientSelector
          selectedId={selectedPatientId}
          onSelect={handlePatientChange}
          showUniversalOption
          universalOptionId={HOMEPAGE_COMMON_ID}
          externalPatients={homepagePatients}
          isOpen={isPatientSheetOpen}
          onClose={() => setIsPatientSheetOpen(false)}
        />
      )}

      {/* Session history overlay drawer — opened from the brand-pill kebab.
          Patient identity row at the top of the drawer reflects the active
          patient context, so doctors always know whose history they're
          looking at. */}
      <SessionHistoryDrawer
        open={isSessionHistoryOpen}
        onOpenChange={setIsSessionHistoryOpen}
        patientName={patient.label}
        patientMeta={[patient.gender, patient.age ? `${patient.age}y` : null].filter(Boolean).join(" · ")}
      />

      {voiceRxMode && (
        <VoiceRxBottomSheet
          isOpen={voiceRxDialogOpen}
          onClose={() => setVoiceRxDialogOpen(false)}
          consultOptions={VOICE_RX_CONSULT_OPTIONS}
          selectedOption={voiceRxDialogChoice}
          onSelectOption={setVoiceRxDialogChoice}
          onConfirm={confirmVoiceRxConsult}
        />
      )}

      {/* Black "Generating consultation summary…" snackbar removed —
          the in-chat typing indicator now carries the loading feedback;
          an additional top-of-page snackbar was redundant and noisy. */}

      {/* Blocked-voice nudge — surfaces when the clinician tries to start
          a full Dr. Agent consultation while an inline module recorder
          is still running. Points them at the active module so they
          know exactly what to close. Top-center severity=warning so
          it reads as "hey, one thing first" rather than an error. */}
      <TPSnackbar
        open={blockedVoiceToast !== null}
        message={blockedVoiceToast ?? ""}
        severity="warning"
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={3800}
        onClose={(_, reason) => {
          if (reason === "clickaway") return
          setBlockedVoiceToast(null)
        }}
      />

        </div> {/* END inner overflow-clip wrapper */}
        </div> {/* END FRONT FACE */}

        {/* BACK FACE —
            Same GPU-layer promotion trick: `rotateY(180deg) translate3d(0,0,1px)`
            rotates AND pushes the face into its own 3D layer. Overflow
            clipping happens on an INNER child, keeping the transformed face
            itself unclipped (Safari requirement). */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full bg-white",
            // When NOT flipped, the back face is rotated away from the
            // viewer. Even though backface-visibility hides it visually,
            // Safari sometimes keeps it in the hit-test stack — which was
            // eating wheel events intended for the chat scroll underneath.
            // Explicit pointer-events:none + visibility:hidden when the
            // card is in its front state bullet-proofs scroll handling.
            !isFlipped && "pointer-events-none invisible",
          )}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg) translate3d(0,0,1px)",
            WebkitTransform: "rotateY(180deg) translate3d(0,0,1px)",
          }}
        >
          <div className="h-full w-full overflow-hidden">
          {isFlipped && voiceRxResult ? (
            <VoiceRxCanvas
              modeLabel={voiceRxResult.modeLabel}
              transcript={voiceRxResult.transcript}
              emrCard={
                <VoiceStructuredRxCard
                  data={voiceRxResult.structured}
                  onCopy={(payload) => runCopyWithAura(payload)}
                  hideHeader={true}
                />
              }
              onCopyToRx={() => {
                // Bulk Copy-All: edge gradient frames the fill, but
                // per-module pulses are suppressed so the doctor sees
                // ONE coordinated rim signal instead of every section
                // ringing in parallel.
                runCopyWithAura(voiceRxResult.structured.copyAllPayload, { bulk: true })
                // Sidebar (vitals / history) was deliberately held
                // back at submit time — flush it now, on the explicit
                // copy action, so vitals + history land alongside the
                // RxPad fill.
                if (voiceRxResult.pendingSidebarBatch) {
                  pushHistoricalUpdates(voiceRxResult.pendingSidebarBatch)
                  setVoiceRxResult((prev) => (prev ? { ...prev, pendingSidebarBatch: undefined } : prev))
                }
              }}
              onBack={() => setVoiceRxResultMinimized(true)}
              onMinimize={onClose}
              onAddDetailsByVoice={() => {
                // Phase 2 will mount an inline recorder ABOVE the
                // canvas and merge the resulting delta in place. For
                // now we fall back to the existing handler so the flow
                // stays usable: clear the canvas, restart a recording
                // session.
                setVoiceRxResult(null)
                setVoiceRxRecording(true)
                onVoiceCaptureModeChange?.(voiceRxDialogChoice)
              }}
            />
          ) : isFlipped ? (
            /* `VoiceRxActiveAgent` handles BOTH the recording phase and
               the post-submit processing phase internally — when its
               `isAwaitingResponse` prop is true it swaps the transcript
               zone for the processing card while keeping the header,
               collapse, mute, mic-picker and action row in place. */
            <VoiceRxActiveAgent
              mode={voiceRxDialogChoice}
              transcript={voiceRxLiveTranscript}
              isAwaitingResponse={voiceRxAwaitingResponse}
              isHandoffExiting={voiceRxHandoffExiting}
              onCancel={cancelVoiceRxRecording}
              onSubmit={submitVoiceRxRecording}
              onCollapse={onClose}
              onExpand={onOpen}
              isPanelVisible={isPanelVisible}
              onPauseChange={handleVoiceRxPauseChange}
              patientName={patient.label}
            />
          ) : null}
          </div> {/* END back-face inner overflow wrapper */}
        </div>
      </div> {/* END 3D Wrapper */}

      {/* Floating chip hover/active + shake animation CSS */}
      <style>{`
        .da-floating-chip { cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .da-floating-chip:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 4px 16px rgba(15,23,42,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset !important;
        }
        .da-floating-chip:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 1px 4px rgba(15,23,42,0.06), 0 0 0 1px rgba(255,255,255,0.5) inset !important;
        }
        @keyframes daChipShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-4px); }
          30% { transform: translateX(4px); }
          45% { transform: translateX(-3px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-1px); }
          90% { transform: translateX(1px); }
        }
        .da-chip-shake { animation: daChipShake 0.5s ease-in-out; }
        .da-chat-scroll::-webkit-scrollbar { width: 3px; }
        .da-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .da-chat-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
        .da-chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.12) transparent;
          /* iOS / iPad Safari momentum scrolling + touch-pan so wheel /
             swipe gestures reach THIS container instead of bubbling to
             the viewport. Fixes "outer page scrolls, not the chat" on
             touch devices. */
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          touch-action: pan-y;
          /* Continuous gradient backdrop — the chat-bg.gif animated
             gradient at very low opacity, painted on the scroll
             container so it sits behind BOTH the sticky header and the
             body content. Replaces the previous treatment where only
             the empty-state body had the gradient and the header read
             as a hard white bar. The background-color sits on top of
             the image at high alpha so the surface stays readable
             while ~6% of the colour bleeds through.
             background-blend-mode lets the image and the white wash
             composite directly on this single element — no extra
             pseudo-element / flex hacks needed. */
          /* Layered backgrounds: a white wash painted ON TOP of the
             animated gradient gif so ~4% of the colour bleeds through
             the panel uniformly — header AND body share the same
             backdrop. The gif sits on the bottom layer; the white
             wash above it is what controls how much colour shows.
             Tuned at 0.96 — earlier 0.90 read too saturated and
             dominated the foreground content. */
          background-image:
            linear-gradient(rgba(255,255,255,0.975), rgba(255,255,255,0.975)),
            url("/icons/dr-agent/chat-bg.gif");
          background-size: cover, cover;
          background-position: center, center;
          background-repeat: no-repeat, no-repeat;
        }

        /* ── Subtle rotating gradient wash — softened palette + lower
           opacity. Earlier mix sat at 11% with saturated violets which
           read harsh against the white chat surface. New recipe: a
           paler pink → mauve → lilac sweep at ~6% with a heavier
           blur, so the canvas stays calm and the AI brand colour just
           breathes underneath rather than dominating. ── */
        @property --vrx-wash-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .vrx-da-gradient-wash {
          opacity: 0.04;
          background: conic-gradient(
            from var(--vrx-wash-angle) at 50% 50%,
            #FBE7F1 0deg,
            #F1D4EE 80deg,
            #E5CCF1 160deg,
            #D9C6F1 230deg,
            #ECDDF3 300deg,
            #FBE7F1 360deg
          );
          filter: blur(120px);
          animation: vrxDaWashRotate 32s linear infinite;
          will-change: --vrx-wash-angle;
        }
        @keyframes vrxDaWashRotate {
          from { --vrx-wash-angle: 0deg; }
          to   { --vrx-wash-angle: 360deg; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vrx-da-gradient-wash { animation: none; }
        }
      `}</style>
    </div>
  )
}
