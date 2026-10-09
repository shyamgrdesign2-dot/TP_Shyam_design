import { Printer, DocumentDownload } from "iconsax-reactjs";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { usePlanContext } from "./plan-context";
import { DrawerHeader, PLAN_DRAWER_PANEL_CLASS } from "./plan-shared";
import { useDentalPlanPdf } from "./pdf/useDentalPlanPdf";
import { PlanPdfPreview } from "./pdf/PlanPdfPreview";
import {
  getPdfDownloadFilename,
  getPdfDrawerTitle,
} from "./pdf/dentalPlanPdfMappers";
import styles from "./RxPreviewDrawer.module.scss";

export function RxPreviewDrawer() {
  const { state, closeDrawer, patientId } = usePlanContext();
  const drawer = state.drawer;
  const isOpen = drawer.type === "rx-preview";

  const {
    variant,
    loading,
    error,
    pdfUrl,
    downloadPdf,
    printPdf,
    resolvedContext,
    setNumPages,
  } = useDentalPlanPdf({
    drawer: isOpen ? drawer : { type: "closed" },
    patientId,
    plans: state.plans,
  });

  const title = getPdfDrawerTitle(variant);
  const filename = getPdfDownloadFilename(
    variant,
    resolvedContext?.plan,
    resolvedContext?.service
  );

  return (
    <TPDrawer open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <TPDrawerContent
        side="right"
        size="lg"
        className={`${PLAN_DRAWER_PANEL_CLASS} ${styles.drawerPanel}`}
      >
        <DrawerHeader
          title={title}
          onClose={closeDrawer}
          action={
            <div className={styles.actionWrapper}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => downloadPdf(filename)}
                    disabled={!pdfUrl}
                    className={styles.actionButton}
                    aria-label="Download Rx"
                  >
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
                    onClick={printPdf}
                    disabled={!pdfUrl}
                    className={styles.actionButton}
                    aria-label="Print Rx"
                  >
                    <Printer size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Print Rx
                </TooltipContent>
              </Tooltip>
            </div>
          }
        />

        <div className={styles.drawerBody}>
          <div className={styles.documentPaper}>
            <PlanPdfPreview
              pdfUrl={pdfUrl}
              loading={loading}
              error={error}
              onNumPages={setNumPages}
            />
          </div>
        </div>
      </TPDrawerContent>
    </TPDrawer>
  );
}
