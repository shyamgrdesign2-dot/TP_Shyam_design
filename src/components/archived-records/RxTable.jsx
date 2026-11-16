import React, { useLayoutEffect, useRef, useState } from "react";
import { Trend, houseDate } from "./findingFormat";
import { RX_COLUMNS, rxRow } from "./rxFormat";
import styles from "./ArchivedRecords.module.scss";

/**
 * Clinical data as a table, the way the Rx pad lays the same things out:
 * one column per Rx pad field (RX_COLUMNS), one row per fact, every cell read
 * straight from the fact's Rx pad row (rxRow). What is on screen is what is
 * stored and what "Copy JSON" copies.
 *
 * Three layouts, chosen from the room the section really has (it changes when
 * the source page is hidden), never from the window:
 *   wide    one line: cells, then the row's actions
 *   tight   cells take the full width, the actions sit beneath them
 *   stack   too narrow for columns: the row is written as a sentence instead
 */

// Narrow columns hold short, closed values and keep a fixed width (even
// pixels). Wide columns (names, notes) share what is left.
const NARROW = { status: 84, duration: 68, dosage: 64, frequency: 72, when: 76, value: 88, units: 68, refRange: 96, date: 68 };
const NARROW_VITAL = 48;
const GAP = 8;
const CHECK = 28; // the checkbox column and the gap after it
const ACTIONS = 184; // Verify with its longest label, Edit, Remove
const NAME_MIN = { tight: 104, wide: 168 }; // the least a wide column may get
const FORM_MIN = 520; // below this the edit form goes two fields a line

export const columnsOf = (domain) => RX_COLUMNS[domain] || RX_COLUMNS.RPT;
const narrow = (column) => NARROW[column.key] || NARROW_VITAL;
// How the wide columns split the room: a name gets a little more than its
// notes, and a note's details get much more than its short heading.
const share = (domain, index) => (domain === "RPT" ? (index === 0 ? 1 : 2.4) : index === 0 ? 1.25 : 1);

export const columnTemplate = (domain) =>
  columnsOf(domain)
    .map((column, index) => (column.wide ? `minmax(0, ${share(domain, index)}fr)` : `${narrow(column)}px`))
    .join(" ");

// The room the cells need so that no wide column drops under `least`.
function roomFor(domain, least) {
  const columns = columnsOf(domain);
  const shares = columns.map((column, index) => (column.wide ? share(domain, index) : 0));
  const total = shares.reduce((sum, value) => sum + value, 0);
  const smallest = Math.min(...shares.filter(Boolean));
  const fixed = columns.reduce((sum, column) => sum + (column.wide ? 0 : narrow(column)), 0);
  return fixed + (total ? (least / smallest) * total : 0) + GAP * (columns.length - 1);
}

export function tableLayout(domain, width) {
  // Not measured yet (the section is closed): assume the usual pane.
  if (!width) return "tight";
  const room = width - CHECK;
  if (room >= roomFor(domain, NAME_MIN.wide) + GAP + ACTIONS) return "wide";
  return room >= roomFor(domain, NAME_MIN.tight) ? "tight" : "stack";
}

// Watches the element the rows sit in. State changes only when the layout
// does, so dragging a pane edge does not redraw every row on every pixel.
export function useTableLayout(domain) {
  const ref = useRef(null);
  const [fit, setFit] = useState({ layout: "tight", narrow: false });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => {
      const width = node.clientWidth;
      const next = { layout: tableLayout(domain, width), narrow: Boolean(width) && width < FORM_MIN };
      setFit((prev) => (prev.layout === next.layout && prev.narrow === next.narrow ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [domain]);
  return [ref, fit];
}

// One header row per group. The first and last headers name the checkbox
// and the actions for a screen reader; they show nothing.
export function RxHead({ domain, layout }) {
  return (
    <div role="rowgroup">
      <div className={styles.tHead} role="row" data-layout={layout}>
        <span role="columnheader"><span className={styles.srOnly}>Select</span></span>
        {columnsOf(domain).map((column) => (
          <span key={column.key} role="columnheader">{column.label}</span>
        ))}
        {layout === "wide" ? <span role="columnheader"><span className={styles.srOnly}>Review</span></span> : null}
      </div>
    </div>
  );
}

const ARROW_FLAG = { up: "H", down: "L" };
const AMBER_STATUS = ["Suspected", "Ruled Out"];

function cellText(finding, row, column, index) {
  const value = row[column.key] == null ? "" : String(row[column.key]).trim();
  if (column.key === "date") return houseDate(value);
  // Something recorded as "none" is written with the word in front, so the
  // name alone can never be read as the thing being present.
  if (index === 0 && row.enable === "N") return finding.label || `No ${value}`;
  return value;
}

// The cells of one row. `marks` (warning, tick, [n]) trail the name. A cell
// with nothing on the page stays empty: no dash, no "nil".
export function RxCells({ finding, marks }) {
  const columns = columnsOf(finding.domain);
  const { row } = rxRow(finding);
  const marksAt = Math.max(0, columns.findIndex((column) => column.wide));
  const flag = finding.domain === "LAB" ? ARROW_FLAG[row.arrowDirection] : undefined;
  // A heading with no details beside it takes the whole line.
  const alone = columns.length === 2 && !cellText(finding, row, columns[1], 1);

  return columns.map((column, index) => {
    if (alone && index === 1) return null;
    const value = cellText(finding, row, column, index);
    const tail = index === marksAt ? marks : null;
    if (!value && !tail) return <span key={column.key} className={styles.tCell} role="cell" aria-label="not recorded" />;
    return (
      <span
        key={column.key}
        className={styles.tCell}
        role="cell"
        data-key={column.key}
        data-span={alone ? "all" : undefined}
        data-abnormal={flag && column.key === "units" ? flag : undefined}
        data-tone={column.key === "status" && AMBER_STATUS.includes(value) ? "warning" : undefined}
      >
        {column.key === "value" && finding.domain === "LAB" ? (
          <span className={styles.rowValue} data-abnormal={flag}>
            {value}
            <Trend flag={flag} />
          </span>
        ) : (
          value
        )}
        {tail}
      </span>
    );
  });
}
