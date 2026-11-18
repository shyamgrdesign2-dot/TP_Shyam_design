import React, { useEffect, useMemo, useRef, useState } from "react";
import { InputBox, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { Add, ArrowDown2, ArrowLeft2, ArrowRight2, Minus, SearchNormal1, TaskSquare } from "iconsax-reactjs";
import { documentForPage, statusOf, useArchivedRecords } from "./archivedRecordsStore";
import { isArchivedRecordsEnabled } from "./archivedRecordsFlag";
import { scrollWithin } from "./scrollWithin";
import styles from "./ArchivedRecords.module.scss";

/**
 * The "show me where this came from" pane.
 *
 * In production this shows the original scanned page with the cited region
 * outlined (the RFP calls this field-level lineage: document, page, bounding
 * region). For the UI draft the pages are drawn from the mock so the feature
 * can be shown without any real patient scan in the repo.
 */

const ZOOMS = [0.7, 0.85, 1, 1.2, 1.4];

function ScanImage({ kind }) {
  // Neutral stand-ins for the image regions the extractor cuts out of a page.
  if (kind === "ecg") {
    return (
      <svg viewBox="0 0 480 160" className={styles.scanImage} data-kind="ecg" role="img" aria-label="ECG trace placeholder">
        {[20, 60, 100, 140].map((y) => (
          <polyline
            key={y}
            fill="none"
            strokeWidth="2"
            points={Array.from({ length: 12 }, (_, i) => {
              const x = i * 40;
              return `${x},${y} ${x + 12},${y} ${x + 16},${y - 4} ${x + 20},${y} ${x + 24},${y + 4} ${x + 28},${y - 16} ${x + 32},${y + 6} ${x + 36},${y}`;
            }).join(" ")}
          />
        ))}
      </svg>
    );
  }
  if (kind === "xray") {
    return (
      <svg viewBox="0 0 320 320" className={styles.scanImage} data-kind="dark" role="img" aria-label="Chest X-ray placeholder">
        <ellipse cx="110" cy="170" rx="62" ry="104" />
        <ellipse cx="210" cy="170" rx="62" ry="104" />
        <path d="M160 40 V290" strokeWidth="10" />
        {[90, 120, 150, 180, 210, 240].map((y) => (
          <path key={y} d={`M56 ${y} Q160 ${y - 30} 264 ${y}`} fill="none" strokeWidth="2" />
        ))}
        <path d="M150 150 Q190 150 204 210 Q180 246 140 232 Z" data-part="heart" />
      </svg>
    );
  }
  if (kind === "angio") {
    return (
      <svg viewBox="0 0 320 240" className={styles.scanImage} data-kind="dark" role="img" aria-label="Angiogram still placeholder">
        <path d="M40 40 Q120 60 150 120 T280 210" fill="none" strokeWidth="8" />
        <path d="M110 70 Q160 60 220 40" fill="none" strokeWidth="4" />
        <path d="M150 120 Q120 160 90 210" fill="none" strokeWidth="4" />
        <path d="M200 160 Q240 150 290 130" fill="none" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === "photo") {
    return (
      <svg viewBox="0 0 320 240" className={styles.scanImage} data-kind="photo" role="img" aria-label="Photograph placeholder">
        <rect x="60" y="50" width="200" height="140" rx="12" fill="none" strokeWidth="4" />
        <circle cx="116" cy="100" r="16" fill="none" strokeWidth="4" />
        <path d="M70 180 L132 126 L176 160 L210 136 L250 180" fill="none" strokeWidth="4" />
      </svg>
    );
  }
  if (kind === "scope") {
    return (
      <svg viewBox="0 0 320 240" className={styles.scanImage} data-kind="dark" role="img" aria-label="Endoscopic image placeholder">
        <circle cx="96" cy="120" r="64" />
        <circle cx="96" cy="120" r="24" fill="none" strokeWidth="2" />
        <circle cx="228" cy="120" r="64" />
        <path d="M196 132 Q228 96 262 128" fill="none" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 240" className={styles.scanImage} data-kind="dark" role="img" aria-label="Echo still placeholder">
      <path d="M160 20 L300 220 L20 220 Z" fill="none" strokeWidth="2" />
      <ellipse cx="160" cy="150" rx="70" ry="44" fill="none" strokeWidth="6" />
      <path d="M110 150 Q160 110 210 150" fill="none" strokeWidth="2" />
    </svg>
  );
}

function Block({ block, activeRid }) {
  const hit = (rid) => (rid && rid === activeRid ? "true" : undefined);
  switch (block.t) {
    case "head":
      return (
        <div className={styles.paperHead}>
          <strong>{block.title}</strong>
          <span>{block.sub}</span>
        </div>
      );
    case "title":
      return <div className={styles.paperTitle}>{block.text}</div>;
    case "label":
      return (
        <div className={styles.paperLabel}>
          <strong>{block.name}</strong>
          <span>{block.ids}</span>
        </div>
      );
    case "sub":
      return <div className={styles.paperSub}>{block.text}</div>;
    case "kv":
      return (
        <div className={styles.paperRow} data-rid={block.rid} data-hit={hit(block.rid)} data-smudge={block.smudge ? "true" : undefined}>
          <span className={styles.paperKey}>{block.k}</span>
          <span className={styles.paperValue} data-hand={block.hand ? "true" : undefined}>{block.v}</span>
        </div>
      );
    case "table":
      return (
        <table className={styles.paperTable}>
          <thead>
            <tr>{block.cols.map((col) => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.rid} data-rid={row.rid} data-hit={hit(row.rid)} data-smudge={row.smudge ? "true" : undefined}>
                {row.cells.map((cell, index) => (
                  <td key={index} data-hand={block.hand ? "true" : undefined}>
                    {cell}
                    {row.correction && index === 1 ? <em className={styles.paperCorrection}>{row.correction}</em> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "img":
      return (
        <figure className={styles.paperFigure} data-rid={block.rid} data-hit={hit(block.rid)}>
          <ScanImage kind={block.kind} />
          <figcaption>{block.caption}</figcaption>
        </figure>
      );
    case "sig":
      return <div className={styles.paperSign} data-hand="true">{block.text}</div>;
    case "foot":
      return <div className={styles.paperFoot}>{block.text}</div>;
    case "damage":
      return (
        <div className={styles.paperDamage} data-rid={block.rid} data-hit={hit(block.rid)}>
          {block.text}
        </div>
      );
    default:
      return null;
  }
}

export function ImageTileArt({ kind }) {
  return <ScanImage kind={kind} />;
}

// What to call the paper a page belongs to. The reader names most documents
// (Discharge summary, OPD Rx, Lab report). When it cannot, the tag still says
// something true about the page instead of inventing a title:
//   pictures with no text        "Photographs and images"
//   text it could not classify   "Unclassified pages"
//   a page in no document        "Unfiled page"
export function documentName(doc) {
  if (!doc) return { name: "Unfiled page", named: false };
  if (doc.title && !doc.untitled) return { name: doc.title, named: true };
  return { name: doc.script === "image" ? "Photographs and images" : "Unclassified pages", named: false };
}

// Real scanned pages, for local demos only. They live in the git-ignored
// folder public/case-file-local/ with a manifest that maps each page number
// used by the data to the scan page that carries it. When the folder is not
// there (everywhere except a developer's own machine) this returns null and
// the drawn sample pages are used.
//
// Beside the manifest, regions.json says where on its page each cited region
// sits: { dataPage: { rid: [x, y, width, height] } }, as fractions of the
// page image. It is what the extraction service returns with every fact (the
// box of the words it read). A citation then lands on those words, marked,
// not just on their page. A region with no box falls back to marking the page.
// Fetched once for the whole app, as soon as this module loads, so a
// citation never waits for it. Until it has answered the strip shows a
// loading state, never the drawn sample pages: a doctor must not see a
// stand-in page, even for a moment, where the real one is coming.
const json = (response) => (response.ok && (response.headers.get("content-type") || "").includes("json") ? response.json() : null);
let scanCache = { done: false, value: null, promise: null };
function loadScan() {
  if (scanCache.promise) return scanCache.promise;
  const base = process.env.PUBLIC_URL || "";
  scanCache.promise = fetch(`${base}/case-file-local/manifest.json`)
    .then(json)
    .then((manifest) => {
      if (!manifest?.pages || !manifest.map) return null;
      return fetch(`${base}/case-file-local/regions.json`)
        .then(json)
        .catch(() => null)
        .then((regions) => ({ ...manifest, regions: regions || {} }));
    })
    .catch(() => null)
    .then((value) => {
      scanCache = { ...scanCache, done: true, value };
      return value;
    });
  return scanCache.promise;
}
if (typeof window !== "undefined" && isArchivedRecordsEnabled()) loadScan();

function useLocalScan() {
  const enabled = isArchivedRecordsEnabled();
  const [state, setState] = useState(() => (!enabled || scanCache.done ? { pending: false, scan: scanCache.value } : { pending: true, scan: null }));
  useEffect(() => {
    if (!enabled || !state.pending) return undefined;
    let alive = true;
    loadScan().then((value) => {
      if (alive) setState({ pending: false, scan: value });
    });
    return () => {
      alive = false;
    };
  }, [enabled, state.pending]);
  return state;
}

// `onGoToFinding`, when given, is how the viewer asks its host to bring one
// fact up on the record side too, so the row and its page sit side by side.
// `reviewTools` is false where the page is only read (the Rx pad's source drawer):
// "Next to review" belongs to the people who verify the file, not to a doctor
// checking one line during a consultation.
export default function SourcePageViewer({ bundle, page, rid, jump = 0, onPageChange, onHide, onGoToFinding, reviewTools = true }) {
  const { scan, pending: scanPending } = useLocalScan();
  const [zoomIndex, setZoomIndex] = useState(2);
  const [visiblePage, setVisiblePage] = useState(page);
  const scrollRef = useRef(null);
  const frame = useRef(0);
  // With real scans the strip is numbered by scan page; the data's page
  // numbers are translated on the way in (a citation) and on the way out (the
  // document tag).
  const total = scan ? scan.pages : bundle.source.totalPages;
  const pageNumbers = useMemo(() => Array.from({ length: total }, (_, index) => index + 1), [total]);
  const toStrip = (dataPage) => {
    if (!scan) return dataPage;
    for (let at = dataPage; at >= 1; at -= 1) if (scan.map[at]) return scan.map[at];
    return 1;
  };
  const fromStrip = (stripPage) => {
    if (!scan) return stripPage;
    const hit = Object.keys(scan.map).map(Number).sort((a, b) => a - b).find((dataPage) => scan.map[dataPage] === stripPage);
    if (hit) return hit;
    // A scan page nothing was read from: it belongs with the page before it.
    return stripPage > 1 ? fromStrip(stripPage - 1) : 1;
  };
  const cited = toStrip(page);
  // Where the cited words sit on a real scan, when their box is known.
  const box = scan && rid ? scan.regions?.[page]?.[rid] || null : null;

  // Jump to the asked page, then to the cited region on it.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    setVisiblePage(cited);
    const sheet = root.querySelector(`[data-page="${cited}"]`);
    const target = rid && sheet ? sheet.querySelector(`[data-rid="${rid}"]`) : null;
    // The cited line goes to the middle; a page starts just under the tag.
    if (target) scrollWithin(root, target, { align: "center" });
    else scrollWithin(root, sheet, { offset: 44 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cited, rid, jump, Boolean(scan), Boolean(box)]);

  // The whole file scrolls as one strip. The page in view is the one crossing
  // a line a third of the way down the pane; the tag and the counter follow it.
  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const root = scrollRef.current;
      if (!root) return;
      const line = root.getBoundingClientRect().top + root.clientHeight / 3;
      let current = null;
      root.querySelectorAll("[data-page]").forEach((node) => {
        if (node.getBoundingClientRect().top <= line) current = node;
      });
      if (current) setVisiblePage(Number(current.getAttribute("data-page")));
    });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const go = (next) => {
    const target = Math.min(total, Math.max(1, next));
    if (!scan) return onPageChange(target, null);
    // Real pages: move the strip itself; the data keeps its own page numbers.
    setVisiblePage(target);
    return scrollWithin(scrollRef.current, scrollRef.current?.querySelector(`[data-page="${target}"]`), { offset: 44 });
  };

  // The catalogue: every document, under its file, filtered as you type.
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const catalogRef = useRef(null);
  useEffect(() => {
    if (!catalogOpen) return undefined;
    const close = (event) => {
      if (catalogRef.current && !catalogRef.current.contains(event.target)) setCatalogOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [catalogOpen]);
  const catalogGroups = useMemo(() => {
    const words = catalogQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const files = bundle.source.files?.length ? bundle.source.files : [{ id: "all", name: "" }];
    return files
      .map((group) => ({
        id: group.id,
        name: group.name,
        docs: bundle.documents
          .map((item, index) => ({ doc: item, number: index + 1 }))
          .filter((item) => (group.id === "all" || item.doc.fileId === group.id) && words.every((word) => `${documentName(item.doc).name} ${group.name}`.toLowerCase().includes(word))),
      }))
      .filter((group) => group.docs.length);
  }, [bundle, catalogQuery]);
  const openCatalog = () => setCatalogOpen((value) => !value);

  // The next page that still has something to review, after the one in view.
  const { review } = useArchivedRecords();
  const nextToReview = useMemo(() => {
    const open = bundle.findings
      .filter((item) => statusOf(review, item.id) === "draft")
      .sort((a, b) => a.cite.page - b.cite.page);
    return open.find((item) => item.cite.page > fromStrip(visiblePage)) || open[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, review, visiblePage, Boolean(scan)]);

  // The pages can be read from the keyboard alone.
  const onKeys = (event) => {
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return;
    const moves = { PageDown: visiblePage + 1, PageUp: visiblePage - 1, Home: 1, End: total };
    if (moves[event.key] !== undefined) {
      event.preventDefault();
      go(moves[event.key]);
    } else if (event.key.toLowerCase() === "d") {
      event.preventDefault();
      openCatalog();
    }
  };

  const openDocument = (target) => {
    setCatalogOpen(false);
    setCatalogQuery("");
    onPageChange(target.from, null);
  };

  const dataPage = fromStrip(visiblePage);
  const doc = documentForPage(bundle, dataPage);
  const tag = documentName(doc);
  const number = doc ? bundle.documents.indexOf(doc) + 1 : null;
  const span = doc ? doc.to - doc.from + 1 : 1;
  // A folder of several PDFs: which one the page under the reader's eye is in.
  const files = bundle.source.files || [];
  const file = files.find((item) => dataPage >= item.from && dataPage <= item.to) || null;
  // A page of another size than most (a landscape chart, an A3 sheet) keeps
  // its own room in the strip before its image has loaded.
  const sizeOf = (pageNo) => scan?.sizes?.[pageNo] || [scan?.width, scan?.height];

  return (
    <section className={styles.viewer} aria-label="Source page viewer">

      {/* The viewer's header: says this side is the original document, names
          the paper in view, and opens the catalogue of every document. */}
      {/* A plain heading says which side this is. */}
      <header className={styles.viewerHead}>
        <strong>Original case file</strong>
        {bundle.source.languagesNotRead ? (
          <span className={styles.viewerLang}>Read: {bundle.source.language}. Not read: {bundle.source.languagesNotRead}</span>
        ) : null}
      </header>

      {/* The index of the file floats over the pages, top left: it names the
          paper in view and opens the list of every document. */}
      <div className={styles.catalog} ref={catalogRef}>
        <button
          type="button"
          className={styles.docTag}
          data-named={tag.named ? "true" : undefined}
          aria-haspopup="listbox"
          aria-expanded={catalogOpen}
          aria-label={`${tag.name}. Open the list of documents (press D)`}
          title={tag.name}
          onClick={openCatalog}
        >
          <strong aria-live="polite">{tag.name}</strong>
          {doc ? <span className={styles.docTagPages}>{doc.from === doc.to ? `p. ${doc.from}` : `p. ${doc.from}-${doc.to}`}</span> : null}
          {number ? <span className={styles.docTagNo}>[{number}]</span> : null}
          <ArrowDown2 size={14} className={styles.docTagArrow} aria-hidden="true" />
        </button>
        {catalogOpen ? (
          <div className={styles.catalogPanel} role="dialog" aria-label="Documents in this file">
            <p className={styles.catalogInfo}>
              {bundle.source.files?.length ? `${bundle.source.files.length} files · ` : ""}
              {bundle.documents.length} documents · {total} pages{scan ? " · scanned originals" : ""}
              {bundle.source.languagesNotRead ? ` · not read: ${bundle.source.languagesNotRead}` : ""}
            </p>
            <div className={styles.catalogSearch}>
              <InputBox
                fullWidth
                size="sm"
                autoFocus
                placeholder="Find a document"
                aria-label="Find a document"
                leftIcon={<SearchNormal1 size={14} />}
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setCatalogOpen(false);
                  }
                }}
              />
            </div>
            <div className={styles.catalogList} role="listbox" aria-label="Documents">
              {catalogGroups.length === 0 ? <p className={styles.catalogEmpty}>No document matches.</p> : null}
              {catalogGroups.map((group) => (
                <div key={group.id} role="group" aria-label={group.name}>
                  {group.name ? (
                    <div className={styles.catalogFile}>
                      <span>{group.name}</span>
                      <small>{group.docs.length} {group.docs.length === 1 ? "document" : "documents"}</small>
                    </div>
                  ) : null}
                  {group.docs.map((item) => (
                    <button
                      key={item.doc.id}
                      type="button"
                      role="option"
                      aria-selected={item.doc === doc}
                      className={styles.catalogItem}
                      data-current={item.doc === doc ? "true" : undefined}
                      onClick={() => openDocument(item.doc)}
                    >
                      <span className={styles.docTagNo}>[{item.number}]</span>
                      <span className={styles.catalogTitle}>{documentName(item.doc).name}</span>
                      <small>{item.doc.from === item.doc.to ? `p. ${item.doc.from}` : `p. ${item.doc.from}-${item.doc.to}`}</small>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={styles.viewerScroll}
        ref={scrollRef}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label="Pages of the original case file. Page Up and Page Down move by page, Home and End go to the first and last page, D opens the list of documents."
        onKeyDown={onKeys}
      >
        {scanPending ? (
          <p className={styles.scanLoading} role="status">Loading the original pages…</p>
        ) : scan
          ? pageNumbers.map((pageNo) => (
              <div key={pageNo} className={styles.sheet} data-page={pageNo} data-cited={pageNo === cited && rid ? (box ? "words" : "true") : undefined}>
                <span className={styles.sheetNo}>
                  Page {pageNo}
                  {pageNo === cited && rid ? (box ? " · cited words marked" : " · cited on this page") : ""}
                </span>
                <div className={styles.scanWrap} style={{ width: `${Math.round(ZOOMS[zoomIndex] * 100)}%` }}>
                  <img
                    className={styles.scanPage}
                    src={`${process.env.PUBLIC_URL || ""}/case-file-local/${scan.image.replace("{n}", String(pageNo).padStart(scan.pad || 3, "0"))}`}
                    alt={`Scanned page ${pageNo}`}
                    loading="lazy"
                    width={sizeOf(pageNo)[0] || undefined}
                    height={sizeOf(pageNo)[1] || undefined}
                  />
                  {/* The cited words themselves: the citation scrolls to this box. */}
                  {pageNo === cited && box ? (
                    <span
                      key={`${rid}-${jump}`}
                      className={styles.scanHit}
                      data-rid={rid}
                      role="img"
                      aria-label="The cited words"
                      style={{ left: `${box[0] * 100}%`, top: `${box[1] * 100}%`, width: `${box[2] * 100}%`, height: `${box[3] * 100}%` }}
                    />
                  ) : null}
                </div>
              </div>
            ))
          : pageNumbers.map((pageNo) => {
              const drawn = bundle.pages[pageNo];
              const own = documentForPage(bundle, pageNo);
              const starts = own ? own.from === pageNo : true;
              return (
                <div key={pageNo} className={styles.sheet} data-page={pageNo} data-starts={starts && pageNo > 1 ? "true" : undefined}>
                  <span className={styles.sheetNo}>Page {pageNo}</span>
                  <div className={styles.paper} style={{ zoom: ZOOMS[zoomIndex] }} data-script={own?.script}>
                    {drawn ? (
                      drawn.blocks.map((block, index) => <Block key={index} block={block} activeRid={pageNo === page ? rid : null} />)
                    ) : (
                      <div className={styles.paperBlank}>
                        <strong>{documentName(own).name}</strong>
                        <span>Page {pageNo}</span>
                        <p>This page is not drawn in the sample file. In the real product the original scan appears here.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        <p className={styles.sheetEnd}>End of file, {total} pages</p>
      </div>

      {/* Page and zoom controls float over the page so the page gets the height. */}
      <div className={styles.dock} role="toolbar" aria-label="Page controls">
        <Tooltip content="Previous page (Page Up)">
          <button type="button" aria-label="Previous page" disabled={visiblePage <= 1} onClick={() => go(visiblePage - 1)}><ArrowLeft2 size={16} /></button>
        </Tooltip>
        <span className={styles.dockCount} aria-live="polite" aria-label={`Page ${visiblePage} of ${total}`}>
          {visiblePage} <small>/ {total}</small>
        </span>
        <Tooltip content="Next page (Page Down)">
          <button type="button" aria-label="Next page" disabled={visiblePage >= total} onClick={() => go(visiblePage + 1)}><ArrowRight2 size={16} /></button>
        </Tooltip>
        <span className={styles.dockDivider} aria-hidden="true" />
        <Tooltip content="Zoom out">
          <button type="button" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex((value) => value - 1)}><Minus size={16} /></button>
        </Tooltip>
        <span className={styles.dockCount}>{Math.round(ZOOMS[zoomIndex] * 100)}%</span>
        <Tooltip content="Zoom in">
          <button type="button" aria-label="Zoom in" disabled={zoomIndex === ZOOMS.length - 1} onClick={() => setZoomIndex((value) => value + 1)}><Add size={16} /></button>
        </Tooltip>
        {reviewTools && nextToReview ? (
          <>
            <span className={styles.dockDivider} aria-hidden="true" />
            <Tooltip content="Open the next item to review, here and in Review data">
              <button
                type="button"
                className={styles.dockWide}
                aria-label="Next page to review"
                onClick={() => (onGoToFinding ? onGoToFinding(nextToReview) : onPageChange(nextToReview.cite.page, nextToReview.cite.rid))}
              >
                <TaskSquare size={16} />
                <span>Next to review</span>
              </button>
            </Tooltip>
          </>
        ) : null}
      </div>
    </section>
  );
}
