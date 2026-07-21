import { useCallback, useEffect, useState } from "react";
import api from "../../../api/services/axiosService";
import ApiAppointments from "../../../api/services/ApiAppointments";
import ApiReporting from "../../../api/services/ApiReporting";
import { toNum as num, pctDelta, previousWindow } from "./deltaUtils";
import config from "../../../config";
import { cached } from "./apiCache";

// NOTE: this is the ONE non-GET analytics call. It reuses the app's
// operational POST /appointment/listAppointment because it is today's only
// live source for footfall/status counts. The refined backend spec
// (docs/ANALYTICS-BACKEND-SPEC-V4.md §Appointments) defines its GET
// replacement — GET /analytics/appointments/summary — and this hook should
// switch to it the moment that ships.
//
// "In queue" and "Draft" are deliberately NOT KPI cards: they are transient
// operational states that only mean something "right now", not for a past
// filter period. They still appear in the status donut, labelled as the
// appointment's current status.
const ZERO_KPIS = [
  { key: "total", label: "Total footfall", kind: "number", value: 0, tooltip: "All appointments in the selected period" },
  { key: "completed", label: "Completed visits", kind: "number", value: 0, tooltip: "Appointments completed in the selected period" },
  { key: "inQueue", label: "In queue", kind: "number", value: 0, tooltip: "Appointments from the period still waiting in the queue right now" },
  { key: "draft", label: "Draft", kind: "number", value: 0, tooltip: "Appointments from the period still saved as draft" },
  { key: "pendingDecisions", label: "Pending digitization", kind: "number", value: 0, tooltip: "Finished SnapRx visits awaiting digitization, as of now" },
  { key: "cancelled", label: "Cancelled", kind: "number", value: 0, tooltip: "Appointments cancelled in the selected period" },
  { key: "bookedClinic", label: "In-clinic bookings", kind: "number", value: 0, tooltip: "Bookings made for in-person clinic visits in the selected period" },
  { key: "bookedVideo", label: "Video consultations", kind: "number", value: 0, tooltip: "Bookings made for teleconsultation in the selected period" },
  { key: "cancelRate", label: "Cancellation rate", kind: "percent", value: 0, tooltip: "Cancelled as a share of total footfall in the selected period" },
];

export default function useAppointmentsLive({ startDate, endDate, doctorId, clinicId } = {}) {
  const [state, setState] = useState({ loading: true, kpis: ZERO_KPIS, statusDonut: [] });

  const load = useCallback(async () => {
    if (!startDate || !endDate) {
      setState({ loading: false, kpis: ZERO_KPIS, statusDonut: [] });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const body = {
      startDate,
      endDate,
      apStatue: 3,
      filterVisitType: "",
      page: 0,
      search: "",
      sortOrder: "ascend",
      fetchBillStatus: false,
    };
    // Multi-select sends CSV ids; this operational endpoint only understands
    // single values, so narrow only when exactly one is selected (harmless if
    // ignored). The GET replacement (spec §3.2) MUST honour CSV lists.
    if (clinicId && clinicId !== "all" && !String(clinicId).includes(",")) body.clinicId = clinicId;
    if (doctorId && doctorId !== "all" && !String(doctorId).includes(",")) body.doctorId = Number(doctorId);
    const post = (b) =>
      api
        .post(`/api/v1/appointment/listAppointment`, b, {
          customBaseUrl: config.appointment_api_url,
        })
        .catch(() => null);
    // True previous-period numbers: same query over the equal-length window
    // immediately before the selected range → real "vs previous period" pills.
    const prevWin = previousWindow(startDate, endDate);
    // Channel split (In Clinic / Video) comes from the reporting service's
    // appointment summary (deployed; ≤30d windows) — the operational
    // listAppointment summary carries NO booked/channel counters at all.
    const summaryParams = { startDate, endDate };
    if (clinicId && clinicId !== "all" && !String(clinicId).includes(",")) summaryParams.clinicId = clinicId;
    if (doctorId && doctorId !== "all") summaryParams.doctorId = doctorId;
    const rangeDays = (new Date(endDate) - new Date(startDate)) / 86400000 + 1;
    const [res, prevRes, undigitised, apptSummary, prevApptSummary] = await Promise.all([
      cached("apptList", body, () => post(body)),
      prevWin ? cached("apptList-prev", { ...body, startDate: prevWin.startDate, endDate: prevWin.endDate }, () => post({ ...body, startDate: prevWin.startDate, endDate: prevWin.endDate })) : Promise.resolve(null),
      cached("undigitised", {}, () => ApiAppointments.getAllUnDigitisedAppointmentsList().catch(() => null)),
      rangeDays <= 30
        ? cached("apptSummary", summaryParams, () => ApiReporting.clinicalAppointmentSummary(summaryParams).catch(() => null))
        : Promise.resolve(null),
      rangeDays <= 30 && prevWin
        ? cached("apptSummary-prev", { ...summaryParams, startDate: prevWin.startDate, endDate: prevWin.endDate }, () => ApiReporting.clinicalAppointmentSummary({ ...summaryParams, startDate: prevWin.startDate, endDate: prevWin.endDate }).catch(() => null))
        : Promise.resolve(null),
    ]);
    const undigitisedList = Array.isArray(undigitised)
      ? undigitised
      : undigitised?.undigitizedAppointments ?? undigitised?.data?.undigitizedAppointments ?? [];
    const pendingDecisions = Array.isArray(undigitisedList) ? undigitisedList.length : 0;
    const summarySrc = apptSummary?.data ?? apptSummary ?? null;
    const prevSummarySrc = prevApptSummary?.data ?? prevApptSummary ?? null;
    const channelOf = (label, src = summarySrc) => {
      const mix = Array.isArray(src?.channelMix) ? src.channelMix : [];
      const hit = mix.find((m) => new RegExp(label, "i").test(String(m.label)));
      return hit ? num(hit.value) : 0;
    };

    const d = res?.data ?? res ?? {};
    const dPrev = prevRes?.data ?? prevRes ?? null;
    const queue = num(d.queue_count);
    const finished = num(d.finished_count);
    const cancelled = num(d.cancelled_count);
    const draft = num(d.draft_count);
    const total = queue + finished + cancelled + draft;
    const bookedClinic = channelOf("clinic");
    const bookedVideo = channelOf("video");

    // Previous-period data — fetched from the real previous window
    const prev = dPrev ?? d.previous ?? d.lastPeriod ?? {};
    const prevTotal = num(prev.queue_count) + num(prev.finished_count) + num(prev.cancelled_count) + num(prev.draft_count);
    const prevFinished = num(prev.finished_count);
    const prevCancelled = num(prev.cancelled_count);
    const hasPrev = prev && prevTotal > 0;

    setState({
      loading: false,
      kpis: [
        { key: "total", label: "Total footfall", kind: "number", value: total, tooltip: "All appointments in the selected period", ...(hasPrev ? { delta: pctDelta(total, prevTotal) } : {}) },
        { key: "completed", label: "Completed visits", kind: "number", value: finished, tooltip: "Appointments completed in the selected period", ...(hasPrev ? { delta: pctDelta(finished, prevFinished) } : {}) },
        { key: "inQueue", label: "In queue", kind: "number", value: queue, tooltip: "Appointments from the period still waiting in the queue right now, completed + in queue + draft + cancelled adds up to total footfall" },
        { key: "draft", label: "Draft", kind: "number", value: draft, tooltip: "Appointments from the period still saved as draft, not yet completed" },
        { key: "pendingDecisions", label: "Pending digitization", kind: "number", value: pendingDecisions, tooltip: "Finished SnapRx visits awaiting digitization, a live backlog as of now, not filtered by the date range" },
        { key: "cancelled", label: "Cancelled", kind: "number", value: cancelled, invert: true, tooltip: "Appointments cancelled in the selected period", ...(hasPrev ? { delta: pctDelta(cancelled, prevCancelled) } : {}) },
        ...(summarySrc ? [
          { key: "bookedClinic", label: "In-clinic visits", kind: "number", value: bookedClinic, tooltip: "In-person clinic visits in the selected period (channel split from the reporting service)", ...maybeDelta(bookedClinic, channelOf("clinic", prevSummarySrc)) },
          { key: "bookedVideo", label: "Video consultations", kind: "number", value: bookedVideo, tooltip: "Teleconsultation visits in the selected period (channel split from the reporting service)", ...maybeDelta(bookedVideo, channelOf("video", prevSummarySrc)) },
        ] : []),
        { key: "cancelRate", label: "Cancellation rate", kind: "percent", value: total ? (cancelled / total) * 100 : 0, invert: true, tooltip: "Cancelled as a share of total footfall in the selected period", ...(hasPrev ? { delta: pctDelta(total ? (cancelled / total) * 100 : 0, prevTotal ? (prevCancelled / prevTotal) * 100 : 0) } : {}) },
      ],
      statusDonut: [
        { label: "Completed", value: finished },
        { label: "In queue", value: queue },
        { label: "Draft", value: draft },
        { label: "Cancelled", value: cancelled },
      ],
    });
  }, [startDate, endDate, doctorId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function maybeDelta(current, previous) {
  const d = pctDelta(current, previous);
  return d == null ? {} : { delta: d };
}
