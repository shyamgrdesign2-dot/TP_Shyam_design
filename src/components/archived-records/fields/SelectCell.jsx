import React, { useRef, useState } from "react";
import { Dropdown } from "@dhspl-tatvacare/tesseract-ui";
import { RxPadSelect } from "./RxPadInputs";
import { optionLabel } from "./options";
import styles from "./fields.module.scss";

/**
 * One of a closed list. In a cell of the Rx pad table (variant "cell") it is
 * the Rx pad's own Select, as its Status and Severity cells are; in a
 * labelled form or a filter bar (variant "field") it is the Tesseract
 * dropdown.
 *
 * Enter, Space or Arrow down opens the list. While it is open, Enter and
 * Escape belong to the list and go no further, so they neither save nor
 * close whatever the field sits in.
 */

// The dropdown reads an empty value as "nothing chosen". A choice whose own
// value is empty (a lab that is neither high nor low) travels under this.
const BLANK = "__blank";

export default function SelectCell(props) {
  if ((props.variant ?? "cell") === "cell") return <RxPadSelect {...props} />;
  return <DropdownField {...props} />;
}

function DropdownField({ column, options, value, onChange, invalid = false }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const hasBlank = options.some((option) => option.value === "");
  const items = hasBlank ? options.map((option) => (option.value === "" ? { ...option, value: BLANK } : option)) : options;
  const current = (value ?? "") === "" ? (hasBlank ? BLANK : "") : value;
  // A value from outside the list is still shown and read out as it is.
  const chosen = optionLabel(options, value) ?? (value ? String(value) : undefined);

  return (
    <Dropdown
      ref={root}
      className={`${styles.control} ${styles.field}`}
      options={items}
      value={current}
      open={open}
      onOpenChange={setOpen}
      placeholder={column.placeholder || column.label}
      // The trigger is a button, and a button's name hides its text. Name it
      // with the column and the choice so both are read out.
      ariaLabel={chosen ? `${column.label}, ${chosen}` : column.label}
      status={invalid ? "error" : undefined}
      data-empty={chosen ? undefined : "true"}
      onChange={(next) => {
        onChange(next === BLANK ? "" : next);
        // A choice made with the mouse leaves the keyboard nowhere.
        root.current?.querySelector("button")?.focus({ preventScroll: true });
      }}
      onKeyDown={(event) => {
        if (!open) return;
        if (event.key === "Tab") setOpen(false);
        if (event.key === "Enter" || event.key === "Escape") event.stopPropagation();
      }}
    />
  );
}
