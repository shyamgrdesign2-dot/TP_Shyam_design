import React from "react";
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

// The order a doctor scans a discharge summary in.
const SECTIONS = [
  { code: "DX", title: "Diagnosis", icon: ASSETS.images.diagnosis },
  { code: "ALG", title: "Allergies", icon: ASSETS.images.medicalHistory },
  { code: "PROC", title: "Procedures", icon: ASSETS.images.surgery },
  { code: "MED", title: "Med (Rx)", icon: ASSETS.images.medication },
  { code: "LAB", title: "Lab Results", icon: ASSETS.images.lab },
  { code: "VIT", title: "Vitals", icon: ASSETS.images.examination },
  { code: "RPT", title: "Reports and Notes", icon: ASSETS.images.notes },
];

// On a wide page short facts run along the line, so a section takes a line or
// two and not a column of one-word rows:
//   Diagnosis, Allergies, Procedures, medicines   A (..) | B (..) | C (..)
//                                                 hairline dividers
//   Lab results                                   an even grid, one result
//                                                 per cell, latest value only
// Vitals and notes stay one per line: they are sets and sentences, not items.
const FLOW = { DX: "bar", ALG: "bar", PROC: "bar", MED: "bar", LAB: "grid" };

function SectionRows({ items, review, quick, flow }) {
  return groupFindings(items).map(([key, list]) => (
    <div key={key || "all"} className={styles.rowGroup}>
      {key ? <div className={styles.rowGroupTitle}>{key}</div> : null}
      <ul className={styles.rows} data-flow={flow || undefined}>
        {list.map((item) => (
          <li key={item.id} className={styles.row}>
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
    </div>
  ));
}

export default function DataSections({ bundle, review, RxSection, onOpenReview, quick = false, flow = false }) {
  const visible = bundle.findings.filter((item) => isShownToDoctor(item, review));
  const held = bundle.findings.filter((item) => item.hold && statusOf(review, item.id) === "draft");
  return (
    <>
      {SECTIONS.map((section) => {
        const all = visible.filter((item) => item.domain === section.code);
        if (!all.length) return null;
        // Labs: only results that are, or were, out of range. The rest are counted.
        const list = section.code === "LAB" ? all.filter(isNotableLab) : all;
        const quietLabs = all.length - list.length + (bundle.labsNotShown?.count || 0);
        return (
          <RxSection
            key={section.code}
            code={section.code}
            title={section.title}
            icon={<img className="snv-rx-section-icon-img" src={section.icon} alt="" aria-hidden="true" />}
          >
            <span data-section={section.code} />
            <SectionRows items={list} review={review} quick={quick} flow={flow ? FLOW[section.code] : null} />
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

