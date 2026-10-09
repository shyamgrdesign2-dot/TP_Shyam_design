import { ChevronLeft } from "lucide-react";
import dui from "../dental-ui.module.scss";
import { TreatmentPlanTab } from "./TreatmentPlanTab";

export function TreatmentPlanDrawer({ patientId, patientAge, onClose }) {
  if (!patientId) return null;

  return (
    <div className={dui.shellRoot} style={{ height: "100vh" }}>
      <header className={dui.tpPageHeader}>
        <div className={dui.tpPageHeaderRow}>
          <button
            type="button"
            aria-label="Go back"
            onClick={onClose}
            className={dui.shellBackBtn}
          >
            <div aria-hidden="true" className={dui.shellBackRule} />
            <div className={dui.tpPageBackIconWrap}>
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
          patientAge={patientAge}
          initialDrawer={{ type: "closed" }}
        />
      </div>
    </div>
  );
}
