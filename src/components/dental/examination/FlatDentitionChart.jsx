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
import { ORAL_POSITION_LABEL } from "./types";
import { QuickSurfaceSelector } from "./QuickSurfaceSelector";

const EXAM_CHART_PREFIX = "dental.exam.chart.";

// Permanent dentition, laid left→right as seen facing the patient.
const UPPER_ROW = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_ROW = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];

const MISSING = new Set(["Missing", "Extraction"]);

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

function toothState(fdi, toothDiagnoses, findingsByTooth) {
  const diags = toothDiagnoses?.[fdi] ?? [];
  const findings = (findingsByTooth?.[fdi] ?? []).filter((f) => f && f.type && f.type !== "Normal");
  const isMissing = diags.some((d) => MISSING.has(d));
  const treated = diags.length > 0 && !isMissing;
  const findingCount = findings.length;
  const hasAny = diags.length > 0 || findingCount > 0;
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
// front-view images (/teeth/<fdi>.png); teeth with recorded data are
// highlighted with a violet ring + violet number.
const TOOTH_ASPECT = { "11": 0.371, "12": 0.371, "13": 0.341, "14": 0.354, "15": 0.373, "16": 0.505, "17": 0.513, "18": 0.515, "21": 0.371, "22": 0.371, "23": 0.341, "24": 0.354, "25": 0.373, "26": 0.505, "27": 0.513, "28": 0.515, "31": 0.3, "32": 0.287, "33": 0.307, "34": 0.334, "35": 0.342, "36": 0.668, "37": 0.55, "38": 0.658, "41": 0.3, "42": 0.287, "43": 0.307, "44": 0.334, "45": 0.342, "46": 0.668, "47": 0.55, "48": 0.658 };
function toothCellAspect(fdi) { return TOOTH_ASPECT[fdi] || 0.45; }
const TOOTH_STROKE = "drop-shadow(1.2px 0 0 #7c3aed) drop-shadow(-1.2px 0 0 #7c3aed) drop-shadow(0 1.2px 0 #7c3aed) drop-shadow(0 -1.2px 0 #7c3aed)";

const MAX_HALF_ASPECT_SUM = 3.45;

function zonesByToothFromChart(chart) {
  const zonesByTooth = {};
  const add = (fdi, z) => { (zonesByTooth[fdi] = zonesByTooth[fdi] || new Set()).add(z); };
  Object.entries(chart?.findingsByTooth || {}).forEach(([fdi, list]) => {
    (list || []).forEach((f) => { if (f && f.type && f.type !== "Normal" && f.zoneId) add(fdi, f.zoneId); });
  });
  (chart?.entries || []).forEach((e) => { (e.surfaces || []).forEach((z) => add(e.toothFdi, z)); });
  Object.entries(chart?.toothDiagnoses || {}).forEach(([fdi, diags]) => {
    (diags || []).forEach((d) => { if (d !== "Missing" && d !== "Extraction") add(fdi, "whole"); });
  });
  return zonesByTooth;
}

function ChartToothCell({ fdi, st, h, arch, zones }) {
  const hasData = st.hasAny || st.isMissing;
  const pos = Number(fdi[1]) || 6;
  const img = (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", borderRadius: 7, background: hasData ? "rgba(124,58,237,0.10)" : "transparent", boxSizing: "border-box", padding: "2px 2px" }}>
      <img src={`/teeth/${fdi}.webp`} alt={fdi} decoding="async" style={{ height: h, width: "auto", display: "block", opacity: st.isMissing ? 0.4 : 1, filter: hasData ? TOOTH_STROKE : undefined }} />
    </div>
  );
  const num = <span style={{ fontSize: 10, fontWeight: hasData ? 800 : 600, color: hasData ? "#1e293b" : "#94a3b8", fontFamily: "Inter, sans-serif" }}>{fdi}</span>;
  const selector = (
    <div style={{ width: 38, height: 78, position: "relative", overflow: "hidden", display: "flex", justifyContent: "center" }}>
      <div style={{ transform: "scale(0.48)", transformOrigin: "top center" }}>
        <QuickSurfaceSelector selectedZones={zones || new Set()} onToggleZone={() => {}} arch={arch} toothPosition={pos} zonesWithFindings={new Set()} />
      </div>
    </div>
  );
  const stack = arch === "maxillary" ? [img, num, selector] : [selector, num, img];
  return (
    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      {stack.map((el, i) => <div key={i}>{el}</div>)}
    </div>
  );
}

export function FlatDentitionChart({ patientId, chart: chartProp, alwaysRender = false }) {
  const [chart, setChart] = useState(chartProp ?? null);
  const wrapRef = useRef(null);
  const [toothH, setToothH] = useState(84);
  useEffect(() => {
    if (chartProp) return;
    setChart(loadChart(patientId));
  }, [patientId, chartProp]);

  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth || 660;
      const CENTRE_RESERVE = 9;
      const half = (w - CENTRE_RESERVE) / 2;
      const H = Math.max(40, Math.min(80, (half / MAX_HALF_ASPECT_SUM) * 0.65));
      setToothH(H);
    };
    measure();
    let ro;
    if (typeof ResizeObserver !== "undefined" && wrapRef.current) { ro = new ResizeObserver(measure); ro.observe(wrapRef.current); }
    window.addEventListener("resize", measure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", measure); };
  }, [chart]);

  const toothDiagnoses = chart?.toothDiagnoses ?? {};
  const findingsByTooth = chart?.findingsByTooth ?? {};

  const anyData =
    Object.values(toothDiagnoses).some((a) => (a || []).length > 0) ||
    Object.values(findingsByTooth).some((a) => (a || []).length > 0);
  if (!anyData && !alwaysRender) return null;

  const zonesByTooth = zonesByToothFromChart(chart);
  const cell = (fdi, arch) => (
    <ChartToothCell key={fdi} fdi={fdi} h={toothH} arch={arch} zones={zonesByTooth[fdi]} st={toothState(fdi, toothDiagnoses, findingsByTooth)} />
  );
  const row = (fdis, arch) => (
    <div style={{ display: "flex", alignItems: "stretch" }}>
      <div style={{ flex: "1 1 0", display: "flex", justifyContent: "space-evenly" }}>{fdis.slice(0, 8).map((fdi) => cell(fdi, arch))}</div>
      <div style={{ width: 1, background: "#e2e8f0", margin: "0 4px" }} />
      <div style={{ flex: "1 1 0", display: "flex", justifyContent: "space-evenly" }}>{fdis.slice(8).map((fdi) => cell(fdi, arch))}</div>
    </div>
  );

  return (
    <section
      style={{ marginTop: 14, padding: "0 14px", breakInside: "avoid", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      data-dental-flat-chart="true"
    >
      <h3 style={{ fontSize: 12, fontWeight: 700, color: "#334155", margin: "0 0 8px", fontFamily: "Inter, sans-serif" }}>
        Dental Chart
      </h3>
      <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: 8, filter: "grayscale(1)" }}>
        {row(UPPER_ROW, "maxillary")}
        <div style={{ height: 1, background: "#e2e8f0" }} />
        {row(LOWER_ROW, "mandibular")}
      </div>
    </section>
  );
}

export function OralExamReport({ patientId, chart: chartProp, view = "list", showDates = false }) {
  const [chart, setChart] = useState(chartProp ?? null);
  useEffect(() => {
    if (chartProp) return;
    setChart(loadChart(patientId));
  }, [patientId, chartProp]);

  const entries = Array.isArray(chart?.oralEntries) ? chart.oralEntries : [];
  const notes = (chart?.oralNotes || "").trim();
  if (entries.length === 0 && !notes) return null;

  const dt = (v) => {
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return v;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return String(v ?? ""); }
  };
  const fallbackDate = chart?.updatedAt ?? new Date().toISOString();
  const entryDateLabel = (e) => dt(e?.updatedAt ?? fallbackDate);
  const DateChip = ({ value }) => (
    <span style={{ fontSize: 10, fontWeight: 500, color: "#64748b", marginLeft: 6, whiteSpace: "nowrap" }}>· {value}</span>
  );

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
    if (!byKey[key]) {
      byKey[key] = { label: ORAL_POSITION_LABEL[key] || key, past: [], findings: [], procedures: [] };
      order.push(key);
    }
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
