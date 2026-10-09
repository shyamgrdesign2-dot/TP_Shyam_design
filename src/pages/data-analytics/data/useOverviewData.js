import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, capDonut } from "../charts/adapters";
import { toNum, extractDelta, safe, withCategories, singleIdOnly } from "./deltaUtils";
import { cached } from "./apiCache";

// OPD Overview data — the 10-second practice pulse.
// Primary batch: top cards, modes, patients, Rx (medications donut + KPI).
// Weekly / operationalOverview dropped — Overview UI no longer consumes them.

export default function useOverviewData({ month, startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: buildKpis(),
    modeMix: [],
    topMedications: [],
    genderDistribution: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    // clinic/* endpoints reject CSV doctorId/clinicId (400 VALIDATION_ERROR).
    // operational/* and analytics/* accept CSV. Split params accordingly.
    const sd = singleIdOnly(doctorId);
    const sc = singleIdOnly(clinicId);

    const sp = {};
    if (month) sp.month = month;
    if (startDate && endDate) { sp.startDate = startDate; sp.endDate = endDate; }
    if (sd) sp.doctorId = sd;
    if (sc) sp.clinicId = sc;

    const csvParams = {};
    if (month) csvParams.month = month;
    if (startDate && endDate) { csvParams.startDate = startDate; csvParams.endDate = endDate; }
    if (doctorId && doctorId !== "all") csvParams.doctorId = doctorId;
    if (clinicId && clinicId !== "all") csvParams.clinicId = clinicId;

    const rangeParams = { ...csvParams };
    delete rangeParams.month;

    const [cards, modes, patientsP, rxFresh] = await Promise.all([
      safe(cached("topCards", sp, () => ApiReporting.clinicDashboardTopCards(sp))),
      safe(cached("modes", sp, () => ApiReporting.clinicConsultationModes(sp))),
      safe(cached("patients", rangeParams, () => ApiReporting.analyticsPatients(rangeParams))),
      safe(cached("clinicRx", sp, () => ApiReporting.clinicRx(sp))),
    ]);

    const modesSrc = modes?.data ?? modes ?? {};
    const patientsSrc = patientsP?.data ?? patientsP ?? {};
    const rxData = rxFresh?.data ?? rxFresh ?? {};
    const medDonut = anyToDonut(rxData.topBrands);

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(cards, modesSrc, { topMedication: firstLabel(medDonut) }),
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

function buildKpis(payload, modesSrc, ov = {}) {
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
      value: ov.topMedication || "No data",
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
