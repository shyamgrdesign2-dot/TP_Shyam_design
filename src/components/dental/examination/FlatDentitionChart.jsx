"use client";

// Flat dentition chart — a print-friendly, full-width schematic of the whole
// mouth drawn with anatomically-shaped tooth silhouettes (a flat "front view"
// of the arch). Reads the saved examination chart from localStorage so it can
// render inside the Rx preview / printed report without sharing the live
// DentalCanvas React state.
//
// Teeth the doctor has recorded something on (diagnosis / treatment / finding /
// missing) render at full opacity with a status colour + indicator; untouched
// teeth are dimmed. The FDI number under each tooth is also colour-coded.

import { useEffect, useRef, useState } from "react";
import { VISUAL_TYPE, getVisualType } from "../../../utils/dentalVisualTypes";
import { ORAL_POSITION_LABEL } from "./types";
import { QuickSurfaceSelector } from "./QuickSurfaceSelector";
import {
  ADULT_UPPER_ROW,
  ADULT_LOWER_ROW,
  PEDIATRIC_UPPER_ROW,
  PEDIATRIC_LOWER_ROW,
  CHART_TITLES,
  getFdiRowsForDentitionType,
  getMaxHalfAspectSum,
  getToothImageCandidatesForFdi,
  PEDIATRIC_MIXED_BAND_WIDTH_RATIO,
  resolveChartsToRenderFromChart,
} from "./dentalChartConstants";
import fdc from "./FlatDentitionChart.module.scss";

const EXAM_CHART_PREFIX = "dental.exam.chart.";

const isMissingDiag = (d) => getVisualType(d) === VISUAL_TYPE.MISSING;

function loadChart(patientId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${EXAM_CHART_PREFIX}${patientId || "apt-1"}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Geometry ──────────────────────────────────────────────────────────────
const SLOT = 33;        // horizontal slot allotted per tooth
const CENTER_GAP = 16;  // extra gap between the two quadrants of a row
const PAD = 8;
const TH = 58;          // tooth glyph height
const LABEL_H = 14;
const ROW_GAP = 18;
const TOP = 4;

const CHART_W = PAD * 2 + 16 * SLOT + CENTER_GAP;

function xSlot(i) {
  return PAD + i * SLOT + (i >= 8 ? CENTER_GAP : 0);
}
function rowTop(rowIdx) {
  return TOP + rowIdx * (TH + LABEL_H + ROW_GAP);
}
const SVG_H = rowTop(2) - ROW_GAP + 2;

// ── Tooth silhouettes ───────────────────────────────────────────────────────
// Each shape is a list of path segments in a normalised box: nx ∈ [0,1] across
// the width, ny ∈ [0,1] down the height where ny=0 is the root apex and ny=1 is
// the biting (crown) edge. Upper teeth keep this orientation (roots up); lower
// teeth are flipped vertically so their crowns point up — both mirror anatomy.
const SHAPES = {
  incisor: [
    ["M", [0.5, 0.02]],
    ["C", [0.72, 0.08], [0.82, 0.34], [0.84, 0.48]],
    ["L", [0.86, 0.86]],
    ["Q", [0.86, 0.99], [0.66, 0.99]],
    ["L", [0.34, 0.99]],
    ["Q", [0.14, 0.99], [0.14, 0.86]],
    ["L", [0.16, 0.48]],
    ["C", [0.18, 0.34], [0.28, 0.08], [0.5, 0.02]],
    ["Z"],
  ],
  canine: [
    ["M", [0.5, 0.0]],
    ["C", [0.74, 0.06], [0.85, 0.32], [0.86, 0.46]],
    ["L", [0.86, 0.8]],
    ["L", [0.5, 1.0]],
    ["L", [0.14, 0.8]],
    ["L", [0.14, 0.46]],
    ["C", [0.15, 0.32], [0.26, 0.06], [0.5, 0.0]],
    ["Z"],
  ],
  premolar: [
    ["M", [0.5, 0.03]],
    ["C", [0.72, 0.1], [0.83, 0.34], [0.84, 0.46]],
    ["L", [0.85, 0.84]],
    ["Q", [0.85, 0.98], [0.66, 0.98]],
    ["Q", [0.5, 0.98], [0.5, 0.88]],
    ["Q", [0.5, 0.98], [0.34, 0.98]],
    ["Q", [0.15, 0.98], [0.15, 0.84]],
    ["L", [0.16, 0.46]],
    ["C", [0.17, 0.34], [0.28, 0.1], [0.5, 0.03]],
    ["Z"],
  ],
  molar: [
    ["M", [0.1, 0.84]],
    ["L", [0.11, 0.5]],
    ["C", [0.11, 0.4], [0.05, 0.16], [0.26, 0.06]],
    ["C", [0.35, 0.02], [0.42, 0.2], [0.46, 0.4]],
    ["C", [0.5, 0.22], [0.58, 0.02], [0.7, 0.06]],
    ["C", [0.9, 0.14], [0.89, 0.4], [0.89, 0.5]],
    ["L", [0.9, 0.84]],
    ["Q", [0.9, 0.98], [0.72, 0.98]],
    ["Q", [0.6, 0.98], [0.55, 0.9]],
    ["Q", [0.5, 0.99], [0.45, 0.9]],
    ["Q", [0.4, 0.98], [0.28, 0.98]],
    ["Q", [0.1, 0.98], [0.1, 0.84]],
    ["Z"],
  ],
};

// FDI second digit → tooth type, plus a sensible glyph width per type.
function toothType(fdi) {
  const d = fdi[1];
  if (d === "1" || d === "2") return "incisor";
  if (d === "3") return "canine";
  if (d === "4" || d === "5") return "premolar";
  return "molar";
}
const TYPE_WIDTH = { incisor: 20, canine: 21, premolar: 25, molar: 30 };

function buildPath(type, gx, tw, top, upper) {
  const segs = SHAPES[type];
  const mx = (nx) => gx + nx * tw;
  const my = (ny) => top + (upper ? ny : 1 - ny) * TH;
  let d = "";
  for (const [cmd, ...pts] of segs) {
    if (cmd === "Z") { d += "Z"; continue; }
    d += cmd + pts.map(([nx, ny]) => `${mx(nx).toFixed(1)},${my(ny).toFixed(1)}`).join(" ") + " ";
  }
  return d.trim();
}

function toothState(fdi, toothDiagnoses, findingsByTooth, chartEntries = []) {
  const diags = toothDiagnoses?.[fdi] ?? [];
  const findings = (findingsByTooth?.[fdi] ?? []).filter((f) => f && f.type && f.type !== "Normal");
  const entryCount = chartEntries.filter(
    (e) => e && String(e.toothFdi) === String(fdi),
  ).length;
  const isMissing = diags.some(isMissingDiag);
  const treated = diags.length > 0 && !isMissing;
  const findingCount = findings.length;
  const hasAny = diags.length > 0 || findingCount > 0 || entryCount > 0;
  return { isMissing, treated, findingCount, hasAny };
}

// Colour by status priority: missing → diagnosis/treated → finding → normal.
function styleFor(st) {
  if (st.isMissing) return { fill: "#eef2f7", stroke: "#94a3b8", sw: 1.3, num: "#94a3b8", opacity: 0.85 };
  if (st.treated) return { fill: "#ede9fe", stroke: "#7c3aed", sw: 1.7, num: "#7c3aed", opacity: 1 };
  if (st.findingCount > 0) return { fill: "#fff7ed", stroke: "#ea580c", sw: 1.7, num: "#ea580c", opacity: 1 };
  return { fill: "#ffffff", stroke: "#cbd5e1", sw: 1.1, num: "#94a3b8", opacity: 0.8 };
}

function Tooth({ fdi, slotX, top, upper, st }) {
  const type = toothType(fdi);
  const tw = TYPE_WIDTH[type];
  const gx = slotX + (SLOT - tw) / 2;
  const s = styleFor(st);
  const d = buildPath(type, gx, tw, top, upper);

  // Crown centre (for the missing cross / finding dot).
  const cx = gx + tw / 2;
  const crownY = top + (upper ? 0.82 : 0.18) * TH;
  const r = tw * 0.26;

  return (
    <g opacity={s.opacity}>
      <path d={d} fill={s.fill} stroke={s.stroke} strokeWidth={s.sw} strokeLinejoin="round" />
      {st.isMissing && (
        <>
          <line x1={cx - r} y1={crownY - r} x2={cx + r} y2={crownY + r} stroke="#64748b" strokeWidth="1.4" />
          <line x1={cx + r} y1={crownY - r} x2={cx - r} y2={crownY + r} stroke="#64748b" strokeWidth="1.4" />
        </>
      )}
      {!st.isMissing && st.treated && st.findingCount > 0 && (
        <circle cx={cx + tw * 0.28} cy={top + (upper ? 0.6 : 0.4) * TH} r="3.2" fill="#ea580c" stroke="#fff" strokeWidth="0.8" />
      )}
      <text
        x={slotX + SLOT / 2}
        y={top + TH + 11}
        textAnchor="middle"
        fontSize="9"
        fontWeight={st.hasAny ? 800 : 600}
        fill={s.num}
        fontFamily="Inter, sans-serif"
      >
        {fdi}
      </text>
    </g>
  );
}

// Compact PNG-based tooth cell for the Rx dental chart. Uses the captured
// front-view images (Azure blob: images/teeth/<fdi>.webp); teeth with recorded
// data are highlighted with a violet ring + violet number.
// Flex weight per tooth ≈ its width/height aspect, so cells size proportionally
// and every tooth renders at the SAME height (molars get wider cells, so they
// no longer look small). The row uses width:100%, so it always fits the page.
// Exact width/height of each trimmed tooth PNG → flex weight, so every tooth
// renders at the SAME height (cells size proportionally) and the row fits width.
const toothCandidates = (fdi) => getToothImageCandidatesForFdi(fdi);

// Per-tooth surface zones recorded in the chart (for the read-only selector).
function zonesByToothFromChart(chart) {
  const zonesByTooth = {};
  const add = (fdi, z) => { (zonesByTooth[fdi] = zonesByTooth[fdi] || new Set()).add(z); };
  Object.entries(chart?.findingsByTooth || {}).forEach(([fdi, list]) => {
    (list || []).forEach((f) => { if (f && f.type && f.type !== "Normal" && f.zoneId) add(fdi, f.zoneId); });
  });
  (chart?.entries || []).forEach((e) => { (e.surfaces || []).forEach((z) => add(e.toothFdi, z)); });
  Object.entries(chart?.toothDiagnoses || {}).forEach(([fdi, diags]) => {
    (diags || []).forEach((d) => { if (!isMissingDiag(d)) add(fdi, "whole"); });
  });
  return zonesByTooth;
}

function ChartToothCell({ fdi, st, h, arch, zones, variant = "full" }) {
  const hasData = st.hasAny || st.isMissing;
  const pos = Number(fdi[1]) || 6;
  const [assetIdx, setAssetIdx] = useState(0);
  const candidates = toothCandidates(fdi);
  const toothSrc = candidates[Math.min(assetIdx, candidates.length - 1)];

  useEffect(() => {
    setAssetIdx(0);
  }, [fdi]);

  const onToothImageError = () => {
    setAssetIdx((prev) => (prev + 1 < candidates.length ? prev + 1 : prev));
  };

  const showImage = variant === "full" || variant === "images";
  const showLabel = variant === "full" || variant === "images";
  const showSurfaces = variant === "full" || variant === "surfaces";

  const toothImg = showImage ? (
    <img
      src={toothSrc}
      alt={fdi}
      decoding="async"
      onError={onToothImageError}
      className={`${fdc.toothImg} ${hasData ? fdc.toothImgStroke : ""}`}
      style={{
        height: h,
        opacity: st.isMissing ? 0.4 : 1,
      }}
    />
  ) : null;

  const img = showImage ? (
    <div className={`${fdc.toothImgShell} ${hasData ? fdc.toothImgShellHasData : ""}`}>
      {toothImg}
    </div>
  ) : null;
  const num = showLabel ? (
    <span className={`${fdc.toothNum} ${hasData ? fdc.toothNumHasData : fdc.toothNumPlain}`}>
      {fdi}
    </span>
  ) : null;
  const selector = showSurfaces ? (
    <div className={fdc.selectorWrap}>
      <div className={fdc.selectorScale}>
        <QuickSurfaceSelector selectedZones={zones || new Set()} onToggleZone={() => {}} arch={arch} toothPosition={pos} zonesWithFindings={new Set()} />
      </div>
    </div>
  ) : null;

  const parts = [];
  if (showImage) parts.push(img);
  if (showLabel) parts.push(num);
  if (showSurfaces) parts.push(selector);
  const stack =
    arch === "maxillary"
      ? parts
      : [...parts].sort((a, b) => {
          const rank = (node) => (node === selector ? 0 : node === num ? 1 : 2);
          return rank(a) - rank(b);
        });

  return (
    <div className={fdc.toothCell}>
      {stack.map((el, i) => (
        <div key={i}>{el}</div>
      ))}
    </div>
  );
}

function FlatDentitionChartSection({
  chart,
  alwaysRender,
  dentitionType,
  title,
  upperRow,
  lowerRow,
  teethPerQuadrant,
}) {
  const wrapRef = useRef(null);
  const [toothH, setToothH] = useState(84);

  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth || 660;
      const CENTRE_RESERVE = 9;
      const half = (w - CENTRE_RESERVE) / 2;
      const maxHalfAspectSum = getMaxHalfAspectSum(dentitionType);
      const H = Math.max(40, Math.min(80, (half / maxHalfAspectSum) * 0.65));
      setToothH(H);
    };
    measure();
    let ro;
    if (typeof ResizeObserver !== "undefined" && wrapRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(wrapRef.current);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [chart, dentitionType]);

  const toothDiagnoses = chart?.toothDiagnoses ?? {};
  const findingsByTooth = chart?.findingsByTooth ?? {};
  const chartEntries = Array.isArray(chart?.entries) ? chart.entries : [];

  const anyData =
    chartEntries.length > 0 ||
    Object.values(toothDiagnoses).some((a) => (a || []).length > 0) ||
    Object.values(findingsByTooth).some((a) => (a || []).length > 0);
  if (!anyData && !alwaysRender) return null;

  const zonesByTooth = zonesByToothFromChart(chart);
  const cell = (fdi, arch, variant = "full") => (
    <ChartToothCell
      key={`${fdi}-${variant}`}
      fdi={fdi}
      h={toothH}
      arch={arch}
      variant={variant}
      zones={zonesByTooth[fdi]}
      st={toothState(fdi, toothDiagnoses, findingsByTooth, chartEntries)}
    />
  );
  const row = (fdis, arch, variant = "full") => (
    <div className={fdc.chartRow}>
      <div className={fdc.chartHalf}>{fdis.slice(0, teethPerQuadrant).map((fdi) => cell(fdi, arch, variant))}</div>
      <div className={fdc.chartDivider} />
      <div className={fdc.chartHalf}>{fdis.slice(teethPerQuadrant).map((fdi) => cell(fdi, arch, variant))}</div>
    </div>
  );

  return (
    <section className={fdc.chartSection} data-dental-flat-chart="true" data-dentition-type={dentitionType}>
      <h3 className={fdc.chartTitle}>{title}</h3>
      <div ref={wrapRef} className={fdc.chartWrap}>
        {row(upperRow, "maxillary", "full")}
        <div className={fdc.chartJawDivider} />
        {row(lowerRow, "mandibular", "full")}
      </div>
    </section>
  );
}

function FlatMixedDentitionChartSection({ chart, alwaysRender }) {
  const wrapRef = useRef(null);
  const [toothH, setToothH] = useState(64);

  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth || 660;
      const CENTRE_RESERVE = 9;
      const half = (w - CENTRE_RESERVE) / 2;
      const maxHalfAspectSum = getMaxHalfAspectSum("mixed");
      const H = Math.max(36, Math.min(48, (half / maxHalfAspectSum) * 0.64));
      setToothH(H);
    };
    measure();
    let ro;
    if (typeof ResizeObserver !== "undefined" && wrapRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(wrapRef.current);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [chart]);

  const toothDiagnoses = chart?.toothDiagnoses ?? {};
  const findingsByTooth = chart?.findingsByTooth ?? {};
  const chartEntries = Array.isArray(chart?.entries) ? chart.entries : [];

  const anyData =
    chartEntries.length > 0 ||
    Object.values(toothDiagnoses).some((a) => (a || []).length > 0) ||
    Object.values(findingsByTooth).some((a) => (a || []).length > 0);
  if (!anyData && !alwaysRender) return null;

  const zonesByTooth = zonesByToothFromChart(chart);
  const cell = (fdi, arch, variant) => (
    <ChartToothCell
      key={`${fdi}-${variant}`}
      fdi={fdi}
      h={toothH}
      arch={arch}
      variant={variant}
      zones={zonesByTooth[fdi]}
      st={toothState(fdi, toothDiagnoses, findingsByTooth, chartEntries)}
    />
  );
  const bandRow = (fdis, arch, variant, perQuadrant, { pediatric = false } = {}) => (
    <div
      className={`${fdc.chartRow} ${pediatric ? fdc.chartRowPediatric : ""}`}
      style={pediatric ? { width: `${PEDIATRIC_MIXED_BAND_WIDTH_RATIO * 100}%` } : undefined}
    >
      <div className={fdc.chartHalf}>{fdis.slice(0, perQuadrant).map((fdi) => cell(fdi, arch, variant))}</div>
      <div className={fdc.chartDivider} />
      <div className={fdc.chartHalf}>{fdis.slice(perQuadrant).map((fdi) => cell(fdi, arch, variant))}</div>
    </div>
  );

  return (
    <section className={fdc.chartSection} data-dental-flat-chart="true" data-dentition-type="mixed">
      <h3 className={fdc.chartTitle}>{CHART_TITLES.mixed}</h3>
      <div ref={wrapRef} className={fdc.chartWrap} style={{ gap: 12 }}>
        {bandRow(ADULT_UPPER_ROW, "maxillary", "images", 8)}
        {bandRow(ADULT_UPPER_ROW, "maxillary", "surfaces", 8)}
        {bandRow(PEDIATRIC_UPPER_ROW, "maxillary", "images", 5, { pediatric: true })}
        {bandRow(PEDIATRIC_UPPER_ROW, "maxillary", "surfaces", 5, { pediatric: true })}
        <div className={fdc.chartJawDivider} />
        {bandRow(PEDIATRIC_LOWER_ROW, "mandibular", "surfaces", 5, { pediatric: true })}
        {bandRow(PEDIATRIC_LOWER_ROW, "mandibular", "images", 5, { pediatric: true })}
        {bandRow(ADULT_LOWER_ROW, "mandibular", "surfaces", 8)}
        {bandRow(ADULT_LOWER_ROW, "mandibular", "images", 8)}
      </div>
    </section>
  );
}

export function FlatDentitionChart({ patientId, chart: chartProp, alwaysRender = false }) {
  const [chart, setChart] = useState(chartProp ?? null);
  useEffect(() => {
    if (chartProp) return;
    setChart(loadChart(patientId));
  }, [patientId, chartProp]);

  const resolvedChart = chartProp ?? chart;
  const { isMixed, showPediatric } = resolveChartsToRenderFromChart(resolvedChart);

  if (isMixed) {
    return (
      <FlatMixedDentitionChartSection chart={resolvedChart} alwaysRender={alwaysRender} />
    );
  }

  const rows = getFdiRowsForDentitionType(showPediatric ? "pediatric" : "adult");
  return (
    <FlatDentitionChartSection
      chart={resolvedChart}
      alwaysRender={alwaysRender}
      dentitionType={showPediatric ? "pediatric" : "adult"}
      title={rows.title}
      upperRow={rows.upperRow}
      lowerRow={rows.lowerRow}
      teethPerQuadrant={rows.teethPerQuadrant}
    />
  );
}

// OralExamReport — region-level oral findings & procedures for the Rx / printed
// report. Reads the same saved exam chart and lists each region's entries.
// `showDates` (passed in from RxPreviewDocument when `settings.includeHistorical`
// is on) appends a per-entry date chip next to each entry's name so historical
// merges read cleanly without one big section-level date covering everything.
export function OralExamReport({ patientId, chart: chartProp, view = "list", showDates = false }) {
  const [chart, setChart] = useState(chartProp ?? null);
  useEffect(() => {
    if (chartProp) return;
    setChart(loadChart(patientId));
  }, [patientId, chartProp]);

  const entries = Array.isArray(chart?.oralEntries) ? chart.oralEntries : [];
  const notes = (chart?.oralNotes || "").trim();
  if (entries.length === 0 && !notes) return null;

  // Per-entry date label — uses each entry's `updatedAt` if present, else the
  // chart-level `updatedAt`, else today. Mental model: editing ANY oral entry
  // in the current visit promotes its stamp to now (matches the per-tooth
  // semantics on the dental side).
  const dt = (v) => {
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return v;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return String(v ?? ""); }
  };
  const fallbackDate = chart?.updatedAt ?? new Date().toISOString();
  const entryDateLabel = (e) => dt(e?.updatedAt ?? fallbackDate);
  // Reusable date chip — matches the dental tooth-date treatment exactly
  // (10px / 500 slate-500). Wrap in a span so JSX can be reused inline.
  const DateChip = ({ value }) => (
    <span style={{ fontSize: 10, fontWeight: 500, color: "#64748b", marginLeft: 6, whiteSpace: "nowrap" }}>· {value}</span>
  );

  // Group by primary site (first position) so the printed report matches the
  // on-screen records layout (site as the header, items inside).
  const order = [];
  const byKey = {};
  const itemParts = (e) => {
    const since = (e.since || "").trim();
    const note = (e.note || "").trim();
    const bits = [];
    if (since) bits.push(`since ${since}`);
    if (note) bits.push(note);
    const region = (e.surfaces || []).map((s) => ORAL_POSITION_LABEL[s] || s).join(", ");
    return { name: e.name, meta: bits.join(", "), region, since, note, date: entryDateLabel(e) };
  };
  entries.forEach((e) => {
    const positions = e.surfaces || [];
    const key = positions.length ? positions[0] : "WHOLE";
    if (!byKey[key]) { byKey[key] = { label: ORAL_POSITION_LABEL[key] || key, past: [], findings: [], procedures: [] }; order.push(key); }
    if (e.kind === "past") byKey[key].past.push(itemParts(e));
    else if (e.kind === "procedure") byKey[key].procedures.push(itemParts(e));
    else byKey[key].findings.push(itemParts(e));
  });

  const itemText = (it) => it.name + (it.meta ? ` (${it.meta})` : "");
  const fmtList = (list) => list.map(itemText).join(", ");
  const heading = (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: "#334155", margin: "0 0 6px", fontFamily: "Inter, sans-serif" }}>Oral Examination</h3>
  );
  if (view === "table") {
    // Oral examination is NOT per-tooth — the doctor records by KIND first
    // (Past Procedures / Findings / Procedures) and tags a region. Print
    // matches that mental model: group by kind, region is a column inside
    // each kind's flat table. No per-site grouping or region headings.
    const allPast = [];
    const allFindings = [];
    const allProcs = [];
    entries.forEach((e) => {
      const item = itemParts(e);
      if (e.kind === "past") allPast.push(item);
      else if (e.kind === "procedure") allProcs.push(item);
      else allFindings.push(item);
    });
    const wrap = { border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", fontFamily: "Inter, sans-serif", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
    const kindHead = { background: "#eef2f7", padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#1e293b", borderBottom: "1px solid #e2e8f0" };
    const tbl = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
    const th = { textAlign: "left", padding: "6px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "#64748b", background: "#f7f9fb", borderBottom: "1px solid #e6ebf1" };
    const td = { padding: "6px 10px", fontSize: 12, color: "#475569", verticalAlign: "top", borderTop: "1px solid #e6ebf1", wordBreak: "break-word" };
    const tdName = { ...td, fontWeight: 600, color: "#334155" };
    const colW = ["32%", "26%", "16%", "26%"];
    // When historical is on, name cell carries the per-entry date next to
    // the entry name (no extra column — keeps the table tight).
    const kindTable = (label, list) => list.length ? (
      <div style={wrap}>
        <div style={kindHead}>{label}</div>
        <table style={tbl}>
          <thead><tr>{["Name", "Area", "Since", "Notes"].map((t, ci) => <th key={t} style={{ ...th, width: colW[ci] }}>{t}</th>)}</tr></thead>
          <tbody>{list.map((it, ri) => (
            <tr key={ri}><td style={tdName}>{it.name}{showDates && <DateChip value={it.date} />}</td><td style={td}>{it.region || "—"}</td><td style={td}>{it.since || "—"}</td><td style={td}>{it.note || "—"}</td></tr>
          ))}</tbody>
        </table>
      </div>
    ) : null;
    return (
      <section style={{ marginTop: 12, breakInside: "avoid", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} data-oral-exam-report="true">
        {heading}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {kindTable("Past Procedures", allPast)}
          {kindTable("Findings", allFindings)}
          {kindTable("Procedures", allProcs)}
          {notes && <div style={wrap}><div style={kindHead}>Overall Notes</div><div style={{ padding: "8px 12px", fontSize: 12, color: "#475569" }}>{notes}</div></div>}
        </div>
      </section>
    );
  }
  if (view === "inline") {
    // Mirror the table layout: group by KIND (Past Procedures / Findings /
    // Procedures), with region + since + note collapsed into a single bracket
    // per item. Colon separators (no em dashes).
    const allPast = [], allFindings = [], allProcs = [];
    entries.forEach((e) => {
      const item = itemParts(e);
      if (e.kind === "past") allPast.push(item);
      else if (e.kind === "procedure") allProcs.push(item);
      else allFindings.push(item);
    });
    const inlineItemNode = (it, i) => {
      const bits = [];
      if (it.region) bits.push(it.region);
      if (it.since) bits.push(`since ${it.since}`);
      if (it.note) bits.push(it.note);
      const bracket = bits.length ? ` (${bits.join(", ")})` : "";
      return (
        <span key={i}>{i > 0 ? ", " : ""}{it.name}{bracket}{showDates && <DateChip value={it.date} />}</span>
      );
    };
    const segs = [
      { label: "Past Procedures", list: allPast },
      { label: "Findings",        list: allFindings },
      { label: "Procedures",      list: allProcs },
    ].filter((s) => s.list.length);
    return (
      <section style={{ marginTop: 12, breakInside: "avoid", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} data-oral-exam-report="true">
        {heading}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, fontFamily: "Inter, sans-serif" }}>
          {segs.map((s) => (
            <p key={s.label} style={{ margin: 0, fontSize: 11.5, color: "#475569", lineHeight: 1.45 }}><span style={{ fontWeight: 700, color: "#1e293b" }}>{s.label}:</span> {s.list.map(inlineItemNode)}</p>
          ))}
          {notes && <p style={{ margin: 0, fontSize: 11.5, color: "#475569" }}><span style={{ fontWeight: 700, color: "#1e293b" }}>Notes:</span> {notes}</p>}
        </div>
      </section>
    );
  }
  return (
    <section
      style={{ marginTop: 12, breakInside: "avoid", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      data-oral-exam-report="true"
    >
      <h3 style={{ fontSize: 12, fontWeight: 700, color: "#334155", margin: "0 0 6px", fontFamily: "Inter, sans-serif" }}>
        Oral Examination
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, fontFamily: "Inter, sans-serif" }}>
        {order.map((key) => {
          const g = byKey[key];
          return (
            <div key={key}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1e293b", display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ color: "#1e293b" }}>•</span>{g.label}
              </p>
              <div style={{ paddingLeft: 14, display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                {[["Past Procedures", g.past], ["Findings", g.findings], ["Procedures", g.procedures]].map(([secLabel, list]) => (
                  list.length > 0 ? (
                    <div key={secLabel}>
                      <p style={{ margin: 0, fontSize: 11.5, color: "#475569", display: "flex", gap: 5, alignItems: "baseline", lineHeight: 1.4 }}>
                        <span style={{ color: "#cbd5e1" }}>•</span><span style={{ fontWeight: 600 }}>{secLabel}</span>
                      </p>
                      <div style={{ paddingLeft: 14, display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
                        {list.map((it, i) => (
                          <p key={i} style={{ margin: 0, fontSize: 11.5, color: "#475569", display: "flex", gap: 5, alignItems: "baseline", lineHeight: 1.4 }}>
                            <span style={{ color: "#94a3b8" }}>•</span><span><span style={{ fontWeight: 600, color: "#334155" }}>{it.name}</span>{it.meta ? ` (${it.meta})` : ""}{showDates && <DateChip value={it.date} />}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          );
        })}
        {notes && (
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1e293b", display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ color: "#1e293b" }}>•</span>Overall Notes
            </p>
            <div style={{ paddingLeft: 14, marginTop: 2 }}>
              <p style={{ margin: 0, fontSize: 11.5, color: "#475569", display: "flex", gap: 5, alignItems: "baseline", lineHeight: 1.4 }}>
                <span style={{ color: "#cbd5e1" }}>•</span><span>{notes}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
