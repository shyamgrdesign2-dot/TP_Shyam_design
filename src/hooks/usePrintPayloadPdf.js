import { useEffect, useState } from "react";
import axios from "axios";
import { renderPrintPayloadToBlob } from "../utils/printPayload";
import { transformToothStateToApi } from "../components/dental/lib/examination-helpers";
import { resolveExamChartForPrintWithContext } from "../utils/examChartStorage";

const hasDentalData = (data) => {
  if (!data) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (data.tooth_states && Array.isArray(data.tooth_states)) {
    return data.tooth_states.length > 0;
  }
  if (data.toothState && typeof data.toothState === "object") {
    return Object.keys(data.toothState).length > 0;
  }
  return false;
};

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
  tcmId = null,
  onlyShowDental = false,
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
      try {
        let rawDental = null;
        if (hasDentalData(dentalexaminationData)) {
          rawDental = dentalexaminationData;
        } else if (hasDentalData(dentalExaminationData)) {
          rawDental = dentalExaminationData;
        } else if (hasDentalData(payload?.dentalExaminationData)) {
          rawDental = payload.dentalExaminationData;
        } else if (hasDentalData(payload?.dentalexaminationData)) {
          rawDental = payload.dentalexaminationData;
        }

        let resolvedToothStates = [];
        if (rawDental) {
          if (Array.isArray(rawDental)) {
            resolvedToothStates = rawDental;
          } else if (rawDental.tooth_states && Array.isArray(rawDental.tooth_states)) {
            resolvedToothStates = rawDental.tooth_states;
          } else if (rawDental.toothState && typeof rawDental.toothState === "object") {
            try {
              resolvedToothStates = transformToothStateToApi(rawDental.toothState);
            } catch (err) {
              console.error("Failed to transform toothState inside usePrintPayloadPdf hook:", err);
            }
          }
        }
        const normalizedDentalData = { tooth_states: resolvedToothStates };

        const examChart = resolveExamChartForPrintWithContext({
          caseManagerData: payload?.caseManagerData,
          examChartOverride: payload?.examChart,
          oralExamination,
          patientUniqueId,
          tcmId,
        });

        const blob = await renderPrintPayloadToBlob({
          ...payload,
          zydusLabData: zydusSelectedLabParams,
          dentalExaminationData: normalizedDentalData,
          examChart,
          oralExamination,
          patientUniqueId,
          tcmId,
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
    tcmId,
    onlyShowDental,
    showSnapRxImages,
    zydusSelectedLabParams,
  ]);

  return { payload, printBlob, isGenerating, error };
};
