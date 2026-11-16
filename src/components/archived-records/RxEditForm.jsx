import React, { useId } from "react";
import { Button, Chip, InputBox, SegmentedControl } from "@dhspl-tatvacare/tesseract-ui";
import { RX_COLUMNS, RX_STATUS, RX_SUGGESTIONS, RX_VITAL_KEYS, rxEditKeys, rxRequired, rxRow } from "./rxFormat";
import styles from "./ArchivedRecords.module.scss";

/**
 * Correcting one fact, field by field, in the Rx pad's own fields for that
 * kind: a medicine is Medicine, Unit per dose, Frequency, When, Duration and
 * Notes; a lab is Test, Value, Unit, Ref. range, Date and its high / low flag.
 *
 * The form holds no state of its own. The draft lives in the workspace so it
 * survives a change of tab or a search.
 */

const FLAG = [
  { value: "", label: "Normal" },
  { value: "up", label: "High" },
  { value: "down", label: "Low" },
];
const FLAG_LABEL = { "": "Normal", up: "High", down: "Low" };
const PLACEHOLDER = { duration: "e.g. 7 Day(s)" };

const asText = (value) => (value == null ? "" : String(value));
const columnsOf = (finding) => RX_COLUMNS[finding.domain] || RX_COLUMNS.RPT;

export const fieldLabel = (finding, key) =>
  key === "arrowDirection" ? "Flag" : columnsOf(finding).find((column) => column.key === key)?.label || key;

// What the form starts from: the row as it reads now, as text.
export const startDraft = (finding) => {
  const { row } = rxRow(finding);
  return Object.fromEntries(rxEditKeys(finding).map((key) => [key, asText(row[key])]));
};

export const isChanged = (finding, draft) => {
  const start = startDraft(finding);
  return Object.keys(start).some((key) => asText(draft[key]).trim() !== start[key].trim());
};

// The corrected row: the row as it reads now with the typed fields on top.
// What the form does not show (type, enable, icd_code) is kept as it was.
export const rowFromDraft = (finding, draft) => ({
  ...rxRow(finding).row,
  ...Object.fromEntries(rxEditKeys(finding).map((key) => [key, asText(draft[key]).trim()])),
});

// The reading before a correction, field by field, for the fields that changed.
export const readAs = (finding) => {
  const before = rxRow(finding.original).row;
  const now = rxRow(finding).row;
  const parts = rxEditKeys(finding.original)
    .filter((key) => asText(before[key]).trim() !== asText(now[key]).trim())
    .map((key) => `${fieldLabel(finding, key)}: ${key === "arrowDirection" ? FLAG_LABEL[before[key] || ""] : asText(before[key]) || "blank"}`);
  // Semicolons between fields: the notes already use commas.
  return parts.length ? parts.join("; ") : finding.original.title;
};

// What stops a save: an empty first column, a lab with no value, a set of
// vitals with no reading in it.
function problem(finding, draft) {
  const empty = (key) => !asText(draft[key]).trim();
  if (finding.domain === "VIT") return RX_VITAL_KEYS.every(empty) ? { keys: [], text: "Enter at least one reading." } : null;
  const keys = rxRequired(finding).filter(empty);
  return keys.length ? { keys, text: `${keys.map((key) => fieldLabel(finding, key)).join(" and ")} cannot be empty.` } : null;
}

// Tesseract chips are spans with role="button": focusable, but Enter and
// Space do nothing on them unless a key handler presses them.
const pressChip = (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target;
  if (target.tagName === "SPAN" && target.getAttribute("role") === "button") {
    event.preventDefault();
    target.click();
  }
};

export default function RxEditForm({ finding, draft, narrow = false, onChange, onSave, onCancel }) {
  const keys = rxEditKeys(finding);
  const { section } = rxRow(finding);
  const errorId = useId();
  const changed = isChanged(finding, draft);
  const wrong = problem(finding, draft);
  const canSave = changed && !wrong;
  const set = (key, value) => onChange({ ...draft, [key]: value });
  // A diagnosis the page calls suspected stays suspected unless the reviewer
  // picks another status here. Say so before it is saved.
  const readStatus = rxRow(finding.original || finding).row.status;
  const upgraded = keys.includes("status") && readStatus === "Suspected" && draft.status !== "Suspected";

  const onFieldKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSave) onSave();
  };
  // Escape closes the form only; it must not also close the drawer around it.
  const onFormKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onCancel();
  };

  return (
    <div className={styles.editForm} role="group" aria-label={`Correct ${finding.title}`} onClick={(event) => event.stopPropagation()} onKeyDown={onFormKeyDown}>
      <div className={styles.editGrid} data-domain={finding.domain} data-narrow={narrow ? "true" : undefined}>
        {keys.map((key, index) => {
          const label = fieldLabel(finding, key);
          if (key === "arrowDirection") {
            return (
              <div key={key} className={styles.editField} data-key={key}>
                <span>{label}</span>
                <SegmentedControl options={FLAG} value={draft[key] || ""} onValueChange={(value) => set(key, value)} size="sm" aria-label={label} />
              </div>
            );
          }
          if (key === "status" && RX_STATUS[section]) {
            return (
              <div key={key} className={styles.editField} data-key={key}>
                <span>{label}</span>
                <SegmentedControl
                  options={RX_STATUS[section].map((value) => ({ value, label: value }))}
                  value={draft[key] || ""}
                  onValueChange={(value) => set(key, value)}
                  size="sm"
                  aria-label={label}
                />
              </div>
            );
          }
          // The Rx pad's short forms, one click each. Anything else can be typed.
          const suggestions = finding.domain === "MED" ? RX_SUGGESTIONS[key] : null;
          // Notes and a complaint run long: they grow with the text.
          const long = key === "notes" || (section === "symptoms" && key === "name");
          return (
            <div key={key} className={styles.editField} data-key={key}>
              <label>
                <span>{label}</span>
                <InputBox
                  fullWidth
                  size="sm"
                  value={draft[key] || ""}
                  autoFocus={index === 0}
                  autoGrow={long}
                  maxHeight={long ? 120 : undefined}
                  placeholder={finding.domain === "MED" ? PLACEHOLDER[key] : undefined}
                  status={wrong?.keys.includes(key) ? "error" : "default"}
                  aria-describedby={wrong?.keys.includes(key) ? errorId : undefined}
                  onChange={(event) => set(key, event.target.value)}
                  onKeyDown={onFieldKeyDown}
                />
              </label>
              {suggestions ? (
                <div className={styles.editSuggest} role="group" aria-label={`${label}, short forms`} onKeyDown={pressChip}>
                  {suggestions.map((option) => {
                    const on = asText(draft[key]).trim() === option;
                    return (
                      <Chip
                        key={option}
                        label={option}
                        size="sm"
                        variant={on ? "filled" : "outline"}
                        color={on ? "primary" : "default"}
                        selected={on}
                        onClick={() => set(key, option)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className={styles.asWritten}>
        <span>As written</span>
        {(finding.original || finding).verbatim}
      </p>
      {upgraded ? (
        <p className={styles.editCaution}>
          The page says suspected. Saving records this as {draft.status ? draft.status.toLowerCase() : "having no status"}.
        </p>
      ) : null}
      {wrong ? <p className={styles.editError} id={errorId} role="alert">{wrong.text}</p> : null}
      <div className={styles.editActions}>
        <Button variant="solid" theme="primary" size="sm" disabled={!canSave} onClick={onSave}>Save and verify</Button>
        <Button variant="ghost" theme="neutral" size="sm" onClick={onCancel}>Cancel</Button>
        <span className={styles.editHint}>
          {changed
            ? "The page itself is not changed. Your correction is saved with your name."
            : "Nothing changed yet. If the row is already right, cancel and use Verify."}
        </span>
      </div>
    </div>
  );
}
