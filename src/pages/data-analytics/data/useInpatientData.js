import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { listToDonut } from "../charts/adapters";
import { pctDelta } from "./deltaUtils";

// IPD Overview — /analytics/inpatient-summary (API-CONTRACTS-CURRENT §4).
// REQUIRES startDate+endDate (a `days`-only request 400s); kpis are nested
// under `kpis` in the v2.0 shape (flat fallback kept for older payloads).
export default function useInpatientData({ days, startDate, endDate, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: buildKpis(null),
    wards: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (days) {
      params.days = days;
    }
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    const payload = await ApiReporting.analyticsInpatientSummary(params).catch(() => null);
    const src = payload?.data ?? payload;

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(src),
      wards: wardsFromSummary(src),
      _raw: src || {},
    });
  }, [days, startDate, endDate, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

const IPD_KPIS = [
  { key: "census", label: "Current census", kind: "number", aliases: ["currentCensus", "census", "adc", "averageDailyCensus"], tooltip: "Number of patients currently admitted and occupying beds" },
  { key: "admissions", label: "Total admissions", kind: "number", aliases: ["admissions", "totalAdmissions", "admissionCount"], tooltip: "Total patients admitted during the period" },
  { key: "discharges", label: "Total discharges", kind: "number", aliases: ["discharges", "totalDischarges", "dischargeCount"], tooltip: "Total patients discharged during the period" },
  { key: "alos", label: "Avg length of stay", kind: "days", approx: true, aliases: ["alos", "avgLengthOfStay", "averageLengthOfStay"], tooltip: "Average number of days a patient stays from admission to discharge" },
  { key: "bor", label: "Bed occupancy rate", kind: "percent", aliases: ["bor", "bedOccupancyRate", "occupancyRate", "occupancy"], tooltip: "Percentage of total beds currently occupied by patients" },
  { key: "adc", label: "Avg daily census", kind: "number", approx: true, aliases: ["adc", "averageDailyCensus", "avgDailyCensus"], tooltip: "Average number of inpatients present per day during the period" },
];

function buildKpis(src) {
  // v2.0 nests the numbers under `kpis`; fall back to a flat object.
  const map = (src && typeof src === "object" && (src.kpis || src)) || {};
  const prev = map.previous ?? map.lastPeriod ?? {};
  const hasPrev = prev && typeof prev === "object" && Object.keys(prev).length > 0;
  return IPD_KPIS.map((spec) => {
    let val = firstAlias(map, spec.aliases);
    // The backend does not ship an `adc` kpi — derive it honestly as the
    // mean of the census day-series in the same response.
    if (spec.key === "adc" && !val) val = censusMean(src);
    const prevVal = hasPrev ? firstAlias(prev, spec.aliases) : 0;
    const showDelta = hasPrev && prevVal > 0 && spec.kind === "number";
    return {
      key: spec.key,
      label: spec.label,
      kind: spec.kind,
      value: val,
      tooltip: spec.tooltip,
      ...(spec.approx ? { approx: true } : {}),
      ...(showDelta ? { delta: pctDelta(val, prevVal) } : {}),
    };
  });
}

// Average of the census day-series (occupied beds per day over the window).
function censusMean(src) {
  const data = src?.census?.datasets?.[0]?.data;
  if (!Array.isArray(data) || !data.length) return 0;
  const nums = data.map(Number).filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.reduce((a, v) => a + v, 0) / nums.length;
}

function wardsFromSummary(src) {
  const list = src?.wardSummary || src?.wards || src?.ward || null;
  if (!Array.isArray(list)) return [];
  return listToDonut(list, { labelKey: "ward", valueKey: "occupancy" }).map((d) => ({
    ward: d.label,
    occupancy: d.value,
  }));
}

function firstAlias(map, aliases) {
  for (const a of aliases) {
    const v = Number(map[a]);
    if (Number.isFinite(v) && map[a] != null) return v;
  }
  return 0;
}
