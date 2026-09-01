import React from "react";
import { Badge } from "@dhspl-tatvacare/tesseract-ui";

/* The design system's own status atom. `soft` is the quiet treatment — a
   tinted ground with matching ink, no stroke — which is what a label wants:
   a stroked pill reads as a button, and billing is a fact, not an action.
   Every tone maps to a semantic colour rather than a hand-picked ramp. */
const TONE_TO_COLOR = {
  unbilled: "warning",
  warning: "warning",
  billed: "success",
  success: "success",
  primary: "primary",
  error: "error",
  violet: "violet",
  neutral: "neutral",
};

/**
 * Billing state. Shared by the table and the calendar so the same fact never
 * looks like two different things.
 */
export default function BillingTag({ status, className = "" }) {
  if (!status) return null;
  return (
    <StatusTag tone={status === "Unbilled" ? "unbilled" : "billed"} className={className}>
      {status}
    </StatusTag>
  );
}

/** The same chip, for any state worth naming (status, mode, billing). */
export function StatusTag({ tone = "primary", className = "", children }) {
  if (!children) return null;
  return (
    <Badge
      variant="soft"
      color={TONE_TO_COLOR[tone] || "primary"}
      size="sm"
      icons="none"
      className={className}
    >
      {children}
    </Badge>
  );
}
