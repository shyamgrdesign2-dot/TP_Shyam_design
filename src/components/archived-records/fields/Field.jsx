import React from "react";
import SelectCell from "./SelectCell";
import SuggestCell from "./SuggestCell";
import TextCell from "./TextCell";
import { optionsOf } from "./options";

/**
 * The editor for one column, chosen by the column's `kind`:
 *
 *   { key, label, placeholder, kind: "text" | "multiline" | "select" | "suggest", options }
 *
 * `context` is handed to a column whose options depend on the row (a status
 * list that differs by section, a duration that offers units for the number
 * typed). `action` and `pending` only apply to text fields.
 */
export default function Field({ column, context, action, pending, describedBy, id, ...rest }) {
  if (column.kind === "select") return <SelectCell column={column} options={optionsOf(column, context)} {...rest} />;
  if (column.kind === "suggest") return <SuggestCell column={column} options={optionsOf(column, context)} {...rest} />;
  return <TextCell column={column} id={id} action={action} pending={pending} describedBy={describedBy} {...rest} />;
}
