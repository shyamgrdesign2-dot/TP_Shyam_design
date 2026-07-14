import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { anyToDonut, sumDatasetByLabel, seriesToXY } from "../charts/adapters";

export default function useAppointmentsData({ days, doctorId, clinicId } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    kpis: buildKpis(null),
    appointments: null,
    caseType: null,
    newVsReturning: [],
    visitsByWeekday: null,
    visitsByHour: null,
    newVsReturningTrend: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = {};
    if (days) params.days = days;
    if (doctorId && doctorId !== "all") params.doctorId = doctorId;
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;

    const payload = await ApiReporting.analyticsAppointment(params)
      .then((r) => r)
      .catch(() => null);
    const src = payload?.data ?? payload;

    setState({
      loading: false,
      error: null,
      kpis: buildKpis(src),
      appointments: src?.appointments || null,
      caseType: src?.caseType || null,
      newVsReturning: anyToDonut(src?.newVsReturning),
      visitsByWeekday: src?.visitsByWeekday ? seriesToXY(src.visitsByWeekday) : null,
      visitsByHour: src?.visitsByHour ? seriesToXY(src.visitsByHour) : null,
      newVsReturningTrend: src?.newVsReturningTrend ? seriesToXY(src.newVsReturningTrend) : null,
    });
  }, [days, doctorId, clinicId]);

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
