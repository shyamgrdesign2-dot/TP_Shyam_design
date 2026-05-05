"use client";

import { ShieldCheck, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { PanelSubSection, PanelEmptyState } from "./ExpandedPanel";

import { VACCINE_STATUS_RULES } from "../sections-types";

/**
 * Vaccination Panel
 * ─────────────────
 * Displays vaccination records grouped by category.
 *
 * Display rules:
 *   - Grouped by vaccine category (COVID-19, Influenza, Hepatitis, etc.)
 *   - Each vaccine shows dose number, date, and status
 *   - Status badges: Completed (green), Due (blue), Overdue (red), Scheduled (violet), Missed (muted strikethrough)
 *   - Overdue vaccines are ALWAYS highlighted with a red border
 *   - Timeline-style layout showing progression of doses
 */

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusIcon({ status }) {
  switch (status) {
    case "Completed":
      return <CheckCircle size={14} className="text-tp-success-500" />;
    case "Due":
      return <Clock size={14} className="text-tp-blue-500" />;
    case "Overdue":
      return <AlertTriangle size={14} className="text-tp-error-500" />;
    case "Scheduled":
      return <Calendar size={14} className="text-tp-violet-500" />;
    case "Missed":
      return <AlertTriangle size={14} className="text-tp-slate-400" />;
  }
}

function VaccineRow({ vaccine, onCopy }) {
  const rule = VACCINE_STATUS_RULES[vaccine.status];

  return (
    <div className={`
      group/item flex items-start gap-2.5 rounded-lg border px-3 py-2 mb-2 last:mb-0
      ${vaccine.status === "Overdue" ? "border-tp-error-200 bg-tp-error-50/50" : "border-tp-slate-200 bg-white"}
    `}>
      <StatusIcon status={vaccine.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${vaccine.status === "Missed" ? "text-tp-slate-500 line-through" : "text-tp-slate-800"}`}>
            {vaccine.dose}
          </span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${rule.style}`}>
            {vaccine.status}
          </span>
        </div>
        <p className="text-[12px] text-tp-slate-500 mt-0.5">
          {vaccine.dateAdministered ?
          formatDate(vaccine.dateAdministered) :
          vaccine.scheduledDate ?
          `Scheduled: ${formatDate(vaccine.scheduledDate)}` :
          "No date"}
        </p>
        {vaccine.batchNumber &&
        <p className="text-[10px] text-tp-slate-400">Batch: {vaccine.batchNumber}</p>
        }
        {vaccine.site &&
        <p className="text-[10px] text-tp-slate-400">Site: {vaccine.site}</p>
        }
      </div>
      <CopyButton onCopy={onCopy} size={12} />
    </div>);

}

export function VaccinePanel({
  categories,
  onCopyToRxPad



}) {
  if (!categories.length) {
    return (
      <PanelEmptyState
        icon={<ShieldCheck size={32} />}
        message="No vaccination records"
        description="Vaccination history will appear here" />);


  }

  const source = "Vaccination Records";

  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const overdueCount = cat.vaccines.filter((v) => v.status === "Overdue").length;

        return (
          <PanelSubSection
            key={cat.category}
            title={cat.category}
            count={cat.vaccines.length}
            actions={
            overdueCount > 0 ?
            <span className="rounded-full bg-tp-error-50 px-1.5 py-0.5 text-[10px] font-semibold text-tp-error-600">
                  {overdueCount} Overdue
                </span> :
            undefined
            }>
            
            {cat.vaccines.map((vaccine) =>
            <VaccineRow
              key={vaccine.id}
              vaccine={vaccine}
              onCopy={() => onCopyToRxPad?.({
                target: "notes",
                items: [`${cat.category} — ${vaccine.vaccineName} ${vaccine.dose}: ${vaccine.status}`],
                source
              })} />

            )}
          </PanelSubSection>);

      })}
    </div>);

}