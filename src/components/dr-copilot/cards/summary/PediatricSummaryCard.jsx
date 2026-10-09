import React from "react"

import { CardShell } from "../CardShell"
import { InlineDataRow } from "../InlineDataRow"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { FooterCTA, FooterCTAGroupTertiary, FooterDivider } from "../FooterCTA"

export function PediatricSummaryCard({ data, onSidebarNav }) {
  

  /* ─ Growth row ─ */
  const growthValues = [
    data.ageDisplay && { key: "Age", value: data.ageDisplay },
    data.heightCm != null && {
      key: "Ht",
      value: `${data.heightCm} cm${data.heightPercentile ? ` (${data.heightPercentile})` : ""}`,
    },
    data.weightKg != null && {
      key: "Wt",
      value: `${data.weightKg} kg${data.weightPercentile ? ` (${data.weightPercentile})` : ""}`,
    },
    data.bmiPercentile && { key: "BMI", value: data.bmiPercentile },
    data.ofcCm != null && { key: "OFC", value: `${data.ofcCm} cm` },
  ].filter(Boolean) 

  /* ─ Vaccine row ─ */
  /* Vaccine display: plain text, no color coding on counts */
  const hasPending = data.vaccinesPending != null && data.vaccinesPending > 0
  const hasOverdue = data.vaccinesOverdue != null && data.vaccinesOverdue > 0
  const isUpToDate = !hasPending && !hasOverdue

  return (
    <CardShell
      icon={<span />}
      tpIconName="health care"
      title="Pedia Summary"
      dataSources={["EMR Records", "Growth Records"]}
      collapsible
      sidebarLink={
        onSidebarNav ? (
          <FooterCTAGroupTertiary>
            <FooterCTA label="View growth chart" onClick={() => onSidebarNav("growth")} fullWidth />
            <FooterDivider />
            <FooterCTA label="View vaccine history" onClick={() => onSidebarNav("vaccine")} fullWidth />
          </FooterCTAGroupTertiary>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-[8px]">
        {growthValues.length > 0 && (
          <div
            className="cursor-pointer rounded-[4px] outline-none"
            role="button"
            tabIndex={0}
            onClick={() => _optionalChain([onSidebarNav, 'optionalCall', _ => _("growth")])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                _optionalChain([onSidebarNav, 'optionalCall', _2 => _2("growth")])
              }
            }}
          >
            <SectionSummaryBar label="Growth" icon="Heart Rate" />
            <div className="pl-[4px]">
              <InlineDataRow tag="" values={growthValues} source="existing" />
            </div>
          </div>
        )}

        <div
          className="cursor-pointer rounded-[4px] outline-none"
          role="button"
          tabIndex={0}
          onClick={() => _optionalChain([onSidebarNav, 'optionalCall', _3 => _3("vaccine")])}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              _optionalChain([onSidebarNav, 'optionalCall', _4 => _4("vaccine")])
            }
          }}
        >
          <SectionSummaryBar label="Vaccines" icon="injection" />
          <div className="pl-[4px] text-[14px] leading-[1.7] text-tp-slate-700">
            {isUpToDate ? (
              <span>Up to date</span>
            ) : (
              <span className="inline-flex flex-wrap items-baseline gap-x-1 gap-y-0">
                {hasPending && (
                  <>
                    <span className="text-tp-slate-400">Pending:</span>
                    <span className="font-medium text-tp-slate-700">{data.vaccinesPending}</span>
                  </>
                )}
                {hasPending && hasOverdue && <span className="text-tp-slate-400">, </span>}
                {hasOverdue && (
                  <>
                    <span className="text-tp-slate-400">Overdue:</span>
                    <span className="font-medium text-tp-slate-700">{data.vaccinesOverdue}</span>
                    {data.overdueVaccineNames && data.overdueVaccineNames.length > 0 && (
                      <span className="text-tp-slate-400">({data.overdueVaccineNames.join(", ")})</span>
                    )}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
