import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { seriesToXY } from "../charts/adapters";

export default function useWardsData({ startDate, endDate, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: defaultKpis(),
    occupancyOverTime: null,
    alosByWard: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    const payload = await ApiReporting.ipdWards(params)
      .then((r) => r)
      .catch(() => null);
    const src = payload?.data ?? payload ?? {};

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(src.kpis),
      occupancyOverTime: src.occupancyOverTime ? seriesToXY(src.occupancyOverTime) : null,
      alosByWard: src.alosByWard ? seriesToXY(src.alosByWard) : null,
    });
  }, [startDate, endDate, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(raw) {
  if (!raw) return defaultKpis();
  const prev = raw.previous ?? raw.lastPeriod ?? {};
  const hasPrev = prev && toNum(prev.totalBeds) > 0;
  return [
    { key: "totalBeds", label: "Total beds", kind: "number", value: toNum(raw.totalBeds), tooltip: "Total bed capacity across all wards" },
    { key: "bedsOccupied", label: "Beds occupied", kind: "number", value: toNum(raw.occupied), tooltip: "Number of beds currently assigned to patients", ...(hasPrev ? { delta: pctDelta(toNum(raw.occupied), toNum(prev.occupied)) } : {}) },
    { key: "bedsAvailable", label: "Beds available", kind: "number", value: toNum(raw.available), tooltip: "Beds that are free and ready for admission" },
    { key: "occupancy", label: "Bed occupancy rate", kind: "percent", value: toNum(raw.occupancyPct), tooltip: "Percentage of total beds currently in use" },
  ];
}


function pctDelta(current, previous) {
  // No pill without a real baseline: previous 0/absent produces absurd
  // percentages (e.g. +1944836% when last week had ₹1) — "vs previous"
  // is only meaningful when the previous window actually had volume.
  if (!Number.isFinite(previous) || previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

function defaultKpis() {
  return [
    { key: "totalBeds", label: "Total beds", kind: "number", value: 0, tooltip: "Total bed capacity across all wards" },
    { key: "bedsOccupied", label: "Beds occupied", kind: "number", value: 0, tooltip: "Number of beds currently assigned to patients" },
    { key: "bedsAvailable", label: "Beds available", kind: "number", value: 0, tooltip: "Beds that are free and ready for admission" },
    { key: "occupancy", label: "Bed occupancy rate", kind: "percent", value: 0, tooltip: "Percentage of total beds currently in use" },
  ];
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
