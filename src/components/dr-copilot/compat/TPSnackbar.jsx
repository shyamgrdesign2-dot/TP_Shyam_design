/* Minimal stand-in for the source repo's MUI-backed TPSnackbar.
 *
 * The portal does not ship @mui/material, and every Dr. Agent call site passes
 * an already-styled node as `message`, so all this needs to provide is the
 * positioning, the auto-hide timer, and the MUI onClose(event, reason) contract.
 */
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export function TPSnackbar({
  open,
  message,
  onClose,
  autoHideDuration = 2800,
  anchorOrigin = { vertical: "top", horizontal: "center" },
}) {
  useEffect(() => {
    if (!open || !autoHideDuration) return undefined;
    const t = setTimeout(() => onClose && onClose(null, "timeout"), autoHideDuration);
    return () => clearTimeout(t);
  }, [open, autoHideDuration, onClose]);

  if (!open || typeof document === "undefined") return null;

  const { vertical = "top", horizontal = "center" } = anchorOrigin || {};
  const style = {
    position: "fixed",
    zIndex: 2000,
    display: "flex",
    pointerEvents: "none",
    [vertical]: 24,
    ...(horizontal === "center"
      ? { left: "50%", transform: "translateX(-50%)" }
      : { [horizontal]: 24 }),
  };

  return createPortal(<div style={style}>{message}</div>, document.body);
}
