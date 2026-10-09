import React, { useCallback, useEffect, useRef, useState } from "react"

import { CopilotIcon } from "../../ui/CopilotIcon"

/**
 * The evidence layer, shared by every Chart Search answer.
 *
 * Whichever card an answer is rendered as - a medication history, a vitals
 * table, a timeline, or the generic fallback - the proof underneath it looks
 * and behaves the same way, because it is the same code. That matters more
 * than it sounds: the doctor learns the citation gesture once.
 *
 * Colour carries meaning here and is not decorative:
 *   blue    - anything the doctor can act on. Citation tags are buttons, so
 *             they are blue, and clicking one opens the record it points at,
 *             scrolls to it and marks it.
 *   neutral - the evidence itself. It is the record, stated plainly; tinting
 *             it would imply an emphasis the archive never gave it.
 *   violet  - informative tags only.
 */

/**
 * Wiring for "clicking a citation lands you on its record".
 *
 * Held here rather than in each card because the state is shared between two
 * halves that can sit in different components: the tag that was clicked, and
 * the list that has to open, scroll and flash.
 */
export function useEvidenceJump() {
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [openRow, setOpenRow] = useState(null)
  const [flashed, setFlashed] = useState(null)
  const rowRefs = useRef({})

  const jumpToRecord = useCallback((number) => {
    setEvidenceOpen(true)
    setOpenRow(number)
    setFlashed(number)
  }, [])

  useEffect(() => {
    if (flashed == null) return undefined
    const frame = requestAnimationFrame(() => {
      const el = rowRefs.current[flashed]
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    })
    const timer = setTimeout(() => setFlashed(null), 1900)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [flashed])

  return {
    jumpToRecord,
    evidenceProps: {
      open: evidenceOpen,
      onToggle: () => setEvidenceOpen((v) => !v),
      openRow,
      onToggleRow: (n) => setOpenRow((current) => (current === n ? null : n)),
      flashed,
      rowRefs,
    },
  }
}


/* ── The footnotes ───────────────────────────────────────────────────────── */

/**
 * Inside the answer card, below a rule: the records the claims were read from.
 *
 * Collapsed by default, and deliberately grey. This is the raw record, and
 * colouring it would put an emphasis on it that the archive never gave.
 */
export function EvidenceSection({
  cited,
  sections,
  open,
  onToggle,
  openRow,
  onToggleRow,
  flashed,
  rowRefs,
  attached = false,
  summary,
  onOpenRecord,
}) {
  /* The doorway to the proof.

     A quiet neutral panel rather than a raised card: it sits under the answer
     and belongs to it, and a border plus a shadow made it read as a second
     card competing with the first. The tint alone is enough to say "pressable"
     once the label and the arrow are doing their work.

     Two lines: what it is and where it goes on the first, the shape of what is
     behind it on the second. The tags were competing with the label for the
     same line, and losing. */
  const clickable = !!onOpenRecord

  return (
    <div className={attached ? "-mt-[1px] w-full px-3 pb-[10px]" : "mt-[11px]"}>
      <button
        type="button"
        onClick={onOpenRecord || onToggle}
        aria-expanded={clickable ? undefined : open}
        /* Neutral: this is the record, stated plainly. White tags on the
           grey panel stay distinct at rest and on the darker hover. */
        className="group/ev flex w-full flex-col gap-[7px] rounded-[12px] bg-tp-slate-50 px-[11px] py-[10px] text-left transition-colors hover:bg-tp-slate-100"
      >
        <span className="flex w-full items-center gap-[8px]">
          {/* No icon. The word is the label, and a tile beside it was
              competing with the card above for the same attention. */}
          <span className="text-[12.5px] font-semibold text-tp-slate-800">Evidence</span>
          <span className="flex-1" />
          <span className="flex flex-shrink-0 items-center gap-[4px] text-[11.5px] font-semibold text-tp-blue-600">
            {clickable ? "View records" : open ? "Hide" : "Show"}
            {clickable ? (
              <CopilotIcon name="chevron-right" variant="linear" size={13} />
            ) : (
              <Caret open={open} />
            )}
          </span>
        </span>

        {/* The shape of what is behind the door: how many records, across how
            many visits, over what span, of what kind. A bare count does not
            tell a doctor whether opening it is worth the interruption. */}
        <span className="flex flex-wrap items-center gap-[4px]">
          <MetaTag icon="clipboard">
            {counted(summary ? summary.records : cited.length, "record")}
          </MetaTag>
          {!!(summary && summary.visits) && (
            <MetaTag icon="ai-hospital">{counted(summary.visits, "visit")}</MetaTag>
          )}
          {!!(summary && summary.from) && (
            <MetaTag icon="calendar">{span(summary.from, summary.to)}</MetaTag>
          )}
          {(summary ? summary.kinds : sections).slice(0, 2).map((kind) => (
            <MetaTag key={kind} icon="document-text" tone="kind">
              {prettyKind(kind)}
            </MetaTag>
          ))}
        </span>
      </button>

      {open && !onOpenRecord && (
        <ol className="m-0 mt-[8px] flex list-none flex-col gap-[6px] p-0">
          {cited.map((row) => (
            <EvidenceRow
              key={row.number}
              row={row}
              open={openRow === row.number}
              flashed={flashed === row.number}
              onToggle={() =>
                onOpenRecord ? onOpenRecord(row) : onToggleRow(row.number)
              }
              innerRef={(el) => {
                rowRefs.current[row.number] = el
              }}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function EvidenceRow({ row, open, flashed, onToggle, innerRef }) {
  const { number, citation, evidence } = row

  const value =
    evidence && evidence.value_num != null
      ? `${evidence.value_num}${evidence.unit ? ` ${evidence.unit}` : ""}`
      : (evidence && evidence.value_text) || ""

  const title = (evidence && evidence.code) || citation.section || citation.resource_kind
  const lane = evidence && evidence.lane

  return (
    <li
      ref={innerRef}
      className={`overflow-hidden rounded-[10px] border-[1px] bg-white transition-all duration-300 ${
        flashed
          ? "border-tp-blue-300 shadow-[0_0_0_3px_var(--tp-blue-50,rgba(75,74,213,0.08))]"
          : "border-tp-slate-100"
      }`}
    >
      {/* The header carries what identifies a record before it is opened: which
          citation it answers, what it is, when it happened and which visit it
          belongs to. Wraps rather than truncates, because in a 350px dock those
          tags are the difference between a list and a lookup. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-[9px] bg-tp-slate-50 px-[10px] py-[8px] text-left transition-colors hover:bg-tp-slate-100"
      >
        <span
          className={`mt-[1px] flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold text-white transition-colors ${
            flashed ? "bg-tp-blue-500" : "bg-tp-slate-500"
          }`}
        >
          {number}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold text-tp-slate-800">
            {title}
          </span>
          <span className="mt-[4px] flex flex-wrap items-center gap-[4px]">
            {citation.event_date && (
              <MetaTag icon="calendar">{citation.event_date}</MetaTag>
            )}
            {citation.resource_kind && (
              <MetaTag icon="document-text" tone="kind">
                {citation.resource_kind}
              </MetaTag>
            )}
            {citation.visit_id && (
              <MetaTag icon="clipboard">Visit {citation.visit_id}</MetaTag>
            )}
            {lane && (
              <MetaTag icon="ai-search" tone="match">
                {lane}
              </MetaTag>
            )}
          </span>
        </span>

        <span className="mt-[3px] flex-shrink-0 text-tp-slate-400">
          <Caret open={open} />
        </span>
      </button>

      {open && (
        <div className="px-[10px] py-[9px]">
          <div className="flex flex-wrap gap-[6px]">
            {value && <Fact label="Value" value={value} />}
            {evidence && evidence.status && <Fact label="Status" value={evidence.status} />}
            {citation.resource_kind && <Fact label="Record" value={citation.resource_kind} />}
            {citation.visit_id && <Fact label="Visit" value={citation.visit_id} />}
            {/* No reference range: the archive returns none on any resource
                kind, and a guessed range beside a real value would undo the
                point of citing it at all. */}
          </div>

          <dl className="mt-[9px] grid grid-cols-[72px_1fr] gap-x-[10px] gap-y-[4px] border-t border-dashed border-tp-slate-200 pt-[8px] text-[11px]">
            <SourceItem label="System" value={evidence && evidence.source_system} />
            <SourceItem label="Table" value={evidence && evidence.source_table} />
            <SourceItem label="Record id" value={evidence && evidence.source_key} />
            <SourceItem label="Recorded" value={evidence && evidence.event_at} />
            <SourceItem label="Path" value={citation.source_path} />
            <SourceItem label="Provenance" value={citation.provenance} />
          </dl>
        </div>
      )}
    </li>
  )
}

/** A bordered chip: small muted label, the value beneath it in ink. */
function Fact({ label, value }) {
  return (
    <span className="rounded-[8px] border-[1px] border-tp-slate-100 bg-tp-slate-50 px-[9px] py-[5px]">
      <span className="block text-[9.5px] font-semibold uppercase tracking-[0.4px] text-tp-slate-400">
        {label}
      </span>
      <span className="mt-[1px] block text-[12px] font-semibold text-tp-slate-800">{value}</span>
    </span>
  )
}

function SourceItem({ label, value }) {
  if (value == null || value === "") return null
  return (
    <>
      <dt className="text-tp-slate-400">{label}</dt>
      <dd className="m-0 break-words text-tp-slate-700">{String(value)}</dd>
    </>
  )
}

/** "3 records", "1 visit" - pluralised where it matters and nowhere else. */
function counted(n, noun) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`
}

/** A single date, or the span the records cover. */
function span(from, to) {
  return !to || from === to ? prettyDate(from) : `${prettyDate(from)} to ${prettyDate(to)}`
}

/* "2026-07-30" as "30 Jul 2026", the way dates read everywhere else. */
function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""))
  if (!m) return iso
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`
}

/* "lab_result" as "Lab result": record kinds arrive as codes. */
function prettyKind(kind) {
  const text = String(kind || "").replace(/[_-]+/g, " ").trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

/**
 * A tone tag: tinted fill, no stroke, an icon that says what kind of fact it
 * is. Strokes on tags this small read as boxes rather than labels, and four of
 * them in a row turns a header into a grid.
 */
/* Every tag is white on the grey panel, one neutral tone: a tinted tag on a
   tinted panel vanished the moment the panel's hover tint matched it. */
const TAG_TONES = {
  neutral: "bg-white text-tp-slate-600",
  kind: "bg-white text-tp-slate-600",
  match: "bg-white text-tp-violet-600",
}

function MetaTag({ children, icon, tone = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center gap-[4px] rounded-[6px] px-[6px] py-[3px] text-[10px] font-semibold leading-[12px] ${
        TAG_TONES[tone] || TAG_TONES.neutral
      }`}
    >
      {icon && <CopilotIcon name={icon} variant="bulk" size={11} />}
      {children}
    </span>
  )
}

/** The accordion mark: points down when closed, up when open. */
function Caret({ open }) {
  return (
    <span
      className="inline-flex"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }}
    >
      <CopilotIcon name="arrow-down2" variant="linear" size={13} />
    </span>
  )
}

