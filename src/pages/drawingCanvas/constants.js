export const CANVAS_NAME_MAX_LENGTH = 20;

export function normalizeCanvasName(value) {
  return String(value || "").trim().slice(0, CANVAS_NAME_MAX_LENGTH);
}
