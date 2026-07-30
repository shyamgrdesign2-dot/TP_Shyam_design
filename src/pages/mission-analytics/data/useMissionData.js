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
const BATCH_SIZE = 4;

function singleIdOnly(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "all") return null;
  // CSV => multi-select; clinic/* endpoints reject CSV doctorId/clinicId.
  if (s.includes(",")) return null;
  return s;
}

async function buildByDoctorFanout({ startDate, endDate, clinicIdSingle, doctorIdCsv } = {}) {
  let doctors = (await getDoctorList()).filter((d) => d?.um_id != null);

  if (doctorIdCsv) {
    const wanted = new Set(String(doctorIdCsv).split(",").filter(Boolean));
    doctors = doctors.filter((d) => wanted.has(String(d.um_id)));
  }

  doctors = doctors.slice(0, FANOUT_CAP);
  if (!doctors.length) {
    return { data: { kpis: { total: 0, smartSync: 0 }, byDoctor: { labels: [], datasets: [] } } };
  }

  const baseParams = {};
  if (startDate && endDate) {
    baseParams.startDate = startDate;
    baseParams.endDate = endDate;
  }
  if (clinicIdSingle) baseParams.clinicId = clinicIdSingle;

  // Fetch one clinic/consultation-modes per doctor to build a stacked "byDoctor" chart.
  const kpisByDoctor = new Array(doctors.length);
  for (let i = 0; i < doctors.length; i += BATCH_SIZE) {
    const batch = doctors.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((d) =>
        ApiReporting.clinicConsultationModes({ ...baseParams, doctorId: d.um_id })
          .then((r) => (r?.data ?? r)?.kpis ?? null)
          .catch(() => null)
      )
    );
    results.forEach((k, j) => { kpisByDoctor[i + j] = k; });
  }

  const labels = doctors.map((d) => d.um_name || `Doctor ${d.um_id}`);

  const byDoctor = {
    labels,
    datasets: MODE_SERIES.map(([label, key]) => ({
      label,
      data: doctors.map((_, idx) => {
        const kpis = kpisByDoctor[idx];
        if (!kpis) return 0;
        const v = key === "typeRx" ? (kpis.typeRx ?? kpis.keyboardRx) : kpis[key];
        return toNum(v);
      }),
    })),
  };

  // Mission cards only need these totals.
  const total = doctors.reduce((sum, _, idx) => sum + toNum(kpisByDoctor[idx]?.total), 0);
  const smartSync = doctors.reduce((sum, _, idx) => sum + toNum(kpisByDoctor[idx]?.smartSync), 0);

  return {
    data: {
      kpis: { total, smartSync },
      byDoctor,
    },
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

    const [apptRaw, apptSummaryRaw, patientsRaw, modesRaw] = await Promise.all([
      safe(ApiReporting.analyticsAppointment(spAnalytics)),
      safe(ApiReporting.clinicalAppointmentSummary(spAnalytics)),
      safe(ApiReporting.analyticsPatients(spAnalytics)),
      modesPromise,
    ]);

    const appt = apptRaw?.data ?? apptRaw ?? {};
    const apptSummary = apptSummaryRaw?.data ?? apptSummaryRaw ?? {};
    const liveKpis = apptSummary.kpis ?? {};
    const pt = patientsRaw?.data ?? patientsRaw ?? {};
    const ptKpis = pt.kpis ?? {};
    const modes = modesRaw?.data ?? modesRaw ?? {};
    const modesKpis = modes.kpis ?? {};

    // Match Data Analytics Appointments: live summary KPIs (not operationalOverview / analytics donut).
    const totalFootfall = toNum(liveKpis.total);
    const completed = toNum(liveKpis.completed);
    const scheduled = toNum(liveKpis.inQueue);
    const cancelled = toNum(liveKpis.cancelled);

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
      { label: "Cancelled", value: cancelled },
    ];

    const rangeDays = computeRangeDays(startDate, endDate);

    const busiestDay = findBusiest(appt.visitsByWeekday);

    const visitTrend = buildVisitTrend(appt.appointments);

    const byDoctor = buildDoctorBars(modes.byDoctor, modesKpis);

    const ageXY = seriesToXY(pt.age);
    const visitFreqXY = seriesToXY(pt.visitFrequency);
    const genderDonut = anyToDonut(pt.gender);
    const newVsReturning = seriesToDonut(appt.newVsReturning);

    const segmentation = buildSegmentation(pt.visitFrequency);

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
  }, [startDate, endDate, doctorId, clinicId, refreshKey]);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}

function empty() {
  return {
    kpis: {
      totalFootfall: 0, totalFootfallDelta: null, totalBooked: 0,
      completed: 0, completedDelta: null, scheduled: 0,
      cancelled: 0, avgVisitsPerDay: 0, avgVisitsPerDayDelta: null,
      busiestDay: null,
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

function buildVisitTrend(appointments) {
  const base = seriesToXY(appointments);
  if (!base?.data?.length) return base;
  const srcKey = base.series?.[0]?.key || "value";
  const data = base.data.map((row) => ({
    x: row[base.xKey],
    booked: toNum(row[srcKey]),
    completed: 0,
    digitized: 0,
  }));
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

function buildDoctorBars(byDoctor, modesKpis) {
  if (!byDoctor?.labels?.length) return null;
  const doctors = byDoctor.labels;
  const datasets = byDoctor.datasets || [];
  const data = doctors.map((name, i) => {
    let consultations = 0;
    datasets.forEach((ds) => { consultations += toNum(ds.data?.[i]); });
    return {
      x: compactDrName(name),
      booked: 0,
      consultations,
      digitized: 0,
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
