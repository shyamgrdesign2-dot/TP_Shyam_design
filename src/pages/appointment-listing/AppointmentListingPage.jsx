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
import { DatePicker } from "antd";
// eslint-disable-next-line import/no-unresolved -- exports-map alias ("./styles.css" → dist css); webpack resolves it, eslint-plugin-import cannot
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import {
  LIST_TABS,
  ZYDUS_LIST_TABS,
  ZYDUS_SINGLE_DAY_TABS,
  CALENDAR_TABS,
  CHIKITSALAY_LIST_TABS,
  CHIKITSALAY_CALENDAR_TABS,
  SLOT_FILTER_GROUP,
  TAB_IDS,
  isAllTimeWorklistTab,
} from "./data/appointmentsConfig";
import useAppointments, { fetchQueueRows } from "./data/useAppointments";
import useQueueManagementLiveRefresh from "../chikitsalay/useQueueManagementLiveRefresh";
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
import { setUploadDocCategories, resetUploadDocState } from "../../redux/uploadDocSlice";
import { setAdvancedSettings, setBillPrintSettings } from "../../redux/billingSlice";
import { resetVaccineState } from "../../redux/vaccineSlice";
import { resetGrowthChartState } from "../../redux/growthChartSlice";
import { resetObstetricState } from "../../redux/obstetricSlice";
import { resetDDxState } from "../../redux/ddxSlice";
import { fetchAdvanceSetting, fetchPrintSetting } from "../opdBilling/service";
import { useOpdBilling } from "../opdBilling/useOpdBilling";
import ApiAbha from "../../api/services/ApiAbha";
import { saveAs } from "file-saver";
import { useDeviceType } from "../../utils/deviceDetection";
import { useIsDentalEnabled } from "../../hooks/useIsDentalEnabled";
import { useChikitsalay } from "../chikitsalay/useChikitsalay";
import { cancelQueueAppointment, checkinQueuePatient } from "../chikitsalay/service";
import { useCrossConsult } from "../../hooks/useCrossConsult";
import { clinicTargetStatus, generateClinicToken } from "../chikitsalay/service";
import { DENTAL_RX_PAD_ROUTE } from "../../utils/dentalRoutes";
import { sendMessageToParent } from "../../utils/utils";
import AdmitToIpdModal from "../../components/admit-to-ipd/AdmitToIpdModal";
import { EVENTS } from "../../utils/events";
import { isChrome, isSafari } from "react-device-detect";
import { fetchPatientDefaultLanguage } from "../../api/services/DefaultLanguageService";
import { getSnapRxDigitization } from "../snapRx/services/snapRxService";
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
import {
  runZydusConsultOrPatientDetails,
  ZYDUS_FLAG,
} from "./data/zydusConsultFlow";
import styles from "./AppointmentListingPage.module.css";

/* All glyphs come from the Tesseract icon CDN via TPLibraryIcon (house
   rule: no inline / third-party SVGs). Closest CDN equivalents to the
   reference set: add, flash, search-normal, row-vertical, calendar, sort. */

async function buildListingPrintUrl(record) {
  const baseUrl = record?.print_url || record?.print_rx_url;
  if (!baseUrl) return null;

  let printUrl = baseUrl;
  try {
    if (record.patient_unique_id && record.tcm_id) {
      const urlObj = new URL(baseUrl, window.location.origin);
      urlObj.searchParams.delete("rxDigitize");
      const snapRxDigitisedData = await getSnapRxDigitization(
        record.patient_unique_id,
        record.tcm_id
      );
      const isSnapRxdigitised =
        snapRxDigitisedData?.digitization?.isVerified &&
        snapRxDigitisedData?.digitization?.isDigitize;
      if (isSnapRxdigitised) {
        urlObj.searchParams.set("rxDigitize", "true");
      }
      printUrl = urlObj.toString();
    }
  } catch {
    printUrl = baseUrl;
  }

  let encodedLang = "";
  try {
    const res = await fetchPatientDefaultLanguage(record?.patient_unique_id);
    const lang = res?.settings?.defaultLanguage;
    if (lang && lang !== "English") {
      encodedLang = btoa(String(lang));
    }
  } catch {
    encodedLang = "";
  }

  const joiner = printUrl.includes("?") ? "&" : "?";
  return `${printUrl}${joiner}lg=${encodedLang}`;
}

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
const sameDayLocal = (a, b) =>
  !!a && !!b && startOfDayLocal(a).getTime() === startOfDayLocal(b).getTime();
/* One compact universal date vocabulary, used by the pill in both views so the
   doctor never learns two formats. Title case, short weekday/month, no year:
   a single day is "Sat, 29 Aug", a span is "24 – 30 Aug" (or "28 Aug – 3 Sep"
   across a month boundary), and a whole month is "August". The year is dropped
   throughout — the schedule is always the current period. */
const formatPillDate = (d) => {
  const day = startOfDayLocal(d);
  const diff = Math.round((day.getTime() - startOfDayLocal(new Date()).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  const wd = day.toLocaleDateString("en-US", { weekday: "short" });
  const dm = day.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${wd}, ${dm}`;
};
const formatPillRange = (r) => {
  if (!r?.start) return "";
  const s = startOfDayLocal(r.start);
  const e = startOfDayLocal(r.end || r.start);
  const sMon = s.toLocaleDateString("en-US", { month: "short" });
  const eMon = e.toLocaleDateString("en-US", { month: "short" });
  if (sameDayLocal(s, e)) return formatPillDate(s);
  return sMon === eMon
    ? `${s.getDate()} – ${e.getDate()} ${eMon}`
    : `${s.getDate()} ${sMon} – ${e.getDate()} ${eMon}`;
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
            data-detached={
              isAllTimeWorklistTab(tab.id) &&
              tabs.find((t) => isAllTimeWorklistTab(t.id))?.id === tab.id
                ? true
                : undefined
            }
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
  const isCrossConsultEnabled = useCrossConsult();
  const { activeTeleconsultAppointmentId, activeTeleconsultConsultationId } = useSelector(
    (state) => state.teleconsultNotification || {}
  );
  const uploadDocCategories = useSelector((state) => state.uploadDoc?.uploadDocCategories) || [];
  const {
    showDraft,
    showBookActions,
    showWalkIn,
    isZydusAccount,
    digitisationWorklistEnabled,
    isCvtExtHos,
    isQueueManagementEnabled,
  } = useListingAccess();
  const { isTablet: isTabletDevice } = useDeviceType();
  const isIPadDesktopMode =
    typeof navigator !== "undefined" &&
    /Macintosh/.test(navigator.userAgent) &&
    navigator.maxTouchPoints > 1;
  // ICS export kebab is desktop-only — on tablet the overflow menu is easy
  // to hit by mistake and the download UX is awkward in the WebView.
  const showQueueExportMenu = !isTabletDevice && !isIPadDesktopMode;
  // siteId / empNo are set by SidebarDoctor after the Zydus ICT login handshake;
  // they live in the doctors redux slice, same as legacy AppointmentData.js reads them.
  const { siteId: zydusSiteId, empNo: zydusEmpNo, userId } = useSelector((state) => state.doctors || {});
  const { advancedSettings } = useSelector((state) => state.billing || {});
  const { isOpdBillingAccessable } = useOpdBilling();
  const finishedData = useSelector((state) => state.records?.finishedData) || [];
  const genxSyncInFlightRef = useRef(new Set());

  // Restored from the last visit; the calendar leads with "All", the table
  // with the queue, so the tab has to agree with the restored view.
  const [view, setView] = useState(() => readPreference("view", "list"));
  /* Day/Week/Month now lives in the page toolbar, so the page owns the calendar's
     grain. It drives the grid through the calendar's modeOverride, and the
     calendar publishes back through onModeChange (e.g. drilling into a day from
     month view) so the toolbar toggle stays in step. */
  const [calendarMode, setCalendarMode] = useState(() => {
    const saved = readPreference("calendarMode", "day");
    return saved === "week" || saved === "month" ? saved : "day";
  });
  const pickCalendarMode = useCallback((m) => {
    if (m !== "day" && m !== "week" && m !== "month") return;
    setCalendarMode(m);
    writePreference("calendarMode", m);
  }, []);
  const [activeTab, setActiveTab] = useState(() => {
    // Zydus defaults to Encounter tab on first load; non-Zydus defaults to Queue.
    // Calendar preference restores "All" only for non-Zydus (Zydus has no All tab).
    if (!isZydusAccount && readPreference("view", "list") === "calendar") return TAB_IDS.ALL;
    return isZydusAccount ? TAB_IDS.ZYDUS_ENCOUNTER : TAB_IDS.QUEUE;
  });

  // Table keeps its status buckets; the calendar leads with the "All" view
  // (complete schedule). Switching view retargets the tab so the mode always
  // opens on its natural default.
  // Zydus keeps Encounter/Appointment/… tabs in both list and calendar; the
  // calendar is day-only with no free-slot layer (see AppointmentCalendarView).
  const baseTabs = isZydusAccount
    ? ZYDUS_LIST_TABS
    : isChikitsalayAccessable
      ? CHIKITSALAY_LIST_TABS
      : LIST_TABS;
  const tabsForView = (
    view === "calendar" && !isZydusAccount
      ? isChikitsalayAccessable
        ? CHIKITSALAY_CALENDAR_TABS
        : CALENDAR_TABS
      : baseTabs
  ).filter(
    (t) =>
      (t.id !== TAB_IDS.DRAFT || showDraft) &&
      (t.id !== TAB_IDS.REFERRAL || isCrossConsultEnabled)
  );
  const isCalendar = view === "calendar";
  /* One deliberate exception to "the view is the view": Pending Digitisation
     and Referral are all-time worklists, not a schedule, so they have nothing
     to draw on a grid anchored to one day. Selecting either renders the table
     without moving the view toggle, and leaving it puts the grid straight back. */
  const isWorklistTab = isAllTimeWorklistTab(activeTab);
  const renderCalendar = isCalendar && !isWorklistTab;
  /* Greet the doctor by their first name: strip any leading "Dr"/"Dr." the
     backend may already carry, take the first token, and cap the length so a
     long name can never crowd the banner CTAs. Falls back to a plain greeting
     when the profile has not loaded yet. */
  const doctorFirstName = useMemo(() => {
    const raw = (profile?.um_name || "").trim();
    if (!raw) return "";
    const first = raw
      .replace(/^dr\.?\s+/i, "")
      .split(/\s+/)[0] || "";
    // Cap the name so it can never crowd the banner CTAs; the h1 also
    // ellipsis-truncates, so on a narrow screen the greeting degrades to
    // "Good morning, Dr. Sh…" rather than wrapping or pushing the buttons.
    return first.length > 16 ? `${first.slice(0, 16)}…` : first;
  }, [profile?.um_name]);
  /* Below ~900px the banner CTAs get tight, so the primary button shortens to
     "Book Appt". The greeting itself always stays (the h1 truncates its tail);
     this flag only governs that button label now. */
  const [compactHeader, setCompactHeader] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 900px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => setCompactHeader(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  /* A daily landing page reads warmer with a time-of-day greeting than a flat
     "Welcome", and it changes through the day so the screen never feels static.
     Falls back to a plain title before the profile loads. */
  const bannerTitle = useMemo(() => {
    if (!doctorFirstName) return "Appointments";
    // The greeting always stays; only the name gives way. When the banner is
    // narrow the h1 ellipsis-truncates the tail ("Good evening, Dr. Sh…"),
    // which the doctor reads as their own screen far better than a bare name.
    const h = new Date().getHours();
    const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    return `${part}, Dr. ${doctorFirstName}`;
  }, [doctorFirstName]);
  // Single-day prev/next is for Zydus list tabs only; calendar uses the
  // shared day picker like every other account.
  const useZydusSingleDayNav =
    isZydusAccount && !renderCalendar && ZYDUS_SINGLE_DAY_TABS.includes(activeTab);

  const changeView = (next) => {
    if (next === view) return;
    setView(next);
    writePreference("view", next);
    // The calendar is anchored to one day, so a multi-day table filter
    // collapses to where it started rather than being silently ignored.
    if (next === "calendar") setDateRange((r) => (r?.start ? { start: r.start, end: r.start } : r));
    if (!isZydusAccount) {
      if (next === "calendar") setActiveTab(TAB_IDS.ALL);
      else if (activeTab === TAB_IDS.ALL) setActiveTab(TAB_IDS.QUEUE);
    }
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

  useEffect(() => {
    if (!isCrossConsultEnabled && activeTab === TAB_IDS.REFERRAL) setActiveTab(TAB_IDS.QUEUE);
  }, [isCrossConsultEnabled, activeTab]);

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
  const [checkingIn, setCheckingIn] = useState(false);
  const [actionDrawer, setActionDrawer] = useState(null);
  const [admitToIpdRecord, setAdmitToIpdRecord] = useState(null);
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
  const tabRowRef = useRef(null);
  const fileInputRef = useRef(null);

  // Right-edge fade on the tab strip. When the tabs are wider than the card
  // (narrow screens / many tabs) the strip scrolls horizontally with its
  // scrollbar hidden, so a soft gradient at the right edge is the only cue that
  // more tabs sit off-screen. It clears once the strip is scrolled to the end.
  useEffect(() => {
    const wrap = tabRowRef.current;
    if (!wrap) return undefined;
    // The horizontally scrolling element is the design system's TabsList, not
    // the Tabs root wrapper.
    const scroller = wrap.querySelector('[role="tablist"]') || wrap;
    const sync = () => {
      const more = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 1;
      if (more) wrap.setAttribute("data-overflow-x", "");
      else wrap.removeAttribute("data-overflow-x");
    };
    sync();
    scroller.addEventListener("scroll", sync, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", sync);
      ro?.disconnect();
    };
  }, [activeTab]);

  // "ResizeObserver loop completed with undelivered notifications" is a benign
  // browser notice (a resize handler laid out again within the same frame; the
  // browser just defers the extra notifications). It changes nothing at runtime,
  // but react-scripts' dev overlay treats every window error as fatal and pops a
  // full-screen "Uncaught runtime errors" panel. Swallow only this exact message
  // so the overlay stops firing; real errors pass through untouched.
  useEffect(() => {
    const onError = (e) => {
      if (typeof e.message === "string" && e.message.startsWith("ResizeObserver loop")) {
        e.stopImmediatePropagation();
        const overlay = document.getElementById("webpack-dev-server-client-overlay");
        if (overlay) overlay.style.display = "none";
      }
    };
    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);

  const pendingUploadRef = useRef(null);
  const dispatch = useDispatch();
  const isVoiceRxNewUi = useFeatureIsOn(GB_VOICE_RX_NEW_UI);

  const hasFetchedBillPrintSettings = useRef(false);

  const getAdvanceSettings = useCallback(async () => {
    const response = await fetchAdvanceSetting();
    if (response) dispatch(setAdvancedSettings(response));
  }, [dispatch]);

  const getBillPrintSettings = useCallback(async () => {
    if (!userId) return;
    const response = await fetchPrintSetting(userId);
    if (response) dispatch(setBillPrintSettings(response));
  }, [dispatch, userId]);

  useEffect(() => {
    if (advancedSettings && !Object.keys(advancedSettings).length && isOpdBillingAccessable) {
      getAdvanceSettings();
    }
  }, [isOpdBillingAccessable, advancedSettings, getAdvanceSettings]);

  useEffect(() => {
    if (!hasFetchedBillPrintSettings.current && userId) {
      hasFetchedBillPrintSettings.current = true;
      getBillPrintSettings();
    }
  }, [getBillPrintSettings, userId]);

  useEffect(() => {
    dispatch(resetVaccineState());
    dispatch(resetGrowthChartState());
    dispatch(resetObstetricState());
    dispatch(resetUploadDocState());
    dispatch(resetDDxState());
  }, [dispatch]);

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
      const queueRows = await fetchQueueRows({
        dateRange,
        query: debouncedQuery,
        visitTypeCsv,
        isChikitsalay: isChikitsalayAccessable,
      });
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
  const allowFutureDates =
    activeTab === TAB_IDS.QUEUE ||
    activeTab === TAB_IDS.CLINIC_APPOINTMENT ||
    activeTab === TAB_IDS.ALL;
  useEffect(() => {
    if (!allowFutureDates && dateRange?.end && moment(dateRange.end).isAfter(moment(), "day")) {
      setDateRange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on tab change only
  }, [allowFutureDates]);

  /* Instant quick-select. The design system's date picker only commits on Apply
     (or a click outside), but a doctor tapping "Today" or a single day on the
     grid wants it applied and the popover gone in one click — Apply should be
     left for a hand-drawn custom range only. So we watch clicks inside the
     picker's popover: a preset always commits instantly, and a single day
     commits instantly in the calendar's single-date picker (in the table, day
     clicks are the two ends of a range and still go through Apply). We set our
     own date state and dismiss the popover through its Cancel control; the
     controlled value we just set is what the trigger then shows. */
  const ownPopover = useCallback(() => {
    const id = dateWrapRef.current
      ?.querySelector('[class*="_trigger_"]')
      ?.getAttribute("aria-controls");
    return id ? document.getElementById(id) : null;
  }, []);
  // Mark our popover so the calendar footer restyle (see .dayPopover in the CSS)
  // is scoped to this one picker. rAF because the popover mounts a tick after
  // the trigger click that opens it.
  const tagOwnPopover = useCallback(() => {
    requestAnimationFrame(() => ownPopover()?.classList.add(styles.dayPopover));
  }, [ownPopover]);

  useEffect(() => {
    const onClick = (e) => {
      const popover = e.target.closest?.('[id^="tp-drp-popover-"]');
      if (!popover) return;
      // Only our toolbar date picker's popover — never another date picker that
      // happens to be open on the page (e.g. the add-patient Date of Birth
      // field in a drawer over this screen), which this would otherwise hijack.
      const ourPopoverId = dateWrapRef.current
        ?.querySelector('[class*="_trigger_"]')
        ?.getAttribute("aria-controls");
      if (!ourPopoverId || popover.id !== ourPopoverId) return;
      const close = () =>
        popover.querySelector('[class*="_actionsRight_"] button')?.click();
      // "Today": the single picker's one footer action (the relabelled Clear).
      // Jump the selection to today and close, rather than clearing the value.
      if (renderCalendar && e.target.closest('[class*="_actions_"] [data-theme="warning"]')) {
        setTimeout(() => {
          setCalendarWindow(null);
          setCalendarWindowLabel(null);
          const today = new Date();
          setDateRange({ start: startOfDayLocal(today), end: startOfDayLocal(today) });
          close();
        }, 0);
        return;
      }
      const presetBtn = e.target.closest('[class*="_preset_"]');
      const dayBtn = e.target.closest('[class*="_day_"]');
      if (!presetBtn && !dayBtn) return;
      if (dayBtn && !renderCalendar) return; // table: day clicks build a range
      let next = null;
      if (presetBtn) {
        const p = RANGE_PRESETS.find((x) => x.label === presetBtn.textContent.trim());
        if (p) next = p.getRange();
      } else if (dayBtn) {
        const d = new Date(dayBtn.getAttribute("aria-label"));
        if (!Number.isNaN(d.getTime())) next = { start: startOfDayLocal(d), end: startOfDayLocal(d) };
      }
      if (!next) return;
      // Let the design system register the click, then apply ours and close.
      setTimeout(() => {
        if (renderCalendar) {
          setCalendarWindow(null);
          setCalendarWindowLabel(null);
        }
        setDateRange(next);
        close();
      }, 0);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [renderCalendar]);

  /* ── Toolbar date stepper ───────────────────────────────────────────────
     Both views share one control in the toolbar: [‹ date ›], the arrows inside
     a single pill. In the table the arrows walk one day and only make sense on
     a single day, so a multi-day span (a preset or a hand-picked range)
     disables them. In the calendar they walk the visible window — a day in Day
     view, a week in Week view — and the calendar re-anchors from the date set
     here, so its own header no longer needs a second date control.

     The label is derived, not stored: when the table span equals a quick preset
     we hand the picker the preset id (a bare string the design system resolves
     back to its own label) so the trigger reads "Today"/"Past 7 days" rather
     than a raw range; the calendar publishes its own window label to show. */
  // No explicit selection means "today", which is a single day — so the arrows
  // work from the default view too, not just after the doctor picks a date.
  const effDateStart = dateRange?.start ? new Date(dateRange.start) : new Date();
  const dateIsSingleDay = !dateRange?.start
    ? true
    : !!dateRange?.end && sameDayLocal(dateRange.start, dateRange.end);
  const dateArrowsDisabled = renderCalendar ? false : isWorklistTab || !dateIsSingleDay;
  const dateNextDisabled =
    (renderCalendar ? false : dateArrowsDisabled) ||
    (!allowFutureDates && sameDayLocal(effDateStart, new Date()));
  const stepDate = (dir) => () => {
    // Always a single day: the selected date moves by one, and the calendar's
    // week/month view just re-centres on it when it crosses a boundary.
    const next = shiftDays(startOfDayLocal(effDateStart), dir);
    if (!renderCalendar) {
      setCalendarWindow(null);
      setCalendarWindowLabel(null);
    }
    setDateRange({ start: next, end: next });
  };
  const activePresetId = useMemo(() => {
    if (renderCalendar || isWorklistTab || !dateRange?.start || !dateRange?.end) return null;
    const match = RANGE_PRESETS.find((p) => {
      const r = p.getRange();
      return sameDayLocal(r.start, dateRange.start) && sameDayLocal(r.end, dateRange.end);
    });
    return match?.id ?? null;
  }, [dateRange, isWorklistTab, renderCalendar]);
  /* The table picker runs in range mode so the multi-day presets keep working,
     but range mode always writes "30 Aug 2026 – 30 Aug 2026" for a single day
     and ignores formatDate. So for a plain single day that is not itself a
     preset (the arrow-stepped case) we overlay our own short label — "Monday",
     "29 Aug", "Tomorrow" — over the trigger text. Today/Yesterday already read
     as words through the preset path, and the calendar's day view is single
     mode where formatDate works, so neither needs the overlay. */
  /* The pill label is drawn by us, over the design system's trigger, in every
     state — so a single day always reads as "Saturday, 27 August" (table and
     calendar day view alike), a calendar week/month shows the grid's own window
     label, and only a hand-picked multi-day table range falls back to the DS's
     own range text. Driving it here rather than through the DS's value/format
     means it never flickers to a placeholder or a raw "29 Aug 2026". */
  const activePreset = RANGE_PRESETS.find((p) => p.id === activePresetId);
  const pillOverlay = isWorklistTab
    ? null
    : renderCalendar
    ? // The calendar always has one selected day; Day/Week/Month only change how
      // much context is drawn around it, so the pill names that day, not a range.
      formatPillDate(effDateStart)
    : dateIsSingleDay
    ? formatPillDate(effDateStart)
    : activePreset
    ? activePreset.label
    : formatPillRange(dateRange);

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
    () => {
      // Mission Hospital / CVT external: no visit-type or slot filters (legacy
      // AppointmentData also hides the filter cluster for that flag).
      if (isCvtExtHos) return [];
      // Legacy Zydus column filters use `toct_type` strings; TP listAppointment
      // for non-Zydus uses `toct_id` values in filterVisitType.
      const visitTypeGroup = {
        id: "visitType",
        label: "Visit Type",
        options: caseTypes.map((t) =>
          isZydusAccount
            ? { value: String(t.toct_type), label: t.toct_type }
            : { value: String(t.toct_id), label: t.toct_type }
        ),
      };
      // Zydus ICT/GenX rows have no in-clinic vs tele slot concept — visit type only.
      if (isZydusAccount) return [visitTypeGroup];
      // Referral has no visit-type / slot columns (AppointmentData.js). Keep
      // visit-type as a server filter; drop the slot group so an in-clinic
      // chip from Queue cannot silently empty this all-time list.
      if (activeTab === TAB_IDS.REFERRAL) return [visitTypeGroup];
      return [SLOT_FILTER_GROUP, visitTypeGroup];
    },
    [caseTypes, isZydusAccount, activeTab, isCvtExtHos]
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
  // Month is a single listAppointmentCalendar call over the displayed month
  // (1st–last), not the 42-cell padded grid — so leaving month view cannot
  // accidentally paginate listAppointment across six weeks.
  const queryRange = useMemo(() => {
    if (renderCalendar && calendarMode === "month") {
      const d = dateRange?.start ? new Date(dateRange.start) : new Date();
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return { start, end };
    }
    if (renderCalendar && calendarMode === "day") {
      const start = dateRange?.start ? new Date(dateRange.start) : new Date();
      return { start, end: start };
    }
    return renderCalendar && calendarWindow ? calendarWindow : dateRange;
  }, [renderCalendar, calendarMode, calendarWindow, dateRange]);
  const { rows: liveRows, counts: countByTab, dayTotals, loading, loadingMore, hasMore, error, refetch, loadMore } = useAppointments({
    tabId: activeTab,
    dateRange: queryRange,
    query: debouncedQuery,
    visitTypeCsv,
    /* Calendar must eventually show every appointment in the window. Table
       uses the same 25-row infinite scroll as the legacy screen. Month uses
       listAppointmentCalendar instead, so it must not paginate. */
    fetchAllPages: renderCalendar && calendarMode !== "month",
    includeDraft: showDraft,
    includePendingDigitisation: digitisationWorklistEnabled,
    zydusSiteId,
    zydusEmpNo,
    isZydusAccount,
    isChikitsalay: isChikitsalayAccessable && !isZydusAccount,
    calendarMode: renderCalendar ? calendarMode : "day",
  });

  // Refetches on any server-side queue change (KEA, auto-NO_SHOW, another session).
  useQueueManagementLiveRefresh({ enabled: isQueueManagementEnabled, onUpdate: refetch });

  // Pending Digitisation is an all-time worklist, independent of the Slot /
  // Visit-Type filters. Those filters can drive its visible count to 0, which
  // must not make the tab vanish — so it also stays while any filter is active.
  const showPendingTab =
    digitisationWorklistEnabled &&
    ((countByTab[TAB_IDS.PENDING] || 0) > 0 || activeFilterCount > 0);
  const visibleTabs = useMemo(
    () => tabsForView.filter((t) => t.id !== TAB_IDS.PENDING || showPendingTab),
    [tabsForView, showPendingTab]
  );

  useEffect(() => {
    if (!showPendingTab && activeTab === TAB_IDS.PENDING) {
      setActiveTab(isZydusAccount ? TAB_IDS.ZYDUS_ENCOUNTER : TAB_IDS.QUEUE);
    }
  }, [showPendingTab, activeTab, isZydusAccount]);

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
    if (activeTab === TAB_IDS.REFERRAL) return liveRows;
    /* Month chips have no visit-mode flag from listAppointmentCalendar, so
       the in-clinic/video filter cannot be applied without emptying the grid. */
    if (calendarMode === "month" && renderCalendar) return liveRows;
    const slotSel = filters.slot || [];
    if (slotSel.length !== 1) return liveRows;
    const wantVideo = slotSel[0] === "video";
    return liveRows.filter((row) => row.hasVideo === wantVideo);
  }, [liveRows, filters.slot, activeTab, calendarMode, renderCalendar]);

  // Zydus legacy date navigator: single day (prev/next + date picker),
  // with the legacy "can't go to next day when on today" rule.
  const zydusDateISO = dateRange?.start ? moment(dateRange.start).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
  const zydusDateValue = moment(zydusDateISO, "YYYY-MM-DD");

  const backZydusDatePress = useCallback(() => {
    const next = zydusDateValue.clone().subtract(1, "day");
    setDateRange({ start: next.toDate(), end: next.toDate() });
    setCalendarWindow(null);
    setCalendarWindowLabel(null);
  }, [zydusDateValue]);

  const nextZydusDatePress = useCallback(() => {
    const todayISO = moment().format("YYYY-MM-DD");
    const isQueueOrDraft = [TAB_IDS.QUEUE, TAB_IDS.DRAFT].includes(activeTab);

    if (!isQueueOrDraft && zydusDateISO === todayISO) {
      setToast({ status: "error", title: "Can't select next date" });
      return;
    }

    const next = zydusDateValue.clone().add(1, "day");
    setDateRange({ start: next.toDate(), end: next.toDate() });
    setCalendarWindow(null);
    setCalendarWindowLabel(null);
  }, [activeTab, setToast, zydusDateISO, zydusDateValue]);

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

  const runZydusEncounterAction = useCallback(
    async (flag, rec) => {
      const finishedConsultation =
        rec?.encounterId &&
        finishedData.find((item) => String(item?.pam_ref_id) === String(rec.encounterId));
      await runZydusConsultOrPatientDetails({
        flag,
        record: rec,
        activeTab,
        dispatch,
        navigate,
        profile,
        siteId: zydusSiteId,
        empNo: zydusEmpNo,
        finishedConsultation: finishedConsultation || null,
        isDentalEnabled,
        dentalRoute: DENTAL_RX_PAD_ROUTE,
        isVoiceRxNewUi,
        syncInFlight: genxSyncInFlightRef.current,
        onError: (title) => setToast({ status: "error", title }),
      });
    },
    [
      activeTab,
      dispatch,
      navigate,
      profile,
      zydusSiteId,
      zydusEmpNo,
      finishedData,
      isDentalEnabled,
      isVoiceRxNewUi,
    ]
  );

  const onRowActionAsync = useCallback(
    async (action, row) => {
      const rec = row?.raw || row;
      if (!rec) return;
      const videoConsultData = videoConsultDataFor(rec);
      // Encounter tab (or GenX-sourced rows): sync before Rx / patient details.
      // Appointment-tab Consult without GENX keeps the plain navigate path below.
      const isZydusEncounter =
        isZydusAccount &&
        (activeTab === TAB_IDS.ZYDUS_ENCOUNTER || rec?.source === "GENX");
      switch (action) {
        case "type-rx": {
          window.Moengage?.track_event("patient_search_consult", {
            doctor_id: profile?.doctor_unique_id,
            patient_id: rec?.patient_unique_id,
          });
          if (isZydusEncounter) {
            await runZydusEncounterAction(ZYDUS_FLAG.CONSULT, rec);
            break;
          }
          navigate(isDentalEnabled ? DENTAL_RX_PAD_ROUTE : "/prescription", {
            state: { patient_data: rec, videoConsultData },
          });
          if (isChikitsalayAccessable && rec?.pam_id) {
            clinicTargetStatus(rec.pam_id, { targetStatus: CLINIC_TARGET_STATUS.SERVING });
          }
          break;
        }
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
          if (isZydusEncounter) {
            await runZydusEncounterAction(ZYDUS_FLAG.VOICE_RX, rec);
            break;
          }
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
          if (isZydusEncounter) {
            await runZydusEncounterAction(ZYDUS_FLAG.SNAP_RX, rec);
            break;
          }
          navigate("/snap-rx", { state: { patient_data: rec, videoConsultData: videoConsultDataFor(rec, true) } });
          break;
        case "smart-sync":
          if (isZydusEncounter) {
            await runZydusEncounterAction(ZYDUS_FLAG.SMART_RX, rec);
            break;
          }
          navigate("/smart-prescription", { state: { patient_data: rec, videoConsultData } });
          break;
        case "tab-rx":
          if (isZydusEncounter) {
            // TabRx is not a separate GenX flag in legacy; sync then open Consult.
            await runZydusEncounterAction(ZYDUS_FLAG.CONSULT, rec);
            break;
          }
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
          if (isZydusEncounter) {
            await runZydusEncounterAction(ZYDUS_FLAG.PATIENT_DETAILS, rec);
            break;
          }
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
        case "check-in": {
          if (checkingIn) break;
          setCheckingIn(true);
          try {
            const checkinRes = await checkinQueuePatient(rec.patient_unique_id);
            const isSuccess = checkinRes?.status >= 200 && checkinRes.status < 300;
            if (isSuccess) {
              setToast({
                status: "success",
                title: checkinRes?.tokenNumber
                  ? `Checked in — token ${checkinRes.tokenNumber}`
                  : `${row.name || "Patient"} checked in.`,
              });
              refetch();
            } else {
              setToast({ status: "error", title: checkinRes?.message || "Could not check in. Please try again." });
            }
          } finally {
            setCheckingIn(false);
          }
          break;
        }
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
          // Legacy AppointmentData opens AdmitToIpdModal (category + reason)
          // before submitting — do not call handleAdmitToIpd without those fields.
          setAdmitToIpdRecord(rec);
          break;
        case "health-checkup-report":
          navigate("/patient_details", {
            state: { patient_data: rec, sidebarKey: PATIENT_DETAILS_SIDEBAR_KEYS.HEALTH_CHECKUP_REPORT },
          });
          break;
        case "upload-records":
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
        case "print-draft-rx": {
          // Match Patient Details / legacy AppointmentData: in-app WebView
          // (iPad tablet shell) uses sendMessageToParent so the native print
          // Options UI opens. Bare window.open(pdf) takes over the whole
          // tablet screen with no back into the portal.
          if (!rec.print_rx_url && !rec.print_url) {
            setToast({
              status: "warning",
              title: "No prescription PDF is available for this visit yet.",
            });
            break;
          }
          try {
            const fullPrintUrl = await buildListingPrintUrl(rec);
            if (!fullPrintUrl) {
              setToast({
                status: "warning",
                title: "No prescription PDF is available for this visit yet.",
              });
              break;
            }
            if (!isChrome && !isSafari) {
              sendMessageToParent(EVENTS.PRINT, { url: fullPrintUrl });
            } else {
              window.open(fullPrintUrl, "_blank");
            }
          } catch (error) {
            setToast({
              status: "error",
              title: error?.message || "Could not open the prescription for printing.",
            });
          }
          break;
        }
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
    [navigate, dispatch, isVoiceRxNewUi, activeTab, profile, isDentalEnabled, isChikitsalayAccessable, showBookActions, isZydusAccount, runZydusEncounterAction, checkingIn, refetch]
  );

  /* Same as AppointmentData.js on prod: kebab onClick → handleAddClick
     (fileInputRef.click()) so the OS Camera/File sheet opens; input onChange
     → handleFileUpload(event, record) opens the upload drawer. The Android
     Camera/File modal is commented out there too — tablet uses this input.
     The input lives on the page so it stays mounted when the kebab closes. */
  const pickingRef = useRef(false);

  const filesFromPicker = (fileList) =>
    Array.from(fileList || []).map((file) => {
      const cleanFileName = getCorrectedFileName(file?.name || "");
      const isCapturedFromCamera =
        (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/jpg") &&
        cleanFileName === "image.webp";
      if (isCapturedFromCamera) {
        return new File([file], generateUniqueFileName(file), { type: file.type });
      }
      return new File([file], cleanFileName, { type: file.type });
    });

  const openUploadDrawer = (record, files) => {
    if (!record || !files?.length) return;
    pendingUploadRef.current = null;
    setActionDrawer({
      type: "upload-records",
      record,
      name: record.pm_fullname,
      files,
    });
  };

  const onRowAction = useCallback(
    (action, row) => {
      const rec = row?.raw || row;
      if (!rec) return;
      if (action === "upload-records" || action === "upload-records-pick") {
        pendingUploadRef.current = rec;
        if (pickingRef.current) return;
        pickingRef.current = true;
        fileInputRef.current?.click();
        return;
      }
      void onRowActionAsync(action, row);
    },
    [onRowActionAsync]
  );

  const handleUploadFileChange = (event) => {
    const files = filesFromPicker(event.target.files);
    event.target.value = null;
    if (files.length === 0) {
      pickingRef.current = false;
      return;
    }
    const record = pendingUploadRef.current;
    if (record) openUploadDrawer(record, files);
    window.setTimeout(() => {
      pickingRef.current = false;
    }, 400);
  };

  useEffect(() => {
    const onFocus = () => {
      window.setTimeout(() => {
        pickingRef.current = false;
      }, 300);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const confirmCancelAppointment = async () => {
    const rec = cancelTarget?.raw;
    if (!rec || cancelling) return;
    setCancelling(true);
    try {
      let res;
      if (isQueueManagementEnabled) {
        const queueRes = await cancelQueueAppointment(rec.pam_id);
        const isSuccess = queueRes?.status >= 200 && queueRes.status < 300;
        res = { status: isSuccess, message: queueRes?.message };
      } else {
        res = await ApiAppointments.cancelAppointments({
          pam_id: rec.pam_id,
          patient_unique_id: rec.patient_unique_id,
          pm_id: rec.pm_id,
          pm_pid: rec.pm_pid,
        });
      }
      if (res?.status) {
        if (activeTeleconsultAppointmentId != null && String(rec.pam_id) === String(activeTeleconsultAppointmentId)) {
          try {
            if (activeTeleconsultConsultationId) {
              await ApiTeleconsult.doctorLeft(activeTeleconsultConsultationId);
            }
          } catch (error) {
            console.error("[teleconsult] doctorLeft during cancel failed", {
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
          align="left"
          tone="violet"
          title={bannerTitle}
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
                <Button
                  variant="outline"
                  theme="primary"
                  surface="dark"
                  className={styles.addApptBtn}
                  leftIcon={<TPLibraryIcon name="add" family="essential" size={20} />}
                  onClick={() => navigate("/add-appointment")}
                >
                  {compactHeader ? "Book Appt" : "Book Appointment"}
                </Button>
              )}
              {showWalkIn && (
                <Button
                  variant="solid"
                  theme="primary"
                  surface="dark"
                  className={styles.startWalkInBtn}
                  leftIcon={<TPLibraryIcon name="flash" size={24} />}
                  onClick={() =>
                    navigate(isZydusAccount ? "/walk_in_consultation_zydus" : "/walk_in_consultation")
                  }
                >
                  Start Walk-In
                </Button>
              )}
            </>
          }
        />

        {/* Card overlaps the banner, RxPad-style */}
        <div className={styles.cardWrap}>
          <div className={styles.card}>
            <div className={styles.tabRow} ref={tabRowRef}>
              <TabBar
                tabs={visibleTabs}
                activeTab={activeTab}
                countByTab={countByTab}
                onSelect={selectTab}
              />
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchLabel}>
                <InputBox
                  fullWidth
                  clearable
                  leftIcon={<TPLibraryIcon name="search-normal" size={20} />}
                    placeholder={
                      isZydusAccount ? "Search patient by name, MRN or mobile number" : "Search by patient name / ID / mobile number"
                    }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className={styles.toolbarRight}>
                {/* Day/Week/Month lives here, ahead of the date stepper, so the
                    calendar's grain and its navigation read as one control group
                    and the grid keeps its own header for nothing but the grid. */}
                {renderCalendar && !isZydusAccount && (
                  <SegmentedControl
                    className={styles.grainSeg}
                    size="sm"
                    variant="block"
                    options={[
                      { value: "day", label: "Day" },
                      { value: "week", label: "Week" },
                      { value: "month", label: "Month" },
                    ]}
                    value={calendarMode}
                    onValueChange={pickCalendarMode}
                  />
                )}
                {/* One date control for both views, in one place: a [‹ date ›]
                    stepper here in the toolbar. In the table it spans a range;
                    in the calendar it walks the window and re-anchors the grid.
                    Zydus keeps its own single-day nav. */}
                {useZydusSingleDayNav ? (
                  <div className={styles.zydusDateNav}>
                    <Button
                      variant="outline"
                      theme="neutral"
                      size="sm"
                      surface="light"
                      className={styles.zydusNavBtn}
                      onClick={backZydusDatePress}
                      aria-label="Previous date"
                      leftIcon={<TPLibraryIcon name="chevron-left" size={16} />}
                    />
                    <DatePicker
                      value={zydusDateValue}
                      format="DD-MM-YYYY"
                      inputReadOnly
                      allowClear={false}
                      onChange={(d, dateString) => {
                        if (!dateString || !d) return;
                        const m = moment(dateString, "DD-MM-YYYY");
                        setDateRange({ start: m.toDate(), end: m.toDate() });
                        setCalendarWindow(null);
                        setCalendarWindowLabel(null);
                      }}
                    />
                    <Button
                      variant="outline"
                      theme="neutral"
                      size="sm"
                      surface="light"
                      className={styles.zydusNavBtn}
                      onClick={nextZydusDatePress}
                      aria-label="Next date"
                      leftIcon={<TPLibraryIcon name="chevron-right" size={16} />}
                    />
                  </div>
                ) : (
                  <div className={styles.dateNav}>
                    <Button
                      variant="outline"
                      theme="neutral"
                      size="sm"
                      surface="light"
                      className={styles.dateNavBtn}
                      onClick={stepDate(-1)}
                      disabled={dateArrowsDisabled}
                      aria-label="Previous"
                      leftIcon={<TPLibraryIcon name="chevron-left" size={16} />}
                    />
                    <div
                      className={styles.dateWrap}
                      ref={dateWrapRef}
                      data-overlay={pillOverlay ? "" : undefined}
                      /* The picker is disabled on the digitisation worklist, and a
                         disabled control explains nothing on its own. */
                      onClickCapture={() => {
                        if (isWorklistTab) {
                          setToast({
                            status: "error",
                            title:
                              activeTab === TAB_IDS.REFERRAL
                                ? "Referral covers all dates."
                                : "Digitisation covers all dates.",
                          });
                        }
                        // Tag our popover the moment it opens so the calendar
                        // footer restyle (Today-only) is scoped to this picker
                        // and never touches the add-patient DOB field's popover.
                        if (renderCalendar) tagOwnPopover();
                      }}
                    >
                      <DateRangePicker
                        /* The table spans a real range with quick presets; the
                           calendar always picks one day (its Day/Week/Month view
                           only changes how much context is drawn around it), so
                           the picker there is a single-date calendar. */
                        mode={renderCalendar ? "single" : "range"}
                        months={1}
                        showPresets={!renderCalendar}
                        presets={RANGE_PRESETS}
                        commitMode={renderCalendar ? "apply" : "outside-click"}
                        value={
                          isWorklistTab
                            ? null
                            : !renderCalendar
                            ? activePresetId ?? dateRange
                            : dateRange?.start ?? null
                        }
                        onChange={(v) => {
                          if (renderCalendar) {
                            const d = pickedDate(v) || (v?.start ? new Date(v.start) : null);
                            if (d) return setDateRange({ start: d, end: d });
                            setCalendarWindow(null);
                            setCalendarWindowLabel(null);
                            const today = new Date();
                            return setDateRange({ start: today, end: today });
                          }
                          const start = v?.start ?? v?.range?.start ?? null;
                          const end = v?.end ?? v?.range?.end ?? start;
                          if (!start && !end) {
                            const today = new Date();
                            return setDateRange({ start: today, end: today });
                          }
                          return setDateRange({ start: start || end, end: end || start });
                        }}
                        placeholder={
                          isWorklistTab
                            ? "Till date"
                            : renderCalendar
                            ? calendarWindowLabel?.label || "Today"
                            : "Today"
                        }
                        size="sm"
                        fullWidth={false}
                        /* Both pickers keep a footer, but they carry different
                           actions. The table (range) footer is the design
                           system's Clear / Cancel / Apply, for hand-drawn custom
                           ranges. The calendar (single) footer is stripped down to
                           ONE action: "Today" (the design system's Clear slot,
                           relabelled), which jumps the selection to today. Cancel
                           and Apply are hidden by CSS on the tagged popover, since
                           a day click already commits and closes on its own. */
                        showFooter
                        clearLabel={renderCalendar ? "Today" : "Clear"}
                        maxDate={allowFutureDates ? undefined : new Date()}
                        disabled={isWorklistTab}
                      />
                      {/* Our own pill label, in flow so the pill wraps to it, in
                          every state (see pillOverlay). The design system's own
                          trigger text is collapsed; clicking this forwards to the
                          trigger so the picker still opens. */}
                      {pillOverlay && (
                        <span
                          className={styles.dateSingleLabel}
                          onClick={() =>
                            dateWrapRef.current?.querySelector('[class*="_trigger_"]')?.click()
                          }
                        >
                          {pillOverlay}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      theme="neutral"
                      size="sm"
                      surface="light"
                      className={styles.dateNavBtn}
                      onClick={stepDate(1)}
                      disabled={dateNextDisabled}
                      aria-label="Next"
                      leftIcon={<TPLibraryIcon name="chevron-right" size={16} />}
                    />
                  </div>
                )}
                {!isCvtExtHos && filterGroups.length > 0 && (
                  <div className={styles.filterWrap} data-active={activeFilterCount > 0 || undefined}>
                    <Filter
                      groups={filterGroups}
                      value={filters}
                      onChange={setFilters}
                      mode="live"
                      icon={<TPLibraryIcon name="filter-2" family="essential" size={16} />}
                    />
                    {/* How many filters are on, as a soft count tag on the icon —
                        the same grey badge the tabs use — so the icon-only control
                        still says whether it is doing anything. */}
                    {activeFilterCount > 0 && (
                      <span className={styles.filterCount} aria-hidden="true">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                )}
                {/* Overflow menu sits at the very right end of the toolbar, after
                    the filters, rather than up in the tab row: its Queue export
                    follows the date filter, so it belongs with the controls,
                    below the counts they change, and trailing the row as an
                    overflow menu conventionally does. */}
                {showQueueExportMenu && (
                  <div className={styles.toolbarMenu}>
                    <Dropdown
                      className="tpKebabMenu"
                      options={[
                        {
                          value: "export-queue-ics",
                          label: exporting ? "Preparing…" : "Download Queue Calendar",
                        },
                      ]}
                      value={null}
                      onChange={(v) => v === "export-queue-ics" && exportQueueIcs()}
                      chevron={false}
                      variant="seamless"
                      placeholder=""
                      leadingIcon={<KebabIcon size={18} />}
                      ariaLabel="More options"
                      width={280}
                      renderOption={(o) => (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                            <TPLibraryIcon name="download-arrow" family="arrow" size={16} color="var(--tesseract-slate-500)" />
                            <span style={{ fontSize: 14, color: "var(--tesseract-slate-700)", whiteSpace: "nowrap" }}>
                              {o.label}
                            </span>
                            {/* Queue count as a grey soft tag, sitting right beside the
                                label. Always shown, including 0, so the menu always
                                states how many appointments the export covers. Uses
                                slate-200/700 so it stays legible against the slate-100
                                the option row takes on hover. */}
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "var(--tesseract-size-20)",
                                minWidth: "var(--tesseract-size-20)",
                                padding: "0 var(--tesseract-space-2)",
                                borderRadius: "var(--tesseract-radius-full)",
                                background: "var(--tesseract-slate-200)",
                                color: "var(--tesseract-slate-700)",
                                fontSize: "var(--tesseract-text-micro)",
                                fontWeight: "var(--tesseract-weight-semibold)",
                                letterSpacing: "0.02em",
                              }}
                            >
                              {countByTab[TAB_IDS.QUEUE] || 0}
                            </span>
                          </div>
                          {/* What the download is for: a note, not an action. Violet
                              tint keeps it clearly a hint rather than a second row. */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              padding: "8px 10px",
                              borderRadius: "var(--tesseract-radius-8)",
                              background: "var(--tesseract-violet-50)",
                            }}
                          >
                            <TPLibraryIcon
                              name="info-circle"
                              size={14}
                              color="var(--tesseract-violet-600)"
                              style={{ flexShrink: 0, marginTop: 1 }}
                            />
                            <span style={{ fontSize: 12, lineHeight: 1.4, color: "var(--tesseract-violet-700)", whiteSpace: "normal" }}>
                              Download and add this to Google, Apple, Microsoft, or any other calendar on your phone or desktop.
                            </span>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {!isCvtExtHos && (
              <ActiveFilterBar
                filters={filters}
                groups={filterGroups}
                onRemove={removeFilterValue}
                onClearAll={() => setFilters({})}
              />
            )}

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
                  dayTotals={dayTotals}
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
                  /* The page owns the grain now (Day/Week/Month toggle in the toolbar):
                     it drives the grid here and receives internal changes back. */
                  modeOverride={isZydusAccount ? "day" : calendarMode}
                  onModeChange={pickCalendarMode}
                  disableAvailabilityLayer={isZydusAccount}
                  hideModeToggle
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
          isQueueManagementEnabled={isQueueManagementEnabled}
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
          initialCategory={
            bookingCtx?.reschedule?.raw?.pt_id ??
            bookingCtx?.reschedule?.raw?.category_id ??
            bookingCtx?.reschedule?.raw?.pam_category_id ??
            null
          }
          initialCategoryName={
            bookingCtx?.reschedule?.raw?.pt_name || bookingCtx?.reschedule?.specialty || null
          }
          initialRemarks={bookingCtx?.reschedule?.raw?.pam_appointment_remark || ""}
          /* The appointment's own id, so a move is a PUT against it rather
             than a new booking plus a cancel. */
          rescheduleId={bookingCtx?.reschedule?.raw?.pam_id ?? null}
          /* A teleconsult appointment reopens on Tele-Consultation. A free-slot
             chip carries bookMode (clinic vs tele) and locks the switch. Fresh
             bookings without a typed chip still follow the toolbar slot filter. */
          initialMode={
            bookingCtx?.reschedule
              ? bookingCtx.reschedule.hasVideo
                ? "teleconsult"
                : "in-clinic"
              : bookingCtx?.slot?.bookMode === "teleconsult" ||
                bookingCtx?.slot?.bookMode === "in-clinic"
              ? bookingCtx.slot.bookMode
              : (filters.slot || []).length === 1 && filters.slot[0] === "video"
              ? "teleconsult"
              : "in-clinic"
          }
          modeLocked={
            !bookingCtx?.reschedule &&
            (bookingCtx?.slot?.bookMode === "teleconsult" ||
              bookingCtx?.slot?.bookMode === "in-clinic")
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

        <AdmitToIpdModal
          open={Boolean(admitToIpdRecord)}
          patientRecord={admitToIpdRecord}
          onClose={() => setAdmitToIpdRecord(null)}
        />

        <input
          id="appointment-upload-records-input"
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleUploadFileChange}
          accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
          style={{ position: "fixed", left: 0, top: 0, width: 1, height: 1, opacity: 0 }}
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
