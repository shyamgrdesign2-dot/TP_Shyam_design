import { useEffect, useState } from "react";
import axios from "axios";
import { renderPrintPayloadToBlob } from "../utils/printPayload";
import { resolveDentalOralForPrint } from "../utils/resolveDentalOralPrintData";

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
  allowFullApiFallback = true,
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
        const caseManagerData = payload?.caseManagerData;
        const resolvedPatientId =
          patientUniqueId ||
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

        const blob = await renderPrintPayloadToBlob({
          ...payload,
          zydusLabData: zydusSelectedLabParams,
          dentalExaminationData: normalizedDentalData,
          examChart,
          oralExamination,
          patientUniqueId: resolvedPatientId,
          tcmId: resolvedTcmId,
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
    allowFullApiFallback,
  ]);

  return { payload, printBlob, isGenerating, error };
};
