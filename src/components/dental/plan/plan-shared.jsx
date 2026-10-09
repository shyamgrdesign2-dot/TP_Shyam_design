/**
 * plan-shared.tsx — Shared sub-components for the Treatment Plan module.
 */
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import dui from "../dental-ui.module.scss";
import { usePlanContext } from "./plan-context";
import {
  SURFACE_ABBR,
  SURFACE_COLORS,
  getPlanSurfaceLabel,
} from "./plan-types";
const cx = (...classes) => classes.filter(Boolean).join(" ");
/** Standard width (600px) for Dental Treatment Plan right drawers (bill, Rx, booking, visits, etc.). */
export const PLAN_DRAWER_PANEL_CLASS = dui.planDrawerPanel;
/** Wider width (1040px) for the Create / Edit Plan drawer — it hosts a wider
 * services table than the preview / booking drawers and needs more room. */
export const PLAN_DRAWER_WIDE_PANEL_CLASS = dui.planDrawerWidePanel;

const SURFACE_GAP_CLASS_MAP = {
  "gap-[3px]": dui.surfaceTagGap3,
  "gap-[4px]": dui.surfaceTagGap4,
};
/** Abbreviated surface pills with hover ring + tooltip (full surface name). */
export function PlanSurfaceAbbrTags({
  surfaces,
  gapClass = "gap-[3px]",
  wrap = false,
  maxCount,
}) {
  if (!surfaces?.length) return null;
  const resolvedGapClass = SURFACE_GAP_CLASS_MAP[gapClass] ?? dui.surfaceTagGap3;
  const rowClass = cx(
    dui.surfaceTagRow,
    wrap ? dui.surfaceTagRowWrap : "",
    resolvedGapClass,
  );
  const hasLimit = typeof maxCount === "number" && surfaces.length > maxCount;
  const visibleSurfaces = hasLimit ? surfaces.slice(0, maxCount) : surfaces;
  const overflowCount = hasLimit ? surfaces.length - maxCount : 0;

  return (
    <div className={rowClass}>
      {visibleSurfaces.map((z, i) => {
        const label = getPlanSurfaceLabel(z);
        const abbr =
          SURFACE_ABBR[z] ??
          (typeof z === "string" ? z.charAt(0).toUpperCase() : "?");
        const bg = SURFACE_COLORS[z] ?? "#94a3b8";
        return (
          <Tooltip key={z} delayDuration={200}>
            <TooltipTrigger asChild={true}>
              <span
                tabIndex={0}
                className={dui.surfaceChip}
                style={{
                  background: bg,
                }}
              >
                {abbr}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {label}
            </TooltipContent>
          </Tooltip>
        );
      })}
      {overflowCount > 0 && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "#94a3b8",
            fontWeight: "500",
            marginLeft: "2px",
          }}
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
}
// ─── Currency formatter ─────────────────────────────────────
export function formatINR(amount) {
  return `₹${(Number(amount) || 0).toLocaleString("en-IN")}`;
}
export function TabPill({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${dui.tabPill} ${active ? dui.tabPillActive : ""}`}
    >
      {label}
      <span
        className={`${dui.tabPillCount} ${active ? dui.tabPillCountActive : ""}`}
      >
        {count}
      </span>
    </button>
  );
}
export function SectionFrame({ children, className }) {
  const { embedInPatientShell } = usePlanContext();
  return (
    <div
      className={`${dui.sectionFrame} ${
        embedInPatientShell ? dui.sectionFrameEmbed : ""
      } ${className || ""}`}
    >
      {children}
    </div>
  );
}
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className={dui.emptyState}>
      <div className={dui.emptyIcon}>{icon}</div>
      <div>
        <p className={dui.emptyTitle}>{title}</p>
        <p className={dui.emptyDesc}>{description}</p>
      </div>
      {action && <div className={dui.emptyAction}>{action}</div>}
    </div>
  );
}
// ─── Plan empty-state illustration (folder w/ lined paper) ──
// Shared across every "nothing here yet" surface in the plan module:
// plan estimates, active plans, completed plans, and the per-service
// "no visits yet" tile inside an active service card.
// Flat neutral grays — bulk / solid fills, no colored gradients.
export function PlanEmptyIcon({ size = 112, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden={true}
      className={className}
    >
      <path
        d="M71.9803 14.6484H9.57474C8.73282 14.649 7.92552 14.9836 7.33019 15.579C6.73486 16.1743 6.40018 16.9816 6.39966 17.8235V75.0812C6.40018 75.9231 6.73486 76.7304 7.33019 77.3258C7.92552 77.9211 8.73282 78.2558 9.57474 78.2563H71.9803C72.8223 78.2559 73.6297 77.9212 74.2251 77.3259C74.8205 76.7305 75.1552 75.9232 75.1557 75.0812V17.8235C75.1552 16.9815 74.8205 16.1742 74.2251 15.5789C73.6297 14.9835 72.8223 14.6489 71.9803 14.6484Z"
        fill="#C8CED6"
      />

      <path
        d="M67.8722 58.3622H13.6836C11.9302 58.3622 10.5085 56.9406 10.5085 55.1871V4.59696C10.5085 2.84351 11.9302 1.42188 13.6836 1.42188H67.8722C69.6256 1.42188 71.0472 2.84351 71.0472 4.59696V55.1871C71.0472 56.9406 69.6256 58.3622 67.8722 58.3622Z"
        fill="#FFFFFF"
      />

      <path
        d="M61.2048 12.1094H20.3513V14.4376H61.2048V12.1094ZM61.2048 20.9992H20.3513V23.3274H61.2048V20.9992ZM61.2048 29.891H20.3513V32.2192H61.2048V29.891ZM61.2048 38.7808H20.3513V41.1094H61.2048V38.7808Z"
        fill="#E4E7EB"
      />

      <path
        d="M25.2197 31.2656L35.4856 41.5319H25.2197V31.2656Z"
        fill="#B9C0CA"
      />

      <path
        d="M75.1559 42.3779V18.7573L71.0474 14.6484V42.3776H75.1559V42.3779Z"
        fill="#B9C0CA"
      />

      <path
        d="M79.9682 44.5123L75.5416 75.8474C75.3203 77.4139 73.9796 78.5782 72.3977 78.5782H9.15767C7.57571 78.5782 6.23505 77.4139 6.01374 75.8474L0.0317719 33.5061C-0.238064 31.5946 1.24521 29.8867 3.17571 29.8867H22.7055C24.2875 29.8867 25.6282 31.051 25.8495 32.6172L26.6334 38.1621C26.8547 39.7287 28.1954 40.8929 29.7773 40.8929H76.8249C78.7547 40.8929 80.2383 42.6008 79.9685 44.5123H79.9682Z"
        fill="#DEE3EA"
      />

      <path
        d="M64.2844 64.6016H17.2716C17.0139 64.6015 16.7651 64.5074 16.5718 64.337C16.3785 64.1667 16.2539 63.9316 16.2214 63.676L15.6332 59.0189C15.6145 58.87 15.6278 58.7187 15.672 58.5752C15.7162 58.4317 15.7904 58.2993 15.8897 58.1867C15.9891 58.0741 16.1112 57.9839 16.248 57.922C16.3848 57.8602 16.5333 57.8282 16.6834 57.8281H64.8726C65.0227 57.8282 65.1711 57.8602 65.308 57.922C65.4448 57.9839 65.5669 58.0741 65.6662 58.1867C65.7655 58.2993 65.8398 58.4316 65.884 58.5752C65.9282 58.7187 65.9414 58.87 65.9227 59.0189L65.3345 63.676C65.3021 63.9316 65.1775 64.1667 64.9842 64.337C64.7909 64.5074 64.5421 64.6015 64.2844 64.6016Z"
        fill="#CCD2DB"
      />
    </svg>
  );
}
// ─── Clipboard-tick icon (for completed state) ─────────────
export function ClipboardTickIcon({ size = 24, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        opacity="0.4"
        d="M16.24 3.65039H7.76004C5.29004 3.65039 3.29004 5.66039 3.29004 8.12039V17.5304C3.29004 19.9904 5.30004 22.0004 7.76004 22.0004H16.23C18.7 22.0004 20.7 19.9904 20.7 17.5304V8.12039C20.71 5.65039 18.7 3.65039 16.24 3.65039Z"
      />

      <path d="M14.3498 2H9.64977C8.60977 2 7.75977 2.84 7.75977 3.88V4.82C7.75977 5.86 8.59977 6.7 9.63977 6.7H14.3498C15.3898 6.7 16.2298 5.86 16.2298 4.82V3.88C16.2398 2.84 15.3898 2 14.3498 2Z" />
      <path d="M10.81 16.9506C10.62 16.9506 10.43 16.8806 10.28 16.7306L8.78 15.2306C8.49 14.9406 8.49 14.4606 8.78 14.1706C9.07 13.8806 9.55 13.8806 9.84 14.1706L10.81 15.1406L14.28 11.6706C14.57 11.3806 15.05 11.3806 15.34 11.6706C15.63 11.9606 15.63 12.4406 15.34 12.7306L11.34 16.7306C11.2 16.8806 11 16.9506 10.81 16.9506Z" />
    </svg>
  );
}
// ─── Close square icon (shared across drawers) ─────────────
export function CloseSquareIcon({ size = 24, color = "var(--tp-slate-700)" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" />
    </svg>
  );
}
export function DrawerHeader({ title, onClose, action, titleClassName }) {
  return (
    <div className={dui.drawerHeader}>
      <button type="button" onClick={onClose} className={dui.drawerCloseBtn}>
        <CloseSquareIcon size={24} color="var(--tp-slate-700)" />
      </button>
      <div className={dui.drawerDivider} />
      <h2 className={`${dui.drawerTitle} ${titleClassName || ""}`}>{title}</h2>
      {action && <div className={dui.drawerAction}>{action}</div>}
    </div>
  );
}
export function computePlanTotal(services) {
  return services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
}
export function computePlanDiscount(services) {
  return services.reduce((sum, s) => sum + s.discount, 0);
}
export function getServiceWorkflowStatus(service) {
  if (!service) return "not-started";
  if (service.status === "completed") return "completed";
  if (service.status === "no-show") return "no-show";
  if (service.status === "not-interested") return "not-interested";
  if (service.status === "cancelled") return "cancelled";
  if (service.status === "refund") return "refund";
  if (service.status === "in-progress") return "in-progress";
  // Booked appointments do NOT count as activity — scheduling a visit is
  // intent, not execution. Consultations (Rx / end visit), sittings, or
  // procedures count as activity for the workflow chip.
  const consultCount = service.consultations?.length ?? 0;
  const sittingsCount = service.sittings?.length ?? 0;
  const proceduresCount = service.procedures?.length ?? 0;
  const hasActivity =
    consultCount > 0 ||
    sittingsCount > 0 ||
    proceduresCount > 0;
  return hasActivity ? "in-progress" : "not-started";
}
export function getPlanCompletionStatus(services) {
  if (services.length === 0) return "not-completed";
  const completedCount = services.filter(
    (s) => s.status === "completed",
  ).length;
  if (completedCount === 0) return "not-completed";
  if (completedCount === services.length) return "completed";
  return "partially-completed";
}

/** Return path after RxPad so the user lands back on the dental plan. */
export function buildPlanRxReturnPath(embedInPatientShell, patientId) {
  if (embedInPatientShell) {
    const q = new URLSearchParams({
      patientId,
      nav: "dental-plan",
      planTab: "progress",
    });
    return `/patient-detail?${q.toString()}`;
  }
  const q = new URLSearchParams({
    patientId,
    tab: "progress",
  });
  return `/treatment-plan?${q.toString()}`;
}
/** Opens RxPad with plan context; `returnTo` returns user to the dental plan they came from. */
export function buildConsultationRxUrl(
  patientId,
  planId,
  serviceId,
  appointmentId,
  embedInPatientShell,
  treatmentName,
) {
  const p = new URLSearchParams();
  p.set("patientId", patientId);
  p.set("planId", planId);
  p.set("serviceId", serviceId);
  if (appointmentId) p.set("appointmentId", appointmentId);
  p.set("returnTo", buildPlanRxReturnPath(embedInPatientShell, patientId));
  if (treatmentName) p.set("ctxTreatment", treatmentName);
  return `/rxpad?${p.toString()}`;
}
