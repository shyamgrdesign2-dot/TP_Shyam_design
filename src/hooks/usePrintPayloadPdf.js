import { useEffect, useState } from "react";
import axios from "axios";
import { renderPrintPayloadToBlob } from "../utils/printPayload";
import { resolveDentalOralForPrint } from "../utils/resolveDentalOralPrintData";
import {
  ensureDrawingCanvasCaseOption,
  loadDrawingCanvasesForPrint,
} from "../pages/drawingCanvas/utils/drawingCanvasPrintUtils";
import { trackEvent } from "../utils/utils";
import { fetchReferralDataForCaseManager } from "../utils/crossConsultHelpers";

export const usePrintPayloadPdf = ({
  printUrl,
  selectedLang,
  isGynaecHistoryAccessable,
  showSnapRxImages,
  payloadOverride,
  skipFetch = false,
  zydusSelectedLabParams = null,
  dentalexaminationData = null,
  dentalExaminationData = null,
  oralExamination = null,
  patientUniqueId = null,
  patientId = null,
  tcmId = null,
  onlyShowDental = false,
  allowFullApiFallback = true,
  isCvtExtHosAccessableFromGB,
  canvasFilename = null,
}) => {
  const [payload, setPayload] = useState(null);
  const [printBlob, setPrintBlob] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (skipFetch) {
      setIsGenerating(false);
      return;
    }

    if (payloadOverride) {
      setPayload(payloadOverride);
      setPrintBlob(null);
      return;
    }

    if (!printUrl) {
      setPayload(null);
      setPrintBlob(null);
      return;
    }

    let isCancelled = false;
    const fetchPayload = async () => {
      setIsGenerating(true);
      setError(null);
      setPayload(null);
      setPrintBlob(null);
      try {
        let fetchUrl = printUrl;
        try {
          const urlObj = new URL(fetchUrl, window.location.origin);
          if (urlObj.searchParams.get("output") !== "json") {
            urlObj.searchParams.set("output", "json");
          }
          fetchUrl = urlObj.toString();
        } catch (e) {
          const hasOutput = /(?:[?&])output=/.test(fetchUrl);
          if (!hasOutput) {
            fetchUrl += fetchUrl.includes("?") ? "&output=json" : "?output=json";
          }
        }
        const response = await axios.get(fetchUrl);
        const data = response?.data?.data || null;
        if (!data) {
          throw new Error("Print payload is missing.");
        }
        if (!isCancelled) {
          setPayload(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err);
          setPayload(null);
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchPayload, 0);
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [printUrl, payloadOverride, skipFetch]);

  useEffect(() => {
    if (skipFetch) {
      setIsGenerating(false);
      return;
    }

    if (!payload) {
      setPrintBlob(null);
      return;
    }

    let isCancelled = false;
    const buildPdf = async () => {
      setIsGenerating(true);
      setError(null);
      const pdfStartTime = Date.now();
      try {
        const caseManagerData = payload?.caseManagerData;
        const resolvedPatientId =
          patientUniqueId ||
          patientId ||
          caseManagerData?.patient_data?.patient_unique_id;
        const resolvedTcmId = tcmId || caseManagerData?.tcm_id;
        const consultationDate =
          caseManagerData?.patient_data?.patient_consultaion_date ||
          caseManagerData?.consultation_date;

        const inMemoryDental = allowFullApiFallback
          ? (payload?.dentalExaminationData ||
              payload?.dentalexaminationData ||
              dentalExaminationData ||
              dentalexaminationData)
          : (dentalExaminationData ||
              dentalexaminationData ||
              payload?.dentalExaminationData ||
              payload?.dentalexaminationData);

        const { dentalExaminationData: normalizedDentalData, examChart } =
          await resolveDentalOralForPrint({
            patientId: resolvedPatientId,
            tcmId: resolvedTcmId,
            consultationDate,
            printSettings: payload?.printSettings,
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
            onCorruptCanvas: ({ patientId, tcmId, record }) => {
              trackEvent("drawing_canvas_corrupt_scene_detected", {
                patient_id: patientId,
                consultation_id: tcmId,
                canvas_id: record?.mapping_id || record?.canvas_id || record?.id,
                render_context: "pdf_generation",
              });
            },
            onApiFailed: ({ patientId, tcmId, error }) => {
              trackEvent("drawing_canvas_api_failed", {
                patient_id: patientId,
                consultation_id: tcmId,
                api_name: "listPatientCanvasMapping",
                error_code: error?.code || "EXCEPTION",
                error_message: error?.message || "Failed to fetch canvases for PDF",
              });
            },
          });

        const crossConsultData = await fetchReferralDataForCaseManager(
          caseManagerData,
          { tcmId: resolvedTcmId }
        );

        const printSettingsWithCanvas =
          drawingCanvases.length > 0
            ? ensureDrawingCanvasCaseOption(payload.printSettings)
            : payload.printSettings;

        const blob = await renderPrintPayloadToBlob({
          ...payload,
          printSettings: printSettingsWithCanvas,
          crossConsultData,
          zydusLabData: zydusSelectedLabParams,
          dentalExaminationData: normalizedDentalData,
          examChart,
          oralExamination,
          patientUniqueId: resolvedPatientId,
          tcmId: resolvedTcmId,
          drawingCanvases,
          ...(typeof isCvtExtHosAccessableFromGB === "boolean"
            ? { isCvtExtHosAccessableFromGB }
            : {}),
        }, {
          selectedLang,
          isGynaecHistoryAccessable,
          showSnapRxImages,
          onlyShowDental,
        });

        if (!blob) {
          throw new Error("Failed to generate PDF blob.");
        }
        const header = await blob.slice(0, 5).text();
        if (header !== "%PDF-") {
          throw new Error(
            `Generated blob is not a PDF (header: ${header || "empty"}).`
          );
        }
        if (!isCancelled) {
          setPrintBlob(blob);
          if (drawingCanvases.length > 0) {
            trackEvent("drawing_canvas_pdf_generated", {
              patient_id: payload?.caseManagerData?.patient_data?.patient_unique_id,
              consultation_id: payload?.caseManagerData?.tcm_id,
              selected_canvas_count: drawingCanvases.length,
              render_time_ms: Date.now() - pdfStartTime,
              corrupted_canvas_skipped: corruptedCanvasSkipped,
            });
            trackEvent("drawing_canvas_pdf_render_time", {
              patient_id: payload?.caseManagerData?.patient_data?.patient_unique_id,
              consultation_id: payload?.caseManagerData?.tcm_id,
              selected_canvas_count: drawingCanvases.length,
              render_time_ms: Date.now() - pdfStartTime,
            });
          }
        }
      } catch (err) {
        console.log("Failed to generate PDF blob", err);
        if (!isCancelled) {
          setError(err);
          setPrintBlob(null);
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    buildPdf();
    return () => {
      isCancelled = true;
    };
  }, [
    payload,
    selectedLang,
    isGynaecHistoryAccessable,
    skipFetch,
    dentalexaminationData,
    dentalExaminationData,
    oralExamination,
    patientUniqueId,
    patientId,
    tcmId,
    onlyShowDental,
    showSnapRxImages,
    zydusSelectedLabParams,
    allowFullApiFallback,
    isCvtExtHosAccessableFromGB,
    canvasFilename,
  ]);

  return { payload, printBlob, isGenerating, error };
};
