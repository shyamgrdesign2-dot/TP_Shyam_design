import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import {
  listAppointments,
  listAppointmentCalendar,
} from "../../../api/services/receptionistAppointmentApi";
import { isGrowthBookFeatureOn } from "../../../utils/growthbook";
import { GB_APPT_SEQUENCE } from "../../../utils/constants";
import { getCrossConsultFromRecord } from "../../../utils/crossConsultHelpers";
import {
  TAB_IDS,
  ALL_MERGED_TABS,
  MONTH_CALENDAR_SIZE,
  apStatueForTab,
  calendarStatusCsvForTab,
  tabIdFromPamStatus,
} from "../../appointment-listing/data/appointmentsConfig";

const DATE_FORMAT = "YYYY-MM-DD";
const LIST_PAGE_SIZE = 25;

function genderAge(rec) {
  const parts = [];
  if (rec?.ageYears && rec.ageYears !== 0) parts.push(`${rec.ageYears}y`);
  else if (rec?.ageMonths && rec.ageMonths !== 0) parts.push(`${rec.ageMonths}m`);
  else if (rec?.ageDays && rec.ageDays !== 0) parts.push(`${rec.ageDays}d`);
  return [rec?.pm_gender, parts.join(" ")].filter(Boolean).join(", ");
}

function mapRecord(rec, tabId, index) {
  const timeText = (tabId === TAB_IDS.FINISHED ? rec.finishedTime : rec.apTime) || rec.apTime || "";
  const timeMoment = moment(String(timeText).trim(), ["h:mm A", "hh:mm A", "HH:mm"], true);
  const dateMoment = moment(String(rec.apDate || "").trim(), ["Do MMM YYYY", "DD MMM YYYY", "YYYY-MM-DD"], true);
  const crossConsult = getCrossConsultFromRecord(rec);
  return {
    id: String(rec.pam_id ?? rec.pam_ref_id ?? `${rec.pm_pid ?? "row"}-${index}`),
    raw: rec,
    status: tabId,
    name: rec.pm_salutation ? `${rec.pm_salutation} ${rec.pm_fullname}` : rec.pm_fullname || "--",
    firstName: String(rec.pm_fullname || "").trim().split(/\s+/)[0] || "",
    genderAge: genderAge(rec),
    contact: rec.pm_contact_no || "--",
    mrn: rec.pm_pid || rec.mrno || "",
    visitType: rec.toct_type || "--",
    specialty: rec.pt_name || "",
    billStatus: "",
    remark: rec.pam_appointment_remark || "",
    slotTime: String(timeText).trim().replace(/\s*([ap])\.?\s*m\.?$/i, (_, p) => ` ${p.toUpperCase()}M`),
    slotDate: rec.apDate || "",
    slotHour: timeMoment.isValid() ? timeMoment.hour() : null,
    slotMinute: timeMoment.isValid() ? timeMoment.minute() : 0,
    dateISO: dateMoment.isValid() ? dateMoment.format("YYYY-MM-DD") : null,
    symptomsGathered: !!rec.symptomsGathered,
    abhaAddress: rec.abhaAddress || "",
    patientConditionId: rec.patient_condition_id || null,
    arrivedTime: rec.arrivedTime || "",
    durationConsultation: rec.durationConsultation || "",
    consultType: rec.pam_status_type_appointment ?? 0,
    hasVideo: rec.pam_status_type_appointment === 1 || rec.pam_status_type_appointment === 2,
    referredBy:
      crossConsult?.referred_by ||
      rec.referred_by ||
      rec.referredBy ||
      rec.dr_reference_name ||
      "",
    referralDate: "",
    referralNotes: "",
  };
}

/* Slim row for month chips — calendar endpoint only returns pam_id, time,
   status and patient name. Day drill-down loads full listAppointment rows. */
function mapCalendarAppointment(appt, dayISO, index) {
  const timeText = appt?.appointment_time || "";
  const timeMoment = moment(String(timeText).trim(), ["h:mm A", "hh:mm A", "HH:mm"], true);
  const dateISO = appt?.appointment_date || dayISO || null;
  const patientName = appt?.patient_name || "--";
  const salutation = appt?.salutation;
  return {
    id: String(appt?.pam_id ?? `${dateISO || "day"}-${index}`),
    raw: appt,
    status: tabIdFromPamStatus(appt?.appointment_status, false),
    name: salutation ? `${salutation} ${patientName}` : patientName,
    firstName: String(patientName).trim().split(/\s+/)[0] || "",
    genderAge: "",
    contact: "--",
    mrn: "",
    visitType: "--",
    specialty: "",
    billStatus: "",
    remark: "",
    slotTime: String(timeText).trim().replace(/\s*([ap])\.?\s*m\.?$/i, (_, p) => ` ${p.toUpperCase()}M`),
    slotDate: dateISO || "",
    slotHour: timeMoment.isValid() ? timeMoment.hour() : 0,
    slotMinute: timeMoment.isValid() ? timeMoment.minute() : 0,
    dateISO,
    symptomsGathered: false,
    abhaAddress: "",
    patientConditionId: null,
    arrivedTime: "",
    durationConsultation: "",
    consultType: 0,
    hasVideo: false,
  };
}

async function fetchAppointmentPage(basePayload, page) {
  const res = await listAppointments({ ...basePayload, page });
  if (!res?.status) throw new Error(res?.error || res?.message || "Could not load appointments.");
  const data = res.data || {};
  const chunk = data.app_data || [];
  return { chunk, data, hasMore: chunk.length >= LIST_PAGE_SIZE };
}

function appendUnique(prev, incoming) {
  const seen = new Set(prev.map((row) => row.id));
  const extra = [];
  incoming.forEach((row) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    extra.push(row);
  });
  return extra.length ? [...prev, ...extra] : prev;
}

const RECEPTIONIST_MERGED_TABS = ALL_MERGED_TABS.filter(
  (t) => t !== TAB_IDS.DRAFT
);

/**
 * Appointment rows for receptionist listing — scoped to selected doctor via
 * doctorIds + receptionist auth extras on each API call.
 * Month calendar uses listAppointmentCalendar (one call, size chips/day).
 */
export default function useReceptionistAppointments({
  doctorId,
  tabId,
  dateRange,
  query,
  visitTypeCsv,
  fetchAllPages = false,
  calendarMode = "day",
}) {
  const sortQueueBySequence = isGrowthBookFeatureOn(GB_APPT_SEQUENCE);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [dayTotals, setDayTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);
  const pageRef = useRef(0);
  const loadingMoreLock = useRef(false);
  const prevTabRef = useRef(tabId);
  const prevDoctorRef = useRef(doctorId);
  const prevFetchKeyRef = useRef(null);

  const isMonthCalendar = calendarMode === "month";

  const { startDate, endDate } = useMemo(() => {
    const start = dateRange?.start ? moment(dateRange.start) : moment();
    const end = dateRange?.end ? moment(dateRange.end) : start;
    return { startDate: start.format(DATE_FORMAT), endDate: end.format(DATE_FORMAT) };
  }, [dateRange]);

  const listPayload = useCallback(
    (statusTab) => {
      const selected = doctorId != null && doctorId !== "" ? Number(doctorId) || doctorId : null;
      return {
        startDate,
        endDate,
        apStatue: apStatueForTab(statusTab, false),
        filterVisitType: visitTypeCsv || "",
        search: query || "",
        sortOrder: "ascend",
        fetchBillStatus: false,
        doctorIds: selected != null ? [selected] : [],
        // PatientMaster minimal Kea path remaps list via body.doctor_id.
        ...(selected != null ? { doctor_id: selected } : {}),
        ...(sortQueueBySequence && statusTab === TAB_IDS.QUEUE ? { sortBySequence: true } : {}),
      };
    },
    [startDate, endDate, query, visitTypeCsv, doctorId, sortQueueBySequence]
  );

  const applyCounts = useCallback((data) => {
    setCounts((prev) => ({
      ...prev,
      [TAB_IDS.QUEUE]: data.queue_count ?? prev[TAB_IDS.QUEUE] ?? 0,
      [TAB_IDS.FINISHED]: data.finished_count ?? prev[TAB_IDS.FINISHED] ?? 0,
      [TAB_IDS.CANCELLED]: data.cancelled_count ?? prev[TAB_IDS.CANCELLED] ?? 0,
    }));
  }, []);

  const fillRemaining = useCallback(async (statusTab, payload, fromPage, seq) => {
    let page = fromPage;
    let more = true;
    while (more) {
      if (seq !== requestSeq.current) return;
      const next = await fetchAppointmentPage(payload, page);
      if (seq !== requestSeq.current) return;
      if (!next.chunk.length) break;
      setRows((prev) =>
        appendUnique(prev, next.chunk.map((rec, i) => mapRecord(rec, statusTab, page * LIST_PAGE_SIZE + i)))
      );
      more = next.hasMore;
      page += 1;
    }
  }, []);

  const fetchRows = useCallback(async () => {
    if (!doctorId) {
      setRows([]);
      setDayTotals({});
      setCounts({});
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    pageRef.current = 0;
    loadingMoreLock.current = false;
    setLoading(true);
    setLoadingMore(false);
    setHasMore(false);
    setError(null);
    try {
      /* One call paints the month: size chips per day plus total_count for
         "+N more". Day/week keep paginating listAppointment. */
      if (isMonthCalendar) {
        const res = await listAppointmentCalendar({
          startDate,
          endDate,
          size: MONTH_CALENDAR_SIZE,
          appointmentStatus: calendarStatusCsvForTab(tabId, { includeDraft: false }),
          doctorId,
        });
        if (seq !== requestSeq.current) return;
        if (!res?.status) throw new Error(res?.error || res?.message || "Could not load appointments.");
        const days = Array.isArray(res?.data?.data) ? res.data.data : [];
        const totals = {};
        const mapped = [];
        days.forEach((day) => {
          const dateISO = day?.date || null;
          if (dateISO) totals[dateISO] = Number(day?.total_count) || 0;
          (day?.appointments || []).forEach((appt) => {
            mapped.push(mapCalendarAppointment(appt, dateISO, mapped.length));
          });
        });
        setDayTotals(totals);
        setRows(mapped);
        const monthTotal = Object.values(totals).reduce((sum, n) => sum + n, 0);
        setCounts((prev) => ({ ...prev, [tabId]: monthTotal }));
        setHasMore(false);
        setLoading(false);
        return;
      }

      setDayTotals({});

      if (tabId === TAB_IDS.ALL) {
        const first = await Promise.all(
          RECEPTIONIST_MERGED_TABS.map((statusTab) => fetchAppointmentPage(listPayload(statusTab), 0))
        );
        if (seq !== requestSeq.current) return;
        const seen = new Set();
        const merged = [];
        first.forEach(({ chunk }, i) => {
          chunk.forEach((rec, j) => {
            const row = mapRecord(rec, RECEPTIONIST_MERGED_TABS[i], j);
            if (seen.has(row.id)) return;
            seen.add(row.id);
            merged.push(row);
          });
        });
        const COUNT_KEY = {
          [TAB_IDS.QUEUE]: "queue_count",
          [TAB_IDS.FINISHED]: "finished_count",
          [TAB_IDS.CANCELLED]: "cancelled_count",
        };
        setRows(merged);
        setCounts((prev) => {
          const next = { ...prev };
          RECEPTIONIST_MERGED_TABS.forEach((id, i) => {
            const key = COUNT_KEY[id];
            if (key) next[id] = first[i]?.data?.[key] ?? prev[id] ?? 0;
          });
          return next;
        });
        setHasMore(false);
        setLoading(false);
        if (fetchAllPages) {
          await Promise.all(
            RECEPTIONIST_MERGED_TABS.map((statusTab, i) =>
              first[i].hasMore ? fillRemaining(statusTab, listPayload(statusTab), 1, seq) : null
            )
          );
        }
        return;
      }

      const payload = listPayload(tabId);
      const { chunk, data, hasMore: more } = await fetchAppointmentPage(payload, 0);
      if (seq !== requestSeq.current) return;
      setRows(chunk.map((rec, i) => mapRecord(rec, tabId, i)));
      applyCounts(data);
      setHasMore(!fetchAllPages && more);
      setLoading(false);
      if (fetchAllPages && more) {
        await fillRemaining(tabId, payload, 1, seq);
      }
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error("useReceptionistAppointments:", e);
      setRows([]);
      setDayTotals({});
      setHasMore(false);
      setError(e);
      setLoading(false);
    }
  }, [
    doctorId,
    tabId,
    listPayload,
    fetchAllPages,
    fillRemaining,
    applyCounts,
    isMonthCalendar,
    startDate,
    endDate,
  ]);

  const loadMore = useCallback(async () => {
    if (isMonthCalendar || fetchAllPages || !hasMore || loading || loadingMoreLock.current || !doctorId) {
      return;
    }
    loadingMoreLock.current = true;
    const seq = requestSeq.current;
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);
    try {
      const { chunk, hasMore: more } = await fetchAppointmentPage(listPayload(tabId), nextPage);
      if (seq !== requestSeq.current) return;
      setRows((prev) =>
        appendUnique(prev, chunk.map((rec, i) => mapRecord(rec, tabId, nextPage * LIST_PAGE_SIZE + i)))
      );
      pageRef.current = nextPage;
      setHasMore(more);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error("useReceptionistAppointments loadMore:", e);
    } finally {
      if (seq === requestSeq.current) {
        loadingMoreLock.current = false;
        setLoadingMore(false);
      }
    }
  }, [fetchAllPages, hasMore, loading, tabId, listPayload, doctorId, isMonthCalendar]);

  useEffect(() => {
    if (prevTabRef.current !== tabId) {
      prevTabRef.current = tabId;
      setRows([]);
      setDayTotals({});
    }
    if (prevDoctorRef.current !== doctorId) {
      prevDoctorRef.current = doctorId;
      // Clear immediately so the table shows shimmer instead of the previous
      // doctor's rows/counts while the new request is in flight.
      setRows([]);
      setDayTotals({});
      setCounts({});
      setHasMore(false);
      setError(null);
    }
    const fetchKey = `rec|${doctorId}|${tabId}|${startDate}|${endDate}|${query}|${visitTypeCsv}|${fetchAllPages}|${calendarMode}`;
    if (prevFetchKeyRef.current === fetchKey) return;
    prevFetchKeyRef.current = fetchKey;
    setLoading(true);
    fetchRows();
  }, [fetchRows, tabId, startDate, endDate, query, visitTypeCsv, fetchAllPages, doctorId, calendarMode]);

  const countByTab = useMemo(() => {
    if (isMonthCalendar) {
      const monthTotal = Object.values(dayTotals).reduce((sum, n) => sum + (Number(n) || 0), 0);
      return { ...counts, [tabId]: monthTotal };
    }
    if (tabId === TAB_IDS.ALL) return { ...counts, [TAB_IDS.ALL]: rows.length };
    return counts;
  }, [counts, rows.length, tabId, isMonthCalendar, dayTotals]);

  const refetch = useCallback(() => {
    prevFetchKeyRef.current = null;
    setLoading(true);
    return fetchRows();
  }, [fetchRows]);

  return { rows, countByTab, dayTotals, loading, loadingMore, hasMore, error, loadMore, refetch };
}
