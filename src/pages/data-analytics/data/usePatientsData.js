import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, seriesToXY } from "../charts/adapters";
import { toNum, pctDelta, withCategories } from "./deltaUtils";

// Patients section. doctorId/clinicId may be a CSV from the filter bar
// (empty = all). This analytics/* endpoint accepts CSV filters.
export default function usePatientsData({ startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: defaultKpis(),
    gender: [],
    maritalStatus: [],
    bloodGroups: [],
    age: null,
    visitFrequency: null,
    topCities: [],
    rfm: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (doctorId && doctorId !== "all") params.doctorId = doctorId;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    // The endpoint now returns the previous-window block server-side
    // (API-CONTRACTS-CURRENT §4) — the old client-side double-fetch is gone.
    const payload = await ApiReporting.analyticsPatients(params).catch(() => null);
    const src = payload?.data ?? payload ?? {};

    const maritalStatus = withCategories(anyToDonut(src.maritalStatus), ["Married", "Single", "Divorced", "Widowed", "Separated"]);
    const kpis = buildKpis(src.kpis);
    // Top marital status: the backend field (contract §4), else derived from
    // the marital donut on screen. "Unknown" means not recorded — fall back
    // to the donut-derived top rather than headline "Unknown".
    const serverMarital = src.topMaritalStatus || src.kpis?.topMaritalStatus;
    const topMarital = (serverMarital && !/^unknown$/i.test(serverMarital) ? serverMarital : null) || topOf(maritalStatus);
    kpis.splice(4, 0, {
      key: "topMaritalStatus",
      label: "Top marital status",
      kind: "text",
      value: topMarital || "No data",
      tooltip: "Most common marital status among patients seen in the selected period",
    });

    setState({
      loading: false,
      error: null,
      kpis,
      gender: withCategories(anyToDonut(src.gender), ["Male", "Female", "Others"]),
      maritalStatus,
      bloodGroups: withCategories(anyToDonut(src.bloodGroups), ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]),
      age: src.age ? seriesToXY(src.age) : null,
      visitFrequency: src.visitFrequency ? seriesToXY(src.visitFrequency) : null,
      topCities: anyToDonut(src.topCities),
      rfm: anyToDonut(src.rfm),
    });
  }, [startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(raw) {
  if (!raw) return defaultKpis();
  // Previous-period data — the server-side previous block (null = no prior data)
  const prev = raw.previous ?? raw.lastPeriod ?? {};
  const hasPrev = prev && toNum(prev.totalPatients) > 0;
  return [
    { key: "total", label: "Total patients", kind: "number", value: toNum(raw.totalPatients), tooltip: "Total unique patients seen during the period", ...(hasPrev ? { delta: pctDelta(toNum(raw.totalPatients), toNum(prev.totalPatients)) } : {}) },
    { key: "onetime", label: "One-time visitors", kind: "number", value: toNum(raw.oneTime), tooltip: "Patients who visited only once", ...(hasPrev ? { delta: pctDelta(toNum(raw.oneTime), toNum(prev.oneTime)) } : {}) },
    { key: "returning", label: "Returning patients", kind: "number", value: toNum(raw.returning), tooltip: "Patients with more than one visit", ...(hasPrev ? { delta: pctDelta(toNum(raw.returning), toNum(prev.returning)) } : {}) },
    { key: "topBloodGroup", label: "Top blood group", kind: "text", value: raw.topBloodGroup || "No data", tooltip: "Most common blood group among patients" },
  ];
}

function defaultKpis() {
  return [
    { key: "total", label: "Total patients", kind: "number", value: 0, tooltip: "Total unique patients seen during the period" },
    { key: "onetime", label: "One-time visitors", kind: "number", value: 0, tooltip: "Patients who visited only once" },
    { key: "returning", label: "Returning patients", kind: "number", value: 0, tooltip: "Patients with more than one visit" },
    { key: "topBloodGroup", label: "Top blood group", kind: "text", value: "No data", tooltip: "Most common blood group among patients" },
  ];
}

function topOf(donut) {
  const best = (donut || []).reduce((a, b) => ((b?.value || 0) > (a?.value || 0) ? b : a), null);
  return best && best.value > 0 ? best.label : null;
}
