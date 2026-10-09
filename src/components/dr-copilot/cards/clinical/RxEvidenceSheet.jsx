import React from "react"

import { TPMedicalIcon } from "../../compat/tp-ui"
import { parseMedicationLine, parseVitalsLine } from "../../chart-search/rxNarrative"

/**
 * The consultation, as it was written.
 *
 * This is the payoff of the citation mechanism. A row of provenance fields -
 * system, table, record id - proves the answer came from somewhere, but it
 * does not feel like proof, because it is not what the doctor wrote. Their own
 * prescription, in the clinic's print order, with their own words lit up in
 * it, is. They recognise it before they have finished reading it.
 *
 * Sections come from the record, not from a template: whatever the archive's
 * narrative contains is what is drawn, in print order. Medication gets a
 * table, vitals get chips, everything else is a list. An unfamiliar section
 * still renders, under its own name.
 */
export function RxEvidenceSheet({ document: doc }) {
  if (!doc) return null

  const { visit, highlight, sections, title, viaVisit } = doc

  return (
    <div className="overflow-hidden rounded-[12px] border-[1px] border-tp-slate-200 bg-white">
      <div className="border-b border-tp-slate-200 bg-tp-slate-50 px-[14px] py-[9px]">
        <div className="text-[12.5px] font-semibold text-tp-slate-800">
          {title || "Consultation"}
        </div>
        <div className="mt-[3px] flex flex-wrap items-center gap-x-[14px] gap-y-[2px] text-[11px]">
          <Meta label="Visit" value={visit.id} />
          <Meta label="Date" value={visit.date} />
          {visit.lane && <Meta label="Lane" value={visit.lane} />}
        </div>
      </div>

      <div className="flex flex-col gap-[10px] px-[14px] py-[12px]">
        {(sections || []).map((section) => (
          <Section key={section.label} section={section} highlight={highlight} />
        ))}
        {!(sections || []).length && (
          <p className="m-0 text-[12px] text-tp-slate-400">
            This record carries no narrative.
          </p>
        )}
      </div>

      {viaVisit && (
        <div className="border-t border-tp-slate-100 bg-tp-slate-50 px-[14px] py-[8px] text-[10.5px] leading-[1.5] text-tp-slate-500">
          This is the consultation the cited reading was recorded at. The
          reading itself is the row highlighted above.
        </div>
      )}
    </div>
  )
}

function Section({ section, highlight }) {
  const { label, items, text } = section

  if (label === "Medication") {
    const meds = items.map(parseMedicationLine)
    return (
      <div>
        <SectionBar label={label} />
        <div className="overflow-hidden rounded-[8px] border-[1px] border-tp-slate-100">
          <div className="grid grid-cols-[1.7fr_0.7fr_0.9fr] gap-[1px] bg-tp-slate-100 px-[8px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.3px] text-tp-slate-500">
            <span>Medicine</span>
            <span>Dose</span>
            <span>Duration</span>
          </div>
          {meds.map((med, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1.7fr_0.7fr_0.9fr] gap-[1px] px-[8px] py-[7px] text-[12px] ${
                i % 2 ? "bg-tp-slate-50" : "bg-white"
              }`}
            >
              <span className="font-medium text-tp-slate-800">
                <Highlighted text={med.name} phrase={highlight} />
              </span>
              <span className="text-tp-slate-600">{med.dose || "—"}</span>
              <span className="text-tp-slate-600">{med.duration || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (label === "Vitals") {
    const readings = items.flatMap(parseVitalsLine)
    return (
      <div>
        <SectionBar label={label} />
        <div className="flex flex-wrap gap-[6px]">
          {readings.map((reading, i) => (
            <span
              key={i}
              className="rounded-[8px] border-[1px] border-tp-slate-100 bg-tp-slate-50 px-[9px] py-[5px]"
            >
              <span className="block text-[9.5px] font-semibold uppercase tracking-[0.4px] text-tp-slate-400">
                {reading.label}
              </span>
              <span className="mt-[1px] block text-[12px] font-semibold text-tp-slate-800">
                <Highlighted text={reading.value || "—"} phrase={highlight} />
              </span>
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionBar label={label} />
      {!!items.length && (
        <ul className="m-0 flex list-none flex-col gap-[2px] p-0">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-[6px] text-[12px] leading-[1.65] text-tp-slate-700"
            >
              <span className="mt-[1px] flex-shrink-0 text-tp-slate-300">&bull;</span>
              <span className="flex-1">
                <Highlighted text={item} phrase={highlight} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {text && (
        <p className="m-0 mt-[3px] whitespace-pre-wrap text-[12px] leading-[1.65] text-tp-slate-600">
          <Highlighted text={text} phrase={highlight} />
        </p>
      )}
    </div>
  )
}

/* The product's own section bar, so the sheet reads as part of the app rather
   than as a document viewer bolted onto it. */
const SECTION_ICONS = {
  Symptoms: "Virus",
  Examination: "stethoscope",
  Diagnosis: "Diagnosis",
  Medication: "Tablets",
  Investigations: "test-tube-02",
  Advice: "medical book",
  "Follow-up": "medical-report",
  Vitals: "Heart Rate",
  "Medical history": "medical-record",
  Notes: "medical-record",
}

function SectionBar({ label }) {
  const name = SECTION_ICONS[label]
  return (
    <div className="mb-[5px] flex items-center gap-[5px] rounded-[4px] bg-tp-slate-50 px-2 py-[3px]">
      {name ? (
        <TPMedicalIcon
          name={name}
          variant="bulk"
          size={12}
          color="var(--tp-slate-500, #64748B)"
        />
      ) : (
        <span className="h-[4px] w-[4px] rounded-full bg-tp-slate-300" />
      )}
      <span className="text-[11px] font-medium text-tp-slate-600">{label}</span>
    </div>
  )
}

function Meta({ label, value }) {
  if (!value) return null
  return (
    <span>
      <span className="text-tp-slate-400">{label} </span>
      <span className="font-medium text-tp-slate-700">{value}</span>
    </span>
  )
}

/**
 * Lights up every occurrence of the cited phrase.
 *
 * Case-insensitive and literal - the phrase is clinical text, not a pattern,
 * so it is escaped before it goes anywhere near a regular expression. A drug
 * name with a bracket in it would otherwise take the whole panel down.
 */
export function Highlighted({ text, phrase }) {
  const source = String(text == null ? "" : text)
  const needle = String(phrase || "").trim()
  if (!needle || needle.length < 2) return source

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = source.split(new RegExp(`(${escaped})`, "ig"))
  if (parts.length === 1) return source

  return parts.map((part, i) =>
    part.toLowerCase() === needle.toLowerCase() ? (
      <mark
        key={i}
        className="rounded-[3px] px-[2px] font-semibold text-tp-slate-900"
        style={{ background: "#FFF1BF" }}
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}
