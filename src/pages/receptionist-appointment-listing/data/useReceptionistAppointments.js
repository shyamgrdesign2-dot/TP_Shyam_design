import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { listAppointments } from "../../../api/services/receptionistAppointmentApi";
import { isGrowthBookFeatureOn } from "../../../utils/growthbook";
import { GB_APPT_SEQUENCE } from "../../../utils/constants";
import { getCrossConsultFromRecord } from "../../../utils/crossConsultHelpers";
import {
  TAB_IDS,
  ALL_MERGED_TABS,
  apStatueForTab,
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
 */
export default function useReceptionistAppointments({
  doctorId,
  tabId,
  dateRange,
  query,
  visitTypeCsv,
  fetchAllPages = false,
}) {
  const sortQueueBySequence = isGrowthBookFeatureOn(GB_APPT_SEQUENCE);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);
  const pageRef = useRef(0);
  const loadingMoreLock = useRef(false);
  const prevTabRef = useRef(tabId);
  const prevFetchKeyRef = useRef(null);

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
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    pageRef.current = 0;
    setError(null);
    try {
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
      setHasMore(false);
      setError(e);
      setLoading(false);
    }
  }, [doctorId, tabId, listPayload, fetchAllPages, fillRemaining, applyCounts]);

  const loadMore = useCallback(async () => {
    if (fetchAllPages || !hasMore || loading || loadingMoreLock.current || !doctorId) return;
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
  }, [fetchAllPages, hasMore, loading, tabId, listPayload, doctorId]);

  useEffect(() => {
    if (prevTabRef.current !== tabId) {
      prevTabRef.current = tabId;
      setRows([]);
    }
    const fetchKey = `rec|${doctorId}|${tabId}|${startDate}|${endDate}|${query}|${visitTypeCsv}|${fetchAllPages}`;
    if (prevFetchKeyRef.current === fetchKey) return;
    prevFetchKeyRef.current = fetchKey;
    setLoading(true);
    fetchRows();
  }, [fetchRows, tabId, startDate, endDate, query, visitTypeCsv, fetchAllPages, doctorId]);

  const countByTab = useMemo(() => {
    if (tabId === TAB_IDS.ALL) return { ...counts, [TAB_IDS.ALL]: rows.length };
    return counts;
  }, [counts, rows.length, tabId]);

  const refetch = useCallback(() => {
    prevFetchKeyRef.current = null;
    setLoading(true);
    return fetchRows();
  }, [fetchRows]);

  return { rows, countByTab, loading, loadingMore, hasMore, error, loadMore, refetch };
}
