"use client";

import { CardShell } from "../CardShell";








const EVIDENCE_BADGE = {
  A: { color: "#22C55E", bg: "#F0FDF4" },
  B: { color: "#4B4AD5", bg: "#EEEEFF" },
  C: { color: "#F59E0B", bg: "#FFFBEB" }
};

export function ClinicalGuidelinesCard({ data, onPillTap }) {
  const badge = EVIDENCE_BADGE[data.evidenceLevel] ?? EVIDENCE_BADGE.C;

  return (
    <CardShell
      icon={<span />}
      tpIconName="medical book"
      title={data.title}
      badge={{ label: `Evidence ${data.evidenceLevel}`, color: badge.color, bg: badge.bg }}>

      
      {/* Condition */}
      <div className="mb-[6px] rounded-[6px] bg-tp-slate-50 px-2.5 py-[4px] text-[14px] text-tp-slate-500">
        <span className="font-medium text-tp-slate-600">Condition:</span>{" "}
        {data.condition}
      </div>

      {/* Recommendations */}
      <div className="mb-[6px] space-y-[3px]">
        {data.recommendations.map((rec, i) =>
        <div key={i} className="flex items-start gap-[6px] text-[14px] leading-[1.6] text-tp-slate-700">
            <span className="mt-[2px] flex-shrink-0 text-tp-blue-400">•</span>
            <span>{rec}</span>
          </div>
        )}
      </div>

      {/* Source */}
      <p className="text-[14px] text-tp-slate-400">Source: {data.source}</p>
    </CardShell>);

}