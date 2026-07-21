import React from "react";
import { pdf } from "@react-pdf/renderer";
import { ensureDrawingCanvasCaseOption } from "../pages/drawingCanvas/utils/drawingCanvasPrintUtils";
import ViewPDF from "./server/viewpdf";
import { prefetchDentalToothImageMap } from "../components/dental/examination/dentalChartPdf";
import { resolveDentitionType } from "../components/dental/examination/dentalChartConstants";
import { resolveExamChartForPrintWithContext } from "./examChartStorage";
import { DENTAL_EXAM_CASE_OPTION_ID } from "./dentalDefaultPrintSettings";
import { hasDentalExamPayload } from "./cardiologyDentalOralExam";
import { normalizeSmartRxDataForPrint } from "./smartRxPrintUtils";
import { normalizeLabResultsResponse } from "./labResultsUtils";
import { resolveFooterImageDimensions } from "./utils";

function shouldPrefetchDentalToothImages({
  dentalExaminationData,
  printSettings,
  onlyShowDental,
}) {
  if (onlyShowDental) return true;
  if (hasDentalExamPayload(dentalExaminationData)) return true;
  const dentalOption = printSettings?.prescription?.case_option?.find(
    (o) => o?.id === DENTAL_EXAM_CASE_OPTION_ID
  );
  return (
    dentalOption?.enable === "Y" &&
    dentalOption?.custom_status === "Y" &&
    dentalOption?.showDentalChart !== false
  );
}

const resolveSelectedLang = (payload, selectedLang) => {
  if (selectedLang !== undefined && selectedLang !== null) {
    return selectedLang;
  }

  const defaultLang = payload?.printSettings?.default_language;
  if (!defaultLang || defaultLang === "English") {
    return 1;
  }

  return defaultLang;
};

const normalizeArrayValue = (value, fallbackKey) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value[fallbackKey])) {
    return value[fallbackKey];
  }
  return [];
};

export const renderPrintPayloadToBlob = async (
  payload,
  { selectedLang, isGynaecHistoryAccessable, showSnapRxImages = false, onlyShowDental = false } = {}
) => {
  if (!payload) {
    return null;
  }

  const {
    mode,
    rx,
    lg,
    caseManagerData,
    columns,
    initialRows,
    frequencyList,
    timingList,
    printSettings,
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
    givenVaccines,
    dueVaccines,
    carePlanAssignments,
    smartDigitizeRxData,
    growthChartDetails,
    gynecHistoryData,
    obsHistoryData,
    labParamsData,
    customModules,
    patientBills,
    advanceReceipts,
    patientWalletBalance,
    labReportData,
    ophthalModuleData,
    zydusLabData,
    abhaDetails,
    dentalData,
    dentalExaminationData,
    isDigitisedPrintConfig,
    examChart: examChartFromPayload,
    oralExamination,
    patientUniqueId,
    tcmId,
    dentalChartPrintMode,
    isCvtExtHosAccessableFromGB,
    drawingCanvases,
    crossConsultData,
  } = payload;

  const examChart =
    dentalChartPrintMode === "plain"
      ? null
      : resolveExamChartForPrintWithContext({
          caseManagerData,
          examChartOverride: examChartFromPayload,
          oralExamination,
          patientUniqueId,
          tcmId,
        });

  // Flatten multi-doctor lab buckets (or legacy single-doc) before ViewPDF consume.
  const normalizedLabParamsData = normalizeLabResultsResponse(labParamsData);

  const combinedCaseManagerData = {
    ...caseManagerData,
    gynecHistoryData,
    labParamsData: normalizedLabParamsData,
    labReportData,
    ophthalModuleData,
    ...(zydusLabData?.length > 0 ? { zydusSelectedLabParams: zydusLabData } : {}),
  };

  const todayVaccines = {
    given: normalizeArrayValue(givenVaccines, "template"),
    due: normalizeArrayValue(dueVaccines, "detail"),
  };

  const resolvedLang = resolveSelectedLang(payload, selectedLang);
  const dentitionType = resolveDentitionType(dentalExaminationData);
  const toothImageMap = shouldPrefetchDentalToothImages({
    dentalExaminationData,
    printSettings,
    onlyShowDental,
  })
    ? await prefetchDentalToothImageMap({ dentitionType })
    : {};

  const resolvedPrintSettings =
    Array.isArray(drawingCanvases) && drawingCanvases.length > 0
      ? ensureDrawingCanvasCaseOption(printSettings)
      : printSettings;

  const resolvedFileFooter = await resolveFooterImageDimensions(fileFooter);

  const normalizedCustomModules = Array.isArray(customModules)
    ? customModules
    : Array.isArray(customModules?.modules)
      ? customModules.modules
      : [];

  return pdf(
    <ViewPDF
      mode={mode}
      rx={rx}
      lg={lg}
      caseManagerData={combinedCaseManagerData}
      columns={columns}
      initialRows={initialRows}
      frequencyList={frequencyList}
      timingList={timingList}
      printSettings={resolvedPrintSettings}
      fileHeader={fileHeader}
      fileFooter={resolvedFileFooter}
      fileLogo={fileLogo}
      fileWatermark={fileWatermark}
      fileSignature={fileSignature}
      todayVaccines={todayVaccines}
      givenVaccines={givenVaccines}
      dueVaccines={dueVaccines}
      carePlanAssignments={carePlanAssignments}
      smartRxData={normalizeSmartRxDataForPrint(smartDigitizeRxData)}
      growthChartDetails={growthChartDetails}
      isGynaecHistoryAccessable={isGynaecHistoryAccessable}
      gynecHistoryData={gynecHistoryData}
      labParamsData={normalizedLabParamsData}
      obsHistoryData={obsHistoryData}
      customModules={normalizedCustomModules}
      patientBills={patientBills}
      advanceReceipts={advanceReceipts}
      patientWalletBalance={patientWalletBalance}
      selectedLang={resolvedLang}
      ophthalModuleData={ophthalModuleData}
      zydusLabData={zydusLabData?.length > 0 ? {data: zydusLabData} : null}
      showSnapRxImages={showSnapRxImages}
      abhaDetails={abhaDetails}
      dentalData={dentalData}
      dentalExaminationData={dentalExaminationData}
      isDigitisedPrintConfig={isDigitisedPrintConfig}
      onlyShowDental={onlyShowDental}
      toothImageMap={toothImageMap}
      examChart={examChart}
      isCvtExtHosAccessableFromGB={isCvtExtHosAccessableFromGB}
      drawingCanvases={drawingCanvases}
      crossConsultData={crossConsultData}
    />
  ).toBlob();
};
