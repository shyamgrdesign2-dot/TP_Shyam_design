import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import ApiBulkMessages from "../../../api/services/ApiBulkMessages";
import { anyToDonut, seriesToXY, compactXY, compactDoctorLabel } from "../charts/adapters";
import { toNum, pctDelta, singleIdOnly } from "./deltaUtils";
import { cached } from "./apiCache";

// ── Stacked "Usage by doctor" ────────────────────────────────────────────
// The backend's `byDoctor` is still a single "Consultations" series (spec
// §3.3 P1 asks for one dataset per mode). Until that ships, we assemble the
// REAL stacked data client-side: the endpoint already honours `doctorId`, so
// one call per doctor yields that doctor's true per-mode counts.
const MODE_SERIES = [
  ["Smart Sync", "smartSync"],
  ["Voice RX", "voiceRx"],
  ["Type Rx", "typeRx"],
  ["Tab RX", "tabRx"],
  ["Snap RX", "snapRx"],
];
const FANOUT_CAP = 20; // sanity cap on parallel calls

// Capability gating (spec §1.7): a mode the clinic/doctor doesn't have
// enabled is dropped from charts — UNLESS it carries real historical data
// (hiding non-zero numbers would corrupt the totals on screen).
const MODE_CAP_KEY = {
  "smart sync": "smartSync",
  "voice rx": "voiceRx",
  "type rx": "typeRx",
  "point and click": "typeRx",
  "tab rx": "tabRx",
  "snap rx": "snapRx",
};

const MODE_LABEL_NORM = { "point and click": "Type Rx", "type rx": "Type Rx" };
function normModeLabel(label) {
  return MODE_LABEL_NORM[String(label).toLowerCase()] || label;
}
function normTrendLabels(xy) {
  if (!xy?.series) return xy;
  const remap = {};
  const series = xy.series.map((s) => {
    const norm = normModeLabel(s.label);
    if (norm !== s.label || norm !== s.key) remap[s.key] = norm;
    return { key: norm, label: norm };
  });
  if (!Object.keys(remap).length) return { ...xy, series };
  const data = xy.data.map((row) => {
    const r = { ...row };
    for (const [old, nw] of Object.entries(remap)) {
      if (old in r && old !== nw) { r[nw] = (r[nw] || 0) + (r[old] || 0); delete r[old]; }
    }
    return r;
  });
  return { ...xy, data, series };
}
function modeAllowed(enabledModes, label, hasData) {
  if (!enabledModes) return true;
  const capKey = MODE_CAP_KEY[String(label).toLowerCase()];
  if (capKey == null || enabledModes[capKey]) return true;
  return hasData;
}

let doctorListPromise = null;
function getDoctorList() {
  if (!doctorListPromise) {
    doctorListPromise = ApiBulkMessages.listDoctor()
      .then((r) => (Array.isArray(r) ? r : r?.data ?? []))
      .catch(() => []);
  }
  return doctorListPromise;
}

const BATCH_SIZE = 4;

async function buildStackedByDoctor(baseParams, doctorFilterCsv) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);
  if (doctorFilterCsv) {
    const wanted = new Set(String(doctorFilterCsv).split(","));
    doctors = doctors.filter((d) => wanted.has(String(d.um_id)));
  }
  doctors = doctors.slice(0, FANOUT_CAP);
  if (!doctors.length) return null;

  // Batch in groups of BATCH_SIZE to avoid saturating the browser's
  // per-origin connection limit (6 for HTTP/1.1).
  const results = new Array(doctors.length);
  for (let i = 0; i < doctors.length; i += BATCH_SIZE) {
    const batch = doctors.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((d) =>
        cached(`modes-dr-${d.um_id}`, baseParams, () =>
          ApiReporting.clinicConsultationModes({ ...baseParams, doctorId: d.um_id })
        )
          .then((r) => (r?.data ?? r)?.kpis ?? null)
          .catch(() => null)
      )
    );
    batchResults.forEach((r, j) => { results[i + j] = r; });
  }

  const rows = doctors
    .map((d, i) => ({ name: d.um_name || `Doctor ${d.um_id}`, k: results[i] || { total: 0 } }))
    .sort((a, b) => toNum(b.k.total) - toNum(a.k.total));
  if (!rows.length) return null;

  return {
    labels: rows.map((r) => r.name),
    datasets: MODE_SERIES.map(([label, key]) => ({
      label,
      data: rows.map((r) => toNum(key === "typeRx" ? r.k.typeRx ?? r.k.keyboardRx : r.k[key])),
    })),
  };
}

export default function useConsultationModesData({ month, startDate, endDate, doctorId, clinicId, enabledModes } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: [],
    modeMix: [],
    modeTrend: null,
    byDoctor: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (month) params.month = month;
    // Range overrides month server-side (API-CONTRACTS-CURRENT §1)
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    // clinic-family endpoint: single ids only (CSV silently narrows to the
    // first id server-side). Multi-doctor is handled by the per-doctor
    // stacked fan-out below, which filters by the selected CSV client-side.
    const singleDoctor = singleIdOnly(doctorId);
    const singleClinic = singleIdOnly(clinicId);
    if (singleDoctor) params.doctorId = singleDoctor;
    if (singleClinic) params.clinicId = singleClinic;

    const payload = await cached("modes", params, () => ApiReporting.clinicConsultationModes(params)).catch(() => null);
    const src = payload?.data ?? payload ?? {};

    // Prefer the backend's byDoctor only once it is per-mode (multi-dataset);
    // otherwise assemble the true stacked series via per-doctor calls.
    let byDoctor = src.byDoctor ? compactXY(seriesToXY(src.byDoctor), compactDoctorLabel) : null;
    if ((src.byDoctor?.datasets?.length || 0) <= 1) {
      const baseParams = {};
      if (month) baseParams.month = month;
      if (startDate && endDate) {
        baseParams.startDate = startDate;
        baseParams.endDate = endDate;
      }
      if (singleClinic) baseParams.clinicId = singleClinic;
      const stacked = await buildStackedByDoctor(baseParams, doctorId && doctorId !== "all" ? doctorId : null);
      if (stacked) byDoctor = compactXY(seriesToXY(stacked), compactDoctorLabel);
    }

    // Who uses it most — the doctor with the highest consultation volume
    // (summed across all modes from the stacked by-doctor data)
    const kpisOut = buildKpis(src.kpis);
    const most = mostActiveDoctor(byDoctor);
    if (most) {
      kpisOut.push({ key: "mostActiveDoctor", label: "Most active doctor", kind: "text", value: most, tooltip: "Doctor with the most consultations in the selected period, across all modes" });
    }

    if (byDoctor) byDoctor = normTrendLabels(byDoctor);

    // Drop disabled modes from the donut and the stacked series — zero rows
    // for a feature the account doesn't have are noise, not insight.
    const modeMix = anyToDonut(src.modeMix)
      .map((d) => ({ ...d, label: normModeLabel(d.label) }))
      .filter((d) => modeAllowed(enabledModes, d.label, toNum(d.value) > 0));
    if (byDoctor?.series?.length) {
      const kept = byDoctor.series.filter((se) =>
        modeAllowed(
          enabledModes,
          se.label || se.key,
          (byDoctor.data || []).some((row) => toNum(row[se.key]) > 0)
        )
      );
      byDoctor = { ...byDoctor, series: kept };
    }

    setState({
      loading: false,
      error: null,
      kpis: kpisOut,
      modeMix,
      modeTrend: src.modeTrend ? normTrendLabels(seriesToXY(src.modeTrend)) : null,
      byDoctor,
    });
    // enabledModes is consumed via ref-stable JSON below
  }, [month, startDate, endDate, doctorId, clinicId, JSON.stringify(enabledModes)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

// Per-mode counts are NOT KPI cards — that is exactly what the mode-mix donut
// shows. The cards answer the three questions the doctor actually asks:
// how many, which mode leads, and how far along is assisted-Rx adoption.
const MODES = [
  ["Smart Sync", "smartSync", true],
  ["Voice RX", "voiceRx", true],
  ["Snap RX", "snapRx", true],
  ["Tab RX", "tabRx", false],
  ["Type Rx", "typeRx", false],
];

function buildKpis(raw) {
  if (!raw) return defaultKpis();
  const prev = raw.previous ?? raw.lastPeriod ?? {};
  const hasPrev = prev && toNum(prev.total) > 0;
  const total = toNum(raw.total);

  let topMode = null;
  let topCount = 0;
  let assisted = 0;
  let prevAssisted = 0;
  for (const [label, key, isAssisted] of MODES) {
    const n = toNum(key === "typeRx" ? raw.typeRx || raw.keyboardRx : raw[key]);
    if (n > topCount) {
      topMode = label;
      topCount = n;
    }
    if (isAssisted) {
      assisted += n;
      prevAssisted += toNum(key === "typeRx" ? prev.typeRx || prev.keyboardRx : prev[key]);
    }
  }

  return [
    { key: "total", label: "Total consultations", kind: "number", value: total, tooltip: "Consultations across all Rx modes in the selected period", ...(hasPrev ? { delta: pctDelta(total, toNum(prev.total)) } : {}) },
    { key: "topMode", label: "Top mode", kind: "text", value: topMode || "No data", tooltip: "The Rx mode used most often in the selected period" },
    { key: "aiAssisted", label: "AI-assisted Rx", kind: "number", value: assisted, tooltip: "Consultations completed with an AI-assisted mode (Smart Sync, Voice RX or Snap RX) in the selected period", ...(hasPrev ? { delta: pctDelta(assisted, prevAssisted) } : {}) },
  ];
}

function mostActiveDoctor(byDoctor) {
  const rows = byDoctor?.data;
  const keys = (byDoctor?.series || []).map((se) => se.key);
  if (!Array.isArray(rows) || !rows.length || !keys.length) return null;
  let best = null;
  let bestTotal = 0;
  for (const row of rows) {
    const t = keys.reduce((a, k) => a + (Number(row[k]) || 0), 0);
    if (t > bestTotal) {
      bestTotal = t;
      best = row.x;
    }
  }
  return bestTotal > 0 ? best : null;
}

function defaultKpis() {
  return [
    { key: "total", label: "Total consultations", kind: "number", value: 0, tooltip: "Consultations across all Rx modes in the selected period" },
    { key: "topMode", label: "Top mode", kind: "text", value: "No data", tooltip: "The Rx mode used most often in the selected period" },
    { key: "aiAssisted", label: "AI-assisted Rx", kind: "number", value: 0, tooltip: "Consultations completed with an AI-assisted mode (Smart Sync, Voice RX or Snap RX) in the selected period" },
  ];
}

