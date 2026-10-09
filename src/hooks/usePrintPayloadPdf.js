import { useEffect, useMemo, useState } from "react";
import { buildPrintPayloadDataFromPrintUrl } from "../utils/buildPrintPayloadData";
import { buildPrintPdfBlobFromPayload } from "../utils/buildPrintPdfBlob";
import { normalizeLabResultsResponse } from "../utils/labResultsUtils";
import { trackEvent } from "../utils/utils";

function pickStableDentalInput(dentalExaminationData, dentalexaminationData) {
  const raw = dentalExaminationData || dentalexaminationData;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.tooth_states)) {
    return { tooth_states: raw.tooth_states };
  }
  if (raw.toothState && typeof raw.toothState === "object") {
    return { toothState: raw.toothState };
  }
  return raw;
}

function pickStableOralInput(oralExamination) {
  if (!oralExamination || typeof oralExamination !== "object") return null;
  if (hasOralExamChartShape(oralExamination)) {
    return {
      oralEntries: oralExamination.oralEntries,
      oralNotes: oralExamination.oralNotes,
    };
  }
  return {
    canvasOralEntries: oralExamination.canvasOralEntries,
    canvasOralNotes: oralExamination.canvasOralNotes,
    findings: oralExamination.findings,
    procedures: oralExamination.procedures,
    treatment_history:
      oralExamination.treatment_history || oralExamination.treatmentHistory,
    treatmentHistory:
      oralExamination.treatmentHistory || oralExamination.treatment_history,
    overall_notes: oralExamination.overall_notes || oralExamination.overallNotes,
    overallNotes: oralExamination.overallNotes || oralExamination.overall_notes,
  };
}

function hasOralExamChartShape(value) {
  return (
    (Array.isArray(value?.oralEntries) && value.oralEntries.length > 0) ||
    (typeof value?.oralNotes === "string" && value.oralNotes.trim().length > 0)
  );
}

export const usePrintPayloadPdf = ({
  printUrl,
  selectedLang,
  isGynaecHistoryAccessable,
  showSnapRxImages,
  payloadOverride,
  payloadDataOverride = null,
  skipFetch = false,
  zydusSelectedLabParams = null,
  /** Client-fetched lab rows (preferably already flattened via normalizeLabResultsResponse). */
  labParamsData = null,
  dentalexaminationData = null,
  dentalExaminationData = null,
  oralExamination = null,
  patientUniqueId = null,
  patientId = null,
  tcmId = null,
  onlyShowDental = false,
  allowFullApiFallback = true,
  isCvtExtHosAccessableFromGB,
  isGrowthChartAccessableFromGB,
  isDentalEnabled = false,
  caseManagerDataOverride = null,
  canvasFilename = null,
  patientRecord = null,
}) => {
  const [payload, setPayload] = useState(null);
  const [payloadSourceUrl, setPayloadSourceUrl] = useState(null);
  const [printBlob, setPrintBlob] = useState(null);
  const [printBlobSourceUrl, setPrintBlobSourceUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const stableDentalInput = useMemo(
    () => pickStableDentalInput(dentalExaminationData, dentalexaminationData),
    [
      JSON.stringify(
        dentalExaminationData?.toothState ||
          dentalExaminationData?.tooth_states ||
          null,
      ),
      JSON.stringify(
        dentalexaminationData?.toothState ||
          dentalexaminationData?.tooth_states ||
          null,
      ),
    ],
  );
  const stableOralInput = useMemo(
    () => pickStableOralInput(oralExamination),
    [
      JSON.stringify(oralExamination?.canvasOralEntries || null),
      oralExamination?.canvasOralNotes,
      JSON.stringify(oralExamination?.findings || null),
      JSON.stringify(oralExamination?.procedures || null),
      JSON.stringify(
        oralExamination?.treatment_history ||
          oralExamination?.treatmentHistory ||
          null,
      ),
      oralExamination?.overall_notes,
      oralExamination?.overallNotes,
    ],
  );

  useEffect(() => {
    if (skipFetch) {
      setIsGenerating(false);
      return;
    }

    if (payloadOverride) {
      setPayload(payloadOverride);
      setPayloadSourceUrl(null);
      setPrintBlob(null);
      setPrintBlobSourceUrl(null);
      return;
    }

    if (!printUrl) {
      setPayload(null);
      setPayloadSourceUrl(null);
      setPrintBlob(null);
      setPrintBlobSourceUrl(null);
      return;
    }

    let isCancelled = false;
    const fetchPayload = async () => {
      setIsGenerating(true);
      setError(null);
      setPayload(null);
      setPayloadSourceUrl(null);
      setPrintBlob(null);
      setPrintBlobSourceUrl(null);
      try {
        const data = await buildPrintPayloadDataFromPrintUrl(printUrl, {
          isCvtExtHosAccessableFromGB,
          isGrowthChartAccessableFromGB,
        });
        if (!data) {
          throw new Error("Print payload is missing.");
        }
        if (!isCancelled) {
          setPayloadSourceUrl(printUrl);
          setPayload(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err);
          setPayload(null);
          setPayloadSourceUrl(null);
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
  }, [
    printUrl,
    payloadOverride,
    skipFetch,
    isCvtExtHosAccessableFromGB,
    isGrowthChartAccessableFromGB,
  ]);

  useEffect(() => {
    if (skipFetch) {
      setIsGenerating(false);
      return;
    }

    if (!payload) {
      setPrintBlob(null);
      setPrintBlobSourceUrl(null);
      return;
    }

    if (!payloadOverride && payloadSourceUrl !== printUrl) {
      setPrintBlob(null);
      setPrintBlobSourceUrl(null);
      return;
    }

    let isCancelled = false;
    const buildPdf = async () => {
      setIsGenerating(true);
      setError(null);
      const pdfStartTime = Date.now();
      try {
        const mergedPayload = payloadDataOverride
          ? { ...payload, ...payloadDataOverride }
          : payload;

        // Prefer client lab rows; otherwise flatten whatever the print payload API sent
        // (new multi-doctor bucket shape or legacy single-doc shape).
        const clientLabParams = normalizeLabResultsResponse(labParamsData);
        const payloadLabParams = normalizeLabResultsResponse(
          mergedPayload?.labParamsData,
        );
        const resolvedLabParams =
          clientLabParams.length > 0 ? clientLabParams : payloadLabParams;

        const payloadWithLabs = {
          ...mergedPayload,
          labParamsData: resolvedLabParams,
          ...(zydusSelectedLabParams != null
            ? { zydusLabData: zydusSelectedLabParams }
            : {}),
        };

        const { blob, drawingCanvases, corruptedCanvasSkipped } =
          await buildPrintPdfBlobFromPayload(payloadWithLabs, {
            selectedLang,
            isGynaecHistoryAccessable,
            showSnapRxImages,
            dentalexaminationData: stableDentalInput,
            dentalExaminationData: stableDentalInput,
            oralExamination: stableOralInput,
            patientUniqueId,
            patientId,
            tcmId,
            onlyShowDental,
            allowFullApiFallback,
            isCvtExtHosAccessableFromGB,
            isDentalEnabled,
            caseManagerDataOverride,
            canvasFilename,
          });

        if (!isCancelled) {
          setPrintBlob(blob);
          setPrintBlobSourceUrl(payloadSourceUrl || printUrl || null);
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
          setPrintBlobSourceUrl(null);
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
    payloadSourceUrl,
    payloadOverride,
    selectedLang,
    isGynaecHistoryAccessable,
    skipFetch,
    stableDentalInput,
    stableOralInput,
    patientUniqueId,
    patientId,
    tcmId,
    onlyShowDental,
    showSnapRxImages,
    zydusSelectedLabParams,
    labParamsData,
    JSON.stringify(payloadDataOverride || null),
    allowFullApiFallback,
    isCvtExtHosAccessableFromGB,
    isGrowthChartAccessableFromGB,
    isDentalEnabled,
    caseManagerDataOverride,
    canvasFilename,
    patientRecord,
    printUrl,
  ]);

  return { payload, printBlob, printBlobSourceUrl, isGenerating, error };
};
