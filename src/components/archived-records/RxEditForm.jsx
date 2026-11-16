import React, { useEffect, useId, useRef } from "react";
import { Button, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { DictationButton, Field } from "./fields";
import { RX_COLUMNS, RX_EXTRA_FIELDS, RX_FLAG, RX_VITAL_KEYS, rxEditFields, rxEditKeys, rxRequired, rxRow } from "./rxFormat";
import { DICTATION_UNAVAILABLE, joinSpoken, useDictation } from "./useDictation";
import styles from "./ArchivedRecords.module.scss";

/**
 * Correcting one fact the way the Rx pad edits a row: in the table's own
 * columns. A medicine is Medicine, Unit per dose, Frequency, When, Duration
 * and Notes; a lab is Test, Value, Unit, Ref. range, Date and its high / low
 * flag.
 *
 * Two layouts, from the room the table has (useTableLayout):
 *   wide           the row's cells become inputs in place, under the same
 *                  headers as every other row; Save and Cancel take the place
 *                  of the row's actions
 *   tight, stack   a labelled form, one field a line
 * Both are built from the same column definitions (rxFormat.js) with the
 * same field components (fields/), so a new kind of row needs no code here.
 *
 * Keys: Enter saves from a one-line field, Ctrl or Cmd + Enter from anywhere.
 * Enter in notes is a new line, and Enter or Escape in an open list belongs
 * to the list. Escape stops dictation if it is listening, otherwise cancels.
 *
 * The editor holds no draft of its own. The draft lives in the workspace so
 * it survives a change of tab or a search.
 */

const FLAG_LABEL = Object.fromEntries(RX_FLAG.map((flag) => [flag.value, flag.label]));

const asText = (value) => (value == null ? "" : String(value));
const fieldsOf = (finding) => [...(RX_COLUMNS[finding.domain] || RX_COLUMNS.RPT), ...(RX_EXTRA_FIELDS[finding.domain] || [])];

export const fieldLabel = (finding, key) => fieldsOf(finding).find((column) => column.key === key)?.label || key;

// What the editor starts from: the row as it reads now, as text.
export const startDraft = (finding) => {
  const { row } = rxRow(finding);
  return Object.fromEntries(rxEditKeys(finding).map((key) => [key, asText(row[key])]));
};

export const isChanged = (finding, draft) => {
  const start = startDraft(finding);
  return Object.keys(start).some((key) => asText(draft[key]).trim() !== start[key].trim());
};

// The corrected row: the row as it reads now with the typed fields on top.
// What the editor does not show (type, enable, icd_code) is kept as it was.
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

const HINT_IDLE = "Nothing changed yet. If the row is already right, cancel and use Verify.";
const HINT_KEPT = "The page itself is not changed. Your correction is saved with your name.";

export default function RxEditForm({ finding, draft, layout = "tight", narrow = false, onChange, onSave, onCancel }) {
  const inline = layout === "wide";
  const fields = rxEditFields(finding);
  const { section, row } = rxRow(finding);
  const formId = useId();
  const errorId = `${formId}-error`;
  const changed = isChanged(finding, draft);
  const wrong = problem(finding, draft);
  const canSave = changed && !wrong;
  // A diagnosis the page calls suspected stays suspected unless the reviewer
  // picks another status here. Say so before it is saved.
  const readStatus = rxRow(finding.original || finding).row.status;
  const upgraded = fields.some((field) => field.key === "status") && readStatus === "Suspected" && draft.status !== "Suspected";

  // One field of the row takes dictation: its notes, or a note's details.
  // Each settled phrase is added to what the field holds by then.
  const spoken = fields.find((field) => field.dictate);
  const latest = useRef(draft);
  latest.current = draft;
  const dictation = useDictation({
    onFinal: (text) => {
      if (spoken) onChange({ ...latest.current, [spoken.key]: joinSpoken(latest.current[spoken.key], text) });
    },
  });
  const hearing = Boolean(spoken && dictation.interim);

  const set = (key, value) => {
    // Typing over words that are still being heard takes over from the
    // microphone: what is typed stays, the unfinished phrase is let go.
    if (hearing && key === spoken.key) dictation.cancel();
    onChange({ ...draft, [key]: value });
  };

  // The keyboard starts in the first field. (It goes back to the row when
  // the editor closes; the table does that.)
  const first = useRef(null);
  useEffect(() => {
    first.current?.querySelector("input, textarea, button")?.focus({ preventScroll: true });
  }, []);

  // A click in a field, on a list or on a button is that and nothing more:
  // it does not also open the row's source page again.
  const onClick = (event) => event.stopPropagation();

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      // Escape ends here: it must not also close the drawer around the table.
      event.stopPropagation();
      if (dictation.listening) dictation.stop();
      else onCancel();
      return;
    }
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
    const tag = event.target.tagName;
    const anywhere = event.metaKey || event.ctrlKey;
    // Plain Enter saves from a one-line field only: in notes it is a new
    // line, on a button or a select it presses that.
    if (anywhere ? tag === "BUTTON" : event.shiftKey || event.altKey || tag !== "INPUT") return;
    event.preventDefault();
    if (canSave) onSave();
  };

  const renderField = (field, variant, id) => {
    const heard = hearing && field.key === spoken.key;
    return (
      <Field
        column={field}
        context={{ value: draft[field.key], section, row }}
        variant={variant}
        id={id}
        value={heard ? joinSpoken(draft[field.key], dictation.interim) : asText(draft[field.key])}
        pending={heard}
        invalid={Boolean(wrong?.keys.includes(field.key))}
        describedBy={errorId}
        action={field.dictate && dictation.supported ? <DictationButton dictation={dictation} label={`Dictate ${field.label.toLowerCase()}`} /> : undefined}
        onChange={(value) => set(field.key, value)}
      />
    );
  };

  const asWritten = (
    <p className={styles.asWritten}>
      <span>As written</span>
      {(finding.original || finding).verbatim}
    </p>
  );
  const caution = upgraded ? (
    <p className={styles.editCaution}>
      The page says suspected. Saving records this as {draft.status ? draft.status.toLowerCase() : "having no status"}.
    </p>
  ) : null;
  const error = wrong ? <p className={styles.editError} id={errorId} role="alert">{wrong.text}</p> : null;
  // Always present while there is a microphone, so a screen reader hears the
  // state change. It shows nothing when there is nothing to say.
  const voice = spoken && dictation.supported ? (
    <p className={styles.rxEditVoice} role="status">
      {dictation.listening ? "Listening. Pause or press Esc to stop." : dictation.available ? "" : `${DICTATION_UNAVAILABLE}.`}
    </p>
  ) : null;
  const save = <Button variant="solid" theme="primary" size="sm" disabled={!canSave} onClick={onSave}>Save and verify</Button>;

  if (inline) {
    const columns = RX_COLUMNS[finding.domain] || RX_COLUMNS.RPT;
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    const firstAt = columns.findIndex((column) => byKey[column.key]);
    // A field with no column of its own sits under the column it belongs to.
    const under = (field) => Math.max(0, columns.findIndex((column) => column.key === field.under)) + 2;
    return (
      <>
        {columns.map((column, index) => {
          const field = byKey[column.key];
          return (
            <div
              key={column.key}
              ref={index === firstAt ? first : undefined}
              className={styles.rxEditCell}
              role="cell"
              data-key={column.key}
              data-first={index === 0 ? "true" : undefined}
              data-last={index === columns.length - 1 ? "true" : undefined}
              // A column this row does not have (no status on "none known").
              data-off={field ? undefined : "true"}
              aria-label={field ? undefined : "not recorded"}
              onClick={onClick}
              onKeyDown={onKeyDown}
            >
              {field ? renderField(field, "cell") : null}
            </div>
          );
        })}
        {fields.filter((field) => field.under).map((field) => (
          <div key={field.key} className={styles.rxEditExtra} role="cell" style={{ gridColumn: `${under(field)} / span 2` }} onClick={onClick} onKeyDown={onKeyDown}>
            <span className={styles.rxEditLabel} aria-hidden="true">{field.label}</span>
            {renderField(field, "field")}
          </div>
        ))}
        <div className={`${styles.vEnd} ${styles.rxEditEnd}`} role="cell" onClick={onClick} onKeyDown={onKeyDown}>
          <div className={`${styles.vActions} ${styles.rxEditActions}`}>
            <Tooltip content={HINT_KEPT} disabled={!canSave}>{save}</Tooltip>
            <Button variant="link" theme="neutral" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
        <div className={`${styles.vBelow} ${styles.rxEditBelow}`} role="cell">
          {asWritten}
          {caution}
          {error}
          {changed ? null : <p className={styles.rxEditNote}>{HINT_IDLE}</p>}
          {voice}
        </div>
      </>
    );
  }

  return (
    <div className={styles.vBody} role={layout === "stack" ? undefined : "cell"}>
      <div className={styles.editForm} role="group" aria-label={`Correct ${finding.title}`} onClick={onClick} onKeyDown={onKeyDown}>
        <div className={styles.editGrid} data-narrow={narrow ? "true" : undefined}>
          {fields.map((field, index) => {
            const id = `${formId}-${field.key}`;
            // A text field's label is a real label: a click on it lands in
            // the field. A select is named by its own aria-label.
            const textual = field.kind === "text" || field.kind === "multiline";
            return (
              <div key={field.key} ref={index === 0 ? first : undefined} className={styles.editField} data-key={field.key}>
                {textual ? <label htmlFor={id}>{field.label}</label> : <span aria-hidden="true">{field.label}</span>}
                {renderField(field, "field", id)}
              </div>
            );
          })}
        </div>
        {asWritten}
        {caution}
        {error}
        {voice}
        <div className={styles.editActions}>
          {save}
          <Button variant="ghost" theme="neutral" size="sm" onClick={onCancel}>Cancel</Button>
          <span className={styles.editHint}>{changed ? HINT_KEPT : HINT_IDLE}</span>
        </div>
      </div>
    </div>
  );
}
