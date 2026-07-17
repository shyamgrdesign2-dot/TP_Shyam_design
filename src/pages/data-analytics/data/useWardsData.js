import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { seriesToXY, compactXY, zeroFillXY } from "../charts/adapters";
import { toNum, pctDelta } from "./deltaUtils";

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

    const payload = await ApiReporting.ipdWards(params).catch(() => null);
    const src = payload?.data ?? payload ?? {};

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(src.kpis),
      occupancyOverTime: src.occupancyOverTime ? seriesToXY(src.occupancyOverTime) : null,
      alosByWard: zeroFillXY(
        src.alosByWard ? compactXY(seriesToXY(src.alosByWard)) : null,
        KNOWN_WARDS, "ALOS (days)"
      ),
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


function defaultKpis() {
  return [
    { key: "totalBeds", label: "Total beds", kind: "number", value: 0, tooltip: "Total bed capacity across all wards" },
    { key: "bedsOccupied", label: "Beds occupied", kind: "number", value: 0, tooltip: "Number of beds currently assigned to patients" },
    { key: "bedsAvailable", label: "Beds available", kind: "number", value: 0, tooltip: "Beds that are free and ready for admission" },
    { key: "occupancy", label: "Bed occupancy rate", kind: "percent", value: 0, tooltip: "Percentage of total beds currently in use" },
  ];
}

const KNOWN_WARDS = ["General", "Semi-private", "Private", "ICU", "NICU"];
