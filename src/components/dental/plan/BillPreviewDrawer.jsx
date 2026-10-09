/**
 * BillPreviewDrawer — Right-side drawer showing estimate PDF preview.
 * Supports combined (draft plans), plan-level, or single-service view.
 */
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { Printer, DocumentDownload } from "iconsax-reactjs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { usePlanContext } from "./plan-context";
import { DrawerHeader, PLAN_DRAWER_PANEL_CLASS } from "./plan-shared";
import { useDentalPlanPdf } from "./pdf/useDentalPlanPdf";
import { PlanPdfPreview } from "./pdf/PlanPdfPreview";
import {
  getPdfDownloadFilename,
  getPdfDrawerTitle,
} from "./pdf/dentalPlanPdfMappers";
import styles from "./BillPreviewDrawer.module.scss";

const BILL_ACTION_ICON_CLASS = styles.actionButton;

export function BillPreviewDrawer() {
  const { state, closeDrawer, patientId } = usePlanContext();
  const drawer = state.drawer;
  const isOpen = drawer.type === "bill-preview";

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

  const action = (
    <div className={styles.actionWrapper}>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => downloadPdf(filename)}
            disabled={!pdfUrl}
            className={BILL_ACTION_ICON_CLASS}
            aria-label="Download estimate"
          >
            <DocumentDownload size={18} variant="Linear" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Download estimate
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={printPdf}
            disabled={!pdfUrl}
            className={BILL_ACTION_ICON_CLASS}
            aria-label="Print estimate"
          >
            <Printer size={18} variant="Linear" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Print estimate
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <TPDrawer open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <TPDrawerContent
        side="right"
        size="lg"
        className={`${PLAN_DRAWER_PANEL_CLASS} ${styles.drawerPanel}`}
      >
        <DrawerHeader title={title} onClose={closeDrawer} action={action} />

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
