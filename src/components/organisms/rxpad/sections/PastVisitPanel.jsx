"use client";

import { Calendar, HeartPulse, Award, Pill, ClipboardList, ChevronRight } from "lucide-react";
import { CopyButton, CopySectionButton } from "./CopyButton";
import { PanelEmptyState } from "./ExpandedPanel";


/**
 * Past Visit Panel
 * ─────────────────
 * Displays chronological list of past visits with full clinical details.
 *
 * Display rules:
 *   - Most recent visit is shown first (descending date order)
 *   - Each visit is a collapsible card with date + visit type header
 *   - Sections within a visit: Symptoms, Examination, Diagnosis, Medications, Advices
 *   - Every item has a copy-to-RxPad button (visible on hover, always on touch)
 *   - Section headers have "Copy All" to copy entire section
 *   - Date header has a copy icon that copies the entire visit
 *   - Visit type chips: OPD (blue), IPD (violet), Emergency (red), Teleconsult (amber)
 *
 * Color coding:
 *   - Visit card: white bg, 1px slate-200 border, radius 10px
 *   - Date: TP Slate 900, 14px semibold
 *   - Doctor name: TP Slate 500, 12px medium
 *   - Section titles: TP Slate 500, 12px uppercase tracking
 *   - Items: TP Slate 800, 12px regular
 *   - Dividers: TP Slate 100
 */

const visitTypeStyles = {
  OPD: "bg-tp-blue-50 text-tp-blue-600",
  IPD: "bg-tp-violet-50 text-tp-violet-600",
  Emergency: "bg-tp-error-50 text-tp-error-600",
  Teleconsult: "bg-tp-warning-50 text-tp-warning-600"
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function VisitItemRow({
  text,
  onCopy



}) {
  return (
    <div className="group/item flex items-start gap-2 py-0.5">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tp-slate-400" />
      <span className="flex-1 text-xs text-tp-slate-700 leading-relaxed">{text}</span>
      <CopyButton onCopy={onCopy} size={12} tooltip="Copy to RxPad" />
    </div>);

}

function MedicationRow({
  med,
  onCopy



}) {
  return (
    <div className="group/item flex items-start gap-2 py-1 border-b border-tp-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-tp-slate-800">{med.name}</p>
        <p className="text-[12px] text-tp-slate-500">
          {med.dosage} &middot; {med.frequency} &middot; {med.duration}
        </p>
      </div>
      <CopyButton onCopy={onCopy} size={12} tooltip="Copy medication" />
    </div>);

}

function VisitCard({
  visit,
  onCopyToRxPad



}) {
  const sourceLabel = `Past Visit — ${formatDate(visit.date)}`;

  return (
    <details open className="group/visit mb-3 last:mb-0">
      <summary className="
        flex cursor-pointer items-center gap-2 rounded-t-[10px] bg-white
        border border-tp-slate-200 px-3 py-2.5
        hover:bg-tp-slate-50 transition-colors
        [&::-webkit-details-marker]:hidden list-none
        group-open/visit:rounded-b-none group-open/visit:border-b-0
      ">





        
        <Calendar size={16} className="shrink-0 text-tp-blue-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-tp-slate-900">{formatDate(visit.date)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${visitTypeStyles[visit.visitType]}`}>
              {visit.visitType}
            </span>
          </div>
          <p className="text-[12px] text-tp-slate-500 mt-0.5">{visit.doctorName}{visit.speciality ? ` — ${visit.speciality}` : ""}</p>
        </div>
        <CopyButton
          onCopy={() => onCopyToRxPad?.({
            target: "symptoms",
            items: [...visit.symptoms, ...visit.examination, ...visit.diagnosis.map((d) => d)],
            source: sourceLabel
          })}
          tooltip="Copy entire visit to RxPad"
          showOnHover={false}
          size={14} />
        
        <ChevronRight
          size={14}
          className="shrink-0 text-tp-slate-400 transition-transform group-open/visit:rotate-90" />
        
      </summary>

      <div className="rounded-b-[10px] border border-t-0 border-tp-slate-200 bg-white px-3 py-2 space-y-3">
        {/* Symptoms */}
        {visit.symptoms.length > 0 &&
        <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <HeartPulse size={13} className="text-tp-slate-400" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500">Symptoms</span>
              </div>
              <CopySectionButton
              label="Copy All"
              onCopy={() => onCopyToRxPad?.({
                target: "symptoms",
                items: visit.symptoms,
                source: sourceLabel
              })} />
            
            </div>
            {visit.symptoms.map((s, i) =>
          <VisitItemRow
            key={i}
            text={s}
            onCopy={() => onCopyToRxPad?.({ target: "symptoms", items: [s], source: sourceLabel })} />

          )}
          </div>
        }

        {/* Examination */}
        {visit.examination.length > 0 &&
        <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Award size={13} className="text-tp-slate-400" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500">Examination</span>
              </div>
              <CopySectionButton
              label="Copy All"
              onCopy={() => onCopyToRxPad?.({
                target: "examinations",
                items: visit.examination,
                source: sourceLabel
              })} />
            
            </div>
            {visit.examination.map((e, i) =>
          <VisitItemRow
            key={i}
            text={e}
            onCopy={() => onCopyToRxPad?.({ target: "examinations", items: [e], source: sourceLabel })} />

          )}
          </div>
        }

        {/* Diagnosis */}
        {visit.diagnosis.length > 0 &&
        <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <ClipboardList size={13} className="text-tp-slate-400" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500">Diagnosis</span>
              </div>
              <CopySectionButton
              label="Copy All"
              onCopy={() => onCopyToRxPad?.({
                target: "diagnosis",
                items: visit.diagnosis,
                source: sourceLabel
              })} />
            
            </div>
            {visit.diagnosis.map((d, i) =>
          <VisitItemRow
            key={i}
            text={d}
            onCopy={() => onCopyToRxPad?.({ target: "diagnosis", items: [d], source: sourceLabel })} />

          )}
          </div>
        }

        {/* Medications */}
        {visit.medications.length > 0 &&
        <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Pill size={13} className="text-tp-slate-400" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500">Medications</span>
              </div>
              <CopySectionButton
              label="Copy All"
              onCopy={() => onCopyToRxPad?.({
                target: "medications",
                items: visit.medications.map((m) => `${m.name} ${m.dosage} ${m.frequency} ${m.duration}`),
                source: sourceLabel
              })} />
            
            </div>
            {visit.medications.map((m, i) =>
          <MedicationRow
            key={i}
            med={m}
            onCopy={() => onCopyToRxPad?.({
              target: "medications",
              items: [`${m.name} ${m.dosage} ${m.frequency} ${m.duration}`],
              source: sourceLabel
            })} />

          )}
          </div>
        }

        {/* Advices */}
        {visit.advices && visit.advices.length > 0 &&
        <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500">Advices</span>
              <CopySectionButton
              label="Copy All"
              onCopy={() => onCopyToRxPad?.({
                target: "advices",
                items: visit.advices,
                source: sourceLabel
              })} />
            
            </div>
            {visit.advices.map((a, i) =>
          <VisitItemRow
            key={i}
            text={a}
            onCopy={() => onCopyToRxPad?.({ target: "advices", items: [a], source: sourceLabel })} />

          )}
          </div>
        }

        {/* Follow-up */}
        {visit.followUp &&
        <div className="flex items-center gap-2 rounded-lg bg-tp-blue-50/60 px-2.5 py-1.5">
            <Calendar size={13} className="text-tp-blue-500" />
            <span className="text-[12px] font-medium text-tp-blue-600">Follow-up: {visit.followUp}</span>
          </div>
        }

        {/* Notes */}
        {visit.notes &&
        <p className="text-[12px] italic text-tp-slate-500 border-t border-tp-slate-100 pt-2">{visit.notes}</p>
        }
      </div>
    </details>);

}

export function PastVisitPanel({
  visits,
  onCopyToRxPad



}) {
  if (!visits.length) {
    return (
      <PanelEmptyState
        icon={<Calendar size={32} />}
        message="No past visits"
        description="Previous consultations will appear here" />);


  }

  return (
    <div className="space-y-0">
      {visits.map((visit) =>
      <VisitCard key={visit.id} visit={visit} onCopyToRxPad={onCopyToRxPad} />
      )}
    </div>);

}