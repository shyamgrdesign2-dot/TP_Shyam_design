import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, seriesToXY } from "../charts/adapters";

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
    const payload = await ApiReporting.analyticsPatients(params)
      .then((r) => r)
      .catch(() => null);
    const src = payload?.data ?? payload ?? {};

    const maritalStatus = withAllMarital(anyToDonut(src.maritalStatus));
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
      gender: withAllGenders(anyToDonut(src.gender)),
      maritalStatus,
      bloodGroups: withAllBloodGroups(anyToDonut(src.bloodGroups)),
      age: src.age ? seriesToXY(src.age) : null,
      visitFrequency: src.visitFrequency ? seriesToXY(src.visitFrequency) : null,
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
    { key: "avgAge", label: "Avg patient age", kind: "number", value: toNum(raw.avgAge), approx: true, tooltip: "Mean age of patients seen during the period" },
  ];
}

function defaultKpis() {
  return [
    { key: "total", label: "Total patients", kind: "number", value: 0, tooltip: "Total unique patients seen during the period" },
    { key: "onetime", label: "One-time visitors", kind: "number", value: 0, tooltip: "Patients who visited only once" },
    { key: "returning", label: "Returning patients", kind: "number", value: 0, tooltip: "Patients with more than one visit" },
    { key: "topBloodGroup", label: "Top blood group", kind: "text", value: "No data", tooltip: "Most common blood group among patients" },
    { key: "avgAge", label: "Avg patient age", kind: "number", value: 0, approx: true, tooltip: "Mean age of patients seen during the period" },
  ];
}

// The gender split always presents all three categories, even at zero.
function withAllGenders(list) {
  return withAllCategories(list, ["Male", "Female", "Others"]);
}

// Marital status donut categories (spec §3.4 `maritalStatus`; zero-fills)
function withAllMarital(list) {
  return withAllCategories(list, ["Married", "Single", "Divorced", "Widowed", "Separated"]);
}

// Blood group donut categories (spec §3.4 `bloodGroups`; zero-fills)
function withAllBloodGroups(list) {
  return withAllCategories(list, ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]);
}

// Highest-value donut label, or null when everything is zero
function topOf(donut) {
  const best = (donut || []).reduce((a, b) => ((b?.value || 0) > (a?.value || 0) ? b : a), null);
  return best && best.value > 0 ? best.label : null;
}

function withAllCategories(list, categories) {
  const have = new Map((list || []).map((d) => [String(d.label).toLowerCase(), d]));
  return categories.map((c) => have.get(c.toLowerCase()) || { label: c, value: 0 });
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pctDelta(current, previous) {
  // No pill without a real baseline: previous 0/absent produces absurd
  // percentages (e.g. +1944836% when last week had ₹1) — "vs previous"
  // is only meaningful when the previous window actually had volume.
  if (!Number.isFinite(previous) || previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}
