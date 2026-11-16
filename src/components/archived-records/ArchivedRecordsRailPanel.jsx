import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, InputBox, SegmentedControl, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { ArrowRight2, InfoCircle, SearchNormal1, ShieldTick, Warning2 } from "iconsax-reactjs";
import { TpAiSparkIcon } from "../dr-agent/shared/AiBrandSparkIcon";
import { DOCUMENT_CATEGORIES } from "./mock/archivedRecordsMock";
import { archivedRecordsStore, citeNumberForPage, countsFor, useArchivedRecords } from "./archivedRecordsStore";
import { CiteChip, Cites, RichLine } from "./findingFormat";
import ArchivedRecordsSourceDrawer from "./ArchivedRecordsSourceDrawer";
import { buildStory } from "./caseFileStory";
import DataSections, { MIN_DATA_QUERY } from "./DataSections";
import { encounterType } from "./encounterTypes";
import styles from "./ArchivedRecords.module.scss";

/**
 * The Case File panel beside the blue rail on the Rx pad.
 *
 * Job: let a consulting doctor take in a 100-page paper file in under a
 * minute and miss nothing that matters. So it is built to be read, not worked:
 *
 *   1. A search box over the data below. It stays in reach while scrolling.
 *   2. One notice section says the data is not verified and where to review.
 *   3. The details straight away, in Rx pad order. There is no summary here:
 *      in a consultation there is no time to read one. (`summary` brings the
 *      six-pointer summary back above the details; the Structured record tab
 *      of the review always has it.)
 *   4. Three lenses on the same facts:
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

const LENSES = [
  { value: "data", label: "Data" },
  { value: "timeline", label: "Timeline" },
  { value: "files", label: "Files" },
];

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

export default function ArchivedRecordsRailPanel({ onOpenReview, kit = {}, summary = false }) {
  const RxSection = kit.RxSection || FallbackRxSection;
  const { bundle, review } = useArchivedRecords();
  const [lens, setLens] = useState("data");
  const [query, setQuery] = useState("");
  const searching = query.trim().length >= MIN_DATA_QUERY;
  const totals = countsFor(bundle.findings, review);
  const byId = Object.fromEntries(bundle.findings.map((item) => [item.id, item]));
  const story = useMemo(() => (summary ? buildStory(bundle, review, { brief: true }) : null), [bundle, review, summary]);

  // Is the full notice still on screen? When it is not, the strip shows.
  const noticeRef = useRef(null);
  const [noticeInView, setNoticeInView] = useState(true);
  useEffect(() => {
    const node = noticeRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setNoticeInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const allDone = totals.pending === 0;

  const openReview = () => {
    archivedRecordsStore.closeQuickView();
    onOpenReview?.();
  };

  return (
    <div className={styles.rail} data-searching={searching ? "true" : undefined}>
      {/* Search over the data below; it stays put while the panel scrolls. */}
      <div className={styles.railSearch} role="search">
        <InputBox
          fullWidth
          clearable
          size="sm"
          placeholder="Search this case file"
          aria-label="Search the data in this case file"
          leftIcon={<SearchNormal1 size={16} />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Escape clears the search; it must not also close the panel.
            if (event.key === "Escape" && query) {
              event.stopPropagation();
              setQuery("");
            }
          }}
        />
      </div>

      {/* Once the notice scrolls away, a short strip takes its place under the search. */}
      <div className={styles.railStrip} data-shown={!noticeInView ? "true" : undefined} data-done={allDone ? "true" : undefined}>
        <button type="button" onClick={openReview} tabIndex={noticeInView ? -1 : 0} aria-hidden={noticeInView ? "true" : undefined}>
          {allDone ? <ShieldTick size={14} variant="Bold" aria-hidden="true" /> : <Warning2 size={14} variant="Bold" aria-hidden="true" />}
          <strong>{allDone ? "Reviewed and saved" : totals.verified ? `${totals.verified} of ${totals.total} verified` : "Not verified"}</strong>
          <span>{allDone ? "Open review" : "Review and save"}</span>
          <ArrowRight2 size={12} aria-hidden="true" />
        </button>
      </div>

      <section ref={noticeRef} className={styles.railNotice} data-done={allDone ? "true" : undefined} aria-label="Verification status">
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

      {summary && !searching ? (
      <section className={styles.railSummary} aria-label="Summary of the case file">
        <header>
          <TpAiSparkIcon size={16} />
          <strong>Summary</strong>
          <Tooltip content={`${bundle.source.engine}. Read on ${bundle.source.processedOn}. Written only from the pages cited; original text is ${bundle.source.language}.`}>
            <button type="button" className={styles.infoBtn} aria-label="About this summary"><InfoCircle size={14} /></button>
          </Tooltip>
        </header>
        <ul>
          {(story?.beats || []).map((beat) => (
            <li key={beat.key} data-kind={beat.kind}>
              {beat.label ? <span className={styles.beatLabel}>{beat.label}</span> : null}
              <RichLine text={beat.text} quick /> <Cites max={2} more={false} findings={beat.cites.map((id) => byId[id])} quick />
            </li>
          ))}
        </ul>
        <footer>
          {bundle.encounters.map((item) => `${encounterType(item.type).label} ${item.shortDate}`).join(" · ")}
        </footer>
      </section>
      ) : null}

      {searching ? null : (
        <div className={styles.railLens}>
          <SegmentedControl options={LENSES} value={lens} onValueChange={setLens} size="sm" fullWidth />
        </div>
      )}

      {lens === "data" || searching ? <DataSections bundle={bundle} review={review} RxSection={RxSection} onOpenReview={openReview} quick query={query} /> : null}
      {lens === "timeline" && !searching ? <TimelineLens bundle={bundle} /> : null}
      {lens === "files" && !searching ? <FilesLens bundle={bundle} /> : null}

      <p className={styles.railFoot}>
        <Badge variant="soft" color="neutral" size="sm">Powered by Velora</Badge>
        Original pages are kept unchanged.
      </p>

      <ArchivedRecordsSourceDrawer onOpenReview={openReview} />
    </div>
  );
}
