import React from "react";
import { Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { ArrowDown, ArrowLeft2, ArrowRight2, ArrowUp, DocumentText, Edit2, TickCircle, Warning2 } from "iconsax-reactjs";
import ARCHIVED_RECORDS_MOCK from "./mock/archivedRecordsMock";
import { archivedRecordsStore, citeNumberForPage, citesOf, documentForPage } from "./archivedRecordsStore";
import { DX_TITLES, dxTitle, isDiagnosis } from "./diagnosisTypes";
import { HISTORY_TITLES, historyNeedsDate, historyTitle, isHistory } from "./medicalHistory";
import { PROC_TITLES, isProcedure, procGroupOf } from "./procedureTypes";
import { rxQuals, rxRow } from "./rxFormat";
import { scrollWithin } from "./scrollWithin";
import styles from "./ArchivedRecords.module.scss";

/**
 * How one fact is written, everywhere in Case File: the Rx pad panel, the
 * structured record, clinical data and documents all draw rows from here, so
 * a medicine or a lab value reads the same wherever the doctor meets it.
 *
 * Reading hierarchy (darkest to lightest):
 *   value      the clinical fact itself        dark, semibold
 *   key        the name that introduces it     mid grey, medium, ends in a colon
 *   secondary  dates, units, qualifiers, ref   light grey, regular, in brackets
 *   dividers   between sibling facts           hairline, lightest grey
 * Colour is spent only on abnormal values and warnings.
 */

export const FLAG_NOTE = {
  suspected: "Written as suspected, not confirmed",
  conflict: "Another page in the file says something different",
  lowConfidence: "Handwriting was hard to read",
  conflictingValue: "The file has two different values for this",
  partlyRead: "Only part of this line could be read",
  ambiguous: "Written in a way that can be read two ways",
};

export const FLAG_LABEL = {
  suspected: "Suspected",
  conflict: "Conflict in file",
  lowConfidence: "Hard to read",
  conflictingValue: "Two values in file",
  partlyRead: "Partly readable",
  ambiguous: "Reads two ways",
};

// House date style, as on the Past Visits cards: 27 Feb'26, 04 Mar'26.
export const houseDate = (label = "") => label.replace(/^(\d) /, "0$1 ").replace(/ 20(\d\d)$/, "'$1");

/* -------------------------------------------------------------- citations */

// With no label a citation is a bracketed document number, [2]. The tooltip
// names the document and page; a click opens that exact spot.
export function CiteChip({ page, rid, label, quick = false }) {
  const bundle = ARCHIVED_RECORDS_MOCK;
  const doc = documentForPage(bundle, page);
  const number = citeNumberForPage(bundle, page);
  return (
    <Tooltip content={doc ? `${doc.title}, page ${page}` : `Page ${page}`}>
      <button
        type="button"
        className={styles.cite}
        data-kind={label ? "named" : "number"}
        aria-label={`Open source: ${doc ? doc.title : "page"}, page ${page}`}
        onClick={(event) => {
          event.stopPropagation();
          archivedRecordsStore.openSource(page, rid, { quick });
        }}
      >
        {label ? (
          <>
            <DocumentText size={12} aria-hidden="true" />
            {label}
          </>
        ) : (
          `[${number}]`
        )}
      </button>
    </Tooltip>
  );
}

// Every place one or more findings can be checked, one number per document.
// A row shows ONE citation: the page a reader would open first. Any others are
// behind a small "+2", so a screen of facts is not a screen of blue numbers.
// A summary pointer, which draws on several facts, may show two.
// `more={false}` drops the "+N" as well: used by the summary, whose every
// fact is listed with its own source in the details below.
export function Cites({ findings, quick = false, max = 1, more = true }) {
  const bundle = ARCHIVED_RECORDS_MOCK;
  const [open, setOpen] = React.useState(false);
  const seen = new Set();
  const list = [].concat(findings).filter(Boolean).flatMap((finding) => citesOf(bundle, finding)).filter((cite) => {
    const number = citeNumberForPage(bundle, cite.page);
    if (seen.has(number)) return false;
    seen.add(number);
    return true;
  });
  if (!list.length) return null;
  const shown = open ? list : list.slice(0, max);
  const rest = list.length - shown.length;
  return (
    <span className={styles.cites}>
      {shown.map((cite) => <CiteChip key={`${cite.page}-${cite.rid}`} page={cite.page} rid={cite.rid} quick={quick} />)}
      {rest > 0 && more ? (
        <button
          type="button"
          className={styles.citeMore}
          aria-label={`Show ${rest} more ${rest === 1 ? "source" : "sources"}`}
          title={`${rest} more ${rest === 1 ? "source" : "sources"}`}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          +{rest}
        </button>
      ) : null}
    </span>
  );
}

// Spans of time in the short form used across the product: 2 weeks is 2w,
// 2 years 2y, 5 days 5d, 3 months 3mo. Only a number followed by the unit is
// touched ("60-year-old" and dates are left alone). The stored data keeps the
// words as written; this is display only.
const SPANS = [[/\b(\d+(?:\.\d+)?)\s*(?:Day\(s\)|days?)(?![\w(])/gi, "$1d"], [/\b(\d+(?:\.\d+)?)\s*(?:Week\(s\)|weeks?|wks?)(?![\w(])/gi, "$1w"], [/\b(\d+(?:\.\d+)?)\s*(?:Month\(s\)|months?)(?![\w(])/gi, "$1mo"], [/\b(\d+(?:\.\d+)?)\s*(?:Year\(s\)|years?|yrs?)(?![\w(-])/gi, "$1y"]];
export const shortSpan = (text) => (typeof text === "string" ? SPANS.reduce((out, [from, to]) => out.replace(from, to), text) : text);

// A summary line. **double stars** mark the key words; [[label|page|rid]]
// is a reference to a page, such as an admission number, and opens that page.
const REF = /\[\[([^|\]]+)\|([^|\]]*)\|([^\]]*)\]\]/g;

// A reference written as [[label|@MED|]] points at a section of the details
// below the summary; this scrolls that section into view, where it is.
function jumpToSection(event, code) {
  let box = event.currentTarget.parentElement;
  while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
  const target = box?.querySelector(`[data-section="${code}"]`);
  if (target) scrollWithin(box, target, { offset: 64, smooth: true });
}

export function RichLine({ text: raw, quick = false }) {
  const text = shortSpan(raw);
  const parts = [];
  let last = 0;
  let key = 0;
  const words = (chunk) =>
    chunk.split("**").forEach((part, index) => {
      if (part) parts.push(index % 2 ? <strong key={key++}>{part}</strong> : <React.Fragment key={key++}>{part}</React.Fragment>);
    });
  text.replace(REF, (match, label, page, rid, at) => {
    words(text.slice(last, at));
    parts.push(
      page ? (
        // A span, not a button: a long phrase must wrap like the words around
        // it, which a button cannot do. It still takes focus and both keys.
        <span
          key={key++}
          role="button"
          tabIndex={0}
          className={styles.refLink}
          title={page.startsWith("@") ? "Show this section below" : `Open page ${page}`}
          onClick={(event) => {
            event.stopPropagation();
            if (page.startsWith("@")) jumpToSection(event, page.slice(1));
            else archivedRecordsStore.openSource(Number(page), rid || null, { quick });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
        >
          {label}
        </span>
      ) : (
        <React.Fragment key={key++}>{label}</React.Fragment>
      ),
    );
    last = at + match.length;
    return match;
  });
  words(text.slice(last));
  return parts;
}

/* ------------------------------------------------------------ small parts */

// High / low as an arrow. The word stays for screen readers.
export function Trend({ flag }) {
  if (!flag) return null;
  const high = flag === "H";
  const Icon = high ? ArrowUp : ArrowDown;
  return (
    <span className={styles.arrow} role="img" aria-label={high ? "High" : "Low"}>
      <Icon size={12} variant="Linear" aria-hidden="true" />
    </span>
  );
}

// One bracket of short qualifiers after a name: (1x1, PO, Qty 7)
export function Quals({ quals }) {
  if (!quals?.length) return null;
  return (
    <span className={styles.quals}>
      {" ("}
      {quals.map((item, index) => (
        <React.Fragment key={index}>
          {index ? ", " : null}
          {item.tip ? (
            // A longer note kept off the line: the word opens it.
            <Tooltip content={item.tip}>
              <span data-more="true" tabIndex={0} aria-label={`Note: ${item.tip}`}>{item.v}</span>
            </Tooltip>
          ) : item.tone === "warning" ? (
            <Tooltip content={FLAG_NOTE.suspected}>
              <span data-tone="warning" tabIndex={0}>{shortSpan(item.v || item)}</span>
            </Tooltip>
          ) : (
            <span data-tone={item.tone || undefined}>{shortSpan(item.v || item)}</span>
          )}
        </React.Fragment>
      ))}
      {")"}
    </span>
  );
}

// A repeated test's dated values on one line, for the hover on a result.
const seriesLine = (series) => series.map((point) => `${point.v}${point.f === "H" ? " \u2191" : point.f === "L" ? " \u2193" : ""} (${point.d})`).join("  \u2192  ");

// The light bracket after a lab's latest value: when it was taken and, for a
// test that was repeated, where it started and how many readings there are.
//   (12 Mar'26)                          one reading
//   (12 Mar'26, from 12.1, 3 readings)   repeated, and it moved
//   (12 Mar'26, from 460 ↑, 3 readings)  back in range now; it started high
function LabBracket({ finding }) {
  const series = finding.series || [];
  const first = series[0];
  const moved = first && String(first.v) !== String(finding.value);
  const parts = [
    finding.dateLabel ? houseDate(finding.dateLabel) : null,
    moved ? `from ${first.v}${first.f === "H" ? " \u2191" : first.f === "L" ? " \u2193" : ""}` : null,
    series.length > 1 ? `${series.length} readings` : null,
  ].filter(Boolean);
  return parts.length ? <span className={styles.rowSecondary}> ({parts.join(", ")})</span> : null;
}

// What sits behind a lab result when only the latest value is shown: the
// reference range and, if the test was repeated, the earlier readings.
const labInfo = (finding) =>
  [finding.range ? `Ref: ${finding.range}` : null, finding.series?.length > 1 ? `Readings: ${seriesLine(finding.series)}` : null].filter(Boolean).join("   ·   ");

// Label and value pairs on a line, separated by hairlines: BP: 102/74 | Pulse: 72
export function Facts({ facts }) {
  if (!facts?.length) return null;
  return (
    <div className={styles.factsClip}>
      <dl className={styles.facts}>
        {facts.map((fact, index) => (
          <div key={index}>
            {fact.k ? <dt>{fact.k}:</dt> : null}
            <dd>{fact.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// A repeated lab over time, oldest to newest: 12.5 (25 Feb) → 11.1 ↓ (28 Feb).
export function TrendStrip({ finding }) {
  if (!finding.series) return null;
  return (
    <ol className={styles.trend} aria-label={`${finding.title} over time`}>
      {finding.series.map((point, index) => (
        <li key={point.d} data-flag={point.f || undefined} data-latest={index === finding.series.length - 1 ? "true" : undefined}>
          <span>{point.v}<Trend flag={point.f} /></span>
          <small>({point.d})</small>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------ one finding */

// One layout per kind of fact:
//   Lab      Haemoglobin: 10.6 g/dL ↓        then the dated trend, then (Ref ...)
//   Vitals   At discharge (04 Mar'26)        then BP: 102/74 | Pulse: 72 | ...
//   Report   Chest X-ray: finding text (25 Feb'26)
//   Medicine Nexium 40 mg (1 per dose, OD, PO, Qty 7)   Rx pad order: unit per
//            dose, frequency, when, duration, notes (see rxFormat.js)
//   Others   Rheumatoid arthritis (Secondary, Past history)
// `marks` is whatever the caller wants at the end of the first line (flag,
// tick, citations). `dated` is false when the group heading carries the date.
// `compact` keeps a lab on one line by putting the reference range beside it.
// `latestOnly` shows a lab as its latest value alone: no trend, no range on
// the line. Both are on the value's hover, and in full under Clinical data.
// `tagged` drops a vitals row's own title because a tag above already says it.
// A medicine or an allergy says when it was written, unless the tag above the
// row already does. The date goes last in the bracket; it is not repeated
// when the row's own words already carry it ("given 9 Jul 2026 at 4 pm").
const NEEDS_DATE = ["MED", "ALG"];
function withDate(finding, quals = [], dated, dateInTag) {
  if (!dated || dateInTag || !finding.dateLabel || !(NEEDS_DATE.includes(finding.domain) || historyNeedsDate(finding) || isDiagnosis(finding) || finding.sym)) return quals;
  // Only a real date is added ("9 Jul 2026", "Jan 2026"). A bare year on a
  // past operation is already its bracket, and "Past history" is not a date.
  if (!/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(finding.dateLabel)) return quals;
  // A row that still carries its date among its own words is left alone.
  if (quals.some((item) => typeof item === "string" && item === houseDate(finding.dateLabel))) return quals;
  // Only what is on the line counts: a date inside a hidden note does not show.
  const day = finding.dateLabel.replace(/ \d{4}$/, "").toLowerCase();
  const said = quals.some((item) => String(typeof item === "string" ? item : item?.tip ? "" : item?.v || "").toLowerCase().includes(day));
  if (said) return quals;
  // The date sits before a trailing "note", so the bracket ends on the hover word.
  const at = quals.length && quals[quals.length - 1]?.tip ? quals.length - 1 : quals.length;
  return [...quals.slice(0, at), houseDate(finding.dateLabel), ...quals.slice(at)];
}

// What a medicine is, after its brand name: the generic in mid grey. Hover or
// focus shows the full composition as printed, when the page gives one.
function Generic({ finding }) {
  const { name = "", generic } = rxRow(finding).row;
  // "Tramadol 50 mg" needs no "Tramadol" after it.
  if (!generic || name.toLowerCase().includes(generic.toLowerCase())) return null;
  const full = finding.med?.composition;
  return full ? (
    <Tooltip content={full}>
      <span className={styles.rowGeneric} data-info="true" tabIndex={0}> {generic}</span>
    </Tooltip>
  ) : (
    <span className={styles.rowGeneric}> {generic}</span>
  );
}

// `dateInTag`: the group tag above this row already carries the row's date.
export function FindingBody({ finding, marks = null, dated = true, compact = false, latestOnly = false, tagged = false, dateInTag = false }) {
  if (finding.domain === "LAB") {
    return (
      <>
        <p className={styles.rowLine}>
          <span className={styles.rowKey}>{finding.title}:</span>{" "}
          {latestOnly && labInfo(finding) ? (
            <Tooltip content={labInfo(finding)}>
              <span className={styles.rowValue} data-abnormal={finding.abnormal || undefined} data-info="true" tabIndex={0}>
                {finding.value}
                {finding.unit ? <small> {finding.unit}</small> : null}
                <Trend flag={finding.abnormal} />
              </span>
            </Tooltip>
          ) : (
            <span className={styles.rowValue} data-abnormal={finding.abnormal || undefined}>
              {finding.value}
              {finding.unit ? <small> {finding.unit}</small> : null}
              <Trend flag={finding.abnormal} />
            </span>
          )}
          {latestOnly ? <LabBracket finding={finding} /> : null}
          {dated && !latestOnly && !finding.series && finding.dateLabel ? <span className={styles.rowSecondary}> ({houseDate(finding.dateLabel)})</span> : null}
          {compact && !latestOnly && finding.range ? <span className={styles.rowSecondary}> (Ref: {finding.range})</span> : null}
          {marks}
        </p>
        {latestOnly ? null : <TrendStrip finding={finding} />}
        {finding.range && !compact && !latestOnly ? <p className={styles.rowSecondary}>(Ref: {finding.range})</p> : null}
      </>
    );
  }

  if (finding.domain === "VIT" && tagged) {
    return (
      <div className={styles.vitalLine}>
        <Facts facts={finding.facts} />
        <span>{marks}</span>
      </div>
    );
  }

  if (finding.domain === "VIT") {
    return (
      <>
        <p className={styles.rowLine}>
          <span className={styles.rowLabel}>{finding.title}</span>
          {finding.dateLabel ? <span className={styles.rowSecondary}> ({houseDate(finding.dateLabel)})</span> : null}
          {marks}
        </p>
        <Facts facts={finding.facts} />
      </>
    );
  }

  // A symptom reads as a short fact (name, then its bracket), not as a note.
  if (finding.domain === "RPT" && !finding.sym) {
    return (
      <p className={styles.rowLine}>
        <span className={styles.rowLabel}>{finding.title}:</span>{" "}
        <span className={styles.rowText}>{finding.detail}</span>
        {dated && finding.dateLabel ? <span className={styles.rowSecondary}> ({houseDate(finding.dateLabel)})</span> : null}
        {marks}
      </p>
    );
  }

  return (
    <p className={styles.rowLine}>
      <span className={styles.rowLabel}>{finding.label || finding.title}</span>
      {finding.domain === "MED" ? <Generic finding={finding} /> : null}
      <Quals quals={withDate(finding, rxQuals(finding) || [], dated, dateInTag)} />
      {marks}
    </p>
  );
}

/* --------------------------------------------------------------- grouping */

// Reports and notes read in this order: what to keep in mind, then results,
// then the operation, then the stay.
// (the order a discharge summary tells it in: what to watch, why the patient
// came, what was found, what the specialists said, the operation, the stay,
// what was advised, then the rest)
export const REPORT_GROUPS = ["Keep in mind", "Symptoms", "Examination", "Investigations", "Opinions", "Operation notes", "Course", "Advice and follow-up", "Other notes"];
// Inside a group a note is placed by the part it plays (its role), so the
// order holds for any file: what to watch, results, the operation, then the
// stay from complaint to follow-up. Notes with the same role keep the order
// the file gave them. A group or role this list does not know goes last.
const REPORT_ROLES = ["alert", "symptom", "investigation", "anaesthesia", "complaint", "course", "hospitalMeds", "dischargeDate", "conditionAtDischarge", "detail", "followUp", "advice"];
// Under Examination the doctor's own examination comes before nursing notes.
const doctorFirst = (item) => (item.group === "Examination" && !/examination/i.test(item.title) ? 1 : 0);
const placeIn = (list, value) => (list.indexOf(value) < 0 ? list.length : list.indexOf(value));
export const inReadingOrder = (items) =>
  items[0]?.domain === "RPT"
    ? [...items].sort((a, b) => placeIn(REPORT_GROUPS, a.group) - placeIn(REPORT_GROUPS, b.group) || placeIn(REPORT_ROLES, a.role) - placeIn(REPORT_ROLES, b.role) || doctorFirst(a) - doctorFirst(b))
    : items;

// Labs are grouped so a date is written once per group, not on every row:
// tests repeated during the stay first (they carry their own dated trend),
// then one group per sample date, newest first.
// Labs are grouped by what the latest value says, not by date (the date is in
// each row's bracket): out of range now, back in range after being out, or
// in range throughout.
const LAB_GROUPS = ["Out of range", "Back in range", "In range"];
export const labGroup = (finding) => (finding.abnormal ? LAB_GROUPS[0] : finding.series?.some((point) => point.f) ? LAB_GROUPS[1] : LAB_GROUPS[2]);

// [[groupTitle, items], ...] in reading order. An empty title means no heading.
export function groupFindings(items) {
  const groups = new Map();
  const procTag = procGroupOf(items.filter(isProcedure));
  inReadingOrder(items).forEach((item) => {
    // A vitals set is named by its tag: "At discharge (12 Mar'26)".
    const key =
      isHistory(item) ? historyTitle(item)
      : item.domain === "DX" ? dxTitle(item)
      : isProcedure(item) ? procTag(item)
      : item.domain === "LAB" ? labGroup(item)
      : item.domain === "VIT" ? `${item.title}${item.dateLabel ? ` (${houseDate(item.dateLabel)})` : ""}`
      : item.group || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const entries = [...groups.entries()];
  // Medical History reads in its own section order.
  if (items.length && items.every(isHistory)) return entries.sort((a, b) => HISTORY_TITLES.indexOf(a[0]) - HISTORY_TITLES.indexOf(b[0]));
  // Diagnoses: the conclusion, what else was found, what was considered.
  if (items.length && items.every(isProcedure)) return entries.sort((a, b) => PROC_TITLES.indexOf(a[0]) - PROC_TITLES.indexOf(b[0]));
  if (items.length && items.every(isDiagnosis)) return entries.sort((a, b) => DX_TITLES.indexOf(a[0]) - DX_TITLES.indexOf(b[0]));
  // Lab groups always read worst first.
  return items[0]?.domain === "LAB" ? entries.sort((a, b) => LAB_GROUPS.indexOf(a[0]) - LAB_GROUPS.indexOf(b[0])) : entries;
}

/* ------------------------------------------------------------------ marks */

// What trails a row in the review workspace: a warning if the reading is in
// doubt, a tick once verified, a pencil if a reviewer corrected it, then [n].
export function RowMarks({ finding, status = "draft", quick = false }) {
  const flag = finding.flags?.[0] || (finding.confidence < 0.7 ? "lowConfidence" : null);
  // "Suspected" is said on the row itself, in amber, with its own hover; it
  // needs no second mark at the end of the line.
  const said = flag === "suspected" && finding.quals?.some((item) => item?.tone === "warning");
  const verified = status === "verified";
  return (
    <>
      {flag && !verified && !said ? (
        <Tooltip content={FLAG_NOTE[flag]}>
          <span className={styles.rowFlag} role="img" aria-label={FLAG_NOTE[flag]}><Warning2 size={12} variant="Bold" /></span>
        </Tooltip>
      ) : null}
      {verified ? (
        <Tooltip content={finding.edited ? "Corrected by a reviewer and saved" : "Verified and saved"}>
          <span className={styles.rowTick} role="img" aria-label={finding.edited ? "Corrected and verified" : "Verified"}>
            {finding.edited ? <Edit2 size={12} variant="Bold" /> : <TickCircle size={12} variant="Bold" />}
          </span>
        </Tooltip>
      ) : null}
      <Cites findings={finding} quick={quick} />
    </>
  );
}

// A scrolling strip of chips with arrows that appear only when there is more
// to see on that side. The arrows are a pointer shortcut: keyboard users tab
// through the chips themselves, which scroll into view as they take focus.
const smoothScroll = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
// Room kept clear at an edge for the arrow and the fade under it.
const CAROUSEL_EDGE = 40;

export function Carousel({ label, children }) {
  const ref = React.useRef(null);
  const lastChosen = React.useRef(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });
  const measure = React.useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const left = node.scrollLeft > 2;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 2;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);
  // Labels carry counts, so the strip can change width on any render.
  React.useEffect(measure);
  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);
  // A chip chosen from elsewhere (a link in the record, a search result) may
  // sit off screen: bring it into view, sideways only.
  React.useEffect(() => {
    const node = ref.current;
    const chosen = node ? node.querySelector('[data-selected], [aria-checked="true"]') : null;
    if (chosen === lastChosen.current) return;
    lastChosen.current = chosen;
    if (!chosen) return;
    const box = node.getBoundingClientRect();
    const item = chosen.getBoundingClientRect();
    if (item.left < box.left + CAROUSEL_EDGE) node.scrollBy({ left: item.left - box.left - CAROUSEL_EDGE, behavior: smoothScroll() });
    else if (item.right > box.right - CAROUSEL_EDGE) node.scrollBy({ left: item.right - box.right + CAROUSEL_EDGE, behavior: smoothScroll() });
  });
  const nudge = (direction) => ref.current?.scrollBy({ left: direction * Math.max(160, ref.current.clientWidth * 0.6), behavior: smoothScroll() });
  // Tesseract chips are spans with role="button": focusable, but Enter and
  // Space do nothing on them unless a key handler presses them.
  const onKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (target.tagName === "SPAN" && target.getAttribute("role") === "button") {
      event.preventDefault();
      target.click();
    }
  };
  // preventDefault on mouse down keeps focus where it was, so it is not lost
  // when an arrow disappears at the end of the strip.
  const arrow = (side, direction, Icon) => (
    <button
      type="button"
      className={styles.carouselArrow}
      data-side={side}
      tabIndex={-1}
      aria-hidden="true"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => nudge(direction)}
    >
      <Icon size={14} />
    </button>
  );
  return (
    <div className={styles.carousel} data-left={edges.left || undefined} data-right={edges.right || undefined}>
      {edges.left ? arrow("left", -1, ArrowLeft2) : null}
      <div className={styles.carouselTrack} ref={ref} onScroll={measure} onKeyDown={onKeyDown} role="group" aria-label={label}>
        {children}
      </div>
      {edges.right ? arrow("right", 1, ArrowRight2) : null}
    </div>
  );
}
