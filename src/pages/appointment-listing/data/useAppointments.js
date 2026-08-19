import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import ApiAppointments from "../../../api/services/ApiAppointments";
import { isGrowthBookFeatureOn } from "../../../utils/growthbook";
import { GB_CVT_EXT_HOS } from "../../../utils/constants";
import { TAB_IDS, TAB_TO_AP_STATUS, ALL_MERGED_TABS } from "./appointmentsConfig";

const DATE_FORMAT = "YYYY-MM-DD";
// The legacy screen widens the window for the digitisation tab so old
// undigitised uploads are not hidden by the "today" default.
const PENDING_START_DATE = "2000-01-01";

// Legacy genderAge: "Female, 30y", falling back to months then days.
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
  return {
    id: String(rec.pam_id ?? rec.pam_ref_id ?? `${rec.pm_pid ?? "row"}-${index}`),
    raw: rec,
    // The bucket this row belongs to (drives per-card colour + actions in the
    // merged "All" calendar view). PENDING borrows the FINISHED status.
    status: tabId === TAB_IDS.PENDING ? TAB_IDS.FINISHED : tabId,
    name: rec.pm_salutation ? `${rec.pm_salutation} ${rec.pm_fullname}` : rec.pm_fullname || "--",
    // The backend keeps the salutation in its own column, so the first token
    // of pm_fullname is the given name with no guessing involved.
    firstName: String(rec.pm_fullname || "").trim().split(/\s+/)[0] || "",
    genderAge: genderAge(rec),
    contact: rec.pm_contact_no || "--",
    /* The Patient ID is pm_pid (PAT0402), which is what the profile popover
       and the patient sidebar have always shown. pm_reference_id /
       tpml_refrence_id are the external hospital's own reference string and
       only stand in for the Patient ID when the CVT-external-hospital flag is
       on, exactly as ProfilePopover decides it. Reading them first put a
       referral code (TEST_REF-) in the Patient ID column. */
    mrn: isGrowthBookFeatureOn(GB_CVT_EXT_HOS)
      ? rec.pm_reference_id || rec.tpml_refrence_id || rec.pm_pid || ""
      : rec.pm_pid || rec.mrno || "",
    visitType: rec.toct_type || "--",
    specialty: rec.pt_name || "",
    billStatus: rec.billStatus || "",
    remark: rec.pam_appointment_remark || "",
    // Meridiem stays uppercase (04:39 PM); the rest of the string is left as
    // the backend sends it.
    slotTime: String(timeText).trim().replace(/\s*([ap])\.?\s*m\.?$/i, (_, p) => ` ${p.toUpperCase()}M`),
    slotDate: rec.apDate || "",
    slotHour: timeMoment.isValid() ? timeMoment.hour() : null,
    slotMinute: timeMoment.isValid() ? timeMoment.minute() : 0,
    dateISO: dateMoment.isValid() ? dateMoment.format("YYYY-MM-DD") : null,
    // 1 = video consultation, 2 = tele consultation (legacy pam_status_type_appointment)
    /* The appointment agent's symptom collector: set when the patient has
       shared symptoms / history ahead of the visit. Prod surfaces it as a
       green glyph on the row; the same fact drives ours. */
    symptomsGathered: !!rec.symptomsGathered,
    consultType: rec.pam_status_type_appointment ?? 0,
    hasVideo: rec.pam_status_type_appointment === 1 || rec.pam_status_type_appointment === 2,
  };
}

/**
 * The queue for a given day, fetched on demand and independently of whatever
 * tab is on screen. The calendar export always ships the queue — the
 * appointments still to be seen — so it must not depend on the user happening
 * to be on the Queue tab.
 */
export async function fetchQueueRows({ dateRange, query, visitTypeCsv } = {}) {
  const start = dateRange?.start ? moment(dateRange.start) : moment();
  const end = dateRange?.end ? moment(dateRange.end) : start;
  const res = await ApiAppointments.getAllAppointment({
    startDate: start.format(DATE_FORMAT),
    endDate: end.format(DATE_FORMAT),
    apStatue: TAB_TO_AP_STATUS[TAB_IDS.QUEUE],
    filterVisitType: visitTypeCsv || "",
    page: 0,
    search: query || "",
    sortOrder: "ascend",
    fetchBillStatus: true,
  });
  if (!res?.status) throw new Error(res?.error || "Could not load the queue.");
  return (res.data?.app_data || []).map((rec, i) => mapRecord(rec, TAB_IDS.QUEUE, i));
}

/**
 * Live data for the appointment listing: rows for the active tab plus the
 * full-period tab counts, driven by the same listAppointment contract the
 * legacy screen uses (apStatue filter, YYYY-MM-DD window, server search,
 * fetchBillStatus for the billing badges).
 *
 * Inputs must be referentially stable across renders (visitTypeCsv is a
 * string for exactly that reason); debouncing of fast-changing inputs
 * (search typing) is the caller's job.
 */
export default function useAppointments({ tabId, dateRange, query, visitTypeCsv }) {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);
  const undigitisedIdsRef = useRef(null);
  const prevTabRef = useRef(tabId);

  const { startDate, endDate } = useMemo(() => {
    const start = dateRange?.start ? moment(dateRange.start) : moment();
    const end = dateRange?.end ? moment(dateRange.end) : start;
    return { startDate: start.format(DATE_FORMAT), endDate: end.format(DATE_FORMAT) };
  }, [dateRange]);

  // One status → mapped rows + the raw counts block. Shared by single-tab
  // fetches and the merged "All" view.
  const fetchStatus = useCallback(
    async (statusTab) => {
      const res = await ApiAppointments.getAllAppointment({
        startDate,
        endDate,
        apStatue: TAB_TO_AP_STATUS[statusTab],
        filterVisitType: visitTypeCsv || "",
        page: 0,
        search: query || "",
        sortOrder: "ascend",
        fetchBillStatus: true,
      });
      if (!res?.status) throw new Error(res?.error || "listAppointment failed");
      const data = res.data || {};
      return { rows: (data.app_data || []).map((rec, i) => mapRecord(rec, statusTab, i)), data };
    },
    [startDate, endDate, query, visitTypeCsv]
  );

  const fetchRows = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      // "All" view: every schedule status merged onto one grid, each row
      // keeping its own status for colour + per-card actions.
      if (tabId === TAB_IDS.ALL) {
        const results = await Promise.all(ALL_MERGED_TABS.map((s) => fetchStatus(s)));
        if (seq !== requestSeq.current) return;
        const seen = new Set();
        const merged = [];
        results.forEach(({ rows: r }) => {
          r.forEach((row) => {
            if (seen.has(row.id)) return;
            seen.add(row.id);
            merged.push(row);
          });
        });
        const d = (i) => results[i]?.data || {};
        setRows(merged);
        setCounts((prev) => ({
          ...prev,
          [TAB_IDS.ALL]: merged.length,
          [TAB_IDS.QUEUE]: d(0).queue_count ?? prev[TAB_IDS.QUEUE] ?? 0,
          [TAB_IDS.FINISHED]: d(1).finished_count ?? prev[TAB_IDS.FINISHED] ?? 0,
          [TAB_IDS.CANCELLED]: d(2).cancelled_count ?? prev[TAB_IDS.CANCELLED] ?? 0,
          [TAB_IDS.DRAFT]: d(3).draft_count ?? prev[TAB_IDS.DRAFT] ?? 0,
        }));
        setLoading(false);
        return;
      }

      let pendingIds = [];
      if (tabId === TAB_IDS.PENDING) {
        if (!undigitisedIdsRef.current) {
          const idsRes = await ApiAppointments.getSnapRxUnDigitisedIds().catch(() => null);
          undigitisedIdsRef.current = [
            ...(idsRes?.unDigitizedAppointmentIds || []),
            ...(idsRes?.unReviewedAppointmentIds || []),
          ];
        }
        pendingIds = undigitisedIdsRef.current;
        if (pendingIds.length === 0) {
          if (seq === requestSeq.current) {
            setRows([]);
            setCounts((prev) => ({ ...prev, [TAB_IDS.PENDING]: 0 }));
            setLoading(false);
          }
          return;
        }
      }

      const payload = {
        startDate: tabId === TAB_IDS.PENDING ? PENDING_START_DATE : startDate,
        endDate,
        apStatue: TAB_TO_AP_STATUS[tabId],
        filterVisitType: visitTypeCsv || "",
        page: 0,
        search: query || "",
        sortOrder: "ascend",
        fetchBillStatus: true,
        ...(tabId === TAB_IDS.PENDING && pendingIds.length > 0
          ? { cvtAppointmentIdsStr: pendingIds.join(",") }
          : {}),
      };

      const res = await ApiAppointments.getAllAppointment(payload);
      if (seq !== requestSeq.current) return;
      if (!res?.status) throw new Error(res?.error || "listAppointment failed");

      const data = res.data || {};
      setRows((data.app_data || []).map((rec, i) => mapRecord(rec, tabId, i)));
      setCounts((prev) => {
        // The pending tab queries an all-time window, so its response counts
        // do not describe the selected period; keep the existing tab badges.
        if (tabId === TAB_IDS.PENDING) {
          return { ...prev, [TAB_IDS.PENDING]: undigitisedIdsRef.current?.length || 0 };
        }
        return {
          ...prev,
          [TAB_IDS.QUEUE]: data.queue_count ?? prev[TAB_IDS.QUEUE] ?? 0,
          [TAB_IDS.FINISHED]: data.finished_count ?? prev[TAB_IDS.FINISHED] ?? 0,
          [TAB_IDS.CANCELLED]: data.cancelled_count ?? prev[TAB_IDS.CANCELLED] ?? 0,
          [TAB_IDS.DRAFT]: data.draft_count ?? prev[TAB_IDS.DRAFT] ?? 0,
          [TAB_IDS.PENDING]: prev[TAB_IDS.PENDING] ?? (undigitisedIdsRef.current?.length || 0),
        };
      });
      setLoading(false);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error("useAppointments:", e);
      setRows([]);
      setError(e);
      setLoading(false);
    }
  }, [tabId, startDate, endDate, query, visitTypeCsv, fetchStatus]);

  // Fetch immediately on any input change. Switching tabs clears the previous
  // tab's rows and shows the shimmer right away so stale rows (or a stale
  // empty state) never flash before the new data resolves. Layout effect =
  // the reset commits before the browser paints the new tab.
  useLayoutEffect(() => {
    if (prevTabRef.current !== tabId) {
      prevTabRef.current = tabId;
      setRows([]);
    }
    setLoading(true);
    fetchRows();
  }, [fetchRows, tabId]);

  // Prime the pending-digitisation badge count once in the background.
  useEffect(() => {
    let alive = true;
    if (undigitisedIdsRef.current) return undefined;
    ApiAppointments.getSnapRxUnDigitisedIds()
      .then((idsRes) => {
        if (!alive) return;
        undigitisedIdsRef.current = [
          ...(idsRes?.unDigitizedAppointmentIds || []),
          ...(idsRes?.unReviewedAppointmentIds || []),
        ];
        setCounts((prev) => ({
          ...prev,
          [TAB_IDS.PENDING]: prev[TAB_IDS.PENDING] ?? undigitisedIdsRef.current.length,
        }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return { rows, counts, loading, error, refetch: fetchRows };
}
