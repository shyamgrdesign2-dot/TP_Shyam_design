import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, seriesToXY } from "../charts/adapters";

// IPD Admissions & Discharges — /analytics/inpatient-summary, DEPLOYED per
// API-CONTRACTS-CURRENT §4: kpis{census,admissions,discharges,bor,alos,
// dischargeQueue,longestStayDays,previous} + flow/census series +
// dischargeTypes donut + admissionsByDept/Ward + losDistribution.
// WONT-BUILD (§7, removed from the UI): readmissions (always 0),
// avgQueueTimeHrs (always 0), payorMix (no payor column).

export default function useAdmissionsData({ startDate, endDate, days, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    kpis: buildKpis({}),
    dischargeTypes: [],
    admissionsByDept: null,
    admissionsByWard: null,
    losDistribution: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const params = {};
    if (days) params.days = days;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    const payload = await ApiReporting.analyticsInpatientSummary(params)
      .then((r) => r)
      .catch(() => null);
    const src = payload?.data ?? payload ?? {};

    setState({
      loading: false,
      kpis: buildKpis(src),
      dischargeTypes: withCategories(anyToDonut(src.dischargeTypes), [
        "Recovered",
        "Referred",
        "LAMA",
        "DAMA",
        "Transfer out",
        "Death",
      ]),
      admissionsByDept: src.admissionsByDept ? seriesToXY(src.admissionsByDept) : null,
      admissionsByWard: src.admissionsByWard ? seriesToXY(src.admissionsByWard) : null,
      losDistribution: src.losDistribution ? seriesToXY(src.losDistribution) : null,
    });
  }, [startDate, endDate, days, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(src) {
  const prev = src.previous ?? src.lastPeriod ?? {};
  const hasPrev = prev && (num(prev.admissions) > 0 || num(prev.discharges) > 0);
  return [
    { key: "admissions", label: "Total admissions", kind: "number", value: num(src.admissions ?? src.totalAdmissions), tooltip: "Patients admitted in the selected period", ...(hasPrev ? { delta: pctDelta(num(src.admissions ?? src.totalAdmissions), num(prev.admissions)) } : {}) },
    { key: "discharges", label: "Total discharges", kind: "number", value: num(src.discharges ?? src.totalDischarges), tooltip: "Patients discharged in the selected period", ...(hasPrev ? { delta: pctDelta(num(src.discharges ?? src.totalDischarges), num(prev.discharges)) } : {}) },
    { key: "alos", label: "Avg length of stay", kind: "days", value: num(src.alos ?? src.avgLengthOfStay), approx: true, tooltip: "Average days from admission to discharge, for stays discharged in the selected period" },
    { key: "dischargeQueue", label: "Discharge queue", kind: "number", value: num(src.dischargeQueue), tooltip: "Patients whose discharge is initiated but not completed, as of now" },
    { key: "longestStay", label: "Longest stay", kind: "days", value: num(src.longestStayDays), tooltip: "Longest current or completed stay in the selected period" },
  ];
}

function withCategories(list, categories) {
  const have = new Map((list || []).map((d) => [String(d.label).toLowerCase(), d]));
  return categories.map((c) => have.get(c.toLowerCase()) || { label: c, value: 0 });
}

function pctDelta(current, previous) {
  // No pill without a real baseline: previous 0/absent produces absurd
  // percentages (e.g. +1944836% when last week had ₹1) — "vs previous"
  // is only meaningful when the previous window actually had volume.
  if (!Number.isFinite(previous) || previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
