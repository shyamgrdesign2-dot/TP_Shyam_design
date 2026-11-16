import React, { useMemo, useState } from "react";
import { Badge, Button, SegmentedControl, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { InfoCircle, ShieldTick, TickCircle, Warning2 } from "iconsax-reactjs";
import { ASSETS } from "../../assets";
import { TpAiSparkIcon } from "../dr-agent/shared/AiBrandSparkIcon";
import { DOCUMENT_CATEGORIES } from "./mock/archivedRecordsMock";
import { archivedRecordsStore, citeNumberForPage, countsFor, isNotableLab, isShownToDoctor, statusOf, useArchivedRecords } from "./archivedRecordsStore";
import { CiteChip, Cites, FLAG_NOTE, FindingBody, RichLine, groupFindings } from "./findingFormat";
import ArchivedRecordsSourceDrawer from "./ArchivedRecordsSourceDrawer";
import { buildStory } from "./caseFileStory";
import { encounterType } from "./encounterTypes";
import { ImageTileArt } from "./SourcePageViewer";
import styles from "./ArchivedRecords.module.scss";

/**
 * The Case File panel beside the blue rail on the Rx pad.
 *
 * Job: let a consulting doctor take in a 100-page paper file in under a
 * minute and miss nothing that matters. So it is built to be read, not worked:
 *
 *   1. One notice section says the data is not verified and where to review.
 *   2. A short summary, key words in bold, every line cited as [n].
 *   3. Three lenses on the same facts:
 *        Data      what is true about the patient, grouped by type across
 *                  all visits in the file (the problem-oriented view)
 *        Timeline  what happened when (the hospital course)
 *        Files     what is in the file, what was not read, what is missing
 *
 * [n] is a document number, so [2] always means the discharge summary. A click
 * opens the exact line on the source page.
 */

function FallbackRxSection({ title, icon, children }) {
  return (
    <div className="snv-rx-section">
      <div className="snv-rx-section-title">
        <span className="snv-rx-section-icon">{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

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

const LENSES = [
  { value: "data", label: "Data" },
  { value: "timeline", label: "Timeline" },
  { value: "files", label: "Files" },
];

function Marks({ finding, verified }) {
  // A specific flag wins; otherwise a hard-to-read value still gets a mark.
  const flag = finding.flags[0] || (finding.confidence < 0.7 ? "lowConfidence" : null);
  return (
    <>
      {flag && !verified ? (
        <Tooltip content={FLAG_NOTE[flag]}>
          <span className={styles.rowFlag} role="img" aria-label={FLAG_NOTE[flag]}><Warning2 size={12} variant="Bold" /></span>
        </Tooltip>
      ) : null}
      {verified ? (
        <Tooltip content={finding.edited ? "Corrected by a reviewer and saved to the patient record" : "Verified and saved to the patient record"}>
          <span className={styles.rowTick} role="img" aria-label="Verified"><TickCircle size={12} variant="Bold" /></span>
        </Tooltip>
      ) : null}
      <Cites findings={finding} quick />
    </>
  );
}

function SectionRows({ items, review }) {
  return groupFindings(items).map(([key, list]) => (
    <div key={key || "all"} className={styles.rowGroup}>
      {key ? <div className={styles.rowGroupTitle}>{key}</div> : null}
      <ul className={styles.rows}>
        {list.map((item) => (
          <li key={item.id} className={styles.row}>
            <FindingBody
              finding={item}
              dated={item.domain !== "LAB"}
              marks={<Marks finding={item} verified={statusOf(review, item.id) === "verified"} />}
            />
          </li>
        ))}
      </ul>
    </div>
  ));
}

function DataLens({ bundle, review, RxSection, onOpenReview }) {
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
            title={section.title}
            icon={<img className="snv-rx-section-icon-img" src={section.icon} alt="" aria-hidden="true" />}
          >
            <SectionRows items={list} review={review} />
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
                      onClick={() => archivedRecordsStore.openSource(image.page, image.rid, { quick: true })}
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

function TimelineLens({ bundle }) {
  return (
    <ol className={styles.timeline}>
      {bundle.timeline.map((event) => (
        <li key={event.id} data-key={event.key ? "true" : undefined}>
          <span className={styles.timelineDate}>{event.date}</span>
          <div>
            <strong>
              {event.title}
              <CiteChip quick page={event.cite.page} rid={event.cite.rid} />
            </strong>
            <p>{event.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FilesLens({ bundle }) {
  return (
    <>
      <p className={styles.railCoverage}>
        <strong>{bundle.source.totalPages} pages.</strong> {bundle.source.pagesWithData} with clinical data, {bundle.source.pagesFormsOnly} forms and charts, {bundle.source.pagesUnread} not readable.
      </p>
      {DOCUMENT_CATEGORIES.map((category) => {
        const docs = bundle.documents.filter((doc) => doc.category === category.id);
        if (!docs.length) return null;
        return (
          <div key={category.id} className={styles.rowGroup}>
            <div className={styles.rowGroupTitle}>{category.label}</div>
            <ul className={styles.files}>
              {docs.map((doc) => (
                <li key={doc.id}>
                  <button type="button" onClick={() => archivedRecordsStore.openSource(doc.from, null, { quick: true })}>
                    <span className={styles.fileNo}>[{citeNumberForPage(bundle, doc.from)}]</span>
                    <span className={styles.fileTitle}>{doc.title}</span>
                    <span className={styles.fileMeta}>{doc.from === doc.to ? `p. ${doc.from}` : `p. ${doc.from}-${doc.to}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

export default function ArchivedRecordsRailPanel({ onOpenReview, kit = {} }) {
  const RxSection = kit.RxSection || FallbackRxSection;
  const { bundle, review } = useArchivedRecords();
  const [lens, setLens] = useState("data");
  const totals = countsFor(bundle.findings, review);
  const byId = Object.fromEntries(bundle.findings.map((item) => [item.id, item]));
  const story = useMemo(() => buildStory(bundle, review), [bundle, review]);
  const allDone = totals.pending === 0;

  const openReview = () => {
    archivedRecordsStore.closeQuickView();
    onOpenReview?.();
  };

  return (
    <div className={styles.rail}>
      <section className={styles.railNotice} data-done={allDone ? "true" : undefined} aria-label="Verification status">
        <div className={styles.railNoticeHead}>
          {allDone ? <ShieldTick size={16} variant="Bold" aria-hidden="true" /> : <Warning2 size={16} variant="Bold" aria-hidden="true" />}
          <strong>{allDone ? "Reviewed and saved" : totals.verified ? `${totals.verified} of ${totals.total} verified` : "Not verified yet"}</strong>
        </div>
        <p>
          {allDone
            ? "Every item below was checked against its source page."
            : `Read by AI from a ${bundle.source.totalPages}-page hospital file. Check the source before you rely on a value. Review and save to add it to the patient record.`}
        </p>
        <Button variant={allDone ? "ghost" : "outline"} theme="primary" size="sm" fullWidth onClick={openReview}>
          {allDone ? "Open review" : "Review and save"}
        </Button>
      </section>

      <section className={styles.railSummary} aria-label="Summary of the case file">
        <header>
          <TpAiSparkIcon size={16} />
          <strong>Summary</strong>
          <Tooltip content={`${bundle.source.engine}. Read on ${bundle.source.processedOn}. Written only from the pages cited; original text is ${bundle.source.language}.`}>
            <button type="button" className={styles.infoBtn} aria-label="About this summary"><InfoCircle size={14} /></button>
          </Tooltip>
        </header>
        <ul>
          {story.beats.map((beat) => (
            <li key={beat.key} data-kind={beat.kind}>
              <RichLine text={beat.text} /> <Cites findings={beat.cites.map((id) => byId[id])} quick />
            </li>
          ))}
        </ul>
        <footer>
          {bundle.encounters.map((item) => `${encounterType(item.type).label} ${item.shortDate}`).join(" · ")}
        </footer>
      </section>

      <div className={styles.railLens}>
        <SegmentedControl options={LENSES} value={lens} onValueChange={setLens} size="sm" fullWidth />
      </div>

      {lens === "data" ? <DataLens bundle={bundle} review={review} RxSection={RxSection} onOpenReview={openReview} /> : null}
      {lens === "timeline" ? <TimelineLens bundle={bundle} /> : null}
      {lens === "files" ? <FilesLens bundle={bundle} /> : null}

      <p className={styles.railFoot}>
        <Badge variant="soft" color="neutral" size="sm">Powered by Velora</Badge>
        Original pages are kept unchanged.
      </p>

      <ArchivedRecordsSourceDrawer onOpenReview={openReview} />
    </div>
  );
}
