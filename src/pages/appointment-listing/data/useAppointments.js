import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import ApiAppointments from "../../../api/services/ApiAppointments";
import { isGrowthBookFeatureOn } from "../../../utils/growthbook";
import { GB_CVT_EXT_HOS, GB_APPT_SEQUENCE, TAB_CANCELLED, TAB_FINISHED, TAB_ZYDUS_ENCOUNTER, TAB_ZYDUS_APPOINTMENT } from "../../../utils/constants";
import { zydusConsultAppoint, zydusAppointment, copyGetAllAppointment1 } from "../../../redux/appointmentsSlice";
import { calculateAge } from "../../../utils/utils";
import { buildZydusEncounterAppointmentRows } from "../../../utils/zydusEncounterAppointmentRows";
import { matchesVisitTypeFilter } from "../../../utils/appointmentVisitTypeFilters";
import { getCrossConsultFromRecord } from "../../../utils/crossConsultHelpers";
import {
  TAB_IDS,
  ALL_MERGED_TABS,
  CHIKITSALAY_MERGED_TABS,
  MONTH_CALENDAR_SIZE,
  apStatueForTab,
  calendarStatusCsvForTab,
  isAllTimeWorklistTab,
  tabIdFromPamStatus,
} from "./appointmentsConfig";

const DATE_FORMAT = "YYYY-MM-DD";
// The legacy screen widens the window for the digitisation tab so old
// undigitised uploads are not hidden by the "today" default.
const PENDING_START_DATE = "2000-01-01";
// Same page size the legacy table infinite-scrolls on (`AppointmentData.js`).
const LIST_PAGE_SIZE = 25;
/* Safety cap for the Zydus finished↔encounter match pagination only.
   Calendar / ICS full-window fills are uncapped (legacy scroll parity). */
const LIST_PAGE_CAP = 40;

async function fetchAppointmentPage(basePayload, page) {
  const res = await ApiAppointments.getAllAppointment({ ...basePayload, page });
  if (!res?.status) throw new Error(res?.error || "Could not load appointments.");
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

/**
 * Full-window fetch for ICS export (user-initiated). Table view pages via
 * infinite scroll instead; calendar fills remaining pages in the background.
 * No hard page cap — stop when a page returns fewer than LIST_PAGE_SIZE rows
 * (same end condition as legacy infinite scroll).
 */
async function fetchAllAppointmentPages(basePayload, isCancelled) {
  const records = [];
  let firstData = {};
  for (let page = 0; ; page += 1) {
    if (isCancelled?.()) return { cancelled: true, records: [], data: {} };
    const { chunk, data } = await fetchAppointmentPage(basePayload, page);
    if (page === 0) firstData = data;
    records.push(...chunk);
    if (chunk.length < LIST_PAGE_SIZE) break;
  }
  return { cancelled: false, records, data: { ...firstData, app_data: records } };
}

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
  const crossConsult = getCrossConsultFromRecord(rec);
  const referralDateRaw =
    crossConsult?.date_of_referral || rec.date_of_referral || rec.referralDate || "";
  const referralDateMoment = moment(referralDateRaw);
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
      crossConsult?.um_name ||
      "",
    referralDate:
      referralDateRaw && referralDateMoment.isValid() ? referralDateMoment.format("DD MMM YYYY") : "",
    referralNotes: String(
      crossConsult?.reason_for_cross_consult || rec.reason_for_cross_consult || rec.referralNotes || ""
    ).trim(),
  };
}

/* Slim row for the month cell chips. The calendar endpoint only returns
   pam_id, time, status and patient name — enough to paint the chip and to
   colour it by bucket. Clicking the cell drills into Day, which loads the
   full listAppointment rows. */
function mapCalendarAppointment(appt, dayISO, index, isChikitsalay) {
  const timeText = appt?.appointment_time || "";
  const timeMoment = moment(String(timeText).trim(), ["h:mm A", "hh:mm A", "HH:mm"], true);
  const dateISO = appt?.appointment_date || dayISO || null;
  const patientName = appt?.patient_name || "--";
  const salutation = appt?.salutation;
  return {
    id: String(appt?.pam_id ?? `${dateISO || "day"}-${index}`),
    raw: appt,
    status: tabIdFromPamStatus(appt?.appointment_status, isChikitsalay),
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

/**
 * The queue for a given day, fetched on demand and independently of whatever
 * tab is on screen. The calendar export always ships the queue — the
 * appointments still to be seen — so it must not depend on the user happening
 * to be on the Queue tab.
 */
export async function fetchQueueRows({ dateRange, query, visitTypeCsv, isChikitsalay = false } = {}) {
  const start = dateRange?.start ? moment(dateRange.start) : moment();
  const end = dateRange?.end ? moment(dateRange.end) : start;
  const { records } = await fetchAllAppointmentPages({
    startDate: start.format(DATE_FORMAT),
    endDate: end.format(DATE_FORMAT),
    apStatue: apStatueForTab(TAB_IDS.QUEUE, isChikitsalay),
    filterVisitType: visitTypeCsv || "",
    search: query || "",
    sortOrder: "ascend",
    fetchBillStatus: true,
  });
  return records.map((rec, i) => mapRecord(rec, TAB_IDS.QUEUE, i));
}

/**
 * Live data for the appointment listing: rows for the active tab plus the
 * full-period tab counts, driven by the same listAppointment contract the
 * legacy screen uses (apStatue filter, YYYY-MM-DD window, server search,
 * fetchBillStatus for the billing badges).
 *
 * Table view (`fetchAllPages` false) matches the legacy infinite-scroll:
 * page 0 on input change, later pages only when `loadMore` is called.
 * Calendar day/week (`fetchAllPages` true) paints page 0 immediately, then
 * fills remaining pages in the background so the grid is complete without
 * blocking first paint on every page.
 * Calendar month (`calendarMode === "month"`) uses listAppointmentCalendar
 * instead: one request for the month, `size` chips per day plus total_count.
 *
 * Inputs must be referentially stable across renders (visitTypeCsv is a
 * string for exactly that reason); debouncing of fast-changing inputs
 * (search typing) is the caller's job.
 */
// Map a Zydus ICT record (from appointmentsData in redux) to the standard row shape.
function mapZydusRecord(rec, tabId, index) {
  const timeText = rec.apTime || "";
  const timeMoment = moment(String(timeText).trim(), ["h:mm A", "hh:mm A", "HH:mm"], true);
  const dateMoment = moment(String(rec.apDate || "").trim(), ["Do MMM YYYY", "DD MMM YYYY", "YYYY-MM-DD"], true);
  return {
    id: String(rec.key || rec.encounterId || rec.appointmentId || `${rec.pm_contact_no ?? "row"}-${index}`),
    raw: rec,
    status: tabId,
    name: rec.pm_fullname || rec.patientName || "--",
    firstName: String(rec.pm_fullname || rec.patientName || "").trim().split(/\s+/)[0] || "",
    genderAge: genderAge(rec),
    contact: rec.pm_contact_no || "--",
    mrn: rec.mrno || "",
    visitType: rec.toct_type || rec.consultationType || "--",
    specialty: "",
    billStatus: "",
    remark: "",
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
    consultType: 0,
    hasVideo: false,
  };
}

function transformZydusEncounterPayload(payload, { includeCancelled = false } = {}) {
  // Same row builder the redux thunk uses for GenX clinical encounters.
  const rows = buildZydusEncounterAppointmentRows(payload, {
    calculateAge,
    createKey: () => undefined,
  });
  if (includeCancelled) return rows;
  return rows.filter((e) => !e.isCancelled);
}

function transformZydusAppointmentPayload(payload) {
  return (payload || []).map((e) => ({
    ...e,
    key: e.appointmentId ?? e.encounterId ?? `${e.patientName}-${e.fromTime}`,
    pm_fullname: e.patientName,
    apTime: moment(e.fromTime, "DD-MM-YYYY HH:mm").format("hh:mm A"),
    apDate: moment(e.fromTime, "DD-MM-YYYY HH:mm").format("Do MMM YYYY"),
    DOB: "",
    ageYears: 0,
    ageMonths: 0,
    ageDays: 0,
    pm_gender: e.gender,
    pm_contact_no: e.mobileNo,
    patient_address: e.location,
  }));
}

function matchesZydusQuery(row, q) {
  const qq = String(q || "").trim().toLowerCase();
  if (!qq) return true;
  const raw = row?.raw || {};
  return (
    String(raw.pm_fullname || raw.patientName || "").toLowerCase().includes(qq) ||
    String(raw.mrno || "").toLowerCase().includes(qq) ||
    String(raw.pm_contact_no || raw.mobileNo || "").toLowerCase().includes(qq)
  );
}

export default function useAppointments({
  tabId,
  dateRange,
  query,
  visitTypeCsv,
  fetchAllPages = false,
  includeDraft = true,
  /* Legacy: only fetch undigitised ids / show Pending when a digitisation
     GB flag is on (AppointmentData.js smartsync-cvt / snap-rx-digitization /
     tab-rx-cvt). */
  includePendingDigitisation = false,
  zydusSiteId,
  zydusEmpNo,
  isZydusAccount = false,
  isChikitsalay = false,
  /* Month grid uses listAppointmentCalendar (one call, size chips/day)
     instead of paginating listAppointment across the window. */
  calendarMode = "day",
}) {
  const dispatch = useDispatch();
  // Zydus encounter/appointment counts + buckets are maintained in redux by
  // the same thunks the legacy screen uses.
  const {
    queueCount,
    finishedCount,
    draftRxCount,
    zydusEncounterCount,
    zydusAappointmentCount,
    zydusCancelledEncounterCount,
  } = useSelector((state) => state.records);
  // siteId/empNo can linger after a hospital switch — only treat as Zydus
  // listing when the account gate says so (same as useListingAccess).
  const isZydusListing = Boolean(isZydusAccount && zydusSiteId && zydusEmpNo);
  const { advancedSettings } = useSelector((state) => state.billing || {});
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
  const undigitisedIdsRef = useRef(null);
  const prevTabRef = useRef(tabId);
  const prevFetchKeyRef = useRef(null);
  const zydusServerRowsRef = useRef([]);
  const [zydusServerRowsVersion, setZydusServerRowsVersion] = useState(0);

  const mergedTabs = useMemo(() => {
    const base = isChikitsalay ? CHIKITSALAY_MERGED_TABS : ALL_MERGED_TABS;
    return includeDraft ? base : base.filter((t) => t !== TAB_IDS.DRAFT);
  }, [includeDraft, isChikitsalay]);

  const { startDate, endDate } = useMemo(() => {
    const start = dateRange?.start ? moment(dateRange.start) : moment();
    const end = dateRange?.end ? moment(dateRange.end) : start;
    return { startDate: start.format(DATE_FORMAT), endDate: end.format(DATE_FORMAT) };
  }, [dateRange]);

  const listPayload = useCallback(
    (statusTab, pendingIds) => ({
      startDate: isAllTimeWorklistTab(statusTab) ? PENDING_START_DATE : startDate,
      endDate,
      apStatue: apStatueForTab(statusTab, isChikitsalay),
      filterVisitType: visitTypeCsv || "",
      search: query || "",
      sortOrder: statusTab === TAB_IDS.REFERRAL ? "descend" : "ascend",
      fetchBillStatus: true,
      // Legacy AppointmentData: sortBySequence only on Queue when GB is on.
      ...(sortQueueBySequence && statusTab === TAB_IDS.QUEUE
        ? { sortBySequence: true }
        : {}),
      ...(statusTab === TAB_IDS.PENDING && pendingIds?.length
        ? { cvtAppointmentIdsStr: pendingIds.join(",") }
        : {}),
    }),
    [startDate, endDate, query, visitTypeCsv, isChikitsalay, sortQueueBySequence]
  );

  const applyCounts = useCallback((data, statusTab) => {
    setCounts((prev) => {
      if (statusTab === TAB_IDS.PENDING) {
        return {
          ...prev,
          [TAB_IDS.PENDING]: undigitisedIdsRef.current?.length || 0,
          [TAB_IDS.REFERRAL]: data.referral_count ?? prev[TAB_IDS.REFERRAL] ?? 0,
        };
      }
      return {
        ...prev,
        [TAB_IDS.QUEUE]: isChikitsalay
          ? data.checked_in_count ?? prev[TAB_IDS.QUEUE] ?? 0
          : data.queue_count ?? prev[TAB_IDS.QUEUE] ?? 0,
        [TAB_IDS.CLINIC_APPOINTMENT]: data.queue_count ?? prev[TAB_IDS.CLINIC_APPOINTMENT] ?? 0,
        [TAB_IDS.FINISHED]: data.finished_count ?? prev[TAB_IDS.FINISHED] ?? 0,
        [TAB_IDS.CANCELLED]: data.cancelled_count ?? prev[TAB_IDS.CANCELLED] ?? 0,
        [TAB_IDS.DRAFT]: data.draft_count ?? prev[TAB_IDS.DRAFT] ?? 0,
        [TAB_IDS.PENDING]: prev[TAB_IDS.PENDING] ?? (undigitisedIdsRef.current?.length || 0),
        [TAB_IDS.REFERRAL]: data.referral_count ?? prev[TAB_IDS.REFERRAL] ?? 0,
      };
    });
  }, [isChikitsalay]);

  const fillRemaining = useCallback(
    async (statusTab, payload, fromPage, seq) => {
      let page = fromPage;
      let more = true;
      // Calendar must eventually show every appointment in the window.
      // No LIST_PAGE_CAP — same end condition as legacy infinite scroll
      // (short/empty page). Stale seq aborts on tab/date changes.
      while (more) {
        if (seq !== requestSeq.current) return;
        const next = await fetchAppointmentPage(payload, page);
        if (seq !== requestSeq.current) return;
        if (!next.chunk.length) break;
        const mapped = next.chunk.map((rec, i) =>
          mapRecord(rec, statusTab, page * LIST_PAGE_SIZE + i)
        );
        setRows((prev) => appendUnique(prev, mapped));
        more = next.hasMore;
        page += 1;
      }
    },
    []
  );

  const isMonthCalendar = calendarMode === "month" && !isZydusListing;

  const fetchRows = useCallback(async () => {
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
        const res = await ApiAppointments.listAppointmentCalendar({
          startDate,
          endDate,
          size: MONTH_CALENDAR_SIZE,
          appointmentStatus: calendarStatusCsvForTab(tabId, {
            includeDraft,
            isChikitsalay,
          }),
        });
        if (seq !== requestSeq.current) return;
        if (!res?.status) throw new Error(res?.error || "Could not load appointments.");
        const days = Array.isArray(res?.data?.data) ? res.data.data : [];
        const totals = {};
        const mapped = [];
        days.forEach((day) => {
          const dateISO = day?.date || null;
          if (dateISO) totals[dateISO] = Number(day?.total_count) || 0;
          (day?.appointments || []).forEach((appt) => {
            mapped.push(mapCalendarAppointment(appt, dateISO, mapped.length, isChikitsalay));
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
      // Zydus Cancelled tab is GenX clinical-encounters with isCancel=true
      // (legacy AppointmentData.js), not the TP listAppointment cancelled bucket.
      if (isZydusListing && tabId === TAB_IDS.CANCELLED) {
        const zydusApiDate = moment(startDate, DATE_FORMAT).format("DD-MM-YYYY");
        const cancelAction = await dispatch(
          zydusConsultAppoint({
            siteId: zydusSiteId,
            empNo: String(zydusEmpNo),
            date: zydusApiDate,
            apStatue: TAB_CANCELLED,
            isCancel: true,
            page: 0,
            filterVisitType: visitTypeCsv || "",
          })
        );
        if (seq !== requestSeq.current) return;
        const payload =
          cancelAction?.meta?.requestStatus === "fulfilled"
            ? cancelAction.payload || []
            : [];
        let serverRecords = transformZydusEncounterPayload(payload, { includeCancelled: true });
        if (visitTypeCsv) {
          serverRecords = serverRecords.filter((rec) =>
            matchesVisitTypeFilter(rec.toct_type, visitTypeCsv)
          );
        }
        const mappedRows = serverRecords.map((rec, i) => mapZydusRecord(rec, TAB_IDS.CANCELLED, i));
        zydusServerRowsRef.current = mappedRows;
        setZydusServerRowsVersion((v) => v + 1);
        const filteredRows = query ? mappedRows.filter((r) => matchesZydusQuery(r, query)) : mappedRows;
        setRows(filteredRows);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Zydus tabs fetch from the ICT system via the same redux thunks the
      // legacy AppointmentData.js uses. No standard TP getAllAppointment call.
      if (tabId === TAB_IDS.ZYDUS_ENCOUNTER || tabId === TAB_IDS.ZYDUS_APPOINTMENT) {
        if (!zydusSiteId || !zydusEmpNo) {
          setRows([]);
          setLoading(false);
          return;
        }

        const isEncounter = tabId === TAB_IDS.ZYDUS_ENCOUNTER;
        const apStatue = isEncounter ? TAB_ZYDUS_ENCOUNTER : TAB_ZYDUS_APPOINTMENT;

        // Legacy expects DD-MM-YYYY for the Zydus ICT API calls.
        const zydusApiDate = moment(startDate, DATE_FORMAT).format("DD-MM-YYYY");

        // 1) Consultations/Appointments list from ICT
        const encounterAction = await dispatch(
          zydusConsultAppoint({
            siteId: zydusSiteId,
            empNo: String(zydusEmpNo),
            date: zydusApiDate,
            apStatue,
            page: 0,
            filterVisitType: visitTypeCsv || "",
          })
        );

        if (seq !== requestSeq.current) return;

        let encounterData = [];
        if (encounterAction?.meta?.requestStatus === "fulfilled") {
          encounterData = encounterAction.payload || [];
        }

        // 2) Appointment call happens in the legacy screen as well (keeps
        // redux buckets/counts in sync with the Finished tab).
        await dispatch(
          zydusAppointment({
            siteId: zydusSiteId,
            empNo: String(zydusEmpNo),
            date: zydusApiDate,
          })
        );

        // 3) Finished schedule + pagination loop to keep queue/finished
        // counts consistent.
        const sendData = {
          startDate,
          endDate,
          apStatue: TAB_FINISHED,
          page: 0,
          fetchBillStatus: advancedSettings?.billingStatusInAppointmentScreen,
        };

        let action = await dispatch(copyGetAllAppointment1(sendData));
        let appData = [];
        let page = 0;
        while (
          appData.length < encounterData.length &&
          action?.meta?.requestStatus === "fulfilled" &&
          page < LIST_PAGE_CAP
        ) {
          const before = appData.length;
          appData.push(
            ...(action?.payload?.app_data || []).filter((x) => x.pam_ref_id != null)
          );
          if (appData.length >= encounterData.length || appData.length === before) break;
          page += 1;
          sendData.page = page;
          action = await dispatch(copyGetAllAppointment1(sendData));
        }

        if (seq !== requestSeq.current) return;

        let serverRecords = isEncounter
          ? transformZydusEncounterPayload(encounterData)
          : transformZydusAppointmentPayload(encounterData).filter((rec) =>
              !String(rec.appointmentStatus || "").toLowerCase().includes("cancel")
            );

        // Match legacy: reducer filters by filterVisitType CSV vs `toct_type`.
        if (visitTypeCsv) {
          serverRecords = serverRecords.filter((rec) =>
            matchesVisitTypeFilter(rec.toct_type, visitTypeCsv)
          );
        }

        const mappedRows = serverRecords.map((rec, i) => mapZydusRecord(rec, tabId, i));

        // Cache the unfiltered server rows so Zydus search stays client-side
        // (legacy does not re-fetch on keystrokes).
        zydusServerRowsRef.current = mappedRows;
        setZydusServerRowsVersion((v) => v + 1);

        const filteredRows = query ? mappedRows.filter((r) => matchesZydusQuery(r, query)) : mappedRows;
        setRows(filteredRows);
        setHasMore(false);
        setLoading(false);
        return;
      }

      if (tabId === TAB_IDS.ALL) {
        const first = await Promise.all(
          mergedTabs.map((statusTab) => fetchAppointmentPage(listPayload(statusTab), 0))
        );
        if (seq !== requestSeq.current) return;
        const seen = new Set();
        const merged = [];
        first.forEach(({ chunk }, i) => {
          chunk.forEach((rec, j) => {
            const row = mapRecord(rec, mergedTabs[i], j);
            if (seen.has(row.id)) return;
            seen.add(row.id);
            merged.push(row);
          });
        });
        const COUNT_KEY = {
          [TAB_IDS.QUEUE]: isChikitsalay ? "checked_in_count" : "queue_count",
          [TAB_IDS.CLINIC_APPOINTMENT]: "queue_count",
          [TAB_IDS.FINISHED]: "finished_count",
          [TAB_IDS.CANCELLED]: "cancelled_count",
          [TAB_IDS.DRAFT]: "draft_count",
        };
        setRows(merged);
        setCounts((prev) => {
          const next = { ...prev };
          mergedTabs.forEach((id, i) => {
            const key = COUNT_KEY[id];
            if (key) next[id] = first[i]?.data?.[key] ?? prev[id] ?? 0;
          });
          if (!includeDraft) next[TAB_IDS.DRAFT] = 0;
          const fromFirst = first[0]?.data;
          if (fromFirst) {
            next[TAB_IDS.REFERRAL] = fromFirst.referral_count ?? prev[TAB_IDS.REFERRAL] ?? 0;
          }
          return next;
        });
        setHasMore(false);
        setLoading(false);
        if (fetchAllPages) {
          await Promise.all(
            mergedTabs.map((statusTab, i) =>
              first[i].hasMore ? fillRemaining(statusTab, listPayload(statusTab), 1, seq) : null
            )
          );
        }
        return;
      }

      let pendingIds = [];
      if (tabId === TAB_IDS.PENDING) {
        if (!includePendingDigitisation) {
          if (seq === requestSeq.current) {
            setRows([]);
            setCounts((prev) => ({ ...prev, [TAB_IDS.PENDING]: 0 }));
            setLoading(false);
          }
          return;
        }
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

      const payload = listPayload(tabId, pendingIds);
      const { chunk, data, hasMore: more } = await fetchAppointmentPage(payload, 0);
      if (seq !== requestSeq.current) return;
      setRows(chunk.map((rec, i) => mapRecord(rec, tabId, i)));
      applyCounts(data, tabId);
      setHasMore(!fetchAllPages && more);
      setLoading(false);
      if (fetchAllPages && more) {
        await fillRemaining(tabId, payload, 1, seq);
      }
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error("useAppointments:", e);
      setRows([]);
      setDayTotals({});
      setHasMore(false);
      setError(e);
      setLoading(false);
    }
  }, [
    tabId,
    listPayload,
    fetchAllPages,
    fillRemaining,
    applyCounts,
    mergedTabs,
    includeDraft,
    includePendingDigitisation,
    zydusSiteId,
    zydusEmpNo,
    isZydusListing,
    isMonthCalendar,
    startDate,
    endDate,
    visitTypeCsv,
    query,
    isChikitsalay,
    advancedSettings?.billingStatusInAppointmentScreen,
    dispatch,
  ]);

  const loadMore = useCallback(async () => {
    if (fetchAllPages || !hasMore || loading || loadingMoreLock.current) return;
    loadingMoreLock.current = true;
    const seq = requestSeq.current;
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);
    try {
      let pendingIds = tabId === TAB_IDS.PENDING ? undigitisedIdsRef.current || [] : undefined;
      const { chunk, hasMore: more } = await fetchAppointmentPage(listPayload(tabId, pendingIds), nextPage);
      if (seq !== requestSeq.current) return;
      setRows((prev) =>
        appendUnique(
          prev,
          chunk.map((rec, i) => mapRecord(rec, tabId, nextPage * LIST_PAGE_SIZE + i))
        )
      );
      pageRef.current = nextPage;
      setHasMore(more);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error("useAppointments loadMore:", e);
    } finally {
      if (seq === requestSeq.current) {
        loadingMoreLock.current = false;
        setLoadingMore(false);
      }
    }
  }, [fetchAllPages, hasMore, loading, tabId, listPayload]);

  const isZydusConsultTab =
    tabId === TAB_IDS.ZYDUS_ENCOUNTER ||
    tabId === TAB_IDS.ZYDUS_APPOINTMENT ||
    (isZydusListing && tabId === TAB_IDS.CANCELLED);

  // Prefetch GenX cancelled encounters so the Cancelled tab badge stays in
  // sync (legacy always loads them on date/site change).
  useEffect(() => {
    if (!isZydusListing) return undefined;
    const zydusApiDate = moment(startDate, DATE_FORMAT).format("DD-MM-YYYY");
    dispatch(
      zydusConsultAppoint({
        siteId: zydusSiteId,
        empNo: String(zydusEmpNo),
        date: zydusApiDate,
        apStatue: TAB_CANCELLED,
        isCancel: true,
        page: 0,
        filterVisitType: "",
      })
    );
    return undefined;
  }, [dispatch, isZydusListing, zydusSiteId, zydusEmpNo, startDate]);

  // Fetch immediately on inputs, but for Zydus search typing we must not
  // re-fetch from the server. We accomplish this by skipping fetchRows when
  // the "fetch key" is unchanged for Zydus (it intentionally omits `query`).
  useLayoutEffect(() => {
    if (prevTabRef.current !== tabId) {
      prevTabRef.current = tabId;
      setRows([]);
      setDayTotals({});
    }

    const fetchKey = isZydusConsultTab
      ? `zydus|${tabId}|${startDate}|${zydusSiteId}|${zydusEmpNo}|${visitTypeCsv || ""}`
      : isMonthCalendar
        ? `tp-month|${tabId}|${startDate}|${endDate}|${includeDraft}`
        : `tp|${tabId}|${startDate}|${endDate}|${query}|${visitTypeCsv}|${fetchAllPages}|${includeDraft}`;

    if (prevFetchKeyRef.current === fetchKey) {
      if (isZydusConsultTab) setLoading(false);
      return;
    }

    prevFetchKeyRef.current = fetchKey;
    setLoading(true);
    fetchRows();
  }, [
    fetchRows,
    tabId,
    startDate,
    endDate,
    query,
    visitTypeCsv,
    fetchAllPages,
    includeDraft,
    zydusSiteId,
    zydusEmpNo,
    isZydusConsultTab,
    isMonthCalendar,
  ]);

  // Zydus search is client-side only: apply the query filter over the
  // cached server rows.
  useEffect(() => {
    if (!isZydusConsultTab) return;
    const serverRows = zydusServerRowsRef.current || [];
    const filteredRows = query ? serverRows.filter((r) => matchesZydusQuery(r, query)) : serverRows;
    setRows(filteredRows);
    setLoading(false);
  }, [query, isZydusConsultTab, zydusServerRowsVersion]);

  // Prime the pending-digitisation badge count once in the background —
  // only when legacy digitisation flags allow the tab (AppointmentData.js).
  useEffect(() => {
    if (!includePendingDigitisation) {
      undigitisedIdsRef.current = null;
      setCounts((prev) => ({ ...prev, [TAB_IDS.PENDING]: 0 }));
      return undefined;
    }
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
          [TAB_IDS.PENDING]: undigitisedIdsRef.current.length,
        }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [includePendingDigitisation]);

  // Keep Zydus tab counts synced with redux store values the thunks update.
  // The store is the source of truth; local counts are merged on top.
  const countByTab = useMemo(() => {
    const monthTotal = isMonthCalendar
      ? Object.values(dayTotals).reduce((sum, n) => sum + (Number(n) || 0), 0)
      : null;
    const allCount = monthTotal != null ? monthTotal : rows.length;
    const base =
      tabId === TAB_IDS.ALL
        ? { ...counts, [TAB_IDS.ALL]: allCount }
        : monthTotal != null
          ? { ...counts, [tabId]: monthTotal }
          : counts;

    // Only overwrite with Zydus redux buckets on a real Zydus listing.
    if (!isZydusListing) {
      return base;
    }

    // On Zydus Encounter/Appointment/Cancelled, queue/finished counts come from
    // `copyGetAllAppointment1` / GenX cancelled prefetch (redux buckets).
    if (isZydusConsultTab) {
      return {
        ...base,
        [TAB_IDS.QUEUE]: queueCount ?? base[TAB_IDS.QUEUE] ?? 0,
        [TAB_IDS.FINISHED]: finishedCount ?? base[TAB_IDS.FINISHED] ?? 0,
        [TAB_IDS.CANCELLED]: zydusCancelledEncounterCount ?? 0,
        [TAB_IDS.DRAFT]: includeDraft ? draftRxCount ?? base[TAB_IDS.DRAFT] ?? 0 : 0,
        [TAB_IDS.ZYDUS_ENCOUNTER]: zydusEncounterCount ?? 0,
        [TAB_IDS.ZYDUS_APPOINTMENT]: zydusAappointmentCount ?? 0,
      };
    }

    return {
      ...base,
      [TAB_IDS.CANCELLED]: zydusCancelledEncounterCount ?? base[TAB_IDS.CANCELLED] ?? 0,
      [TAB_IDS.ZYDUS_ENCOUNTER]: zydusEncounterCount ?? 0,
      [TAB_IDS.ZYDUS_APPOINTMENT]: zydusAappointmentCount ?? 0,
    };
  }, [
    counts,
    dayTotals,
    rows.length,
    tabId,
    isMonthCalendar,
    isZydusConsultTab,
    isZydusListing,
    queueCount,
    finishedCount,
    draftRxCount,
    includeDraft,
    zydusEncounterCount,
    zydusAappointmentCount,
    zydusCancelledEncounterCount,
  ]);

  return { rows, counts: countByTab, dayTotals, loading, loadingMore, hasMore, error, refetch: fetchRows, loadMore };
}
