import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, seriesToXY, compactXY, compactDoctorLabel } from "../charts/adapters";
import { toNum, pctDelta, singleIdOnly, safe } from "./deltaUtils";
import { cached } from "./apiCache";
import { getDoctorList } from "./doctorList";

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

const BATCH_SIZE = 4;

const META_DATASET = /^(booked|completed|draft)$/i;

function unwrapPayload(raw) {
  return (raw?.data ?? raw) ?? null;
}

/** Read a single-doctor consultation-modes response's "Booked" value (its byDoctor has one row). */
function bookedFromModesResponse(resp) {
  const ds = resp?.byDoctor?.datasets;
  if (!Array.isArray(ds)) return 0;
  const booked = ds.find((d) => String(d?.label || "").toLowerCase() === "booked");
  return toNum(booked?.data?.[0]);
}

function modeTotalFromKpis(kpis) {
  if (!kpis) return 0;
  return MODE_SERIES.reduce((sum, [, key]) => {
    const v = key === "typeRx" ? (kpis.typeRx ?? kpis.keyboardRx) : kpis[key];
    return sum + toNum(v);
  }, 0);
}

function datasetValueByLabel(datasets, matcher) {
  if (!Array.isArray(datasets)) return null;
  const hit = datasets.find((d) => matcher(String(d?.label || "")));
  return hit ? toNum(hit.data?.[0]) : null;
}

/**
 * Draft Rx is counted inside consultation-modes per-mode KPIs (typeRx, etc.).
 * Appointment summary is the source that splits draft out of completed.
 */
function draftCountFromResponses(modesResp, apptResp) {
  const modesK = modesResp?.kpis ?? {};
  if (modesK.draft != null && modesK.draft !== "") return toNum(modesK.draft);
  const fromModesChart = datasetValueByLabel(
    modesResp?.byDoctor?.datasets,
    (l) => /draft/i.test(l)
  );
  if (fromModesChart != null) return fromModesChart;
  const apptK = apptResp?.kpis ?? {};
  return toNum(apptK.draft);
}

/** Completed consultations for doctor-wise comparison: Rx mode total minus draft. */
function completedConsultsFromResponses(modesResp, apptResp) {
  const modesK = modesResp?.kpis ?? {};
  const draft = draftCountFromResponses(modesResp, apptResp);
  return Math.max(0, modeTotalFromKpis(modesK) - draft);
}

async function buildStackedByDoctor(baseParams, doctorFilterCsv) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);
  if (doctorFilterCsv) {
    const wanted = new Set(String(doctorFilterCsv).split(","));
    doctors = doctors.filter((d) => wanted.has(String(d.um_id)));
  }
  doctors = doctors.slice(0, FANOUT_CAP);
  if (!doctors.length) return null;

  // Batch in groups of BATCH_SIZE to avoid saturating the browser's
  // per-origin connection limit (6 for HTTP/1.1). Keep the full response
  // (not just kpis) so we can also read each doctor's "Booked" count.
  // Appointment summary is fetched alongside so draft can be subtracted
  // from the doctor-wise "Consultations completed" bar.
  const rowsByDoctor = new Array(doctors.length);
  for (let i = 0; i < doctors.length; i += BATCH_SIZE) {
    const batch = doctors.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (d) => {
        const params = { ...baseParams, doctorId: d.um_id };
        const [modes, appt] = await Promise.all([
          cached(`modes-dr-${d.um_id}`, baseParams, () =>
            ApiReporting.clinicConsultationModes(params)
          )
            .then(unwrapPayload)
            .catch(() => null),
          cached(`appt-sum-dr-${d.um_id}`, baseParams, () =>
            ApiReporting.clinicalAppointmentSummary(params)
          )
            .then(unwrapPayload)
            .catch(() => null),
        ]);
        return { modes, appt };
      })
    );
    batchResults.forEach((r, j) => { rowsByDoctor[i + j] = r; });
  }

  const rows = doctors
    .map((d, i) => {
      const { modes, appt } = rowsByDoctor[i] || {};
      return {
        name: d.um_name || `Doctor ${d.um_id}`,
        resp: modes,
        appt,
        k: modes?.kpis ?? { total: 0 },
      };
    })
    .sort((a, b) => toNum(b.k.total) - toNum(a.k.total));
  if (!rows.length) return null;

  return {
    labels: rows.map((r) => r.name),
    // Booked + Completed are comparison series. Mode series stay for
    // Usage-by-doctor; Completed is Rx totals with draft removed.
    datasets: [
      { label: "Booked", data: rows.map((r) => bookedFromModesResponse(r.resp)) },
      { label: "Completed", data: rows.map((r) => completedConsultsFromResponses(r.resp, r.appt)) },
      ...MODE_SERIES.map(([label, key]) => ({
        label,
        data: rows.map((r) => toNum(key === "typeRx" ? r.k.typeRx ?? r.k.keyboardRx : r.k[key])),
      })),
    ],
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
    visitTrend: null,
    doctorComparison: null,
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
    // clinic/consultation-modes rejects CSV doctorId/clinicId (400)
    if (singleIdOnly(doctorId)) params.doctorId = singleIdOnly(doctorId);
    if (singleIdOnly(clinicId)) params.clinicId = singleIdOnly(clinicId);
    const singleClinic = singleIdOnly(clinicId);

    // CVT (digitization) data — fetched in parallel with the main modes call.
    const cvtParams = {};
    if (startDate && endDate) { cvtParams.startDate = startDate; cvtParams.endDate = endDate; }
    if (doctorId && doctorId !== "all") cvtParams.doctorId = doctorId;
    if (clinicId && clinicId !== "all") cvtParams.clinicId = clinicId;

    const apptParams = {};
    if (startDate && endDate) { apptParams.startDate = startDate; apptParams.endDate = endDate; }
    if (doctorId && doctorId !== "all") apptParams.doctorId = doctorId;
    if (clinicId && clinicId !== "all") apptParams.clinicId = clinicId;

    const [payload, cvtDailyRaw, cvtByDoctorRaw, apptRaw] = await Promise.all([
      cached("modes", params, () => ApiReporting.clinicConsultationModes(params)).catch(() => null),
      safe(cached("cvtDaily", cvtParams, () => ApiReporting.cvtDaily(cvtParams))),
      safe(cached("cvtByDoctor", cvtParams, () => ApiReporting.cvtByDoctor(cvtParams))),
      safe(cached("apptAnalytics", apptParams, () => ApiReporting.analyticsAppointment(apptParams))),
    ]);
    const src = payload?.data ?? payload ?? {};

    // CVT data extraction
    const cvtDailySrc = cvtDailyRaw?.data ?? cvtDailyRaw;
    const cvtByDoctorSrc = cvtByDoctorRaw?.data ?? cvtByDoctorRaw;
    const cvtDailySeries = unwrapCvtSeries(cvtDailySrc);
    const cvtByDoctorSeries = unwrapCvtSeries(cvtByDoctorSrc);
    const totalDigitized = toNum(cvtDailySrc?.totalDigitized ?? cvtByDoctorSrc?.totalDigitized);
    const totalCases = toNum(cvtDailySrc?.totalCases ?? cvtByDoctorSrc?.totalCases);
    const digitalPrescriptionPercent = totalCases > 0 ? Math.round((100 * totalDigitized) / totalCases) : null;

    // Visit trend: booked vs completed vs digitized (daily)
    const apptData = apptRaw?.data ?? apptRaw ?? {};
    const visitTrend = buildVisitTrend(apptData.appointments, cvtDailySeries);

    // Always fan-out per-doctor so every clinic doctor appears (even with
    // zero data). The backend's byDoctor omits zero-data doctors.
    // Keep full names through CVT join for doctorComparison; compact only
    // for the Usage-by-doctor stacked chart (modes only, no Booked series).
    let byDoctor = null;
    let doctorComparison = null;
    {
      const baseParams = {};
      if (month) baseParams.month = month;
      if (startDate && endDate) {
        baseParams.startDate = startDate;
        baseParams.endDate = endDate;
      }
      if (singleClinic) baseParams.clinicId = singleClinic;
      const stacked = await buildStackedByDoctor(baseParams, doctorId && doctorId !== "all" ? doctorId : null);
      if (stacked) {
        doctorComparison = buildDoctorComparison(stacked, cvtByDoctorSeries);
        const modesOnly = {
          labels: stacked.labels,
          datasets: (stacked.datasets || []).filter(
            (ds) => !META_DATASET.test(String(ds.label || ""))
          ),
        };
        byDoctor = compactXY(seriesToXY(modesOnly), compactDoctorLabel);
      }
    }

    // Who uses it most — the doctor with the highest consultation volume
    // (summed across all modes from the stacked by-doctor data)
    const kpisOut = buildKpis(src.kpis);

    // CVT KPIs
    if (digitalPrescriptionPercent != null) {
      kpisOut.push({ key: "digitizationPct", label: "Digitization %", kind: "percent", value: digitalPrescriptionPercent, tooltip: "Digitized prescriptions as a share of total CVT cases in the selected period" });
    }
    if (totalDigitized > 0) {
      kpisOut.push({ key: "totalDigitized", label: "Total digitized", kind: "number", value: totalDigitized, tooltip: "Prescriptions digitized (CVT) in the selected period" });
    }

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
      kept.sort((a, b) => {
        const tA = (byDoctor.data || []).reduce((s, r) => s + (Number(r[a.key]) || 0), 0);
        const tB = (byDoctor.data || []).reduce((s, r) => s + (Number(r[b.key]) || 0), 0);
        return tB - tA;
      });
      byDoctor = { ...byDoctor, series: kept };
    }

    setState({
      loading: false,
      error: null,
      kpis: kpisOut,
      modeMix,
      modeTrend: src.modeTrend ? normTrendLabels(seriesToXY(src.modeTrend)) : null,
      byDoctor,
      visitTrend,
      doctorComparison,
    });
    // enabledModes is consumed via ref-stable JSON below
  }, [month, startDate, endDate, doctorId, clinicId, JSON.stringify(enabledModes)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

// ── CVT (digitization) helpers ──────────────────────────────────────────
function unwrapCvtSeries(payload) {
  if (!payload) return null;
  const series = payload.series ?? payload;
  if (series?.labels && Array.isArray(series.datasets)) return series;
  return null;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortenDateLabel(label) {
  if (typeof label !== "string") return label;
  const m = label.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return label;
  return `${parseInt(m[3], 10)} ${SHORT_MONTHS[parseInt(m[2], 10) - 1]}`;
}

function findDatasetByLabel(datasets, matcher) {
  return (datasets || []).find((d) => matcher(String(d?.label || "")));
}

function buildDigitizedByLabel(cvtSeries) {
  const map = new Map();
  if (!cvtSeries?.labels?.length) return map;
  const data = cvtSeries.datasets?.[0]?.data || [];
  cvtSeries.labels.forEach((label, i) => {
    const key = shortenDateLabel(label);
    map.set(String(key), toNum(data[i]));
    map.set(String(label), toNum(data[i]));
  });
  return map;
}

function buildDigitizedByDoctor(cvtByDoctor) {
  const map = new Map();
  if (!cvtByDoctor?.labels?.length) return map;
  const data = cvtByDoctor.datasets?.[0]?.data || [];
  cvtByDoctor.labels.forEach((name, i) => {
    map.set(String(name), toNum(data[i]));
  });
  return map;
}

function buildVisitTrend(appointments, cvtDaily) {
  if (!appointments?.labels?.length) return null;

  const datasets = appointments.datasets || [];
  const bookedDs =
    findDatasetByLabel(datasets, (l) => /booked|total appointment/i.test(l)) ||
    datasets.find((d) => !/completed/i.test(String(d?.label || ""))) ||
    datasets[0];
  const completedDs = findDatasetByLabel(datasets, (l) => /completed/i.test(l));

  const digitizedMap = buildDigitizedByLabel(cvtDaily);
  const cvtData = cvtDaily?.datasets?.[0]?.data || [];

  const data = appointments.labels.map((label, i) => {
    const x = shortenDateLabel(label);
    let digitized = digitizedMap.get(String(x));
    if (digitized == null) digitized = digitizedMap.get(String(label));
    if (digitized == null && cvtDaily?.labels?.length === appointments.labels.length) {
      digitized = toNum(cvtData[i]);
    }
    return {
      x,
      booked: toNum(bookedDs?.data?.[i]),
      completed: toNum(completedDs?.data?.[i]),
      digitized: toNum(digitized),
    };
  });

  return {
    data,
    series: [
      { key: "booked", label: "Appointments booked" },
      { key: "completed", label: "Consultations completed" },
      { key: "digitized", label: "Digitized (CVT)" },
    ],
    xKey: "x",
  };
}

function buildDoctorComparison(byDoctorSeries, cvtByDoctor) {
  if (!byDoctorSeries?.labels?.length) return null;
  const doctors = byDoctorSeries.labels;
  const datasets = byDoctorSeries.datasets || [];
  const digitizedMap = buildDigitizedByDoctor(cvtByDoctor);
  const bookedDs = findDatasetByLabel(datasets, (l) => l.toLowerCase() === "booked");
  const completedDs = findDatasetByLabel(datasets, (l) => l.toLowerCase() === "completed");

  const data = doctors.map((name, i) => {
    const booked = toNum(bookedDs?.data?.[i]);
    // Prefer the draft-stripped Completed series. Never sum Rx-mode
    // datasets here — those include draft prescriptions.
    const consultations = completedDs
      ? toNum(completedDs.data?.[i])
      : datasets.reduce((sum, ds) => {
          const label = String(ds.label || "").toLowerCase();
          if (META_DATASET.test(label)) return sum;
          return sum + toNum(ds.data?.[i]);
        }, 0);
    // Merge CVT by full doctor name before compacting the x-axis label.
    const digitized = toNum(digitizedMap.get(String(name)));
    return {
      x: compactDoctorLabel(name),
      booked,
      consultations,
      digitized,
    };
  });
  return {
    data,
    series: [
      { key: "booked", label: "Appointments booked" },
      { key: "consultations", label: "Consultations completed" },
      { key: "digitized", label: "Digitized (CVT)" },
    ],
    xKey: "x",
  };
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
    { key: "topMode", label: "Top consultation mode", kind: "text", value: topMode || "No data", tooltip: "The Rx mode used most often in the selected period" },
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
    { key: "topMode", label: "Top consultation mode", kind: "text", value: "No data", tooltip: "The Rx mode used most often in the selected period" },
  ];
}

