import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Checkbox, DatePicker, Drawer, Dropdown, Input, Spin, Table, Tag } from "antd";
import { DownOutlined, FileTextOutlined, FilterOutlined, InfoCircleOutlined, PlusOutlined, PrinterOutlined, SearchOutlined, UpOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { fetchLimsPatients, fetchPatientLabResults } from "./limsApi";
import { summariseResults, latestDateResults } from "./limsHelpers";
import ViewLabParam from "../../components/ViewLabParams";
import LabResultsDrawer from "./LabResultsDrawer";
import AddPatientDrawer from "./AddPatientDrawer";
import LimsAccessBoundary from "./LimsAccessBoundary";
import CreateBill from "../opdBilling/components/createBill/CreateBill";
import RecentBills from "../opdBilling/components/recentBills/RecentBills";
import ExpiredSubModal from "../monetization/components/ExpiredSubModal";
import { fetchBillsByPatient, fetchPatientWalletBalance } from "../opdBilling/service";
import { useOpdBilling } from "../opdBilling/useOpdBilling";
import {
  filterLabResultsByDoctor,
  filterLabResultsForLimsLastVisit,
  getPatientLastVisitDoctorUmId,
  getReceptionistDoctorNameMapFromUrl,
  normalizeLabResultsResponse,
} from "../../utils/labResultsUtils";
import { S_BILLING, S_TATVA_PRACTICE, TRIAL } from "../../utils/constants";
import { getClinic, trackEvent } from "../../utils/utils";
import styles from "./LimsPage.module.css";

const ICON_DOTS = "https://pmdoctorportal.tatvacare.in/tp-icons/straight/bold/settings/3-dots-more.svg";
const { RangePicker } = DatePicker;
const DATE_FORMAT = "YYYY-MM-DD";
const SHOW_DATE_FORMAT = "DD MMM YYYY";

function CdnIcon({ url, size = 16, style, className }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: "currentcolor",
        WebkitMask: `url("${url}") center / contain no-repeat`,
        mask: `url("${url}") center / contain no-repeat`,
        ...style,
      }}
    />
  );
}

function formatAge(p) {
  if (p?.ageYears) return `${p.ageYears}y`;
  if (p?.ageMonths) return `${p.ageMonths}m`;
  if (p?.ageDays) return `${p.ageDays}d`;
  if (p?.pm_age) return `${p.pm_age}y`;
  return "";
}

function patientSubtext(p) {
  const parts = [];
  if (p?.pm_gender) parts.push(p.pm_gender);
  const age = formatAge(p);
  if (age) parts.push(age);
  return parts.join(", ");
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatVisitDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = MONTH_ABBR[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mmm}-${yy}`;
}

/** Receptionist LIMS: only show / summarise results owned by lastVisitDoctor. */
function labResultsForLimsPatient(patient, results, isReceptionist) {
  const flat = normalizeLabResultsResponse({ data: results || [] });
  if (!isReceptionist) return flat;
  return filterLabResultsByDoctor(flat, getPatientLastVisitDoctorUmId(patient));
}

function ActionMenu({ onAction, isFilled, showBilling }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (
        (!triggerRef.current || !triggerRef.current.contains(e.target)) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    }
    function onScroll() { setOpen(false); }
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  let dropdownPos = null;
  if (open && triggerRef.current) {
    const rect = triggerRef.current.getBoundingClientRect();
    dropdownPos = { top: rect.bottom + 4, right: window.innerWidth - rect.right };
  }

  return (
    <div className={styles.actionMenuWrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.dotsBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions"
      >
        <CdnIcon url={ICON_DOTS} size={20} />
      </button>
      {open && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          className={styles.actionDropdown}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <button
            type="button"
            className={styles.actionItem}
            onClick={() => { onAction(isFilled ? "view" : "add"); setOpen(false); }}
          >
            <PlusOutlined />
            <span>{isFilled ? "View / Edit Lab Results" : "Add Lab Results"}</span>
          </button>
          <button
            type="button"
            className={styles.actionItem}
            onClick={() => { onAction("print"); setOpen(false); }}
          >
            <PrinterOutlined />
            <span>Print</span>
          </button>
          {showBilling && (
            <button
              type="button"
              className={styles.actionItem}
              onClick={() => { onAction("createBill"); setOpen(false); }}
            >
              <FileTextOutlined />
              <span>Create Bill</span>
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

let activeInfoPopoverClose = null;

function useInfoPopover() {
  const [showInfo, setShowInfo] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const hideTimerRef = useRef(null);

  const hide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowInfo(false);
    if (activeInfoPopoverClose === hide) {
      activeInfoPopoverClose = null;
    }
  }, []);

  const show = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (activeInfoPopoverClose && activeInfoPopoverClose !== hide) {
      activeInfoPopoverClose();
    }
    activeInfoPopoverClose = hide;
    setShowInfo(true);
  }, [hide]);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      hide();
      hideTimerRef.current = null;
    }, 100);
  }, [hide]);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const toggle = useCallback((e) => {
    e.stopPropagation();
    if (showInfo) hide();
    else show();
  }, [showInfo, show, hide]);

  useEffect(() => {
    if (!showInfo) return;
    function closeOnOutsideClick(e) {
      if (
        (!triggerRef.current || !triggerRef.current.contains(e.target)) &&
        (!popoverRef.current || !popoverRef.current.contains(e.target))
      ) {
        hide();
      }
    }
    function closeOnScroll() { hide(); }
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [showInfo, hide]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (activeInfoPopoverClose === hide) activeInfoPopoverClose = null;
  }, [hide]);

  const popoverPos = showInfo && triggerRef.current
    ? (() => {
      const rect = triggerRef.current.getBoundingClientRect();
      return { top: rect.bottom + 6, left: rect.left };
    })()
    : null;

  return {
    showInfo,
    triggerRef,
    popoverRef,
    popoverPos,
    show,
    hide,
    scheduleHide,
    cancelHide,
    toggle,
  };
}

function InfoPopoverPanel({ popoverRef, popoverPos, title, items, onMouseEnter, onMouseLeave }) {
  if (!popoverPos) return null;
  return createPortal(
    <div
      ref={popoverRef}
      className={styles.testsInfoPopover}
      style={{
        position: "fixed",
        top: popoverPos.top,
        left: popoverPos.left,
        zIndex: 9999,
        fontFamily: '"Inter", sans-serif',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.testsInfoTitle}>{title}</div>
      <ul className={styles.testsInfoList}>
        {items.map((item) => (
          <li key={item.key}>{item.label}</li>
        ))}
      </ul>
    </div>,
    document.body
  );
}

function TestsBadge({ investigations }) {
  const {
    showInfo,
    triggerRef,
    popoverRef,
    popoverPos,
    show,
    scheduleHide,
    cancelHide,
    toggle,
  } = useInfoPopover();

  if (!investigations || investigations.length === 0) return <span className={styles.muted}>-</span>;

  const count = investigations.length;

  return (
    <div ref={triggerRef} className={styles.testsBadgeWrap}>
      <Tag color="purple" className={styles.testsTag}>
        {count} {count === 1 ? "Test" : "Tests"}
        <span
          className={styles.infoIconWrap}
          onClick={toggle}
          onMouseEnter={() => { cancelHide(); show(); }}
          onMouseLeave={scheduleHide}
        >
          <InfoCircleOutlined />
        </span>
      </Tag>
      {showInfo && (
        <InfoPopoverPanel
          popoverRef={popoverRef}
          popoverPos={popoverPos}
          title="Investigations suggested"
          items={investigations.map((inv) => ({ key: inv.name, label: inv.name }))}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </div>
  );
}

function StatusBadge({ summary }) {
  const {
    showInfo,
    triggerRef,
    popoverRef,
    popoverPos,
    show,
    scheduleHide,
    cancelHide,
    toggle,
  } = useInfoPopover();

  const reports = summary?.reports || [];
  const isFilled = summary?.status === "filled";
  const hasReports = reports.length > 0;

  return (
    <div ref={triggerRef} className={styles.testsBadgeWrap}>
      <Tag color={isFilled ? "green" : "orange"} className={styles.testsTag}>
        {isFilled ? "Filled" : "Not filled"}
        {hasReports && (
          <span
            className={styles.infoIconWrap}
            onClick={toggle}
            onMouseEnter={() => { cancelHide(); show(); }}
            onMouseLeave={scheduleHide}
          >
            <InfoCircleOutlined />
          </span>
        )}
      </Tag>
      {showInfo && hasReports && (
        <InfoPopoverPanel
          popoverRef={popoverRef}
          popoverPos={popoverPos}
          title="Reports with data"
          items={reports.map((reportName) => ({ key: reportName, label: reportName }))}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </div>
  );
}

const STATUS_FILTER_OPTIONS = [
  { label: "Filled", value: "filled" },
  { label: "Not filled", value: "empty" },
];

const TEST_FILTER_OPTIONS = [
  { label: "With tests", value: "with_tests" },
  { label: "Without tests", value: "without_tests" },
];

function FilterOptionRow({ label, checked, onToggle }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      className={`${styles.filterOption} ${checked ? styles.filterOptionActive : ""}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Visual only — whole row handles toggle (avoid nested interactive / label capture). */}
      <Checkbox checked={checked} tabIndex={-1} />
      <span className={styles.filterOptionLabel}>{label}</span>
    </div>
  );
}

function FilterContent({ value, onChange, onClear, onDone }) {
  const statusValues = value?.status || [];
  const testValues = value?.tests || [];

  const toggleValue = (key, optionValue) => {
    onChange((prev) => {
      const current = prev?.[key] || [];
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterSection}>
        <div className={styles.filterTitle}>Status</div>
        <div className={styles.filterOptions}>
          {STATUS_FILTER_OPTIONS.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              checked={statusValues.includes(option.value)}
              onToggle={() => toggleValue("status", option.value)}
            />
          ))}
        </div>
      </div>
      <div className={styles.filterSection}>
        <div className={styles.filterTitle}>Last Visit Tests</div>
        <div className={styles.filterOptions}>
          {TEST_FILTER_OPTIONS.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              checked={testValues.includes(option.value)}
              onToggle={() => toggleValue("tests", option.value)}
            />
          ))}
        </div>
      </div>
      <div className={styles.filterFooter}>
        <button type="button" className={styles.clearAllBtn} onClick={onClear}>
          Clear all
        </button>
        <Button type="primary" className={`btn btn-primary3 ${styles.filterDoneBtn}`} onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

function buildBillingPatientData(patient, billResponse, searchParams) {
  const apiPatient = billResponse?.patient;
  return {
    patient_unique_id: patient?.patient_unique_id,
    pm_fullname: apiPatient?.name || patient?.pm_fullname,
    pm_contact_no: apiPatient?.phone || patient?.pm_contact_no,
    pm_pid: patient?.pm_pid,
    tpml_refrence_id: apiPatient?.refId || patient?.tpml_refrence_id,
    pm_salutation: apiPatient?.salutation,
    pm_gender: apiPatient?.gender || patient?.pm_gender,
    address: apiPatient?.address,
    ageYears: apiPatient?.ageYears ?? patient?.ageYears,
    ageMonths: apiPatient?.ageMonths ?? patient?.ageMonths,
    ageDays: apiPatient?.ageDays ?? patient?.ageDays,
    pam_id: patient?.pam_id,
    source: patient?.source ?? searchParams?.get("source"),
    receptionistId: patient?.receptionistId ?? searchParams?.get("receptionistId"),
    receptionistName: patient?.receptionistName ?? searchParams?.get("receptionistName"),
    lastVisitDoctor: patient?.lastVisitDoctor,
  };
}

function getBillingDoctorIds(record, isReceptionist, userId, searchParams) {
  if (!isReceptionist) return [userId];
  const rowDoctorId = record?.lastVisitDoctor?.um_id;
  if (rowDoctorId != null && rowDoctorId !== "") return [rowDoctorId];
  return searchParams.get("um_id")?.split(",")?.filter(Boolean) || [];
}

function withCurrentSearch(path, search) {
  const query = search?.startsWith("?") ? search : search ? `?${search}` : "";
  return `${path}${query}`;
}

function LimsPageMain() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReceptionist = searchParams.has("receptionist");
  const { isOpdBillingAccessable } = useOpdBilling();
  const showBilling = isReceptionist || isOpdBillingAccessable;
  const { profile, userId } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const serviceMappings = planDetails?.service_mappings || [];
  const EMR_planDetails = serviceMappings.find((e) => e.service_name === S_TATVA_PRACTICE);
  const BILLING_planDetails = serviceMappings.find((e) => e.service_name === S_BILLING);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [summaries, setSummaries] = useState({});
  const [lastVisitTests, setLastVisitTests] = useState({});
  const [drawerPatient, setDrawerPatient] = useState(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [viewLabParamsData, setViewLabParamsData] = useState([]);
  const [viewLabParamsLoading, setViewLabParamsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState({ total: 0, totalPages: 0, page: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [pickerModal, setPickerModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState({});
  const [draftStatusFilter, setDraftStatusFilter] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [createBillDrawer, setCreateBillDrawer] = useState(false);
  const [recentBillDrawer, setRecentBillDrawer] = useState(false);
  const [billingPatient, setBillingPatient] = useState(null);
  const [patientBills, setPatientBills] = useState([]);
  const [patientWalletBalance, setPatientWalletBalance] = useState(null);
  const [billData, setBillData] = useState(null);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const tableWrapRef = useRef(null);
  const observer = useRef();
  const listMetaRef = useRef(listMeta);
  const billingSourcePatientRef = useRef(null);
  const [tableMaxH, setTableMaxH] = useState(600);

  const PAGE_SIZE = 25;

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen((open) => !open);
  }, []);

  const checkBillingPurchased = useCallback(async () => {
    if (EMR_planDetails?.plan_tier !== TRIAL && BILLING_planDetails?.plan_tier === TRIAL) {
      showHideSubModal();
      return false;
    }
    return true;
  }, [EMR_planDetails, BILLING_planDetails, showHideSubModal]);

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen((open) => !open);
  }, []);

  const getPatientBills = useCallback(async (record, sortParams = {}) => {
    const sourcePatient = record || billingSourcePatientRef.current;
    if (!sourcePatient?.patient_unique_id) {
      return [];
    }

    if (record) {
      billingSourcePatientRef.current = record;
    }

    const queryParams = {
      doctorIds: getBillingDoctorIds(sourcePatient, isReceptionist, userId, searchParams),
      sortBy: sortParams.field || "date",
      sortOrder: sortParams.order || "asc",
      page: 1,
      limit: 25,
      patientId: sourcePatient.patient_unique_id,
      appointmentId: isReceptionist ? undefined : sourcePatient?.pam_id,
      type: "new",
    };

    if (!isReceptionist) {
      queryParams.startDate = dayjs().format("YYYY-MM-DD");
      queryParams.endDate = dayjs().format("YYYY-MM-DD");
    }

    const response = await fetchBillsByPatient(queryParams);
    const patientData = buildBillingPatientData(sourcePatient, response, searchParams);
    billingSourcePatientRef.current = patientData;
    setBillingPatient(patientData);
    const bills = (response?.bills || []).map((bill) => ({
      ...bill,
      patient: response?.patient,
    }));
    setPatientBills(bills);

    const walletRes = await fetchPatientWalletBalance(sourcePatient.patient_unique_id);
    setPatientWalletBalance(walletRes?.advanceDepositBalance);
    return bills;
  }, [isReceptionist, searchParams, userId]);

  const handleCreateBillDrawer = useCallback(() => {
    setCreateBillDrawer((open) => {
      const nextOpen = !open;
      if (recentBillDrawer && !nextOpen && billingSourcePatientRef.current) {
        getPatientBills(billingSourcePatientRef.current);
      }
      return nextOpen;
    });
    if (createBillDrawer) {
      setBillData(null);
    }
  }, [createBillDrawer, recentBillDrawer, getPatientBills]);

  const handleRecentBillDrawer = useCallback(() => {
    setRecentBillDrawer((open) => !open);
    if (recentBillDrawer) {
      setBillData(null);
    }
  }, [recentBillDrawer]);

  const doctorNameById = useMemo(() => {
    const map = { ...getReceptionistDoctorNameMapFromUrl() };
    patients.forEach((p) => {
      const id = p?.lastVisitDoctor?.um_id;
      const name = p?.lastVisitDoctor?.um_name;
      if (id != null && id !== "" && name) {
        map[String(id)] = name;
      }
    });
    const drawerDoc = drawerPatient?.lastVisitDoctor;
    if (drawerDoc?.um_id != null && drawerDoc?.um_name) {
      map[String(drawerDoc.um_id)] = drawerDoc.um_name;
    }
    return map;
  }, [patients, drawerPatient]);

  const viewOwnerDoctorId = useMemo(
    () => getPatientLastVisitDoctorUmId(drawerPatient),
    [drawerPatient]
  );

  useEffect(() => {
    listMetaRef.current = listMeta;
  }, [listMeta]);

  const loadPatients = useCallback(async (searchTerm, pageNum, append, range = dateRange) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    const params = { search: searchTerm, page: pageNum, limit: PAGE_SIZE };
    if (range?.startDate && range?.endDate) {
      params.startDate = range.startDate;
      params.endDate = range.endDate;
    }
    const res = await fetchLimsPatients(params);
    const incoming = res?.patients || [];
    if (append) {
      setPatients((prev) => [...prev, ...incoming]);
    } else {
      setPatients(incoming);
    }
    setListMeta({
      total: res?.total ?? incoming.length,
      totalPages: res?.totalPages ?? 1,
      page: res?.page ?? pageNum,
    });
    if (pageNum === 1) setLoading(false);
    else setLoadingMore(false);

    // The `/lims` list already returns each patient's lab results and last-visit
    // investigations inline, so we derive the row summary and tests directly
    // instead of firing a follow-up request per patient.
    // Receptionist: summarise only lastVisitDoctor's results (enter on their behalf).
    const summaryMap = {};
    const testMap = {};
    incoming.forEach((p) => {
      const id = p?.patient_unique_id;
      if (!id) return;
      const ownedLabs = labResultsForLimsPatient(p, p.labResults || [], isReceptionist);
      summaryMap[id] = summariseResults(latestDateResults(ownedLabs));
      testMap[id] = (p.investigations || [])
        .map((i) => ({ name: (i.investigation_name || "").trim(), note: i.note || "" }))
        .filter((i) => i.name);
    });
    setSummaries((prev) => ({ ...prev, ...summaryMap }));
    setLastVisitTests((prev) => ({ ...prev, ...testMap }));
  }, [dateRange, isReceptionist]);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange]);

  useEffect(() => {
    const delay = page === 1 && search ? 400 : 0;
    const t = setTimeout(() => {
      loadPatients(search.trim(), page, page > 1);
    }, delay);
    return () => clearTimeout(t);
  }, [search, dateRange, page, loadPatients]);

  useEffect(() => {
    function measure() {
      if (tableWrapRef.current) {
        const top = tableWrapRef.current.getBoundingClientRect().top;
        setTableMaxH(Math.max(300, window.innerHeight - top - 16));
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [loading]);

  const loadMoreData = useCallback(() => {
    setPage((prev) => {
      if (listMetaRef.current.totalPages > prev) return prev + 1;
      return prev;
    });
  }, []);

  const lastPostElementRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMoreData();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, loadMoreData]
  );

  const handlePickerModal = useCallback(() => {
    setPickerModal((open) => !open);
  }, []);

  const disabledDate = useCallback((current) => current && current > dayjs().endOf("day"), []);

  const rangePresets = useMemo(() => {
    // Preset ranges that include future calendar days break with disabledDate
    // (e.g. endOf("month") / endOf("year") after today). Clamp end to today.
    const todayEnd = dayjs().endOf("day");
    const clampToToday = (end) => (end.isAfter(todayEnd) ? todayEnd : end);

    return [
      { label: "Today", value: [dayjs().startOf("day"), todayEnd] },
      {
        label: "Yesterday",
        value: [
          dayjs().subtract(1, "day").startOf("day"),
          dayjs().subtract(1, "day").endOf("day"),
        ],
      },
      {
        label: "Past 7 days",
        value: [dayjs().subtract(6, "day").startOf("day"), todayEnd],
      },
      {
        label: "Past 30 days",
        value: [dayjs().subtract(29, "day").startOf("day"), todayEnd],
      },
      {
        label: "This month",
        value: [dayjs().startOf("month"), clampToToday(dayjs().endOf("month"))],
      },
      {
        label: "Last month",
        value: [
          dayjs().subtract(1, "month").startOf("month"),
          dayjs().subtract(1, "month").endOf("month"),
        ],
      },
      {
        label: "This year",
        value: [dayjs().startOf("year"), clampToToday(dayjs().endOf("year"))],
      },
      {
        label: "Last year",
        value: [
          dayjs().subtract(1, "year").startOf("year"),
          dayjs().subtract(1, "year").endOf("year"),
        ],
      },
    ];
  }, []);

  const onRangeChange = useCallback((dates) => {
    setPage(1);
    if (!dates || !dates[0] || !dates[1]) {
      setDateRange(null);
      return;
    }
    const todayEnd = dayjs().endOf("day");
    const start = dates[0].startOf("day");
    let end = dates[1].endOf("day");
    if (end.isAfter(todayEnd)) end = todayEnd;
    setDateRange({
      startDate: start.format(DATE_FORMAT),
      endDate: end.format(DATE_FORMAT),
    });
  }, []);

  const handleDateFilterCancel = useCallback(() => {
    setDateRange(null);
    setPage(1);
    handlePickerModal();
  }, [handlePickerModal]);

  const dateFilterLabel = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) return "Filter by date";
    return `${dayjs(dateRange.startDate, DATE_FORMAT).format(SHOW_DATE_FORMAT)} - ${dayjs(dateRange.endDate, DATE_FORMAT).format(SHOW_DATE_FORMAT)}`;
  }, [dateRange]);

  const rows = useMemo(() => {
    let list = patients.map((p) => ({
      ...p,
      _summary: summaries[p.patient_unique_id],
      _lastVisitTests: lastVisitTests[p.patient_unique_id] || null,
    }));

    const activeStatuses = statusFilter?.status;
    if (activeStatuses && activeStatuses.length > 0) {
      list = list.filter((r) => {
        const s = r._summary;
        if (!s) return false;
        return activeStatuses.includes(s.status);
      });
    }

    const activeTests = statusFilter?.tests;
    if (activeTests && activeTests.length > 0) {
      list = list.filter((r) => {
        const hasTests = r._lastVisitTests && r._lastVisitTests.length > 0;
        if (activeTests.includes("with_tests") && hasTests) return true;
        if (activeTests.includes("without_tests") && !hasTests) return true;
        return false;
      });
    }

    return list;
  }, [patients, summaries, lastVisitTests, statusFilter]);

  const refreshSummary = useCallback(async (patientId, patient = null) => {
    const results = await fetchPatientLabResults(patientId);
    const owned = labResultsForLimsPatient(patient, results, isReceptionist);
    setSummaries((prev) => ({ ...prev, [patientId]: summariseResults(latestDateResults(owned)) }));
    return results;
  }, [isReceptionist]);

  const closeAddDrawer = useCallback(() => {
    setAddDrawerOpen(false);
    if (!viewDrawerOpen) {
      setDrawerPatient(null);
      setViewLabParamsData([]);
    }
  }, [viewDrawerOpen]);

  const closeViewDrawer = useCallback(() => {
    setViewDrawerOpen(false);
    setViewLabParamsData([]);
    if (!addDrawerOpen) setDrawerPatient(null);
  }, [addDrawerOpen]);

  const switchViewToAdd = useCallback(() => {
    setViewDrawerOpen(false);
    setViewLabParamsData([]);
    setAddDrawerOpen(true);
  }, []);

  const handleLabParamsSaved = useCallback(async () => {
    if (!drawerPatient) return;
    const patientId = drawerPatient.patient_unique_id;
    // Row summary stays scoped to lastVisitDoctor for receptionists;
    // View drawer only shows results on lastVisitDate (if any).
    const allResults = await refreshSummary(patientId, drawerPatient);
    setViewLabParamsData(filterLabResultsForLimsLastVisit(drawerPatient, allResults));
  }, [drawerPatient, refreshSummary]);

  const handleAction = useCallback(async (action, patient) => {
    if (action === "add") {
      setViewDrawerOpen(false);
      setViewLabParamsData([]);
      setDrawerPatient(patient);
      setAddDrawerOpen(true);
    } else if (action === "view") {
      setAddDrawerOpen(false);
      setDrawerPatient(patient);
      setViewLabParamsLoading(true);
      try {
        // LIMS View: only lastVisitDate rows (all doctors that day). Info icon
        // is driven by lastVisitDoctor via ownerDoctorId — not every historical date.
        const data = await fetchPatientLabResults(patient.patient_unique_id);
        const lastVisitResults = filterLabResultsForLimsLastVisit(patient, data);
        if (!lastVisitResults?.length) {
          setViewDrawerOpen(false);
          setAddDrawerOpen(true);
        } else {
          setViewLabParamsData(lastVisitResults);
          setViewDrawerOpen(true);
        }
      } finally {
        setViewLabParamsLoading(false);
      }
    } else if (action === "print") {
      navigate(
        withCurrentSearch(`/lims/print/${patient.patient_unique_id}`, searchParams.toString()),
        { state: { patient } }
      );
    } else if (action === "createBill") {
      billingSourcePatientRef.current = patient;
      const isPurchased = await checkBillingPurchased();
      if (!isPurchased) return;
      const bills = await getPatientBills(patient);
      const clinic = getClinic();
      const rowDoctor = patient?.lastVisitDoctor;
      trackEvent("TP_Billing_CreateBill", {
        patientName: patient.pm_fullname,
        patientId: patient?.patient_unique_id,
        doctorSpeciality: isReceptionist ? rowDoctor?.dp_name : profile?.dp_name,
        doctorId: isReceptionist ? rowDoctor?.um_id : profile?.doctor_unique_id,
        doctorContact: isReceptionist ? rowDoctor?.um_contact : profile?.um_contact,
        source: isReceptionist ? (patient?.source || searchParams.get("source") || "lims") : "lims",
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
        subscriptionStatus: planDetails?.currentPlanStatus,
        receptionistId: searchParams.get("receptionistId"),
        receptionistName: searchParams.get("receptionistName"),
      });
      if (!bills?.length) {
        setCreateBillDrawer(true);
      } else {
        setRecentBillDrawer(true);
      }
    }
  }, [navigate, checkBillingPurchased, getPatientBills, profile, planDetails, isReceptionist, searchParams]);

  const columns = useMemo(
    () => [
      {
        title: "#",
        width: 50,
        render: (_r, _x, i) => <span className={styles.cellText}>{i + 1}</span>,
      },
      {
        title: "Patient Details",
        width: 220,
        render: (r) => (
          <div>
            <div className={styles.patientName}>{r.pm_fullname || "Unknown"}</div>
            <div className={styles.patientSubtext}>{patientSubtext(r) || "-"}</div>
          </div>
        ),
      },
      {
        title: "Contact",
        width: 130,
        render: (r) => <span className={styles.cellText}>{r.pm_contact_no || "-"}</span>,
      },
      {
        title: "Patient ID",
        width: 130,
        render: (r) => <span className={styles.cellText}>{r.tpml_refrence_id || r.pm_pid || "-"}</span>,
      },
      {
        title: "Last Visit",
        width: 130,
        render: (r) => <span className={styles.cellText}>{formatVisitDate(r.lastVisitDate)}</span>,
      },
      {
        title: "Tests",
        width: 170,
        render: (r) => {
          const inv = r._lastVisitTests;
          if (inv === null) return <span className={styles.muted}>...</span>;
          if (!inv || inv.length === 0) return <span className={styles.muted}>-</span>;
          return <TestsBadge investigations={inv} />;
        },
      },
      {
        title: "Status",
        width: 150,
        render: (r) => {
          const s = r._summary;
          if (!s) return <span className={styles.muted}>...</span>;
          return <StatusBadge summary={s} />;
        },
      },
      {
        title: "Action",
        width: 90,
        align: "right",
        render: (r) => (
          <ActionMenu
            onAction={(action) => handleAction(action, r)}
            isFilled={r._summary?.status === "filled"}
            showBilling={showBilling}
          />
        ),
      },
    ],
    [handleAction, showBilling]
  );

  const hasActiveFilter = Boolean(dateRange || statusFilter?.status?.length || statusFilter?.tests?.length);
  const activeStatusFilterCount = (statusFilter?.status?.length || 0) + (statusFilter?.tests?.length || 0);

  const handleFilterOpenChange = useCallback((open) => {
    if (open) setDraftStatusFilter(statusFilter);
    setFilterOpen(open);
  }, [statusFilter]);

  const handleFilterDone = useCallback(() => {
    setStatusFilter(draftStatusFilter);
    setFilterOpen(false);
  }, [draftStatusFilter]);

  const handleFilterClear = useCallback(() => {
    setDraftStatusFilter({});
  }, []);

  return (
    <div className={styles.shell}>
      {/* <div className={styles.limsHeader}>
        <div className={styles.limsHeaderLeft}>
          {!isReceptionist && (
            <>
              <button type="button" className={styles.backButton} onClick={() => navigate("/")}>
                <i className="icon-right" />
              </button>
              <div className={styles.limsHeaderDivider} />
            </>
          )}
          <span className={styles.limsHeaderTitle}>LIMS</span>
        </div>
        <Button type="primary" className="btn btn-primary3 btn-41 px-4" onClick={() => setAddPatientOpen(true)}>
          Add New Patient
        </Button>
      </div> */}

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search by patient name, ID, or mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterWrap}>
            <div className={styles.limsDateWrapper}>
              <button
                type="button"
                className={`${styles.limsDateTrigger} ${dateRange ? styles.limsDateTriggerActive : ""}`}
                onClick={handlePickerModal}
              >
                <span className={styles.limsDateTriggerLabel}>{dateFilterLabel}</span>
                <i className="icon-calendar" />
              </button>
              <div className={styles.limsDatePickerHost}>
                <RangePicker
                  open={pickerModal}
                  disabledDate={disabledDate}
                  presets={rangePresets}
                  format={SHOW_DATE_FORMAT}
                  autoAdjustOverflow
                  onChange={onRangeChange}
                  popupClassName="lims-date-popup"
                  className={styles.limsDateInput}
                  inputReadOnly
                  onOpenChange={() => {}}
                  renderExtraFooter={() => (
                    <div className={styles.limsDateFooter}>
                      <div className={styles.limsDateFooterRange}>
                        {dateRange?.startDate && dateRange?.endDate
                          ? `${dayjs(dateRange.startDate, DATE_FORMAT).format(SHOW_DATE_FORMAT)} - ${dayjs(dateRange.endDate, DATE_FORMAT).format(SHOW_DATE_FORMAT)}`
                          : "Select a date range"}
                      </div>
                      <div className={styles.limsDateFooterActions}>
                        <button
                          type="button"
                          className={styles.limsDateCancelBtn}
                          onClick={handleDateFilterCancel}
                        >
                          Cancel
                        </button>
                        <Button className="px-4" type="primary" onClick={handlePickerModal}>
                          Done
                        </Button>
                      </div>
                    </div>
                  )}
                  value={
                    dateRange?.startDate && dateRange?.endDate
                      ? [
                          dayjs(dateRange.startDate, DATE_FORMAT),
                          dayjs(dateRange.endDate, DATE_FORMAT),
                        ]
                      : null
                  }
                />
              </div>
            </div>
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              open={filterOpen}
              onOpenChange={handleFilterOpenChange}
              overlayClassName={styles.filterDropdownOverlay}
              dropdownRender={() => (
                <FilterContent
                  value={draftStatusFilter}
                  onChange={(updater) => {
                    if (typeof updater === "function") {
                      setDraftStatusFilter((prev) => updater(prev));
                    } else {
                      setDraftStatusFilter(updater);
                    }
                  }}
                  onClear={handleFilterClear}
                  onDone={handleFilterDone}
                />
              )}
            >
              <button
                type="button"
                className={`${styles.filterTrigger} ${(activeStatusFilterCount > 0 || filterOpen) ? styles.filterTriggerActive : ""}`}
              >
                <FilterOutlined className={styles.filterTriggerIcon} />
                <span>
                  Filter
                  {activeStatusFilterCount > 0 ? ` (${activeStatusFilterCount})` : ""}
                </span>
                {filterOpen ? <UpOutlined className={styles.filterTriggerChevron} /> : <DownOutlined className={styles.filterTriggerChevron} />}
              </button>
            </Dropdown>
          </div>
        </div>

        <div
          ref={tableWrapRef}
          className={`appointment-data ${styles.tableWrap}`}
          style={{ maxHeight: tableMaxH }}
        >
          <Table
            columns={columns}
            dataSource={rows}
            rowKey={(r) => r.patient_unique_id}
            pagination={false}
            loading={loading && page === 1}
            scroll={{ x: "max-content" }}
            locale={{
              emptyText: (
                <div className={styles.emptyState}>
                  <SearchOutlined style={{ fontSize: 36 }} />
                  <div className={styles.emptyTitle}>No patients found</div>
                  <div className={styles.emptyDesc}>
                    {search.trim()
                      ? `No results for "${search.trim()}". Try a different name, ID, or mobile number.`
                      : hasActiveFilter
                        ? "No patients match the selected filters. Try adjusting your criteria."
                        : "No patients in the system yet."}
                  </div>
                </div>
              ),
            }}
          />
          {listMeta.totalPages > page && (
            <div ref={lastPostElementRef} className={styles.loadMoreSentinel}>
              <Spin />
            </div>
          )}
        </div>
      </main>

      {viewLabParamsLoading && (
        <div className={styles.drawerLoadingOverlay}>
          <Spin size="large" />
        </div>
      )}

      <LabResultsDrawer
        open={addDrawerOpen}
        patient={drawerPatient}
        onClose={closeAddDrawer}
        onSaved={handleLabParamsSaved}
        isReceptionistSession={isReceptionist}
      />

      {viewDrawerOpen && (
        <Drawer
          closeIcon={false}
          className="modalWidth-700"
          placement="right"
          open={viewDrawerOpen}
          bodyStyle={{ backgroundColor: "white" }}
          onClose={closeViewDrawer}
          width="auto"
          destroyOnClose
        >
          <ViewLabParam
            handleViewLabParamsDrawer={closeViewDrawer}
            labParamsData={viewLabParamsData}
            handleSwitchToAddLabParams={switchViewToAdd}
            ownerDoctorId={viewOwnerDoctorId}
            doctorNameById={doctorNameById}
          />
        </Drawer>
      )}

      <AddPatientDrawer
        open={addPatientOpen}
        onClose={() => setAddPatientOpen(false)}
        onSaved={() => {
          setPage(1);
          loadPatients(search.trim(), 1, false);
        }}
      />

      {createBillDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          bodyStyle={{ backgroundColor: "white" }}
          open={createBillDrawer}
          onClose={showHideBackModal}
          width="100%"
          push={false}
        >
          <CreateBill
            handleCreateBillDrawer={handleCreateBillDrawer}
            isBackModalOpen={isBackModalOpen}
            showHideBackModal={showHideBackModal}
            patientData={billingPatient}
            editBillData={billData && Object.keys(billData).length > 0 ? { ...billData, patient: { ...billData?.patient, patientId: billData?.patientId || billData?.patient?.patientId } } : null}
            setEditedBillData={setBillData}
          />
        </Drawer>
      )}

      {recentBillDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          open={recentBillDrawer}
          onClose={handleRecentBillDrawer}
          width={isReceptionist ? "100%" : "77%"}
          push={false}
        >
          <RecentBills
            fromLims
            handleRecentBillDrawer={handleRecentBillDrawer}
            handleCreateBillDrawer={handleCreateBillDrawer}
            patientBills={patientBills}
            getPatientBills={getPatientBills}
            totalAdvanceBalance={patientWalletBalance}
            patientData={billingPatient}
            billData={billData}
            setBillData={setBillData}
            createBillDrawer={createBillDrawer}
            setCreateBillDrawer={setCreateBillDrawer}
          />
        </Drawer>
      )}

      <ExpiredSubModal
        title={S_BILLING}
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal}
      />
    </div>
  );
}

export default function LimsPage() {
  return (
    <LimsAccessBoundary>
      <LimsPageMain />
    </LimsAccessBoundary>
  );
}
