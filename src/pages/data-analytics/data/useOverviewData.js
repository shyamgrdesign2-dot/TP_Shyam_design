import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, capDonut } from "../charts/adapters";
import { toNum, extractDelta, safe, singleIdOnly, withCategories } from "./deltaUtils";
import { cached } from "./apiCache";

// OPD Overview data — the 10-second practice pulse.
// Optimized: primary batch = 5 calls (cards, weekly, modes, overview, patients).
// Fallback batch (clinicRx, symptoms, medHistory) fires ONLY when
// operationalOverview returns empty for topMedication/topSymptom/topCondition,
// cutting the common-case burst from 8 to 5 concurrent requests.

export default function useOverviewData({ month, startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: buildKpis(),
    weekly: null,
    modeMix: [],
    topMedications: [],
    genderDistribution: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (month) params.month = month;
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    const singleDoctor = singleIdOnly(doctorId);
    const singleClinic = singleIdOnly(clinicId);
    if (singleDoctor) params.doctorId = singleDoctor;
    if (singleClinic) params.clinicId = singleClinic;
    const rangeParams = { ...params };
    delete rangeParams.month;
    const weeklyParams = {
      ...(month ? { month } : {}),
      ...(params.doctorId ? { doctorId: params.doctorId } : {}),
      ...(params.clinicId ? { clinicId: params.clinicId } : {}),
    };

    // --- Primary batch (5 calls) ---
    const [cards, weekly, modes, overview, patientsP] = await Promise.all([
      safe(cached("topCards", params, () => ApiReporting.clinicDashboardTopCards(params))),
      safe(cached("weekly", weeklyParams, () => ApiReporting.clinicConsultationsWeekly(weeklyParams))),
      safe(cached("modes", params, () => ApiReporting.clinicConsultationModes(params))),
      safe(cached("opOverview", rangeParams, () => ApiReporting.operationalOverview(rangeParams))),
      safe(cached("patients", rangeParams, () => ApiReporting.analyticsPatients(rangeParams))),
    ]);

    const modesSrc = modes?.data ?? modes ?? {};
    const ov = overview?.data ?? overview ?? {};
    const patientsSrc = patientsP?.data ?? patientsP ?? {};

    // --- Fallback batch: Rx endpoint for the top-medications donut ---
    // Symptoms and medical-history fallbacks removed: those sections are hidden
    // due to backend data-quality issues (see SYMPTOMS-EXAM-HISTORY-DATA-QUALITY.md).
    const needRx = !ov.topMedication;
    const fallbacks = { topMedication: null };

    const rxFresh = await safe(cached("clinicRx", params, () => ApiReporting.clinicRx(params)));
    const rxData = rxFresh?.data ?? rxFresh ?? {};
    const medDonut = anyToDonut(rxData.topBrands);
    if (needRx) fallbacks.topMedication = firstLabel(medDonut);

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(cards, modesSrc, ov, fallbacks),
      weekly: weekly || null,
      modeMix: anyToDonut(modesSrc.modeMix).map(normMode),
      topMedications: capDonut(medDonut, 5),
      genderDistribution: withCategories(anyToDonut(patientsSrc.gender), ["Male", "Female", "Others"]),
    });
  }, [month, startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

const MODE_LABEL_NORM = { "point and click": "Type Rx", "type rx": "Type Rx" };
function normMode(d) {
  const n = MODE_LABEL_NORM[String(d.label).toLowerCase()];
  return n ? { ...d, label: n } : d;
}

const MODE_LABELS = [
  ["Smart Sync", "smartSync"],
  ["Voice RX", "voiceRx"],
  ["Tab RX", "tabRx"],
  ["Snap RX", "snapRx"],
  ["Type Rx", "typeRx"],
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
      delta: extractDelta(consultations),
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
      key: "topMedication",
      label: "Top medication",
      kind: "text",
      value: ov.topMedication || fallbacks.topMedication || "No data",
      tooltip: "Most prescribed medicine in the selected period",
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

function metricCount(node) {
  if (node == null) return 0;
  if (typeof node === "object") return toNum(node.count ?? node.value ?? node.total);
  return toNum(node);
}
