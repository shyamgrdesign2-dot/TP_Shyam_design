/**
 * BillPreviewDrawer — Right-side drawer showing itemized bill.
 * Supports plan-level (all services) or single-service view.
 */
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { Building2 } from "lucide-react";
import { Printer, DocumentDownload } from "iconsax-reactjs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { getAppointmentPatient } from "../lib/appointment-patients";
import { usePlanContext } from "./plan-context";
import {
  formatINR,
  DrawerHeader,
  PLAN_DRAWER_PANEL_CLASS } from
"./plan-shared";
import styles from "./BillPreviewDrawer.module.scss";
const BILL_ACTION_ICON_CLASS = styles.actionButton;
function downloadBillAsText(
plan,
services,
subtotal,
serviceDiscount,
additionalDiscount,
total)
{
  const lines = [];
  lines.push("Bill Preview");
  lines.push("");
  lines.push(`Plan: ${plan.name}`);
  lines.push(
    `Date: ${new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })}`
  );
  lines.push("");
  lines.push("Service".padEnd(40) + "Amount");
  lines.push("-".repeat(52));
  services.forEach((svc) => {
    const toothLabel =
    svc.toothFdi === "full-mouth" ?
    "Full Mouth" :
    `T${svc.toothFdi} — ${svc.toothLabel}`;
    lines.push(`${svc.treatment} (${toothLabel})`);
    lines.push(
      `  ${formatINR(svc.rate)}${svc.discount > 0 ? `  (-${formatINR(svc.discount)})` : ""}`
    );
  });
  lines.push("-".repeat(52));
  lines.push(`Subtotal: ${formatINR(subtotal)}`);
  if (serviceDiscount > 0)
  lines.push(`Service Discount: -${formatINR(serviceDiscount)}`);
  if (additionalDiscount > 0)
  lines.push(`Additional Discount: -${formatINR(additionalDiscount)}`);
  lines.push(`Total:    ${formatINR(total)}`);
  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bill-${plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export function BillPreviewDrawer() {
  const { state, closeDrawer } = usePlanContext();
  const drawer = state.drawer;
  const isOpen = drawer.type === "bill-preview";
  const planId = isOpen ? drawer.planId : null;
  const serviceId = isOpen ? drawer.serviceId : undefined;
  const plan = planId ? state.plans.find((p) => p.id === planId) : null;
  const services = plan ?
  serviceId ?
  plan.services.filter((s) => s.id === serviceId) :
  plan.services :
  [];
  const subtotal = services.reduce((sum, s) => sum + s.rate, 0);
  const serviceDiscount = services.reduce((sum, s) => sum + s.discount, 0);
  const additionalDiscount = plan ? plan.additionalDiscount ?? 0 : 0;
  // Only apply plan-level discount when showing all services (not single-service view)
  const effectiveAdditionalDiscount = serviceId ? 0 : additionalDiscount;
  const afterServiceDiscount = services.reduce((sum, s) => sum + s.amount, 0);
  const total = Math.max(0, afterServiceDiscount - effectiveAdditionalDiscount);
  const action =
  <div className={styles.actionWrapper}>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild={true}>
          <button
          type="button"
          onClick={() =>
          plan &&
          downloadBillAsText(
            plan,
            services,
            subtotal,
            serviceDiscount,
            effectiveAdditionalDiscount,
            total
          )}

          className={BILL_ACTION_ICON_CLASS}
          aria-label="Download bill">

            <DocumentDownload size={18} variant="Linear" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Download bill
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild={true}>
          <button
          type="button"
          onClick={() => window.print()}
          className={BILL_ACTION_ICON_CLASS}
          aria-label="Print bill">

            <Printer size={18} variant="Linear" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Print bill
        </TooltipContent>
      </Tooltip>
    </div>;


  return (
    <TPDrawer open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <TPDrawerContent
        side="right"
        size="lg"
        className={`${PLAN_DRAWER_PANEL_CLASS} ${styles.drawerPanel}`}>

        <DrawerHeader
          title="Bill Preview"
          onClose={closeDrawer}
          action={action} />


        <div className={styles.drawerBody}>
          {plan &&
          (() => {
            const patient = getAppointmentPatient(plan.patientId || "apt-1");
            const today = new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric"
            });
            return (
              <div className={styles.documentPaper}>
                  <div className={styles.letterhead}>
                    <div className={styles.clinicLogo}>
                      <Building2 size={26} strokeWidth={1.6} />
                    </div>
                    <div className={styles.clinicInfo}>
                      <p className={styles.clinicName}>
                        TP Dental Care
                      </p>
                      <p className={styles.doctorName}>
                        Dr. Umesh Aggarwal, BDS, MDS
                      </p>
                      <p className={styles.clinicDetails}>
                        Reg. ID: DCI-2342342 | +91 78945 61230
                      </p>
                      <p className={styles.clinicDetails}>
                        K9 Sardar Bungalow, Prahladnagar, Ahmedabad
                      </p>
                    </div>
                  </div>
                  <div className={styles.divider} aria-hidden={true} />
                  <div className={styles.patientContext}>
                    <p>
                      <span className={styles.labelBold}>
                        Patient Name:
                      </span>{" "}
                      {patient.name}
                    </p>
                    <p>
                      <span className={styles.labelBold}>
                        Patient ID:
                      </span>{" "}
                      {patient.patientCode}
                    </p>
                    <p>
                      <span className={styles.labelBold}>
                        Age / Sex:
                      </span>{" "}
                      {patient.age} Y, {patient.genderLabel}
                    </p>
                    <p>
                      <span className={styles.labelBold}>
                        Mobile:
                      </span>{" "}
                      {patient.mobile.replace(/^\+91-/, "")}
                    </p>
                    <p>
                      <span className={styles.labelBold}>
                        Plan:
                      </span>{" "}
                      {plan.name}
                    </p>
                    <p>
                      <span className={styles.labelBold}>
                        Date:
                      </span>{" "}
                      {today}
                    </p>
                  </div>
                  {serviceId &&
                <p className={styles.limitedServiceNotice}>
                      Showing single service bill
                    </p>}


                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr className={styles.tableHeadRow}>
                          <th className={styles.tableHeadCell}>
                            Service
                          </th>
                          <th className={styles.tableHeadCellAmount}>
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((svc) =>
                      <tr className={styles.tableRow}>
                            <td className={styles.tableCell}>
                              <p className={styles.serviceName}>
                                {svc.treatment}
                              </p>
                              <p className={styles.serviceMeta}>
                                {svc.toothFdi === "full-mouth" ?
                            "Full Mouth" :
                            `T${svc.toothFdi} — ${svc.toothLabel}`}
                              </p>
                            </td>
                            <td className={styles.tableCellAmount}>
                              {formatINR(svc.rate)}
                              {svc.discount > 0 &&
                          <p className={styles.discountText}>
                                  -{formatINR(svc.discount)}
                                </p>}

                            </td>
                          </tr>
                      )}
                      </tbody>
                    </table>
                    <div className={styles.summaryContainer}>
                      <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Subtotal</span>
                        <span className={styles.summaryValue}>
                          {formatINR(subtotal)}
                        </span>
                      </div>
                      {serviceDiscount > 0 &&
                    <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>
                            Service Discount
                          </span>
                          <span className={styles.summaryValueError}>
                            -{formatINR(serviceDiscount)}
                          </span>
                        </div>}


                      {effectiveAdditionalDiscount > 0 &&
                    <div className={styles.summaryRow}>
                          <span className={styles.summaryLabel}>
                            Additional Discount
                          </span>
                          <span className={styles.summaryValueSuccess}>
                            -{formatINR(effectiveAdditionalDiscount)}
                          </span>
                        </div>}


                      <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Total</span>
                        <span className={styles.totalValue}>
                          {formatINR(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>);

          })()}
        </div>
      </TPDrawerContent>
    </TPDrawer>);

}