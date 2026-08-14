import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, sumDatasetByLabel, seriesToXY, hourSeriesToXY } from "../charts/adapters";
import { cached } from "./apiCache";

// Appointment charts (visit type, category mix, new vs returning, weekday, hour).
// Prefer startDate/endDate so chart windows match live KPIs
// (useAppointmentsLive). Sending the snapped filters.days (7/15/30) made
// "Today" KPIs disagree with "last 7 days" charts. `days` is only a
// fallback for legacy callers without a concrete range.
export default function useAppointmentsData({ days, startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: buildKpis(null),
    appointments: null,
    caseType: null,
    categoryMix: null,
    newVsReturning: [],
    visitsByWeekday: null,
    visitsByHour: null,
    newVsReturningTrend: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    } else {
      params.days = Math.min(Number(days) || 7, 90);
    }
    if (doctorId && doctorId !== "all") params.doctorId = doctorId;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    const payload = await cached("apptAnalytics", params, () => ApiReporting.analyticsAppointment(params)).catch(() => null);
    const src = payload?.data ?? payload;

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(src),
      appointments: src?.appointments || null,
      caseType: src?.caseType || null,
      categoryMix: src?.categoryMix || null,
      newVsReturning: anyToDonut(src?.newVsReturning),
      visitsByWeekday: src?.visitsByWeekday ? seriesToXY(src.visitsByWeekday) : null,
      visitsByHour: src?.visitsByHour ? hourSeriesToXY(src.visitsByHour) : null,
      newVsReturningTrend: src?.newVsReturningTrend ? seriesToXY(src.newVsReturningTrend) : null,
    });
  }, [days, startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(src) {
  const appts = src?.appointments || null;
  const total = sumDatasetByLabel(appts, "Total Appointment");
  const cancelled = sumDatasetByLabel(appts, "Cancelled Appointment");
  const rate = total > 0 ? (cancelled / total) * 100 : 0;
  return [
    { key: "total", label: "Total appointments", kind: "number", value: total },
    { key: "cancelled", label: "Cancelled", kind: "number", value: cancelled },
    { key: "rate", label: "Cancellation rate", kind: "percent", value: rate },
  ];
}
