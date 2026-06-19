import { Building2 } from "lucide-react";
import { Printer, DocumentDownload } from "iconsax-reactjs";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { getAppointmentPatient } from "../lib/appointment-patients";
import { usePlanContext } from "./plan-context";
import { DrawerHeader, PLAN_DRAWER_PANEL_CLASS } from "./plan-shared";
import styles from "./RxPreviewDrawer.module.scss";

function formatProcedureStatus(status) {
  switch (status) {
    case "completed":
      return "Completed";
    case "in-progress":
      return "In progress";
    case "not-started":
      return "Not started";
    case "no-show":
      return "Patient no-show";
    case "not-interested":
      return "Not interested";
    default:
      return status ? String(status).replace(/-/g, " ") : "—";
  }
}

function serviceToothLine(svc) {
  if (svc.toothFdi === "full-mouth") return "Full mouth";
  return `T${svc.toothFdi} — ${svc.toothLabel}`;
}

export function RxPreviewDrawer() {
  const { state, closeDrawer, patientId: ctxPatientId } = usePlanContext();
  const drawer = state.drawer;
  const isOpen = drawer.type === "rx-preview";
  const planId = isOpen ? drawer.planId : null;
  const serviceId = isOpen ? drawer.serviceId : undefined;
  const plan = planId ? state.plans.find((p) => p.id === planId) : null;
  const services = plan ?
  serviceId ?
  plan.services.filter((s) => s.id === serviceId) :
  plan.services :
  [];

  const patient = plan ?
  getAppointmentPatient(plan.patientId || ctxPatientId || "apt-1") :
  null;

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const mobileDisplay = patient?.mobile?.replace(/^\+91-/, "") ?? "—";

  return (
    <TPDrawer open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <TPDrawerContent
        side="right"
        size="lg"
        className={`${PLAN_DRAWER_PANEL_CLASS} ${styles.drawerPanel}`}>

        <DrawerHeader
          title="Dental prescription"
          onClose={closeDrawer}
          action={
          <div className={styles.actionWrapper}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                  type="button"
                  onClick={() => window.print()}
                  className={styles.actionButton}
                  aria-label="Download Rx">

                    <DocumentDownload size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Download Rx
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                  type="button"
                  onClick={() => window.print()}
                  className={styles.actionButton}
                  aria-label="Print Rx">

                    <Printer size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Print Rx
                </TooltipContent>
              </Tooltip>
            </div>} />



        <div className={styles.drawerBody}>
          {plan && patient &&
          <article className={styles.documentPaper}>
              {/* Letterhead — same clinic block as bill preview */}
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
              <div className={styles.divider} aria-hidden />
              {/* Patient + visit context — continuous with letterhead (no separate card) */}
              <div className={styles.patientContext}>
                <p>
                  <span className={styles.labelBold}>
                    Patient name:
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
                    Age / sex:
                  </span>{" "}
                  {patient.age} Y, {patient.genderLabel}
                </p>
                <p>
                  <span className={styles.labelBold}>
                    Mobile:
                  </span>{" "}
                  {mobileDisplay}
                </p>
                <p>
                  <span className={styles.labelBold}>
                    Blood group:
                  </span>{" "}
                  {patient.bloodGroup}
                </p>
                <p>
                  <span className={styles.labelBold}>Date:</span>{" "}
                  {today}
                </p>
                <p className={styles.colSpan2}>
                  <span className={styles.labelBold}>
                    Treatment plan:
                  </span>{" "}
                  {plan.name}
                </p>
              </div>
              {serviceId &&
            <p className={styles.limitedServiceNotice}>
                  Prescription limited to the selected service line.
                </p>}


              <div className={styles.divider} aria-hidden />
              {/* Prescription body — inside same sheet */}
              <div className={styles.rxBody}>
                <div className={styles.rxHeader}>
                  <span className={styles.rxSymbol}>
                    ℞
                  </span>
                  <div className={styles.clinicInfo}>
                    <p className={styles.rxTitle}>
                      Clinical procedures (treatment record)
                    </p>
                    <p className={styles.rxSubtitle}>
                      Step-wise procedures performed or planned under this
                      treatment plan. For charting, billing alignment, and
                      medico-legal documentation.
                    </p>
                  </div>
                </div>
                <div className={styles.serviceList}>
                  {services.map((svc, svcIdx) => {
                  const procs = svc.procedures ?? [];
                  return (
                    <div
                      key={svc.id}
                      className={svcIdx > 0 ? styles.serviceItem : ""}>


                        <p className={styles.serviceItemTitle}>
                          {svc.treatment}
                          <span className={styles.serviceItemSubtitle}>
                            ({serviceToothLine(svc)})
                          </span>
                        </p>
                        {procs.length === 0 ?
                      <p className={styles.noProceduresText}>
                            No step-wise procedures recorded for this line yet.
                          </p> :

                      <ol className={styles.procedureList}>
                            {procs.map((p) =>
                        <li key={p.id} className={styles.procedureItem}>
                                <span className={styles.procedureName}>
                                  {p.name}
                                </span>
                                <span className={styles.procedureMeta}>
                                  {" "}
                                  — {p.date || "—"} · {p.doctor || "—"} ·{" "}
                                  {formatProcedureStatus(p.status)}
                                </span>
                                {p.notes ?
                          <span className={styles.procedureNotes}>
                                    {p.notes}
                                  </span> :
                          null}
                              </li>
                        )}
                          </ol>}

                      </div>);

                })}
                </div>
              </div>
              <div className={styles.footer}>
                <div className={styles.signatureWrapper}>
                  <div className={styles.signatureBox}>
                    <div className={styles.signatureSpace} aria-hidden />
                    <div className={styles.signatureLine} />
                    <p className={styles.signatureLabel}>
                      Authorised signatory / treating dentist
                    </p>
                  </div>
                </div>
              </div>
              <div className={styles.footerBranding}>
                support@tpdentalcare.com | www.tpdentalcare.com
              </div>
            </article>}

        </div>
      </TPDrawerContent>
    </TPDrawer>);

}