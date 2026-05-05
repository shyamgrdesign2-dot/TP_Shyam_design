"use client";

import React from "react";

import { CardShell } from "../CardShell";
import { InlineDataRow } from "../InlineDataRow";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { SidebarLink } from "../SidebarLink";







export function GynecSummaryCard({ data, onSidebarNav }) {
  const values = [
  data.menarche && { key: "Menarche", value: data.menarche },
  data.cycleLength && {
    key: "Cycle",
    value: [data.cycleLength, data.cycleRegularity].filter(Boolean).join(", ")
  },
  data.flowDuration && {
    key: "Flow",
    value: [data.flowDuration, data.flowIntensity].filter(Boolean).join(", ")
  },
  data.painScore && { key: "Pain", value: data.painScore },
  data.lmp && { key: "LMP", value: data.lmp },
  data.lastPapSmear && { key: "Pap Smear", value: data.lastPapSmear }].
  filter(Boolean);





  return (
    <CardShell
      icon={<span />}
      tpIconName="Gynec"
      title="Gynec Summary"
      dataSources={["EMR Records"]}
      collapsible
      sidebarLink={
      onSidebarNav ?
      <SidebarLink
        text="View detailed gynec history"
        onClick={() => onSidebarNav("gynec")} /> :

      undefined
      }>
      
      <div className="flex flex-col gap-[8px]">
        {values.length > 0 &&
        <div>
            <SectionSummaryBar label="Menstrual History" icon="Gynec" />
            <div className="pl-[4px]">
              <InlineDataRow tag="" values={values} source="existing" />
            </div>
          </div>
        }
      </div>
    </CardShell>);

}