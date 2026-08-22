/**
 * Shared cache for the print-side drawing-canvas pipeline.
 *
 * Lives in its own module so the canvas service can invalidate it without importing
 * drawingCanvasPrintUtils (which imports the service, and would make a cycle).
 *
 * Entries hold the in-flight promise, not the resolved value, so callers that arrive
 * while a load is running share that load instead of starting a second one.
 */
const cache = new Map();

export const PRINT_CANVAS_CACHE_TTL_MS = 60000;

export const getCachedCanvasPrint = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at >= PRINT_CANVAS_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.promise;
};

export const setCachedCanvasPrint = (key, promise) => {
  cache.set(key, { at: Date.now(), promise });
};

export const deleteCachedCanvasPrint = (key) => {
  cache.delete(key);
};

/** Call after any canvas write so the next print re-reads the edited drawing. */
export const clearDrawingCanvasPrintCache = () => {
  cache.clear();
};
