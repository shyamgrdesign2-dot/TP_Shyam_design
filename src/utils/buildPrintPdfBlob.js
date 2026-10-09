import { renderPrintPayloadToBlob } from "./printPayload";
import { resolveDentalOralForPrint } from "./resolveDentalOralPrintData";
import { mergeDentalPrintCaseOptions } from "./dentalDefaultPrintSettings";
import {
  ensureDrawingCanvasCaseOption,
  loadDrawingCanvasesForPrint,
} from "../pages/drawingCanvas/utils/drawingCanvasPrintUtils";
import { trackEvent } from "./utils";
import { fetchReferralDataForCaseManager } from "./crossConsultHelpers";

function mergeCaseManagerDataForPrint(base, override) {
  if (!override) return base || null;
  if (!base) return override;
  return {
    ...base,
    ...override,
    patient_data: {
      ...(base.patient_data || {}),
      ...(override.patient_data || {}),
    },
  };
}

function ensureDentalOralPrintSettings(printSettings, isDentalEnabled) {
  if (!isDentalEnabled) {
    return printSettings;
  }
  const prescription = printSettings?.prescription || {};
  const { caseOptions } = mergeDentalPrintCaseOptions(
    prescription.case_option || [],
  );
  return {
    ...printSettings,
    prescription: {
      ...prescription,
      case_option: caseOptions,
    },
  };
}

/**
 * Resolves dental/oral data, drawing canvases, and renders a prescription PDF blob.
 * Shared by usePrintPayloadPdf and on-demand print paths (Cardiology, etc.).
 */
export async function buildPrintPdfBlobFromPayload(
  payload,
  {
    selectedLang,
    isGynaecHistoryAccessable = false,
    showSnapRxImages = false,
    dentalexaminationData = null,
    dentalExaminationData = null,
    oralExamination = null,
    patientUniqueId = null,
    patientId = null,
    tcmId = null,
    onlyShowDental = false,
    allowFullApiFallback = true,
    isCvtExtHosAccessableFromGB,
    isDentalEnabled = false,
    caseManagerDataOverride = null,
    canvasFilename = null,
    onCorruptCanvas,
    onCanvasApiFailed,
  } = {},
) {
  if (!payload) {
    throw new Error("Print payload is missing.");
  }

  const caseManagerData = mergeCaseManagerDataForPrint(
    payload?.caseManagerData,
    caseManagerDataOverride,
  );
  const resolvedPatientId =
    patientUniqueId ||
    patientId ||
    caseManagerData?.patient_data?.patient_unique_id ||
    caseManagerData?.patient_unique_id;
  const resolvedTcmId = tcmId || caseManagerData?.tcm_id;
  const consultationDate =
    caseManagerData?.patient_data?.patient_consultaion_date ||
    caseManagerData?.consultation_date ||
    caseManagerData?.patient_consultaion_date;

  const resolvedPrintSettings = ensureDentalOralPrintSettings(
    payload?.printSettings,
    isDentalEnabled,
  );

  const inMemoryDental = allowFullApiFallback
    ? payload?.dentalExaminationData ||
        payload?.dentalexaminationData ||
        dentalExaminationData ||
        dentalexaminationData
    : dentalExaminationData ||
        dentalexaminationData ||
        payload?.dentalExaminationData ||
        payload?.dentalexaminationData;

  const { dentalExaminationData: normalizedDentalData, examChart } =
    await resolveDentalOralForPrint({
      patientId: resolvedPatientId,
      tcmId: resolvedTcmId,
      consultationDate,
      printSettings: resolvedPrintSettings,
      inMemoryDental,
      inMemoryOral: oralExamination,
      caseManagerData,
      examChartOverride: payload?.examChart,
      allowFullApiFallback,
    });

  const resolvedCanvasFilename =
    canvasFilename ?? payload?.caseManagerData?.canvas_filename;

  const { drawingCanvases, corruptedCanvasSkipped } =
    await loadDrawingCanvasesForPrint({
      patientId: resolvedPatientId,
      tcmId: resolvedTcmId,
      canvasFilename: resolvedCanvasFilename,
      onCorruptCanvas:
        onCorruptCanvas ||
        (({ patientId: pid, tcmId: tid, record }) => {
          trackEvent("drawing_canvas_corrupt_scene_detected", {
            patient_id: pid,
            consultation_id: tid,
            canvas_id: record?.mapping_id || record?.canvas_id || record?.id,
            render_context: "pdf_generation",
          });
        }),
      onApiFailed:
        onCanvasApiFailed ||
        (({ patientId: pid, tcmId: tid, error }) => {
          trackEvent("drawing_canvas_api_failed", {
            patient_id: pid,
            consultation_id: tid,
            api_name: "listPatientCanvasMapping",
            error_code: error?.code || "EXCEPTION",
            error_message: error?.message || "Failed to fetch canvases for PDF",
          });
        }),
    });

  const printSettingsWithCanvas =
    drawingCanvases.length > 0
      ? ensureDrawingCanvasCaseOption(resolvedPrintSettings)
      : resolvedPrintSettings;

  const crossConsultData = await fetchReferralDataForCaseManager(
    caseManagerData,
    { tcmId: resolvedTcmId },
  );

  const blob = await renderPrintPayloadToBlob(
    {
      ...payload,
      caseManagerData,
      printSettings: printSettingsWithCanvas,
      crossConsultData,
      dentalExaminationData: normalizedDentalData,
      examChart,
      oralExamination,
      patientUniqueId: resolvedPatientId,
      tcmId: resolvedTcmId,
      drawingCanvases,
      ...(typeof isCvtExtHosAccessableFromGB === "boolean"
        ? { isCvtExtHosAccessableFromGB }
        : {}),
    },
    {
      selectedLang,
      isGynaecHistoryAccessable,
      showSnapRxImages,
      onlyShowDental,
    },
  );

  if (!blob) {
    throw new Error("Failed to generate PDF blob.");
  }

  const header = await blob.slice(0, 5).text();
  if (header !== "%PDF-") {
    throw new Error(`Generated blob is not a PDF (header: ${header || "empty"}).`);
  }

  return { blob, drawingCanvases, corruptedCanvasSkipped };
}
