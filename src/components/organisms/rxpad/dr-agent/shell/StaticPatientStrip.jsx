"use client";

import { RX_CONTEXT_OPTIONS } from "../constants";

export function StaticPatientStrip({ selectedPatientId }) {
  const selected =
  RX_CONTEXT_OPTIONS.find((o) => o.id === selectedPatientId) ??
  RX_CONTEXT_OPTIONS[0];

  const genderLabel = selected?.gender === "M" ? "M" : selected?.gender === "F" ? "F" : "";
  const ageLabel = selected?.age ? `${selected.age}y` : "";
  const metaParts = [genderLabel, ageLabel].filter(Boolean).join(", ");

  return (
    <div className="sticky top-0 z-10 flex justify-center pb-1 pt-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/55 px-2.5 py-1 text-[14px] font-medium text-tp-slate-600 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.5)] backdrop-blur-md">
        {selected?.label}
        {metaParts && <span className="text-tp-slate-400">· {metaParts}</span>}
      </span>
    </div>);

}