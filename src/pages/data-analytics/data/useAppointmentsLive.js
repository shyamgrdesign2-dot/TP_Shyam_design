import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { toNum as num, pctDelta } from "./deltaUtils";
import { cached } from "./apiCache";
import { anyToDonut, hourSeriesToXY } from "../charts/adapters";

const ZERO_KPIS = [
  { key: "total", label: "Total footfall", kind: "number", value: 0, tooltip: "All appointments in the selected period" },
  { key: "completed", label: "Completed visits", kind: "number", value: 0, tooltip: "Appointments completed in the selected period" },
  { key: "inQueue", label: "In queue", kind: "number", value: 0, tooltip: "Appointments still waiting in the queue" },
  { key: "draft", label: "Draft", kind: "number", value: 0, tooltip: "Consultations saved as a draft prescription" },
  { key: "cancelled", label: "Cancelled", kind: "number", value: 0, tooltip: "Appointments cancelled in the selected period" },
  { key: "bookedClinic", label: "In-clinic visits", kind: "number", value: 0, tooltip: "In-person clinic visits in the selected period" },
  { key: "bookedVideo", label: "Video consultations", kind: "number", value: 0, tooltip: "Teleconsultation visits in the selected period" },
];

export default function useAppointmentsLive({ startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({ loading: true, kpis: ZERO_KPIS, statusDonut: [], visitsByHour: null, newVsReturning: [] });

  const load = useCallback(async () => {
    if (!startDate || !endDate) {
      setState({ loading: false, kpis: ZERO_KPIS, statusDonut: [], visitsByHour: null, newVsReturning: [] });
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    const params = { startDate, endDate };
    if (clinicId && clinicId !== "all") params.clinicId = clinicId;
    if (doctorId && doctorId !== "all") params.doctorId = doctorId;

    const summary = await cached("apptSummary", params, () =>
      ApiReporting.clinicalAppointmentSummary(params).catch(() => null)
    );

    const src = summary?.data ?? summary ?? {};
    const kpis = src.kpis ?? {};
    const prev = kpis.previous ?? {};

    const total = num(kpis.total);
    const completed = num(kpis.completed);
    const inQueue = num(kpis.inQueue);
    const draft = num(kpis.draft);
    const cancelled = num(kpis.cancelled);

    // Active vs inactive in-queue: if the backend provides the split, use it.
    // Otherwise, infer from the date range: if the range is entirely in the
    // past, all in-queue are inactive (abandoned). If the range includes today,
    // treat them all as active until the backend ships the split.
    const activeInQueue = num(kpis.activeInQueue);
    const inactiveInQueue = num(kpis.inactiveInQueue);
    const hasQueueSplit = activeInQueue > 0 || inactiveInQueue > 0;
    const today = new Date().toISOString().slice(0, 10);
    const rangeIncludesToday = startDate <= today && endDate >= today;
    const rangeIsToday = startDate === today && endDate === today;

    const prevTotal = num(prev.total);
    const prevCompleted = num(prev.completed);
    const hasPrev = prevTotal > 0;

    const channelOf = (label) => {
      const mix = Array.isArray(src.channelMix) ? src.channelMix : [];
      const hit = mix.find((m) => new RegExp(label, "i").test(String(m.label)));
      return hit ? num(hit.value) : 0;
    };
    const bookedClinic = channelOf("clinic");
    const bookedVideo = channelOf("video");

    // Build queue KPIs and donut slices based on split availability
    const queueKpis = [];
    const queueDonutSlices = [];
    if (hasQueueSplit) {
      if (activeInQueue > 0) {
        queueKpis.push({ key: "activeInQueue", label: "Active queue", kind: "number", value: activeInQueue, tooltip: "Appointments in queue for today, still waiting" });
        queueDonutSlices.push({ label: "Active queue", value: activeInQueue });
      }
      if (inactiveInQueue > 0) {
        queueKpis.push({ key: "inactiveInQueue", label: "Inactive queue", kind: "number", value: inactiveInQueue, tooltip: "Past-date appointments that were never completed and remain in queue status" });
        queueDonutSlices.push({ label: "Inactive queue", value: inactiveInQueue });
      }
    } else if (inQueue > 0) {
      if (rangeIsToday) {
        queueKpis.push({ key: "inQueue", label: "In queue", kind: "number", value: inQueue, tooltip: "Appointments still waiting in the queue" });
        queueDonutSlices.push({ label: "In queue", value: inQueue });
      } else if (!rangeIncludesToday) {
        queueKpis.push({ key: "inactiveInQueue", label: "Inactive queue", kind: "number", value: inQueue, tooltip: "Past-date appointments that were never completed and remain in queue status" });
        queueDonutSlices.push({ label: "Inactive queue", value: inQueue });
      } else {
        queueKpis.push({ key: "inQueue", label: "In queue", kind: "number", value: inQueue, tooltip: "Appointments still waiting in the queue (includes active and past-date inactive)" });
        queueDonutSlices.push({ label: "In queue", value: inQueue });
      }
    }

    setState({
      loading: false,
      kpis: [
        { key: "total", label: "Total footfall", kind: "number", value: total, tooltip: "All appointments in the selected period", ...(hasPrev ? { delta: pctDelta(total, prevTotal) } : {}) },
        { key: "completed", label: "Completed visits", kind: "number", value: completed, tooltip: "Appointments completed in the selected period", ...(hasPrev ? { delta: pctDelta(completed, prevCompleted) } : {}) },
        ...queueKpis,
        { key: "draft", label: "Draft", kind: "number", value: draft, tooltip: "Consultations saved as a draft prescription" },
        { key: "cancelled", label: "Cancelled", kind: "number", value: cancelled, invert: true, tooltip: "Appointments cancelled in the selected period" },
        { key: "bookedClinic", label: "In-clinic visits", kind: "number", value: bookedClinic, tooltip: "In-person clinic visits in the selected period" },
        { key: "bookedVideo", label: "Video consultations", kind: "number", value: bookedVideo, tooltip: "Teleconsultation visits in the selected period" },
      ],
      statusDonut: [
        { label: "Completed", value: completed },
        ...queueDonutSlices,
        { label: "Draft", value: draft },
        { label: "Cancelled", value: cancelled },
      ],
      // appointment/summary is the live source for hour buckets and
      // newVsReturning; analytics/appointment reports a different (wrong)
      // new/returning split for the same window.
      visitsByHour: src.visitsByHour ? hourSeriesToXY(src.visitsByHour) : null,
      newVsReturning: anyToDonut(src.newVsReturning),
    });
  }, [startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
