"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/hooks/utils";

// ─── Types ────────────────────────────────────────────────────────────────────





















// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate());

}

function formatDate(d) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatMonthYear(d) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatInputDate(d) {
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
{
  // "Till Date" — every record up to and including today, no lower bound.
  // Sits at the top of the Past column so it acts as the practical
  // default for any list view (All Patients, Follow-ups, etc.).
  id: "till-date",
  label: "Till Date",
  getRange: () => ({
    start: null,
    end: startOfDay(new Date()),
  }),
},
{
  id: "today",
  label: "Today",
  getRange: () => {
    const t = startOfDay(new Date());
    return { start: t, end: t };
  }
},
{
  id: "yesterday",
  label: "Yesterday",
  getRange: () => {
    const y = addDays(startOfDay(new Date()), -1);
    return { start: y, end: y };
  }
},
{
  id: "past-3-months",
  label: "Past 3 Months",
  getRange: () => ({
    start: addMonths(startOfDay(new Date()), -3),
    end: startOfDay(new Date())
  })
},
{
  id: "past-4-months",
  label: "Past 4 Months",
  getRange: () => ({
    start: addMonths(startOfDay(new Date()), -4),
    end: startOfDay(new Date())
  })
},
{
  id: "next-3-months",
  label: "Next 3 Months",
  getRange: () => ({
    start: startOfDay(new Date()),
    end: addMonths(startOfDay(new Date()), 3)
  })
},
{
  id: "next-4-months",
  label: "Next 4 Months",
  getRange: () => ({
    start: startOfDay(new Date()),
    end: addMonths(startOfDay(new Date()), 4)
  })
}];


// ─── Calendar Grid ────────────────────────────────────────────────────────────

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Calendar Month Sub-component ─────────────────────────────────────────────











function CalendarMonth({
  viewDate,
  stagedStart,
  stagedEnd,
  pendingStart,
  hoverDate,
  onDayClick,
  onDayHover
}) {
  const effectiveRange = (() => {
    if (pendingStart && hoverDate) {
      const [s, e] =
      pendingStart <= hoverDate ?
      [pendingStart, hoverDate] :
      [hoverDate, pendingStart];
      return { start: s, end: e };
    }
    if (stagedStart && stagedEnd) return { start: stagedStart, end: stagedEnd };
    return null;
  })();

  const isSingle =
  effectiveRange ? isSameDay(effectiveRange.start, effectiveRange.end) : false;
  const calendarDays = buildCalendarDays(viewDate);

  function isDayInRange(day) {
    if (!effectiveRange) return false;
    return day >= effectiveRange.start && day <= effectiveRange.end;
  }
  function isDayStart(day) {
    return effectiveRange ? isSameDay(day, effectiveRange.start) : false;
  }
  function isDayEnd(day) {
    return effectiveRange ? isSameDay(day, effectiveRange.end) : false;
  }
  function isToday(day) {
    return isSameDay(day, new Date());
  }

  return (
    <div className="w-[190px]">
      {/* Weekday headers */}
      <div className="mb-0.5 grid grid-cols-7">
        {WEEKDAYS.map((w) =>
        <div key={w} className="py-0.5 text-center text-[10px] font-semibold text-tp-slate-400">
            {w}
          </div>
        )}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          if (!day) return <div key={i} />;

          const inRange = isDayInRange(day);
          const isStart = isDayStart(day);
          const isEnd = isDayEnd(day);
          const today = isToday(day);
          const isEdge = isStart || isEnd;
          const isSingleDay = isSingle && isStart;

          return (
            <div
              key={i}
              className={cn(
                "relative flex h-7 items-center justify-center",
                inRange && !isSingleDay && "bg-tp-blue-50",
                isStart && !isSingleDay && "rounded-l-full",
                isEnd && !isSingleDay && "rounded-r-full"
              )}
              onMouseEnter={() => pendingStart && onDayHover(day)}
              onMouseLeave={() => pendingStart && onDayHover(null)}>
              
              <button
                type="button"
                onClick={() => onDayClick(day)}
                className={cn(
                  "relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium transition-colors",
                  isEdge || isSingleDay ?
                  "bg-tp-blue-500 text-white" :
                  inRange ?
                  "text-tp-blue-700 hover:bg-tp-blue-100" :
                  "text-tp-slate-700 hover:bg-tp-slate-100",
                  today && !isEdge && !inRange && "font-bold text-tp-blue-500"
                )}>
                
                {day.getDate()}
                {today && !isEdge &&
                <span className="absolute bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-tp-blue-400" />
                }
              </button>
            </div>);

        })}
      </div>
    </div>);

}

// ─── Main Component ───────────────────────────────────────────────────────────








export function DateRangePicker({ value, onChange, className, hideFuturePresets }) {
  const [open, setOpen] = useState(false);
  // Two-month view: left = shown month, right = left + 1
  const [leftViewDate, setLeftViewDate] = useState(() => startOfDay(new Date()));
  const rightViewDate = addMonths(leftViewDate, 1);

  // Staged state (internal — only committed on Apply)
  const [stagedPreset, setStagedPreset] = useState(value);
  const [stagedStart, setStagedStart] = useState(null);
  const [stagedEnd, setStagedEnd] = useState(null);

  // Two-click range selection state
  const [pendingStart, setPendingStart] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  const triggerLabel = PRESETS.find((p) => p.id === value)?.label ?? "Till Date";

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});
  // Only render portal after mount (avoids SSR mismatch)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {setMounted(true);}, []);

  // Close on outside click — checks both trigger container and portal
  useEffect(() => {
    function handler(e) {
      if (
      !containerRef.current?.contains(e.target) &&
      !popoverRef.current?.contains(e.target))
      {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When external value changes, reset staged state
  useEffect(() => {
    setStagedPreset(value);
    const preset = PRESETS.find((p) => p.id === value);
    if (preset) {
      const r = preset.getRange();
      setStagedStart(r.start);
      setStagedEnd(r.end);
    }
    setPendingStart(null);
  }, [value]);

  function openPicker() {
    // Re-init staged from current committed value
    setStagedPreset(value);
    const preset = PRESETS.find((p) => p.id === value);
    if (preset) {
      const r = preset.getRange();
      setStagedStart(r.start);
      setStagedEnd(r.end);
    }
    setPendingStart(null);
    setHoverDate(null);

    // Calculate fixed position for portal — aligns right edge to trigger right edge
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: "fixed",
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
        zIndex: 9999
      });
    }
    setOpen(true);
  }

  function handlePresetClick(preset) {
    setStagedPreset(preset.id);
    const range = preset.getRange();
    setStagedStart(range.start);
    setStagedEnd(range.end);
    setPendingStart(null);
  }

  function handleDayClick(day) {
    if (!pendingStart) {
      // First click — start of range
      setPendingStart(day);
      setStagedStart(day);
      setStagedEnd(null);
      setStagedPreset("today"); // clear preset highlight while custom selecting
    } else {
      // Second click — complete range
      const [start, end] =
      pendingStart <= day ? [pendingStart, day] : [day, pendingStart];
      setStagedStart(start);
      setStagedEnd(end);
      setPendingStart(null);
    }
  }

  function handleApply() {
    if (stagedStart && stagedEnd) {
      const range = { start: stagedStart, end: stagedEnd };
      const preset = PRESETS.find((p) => p.id === stagedPreset);
      onChange({
        type: "preset",
        presetId: stagedPreset,
        range,
        label: preset ?
        preset.label :
        `${formatDate(stagedStart)} – ${formatDate(stagedEnd)}`
      });
    }
    setOpen(false);
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleClear() {
    const todayPreset = PRESETS.find((p) => p.id === "today");
    const range = todayPreset.getRange();
    setStagedPreset("today");
    setStagedStart(range.start);
    setStagedEnd(range.end);
    setPendingStart(null);
  }

  // Popover content — rendered via portal so it escapes any overflow:hidden ancestor
  const popoverContent =
  <div
    ref={popoverRef}
    className="overflow-hidden rounded-[14px] border border-tp-slate-200 bg-white shadow-[0_16px_32px_-8px_rgba(23,23,37,0.14)]"
    style={{ ...popoverStyle, minWidth: 540 }}>
    
      <div className="flex">
        {/* Left: Quick-select presets */}
        <div className="flex w-[128px] shrink-0 flex-col gap-0.5 border-r border-tp-slate-100 p-2">
          {/* Past group */}
          <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-tp-slate-400">
            Past
          </p>
          {PRESETS.filter((p) => !p.id.startsWith("next")).map((preset) =>
        <button
          key={preset.id}
          type="button"
          onClick={() => handlePresetClick(preset)}
          className={cn(
            "flex w-full items-center rounded-[8px] px-2 py-1.5 text-left text-[12px] font-medium transition-colors",
            preset.id === stagedPreset && stagedStart && stagedEnd ?
            "bg-tp-blue-500 text-white" :
            "text-tp-slate-700 hover:bg-tp-slate-100"
          )}>
          
              {preset.label}
            </button>
        )}

          {!hideFuturePresets &&
        <>
              <div className="my-1.5 mx-1 h-px bg-tp-slate-100" />

              {/* Upcoming group */}
              <p className="px-2 pb-0.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-tp-slate-400">
                Upcoming
              </p>
              {PRESETS.filter((p) => p.id.startsWith("next")).map((preset) =>
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              "flex w-full items-center rounded-[8px] px-2 py-1.5 text-left text-[12px] font-medium transition-colors",
              preset.id === stagedPreset && stagedStart && stagedEnd ?
              "bg-tp-blue-500 text-white" :
              "text-tp-slate-700 hover:bg-tp-slate-100"
            )}>
            
                  {preset.label}
                </button>
          )}
            </>
        }

          {pendingStart &&
        <p className="mt-2 rounded-[8px] bg-tp-amber-50 px-2 py-1.5 text-[10px] leading-tight text-tp-warning-700">
              Click a second date to complete the range
            </p>
        }
        </div>

        {/* Right: Two-month calendars + inputs + actions */}
        <div className="flex flex-1 flex-col p-3">
          {/* Date range input displays */}
          <div className="mb-3 flex items-end gap-2">
            <div className="flex-1">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tp-slate-400">
                Start Date
              </p>
              <div
              className={cn(
                "flex h-[30px] items-center rounded-[8px] border px-2.5 text-[12px]",
                stagedStart ?
                "border-tp-blue-200 bg-tp-blue-50 text-tp-blue-700" :
                "border-tp-slate-200 bg-tp-slate-50 text-tp-slate-400"
              )}>
              
                {stagedStart ? formatInputDate(stagedStart) : "Select start date"}
              </div>
            </div>

            <div className="mb-1 h-px w-3 shrink-0 bg-tp-slate-300" />

            <div className="flex-1">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tp-slate-400">
                End Date
              </p>
              <div
              className={cn(
                "flex h-[30px] items-center rounded-[8px] border px-2.5 text-[12px]",
                stagedEnd ?
                "border-tp-blue-200 bg-tp-blue-50 text-tp-blue-700" :
                "border-tp-slate-200 bg-tp-slate-50 text-tp-slate-400"
              )}>
              
                {stagedEnd ?
              formatInputDate(stagedEnd) :
              pendingStart ?
              "Click to set end date" :
              "Select end date"}
              </div>
            </div>
          </div>

          {/* Two calendar months side by side */}
          <div className="flex gap-4">
            {/* Left month */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <button
                type="button"
                onClick={() => setLeftViewDate((d) => addMonths(d, -1))}
                className="flex size-6 items-center justify-center rounded-full text-tp-slate-600 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900"
                aria-label="Previous month">
                
                  <ChevronLeft size={14} strokeWidth={1.5} />
                </button>
                <span className="text-[12px] font-semibold text-tp-slate-800">
                  {formatMonthYear(leftViewDate)}
                </span>
                {/* Empty spacer */}
                <div className="size-6" />
              </div>
              <CalendarMonth
              viewDate={leftViewDate}
              stagedStart={stagedStart}
              stagedEnd={stagedEnd}
              pendingStart={pendingStart}
              hoverDate={hoverDate}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate} />
            
            </div>

            {/* Divider */}
            <div className="w-px bg-tp-slate-100" />

            {/* Right month */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                {/* Empty spacer */}
                <div className="size-6" />
                <span className="text-[12px] font-semibold text-tp-slate-800">
                  {formatMonthYear(rightViewDate)}
                </span>
                <button
                type="button"
                onClick={() => setLeftViewDate((d) => addMonths(d, 1))}
                className="flex size-6 items-center justify-center rounded-full text-tp-slate-600 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900"
                aria-label="Next month">
                
                  <ChevronRight size={14} strokeWidth={1.5} />
                </button>
              </div>
              <CalendarMonth
              viewDate={rightViewDate}
              stagedStart={stagedStart}
              stagedEnd={stagedEnd}
              pendingStart={pendingStart}
              hoverDate={hoverDate}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate} />
            
            </div>
          </div>

          {/* Action row: Clear | Cancel + Apply */}
          <div className="mt-3 flex items-center justify-between border-t border-tp-slate-100 pt-2.5">
            <button
            type="button"
            onClick={handleClear}
            className="text-[12px] font-semibold text-tp-warning-600 underline underline-offset-2 decoration-tp-warning-400 transition-colors hover:text-tp-warning-700">
            
              Clear
            </button>

            <div className="flex items-center gap-2">
              <button
              type="button"
              onClick={handleCancel}
              className="rounded-[8px] border border-tp-slate-200 px-3.5 py-1.5 text-[12px] font-medium text-tp-slate-700 transition-colors hover:bg-tp-slate-100">
              
                Cancel
              </button>
              <button
              type="button"
              onClick={handleApply}
              disabled={!stagedStart || !stagedEnd}
              className="rounded-[8px] bg-tp-blue-500 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-tp-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
              
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>;


  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openPicker()}
        className="inline-flex h-[38px] w-full items-center justify-between gap-1.5 rounded-[10px] border border-tp-slate-200 bg-white px-3 text-[14px] font-medium text-tp-slate-700 transition-colors hover:border-tp-slate-300 hover:bg-tp-slate-50">
        
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-tp-slate-500">
            
            <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="truncate">{triggerLabel}</span>
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={cn(
            "shrink-0 text-tp-slate-500 transition-transform duration-200",
            open && "rotate-180"
          )} />
        
      </button>

      {/* Popover — portal-rendered to escape overflow:hidden ancestors */}
      {open && mounted && createPortal(popoverContent, document.body)}
    </div>);

}