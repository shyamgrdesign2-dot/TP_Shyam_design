import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import {
  TAB_IDS,
  SLOT_FILTER_GROUP,
} from "../appointment-listing/data/appointmentsConfig";
import { readPreference, writePreference } from "../appointment-listing/data/viewPreferences";
import AppointmentListView from "../appointment-listing/components/AppointmentListView";
import AppointmentCalendarView from "../appointment-listing/components/AppointmentCalendarView";
import BookAppointmentDrawer from "../appointment-listing/components/BookAppointmentDrawer";
import useReceptionistAppointments from "./data/useReceptionistAppointments";
import { cancelAppointment, getCaseTypes } from "../../api/services/receptionistAppointmentApi";
import { SelectedDoctorProvider, useSelectedDoctor } from "./context/SelectedDoctorContext";
import styles from "../appointment-listing/AppointmentListingPage.module.css";

const RECEPTIONIST_TAB_META = {
  [TAB_IDS.ALL]: { id: TAB_IDS.ALL, label: "All", icon: "document-favorite", iconFamily: "content-edit" },
  [TAB_IDS.QUEUE]: { id: TAB_IDS.QUEUE, label: "Queue", icon: "timer", iconFamily: "time" },
  [TAB_IDS.FINISHED]: { id: TAB_IDS.FINISHED, label: "Finished", icon: "clipboard-tick" },
  [TAB_IDS.CANCELLED]: { id: TAB_IDS.CANCELLED, label: "Cancelled", icon: "clipboard-close" },
};

const LIST_TABS = [TAB_IDS.QUEUE, TAB_IDS.FINISHED, TAB_IDS.CANCELLED].map((id) => RECEPTIONIST_TAB_META[id]);
const CALENDAR_TABS = [TAB_IDS.ALL, TAB_IDS.QUEUE, TAB_IDS.FINISHED, TAB_IDS.CANCELLED].map(
  (id) => RECEPTIONIST_TAB_META[id]
);

function startOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatPillDate(d) {
  const m = moment(d);
  if (m.isSame(moment(), "day")) return "Today";
  if (m.isSame(moment().subtract(1, "day"), "day")) return "Yesterday";
  return m.format("D MMM YYYY");
}

function formatPillRange(r) {
  if (!r?.start) return "";
  const s = startOfDayLocal(r.start);
  const e = startOfDayLocal(r.end || r.start);
  if (s.getTime() === e.getTime()) return formatPillDate(s);
  const sMon = s.toLocaleDateString("en-US", { month: "short" });
  const eMon = e.toLocaleDateString("en-US", { month: "short" });
  return sMon === eMon
    ? `${s.getDate()} ${sMon} ${s.getFullYear()} – ${e.getDate()} ${eMon} ${e.getFullYear()}`
    : `${s.getDate()} ${sMon} ${s.getFullYear()} – ${e.getDate()} ${eMon} ${e.getFullYear()}`;
}

function pickedDate(v) {
  if (!v) return null;
  if (v instanceof Date) return startOfDayLocal(v);
  if (v.start instanceof Date) return startOfDayLocal(v.start);
  if (v.date instanceof Date) return startOfDayLocal(v.date);
  return null;
}

function TabBar({ tabs, activeTab, countByTab, onSelect }) {
  return (
    <Tabs value={activeTab} onValueChange={onSelect}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
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

function ReceptionistAppointmentListingInner() {
  const { doctors, loading: doctorsLoading, selectedDoctorId, selectedDoctor, setSelectedDoctorId } =
    useSelectedDoctor();

  const [view, setView] = useState(() => readPreference("receptionistView", "list"));
  const [calendarMode, setCalendarMode] = useState(() => {
    const saved = readPreference("receptionistCalendarMode", "day");
    return saved === "week" ? "week" : "day";
  });
  const [activeTab, setActiveTab] = useState(() =>
    readPreference("receptionistView", "list") === "calendar" ? TAB_IDS.ALL : TAB_IDS.QUEUE
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [dateRange, setDateRange] = useState(() => {
    const today = startOfDayLocal(new Date());
    return { start: today, end: today };
  });
  const [bookingCtx, setBookingCtx] = useState(null);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [caseTypes, setCaseTypes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const isCalendar = view === "calendar";
  const tabsForView = isCalendar ? CALENDAR_TABS : LIST_TABS;
  const renderCalendar = isCalendar;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    getCaseTypes()
      .then((res) => setCaseTypes(res?.status ? res.data?.case_type || [] : []))
      .catch(() => setCaseTypes([]));
  }, [selectedDoctorId]);

  const visitTypeCsv = (filters.visitType || []).join(",");
  const allowFutureDates =
    activeTab === TAB_IDS.QUEUE || activeTab === TAB_IDS.ALL;

  const { rows: liveRows, countByTab, dayTotals, loading, loadingMore, hasMore, error, loadMore, refetch } =
    useReceptionistAppointments({
      doctorId: selectedDoctorId,
      tabId: activeTab,
      dateRange: dateRange || { start: new Date(), end: new Date() },
      query: debouncedQuery,
      visitTypeCsv,
      fetchAllPages: renderCalendar,
      calendarMode: renderCalendar ? calendarMode : "day",
    });

  // Slot (In-Clinic / Teleconsultation) is client-side — same as doctor listing.
  const rows = useMemo(() => {
    const slotSel = filters.slot || [];
    if (slotSel.length !== 1) return liveRows;
    const wantVideo = slotSel[0] === "video";
    return liveRows.filter((row) => row.hasVideo === wantVideo);
  }, [liveRows, filters.slot]);

  const changeView = (next) => {
    if (next === view) return;
    setView(next);
    writePreference("receptionistView", next);
    if (next === "calendar") {
      setDateRange((r) => (r?.start ? { start: r.start, end: r.start } : { start: new Date(), end: new Date() }));
      setActiveTab(TAB_IDS.ALL);
    } else if (activeTab === TAB_IDS.ALL) {
      setActiveTab(TAB_IDS.QUEUE);
    }
  };

  const dismissToast = () => {
    setToastLeaving(true);
    setTimeout(() => {
      setToast(null);
      setToastLeaving(false);
    }, 180);
  };

  const filterGroups = useMemo(
    () => [
      {
        id: "visitType",
        label: "Visit Type",
        options: caseTypes.map((t) => ({ value: String(t.toct_id), label: t.toct_type })),
      },
      SLOT_FILTER_GROUP,
    ],
    [caseTypes]
  );

  const activeFilterCount = Object.values(filters).reduce((n, v) => n + (v || []).length, 0);
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;

  const removeFilterValue = (groupId, value) => {
    setFilters((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((v) => v !== value),
    }));
  };

  const onRowAction = useCallback((action, row) => {
    switch (action) {
      case "cancel-appointment":
        setCancelTarget(row);
        break;
      case "reschedule":
        setBookingCtx({ slot: null, reschedule: row });
        break;
      default:
        break;
    }
  }, []);

  const confirmCancelAppointment = async () => {
    const rec = cancelTarget?.raw;
    if (!rec || cancelling) return;
    setCancelling(true);
    try {
      const res = await cancelAppointment({
        pam_id: rec.pam_id,
        patient_unique_id: rec.patient_unique_id,
        pm_id: rec.pm_id,
        pm_pid: rec.pm_pid,
      });
      if (res?.status) {
        setToast({ status: "success", title: `${cancelTarget.name}'s appointment was cancelled.` });
        setCancelTarget(null);
        refetch();
        setSlotsVersion((v) => v + 1);
      } else {
        setToast({ status: "error", title: res?.message || "Could not cancel the appointment." });
      }
    } catch (e) {
      const status = e?.response?.status;
      setToast({
        status: "error",
        title:
          status === 403
            ? "You do not have permission to cancel this appointment for the selected doctor."
            : "Could not reach the server. The appointment was not cancelled, so try again in a moment.",
      });
    } finally {
      setCancelling(false);
    }
  };

  const refreshQueue = async () => {
    setRefreshing(true);
    try {
      await refetch();
      setSlotsVersion((v) => v + 1);
    } finally {
      setRefreshing(false);
    }
  };

  const doctorOptions = doctors.map((d) => ({
    value: String(d.um_id),
    label: d.um_name || `Doctor ${d.um_id}`,
  }));

  const bannerTitle = selectedDoctor?.um_name
    ? `Appointments — ${selectedDoctor.um_name}`
    : "Appointments";

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
              <SegmentedControl
                className={styles.viewSeg}
                size="md"
                variant="block"
                options={[
                  {
                    value: "list",
                    icon: (
                      <TPLibraryIcon
                        name="row-vertical"
                        variant={view === "list" ? "bulk" : "linear"}
                        size={18}
                      />
                    ),
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
              <Button
                variant="outline"
                theme="primary"
                surface="dark"
                className={styles.addApptBtn}
                leftIcon={<TPLibraryIcon name="add" family="essential" size={20} />}
                disabled={!selectedDoctorId}
                onClick={() => setBookingCtx({ slot: null })}
              >
                Book Appointment
              </Button>
            </>
          }
        />

        <div className={styles.cardWrap}>
          <div className={styles.card}>
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                {doctorOptions.length > 0 && (
                  <Dropdown
                    options={doctorOptions}
                    value={selectedDoctorId}
                    onChange={(v) => {
                      const id = v && typeof v === "object" ? v.value : v;
                      if (id) setSelectedDoctorId(id);
                    }}
                    placeholder={doctorsLoading ? "Loading doctors…" : "Select doctor"}
                    width={220}
                    disabled={doctorsLoading}
                  />
                )}
                <TabBar
                  tabs={tabsForView}
                  activeTab={activeTab}
                  countByTab={countByTab}
                  onSelect={(tab) => {
                    setActiveTab(tab);
                    setRescheduleFor(null);
                  }}
                />
              </div>
              <div className={styles.toolbarRight}>
                <div className={`${styles.searchLabel} ${styles.receptionistSearch}`}>
                  <InputBox
                    fullWidth
                    clearable
                    placeholder="Search patient"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    leftIcon={<TPLibraryIcon name="search-normal" size={18} />}
                  />
                </div>
                <DateRangePicker
                  mode={renderCalendar ? "single" : "range"}
                  months={1}
                  showPresets={!renderCalendar}
                  commitMode={renderCalendar ? "apply" : "outside-click"}
                  value={renderCalendar ? dateRange?.start ?? null : dateRange}
                  placeholder="Today"
                  onChange={(v) => {
                    if (renderCalendar) {
                      const d = pickedDate(v) || (v?.start ? startOfDayLocal(v.start) : null);
                      if (d) setDateRange({ start: d, end: d });
                      return;
                    }
                    // List view: keep a real range (do not collapse start/end to one day).
                    const start = v?.start ?? v?.range?.start ?? null;
                    const end = v?.end ?? v?.range?.end ?? start;
                    if (!start && !end) {
                      const today = startOfDayLocal(new Date());
                      setDateRange({ start: today, end: today });
                      return;
                    }
                    setDateRange({
                      start: startOfDayLocal(start || end),
                      end: startOfDayLocal(end || start),
                    });
                  }}
                  allowFutureDates={allowFutureDates}
                  formatDate={(d) => {
                    if (renderCalendar) {
                      const day = d instanceof Date ? d : d?.start || d?.date;
                      return formatPillDate(day || new Date());
                    }
                    if (dateRange?.start) return formatPillRange(dateRange);
                    const day = d instanceof Date ? d : d?.start || d?.date;
                    return formatPillDate(day || new Date());
                  }}
                />
                <div className={styles.filterWrap} data-active={activeFilterCount > 0 || undefined}>
                  <Filter groups={filterGroups} value={filters} onChange={setFilters} />
                  {activeFilterCount > 0 && (
                    <span className={styles.filterCount}>{activeFilterCount}</span>
                  )}
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className={styles.activeFilterBar}>
                <span className={styles.activeFilterLabel}>Filter: {activeFilterCount}</span>
                {filterGroups.flatMap((group) =>
                  (filters[group.id] || []).map((value) => (
                    <Chip
                      key={`${group.id}:${value}`}
                      label={`${group.label}: ${group.options.find((o) => o.value === value)?.label ?? value}`}
                      color="primary"
                      variant="soft"
                      size="md"
                      onDelete={() => removeFilterValue(group.id, value)}
                    />
                  ))
                )}
                <button type="button" className={styles.activeFilterClear} onClick={() => setFilters({})}>
                  Clear all
                </button>
              </div>
            )}

            <div className={styles.body} data-view={renderCalendar ? "calendar" : "list"}>
              {!renderCalendar ? (
                <AppointmentListView
                  tabId={activeTab}
                  rows={rows}
                  loading={loading || doctorsLoading}
                  loadingMore={loadingMore}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  error={error}
                  onRetry={refetch}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={() => {
                    setQuery("");
                    setFilters({});
                  }}
                  onRowAction={onRowAction}
                  onAddAppointment={() => setBookingCtx({ slot: null })}
                  receptionistMode
                />
              ) : (
                <AppointmentCalendarView
                  rows={rows}
                  tabId={activeTab}
                  dayTotals={dayTotals}
                  onRowAction={onRowAction}
                  onSlotPick={(slot) =>
                    setBookingCtx(rescheduleFor ? { reschedule: rescheduleFor, seed: slot } : { slot })
                  }
                  onEventDrop={(row, slot) =>
                    slot
                      ? setBookingCtx({ reschedule: row, seed: slot })
                      : setToast({ status: "warning", title: "That time is not an available slot." })
                  }
                  rescheduleFor={rescheduleFor}
                  onStartMove={(row) => setRescheduleFor(row)}
                  onRefresh={refreshQueue}
                  refreshing={refreshing}
                  onWindowLabelChange={() => {}}
                  onCancelReschedule={() => setRescheduleFor(null)}
                  slotFilter={(filters.slot || []).length === 1 ? filters.slot[0] : null}
                  allowFutureDates={allowFutureDates}
                  dateRange={dateRange || { start: new Date(), end: new Date() }}
                  onAnchorChange={(d) => setDateRange({ start: d, end: d })}
                  onSlotUnavailable={setToast}
                  onDateChange={(v) => {
                    const d = pickedDate(v);
                    setDateRange(d ? { start: d, end: d } : null);
                  }}
                  slotsVersion={slotsVersion}
                  allowBook
                  modeOverride={calendarMode}
                  onModeChange={(m) => {
                    if (m === "day" || m === "week") {
                      setCalendarMode(m);
                      writePreference("receptionistCalendarMode", m);
                    }
                  }}
                  hideModeToggle={false}
                  doctorId={selectedDoctorId}
                  receptionistMode
                />
              )}
            </div>
          </div>
        </div>

        <BookAppointmentDrawer
          open={!!bookingCtx}
          onOpenChange={(o) => !o && setBookingCtx(null)}
          slot={bookingCtx?.slot}
          doctorName={
            selectedDoctor?.um_name
              ? `Dr ${selectedDoctor.um_name}`.replace(/^Dr\s+Dr/i, "Dr")
              : "Doctor"
          }
          doctorId={selectedDoctorId}
          receptionistMode
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
          initialCategory={
            bookingCtx?.reschedule?.raw?.pt_id ??
            bookingCtx?.reschedule?.raw?.category_id ??
            bookingCtx?.reschedule?.raw?.pam_category_id ??
            null
          }
          initialCategoryName={bookingCtx?.reschedule?.raw?.pt_name || bookingCtx?.reschedule?.specialty || null}
          initialRemarks={bookingCtx?.reschedule?.raw?.pam_appointment_remark || ""}
          rescheduleId={bookingCtx?.reschedule?.raw?.pam_id ?? null}
          initialMode={
            bookingCtx?.reschedule
              ? bookingCtx.reschedule.hasVideo
                ? "teleconsult"
                : "in-clinic"
              : bookingCtx?.slot?.bookMode === "teleconsult" || bookingCtx?.slot?.bookMode === "in-clinic"
              ? bookingCtx.slot.bookMode
              : (filters.slot || []).length === 1 && filters.slot[0] === "video"
              ? "teleconsult"
              : "in-clinic"
          }
          modeLocked={
            !bookingCtx?.reschedule &&
            (bookingCtx?.slot?.bookMode === "teleconsult" || bookingCtx?.slot?.bookMode === "in-clinic")
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
          onBooked={() => {
            refetch();
            setSlotsVersion((v) => v + 1);
            setRescheduleFor(null);
          }}
        />

        <ConfirmDialog
          open={!!cancelTarget}
          onOpenChange={(o) => !o && setCancelTarget(null)}
          title="Cancel appointment?"
          description={
            cancelTarget
              ? `Cancel ${cancelTarget.name}'s appointment on ${cancelTarget.slotDate} at ${cancelTarget.slotTime}?`
              : ""
          }
          calloutTone="error"
          primaryLabel="Keep Appointment"
          onPrimary={() => setCancelTarget(null)}
          secondaryLabel={cancelling ? "Cancelling…" : "Cancel Appointment"}
          secondaryTone="destructive"
          onSecondary={confirmCancelAppointment}
        />

        {toast && (
          <Toast
            status={toast.status}
            title={toast.title}
            leaving={toastLeaving}
            onDismiss={dismissToast}
          />
        )}
      </div>
    </TesseractThemeProvider>
  );
}

export default function ReceptionistAppointmentListingPage() {
  return (
    <SelectedDoctorProvider>
      <ReceptionistAppointmentListingInner />
    </SelectedDoctorProvider>
  );
}
