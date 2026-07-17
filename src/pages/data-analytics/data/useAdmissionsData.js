import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, seriesToXY, compactXY, zeroFillXY } from "../charts/adapters";
import { toNum, pctDelta, withCategories } from "./deltaUtils";

// IPD Admissions & Discharges — /analytics/inpatient-summary, DEPLOYED per
// API-CONTRACTS-CURRENT §4: kpis{census,admissions,discharges,bor,alos,
// dischargeQueue,longestStayDays,previous} + flow/census series +
// dischargeTypes donut + admissionsByDept/Ward + losDistribution.
// WONT-BUILD (§7, removed from the UI): readmissions (always 0),
// avgQueueTimeHrs (always 0), payorMix (no payor column).

const KNOWN_DEPTS = ["Gen Med", "Ortho", "Gynec", "Surgery", "Pedia"];
const KNOWN_WARDS = ["General", "Semi-private", "Private", "ICU", "NICU"];
const LOS_BUCKETS = ["0-1d", "2-3d", "4-7d", "8-14d", "15d+"];

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

    const payload = await ApiReporting.analyticsInpatientSummary(params).catch(() => null);
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
        "Unspecified",
      ]),
      admissionsByDept: zeroFillXY(
        src.admissionsByDept ? compactXY(seriesToXY(src.admissionsByDept)) : null,
        KNOWN_DEPTS, "Admissions"
      ),
      admissionsByWard: zeroFillXY(
        src.admissionsByWard ? compactXY(seriesToXY(src.admissionsByWard)) : null,
        KNOWN_WARDS, "Admissions"
      ),
      losDistribution: zeroFillXY(
        src.losDistribution ? seriesToXY(src.losDistribution) : null,
        LOS_BUCKETS, "Stays"
      ),
    });
  }, [startDate, endDate, days, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(src) {
  // v2.0 nests the numbers under `kpis` (API-CONTRACTS-CURRENT §4) — the old
  // top-level read left this row at zero while the charts (top-level fields)
  // rendered real data.
  const k = (src && typeof src === "object" && (src.kpis || src)) || {};
  const prev = k.previous ?? k.lastPeriod ?? {};
  const hasPrev = prev && (toNum(prev.admissions) > 0 || toNum(prev.discharges) > 0);
  return [
    { key: "admissions", label: "Total admissions", kind: "number", value: toNum(k.admissions ?? k.totalAdmissions), tooltip: "Patients admitted in the selected period", ...(hasPrev ? { delta: pctDelta(toNum(k.admissions ?? k.totalAdmissions), toNum(prev.admissions)) } : {}) },
    { key: "discharges", label: "Total discharges", kind: "number", value: toNum(k.discharges ?? k.totalDischarges), tooltip: "Patients discharged in the selected period", ...(hasPrev ? { delta: pctDelta(toNum(k.discharges ?? k.totalDischarges), toNum(prev.discharges)) } : {}) },
    { key: "alos", label: "Avg length of stay", kind: "days", value: toNum(k.alos ?? k.avgLengthOfStay), approx: true, tooltip: "Average days from admission to discharge, for stays discharged in the selected period" },
    { key: "dischargeQueue", label: "Discharge queue", kind: "number", value: toNum(k.dischargeQueue), tooltip: "Patients whose discharge is initiated but not completed, as of now" },
    { key: "longestStay", label: "Longest stay", kind: "days", value: toNum(k.longestStayDays), tooltip: "Longest current or completed stay in the selected period" },
  ];
}
