import React from "react";
import OralInlineView from "./inline";
import OralListView from "./list";
import OralTableView from "./table";
import { hasOralExamChartData } from "../../../utils/examChartStorage";

/**
 * Renders oral examination for prescription PDF (inline / list / table).
 */
export function renderOralExamPdf({
  examChart,
  oralOption,
  printSettings,
  consultationDate,
  PX_TO_PT,
}) {
  if (!hasOralExamChartData(examChart)) {
    return null;
  }
  if (oralOption && oralOption.enable === "N") {
    return null;
  }
  const showDates = oralOption?.includeHistorical === true;
  const format = oralOption?.format || "inline";
  const oralChart = examChart;
  if (!hasOralExamChartData(oralChart)) {
    return null;
  }
  const common = {
    PX_TO_PT,
    printSettings,
    oralChart,
    consultationDate,
    showDates,
  };

  if (format === "listview") {
    return <OralListView {...common} />;
  }
  if (format === "table") {
    return <OralTableView {...common} />;
  }
  return <OralInlineView {...common} />;
}

export default renderOralExamPdf;
