import React, { useState } from "react";
import { Button, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { ASSETS } from "../../assets";
import { archivedRecordsStore, isNotableLab, isShownToDoctor, statusOf } from "./archivedRecordsStore";
import { courseKind, courseLine, hospitalCourse } from "./hospitalCourse";
import { COURSE_GROUP, isCourseSummary } from "./noteGroups";
import { CiteChip, FindingBody, RowMarks, groupFindings, houseDate } from "./findingFormat";
import { DX_TITLES, dxTitle, isDiagnosis } from "./diagnosisTypes";
import { HISTORY_TITLES, historyTitle, historyType, isHistory } from "./medicalHistory";
import { isProcedure } from "./procedureTypes";
import { rxQuals } from "./rxFormat";
import { ImageTileArt } from "./SourcePageViewer";
import styles from "./ArchivedRecords.module.scss";

/**
 * The detailed sections of a Case File: Medical History, Diagnosis,
 * Procedures, Med (Rx), Lab Results, Vitals, Clinical Notes, Hospital Course.
 *
 * One component draws them everywhere (the Rx pad panel, the Structured
 * record tab on the patient page and in the review drawer), so the structure,
 * the order and the wording are the same wherever the doctor meets them. The
 * caller only chooses the frame a section sits in (`RxSection`).
 */

// What stays true about the patient beyond one visit goes first, under one
// heading, the way the product's own Medical History is organised. Then what
// this file is about: diagnosis, procedures, medicines, results.
// Medical History is the Rx pad's own: the same six sections, with the same
// names, in medicalHistory.js. Within a section what the patient has comes
// first, then what the page says they do not have ("No ...").
const inHistory = isHistory;
const HISTORY_GROUPS = HISTORY_TITLES;
const historyGroup = historyTitle;
// Sections that read as a dotted list in a narrow column.
const DOTTED = ["HX", "DX", "PROC", "MED"];
const presentFirst = (list) => [...list.filter((item) => !item.negative), ...list.filter((item) => item.negative)];

// A diagnosis says what kind it is with a tag above it, not with words in
// its bracket: final, secondary, provisional (diagnosisTypes.js).
const DX_GROUPS = DX_TITLES;
const dxGroup = dxTitle;

const SECTIONS = [
  { code: "HX", title: "Medical History", icon: ASSETS.images.medicalHistory, pick: inHistory, groupOf: historyGroup, groups: HISTORY_GROUPS },
  { code: "DX", title: "Diagnosis", icon: ASSETS.images.diagnosis, pick: isDiagnosis, groupOf: dxGroup, groups: DX_GROUPS },
  // Procedures are tagged Surgery / Other procedures by groupFindings, and only when a file has both.
  { code: "PROC", title: "Procedures", icon: ASSETS.images.surgery, pick: isProcedure },
  { code: "MED", title: "Med (Rx)", icon: ASSETS.images.medication, pick: (item) => item.domain === "MED" },
  { code: "LAB", title: "Lab Results", icon: ASSETS.images.lab, pick: (item) => item.domain === "LAB" },
  { code: "VIT", title: "Vitals", icon: ASSETS.images.examination, pick: (item) => item.domain === "VIT" },
  // Prose with a place in the Rx pad: symptoms, examination, investigations,
  // operation notes, advice and follow-up (noteGroups.js). The course of a
  // stay is not here: it is the Hospital Course section.
  { code: "RPT", title: "Clinical Notes", icon: ASSETS.images.notes, pick: (item) => item.domain === "RPT" && !isHistory(item) && item.group !== COURSE_GROUP },
];

// On a wide page short facts run along the line, so a section takes a line or
// two and not a column of one-word rows. Vitals and notes stay one per line.
const FLOW = { HX: "bar", DX: "bar", PROC: "bar", MED: "bar", LAB: "grid" };

// However much a file holds, a group shows only this many rows at first; the
// rest are one click away. A long stay can have hundreds of notes, chart
// entries and results, and nobody reads a wall.
const GROUP_LIMIT = { RPT: 2, MED: 6, LAB: 9 };
// Notes, tag by tag: symptoms are short and all shown; the longer notes show
// their first few, the rest one click away.
const NOTE_LIMIT = { Symptoms: 99, Examination: 1, Investigations: 3, "Operation notes": 1, "Advice and follow-up": 3 };
const DEFAULT_LIMIT = 8;

// What a row says on screen, for the panel's search: its name, value, bracket
// and tag. Searching looks at what is shown, so a match is always visible.
const piece = (item) => (typeof item === "string" ? item : item?.tip || item?.v || "");
const rowText = (item) =>
  [item.label, item.title, item.med?.generic, item.med?.composition, item.lab?.aka, item.lab?.report, item.detail, item.value, item.unit, item.group, item.dateLabel, item.dateLabel ? houseDate(item.dateLabel) : "", ...(rxQuals(item) || []).map(piece), ...(item.facts || []).map((fact) => `${fact.k} ${fact.v}`)]
    .filter(Boolean)
    .join(" ");
const fold = (value = "") => String(value).toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ").trim();
export const MIN_DATA_QUERY = 2;
const matcher = (query) => {
  const words = fold(query).split(" ").filter(Boolean);
  return (item) => {
    const hay = fold(rowText(item));
    return words.every((word) => hay.includes(word));
  };
};

// When the facts of a group were written. Medicines say it once, on the tag:
//   At home (09 Jul'26)                 every row has the same date
//   In hospital (09 Jul to 16 Jul'26)   the rows span days; each row then
//                                       carries its own date in its bracket
// A tag that already names a date ("On discharge (16 Jul'26)") is left alone.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (d, mon, year) => Date.UTC(Number(year), MONTHS.indexOf(mon.slice(0, 3)), Number(d));
// A date label as [first day, last day]: "9 Jul 2026", "5 to 12 Jul 2026",
// "28 Jun to 3 Jul 2026". Anything else is not guessed at.
function spanOf(label = "") {
  let m = label.match(/^(\d{1,2}) ([A-Z][a-z]{2})[a-z]* (\d{4})$/);
  if (m) return [day(m[1], m[2], m[3]), day(m[1], m[2], m[3])];
  m = label.match(/^(\d{1,2}) to (\d{1,2}) ([A-Z][a-z]{2})[a-z]* (\d{4})$/);
  if (m) return [day(m[1], m[3], m[4]), day(m[2], m[3], m[4])];
  m = label.match(/^(\d{1,2}) ([A-Z][a-z]{2})[a-z]* to (\d{1,2}) ([A-Z][a-z]{2})[a-z]* (\d{4})$/);
  if (m) return [day(m[1], m[2], m[5]), day(m[3], m[4], m[5])];
  return null;
}
const two = (value) => String(value).padStart(2, "0");
const short = (ms, withYear = true) => {
  const date = new Date(ms);
  return `${two(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]}${withYear ? `'${String(date.getUTCFullYear()).slice(-2)}` : ""}`;
};
function groupDate(title, list, code) {
  if (code !== "MED" || !title) return { title, inTag: false };
  const days = [...new Set(list.map((item) => item.dateLabel).filter(Boolean))];
  if (/\(.*\d.*\)\s*$/.test(title)) return { title, inTag: days.length <= 1 };
  if (!days.length) return { title, inTag: false };
  if (days.length === 1) return { title: `${title} (${houseDate(days[0])})`, inTag: true };
  const spans = days.map(spanOf);
  if (spans.some((span) => !span)) return { title, inTag: false };
  const first = Math.min(...spans.map((span) => span[0]));
  const last = Math.max(...spans.map((span) => span[1]));
  const oneYear = new Date(first).getUTCFullYear() === new Date(last).getUTCFullYear();
  return { title: `${title} (${short(first, !oneYear)} to ${short(last)})`, inTag: false };
}

function Group({ title: plainTitle, list, code, review, quick, flow, all = false }) {
  const { title, inTag } = groupDate(plainTitle, list, code);
  const [open, setOpen] = useState(false);
  const [openNote, setOpenNote] = useState(null);
  const limit = code === "RPT" && plainTitle in NOTE_LIMIT ? NOTE_LIMIT[plainTitle] : GROUP_LIMIT[code] || DEFAULT_LIMIT;
  // Never "+1 more": one extra row costs less than the link that hides it.
  const shown = open || all || list.length - limit <= 1 ? list : list.slice(0, limit);
  const rest = list.length - shown.length;
  return (
    <div className={styles.rowGroup}>
      {title ? <div className={styles.rowGroupTitle}>{title}</div> : null}
      <ul className={styles.rows} data-flow={flow || undefined} data-dots={DOTTED.includes(code) && !flow ? "true" : undefined}>
        {shown.map((item) => (
          <li
            key={item.id}
            className={styles.row}
            // A note is two lines until it is opened: a doctor scans titles
            // first and reads the one that matters.
            data-note={item.domain === "RPT" && !item.sym ? (openNote === item.id ? "open" : "closed") : undefined}
            onClick={item.domain === "RPT" && !item.sym ? () => setOpenNote((value) => (value === item.id ? null : item.id)) : undefined}
          >
            <FindingBody
              finding={item}
              dated={item.domain !== "LAB"}
              dateInTag={inTag}
              latestOnly
              tagged
              marks={<RowMarks finding={item} status={statusOf(review, item.id)} quick={quick} />}
            />
          </li>
        ))}
      </ul>
      {list.length - limit > 1 && !all ? (
        <button type="button" className={styles.moreLink} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Show fewer" : code === "RPT" && limit === 0 ? `Show ${rest} notes` : `+${rest} more${code === "RPT" ? (rest === 1 ? " note" : " notes") : ""}`}
        </button>
      ) : null}
    </div>
  );
}

function SectionRows({ items, code, review, quick, flow, groupOf, groups, all }) {
  const grouped = groupOf
    ? groups.map((title) => [title, code === "HX" ? presentFirst(items.filter((item) => groupOf(item) === title)) : items.filter((item) => groupOf(item) === title)]).filter(([, list]) => list.length)
    : groupFindings(items);
  return grouped.map(([key, list]) => <Group key={key || "all"} title={key} list={list} code={code} review={review} quick={quick} flow={flow} all={all} />);
}

// The allergy line is always present. It never says "none" unless a page does.
function allergyGap(bundle, review) {
  const all = bundle.findings.filter((item) => historyType(item) === "allergy");
  if (all.some((item) => item.hold && statusOf(review, item.id) === "draft")) return "An unclear reading is held back";
  if (all.some((item) => statusOf(review, item.id) === "rejected")) return "Entry removed in review";
  return "Not recorded in this file";
}

// `query`, when it has two or more characters, turns the sections into search
// results: only matching rows, every one of them (normal lab results too), and
// none of the notes about what is not shown.
export default function DataSections({ bundle, review, RxSection, onOpenReview, quick = false, flow = false, query = "" }) {
  const searching = fold(query).length >= MIN_DATA_QUERY;
  const shownToDoctor = bundle.findings.filter((item) => isShownToDoctor(item, review));
  const matched = searching ? shownToDoctor.filter(matcher(query)) : shownToDoctor;
  // A course event is found by its day, its words and its kind ("transfer").
  const eventMatches = searching
    ? (event) => {
        const hay = fold(`${event.date} ${event.title} ${event.detail} ${courseKind(event)}`);
        return fold(query).split(" ").filter(Boolean).every((word) => hay.includes(word));
      }
    : null;
  // An event that restates a fact follows it: removed or held back in review,
  // the event is not shown either.
  // A note that is not kept as a fact (`unlisted`) can still be what an event
  // points at; it has no review state, so it only has to exist.
  const byId = Object.fromEntries(bundle.findings.map((item) => [item.id, item]));
  const loose = Object.fromEntries((bundle.unlisted || []).map((item) => [item.id, item]));
  const factOf = (id) => (byId[id] ? (isShownToDoctor(byId[id], review) ? byId[id] : null) : loose[id] || null);
  // The stay's own course paragraph from the discharge summary, when the file
  // has one: it is shown whole, as written, in place of the dated rows.
  const summaryOf = (encounterId) => {
    const fact = shownToDoctor.find((item) => isCourseSummary(item) && item.encounterId === encounterId);
    return fact && (!searching || matcher(query)(fact)) ? fact : null;
  };
  const course = hospitalCourse(bundle, { matches: eventMatches, factOf, summaryOf })
    .map((stay) => (stay.summary ? { ...stay, events: [] } : stay))
    .filter((stay) => stay.summary || stay.events.length);
  const courseCount = course.reduce((sum, stay) => sum + (stay.summary ? 1 : stay.events.length), 0);
  const visible = searching ? matched.filter((item) => !isCourseSummary(item)) : matched;
  if (searching && !visible.length && !courseCount) {
    return (
      <div className={styles.railGap} role="status">
        <strong>No match in this file's data</strong>
        <p>Nothing below matches "{query.trim()}". The review also searches the original pages.</p>
        <Button variant="link" theme="primary" size="sm" onClick={onOpenReview}>Open the review</Button>
      </div>
    );
  }
  return (
    <>
      {searching ? <p className={styles.railMatches} role="status">{visible.length + courseCount} {visible.length + courseCount === 1 ? "match" : "matches"} for "{query.trim()}"</p> : null}
      {SECTIONS.map((section) => {
        const all = visible.filter(section.pick);
        const noAllergy = !searching && section.code === "HX" && !all.some((item) => historyType(item) === "allergy");
        if (!all.length && !noAllergy) return null;
        // Labs: only results that are, or were, out of range. Normal results and
        // earlier vitals are not listed and not counted here: the reading view
        // is what needs attention. Search still finds every result, and the
        // review workspace lists them all.
        const list = section.code === "LAB" && !searching ? all.filter(isNotableLab) : all;
        return (
          <RxSection
            key={section.code}
            code={section.jump || section.code}
            title={section.title}
            icon={<img className="snv-rx-section-icon-img" src={section.icon} alt="" aria-hidden="true" />}
          >
            <span data-section={section.code} />
            <SectionRows items={list} code={section.code} review={review} quick={quick} flow={flow ? FLOW[section.code] : null} groupOf={section.groupOf} groups={section.groups} all={searching} />
            {noAllergy ? (
              <div className={styles.rowGroup}>
                <div className={styles.rowGroupTitle}>Allergies</div>
                <p className={styles.fieldEmpty}>{allergyGap(bundle, review)}</p>
              </div>
            ) : null}
            {section.code === "RPT" && !searching ? (
              <div className={styles.railThumbs}>
                {bundle.images.map((image) => (
                  <Tooltip key={image.id} content={`${image.title}, ${image.dateLabel}`}>
                    <button
                      type="button"
                      className={styles.railThumb}
                      aria-label={`Open ${image.title}`}
                      onClick={() => archivedRecordsStore.openSource(image.page, image.rid, { quick })}
                    >
                      <ImageTileArt kind={image.kind} />
                    </button>
                  </Tooltip>
                ))}
              </div>
            ) : null}
          </RxSection>
        );
      })}
      {course.length ? (
        <RxSection title="Hospital Course" icon={<img className="snv-rx-section-icon-img" src={ASSETS.images.notes} alt="" aria-hidden="true" />}>
          <span data-section="COURSE" />
          {course.map((stay) => (
            <div key={stay.id} className={styles.rowGroup}>
              <div className={styles.rowGroupTitle}>{stay.title}</div>
              {stay.summary ? (
                <p className={`${styles.rowLine} ${styles.courseText}`}>
                  {stay.summary.detail}
                  {stay.summary.cite ? <CiteChip quick={quick} page={stay.summary.cite.page} rid={stay.summary.cite.rid} /> : null}
                </p>
              ) : null}
              <ul className={styles.rows}>
                {stay.events.map((event) => (
                  <li key={event.id} className={styles.row}>
                    <p className={`${styles.rowLine} ${styles.courseLine}`}>
                      <span className={styles.courseDate}>{event.sameDay ? "" : event.date}</span>
                      <span className={styles.rowLabel}>{event.title}</span>
                      {event.detail ? <span className={styles.rowText}>{courseLine(event).slice(event.title.length)}</span> : null}
                      {event.cite ? <CiteChip quick={quick} page={event.cite.page} rid={event.cite.rid} /> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </RxSection>
      ) : null}
      {bundle.notFound.length && !searching ? (
        <div className={styles.railGap}>
          <strong>Not found in this file</strong>
          <ul>
            {bundle.notFound.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </>
  );
}

