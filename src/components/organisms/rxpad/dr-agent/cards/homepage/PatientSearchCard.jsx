"use client";
import React, { useState, useMemo, useRef } from "react";
import { CardShell } from "../CardShell";

import { RX_CONTEXT_OPTIONS } from "../../constants";






export function PatientSearchCard({ data, onPatientSelect }) {
  const [query, setQuery] = useState(data.query);
  const inputRef = useRef(null);

  // Note: removed auto-focus on mount — it caused unwanted scroll in catalog previews.
  // Focus is handled by the parent when the card is used in the live agent chat.

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return RX_CONTEXT_OPTIONS.
    filter((o) => o.kind === "patient" && o.label.toLowerCase().includes(q)).
    map((o) => ({
      patientId: o.id,
      name: o.label,
      meta: o.meta,
      hasAppointmentToday: !!o.isToday
    }));
  }, [query]);

  return (
    <CardShell
      icon={
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      }
      title="Patient Search">
      
      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-[6px] rounded-[8px] border border-tp-slate-200 bg-white px-[8px] py-[6px] focus-within:border-tp-blue-400 focus-within:shadow-[0_0_0_2px_rgba(75,74,213,0.08)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient by name..."
            className="w-full bg-transparent text-[14px] text-tp-slate-800 placeholder:text-tp-slate-400 outline-none" />
          
          {query &&
          <button
            onClick={() => {setQuery("");inputRef.current?.focus();}}
            className="flex-shrink-0 text-tp-slate-400 hover:text-tp-slate-600">
            
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          }
        </div>
      </div>

      {/* Results */}
      {query.trim() &&
      <div className="mt-[6px] space-y-[3px]">
          {results.length > 0 ?
        results.map((r) =>
        <button
          key={r.patientId}
          onClick={() => onPatientSelect?.(r.patientId)}
          className="flex w-full items-center gap-[8px] rounded-[8px] bg-tp-slate-50 px-[8px] py-[6px] text-left transition-colors hover:bg-tp-blue-50">
          
                <div className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-tp-slate-200 text-[12px] font-semibold text-tp-slate-600">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-tp-slate-800">{r.name}</p>
                  <p className="text-[12px] text-tp-slate-400">{r.meta}</p>
                </div>
                {r.hasAppointmentToday &&
          <span className="rounded-[4px] bg-tp-success-50 px-[6px] py-[1px] text-[12px] font-semibold text-tp-success-700">
                    Today
                  </span>
          }
              </button>
        ) :

        <div className="rounded-[8px] bg-tp-slate-50 px-[8px] py-[10px] text-center">
              <p className="text-[14px] text-tp-slate-500">No patients found for &ldquo;{query}&rdquo;</p>
              <p className="mt-[2px] text-[12px] text-tp-slate-400">Try a different name or check spelling</p>
            </div>
        }
        </div>
      }
    </CardShell>);

}