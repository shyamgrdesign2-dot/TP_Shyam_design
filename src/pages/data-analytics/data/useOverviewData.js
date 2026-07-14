import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut } from "../charts/adapters";

// OPD Overview data — the 10-second practice pulse: operational volume/money
// KPIs PLUS the clinical highlight row (top diagnosis / symptom / medication /
// chronic condition — the user considers these headline items). Deep clinical
// breakdowns stay in Care.
//
// Money KPIs are NOT fetched here — the section merges them in from
// useBillingLive, and footfall from useAppointmentsLive, so Overview always
// matches the Billing / Appointments sections number-for-number.
//
// Sources:
//   #1 /clinic/dashboard/top-cards   → consultations count + delta, topDiagnosis
//   #2 /clinic/consultations/weekly  → weekly chart (calendar-month comparison)
//   /clinic/consultation-modes       → top mode KPI + mode-mix donut
//   /operational/overview            → topMedication, topSymptom, topMedicalCondition

export default function useOverviewData({ month, startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: buildKpis(),
    weekly: null,
    modeMix: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    // top-cards / consultation-modes accept the additive range (overrides
    // month); the weekly chart is month-structured and ignores it.
    const params = {};
    if (month) params.month = month;
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    if (doctorId && doctorId !== "all") params.doctorId = doctorId;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;
    const rangeParams = { ...params };
    delete rangeParams.month;

    const safe = (promise) => promise.then((r) => r).catch(() => null);
    // operational/overview currently 500s on UAT (regression — reported to
    // backend); the clinical topic endpoints are live, so the top-name KPIs
    // fall back to the same sources Care uses.
    const [cards, weekly, modes, overview, rxP, histP, sympP] = await Promise.all([
      safe(ApiReporting.clinicDashboardTopCards(params)),
      safe(ApiReporting.clinicConsultationsWeekly({ ...(month ? { month } : {}), ...(params.doctorId ? { doctorId: params.doctorId } : {}), ...(params.clinicId ? { clinicId: params.clinicId } : {}) })),
      safe(ApiReporting.clinicConsultationModes(params)),
      safe(ApiReporting.operationalOverview(rangeParams)),
      safe(ApiReporting.clinicRx(params)),
      safe(ApiReporting.clinicalMedicalHistory(params)),
      safe(ApiReporting.clinicalSymptoms(params)),
    ]);
    const modesSrc = modes?.data ?? modes ?? {};
    const ov = overview?.data ?? overview ?? {};
    const rx = rxP?.data ?? rxP ?? {};
    const hist = histP?.data ?? histP ?? {};
    const symp = sympP?.data ?? sympP ?? {};
    const fallbacks = {
      topMedication: firstLabel(anyToDonut(rx.topBrands)),
      topCondition: firstLabel(anyToDonut(hist.topConditions)),
      topSymptom: firstLabel(anyToDonut(symp.topSymptoms)),
    };

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(cards, modesSrc, ov, fallbacks),
      weekly: weekly || null,
      modeMix: anyToDonut(modesSrc.modeMix),
    });
  }, [month, startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

const MODE_LABELS = [
  ["Smart Sync", "smartSync"],
  ["Voice RX", "voiceRx"],
  ["Tab RX", "tabRx"],
  ["Snap RX", "snapRx"],
  ["Point and Click", "typeRx"],
];

function topConsultationMode(raw) {
  if (!raw) return null;
  let best = null;
  let bestCount = 0;
  for (const [label, key] of MODE_LABELS) {
    const n = toNum(key === "typeRx" ? raw.typeRx ?? raw.keyboardRx : raw[key]);
    if (n > bestCount) {
      best = label;
      bestCount = n;
    }
  }
  return best;
}

function buildKpis(payload, modesSrc, ov = {}, fallbacks = {}) {
  const src = payload?.data ?? payload ?? {};
  const consultations = src.consultations;
  return [
    {
      key: "consultations",
      label: "Total consultations",
      kind: "number",
      value: metricCount(consultations),
      delta: metricDelta(consultations),
      tooltip: "Completed doctor consultations in the selected period",
    },
    {
      key: "topMode",
      label: "Top consultation mode",
      kind: "text",
      value: topConsultationMode(modesSrc?.kpis) || "No data",
      tooltip: "Rx mode used most often in the selected period",
    },
    {
      key: "topDiagnosis",
      label: "Top diagnosis",
      kind: "text",
      value: topDiagnosisName(src) || "No data",
      tooltip: "Most recorded diagnosis in the selected period",
    },
    {
      key: "topSymptom",
      label: "Top symptom",
      kind: "text",
      value: ov.topSymptom || fallbacks.topSymptom || "No data",
      tooltip: "Symptom reported most often in the selected period",
    },
    {
      key: "topMedication",
      label: "Top medication",
      kind: "text",
      value: ov.topMedication || fallbacks.topMedication || "No data",
      tooltip: "Most prescribed medicine in the selected period",
    },
    {
      key: "topCondition",
      label: "Top medical condition",
      kind: "text",
      value: ov.topMedicalCondition || fallbacks.topCondition || "No data",
      tooltip: "Most common medical condition (medical history) among patients seen in the selected period",
    },
  ];
}

function firstLabel(donut) {
  const best = (donut || []).find((d) => (d?.value || 0) > 0);
  return best?.label || null;
}

function topDiagnosisName(src) {
  const td = src?.topDiagnosis;
  if (Array.isArray(td) && td.length) {
    const f = td[0];
    return f?.name ?? f?.label ?? (typeof f === "string" ? f : null);
  }
  if (typeof td === "string" && td.trim()) return td;
  return null;
}

// A metric may be a number or a { count, pctChange, isDown } object.
function metricCount(node) {
  if (node == null) return 0;
  if (typeof node === "object") return toNum(node.count ?? node.value ?? node.total);
  return toNum(node);
}

function metricDelta(node) {
  if (node && typeof node === "object" && node.pctChange != null) {
    const n = Number(node.pctChange);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
