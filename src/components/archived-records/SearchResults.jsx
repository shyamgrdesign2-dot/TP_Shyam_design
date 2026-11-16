import React, { useMemo } from "react";
import { Badge, Chip, Empty, SectionCard } from "@dhspl-tatvacare/tesseract-ui";
import { SearchNormal1 } from "iconsax-reactjs";
import { archivedRecordsStore, isShownToDoctor, statusOf } from "./archivedRecordsStore";
import { CiteChip, Cites } from "./findingFormat";
import styles from "./ArchivedRecords.module.scss";

/**
 * One search for the whole file. It looks in three places and says which:
 *   Clinical data   the structured rows (including a reviewer's corrections)
 *   Documents       document titles
 *   On the pages    every readable line of every page
 * A result opens the exact line on its page; a clinical-data result also
 * opens that row for review.
 *
 * Matching ignores case, extra spaces and the comma/point difference in
 * numbers (0,5 finds 0.5). Every word typed must be present.
 */

const SEARCH_HINTS = ["tumor", "albumin", "alergi", "Nexium", "cystoscopy"];
export const MIN_QUERY = 2;

const fold = (text = "") => String(text).toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ").trim();
const wordsOf = (query) => fold(query).split(" ").filter(Boolean);
const has = (text, words) => {
  const hay = fold(text);
  return words.every((word) => hay.includes(word));
};

function buildIndex(bundle) {
  const rows = [];
  Object.entries(bundle.pages).forEach(([pageNo, page]) => {
    const doc = bundle.documents.find((item) => item.id === page.docId);
    page.blocks.forEach((block) => {
      if (block.t === "kv") rows.push({ page: Number(pageNo), rid: block.rid, doc, text: `${block.k}: ${block.v}` });
      if (block.t === "table") block.rows.forEach((row) => rows.push({ page: Number(pageNo), rid: row.rid, doc, text: row.cells.join("  ") }));
      if (block.t === "img") rows.push({ page: Number(pageNo), rid: block.rid, doc, text: `Image: ${block.caption}` });
    });
  });
  return rows;
}

const findingText = (item) => [item.title, item.label, item.detail, item.value, item.unit, item.verbatim, item.original?.title, item.original?.detail].filter(Boolean).join(" ");

export function searchFile(bundle, index, query) {
  const words = wordsOf(query);
  if (fold(query).length < MIN_QUERY) return { data: [], docs: [], pages: [], total: 0 };
  const data = bundle.findings.filter((item) => has(findingText(item), words));
  const docs = bundle.documents.filter((doc) => has(doc.title, words));
  const pages = index.filter((row) => has(row.text, words));
  return { data, docs, pages, total: data.length + docs.length + pages.length };
}

// Marks every place any typed word appears. Longer words go first so "albumin"
// is marked whole when "al" was typed too.
function Marked({ text = "", query }) {
  const words = wordsOf(query)
    .sort((a, b) => b.length - a.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\./g, "[.,]"))
    .filter(Boolean);
  if (!words.length) return text;
  const parts = String(text).split(new RegExp(`(${words.join("|")})`, "gi"));
  return parts.map((part, index) => (index % 2 ? <mark key={index}>{part}</mark> : <React.Fragment key={index}>{part}</React.Fragment>));
}

export default function SearchResults({ bundle, review = {}, query, setQuery, onGoTo }) {
  const index = useMemo(() => buildIndex(bundle), [bundle]);
  const term = query.trim();
  const found = useMemo(() => searchFile(bundle, index, term), [bundle, index, term]);

  if (fold(term).length < MIN_QUERY) {
    return (
      <Empty
        icon={<SearchNormal1 size={32} />}
        title="Search every page of this file"
        description={term.length ? `Type at least ${MIN_QUERY} characters. Results open on the exact line.` : "Type a medicine, a test, a diagnosis or any word, in English or as written on the page. Results open on the exact line."}
        action={
          <div className={styles.chipRow}>
            {SEARCH_HINTS.map((hint) => (
              <Chip
                key={hint}
                label={hint}
                size="sm"
                variant="outline"
                aria-label={`Search for ${hint}`}
                onClick={() => setQuery(hint)}
                // A chip is a span with role="button": it needs its own keys.
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setQuery(hint);
                }}
              />
            ))}
          </div>
        }
      />
    );
  }
  if (found.total === 0) {
    return (
      <Empty
        icon={<SearchNormal1 size={32} />}
        title={`No match for "${term}"`}
        description="Try fewer words, a shorter word, or the spelling used on the page. Pages that could not be read are not searchable."
      />
    );
  }
  return (
    <div className={styles.stack}>
      <p className={styles.searchCount} role="status">
        <strong>{found.total}</strong> {found.total === 1 ? "result" : "results"} for "{term}"
      </p>
      {found.data.length ? (
        <SectionCard title="Clinical data" subtitle={`${found.data.length} ${found.data.length === 1 ? "item" : "items"} · opens the row for review`}>
          <ul className={styles.results}>
            {found.data.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onGoTo(item)}>
                  <strong><Marked text={[item.title, item.value ? `${item.value} ${item.unit || ""}`.trim() : null].filter(Boolean).join(": ")} query={term} /></strong>
                  <span><Marked text={item.verbatim} query={term} /></span>
                </button>
                {/* A result is not a fact yet if a reviewer removed it or it is still held back. */}
                {statusOf(review, item.id) === "rejected" ? (
                  <Badge variant="soft" color="neutral" size="sm">Removed</Badge>
                ) : !isShownToDoctor(item, review) ? (
                  <Badge variant="soft" color="warning" size="sm">Held back</Badge>
                ) : null}
                <Cites findings={item} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      {found.docs.length ? (
        <SectionCard title="Documents" subtitle={`${found.docs.length} ${found.docs.length === 1 ? "title" : "titles"}`}>
          <ul className={styles.results}>
            {found.docs.map((doc) => (
              <li key={doc.id}>
                <button type="button" onClick={() => archivedRecordsStore.openSource(doc.from, null)}>
                  <strong><Marked text={doc.title} query={term} /></strong>
                  <span>{doc.from === doc.to ? `Page ${doc.from}` : `Pages ${doc.from}-${doc.to}`}</span>
                </button>
                <span className={styles.cites}><CiteChip page={doc.from} rid={null} /></span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      {found.pages.length ? (
        <SectionCard title="On the pages" subtitle={`${found.pages.length} ${found.pages.length === 1 ? "line" : "lines"} · opens the line on its page`}>
          <ul className={styles.results}>
            {found.pages.map((row, position) => (
              // Not every line on a page has a region id, so the id alone can repeat.
              <li key={`${row.page}-${row.rid || "line"}-${position}`}>
                <button type="button" onClick={() => archivedRecordsStore.openSource(row.page, row.rid)}>
                  <strong>{row.doc?.title} <small>(p. {row.page})</small></strong>
                  <span><Marked text={row.text} query={term} /></span>
                </button>
                <span className={styles.cites}><CiteChip page={row.page} rid={row.rid} /></span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
