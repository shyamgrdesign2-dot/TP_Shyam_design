import React from "react";
import { InputBox } from "@dhspl-tatvacare/tesseract-ui";
import { RxPadMeasure, RxPadNotes, RxPadText } from "./RxPadInputs";
import styles from "./fields.module.scss";

/**
 * A text field for one column. A "multiline" column grows with its text; a
 * "measure" is a reading with its unit after it.
 *
 *   variant  "cell" is a cell of the Rx pad table and holds the Rx pad's own
 *            input for that kind of column (RxPadInputs.jsx); "field" is the
 *            bordered Tesseract input of a labelled form
 *   action   something at the end of the field, such as a dictation button
 *   pending  the text shown is not settled yet (words still being heard), so
 *            it is written in lighter ink
 *
 * The column header is the field's name for a screen reader.
 */
export default function TextCell({ column, value, onChange, variant = "cell", id, invalid = false, describedBy, action, pending = false, ...rest }) {
  const multiline = column.kind === "multiline";
  if (variant === "cell") {
    const Pad = multiline ? RxPadNotes : column.kind === "measure" ? RxPadMeasure : RxPadText;
    return <Pad column={column} value={value} onChange={onChange} id={id} invalid={invalid} describedBy={describedBy} action={action} pending={pending} />;
  }
  return (
    <InputBox
      {...rest}
      id={id}
      className={`${styles.control} ${styles.field}`}
      size="sm"
      fullWidth
      value={value ?? ""}
      placeholder={column.placeholder}
      aria-label={column.label}
      aria-describedby={invalid ? describedBy : undefined}
      data-pending={pending ? "true" : undefined}
      autoGrow={multiline}
      maxHeight={multiline ? 120 : undefined}
      status={invalid ? "error" : "default"}
      unit={column.unit}
      action={action}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
