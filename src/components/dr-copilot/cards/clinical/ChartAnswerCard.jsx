import React, { useCallback, useMemo, useState, useEffect } from "react"

import { cn } from "../../../dr-agent/utils"
import { CardShell } from "../CardShell"
import { TPMedicalIcon } from "../../compat/tp-ui"
import { CopilotIcon } from "../../ui/CopilotIcon"
import {
  iconForIntent,
  markedPhrases,
  parseAnswerMarkdown,
  parseInline,
  resolveIntent,
} from "../../chart-search/answerMarkdown"
import { summariseEvidence, toEvidenceDocument } from "../../chart-search/rxEvidence"
import { useEvidenceViewer } from "../../surfaces/EvidenceViewerContext"
import { EvidenceSection, useEvidenceJump } from "./chart-evidence"
import { useCardStream, useStreamedText } from "../CardStreamContext"

/**
 * A grounded answer from the clinical archive.
 *
 * One card, always - the same boxy shell every other Copilot output wears.
 * What varies is the content, and the content arrives as Markdown in a fixed
 * subset the archive agrees to emit (docs/dr-copilot/answer-markdown-contract.md).
 * That division is the point: the model decides what to say and how it is
 * structured, the portal decides how structure looks, and a new kind of
 * question needs no portal release.
 *
 * The heading in that Markdown is the card's title and chooses its icon. The
 * model's own emphasis is carried through verbatim - `**primary value**` and
 * `==phrase from the record==` - and nothing here promotes, marks or infers on
 * its own. A `==phrase==` does double duty: it is highlighted in the answer,
 * and it is the text lit up inside the prescription when the citation is
 * opened, which is the only reason the citation is worth clicking.
 *
 * The reading order is built for a doctor who will read one line and decide
 * whether to read on: the lede is set a step larger and darker than the body
 * because it is the answer; values the model bolded are set in ink with
 * tabular figures so a dose or a lab value can be found by scanning; and every
 * citation is a visible blue button with a number in it, because the number
 * is the only thing on the card that says "this came from the record, and
 * here is where".
 *
 * Answers from before this contract still arrive as `segments`, and still
 * render, as prose.
 */
export function ChartAnswerCard({ data }) {
  /* Memoised so an answer without citations does not hand every hook below
     a fresh empty array, and so the sidebar can tell this card's set apart. */
  const cited = useMemo(() => (data && data.cited) || [], [data])
  const retrieval = (data && data.retrieval) || {}
  const sections = retrieval.sections || []
  const fullMarkdown = (data && data.markdown) || ""
  /* A fresh answer writes itself in, as it streamed; the evidence below
     waits until the text is complete, because a source list under half a
     sentence reads as finished when it is not. */
  const streaming = useCardStream()
  const { text: markdown, done: written } = useStreamedText(fullMarkdown, streaming)

  const viewer = useEvidenceViewer()
  const { jumpToRecord, evidenceProps } = useEvidenceJump()
  const citeHint = useCitationHint()

  const parsed = useMemo(() => parseAnswerMarkdown(markdown), [markdown])
  const phrases = useMemo(() => markedPhrases(markdown), [markdown])
  const intent = resolveIntent(data && data.intent, parsed.title)
  const summary = useMemo(() => summariseEvidence(cited), [cited])

  /* Every cited row, resolved to the document it opens as. Built once here
     because only this card knows which phrases the model marked, and the
     highlight inside a prescription depends on them. */
  const documents = useMemo(() => {
    const all = (data && data.evidence) || []
    const out = {}
    for (const row of cited) out[row.number] = toEvidenceDocument(row, phrases, all)
    return out
  }, [cited, phrases, data])

  /* A citation opens the whole cited set in the sidebar, scrolled to that
     record. Where no sidebar is mounted - the narrow dock - it expands in
     place instead. Both land on the same record; only the geometry differs. */
  const openEvidence = (number) => {
    citeHint.dismiss()
    if (viewer && viewer.available) {
      viewer.open({ cited, documents, number })
      return
    }
    jumpToRecord(number)
  }

  /* Which citation is open right now, so its marker can show it. The sidebar
     is shared by every answer in the thread, so a number is only "this one"
     when the sidebar is showing this card's own cited set. */
  const activeNumber =
    viewer && viewer.state && viewer.state.cited === cited
      ? viewer.state.activeNumber
      : !(viewer && viewer.available) && evidenceProps.open
        ? evidenceProps.openRow
        : null

  const cite = { onCite: openEvidence, activeNumber }

  const title = parsed.title || "From the record"
  const hasInlineCites = fullMarkdown
    ? /\[\^\d+\]|\[\d+\]\(#evidence-\d+\)/.test(fullMarkdown)
    : ((data && data.segments) || []).some(
        (seg) => seg && seg.citation_numbers && seg.citation_numbers.length
      )

  return (
    <CardShell
      icon={<span />}
      tpIconName={iconForIntent(intent)}
      title={title}
      badge={
        cited.length
          ? {
              /* "Sources", not "cited": the word a doctor uses for "where did
                 this come from". */
              label: `${cited.length} source${cited.length === 1 ? "" : "s"}`,
              bg: "var(--tp-violet-50, #F5F3FF)",
              color: "var(--tp-violet-600, #8A4DBB)",
            }
          : undefined
      }
    >
      {fullMarkdown ? (
        <AnswerBody parsed={parsed} cite={cite} />
      ) : (
        <LegacyProse data={data} cite={cite} />
      )}

      {/* Taught once. A numbered blue box in the middle of a sentence is not
          self-evident to a doctor who has never seen one, so the first answers
          say what it does, in the same shape the marker has. The line goes
          away for good the first time a citation is opened, because by then
          it has done its job and is only noise. */}
      {hasInlineCites && citeHint.visible && (
        <p className="m-0 mt-[12px] flex flex-wrap items-center gap-x-[6px] gap-y-[2px] text-[12px] leading-[18px] text-tp-slate-500">
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-tp-blue-100 px-[4px] text-[10.5px] font-bold leading-none text-tp-blue-700">
            1
          </span>
          <span>Click or tap a number to see the record that line came from.</span>
        </p>
      )}

      {!!cited.length && written && (
        <EvidenceSection
          cited={cited}
          sections={sections}
          summary={summary}
          onOpenRecord={
            viewer && viewer.available
              ? () => openEvidence(cited[0] && cited[0].number)
              : undefined
          }
          {...evidenceProps}
        />
      )}
    </CardShell>
  )
}

/* ── The one-time citation hint ──────────────────────────────────────────── */

const CITE_HINT_KEY = "velora:cite-hint-seen"

/**
 * Whether to show the "tap a number" line.
 *
 * Per-viewer convenience only, so browser storage is the right home: if it is
 * blocked or cleared the worst case is the hint coming back, never a broken
 * card. Every access is guarded because private windows throw on touch.
 */
/* Every answer card on screen hears a dismissal, not only the one clicked:
   once a doctor has opened a citation, the same instruction under the other
   answers above it is noise. The storage event only reaches other tabs, so
   cards in this tab are told through their own event. */
const CITE_HINT_EVENT = "velora:cite-hint-dismissed"

function useCitationHint() {
  const [visible, setVisible] = useState(() => {
    try {
      return window.localStorage.getItem(CITE_HINT_KEY) !== "1"
    } catch (e) {
      return true
    }
  })
  useEffect(() => {
    const hide = () => setVisible(false)
    window.addEventListener(CITE_HINT_EVENT, hide)
    return () => window.removeEventListener(CITE_HINT_EVENT, hide)
  }, [])
  const dismiss = useCallback(() => {
    setVisible(false)
    try {
      window.localStorage.setItem(CITE_HINT_KEY, "1")
    } catch (e) {
      /* Storage unavailable: the hint simply returns next time. */
    }
    window.dispatchEvent(new CustomEvent(CITE_HINT_EVENT))
  }, [])
  return { visible, dismiss }
}

/* ── Rendering the contract ──────────────────────────────────────────────── */

function AnswerBody({ parsed, cite }) {
  return (
    <div>
      {/* The lede is the answer. A doctor who reads only this line should
          have it, so it is a size up and in ink, with the detail beneath it
          stepping back. */}
      {parsed.lede && (
        <p className="m-0 mb-[12px] text-[14px] font-medium leading-[1.55] text-tp-slate-900">
          <Runs runs={parseInline(parsed.lede)} cite={cite} />
        </p>
      )}

      <div className="flex flex-col gap-[10px]">
        {parsed.blocks.map((block, i) => (
          <Block key={i} block={block} cite={cite} first={i === 0} />
        ))}
      </div>
    </div>
  )
}

function Block({ block, cite, first }) {
  if (block.type === "section") return <SectionBar label={block.label} first={first} />

  if (block.type === "paragraph" || block.type === "lede") {
    return (
      <p className="m-0 text-[13px] leading-[1.65] text-tp-slate-700">
        <Runs runs={block.runs} cite={cite} />
      </p>
    )
  }

  if (block.type === "list") {
    return (
      <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
        {block.items.map((runs, i) => (
          <li
            key={i}
            className="flex items-start gap-[8px] text-[13px] leading-[1.65] text-tp-slate-700"
          >
            {/* A drawn dot rather than a bullet glyph: it sits on the first
                line's centre at every font size, and a glyph drifts. */}
            <span
              aria-hidden="true"
              className="mt-[9px] h-[4px] w-[4px] flex-shrink-0 rounded-full bg-tp-slate-400"
            />
            <span className="min-w-0 flex-1">
              <Runs runs={runs} cite={cite} />
            </span>
          </li>
        ))}
      </ul>
    )
  }

  if (block.type === "table") {
    /* A real table with a header band, not floating columns: the contract
       puts the subject in the first column and a value in each of the rest,
       and the eye has to be able to run along a row to the value it wants.
       The first column is set in ink because it names the row. */
    return (
      <div className="overflow-x-auto rounded-[10px] border-[1px] border-tp-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-tp-slate-50">
              {block.head.map((cell, i) => (
                <th
                  key={i}
                  scope="col"
                  className="whitespace-nowrap px-[10px] py-[7px] text-[10.5px] font-semibold uppercase tracking-[0.4px] text-tp-slate-500"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-tp-slate-100 align-top transition-colors duration-[var(--copilot-dur-state)] hover:bg-tp-slate-50 motion-reduce:transition-none"
              >
                {row.map((runs, j) => (
                  <td
                    key={j}
                    className={cn(
                      "px-[10px] py-[8px] text-[13px] leading-[1.5] tabular-nums",
                      j === 0 ? "font-medium text-tp-slate-900" : "text-tp-slate-700",
                    )}
                  >
                    <Runs runs={runs} cite={cite} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (block.type === "facts") {
    /* A handful of labelled values. The value is the thing being looked for,
       so it is the larger, darker half of the chip. */
    return (
      <div className="flex flex-wrap gap-[8px]">
        {block.facts.map((fact, i) => (
          <span
            key={i}
            className="min-w-[88px] rounded-[10px] border-[1px] border-tp-slate-100 bg-tp-slate-50 px-[10px] py-[6px]"
          >
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.4px] text-tp-slate-500">
              {fact.label}
            </span>
            <span className="mt-[2px] block text-[13px] font-semibold tabular-nums text-tp-slate-900">
              <Runs runs={fact.runs} cite={cite} />
            </span>
          </span>
        ))}
      </div>
    )
  }

  /* What the record does not say. Given its own treatment because a limitation
     buried in a paragraph is a limitation the doctor will miss. The label is
     the only word here the portal adds, and it names the box, not the
     content: everything after it is the model's own sentence. Warning tones
     rather than red, because a gap in the record is something to keep in
     mind, not an alarm. */
  if (block.type === "caveat") {
    return (
      <div
        role="note"
        className="flex items-start gap-[8px] rounded-[10px] border-[1px] border-tp-warning-200 bg-tp-warning-50 px-[12px] py-[9px]"
      >
        <CopilotIcon
          name="info-circle"
          variant="bulk"
          size={16}
          color="var(--tp-warning-700, #B45309)"
          className="mt-[1px]"
        />
        <p className="m-0 text-[12.5px] leading-[1.6] text-tp-slate-700">
          <span className="mr-[4px] font-semibold text-tp-warning-800">Note:</span>
          <Runs runs={block.runs} cite={cite} />
        </p>
      </div>
    )
  }

  return null
}

/** The product's own section bar, so a Markdown `##` looks like every other section. */
const SECTION_ICONS = {
  Current: "Tablets",
  Past: "medical-record",
  Changes: "medical-report",
  Latest: "Heart Rate",
  Trend: "Heart Rate Monitor",
  Results: "Lab",
  Flagged: "emergency",
  Active: "Diagnosis",
  Resolved: "Diagnosis",
  Timeline: "medical-record",
  Advice: "medical book",
  "Follow-up": "medical-report",
  Reactions: "mask",
  "Allergy list": "mask",
  Procedures: "stethoscope",
  Documents: "health-file-02",
  Notes: "medical-record",
}

/**
 * A section heading inside the answer, as the design system draws one: a
 * neutral section tag carrying the section's clinical icon and its name,
 * with a hairline running on to the edge so the eye sees where one group of
 * facts ends and the next begins. The points underneath are the content.
 * The icon is matched from the heading's words when the section is not one
 * of the named ones, so "Lab results" gets the lab icon, not a dot.
 */
function SectionBar({ label, first }) {
  const icon = SECTION_ICONS[label] || iconForIntent(resolveIntent(null, label))
  return (
    <div className={cn("flex items-center gap-[8px]", !first && "mt-[8px]")}>
      <span className="inline-flex h-[26px] flex-shrink-0 items-center gap-[6px] rounded-[8px] bg-tp-slate-100 pl-[7px] pr-[9px] text-[12.5px] font-semibold text-tp-slate-700">
        {icon && (
          <span aria-hidden="true" className="flex flex-shrink-0">
            <TPMedicalIcon name={icon} variant="bulk" size={15} color="var(--tp-slate-600, #545460)" />
          </span>
        )}
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-tp-slate-100" />
    </div>
  )
}

/**
 * Inline runs.
 *
 * `strong` is the value that answers the question; `mark` is the phrase as it
 * appears in the record, and is highlighted the same yellow it will be
 * highlighted in the prescription, so the two read as the same act.
 */
function Runs({ runs, cite }) {
  return (
    <>
      {runs.map((run, i) => {
        if (run.type === "strong") {
          /* Tabular figures so "7.2 %" and "140/90" line up and scan as
             numbers rather than words. */
          return (
            <strong key={i} className="font-semibold tabular-nums text-tp-slate-900">
              <Runs runs={run.children} cite={cite} />
            </strong>
          )
        }
        if (run.type === "mark") {
          /* Not yellow here. Yellow means one thing in this product - "these
             are the words as they appear in the source document" - and it
             earns that meaning by being used only inside the record the
             citation opens. Highlighting the same phrase in the answer as well
             spends the signal before the doctor gets to the proof. In the
             answer the marked phrase is just set in ink. */
          return (
            <span key={i} className="font-medium text-tp-slate-900">
              <Runs runs={run.children} cite={cite} />
            </span>
          )
        }
        if (run.type === "cite") {
          return (
            <Citation
              key={i}
              number={run.number}
              onOpen={cite.onCite}
              active={cite.activeNumber === run.number}
            />
          )
        }
        return <React.Fragment key={i}>{run.text}</React.Fragment>
      })}
    </>
  )
}

/**
 * The citation marker: a numbered button that opens the record a claim came
 * from.
 *
 * Built to be found and pressed by someone who has never seen a footnote in
 * software. It has a visible edge and fill at rest, so it never reads as part
 * of the sentence; it darkens on hover and nudges in on press, so it plainly
 * responds; and the one whose record is open right now is filled solid, so
 * after checking a source the doctor can see which line they checked. The
 * visible box is small to keep the sentence readable, but the press target
 * reaches past it on every side.
 */
export function Citation({ number, onOpen, active }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(number)}
      aria-label={`Source ${number}. Open the record this came from`}
      aria-pressed={active}
      title="Open the record this came from"
      className={cn(
        /* Tonal, no outline: a tinted chip with the number in it. */
        /* pt-[1px]: the digits sit high in the font's line box (its
           descent is empty for numerals), so the box nudges them to its
           optical centre. */
        "relative mx-[2px] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] px-[4px] pt-[1px] align-[1px] text-[10.5px] font-bold leading-none tabular-nums",
        "after:absolute after:-inset-x-[2px] after:-inset-y-[6px] after:content-['']",
        "transition-[background-color,border-color,color,transform] duration-[var(--copilot-dur-state)] ease-out active:scale-[0.92]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
        "motion-reduce:transition-none motion-reduce:active:scale-100",
        active
          ? "bg-tp-blue-500 text-white"
          : "bg-tp-blue-100 text-tp-blue-700 hover:bg-tp-blue-200 hover:text-tp-blue-800",
      )}
    >
      {number}
    </button>
  )
}

/**
 * Answers from before the Markdown contract.
 *
 * Kept so the panel keeps working against an archive that has not been taught
 * the format yet. Deliberately plain - there is no structure to draw on.
 */
function LegacyProse({ data, cite }) {
  const segments = (data && data.segments) || []
  const lines = segments.length
    ? segments
    : [{ text: (data && data.text) || "No answer came back for this question.", citation_numbers: [] }]

  return (
    <div className="text-[13px] leading-[1.65] text-tp-slate-700">
      {lines.map((seg, i) => (
        <p key={i} className="mb-[8px] last:mb-0">
          {seg.text}{" "}
          {(seg.citation_numbers || []).map((n) => (
            <Citation
              key={n}
              number={n}
              onOpen={cite.onCite}
              active={cite.activeNumber === n}
            />
          ))}
        </p>
      ))}
    </div>
  )
}

export { CopilotIcon }
