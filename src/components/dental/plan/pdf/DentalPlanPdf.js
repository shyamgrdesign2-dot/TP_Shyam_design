import React, { useState } from "react";
import { Document, Page, View } from "@react-pdf/renderer";
import { calculatePadding } from "../../../../pages/opdBilling/components/viewBillPdf/helper";
import BillHeader from "../../../../pages/opdBilling/components/viewBillPdf/BillHeader";
import BillFooter from "../../../../pages/opdBilling/components/viewBillPdf/BillFooter";
import { PX_TO_PT } from "../../../../pages/opdBilling/components/viewBillPdf/constants";
import { TP_ASSETS_BASE } from "../../../../utils/constants";
import { Font } from "@react-pdf/renderer";
import EstimateDetails from "./EstimateDetails";
import PlanRxBody from "./PlanRxBody";

// Register fonts once (same families as ViewBillPdf)
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Regular.ttf`,
      fontWeight: 400,
    },
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Medium.ttf`,
      fontWeight: 500,
    },
    {
      src: `${TP_ASSETS_BASE}/fonts/print-fonts/Roboto-Bold.ttf`,
      fontWeight: 700,
    },
  ],
});

const ESTIMATE_VARIANTS = new Set([
  "estimate-combined",
  "estimate-plan",
  "estimate-service",
]);

const DentalPlanPdf = ({
  variant,
  printSettings,
  patientData,
  profile,
  billData,
  gstIn,
  showCreatedBy,
  estimatePayload,
  rxPayload,
}) => {
  const [fileWatermark, setFileWatermark] = useState(null);
  const dentalPrintSettings = printSettings;
  const paddingStyles = calculatePadding(dentalPrintSettings?.headerFooter);
  const isEstimate = ESTIMATE_VARIANTS.has(variant);

  return (
    <Document>
      <Page
        size={dentalPrintSettings?.pageFormat?.pageType || "A5"}
        style={{
          ...paddingStyles,
          display: "flex",
          flexDirection: "column",
          paddingBottom: PX_TO_PT * 80,
        }}
        wrap
      >
        <View style={{ flex: 1 }}>
          <BillHeader
            fileWatermark={fileWatermark}
            setFileWatermark={setFileWatermark}
            printSettings={dentalPrintSettings}
            isDepositReceipt={false}
            patientData={patientData}
            billData={billData}
            profile={profile}
            gstIn={gstIn}
            isIpdBill={false}
            documentTitle={isEstimate ? "Plan Estimate" : ""}
          />

          {isEstimate ? (
            <EstimateDetails
              pageFormat={dentalPrintSettings?.pageFormat}
              estimatePayload={estimatePayload}
            />
          ) : (
            <PlanRxBody variant={variant} rxPayload={rxPayload} />
          )}
        </View>

        <BillFooter
          printSettings={dentalPrintSettings}
          billData={billData}
          showCreatedBy={showCreatedBy}
        />
      </Page>
    </Document>
  );
};

export default React.memo(DentalPlanPdf);
