import React, { useMemo, useState } from "react"
import { cn } from "../../../dr-agent/utils"
import { CopilotIcon } from "../../ui/CopilotIcon"
import { CardShell } from "../CardShell"
import { useCardStream } from "../CardStreamContext"
import { useEvidenceViewer } from "../../surfaces/EvidenceViewerContext"
import { summariseEvidence, toEvidenceDocument } from "../../chart-search/rxEvidence"
import { EvidenceSection, useEvidenceJump } from "./chart-evidence"
import { Citation } from "./ChartAnswerCard"

/**
 * The answer to a hospital-wide question: the patients it found, and why.
 *
 * Each row reads the way the doctor decides:
 *
 *   who      the name, then (58y | M | PAT1001 | mobile) on one line, so two
 *            patients with one name are told apart without opening either
 *   why      directly beneath, the recorded fact that matched, value darker
 *            than its label, with the date it was recorded as a tag and the
 *            numbered citation that opens its source in the evidence viewer,
 *            exactly as a chart answer cites
 *
 * The way in is a chevron at the row's end and the whole row: a list of
 * twenty "Open chart" buttons shouted over the facts they sat beside, and a
 * row that opens wherever it is clicked is the pattern every list in the
 * portal already teaches. The chevron stays a real, labelled button for
 * keyboard and screen readers.
 *
 * The title says how many; the footer speaks only when the search
 * stopped short or some patients could not be judged.
 */

const SEX = { M: "M", MALE: "M", F: "F", FEMALE: "F", O: "O", OTHER: "O" }

/* Age and sex for the bracket beside the name; whichever is known. */
function ageSex(p) {
  const age = p.age ?? p.patientAge ?? p.ageYears
  const sexRaw = String(p.gender ?? p.sex ?? p.patientGender ?? "").trim().toUpperCase()
  const sex = SEX[sexRaw] || null
  return [age != null && age !== "" ? `${age}y` : null, sex].filter(Boolean)
}

/* The ID the portal shows a doctor, falling back to the service's own. */
function patientIdOf(p) {
  return p.patientId || p.pid || p.patientUid || ""
}

/* The value without its label said twice: the service sends "Latest HbA1c"
   and "HbA1c 8.1%", and the row should read "Latest HbA1c: 8.1%". Only a
   leading word the label already contains is dropped, so a value that is
   all words ("Type 2 diabetes mellitus") is left whole. */
function valueOf(fact) {
  const text = String(fact.text || "").trim()
  const label = String(fact.label || "").toLowerCase()
  const m = /^([A-Za-z][\w-]*)\s*:?\s+(.+)$/.exec(text)
  if (m && label && label.split(/\s+/).includes(m[1].toLowerCase()) && /\d/.test(m[2])) return m[2]
  return text
}

/* Only what the header's count does not already say: that the search
   stopped short, or that some patients could not be judged at all. */
function caveat(scope) {
  if (!scope) return null
  const parts = []
  if (scope.additional_candidates_unchecked || scope.more_candidates) {
    parts.push("Some patients were not checked yet, so there may be more than these.")
  }
  if (scope.unknown_patient_count > 0) {
    const n = scope.unknown_patient_count
    parts.push(`${n} ${n === 1 ? "patient" : "patients"} could not be judged from the recorded measurements.`)
  }
  return parts.length ? parts.join(" ") : null
}

export function PatientMatchesCard({ data, onOpenPatient, onAction }) {
  const patients = (data && data.patients) || []
  const scope = (data && data.resultScope) || null
  const actions = (data && data.actions) || []
  const more = actions.find((a) => a && a.id === "discovery_more")
  const cited = useMemo(() => (data && data.cited) || [], [data])
  const streaming = useCardStream()
  /* Past a handful of patients the list gets a search of its own: by name,
     patient ID or mobile number, so the one the doctor is after is found
     without reading twenty rows. */
  const [query, setQuery] = useState("")

  const viewer = useEvidenceViewer()
  const { jumpToRecord, evidenceProps } = useEvidenceJump()
  const summary = useMemo(() => summariseEvidence(cited), [cited])
  const documents = useMemo(() => {
    const all = (data && data.evidence) || []
    const out = {}
    for (const row of cited) out[row.number] = toEvidenceDocument(row, [], all)
    return out
  }, [cited, data])
  const numberOf = useMemo(() => {
    const map = new Map()
    for (const row of cited) map.set(row.sourceRef, row.number)
    return map
  }, [cited])

  if (!patients.length) return null

  const searchable = patients.length > SEARCH_AFTER
  const q = query.trim().toLowerCase()
  const digits = q.replace(/\D/g, "")
  const visible = !searchable || !q
    ? patients
    : patients.filter((p) => {
        const name = String(p.patientName || "").toLowerCase()
        const id = String(patientIdOf(p)).toLowerCase()
        const phone = String(p.phone || p.mobile || p.pm_contact_no || "")
        return name.includes(q) || id.includes(q) || (digits.length >= 4 && phone.includes(digits))
      })

  /* Opening a patient asks the question this list was about, for that one
     patient, so their chat opens on the answer rather than on an empty
     welcome screen. */
  const open = (p) => onOpenPatient && onOpenPatient({ ...p, askAbout: questionFor(p) })
  const openEvidence = (number) => {
    if (viewer && viewer.available) {
      viewer.open({ cited, documents, number })
      return
    }
    jumpToRecord(number)
  }
  const activeNumber =
    viewer && viewer.state && viewer.state.cited === cited ? viewer.state.activeNumber : null

  const note = caveat(scope)

  return (
    <>
    {/* Asked from inside one patient's chat: said before the card, as a
        warning-toned tag, so a list in Kavita's chat is not read as being
        about Kavita. Opening a patient below moves to that patient's chat. */}
    {data && data.askedFrom && (
      <p className="m-0 mb-[14px] flex w-fit max-w-full items-start gap-[8px] rounded-[10px] bg-tp-warning-50 px-[10px] py-[7px] text-[12.5px] leading-[18px] text-tp-warning-800">
        <CopilotIcon name="info-circle" variant="linear" size={15} className="mt-[1px] shrink-0 text-tp-warning-600" />
        <span>
          This answer is based on{" "}
          <strong className="font-semibold">{data.group === "mine" ? "all your patients" : "all hospital patients"}</strong>, not only{" "}
          <strong className="font-semibold">{data.askedFrom}&apos;s patient context</strong>.
        </span>
      </p>
    )}
    <CardShell
      icon={<CopilotIcon name="profile-2user" variant="bulk" size={18} />}
      /* The count is the title: "3 patients found" says it once, where a
         title plus a "3 patients" badge said it twice. */
      title={`${patients.length} ${patients.length === 1 ? "patient" : "patients"} found`}
      date={data && data.group === "mine" ? "Across all your patients" : "Across all hospital patients"}
      collapsible
    >
      {searchable && (
        <div className="flex items-center gap-[10px] border-b border-tp-slate-100 px-[14px] py-[10px]">
          <label className="copilot-context-search flex h-[36px] min-w-0 flex-1 items-center gap-[8px] rounded-[10px] border-[1px] border-tp-slate-200 bg-white px-[10px]">
            <span className="flex shrink-0 items-center text-tp-slate-500">
              <CopilotIcon name="search-normal" variant="linear" size={15} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient name, patient ID or mobile number"
              aria-label="Search these patients"
              className="h-full w-full min-w-0 bg-transparent text-[13px] text-tp-slate-800 outline-none placeholder:text-tp-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-tp-slate-500 hover:bg-tp-slate-100 hover:text-tp-slate-700"
              >
                <CopilotIcon name="close-circle" variant="linear" size={14} />
              </button>
            )}
          </label>
          <span className="shrink-0 text-[12px] tabular-nums text-tp-slate-500" aria-live="polite">
            {q ? `${visible.length} of ${patients.length}` : `${patients.length} patients`}
          </span>
        </div>
      )}

      {searchable && q && !visible.length && (
        <p className="m-0 px-[14px] py-[16px] text-center text-[12.5px] text-tp-slate-500">
          No patient in this list matches &ldquo;{query.trim()}&rdquo;.
        </p>
      )}

      <ul className="m-0 flex list-none flex-col p-0">
        {visible.map((p, rowIndex) => {
          const facts = Array.isArray(p.facts) && p.facts.length ? p.facts : null
          const name = p.patientName || p.patientUid
          const pid = patientIdOf(p)
          /* Mobile too: the list's search matches on it, so it should be
             visible where the match is checked. */
          const idParts = [...ageSex(p), pid, p.phone || p.mobile || null].filter(Boolean)
          const facts3 = idParts.length ? idParts : null
          /* A patient with no per-fact source still names its records. */
          const looseRefs = !facts && Array.isArray(p.source_refs) ? p.source_refs : []
          return (
            <li
              key={p.patientUid}
              onClick={() => open(p)}
              style={streaming ? { animationDelay: `${120 + rowIndex * 90}ms` } : undefined}
              className={cn(
                "group/row flex cursor-pointer items-center gap-[12px] border-b border-tp-slate-100 px-[14px] py-[12px] transition-colors duration-[var(--copilot-dur-state)] last:border-b-0 hover:bg-tp-slate-50 motion-reduce:transition-none",
                streaming && "copilot-row-stream",
              )}
            >
              <span
                aria-hidden="true"
                className="flex h-[36px] w-[36px] shrink-0 items-center justify-center self-start rounded-full bg-tp-slate-100 text-tp-slate-500 transition-colors duration-[var(--copilot-dur-state)] group-hover/row:bg-tp-blue-50 group-hover/row:text-tp-blue-600 motion-reduce:transition-none"
              >
                <CopilotIcon asset="users/user" variant="bulk" size={18} />
              </span>

              <div className="min-w-0 flex-1">
                {/* Who, on one line: the name, then (58y | M | PAT1001). */}
                <div className="flex min-w-0 items-baseline gap-[6px] leading-[20px]" title={facts3 ? `${name} (${facts3.join(" | ")})` : name}>
                  <span className="truncate text-[14px] font-semibold text-tp-slate-900">{name}</span>
                  {facts3 && (
                    <span className="shrink-0 text-[13px] tabular-nums text-tp-slate-500">
                      (
                      {facts3.map((part, i) => (
                        <React.Fragment key={part}>
                          {i > 0 && <span className="mx-[5px] text-tp-slate-300">|</span>}
                          {part}
                        </React.Fragment>
                      ))}
                      )
                    </span>
                  )}
                </div>

                {(facts || p.reason) && (
                  <FactLines
                    facts={facts}
                    reason={p.reason}
                    looseRefs={looseRefs}
                    numberOf={numberOf}
                    activeNumber={activeNumber}
                    onOpen={openEvidence}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  open(p)
                }}
                aria-label={`Open ${name}'s chat`}
                title={`Ask about ${name}`}
                className={cn(
                  "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-tp-slate-400",
                  "transition-[background-color,color,transform] duration-[var(--copilot-dur-state)] ease-out group-hover/row:bg-tp-blue-50 group-hover/row:text-tp-blue-600 hover:bg-tp-blue-100 active:scale-[0.94]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
                  "motion-reduce:transition-none motion-reduce:active:scale-100",
                )}
              >
                <CopilotIcon name="chevron-right" variant="linear" size={16} />
              </button>
            </li>
          )
        })}
      </ul>

      {(note || more) && (
        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px] border-t border-tp-slate-200 bg-tp-slate-50 px-[14px] py-[8px]">
          {note && (
            <span className="inline-flex min-w-0 flex-1 items-start gap-[6px] text-[12px] leading-[17px] text-tp-slate-600">
              <CopilotIcon name="info-circle" variant="linear" size={14} className="mt-[1px] shrink-0 text-tp-slate-500" />
              {note}
            </span>
          )}
          {more && (
            <button
              type="button"
              onClick={() => onAction && onAction(more)}
              className={cn(
                "ml-auto inline-flex h-[32px] shrink-0 items-center gap-[4px] rounded-[10px] border-[1px] border-tp-blue-200 bg-white pl-[12px] pr-[8px] text-[12.5px] font-semibold text-tp-blue-600",
                "transition-[background-color,border-color,transform] duration-[var(--copilot-dur-state)] ease-out hover:border-tp-blue-300 hover:bg-tp-blue-50 active:scale-[0.97]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
                "motion-reduce:transition-none motion-reduce:active:scale-100",
              )}
            >
              {more.label || "Show more patients"}
              <CopilotIcon name="chevron-down" variant="linear" size={14} />
            </button>
          )}
        </div>
      )}

      {/* The same doorway to the proof every chart answer has. */}
      {!!cited.length && (
        <div className="px-[14px] pb-[12px]">
          <EvidenceSection
            cited={cited}
            sections={[]}
            summary={summary}
            onOpenRecord={viewer && viewer.available ? () => openEvidence(cited[0].number) : undefined}
            {...evidenceProps}
          />
        </div>
      )}
    </CardShell>
    </>
  )
}

/* The list's finding turned into a question about one patient: an HbA1c
   list opens on "What is Anjali's latest HbA1c?", not a broader lab
   question. */
function questionFor(p) {
  const first = String(p.patientName || "").trim().split(/\s+/)[0] || "this patient"
  const facts = Array.isArray(p.facts) ? p.facts : []
  /* The finding itself, in the list's own words: "Latest HbA1c" asks for
     the latest HbA1c, "Latest BP" for the latest BP, "Diagnosis" for the
     diagnosis. Only the leading capital is softened ("latest HbA1c"). */
  const label = String((facts[0] && facts[0].label) || "").trim()
  if (label) {
    const topic = label.charAt(0).toLowerCase() + label.slice(1)
    return `What is ${first}'s ${topic}?`
  }
  return `Summarise ${first}'s record.`
}

/* Lists longer than this get a search box. */
const SEARCH_AFTER = 5

/* How many findings a row shows before "+N more": enough for a compound
   question (a diagnosis and a value), short enough to scan twenty rows. */
const FACTS_SHOWN = 3

/**
 * Why a patient is on the list, one line per recorded finding.
 *
 * The heading (who) stays the same whatever was asked; this part changes
 * with the question, so the finding leads and its proof trails it on the
 * same line: what was found, then a pale date tag, then the citation.
 *
 *   Latest HbA1c: 8.1%  [12 Aug 2026] [1]
 *   Diagnosis: Type 2 diabetes mellitus  [11 Mar 2019] [2]
 *
 * A compound question gives a line per criterion; past three the rest fold
 * behind "+N more". A finding with no date simply has none. A patient the
 * service explains only in prose gets that sentence with its sources.
 */
function FactLines({ facts, reason, looseRefs, numberOf, activeNumber, onOpen }) {
  const [all, setAll] = useState(false)

  if (!facts) {
    const refs = (looseRefs || []).filter((r) => numberOf.has(r))
    return (
      <p className="m-0 mt-[6px] text-[13.5px] leading-[20px] text-tp-slate-700">
        {reason}
        {refs.map((r) => (
          <span key={r} onClick={(e) => e.stopPropagation()} className="ml-[4px] inline-flex align-middle">
            <Citation number={numberOf.get(r)} active={activeNumber === numberOf.get(r)} onOpen={onOpen} />
          </span>
        ))}
      </p>
    )
  }

  const shown = all ? facts : facts.slice(0, FACTS_SHOWN)
  const hidden = facts.length - shown.length

  return (
    <div className="mt-[6px] flex flex-col gap-[6px]">
      {shown.map((f, i) => {
        const n = numberOf.get(f.source_ref)
        return (
          <p
            key={f.source_ref || i}
            className="m-0 flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-[13.5px] leading-[20px] text-tp-slate-600"
          >
            <span className="min-w-0">
              {f.label ? <span className="text-tp-slate-500">{f.label}: </span> : null}
              {/* The finding itself, darker and at medium weight so the eye
                  lands on it first. */}
              <span className="font-medium tabular-nums text-tp-slate-900">{valueOf(f)}</span>
            </span>
            {/* At the end of the line: when it was recorded, as a tag, and
                the record it came from beside it. */}
            {f.date && (
              /* Neutral, and a shade deeper while the row is hovered so it
                 never melts into the row's own hover tint. */
              <span className="inline-flex h-[22px] items-center gap-[4px] whitespace-nowrap rounded-[6px] bg-tp-slate-100 px-[7px] text-[12px] tabular-nums text-tp-slate-600 transition-colors duration-[var(--copilot-dur-state)] group-hover/row:bg-tp-slate-200">
                <CopilotIcon name="calendar-1" variant="linear" size={12} />
                {f.date}
              </span>
            )}
            {n != null && (
              <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                <Citation number={n} active={activeNumber === n} onOpen={onOpen} />
              </span>
            )}
          </p>
        )
      })}
      {(hidden > 0 || all) && facts.length > FACTS_SHOWN && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setAll((v) => !v)
          }}
          className="self-start rounded-[6px] px-[2px] text-[12px] font-semibold text-tp-blue-600 hover:text-tp-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-tp-blue-500"
        >
          {all ? "Show fewer" : `+${hidden} more ${hidden === 1 ? "finding" : "findings"}`}
        </button>
      )}
    </div>
  )
}
