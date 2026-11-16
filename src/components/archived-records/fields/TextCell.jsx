import React from "react";
import { InputBox } from "@dhspl-tatvacare/tesseract-ui";
import styles from "./fields.module.scss";

/**
 * A text field for one column: the Tesseract input, small. A "multiline"
 * column grows with its text.
 *
 *   variant  "cell" sits in a table cell with no border of its own, as in
 *            the Rx pad; "field" is the bordered input of a form
 *   action   something at the end of the field, such as a dictation button
 *   pending  the text shown is not settled yet (words still being heard), so
 *            it is written in lighter ink
 *
 * The column header is the field's name for a screen reader.
 */
export default function TextCell({ column, value, onChange, variant = "cell", id, invalid = false, describedBy, action, pending = false, ...rest }) {
  const multiline = column.kind === "multiline";
  return (
    <InputBox
      {...rest}
      id={id}
      className={`${styles.control} ${styles[variant]}`}
      variant={variant === "cell" ? "seamless" : "default"}
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
      action={action}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
