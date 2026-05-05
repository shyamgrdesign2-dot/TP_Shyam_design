"use client";

import { Eye, Calendar } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { PanelEmptyState } from "./ExpandedPanel";


/**
 * Ophthalmic History Panel
 * ────────────────────────
 * Displays eye examination records with vision charts and IOP readings.
 *
 * Display rules:
 *   - Vision data displayed in a 2-column table (Right/Left eye)
 *   - IOP readings: normal <21 (green), borderline 21-24 (amber), high >24 (red)
 *   - Anterior/Posterior segment findings as descriptive text
 *   - Diagnosis and treatment listed below each entry
 */

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function OphthalCard({ entry, onCopyToRxPad }) {
  const source = `Ophthal — ${formatDate(entry.date)}`;

  return (
    <details open className="group/oph mb-3 last:mb-0">
      <summary className="flex cursor-pointer items-center gap-2 rounded-lg border border-tp-slate-200 bg-white px-3 py-2.5 hover:bg-tp-slate-50 transition-colors [&::-webkit-details-marker]:hidden list-none group-open/oph:rounded-b-none group-open/oph:border-b-0">
        <Calendar size={14} className="shrink-0 text-tp-blue-500" />
        <span className="flex-1 text-[14px] font-semibold text-tp-slate-900">{formatDate(entry.date)}</span>
      </summary>

      <div className="rounded-b-lg border border-t-0 border-tp-slate-200 bg-white p-3 space-y-3">
        {/* Vision Table */}
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500 mb-1.5 block">Vision</span>
          <div className="overflow-hidden rounded-lg border border-tp-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-tp-slate-50">
                  <th className="px-2 py-1.5 text-left font-medium text-tp-slate-500">Eye</th>
                  <th className="px-2 py-1.5 text-center font-medium text-tp-slate-500">Unaided</th>
                  <th className="px-2 py-1.5 text-center font-medium text-tp-slate-500">With Glasses</th>
                  <th className="px-2 py-1.5 text-center font-medium text-tp-slate-500">Pinhole</th>
                  <th className="px-2 py-1.5 text-center font-medium text-tp-slate-500">Near</th>
                </tr>
              </thead>
              <tbody>
                {entry.vision.map((v, i) =>
                <tr key={i} className="border-t border-tp-slate-100">
                    <td className="px-2 py-1.5 font-medium text-tp-slate-700">{v.eye}</td>
                    <td className="px-2 py-1.5 text-center text-tp-slate-800">{v.unaided || "—"}</td>
                    <td className="px-2 py-1.5 text-center text-tp-slate-800">{v.withGlasses || "—"}</td>
                    <td className="px-2 py-1.5 text-center text-tp-slate-800">{v.pinhole || "—"}</td>
                    <td className="px-2 py-1.5 text-center text-tp-slate-800">{v.nearVision || "—"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* IOP */}
        {entry.iop &&
        <div>
            <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500 mb-1.5 block">Intraocular Pressure</span>
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-lg border px-2.5 py-2 ${entry.iop.right > 24 ? "border-tp-error-200 bg-tp-error-50" : entry.iop.right > 21 ? "border-tp-warning-200 bg-tp-warning-50" : "border-tp-slate-200 bg-white"}`}>
                <span className="text-[10px] text-tp-slate-500">Right Eye</span>
                <p className="text-sm font-bold text-tp-slate-800">{entry.iop.right} <span className="text-[10px] font-normal text-tp-slate-400">mmHg</span></p>
              </div>
              <div className={`rounded-lg border px-2.5 py-2 ${entry.iop.left > 24 ? "border-tp-error-200 bg-tp-error-50" : entry.iop.left > 21 ? "border-tp-warning-200 bg-tp-warning-50" : "border-tp-slate-200 bg-white"}`}>
                <span className="text-[10px] text-tp-slate-500">Left Eye</span>
                <p className="text-sm font-bold text-tp-slate-800">{entry.iop.left} <span className="text-[10px] font-normal text-tp-slate-400">mmHg</span></p>
              </div>
            </div>
            <p className="text-[10px] text-tp-slate-400 mt-1">Method: {entry.iop.method}</p>
          </div>
        }

        {/* Segments */}
        {entry.anteriorSegment &&
        <div>
            <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500 mb-1 block">Anterior Segment</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-tp-slate-500">R:</span> <span className="text-tp-slate-800">{entry.anteriorSegment.right}</span></div>
              <div><span className="text-tp-slate-500">L:</span> <span className="text-tp-slate-800">{entry.anteriorSegment.left}</span></div>
            </div>
          </div>
        }
        {entry.posteriorSegment &&
        <div>
            <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500 mb-1 block">Posterior Segment</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-tp-slate-500">R:</span> <span className="text-tp-slate-800">{entry.posteriorSegment.right}</span></div>
              <div><span className="text-tp-slate-500">L:</span> <span className="text-tp-slate-800">{entry.posteriorSegment.left}</span></div>
            </div>
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

export function OphthalPanel({
  entries,
  onCopyToRxPad



}) {
  if (!entries.length) {
    return (
      <PanelEmptyState
        icon={<Eye size={32} />}
        message="No ophthalmic records"
        description="Eye examination records will appear here" />);


  }

  return (
    <div>
      {entries.map((entry) =>
      <OphthalCard key={entry.id} entry={entry} onCopyToRxPad={onCopyToRxPad} />
      )}
    </div>);

}