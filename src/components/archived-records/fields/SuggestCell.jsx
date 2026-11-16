import React, { useState } from "react";
import { Dropdown } from "@dhspl-tatvacare/tesseract-ui";
import { RxPadText } from "./RxPadInputs";
import styles from "./fields.module.scss";

/**
 * Free text with a short list of the usual answers under it. Anything can be
 * typed; the list only helps. In a cell of the Rx pad table (variant "cell")
 * it is the Rx pad's own AutoComplete, as its Since and Duration cells are;
 * in a labelled form (variant "field") it is the Tesseract dropdown in its
 * editable form.
 *
 * The list opens when the field takes focus and narrows as text is typed. It
 * stays away when nothing matches, and when the only match is what the field
 * already says. While it is open, Enter and Escape belong to the list.
 */
export default function SuggestCell(props) {
  if ((props.variant ?? "cell") === "cell") return <RxPadText {...props} />;
  return <SuggestField {...props} />;
}

function SuggestField({ column, options, value, onChange, invalid = false }) {
  const [open, setOpen] = useState(false);
  const text = String(value ?? "").trim().toLowerCase();
  const matches = options.filter((option) => !text || String(option.label).toLowerCase().includes(text));
  const said = matches.length === 1 && String(matches[0].label).toLowerCase() === text;
  const shown = open && matches.length > 0 && !said;

  return (
    <Dropdown
      className={`${styles.control} ${styles.field}`}
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
