import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import {
  seriesToDonut,
  seriesToXY,
  anyToDonut,
  isEmptyDonut,
} from "../../data-analytics/charts/adapters";

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const safe = (p) => p.then((r) => r).catch(() => null);
const fmt = (d) => d.toISOString().slice(0, 10);

export default function useMissionData({ startDate, endDate } = {}) {
  const [state, setState] = useState({ loading: true, error: null, data: empty() });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const sp = {};
    if (startDate && endDate) { sp.startDate = startDate; sp.endDate = endDate; }

    const [apptRaw, overviewRaw, patientsRaw, modesRaw] = await Promise.all([
      safe(ApiReporting.analyticsAppointment(sp)),
      safe(ApiReporting.operationalOverview(sp)),
      safe(ApiReporting.analyticsPatients(sp)),
      safe(ApiReporting.clinicConsultationModes(sp)),
    ]);

    const appt = apptRaw?.data ?? apptRaw ?? {};
    const ov = overviewRaw?.data ?? overviewRaw ?? {};
    const pt = patientsRaw?.data ?? patientsRaw ?? {};
    const ptKpis = pt.kpis ?? {};
    const modes = modesRaw?.data ?? modesRaw ?? {};
    const modesKpis = modes.kpis ?? {};

    const statusDonut = seriesToDonut(appt.appointmentStatus);
    const completed = donutVal(statusDonut, "Completed");
    const scheduled = donutVal(statusDonut, "Scheduled");
    const cancelled = donutVal(statusDonut, "Cancelled");
    const draft = donutVal(statusDonut, "Draft");
    const totalBooked = completed + scheduled + cancelled + draft;

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
          totalFootfall: toNum(ov.totalFootfall),
          totalBooked,
          completed,
          scheduled,
          cancelled,
          avgVisitsPerDay: rangeDays ? Math.round(toNum(ov.totalFootfall) / rangeDays) : toNum(ov.avgConsultationsPerDay),
          busiestDay,
          totalConsultations: toNum(modesKpis.total),
          smartSync: toNum(modesKpis.smartSync),
          digitalPrescriptionPercent: toNum(ov.digitalPrescriptionPercent),
          totalPrescriptionsWithMeds: toNum(ov.totalPrescriptionsWithMeds),
          totalPatients: toNum(ptKpis.totalPatients),
          oneTime: toNum(ptKpis.oneTime),
          returning: toNum(ptKpis.returning),
        },
        deltas: {
          totalFootfall: ov.totalFootfallDelta != null ? { value: toNum(ov.totalFootfallDelta), isDown: ov.totalFootfallIsDown } : null,
        },
        charts: {
          appointmentStatus: statusDonut.filter((d) => d.label !== "Draft"),
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
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}

function empty() {
  return {
    kpis: {
      totalFootfall: 0, totalBooked: 0, completed: 0, scheduled: 0,
      cancelled: 0, avgVisitsPerDay: 0, busiestDay: null,
      totalConsultations: 0, smartSync: 0,
      digitalPrescriptionPercent: 0, totalPrescriptionsWithMeds: 0,
      totalPatients: 0, oneTime: 0, returning: 0,
    },
    deltas: {},
    charts: {
      appointmentStatus: [], visitTrend: null, ageDistribution: null,
      visitFrequency: null, genderDistribution: [], newVsReturning: [],
      segmentation: [], byDoctor: null,
    },
  };
}

function donutVal(donut, label) {
  const item = (donut || []).find((d) => d.label === label);
  return toNum(item?.value);
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
