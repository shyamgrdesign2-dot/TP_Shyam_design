/**
 * Growth content panel.
 *
 * Layout (top → bottom):
 *   1. Static "Growth Info" card — mid-parental height, mother, father,
 *      gestation period. Always expanded.
 *   2. Five chart cards stacked one below the other:
 *      Height · Weight · BMI · OFC · Height-vs-Weight.
 *
 * Each chart carries:
 *   • A sticky header (date-card chrome — same as PastVisits) that
 *     paints the title + AI summarise icon and stays visible while
 *     scrolling.
 *   • A percentile **dropdown** (multi-select) — doctor picks which
 *     of P03 / P10 / P50 / P90 / P97 to overlay. Each percentile
 *     renders in its own colour with a labelled end-cap so the chart
 *     reads as a 5-band growth standard.
 *   • A Years / Months **toggle** — flips the X-axis tick formatter.
 *
 * Charts are drawn with recharts. Tooltip works on hover AND on tap
 * via Recharts' built-in defaultIndex + onClick handling on touch
 * devices.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown2 } from "iconsax-reactjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from "recharts";
import { ActionButton, useStickyHeaderState } from "../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import { HistoricalNewDataBanner } from "../HistoricalNewDataBanner";

// ── Static patient context ────────────────────────────────────────────────────

const PATIENT_INFO = {
  midParentalHeight: "168 cm",
  motherHeight: "162 cm",
  fatherHeight: "176 cm",
  gestationPeriod: "39 weeks",
};

// Patient's date-of-birth-derived "today" age in months (demo).
const PATIENT_AGE_MONTHS_TODAY = 34; // 2y 10m

// ── Mock measurement series (age in months → value) ───────────────────────────

const PATIENT_HEIGHT = [
  { ageMonths: 0, value: 50 }, { ageMonths: 3, value: 60 },
  { ageMonths: 6, value: 67 }, { ageMonths: 12, value: 75 },
  { ageMonths: 18, value: 82 }, { ageMonths: 24, value: 87 },
  { ageMonths: 30, value: 93 }, { ageMonths: 36, value: 96 },
];

const PATIENT_WEIGHT = [
  { ageMonths: 0, value: 3.4 }, { ageMonths: 3, value: 5.8 },
  { ageMonths: 6, value: 7.6 }, { ageMonths: 12, value: 9.4 },
  { ageMonths: 18, value: 10.8 }, { ageMonths: 24, value: 12.0 },
  { ageMonths: 30, value: 12.8 }, { ageMonths: 36, value: 13.4 },
];

const PATIENT_BMI = [
  { ageMonths: 0, value: 13.6 }, { ageMonths: 3, value: 16.1 },
  { ageMonths: 6, value: 16.9 }, { ageMonths: 12, value: 16.7 },
  { ageMonths: 18, value: 16.0 }, { ageMonths: 24, value: 15.8 },
  { ageMonths: 30, value: 14.8 }, { ageMonths: 36, value: 14.5 },
];

const PATIENT_OFC = [
  { ageMonths: 0, value: 34 }, { ageMonths: 3, value: 40 },
  { ageMonths: 6, value: 43 }, { ageMonths: 12, value: 46 },
  { ageMonths: 18, value: 47.5 }, { ageMonths: 24, value: 48.5 },
  { ageMonths: 30, value: 49 }, { ageMonths: 36, value: 49.4 },
];

const PERCENTILE_AGES = [0, 3, 6, 9, 12, 18, 24, 30, 36];

// WHO Child Growth Standards (boys, 0–36 m). Ages: 0,3,6,9,12,18,24,30,36 months.

const PERCENTILES_HEIGHT = {
  P03: [46.1, 55.3, 61.2, 65.6, 69.0, 75.2, 80.0, 84.4, 88.2],
  P10: [47.5, 57.1, 63.3, 67.7, 71.3, 77.8, 82.8, 87.4, 91.4],
  P50: [49.9, 61.4, 67.6, 72.0, 75.7, 82.3, 87.1, 91.9, 96.1],
  P90: [52.3, 65.5, 71.9, 76.2, 80.1, 86.7, 91.4, 96.4, 100.8],
  P97: [53.8, 67.8, 74.0, 78.4, 82.3, 89.2, 94.0, 99.1, 103.5],
};
const PERCENTILES_WEIGHT = {
  P03: [2.5, 4.9, 6.4, 7.4, 8.4, 9.6, 10.5, 11.4, 12.1],
  P10: [2.9, 5.5, 7.0, 8.1, 9.0, 10.4, 11.4, 12.3, 13.1],
  P50: [3.5, 6.4, 7.9, 9.2, 10.2, 11.8, 13.0, 14.0, 14.9],
  P90: [4.2, 7.5, 9.2, 10.6, 11.8, 13.5, 14.9, 16.1, 17.2],
  P97: [4.6, 8.1, 9.9, 11.5, 12.7, 14.6, 16.1, 17.4, 18.6],
};
const PERCENTILES_BMI = {
  P03: [11.5, 14.5, 15.0, 14.7, 14.3, 13.8, 13.5, 13.3, 13.1],
  P10: [12.5, 15.4, 15.7, 15.4, 15.0, 14.6, 14.3, 14.0, 13.8],
  P50: [13.4, 16.3, 16.6, 16.4, 16.0, 15.5, 15.2, 14.9, 14.7],
  P90: [14.6, 17.6, 17.9, 17.8, 17.4, 16.8, 16.5, 16.3, 16.1],
  P97: [15.6, 18.7, 19.1, 19.0, 18.6, 18.1, 17.8, 17.5, 17.3],
};
const PERCENTILES_OFC = {
  P03: [31.9, 37.9, 41.0, 43.0, 44.6, 46.2, 47.3, 48.0, 48.6],
  P10: [32.8, 38.9, 42.0, 44.0, 45.6, 47.2, 48.3, 49.1, 49.7],
  P50: [34.5, 40.5, 43.5, 45.4, 47.0, 48.6, 49.6, 50.4, 51.0],
  P90: [36.0, 42.0, 45.0, 46.9, 48.5, 50.0, 51.0, 51.8, 52.4],
  P97: [36.9, 43.0, 46.0, 47.9, 49.5, 51.0, 52.0, 52.8, 53.4],
};

// Height-vs-Weight curves (WHO boys): x = height (cm), y = weight (kg).
const PERCENTILES_HVW_AGES = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110];
const PERCENTILES_HVW = {
  P03: [2.5, 3.4, 4.4, 5.5, 6.5, 7.4, 8.3, 9.3, 10.3, 11.3, 12.5, 13.8, 15.2],
  P10: [2.9, 3.8, 5.0, 6.1, 7.2, 8.2, 9.2, 10.2, 11.3, 12.5, 13.8, 15.3, 16.8],
  P50: [3.5, 4.5, 5.8, 7.1, 8.3, 9.4, 10.5, 11.6, 12.9, 14.3, 15.8, 17.5, 19.3],
  P90: [4.2, 5.4, 6.8, 8.3, 9.7, 11.0, 12.3, 13.7, 15.2, 16.8, 18.6, 20.6, 22.7],
  P97: [4.7, 6.0, 7.5, 9.1, 10.6, 12.1, 13.6, 15.1, 16.8, 18.6, 20.6, 22.8, 25.1],
};

const PERCENTILE_KEYS = ["P03", "P10", "P50", "P90", "P97"];
const PERCENTILE_LABEL = { P03: "P 03", P10: "P 10", P50: "P 50", P90: "P 90", P97: "P 97" };
const PERCENTILE_COLOR = {
  P03: "#F87171", // red-400
  P10: "#A78BFA", // violet-400
  P50: "#34D399", // emerald-400
  P90: "#C084FC", // purple-400
  P97: "#FBBF24", // amber-400
};

const TODAY_LINE_COLOR = "#34D399";

// ── Today reference-line label ────────────────────────────────────────────────
//
// Two-line SVG label: "Today" on the first row, patient age ("2y 10m")
// immediately below. The component is passed as a React element to
// recharts `<ReferenceLine label={…}>`; recharts clones it and injects
// `viewBox` (the chart-area bounding rect) so we can derive the x of
// the line and the top of the chart area.

function TodayRefLabel({ viewBox }) {
  if (!viewBox) return null;
  const cx = viewBox.x; // pixel x of the reference line
  const chartTop = viewBox.y; // y = chart area top (= margin.top)

  const totalMonths = PATIENT_AGE_MONTHS_TODAY;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const ageParts = [];
  if (years > 0) ageParts.push(`${years}y`);
  if (months > 0) ageParts.push(`${months}m`);
  const ageStr = ageParts.join(" ");

  return (
    <g>
      <text
        x={cx}
        y={chartTop - 20}
        textAnchor="middle"
        fill={TODAY_LINE_COLOR}
        fontSize={10}
        fontWeight={600}>
        Today
      </text>
      <text
        x={cx}
        y={chartTop - 8}
        textAnchor="middle"
        fill={TODAY_LINE_COLOR}
        fontSize={9}
        fontWeight={500}
        opacity={0.82}>
        {ageStr}
      </text>
    </g>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toAgeAxisData(seriesByAge, percentiles) {
  return PERCENTILE_AGES.map((ageMonths, idx) => {
    const point = seriesByAge.find((p) => p.ageMonths === ageMonths);
    return {
      ageMonths,
      patient: point ? point.value : null,
      P03: percentiles.P03[idx],
      P10: percentiles.P10[idx],
      P50: percentiles.P50[idx],
      P90: percentiles.P90[idx],
      P97: percentiles.P97[idx],
    };
  });
}

function toHvwData() {
  return PERCENTILES_HVW_AGES.map((cm, idx) => ({
    cm,
    patient: idx === 0 ? null : null, // patient series has its own x's
    P03: PERCENTILES_HVW.P03[idx],
    P10: PERCENTILES_HVW.P10[idx],
    P50: PERCENTILES_HVW.P50[idx],
    P90: PERCENTILES_HVW.P90[idx],
    P97: PERCENTILES_HVW.P97[idx],
  }));
}

// ── Building blocks ───────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[14px] leading-[20px]">
      <span className="font-sans font-normal text-tp-slate-500">{label}</span>
      <span className="font-sans font-medium text-tp-slate-700">{value}</span>
    </div>
  );
}

function GrowthInfoCard() {
  const { headerRef, isStuck } = useStickyHeaderState();
  return (
    <div className="relative shrink-0 w-full overflow-hidden" style={tpSectionCardStyle}>
      <div
        ref={headerRef}
        className={`bg-tp-slate-100 sticky top-0 z-[10] shrink-0 w-full ${
          isStuck ? "rounded-tl-none rounded-tr-none" : "rounded-tl-[10px] rounded-tr-[10px]"
        }`}>
        <div className="px-[10px] py-[8px]">
          <p className="font-sans text-[14px] font-semibold leading-[20px] text-tp-slate-700">Growth Info</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-[6px] px-[12px] py-[10px]">
        <InfoRow label="Mid-parental height" value={PATIENT_INFO.midParentalHeight} />
        <InfoRow label="Mother" value={PATIENT_INFO.motherHeight} />
        <InfoRow label="Father" value={PATIENT_INFO.fatherHeight} />
        <InfoRow label="Gestation period" value={PATIENT_INFO.gestationPeriod} />
      </div>
    </div>
  );
}

// ── Chart card chrome ────────────────────────────────────────────────────────

/** Sticky title strip — same chrome the PastVisits date cards use. */
function ChartHeader({ title }) {
  const { headerRef, isStuck } = useStickyHeaderState();
  return (
    <div
      ref={headerRef}
      className={`group bg-tp-slate-100 sticky top-0 z-[10] shrink-0 w-full ${
        isStuck ? "rounded-tl-none rounded-tr-none" : "rounded-tl-[10px] rounded-tr-[10px]"
      }`}>
      <div className="flex items-center justify-between gap-2 px-[10px] py-[8px]">
        <p className="font-sans text-[14px] font-semibold leading-[20px] text-tp-slate-700">{title}</p>
        <AiTriggerIcon
          tooltip={`Summarize ${title.toLowerCase()}`}
          signalLabel={`Summarize ${title.toLowerCase()}`}
          sectionId="growth"
          size={12}
          as="span" />
      </div>
    </div>
  );
}

/** Percentile multi-select dropdown. Doctor picks which lines to overlay. */
function PercentileDropdown({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Label switches based on viewport: "All Percentiles" on desktop
  // (≥1024px), "All PRCN" on iPad/smaller — both collapse to
  // "N selected" when a partial set is chosen.
  const summaryFull = selected.length === 0
    ? "Percentile"
    : selected.length === PERCENTILE_KEYS.length
      ? "All Percentiles"
      : `${selected.length} selected`;
  const summaryShort = selected.length === 0
    ? "Percentile"
    : selected.length === PERCENTILE_KEYS.length
      ? "All PRCN"
      : `${selected.length} sel`;

  const toggleKey = (k) => {
    onChange(selected.includes(k) ? selected.filter((s) => s !== k) : [...selected, k]);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-[28px] items-center gap-[6px] rounded-[8px] border border-tp-slate-200 bg-white px-[10px] text-[12px] font-medium text-tp-slate-600 transition-colors hover:bg-tp-slate-50">
        <span className="hidden lg:inline">{summaryFull}</span>
        <span className="inline lg:hidden">{summaryShort}</span>
        <ArrowDown2 size={12} color="currentColor" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[32px] z-30 w-[180px] overflow-hidden rounded-[10px] border border-tp-slate-200 bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
          <button
            type="button"
            onClick={() => onChange(selected.length === PERCENTILE_KEYS.length ? [] : [...PERCENTILE_KEYS])}
            className="flex w-full items-center justify-between border-b border-tp-slate-100 px-[12px] py-[8px] text-[12px] font-medium text-tp-blue-500 hover:bg-tp-slate-50">
            <span>{selected.length === PERCENTILE_KEYS.length ? "Clear all" : "Select all"}</span>
          </button>
          {PERCENTILE_KEYS.map((k) => {
            const checked = selected.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleKey(k)}
                className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] text-tp-slate-700 transition-colors hover:bg-tp-slate-50">
                <span
                  aria-hidden
                  className={`inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border ${
                    checked ? "border-tp-blue-500 bg-tp-blue-500" : "border-tp-slate-300 bg-white"
                  }`}>
                  {checked ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                      <path d="M2 5.2L4 7L8 3" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
                <span className="flex-1">{PERCENTILE_LABEL[k]}</span>
                <span aria-hidden className="inline-block h-[10px] w-[14px] rounded-full" style={{ background: PERCENTILE_COLOR[k] }} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Years ↔ Months pill toggle. */
function AxisToggle({ showYears, onChange }) {
  return (
    <div role="tablist" className="inline-flex h-[28px] items-center rounded-[8px] border border-tp-slate-200 bg-white p-[2px] text-[12px] font-medium text-tp-slate-500">
      <button
        type="button"
        role="tab"
        aria-selected={showYears}
        onClick={() => onChange(true)}
        className={`flex h-full items-center rounded-[6px] px-[10px] transition-colors ${
          showYears ? "bg-tp-slate-100 text-tp-slate-700" : "hover:text-tp-slate-700"
        }`}>
        Yrs
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={!showYears}
        onClick={() => onChange(false)}
        className={`flex h-full items-center rounded-[6px] px-[10px] transition-colors ${
          !showYears ? "bg-tp-slate-100 text-tp-slate-700" : "hover:text-tp-slate-700"
        }`}>
        Mth
      </button>
    </div>
  );
}

function ChartFrame({ title, children, percentileSelected, onPercentileChange, showYears, onYearsChange, hidePercentile = false, hideYears = false }) {
  return (
    <div className="relative shrink-0 w-full" style={tpSectionCardStyle}>
      <ChartHeader title={title} />
      <div className="flex flex-wrap items-center justify-between gap-[8px] px-[10px] pt-[10px] pb-[4px]">
        {hidePercentile ? <span /> : <PercentileDropdown selected={percentileSelected} onChange={onPercentileChange} />}
        {hideYears ? null : <AxisToggle showYears={showYears} onChange={onYearsChange} />}
      </div>
      <div className="h-[258px] w-full pb-[12px] pt-[2px]">{children}</div>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────

function tickFormatterForAge(showYears) {
  return (m) => {
    if (showYears) {
      const yrs = m / 12;
      return Number.isInteger(yrs) ? `${yrs}y` : `${yrs.toFixed(1)}y`;
    }
    return `${m}m`;
  };
}

function TooltipBox({ active, payload, label, formatLabel }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-[8px] border border-tp-slate-200 bg-white px-[10px] py-[8px] text-[12px] shadow-[0_4px_12px_-6px_rgba(15,23,42,0.18)]">
      <p className="mb-[4px] font-sans font-semibold text-tp-slate-700">{formatLabel(label)}</p>
      <div className="flex flex-col gap-[2px]">
        {payload
          .filter((p) => p.value != null)
          .map((p) => (
            <div key={p.dataKey} className="flex items-center gap-[8px]">
              <span aria-hidden className="inline-block h-[8px] w-[8px] rounded-full" style={{ background: p.color }} />
              <span className="font-sans text-tp-slate-500">
                {p.dataKey === "patient" ? "Patient" : PERCENTILE_LABEL[p.dataKey] ?? p.dataKey}:
              </span>
              <span className="font-sans font-medium text-tp-slate-700">{p.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function AgeAxisChart({ data, valueLabel, percentileSelected, showYears, yDomain }) {
  const tickFmt = tickFormatterForAge(showYears);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 40, right: 32, bottom: 24, left: 6 }}>
        <CartesianGrid stroke="rgba(226,232,240,0.7)" />
        <XAxis
          dataKey="ageMonths"
          type="number"
          domain={[0, 36]}
          ticks={PERCENTILE_AGES}
          tickFormatter={tickFmt}
          tick={{ fill: "var(--tp-slate-500)", fontSize: 11 }}
          stroke="var(--tp-slate-200)"
          label={{
            value: showYears ? "Age in Years" : "Age in Months",
            position: "insideBottom",
            offset: -8,
            style: { fill: "var(--tp-slate-500)", fontSize: 11 },
          }} />
        <YAxis
          domain={yDomain}
          tick={{ fill: "var(--tp-slate-500)", fontSize: 11 }}
          stroke="var(--tp-slate-200)"
          width={40}
          label={{
            value: valueLabel,
            angle: -90,
            position: "insideLeft",
            offset: 4,
            style: { fill: "var(--tp-slate-500)", fontSize: 11 },
          }} />
        <Tooltip content={<TooltipBox formatLabel={tickFmt} />} cursor={{ stroke: "var(--tp-slate-300)", strokeDasharray: "3 3" }} />
        {percentileSelected.map((k) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={PERCENTILE_COLOR[k]}
            strokeWidth={1.6}
            dot={false}
            name={PERCENTILE_LABEL[k]}
            isAnimationActive={false}>
            <LabelList
              dataKey={k}
              position="right"
              content={({ x, y, index }) => {
                if (index !== data.length - 1) return null;
                return (
                  <text x={x + 4} y={y + 4} fill={PERCENTILE_COLOR[k]} fontSize={9} fontWeight={600} textAnchor="start">
                    {PERCENTILE_LABEL[k]}
                  </text>
                );
              }} />
          </Line>
        ))}
        <ReferenceLine
          x={PATIENT_AGE_MONTHS_TODAY}
          stroke={TODAY_LINE_COLOR}
          strokeWidth={1.4}
          label={<TodayRefLabel />} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HeightVsWeightChart({ percentileSelected }) {
  const data = useMemo(() => toHvwData(), []);
  // Patient height-vs-weight scattered onto same x-axis (cm).
  const patientPoints = PATIENT_HEIGHT.map((h, i) => ({
    cm: h.value,
    patient: PATIENT_WEIGHT[i]?.value ?? null,
  }));
  // Merge patient points into the percentile data array by cm.
  const merged = [...data, ...patientPoints]
    .reduce((acc, row) => {
      const existing = acc.find((r) => r.cm === row.cm);
      if (existing) Object.assign(existing, row);
      else acc.push({ ...row });
      return acc;
    }, [])
    .sort((a, b) => a.cm - b.cm);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={merged} margin={{ top: 20, right: 32, bottom: 24, left: 6 }}>
        <CartesianGrid stroke="rgba(226,232,240,0.7)" />
        <XAxis
          dataKey="cm"
          type="number"
          domain={[45, 115]}
          ticks={[50, 60, 70, 80, 90, 100, 110]}
          tickFormatter={(v) => `${v}`}
          tick={{ fill: "var(--tp-slate-500)", fontSize: 11 }}
          stroke="var(--tp-slate-200)"
          label={{
            value: "Height (cm)",
            position: "insideBottom",
            offset: -8,
            style: { fill: "var(--tp-slate-500)", fontSize: 11 },
          }} />
        <YAxis
          domain={[0, 28]}
          tick={{ fill: "var(--tp-slate-500)", fontSize: 11 }}
          stroke="var(--tp-slate-200)"
          width={40}
          label={{
            value: "Weight (kg)",
            angle: -90,
            position: "insideLeft",
            offset: 4,
            style: { fill: "var(--tp-slate-500)", fontSize: 11 },
          }} />
        <Tooltip content={<TooltipBox formatLabel={(v) => `${v} cm`} />} cursor={{ stroke: "var(--tp-slate-300)", strokeDasharray: "3 3" }} />
        {percentileSelected.map((k) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={PERCENTILE_COLOR[k]}
            strokeWidth={1.6}
            dot={false}
            connectNulls
            name={PERCENTILE_LABEL[k]}
            isAnimationActive={false}>
            <LabelList
              dataKey={k}
              position="right"
              content={({ x, y, index }) => {
                if (index !== merged.length - 1) return null;
                return (
                  <text x={x + 4} y={y + 4} fill={PERCENTILE_COLOR[k]} fontSize={9} fontWeight={600} textAnchor="start">
                    {PERCENTILE_LABEL[k]}
                  </text>
                );
              }} />
          </Line>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Per-chart card ────────────────────────────────────────────────────────────

const DEFAULT_PERCENTILES = ["P03", "P10", "P50", "P90", "P97"];

function ChartCard({ title, type }) {
  const [percentileSelected, setPercentileSelected] = useState([...DEFAULT_PERCENTILES]);
  const [showYears, setShowYears] = useState(true);

  const data = useMemo(() => {
    switch (type) {
      case "height": return toAgeAxisData(PATIENT_HEIGHT, PERCENTILES_HEIGHT);
      case "weight": return toAgeAxisData(PATIENT_WEIGHT, PERCENTILES_WEIGHT);
      case "bmi":    return toAgeAxisData(PATIENT_BMI,    PERCENTILES_BMI);
      case "ofc":    return toAgeAxisData(PATIENT_OFC,    PERCENTILES_OFC);
      default:       return [];
    }
  }, [type]);

  if (type === "hvw") {
    return (
      <ChartFrame
        title={title}
        percentileSelected={percentileSelected}
        onPercentileChange={setPercentileSelected}
        hideYears>
        <HeightVsWeightChart percentileSelected={percentileSelected} />
      </ChartFrame>
    );
  }

  const meta = {
    height: { unit: "Height (cm)", domain: [40, 110] },
    weight: { unit: "Weight (kg)", domain: [0, 20] },
    bmi:    { unit: "BMI (kg/m²)", domain: [10, 22] },
    ofc:    { unit: "OFC (cm)", domain: [30, 56] },
  }[type] ?? { unit: "", domain: ["auto", "auto"] };

  return (
    <ChartFrame
      title={title}
      percentileSelected={percentileSelected}
      onPercentileChange={setPercentileSelected}
      showYears={showYears}
      onYearsChange={setShowYears}>
      <AgeAxisChart
        data={data}
        valueLabel={meta.unit}
        percentileSelected={percentileSelected}
        showYears={showYears}
        yDomain={meta.domain} />
    </ChartFrame>
  );
}

// ── Public ────────────────────────────────────────────────────────────────────

export function GrowthContent() {
  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="growth" />
      <HistoricalNewDataBanner activeId="growth" />
      <div className="flex-[1_0_0] min-h-px min-w-px overflow-y-auto relative w-full" data-sticky-scroll-root="true">
        <div className="content-stretch flex flex-col gap-[12px] items-center p-[12px] relative w-full">
          <GrowthInfoCard />
          <ChartCard title="Height for Age" type="height" />
          <ChartCard title="Weight for Age" type="weight" />
          <ChartCard title="BMI for Age" type="bmi" />
          <ChartCard title="Head Circumference (OFC)" type="ofc" />
          <ChartCard title="Height vs Weight" type="hvw" />
        </div>
      </div>
    </div>
  );
}
