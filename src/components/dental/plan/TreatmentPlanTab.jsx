/**
 * TreatmentPlanTab — Shell component with context provider, tab pills,
 * tab switch, and drawer outlet. Complete rewrite from monolithic prototype.
 */
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlanProvider, usePlanContext } from "./plan-context";
import { TabPill } from "./plan-shared";
import { PlanEstimatesTab } from "./PlanEstimatesTab";
import { InProgressTab } from "./InProgressTab";
import { CompletedTab } from "./CompletedTab";
import { AddEditPlanDrawer } from "./AddEditPlanDrawer";
import { BillPreviewDrawer } from "./BillPreviewDrawer";
import { RxPreviewDrawer } from "./RxPreviewDrawer";
import { BookAppointmentDrawer } from "./BookAppointmentDrawer";
import { AddSittingDrawer } from "./AddSittingDrawer";
import { AddProcedureDrawer } from "./AddProcedureDrawer";
import dui from "../dental-ui.module.scss";
import "./plan-print-styles.css";
// ─── Inner component (inside context) ──────────────────────
function TreatmentPlanInner({ activeTab, setActiveTab }) {
  const {
    estimatePlans,
    inProgressPlans,
    completedPlans,
    embedInPatientShell,
  } = usePlanContext();
  return (
    <div
      className={`${dui.tpTabRoot} ${
        embedInPatientShell ? dui.tpTabRootEmbed : ""
      }`}
    >
      <div
        className={`${dui.tpTabHeader} ${
          embedInPatientShell ? dui.tpTabHeaderEmbed : ""
        }`}
      >
        <div className={dui.tpTabPills}>
          <TabPill
            id="estimates"
            label="Plan Estimates"
            count={estimatePlans.length}
            active={activeTab === "estimates"}
            onClick={() => setActiveTab("estimates")}
          />

          <TabPill
            id="progress"
            label="Active Plans"
            count={inProgressPlans.length}
            active={activeTab === "progress"}
            onClick={() => setActiveTab("progress")}
          />

          <TabPill
            id="completed"
            label="Completed"
            count={completedPlans.length}
            active={activeTab === "completed"}
            onClick={() => setActiveTab("completed")}
          />
        </div>
      </div>
      <div className={dui.tpTabBody}>
        {activeTab === "estimates" && <PlanEstimatesTab />}
        {activeTab === "progress" && <InProgressTab />}
        {activeTab === "completed" && <CompletedTab />}
      </div>
      <AddEditPlanDrawer />
      <BillPreviewDrawer />
      <RxPreviewDrawer />
      <BookAppointmentDrawer />
      <AddSittingDrawer />
      <AddProcedureDrawer />
    </div>
  );
}
export function TreatmentPlanTab({
  patientId,
  patientAge = 30,
  initialTab = "estimates",
  initialDrawer,
  embedInPatientShell = false,
}) {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => {
    const u = searchParams?.get("planTab") || searchParams?.get("tab");
    if (u === "estimates" || u === "progress" || u === "completed")
      setActiveTab(u);
  }, [searchParams]);
  const handleNavigateTab = useCallback((tab) => {
    if (tab === "estimates" || tab === "progress" || tab === "completed") {
      setActiveTab(tab);
    }
  }, []);
  return (
    <PlanProvider
      patientId={patientId}
      onNavigateTab={handleNavigateTab}
      initialDrawer={initialDrawer}
      embedInPatientShell={embedInPatientShell}
    >
      <TreatmentPlanInner activeTab={activeTab} setActiveTab={setActiveTab} />
    </PlanProvider>
  );
}
