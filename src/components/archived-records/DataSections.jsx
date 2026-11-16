import React, { useState } from "react";
import { Button, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { ASSETS } from "../../assets";
import { archivedRecordsStore, isNotableLab, isShownToDoctor, statusOf } from "./archivedRecordsStore";
import { encounterType } from "./encounterTypes";
import { CiteChip, FindingBody, RowMarks, groupFindings, houseDate } from "./findingFormat";
import { rxQuals } from "./rxFormat";
import { ImageTileArt } from "./SourcePageViewer";
import styles from "./ArchivedRecords.module.scss";

/**
 * The detailed sections of a Case File: Diagnosis, Allergies, Procedures,
 * Med (Rx), Lab Results, Vitals, Reports and Notes.
 *
 * One component draws them everywhere (the Rx pad panel, the Structured
 * record tab on the patient page and in the review drawer), so the structure,
 * the order and the wording are the same wherever the doctor meets them. The
 * caller only chooses the frame a section sits in (`RxSection`).
 */

// What stays true about the patient beyond one visit goes first, under one
// heading, the way the product's own Medical History is organised. Then what
// this file is about: diagnosis, procedures, medicines, results.
const HISTORY_ROLES = ["familyHistory", "lifestyle"];
const inHistory = (item) =>
  item.domain === "ALG" ||
  (item.domain === "DX" && item.role === "chronic") ||
  (item.domain === "PROC" && item.role === "pastSurgery") ||
  (item.domain === "RPT" && HISTORY_ROLES.includes(item.role));

// Tags inside Medical History, in this order.
const HISTORY_GROUPS = ["Medical conditions", "Allergies", "Surgical history", "Family history", "Lifestyle"];
const historyGroup = (item) =>
  item.domain === "ALG" ? "Allergies"
  : item.domain === "DX" ? "Medical conditions"
  : item.domain === "PROC" ? "Surgical history"
  : item.role === "familyHistory" ? "Family history"
  : "Lifestyle";

// A diagnosis says what kind it is with a tag above it, not with words in
// its bracket: final (what the stay concluded), working (what was being
// considered), other (also recorded during the stay).
const DX_GROUPS = ["Final diagnosis", "Working diagnosis", "Other diagnoses"];
const dxGroup = (item) => (item.role === "final" ? DX_GROUPS[0] : item.role === "working" ? DX_GROUPS[1] : DX_GROUPS[2]);

const SECTIONS = [
  { code: "HX", jump: "DX", title: "Medical History", icon: ASSETS.images.medicalHistory, pick: inHistory, groupOf: historyGroup, groups: HISTORY_GROUPS },
  { code: "DX", title: "Diagnosis", icon: ASSETS.images.diagnosis, pick: (item) => item.domain === "DX" && item.role !== "chronic", groupOf: dxGroup, groups: DX_GROUPS },
  { code: "PROC", title: "Procedures", icon: ASSETS.images.surgery, pick: (item) => item.domain === "PROC" && item.role !== "pastSurgery" },
  { code: "MED", title: "Med (Rx)", icon: ASSETS.images.medication, pick: (item) => item.domain === "MED" },
  { code: "LAB", title: "Lab Results", icon: ASSETS.images.lab, pick: (item) => item.domain === "LAB" },
  { code: "VIT", title: "Vitals", icon: ASSETS.images.examination, pick: (item) => item.domain === "VIT" },
  { code: "RPT", title: "Reports and Notes", icon: ASSETS.images.notes, pick: (item) => item.domain === "RPT" && !HISTORY_ROLES.includes(item.role) },
];

// On a wide page short facts run along the line, so a section takes a line or
// two and not a column of one-word rows. Vitals and notes stay one per line.
const FLOW = { HX: "bar", DX: "bar", PROC: "bar", MED: "bar", LAB: "grid" };

// However much a file holds, a group shows only this many rows at first; the
// rest are one click away. A long stay can have hundreds of notes, chart
// entries and results, and nobody reads a wall.
const GROUP_LIMIT = { RPT: 2, MED: 6, LAB: 9 };
const DEFAULT_LIMIT = 8;

// What a row says on screen, for the panel's search: its name, value, bracket
// and tag. Searching looks at what is shown, so a match is always visible.
const piece = (item) => (typeof item === "string" ? item : item?.tip || item?.v || "");
const rowText = (item) =>
  [item.label, item.title, item.detail, item.value, item.unit, item.group, item.dateLabel, item.dateLabel ? houseDate(item.dateLabel) : "", ...(rxQuals(item) || []).map(piece), ...(item.facts || []).map((fact) => `${fact.k} ${fact.v}`)]
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
  const limit = GROUP_LIMIT[code] || DEFAULT_LIMIT;
  const shown = open || all ? list : list.slice(0, limit);
  const rest = list.length - shown.length;
  return (
    <div className={styles.rowGroup}>
      {title ? <div className={styles.rowGroupTitle}>{title}</div> : null}
      <ul className={styles.rows} data-flow={flow || undefined}>
        {shown.map((item) => (
          <li
            key={item.id}
            className={styles.row}
            // A note is two lines until it is opened: a doctor scans titles
            // first and reads the one that matters.
            data-note={item.domain === "RPT" ? (openNote === item.id ? "open" : "closed") : undefined}
            onClick={item.domain === "RPT" ? () => setOpenNote((value) => (value === item.id ? null : item.id)) : undefined}
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
      {list.length > limit && !all ? (
        <button type="button" className={styles.moreLink} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Show fewer" : `+${rest} more${code === "RPT" ? (rest === 1 ? " note" : " notes") : ""}`}
        </button>
      ) : null}
    </div>
  );
}

function SectionRows({ items, code, review, quick, flow, groupOf, groups, all }) {
  const grouped = groupOf
    ? groups.map((title) => [title, items.filter((item) => groupOf(item) === title)]).filter(([, list]) => list.length)
    : groupFindings(items);
  return grouped.map(([key, list]) => <Group key={key || "all"} title={key} list={list} code={code} review={review} quick={quick} flow={flow} all={all} />);
}

// Hospital course: what happened during each stay, in order, at the end of
// the details. One tag per stay ("IPD 2 · Orthopaedics, 09 Jul-16 Jul'26"),
// newest first; under it the dated events of that stay, starting with the
// emergency visit that led to it when there was one. A visit that was not a
// stay has no course. Nothing is written here that is not an event of the file.
function hospitalCourse(bundle, matches) {
  const stays = bundle.encounters.filter((item) => encounterType(item.type).stay);
  const inOrder = [...stays].sort((a, b) => String(a.sortKey || "").localeCompare(String(b.sortKey || "")));
  return [...inOrder]
    .reverse()
    .map((stay) => {
      const label = encounterType(stay.type).label;
      const number = inOrder.filter((item) => item.type === stay.type).indexOf(stay) + 1;
      const many = inOrder.filter((item) => item.type === stay.type).length > 1;
      const events = (bundle.timeline || []).filter((event) => event.encounterId === stay.id || (stay.entryEncounterId && event.encounterId === stay.entryEncounterId));
      return {
        id: stay.id,
        title: `${label}${many ? ` ${number}` : ""}${stay.department ? ` · ${stay.department}` : ""}${stay.shortDate ? ` (${stay.shortDate})` : ""}`,
        events: matches ? events.filter(matches) : events,
      };
    })
    .filter((stay) => stay.events.length);
}

// The allergy line is always present. It never says "none" unless a page does.
function allergyGap(bundle, review) {
  const all = bundle.findings.filter((item) => item.domain === "ALG");
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
  const visible = searching ? shownToDoctor.filter(matcher(query)) : shownToDoctor;
  const eventMatches = searching
    ? (event) => {
        const hay = fold(`${event.date} ${event.title} ${event.detail}`);
        return fold(query).split(" ").filter(Boolean).every((word) => hay.includes(word));
      }
    : null;
  const course = hospitalCourse(bundle, eventMatches);
  const courseCount = course.reduce((sum, stay) => sum + stay.events.length, 0);
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
        const noAllergy = !searching && section.code === "HX" && !all.some((item) => item.domain === "ALG");
        if (!all.length && !noAllergy) return null;
        // Labs: only results that are, or were, out of range. The rest are counted.
        const list = section.code === "LAB" && !searching ? all.filter(isNotableLab) : all;
        const quietLabs = all.length - list.length + (bundle.labsNotShown?.count || 0);
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
            {section.code === "VIT" && !searching && bundle.vitalsNotShown?.count ? (
              <button type="button" className={styles.moreLink} onClick={onOpenReview}>
                +{bundle.vitalsNotShown.count} earlier {bundle.vitalsNotShown.count === 1 ? "set" : "sets"} <span>(in the review)</span>
              </button>
            ) : null}
            {section.code === "LAB" && !searching && quietLabs > 0 ? (
              <button type="button" className={styles.moreLink} onClick={onOpenReview}>
                +{quietLabs} normal results <span>(in the review)</span>
              </button>
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
              <ul className={styles.rows}>
                {stay.events.map((event) => (
                  <li key={event.id} className={styles.row}>
                    <p className={styles.rowLine}>
                      <span className={styles.courseDate}>{event.date}</span>
                      <span className={styles.rowLabel}>{event.title}{event.detail ? ":" : ""}</span>{" "}
                      {event.detail ? <span className={styles.rowText}>{event.detail}</span> : null}
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

