import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TimePicker } from "antd";
import {
  TesseractThemeProvider,
  Button,
  Badge,
  SectionCard,
  DataTable,
  Dropdown,
  InputBox,
  DatePicker,
  Drawer,
  DrawerContent,
  ConfirmDialog,
  Toast,
  Empty,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";
import "@dhspl-tatvacare/tesseract-ui/styles.css";
import dayjs from "dayjs";
import PageHeroBanner from "../../common/PageHeroBanner/PageHeroBanner";
import { useQueueManagement } from "../chikitsalay/useQueueManagement";
import {
  resolveMyQueueAndCounter,
  listMySchedules,
  saveMySchedule,
  listMyLeaves,
  getAffectedBookingsCount,
  createLeave,
  updateLeave,
  deleteLeave,
  importAvailabilityFromPhp,
} from "./service";
import styles from "./AvailabilityQueueSettings.module.css";

// Displayed Monday-first (matches the old PHP page); values stay 0=Sun..6=Sat
// to match the backend's daysOfWeek encoding.
const DAY_OPTIONS = [
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
  { label: "S", value: 0 },
];

const DATE_FMT = "YYYY-MM-DD";
const TIME_FMT = "HH:mm";

const TYPE_OPTIONS = [
  { value: "LEAVE", label: "Leave" },
  { value: "BREAK", label: "Break" },
];

const sameWindow = (a, b) =>
  a.startTime === b.startTime &&
  a.endTime === b.endTime &&
  [...a.daysOfWeek].sort().join(",") === [...b.daysOfWeek].sort().join(",");

// Tesseract's DatePicker onChange payload shape varies by internal commit
// path — normalise every shape it can hand back into a dayjs instance.
const pickedDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return dayjs(v);
  if (v.date instanceof Date) return dayjs(v.date);
  if (typeof v.date === "string") return dayjs(v.date);
  return null;
};

function DayPills({ value, onChange }) {
  return (
    <div className={styles.dayPills}>
      {DAY_OPTIONS.map((d, i) => {
        const active = value.includes(d.value);
        return (
          <button
            key={i}
            type="button"
            className={`${styles.dayPill} ${active ? styles.dayPillActive : ""}`}
            onClick={() =>
              onChange(active ? value.filter((v) => v !== d.value) : [...value, d.value])
            }
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

// One card per schedule window — a counter can hold several non-overlapping
// windows of the same type (e.g. Mon-Fri mornings + Sat afternoon).
function WeeklyScheduleCard({ index, schedule, scheduleType, counter, video, onSaved, onToast }) {
  const [daysOfWeek, setDaysOfWeek] = useState(schedule.daysOfWeek || []);
  const [startTime, setStartTime] = useState(
    schedule.startTime ? dayjs(schedule.startTime, TIME_FMT) : null
  );
  const [endTime, setEndTime] = useState(
    schedule.endTime ? dayjs(schedule.endTime, TIME_FMT) : null
  );
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!daysOfWeek.length || !startTime || !endTime) {
      onToast({ status: "error", title: "Pick at least one day and a start/end time." });
      return;
    }
    setSaving(true);
    const res = await saveMySchedule(
      counter.id,
      { startTime: startTime.format(TIME_FMT), endTime: endTime.format(TIME_FMT), daysOfWeek },
      schedule.id,
      scheduleType
    ).catch(() => ({ success: false }));
    setSaving(false);
    if (res.success) {
      onToast({ status: "success", title: "Schedule saved." });
      onSaved({
        ...schedule,
        id: res.id,
        daysOfWeek,
        startTime: startTime.format(TIME_FMT),
        endTime: endTime.format(TIME_FMT),
        timeDurationInMinutes: res.timeDurationInMinutes ?? schedule.timeDurationInMinutes,
      });
    } else {
      onToast({ status: "error", title: res.message || "Could not save the schedule. Please try again." });
    }
  };

  return (
    <SectionCard
      className={`${styles.scheduleCard} ${video ? styles.scheduleCardVideo : ""}`}
      title={schedule.id ? `Window ${index + 1}` : "New window"}
      headerActions={
        schedule.timeDurationInMinutes ? (
          <div className={styles.scheduleCardHeaderExtra}>
            <Badge variant="soft" color="neutral" size="sm">
              {schedule.timeDurationInMinutes} min slots
            </Badge>
          </div>
        ) : null
      }
    >
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Days of Week</span>
          <DayPills value={daysOfWeek} onChange={setDaysOfWeek} />
        </div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Start Time</span>
          <TimePicker format={TIME_FMT} value={startTime} onChange={setStartTime} />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>End Time</span>
          <TimePicker format={TIME_FMT} value={endTime} onChange={setEndTime} />
        </div>
        <Button
          variant="solid"
          theme="primary"
          size="md"
          className={styles.primaryCta}
          loading={saving}
          onClick={onSave}
        >
          Save
        </Button>
      </div>
    </SectionCard>
  );
}

function WeeklyScheduleGroup({ title, scheduleType, counter, video, onToast }) {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [importing, setImporting] = useState(false);
  const draftCounter = useRef(0);

  const newDraft = () => ({
    key: `draft-${draftCounter.current++}`,
    id: null,
    daysOfWeek: [],
    startTime: null,
    endTime: null,
    timeDurationInMinutes: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await listMySchedules(counter.id, scheduleType).catch(() => []);
      if (cancelled) return;
      setSchedules(list.length ? list.map((s) => ({ ...s, key: s.id })) : [newDraft()]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter.id, scheduleType]);

  const onSaved = (key, saved) => {
    setSchedules((prev) => prev.map((s) => (s.key === key ? { ...saved, key: saved.id } : s)));
  };

  const onAddSchedule = () => setSchedules((prev) => [...prev, newDraft()]);

  const onImport = async () => {
    setImporting(true);
    const res = await importAvailabilityFromPhp(scheduleType).catch(() => ({ success: false }));
    setImporting(false);

    if (!res.success) {
      onToast({ status: "error", title: res.message || "Could not import from PHP. Please try again." });
      return;
    }
    if (!res.schedules.length) {
      onToast({
        status: "info",
        title: `No existing ${scheduleType === "IN_CLINIC" ? "in-clinic" : "video consult"} availability found in PHP.`,
      });
      return;
    }

    const existing = schedules.filter((s) => s.id);
    const toAdd = res.schedules.filter((imp) => !existing.some((s) => sameWindow(s, imp)));
    if (!toAdd.length) {
      onToast({ status: "info", title: "Everything in PHP is already reflected here." });
      return;
    }
    setSchedules((prev) => [
      ...prev,
      ...toAdd.map((s) => ({
        ...newDraft(),
        daysOfWeek: s.daysOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    ]);
    onToast({
      status: "success",
      title: `Imported ${toAdd.length} window${toAdd.length === 1 ? "" : "s"} from PHP — review below, then Save each.`,
    });
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <Button variant="ghost" theme="neutral" size="sm" loading={importing} onClick={onImport}>
          Import from existing availability
        </Button>
      </div>
      {schedules.map((s, i) => (
        <WeeklyScheduleCard
          key={s.key}
          index={i}
          schedule={s}
          scheduleType={scheduleType}
          counter={counter}
          video={video}
          onSaved={(saved) => onSaved(s.key, saved)}
          onToast={onToast}
        />
      ))}
      <Button
        variant="outline"
        theme="primary"
        size="md"
        loading={loading}
        leftIcon={<TPLibraryIcon name="add" family="essential" size={18} />}
        onClick={onAddSchedule}
      >
        Add Schedule
      </Button>
    </div>
  );
}

const emptyLeaveForm = { type: "LEAVE", startDate: null, endDate: null, timeRange: null, reason: "" };

export default function AvailabilityQueueSettings() {
  const navigate = useNavigate();
  const isQueueManagementEnabled = useQueueManagement();
  const [loading, setLoading] = useState(true);
  const [notProvisioned, setNotProvisioned] = useState(false);
  const [counter, setCounter] = useState(null);

  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leavesCollapsed, setLeavesCollapsed] = useState(false);

  const [leaveModal, setLeaveModal] = useState(null); // { mode: 'add'|'edit', id, ...emptyLeaveForm }
  const [savingLeave, setSavingLeave] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(null); // { mode, id, payload, count }
  const [deleteTarget, setDeleteTarget] = useState(null); // leave row

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      const resolved = await resolveMyQueueAndCounter().catch(() => null);
      if (!resolved) {
        setNotProvisioned(true);
        setLoading(false);
        return;
      }
      setCounter(resolved.counter);

      const leaveList = await listMyLeaves(resolved.counter.id).catch(() => []);
      setLeaves(leaveList);
      setLoading(false);
    })();
  }, []);

  const refreshLeaves = async () => {
    if (!counter) return;
    setLeavesLoading(true);
    const list = await listMyLeaves(counter.id).catch(() => []);
    setLeaves(list);
    setLeavesLoading(false);
  };

  const openAddLeave = () => setLeaveModal({ mode: "add", id: null, ...emptyLeaveForm });
  const openEditLeave = (l) =>
    setLeaveModal({
      mode: "edit",
      id: l.id,
      type: l.type,
      startDate: dayjs(l.startDate, DATE_FMT),
      endDate: dayjs(l.endDate, DATE_FMT),
      timeRange: l.startTime ? [dayjs(l.startTime, TIME_FMT), dayjs(l.endTime, TIME_FMT)] : null,
      reason: l.reason || "",
    });
  const closeLeaveModal = () => setLeaveModal(null);

  const onSubmitLeave = async () => {
    if (!leaveModal.startDate || !leaveModal.endDate) {
      setToast({ status: "error", title: "Pick a start and end date first." });
      return;
    }
    const payload = {
      ...(leaveModal.mode === "add" ? { type: leaveModal.type } : {}),
      startDate: leaveModal.startDate.format(DATE_FMT),
      endDate: leaveModal.endDate.format(DATE_FMT),
      ...(leaveModal.timeRange
        ? { startTime: leaveModal.timeRange[0].format(TIME_FMT), endTime: leaveModal.timeRange[1].format(TIME_FMT) }
        : {}),
      ...(leaveModal.reason.trim() ? { reason: leaveModal.reason.trim() } : {}),
    };

    setSavingLeave(true);
    const count = await getAffectedBookingsCount(counter.id, payload).catch(() => 0);
    setSavingLeave(false);

    if (count > 0) {
      setPendingLeave({ mode: leaveModal.mode, id: leaveModal.id, payload, count });
      return;
    }
    await commitLeave(leaveModal.mode, leaveModal.id, payload);
  };

  const commitLeave = async (mode, id, payload) => {
    setSavingLeave(true);
    const res =
      mode === "edit"
        ? await updateLeave(id, payload).catch(() => ({ success: false }))
        : await createLeave(counter.id, payload).catch(() => ({ success: false }));
    setSavingLeave(false);
    setPendingLeave(null);
    if (res.success) {
      setToast({ status: "success", title: mode === "edit" ? "Updated." : `${payload.type === "BREAK" ? "Break" : "Leave"} added.` });
      closeLeaveModal();
      refreshLeaves();
    } else {
      setToast({ status: "error", title: res.message || "Could not save. Please try again." });
    }
  };

  const onConfirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    const res = await deleteLeave(target.id).catch(() => ({ success: false }));
    if (res.success) {
      setToast({ status: "success", title: "Removed." });
      refreshLeaves();
    } else {
      setToast({ status: "error", title: res.message || "Could not remove. Please try again." });
    }
  };

  const leaveColumns = [
    { id: "no", header: "No.", minWidth: 48, cell: (_row, i) => i + 1 },
    { id: "startDate", header: "Start Date", cell: (row) => row.startDate },
    { id: "endDate", header: "End Date", cell: (row) => row.endDate },
    {
      id: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="soft" color={row.type === "BREAK" ? "warning" : "error"} size="sm">
          {row.type}
        </Badge>
      ),
    },
    { id: "startTime", header: "Start Time", cell: (row) => row.startTime || "-" },
    { id: "endTime", header: "End Time", cell: (row) => row.endTime || "-" },
    { id: "reason", header: "Remarks", cell: (row) => row.reason || "-" },
    {
      id: "action",
      header: "Action",
      cell: (row) => (
        <div className={styles.rowActions}>
          <Button size="sm" variant="ghost" theme="neutral" aria-label="Edit" onClick={() => openEditLeave(row)}>
            <TPLibraryIcon name="edit" family="content-edit" size={16} />
          </Button>
          <Button size="sm" variant="ghost" theme="error" aria-label="Delete" onClick={() => setDeleteTarget(row)}>
            <TPLibraryIcon name="trash" variant="linear" size={16} />
          </Button>
        </div>
      ),
    },
  ];

  if (!isQueueManagementEnabled) {
    navigate("/", { replace: true });
    return null;
  }

  if (loading) {
    return (
      <TesseractThemeProvider colorScheme="light">
        <div className={styles.page}>
          <PageHeroBanner title="My Availability (Queue)" showBackButton onBack={() => navigate(-1)} />
        </div>
      </TesseractThemeProvider>
    );
  }

  if (notProvisioned) {
    return (
      <TesseractThemeProvider colorScheme="light">
        <div className={styles.page}>
          <PageHeroBanner title="My Availability (Queue)" showBackButton onBack={() => navigate(-1)} />
          <div className={styles.emptyStateCard}>
            <Empty
              title="Queue Management isn't set up yet"
              description="Contact support to get a counter provisioned before managing your availability here."
            />
          </div>
        </div>
      </TesseractThemeProvider>
    );
  }

  return (
    <TesseractThemeProvider colorScheme="light">
    <div className={styles.page}>
      <PageHeroBanner
        title="My Availability (Queue)"
        subtitle="Real-time slots for Queue Management appointments — separate from the existing My Availability module."
        showBackButton
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="solid"
            theme="primary"
            size="md"
            className={styles.primaryCta}
            leftIcon={<TPLibraryIcon name="add" family="essential" size={20} />}
            onClick={openAddLeave}
          >
            Add Leave
          </Button>
        }
      />

      <div className={styles.section}>
        <SectionCard
          title="Non Available Days"
          collapsible
          collapsed={leavesCollapsed}
          onCollapsedChange={setLeavesCollapsed}
        >
          <DataTable
            columns={leaveColumns}
            data={leaves}
            rowKey={(row) => row.id}
            loading={leavesLoading}
            emptyState={<Empty title="No leaves or breaks added" description="Add a leave or break to block booking during that time." />}
          />
        </SectionCard>
      </div>

      <WeeklyScheduleGroup
        title="Set Your In-Clinic Consultation Availability"
        scheduleType="IN_CLINIC"
        counter={counter}
        video={false}
        onToast={setToast}
      />
      <WeeklyScheduleGroup
        title="Set Your Video/Telemedicine Consultation Availability"
        scheduleType="VIDEO_CONSULT"
        counter={counter}
        video
        onToast={setToast}
      />

      <Drawer open={!!leaveModal} onOpenChange={(o) => !o && closeLeaveModal()}>
        <DrawerContent
          side="right"
          width="min(480px, 92vw)"
          title={leaveModal?.mode === "edit" ? "Edit leave / break" : "Add leave or break"}
          action={
            <Button
              variant="solid"
              theme="primary"
              size="md"
              className={styles.primaryCta}
              loading={savingLeave}
              onClick={onSubmitLeave}
            >
              {leaveModal?.mode === "edit" ? "Save" : "Add"}
            </Button>
          }
        >
          {leaveModal && (
            <div className={styles.form}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Type</span>
                <Dropdown
                  options={TYPE_OPTIONS}
                  value={leaveModal.type}
                  onChange={leaveModal.mode === "edit" ? undefined : (v) => setLeaveModal((m) => ({ ...m, type: v }))}
                  disabled={leaveModal.mode === "edit"}
                />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Start Date</span>
                  <DatePicker
                    mode="single"
                    size="md"
                    fullWidth
                    commitMode="apply"
                    showFooter
                    value={leaveModal.startDate ? leaveModal.startDate.toDate() : null}
                    onChange={(v) => {
                      const d = pickedDate(v);
                      if (!d) return;
                      setLeaveModal((m) => ({
                        ...m,
                        startDate: d,
                        endDate: m.endDate && m.endDate.isBefore(d, "day") ? d : m.endDate,
                      }));
                    }}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>End Date</span>
                  <DatePicker
                    mode="single"
                    size="md"
                    fullWidth
                    commitMode="apply"
                    showFooter
                    minDate={leaveModal.startDate ? leaveModal.startDate.toDate() : undefined}
                    value={leaveModal.endDate ? leaveModal.endDate.toDate() : null}
                    onChange={(v) => {
                      const d = pickedDate(v);
                      if (d) setLeaveModal((m) => ({ ...m, endDate: d }));
                    }}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Time (optional — blank = full day)</span>
                <TimePicker.RangePicker
                  format={TIME_FMT}
                  value={leaveModal.timeRange}
                  onChange={(v) => setLeaveModal((m) => ({ ...m, timeRange: v }))}
                />
              </div>
              <InputBox
                label="Reason (optional)"
                placeholder="Write a reason"
                value={leaveModal.reason}
                onChange={(e) => setLeaveModal((m) => ({ ...m, reason: e.target.value }))}
                autoGrow
                height={80}
                fullWidth
              />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={!!pendingLeave}
        onOpenChange={(o) => !o && setPendingLeave(null)}
        title="This affects existing bookings"
        description={
          pendingLeave
            ? `${pendingLeave.count} booked appointment${pendingLeave.count === 1 ? "" : "s"} fall in this window. They will not be cancelled automatically — cancel or reschedule them separately. Continue?`
            : ""
        }
        calloutTone="warning"
        primaryLabel="Cancel"
        onPrimary={() => setPendingLeave(null)}
        secondaryLabel={savingLeave ? "Saving…" : "Save anyway"}
        secondaryTone="destructive"
        onSecondary={() => commitLeave(pendingLeave.mode, pendingLeave.id, pendingLeave.payload)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remove this entry?"
        description={
          deleteTarget
            ? `This ${deleteTarget.type === "BREAK" ? "break" : "leave"} on ${
                deleteTarget.startDate === deleteTarget.endDate
                  ? deleteTarget.startDate
                  : `${deleteTarget.startDate} – ${deleteTarget.endDate}`
              } will be removed.`
            : ""
        }
        calloutTone="error"
        primaryLabel="Keep"
        onPrimary={() => setDeleteTarget(null)}
        secondaryLabel="Remove"
        secondaryTone="destructive"
        onSecondary={onConfirmDelete}
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
