import React from "react"
import { cn } from "../../../dr-agent/utils"
import { CopilotIcon } from "../../ui/CopilotIcon"
import { requestCopilotScope, requestCopilotScopeMenu, useLastCopilotPatient } from "../../surfaces/copilotScopeStore"
import { chartLabelOf } from "../../shared/patientName"

/**
 * The way out of a question this conversation cannot answer.
 *
 * Both scopes refuse the other's questions, and before this the doctor was
 * told what Copilot would not do and left to work out where it would: a chart
 * conversation ended on "I cannot search across patients", and a
 * hospital-wide one on "which patient do you mean?". Each is a dead end next
 * to a surface that answers exactly that.
 *
 * One card for both directions, so the move reads the same whichever way it
 * goes: name the scope that can answer, and carry the question into it rather
 * than make the doctor type it again. The button appears only when there is
 * somewhere to send them.
 *
 * The question is shown back, in the doctor's own words, so "it will ask this
 * for me" is something they can see rather than trust. The button is the one
 * solid blue thing on the card because it is the only next step; the line
 * under it answers the worry that comes with any switch, which is "do I lose
 * what I was doing here?".
 */
export function ScopeRedirectCard({ data }) {
  const target = (data && data.target) || "clinic"
  const question = (data && data.question) || ""
  const lastPatient = useLastCopilotPatient()

  const toPatient = target === "patient"
  const patientName = (data && data.patientName) || lastPatient.name

  if (toPatient && !lastPatient.id) {
    /* Nowhere to send them yet: there is no patient chart to carry the
       question into. Say what to do instead, in the order they will do it. */
    return (
      <div className="flex items-start gap-[10px] rounded-[14px] border-[1px] border-tp-slate-200 bg-white px-[14px] py-[12px]">
        <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-tp-slate-100 text-tp-slate-600">
          <CopilotIcon asset="users/user" variant="bulk" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-semibold leading-[20px] text-tp-slate-900">
            This question needs one patient's chart
          </p>
          <p className="m-0 mt-[2px] text-[12.5px] leading-[18px] text-tp-slate-600">
            Choose the patient, then ask it again in their chart.
          </p>
          {question ? <QuestionEcho question={question} /> : null}
          {/* The way to the patient, not directions to it: this opens the
              same picker the tag at the top opens. */}
          <button
            type="button"
            onClick={requestCopilotScopeMenu}
            className={cn(
              "mt-[10px] inline-flex h-[36px] max-w-full items-center gap-[6px] rounded-[10px] bg-tp-blue-500 pl-[12px] pr-[12px] text-[13px] font-semibold text-white",
              "transition-[background-color,transform] duration-[var(--copilot-dur-state)] ease-out hover:bg-tp-blue-600 active:scale-[0.97]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
              "motion-reduce:transition-none motion-reduce:active:scale-100",
            )}
          >
            <CopilotIcon asset="users/user" variant="bulk" size={15} />
            <span className="truncate">Choose a patient</span>
          </button>
        </div>
      </div>
    )
  }

  /* Named the way the welcome line names it ("Abhyuday's chart"), so the
     button and the sentence the doctor read on the way in agree. */
  const destination = toPatient ? chartLabelOf(patientName) : "All hospital patients"

  return (
    <div className="flex items-start gap-[10px] rounded-[14px] border-[1px] border-tp-slate-200 bg-white px-[14px] py-[12px]">
      <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-tp-blue-50 text-tp-blue-600">
        <CopilotIcon name="arrow-swap" variant="linear" size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13px] font-semibold leading-[20px] text-tp-slate-900">
          {toPatient ? "Ask this in the patient's chart" : "Ask this across all hospital patients"}
        </p>

        {question ? <QuestionEcho question={question} /> : null}

        <button
          type="button"
          onClick={() => requestCopilotScope(target, question)}
          className={cn(
            "mt-[10px] inline-flex h-[36px] max-w-full items-center gap-[6px] rounded-[10px] bg-tp-blue-500 pl-[14px] pr-[10px] text-[13px] font-semibold text-white",
            "transition-[background-color,transform] duration-[var(--copilot-dur-state)] ease-out hover:bg-tp-blue-600 active:scale-[0.97]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
            "motion-reduce:transition-none motion-reduce:active:scale-100",
          )}
        >
          <span className="truncate">
            {toPatient ? `Ask in ${destination}` : "Search all hospital patients"}
          </span>
          <CopilotIcon name="chevron-right" variant="linear" size={15} />
        </button>

        <p className="m-0 mt-[8px] text-[12px] leading-[17px] text-tp-slate-500">
          {toPatient
            ? "Your question moves to that chart's conversation. This search stays as it is."
            : "Your question moves to a separate search. This patient's conversation stays as it is."}
        </p>
      </div>
    </div>
  )
}

/** The doctor's own question, quoted back so they can see what will be asked. */
function QuestionEcho({ question }) {
  return (
    <p
      title={question}
      className="m-0 mt-[8px] line-clamp-2 rounded-[10px] bg-tp-slate-50 px-[10px] py-[7px] text-[12.5px] leading-[18px] text-tp-slate-700"
    >
      <span className="mr-[4px] font-semibold text-tp-slate-500">Your question:</span>
      {question}
    </p>
  )
}
