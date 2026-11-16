import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Badge, Button, Checkbox, Chip, Empty, InputBox, SectionCard, SegmentedControl, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { Edit2, TickCircle, Trash } from "iconsax-reactjs";
import {
  archivedRecordsStore,
  confidenceBand,
  domainSummaries,
  editFieldsFor,
  exceptionFor,
  isClear,
  needsAttention,
  statusOf,
} from "./archivedRecordsStore";
import { Carousel, CiteChip, FLAG_LABEL, FindingBody, RowMarks, groupFindings } from "./findingFormat";
import styles from "./ArchivedRecords.module.scss";

/**
 * Clinical data: every fact read from the file, one row each, written the same
 * way as on the Rx pad panel, with the tools to make it part of the record.
 *
 *   Verify   the row is right as read
 *   Edit     the row is wrong; type what the page says, which also verifies it
 *   Remove   the row should not go into the patient record
 *
 * Nothing is ever deleted and nothing on the page changes: a removed row stays
 * listed under "Removed" and can be brought back, an edit keeps the original
 * reading beside it. Rows that are flagged, held back or hard to read cannot
 * be verified in bulk; they have to be opened and checked one at a time.
 */

// Shown as amber badges, like every other doubt about a reading. Red is kept
// for abnormal values.
const BAND_NOTE = { medium: "Check this", low: "Hard to read" };

const FIELD_LABEL = { title: "Name", detail: "Details", value: "Value", unit: "Unit", range: "Reference range" };
const LAB_TITLE = "Test";
const ABNORMAL = [
  { value: "", label: "Normal" },
  { value: "H", label: "High" },
  { value: "L", label: "Low" },
];
const ABNORMAL_LABEL = { "": "Normal", H: "High", L: "Low" };
const labelFor = (finding, key) => (key === "title" && finding.domain === "LAB" ? LAB_TITLE : key === "abnormal" ? "Flag" : FIELD_LABEL[key]);

// What the form starts from: the row as it reads now, as text.
const startDraft = (finding) => Object.fromEntries(editFieldsFor(finding).map((key) => [key, finding[key] == null ? "" : String(finding[key])]));
const isChanged = (finding, draft) => {
  const start = startDraft(finding);
  return Object.keys(start).some((key) => (draft[key] || "").trim() !== start[key].trim());
};

// The reading before a correction, field by field, for the fields that changed.
const readAs = (finding) => {
  const before = finding.original;
  const parts = editFieldsFor(finding)
    .filter((key) => String(before[key] == null ? "" : before[key]) !== String(finding[key] == null ? "" : finding[key]))
    .map((key) => `${labelFor(finding, key)}: ${key === "abnormal" ? ABNORMAL_LABEL[before[key] || ""] : before[key] || "blank"}`);
  // Semicolons between fields: the details already use the middle dot.
  return parts.length ? parts.join("; ") : before.title;
};

const scrollStyle = () => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
const findRow = (root, id) => (root ? [...root.querySelectorAll("[data-finding]")].find((node) => node.getAttribute("data-finding") === id) || null : null);

// Bring a row into view inside its own scroll area. scrollIntoView would also
// move the page behind the workspace.
function showRow(node) {
  let box = node.parentElement;
  while (box && !/(auto|scroll)/.test(window.getComputedStyle(box).overflowY)) box = box.parentElement;
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

// The form holds no state of its own: the draft lives in the workspace so it
// survives a change of tab or a search.
function EditForm({ finding, draft, onChange, onSave, onCancel }) {
  const fields = editFieldsFor(finding);
  const errorId = useId();
  const changed = isChanged(finding, draft);
  const required = finding.domain === "LAB" ? ["title", "value"] : ["title"];
  const missing = required.filter((key) => !(draft[key] || "").trim());
  const canSave = changed && missing.length === 0;
  const set = (key, value) => onChange({ ...draft, [key]: value });

  const onFieldKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSave) onSave();
  };
  // Escape closes the form only; it must not also close the drawer around it.
  const onFormKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onCancel();
  };

  return (
    <div className={styles.editForm} role="group" aria-label={`Correct ${finding.title}`} onClick={(event) => event.stopPropagation()} onKeyDown={onFormKeyDown}>
      <div className={styles.editGrid} data-domain={finding.domain}>
        {fields.filter((key) => key !== "abnormal").map((key, index) => (
          <label key={key} className={styles.editField} data-key={key}>
            <span>{labelFor(finding, key)}</span>
            <InputBox
              fullWidth
              size="sm"
              value={draft[key] || ""}
              autoFocus={index === 0}
              autoGrow={key === "detail"}
              maxHeight={key === "detail" ? 120 : undefined}
              status={missing.includes(key) ? "error" : "default"}
              aria-describedby={missing.includes(key) ? errorId : undefined}
              onChange={(event) => set(key, event.target.value)}
              onKeyDown={onFieldKeyDown}
            />
          </label>
        ))}
        {fields.includes("abnormal") ? (
          <div className={styles.editField} data-key="abnormal">
            <span>Flag</span>
            <SegmentedControl options={ABNORMAL} value={draft.abnormal || ""} onValueChange={(value) => set("abnormal", value)} size="sm" aria-label="Flag" />
          </div>
        ) : null}
      </div>
      <p className={styles.asWritten}>
        <span>As written</span>
        {(finding.original || finding).verbatim}
      </p>
      {missing.length ? <p className={styles.editError} id={errorId} role="alert">{missing.map((key) => labelFor(finding, key)).join(" and ")} cannot be empty.</p> : null}
      <div className={styles.editActions}>
        <Button variant="solid" theme="primary" size="sm" disabled={!canSave} onClick={onSave}>Save and verify</Button>
        <Button variant="ghost" theme="neutral" size="sm" onClick={onCancel}>Cancel</Button>
        <span className={styles.editHint}>
          {changed
            ? "The page itself is not changed. Your correction is saved with your name."
            : "Nothing changed yet. If the row is already right, cancel and use Verify."}
        </span>
      </div>
    </div>
  );
}

function ReviewRow({ finding, bundle, entry, active, selected, draft, onSelect, onActivate, onVerify, onRemove, onUndo, onEditOpen, onEditChange, onEditSave, onEditCancel }) {
  const status = entry?.status || "draft";
  const editing = Boolean(draft);
  const band = confidenceBand(finding.confidence);
  const exception = exceptionFor(bundle, finding.id);
  const original = finding.original;
  const suspected = finding.flags.includes("suspected");
  const verifyLabel = finding.verifyLabel || (suspected ? "Verify as suspected" : "Verify");
  const stop = (event) => event.stopPropagation();
  const editButton = (
    <Tooltip content="Correct this reading. Saving also verifies it.">
      <Button variant="ghost" theme="neutral" size="sm" aria-label={`Edit ${finding.title}`} icon={<Edit2 size={16} />} onClick={() => onEditOpen(finding)} />
    </Tooltip>
  );

  return (
    <li
      className={styles.vRow}
      data-finding={finding.id}
      data-status={status}
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
      <div className={styles.vCheck} onClick={stop}>
        <Checkbox size="sm" checked={selected} onCheckedChange={(value) => onSelect(finding.id, Boolean(value))} aria-label={`Select ${finding.title}`} />
      </div>

      <div className={styles.vBody}>
        {editing ? (
          <EditForm finding={finding} draft={draft} onChange={onEditChange} onSave={() => onEditSave(finding)} onCancel={() => onEditCancel(finding)} />
        ) : (
          <>
            <FindingBody finding={finding} dated={finding.domain !== "LAB"} marks={<RowMarks finding={finding} status={status} />} />
            {status === "draft" && (finding.flags.length || finding.hold || band !== "high") ? (
              <div className={styles.vTags}>
                {finding.flags.map((flag) => (
                  <Badge key={flag} variant="soft" color="warning" size="sm">{FLAG_LABEL[flag] || "Check this"}</Badge>
                ))}
                {finding.flags.length === 0 && band !== "high" ? <Badge variant="soft" color="warning" size="sm">{BAND_NOTE[band]}</Badge> : null}
                {finding.hold ? <Badge variant="soft" color="neutral" size="sm">Held back from the doctor's view</Badge> : null}
              </div>
            ) : null}
            {/* A corrected row always shows what was read, open or not. */}
            {original ? (
              <p className={styles.asWritten} data-kind="before">
                <span>Read as</span>
                {readAs(finding)}
              </p>
            ) : null}
            {active ? (
              <div className={styles.vDetail}>
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
                {entry ? <p className={styles.vMeta}>{status === "verified" ? (entry.edited ? "Corrected and verified" : "Verified") : "Removed"} by {entry.by}, {entry.at}</p> : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {editing ? null : (
        <div className={styles.vActions} onClick={stop}>
          {status === "draft" ? (
            <>
              <Button variant="outline" theme="primary" size="sm" aria-label={`${verifyLabel}: ${finding.title}`} onClick={() => onVerify(finding)}>
                {verifyLabel}
              </Button>
              {editButton}
              <Tooltip content="Remove from the record. The page is not changed and you can undo this.">
                <Button variant="ghost" theme="neutral" size="sm" aria-label={`Remove ${finding.title}`} icon={<Trash size={16} />} onClick={() => onRemove(finding)} />
              </Tooltip>
              {/* Put back to review with a correction still on it. */}
              {original ? (
                <Button variant="link" theme="neutral" size="sm" aria-label={`Undo edit: ${finding.title}`} onClick={() => onUndo(finding, true)}>Undo edit</Button>
              ) : null}
            </>
          ) : (
            <>
              {status === "verified" ? (
                <Badge variant="soft" color="success" size="sm" icon={<TickCircle size={12} variant="Bold" />}>{entry.edited ? "Corrected" : "Verified"}</Badge>
              ) : (
                <Badge variant="soft" color="neutral" size="sm">Removed</Badge>
              )}
              {status === "verified" ? editButton : null}
              {/* Undoing a removal only brings the row back; a correction on it stays. */}
              {status === "verified" && original ? (
                <Button variant="link" theme="neutral" size="sm" aria-label={`Undo edit: ${finding.title}`} onClick={() => onUndo(finding, true)}>Undo edit</Button>
              ) : (
                <Button variant="link" theme="neutral" size="sm" aria-label={`Undo: ${finding.title}`} onClick={() => onUndo(finding, false)}>Undo</Button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

const EMPTY_TITLE = {
  all: "Nothing was read here",
  draft: "Everything here is reviewed",
  attention: "Nothing needs a closer look",
  verified: "Nothing verified yet",
  rejected: "Nothing removed",
};

export default function ClinicalDataTab({ bundle, review, reviewerName, onApprove, focusId, onFocused, editing, setEditing, domainFilter, setDomainFilter, statusFilter, setStatusFilter }) {
  const rootRef = useRef(null);
  const [selected, setSelected] = useState(() => new Set());
  const [activeId, setActiveId] = useState(null);
  // What the last action did, with the way back when there is one.
  const [note, setNote] = useState(null);
  const say = (text, undo = null) => setNote({ text, undo });
  const byId = useMemo(() => Object.fromEntries(bundle.findings.map((item) => [item.id, item])), [bundle]);
  const editingId = editing && byId[editing.id] ? editing.id : null;
  const domains = domainSummaries(bundle, review);
  const inDomain = (code) => domainFilter === "all" || code === domainFilter;
  const count = (items, filter) => items.filter((item) => matches(item, review, filter)).length;

  // A count is what a click on it shows: kinds are counted within the chosen
  // status, statuses within the chosen kind.
  const scoped = domains.filter((domain) => inDomain(domain.code)).flatMap((domain) => domain.items);
  const filters = [
    { value: "all", label: `All ${scoped.length}` },
    { value: "draft", label: `To review ${count(scoped, "draft")}` },
    { value: "attention", label: `Needs a look ${count(scoped, "attention")}` },
    { value: "verified", label: `Verified ${count(scoped, "verified")}` },
    { value: "rejected", label: `Removed ${count(scoped, "rejected")}` },
  ];

  // A row with a correction open stays listed whatever the filters say, so the
  // form cannot slip out of sight with typed text in it.
  const sections = domains
    .map((domain) => ({
      ...domain,
      rows: domain.items.filter((item) => item.id === editingId || (inDomain(domain.code) && matches(item, review, statusFilter))),
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
  const saveEdit = (finding) => {
    const patch = Object.fromEntries(editFieldsFor(finding).map((key) => [key, (editing.draft[key] || "").trim()]));
    if ("abnormal" in patch && !patch.abnormal) patch.abnormal = null;
    archivedRecordsStore.edit(finding.id, patch, reviewerName);
    if (leaves("draft", "attention", "rejected")) {
      say(`Corrected and verified: ${patch.title}.`, () => {
        archivedRecordsStore.revertEdit(finding.id);
        say("Undone. The original reading is back under To review.");
      });
    } else setNote(null);
    closeEdit(finding);
  };

  const verifyClear = (ids, label) => {
    archivedRecordsStore.verify(ids, reviewerName);
    ids.forEach((id) => onApprove?.(byId[id]));
    say(`${ids.length} verified in ${label}.`, () => backToReview(ids));
  };
  const bulkVerify = () => {
    const safe = pickedDraft.filter((id) => isClear(byId[id]));
    const left = pickedDraft.filter((id) => !isClear(byId[id]));
    if (safe.length) {
      archivedRecordsStore.verify(safe, reviewerName);
      safe.forEach((id) => onApprove?.(byId[id]));
    }
    setSelected(new Set(left));
    // Anything not read clearly is never verified together with others.
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

  return (
    <div className={styles.stack} ref={rootRef}>
      <div className={styles.dataBar}>
        <Carousel label="Kinds of clinical data">
          <Chip
            label={`All ${count(domains.flatMap((domain) => domain.items), statusFilter)}`}
            size="sm"
            variant={domainFilter === "all" ? "filled" : "outline"}
            color={domainFilter === "all" ? "primary" : "default"}
            selected={domainFilter === "all"}
            onClick={() => setDomainFilter("all")}
          />
          {domains.map((domain) => (
            <Chip
              key={domain.code}
              label={`${domain.label} ${count(domain.items, statusFilter)}`}
              size="sm"
              variant={domainFilter === domain.code ? "filled" : "outline"}
              color={domainFilter === domain.code ? "primary" : "default"}
              selected={domainFilter === domain.code}
              onClick={() => setDomainFilter(domain.code)}
            />
          ))}
        </Carousel>
        <Carousel label="Review status">
          <SegmentedControl options={filters} value={statusFilter} onValueChange={setStatusFilter} size="sm" aria-label="Review status" />
        </Carousel>
      </div>

      {sections.length === 0 ? (
        chosenDomain && chosenDomain.total === 0 ? (
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
        const items = domain.rows;
        const clearIds = items.filter((item) => statusOf(review, item.id) === "draft" && isClear(item)).map((item) => item.id);
        const ids = items.map((item) => item.id);
        const allPicked = ids.every((id) => selected.has(id));
        return (
          <SectionCard
            key={domain.code}
            title={domain.label}
            subtitle={`${domain.verified} of ${domain.total} verified${domain.rejected ? ` · ${domain.rejected} removed` : ""}`}
            collapsible
            headerActions={
              <div className={styles.headerMeta}>
                {clearIds.length > 1 ? (
                  <Tooltip content="Only items read clearly, with no conflict or doubt. Flagged items stay for you to check one by one. You can undo this.">
                    <Button variant="tonal" theme="primary" size="sm" aria-label={`Verify ${clearIds.length} clear items in ${domain.label}`} onClick={() => verifyClear(clearIds, domain.label)}>
                      Verify {clearIds.length} clear
                    </Button>
                  </Tooltip>
                ) : null}
                <Button variant="ghost" theme="neutral" size="sm" aria-label={`${allPicked ? "Select none" : "Select all"} in ${domain.label}`} onClick={() => select(ids, !allPicked)}>
                  {allPicked ? "Select none" : "Select all"}
                </Button>
              </div>
            }
          >
            {groupFindings(items).map(([group, list]) => (
              <div key={group || "all"} className={styles.vGroup}>
                {group ? <h5 className={styles.vGroupTitle}>{group}</h5> : null}
                <ul className={styles.vRows}>
                  {list.map((item) => (
                    <ReviewRow
                      key={item.id}
                      finding={item}
                      bundle={bundle}
                      entry={review[item.id]}
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
                  ))}
                </ul>
              </div>
            ))}
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
              <Button variant="solid" theme="primary" size="sm" onClick={bulkVerify}>Verify</Button>
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
