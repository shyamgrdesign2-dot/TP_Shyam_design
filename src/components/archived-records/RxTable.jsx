import React, { useLayoutEffect, useRef, useState } from "react";
import { HISTORY_COLUMNS, RX_COLUMNS, RX_EXTRA_FIELDS } from "./rxFormat";
// The Rx pad's table skin, as its section boxes load it.
import "../tesseractRxPad.scss";
import styles from "./clinicalData.module.scss";

/**
 * The Rx pad's table, for the one row a reviewer is correcting.
 *
 * The Rx pad's section tables (DiagnosisBox, MedicationsBox, SurgicalBox ...)
 * are rows of cells under the product's `.tesseract-ct` skin, inside a
 * Tesseract RxPadSection carrying `tesseract-rxpad`. Those boxes cannot be
 * mounted here (they read and save through the product's stores), so this is
 * the same skin through the same class names: `tesseract-ct`,
 * `tesseract-ct-head`, `tesseract-ct-th`, `symptoms-table-row`,
 * `symptoms-table-cell`. The header row, the cell lines, the row height and
 * the inputs' focus ring all come from that stylesheet.
 *
 * What differs is only how wide a column is. The Rx pad divides a row in 24
 * parts and scrolls sideways when the pane is short of room; here every kind
 * has its own columns (rxFormat.js), narrow ones fixed and wide ones sharing
 * what is left, and where they do not fit the row is corrected in a labelled
 * form instead (RxEditForm.jsx).
 */

// Fixed columns hold short, closed values. Widths are in px and include the
// cell's 12px padding on each side; each is wide enough for its header in
// capitals and for the Rx pad's placeholder.
const FIXED = {
  status: 120, duration: 104, dosage: 132, frequency: 104, when: 120,
  value: 96, arrowDirection: 104, units: 84, refRange: 108, date: 112,
  temperature: 124, pulse: 92, respiratory_rate: 108, blood_pressure: 124, spo2: 76, height: 88, weight: 88,
};
const FIXED_OTHER = 96;
const WIDE_MIN = 120; // the least a wide column may get
const FORM_MIN = 520; // below this the labelled form puts a label above its field
const ACTIONS_MIN = 480; // below this a row's actions go under its text

const fixed = (column) => column.width || FIXED[column.key] || FIXED_OTHER;
// How the wide columns split the room: a name gets a little more than its
// notes, and a note's details get much more than its short heading.
const share = (columns, index) => {
  const notes = columns.length === 2 && columns.every((column) => column.wide);
  return notes ? (index === 0 ? 1 : 2.4) : index === 0 ? 1.25 : 1;
};

export const columnTemplate = (columns) =>
  columns.map((column, index) => (column.wide ? `minmax(0, ${share(columns, index)}fr)` : `${fixed(column)}px`)).join(" ");

// The room a row needs so that no wide column drops under WIDE_MIN.
export function tableRoom(columns) {
  const shares = columns.map((column, index) => (column.wide ? share(columns, index) : 0));
  const total = shares.reduce((sum, value) => sum + value, 0);
  const smallest = Math.min(...shares.filter(Boolean));
  const taken = columns.reduce((sum, column) => sum + (column.wide ? 0 : fixed(column)), 0);
  return taken + (total ? (WIDE_MIN / smallest) * total : 0);
}

// Every list of columns a kind of fact may be corrected in.
function columnSets(domain) {
  // Medical History has a list of columns for each of its sections.
  if (domain === "HX") return Object.values(HISTORY_COLUMNS);
  const extras = RX_EXTRA_FIELDS[domain] || [];
  const own = [...(RX_COLUMNS[domain] || RX_COLUMNS.RPT), ...extras];
  // Reports and notes also hold symptoms, which have a table of their own.
  return domain === "RPT" ? [own, RX_COLUMNS.SYM] : [own];
}

export function rowFit(domain, width) {
  // Not measured yet (the section is closed): assume the usual pane.
  if (!width) return { table: true, narrow: false, compact: false };
  return {
    table: width >= Math.max(...columnSets(domain).map(tableRoom)),
    narrow: width < FORM_MIN,
    compact: width < ACTIONS_MIN,
  };
}

// Watches the element the rows sit in, so the layout follows the room the
// section really has (it changes when the source page is hidden), never the
// window. State changes only when the fit does, so dragging a pane edge does
// not redraw every row on every pixel.
//   table    a row is corrected in the Rx pad table; otherwise in a form
//   narrow   that form puts each label above its field
//   compact  a row's actions sit under its text
export function useRowFit(domain) {
  const ref = useRef(null);
  const [fit, setFit] = useState(() => rowFit(domain, 0));
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => {
      const next = rowFit(domain, node.clientWidth);
      setFit((prev) => (prev.table === next.table && prev.narrow === next.narrow && prev.compact === next.compact ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [domain]);
  return [ref, fit];
}

/**
 * The table: the Rx pad's header row over one row of cells, with room under
 * the row (still inside the table's border) for what belongs to it.
 *
 *   label     the table's name for a screen reader
 *   columns   column definitions, in order
 *   children  the row's cells, one per column (RxCell)
 *   footer    what sits under the row
 */
export function RxTable({ label, columns, children, footer }) {
  return (
    <div className={`tesseract-rxpad ${styles.pad}`}>
      <div className={`tesseract-ct ${styles.table}`} style={{ "--rx-cols": columnTemplate(columns) }}>
        <div role="table" aria-label={label}>
          <div role="rowgroup">
            <div className={`tesseract-ct-head ${styles.head}`} role="row">
              {columns.map((column) => (
                <span key={column.key} className={`tesseract-ct-th ${styles.th}`} role="columnheader">{column.label}</span>
              ))}
            </div>
          </div>
          <div role="rowgroup">
            <div className={`symptoms-table-row ${styles.row}`} role="row">{children}</div>
          </div>
        </div>
        {footer}
      </div>
    </div>
  );
}

// One cell. `off` is a column this row does not have (no status on something
// recorded as "none"): it is shown, greyed, and cannot be typed in.
export const RxCell = React.forwardRef(function RxCell({ last = false, off = false, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={`symptoms-table-cell ${last ? "" : "border-end "}${styles.cell}`}
      role="cell"
      data-last={last ? "true" : undefined}
      data-off={off ? "true" : undefined}
      aria-label={off ? "not recorded" : undefined}
      {...rest}
    >
      {children}
    </div>
  );
});
