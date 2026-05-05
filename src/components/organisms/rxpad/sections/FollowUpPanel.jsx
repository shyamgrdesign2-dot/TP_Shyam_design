"use client";

import { Calendar, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { PanelEmptyState } from "./ExpandedPanel";

import { FOLLOW_UP_STATUS_RULES } from "../sections-types";

/**
 * Follow-Up Panel
 * ───────────────
 * Displays scheduled and completed follow-up appointments.
 *
 * Display rules:
 *   - Upcoming (Scheduled) appointments shown first, highlighted
 *   - Completed appointments shown in muted style
 *   - Missed appointments shown with red indicator
 *   - Each entry shows: date, reason, doctor, status, visit type
 *   - Reminder status indicator
 */

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusIcon({ status }) {
  switch (status) {
    case "Scheduled":return <Clock size={14} className="text-tp-blue-500" />;
    case "Completed":return <CheckCircle size={14} className="text-tp-success-500" />;
    case "Missed":return <XCircle size={14} className="text-tp-error-500" />;
    case "Cancelled":return <XCircle size={14} className="text-tp-slate-400" />;
    case "Rescheduled":return <RefreshCw size={14} className="text-tp-warning-500" />;
  }
}

function FollowUpCard({ entry, onCopy }) {
  const rule = FOLLOW_UP_STATUS_RULES[entry.status];
  const isUpcoming = entry.status === "Scheduled" || entry.status === "Rescheduled";

  return (
    <div className={`
      group/item flex items-start gap-2.5 rounded-lg border px-3 py-2.5 mb-2 last:mb-0
      ${isUpcoming ? "border-tp-blue-200 bg-tp-blue-50/30" : "border-tp-slate-200 bg-white"}
    `}>
      <StatusIcon status={entry.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${
          entry.status === "Missed" ? "text-tp-error-600" :
          entry.status === "Cancelled" ? "text-tp-slate-500 line-through" :
          "text-tp-slate-800"}`
          }>
            {formatDate(entry.scheduledDate)}
          </span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${rule.style}`}>
            {entry.status}
          </span>
        </div>
        <p className="text-[12px] text-tp-slate-700 mt-0.5">{entry.reason}</p>
        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-tp-slate-400">
          {entry.doctorName && <span>{entry.doctorName}</span>}
          <span className="rounded bg-tp-slate-100 px-1 py-0.5">{entry.visitType}</span>
          {entry.reminderSent &&
          <span className="text-tp-success-500">Reminder sent</span>
          }
        </div>
        {entry.notes &&
        <p className="text-[10px] italic text-tp-slate-400 mt-0.5">{entry.notes}</p>
        }
      </div>
      <CopyButton onCopy={onCopy} size={12} />
    </div>);

}

export function FollowUpPanel({
  entries,
  onCopyToRxPad



}) {
  if (!entries.length) {
    return (
      <PanelEmptyState
        icon={<Calendar size={32} />}
        message="No follow-ups"
        description="Follow-up appointments will appear here" />);


  }

  const source = "Follow-up";

  // Sort: upcoming first, then by date descending
  const sorted = [...entries].sort((a, b) => {
    const aUpcoming = a.status === "Scheduled" || a.status === "Rescheduled" ? 0 : 1;
    const bUpcoming = b.status === "Scheduled" || b.status === "Rescheduled" ? 0 : 1;
    if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
    return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
  });

  return (
    <div>
      {sorted.map((entry) =>
      <FollowUpCard
        key={entry.id}
        entry={entry}
        onCopy={() => onCopyToRxPad?.({
          target: "follow-up",
          items: [`${formatDate(entry.scheduledDate)} — ${entry.reason}`],
          source
        })} />

      )}
    </div>);

}