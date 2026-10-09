import { cn } from "../../../dr-agent/utils"
import { tesseractIcon } from "../../ui/tesseractIcon"

import { highlightDates } from "../../velora/highlightDates"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Profile = tesseractIcon("profile")
const Clock = tesseractIcon("clock")
const Activity = tesseractIcon("activity")
const Health = tesseractIcon("health")

const FLAG_CLASS = {
  high: "text-tp-error-600",
  low: "text-tp-error-600",
  missing: "text-tp-warning-600",
  normal: "text-tp-slate-800",
}

const FLAG_GLYPH = {
  high: "▲",
  low: "▼",
  missing: "○",
  normal: "",
}

const MED_STATUS_TOKENS

 = {
  ongoing: { pill: "text-tp-success-700", pillBg: "bg-tp-success-50", dot: "bg-tp-success-500" },
  planned: { pill: "text-tp-blue-700", pillBg: "bg-tp-blue-50", dot: "bg-tp-blue-500" },
  stopped: { pill: "text-tp-slate-500", pillBg: "bg-tp-slate-100", dot: "bg-tp-slate-400" },
  prn: { pill: "text-tp-violet-700", pillBg: "bg-tp-violet-50", dot: "bg-tp-violet-500" },
}

const MED_STATUS_LABEL = {
  ongoing: "Ongoing",
  planned: "Planned",
  stopped: "Stopped",
  prn: "PRN",
}

/** Subtle-bg section header bar with icon + label + optional trailing meta. */
function SectionBar({
  icon,
  label,
  trailing,
}

) {
  return (
    <div className="flex h-[26px] items-center justify-between gap-[6px] rounded-[6px] bg-tp-slate-50 px-[8px]">
      <span className="inline-flex items-center gap-[5px]">
        <span className="flex items-center text-tp-slate-500">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-tp-slate-700">
          {label}
        </span>
      </span>
      {trailing}
    </div>
  )
}

/**
 * Medication row — matches the Dr. Agent UI card convention used in Patient-Reported
 * and Last-Visit cards: drug name in bold, frequency/route/timing on a compact secondary line,
 * right-aligned status pill.
 */
/** Build the compact trailing label that fuses the status + timing cue into a single chip text.
 *  Examples: "Ongoing", "Planned · Day 60", "Stopped Day 14", "PRN · pain ≥ 4/10".
 *  If the timing already begins with the status word (e.g. "Planned · Day 60"), we skip the
 *  status prefix to avoid "Planned · Planned · Day 60".
 */
function mergeStatusAndTiming(status, timing) {
  const statusLabel = MED_STATUS_LABEL[status]
  const trimmed = timing.trim()
  if (trimmed.toLowerCase().startsWith(statusLabel.toLowerCase())) {
    return trimmed
  }
  if (trimmed.length === 0) return statusLabel
  return `${statusLabel} · ${trimmed}`
}

function MedRow({ med, isLast }) {
  const status = _nullishCoalesce(med.status, () => ( "ongoing"))
  const t = MED_STATUS_TOKENS[status]
  // Assemble the bracketed dose string: "(2.5 mg PO OD)".
  const bracketInner = [med.dose, med.route, med.frequency].filter(Boolean).join(" ")
  const trailing = mergeStatusAndTiming(status, med.timing)
  return (
    <li
      className="flex items-center gap-[8px] py-[6px]"
      style={!isLast ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" } : undefined}
    >
      <p className="min-w-0 flex-1 text-[13px] leading-tight text-tp-slate-800 truncate">
        <span className="font-semibold">{med.name}</span>
        {bracketInner && (
          <span className="ml-[4px] font-normal text-tp-slate-500">({bracketInner})</span>
        )}
      </p>
      <span
        className={cn(
          "shrink-0 rounded-full px-[8px] py-[2px] text-[10px] font-semibold leading-tight whitespace-nowrap",
          t.pillBg,
          t.pill,
        )}
      >
        {highlightDates(trailing)}
      </span>
    </li>
  )
}

/**
 * ClinicalSnapshot — rendered as flat stacked sections (no outer card wrapper).
 * Headings are rectangular grey bars; content below is plain text / chips / a labs table.
 */
export function ClinicalSnapshot({ persona }) {
  const missingCount = persona.labs.filter((l) => l.flag === "missing").length
  return (
    <div
      className="flex flex-col gap-[12px] rounded-[10px] bg-white p-[12px]"
      style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
    >
      {/* Presentation */}
      <section className="flex flex-col gap-[6px]">
        <SectionBar icon={<Profile size={10} variant="Bulk" />} label="Presentation" />
        <p className="px-[2px] text-[13px] text-tp-slate-700 leading-[1.55]">
          {highlightDates(persona.presentation)}
        </p>
      </section>

      {/* History — compact timeline pointers */}
      {persona.history.length > 0 && (
        <section className="flex flex-col gap-[6px]">
          <SectionBar
            icon={<Clock size={10} variant="Bulk" />}
            label="History"
            trailing={
              <span className="text-[11px] text-tp-slate-400">{persona.history.length} events</span>
            }
          />
          <ul className="flex flex-col gap-[3px] px-[2px]">
            {persona.history.map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-[6px] text-[12px] text-tp-slate-700 leading-[1.55]"
              >
                <span
                  className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400"
                  aria-hidden
                />
                <span>{highlightDates(h)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Key labs — proper table (tabular data genuinely benefits from it) */}
      {persona.labs.length > 0 && (
        <section className="flex flex-col gap-[6px]">
          <SectionBar
            icon={<Activity size={10} variant="Bulk" />}
            label="Key labs"
            trailing={
              missingCount > 0 ? (
                <span className="rounded-[4px] bg-tp-warning-50 px-[6px] py-[1px] text-[10px] font-semibold uppercase tracking-wide text-tp-warning-700">
                  {missingCount} missing
                </span>
              ) : null
            }
          />
          <div
            className="overflow-hidden rounded-[8px]"
            style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
          >
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-tp-slate-50">
                  <th className="px-[8px] py-[4px] text-left text-[10px] font-semibold uppercase tracking-wide text-tp-slate-500">
                    Lab
                  </th>
                  <th className="px-[8px] py-[4px] text-right text-[10px] font-semibold uppercase tracking-wide text-tp-slate-500">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {persona.labs.map((l, i) => {
                  const flag = _nullishCoalesce(l.flag, () => ( "normal"))
                  const isLast = i === persona.labs.length - 1
                  return (
                    <tr
                      key={i}
                      style={
                        !isLast
                          ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" }
                          : undefined
                      }
                    >
                      <td className="px-[8px] py-[5px] text-tp-slate-700 leading-tight">
                        {l.label}
                        {l.unit && (
                          <span className="ml-[4px] text-[11px] text-tp-slate-400">({l.unit})</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-[8px] py-[5px] text-right font-medium leading-tight",
                          FLAG_CLASS[flag],
                        )}
                      >
                        {FLAG_GLYPH[flag] && (
                          <span className="mr-[2px] text-[10px]">{FLAG_GLYPH[flag]}</span>
                        )}
                        {l.value}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Medications — stacked rows, no outer card wrapper */}
      {persona.meds.length > 0 && (
        <section className="flex flex-col gap-[4px]">
          <SectionBar
            icon={<Health size={10} variant="Bulk" />}
            label="Medications"
            trailing={<span className="text-[11px] text-tp-slate-400">{persona.meds.length}</span>}
          />
          <ul className="flex flex-col px-[2px]">
            {persona.meds.map((m, i) => (
              <MedRow key={m.name + i} med={m} isLast={i === persona.meds.length - 1} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
