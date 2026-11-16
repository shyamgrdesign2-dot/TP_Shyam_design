import React, { useMemo, useState } from "react";
import { Badge, Button, Chip, Empty, SectionCard } from "@dhspl-tatvacare/tesseract-ui";
import { ArrowDown2, ArrowRight2, Eye } from "iconsax-reactjs";
import { DOCUMENT_CATEGORIES, DOMAINS } from "./mock/archivedRecordsMock";
import { archivedRecordsStore, isShownToDoctor, statusOf } from "./archivedRecordsStore";
import { Carousel, FindingBody, RowMarks } from "./findingFormat";
import { ImageTileArt } from "./SourcePageViewer";
import styles from "./ArchivedRecords.module.scss";

/**
 * Documents: the file as it was filed. Every document in the bundle, in page
 * order, each opening to show what was read from it in the same structured
 * rows used everywhere else. This is the view for someone who thinks in
 * papers ("what does the discharge summary say?") instead of in problems.
 *
 * A document with no rows is still listed: forms, consents and charts are
 * part of the file and stay one click from their pages.
 *
 * This is a reading view, so it follows the reading rules: a removed row is
 * left out, and a reading that is held back is counted, not shown, until a
 * reviewer verifies it under Clinical data.
 */

const SCRIPT_LABEL = { typed: "Typed", handwritten: "Handwritten", mixed: "Typed and handwritten", image: "Images" };
const pagesLabel = (doc) => (doc.from === doc.to ? `Page ${doc.from}` : `Pages ${doc.from}-${doc.to}`);
const DOMAIN_LABEL = Object.fromEntries(DOMAINS.map((domain) => [domain.code, domain.label]));

function DocumentCard({ doc, number, items, held, unread, encounter, review, open, onToggle, onOpenAttention }) {
  const groups = DOMAINS.map((domain) => [domain.code, items.filter((item) => item.domain === domain.code)]).filter(([, list]) => list.length);
  const bodyId = `doc-${doc.id}`;
  return (
    <li className={styles.doc} data-open={open ? "true" : undefined}>
      <div className={styles.docHead}>
        <button type="button" className={styles.docToggle} aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={onToggle}>
          {open ? <ArrowDown2 size={14} aria-hidden="true" /> : <ArrowRight2 size={14} aria-hidden="true" />}
          <span className={styles.docNo}>[{number}]</span>
          <span className={styles.docTitle}>
            <strong>{doc.title}</strong>
            <small>({[pagesLabel(doc), SCRIPT_LABEL[doc.script], encounter?.shortDate].filter(Boolean).join(", ")})</small>
          </span>
        </button>
        <div className={styles.docMeta}>
          {unread ? <Badge variant="soft" color="error" size="sm">{unread} unreadable</Badge> : null}
          {held ? <Badge variant="soft" color="warning" size="sm">{held} held back</Badge> : null}
          <Badge variant="soft" color={items.length ? "primary" : "neutral"} size="sm">{items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : "No data"}</Badge>
          <Button variant="ghost" theme="primary" size="sm" leftIcon={<Eye size={16} />} aria-label={`Open ${doc.title}, ${pagesLabel(doc).toLowerCase()}`} onClick={() => archivedRecordsStore.openSource(doc.from, null)}>
            Open
          </Button>
        </div>
      </div>
      {open ? (
        <div className={styles.docBody} id={bodyId}>
          {held ? (
            <p className={styles.fieldEmpty}>
              {held} unclear {held === 1 ? "reading" : "readings"} from {doc.from === doc.to ? "this page" : "these pages"} {held === 1 ? "is" : "are"} held back and not shown here.{" "}
              {onOpenAttention ? <Button variant="link" theme="primary" size="sm" onClick={onOpenAttention}>{held === 1 ? "Check it" : "Check them"}</Button> : null}
            </p>
          ) : null}
          {groups.length === 0 ? (
            held ? null : <p className={styles.fieldEmpty}>No clinical data was read from {doc.from === doc.to ? "this page" : "these pages"}. Open the document to see the original.</p>
          ) : (
            groups.map(([code, list]) => (
              <div key={code} className={styles.vGroup}>
                <h5 className={styles.vGroupTitle}>{DOMAIN_LABEL[code]}</h5>
                <ul className={styles.rows}>
                  {list.map((item) => (
                    <li key={item.id} className={styles.row} data-status={statusOf(review, item.id)}>
                      <FindingBody finding={item} marks={<RowMarks finding={item} status={statusOf(review, item.id)} />} />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </li>
  );
}

export default function DocumentsTab({ bundle, review, onOpenAttention }) {
  const [category, setCategory] = useState("all");
  // Rows belong to the document that holds their first citation.
  const { itemsByDoc, heldByDoc } = useMemo(() => {
    const shown = {};
    const held = {};
    bundle.documents.forEach((doc) => {
      const all = bundle.findings.filter((item) => item.cite.page >= doc.from && item.cite.page <= doc.to && statusOf(review, item.id) !== "rejected");
      shown[doc.id] = all.filter((item) => isShownToDoctor(item, review));
      held[doc.id] = all.length - shown[doc.id].length;
    });
    return { itemsByDoc: shown, heldByDoc: held };
  }, [bundle, review]);
  const firstWithData = bundle.documents.find((doc) => itemsByDoc[doc.id].length)?.id;
  const [openIds, setOpenIds] = useState(() => new Set(firstWithData ? [firstWithData] : []));

  const docs = bundle.documents.filter((doc) => category === "all" || doc.category === category);
  const allOpen = docs.length > 0 && docs.every((doc) => openIds.has(doc.id));
  const unreadIn = (doc) =>
    bundle.exceptions.filter((item) => !item.findingId && item.cites.some((cite) => cite.page >= doc.from && cite.page <= doc.to)).length;
  const pageCount = docs.reduce((sum, doc) => sum + (doc.to - doc.from + 1), 0);
  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={styles.stack}>
      <div className={styles.dataBar}>
        <Carousel label="Kinds of document">
          <Chip
            label={`All ${bundle.documents.length}`}
            size="sm"
            variant={category === "all" ? "filled" : "outline"}
            color={category === "all" ? "primary" : "default"}
            selected={category === "all"}
            onClick={() => setCategory("all")}
          />
          {DOCUMENT_CATEGORIES.map((item) => {
            const count = bundle.documents.filter((doc) => doc.category === item.id).length;
            if (!count) return null;
            return (
              <Chip
                key={item.id}
                label={`${item.label} ${count}`}
                size="sm"
                variant={category === item.id ? "filled" : "outline"}
                color={category === item.id ? "primary" : "default"}
                selected={category === item.id}
                onClick={() => setCategory(item.id)}
              />
            );
          })}
        </Carousel>
        <div className={styles.dataBarEnd}>
          <span className={styles.muted}>
            {docs.length} {docs.length === 1 ? "document" : "documents"}, {pageCount} {pageCount === 1 ? "page" : "pages"}
          </span>
          <Button
            variant="ghost"
            theme="neutral"
            size="sm"
            // Only the documents listed now; others keep the state they had.
            onClick={() => setOpenIds(allOpen ? new Set([...openIds].filter((id) => !docs.some((doc) => doc.id === id))) : new Set([...openIds, ...docs.map((doc) => doc.id)]))}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      </div>

      {(category === "all" || category === "imaging") && bundle.images.length ? (
        <SectionCard title="Images in the file" subtitle="Cut out of the scanned pages. Open one to see it on its page, next to its report." collapsible defaultCollapsed={category === "all"}>
          <div className={styles.tiles}>
            {bundle.images.map((image) => (
              <button key={image.id} type="button" className={styles.tile} onClick={() => archivedRecordsStore.openSource(image.page, image.rid)}>
                <span className={styles.tileArt}><ImageTileArt kind={image.kind} /></span>
                <span className={styles.tileMeta}>
                  <strong>{image.title}</strong>
                  <span>{[image.group, image.dateLabel, `p. ${image.page}`].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {docs.length === 0 ? (
        <Empty
          size="sm"
          title={bundle.documents.length ? "No documents of this kind" : "No documents in this file"}
          description={bundle.documents.length ? "Choose another kind above." : "Nothing has been filed for this patient yet."}
        />
      ) : null}

      <ul className={styles.docList}>
        {docs.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            number={bundle.documents.indexOf(doc) + 1}
            items={itemsByDoc[doc.id]}
            held={heldByDoc[doc.id]}
            onOpenAttention={onOpenAttention}
            unread={unreadIn(doc)}
            encounter={bundle.encounters.find((item) => item.id === doc.encounterId)}
            review={review}
            open={openIds.has(doc.id)}
            onToggle={() => toggle(doc.id)}
          />
        ))}
      </ul>
    </div>
  );
}
