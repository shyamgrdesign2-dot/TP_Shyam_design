/**
 * ServiceAppointmentSection — The expanded body of a service sub-card.
 * Shows the treatment summary metadata row (tooth / surfaces / amount / notes)
 * followed by the visit timeline. Also owns the appointment cancellation
 * confirm dialog that is triggered from timeline entries.
 *
 * Exports: ServiceAppointmentSection
 */
import { useState } from "react";
import dayjs from "dayjs";
import { usePlanContext } from "./plan-context";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import { formatINR } from "./plan-shared";
import { ServiceTimeline } from "./ServiceTimeline";
import styles from "./InProgressTab.module.scss";

// ─── Local helpers ──────────────────────────────────────────

function formatSurfaceLabel(surface) {
  return surface.charAt(0).toUpperCase() + surface.slice(1);
}

// ─── ServiceAppointmentSection ──────────────────────────────

/**
 * Renders the open-state body of a service sub-card:
 * summary metadata + visit timeline + cancellation dialog.
 *
 * @param {{ service: object, plan: object }} props
 */
export function ServiceAppointmentSection({ service, plan }) {
  const { updateService } = usePlanContext();

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const openCancelDialog = (appt) => {
    setCancelTarget(appt);
    setCancelReason(appt.cancellationReason ?? "");
  };
  const closeCancelDialog = () => {
    setCancelTarget(null);
    setCancelReason("");
  };
  const confirmCancelAppointment = () => {
    if (!cancelTarget) return;
    updateService(plan.id, service.id, {
      appointments: (service.appointments ?? []).map((a) =>
        a.id === cancelTarget.id
          ? { ...a, status: "cancelled", cancellationReason: cancelReason.trim() || "No reason provided" }
          : a
      ),
    });
    closeCancelDialog();
  };

  const teeth = service.teeth?.length > 0 ? service.teeth : [service.toothFdi];
  const isFullMouth = teeth.includes("full-mouth");
  const toothText = isFullMouth ? "Full Mouth" : teeth.map((t) => `T${t}`).join(", ");
  const surfaceSummary =
    service.surfaces.length > 0
      ? service.surfaces.map((s) => formatSurfaceLabel(s)).join(", ")
      : "All surfaces";

  return (
    <div className={styles.serviceBody}>
      <div className={styles.serviceBodyInner}>
        {/* Treatment summary metadata */}
        <div className={styles.serviceSummaryBox}>
          <div className={styles.serviceSummaryRow}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Treatment:</span>
              <span>{service.treatment}</span>
            </div>
            <span aria-hidden={true} className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Tooth:</span>
              <span>{toothText}</span>
            </div>
            {!isFullMouth && (
              <span aria-hidden={true} className={styles.summaryDivider} />
            )}
            {!isFullMouth && (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Surfaces:</span>
                <span>{surfaceSummary}</span>
              </div>
            )}
            <span aria-hidden={true} className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Amount:</span>
              <span className={styles.summaryValueAmount}>
                {formatINR(service.amount)}
              </span>
            </div>
            <span aria-hidden={true} className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Surgery Date:</span>
              <span className={service.procedureDate ? "" : styles.muted}>
                {service.procedureDate
                  ? dayjs(service.procedureDate).format("D MMM YY")
                  : "—"}
              </span>
            </div>
            <span aria-hidden={true} className={styles.summaryDivider} />
            <div
              className={`${styles.summaryItem} ${styles.summaryItemFull}`}
            >
              <span className={styles.summaryLabel}>Notes:</span>
              <span
                className={
                  String(service.notes ?? "").trim() ? "" : styles.muted
                }
              >
                {String(service.notes ?? "").trim() || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Visit timeline */}
        <div className={styles.minWidthZero}>
          <ServiceTimeline
            service={service}
            plan={plan}
            onOpenCancelDialog={openCancelDialog}
          />
        </div>
      </div>

      {/* Appointment cancellation confirm dialog */}
      <TPConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) closeCancelDialog();
        }}
        title="Cancel Appointment"
        warning={
          cancelTarget
            ? `Cancelling ${cancelTarget.doctor}'s appointment on ${cancelTarget.date} at ${cancelTarget.time}. Record a reason so it stays visible in the visit history.`
            : ""
        }
        secondaryLabel="Keep appointment"
        primaryLabel="Cancel appointment"
        primaryTone="destructive"
        primaryDisabled={!cancelReason.trim()}
        onPrimary={confirmCancelAppointment}
      >
        <div className="flex flex-col gap-[8px]">
          <label className="block font-['Inter',sans-serif] text-[12px] font-semibold text-tp-slate-700">
            Reason for cancellation
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Patient requested to reschedule due to travel"
            rows={3}
            className={styles.cancelTextarea}
          />
          <div className="flex flex-wrap gap-[6px]">
            {[
              "Patient travel",
              "Doctor unavailable",
              "Patient no-show",
              "Rescheduled",
            ].map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setCancelReason(quick)}
                className={styles.quickReasonBtn}
              >
                {quick}
              </button>
            ))}
          </div>
        </div>
      </TPConfirmDialog>
    </div>
  );
}
