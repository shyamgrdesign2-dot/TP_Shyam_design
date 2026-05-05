"use client";

import { Activity, Calendar, Heart, Wind, Gauge } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { PanelEmptyState } from "./ExpandedPanel";

import { VITAL_DISPLAY_RULES } from "../sections-types";

/**
 * Vitals Panel
 * ─────────────
 * Displays vital signs history with color-coded status indicators.
 *
 * Display rules:
 *   - Most recent reading is expanded by default, rest collapsed
 *   - Each vital has a status color: normal (green), warning (amber), critical (red), low (blue)
 *   - BP: systolic/diastolic mmHg — red if >140/90, amber if >130/85
 *   - Temperature: highlight if >99°F (warning), >101°F (critical)
 *   - Heart Rate: normal 60-100, warning <60 or >100, critical <50 or >120
 *   - SpO2: normal ≥95%, warning 90-94%, critical <90%
 *   - BMI: normal 18.5-24.9, warning 25-29.9, critical ≥30 or <18.5
 *   - Grid layout: 2 columns for vital cards
 *   - Trend indicator: ↑ ↓ → compared to previous reading
 */

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusDot({ status }) {
  const colors = {
    normal: "bg-tp-success-500",
    warning: "bg-tp-warning-500",
    critical: "bg-tp-error-500",
    low: "bg-tp-blue-500"
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status]}`} />;
}

function VitalCard({
  label,
  value,
  unit,
  status,
  icon






}) {
  const rule = status ? VITAL_DISPLAY_RULES[status] : null;
  const statusBg = rule ? rule.style.split(" ").find((s) => s.startsWith("bg-")) : "";
  const statusText = rule ? rule.style.split(" ").find((s) => s.startsWith("text-")) : "text-tp-slate-800";

  return (
    <div className={`
      group/vital flex flex-col rounded-lg border p-2.5
      ${status === "critical" ?
    "border-tp-error-200 bg-tp-error-50/50" :
    status === "warning" ?
    "border-tp-warning-200 bg-tp-warning-50/30" :
    "border-tp-slate-200 bg-white"}
    `
    }>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-tp-slate-400">{icon}</span>}
        <span className="text-[12px] font-medium text-tp-slate-500">{label}</span>
        {status && <StatusDot status={status} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-base font-bold ${statusText}`}>{value}</span>
        {unit && <span className="text-[12px] text-tp-slate-400">{unit}</span>}
      </div>
    </div>);

}

function VitalReadingCard({
  reading,
  isLatest,
  onCopyToRxPad




}) {
  const sourceLabel = `Vitals — ${formatDate(reading.date)}`;

  const copyAll = () => {
    const items = [];
    if (reading.bloodPressure) items.push(`BP: ${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic} mmHg`);
    if (reading.temperature) items.push(`Temp: ${reading.temperature.value}°${reading.temperature.unit}`);
    if (reading.heartRate) items.push(`HR: ${reading.heartRate.value} bpm`);
    if (reading.respiratoryRate) items.push(`RR: ${reading.respiratoryRate.value}/min`);
    if (reading.spO2) items.push(`SpO2: ${reading.spO2.value}%`);
    if (reading.weight) items.push(`Weight: ${reading.weight.value} ${reading.weight.unit}`);
    if (reading.height) items.push(`Height: ${reading.height.value} ${reading.height.unit}`);
    if (reading.bmi) items.push(`BMI: ${reading.bmi.value}`);
    onCopyToRxPad?.({ target: "vitals", items, source: sourceLabel });
  };

  return (
    <details open={isLatest} className="group/reading mb-3 last:mb-0">
      <summary className="
        flex cursor-pointer items-center gap-2 rounded-lg bg-white
        border border-tp-slate-200 px-3 py-2.5
        hover:bg-tp-slate-50 transition-colors
        [&::-webkit-details-marker]:hidden list-none
        group-open/reading:rounded-b-none group-open/reading:border-b-0
      ">





        
        <Calendar size={14} className="shrink-0 text-tp-blue-500" />
        <span className="flex-1 text-[14px] font-semibold text-tp-slate-900">{formatDate(reading.date)}</span>
        {isLatest &&
        <span className="rounded-full bg-tp-success-50 px-2 py-0.5 text-[10px] font-semibold text-tp-success-600">Latest</span>
        }
        <CopyButton onCopy={copyAll} tooltip="Copy all vitals" showOnHover={false} size={14} />
      </summary>

      <div className="rounded-b-lg border border-t-0 border-tp-slate-200 bg-white p-3">
        <div className="grid grid-cols-2 gap-2">
          {reading.bloodPressure &&
          <VitalCard
            label="Blood Pressure"
            value={`${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic}`}
            unit="mmHg"
            status={reading.bloodPressure.status}
            icon={<Gauge size={13} />} />

          }
          {reading.temperature &&
          <VitalCard
            label="Temperature"
            value={`${reading.temperature.value}`}
            unit={`°${reading.temperature.unit}`}
            status={reading.temperature.status} />

          }
          {reading.heartRate &&
          <VitalCard
            label="Heart Rate"
            value={`${reading.heartRate.value}`}
            unit="bpm"
            status={reading.heartRate.status}
            icon={<Heart size={13} />} />

          }
          {reading.respiratoryRate &&
          <VitalCard
            label="Respiratory Rate"
            value={`${reading.respiratoryRate.value}`}
            unit="/min"
            status={reading.respiratoryRate.status}
            icon={<Wind size={13} />} />

          }
          {reading.spO2 &&
          <VitalCard
            label="SpO2"
            value={`${reading.spO2.value}`}
            unit="%"
            status={reading.spO2.status} />

          }
          {reading.weight &&
          <VitalCard
            label="Weight"
            value={`${reading.weight.value}`}
            unit={reading.weight.unit} />

          }
          {reading.height &&
          <VitalCard
            label="Height"
            value={`${reading.height.value}`}
            unit={reading.height.unit} />

          }
          {reading.bmi &&
          <VitalCard
            label="BMI"
            value={`${reading.bmi.value}`}
            status={reading.bmi.status} />

          }
        </div>
      </div>
    </details>);

}

export function VitalsPanel({
  readings,
  onCopyToRxPad



}) {
  if (!readings.length) {
    return (
      <PanelEmptyState
        icon={<Activity size={32} />}
        message="No vitals recorded"
        description="Vital sign readings will appear here" />);


  }

  return (
    <div>
      {readings.map((reading, idx) =>
      <VitalReadingCard
        key={reading.id}
        reading={reading}
        isLatest={idx === 0}
        onCopyToRxPad={onCopyToRxPad} />

      )}
    </div>);

}