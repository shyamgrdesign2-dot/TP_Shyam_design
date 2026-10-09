import React from "react"
import { CardShell } from "../CardShell"
import { InlineDataRow } from "../InlineDataRow"
import { SECTION_TAG_ICON_MAP } from "../SectionTag"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { VITAL_META } from "../../constants"

import { highlightClinicalText } from "../../shared/highlightClinicalText"
import { formatWithHierarchy } from "../../shared/formatWithHierarchy"
import { buildCardSituationQuote } from "../../shared/buildCoreNarrative"

// ── Shared helpers ──

const LAB_SHORT_NAMES = {
  "HbA1c": "HbA1c", "Fasting Glucose": "F.Glucose", "Fasting Blood Sugar": "FBS",
  "TSH": "TSH", "LDL": "LDL", "HDL": "HDL", "Vitamin D": "Vit D",
  "Creatinine": "Creat", "Microalbumin": "Microalb", "Hemoglobin": "Hb",
  "Triglycerides": "TG", "Total Cholesterol": "T.Chol", "eGFR": "eGFR",
  "Potassium": "K+", "Phosphorus": "Phos", "Calcium": "Ca", "PTH": "PTH",
  "Uric Acid": "UA", "WBC": "WBC", "Platelet": "Plt",
}

function shortenLabName(name) {
  return LAB_SHORT_NAMES[name] || name
}

function parseVitalFlag(key, raw) {
  const meta = VITAL_META.find((m) => m.key === key)
  if (!meta) return undefined
  if (key === "bp") {
    const sys = parseInt(raw.split("/")[0], 10)
    if (isNaN(sys)) return undefined
    if (sys >= 140) return "high"
    if (sys <= 90) return "low"
    return "normal"
  }
  const num = parseFloat(raw)
  if (isNaN(num)) return undefined
  if (meta.isAbnormal(num)) {
    if (key === "spo2") return "low"
    if (key === "temp") return "high"
    if (key === "bmi") return num > 30 ? "high" : "low"
    return num > 100 ? "high" : "low"
  }
  return "normal"
}

function shortenMedication(raw) {
  const parts = raw.trim().split(/\s+/)
  if (parts.length === 0) return raw
  const drugName = parts[0]
  if (parts.length > 1 && /^\d+/.test(parts[1]) && !/^\d+-\d+/.test(parts[1])) {
    return `${drugName} ${parts[1]}`
  }
  return drugName
}

/** Split by commas but respect parenthetical groups */
function splitRespectingParens(str) {
  const parts = []
  let depth = 0
  let current = ""
  for (const ch of str) {
    if (ch === "(") depth++
    else if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/** Shorten symptom — "Fever (2d, high, evening spikes)" → "Fever (2d)" */
function shortenSymptom(raw) {
  const match = raw.match(/^([^(]+)\(([^,)]+)/)
  if (match) {
    const name = match[1].trim()
    const firstDetail = match[2].trim()
    if (/\d/.test(firstDetail)) return `${name} (${firstDetail})`
    return name
  }
  return raw.trim()
}

// ── Recommendation logic ──

/**
 * Build focused recommendation items — only what needs action NOW.
 *
 * Shown: follow-up overdue, critical vitals, top 2 due alerts, critical cross-problem flags.
 * NOT shown: individual lab values (visible in Key Labs row), missing fields, non-critical flags.
 */
function buildRecommendations(data) {
  const recs = []

  // 1. Follow-up overdue
  if (data.followUpOverdueDays > 0) {
    recs.push(`Follow-up overdue by ${data.followUpOverdueDays} day${data.followUpOverdueDays > 1 ? "s" : ""}`)
  }

  // 2. Critical vitals only (life-threatening thresholds)
  if (data.todayVitals) {
    const v = data.todayVitals
    if (v.bp) {
      const sys = parseInt(v.bp.split("/")[0], 10)
      if (!isNaN(sys) && (sys <= 90 || sys >= 160)) {
        recs.push(sys <= 90
          ? `BP critically low at ${v.bp} (assess for hypotension)`
          : `BP severely elevated at ${v.bp} (hypertensive urgency)`)
      }
    }
    if (v.spo2) {
      const spo2 = parseInt(v.spo2, 10)
      if (!isNaN(spo2) && spo2 < 92) {
        recs.push(`SpO₂ at ${v.spo2}% (consider supplemental oxygen)`)
      }
    }
    if (v.temp) {
      const temp = parseFloat(v.temp)
      if (!isNaN(temp) && temp >= 104) {
        recs.push(`High fever ${v.temp}°F (evaluate source)`)
      }
    }
  }

  // 3. All due alerts
  if (_optionalChain([data, 'access', _ => _.dueAlerts, 'optionalAccess', _2 => _2.length])) {
    for (const alert of data.dueAlerts) {
      recs.push(alert)
    }
  }

  // 4. All cross-problem flags
  if (_optionalChain([data, 'access', _3 => _3.crossProblemFlags, 'optionalAccess', _4 => _4.length])) {
    for (const flag of data.crossProblemFlags) {
      recs.push(flag.text)
    }
  }

  return recs.slice(0, 4) // Max 4 recommendations shown
}

/**
 * Highlight clinical keywords in recommendation text.
 * Matches vitals (BP, SpO₂, HbA1c), clinical terms, values with units,
 * and action words — wraps them in semibold + darker color.
 */
function highlightRecommendation(text) {
  // Critical/concerning terms get red; clinical values get bold dark
  const criticalPattern = /(\b(?:overdue|critically low|severely elevated|hypertensive urgency|hypotension|critical|urgent|immediately)\b)/gi
  const valuePattern = /(\b(?:BP|SpO[₂2]|HbA1c|eGFR|LDL|HDL|TSH|PTH|Creatinine|Lipid Profile|Hemoglobin|WBC|INR|EPO)\b|\d+\/\d+(?:\s*mmHg)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?°F|\d+\s*days?|\d+(?:\.\d+)?\s*mg\/(?:dL|L)|\d+(?:\.\d+)?\s*m[Ll]\/min)/gi
  const pattern = new RegExp(`(${criticalPattern.source})|(${valuePattern.source})`, "gi")
  const result = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index))
    }
    // Critical terms in tp-error-600, values in tp-slate-700 bold
    const isCritical = criticalPattern.test(match[0])
    criticalPattern.lastIndex = 0 // reset regex
    result.push(
      <span key={match.index} className={isCritical ? "font-semibold text-tp-error-600" : "font-semibold text-tp-slate-700"}>{match[0]}</span>
    )
    lastIndex = pattern.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result.length > 1 ? <>{result}</> : text
}

/** Build a short last visit summary line */
function buildLastVisitLine(data) {
  if (!data.lastVisit) return null
  const lv = data.lastVisit
  return {
    date: lv.date || undefined,
    diagnosis: lv.diagnosis || undefined,
    symptoms: lv.symptoms
      ? lv.symptoms.split(",").slice(0, 2).map(s => shortenSymptom(s.trim())).join(", ")
      : undefined,
    medication: lv.medication || undefined,
  }
}

// ── Sub-section renderer for History ──

/**
 * Render a history sub-section inline: "Label: Item1 (detail), Item2 (detail)"
 * Uses formatWithHierarchy so item names are dark and bracket content is lighter.
 */
function HistorySubSection({ label, items }) {
  return (
    <>
      <span className="text-tp-slate-400">{label}:&nbsp;</span>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {formatWithHierarchy(item)}
          {i < items.length - 1 && <span className="text-tp-slate-400">, </span>}
        </React.Fragment>
      ))}
    </>
  )
}

// ── Main component ──

export function SbarOverviewCard({ data, onSidebarNav, activeSpecialty }) {
  const situation = buildCardSituationQuote(data, activeSpecialty)

  // ── Background: History sub-sections ──
  const hasConditions = (_nullishCoalesce(_optionalChain([data, 'access', _5 => _5.chronicConditions, 'optionalAccess', _6 => _6.length]), () => ( 0))) > 0
  const hasAllergies = (_nullishCoalesce(_optionalChain([data, 'access', _7 => _7.allergies, 'optionalAccess', _8 => _8.length]), () => ( 0))) > 0
  const hasHistory = hasConditions || hasAllergies

  // ── Assessment: Vitals ──
  const vitals = data.todayVitals
  const vitalEntries = []
  if (vitals) {
    const VITAL_ORDER = ["bp", "pulse", "spo2", "temp", "weight", "rr"] 
    for (const k of VITAL_ORDER) {
      const raw = vitals[k]
      if (!raw) continue
      const meta = VITAL_META.find((m) => m.key === k)
      const label = _optionalChain([meta, 'optionalAccess', _9 => _9.label]) || k
      const unit = _optionalChain([meta, 'optionalAccess', _10 => _10.unit]) || ""
      const flag = parseVitalFlag(k, raw)
      vitalEntries.push({ key: label, value: `${raw}${unit ? " " + unit : ""}`, flag })
    }
  }

  // ── Assessment: Labs ──
  const labEntries = (_nullishCoalesce(data.keyLabs, () => ( []))).slice(0, 4).map(lab => ({
    key: shortenLabName(lab.name),
    value: `${lab.value}${lab.unit ? " " + lab.unit : ""}`,
    flag: lab.flag ,
  }))

  // ── Recommendations ──
  const recommendations = buildRecommendations(data)

  // ── Last visit ──
  const lastVisit = buildLastVisitLine(data)

  return (
    <CardShell
      icon={<span />}
      tpIconName="stethoscope"
      title="Patient Summary"
      dataSources={["EMR Records"]}
      collapsible
    >
      <div className="flex flex-col gap-[8px]">

        {/* ── S — Situation: quoted narrative (no violet stroke) ── */}
        <p className="text-[14px] leading-[1.6] text-tp-slate-500">
          <span className="text-tp-slate-400 select-none">&quot;</span>
          {highlightClinicalText(situation)}
          <span className="text-tp-slate-400 select-none">&quot;</span>
        </p>

        {/* ── B — History: conditions + allergies merged ── */}
        {hasHistory && (
          <div>
            <SectionSummaryBar label="History" icon={SECTION_TAG_ICON_MAP.History || "medical-record"} />
            <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px] pl-[4px] text-[14px] leading-[1.65] text-tp-slate-800">
              {hasConditions && (
                <span className="inline">
                  <span className="text-[13px] text-tp-slate-400">Chronic:&nbsp;</span>
                  {data.chronicConditions.map((c, i, arr) => (
                    <React.Fragment key={i}>
                      {formatWithHierarchy(c, "font-medium text-tp-slate-700", "font-normal text-tp-slate-400")}
                      {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
                    </React.Fragment>
                  ))}
                </span>
              )}
              {hasAllergies && (
                <span className="inline">
                  <span className="text-[13px] text-tp-slate-400">Allergies:&nbsp;</span>
                  {data.allergies.map((a, i, arr) => (
                    <React.Fragment key={i}>
                      <span className="font-medium text-tp-slate-700">{a}</span>
                      {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
                    </React.Fragment>
                  ))}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── A — Today's Vitals (full-width header) ── */}
        {vitalEntries.length > 0 && (
          <div>
            <SectionSummaryBar label="Today's Vitals" icon={SECTION_TAG_ICON_MAP["Today's Vitals"] || "Heart Rate"} />
            <div className="pl-[4px]">
              <InlineDataRow
                tag=""
                values={vitalEntries}
                source="existing"
                onTagClick={onSidebarNav ? () => onSidebarNav("vitals") : undefined}
              />
            </div>
          </div>
        )}

        {/* ── A — Key Labs (full-width header) ── */}
        {labEntries.length > 0 && (
          <div>
            <SectionSummaryBar label="Key Labs" icon={SECTION_TAG_ICON_MAP["Key Labs"] || "Lab"} />
            <div className="pl-[4px]">
              <InlineDataRow
                tag=""
                values={labEntries}
                source="existing"
                onTagClick={onSidebarNav ? () => onSidebarNav("lab-results") : undefined}
              />
            </div>
          </div>
        )}

        {/* ── Last Visit (full-width header) ── */}
        {lastVisit && (
          <div>
            <SectionSummaryBar label="Last Visit" icon={SECTION_TAG_ICON_MAP["Last Visit"] || "medical-report"} />
            <div className="text-[14px] leading-[1.7] text-tp-slate-800 pl-[4px]">

            {lastVisit.date && (
              <span className="font-medium text-tp-slate-700">{lastVisit.date}</span>
            )}
            {lastVisit.symptoms && (
              <>
                <span className="mx-[6px] text-tp-slate-200">|</span>
                <span className="text-tp-slate-400">Sx:&nbsp;</span>
                {lastVisit.symptoms.split(", ").map((s, i, arr) => (
                  <React.Fragment key={i}>
                    {formatWithHierarchy(s.trim(), "text-tp-slate-700", "font-normal text-tp-slate-400")}
                    {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
                  </React.Fragment>
                ))}
              </>
            )}
            {lastVisit.diagnosis && (
              <>
                <span className="mx-[6px] text-tp-slate-200">|</span>
                <span className="text-tp-slate-400">Dx:&nbsp;</span>
                {lastVisit.diagnosis.split(", ").map((d, i, arr) => (
                  <React.Fragment key={i}>
                    {formatWithHierarchy(d.trim(), "font-medium text-tp-slate-700", "font-normal text-tp-slate-400")}
                    {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
                  </React.Fragment>
                ))}
              </>
            )}
            {lastVisit.medication && (
              <>
                <span className="mx-[6px] text-tp-slate-200">|</span>
                <span className="text-tp-slate-400">Rx:&nbsp;</span>
                {splitRespectingParens(lastVisit.medication).map((m, i, arr) => {
                  const shortened = shortenMedication(m)
                  return (
                    <React.Fragment key={i}>
                      {formatWithHierarchy(shortened, "text-tp-slate-700", "font-normal text-tp-slate-400")}
                      {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
                    </React.Fragment>
                  )
                })}
              </>
            )}
            </div>
          </div>
        )}

        {/* ── R — Recommendations (full-width header) ── */}
        {recommendations.length > 0 && (
          <div>
            <SectionSummaryBar label="Recommendations" icon={SECTION_TAG_ICON_MAP["Due Alerts"] || "emergency"} />
            <div className="text-[14px] leading-[1.7] pl-[4px]">
            <ul className="mt-[2px] flex flex-col gap-[2px] ml-[4px]">
              {recommendations.map((rec, i) => {
                return (
                  <li key={i} className="flex items-start gap-[6px]">
                    <span className="mt-[3px] text-[10px] leading-[18px] text-tp-slate-400">●</span>
                    <span className="text-tp-slate-600 text-[14px] leading-[20px]">{highlightRecommendation(rec)}</span>
                  </li>
                )
              })}
            </ul>
            </div>
          </div>
        )}
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
