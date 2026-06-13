import { useEffect, useState } from "react";
import axios from "axios";
import { renderPrintPayloadToBlob } from "../utils/printPayload";
import { listPatientCanvasMapping } from "../pages/drawingCanvas/service";
import {
  ensureDrawingCanvasCaseOption,
  filterCanvasRecordsByFilename,
} from "../pages/drawingCanvas/utils/drawingCanvasPrintUtils";
import { exportToBlob } from "@excalidraw/excalidraw";
import { trackEvent } from "../utils/utils";

export const usePrintPayloadPdf = ({
  printUrl,
  selectedLang,
  isGynaecHistoryAccessable,
  showSnapRxImages,
  payloadOverride,
  skipFetch = false,
  zydusSelectedLabParams = null,
  isCvtExtHosAccessableFromGB,
  patientId,
  tcmId,
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
        let drawingCanvases = [];
        let corruptedCanvasSkipped = 0;
        
        // Use props if provided, otherwise fallback to parsing payload/url if needed
        const resolvedPatientId = patientId || payload?.caseManagerData?.patient_data?.patient_unique_id;
        const resolvedTcmId = tcmId || payload?.caseManagerData?.tcm_id;

        if (resolvedPatientId && resolvedTcmId) {
            try {
                const res = await listPatientCanvasMapping(resolvedPatientId, resolvedTcmId);
                const recordsArray = res?.records || res?.data?.records;
                const canvasFilename = payload?.caseManagerData?.canvas_filename;
                const filteredRecordsArray = filterCanvasRecordsByFilename(
                  recordsArray,
                  canvasFilename
                );

                if (res?.status && filteredRecordsArray.length > 0) {
                    for (const record of filteredRecordsArray) {
                        try {
                            if (!record?.canvas_url) continue;
                            const response = await fetch(record.canvas_url);
                            const textData = await response.text();
                            
                            if (textData) {
                                const parsedData = JSON.parse(textData);
                                if (parsedData?.elements) {
                                    const blob = await exportToBlob({
                                        elements: parsedData.elements,
                                        appState: { ...parsedData.appState, exportBackground: true },
                                        files: parsedData.files,
                                    });
                                    if (blob) {
                                        const url = URL.createObjectURL(blob);
                                        drawingCanvases.push({
                                            name: record.canvas_name || "Untitled Canvas",
                                            imageUrl: url
                                        });
                                    }
                                }
                            }
                        } catch (err) {
                            console.error(`Failed to parse canvas mapping: ${record.canvas_name}`, err);
                            corruptedCanvasSkipped++;
                            trackEvent("drawing_canvas_corrupt_scene_detected", {
                              patient_id: resolvedPatientId,
                              consultation_id: resolvedTcmId,
                              canvas_id: record?.mapping_id || record?.canvas_id || record?.id,
                              render_context: "pdf_generation",
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to inject drawing canvases into payload:", err);
                trackEvent("drawing_canvas_api_failed", {
                  patient_id: resolvedPatientId,
                  consultation_id: resolvedTcmId,
                  api_name: "listPatientCanvasMapping",
                  error_code: err?.code || "EXCEPTION",
                  error_message: err?.message || "Failed to fetch canvases for PDF",
                });
            }
        }

        const printSettingsWithCanvas =
          drawingCanvases.length > 0
            ? ensureDrawingCanvasCaseOption(payload.printSettings)
            : payload.printSettings;

        const blob = await renderPrintPayloadToBlob({
          ...payload,
          printSettings: printSettingsWithCanvas,
          drawingCanvases,
          zydusLabData: zydusSelectedLabParams,
          ...(typeof isCvtExtHosAccessableFromGB === "boolean"
            ? { isCvtExtHosAccessableFromGB }
            : {}),
        }, {
          selectedLang,
          isGynaecHistoryAccessable,
          showSnapRxImages,
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
  }, [payload, selectedLang, isGynaecHistoryAccessable, skipFetch, isCvtExtHosAccessableFromGB, patientId, tcmId]);

  return { payload, printBlob, isGenerating, error };
};
