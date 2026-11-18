import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Checkbox, Empty, InputBox, SectionCard, SegmentedControl, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { Edit2, SearchNormal1, TickCircle, Trash, Warning2 } from "iconsax-reactjs";
import {
  archivedRecordsStore,
  confidenceBand,
  domainSummaries,
  exceptionFor,
  isClear,
  needsAttention,
  statusOf,
} from "./archivedRecordsStore";
import { SelectCell } from "./fields";
import { Carousel, CiteChip, FLAG_LABEL, FindingBody, RowMarks, TrendStrip, groupFindings } from "./findingFormat";
import RxEditForm, { isChanged, readAs, rowFromDraft, startDraft } from "./RxEditForm";
import { useRowFit } from "./RxTable";
import { factFromRx, rxQuals } from "./rxFormat";
import styles from "./ArchivedRecords.module.scss";
import data from "./clinicalData.module.scss";

/**
 * Clinical data: every fact read from the file, one row each, with the tools
 * to make it part of the record.
 *
 * A row reads as the reading views write the same fact: the name in dark
 * ink, then a light bracket of what the page says about it. Every row of
 * every section is laid out alike: a checkbox, that line, and three actions
 * that stand in the same place on each row.
 *
 *   Verify   the row is right as read
 *   Edit     the row is wrong; it opens in the Rx pad's table for that kind
 *            of fact (RxEditForm.jsx), and saving also verifies it
 *   Delete   the row should not go into the patient record
 *
 * Nothing is ever deleted and nothing on the page changes: a removed row stays
 * listed under "Removed" and can be brought back, an edit keeps the original
 * reading beside it. Rows that are flagged, held back or hard to read cannot
 * be verified together with others; they have to be opened and checked one at
 * a time.
 *
 * A correction is stored as the fact's Rx pad row (rxFormat.js).
 */

// Shown as amber badges, like every other doubt about a reading. Red is kept
// for abnormal values.
// Why a row with no flag of its own still wants a careful look: how sure the
// reading is, said on hover of a small amber icon.
const BAND_TITLE = { medium: "Medium confidence", low: "Low confidence" };
const pct = (value) => `${Math.round((value || 0) * 100)}%`;
const bandReason = (finding) =>
  `read at ${pct(finding.confidence)} certainty, below the ${pct(CLEAR_AT)} a clear reading needs${finding.handwritten ? ", from handwriting" : ""}`;
const CLEAR_AT = 0.85;
const VERBATIM_FITS = 140;

function BandTip({ finding, band }) {
  const written = (finding.original || finding).verbatim || "";
  const shown = written.length > VERBATIM_FITS ? `${written.slice(0, VERBATIM_FITS).trim()}…` : written;
  return (
    <div className={data.bandTip}>
      <p className={data.bandTipTitle}>
        {BAND_TITLE[band]}
        <span className={data.bandTipPct}>{pct(finding.confidence)}</span>
      </p>
      <p>
        Read at <mark>{pct(finding.confidence)}</mark> certainty; a clear reading needs {pct(CLEAR_AT)} or more.
        {finding.handwritten ? <> The line is <mark>handwritten</mark>, which is harder to read.</> : null}
      </p>
      {shown ? (
        <p className={data.bandTipWritten}>
          <span>As written</span>
          {shown}
        </p>
      ) : null}
      <p className={data.bandTipDo}>Compare it with the page, then verify, edit or remove it.</p>
    </div>
  );
}

// The review status filter, as a column the dropdown can be built from.
const STATUS_FILTER = { key: "status", label: "Review status" };

// Kinds whose line carries a bracket of qualifiers, where "suspected" is
// already said in amber.
const BRACKETED = (domain) => domain !== "LAB" && domain !== "VIT" && domain !== "RPT";

const scrollStyle = () => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
const findRow = (root, id) => (root ? [...root.querySelectorAll("[data-finding]")].find((node) => node.getAttribute("data-finding") === id) || null : null);

// The scroll area a row lives in.
function scrollBoxOf(node) {
  let box = node.parentElement;
  while (box && !/(auto|scroll)/.test(window.getComputedStyle(box).overflowY)) box = box.parentElement;
  return box;
}

// Bring a row into view inside its own scroll area. scrollIntoView would also
// move the page behind the workspace.
function showRow(node) {
  const box = scrollBoxOf(node);
  if (!box) return;
  // Leave room for the filter bar that sticks to the top.
  const room = Math.max(112, (box.clientHeight - node.offsetHeight) / 2);
  box.scrollBy({ top: node.getBoundingClientRect().top - box.getBoundingClientRect().top - room, behavior: scrollStyle() });
}

const matches = (finding, review, filter) => {
  const status = statusOf(review, finding.id);
  if (filter === "all") return true;
  if (filter === "attention") return status === "draft" && needsAttention(finding);
  return status === filter;
};

function ReviewRow({ finding, bundle, entry, fit, active, selected, draft, onSelect, onActivate, onVerify, onRemove, onUndo, onEditOpen, onEditChange, onEditSave, onEditCancel }) {
  const status = entry?.status || "draft";
  const editing = Boolean(draft);
  const band = confidenceBand(finding.confidence);
  const exception = exceptionFor(bundle, finding.id);
  const original = finding.original;
  const stop = (event) => event.stopPropagation();

  // A doubt about the reading is said at the end of its line. "Suspected" is
  // left out where the bracket on the line already says it.
  const said = BRACKETED(finding.domain) && (rxQuals(finding) || []).some((item) => item?.tone === "warning");
  const flags = finding.flags.filter((flag) => !(flag === "suspected" && said));
  const tag = (key, color, text) => (
    <span key={key} className={data.tag}><Badge variant="soft" color={color} size="sm">{text}</Badge></span>
  );
  const tags = status === "draft" ? (
    <>
      {flags.map((flag) => tag(flag, "warning", FLAG_LABEL[flag] || "Check this"))}
      {finding.flags.length === 0 && band !== "high" ? (
        <Tooltip key="band" content={<BandTip finding={finding} band={band} />}>
          <span className={data.bandIcon} data-band={band} tabIndex={0} role="img" aria-label={`${BAND_TITLE[band]}: ${bandReason(finding)}`}>
            <Warning2 size={16} variant="Bold" />
          </span>
        </Tooltip>
      ) : null}
      {finding.hold ? tag("hold", "neutral", "Held back from the doctor's view") : null}
    </>
  ) : null;

  const undoEdit = (
    <Button variant="link" theme="neutral" size="sm" aria-label={`Undo edit: ${finding.title}`} onClick={() => onUndo(finding, true)}>Undo edit</Button>
  );

  // A corrected row always shows what was read, open or not. While it is
  // still to review, the way back sits at the end of that line.
  const before = original ? (
    <p className={styles.asWritten} data-kind="before">
      <span>Read as</span>
      {readAs(finding)}
      {status === "draft" ? <span className={data.inlineUndo} onClick={stop}>{undoEdit}</span> : null}
    </p>
  ) : null;

  const detail = active ? (
    <>
      {exception ? <p className={styles.vWhy}><strong>{exception.title}.</strong> {exception.body}</p> : null}
      <p className={styles.asWritten}>
        <span>As written</span>
        {(original || finding).verbatim}
        {finding.handwritten ? <em> (handwritten)</em> : null}
      </p>
      {finding.conflictWith ? (
        <p className={styles.asWritten}>
          <span>But</span>
          {finding.conflictWith.text}
          <CiteChip page={finding.conflictWith.page} rid={finding.conflictWith.rid} />
        </p>
      ) : null}
      {finding.coding ? <p className={styles.asWritten}><span>Code</span>{finding.coding}</p> : null}
      {/* The line gives a lab's latest value; an open row gives the rest. */}
      {finding.domain === "LAB" && finding.range ? <p className={styles.asWritten}><span>Ref</span>{finding.range}</p> : null}
      {finding.domain === "LAB" ? <TrendStrip finding={finding} /> : null}
      {entry ? <p className={styles.vMeta}>{status === "verified" ? (entry.edited ? "Corrected and verified" : "Verified") : "Removed"} by {entry.by}, {entry.at}</p> : null}
    </>
  ) : null;

  const edit = (
    <Tooltip content="Correct this reading. Saving also verifies it.">
      <Button variant="ghost" theme="neutral" size="sm" aria-label={`Edit ${finding.title}`} icon={<Edit2 size={16} />} onClick={() => onEditOpen(finding)} />
    </Tooltip>
  );
  // What the row is (or the button that verifies it), Edit, then Delete or
  // the way back. Each has a slot of its own, so they line up down the list.
  const slots = status === "draft" ? [
    <Button className={data.verify} variant="outline" theme="primary" size="sm" leftIcon={<TickCircle size={14} />} aria-label={`Verify ${finding.title}`} onClick={() => onVerify(finding)}>
      Verify
    </Button>,
    edit,
    <Tooltip content="Remove from the record. The page is not changed and you can undo this.">
      <Button variant="ghost" theme="neutral" size="sm" aria-label={`Delete ${finding.title}`} icon={<Trash size={16} />} onClick={() => onRemove(finding)} />
    </Tooltip>,
  ] : status === "verified" ? [
    <Badge variant="soft" color="success" size="sm" icon={<TickCircle size={12} variant="Bold" />}>{entry.edited ? "Corrected" : "Verified"}</Badge>,
    edit,
    original ? undoEdit : (
      <Button variant="link" theme="neutral" size="sm" aria-label={`Undo: ${finding.title}`} onClick={() => onUndo(finding, false)}>Undo</Button>
    ),
  ] : [
    <Badge variant="soft" color="neutral" size="sm">Removed</Badge>,
    null,
    // Undoing a removal only brings the row back; a correction on it stays.
    <Button variant="link" theme="neutral" size="sm" aria-label={`Undo: ${finding.title}`} onClick={() => onUndo(finding, false)}>Undo</Button>,
  ];

  return (
    <li
      className={data.item}
      data-finding={finding.id}
      data-status={status}
      data-compact={fit.compact ? "true" : undefined}
      data-editing={editing ? "true" : undefined}
      data-active={active ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      // The row itself opens its source page, by click or by Enter / Space.
      // Keys pressed inside its buttons and fields are left to them.
      tabIndex={editing ? -1 : 0}
      aria-current={active ? "true" : undefined}
      onClick={() => onActivate(finding)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onActivate(finding);
      }}
    >
      {editing ? (
        // With room for its columns the row becomes the Rx pad's table for
        // its kind; otherwise a labelled form.
        <RxEditForm finding={finding} draft={draft} table={fit.table} narrow={fit.narrow} onChange={onEditChange} onSave={() => onEditSave(finding)} onCancel={() => onEditCancel(finding)} />
      ) : (
        <>
          <div className={data.check} onClick={stop}>
            <Checkbox size="sm" checked={selected} onCheckedChange={(value) => onSelect(finding.id, Boolean(value))} aria-label={`Select ${finding.title}`} />
          </div>
          <div className={data.fact}>
            <FindingBody
              finding={finding}
              dated={finding.domain !== "LAB"}
              latestOnly
              tagged
              marks={<><RowMarks finding={finding} status={status} />{tags}</>}
            />
            <div className={data.under}>
              {before}
              {detail}
            </div>
          </div>
          <div className={data.actions} onClick={stop}>
            {slots.map((slot, index) => <span key={index} className={data.slot}>{slot}</span>)}
          </div>
        </>
      )}
    </li>
  );
}

// One kind of fact: its groups, each a list of rows. How a row is laid out
// and corrected follows the room this section really has, which changes when
// the source page is hidden; it is not read off the window.
function DomainRows({ domain, items, renderRow }) {
  const [ref, fit] = useRowFit(domain.code);
  return (
    <div ref={ref}>
      {groupFindings(items).map(([group, list]) => (
        <div key={group || "all"} className={styles.vGroup}>
          {group ? <h5 className={styles.vGroupTitle}>{group}</h5> : null}
          <ul className={data.rows} aria-label={group ? `${domain.label}, ${group}` : domain.label}>
            {list.map((item) => renderRow(item, fit))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const EMPTY_TITLE = {
  all: "Nothing was read here",
  draft: "Everything here is reviewed",
  attention: "Nothing needs a closer look",
  verified: "Nothing verified yet",
  rejected: "Nothing removed",
};

// Search in Review data: every word typed must be somewhere in the row (its
// name, details, the words as written, its group or date), in any order.
const fold = (text) => String(text || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
const rowText = (item) => fold([item.title, item.detail, item.verbatim, item.group, item.dateLabel, item.value, item.unit, ...(item.quals || [])].filter(Boolean).join(" "));
const hitsQuery = (item, query) => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = rowText(item);
  return words.every((word) => hay.includes(word));
};

// A section's review state, as one tag beside its heading.
function SectionState({ domain }) {
  const done = domain.verified + (domain.rejected || 0);
  if (domain.total && done >= domain.total) return <Badge variant="soft" color="success" size="sm">Verified</Badge>;
  if (domain.verified) return <Badge variant="soft" color="warning" size="sm">{`${domain.verified} of ${domain.total} verified`}</Badge>;
  return <Badge variant="soft" color="warning" size="sm">Not verified</Badge>;
}

export default function ClinicalDataTab({ bundle, review, reviewerName, onApprove, focusId, onFocused, editing, setEditing, domainFilter, setDomainFilter, statusFilter, setStatusFilter }) {
  const rootRef = useRef(null);
  const [selected, setSelected] = useState(() => new Set());
  const [activeId, setActiveId] = useState(null);
  // Sections the reader has folded away.
  const [closed, setClosed] = useState(() => new Set());
  // What the last action did, with the way back when there is one.
  const [note, setNote] = useState(null);
  // This tab's own search; the structured record has its own.
  const [query, setQuery] = useState("");
  const say = (text, undo = null) => setNote({ text, undo });
  const byId = useMemo(() => Object.fromEntries(bundle.findings.map((item) => [item.id, item])), [bundle]);
  const editingId = editing && byId[editing.id] ? editing.id : null;
  const domains = domainSummaries(bundle, review);
  const inDomain = (code) => domainFilter === "all" || code === domainFilter;
  const count = (items, filter) => items.filter((item) => matches(item, review, filter)).length;

  // A count is what a click on it shows: kinds are counted within the chosen
  // status, statuses within the chosen kind.
  const scoped = domains.filter((domain) => inDomain(domain.code)).flatMap((domain) => domain.items);
  const everything = domains.flatMap((domain) => domain.items);
  // Each kind with its count in brackets, in lighter ink.
  const kindLabel = (name, n) => (
    <span className={data.kind}>
      {name}
      <span className={data.kindCount}>({n})</span>
    </span>
  );
  const kinds = [
    { value: "all", label: kindLabel("All", count(everything, statusFilter)) },
    ...domains.map((domain) => ({ value: domain.code, label: kindLabel(domain.label, count(domain.items, statusFilter)) })),
  ];
  const statuses = [
    { value: "all", label: `All rows (${scoped.length})` },
    { value: "draft", label: `To review (${count(scoped, "draft")})` },
    { value: "attention", label: `Needs a look (${count(scoped, "attention")})` },
    { value: "verified", label: `Verified (${count(scoped, "verified")})` },
    { value: "rejected", label: `Removed (${count(scoped, "rejected")})` },
  ];

  // A row with a correction open stays listed whatever the filters say, so the
  // form cannot slip out of sight with typed text in it.
  const sections = domains
    .map((domain) => ({
      ...domain,
      rows: domain.items.filter((item) => item.id === editingId || (inDomain(domain.code) && matches(item, review, statusFilter) && hitsQuery(item, query))),
    }))
    .filter((domain) => domain.rows.length);
  const visibleIds = new Set(sections.flatMap((domain) => domain.rows.map((item) => item.id)));
  const picked = [...selected].filter((id) => visibleIds.has(id));
  const pickedDraft = picked.filter((id) => statusOf(review, id) === "draft");
  const pickedRemoved = picked.filter((id) => statusOf(review, id) === "rejected");
  const chosenDomain = domains.find((domain) => domain.code === domainFilter);

  // A row asked for from elsewhere (search, a held-back note) opens in place.
  useEffect(() => {
    if (!focusId) return;
    setActiveId(focusId);
    const node = findRow(rootRef.current, focusId);
    if (node) showRow(node);
    onFocused?.();
  }, [focusId, onFocused]);

  // Back on this tab with a correction still open: go to it.
  const openOnArrival = useRef(editingId);
  useEffect(() => {
    const node = findRow(rootRef.current, openOnArrival.current);
    if (node) showRow(node);
  }, []);

  // Bulk actions only ever touch rows that are listed. When the filters
  // change, rows that are no longer listed are dropped from the selection so
  // they cannot come back selected later.
  const visibleRef = useRef(visibleIds);
  visibleRef.current = visibleIds;
  useEffect(() => {
    setSelected((prev) => {
      const next = [...prev].filter((id) => visibleRef.current.has(id));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [domainFilter, statusFilter]);


  const select = (ids, on) => {
    setNote(null);
    setSelected((prev) => {
      const next = new Set(prev);
      [].concat(ids).forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  };
  const activate = (finding) => {
    setActiveId(finding.id);
    archivedRecordsStore.openSource(finding.cite.page, finding.cite.rid);
  };
  const refocus = (id) =>
    requestAnimationFrame(() => findRow(rootRef.current, id)?.focus({ preventScroll: true }));
  const leaves = (...filtersLeft) => filtersLeft.includes(statusFilter);
  const backToReview = (ids) => {
    archivedRecordsStore.reset(ids);
    say(ids.length === 1 ? "Undone. It is back under To review." : `Undone. ${ids.length} are back under To review.`);
  };
  const fold = (code, shut) =>
    setClosed((prev) => {
      if (prev.has(code) === shut) return prev;
      const next = new Set(prev);
      if (shut) next.add(code);
      else next.delete(code);
      return next;
    });


  // One row at a time. Where the row then leaves the list (it no longer
  // matches the filter), say where it went and keep Undo within reach.
  const verifyOne = (finding) => {
    archivedRecordsStore.verify(finding.id, reviewerName);
    onApprove?.(finding);
    if (leaves("draft", "attention")) say(`Verified: ${finding.title}.`, () => backToReview([finding.id]));
    else setNote(null);
  };
  const removeOne = (finding) => {
    archivedRecordsStore.reject(finding.id, reviewerName);
    if (leaves("draft", "attention", "verified")) say(`Removed: ${finding.title}. It stays listed under Removed.`, () => backToReview([finding.id]));
    else setNote(null);
  };
  const undoOne = (finding, withEdit) => {
    if (withEdit) archivedRecordsStore.revertEdit(finding.id);
    else archivedRecordsStore.reset(finding.id);
    if (leaves("verified", "rejected")) say(`${finding.original && withEdit ? finding.original.title : finding.title} is back under To review.`);
    else setNote(null);
  };

  const openEdit = (finding) => {
    const open = editingId && editingId !== finding.id ? byId[editingId] : null;
    if (open && isChanged(open, editing.draft)) {
      // Never drop typed text for another row's form.
      say("Save or cancel the correction you have open first.");
      fold(open.domain, false);
      const node = findRow(rootRef.current, open.id);
      if (node) showRow(node);
      return;
    }
    setNote(null);
    setEditing({ id: finding.id, draft: startDraft(finding) });
    activate(finding);
  };
  const closeEdit = (finding) => {
    setEditing(null);
    refocus(finding.id);
  };
  // The correction is stored as the fact's Rx pad row, in that section's own
  // shape (rxRow in rxFormat.js).
  const saveEdit = (finding) => {
    const row = rowFromDraft(finding, editing.draft);
    const title = factFromRx(finding.original || finding, row).title || (finding.original || finding).title;
    archivedRecordsStore.edit(finding.id, { rx: row }, reviewerName);
    if (leaves("draft", "attention", "rejected")) {
      say(`Corrected and verified: ${title}.`, () => {
        archivedRecordsStore.revertEdit(finding.id);
        say("Undone. The original reading is back under To review.");
      });
    } else setNote(null);
    closeEdit(finding);
  };

  // Verify the chosen rows together. Anything not read clearly is never
  // verified with others: it stays selected, and the note says why.
  const verifyPicked = (ids) => {
    const safe = ids.filter((id) => isClear(byId[id]));
    const left = ids.filter((id) => !isClear(byId[id]));
    if (safe.length) {
      archivedRecordsStore.verify(safe, reviewerName);
      safe.forEach((id) => onApprove?.(byId[id]));
    }
    select(safe, false);
    const kept = left.length === 1
      ? " 1 is not clear enough to verify with others and stays selected. Check it against its page."
      : left.length
        ? ` ${left.length} are not clear enough to verify together and stay selected. Check each one against its page.`
        : "";
    say(`${safe.length ? `${safe.length} verified.` : "None verified."}${kept}`, safe.length ? () => backToReview(safe) : null);
  };
  const bulkRemove = () => {
    const ids = picked.filter((id) => statusOf(review, id) !== "rejected");
    archivedRecordsStore.reject(ids, reviewerName);
    say(`${ids.length} removed. ${ids.length === 1 ? "It stays" : "They stay"} listed under Removed.`, () => backToReview(ids));
    setSelected(new Set());
  };
  const bulkRestore = () => {
    const ids = picked.filter((id) => statusOf(review, id) !== "draft");
    archivedRecordsStore.reset(ids);
    say(`${ids.length} put back to review.`);
    setSelected(new Set());
  };

  const renderRow = (item, fit) => (
    <ReviewRow
      key={item.id}
      finding={item}
      bundle={bundle}
      entry={review[item.id]}
      fit={fit}
      active={activeId === item.id}
      selected={selected.has(item.id)}
      draft={editingId === item.id ? editing.draft : null}
      onSelect={select}
      onActivate={activate}
      onVerify={verifyOne}
      onRemove={removeOne}
      onUndo={undoOne}
      onEditOpen={openEdit}
      onEditChange={(draft) => setEditing({ id: item.id, draft })}
      onEditSave={saveEdit}
      onEditCancel={closeEdit}
    />
  );

  return (
    <div className={`${styles.stack} ${styles.dataTab}`} ref={rootRef}>

      {/* One line: what kind of data, then which review status. */}
      {/* Kind first, as the main choice; then search, status and progress. */}
      <div className={`${styles.dataBar} tp-review-filters`}>
        <Carousel label="Kinds of clinical data">
          <SegmentedControl options={kinds} value={domainFilter} onValueChange={setDomainFilter} size="md" aria-label="Kinds of clinical data" />
        </Carousel>
        <div className={data.search} role="search">
          <InputBox
            fullWidth
            clearable
            size="sm"
            placeholder="Search review data: a medicine, a test, a word on the page"
            aria-label="Search review data"
            leftIcon={<SearchNormal1 size={16} />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Escape clears the search; it must not also close the drawer.
              if (event.key === "Escape" && query) {
                event.stopPropagation();
                setQuery("");
              }
            }}
          />
          {query.trim() ? (
            <span className={data.searchCount} role="status">
              {visibleIds.size} {visibleIds.size === 1 ? "row matches" : "rows match"}
            </span>
          ) : null}
          <div className={data.status}>
            <SelectCell column={STATUS_FILTER} options={statuses} value={statusFilter} onChange={setStatusFilter} variant="field" />
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        query.trim() ? (
          <Empty
            size="sm"
            title={`Nothing matches "${query.trim()}"`}
            description="Try a shorter word, or another kind or status above."
            action={<Button variant="outline" theme="neutral" size="sm" onClick={() => setQuery("")}>Clear search</Button>}
          />
        ) : chosenDomain && chosenDomain.total === 0 ? (
          // Nothing read is not the same as nothing there.
          <Empty
            size="sm"
            title={`No ${chosenDomain.label.toLowerCase()} were read from this file`}
            description="That does not mean there are none. The pages may still mention them."
            action={<Button variant="outline" theme="neutral" size="sm" onClick={() => { setStatusFilter("all"); setDomainFilter("all"); }}>Show everything</Button>}
          />
        ) : (
          <Empty
            size="sm"
            title={EMPTY_TITLE[statusFilter] || EMPTY_TITLE.all}
            description={bundle.findings.length ? "Change the filters above to see other items." : "No clinical data was read from this file. Open Documents to see the pages."}
            action={bundle.findings.length && (statusFilter !== "all" || domainFilter !== "all") ? (
              <Button variant="outline" theme="neutral" size="sm" onClick={() => { setStatusFilter("all"); setDomainFilter("all"); }}>Show everything</Button>
            ) : undefined}
          />
        )
      ) : null}

      {sections.map((domain) => {
        const ids = domain.rows.map((item) => item.id);
        const chosen = ids.filter((id) => selected.has(id));
        const toVerify = chosen.filter((id) => statusOf(review, id) === "draft");
        const kind = domain.label.toLowerCase();
        return (
          <SectionCard
            key={domain.code}
            className={data.sectionBox}
            // Where this section's review stands sits on its heading:
            // Not verified, then "3 of 12 verified", then Verified.
            title={
              <span className={data.sectionTitle}>
                {domain.label}
                <SectionState domain={domain} />
              </span>
            }
            subtitle={domain.rejected ? `${domain.rejected} removed` : undefined}
            // The section's own checkbox, where an icon would be: none, some
            // or all of its listed rows.
            iconBg="none"
            icon={
              <span className={data.selectAll}>
                <Checkbox
                  size="sm"
                  checked={chosen.length === 0 ? false : chosen.length === ids.length ? true : "indeterminate"}
                  onCheckedChange={(value) => select(ids, Boolean(value))}
                  aria-label={`Select all ${kind}`}
                />
              </span>
            }
            collapsible
            collapsed={closed.has(domain.code)}
            onCollapsedChange={(shut) => fold(domain.code, Boolean(shut))}
            // Nothing until rows are chosen; then the bulk action and the way
            // out of the selection. No greyed-out buttons in the resting state.
            headerActions={
              chosen.length ? (
                <div className={data.headerActions}>
                  <span className={data.chosenCount}>{chosen.length} selected</span>
                  <Button variant="link" theme="neutral" size="sm" aria-label={`Clear the selection in ${kind}`} onClick={() => select(ids, false)}>
                    Clear selection
                  </Button>
                  {toVerify.length ? (
                    <Button
                      variant="solid"
                      theme="primary"
                      size="sm"
                      leftIcon={<TickCircle size={14} />}
                      aria-label={`Verify ${toVerify.length} selected ${kind}`}
                      onClick={() => verifyPicked(toVerify)}
                    >
                      {`Verify ${toVerify.length}`}
                    </Button>
                  ) : null}
                </div>
              ) : null
            }
          >
            <DomainRows domain={domain} items={domain.rows} renderRow={renderRow} />
          </SectionCard>
        );
      })}

      {/* Always present, so a screen reader hears each change as it happens. */}
      <p className={styles.srOnly} role="status">
        {picked.length ? `${picked.length} selected. ` : ""}
        {note ? note.text : ""}
      </p>

      {picked.length || note ? (
        <div className={styles.bulkBar} role="group" aria-label="Selected items and last action">
          {picked.length ? <strong aria-hidden="true">{picked.length} selected</strong> : null}
          {note ? (
            <span className={styles.bulkNote}>
              <span aria-hidden="true">{note.text}</span>
              {note.undo ? <Button variant="link" theme="primary" size="sm" onClick={note.undo}>Undo</Button> : null}
            </span>
          ) : null}
          <div className={styles.bulkActions}>
            {pickedDraft.length ? (
              <Button variant="solid" theme="primary" size="sm" onClick={() => verifyPicked(pickedDraft)}>Verify</Button>
            ) : null}
            {picked.length > pickedDraft.length ? (
              <Button variant="outline" theme="neutral" size="sm" onClick={bulkRestore}>Put back to review</Button>
            ) : null}
            {picked.length > pickedRemoved.length ? (
              <Button variant="outline" theme="neutral" size="sm" leftIcon={<Trash size={14} />} onClick={bulkRemove}>Remove</Button>
            ) : null}
            <Button variant="ghost" theme="neutral" size="sm" onClick={() => { setSelected(new Set()); setNote(null); }}>
              {picked.length ? "Clear selection" : "Dismiss"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
