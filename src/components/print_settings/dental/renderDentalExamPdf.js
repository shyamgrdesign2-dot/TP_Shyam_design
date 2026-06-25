import React from "react";
import { View } from "@react-pdf/renderer";
import DentalInlineView from "./inline";
import DentalListView from "./list";
import DentalTableView from "./table";
import { PdfDentalChart } from "../../dental/examination/dentalChartPdf";
import { hasDentalExamPayload } from "../../../utils/cardiologyDentalOralExam";
import { resolveDentalGroupBy } from "./dentalPrintHelpers";

/**
 * Renders dental examination + optional odontogram for prescription PDF.
 */
export function renderDentalExamPdf({
  dentalExaminationData,
  dentalOption,
  printSettings,
  consultationDate,
  PX_TO_PT,
  toothImageMap = {},
}) {
  if (dentalOption && dentalOption.enable === "N") {
    return null;
  }
  const showDentalChart = dentalOption?.showDentalChart !== false;
  const chartOnly = dentalOption?.chartOnly === true;
  const groupBy = resolveDentalGroupBy(dentalOption?.groupDentalExaminationBy);
  const hasPayload = hasDentalExamPayload(dentalExaminationData);
  if (!hasPayload && !showDentalChart) {
    return null;
  }
  if (showDentalChart && (chartOnly || !hasPayload)) {
    return (
      <PdfDentalChart
        PX_TO_PT={PX_TO_PT}
        printSettings={printSettings}
        dentalExaminationData={dentalExaminationData}
        toothImageMap={toothImageMap}
      />
    );
  }
  const format = dentalOption?.format || "listview";
  let viewNode = null;
  if (format === "listview") {
    viewNode = (
      <DentalListView
        PX_TO_PT={PX_TO_PT}
        printSettings={printSettings}
        dentalExaminationData={dentalExaminationData}
        consultationDate={consultationDate}
        groupBy={groupBy}
      />
    );
  } else if (format === "table") {
    viewNode = (
      <DentalTableView
        PX_TO_PT={PX_TO_PT}
        printSettings={printSettings}
        dentalExaminationData={dentalExaminationData}
        consultationDate={consultationDate}
        groupBy={groupBy}
      />
    );
  } else {
    viewNode = (
      <DentalInlineView
        PX_TO_PT={PX_TO_PT}
        printSettings={printSettings}
        dentalExaminationData={dentalExaminationData}
        consultationDate={consultationDate}
        groupBy={groupBy}
      />
    );
  }
  return (
    <>
      {showDentalChart ? (
        <View wrap={false}>
          <PdfDentalChart
            PX_TO_PT={PX_TO_PT}
            printSettings={printSettings}
            dentalExaminationData={dentalExaminationData}
            toothImageMap={toothImageMap}
          />
        </View>
      ) : null}
      {viewNode}
    </>
  );
}

export default renderDentalExamPdf;
