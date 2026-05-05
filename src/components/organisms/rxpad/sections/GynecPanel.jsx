"use client";

import { Heart, Calendar } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { PanelEmptyState } from "./ExpandedPanel";


/**
 * Gynaecological History Panel
 * ────────────────────────────
 * Displays gynaecological records including menstrual history and screenings.
 *
 * Display rules:
 *   - LMP prominently displayed with cycle info
 *   - Pap smear results: Normal (green), Abnormal (red)
 *   - Menstrual regularity indicator
 *   - Complaints and diagnosis with copy support
 */

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function GynecCard({ entry, onCopyToRxPad }) {
  const source = `Gynec — ${formatDate(entry.date)}`;
  const mh = entry.menstrualHistory;

  return (
    <details open className="group/gyn mb-3 last:mb-0">
      <summary className="flex cursor-pointer items-center gap-2 rounded-lg border border-tp-slate-200 bg-white px-3 py-2.5 hover:bg-tp-slate-50 transition-colors [&::-webkit-details-marker]:hidden list-none group-open/gyn:rounded-b-none group-open/gyn:border-b-0">
        <Calendar size={14} className="shrink-0 text-tp-blue-500" />
        <span className="flex-1 text-[14px] font-semibold text-tp-slate-900">{formatDate(entry.date)}</span>
      </summary>

      <div className="rounded-b-lg border border-t-0 border-tp-slate-200 bg-white p-3 space-y-3">
        {/* Menstrual History */}
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500 mb-1.5 block">Menstrual History</span>
          <div className="grid grid-cols-2 gap-2">
            {mh.lmp &&
            <div className="rounded-lg border border-tp-slate-200 bg-tp-slate-50 px-2.5 py-2">
                <span className="text-[10px] text-tp-slate-500">LMP</span>
                <p className="text-xs font-semibold text-tp-slate-800">{formatDate(mh.lmp)}</p>
              </div>
            }
            <div className="rounded-lg border border-tp-slate-200 bg-tp-slate-50 px-2.5 py-2">
              <span className="text-[10px] text-tp-slate-500">Cycle</span>
              <p className="text-xs font-semibold text-tp-slate-800">
                {mh.cycleLength ? `${mh.cycleLength} days` : "—"} / {mh.duration ? `${mh.duration} days` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-tp-slate-200 bg-tp-slate-50 px-2.5 py-2">
              <span className="text-[10px] text-tp-slate-500">Regularity</span>
              <p className={`text-xs font-semibold ${mh.regularity === "Regular" ? "text-tp-success-600" : "text-tp-warning-600"}`}>
                {mh.regularity}
              </p>
            </div>
            <div className="rounded-lg border border-tp-slate-200 bg-tp-slate-50 px-2.5 py-2">
              <span className="text-[10px] text-tp-slate-500">Flow</span>
              <p className={`text-xs font-semibold ${mh.flow === "Heavy" ? "text-tp-warning-600" : "text-tp-slate-800"}`}>
                {mh.flow}
              </p>
            </div>
          </div>
          {mh.dysmenorrhea &&
          <p className="mt-1.5 text-[12px] text-tp-warning-600">Dysmenorrhea present</p>
          }
          {mh.notes &&
          <p className="mt-1 text-[12px] italic text-tp-slate-400">{mh.notes}</p>
          }
        </div>

        {/* Pap Smear */}
        {entry.papSmear &&
        <div>
            <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500 mb-1 block">Pap Smear</span>
            <div className="rounded-lg border border-tp-slate-200 bg-white px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-tp-slate-500">{formatDate(entry.papSmear.date)}</span>
                <span className={`text-xs font-medium ${entry.papSmear.result.toLowerCase().includes("normal") ? "text-tp-success-600" : "text-tp-error-600"}`}>
                  {entry.papSmear.result}
                </span>
              </div>
            </div>
          </div>
        }

        {/* Contraception */}
        {entry.contraception &&
        <div className="flex items-center gap-2 text-xs">
            <span className="text-tp-slate-500">Contraception:</span>
            <span className="font-medium text-tp-slate-800">{entry.contraception}</span>
          </div>
        }

        {/* Diagnosis */}
        {entry.diagnosis && entry.diagnosis.length > 0 &&
        <div>
            <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500 mb-1 block">Diagnosis</span>
            {entry.diagnosis.map((d, i) =>
          <div key={i} className="group/item flex items-start gap-2 py-0.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tp-slate-400" />
                <span className="flex-1 text-xs text-tp-slate-700">{d}</span>
                <CopyButton onCopy={() => onCopyToRxPad?.({ target: "diagnosis", items: [d], source })} size={12} />
              </div>
          )}
          </div>
        }
      </div>
    </details>);

}

export function GynecPanel({
  entries,
  onCopyToRxPad



}) {
  if (!entries.length) {
    return (
      <PanelEmptyState
        icon={<Heart size={32} />}
        message="No gynaecological records"
        description="Gynaecological history will appear here" />);


  }

  return (
    <div>
      {entries.map((entry) =>
      <GynecCard key={entry.id} entry={entry} onCopyToRxPad={onCopyToRxPad} />
      )}
    </div>);

}