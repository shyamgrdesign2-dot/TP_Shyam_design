import { useCallback, useEffect, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { toNum as num, pctDelta } from "./deltaUtils";
import { cached } from "./apiCache";

const ZERO_KPIS = [
  { key: "total", label: "Total footfall", kind: "number", value: 0, tooltip: "All appointments in the selected period" },
  { key: "completed", label: "Completed visits", kind: "number", value: 0, tooltip: "Appointments completed in the selected period" },
  { key: "inQueue", label: "In queue", kind: "number", value: 0, tooltip: "Appointments still waiting in the queue" },
  { key: "cancelled", label: "Cancelled", kind: "number", value: 0, tooltip: "Appointments cancelled in the selected period" },
  { key: "bookedClinic", label: "In-clinic visits", kind: "number", value: 0, tooltip: "In-person clinic visits in the selected period" },
  { key: "bookedVideo", label: "Video consultations", kind: "number", value: 0, tooltip: "Teleconsultation visits in the selected period" },
];

export default function useAppointmentsLive({ startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({ loading: true, kpis: ZERO_KPIS, statusDonut: [] });

  const load = useCallback(async () => {
    if (!startDate || !endDate) {
      setState({ loading: false, kpis: ZERO_KPIS, statusDonut: [] });
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
    const cancelled = num(kpis.cancelled);

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

    setState({
      loading: false,
      kpis: [
        { key: "total", label: "Total footfall", kind: "number", value: total, tooltip: "All appointments in the selected period", ...(hasPrev ? { delta: pctDelta(total, prevTotal) } : {}) },
        { key: "completed", label: "Completed visits", kind: "number", value: completed, tooltip: "Appointments completed in the selected period", ...(hasPrev ? { delta: pctDelta(completed, prevCompleted) } : {}) },
        { key: "inQueue", label: "In queue", kind: "number", value: inQueue, tooltip: "Appointments still waiting in the queue" },
        { key: "cancelled", label: "Cancelled", kind: "number", value: cancelled, invert: true, tooltip: "Appointments cancelled in the selected period" },
        { key: "bookedClinic", label: "In-clinic visits", kind: "number", value: bookedClinic, tooltip: "In-person clinic visits in the selected period" },
        { key: "bookedVideo", label: "Video consultations", kind: "number", value: bookedVideo, tooltip: "Teleconsultation visits in the selected period" },
      ],
      statusDonut: [
        { label: "Completed", value: completed },
        { label: "In queue", value: inQueue },
        { label: "Cancelled", value: cancelled },
      ],
    });
  }, [startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
