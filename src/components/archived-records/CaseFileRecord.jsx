import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, InputBox, Tabs, TabsList, TabsTrigger, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { ArrowDown2, ArrowRight2, Folder2, InfoCircle, SearchNormal1, ShieldTick, Warning2 } from "iconsax-reactjs";
import { TpAiSparkIcon } from "../dr-agent/shared/AiBrandSparkIcon";
import AiDraftBadge from "./AiDraftBadge";
import { DOCUMENT_CATEGORIES } from "./mock/archivedRecordsMock";
import { archivedRecordsStore, citeNumberForPage, countsFor, useArchivedRecords } from "./archivedRecordsStore";
import { FEATURE_NAME } from "./archivedRecordsName";
import { CiteChip, Cites, RichLine } from "./findingFormat";
import { buildStory } from "./caseFileStory";
import DataSections, { MIN_DATA_QUERY } from "./DataSections";
import { documentPeriods, foldPapers, partName, periodName } from "./documentGroups";
import { encounterType } from "./encounterTypes";
import styles from "./ArchivedRecords.module.scss";

/**
 * The Case File record: the one piece that shows what was read from a paper
 * hospital file. It is the same component wherever the record appears:
 *
 *   the Rx pad panel             narrow, in the Rx pad's own section frame
 *   the review workspace         the Structured record tab
 *   on its own, in any screen    another module or another EMR can place it
 *                                in a column, a card, a drawer or a page
 *
 * It lays itself out from the width it is given: one fact per line when it is
 * narrow, short facts along the line when there is room. Nothing outside it
 * is assumed: no page header, no sidebar styles.
 *
 *   1. Tabs: three ways into the same file.
 *        Data        what is true about the patient, by kind, in Rx pad order
 *        Timeline    what happened when, visit by visit
 *        Documents   the papers, one entry per visit or stay
 *   2. Search over the tab that is open. Tabs and search stay in reach on scroll.
 *   3. A notice: the data is not verified yet, and where to review it.
 *   4. The tab's content. Data is the details under section headings with
 *      short tags: Medical History, Diagnosis, Procedures, Med (Rx), Lab
 *      Results, Vitals, Reports and Notes, the Hospital Course of each stay,
 *      then what is not in the file.
 *
 * There is no summary: in a consultation there is no time to read one, and
 * the details say it. (`summary` puts the six-pointer summary above them.)
 *
 * Props
 *   onOpenReview   opens the place where facts are verified; without it the
 *                  notice has no button
 *   onOpenDomain   makes a section heading a way in to that kind of data
 *   RxSection      the host's own section frame (the Rx pad passes its own);
 *                  otherwise the built-in one, which looks the same
 *   heading        show "Case File · AI draft" above everything, for a host
 *                  that has no heading of its own
 *   search         the search box (off where the host already has one)
 *   notice         the "not verified" notice
 *   tabs           which tabs to show, in order: "data", "timeline",
 *                  "documents". Default is Data alone, with no tab strip:
 *                  the record is its data everywhere it is placed
 *   quick          citations open the light source drawer, not the review
 *   host           "rail" inside the Rx pad's panel (12px gutters), else "page"
 */

// How wide the record must be before short facts run along the line.
const WIDE_FROM = 640;

// The built-in section frame: the same grey title bar the Rx pad panel uses,
// drawn here so the record needs no styles from its host.
export function CaseFileSection({ code, title, icon, children, onOpenDomain }) {
  return (
    <section className={styles.cfSection}>
      <header className={styles.cfSectionTitle}>
        <span className={styles.cfSectionIcon}>{icon}</span>
        {code && onOpenDomain ? (
          <button type="button" onClick={() => onOpenDomain(code)} title="Review and verify these in Clinical data">{title}</button>
        ) : (
          <span>{title}</span>
        )}
      </header>
      {children}
    </section>
  );
}

const TAB_LABEL = { data: "Data", timeline: "Timeline", documents: "Documents" };

// Search within a tab: every word typed must be in the line.
const fold = (value = "") => String(value).toLowerCase().replace(/\s+/g, " ").trim();
const has = (text, query) => {
  const hay = fold(text);
  return fold(query).split(" ").filter(Boolean).every((word) => hay.includes(word));
};
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const pagesOf = (doc) => (doc.from === doc.to ? `p. ${doc.from}` : `p. ${doc.from}-${doc.to}`);

function NoMatch({ what, query }) {
  return (
    <div className={styles.railGap} role="status">
      <strong>No match in the {what}</strong>
      <p>Nothing here matches "{query.trim()}". Try another tab or a shorter word.</p>
    </div>
  );
}

// What happened when, under the visit or stay it belongs to.
function TimelineLens({ bundle, quick, query }) {
  const events = query ? bundle.timeline.filter((event) => has(`${event.date} ${event.title} ${event.detail}`, query)) : bundle.timeline;
  if (query && !events.length) return <NoMatch what="timeline" query={query} />;
  const byId = Object.fromEntries(bundle.encounters.map((item) => [item.id, item]));
  // Events arrive in order; a new visit starts a new group.
  const groups = [];
  events.forEach((event) => {
    const last = groups[groups.length - 1];
    if (last && last.id === event.encounterId) last.events.push(event);
    else groups.push({ id: event.encounterId, events: [event] });
  });
  return groups.map((group, index) => {
    const encounter = byId[group.id];
    return (
      <div key={`${group.id}-${index}`} className={styles.rowGroup}>
        {encounter ? <div className={styles.rowGroupTitle}>{periodName(encounter)}{encounter.shortDate ? `, ${encounter.shortDate}` : ""}</div> : null}
        <ol className={styles.timeline}>
          {group.events.map((event) => (
            <li key={event.id} data-key={event.key ? "true" : undefined}>
              <span className={styles.timelineDate}>{event.date}</span>
              <div>
                <strong>
                  {event.title}
                  <CiteChip quick={quick} page={event.cite.page} rid={event.cite.rid} />
                </strong>
                <p>{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  });
}

// One visit or stay: its name, its dates, how much paper it holds. It opens
// to its papers by kind; same-named papers are one line that opens to its parts.
function Period({ bundle, period, quick, open, onToggle, forceOpen }) {
  const [openLines, setOpenLines] = useState(() => new Set());
  const shown = open || forceOpen;
  const lines = useMemo(() => foldPapers(period.list), [period.list]);
  const fileOf = (doc) => (bundle.source.files || []).find((file) => file.id === doc.fileId)?.name || "";
  const openDoc = (doc) => archivedRecordsStore.openSource(doc.from, null, { quick });
  const bodyId = `cf-period-${period.id}`;
  return (
    <section className={styles.period} data-open={shown ? "true" : undefined}>
      <button type="button" className={styles.periodHead} aria-expanded={shown} aria-controls={shown ? bodyId : undefined} onClick={onToggle}>
        <Folder2 size={16} variant="Bulk" aria-hidden="true" />
        <span className={styles.periodName}>
          <strong>{period.name}</strong>
          {period.dates ? <span>{period.dates}</span> : null}
        </span>
        <span className={styles.periodMeta}>{plural(period.list.length, "document")}, {plural(period.pages, "page")}</span>
        {shown ? <ArrowDown2 size={14} aria-hidden="true" /> : <ArrowRight2 size={14} aria-hidden="true" />}
      </button>
      {shown ? (
        <div className={styles.periodBody} id={bodyId}>
          {DOCUMENT_CATEGORIES.map((category) => {
            const own = lines.filter((line) => line.docs[0].category === category.id);
            if (!own.length) return null;
            return (
              <div key={category.id} className={styles.rowGroup}>
                <div className={styles.rowGroupTitle}>{category.label}</div>
                <ul className={styles.files}>
                  {own.map((line) => {
                    const first = line.docs[0];
                    if (line.docs.length === 1) {
                      return (
                        <li key={line.key}>
                          <button type="button" onClick={() => openDoc(first)}>
                            <span className={styles.fileNo}>[{citeNumberForPage(bundle, first.from)}]</span>
                            <span className={styles.fileTitle}>{first.title}</span>
                            <span className={styles.fileMeta}>{pagesOf(first)}</span>
                          </button>
                        </li>
                      );
                    }
                    const lineOpen = openLines.has(line.key) || forceOpen;
                    return (
                      <li key={line.key}>
                        <button
                          type="button"
                          aria-expanded={lineOpen}
                          onClick={() =>
                            setOpenLines((prev) => {
                              const next = new Set(prev);
                              if (next.has(line.key)) next.delete(line.key);
                              else next.add(line.key);
                              return next;
                            })
                          }
                        >
                          <span className={styles.fileNo}>{lineOpen ? <ArrowDown2 size={12} aria-hidden="true" /> : <ArrowRight2 size={12} aria-hidden="true" />}</span>
                          <span className={styles.fileTitle}>{line.name}</span>
                          <span className={styles.fileMeta}>{line.docs.length} papers, {plural(line.pages, "page")}</span>
                        </button>
                        {lineOpen ? (
                          <ul className={`${styles.files} ${styles.paperParts}`}>
                            {line.docs.map((doc) => (
                              <li key={doc.id}>
                                <button type="button" onClick={() => openDoc(doc)}>
                                  <span className={styles.fileNo}>[{citeNumberForPage(bundle, doc.from)}]</span>
                                  <span className={styles.fileTitle}>{partName(doc, line) || fileOf(doc) || doc.title}</span>
                                  <span className={styles.fileMeta}>{pagesOf(doc)}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

// The papers of the file, one entry per visit or stay, newest first.
function DocumentsLens({ bundle, quick, query }) {
  const categoryLabel = Object.fromEntries(DOCUMENT_CATEGORIES.map((item) => [item.id, item.label]));
  const docs = query ? bundle.documents.filter((doc) => has(`${doc.title} ${categoryLabel[doc.category] || ""}`, query)) : bundle.documents;
  const periods = useMemo(() => documentPeriods(bundle, docs), [bundle, docs]);
  const [openIds, setOpenIds] = useState(() => new Set(documentPeriods(bundle).slice(0, 1).map((period) => period.id)));
  if (query && !docs.length) return <NoMatch what="documents" query={query} />;
  return (
    <>
      {query ? (
        <p className={styles.railMatches} role="status">{plural(docs.length, "document")} for "{query.trim()}"</p>
      ) : (
        <p className={styles.railCoverage}>
          <strong>{plural(bundle.source.totalPages, "page")}, {plural(bundle.documents.length, "document")}.</strong> {bundle.source.pagesWithData} with clinical data, {bundle.source.pagesFormsOnly} forms and charts, {bundle.source.pagesUnread} not readable.
        </p>
      )}
      {periods.map((period) => (
        <Period
          key={period.id}
          bundle={bundle}
          period={period}
          quick={quick}
          forceOpen={Boolean(query)}
          open={openIds.has(period.id)}
          onToggle={() =>
            setOpenIds((prev) => {
              const next = new Set(prev);
              if (next.has(period.id)) next.delete(period.id);
              else next.add(period.id);
              return next;
            })
          }
        />
      ))}
    </>
  );
}

export default function CaseFileRecord({
  onOpenReview,
  onOpenDomain,
  RxSection,
  heading = false,
  search = true,
  notice = true,
  tabs = ["data"],
  summary = false,
  quick = false,
  host = "page",
}) {
  const { bundle, review } = useArchivedRecords();
  const tabList = (tabs || ["data"]).filter((item) => TAB_LABEL[item]);
  const [tab, setTab] = useState(tabList[0] || "data");
  const lens = tabList.includes(tab) ? tab : tabList[0] || "data";
  const [query, setQuery] = useState("");
  const searching = search && query.trim().length >= MIN_DATA_QUERY;
  const totals = countsFor(bundle.findings, review);
  const allDone = totals.pending === 0;
  const byId = useMemo(() => Object.fromEntries(bundle.findings.map((item) => [item.id, item])), [bundle]);
  const story = useMemo(() => (summary ? buildStory(bundle, review, { brief: true }) : null), [bundle, review, summary]);

  // The record's own width decides its layout, so it reads right in a narrow
  // panel and in a full page without the host saying which it is.
  const rootRef = useRef(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    const measure = () => setWide(node.getBoundingClientRect().width >= WIDE_FROM);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The tabs and the search stay fixed together; the strip tucks under them,
  // however tall they turn out to be.
  const topRef = useRef(null);
  const [topHeight, setTopHeight] = useState(0);
  useEffect(() => {
    const node = topRef.current;
    if (!node) return undefined;
    const measure = () => setTopHeight(Math.round(node.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Is the full notice still on screen? When it is not, the strip shows.
  const noticeRef = useRef(null);
  const [noticeInView, setNoticeInView] = useState(true);
  useEffect(() => {
    const node = noticeRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setNoticeInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [wide, notice]);

  const openReview = onOpenReview
    ? () => {
        archivedRecordsStore.closeQuickView();
        onOpenReview();
      }
    : null;

  const Section = useMemo(
    () => RxSection || ((props) => <CaseFileSection {...props} onOpenDomain={onOpenDomain} />),
    [RxSection, onOpenDomain],
  );

  const state = allDone ? "Reviewed and saved" : totals.verified ? `${totals.verified} of ${totals.total} verified` : "Not verified yet";
  const stateIcon = (size) => (allDone ? <ShieldTick size={size} variant="Bold" aria-hidden="true" /> : <Warning2 size={size} variant="Bold" aria-hidden="true" />);
  // The strip stands in for the notice only where the search bar is fixed above it.
  const strip = notice && search;

  return (
    <div
      ref={rootRef}
      className={styles.rail}
      data-host={host}
      data-wide={wide ? "true" : undefined}
      data-searching={searching ? "true" : undefined}
      style={topHeight ? { "--rail-search-h": `${topHeight}px` } : undefined}
    >
      {heading ? (
        <div className={styles.cfHeading}>
          <strong>{FEATURE_NAME}</strong>
          <AiDraftBadge />
        </div>
      ) : null}

      {/* Tabs, then search over the open tab; both stay put while the record scrolls. */}
      {tabList.length > 1 || search ? (
        <div ref={topRef} className={styles.railTop}>
          {tabList.length > 1 ? (
            <Tabs value={lens} onValueChange={setTab} className={styles.railTabs}>
              {/* In the narrow panel the tabs share the width equally, edge to edge. */}
              <TabsList fullWidth={host === "rail"}>
                {tabList.map((item) => (
                  <TabsTrigger key={item} value={item} tag={item === "documents" ? String(bundle.documents.length) : undefined}>{TAB_LABEL[item]}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}
          {search ? (
            <div className={styles.railSearch} role="search">
              <InputBox
                fullWidth
                clearable
                size="sm"
                placeholder={lens === "documents" ? "Search the documents" : lens === "timeline" ? "Search the timeline" : "Search this case file"}
                aria-label={`Search the ${lens === "data" ? "data in this case file" : lens}`}
                leftIcon={<SearchNormal1 size={16} />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  // Escape clears the search; it must not also close the host's panel.
                  if (event.key === "Escape" && query) {
                    event.stopPropagation();
                    setQuery("");
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Once the notice scrolls away, a short strip takes its place under the search. */}
      {strip ? (
        <div className={styles.railStrip} data-shown={!noticeInView ? "true" : undefined} data-done={allDone ? "true" : undefined}>
          <button type="button" onClick={openReview || undefined} tabIndex={noticeInView ? -1 : 0} aria-hidden={noticeInView ? "true" : undefined}>
            {stateIcon(14)}
            <strong>{allDone ? "Reviewed and saved" : totals.verified ? `${totals.verified} of ${totals.total} verified` : "Not verified"}</strong>
            {openReview ? (
              <>
                <span>{allDone ? "Open review" : "Review and save"}</span>
                <ArrowRight2 size={12} aria-hidden="true" />
              </>
            ) : null}
          </button>
        </div>
      ) : null}

      {notice && wide ? (
        // With room, the notice is one line: what it is, then the way in.
        <div ref={noticeRef} className={`${styles.reviewEntry} ${styles.railNoticeWide}`} data-done={allDone ? "true" : undefined} role="note" aria-label="Verification status">
          {stateIcon(18)}
          <div>
            <strong>{state}</strong>
            <span>
              {allDone
                ? "Every item was checked against its source page."
                : "Read by AI from the scanned file. Review each item against its page, then it is saved to the patient record."}
            </span>
          </div>
          {openReview ? (
            <Button variant={allDone ? "ghost" : "solid"} theme="primary" size="sm" onClick={openReview}>
              {allDone ? "Open review" : "Review and save"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {notice && !wide ? (
        <section ref={noticeRef} className={styles.railNotice} data-done={allDone ? "true" : undefined} aria-label="Verification status">
          <div className={styles.railNoticeHead}>
            {stateIcon(16)}
            <strong>{state}</strong>
          </div>
          <p>
            {allDone
              ? "Every item below was checked against its source page."
              : `Read by AI from a ${bundle.source.totalPages}-page hospital file. Check the source before you rely on a value. Review and save to add it to the patient record.`}
          </p>
          {openReview ? (
            <Button variant={allDone ? "ghost" : "outline"} theme="primary" size="sm" fullWidth onClick={openReview}>
              {allDone ? "Open review" : "Review and save"}
            </Button>
          ) : null}
        </section>
      ) : null}

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
                <RichLine text={beat.text} quick={quick} /> <Cites max={2} more={false} findings={beat.cites.map((id) => byId[id])} quick={quick} />
              </li>
            ))}
          </ul>
          <footer>
            {bundle.encounters.map((item) => `${encounterType(item.type).label} ${item.shortDate}`).join(" · ")}
          </footer>
        </section>
      ) : null}

      {lens === "data" ? (
        <DataSections bundle={bundle} review={review} RxSection={Section} onOpenReview={openReview || undefined} quick={quick} flow={wide} query={search ? query : ""} />
      ) : null}
      {lens === "timeline" ? <TimelineLens bundle={bundle} quick={quick} query={searching ? query : ""} /> : null}
      {lens === "documents" ? <DocumentsLens bundle={bundle} quick={quick} query={searching ? query : ""} /> : null}

    </div>
  );
}
