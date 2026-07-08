import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { buildPrintPdfBlobFromPayload } from "../utils/buildPrintPdfBlob";
import { trackEvent } from "../utils/utils";
import { fetchReferralDataForCaseManager } from "../utils/crossConsultHelpers";

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
  isDentalEnabled = false,
  caseManagerDataOverride = null,
  canvasFilename = null,
  patientRecord = null,
}) => {
  const [payload, setPayload] = useState(null);
  const [printBlob, setPrintBlob] = useState(null);
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
        const crossConsultData = await fetchReferralDataForCaseManager(
          payload?.caseManagerData,
          patientRecord ?? payload?.caseManagerData?.patient_data,
        );

        const payloadWithExtras = {
          ...payload,
          crossConsultData,
          ...(zydusSelectedLabParams != null
            ? { zydusLabData: zydusSelectedLabParams }
            : {}),
        };

        const { blob, drawingCanvases, corruptedCanvasSkipped } =
          await buildPrintPdfBlobFromPayload(payloadWithExtras, {
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
    stableDentalInput,
    stableOralInput,
    patientUniqueId,
    patientId,
    tcmId,
    onlyShowDental,
    showSnapRxImages,
    zydusSelectedLabParams,
    allowFullApiFallback,
    isCvtExtHosAccessableFromGB,
    isDentalEnabled,
    caseManagerDataOverride,
    canvasFilename,
    patientRecord,
  ]);

  return { payload, printBlob, isGenerating, error };
};
