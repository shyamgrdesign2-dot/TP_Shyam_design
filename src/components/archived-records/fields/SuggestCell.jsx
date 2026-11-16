import React, { useState } from "react";
import { Dropdown } from "@dhspl-tatvacare/tesseract-ui";
import styles from "./fields.module.scss";

/**
 * Free text with a short list of the usual answers under it: the Tesseract
 * dropdown in its editable form, as the Rx pad's Frequency, When and
 * Duration cells are. Anything can be typed; the list only helps.
 *
 * The list opens when the field takes focus and narrows as text is typed. It
 * stays away when nothing matches, and when the only match is what the field
 * already says. While it is open, Enter and Escape belong to the list.
 */
export default function SuggestCell({ column, options, value, onChange, variant = "cell", invalid = false }) {
  const [open, setOpen] = useState(false);
  const text = String(value ?? "").trim().toLowerCase();
  const matches = options.filter((option) => !text || String(option.label).toLowerCase().includes(text));
  const said = matches.length === 1 && String(matches[0].label).toLowerCase() === text;
  const shown = open && matches.length > 0 && !said;

  return (
    <Dropdown
      className={`${styles.control} ${styles[variant]}`}
      variant={variant === "cell" ? "seamless" : "default"}
      editable
      chevron={false}
      options={options}
      value={value ?? ""}
      open={shown}
      onOpenChange={setOpen}
      placeholder={column.placeholder || ""}
      ariaLabel={column.label}
      status={invalid ? "error" : undefined}
      onChange={onChange}
      onKeyDown={(event) => {
        if (!shown) return;
        if (event.key === "Tab") setOpen(false);
        if (event.key === "Enter" || event.key === "Escape") event.stopPropagation();
      }}
    />
  );
}
