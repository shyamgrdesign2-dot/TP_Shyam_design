/**
 * CompletedTab — Cluster card layout for completed plans.
 * Each plan is an accordion — first open by default, one at a time.
 */
import { useState } from "react";
import {
  ArrowRotateLeft,
  Receipt1,
  Printer,
  DocumentText,
} from "iconsax-reactjs";
import { ChevronDown, MoreVertical } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { usePlanContext } from "./plan-context";
import {
  SectionFrame,
  EmptyState,
  PlanEmptyIcon,
  ClipboardTickIcon,
  formatINR,
  computePlanTotal,
  getPlanCompletionStatus,
  getServiceWorkflowStatus,
} from "./plan-shared";
import dui from "../dental-ui.module.scss";
import styles from "./CompletedTab.module.scss";

function renderStatusChip(status) {
  let cls = styles.slate;
  if (status === "completed") cls = styles.completed;
  else if (status === "in-progress") cls = styles.inProgress;
  else if (status === "no-show") cls = styles.noShow;
  else if (status === "not-interested" || status === "cancelled") cls = styles.error;

  const label =
    status === "completed"
      ? "Completed"
      : status === "in-progress"
        ? "In Progress"
        : status === "no-show"
          ? "No Show"
          : status === "not-interested"
            ? "Not Interested"
            : status === "cancelled"
              ? "Cancelled"
              : "Yet to Start";

  return (
    <span className={`${styles.statusChip} ${styles.sm} ${cls}`}>
      {label}
    </span>
  );
}

function renderPlanCompletionChip(status) {
  let cls = styles.slate;
  if (status === "completed") cls = styles.completed;
  else if (status === "partially-completed") cls = styles.inProgress;

  const label =
    status === "completed"
      ? "Completed"
      : status === "partially-completed"
        ? "Partially Completed"
        : "Not Completed";

  return (
    <span className={`${styles.statusChip} ${styles.md} ${cls}`}>
      {label}
    </span>
  );
}

function formatSurfaceLabel(surface) {
  return surface.charAt(0).toUpperCase() + surface.slice(1);
}

function buildServiceDescription(service) {
  const toothLabel =
    service.toothFdi === "full-mouth" ? "the full mouth" : service.toothLabel;
  if (service.surfaces.length === 0) {
    return `Completed for ${toothLabel}.`;
  }
  const surfaceText = service.surfaces
    .map((surface) => formatSurfaceLabel(surface))
    .join(", ");
  return `Completed for ${toothLabel} on ${surfaceText} surface${service.surfaces.length > 1 ? "s" : ""}.`;
}

// ─── Service row ───────────────────────────────────────────
function CompletedServiceRow({ service, plan, index }) {
  const { openDrawer } = usePlanContext();
  const serviceDescription = buildServiceDescription(service);
  const workflowStatus = getServiceWorkflowStatus(service);
  
  return (
    <tr className={styles.tbodyTr}>
      <td className={`${styles.td} ${styles.idx}`}>
        {index + 1}
      </td>
      <td className={styles.td}>
        <div className={styles.serviceCell}>
          <p className={styles.treatmentName}>
            {service.treatment}
          </p>
          <p className={styles.serviceDesc}>
            {serviceDescription}
          </p>
        </div>
      </td>
      <td className={styles.td}>
        <span className={styles.tdToothPill}>
          {service.toothFdi === "full-mouth" ? "Full" : `T${service.toothFdi}`}
        </span>
      </td>
      <td className={`${styles.td} ${styles.date}`}>
        {service.completedAt ?? "—"}
      </td>
      <td className={styles.td}>{renderStatusChip(workflowStatus)}</td>
      <td className={`${styles.td} ${styles.amount}`}>
        {formatINR(service.amount)}
      </td>
      <td className={`${styles.td} ${styles.actions}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild={true}>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.small}`}
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
            className={styles.dropdownContent}
          >
            <DropdownMenuItem
              onClick={() =>
                openDrawer({
                  type: "rx-preview",
                  planId: plan.id,
                  serviceId: service.id,
                })
              }
              className={styles.dropdownItem}
            >
              <DocumentText size={16} variant="Linear" />
              View Rx
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                openDrawer({
                  type: "bill-preview",
                  planId: plan.id,
                  serviceId: service.id,
                })
              }
              className={styles.dropdownItem}
            >
              <Receipt1 size={16} variant="Linear" />
              View Plan Bill
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ─── Plan Cluster Card ─────────────────────────────────────
function CompletedPlanCluster({ plan, index, isOpen, onToggle }) {
  const { dispatch, openDrawer } = usePlanContext();
  const [revertPlanOpen, setRevertPlanOpen] = useState(false);
  const total = computePlanTotal(plan.services);
  const additionalDiscount = plan.additionalDiscount ?? 0;
  const finalTotal = Math.max(0, total - additionalDiscount);
  
  return (
    <div className={styles.subCard}>
      <div
        className={styles.subCardHeader}
        onClick={() => onToggle?.()}
      >
        <div className={styles.titleGroup}>
          <div className={styles.indexWrap}>
            <span className={styles.indexText}>
              {index + 1}
            </span>
          </div>
          <div className={styles.infoCol}>
            <div>
              <h4 className={styles.planName}>
                {plan.name}
              </h4>
              <div className={styles.pillsRow}>
                {additionalDiscount > 0 && (
                <span className={`${styles.pill} ${styles.strikethrough}`}>
                  {formatINR(total)}
                </span>
              )}

              {additionalDiscount > 0 && (
                <span className={`${styles.pill} ${styles.success}`}>
                  − {formatINR(additionalDiscount)}
                </span>
              )}

              <span className={`${styles.pill} ${styles.bold}`}>
                {formatINR(finalTotal)}
              </span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.actionRow}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild={true}>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={styles.iconBtn}
              >
                <MoreVertical
                  size={20}
                  color="var(--tp-slate-500)"
                  strokeWidth={2}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={styles.dropdownContent}>
              <DropdownMenuItem
                onClick={() =>
                  openDrawer({
                    type: "bill-preview",
                    planId: plan.id,
                  })
                }
                className={styles.dropdownItem}
              >
                <Receipt1 size={16} variant="Linear" />
                View Plan Bill
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setRevertPlanOpen(true)}
                className={`${styles.dropdownItem} ${styles.warning}`}
              >
                <ArrowRotateLeft
                  size={16}
                  variant="Linear"
                  className={styles.iconWarning}
                />
                <span className={styles.textWarning}>
                  Move to Active Plans
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            aria-label={isOpen ? "Collapse plan" : "Expand plan"}
            className={styles.iconBtn}
          >
            <span className={`${styles.chevronWrap} ${isOpen ? styles.open : ""}`}>
              <ChevronDown
                size={18}
                color="var(--tp-slate-700)"
                strokeWidth={2.5}
              />
            </span>
          </button>
        </div>
      </div>
      {isOpen && (
        <div className={styles.subCardContent}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadTr}>
                  <th className={`${styles.th} ${styles.idx}`}>#</th>
                  <th className={styles.th}>Service</th>
                  <th className={`${styles.th} ${styles.tooth}`}>Tooth</th>
                  <th className={`${styles.th} ${styles.completed}`}>Completed</th>
                  <th className={`${styles.th} ${styles.status}`}>Status</th>
                  <th className={`${styles.th} ${styles.amount}`}>Amount</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {plan.services.map((svc, idx) => (
                  <CompletedServiceRow key={svc.id || idx} service={svc} plan={plan} index={idx} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TPConfirmDialog
        open={revertPlanOpen}
        onOpenChange={setRevertPlanOpen}
        title="Move Plan to Active Plans"
        warning={`This moves ${plan.name} and all its services back to active status. Appointments and visits become editable again.`}
        secondaryLabel="Cancel"
        primaryLabel="Move to Active"
        primaryTone="warning"
        onPrimary={() => {
          dispatch({
            type: "REVERT_PLAN_TO_PROGRESS",
            planId: plan.id,
          });
          setRevertPlanOpen(false);
        }}
      />
    </div>
  );
}

// ─── Tab Content ────────────────────────────────────────────
export function CompletedTab() {
  const { completedPlans } = usePlanContext();
  const [openIndex, setOpenIndex] = useState(0);
  
  if (completedPlans.length === 0) {
    return (
      <SectionFrame>
        <div className={`${dui.planClusterShell} ${styles.emptyShell}`}>
          <div className={`${dui.planClusterHeaderCompleted} ${styles.emptyHeader}`}>
            <div className={styles.titleGroup}>
              <div className={styles.headerIconWrap}>
                <ClipboardTickIcon size={24} className={styles.iconSuccess} />
              </div>
              <h3 className={styles.headerTitle}>Completed Plans</h3>
            </div>
          </div>
          <div className={`${dui.planClusterInnerSurface} ${styles.emptySurface}`}>
            <EmptyState
              icon={<PlanEmptyIcon size={120} />}
              title="No completed treatments"
              description="Treatments will appear here once they are marked as completed."
            />
          </div>
        </div>
      </SectionFrame>
    );
  }

  const grandTotal = completedPlans.reduce(
    (sum, p) => sum + Math.max(0, computePlanTotal(p.services) - (p.additionalDiscount ?? 0)),
    0
  );

  return (
    <SectionFrame>
      <div className={`${dui.planClusterShell} ${styles.emptyShell}`}>
        <div className={`${dui.planClusterHeaderCompleted} ${styles.headerContainer}`}>
          <div className={styles.titleGroup}>
            <div className={styles.headerIconWrap}>
              <ClipboardTickIcon size={24} className={styles.iconSuccess} />
            </div>
            <div>
              <h3 className={styles.headerTitle}>Completed Plans</h3>
              <div className={styles.headerTotalPill}>
                {formatINR(grandTotal)}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild={true}>
              <button type="button" className={styles.headerMoreBtn}>
                <MoreVertical size={20} color="var(--tp-slate-500)" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={styles.dropdownContent}>
              <DropdownMenuItem onClick={() => window.print()} className={styles.dropdownItem}>
                <Printer size={16} variant="Linear" />
                Print All Completed
              </DropdownMenuItem>
              <DropdownMenuItem className={styles.dropdownItem}>
                <Receipt1 size={16} variant="Linear" />
                Export Billing Summary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className={`${dui.planClusterInnerSurface} ${styles.scrollArea}`}>
          {completedPlans.map((plan, idx) => (
            <CompletedPlanCluster
              key={plan.id}
              plan={plan}
              index={idx}
              isOpen={openIndex === idx}
              onToggle={() => setOpenIndex((current) => (current === idx ? -1 : idx))}
            />
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
