/**
 * PlanEstimatesTab — Cluster card layout.
 * Outer shell: rounded-[16px], bg-white, NO stroke.
 * Plan sub-cards: white bg with rounded-[12px], subtle 0.5px neutral stroke.
 * Each plan card is an accordion — first open by default, one at a time.
 */
import { useState } from "react";
import dayjs from "dayjs";
import { fdiToLabel } from "./exam-suggestions";
import {
  Add,
  Printer,
  Copy,
  Trash,
  Edit2,
  Receipt1,
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
  formatINR,
  computePlanTotal,
  PlanSurfaceAbbrTags,
} from "./plan-shared";
import dui from "../dental-ui.module.scss";
import styles from "./PlanEstimatesTab.module.scss";
import { useChikitsalay } from "../../../pages/chikitsalay/useChikitsalay";

// ─── Plan Sub-Card ────────────────────────────────────────────
function PlanSubCard({ plan, index, isOpen, onToggle }) {
  const { activatePlan, duplicatePlan, deletePlan, openDrawer, navigateTab } = usePlanContext();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const isSessionPendingPlan = Boolean(plan.isSessionPending);
  const total = computePlanTotal(plan.services);
  const isChikitsalayAccessable = useChikitsalay();
  
  const handleActivateClick = () => {
    setStartOpen(true);
  };
  
  const handleActivate = () => {
    activatePlan(plan.id);
    openDrawer({ type: "closed" });
    setStartOpen(false);
    showSnackbar(`"${plan.name}" is now active and moved to Active Plans`);
    setTimeout(() => navigateTab?.("progress"), 400);
  };

  const handleDuplicate = () => duplicatePlan(plan.id);

  const handleDelete = () => {
    deletePlan(plan.id);
    setDeleteOpen(false);
  };
  
  const handleEdit = () =>
    openDrawer({
      type: "edit-plan",
      planId: plan.id,
    });

  return (
    <div className={styles.subCard}>
      <div
        className={styles.subCardHeader}
        onClick={(e) => {
          if (e.target.closest("button") || e.target.closest("a")) return;
          onToggle?.();
        }}
        // onClick={() => onToggle?.()}
      >
        <div className={styles.indexWrap}>
          <span className={styles.indexText}>
            {index + 1}
          </span>
        </div>
        <div className={styles.infoCol}>
          <p className={styles.planName}>
            {plan.name}
          </p>
          <div className={styles.amountPill}>
            {formatINR(total)}
          </div>
        </div>
        <div className={styles.actionRow}>
          {!isSessionPendingPlan && !isChikitsalayAccessable && (
          <button
            type="button"
            // onClick={handleActivateClick}
            onClick={(e) => {
              e.stopPropagation();
              handleActivateClick();
            }}
            className={styles.activateBtn}
          >
            Activate Plan
          </button>
          )}
          {!isSessionPendingPlan && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild={true}>
              <button
                type="button"
                className={styles.iconBtn}
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
              className={`${styles.dropdownContent} ${styles.small}`}
            >
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
                onClick={handleEdit}
                className={styles.dropdownItem}
              >
                <Edit2 size={16} variant="Linear" />
                Edit Plan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDuplicate}
                className={styles.dropdownItem}
              >
                <Copy size={16} variant="Linear" />
                Duplicate Plan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className={`${styles.dropdownItem} ${styles.destructive}`}
              >
                <Trash
                  size={20}
                  variant="Linear"
                  className={styles.iconDanger}
                />
                Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
          <button
            type="button"
            onClick={onToggle}
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
      {isOpen && plan.services.length > 0 && (
        <div className={styles.subCardContent}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: 36, minWidth: 36 }} />
                <col />
                <col style={{ width: 70, minWidth: 70 }} />
                <col style={{ width: 120, minWidth: 120 }} />
                <col style={{ width: 90, minWidth: 90 }} />
                <col style={{ width: 80, minWidth: 80 }} />
                <col style={{ width: 60, minWidth: 60 }} />
                <col style={{ width: 80, minWidth: 80 }} />
              </colgroup>
              <thead>
                <tr className={styles.theadTr}>
                  <th className={`${styles.th} ${styles.idx}`}>#</th>
                  <th className={styles.th}>Service</th>
                  <th className={`${styles.th} ${styles.tooth}`}>Tooth</th>
                  <th className={`${styles.th} ${styles.surface}`}>Surface</th>
                  <th className={`${styles.th} ${styles.surgeryDate}`}>Surgery Date</th>
                  <th className={`${styles.th} ${styles.rate}`}>Rate/Tooth</th>
                  <th className={`${styles.th} ${styles.disc}`}>Discount</th>
                  <th className={`${styles.th} ${styles.amount}`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {plan.services.map((svc, idx) => {
                  const teeth = svc.teeth?.length > 0 ? svc.teeth : [svc.toothFdi];
                  const isFullMouth = teeth.includes("full-mouth");
                  const isMaxillary = teeth.includes("maxillary");
                  const isMandibular = teeth.includes("mandibular");
                  const isArchScope = isFullMouth || isMaxillary || isMandibular;
                  const teethCount = isArchScope ? 1 : teeth.length;
                  const surgeryDate = svc.procedureDate
                    ? dayjs(svc.procedureDate).format("D MMM YY")
                    : null;
                  const archPillLabel = isFullMouth
                    ? (isChikitsalayAccessable ? "88" : "Full")
                    : isMaxillary
                      ? (isChikitsalayAccessable ? "86" : "Max")
                      : isMandibular
                        ? (isChikitsalayAccessable ? "87" : "Mand")
                        : null;
                  
                  return (
                    <tr key={idx} className={styles.tbodyTr}>
                      <td className={`${styles.td} ${styles.idx}`}>
                        {idx + 1}
                      </td>
                      <td className={styles.td}>
                        <div className={styles.serviceCell}>
                          <p className={styles.treatmentName}>{svc.treatment}</p>
                          {teethCount > 1 ? (
                            <p className={styles.toothMeta}>{teethCount} teeth</p>
                          ) : teethCount === 1 && !isArchScope ? (
                            <p className={styles.toothMeta}>{fdiToLabel(teeth[0])}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className={styles.td}>
                        {archPillLabel ? (
                          <span className={styles.tdToothPill}>{archPillLabel}</span>
                        ) : teethCount > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {teeth.map(fdi => (
                              <span key={fdi} className={styles.tdToothPill}>T{fdi}</span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--tp-slate-300)" }}>—</span>
                        )}
                      </td>
                      <td className={styles.td}>
                        {svc.surfaces && svc.surfaces.length > 0 ? (
                          <PlanSurfaceAbbrTags surfaces={svc.surfaces} />
                        ) : (
                          <span style={{ color: "var(--tp-slate-300)" }}>—</span>
                        )}
                      </td>
                      <td className={`${styles.td} ${styles.surgeryDate}`}>
                        {surgeryDate ? (
                          <span>{surgeryDate}</span>
                        ) : (
                          <span style={{ color: "var(--tp-slate-300)" }}>—</span>
                        )}
                      </td>
                      <td className={`${styles.td} ${styles.rate}`}>
                        {formatINR(svc.rate)}
                        {teethCount > 1 ? (
                          <span style={{ color: "var(--tp-slate-400)", fontSize: "11px", marginLeft: "4px" }}>
                            ×{teethCount}
                          </span>
                        ) : null}
                      </td>
                      <td className={`${styles.td} ${styles.disc}`}>
                        {svc.computedDiscount > 0 ? `-${formatINR(svc.computedDiscount)}` : "—"}
                      </td>
                      <td className={`${styles.td} ${styles.amount}`}>
                        {formatINR(svc.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {(plan.additionalDiscount ?? 0) > 0 && (
                  <tr className={styles.tfootTr}>
                    <td colSpan={7} className={styles.tfootLabel}>
                      Subtotal
                    </td>
                    <td className={styles.tfootValue}>
                      {formatINR(total)}
                    </td>
                  </tr>
                )}
                {(plan.additionalDiscount ?? 0) > 0 && (
                  <tr className={styles.tfootTr}>
                    <td colSpan={7} className={`${styles.tfootLabel} ${styles.success}`}>
                      Additional discount
                    </td>
                    <td className={`${styles.tfootValue} ${styles.success}`}>
                      − {formatINR(plan.additionalDiscount)}
                    </td>
                  </tr>
                )}
                <tr className={`${styles.tfootTr} ${
                  (plan.additionalDiscount ?? 0) > 0 ? styles.withDiscount : styles.final
                }`}>
                  <td colSpan={7} className={`${styles.tfootLabel} ${styles.final}`}>
                    {(plan.additionalDiscount ?? 0) > 0 ? "Final Total" : "Plan Total"}
                  </td>
                  <td className={`${styles.tfootValue} ${styles.final}`}>
                    {formatINR(Math.max(0, total - (plan.additionalDiscount ?? 0)))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      {isOpen && plan.services.length === 0 && (
        <div className={styles.emptyPlanNote}>
          No services added yet. Edit this plan to add services.
        </div>
      )}
      <TPConfirmDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        title="Activate Plan"
        warning={`Activates ${plan.name}. All ${plan.services.length} service${plan.services.length === 1 ? "" : "s"} will move to the active-plans list.`}
        secondaryLabel="Cancel"
        primaryLabel="Activate Plan"
        primaryTone="success"
        onPrimary={handleActivate}
      />
      <TPConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Plan"
        warning={`Deletes ${plan.name} and all ${plan.services.length} service${plan.services.length === 1 ? "" : "s"}. This action cannot be undone.`}
        secondaryLabel="Cancel"
        primaryLabel="Delete"
        primaryTone="destructive"
        onPrimary={handleDelete}
      />
    </div>
  );
}

// ─── Snackbar helper ───────────────────────────────────────
function showSnackbar(message, variant = "info") {
  const bgColor = variant === "warning" ? "#dc6803" : "#1e293b";
  const el = document.createElement("div");
  // Keep some core positioning in Tailwind for quick port, but ideally these move to a global snackbar system
  el.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[9999] inline-flex items-center gap-3 rounded-[12px] border border-white/25 px-5 py-3 font-['Inter',sans-serif] text-[14px] font-medium text-white transition-all animate-in fade-in slide-in-from-top-4";
  el.style.background = bgColor;
  el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><path d="M12 9v4" stroke="white" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="16" r="0.75" fill="white"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${message}</span>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -8px)";
    el.style.transition = "all 300ms ease";
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ─── Tab Content ───────────────────────────────────────────
export function PlanEstimatesTab() {
  const { estimatePlans, openDrawer } = usePlanContext();
  const [openIndex, setOpenIndex] = useState(0);
  const isChikitsalayAccessable = useChikitsalay();

  if (estimatePlans.length === 0) {
    return (
      <SectionFrame>
        <div className={`${dui.planClusterShell} ${styles.emptyShell}`}>
          <div className={`${dui.planClusterHeaderEstimates} ${styles.emptyHeader}`}>
            <div className={styles.titleGroup}>
              <div className={styles.iconWrap}>
                <DocumentText size={24} variant="Bulk" className={styles.iconBlue} />
              </div>
              <h3 className={styles.title}>Plan Estimates</h3>
            </div>
          </div>
          {!isChikitsalayAccessable && <div className={`${dui.planClusterInnerSurface} ${styles.emptySurface}`}>
            <EmptyState
              icon={<PlanEmptyIcon size={120} />}
              title="No treatment plans yet"
              description="Create a new plan to start estimating treatments for this patient."
              action={
                <button
                  type="button"
                  onClick={() => openDrawer({ type: "add-plan" })}
                  className={`${styles.createBtn} ${styles.large}`}
                >
                  <Add size={20} variant="Linear" />
                  Create Plan
                </button>
              }
            />
          </div>}
        </div>
      </SectionFrame>
    );
  }

  const grandTotal = estimatePlans.reduce(
    (sum, p) => sum + Math.max(0, computePlanTotal(p.services) - (p.additionalDiscount ?? 0)),
    0
  );

  return (
    <SectionFrame>
      <div className={`${dui.planClusterShell} ${styles.emptyShell}`}>
        <div className={`${dui.planClusterHeaderEstimates} ${styles.headerContainer}`}>
          <div className={styles.titleGroup}>
            <div className={styles.iconWrap}>
              <DocumentText size={24} variant="Bulk" className={styles.iconBlue} />
            </div>
            <div>
              <h3 className={styles.title}>Plan Estimates</h3>
              <div className={styles.headerTotalPill}>
                {formatINR(grandTotal)}
              </div>
            </div>
          </div>
          <div className={styles.btnGroup}>
            {!isChikitsalayAccessable && <button
              type="button"
              onClick={() => openDrawer({ type: "add-plan" })}
              className={styles.createBtn}
            >
              <Add size={20} variant="Linear" />
              Create Plan
            </button>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild={true}>
                <button type="button" className={styles.moreBtn}>
                  <MoreVertical size={20} color="var(--tp-slate-500)" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={styles.dropdownContent}>
                {/* <DropdownMenuItem onClick={() => window.print()} className={styles.dropdownItem}>
                  <Printer size={16} variant="Linear" />
                  Print All Estimates
                </DropdownMenuItem> */}
                <DropdownMenuItem
                  onClick={() =>
                    openDrawer({
                      type: "bill-preview",
                      mode: "combined",
                    })
                  }
                  className={styles.dropdownItem}
                >
                  <Receipt1 size={16} variant="Linear" />
                  View Combined Bill
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className={`${dui.planClusterInnerSurface} ${styles.scrollArea}`}>
          {estimatePlans.map((plan, idx) => (
            <PlanSubCard
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

