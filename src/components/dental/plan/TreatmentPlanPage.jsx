/**
 * TreatmentPlanPage — Standalone full-page layout for dental treatment planning.
 * Has its own header with back button and title. No RxPad shell dependency.
 */
import { Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import dui from "../dental-ui.module.scss";
import { TreatmentPlanTab } from "./TreatmentPlanTab";
import { getMockPlans } from "./plan-mock-data";
import styles from "./TreatmentPlanPage.module.scss";

function getInitialDrawer(drawerParam, tab, plans) {
  if (!drawerParam)
    return {
      type: "closed",
    };
  const inProgressPlan = plans.find((plan) => plan.status === "in-progress");
  const completedPlan = plans.find((plan) => plan.status === "completed");
  const firstServiceFrom = (plan) => plan?.services?.[0];
  if (drawerParam === "add-plan")
    return {
      type: "add-plan",
    };
  if (drawerParam === "edit-plan")
    return plans[0]
      ? {
          type: "edit-plan",
          planId: plans[0].id,
        }
      : {
          type: "closed",
        };
  if (drawerParam === "add-sitting") {
    const service = firstServiceFrom(inProgressPlan);
    return service
      ? {
          type: "add-sitting",
          serviceId: service.id,
        }
      : {
          type: "closed",
        };
  }
  if (drawerParam === "add-procedure") {
    const service = firstServiceFrom(inProgressPlan);
    return service
      ? {
          type: "add-procedure",
          serviceId: service.id,
        }
      : {
          type: "closed",
        };
  }
  if (drawerParam === "book-appointment") {
    const plan = tab === "completed" ? completedPlan : inProgressPlan;
    if (!plan)
      return {
        type: "closed",
      };
    const service = firstServiceFrom(plan);
    return {
      type: "book-appointment",
      planId: plan.id,
      serviceId: service?.id,
    };
  }
  if (drawerParam === "bill-preview") {
    const plan = tab === "completed" ? completedPlan : inProgressPlan;
    if (!plan)
      return {
        type: "closed",
      };
    const service = firstServiceFrom(plan);
    return {
      type: "bill-preview",
      planId: plan.id,
      serviceId: service?.id,
    };
  }
  if (drawerParam === "rx-preview") {
    if (!completedPlan)
      return {
        type: "closed",
      };
    const service = firstServiceFrom(completedPlan);
    return {
      type: "rx-preview",
      planId: completedPlan.id,
      serviceId: service?.id,
    };
  }
  return {
    type: "closed",
  };
}
function TreatmentPlanInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams?.get("patientId") ?? "apt-1";
  const fromPage = searchParams?.get("from") ?? "rxpad";
  const tabParam = searchParams?.get("planTab") || searchParams?.get("tab");
  const drawerParam = searchParams?.get("drawer");
  const initialTab =
    tabParam === "progress" ||
    tabParam === "completed" ||
    tabParam === "estimates"
      ? tabParam
      : "estimates";
  const plans = getMockPlans(patientId);
  const initialDrawer = getInitialDrawer(drawerParam, initialTab, plans);
  const handleBack = () => {
    const q = encodeURIComponent(patientId);
    if (fromPage === "patient-detail") {
      navigate(`/patient-detail?patientId=${q}`);
    } else if (fromPage === "appointments") {
      navigate("/appointments");
    } else {
      navigate(`/rxpad?patientId=${q}`);
    }
  };
  return (
    <div className={dui.shellRoot}>
      <header className={dui.tpPageHeader}>
        <div className={dui.tpPageHeaderRow}>
          <button
            type="button"
            aria-label="Go back"
            onClick={handleBack}
            data-name="Back Button"
            className={dui.shellBackBtn}
          >
            <div aria-hidden="true" className={dui.shellBackRule} />
            <div className={dui.tpPageBackIconWrap} data-name="Back Arrow">
              <ChevronLeft
                size={24}
                strokeWidth={2}
                className={dui.tpPageBackChevron}
                color="#454551"
              />
            </div>
          </button>
          <div className={dui.tpPageTitleArea}>
            <h1 className={dui.tpPageTitle}>Dental Treatment Plan</h1>
          </div>
        </div>
      </header>
      <div className={dui.tpPageMain}>
        <TreatmentPlanTab
          patientId={patientId}
          initialTab={initialTab}
          initialDrawer={initialDrawer}
        />
      </div>
    </div>
  );
}
function TreatmentPlanEmbedInner({ patientId }) {
  const pid = patientId ?? "apt-1";
  const [searchParams] = useSearchParams();
  const tabParam = searchParams?.get("planTab") || searchParams?.get("tab");
  const drawerParam = searchParams?.get("drawer");
  const initialTab =
    tabParam === "progress" ||
    tabParam === "completed" ||
    tabParam === "estimates"
      ? tabParam
      : "estimates";
  const plans = getMockPlans(pid);
  const initialDrawer = getInitialDrawer(drawerParam, initialTab, plans);
  return (
    <div className={styles.embedRoot}>
      <TreatmentPlanTab
        patientId={pid}
        initialTab={initialTab}
        initialDrawer={initialDrawer}
        embedInPatientShell={true}
      />
    </div>
  );
}
/** Inline dental plan for patient detail — no standalone page chrome. */
export function TreatmentPlanEmbed({ patientId }) {
  return (
    <Suspense
      fallback={
        <div className={styles.fallback}>
          Loading…
        </div>
      }
    >
      <TreatmentPlanEmbedInner patientId={patientId} />
    </Suspense>
  );
}

export function TreatmentPlanPage() {
  return (
    <Suspense>
      <TreatmentPlanInner />
    </Suspense>
  );
}
