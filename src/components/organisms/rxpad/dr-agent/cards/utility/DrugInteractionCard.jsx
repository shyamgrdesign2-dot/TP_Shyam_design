"use client";

import { CardShell } from "../CardShell";






const SEVERITY_LABEL = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  low: "Low"
};

const SEVERITY_BADGE = {
  critical: { color: "#DC2626", bg: "#FEE2E2" },
  high: { color: "#EA580C", bg: "#FFF7ED" },
  moderate: { color: "#D97706", bg: "#FFFBEB" },
  low: { color: "#64748B", bg: "#F1F5F9" }
};

export function DrugInteractionCard({ data }) {
  const badge = SEVERITY_BADGE[data.severity];

  return (
    <CardShell
      icon={<span />}
      tpIconName="first-aid"
      title="Drug Interaction"
      badge={{ label: "Danger", color: "#DC2626", bg: "#FEE2E2" }}>
      
      <div
        className="space-y-[8px] rounded-[8px] bg-white px-3 py-[10px]"
        style={{
          borderLeft: "3px solid var(--tp-error-400, #F87171)",
          boxShadow: "0 0 0 0.5px rgba(220, 38, 38, 0.1)"
        }}>
        
        {/* Drug pair */}
        <div className="flex items-center gap-[6px] text-[14px] font-semibold text-tp-slate-800">
          <span>{data.drug1}</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-tp-warning-500">
            <path d="M8 2L9.5 6H14L10.5 9L12 13L8 10.5L4 13L5.5 9L2 6H6.5L8 2Z" fill="currentColor" />
          </svg>
          <span>{data.drug2}</span>
        </div>

        {/* Severity */}
        <div className="flex items-center gap-[6px]">
          <span className="text-[12px] font-medium tracking-wider text-tp-slate-400">Severity</span>
          <span
            className="rounded-[4px] px-1.5 py-[1px] text-[12px] font-semibold"
            style={{ color: badge.color, backgroundColor: badge.bg }}>
            
            {SEVERITY_LABEL[data.severity]}
          </span>
        </div>

        {/* Risk */}
        <div>
          <p className="mb-[2px] text-[12px] font-medium tracking-wider text-tp-slate-400">Risk</p>
          <p className="text-[14px] leading-[1.6] text-tp-slate-700">{data.risk}</p>
        </div>

        {/* Action */}
        <div>
          <p className="mb-[2px] text-[12px] font-medium tracking-wider text-tp-slate-400">Recommended action</p>
          <p className="text-[14px] leading-[1.6] text-tp-slate-700">{data.action}</p>
        </div>
      </div>
    </CardShell>);

}