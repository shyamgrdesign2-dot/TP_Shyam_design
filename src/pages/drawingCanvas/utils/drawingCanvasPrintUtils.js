import { listPatientCanvasMapping } from "../service";
import { exportToBlob } from "@excalidraw/excalidraw";
import {
  deleteCachedCanvasPrint,
  getCachedCanvasPrint,
  setCachedCanvasPrint,
} from "./drawingCanvasPrintCache";

export const DRAWING_CANVAS_CASE_OPTION = {
  id: 25,
  title: "Canvas",
  format: "inline",
  enable: "Y",
  custom_status: "Y",
};

export const normalizeCanvasIds = (value) => {
  if (Array.isArray(value)) {
    return value.map((id) => String(id).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
};

export const getCanvasMappingId = (record) => {
  if (!record || typeof record !== "object") return null;
  return (
    record.mapping_id ??
    record.canvas_id ??
    record.canvasId ??
    record.id ??
    null
  );
};

export const filterCanvasRecordsByFilename = (records, canvasFilename) => {
  if (!Array.isArray(records)) return [];

  const hasCanvasFilenameField =
    Array.isArray(canvasFilename) || typeof canvasFilename === "string";
  if (!hasCanvasFilenameField) {
    return [];
  }

  const selectedCanvasIds = normalizeCanvasIds(canvasFilename);
  if (selectedCanvasIds.length === 0) {
    return [];
  }

  const selectedSet = new Set(selectedCanvasIds.map(String));
  return records.filter((record) => {
    const recordId = getCanvasMappingId(record);
    if (recordId == null) return false;
    return selectedSet.has(String(recordId));
  });
};

/**
 * Deduplicates the print-side canvas pipeline.
 *
 * A single consultation view builds the print PDF from more than one place, and each
 * build re-ran this whole pipeline: the mapping API, a ~875KB scene download per
 * canvas, and a full Excalidraw rasterisation. Sharing the in-flight promise collapses
 * those duplicates into one load.
 *
 * Note: onCorruptCanvas/onApiFailed only fire for the caller that misses the cache.
 * They are telemetry, so one event per real load is what we want anyway.
 */
export async function loadDrawingCanvasesForPrint(options) {
  const { patientId, tcmId, canvasFilename } = options || {};
  const cacheKey = [
    patientId,
    tcmId,
    normalizeCanvasIds(canvasFilename).join(","),
  ].join("|");

  const cached = getCachedCanvasPrint(cacheKey);
  if (cached) return cached;

  const promise = loadDrawingCanvasesForPrintUncached(options).then((result) => {
    // A transient mapping-API failure must not be cached as "this consultation has
    // no canvases" for the rest of the TTL.
    if (result.apiFailed) {
      deleteCachedCanvasPrint(cacheKey);
    }
    return {
      drawingCanvases: result.drawingCanvases,
      corruptedCanvasSkipped: result.corruptedCanvasSkipped,
    };
  });

  setCachedCanvasPrint(cacheKey, promise);
  return promise;
}

async function loadDrawingCanvasesForPrintUncached({
  patientId,
  tcmId,
  canvasFilename,
  renderContext = "pdf_generation",
  onCorruptCanvas,
  onApiFailed,
}) {
  if (!patientId || !tcmId) {
    return { drawingCanvases: [], corruptedCanvasSkipped: 0, apiFailed: false };
  }

  const hasCanvasFilenameField =
    Array.isArray(canvasFilename) || typeof canvasFilename === "string";
  if (!hasCanvasFilenameField) {
    return { drawingCanvases: [], corruptedCanvasSkipped: 0, apiFailed: false };
  }

  let drawingCanvases = [];
  let corruptedCanvasSkipped = 0;
  let apiFailed = false;

  try {
    const res = await listPatientCanvasMapping(patientId, tcmId);
    const recordsArray = res?.records || res?.data?.records;
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
              // JPEG, not the default PNG. @react-pdf embeds JPEG straight through as
              // DCTDecode — it only parses the SOF header. A PNG instead goes through
              // pdfkit's splitAlphaChannel: pure-JS inflate of the full raster, a
              // per-pixel RGB/alpha split, then two pure-JS deflates. In Node those
              // are native and finish in ~70ms; in the browser they run on polyfilled
              // Buffer/zlib and hard-freeze the tab on a photo-sized canvas
              // (measured: 507x690 RGBA, 586KB, never completes).
              // exportBackground below makes the canvas opaque, so dropping PNG's
              // alpha channel costs nothing.
              const blob = await exportToBlob({
                elements: parsedData.elements,
                appState: { ...parsedData.appState, exportBackground: true },
                files: parsedData.files,
                mimeType: "image/jpeg",
                quality: 0.92,
              });
              if (blob) {
                const url = URL.createObjectURL(blob);
                drawingCanvases.push({
                  id: getCanvasMappingId(record),
                  name: record.canvas_name || "Untitled Canvas",
                  imageUrl: url,
                });
              }
            }
          }
        } catch (err) {
          console.error(`Failed to parse canvas mapping: ${record.canvas_name}`, err);
          corruptedCanvasSkipped += 1;
          onCorruptCanvas?.({
            patientId,
            tcmId,
            record,
            error: err,
            renderContext,
          });
        }
      }
    }
  } catch (err) {
    apiFailed = true;
    console.error("Failed to load drawing canvases for print:", err);
    onApiFailed?.({ patientId, tcmId, error: err });
  }

  return { drawingCanvases, corruptedCanvasSkipped, apiFailed };
}

export const ensureDrawingCanvasCaseOption = (printSettings) => {
  if (!printSettings || typeof printSettings !== "object") {
    return {
      prescription: {
        case_option: [{ ...DRAWING_CANVAS_CASE_OPTION }],
      },
    };
  }

  const updated = { ...printSettings };
  const prescription = { ...(updated.prescription || {}) };
  const caseOption = Array.isArray(prescription.case_option)
    ? [...prescription.case_option]
    : [];

  const existingIndex = caseOption.findIndex((option) => option?.id === 25);
  if (existingIndex === -1) {
    caseOption.push({ ...DRAWING_CANVAS_CASE_OPTION });
  } else {
    const existing = caseOption[existingIndex];
    caseOption[existingIndex] = {
      ...existing,
      enable: existing.enable || "Y",
      custom_status: existing.custom_status || "Y",
      format: existing.format || "inline",
      title: existing.title || DRAWING_CANVAS_CASE_OPTION.title,
    };
  }

  prescription.case_option = caseOption;
  updated.prescription = prescription;
  return updated;
};
