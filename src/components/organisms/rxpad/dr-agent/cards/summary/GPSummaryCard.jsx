"use client";

import React from "react";

import { CardShell } from "../CardShell";
import { InlineDataRow } from "../InlineDataRow";
// InsightBox removed — cross-problem flags now rendered inline

import { SidebarLink } from "../SidebarLink";
import { EmbeddedSpecialtyBox } from "./EmbeddedSpecialtyBox";
import { VITAL_META } from "../../constants";

import { highlightClinicalText } from "../../shared/highlightClinicalText";
import { buildCardSituationQuote } from "../../shared/buildCoreNarrative";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { SECTION_TAG_ICON_MAP } from "../SectionTag";
import { formatLastVisitSectionLabel } from "../../shared/formatLastVisitSectionLabel";


const LAB_SHORT_NAMES = {
  "HbA1c": "HbA1c",
  "Fasting Glucose": "F.Glucose",
  "Fasting Blood Sugar": "FBS",
  "TSH": "TSH",
  "LDL": "LDL",
  "HDL": "HDL",
  "Vitamin D": "Vit D",
  "Creatinine": "Creat",
  "Microalbumin": "Microalb",
  "Hemoglobin": "Hb",
  "Triglycerides": "TG",
  "Total Cholesterol": "T.Chol"
};

function shortenLabName(fullName) {
  return LAB_SHORT_NAMES[fullName] || fullName;
}












/* -- helpers ------------------------------------------------- */



function parseVitalFlag(key, raw) {
  const meta = VITAL_META.find((m) => m.key === key);
  if (!meta) return undefined;
  // For BP, check systolic
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
    // Determine direction heuristically based on thresholds
    if (key === "spo2") return "low";
    if (key === "temp") return "high";
    if (key === "bmi") return num > 30 ? "high" : "low";
    return num > 100 ? "high" : "low";
  }
  return "normal";
}

/** Split a comma-separated string while respecting parentheses. */
function splitRespectingParens(str) {
  const results = [];
  let depth = 0;
  let current = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      results.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) results.push(current.trim());
  return results;
}

/**
 * Shorten a symptom string.
 * "Fever (2d, high, evening spikes)" -> "Fever 2d"
 * "Eye redness (2d, bilateral)" -> "Eye redness 2d"
 * "Headache" -> "Headache"
 */
function shortenSymptom(raw) {
  const match = raw.match(/^([^(]+)\(([^,)]+)/);
  if (match) {
    const name = match[1].trim();
    const firstDetail = match[2].trim();
    // Include first detail if it looks like a duration (contains d/w/m or digits)
    if (/\d/.test(firstDetail)) {
      return `${name} (${firstDetail})`;
    }
    return name;
  }
  return raw.trim();
}

/**
 * Shorten medication string to just drug name (+ strength if present).
 * "Telma20 1-0-0-1 BF" -> "Telma20"
 * "Metsmail 500 1-0-0-0 BF" -> "Metsmail 500"
 * "Paracetamol 650 SOS" -> "Paracetamol 650"
 */
function shortenMedication(raw) {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 0) return raw;
  // drug name is first token; if second token is a number (strength), include it
  const drugName = parts[0];
  if (parts.length > 1 && /^\d+/.test(parts[1]) && !/^\d+-\d+/.test(parts[1])) {
    return `${drugName} ${parts[1]}`;
  }
  return drugName;
}

/* -- narrative snapshot helpers ------------------------------ */

/**
 * Opening situation line for the detailed Patient Summary card (same body treatment as
 * SbarOverviewCard): plain 14px slate paragraph + typographic quote marks, not italic / no callout box.
 * Intake-first when symptom collector exists (see buildCardSituationQuote).
 */
export function buildSummaryNarrative(
data,
specialty)
{
  const quote = buildCardSituationQuote(data, specialty);
  if (!quote) return null;
  return [<span key="situation-quote">{highlightClinicalText(quote)}</span>];
}

/* -- component ----------------------------------------------- */

export function GPSummaryCard({ data, onPillTap, onSidebarNav, defaultCollapsed, hideNarrative, activeSpecialty }) {
  const hasSpecialty =
  !!data.obstetricData ||
  !!data.pediatricsData ||
  !!data.gynecData ||
  !!data.ophthalData;

  /* - Vitals row - */
  const vitalsValues = data.todayVitals ?

  [
  data.todayVitals.bp && {
    key: "BP",
    value: data.todayVitals.bp,
    flag: parseVitalFlag("bp", data.todayVitals.bp)
  },
  data.todayVitals.pulse && {
    key: "Pulse",
    value: `${data.todayVitals.pulse} bpm`,
    flag: parseVitalFlag("pulse", data.todayVitals.pulse)
  },
  data.todayVitals.spo2 && {
    key: "SpO\u2082",
    value: `${data.todayVitals.spo2}%`,
    flag: parseVitalFlag("spo2", data.todayVitals.spo2)
  },
  data.todayVitals.temp && {
    key: "Temp",
    value: `${data.todayVitals.temp}\u00B0F`,
    flag: parseVitalFlag("temp", data.todayVitals.temp)
  },
  data.todayVitals.weight && {
    key: "Wt",
    value: `${data.todayVitals.weight} kg`
  }].
  filter(Boolean) :

  [];

  /* - Labs row - */
  const labsValues = data.keyLabs ?
  data.keyLabs.
  slice(0, 3).
  map((lab) => ({
    key: shortenLabName(lab.name),
    value: `${lab.value}${lab.unit ? ` ${lab.unit}` : ""}`,
    flag: lab.flag === "high" ? "high" : lab.flag === "low" ? "low" : lab.flag === "critical" ? "high" : undefined
  })) :
  [];

  /* - History row - */
  const historyValues = [];
  if (data.chronicConditions && data.chronicConditions.length > 0) {
    historyValues.push({ key: "Chronic", value: data.chronicConditions.join(", ") });
  }
  if (data.allergies && data.allergies.length > 0) {
    historyValues.push({ key: "Allergies", value: data.allergies.join(", ") });
  }

  /* - Last Visit row (shortened) - */
  const lastVisitValues = [];
  if (data.lastVisit) {
    if (data.lastVisit.symptoms) {
      const shortened = splitRespectingParens(data.lastVisit.symptoms).
      map(shortenSymptom).
      join(", ");
      lastVisitValues.push({ key: "Sx", value: shortened });
    }
    if (data.lastVisit.diagnosis) {
      lastVisitValues.push({ key: "Dx", value: data.lastVisit.diagnosis });
    }
    if (data.lastVisit.medication) {
      const shortened = splitRespectingParens(data.lastVisit.medication).
      map(shortenMedication).
      join(", ");
      lastVisitValues.push({ key: "Rx", value: shortened });
    }
  }

  /* - Action pills — data-aware (only show if data exists) - */
  const pills = [];
  if (data.lastVisit) pills.push({ label: "Last visit details" });
  if (data.keyLabs && data.keyLabs.length > 0) {
    pills.push({ label: data.labFlagCount > 0 ? `Labs (${data.labFlagCount} flagged)` : "Labs" });
  }
  if (data.todayVitals && Object.keys(data.todayVitals).length > 0) pills.push({ label: "Vital trends" });
  if (pills.length === 0) pills.push({ label: "Suggest DDX" });
  pills.push({ label: "Ask me anything" });

  /* - Cross-problem flags (max 2 high-severity) - */
  const highSeverityFlags = (data.crossProblemFlags || []).
  filter((f) => f.severity === "high").
  slice(0, 2);

  /* - Clinical narrative — compact patient snapshot at top of card.
       Uses patientNarrative (if available) or auto-generates from
       chronic conditions + medications + allergies. - */
  const narrativeParts = buildSummaryNarrative(data, activeSpecialty);

  /* - Section ordering — most actionable first:
       1. Today's Vitals — current state, what needs attention now
       2. Key Labs — lab values with provenance flags
       3. History — chronic conditions, allergies
       4. Last Visit — previous care context
     Narrative (quick snapshot) is shown separately in the intro flow. - */
  const sections = [];

  // Current vitals — what needs attention today
  if (vitalsValues.length > 0) {
    sections.push({
      id: "vitals",
      node:
      <div>
          <SectionSummaryBar label="Today's Vitals" icon={SECTION_TAG_ICON_MAP["Today's Vitals"]} />
          <div className="pl-[4px]">
            <InlineDataRow
            tag=""
            values={vitalsValues}
            onTagClick={() => onSidebarNav?.("vitals")}
            source="existing" />
          
          </div>
        </div>

    });
  }

  // Lab results with flags and provenance
  if (labsValues.length > 0) {
    sections.push({
      id: "labs",
      node:
      <div>
          <SectionSummaryBar label="Key Labs" icon={SECTION_TAG_ICON_MAP["Key Labs"]} />
          <div className="pl-[4px]">
            <InlineDataRow
            tag=""
            values={labsValues}
            onTagClick={() => onSidebarNav?.("labResults")}
            source="existing" />
          
          </div>
        </div>

    });
  }

  // Chronic conditions, allergies, medical history
  if (historyValues.length > 0) {
    sections.push({
      id: "history",
      node:
      <div>
          <SectionSummaryBar label="Medical History" icon={SECTION_TAG_ICON_MAP["Medical History"]} />
          <div className="pl-[4px]">
            <InlineDataRow
            tag=""
            values={historyValues}
            onTagClick={() => onSidebarNav?.("history")}
            source="existing" />
          
          </div>
        </div>

    });
  }

  // Previous care context
  if (lastVisitValues.length > 0) {
    sections.push({
      id: "lastVisit",
      node:
      <div>
          <SectionSummaryBar
          label={formatLastVisitSectionLabel(data.lastVisit?.date)}
          icon={SECTION_TAG_ICON_MAP["Last Visit"]} />
        
          <div className="pl-[4px]">
            <InlineDataRow
            tag=""
            values={lastVisitValues}
            onTagClick={() => onSidebarNav?.("pastVisits")}
            source="existing"
            allowCopyToRxPad={true}
            trailingNote={data.lastVisit?.doctorName ? `${data.lastVisit.doctorName}` : undefined} />
          
          </div>
        </div>

    });
  }

  return (
    <CardShell
      icon={<span />}
      tpIconName="stethoscope"
      title="Patient Summary"
      collapsible
      defaultCollapsed={defaultCollapsed}
      dataSources={["EMR Records", "Past Visit History"]}
      sidebarLink={
      onSidebarNav ?
      <SidebarLink
        text="View all past visits"
        onClick={() => onSidebarNav("pastVisits")} /> :

      undefined
      }>
      
      <div className="flex flex-col gap-[8px]">
        {/* Clinical narrative — compact patient snapshot (hidden when detailed summary is triggered) */}
        {!hideNarrative && narrativeParts && narrativeParts.length > 0 &&
        <p className="text-[14px] leading-[1.6] text-tp-slate-500">
            <span className="text-tp-slate-400 select-none">&quot;</span>
            {narrativeParts}
            <span className="text-tp-slate-400 select-none">&quot;</span>
          </p>
        }

        {sections.map((section) =>
        <React.Fragment key={section.id}>
            {section.node}
          </React.Fragment>
        )}

        {/* Specialty embed */}
        {hasSpecialty &&
        <div className="mt-[2px]">
            <EmbeddedSpecialtyBox data={data} />
          </div>
        }

        {/* Cross-problem flags — inline text with severity dot */}
        {highSeverityFlags.map((flag, i) =>
        <div key={i} className="flex items-start gap-[6px] text-[14px] leading-[1.6]">
            <span className={`mt-[6px] h-[6px] w-[6px] rounded-full flex-shrink-0 ${flag.severity === "high" ? "bg-tp-error-500" : "bg-tp-warning-500"}`} />
            <span className="text-tp-slate-600">{flag.text}</span>
          </div>
        )}
      </div>
    </CardShell>);

}