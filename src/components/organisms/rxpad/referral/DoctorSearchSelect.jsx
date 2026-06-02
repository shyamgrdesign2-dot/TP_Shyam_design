"use client";

/**
 * DoctorSearchSelect — input-driven searchable doctor picker.
 *
 * The field itself is the search box: focus it and type a doctor's name OR a
 * specialty to filter; matches appear in a dropdown below, each showing the
 * name with the specialty as a tag on the right. Pick one to fill the field.
 * Specialty is derived from the chosen doctor — there's no separate specialty
 * field. The dropdown shows a slim neutral scroll indicator when it overflows.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchDoctors, getDoctorByIdFlat } from "./referral-data";

function SpecialtyTag({ children }) {
  return (
    <span className="shrink-0 rounded-full bg-tp-slate-100 px-2 py-0.5 text-[11px] font-medium text-tp-slate-600">
      {children}
    </span>
  );
}

export function DoctorSearchSelect({
  doctorId = "",
  doctorName = "",
  onChange,
  placeholder = "Search by doctor or specialty",
}) {
  const selected = getDoctorByIdFlat(doctorId);
  // Text shown in the field: the picked doctor's name, or the free-typed name.
  const committed = selected?.name ?? doctorName ?? "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(committed);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const [scroll, setScroll] = useState({ show: false, thumbH: 0, thumbT: 0 });

  // Keep the input text in sync when the value changes from outside.
  useEffect(() => {
    setQuery(committed);
  }, [committed]);

  // Close on click-outside / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const results = useMemo(() => searchDoctors(open ? query : ""), [open, query]);

  // Custom scroll indicator (slim neutral thumb on the right of the list).
  const updateScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const show = scrollHeight > clientHeight + 2;
    if (!show) {
      setScroll({ show: false, thumbH: 0, thumbT: 0 });
      return;
    }
    const trackH = clientHeight;
    const thumbH = Math.max(24, (clientHeight / scrollHeight) * trackH);
    const maxTop = trackH - thumbH;
    const thumbT = Math.min(maxTop, (scrollTop / scrollHeight) * trackH);
    setScroll({ show: true, thumbH, thumbT });
  }, []);

  useEffect(() => {
    if (!open) return;
    // Wait a tick for the list to render, then measure.
    const id = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(id);
  }, [open, results.length, updateScroll]);

  const showTag = selected && !open && query === selected.name;

  const pick = (doctor) => {
    onChange?.({ doctorId: doctor.id, doctorName: "" });
    setQuery(doctor.name);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        value={query}
        placeholder={placeholder}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onChange={(e) => {
          // Free text: keep whatever is typed as the doctor name. Picking a
          // directory option (below) replaces it with that doctor + specialty.
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          onChange?.({ doctorId: "", doctorName: next });
        }}
        className={`h-[42px] w-full rounded-[10px] border border-tp-slate-300 bg-white pl-3 ${
          showTag ? "pr-[120px]" : "pr-3"
        } text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20`}
      />
      {showTag ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <SpecialtyTag>{selected.specialtyLabel}</SpecialtyTag>
        </span>
      ) : null}

      {/* Dropdown only shows when there are matching suggestions — no
          "not found" state, since the typed text is itself a valid value. */}
      {open && results.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[1300] overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
          <div
            ref={listRef}
            onScroll={updateScroll}
            className="max-h-[240px] overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {results.map((d) => {
              const active = d.id === doctorId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(d)}
                  className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-left transition-colors ${
                    active ? "bg-tp-blue-50" : "hover:bg-tp-slate-50"
                  }`}
                >
                  <span className="truncate text-[14px] font-medium text-tp-slate-700">
                    {d.name}
                  </span>
                  <SpecialtyTag>{d.specialtyLabel}</SpecialtyTag>
                </button>
              );
            })}
          </div>

          {/* Slim neutral scroll indicator */}
          {scroll.show ? (
            <div className="pointer-events-none absolute right-[3px] top-[6px] bottom-[6px] w-[3px] rounded-full bg-tp-slate-100">
              <div
                className="absolute left-0 right-0 rounded-full bg-tp-slate-300"
                style={{ top: scroll.thumbT, height: scroll.thumbH }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default DoctorSearchSelect;
