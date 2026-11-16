import React, { useState } from "react";
import { AutoComplete, Input, Select } from "antd";
import PrescriptionNoteInput from "../../PrescriptionNoteInput";
import styles from "./fields.module.scss";

/**
 * The Rx pad's own table inputs, for a cell of the Rx pad table a row is
 * corrected in (RxEditForm.jsx). These are the components and class names the
 * product's section boxes put in their cells, so the Rx pad's table skin
 * (components/tesseractRxPad.scss) styles them here as it does there:
 *
 *   RxPadText     AutoComplete, as Name, Since, Unit per dose and Duration are
 *   RxPadSelect   Select, as a diagnosis's Status is
 *   RxPadNotes    PrescriptionNoteInput, as every Notes cell is
 *   RxPadMeasure  Input with the unit after it, as a vitals field is
 *
 * They take a column definition and a plain value, like the other cell
 * editors, and know nothing of the product's stores or searches: a name is
 * typed, not looked up.
 *
 * While a list is open, Enter and Escape belong to the list and go no
 * further, so they neither save nor close whatever the cell sits in.
 */

const POPUP = { popupClassName: "prescription-new-wide-dropdown", popupMatchSelectWidth: false };
const FIELD = "autocomplete-custom w-100 inputborder";
const named = (column, invalid, describedBy) => ({
  "aria-label": column.label,
  "aria-invalid": invalid ? "true" : undefined,
  "aria-describedby": invalid ? describedBy : undefined,
});

// Free text, with a short list of the usual answers when the column has one.
// The list narrows as text is typed and stays away when nothing matches, or
// when the only match is what the field already says.
export function RxPadText({ column, options = [], value, onChange, id, invalid = false, describedBy }) {
  const [open, setOpen] = useState(false);
  const text = String(value ?? "").trim().toLowerCase();
  const matches = options.filter((option) => !text || String(option.label).toLowerCase().includes(text));
  const said = matches.length === 1 && String(matches[0].label).toLowerCase() === text;
  const shown = open && matches.length > 0 && !said;
  return (
    <div
      className={styles.pad}
      data-invalid={invalid ? "true" : undefined}
      onKeyDown={(event) => {
        if (shown && (event.key === "Enter" || event.key === "Escape")) event.stopPropagation();
      }}
    >
      <AutoComplete
        id={id}
        className={`${FIELD} ${column.inputClass || ""}`}
        variant="borderless"
        value={value ?? ""}
        placeholder={column.placeholder}
        options={matches.map((option) => ({ value: String(option.label) }))}
        filterOption={false}
        defaultActiveFirstOption
        open={shown}
        onDropdownVisibleChange={setOpen}
        onChange={(next) => onChange(next ?? "")}
        {...POPUP}
        {...named(column, invalid, describedBy)}
      />
    </div>
  );
}

// One of a closed list. A choice whose own value is empty (a lab that is
// neither high nor low) is one of the list; otherwise the field can be cleared.
export function RxPadSelect({ column, options = [], value, onChange, id, invalid = false, describedBy }) {
  const [open, setOpen] = useState(false);
  const hasBlank = options.some((option) => option.value === "");
  const current = value ?? "";
  return (
    <div
      className={styles.pad}
      data-invalid={invalid ? "true" : undefined}
      onKeyDown={(event) => {
        // Enter opens the list, or picks from it; it does not save from here
        // (Ctrl or Cmd + Enter still does, while the list is shut).
        const plain = !(event.metaKey || event.ctrlKey);
        if ((event.key === "Enter" && (open || plain)) || (open && event.key === "Escape")) event.stopPropagation();
      }}
    >
      <Select
        id={id}
        className={`${FIELD} ${column.inputClass || ""}`}
        placeholder={column.placeholder || column.label}
        value={current === "" && !hasBlank ? null : current}
        options={options}
        allowClear={!hasBlank}
        open={open}
        onDropdownVisibleChange={setOpen}
        onChange={(next) => onChange(next ?? "")}
        {...POPUP}
        {...named(column, invalid, describedBy)}
      />
    </div>
  );
}

// Notes: one line that grows to three, then scrolls. `action` sits at the end
// of the cell (the dictation button); `pending` says the text is not settled.
export function RxPadNotes({ column, value, onChange, id, invalid = false, describedBy, action, pending = false }) {
  return (
    <div className={styles.padNotes} data-invalid={invalid ? "true" : undefined}>
      <PrescriptionNoteInput
        enabled
        legacyMultiline={false}
        id={id}
        className="notesinput border-0"
        placeholder={column.placeholder}
        value={value ?? ""}
        data-pending={pending ? "true" : undefined}
        onChange={(event) => onChange(event.target.value)}
        {...named(column, invalid, describedBy)}
      />
      {action ? <span className={styles.padAction}>{action}</span> : null}
    </div>
  );
}

// A reading with its unit after it.
export function RxPadMeasure({ column, value, onChange, id, invalid = false, describedBy }) {
  return (
    <div className={styles.pad} data-invalid={invalid ? "true" : undefined}>
      <Input
        id={id}
        className={column.inputClass}
        placeholder={column.placeholder}
        value={value ?? ""}
        addonAfter={column.unit || undefined}
        onChange={(event) => onChange(event.target.value)}
        {...named(column, invalid, describedBy)}
      />
    </div>
  );
}
