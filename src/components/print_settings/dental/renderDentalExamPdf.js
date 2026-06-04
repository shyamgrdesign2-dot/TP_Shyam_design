import React from "react";
import { View } from "@react-pdf/renderer";
import DentalInlineView from "./inline";
import DentalListView from "./list";
import DentalTableView from "./table";
import { PdfDentalChart } from "../../dental/examination/dentalChartPdf";
import { hasDentalExamPayload } from "../../../utils/cardiologyDentalOralExam";

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
  if (!hasDentalExamPayload(dentalExaminationData)) {
    return null;
  }
  if (dentalOption && dentalOption.enable === "N") {
    return null;
  }
  const showDentalChart = dentalOption?.showDentalChart !== false;
  const format = dentalOption?.format || "listview";
  let viewNode = null;
  if (format === "listview") {
    viewNode = (
      <DentalListView
        PX_TO_PT={PX_TO_PT}
        printSettings={printSettings}
        dentalExaminationData={dentalExaminationData}
        consultationDate={consultationDate}
      />
    );
  } else if (format === "table") {
    viewNode = (
      <DentalTableView
        PX_TO_PT={PX_TO_PT}
        printSettings={printSettings}
        dentalExaminationData={dentalExaminationData}
        consultationDate={consultationDate}
      />
    );
  } else {
    viewNode = (
      <DentalInlineView
        PX_TO_PT={PX_TO_PT}
        printSettings={printSettings}
        dentalExaminationData={dentalExaminationData}
        consultationDate={consultationDate}
      />
    );
  }
  return (
    <View wrap={false}>
      {showDentalChart ? (
        <PdfDentalChart
          PX_TO_PT={PX_TO_PT}
          printSettings={printSettings}
          dentalExaminationData={dentalExaminationData}
          toothImageMap={toothImageMap}
        />
      ) : null}
      {viewNode}
    </View>
  );
}

export default renderDentalExamPdf;
