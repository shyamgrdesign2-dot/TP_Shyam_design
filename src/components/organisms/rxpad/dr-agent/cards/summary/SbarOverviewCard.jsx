"use client";

import React, { useMemo } from "react";

import { CardShell } from "../CardShell";
import { InlineDataRow } from "../InlineDataRow";
import { SECTION_TAG_ICON_MAP } from "../SectionTag";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { formatLastVisitSectionLabel } from "../../shared/formatLastVisitSectionLabel";
import { VITAL_META } from "../../constants";

import { highlightClinicalText } from "../../shared/highlightClinicalText";
import { formatWithHierarchy } from "../../shared/formatWithHierarchy";
import { SECTION_INLINE_SUBKEY_CLASS } from "../../shared/sectionInlineKey";
import { buildCardSituationQuote } from "../../shared/buildCoreNarrative";
import { buildRecommendationsForSummaryCard } from "../../shared/patientRecommendations";

// ── Shared helpers ──

const LAB_SHORT_NAMES = {
  "HbA1c": "HbA1c", "Fasting Glucose": "F.Glucose", "Fasting Blood Sugar": "FBS",
  "TSH": "TSH", "LDL": "LDL", "HDL": "HDL", "Vitamin D": "Vit D",
  "Creatinine": "Creat", "Microalbumin": "Microalb", "Hemoglobin": "Hb",
  "Triglycerides": "TG", "Total Cholesterol": "T.Chol", "eGFR": "eGFR",
  "Potassium": "K+", "Phosphorus": "Phos", "Calcium": "Ca", "PTH": "PTH",
  "Uric Acid": "UA", "WBC": "WBC", "Platelet": "Plt"
};

function shortenLabName(name) {
  return LAB_SHORT_NAMES[name] || name;
}



function parseVitalFlag(key, raw) {
  const meta = VITAL_META.find((m) => m.key === key);
  if (!meta) return undefined;
  if (key === "bp") {
    const sys = parseInt(raw.split("/")[0], 10);
    if (isNaN(sys)) return undefined;
    if (sys >= 140) return "high";
    if (sys <= 90) return "low";
    return "normal";
  }
  const num = parseFloat(raw);
  if (isNaN(num)) return undefined;
  if (meta.isAbnormal(num)) {
    if (key === "spo2") return "low";
    if (key === "temp") return "high";
    if (key === "bmi") return num > 30 ? "high" : "low";
    return num > 100 ? "high" : "low";
  }
  return "normal";
}

function shortenMedication(raw) {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 0) return raw;
  const drugName = parts[0];
  if (parts.length > 1 && /^\d+/.test(parts[1]) && !/^\d+-\d+/.test(parts[1])) {
    return `${drugName} ${parts[1]}`;
  }
  return drugName;
}

/** Split by commas but respect parenthetical groups */
function splitRespectingParens(str) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of str) {
    if (ch === "(") depth++;else
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Shorten symptom — "Fever (2d, high, evening spikes)" → "Fever (2d)" */
function shortenSymptom(raw) {
  const match = raw.match(/^([^(]+)\(([^,)]+)/);
  if (match) {
    const name = match[1].trim();
    const firstDetail = match[2].trim();
    if (/\d/.test(firstDetail)) return `${name} (${firstDetail})`;
    return name;
  }
  return raw.trim();
}

/**
 * Highlight clinical keywords in recommendation text.
 * Matches vitals (BP, SpO₂, HbA1c), clinical terms, values with units,
 * and action words — wraps them in semibold + darker color.
 */
function highlightRecommendation(text) {
  // Critical / urgent phrases → red; labs, vitals, dialysis context → bold slate
  const criticalPattern = /(\b(?:overdue|critically low|severely elevated|hypertensive urgency|hypotension|critical|urgent|immediately|uncontrolled|acidosis|Hyperkalaemia|Hyperkalemia|Hypokalaemia|Hypokalemia)\b|\bMetabolic acidosis\b)/gi;
  const valuePattern = /(\b(?:BP|SpO[₂2]|HbA1c|eGFR|LDL|HDL|TSH|PTH|Creatinine|Lipid Profile|Hemoglobin|WBC|INR|EPO|K\+|Potassium|Sodium|Na\+|Bicarbonate|Bicarb|PD)\b|K\+\s*\d+(?:\.\d+)?|Bicarb(?:onate)?\s*\d+(?:\.\d+)?|\d+\/\d+(?:\s*mmHg)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?°F|\d+\s*days?|\d+(?:\.\d+)?\s*mg\/(?:dL|L)|\d+(?:\.\d+)?\s*m[Ll]\/min)/gi;
  const pattern = new RegExp(`(${criticalPattern.source})|(${valuePattern.source})`, "gi");
  const result = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    // Critical terms in tp-error-600, values in tp-slate-700 bold
    const isCritical = criticalPattern.test(match[0]);
    criticalPattern.lastIndex = 0; // reset regex
    result.push(
      <span key={match.index} className={isCritical ? "font-semibold text-tp-error-600" : "font-semibold text-tp-slate-700"}>{match[0]}</span>
    );
    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 1 ? <>{result}</> : text;
}

/** Build a short last visit summary line */
function buildLastVisitLine(data) {
  if (!data.lastVisit) return null;
  const lv = data.lastVisit;
  return {
    date: lv.date || undefined,
    diagnosis: lv.diagnosis || undefined,
    symptoms: lv.symptoms ?
    lv.symptoms.split(",").slice(0, 2).map((s) => shortenSymptom(s.trim())).join(", ") :
    undefined,
    medication: lv.medication || undefined
  };
}

// ── History: one line per type — "Category: item | item | …" (muted label; pipe between items; no row dividers) ──



function buildHistorySegments(data) {
  const segments = [];
  if ((data.chronicConditions?.length ?? 0) > 0) {
    segments.push({ key: "chronic", label: "Chronic", items: data.chronicConditions });
  }
  if ((data.allergies?.length ?? 0) > 0) {
    segments.push({ key: "allergies", label: "Allergies", items: data.allergies });
  }
  if ((data.lifestyleNotes?.length ?? 0) > 0) {
    segments.push({ key: "lifestyle", label: "Lifestyle", items: data.lifestyleNotes });
  }
  if ((data.familyHistory?.length ?? 0) > 0) {
    segments.push({ key: "family", label: "Family history", items: data.familyHistory });
  }
  if ((data.surgicalHistory?.length ?? 0) > 0) {
    segments.push({ key: "surgical", label: "Surgical history", items: data.surgicalHistory });
  }
  if ((data.additionalHistory?.length ?? 0) > 0) {
    segments.push({ key: "other", label: "Other", items: data.additionalHistory });
  }
  return segments;
}

// ── Main component ──








export function SbarOverviewCard({ data, onSidebarNav, activeSpecialty }) {
  const situation = buildCardSituationQuote(data, activeSpecialty);

  const historySegments = useMemo(() => buildHistorySegments(data), [data]);

  // ── Assessment: Vitals ──
  const vitals = data.todayVitals;
  const vitalEntries = [];
  if (vitals) {
    const VITAL_ORDER = ["bp", "pulse", "spo2", "temp", "weight", "rr"];
    for (const k of VITAL_ORDER) {
      const raw = vitals[k];
      if (!raw) continue;
      const meta = VITAL_META.find((m) => m.key === k);
      const label = meta?.label || k;
      const unit = meta?.unit || "";
      const flag = parseVitalFlag(k, raw);
      vitalEntries.push({ key: label, value: `${raw}${unit ? " " + unit : ""}`, flag });
    }
  }

  // ── Assessment: Labs ──
  const labEntries = (data.keyLabs ?? []).slice(0, 4).map((lab) => ({
    key: shortenLabName(lab.name),
    value: `${lab.value}${lab.unit ? " " + lab.unit : ""}`,
    flag: lab.flag
  }));

  // ── Recommendations ──
  const recommendations = buildRecommendationsForSummaryCard(data);

  // ── Last visit ──
  const lastVisit = buildLastVisitLine(data);

  return (
    <CardShell
      icon={<span />}
      tpIconName="stethoscope"
      title="Patient Summary"
      dataSources={["EMR Records"]}
      collapsible>
      
      <div className="flex flex-col gap-[8px]">

        {/* ── S — Situation: quoted narrative (no violet stroke) ── */}
        <p className="text-[14px] leading-[1.6] text-tp-slate-500">
          <span className="text-tp-slate-400 select-none">&quot;</span>
          {highlightClinicalText(situation)}
          <span className="text-tp-slate-400 select-none">&quot;</span>
        </p>

        {/* ── B — Medical history: ● pointer per subsection (same as Recommendations); "Category: a | b" ── */}
        {historySegments.length > 0 &&
        <div>
            <SectionSummaryBar label="Medical History" icon={SECTION_TAG_ICON_MAP["Medical History"] || "medical-record"} />
            <div className="pl-[4px] text-[14px] leading-[1.65]">
              <ul className="mt-[1px] flex list-none flex-col gap-[10px]">
                {historySegments.map((seg) =>
              <li key={seg.key} className="flex items-start gap-[6px]">
                    <span className="mt-[3px] shrink-0 text-[10px] leading-[18px] text-tp-slate-400">●</span>
                    <div className="min-w-0 break-words">
                      <span className={SECTION_INLINE_SUBKEY_CLASS}>{seg.label}: </span>
                      {seg.items.map((item, i, arr) =>
                  <React.Fragment key={i}>
                          {formatWithHierarchy(item, "font-medium text-tp-slate-700", "font-normal text-tp-slate-400")}
                          {i < arr.length - 1 && <span className="text-tp-slate-400"> | </span>}
                        </React.Fragment>
                  )}
                    </div>
                  </li>
              )}
              </ul>
            </div>
          </div>
        }

        {/* ── A — Today's Vitals (full-width header) ── */}
        {vitalEntries.length > 0 &&
        <div>
            <SectionSummaryBar label="Today's Vitals" icon={SECTION_TAG_ICON_MAP["Today's Vitals"] || "Heart Rate"} />
            <div className="pl-[4px]">
              <InlineDataRow
              tag=""
              values={vitalEntries}
              source="existing"
              onTagClick={onSidebarNav ? () => onSidebarNav("vitals") : undefined} />
            
            </div>
          </div>
        }

        {/* ── A — Key Labs (full-width header) ── */}
        {labEntries.length > 0 &&
        <div>
            <SectionSummaryBar label="Key Labs" icon={SECTION_TAG_ICON_MAP["Key Labs"] || "Lab"} />
            <div className="pl-[4px]">
              <InlineDataRow
              tag=""
              values={labEntries}
              source="existing"
              onTagClick={onSidebarNav ? () => onSidebarNav("lab-results") : undefined} />
            
            </div>
          </div>
        }

        {/* ── Last Visit (full-width header) ── */}
        {lastVisit &&
        <div>
            <SectionSummaryBar
            label={formatLastVisitSectionLabel(data.lastVisit?.date)}
            icon={SECTION_TAG_ICON_MAP["Last Visit"] || "medical-report"} />
          
            <div className="pl-[4px] text-[14px] leading-[1.65] text-tp-slate-800">
              {lastVisit.symptoms &&
            <>
                  <span className={SECTION_INLINE_SUBKEY_CLASS}>Sx:&nbsp;</span>
                  {lastVisit.symptoms.split(", ").map((s, i, arr) =>
              <React.Fragment key={i}>
                      {formatWithHierarchy(s.trim(), "text-tp-slate-700", "font-normal text-tp-slate-400")}
                      {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
                    </React.Fragment>
              )}
                </>
            }
              {lastVisit.diagnosis &&
            <>
                  {lastVisit.symptoms ? <span className="mx-[6px] text-tp-slate-200">|</span> : null}
                  <span className={SECTION_INLINE_SUBKEY_CLASS}>Dx:&nbsp;</span>
                  {lastVisit.diagnosis.split(", ").map((d, i, arr) =>
              <React.Fragment key={i}>
                      {formatWithHierarchy(d.trim(), "font-medium text-tp-slate-700", "font-normal text-tp-slate-400")}
                      {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
                    </React.Fragment>
              )}
                </>
            }
              {lastVisit.medication &&
            <>
                  {lastVisit.symptoms || lastVisit.diagnosis ? <span className="mx-[6px] text-tp-slate-200">|</span> : null}
                  <span className={SECTION_INLINE_SUBKEY_CLASS}>Rx:&nbsp;</span>
                  {splitRespectingParens(lastVisit.medication).map((m, i, arr) => {
                const shortened = shortenMedication(m);
                return (
                  <React.Fragment key={i}>
                        {formatWithHierarchy(shortened, "text-tp-slate-700", "font-normal text-tp-slate-400")}
                        {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
                      </React.Fragment>);

              })}
                </>
            }
            </div>
          </div>
        }

        {/* ── R — Recommendations (full-width header) ── */}
        {recommendations.length > 0 &&
        <div>
            <SectionSummaryBar label="Recommendations" icon={SECTION_TAG_ICON_MAP["Due Alerts"] || "emergency"} />
            <div className="pl-[4px] text-[14px] leading-[1.65]">
              <ul className="mt-[1px] flex list-none flex-col gap-[10px]">
                {recommendations.map((rec, i) =>
              <li key={i} className="flex items-start gap-[6px]">
                    <span className="mt-[3px] shrink-0 text-[10px] leading-[18px] text-tp-slate-400">●</span>
                    <span className="min-w-0 break-words text-[14px] leading-[1.5] text-tp-slate-600">
                      {highlightRecommendation(rec)}
                    </span>
                  </li>
              )}
              </ul>
            </div>
          </div>
        }
      </div>
    </CardShell>);

}