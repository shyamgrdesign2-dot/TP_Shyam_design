import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { Add, ArrowLeft2, ArrowRight2, Minus, SidebarRight } from "iconsax-reactjs";
import { documentForPage } from "./archivedRecordsStore";
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
function useLocalScan() {
  const [scan, setScan] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!isArchivedRecordsEnabled()) return undefined;
    fetch(`${process.env.PUBLIC_URL || ""}/case-file-local/manifest.json`)
      .then((response) => (response.ok && (response.headers.get("content-type") || "").includes("json") ? response.json() : null))
      .then((manifest) => {
        if (alive && manifest?.pages && manifest.map) setScan(manifest);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return scan;
}

export default function SourcePageViewer({ bundle, page, rid, jump = 0, onPageChange, onHide }) {
  const scan = useLocalScan();
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
  }, [cited, rid, jump, Boolean(scan)]);

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
    <section className={styles.viewer} aria-label="Original pages">
      <header className={styles.viewerBar}>
        <strong>Original pages</strong>
        <span>
          {total} pages, {files.length > 1 ? `${files.length} files, ` : ""}{bundle.documents.length} documents{scan ? " · scanned originals" : ""}
        </span>
      </header>

      {/* Names the paper under the reader's eye; changes as the next one scrolls in. */}
      <div className={styles.docTag} data-named={tag.named ? "true" : undefined} aria-live="polite">
        {number ? <span className={styles.docTagNo}>[{number}]</span> : null}
        <strong>{tag.name}</strong>
        {file ? <span className={styles.docTagFile}>{file.name}</span> : null}
        {span > 1 && !scan ? <small>{dataPage - doc.from + 1} of {span}</small> : null}
      </div>

      <div className={styles.viewerScroll} ref={scrollRef} onScroll={onScroll}>
        {scan
          ? pageNumbers.map((pageNo) => (
              <div key={pageNo} className={styles.sheet} data-page={pageNo} data-cited={pageNo === cited && rid ? "true" : undefined}>
                <span className={styles.sheetNo}>
                  Page {pageNo}
                  {pageNo === cited && rid ? " · cited on this page" : ""}
                </span>
                <img
                  className={styles.scanPage}
                  src={`${process.env.PUBLIC_URL || ""}/case-file-local/${scan.image.replace("{n}", String(pageNo).padStart(scan.pad || 3, "0"))}`}
                  alt={`Scanned page ${pageNo}`}
                  loading="lazy"
                  width={sizeOf(pageNo)[0] || undefined}
                  height={sizeOf(pageNo)[1] || undefined}
                  style={{ width: `${Math.round(ZOOMS[zoomIndex] * 100)}%` }}
                />
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
        <Tooltip content="Previous page">
          <button type="button" aria-label="Previous page" disabled={visiblePage <= 1} onClick={() => go(visiblePage - 1)}><ArrowLeft2 size={16} /></button>
        </Tooltip>
        <span className={styles.dockCount} aria-live="polite" aria-label={`Page ${visiblePage} of ${total}`}>
          {visiblePage} <small>/ {total}</small>
        </span>
        <Tooltip content="Next page">
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
        {onHide ? (
          <>
            <span className={styles.dockDivider} aria-hidden="true" />
            <Tooltip content="Hide source page">
              <button type="button" aria-label="Hide source page" onClick={onHide}><SidebarRight size={16} /></button>
            </Tooltip>
          </>
        ) : null}
      </div>
    </section>
  );
}
