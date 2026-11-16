import React, { useState } from "react";
import { Button, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { ASSETS } from "../../assets";
import { archivedRecordsStore, isNotableLab, isShownToDoctor, statusOf } from "./archivedRecordsStore";
import { FindingBody, RowMarks, groupFindings } from "./findingFormat";
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

function Group({ title, list, code, review, quick, flow }) {
  const [open, setOpen] = useState(false);
  const [openNote, setOpenNote] = useState(null);
  const limit = GROUP_LIMIT[code] || DEFAULT_LIMIT;
  const shown = open ? list : list.slice(0, limit);
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
              latestOnly
              tagged
              marks={<RowMarks finding={item} status={statusOf(review, item.id)} quick={quick} />}
            />
          </li>
        ))}
      </ul>
      {list.length > limit ? (
        <button type="button" className={styles.moreLink} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Show fewer" : `+${rest} more${code === "RPT" ? (rest === 1 ? " note" : " notes") : ""}`}
        </button>
      ) : null}
    </div>
  );
}

function SectionRows({ items, code, review, quick, flow, groupOf, groups }) {
  const grouped = groupOf
    ? groups.map((title) => [title, items.filter((item) => groupOf(item) === title)]).filter(([, list]) => list.length)
    : groupFindings(items);
  return grouped.map(([key, list]) => <Group key={key || "all"} title={key} list={list} code={code} review={review} quick={quick} flow={flow} />);
}

// The allergy line is always present. It never says "none" unless a page does.
function allergyGap(bundle, review) {
  const all = bundle.findings.filter((item) => item.domain === "ALG");
  if (all.some((item) => item.hold && statusOf(review, item.id) === "draft")) return "An unclear reading is held back";
  if (all.some((item) => statusOf(review, item.id) === "rejected")) return "Entry removed in review";
  return "Not recorded in this file";
}

export default function DataSections({ bundle, review, RxSection, onOpenReview, quick = false, flow = false }) {
  const visible = bundle.findings.filter((item) => isShownToDoctor(item, review));
  const held = bundle.findings.filter((item) => item.hold && statusOf(review, item.id) === "draft");
  return (
    <>
      {SECTIONS.map((section) => {
        const all = visible.filter(section.pick);
        const noAllergy = section.code === "HX" && !all.some((item) => item.domain === "ALG");
        if (!all.length && !noAllergy) return null;
        // Labs: only results that are, or were, out of range. The rest are counted.
        const list = section.code === "LAB" ? all.filter(isNotableLab) : all;
        const quietLabs = all.length - list.length + (bundle.labsNotShown?.count || 0);
        return (
          <RxSection
            key={section.code}
            code={section.jump || section.code}
            title={section.title}
            icon={<img className="snv-rx-section-icon-img" src={section.icon} alt="" aria-hidden="true" />}
          >
            <span data-section={section.code} />
            <SectionRows items={list} code={section.code} review={review} quick={quick} flow={flow ? FLOW[section.code] : null} groupOf={section.groupOf} groups={section.groups} />
            {noAllergy ? (
              <div className={styles.rowGroup}>
                <div className={styles.rowGroupTitle}>Allergies</div>
                <p className={styles.fieldEmpty}>{allergyGap(bundle, review)}</p>
              </div>
            ) : null}
            {section.code === "VIT" && bundle.vitalsNotShown?.count ? (
              <p className={styles.fieldEmpty}>Only the last recorded set is shown. {bundle.vitalsNotShown.count} earlier {bundle.vitalsNotShown.count === 1 ? "set was" : "sets were"} read from the file.</p>
            ) : null}
            {section.code === "LAB" && quietLabs > 0 ? (
              <button type="button" className={styles.moreLink} onClick={onOpenReview}>
                +{quietLabs} normal results <span>(in the review)</span>
              </button>
            ) : null}
            {section.code === "RPT" ? (
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
      {held.length ? (
        <div className={styles.railGap}>
          <strong>{held.length} unclear readings are held back</strong>
          <p>They were read with low confidence, so they are not shown as facts. A reviewer can check them against the page.</p>
          <Button variant="link" theme="primary" size="sm" onClick={onOpenReview}>See what is held back</Button>
        </div>
      ) : null}
      {bundle.notFound.length ? (
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

