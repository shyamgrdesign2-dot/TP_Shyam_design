import React from "react";
import { SegmentedControl } from "@dhspl-tatvacare/tesseract-ui";
import styles from "./fields.module.scss";

/**
 * One of two or three, all in view: the Tesseract segmented control, as the
 * Status of an allergy or a condition is under Medical History.
 *
 * A row with no status yet shows none chosen. The control is a radio group
 * named by the column.
 */
export default function SegmentCell({ column, options, value, onChange, variant = "cell" }) {
  return (
    <div className={`${styles.segment} ${styles[variant]}`}>
      <SegmentedControl
        options={options}
        // No value is "none chosen"; undefined would let the control pick the first.
        value={value || ""}
        onValueChange={onChange}
        size="sm"
        variant="block"
        fullWidth
        aria-label={column.label}
      />
    </div>
  );
}
