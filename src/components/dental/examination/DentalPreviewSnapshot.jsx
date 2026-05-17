/**
 * DentalPreviewSnapshot — side-effect component that persists a preview
 * snapshot to the rx-preview store whenever the canvas state changes.
 *
 * Renders nothing. All logic is in the useEffect.
 */
import { useEffect } from "react";
import { saveDentalPreviewSnapshot } from "../tp-rxpad/rx-preview-store";
import { toDentalPreviewSections } from "../lib/useDentalScore";

/**
 * @param {{ patientId: string, canvasState: object|null }} props
 */
export function DentalPreviewSnapshot({ patientId, canvasState }) {
  useEffect(() => {
    if (!canvasState) return;
    saveDentalPreviewSnapshot(patientId, {
      patientId,
      updatedAt: new Date().toISOString(),
      sections: toDentalPreviewSections(canvasState)
    });
  }, [canvasState, patientId]);

  return null;
}
