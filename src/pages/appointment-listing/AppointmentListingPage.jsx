import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import axios from "axios";
import moment from "moment";
import {
  TesseractThemeProvider,
  HeroBanner,
  Button,
  Chip,
  Filter,
  DateRangePicker,
  ConfirmDialog,
  SegmentedControl,
  Dropdown,
  InputBox,
  Tabs,
  TabsList,
  TabsTrigger,
  Toast,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved -- exports-map alias ("./styles.css" → dist css); webpack resolves it, eslint-plugin-import cannot
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import {
  LIST_TABS,
  CALENDAR_TABS,
  SLOT_FILTER_GROUP,
  TAB_IDS,
} from "./data/appointmentsConfig";
import useAppointments, { fetchQueueRows } from "./data/useAppointments";
import { useListingAccess } from "./data/useListingAccess";
import { readPreference, writePreference } from "./data/viewPreferences";
import AppointmentListView from "./components/AppointmentListView";
import AppointmentCalendarView from "./components/AppointmentCalendarView";
import BookAppointmentDrawer from "./components/BookAppointmentDrawer";
import ApiAppointments from "../../api/services/ApiAppointments";
import ApiTeleconsult from "../../api/services/ApiTeleconsult";
import { downloadIcs, exportableCount } from "./data/exportIcs";
import api from "../../api/services/axiosService";
import RowActionDrawers from "./components/RowActionDrawers";
import { KebabIcon } from "./components/rowActions";
import { env } from "../../EnvironmentConfig";
import { viewCaseManager } from "../../redux/caseManagerSlice";
import {
  setActiveTeleconsultAppointmentId,
  setActiveTeleconsultConsultationId,
  setAppointmentTeleconsultStatus,
  setJoinToken,
} from "../../redux/teleconsultNotificationSlice";
import { setUploadDocCategories } from "../../redux/uploadDocSlice";
import ApiAbha from "../../api/services/ApiAbha";
import { saveAs } from "file-saver";
import { useIsDentalEnabled } from "../../hooks/useIsDentalEnabled";
import { useChikitsalay } from "../chikitsalay/useChikitsalay";
import { clinicTargetStatus, generateClinicToken } from "../chikitsalay/service";
import { DENTAL_RX_PAD_ROUTE } from "../../utils/dentalRoutes";
import { handleAdmitToIpd } from "../../utils/utils";
import { generateUniqueFileName, getCorrectedFileName } from "../medicalRecords/utils/helper";
import { fetchAllDocumentCategories } from "../medicalRecords/service";
import {
  GB_VOICE_RX_NEW_UI,
  UNFINISHED_RX_CASE,
  FETCH_SMART_RX,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  CLINIC_TARGET_STATUS,
  PATIENT_DETAILS_SIDEBAR_KEYS,
} from "../../utils/constants";
import styles from "./AppointmentListingPage.module.css";

/* All glyphs come from the Tesseract icon CDN via TPLibraryIcon (house
   rule: no inline / third-party SVGs). Closest CDN equivalents to the
   reference set: add, flash, search-normal, row-vertical, calendar, sort. */

/* ── Tab bar — replicates the reference tab anatomy exactly:
   20px iconsax icon (bulk when active, linear otherwise), 14px label
   (medium → semibold), 16px count pill, 3px rounded underline. ── */
/* Quick-select rail, trimmed to spans a clinic actually reviews. The
   year-long presets the DS ships by default produce ranges no calendar view
   can render usefully. */
const startOfDayLocal = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const shiftDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const RANGE_PRESETS = [
  { id: "today", label: "Today", getRange: () => ({ start: startOfDayLocal(new Date()), end: startOfDayLocal(new Date()) }) },
  {
    id: "yesterday",
    label: "Yesterday",
    getRange: () => ({ start: shiftDays(startOfDayLocal(new Date()), -1), end: shiftDays(startOfDayLocal(new Date()), -1) }),
  },
  {
    id: "last-7",
    label: "Past 7 days",
    getRange: () => ({ start: shiftDays(startOfDayLocal(new Date()), -6), end: startOfDayLocal(new Date()) }),
  },
  {
    id: "last-30",
    label: "Past 30 days",
    getRange: () => ({ start: shiftDays(startOfDayLocal(new Date()), -29), end: startOfDayLocal(new Date()) }),
  },
  {
    id: "this-month",
    label: "This month",
    getRange: () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: startOfDayLocal(new Date()) }),
  },
  {
    id: "last-month",
    label: "Last month",
    getRange: () => ({
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    }),
  },
];

/* The DS picker reports a plain Date in range mode but a
   { mode, date, label } wrapper in single mode — and on Clear that wrapper
   arrives with date: null, which is still truthy. Unwrapping here is what
   keeps "cleared" actually clearing. */
const pickedDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v.date instanceof Date) return v.date;
  if (typeof v.date === "string") return new Date(v.date);
  return null;
};

/* The design system's own tab bar. It already does everything this row was
   hand-rolling — the leading icon (swapped bulk/linear with the active
   state for us), the count as a soft tag, arrow-key navigation, and a
   rounded indicator rather than a hard underline. */
function TabBar({ tabs, activeTab, countByTab, onSelect }) {
  return (
    <Tabs value={activeTab} onValueChange={onSelect} size="md" className={styles.tabRowInner}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            /* Every other tab is a slice of the schedule and draws in
               whichever view is chosen. Digitisation is an all-time
               worklist that always renders as a table, so a hairline sets
               it apart from the tabs it does not behave like. */
            data-detached={tab.id === TAB_IDS.PENDING || undefined}
            leftIcon={<TPLibraryIcon name={tab.icon} family={tab.iconFamily} size={20} />}
            tag={countByTab[tab.id] || 0}
            tagTone={tab.id === activeTab ? "primary" : "neutral"}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// Active-filter chips shown as a full-width bar below the toolbar (never
// inline under the Filter trigger). Selections come from the Filter panel.
function ActiveFilterBar({ filters, groups, onRemove, onClearAll }) {
  const chips = groups.flatMap((group) =>
    (filters[group.id] || []).map((value) => ({
      groupId: group.id,
      groupLabel: group.label,
      value,
      label: group.options.find((o) => o.value === value)?.label ?? value,
    }))
  );
  if (chips.length === 0) return null;
  return (
    <div className={styles.activeFilterBar}>
      <span className={styles.activeFilterLabel}>Filter: {chips.length}</span>
      {chips.map((chip) => (
        <Chip
          key={`${chip.groupId}:${chip.value}`}
          label={`${chip.groupLabel}: ${chip.label}`}
          color="primary"
          variant="soft"
          size="md"
          onDelete={() => onRemove(chip.groupId, chip.value)}
        />
      ))}
      <button type="button" className={styles.activeFilterClear} onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}

export default function AppointmentListingPage() {
  const navigate = useNavigate();
  const profile = useSelector((state) => state.doctors?.profile);
  const isDentalEnabled = useIsDentalEnabled();
  const isChikitsalayAccessable = useChikitsalay();
  const { activeTeleconsultAppointmentId, activeTeleconsultConsultationId } = useSelector(
    (state) => state.teleconsultNotification || {}
  );
  const uploadDocCategories = useSelector((state) => state.uploadDoc?.uploadDocCategories) || [];
  const { showDraft, showBookActions } = useListingAccess();
  // Restored from the last visit; the calendar leads with "All", the table
  // with the queue, so the tab has to agree with the restored view.
  const [view, setView] = useState(() => readPreference("view", "list"));
  const [activeTab, setActiveTab] = useState(() =>
    readPreference("view", "list") === "calendar" ? TAB_IDS.ALL : TAB_IDS.QUEUE
  );

  // Table keeps its status buckets; the calendar leads with the "All" view
  // (complete schedule). Switching view retargets the tab so the mode always
  // opens on its natural default.
  const visibleTabs = (view === "calendar" ? CALENDAR_TABS : LIST_TABS).filter(
    (t) => t.id !== TAB_IDS.DRAFT || showDraft
  );
  const isCalendar = view === "calendar";
  /* One deliberate exception to "the view is the view": Pending Digitisation
     is an all-time worklist, not a schedule, so it has nothing to draw on a
     grid anchored to one day. Selecting it renders the table without moving
     the view toggle, and leaving it puts the grid straight back. */
  const renderCalendar = isCalendar && activeTab !== TAB_IDS.PENDING;

  const changeView = (next) => {
    if (next === view) return;
    setView(next);
    writePreference("view", next);
    // The calendar is anchored to one day, so a multi-day table filter
    // collapses to where it started rather than being silently ignored.
    if (next === "calendar") setDateRange((r) => (r?.start ? { start: r.start, end: r.start } : r));
    if (next === "calendar") setActiveTab(TAB_IDS.ALL);
    else if (activeTab === TAB_IDS.ALL) setActiveTab(TAB_IDS.QUEUE);
  };
  /* Changing tab never changes the view: whichever mode the doctor chose is
     the mode they stay in, Pending Digitisation included. */
  const selectTab = (tab) => {
    setActiveTab(tab);
    setRescheduleFor(null);
  };

  useEffect(() => {
    if (!showDraft && activeTab === TAB_IDS.DRAFT) setActiveTab(TAB_IDS.QUEUE);
  }, [showDraft, activeTab]);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [dateRange, setDateRange] = useState(null);
  /* What the calendar currently draws: one day in Day, seven in Week, the
     42-cell grid in Month. The toolbar picker still names a single anchor
     day, but the rows query has to cover everything on screen or Week and
     Month would only ever show the anchor's appointments. */
  const [calendarWindow, setCalendarWindow] = useState(null);
  const [bookingCtx, setBookingCtx] = useState(null); // { slot, reschedule?: row }
  const [rescheduleFor, setRescheduleFor] = useState(null);
  /* What the calendar is currently showing, in words. Null in day view, where
     the window is a single date and the picker's own formatting is right. */
  const [calendarWindowLabel, setCalendarWindowLabel] = useState(null);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionDrawer, setActionDrawer] = useState(null);
  const [toast, setToast] = useState(null);
  /* Toasts leave the way they arrived: unmounting on dismiss would cut the
     exit animation, so the host is kept mounted for its duration. */
  const [toastLeaving, setToastLeaving] = useState(false);
  const dismissToast = () => {
    setToastLeaving(true);
    setTimeout(() => {
      setToast(null);
      setToastLeaving(false);
    }, 180);
  };
  const dateWrapRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingUploadRef = useRef(null);
  const dispatch = useDispatch();
  const isVoiceRxNewUi = useFeatureIsOn(GB_VOICE_RX_NEW_UI);

  useEffect(() => {
    if (!isChikitsalayAccessable) return undefined;
    if (localStorage.getItem("visitClinicToken")) return undefined;
    generateClinicToken();
    return undefined;
  }, [isChikitsalayAccessable]);

  useEffect(() => {
    if (uploadDocCategories.length) return undefined;
    fetchAllDocumentCategories().then((categories) => {
      dispatch(setUploadDocCategories({ categories, isChikitsalayAccessable }));
    });
    return undefined;
  }, [uploadDocCategories.length, isChikitsalayAccessable, dispatch]);

  /* The export always ships the queue — the appointments still to be seen —
     whatever tab or filter is on screen. It is fetched on demand rather than
     taken from the visible rows, which belong to the active tab. */
  const [exporting, setExporting] = useState(false);
  const exportQueueIcs = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const queueRows = await fetchQueueRows({ dateRange, query: debouncedQuery, visitTypeCsv });
      const n = exportableCount(queueRows);
      if (!n) {
        setToast({ status: "error", title: "No queued appointments to export for this date." });
        return;
      }
      downloadIcs(queueRows, { label: "TatvaPractice Queue", anchor: dateRange?.start || new Date() });
      setToast({ status: "success", title: `Exported ${n} queued appointment${n === 1 ? "" : "s"}.` });
    } catch (e) {
      setToast({ status: "error", title: e?.message || "Could not export the queue." });
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = Object.values(filters).reduce((n, v) => n + (v || []).length, 0);
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;

  // Legacy date rule: only Queue (upcoming) may navigate into the future.
  // The calendar "All" view also spans upcoming appointments, so it too.
  const allowFutureDates = activeTab === TAB_IDS.QUEUE || activeTab === TAB_IDS.ALL;
  useEffect(() => {
    if (!allowFutureDates && dateRange?.end && moment(dateRange.end).isAfter(moment(), "day")) {
      setDateRange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on tab change only
  }, [allowFutureDates]);

  // Visit-type filter options are the clinic's configured case types (same
  // source as the legacy screen: getCaseTypes → toct_id values sent as the
  // filterVisitType csv).
  const [caseTypes, setCaseTypes] = useState([]);
  useEffect(() => {
    ApiAppointments.getCaseTypes()
      .then((res) => setCaseTypes(res?.status ? res.data?.case_type || [] : []))
      .catch(() => setCaseTypes([]));
  }, []);

  const filterGroups = useMemo(
    () => [
      SLOT_FILTER_GROUP,
      {
        id: "visitType",
        label: "Visit Type",
        options: caseTypes.map((t) => ({ value: String(t.toct_id), label: t.toct_type })),
      },
    ],
    [caseTypes]
  );

  // Debounce only the search typing (legacy 500ms); tab / date / filter
  // changes fetch immediately.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(t);
  }, [query]);

  // Live data: visit-type + search + date window filter server-side; the
  // slot (in-clinic vs teleconsultation) filter is applied client-side.
  // visitTypeCsv is a string so the hook's inputs stay referentially stable.
  const visitTypeCsv = (filters.visitType || []).join(",");
  // In the calendar the grid's own span wins; the table keeps the picker's.
  const queryRange = useMemo(
    () => (renderCalendar && calendarWindow ? calendarWindow : dateRange),
    [renderCalendar, calendarWindow, dateRange]
  );
  const { rows: liveRows, counts: countByTab, loading, loadingMore, hasMore, error, refetch, loadMore } = useAppointments({
    tabId: activeTab,
    dateRange: queryRange,
    query: debouncedQuery,
    visitTypeCsv,
    /* Calendar must eventually show every appointment in the window. Table
       uses the same 25-row infinite scroll as the legacy screen. */
    fetchAllPages: renderCalendar,
    includeDraft: showDraft,
  });

  useEffect(() => {
    if (!error) return undefined;
    setToast({
      status: "error",
      title: error.message || "Could not load appointments. Try again.",
    });
    return undefined;
  }, [error]);

  /* A manual pull of everything on screen. The spinner is held for a beat
     even when the request comes back instantly, because a button that does
     nothing visible reads as broken. */
  const [refreshing, setRefreshing] = useState(false);
  const refreshQueue = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.resolve(refetch());
      setSlotsVersion((v) => v + 1);
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable per query
  }, [refetch]);

  const rows = useMemo(() => {
    const slotSel = filters.slot || [];
    if (slotSel.length !== 1) return liveRows;
    const wantVideo = slotSel[0] === "video";
    return liveRows.filter((row) => row.hasVideo === wantVideo);
  }, [liveRows, filters.slot]);

  const clearFilters = () => {
    setQuery("");
    setFilters({});
  };

  const removeFilterValue = (groupId, value) => {
    setFilters((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((v) => v !== value),
    }));
  };

  // Same navigation targets and state payloads as the legacy screen's row
  // actions (AppointmentData.js).
  const videoConsultDataFor = (rec, withUrl = false) =>
    rec?.pam_status_type_appointment === 1 || rec?.pam_status_type_appointment === 2
      ? {
          pam_id: rec.pam_id,
          pam_status_type_appointment: rec.pam_status_type_appointment,
          ...(withUrl ? { pam_teleconsultation_url: rec.pam_teleconsultation_url } : {}),
        }
      : undefined;

  const onRowAction = useCallback(
    async (action, row) => {
      const rec = row?.raw || row;
      if (!rec) return;
      const videoConsultData = videoConsultDataFor(rec);
      switch (action) {
        case "type-rx":
          window.Moengage?.track_event("patient_search_consult", {
            doctor_id: profile?.doctor_unique_id,
            patient_id: rec?.patient_unique_id,
          });
          navigate(isDentalEnabled ? DENTAL_RX_PAD_ROUTE : "/prescription", {
            state: { patient_data: rec, videoConsultData },
          });
          if (isChikitsalayAccessable && rec?.pam_id) {
            clinicTargetStatus(rec.pam_id, { targetStatus: CLINIC_TARGET_STATUS.SERVING });
          }
          break;
        /* Join a video consult straight from the schedule, on the same path
           the waiting banner uses: check the room is live, take the token,
           then hand off to the prescription screen to auto-join. */
        case "join-video": {
          const pamId = rec.pam_id ?? rec.pam_ref_id;
          if (!pamId) return;
          try {
            const res = await ApiTeleconsult.checkVideoAvailability(pamId);
            const data = res?.data ?? res;
            const token = data?.joinPayload?.token ?? data?.token;
            if (!token) {
              setToast({
                status: "error",
                title: data?.joinWindowExpired
                  ? "The join window for this consultation has ended."
                  : "This video consultation cannot be joined yet.",
              });
              return;
            }
            /* Joining starts the call, it does not start a consultation.
               AppTeleconsultBootstrap is mounted app-wide and opens its
               floating window the moment a join token exists, so the doctor
               stays on the schedule and picks an Rx mode when they are
               ready. Navigating here would have made that choice for them. */
            const consultationId = data?.consultationId;
            dispatch(setJoinToken(token));
            dispatch(setActiveTeleconsultAppointmentId(pamId));
            if (consultationId) dispatch(setActiveTeleconsultConsultationId(consultationId));
            setToast({
              status: "success",
              title: `Joined ${row.firstName || "the"} video call. It stays open while you work.`,
            });
          } catch {
            setToast({ status: "error", title: "Could not join this video consultation." });
          }
          break;
        }
        case "voice-rx":
          navigate(isVoiceRxNewUi ? "/prescription" : "/voice-rx-consult", {
            state: {
              patient_data: rec,
              ...(isVoiceRxNewUi
                ? { isVoiceRxNewUiFlow: true, voiceRxEntryPoint: "appointment_landing" }
                : {}),
            },
          });
          break;
        case "snap-rx":
          navigate("/snap-rx", { state: { patient_data: rec, videoConsultData: videoConsultDataFor(rec, true) } });
          break;
        case "smart-sync":
          navigate("/smart-prescription", { state: { patient_data: rec, videoConsultData } });
          break;
        case "tab-rx":
          navigate("/tab-rx", { state: { patient_data: rec, videoConsultData } });
          break;
        case "resume-rx": {
          const act = await dispatch(
            viewCaseManager({
              patient_unique_id: rec.patient_unique_id,
              tcm_id: rec.tcm_id,
              isChikitsalayAccessable,
            })
          );
          if (act.meta.requestStatus === "fulfilled") {
            navigate("/prescription", { state: { patient_data: rec, caseManagerData: act.payload } });
          } else {
            setToast({ status: "error", title: "Could not open this draft. Please try again." });
          }
          break;
        }
        case "patient-details":
          navigate("/patient_details", {
            state: {
              patient_data: activeTab === TAB_IDS.DRAFT ? { ...rec, pam_id: 0, tcm_id: 0 } : rec,
              videoConsultData,
            },
          });
          break;
        case "cancel-appointment":
          setCancelTarget(row);
          break;
        case "reschedule":
          if (!showBookActions) return;
          // Both views use the same point-and-click reschedule sidebar
          // (date chips + day-part slot picker); no jump to the calendar.
          setBookingCtx({ slot: null, reschedule: row });
          break;
        case "create-bill":
        case "advance-deposit":
        case "add-lab-results":
        case "create-certificate":
        case "end-visit":
        case "end-visit-reason":
        case "create-abha":
          setActionDrawer({ type: action, record: rec, name: row.name, tabId: row.status || activeTab });
          break;
        case "admit-to-ipd":
          handleAdmitToIpd(rec);
          break;
        case "health-checkup-report":
          navigate("/patient_details", {
            state: { patient_data: rec, sidebarKey: PATIENT_DETAILS_SIDEBAR_KEYS.HEALTH_CHECKUP_REPORT },
          });
          break;
        case "upload-records":
          pendingUploadRef.current = rec;
          fileInputRef.current?.click();
          break;
        case "download-abha": {
          const patientUniqueId = rec?.patient_unique_id;
          if (!patientUniqueId) {
            setToast({ status: "error", title: "Patient unique ID not found." });
            break;
          }
          try {
            const response = await ApiAbha.downloadAbhaCard({ patient_unique_id: patientUniqueId });
            const contentType = response.headers?.["content-type"] || "image/png";
            const blob = new Blob([response.data], { type: contentType });
            const ext = contentType.includes("jpg") || contentType.includes("jpeg") ? "jpg" : "png";
            saveAs(blob, `ABHA_Card_${patientUniqueId}.${ext}`);
            setToast({ status: "success", title: "ABHA Card downloaded." });
          } catch (error) {
            setToast({
              status: "error",
              title: error?.response?.data?.message || "Failed to download ABHA Card. Please try again.",
            });
          }
          break;
        }
        case "print-rx":
        case "print-draft-rx":
          if (rec.print_rx_url) {
            window.open(rec.print_rx_url, "_blank");
          } else {
            setToast({ status: "warning", title: "No prescription PDF is available for this visit yet." });
          }
          break;
        case "digitise-rx": {
          // Same flow as the legacy pending-digitisation bar: resolve the
          // unfinished case id, pull its SnapRx files, open the digitiser.
          try {
            const token = (localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN) || "").replace(/['"]+/g, "");
            const cleanedDate = String(rec.apDate || "").replace(/(\d+)(st|nd|rd|th)/, "$1");
            const caseRes = await axios.post(
              `${env.casemanager_api_url}${UNFINISHED_RX_CASE}`,
              { pam_id: rec.pam_id, tcm_created_date: moment(new Date(cleanedDate)).format("YYYY-MM-DD") },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const tcmId = caseRes.data?.[0]?.tcm_id;
            const smartRxData = await api
              .post(FETCH_SMART_RX, { tcm_id: tcmId }, { customBaseUrl: env.casemanager_api_url })
              .then((r) => (r?.data?.length ? r.data : null))
              .catch(() => null);
            navigate("/smart-rx-digitise", {
              state: {
                patient_data: rec,
                smartRxFilesData: smartRxData,
                tcm_id: tcmId,
                pam_id: rec.pam_id,
                print_url: rec.print_rx_url,
                page: "pending-digitization",
                type: "new",
              },
            });
          } catch {
            setToast({ status: "error", title: "Could not open this prescription for digitisation." });
          }
          break;
        }
        default:
          break;
      }
    },
    [navigate, dispatch, isVoiceRxNewUi, activeTab, profile, isDentalEnabled, isChikitsalayAccessable, showBookActions]
  );

  const handleUploadFileChange = (event) => {
    const files = event.target.files;
    const record = pendingUploadRef.current;
    event.target.value = null;
    if (!files || !record) return;
    const filesData = Array.from(files);
    if (filesData.length === 0) return;
    const updatedFiles = filesData.map((file) => {
      const cleanFileName = getCorrectedFileName(file?.name || "");
      const isCapturedFromCamera =
        (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/jpg") &&
        cleanFileName === "image.webp";
      if (isCapturedFromCamera) {
        return new File([file], generateUniqueFileName(file), { type: file.type });
      }
      return new File([file], cleanFileName, { type: file.type });
    });
    setActionDrawer({ type: "upload-records", record, name: record.pm_fullname, files: updatedFiles });
  };

  const confirmCancelAppointment = async () => {
    const rec = cancelTarget?.raw;
    if (!rec || cancelling) return;
    setCancelling(true);
    try {
      const res = await ApiAppointments.cancelAppointments({
        pam_id: rec.pam_id,
        patient_unique_id: rec.patient_unique_id,
        pm_id: rec.pm_id,
        pm_pid: rec.pm_pid,
      });
      if (res?.status) {
        if (activeTeleconsultAppointmentId != null && String(rec.pam_id) === String(activeTeleconsultAppointmentId)) {
          try {
            if (activeTeleconsultConsultationId) {
              await ApiTeleconsult.doctorLeft(activeTeleconsultConsultationId);
            }
          } catch (error) {
            console.log("[teleconsult] doctorLeft during cancel failed", {
              consultationId: activeTeleconsultConsultationId,
              message: error?.message,
            });
          } finally {
            dispatch(
              setAppointmentTeleconsultStatus({
                appointmentId: rec.pam_id,
                status: "ENDED",
              })
            );
            dispatch(setJoinToken(null));
          }
        }
        setToast({ status: "success", title: `${cancelTarget.name}'s appointment was cancelled.` });
        setCancelTarget(null);
        refetch();
        setSlotsVersion((v) => v + 1);
      } else {
        setToast({ status: "error", title: res?.message || "Could not cancel the appointment." });
      }
    } catch {
      setToast({
        status: "error",
        title: "Could not reach the server. The appointment was not cancelled, so try again in a moment.",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <TesseractThemeProvider colorScheme="light">
      <div className={styles.page}>
        <HeroBanner
          size="lg"
          align="center"
          tone="violet"
          title="Your Appointments"
          actions={
            <>
              {/* List vs calendar is a page-level mode, so it sits with the
                  banner CTAs rather than down in the table toolbar. */}
              <SegmentedControl
                className={styles.viewSeg}
                size="md"
                variant="block"
                options={[
                  {
                    value: "list",
                    icon: <TPLibraryIcon name="row-vertical" variant={view === "list" ? "bulk" : "linear"} size={18} />,
                  },
                  {
                    value: "calendar",
                    icon: (
                      <TPLibraryIcon
                        name="calendar"
                        family="time"
                        variant={view === "calendar" ? "bulk" : "linear"}
                        size={18}
                      />
                    ),
                  },
                ]}
                value={view}
                onValueChange={changeView}
              />
              {showBookActions && (
                <>
                  <Button
                    variant="outline"
                    theme="primary"
                    surface="dark"
                    className={styles.addApptBtn}
                    leftIcon={<TPLibraryIcon name="add" family="essential" size={20} />}
                    onClick={() => navigate("/add-appointment")}
                  >
                    Add Appointment
                  </Button>
                  <Button
                    variant="solid"
                    theme="primary"
                    surface="dark"
                    className={styles.startWalkInBtn}
                    leftIcon={<TPLibraryIcon name="flash" size={24} />}
                    onClick={() => navigate("/walk_in_consultation")}
                  >
                    Start Walk-In
                  </Button>
                </>
              )}
            </>
          }
        />

        {/* Card overlaps the banner, RxPad-style */}
        <div className={styles.cardWrap}>
          <div className={styles.card}>
            <div className={styles.tabRow}>
              <TabBar
                tabs={visibleTabs}
                activeTab={activeTab}
                countByTab={countByTab}
                onSelect={selectTab}
              />
              <div className={styles.tabRowMenu}>
                <Dropdown
                  className="tpKebabMenu"
                  options={[
                    {
                      value: "export-queue-ics",
                      label: exporting ? "Preparing…" : `Download Queue (.ics)${countByTab[TAB_IDS.QUEUE] ? ` · ${countByTab[TAB_IDS.QUEUE]}` : ""}`,
                    },
                  ]}
                  value={null}
                  onChange={(v) => v === "export-queue-ics" && exportQueueIcs()}
                  chevron={false}
                  variant="seamless"
                  placeholder=""
                  leadingIcon={<KebabIcon size={16} />}
                  ariaLabel="More options"
                  width={240}
                  renderOption={(o) => (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "2px 0" }}>
                      <TPLibraryIcon name="document-download" size={16} color="var(--tesseract-slate-500)" />
                      <span style={{ flex: 1, fontSize: 14, color: "var(--tesseract-slate-700)", whiteSpace: "nowrap" }}>
                        {o.label}
                      </span>
                    </div>
                  )}
                />
              </div>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchLabel}>
                <InputBox
                  fullWidth
                  showLabel={false}
                  showHelper={false}
                  clearable
                  leftIcon={<TPLibraryIcon name="search-normal" size={20} />}
                  placeholder="Search by patient name / ID / mobile number"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className={styles.toolbarRight}>
                {/* One date control for both views, in the same place.
                    The table filters over a range; the calendar is anchored
                    to a single day and its own Day/Week/Month toggle decides
                    how much of it you see, so the picker drops to single
                    mode there rather than making the user express a span
                    twice. */}
                <div
                  className={styles.dateWrap}
                  ref={dateWrapRef}
                  /* The picker is disabled on the digitisation worklist, and a
                     disabled control explains nothing on its own. */
                  onClickCapture={() => {
                    if (activeTab === TAB_IDS.PENDING) {
                      setToast({ status: "error", title: "Digitisation covers all dates." });
                    }
                  }}
                >
                  <DateRangePicker
                    /* Mirrors the calendar's own picker: week selects the
                       week, month picks the month, day picks a day. Two
                       controls on one value must not disagree about what
                       kind of thing that value is. */
                    mode={
                      !renderCalendar
                        ? "range"
                        : calendarWindowLabel?.mode === "week"
                        ? "range"
                        : calendarWindowLabel?.mode === "month"
                        ? "month"
                        : "single"
                    }
                    months={1}
                    showPresets={!renderCalendar}
                    presets={RANGE_PRESETS}
                    // Single mode doesn't commit on outside-click in this DS
                    // build, so it gets an explicit Apply.
                    commitMode={renderCalendar ? "apply" : "outside-click"}
                    /* Cleared on the digitisation worklist so the trigger
                       shows its "Till date" placeholder rather than a day
                       the list is not actually filtered by. */
                    value={
                      activeTab === TAB_IDS.PENDING
                        ? null
                        : renderCalendar
                        ? calendarWindowLabel?.value ?? dateRange?.start ?? null
                        : dateRange
                    }
                    onChange={(v) => {
                      if (!renderCalendar) return setDateRange(v);
                      /* Week hands back a range and month a month; the
                         calendar only ever wants the day to anchor on. */
                      const d = pickedDate(v) || (v?.start ? new Date(v.start) : null);
                      return setDateRange(d ? { start: d, end: d } : null);
                    }}
                    /* The digitisation worklist queries an all-time window,
                       so the control says what is actually on screen rather
                       than "Today", which would be a plain untruth about a
                       list reaching back years. */
                    placeholder={
                      activeTab === TAB_IDS.PENDING
                        ? "Till date"
                        : calendarWindowLabel?.label || "Today"
                    }
                    /* In week or month view the control names the span on
                       screen. A picker reading "13 Aug 2026" above a grid of
                       seven days is describing something that is not there. */
                    {...(calendarWindowLabel ? { formatDate: () => calendarWindowLabel.label } : {})}
                    size="sm"
                    fullWidth={false}
                    // Legacy rule: future dates only on the Queue tab; the
                    // pending tab lists its all-time window, picker off.
                    maxDate={allowFutureDates ? undefined : new Date()}
                    disabled={activeTab === TAB_IDS.PENDING}
                  />
                </div>
                <div className={styles.filterWrap} data-active={activeFilterCount > 0 || undefined}>
                  <Filter
                    groups={filterGroups}
                    value={filters}
                    onChange={setFilters}
                    mode="live"
                    icon={<TPLibraryIcon name="sort" size={15} />}
                  />
                </div>
              </div>
            </div>

            <ActiveFilterBar
              filters={filters}
              groups={filterGroups}
              onRemove={removeFilterValue}
              onClearAll={() => setFilters({})}
            />

            <div className={styles.body} data-view={renderCalendar ? "calendar" : "list"}>
              {!renderCalendar ? (
                <AppointmentListView
                  tabId={activeTab}
                  rows={rows}
                  loading={loading}
                  loadingMore={loadingMore}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  error={error}
                  onRetry={refetch}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={clearFilters}
                  onRowAction={onRowAction}
                  onPatientClick={(row) => onRowAction("patient-details", row)}
                  onAddAppointment={() => navigate("/add-appointment")}
                />
              ) : (
                <AppointmentCalendarView
                  rows={rows}
                  tabId={activeTab}
                  onRowAction={onRowAction}
                  /* In move mode the tapped slot is a proposal for the
                     appointment being moved, so it seeds the picker exactly
                     as a drop does. Outside move mode it is a fresh booking
                     and the slot is fixed. */
                  onSlotPick={
                    showBookActions
                      ? (slot) =>
                          setBookingCtx(
                            rescheduleFor ? { reschedule: rescheduleFor, seed: slot } : { slot }
                          )
                      : undefined
                  }
                  /* A drop proposes a time, it does not commit one. The
                     drawer opens on its own date and slot picker, seeded to
                     wherever the card landed, so the doctor confirms or
                     adjusts in the same place they would have if they had
                     opened Reschedule from the row menu. */
                  onEventDrop={
                    showBookActions
                      ? (row, slot) =>
                          slot
                            ? setBookingCtx({ reschedule: row, seed: slot })
                            : setToast({ status: "warning", title: "That time is not an available slot." })
                      : undefined
                  }
                  rescheduleFor={showBookActions ? rescheduleFor : null}
                  onStartMove={showBookActions ? (row) => setRescheduleFor(row) : undefined}
                  /* The queue changes underneath you: reception books someone
                     in, a colleague finishes a visit. Refresh pulls the rows
                     and re-derives the availability the grid draws, so both
                     land on the same fresh state. */
                  onRefresh={refreshQueue}
                  refreshing={refreshing}
                  /* So the toolbar picker names the same window the grid is
                     showing rather than one day inside it. */
                  onWindowLabelChange={setCalendarWindowLabel}
                  onCancelReschedule={() => setRescheduleFor(null)}
                  slotFilter={(filters.slot || []).length === 1 ? filters.slot[0] : null}
                  allowFutureDates={allowFutureDates}
                  dateRange={dateRange}
                  // Navigating inside the calendar publishes its anchor back
                  // up, so the toolbar picker always shows the day on screen.
                  onAnchorChange={(d) => setDateRange({ start: d, end: d })}
                  onWindowChange={setCalendarWindow}
                  onSlotUnavailable={setToast}
                  onDateChange={(v) => {
                    const d = pickedDate(v);
                    setDateRange(d ? { start: d, end: d } : null);
                  }}
                  slotsVersion={slotsVersion}
                  allowBook={showBookActions}
                />
              )}
            </div>
          </div>
        </div>

        <BookAppointmentDrawer
          open={!!bookingCtx}
          onOpenChange={(o) => !o && setBookingCtx(null)}
          slot={bookingCtx?.slot}
          doctorName={profile?.um_name ? `Dr ${profile.um_name}`.replace(/^Dr\s+Dr/i, "Dr") : "Doctor"}
          isReschedule={!!bookingCtx?.reschedule}
          initialPatient={
            bookingCtx?.reschedule?.raw
              ? {
                  patient_unique_id: bookingCtx.reschedule.raw.patient_unique_id,
                  pm_pid: bookingCtx.reschedule.raw.pm_pid,
                  pm_fullname: bookingCtx.reschedule.raw.pm_fullname,
                  pm_salutation: bookingCtx.reschedule.raw.pm_salutation,
                  pm_contact_no: bookingCtx.reschedule.raw.pm_contact_no,
                }
              : null
          }
          initialCaseType={bookingCtx?.reschedule?.raw?.toct_id ?? null}
          initialCategory={bookingCtx?.reschedule?.raw?.pt_id ?? bookingCtx?.reschedule?.raw?.category_id ?? null}
          initialRemarks={bookingCtx?.reschedule?.raw?.pam_appointment_remark || ""}
          /* The appointment's own id, so a move is a PUT against it rather
             than a new booking plus a cancel. */
          rescheduleId={bookingCtx?.reschedule?.raw?.pam_id ?? null}
          /* A teleconsult appointment reopens on Tele-Consultation; a fresh
             booking opens on whatever the slot filter says the doctor is
             looking at, and In-clinic otherwise. A slot that merely supports
             video is not enough to assume one: most do, and defaulting on
             that would turn walk-ins into video visits. */
          initialMode={
            bookingCtx?.reschedule
              ? bookingCtx.reschedule.hasVideo
                ? "teleconsult"
                : "in-clinic"
              : (filters.slot || []).length === 1 && filters.slot[0] === "video"
              ? "teleconsult"
              : "in-clinic"
          }
          seedDateISO={bookingCtx?.seed?.dateISO || null}
          seedStart={bookingCtx?.seed?.start || null}
          initialDateISO={bookingCtx?.reschedule?.dateISO || null}
          initialTime={
            bookingCtx?.reschedule?.slotHour != null
              ? moment({
                  hour: bookingCtx.reschedule.slotHour,
                  minute: bookingCtx.reschedule.slotMinute || 0,
                }).format("HH:mm:ss")
              : null
          }
          onBooked={(result) => {
            if (result?.moved) setRescheduleFor(null);
            refetch();
            setSlotsVersion((v) => v + 1);
          }}
        />

        <ConfirmDialog
          open={!!cancelTarget}
          onOpenChange={(o) => !o && setCancelTarget(null)}
          title="Cancel this appointment?"
          description={
            cancelTarget
              ? `${cancelTarget.name} · ${cancelTarget.slotTime}, ${cancelTarget.slotDate}. The slot opens up again once cancelled.`
              : ""
          }
          calloutTone="error"
          primaryLabel="Keep Appointment"
          onPrimary={() => setCancelTarget(null)}
          secondaryLabel={cancelling ? "Cancelling…" : "Cancel Appointment"}
          secondaryTone="destructive"
          onSecondary={confirmCancelAppointment}
        />

        <RowActionDrawers
          action={actionDrawer}
          onClose={() => setActionDrawer(null)}
          onDone={(doneToast) => {
            setActionDrawer(null);
            if (doneToast) setToast(doneToast);
            refetch();
            setSlotsVersion((v) => v + 1);
          }}
        />

        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleUploadFileChange}
          accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
          style={{ display: "none" }}
        />

        {toast && (
          <div className="tpToastHost" data-leaving={toastLeaving || undefined}>
            <Toast status={toast.status} title={toast.title} dismissible duration={3000} onDismiss={dismissToast} />
          </div>
        )}
      </div>
    </TesseractThemeProvider>
  );
}
