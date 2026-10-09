import React from "react"
import { InlineDataRow } from "../InlineDataRow"
import { SectionSummaryBar } from "../SectionSummaryBar"

export function EmbeddedSpecialtyBox({ data }) {
  const { obstetricData, pediatricsData, gynecData, ophthalData } = data

  /* Priority: obstetric > pediatrics > gynec > ophthal — render only ONE */

  if (obstetricData) {
    const values = [
      obstetricData.lmp && { key: "LMP", value: obstetricData.lmp },
      obstetricData.edd && { key: "EDD", value: obstetricData.edd },
      obstetricData.gestationalWeeks && { key: "GA", value: `${obstetricData.gestationalWeeks} wks` },
      (obstetricData.gravida != null) && {
        key: "GPLAE",
        value: `G${obstetricData.gravida}P${_nullishCoalesce(obstetricData.para, () => ( 0))}L${_nullishCoalesce(obstetricData.living, () => ( 0))}A${_nullishCoalesce(obstetricData.abortion, () => ( 0))}E${_nullishCoalesce(obstetricData.ectopic, () => ( 0))}`,
      },
      obstetricData.ancDue && obstetricData.ancDue.length > 0 && {
        key: "ANC",
        value: obstetricData.ancDue.join(", "),
        flag: "warning" ,
      },
      obstetricData.vaccineStatus && obstetricData.vaccineStatus.length > 0 && {
        key: "Vaccines",
        value: obstetricData.vaccineStatus.join(", "),
      },
    ].filter(Boolean) 

    if (values.length === 0) return null

    return (
      <div
        className="mt-2 rounded-[6px] px-2 py-1.5"
        style={{
          border: "1px solid var(--tp-violet-100, #E9E0FA)",
          background: "rgba(243, 239, 254, 0.25)",
        }}
      >
        <SectionSummaryBar label="Obstetric" variant="specialty" />
        <div className="pl-[4px]">
          <InlineDataRow tag="" values={values} source="existing" />
        </div>
      </div>
    )
  }

  if (pediatricsData) {
    const values = [
      pediatricsData.ageDisplay && { key: "Age", value: pediatricsData.ageDisplay },
      pediatricsData.heightCm != null && {
        key: "Ht",
        value: `${pediatricsData.heightCm} cm${pediatricsData.heightPercentile ? ` (${pediatricsData.heightPercentile})` : ""}`,
      },
      pediatricsData.weightKg != null && {
        key: "Wt",
        value: `${pediatricsData.weightKg} kg${pediatricsData.weightPercentile ? ` (${pediatricsData.weightPercentile})` : ""}`,
      },
      pediatricsData.vaccinesPending != null && pediatricsData.vaccinesPending > 0 && {
        key: "Vaccines Pending",
        value: String(pediatricsData.vaccinesPending),
        flag: "warning" ,
      },
      pediatricsData.vaccinesOverdue != null && pediatricsData.vaccinesOverdue > 0 && {
        key: "Overdue",
        value: String(pediatricsData.vaccinesOverdue),
        flag: "high" ,
      },
    ].filter(Boolean) 

    if (values.length === 0) return null

    return (
      <div
        className="mt-2 rounded-[6px] px-2 py-1.5"
        style={{
          border: "1px solid var(--tp-violet-100, #E9E0FA)",
          background: "rgba(243, 239, 254, 0.25)",
        }}
      >
        <SectionSummaryBar label="Pediatrics" variant="specialty" />
        <div className="pl-[4px]">
          <InlineDataRow tag="" values={values} source="existing" />
        </div>
      </div>
    )
  }

  if (gynecData) {
    const values = [
      gynecData.menarche && { key: "Menarche", value: gynecData.menarche },
      gynecData.cycleLength && {
        key: "Cycle",
        value: `${gynecData.cycleLength}${/day/i.test(gynecData.cycleLength) ? "" : " days"}${gynecData.cycleRegularity ? ` (${gynecData.cycleRegularity})` : ""}`,
      },
      gynecData.flowDuration && {
        key: "Flow",
        value: `${gynecData.flowDuration}${gynecData.flowIntensity ? ` · ${gynecData.flowIntensity}` : ""}`,
      },
      gynecData.painScore && { key: "Pain", value: gynecData.painScore },
    ].filter(Boolean) 

    if (values.length === 0) return null

    return (
      <div
        className="mt-2 rounded-[6px] px-2 py-1.5"
        style={{
          border: "1px solid var(--tp-violet-100, #E9E0FA)",
          background: "rgba(243, 239, 254, 0.25)",
        }}
      >
        <SectionSummaryBar label="Gynec" variant="specialty" />
        <div className="pl-[4px]">
          <InlineDataRow tag="" values={values} source="existing" />
        </div>
      </div>
    )
  }

  if (ophthalData) {
    const values = [
      ophthalData.vaRight && { key: "OD VA", value: ophthalData.vaRight },
      ophthalData.vaLeft && { key: "OS VA", value: ophthalData.vaLeft },
      ophthalData.iop && { key: "IOP", value: ophthalData.iop },
    ].filter(Boolean) 

    if (values.length === 0) return null

    return (
      <div
        className="mt-2 rounded-[6px] px-2 py-1.5"
        style={{
          border: "1px solid var(--tp-violet-100, #E9E0FA)",
          background: "rgba(243, 239, 254, 0.25)",
        }}
      >
        <SectionSummaryBar label="Ophthal" variant="specialty" />
        <div className="pl-[4px]">
          <InlineDataRow tag="" values={values} source="existing" />
        </div>
      </div>
    )
  }

  return null
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
