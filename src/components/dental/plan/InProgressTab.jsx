/**
 * InProgressTab — Cluster card layout for in-progress plans.
 * Outer shell: rounded-[16px], bg-white, NO stroke.
 * Inner sub-cards: 0.5px neutral stroke.
 * Each service sub-card is an accordion — first open by default, one at a time.
 * Status dropdown exposes all explicit states (Yet to start, In Progress,
 * Completed, No-Show, Not Interested, Cancelled).
 */
import { useState, useCallback } from "react";
import {
  TickCircle,
  ArrowRotateLeft,
  Edit2,
  Receipt1,
  Timer1,
  Trash,
} from "iconsax-reactjs";
import { ChevronDown, Info, MoreVertical } from "lucide-react";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { usePlanContext } from "./plan-context";
import {
  SectionFrame,
  EmptyState,
  PlanEmptyIcon,
  formatINR,
  computePlanTotal,
  getServiceWorkflowStatus,
} from "./plan-shared";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ServiceActions } from "./ServiceActions";
import { ServiceAppointmentSection } from "./ServiceAppointmentSection";
import dui from "../dental-ui.module.scss";
import styles from "./InProgressTab.module.scss";
import { useChikitsalay } from "../../../pages/chikitsalay/useChikitsalay";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

// ─── Style class constants (consumed by split files via re-export) ──────────
// These are kept here because ServicePreviewModals.jsx is co-located
// in the same feature directory and uses the same CSS module.
export const dropdownContentClass = styles.dropdownContent;
export const dropdownItemClass = styles.dropdownItem;

// ─── Status helpers ─────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "not-started", label: "Yet to start" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "no-show", label: "Patient No-Show" },
  { value: "not-interested", label: "Not Interested" },
  { value: "cancelled", label: "Cancelled" },
];

const CHIKITSALAY_STATUS_OPTIONS = [
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  // { value: "cancelled", label: "Cancelled" },
  // { value: "refund", label: "Refund" },
];

const ALL_STATUS_OPTIONS = [
  ...STATUS_OPTIONS,
  { value: "refund", label: "Refund" },
];

function getStatusSelectClasses(status) {
  if (status === "completed") return styles.statusSelect + " " + styles.completed;
  if (status === "in-progress") return styles.statusSelect + " " + styles.inProgress;
  if (status === "no-show") return styles.statusSelect + " " + styles.noShow;
  if (status === "not-interested") return styles.statusSelect + " " + styles.notInterested;
  if (status === "cancelled" || status === "refund") {
    return styles.statusSelect + " " + styles.cancelled;
  }
  return styles.statusSelect + " " + styles.default;
}

function getStatusSelectItemToneClasses(status) {
  if (status === "completed") return styles.statusSelectItemTone + " " + styles.completed;
  if (status === "in-progress") return styles.statusSelectItemTone + " " + styles.inProgress;
  if (
    status === "no-show" ||
    status === "not-interested" ||
    status === "cancelled" ||
    status === "refund"
  )
    return styles.statusSelectItemTone + " " + styles.cancelled;
  return styles.statusSelectItemTone + " " + styles.default;
}

const statusSelectItemBaseClass = styles.statusSelectItemBase;

function formatSurfaceLabel(surface) {
  return surface.charAt(0).toUpperCase() + surface.slice(1);
}

function normalizeStatusForDropdown(service) {
  const workflowStatus = getServiceWorkflowStatus(service);
  const raw = service.status === "planned" ? workflowStatus : service.status;
  return ALL_STATUS_OPTIONS.some((opt) => opt.value === raw) ? raw : "not-started";
}

/** Skip accordion toggle when the click lands on an interactive child. */
function shouldIgnoreServiceHeaderToggle(event) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, [role="combobox"], [data-slot="select-trigger"], [data-radix-dropdown-menu-trigger]'
    )
  );
}

// ─── Service Sub-Card ──────────────────────────────────────

/**
 * Accordion sub-card for a single service within a plan cluster.
 * Delegates the expanded body to ServiceAppointmentSection and the
 * header action buttons to ServiceActions.
 *
 * @param {{ service: object, plan: object,
 *   index: number, isOpen: boolean, onToggle: Function }} props
 */
function ServiceSubCard({ service, plan, index, isOpen, onToggle }) {
  const { markServiceDone, updateService, removeService } = usePlanContext();
  const isChikitsalayAccessable = useChikitsalay();
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleMarkDone = () => {
    markServiceDone(plan.id, service.id);
    setMarkDoneOpen(false);
  };

  const teeth = service.teeth?.length > 0 ? service.teeth : [service.toothFdi];
  const isFullMouth = teeth.includes("full-mouth");
  const toothText = isFullMouth
    ? "Full Mouth"
    : teeth.map((t) => `T${t}`).join(", ");
  const surfaceSummary =
    service.surfaces.length > 0
      ? service.surfaces.map((s) => formatSurfaceLabel(s)).join(", ")
      : "All surfaces";

  const hoverDetails = [
    {
      label: "Tooth",
      value: toothText,
    },
    { label: "Surfaces", value: surfaceSummary },
    {
      label: "Notes",
      value: String(service.notes ?? "").trim() || "No notes added",
    },
  ];

  const statusOptions = isChikitsalayAccessable
    ? CHIKITSALAY_STATUS_OPTIONS
    : STATUS_OPTIONS;
  const dropdownValue = normalizeStatusForDropdown(service);
  const isStatusLocked =
    isChikitsalayAccessable && dropdownValue === "completed";
  const statusLabel =
    ALL_STATUS_OPTIONS.find((opt) => opt.value === dropdownValue)?.label ??
    "Select status";
  const statusSelectClasses = getStatusSelectClasses(dropdownValue);

  const handleServiceStatusChange = (next) => {
    const mappedStatus = next === "not-started" ? "planned" : next;
    updateService(plan.id, service.id, {
      status: mappedStatus,
      completedAt:
        mappedStatus === "completed"
          ? service.completedAt ?? new Date().toISOString().slice(0, 10)
          : undefined,
    });
  };

  return (
    <div className={styles.serviceCard}>
      {/* ── Header ── */}
      <div
        className={cx(
          styles.serviceCardHeader,
          isOpen ? styles.serviceCardHeaderOpen : ""
        )}
        onClick={(e) => {
          if (shouldIgnoreServiceHeaderToggle(e)) return;
          onToggle?.();
        }}
      >
        <div className={styles.serviceCardIndexPill}>
          <span className={styles.serviceCardIndexText}>{index + 1}</span>
        </div>
        <div className={styles.serviceCardContent}>
          <div className={styles.serviceCardMain}>
            <div className={styles.serviceCardTitleRow}>
              <p className={styles.serviceCardTitle}>{service.treatment}</p>
              <span className={styles.serviceCardToothBadge}>{toothText}</span>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild={true}>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={styles.serviceInfoButton}
                    aria-label="View treatment details"
                  >
                    <Info size={14} strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className={styles.serviceInfoTooltip}
                >
                  <div className={styles.serviceInfoTooltipBody}>
                    {hoverDetails.map((detail) => (
                      <p key={detail.label}>
                        <span className={styles.serviceInfoTooltipLabel}>
                          {detail.label}:{" "}
                        </span>
                        <span>{detail.value}</span>
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className={styles.serviceCardStatusRow}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild={true} disabled={isStatusLocked}>
                  <button
                    type="button"
                    disabled={isStatusLocked}
                    onClick={(e) => e.stopPropagation()}
                    className={cx(
                      styles.serviceStatusTrigger,
                      statusSelectClasses,
                      isStatusLocked && styles.serviceStatusTriggerDisabled
                    )}
                    aria-label={
                      isStatusLocked
                        ? "Service status is completed and cannot be changed"
                        : "Change service status"
                    }
                  >
                    <span>{statusLabel}</span>
                    {!isStatusLocked && (
                      <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                {!isStatusLocked && (
                  <DropdownMenuContent
                    align="start"
                    className={cx(
                      dropdownContentClass,
                      styles.serviceStatusContent
                    )}
                  >
                    {statusOptions.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => handleServiceStatusChange(opt.value)}
                        className={`${statusSelectItemBaseClass} ${getStatusSelectItemToneClasses(opt.value)}`}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            </div>
          </div>
          <ServiceActions
            service={service}
            plan={plan}
            isOpen={isOpen}
            onToggle={onToggle}
            onDeleteOpen={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      {/* ── Expanded body ── */}
      {isOpen && (
        <ServiceAppointmentSection service={service} plan={plan} />
      )}

      {/* ── Dialogs ── */}
      <TPConfirmDialog
        open={markDoneOpen}
        onOpenChange={setMarkDoneOpen}
        title="Mark as Completed"
        warning={`This marks ${service.treatment} (${
          service.toothFdi === "full-mouth"
            ? "Full Mouth"
            : `T${service.toothFdi}`
        }) as completed. You can revert the status if needed.`}
        secondaryLabel="Cancel"
        primaryLabel="Mark Done"
        primaryTone="success"
        onPrimary={handleMarkDone}
      />
      <TPConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Service"
        warning={`This permanently removes ${service.treatment} from the plan. This action cannot be undone.`}
        secondaryLabel="Cancel"
        primaryLabel="Delete"
        primaryTone="destructive"
        onPrimary={() => {
          removeService(plan.id, service.id);
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}

// ─── Plan Cluster Card ─────────────────────────────────────

/**
 * Top-level card for a single in-progress treatment plan.
 * Contains the plan header, accordion of service sub-cards, and
 * plan-level dialogs (mark all done, revert, delete).
 *
 * @param {{ plan: object, collapsed?: boolean,
 *   onToggleCollapse: Function }} props
 */
function PlanClusterCard({ plan, collapsed = false, onToggleCollapse }) {
  const { markCompleted, revertToEstimates, deletePlan, openDrawer, patientId } = usePlanContext();
  const isChikitsalayAccessable = useChikitsalay();
  const [markAllOpen, setMarkAllOpen] = useState(false);
  const [revertAllOpen, setRevertAllOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  // Accordion — first service open by default, one at a time.
  const [openServiceIndex, setOpenServiceIndex] = useState(0);

  const services = plan.services;
  const total = computePlanTotal(plan.services);
  const additionalDiscount = plan.additionalDiscount ?? 0;
  const finalTotal = Math.max(0, total - additionalDiscount);
  const canRevertToPlan = services.every(
    (s) => getServiceWorkflowStatus(s) === "not-started"
  );

  return (
    <div className={cx(styles.planClusterCard, dui.planClusterShell)}>
      <div
        className={cx(
          styles.planClusterHeader,
          dui.planClusterHeaderActive
        )}
      >
        <div className={styles.planHeaderLeft}>
          <div className={styles.planIconWrapper}>
            <Timer1 size={22} variant="Bulk" className={styles.warningIcon} />
          </div>
          <div>
            <h4 className={styles.planName}>{plan.name}</h4>
            <div className={styles.planMetaRow}>
              {additionalDiscount > 0 ? (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild={true}>
                    <span className={styles.planTotalBadge}>
                      {formatINR(finalTotal)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    sideOffset={6}
                    className={styles.serviceActionTooltip}
                  >
                    <div className={styles.planTotalTooltipBody}>
                      <p className={styles.planTotalTooltipMuted}>
                        Subtotal: {formatINR(total)}
                      </p>
                      <p className={styles.planTotalTooltipSuccess}>
                        Discount: −{formatINR(additionalDiscount)}
                      </p>
                      <p className={styles.planTotalTooltipStrong}>
                        Final: {formatINR(finalTotal)}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className={styles.planTotalBadge}>
                  {formatINR(finalTotal)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.planHeaderActions}>
          <button
            type="button"
            onClick={() => {
              const allDone = services.every(
                (s) => getServiceWorkflowStatus(s) === "completed"
              );
              if (allDone) {
                markCompleted(plan.id);
              } else {
                setMarkAllOpen(true);
              }
            }}
            className={styles.markAllDoneBtn}
          >
            <TickCircle size={20} variant="Linear" />
            End Plan
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild={true}>
              <button
                type="button"
                className={styles.planMoreActionsBtn}
              >
                <MoreVertical
                  size={20}
                  color="var(--tp-slate-500)"
                  strokeWidth={2}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={dropdownContentClass}
            >
              <DropdownMenuItem
                onClick={() => openDrawer({ type: "edit-plan", planId: plan.id })}
                className={dropdownItemClass}
              >
                <Edit2 size={16} variant="Linear" />
                Edit Plan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  openDrawer({ type: "bill-preview", planId: plan.id })
                }
                className={dropdownItemClass}
              >
                <Receipt1 size={16} variant="Linear" className="" />
                View Plan Estimate
              </DropdownMenuItem>
              {!isChikitsalayAccessable && <DropdownMenuItem
                onClick={() => setRevertAllOpen(true)}
                disabled={!canRevertToPlan}
                className={canRevertToPlan ? styles.warningMenuItem : styles.disabledMenuItem}
              >
                <ArrowRotateLeft
                  size={16}
                  variant="Linear"
                />
                <span>Revert All to Plan</span>
              </DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeletePlanOpen(true)}
                className={styles.deleteServiceMenuItem}
              >
                <Trash
                  size={16}
                  variant="Linear"
                  className={styles.errorIcon}
                />
                <span className={styles.deletePlanText}>Delete Plan</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => onToggleCollapse?.()}
            aria-label={collapsed ? "Expand plan" : "Collapse plan"}
            className={styles.planCollapseButton}
          >
            <ChevronDown
              size={18}
              strokeWidth={2}
              className={`${styles.collapseIcon} ${
                collapsed ? styles.collapsed : ""
              }`}
            />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div
          className={cx(
            styles.planClusterBody,
            dui.planClusterInnerSurface
          )}
        >
          {services.map((svc, idx) => (
            <ServiceSubCard
              key={svc.id ?? idx}
              service={svc}
              plan={plan}
              index={idx}
              isOpen={openServiceIndex === idx}
              onToggle={() =>
                setOpenServiceIndex((current) =>
                  current === idx ? -1 : idx
                )
              }
            />
          ))}
        </div>
      )}

      <TPConfirmDialog
        open={markAllOpen}
        onOpenChange={setMarkAllOpen}
        title="End Plan"
        warning={`Are you sure you want to end "${plan.name}"? The following services are not yet resolved and will keep their current status.`}
        secondaryLabel="Cancel"
        primaryLabel="End Plan"
        primaryTone="success"
        onPrimary={() => {
          markCompleted(plan.id);
          setMarkAllOpen(false);
        }}
      >
        <div className={styles.incompleteServicesList}>
          {services
            .filter((s) => getServiceWorkflowStatus(s) !== "completed")
            .map((s) => {
              const wfStatus = getServiceWorkflowStatus(s);
              const label = ALL_STATUS_OPTIONS.find((o) => o.value === wfStatus)?.label ?? wfStatus;
              return (
                <div key={s.id} className={styles.incompleteServiceRow}>
                  <span className={styles.incompleteServiceName}>{s.treatment}</span>
                  <span className={cx(styles.incompleteStatusBadge, styles[`status_${wfStatus.replace(/-/g, "_")}`])}>
                    {label}
                  </span>
                </div>
              );
            })}
        </div>
      </TPConfirmDialog>
      <TPConfirmDialog
        open={revertAllOpen}
        onOpenChange={setRevertAllOpen}
        title="Revert Plan to Estimates"
        warning={`Reverts ${plan.name} back to estimates. Appointments, consultations, recorded visits and procedures on this plan will be cleared.`}
        secondaryLabel="Cancel"
        primaryLabel="Revert to Estimates"
        primaryTone="warning"
        onPrimary={() => {
          revertToEstimates(plan.id);
          setRevertAllOpen(false);
        }}
      />
      <TPConfirmDialog
        open={deletePlanOpen}
        onOpenChange={setDeletePlanOpen}
        title="Delete Plan"
        warning={`This will permanently delete "${plan.name}" and all its ${
          services.length
        } service${
          services.length === 1 ? "" : "s"
        }, appointments, and visit records. This action cannot be undone.`}
        secondaryLabel="Cancel"
        primaryLabel="Delete Plan"
        primaryTone="destructive"
        onPrimary={() => {
          deletePlan(plan.id);
          setDeletePlanOpen(false);
        }}
      />
    </div>
  );
}

// ─── Tab Content ────────────────────────────────────────────

/**
 * InProgressTab — renders the list of active treatment plan cluster cards,
 * or an empty state if no plans are in progress.
 */
export function InProgressTab() {
  const { inProgressPlans } = usePlanContext();
  // Track collapsed state per plan. Default: all expanded.
  const [collapsedPlanIds, setCollapsedPlanIds] = useState(
    () => new Set()
  );
  const toggleCollapse = useCallback((planId) => {
    setCollapsedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }, []);

  if (inProgressPlans.length === 0) {
    return (
      <SectionFrame>
        <div
          className={`${styles.emptyPlansShell} ${dui.planClusterShell}`}
        >
          <div
            className={cx(
              styles.emptyPlanHeader,
              dui.planClusterHeaderActive
            )}
          >
            <div className={styles.planHeaderLeft}>
              <div className={styles.planIconWrapperLarge}>
                <Timer1
                  size={24}
                  variant="Bulk"
                  className={styles.warningIcon}
                />
              </div>
              <h3 className={styles.activePlansTitle}>Active Plans</h3>
            </div>
          </div>
          <div
            className={`${styles.emptyPlansBody} ${dui.planClusterInnerSurface}`}
          >
            <EmptyState
              icon={<PlanEmptyIcon size={120} />}
              title="No active plans yet"
              description="Activate a plan from Plan Estimates to see services here."
            />
          </div>
        </div>
      </SectionFrame>
    );
  }

  return (
    <SectionFrame>
      <div className={styles.inProgressTabScroll}>
        <div className={styles.inProgressTabList}>
          {inProgressPlans.map((plan) => (
            <PlanClusterCard
              key={plan.id}
              plan={plan}
              collapsed={collapsedPlanIds.has(plan.id)}
              onToggleCollapse={() => toggleCollapse(plan.id)}
            />
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
