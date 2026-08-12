import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import {
  seriesToDonut,
  seriesToXY,
  anyToDonut,
} from "../../data-analytics/charts/adapters";
import { getDoctorList } from "../../data-analytics/data/doctorList";
import { pctDelta } from "../../data-analytics/data/deltaUtils";

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const safe = (p) => p.then((r) => r).catch(() => null);

const MODE_SERIES = [
  ["Smart Sync", "smartSync"],
  ["Voice RX", "voiceRx"],
  // Backend sometimes uses keyboardRx for point-and-click; match DataAnalytics logic.
  ["Type Rx", "typeRx"],
  ["Tab RX", "tabRx"],
  ["Snap RX", "snapRx"],
];

const FANOUT_CAP = 20;
// Export builds the doctor comparison for the FULL roster (the on-screen chart stays capped for
// readability/perf). Still bounded so a pathologically large clinic can't fan out unboundedly.
const EXPORT_FANOUT_CAP = 500;
const BATCH_SIZE = 4;

function singleIdOnly(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "all") return null;
  // CSV => multi-select; clinic/* endpoints reject CSV doctorId/clinicId.
  if (s.includes(",")) return null;
  return s;
}

function doctorFullName(d) {
  const named = String(d?.um_name || "").trim();
  const first = String(d?.um_first_name || d?.first_name || d?.firstName || "").trim();
  const last = String(d?.um_last_name || d?.last_name || d?.lastName || "").trim();
  const assembled = [first, last].filter(Boolean).join(" ");
  if (assembled && last) {
    const prefix = named.match(/^(Dr\.?\s*)/i)?.[0] || "";
    const body = assembled.replace(/^(Dr\.?\s*)/i, "");
    return `${prefix}${body}`.replace(/\s+/g, " ").trim();
  }
  return named || assembled || (d?.um_id != null ? `Doctor ${d.um_id}` : "");
}

function normalizeDoctorName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/^dr\.?\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveRosterDoctor(label, doctors) {
  const n = normalizeDoctorName(label);
  if (!n) return null;
  const exact = doctors.find((d) => normalizeDoctorName(doctorFullName(d)) === n || normalizeDoctorName(d.um_name) === n);
  if (exact) return exact;
  const first = n.split(" ")[0];
  const matches = doctors.filter((d) => normalizeDoctorName(doctorFullName(d)).split(" ")[0] === first);
  return matches.length === 1 ? matches[0] : null;
}

function unwrapApptKpis(raw) {
  const src = raw?.data ?? raw ?? {};
  return src.kpis ?? {};
}

/** Rx-mode "Booked" — only present when the doctor has Tatva consultation-mode activity. */
function bookedFromModesResponse(resp) {
  const ds = (resp?.data ?? resp)?.byDoctor?.datasets;
  if (!Array.isArray(ds)) return 0;
  const booked = ds.find((d) => String(d?.label || "").toLowerCase() === "booked");
  return toNum(booked?.data?.[0]);
}

function modeConsultationsFromKpis(kpis) {
  if (!kpis) return 0;
  return MODE_SERIES.reduce((sum, [, key]) => {
    const v = key === "typeRx" ? (kpis.typeRx ?? kpis.keyboardRx) : kpis[key];
    return sum + toNum(v);
  }, 0);
}

async function buildByDoctorFanout({
  startDate,
  endDate,
  clinicIdSingle,
  doctorIdCsv,
  cap = FANOUT_CAP,
} = {}) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);

  if (doctorIdCsv) {
    const wanted = new Set(String(doctorIdCsv).split(",").filter(Boolean));
    doctors = doctors.filter((d) => wanted.has(String(d.um_id)));
  }

  if (Number.isFinite(cap)) doctors = doctors.slice(0, cap);
  if (!doctors.length) {
    return { data: { kpis: { total: 0, smartSync: 0 }, byDoctor: { labels: [], datasets: [] } } };
  }

  const baseParams = {};
  if (startDate && endDate) {
    baseParams.startDate = startDate;
    baseParams.endDate = endDate;
  }
  if (clinicIdSingle) baseParams.clinicId = clinicIdSingle;

  // Per doctor: appointment/summary is the source of truth for booked +
  // completed (HIS/TP appointments). consultation-modes only sees Tatva Rx
  // activity, so doctors who booked but never consulted in TP were exported as 0.
  const rowsByDoctor = new Array(doctors.length);
  for (let i = 0; i < doctors.length; i += BATCH_SIZE) {
    const batch = doctors.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (d) => {
        const params = { ...baseParams, doctorId: d.um_id };
        const [modes, appt] = await Promise.all([
          ApiReporting.clinicConsultationModes(params).then((r) => (r?.data ?? r) ?? null).catch(() => null),
          ApiReporting.clinicalAppointmentSummary(params).then((r) => (r?.data ?? r) ?? null).catch(() => null),
        ]);
        return { modes, appt };
      })
    );
    results.forEach((r, j) => { rowsByDoctor[i + j] = r; });
  }

  const labels = doctors.map((d) => doctorFullName(d));
  const kpisByDoctor = rowsByDoctor.map((r) => r?.modes?.kpis ?? null);

  const booked = rowsByDoctor.map((r) => {
    if (r?.appt != null) return toNum(unwrapApptKpis(r.appt).total);
    return bookedFromModesResponse(r?.modes);
  });
  const consultations = rowsByDoctor.map((r, i) => {
    if (r?.appt != null) return toNum(unwrapApptKpis(r.appt).completed);
    return modeConsultationsFromKpis(kpisByDoctor[i]);
  });

  const byDoctor = {
    labels,
    datasets: [
      { label: "Booked", data: booked },
      { label: "Consultations", data: consultations },
    ],
  };

  // Mission cards only need these totals.
  const total = kpisByDoctor.reduce((sum, kpis) => sum + toNum(kpis?.total), 0);
  const smartSync = kpisByDoctor.reduce((sum, kpis) => sum + toNum(kpis?.smartSync), 0);

  return {
    data: {
      kpis: { total, smartSync },
      byDoctor,
    },
  };
}

/**
 * Build the Doctor Comparison rows for the FULL doctor roster (uncapped) — used by the Excel export
 * so the sheet lists every doctor, independent of the on-screen chart's top-10/cap. Fans out
 * consultation-modes per doctor and merges CVT digitized (one call, all doctors). Respects the
 * current doctor/clinic filter. Returns the same { data, series, xKey } shape as charts.byDoctor.
 */
export async function buildAllDoctorBars({ startDate, endDate, doctorId, clinicId } = {}) {
  const clinicIdSingle = singleIdOnly(clinicId);
  const doctorIdCsv = doctorId && doctorId !== "all" ? String(doctorId) : null;

  const modesFull = await buildByDoctorFanout({
    startDate,
    endDate,
    clinicIdSingle,
    doctorIdCsv,
    cap: EXPORT_FANOUT_CAP,
  });

  const cvtParams = {};
  if (startDate && endDate) { cvtParams.startDate = startDate; cvtParams.endDate = endDate; }
  if (doctorId && doctorId !== "all") cvtParams.doctorId = doctorId;
  if (clinicId && clinicId !== "all") cvtParams.clinicId = clinicId;
  const cvtRaw = await safe(ApiReporting.cvtByDoctor(cvtParams));
  const cvtByDoctorSeries = unwrapCvtSeries(unwrapCvtPayload(cvtRaw));

  return buildDoctorBars(modesFull.data.byDoctor, cvtByDoctorSeries, { compactLabels: false });
}

/** Replace Rx-only booked/completed on a clinic-wide consultation-modes byDoctor with appointment/summary. */
async function overlayAppointmentCounts(byDoctorSeries, { startDate, endDate, clinicIdSingle } = {}) {
  if (!byDoctorSeries?.labels?.length) return byDoctorSeries;
  const roster = (await getDoctorList()).filter((d) => d?.um_id != null);
  if (!roster.length) return byDoctorSeries;

  const resolved = byDoctorSeries.labels.map((label) => resolveRosterDoctor(label, roster));
  const baseParams = {};
  if (startDate && endDate) {
    baseParams.startDate = startDate;
    baseParams.endDate = endDate;
  }
  if (clinicIdSingle) baseParams.clinicId = clinicIdSingle;

  const apptByIndex = new Array(resolved.length);
  for (let i = 0; i < resolved.length; i += BATCH_SIZE) {
    const batch = resolved.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((d) => {
        if (!d?.um_id) return Promise.resolve(null);
        return ApiReporting.clinicalAppointmentSummary({ ...baseParams, doctorId: d.um_id })
          .then((r) => (r?.data ?? r) ?? null)
          .catch(() => null);
      })
    );
    results.forEach((r, j) => { apptByIndex[i + j] = r; });
  }

  const datasets = byDoctorSeries.datasets || [];
  const booked = byDoctorSeries.labels.map((_, i) => {
    if (apptByIndex[i] != null) return toNum(unwrapApptKpis(apptByIndex[i]).total);
    const bookedDs = datasets.find((ds) => String(ds.label || "").toLowerCase() === "booked");
    return toNum(bookedDs?.data?.[i]);
  });
  const consultations = byDoctorSeries.labels.map((_, i) => {
    if (apptByIndex[i] != null) return toNum(unwrapApptKpis(apptByIndex[i]).completed);
    return datasets.reduce((sum, ds) => (
      String(ds.label || "").toLowerCase() === "booked" ? sum : sum + toNum(ds.data?.[i])
    ), 0);
  });

  return {
    labels: byDoctorSeries.labels.map((label, i) => (
      resolved[i] ? doctorFullName(resolved[i]) : label
    )),
    datasets: [
      { label: "Booked", data: booked },
      { label: "Consultations", data: consultations },
    ],
  };
}

export default function useMissionData({ startDate, endDate, doctorId, clinicId, refreshKey } = {}) {
  const [state, setState] = useState({ loading: true, error: null, data: empty() });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const spAnalytics = {};
    if (startDate && endDate) { spAnalytics.startDate = startDate; spAnalytics.endDate = endDate; }
    if (doctorId && doctorId !== "all") spAnalytics.doctorId = doctorId;
    if (clinicId && clinicId !== "all") spAnalytics.clinicId = clinicId;

    // clinic/* endpoints reject CSV doctorId/clinicId, so use singleIdOnly or fan-out.
    const sd = singleIdOnly(doctorId);
    const sc = singleIdOnly(clinicId);

    const spModesSingle = {};
    if (startDate && endDate) { spModesSingle.startDate = startDate; spModesSingle.endDate = endDate; }
    if (sd) spModesSingle.doctorId = sd;
    if (sc) spModesSingle.clinicId = sc;

    const shouldFanoutModes =
      doctorId && doctorId !== "all" && !sd && String(doctorId).includes(",");

    const modesPromise = shouldFanoutModes
      ? safe(buildByDoctorFanout({ startDate, endDate, clinicIdSingle: sc, doctorIdCsv: doctorId }))
      : safe(ApiReporting.clinicConsultationModes(spModesSingle));

    const [apptRaw, apptSummaryRaw, patientsRaw, modesRaw, cvtDailyRaw, cvtByDoctorRaw] = await Promise.all([
      safe(ApiReporting.analyticsAppointment(spAnalytics)),
      safe(ApiReporting.clinicalAppointmentSummary(spAnalytics)),
      safe(ApiReporting.analyticsPatients(spAnalytics)),
      modesPromise,
      safe(ApiReporting.cvtDaily(spAnalytics)),
      safe(ApiReporting.cvtByDoctor(spAnalytics)),
    ]);

    return {
      apptRaw,
      apptSummaryRaw,
      patientsRaw,
      modesRaw,
      cvtDailyRaw,
      cvtByDoctorRaw,
      startDate,
      endDate,
      modesFromFanout: shouldFanoutModes,
    };
  }, [startDate, endDate, doctorId, clinicId, refreshKey]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const payload = await load();
      if (!alive || !payload) return;

      const {
        apptRaw,
        apptSummaryRaw,
        patientsRaw,
        modesRaw,
        cvtDailyRaw,
        cvtByDoctorRaw,
        startDate: rangeStart,
        endDate: rangeEnd,
        modesFromFanout,
      } = payload;

      const appt = apptRaw?.data ?? apptRaw ?? {};
      const apptSummary = apptSummaryRaw?.data ?? apptSummaryRaw ?? {};
      const liveKpis = apptSummary.kpis ?? {};
      const pt = patientsRaw?.data ?? patientsRaw ?? {};
      const ptKpis = pt.kpis ?? {};
      const modes = modesRaw?.data ?? modesRaw ?? {};
      const modesKpis = modes.kpis ?? {};

      const cvtDailySrc = unwrapCvtPayload(cvtDailyRaw);
      const cvtByDoctorSrc = unwrapCvtPayload(cvtByDoctorRaw);
      const cvtDailySeries = unwrapCvtSeries(cvtDailySrc);
      const cvtByDoctorSeries = unwrapCvtSeries(cvtByDoctorSrc);

      // Prefer daily totals; fall back to by-doctor payload if daily is missing.
      const totalDigitized = toNum(
        cvtDailySrc?.totalDigitized ?? cvtByDoctorSrc?.totalDigitized
      );
      const totalCases = toNum(cvtDailySrc?.totalCases ?? cvtByDoctorSrc?.totalCases);
      const digitalPrescriptionPercent =
        totalCases > 0 ? Math.round((100 * totalDigitized) / totalCases) : null;

      // Match Data Analytics Appointments: live summary KPIs (not operationalOverview / analytics donut).
      const totalFootfall = toNum(liveKpis.total);
      const completed = toNum(liveKpis.completed);
      const scheduled = toNum(liveKpis.inQueue);
      const cancelled = toNum(liveKpis.cancelled);
      const draft = toNum(liveKpis.draft);

      // Same period-over-period logic as useAppointmentsLive (Data Analytics Appointments).
      const prev = liveKpis.previous ?? {};
      const prevTotal = toNum(prev.total);
      const prevCompleted = toNum(prev.completed);
      const hasPrevFootfall = prevTotal > 0;
      const totalFootfallDelta = hasPrevFootfall ? pctDelta(totalFootfall, prevTotal) : null;
      const completedDelta = hasPrevFootfall ? pctDelta(completed, prevCompleted) : null;
      const avgVisitsPerDayDelta = totalFootfallDelta;

      const statusDonut = [
        { label: "Completed", value: completed },
        { label: "In queue", value: scheduled },
        { label: "Draft", value: draft },
        { label: "Cancelled", value: cancelled },
      ];

      const rangeDays = computeRangeDays(rangeStart, rangeEnd);

      const busiestDay = findBusiest(appt.visitsByWeekday);

      const visitTrend = buildVisitTrend(appt.appointments, cvtDailySeries);

      const byDoctorSeries = modesFromFanout
        ? modes.byDoctor
        : await overlayAppointmentCounts(modes.byDoctor, {
          startDate: rangeStart,
          endDate: rangeEnd,
          clinicIdSingle: singleIdOnly(clinicId),
        });
      const byDoctor = buildDoctorBars(byDoctorSeries, cvtByDoctorSeries, { compactLabels: true });

      const ageXY = seriesToXY(pt.age);
      const visitFreqXY = seriesToXY(pt.visitFrequency);
      const genderDonut = anyToDonut(pt.gender);
      const newVsReturning = seriesToDonut(appt.newVsReturning);

      const segmentation = buildSegmentation(pt.visitFrequency);

      if (!alive) return;

      setState({
        loading: false,
        error: null,
        data: {
          kpis: {
            totalFootfall,
            totalFootfallDelta,
            totalBooked: totalFootfall,
            completed,
            completedDelta,
            scheduled,
            cancelled,
            avgVisitsPerDay: rangeDays ? Math.round(totalFootfall / rangeDays) : 0,
            avgVisitsPerDayDelta,
            busiestDay,
            digitalPrescriptionPercent,
            totalDigitized,
            totalConsultations: toNum(modesKpis.total),
            smartSync: toNum(modesKpis.smartSync),
            totalPatients: toNum(ptKpis.totalPatients),
            oneTime: toNum(ptKpis.oneTime),
            returning: toNum(ptKpis.returning),
          },
          charts: {
            appointmentStatus: statusDonut,
            visitTrend,
            ageDistribution: ageXY,
            visitFrequency: visitFreqXY,
            genderDistribution: genderDonut,
            newVsReturning,
            segmentation,
            byDoctor,
          },
        },
      });
    })();

    return () => {
      alive = false;
    };
  }, [load]);

  return { ...state, reload: load };
}

function empty() {
  return {
    kpis: {
      totalFootfall: 0, totalFootfallDelta: null, totalBooked: 0,
      completed: 0, completedDelta: null, scheduled: 0,
      cancelled: 0, avgVisitsPerDay: 0, avgVisitsPerDayDelta: null,
      busiestDay: null,
      digitalPrescriptionPercent: null, totalDigitized: 0,
      totalConsultations: 0, smartSync: 0,
      totalPatients: 0, oneTime: 0, returning: 0,
    },
    charts: {
      appointmentStatus: [], visitTrend: null, ageDistribution: null,
      visitFrequency: null, genderDistribution: [], newVsReturning: [],
      segmentation: [], byDoctor: null,
    },
  };
}

function computeRangeDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const s = new Date(startDate);
  const e = new Date(endDate);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function findBusiest(visitsByWeekday) {
  if (!visitsByWeekday?.labels?.length) return null;
  const data = visitsByWeekday.datasets?.[0]?.data || [];
  let maxVal = 0, maxIdx = -1;
  data.forEach((v, i) => { if (toNum(v) > maxVal) { maxVal = toNum(v); maxIdx = i; } });
  return maxVal > 0 ? visitsByWeekday.labels[maxIdx] : null;
}

/** CVT endpoints wrap chart as { series, totalDigitized, totalCases }; tolerate top-level series too. */
function unwrapCvtPayload(raw) {
  if (!raw) return null;
  return raw?.data ?? raw;
}

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
    // Also keep raw label for 1:1 match when already "DD MMM".
    map.set(String(label), toNum(data[i]));
  });
  return map;
}

function buildDigitizedByDoctor(cvtByDoctor) {
  const map = new Map();
  if (!cvtByDoctor?.labels?.length) return map;
  const data = cvtByDoctor.datasets?.[0]?.data || [];
  cvtByDoctor.labels.forEach((name, i) => {
    const n = toNum(data[i]);
    map.set(String(name), n);
    const norm = normalizeDoctorName(name);
    if (norm) map.set(norm, n);
  });
  return map;
}

function buildVisitTrend(appointments, cvtDaily) {
  if (!appointments?.labels?.length) {
    const base = seriesToXY(appointments);
    return base;
  }

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

function buildDoctorBars(byDoctor, cvtByDoctor, { compactLabels = true } = {}) {
  if (!byDoctor?.labels?.length) return null;
  const doctors = byDoctor.labels;
  const datasets = byDoctor.datasets || [];
  const digitizedMap = buildDigitizedByDoctor(cvtByDoctor);

  const data = doctors.map((name, i) => {
    let booked = 0;
    let consultations = 0;
    datasets.forEach((ds) => {
      if (String(ds.label || "").toLowerCase() === "booked") {
        booked = toNum(ds.data?.[i]);
      } else {
        consultations += toNum(ds.data?.[i]);
      }
    });
    // Merge CVT by full doctor name before compacting the chart label.
    const digitized = toNum(
      digitizedMap.get(String(name)) ?? digitizedMap.get(normalizeDoctorName(name))
    );
    return {
      x: compactLabels ? compactDrName(name) : name,
      fullName: name,
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

function compactDrName(name) {
  if (typeof name !== "string") return name;
  const trimmed = name.trim();
  if (trimmed.length <= 14) return trimmed;
  const m = trimmed.match(/^(Dr\.?\s+)(\S+)/i);
  if (m) return m[1] + m[2];
  return trimmed.slice(0, 13).trimEnd() + "…";
}

function buildSegmentation(visitFrequency) {
  if (!visitFrequency?.labels?.length) return [];
  const data = visitFrequency.datasets?.[0]?.data || [];
  const labels = visitFrequency.labels;
  const buckets = { "New (1 visit)": 0, "Occasional (2-3)": 0, "Regular (4-10)": 0, "Loyal (10+)": 0 };
  labels.forEach((label, i) => {
    const count = toNum(data[i]);
    const l = String(label).trim();
    if (l === "1") buckets["New (1 visit)"] += count;
    else if (l === "2" || l === "3") buckets["Occasional (2-3)"] += count;
    else if (l === "4-5" || l === "6-10") buckets["Regular (4-10)"] += count;
    else if (l === "10+") buckets["Loyal (10+)"] += count;
  });
  return Object.entries(buckets).map(([label, value]) => ({ label, value }));
}
