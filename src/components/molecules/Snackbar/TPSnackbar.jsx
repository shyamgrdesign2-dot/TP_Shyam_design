"use client";

/**
 * TPSnackbar — thin adapter over the new Snackbar molecule.
 *
 * Preserves the MUI-compatible onClose(event, reason) signature so
 * existing callers don't need to change.
 *
 * @deprecated Prefer `@/src/components/molecules/Snackbar` directly in new code.
 */

import React from "react";

import { Snackbar } from "./Snackbar";
















export function TPSnackbar({
  open,
  message,
  severity = "success",
  autoHideDuration = 4000,
  onClose,
  anchorOrigin,
  className,
  style
}) {
  return (
    <Snackbar
      open={open}
      message={message ?? ""}
      severity={severity}
      autoHideDuration={autoHideDuration ?? undefined}
      onClose={onClose ? () => onClose(null, "timeout") : undefined}
      anchorVertical={anchorOrigin?.vertical ?? "top"}
      anchorHorizontal={anchorOrigin?.horizontal ?? "center"}
      className={className}
      style={style} />);


}