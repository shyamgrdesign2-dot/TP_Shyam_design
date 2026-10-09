import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { seriesToXY, compactXY, compactLabel, zeroFillXY, listToDonut } from "../charts/adapters";
import { toNum, pctDelta, safe } from "./deltaUtils";

export default function useWardsData({ startDate, endDate, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: defaultKpis(),
    occupancyOverTime: null,
    alosByWard: null,
    bedsByWard: null,
    occupancyByWard: null,
    bedDistribution: [],
    wardBreakdown: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    const [wardsPayload, summaryPayload] = await Promise.all([
      safe(ApiReporting.ipdWards(params)),
      safe(ApiReporting.analyticsInpatientSummary(params)),
    ]);

    const src = wardsPayload?.data ?? wardsPayload ?? {};
    const summary = summaryPayload?.data ?? summaryPayload ?? {};

    const wards = parseWardBreakdown(src, summary);

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(src.kpis, wards),
      occupancyOverTime: src.occupancyOverTime ? seriesToXY(src.occupancyOverTime) : null,
      alosByWard: zeroFillXY(
        src.alosByWard ? compactXY(seriesToXY(src.alosByWard)) : null,
        KNOWN_WARDS, "ALOS (days)"
      ),
      bedsByWard: buildBedsByWard(wards),
      occupancyByWard: buildOccupancyByWard(wards),
      bedDistribution: wards.filter((w) => w.beds > 0).map((w) => ({
        label: w.ward,
        value: w.beds,
      })),
      wardBreakdown: wards,
    });
  }, [startDate, endDate, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function parseWardBreakdown(wardsSrc, summarySrc) {
  const list =
    wardsSrc?.wardBreakdown ||
    wardsSrc?.wards ||
    wardsSrc?.wardSummary ||
    summarySrc?.wardSummary ||
    summarySrc?.wards ||
    summarySrc?.ward ||
    null;
  if (!Array.isArray(list) || !list.length) return [];

  return list.map((w) => ({
    ward: w.ward || w.wardName || w.name || w.label || "Unknown",
    beds: toNum(w.beds ?? w.totalBeds ?? w.bedCount),
    occupied: toNum(w.occupied ?? w.bedsOccupied ?? w.occupiedBeds),
    available: toNum(w.available ?? w.bedsAvailable ?? w.freeBeds),
    occupancy: toNum(w.occupancy ?? w.occupancyPct ?? w.occupancyRate),
    alos: toNum(w.alos ?? w.avgLengthOfStay ?? w.avgLos),
  }));
}

function buildBedsByWard(wards) {
  if (!wards.length) {
    return zeroFillXY(null, KNOWN_WARDS, "Beds");
  }
  return {
    data: wards.map((w) => ({ x: compactLabel(w.ward, 12), Beds: w.beds, Occupied: w.occupied })),
    series: [
      { key: "Occupied", label: "Occupied" },
      { key: "Beds", label: "Total beds" },
    ],
    xKey: "x",
  };
}

function buildOccupancyByWard(wards) {
  const active = wards.filter((w) => w.occupancy > 0);
  if (!active.length) {
    return zeroFillXY(null, KNOWN_WARDS, "Occupancy %");
  }
  return {
    data: active.map((w) => ({ x: compactLabel(w.ward, 12), "Occupancy %": w.occupancy })),
    series: [{ key: "Occupancy %", label: "Occupancy %" }],
    xKey: "x",
  };
}

function buildKpis(raw, wards) {
  if (!raw) raw = {};
  const prev = raw.previous ?? raw.lastPeriod ?? {};
  const hasPrev = prev && toNum(prev.totalBeds) > 0;
  const wardCount = wards.length || toNum(raw.totalWards ?? raw.wardCount);
  return [
    { key: "totalWards", label: "Total wards", kind: "number", value: wardCount, tooltip: "Number of active wards in the facility" },
    { key: "totalBeds", label: "Total beds", kind: "number", value: toNum(raw.totalBeds), tooltip: "Total bed capacity across all wards" },
    { key: "bedsOccupied", label: "Beds occupied", kind: "number", value: toNum(raw.occupied), tooltip: "Number of beds currently assigned to patients", ...(hasPrev ? { delta: pctDelta(toNum(raw.occupied), toNum(prev.occupied)) } : {}) },
    { key: "bedsAvailable", label: "Beds available", kind: "number", value: toNum(raw.available), tooltip: "Beds that are free and ready for admission" },
    { key: "occupancy", label: "Bed occupancy rate", kind: "percent", value: toNum(raw.occupancyPct), tooltip: "Percentage of total beds currently in use" },
  ];
}

function defaultKpis() {
  return [
    { key: "totalWards", label: "Total wards", kind: "number", value: 0, tooltip: "Number of active wards in the facility" },
    { key: "totalBeds", label: "Total beds", kind: "number", value: 0, tooltip: "Total bed capacity across all wards" },
    { key: "bedsOccupied", label: "Beds occupied", kind: "number", value: 0, tooltip: "Number of beds currently assigned to patients" },
    { key: "bedsAvailable", label: "Beds available", kind: "number", value: 0, tooltip: "Beds that are free and ready for admission" },
    { key: "occupancy", label: "Bed occupancy rate", kind: "percent", value: 0, tooltip: "Percentage of total beds currently in use" },
  ];
}

const KNOWN_WARDS = ["General", "Semi-private", "Private", "ICU", "NICU"];
