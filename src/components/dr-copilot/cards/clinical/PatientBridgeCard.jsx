import React, { useEffect, useRef, useState } from "react"
import { cn } from "../../../dr-agent/utils"
import { CopilotIcon } from "../../ui/CopilotIcon"
import { CardShell } from "../CardShell"
import { requestCopilotScope } from "../../surfaces/copilotScopeStore"
import { searchPatients } from "../../surfaces/useCopilotPatientPicker"
import { firstNameOf } from "../../shared/patientName"

/**
 * Patient search: the way from a question about one patient to the answer.
 *
 * "What is Ramesh Patel's HbA1c?", "symptoms of kavita", "Arjun's medical
 * history" asked where no patient (or another patient) is open. The answer is
 * in that patient's own record, so Velora finds them and offers them here,
 * the way the Dr. Agent patient search card does, with what the service does
 * not offer on top:
 *
 *   - the search is pre-filled with the name it read, and stays editable, so
 *     a misread or a second patient is one edit away rather than a retype
 *   - each row says who it is (age, sex, patient ID) and whether they are on
 *     today's list, so two of one name are told apart at a glance
 *   - the card says the exact question it will ask, and picking a patient
 *     (the row or its chevron) switches Velora to their chat and sends that
 *     question there, so the answer arrives straight away
 */

const SEARCH_DELAY_MS = 300

function whoLine(p) {
  return [p.age != null ? `${p.age}y` : null, p.gender, p.pid || p.patientId].filter(Boolean)
}

export function PatientBridgeCard({ data }) {
  const initial = (data && data.patients) || []
  const question = (data && data.question) || ""
  const [query, setQuery] = useState((data && data.name) || "")
  const [rows, setRows] = useState(initial)
  const [busy, setBusy] = useState(false)
  const first = useRef(true)

  /* The first rows are the ones the question already found; searching
     again only once the doctor edits the name. */
  useEffect(() => {
    if (first.current) {
      first.current = false
      return undefined
    }
    const q = query.trim()
    if (q.length < 2) {
      setRows([])
      return undefined
    }
    let live = true
    setBusy(true)
    const t = setTimeout(() => {
      searchPatients(q)
        .then((found) => live && setRows((found || []).slice(0, 6)))
        .finally(() => live && setBusy(false))
    }, SEARCH_DELAY_MS)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [query])

  const ask = (p) => requestCopilotScope("patient", question, { id: p.id, label: p.label })

  return (
    <CardShell
      icon={<CopilotIcon name="search-normal" variant="bulk" size={18} />}
      title="Patient search"
      date={question ? `Pick the patient, and Velora asks: “${question}”` : "Pick the patient this is about"}
    >
      <div className="border-b border-tp-slate-100 px-[14px] py-[10px]">
        <label className="copilot-context-search flex h-[36px] items-center gap-[8px] rounded-[10px] border-[1px] border-tp-slate-200 bg-white px-[10px]">
          <span className="flex shrink-0 items-center text-tp-slate-500">
            <CopilotIcon name="search-normal" variant="linear" size={15} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name, patient ID or mobile number"
            aria-label="Search for the patient"
            className="h-full w-full min-w-0 bg-transparent text-[13px] text-tp-slate-800 outline-none placeholder:text-tp-slate-400"
          />
          {busy && (
            <span
              aria-hidden="true"
              className="h-[12px] w-[12px] shrink-0 animate-spin rounded-full border-[1.5px] border-tp-slate-200 border-t-tp-violet-500 motion-reduce:animate-none"
            />
          )}
        </label>
      </div>

      {rows.length ? (
        <ul className="m-0 list-none p-0">
          {rows.map((p) => {
            const name = p.label || p.patientName
            const who = whoLine(p)
            const firstName = firstNameOf(name) || "this patient"
            return (
              <li
                key={p.id}
                onClick={() => ask(p)}
                className="group/row flex cursor-pointer items-center gap-[12px] border-b border-tp-slate-100 px-[14px] py-[11px] transition-colors last:border-b-0 hover:bg-tp-slate-50"
              >
                <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-tp-slate-100 text-tp-slate-500 transition-colors group-hover/row:bg-tp-blue-50 group-hover/row:text-tp-blue-600">
                  <CopilotIcon asset="users/user" variant="bulk" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline gap-[6px] leading-[20px]">
                    <span className="truncate text-[14px] font-semibold text-tp-slate-900">{name}</span>
                    {who.length > 0 && (
                      <span className="shrink-0 text-[13px] tabular-nums text-tp-slate-500">
                        (
                        {who.map((part, i) => (
                          <React.Fragment key={part}>
                            {i > 0 && <span className="mx-[5px] text-tp-slate-300">|</span>}
                            {part}
                          </React.Fragment>
                        ))}
                        )
                      </span>
                    )}
                    {p.isToday && (
                      <span className="shrink-0 rounded-[6px] bg-tp-success-50 px-[6px] py-[1px] text-[11px] font-semibold text-tp-success-700">
                        Today
                      </span>
                    )}
                  </span>
                  {p.phone && <span className="block text-[12.5px] tabular-nums text-tp-slate-500">{p.phone}</span>}
                </span>
                {/* Just the way in, like every patient row: the question
                    already says what will be asked, so the button does not
                    repeat it. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    ask(p)
                  }}
                  aria-label={question ? `Ask “${question}” in ${firstName}'s chat` : `Open ${firstName}'s chat`}
                  title={question ? `Ask “${question}” in ${firstName}'s chat` : `Open ${firstName}'s chat`}
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
      ) : (
        <p className="m-0 px-[14px] py-[16px] text-center text-[12.5px] text-tp-slate-500">
          {query.trim().length < 2
            ? "Type a name, patient ID or mobile number to find the patient."
            : busy
              ? "Searching…"
              : `No patient matches “${query.trim()}”. Try another spelling, the patient ID or the mobile number.`}
        </p>
      )}
    </CardShell>
  )
}
