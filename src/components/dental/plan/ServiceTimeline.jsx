/**
 * ServiceTimeline — Merged visit timeline for a single treatment service.
 * Renders upcoming / completed / cancelled appointment, sitting, and direct
 * consultation entries in chronological order.
 *
 * Exports: ServiceTimeline
 */
import { useState, Children } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRotateLeft,
  Add,
  Edit2,
  Trash,
  Calendar2,
  DocumentText,
} from "iconsax-reactjs";
import { Ban, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { usePlanContext } from "./plan-context";
import { deleteQvr, updateQvr } from "../../../redux/dentalQvrSlice";
import { formatQvrVisitTypeLabel } from "../../../utils/dentalApiMappers";
import { buildConsultationRxUrl, PlanEmptyIcon } from "./plan-shared";
import { TPSplitButton } from "../tp-ui/button-system";
import {
  ConsultationPreviewCard,
  QuickVisitRxPreview,
  renderConsultSummarySnippetBody,
} from "./ServicePreviewModals";
import styles from "./InProgressTab.module.scss";

// ─── Local helpers ──────────────────────────────────────────

const cx = (...classes) => classes.filter(Boolean).join(" ");

/** View Rx — icon-text button without outer border. */
const VIEW_RX_SECONDARY_CLASS = styles.viewRxBtn;
/** Timeline TypeRx split — primary segment at least 120px wide. */
const TIMELINE_TYPERX_TRACK_CLASS = styles.timelineTrack;
/** Timeline row ⋮ — compact icon button (print still hides it). */
const TIMELINE_MENU_TRIGGER_CLASS = styles.timelineMenuTrigger;

const dropdownContentClass = styles.dropdownContent;
const dropdownItemClass = styles.dropdownItem;

const APPT_MONTH_SHORT = {
  jan: "Jan", january: "Jan",
  feb: "Feb", february: "Feb",
  mar: "Mar", march: "Mar",
  apr: "Apr", april: "Apr",
  may: "May",
  jun: "Jun", june: "Jun",
  jul: "Jul", july: "Jul",
  aug: "Aug", august: "Aug",
  sep: "Sep", sept: "Sep", september: "Sep",
  oct: "Oct", october: "Oct",
  nov: "Nov", november: "Nov",
  dec: "Dec", december: "Dec",
};

const APPT_MONTH_PARSE = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const CASE_TYPE_LABELS = {
  consultation: "Consultation",
  procedure: "Procedure",
  review: "Review / Check-up",
  emergency: "Emergency",
  "follow-up": "Follow-up",
};

/** e.g. "14 April 2026" / "14 Apr 2026" → "14 Apr 2026" */
function formatAppointmentDateLong(dateStr) {
  const s = String(dateStr ?? "").trim();
  const m = /^(\d{1,2})\s+(\w+)\s+(\d{4})$/.exec(s);
  if (!m) return s;
  const mon = APPT_MONTH_SHORT[m[2].toLowerCase()] ?? m[2];
  return `${m[1]} ${mon} ${m[3]}`;
}

function parseTimeOffsetMs(timeRaw) {
  const t = String(timeRaw ?? "").trim();
  if (!t || t === "—") return 0;
  const ampm = /\b(am|pm)\b/i.exec(t);
  const hm = /(\d{1,2})\s*:\s*(\d{2})/.exec(t);
  if (!hm) return 0;
  let h = parseInt(hm[1], 10);
  const min = parseInt(hm[2], 10);
  if (ampm) {
    const ap = ampm[1].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  }
  return (h * 60 + min) * 60 * 1000;
}

function parseApptSortMs(dateStr, timeStr) {
  const s = String(dateStr ?? "").trim();
  const m = /^(\d{1,2})\s+(\w+)\s+(\d{4})$/.exec(s);
  if (!m) return 0;
  const day = parseInt(m[1], 10);
  const mon = APPT_MONTH_PARSE[m[2]] ?? 0;
  const y = parseInt(m[3], 10);
  const base = new Date(y, mon, day).getTime();
  return base + parseTimeOffsetMs(timeStr);
}

function parseIsoMs(iso) {
  const n = Date.parse(String(iso ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function parseSittingSortMs(sit) {
  if (sit?.createdAt) {
    const fromCreatedAt = parseIsoMs(sit.createdAt);
    if (fromCreatedAt) return fromCreatedAt;
  }
  return parseIsoMs(sit?.date);
}

/**
 * Merged visit timeline: upcoming (booked, no Rx yet) → completed
 * (Rx saved or direct visit) → cancelled.
 */
function buildVisitTimelineEntries(service) {
  const appointmentItems = service.appointments ?? [];
  const consultationItems = service.consultations ?? [];
  const sittingItems = service.sittings ?? [];
  const appointmentIdSet = new Set(appointmentItems.map((a) => a.id));
  const raw = [];
  for (const appt of appointmentItems) {
    const linkedConsultations = consultationItems.filter(
      (c) => c.appointmentId === appt.id
    );
    raw.push({
      kind: "appointment",
      appt,
      linkedConsultations,
      sortMs: parseApptSortMs(appt.date, appt.time),
    });
  }
  for (const c of consultationItems) {
    if (c.appointmentId && appointmentIdSet.has(c.appointmentId)) continue;
    raw.push({
      kind: "direct",
      consultation: c,
      linkedConsultations: [],
      sortMs: parseIsoMs(c.endedAt),
    });
  }
  for (const sit of sittingItems) {
    raw.push({
      kind: "sitting",
      sitting: sit,
      linkedConsultations: [],
      sortMs: parseSittingSortMs(sit),
    });
  }
  const upcoming = [];
  const completed = [];
  const cancelled = [];
  for (const e of raw) {
    if (e.kind === "appointment" && e.appt.status === "cancelled") {
      cancelled.push(e);
      continue;
    }
    if (e.kind === "appointment" && e.linkedConsultations.length > 0) {
      completed.push(e);
      continue;
    }
    if (e.kind === "direct") {
      completed.push(e);
      continue;
    }
    if (e.kind === "sitting") {
      const sitSt = e.sitting.status ?? "completed";
      if (sitSt === "cancelled") { cancelled.push(e); continue; }
      if (sitSt === "scheduled") { upcoming.push(e); continue; }
      completed.push(e);
      continue;
    }
    upcoming.push(e);
  }
  upcoming.sort((a, b) => (a.sortMs || 0) - (b.sortMs || 0));
  completed.sort((a, b) => (b.sortMs || 0) - (a.sortMs || 0));
  cancelled.sort((a, b) => (b.sortMs || 0) - (a.sortMs || 0));
  return [...upcoming, ...completed, ...cancelled];
}

// ─── Small presentation helpers ────────────────────────────

function visitBadge(kind) {
  if (kind === "cancelled") {
    return (
      <span className={`${styles.visitBadge} ${styles.visitBadgeCancelled}`}>
        Cancelled
      </span>
    );
  }
  if (kind === "completed") {
    return (
      <span className={`${styles.visitBadge} ${styles.visitBadgeCompleted}`}>
        Completed
      </span>
    );
  }
  return (
    <span className={`${styles.visitBadge} ${styles.visitBadgeUpcoming}`}>
      Upcoming
    </span>
  );
}

function getVisitRowSurfaceStyle(isCancelled) {
  if (isCancelled) {
    return {
      border: "1px solid transparent",
      borderRadius: "16px",
      backgroundImage:
        "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(253,224,215,0.75) 100%), " +
        "linear-gradient(180deg, rgba(193,66,28,0.10) 0%, rgba(193,66,28,0.02) 30%, rgba(193,66,28,0) 50%, rgba(193,66,28,0.02) 70%, rgba(193,66,28,0.10) 100%)",
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
    };
  }
  return {
    border: "1px solid transparent",
    borderRadius: "16px",
    backgroundImage:
      "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(242,239,250,0.7) 100%), " +
      "linear-gradient(180deg, rgba(88,28,135,0.09) 0%, rgba(88,28,135,0.02) 30%, rgba(88,28,135,0) 50%, rgba(88,28,135,0.02) 70%, rgba(88,28,135,0.09) 100%)",
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box",
  };
}

/** Visit-row avatar (intentionally hidden to match current UI requirements). */
function VisitDoctorAvatar() {
  return null;
}

/** Timeline dot with centered inner core and larger visual weight. */
function VisitTimelineDot({ variant = "default" }) {
  const isCancelled = variant === "cancelled";
  return (
    <span
      aria-hidden={true}
      className={`${styles.timelineDot} ${
        isCancelled ? styles.cancelled : styles.default
      }`}
    >
      <span
        className={`${styles.timelineDotInner} ${
          isCancelled ? styles.cancelled : styles.default
        }`}
      />
    </span>
  );
}

/** Inline consultation summary surface. */
function ConsultationSummarySurface({ children, className = "" }) {
  const parts = Children.toArray(children);
  const summary = parts[0];
  const actions = parts.slice(1);
  return (
    <div className={`${styles.consultationSummary} ${className}`}>
      <span className={styles.label}>Consultation summary:</span>{" "}
      <span className={styles.text}>{summary}</span>
      {actions.length ? (
        <div className={styles.actions}>{actions}</div>
      ) : null}
    </div>
  );
}

function resolveSittingDoctorName(sitting, { userId, profile }) {
  if (String(sitting?.doctor ?? "").trim()) return sitting.doctor;
  const sittingDoctorId = sitting?.doctorId;
  const loggedInId = userId || profile?.doctor_unique_id;
  if (
    sittingDoctorId &&
    loggedInId &&
    String(sittingDoctorId) === String(loggedInId)
  ) {
    const name = profile?.um_name || profile?.doctor_name;
    if (name) return name.startsWith("Dr.") ? name : `Dr. ${name}`;
  }
  return "Quick visit";
}

// ─── ServiceTimeline ────────────────────────────────────────

/**
 * Renders the merged visit timeline for a single service.
 * Includes appointment rows, sitting rows, and direct consultation rows.
 * Manages its own consultation / sitting preview ID state.
 *
 * @param {{ service: object, plan: object,
 *   onOpenCancelDialog: (appt: object) => void }} props
 */
export function ServiceTimeline({ service, plan, onOpenCancelDialog }) {
  const dispatch = useDispatch();
  const { userId, profile } = useSelector((state) => state.doctors);
  const { updateService, openDrawer, patientId, embedInPatientShell, refetchPlans } =
    usePlanContext();
  const [consultPreviewId, setConsultPreviewId] = useState(null);
  const [sittingPreviewId, setSittingPreviewId] = useState(null);

  const syncPlansAfterQvr = async (mutation) => {
    await mutation.unwrap();
    await refetchPlans();
  };

  const handleDeleteSitting = (sittingId) => {
    if (!patientId || !sittingId) return;
    syncPlansAfterQvr(
      dispatch(
        deleteQvr({
          patientId,
          planId: plan.id,
          serviceId: service.id,
          qvrId: sittingId,
        }),
      ),
    ).catch(() => {});
  };

  const appointmentItems = service.appointments ?? [];
  const timelineEntries = buildVisitTimelineEntries(service);

  if (timelineEntries.length === 0) {
    return (
      <div className={styles.emptyTimeline}>
        <PlanEmptyIcon size={96} />
        <p className={styles.emptyTitle}>No visits recorded yet</p>
        <p className={styles.emptyDesc}>
          Add a quick visit report to start tracking this service.
        </p>
        <div className={styles.emptyActionsRow}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDrawer({ type: "add-sitting", serviceId: service.id });
            }}
            className={styles.emptyAddBtn}
          >
            <Add size={18} variant="Linear" className={styles.whiteIcon} />
            Add Quick Visit Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.minWidthZero}>
      {timelineEntries.map((entry, idx) => {
        const isLast = idx === timelineEntries.length - 1;

        // ── Appointment entry ───────────────────────────────
        if (entry.kind === "appointment") {
          const appt = entry.appt;
          const isCancelled = appt.status === "cancelled";
          const linkedConsultations = entry.linkedConsultations;
          const hasVisitNotes = !isCancelled && linkedConsultations.length > 0;
          const primaryConsult = linkedConsultations[0];
          const apptRxHref = buildConsultationRxUrl(
            patientId,
            plan.id,
            service.id,
            appt.id,
            embedInPatientShell,
            service.treatment
          );
          const dateLong = formatAppointmentDateLong(appt.date);
          const badgeKind = isCancelled
            ? "cancelled"
            : hasVisitNotes
            ? "completed"
            : "upcoming";

          return (
            <div
              key={appt.id ?? idx}
              className={cx(
                styles.timelineEntry,
                idx === 0 ? styles.first : ""
              )}
            >
              {!isLast && (
                <span
                  aria-hidden={true}
                  className={styles.timelineVerticalLine}
                />
              )}
              <VisitTimelineDot
                variant={isCancelled ? "cancelled" : "default"}
              />
              <div
                className={styles.visitRowCard}
                style={getVisitRowSurfaceStyle(isCancelled)}
              >
                <div className={styles.visitRowHeader}>
                  <div className={styles.visitRowInfo}>
                    <div className={styles.doctorInfoRow}>
                      <VisitDoctorAvatar />
                      <p
                        className={cx(
                          styles.doctorName,
                          isCancelled ? styles.cancelledLine : ""
                        )}
                      >
                        {appt.doctor}
                      </p>
                      {visitBadge(badgeKind)}
                    </div>
                    <div
                      className={`${styles.visitMetaRow} ${
                        isCancelled ? styles.cancelledLine : ""
                      }`}
                    >
                      <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>Date:</span>
                        <span>
                          {appt.time
                            ? `${dateLong} (${appt.time})`
                            : dateLong}
                        </span>
                      </span>
                      <span
                        className={styles.metaDivider}
                        aria-hidden={true}
                      />
                      <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>Visit Type:</span>
                        <span>
                          {appt.caseType
                            ? CASE_TYPE_LABELS[appt.caseType] ?? "Follow up"
                            : "Follow up"}
                        </span>
                      </span>
                      <span
                        className={styles.metaDivider}
                        aria-hidden={true}
                      />
                      <span
                        className={cx(
                          styles.metaItem,
                          styles.metaItemTruncate
                        )}
                      >
                        <span className={styles.metaLabel}>Remarks:</span>
                        <span className={styles.metaValueTruncate}>
                          {String(appt.notes ?? "").trim() ||
                            "Review and obturation planning"}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.visitRowActions}>
                    {hasVisitNotes && primaryConsult && (
                      <button
                        type="button"
                        onClick={() => {
                          setSittingPreviewId(null);
                          setConsultPreviewId(primaryConsult.id);
                        }}
                        className={VIEW_RX_SECONDARY_CLASS}
                      >
                        <DocumentText size={14} variant="Linear" />
                        View Rx
                      </button>
                    )}
                    {!hasVisitNotes && !isCancelled && (
                      <TPSplitButton
                        size="sm"
                        variant="outline"
                        theme="primary"
                        className={styles.noShadow}
                        trackClassName={TIMELINE_TYPERX_TRACK_CLASS}
                        primaryAction={{
                          label: "TypeRx",
                          onClick: () => window.location.assign(apptRxHref),
                        }}
                        secondaryActions={[
                          {
                            id: "quick-record-visit-form",
                            label: "Quick visit record form",
                            onClick: () =>
                              openDrawer({
                                type: "add-sitting",
                                serviceId: service.id,
                              }),
                          },
                          { id: "quick-record-separator", separator: true },
                          {
                            id: "type-rx",
                            label: "TypeRx",
                            onClick: () =>
                              window.location.assign(apptRxHref),
                          },
                          {
                            id: "voice-rx",
                            label: "VoiceRx",
                            onClick: () =>
                              window.location.assign(apptRxHref),
                          },
                          {
                            id: "snap-rx",
                            label: "SnapRx",
                            onClick: () =>
                              window.location.assign(apptRxHref),
                          },
                          {
                            id: "smart-sync",
                            label: "SmartSync",
                            onClick: () =>
                              window.location.assign(apptRxHref),
                          },
                        ]}
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild={true}>
                        <button
                          type="button"
                          className={TIMELINE_MENU_TRIGGER_CLASS}
                          aria-label="More actions"
                        >
                          <MoreVertical
                            size={20}
                            color="currentColor"
                            strokeWidth={3}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className={dropdownContentClass}
                      >
                        {hasVisitNotes && primaryConsult && (
                          <>
                            <DropdownMenuItem
                              className={dropdownItemClass}
                              onClick={() =>
                                window.location.assign(apptRxHref)
                              }
                            >
                              <Edit2 size={16} variant="Linear" />
                              Edit in RxPad
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={dropdownItemClass}
                              onClick={() => {
                                setSittingPreviewId(null);
                                setConsultPreviewId(primaryConsult.id);
                              }}
                            >
                              <DocumentText size={16} variant="Linear" />
                              View Rx
                            </DropdownMenuItem>
                          </>
                        )}
                        {!isCancelled && !hasVisitNotes && (
                          <>
                            <DropdownMenuItem
                              className={dropdownItemClass}
                              onClick={() =>
                                openDrawer({
                                  type: "book-appointment",
                                  planId: plan.id,
                                  serviceId: service.id,
                                  appointmentId: appt.id,
                                })
                              }
                            >
                              <Edit2 size={16} variant="Linear" />
                              Edit appointment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-[8px] !gap-[6px] focus:bg-red-50 data-[highlighted]:bg-red-50"
                              onClick={() => onOpenCancelDialog(appt)}
                            >
                              <Ban
                                size={16}
                                variant="Linear"
                                className={styles.errorIcon}
                              />
                              <span className={styles.errorText}>
                                Cancel appointment
                              </span>
                            </DropdownMenuItem>
                          </>
                        )}
                        {isCancelled && !hasVisitNotes && (
                          <>
                            <DropdownMenuItem
                              className={dropdownItemClass}
                              onClick={() =>
                                updateService(plan.id, service.id, {
                                  appointments: (service.appointments ?? []).map((a) =>
                                    a.id === appt.id
                                      ? { ...a, status: "scheduled", cancellationReason: undefined }
                                      : a
                                  ),
                                })
                              }
                            >
                              <ArrowRotateLeft
                                size={16}
                                variant="Linear"
                                className={styles.successIcon}
                              />
                              <span className="text-tp-success-600">
                                Revert cancellation
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={dropdownItemClass}
                              onClick={() =>
                                updateService(plan.id, service.id, {
                                  appointments: (service.appointments ?? []).filter((a) => a.id !== appt.id),
                                })
                              }
                            >
                              <Trash size={16} variant="Linear" />
                              Remove from timeline
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {isCancelled && appt.cancellationReason && (
                  <p className={styles.cancelReasonRow}>
                    <span className={styles.cancelReasonLabel}>Reason: </span>
                    {appt.cancellationReason}
                  </p>
                )}
                {!isCancelled &&
                  linkedConsultations.map((c) => (
                    <ConsultationPreviewCard
                      key={c.id}
                      c={c}
                      appointmentItems={appointmentItems}
                      patientId={patientId}
                      plan={plan}
                      service={service}
                      embedInPatientShell={embedInPatientShell}
                      underAppointment={true}
                      variant="snippet"
                      previewOpen={consultPreviewId === c.id}
                      onPreviewOpenChange={(o) => {
                        if (o) setSittingPreviewId(null);
                        setConsultPreviewId(o ? c.id : null);
                      }}
                      hideViewRxButton={true}
                    />
                  ))}
              </div>
            </div>
          );
        }

        // ── Sitting entry ───────────────────────────────────
        if (entry.kind === "sitting") {
          const sit = entry.sitting;
          const sitStatus = sit.status ?? "completed";
          const isCancelledSit = sitStatus === "cancelled";
          const isUpcomingSit = sitStatus === "scheduled";
          const sitRxHref = buildConsultationRxUrl(
            patientId,
            plan.id,
            service.id,
            undefined,
            embedInPatientShell,
            service.treatment
          );
          const sitDateLong = sit.date
            ? formatAppointmentDateLong(sit.date)
            : "";

          return (
            <div
              key={sit.id ?? idx}
              className={cx(
                styles.timelineEntry,
                idx === 0 ? styles.first : ""
              )}
            >
              {!isLast && (
                <span
                  aria-hidden={true}
                  className={styles.timelineVerticalLine}
                />
              )}
              <VisitTimelineDot
                variant={isCancelledSit ? "cancelled" : "default"}
              />
              <div
                className={styles.visitRowCard}
                style={getVisitRowSurfaceStyle(isCancelledSit)}
              >
                <div className={styles.visitRowHeader}>
                  <div className={styles.visitRowInfo}>
                    <div className={styles.doctorInfoRow}>
                      <VisitDoctorAvatar />
                      <p
                        className={cx(
                          styles.doctorName,
                          isCancelledSit ? styles.cancelledLine : ""
                        )}
                      >
                        {resolveSittingDoctorName(sit, { userId, profile })}
                      </p>
                      {visitBadge(
                        isCancelledSit
                          ? "cancelled"
                          : isUpcomingSit
                          ? "upcoming"
                          : "completed"
                      )}
                    </div>
                    <div
                      className={`${styles.visitMetaRow} ${
                        isCancelledSit ? styles.cancelledLine : ""
                      }`}
                    >
                      {sitDateLong && (
                        <span className={styles.metaItem}>
                          <span className={styles.metaLabel}>Date:</span>
                          <span>
                            {sit.time
                              ? `${sitDateLong} (${sit.time})`
                              : sitDateLong}
                          </span>
                        </span>
                      )}
                      {sitDateLong && (
                        <span
                          className={styles.metaDivider}
                          aria-hidden={true}
                        />
                      )}
                      <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>Visit Type:</span>
                        <span>
                          {formatQvrVisitTypeLabel(sit.visitType)}
                        </span>
                      </span>
                      <span
                        className={styles.metaDivider}
                        aria-hidden={true}
                      />
                      <span
                        className={cx(
                          styles.metaItem,
                          styles.metaItemTruncate
                        )}
                      >
                        <span className={styles.metaLabel}>Remarks:</span>
                        <span className={styles.metaValueTruncate}>
                          {String(sit.notes ?? "").trim() ||
                            "Review and obturation planning"}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.visitRowActions}>
                    {!isCancelledSit && sitStatus === "completed" && (
                      <button
                        type="button"
                        onClick={() => {
                          setConsultPreviewId(null);
                          setSittingPreviewId(null);
                          openDrawer({
                            type: "rx-preview",
                            planId: plan.id,
                            serviceId: service.id,
                            sittingId: sit.id,
                          });
                        }}
                        className={VIEW_RX_SECONDARY_CLASS}
                      >
                        <DocumentText size={14} variant="Linear" />
                        View Rx
                      </button>
                    )}
                    {!isCancelledSit && isUpcomingSit && (
                      <TPSplitButton
                        size="sm"
                        variant="outline"
                        theme="primary"
                        className={styles.noShadow}
                        trackClassName={TIMELINE_TYPERX_TRACK_CLASS}
                        primaryAction={{
                          label: "TypeRx",
                          onClick: () => window.location.assign(sitRxHref),
                        }}
                        secondaryActions={[
                          {
                            id: "quick-record-visit-form",
                            label: "Quick visit record form",
                            onClick: () =>
                              openDrawer({
                                type: "add-sitting",
                                serviceId: service.id,
                              }),
                          },
                          { id: "quick-record-separator", separator: true },
                          {
                            id: "type-rx",
                            label: "TypeRx",
                            onClick: () =>
                              window.location.assign(sitRxHref),
                          },
                          {
                            id: "voice-rx",
                            label: "VoiceRx",
                            onClick: () =>
                              window.location.assign(sitRxHref),
                          },
                          {
                            id: "snap-rx",
                            label: "SnapRx",
                            onClick: () =>
                              window.location.assign(sitRxHref),
                          },
                          {
                            id: "smart-sync",
                            label: "SmartSync",
                            onClick: () =>
                              window.location.assign(sitRxHref),
                          },
                        ]}
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild={true}>
                        <button
                          type="button"
                          className={TIMELINE_MENU_TRIGGER_CLASS}
                          aria-label="More actions"
                        >
                          <MoreVertical
                            size={17}
                            color="currentColor"
                            strokeWidth={2}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className={dropdownContentClass}
                      >
                        {!isCancelledSit && (
                          <>
                            <DropdownMenuItem
                              className={dropdownItemClass}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDrawer({
                                  type: "edit-sitting",
                                  serviceId: service.id,
                                  sittingId: sit.id,
                                });
                              }}
                            >
                              <Edit2 size={16} variant="Linear" />
                              Edit visit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={styles.deleteServiceMenuItem}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSitting(sit.id);
                              }}
                            >
                              <Trash
                                size={16}
                                variant="Linear"
                                className={styles.errorIcon}
                              />
                              <span className={styles.errorText}>Delete visit</span>
                            </DropdownMenuItem>
                          </>
                        )}
                        {isCancelledSit && (
                          <>
                            <DropdownMenuItem
                              className={dropdownItemClass}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!patientId) return;
                                syncPlansAfterQvr(
                                  dispatch(
                                    updateQvr({
                                      patientId,
                                      planId: plan.id,
                                      serviceId: service.id,
                                      qvrId: sit.id,
                                      data: {
                                        status: "COMPLETED",
                                        version: sit.version,
                                      },
                                    }),
                                  ),
                                ).catch(() => {});
                              }}
                            >
                              <ArrowRotateLeft
                                size={16}
                                variant="Linear"
                                className={styles.successIcon}
                              />
                              <span className={styles.successText}>
                                Revert cancellation
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={styles.deleteServiceMenuItem}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSitting(sit.id);
                              }}
                            >
                              <Trash
                                size={16}
                                variant="Linear"
                                className={styles.errorIcon}
                              />
                              <span className={styles.errorText}>Delete visit</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {!isCancelledSit && !isUpcomingSit && sit.notes && (
                  <ConsultationSummarySurface>
                    {renderConsultSummarySnippetBody(sit.notes, {
                      inSurface: true,
                    })}
                  </ConsultationSummarySurface>
                )}
              </div>
              <QuickVisitRxPreview
                sit={sit}
                patientId={patientId}
                plan={plan}
                service={service}
                embedInPatientShell={embedInPatientShell}
                previewOpen={sittingPreviewId === sit.id}
                onOpenChange={(o) =>
                  setSittingPreviewId(o ? sit.id : null)
                }
              />
            </div>
          );
        }

        // ── Direct consultation entry ────────────────────────
        const c = entry.consultation;
        const directRxHref = buildConsultationRxUrl(
          patientId,
          plan.id,
          service.id,
          c.appointmentId,
          embedInPatientShell,
          service.treatment
        );

        return (
          <div
            key={c.id ?? idx}
            className={`${styles.timelineEntry} ${
              idx === 0 ? styles.first : ""
            }`}
          >
            {!isLast && (
              <span className={styles.timelineVerticalLineThin} />
            )}
            <span className={styles.timelineDotSimple} />
            <div className={styles.visitRowCardGradient}>
              <div className={styles.visitRowHeader}>
                <div className={styles.visitRowInfo}>
                  <div className={styles.doctorInfoRow}>
                    <p className={styles.chairsideVisitLabel}>
                      Chairside visit
                    </p>
                    {visitBadge("completed")}
                  </div>
                  <div className={styles.visitMetaRow}>
                    <span className={styles.metaLabel}>Visit Type:</span>
                    <span>Follow up</span>
                    <span className={styles.metaDivider} aria-hidden={true} />
                    <span className={styles.metaLabel}>Remarks:</span>
                    <span className={styles.metaValueTruncate}>
                      {String(c.summaryText ?? "")
                        .trim()
                        .split(/\n/)
                        .map((l) => l.trim())
                        .filter(Boolean)[0] ||
                        "Review and obturation planning"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSittingPreviewId(null);
                      setConsultPreviewId(c.id);
                    }}
                    className={VIEW_RX_SECONDARY_CLASS}
                  >
                    <DocumentText size={14} variant="Linear" />
                    View Rx
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild={true}>
                      <button
                        type="button"
                        className={TIMELINE_MENU_TRIGGER_CLASS}
                        aria-label="More actions"
                      >
                        <MoreVertical
                          size={17}
                          color="currentColor"
                          strokeWidth={2}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className={dropdownContentClass}
                    >
                      <DropdownMenuItem
                        className={dropdownItemClass}
                        onClick={() =>
                          window.location.assign(directRxHref)
                        }
                      >
                        <Edit2 size={16} variant="Linear" className="" />
                        Edit in RxPad
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={dropdownItemClass}
                        onClick={() => {
                          setSittingPreviewId(null);
                          setConsultPreviewId(c.id);
                        }}
                      >
                        <DocumentText
                          size={16}
                          variant="Linear"
                          className=""
                        />
                        View Rx
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <ConsultationPreviewCard
                c={c}
                appointmentItems={appointmentItems}
                patientId={patientId}
                plan={plan}
                service={service}
                embedInPatientShell={embedInPatientShell}
                variant="snippet"
                previewOpen={consultPreviewId === c.id}
                onPreviewOpenChange={(o) => {
                  if (o) setSittingPreviewId(null);
                  setConsultPreviewId(o ? c.id : null);
                }}
                hideViewRxButton={true}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
